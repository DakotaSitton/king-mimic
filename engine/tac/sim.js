// King Mimic — HEX TACTICS turn-based sim (branch claude/hex-tactics, started 2026-10-28).
//
// Owner brief (2026-10-28, verbatim intent): combat works entirely differently. Players are placed
// on BOARDS that serve as rooms, populated with foes like usual, but it's an actual open-space
// board. Each turn they get 5 MOXIE and use it to MOVE (movement costs moxie based on SPEED, a new
// stat) and to play cards; cards have RANGES and RADIUSES. PLAYERS ALWAYS GO FIRST, then the foes in
// the room go. They still draw cards; unspent moxie carries into the next turn up to 10. Clicking a
// foe shows ALL its stats; every foe shows its NEXT ACTION/CARD queued above its head. Foes need AI to
// get within range of their card and attack whatever they can hit most easily.
// Owner answers (same day): 3D lane-game presentation, HEX grid, 1 moxie buys SPEED hexes of movement,
// co-op players all act at once (each ends their turn), then the foes act.
//
// This module is PURE game logic (no I/O): tac-server.js drives it, tests import it. Card DATA and
// BODY data come straight from the engine tables — nothing is re-authored. New here: the hex board,
// the turn structure, card geometry (range/radius) and the foe brain.
//
// Every number below that the owner did not state carries a FLAG — owner-review defaults, not canon.

import {
  KIT, BODIES, bodyMaxHp, cardKind, triggerKind, weightedCardKindBonus,
  MOXIE_CAP, HAND_SIZE, START_MOXIE, STARTER_DECK, STARTER_BODY, COMMON_SET, ELITE_SET,
  rollFoeKit, rollKit, isCard, PLAYER_POOL,
} from "../../game.js";
import { createBoard, key as hk, same, distance, disk, neighbors, reachable, pathTo, rayBeyond, fromOffset } from "./hex.js";

// ---------------------------------------------------------------------------------------------
// Owner-stated rules
export const TURN_MOXIE = 5;              // owner: "They have moxie each turn, 5"
export { MOXIE_CAP };                     // owner: unspent moxie carries "up to 10" (engine MOXIE_CAP)
// Tunables
export const BOARD_COLS = 11, BOARD_ROWS = 7;   // FLAG: board size, sized for phone landscape
export const DEFAULT_SPEED = 3;           // FLAG: hexes bought per 1 moxie, same for every body until set
export const BODY_SPEED = {};             // e.g. { tollTroll: 2, pennyPixie: 4 } — empty until the owner sets any
// Card geometry defaults, derived from each card's lane-game target (owner: "cards having ranges and
// radiuses"). CARD_GEOMETRY overrides any card: { oSword: { range: 1 }, oFireball: { range: 5, radius: 2 } }.
export const MELEE_RANGE = 1;             // FLAG: front / front2 / front3 → adjacent
export const RANGED_RANGE = 4;            // FLAG: pick / pickLane / random → within 4 hexes
export const AROUND_RADIUS = 1;           // FLAG: lane ("your lane") → every foe within 1 of you
export const BLAST_RADIUS = 1;            // FLAG: pickLane ("its lane") → the target hex + 1 around it
export const CARD_GEOMETRY = {};          // per-card owner overrides (empty)
export const KNOCK_HEXES = 2;             // FLAG: Wind's shove distance
export const TURN_TICKS = 50;             // FLAG: lane-game durations → turns (5 moxie at 1/s = 5 s per turn)
export const REVIVE_FRACTION = 0.5;       // FLAG: downed players revive at this HP share when a room clears
export const HEAL_BETWEEN_ROOMS = true;   // FLAG: full heal after each cleared room (first-slice generosity)
export const LOOT_CHOICES = 3;            // FLAG
export const DOOR_COUNT = 3;              // FLAG
export const FOE_ACTION_CAP = 8;          // engine guard: max moves+casts one foe makes per turn

const turnsFor = (t) => Math.max(1, Math.round((t ?? 60) / TURN_TICKS));

// ---------------------------------------------------------------------------------------------
// Which cards this mode can run (same port boundary as the twin-stick slice): a card is IN when every
// op it uses is supported. Unsupported cards never enter a deck, a foe kit or a loot roll here.
const SUPPORTED_OPS = new Set([
  "deal", "shield", "tempShield", "healSelf", "healAlly", "healFull", "healPath", "counter",
  "rangedBonus", "meleeBonus", "modalBonus", "buff", "sap", "vulnerable", "poison", "leech", "thorns",
  "regen", "timer", "gainMoxie", "repositionPick", "pullFront",
]);
const SUPPORTED_TARGETS = new Set([undefined, "self", "front", "front2", "front3", "pick", "lane",
  "pickLane", "random", "storedLane", "storedTarget", "selfLane"]);
const SUPPORTED_BUFFS = new Set(["stoneskin", "haste"]);
const SUPPORTED_REGEN = new Set(["heal", "shield", "moxie", "modalBonus"]);
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
export const PORTED_PLAYER_CARDS = [...new Set([...PLAYER_POOL, ...STARTER_DECK])].filter(cardSupported);
const PORTED_SET = new Set(PORTED_PLAYER_CARDS);

