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

// ---------------------------------------------------------------------------
// PARTY LOOT ASSIGN (owner 2026-07-24: "Change party mode to not bother with the stash. Let me just
// get the loot, easily sort it out to each companion or my main body."). assignLoot pays for the
// drop, records ownership in the TARGET body's backpack (the ledger convertBackpack/level-ups run
// on), and seats it in that body's deck in one action. Companion decks stay EXACTLY 3: the incoming
// card takes the named slot and the outgoing card returns to the SHARED loot pool.
// EVERY card in the run lives in exactly one place — room.loot or some body's backpack. `held`
// snapshots that whole multiset so no assign can duplicate or vanish a card.
const held = (room) => [
  ...(room.loot ?? []),
  ...[...room.players.values()].flatMap((p) => p.backpack ?? []),
].sort().join(",");

// Assigning to a COMPANION: exact 1-for-1 slot replacement, outgoing card back to the pool.
{
  const { room, main, members } = makeParty(3, "ASSIGN3");
  const companion = members[1], other = members[2];
  room.phase = "won";
  main.deckList = Array(10).fill("oSword"); main.backpack = [...main.deckList];
  for (const body of [companion, other]) {
    body.deckList = ["oHatchet", "oSpear", "oBow"];
    body.backpack = [...body.deckList];
  }
  room.loot = ["oHoly", "oDagger", "oArcane"];
  main.bidPoints = 20;
  const ledgerBefore = held(room), pointsBefore = main.bidPoints;

  ok(G.assignLoot(room, main, { key: "oHoly", toPlayerId: companion.id, outgoingKey: "oSpear" }),
    "a looted card assigns straight onto a companion — no stash detour");
  eq(companion.deckList.length, 3, "…the companion deck stays EXACTLY three cards");
  eq(companion.deckList.indexOf("oHoly"), 1, "…the incoming card takes that EXACT slot, not the deck's end");
  ok(!companion.deckList.includes("oSpear"), "…the outgoing card leaves the deck");
  ok(companion.backpack.includes("oHoly"), "…ownership follows: the card enters the companion's backpack ledger");
  eq(companion.backpack.filter((k) => k === "oSpear").length, 0,
    "…and the outgoing card leaves that body's ledger");
  ok((room.loot ?? []).includes("oSpear"),
    "…the outgoing card returns to the SHARED loot pool so another body can take it");
  ok(!(room.loot ?? []).includes("oHoly"), "…the assigned card leaves the pool (one instance, scarce)");
  eq(held(room), ledgerBefore, "…no card is duplicated or lost across room.loot + every backpack");
  eq(main.bidPoints, pointsBefore - G.itemTreasure("oHoly"),
    "…the acting SEAT paid the incoming card's value, exactly like a claim");

  // The returned card is genuinely re-routable — the whole point of the ruling.
  ok(G.assignLoot(room, main, { key: "oSpear", toPlayerId: other.id, outgoingKey: "oBow" }),
    "the swapped-out card can then be assigned to a DIFFERENT companion");
  eq(other.deckList.length, 3, "…that companion's deck is also still exactly three cards");
  eq(held(room), ledgerBefore, "…ownership is still conserved after a second assign");

  // MAIN BODY: no ceiling — assigning appends instead of swapping.
  const mainDeckBefore = main.deckList.length;
  ok(G.assignLoot(room, main, { key: "oArcane", toPlayerId: main.id }),
    "assigning to the main body needs no outgoing card");
  eq(main.deckList.length, mainDeckBefore + 1, "…the main deck simply grows by one (no max)");
  eq(main.deckList[main.deckList.length - 1], "oArcane", "…the card is appended to the main deck");
  ok(main.backpack.includes("oArcane"), "…and the main body's backpack ledger records it too");
  eq(held(room), ledgerBefore, "…ownership stays conserved for a main-body append");
  ok(!(room.loot ?? []).includes("oArcane"), "…the appended card left the shared pool");
}

