// Focused public-resolver regressions for the owner-ruled 2026-07-19 symmetry ledger.
// Run directly: bun run test/symmetry.test.js
import * as G from "../game.js";
import { readFileSync } from "node:fs";

G.setHpMult(1);
G.setCdMult(1);

let passed = 0, failed = 0;
const ok = (value, label) => {
  if (value) passed++;
  else { failed++; console.error("❌ " + label); }
};
const eq = (actual, expected, label) => ok(
  JSON.stringify(actual) === JSON.stringify(expected),
  `${label} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`,
);

function oneLaneRoom(code) {
  const room = G.newRoom(code);
  room.phase = "playing";
  room.laneCount = 1;
  room.lanes = [[]];
  room.allies = [[]];
  room.combatLog = [];
  return room;
}

function sideRig(side, friendCount = 1, bodyKey = "rookie") {
  const room = oneLaneRoom(`SYM-${side}-${bodyKey}`);
  let source, friends;
  if (side === "hero") {
    source = G.addPlayer(room, `${side}-source`, "Source");
    G.wearBody(source, bodyKey);
    friends = Array.from({ length: friendCount }, (_, i) => {
      const p = G.addPlayer(room, `${side}-friend-${i}`, `Friend ${i}`);
      p.lane = 0;
      return p;
    });
    source.lane = 0;
    room.laneCount = 1;
    room.lanes = [[]];
    room.allies = [[]];
  } else {
    const opponent = G.addPlayer(room, `${side}-opponent`, "Opponent");
    opponent.lane = 0;
    source = G.spawnEnemy(bodyKey, [], 1);
    source.lane = 0;
    friends = Array.from({ length: friendCount }, () => {
      const foe = G.spawnEnemy("rookie", [], 1);
      foe.lane = 0;
      return foe;
    });
    room.lanes = [[source, ...friends]];
  }
  return { room, source, friends };
}

function buffSnapshot(side) {
  const { room, source, friends: [target] } = sideRig(side);
  source.allyTargetId = target.id;
  G.resolveOps(room, source, [{ do: "buff", buff: "power", amount: 2, dur: 30 }]);
  return { target: G.buffAmt(target, "power"), source: G.buffAmt(source, "power") };
}

// Seeded target ids below test the public resolver contract independently of the live foeCast chooser.
eq(buffSnapshot("hero"), { target: 2, source: 0 }, "hero buff honors its explicit live ally target");
eq(buffSnapshot("foe"), { target: 2, source: 0 }, "foe buff resolver honors the same explicitly seeded live ally target");

function hasteCastRig(friendSpecs = []) {
  const room = oneLaneRoom("SYM-FOE-SUPPORT");
  const opponent = G.addPlayer(room, "foe-support-opponent", "Opponent");
  opponent.lane = 0;
  const caster = G.spawnEnemy("rookie", ["oHaste"], 1);
  caster.lane = 0;
  const friends = friendSpecs.map(({ level = 1, gear = [], hp = null }) => {
    const foe = G.spawnEnemy("rookie", gear, level);
    foe.lane = 0;
    if (hp != null) foe.hp = hp;
    return foe;
  });
  room.lanes = [[caster, ...friends]];
  caster.moxie = 3;
  return { room, opponent, caster, friends };
}

{
  const { room, caster, friends: [levelFive] } = hasteCastRig([{ level: 5 }]);
  ok(G.foeCast(room, caster), "foe support card resolves through the live foeCast path");
  eq({ targetId: caster.allyTargetId, targetHaste: G.buffAmt(levelFive, "haste"), casterHaste: G.buffAmt(caster, "haste") },
    { targetId: levelFive.id, targetHaste: 1, casterHaste: 0 },
    "low-ante foe caster buffs the higher-ante level-5 friendly instead of itself");
}

{
  const { room, caster, friends: [betterEquipped] } = hasteCastRig([{ gear: ["oHaste", "oHaste"] }]);
  G.foeCast(room, caster);
  eq(caster.allyTargetId, betterEquipped.id, "live carried-card ante participates in foe support targeting");
}

{
  const { room, caster } = hasteCastRig();
  G.foeCast(room, caster);
  eq({ targetId: caster.allyTargetId, casterHaste: G.buffAmt(caster, "haste") },
    { targetId: caster.id, casterHaste: 1 }, "foe support targeting falls back to self when alone");
}