// ---------------------------------------------------------------------------------------------
// Card geometry. shape: self (no foe op) · single (one foe) · line (a foe + the ones behind it) ·
// around (every foe within radius of you) · blast (every foe within radius of the aimed hex) ·
// random (random foes within range).
const FOE_TGT = new Set(["front", "front2", "front3", "pick", "lane", "pickLane", "random", "storedLane", "storedTarget", "selfLane"]);
function firstFoeOp(ops) {
  for (const o of ops ?? []) {
    if (FOE_TGT.has(o.target)) return o;
    if (o.do === "timer") { const inner = firstFoeOp(o.ops); if (inner) return inner; }
  }
  return null;
}
const geoCache = new Map();
export function geometryOf(key) {
  if (geoCache.has(key)) return geoCache.get(key);
  const o = firstFoeOp(KIT[key]?.ops);
  let g;
  if (!o) g = { shape: "self", range: 0, radius: 0 };
  else if (o.target === "front") g = { shape: "single", range: MELEE_RANGE, radius: 0 };
  else if (o.target === "front2") g = { shape: "line", range: MELEE_RANGE, radius: 1 };
  else if (o.target === "front3") g = { shape: "line", range: MELEE_RANGE, radius: 2 };
  else if (o.target === "lane" || o.target === "selfLane") g = { shape: "around", range: 0, radius: AROUND_RADIUS };
  else if (o.target === "pickLane" || o.target === "storedLane") g = { shape: "blast", range: RANGED_RANGE, radius: BLAST_RADIUS };
  else if (o.target === "random") g = { shape: "random", range: RANGED_RANGE, radius: 0 };
  else g = { shape: "single", range: RANGED_RANGE, radius: 0 };
  g = { ...g, ...(CARD_GEOMETRY[key] ?? {}) };
  geoCache.set(key, g);
  return g;
}
export const touchesFoes = (key) => geometryOf(key).shape !== "self";
export const needsAim = (key) => ["single", "line", "blast"].includes(geometryOf(key).shape);

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
const hexOf = (c) => ({ q: c.q, r: c.r });

// ---------------------------------------------------------------------------------------------
// World + entities
export function createWorld(opts = {}) {
  return {
    phase: "draft", turn: null, round: 0, beat: 0, depth: 0, nextId: 1, rng: opts.rng ?? Math.random,
    board: createBoard(BOARD_COLS, BOARD_ROWS),
    players: new Map(), foes: [], doors: [], votes: new Map(), fx: [], seq: 0,
    room: null, defeated: [], usedOffers: new Set(), foeOrder: [], foeActions: 0,
  };
}
const nid = (w, p = "e") => p + (w.nextId++);
export const speedOf = (c) => BODY_SPEED[c.bodyKey] ?? DEFAULT_SPEED;

function freshCombatState(c) {
  Object.assign(c, {
    moxie: START_MOXIE, steps: 0, counters: 0, meleeBonus: 0, rangedBonus: 0, shield: 0,
    temps: [], buffs: [], poison: 0, poisonSrc: null, leeches: [], regens: [], timers: [], thorns: 0,
    ended: false,
  });
}
function applyBody(c, bodyKey, keepWoundRatio = false) {
  const ratio = keepWoundRatio && c.maxHp ? c.hp / c.maxHp : 1;
  c.bodyKey = bodyKey;
  c.maxHp = bodyMaxHp(BODIES[bodyKey]);
  c.hp = Math.max(1, Math.round(c.maxHp * ratio));
}

export function addPlayer(w, id, name = "Mimic") {
  if (w.players.has(id)) { const p = w.players.get(id); p.connected = true; if (name) p.name = name; return p; }
  const p = {
    id, name, side: "hero", q: 0, r: 0, hp: 1, maxHp: 1, dead: false,
    bodyKey: null, deckList: [], hand: [], deck: [], disc: [], connected: true,
    offers: rollOffers(w), picked: false, reward: null, roomsCleared: 0, waitNext: false,
  };
  freshCombatState(p);
  applyBody(p, STARTER_BODY);
  w.players.set(id, p);
  return p;
}
export function removePlayer(w, id) { w.players.delete(id); w.votes.delete(id); reconcile(w); }
export function setConnected(w, id, on) {
  const p = w.players.get(id); if (!p) return;
  p.connected = on;
  if (!on) reconcile(w);
}

// Draft: three body + deck offers per player, never overlapping another player's (KM rule).
function rollOffers(w) {
  const pool = shuffleW(w, COMMON_SET.filter((k) => BODIES[k] && !w.usedOffers.has(k)));
  const bodies = pool.slice(0, 3);
  for (const b of bodies) w.usedOffers.add(b);
  return bodies.map((bodyKey) => ({ bodyKey, deck: buildDeck(w, rollKit(bodyKey)) }));
}
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
  p.waitNext = w.phase === "fight" || w.phase === "reward" || w.phase === "over";
  reconcile(w);
  return true;
}

// ---------------------------------------------------------------------------------------------
// Doors: rooms are chosen by what's inside — each door lists its foes and their cards.
export const activePlayers = (w) => [...w.players.values()].filter((p) => p.connected && p.picked && !p.waitNext);
// everyone who belongs to the current fight, including a phone that dropped (they keep their token)
const partyOf = (w) => [...w.players.values()].filter((p) => p.picked && !p.waitNext);
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
  w.phase = "doors"; w.turn = null;
  w.doors = Array.from({ length: DOOR_COUNT }, (_, i) => rollDoor(w, i));
  w.votes.clear();
  w.foes = [];
}
export function voteDoor(w, pid, index) {
  if (w.phase !== "doors" || !w.doors[index]) return false;
  const p = w.players.get(pid); if (!p?.picked || p.waitNext) return false;
  w.votes.set(pid, index);
  reconcile(w);
  return true;
}
function tallyDoors(w) {
  const voters = activePlayers(w);
  const tally = new Array(w.doors.length).fill(0);
  for (const q of voters) if (w.votes.has(q.id)) tally[w.votes.get(q.id)]++;
  return tally.indexOf(Math.max(...tally));          // tie → leftmost door (FLAG)
}