// Refusals — every one is a CLEAN no-op (no partial mutation, no points spent).
{
  const { room, main, members } = makeParty(2, "ASSIGNNO");
  const companion = members[1];
  room.phase = "won";
  main.deckList = Array(10).fill("oSword"); main.backpack = [...main.deckList];
  companion.deckList = ["oHatchet", "oSpear", "oBow"];
  companion.backpack = [...companion.deckList];
  room.loot = ["oLionLance", "oHoly"];
  main.bidPoints = 2;                                   // Lion Lance is ◈4 — deliberately out of reach
  const ledger = held(room), deck = companion.deckList.join(),
    mainDeck = main.deckList.join(), points = main.bidPoints;
  const untouched = (label) => {
    eq(held(room), ledger, `${label} — the ownership ledger is untouched`);
    eq(companion.deckList.join(), deck, `${label} — the companion deck is untouched`);
    eq(main.deckList.join(), mainDeck, `${label} — the main deck is untouched`);
    eq(main.bidPoints, points, `${label} — no bid points were spent`);
  };

  ok(!G.assignLoot(room, main, { key: "oLionLance", toPlayerId: companion.id, outgoingKey: "oSpear" }),
    "a card the seat cannot afford is refused");
  untouched("unaffordable assign");

  ok(!G.assignLoot(room, main, { key: "oHoly", toPlayerId: companion.id }),
    "a companion assign with no outgoing card is refused (the deck has no free slot)");
  untouched("companion assign with no outgoing card");

  ok(!G.assignLoot(room, main, { key: "oHoly", toPlayerId: companion.id, outgoingKey: "oFire" }),
    "a companion assign naming a card that is NOT in that deck is refused");
  untouched("companion assign naming a foreign card");

  ok(!G.assignLoot(room, main, { key: "oHoly", toPlayerId: main.id + "-nobody", outgoingKey: null }),
    "an unknown destination body is refused");
  untouched("unknown destination");

  ok(!G.assignLoot(room, main, { key: "oParsnip", toPlayerId: main.id }),
    "a key that is not in the loot pool is refused");
  untouched("key not in the pool");

  room.phase = "setup";
  ok(!G.assignLoot(room, main, { key: "oHoly", toPlayerId: main.id }),
    "assigning outside the won screen is refused");
  untouched("wrong phase");
  room.phase = "won";

  // A no-op swap (same card in and out) would still charge the seat — refused outright.
  companion.deckList = ["oHoly", "oSpear", "oBow"];
  companion.backpack = [...companion.deckList];
  ok(!G.assignLoot(room, main, { key: "oHoly", toPlayerId: companion.id, outgoingKey: "oHoly" }),
    "swapping a card for itself is refused rather than charged as a no-op");
}

// OWNERSHIP GATE: you can only assign onto bodies YOUR seat owns.
{
  const roomA = G.newRoom("ASSIGNOWN"); roomA.telemOff = true;
  const me = G.addPlayer(roomA, "me", "Me");
  const mine = G.addPlayer(roomA, "me-b1", "Mine", { bot: true, owner: "me", partyRole: "companion" });
  const stranger = G.addPlayer(roomA, "you", "You");
  const strangerBody = G.addPlayer(roomA, "you-b1", "Yours",
    { bot: true, owner: "you", partyRole: "companion" });
  me.partyRole = "main"; stranger.partyRole = "main";
  roomA.phase = "won";
  for (const body of [mine, strangerBody]) {
    body.deckList = ["oHatchet", "oSpear", "oBow"];
    body.backpack = [...body.deckList];
  }
  me.deckList = Array(10).fill("oSword"); me.backpack = [...me.deckList];
  stranger.deckList = Array(10).fill("oSword"); stranger.backpack = [...stranger.deckList];
  roomA.loot = ["oHoly"];
  me.bidPoints = 20; stranger.bidPoints = 20;
  const ledger = held(roomA);

  ok(!G.assignLoot(roomA, me, { key: "oHoly", toPlayerId: strangerBody.id, outgoingKey: "oSpear" }),
    "assigning onto ANOTHER seat's companion is refused");
  ok(!G.assignLoot(roomA, me, { key: "oHoly", toPlayerId: stranger.id }),
    "assigning onto another seat's MAIN body is refused");
  eq(held(roomA), ledger, "…a refused cross-seat assign changes no ownership at all");
  eq(me.bidPoints, 20, "…and costs the acting seat nothing");
  ok(G.assignLoot(roomA, me, { key: "oHoly", toPlayerId: mine.id, outgoingKey: "oSpear" }),
    "the same assign onto YOUR OWN companion succeeds");
  eq(me.bidPoints, 20 - G.itemTreasure("oHoly"), "…and the acting seat pays for it");

  // A companion may act for the seat too — its OWNING seat's wallet pays (seatOf, same as claimLoot).
  roomA.loot.push("oDagger");
  const before = me.bidPoints;
  ok(G.assignLoot(roomA, mine, { key: "oDagger", toPlayerId: me.id }),
    "a companion can drive an assign onto the seat's main body");
  eq(me.bidPoints, before - G.itemTreasure("oDagger"), "…and the OWNING seat's points paid for it");
}

