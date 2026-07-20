// Exact active-run restart/reconnect regression. This file owns its private servers, ports, and
// KM_DATA_DIR trees; it does not depend on or disturb the developer's :3000 process. Production
// deploy continuity requires KM_DATA_DIR to be a mounted volume (currently Railway /var/data), not
// an ephemeral checkout; these temp trees model that directory surviving across server A and B.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { serialize } from "node:v8";
import netDelta from "../public/net-delta.js";
import {
  addPlayer, allocationPoints, buildLevel, floorCardIdCounter, floorDraftBundleIdCounter, floorFoeIdCounter,
  floorNodeIdCounter, floorTradeOfferIdCounter, mintCard, newRoom, proposeTrade, rollDraftWheel,
  snapshot, spawnEnemy, wearBody,
} from "../game.js";
import {
  ACTIVE_RUNS_FILE, ACTIVE_RUNS_FORMAT, ACTIVE_RUNS_VERSION, createRunPersistence, maxNumericIds,
} from "../engine/run-persistence.js";

const { applyOps } = netDelta;
const ROOT = join(import.meta.dir, "..");
const scratch = mkdtempSync(join(tmpdir(), "km-run-persistence-"));
const liveProcesses = new Set();
const liveSockets = new Set();
let passed = 0;

const ok = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  passed++;
  console.log(`PASS: ${label}`);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (predicate, label, timeoutMs = 8_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await wait(20);
  }
  throw new Error(`timeout waiting for ${label}`);
};
const withTimeout = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
]);

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startPrivateServer(dataDir, extraEnv = {}) {
  const port = await freePort();
  const processHandle = Bun.spawn([process.execPath, "run", "server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), KM_DATA_DIR: dataDir, KM_RUN_SAVE_MS: "250", ...extraEnv },
    stdout: "pipe",
    stderr: "pipe",
    ipc() {},
  });
  liveProcesses.add(processHandle);
  const stdout = new Response(processHandle.stdout).text();
  const stderr = new Response(processHandle.stderr).text();
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitFor(async () => {
      try { return (await fetch(base + "/health")).ok; } catch { return false; }
    }, `server health on ${port}`);
  } catch (error) {
    try { processHandle.kill(); } catch {}
    throw error;
  }
  return { processHandle, stdout, stderr, base };
}

async function stopPrivateServer(server) {
  if (!server || !liveProcesses.has(server.processHandle)) return { code: null, stdout: "", stderr: "" };
  try {
    if (process.platform === "win32") server.processHandle.send({ type: "shutdown" });
    else server.processHandle.kill("SIGTERM");
  } catch {}
  let code;
  try { code = await withTimeout(server.processHandle.exited, 5_000, "server graceful exit"); }
  catch (error) {
    try { server.processHandle.kill(); } catch {}
    await server.processHandle.exited;
    throw error;
  } finally {
    liveProcesses.delete(server.processHandle);
  }
  return { code, stdout: await server.stdout, stderr: await server.stderr };
}

async function connect(base) {
  const ws = new WebSocket(base.replace(/^http/, "ws") + "/ws");
  liveSockets.add(ws);
  const client = { ws, state: null, seq: -1, messages: [], history: [] };
  ws.addEventListener("message", (event) => {
    let message; try { message = JSON.parse(event.data); } catch { return; }
    client.messages.push(message);
    if (message.type === "state") {
      client.state = message;
      client.seq = message.seq ?? -1;
      client.history.push(structuredClone(client.state));
    } else if (message.type === "delta" && client.state && message.base === client.seq) {
      applyOps(client.state, message.ops);
      client.seq = message.seq;
      client.history.push(structuredClone(client.state));
    }
  });
  await withTimeout(new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("websocket open error")), { once: true });
  }), 5_000, "websocket open");
  client.send = (message) => ws.send(JSON.stringify(message));
  client.next = (type) => waitFor(() => client.messages.find((message) => message.type === type), `message ${type}`);
  client.close = () => { try { ws.close(); } catch {} liveSockets.delete(ws); };
  return client;
}

