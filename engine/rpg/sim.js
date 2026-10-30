// King Mimic — RPG CRAWLER simulation (forked from FLICK). Pure, seedable, no DOM: the page runs it for
// solo play, the server runs the very same code for co-op rooms, and the tests run it headless. Every rule
// reads engine/rpg/content.js (the owner's editable table).
//
// The loadout (owner, 10/29): a BODY is one passive; everything else is a card — a main WEAPON (its swing
// speed + pushback), DECK cards (one per deck slot, slots = level) that set health, speed, size, damage,
// armor, shields…, and MINOR ACTIONS on cooldowns. Foes are built exactly the same way.
//
// The honesty rule from FLICK stands: `shapeOf` is the ONE geometry for both the reticle the client draws
// and the hit the card resolves; `dmgAgainst` / `pushOf` are the ONE numbers for the preview labels and
// the real hit.
//
// Floors are mystery-dungeon style: rooms + halls, foes asleep until someone comes close, loot on the
// floor and from the fallen, stairs down; the last floor's boss room seals like FLICK's rooms did.
// Co-op (up to 4): every input is keyed by pid; down-not-out revives; party XP is shared.

import { CARDS, BODIES, UNITS, FOES, FLOORS, TUNING as T, BOSS_ADDS, PLAYER_COLORS } from "./content.js";
import { makeFloor, roomAt } from "./floor.js";

export const DT = 1 / 60;