{
  const { room, opponent, caster, friends: [deadHighAnte, living] } = hasteCastRig([
    { level: 9, hp: 0 }, { level: 3 },
  ]);
  caster.allyTargetId = opponent.id;
  G.foeCast(room, caster);
  eq({ targetId: caster.allyTargetId, livingHaste: G.buffAmt(living, "haste"), deadHaste: G.buffAmt(deadHighAnte, "haste"), opposingHaste: G.buffAmt(opponent, "haste") },
    { targetId: living.id, livingHaste: 1, deadHaste: 0, opposingHaste: 0 },
    "foe support targeting excludes dead friendlies and opposing combatants");
}

{
  const { room, caster, friends: [firstTie, secondTie] } = hasteCastRig([
    { gear: ["oHaste"] }, { gear: ["oHaste"] },
  ]);
  room.lanes[0] = [firstTie, caster, secondTie];
  G.foeCast(room, caster);
  eq(caster.allyTargetId, firstTie.id, "equal-ante foe support targets use stable lane/front order");
}

function shieldAllySnapshot(side) {
  const { room, source, friends: [target] } = sideRig(side);
  source.allyTargetId = target.id;
  G.resolveOps(room, source, [{ do: "shieldAlly", amount: 4 }]);
  return { target: target.shield, source: source.shield };
}

eq(shieldAllySnapshot("hero"), { target: 4, source: 0 }, "hero shieldAlly honors its explicit live ally target");
eq(shieldAllySnapshot("foe"), { target: 4, source: 0 }, "foe shieldAlly resolver honors the same explicitly seeded live ally target");

for (const side of ["hero", "foe"]) {
  const { room, source } = sideRig(side);
  const opposingId = side === "hero" ? room.lanes[0][0]?.id : [...room.players.values()][0].id;
  if (side === "hero" && !opposingId) {
    const opponent = G.spawnEnemy("rookie", [], 1);
    opponent.lane = 0;
    room.lanes[0].push(opponent);
    source.allyTargetId = opponent.id;
  } else source.allyTargetId = opposingId;
  G.resolveOps(room, source, [{ do: "shieldAlly", amount: 3 }]);
  eq(source.shield, 3, `${side} rejects an opposing allyTargetId and uses shieldAlly's self fallback`);
}

function chequeSnapshot(side) {
  const { room, source, friends: [target, wounded] } = sideRig(side, 2);
  target.hp = target.maxHp;
  wounded.hp = 1;
  source.allyTargetId = target.id;
  G.resolveOps(room, source, [{ do: "chequeHeal", amount: 1 }]);
  return { targetShield: target.shield, woundedHp: wounded.hp };
}

eq(chequeSnapshot("hero"), { targetShield: 1, woundedHp: 1 }, "hero chequeHeal prioritizes the explicit full-HP ally and shields it");
eq(chequeSnapshot("foe"), { targetShield: 1, woundedHp: 1 }, "foe chequeHeal resolver uses the same explicitly seeded target priority");

function gainSnapshot(side) {
  const { room, source } = sideRig(side, 0, "debtDragon");
  source.moxie = 0;
  source.meleeBonus = 0;
  source.rangedBonus = 0;
  G.resolveOps(room, source, [{ do: "gainMoxie", amount: 10 }]);
  return { moxie: source.moxie, melee: source.meleeBonus, ranged: source.rangedBonus };
}

eq(gainSnapshot("hero"), { moxie: 10, melee: 5, ranged: 5 }, "hero gainMoxie feeds Debt Dragon's gain passive");
eq(gainSnapshot("foe"), { moxie: 10, melee: 5, ranged: 5 }, "foe gainMoxie retains the same gain-passive result");

function bareHealSnapshot(side) {
  const { room, source } = sideRig(side, 0);
  source.maxHp = 10;
  source.hp = 2;
  G.resolveOps(room, source, [{ do: "heal", amount: 3 }]);
  return { hp: source.hp, logged: room.combatLog.some((line) => line.includes("heals 3")) };
}

eq(bareHealSnapshot("hero"), { hp: 5, logged: true }, "hero resolves the bare heal alias");
eq(bareHealSnapshot("foe"), { hp: 5, logged: true }, "foe bare heal remains identical");