function stable(value) {
  return JSON.stringify(value, (key, item) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map((name) => [name, item[name]])) : item);
}
function withoutSeq(state) {
  const copy = structuredClone(state);
  delete copy.seq;
  return copy;
}

function loadSavedRooms(dataDir, warnings = []) {
  const manager = createRunPersistence({ dataDir, rooms: new Map(), warn: (message) => warnings.push(message) });
  try { return manager.restoreSync(); } finally { manager.close(); }
}

function connectedSnapshot(room) {
  for (const player of room.players.values()) {
    if (!player.bot) { player.gone = false; player.ws = {}; }
  }
  return snapshot(room);
}

async function persistenceFormatChecks() {
  const dataDir = join(scratch, "format");
  const real = newRoom("REAL");
  real.phase = "playing";
  real._runId = "run-format-proof";
  real.level = { currentId: "n1", nodes: [{ id: "n1", type: "combat", links: [] }] };
  real.laneCount = 1; real.lanes = [[]]; real.allies = [[]];
  const player = addPlayer(real, "p41", "Persisted");
  player.token = "real-token";
  player.runLevel = 7;
  wearBody(player, "basilisk");
  player.levelAllocation = { hp: 1, melee: 1, ranged: 0, mastery: 1, specialty: 2 };
  player.levelMelee = 1; player.levelRanged = 0;
  for (const [index, name] of ["c999999", "f999999", "n999999", "of999999", "bndl999999", "p999999"].entries()) {
    const named = addPlayer(real, `p${50 + index}`, name);
    named.token = `name-token-${index}`;
  }
  const entity = { id: "f29", bodyKey: "rat", hp: 1, sourceRef: player };
  player.entityRef = entity;
  real.lanes[0].push(entity);
  const staleBasiliskFoe = spawnEnemy("basilisk", [], 7,
    { hp: 1, melee: 2, ranged: 0, mastery: 1, specialty: 1 });
  staleBasiliskFoe.levelAllocation = { hp: 1, melee: 1, ranged: 0, mastery: 1, specialty: 2 };
  staleBasiliskFoe.meleeBonus = 1; staleBasiliskFoe.rangedBonus = 0;
  staleBasiliskFoe.queue = [];
  real.lanes[0].push(staleBasiliskFoe);
  const unrelatedFoe = spawnEnemy("heavyHand", [], 3,
    { hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 2 });
  unrelatedFoe.queue = [];
  real.lanes[0].push(unrelatedFoe);
  real.handle = () => "unserializable timer stand-in";
  player.ws = () => "unserializable socket stand-in";

  const harness = newRoom("HARN");
  harness.phase = "playing"; harness._runId = "run-harness"; harness.harness = true;
  harness.level = { currentId: "n2", nodes: [{ id: "n2", type: "combat", links: [] }] };
  const harnessPlayer = addPlayer(harness, "p42", "Harness"); harnessPlayer.token = "harness-token";
  const scenario = newRoom("SCEN");
  scenario.phase = "playing"; scenario._runId = "run-scenario"; scenario.scenario = "capture";
  scenario.level = { currentId: "n3", nodes: [{ id: "n3", type: "combat", links: [] }] };
  const scenarioPlayer = addPlayer(scenario, "p43", "Scenario"); scenarioPlayer.token = "scenario-token";
  const tokenless = newRoom("PLAIN");
  tokenless.phase = "playing"; tokenless._runId = "run-tokenless";
  tokenless.level = { currentId: "n4", nodes: [{ id: "n4", type: "combat", links: [] }] };
  addPlayer(tokenless, "p44", "Tokenless");

  const rooms = new Map([[real.code, real], [harness.code, harness], [scenario.code, scenario], [tokenless.code, tokenless]]);
  const manager = createRunPersistence({ dataDir, rooms, intervalMs: 250 });
  ok(manager.flushSync({ force: true }), "v1 active-run envelope writes successfully");
  ok(existsSync(join(dataDir, ACTIVE_RUNS_FILE)), `snapshot is stored beneath KM_DATA_DIR/${ACTIVE_RUNS_FILE}`);
  ok(real.handle instanceof Function && player.ws instanceof Function, "encoding restores detached runtime handles in memory");
  const restored = loadSavedRooms(dataDir);
  ok(restored.length === 2 && restored.some((room) => room.code === "REAL")
    && restored.some((room) => room.code === "PLAIN"),
  "every normal active room persists while harness and scenario rooms do not");
  const restoredPlayer = restored[0].players.get("p41");
  const restoredEntity = restored[0].lanes[0][0];
  ok(restored[0].players instanceof Map && restored[0].unlockedBodies instanceof Set,
    "Map and Set state survive the binary envelope");
  ok(restoredEntity.sourceRef === restoredPlayer && restoredPlayer.entityRef === restoredEntity,
    "cyclic/shared entity references survive with object identity intact");
  ok(stable(restoredPlayer.levelAllocation) === stable({ hp: 1, melee: 1, ranged: 0, mastery: 1, specialty: 1 }),
    "saved Basilisk hero allocation preserves every other field and returns the retired Specialty rank");
  const restoredBasiliskFoe = restored[0].lanes[0].find((foe) => foe.bodyKey === "basilisk");
  ok(stable(restoredBasiliskFoe?.levelAllocation)
      === stable({ hp: 1, melee: 1, ranged: 0, mastery: 1, specialty: 1 }),
    "saved Basilisk foe allocation receives the same one-rank migration");
  const restoredUnrelatedFoe = restored[0].lanes[0].find((foe) => foe.bodyKey === "heavyHand");
  ok(restoredUnrelatedFoe?.levelAllocation?.specialty === 2,
    "saved allocations for unrelated bodies remain unchanged");
  const migratedSnapshotPlayer = connectedSnapshot(restored[0]).players.find((entry) => entry.id === "p41");
  ok(allocationPoints("basilisk", restoredPlayer.levelAllocation) === 5
      && Number.isFinite(migratedSnapshotPlayer.levelPointsSpent)
      && migratedSnapshotPlayer.levelPointsSpent === 5
      && migratedSnapshotPlayer.levelPointsUnspent === 1,
    "Basilisk migration yields finite accounting and exactly one newly unspent point");
  const semanticMaxima = maxNumericIds(restored[0]);
  ok(semanticMaxima.card === 0 && semanticMaxima.foe === 29 && semanticMaxima.node === 1
    && semanticMaxima.offer === 0 && semanticMaxima.bundle === 0 && semanticMaxima.player === 55,
  `user-controlled ID-shaped display names never influence restored counter floors (${stable(semanticMaxima)})`);

  player.treasure = 77;
  manager.schedule();
  for (let count = 0; count < 30; count++) manager.schedule();
  await wait(100);
  ok(loadSavedRooms(dataDir)[0].players.get("p41").treasure !== 77,
    "bursty dirty marks do not rewrite the file at tick cadence");
  await waitFor(() => loadSavedRooms(dataDir)[0].players.get("p41").treasure === 77,
    "throttled follow-up write", 2_000);
  ok(true, "dirty state is durably replaced after the 250ms test cadence (production default 5s)");
  manager.close();

  const warnings = [];
  writeFileSync(join(dataDir, ACTIVE_RUNS_FILE), serialize({
    format: ACTIVE_RUNS_FORMAT, version: ACTIVE_RUNS_VERSION + 1, savedAt: Date.now(), rooms: [],
  }));
  ok(loadSavedRooms(dataDir, warnings).length === 0 && warnings.some((line) => /unsupported schema version/.test(line)),
    "incompatible schema fails closed with a clear warning");
}

