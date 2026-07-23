// King Mimic — networking layer. Game logic lives in game.js (pure, unit-tested).
// This file: rooms registry, the tick loop, WebSocket message routing, static serving.

import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  LANES, newRoom, addPlayer, syncLobbyLanes, wearBody, swapBody, snapshot, simulateTick,
  startLevel, beginCombat, advanceLevel, returnToRoomOptions, voteRoom, lockRoom, unlockRoom, maybeResolveRoomVote, useItem, requestCardPlay, enqueueCardPlay, moveQueuedCard, cancelQueuedCard, moveDepth,
  startDraft, growDraftWheel, reopenDraftForJoin, draftPick, maybeFinishDraft, armEcho, chooseSphinxPassive,
  claimLoot, seatOf, dropItem, setTarget, setAllyTarget, cycleTarget, descend,
  proposeTrade, acceptTrade, declineTrade, giveOwnItem, swapOwnItems,
  moveToDeck, moveToBackpack,
  currentNode, spawnEnemy, mintCards, dealHand, levelUp, allocateLevel, summonBodies, convertBackpack, beginRun,
  partyMain,
  foeLevel,
  floorCardIdCounter, floorFoeIdCounter, floorNodeIdCounter, floorTradeOfferIdCounter, floorDraftBundleIdCounter,
  applyScenario, combatMetricsStart, combatMetricsSummary, clockAllowsSimulation, setPlayerClockDivisor,
  MOXIE_CAP, BODIES, DRAFT_MAX_PLAYERS, knowledgeCatalog,
} from "./game.js";
import { createRunPersistence, maxNumericIds } from "./engine/run-persistence.js";

import netDelta from "./public/net-delta.js";   // snapshot delta codec — same file the browser loads
const { diffSnap } = netDelta;

