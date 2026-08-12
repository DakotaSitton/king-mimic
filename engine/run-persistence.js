// Durable active-run storage. The engine state is a graph (Maps, Sets, and entity references can
// be shared or cyclic), so JSON is deliberately not involved: Bun's node:v8 serializer preserves
// that graph exactly. Only process-local transport/timer/cache handles are detached while encoding.

import {
  closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync,
  unlinkSync, writeFileSync, promises as fsp,
} from "node:fs";
import { basename, join } from "node:path";
import { deserialize, serialize } from "node:v8";
import { migrateSavedLevelAllocation } from "./leveling.js";
import { liveBodyKey } from "./bodies.js";

export const ACTIVE_RUNS_FORMAT = "king-mimic-active-runs";
export const ACTIVE_RUNS_VERSION = 1;
export const ACTIVE_RUNS_FILE = "active-runs.v8";
export const DEFAULT_SAVE_INTERVAL_MS = 5_000;

const ACTIVE_PHASES = new Set(["draft", "setup", "playing", "won", "shop"]);
const CODE_RE = /^[A-Z0-9]{1,8}$/;

export function isPersistableRoom(room) {
  if (!room || typeof room !== "object" || !CODE_RE.test(room.code ?? "")) return false;
  if (room.god || room.harness || room.telemOff || room.dev || room.scenario) return false;
  if (!room._runId || !ACTIVE_PHASES.has(room.phase) || room.runWon || room.phase === "lost") return false;
  if (!(room.players instanceof Map) || room.players.size === 0) return false;
  return [...room.players.values()].some((player) => !player?.bot);
}

function validateRoom(room) {
  if (!isPersistableRoom(room)) throw new Error(`invalid or non-production room ${JSON.stringify(room?.code ?? null)}`);
  if (!(room.unlockedBodies instanceof Set) || !(room.adoptedBodies instanceof Set))
    throw new Error(`room ${room.code} is missing Set-backed body state`);
  if (!Array.isArray(room.lanes) || !Array.isArray(room.allies))
    throw new Error(`room ${room.code} is missing lane arrays`);
  if (room.level != null && (!Array.isArray(room.level.nodes) || typeof room.level.currentId !== "string"))
    throw new Error(`room ${room.code} has an invalid map`);
  for (const [id, player] of room.players) {
    if (typeof id !== "string" || !player || player.id !== id)
      throw new Error(`room ${room.code} has an invalid player map entry`);
  }
  return room;
}

function detachRuntime(room) {
  const roomRuntime = {
    handle: room.handle,
    reapTimer: room.reapTimer,
    lastSnap: room._lastSnap,
  };
  room.handle = null;
  room.reapTimer = null;
  room._lastSnap = undefined;
  const sockets = [];
  for (const player of room.players.values()) {
    sockets.push([player, player.ws]);
    player.ws = null;
  }
  return () => {
    room.handle = roomRuntime.handle;
    room.reapTimer = roomRuntime.reapTimer;
    room._lastSnap = roomRuntime.lastSnap;
    for (const [player, ws] of sockets) player.ws = ws;
  };
}

function encodeRooms(rooms) {
  const selected = [...rooms.values()].filter(isPersistableRoom);
  const restoreRuntime = selected.map(detachRuntime);
  try {
    return { bytes: serialize({
      format: ACTIVE_RUNS_FORMAT,
      version: ACTIVE_RUNS_VERSION,
      savedAt: Date.now(),
      rooms: selected,
    }), count: selected.length };
  } finally {
    for (let index = restoreRuntime.length - 1; index >= 0; index--) restoreRuntime[index]();
  }
}

