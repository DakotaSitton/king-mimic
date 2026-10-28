// King Mimic — HEX TACTICS server (branch claude/hex-tactics). Separate entry from server.js and
// rt-server.js so the lane game and the twin-stick slice keep working untouched.
//   bun run tac-server.js            → http://localhost:3213   (PORT env overrides)
// Rooms are keyed by ?room=CODE (default "main"): open the same URL on two phones = co-op.
// Turn-based and fully authoritative: the server only sends a state after something happens.
// The foe turn is played out one action at a time (FOE_BEAT_MS apart) so phones can watch it.

import { join, normalize } from "path";
import { existsSync } from "fs";
import {
  createWorld, addPlayer, snapshot, flushFx, playCard, moveHero, endTurn, foeStep, draftPick,
  restartRun, setConnected, removePlayer, catalog, reshuffle, struggle, descend, wear,
} from "./engine/tac/sim.js";

const PORT = Number(process.env.PORT || 3213);
const FOE_BEAT_MS = Number(process.env.FOE_BEAT_MS || 520);   // pacing of the foe turn (presentation)
// Body art: the lane clients' alias tables (several bodies wear another file's silhouette).
const ART_ALIAS = {
  centlessCentaur: "centaur", malevolentMouse: "mouse", rentSeekingRuneblade: "runeblade",
  marketCrashMinotaur: "minotaur", interestImp: "internImp", vengefulVampire: "vampire",
  bondBehemoth: "behemoth", wearyWageslave: "wageslave", tollTroll: "balrog", cryptoChimera: "cerberus",
  hedgeKnight: "knight", bribedBishop: "auditAngel", chequeCherub: "auditAngel", pyramidHead: "runeblade",
  pennyPixie: "pixie", econElemental: "totem", wanderCastle: "goldenGolem", earthElemental: "totem",
  lavaElemental: "phoenix", ratKing: "royalRat", splitter: "djinn", bloodMoonOni: "balrog",
};
const PUBLIC = join(import.meta.dir, "public");
const ENGINE_TAC = join(import.meta.dir, "engine", "tac");
const artFor = (k) => [k, ART_ALIAS[k]].find((s) => s && existsSync(join(PUBLIC, "foes", s + ".svg"))) ?? "kingMimic";
const CAT = catalog();
for (const [k, b] of Object.entries(CAT.bodies)) b.art = artFor(k);
const CATALOG = JSON.stringify(CAT);
const rooms = new Map();   // code → { world, sockets: Map<pid, ws>, foeTimer, idleTimer }

