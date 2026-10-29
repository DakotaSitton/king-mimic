// King Mimic — FLICK mode server (branch claude/flick-deckbuilder). Separate entry from server.js /
// rt-server.js / tac-server.js — those modes are untouched.
//   bun run flick-server.js          → http://localhost:3214   (PORT env overrides)
// Solo play needs nothing from the server but files: the run is simulated in the page.
// Co-op: open /?room=CODE on up to four phones. The server runs that room's run with the very same
// engine/flick/sim.js and streams each phone its view (~20 snapshots/s, engine/flick/net.js). Phones
// move their own mimic instantly and report it; the server checks every step (sim.netMove).

import { join, normalize, extname, sep } from "path";
import { existsSync, statSync } from "fs";
import { createRun, joinRun, setAway, removePlayer, netMove, play, takeCard, wear, closeReward, step, DT } from "./engine/flick/sim.js";
import { initFor, snapFor } from "./engine/flick/net.js";
import { BODIES, CARDS, TUNING } from "./engine/flick/content.js";

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
    let rel;
    try { rel = decodeURIComponent(pathname.slice(prefix.length)); } catch { return null; }   // malformed %-escape → 404, not 500
    const full = normalize(join(dir, rel));
    return full.startsWith(dir + sep) ? full : null;     // no ../ escapes out of the served folders
  }
  return null;
}

// ---------------------------------------------------------------- co-op rooms
const TICK_MS = 50, AWAY_DROP_MS = 45000, ROOM_IDLE_MS = 10 * 60000;
const rooms = new Map();   // code → { code, S, clients: Map<cid, {ws, cur}>, timer, idleSince, dropTimers }
const clean = (s, n) => String(s ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, n);

function roomFor(code) {
  let r = rooms.get(code);
  if (!r) { r = { code, S: null, clients: new Map(), timer: null, idleSince: 0, dropTimers: new Map() }; rooms.set(code, r); }
  return r;
}
function send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch { /* socket closing */ } }
function lobbyMsg(r) {
  const ps = r.S ? r.S.ents.filter((e) => e.kind === "player") : [];
  return { t: "lobby", room: r.code, running: !!r.S, phase: r.S?.phase ?? null, max: TUNING.maxPlayers,
    players: ps.map((p) => ({ name: p.name, body: p.body, color: p.color, down: p.dead, away: !!p.away })) };
}
function startTicking(r) {
  if (r.timer) return;
  r.timer = setInterval(() => {
    try {
      if (r.S) { for (let i = 0; i < Math.round(TICK_MS / 1000 / DT); i++) step(r.S, DT); }
      for (const [cid, c] of r.clients) {
        if (r.S && c.joined) send(c.ws, snapFor(r.S, cid, c.cur));
        else if ((c.lobbyN = (c.lobbyN ?? 0) + 1) % 10 === 1) send(c.ws, lobbyMsg(r));
      }
      if (!r.clients.size) {
        if (!r.idleSince) r.idleSince = Date.now();
        if (Date.now() - r.idleSince > ROOM_IDLE_MS) { clearInterval(r.timer); rooms.delete(r.code); }
      } else r.idleSince = 0;
    } catch (err) { console.error(`[room ${r.code}] tick failed:`, err); }
  }, TICK_MS);
}
function validJoin(m) {
  if (!BODIES[m?.body]?.starter || !Array.isArray(m.deck)) return false;
  const deck = m.deck.filter((k) => CARDS[k] && !CARDS[k].hidden);
  return new Set(deck).size === TUNING.deckSize && deck.length === TUNING.deckSize;
}
function onMessage(ws, raw) {
  const { code, cid } = ws.data;
  const r = rooms.get(code); if (!r) return;
  let m; try { m = JSON.parse(raw); } catch { return; }
  if (!m || typeof m !== "object") return;
  const c = r.clients.get(cid); if (!c || c.ws !== ws) return;
  const S = r.S;
  switch (m.t) {
    case "join": {
      if (!validJoin(m)) return send(ws, { t: "error", why: "bad deck" });
      if (!r.S || r.S.phase !== "play") {
        // a fresh run; anyone still looking at the last one's end screen goes back to pick a body
        if (r.S) for (const [ocid, o] of r.clients) if (ocid !== cid && o.joined) send(o.ws, { t: "reset" });
        r.S = createRun({ seed: (Math.random() * 2147483646 + 1) | 0 });
        for (const o of r.clients.values()) o.joined = false;
      }
      const e = joinRun(r.S, { id: cid, body: m.body, deck: m.deck, name: clean(m.name, 16) });
      if (!e) return send(ws, { t: "full" });
      c.joined = true; c.cur = { fxN: r.S.fxN ?? 0, seen: new Uint8Array(r.S.seen) };
      send(ws, initFor(r.S, cid));
      clearTimeout(r.dropTimers.get(cid));
      return;
    }
    case "move": if (S && c.joined) netMove(S, cid, m); return;
    case "play": if (S && c.joined) play(S, cid, m.slot | 0, m.aim); return;
    case "take": if (S && c.joined) takeCard(S, cid, String(m.key)); return;
    case "wear": if (S && c.joined) wear(S, cid, String(m.key)); return;
    case "close": if (S && c.joined) closeReward(S, cid); return;
    case "again": {
      if (!S || S.phase === "play") return;
      r.S = null;
      for (const o of r.clients.values()) { o.joined = false; send(o.ws, { t: "reset" }); }
      return;
    }
  }
}

