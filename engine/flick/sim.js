// King Mimic — FLICK mode simulation. Pure, seedable, no DOM: the page runs it for solo play, the server
// runs the very same code for co-op rooms, and the tests run it headless. Every rule reads
// engine/flick/content.js (the owner's editable table).
//
// The one geometry function `shapeOf` is used for BOTH the aim reticle the client draws and the hit the
// card resolves, so the reticle is never a guess — what it outlines is what gets hit.
//
// No mana (owner, 10/29 second round): a card's ramp-up (wind-up) is its whole cost. Cards are reusable
// (back into your deck) or one use (spent for the floor). When nothing is left to draw, Struggle.
//
// Parity: players, foes and summons are all `ents` with the same hp / shield / cards and the same
// `beginCast → wind-up → resolve` path. Deliberate asymmetries (all FLAG in TUNING): foes wind up longer,
// stand still while winding up, move a little slower, wear floor-1 bodies at reduced HP, rest between
// cards, and take turns (attack tokens) so a crowded room stays readable.
//
// Co-op (up to 4): every input is keyed by pid. Players can join mid-run (they appear beside a friend),
// go away (disconnect) and come back. A player at 0 HP is DOWN, not out: a friend standing beside them
// stands them back up, and clearing the room revives everyone. The run is lost only when every player
// is down at once.

import { CARDS, BODIES, UNITS, GEM_STATS, TUNING as T, ENCOUNTERS, BOSS, BOSS_ADDS, PLAYER_COLORS } from "./content.js";
import { makeFloor, roomAt } from "./floor.js";

export const DT = 1 / 60;

