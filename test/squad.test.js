// PARTY MODE - one human seat owns one full-deck main body plus 1-3 fixed-size
// (PARTY_KIT_CARDS) companions. Every body remains a real combat entity so
// ordinary lanes, encounters, bosses, rewards, and progression can match an
// equally sized human party.
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
// a foe-style ten-card loadout (PARTY_KIT_CARDS, owner ruling 2026-07-29; was 5,
// was 3). Every body still chooses its own chassis.
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
    ok(offers.every((bundle) => bundle.items.length === (player === main ? 10 : G.PARTY_KIT_CARDS)),
      `${player.name} offers use the correct starter-deck size`);
    G.draftPick(room, player, offers[0].id);
  }
  eq(main.deckList.length, 10, "main body locks a full ten-card deck");
  ok(members.slice(1).every((player) => player.deckList.length === 10),
    "every companion locks an exact ten-card deck");
  ok(members.slice(1).every((player) => G.deckMinFor(player) === 10 && G.deckMaxFor(player) === 10),
    "companion deck editing is fixed at exactly ten cards");
  eq(G.deckMinFor(main), 10, "the main body retains the ordinary ten-card floor");
  ok(G.draftComplete(room), "the run begins only after all four bodies are chosen");

  const snap = G.snapshot(room);
  const mainSnap = snap.players.find((player) => player.id === main.id);
  const companionSnap = snap.players.find((player) => player.id === members[1].id);
  eq(mainSnap.partySize, 4, "snapshots expose the owned party size");
  eq(companionSnap.maxDeck, 10, "snapshots expose the companion's exact deck cap");
  eq(mainSnap.maxDeck, null, "snapshots leave the main deck uncapped");
  eq(mainSnap.nextLevelCost, 20, "the displayed Party 4 level cost equals four ordinary L2 costs");
}

