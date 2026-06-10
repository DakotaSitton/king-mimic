// King Mimic — networking layer. Game logic lives in game.js (pure, unit-tested).
// This file: rooms registry, the tick loop, WebSocket message routing, static serving.

import { readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { RULES, TOKENS, FOES, BOSSES, EQUIPMENT } from "./content.js";
import {
  LANES, newRoom, addPlayer, syncLobbyLanes, wearBody, swapBody, buyTier, buyKitSlot, snapshot, simulateTick,
  startLevel, beginCombat, advanceLevel, useItem, moveDepth,
  startDraft, chooseClass, draftPick, maybeFinishDraft,
  addFoe, removeFoe, addGreedy, removeGreedy, commitStock, claimLoot, dropItem, setTarget, setAllyTarget, cycleTarget, descend,
  proposeTrade, acceptTrade, declineTrade,
  buyShopItem, rerollShop, leaveShop,
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

// Mid-run a dropped socket HOLDS its seat (phones lock, tabs refresh) — the room keeps ticking.
// But a room where every seat is socketless gets a grace window, then is reaped, so an
// abandoned run doesn't tick forever.
const REAP_MS = 5 * 60_000;
function maybeReapRoom(room) {
  if (room.reapTimer || [...room.players.values()].some((p) => p.ws)) return;
  room.reapTimer = setTimeout(() => {
    room.reapTimer = null;
    if ([...room.players.values()].some((p) => p.ws)) return; // someone made it back
    if (room.handle) clearInterval(room.handle);
    rooms.delete(room.code);
  }, REAP_MS);
}
function cancelReap(room) {
  if (room.reapTimer) { clearTimeout(room.reapTimer); room.reapTimer = null; }
}
const cleanToken = (t) => (typeof t === "string" && t ? t.slice(0, 64) : null);

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
          p.token = cleanToken(msg.token);
          ensureTicking(r);
          ws.send(JSON.stringify({ type: "joined", code, you: p.id }));
          break;
        }
        case "join": {
          const r = rooms.get((msg.code || "").toUpperCase());
          if (!r) { ws.send(JSON.stringify({ type: "error", message: "No such room" })); return; }
          cancelReap(r);
          // RECONNECT: a token matching a seated player reclaims that seat (phone lock,
          // refresh, Wi-Fi blip). The newest socket wins; any stale one is closed.
          const tok = cleanToken(msg.token);
          const seat = tok ? [...r.players.values()].find((q) => q.token === tok) : null;
          if (seat) {
            const stale = seat.ws;
            seat.ws = ws;
            ws.data.roomCode = r.code;
            ws.data.id = seat.id;
            if (stale && stale !== ws) { try { stale.close(); } catch {} }
            ensureTicking(r);
            ws.send(JSON.stringify({ type: "joined", code: r.code, you: seat.id }));
            break;
          }
          ws.data.roomCode = r.code;
          ws.data.id = `p${nextId++}`;
          const p = addPlayer(r, ws.data.id, msg.name);
          p.ws = ws;
          p.token = tok;
          ensureTicking(r);
          ws.send(JSON.stringify({ type: "joined", code: r.code, you: p.id }));
          break;
        }
        case "start":
          if (!room) break;
          if (room.phase === "setup") beginCombat(room);
          // mid-flow phases advance through their own actions (stockBegin / advance / leaveShop),
          // never through `start` — guard them so a stray START can't blow away a live run.
          else if (room.phase === "draft" || room.phase === "stock" || room.phase === "playing" || room.phase === "shop" || room.phase === "won") break;
          else if (room.god) startLevel(room);   // god mode skips the draft
          else startDraft(room);                  // lobby / lost → draft a fresh run
          break;
        case "stockAdd": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) addGreedy(room, p, msg.idx | 0); // invite ONE greedy body into your own lane
          break;
        }
        case "stockRemove": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) removeGreedy(room, p);           // remove your greedy pick
          break;
        }
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
        case "proposeTrade": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) proposeTrade(room, p, msg.to, msg.give, msg.want); // offer your item for theirs
          break;
        }
        case "acceptTrade": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) acceptTrade(room, p, msg.offer);  // the target accepts → swap + settle
          break;
        }
        case "declineTrade": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) declineTrade(room, p, msg.offer);
          break;
        }
        case "chooseClass": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) chooseClass(room, p, msg.key);
          break;
        }
        case "draftPick": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) draftPick(room, p, msg.bundle); // lock a wheel bundle (body + 3 items), exclusive
          break;
        }
        case "advance":
          if (room) advanceLevel(room, msg.to);
          break;
        case "lane": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (!p) break;
          const last = (room.laneCount ?? LANES) - 1;
          if (msg.dir === "up") p.lane = Math.max(0, p.lane - 1);
          else if (msg.dir === "down") p.lane = Math.min(last, p.lane + 1);
          else if (typeof msg.lane === "number") p.lane = Math.max(0, Math.min(last, msg.lane));
          break;
        }
        case "move": {   // step forward/back in the lane's depth line (block for allies / drop back)
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) moveDepth(room, p, msg.dir === "back" ? "back" : "fwd");
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
        case "allyTarget": {  // V2 §4.1: the support slot — click an ally to aim heals
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) setAllyTarget(room, p, msg.playerId ?? null);
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
          const p = room.players.get(ws.data.id);
          if (p) buyTier(room, p, msg.ante | 0); // spend YOUR wallet to unlock a whole body tier
          break;
        }
        case "buyKitSlot": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) buyKitSlot(room, p); // "level up": spend YOUR wallet to grow your kit space
          break;
        }
        case "buyShopItem": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) buyShopItem(room, p, msg.key); // buy a shop ware into your kit
          break;
        }
        case "rerollShop": {
          if (!room) break;
          const p = room.players.get(ws.data.id);
          if (p) rerollShop(room, p);
          break;
        }
        case "leaveShop":  if (room) leaveShop(room, msg.to); break;
      }
    },
    close(ws) {
      const room = ws.data.roomCode ? rooms.get(ws.data.roomCode) : null;
      if (!room) return;
      const p = room.players.get(ws.data.id);
      if (p && p.ws && p.ws !== ws) return; // stale socket — a reconnect already reclaimed this seat
      if (p && p.token && room.level) {
        // Mid-run: hold the seat so a phone-lock/refresh can come back. (Lobby/draft drops
        // still remove the player — a pre-run leaver shouldn't strand the draft.)
        p.ws = null;
        maybeReapRoom(room);
        return;
      }
      room.players.delete(ws.data.id);
      syncLobbyLanes(room);   // out of a run, the board preview shrinks with the party (no-op mid-run)
      maybeFinishDraft(room); // a leaver shouldn't strand the rest mid-draft
      maybeStopRoom(room);
    },
  },
});

console.log(`King Mimic running → http://localhost:${server.port}`);
