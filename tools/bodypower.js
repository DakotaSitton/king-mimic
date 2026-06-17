// BODY POWER CURVE (owner 2026-06-16: "what's the highest ante a good/bad body can beat?
// does the math even work? senior foes feel impossible"). Pure-engine 1v1: a player on a
// given body+kit vs ONE foe, real body HP, real 20-HP caravan, mashing every item at the
// foe (the fuzz-bot's hands). WIN = foe dies before the caravan. Run: bun tools/bodypower.js
import * as G from "../game.js";
const { KIT, BODIES } = G;

// --- raw stat gap the rarity STEP creates (HP × table, +1 Power per tier) -------------
const fams = ["pixie", "vampire", "minotaur", "royalRat"];
console.log("== body stat gap: Junior → Senior (the +Power step + HP×2.4) ==");
for (const f of fams) {
  const j = BODIES[f], r = BODIES[f + "R"];
  const pw = (b) => `⚔${b.phys || 0}/✦${b.mag || 0}`;
  console.log(`${(BODIES[f].name).padEnd(26)} Junior ❤${j.maxHp} ${pw(j)}   →   Senior ❤${r.maxHp} ${pw(r)}`);
}

// --- the fight ------------------------------------------------------------------------
function fight(pBody, kit, foeBody, foeGear) {
  const r = G.newRoom("BP");
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, pBody); p.lane = 0; p.depth = 0;
  p.inv = kit.map((k) => ({ key: k, charge: 0, cd: KIT[k].cd }));
  r.phase = "playing"; r.laneCount = 1; r.allies = [[]];
  r.caravan = { hp: 20, max: 20 };
  const foe = G.spawnEnemy(foeBody, foeGear); foe.lane = 0; r.lanes = [[foe]];
  for (let t = 0; t < 3000; t++) {
    if (foe.hp <= 0) return { win: true, t, cav: r.caravan.hp };
    if (r.caravan.hp <= 0) return { win: false, t, cav: 0 };
    if (p.alive) {
      p.targetId = foe.id; G.ensureTarget(r, p);
      if (p.echoReady) G.armEcho(r, p);
      for (let s = 0; s < p.inv.length; s++) G.useItem(r, p, s);
    }
    G.simulateTick(r);
  }
  return { win: foe.hp <= 0, t: 3000, cav: r.caravan.hp };
}

// escalating foe ante ladder (body gold + gear ante)
const foes = [
  ["pixie", []], ["pixie", ["blade"]], ["pixieU", ["blade"]], ["pixieU", ["crossbow"]],
  ["pixieR", ["blade"]], ["pixieR", ["crossbow"]], ["pixieR", ["crossbow", "slimeCrown"]],
  ["vampireR", ["crossbow"]], ["minotaurR", ["spear"]],
].map(([b, g]) => ({ b, g, ante: G.anteOfFoe({ bodyKey: b, gear: g }) }))
 .sort((x, y) => x.ante - y.ante);

const loadouts = [
  ["rookie", ["blade", "bow", "smallShield"], "BAD  · rookie starter"],
  ["pixie",  ["crossbow", "blade", "smallShield"], "JR   · Junior pixie + crossbow"],
  ["pixieR", ["crossbow", "blade", "smallShield"], "SR   · Senior pixie + crossbow (SAME kit)"],
  ["pixieR", ["crossbow", "spear", "bigShield"],   "SR+  · Senior pixie, strong kit"],
];

console.log("\n== max foe ANTE each loadout can beat (1v1, mash, 20-HP caravan) ==");
for (const [body, kit, label] of loadouts) {
  let maxAnte = -1; const row = [];
  for (const f of foes) {
    const res = fight(body, kit, f.b, f.g);
    row.push(`a${f.ante}${res.win ? "✓" : "✗"}`);
    if (res.win) maxAnte = Math.max(maxAnte, f.ante);
  }
  console.log(`${label.padEnd(42)} max ante ${maxAnte === -1 ? "— (beats nothing)" : maxAnte}   [${row.join(" ")}]`);
}

// the headline matchup: can a weak body even touch a Senior foe?
console.log("\n== headline: a Senior foe (Senior pixie + crossbow, ante " +
  G.anteOfFoe({ bodyKey: "pixieR", gear: ["crossbow"] }) + ") ==");
for (const [body, kit, label] of loadouts) {
  const res = fight(body, kit, "pixieR", ["crossbow"]);
  console.log(`${label.padEnd(42)} ${res.win ? "WIN" : "LOSS"}  (${(res.t / 10).toFixed(1)}s, caravan ${res.cav}/20)`);
}
