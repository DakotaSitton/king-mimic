// King Mimic — TWIN-STICK real-time sim (branch claude/twin-stick, started 2026-10-27).
//
// Owner brief (2026-10-27, verbatim intent): real-time twin-stick, mobile only, mobile action-RPG
// feel with heavy deckbuilding. Actors are TOKENS in a dungeon; rooms are SELECTED BY WHAT'S INSIDE.
// Players and foes both hold King Mimic cards. Left thumb moves; the right side shows THREE cards to
// play. Moxie works as before. Movement is its own axis/stat. Foes SHOW THEIR ATTACKS WITH
// RETICLES. Players AUTO-TARGET the nearest foe unless they tap a foe.
//
// This module is PURE game logic (no I/O, no sockets): rt-server.js drives it, tests import it.
// Card DATA (names, costs, ops, text) and BODY data come straight from the existing engine tables —
// nothing is re-authored here. What is new is the SPATIAL translation of the lane targets:
//   front / front2 / front3  → melee: the target must be within MELEE_REACH; front2/3 chain to the
//                              nearest foes beside it ("the foe behind it")
//   pick                     → the current target (tapped foe, else nearest), any range
//   lane                     → every foe within LANE_SELF_R of the caster ("your lane")
//   pickLane                 → every foe within PICK_LANE_R of the target ("its lane")
//   random                   → random living foe per hit
// Foes resolve the SAME ops, but through a telegraphed ZONE (the reticle): the zone locks when the
// cast starts and whoever is inside when the windup ends is hit. That is the one deliberate
// asymmetry (it replaces the old visible-queue telegraph): players resolve instantly, foes warn.
//
// Every number below that the owner did not state carries a FLAG — owner-review defaults, not canon.

import {
  KIT, BODIES, bodyMaxHp, cardKind, triggerKind, weightedCardKindBonus,
  MOXIE_CAP, HAND_SIZE, START_MOXIE, STARTER_DECK, STARTER_BODY, COMMON_SET, ELITE_SET,
  rollFoeKit, rollKit, isCard, PLAYER_POOL,
} from "../../game.js";

// ---------------------------------------------------------------------------------------------
// Tunables
export const SIM_HZ = 20;                 // server sim + broadcast rate (FLAG engine default)
export const DT = 1 / SIM_HZ;
export const ARENA_W = 16, ARENA_H = 9;   // room size in world units (FLAG: sized for phone landscape)
export const TOKEN_R = 0.55;              // token radius (FLAG)
export const ELITE_TOKEN_R = 0.72;        // elites read bigger (FLAG)
// MOVEMENT is its own axis now (owner: "I'll worry about it as the game develops"). One uniform
// default; BODY_SPEED overrides per body key when he starts tuning it.
export const DEFAULT_SPEED = 4.2;         // world units / second (FLAG)
export const BODY_SPEED = {};             // e.g. { tollTroll: 3.4 } — empty until the owner sets any
export const MELEE_REACH = 1.25;          // edge-to-edge reach for front/front2/front3 (FLAG)
export const FRONT_CHAIN_R = 2.4;         // front2/front3 chain radius around the first target (FLAG)
export const LANE_SELF_R = 2.6;           // "your lane" radius around the caster (FLAG)
export const PICK_LANE_R = 2.2;           // "its lane" radius around the target (FLAG)
export const PICK_ZONE_R = 1.0;           // foe single-target reticle radius (FLAG)
export const RANDOM_ZONE_R = 0.9;         // foe random-hit reticle radius (FLAG)
export const FOE_WINDUP = 0.8;            // seconds a foe reticle shows before it lands (FLAG)
export const PLAY_GCD = 0.25;             // player double-tap guard between card plays (FLAG)
export const KNOCK_DIST = 3;              // Wind's "shove" distance (FLAG spatial translation)
export const PULL_GAP = 1.3;              // Taunt pulls the target to this gap in front of the caster (FLAG)
export const FOE_RANGED_KEEP = [3.5, 6];  // ranged foes try to stay this far from their target (FLAG)
export const REVIVE_FRACTION = 0.5;       // downed players revive at this HP share when a room clears (FLAG)
export const HEAL_BETWEEN_ROOMS = true;   // full heal after each cleared room (FLAG: first-slice generosity)
export const LOOT_CHOICES = 3;            // card choices after a room (FLAG)
export const DOOR_COUNT = 3;              // doors offered between rooms (FLAG)
const ticks = (t) => (t ?? 0) / 10;       // engine durations are 100ms ticks → seconds

// ---------------------------------------------------------------------------------------------
// Which cards this mode can run. A card is IN when every op (through timers) is supported.
// Summons, lane re-arrangement, tornadoes, weapon choices etc. are not ported yet — they simply
// never enter a deck, a foe kit or a loot roll here (see SUPPORTED_OPS / UNSUPPORTED report).
const SUPPORTED_OPS = new Set([
  "deal", "shield", "tempShield", "healSelf", "healAlly", "healFull", "healPath", "counter",
  "rangedBonus", "meleeBonus", "modalBonus", "buff", "sap", "vulnerable", "poison", "leech", "thorns",
  "regen", "timer", "gainMoxie", "repositionPick", "pullFront",
]);
const SUPPORTED_TARGETS = new Set([undefined, "self", "front", "front2", "front3", "pick", "lane",
  "pickLane", "random", "storedLane", "storedTarget", "selfLane"]);