const server = Bun.serve({
  port: PORT,
  fetch(req, srv) {
    const url = new URL(req.url), { pathname } = url;
    if (pathname === "/health") return new Response("ok");
    if (pathname === "/ws") {
      const code = clean(url.searchParams.get("room"), 8).toUpperCase(), cid = clean(url.searchParams.get("cid"), 24);
      if (!code || !cid) return new Response("room and cid required", { status: 400 });
      return srv.upgrade(req, { data: { code, cid } }) ? undefined : new Response("upgrade failed", { status: 400 });
    }
    const f = fileFor(pathname);
    if (!f || !existsSync(f) || !statSync(f).isFile()) return new Response("Not found", { status: 404 });
    return new Response(Bun.file(f), { headers: { "content-type": TYPES[extname(f)] ?? "application/octet-stream", "cache-control": "no-store" } });
  },
  websocket: {
    open(ws) {
      const { code, cid } = ws.data, r = roomFor(code);
      const prev = r.clients.get(cid);
      if (prev && prev.ws !== ws) send(prev.ws, { t: "replaced" });
      const back = !!r.S?.ents.find((e) => e.kind === "player" && e.pid === cid);
      r.clients.set(cid, { ws, joined: back, cur: r.S ? { fxN: r.S.fxN ?? 0, seen: new Uint8Array(r.S.seen.length) } : null });
      clearTimeout(r.dropTimers.get(cid));
      if (back) { setAway(r.S, cid, false); send(ws, initFor(r.S, cid)); r.clients.get(cid).cur.seen.set(r.S.seen); }
      send(ws, lobbyMsg(r));
      startTicking(r);
    },
    message: (ws, raw) => onMessage(ws, raw),
    close(ws) {
      const { code, cid } = ws.data, r = rooms.get(code); if (!r) return;
      const c = r.clients.get(cid);
      if (!c || c.ws !== ws) return;            // a newer tab already took this seat
      r.clients.delete(cid);
      if (r.S) {
        setAway(r.S, cid, true);
        // a phone that doesn't come back within the grace period leaves the party for good
        r.dropTimers.set(cid, setTimeout(() => { if (!r.clients.has(cid) && r.S) removePlayer(r.S, cid); }, AWAY_DROP_MS));
      }
    },
  },
});
console.log(`King Mimic — Flick on http://localhost:${server.port}`);