function decodeRooms(bytes) {
  const envelope = deserialize(bytes);
  if (!envelope || envelope.format !== ACTIVE_RUNS_FORMAT)
    throw new Error(`unrecognized format ${JSON.stringify(envelope?.format ?? null)}`);
  if (envelope.version !== ACTIVE_RUNS_VERSION)
    throw new Error(`unsupported schema version ${JSON.stringify(envelope.version)}`);
  if (!Number.isFinite(envelope.savedAt) || !Array.isArray(envelope.rooms))
    throw new Error("malformed persistence envelope");
  const seen = new Set();
  for (const room of envelope.rooms) {
    validateRoom(room);
    if (seen.has(room.code)) throw new Error(`duplicate room code ${room.code}`);
    seen.add(room.code);
  }
  return envelope.rooms;
}

// LEGACY per-combatant passive-state fields (2026-08-12 body-key rename): saved mid-fight
// combatants can carry the pre-rename Crypto-Chimera rotation clock and Paid Piper pulse bonus
// under their old identifiers; carry the counters across so a restored fight resumes exactly.
const LEGACY_STATE_FIELDS = [
  ["quakeCycle", "chimeraCycle"],
  ["quakeCardClock", "chimeraCardClock"],
  ["hedgePulseBonus", "piperPulseBonus"],
];

function makeRestoredRoomDormant(room) {
  // Save-data migration inside the existing v1 envelope: walk the preserved object graph once so
  // active heroes, foes, and pending room specs (a) shed the retired Basilisk Specialty rank and
  // (b) translate every LEGACY body key (2026-08-12 rename) to its live key — bodyKey/body/homeBody
  // fields cover players, party members, foes, summons, draft bundles, drafted/stocked foe specs,
  // and map-node foe lists — without flattening shared state.
  const seen = new WeakSet();
  const migrate = (value) => {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (typeof value.bodyKey === "string") value.bodyKey = liveBodyKey(value.bodyKey);
    if (typeof value.body === "string") value.body = liveBodyKey(value.body);
    if (typeof value.homeBody === "string") value.homeBody = liveBodyKey(value.homeBody);
    for (const [oldField, newField] of LEGACY_STATE_FIELDS)
      if (oldField in value) {
        if (!(newField in value)) value[newField] = value[oldField];
        delete value[oldField];
      }
    const bodyKey = value.bodyKey ?? value.body;
    if (typeof bodyKey === "string" && value.levelAllocation)
      migrateSavedLevelAllocation(bodyKey, value.levelAllocation);
    if (value instanceof Map) {
      for (const [key, item] of value) { migrate(key); migrate(item); }
    } else if (value instanceof Set) {
      for (const item of value) migrate(item);
    } else if (!(ArrayBuffer.isView(value) || value instanceof ArrayBuffer || value instanceof Date)) {
      for (const key of Reflect.ownKeys(value)) migrate(value[key]);
    }
  };
  migrate(room);
  // Body-key SETS (felled/adopted rosters) hold bare strings, which the field walk above cannot
  // rewrite in place — rebuild them through the same translation.
  for (const setName of ["unlockedBodies", "adoptedBodies"])
    if (room[setName] instanceof Set) room[setName] = new Set([...room[setName]].map(liveBodyKey));
  room.handle = null;
  room.reapTimer = null;
  room._lastSnap = undefined;
  room._restoredDormant = true;
  for (const player of room.players.values()) {
    player.ws = null;
    if (!player.bot) player.gone = true;
    player._needFullSnap = true;
    player._sentSeq = undefined;
  }
  return room;
}