function counterFloorChecks() {
  const floor = 9_000;
  floorCardIdCounter(floor);
  floorFoeIdCounter(floor);
  floorNodeIdCounter(floor);
  floorDraftBundleIdCounter(floor);
  floorTradeOfferIdCounter(floor);
  ok(mintCard("oSword").id === "c9001", "card counter floors directly above restored ids");
  ok(spawnEnemy("rookie", []).id === "f9001", "foe counter floors directly above restored ids");
  ok(buildLevel(1).nodes[0].id === "n9001", "node counter floors directly above restored ids");
  ok(rollDraftWheel(1)[0].id === "bndl9001", "draft-bundle counter floors directly above restored ids");
  const tradeRoom = newRoom("COUNT"); tradeRoom.phase = "won";
  const from = addPlayer(tradeRoom, "counter-a", "Counter A");
  const to = addPlayer(tradeRoom, "counter-b", "Counter B");
  from.backpack = ["oSword"]; to.backpack = ["oSword"];
  ok(proposeTrade(tradeRoom, from, to.id, "oSword", "oSword")
    && tradeRoom.tradeOffers[0].id === "of9001", "trade-offer counter floors directly above restored ids");
}

async function exactRestartReconnect() {
  const dataDir = join(scratch, "restart");
  let serverA = await startPrivateServer(dataDir);
  const clientA = await connect(serverA.base);
  clientA.send({ type: "create", code: "PERS", name: "Restart Hero", token: "restart-token-7" });
  const joinedA = await clientA.next("joined");
  await waitFor(() => clientA.state?.phase === "draft", "real draft state");
  const offer = clientA.state.draft.wheel.find((item) => item.offeredTo === joinedA.you);
  ok(!!offer, "real client receives a private draft offer");
  clientA.send({ type: "draftPick", bundle: offer.id });
  await waitFor(() => clientA.state?.phase === "won" && clientA.state.map, "trailhead after draft");
  const current = clientA.state.map.nodes.find((node) => node.id === clientA.state.map.currentId);
  const destination = current.links.map((id) => clientA.state.map.nodes.find((node) => node.id === id))
    .find((node) => node?.type === "combat");
  ok(!!destination, "real run has a combat destination");
  clientA.send({ type: "advance", to: destination.id });
  await waitFor(() => clientA.state?.phase === "setup", "real room setup");
  clientA.send({ type: "setClock", divisor: 4 });
  await waitFor(() => clientA.state?.clock?.divisor === 4, "quarter-speed durable clock");
  clientA.send({ type: "start" });
  await waitFor(() => clientA.state?.phase === "playing" && clientA.state.tick >= 1, "live real combat");
  const firstCard = clientA.state.players.find((player) => player.id === joinedA.you)?.hand?.[0];
  ok(!!firstCard, "live combat has a real minted hand");
  clientA.send({ type: "queueCard", id: firstCard.id });
  await waitFor(() => {
    const livePlayer = clientA.state?.players.find((player) => player.id === joinedA.you);
    return livePlayer?.queuedCards?.some((card) => card.id === firstCard.id)
      || livePlayer?.hand?.every((card) => card.id !== firstCard.id);
  }, "real queued-or-cast card action before restart");

  const persistenceFile = join(dataDir, ACTIVE_RUNS_FILE);
  await waitFor(() => {
    if (!existsSync(persistenceFile)) return false;
    try { return loadSavedRooms(dataDir)[0]?.phase === "playing"; } catch { return false; }
  }, "durable playing snapshot");
  await wait(350); // let the matching broadcast reach the client's history before termination
  const stoppedA = await stopPrivateServer(serverA); serverA = null;
  ok(stoppedA.code === 0 && /Flushed active rooms on (SIGTERM|supervisor IPC)/.test(stoppedA.stdout),
    "server A flushes synchronously on graceful termination");

  const savedAfterA = loadSavedRooms(dataDir);
  ok(savedAfterA.length === 1, "server A leaves exactly one active production room");
  const savedRoom = savedAfterA[0];
  const runId = savedRoom._runId;
  const savedMaxima = maxNumericIds(savedRoom);
  const expected = withoutSeq(connectedSnapshot(savedRoom));
  ok(typeof runId === "string" && runId.startsWith("run-"), "stable run id is present in durable state");
  ok(expected.phase === "playing" && expected.floor === 1 && expected.map?.currentId === destination.id,
    "phase, floor, and map position are present in durable state");
  const expectedPlayer = expected.players.find((player) => player.id === joinedA.you);
  ok(expectedPlayer?.bodyKey !== "rookie" && expectedPlayer.deckList.length === 10
    && expectedPlayer.backpack.length === 10 && typeof expectedPlayer.treasure === "number",
  "drafted body, deck, backpack, and economy are present in durable state");
  ok(expected.lanes.some((lane) => lane.enemies.length > 0) && expectedPlayer.hand.length > 0,
    "current combat foes and card piles are present in durable state");
  ok(clientA.history.some((state) => stable(withoutSeq(state)) === stable(expected)),
    "a real server-A client captured the exact durable checkpoint");
  clientA.close();

  let serverB = await startPrivateServer(dataDir);
  const clientB = await connect(serverB.base);
  clientB.send({ type: "join", code: "PERS", name: "Ignored on reconnect", token: "restart-token-7" });
  const joinedB = await clientB.next("joined");
  await waitFor(() => clientB.state?.phase === "playing", "server-B restored full state");
  ok(joinedB.you === joinedA.you, "real reconnect token reclaims the same player seat after process restart");
  ok(stable(withoutSeq(clientB.state)) === stable(expected),
    "server B's first reconnect snapshot exactly matches server A's durable checkpoint");

  const restoredTick = clientB.state.tick;
  clientB.send({ type: "setClock", divisor: 2 });
  await waitFor(() => clientB.state?.clock?.divisor === 2 && clientB.state.tick > restoredTick,
    "post-restart action and forward simulation tick");
  ok(clientB.state.players.find((player) => player.id === joinedA.you)?.bodyKey === expectedPlayer.bodyKey,
    "forward simulation retains the restored player body");
  await waitFor(() => {
    try {
      const durable = loadSavedRooms(dataDir)[0];
      return durable?._runId === runId && durable.tick > restoredTick;
    } catch { return false; }
  }, "post-restart durable forward tick");
  ok(true, "run id remains unchanged across restart and forward progress");

  // Start a legitimate fresh run on server B. Every id family visible through gameplay must mint
  // strictly above the graph restored from server A (no dummy-object warmup and no collisions).
  clientB.send({ type: "restartRun" });
  await waitFor(() => clientB.state?.phase === "draft", "fresh draft after restored run");
  const freshOffers = clientB.state.draft.wheel.filter((item) => item.offeredTo === joinedB.you);
  ok(freshOffers.length > 0 && freshOffers.every((item) => Number(item.id.slice(4)) > savedMaxima.bundle),
    "post-restart draft bundles mint above the restored maximum");
  clientB.send({ type: "draftPick", bundle: freshOffers[0].id });
  await waitFor(() => clientB.state?.phase === "won" && clientB.state.map, "fresh trailhead after restored run");
  ok(clientB.state.map.nodes.every((node) => Number(node.id.slice(1)) > savedMaxima.node),
    "post-restart map nodes mint above the restored maximum");
  const freshCurrent = clientB.state.map.nodes.find((node) => node.id === clientB.state.map.currentId);
  const freshDestination = freshCurrent.links.map((id) => clientB.state.map.nodes.find((node) => node.id === id))
    .find((node) => node?.type === "combat");
  clientB.send({ type: "advance", to: freshDestination.id });
  await waitFor(() => clientB.state?.phase === "setup", "fresh setup after restored run");
  clientB.send({ type: "start" });
  await waitFor(() => clientB.state?.phase === "playing", "fresh combat after restored run");
  const freshPlayer = clientB.state.players.find((player) => player.id === joinedB.you);
  ok(freshPlayer.hand.every((card) => Number(card.id.slice(1)) > savedMaxima.card),
    "post-restart cards mint above the restored maximum");
  const freshEnemies = clientB.state.lanes.flatMap((lane) => lane.enemies);
  ok(freshEnemies.length > 0 && freshEnemies.every((enemy) => Number(enemy.id.slice(1)) > savedMaxima.foe),
    "post-restart foes mint above the restored maximum");
  clientB.close();
  const stoppedB = await stopPrivateServer(serverB); serverB = null;
  ok(stoppedB.code === 0, "server B exits cleanly after forward progress");
  ok(loadSavedRooms(dataDir)[0]?._runId !== runId, "explicit restart creates a new durable run id");
}

