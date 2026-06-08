// Property-based playthrough fuzz: drive many FULL runs through the pure engine with a
// dumb auto-bot (pick a class, stock greedily, fire every item each tick, advance / buy /
// descend) and assert hard invariants hold the whole time — Treasure never negative, no
// NaN HP, combat always resolves, the phase machine never strands the run. Pure + instant
// (no server); complements the unit spec (game.test.js) and the WS e2e (e2e.js).
//
// Run:  bun test/fuzz.js
import * as G from "../game.js";

const RUNS = Number(process.env.RUNS ?? 60);
let problems = [];
const fail = (msg) => problems.push(msg);

function autoFight(room, maxTicks = 5000) {
  let t = 0;
  while (room.phase === "playing" && t < maxTicks) {
    for (const p of room.players.values()) {
      if (!p.alive) continue;
      // chase the lowest-HP foe so the bot actually clears boards (and boss courts)
      const foes = room.lanes.flat();
      if (foes.length) { foes.sort((a, b) => a.hp - b.hp); p.targetId = foes[0].id; }
      G.ensureTarget(room, p);
      for (let s = 0; s < p.inv.length; s++) G.useItem(room, p, s);
    }
    G.simulateTick(room);
    for (const p of room.players.values()) if (p.treasure < 0) fail(`wallet negative (${p.treasure})`);
    if (Number.isNaN(room.caravan.hp)) fail("caravan hp NaN");
    for (const lane of room.lanes) for (const f of lane) {
      if (Number.isNaN(f.hp)) fail(`foe hp NaN (${f.bodyKey})`);
      if (f.hp > f.maxHp) fail(`foe over-healed (${f.bodyKey} ${f.hp}/${f.maxHp})`);
    }
    for (const p of room.players.values()) {
      if (Number.isNaN(p.hp)) fail("player hp NaN");
      if (p.hp > p.maxHp) fail(`player over-healed (${p.hp}/${p.maxHp})`);
    }
    t++;
  }
  if (t >= maxTicks) fail(`combat never resolved (phase=${room.phase}, foes=${G.foeCount(room)})`);
}

function playRun(label) {
  const r = G.newRoom("FZ" + label);
  const p = G.addPlayer(r, "p1", "Bot");
  G.startDraft(r);
  G.chooseClass(r, p, ["warrior", "rogue", "mage", "cleric"][Math.floor(Math.random() * 4)]);

  let steps = 0;
  while (r.phase !== "lost" && steps < 60) {
    steps++;
    if (r.phase === "stock") {
      for (let k = 0; k < 1 + Math.floor(Math.random() * 2); k++) G.addFoe(r, k % 3);
      G.commitStock(r);
    } else if (r.phase === "setup") {
      G.beginCombat(r); autoFight(r);
    } else if (r.phase === "shop") {
      const w = r.shop?.wares?.[0];
      if (w) G.buyShopItem(r, p, w.key);
      const to = G.currentNode(r)?.links?.[0];
      if (!to || !G.leaveShop(r, to)) { fail("could not leave shop"); break; }
    } else if (r.phase === "won") {
      for (const ante of G.tiersReached(r)) G.buyTier(r, p, ante);
      if (r.loot?.length) G.claimLoot(r, p, r.loot[0]);
      if (r.levelComplete) {
        if ((r.floor ?? 1) >= 3) break;          // bound runtime: 3 floors per run
        if (!G.descend(r)) { fail("descend failed"); break; }
      } else {
        const to = G.currentNode(r)?.links?.[0];
        if (!to || !G.advanceLevel(r, to)) { fail(`advance failed from ${G.currentNode(r)?.id}`); break; }
      }
    } else { fail(`unexpected phase ${r.phase}`); break; }
  }
  if (steps >= 60) fail("run did not terminate");
}

for (let i = 0; i < RUNS; i++) playRun(i);

const uniq = [...new Set(problems)];
if (uniq.length === 0) console.log(`✅ FUZZ OK — ${RUNS} full runs, no invariant violations.`);
else { console.log(`❌ FUZZ — ${problems.length} violation(s):`); for (const m of uniq) console.log("  - " + m); }
process.exit(uniq.length === 0 ? 0 : 1);
