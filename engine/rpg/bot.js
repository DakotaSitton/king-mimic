// King Mimic — RPG crawler test pilot. Reads a run and returns what a sensible player would do this instant:
// a stick vector, (maybe) a slot to flick, and whether to equip a found card or take the stairs. Used by the
// headless tests / balance probe and by the real-browser driver, which turns these decisions into REAL touch
// input. It never touches the sim's state — it only reads it.

import { CARDS, TUNING } from "./content.js";
import { playerOf, shapeOf, hitsOf, dmgOf, preferredRange, overlaps, rayToWall, inPlay, blockedWhy, slotKey, onStairs, pathStep } from "./sim.js";

export function botThink(S, pid, mem = {}) {
  const e = playerOf(S, pid);
  if (!e || e.dead || e.away || S.phase !== "play") return { move: [0, 0], cast: null };
  const out = { move: [0, 0], cast: null, descend: false, equip: -1 };
  // fill an empty deck slot with whatever deck card is in the bag
  // (never a card that costs health — the pilot isn't clever enough to want Tiny)
  if (e.deck.length < e.level) out.equip = e.bag.findIndex((k) => CARDS[k].type === "deck" && !((CARDS[k].mods.hp ?? 0) < 0));
  if (out.equip < 0 && e.actions.length < TUNING.actionSlots) out.equip = e.bag.findIndex((k) => CARDS[k].type === "action");
  const foes = S.ents.filter((o) => o.side !== e.side && inPlay(S, o));
  const downed = S.ents.filter((o) => o.kind === "player" && o.dead && !o.away);
  const dodge = dodgeVector(S, e);
  if (foes.length) {
    const tgt = foes.reduce((a, b) => (dist(e, a) <= dist(e, b) ? a : b));
    const d = dist(e, tgt) || 1;
    const aim = { dx: tgt.x - e.x, dy: tgt.y - e.y, dist: d };
    let best = null, bestScore = 0;
    for (let slot = 0; slot <= e.actions.length; slot++) {
      if (blockedWhy(S, e, slot)) continue;
      const key = slotKey(e, slot), c = CARDS[key];
      let score = 0;
      if (c.heal) score = e.hp < e.maxHp * 0.55 ? 9 : 0;
      else if (c.shield) score = !e.shield && e.hp < e.maxHp * 0.8 ? 4 : 0;
      else if (c.summon) score = 4;
      else if (c.iframes) score = dodge ? 6 : 0;
      else if (c.dmg || c.zone?.dmg) {
        const n = hitsOf(S, e, shapeOf(S, e, key, aim)).foes.length;
        score = n * (dmgOf(S, e, key) + (c.zone?.dmg ?? 0) * 3) * (slot ? 1.15 : 1);
      }
      if (score > bestScore) { bestScore = score; best = { slot, key, aim: c.iframes && dodge ? { dx: dodge[0], dy: dodge[1] } : aim }; }
    }
    if (!e.cast && best) out.cast = best;
    // hold the weapon's range
    const want = preferredRange(e, e.weapon, tgt);
    const los = rayToWall(S, e.x, e.y, aim.dx / d, aim.dy / d, d) >= d - 0.1;
    if (!los) out.move = pathStep(S, e, tgt.x, tgt.y, mem);
    else if (d > want * 0.9) out.move = [aim.dx / d, aim.dy / d];
    else if (d < want * 0.4 && CARDS[e.weapon].shape.kind !== "arc") out.move = [-aim.dx / d, -aim.dy / d];
    const friend = downed.sort((a, b) => dist(e, a) - dist(e, b))[0];
    if (friend && dist(e, friend) < 7 && d > 2) out.move = toward(e, friend);
    if (dodge) out.move = dodge;
  } else if (downed.length) {
    out.move = toward(e, downed[0]);
  } else if (S.stairs && onStairs(S, e) && !liveRooms(S).length) {
    out.descend = true;
  } else {
    out.move = navigate(S, e, mem);
  }
  return out;
}
const toward = (e, o) => { const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy); return d < 0.5 ? [0, 0] : [dx / d, dy / d]; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// rooms that still hold foes (the pilot clears the floor before taking the stairs)
const liveRooms = (S) => S.rooms.filter((r) => r.foes.some((id) => S.ents.some((o) => o.id === id && !o.dead)));

function dodgeVector(S, e) {
  let vx = 0, vy = 0;
  const me = { x: e.x, y: e.y, r: e.r + 0.35 };
  for (const f of S.ents) {
    if (f.dead || f.side === e.side || !f.cast) continue;
    const sh = f.cast.locked ?? shapeOf(S, f, f.cast.key, f.cast.aim);
    if (!sh || !overlaps(sh, me)) continue;
    if (sh.kind === "line") {
      const side = Math.sign((e.x - sh.x) * -sh.dy + (e.y - sh.y) * sh.dx) || 1;
      vx += -sh.dy * side; vy += sh.dx * side;
    } else {
      const dx = e.x - sh.x, dy = e.y - sh.y, d = Math.hypot(dx, dy) || 1;
      vx += dx / d; vy += dy / d;
    }
  }
  for (const p of S.projs) {
    if (p.side === e.side) continue;
    const rx = e.x - p.x, ry = e.y - p.y, t = rx * p.dx + ry * p.dy;
    if (t < 0 || t > 3.5) continue;
    const perp = rx * -p.dy + ry * p.dx;
    if (Math.abs(perp) > e.r + p.w) continue;
    const side = Math.sign(perp) || 1;
    vx += -p.dy * side; vy += p.dx * side;
  }
  const m = Math.hypot(vx, vy);
  if (!m) return null;
  let dx = vx / m, dy = vy / m;
  if (rayToWall(S, e.x, e.y, dx, dy, 0.8, e.r) < 0.3) { const ax = -dy, ay = dx; dx = ax; dy = ay; }
  return [dx, dy];
}

// walk the halls to the next room that still holds foes; then to the stairs
function navigate(S, e, mem) {
  const live = liveRooms(S)[0];
  if (live) { const fr = S.floor.rooms[live.id]; return pathStep(S, e, fr.cx, fr.cy, mem); }
  if (S.stairs) return pathStep(S, e, S.stairs.x, S.stairs.y, mem);
  return [0, 0];
}