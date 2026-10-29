// FLICK mode balance probe: the bot pilot plays N seeded floors per starter body (suggested deck) and
// reports win rate, clear time, where it died and what hurt it.  bun run tools/flick-balance.mjs [N]
// The bot is a rough stand-in for a human — use the numbers for relative balance, not absolutes.
import { BODIES, CARDS } from "../engine/flick/content.js";
import { createRun, step, play, setMove, closeReward, takeCard, playerOf, DT } from "../engine/flick/sim.js";
import { botThink } from "../engine/flick/bot.js";

const N = +(process.argv[2] || 20), REACT = +(process.env.REACT || 0.15);
const name = (k) => CARDS[k]?.name ?? (k === "bolt" ? "Efreeti bolt" : k === "rat" ? "Rat bite" : k);
for (const body of Object.keys(BODIES).filter((k) => BODIES[k].starter)) {
  let won = 0, tWon = 0, stalls = [];
  const died = {}, taken = {};
  for (let i = 0; i < N; i++) {
    const S = createRun({ seed: 5000 + i * 31, players: [{ id: "a", body, deck: BODIES[body].suggested }] });
    const mem = {}; let think = 0;
    while (S.phase === "play" && S.t < 480) {
      if ((think -= DT) <= 0) {
        think = REACT;
        if (S.rewards.a) { const rw = S.rewards.a; if (rw.cards[0]) takeCard(S, "a", rw.cards[0]); closeReward(S, "a"); }
        const it = botThink(S, "a", mem);
        setMove(S, "a", it.move[0], it.move[1]);
        if (it.cast) play(S, "a", it.cast.slot, it.cast.aim);
      }
      step(S, DT);
    }
    for (const [k, v] of Object.entries(S.stats.takenBy ?? {})) taken[k] = (taken[k] ?? 0) + v;
    if (S.phase === "won") { won++; tWon += S.t; }
    else if (S.phase === "lost") { const r = S.rooms.findIndex((x) => x.status !== "clear"); died[r] = (died[r] ?? 0) + 1; }
    else { const e = playerOf(S, "a"); stalls.push(`seed#${i} room ${S.rooms.findIndex((x) => x.status !== "clear")} at ${e.x.toFixed(1)},${e.y.toFixed(1)}`); }
  }
  const top = Object.entries(taken).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${name(k)} ${(v / N).toFixed(1)}`).join(", ");
  console.log(`${BODIES[body].name.padEnd(14)} won ${String(won).padStart(2)}/${N}  clear ${won ? (tWon / won).toFixed(0) : "-"}s  died in room ${JSON.stringify(died)}`);
  console.log(`   hurt per run by: ${top}`);
  if (stalls.length) console.log(`   STALLED: ${stalls.join("; ")}`);
}
