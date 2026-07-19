import assert from "node:assert/strict";
import * as G from "../game.js";

G.setHpMult(1);
G.setCdMult(1);

const summonRoom = (code, bodyKey, allocation) => {
  const room = G.newRoom(code); room.laneCount = 1; room.lanes = [[]]; room.allies = [[]];
  const player = G.addPlayer(room, `p-${bodyKey}`, bodyKey); G.wearBody(player, bodyKey);
  player.lane = 0; player.depth = 0;
  player.levelAllocation = { ...G.emptyLevelAllocation(), ...allocation };
  return { room, player };
};

{
  const { room, player } = summonRoom("SUMMON-FAT", "frugal", { mastery: 1, specialty: 2 });
  G.summonBodies(room, player, { do: "summon", body: "earthElemental", count: 1 });
  const elemental = room.allies[0][0];
  assert.equal(elemental.maxHp, G.BODIES.earthElemental.maxHp,
    "Fat Cat damage Specialty does not rewrite summon health");
  assert.equal(elemental.summonDamageBonus, 2,
    "Fat Cat Specialty records one universal damage bonus on a card summon");
  G.summonBodies(room, player, { do: "summon", body: "rat", count: 2 });
  const rats = room.allies[0].find((body) => body.ratStack);
  assert.equal(rats.ratCount, 2, "Fat Cat's two rats still merge into two real units");
  assert.equal(rats.ratUnitHp, 1, "Fat Cat damage Specialty leaves per-rat health unchanged");
  assert.equal(rats.summonDamageBonus, 2, "Fat Cat Specialty counts the merged rat stack as one buffed entity");
}

{
  const { room, player } = summonRoom("SUMMON-ROYAL", "leverage", { mastery: 1, specialty: 2 });
  G.summonBodies(room, player, { do: "summon", body: "earthElemental", count: 3 });
  assert.equal(room.allies[0].length, 3, "Royal Rat keeps the authored summon count");
  assert.ok(room.allies[0].every((body) => body.shield === 2),
    "Royal Rat Specialty gives every card-summoned body innate shield");
  assert.ok(room.allies[0].every((body) => !body.summonDamageBonus),
    "Royal Rat Mastery changes cadence without adding summon damage");
  G.summonBodies(room, player, { do: "summon", body: "rat", count: 3 });
  const rats = room.allies[0].find((body) => body.ratStack);
  assert.equal(rats.shield, 6, "Royal Rat's innate shield stacks once for each rat merged into the entity");
}

{
  const { room, player } = summonRoom("SUMMON-hedge", "hedge", { mastery: 1, specialty: 2 });
  G.summonBodies(room, player, { do: "summon", body: "grandCaster", count: 1 });
  assert.equal(room.allies[0].length, 3, "Paid Piper Specialty adds bodies to a non-rat card summon");
  assert.ok(room.allies[0].every((body) => !body.summonDamageBonus),
    "Paid Piper Mastery changes cadence without adding summon damage");
}

{
  const { room, player } = summonRoom("SUMMON-affluenceAnubis", "affluenceAnubis", { mastery: 1, specialty: 2 });
  G.summonBodies(room, player, { do: "summon", body: "grandCaster", count: 1 });
  assert.equal(room.allies[0].length, 1, "Affluence Anubis keeps the authored summon count");
  assert.equal(room.allies[0][0].dmgReduce, (G.BODIES.grandCaster.dmgReduce ?? 0) + 2,
    "Affluence Anubis grants armor to every non-rat card summon");
}

{
  const room = G.newRoom("SUMMON-MIXED-RATS"); room.laneCount = 1; room.lanes = [[]]; room.allies = [[]];
  const plain = G.addPlayer(room, "plain", "Plain"); G.wearBody(plain, "rookie"); plain.lane = 0;
  const fat = G.addPlayer(room, "fat", "Fat"); G.wearBody(fat, "frugal"); fat.lane = 0;
  fat.levelAllocation = { ...G.emptyLevelAllocation(), specialty: 1 };
  G.summonBodies(room, plain, { do: "summon", body: "rat", count: 3 });
  G.summonBodies(room, fat, { do: "summon", body: "rat", count: 1 });
  const rats = room.allies[0].find((body) => body.ratStack);
  assert.equal(`${rats.ratCount}:${rats.hp}:${rats.ratUnitHp}`, "4:4:1",
    "a Fat Cat rat joining a plain stack preserves all four rat bodies");
  assert.equal(rats.summonDamageBonus, 1, "the mixed merged stack receives Fat Cat damage once as one entity");
}

