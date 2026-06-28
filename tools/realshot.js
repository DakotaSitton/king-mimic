// ⚠⚠⚠  FIXTURE RENDERER — NOT REAL GAMEPLAY.  ⚠⚠⚠  (relabeled by owner 2026-06-27)
// ----------------------------------------------------------------------------------------------
// This renders a HAND-CONFIGURED scene (see tools/realsnap.js): a FIXED 3-player, floor-2 combat
// with a hardcoded long-named foe roster (Market-Crash Minotaur, Centless Centaur, …) — a board
// that NEVER arises in the owner's real SOLO play. It uses real engine primitives, so it LOOKS
// polished, but it is a stress/render-QA fixture, not a playthrough. It is the exact trap that kept
// getting passed off as "the game". Every shot is therefore filename-prefixed `FIXTURE-` AND the
// client burns a "FIXTURE — NOT A REAL GAME" watermark into the image (see public/client.js render()).
//
//   ➤ For ANY screenshot meant to represent the game, use:  node tools/shoot.mjs   (real solo run)
//
// Kept only as a deliberate text-overflow / hydra-bloom render-QA bench. Do not present its output
// as real gameplay.
//
// Usage:  bun tools/realshot.js                  → every fixture scene, mobile + desktop
//         bun tools/realshot.js hydra            → just the hydra fixture scene
//         bun tools/realshot.js combat hydra     → those fixture scenes
//         TAG=before bun tools/realshot.js       → filenames get a -before/-after suffix
import { readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { buildRealSnap } from "./realsnap.js";

const EDGE = process.env.EDGE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = Number(process.env.RPORT ?? 3177);
const OUT = `${process.cwd()}\\tools\\shots`;
const TAG = process.env.TAG ? `-${process.env.TAG}` : "";
const PUBLIC = join(import.meta.dir, "..", "public");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json" };

// scene → which engine snapshot to render. Mobile uses the touch-gated landscape layout (?touch=1).
const SCENES = ["combat", "hydra", "hydra3", "rats"];
const VIEWPORTS = [
  { tag: "mobile",  W: 844,  H: 390, DPR: 3, touch: true },   // phone-landscape (the new mobile layout)
  { tag: "desktop", W: 1120, H: 820, DPR: 1, touch: false },  // desktop
];

const want = process.argv.slice(2);
const scenes = want.length ? want.filter((s) => SCENES.includes(s)) : SCENES;
if (!scenes.length) { console.error("no known scenes in", want, "— known:", SCENES.join(", ")); process.exit(1); }

// THROWAWAY server: real static client + a real engine snapshot at /realsnap?scene=X.
const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/realsnap") {
      try { return Response.json(buildRealSnap(url.searchParams.get("scene") || "combat")); }
      catch (e) { return Response.json({ error: String((e && e.stack) || e) }, { status: 500 }); }
    }
    const file = url.pathname === "/" ? "/index.html" : url.pathname;
    try {
      return new Response(readFileSync(join(PUBLIC, file)), {
        headers: { "content-type": MIME[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" },
      });
    } catch { return new Response("Not found", { status: 404 }); }
  },
});

console.error("\n████████████████████████████████████████████████████████████████████████");
console.error("  ⚠  FIXTURE RENDERER — these are NOT real-gameplay screenshots.");
console.error("     Hand-built 3-player scene; never happens in a real solo run.");
console.error("     Files are prefixed FIXTURE- and watermarked in-image.");
console.error("     Real shots:  node tools/shoot.mjs");
console.error("████████████████████████████████████████████████████████████████████████\n");

const RUN = Date.now();
let ok = 0, fail = 0;
for (const scene of scenes) {
  for (const vp of VIEWPORTS) {
    const name = `FIXTURE-${scene}-${vp.tag}${TAG}`;
    const out = `${OUT}\\${name}.png`;
    const profile = `${process.env.TEMP ?? "."}\\km-real-${name}-${RUN}`;
    const qs = `demo=realsnap&scene=${scene}${vp.touch ? "&touch=1" : ""}`;
    const proc = Bun.spawn([
      EDGE, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
      "--hide-scrollbars", "--disk-cache-size=1", `--user-data-dir=${profile}`,
      `--window-size=${vp.W},${vp.H}`, `--force-device-scale-factor=${vp.DPR}`,
      "--run-all-compositor-stages-before-draw", "--virtual-time-budget=3000",
      `--screenshot=${out}`, `http://localhost:${PORT}/?${qs}`,
    ], { stdout: "ignore", stderr: "ignore" });
    await proc.exited;
    const f = Bun.file(out);
    const exists = await f.exists();
    console.log(`${exists ? "OK  " : "FAIL"} ${name}.png  (${exists ? await f.size : 0} bytes)  vp=${vp.W}x${vp.H}@${vp.DPR}  ${qs}`);
    exists ? ok++ : fail++;
  }
}
server.stop(true);
console.log(`\ndone — ${ok} ok, ${fail} fail.  FIXTURE shots in tools/shots/FIXTURE-*.png  (NOT real gameplay — real shots: node tools/shoot.mjs)`);
process.exit(fail ? 1 : 0);