// Placement: heroes on the left edge, foes on the right edge (FLAG: spawn columns).
function spawnHexes(w, cols, n) {
  const rows = w.board.rows;
  const out = [];
  const order = [3, 2, 4, 1, 5, 0, 6].filter((r) => r < rows);
  for (const col of cols) for (const row of order) {
    const h = fromOffset(col, row);
    if (!occupant(w, h)) out.push(h);
    if (out.length >= n) return out;
  }
  return out;
}
export function enterRoom(w, door) {
  w.phase = "fight";
  w.room = { door };
  w.defeated = [];
  w.foes = [];
  for (const p of w.players.values()) if (p.picked) p.waitNext = false;
  const heroes = partyOf(w);
  for (const p of heroes) { p.q = -99; p.r = -99; }
  const hs = spawnHexes(w, [0, 1], heroes.length);
  heroes.forEach((p, i) => {
    freshCombatState(p);
    if (p.dead || p.hp <= 0) p.hp = Math.max(1, Math.round(p.maxHp * REVIVE_FRACTION));
    p.dead = false;
    p.reward = null;
    Object.assign(p, hs[i]);
    dealHand(w, p);
  });
  const C = w.board.cols;
  const fs = spawnHexes(w, [C - 1, C - 2, C - 3], door.foes.length);
  door.foes.forEach((f, i) => {
    const e = { id: nid(w, "f"), side: "foe", dead: false, queue: [...f.kit], kitList: [...f.kit], ...fs[i] };
    freshCombatState(e);
    applyBody(e, f.bodyKey);
    w.foes.push(e);
  });
  w.round = 0;
  w.fx.push({ k: "room", n: w.depth + 1 });
  startHeroTurn(w);
}

// Hand: HAND_SIZE visible slots that hold position; a played card's slot draws the next card, and
// the discard only recycles when the deck runs dry (KM exhaust-before-repeat rule).
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
// Board queries
const livingFoes = (w) => w.foes.filter((e) => !e.dead);
const livingHeroes = (w) => partyOf(w).filter((p) => !p.dead);
export function occupant(w, h) {
  for (const p of w.players.values()) if (p.picked && !p.waitNext && !p.dead && same(p, h)) return p;
  for (const e of w.foes) if (!e.dead && same(e, h)) return e;
  return null;
}
export const opponentsOf = (w, c) => (c.side === "hero" ? livingFoes(w) : livingHeroes(w));
export const friendsOf = (w, c) => (c.side === "hero" ? livingHeroes(w) : livingFoes(w));
const byDist = (from) => (a, b) => distance(a, from) - distance(b, from) || a.hp - b.hp;
// Movement field for an entity: it may pass through friends, never through opponents; it may only
// stop on an empty hex.
function moveField(w, c, maxSteps) {
  const blocked = new Set(opponentsOf(w, c).map(hk));
  const taken = new Set([...friendsOf(w, c)].filter((f) => f !== c).map(hk));
  return reachable(w.board, hexOf(c), maxSteps, (h) => !blocked.has(hk(h)), (h) => !blocked.has(hk(h)) && !taken.has(hk(h)));
}
export function findEntity(w, id) { return id ? (w.players.get(id) ?? w.foes.find((f) => f.id === id) ?? null) : null; }

// ---------------------------------------------------------------------------------------------
// Victims of an op. ctx.at = aimed hex; ctx.primary = the opponent standing there (single/line);
// ctx.zone = a stored {center, radius} (timers that captured a lane).
function victims(w, src, op, ctx) {
  const opp = opponentsOf(w, src);
  const t = op.target;
  const g = geometryOf(ctx.key);
  if (t === "storedTarget") return ctx.stored && !ctx.stored.dead ? [ctx.stored] : [];
  if (t === "storedLane") {
    const z = ctx.zone; if (!z) return [];
    return opp.filter((e) => distance(e, z.center) <= z.radius).sort(byDist(z.center));
  }
  const primary = ctx.primary && !ctx.primary.dead ? ctx.primary : null;
  if (t === "front" || t === "pick") return primary ? [primary] : [];
  if (t === "front2" || t === "front3") {
    if (!primary) return [];
    const n = t === "front2" ? 2 : 3;
    const ray = rayBeyond(hexOf(src), hexOf(primary), Math.max(1, g.radius));
    const behind = ray.map((h) => opp.find((e) => same(e, h))).filter(Boolean);
    return [primary, ...behind].slice(0, n);
  }
  if (t === "lane" || t === "selfLane") return opp.filter((e) => distance(e, src) <= g.radius).sort(byDist(src));
  if (t === "pickLane") {
    const at = ctx.at ?? (primary && hexOf(primary));
    return at ? opp.filter((e) => distance(e, at) <= g.radius).sort(byDist(at)) : [];
  }
  if (t === "random") {
    const pool = opp.filter((e) => distance(e, src) <= g.range);
    return pool.length ? [pickOne(w, pool)] : [];
  }
  return [];
}

// ---------------------------------------------------------------------------------------------
// Damage / heal / shield (symmetric for both sides)
const buffAmt = (c, kind) => c.buffs.reduce((s, b) => s + (b.kind === kind ? b.amount : 0), 0);
function dealDamage(w, src, tgt, amount, opts = {}) {
  if (!tgt || tgt.dead) return 0;
  let n = amount + buffAmt(tgt, "vulnerable") - (src ? buffAmt(src, "sap") : 0) - (opts.pierce ? 0 : buffAmt(tgt, "stoneskin"));
  n = Math.max(0, Math.round(n));
  let left = n, absorbed = 0;
  if (!opts.pierce) for (const s of tgt.temps) { const a = Math.min(s.amount, left); s.amount -= a; left -= a; absorbed += a; }
  tgt.temps = tgt.temps.filter((s) => s.amount > 0);
  const a = opts.pierce ? 0 : Math.min(tgt.shield, left); tgt.shield -= a; left -= a; absorbed += a;
  const hpBefore = tgt.hp;
  tgt.hp -= left;
  if (opts.out) opts.out.excess = Math.max(0, left - Math.max(0, hpBefore));
  w.fx.push({ k: "hit", id: tgt.id, n, abs: absorbed, src: src?.id ?? null, cause: opts.cause ?? null });
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
  c.dead = true; c.hp = 0;
  w.fx.push({ k: "die", id: c.id });
  if (c.side === "foe") w.defeated.push({ bodyKey: c.bodyKey, kit: c.kitList });
}
// Timed statuses last N full rounds from the moment they land (each side's turn start is one beat).
const untilBeat = (w, ticks) => w.beat + 2 * turnsFor(ticks);

