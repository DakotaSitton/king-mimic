// Focused public-resolver regressions for the owner-ruled 2026-07-19 symmetry ledger.
// Run directly: bun run test/symmetry.test.js
import * as G from "../game.js";

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

eq(buffSnapshot("hero"), { target: 2, source: 0 }, "hero buff honors its explicit live ally target");
eq(buffSnapshot("foe"), { target: 2, source: 0 }, "foe buff honors the same explicit live ally target");

function shieldAllySnapshot(side) {
  const { room, source, friends: [target] } = sideRig(side);
  source.allyTargetId = target.id;
  G.resolveOps(room, source, [{ do: "shieldAlly", amount: 4 }]);
  return { target: target.shield, source: source.shield };
}

eq(shieldAllySnapshot("hero"), { target: 4, source: 0 }, "hero shieldAlly honors its explicit live ally target");
eq(shieldAllySnapshot("foe"), { target: 4, source: 0 }, "foe shieldAlly honors the same explicit live ally target");

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
eq(chequeSnapshot("foe"), { targetShield: 1, woundedHp: 1 }, "foe chequeHeal uses the same explicit-target priority");

function gainSnapshot(side) {
  const { room, source } = sideRig(side, 0, "debtDragon");
  source.moxie = 0;
  source.meleeBonus = 0;
  source.rangedBonus = 0;
  G.resolveOps(room, source, [{ do: "gainMoxie", amount: 10 }]);
  return { moxie: source.moxie, melee: source.meleeBonus, ranged: source.rangedBonus };
}

eq(gainSnapshot("hero"), { moxie: 10, melee: 3, ranged: 3 }, "hero gainMoxie feeds Debt Dragon's gain passive");
eq(gainSnapshot("foe"), { moxie: 10, melee: 3, ranged: 3 }, "foe gainMoxie retains the same gain-passive result");

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

function resolverShieldTelemetry(side, op) {
  const room = oneLaneRoom(`METRIC-${side}-${op.do}`);
  const source = G.addPlayer(room, `${side}-metric-source`, "Metric Source");
  const target = G.addPlayer(room, `${side}-metric-target`, "Metric Target");
  source.lane = target.lane = 0;
  room.laneCount = 1;
  room.lanes = [[]];
  room.allies = [[]];
  if (side === "foe") {
    source.side = target.side = "foe";
    room.lanes[0] = [target, source];
  }
  source.allyTargetId = target.id;
  G.beginCombatMetrics(room);
  G.resolveOps(room, source, [op], null, 0, null, "dBuckler");
  const metrics = Object.values(room._combatMetrics.players);
  return {
    shield: source.shield + target.shield,
    granted: metrics.reduce((sum, metric) => sum + metric.shieldGranted, 0),
    cardGranted: metrics.reduce((sum, metric) => sum + (metric.cards.dBuckler?.shieldGranted ?? 0), 0),
  };
}

for (const op of [
  { do: "shield", amount: 2 },
  { do: "shieldAlly", amount: 2 },
  { do: "chequeHeal", amount: 2 },
  { do: "shieldFront", amount: 2 },
]) {
  const expected = { shield: 2, granted: 2, cardGranted: 2 };
  eq(resolverShieldTelemetry("hero", op), expected, `hero ${op.do} records its shield grant`);
  eq(resolverShieldTelemetry("foe", op), expected, `foe ${op.do} records the same shield-grant telemetry`);
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
