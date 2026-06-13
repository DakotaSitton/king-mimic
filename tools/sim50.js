// 50-game balance sweep (owner order 2026-06-13: "Run some games and find some balance
// changes I've missed. Loop 50 games."). FULL runs — floors 1-3 AND the throne — through
// the pure engine, alternating solo and duo, with the fuzz bot's hands (press everything
// at the lowest-HP foe). Collects where runs die, per-boss outcomes, caravan bleed,
// downs, and wallet curves. Run: bun tools/sim50.js  (RUNS env to scale)
import * as G from "../game.js";

const RUNS = Number(process.env.RUNS ?? 50);
const CLASSES = ["warrior", "rogue", "mage", "cleric"];
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

const S = {
  runs: 0, thrones: 0, losses: [],            // {floor, roomType, boss, party}
  boss: {},                                    // key -> {fights, wins, ticks[], cav[]}
  downs: 0, fights: 0, cavLoss: [],            // per ordinary fight
  wallet: {},                                  // floor -> [treasure at floor end]
  deathlessLosses: 0,
};

function autoFight(room, stat) {
  const cav0 = room.caravan.hp;
  const bossKey = room.boss?.bodyKey ?? room.lanes.flat().find((f) => G.BODIES[f.bodyKey]?.boss)?.bodyKey ?? null;
  const alive0 = [...room.players.values()].filter((p) => p.alive).length;
  let t = 0, downs = 0;
  const wasAlive = new Map([...room.players.values()].map((p) => [p.id, p.alive]));
  while (room.phase === "playing" && t < 6000) {
    for (const p of room.players.values()) {
      if (!p.alive) continue;
      const foes = room.lanes.flat();
      if (foes.length) { foes.sort((a, b) => a.hp - b.hp); p.targetId = foes[0].id; }
      G.ensureTarget(room, p);
      if (p.echoReady) G.armEcho(room, p);     // the bot presses its echo button too
      for (let s = 0; s < p.inv.length; s++) G.useItem(room, p, s);
    }
    G.simulateTick(room);
    for (const p of room.players.values()) {
      if (wasAlive.get(p.id) && !p.alive) { downs++; wasAlive.set(p.id, false); }
    }
    t++;
  }
  S.downs += downs; S.fights++;
  const cavLost = cav0 - room.caravan.hp;
  if (bossKey) {
    const b = (S.boss[bossKey] ??= { fights: 0, wins: 0, ticks: [], cav: [] });
    b.fights++; if (room.phase === "won") b.wins++;
    b.ticks.push(t); b.cav.push(cavLost);
  } else S.cavLoss.push(cavLost);
  return bossKey;
}

function playRun(i, party) {
  const r = G.newRoom("SIM" + i);
  const ps = [];
  for (let k = 0; k < party; k++) ps.push(G.addPlayer(r, "p" + k, "Bot" + k));
  G.startDraft(r);
  for (const p of ps) G.chooseClass(r, p, rnd(CLASSES));
  S.runs++;
  let steps = 0, lastBoss = null;
  while (r.phase !== "lost" && !r.runWon && steps++ < 90) {
    if (r.phase === "stock") {
      let guard = 0;
      while (!G.stockReady(r) && guard++ < 20)
        for (const p of ps) G.addGreedy(r, p, Math.floor(Math.random() * 3));
      G.commitStock(r);
    } else if (r.phase === "setup") {
      G.beginCombat(r);
      lastBoss = autoFight(r);
    } else if (r.phase === "shop") {
      for (const p of ps) { const w = r.shop?.wares?.[0]; if (w) G.buyShopItem(r, p, w.key); }
      const to = G.currentNode(r)?.links?.[0];
      if (!to || !G.leaveShop(r, to)) break;
    } else if (r.phase === "won") {
      for (const p of ps) {
        const g = G.goldsReached(r).find((x) => x > (p.unlockGold ?? 1));
        if (g && (p.treasure ?? 0) >= 20) G.buyUnlock(r, p, g);
        if (r.loot?.length) G.claimLoot(r, p, r.loot[0]);
      }
      if (r.levelComplete) {
        (S.wallet[r.floor] ??= []).push(...ps.map((p) => p.treasure ?? 0));
        if (r.runWon) break;
        if (!G.descend(r)) break;
      } else {
        const to = G.currentNode(r)?.links?.[0];
        if (!to || !G.advanceLevel(r, to)) break;
      }
    } else break;
  }
  if (r.runWon) S.thrones++;
  else S.losses.push({ floor: r.floor ?? 1, roomType: G.currentNode(r)?.type ?? "?", boss: lastBoss, party,
    downs: [...r.players.values()].filter((p) => !p.alive).length });
}

for (let i = 0; i < RUNS; i++) playRun(i, i % 2 === 0 ? 1 : 2);

const avg = (a) => (a.length ? (a.reduce((s, x) => s + x, 0) / a.length) : 0);
const med = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

console.log(`\n== ${RUNS} full runs (alternating 1P/2P) ==`);
console.log(`Thrones taken: ${S.thrones}/${S.runs} (${Math.round(100 * S.thrones / S.runs)}%)`);
const byFloor = {};
for (const l of S.losses) byFloor[`f${l.floor} ${l.boss ?? l.roomType}${l.party === 2 ? " (2P)" : ""}`] =
  (byFloor[`f${l.floor} ${l.boss ?? l.roomType}${l.party === 2 ? " (2P)" : ""}`] ?? 0) + 1;
console.log("Losses by place:", JSON.stringify(byFloor));
console.log(`\n== bosses ==`);
for (const [k, b] of Object.entries(S.boss))
  console.log(`${k.padEnd(16)} fights ${String(b.fights).padStart(3)}  winrate ${Math.round(100 * b.wins / b.fights)}%  med ${(med(b.ticks) / 10).toFixed(1)}s  avg caravan -${avg(b.cav).toFixed(1)}`);
console.log(`\nOrdinary fights: ${S.cavLoss.length}, avg caravan -${avg(S.cavLoss).toFixed(2)}, downs/fight ${(S.downs / Math.max(1, S.fights)).toFixed(2)}`);
for (const [f, w] of Object.entries(S.wallet)) console.log(`floor ${f} end wallet: avg ${avg(w).toFixed(1)} (n=${w.length})`);
