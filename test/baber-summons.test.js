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
  assert.equal(rats.summonDamageBonus, 4, "Fat Cat Specialty gives each of the two merged rats +2 damage");
}

{
  const { room, player } = summonRoom("SUMMON-ROYAL", "leverage", { mastery: 1, specialty: 2 });
  G.summonBodies(room, player, { do: "summon", body: "earthElemental", count: 3 });
  assert.equal(room.allies[0].length, 3, "Royal Rat keeps the authored summon count");
  assert.ok(room.allies[0].every((body) => body.shield === 5),
    "Royal Rat Mastery gives every Earth Elemental shield equal to its five-moxie summon cost");
  assert.ok(room.allies[0].every((body) => !body.summonDamageBonus),
    "Royal Rat Mastery adds shield without adding summon damage");
  G.summonBodies(room, player, { do: "summon", body: "rat", count: 3 });
  const rats = room.allies[0].find((body) => body.ratStack);
  assert.equal(rats.shield, 3, "Royal Rat treats every passive or card-created rat as moxie cost one");
}

{
  const { room, player } = summonRoom("SUMMON-ROYAL-REAL-CAST", "leverage", { mastery: 1, specialty: 2 });
  room.phase = "playing";
  player.cards = G.mintCards(["oEarthElemental"]);
  player.hand = [...player.cards]; player.deck = []; player.discard = []; player.moxie = 10;
  assert.ok(G.playCard(room, player, player.hand[0].id), "Royal Rat can resolve a real five-moxie summon card");
  const elemental = room.allies[0].find((body) => body.bodyKey === "earthElemental");
  const rats = room.allies[0].find((body) => body.bodyKey === "rat");
  assert.equal(elemental.shield, 5, "real summon cast gives its body shield equal to the five moxie actually spent");
  assert.equal(rats.ratCount, 3, "Specialty rank two adds two rats to Royal Rat's every-three-moxie trigger");
  assert.equal(rats.shield, 3, "each of those three cost-one rats receives one shield from Mastery");
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
  player.regens = [];
  G.applyCombatStart(player);
  G.summonBodies(room, player, { do: "summon", body: "grandCaster", count: 1 });
  assert.equal(room.allies[0].length, 1, "Affluence Anubis keeps the authored summon count");
  assert.equal(room.allies[0][0].dmgReduce, G.BODIES.grandCaster.dmgReduce,
    "Affluence Anubis no longer rewrites non-rat summon armor");
  const clock = player.regens.find((g) => g.kind === "escalatingRats");
  assert.equal(clock.growth, 4, "Anubis Mastery plus Specialty rank two grows waves by four rats");
  for (let tick = 0; tick < 60; tick++) G.tickRegens(player, room);
  const rats = room.allies[0].find((body) => body.bodyKey === "rat");
  assert.equal(rats.ratCount, 5, "that Anubis first wave summons one base rat plus four growth rats");
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
  assert.equal(rats.summonDamageBonus, 4, "all four living rats in the merged stack receive Fat Cat's +1 rank");
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

// Timeshare Mastery doubles real summon moxie gain on both sides.
for (const side of ["hero", "foe"]) {
  const { room, player } = summonRoom(`SUMMON-TIMESHARE-MOXIE-${side}`, "timeshareTyrant", { mastery: 1 });
  player.side = side;
  G.summonBodies(room, player, { do: "summon", body: "grandCaster", count: 1 });
  const spirit = (side === "hero" ? room.allies[0] : room.lanes[0]).find((body) => body.bodyKey === "grandCaster");
  spirit.moxie = 0; spirit.moxieClock = 0;
  G.regenMoxie(spirit, 5);
  assert.equal(spirit.moxie, 1, `Timeshare ${side} summon gains a full moxie from a half-normal charge`);
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