async function corruptBootCheck() {
  const dataDir = join(scratch, "corrupt");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, ACTIVE_RUNS_FILE), Buffer.from("not a v8 persistence envelope"));
  let server = await startPrivateServer(dataDir);
  const client = await connect(server.base);
  client.send({ type: "join", code: "PERS", token: "restart-token-7" });
  const refusal = await client.next("error");
  ok(refusal.message === "No such room", "corrupt persistence boots an empty server");
  client.close();
  const stopped = await stopPrivateServer(server); server = null;
  ok(stopped.code === 0 && /Ignoring active-runs\.v8:/.test(stopped.stderr + stopped.stdout)
    && /Starting with no restored rooms/.test(stopped.stderr + stopped.stdout),
  "corrupt persistence emits a clear warning and never crashes boot");
}

async function highIdRestoreCheck() {
  const dataDir = join(scratch, "high-id");
  const room = newRoom("HIGHID");
  room.phase = "playing"; room._runId = "run-high-id-proof";
  room.level = { currentId: "n1", nodes: [{ id: "n1", type: "combat", links: [] }] };
  room.laneCount = 1; room.lanes = [[]]; room.allies = [[]];
  const player = addPlayer(room, "p1", "Long Lived");
  player.token = "high-id-token";
  player.hand = [{ id: "c50001", key: "oSword" }];
  const writer = createRunPersistence({ dataDir, rooms: new Map([[room.code, room]]) });
  ok(writer.flushSync({ force: true }), "valid entity ids above 50,000 are durable");
  writer.close();

  let server = await startPrivateServer(dataDir);
  const client = await connect(server.base);
  client.send({ type: "join", code: "HIGHID", token: "high-id-token" });
  await client.next("joined");
  await waitFor(() => client.state?.players?.some((entry) => entry.id === "p1"), "high-id room restore");
  ok(client.state.players.find((entry) => entry.id === "p1")?.hand?.[0]?.id === "c50001",
    "ordinary counter growth above 50,000 does not invalidate the whole restored room");
  client.close();
  const stopped = await stopPrivateServer(server); server = null;
  ok(stopped.code === 0, "high-id restore server exits cleanly");
}