// Functional damage oracles: Fat Cat must change what every summon LANDS, not merely a badge field.
for (const side of ["hero", "foe"]) {
  const { room, player } = summonRoom(`SUMMON-FAT-DAMAGE-${side}`, "frugal", { specialty: 2 });
  player.side = side;
  const target = side === "hero" ? G.spawnEnemy("rookie") : player;
  if (side === "hero") { target.side = "foe"; target.lane = 0; target.hp = target.maxHp = 100; room.lanes[0] = [target]; }
  else { player.hp = player.maxHp = 100; }

  G.summonBodies(room, player, { do: "summon", body: "rat", count: 1 });
  const rat = (side === "hero" ? room.allies[0] : room.lanes[0]).find((body) => body.ratStack);
  rat.moxie = 3;
  const beforeBite = target.hp;
  assert.ok(G.foeCast(room, rat), `Fat Cat ${side} rat can cast Bite`);
  assert.equal(beforeBite - target.hp, 3, `Fat Cat ${side} rat Bite lands base 1 + Specialty 2`);

  G.summonBodies(room, player, { do: "summon", body: "largeRat", count: 1 });
  const largeRat = (side === "hero" ? room.allies[0] : room.lanes[0]).find((body) => body.bodyKey === "largeRat");
  const beforeAttack = target.hp;
  G.resolveOps(room, largeRat, [{ do: "attack" }]);
  assert.equal(beforeAttack - target.hp, 4, `Fat Cat ${side} passive attack lands base 2 + Specialty 2`);
}

// Anubis armor must mitigate real hits on both sides with the shared body-DR min-1 convention.
for (const side of ["hero", "foe"]) {
  const { room, player } = summonRoom(`SUMMON-ANUBIS-ARMOR-${side}`, "affluenceAnubis", { specialty: 2 });
  player.side = side;
  G.summonBodies(room, player, { do: "summon", body: "grandCaster", count: 1 });
  const spirit = (side === "hero" ? room.allies[0] : room.lanes[0]).find((body) => body.bodyKey === "grandCaster");
  const before = spirit.hp;
  if (side === "hero") G.foeHitLane(room, 0, 5, G.spawnEnemy("rookie"));
  else G.damageEnemy(room, 0, spirit, 5, player);
  assert.equal(before - spirit.hp, 3, `Anubis ${side} summon armor reduces a real 5 hit to 3`);
  if (side === "hero") {
    const beforeAoe = spirit.hp;
    G.foeHitLaneAll(room, 0, 5, G.spawnEnemy("rookie"));
    assert.equal(beforeAoe - spirit.hp, 3, "Anubis hero summon armor also reduces lane-wide hits");
  }
}

{
  const room = G.newRoom("baber"); room.laneCount = 1; room.lanes = [[]]; room.allies = [[]];
  const partner = G.addPlayer(room, "partner", "Partner"); partner.lane = 0; partner.depth = 0;
  assert.equal(partner.maxHp, G.BODIES.rookie.maxHp * 3, "BABER triples Rookie base health");
  G.wearBody(partner, "frugal");
  assert.equal(partner.maxHp, G.BODIES.frugal.maxHp * 3, "BABER triple-base health survives a body swap");
  partner.runLevel = 2;
  partner.levelAllocation = { ...G.emptyLevelAllocation(), hp: 1 };
  G.applyBodyLevel(partner);
  assert.equal(partner.maxHp, G.BODIES.frugal.maxHp * 3 + G.LEVEL_HP_PER_POINT,
    "BABER triples only base health and leaves level HP additive");

  partner.hp = partner.maxHp; partner.alive = true;
  const foe = G.spawnEnemy("bloodfund"); foe.side = "foe"; foe.lane = 0;
  assert.equal(G.damagePlayer(room, partner, 5, { source: foe }), 3,
    "BABER halves odd hostile damage with visible-hit rounding");
  const afterFoe = partner.hp;
  assert.equal(G.damagePlayer(room, partner, 5, { source: partner }), 5,
    "BABER does not halve self/friendly damage");
  assert.equal(afterFoe - partner.hp, 5, "BABER friendly damage reaches HP unchanged");
}

{
  const room = G.newRoom("BABERX"); room.laneCount = 1; room.lanes = [[]]; room.allies = [[]];
  const player = G.addPlayer(room, "normal", "Normal"); player.lane = 0;
  const foe = G.spawnEnemy("bloodfund"); foe.side = "foe"; foe.lane = 0;
  assert.equal(player.maxHp, G.BODIES.rookie.maxHp, "BABER-like room codes do not enable the shortcut");
  assert.equal(G.damagePlayer(room, player, 5, { source: foe }), 5, "normal rooms keep full foe damage");
}

console.log("BABER + SUMMON INHERITANCE PASS");
