// FLICK mode balance probe: bot pilots play N seeded floors and report win rate, clear time, where the
// party fell and what hurt it.   bun run tools/flick-balance.mjs [N]
//   default: every starter body solo (its suggested deck).  PARTY=fatCat,lizardWizard → that party.
//   REACT=0.25 → seconds between each bot's decisions (a rough stand-in for a human's reactions).
// The bot is a stand-in for a human — use the numbers for relative balance, not absolutes.
import { BODIES, CARDS } from "../engine/flick/content.js";
import { createRun, step, play, setMove, closeReward, takeCard, DT } from "../engine/flick/sim.js";
import { botThink } from "../engine/flick/bot.js";

const N = +(process.argv[2] || 20), REACT = +(process.env.REACT || 0.15);
const name = (k) => CARDS[k]?.name ?? (k === "bolt" ? "Efreeti bolt" : k === "rat" ? "Rat bite" : k);
const parties = process.env.PARTY ? [process.env.PARTY.split(",")] : Object.keys(BODIES).filter((k) => BODIES[k].starter).map((k) => [k]);
for (const party of parties) {
  let won = 0, tWon = 0, revives = 0;
  const stalls = [], died = {}, taken = {};
  for (let i = 0; i < N; i++) {
    const S = createRun({ seed: 5000 + i * 31, players: party.map((b, j) => ({ id: "p" + j, body: b, deck: BODIES[b].suggested })) });
    const mems = party.map(() => ({})); let think = 0;
    while (S.phase === "play" && S.t < 600) {
      if ((think -= DT) <= 0) {
        think = REACT;
        party.forEach((_, j) => {
          const pid = "p" + j;
          if (S.rewards[pid]) { const rw = S.rewards[pid]; if (rw.cards[0]) takeCard(S, pid, rw.cards[0]); closeReward(S, pid); }
          const it = botThink(S, pid, mems[j]);
          setMove(S, pid, it.move[0], it.move[1]);
          if (it.cast) play(S, pid, it.cast.slot, it.cast.aim);
        });
      }
      step(S, DT);
    }
    for (const [k, v] of Object.entries(S.stats.takenBy ?? {})) taken[k] = (taken[k] ?? 0) + v;
    revives += S.stats.revives;
    if (S.phase === "won") { won++; tWon += S.t; }
    else if (S.phase === "lost") { const r = S.rooms.findIndex((x) => x.status !== "clear"); died[r] = (died[r] ?? 0) + 1; }
    else stalls.push(`seed#${i} room ${S.rooms.findIndex((x) => x.status !== "clear")}`);
  }
  const top = Object.entries(taken).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${name(k)} ${(v / N).toFixed(1)}`).join(", ");
  const label = party.map((b) => BODIES[b].name).join(" + ");
  console.log(`${label.padEnd(14)} won ${String(won).padStart(2)}/${N}  clear ${won ? (tWon / won).toFixed(0) : "-"}s  died in room ${JSON.stringify(died)}${party.length > 1 ? `  revives/run ${(revives / N).toFixed(1)}` : ""}`);
  console.log(`   hurt per run by: ${top}`);
  if (stalls.length) console.log(`   STALLED: ${stalls.join("; ")}`);
}