export function rngFrom(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (rng, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ------------------------------------------------------------------------------------------------
// creation
// ------------------------------------------------------------------------------------------------
export function createRun({ seed = Date.now() % 2147483647, players = [] }) {
  const rng = rngFrom(seed);
  const floor = makeFloor(rng, { fights: ENCOUNTERS.length });
  const S = {
    seed, rng, t: 0, phase: "play", floor, nextId: 1, colorsUsed: 0, level: 1, xp: 0,
    locked: new Set(), seen: new Uint8Array(floor.w * floor.h),
    ents: [], projs: [], zones: [], fx: [],
    rooms: floor.rooms.map((r) => ({ id: r.id, kind: r.kind, status: r.kind === "start" ? "clear" : "idle", foes: [], fallen: [], enc: null })),
    rewards: {}, stats: { plays: 0, dealt: 0, taken: 0, rooms: 0, revives: 0 },
  };
  for (const p of players) joinRun(S, p);
  // foes wait asleep in their rooms (the one-player encounter; extras join when the room wakes)
  let fightNo = 0;
  for (const r of floor.rooms) {
    if (r.kind === "fight") {
      const lvl = T.roomLevels[Math.min(fightNo, T.roomLevels.length - 1)];
      const enc = ENCOUNTERS[fightNo++ % ENCOUNTERS.length];
      Object.assign(S.rooms[r.id], { enc, level: lvl });
      for (const b of enc.foes) spawnFoe(S, r, b, [], lvl);
    } else if (r.kind === "boss") { S.rooms[r.id].level = T.bossLevel; spawnFoe(S, r, BOSS, [], T.bossLevel); }
  }
  reveal(S);
  return S;
}

const players = (S) => S.ents.filter((e) => e.kind === "player");
// who counts as "in the party": connected players, standing or down
export const partySize = (S) => Math.max(1, players(S).filter((p) => !p.away).length);

// Add a player (at the start, or mid-run beside a standing friend). Returns the player entity.
export function joinRun(S, { id, body, deck, name }) {
  const had = playerOf(S, id);
  if (had) { had.away = false; return had; }
  if (players(S).length >= T.maxPlayers) return null;
  const anchor = players(S).find((p) => !p.dead && !p.away);
  const st = anchor ?? S.floor.start;
  const a = S.rng() * Math.PI * 2;
  // `pid` is the phone's private seat id (never shown to other phones); `pub` is what everyone else sees
  const e = baseEnt(S, { side: "hero", kind: "player", pid: id, pub: `p${S.nextId}`, name: name || `Player ${S.colorsUsed + 1}`, level: S.level,
    color: PLAYER_COLORS[S.colorsUsed++ % PLAYER_COLORS.length], x: st.x + Math.cos(a) * 0.9, y: st.y + Math.sin(a) * 0.9 });
  wearBody(e, body, false);
  e.hp = e.maxHp; e.mana = e.maxMana;
  e.deck = deck.slice();
  e.draw = shuffle(S.rng, deck.slice()); e.discard = []; e.spent = [];
  e.hand = Array.from({ length: T.hand }, () => drawOne(S, e));
  S.ents.push(e);
  resolveWalls(S, e);
  const rs = anchor && roomStatusAt(S, anchor.x, anchor.y);
  if (rs?.status === "active") keepInside(e, S.floor.rooms[rs.id]);
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
  delete S.rewards[pid];
  checkLost(S);
}

function spawnFoe(S, room, bodyKey, avoid = [], level = 1) {
  const b = BODIES[bodyKey];
  const fr = S.floor.rooms[room.id];
  const doorPts = fr.doors.map((k) => [k % S.floor.w + 0.5, Math.floor(k / S.floor.w) + 0.5]);
  let x = fr.cx, y = fr.cy;
  for (let tries = 0; tries < 80; tries++) {
    const px = fr.x + 1.2 + S.rng() * (fr.w - 2.4), py = fr.y + 1.2 + S.rng() * (fr.h - 2.4);
    const nearDoor = doorPts.some(([dx, dy]) => Math.hypot(px - dx, py - dy) < 4);
    const crowd = S.ents.some((o) => o.room === room.id && !o.dead && Math.hypot(o.x - px, o.y - py) < 1.4);
    const close = avoid.some((o) => Math.hypot(o.x - px, o.y - py) < 4);
    if (!nearDoor && !crowd && !close) { x = px; y = py; break; }
  }
  if (b.boss) { x = fr.cx + fr.w * 0.2; y = fr.cy; }
  const e = baseEnt(S, { side: "foe", kind: "foe", x, y, level });
  e.room = room.id; e.awake = false;
  wearBody(e, bodyKey, false);
  e.hp = e.maxHp; e.mana = e.maxMana;
  e.deck = b.deck.slice(); e.spent = []; e.qi = Math.floor(S.rng() * e.deck.length); e.rest = 0.6 + S.rng() * 1.4;
  e.strafe = S.rng() < 0.5 ? 1 : -1; e.strafeT = 0; e.tgtId = null; e.tgtT = 0;
  S.rooms[room.id].foes.push(e.id);
  S.ents.push(e);
  return e;
}

function baseEnt(S, o) {
  return { id: S.nextId++, hp: 1, maxHp: 1, mana: 0, maxMana: 0, level: 1, shield: 0, speed: T.speed,
    r: T.radius, mx: 0, my: 0, fx: 1, fy: 0, cast: null, dash: null, slowUntil: 0, slowPct: 0, dead: false,
    hand: [], deck: [], draw: [], discard: [], spent: [], ratCd: 0, atkT: 0, forceSeq: 0, ...o };
}

// body + level → stats. Everyone gains health and mana per level; Ruby bodies gain more health, Sapphire
// bodies more mana (owner: "by having those stats they also go up"). Foes wear bodies at foeHpMul.
export function bodyStats(bodyKey, isFoe, level = 1) {
  const b = BODIES[bodyKey], g = GEM_STATS[b.gem] ?? {}, up = Math.max(0, level - 1);
  const foeMul = isFoe && !b.boss ? T.foeHpMul : 1;
  return {
    maxHp: Math.max(1, Math.round((b.hp + up * T.hpPerLevel + (g.hp ?? 0) + up * (g.hpPerLevel ?? 0)) * foeMul)),
    maxMana: T.mana + up * T.manaPerLevel + (g.mana ?? 0) + up * (g.manaPerLevel ?? 0),
    speed: T.speed * (1 + (g.speed ?? 0)) * (b.speedMul ?? 1) * (isFoe ? T.foeSpeedMul : 1),
    r: b.r ?? T.radius,
  };
}
// wearing a body keeps your wounds and the mana you've spent (both carry over)
function wearBody(e, bodyKey, keepWounds) {
  const st = bodyStats(bodyKey, e.kind === "foe", e.level ?? 1);
  const wounds = keepWounds ? e.maxHp - e.hp : 0, spentMana = keepWounds ? e.maxMana - e.mana : 0;
  e.body = bodyKey; e.gem = BODIES[bodyKey].gem;
  e.maxHp = st.maxHp; e.maxMana = st.maxMana; e.speed = st.speed; e.r = st.r;
  e.hp = Math.max(1, e.maxHp - wounds);
  e.mana = Math.max(0, e.maxMana - spentMana);
}
// party XP: every felled foe gives its level; the whole party levels together (comfortable co-op)
export function xpToNext(S) { return T.levelXp[S.level] ?? Infinity; }
function gainXp(S, n) {
  S.xp += n;
  while (S.level < T.maxLevel && S.xp >= (T.levelXp[S.level] ?? Infinity)) {
    S.level++;
    for (const p of players(S)) {
      const before = bodyStats(p.body, false, p.level);
      p.level = S.level;
      const st = bodyStats(p.body, false, p.level);
      p.maxHp = st.maxHp; p.maxMana = st.maxMana;
      if (!p.dead) { p.hp += st.maxHp - before.maxHp; p.mana += st.maxMana - before.maxMana; }
      fx(S, { type: "level", id: p.id, x: p.x, y: p.y, level: p.level, hp: st.maxHp - before.maxHp, mana: st.maxMana - before.maxMana });
    }
  }
}

// next card off the deck; when every card you could hold is spent, the free Struggle fills the slot
function drawOne(S, e) {
  if (!e.draw.length) { e.draw = shuffle(S.rng, e.discard); e.discard = []; }
  return e.draw.pop() ?? "struggle";
}

// ------------------------------------------------------------------------------------------------
// card values (gem bonus, mana cost, ramp-up time, one use vs reusable)
// ------------------------------------------------------------------------------------------------
export const isOnce = (key) => !!CARDS[key]?.once;
// spells cost mana; weapons and items are free (their ramp-up is the price). Lizard Wizard: 1 less, min 1.
export function cardCost(e, key) {
  const c = CARDS[key]; if (!c || c.type !== "spell") return 0;
  const disc = BODIES[e.body]?.passive === "spellDiscount" ? T.spellDiscount : 0;
  return Math.max(Math.min(1, c.cost ?? 0), (c.cost ?? 0) - disc);
}
export const canAfford = (e, key) => cardCost(e, key) <= (e.mana ?? 0) + 1e-9;
export function cardVals(e, key) {
  const c = CARDS[key];
  const on = !!e.body && !!c.gem && BODIES[e.body]?.gem === c.gem;
  const b = on ? c.bonus ?? {} : {};
  return {
    gemOn: on,
    dmg: (c.dmg ?? 0) + (b.dmg ?? 0),
    heal: (c.heal ?? 0) + (b.heal ?? 0),
    shield: (c.shield ?? 0) + (b.shield ?? 0),
    mana: c.mana ? c.mana + (b.mana ?? 0) : 0,
    selfHeal: c.selfHeal ?? 0,
    count: (c.summon?.count ?? 0) + (b.count ?? 0),
    unitDmg: b.unitDmg ?? 0,
    zoneDmg: c.zone ? (c.zone.dmg ?? 0) + (b.tick ?? 0) : 0,
    zoneHeal: c.zone ? (c.zone.heal ?? 0) + (c.zone.heal ? b.tick ?? 0 : 0) : 0,
  };
}
// a card's ramp-up (foes telegraph longer — FLAG asymmetry for readability)
export function windupOf(e, key) {
  const w = CARDS[key].windup;
  return e.kind === "foe" ? w * T.foeWindupMul + T.foeWindupAdd : w;
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
// distance along (dx,dy) from (x,y) before a wall (≤ max). `pad` keeps a body's radius off the wall.
export function rayToWall(S, x, y, dx, dy, max, pad = 0) {
  const step = 0.05;
  for (let d = 0; d <= max; d += step) {
    if (solidAt(S, Math.floor(x + dx * (d + pad)), Math.floor(y + dy * (d + pad)))) return Math.max(0, d - step);
  }
  return max;
}
// never returns a zero vector: a zero direction would make a line overlap every entity on the map
function norm(dx, dy, fx = 1, fy = 0) {
  const d = Math.hypot(dx, dy); if (d > 1e-6) return [dx / d, dy / d];
  const f = Math.hypot(fx, fy); return f > 1e-6 ? [fx / f, fy / f] : [1, 0];
}

// The reticle. aim = {dx, dy, dist}: a direction and (for placed cards) how far.
// Returns world geometry: {kind:"arc"|"line"|"circle", ...}. `origin` lets a live cast keep following
// its caster (swings/thrusts) while a placed card stays where it was aimed.
export function shapeOf(S, e, key, aim, origin = e) {
  const c = CARDS[key], sh = c.shape;
  const [dx, dy] = norm(aim?.dx ?? 0, aim?.dy ?? 0, e.fx, e.fy);
  const x = origin.x, y = origin.y;
  switch (sh.kind) {
    case "arc": return { kind: "arc", x, y, r: sh.r + e.r * 0.5, a: Math.atan2(dy, dx), half: (sh.deg * Math.PI) / 360, dx, dy };
    case "line": return { kind: "line", x, y, dx, dy, w: sh.w, len: rayToWall(S, x, y, dx, dy, sh.len) };
    case "shot": return { kind: "line", shot: true, x, y, dx, dy, w: sh.w, len: rayToWall(S, x, y, dx, dy, sh.range) };
    case "dash": { const len = rayToWall(S, x, y, dx, dy, sh.len, e.r); return { kind: "line", dash: true, x, y, dx, dy, w: sh.w, len }; }
    case "self": return { kind: "circle", self: true, x, y, r: sh.r, dx, dy };
    case "circle": {
      const want = Math.max(0, Math.min(sh.range, aim?.dist ?? sh.range));
      const d = Math.min(want, rayToWall(S, x, y, dx, dy, want, 0.2));
      return { kind: "circle", x: x + dx * d, y: y + dy * d, r: sh.r, dx, dy, placed: true, range: sh.range };
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
// out of the fight: the fallen, the downed, the disconnected, and foes asleep in rooms nobody entered
export const inPlay = (S, o) => !o.dead && !o.away && (o.kind !== "foe" || o.awake);

// What a shape hits: enemies (and, for heals, allies). Shots hit only the FIRST enemy along the line.
export function hitsOf(S, e, shape) {
  const foes = S.ents.filter((o) => inPlay(S, o) && hostile(e, o) && overlaps(shape, o));
  if (shape.shot && foes.length > 1) {
    foes.sort((a, b) => ((a.x - shape.x) * shape.dx + (a.y - shape.y) * shape.dy) - ((b.x - shape.x) * shape.dx + (b.y - shape.y) * shape.dy));
    return { foes: foes.slice(0, 1), allies: [] };
  }
  const allies = S.ents.filter((o) => !o.dead && !o.away && !hostile(e, o) && overlaps(shape, o));
  return { foes, allies };
}

// ------------------------------------------------------------------------------------------------
// inputs
// ------------------------------------------------------------------------------------------------
export const playerOf = (S, pid) => S.ents.find((e) => e.kind === "player" && e.pid === pid);

export function setMove(S, pid, vx, vy) {
  const e = playerOf(S, pid); if (!e) return;
  const m = Math.hypot(vx, vy);
  e.mx = m > 1 ? vx / m : vx; e.my = m > 1 ? vy / m : vy;
  if (m > 0.2) { e.fx = vx / m; e.fy = vy / m; }
}

// Co-op: the phone moves its own mimic (instant on a touch screen) and reports where it is. The server
// accepts it within what that body could have walked, through no walls; anything else snaps the phone
// back (forceSeq).
export function netMove(S, pid, m) {
  const e = playerOf(S, pid);
  if (!e || e.dead || e.away || typeof m?.x !== "number" || typeof m?.y !== "number" || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
  // a report sent before the server last moved this mimic (charge, room lock, snap-back) is stale: drop it
  if (typeof m.fs === "number" && m.fs !== e.forceSeq) return;
  e.net = true;
  if (typeof m.mx === "number" && typeof m.my === "number" && Number.isFinite(m.mx) && Number.isFinite(m.my)) setMove(S, pid, m.mx, m.my);
  if (e.dash) return;                                  // a charge is the server's to move
  // walking allowance: refills with game time at a little over the body's speed, up to a small reserve,
  // and every report spends from it — however many reports arrive in one tick
  const sp = e.speed * (S.t < e.slowUntil ? 1 - e.slowPct : 1) * (e.cast ? T.castMoveMul : 1);
  const cap = sp * 0.6 + 0.15;
  e.netAllow = Math.min(cap, (e.netAllow ?? cap) + sp * 1.3 * Math.max(0, S.t - (e.netT ?? S.t)));
  e.netT = S.t;
  let dx = m.x - e.x, dy = m.y - e.y; const d = Math.hypot(dx, dy);
  if (d > e.netAllow) { const k = e.netAllow / d; dx *= k; dy *= k; force(e); }
  e.netAllow -= Math.hypot(dx, dy);
  // walk it there in small steps so nothing tunnels through a wall or a sealed door
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.15)), x0 = e.x + dx, y0 = e.y + dy;
  for (let i = 0; i < n; i++) { e.x += dx / n; e.y += dy / n; resolveWalls(S, e); }
  if (Math.hypot(e.x - x0, e.y - y0) > 0.06) force(e);
}
const force = (e) => { if (e.kind === "player") e.forceSeq = (e.forceSeq ?? 0) + 1; };

// play hand slot `slot` with aim {dx,dy,dist}. Returns {ok} or {ok:false, why}.
export function play(S, pid, slot, aim) {
  const e = playerOf(S, pid);
  if (!e || e.dead || e.away || S.phase !== "play") return { ok: false, why: "gone" };
  if (!(slot >= 0 && slot < e.hand.length)) return { ok: false, why: "empty" };
  return beginCast(S, e, slot, aim);
}

function beginCast(S, e, slot, aim) {
  const pick = e.kind === "foe" ? foeNext(e) : { key: e.hand[slot], idx: -1 };
  const key = pick.key;
  if (!key || !CARDS[key]) return { ok: false, why: "empty" };
  if (e.cast || e.dash) return { ok: false, why: "busy" };
  const [dx, dy] = norm(Number(aim?.dx) || 0, Number(aim?.dy) || 0, e.fx, e.fy);
  e.fx = dx; e.fy = dy;
  const dist = Number.isFinite(aim?.dist) ? aim.dist : undefined;
  const a = { dx, dy, dist };
  const cost = cardCost(e, key);
  if (!canAfford(e, key)) {
    if (e.kind === "foe") return { ok: false, why: "mana" };
    // a spell flicked without the mana for it fizzles: no effect, it just cycles back into the deck
    e.cast = { key, t: 0, dur: T.fizzle, aim: a, locked: null, fizzle: true };
    e.discard.push(key);
    e.hand[slot] = drawOne(S, e);
    fx(S, { type: "fizzle", id: e.id, x: e.x, y: e.y, key });
    return { ok: true, fizzled: true };
  }
  e.mana -= cost;
  const sh = CARDS[key].shape.kind;
  // placed cards lock their spot now; swings, thrusts and charges follow you until they land
  const locked = sh === "circle" ? shapeOf(S, e, key, a) : null;
  e.cast = { key, t: 0, dur: windupOf(e, key), aim: a, locked };
  if (e.kind === "foe") {
    if (key !== "struggle") {
      if (isOnce(key)) { e.deck.splice(pick.idx, 1); e.spent.push(key); e.qi = pick.idx; }   // one use: gone from its deck
      else e.qi = pick.idx + 1;
    }
  } else {
    if (key !== "struggle") (isOnce(key) ? e.spent : e.discard).push(key);       // one use: spent for the floor
    e.hand[slot] = drawOne(S, e);
    S.stats.plays++;
  }
  // Royal Rat: every card played also summons a rat
  if (BODIES[e.body]?.passive === "playRat") summon(S, e, "rat", 1, e.x - e.fx * 0.6, e.y - e.fy * 0.6, 0);
  fx(S, { type: "cast", id: e.id, key });
  return { ok: true };
}

export function takeCard(S, pid, key) {
  const e = playerOf(S, pid), rw = S.rewards[pid];
  if (!e || !rw || rw.took || !rw.cards.includes(key)) return false;
  e.deck.push(key); e.discard.push(key); rw.took = key; return true;
}
export function wear(S, pid, bodyKey) {
  const e = playerOf(S, pid), rw = S.rewards[pid];
  if (!e || e.dead || !rw || rw.wore || !rw.bodies.includes(bodyKey)) return false;
  wearBody(e, bodyKey, true); rw.wore = bodyKey;
  fx(S, { type: "wear", id: e.id, body: bodyKey }); return true;
}
export function closeReward(S, pid) { delete S.rewards[pid]; }

// ------------------------------------------------------------------------------------------------
// step
// ------------------------------------------------------------------------------------------------
export function step(S, dt = DT) {
  if (S.phase !== "play") { S.t += dt; pruneFx(S); return; }
  S.t += dt;
  for (const e of S.ents) if (!e.dead && !e.away) tickEnt(S, e, dt);
  tickProjs(S, dt);
  tickZones(S, dt);
  separate(S);
  for (const e of S.ents) if (!e.dead && !e.dash) resolveWalls(S, e);
  revives(S, dt);
  rooms(S);
  reveal(S);
  S.ents = S.ents.filter((e) => !e.dead || e.kind === "player" || S.t - e.diedAt < 0.6);
  pruneFx(S);
}

function tickEnt(S, e, dt) {
  if (e.kind === "unit") { tickUnit(S, e, dt); return; }
  if (e.kind === "foe") { if (!e.awake) return; thinkFoe(S, e, dt); }
  // a charge in progress
  if (e.dash) {
    const d = e.dash; d.t += dt;
    const k = Math.min(1, d.t / d.dur);
    e.x = d.x0 + (d.x1 - d.x0) * k; e.y = d.y0 + (d.y1 - d.y0) * k;
    if (k >= 1) { e.dash = null; force(e); }
    return;
  }
  // ramp-up
  if (e.cast) {
    e.cast.t += dt;
    if (e.cast.t >= e.cast.dur) { const c = e.cast; e.cast = null; resolveCard(S, e, c); }
  }
  // movement (players by stick — or by their phone in co-op; foes set mx/my in thinkFoe)
  if (e.net) return;
  let sp = e.speed * (S.t < e.slowUntil ? 1 - e.slowPct : 1);
  if (e.cast) sp *= e.kind === "foe" ? 0 : T.castMoveMul;
  moveEnt(S, e, e.mx * sp, e.my * sp, dt);
}
// the client predicts its own walking with exactly the server's rules
export function walk(S, e, dt) {
  let sp = e.speed * (S.t < e.slowUntil ? 1 - e.slowPct : 1);
  if (e.cast) sp *= T.castMoveMul;
  moveEnt(S, e, e.mx * sp, e.my * sp, dt);
}

function resolveCard(S, e, c) {
  if (c.fizzle) return;
  const card = CARDS[c.key], v = cardVals(e, c.key);
  const shape = c.locked ?? shapeOf(S, e, c.key, c.aim);
  if (!shape) return;
  if (v.mana) { const b = e.mana; e.mana = Math.min(e.maxMana, e.mana + v.mana); if (e.mana > b) fx(S, { type: "mana", id: e.id, x: e.x, y: e.y, amt: Math.round(e.mana - b) }); }
  fx(S, { type: "land", id: e.id, side: e.side, key: c.key, shape });
  if (card.shape.kind === "shot") {
    const sh = card.shape;
    S.projs.push({ x: e.x, y: e.y, dx: shape.dx, dy: shape.dy, speed: sh.speed, left: shape.len, w: sh.w,
      dmg: v.dmg, side: e.side, owner: e.id, key: c.key });
    return;
  }
  if (card.shape.kind === "dash") {
    const end = { x: e.x + shape.dx * shape.len, y: e.y + shape.dy * shape.len };
    e.dash = { x0: e.x, y0: e.y, x1: end.x, y1: end.y, t: 0, dur: Math.max(0.08, shape.len / T.dashSpeed) };
  }
  const { foes, allies } = hitsOf(S, e, shape);
  if (v.dmg) for (const o of foes) damage(S, o, v.dmg, e, c.key);
  if (v.heal) for (const o of allies) heal(S, o, v.heal);
  if (v.shield) { e.shield = Math.min(T.shieldCap, e.shield + v.shield); fx(S, { type: "shield", id: e.id, amt: v.shield }); }
  if (v.selfHeal) heal(S, e, v.selfHeal);
  if (card.zone) S.zones.push({ x: shape.x, y: shape.y, r: shape.r, until: S.t + card.zone.dur, every: card.zone.every,
    next: S.t + card.zone.every, dmg: v.zoneDmg, heal: v.zoneHeal, slow: card.zone.slow ?? 0, side: e.side, owner: e.id, key: c.key });
  if (card.summon) summon(S, e, card.summon.unit, v.count, shape.x, shape.y, v.unitDmg);
}

export function damage(S, o, amt, src, what = "?") {
  if (o.dead || o.away || amt <= 0) return;
  let a = amt;
  if (o.shield > 0) { const s = Math.min(o.shield, a); o.shield -= s; a -= s; }
  o.hp -= a;
  if (src?.side === "hero") S.stats.dealt += amt;
  else if (o.kind === "player") { S.stats.taken += a; const tb = (S.stats.takenBy ??= {}); tb[what] = (tb[what] ?? 0) + a; }
  fx(S, { type: "dmg", id: o.id, x: o.x, y: o.y, amt });
  if (o.kind === "foe") o.awake = true;
  // Fat Cat: being attacked summons a rat
  if (BODIES[o.body]?.passive === "hitRat" && S.t >= o.ratCd && o.hp > 0) {
    o.ratCd = S.t + T.fatCatCooldown;
    summon(S, o, "rat", 1, o.x, o.y, 0);
  }
  // the boss calls its pack once, at half health
  if (BODIES[o.body]?.boss && !o.addsCalled && o.hp > 0 && o.hp <= o.maxHp * BOSS_ADDS.at) {
    o.addsCalled = true;
    const rs = S.rooms[o.room], fr = S.floor.rooms[o.room];
    const n = BOSS_ADDS.count + BOSS_ADDS.perPlayer * (partySize(S) - 1);
    const heroes = players(S).filter((p) => !p.dead);
    for (let i = 0; i < n; i++) {
      const f = spawnFoe(S, fr, BOSS_ADDS.body, heroes, T.addsLevel); f.awake = true; f.rest = 0.5 + i * 0.15;
      fx(S, { type: "summon", id: f.id, x: f.x, y: f.y, unit: "pack" });
    }
    fx(S, { type: "pack", room: rs.id });
  }
  if (o.hp <= 0) kill(S, o);
}
function heal(S, o, amt) {
  if (o.dead || amt <= 0) return;
  const before = o.hp; o.hp = Math.min(o.maxHp, o.hp + amt);
  if (o.hp > before) fx(S, { type: "heal", id: o.id, x: o.x, y: o.y, amt: o.hp - before });
}
function kill(S, o) {
  o.hp = 0; o.dead = true; o.diedAt = S.t; o.cast = null; o.dash = null; o.mx = o.my = 0;
  fx(S, { type: o.kind === "player" ? "down" : "die", id: o.id, x: o.x, y: o.y, kind: o.kind });
  if (o.kind === "foe") {
    const rs = S.rooms[o.room]; if (rs) rs.fallen.push({ body: o.body, deck: [...o.deck, ...o.spent] });
    gainXp(S, o.level ?? 1);
  }
  if (o.kind === "player") { o.revive = 0; checkLost(S); }
}
// lost only when every player is down. A friend who just dropped (away, still standing) keeps the run
// alive through the reconnect grace period — a phone blip must not end everyone's run.
function checkLost(S) {
  if (S.phase !== "play") return;
  const ps = players(S);
  if (ps.length && ps.every((p) => p.dead)) { S.phase = "lost"; S.endedAt = S.t; }
}
function standUp(S, p) {
  p.dead = false; p.hp = Math.max(1, Math.ceil(p.maxHp * T.reviveHp)); p.revive = 0; S.stats.revives++;
  fx(S, { type: "revive", id: p.id, x: p.x, y: p.y });
}
// a friend standing beside a downed player fills their ring; walking off lets it drain
function revives(S, dt) {
  for (const p of players(S)) {
    if (!p.dead || p.away) continue;
    const helpers = players(S).filter((h) => !h.dead && !h.away && Math.hypot(h.x - p.x, h.y - p.y) <= T.reviveRange + h.r).length;
    p.revive = helpers ? (p.revive ?? 0) + dt * helpers : Math.max(0, (p.revive ?? 0) - dt * 0.5);
    if (p.revive >= T.reviveTime) standUp(S, p);
  }
}

function summon(S, owner, unitKey, count, x, y, unitDmg) {
  const u = UNITS[unitKey];
  for (let i = 0; i < count; i++) {
    const mine = S.ents.filter((e) => e.kind === "unit" && e.owner === owner.id && e.unit === unitKey && !e.dead);
    if (unitKey === "rat" && mine.length >= T.ratCap) { const old = mine[0]; old.dead = true; old.diedAt = S.t; fx(S, { type: "die", id: old.id, x: old.x, y: old.y, kind: "unit" }); }
    const a = S.rng() * Math.PI * 2, d = count > 1 ? 0.35 : 0.05;
    const e = baseEnt(S, { side: owner.side, kind: "unit", unit: unitKey, owner: owner.id, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      r: u.r, hp: u.hp, maxHp: u.hp, speed: u.speed, life: u.life, bornAt: S.t, atkT: S.t + 0.3, bonus: unitDmg, room: owner.room });
    S.ents.push(e);
    resolveWalls(S, e);
    fx(S, { type: "summon", id: e.id, x: e.x, y: e.y, unit: unitKey });
  }
}

function tickUnit(S, e, dt) {
  const u = UNITS[e.unit];
  if (S.t - e.bornAt >= e.life) { e.dead = true; e.diedAt = S.t; fx(S, { type: "die", id: e.id, x: e.x, y: e.y, kind: "unit" }); return; }
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
        if (a.kind === "bite") { damage(S, tgt, a.dmg + (e.bonus ?? 0), e, e.unit); fx(S, { type: "bite", id: e.id, x: tgt.x, y: tgt.y }); }
        else S.projs.push({ x: e.x, y: e.y, dx: ux, dy: uy, speed: a.speed, left: a.range + 1,
          w: a.w, dmg: a.dmg + (e.bonus ?? 0), side: e.side, owner: e.id, key: "bolt" });
      }
      if (a.kind === "bolt" && d < a.keepAway) { vx = -ux; vy = -uy; }
    } else { vx = ux; vy = uy; }
  } else {
    // heel: follow the owner; if left far behind (a locked door), hop back to them
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

// ---- foe brain: pick a target (spreading out over the party), walk into range of the card on top of
// its queue the way its role walks, wait for its turn, aim, wind up, land ----
// a foe plays its deck in order, skipping spells it can't pay for; out of everything → Struggle
function foeNext(e) {
  const n = e.deck.length;
  for (let k = 0; k < n; k++) { const idx = (e.qi + k) % n; if (canAfford(e, e.deck[idx])) return { key: e.deck[idx], idx }; }
  return { key: "struggle", idx: -1 };
}
export function nextCardOf(e) { return e.kind === "foe" ? foeNext(e).key : null; }

export function preferredRange(e, key, tgt) {
  const sh = CARDS[key].shape, tr = tgt?.r ?? T.radius;
  switch (sh.kind) {
    case "arc": return sh.r * 0.8 + tr;
    case "line": return Math.min(sh.len * 0.75, 5.5);
    case "shot": return Math.min(sh.range * 0.6, 5.5);
    case "circle": return Math.min(sh.range * 0.75, 5.5);
    case "self": return sh.r ? sh.r * 0.65 + tr : 99;
    case "dash": return sh.len * 0.8;
  }
  return 2;
}
const roleOf = (e) => BODIES[e.body]?.role ?? "melee";
// how many of this room's foes may be winding up at once (swarms and the boss don't need a turn)
const needsTurn = (e) => !["swarm", "boss"].includes(roleOf(e));
function turnFree(S, e) {
  if (!needsTurn(e)) return true;
  let busy = 0;
  for (const o of S.ents) if (o !== e && o.kind === "foe" && !o.dead && o.room === e.room && o.cast && needsTurn(o)) busy++;
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

function thinkFoe(S, e, dt) {
  e.mx = e.my = 0;
  if (e.cast || e.dash) return;
  const tgt = pickTarget(S, e);
  if (!tgt) return;
  const role = roleOf(e);
  const { key, idx } = foeNext(e), card = CARDS[key];
  const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1;
  if (dx || dy) { e.fx = dx / d; e.fy = dy / d; }    // standing exactly on a target keeps the old facing
  const want = preferredRange(e, key, tgt);
  const support = !card.dmg && !card.zone?.dmg;
  const skip = () => { e.qi = idx + 1; };            // pass over a card that isn't worth playing right now
  let healTo = null;
  if (support && card.heal) {
    // a heal with nobody hurt nearby just rotates to the next card; otherwise walk to the hurt friend
    const hurt = S.ents.filter((o) => !o.dead && o.side === e.side && o.kind !== "unit" && o.hp < o.maxHp)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!hurt) { skip(); return; }
    if (Math.hypot(hurt.x - e.x, hurt.y - e.y) > card.shape.r * 0.8) healTo = hurt;
  }
  // a Mana Vial is only worth drinking when low (and when there's a spell to spend it on)
  if (card.mana && (e.mana > e.maxMana * 0.4 || !e.deck.some((k) => CARDS[k].type === "spell"))) { skip(); return; }
  e.rest -= dt;
  const los = rayToWall(S, e.x, e.y, dx / d, dy / d, d) >= d - 0.1;
  const inRange = support ? !healTo : d <= want * 1.15;
  if (e.rest <= 0 && inRange && los && turnFree(S, e)) {
    beginCast(S, e, 0, { dx, dy, dist: d });
    e.rest = T.foeCastGap * (role === "swarm" ? 0.6 : 1);
    return;
  }
  // feet, by role
  const keepAway = role === "ranger" || role === "caster" || role === "healer";
  if (healTo) { const hx = healTo.x - e.x, hy = healTo.y - e.y, hd = Math.hypot(hx, hy) || 1; e.mx = hx / hd; e.my = hy / hd; return; }
  if (support) return;
  if (d > want * 0.95 || !los) { e.mx = dx / d; e.my = dy / d; }
  else if (keepAway && d < want * 0.6) { e.mx = -dx / d; e.my = -dy / d; }
  else if (keepAway || role === "swarm") {
    // in range and waiting: sidestep around the target so it never stands still as a free hit
    e.strafeT -= dt;
    if (e.strafeT <= 0) { e.strafe = -e.strafe; e.strafeT = 1.4 + S.rng() * 1.2; }
    const sx = -dy / d * e.strafe, sy = dx / d * e.strafe;
    if (rayToWall(S, e.x, e.y, sx, sy, 0.8, e.r) < 0.4) e.strafe = -e.strafe;
    const k = role === "swarm" ? 0.7 : 0.45;
    e.mx = -dy / d * e.strafe * k; e.my = dx / d * e.strafe * k;
  }
}

// ---- projectiles / zones ----
function tickProjs(S, dt) {
  for (const p of S.projs) {
    let travel = p.speed * dt;
    while (travel > 0 && !p.done) {
      const stepLen = Math.min(0.2, travel); travel -= stepLen;
      p.x += p.dx * stepLen; p.y += p.dy * stepLen; p.left -= stepLen;
      if (p.left <= 0 || solidAt(S, Math.floor(p.x), Math.floor(p.y))) { p.done = true; fx(S, { type: "fizzle", x: p.x, y: p.y, key: p.key }); break; }
      for (const o of S.ents) {
        if (!inPlay(S, o) || o.side === p.side) continue;
        if (Math.hypot(o.x - p.x, o.y - p.y) <= o.r + p.w / 2) {
          const src = S.ents.find((s) => s.id === p.owner) ?? { side: p.side };
          damage(S, o, p.dmg, src, p.key); p.done = true; fx(S, { type: "pop", x: p.x, y: p.y, key: p.key }); break;
        }
      }
    }
  }
  S.projs = S.projs.filter((p) => !p.done);
}
function tickZones(S, dt) {
  for (const z of S.zones) {
    for (const o of S.ents) {
      if (!inPlay(S, o)) continue;
      const inside = Math.hypot(o.x - z.x, o.y - z.y) <= z.r + o.r;
      if (inside && z.slow && o.side !== z.side) { o.slowUntil = S.t + 0.15; o.slowPct = z.slow; }
    }
    if (S.t >= z.next) {
      z.next += z.every;
      const src = S.ents.find((s) => s.id === z.owner) ?? { side: z.side };
      for (const o of S.ents) {
        if (!inPlay(S, o) || Math.hypot(o.x - z.x, o.y - z.y) > z.r + o.r) continue;
        if (o.side !== z.side && z.dmg) damage(S, o, z.dmg, src, z.key);
        else if (o.side === z.side && z.heal) heal(S, o, z.heal);
      }
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
      if (d < 1e-6) {   // centre inside the tile: leave by the nearest face that opens onto floor
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
    // summons slip through their own side (no conga lines), and so do friends; bodies bump foes
    if (a.side === b.side && (a.kind !== "foe" || b.kind !== "foe")) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
    if (d >= min) continue;
    // exactly stacked (e.g. a summon placed on a foe's centre) still gets pulled apart
    const [nx, ny] = d > 1e-6 ? [dx / d, dy / d] : [1, 0];
    const push = (min - d) / 2;
    // units give way to bodies; a boss doesn't budge. No single shove moves anyone more than 0.25
    // tiles, so a push can never carry a body through a wall or a locked door in one step.
    const wa = a.kind === "unit" ? 1.6 : BODIES[a.body]?.boss ? 0.1 : 1, wb = b.kind === "unit" ? 1.6 : BODIES[b.body]?.boss ? 0.1 : 1;
    const ma = Math.min(0.25, push * wa / ((wa + wb) / 2)), mb = Math.min(0.25, push * wb / ((wa + wb) / 2));
    a.x -= nx * ma; a.y -= ny * ma;
    b.x += nx * mb; b.y += ny * mb;
    if (a.net && ma > 0.12) force(a);
    if (b.net && mb > 0.12) force(b);
  }
}

// ---- rooms: lock on entry, wake (and scale for the party), open + reward on clear, boss = floor done ----
export const ENTER_INSET = 0.3;
function keepInside(e, fr) {
  const m = e.r + 0.02, x = e.x, y = e.y;
  e.x = Math.max(fr.x + m, Math.min(fr.x + fr.w - m, e.x));
  e.y = Math.max(fr.y + m, Math.min(fr.y + fr.h - m, e.y));
  if (Math.hypot(e.x - x, e.y - y) > 0.05) force(e);
}
function rooms(S) {
  if (S.phase !== "play") return;   // a wipe this step stands; no clearing, reviving or rewarding after it
  const f = S.floor;
  const standing = players(S).filter((e) => !e.dead && !e.away);
  for (const rs of S.rooms) {
    const fr = f.rooms[rs.id];
    if (rs.status === "idle") {
      // entered = centre 0.3 inside the edge. A body can't get closer than its radius (0.38) to a
      // wall, so the only edge strip that doesn't count is a doorway — no sneaking along the walls.
      const inside = standing.find((p) => { const r = roomAt(f, p.x, p.y, ENTER_INSET); return r && r.id === rs.id; });
      if (!inside) continue;
      rs.status = "active";
      for (const k of fr.doors) S.locked.add(k);
      // the whole party comes in together (and the downed are carried along); summons follow. A charge
      // in progress stops where it is (its end point was worked out while the doors were still open).
      for (const e of S.ents) if (!e.away && (e.kind === "player" || (e.kind === "unit" && !e.dead)) && e.side === "hero") {
        e.dash = null;
        const r = roomAt(f, e.x, e.y, ENTER_INSET);
        if (!r || r.id !== rs.id) { e.x = inside.x + (S.rng() - 0.5) * 1.2; e.y = inside.y + (S.rng() - 0.5) * 1.2; force(e); }
        keepInside(e, fr);
      }
      // the room wakes, sized for the party: one extra foe per extra player, and tougher foes
      const n = partySize(S);
      for (let i = 0; i < n - 1 && rs.enc; i++) {
        const xf = spawnFoe(S, fr, rs.enc.extra[i % rs.enc.extra.length], standing, rs.level ?? 1);
        fx(S, { type: "summon", id: xf.id, x: xf.x, y: xf.y, unit: "extra" });
      }
      for (const id of rs.foes) {
        const e = S.ents.find((o) => o.id === id); if (!e) continue;
        const mul = 1 + (n - 1) * (BODIES[e.body].boss ? T.coopBossHp : T.coopFoeHp);
        e.maxHp = Math.round(e.maxHp * mul); e.hp = e.maxHp; e.awake = true;
      }
      fx(S, { type: "lock", room: rs.id, name: rs.enc?.name ?? (rs.kind === "boss" ? BODIES[BOSS].name : "") });
    } else if (rs.status === "active") {
      // safety net: nobody in this fight can end up outside its sealed room (a run could never clear)
      for (const e of S.ents) {
        if (e.dead && e.kind !== "player") continue;
        if (e.dash || e.away) continue;
        const ours = e.side === "hero" ? e.kind !== "foe" : rs.foes.includes(e.id) || (e.kind === "unit" && e.room === rs.id);
        if (ours) keepInside(e, fr);
      }
      const left = rs.foes.filter((id) => S.ents.some((o) => o.id === id && !o.dead));
      if (left.length) continue;
      rs.status = "clear"; S.stats.rooms++;
      for (const k of fr.doors) S.locked.delete(k);
      // foe summons crumble with their masters; their shots in flight fizzle
      for (const e of S.ents) if (e.kind === "unit" && e.side === "foe" && !e.dead) { e.dead = true; e.diedAt = S.t; }
      S.projs = S.projs.filter((p) => p.side !== "foe");
      // everyone who went down gets back up
      for (const p of players(S)) if (p.dead && !p.away) standUp(S, p);
      fx(S, { type: "clear", room: rs.id });
      if (rs.kind === "boss") { S.phase = "won"; S.endedAt = S.t; continue; }
      for (const p of players(S)) {
        if (p.away) continue;
        heal(S, p, T.roomClearHeal);
        const pool = [...new Set(rs.fallen.flatMap((x) => x.deck))].filter((k) => k !== "struggle");
        shuffle(S.rng, pool);
        const bodies = shuffle(S.rng, [...new Set(rs.fallen.map((x) => x.body))].filter((b) => b !== p.body && !BODIES[b].boss)).slice(0, 3);
        S.rewards[p.pid] = { room: rs.id, cards: pool.slice(0, 3), bodies, took: null, wore: null };
      }
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
export const catalog = () => ({ CARDS, BODIES, UNITS });