// Modal bonus auto-pick: the kind most of the caster's cards use.
// FLAG: the card is a player CHOICE in KM; this heuristic stands in until a quick-pick UI exists.
function modalKind(c) {
  const keys = c.side === "hero" ? c.deckList : c.kitList;
  let m = 0, r = 0;
  for (const k of keys ?? []) { const t = triggerKind(k); if (t === "melee") m++; else if (t === "ranged") r++; }
  return r > m ? "ranged" : "melee";
}

// ---------------------------------------------------------------------------------------------
// The resolver: one code path for both sides.
function resolveOps(w, src, key, ops, ctx) {
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
            const base = op.ofShield ? src.shield : op.ofHp ? src.hp : (op.amount ?? 0);
            const n = base + bonusFor(op.bothKinds ? "both" : kind)
              + (op.pickExtra && v === primary ? op.pickExtra : 0) + (op.frontExtra && v === list[0] ? op.frontExtra : 0);
            const out = {};
            const dealt = dealDamage(w, src, v, n, { direct: !op.noReact, pierce: !!op.pierce, out });
            ctx.dealt += dealt; ctx.lastHits.push({ v, dealt });
            if (op.lifesteal) heal(w, src, dealt);
            if (op.shieldFromDealt) gainShield(w, src, dealt);
            if (op.overflow && v.dead && out.excess > 0) {   // excess spills into a foe next to it
              const spill = opponentsOf(w, src).filter((e) => distance(e, v) <= 1).sort(byDist(v))[0];
              if (spill) dealDamage(w, src, spill, out.excess, { cause: "Overflow" });
            }
          }
        }
        break;
      }
      case "shield": gainShield(w, src, (op.ofDealt ? ctx.dealt : (op.amount ?? 0)) + rangedPlus(op)); break;
      case "tempShield": {
        const n = op.ofDealt ? ctx.dealt : (op.amount ?? 0);
        if (n > 0) { src.temps.push({ amount: n, until: untilBeat(w, op.dur ?? 60) }); w.fx.push({ k: "shield", id: src.id, n }); }
        break;
      }
      case "healSelf": heal(w, src, (op.amount ?? 0) + rangedPlus(op)); break;
      case "healFull": heal(w, src, src.maxHp); break;
      case "healAlly": {
        const f = friendsOf(w, src).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0] ?? src;
        heal(w, f, (op.amount ?? 0) + rangedPlus(op));
        break;
      }
      case "healPath": {   // "heal allies in that lane" → friends within the around radius of the caster (FLAG)
        for (const f of friendsOf(w, src).filter((f) => distance(f, src) <= AROUND_RADIUS)) heal(w, f, ctx.dealt);
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
        src.buffs.push({ kind: op.buff, amount: op.amount ?? 1, until: untilBeat(w, op.dur ?? 60) });
        w.fx.push({ k: "buff", id: src.id, s: op.buff === "haste" ? "Haste" : "Stoneskin" });
        break;
      }
      case "sap": {
        if (op.ofLastHit) { for (const { v, dealt } of ctx.lastHits) if (dealt > 0) v.buffs.push({ kind: "sap", amount: dealt, until: untilBeat(w, op.dur ?? 60) }); break; }
        const amt = op.ofDealt ? ctx.dealt : (op.amount ?? 0) + rangedPlus(op);
        if (amt > 0) for (const v of victims(w, src, op, ctx)) v.buffs.push({ kind: "sap", amount: amt, until: untilBeat(w, op.dur ?? 60) });
        break;
      }
      case "vulnerable": {
        for (const v of victims(w, src, op, ctx)) v.buffs.push({ kind: "vulnerable", amount: (op.amount ?? 1) + rangedPlus(op), until: op.dur ? untilBeat(w, op.dur) : Infinity });
        break;
      }
      case "poison": {
        for (const v of victims(w, src, op, ctx)) { v.poison += (op.amount ?? 1) + rangedPlus(op); v.poisonSrc = src.id; }
        break;
      }
      case "leech": {
        const list = op.target ? victims(w, src, op, ctx) : ctx.lastHits.map((h) => h.v);
        for (const v of list) {
          const l = { src: src.id, amount: (op.amount ?? 1) + rangedPlus(op), period: turnsFor(op.period), clock: 0 };
          v.leeches.push(l);
          if (op.immediate) fireLeech(w, v, l);
        }
        break;
      }
      case "thorns": src.thorns += op.amount ?? 1; w.fx.push({ k: "buff", id: src.id, s: "Thorns" }); break;
      case "regen": {
        const r = { kind: op.kind, amount: op.amount ?? 1, period: turnsFor(op.period), clock: 0, modal: op.kind === "modalBonus" ? modalKind(src) : null };
        src.regens.push(r);
        if (op.immediate) fireRegen(w, src, r);
        break;
      }
      case "gainMoxie": src.moxie = Math.min(MOXIE_CAP, src.moxie + (op.amount ?? 1)); break;
      case "repositionPick": {   // Wind: "shove it" → knock the target straight away from the caster
        const v = ctx.lastHits.length ? ctx.lastHits[ctx.lastHits.length - 1].v : ctx.primary;
        if (v && !v.dead) shove(w, v, src, KNOCK_HEXES);
        break;
      }
      case "pullFront": {        // Taunt: drag the target to the front of YOUR lane → next to you
        for (const v of victims(w, src, op, ctx)) pullTo(w, v, src);
        break;
      }
      case "timer": {
        const t = {
          key, ops: op.ops, period: turnsFor(op.period), clock: 0,
          once: !!op.once, boost: op.boost ?? 0, ramp: op.ramp ?? 0,
          stored: op.captureTarget ? (ctx.primary ?? null) : null,
          zone: op.captureLane ? captureZone(w, src, op.captureLane, ctx) : null,
        };
        src.timers.push(t);
        if (op.immediate) fireTimer(w, src, t);
        break;
      }
      default: break;
    }
  }
}
function captureZone(w, src, mode, ctx) {
  const g = geometryOf(ctx.key);
  if (mode === "source") return { center: hexOf(src), radius: Math.max(AROUND_RADIUS, g.radius) };
  const at = ctx.at ?? (ctx.primary && hexOf(ctx.primary));
  return at ? { center: at, radius: Math.max(BLAST_RADIUS, g.radius) } : null;
}
function shove(w, v, from, n) {
  let dest = hexOf(v);
  for (const h of rayBeyond(hexOf(from), hexOf(v), n)) {
    if (!w.board.has(h) || occupant(w, h)) break;
    dest = h;
  }
  if (!same(dest, v)) { Object.assign(v, dest); w.fx.push({ k: "pushed", id: v.id, to: dest }); }
}
function pullTo(w, v, to) {
  if (distance(v, to) <= 1) return;
  const free = neighbors(hexOf(to)).filter((h) => w.board.has(h) && !occupant(w, h)).sort(byDist(v))[0];
  if (free) { Object.assign(v, free); w.fx.push({ k: "pushed", id: v.id, to: free }); }
}
function fireRegen(w, c, r) {
  if (r.kind === "heal") heal(w, c, r.amount);
  else if (r.kind === "shield") gainShield(w, c, r.amount);
  else if (r.kind === "moxie") c.moxie = Math.min(MOXIE_CAP, c.moxie + r.amount);
  else if (r.kind === "modalBonus") c[r.modal === "ranged" ? "rangedBonus" : "meleeBonus"] += r.amount;
}
function fireLeech(w, c, l) {
  const src = findEntity(w, l.src);
  const dealt = dealDamage(w, src, c, l.amount, { cause: "Leech" });
  if (src && !src.dead) heal(w, src, dealt);
}
// A repeating card effect re-aims each time it fires: its stored target / lane, else the best
// opponent in the card's range from where the caster stands now (FLAG: no target in range = fizzle).
function fireTimer(w, c, t) {
  const ops = t.boost ? t.ops.map((o) => (o.amount != null ? { ...o, amount: o.amount + t.boost } : o)) : t.ops;
  t.boost += t.ramp;
  let aim = null;
  if (!t.stored && !t.zone && firstFoeOp(t.ops)) aim = bestAimFrom(w, c, t.key, hexOf(c));
  resolveOps(w, c, t.key, ops, newCtx({ key: t.key, stored: t.stored, zone: t.zone, primary: t.stored ?? aim?.primary ?? null, at: aim?.at ?? null }));
}
const newCtx = (extra = {}) => ({ dealt: 0, lastHits: [], primary: null, at: null, stored: null, zone: null, key: null, ...extra });

