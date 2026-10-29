// King Mimic — FLICK mode server (branch claude/flick-deckbuilder). Static only: the run is simulated in
// the page (engine/flick/sim.js), so this just serves the client, the engine modules and the art.
// Separate entry from server.js / rt-server.js / tac-server.js — those modes are untouched.
//   bun run flick-server.js          → http://localhost:3214   (PORT env overrides)

import { join, normalize, extname, sep } from "path";
import { existsSync, statSync } from "fs";

const PORT = Number(process.env.PORT || 3214);
const ROOT = import.meta.dir;
const ROUTES = [                     // url prefix → directory (nothing else is reachable)
  ["/flick/", join(ROOT, "public", "flick")],
  ["/engine/flick/", join(ROOT, "engine", "flick")],
  ["/foes/", join(ROOT, "public", "foes")],
  ["/cards/", join(ROOT, "public", "cards")],
];
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };

function fileFor(pathname) {
  if (pathname === "/" || pathname === "/index.html") return join(ROOT, "public", "flick", "index.html");
  for (const [prefix, dir] of ROUTES) {
    if (!pathname.startsWith(prefix)) continue;
    const rel = decodeURIComponent(pathname.slice(prefix.length));
    const full = normalize(join(dir, rel));
    return full.startsWith(dir + sep) ? full : null;     // no ../ escapes out of the served folders
  }
  return null;
}

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname === "/health") return new Response("ok");
    const f = fileFor(pathname);
    if (!f || !existsSync(f) || !statSync(f).isFile()) return new Response("Not found", { status: 404 });
    return new Response(Bun.file(f), { headers: { "content-type": TYPES[extname(f)] ?? "application/octet-stream", "cache-control": "no-store" } });
  },
});
console.log(`King Mimic — Flick on http://localhost:${server.port}`);