// Inspect graph IDs without flattening the graph. Server startup uses this to advance the existing
// process-global mint counters past restored live IDs before forward simulation can create more.
export function maxNumericIds(values) {
  const maxima = { player: 0, card: 0, foe: 0, node: 0, offer: 0, bundle: 0 };
  const patterns = [
    ["player", /^p(\d+)$/], ["card", /^c(\d+)$/], ["foe", /^f(\d+)$/],
    ["node", /^n(\d+)$/], ["offer", /^of(\d+)$/], ["bundle", /^bndl(\d+)$/],
  ];
  const semanticValueKeys = new Set([
    "id", "targetId", "allyTargetId", "currentId", "fakeOf", "owner", "from", "to",
    "offeredTo", "lockedBundle", "lockedBy", "playerId", "sourceId", "entityId", "cardId",
    "seat", "by",
  ]);
  const record = (value) => {
    if (typeof value === "string") {
      for (const [kind, pattern] of patterns) {
        const match = pattern.exec(value);
        if (match) maxima[kind] = Math.max(maxima[kind], Number(match[1]));
      }
    }
  };
  const seen = new WeakSet();
  const visit = (value, semantic = false) => {
    if (typeof value === "string") { if (semantic) record(value); return; }
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (value instanceof Map) {
      // Persisted maps use semantic ids as keys (players, per-card metrics, exposure trackers).
      for (const [key, item] of value) { record(key); visit(key); visit(item); }
    } else if (value instanceof Set) {
      for (const item of value) visit(item);
    } else if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer || value instanceof Date) {
      return;
    } else {
      for (const key of Reflect.ownKeys(value)) {
        // Plain objects also contain id-keyed lookup tables (votes, locks, metrics). Count the key,
        // and count a string value only when its field is semantically an id/reference.
        record(key);
        visit(value[key], typeof key === "string" && semanticValueKeys.has(key));
      }
    }
  };
  visit(values);
  return maxima;
}