// ---------------------------------------------------------------------------------------------
// Aiming (shared by players' validation and the foe brain)
// Can `c`, standing on `from`, aim card `key` at hex `at`? Returns {ok, primary, why}.
export function aimCheck(w, c, key, from, at) {
  const g = geometryOf(key);
  const opp = opponentsOf(w, c);
  if (g.shape === "self") return { ok: true, primary: null, at: from };
  if (g.shape === "around") {
    return opp.some((e) => distance(e, from) <= g.radius) ? { ok: true, primary: null, at: from } : { ok: false, why: "noneNear" };
  }
  if (g.shape === "random") {
    return opp.some((e) => distance(e, from) <= g.range) ? { ok: true, primary: null, at: from } : { ok: false, why: "range" };
  }
  if (!at || !w.board.has(at)) return { ok: false, why: "aim" };
  if (distance(from, at) > g.range) return { ok: false, why: "range" };
  const primary = opp.find((e) => same(e, at)) ?? null;
  if ((g.shape === "single" || g.shape === "line") && !primary) return { ok: false, why: "aim" };
  if (g.shape === "blast" && !opp.some((e) => distance(e, at) <= g.radius)) return { ok: false, why: "aim" };
  return { ok: true, primary, at };
}
// Best aim from a hex: the opponent hit most easily — lowest HP, then nearest (blast: most foes caught).
function bestAimFrom(w, c, key, from) {
  const g = geometryOf(key);
  if (g.shape === "self" || g.shape === "around" || g.shape === "random") {
    const chk = aimCheck(w, c, key, from, from);
    return chk.ok ? { at: from, primary: null } : null;
  }
  let best = null, bestScore = -Infinity;
  for (const e of opponentsOf(w, c)) {
    if (distance(from, e) > g.range) continue;
    const caught = g.shape === "blast" ? opponentsOf(w, c).filter((o) => distance(o, e) <= g.radius).length : 1;
    const score = caught * 1000 - e.hp * 10 - distance(from, e);
    if (score > bestScore) { bestScore = score; best = { at: hexOf(e), primary: e }; }
  }
  return best;
}

