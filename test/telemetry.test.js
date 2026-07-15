// Server-side telemetry tests (owner 2026-07-09): prove the two provenance fixes so future
// analysis is clean —
//   1. every telemetry line is stamped harness / bots, so a HARNESS-flagged run records harness:true
//      and an analyst can isolate genuine human solo play (harness===false && bots===0).
//   2. a loot choice emits a discrete `loot_offer` carrying the FULL offered set — even in solo,
//      where the engine auto-collects loot and wipes room.loot (previously invisible to telemetry).
// server.js is import-safe (binds the port only under import.meta.main), so we capture emitted lines
// via the test sink hook instead of touching disk or a socket. Run: bun run test/telemetry.test.js
import * as G from "../game.js";
import { telem, telemDraftOffersAdded, onPhaseChange, serverTick, startTrackedDraft, _setTelemWrite } from "../server.js";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("❌ " + label); } };
const eq = (a, b, label) => ok(a === b, `${label} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

// Tracked real-client drivers must identify themselves before creating rooms. These tools used to
// look exactly like genuine human traffic because their page URL omitted ?harness=1. Untracked
// local probes cannot be CI fixtures, so the durable contract covers every tracked room driver.
for (const path of [
  "tools/shoot.mjs",
  "tools/loop-to-win.mjs",
  "tools/mobile-verify.mjs",
  "tools/play-smart.mjs",
  "tools/play-win.mjs",
  "tools/screens-shot.mjs",
]) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  ok(/[?&]harness=1/.test(source), `${path} tags its real-client traffic as harness telemetry`);
}

// Capture every telemetry line the server would write.
let cap = [];
_setTelemWrite((line) => cap.push(JSON.parse(line)));
const last = () => cap[cap.length - 1];
const ofType = (t) => cap.filter((e) => e.type === t);

{
  const r = G.newRoom("OPEN"); G.addPlayer(r, "p", "P");
  cap = []; startTrackedDraft(r);
  eq(ofType("run_start").length, 1, "the initial lobby-to-draft transition emits one run_start synchronously");
  eq(last().wheel?.length, 3, "the initial run_start includes exactly the solo player's three offers");
  ok(last().wheel.every((offer) => offer.offeredTo === "p"), "run_start attributes every offer to its player");
  serverTick(r);
  eq(ofType("run_start").length, 1, "the next server tick cannot duplicate run_start");
}
{
  const r = G.newRoom("JOINOFF"); G.addPlayer(r, "host", "Host");
  startTrackedDraft(r);
  const before = new Set(r.draftWheel.map((b) => b.id));
  G.addPlayer(r, "guest", "Guest");
  G.growDraftWheel(r);
  cap = []; telemDraftOffersAdded(r, before);
  eq(ofType("draft_offer").length, 1, "late-join offers emit one dedicated telemetry event");
  eq(last().wheel?.length, 3, "late-join telemetry contains exactly the guest's three new offers");
  ok(last().wheel.every((offer) => offer.offeredTo === "guest"), "late-join telemetry attributes the triple to the guest");
}

// ── 1. HARNESS + BOTS stamping ────────────────────────────────────────────────────────────────
{
  const r = G.newRoom("HARN"); r.harness = true; G.addPlayer(r, "p", "P");
  cap = []; telem(r, "run_start", {});
  eq(last().harness, true, "a HARNESS-flagged run records harness:true on its telemetry");
  eq(last().bots, 0, "…with bots:0 (no auto-piloted seats)");
  eq(last().party, 1, "…and party:1");
  eq(last().type, "run_start", "…preserving the event type + shape");
}
{
  const r = G.newRoom("BOTS"); const host = G.addPlayer(r, "p", "P");
  G.addPlayer(r, "b", "B", { bot: true, owner: host.id });
  cap = []; telem(r, "shop_offer", { wares: ["oSword"] });
  eq(last().harness, false, "a NORMAL run records harness:false (genuine-play signal)");
  eq(last().bots, 1, "…and bots counts the auto-piloted seats in the room");
  eq(last().party, 2, "…party counts every seat");
}
{
  // telemOff (nt:true harnesses) and god rooms still emit NOTHING — the tag is additive, not a bypass.
  const r = G.newRoom("OFF"); r.telemOff = true; G.addPlayer(r, "p", "P");
  cap = []; telem(r, "run_start", {});
  eq(cap.length, 0, "telemOff rooms emit no telemetry at all (unchanged opt-out)");
}

// ── 2. loot_offer emits the OFFERED set (solo, the case that was invisible) ──────────────────────
{
  const r = G.newRoom("OFR"); r.harness = false;
  const p = G.addPlayer(r, "p", "P");
  G.startDraft(r); G.draftPick(r, p, r.draftWheel[0].id);   // seed a real deck/backpack
  r.phase = "playing"; r.laneCount = 1; r.lanes = [[]]; r.allies = [[]];
  r.caravan = { hp: 100, max: 100 };
  r.draftedFoes = [{ bodyKey: "rookie", gear: ["oDagger", "oFire"], greedy: true, owner: "p" }];
  G.simulateTick(r);                                        // empty board → win; combat.js stashes lootRoll/lootTaken
  eq(r.phase, "won", "the fight resolved to a win");
  ok(r.lootRoll?.length > 0, "…engine stashed a non-empty lootRoll (the offered set)");

  r._fileLogged = true;                                     // skip the on-disk combat-log dump in this unit test
  cap = [];
  onPhaseChange(r, "playing", "won");                       // the seam that fires the offer/result telemetry

  const offers = ofType("loot_offer");
  eq(offers.length, 1, "a loot choice emits exactly one loot_offer event");
  ok(offers[0].cards?.includes("oDagger") && offers[0].cards?.includes("oFire"),
    "…loot_offer carries the FULL offered set (blade + fire), even though solo wiped room.loot");
  eq(offers[0].harness, false, "…stamped harness:false");
  eq(offers[0].bots, 0, "…and bots:0 (this is genuine solo play)");

  // SOLO auto-collect has no claim screen → onPhaseChange logs each taken card so the pick side exists.
  const claims = ofType("loot_claim");
  ok(claims.length >= 2, "…solo auto-collected loot is logged as loot_claim events (pick side)");
  ok(claims.every((c) => c.auto === true && c.bot === false),
    "…marked auto:true, bot:false (engine-collected by the human seat, not a bot)");
  ok(claims.some((c) => c.key === "oDagger") && claims.some((c) => c.key === "oFire"),
    "…covering exactly the cards that were auto-collected");

  // room_result no longer double-carries the loot (moved to loot_offer) — no double count for the report.
  const rr = ofType("room_result")[0];
  ok(rr && rr.lootOffered === undefined, "room_result no longer carries lootOffered (loot lives in loot_offer now)");
  eq(rr.result, "won", "…room_result still records the fight result");
}

// ── 3. loot pick attribution: a BOT-driven claim is flagged bot:true ─────────────────────────────
{
  // Co-op: room.loot stays a shared pile (no solo auto-collect), claims come via messages. A pick made
  // by an auto-piloted (bot) seat must be distinguishable from a human's — telem carries bot:!!p.bot.
  const r = G.newRoom("COOP"); const host = G.addPlayer(r, "a", "A");
  const bot = G.addPlayer(r, "b", "B", { bot: true, owner: host.id });
  cap = []; telem(r, "loot_claim", { key: "oFire", by: bot.id, seat: bot.id, bot: !!bot.bot });
  eq(last().bot, true, "a bot seat's claim is flagged bot:true (excluded from human pick-rate)");
  cap = []; telem(r, "loot_claim", { key: "oFire", by: host.id, seat: host.id, bot: !!host.bot });
  eq(last().bot, false, "a human seat's claim is flagged bot:false");
}

// ── 4. bounded combat metrics: deck/draw/affordability/heal/shield facts ─────────────
{
  const r = G.newRoom("METRICS");
  const p = G.addPlayer(r, "p", "P");
  r.phase = "playing"; r.laneCount = 1; r.lanes = [[G.spawnEnemy("rookie", ["oSword"])]]; r.allies = [[]];
  r.level = { currentId: "B", nodes: [{ id: "B", type: "boss", boss: "hydra" }] };
  r.boss = { id: "boss", bodyKey: "hydra", hp: 21, maxHp: 21 };
  p.runStarterDeck = ["oHoly", "oHoly", "oSword", "oSword"];
  p.deckList = ["oHoly", "oSword", "oFire", "oArcane"];
  p.backpack = [...p.deckList];
  p.cards = G.mintCards(p.deckList);
  p.hand = p.cards.slice(0, 3); p.deck = p.cards.slice(3); p.disc = []; p.inPlay = [];
  p.hp = p.maxHp - 2; p.moxie = 0;

  G.beginCombatMetrics(r);
  const opening = G.combatMetricsStart(r);
  eq(opening.node.boss, "hydra", "combat_start snapshots boss identity before it can die");
  eq(opening.players[0].deck.join(), p.deckList.join(), "combat_start snapshots the exact selected deck");
  eq(opening.players[0].starterDeck.join(), p.runStarterDeck.join(), "combat_start carries the actual rolled starter deck");
  eq(opening.players[0].openingHand.length, 3, "combat_start records opening draws");
  r._runId = "run-metrics"; cap = []; onPhaseChange(r, "setup", "playing");
  eq(ofType("combat_start").length, 1, "the playing phase emits one bounded combat_start event");
  eq(last().players[0].deck.join(), p.deckList.join(), "emitted combat_start carries the deck snapshot");

  G.tickCombatMetrics(r, p);                         // moxie 0: whole hand is locked
  let summary = G.combatMetricsSummary(r);
  eq(summary.players[0].handLockedTicks, 1, "a no-affordable-card tick records one hand lock");
  ok(opening.players[0].openingHand.every((key) => summary.players[0].cards[key].unaffordableTicks === 1),
    "each held opening card records its unaffordable exposure");
  const holy = p.hand.find((c) => c.key === "oHoly");
  ok(!G.playCard(r, p, holy.id), "an unaffordable manual tap is rejected without changing combat");
  eq(G.combatMetricsSummary(r).players[0].cards.oHoly.rejected.unaffordable, 1,
    "the rejected tap is aggregated by reason on that card");

  p.moxie = 10;
  G.tickCombatMetrics(r, p);                         // same cards now affordable
  ok(G.playCard(r, p, holy.id), "the measured Holy play succeeds");
  G.finishCombatMetrics(r, "won");
  summary = G.combatMetricsSummary(r);
  const pm = summary.players[0];
  eq(pm.cards.oHoly.casts, 1, "successful card play is attributed by card key");
  eq(pm.cards.oHoly.manualCasts, 1, "manual and AUTO casts stay distinguishable");
  eq(pm.cards.oArcane.draws, 1, "the in-place replacement draw is counted");
  eq(pm.healAttempted, 5, "healing records the requested amount");
  eq(pm.healEffective, 2, "healing records only HP actually restored");
  eq(pm.overhealWasted, 3, "ordinary overheal is recorded as wasted, not effective healing");
  eq(Object.values(pm.cards).reduce((n, c) => n + c.strandedDraws, 0), 2,
    "only end-hand cards that had a playable observation tick count as stranded draws");
  eq(pm.cards.oArcane.unexposedEndDraws, 1,
    "a replacement drawn by the ending cast is separated instead of falsely condemned as stranded");
}
{
  const r = G.newRoom("SHIELD"); const p = G.addPlayer(r, "p", "P");
  r.phase = "playing"; r.laneCount = 1; r.lanes = [[]]; r.allies = [[]];
  p.deckList = ["oPunishGlutton"]; p.cards = G.mintCards(p.deckList); p.hand = [...p.cards]; p.deck = []; p.disc = [];
  G.beginCombatMetrics(r);
  p.moxie = 10;
  ok(G.playCard(r, p, p.hand[0].id), "Punishment Glutton grants its measured special shield");
  G.damagePlayer(r, p, 5);
  G.finishCombatMetrics(r, "lost");
  const pm = G.combatMetricsSummary(r).players[0];
  eq(pm.shieldDamageAbsorbed, 5, "shield telemetry records incoming damage actually stopped");
  eq(pm.shieldResourceSpent, 10, "special double shield separately records shield points consumed");
  eq(pm.hpDamage, 0, "a fully shielded hit records zero HP damage");
  eq(pm.cards.oPunishGlutton.shieldGranted, 10, "shield grant is attributed to its source card");
  eq(pm.cards.oPunishGlutton.shieldDamageAbsorbed, 5, "damage stopped is attributed back to that shield card");
  eq(pm.cards.oPunishGlutton.shieldResourceSpent, 10, "special shield resource spend is attributed separately");
}
{
  const r = G.newRoom("PIERCE"); const p = G.addPlayer(r, "p", "P");
  r.phase = "playing"; r.laneCount = 1; r.lanes = [[]]; r.allies = [[]];
  p.deckList = ["oPunishGlutton"]; p.cards = G.mintCards(p.deckList); p.hand = [...p.cards]; p.deck = []; p.disc = [];
  G.beginCombatMetrics(r);
  p.moxie = 10;
  ok(G.playCard(r, p, p.hand[0].id), "the piercing fixture starts with a measured special shield");
  G.damagePlayer(r, p, 5, { cause: "piercing telemetry fixture", pierce: true });
  G.finishCombatMetrics(r, "lost");
  const pm = G.combatMetricsSummary(r).players[0];
  eq(pm.shieldDamageAbsorbed, 0, "piercing damage is never counted as shield-absorbed");
  eq(pm.shieldResourceSpent, 0, "piercing damage never spends shield resources in telemetry");
  eq(pm.cards.oPunishGlutton.shieldDamageAbsorbed, 0, "piercing damage is not falsely attributed to the granting card");
  eq(pm.cards.oPunishGlutton.shieldResourceSpent, 0, "piercing damage leaves the granting card's shield ledger intact");
  eq(p.shield, 10, "piercing damage leaves the authoritative special shield intact");
}
{
  const r = G.newRoom("BOSSID"); const p = G.addPlayer(r, "p", "P");
  r._runId = "run-test"; r.phase = "playing"; r.laneCount = 1; r.lanes = [[]]; r.allies = [[]];
  r.level = { currentId: "B", nodes: [{ id: "B", type: "boss", boss: "kraken" }] };
  r.boss = { id: "boss", bodyKey: "kraken", hp: 1, maxHp: 1 };
  p.deckList = ["oSword"]; p.cards = G.mintCards(p.deckList); p.hand = [...p.cards]; p.deck = []; p.disc = [];
  G.beginCombatMetrics(r); G.finishCombatMetrics(r, "won"); r.boss = null; r.phase = "won"; r._fileLogged = true;
  cap = []; onPhaseChange(r, "playing", "won");
  const rr = ofType("room_result")[0];
  eq(rr.runId, "run-test", "every telemetry event carries the stable run id");
  eq(rr.boss, "kraken", "room_result preserves the boss captured at combat start after death clears room.boss");
  eq(rr.players[0].deck[0], "oSword", "room_result carries the bounded per-player combat summary");
}

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
