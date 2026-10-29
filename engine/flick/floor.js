// King Mimic — FLICK mode floor generator: a square-tile grid of rooms joined by hallways, ending in a
// boss room. Pure and seedable (pass any rng() → [0,1)).
//
// Layout: the map is a COLS×ROWS lattice of cells; a random walk through neighbouring cells picks the
// chain start → fight rooms → boss. Each room sits inside its own cell, and each hallway is an L between
// two neighbouring rooms' centres, so a hallway only ever crosses the two cells it joins (it can never
// cut through a third room). Hallways are 2 tiles wide so a thumb-stick never snags.
//
// tiles: 0 = wall/void, 1 = room floor, 2 = hallway floor.
// FLAG (owner may tune): cell 16×14, room sizes, 6 rooms (start + 4 fights + boss), hall width 2.

const CW = 16, CH = 14, COLS = 5, ROWS = 3, HALL = 2;

export function makeFloor(rng, { fights = 4 } = {}) {
  const count = fights + 2;
  let path = null;
  for (let attempt = 0; attempt < 200 && !path; attempt++) path = walk(rng, count);
  if (!path) throw new Error("floor: no cell walk found");
  const w = COLS * CW, h = ROWS * CH;
  const tiles = new Uint8Array(w * h);
  const rooms = path.map(([cx, cy], i) => {
    const kind = i === 0 ? "start" : i === count - 1 ? "boss" : "fight";
    const [rw, rh] = kind === "start" ? [7, 7] : kind === "boss" ? [13, 11] : [8 + ri(rng, 4), 7 + ri(rng, 3)];
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
