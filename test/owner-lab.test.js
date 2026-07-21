// Authenticated production owner-lab regression. This starts a private real server so the test
// covers the WebSocket trust boundary, deterministic room naming, persisted reconnect, and the
// exact server-authored draft rather than only calling helpers in-process.
import { createServer } from "node:net";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as G from "../game.js";
import { nextOwnerLabRoomCode, ownerLabAuthorized } from "../server.js";

let passed = 0;
const ok = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  passed++;
  console.log(`PASS: ${label}`);
};

const SECRET = "owner-lab-test-secret-7b63cf79";
const scratch = mkdtempSync(join(tmpdir(), "km-owner-lab-"));
let child = null;
let base = null;
const sockets = [];

async function freePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => probe.listen(0, "127.0.0.1", resolve).once("error", reject));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function startPrivateServer(port) {
  const proc = Bun.spawn([process.execPath, "run", "server.js"], {
    cwd: join(import.meta.dir, ".."),
    env: {
      ...process.env,
      PORT: String(port),
      KM_DATA_DIR: scratch,
      KM_OWNER_LAB_KEY: SECRET,
      KM_RUN_SAVE_MS: "250",
      KM_MAX_ACTIVE_ROOMS: "32",
      KM_MAX_HUMAN_SEATS: "4",
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const base = `http://127.0.0.1:${port}`;
  for (let tries = 0; tries < 80; tries++) {
    try { if ((await fetch(base + "/health")).ok) return { proc, base }; } catch {}
    await Bun.sleep(50);
  }
  const output = await new Response(proc.stderr).text();
  throw new Error(`private server did not become healthy: ${output}`);
}

function openClient(base) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(base.replace(/^http/, "ws") + "/ws");
    const queued = [];
    const waiters = [];
    const timer = setTimeout(() => reject(new Error("WebSocket open timeout")), 4_000);
    const api = {
      ws,
      send: (message) => ws.send(JSON.stringify(message)),
      next(predicate, label) {
        const ready = queued.findIndex(predicate);
        if (ready >= 0) return Promise.resolve(queued.splice(ready, 1)[0]);
        return new Promise((res, rej) => {
          const timeout = setTimeout(() => {
            const index = waiters.findIndex((entry) => entry.resolve === res);
            if (index >= 0) waiters.splice(index, 1);
            rej(new Error(`${label} timeout`));
          }, 5_000);
          waiters.push({ predicate, resolve: (value) => { clearTimeout(timeout); res(value); } });
        });
      },
    };
    ws.addEventListener("open", () => { clearTimeout(timer); sockets.push(ws); resolve(api); }, { once: true });
    ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("WebSocket open error")); }, { once: true });
    ws.addEventListener("message", (event) => {
      let message; try { message = JSON.parse(event.data); } catch { return; }
      const index = waiters.findIndex((entry) => entry.predicate(message));
      if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
      else queued.push(message);
    });
  });
}

async function create(client, message) {
  client.send({ type: "create", name: "Owner Lab Test", token: message.token, ...message });
  const joined = await client.next((row) => row.type === "joined", "joined");
  const state = await client.next((row) => row.type === "state", "initial state");
  return { joined, state };
}

