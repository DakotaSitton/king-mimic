// King Mimic — FLICK mode test pilot. Reads a run and returns what a sensible player would do this
// instant: a stick vector and (maybe) a card to flick. Used by the headless balance tests and by the
// real-browser driver, which turns these decisions into REAL touch input (stick drags, card flicks).
// It never touches the sim's state — it only reads it.

import { CARDS } from "./content.js";
import { playerOf, shapeOf, hitsOf, cardVals, preferredRange, solidAt, overlaps, rayToWall, isOnce, inPlay, canAfford } from "./sim.js";

export function botThink(S, pid, mem = {}) {
  const e = playerOf(S, pid);
  if (!e || e.dead || e.away || S.phase !== "play") return { move: [0, 0], cast: null };
  // anything hostile that's in the fight — foe bodies and their summons (rats bite!)
  const foes = S.ents.filter((o) => o.side !== e.side && inPlay(S, o));
  let move = [0, 0], cast = null;
  const downed = S.ents.filter((o) => o.kind === "player" && o.dead && !o.away);
  if (foes.length) {
    const tgt = foes.reduce((a, b) => (dist(e, a) <= dist(e, b) ? a : b));
    const d = dist(e, tgt) || 1;
    const aim = { dx: tgt.x - e.x, dy: tgt.y - e.y, dist: d };
    // best card to flick right now (one-use cards only when they're worth spending)
    let best = null, bestScore = 0;
    e.hand.forEach((key, slot) => {
      if (!key || !canAfford(e, key)) return;
      const c = CARDS[key], v = cardVals(e, key);
      let score = 0;
      if (c.mana) score = e.mana < e.maxMana * 0.35 && e.hand.some((k) => k && CARDS[k].type === "spell") ? 5 : 0;
      else if (c.heal || (c.zone?.heal && !c.zone?.dmg)) score = e.hp < e.maxHp * 0.55 ? 9 : 0;
      else if (c.shield) score = e.shield < 2 && e.hp < e.maxHp * 0.8 ? 3 : 0;
      else if (c.summon) score = foes.length >= 2 ? 4 : 0;
      else {
        const n = hitsOf(S, e, shapeOf(S, e, key, aim)).foes.length;
        score = n * (v.dmg + v.zoneDmg * 2) + (c.zone?.heal && e.hp < e.maxHp ? 2 : 0);
        if (isOnce(key) && n < 2 && tgt.maxHp < 8) score *= 0.3;   // don't blow a spell on a mouse
      }
      if (score > bestScore) { bestScore = score; best = { slot, aim, key }; }
    });
    // nothing useful for a while → play a reusable card just to cycle the hand
    if (!best && !e.cast) {
      mem.stall = (mem.stall ?? 0) + 0.12;
      if (mem.stall > 1.2) {
        // cycle: a free reusable card if there is one, else let an unaffordable spell fizzle out
        let slot = e.hand.findIndex((k) => k && !isOnce(k) && canAfford(e, k));
        if (slot < 0) slot = e.hand.findIndex((k) => k && !canAfford(e, k));
        if (slot >= 0) best = { slot, aim, key: e.hand[slot] };
      }
    } else mem.stall = 0;
    if (!e.cast && best) { cast = best; mem.stall = 0; }
    // hold the range of the hand's main damage card
    const main = e.hand.find((k) => k && canAfford(e, k) && (CARDS[k].dmg || CARDS[k].zone?.dmg)) ?? e.hand.find(Boolean);
    const want = main ? preferredRange(e, main, tgt) : 2;
    if (d > want * 0.9) move = [aim.dx / d, aim.dy / d];
    else if (d < want * 0.4 && !["arc", "self"].includes(CARDS[main].shape.kind)) move = [-aim.dx / d, -aim.dy / d];
    // a downed friend close by and nothing right on top of us → go stand them back up
    const friend = downed.sort((a, b) => dist(e, a) - dist(e, b))[0];
    if (friend && dist(e, friend) < 7 && d > 2) move = toward(e, friend);
    // dodge what is winding up at us — beats everything else
    const dodge = dodgeVector(S, e);
    if (dodge) move = dodge;
  } else if (downed.length) {
    move = toward(e, downed[0]);
  } else {
    move = navigate(S, e, mem);
  }
  return { move, cast };
}
const toward = (e, o) => { const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy); return d < 0.5 ? [0, 0] : [dx / d, dy / d]; };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function dodgeVector(S, e) {
  let vx = 0, vy = 0;
  const me = { x: e.x, y: e.y, r: e.r + 0.35 };
  for (const f of S.ents) {
    if (f.dead || f.side === e.side || !f.cast) continue;
    const sh = f.cast.locked ?? shapeOf(S, f, f.cast.key, f.cast.aim);
    if (!sh || !overlaps(sh, me)) continue;
    if (sh.kind === "line") {
      // step sideways off the line, toward whichever side we're already on
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
  // if the dodge runs into a wall, slide along it instead
  let dx = vx / m, dy = vy / m;
  if (rayToWall(S, e.x, e.y, dx, dy, 0.8, e.r) < 0.3) { const ax = -dy, ay = dx; dx = ax; dy = ay; }
  return [dx, dy];
}

// walk the hallways to the next room that isn't cleared
function navigate(S, e, mem) {
  const goalRoom = S.rooms.find((r) => r.status !== "clear");
  if (!goalRoom) return [0, 0];
  const fr = S.floor.rooms[goalRoom.id];
  const gx = Math.floor(fr.cx), gy = Math.floor(fr.cy);
  if (!mem.path || mem.goal !== goalRoom.id || S.t - (mem.at ?? -9) > 0.4) {
    mem.path = bfs(S, Math.floor(e.x), Math.floor(e.y), gx, gy); mem.goal = goalRoom.id; mem.at = S.t;
  }
  const path = mem.path;
  if (!path || !path.length) return [gx + 0.5 - e.x, gy + 0.5 - e.y].map((v, _, a) => v / (Math.hypot(...a) || 1));
  // farthest waypoint within a few steps that we can walk straight to
  let tx = path[0][0] + 0.5, ty = path[0][1] + 0.5;
  for (let i = Math.min(path.length - 1, 5); i >= 0; i--) {
    const px = path[i][0] + 0.5, py = path[i][1] + 0.5, d = Math.hypot(px - e.x, py - e.y) || 1;
    if (rayToWall(S, e.x, e.y, (px - e.x) / d, (py - e.y) / d, d, e.r) >= d - 0.05) { tx = px; ty = py; break; }
  }
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  return [dx / d, dy / d];
}

function bfs(S, sx, sy, gx, gy) {
  const w = S.floor.w, prev = new Int32Array(w * S.floor.h).fill(-1);
  const start = sy * w + sx, goal = gy * w + gx;
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