const SUPPORTED_BUFFS = new Set(["stoneskin", "haste"]);
const SUPPORTED_REGEN = new Set(["heal", "shield", "moxie", "modalBonus"]);
// Every op FIELD this port honours. A card carrying any other rider is left out instead of being
// played with that rider silently dropped (e.g. Moonlight Greatsword's beam, Punishment Glutton's
// double-damage shield).
const KNOWN_FIELDS = {
  "*": ["do", "target", "amount", "ops"],
  deal: ["hits", "lifesteal", "ofShield", "ofHp", "pickExtra", "overflow", "bothKinds", "frontExtra", "pierce", "noReact", "shieldFromDealt", "capLanded"],
  shield: ["ofDealt", "plusRangedBonus"], tempShield: ["ofDealt", "dur"], healSelf: ["plusRangedBonus"],
  healAlly: ["plusRangedBonus"], healPath: ["ofDealt"], buff: ["buff", "dur"],
  sap: ["ofDealt", "ofLastHit", "dur", "plusRanged", "plusRangedBonus"], vulnerable: ["plusRangedBonus", "dur"],
  poison: ["plusRangedBonus"], leech: ["plusRangedBonus", "period", "immediate"], regen: ["kind", "period", "immediate"],
  timer: ["period", "once", "captureLane", "captureTarget", "boost", "ramp", "immediate"], repositionPick: ["fallback"],
};
const fieldsKnown = (o) => Object.keys(o).every((f) => KNOWN_FIELDS["*"].includes(f) || (KNOWN_FIELDS[o.do] ?? []).includes(f));
function opsSupported(ops) {
  return (ops ?? []).every((o) => SUPPORTED_OPS.has(o.do) && SUPPORTED_TARGETS.has(o.target) && fieldsKnown(o)
    && !o.whenPick && !o.pickKind
    && (o.do !== "buff" || SUPPORTED_BUFFS.has(o.buff))
    && (o.do !== "regen" || SUPPORTED_REGEN.has(o.kind))
    && (o.do !== "timer" || opsSupported(o.ops)));
}
export const cardSupported = (key) => !!KIT[key] && isCard(key) && opsSupported(KIT[key].ops);
export const SUPPORTED_CARDS = Object.keys(KIT).filter(cardSupported);
// The player-facing slice: owner pool cards this mode can run (decks, loot, foe kits all live here).
export const PORTED_PLAYER_CARDS = [...new Set([...PLAYER_POOL, ...STARTER_DECK])].filter(cardSupported);
const PORTED_SET = new Set(PORTED_PLAYER_CARDS);

// The first foe-touching target a card uses (through timers) — drives reticle shape + reach.
const FOE_TGT = new Set(["front", "front2", "front3", "pick", "lane", "pickLane", "random", "storedLane", "storedTarget", "selfLane"]);
function firstFoeOp(ops) {
  for (const o of ops ?? []) {
    if (FOE_TGT.has(o.target)) return o;
    if (o.do === "timer") { const inner = firstFoeOp(o.ops); if (inner) return inner; }
  }
  return null;
}
// Top-level (immediate) melee requirement: a front* op that resolves NOW needs reach.
const needsReach = (key) => (KIT[key]?.ops ?? []).some((o) => /^front/.test(o.target ?? ""));
const touchesFoes = (key) => !!firstFoeOp(KIT[key]?.ops);
export function cardShape(key) {
  const o = firstFoeOp(KIT[key]?.ops);
  if (!o) return "self";
  if (o.target === "front") return "arc";
  if (o.target === "front2" || o.target === "front3") return "line";
  if (o.target === "lane" || o.target === "selfLane") return "around";
  if (o.target === "pickLane" || o.target === "storedLane") return "blast";
  if (o.target === "random") return "random";
  return "pick";
}

