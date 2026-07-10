// Server-side telemetry tests (owner 2026-07-09): prove the two provenance fixes so future
// analysis is clean —
//   1. every telemetry line is stamped harness / bots, so a HARNESS-flagged run records harness:true
//      and an analyst can isolate genuine human solo play (harness===false && bots===0).
//   2. a loot choice emits a discrete `loot_offer` carrying the FULL offered set — even in solo,
//      where the engine auto-collects loot and wipes room.loot (previously invisible to telemetry).
// server.js is import-safe (binds the port only under import.meta.main), so we capture emitted lines
// via the test sink hook instead of touching disk or a socket. Run: bun run test/telemetry.test.js
import * as G from "../game.js";
import { telem, onPhaseChange, _setTelemWrite } from "../server.js";

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("❌ " + label); } };
const eq = (a, b, label) => ok(a === b, `${label} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

// Capture every telemetry line the server would write.
let cap = [];
_setTelemWrite((line) => cap.push(JSON.parse(line)));
const last = () => cap[cap.length - 1];
const ofType = (t) => cap.filter((e) => e.type === t);

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
  r.draftedFoes = [{ bodyKey: "rookie", gear: ["blade", "fire"], greedy: true, owner: "p" }];
  G.simulateTick(r);                                        // empty board → win; combat.js stashes lootRoll/lootTaken
  eq(r.phase, "won", "the fight resolved to a win");
  ok(r.lootRoll?.length > 0, "…engine stashed a non-empty lootRoll (the offered set)");

  r._fileLogged = true;                                     // skip the on-disk combat-log dump in this unit test
  cap = [];
  onPhaseChange(r, "playing", "won");                       // the seam that fires the offer/result telemetry

  const offers = ofType("loot_offer");
  eq(offers.length, 1, "a loot choice emits exactly one loot_offer event");
  ok(offers[0].cards?.includes("blade") && offers[0].cards?.includes("fire"),
    "…loot_offer carries the FULL offered set (blade + fire), even though solo wiped room.loot");
  eq(offers[0].harness, false, "…stamped harness:false");
  eq(offers[0].bots, 0, "…and bots:0 (this is genuine solo play)");

  // SOLO auto-collect has no claim screen → onPhaseChange logs each taken card so the pick side exists.
  const claims = ofType("loot_claim");
  ok(claims.length >= 2, "…solo auto-collected loot is logged as loot_claim events (pick side)");
  ok(claims.every((c) => c.auto === true && c.bot === false),
    "…marked auto:true, bot:false (engine-collected by the human seat, not a bot)");
  ok(claims.some((c) => c.key === "blade") && claims.some((c) => c.key === "fire"),
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
  cap = []; telem(r, "loot_claim", { key: "fire", by: bot.id, seat: bot.id, bot: !!bot.bot });
  eq(last().bot, true, "a bot seat's claim is flagged bot:true (excluded from human pick-rate)");
  cap = []; telem(r, "loot_claim", { key: "fire", by: host.id, seat: host.id, bot: !!host.bot });
  eq(last().bot, false, "a human seat's claim is flagged bot:false");
}

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