function roomFor(code) {
  let r = rooms.get(code);
  if (!r) { r = { code, world: createWorld(), sockets: new Map(), cids: new Map(), foeTimer: null, idleTimer: null }; rooms.set(code, r); }
  clearTimeout(r.idleTimer);
  return r;
}
function broadcast(r) {
  const w = r.world;
  for (const [pid, ws] of r.sockets) {
    // the floor layout goes to each phone once per floor; states after that carry only what changes
    const withMap = !!w.map && ws.data.mapFloor !== w.floorNo;
    try { ws.send(JSON.stringify(snapshot(w, pid, { withMap }))); if (withMap) ws.data.mapFloor = w.floorNo; } catch { /* socket closing */ }
  }
  flushFx(w);
  // the foe turn plays out on its own clock once the players have all ended
  if (w.phase === "floor" && w.turn === "foe" && !r.foeTimer) r.foeTimer = setTimeout(() => runFoeBeat(r), FOE_BEAT_MS);
}
function runFoeBeat(r) {
  r.foeTimer = null;
  try { foeStep(r.world); } catch (err) { console.error(`[room ${r.code}] foe step failed:`, err); }
  broadcast(r);
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
async function serveStatic(pathname) {
  if (pathname === "/" || pathname === "/index.html") pathname = "/tac/index.html";
  // board math + line of sight are shared with the client so previews match the rules exactly
  if (pathname === "/tac/hex.js" || pathname === "/tac/floor.js")
    return new Response(Bun.file(join(ENGINE_TAC, pathname.slice(5))), { headers: { "content-type": TYPES[".js"], "cache-control": "no-cache" } });
  if (!(pathname.startsWith("/tac/") || pathname.startsWith("/foes/") || pathname.startsWith("/icon-"))) return new Response("Not found", { status: 404 });
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
const hexArg = (h) => (h && Number.isFinite(+h.q) && Number.isFinite(+h.r) ? { q: +h.q, r: +h.r } : null);
function handle(ws, raw) {
  let m; try { m = JSON.parse(raw); } catch { return; }
  if (!m || typeof m !== "object") return;
  const d = ws.data;
  if (m.t === "hello") {
    const code = String(m.room || "main").slice(0, 24).replace(/[^\w-]/g, "") || "main";
    const cidRaw = String(m.cid || "").slice(0, 40).replace(/[^\w-]/g, "") || "anon" + Math.random().toString(36).slice(2, 10);
    // The client's cid is a private reconnect secret; peers only ever see a server-issued public id
    // ("h…", which can never collide with foe/card ids or be used to take over someone's seat).
    if (d.room && (d.room.code !== code || d.cid !== cidRaw)) return;   // one socket = one player in one room
    const r = roomFor(code);
    let pid = r.cids.get(cidRaw);
    if (!pid || !r.world.players.has(pid)) { pid = "h" + Math.random().toString(36).slice(2, 10); r.cids.set(cidRaw, pid); }
    d.cid = cidRaw;
    const old = r.sockets.get(pid);
    if (old && old !== ws) { try { old.close(4000, "replaced"); } catch {} }
    d.room = r; d.pid = pid; d.mapFloor = null;
    r.sockets.set(pid, ws);
    clearTimeout(r.world.players.get(pid)?.dropTimer);
    addPlayer(r.world, pid, String(m.name || "Mimic").slice(0, 16));
    ws.send(JSON.stringify({ t: "welcome", id: pid, room: code, catalog: JSON.parse(CATALOG) }));
    broadcast(r);
    return;
  }
  const r = d.room, w = r?.world, pid = d.pid;
  if (!w) return;
  let res = { ok: true };
  switch (m.t) {
    case "move": res = moveHero(w, pid, hexArg(m.to)); break;
    case "play": res = playCard(w, pid, m.slot | 0, hexArg(m.at)); break;
    case "end": endTurn(w, pid); break;
    case "draft": res = draftPick(w, pid, m.i | 0); break;
    case "reshuffle": res = reshuffle(w, pid); break;
    case "struggle": res = struggle(w, pid, hexArg(m.at)); break;
    case "descend": res = descend(w, pid); break;
    case "wear": res = wear(w, pid); break;
    case "restart": if (w.phase === "over") restartRun(w); break;
    default: return;
  }
  if (res && !res.ok) ws.send(JSON.stringify({ t: "nope", why: res.why }));
  broadcast(r);
}

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  fetch(req, srv) {
    const url = new URL(req.url);
    if (url.pathname === "/health") return Response.json({ ok: true, mode: "hex-tactics", rooms: rooms.size });
    if (url.pathname === "/ws") return srv.upgrade(req, { data: {} }) ? undefined : new Response("upgrade failed", { status: 400 });
    return serveStatic(url.pathname);
  },
  websocket: {
    message: onMessage,
    close(ws) {
      const { room: r, pid } = ws.data ?? {};
      if (!r || r.sockets.get(pid) !== ws) return;
      r.sockets.delete(pid);
      const w = r.world, p = w.players.get(pid);
      if (p) {
        setConnected(w, pid, false);
        // a phone that sleeps for 2 minutes leaves the party (its run state goes with it)
        p.dropTimer = setTimeout(() => { if (!w.players.get(pid)?.connected) { removePlayer(w, pid); broadcast(r); } }, 120_000);
      }
      broadcast(r);
      if (!r.sockets.size) r.idleTimer = setTimeout(() => { clearTimeout(r.foeTimer); rooms.delete(r.code); }, 30 * 60_000);
    },
  },
});
console.log(`King Mimic hex tactics on http://localhost:${server.port}`);