// ---------------------------------------------------------------------------------------------
// RNG (seedable for tests)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickOne = (w, arr) => arr[Math.floor(w.rng() * arr.length)];
function shuffleW(w, a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(w.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r2 = (v) => Math.round(v * 100) / 100;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const gap = (a, b) => dist(a, b) - a.r - b.r;
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };

// ---------------------------------------------------------------------------------------------
// World + entities
export function createWorld(opts = {}) {
  return {
    phase: "draft", time: 0, depth: 0, nextId: 1, rng: opts.rng ?? Math.random,
    players: new Map(), foes: [], doors: [], votes: new Map(), fx: [], log: [],
    room: null, loot: null, defeated: [], arena: { w: ARENA_W, h: ARENA_H },
    usedOffers: new Set(),
  };
}
const nid = (w, p = "e") => p + (w.nextId++);
export const speedOf = (c) => BODY_SPEED[c.bodyKey] ?? DEFAULT_SPEED;

function freshCombatState(c) {
  Object.assign(c, {
    moxie: START_MOXIE, moxieAcc: 0, counters: 0, meleeBonus: 0, rangedBonus: 0, shield: 0,
    temps: [], buffs: [], poison: 0, poisonClock: 0, poisonSrc: null, leeches: [], regens: [],
    timers: [], thorns: 0, cast: null, strikes: [], gcd: 0,
  });
}
function applyBody(c, bodyKey, keepWoundRatio = false) {
  const ratio = keepWoundRatio && c.maxHp ? c.hp / c.maxHp : 1;
  c.bodyKey = bodyKey;
  c.maxHp = bodyMaxHp(BODIES[bodyKey]);
  c.hp = Math.max(1, Math.round(c.maxHp * ratio));
  c.r = BODIES[bodyKey]?.elite ? ELITE_TOKEN_R : TOKEN_R;
}

export function addPlayer(w, id, name = "Mimic") {
  if (w.players.has(id)) { const p = w.players.get(id); p.connected = true; if (name) p.name = name; return p; }
  const p = {
    id, name, side: "hero", x: 2, y: ARENA_H / 2, r: TOKEN_R, hp: 1, maxHp: 1, dead: false,
    bodyKey: null, deckList: [], hand: [], deck: [], disc: [], targetId: null, move: { x: 0, y: 0 },
    forceSeq: 0, connected: true, offers: rollOffers(w), picked: false, ready: false,
    reward: null, roomsCleared: 0,
  };
  freshCombatState(p);
  applyBody(p, STARTER_BODY);
  w.players.set(id, p);
  if (w.phase !== "draft") { p.picked = false; } // late joiner drafts, then joins at the next door
  return p;
}
export function removePlayer(w, id) { w.players.delete(id); w.votes.delete(id); }

// Draft: three body + deck offers per player, never overlapping another player's (KM rule).
function rollOffers(w) {
  const pool = shuffleW(w, COMMON_SET.filter((k) => BODIES[k] && !w.usedOffers.has(k)));
  const bodies = pool.slice(0, 3);
  for (const b of bodies) w.usedOffers.add(b);
  return bodies.map((bodyKey) => ({ bodyKey, deck: buildDeck(w, rollKit(bodyKey)) }));
}
// A rolled deck keeps only cards this mode supports, then pads from the starter deck to 10.
function buildDeck(w, keys) {
  const kept = (keys ?? []).filter((k) => PORTED_SET.has(k));
  const pad = STARTER_DECK.filter((k) => PORTED_SET.has(k));
  while (kept.length < 10 && pad.length) kept.push(pickOne(w, pad));   // FLAG: pad rule for unported cards
  return kept;
}

export function draftPick(w, pid, index) {
  const p = w.players.get(pid);
  if (!p || p.picked) return false;
  const offer = p.offers?.[index];
  if (!offer) return false;
  applyBody(p, offer.bodyKey);
  p.deckList = [...offer.deck];
  p.picked = true;
  // a late joiner who drafts mid-fight / mid-reward sits out until the party walks through the next door
  p.waitNext = w.phase === "fight" || w.phase === "reward" || w.phase === "over";
  if (w.phase === "draft" && [...w.players.values()].every((q) => q.picked || !q.connected)) openDoors(w);
  return true;
}

// ---------------------------------------------------------------------------------------------
// Doors: "rooms are selected by what's inside" — each door lists its foes and their cards.
function foeCountFor(w) {
  const party = Math.max(1, activePlayers(w).length);
  const base = 1 + Math.floor(w.depth / 2);                       // FLAG: depth → foe count
  return clamp(Math.round(base * (1 + 0.5 * (party - 1))), 1, 6); // FLAG: party scaling
}
function foeKit(bodyKey) {
  const kit = rollFoeKit(bodyKey).filter((k) => PORTED_SET.has(k));
  return kit.length ? kit : ["oSword"];
}
function rollDoor(w, i) {
  const n = foeCountFor(w);
  const eliteChance = w.depth >= 2 ? Math.min(0.5, 0.12 * (w.depth - 1)) : 0;   // FLAG
  const foes = [];
  for (let k = 0; k < n; k++) {
    const elite = w.rng() < eliteChance;
    const bodyKey = pickOne(w, (elite ? ELITE_SET : COMMON_SET).filter((b) => BODIES[b]));
    foes.push({ bodyKey, kit: foeKit(bodyKey) });
  }
  return { id: "d" + i, foes };
}
export function openDoors(w) {
  w.phase = "doors";
  w.doors = Array.from({ length: DOOR_COUNT }, (_, i) => rollDoor(w, i));
  w.votes.clear();
  w.foes = [];
}
export const activePlayers = (w) => [...w.players.values()].filter((p) => p.connected && p.picked && !p.waitNext);

export function voteDoor(w, pid, index) {
  if (w.phase !== "doors" || !w.doors[index]) return false;
  const p = w.players.get(pid); if (!p?.picked) return false;
  w.votes.set(pid, index);
  const voters = activePlayers(w);
  if (voters.length && voters.every((q) => w.votes.has(q.id))) {
    const tally = new Array(w.doors.length).fill(0);
    for (const q of voters) tally[w.votes.get(q.id)]++;
    const best = tally.indexOf(Math.max(...tally));          // tie → leftmost door (FLAG)
    enterRoom(w, w.doors[best]);
  }
  return true;
}

export function enterRoom(w, door) {
  w.phase = "fight";
  w.room = { door, startedAt: w.time };
  w.defeated = [];
  for (const p of w.players.values()) if (p.picked) p.waitNext = false;
  const heroes = activePlayers(w);
  heroes.forEach((p, i) => {
    freshCombatState(p);
    if (p.dead || p.hp <= 0) p.hp = Math.max(1, Math.round(p.maxHp * REVIVE_FRACTION));
    p.dead = false;
    p.reward = null;
    p.x = 1.6; p.y = ARENA_H * (i + 1) / (heroes.length + 1);
    p.forceSeq++;
    p.targetId = null;
    dealHand(w, p);
  });
  w.foes = door.foes.map((f, i) => spawnFoe(w, f, i, door.foes.length));
  w.fx.push({ k: "room", n: w.depth + 1 });
}
function spawnFoe(w, f, i, n) {
  const e = { id: nid(w, "f"), side: "foe", x: ARENA_W - 2.5 - (i % 2) * 1.6, y: ARENA_H * (i + 1) / (n + 1),
    dead: false, queue: [...f.kit], kitList: [...f.kit] };
  freshCombatState(e);
  applyBody(e, f.bodyKey);
  return e;
}

// Hand: HAND_SIZE visible slots that hold position; played cards go to the discard and only
// recycle when the deck runs dry (KM exhaust-before-repeat rule).
function dealHand(w, p) {
  const pool = shuffleW(w, p.deckList.map((key) => ({ id: nid(w, "c"), key })));
  p.hand = pool.slice(0, HAND_SIZE);
  while (p.hand.length < HAND_SIZE) p.hand.push(null);
  p.deck = pool.slice(HAND_SIZE);
  p.disc = [];
}
function drawInto(w, p, slot) {
  if (!p.deck.length && p.disc.length) { p.deck = shuffleW(w, p.disc); p.disc = []; }
  p.hand[slot] = p.deck.shift() ?? null;
}

// ---------------------------------------------------------------------------------------------
// Targeting
export const opponentsOf = (w, c) => (c.side === "hero" ? w.foes : activePlayers(w)).filter((e) => !e.dead);
export const friendsOf = (w, c) => (c.side === "hero" ? activePlayers(w) : w.foes).filter((e) => !e.dead);
function nearest(list, from, exclude = null) {
  let best = null, bd = Infinity;
  for (const e of list) { if (e === exclude) continue; const d = dist(e, from); if (d < bd) { bd = d; best = e; } }
  return best;
}
// Player target: the tapped foe while it lives, otherwise the nearest foe (owner rule).
export function heroTarget(w, p) {
  const foes = opponentsOf(w, p);
  const tapped = p.targetId && foes.find((f) => f.id === p.targetId);
  if (tapped) return tapped;
  if (p.targetId) p.targetId = null;
  return nearest(foes, p);
}
export function setTarget(w, pid, foeId) {
  const p = w.players.get(pid); if (!p) return false;
  p.targetId = foeId && w.foes.some((f) => f.id === foeId && !f.dead) ? foeId : null;
  return true;
}

// Zones (foe reticles). Circle / arc / line / multi-circle; "inside" = the token overlaps by half.
const inZone = (z, e) => {
  if (!z) return false;
  if (z.shape === "circle") return Math.hypot(e.x - z.x, e.y - z.y) <= z.r + e.r * 0.5;
  if (z.shape === "arc") {
    const d = Math.hypot(e.x - z.x, e.y - z.y);
    if (d > z.r + e.r * 0.5) return false;
    return d < e.r || angDiff(Math.atan2(e.y - z.y, e.x - z.x), z.a) <= z.half;
  }
  if (z.shape === "line") {
    const dx = e.x - z.x, dy = e.y - z.y, ca = Math.cos(z.a), sa = Math.sin(z.a);
    const along = dx * ca + dy * sa, across = Math.abs(-dx * sa + dy * ca);
    return along >= -e.r && along <= z.len + e.r * 0.5 && across <= z.w / 2 + e.r * 0.5;
  }
  if (z.shape === "multi") return z.parts.some((c) => inZone(c, e));
  return false;
};
function zoneFor(w, src, shape, target) {
  const tx = target?.x ?? src.x + 1, ty = target?.y ?? src.y;
  const a = Math.atan2(ty - src.y, tx - src.x);
  if (shape === "arc") return { shape: "arc", x: src.x, y: src.y, a, r: src.r + MELEE_REACH + TOKEN_R * 0.6, half: Math.PI / 3 };
  if (shape === "line") return { shape: "line", x: src.x, y: src.y, a, len: src.r + MELEE_REACH + FRONT_CHAIN_R, w: 1.3 };
  if (shape === "around") return { shape: "circle", x: src.x, y: src.y, r: LANE_SELF_R };
  if (shape === "blast") return { shape: "circle", x: tx, y: ty, r: PICK_LANE_R };
  if (shape === "random") {
    const pool = opponentsOf(w, src);
    const parts = Array.from({ length: 3 }, () => {
      const t = pool.length ? pickOne(w, pool) : target ?? src;
      return { shape: "circle", x: clamp(t.x + (w.rng() - 0.5) * 1.2, 0, ARENA_W), y: clamp(t.y + (w.rng() - 0.5) * 1.2, 0, ARENA_H), r: RANDOM_ZONE_R };
    });
    return { shape: "multi", parts };
  }
  if (shape === "pick") return { shape: "circle", x: tx, y: ty, r: PICK_ZONE_R };
  return null;
}

// Resolve an op's victims. Heroes aim from their target; foes resolve against their locked zone.
function victims(w, src, op, ctx) {
  const opp = opponentsOf(w, src);
  const t = op.target;
  if (t === "storedTarget") return ctx.stored && !ctx.stored.dead ? [ctx.stored] : [];
  if (src.side === "foe" || t === "storedLane") {
    const z = t === "storedLane" ? ctx.storedZone : ctx.zone;
    const inside = opp.filter((e) => inZone(z, e));
    const center = z?.shape === "multi" ? z.parts[0] : z;
    const order = center ? inside.sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y)) : inside;
    if (t === "front" || t === "pick") return order.slice(0, 1);
    if (t === "front2") return order.slice(0, 2);
    if (t === "front3") return order.slice(0, 3);
    if (t === "random") return order.length ? [pickOne(w, order)] : [];
    return order;
  }
  const primary = ctx.primary && !ctx.primary.dead ? ctx.primary : heroTarget(w, src);
  if (t === "front" || t === "pick") return primary ? [primary] : [];
  if (t === "front2" || t === "front3") {
    if (!primary) return [];
    const n = t === "front2" ? 1 : 2;
    const extra = opp.filter((e) => e !== primary && dist(e, primary) <= FRONT_CHAIN_R)
      .sort((a, b) => dist(a, primary) - dist(b, primary)).slice(0, n);
    return [primary, ...extra];
  }
  // area hits list nearest-first, so "the front foe" riders (Whip) land on the closest one
  if (t === "lane" || t === "selfLane") return opp.filter((e) => dist(e, src) <= LANE_SELF_R + e.r).sort((a, b) => dist(a, src) - dist(b, src));
  if (t === "pickLane") return primary ? opp.filter((e) => dist(e, primary) <= PICK_LANE_R + e.r).sort((a, b) => dist(a, primary) - dist(b, primary)) : [];
  if (t === "random") return opp.length ? [pickOne(w, opp)] : [];
  return [];
}

