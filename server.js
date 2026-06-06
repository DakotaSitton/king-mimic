// King Mimic — networking layer. Game logic lives in game.js (pure, unit-tested).
// This file: rooms registry, the tick loop, WebSocket message routing, static serving.

import { readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { RULES, TOKENS, FOES, BOSSES, EQUIPMENT } from "./content.js";
import {
  LANES, newRoom, addPlayer, wearBody, swapBody, buyTier, snapshot, simulateTick,
  startLevel, beginCombat, advanceLevel, useItem,
  startDraft, chooseClass, maybeFinishDraft,
  addFoe, removeFoe, commitStock, claimLoot, dropItem, setTarget, cycleTarget, descend,
} from "./game.js";

const PORT = Number(process.env.PORT ?? 3000);
const TICK_MS = 100;

/** @type {Map<string, any>} */
const rooms = new Map();
let nextId = 1;

function makeRoomCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

function broadcastState(room) {
  const msg = JSON.stringify(snapshot(room));
  for (const p of room.players.values()) { try { p.ws?.send(msg); } catch {} }
}

function ensureTicking(room) {
  if (!room.handle) room.handle = setInterval(() => { simulateTick(room); broadcastState(room); }, TICK_MS);
}

function maybeStopRoom(room) {
  if (room.players.size === 0) {
    if (room.handle) clearInterval(room.handle);
    rooms.delete(room.code);
  }
}

// ---------------------------------------------------------------------------
// Static file serving + WS upgrade
// ---------------------------------------------------------------------------
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png",
};
const PUBLIC = join(import.meta.dir, "public");

function serveStatic(path) {
  const file = path === "/" ? "/index.html" : path;
  try {
    const body = readFileSync(join(PUBLIC, file));
    return new Response(body, { headers: {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store", // dev: always serve fresh assets so iteration isn't fought by stale browser cache
    } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/content") {
      return Response.json({ rules: RULES, tokens: TOKENS, foes: FOES, bosses: BOSSES, equipment: EQUIPMENT });
    }
    if (url.pathname === "/ws") {
      const ok = server.upgrade(req, { data: { id: nextId++, roomCode: null } });
      return ok ? undefined : new Response("Upgrade failed", { status: 400 });
    }
    return serveStatic(url.pathname);
  },
  websocket: {
    open() {},
    message(ws, raw) {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      const room = ws.data.roomCode ? rooms.get(ws.data.roomCode) : null;

      switch (msg.type) {
        case "create": {
          let code = (msg.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
          if (code) {
            if (rooms.has(code)) {
              ws.send(JSON.stringify({ type: "error", message: "That room name is taken — pick another or leave it blank." }));
              return;
            }
          } else {
            code = makeRoomCode();
          }
          const r = newRoom(code);
          rooms.set(code, r);
          ws.data.roomCode = code;
          ws.data.id = `p${nextId++}`;
          const p = addPlayer(r, ws.data.id, msg.name);
          p.ws = ws;
          ensureTicking(r);
          ws.send(JSON.stringify({ type: "joined", code, you: p.id }));
          break;
        }
        case "join": {
          const r = rooms.get((msg.code || "").toUpperCase());
          if (!r) { ws.send(JSON.stringify({ type: "error", message: "No such room" })); return; }
          ws.data.roomCode = r.code;
          ws.data.id = `p${nextId++}`;
          const p = addPlayer(r, ws.data.id, msg.name);
          p.ws = ws;
          ensureTicking(r);
          ws.send(JSON.stringify({ type: "joined", code: r.code, you: p.id }));
          break;
        }
        case "start":
          if (!room) break;
          if (room.phase === "setup") beginCombat(room);
          else if (room.phase === "draft" || room.phase === "stock" || room.phase === "playing") break;
          else if (room.god) startLevel(room);   // god mode skips the draft
          else startDraft(room);                  // lobby / won / lost → draft a fresh run
          break;
        case "stockAdd":   if (room) addFoe(room, msg.idx | 0); break;
        case "stockRemove":if (room) removeFoe(room, msg.i | 0); break;
        case "stockBegin": if (room) commitStock(room); break;
        case "descend":    if (room) descend(room); break;
        case "claimLoot": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) claimLoot(room, p, msg.key);
          break;
        }
        case "dropItem": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) dropItem(room, p, msg.key);
          break;
        }
        case "chooseClass": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) chooseClass(room, p, msg.key);
          break;
        }
        case "advance":
          if (room) advanceLevel(room, msg.to);
          break;
        case "lane": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (!p) break;
          if (msg.dir === "up") p.lane = Math.max(0, p.lane - 1);
          else if (msg.dir === "down") p.lane = Math.min(LANES - 1, p.lane + 1);
          else if (typeof msg.lane === "number") p.lane = Math.max(0, Math.min(LANES - 1, msg.lane));
          break;
        }
        case "use": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) useItem(room, p, msg.slot | 0);
          break;
        }
        case "target": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) setTarget(room, p, msg.foeId ?? null);
          break;
        }
        case "cycleTarget": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) cycleTarget(room, p, msg.dir === -1 ? -1 : 1);
          break;
        }
        case "swapBody": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) swapBody(room, p, msg.to ?? null); // exclusive trade through the pool (pure logic in game.js)
          break;
        }
        case "buyTier": {
          if (!room) break;
          buyTier(room, msg.ante | 0); // spend shared Treasure to unlock a whole body tier
          break;
        }
      }
    },
    close(ws) {
      const room = ws.data.roomCode ? rooms.get(ws.data.roomCode) : null;
      if (room) {
        room.players.delete(ws.data.id);
        maybeFinishDraft(room); // a leaver shouldn't strand the rest mid-draft
        maybeStopRoom(room);
      }
    },
  },
});

console.log(`King Mimic running → http://localhost:${server.port}`);
