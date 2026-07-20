// Durable active-run storage. The engine state is a graph (Maps, Sets, and entity references can
// be shared or cyclic), so JSON is deliberately not involved: Bun's node:v8 serializer preserves
// that graph exactly. Only process-local transport/timer/cache handles are detached while encoding.

import {
  closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync,
  unlinkSync, writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { deserialize, serialize } from "node:v8";
import { migrateSavedLevelAllocation } from "./leveling.js";

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

function makeRestoredRoomDormant(room) {
  // Balance-data migration inside the existing v1 envelope: walk the preserved
  // object graph once so active heroes, foes, and pending room specs all shed
  // only the retired Basilisk Specialty rank without flattening shared state.
  const seen = new WeakSet();
  const migrate = (value) => {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
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
} = {}) {
  if (typeof dataDir !== "string" || !dataDir) throw new TypeError("run persistence requires dataDir");
  if (!(rooms instanceof Map)) throw new TypeError("run persistence requires a rooms Map");
  const file = join(dataDir, ACTIVE_RUNS_FILE);
  const cadence = Math.max(250, Number(intervalMs) || DEFAULT_SAVE_INTERVAL_MS);
  let timer = null;
  let dirty = false;
  let lastFlushAt = 0;
  let persistedRoomCount = 0;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const flushSync = ({ force = false } = {}) => {
    clearTimer();
    if (!dirty && !force) return false;
    let temp = null;
    try {
      mkdirSync(dataDir, { recursive: true });
      const encoded = encodeRooms(rooms);
      temp = join(dataDir, `.${basename(file)}.${process.pid}.tmp`);
      writeFileSync(temp, encoded.bytes);
      const fd = openSync(temp, "r+");
      try { fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(temp, file); // same-directory replacement: readers see the old or new complete file
      temp = null;
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

  const schedule = () => {
    const hasRooms = [...rooms.values()].some(isPersistableRoom);
    if (!hasRooms && persistedRoomCount === 0 && !existsSync(file)) return;
    dirty = true;
    const remaining = cadence - (Date.now() - lastFlushAt);
    if (remaining <= 0) {
      flushSync();
      return;
    }
    if (!timer) {
      timer = setTimeout(() => { timer = null; flushSync(); }, remaining);
      timer.unref?.();
    }
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

  return { file, intervalMs: cadence, schedule, flushSync, restoreSync, close: clearTimer };
}