// LEGACY SAVES: a persisted companion deck that is not exactly three must not be corrupted.
{
  const { room, main, members } = makeParty(2, "ASSIGNOLD");
  const companion = members[1];
  room.phase = "won";
  main.deckList = Array(10).fill("oSword"); main.backpack = [...main.deckList];
  companion.deckList = ["oHatchet", "oSpear", "oBow", "oFire"];   // an old 4-card save
  companion.backpack = [...companion.deckList];
  room.loot = ["oHoly"];
  main.bidPoints = 20;
  const ledger = held(room);
  ok(G.assignLoot(room, main, { key: "oHoly", toPlayerId: companion.id, outgoingKey: "oFire" }),
    "a legacy companion deck still accepts a 1-for-1 assign");
  eq(companion.deckList.length, 4, "…and keeps its persisted length instead of being reshaped to 3");
  eq(companion.deckList.indexOf("oHoly"), 3, "…the incoming card takes the exact named slot");
  eq(held(room), ledger, "…ownership is conserved on a legacy deck too");
}

// The ordinary claimLoot route is untouched by the new one — solo auto-collect and the co-op
// stash claim must both behave exactly as before.
{
  const solo = G.newRoom("ASSIGNSOLO"); solo.telemOff = true;
  const p = G.addPlayer(solo, "s", "S");
  solo.phase = "won"; solo.loot = ["oHoly"]; p.backpack = []; p.deckList = []; p.bidPoints = 0;
  G.claimLoot(solo, p, "oHoly");
  ok(p.backpack.includes("oHoly") && !p.deckList.includes("oHoly"),
    "claimLoot still lands a solo claim in the BACKPACK only, never the deck");
  eq(solo.loot.length, 0, "…and still removes it from the pool");

  const coop = G.newRoom("ASSIGNCOOP"); coop.telemOff = true;
  const a = G.addPlayer(coop, "a", "A"); G.addPlayer(coop, "b", "B");
  coop.phase = "won"; coop.loot = ["oHoly"];
  a.backpack = []; a.deckList = []; a.bidPoints = 9;
  G.claimLoot(coop, a, "oHoly");
  ok(a.backpack.includes("oHoly") && !a.deckList.includes("oHoly"),
    "a co-op claimLoot still adds to the backpack without touching the deck");
  eq(a.bidPoints, 9 - G.itemTreasure("oHoly"), "…and still spends the seat's bid points");
}

// SNAPSHOT CONTRACT: the assign screen is built from the EXISTING per-body projection — this locks
// the fields the client needs so a later projection edit cannot silently break the screen.
{
  const { room, main, members } = makeParty(3, "ASSIGNSNAP");
  const companion = members[1];
  room.phase = "won";
  main.deckList = Array(10).fill("oSword"); main.backpack = [...main.deckList];
  for (const body of members.slice(1)) {
    body.deckList = ["oHatchet", "oSpear", "oBow"];
    body.backpack = [...body.deckList];
  }
  room.loot = ["oHoly"];
  const snap = G.snapshot(room);
  eq((snap.loot?.cards ?? []).length, 1, "the won snapshot still exposes the shared loot pool");
  eq(snap.loot.cards[0].value, G.itemTreasure("oHoly"), "…with each card's ◈ price for the claim budget");
  const mine = (snap.players ?? []).filter((row) => row.owner === main.id);
  eq(mine.length, 3, "the acting seat's owned bodies are all projected with an `owner` seat id");
  const companionRow = mine.find((row) => row.id === companion.id);
  eq(companionRow.partyRole, "companion", "…each body says whether it is a companion or the main");
  eq(companionRow.maxDeck, 3, "…a companion projects its exact three-card ceiling");
  eq(companionRow.deckList.length, 3, "…and its current deck slots, so a swap can name one");
  eq(companionRow.deckList[0].key, "oHatchet", "…as full card descriptors keyed by card");
  const mainRow = mine.find((row) => row.id === main.id);
  eq(mainRow.partyRole, "main", "…the main body is identified as the main");
  eq(mainRow.maxDeck, null, "…and projects no deck ceiling (assigning to it appends)");
  ok(Array.isArray(mainRow.backpack), "…the ownership ledger is projected per body");
  eq(typeof mainRow.bidPoints, "number", "…and the seat's claim budget is projected");
}

console.log(`\nPARTY MODE: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
