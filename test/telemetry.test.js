// Server-side telemetry tests (owner 2026-07-09): prove the two provenance fixes so future
// analysis is clean —
//   1. every telemetry line is stamped harness / bots, so a HARNESS-flagged run records harness:true
//      and an analyst can isolate genuine human solo play (harness===false && bots===0).
//   2. a loot choice emits a discrete `loot_offer` carrying the FULL offered set — even in solo,
//      where the engine auto-collects loot and wipes room.loot (previously invisible to telemetry).
// server.js is import-safe (binds the port only under import.meta.main), so we capture emitted lines
// via the test sink hook instead of touching disk or a socket. Run: bun run test/telemetry.test.js
import * as G from "../game.js";
import { cleanAcquisitionSource, telem, telemDraftOffersAdded, telemUiInteraction, telemCommandInteraction, onPhaseChange, serverTick, startTrackedDraft, holdSeatForReconnect, markSeatReturned, dropSeat, _setTelemWrite } from "../server.js";
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

ok(cleanAcquisitionSource("itch") === "itch" && cleanAcquisitionSource("ITCH") === "itch",
  "the known itch storefront source is normalized");
ok(cleanAcquisitionSource("arbitrary referral text") === null && cleanAcquisitionSource(42) === null,
  "unknown or non-string acquisition sources are refused");
{
  const r = G.newRoom("SRC"); r.acquisitionSource = "itch"; G.addPlayer(r, "p", "P");
  cap = []; telem(r, "run_start", {});
  eq(last().source, "itch", "every room event carries its closed-vocabulary storefront source");
  eq(last().difficulty, "regular", "every room event identifies the default Regular ruleset");
  r.difficulty = "challenge"; cap = []; telem(r, "run_start", {});
  eq(last().difficulty, "challenge", "telemetry keeps Challenge balance data separable");
  r.acquisitionSource = null; cap = []; telem(r, "run_start", {});
  eq(last().source, null, "direct/unknown traffic is explicit rather than guessed");
}

// Semantic interaction telemetry has a closed, privacy-safe vocabulary. It records what surface/action
// was used, not pointer coordinates, labels, names, or arbitrary client strings.
{
  const r = G.newRoom("UI"); const p = G.addPlayer(r, "p", "Private Name"); p.bodyKey = "fatCat";
  cap = [];
  ok(telemUiInteraction(r, p, "economy", "melt_arm"), "an allowed local UI interaction is recorded");
  eq(last().type, "ui_interaction", "UI telemetry uses its dedicated event type");
  eq(last().surface, "economy", "UI telemetry records the semantic surface");
  eq(last().action, "melt_arm", "UI telemetry records the semantic action");
  eq(last().origin, "local", "local-only navigation is labeled local");
  eq(last().bot, false, "client UI input is attributed to a human seat");
  ok(last().name === undefined && last().x === undefined && last().y === undefined,
    "UI telemetry contains no player name or raw pointer coordinates");
  const before = cap.length;
  ok(!telemUiInteraction(r, p, "economy", "arbitrary user text"), "unknown client UI labels are refused");
  eq(cap.length, before, "a refused UI label emits nothing");
  cap = []; p.bot = true;
  telemUiInteraction(r, p, "panel", "deck_open", "client", "owner-seat");
  eq(last().seat, "owner-seat", "a possessed squad body's interaction stays attributed to its human seat");
  eq(last().bot, false, "a human socket remains human interaction while piloting an auto-capable body");
  eq(last().pilotedBot, true, "the piloted body's auto-capable provenance remains inspectable");
  p.bot = false;
  cap = []; r.phase = "setup";
  ok(telemCommandInteraction(r, p, "start"), "a mapped authoritative command emits interaction telemetry");
  eq(last().surface + "/" + last().action, "combat/begin", "start in setup maps to combat/begin");
  eq(last().origin, "command_attempt", "server-authoritative commands are explicitly counted as attempts");
  cap = [];
  ok(telemCommandInteraction(r, p, "setClock"), "a clock press emits one mapped authoritative interaction");
  eq(last().surface + "/" + last().action, "combat/clock_cycle", "clock requests use the bounded combat vocabulary");
}

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
  // RECLASSIFIED 2026-08-04: a human seat's Party companion is a human-COMMANDED combatant since
  // the all-hands change (owner 2026-07-28) — it must not count toward the machine-pilot tally, or
  // every party room reads as automated and the owner's playtest data excludes itself.
  const r = G.newRoom("BOTS"); const host = G.addPlayer(r, "p", "P");
  G.addPlayer(r, "b", "B", { bot: true, owner: host.id });   // partyRole derives to "companion"
  cap = []; telem(r, "shop_offer", { wares: ["oSword"] });
  eq(last().harness, false, "a NORMAL run records harness:false (genuine-play signal)");
  eq(last().bots, 0, "…a human seat's Party companion no longer counts as a machine pilot");
  eq(last().party, 2, "…while party still counts every body");
  // A NON-companion bot entity (a true autopilot; none live today) still classifies as a machine.
  const auto = G.addPlayer(r, "npc", "Autopilot", { bot: true });   // owner=self → partyRole "solo"
  ok(G.telemAutoPiloted(auto) === true && G.telemAutoPiloted(host) === false,
    "telemAutoPiloted separates true autopilots from human seats");
  cap = []; telem(r, "shop_offer", { wares: ["oSword"] });
  eq(last().bots, 1, "…a non-companion bot entity still counts in the room's bots tally");
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
  G.currentNode(r).skew = "veteran";
  r.phase = "playing"; r.laneCount = 1; r.lanes = [[]]; r.allies = [[]];
  r.caravan = { hp: 100, max: 100 };
  r.draftedFoes = [{ bodyKey: "rookie", gear: ["oDagger", "oFire"], level: 3,
    levelAllocation: { hp: 1, melee: 1, ranged: 0, mastery: 0, specialty: 0 }, greedy: true, owner: "p" }];
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
  eq(rr.skew, "veteran", "…and preserves the room's generation bias for composition analysis");
  eq(rr.stocked[0].level, 3, "…and records the exact generated foe level for future run feedback");
  eq(rr.stocked[0].levelAllocation.hp, 1, "…with the foe's exact level allocation");
}