// ---------------------------------------------------------------------------------------------
// Turns. Players always go first; then every foe in the room acts.
function startSideTurn(w, side) {
  w.beat++;
  const all = [...partyOf(w), ...w.foes];
  for (const c of all) {   // statuses expire on the beat they were scheduled for
    c.buffs = c.buffs.filter((b) => b.until > w.beat);
    c.temps = c.temps.filter((s) => s.until > w.beat);
  }
  const mine = side === "hero" ? livingHeroes(w) : livingFoes(w);
  for (const c of mine) {
    const haste = c.buffs.some((b) => b.kind === "haste") ? 2 : 1;      // FLAG: Haste = double income
    c.moxie = Math.min(MOXIE_CAP, c.moxie + TURN_MOXIE * haste);
    c.steps = 0;
    c.ended = false;
  }
  // start-of-turn clocks: poison, leech, regen, repeating card effects
  for (const c of mine) {
    if (c.dead) continue;
    if (c.poison > 0) { dealDamage(w, findEntity(w, c.poisonSrc), c, c.poison, { cause: "Poison" }); if (c.dead) continue; }
    for (const l of c.leeches) if (++l.clock >= l.period) { l.clock = 0; fireLeech(w, c, l); if (c.dead) break; }
    if (c.dead) continue;
    for (const r of c.regens) if (++r.clock >= r.period) { r.clock = 0; fireRegen(w, c, r); }
    for (const t of [...c.timers]) {
      if (++t.clock < t.period) continue;
      t.clock = 0;
      if (t.once) c.timers.splice(c.timers.indexOf(t), 1);
      fireTimer(w, c, t);
      if (c.dead) break;
    }
  }
}
function startHeroTurn(w) {
  w.turn = "hero";
  w.round++;
  startSideTurn(w, "hero");
  w.fx.push({ k: "turn", side: "hero", round: w.round });
  checkFightEnd(w);
  if (w.phase === "fight") reconcile(w);   // a dropped/downed party may end the turn at once
}
function startFoeTurn(w) {
  w.turn = "foe";
  startSideTurn(w, "foe");
  w.fx.push({ k: "turn", side: "foe", round: w.round });
  w.foeOrder = livingFoes(w).map((e) => e.id);
  w.foeActions = 0;
  checkFightEnd(w);
}

// Player actions -------------------------------------------------------------------------------
export function moveCost(c, pathLen) {
  const need = Math.max(0, pathLen - c.steps);
  return Math.ceil(need / speedOf(c));
}
// The hexes a player can reach this turn with banked steps + current moxie: Map key → {hex, steps, cost}.
export function moveOptions(w, c) {
  const maxSteps = c.steps + c.moxie * speedOf(c);
  const field = moveField(w, c, maxSteps);
  const out = new Map();
  for (const [k, v] of field) if (v.steps > 0 && !v.passOnly) out.set(k, { hex: v.hex, steps: v.steps, cost: moveCost(c, v.steps) });
  return out;
}
const heroCanAct = (w, p) => w.phase === "fight" && w.turn === "hero" && p && !p.dead && !p.ended && !p.waitNext && p.picked;
export function moveHero(w, pid, to) {
  const p = w.players.get(pid);
  if (!heroCanAct(w, p)) return { ok: false, why: "turn" };
  if (!to || !Number.isFinite(to.q) || !Number.isFinite(to.r)) return { ok: false, why: "aim" };
  const field = moveField(w, p, p.steps + p.moxie * speedOf(p));
  const v = field.get(hk(to));
  if (!v || v.steps === 0 || v.passOnly) return { ok: false, why: "reach" };
  const cost = moveCost(p, v.steps);
  if (cost > p.moxie) return { ok: false, why: "moxie" };
  applyMove(w, p, field, to, v.steps, cost);
  return { ok: true };
}
function applyMove(w, c, field, to, steps, cost) {
  const path = pathTo(field, to);
  c.moxie -= cost;
  c.steps = c.steps + cost * speedOf(c) - steps;
  Object.assign(c, { q: to.q, r: to.r });
  w.fx.push({ k: "move", id: c.id, path });
}
export const cardCostOf = (key) => KIT[key]?.cost ?? 1;
export function canPlay(w, p, slot, at) {
  if (!heroCanAct(w, p)) return { ok: false, why: "turn" };
  const card = p.hand[slot];
  if (!card) return { ok: false, why: "empty" };
  if (p.moxie < cardCostOf(card.key)) return { ok: false, why: "moxie" };
  return aimCheck(w, p, card.key, hexOf(p), at);
}
export function playCard(w, pid, slot, at = null) {
  const p = w.players.get(pid); if (!p) return { ok: false, why: "nobody" };
  const check = canPlay(w, p, slot, at);
  if (!check.ok) return check;
  const card = p.hand[slot];
  p.moxie -= cardCostOf(card.key);
  castFx(w, p, card.key, check);
  resolveOps(w, p, card.key, KIT[card.key].ops, newCtx({ key: card.key, primary: check.primary, at: check.at }));
  p.disc.push(card);
  drawInto(w, p, slot);
  checkFightEnd(w);
  return { ok: true };
}
function castFx(w, c, key, aim) {
  const g = geometryOf(key);
  w.fx.push({ k: "cast", src: c.id, key, at: aim.at ?? hexOf(c), to: aim.primary?.id ?? null, shape: g.shape, radius: g.radius });
}
export function endTurn(w, pid) {
  const p = w.players.get(pid);
  if (!p || w.phase !== "fight" || w.turn !== "hero" || p.ended) return false;
  p.ended = true;
  reconcile(w);
  return true;
}

