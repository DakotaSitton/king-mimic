// Public WebSocket admission-envelope regression. Start a private server with tight test limits:
//   KM_ALLOWED_ORIGINS=https://allowed.example KM_MAX_MESSAGE_BYTES=128 KM_MESSAGE_LIMIT=10
//   KM_MESSAGE_WINDOW_MS=10000 KM_MAX_ACTIVE_ROOMS=1 KM_MAX_HUMAN_SEATS=2 PORT=3997 bun server.js
//   BASE=http://127.0.0.1:3997 node test/admission.test.js
import net from "node:net";
import crypto from "node:crypto";

const BASE = process.env.BASE ?? "http://127.0.0.1:3997";
const target = new URL(BASE);
const WS_URL = BASE.replace(/^http/, "ws") + "/ws";
let pass = 0;
const ok = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  pass++;
  console.log(`PASS: ${label}`);
};

function rawUpgrade(origin, forwardedHost = null) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: target.hostname, port: Number(target.port) });
    const timer = setTimeout(() => { socket.destroy(); reject(new Error("upgrade timeout")); }, 4000);
    let response = "";
    socket.on("connect", () => socket.write([
      "GET /ws HTTP/1.1", `Host: ${target.host}`, "Connection: Upgrade", "Upgrade: websocket",
      `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString("base64")}`, "Sec-WebSocket-Version: 13",
      ...(forwardedHost ? [`X-Forwarded-Host: ${forwardedHost}`] : []),
      ...(origin ? [`Origin: ${origin}`] : []), "", "",
    ].join("\r\n")));
    socket.on("data", (chunk) => {
      response += chunk;
      if (!response.includes("\r\n\r\n")) return;
      clearTimeout(timer);
      socket.destroy();
      resolve(Number(response.match(/^HTTP\/1\.1 (\d+)/)?.[1] ?? 0));
    });
    socket.on("error", (error) => { clearTimeout(timer); reject(error); });
  });
}

function openSocket() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timer = setTimeout(() => { try { ws.close(); } catch {} reject(new Error("websocket open timeout")); }, 4000);
    ws.addEventListener("open", () => { clearTimeout(timer); resolve(ws); }, { once: true });
    ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("websocket open error")); }, { once: true });
  });
}

function nextMessage(ws, predicate, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error(`${label} timeout`)); }, 5000);
    const onMessage = (event) => {
      let message; try { message = JSON.parse(event.data); } catch { return; }
      if (!predicate(message)) return;
      cleanup(); resolve(message);
    };
    const onClose = () => { cleanup(); reject(new Error(`${label} socket closed early`)); };
    const cleanup = () => {
      clearTimeout(timer);
      ws.removeEventListener("message", onMessage);
      ws.removeEventListener("close", onClose);
    };
    ws.addEventListener("message", onMessage);
    ws.addEventListener("close", onClose, { once: true });
  });
}

function closeEvent(ws, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} close timeout`)), 5000);
    ws.addEventListener("close", (event) => { clearTimeout(timer); resolve(event); }, { once: true });
    ws.addEventListener("error", () => {}, { once: true }); // a policy close may also surface as error
  });
}

// Browser upgrades: same/current host and the explicit operator list pass; foreign browser origins fail.
ok(await rawUpgrade(null) === 101, "headerless probe/client upgrade is preserved");
ok(await rawUpgrade(BASE) === 101, "same-host browser Origin is accepted");
ok(await rawUpgrade("https://game.example", "game.example") === 101, "tunnel/proxy forwarded host preserves same-origin upgrade");
ok(await rawUpgrade("https://allowed.example") === 101, "KM_ALLOWED_ORIGINS entry is accepted");
ok(await rawUpgrade("https://evil.example") === 403, "cross-origin browser upgrade is rejected");

const sockets = [];
try {
  const creator = await openSocket(); sockets.push(creator);
  let pending = nextMessage(creator, (message) => message.type === "joined", "room create");
  creator.send(JSON.stringify({ type: "create", name: "Host", token: "host-reconnect", nt: true }));
  const created = await pending;
  ok(!!created.code, "first room is admitted");

  pending = nextMessage(creator, (message) => message.type === "error", "repeated membership");
  creator.send(JSON.stringify({ type: "join", code: created.code, name: "Duplicate" }));
  const repeated = await pending;
  ok(/Already in room/.test(repeated.message), "socket cannot create/join while already in a room");

  const extraRoom = await openSocket(); sockets.push(extraRoom);
  pending = nextMessage(extraRoom, (message) => message.type === "error", "active-room cap");
  extraRoom.send(JSON.stringify({ type: "create", name: "Overflow", nt: true }));
  const roomCap = await pending;
  ok(/active-room capacity/.test(roomCap.message), "global active-room ceiling rejects excess creation");

  const second = await openSocket(); sockets.push(second);
  pending = nextMessage(second, (message) => message.type === "joined", "second human seat");
  second.send(JSON.stringify({ type: "join", code: created.code, name: "Second" }));
  await pending;
  ok(true, "room admits a human seat up to its configured ceiling");

  const third = await openSocket(); sockets.push(third);
  pending = nextMessage(third, (message) => message.type === "error", "human-seat cap");
  third.send(JSON.stringify({ type: "join", code: created.code, name: "Third" }));
  const seatCap = await pending;
  ok(/Room is full/.test(seatCap.message), "per-room human-seat ceiling rejects a new seat");

  const originalId = created.you;
  // Reconnect before the stale transport's close event arrives, matching a refresh/phone-resume race.
  // The newest socket must reclaim the existing token seat before capacity is considered.
  const reconnect = await openSocket(); sockets.push(reconnect);
  pending = nextMessage(reconnect, (message) => message.type === "joined", "at-cap reconnect");
  reconnect.send(JSON.stringify({ type: "join", code: created.code, name: "Ignored", token: "host-reconnect" }));
  const reclaimed = await pending;
  ok(reclaimed.you === originalId, "matching token reconnects even when the room is at its seat ceiling");

  const rate = await openSocket(); sockets.push(rate);
  const rateClosed = closeEvent(rate, "rate policy");
  for (let index = 0; index < 12; index++) rate.send(JSON.stringify({ type: "unknown", index }));
  const rateEvent = await rateClosed;
  ok(rateEvent.code === 1008, "per-socket message excess closes with policy code 1008");

  const oversized = await openSocket(); sockets.push(oversized);
  const oversizedClosed = closeEvent(oversized, "oversize policy");
  oversized.send("x".repeat(256));
  const oversizedEvent = await oversizedClosed;
  // Bun enforces maxPayloadLength before message(); on Windows that transport rejection currently
  // surfaces to the client as 1006 rather than a framed 1009. Either is a rejected/closed connection.
  ok(oversizedEvent.code !== 1000 && oversizedEvent.code !== 1001,
    `oversize inbound payload is rejected and closed (${oversizedEvent.code})`);
} finally {
  for (const ws of sockets) try { ws.close(); } catch {}
}

console.log(`ADMISSION: ${pass} passed, 0 failed`);
