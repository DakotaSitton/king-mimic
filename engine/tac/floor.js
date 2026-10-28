// King Mimic — HEX DUNGEON FLOOR generator + line-of-sight helpers (branch claude/hex-tactics).
// Pure, deterministic: every random choice comes from the passed-in `rng` (mulberry32 in sim.js),
// never Math.random. Reuses engine/tac/hex.js board math (key/distance/neighbors/line/disk/reachable/
// createBoard/fromOffset) instead of re-deriving it. No game rules here — just geometry + layout.
//
// Every number below that the owner did not state carries a FLAG — owner-review default, not canon.

import {
  key, parseKey, same, neighbors, distance, line, disk, reachable, createBoard, fromOffset,
} from "./hex.js";

// ---------------------------------------------------------------------------------------------
// Tunables (all FLAG — owner has not reviewed these numbers)
export const COLS = 34, ROWS = 24;              // FLAG: floor size — owner to tune
export const ROOM_COUNT_MIN = 6, ROOM_COUNT_MAX = 9;   // FLAG: rooms per floor
export const ROOM_W_MIN = 4, ROOM_W_MAX = 8;    // FLAG: room width (offset cols)
export const ROOM_H_MIN = 3, ROOM_H_MAX = 6;    // FLAG: room height (offset rows)
export const ROOM_GAP = 1;                      // FLAG: minimum wall-hex gap between rooms
export const EXTRA_LOOP_MIN = 1, EXTRA_LOOP_MAX = 2;   // FLAG: loop corridors beyond the MST
export const LOOP_CANDIDATE_POOL = 6;           // FLAG: how many short non-MST edges are eligible for a loop
export const PILLAR_MIN_ROOM_SIZE = 20;         // FLAG: rooms smaller than this never get pillars
export const PILLAR_MAX_PER_ROOM = 4;           // FLAG: pillars per eligible room, 0..this
export const HAZARD_ROOM_FRACTION = 1 / 3;      // FLAG: fraction of rooms that roll hazards
export const HAZARD_MIN = 2, HAZARD_MAX = 5;    // FLAG: hazard hexes per hazardous room
export const HAZARD_KIND = "spikes";            // FLAG placeholder kind — owner will design hazards
export const DEFAULT_FOE_BASE = 4;              // FLAG: base foeCount
export const DEFAULT_ITEM_COUNT = 3;            // FLAG

// ---------------------------------------------------------------------------------------------
// rng helpers (rng is a () => [0,1) function, e.g. mulberry32(seed) from sim.js)
const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1)); // inclusive
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------------------------------------------------------------------------------------------
// Rooms: rectangles in offset (col,row) space, converted to axial, kept apart by >= ROOM_GAP walls.
function boxesOverlap(a, b, gap) {
  return !(a.col0 + a.w + gap <= b.col0 || b.col0 + b.w + gap <= a.col0 ||
           a.row0 + a.h + gap <= b.row0 || b.row0 + b.h + gap <= a.row0);
}
function placeRoomBoxes(rng, cols, rows) {
  const target = randInt(rng, ROOM_COUNT_MIN, ROOM_COUNT_MAX);
  const boxes = [];
  for (let attempts = 0; boxes.length < target && attempts < 6000; attempts++) {
    const w = randInt(rng, ROOM_W_MIN, ROOM_W_MAX);
    const h = randInt(rng, ROOM_H_MIN, ROOM_H_MAX);
    const col0 = randInt(rng, 1, cols - w - 1);
    const row0 = randInt(rng, 1, rows - h - 1);
    const cand = { col0, row0, w, h };
    if (boxes.some((b) => boxesOverlap(cand, b, ROOM_GAP))) continue;
    boxes.push(cand);
  }
  return boxes;
}
function buildRoom(id, box) {
  const hexes = [];
  for (let row = box.row0; row < box.row0 + box.h; row++)
    for (let col = box.col0; col < box.col0 + box.w; col++)
      hexes.push(fromOffset(col, row));
  const center = fromOffset(box.col0 + Math.floor(box.w / 2), box.row0 + Math.floor(box.h / 2));
  return { id, center, hexes };
}
// Border = any room hex with a neighbor outside the room's own hex set (rectangle edge, and — since
// a corridor hex is by definition not a room hex — the cell a corridor enters through too).
function isRoomBorder(h, roomSet) {
  for (const nb of neighbors(h)) if (!roomSet.has(key(nb))) return true;
  return false;
}