// Foe brain ------------------------------------------------------------------------------------
// Each foe works through its visible queue: the FRONT card is what floats over its head. It finds
// the hero it can hit MOST EASILY (fewest moxie to get in range + cast; ties → lowest HP, nearest),
// walks there and casts, rotating that card to the back. If it cannot afford move + card this turn
// it still closes in, but only as far as keeps the cast affordable next turn (it banks the rest).
export function planFoe(w, e) {
  const key = e.queue[0];
  if (!key) return { act: "end" };
  const cost = cardCostOf(key);
  const g = geometryOf(key);
  if (g.shape === "self") return e.moxie >= cost ? { act: "cast", key, aim: { at: hexOf(e), primary: null } } : { act: "end" };
  const speed = speedOf(e);
  const field = moveField(w, e, 60);
  // cheapest (hex, aim) over every reachable stand-hex
  let best = null;
  for (const [, v] of field) {
    if (v.passOnly) continue;
    const aim = bestAimFrom(w, e, key, v.hex);
    if (!aim) continue;
    const mv = moveCost(e, v.steps);
    const total = mv + cost;
    const tgt = aim.primary;
    const score = [total, tgt ? tgt.hp : 0, v.steps];
    if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && (score[1] < best.score[1] || (score[1] === best.score[1] && score[2] < best.score[2]))))
      best = { score, hex: v.hex, steps: v.steps, mv, aim };
  }
  if (!best) {
    // nobody reachable at all (walled in): step toward the nearest hero, if any steps are free/paid
    return { act: "end" };
  }
  if (best.steps === 0) return e.moxie >= cost ? { act: "cast", key, aim: best.aim } : { act: "end" };
  if (e.moxie >= best.mv + cost) return { act: "move", to: best.hex, steps: best.steps, cost: best.mv, field };
  // Can't do both this turn. Spend x moxie walking now, choosing the most x that still lets the cast
  // happen next turn; if the plan can never fit one turn, just close the distance.
  const pathSteps = pathTo(field, best.hex);
  const maxX = Math.min(e.moxie, best.mv);
  let x = 0;
  const fitsLater = best.mv + cost <= MOXIE_CAP;
  for (let cand = maxX; cand >= 0; cand--) {
    const nextMoxie = Math.min(MOXIE_CAP, e.moxie - cand + TURN_MOXIE);
    const nextNeed = Math.max(0, best.mv - cand) + cost;
    if (!fitsLater || nextMoxie >= nextNeed) { x = cand; break; }
  }
  const allowance = e.steps + x * speed;
  if (allowance <= 0) return { act: "end" };
  // walk the path as far as allowed, stopping on the last hex we may stand on
  let stop = null, stopSteps = 0;
  for (let i = 1; i < pathSteps.length && i <= allowance; i++) {
    const h = pathSteps[i];
    const v = field.get(hk(h));
    if (v && !v.passOnly) { stop = h; stopSteps = i; }
  }
  if (!stop) return { act: "end" };
  return { act: "move", to: stop, steps: stopSteps, cost: moveCost(e, stopSteps), field };
}
// Run ONE foe action (a move or a cast). Returns true while the foe turn has more to do.
export function foeStep(w) {
  if (w.phase !== "fight" || w.turn !== "foe") return false;
  while (w.foeOrder.length) {
    const e = findEntity(w, w.foeOrder[0]);
    if (!e || e.dead || w.foeActions >= FOE_ACTION_CAP) { w.foeOrder.shift(); w.foeActions = 0; continue; }
    const plan = planFoe(w, e);
    if (plan.act === "end") { e.ended = true; w.foeOrder.shift(); w.foeActions = 0; continue; }
    w.foeActions++;
    if (plan.act === "move") {
      applyMove(w, e, plan.field, plan.to, plan.steps, plan.cost);
    } else {
      e.moxie -= cardCostOf(plan.key);
      castFx(w, e, plan.key, plan.aim);
      resolveOps(w, e, plan.key, KIT[plan.key].ops, newCtx({ key: plan.key, primary: plan.aim.primary, at: plan.aim.at }));
      e.queue.push(e.queue.shift());
      checkFightEnd(w);
    }
    return true;
  }
  // every foe is done: back to the players
  if (w.phase === "fight") startHeroTurn(w);
  return false;
}
// Tests / tools: run the entire foe turn synchronously.
export function runFoeTurn(w) { let guard = 500; while (foeStep(w) && guard-- > 0); }

// ---------------------------------------------------------------------------------------------
function checkFightEnd(w) {
  if (w.phase !== "fight") return;
  if (w.foes.every((f) => f.dead)) return clearRoom(w);
  const heroes = partyOf(w);
  if (heroes.length && heroes.every((p) => p.dead)) {
    w.phase = "over"; w.turn = null;
    w.fx.push({ k: "over", depth: w.depth });
  }
}
function clearRoom(w) {
  w.depth++;
  w.phase = "reward"; w.turn = null;
  const lootPool = [...new Set(w.defeated.flatMap((d) => d.kit))].filter((k) => PORTED_SET.has(k));
  const bodies = [...new Set(w.defeated.map((d) => d.bodyKey))];
  for (const p of w.players.values()) {
    if (!p.picked || p.waitNext) continue;
    if (p.dead) { p.dead = false; p.hp = Math.max(1, Math.round(p.maxHp * REVIVE_FRACTION)); }
    if (HEAL_BETWEEN_ROOMS) p.hp = p.maxHp;
    p.roomsCleared = w.depth;
    // THE MIMIC: wear a body you just felled (wounds carry), and take one card they carried.
    p.reward = { cards: shuffleW(w, [...lootPool]).slice(0, LOOT_CHOICES), bodies: bodies.slice(0, 3), card: null, body: null, done: false };
    p.timers = []; p.regens = []; p.leeches = [];
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
    reconcile(w);
  } else return false;
  return true;
}
export function restartRun(w) {
  w.depth = 0; w.foes = []; w.doors = []; w.votes.clear(); w.usedOffers.clear(); w.phase = "draft"; w.turn = null;
  for (const p of w.players.values()) {
    freshCombatState(p); p.dead = false; p.picked = false; p.waitNext = false; p.reward = null; p.deckList = [];
    applyBody(p, STARTER_BODY); p.offers = rollOffers(w);
  }
}

// Phase gates. Also runs when someone LEFT (disconnect) rather than acted.
export function reconcile(w) {
  const act = activePlayers(w);
  if (w.phase === "draft") {
    const here = [...w.players.values()].filter((p) => p.connected);
    if (here.length && here.every((p) => p.picked)) openDoors(w);
  } else if (w.phase === "doors") {
    if (act.length && act.every((q) => w.votes.has(q.id))) enterRoom(w, w.doors[tallyDoors(w)]);
  } else if (w.phase === "fight" && w.turn === "hero") {
    // the foes go once every connected, standing hero has ended their turn
    const standing = act.filter((p) => !p.dead);
    // (nobody connected and standing = the room waits for someone to come back)
    if (standing.length && standing.every((p) => p.ended)) startFoeTurn(w);
  } else if (w.phase === "reward") {
    if (act.length && act.every(rewardSettled)) openDoors(w);
  }
}