try {
  ok(ownerLabAuthorized(SECRET, SECRET) && !ownerLabAuthorized("wrong", SECRET)
    && !ownerLabAuthorized(SECRET, "") && !ownerLabAuthorized("short", "short"),
    "owner authorization is exact and fails closed for absent or weak environment keys");
  ok(nextOwnerLabRoomCode((code) => code === "OWNERLAB") === "LAB00001",
    "owner room collision chooses the first deterministic numbered code");
  ok(G.WEARABLE_BODIES.length === 46 && new Set(G.WEARABLE_BODIES).size === 46,
    "the canonical wearable roster contains 46 unique non-boss bodies");

  const port = await freePort();
  ({ proc: child, base } = await startPrivateServer(port));

  // Occupy the friendly stable name through the ordinary public path, then prove owner creation
  // neither overwrites nor promotes it.
  const publicHost = await openClient(base);
  const publicCreated = await create(publicHost, { code: "OWNERLAB", token: "public-host" });
  ok(publicCreated.joined.code === "OWNERLAB" && !publicCreated.state.ownerLab
    && publicCreated.state.draft.wheel.length === 3, "ordinary custom room remains an ordinary three-offer draft");

  const guest = await openClient(base);
  guest.send({ type: "join", code: "OWNERLAB", name: "Guest", token: "guest", ownerLabKey: SECRET });
  await guest.next((row) => row.type === "joined", "public-room join");
  const publicAfterJoin = await guest.next((row) => row.type === "state", "public-room state after join");
  const publicOfferCounts = [...new Set(publicAfterJoin.draft.wheel.map((offer) => offer.offeredTo))]
    .map((id) => publicAfterJoin.draft.wheel.filter((offer) => offer.offeredTo === id).length);
  ok(!publicAfterJoin.ownerLab && publicOfferCounts.every((count) => count === 3),
    "a credential on join cannot promote an existing public room");

  const missing = await openClient(base);
  const missingCreated = await create(missing, { token: "missing-key" });
  const wrong = await openClient(base);
  const wrongCreated = await create(wrong, { token: "wrong-key", ownerLabKey: "not-the-secret" });
  ok(!missingCreated.state.ownerLab && !wrongCreated.state.ownerLab
    && missingCreated.state.draft.wheel.length === 3 && wrongCreated.state.draft.wheel.length === 3
    && Object.keys(missingCreated.joined).sort().join() === Object.keys(wrongCreated.joined).sort().join(),
    "missing and wrong credentials are indistinguishable from ordinary public creation");

  const owner = await openClient(base);
  const ownerCreated = await create(owner, {
    code: "CLIENTFLAG", token: "owner-reconnect", ownerLabKey: SECRET, source: "itch",
  });
  const serializedReply = JSON.stringify([ownerCreated.joined, ownerCreated.state]);
  ok(ownerCreated.joined.code === "LAB00001" && ownerCreated.state.ownerLab === true
    && !serializedReply.includes(SECRET), "valid auth creates the labeled deterministic owner room without returning its credential");
  const offers = ownerCreated.state.draft.wheel;
  ok(offers.length === G.WEARABLE_BODIES.length
    && new Set(offers.map((offer) => offer.bodyKey)).size === G.WEARABLE_BODIES.length
    && G.WEARABLE_BODIES.every((body) => offers.some((offer) => offer.bodyKey === body)),
    "the owner draft offers every wearable body exactly once to the active body");
  ok(offers.every((offer) => offer.items.length === G.MIN_DECK
    && offer.items.every((item) => G.STARTER_CARD_POOL.includes(item.key))),
    "every owner offer carries a real minimum-size starter deck from the production starter pool");

  const atlas = offers.find((offer) => offer.bodyKey === "atlas");
  owner.send({ type: "draftPick", bundle: atlas.id });
  owner.send({ type: "snapFull" });
  const started = await owner.next((row) => row.type === "state" && row.phase !== "draft", "normal run after owner pick");
  const player = started.players.find((seat) => seat.id === ownerCreated.joined.you);
  ok(started.god === false && started.phase === "won" && player.bodyKey === "atlas"
    && player.maxHp === G.BODIES.atlas.maxHp, "choosing an elite enters the ordinary level-one trailhead lifecycle with normal stats");

  await Bun.sleep(450);
  const telemetryFile = join(scratch, "telemetry.jsonl");
  const telemetry = readFileSync(telemetryFile, "utf8").trim().split("\n").map(JSON.parse);
  const ownerEvents = telemetry.filter((row) => row.code === "LAB00001");
  ok(ownerEvents.length > 0 && ownerEvents.every((row) => row.source === "owner_lab")
    && !readFileSync(telemetryFile, "utf8").includes(SECRET),
    "owner telemetry is source-tagged owner_lab and never contains the credential");
  ok(existsSync(join(scratch, "active-runs.v8")), "owner lab participates in normal active-run persistence");

  child.kill();
  await child.exited;
  ({ proc: child, base } = await startPrivateServer(port));
  const restored = await openClient(base);
  restored.send({ type: "join", code: "LAB00001", name: "Ignored", token: "owner-reconnect" });
  const restoredJoin = await restored.next((row) => row.type === "joined", "restored owner join");
  const restoredState = await restored.next((row) => row.type === "state", "restored owner state");
  const restoredPlayer = restoredState.players.find((seat) => seat.id === restoredJoin.you);
  ok(restoredState.ownerLab === true && restoredPlayer.bodyKey === "atlas" && restoredState.phase === "won",
    "token reconnect restores the owner lab and chosen body across a real server restart without resending the key");

  console.log(`OWNER LAB: ${passed} passed, 0 failed`);
} finally {
  for (const ws of sockets) try { ws.close(); } catch {}
  if (child) { try { child.kill(); } catch {} try { await child.exited; } catch {} }
  if (scratch.startsWith(join(tmpdir(), "km-owner-lab-"))) rmSync(scratch, { recursive: true, force: true });
}