// ---------------------------------------------------------------------------------------------
// Damage / heal / shield (symmetric for both sides)
const buffAmt = (c, kind) => c.buffs.reduce((s, b) => s + (b.kind === kind ? b.amount : 0), 0);
function dealDamage(w, src, tgt, amount, opts = {}) {
  if (!tgt || tgt.dead) return 0;
  // pierce ("ignores all defensive effects"): no damage reduction and no shields in the way
  let n = amount + buffAmt(tgt, "vulnerable") - (src ? buffAmt(src, "sap") : 0) - (opts.pierce ? 0 : buffAmt(tgt, "stoneskin"));
  n = Math.max(0, Math.round(n));
  let left = n, absorbed = 0;
  if (!opts.pierce) for (const s of tgt.temps) { const a = Math.min(s.amount, left); s.amount -= a; left -= a; absorbed += a; }
  tgt.temps = tgt.temps.filter((s) => s.amount > 0);
  const a = opts.pierce ? 0 : Math.min(tgt.shield, left); tgt.shield -= a; left -= a; absorbed += a;
  const hpBefore = tgt.hp;
  tgt.hp -= left;
  if (opts.out) opts.out.excess = Math.max(0, left - Math.max(0, hpBefore));
  w.fx.push({ k: "hit", id: tgt.id, n, abs: absorbed, src: src?.id ?? null, cause: opts.cause ?? null, x: r2(tgt.x), y: r2(tgt.y) });
  if (src && opts.direct && tgt.thorns > 0 && !src.dead) dealDamage(w, tgt, src, tgt.thorns, { cause: "Thorns" });
  if (tgt.hp <= 0) kill(w, tgt);
  return n;
}
function heal(w, c, n) {
  if (!c || c.dead || n <= 0) return 0;
  const before = c.hp; c.hp = Math.min(c.maxHp, c.hp + Math.round(n));
  if (c.hp > before) w.fx.push({ k: "heal", id: c.id, n: c.hp - before });
  return c.hp - before;
}
function gainShield(w, c, n) {
  if (!c || c.dead || n <= 0) return;
  c.shield += Math.round(n);
  w.fx.push({ k: "shield", id: c.id, n: Math.round(n) });
}
function kill(w, c) {
  c.dead = true; c.hp = 0; c.cast = null; c.strikes = [];
  w.fx.push({ k: "die", id: c.id, x: r2(c.x), y: r2(c.y) });
  if (c.side === "foe") w.defeated.push({ bodyKey: c.bodyKey, kit: c.kitList });
}

// Modal bonus auto-pick (no popover in real time yet): the kind most of the caster's cards use.
// FLAG: the card is a player CHOICE in KM; this heuristic stands in until a quick-pick UI exists.
function modalKind(c) {
  const keys = c.side === "hero" ? c.deckList : c.kitList;
  let m = 0, r = 0;
  for (const k of keys ?? []) { const t = triggerKind(k); if (t === "melee") m++; else if (t === "ranged") r++; }
  return r > m ? "ranged" : "melee";
}

