import assert from "node:assert/strict";
import * as G from "../game.js";

let passed = 0;
const check = (value, message) => { assert.ok(value, message); passed++; };
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); passed++; };

// Shops and room effects are absent from every live map node.
for (let attempt = 0; attempt < 50; attempt++) {
  const level = G.buildLevel(1);
  check(level.nodes.every((node) => node.type !== "shop"), "live maps never mint shop nodes");
}

// Retired room-effect state is inert and absent from the public contract, even if a stale save carries it.
{
  const room = G.newRoom("NO-EFFECTS");
  room.telemOff = true;
  const player = G.addPlayer(room, "p", "P");
  player.lane = 0;
  room.phase = "playing";
  room.laneCount = 1;
  room.lanes = [[G.spawnEnemy("rookie", [])]];
  room.lanes[0][0].lane = 0;
  room.allies = [[]];
  room.gimmick = { name: "Retired", foeCostCut: 99 };
  room.roomTimers = [{ kind: "acid", amount: 99, charge: 0, cd: 1 }];
  const hpBefore = player.hp;
  equal(G.foeCardCost("oSword", G.leveledBody(room.lanes[0][0]), room),
    G.cardCost("oSword", G.leveledBody(room.lanes[0][0])), "stale effects cannot discount foe cards");
  G.simulateTick(room);
  equal(player.hp, hpBefore, "stale room timers cannot damage players");
  const publicState = G.snapshot(room);
  check(!("gimmick" in publicState) && !("roomTimers" in publicState) && !("shop" in publicState),
    "retired effects and shops are absent from public snapshots");
}

// Every floor-one opening choice is the same onboarding contract at each supported party size.
for (const party of [1, 2, 4]) {
  const room = G.newRoom(`OPEN-${party}`);
  room.telemOff = true;
  room.floor = 1;
  for (let i = 0; i < party; i++) G.addPlayer(room, `p${i}`, `P${i}`);
  room.level = G.buildLevel(1);
  G.stockLevelRooms(room);

  const openings = room.level.nodes.filter((node) => node.row === 1);
  equal(openings.length, 3, `${party}P gets three opening fight choices`);
  for (const node of openings) {
    equal(node.type, "combat", `${party}P opening choice is a fight`);
    equal(node.effect, null, `${party}P opening choice has no room effect`);
    equal(node.foes.length, party, `${party}P opening choice has one weakest foe per body`);
    for (const foe of node.foes) {
      check(G.COMMON_SET.includes(foe.bodyKey), "opening foe uses a base/common body");
      equal(foe.level, 1, "opening foe is level 1");
      equal(foe.gear.length, 3, "opening foe carries exactly three cards");
      check(foe.gear.every((key) => G.itemTreasure(key) === 1), "opening foe cards are all common/value 1");
      equal(G.foeLootValue(foe), G.minFoeAnte(),
        "opening foe previews its full ⚖7 as droppable ◈ (owner 1:1 ruling 2026-07-22)");
    }
    equal(node.ante, party * G.minFoeAnte(), `${party}P opening threat is only the legal base bodies`);
  }
}

// The advertised ⚖7 = ◈7 reward is materialized and immediately funds level 2 in solo play.
{
  const room = G.newRoom("OPEN-REWARD");
  room.telemOff = true;
  const player = G.addPlayer(room, "p", "P");
  const baseDeck = G.STARTER_DECK.slice(0, G.MIN_DECK);
  player.bodyKey = "rookie";
  player.homeBody = "rookie";
  player.deckList = [...baseDeck];
  player.backpack = [...baseDeck];
  player.runLevel = 1;
  room.phase = "playing";
  room.laneCount = 1;
  room.lanes = [[]];
  room.allies = [[]];
  player.lane = 0;
  room.draftedFoes = [{
    bodyKey: G.COMMON_SET[0],
    gear: G.STARTER_CARD_POOL.slice(0, 3),
    level: 1,
    levelAllocation: G.emptyLevelAllocation(),
  }];

  G.simulateTick(room);
  equal(room.phase, "won", "empty live board resolves the onboarding fight as won");
  equal(room.lootRoll.reduce((s, k) => s + G.itemTreasure(k), 0), G.minFoeAnte(),
    "weakest body drops its full ⚖7 as ◈ — three carried cards plus ◈4 actor comp (1:1 ruling)");
  check(room.lootRoll.length >= 4, "…materialized as its three carried cards plus at least one comp card");
  check(G.levelUp(room, player, room.lootTaken), "the onboarding drops immediately buy level 2");
  equal(player.runLevel, 2, "onboarding reward leaves the player at level 2");
}

console.log(`ONBOARDING: ${passed} passed, 0 failed`);