// ---------------------------------------------------------------------------------------------
// Corridors: MST over room centers (by hex distance) + a couple of short extra loop edges.
function buildCorridorEdges(rng, rooms) {
  const n = rooms.length;
  const edges = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++)
    edges.push({ i, j, w: distance(rooms[i].center, rooms[j].center) });
  edges.sort((a, b) => a.w - b.w);
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const mst = [];
  const inMst = new Set();
  for (const e of edges) {
    const a = find(e.i), b = find(e.j);
    if (a === b) continue;
    parent[a] = b; mst.push(e); inMst.add(`${e.i},${e.j}`);
  }
  const rest = edges.filter((e) => !inMst.has(`${e.i},${e.j}`));
  const pool = rest.slice(0, Math.min(rest.length, LOOP_CANDIDATE_POOL));
  const extraCount = randInt(rng, EXTRA_LOOP_MIN, EXTRA_LOOP_MAX);
  const extras = [];
  for (let k = 0; k < extraCount && pool.length; k++) extras.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return [...mst, ...extras];
}
// Walk a hex-adjacent path from a to b. Prefer hex.js `line` (the owner-sanctioned option); fall
// back to step-by-step neighbor walking (greedily closing the distance) if a line ever has a gap —
// belt-and-suspenders so corridors are always verified hex-adjacent.
function greedyWalk(a, b) {
  const path = [a];
  let cur = a;
  for (let guard = 0; !same(cur, b) && guard < COLS + ROWS; guard++) {
    let best = cur, bestD = distance(cur, b);
    for (const nb of neighbors(cur)) { const d = distance(nb, b); if (d < bestD) { bestD = d; best = nb; } }
    if (same(best, cur)) break;
    cur = best; path.push(cur);
  }
  return path;
}
function corridorPath(a, b) {
  const pts = line(a, b);
  for (let i = 1; i < pts.length; i++) if (distance(pts[i - 1], pts[i]) !== 1) return greedyWalk(a, b);
  return pts;
}

// ---------------------------------------------------------------------------------------------
// Flood-fill connectivity check, reusing hex.js `reachable` instead of hand-rolling BFS again.
function floorConnected(floor) {
  if (!floor.size) return true;
  const start = parseKey(floor.values().next().value);
  const board = { has: (h) => floor.has(key(h)) };
  const seen = reachable(board, start, Infinity, () => true);
  return seen.size === floor.size;
}

function placePillars(rng, rooms, roomSets, floor) {
  const pillars = new Set();
  for (const room of rooms) {
    if (room.hexes.length < PILLAR_MIN_ROOM_SIZE) continue;
    const roomSet = roomSets[room.id];
    const interior = shuffle(rng, room.hexes.filter((h) => !isRoomBorder(h, roomSet)));
    const target = randInt(rng, 0, PILLAR_MAX_PER_ROOM);
    let placed = 0;
    for (const h of interior) {
      if (placed >= target) break;
      const k = key(h);
      floor.delete(k); pillars.add(k);
      if (floorConnected(floor)) { placed++; continue; }
      floor.add(k); pillars.delete(k); // would disconnect the floor — undo
    }
  }
  return pillars;
}

function pickStart(rng, room0, roomSet0, pillars) {
  const interior = room0.hexes.filter((h) => !isRoomBorder(h, roomSet0) && !pillars.has(key(h)));
  if (interior.length) return interior[Math.floor(rng() * interior.length)];
  const any = room0.hexes.filter((h) => !pillars.has(key(h))); // FLAG fallback: tiny/pillar-heavy room 0
  return any.length ? any[0] : room0.center;
}

function placeHazards(rng, rooms, floor, startKey) {
  const hazards = new Map();
  const numRooms = Math.max(1, Math.round(rooms.length * HAZARD_ROOM_FRACTION));
  for (const room of shuffle(rng, rooms).slice(0, numRooms)) {
    const candidates = shuffle(rng, room.hexes.filter((h) => floor.has(key(h)) && key(h) !== startKey));
    const n = Math.min(candidates.length, randInt(rng, HAZARD_MIN, HAZARD_MAX));
    for (const h of candidates.slice(0, n)) hazards.set(key(h), { kind: HAZARD_KIND });
  }
  return hazards;
}

// Farthest-by-path-distance non-hazard, non-pillar hex outside the start's room becomes the stairs.
function pickStairs(rooms, dist, hazards, startRoomId) {
  let best = null, bestRoom = null, bestD = -1;
  for (const room of rooms) {
    if (room.id === startRoomId) continue;
    for (const h of room.hexes) {
      const k = key(h);
      if (hazards.has(k) || !dist.has(k)) continue;
      const d = dist.get(k).steps;
      if (d > bestD) { bestD = d; best = h; bestRoom = room; }
    }
  }
  return { stairs: best, stairsRoom: bestRoom };
}