// ---------------------------------------------------------------------------------------------
// The resolver: one code path for both sides.
export function resolveOps(w, src, key, ops, ctx) {
  const kind = cardKind(key) === "untyped" ? "none" : cardKind(key);
  const bonusFor = (k) => (k === "none" ? 0 : weightedCardKindBonus(key, src, k));
  const rangedPlus = (o) => (o.plusRangedBonus || o.plusRanged ? weightedCardKindBonus(key, src, "ranged") : 0);
  for (const op of ops ?? []) {
    if (src.dead) return;
    switch (op.do) {
      case "deal": {
        const hits = Math.max(1, op.hits ?? 1);
        for (let h = 0; h < hits; h++) {
          const list = victims(w, src, op, ctx);
          const primary = ctx.primary ?? list[0];
          for (const v of list) {
            let base = op.ofShield ? src.shield : op.ofHp ? src.hp : (op.amount ?? 0);
            let n = base + bonusFor(op.bothKinds ? "both" : kind)
              + (op.pickExtra && v === primary ? op.pickExtra : 0) + (op.frontExtra && v === list[0] ? op.frontExtra : 0);
            const out = {};
            const dealt = dealDamage(w, src, v, n, { direct: !op.noReact, pierce: !!op.pierce, out });
            ctx.dealt += dealt; ctx.lastHits.push({ v, dealt });
            if (op.lifesteal) heal(w, src, dealt);
            if (op.shieldFromDealt) gainShield(w, src, dealt);
            if (op.overflow && v.dead && out.excess > 0) {   // excess spills into the nearest foe "behind" it
              const spill = nearest(opponentsOf(w, src).filter((e) => dist(e, v) <= FRONT_CHAIN_R), v);
              if (spill) dealDamage(w, src, spill, out.excess, { cause: "Overflow" });
            }
          }
          if (list.length) w.fx.push({ k: "strike", src: src.id, key, to: list.map((v) => v.id), shape: cardShape(key) });
        }
        break;
      }
      case "shield": gainShield(w, src, (op.ofDealt ? ctx.dealt : (op.amount ?? 0)) + rangedPlus(op)); break;
      case "tempShield": {
        const n = op.ofDealt ? ctx.dealt : (op.amount ?? 0);
        if (n > 0) { src.temps.push({ amount: n, until: w.time + ticks(op.dur ?? 60) }); w.fx.push({ k: "shield", id: src.id, n }); }
        break;
      }
      case "healSelf": heal(w, src, (op.amount ?? 0) + rangedPlus(op)); break;
      case "healFull": heal(w, src, src.maxHp); break;
      case "healAlly": {
        const f = friendsOf(w, src).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0] ?? src;
        heal(w, f, (op.amount ?? 0) + rangedPlus(op));
        break;
      }
      case "healPath": {   // "heal allies in that lane" → friendlies near the caster (FLAG radius)
        for (const f of friendsOf(w, src).filter((f) => dist(f, src) <= LANE_SELF_R + 1)) heal(w, f, ctx.dealt);
        break;
      }
      case "counter": src.counters += op.amount ?? 1; w.fx.push({ k: "buff", id: src.id, s: `+${op.amount ?? 1} dmg` }); break;
      case "rangedBonus": src.rangedBonus += op.amount ?? 1; w.fx.push({ k: "buff", id: src.id, s: `+${op.amount ?? 1} ranged` }); break;
      case "meleeBonus": src.meleeBonus += op.amount ?? 1; w.fx.push({ k: "buff", id: src.id, s: `+${op.amount ?? 1} melee` }); break;
      case "modalBonus": {
        const k = modalKind(src);
        src[k === "ranged" ? "rangedBonus" : "meleeBonus"] += op.amount ?? 1;
        w.fx.push({ k: "buff", id: src.id, s: `+${op.amount ?? 1} ${k}` });
        break;
      }
      case "buff": {
        src.buffs.push({ kind: op.buff, amount: op.amount ?? 1, until: w.time + ticks(op.dur ?? 60) });
        w.fx.push({ k: "buff", id: src.id, s: op.buff === "haste" ? "Haste" : "Stoneskin" });
        break;
      }
      case "sap": {
        if (op.ofLastHit) { for (const { v, dealt } of ctx.lastHits) if (dealt > 0) v.buffs.push({ kind: "sap", amount: dealt, until: w.time + ticks(op.dur ?? 60) }); break; }
        const amt = op.ofDealt ? ctx.dealt : (op.amount ?? 0) + rangedPlus(op);
        if (amt > 0) for (const v of victims(w, src, op, ctx)) v.buffs.push({ kind: "sap", amount: amt, until: w.time + ticks(op.dur ?? 60) });
        break;
      }
      case "vulnerable": {
        for (const v of victims(w, src, op, ctx)) v.buffs.push({ kind: "vulnerable", amount: (op.amount ?? 1) + rangedPlus(op), until: w.time + ticks(op.dur ?? 9999) });
        break;
      }
      case "poison": {
        for (const v of victims(w, src, op, ctx)) { v.poison += (op.amount ?? 1) + rangedPlus(op); v.poisonSrc = src.id; }
        break;
      }
      case "leech": {
        const list = op.target ? victims(w, src, op, ctx) : ctx.lastHits.map((h) => h.v);
        for (const v of list) v.leeches.push({ src: src.id, amount: (op.amount ?? 1) + rangedPlus(op), period: ticks(op.period ?? 60), clock: op.immediate ? ticks(op.period ?? 60) : 0 });
        break;
      }
      case "thorns": src.thorns += op.amount ?? 1; w.fx.push({ k: "buff", id: src.id, s: "Thorns" }); break;
      case "regen": {
        const r = { kind: op.kind, amount: op.amount ?? 1, period: ticks(op.period ?? 60), clock: 0, modal: op.kind === "modalBonus" ? modalKind(src) : null };
        src.regens.push(r);
        if (op.immediate) fireRegen(w, src, r);
        break;
      }
      case "gainMoxie": src.moxie = Math.min(MOXIE_CAP, src.moxie + (op.amount ?? 1)); break;
      case "repositionPick": {   // Wind: "shove it" → knock the target straight away from the caster
        for (const v of ctx.lastHits.length ? [ctx.lastHits[ctx.lastHits.length - 1].v] : victims(w, src, { target: "pick" }, ctx)) shove(w, v, src, KNOCK_DIST);
        break;
      }
      case "pullFront": {        // Taunt: drag the target to the front of YOUR lane → right in front of you
        for (const v of victims(w, src, op, ctx)) pullTo(w, v, src);
        break;
      }
      case "timer": {
        const zoneShape = cardShape(key);
        const t = {
          key, ops: op.ops, period: ticks(op.period ?? 60), clock: op.immediate ? ticks(op.period ?? 60) : 0,
          once: !!op.once, boost: op.boost ?? 0, ramp: op.ramp ?? 0,
          stored: op.captureTarget ? (ctx.primary ?? victims(w, src, { target: "pick" }, ctx)[0] ?? null) : null,
          storedZone: op.captureLane ? captureZone(w, src, op.captureLane, ctx) : null,
          zoneShape,
        };
        src.timers.push(t);
        break;
      }
      default: break;
    }
  }
}
function captureZone(w, src, mode, ctx) {
  if (mode === "source") return { shape: "circle", x: src.x, y: src.y, r: LANE_SELF_R };
  const anchor = src.side === "foe" ? (ctx.zone?.shape === "circle" ? ctx.zone : null) : (ctx.primary ?? heroTarget(w, src));
  return anchor ? { shape: "circle", x: anchor.x, y: anchor.y, r: PICK_LANE_R } : null;
}
function shove(w, v, from, d) {
  const a = Math.atan2(v.y - from.y, v.x - from.x);
  moveForced(w, v, v.x + Math.cos(a) * d, v.y + Math.sin(a) * d);
}
function pullTo(w, v, to) {
  const a = Math.atan2(v.y - to.y, v.x - to.x);
  const g = to.r + v.r + PULL_GAP - 0.9;
  moveForced(w, v, to.x + Math.cos(a) * g, to.y + Math.sin(a) * g);
}
function moveForced(w, v, x, y) {
  v.x = clamp(x, v.r, ARENA_W - v.r); v.y = clamp(y, v.r, ARENA_H - v.r);
  if (v.side === "hero") v.forceSeq++;     // the client owns its movement; this tells it to snap
  w.fx.push({ k: "moved", id: v.id });
}
function fireRegen(w, c, r) {
  if (r.kind === "heal") heal(w, c, r.amount);
  else if (r.kind === "shield") gainShield(w, c, r.amount);
  else if (r.kind === "moxie") c.moxie = Math.min(MOXIE_CAP, c.moxie + r.amount);
  else if (r.kind === "modalBonus") c[r.modal === "ranged" ? "rangedBonus" : "meleeBonus"] += r.amount;
}
const newCtx = (extra = {}) => ({ dealt: 0, lastHits: [], primary: null, zone: null, stored: null, storedZone: null, ...extra });

