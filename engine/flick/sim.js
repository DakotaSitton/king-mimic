// King Mimic — FLICK mode simulation. Pure, seedable, no DOM: the browser runs it every frame and the
// tests run it headless. Every rule reads engine/flick/content.js (the owner's editable table).
//
// The one geometry function `shapeOf` is used for BOTH the aim reticle the client draws and the hit the
// card resolves, so the reticle is never a guess — what it outlines is what gets hit.
//
// Parity: players, foes and summons are all `ents` with the same hp / shield / mana / hand-of-cards
// rules and the same `beginCast → windup → resolve` path. Deliberate asymmetries (all FLAG in TUNING):
// foes wind up longer (so you can read and dodge them on a phone), stand still while winding up, move
// a little slower and regain mana a little slower; floor-1 foes wear their bodies at reduced HP.
//
// Co-op seam: `players` is a list and every input is keyed by pid; a server could host this same state.
// This first demo runs it locally in the page.

import { CARDS, BODIES, UNITS, GEM_STATS, TUNING as T, FOE_POOL, ROOM_FOES, BOSS } from "./content.js";
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
export function createRun({ seed = Date.now() % 2147483647, players }) {
  const rng = rngFrom(seed);
  const floor = makeFloor(rng, { fights: ROOM_FOES.length });
  const S = {
    seed, rng, t: 0, phase: "play", floor, nextId: 1,
    locked: new Set(), seen: new Uint8Array(floor.w * floor.h),
    ents: [], projs: [], zones: [], fx: [],
    rooms: floor.rooms.map((r) => ({ id: r.id, kind: r.kind, status: r.kind === "start" ? "clear" : "idle", foes: [], fallen: [] })),
    rewards: {}, stats: { plays: 0, dealt: 0, taken: 0, rooms: 0 },
  };
  players.forEach((p, i) => addPlayer(S, p, i));
  // foes wait asleep in their rooms; the boss in the last one
  let fightNo = 0;
  for (const r of floor.rooms) {
    if (r.kind === "fight") {
      const n = ROOM_FOES[fightNo++] ?? 3;
      for (let i = 0; i < n; i++) spawnFoe(S, r, FOE_POOL[Math.floor(rng() * FOE_POOL.length)]);
    } else if (r.kind === "boss") spawnFoe(S, r, BOSS);
  }
  reveal(S);
  return S;
}

function addPlayer(S, { id, body, deck }, i) {
  const st = S.floor.start;
  const e = baseEnt(S, { side: "hero", kind: "player", pid: id, x: st.x + (i % 2 ? 0.9 : 0) - 0.45 * (i > 0), y: st.y + (i > 1 ? 0.9 : 0) });
  wearBody(e, body, false);
  e.hp = e.maxHp; e.mana = Math.min(e.maxMana, T.startMana);
  e.deck = deck.slice();
  e.draw = shuffle(S.rng, deck.slice()); e.discard = [];
  e.hand = Array.from({ length: T.hand }, () => drawOne(S, e));
  S.ents.push(e);
  return e;
}

function spawnFoe(S, room, bodyKey) {
  const b = BODIES[bodyKey];
  const fr = S.floor.rooms[room.id];
  const doorPts = fr.doors.map((k) => [k % S.floor.w + 0.5, Math.floor(k / S.floor.w) + 0.5]);
  let x = fr.cx, y = fr.cy;
  for (let tries = 0; tries < 60; tries++) {
    const px = fr.x + 1.2 + S.rng() * (fr.w - 2.4), py = fr.y + 1.2 + S.rng() * (fr.h - 2.4);
    const nearDoor = doorPts.some(([dx, dy]) => Math.hypot(px - dx, py - dy) < 3.2);
    const crowd = S.ents.some((o) => o.room === room.id && Math.hypot(o.x - px, o.y - py) < 1.6);
    if (!nearDoor && !crowd) { x = px; y = py; break; }
  }
  if (b.boss) { x = fr.cx + fr.w * 0.18; y = fr.cy; }
  const e = baseEnt(S, { side: "foe", kind: "foe", x, y });
  e.room = room.id; e.awake = false;
  wearBody(e, bodyKey, false);
  e.hp = e.maxHp; e.mana = 1 + S.rng() * 3;
  e.deck = b.deck.slice(); e.qi = Math.floor(S.rng() * e.deck.length); e.rest = 0.6 + S.rng() * 1.2;
  S.rooms[room.id].foes.push(e.id);
  S.ents.push(e);
  return e;
}