// Distinct spawn hexes spread round-robin across `rooms`, mutating `exclude` as hexes are consumed.
function spreadSpawns(rng, rooms, floor, exclude, count) {
  const pools = rooms
    .map((r) => ({ id: r.id, hexes: shuffle(rng, r.hexes.filter((h) => floor.has(key(h)) && !exclude.has(key(h)))) }))
    .filter((p) => p.hexes.length);
  const out = [];
  let i = 0;
  while (out.length < count && pools.some((p) => p.hexes.length)) {
    const pool = pools[i % pools.length]; i++;
    if (!pool.hexes.length) continue;
    const h = pool.hexes.shift();
    exclude.add(key(h));
    out.push({ q: h.q, r: h.r, roomId: pool.id });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
export function generateFloor({ rng, depth = 0, foeCount, itemCount } = {}) {
  if (typeof rng !== "function") throw new Error("generateFloor requires { rng }");
  foeCount = foeCount ?? DEFAULT_FOE_BASE + Math.floor(depth / 2); // FLAG
  itemCount = itemCount ?? DEFAULT_ITEM_COUNT; // FLAG

  const board = createBoard(COLS, ROWS);
  const boxes = placeRoomBoxes(rng, COLS, ROWS);
  const rooms = boxes.map((box, id) => buildRoom(id, box));
  const roomSets = rooms.map((r) => new Set(r.hexes.map(key)));

  const floor = new Set();
  for (const r of rooms) for (const h of r.hexes) floor.add(key(h));
  for (const e of buildCorridorEdges(rng, rooms))
    for (const h of corridorPath(rooms[e.i].center, rooms[e.j].center)) if (board.has(h)) floor.add(key(h));

  const pillars = placePillars(rng, rooms, roomSets, floor);

  const room0 = rooms[0];
  const start = pickStart(rng, room0, roomSets[0], pillars);
  const startKey = key(start);

  const hazards = placeHazards(rng, rooms, floor, startKey);

  const distBoard = { has: (h) => floor.has(key(h)) };
  const dist = reachable(distBoard, start, Infinity, () => true);
  const { stairs, stairsRoom } = pickStairs(rooms, dist, hazards, room0.id);

  const exclude = new Set([...hazards.keys(), startKey, key(stairs)]);
  const foeSpawns = spreadSpawns(rng, rooms.filter((r) => r.id !== room0.id), floor, exclude, foeCount);
  const itemSpawns = spreadSpawns(rng, rooms, floor, exclude, itemCount);

  return {
    cols: COLS, rows: ROWS, floor, pillars, hazards, rooms, start, stairs, foeSpawns, itemSpawns,
    startRoomId: room0.id, stairsRoomId: stairsRoom ? stairsRoom.id : null, // handy for callers/tests
    has: (h) => board.has(h),
    walkable: (h) => floor.has(key(h)),
    blocksSight: (h) => !board.has(h) || !floor.has(key(h)), // off-map, true walls, and pillars all block
  };
}

// ---------------------------------------------------------------------------------------------
// true if no hex strictly between a and b blocks sight (walls/pillars/off-map); endpoints never block.
export function lineOfSight(map, a, b) {
  const pts = line(a, b);
  for (let i = 1; i < pts.length - 1; i++) if (map.blocksSight(pts[i])) return false;
  return true;
}

// Hexes visible from `from` within `radius`, including walls/pillars that are themselves seen.
export function fieldOfView(map, from, radius) {
  const visible = new Set();
  for (const h of disk(from, radius)) {
    if (!map.has(h)) continue;
    if (lineOfSight(map, from, h)) visible.add(key(h));
  }
  return visible;
}

// Debug ASCII preview. `extra` (optional Set<key>) overlays '*' on floor hexes it contains.
export function renderAscii(map, extra) {
  const lines = [];
  for (let row = 0; row < map.rows; row++) {
    let s = "";
    for (let col = 0; col < map.cols; col++) {
      const h = fromOffset(col, row);
      const k = key(h);
      let ch = "#";
      if (map.pillars.has(k)) ch = "o";
      else if (map.hazards.has(k)) ch = "^";
      else if (map.floor.has(k)) ch = ".";
      if (extra && extra.has(k) && ch === ".") ch = "*";
      if (same(h, map.start)) ch = "S";
      else if (same(h, map.stairs)) ch = ">";
      else if (map.foeSpawns.some((f) => f.q === h.q && f.r === h.r)) ch = "f";
      else if (map.itemSpawns.some((it) => it.q === h.q && it.r === h.r)) ch = "i";
      s += ch;
    }
    lines.push(row & 1 ? " " + s : s);
  }
  return lines.join("\n");
}