// ── 3. loot pick attribution: only a MACHINE-piloted claim is flagged bot:true ───────────────────
{
  // Co-op: room.loot stays a shared pile (no solo auto-collect), claims come via messages. The live
  // server sites stamp bot: telemAutoPiloted(p) (2026-08-04): a Party companion's claim is a HUMAN
  // pick — its owning seat routed the loot — while a true autopilot entity stays excluded.
  const r = G.newRoom("COOP"); const host = G.addPlayer(r, "a", "A");
  const comp = G.addPlayer(r, "b", "B", { bot: true, owner: host.id });   // Party companion
  const auto = G.addPlayer(r, "c", "C", { bot: true });                   // non-companion autopilot
  cap = []; telem(r, "loot_claim", { key: "oFire", by: auto.id, seat: auto.id, bot: G.telemAutoPiloted(auto) });
  eq(last().bot, true, "a true autopilot's claim is flagged bot:true (excluded from human pick-rate)");
  cap = []; telem(r, "loot_claim", { key: "oFire", by: comp.id, seat: comp.id, bot: G.telemAutoPiloted(comp) });
  eq(last().bot, false, "a Party companion's claim counts as a human pick (all-hands, owner 2026-07-28)");
  cap = []; telem(r, "loot_claim", { key: "oFire", by: host.id, seat: host.id, bot: G.telemAutoPiloted(host) });
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
  eq(pm.healAttempted, 4, "healing records the requested amount (owner 2026-08-06: Holy heal 5→4)");
  eq(pm.healEffective, 2, "healing records only HP actually restored");
  eq(pm.overhealWasted, 2, "ordinary overheal is recorded as wasted, not effective healing (4 attempted − 2 effective)");
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
  eq(pm.cards.oPunishGlutton.shieldGranted, 12, "shield grant is attributed to its source card (owner 2026-08-06: 10→12)");
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
  eq(p.shield, 12, "piercing damage leaves the authoritative special shield intact (owner 2026-08-06: 10→12)");
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

// ── 5. PARTY PROVENANCE: a seat's companion bodies are HUMAN results in combat summaries ─────────
// Regression for the 2026-08-01 run-audit defect: companions carried bot:true into combat_start /
// room_result players, so the standard report dropped two-thirds of a party seat's body results.
{
  const r = G.newRoom("PARTYPROV"); const host = G.addPlayer(r, "h", "H");
  const comp = G.addPlayer(r, "h-b1", "Body 2", { bot: true, owner: host.id, partyRole: "companion" });
  const auto = G.addPlayer(r, "npc", "Autopilot", { bot: true });   // hypothetical true bot: stays excluded
  r.phase = "playing"; r.laneCount = 1; r.lanes = [[]]; r.allies = [[]];
  for (const p of [host, comp, auto]) {
    p.deckList = ["oSword"]; p.cards = G.mintCards(p.deckList); p.hand = [...p.cards]; p.deck = []; p.disc = [];
  }
  G.beginCombatMetrics(r);
  const sBy = Object.fromEntries(G.combatMetricsStart(r).players.map((p) => [p.seat, p]));
  eq(sBy["h"].bot, false, "combat_start: the piloted seat is human");
  eq(sBy["h-b1"].bot, false, "combat_start: an owned Party body is a human-commanded combatant (all-hands)");
  eq(sBy["h-b1"].owner, "h", "…while its owner field keeps companionship derivable for analysts");
  eq(sBy["npc"].bot, true, "combat_start: a non-companion bot entity stays machine-classified");
  G.finishCombatMetrics(r, "won");
  const mBy = Object.fromEntries(G.combatMetricsSummary(r).players.map((p) => [p.seat, p]));
  eq(mBy["h-b1"].bot, false, "room_result: the companion's combat summary counts as a human-seat result");
  eq(mBy["npc"].bot, true, "room_result: the autopilot's summary stays excluded from human tables");
}

// ── 6. POSSESS PROVENANCE: auto-advance switches are distinguishable from deliberate taps ────────
{
  const r = G.newRoom("POSS"); const p = G.addPlayer(r, "p", "P");
  cap = [];
  ok(telemCommandInteraction(r, p, "possess", "p"), "a manual possess emits its squad interaction");
  eq(last().surface + "/" + last().action, "squad/possess", "…in the closed squad vocabulary");
  ok(!("auto" in last()), "…with NO auto flag (a deliberate chip tap; old clients also land here)");
  cap = [];
  ok(telemCommandInteraction(r, p, "possess", "p", { auto: true }), "an auto-advance possess emits too");
  eq(last().auto, true, "…stamped auto:true so reports separate machinery from switching intent");
  eq(last().surface + "/" + last().action, "squad/possess", "…on the same wire event (additive field only)");
  // Durable client contract (same style as the harness-tag checks above): every CODE-INITIATED
  // possess — queue auto-advance, snap-back-to-primary, draft hop — is stamped auto:true, while
  // deliberate chip/canvas taps keep the unstamped manual shape.
  const client = readFileSync(new URL("../public/client.js", import.meta.url), "utf8");
  ok(/send\(\{ type: "possess", id: cand\.id, auto: true \}\)/.test(client),
    "possessNextUnqueued (queue auto-advance) sends auto:true");
  ok(/send\(\{ type: "possess", id: you, auto: true \}\)/.test(client),
    "the snap-back-to-primary possess sends auto:true");
  ok(/send\(\{ type: "possess", id \}\)/.test(client),
    "a deliberate chip-tap possess still sends the unstamped manual shape");
}

// ── 7. SEAT-DROP visibility: hold / reconnect / leave events + the room_result offline flag ──────
// Regression for the 2026-08-07 Railway 4-human loss (run-2026-08-07T04-18-58-104Z-M): a seat
// dropped after room 4 and NOTHING recorded it — no drop event type existed and room_result carried
// no presence field, so the drop was only inferable from five straight 0-cast rooms.
{
  const r = G.newRoom("DROP"); r._runId = "run-drop";
  const a = G.addPlayer(r, "pa", "A"); const b = G.addPlayer(r, "pb", "B");
  a.ws = {}; b.ws = {}; a.token = "tok-a"; b.token = "tok-b";
  cap = [];
  holdSeatForReconnect(r, b);
  eq(last().type, "seat_hold", "a socket drop on a tokened seat emits seat_hold");
  eq(last().seat, "pb", "…attributed to the held seat");
  eq(last().reason, "close", "…with the default close reason");
  ok(b.gone === true && b.ws === null, "…and the seat is actually held (gone, socketless)");
  const held = cap.length;
  holdSeatForReconnect(r, b);
  eq(cap.length, held, "the held socket's own close event cannot double-emit seat_hold");

  // A combat fought while the seat is away → its roster + summary rows are flagged offline.
  r.phase = "playing"; r.laneCount = 1; r.lanes = [[]]; r.allies = [[]];
  for (const p of [a, b]) { p.deckList = ["oSword"]; p.cards = G.mintCards(p.deckList); p.hand = [...p.cards]; p.deck = []; p.disc = []; }
  G.beginCombatMetrics(r);
  const sBy = Object.fromEntries(G.combatMetricsStart(r).players.map((p) => [p.seat, p]));
  eq(sBy.pa.offline, false, "combat_start: a connected seat reads offline:false");
  eq(sBy.pb.offline, true, "combat_start: the held seat is visibly offline in the roster");
  G.finishCombatMetrics(r, "won");
  const mBy = Object.fromEntries(G.combatMetricsSummary(r).players.map((p) => [p.seat, p]));
  eq(mBy.pb.offline, true, "room_result: the held seat's summary row carries offline:true");
  eq(mBy.pa.offline, false, "room_result: present seats stay offline:false");

  // Reconnect: only an actually-away seat emits, and awayMs measures the shorthanded stretch.
  cap = [];
  markSeatReturned(r, b); b.ws = {};
  eq(last().type, "seat_reconnect", "a token reclaim of an away seat emits seat_reconnect");
  eq(last().seat, "pb", "…for that seat");
  ok(Number.isFinite(last().awayMs) && last().awayMs >= 0, "…with the measured away duration");
  const returned = cap.length;
  markSeatReturned(r, b);
  eq(cap.length, returned, "a stale-socket race on a PRESENT seat emits nothing");

  // Deliberate leave: erases the seat and emits seat_leave describing who remains.
  cap = [];
  dropSeat(r, "pb");
  eq(last().type, "seat_leave", "a deliberate Leave emits seat_leave");
  eq(last().seat, "pb", "…attributed to the departed seat");
  eq(last().party, 1, "…with party counting the REMAINING bodies");
  const leftOnce = cap.length;
  dropSeat(r, "pb");
  eq(cap.length, leftOnce, "a double-leave emits nothing");
}

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