// PARTY OVERHAUL (owner 2026-07-28): a companion is a REAL player body now — it draws a full
// HAND_SIZE hand the human plays by hand, not a single foe-style card on a fixed cycle. The rest of
// its collection forms the draw pile and refills the hand exactly like the main body's.
{
  const companion = {
    partyRole: "companion",
    cards: G.mintCards(["oSword", "oFire", "oHoly", "oSpear", "oDagger",
      "oHatchet", "oBow", "oArcane", "oMeteors", "oLionLance"]),   // a real 10-card companion deck
  };
  G.dealHand(companion);
  eq(companion.hand.length, 3, "a companion draws a full player hand (HAND_SIZE), not one foe-style card");
  eq(companion.deck.length, 7, "the rest of its 10-card collection forms the draw pile");
  companion.disc = [companion.hand.shift()];   // play a card…
  G.drawUp(companion);
  eq(companion.hand.length, 3, "…and it refills to a full hand from the draw pile like any player");
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
  // ECONOMY (owner ruling 2026-07-26): a ONE-SEAT party is not a bidding table. Bid points arbitrate
  // between HUMAN SEATS, and there is exactly one here — one wallet, no equity to bend — so the
  // assign is FREE, exactly as solo's auto-collect always was. 2+ human seats still pay (below).
  eq(main.bidPoints, pointsBefore,
    "…and a ONE-SEAT party pays NOTHING for it — party mode prices like solo, not like co-op");

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

// MAIN-BODY SLOT SWAP (owner ruling 2026-07-29: the one-seat loot popup shows EVERY deck including
// the main body's, with easy swaps of stash cards in and out of the decks). Naming `outgoingKey` on
// a MAIN target now replaces that exact deck slot instead of appending. The displaced card STAYS in
// the main backpack as a spare — main ownership never shrinks — so nothing returns to the pool and
// no paid-ownership credit is minted. Absent/invalid `outgoingKey` keeps the old append path
// byte-compatible for old clients.
{
  const { room, main, members } = makeParty(2, "MAINSWAP");
  const companion = members[1];
  room.phase = "won";
  main.deckList = ["oSword", "oSword", "oSword", "oHatchet", "oSword",
    "oSword", "oSword", "oSword", "oSword", "oSword"];
  main.backpack = [...main.deckList];
  companion.deckList = ["oHatchet", "oSpear", "oBow"];
  companion.backpack = [...companion.deckList];
  room.loot = ["oHoly", "oDagger"];
  const ledger = held(room);

  ok(G.assignLoot(room, main, { key: "oHoly", toPlayerId: main.id, outgoingKey: "oHatchet" }),
    "a looted card swaps into a NAMED main-deck slot (owner 2026-07-29)");
  eq(main.deckList.length, 10, "…the main deck LENGTH is unchanged — a swap, not an append");
  eq(main.deckList.indexOf("oHoly"), 3, "…the incoming card takes that EXACT slot");
  ok(!main.deckList.includes("oHatchet"), "…the outgoing card leaves the deck");
  ok(main.backpack.includes("oHatchet"),
    "…but STAYS in the main backpack as a spare — main ownership never shrinks");
  ok(main.backpack.includes("oHoly"), "…while the incoming card enters the ownership ledger");
  ok(!(room.loot ?? []).includes("oHatchet"), "…nothing returns to the shared pool on a main swap");
  eq(held(room), ledger, "…and the whole-run card ledger is conserved");
  eq(G.lootCreditOf(room, main.id, "oHatchet"), 0,
    "…no paid-ownership credit is minted — the card never left the seat");

  // `outgoingKey: null` keeps the append path bit-identical to the pre-ruling behavior.
  const deckBefore = main.deckList.length;
  ok(G.assignLoot(room, main, { key: "oDagger", toPlayerId: main.id, outgoingKey: null }),
    "a main assign with no outgoing card still APPENDS exactly as before");
  eq(main.deckList.length, deckBefore + 1, "…the deck grows by one");
  eq(main.deckList[main.deckList.length - 1], "oDagger", "…at the end of the deck");
  eq(held(room), ledger, "…ledger still conserved on the append path");

  // An `outgoingKey` the main deck does NOT hold is IGNORED (append), never refused — an old
  // client that always sends the field, or a stale slot pick, keeps working.
  room.loot.push("oArcane");
  const ledger2 = held(room), deckBefore2 = main.deckList.length;
  ok(G.assignLoot(room, main, { key: "oArcane", toPlayerId: main.id, outgoingKey: "oFire" }),
    "an outgoingKey the main deck does not hold falls back to a plain append");
  eq(main.deckList.length, deckBefore2 + 1, "…growing the deck by one");
  eq(held(room), ledger2, "…still conserved");

  // Swapping a main card for itself falls back to append too (`key === outgoingKey` is only a
  // refusal on the fixed-size companion path, where it would charge for a total no-op).
  room.loot.push("oSword");
  const ledger3 = held(room), deckBefore3 = main.deckList.length;
  ok(G.assignLoot(room, main, { key: "oSword", toPlayerId: main.id, outgoingKey: "oSword" }),
    "outgoingKey equal to the incoming key appends on a main target");
  eq(main.deckList.length, deckBefore3 + 1, "…as a plain append");
  eq(held(room), ledger3, "…conserved");

  // SAME BODY: a spare the main body ALREADY holds commits into a NAMED slot — deck length
  // unchanged, ownership untouched (the appendless twin of the 2-tap same-body append above).
  main.backpack.push("oMeteors");                          // a spare on the main body itself
  const ledger4 = held(room), deckLen = main.deckList.length;
  const slot = main.deckList.indexOf("oSword");
  ok(G.assignLoot(room, main, { key: "oMeteors", toPlayerId: main.id, fromPlayerId: main.id,
    outgoingKey: "oSword" }),
    "a main body's own spare commits into a NAMED deck slot");
  eq(main.deckList.length, deckLen, "…deck length unchanged — a slot swap, not an append");
  eq(main.deckList[slot], "oMeteors", "…in that exact slot");
  ok(main.backpack.includes("oSword"), "…the displaced deck copy stays owned (now a spare)");
  eq(held(room), ledger4, "…ownership untouched — only the deck changed");
}

// COMPANION AT TEN: the strict 1-for-1 swap holds unchanged over the new ten-slot deck
// (PARTY_KIT_CARDS = 10, owner ruling 2026-07-29).
{
  const { room, main, members } = makeParty(2, "ASSIGN10");
  const companion = members[1];
  room.phase = "won";
  main.deckList = Array(10).fill("oSword"); main.backpack = [...main.deckList];
  companion.deckList = ["oHatchet", "oSpear", "oBow", "oFire", "oHoly",
    "oDagger", "oArcane", "oMeteors", "oLionLance", "oHatchet"];   // full 10, dup allowed (dry-pool pad)
  companion.backpack = [...companion.deckList];
  room.loot = ["oSword"];
  const ledger = held(room);
  ok(G.assignLoot(room, main, { key: "oSword", toPlayerId: companion.id, outgoingKey: "oDagger" }),
    "a full ten-card companion deck still swaps strictly 1-for-1");
  eq(companion.deckList.length, 10, "…the companion deck stays EXACTLY ten cards");
  eq(companion.deckList.indexOf("oSword"), 5, "…the incoming card takes the exact named slot");
  ok((room.loot ?? []).includes("oDagger"),
    "…and the displaced card returns to the shared pool (the companion rule is unchanged)");
  eq(held(room), ledger, "…with the ledger conserved");
  ok(!G.assignLoot(room, main, { key: "oDagger", toPlayerId: companion.id }),
    "…and a ten-card companion still refuses an assign with no outgoing card");
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
  main.bidPoints = 2;
  const ledger = held(room), deck = companion.deckList.join(),
    mainDeck = main.deckList.join(), points = main.bidPoints;
  const untouched = (label) => {
    eq(held(room), ledger, `${label} — the ownership ledger is untouched`);
    eq(companion.deckList.join(), deck, `${label} — the companion deck is untouched`);
    eq(main.deckList.join(), mainDeck, `${label} — the main deck is untouched`);
    eq(main.bidPoints, points, `${label} — no bid points were spent`);
  };
  // (The "cannot afford it" refusal now lives in the CO-OP block below — a one-seat party has no
  //  price to be short of. Everything here is a STRUCTURAL refusal and holds in every mode.)

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

// PAID OWNERSHIP (owner ruling 2026-07-24, "please fix"): a seat pays for a card ONCE, when it
// first enters that seat's ownership. The swap-out that returns a card to the shared pool mints a
// paid-ownership credit, so shuffling your own holdings among your own bodies is free — the leak
// where three swaps of the same card cost three times its value is closed.
{
  const { room, main, members } = makeParty(3, "PAIDONCE");
  const companion = members[1], other = members[2];
  const guest = G.addPlayer(room, "guest", "Guest");     // a second SEAT — co-op pricing is live
  room.phase = "won";
  main.deckList = Array(10).fill("oSword"); main.backpack = [...main.deckList];
  for (const body of [companion, other]) {
    body.deckList = ["oHatchet", "oSpear", "oBow"];
    body.backpack = [...body.deckList];
  }
  guest.deckList = Array(10).fill("oSword"); guest.backpack = [...guest.deckList];
  room.loot = ["oHoly"];
  main.bidPoints = 20; guest.bidPoints = 20;
  const price = G.itemTreasure("oHoly"), ledger = held(room);

  ok(G.assignLoot(room, main, { key: "oHoly", toPlayerId: companion.id, outgoingKey: "oSpear" }),
    "the FIRST acquisition of a card lands on a companion");
  eq(main.bidPoints, 20 - price, "…and charges the seat the card's full ◈ value");
  const afterFirst = main.bidPoints;

  // Move oHoly off that companion: a pool card comes IN, oHoly goes back OUT to the pool. Both
  // cards are already this seat's — neither leg may be charged again.
  ok(G.assignLoot(room, main, { key: "oSpear", toPlayerId: companion.id, outgoingKey: "oHoly" }),
    "taking back the card the seat just swapped OUT is allowed");
  eq(main.bidPoints, afterFirst, "…and costs ZERO — the seat already paid for it once");
  ok(G.assignLoot(room, main, { key: "oHoly", toPlayerId: other.id, outgoingKey: "oBow" }),
    "…and re-seating that card on ANOTHER of the seat's own bodies is allowed too");
  eq(main.bidPoints, afterFirst, "…also free: three moves of one card cost its value exactly once");
  eq(held(room), ledger, "…with the whole run's card ledger still conserved");

  // The same card taken back through the ORDINARY claim button is free too — the fix cannot be
  // dodged by pressing the other button.
  ok(G.assignLoot(room, main, { key: "oBow", toPlayerId: other.id, outgoingKey: "oHoly" }),
    "the seat swaps its card out one more time");
  G.claimLoot(room, main, "oHoly");
  ok(main.backpack.includes("oHoly"), "claimLoot also takes the seat's own returned card back");
  eq(main.bidPoints, afterFirst, "…free by the same paid-ownership credit, not a second charge");

  // CO-OP EQUITY: a card moving between DIFFERENT seats still pays full price.
  room.loot.push("oArcane");
  ok(G.assignLoot(room, main, { key: "oArcane", toPlayerId: companion.id, outgoingKey: "oSpear" }),
    "a fresh drop swaps in, returning one of the seat's own cards to the shared pool");
  const guestBefore = guest.bidPoints;
  G.claimLoot(room, guest, "oSpear");
  ok(guest.backpack.includes("oSpear"), "another seat can still claim that returned card");
  eq(guest.bidPoints, guestBefore - G.itemTreasure("oSpear"),
    "…and pays its FULL value — one seat's credit is never another seat's discount");

  // A card this seat never owned is charged normally.
  room.loot.push("oLionLance");
  const beforeNew = main.bidPoints;
  ok(G.assignLoot(room, main, { key: "oLionLance", toPlayerId: main.id }),
    "a brand-new drop still assigns");
  eq(main.bidPoints, beforeNew - G.itemTreasure("oLionLance"),
    "…and is charged in full — a credit only ever buys back the SAME card key it was minted from");

  // A new RUN wipes the pool, so no credit may survive into it.
  eq(G.lootCreditOf(room, main.id, "oSpear"), 1,
    "the seat still holds its credit for the card it gave back (another seat claiming it changes nothing)");
  eq(G.lootCreditOf(room, guest.id, "oSpear"), 0, "…and the claiming seat earns no credit by buying it");
  G.startDraft(room);
  eq(G.lootCreditOf(room, main.id, "oSpear"), 0, "startDraft (new run) clears every paid-ownership credit");
}

// LEGACY SAVES: a persisted companion deck that is not the default size must not be corrupted.
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
  eq(companion.deckList.length, 4, "…and keeps its persisted length instead of being reshaped to the default");
  eq(companion.deckList.indexOf("oHoly"), 3, "…the incoming card takes the exact named slot");
  eq(held(room), ledger, "…ownership is conserved on a legacy deck too");
}

// ---------------------------------------------------------------------------
// PARTY AUTO-ACQUIRE (owner 2026-07-26: "It should be in party mode like solo except I have the
// option to easily put each item to a party member instead of myself. I had to click through the
// items way too much."). Clearing a room with ONE human seat drops the spoils straight into that
// seat's backpack — zero taps — and the assign board then DISTRIBUTES what the seat already owns.
// Measured motivation: a real party-4 room cost 46 taps to acquire its 23 cards before this.
function clearedPartyRoom(size, code, gear) {
  const { room, main, members } = makeParty(size, code);
  main.deckList = Array(10).fill("oSword"); main.backpack = [...main.deckList];
  for (const body of members.slice(1)) {
    body.deckList = ["oHatchet", "oSpear", "oBow"];
    body.backpack = [...body.deckList];
  }
  room.phase = "playing"; room.laneCount = size;
  room.lanes = Array.from({ length: size }, () => []);
  room.allies = Array.from({ length: size }, () => []);
  room.draftedFoes = [{ bodyKey: "rookie", gear, greedy: true, owner: main.id }];
  G.simulateTick(room);                                   // empty board → the room is won
  return { room, main, members };
}
{
  const gear = ["oDagger", "oFire"];
  const { room, main, members } = clearedPartyRoom(3, "PARTYAUTO", gear);
  const companion = members[1], other = members[2];
  eq(room.phase, "won", "an empty board resolves a party room to a win");
  eq((room.loot ?? []).length, 0,
    "AUTO-ACQUIRE: a one-seat party leaves NOTHING unclaimed — zero taps to acquire the room's spoils");
  ok((room.lootTaken ?? []).length >= gear.length,
    "…every dropped card is recorded as taken (carried gear plus the exact-value comp)");
  eq(main.backpack.length, 10 + room.lootTaken.length,
    "…and they all landed in the SEAT's own backpack, one for one");
  ok(gear.every((k) => main.backpack.includes(k)), "…including the foes' carried cards");
  eq(main.deckList.join(), Array(10).fill("oSword").join(),
    "…the combat DECK is untouched — loot arrives owned, not equipped (same rule as solo)");
  eq(companion.backpack.join(), "oHatchet,oSpear,oBow",
    "…companions are not force-fed: nothing lands on them without the player routing it");
  eq(main.bidPoints ?? 0, 0,
    "…and NO bid points are granted — one seat has nobody to bid against (owner ruling 2026-07-26)");
  eq(Object.keys(room.lootCredit ?? {}).length, 0, "…no paid-ownership credit outlives the emptied pool");

  // TELEMETRY LABEL: an auto-acquired card was ALREADY logged as a pick on clear
  // (loot_claim {auto:true}), so routing it later must NOT read as a second acquisition — server.js
  // labels off this predicate, and a "pool" answer here would double-count every card against one
  // loot_offer and push the report's pick-rate over 100%.
  eq(G.assignLootSource(room, main, room.lootTaken[0], main.id), main,
    "routing an auto-acquired card reports an OWNED source, never a pool PICK");

  // ── DISTRIBUTION: route an owned spare onto a companion. TWO taps in the UI = ONE message.
  const spare = room.lootTaken[0];
  const ledger = held(room), pts = main.bidPoints ?? 0;
  const outKey = companion.deckList[1];
  ok(G.assignLoot(room, main, { key: spare, toPlayerId: companion.id, outgoingKey: outKey,
    fromPlayerId: main.id }),
    "a card the seat ALREADY OWNS can be routed onto a companion (the acquisition step is gone)");
  eq(companion.deckList.length, 3, "…the companion deck is STILL exactly three cards");
  eq(companion.deckList[1], spare, "…the incoming card takes the EXACT slot named");
  ok(companion.backpack.includes(spare), "…the companion's ledger records the incoming card");
  ok(!companion.backpack.includes(outKey), "…and releases the outgoing one");
  ok(main.backpack.includes(outKey),
    "…the displaced card goes back to the body that gave the spare up, NOT into a shared pool");
  eq((room.loot ?? []).length, 0, "…so a one-seat party never re-grows a pool to click through");
  eq(held(room), ledger, "…no card is duplicated or lost by the route");
  eq(main.bidPoints ?? 0, pts, "…and routing your own card costs nothing");
  eq(Object.keys(room.lootCredit ?? {}).length, 0, "…no credit is minted where no pool was involved");

  // ── SAME BODY: the 2-tap "put the card I just picked up into my own deck".
  const spare2 = room.lootTaken.find((k) => k !== spare && main.backpack.includes(k));
  if (spare2) {
    const deckBefore = main.deckList.length, bagBefore = main.backpack.length;
    ok(G.assignLoot(room, main, { key: spare2, toPlayerId: main.id, fromPlayerId: main.id }),
      "assigning an owned spare to the body that already holds it commits it to that body's deck");
    eq(main.deckList.length, deckBefore + 1, "…the deck grows by one");
    eq(main.backpack.length, bagBefore, "…ownership does not move — only the deck changed");
    eq(held(room), ledger, "…and the ledger is still conserved");
  }

  // A DECK copy is committed and must stay put: only SPARES are distributable.
  const committed = other.deckList[0];
  const copies = (list) => (list ?? []).filter((k) => k === committed).length;
  eq(copies(other.backpack), copies(other.deckList), "(fixture check) that card has no spare copy anywhere");
  ok(!G.assignLoot(room, main, { key: committed, toPlayerId: companion.id, outgoingKey: companion.deckList[0] }),
    "a card held ONLY as a deck copy is not distributable — the engine refuses to strip a live deck");
  eq(held(room), ledger, "…and that refusal moves nothing");
}

// SOURCE PRECEDENCE (review find, 2026-07-26): the ONE room shape where both sources hold the same
// key at once — 2 human seats (so the pool is live and PRICED) and one of them also driving
// companions. The board renders the seat's OWNED spare as a free move; a pool-first read would
// silently spend bid points and eat the SHARED copy the other seat was saving. An explicit
// `fromPlayerId` that really holds the key as a spare must therefore win over the pool.
{
  const roomS = G.newRoom("ASSIGNSRC"); roomS.telemOff = true;
  const a = G.addPlayer(roomS, "a", "A"), b = G.addPlayer(roomS, "b", "B");
  const aComp = G.addPlayer(roomS, "a-b1", "A-comp", { bot: true, owner: "a", partyRole: "companion" });
  a.partyRole = "main";
  a.deckList = Array(10).fill("oSword"); a.backpack = [...a.deckList, "oHoly"];   // oHoly = a SPARE on A
  b.deckList = Array(10).fill("oSword"); b.backpack = [...b.deckList];
  aComp.deckList = ["oHatchet", "oSpear", "oBow"]; aComp.backpack = [...aComp.deckList];
  roomS.phase = "won"; roomS.loot = ["oHoly"];                                    // …and ALSO in the pool
  a.bidPoints = 10; b.bidPoints = 10;
  eq(G.assignLootSource(roomS, a, "oHoly", a.id), a, "an explicit owned source wins over the pool");
  eq(G.assignLootSource(roomS, a, "oHoly", null), "pool", "…without one, the pool still wins (co-op's route)");
  ok(G.assignLoot(roomS, a, { key: "oHoly", toPlayerId: aComp.id, outgoingKey: "oSpear",
    fromPlayerId: a.id }), "routing the seat's OWN spare onto its companion succeeds");
  eq(a.bidPoints, 10, "…and costs NOTHING — the seat already owns that card");
  eq(roomS.loot.join(), "oHoly",
    "…the SHARED pool copy is untouched — the other seat's chance at it is not silently eaten");
  ok(!a.backpack.includes("oHoly"), "…the spare that moved is the one the seat actually gave up");
  ok(!roomS.loot.includes("oSpear"),
    "…and the displaced card goes back to the source body, not into the shared pool");
  eq(G.lootCreditOf(roomS, a.id, "oSpear"), 0, "…so no paid-ownership credit is minted either");
  // A stale/bogus `from` falls through to the pool rather than refusing outright.
  a.bidPoints = 10;
  ok(G.assignLoot(roomS, a, { key: "oHoly", toPlayerId: a.id, fromPlayerId: "no-such-body" }),
    "a `from` that names nothing falls through to the pool instead of refusing");
  eq(a.bidPoints, 10 - G.itemTreasure("oHoly"), "…and that pool pull is charged normally");
  eq(roomS.loot.length, 0, "…having taken the pool's copy");
}

// TRAILHEAD (review find, 2026-07-26): `room.lootTaken` is only cleared by the next combat win or a
// new run, so after a DESCEND the next floor's room chooser still carried the boss room's haul —
// which badged already-distributed cards "NEW" and hijacked the tab. A start node has no spoils.
{
  const { room, main } = clearedPartyRoom(2, "TRAILHEAD", ["oDagger", "oFire"]);
  ok((room.lootTaken ?? []).length > 0, "the cleared room reports its haul");
  ok((G.snapshot(room).lootTaken ?? []).length > 0, "…and the snapshot projects it on that won screen");
  room.level = G.buildLevel(1);                       // a fresh floor: current node is its "start"
  room.phase = "won";
  eq(G.currentNode(room)?.type, "start", "(fixture check) the trailhead node is a start node");
  eq(G.snapshot(room).lootTaken, null,
    "a run/floor TRAILHEAD reports NO spoils even while room.lootTaken still holds the last haul");
  ok(main.backpack.length > 10, "…and the cards themselves are still owned — only the badge is gone");
}

// ORDINARY CO-OP IS UNCHANGED: 2+ human seats keep the shared pool, the grant, and the charge —
// bid points still arbitrate between the seats, which is the only thing they ever did.
{
  const roomC = G.newRoom("COOPKEEP"); roomC.telemOff = true;
  const a = G.addPlayer(roomC, "a", "A"), b = G.addPlayer(roomC, "b", "B");
  const aBot = G.addPlayer(roomC, "a-b1", "A-comp", { bot: true, owner: "a", partyRole: "companion" });
  a.partyRole = "main";
  for (const p of [a, b]) { p.deckList = Array(10).fill("oSword"); p.backpack = [...p.deckList]; }
  aBot.deckList = ["oHatchet", "oSpear", "oBow"]; aBot.backpack = [...aBot.deckList];
  roomC.phase = "playing"; roomC.laneCount = 3;
  roomC.lanes = [[], [], []]; roomC.allies = [[], [], []];
  roomC.draftedFoes = [{ bodyKey: "rookie", gear: ["oDagger", "oFire"], greedy: true, owner: "a" }];
  G.simulateTick(roomC);
  eq(roomC.phase, "won", "the co-op room is won");
  ok((roomC.loot ?? []).length > 0,
    "CO-OP: 2+ human seats keep the SHARED pool — nothing is auto-acquired for either of them");
  eq(roomC.lootTaken, null, "…and nothing is recorded as auto-taken");
  const granted = (a.bidPoints ?? 0) + (b.bidPoints ?? 0);
  eq(granted, roomC.loot.reduce((s, k) => s + G.itemTreasure(k), 0),
    "…the pool's exact value is still granted as bid points, split across the two seats");
  ok((a.bidPoints ?? 0) > 0 && (b.bidPoints ?? 0) > 0, "…both seats are funded");

  // The seat still PAYS, and being short still REFUSES.
  const dear = roomC.loot.slice().sort((x, y) => G.itemTreasure(y) - G.itemTreasure(x))[0];
  const spend = a.bidPoints;
  ok(G.assignLoot(roomC, a, { key: dear, toPlayerId: aBot.id, outgoingKey: "oSpear" }),
    "a funded co-op seat can still assign a pool card onto its own companion");
  eq(a.bidPoints, spend - G.itemTreasure(dear), "…and is charged the card's full ◈ value");
  a.bidPoints = 0;
  const poolNow = (roomC.loot ?? []).join(), deckNow = aBot.deckList.join();
  const broke = roomC.loot.find((k) => G.itemTreasure(k) > 0);
  ok(!G.assignLoot(roomC, a, { key: broke, toPlayerId: aBot.id, outgoingKey: aBot.deckList[0] }),
    "a card the seat cannot afford is STILL refused in ordinary co-op");
  eq((roomC.loot ?? []).join(), poolNow, "…the shared pool is untouched by the refusal");
  eq(aBot.deckList.join(), deckNow, "…and so is the companion deck");
  eq(a.bidPoints, 0, "…and no points were spent");
  // …and the OTHER seat can take that same card, which is the whole point of the ledger.
  const bPts = b.bidPoints;
  G.claimLoot(roomC, b, broke);
  ok(b.backpack.includes(broke), "the second seat CAN take the card the first could not afford");
  eq(b.bidPoints, bPts - G.itemTreasure(broke), "…paying its full value — seats still arbitrate");
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
    body.deckList = ["oHatchet", "oSpear", "oBow", "oSword", "oFire",
      "oHoly", "oDagger", "oArcane", "oMeteors", "oLionLance"];
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
  eq(companionRow.maxDeck, 10, "…a companion projects its exact ten-card ceiling");
  eq(companionRow.deckList.length, 10, "…and its current deck slots, so a swap can name one");
  eq(companionRow.deckList[0].key, "oHatchet", "…as full card descriptors keyed by card");
  const mainRow = mine.find((row) => row.id === main.id);
  eq(mainRow.partyRole, "main", "…the main body is identified as the main");
  eq(mainRow.maxDeck, null, "…and projects no deck ceiling (assigning to it appends)");
  ok(Array.isArray(mainRow.backpack), "…the ownership ledger is projected per body");
  eq(typeof mainRow.bidPoints, "number", "…and the seat's claim budget is projected");
}

// ---------------------------------------------------------------------------
// PARTY MELT (owner 2026-07-24: "a way to easily melt all the cards without having to click each one
// individually in party mode"). ONE action melts the spares of EVERY body the seat owns. It must
// bank exactly what melting each body one at a time banks, leave every deck intact, and stay a
// prep action (refused mid-combat).
{
  const meltRig = (code) => {
    const { room, main, members } = makeParty(4, code);
    room.phase = "won";
    main.deckList = Array(10).fill("oSword");
    main.backpack = [...main.deckList, "oMeteors", "oFire"];              // 2 main spares
    members[1].deckList = ["oHatchet", "oSpear", "oBow"];
    members[1].backpack = [...members[1].deckList, "oHoly"];              // 1 companion spare
    members[2].deckList = ["oHatchet", "oSpear", "oBow"];
    members[2].backpack = [...members[2].deckList, "oArcane", "oDagger"]; // 2 companion spares
    members[3].deckList = ["oHatchet", "oSpear", "oBow"];
    members[3].backpack = [...members[3].deckList];                       // no spares at all
    return { room, main, members };
  };
  const one = meltRig("MELTONE"), all = meltRig("MELTALL");
  const decksBefore = all.members.map((body) => body.deckList.join());

  const oneByOne = one.members.reduce((sum, body) => sum + G.convertBackpack(one.room, body), 0);
  const total = G.convertPartyBags(all.room, all.members[2]);   // driven from a COMPANION, like the real UI
  eq(total, oneByOne, "one party melt banks exactly what melting every body individually banks");
  eq(all.main.treasure, one.main.treasure, "…into the same single seat wallet");
  eq(all.main.treasure, total, "…which holds the full total");
  ok(all.members.slice(1).every((body) => body.treasure === 0),
    "…and companions never fork a second wallet");
  ok(all.members.every((body, i) => body.deckList.join() === decksBefore[i]),
    "…every body's combat deck is left exactly intact");
  ok(all.members.every((body) => body.backpack.length === body.deckList.length),
    "…and every backpack keeps precisely its deck copies (spares gone, MIN_DECK safe by construction)");
  eq(G.convertPartyBags(all.room, all.main), 0, "a second party melt finds nothing to melt");

  all.room.phase = "playing";
  all.members[1].backpack.push("oHoly");
  eq(G.convertPartyBags(all.room, all.members[1]), 0, "the party melt is REFUSED mid-combat");
  eq(all.main.treasure, total, "…the wallet is unchanged by the refusal");
  ok(all.members[1].backpack.includes("oHoly"), "…and no body's spare was melted on the way to the refusal");

  // The single-body path is untouched for solo and ordinary co-op.
  const soloRoom = G.newRoom("MELTSOLO"); soloRoom.telemOff = true; soloRoom.phase = "won";
  const soloPlayer = G.addPlayer(soloRoom, "s", "S");
  soloPlayer.deckList = Array(10).fill("oSword");
  soloPlayer.backpack = [...soloPlayer.deckList, "oMeteors"];
  eq(G.convertPartyBags(soloRoom, soloPlayer), G.itemTreasure("oMeteors"),
    "a one-body seat melts the same total through either route");
  eq(soloPlayer.treasure, G.itemTreasure("oMeteors"), "…banked in that seat's own wallet");
}

// SNAPSHOT CONTRACT for the party-melt button — the client must be able to render an HONEST button
// (count, ◈ value, worn-passive warning) BEFORE the tap. Wire: {type:"convertPartyBags"}.
{
  const { room, main, members } = makeParty(3, "MELTSNAP");
  room.phase = "won";
  main.deckList = Array(10).fill("oSword"); main.backpack = [...main.deckList, "oMeteors"];
  members[1].deckList = ["oHatchet", "oSpear", "oBow"];
  members[1].backpack = [...members[1].deckList, "oHoly"];
  members[2].deckList = ["oHatchet", "oSpear", "oBow"];
  members[2].backpack = [...members[2].deckList];
  const want = G.itemTreasure("oMeteors") + G.itemTreasure("oHoly");
  const row = (snap, id) => snap.players.find((entry) => entry.id === id);
  const snap = G.snapshot(room);
  eq(row(snap, main.id).partyBag.count, 2, "the melt button reads the seat's TOTAL spare count before the tap");
  eq(row(snap, main.id).partyBag.value, want, "…and the total ◈ those spares would bank");
  eq(row(snap, main.id).partyBag.bodies, 2, "…counting only the owned bodies that actually hold a spare");
  eq(typeof row(snap, main.id).partyBag.hasPassive, "boolean",
    "…and a worn-passive warning flag, so the party confirm can warn like the single-body one");
  // The flag must agree with the per-card rule the single-body confirm uses (no KIT entry is a worn
  // passive right now, so this is false today — the contract is what is locked here).
  eq(row(snap, main.id).partyBag.hasPassive,
    members.some((body) => G.backpackSpares(body).melt.some((k) => G.isPassiveItem(k))),
    "…matching the exact per-card worn-passive rule");
  eq(row(snap, members[1].id).partyBag.value, want,
    "every owned body projects the same seat-wide totals (like `treasure`), so any row can draw the button");
  eq(row(snap, members[2].id).partyBag.count, 2, "…including a body that holds no spare itself");

  // Honesty: the melt banks exactly what the button advertised.
  const advertised = row(snap, main.id).partyBag.value;
  eq(G.convertPartyBags(room, main), advertised, "the party melt banks exactly the advertised ◈");
  const after = G.snapshot(room);
  eq(row(after, main.id).partyBag.count, 0, "…and the button reads empty afterwards");
  eq(row(after, main.id).partyBag.value, 0, "…with nothing left to promise");

  // A separate SEAT's spares are never counted into this seat's button.
  const guest = G.addPlayer(room, "guest", "Guest");
  guest.deckList = Array(10).fill("oSword"); guest.backpack = [...guest.deckList, "oLionLance"];
  const mixed = G.snapshot(room);
  eq(row(mixed, main.id).partyBag.count, 0, "another seat's spares never enter this seat's melt total");
  eq(row(mixed, guest.id).partyBag.count, 1, "…and that seat sees only its own");
}

console.log(`\nPARTY MODE: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
