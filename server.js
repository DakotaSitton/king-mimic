// King Mimic — networking layer. Game logic lives in game.js (pure, unit-tested).
// This file: rooms registry, the tick loop, WebSocket message routing, static serving.

import { readFileSync, appendFileSync } from "node:fs";
import { join, extname } from "node:path";
import { RULES, TOKENS, FOES, BOSSES, EQUIPMENT } from "./content.js";
import {
  LANES, newRoom, addPlayer, syncLobbyLanes, wearBody, swapBody, buyUnlock, buyKitSlot, snapshot, simulateTick,
  startLevel, beginCombat, advanceLevel, useItem, moveDepth,
  startDraft, growDraftWheel, chooseClass, draftPick, maybeFinishDraft, armEcho,
  addFoe, removeFoe, addGreedy, removeGreedy, commitStock, upTheAnte, claimLoot, dropItem, setTarget, setAllyTarget, cycleTarget, descend,
  proposeTrade, acceptTrade, declineTrade,
  buyShopItem, rerollShop, leaveShop,
  currentNode,
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

// ---------------------------------------------------------------------------
// TELEMETRY (owner ask 2026-06-12: "see what I'm always/never picking"). One JSONL line
// per event into telemetry.jsonl. OFFERS are logged alongside CHOICES so the report can
// compute pick RATES (picked / offered), not bare counts. God/DEMO rooms are skipped.
// Aggregate with: bun tools/telemetry-report.js
// ---------------------------------------------------------------------------
const TELEM_FILE = join(import.meta.dir, "telemetry.jsonl");
function telem(room, type, data = {}) {
  if (!room || room.god || room.telemOff) return;  // telemOff: test-harness rooms opt out (create {nt:true})
  try {
    appendFileSync(TELEM_FILE, JSON.stringify({
      ts: Date.now(), code: room.code, floor: room.floor ?? 1,
      party: room.players.size, type, ...data,
    }) + "\n");
  } catch {}
}
// Phase seams carry the offer-shaped events (the tick loop notices transitions ≤100ms
// after they happen, whether a message or the sim caused them).
function onPhaseChange(room, from, to) {
  if (to === "draft") telem(room, "run_start", {
    wheel: (room.draftWheel ?? []).map((b) => ({ body: b.bodyKey, items: b.items })),
  });
  if (to === "stock") telem(room, "palette_offer", {
    options: (room.foePalette ?? []).map((o) => ({ body: o.bodyKey, gear: o.gear ?? [] })),
    enchant: room.enchant?.key ?? null,
  });
  if (to === "shop") telem(room, "shop_offer", { wares: (room.shop?.wares ?? []).map((w) => w.key) });
  if (from === "playing" && (to === "won" || to === "lost")) {
    telem(room, "room_result", {
      result: to,
      roomType: currentNode(room)?.type ?? null,
      boss: room.boss?.bodyKey ?? null,
      ticks: room.tick - (room._combatStart ?? room.tick),
      caravan: room.caravan?.hp ?? null,
      uses: room.useCounts ?? {},                     // per-item presses this fight (AUTO included)
      stocked: (room.draftedFoes ?? []).map((f) => ({ body: f.bodyKey, gear: f.gear ?? [] })),
      lootOffered: room.loot ?? [],
      runWon: !!room.runWon,
    });
    if (to === "lost" || room.runWon) telem(room, "run_end", { result: room.runWon ? "won" : "lost" });
  }
  if (to === "playing") room._combatStart = room.tick;
}

function ensureTicking(room) {
  if (!room.handle) room.handle = setInterval(() => {
    room._telePhase ??= room.phase;
    simulateTick(room);
    if (room.phase !== room._telePhase) { onPhaseChange(room, room._telePhase, room.phase); room._telePhase = room.phase; }
    broadcastState(room);
  }, TICK_MS);
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

// SQUAD: bring a host seat to `bodies` bodies (1–4) = its piloted entity + (bodies-1) bot
// bodies it owns. Pre-run only — lane count / caravan lock at run start, and everything
// downstream (lanes, caravan, draft wheel) already scales off room.players.size, so adding
// bot entities is all it takes to "play as N players". Adds or trims bots to hit the count.
function spawnSquad(room, host, bodies) {
  if (room.level) return;
  const n = Math.max(1, Math.min(4, (bodies | 0) || 1));
  const bots = [...room.players.values()].filter((q) => q.bot && q.owner === host.id);
  let seq = bots.length;
  while (bots.length < n - 1)
    bots.push(addPlayer(room, `${host.id}-b${++seq}`, `${host.name} #${bots.length + 2}`, { bot: true, owner: host.id }));
  while (bots.length > n - 1) room.players.delete(bots.pop().id);
  syncLobbyLanes(room);
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
      // SQUAD possession: a seat can pilot any body it owns. `activeId` is the body its inputs
      // drive right now (its own primary by default); every player-action below routes to it,
      // so "I click a body, then I AM that body" needs no per-message body field.
      const actorId = (room && ws.data.activeId && room.players.has(ws.data.activeId)) ? ws.data.activeId : ws.data.id;

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
          r.telemOff = !!msg.nt;   // test harnesses create with nt:true — bot runs never pollute pick-rate data
          rooms.set(code, r);
          ws.data.roomCode = code;
          ws.data.id = `p${nextId++}`;
          const p = addPlayer(r, ws.data.id, msg.name);
          p.ws = ws;
          p.token = cleanToken(msg.token);
          // SQUAD: one human can hold several player-entities (bodies). The first is the
          // piloted body; the rest spawn as bots (auto-draft + fight on AUTO). The room then
          // treats the seat as `bodies` players for lanes/caravan/draft — all of which already
          // key off players.size. Live count is adjustable pre-run via {type:"setBodies"}.
          spawnSquad(r, p, msg.bodies);
          // owner 2026-06-19: rooms open STRAIGHT into the draft — no lobby staging board.
          // (god/DEMO rooms keep the old start-button path for playtesting.)
          if (!r.god) startDraft(r);
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
          spawnSquad(r, p, msg.bodies);               // joiners keep their chosen squad size (no lobby to set it in now)
          if (r.phase === "draft") growDraftWheel(r);  // a mid-draft arrival always has an open bundle to lock
          ensureTicking(r);
          ws.send(JSON.stringify({ type: "joined", code: r.code, you: p.id }));
          break;
        }
        case "start":
          if (!room) break;
          if (room.phase === "setup") beginCombat(room);
          // mid-flow phases advance through their own actions (stockBegin / advance / leaveShop),
          // never through `start` — guard them so a stray START can't blow away a live run.
          // Exception: a COMPLETE run (the King fell — runWon) restarts from the victory screen.
          else if (room.phase === "draft" || room.phase === "stock" || room.phase === "playing" || room.phase === "shop" || (room.phase === "won" && !room.runWon)) break;
          else if (room.god) startLevel(room);   // god mode skips the draft
          else startDraft(room);                  // lobby / lost / throne-won → draft a fresh run
          break;
        case "setBodies": {   // SQUAD: pick how many bodies you pilot this run (lobby only)
          const host = room?.players.get(ws.data.id);   // the SEAT owns the squad, not the active body
          if (host) spawnSquad(room, host, msg.n);
          break;
        }
        case "possess": {     // SQUAD: click a body you own → become it. Your inputs route here
          if (!room) break;   // (actorId follows activeId); the body you left resumes AUTO.
          const target = room.players.get(msg.id);
          if (!target || (target.owner ?? target.id) !== ws.data.id) break;  // only bodies THIS seat owns
          ws.data.activeId = target.id;
          // Un-piloted bodies always fight on AUTO (never idle); the piloted body restores ITS OWN
          // remembered mode (manualPref) — so re-selecting a body never wipes the AUTO/manual you
          // chose for it (owner bug 2026-06-18: "auto flips back to manual" was forcing manual here).
          for (const q of room.players.values())
            if ((q.owner ?? q.id) === ws.data.id) q.autoFire = q.id === target.id ? !q.manualPref : true;
          break;
        }
        case "stockAdd": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) {
            addGreedy(room, p, msg.idx | 0); // invite ONE greedy body into your own lane
            const f = [...(room.draftedFoes ?? [])].reverse().find((x) => x.owner === p.id);
            if (f) telem(room, "stock_pick", { body: f.bodyKey, gear: f.gear ?? [] });
          }
          break;
        }
        case "stockRemove": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) removeGreedy(room, p);           // remove your greedy pick
          break;
        }
        case "stockBegin": if (room) commitStock(room); break;
        case "upAnte":     if (room && upTheAnte(room)) telem(room, "up_ante", { min: room.anteMin, cap: room.anteCap }); break;
        case "summonSide": {                       // where YOUR summons enter the lane line
          const p = room?.players.get(actorId);
          if (p && (msg.side === "front" || msg.side === "back")) p.summonSide = msg.side;
          break;
        }
        case "autoFire": {  // sticky fire-mode preference: AUTO fires ready damaging items itself
          const p = room && room.players.get(actorId);
          if (p) { p.autoFire = !!msg.on; p.manualPref = !msg.on; }  // remember the choice so possess restores it
          break;
        }
        case "echoArm": {   // the echo body's button: full bar → player chooses to arm the double
          if (room) armEcho(room, room.players.get(actorId));
          break;
        }
        case "descend":    if (room) descend(room); break;
        case "claimLoot": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) {
            const had = p.draftPicks?.length ?? 0;
            claimLoot(room, p, msg.key);
            if ((p.draftPicks?.length ?? 0) > had) telem(room, "loot_claim", { key: msg.key });
          }
          break;
        }
        case "dropItem": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) dropItem(room, p, msg.key);
          break;
        }
        case "proposeTrade": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) proposeTrade(room, p, msg.to, msg.give, msg.want); // offer your item for theirs
          break;
        }
        case "acceptTrade": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) acceptTrade(room, p, msg.offer);  // the target accepts → swap + settle
          break;
        }
        case "declineTrade": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) declineTrade(room, p, msg.offer);
          break;
        }
        case "chooseClass": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) chooseClass(room, p, msg.key);
          break;
        }
        case "draftPick": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) {
            draftPick(room, p, msg.bundle); // lock a wheel bundle (body + 3 items), exclusive
            if (p.drafted) telem(room, "draft_pick", { body: p.bodyKey, items: p.draftPicks ?? [] });
          }
          break;
        }
        case "advance":
          if (room) advanceLevel(room, msg.to);
          break;
        case "lane": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (!p) break;
          const last = (room.laneCount ?? LANES) - 1;
          if (msg.dir === "up") p.lane = Math.max(0, p.lane - 1);
          else if (msg.dir === "down") p.lane = Math.min(last, p.lane + 1);
          else if (typeof msg.lane === "number") p.lane = Math.max(0, Math.min(last, msg.lane));
          break;
        }
        case "move": {   // step forward/back in the lane's depth line (block for allies / drop back)
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) moveDepth(room, p, msg.dir === "back" ? "back" : "fwd");
          break;
        }
        case "use": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) useItem(room, p, msg.slot | 0);
          break;
        }
        case "target": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) setTarget(room, p, msg.foeId ?? null);
          break;
        }
        case "allyTarget": {  // V2 §4.1: the support slot — click an ally to aim heals
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) setAllyTarget(room, p, msg.playerId ?? null);
          break;
        }
        case "cycleTarget": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) cycleTarget(room, p, msg.dir === -1 ? -1 : 1);
          break;
        }
        case "swapBody": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) {
            const was = p.bodyKey;
            swapBody(room, p, msg.to ?? null); // exclusive trade through the pool (pure logic in game.js)
            if (p.bodyKey !== was) telem(room, "body_swap", { from: was, to: p.bodyKey });
          }
          break;
        }
        case "buyUnlock": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p && buyUnlock(room, p, msg.gold | 0)) telem(room, "unlock_buy", { gold: msg.gold | 0 });
          break;
        }
        case "buyKitSlot": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) buyKitSlot(room, p); // "level up": spend YOUR wallet to grow your kit space
          break;
        }
        case "buyShopItem": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p && buyShopItem(room, p, msg.key)) telem(room, "shop_buy", { key: msg.key }); // buy a shop ware into your kit
          break;
        }
        case "rerollShop": {
          if (!room) break;
          const p = room.players.get(actorId);
          if (p) rerollShop(room, p);
          break;
        }
        case "leaveShop":  if (room) leaveShop(room, msg.to); break;
      }
    },
    close(ws) {
      const room = ws.data.roomCode ? rooms.get(ws.data.roomCode) : null;
      if (!room) return;
      const seat = room.players.get(ws.data.id);   // close operates on the SEAT, not any possessed body
      if (seat && seat.ws && seat.ws !== ws) return; // stale socket — a reconnect already reclaimed this seat
      if (seat && seat.token && room.level) {
        // Mid-run: hold the seat so a phone-lock/refresh can come back. (Lobby/draft drops
        // still remove the player — a pre-run leaver shouldn't strand the draft.)
        seat.ws = null;
        maybeReapRoom(room);
        return;
      }
      room.players.delete(ws.data.id);
      // …and take this seat's squad bots with it — orphaned bots would keep the room non-empty forever.
      for (const [bid, b] of [...room.players]) if (b.bot && b.owner === ws.data.id) room.players.delete(bid);
      syncLobbyLanes(room);   // out of a run, the board preview shrinks with the party (no-op mid-run)
      maybeFinishDraft(room); // a leaver shouldn't strand the rest mid-draft
      maybeStopRoom(room);
    },
  },
});

console.log(`King Mimic running → http://localhost:${server.port}`);