export function rngFrom(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (rng, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (rng, a) => a[Math.floor(rng() * a.length)];

// ------------------------------------------------------------------------------------------------
// creation
// ------------------------------------------------------------------------------------------------
export function createRun({ seed = Date.now() % 2147483647, players = [] }) {
  const S = {
    seed, rng: rngFrom(seed), t: 0, phase: "play", floorN: -1, nextId: 1, colorsUsed: 0, level: 1, xp: 0,
    ents: [], projs: [], zones: [], items: [], fx: [],
    stats: { attacks: 0, dealt: 0, taken: 0, felled: 0, revives: 0, floors: 0 },
  };
  loadFloor(S, 0);
  for (const p of players) joinRun(S, p);
  reveal(S);
  return S;
}

// build floor n: rooms, sleeping foes, loot, the stairs (or the boss den)
function loadFloor(S, n) {
  const F = FLOORS[n];
  S.floorN = n;
  S.floor = makeFloor(S.rng, { fights: F.fights, last: F.boss ? "boss" : "stairs" });
  S.locked = new Set(); S.seen = new Uint8Array(S.floor.w * S.floor.h);
  S.projs = []; S.zones = []; S.items = [];
  S.ents = S.ents.filter((e) => e.kind === "player");
  S.rooms = S.floor.rooms.map((r) => ({ id: r.id, kind: r.kind, status: r.kind === "start" ? "clear" : "idle", foes: [], awake: false }));
  const last = S.floor.rooms[S.floor.rooms.length - 1];
  S.stairs = F.boss ? null : { x: last.cx, y: last.cy };
  for (const r of S.floor.rooms) {
    const rs = S.rooms[r.id];
    if (r.kind === "fight" || r.kind === "stairs") {
      rs.pack = pick(S.rng, F.packs); rs.extra = F.extra; rs.level = F.level;
      for (const k of rs.pack) spawnFoe(S, r, k, F.level);
    } else if (r.kind === "boss") {
      rs.level = F.bossLevel; rs.pack = []; rs.extra = [];
      spawnFoe(S, r, F.boss, F.bossLevel);
    }
  }
  // loot lies in random fight rooms
  const fights = S.floor.rooms.filter((r) => r.kind === "fight" || r.kind === "stairs");
  const pool = Object.keys(CARDS).filter((k) => k !== "bite");
  for (let i = 0; i < (F.loot ?? 0) && fights.length; i++) {
    const r = pick(S.rng, fights);
    dropItem(S, "card", pick(S.rng, pool), r.x + 1 + S.rng() * (r.w - 2), r.y + 1 + S.rng() * (r.h - 2));
  }
}

const players = (S) => S.ents.filter((e) => e.kind === "player");
// who counts as "in the party": connected players, standing or down
export const partySize = (S) => Math.max(1, players(S).filter((p) => !p.away).length);

// Add a player (at the start, or mid-run beside a standing friend). `weapon`, `actions`, `deck` are card
// keys (validated by the caller). Returns the player entity.
export function joinRun(S, { id, body, weapon, actions = [], deck = [], name }) {
  const had = playerOf(S, id);
  if (had) { had.away = false; return had; }
  if (players(S).length >= T.maxPlayers) return null;
  const anchor = players(S).find((p) => !p.dead && !p.away);
  const st = anchor ?? S.floor.start;
  const a = S.rng() * Math.PI * 2;
  // `pid` is the phone's private seat id (never shown to other phones); `pub` is what everyone else sees
  const e = baseEnt(S, { side: "hero", kind: "player", pid: id, pub: `p${S.nextId}`, name: name || `Player ${S.colorsUsed + 1}`, level: S.level,
    color: PLAYER_COLORS[S.colorsUsed++ % PLAYER_COLORS.length], x: st.x + Math.cos(a) * 0.9, y: st.y + Math.sin(a) * 0.9 });
  e.body = body; e.weapon = weapon;
  e.actions = actions.slice(0, T.actionSlots); e.cds = e.actions.map(() => 0);
  e.deck = deck.slice(0, e.level); e.bag = deck.slice(e.level);
  recalc(e, false);
  e.hp = e.maxHp;
  S.ents.push(e);
  resolveWalls(S, e);
  const rs = anchor && roomStatusAt(S, anchor.x, anchor.y);
  if (rs && S.locked.size && rs.kind === "boss") keepInside(e, S.floor.rooms[rs.id]);
  fx(S, { type: "join", id: e.id, x: e.x, y: e.y });
  return e;
}
// a disconnected player stands aside (untargetable, doesn't count for the party) until they return
export function setAway(S, pid, away) {
  const e = playerOf(S, pid); if (!e) return;
  e.away = !!away; e.mx = e.my = 0; if (away) e.cast = null;
  checkLost(S);
}
export function removePlayer(S, pid) {
  const e = playerOf(S, pid); if (!e) return;
  S.ents = S.ents.filter((o) => o !== e && !(o.kind === "unit" && o.owner === e.id));
  checkLost(S);
}

function spawnFoe(S, fr, foeKey, level, avoid = []) {
  const F = FOES[foeKey];
  const doorPts = fr.doors.map((k) => [k % S.floor.w + 0.5, Math.floor(k / S.floor.w) + 0.5]);
  let x = fr.cx, y = fr.cy;
  for (let tries = 0; tries < 80; tries++) {
    const px = fr.x + 1.2 + S.rng() * (fr.w - 2.4), py = fr.y + 1.2 + S.rng() * (fr.h - 2.4);
    const nearDoor = doorPts.some(([dx, dy]) => Math.hypot(px - dx, py - dy) < 4);
    const crowd = S.ents.some((o) => o.room === fr.id && !o.dead && Math.hypot(o.x - px, o.y - py) < 1.4);
    const close = avoid.some((o) => Math.hypot(o.x - px, o.y - py) < 4);
    const stairs = S.stairs && Math.hypot(S.stairs.x - px, S.stairs.y - py) < 1.5;
    if (!nearDoor && !crowd && !close && !stairs) { x = px; y = py; break; }
  }
  if (F.boss) { x = fr.cx + fr.w * 0.2; y = fr.cy; }
  const e = baseEnt(S, { side: "foe", kind: "foe", x, y, level, foe: foeKey });
  e.room = fr.id; e.awake = false;
  e.body = F.body; e.weapon = F.weapon;
  e.deck = F.deck.slice(0, level);                     // deck slots = level, same rule as players
  e.actions = F.actions.slice(); e.cds = e.actions.map(() => 0);
  e.hpMul = F.hpMul ?? 1;
  recalc(e, false); e.hp = e.maxHp;
  e.rest = 0.6 + S.rng() * 1.2; e.strafe = S.rng() < 0.5 ? 1 : -1; e.strafeT = 0; e.tgtId = null; e.tgtT = 0;
  S.rooms[fr.id].foes.push(e.id);
  S.ents.push(e);
  return e;
}

function baseEnt(S, o) {
  return { id: S.nextId++, hp: 1, maxHp: 1, level: 1, shield: 0, speed: T.speed, r: T.radius, mods: {},
    mx: 0, my: 0, fx: 1, fy: 0, cast: null, dash: null, kb: null, slowUntil: 0, slowPct: 0, stunUntil: 0, iframeUntil: 0,
    recoverUntil: 0, dots: [], dead: false, weapon: null, deck: [], actions: [], cds: [], bag: [], fought: [],
    ratCd: 0, angelT: 0, rage: 0, rageAcc: 0, interest: 0, attacks: 0, goreAcc: 0, vampAcc: 0, mouseUntil: 0, firstHit: false,
    forceSeq: 0, ...o };
}

// ------------------------------------------------------------------------------------------------
// the loadout → stats. Everyone starts from the same base; deck cards change it (owner: bodies are a
// passive, everything else is a card).
// ------------------------------------------------------------------------------------------------
export function sumMods(cards) {
  const m = {};
  for (const k of cards) for (const [n, v] of Object.entries(CARDS[k]?.mods ?? {})) m[n] = (m[n] ?? 0) + v;
  return m;
}
export function statsFor(e) {
  const m = sumMods(e.deck), foe = e.kind === "foe";
  const base = T.baseHp + Math.max(0, (e.level ?? 1) - 1) * T.hpPerLevel + (m.hp ?? 0);
  return {
    mods: m,
    maxHp: Math.max(1, Math.round(base * (foe ? T.foeHpMul * (e.hpMul ?? 1) : 1))),
    speed: T.speed * Math.max(0.3, 1 + (m.speed ?? 0)) * (foe ? T.foeSpeedMul : 1),
    r: T.radius * Math.max(0.5, 1 + (m.size ?? 0)),
  };
}
// re-derive stats after a loadout / level change; wounds carry over (you keep the damage you've taken).
// A loadout change never downs you: wounds deeper than the new max health wait in `woundDebt` and come
// back if the max goes up again — so swapping cards in and out can never heal you.
export function recalc(e, keepWounds = true) {
  const st = statsFor(e), wounds = keepWounds ? Math.max(0, e.maxHp - e.hp) + (e.woundDebt ?? 0) : 0;
  e.mods = st.mods; e.maxHp = st.maxHp; e.speed = st.speed; e.r = st.r;
  e.woundDebt = 0;
  if (keepWounds && !e.dead) { e.hp = Math.max(1, e.maxHp - wounds); e.woundDebt = Math.max(0, wounds - (e.maxHp - 1)); }
  e.hp = Math.min(e.hp, e.maxHp);
  e.shield = Math.min(e.shield, shieldCap(e));
}
const shieldCap = (e) => Math.max(1, Math.round(e.maxHp * T.shieldCapMul));
export const passiveOf = (e) => BODIES[e.body]?.passive ?? null;

// party XP: every felled foe gives its level; the whole party levels together. Each level = one more
// deck slot (owner's rule) and a little innate health (FLAG).
export function xpToNext(S) { return T.levelXp[S.level] ?? Infinity; }
function gainXp(S, n) {
  S.xp += n;
  while (S.level < T.maxLevel && S.xp >= (T.levelXp[S.level] ?? Infinity)) {
    S.level++;
    for (const p of players(S)) {
      p.level = S.level; recalc(p, true);         // wounds carry, so the new health arrives on top
      fx(S, { type: "level", id: p.id, x: p.x, y: p.y, level: p.level });
    }
  }
}

// ------------------------------------------------------------------------------------------------
// card values — the same numbers drive the preview labels and the real hit
// ------------------------------------------------------------------------------------------------
// slot 0 = the weapon, slots 1.. = the actions
export const slotKey = (e, slot) => (slot === 0 ? e.weapon : e.actions?.[slot - 1]) ?? null;
const hasteFor = (e, tag) => (passiveOf(e) === "spellHaste" && tag === "spell") || (passiveOf(e) === "meleeHaste" && tag === "melee") ? 1 - T.haste : 1;
export function windupOf(e, key) {
  const c = CARDS[key];
  let w = c.windup * hasteFor(e, c.tag);
  if (c.type === "weapon") w *= Math.max(0.3, 1 - (e.mods?.swing ?? 0));
  if (e.kind === "foe") w = w * T.foeWindupMul + T.foeWindupAdd;
  return Math.max(0.06, w);
}
export function cooldownOf(e, key) {
  const c = CARDS[key];
  return (c.cooldown ?? 0) * hasteFor(e, c.tag) * Math.max(0.3, 1 - (e.mods?.cooldown ?? 0));
}
export const cdLeft = (S, e, slot) => (slot > 0 ? Math.max(0, (e.cds?.[slot - 1] ?? 0) - S.t) : 0);
const reachMul = (e, key) => (CARDS[key].type === "weapon" ? 1 + (e.mods?.reach ?? 0) : 1);
// the attacker's side of the damage: card × (tag bonus) + flat passive bonuses
export function dmgOf(S, e, key) {
  const c = CARDS[key]; if (!c.dmg) return 0;
  const m = e.mods ?? {};
  const mul = 1 + (m[`${c.tag}Dmg`] ?? 0) + (m.allDmg ?? 0);
  const flat = (e.rage ?? 0) + (e.interest ?? 0) + (S.t < (e.mouseUntil ?? 0) ? T.mouseRage : 0);
  return Math.max(1, Math.round(c.dmg * mul) + flat);
}
// the defender's side: armor, resists, and a shield held up toward the hit (sword and shield)
export function dmgAgainst(S, src, o, amt, tag, fromX, fromY) {
  if (amt <= 0) return 0;
  const m = o.mods ?? {};
  let a = amt;
  if (tag) a = Math.max(1, a - (m.armor ?? 0));
  if (tag) a *= 1 - Math.min(0.9, m[`${tag}Resist`] ?? 0);
  const blk = CARDS[o.weapon]?.block;
  if (blk && !o.cast && !o.dead && fromX != null) {
    const dx = fromX - o.x, dy = fromY - o.y, d = Math.hypot(dx, dy);
    if (d > 1e-6 && (dx * o.fx + dy * o.fy) / d > 0.5) a *= 1 - blk;      // within 60° of where you face
  }
  return Math.max(1, Math.round(a));
}
export function pushOf(e, key) { return (CARDS[key]?.push ?? 0) * (1 + (e.mods?.push ?? 0)); }
// how far a shove actually moves `o` (bigger = heavier; poise resists)
export function shoveDist(o, dist) {
  const mass = Math.max(0.6, Math.min(3, (o.r / T.radius) ** 2));
  return (dist * (1 - Math.min(0.95, o.mods?.poise ?? 0))) / mass * (BODIES[o.body]?.boss ? 0.5 : 1);
}

// ------------------------------------------------------------------------------------------------
// geometry
// ------------------------------------------------------------------------------------------------
export function solidAt(S, tx, ty) {
  const f = S.floor;
  if (tx < 0 || ty < 0 || tx >= f.w || ty >= f.h) return true;
  const k = ty * f.w + tx;
  return f.tiles[k] === 0 || S.locked.has(k);
}
export function rayToWall(S, x, y, dx, dy, max, pad = 0) {
  const step = 0.05;
  for (let d = 0; d <= max; d += step) {
    if (solidAt(S, Math.floor(x + dx * (d + pad)), Math.floor(y + dy * (d + pad)))) return Math.max(0, d - step);
  }
  return max;
}
function norm(dx, dy, fx = 1, fy = 0) {
  const d = Math.hypot(dx, dy); if (d > 1e-6) return [dx / d, dy / d];
  const f = Math.hypot(fx, fy); return f > 1e-6 ? [fx / f, fy / f] : [1, 0];
}

// The reticle. aim = {dx, dy, dist}. Returns world geometry {kind:"arc"|"line"|"circle", ...}.
export function shapeOf(S, e, key, aim, origin = e) {
  const c = CARDS[key], sh = c.shape, k = reachMul(e, key);
  const [dx, dy] = norm(aim?.dx ?? 0, aim?.dy ?? 0, e.fx, e.fy);
  const x = origin.x, y = origin.y;
  switch (sh.kind) {
    case "arc": return { kind: "arc", x, y, r: sh.r * k + e.r * 0.5, a: Math.atan2(dy, dx), half: (sh.deg * Math.PI) / 360, dx, dy };
    case "line": return { kind: "line", x, y, dx, dy, w: sh.w, len: rayToWall(S, x, y, dx, dy, sh.len * k) };
    case "shot": return { kind: "line", shot: true, pierce: !!sh.pierce, homing: sh.homing ?? 0, x, y, dx, dy, w: sh.w, len: rayToWall(S, x, y, dx, dy, sh.range * k) };
    case "dash": { const len = rayToWall(S, x, y, dx, dy, sh.len, e.r); return { kind: "line", dash: true, x, y, dx, dy, w: sh.w, len }; }
    case "self": return { kind: "circle", self: true, x, y, r: sh.r, dx, dy };
    case "circle": {
      const range = sh.range * k;
      const want = Math.max(0, Math.min(range, aim?.dist ?? range));
      const d = Math.min(want, rayToWall(S, x, y, dx, dy, want, 0.2));
      return { kind: "circle", x: x + dx * d, y: y + dy * d, r: sh.r, dx, dy, placed: true, range };
    }
  }
  return null;
}

export function overlaps(shape, o) {
  if (shape.kind === "circle") return Math.hypot(o.x - shape.x, o.y - shape.y) <= shape.r + o.r;
  if (shape.kind === "line") {
    const rx = o.x - shape.x, ry = o.y - shape.y;
    const t = rx * shape.dx + ry * shape.dy, p = Math.abs(rx * -shape.dy + ry * shape.dx);
    return t >= -o.r && t <= shape.len + o.r && p <= shape.w / 2 + o.r;
  }
  if (shape.kind === "arc") {
    const rx = o.x - shape.x, ry = o.y - shape.y, d = Math.hypot(rx, ry);
    if (d > shape.r + o.r) return false;
    if (d <= o.r) return true;
    let da = Math.abs(Math.atan2(ry, rx) - shape.a); if (da > Math.PI) da = 2 * Math.PI - da;
    return da <= shape.half + Math.asin(Math.min(1, o.r / d));
  }
  return false;
}
const hostile = (a, b) => a.side !== b.side;
// out of the fight: the fallen, the downed, the disconnected, and foes still asleep
export const inPlay = (S, o) => !o.dead && !o.away && (o.kind !== "foe" || o.awake);

// What a shape hits: enemies (and, for heals, allies). Shots hit only the FIRST enemy unless they pierce.
export function hitsOf(S, e, shape) {
  const foes = S.ents.filter((o) => inPlay(S, o) && hostile(e, o) && overlaps(shape, o));
  if (shape.shot && !shape.pierce && foes.length > 1) {
    foes.sort((a, b) => ((a.x - shape.x) * shape.dx + (a.y - shape.y) * shape.dy) - ((b.x - shape.x) * shape.dx + (b.y - shape.y) * shape.dy));
    return { foes: foes.slice(0, 1), allies: [] };
  }
  const allies = S.ents.filter((o) => !o.dead && !o.away && !hostile(e, o) && overlaps(shape, o));
  return { foes, allies };
}
// which way a hit shoves its target: thrusts and shots push along their line; swings, blasts and
// rings push outward from their centre
export function pushDir(shape, o) {
  if (shape.kind === "line") return [shape.dx, shape.dy];
  const [dx, dy] = norm(o.x - shape.x, o.y - shape.y, shape.dx ?? 1, shape.dy ?? 0);
  return [dx, dy];
}

// ------------------------------------------------------------------------------------------------
// inputs
// ------------------------------------------------------------------------------------------------
export const playerOf = (S, pid) => S.ents.find((e) => e.kind === "player" && e.pid === pid);

export function setMove(S, pid, vx, vy) {
  const e = playerOf(S, pid); if (!e) return;
  const m = Math.hypot(vx, vy);
  e.mx = m > 1 ? vx / m : vx; e.my = m > 1 ? vy / m : vy;
  if (m > 0.2 && !e.cast) { e.fx = vx / m; e.fy = vy / m; }
}

// Co-op: the phone moves its own mimic and reports where it is. The server accepts it within what that
// body could have walked, through no walls; anything else snaps the phone back (forceSeq).
export function netMove(S, pid, m) {
  const e = playerOf(S, pid);
  if (!e || e.dead || e.away || typeof m?.x !== "number" || typeof m?.y !== "number" || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
  if (typeof m.fs === "number" && m.fs !== e.forceSeq) return;     // sent before the server last moved us: stale
  e.net = true;
  if (typeof m.mx === "number" && typeof m.my === "number" && Number.isFinite(m.mx) && Number.isFinite(m.my)) setMove(S, pid, m.mx, m.my);
  if (e.dash || e.kb || S.t < e.stunUntil) return;      // charges, shoves and staggers are the server's to move
  const sp = moveSpeed(S, e);
  const cap = sp * 0.6 + 0.15;
  e.netAllow = Math.min(cap, (e.netAllow ?? cap) + sp * 1.3 * Math.max(0, S.t - (e.netT ?? S.t)));
  e.netT = S.t;
  let dx = m.x - e.x, dy = m.y - e.y; const d = Math.hypot(dx, dy);
  if (d > e.netAllow) { const k = e.netAllow / d; dx *= k; dy *= k; force(e); }
  e.netAllow -= Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.15)), x0 = e.x + dx, y0 = e.y + dy;
  for (let i = 0; i < n; i++) { e.x += dx / n; e.y += dy / n; resolveWalls(S, e); }
  if (Math.hypot(e.x - x0, e.y - y0) > 0.06) force(e);
}
const force = (e) => { if (e.kind === "player") e.forceSeq = (e.forceSeq ?? 0) + 1; };

// play slot `slot` (0 = weapon, 1.. = actions) with aim {dx,dy,dist}. Returns {ok} or {ok:false, why}.
export function play(S, pid, slot, aim) {
  const e = playerOf(S, pid);
  if (!e || e.dead || e.away || S.phase !== "play") return { ok: false, why: "gone" };
  const key = slotKey(e, slot);
  if (!key || !CARDS[key]) return { ok: false, why: "empty" };
  return beginCast(S, e, key, slot, aim);
}
// why a slot can't be used right now (null = it can)
export function blockedWhy(S, e, slot) {
  const key = slotKey(e, slot); if (!key) return "empty";
  if (e.cast || e.dash) return "busy";
  if (S.t < e.stunUntil) return "stunned";
  if (slot === 0 && S.t < e.recoverUntil) return "busy";
  if (slot > 0 && cdLeft(S, e, slot) > 0) return "cooldown";
  const c = CARDS[key];
  if (c.hpCost && e.hp <= c.hpCost) return "health";
  return null;
}

function beginCast(S, e, key, slot, aim) {
  const why = blockedWhy(S, e, slot);
  if (why) return { ok: false, why };
  const c = CARDS[key];
  const [dx, dy] = norm(Number(aim?.dx) || 0, Number(aim?.dy) || 0, e.fx, e.fy);
  e.fx = dx; e.fy = dy;
  const dist = Number.isFinite(aim?.dist) ? aim.dist : undefined;
  const a = { dx, dy, dist };
  if (c.hpCost) { e.hp -= c.hpCost; fx(S, { type: "dmg", id: e.id, x: e.x, y: e.y, amt: c.hpCost, self: true }); }
  if (slot > 0) e.cds[slot - 1] = S.t + cooldownOf(e, key);
  // placed cards lock their spot now; swings, thrusts and charges follow you until they land
  const locked = c.shape.kind === "circle" ? shapeOf(S, e, key, a) : null;
  e.cast = { key, slot, t: 0, dur: windupOf(e, key), aim: a, locked };
  if (e.kind === "player") S.stats.attacks++;
  // Royal Rat: every attack and action also summons a rat
  if (passiveOf(e) === "playRat") summon(S, e, "rat", 1, e.x - e.fx * 0.6, e.y - e.fy * 0.6);
  fx(S, { type: "cast", id: e.id, key });
  return { ok: true };
}

// ---- loadout changes (any time; the bag holds what you've picked up) ----
export function equip(S, pid, bagIndex) {
  const e = playerOf(S, pid); if (!e || e.away) return { ok: false, why: "gone" };
  const key = e.bag[bagIndex]; const c = CARDS[key]; if (!c) return { ok: false, why: "empty" };
  if (c.type === "weapon") { e.bag[bagIndex] = e.weapon; e.weapon = key; }
  else if (c.type === "deck") { if (e.deck.length >= e.level) return { ok: false, why: "deck full" }; e.bag.splice(bagIndex, 1); e.deck.push(key); }
  else if (c.type === "action") {
    if (e.actions.length >= T.actionSlots) return { ok: false, why: "actions full" };
    e.bag.splice(bagIndex, 1); e.actions.push(key); e.cds.push(S.t + cooldownOf(e, key));   // a fresh action starts recharging
  }
  recalc(e, true);
  return { ok: true };
}
export function unequip(S, pid, cat, i) {
  const e = playerOf(S, pid); if (!e || e.away) return { ok: false, why: "gone" };
  if (e.bag.length >= T.bagMax) return { ok: false, why: "bag full" };
  const list = cat === "deck" ? e.deck : cat === "action" ? e.actions : null;
  if (!list || !(i >= 0 && i < list.length)) return { ok: false, why: "empty" };
  e.bag.push(list.splice(i, 1)[0]);
  if (cat === "action") e.cds.splice(i, 1);
  recalc(e, true);
  return { ok: true };
}
// the item a player is standing on (bodies wait to be worn; cards are picked up by walking over them)
export function itemUnder(S, e) {
  let best = null, bd = e.r + 0.55;
  for (const it of S.items) { const d = Math.hypot(it.x - e.x, it.y - e.y); if (it.kind === "body" && d <= bd) { bd = d; best = it; } }
  return best;
}
// wear a fallen body: take its passive; your old body is left lying where it was, for anyone to take
export function wearItem(S, pid, itemId) {
  const e = playerOf(S, pid); if (!e || e.dead || e.away) return false;
  const it = S.items.find((x) => x.id === itemId);
  if (!it || it.kind !== "body" || Math.hypot(it.x - e.x, it.y - e.y) > e.r + 0.8) return false;
  [e.body, it.key] = [it.key, e.body];
  fx(S, { type: "wear", id: e.id, body: e.body });
  return true;
}
export const onStairs = (S, e) => !!S.stairs && !e.dead && Math.hypot(S.stairs.x - e.x, S.stairs.y - e.y) <= 1.1;
// anyone standing on the stairs takes the whole party down
export function descend(S, pid) {
  const e = playerOf(S, pid);
  if (!e || S.phase !== "play" || !onStairs(S, e) || S.floorN + 1 >= FLOORS.length) return false;
  loadFloor(S, S.floorN + 1);
  S.stats.floors++;
  const st = S.floor.start, ps = players(S);
  ps.forEach((p, i) => {
    const a = (i / Math.max(1, ps.length)) * Math.PI * 2;
    Object.assign(p, { x: st.x + Math.cos(a) * 0.9, y: st.y + Math.sin(a) * 0.9, cast: null, dash: null, kb: null, dots: [],
      rage: 0, rageAcc: 0, interest: 0, fought: [], stunUntil: 0, slowUntil: 0, mx: 0, my: 0 });
    if (p.dead) { p.dead = false; p.revive = 0; }
    if (T.fullHealOnFloor) { p.hp = p.maxHp; p.woundDebt = 0; }
    p.shield = 0; p.cds = p.actions.map(() => 0);
    force(p); resolveWalls(S, p);
  });
  fx(S, { type: "floor", n: S.floorN, name: FLOORS[S.floorN].name });
  reveal(S);
  return true;
}

// ------------------------------------------------------------------------------------------------
// step
// ------------------------------------------------------------------------------------------------
export function step(S, dt = DT) {
  S.t += dt;
  if (S.phase !== "play") { pruneFx(S); return; }
  for (const e of S.ents) if (!e.dead && !e.away) tickEnt(S, e, dt);
  tickProjs(S, dt);
  tickZones(S, dt);
  separate(S);
  for (const e of S.ents) if (!e.dead && !e.dash) resolveWalls(S, e);
  pickups(S);
  revives(S, dt);
  rooms(S);
  reveal(S);
  S.ents = S.ents.filter((e) => !e.dead || e.kind === "player" || S.t - e.diedAt < 0.6);
  pruneFx(S);
}

const moveSpeed = (S, e) => e.speed * (S.t < e.slowUntil ? 1 - e.slowPct : 1) * (e.cast ? T.castMoveMul : 1);
function tickEnt(S, e, dt) {
  if (e.kind === "unit") { tickUnit(S, e, dt); return; }
  if (e.kind === "foe" && !e.awake) return;
  tickDots(S, e);
  if (e.dead) return;
  passiveTick(S, e);
  // a charge in progress
  if (e.dash) {
    const d = e.dash; d.t += dt;
    const k = Math.min(1, d.t / d.dur);
    e.x = d.x0 + (d.x1 - d.x0) * k; e.y = d.y0 + (d.y1 - d.y0) * k;
    if (k >= 1) { e.dash = null; force(e); }
    return;
  }
  if (e.kb) tickKb(S, e, dt);
  if (e.kind === "foe") thinkFoe(S, e, dt);
  // wind-up
  if (e.cast) {
    e.cast.t += dt;
    if (e.cast.t >= e.cast.dur) { const c = e.cast; e.cast = null; resolveCard(S, e, c); }
  }
  if (e.kb || S.t < e.stunUntil) return;
  // movement (players by stick — or by their phone in co-op; foes set mx/my in thinkFoe)
  if (e.net) return;
  if (e.cast && e.kind === "foe") return;               // foes plant their feet while winding up
  moveEnt(S, e, e.mx * moveSpeed(S, e), e.my * moveSpeed(S, e), dt);
}
// the client predicts its own walking with exactly the server's rules
export function walk(S, e, dt) {
  if (e.kb || e.dash || S.t < e.stunUntil) return;
  moveEnt(S, e, e.mx * moveSpeed(S, e), e.my * moveSpeed(S, e), dt);
}

function resolveCard(S, e, c) {
  const card = CARDS[c.key];
  const shape = c.locked ?? shapeOf(S, e, c.key, c.aim);
  if (!shape) return;
  if (card.type === "weapon") { e.recoverUntil = S.t + (card.recover ?? 0); weaponPassives(S, e); }
  const twice = !!card.dmg && e.firstHit;                // Centless Centaur: the first attack of a fight lands twice
  if (twice) e.firstHit = false;
  fx(S, { type: "land", id: e.id, side: e.side, key: c.key, shape, twice });
  if (card.shape.kind === "shot") {
    const sh = card.shape;
    S.projs.push({ id: S.nextId++, x: e.x, y: e.y, dx: shape.dx, dy: shape.dy, speed: sh.speed, left: shape.len, w: sh.w,
      dmg: dmgOf(S, e, c.key), push: pushOf(e, c.key), tag: card.tag, side: e.side, owner: e.id, key: c.key,
      pierce: !!sh.pierce, homing: sh.homing ?? 0, hit: [], twice, born: S.t });
    return;
  }
  if (card.shape.kind === "dash") {
    const end = { x: e.x + shape.dx * shape.len, y: e.y + shape.dy * shape.len };
    e.dash = { x0: e.x, y0: e.y, x1: end.x, y1: end.y, t: 0, dur: Math.max(0.08, shape.len / T.dashSpeed) };
    e.kb = null;
    if (card.iframes) e.iframeUntil = S.t + e.dash.dur + 0.05;
  }
  const { foes, allies } = hitsOf(S, e, shape);
  let landed = 0;
  if (card.dmg) for (const o of foes) { hit(S, e, o, c.key, shape, twice); landed++; }
  if (card.healOnHit && landed) heal(S, e, card.healOnHit * landed);
  if (card.heal) for (const o of allies) heal(S, o, card.heal);
  if (card.shield) addShield(S, e, card.shield);
  if (card.zone) S.zones.push({ x: shape.x, y: shape.y, r: shape.r, until: S.t + card.zone.dur, every: card.zone.every,
    next: S.t + card.zone.every, dmg: card.zone.dmg ?? 0, heal: card.zone.heal ?? 0, side: e.side, owner: e.id, key: c.key });
  if (card.summon) summon(S, e, card.summon.unit, card.summon.count, shape.x, shape.y);
}

// one card landing on one target: the damage, the shove, and what it leaves behind
function hit(S, src, o, key, shape, twice = false, amtIn) {
  const c = CARDS[key];
  const raw = amtIn ?? dmgOf(S, src, key);
  const amt = dmgAgainst(S, src, o, raw, c.tag, src.x, src.y);
  damage(S, o, amt, src, key, c.tag);
  if (twice) damage(S, o, amt, src, key, c.tag);
  if (o.dead) return;
  const p = pushOf(src, key);
  if (p > 0) { const [dx, dy] = pushDir(shape, o); knock(S, o, dx, dy, p); }
  if (c.burn) addDot(S, o, src, "burn", c.burn.dps, c.burn.time);
  if (c.slow) slowDown(S, o, c.slow);
}

export function damage(S, o, amt, src, what = "?", tag = null) {
  if (o.dead || o.away || amt <= 0) return;
  if (S.t < o.iframeUntil) { fx(S, { type: "miss", id: o.id, x: o.x, y: o.y }); return; }
  let a = amt;
  if (o.shield > 0) { const s = Math.min(o.shield, a); o.shield -= s; a -= s; }
  o.hp -= a;
  if (src?.side === "hero" && o.side === "foe") S.stats.dealt += amt;
  else if (o.kind === "player") S.stats.taken += a;
  fx(S, { type: "dmg", id: o.id, x: o.x, y: o.y, amt });
  if (o.kind === "foe" && !o.awake) wakeRoom(S, o.room);
  // the attacker's on-hit passives
  if (src && src.kind !== "unit" && !src.dead && src.id !== o.id) {
    if (passiveOf(src) === "medusa" && what !== "poison") addDot(S, o, src, "poison", T.poisonDps, T.poisonTime);
    if (passiveOf(src) === "vampire") { src.vampAcc += amt; const n = Math.floor(src.vampAcc / 2); if (n) { src.vampAcc -= n * 2; heal(S, src, n); } }
    const ls = src.mods?.lifesteal ?? 0; if (ls) { src.lsAcc = (src.lsAcc ?? 0) + amt * ls; const n = Math.floor(src.lsAcc); if (n) { src.lsAcc -= n; heal(S, src, n); } }
    if (tag === "melee" && (o.mods?.thorns ?? 0) && o.hp > 0 && Math.hypot(src.x - o.x, src.y - o.y) < 4) damage(S, src, o.mods.thorns, o, "thorns");
  }
  // the defender's passives
  if (o.hp > 0) {
    const p = passiveOf(o);
    if (p === "hitRat" && S.t >= o.ratCd) { o.ratCd = S.t + T.fatCatCooldown; summon(S, o, "rat", 1, o.x, o.y); }
    if (p === "rage") { o.rageAcc += a; while (o.rageAcc >= T.rageEvery) { o.rageAcc -= T.rageEvery; o.rage++; fx(S, { type: "buff", id: o.id, x: o.x, y: o.y, text: `+1 dmg (${o.rage})` }); } }
    if (p === "gore") {
      o.goreAcc += a;
      while (o.goreAcc >= T.goreEvery) {
        o.goreAcc -= T.goreEvery;
        const t = nearestHostile(S, o, T.goreRange + o.r);
        if (t) damage(S, t, T.goreDmg, o, "gore");
      }
    }
  }
  // the boss calls its pack once, at half health
  if (BODIES[o.body]?.boss && !o.addsCalled && o.hp > 0 && o.hp <= o.maxHp * BOSS_ADDS.at) {
    o.addsCalled = true;
    const fr = S.floor.rooms[o.room];
    const n = BOSS_ADDS.count + BOSS_ADDS.perPlayer * (partySize(S) - 1);
    const heroes = players(S).filter((p) => !p.dead);
    for (let i = 0; i < n; i++) {
      const f = spawnFoe(S, fr, BOSS_ADDS.foe, BOSS_ADDS.level, heroes); f.awake = true; f.rest = 0.5 + i * 0.15; combatStart(S, f);
      fx(S, { type: "summon", id: f.id, x: f.x, y: f.y, unit: "pack" });
    }
    fx(S, { type: "pack", room: o.room });
  }
  if (o.hp <= 0) kill(S, o);
}
function heal(S, o, amt) {
  if (o.dead || amt <= 0) return;
  const before = o.hp; o.hp = Math.min(o.maxHp, o.hp + amt);
  if (o.hp > before) fx(S, { type: "heal", id: o.id, x: o.x, y: o.y, amt: o.hp - before });
}
function addShield(S, o, amt) {
  const before = o.shield; o.shield = Math.min(shieldCap(o), o.shield + amt);
  if (o.shield > before) fx(S, { type: "shield", id: o.id, amt: o.shield - before });
}
function slowDown(S, o, slow) {
  o.slowPct = S.t < o.slowUntil ? Math.max(o.slowPct, slow.pct) : slow.pct;
  o.slowUntil = Math.max(o.slowUntil, S.t + slow.time);
}
function addDot(S, o, src, kind, dps, time) {
  const had = o.dots.find((d) => d.kind === kind && d.src === src.id);
  if (had) { had.until = S.t + time; had.dps = Math.max(had.dps, dps); return; }
  o.dots.push({ kind, src: src.id, side: src.side, dps, until: S.t + time, next: S.t + 1 });
}
function tickDots(S, e) {
  if (!e.dots.length) return;
  for (const d of e.dots) {
    if (S.t < d.next) continue;
    d.next += 1;
    const src = S.ents.find((s) => s.id === d.src) ?? { side: d.side, kind: "unit" };
    damage(S, e, d.dps, src, d.kind);
    if (e.dead) return;
  }
  e.dots = e.dots.filter((d) => S.t < d.until);
}

// ---- pushback ----
function knock(S, o, dx, dy, dist) {
  if (o.dead || o.dash || S.t < o.iframeUntil) return;
  const eff = shoveDist(o, dist);
  if (eff < 0.05) return;
  const v = eff * T.pushDecay;
  o.kb = { vx: (o.kb?.vx ?? 0) + dx * v, vy: (o.kb?.vy ?? 0) + dy * v };
  force(o);
  if (eff >= T.staggerAt) stagger(S, o);
}
function stagger(S, o) {
  if (BODIES[o.body]?.boss) return;
  if (o.cast) { fx(S, { type: "stagger", id: o.id, x: o.x, y: o.y, key: o.cast.key }); o.cast = null; }
  o.stunUntil = Math.max(o.stunUntil, S.t + T.stunTime);
}
function tickKb(S, e, dt) {
  const k = e.kb, sp = Math.hypot(k.vx, k.vy);
  const ix = k.vx * dt, iy = k.vy * dt, x0 = e.x, y0 = e.y;
  e.x += ix; resolveWalls(S, e); e.y += iy; resolveWalls(S, e);
  const moved = Math.hypot(e.x - x0, e.y - y0), meant = Math.hypot(ix, iy);
  if (meant > 1e-4 && moved < meant * 0.5 && sp >= T.slamSpeed) {
    // slammed into a wall
    e.kb = null; force(e);
    fx(S, { type: "slam", id: e.id, x: e.x, y: e.y });
    stagger(S, e);
    damage(S, e, T.slamDmg, null, "slam");
    return;
  }
  const decay = Math.exp(-T.pushDecay * dt);
  k.vx *= decay; k.vy *= decay;
  if (Math.hypot(k.vx, k.vy) < 0.35) { e.kb = null; force(e); }
}

function kill(S, o) {
  o.hp = 0; o.dead = true; o.diedAt = S.t; o.cast = null; o.dash = null; o.kb = null; o.mx = o.my = 0; o.dots = [];
  fx(S, { type: o.kind === "player" ? "down" : "die", id: o.id, x: o.x, y: o.y, kind: o.kind });
  if (o.kind === "foe") {
    S.stats.felled++;
    gainXp(S, o.level ?? 1);
    // what it leaves behind: sometimes one of its cards, sometimes its body
    const loot = [o.weapon, ...o.deck, ...o.actions].filter((k) => k && k !== "bite");
    if (loot.length && S.rng() < T.dropCard) dropItem(S, "card", pick(S.rng, loot), o.x + 0.3, o.y);
    if (BODIES[o.body]?.role !== "swarm" && !BODIES[o.body]?.boss && S.rng() < T.dropBody) dropItem(S, "body", o.body, o.x - 0.3, o.y);
    if (BODIES[o.body]?.boss) { S.phase = "won"; S.endedAt = S.t; }
  }
  if (o.kind === "player") { o.revive = 0; checkLost(S); }
}
function dropItem(S, kind, key, x, y) {
  const it = { id: S.nextId++, kind, key, x, y };
  S.items.push(it);
  return it;
}
function pickups(S) {
  for (const p of players(S)) {
    if (p.dead || p.away) continue;
    for (const it of S.items) {
      if (it.kind !== "card" || it.taken || p.bag.length >= T.bagMax) continue;
      if (Math.hypot(it.x - p.x, it.y - p.y) > p.r + 0.4) continue;
      it.taken = true; p.bag.push(it.key);
      fx(S, { type: "pickup", id: p.id, x: it.x, y: it.y, key: it.key });
    }
  }
  if (S.items.some((it) => it.taken)) S.items = S.items.filter((it) => !it.taken);
}
// lost only when every player is down
function checkLost(S) {
  if (S.phase !== "play") return;
  const ps = players(S);
  if (ps.length && ps.every((p) => p.dead)) { S.phase = "lost"; S.endedAt = S.t; }
}
function standUp(S, p) {
  p.dead = false; p.hp = Math.max(1, Math.ceil(p.maxHp * T.reviveHp)); p.woundDebt = 0; p.revive = 0; S.stats.revives++;
  fx(S, { type: "revive", id: p.id, x: p.x, y: p.y });
}
// a friend standing beside a downed player fills their ring; when no foe is awake, everyone gets back up
function revives(S, dt) {
  const calm = !S.ents.some((o) => o.kind === "foe" && o.awake && !o.dead);
  // shields are for fights: when no foe is awake they fade (Golden Golem, Ward start the next fight fresh — FLAG)
  if (calm) for (const p of players(S)) if (p.shield > 0) p.shield = Math.max(0, p.shield - T.shieldFade * dt);
  for (const p of players(S)) {
    if (!p.dead || p.away) continue;
    if (calm) { standUp(S, p); continue; }
    const helpers = players(S).filter((h) => !h.dead && !h.away && Math.hypot(h.x - p.x, h.y - p.y) <= T.reviveRange + h.r).length;
    p.revive = helpers ? (p.revive ?? 0) + dt * helpers : Math.max(0, (p.revive ?? 0) - dt * 0.5);
    if (p.revive >= T.reviveTime) standUp(S, p);
  }
}

// ---- passives that tick or count ----
function passiveTick(S, e) {
  if (passiveOf(e) === "angel" && S.t >= e.angelT) {
    // Audit Angel: every 6 s, the most hurt ally in range (or yourself)
    const hurt = S.ents.filter((o) => !o.dead && !o.away && o.side === e.side && o.kind !== "unit" && o.hp < o.maxHp
      && Math.hypot(o.x - e.x, o.y - e.y) <= T.angelRange).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (hurt) { e.angelT = S.t + T.angelEvery; heal(S, hurt, T.angelHeal); fx(S, { type: "angel", id: e.id, to: hurt.id }); }
  }
}
function weaponPassives(S, e) {
  e.attacks++;
  const p = passiveOf(e);
  if (p === "echo" && e.attacks % T.echoEvery === 0) { const t = nearestHostile(S, e, 2.2 + e.r); if (t) { damage(S, t, T.echoDmg, e, "echo"); fx(S, { type: "bite", id: e.id, x: t.x, y: t.y }); } }
  if (p === "interest" && e.attacks % T.interestEvery === 0) { e.interest++; fx(S, { type: "buff", id: e.id, x: e.x, y: e.y, text: `+1 dmg (${e.interest})` }); }
  if (p === "troll" && e.attacks % T.trollEvery === 0) heal(S, e, T.trollHeal);
}
// a fight begins for `e` (they walked into a room with foes, or the room woke around them)
function combatStart(S, e) {
  const sh = (e.mods?.roomShield ?? 0) + (passiveOf(e) === "golem" ? e.maxHp : 0);
  if (sh) addShield(S, e, sh);
  if (passiveOf(e) === "mouseRage") e.mouseUntil = S.t + T.mouseRageTime;
  if (passiveOf(e) === "firstTwice") e.firstHit = true;
}

function summon(S, owner, unitKey, count, x, y) {
  const u = UNITS[unitKey];
  for (let i = 0; i < count; i++) {
    const mine = S.ents.filter((e) => e.kind === "unit" && e.owner === owner.id && e.unit === unitKey && !e.dead);
    if (unitKey === "rat" && mine.length >= T.ratCap) { const old = mine[0]; old.dead = true; old.diedAt = S.t; fx(S, { type: "die", id: old.id, x: old.x, y: old.y, kind: "unit" }); }
    const a = S.rng() * Math.PI * 2, d = count > 1 ? 0.35 : 0.05;
    const e = baseEnt(S, { side: owner.side, kind: "unit", unit: unitKey, owner: owner.id, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      r: u.r, hp: u.hp, maxHp: u.hp, speed: u.speed, life: u.life, bornAt: S.t, atkT: S.t + 0.3, room: owner.room });
    S.ents.push(e);
    resolveWalls(S, e);
    fx(S, { type: "summon", id: e.id, x: e.x, y: e.y, unit: unitKey });
  }
}
function tickUnit(S, e, dt) {
  const u = UNITS[e.unit];
  if (S.t - e.bornAt >= e.life) { e.dead = true; e.diedAt = S.t; fx(S, { type: "die", id: e.id, x: e.x, y: e.y, kind: "unit" }); return; }
  if (e.kb) { tickKb(S, e, dt); if (e.kb) return; }
  const tgt = nearestHostile(S, e, T.summonAggro);
  let vx = 0, vy = 0;
  if (tgt) {
    const d = Math.hypot(tgt.x - e.x, tgt.y - e.y) || 1e-6;
    const [ux, uy] = norm(tgt.x - e.x, tgt.y - e.y);
    const a = u.attack;
    const reach = a.kind === "bite" ? e.r + tgt.r + a.reach : a.range;
    const clear = a.kind === "bite" || rayToWall(S, e.x, e.y, ux, uy, d) >= d - 0.05;
    if (d <= reach && clear) {
      if (S.t >= e.atkT) {
        e.atkT = S.t + a.every;
        if (a.kind === "bite") { damage(S, tgt, a.dmg, e, e.unit, "melee"); fx(S, { type: "bite", id: e.id, x: tgt.x, y: tgt.y }); }
        else S.projs.push({ id: S.nextId++, x: e.x, y: e.y, dx: ux, dy: uy, speed: a.speed, left: a.range + 1, w: a.w, dmg: a.dmg, push: 0.2,
          tag: "spell", side: e.side, owner: e.id, key: "bolt", hit: [], born: S.t });
      }
      if (a.kind === "bolt" && d < a.keepAway) { vx = -ux; vy = -uy; }
    } else { vx = ux; vy = uy; }
  } else {
    const own = S.ents.find((o) => o.id === e.owner && !o.dead);
    if (own) {
      const d = Math.hypot(own.x - e.x, own.y - e.y);
      if (d > T.summonLeash) { e.x = own.x; e.y = own.y; }
      else if (d > T.summonHeel) { vx = (own.x - e.x) / d; vy = (own.y - e.y) / d; }
    }
  }
  const sp = e.speed * (S.t < e.slowUntil ? 1 - e.slowPct : 1);
  moveEnt(S, e, vx * sp, vy * sp, dt);
}
function nearestHostile(S, e, within = Infinity) {
  let best = null, bd = within;
  for (const o of S.ents) {
    if (!inPlay(S, o) || !hostile(e, o)) continue;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

// ------------------------------------------------------------------------------------------------
// foe brain: pick a target (spreading out over the party), choose the weapon or a ready action, walk
// into range the way its role walks, wait for its turn, aim, wind up, land
// ------------------------------------------------------------------------------------------------
export function preferredRange(e, key, tgt) {
  const sh = CARDS[key].shape, tr = tgt?.r ?? T.radius, k = reachMul(e, key);
  switch (sh.kind) {
    case "arc": return sh.r * k * 0.8 + tr;
    case "line": return Math.min(sh.len * k * 0.75, 5.5);
    case "shot": return Math.min(sh.range * k * 0.6, 5.5);
    case "circle": return Math.min(sh.range * k * 0.75, 5.5);
    case "self": return sh.r ? sh.r * 0.65 + tr : 99;
    case "dash": return sh.len * 0.8;
  }
  return 2;
}
const roleOf = (e) => BODIES[e.body]?.role ?? "melee";
const needsTurn = (e) => !["swarm", "boss"].includes(roleOf(e));
function turnFree(S, e) {
  if (!needsTurn(e)) return true;
  let busy = 0;
  for (const o of S.ents) if (o !== e && o.kind === "foe" && !o.dead && o.awake && o.cast && needsTurn(o)) busy++;
  return busy < T.foeTokens + partySize(S);
}
function pickTarget(S, e) {
  const keep = S.ents.find((o) => o.id === e.tgtId);
  if (keep && inPlay(S, keep) && S.t < e.tgtT) return keep;
  let best = null, bs = Infinity;
  for (const o of S.ents) {
    if (!inPlay(S, o) || !hostile(e, o)) continue;
    const others = o.kind === "unit" ? 0 : S.ents.filter((f) => f !== e && f.kind === "foe" && !f.dead && f.tgtId === o.id).length;
    const s = Math.hypot(o.x - e.x, o.y - e.y) + others * T.spreadAggro;
    if (s < bs) { bs = s; best = o; }
  }
  e.tgtId = best?.id ?? null; e.tgtT = S.t + T.retarget;
  return best;
}
// what a foe will use next against `tgt` at distance d: a ready action that's worth it, else its weapon
export function foeChoice(S, e, tgt, d) {
  for (let i = 0; i < e.actions.length; i++) {
    const key = e.actions[i], c = CARDS[key];
    if (cdLeft(S, e, i + 1) > 0 || c.iframes) continue;
    if (c.heal) { if (S.ents.some((o) => !o.dead && o.side === e.side && o.kind !== "unit" && o.hp < o.maxHp * 0.7 && Math.hypot(o.x - e.x, o.y - e.y) <= c.shape.r + o.r)) return { key, slot: i + 1 }; continue; }
    if (c.shield) { if (e.hp < e.maxHp * 0.75 && !e.shield) return { key, slot: i + 1 }; continue; }
    if (c.summon) return { key, slot: i + 1 };
    if (tgt && d <= preferredRange(e, key, tgt) * 1.05 && (c.shape.kind !== "dash" || d > 1.5)) return { key, slot: i + 1 };
  }
  return { key: e.weapon, slot: 0 };
}
export function foeIntent(S, e) {
  if (e.cast) return e.cast.key;
  const t = S.ents.find((o) => o.id === e.tgtId);
  return foeChoice(S, e, t, t ? Math.hypot(t.x - e.x, t.y - e.y) : 99).key;
}

function thinkFoe(S, e, dt) {
  e.mx = e.my = 0;
  if (e.cast || e.dash || e.kb || S.t < e.stunUntil) return;
  const tgt = pickTarget(S, e);
  if (!tgt) return;
  const role = roleOf(e);
  const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1;
  if (dx || dy) { e.fx = dx / d; e.fy = dy / d; }
  const { key, slot } = foeChoice(S, e, tgt, d), card = CARDS[key];
  const want = preferredRange(e, key, tgt);
  const support = !card.dmg && !card.zone?.dmg;
  e.rest -= dt;
  const los = rayToWall(S, e.x, e.y, dx / d, dy / d, d) >= d - 0.1;
  const inRange = support || d <= want * 1.15;
  if (e.rest <= 0 && inRange && los && turnFree(S, e) && !blockedWhy(S, e, slot)) {
    beginCast(S, e, key, slot, { dx, dy, dist: d });
    if (slot === 0) e.rest = T.foeCastGap * (role === "swarm" ? 0.6 : 1);
    return;
  }
  // feet, by role (always judged by the weapon's reach)
  const wWant = preferredRange(e, e.weapon, tgt);
  const keepAway = role === "ranger" || role === "caster" || role === "healer";
  if (!los) { const [ux, uy] = pathStep(S, e, tgt.x, tgt.y, e); e.mx = ux; e.my = uy; }
  else if (d > wWant * 0.95) { e.mx = dx / d; e.my = dy / d; }
  else if (keepAway && d < wWant * 0.6) { e.mx = -dx / d; e.my = -dy / d; }
  else if (keepAway || role === "swarm") {
    e.strafeT -= dt;
    if (e.strafeT <= 0) { e.strafe = -e.strafe; e.strafeT = 1.4 + S.rng() * 1.2; }
    const sx = -dy / d * e.strafe, sy = dx / d * e.strafe;
    if (rayToWall(S, e.x, e.y, sx, sy, 0.8, e.r) < 0.4) e.strafe = -e.strafe;
    const k = role === "swarm" ? 0.7 : 0.45;
    e.mx = -dy / d * e.strafe * k; e.my = dx / d * e.strafe * k;
  }
}

// Walk around walls: a breadth-first path over the tiles, re-planned at most every 0.5 s, steering at the
// farthest waypoint in a straight walkable line. `mem` holds the plan (a foe keeps it on itself).
export function pathStep(S, e, tx, ty, mem) {
  const gx = Math.floor(tx), gy = Math.floor(ty);
  if (!mem.path || mem.pathGoal !== gy * S.floor.w + gx || S.t - (mem.pathAt ?? -9) > 0.5) {
    mem.path = gridPath(S, Math.floor(e.x), Math.floor(e.y), gx, gy); mem.pathGoal = gy * S.floor.w + gx; mem.pathAt = S.t;
  }
  const path = mem.path;
  if (!path || !path.length) { const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1; return d < 0.3 ? [0, 0] : [dx / d, dy / d]; }
  while (path.length > 1 && Math.hypot(path[0][0] + 0.5 - e.x, path[0][1] + 0.5 - e.y) < 0.4) path.shift();
  let px = path[0][0] + 0.5, py = path[0][1] + 0.5;
  for (let i = Math.min(path.length - 1, 6); i >= 0; i--) {
    const qx = path[i][0] + 0.5, qy = path[i][1] + 0.5, d = Math.hypot(qx - e.x, qy - e.y) || 1;
    if (rayToWall(S, e.x, e.y, (qx - e.x) / d, (qy - e.y) / d, d, e.r) >= d - 0.05) { px = qx; py = qy; break; }
  }
  const dx = px - e.x, dy = py - e.y, d = Math.hypot(dx, dy) || 1;
  return [dx / d, dy / d];
}
export function gridPath(S, sx, sy, gx, gy) {
  const w = S.floor.w, prev = new Int32Array(w * S.floor.h).fill(-1);
  const start = sy * w + sx, goal = gy * w + gx;
  if (start < 0 || goal < 0 || start >= prev.length || goal >= prev.length) return null;
  const q = [start]; prev[start] = start;
  for (let h = 0; h < q.length; h++) {
    const k = q[h]; if (k === goal) break;
    const x = k % w, y = (k / w) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (solidAt(S, nx, ny)) continue;
      const nk = ny * w + nx; if (prev[nk] !== -1) continue;
      prev[nk] = k; q.push(nk);
    }
  }
  if (prev[goal] === -1) return null;
  const out = [];
  for (let k = goal; k !== start; k = prev[k]) out.push([k % w, (k / w) | 0]);
  return out.reverse();
}

// ---- projectiles / zones ----
function tickProjs(S, dt) {
  for (const p of S.projs) {
    // homing: bend toward the nearest foe ahead (arcane magic)
    if (p.homing) {
      let best = null, bs = 6;
      for (const o of S.ents) {
        if (!inPlay(S, o) || o.side === p.side || p.hit.includes(o.id)) continue;
        const rx = o.x - p.x, ry = o.y - p.y, d = Math.hypot(rx, ry);
        if (d < bs && (rx * p.dx + ry * p.dy) / (d || 1) > 0.2) { bs = d; best = o; }
      }
      if (best) {
        const want = Math.atan2(best.y - p.y, best.x - p.x), cur = Math.atan2(p.dy, p.dx);
        let da = want - cur; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const a = cur + Math.max(-p.homing * dt, Math.min(p.homing * dt, da));
        p.dx = Math.cos(a); p.dy = Math.sin(a);
      }
    }
    let travel = p.speed * dt;
    while (travel > 0 && !p.done) {
      const stepLen = Math.min(0.2, travel); travel -= stepLen;
      p.x += p.dx * stepLen; p.y += p.dy * stepLen; p.left -= stepLen;
      if (p.left <= 0 || solidAt(S, Math.floor(p.x), Math.floor(p.y))) { p.done = true; fx(S, { type: "fizzle", x: p.x, y: p.y, key: p.key }); break; }
      for (const o of S.ents) {
        if (!inPlay(S, o) || o.side === p.side || p.hit.includes(o.id)) continue;
        if (Math.hypot(o.x - p.x, o.y - p.y) <= o.r + p.w / 2) {
          const src = S.ents.find((s) => s.id === p.owner) ?? { side: p.side, x: p.x, y: p.y, mods: {} };
          p.hit.push(o.id);
          const amt = dmgAgainst(S, src, o, p.dmg, p.tag, p.x - p.dx, p.y - p.dy);
          damage(S, o, amt, src, p.key, p.tag);
          if (p.twice) damage(S, o, amt, src, p.key, p.tag);
          if (!o.dead && p.push) knock(S, o, p.dx, p.dy, p.push);
          const c = CARDS[p.key];
          if (c?.burn && !o.dead) addDot(S, o, src, "burn", c.burn.dps, c.burn.time);
          if (c?.slow && !o.dead) slowDown(S, o, c.slow);
          fx(S, { type: "pop", x: p.x, y: p.y, key: p.key });
          if (!p.pierce) { p.done = true; break; }
        }
      }
    }
  }
  S.projs = S.projs.filter((p) => !p.done);
}
function tickZones(S, dt) {
  for (const z of S.zones) {
    if (S.t < z.next) continue;
    z.next += z.every;
    const src = S.ents.find((s) => s.id === z.owner) ?? { side: z.side };
    for (const o of S.ents) {
      if (!inPlay(S, o) || Math.hypot(o.x - z.x, o.y - z.y) > z.r + o.r) continue;
      if (o.side !== z.side && z.dmg) damage(S, o, z.dmg, src, z.key);
      else if (o.side === z.side && z.heal) heal(S, o, z.heal);
    }
  }
  S.zones = S.zones.filter((z) => S.t < z.until);
}

// ---- movement ----
function moveEnt(S, e, vx, vy, dt) {
  if (!vx && !vy) return;
  e.x += vx * dt; resolveWalls(S, e);
  e.y += vy * dt; resolveWalls(S, e);
}
function resolveWalls(S, e) {
  const r = e.r;
  for (let pass = 0; pass < 2; pass++) {
    const x0 = Math.floor(e.x - r), x1 = Math.floor(e.x + r), y0 = Math.floor(e.y - r), y1 = Math.floor(e.y + r);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!solidAt(S, tx, ty)) continue;
      const px = Math.max(tx, Math.min(e.x, tx + 1)), py = Math.max(ty, Math.min(e.y, ty + 1));
      let dx = e.x - px, dy = e.y - py; const d = Math.hypot(dx, dy);
      if (d >= r) continue;
      if (d < 1e-6) {
        const opts = [[e.x - tx, -1, 0], [tx + 1 - e.x, 1, 0], [e.y - ty, 0, -1], [ty + 1 - e.y, 0, 1]].sort((a, b) => a[0] - b[0]);
        const out = opts.find(([, sx, sy]) => !solidAt(S, tx + sx, ty + sy)) ?? opts[0];
        e.x += out[1] * (out[0] + r); e.y += out[2] * (out[0] + r);
      } else { e.x += (dx / d) * (r - d); e.y += (dy / d) * (r - d); }
    }
  }
}
function separate(S) {
  const live = S.ents.filter((e) => !e.dead && !e.away && !e.dash && (e.kind !== "foe" || e.awake));
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j];
    if (a.side === b.side && (a.kind !== "foe" || b.kind !== "foe")) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
    if (d >= min) continue;
    const [nx, ny] = d > 1e-6 ? [dx / d, dy / d] : [1, 0];
    const push = (min - d) / 2;
    // heavier bodies give way less; a boss doesn't budge. No single shove moves anyone > 0.25 tiles.
    const wt = (o) => (o.kind === "unit" ? 1.6 : BODIES[o.body]?.boss ? 0.1 : 1 / Math.max(0.5, (o.r / T.radius) ** 2));
    const wa = wt(a), wb = wt(b);
    const ma = Math.min(0.25, push * wa / ((wa + wb) / 2)), mb = Math.min(0.25, push * wb / ((wa + wb) / 2));
    a.x -= nx * ma; a.y -= ny * ma;
    b.x += nx * mb; b.y += ny * mb;
    if (a.net && ma > 0.12) force(a);
    if (b.net && mb > 0.12) force(b);
  }
}

