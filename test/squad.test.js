// PARTY MODE - one human seat owns one full-deck main body plus 1-3 exact
// three-card companions. Every body remains a real combat entity so ordinary
// lanes, encounters, bosses, rewards, and progression can match an equally
// sized human party.
// Run: bun run test/squad.test.js
import * as G from "../game.js";

let pass = 0, fail = 0;
const ok = (condition, message) => {
  if (condition) pass++;
  else { fail++; console.log("FAIL", message); }
};
const eq = (actual, expected, message) =>
  ok(actual === expected, `${message} (got ${actual}, want ${expected})`);
const offersFor = (room, id) => room.draftWheel.filter((bundle) => bundle.offeredTo === id);
const points = (player) => Object.values(player.levelAllocation ?? {})
  .reduce((sum, value) => sum + (Number(value) || 0), 0);

function makeParty(size, code = "PARTY") {
  const room = G.newRoom(code);
  room.telemOff = true;
  const main = G.addPlayer(room, "host", "Host");
  for (let i = 1; i < size; i++) {
    G.addPlayer(room, `host-b${i}`, `Companion ${i}`, {
      bot: true,
      owner: main.id,
      partyRole: "companion",
    });
  }
  main.partyRole = size > 1 ? "main" : "solo";
  return { room, main, members: [...room.players.values()] };
}

// A Party 4 is represented by four actual combatants, just like four humans.
{
  const { room, members } = makeParty(4, "PARTY4");
  eq(room.players.size, 4, "Party 4 provisions four player entities");
  eq(G.deriveLaneCount(room), 4, "Party 4 receives the same four lanes as four humans");
  eq(G.bossPartySize(room), 4, "boss math counts every party body");
  eq(G.partyMembers(room, members[2]).length, 4, "any companion resolves the complete owned party");
}

// Draft power: the main body gets an ordinary 10-card starter; companions get
// a foe-style three-card loadout. Every body still chooses its own chassis.
let draftedParty;
{
  draftedParty = makeParty(4, "DRAFT4");
  const { room, main, members } = draftedParty;
  G.startDraft(room);
  eq(main.partyRole, "main", "a multi-body seat has one main body");
  ok(members.slice(1).every((player) => player.partyRole === "companion"),
    "all additional bodies are companions");
  eq(room.draftWheel.length, 12, "four bodies receive three private chassis offers each");
  eq(new Set(room.draftWheel.map((bundle) => bundle.bodyKey)).size, 12,
    "the twelve offered chassis remain globally distinct");
  for (const player of members) {
    const offers = offersFor(room, player.id);
    eq(offers.length, 3, `${player.name} gets three private offers`);
    ok(offers.every((bundle) => bundle.items.length === (player === main ? 10 : 3)),
      `${player.name} offers use the correct starter-deck size`);
    G.draftPick(room, player, offers[0].id);
  }
  eq(main.deckList.length, 10, "main body locks a full ten-card deck");
  ok(members.slice(1).every((player) => player.deckList.length === 3),
    "every companion locks an exact three-card deck");
  ok(members.slice(1).every((player) => G.deckMinFor(player) === 3 && G.deckMaxFor(player) === 3),
    "companion deck editing is fixed at exactly three cards");
  eq(G.deckMinFor(main), 10, "the main body retains the ordinary ten-card floor");
  ok(G.draftComplete(room), "the run begins only after all four bodies are chosen");

  const snap = G.snapshot(room);
  const mainSnap = snap.players.find((player) => player.id === main.id);
  const companionSnap = snap.players.find((player) => player.id === members[1].id);
  eq(mainSnap.partySize, 4, "snapshots expose the owned party size");
  eq(companionSnap.maxDeck, 3, "snapshots expose the companion's exact deck cap");
  eq(mainSnap.maxDeck, null, "snapshots leave the main deck uncapped");
  eq(mainSnap.nextLevelCost, 20, "the displayed Party 4 level cost equals four ordinary L2 costs");
}

// A companion has one visible card and exhausts all three before the initial
// card repeats. The opening order is shuffled once, then cycles like a foe.
{
  const companion = {
    partyRole: "companion",
    cards: G.mintCards(["oSword", "oFire", "oHoly"]),
  };
  G.dealHand(companion);
  eq(companion.hand.length, 1, "a companion exposes one card at a time");
  eq(companion.deck.length, 2, "the other two companion cards form the queue");
  const played = [];
  for (let i = 0; i < 4; i++) {
    played.push(companion.hand[0].key);
    (companion.disc ??= []).push(companion.hand.shift());
    G.drawUp(companion);
  }
  eq(new Set(played.slice(0, 3)).size, 3, "all three companion cards exhaust before a repeat");
  eq(played[3], played[0], "the three-card companion queue repeats in its fixed order");
}

