// Headless balance probe for the RPG crawler: the test pilot plays whole runs (all floors) per starter body.
//   bun run tools/rpg-balance.mjs            RUNS=8  PARTY=1  REACT=0.25 (seconds between pilot decisions)
// Prints, per body: runs won / floor reached / level / time / revives. Read-only on content.
import { createRun, step, play, setMove, equip, descend, playerOf, DT } from "../engine/rpg/sim.js";
import { botThink } from "../engine/rpg/bot.js";
import { BODIES, FLOORS } from "../engine/rpg/content.js";

const RUNS = +(process.env.RUNS || 8), PARTY = +(process.env.PARTY || 1), REACT = +(process.env.REACT || 0.25);
const starters = (process.env.BODY ? process.env.BODY.split(",") : Object.keys(BODIES).filter((k) => BODIES[k].starter));
export function runOnce(seed, bodies) {
  const ps = bodies.map((b, i) => ({ id: `p${i}`, body: b, ...BODIES[b].suggested, name: `bot${i}` }));
  const S = createRun({ seed, players: ps });
  const mem = ps.map(() => ({})), next = ps.map(() => 0);
  let stall = 0, lastFelled = 0;
  while (S.phase === "play" && S.t < 1500) {
    for (let i = 0; i < ps.length; i++) {
      if (S.t < next[i]) continue;
      next[i] = S.t + REACT;
      const d = botThink(S, ps[i].id, mem[i]);
      setMove(S, ps[i].id, d.move[0], d.move[1]);
      if (d.equip >= 0) equip(S, ps[i].id, d.equip);
      if (d.cast) play(S, ps[i].id, d.cast.slot, d.cast.aim);
      if (d.descend) descend(S, ps[i].id);
    }
    step(S, DT);
    if (S.stats.felled !== lastFelled || S.stats.floors) { lastFelled = S.stats.felled; }
    stall++;
  }
  return { phase: S.phase, floor: S.floorN + 1, level: S.level, t: Math.round(S.t), revives: S.stats.revives, felled: S.stats.felled,
    hp: ps.map((p) => playerOf(S, p.id)).map((e) => `${Math.ceil(e.hp)}/${e.maxHp}`).join(" ") };
}
if (import.meta.main) {
  console.log(`RPG balance — ${RUNS} runs each, party ${PARTY}, react ${REACT}s, ${FLOORS.length} floors`);
  for (const b of starters) {
    const res = [];
    for (let r = 0; r < RUNS; r++) res.push(runOnce(1000 + r * 7919, Array.from({ length: PARTY }, (_, i) => (i === 0 ? b : starters[(starters.indexOf(b) + i) % starters.length]))));
    const won = res.filter((x) => x.phase === "won").length, stuck = res.filter((x) => x.phase === "play").length;
    const avg = (f) => (res.reduce((a, x) => a + f(x), 0) / res.length).toFixed(1);
    console.log(`${BODIES[b].name.padEnd(22)} won ${won}/${RUNS}${stuck ? ` STALLED ${stuck}` : ""} · floor ${avg((x) => x.floor)} · lv ${avg((x) => x.level)} · ${avg((x) => x.t)}s · felled ${avg((x) => x.felled)} · revives ${avg((x) => x.revives)}`);
  }
}