function baseEnt(S, o) {
  return { id: S.nextId++, hp: 1, maxHp: 1, shield: 0, mana: 0, maxMana: T.mana, regen: T.regen, speed: T.speed,
    r: T.radius, mx: 0, my: 0, fx: 1, fy: 0, cast: null, dash: null, slowUntil: 0, slowPct: 0, dead: false,
    hand: [], deck: [], draw: [], discard: [], ratCd: 0, atkT: 0, ...o };
}

// body → stats. Gems add the owner's stat; foes wear bodies at TUNING.foeHpMul.
export function bodyStats(bodyKey, isFoe) {
  const b = BODIES[bodyKey], g = GEM_STATS[b.gem] ?? {};
  const foeMul = isFoe && !b.boss ? T.foeHpMul : 1;
  return {
    maxHp: Math.max(1, Math.round((b.hp + (g.hp ?? 0)) * foeMul)),
    speed: T.speed * (1 + (g.speed ?? 0)) * (isFoe ? T.foeSpeedMul : 1),
    maxMana: T.mana + (g.mana ?? 0),
    regen: T.regen * (1 + (g.regen ?? 0)) * (isFoe ? T.foeRegenMul : 1) * (b.regenMul ?? 1),
    r: b.r ?? T.radius,
  };
}
function wearBody(e, bodyKey, keepWounds) {
  const st = bodyStats(bodyKey, e.kind === "foe");
  const wounds = keepWounds ? e.maxHp - e.hp : 0;
  e.body = bodyKey; e.gem = BODIES[bodyKey].gem;
  e.maxHp = st.maxHp; e.speed = st.speed; e.maxMana = st.maxMana; e.regen = st.regen; e.r = st.r;
  e.hp = Math.max(1, e.maxHp - wounds);
  e.mana = Math.min(e.mana, e.maxMana);
}

function drawOne(S, e) {
  if (!e.draw.length) { e.draw = shuffle(S.rng, e.discard); e.discard = []; }
  return e.draw.pop() ?? null;
}

// ------------------------------------------------------------------------------------------------
// card values (gem bonus + Lizard Wizard discount)
// ------------------------------------------------------------------------------------------------
export function cardCost(e, key) {
  const c = CARDS[key]; if (!c) return 99;
  const disc = e.body && BODIES[e.body].passive === "spellDiscount" && c.type === "spell" ? 1 : 0;
  // FLAG: the discount never makes a card free (a free Arcane Orb could be spammed without limit)
  return disc ? Math.max(Math.min(1, c.cost), c.cost - disc) : c.cost;
}
export function cardVals(e, key) {
  const c = CARDS[key];
  const on = !!e.body && BODIES[e.body]?.gem === c.gem;
  const b = on ? c.bonus ?? {} : {};
  return {
    gemOn: on,
    dmg: (c.dmg ?? 0) + (b.dmg ?? 0),
    heal: (c.heal ?? 0) + (b.heal ?? 0),
    shield: (c.shield ?? 0) + (b.shield ?? 0),
    selfHeal: c.selfHeal ?? 0,
    count: (c.summon?.count ?? 0) + (b.count ?? 0),
    unitDmg: b.unitDmg ?? 0,
    zoneDmg: c.zone ? (c.zone.dmg ?? 0) + (b.tick ?? 0) : 0,
    zoneHeal: c.zone ? (c.zone.heal ?? 0) + (c.zone.heal ? b.tick ?? 0 : 0) : 0,
  };
}
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
function norm(dx, dy, fx = 1, fy = 0) { const d = Math.hypot(dx, dy); return d > 1e-6 ? [dx / d, dy / d] : [fx, fy]; }

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
// foes asleep in rooms nobody has entered are out of the fight (and hidden by fog)
const inPlay = (S, o) => !o.dead && (o.kind !== "foe" || o.awake);