// Party leveling buys the same aggregate power as leveling N individual
// players: N times the normal price, every body gains the level, every body
// receives its own new allocation point, and payment comes from the main bank.
{
  const { room, main, members } = makeParty(4, "LEVEL4");
  room.phase = "won";
  main.treasure = 19;
  const chosen = { hp: 1, melee: 0, ranged: 0, mastery: 0, specialty: 0 };
  ok(!G.levelUp(room, members[2], [], chosen), "nineteen treasure cannot buy a Party 4 level");
  ok(members.every((player) => G.runLevelOf(player) === 1),
    "a refused shared level changes no body");
  main.treasure = 20;
  ok(G.levelUp(room, members[2], [], chosen), "twenty treasure buys the Party 4 level");
  ok(members.every((player) => G.runLevelOf(player) === 2),
    "one purchase raises every party body to level two");
  eq(points(members[2]), 1, "the body chosen for the purchase spends its new allocation point");
  ok(members.every((player) =>
    G.levelPointBudget(G.runLevelOf(player)) - G.allocationPoints(player.bodyKey, player.levelAllocation) >= 0),
  "every party body owns its independent level-two point budget");
  ok(members.filter((player) => player !== members[2]).every((player) => points(player) === 0),
    "the other bodies keep their new point unspent for the player's later choice");
  eq(main.treasure, 0, "a companion-triggered level spends the shared main-body bank");
}

// Reward equity is per simulated body. A three-body seat alongside one solo
// human receives 3/4 of aggregate bid value, matching its 3/4 threat share.
{
  const { room, main } = makeParty(3, "REWARD");
  const solo = G.addPlayer(room, "guest", "Guest");
  G.grantBidPoints(room, 40);
  eq(main.bidPoints, 30, "a three-body seat receives three shares of a forty-point reward");
  eq(solo.bidPoints, 10, "a solo seat receives one share of a forty-point reward");
  G.grantBidPoints(room, 7);
  eq(main.bidPoints, 35, "reward remainders stay close to the seat's per-body share");
  eq(solo.bidPoints, 12, "the smaller seat receives its fair accumulated remainder");
}

// All treasure belongs to the seat even when a companion owns the spare.
{
  const { room, main, members } = makeParty(2, "WALLET");
  const companion = members[1];
  room.phase = "setup";
  companion.deckList = ["oHatchet", "oSpear", "oBow"];
  companion.backpack = [...companion.deckList, "oSword"];
  const value = G.convertBackpack(room, companion);
  eq(value, G.itemTreasure("oSword"), "companion spare conversion reports its card value");
  eq(main.treasure, value, "companion conversion credits the shared main-body wallet");
  eq(companion.treasure, 0, "companions do not fork a second treasure wallet");
}

// Cross-body equipment movement uses exact deck/spare zones so duplicates do
// not move the wrong copy. Deck-for-deck swaps preserve both deck sizes.
{
  const { room, main, members } = makeParty(2, "LOADOUT");
  const companion = members[1];
  room.phase = "setup";
  main.deckList = Array(10).fill("oSword");
  main.backpack = [...main.deckList, "oFire"];
  companion.deckList = ["oHatchet", "oSpear", "oBow"];
  companion.backpack = [...companion.deckList, "oHoly"];

  ok(G.swapOwnItems(room, main, companion.id, "oFire", "oHatchet", {
    fromDeck: false,
    toDeck: true,
  }), "a selected main spare swaps with a selected companion deck card");
  eq(main.deckList.length, 10, "the spare side leaves the main deck size unchanged");
  ok(!main.deckList.includes("oHatchet"), "the main spare swap does not silently enter the main deck");
  eq(companion.deckList.length, 3, "the companion deck remains exactly three cards after a swap");
  ok(companion.deckList.includes("oFire") && !companion.deckList.includes("oHatchet"),
    "the selected companion deck slot receives the selected main card");

  ok(!G.giveOwnItem(room, main, companion.id, "oSword", true),
    "moving a main deck card is refused at the ten-card floor");
  ok(G.giveOwnItem(room, companion, main.id, "oHoly", false),
    "a companion spare moves to the main body in one action");
  eq(companion.deckList.length, 3, "moving a companion spare never disturbs its three-card deck");
  ok(main.backpack.includes("oHoly"), "the destination body receives the moved spare");
}

// The Party Equipment board also replaces one companion deck slot from that
// same companion's stash. This is a deck edit, not an ownership transfer:
// the backpack multiset stays unchanged and the fixed three-card deck stays 3.
{
  const { room, members } = makeParty(2, "SAMEBODY");
  const companion = members[1];
  room.phase = "setup";
  companion.deckList = ["oHatchet", "oSpear", "oBow"];
  companion.backpack = [...companion.deckList, "oHoly"];
  const heldBefore = [...companion.backpack].sort().join(",");

  ok(G.swapOwnItems(room, companion, companion.id, "oHatchet", "oHoly", {
    fromDeck: true,
    toDeck: false,
  }), "a companion deck card swaps directly with its own stash card");
  eq(companion.deckList.length, 3, "same-body replacement preserves the exact three-card deck");
  ok(companion.deckList.includes("oHoly") && !companion.deckList.includes("oHatchet"),
    "the selected stash card takes the selected companion deck slot");
  eq([...companion.backpack].sort().join(","), heldBefore,
    "same-body replacement preserves every held card");
  ok(G.swapOwnItems(room, companion, companion.id, "oHatchet", "oHoly", {
    fromDeck: false,
    toDeck: true,
  }), "the same replacement also works when the stash card is tapped first");
  ok(companion.deckList.includes("oHatchet") && !companion.deckList.includes("oHoly"),
    "stash-first replacement restores the selected original slot");
  ok(!G.swapOwnItems(room, companion, companion.id, "oSpear", "oBow", {
    fromDeck: true,
    toDeck: true,
  }), "same-body deck-to-deck taps are not misread as a replacement");
}

console.log(`\nPARTY MODE: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
