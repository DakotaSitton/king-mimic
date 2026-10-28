// King Mimic — TWIN-STICK server (branch claude/twin-stick). Separate entry from server.js so the
// lane game keeps working untouched while the real-time mode grows.
//   bun run rt-server.js            → http://localhost:3212   (PORT env overrides)
// Rooms are keyed by ?room=CODE (default "main"): open the same URL on two phones = co-op.
// The sim (engine/rt/sim.js) is authoritative for everything except a player's own movement,
// which the client reports and the server validates (speed clamp + forced-move sequence).

import { join, normalize } from "path";
import { existsSync } from "fs";
import {
  createWorld, addPlayer, step, snapshot, flushFx, playCard, setTarget, draftPick, voteDoor,
  rewardPick, restartRun, reportMove, catalog, SIM_HZ,
} from "./engine/rt/sim.js";

const PORT = Number(process.env.PORT || 3212);
// Body art: same resolution as the lane client (public/client.js ART_ALIAS is the source of truth —
// art filenames are the owner's design surface; several bodies wear another file's silhouette).
const ART_ALIAS = {
  centlessCentaur: "centaur", malevolentMouse: "mouse", rentSeekingRuneblade: "runeblade",
  marketCrashMinotaur: "minotaur", interestImp: "internImp", vengefulVampire: "vampire",
  bondBehemoth: "behemoth", wearyWageslave: "wageslave", tollTroll: "balrog", cryptoChimera: "cerberus",
  bribedBishop: "auditAngel", chequeCherub: "auditAngel", pyramidHead: "runeblade",
  pennyPixie: "pixie", econElemental: "totem", wanderCastle: "goldenGolem",
};
const PUBLIC_DIR = join(import.meta.dir, "public");
const PUBLIC = PUBLIC_DIR;
const artFor = (k) => [ART_ALIAS[k], k].find((s) => s && existsSync(join(PUBLIC_DIR, "foes", s + ".svg"))) ?? null;
const CAT = catalog();
for (const [k, b] of Object.entries(CAT.bodies)) b.art = artFor(k);
const CATALOG = JSON.stringify(CAT);
const rooms = new Map();   // code → { world, sockets: Map<pid, ws>, timer, gone: Map<pid, time>, idleTicks }

function roomFor(code) {
  let r = rooms.get(code);
  if (r) return r;
  r = { code, world: createWorld(), sockets: new Map(), gone: new Map(), idleTicks: 0 };
  r.timer = setInterval(() => tick(r), 1000 / SIM_HZ);
  rooms.set(code, r);
  return r;
}
function tick(r) {
  try { tickRoom(r); } catch (err) { console.error(`[room ${r.code}] tick failed:`, err); }
}
function tickRoom(r) {
  const w = r.world;
  step(w);
  // drop players who have been disconnected for 2 minutes (a phone sleeping briefly keeps its run)
  for (const [pid, at] of r.gone) if (w.time - at > 120) { w.players.delete(pid); w.votes.delete(pid); r.gone.delete(pid); }
  for (const [pid, ws] of r.sockets) {
    try { ws.send(JSON.stringify(snapshot(w, pid))); } catch { /* socket closing */ }
  }
  flushFx(w);
  r.idleTicks = r.sockets.size ? 0 : r.idleTicks + 1;
  if (r.idleTicks > SIM_HZ * 600) { clearInterval(r.timer); rooms.delete(r.code); }   // 10 idle minutes
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json" };
async function serveStatic(pathname) {
  if (pathname === "/" || pathname === "/index.html") pathname = "/rt/index.html";
  if (!(pathname.startsWith("/rt/") || pathname.startsWith("/foes/") || pathname.startsWith("/icon-"))) return new Response("Not found", { status: 404 });
  const file = normalize(join(PUBLIC, pathname));
  if (!file.startsWith(PUBLIC)) return new Response("Forbidden", { status: 403 });
  const f = Bun.file(file);
  if (!(await f.exists())) return new Response("Not found", { status: 404 });
  const ext = file.slice(file.lastIndexOf("."));
  return new Response(f, { headers: { "content-type": TYPES[ext] ?? "application/octet-stream", "cache-control": "no-cache" } });
}

function onMessage(ws, raw) {
  try { handle(ws, raw); } catch (err) { console.error("message failed:", err); }
}
function handle(ws, raw) {
  let m; try { m = JSON.parse(raw); } catch { return; }
  if (!m || typeof m !== "object") return;
  const d = ws.data;
  if (m.t === "hello") {
    const code = String(m.room || "main").slice(0, 24).replace(/[^\w-]/g, "") || "main";
    const pid = String(m.cid || "").slice(0, 40).replace(/[^\w-]/g, "") || "p" + Math.random().toString(36).slice(2, 10);
    // one socket = one player in one room; a hello that tries to change either is ignored
    if (d.room && (d.room.code !== code || d.pid !== pid)) return;
    const r = roomFor(code);
    const old = r.sockets.get(pid);
    if (old && old !== ws) { try { old.close(4000, "replaced"); } catch {} }
    d.room = r; d.pid = pid;
    r.sockets.set(pid, ws);
    r.gone.delete(pid);
    addPlayer(r.world, pid, String(m.name || "Mimic").slice(0, 16));
    ws.send(JSON.stringify({ t: "welcome", id: pid, room: code, catalog: JSON.parse(CATALOG) }));
    return;
  }
  const r = d.room, w = r?.world, pid = d.pid;
  if (!w) return;
  switch (m.t) {
    case "move": {
      reportMove(w, pid, +m.x, +m.y, m.fs | 0);
      break;
    }
    case "play": {
      const res = playCard(w, pid, m.slot | 0);
      if (!res.ok) ws.send(JSON.stringify({ t: "nope", slot: m.slot | 0, why: res.why }));
      break;
    }
    case "target": setTarget(w, pid, m.id ?? null); break;
    case "draft": draftPick(w, pid, m.i | 0); break;
    case "door": voteDoor(w, pid, m.i | 0); break;
    case "reward": rewardPick(w, pid, String(m.kind), m.i | 0); break;
    case "restart": if (w.phase === "over") restartRun(w); break;
  }
}

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  fetch(req, srv) {
    const url = new URL(req.url);
    if (url.pathname === "/health") return Response.json({ ok: true, mode: "twin-stick", rooms: rooms.size });
    if (url.pathname === "/catalog.json") return new Response(CATALOG, { headers: { "content-type": "application/json" } });
    if (url.pathname === "/ws") return srv.upgrade(req, { data: {} }) ? undefined : new Response("upgrade failed", { status: 400 });
    return serveStatic(url.pathname);
  },
  websocket: {
    message: onMessage,
    close(ws) {
      const { room: r, pid } = ws.data ?? {};
      if (!r || r.sockets.get(pid) !== ws) return;
      r.sockets.delete(pid);
      const p = r.world.players.get(pid);
      if (p) { p.connected = false; r.gone.set(pid, r.world.time); }
    },
  },
});
console.log(`King Mimic twin-stick on http://localhost:${server.port}`);
