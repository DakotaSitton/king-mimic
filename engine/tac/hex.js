// King Mimic — HEX TACTICS board math (branch claude/hex-tactics). Pure, no game rules.
// Axial coordinates {q, r} on a pointy-top hex grid. The board is a rectangle of COLS x ROWS in
// "odd-r" offset layout (each odd row shifted half a hex right), stored/converted as axial.

export const key = (h) => `${h.q},${h.r}`;
export const parseKey = (k) => { const [q, r] = k.split(",").map(Number); return { q, r }; };
export const same = (a, b) => !!a && !!b && a.q === b.q && a.r === b.r;

export const DIRS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];
export const add = (a, b) => ({ q: a.q + b.q, r: a.r + b.r });
export const neighbors = (h) => DIRS.map((d) => add(h, d));
export function distance(a, b) {
  const dq = a.q - b.q, dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

// offset (col,row) <-> axial, odd-r layout
export const fromOffset = (col, row) => ({ q: col - (row - (row & 1)) / 2, r: row });
export const toOffset = (h) => ({ col: h.q + (h.r - (h.r & 1)) / 2, row: h.r });

export function createBoard(cols, rows) {
  const cells = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) cells.push(fromOffset(col, row));
  const set = new Set(cells.map(key));
  return { cols, rows, cells, has: (h) => set.has(key(h)) };
}

// World position of a hex centre (unit = hex circumradius 1, x right, y down/forward).
export const SQRT3 = Math.sqrt(3);
export const toWorld = (h) => ({ x: SQRT3 * (h.q + h.r / 2), y: 1.5 * h.r });

// Fractional-hex rounding and straight lines (for "the foe behind it" chains and shoves).
function cubeRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}
export function line(a, b) {
  const n = distance(a, b);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    // tiny nudge so lines along hex edges break ties consistently
    out.push(cubeRound(a.q + (b.q - a.q) * t + 1e-6, a.r + (b.r - a.r) * t + 1e-6));
  }
  return out;
}
// Continue the ray from `from` through `through` for `steps` more hexes (beyond `through`).
export function rayBeyond(from, through, steps) {
  const n = distance(from, through);
  if (n === 0) return [];
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const t = (n + i) / n;
    out.push(cubeRound(from.q + (through.q - from.q) * t + 1e-6, from.r + (through.r - from.r) * t + 1e-6));
  }
  return out;
}

export function disk(center, radius) {
  const out = [];
  for (let dq = -radius; dq <= radius; dq++)
    for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++)
      out.push({ q: center.q + dq, r: center.r + dr });
  return out;
}

// Breadth-first reachable hexes. `passable(h)` = may step through; `standable(h)` = may end on.
// Returns Map key -> {hex, steps, prev}.
export function reachable(board, start, maxSteps, passable, standable = passable) {
  const seen = new Map([[key(start), { hex: start, steps: 0, prev: null }]]);
  const frontier = [start];
  while (frontier.length) {
    const cur = frontier.shift();
    const s = seen.get(key(cur)).steps;
    if (s >= maxSteps) continue;
    for (const n of neighbors(cur)) {
      const k = key(n);
      if (seen.has(k) || !board.has(n) || !passable(n)) continue;
      seen.set(k, { hex: n, steps: s + 1, prev: key(cur) });
      frontier.push(n);
    }
  }
  for (const [k, v] of seen) if (v.steps > 0 && !standable(v.hex)) v.passOnly = true;
  return seen;
}
export function pathTo(reach, target) {
  const out = [];
  let k = key(target);
  while (k && reach.has(k)) { out.unshift(reach.get(k).hex); k = reach.get(k).prev; }
  return out;
}