// ---------------------------------------------------------------------------------------------
// Player card play (instant). Returns {ok, why}.
export function cardCostOf(key) { return KIT[key]?.cost ?? 1; }
export function canPlay(w, p, slot) {
  if (w.phase !== "fight" || p.dead) return { ok: false, why: "down" };
  const card = p.hand[slot];
  if (!card) return { ok: false, why: "empty" };
  if (p.gcd > w.time) return { ok: false, why: "busy" };
  const cost = cardCostOf(card.key);
  if (p.moxie < cost) return { ok: false, why: "moxie" };
  if (touchesFoes(card.key)) {
    const t = heroTarget(w, p);
    if (!t) return { ok: false, why: "noTarget" };
    if (needsReach(card.key) && gap(p, t) > MELEE_REACH) return { ok: false, why: "reach", target: t.id };
  }
  return { ok: true };
}
export function playCard(w, pid, slot) {
  const p = w.players.get(pid); if (!p) return { ok: false, why: "nobody" };
  const check = canPlay(w, p, slot);
  if (!check.ok) return check;
  const card = p.hand[slot];
  p.moxie -= cardCostOf(card.key);
  p.gcd = w.time + PLAY_GCD;
  const primary = touchesFoes(card.key) ? heroTarget(w, p) : null;
  w.fx.push({ k: "cast", src: p.id, key: card.key, to: primary?.id ?? null, shape: cardShape(card.key) });
  resolveOps(w, p, card.key, KIT[card.key].ops, newCtx({ primary }));
  p.disc.push(card);
  drawInto(w, p, slot);
  checkFightEnd(w);
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Foe brain: visible queue (front card is the telegraph), moxie-gated; when it can pay, it plants
// a reticle and resolves when the windup ends. Melee foes close to reach first; ranged foes kite.
function foeThink(w, e) {
  const target = nearest(opponentsOf(w, e), e);
  if (e.cast) {
    if (w.time >= e.cast.until) {
      const c = e.cast; e.cast = null;
      resolveOps(w, e, c.key, KIT[c.key].ops, newCtx({ zone: c.zone, primary: null }));
      e.queue.push(e.queue.shift());
    }
    return;   // rooted while winding up
  }
  if (!target) return;
  const key = e.queue[0];
  const reach = needsReach(key);
  const d = gap(e, target);
  // movement
  let vx = 0, vy = 0;
  const ux = (target.x - e.x) / (dist(e, target) || 1), uy = (target.y - e.y) / (dist(e, target) || 1);
  if (reach || !touchesFoes(key)) { if (d > MELEE_REACH * 0.6) { vx = ux; vy = uy; } }
  else if (d > FOE_RANGED_KEEP[1]) { vx = ux; vy = uy; }
  else if (d < FOE_RANGED_KEEP[0]) { vx = -ux; vy = -uy; }
  else { vx = -uy * 0.45; vy = ux * 0.45; if ((e.id.charCodeAt(1) & 1)) { vx = -vx; vy = -vy; } }   // strafe
  const sp = speedOf(e) * DT;
  e.x = clamp(e.x + vx * sp, e.r, ARENA_W - e.r); e.y = clamp(e.y + vy * sp, e.r, ARENA_H - e.r);
  // cast
  const cost = cardCostOf(key);
  if (e.moxie >= cost && (!reach || gap(e, target) <= MELEE_REACH)) {
    e.moxie -= cost;
    const shape = cardShape(key);
    e.cast = { key, until: w.time + FOE_WINDUP, start: w.time, zone: zoneFor(w, e, shape, target), shape };
    w.fx.push({ k: "telegraph", src: e.id, key });
  }
}
function separate(w) {
  const all = [...w.foes.filter((e) => !e.dead), ...activePlayers(w).filter((p) => !p.dead)];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j];
    const d = dist(a, b), min = a.r + b.r;
    if (d >= min) continue;
    // exactly stacked (e.g. both pinned to the same wall point): split toward the arena centre
    const cx = ARENA_W / 2 - b.x, cy = ARENA_H / 2 - b.y, cd = Math.hypot(cx, cy) || 1;
    const push = (min - d), ux = d ? (b.x - a.x) / d : cx / cd, uy = d ? (b.y - a.y) / d : cy / cd;
    // players own their movement (client-authoritative), so foes give way to them
    if (a.side === "hero" && b.side === "hero") continue;
    if (a.side === "hero") { b.x += ux * push; b.y += uy * push; }
    else if (b.side === "hero") { a.x -= ux * push; a.y -= uy * push; }
    else { a.x -= ux * push / 2; a.y -= uy * push / 2; b.x += ux * push / 2; b.y += uy * push / 2; }
  }
  for (const e of w.foes) { e.x = clamp(e.x, e.r, ARENA_W - e.r); e.y = clamp(e.y, e.r, ARENA_H - e.r); }
}