async function abandonedRestoreReapCheck() {
  const dataDir = join(scratch, "reap");
  const room = newRoom("REAP");
  room.phase = "playing"; room._runId = "run-reap-proof";
  room.level = { currentId: "n1", nodes: [{ id: "n1", type: "combat", links: [] }] };
  const player = addPlayer(room, "p1", "Returns Maybe"); player.token = "reap-token";
  const writer = createRunPersistence({ dataDir, rooms: new Map([[room.code, room]]) });
  ok(writer.flushSync({ force: true }), "abandoned-room fixture is durable before boot");
  writer.close();
  let server = await startPrivateServer(dataDir, { KM_REAP_MS: "250", KM_RUN_SAVE_MS: "250" });
  await waitFor(() => {
    try { return loadSavedRooms(dataDir).length === 0; } catch { return false; }
  }, "restored dormant room reap and empty flush", 3_000);
  const client = await connect(server.base);
  client.send({ type: "join", code: "REAP", token: "reap-token" });
  const refusal = await client.next("error");
  ok(refusal.message === "No such room", "never-returning restored room releases its code after the normal grace timer");
  client.close();
  const stopped = await stopPrivateServer(server); server = null;
  ok(stopped.code === 0, "reap-check server exits cleanly");
}

try {
  await persistenceFormatChecks();
  counterFloorChecks();
  await exactRestartReconnect();
  await highIdRestoreCheck();
  await corruptBootCheck();
  await abandonedRestoreReapCheck();
  console.log(`\nRUN PERSISTENCE: ${passed} passed, 0 failed`);
} finally {
  for (const ws of liveSockets) try { ws.close(); } catch {}
  for (const processHandle of liveProcesses) {
    try { processHandle.kill(); } catch {}
    try { await withTimeout(processHandle.exited, 2_000, "cleanup exit"); } catch {}
  }
  if (scratch.startsWith(join(tmpdir(), "km-run-persistence-"))) rmSync(scratch, { recursive: true, force: true });
}
