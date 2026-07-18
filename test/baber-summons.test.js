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
  assert.equal(elemental.maxHp, G.BODIES.earthElemental.maxHp + 2,
    "Fat Cat Specialty toughens a card-summoned elemental");
  assert.equal(`${elemental.meleeBonus}:${elemental.rangedBonus}`, "1:1",
    "Fat Cat Mastery powers every damage school on a card summon");
  G.summonBodies(room, player, { do: "summon", body: "rat", count: 2 });
  const rats = room.allies[0].find((body) => body.ratStack);
  assert.equal(rats.ratUnitHp, 3, "Fat Cat Specialty includes each rat unit");
  assert.equal(rats.meleeBonus, 1, "Fat Cat Mastery includes the merged rat stack");
}

{
  const { room, player } = summonRoom("SUMMON-ROYAL", "leverage", { mastery: 1, specialty: 2 });
  G.summonBodies(room, player, { do: "summon", body: "earthElemental", count: 3 });
  assert.equal(room.allies[0].length, 3, "Royal Rat keeps the authored summon count");
  assert.equal(room.allies[0].filter((body) => body.shield === 2).length, 1,
    "Royal Rat Specialty shields every third summon of any body");
  assert.ok(room.allies[0].every((body) => body.meleeBonus === 1 && body.rangedBonus === 1),
    "Royal Rat Mastery powers every card-summoned body");
}

for (const bodyKey of ["hedge", "affluenceAnubis"]) {
  const { room, player } = summonRoom(`SUMMON-${bodyKey}`, bodyKey, { mastery: 1, specialty: 2 });
  G.summonBodies(room, player, { do: "summon", body: "grandCaster", count: 1 });
  assert.equal(room.allies[0].length, 3, `${bodyKey} Specialty adds bodies to a non-rat card summon`);
  assert.ok(room.allies[0].every((body) => body.meleeBonus === 1 && body.rangedBonus === 1),
    `${bodyKey} Mastery powers every non-rat card summon`);
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