// Per-entity clocks: moxie, buffs, temp shields, poison, leeches, regens, timers.
function tickClocks(w, c) {
  const haste = c.buffs.some((b) => b.kind === "haste") ? 2 : 1;
  c.moxieAcc += DT * haste;
  while (c.moxieAcc >= 1) { c.moxieAcc -= 1; c.moxie = Math.min(MOXIE_CAP, c.moxie + 1); }
  c.buffs = c.buffs.filter((b) => b.until > w.time);
  c.temps = c.temps.filter((s) => s.until > w.time);
  if (c.poison > 0 && (c.poisonClock += DT) >= ticks(60)) {
    c.poisonClock = 0;
    const src = findEntity(w, c.poisonSrc);
    dealDamage(w, src, c, c.poison, { cause: "Poison" });
    if (c.dead) return;
  }
  for (const l of c.leeches) {
    if ((l.clock += DT) >= l.period) {
      l.clock = 0;
      const src = findEntity(w, l.src);
      const dealt = dealDamage(w, src, c, l.amount, { cause: "Leech" });
      if (src && !src.dead) heal(w, src, dealt);
      if (c.dead) return;
    }
  }
  for (const r of c.regens) if ((r.clock += DT) >= r.period) { r.clock = 0; fireRegen(w, c, r); }
  for (const t of [...c.timers]) {
    if ((t.clock += DT) < t.period) continue;
    t.clock = 0;
    if (t.once) c.timers.splice(c.timers.indexOf(t), 1);
    const boosted = t.boost ? t.ops.map((o) => (o.amount != null ? { ...o, amount: o.amount + t.boost } : o)) : t.ops;
    t.boost += t.ramp;
    if (c.side === "foe" && !t.storedZone && !t.stored && firstFoeOp(t.ops)) {
      // a foe timer that needs a fresh aim plants its own reticle first (same windup as a cast)
      const target = nearest(opponentsOf(w, c), c);
      c.strikes.push({ key: t.key, ops: boosted, until: w.time + FOE_WINDUP, zone: zoneFor(w, c, t.zoneShape, target) });
    } else {
      resolveOps(w, c, t.key, boosted, newCtx({ stored: t.stored, storedZone: t.storedZone, primary: c.side === "hero" ? (t.stored ?? null) : null, zone: t.storedZone }));
    }
    if (c.dead) return;
  }
  for (const s of [...c.strikes]) {
    if (w.time < s.until) continue;
    c.strikes.splice(c.strikes.indexOf(s), 1);
    resolveOps(w, c, s.key, s.ops, newCtx({ zone: s.zone }));
  }
}
const findEntity = (w, id) => (id ? (w.players.get(id) ?? w.foes.find((f) => f.id === id) ?? null) : null);

function checkFightEnd(w) {
  if (w.phase !== "fight") return;
  if (w.foes.every((f) => f.dead)) return clearRoom(w);
  const heroes = activePlayers(w);
  if (heroes.length && heroes.every((p) => p.dead)) {
    w.phase = "over";
    w.fx.push({ k: "over", depth: w.depth });
  }
}
function clearRoom(w) {
  w.depth++;
  w.phase = "reward";
  const lootPool = [...new Set(w.defeated.flatMap((d) => d.kit))].filter((k) => PORTED_SET.has(k));
  const bodies = [...new Set(w.defeated.map((d) => d.bodyKey))];
  // every party member, including one whose phone dropped mid-fight, is revived and rewarded
  for (const p of w.players.values()) {
    if (!p.picked || p.waitNext) continue;
    if (p.dead) { p.dead = false; p.hp = Math.max(1, Math.round(p.maxHp * REVIVE_FRACTION)); }
    if (HEAL_BETWEEN_ROOMS) p.hp = p.maxHp;
    p.roomsCleared = w.depth;
    // THE MIMIC: wear a body you just felled (wounds carry), and take one card they carried.
    p.reward = { cards: shuffleW(w, [...lootPool]).slice(0, LOOT_CHOICES), bodies: bodies.slice(0, 3), card: null, body: null, done: false };
    p.cast = null; p.timers = []; p.strikes = [];
  }
  w.fx.push({ k: "clear", depth: w.depth });
}
const rewardSettled = (q) => !q.reward || q.reward.done;
export function rewardPick(w, pid, kind, index) {
  const p = w.players.get(pid);
  if (w.phase !== "reward" || !p?.reward || p.reward.done) return false;
  if (kind === "card") p.reward.card = p.reward.card === index ? null : index;
  else if (kind === "body") p.reward.body = p.reward.body === index ? null : index;
  else if (kind === "done") {
    const r = p.reward;
    if (r.card != null && r.cards[r.card]) p.deckList.push(r.cards[r.card]);
    if (r.body != null && r.bodies[r.body]) applyBody(p, r.bodies[r.body], true);
    r.done = true;
    if (activePlayers(w).every(rewardSettled)) openDoors(w);
  } else return false;
  return true;
}
export function restartRun(w) {
  w.depth = 0; w.foes = []; w.doors = []; w.votes.clear(); w.usedOffers.clear(); w.phase = "draft";
  for (const p of w.players.values()) {
    freshCombatState(p); p.dead = false; p.picked = false; p.waitNext = false; p.reward = null; p.deckList = [];
    applyBody(p, STARTER_BODY); p.offers = rollOffers(w);
  }
}