// ---------------------------------------------------------------------------------------------
// Snapshot for the wire (per viewer). Everything a player can inspect about a foe is public.
function statusList(w, c) {
  const left = (b) => (Number.isFinite(b.until) ? Math.max(1, Math.ceil((b.until - w.beat) / 2)) : null);
  const out = [];
  const sum = (kind) => c.buffs.filter((b) => b.kind === kind);
  const push = (label, list, tip) => { if (list.length) out.push({ label: `${label} ${list.reduce((s, b) => s + b.amount, 0)}`, turns: Math.max(...list.map((b) => left(b) ?? 0)) || null, tip }); };
  push("Weak", sum("sap"), "Deals this much less damage");
  push("Hexed", sum("vulnerable"), "Takes this much more damage");
  push("Stoneskin", sum("stoneskin"), "Takes this much less damage");
  if (sum("haste").length) out.push({ label: "Haste", turns: Math.max(...sum("haste").map((b) => left(b) ?? 0)) || null, tip: "Double moxie each turn" });
  if (c.poison) out.push({ label: `Poison ${c.poison}`, turns: null, tip: "Takes this much damage at the start of its turn" });
  if (c.thorns) out.push({ label: `Thorns ${c.thorns}`, turns: null, tip: "Attackers take this much damage back" });
  for (const l of c.leeches) out.push({ label: `Leeched ${l.amount}`, turns: null, tip: `Loses ${l.amount} HP to ${findEntity(w, l.src)?.bodyKey ? (BODIES[findEntity(w, l.src).bodyKey]?.name ?? "a foe") : "a foe"} every ${l.period} turn(s)` });
  for (const r of c.regens) out.push({ label: `Regen ${r.kind === "heal" ? "HP" : r.kind === "shield" ? "shield" : r.kind === "moxie" ? "moxie" : r.modal ?? "bonus"} +${r.amount}`, turns: null, tip: `Every ${r.period} turn(s)` });
  for (const t of c.timers) out.push({ label: `${KIT[t.key]?.name ?? "Effect"} repeats`, turns: null, tip: `Every ${t.period} turn(s)${t.once ? ", once" : ""}` });
  return out;
}
function entSnap(w, c) {
  const s = {
    id: c.id, side: c.side, body: c.bodyKey, q: c.q, r: c.r,
    hp: Math.max(0, c.hp), mhp: c.maxHp, sh: c.shield + c.temps.reduce((t, x) => t + x.amount, 0),
    mx: c.moxie, steps: c.steps, speed: speedOf(c), dead: !!c.dead, ended: !!c.ended,
    bonus: { melee: c.meleeBonus, ranged: c.rangedBonus, all: c.counters },
    status: statusList(w, c),
  };
  if (c.side === "foe") {
    s.next = c.queue[0] ?? null;
    s.queue = [...c.queue];
  } else {
    s.name = c.name;
  }
  return s;
}
export function snapshot(w, viewerId) {
  const me = w.players.get(viewerId);
  const out = {
    t: "state", phase: w.phase, turn: w.turn, round: w.round, depth: w.depth,
    heroes: partyOf(w).map((p) => entSnap(w, p)),
    foes: w.phase === "fight" ? w.foes.filter((f) => !f.dead).map((f) => entSnap(w, f)) : [],
    acting: w.turn === "foe" ? (w.foeOrder[0] ?? null) : null,
    fx: w.fx,
  };
  if (me) {
    out.you = {
      id: me.id, picked: me.picked, body: me.bodyKey, hp: me.hp, mhp: me.maxHp, moxie: me.moxie, steps: me.steps,
      speed: speedOf(me), q: me.q, r: me.r, dead: me.dead, ended: me.ended, waitNext: !!me.waitNext,
      hand: me.hand.map((c) => (c ? { id: c.id, key: c.key } : null)),
      deck: me.deck.length, disc: me.disc.length, deckList: me.deckList,
    };
    if (!me.picked) out.offers = me.offers;
    if (w.phase === "reward") out.reward = me.reward;
  }
  if (w.phase === "doors") { out.doors = w.doors; out.votes = Object.fromEntries(w.votes); }
  if (w.phase === "draft") out.waiting = [...w.players.values()].filter((p) => p.connected && !p.picked).map((p) => p.name);
  if (w.phase === "fight" && w.turn === "hero") out.waitingOn = activePlayers(w).filter((p) => !p.dead && !p.ended).map((p) => p.id);
  return out;
}
export const flushFx = (w) => { w.fx = []; };

// Static catalog the client needs once (display names + text, never internal keys on screen).
export function catalog() {
  const cards = {};
  for (const k of PORTED_PLAYER_CARDS) {
    const it = KIT[k];
    cards[k] = { name: it.name, cost: it.cost ?? 1, color: it.color ?? "#ccc", text: it.text ?? "",
      kind: triggerKind(k), weight: it.weightTag ?? null, ...geometryOf(k) };
  }
  const bodies = {};
  for (const k of [STARTER_BODY, ...COMMON_SET, ...ELITE_SET]) {
    const b = BODIES[k]; if (!b) continue;
    bodies[k] = { name: b.name, color: b.color ?? "#9ad", hp: bodyMaxHp(b), elite: !!b.elite, speed: BODY_SPEED[k] ?? DEFAULT_SPEED,
      passive: b.passiveText ?? "" };
  }
  return { cards, bodies, board: { cols: BOARD_COLS, rows: BOARD_ROWS }, turnMoxie: TURN_MOXIE, moxieCap: MOXIE_CAP };
}