// ---- rooms: foes sleep until someone comes close; the boss den seals; a fight starts for whoever is there ----
export const ENTER_INSET = 0.3;
function keepInside(e, fr) {
  const m = e.r + 0.02, x = e.x, y = e.y;
  e.x = Math.max(fr.x + m, Math.min(fr.x + fr.w - m, e.x));
  e.y = Math.max(fr.y + m, Math.min(fr.y + fr.h - m, e.y));
  if (Math.hypot(e.x - x, e.y - y) > 0.05) force(e);
}
function wakeRoom(S, roomId) {
  const rs = S.rooms[roomId]; if (!rs || rs.awake) return;
  rs.awake = true;
  const fr = S.floor.rooms[roomId], n = partySize(S);
  const standing = players(S).filter((p) => !p.dead && !p.away);
  // sized for the party: one extra foe per extra player, and tougher foes
  for (let i = 0; i < n - 1 && rs.extra?.length; i++) {
    const xf = spawnFoe(S, fr, rs.extra[i % rs.extra.length], rs.level ?? 1, standing);
    fx(S, { type: "summon", id: xf.id, x: xf.x, y: xf.y, unit: "extra" });
  }
  for (const id of rs.foes) {
    const e = S.ents.find((o) => o.id === id); if (!e || e.dead) continue;
    const mul = 1 + (n - 1) * (BODIES[e.body]?.boss ? T.coopBossHp : T.coopFoeHp);
    const lost = e.maxHp - e.hp;                         // a shot that woke the room still counts
    e.maxHp = Math.round(e.maxHp * mul); e.hp = Math.max(1, e.maxHp - lost); e.awake = true; e.rest = Math.max(e.rest, 0.5);
    combatStart(S, e);
  }
  // everyone close by is in this fight now
  for (const p of standing) if (Math.hypot(p.x - fr.cx, p.y - fr.cy) < Math.max(fr.w, fr.h) + 4) startFightFor(S, p, roomId);
  fx(S, { type: "wake", room: roomId });
}
function startFightFor(S, p, roomId) {
  if (p.fought.includes(roomId)) return;
  p.fought.push(roomId);
  combatStart(S, p);
}
function rooms(S) {
  if (S.phase !== "play") return;
  const f = S.floor;
  const standing = players(S).filter((e) => !e.dead && !e.away);
  // whoever walks into a room with foes in it starts that fight (and wakes it)
  for (const p of standing) {
    const r = roomAt(f, p.x, p.y, ENTER_INSET); if (!r) continue;
    const rs = S.rooms[r.id];
    if (!rs.foes.some((id) => S.ents.some((o) => o.id === id && !o.dead))) continue;
    if (rs.kind === "boss" && !rs.sealed) {
      rs.sealed = true;
      for (const k of f.rooms[r.id].doors) S.locked.add(k);
      for (const e of S.ents) if (!e.away && (e.kind === "player" || (e.kind === "unit" && !e.dead)) && e.side === "hero") {
        e.dash = null; e.kb = null;
        const at = roomAt(f, e.x, e.y, ENTER_INSET);
        if (!at || at.id !== r.id) { e.x = p.x + (S.rng() - 0.5) * 1.2; e.y = p.y + (S.rng() - 0.5) * 1.2; force(e); }
        keepInside(e, f.rooms[r.id]);
      }
      fx(S, { type: "lock", room: r.id });
    }
    wakeRoom(S, r.id);
    startFightFor(S, p, r.id);
  }
  // a sleeping foe wakes when someone comes close in its sight
  for (const o of S.ents) {
    if (o.kind !== "foe" || o.awake || o.dead) continue;
    for (const p of standing) {
      const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy);
      if (d <= T.wakeRange && rayToWall(S, o.x, o.y, dx / d, dy / d, d) >= d - 0.1) { wakeRoom(S, o.room); break; }
    }
  }
  // the sealed boss den: nobody in that fight can end up outside it
  for (const rs of S.rooms) {
    if (!rs.sealed) continue;
    const fr = f.rooms[rs.id];
    for (const e of S.ents) {
      if ((e.dead && e.kind !== "player") || e.dash || e.away) continue;
      const ours = e.side === "hero" ? e.kind !== "foe" : rs.foes.includes(e.id) || (e.kind === "unit" && e.room === rs.id);
      if (ours) keepInside(e, fr);
    }
  }
  for (const rs of S.rooms) {
    if (rs.status === "clear" || !rs.awake) continue;
    if (rs.foes.every((id) => !S.ents.some((o) => o.id === id && !o.dead))) {
      rs.status = "clear";
      for (const e of S.ents) if (e.kind === "unit" && e.side === "foe" && !e.dead && e.room === rs.id) { e.dead = true; e.diedAt = S.t; }
      fx(S, { type: "clear", room: rs.id });
    }
  }
}