// Client-reported movement (client-authoritative, server-validated). `fs` must match the
// player's forceSeq so a stale position never overrides a knockback/pull.
// Movement allowance accrues per sim tick (speed x 1.6 slack for jitter, capped at half a second),
// so a burst of messages can never move a player faster than their speed.
const MOVE_SLACK = 1.6;
export function reportMove(w, pid, x, y, fs) {
  const p = w.players.get(pid);
  if (!p || p.dead || w.phase !== "fight" || fs !== p.forceSeq) return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const maxStep = (p.moveBudget ?? 0) + 0.05;
  const d = Math.hypot(x - p.x, y - p.y);
  const k = d > maxStep ? maxStep / d : 1;
  p.moveBudget = Math.max(0, (p.moveBudget ?? 0) - d * k);
  p.x = clamp(p.x + (x - p.x) * k, p.r, ARENA_W - p.r);
  p.y = clamp(p.y + (y - p.y) * k, p.r, ARENA_H - p.r);
  return true;
}

// Phase gates that can complete because someone LEFT (disconnect) rather than because they acted.
function reconcile(w) {
  const act = activePlayers(w);
  if (w.phase === "draft") {
    const here = [...w.players.values()].filter((p) => p.connected);
    if (here.length && here.every((p) => p.picked)) openDoors(w);
  } else if (w.phase === "doors") {
    if (act.length && act.every((q) => w.votes.has(q.id))) voteDoor(w, act[0].id, w.votes.get(act[0].id));
  } else if (w.phase === "reward") {
    if (act.length && act.every(rewardSettled)) openDoors(w);
  }
}

export function step(w) {
  w.time += DT;
  if (w.phase !== "fight") return reconcile(w);
  for (const p of activePlayers(w)) {
    p.moveBudget = Math.min(speedOf(p) * 0.5, (p.moveBudget ?? 0) + speedOf(p) * DT * MOVE_SLACK);
    if (!p.dead) tickClocks(w, p);
  }
  for (const e of w.foes) if (!e.dead) tickClocks(w, e);
  for (const e of w.foes) if (!e.dead) foeThink(w, e);
  separate(w);
  checkFightEnd(w);
}

// ---------------------------------------------------------------------------------------------
// Snapshot for the wire (per viewer).
function entSnap(w, c) {
  const s = {
    id: c.id, side: c.side, body: c.bodyKey, x: r2(c.x), y: r2(c.y), r: c.r,
    hp: Math.max(0, c.hp), mhp: c.maxHp, sh: c.shield + c.temps.reduce((t, x) => t + x.amount, 0),
    mx: Math.floor(c.moxie), dead: !!c.dead,
    tags: [c.poison ? `Poison ${c.poison}` : null, buffAmt(c, "sap") ? `Weak ${buffAmt(c, "sap")}` : null,
      buffAmt(c, "vulnerable") ? `Hexed ${buffAmt(c, "vulnerable")}` : null, buffAmt(c, "stoneskin") ? "Stoneskin" : null,
      c.buffs.some((b) => b.kind === "haste") ? "Haste" : null, c.thorns ? "Thorns" : null,
      c.counters + c.meleeBonus + c.rangedBonus ? `+${c.counters + Math.max(c.meleeBonus, c.rangedBonus)} dmg` : null].filter(Boolean),
  };
  if (c.side === "foe") {
    s.next = c.queue[0];
    s.queue = c.queue.slice(0, 3);
    if (c.cast) s.cast = { key: c.cast.key, zone: c.cast.zone, p: r2(clamp((w.time - c.cast.start) / FOE_WINDUP, 0, 1)) };
    const zones = [];
    for (const st of c.strikes) zones.push({ zone: st.zone, p: r2(clamp(1 - (st.until - w.time) / FOE_WINDUP, 0, 1)), key: st.key });
    for (const t of c.timers) if (t.storedZone) zones.push({ zone: t.storedZone, p: r2(clamp(1 - (t.period - t.clock) / FOE_WINDUP, 0, 1)), key: t.key, linger: true });
    if (zones.length) s.zones = zones;
  } else {
    s.name = c.name; s.tgt = c.targetId; s.fs = c.forceSeq;
  }
  return s;
}
export function snapshot(w, viewerId) {
  const me = w.players.get(viewerId);
  const out = {
    t: "state", phase: w.phase, time: r2(w.time), depth: w.depth,
    heroes: activePlayers(w).map((p) => entSnap(w, p)),
    foes: w.phase === "fight" ? w.foes.filter((f) => !f.dead).map((f) => entSnap(w, f)) : [],
    fx: w.fx,
  };
  if (me) {
    const auto = w.phase === "fight" ? heroTarget(w, me) : null;
    out.you = {
      id: me.id, picked: me.picked, body: me.bodyKey, hp: me.hp, mhp: me.maxHp, moxie: r2(me.moxie + me.moxieAcc),
      hand: me.hand.map((c, i) => (c ? { id: c.id, key: c.key, ...playHint(w, me, i) } : null)),
      deck: me.deck.length, disc: me.disc.length, deckList: me.deckList, target: auto?.id ?? null, tapped: me.targetId,
      fs: me.forceSeq, speed: speedOf(me), x: r2(me.x), y: r2(me.y), dead: me.dead,
    };
    if (!me.picked) out.offers = me.offers;   // late / returning players draft in any phase
    out.you.waitNext = !!me.waitNext;
    if (w.phase === "reward") out.reward = me.reward;
  }
  if (w.phase === "doors") {
    out.doors = w.doors;
    out.votes = Object.fromEntries(w.votes);
  }
  if (w.phase === "draft") out.waiting = [...w.players.values()].filter((p) => p.connected && !p.picked).map((p) => p.name);
  return out;
}
function playHint(w, p, slot) {
  const c = canPlay(w, p, slot);
  return { ok: c.ok, why: c.ok ? null : c.why };
}
export const flushFx = (w) => { w.fx = []; };

// Static catalog the client needs once (display names + text, never internal keys on screen).
export function catalog() {
  const cards = {};
  for (const k of PORTED_PLAYER_CARDS) {
    const it = KIT[k];
    cards[k] = { name: it.name, cost: it.cost ?? 1, color: it.color ?? "#ccc", text: it.text ?? "",
      kind: triggerKind(k), shape: cardShape(k), reach: needsReach(k), weight: it.weightTag ?? null };
  }
  const bodies = {};
  for (const k of [STARTER_BODY, ...COMMON_SET, ...ELITE_SET]) {
    const b = BODIES[k]; if (!b) continue;
    bodies[k] = { name: b.name, color: b.color ?? "#9ad", hp: bodyMaxHp(b), elite: !!b.elite, speed: BODY_SPEED[k] ?? DEFAULT_SPEED };
  }
  return { cards, bodies, arena: { w: ARENA_W, h: ARENA_H }, reach: MELEE_REACH, hz: SIM_HZ, windup: FOE_WINDUP };
}