function summonArmedSnapshot(side) {
  const { room, source } = sideRig(side, 0);
  G.resolveOps(room, source, [{ do: "summonArmed", body: "rat", count: 1 }]);
  const summons = side === "hero" ? room.allies[0] : room.lanes[0].filter((c) => c !== source);
  return summons.map((c) => ({ bodyKey: c.bodyKey, hp: c.hp, side: c.side }));
}

eq(summonArmedSnapshot("hero"), [{ bodyKey: "rat", hp: 1, side: "hero" }], "hero summonArmed creates its armed ally");
eq(summonArmedSnapshot("foe"), [{ bodyKey: "rat", hp: 1, side: "foe" }], "foe summonArmed keeps the same result");

function sapLastHitSnapshot(side) {
  const { room, source } = sideRig(side, 0);
  let doomed, survivor;
  if (side === "hero") {
    doomed = G.spawnEnemy("rookie", [], 1);
    survivor = G.spawnEnemy("rookie", [], 1);
    doomed.lane = survivor.lane = 0;
    room.lanes[0] = [doomed, survivor];
  } else {
    doomed = [...room.players.values()][0];
    survivor = G.addPlayer(room, "foe-survivor", "Survivor");
    doomed.lane = survivor.lane = 0;
  }
  doomed.maxHp = doomed.hp = 3;
  survivor.maxHp = survivor.hp = 10;
  G.resolveOps(room, source, [
    { do: "deal", amount: 3, target: "lane" },
    { do: "sap", ofLastHit: true, dur: 60 },
  ]);
  return {
    doomedHp: doomed.hp,
    doomedSap: G.buffAmt(doomed, "sap"),
    survivorHp: survivor.hp,
    survivorSap: G.buffAmt(survivor, "sap"),
  };
}

const sapExpected = { doomedHp: 0, doomedSap: 0, survivorHp: 7, survivorSap: 3 };
eq(sapLastHitSnapshot("hero"), sapExpected, "hero sap-of-last-hit excludes the defeated target and saps the survivor");
eq(sapLastHitSnapshot("foe"), sapExpected, "foe sap-of-last-hit uses the same liveness filter");

// Combat telemetry is intentionally player-ledger-only: a real foe target is not a metric player, so
// resolving a foe shield correctly produces no foe metric row. Guard the ruled instrumentation change
// honestly at its seam: every shared shield verb invokes the same metric hook with no foe-side gate.
const combatSource = readFileSync(new URL("../engine/combat.js", import.meta.url), "utf8");
for (const verb of ["shield", "shieldAlly", "chequeHeal", "shieldFront"]) {
  const start = combatSource.indexOf(`if (op.do === "${verb}")`);
  const end = combatSource.indexOf("\n    if (op.do ===", start + 1);
  const block = combatSource.slice(start, end < 0 ? undefined : end);
  ok(start >= 0 && block.includes("recordShieldGrantMetric"), `${verb} invokes the shared shield-grant telemetry hook`);
  ok(!block.includes('source.side !== "foe"'), `${verb} has no foe-only telemetry gate`);
}

function mirrorLogSnapshot(side) {
  const { room, source } = sideRig(side, 0);
  G.resolveOps(room, source, [{ do: "mirror" }]);
  return { charges: source.mirrorShield, logged: room.combatLog.some((line) => line.includes("raises a mirror")) };
}

eq(mirrorLogSnapshot("hero"), { charges: 1, logged: true }, "hero mirror arms and logs");
eq(mirrorLogSnapshot("foe"), { charges: 1, logged: true }, "foe mirror arms and logs identically");

function revealLightLogSnapshot(side) {
  const { room, source } = sideRig(side, 0);
  G.resolveOps(room, source, [{ do: "revealLight", count: 3 }]);
  G.resolveOps(room, source, [{ do: "revealLight", count: 3 }]);
  return {
    charges: source.revealLight,
    alreadyLogged: room.combatLog.some((line) => line.includes("already sworn (once per fight)")),
  };
}

eq(revealLightLogSnapshot("hero"), { charges: 3, alreadyLogged: true }, "hero revealLight re-cast stays capped and logs the guard");
eq(revealLightLogSnapshot("foe"), { charges: 3, alreadyLogged: true }, "foe revealLight logs the same re-cast guard");

if (failed) {
  console.error(`\n❌ SYMMETRY FAILED — ${passed} passed, ${failed} failed.`);
  process.exit(1);
}
console.log(`\n✅ ALL PASS — ${passed} passed, 0 failed.`);