const PORT = Number(process.env.PORT ?? 3000);
const TICK_MS = 100;
// Hosted instances must mount persistent storage at KM_DATA_DIR. Active runs survive a process
// restart/deploy only while this directory survives; an ephemeral deploy filesystem cannot preserve
// them. The current Railway service satisfies this boundary with its READY 500MB /var/data volume
// and KM_DATA_DIR=/var/data. Local development keeps the historical repo-root paths.
const DATA_DIR = process.env.KM_DATA_DIR || import.meta.dir;
const envInt = (key, fallback, min, max) => {
  const parsed = Number.parseInt(process.env[key] ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};
// Public-admission defaults. They are intentionally far above normal play (a human rarely sends
// more than a handful of actions per second) while putting finite bounds around hostile clients.
const MAX_INBOUND_MESSAGE_BYTES = envInt("KM_MAX_MESSAGE_BYTES", 64 * 1024, 64, 1024 * 1024);
const MESSAGE_LIMIT = envInt("KM_MESSAGE_LIMIT", 180, 10, 10_000);
const MESSAGE_WINDOW_MS = envInt("KM_MESSAGE_WINDOW_MS", 10_000, 100, 60_000);
const MAX_ACTIVE_ROOMS = envInt("KM_MAX_ACTIVE_ROOMS", 256, 1, 10_000);
const MAX_HUMAN_SEATS = envInt("KM_MAX_HUMAN_SEATS", 4, 1, 64);
// A browser Origin must match the public request host (including x-forwarded-host through a TLS
// tunnel) unless explicitly listed here. Headerless CLI/test/probe clients remain supported.
const EXPLICIT_ALLOWED_ORIGINS = new Set((process.env.KM_ALLOWED_ORIGINS ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean).map((value) => {
    try { return new URL(value).origin.toLowerCase(); } catch { return ""; }
  }).filter(Boolean));
// SCENARIO MODE (dev capture tool, 2026-07-11): ONLY when the process is started with KM_SCENARIO=1
// does the {type:"scenario"} room-injection hook exist at all — the live public server never sets it,
// so there is zero exposure. Used by tools/scenario-shot.mjs to screenshot hard-to-reach REAL states.
const SCENARIO_MODE = process.env.KM_SCENARIO === "1";
// Production owner playtesting is a separate, normal-run entry path. The credential exists only
// in process environment and the inbound create message; it is never stored on the room, emitted,
// logged, or returned. A fixed-length digest comparison avoids useful timing leakage.
const OWNER_LAB_KEY = process.env.KM_OWNER_LAB_KEY ?? "";
const OWNER_LAB_SOURCE = "owner_lab";
const RUN_SAVE_MS = envInt("KM_RUN_SAVE_MS", 5_000, 250, 60_000);
// A queued manual card remains armed only while the player supplies no other combat intent.
// Read-only inspection/hover never reaches the server, so it deliberately does not cancel.
const QUEUE_CANCEL_INPUTS = new Set([
  "possess", "summonSide", "autoFire", "echoArm", "lane", "move", "use",
  "target", "allyTarget", "cycleTarget", "swapBody",
]);

/** @type {Map<string, any>} */
const rooms = new Map();
let nextId = 1;
const runPersistence = createRunPersistence({ dataDir: DATA_DIR, rooms, intervalMs: RUN_SAVE_MS });

// Card/foe/node/trade/draft counters are process-global. Their owning modules expose O(1) floor
// operations so restore never manufactures gameplay objects, consumes RNG, or scales with old ids.
function advanceRuntimeIds(restored) {
  const maxima = maxNumericIds(restored);
  // These ids grow for the lifetime of a production process and are deliberately carried across
  // deploys. A small fixed ceiling eventually turns a valid long-lived run into an unrecoverable
  // save. Reject only values that cannot be advanced exactly by the JavaScript counters.
  if (Object.values(maxima).some((value) => !Number.isSafeInteger(value) || value >= Number.MAX_SAFE_INTEGER))
    throw new Error("restored numeric id cannot be advanced safely");
  floorCardIdCounter(maxima.card);
  floorFoeIdCounter(maxima.foe);
  floorNodeIdCounter(maxima.node);
  floorTradeOfferIdCounter(maxima.offer);
  floorDraftBundleIdCounter(maxima.bundle);
  nextId = Math.max(nextId, maxima.player + 1);
}

function restoreRoomsBeforeServe() {
  // Scenario/capture processes are intentionally isolated from production state in both directions.
  if (SCENARIO_MODE) return 0;
  const restored = runPersistence.restoreSync();
  if (!restored.length) return 0;
  try {
    advanceRuntimeIds(restored);
    for (const room of restored) {
      rooms.set(room.code, room);
      maybeReapRoom(room); // dormant restore gets the same reconnect grace/removal contract as a dropped socket
    }
    return restored.length;
  } catch (error) {
    console.warn(`[run-persistence] Restored data rejected during runtime rebase: ${error?.message ?? error}. Starting with no restored rooms.`);
    rooms.clear();
    return 0;
  }
}

function browserOriginAllowed(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser probes/tests do not send Origin
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (EXPLICIT_ALLOWED_ORIGINS.has(parsed.origin.toLowerCase())) return true;
  const requestUrl = new URL(req.url);
  const hosts = [requestUrl.host, req.headers.get("host"), req.headers.get("x-forwarded-host")?.split(",")[0]]
    .filter(Boolean).map((host) => host.trim().toLowerCase());
  return hosts.includes(parsed.host.toLowerCase());
}

function messageRateAllowed(ws) {
  const now = Date.now();
  if (!ws.data.messageWindowStart || now - ws.data.messageWindowStart >= MESSAGE_WINDOW_MS) {
    ws.data.messageWindowStart = now;
    ws.data.messageCount = 0;
  }
  ws.data.messageCount = (ws.data.messageCount ?? 0) + 1;
  return ws.data.messageCount <= MESSAGE_LIMIT;
}

function rejectSocket(ws, message, closeCode = null) {
  try { ws.send(JSON.stringify({ type: "error", message })); } catch {}
  if (closeCode != null) try { ws.close(closeCode, message.slice(0, 120)); } catch {}
}

function makeRoomCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

const secretDigest = (value) => createHash("sha256").update(value).digest();
export function ownerLabAuthorized(value, configured = OWNER_LAB_KEY) {
  if (typeof value !== "string" || typeof configured !== "string" || configured.length < 24) return false;
  return timingSafeEqual(secretDigest(value), secretDigest(configured));
}

// OWNERLAB is the stable human-readable name. If it is occupied, take the first numbered LAB code;
// collision behavior is deterministic and never overwrites or promotes an existing room.
export function nextOwnerLabRoomCode(isTaken = (code) => rooms.has(code)) {
  if (!isTaken("OWNERLAB")) return "OWNERLAB";
  for (let n = 1; n <= MAX_ACTIVE_ROOMS + 1; n++) {
    const code = `LAB${String(n).padStart(5, "0")}`;
    if (!isTaken(code)) return code;
  }
  return null;
}

// ── SNAPSHOT DIFFING (perf/net 2026-07-11, tunnel-lag work) ────────────────────────────────
// The full per-tick snapshot is tens of KB; over the owner's flaky Cloudflare tunnel that keeps
// the pipe saturated and every input feels late. Broadcast KEYFRAME + DELTA instead:
//   • every KEYFRAME_EVERY-th broadcast (and to any socket that needs one) → the FULL snapshot,
//     tagged { seq } (type stays "state" — old shape, plus the sequence number);
//   • in between → { type:"delta", seq, base, ops } — the JSON patch from the previous snapshot
//     (see public/net-delta.js for the op format). Client applies in order; a seq gap or apply
//     failure makes it send {type:"snapFull"} and the next tick re-keyframes that socket.
// Per-player `_sentSeq` guarantees an unbroken chain: any socket that missed a broadcast (new
// join, token reconnect, dropped tick) automatically gets a full snapshot, no handshake needed.
// FLAG KM_KEYFRAME (owner re-tune): keyframe every 100 ticks = 10s. Env-overridable so a
// measurement run can force legacy full-every-tick behavior with KM_KEYFRAME=1.
// Recovery is request-driven within one tick, so scheduled safety keyframes can be sparse.
// A four-body full frame is ~100KB; 10s cadence plus per-client staggering prevents the two
// players from paying that parse/allocation cost on the same frame.
const KEYFRAME_EVERY = Math.max(1, Number(process.env.KM_KEYFRAME ?? 100) | 0);

function broadcastState(room) {
  const snap = snapshot(room);
  const seq = room._snapSeq = (room._snapSeq ?? 0) + 1;
  const prev = room._lastSnap;
  room._lastSnap = snap;                                    // the base the NEXT tick diffs against
  // lazy stringify: a tick where nobody needs the full frame never pays for it (and vice versa)
  const { bodies: _staticBodies, ...dynamicSnap } = snap;
  let fullStaticMsg = null, fullDynamicMsg = null, deltaMsg = null;
  const full = (includeStatic) => includeStatic
    ? (fullStaticMsg ??= JSON.stringify({ ...snap, seq }))
    : (fullDynamicMsg ??= JSON.stringify({ ...dynamicSnap, seq }));
  const delta = () => (deltaMsg ??= JSON.stringify({ type: "delta", seq, base: seq - 1, ops: diffSnap(prev, snap) }));
  const sockets = [...room.players.values()].filter((p) => p.ws);
  const stride = Math.max(1, Math.floor(KEYFRAME_EVERY / Math.max(1, sockets.length)));
  for (let socketIndex = 0; socketIndex < sockets.length; socketIndex++) {
    const p = sockets[socketIndex];
    const offset = socketIndex * stride;
    const scheduled = !prev || KEYFRAME_EVERY === 1 || (seq - 1 - offset) % KEYFRAME_EVERY === 0;
    // full when: scheduled keyframe · this socket asked (snapFull) · its chain broke (missed a tick)
    const needFull = scheduled || p._needFullSnap || p._sentSeq !== seq - 1;
    // Only clients that explicitly advertised the cache contract may receive a compact keyframe.
    // An old tab reconnecting across a deploy keeps getting the legacy complete shape.
    const includeStatic = !p._compactSnapshots || !!p._needStaticSnap || !p._sentStaticSnap;
    p._needFullSnap = false;
    p._needStaticSnap = false;
    p._sentSeq = seq;
    if (needFull && includeStatic) p._sentStaticSnap = true;
    try { p.ws.send(needFull ? full(includeStatic) : delta()); } catch {}
  }
}

// ---------------------------------------------------------------------------
// TELEMETRY (owner ask 2026-06-12: "see what I'm always/never picking"). One JSONL line
// per event into telemetry.jsonl. OFFERS are logged alongside CHOICES so the report can
// compute pick RATES (picked / offered), not bare counts. God/DEMO rooms are skipped.
// Aggregate with: bun tools/telemetry-report.js
// ---------------------------------------------------------------------------
const TELEM_FILE = join(DATA_DIR, "telemetry.jsonl");
// The sink is swappable so a test can capture emitted lines instead of appending to disk.
const diskWrite = (line) => { try { appendFileSync(TELEM_FILE, line); } catch {} };
let telemWrite = diskWrite;
export function _setTelemWrite(fn) { telemWrite = fn ?? diskWrite; }   // test hook only
// PROVENANCE (owner 2026-07-09): every line carries `harness` + `bots` so an analyst can isolate
// GENUINE HUMAN SOLO play with `harness===false && bots===0`. `harness` is the connection signal a
// harness sets (?harness=1 → forwarded on the create/join message); `bots` is how many seats in the
// room are auto-piloted (squad bots / harness-driven bodies). Automated runs are now filterable, not
// indistinguishable from a real playthrough.
export function telem(room, type, data = {}) {
  if (!room || room.god || room.telemOff) return;  // telemOff: test-harness rooms opt out (create {nt:true})
  const bots = [...room.players.values()].filter((p) => p.bot).length;
  telemWrite(JSON.stringify({
    ts: Date.now(), code: room.code, runId: room._runId ?? null, floor: room.floor ?? 1,
    party: room.players.size, harness: !!room.harness, bots,
    source: room.acquisitionSource ?? null, type, ...data,
  }) + "\n");
}
// ---------------------------------------------------------------------------
// COMBAT-LOG persistence (owner 2026-06-25): capture EVERY combat of a run — WON or LOST,
// every floor/node — not just the final caravan-fall. The in-memory room.combatLog is cleared
// by beginCombat at the START of every fight, so the 1500-line cap only ever spans the CURRENT
// combat; flushing the log to disk the moment a fight ENDS is therefore lossless across a whole
// run (each combat is a complete, self-contained section on disk before the next one clears it).
//
// TWO destinations, by design:
//   • combatlogs/<runId>.log — the PER-RUN canonical record and the answer to "every single
//     combat of the run in one readable place": open one file and every combat of that run is
//     there, in floor order, WON and LOST alike. Chosen over a single shared file because the
//     owner's unit of interest is "the run": a per-run file is naturally bounded by run length
//     (no size cap can ever drop an earlier combat), is isolated per room so concurrent rooms
//     never interleave or clobber, and — named *.log — is already covered by the repo .gitignore.
//   • combatlog.txt — the legacy rolling global tail, KEPT appending for backward-compat and a
//     single glance-at-everything file (never deleted/rotated away — owner guardrail).
// The runId is minted once at run start (phase → draft) so all of a run's combats share one file.
const COMBAT_LOGDIR = join(DATA_DIR, "combatlogs");
const COMBAT_TAIL = join(DATA_DIR, "combatlog.txt");
const runIdFor = (room) =>                                  // sortable + collision-proof across rooms
  "run-" + new Date().toISOString().replace(/[:.]/g, "-") + "-" + (room.code ?? "ROOM");

// Flush the just-finished combat to disk EXACTLY ONCE. `_fileLogged` is reset to false by
// beginCombat (game.js) at the start of every fight, so this fires once per combat — no dupes
// within a fight, no misses across a run (and onPhaseChange only fires it on the one
// playing→won/lost transition that ends each combat, so the guard is belt-and-suspenders).
function persistCombat(room, result) {
  if (!room || room._fileLogged) return;
  room._fileLogged = true;
  room._runId ??= runIdFor(room);                          // god / no-draft paths still get a file
  const node = currentNode(room);
  const won = result === "won";
  const header =
    "\n══════════════════════════════════════════════════════\n" +
    "COMBAT " + (won ? "WON" : "LOST") + (room.runWon ? " · RUN COMPLETE (the King fell)" : "") + "\n" +
    "time   " + new Date().toISOString() + "\n" +
    "room   " + room.code + "\n" +
    "floor  " + (room.floor ?? 1) + (node ? "   ·  node " + node.id + " (" + node.type + ")" : "") + "\n" +
    "lines  " + (room.combatLog?.length ?? 0) + "\n" +
    "──────────────────────────────────────────────────────\n";
  const section = header + (room.combatLog ?? []).join("\n") + "\n";
  try { mkdirSync(COMBAT_LOGDIR, { recursive: true }); appendFileSync(join(COMBAT_LOGDIR, room._runId + ".log"), section); } catch {}
  try { appendFileSync(COMBAT_TAIL, section); } catch {}   // legacy global tail — append, never delete
}

// Phase seams carry the offer-shaped events (the tick loop notices transitions ≤100ms
// after they happen, whether a message or the sim caused them).
export function onPhaseChange(room, from, to) {
  if (to === "draft") {
    room._runId = runIdFor(room);                          // fresh run → fresh per-run combat log
    telem(room, "run_start", {
      wheel: (room.draftWheel ?? []).map((b) => ({ body: b.bodyKey, items: b.items, offeredTo: b.offeredTo })),
    });
  }
  // (the `palette_offer` hook is gone with the stock phase — no live path ever set phase "stock";
  //  owner-approved removal 2026-07-19. telemetry-report keeps parsing historical palette_offer rows.)
  if (from === "playing" && (to === "won" || to === "lost")) {
    persistCombat(room, to);                               // every combat → disk, exactly once
    // OFFER-side loot log (owner 2026-07-09): the FULL set the room dropped, so pick-RATE is computable.
    // room.lootRoll is the stable copy game.js takes BEFORE the solo auto-collect wipes room.loot — the
    // discrete `loot_offer` event pairs with `loot_claim` the way shop_offer/palette_offer pair with
    // their picks. (Was piggybacked on room_result.lootOffered, which read the ALREADY-WIPED room.loot
    // in solo → empty. That blind spot is why solo pick-rates were uncomputable.)
    if (to === "won") {
      telem(room, "loot_offer", { cards: room.lootRoll ?? [] });
      // SOLO auto-collects every dropped card (no claim screen) — log each as an auto-claim so the
      // human's solo pick side exists at all. Co-op fires real loot_claim messages instead (lootTaken
      // stays null). `auto:true` marks these as engine-collected, not a click.
      if (room.lootTaken?.length) {
        const solo = [...room.players.values()][0];
        for (const k of room.lootTaken)
          telem(room, "loot_claim", { key: k, by: solo?.id ?? null, seat: solo?.id ?? null, bot: !!solo?.bot, auto: true });
      }
    }
    const combat = combatMetricsSummary(room);
    telem(room, "room_result", {
      result: to,
      roomType: combat?.node?.type ?? currentNode(room)?.type ?? null,
      skew: combat?.node?.skew ?? currentNode(room)?.skew ?? null,
      boss: combat?.node?.boss ?? room.boss?.bodyKey ?? null,
      ticks: room.tick - (room._combatStart ?? room.tick),
      uses: room.useCounts ?? {},                     // per-item presses this fight (AUTO included)
      stocked: (room.draftedFoes ?? []).map((f) => ({
        body: f.bodyKey,
        level: foeLevel(f),
        levelAllocation: f.levelAllocation ?? null,
        gear: f.gear ?? [],
      })),
      metricsVersion: combat?.version ?? null,
      combat: combat?.combat ?? null,
      players: combat?.players ?? [],
      runWon: !!room.runWon,                           // loot offered/claimed now lives in loot_offer/loot_claim
    });
    if (to === "lost" || room.runWon) telem(room, "run_end", { result: room.runWon ? "won" : "lost" });
  }
  if (to === "playing") {
    room._combatStart = room.tick;
    const start = combatMetricsStart(room);
    if (start) telem(room, "combat_start", start);
  }
}

// UI INTERACTION TELEMETRY (owner 2026-07-18): record semantic choices, never raw pointer
// coordinates, typed labels, or DOM text. This is deliberately a closed vocabulary so a client
// cannot turn telemetry.jsonl into an arbitrary-data sink. Command events are attempts (including
// refused taps); local events cover navigation that never otherwise reaches the server.
const UI_INTERACTIONS = new Set([
  "screen/view_draft", "screen/view_setup", "screen/view_won",
  "navigation/rooms_tab", "navigation/backpack_tab",
  "panel/deck_open", "panel/deck_close", "panel/level_open", "panel/level_close", "panel/setup_reopen",
  "economy/melt_arm", "economy/melt_cancel", "economy/melt_confirm",
  "draft/choose_body", "draft/begin_run", "draft/restart_run",
  "rooms/advance", "rooms/lock", "rooms/unlock", "rooms/back", "rooms/descend",
  "combat/begin", "combat/play_card", "combat/target_foe", "combat/target_ally",
  "combat/cycle_target", "combat/change_lane", "combat/change_depth", "combat/auto_toggle",
  "combat/summon_side", "combat/echo_arm", "combat/clock_cycle", "combat/plan_on", "combat/plan_off",
  "combat/plan_queue", "combat/plan_reorder", "combat/plan_clear",
  "loot/claim", "build/deck_add", "build/deck_remove", "build/body_swap", "build/level_up",
  "build/level_allocate", "build/drop_item", "squad/change_size", "squad/possess",
  "squad/give_item", "squad/move_item", "squad/swap_item", "trade/propose", "trade/accept",
  "trade/decline",
]);
const COMMAND_INTERACTIONS = Object.freeze({
  beginRun: ["draft", "begin_run"], restartRun: ["draft", "restart_run"],
  draftPick: ["draft", "choose_body"],
  advance: ["rooms", "advance"], lockRoom: ["rooms", "lock"], unlockRoom: ["rooms", "unlock"],
  backToRooms: ["rooms", "back"], descend: ["rooms", "descend"],
  playCard: ["combat", "play_card"], use: ["combat", "play_card"],
  target: ["combat", "target_foe"], allyTarget: ["combat", "target_ally"],
  cycleTarget: ["combat", "cycle_target"], lane: ["combat", "change_lane"],
  move: ["combat", "change_depth"], autoFire: ["combat", "auto_toggle"],
  summonSide: ["combat", "summon_side"], echoArm: ["combat", "echo_arm"],
  setClock: ["combat", "clock_cycle"],
  queueCard: ["combat", "plan_queue"], moveQueuedCard: ["combat", "plan_reorder"],
  clearCardQueue: ["combat", "plan_clear"],
  claimLoot: ["loot", "claim"], moveToDeck: ["build", "deck_add"],
  moveToBackpack: ["build", "deck_remove"], swapBody: ["build", "body_swap"],
  levelUp: ["build", "level_up"], allocateLevel: ["build", "level_allocate"],
  dropItem: ["build", "drop_item"], convertBag: ["economy", "melt_confirm"],
  setBodies: ["squad", "change_size"], setPartySize: ["squad", "change_size"],
  possess: ["squad", "possess"],
  giveItem: ["squad", "give_item"], moveItem: ["squad", "move_item"],
  swapItem: ["squad", "swap_item"], proposeTrade: ["trade", "propose"],
  acceptTrade: ["trade", "accept"], declineTrade: ["trade", "decline"],
});
export function telemUiInteraction(room, player, surface, action, origin = "client", seat = player?.id) {
  if (!room || !player || !UI_INTERACTIONS.has(`${surface}/${action}`)) return false;
  telem(room, "ui_interaction", {
    seat, body: player.bodyKey ?? null, bot: false, pilotedBot: !!player.bot, phase: room.phase,
    surface, action, origin: origin === "command" ? "command_attempt" : "local",
  });
  return true;
}
export function telemCommandInteraction(room, player, type, seat = player?.id) {
  let pair = COMMAND_INTERACTIONS[type];
  if (type === "start") pair = room?.phase === "setup" ? ["combat", "begin"] : ["draft", "restart_run"];
  return pair ? telemUiInteraction(room, player, pair[0], pair[1], "command", seat) : false;
}

// A late join or post-create squad resize can add private offers while the room is ALREADY in the
// draft phase, so there is no phase transition/run_start to record them. Emit only the new slice;
// telemetry-report treats draft_offer exactly like the initial run_start wheel.
export function telemDraftOffersAdded(room, beforeIds) {
  const added = (room.draftWheel ?? []).filter((b) => !beforeIds.has(b.id));
  if (!added.length) return;
  telem(room, "draft_offer", {
    wheel: added.map((b) => ({ body: b.bodyKey, items: b.items, offeredTo: b.offeredTo })),
  });
}

function growDraftWheelTracked(room) {
  const before = new Set((room.draftWheel ?? []).map((b) => b.id));
  growDraftWheel(room);
  telemDraftOffersAdded(room, before);
}

// A draft started from a WebSocket action can happen before the room's first interval tick. Route
// that transition through the same phase seam synchronously so the initial wheel/run_start offer is
// never lost, then align the tick observer to prevent a duplicate on the next broadcast.
export function startTrackedDraft(room) {
  const from = room.phase;
  startDraft(room);
  if (room.phase !== from) onPhaseChange(room, from, room.phase);
  room._telePhase = room.phase;
}

// One server tick: advance the sim, fire phase-seam side-effects (telemetry + combat-log
// persistence) on any transition, then broadcast. Exported so a harness can drive a real room
// through real combats and exercise the EXACT persistence path (see _combatlogproof.mjs), instead
// of re-implementing the loop. The on-LOSS combat-log dump now lives in onPhaseChange→persistCombat
// (which fires for WINS too, every floor, exactly once per combat).
export function serverTick(room) {
  room._telePhase ??= room.phase;
  if (!room.devPaused && clockAllowsSimulation(room)) simulateTick(room);
  if (room.phase !== room._telePhase) { onPhaseChange(room, room._telePhase, room.phase); room._telePhase = room.phase; }
  runPersistence.schedule();
  broadcastState(room);
}

function ensureTicking(room) {
  room._restoredDormant = false;
  if (!room.handle) room.handle = setInterval(() => serverTick(room), TICK_MS);
}

function maybeStopRoom(room) {
  if (room.players.size === 0) {
    if (room.handle) clearInterval(room.handle);
    rooms.delete(room.code);
    runPersistence.schedule();
  }
}

// Mid-run a dropped socket HOLDS its seat (phones lock, tabs refresh) — the room keeps ticking.
// But a room where every seat is socketless gets a grace window, then is reaped, so an
// abandoned run doesn't tick forever.
const REAP_MS = envInt("KM_REAP_MS", 5 * 60_000, 250, 60 * 60_000);
function maybeReapRoom(room) {
  if (room.reapTimer || [...room.players.values()].some((p) => p.ws)) return;
  room.reapTimer = setTimeout(() => {
    room.reapTimer = null;
    if ([...room.players.values()].some((p) => p.ws)) return; // someone made it back
    if (room.handle) clearInterval(room.handle);
    rooms.delete(room.code);
    runPersistence.schedule();
  }, REAP_MS);
}
function cancelReap(room) {
  if (room.reapTimer) { clearTimeout(room.reapTimer); room.reapTimer = null; }
}
const cleanToken = (t) => (typeof t === "string" && t ? t.slice(0, 64) : null);
const ACQUISITION_SOURCES = new Set(["itch"]);
// Closed vocabulary: storefront attribution is useful, arbitrary referral strings are not.
export const cleanAcquisitionSource = (value) =>
  typeof value === "string" && ACQUISITION_SOURCES.has(value.toLowerCase()) ? value.toLowerCase() : null;
const PLAYER_NAME_MAX = 14;
const PLAYER_NAME_SEGMENTS = new Intl.Segmenter("und", { granularity: "grapheme" });
// Names cross the public WebSocket boundary, so the server owns their canonical shape. Keep
// punctuation and Unicode graphemes (the renderer escapes markup), but discard terminal/control
// characters, surrounding whitespace, and pathological length. An empty/non-string name gets the
// same established default as the engine.
export function cleanPlayerName(value) {
  if (typeof value !== "string") return "Adventurer";
  const stripped = value.replace(/[\u0000-\u001f\u007f-\u009f]/gu, "").trim();
  if (!stripped) return "Adventurer";
  const capped = [...PLAYER_NAME_SEGMENTS.segment(stripped)]
    .slice(0, PLAYER_NAME_MAX)
    .map((part) => part.segment)
    .join("");
  return capped || "Adventurer";
}

// A seat just went absent (left or its socket dropped) — re-fire every "all seats must X" gate so
// the departure itself can satisfy it. Each resolver no-ops off its own phase, so this is safe to
// call in any phase. (owner 2026-07-09: an empty human seat must never strand the party.)
function reflowGates(room) {
  maybeFinishDraft(room);       // draft phase: don't wait on a seat that's no longer here
  maybeResolveRoomVote(room);   // won screen: re-tally now that a non-voter is gone
}

// Fully REMOVE a seat (a deliberate leave, or a pre-run/tokenless socket close): drop the seat +
// its squad bots, reflow the gates, shrink the lobby preview, and reap the room if it's now empty.
// Unlike a mid-run token-hold (which keeps the seat, flagged `gone`, for reconnect), this erases it.
function dropSeat(room, id) {
  room.players.delete(id);
  // …and take this seat's squad bots with it — orphaned bots would keep the room non-empty forever.
  for (const [bid, b] of [...room.players]) if (b.bot && b.owner === id) room.players.delete(bid);
  growDraftWheel(room);   // draft phase: prune the departed seat's private offers immediately
  syncLobbyLanes(room);   // out of a run, the board preview shrinks with the party (no-op mid-run)
  reflowGates(room);      // a leaver shouldn't strand the rest at the draft/vote gate
  maybeStopRoom(room);
}

// PARTY MODE: bring a host seat to 1–4 bodies = its full-deck main + 0–3 three-card companions.
// The visible mode is off at 1 and selectable from 2–4. Pre-run only; everything
// downstream (lanes, caravan, draft wheel) already scales off room.players.size, so adding
// bot entities is all it takes to "play as N players". Adds or trims bots to hit the count.
const requestedPartySize = (size) => Math.max(1, Math.min(4, (size | 0) || 1));
function spawnParty(room, host, size) {
  if (room.level) return false;
  const bots = [...room.players.values()].filter((q) => q.bot && q.owner === host.id);
  const otherBodies = room.players.size - bots.length - 1;
  const available = Math.max(1, DRAFT_MAX_PLAYERS - otherBodies);
  const n = requestedPartySize(size);
  if (n > available) return false;   // never silently truncate a player's selected squad size
  let seq = bots.length;
  while (bots.length < n - 1)
    bots.push(addPlayer(room, `${host.id}-b${++seq}`, `Companion ${bots.length + 1}`, {
      bot: true, owner: host.id, partyRole: "companion",
    }));
  while (bots.length > n - 1) room.players.delete(bots.pop().id);
  host.partyRole = n > 1 ? "main" : "solo";
  for (const bot of bots) bot.partyRole = "companion";
  growDraftWheelTracked(room);   // Party size can change while the no-lobby draft is already open
  maybeFinishDraft(room);        // shrinking away the last undrafted companion may complete the draft
  syncLobbyLanes(room);
  return true;
}

// ---------------------------------------------------------------------------
// Static file serving + WS upgrade
// ---------------------------------------------------------------------------
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png",
};
const PUBLIC = join(import.meta.dir, "public");

