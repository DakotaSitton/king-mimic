// SQUAD MODE — one human pilots N bodies; the room is provisioned as an N-player game
// (lanes, caravan, draft all scale off players.size). The human drafts a body + kit for EACH
// of their bodies (no auto-draft — owner 2026-06-18); un-piloted bodies fight on AUTO in combat.
// This is the pure-engine proof; probe_squaddraft.mjs proves the live per-body draft over WS.
// Run: bun test/squad.test.js
import * as G from "../game.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("❌", m); } };
const eq = (a, b, m) => ok(a === b, `${m} (got ${a}, want ${b})`);

// --- provisioning: 1 piloted body + 3 bots = a 4-body squad from ONE seat ---------------
const r = G.newRoom("SQUAD"); r.telemOff = true;
G.addPlayer(r, "h", "Host");                                   // the piloted body
for (let i = 1; i < 4; i++) G.addPlayer(r, `h-b${i}`, `Host #${i + 1}`, { bot: true, owner: "h" });
eq(r.players.size, 4, "4 player-entities provisioned from one seat");
eq(G.deriveLaneCount(r), 4, "the game treats the squad as 4 players → 4 lanes");
eq(G.caravanMaxHp(r.players.size), 80, "the caravan scales to a 4-body party (20×4)");

// --- the human drafts a body + kit for EACH body (no auto-draft) -------------------------
G.startDraft(r);
const all = [...r.players.values()];
ok(all.every((p) => !p.drafted), "NO body is auto-drafted — you choose each one");
ok(!G.draftComplete(r), "the run waits until every body is picked");
const wheel = [...r.draftWheel];
all.forEach((p, i) => {                                         // click through the squad, one bundle each
  ok(!G.draftComplete(r) || i === all.length - 1, "draft stays open while bodies remain unpicked");
  G.draftPick(r, p, wheel[i].id);
});
ok(all.every((p) => p.drafted), "every body in the squad got a body + kit");
eq(new Set(all.map((p) => p.lockedBundle)).size, 4, "4 DISTINCT bundles locked (exclusive across the squad)");
ok(G.draftComplete(r), "draft completes only once ALL bodies are picked");
ok(!!r.level, "the run starts with the full squad");

// --- lane bijection + autopilot readiness after the room is entered ---------------------
eq(r.laneCount, 4, "the live room locked to 4 lanes");
eq([...r.players.values()].map((p) => p.ownedLane).sort().join(","), "0,1,2,3",
   "each body owns a distinct lane (bijection)");
const bots = [...r.players.values()].filter((p) => p.bot);
ok(bots.every((p) => p.autoFire), "un-piloted bodies fight on AUTO by default");
ok(bots.every((p) => (p.inv?.length ?? 0) > 0), "every body carries its OWN drafted kit");
ok(new Set(all.map((p) => p.bodyKey)).size === 4, "the 4 bodies are 4 distinct chassis (you picked each)");
ok(bots.every((p) => p.alive && p.hp > 0), "bodies entered the room alive with HP");

// --- a SOLO squad of 2 also works (the lower bound) -------------------------------------
const r2 = G.newRoom("DUO"); r2.telemOff = true;
G.addPlayer(r2, "x", "Solo");
G.addPlayer(r2, "x-b1", "Solo #2", { bot: true, owner: "x" });
eq(G.deriveLaneCount(r2), 2, "a 2-body squad → 2 lanes");
G.startDraft(r2);
ok(![...r2.players.values()].some((p) => p.drafted), "neither body auto-drafts");
const w2 = [...r2.draftWheel];
G.draftPick(r2, r2.players.get("x"), w2[0].id);
ok(!G.draftComplete(r2), "still waiting on the second body");
G.draftPick(r2, r2.players.get("x-b1"), w2[1].id);
ok(!!r2.level && r2.laneCount === 2, "the 2-body run started on a 2-lane board once both were picked");

console.log(`\nSQUAD: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
