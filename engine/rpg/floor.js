// King Mimic — FLICK mode floor generator: a square-tile grid of rooms joined by hallways, ending in a
// boss room. Pure and seedable (pass any rng() → [0,1)).
//
// Layout: the map is a COLS×ROWS lattice of cells; a random walk through neighbouring cells picks the
// chain start → fight rooms → boss. Each room sits inside its own cell, and each hallway is an L between
// two neighbouring rooms' centres, so a hallway only ever crosses the two cells it joins (it can never
// cut through a third room). Hallways are 2 tiles wide so a thumb-stick never snags.
//
// tiles: 0 = wall/void, 1 = room floor, 2 = hallway floor.
// FLAG (owner may tune): cell 22×17, room sizes, 6 rooms (start + 4 fights + boss), hall width 2.
// Owner 10/29: "make rooms bigger" — fight rooms 12–16 × 9–12 (were 8–11 × 7–9), boss 18 × 13.

const CW = 22, CH = 17, COLS = 5, ROWS = 3, HALL = 2;

export function makeFloor(rng, { fights = 4, last = "boss" } = {}) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const f = buildFloor(rng, fights, last);
    // every hallway must meet a room head-on through one 2-tile doorway. A hallway that runs
    // ALONG a room's edge opens that whole side, and you could walk past the room without
    // ever entering it (skipping its fight) — such layouts are thrown away.
    // And two hallways must never cross outside a room: that makes a shortcut around it.
    if (f && f.rooms.every((r, i) => r.doors.length === HALL * (i === 0 || i === f.rooms.length - 1 ? 1 : 2))
        && f.rooms.every((r) => r.kind !== "fight" || !reachableAround(f, r))) return f;
  }
  throw new Error("floor: no valid layout found");
}

// with room `r` walled off, can you still walk from the start to the boss room?
function reachableAround(f, r) {
  const inR = (x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  const s = f.rooms[0], b = f.rooms[f.rooms.length - 1];
  const start = Math.floor(s.cy) * f.w + Math.floor(s.cx), goal = Math.floor(b.cy) * f.w + Math.floor(b.cx);
  const seen = new Uint8Array(f.w * f.h), q = [start]; seen[start] = 1;
  for (let h = 0; h < q.length; h++) {
    const k = q[h]; if (k === goal) return true;
    const x = k % f.w, y = (k / f.w) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h || inR(nx, ny)) continue;
      const nk = ny * f.w + nx; if (!f.tiles[nk] || seen[nk]) continue;
      seen[nk] = 1; q.push(nk);
    }
  }
  return false;
}

function buildFloor(rng, fights, last) {
  const count = fights + 2;
  let path = null;
  for (let attempt = 0; attempt < 200 && !path; attempt++) path = walk(rng, count);
  if (!path) return null;
  const w = COLS * CW, h = ROWS * CH;
  const tiles = new Uint8Array(w * h);
  const rooms = path.map(([cx, cy], i) => {
    const kind = i === 0 ? "start" : i === count - 1 ? last : "fight";
    const [rw, rh] = kind === "start" ? [8, 8] : kind === "boss" ? [18, 13] : [12 + ri(rng, 5), 9 + ri(rng, 4)];
    // keep ≥1 wall tile between the room and its cell edge
    const x = cx * CW + 1 + ri(rng, CW - 2 - rw + 1), y = cy * CH + 1 + ri(rng, CH - 2 - rh + 1);
    for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) tiles[yy * w + xx] = 1;
    return { id: i, kind, cell: [cx, cy], x, y, w: rw, h: rh, cx: x + rw / 2, cy: y + rh / 2, doors: [] };
  });
  // hallways
  for (let i = 0; i + 1 < rooms.length; i++) {
    const a = rooms[i], b = rooms[i + 1];
    const ax = Math.floor(a.cx) - 1, ay = Math.floor(a.cy) - 1, bx = Math.floor(b.cx) - 1, by = Math.floor(b.cy) - 1;
    const carve = (x, y) => { for (let dy = 0; dy < HALL; dy++) for (let dx = 0; dx < HALL; dx++) {
      const k = (y + dy) * w + (x + dx); if (tiles[k] === 0) tiles[k] = 2; } };
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) carve(x, ay);
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) carve(bx, y);
  }
  // doors: hallway tiles touching a room's edge from outside (what locks while the room fights)
  for (const r of rooms) {
    for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
      const inside = x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
      if (inside || x < 0 || y < 0 || x >= w || y >= h) continue;
      const edgeX = x === r.x - 1 || x === r.x + r.w, edgeY = y === r.y - 1 || y === r.y + r.h;
      if (edgeX && edgeY) continue;   // corners never touch the room
      if (tiles[y * w + x] === 2) r.doors.push(y * w + x);
    }
  }
  const s = rooms[0];
  return { w, h, tiles, rooms, start: { x: s.cx, y: s.cy } };
}

// random walk over the cell lattice, preferring to head right so floors read left → right
function walk(rng, count) {
  const sy = ri(rng, ROWS);
  const path = [[0, sy]], used = new Set([`0,${sy}`]);
  while (path.length < count) {
    const [x, y] = path[path.length - 1];
    const opts = [[x + 1, y], [x + 1, y], [x, y - 1], [x, y + 1], [x - 1, y]]
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && !used.has(`${nx},${ny}`));
    if (!opts.length) return null;
    const n = opts[ri(rng, opts.length)];
    path.push(n); used.add(`${n[0]},${n[1]}`);
  }
  return path;
}

const ri = (rng, n) => Math.floor(rng() * n);

// room containing a point (with an inset margin so standing in a doorway doesn't count)
export function roomAt(floor, x, y, inset = 0) {
  for (const r of floor.rooms)
    if (x >= r.x + inset && x <= r.x + r.w - inset && y >= r.y + inset && y <= r.y + r.h - inset) return r;
  return null;
}