// What a shape hits: enemies (and, for heals, allies). Shots hit only the FIRST enemy along the line.
export function hitsOf(S, e, shape) {
  const foes = S.ents.filter((o) => inPlay(S, o) && hostile(e, o) && overlaps(shape, o));
  if (shape.shot && foes.length > 1) {
    foes.sort((a, b) => ((a.x - shape.x) * shape.dx + (a.y - shape.y) * shape.dy) - ((b.x - shape.x) * shape.dx + (b.y - shape.y) * shape.dy));
    return { foes: foes.slice(0, 1), allies: [] };
  }
  const allies = S.ents.filter((o) => !o.dead && !hostile(e, o) && overlaps(shape, o));
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

// play hand slot `slot` with aim {dx,dy,dist}. Returns {ok} or {ok:false, why}.
export function play(S, pid, slot, aim) {
  const e = playerOf(S, pid);
  if (!e || e.dead || S.phase !== "play") return { ok: false, why: "gone" };
  return beginCast(S, e, slot, aim);
}

function beginCast(S, e, slot, aim) {
  const key = e.kind === "foe" ? e.deck[e.qi % e.deck.length] : e.hand[slot];
  if (!key || !CARDS[key]) return { ok: false, why: "empty" };
  if (e.cast || e.dash) return { ok: false, why: "busy" };
  const cost = cardCost(e, key);
  if (e.mana < cost) return { ok: false, why: "mana" };
  e.mana -= cost;
  const [dx, dy] = norm(aim?.dx ?? 0, aim?.dy ?? 0, e.fx, e.fy);
  e.fx = dx; e.fy = dy;
  const a = { dx, dy, dist: aim?.dist };
  const sh = CARDS[key].shape.kind;
  // placed cards lock their spot now; swings, thrusts and charges follow you until they land
  const locked = sh === "circle" ? shapeOf(S, e, key, a) : null;
  e.cast = { key, t: 0, dur: windupOf(e, key), aim: a, locked };
  if (e.kind === "foe") { e.qi++; }
  else {
    e.discard.push(key);
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
  if (!e || !rw || rw.wore || !rw.bodies.includes(bodyKey)) return false;
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
  for (const e of S.ents) if (!e.dead) tickEnt(S, e, dt);
  tickProjs(S, dt);
  tickZones(S, dt);
  separate(S);
  for (const e of S.ents) if (!e.dead) resolveWalls(S, e);
  rooms(S);
  reveal(S);
  S.ents = S.ents.filter((e) => !e.dead || e.kind === "player" || S.t - e.diedAt < 0.6);
  pruneFx(S);
}

function tickEnt(S, e, dt) {
  e.mana = Math.min(e.maxMana, e.mana + e.regen * dt);
  if (e.kind === "unit") { tickUnit(S, e, dt); return; }
  if (e.kind === "foe") { if (!e.awake) return; thinkFoe(S, e, dt); }
  // dash in progress
  if (e.dash) {
    const d = e.dash; d.t += dt;
    const k = Math.min(1, d.t / d.dur);
    e.x = d.x0 + (d.x1 - d.x0) * k; e.y = d.y0 + (d.y1 - d.y0) * k;
    if (k >= 1) e.dash = null;
    return;
  }
  // windup
  if (e.cast) {
    e.cast.t += dt;
    if (e.cast.t >= e.cast.dur) { const c = e.cast; e.cast = null; resolveCard(S, e, c); }
  }
  // movement (players by stick; foes set mx/my in thinkFoe)
  let sp = e.speed * (S.t < e.slowUntil ? 1 - e.slowPct : 1);
  if (e.cast) sp *= e.kind === "foe" ? 0 : T.castMoveMul;
  moveEnt(S, e, e.mx * sp, e.my * sp, dt);
}

function resolveCard(S, e, c) {
  const card = CARDS[c.key], v = cardVals(e, c.key);
  const shape = c.locked ?? shapeOf(S, e, c.key, c.aim);
  if (!shape) return;
  fx(S, { type: "land", id: e.id, side: e.side, key: c.key, shape });
  if (card.shape.kind === "shot") {
    const sh = card.shape;
    S.projs.push({ x: e.x, y: e.y, dx: shape.dx, dy: shape.dy, speed: sh.speed, left: shape.len, w: sh.w,
      dmg: v.dmg, side: e.side, owner: e.id, key: c.key });
    return;
  }
  if (card.shape.kind === "dash") {
    const end = { x: e.x + shape.dx * shape.len, y: e.y + shape.dy * shape.len };
    e.dash = { x0: e.x, y0: e.y, x1: end.x, y1: end.y, t: 0, dur: Math.max(0.08, shape.len / 22) };
  }
  const { foes, allies } = hitsOf(S, e, shape);
  if (v.dmg) for (const o of foes) damage(S, o, v.dmg, e, c.key);
  if (v.heal) for (const o of allies) heal(S, o, v.heal);
  if (v.shield) { e.shield = Math.min(12, e.shield + v.shield); fx(S, { type: "shield", id: e.id, amt: v.shield }); }
  if (v.selfHeal) heal(S, e, v.selfHeal);
  if (card.zone) S.zones.push({ x: shape.x, y: shape.y, r: shape.r, until: S.t + card.zone.dur, every: card.zone.every,
    next: S.t + card.zone.every, dmg: v.zoneDmg, heal: v.zoneHeal, slow: card.zone.slow ?? 0, side: e.side, owner: e.id, key: c.key });
  if (card.summon) summon(S, e, card.summon.unit, v.count, shape.x, shape.y, v.unitDmg);
}

export function damage(S, o, amt, src, what = "?") {
  if (o.dead || amt <= 0) return;
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
  if (o.hp <= 0) kill(S, o);
}
function heal(S, o, amt) {
  if (o.dead || amt <= 0) return;
  const before = o.hp; o.hp = Math.min(o.maxHp, o.hp + amt);
  if (o.hp > before) fx(S, { type: "heal", id: o.id, x: o.x, y: o.y, amt: o.hp - before });
}
function kill(S, o) {
  o.hp = 0; o.dead = true; o.diedAt = S.t; o.cast = null; o.dash = null;
  fx(S, { type: "die", id: o.id, x: o.x, y: o.y, kind: o.kind });
  if (o.kind === "foe") {
    const rs = S.rooms[o.room]; if (rs) rs.fallen.push({ body: o.body, deck: o.deck.slice() });
  }
  if (o.kind === "player" && S.ents.filter((e) => e.kind === "player" && !e.dead).length === 0) { S.phase = "lost"; S.endedAt = S.t; }
}

function summon(S, owner, unitKey, count, x, y, unitDmg) {
  const u = UNITS[unitKey];
  for (let i = 0; i < count; i++) {
    const mine = S.ents.filter((e) => e.kind === "unit" && e.owner === owner.id && e.unit === unitKey && !e.dead);
    if (unitKey === "rat" && mine.length >= T.ratCap) { const old = mine[0]; old.dead = true; old.diedAt = S.t; fx(S, { type: "die", id: old.id, x: old.x, y: old.y, kind: "unit" }); }
    const a = S.rng() * Math.PI * 2, d = count > 1 ? 0.35 : 0;
    const e = baseEnt(S, { side: owner.side, kind: "unit", unit: unitKey, owner: owner.id, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      r: u.r, hp: u.hp, maxHp: u.hp, speed: u.speed, life: u.life, bornAt: S.t, atkT: S.t + 0.3, bonus: unitDmg, room: owner.room });
    S.ents.push(e);
    fx(S, { type: "summon", id: e.id, x: e.x, y: e.y, unit: unitKey });
  }
}

function tickUnit(S, e, dt) {
  const u = UNITS[e.unit];
  if (S.t - e.bornAt >= e.life) { e.dead = true; e.diedAt = S.t; fx(S, { type: "die", id: e.id, x: e.x, y: e.y, kind: "unit" }); return; }
  const tgt = nearestHostile(S, e, 9);
  let vx = 0, vy = 0;
  if (tgt) {
    const d = Math.hypot(tgt.x - e.x, tgt.y - e.y);
    const a = u.attack;
    const reach = a.kind === "bite" ? e.r + tgt.r + a.reach : a.range;
    const clear = a.kind === "bite" || rayToWall(S, e.x, e.y, (tgt.x - e.x) / d, (tgt.y - e.y) / d, d) >= d - 0.05;
    if (d <= reach && clear) {
      if (S.t >= e.atkT) {
        e.atkT = S.t + a.every;
        if (a.kind === "bite") { damage(S, tgt, a.dmg + (e.bonus ?? 0), e, e.unit); fx(S, { type: "bite", id: e.id, x: tgt.x, y: tgt.y }); }
        else S.projs.push({ x: e.x, y: e.y, dx: (tgt.x - e.x) / d, dy: (tgt.y - e.y) / d, speed: a.speed, left: a.range + 1,
          w: 0.35, dmg: a.dmg + (e.bonus ?? 0), side: e.side, owner: e.id, key: "bolt" });
      }
      if (a.kind === "bolt" && d < 2) { vx = -(tgt.x - e.x) / d; vy = -(tgt.y - e.y) / d; }
    } else { vx = (tgt.x - e.x) / d; vy = (tgt.y - e.y) / d; }
  } else {
    // heel: follow the owner; if left far behind (a locked door), hop back to them
    const own = S.ents.find((o) => o.id === e.owner && !o.dead);
    if (own) {
      const d = Math.hypot(own.x - e.x, own.y - e.y);
      if (d > 10) { e.x = own.x; e.y = own.y; }
      else if (d > 1.6) { vx = (own.x - e.x) / d; vy = (own.y - e.y) / d; }
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

// ---- foe brain: walk into range of the card on top of its queue, aim at the target, wind up, land ----
export function nextCardOf(e) { return e.kind === "foe" ? e.deck[e.qi % e.deck.length] : null; }

export function preferredRange(e, key, tgt) {
  const sh = CARDS[key].shape, tr = tgt?.r ?? T.radius;
  switch (sh.kind) {
    case "arc": return sh.r * 0.8 + tr;
    case "line": return Math.min(sh.len * 0.75, 5.5);
    case "shot": return Math.min(sh.range * 0.6, 5);
    case "circle": return Math.min(sh.range * 0.8, 5);
    case "self": return sh.r ? sh.r * 0.65 + tr : 99;
    case "dash": return sh.len * 0.8;
  }
  return 2;
}

function thinkFoe(S, e, dt) {
  e.mx = e.my = 0;
  if (e.cast || e.dash) return;
  const tgt = nearestHostile(S, e);
  if (!tgt) return;
  const key = nextCardOf(e), card = CARDS[key];
  const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1;
  e.fx = dx / d; e.fy = dy / d;
  const want = preferredRange(e, key, tgt);
  const support = !card.dmg && !card.zone?.dmg;
  if (support && card.heal) {
    // a heal with nobody hurt nearby just rotates to the next card
    const hurt = S.ents.some((o) => !o.dead && o.side === e.side && o.hp < o.maxHp && Math.hypot(o.x - e.x, o.y - e.y) <= card.shape.r + o.r);
    if (!hurt && e.mana >= cardCost(e, key)) { e.qi++; return; }
  }
  e.rest -= dt;
  const los = rayToWall(S, e.x, e.y, dx / d, dy / d, d) >= d - 0.1;
  const inRange = support || d <= want * 1.15;
  if (e.rest <= 0 && inRange && los && e.mana >= cardCost(e, key)) {
    beginCast(S, e, 0, { dx, dy, dist: d });
    e.rest = T.foeCastGap;
    return;
  }
  // approach / keep distance
  if (!support && d > want * 0.95) { e.mx = dx / d; e.my = dy / d; }
  else if (!support && d < want * 0.45 && card.shape.kind !== "arc" && card.shape.kind !== "self") { e.mx = -dx / d; e.my = -dy / d; }
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
      if (d < 1e-6) {   // centre inside the tile: leave by the nearest face
        const opts = [[e.x - tx, -1, 0], [tx + 1 - e.x, 1, 0], [e.y - ty, 0, -1], [ty + 1 - e.y, 0, 1]].sort((a, b) => a[0] - b[0]);
        e.x += opts[0][1] * (opts[0][0] + r); e.y += opts[0][2] * (opts[0][0] + r);
      } else { e.x += (dx / d) * (r - d); e.y += (dy / d) * (r - d); }
    }
  }
}
function separate(S) {
  const live = S.ents.filter((e) => !e.dead && !e.dash && (e.kind !== "foe" || e.awake));
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j];
    // summons slip through their own side (no conga lines); bodies still bump bodies
    if (a.side === b.side && (a.kind === "unit" || b.kind === "unit")) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
    if (d >= min || d < 1e-6) continue;
    const push = (min - d) / 2, nx = dx / d, ny = dy / d;
    // units give way to bodies; a boss doesn't budge
    const wa = a.kind === "unit" ? 1.6 : BODIES[a.body]?.boss ? 0.1 : 1, wb = b.kind === "unit" ? 1.6 : BODIES[b.body]?.boss ? 0.1 : 1;
    a.x -= nx * push * wa / ((wa + wb) / 2); a.y -= ny * push * wa / ((wa + wb) / 2);
    b.x += nx * push * wb / ((wa + wb) / 2); b.y += ny * push * wb / ((wa + wb) / 2);
  }
}

// ---- rooms: lock on entry, open + reward on clear, boss = floor done ----
function rooms(S) {
  const f = S.floor;
  const players = S.ents.filter((e) => e.kind === "player" && !e.dead);
  for (const rs of S.rooms) {
    const fr = f.rooms[rs.id];
    if (rs.status === "idle") {
      const inside = players.find((p) => { const r = roomAt(f, p.x, p.y, 0.7); return r && r.id === rs.id; });
      if (!inside) continue;
      rs.status = "active";
      for (const k of fr.doors) S.locked.add(k);
      // co-op: anyone outside is pulled in with the party; summons come along
      for (const e of S.ents) if (!e.dead && (e.kind === "player" || e.kind === "unit") && e.side === "hero") {
        const r = roomAt(f, e.x, e.y, 0.3);
        if (!r || r.id !== rs.id) { e.x = inside.x + (S.rng() - 0.5); e.y = inside.y + (S.rng() - 0.5); }
      }
      for (const id of rs.foes) { const e = S.ents.find((o) => o.id === id); if (e) e.awake = true; }
      fx(S, { type: "lock", room: rs.id });
    } else if (rs.status === "active") {
      const left = rs.foes.filter((id) => S.ents.some((o) => o.id === id && !o.dead));
      if (left.length) continue;
      rs.status = "clear"; S.stats.rooms++;
      for (const k of fr.doors) S.locked.delete(k);
      // foe summons crumble with their masters
      for (const e of S.ents) if (e.kind === "unit" && e.side === "foe" && !e.dead) { e.dead = true; e.diedAt = S.t; }
      fx(S, { type: "clear", room: rs.id });
      if (rs.kind === "boss") { S.phase = "won"; S.endedAt = S.t; continue; }
      for (const p of players) {
        heal(S, p, T.roomClearHeal);
        const pool = [...new Set(rs.fallen.flatMap((x) => x.deck))];
        shuffle(S.rng, pool);
        const bodies = [...new Set(rs.fallen.map((x) => x.body))].filter((b) => b !== p.body && !BODIES[b].boss);
        S.rewards[p.pid] = { room: rs.id, cards: pool.slice(0, 3), bodies, took: null, wore: null };
      }
    }
  }
}

function reveal(S) {
  const f = S.floor;
  for (const p of S.ents) {
    if (p.kind !== "player" || p.dead) continue;
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