function serveStatic(path) {
  const file = path === "/" ? "/index.html" : path;
  try {
    const body = readFileSync(join(PUBLIC, file));
    return new Response(body, { headers: {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store", // dev: always serve fresh assets so iteration isn't fought by stale browser cache
    } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

// LIVE demo snapshot (owner 2026-06-25): the screenshot tool (?demo=cardcombat → /demosnap) renders
// a REAL combat built from game.js, so the shots can never go stale the way the hand-maintained
// client fixtures did (the root cause of the "massively outdated screenshot" report). Piloted body
// is id "me" (the client sets you="me"). One representative scene for now.
function buildDemoSnap(scene) {
  const r = newRoom("DEMO");
  r.floor = 2; r.god = false; r.phase = "playing"; r.boss = null;
  const me = addPlayer(r, "me", "Hero");
  wearBody(me, "frugal");                                    // Fat Cat — summons rats (exercises the summon toggle + rat layout)
  me.lane = 0; me.depth = 0; me.counters = 2;               // a +2 generic ramp → shows the 🗡🎯 badge
  me.deckList = ["oSword", "oFire", "oHoly", "oHatchet", "oBow", "oLightning", "dShield", "oArcane", "oSpear", "oJavelin", "dStoneskin"];
  me.backpack = [...me.deckList];
  // a DETERMINISTIC board for the shot: a 3-card hand spanning all three kinds, a 7-card draw pile,
  // and one lasting card already in play — so the deck panel shows bright (drawable) + grey (hand/in-play).
  me.hand   = mintCards(["oSword", "oFire", "oHoly"]);       // 🗡 melee · 🎯 ranged · untyped
  me.deck   = mintCards(["oHatchet", "oBow", "oLightning", "dShield", "oArcane", "oSpear", "oJavelin"]);
  me.inPlay = mintCards(["dStoneskin"]);
  me.cards  = [...me.hand, ...me.deck, ...me.inPlay]; me.moxie = 5;
  const f1 = spawnEnemy("bloodfund", ["oSword", "oSpear"]); f1.side = "foe"; f1.lane = 0; f1.depth = 0; f1.counters = 2;
  const f2 = spawnEnemy("discountDuel", ["oBow"]);          f2.side = "foe"; f2.lane = 0; f2.depth = 1;
  const f3 = spawnEnemy("leverage", ["oArcane", "oFire"]);  f3.side = "foe"; f3.lane = 1; f3.depth = 0;
  r.laneCount = 2; r.lanes = [[f1, f2], [f3]];
  r.allies = [[], []];
  // a MERGED hero rat-stack in lane 0 so the demo exercises the player-sized "N rats" summon (owner 2026-06-27)
  summonBodies(r, { side: "hero", lane: 0, depth: 1 }, { do: "summon", body: "rat", count: 4, lane: 0 });
  me.targetId = f1.id;
  for (const k of ["rentier", "bloodfund", "discountDuel", "leverage", "juggernaut"]) r.unlockedBodies.add(k);
  // COMBAT-LOG demo (owner 2026-06-25): scene "lost" forces the loss screen + a hand-built log so the
  // screenshot tool can prove the Combat Log panel renders, scrolls, and is color-coded.
  if (scene === "lost") {
    r.phase = "lost";
    r.combatLog = [
      "— Combat begins (Floor 2) —",
      "▶ Fat Cat plays Sword",
      "  → 3 to Market-Crash Minotaur (from Fat Cat)",
      "↳ Market-Crash Minotaur casts Spear",
      "  ✖ 4 to Fat Cat",
      "  ✦ Fat Cat summons 1× Rat",
      "▶ Fat Cat plays Holy Light",
      "  ✦ Fat Cat heals 3",
      "↳ Market-Crash Minotaur casts Bow",
      "  ✖ 2 to Fat Cat",
      "  ✦ Market-Crash Minotaur +1 dmg",
      "▶ Fat Cat plays Fireball",
      "  → 5 to Market-Crash Minotaur (from Fat Cat)",
      "  ☠ Market-Crash Minotaur falls",
      "↳ Loan Shark casts Spear",
      "  ✖ 6 to Fat Cat",
      "  ☠ Fat Cat goes DOWN",
      "↳ Loan Shark casts Lightning",
      "  ⛺ Caravan −5 → 8/20",
      "↳ Loan Shark casts Lightning",
      "  ⛺ Caravan −5 → 3/20",
      "↳ Loan Shark casts Spear",
      "  ⛺ Caravan −5 → 0/20",
      "═══ THE CARAVAN FALLS ═══",
    ];
  }
  return snapshot(r);
}

function startServer() {
const restoredRoomCount = restoreRoomsBeforeServe();
const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/health") return Response.json({ ok: true });
    if (url.pathname === "/knowledge.json") return Response.json(knowledgeCatalog(), {
      headers: { "cache-control": "no-store" },
    });
    if (url.pathname === "/demosnap") {
      try { return Response.json(buildDemoSnap(url.searchParams.get("scene"))); }
      catch (e) { return Response.json({ error: String((e && e.stack) || e) }, { status: 500 }); }
    }
    if (url.pathname === "/ws") {
      if (!browserOriginAllowed(req)) return new Response("WebSocket origin not allowed", { status: 403 });
      const ok = server.upgrade(req, { data: {
        id: nextId++, roomCode: null, messageWindowStart: Date.now(), messageCount: 0,
      } });
      return ok ? undefined : new Response("Upgrade failed", { status: 400 });
    }
    return serveStatic(url.pathname);
  },
  websocket: {
    maxPayloadLength: MAX_INBOUND_MESSAGE_BYTES,
    open() {},
    message(ws, raw) {
      if (!messageRateAllowed(ws)) {
        rejectSocket(ws, `Message rate exceeded (${MESSAGE_LIMIT} per ${MESSAGE_WINDOW_MS}ms)`, 1008);
        return;
      }
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      const room = ws.data.roomCode ? rooms.get(ws.data.roomCode) : null;
      // SQUAD possession: a seat can pilot any body it owns. `activeId` is the body its inputs
      // drive right now (its own primary by default); every player-action below routes to it,
      // so "I click a body, then I AM that body" needs no per-message body field.
      const actorId = (room && ws.data.activeId && room.players.has(ws.data.activeId)) ? ws.data.activeId : ws.data.id;
      if (room && msg.type !== "uiEvent")
        telemCommandInteraction(room, room.players.get(actorId), msg.type, ws.data.id);
      // SQUAD LOADOUT BOARD: messages carrying an explicit `from` act on ANY body THIS seat owns
      // (not just the piloted one), so the board can move/swap/drop/offer across the whole squad on
      // one screen. Falls back to the active body. Never resolves a body another seat owns.
      const seatBody = (id) => {
        const b = id != null && room ? room.players.get(id) : null;
        if (b && (b.owner ?? b.id) === ws.data.id) return b;
        return room ? room.players.get(actorId) : null;
      };
      if (room && QUEUE_CANCEL_INPUTS.has(msg.type)) {
        const actor = room.players.get(actorId);
        const planned = Array.isArray(actor?.cardQueue) && actor.cardQueue.some((entry) => entry.planned);
        if (!planned) cancelQueuedCard(room, actor, "input"); // deliberate sequences survive movement/aim/body switching
      }

      switch (msg.type) {
        case "uiEvent": {
          const p = room?.players.get(actorId);
          telemUiInteraction(room, p, msg.surface, msg.action, "client", ws.data.id);
          break;
        }
        case "create": {
          if (ws.data.roomCode) {
            rejectSocket(ws, `Already in room ${ws.data.roomCode} — leave before creating or joining another.`);
            break;
          }
          const ownerLab = ownerLabAuthorized(msg.ownerLabKey);
          let code;
          if (ownerLab) {
            code = nextOwnerLabRoomCode();
            if (!code) { rejectSocket(ws, "Server is at active-room capacity. Try again later."); break; }
          } else {
            code = (msg.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
            if (code) {
              if (rooms.has(code)) {
                ws.send(JSON.stringify({ type: "error", message: "That room name is taken — pick another or leave it blank." }));
                return;
              }
            } else {
              code = makeRoomCode();
            }
          }
          if (rooms.size >= MAX_ACTIVE_ROOMS) {
            rejectSocket(ws, `Server is at active-room capacity (${MAX_ACTIVE_ROOMS}). Try again later.`);
            break;
          }
          const r = newRoom(code);
          r.ownerLab = ownerLab;
          r.dev = SCENARIO_MODE && !!msg.dev;
          r.telemOff = !!msg.nt;   // test harnesses create with nt:true — bot runs never pollute pick-rate data
          r.harness = !!msg.harness;   // TAG (not suppress): ?harness=1 → this run's telemetry is flagged harness:true
          r.acquisitionSource = ownerLab ? OWNER_LAB_SOURCE : cleanAcquisitionSource(msg.source);
          rooms.set(code, r);
          ws.data.roomCode = code;
          ws.data.id = `p${nextId++}`;
          const p = addPlayer(r, ws.data.id, cleanPlayerName(msg.name));
          p.ws = ws;
          p.token = cleanToken(msg.token);
          p._compactSnapshots = msg.compactSnapshots === true;
          // SQUAD: one human can hold several player-entities (bodies). The first is the
          // piloted body; the rest spawn as bots (auto-draft + fight on AUTO). The room then
          // treats the seat as `bodies` players for lanes/caravan/draft — all of which already
          // key off players.size. Live count is adjustable pre-run via {type:"setBodies"}.
          spawnParty(r, p, msg.partySize ?? msg.bodies);
          // owner 2026-06-19: rooms open STRAIGHT into the draft — no lobby staging board.
          // (god/DEMO rooms keep the old start-button path for playtesting.)
          if (!r.god) startTrackedDraft(r);
          ensureTicking(r);
          ws.send(JSON.stringify({ type: "joined", code, you: p.id }));
          break;
        }
        case "join": {
          if (ws.data.roomCode) {
            rejectSocket(ws, `Already in room ${ws.data.roomCode} — leave before creating or joining another.`);
            break;
          }
          const r = rooms.get((msg.code || "").toUpperCase());
          if (!r) { ws.send(JSON.stringify({ type: "error", message: "No such room" })); return; }
          // RECONNECT: a token matching a seated player reclaims that seat (phone lock,
          // refresh, Wi-Fi blip). The newest socket wins; any stale one is closed.
          const tok = cleanToken(msg.token);
          const seat = tok ? [...r.players.values()].find((q) => q.token === tok) : null;
          if (seat) {
            const restoredDormant = !!r._restoredDormant;
            cancelReap(r);
            if (SCENARIO_MODE && msg.dev) r.dev = true;
            if (msg.harness) r.harness = true;
            const stale = seat.ws;
            seat.ws = ws;
            seat.gone = false;   // reclaimed → present again; it counts at the all-seats gates once more
            seat._compactSnapshots = msg.compactSnapshots === true;
            seat._needFullSnap = true;
            seat._needStaticSnap = true;
            ws.data.roomCode = r.code;
            ws.data.id = seat.id;
            if (stale && stale !== ws) { try { stale.close(); } catch {} }
            ws.send(JSON.stringify({ type: "joined", code: r.code, you: seat.id }));
            // A restored run has intentionally not ticked yet. Send its first full state before
            // resuming the scheduler so reconnect observes the exact durable checkpoint.
            if (restoredDormant) broadcastState(r);
            ensureTicking(r);
            break;
          }
          const humanSeats = [...r.players.values()].filter((player) => !player.bot).length;
          if (humanSeats >= MAX_HUMAN_SEATS) {
            rejectSocket(ws, `Room is full (${MAX_HUMAN_SEATS} human seat${MAX_HUMAN_SEATS === 1 ? "" : "s"} max).`);
            break;
          }
          if (r.players.size >= DRAFT_MAX_PLAYERS) {
            rejectSocket(ws, `Room is full (${DRAFT_MAX_PLAYERS} draftable bodies max).`);
            break;
          }
          const joinBodies = requestedPartySize(msg.partySize ?? msg.bodies);
          if (r.players.size + joinBodies > DRAFT_MAX_PLAYERS) {
            rejectSocket(ws, `That party would exceed this room's ${DRAFT_MAX_PLAYERS}-body limit.`);
            break;
          }
          cancelReap(r);
          if (SCENARIO_MODE && msg.dev) r.dev = true;
          if (msg.harness) r.harness = true;   // a harness-flagged socket flags the whole run (never un-flags)
          ws.data.roomCode = r.code;
          ws.data.id = `p${nextId++}`;
          const p = addPlayer(r, ws.data.id, cleanPlayerName(msg.name));
          p.ws = ws;
          p.token = tok;
          p._compactSnapshots = msg.compactSnapshots === true;
          spawnParty(r, p, joinBodies);
          // CO-OP JOIN (owner 2026-06-24): the host may have solo-drafted and auto-started the run
          // before this socket landed (no-lobby flow) — which used to strand the joiner with no
          // body/kit pick, lanes locked at the host-only count, and both bodies stacked in lane 0.
          // Pull the room BACK to the draft (in any pre-combat staging phase) so the newcomer drafts
          // and the lanes + caravan re-derive for the bigger party; a still-open draft just grows the
          // wheel. A LIVE fight returns false (lanes are locked) — they fold in at the next room.
          const offersBeforeJoin = new Set((r.draftWheel ?? []).map((b) => b.id));
          reopenDraftForJoin(r);
          telemDraftOffersAdded(r, offersBeforeJoin);
          ensureTicking(r);
          ws.send(JSON.stringify({ type: "joined", code: r.code, you: p.id }));
          break;
        }
        case "start":
          if (!room) break;
          if (room.phase === "setup") {
            const from = room.phase;
            beginCombat(room);
            onPhaseChange(room, from, room.phase);   // emit combat_start before a fast follow-up play can end the fight
            room._telePhase = room.phase;            // the next interval must not duplicate the synchronous seam
          }
          // mid-flow phases advance through their own actions (draftPick / advance / room votes),
          // never through `start` — guard them so a stray START can't blow away a live run.
          // Exception: a COMPLETE run (the King fell — runWon) restarts from the victory screen.
          else if (room.phase === "draft" || room.phase === "playing" || (room.phase === "won" && !room.runWon)) break;
          else if (room.god) startLevel(room);   // god mode skips the draft
          else startTrackedDraft(room);           // lobby / lost / throne-won → draft a fresh run
          break;
        case "beginRun":   // CO-OP (owner 2026-07-06): the explicit ▶ once the whole party has drafted
          if (room) beginRun(room);
          break;
        case "restartRun": {  // owner 2026-07-06 (stuck co-op room): hard reset to a FRESH draft, all seats kept
          if (!room) break;
          startTrackedDraft(room);
          telem(room, "restart_run", { by: ws.data.id });
          break;
        }
        case "leave": {   // owner 2026-07-09: LEAVE in ANY phase — drop this seat server-side so a
          // departing player never strands the party at an all-seats gate. Removes the seat + its
          // squad bots, reflows the gates, and detaches this socket (a stray later message can't
          // touch the room). The client returns itself to the create/join screen.
          if (!room) break;
          dropSeat(room, ws.data.id);
          ws.data.roomCode = null;
          ws.data.activeId = null;
          ws.send(JSON.stringify({ type: "left" }));
          break;
        }
        case "snapFull": {    // DELTA RECOVERY: this socket hit a seq gap / apply failure — re-keyframe it
          const p = room?.players.get(ws.data.id);   // the SEAT owns the socket (possession is irrelevant here)
          if (p) {
            p._needFullSnap = true;
            if (msg.static !== false) p._needStaticSnap = true;
          }
          break;
        }
        case "setClock": {
          // ROOM CLOCK belongs to the human SEAT, never the currently possessed squad body. Each
          // seat owns one request and the shared engine uses the slowest present human's divisor.
          const seat = room?.players.get(ws.data.id);
          const effective = setPlayerClockDivisor(room, seat, msg.divisor);
          if (effective == null) { rejectSocket(ws, "Clock speed must be 1×, ½×, or ¼×."); break; }
          telem(room, "clock_change", {
            by: seat.id, requested: seat.clockDivisor, effective,
          });
          break;
        }
        case "setBodies":     // compatibility alias for pre-Party-Mode clients
        case "setPartySize": {
          const host = room?.players.get(ws.data.id);   // the SEAT owns the squad, not the active body
          if (host && !spawnParty(room, host, msg.n ?? msg.partySize))
            rejectSocket(ws, `That party would exceed this room's ${DRAFT_MAX_PLAYERS}-body limit.`);
          break;
        }
        case "possess": {     // SQUAD: click a body you own → become it. Your inputs route here
          if (!room) break;   // (actorId follows activeId); the body you left resumes AUTO.
          const target = room.players.get(msg.id);
          if (!target || (target.owner ?? target.id) !== ws.data.id) break;  // only bodies THIS seat owns
          ws.data.activeId = target.id;
          // Un-piloted bodies always fight on AUTO (never idle); the piloted body restores ITS OWN
          // remembered mode (manualPref) — so re-selecting a body never wipes the AUTO/manual you
          // chose for it (owner bug 2026-06-18: "auto flips back to manual" was forcing manual here).
          for (const q of room.players.values())
            if ((q.owner ?? q.id) === ws.data.id) q.autoFire = q.id === target.id ? !q.manualPref : true;
          break;
        }
        // (stockAdd / stockRemove / stockBegin / upAnte routes DELETED, owner-approved 2026-07-19 —
        //  the stock phase never occurs live; an old client still sending one hits the silent
        //  unknown-message fallthrough, exactly like any other retired verb.)
        case "summonSide": {                       // where YOUR summons enter the lane line
          const p = room?.players.get(actorId);
          if (p && (msg.side === "front" || msg.side === "back")) p.summonSide = msg.side;
          break;
        }
        case "autoFire": {  // sticky fire-mode preference: AUTO fires ready damaging items itself
          const p = room && room.players.get(actorId);
          if (p) { p.autoFire = !!msg.on; p.manualPref = !msg.on; }  // remember the choice so possess restores it
          break;
        }
        case "echoArm": {   // the echo body's button: full bar → player chooses to arm the double
          if (room) armEcho(room, room.players.get(actorId));
          break;
        }
        case "passiveChoice": {
          const p = room?.players.get(actorId);
          if (p) chooseSphinxPassive(room, p, typeof msg.choice === "string" ? msg.choice : null);
          break;
        }
        case "descend":    if (room) descend(room); break;
        case "claimLoot": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) {
            const had = p.backpack?.length ?? 0;
            claimLoot(room, p, msg.key);
            // attributed since 2026-07-02 (bid points): WHO claimed, which SEAT paid, what's left
            if ((p.backpack?.length ?? 0) > had) {
              const seat = seatOf(room, p);
              telem(room, "loot_claim", { key: msg.key, by: actorId, seat: seat.id, bot: !!p.bot, left: seat.bidPoints ?? null });
            }
          }
          break;
        }
        case "dropItem": {
          if (!room) break;
          const p = seatBody(msg.from);            // board can drop from any of the seat's bodies
          if (p) dropItem(room, p, msg.key);
          break;
        }
        case "giveItem": {                          // SQUAD: hand an item to your OWN other body — instant
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) giveOwnItem(room, p, msg.to, msg.key,
            typeof msg.fromDeck === "boolean" ? msg.fromDeck : null);
          break;
        }
        case "moveItem": {                          // SQUAD loadout board: move an item between two of YOUR bodies
          if (!room) break;
          const from = seatBody(msg.from);
          if (from) giveOwnItem(room, from, msg.to, msg.key,
            typeof msg.fromDeck === "boolean" ? msg.fromDeck : null);
          break;
        }
        case "swapItem": {                          // SQUAD loadout board: swap items between two of YOUR bodies
          if (!room) break;
          const from = seatBody(msg.from);
          if (from) swapOwnItems(room, from, msg.to, msg.fromKey, msg.toKey, {
            fromDeck: typeof msg.fromDeck === "boolean" ? msg.fromDeck : null,
            toDeck: typeof msg.toDeck === "boolean" ? msg.toDeck : null,
          });
          break;
        }
        case "proposeTrade": {
          if (!room) break;
          const p = seatBody(msg.from);            // board can offer from any of the seat's bodies
          if (p) proposeTrade(room, p, msg.to, msg.give, msg.want); // offer your item (want:null = gift)
          break;
        }
        case "acceptTrade": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) acceptTrade(room, p, msg.offer);  // the target accepts → swap + settle
          break;
        }
        case "declineTrade": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) declineTrade(room, p, msg.offer);
          break;
        }
        // (the legacy chooseClass shim is DELETED, owner-approved 2026-07-19 — draftPick below is
        //  the one draft route; an old client sending chooseClass falls through as unknown.)
        case "draftPick": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) {
            draftPick(room, p, msg.bundle); // lock a wheel bundle (body + starter cards), exclusive
            if (p.drafted) telem(room, "draft_pick", { seat: p.id, body: p.bodyKey, items: p.backpack ?? [], bot: !!p.bot });
          }
          break;
        }
        case "advance":
          // CO-OP VOTE: `advance` now CASTS this seat's next-room vote (the seat = ws.data.id, the
          // human's primary — one vote per human even when piloting a bot squad body). Solo (1 seat)
          // resolves instantly inside voteRoom, so the screenshot/loop tools that send {advance} still
          // progress; 2+ seats wait for every seat to lockRoom before the tally enters.
          if (room) voteRoom(room, ws.data.id, msg.to);
          break;
        case "lockRoom":   if (room) lockRoom(room, ws.data.id); break;
        case "unlockRoom": if (room) unlockRoom(room, ws.data.id); break;
        case "backToRooms": if (room) returnToRoomOptions(room); break;
        case "lane": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (!p) break;
          const last = (room.laneCount ?? LANES) - 1;
          if (msg.dir === "up") p.lane = Math.max(0, p.lane - 1);
          else if (msg.dir === "down") p.lane = Math.min(last, p.lane + 1);
          else if (typeof msg.lane === "number") p.lane = Math.max(0, Math.min(last, msg.lane));
          break;
        }
        case "move": {   // step forward/back in the lane's depth line (block for allies / drop back)
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) moveDepth(room, p, msg.dir === "back" ? "back" : "fwd");
          break;
        }
        case "playCard": {                          // CARD/MOXIE: play a hand card by instance id
          if (!room) break;
          const p = room.players.get(actorId);
          // `pick` (owner 2026-07-07, PICK CONTRACT): the optional choice for pick-cards — a summon-
          // body option key (Grand Spirit) or a draw-pile card key (Crystal Ball). Only a string is
          // forwarded; the engine validates and falls back (default body / random draw) — never crashes.
          if (p) requestCardPlay(room, p, msg.id, typeof msg.pick === "string" ? msg.pick : null);
          break;
        }
        case "use": {                               // back-compat: fire a hand card by slot index
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) useItem(room, p, msg.slot | 0);
          break;
        }
        case "target": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) setTarget(room, p, msg.foeId ?? null);
          break;
        }
        case "allyTarget": {  // V2 §4.1: the support slot — click an ally to aim heals
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) setAllyTarget(room, p, msg.playerId ?? null);
          break;
        }
        case "cycleTarget": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) cycleTarget(room, p, msg.dir === -1 ? -1 : 1);
          break;
        }
        case "swapBody": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) {
            const was = p.bodyKey;
            const allocation = msg.allocation && typeof msg.allocation === "object"
              ? { hp: msg.allocation.hp, melee: msg.allocation.melee, ranged: msg.allocation.ranged,
                  mastery: msg.allocation.mastery, specialty: msg.allocation.specialty }
              : (typeof msg.dmgType === "string" ? msg.dmgType : null);
            swapBody(room, p, msg.to ?? null, msg.pay ?? [], allocation); // atomic body + adoption tender + conserved level-bonus split
            if (p.bodyKey !== was) telem(room, "body_swap", { from: was, to: p.bodyKey, dmgType: p.levelPick, allocation: p.levelAllocation ?? null });
          }
          break;
        }
        // buyUnlock / buyKitSlot are RETIRED (owner 2026-06-24: gold is gone — felled bodies are free
        // to wear, backpacks have no slot cap). The handlers no-op so an old client can't crash the room.
        case "buyUnlock": break;
        case "buyKitSlot": break;
        // DECK EDITOR (owner 2026-06-24): move a card between the backpack and the combat deck.
        case "moveToDeck": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p && moveToDeck(room, p, msg.key)) telem(room, "deck_edit", { seat: p.id, action: "add", key: msg.key, deck: [...(p.deckList ?? [])], bot: !!p.bot });
          break;
        }
        case "moveToBackpack": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p && moveToBackpack(room, p, msg.key)) telem(room, "deck_edit", { seat: p.id, action: "remove", key: msg.key, deck: [...(p.deckList ?? [])], bot: !!p.bot });
          break;
        }
        // PLAYER LEVEL-UP (owner 2026-06-29): spend the cards the player CHOSE (msg.pay) to raise their
        // RUN-WIDE level one step (carries across bodies), paid through the client's tender picker.
        case "levelUp": {
          if (!room) break;
          const p = room.players.get(actorId);
          const allocation = msg.allocation && typeof msg.allocation === "object" ? msg.allocation
            : (typeof msg.dmgType === "string" ? msg.dmgType : null);
          if (p && levelUp(room, p, msg.pay ?? [], allocation)) telem(room, "level_up", { seat: p.id, body: p.bodyKey, level: p.level, allocation: p.levelAllocation, pay: msg.pay ?? [], deck: [...(p.deckList ?? [])], bot: !!p.bot });
          break;
        }
        case "queueCard": {                         // SQUAD COMMAND: append/toggle one exact hand card
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) enqueueCardPlay(room, p, msg.id, typeof msg.pick === "string" ? msg.pick : null);
          break;
        }
        case "moveQueuedCard": {                    // reorder the active body's strict cast plan
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) moveQueuedCard(room, p, msg.from, msg.to);
          break;
        }
        case "clearCardQueue": {
          if (room) cancelQueuedCard(room, room.players.get(actorId), "clear");
          break;
        }
        case "allocateLevel": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p && allocateLevel(room, p, msg.allocation)) telem(room, "level_allocate", {
            seat: p.id, body: p.bodyKey, level: p.level, allocation: p.levelAllocation, bot: !!p.bot,
          });
          break;
        }
        case "convertBag": {  // owner 2026-07-06: melt ALL spare bag cards → banked ◈ (client confirms first)
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) {
            const v = convertBackpack(room, p);
            if (v > 0) telem(room, "convert_bag", {
              body: p.bodyKey, value: v, treasure: partyMain(room, p)?.treasure ?? 0,
            });
          }
          break;
        }
        // SCENARIO INJECTION (dev capture tool, 2026-07-11): boot THIS room from a JSON spec so a
        // hard-to-reach state can be screenshotted in the REAL game (tools/scenario-shot.mjs). The
        // hook EXISTS only under KM_SCENARIO=1 — without the env every message is refused untouched.
        // applyScenario (engine/lobby.js) validates every key against the real content tables and
        // throws on unknowns; a rejected spec mutates nothing and the error is sent back verbatim.
        case "scenario": {
          if (!SCENARIO_MODE) { ws.send(JSON.stringify({ type: "error", message: "scenario mode is disabled (server not started with KM_SCENARIO=1)" })); break; }
          if (!room) break;
          try {
            applyScenario(room, msg.spec);
            console.log(`SCENARIO applied → "${room.scenario}" (room ${room.code}, phase ${room.phase}, ${room.lanes.flat().length} foes)`);
          } catch (e) {
            const why = String(e?.message ?? e);
            ws.send(JSON.stringify({ type: "error", message: "scenario rejected: " + why }));
            console.error(`SCENARIO rejected (room ${room.code}):`, why);
          }
          break;
        }
        // LIVE DEV CONTROLS: deliberately small mutations for moment-to-moment testing. Complex
        // starting states go through the validated scenario contract above. Both require the same
        // server env gate; a live public process has no reachable mutation surface.
        case "devAction": {
          if (!SCENARIO_MODE || !room?.dev) {
            ws.send(JSON.stringify({ type: "error", message: "developer lab is disabled (start with KM_SCENARIO=1 and open ?dev=1)" }));
            break;
          }
          const p = room.players.get(actorId);
          switch (msg.action) {
            case "heal": if (p) { p.alive = true; p.hp = p.maxHp; } break;
            case "moxie": if (p) p.moxie = MOXIE_CAP; break;
            case "treasure": if (p) p.treasure = (p.treasure ?? 0) + 10; break;
            case "invincible": if (p) { p.alive = true; p.maxHp = Math.max(999, p.maxHp ?? 0); p.hp = p.maxHp; } break;
            case "unlock":
              for (const key of Object.keys(BODIES)) { room.unlockedBodies.add(key); (room.adoptedBodies ??= new Set()).add(key); }
              break;
            case "foesOneHp":
              for (const f of room.lanes.flat()) f.hp = Math.min(1, f.hp);
              if (room.boss) room.boss.hp = Math.min(1, room.boss.hp);
              break;
            case "pause": room.devPaused = !room.devPaused; break;
            case "step":
              if (room.devPaused) simulateTick(room);
              break;
            default:
              ws.send(JSON.stringify({ type: "error", message: `unknown developer action ${JSON.stringify(msg.action)}` }));
          }
          break;
        }
      }
    },
    close(ws) {
      const room = ws.data.roomCode ? rooms.get(ws.data.roomCode) : null;
      if (!room) return;
      const seat = room.players.get(ws.data.id);   // close operates on the SEAT, not any possessed body
      if (seat && seat.ws && seat.ws !== ws) return; // stale socket — a reconnect already reclaimed this seat
      if (seat && seat.token && room.level) {
        // Mid-run: HOLD the seat so a phone-lock/refresh can reclaim it by token — but mark it GONE
        // so its now-empty seat is dropped from every all-seats gate (vote/lock/draft) and can't
        // strand the party. Reconnect clears `gone`. (Lobby/draft drops still remove the player —
        // a pre-run leaver shouldn't strand the draft.)
        seat.ws = null;
        seat.gone = true;
        reflowGates(room);      // if this was the last seat the party was waiting on, advance now
        maybeReapRoom(room);
        return;
      }
      dropSeat(room, ws.data.id);   // pre-run / tokenless: remove the seat outright (+ reflow gates)
    },
  },
});
  console.log(`King Mimic running → http://localhost:${server.port}`);
  if (restoredRoomCount) console.log(`[run-persistence] Restored ${restoredRoomCount} active room${restoredRoomCount === 1 ? "" : "s"}.`);
  if (SCENARIO_MODE) console.log("⚠ SCENARIO MODE (KM_SCENARIO=1) — rooms accept {type:\"scenario\"} state injection. Dev capture only; NEVER set this on the live server.");
  let stopping = false;
  const stopGracefully = (signal) => {
    if (stopping) return;
    stopping = true;
    const saved = runPersistence.flushSync({ force: true });
    console.log(`[run-persistence] ${saved ? "Flushed active rooms" : "Flush failed"} on ${signal}.`);
    runPersistence.close();
    for (const room of rooms.values()) {
      if (room.handle) clearInterval(room.handle);
      if (room.reapTimer) clearTimeout(room.reapTimer);
    }
    try { server.stop(true); } catch {}
    process.exit(saved ? 0 : 1);
  };
  process.once("SIGINT", () => stopGracefully("SIGINT"));
  process.once("SIGTERM", () => stopGracefully("SIGTERM"));
  // Windows cannot deliver catchable POSIX signals through Bun Subprocess.kill; an owning process
  // manager can request the exact same graceful path over its private parent/child IPC channel.
  process.on("message", (message) => {
    if (message?.type === "shutdown") stopGracefully("supervisor IPC");
  });
  return server;
}

// Bind the port only when run directly (bun run server.js). Imported as a module — by a test
// harness or the combat-log proof driver — it stays inert, so there's no conflict with the live
// :3000 server and the persistence helpers (serverTick / persistCombat) can be exercised in-process.
if (import.meta.main) startServer();