export function createRunPersistence({
  dataDir,
  rooms,
  intervalMs = DEFAULT_SAVE_INTERVAL_MS,
  warn = (message) => console.warn(message),
  // Injectable async I/O (tests substitute a slow/failing disk). Production uses node:fs promises.
  io = {
    writeFile: (path, bytes) => fsp.writeFile(path, bytes),
    fsyncFile: async (path) => { const fh = await fsp.open(path, "r+"); try { await fh.sync(); } finally { await fh.close(); } },
    rename: (from, to) => fsp.rename(from, to),
    unlink: (path) => fsp.unlink(path),
  },
} = {}) {
  if (typeof dataDir !== "string" || !dataDir) throw new TypeError("run persistence requires dataDir");
  if (!(rooms instanceof Map)) throw new TypeError("run persistence requires a rooms Map");
  const file = join(dataDir, ACTIVE_RUNS_FILE);
  const cadence = Math.max(250, Number(intervalMs) || DEFAULT_SAVE_INTERVAL_MS);
  const SLOW_FLUSH_MS = 500;
  let timer = null;
  let dirty = false;
  let lastFlushAt = 0;
  let persistedRoomCount = 0;
  // The write pipeline is asynchronous (the whole point: a stalled data volume must lag SAVES, not
  // gameplay — the event loop this runs on also drives every room's simulation and socket sends).
  // flushSeq/committedSeq order concurrent attempts so a slower older write can never replace a
  // newer committed snapshot; inFlight serializes the async path against itself.
  let flushSeq = 0;
  let committedSeq = 0;
  let inFlight = null;
  let closing = false;
  // Directory + file existence are resolved ONCE here: every later check would be a synchronous
  // metadata syscall against the data volume — the exact blocking class this pipeline removes from
  // the hot path (a stalled mkdir/stat freezes every room's tick just like a stalled write).
  try { mkdirSync(dataDir, { recursive: true }); } catch {}
  let fileKnown = existsSync(file);

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  // Point-in-time capture on the caller's stack: v8.serialize walks the LIVE room graph, so it must
  // not interleave with simulation. Only the write/fsync/rename of the captured bytes is async.
  const encodeNow = () => encodeRooms(rooms);

  const flushSync = ({ force = false } = {}) => {
    clearTimer();
    if (!dirty && !force) return false;
    const seq = ++flushSeq;
    let temp = null;
    try {
      const encoded = encodeNow();
      temp = join(dataDir, `.${basename(file)}.${process.pid}.${seq}.tmp`);
      writeFileSync(temp, encoded.bytes);
      const fd = openSync(temp, "r+");
      try { fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(temp, file); // same-directory replacement: readers see the old or new complete file
      temp = null;
      committedSeq = seq;
      fileKnown = true;
      persistedRoomCount = encoded.count;
      dirty = false;
      lastFlushAt = Date.now();
      return true;
    } catch (error) {
      warn(`[run-persistence] Save failed; keeping the previous snapshot: ${error?.message ?? error}`);
      return false;
    } finally {
      if (temp) try { unlinkSync(temp); } catch {}
    }
  };

  const flushAsync = () => {
    clearTimer();
    if (!dirty || closing) return;
    if (inFlight) return;                    // dirty stays set; completion reschedules
    const seq = ++flushSeq;
    const startedAt = Date.now();
    let encoded;
    try {
      encoded = encodeNow();
    } catch (error) {
      warn(`[run-persistence] Save failed; keeping the previous snapshot: ${error?.message ?? error}`);
      return;
    }
    const serializeMs = Date.now() - startedAt;
    dirty = false;                           // state up to this capture is now in `encoded`
    const temp = join(dataDir, `.${basename(file)}.${process.pid}.${seq}.tmp`);
    inFlight = (async () => {
      try {
        await io.writeFile(temp, encoded.bytes);
        await io.fsyncFile(temp);
        if (committedSeq > seq) {            // a newer snapshot already landed (shutdown flushSync)
          await io.unlink(temp).catch(() => {});
          return;
        }
        await io.rename(temp, file);
        committedSeq = Math.max(committedSeq, seq);
        fileKnown = true;
        persistedRoomCount = encoded.count;
        lastFlushAt = Date.now();
        const totalMs = Date.now() - startedAt;
        if (totalMs >= SLOW_FLUSH_MS)
          warn(`[run-persistence] slow flush: ${totalMs}ms for ${encoded.bytes.length} bytes`
            + ` (serialize ${serializeMs}ms) — data volume is lagging; gameplay unaffected`);
      } catch (error) {
        dirty = true;                        // retry on a later schedule()
        await io.unlink(temp).catch(() => {});
        warn(`[run-persistence] Save failed; keeping the previous snapshot: ${error?.message ?? error}`);
      }
    })().finally(() => {
      inFlight = null;
      if (dirty && !closing) schedule();
    });
  };

  const schedule = () => {
    const hasRooms = [...rooms.values()].some(isPersistableRoom);
    if (!hasRooms && persistedRoomCount === 0 && !fileKnown) return;
    dirty = true;
    if (closing) return;
    const remaining = cadence - (Date.now() - lastFlushAt);
    if (remaining <= 0) {
      flushAsync();
      return;
    }
    if (!timer) {
      timer = setTimeout(() => { timer = null; flushAsync(); }, remaining);
      timer.unref?.();
    }
  };

  // Graceful-shutdown seam: wait out any in-flight async write (BOUNDED — a wedged volume must not
  // hold the process past the platform's kill window), then take one final synchronous snapshot so
  // the process can exit knowing the newest state is durable. If the in-flight write is still stuck
  // at the deadline we proceed anyway: its post-write supersession check discards it, and if the
  // volume is that far gone the platform's SIGKILL is the true backstop.
  const flushFinal = async ({ timeoutMs = 3_000 } = {}) => {
    closing = true;
    clearTimer();
    const deadline = Date.now() + Math.max(0, timeoutMs);
    while (inFlight && Date.now() < deadline) {
      await Promise.race([
        inFlight,
        new Promise((resolve) => setTimeout(resolve, Math.min(250, Math.max(50, deadline - Date.now())))),
      ]);
    }
    return flushSync({ force: true });
  };

  const restoreSync = () => {
    if (!existsSync(file)) return [];
    try {
      const restored = decodeRooms(readFileSync(file)).map(makeRestoredRoomDormant);
      persistedRoomCount = restored.length;
      lastFlushAt = Date.now();
      return restored;
    } catch (error) {
      persistedRoomCount = 0;
      warn(`[run-persistence] Ignoring ${ACTIVE_RUNS_FILE}: ${error?.message ?? error}. Starting with no restored rooms.`);
      return [];
    }
  };

  return { file, intervalMs: cadence, schedule, flushSync, flushFinal, restoreSync, close: clearTimer };
}