function reveal(S) {
  const f = S.floor;
  for (const p of players(S)) {
    if (p.away) continue;
    const r = roomAt(f, p.x, p.y, 0);
    if (r) for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) { if (x >= 0 && y >= 0 && x < f.w && y < f.h) S.seen[y * f.w + x] = 1; }
    const R = 3.5;
    for (let y = Math.floor(p.y - R); y <= p.y + R; y++) for (let x = Math.floor(p.x - R); x <= p.x + R; x++) {
      if (x < 0 || y < 0 || x >= f.w || y >= f.h) continue;
      if (Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) <= R) S.seen[y * f.w + x] = 1;
    }
  }
}

function fx(S, e) { S.fx.push({ ...e, t0: S.t, n: S.fxN = (S.fxN ?? 0) + 1 }); }
function pruneFx(S) { if (S.fx.length > 0 && S.fx[0].t0 < S.t - 2) S.fx = S.fx.filter((f) => f.t0 >= S.t - 2); }

// ------------------------------------------------------------------------------------------------
// helpers the client and bot share
// ------------------------------------------------------------------------------------------------
export function roomStatusAt(S, x, y) { const r = roomAt(S.floor, x, y, 0); return r ? S.rooms[r.id] : null; }
export function awakeFoes(S) { return S.ents.filter((e) => e.kind === "foe" && e.awake && !e.dead); }
export const floorInfo = (S) => FLOORS[S.floorN];
