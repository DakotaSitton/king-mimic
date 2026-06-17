// BODY TIER LIST (owner 2026-06-16: "rank all bodies with standard items, as-is"). Each
// adoptable body gets an affinity-matched STANDARD kit (sword bodies → [blade,bow,smallShield];
// staff bodies → [fire,lightning,smallShield]) so the BODY — its Power, HP, and passive — is
// what's measured. Score = how far up a fixed foe ante-ladder it can solo (1v1, real body HP,
// 20-HP caravan, mashing), DPS to a fat dummy as the tiebreaker. Run: bun tools/tierlist.js
import * as G from "../game.js";
const { KIT, BODIES } = G;

function fight(pBody, kit, foeBody, foeGear, dummyHp = null) {
  const r = G.newRoom("TL");
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, pBody); p.lane = 0; p.depth = 0;
  p.inv = kit.map((k) => ({ key: k, charge: 0, cd: KIT[k].cd }));
  r.phase = "playing"; r.laneCount = 1; r.allies = [[]];
  r.caravan = { hp: 20, max: 20 };
  const foe = G.spawnEnemy(foeBody, foeGear); foe.lane = 0;
  if (dummyHp) foe.hp = foe.maxHp = dummyHp;
  r.lanes = [[foe]];
  const cap = dummyHp ? 300 : 3000;
  for (let t = 0; t < cap; t++) {
    if (!dummyHp && foe.hp <= 0) return { win: true, t };
    if (!dummyHp && r.caravan.hp <= 0) return { win: false, t };
    if (p.alive) {
      p.targetId = foe.id; G.ensureTarget(r, p);
      if (p.echoReady) G.armEcho(r, p);
      for (let s = 0; s < p.inv.length; s++) G.useItem(r, p, s);
    }
    G.simulateTick(r);
  }
  if (dummyHp) return { dmg: dummyHp - Math.max(0, foe.hp) };
  return { win: foe.hp <= 0, t: cap };
}

// META kit (owner asked: "what if they had the strong items?") — per-affinity scaling items.
// crossbow / magicMissile deal raw Power per press (the dominance engine); spear/fire/lightning add reach.
const SWORD_KIT = ["crossbow", "spear", "blade"], STAFF_KIT = ["magicMissile", "fire", "lightning"];
const kitFor = (k) => ((BODIES[k].phys || 0) >= (BODIES[k].mag || 0) ? SWORD_KIT : STAFF_KIT);

const foes = [
  ["pixie", []], ["pixie", ["blade"]], ["pixieU", ["blade"]], ["pixieR", ["blade"]],
  ["pixieU", ["crossbow"]], ["pixieR", ["crossbow"]], ["minotaurR", ["omnislash"]],
  ["pixieR", ["crossbow", "spear"]], ["pixieR", ["crossbow", "slimeCrown"]],
  ["vampireR", ["crossbow", "slimeCrown"]], ["minotaurR", ["omnislash", "slimeCrown"]],
  ["pixieR", ["crossbow", "slimeCrown", "spear"]],
].map(([b, g]) => ({ b, g, ante: G.anteOfFoe({ bodyKey: b, gear: g }) })).sort((x, y) => x.ante - y.ante);

const bodies = Object.keys(BODIES).filter((k) => {
  const b = BODIES[k]; return b.spawn && !b.boss && !b.summon && (b.gold || 0) > 0;
});

const rows = bodies.map((k) => {
  const kit = kitFor(k);
  let wins = 0, maxAnte = 0;
  for (const f of foes) { const res = fight(k, kit, f.b, f.g); if (res.win) { wins++; maxAnte = Math.max(maxAnte, f.ante); } }
  const dps = fight(k, kit, "lizardWizard", [], 100000).dmg / 30;
  return { k, name: BODIES[k].name, gold: BODIES[k].gold, fam: BODIES[k].family,
           sch: kit === SWORD_KIT ? "⚔" : "✦", wins, maxAnte, dps, score: wins * 1000 + dps };
});
rows.sort((a, b) => b.score - a.score);

// tier buckets by rank position (S≈top 15%, then A/B/C/D)
const n = rows.length, cut = [0.15, 0.38, 0.68, 0.86].map((q) => Math.round(q * n));
const tierOf = (i) => (i < cut[0] ? "S" : i < cut[1] ? "A" : i < cut[2] ? "B" : i < cut[3] ? "C" : "D");

console.log(`\n== BODY TIER LIST (${n} adoptable bodies, standard affinity-matched kit) ==`);
console.log("foe ladder antes:", foes.map((f) => f.ante).join(","));
let cur = "";
rows.forEach((r, i) => {
  const t = tierOf(i);
  if (t !== cur) { console.log(`\n--- ${t} TIER ---`); cur = t; }
  console.log(`  ${r.sch} ${(r.name).padEnd(28)} 💰${r.gold}  foes ${String(r.wins).padStart(2)}/${foes.length}  maxAnte ${String(r.maxAnte).padStart(2)}  dps ${r.dps.toFixed(2)}`);
});

// family + tier summaries
console.log("\n== by gold tier (avg foes beaten) ==");
for (const g of [1, 3, 5]) {
  const gr = rows.filter((r) => r.gold === g);
  console.log(`  💰${g}: avg ${(gr.reduce((s, r) => s + r.wins, 0) / gr.length).toFixed(1)} foes,  dps ${(gr.reduce((s, r) => s + r.dps, 0) / gr.length).toFixed(2)}`);
}
