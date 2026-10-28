// Hex dungeon floor generator suite: bun run test/floor.test.js
// Pure/deterministic checks for engine/tac/floor.js — connectivity, spawn placement rules, LOS/FOV,
// determinism, and a generation-time budget. Style matches test/tac.test.js (tiny ok() counter).
import { generateFloor, lineOfSight, fieldOfView, renderAscii } from "../engine/tac/floor.js";
import { mulberry32 } from "../engine/tac/sim.js";
import { key as hk, neighbors } from "../engine/tac/hex.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("  ✗ " + msg); } };

// --- independent flood fill (hex.js neighbors()), not floor.js's own `reachable` usage -----------
function floodFill(floor, start) {
  const seen = new Set([hk(start)]);
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop();
    for (const nb of neighbors(cur)) {
      const k = hk(nb);
      if (floor.has(k) && !seen.has(k)) { seen.add(k); stack.push(nb); }
    }
  }
  return seen;
}
function roomOf(rooms, h) {
  const k = hk(h);
  return rooms.find((r) => r.hexes.some((c) => hk(c) === k));
}
// JSON-serializable snapshot of the parts that must be byte-identical across identical seeds.
function serialize(m) {
  return JSON.stringify({
    cols: m.cols, rows: m.rows,
    floor: [...m.floor].sort(),
    pillars: [...m.pillars].sort(),
    hazards: [...m.hazards.entries()].sort(),
    rooms: m.rooms.map((r) => ({ id: r.id, center: r.center, hexes: r.hexes })),
    start: m.start, stairs: m.stairs,
    foeSpawns: m.foeSpawns, itemSpawns: m.itemSpawns,
  });
}

let sample = null;

// --- main sweep: 40 seeds x depths 0..5 -----------------------------------------------------------
for (let seed = 0; seed < 40; seed++) {
  for (let depth = 0; depth <= 5; depth++) {
    const t0 = performance.now();
    const m = generateFloor({ rng: mulberry32(seed * 131 + depth), depth });
    const genMs = performance.now() - t0;
    const tag = `seed=${seed} depth=${depth}`;

    ok(genMs < 30, `generation time < 30ms (${tag}, took ${genMs.toFixed(2)}ms)`);
    ok(m.rooms.length >= 6 && m.rooms.length <= 9, `room count in [6,9] (${tag}, got ${m.rooms.length})`);

    const reached = floodFill(m.floor, m.start);
    ok(reached.size === m.floor.size, `every walkable hex reachable from start (${tag})`);

    const startRoom = roomOf(m.rooms, m.start);
    const stairsRoom = roomOf(m.rooms, m.stairs);
    ok(reached.has(hk(m.stairs)), `stairs reachable from start (${tag})`);
    ok(!!startRoom && !!stairsRoom && startRoom.id !== stairsRoom.id, `stairs in a different room than start (${tag})`);

    for (const k of m.pillars) ok(!m.walkable({ q: Number(k.split(",")[0]), r: Number(k.split(",")[1]) }), `pillar not walkable (${tag}, ${k})`);

    const startKey = hk(m.start), stairsKey = hk(m.stairs);
    ok(!m.hazards.has(startKey), `no hazard on start (${tag})`);
    ok(!m.hazards.has(stairsKey), `no hazard on stairs (${tag})`);

    const allSpawns = [...m.foeSpawns, ...m.itemSpawns];
    const spawnKeys = allSpawns.map(hk);
    ok(new Set(spawnKeys).size === spawnKeys.length, `spawns are mutually distinct (${tag})`);
    for (const s of allSpawns) {
      const k = hk(s);
      ok(m.walkable(s), `spawn is walkable (${tag}, ${k})`);
      ok(!m.hazards.has(k), `spawn not on a hazard (${tag}, ${k})`);
    }
    for (const f of m.foeSpawns) {
      const fr = roomOf(m.rooms, f);
      ok(!!fr && fr.id !== startRoom.id, `foe spawn outside the start room (${tag})`);
    }

    // determinism: identical seed+depth twice -> byte-identical serialized output
    const m2 = generateFloor({ rng: mulberry32(seed * 131 + depth), depth });
    ok(serialize(m) === serialize(m2), `deterministic for same seed (${tag})`);

    if (seed === 0 && depth === 0) sample = m;
  }
}

// --- LOS: hand-built tiny map, a pillar between two hexes blocks sight -----------------------------
{
  const wall = new Set([hk({ q: 1, r: 0 })]);
  const tiny = { has: () => true, blocksSight: (h) => wall.has(hk(h)) };
  ok(!lineOfSight(tiny, { q: 0, r: 0 }, { q: 2, r: 0 }), "pillar between two hexes blocks LOS");
  ok(lineOfSight(tiny, { q: 0, r: 0 }, { q: 0, r: 2 }), "clear line (no obstruction) has LOS");
}

// --- FOV: includes origin, excludes a hex directly behind a wall -----------------------------------
{
  const wall = new Set([hk({ q: 1, r: 0 })]);
  const tiny = { has: (h) => Math.abs(h.q) <= 6 && Math.abs(h.r) <= 6, blocksSight: (h) => wall.has(hk(h)) };
  const fov = fieldOfView(tiny, { q: 0, r: 0 }, 4);
  ok(fov.has(hk({ q: 0, r: 0 })), "fov includes the origin");
  ok(!fov.has(hk({ q: 2, r: 0 })), "fov excludes a hex directly behind a wall");
  ok(fov.has(hk({ q: 0, r: 2 })), "fov includes a hex on a clear ray (sanity control)");
}

// --- FOV speed budget: 34x24 map, radius 6, well under 2ms ------------------------------------------
{
  const m = generateFloor({ rng: mulberry32(999) });
  fieldOfView(m, m.start, 6); // warm up
  const t0 = performance.now();
  fieldOfView(m, m.start, 6);
  const ms = performance.now() - t0;
  ok(ms < 2, `fieldOfView(radius 6) runs under 2ms (took ${ms.toFixed(3)}ms)`);
}

// --- sample ASCII map ---------------------------------------------------------------------------
console.log("\nSample floor (seed 0, depth 0):\n");
console.log(renderAscii(sample));

console.log(`\n${fail ? "❌" : "✅"} FLOOR ${fail ? "FAILURES" : "ALL PASS"} — ${pass} passed${fail ? `, ${fail} failed` : ""}`);
process.exit(fail ? 1 : 0);
