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
  LANE_CHANGE_CD_TICKS, addPlayer, allocationPoints, assignLoot, buildLevel, changeLane, claimLoot,
  floorCardIdCounter,
  floorDraftBundleIdCounter, floorFoeIdCounter, floorNodeIdCounter, floorTradeOfferIdCounter,
  itemTreasure, laneChangeCdLeft, leveledPassives, lootCreditOf, mintCard, newRoom, proposeTrade, rollDraftWheel,
  snapshot, spawnEnemy, wearBody,
} from "../game.js";
import {
  ACTIVE_RUNS_FILE, ACTIVE_RUNS_FORMAT, ACTIVE_RUNS_VERSION, createRunPersistence, maxNumericIds,
} from "../engine/run-persistence.js";
import { createDiskQueue } from "../engine/disk-queue.js";

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
  const debtPlayer = addPlayer(real, "debt-proof", "Debt Rank Guard");
  debtPlayer.token = "debt-token"; debtPlayer.runLevel = 10;
  wearBody(debtPlayer, "debtDragon");
  debtPlayer.levelAllocation = { hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 9 };
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
  const unrelatedFoe = spawnEnemy("interestImp", [], 3,
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
  const restoredDebtPlayer = restored[0].players.get("debt-proof");
  const restoredEntity = restored[0].lanes[0][0];
  ok(restored[0].players instanceof Map && restored[0].unlockedBodies instanceof Set,
    "Map and Set state survive the binary envelope");
  ok(restoredEntity.sourceRef === restoredPlayer && restoredPlayer.entityRef === restoredEntity,
    "cyclic/shared entity references survive with object identity intact");
  ok(stable(restoredPlayer.levelAllocation) === stable({ hp: 1, melee: 1, ranged: 0, mastery: 1, specialty: 1 }),
    "saved Basilisk hero allocation preserves every other field and returns the retired Specialty rank");
  ok(stable(restoredDebtPlayer.levelAllocation)
      === stable({ hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 5 }),
    "saved Debt Dragon Specialty above the new cap migrates to rank five");
  const debtRefund = leveledPassives(restoredDebtPlayer)
    .find((passive) => passive.spend === 10)?.ops?.find((op) => op.do === "gainMoxie")?.amount;
  ok(debtRefund === 5 && allocationPoints("debtDragon", restoredDebtPlayer.levelAllocation) === 5,
    "restored Debt Dragon can refund at most five moxie and releases four points for reallocation");
  const restoredBasiliskFoe = restored[0].lanes[0].find((foe) => foe.bodyKey === "basilisk");
  ok(stable(restoredBasiliskFoe?.levelAllocation)
      === stable({ hp: 1, melee: 1, ranged: 0, mastery: 1, specialty: 1 }),
    "saved Basilisk foe allocation receives the same one-rank migration");
  const restoredUnrelatedFoe = restored[0].lanes[0].find((foe) => foe.bodyKey === "interestImp");
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
  clientA.send({ type: "create", code: "PERS", name: "Restart Hero", token: "restart-token-7", difficulty: "challenge" });
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
  ok(expected.difficulty === "challenge", "selected room difficulty is present in durable state");
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

// Exact browser lifecycle: closing during the first draft must retain that run; backgrounding during
// live combat must close/park the socket, freeze simulation, and resume the exact durable checkpoint.
// A deliberate Leave remains the one destructive browser action.
async function browserAwayResumeCheck() {
  const dataDir = join(scratch, "browser-away");
  // The retired implementation honored KM_REAP_MS and deleted the room after this delay. Keeping
  // the old knob tiny makes the regression prove elapsed away-time no longer owns run deletion.
  let server = await startPrivateServer(dataDir, { KM_REAP_MS: "250" });
  let client = await connect(server.base);
  client.send({ type: "create", code: "BRSAVE", name: "Browser Hero", token: "browser-token-1" });
  const joinedA = await client.next("joined");
  await waitFor(() => client.state?.phase === "draft", "browser-away initial draft");

  // A real socket close in the first draft is already part of the run and must be resumable.
  client.close();
  await wait(750);
  const savedDraft = loadSavedRooms(dataDir).find((room) => room.code === "BRSAVE");
  ok(savedDraft?.phase === "draft", "closing the browser during body draft retains the active run");
  const expectedDraft = withoutSeq(connectedSnapshot(savedDraft));

  client = await connect(server.base);
  client.send({ type: "join", code: "BRSAVE", name: "Ignored", token: "browser-token-1" });
  const joinedDraft = await client.next("joined");
  await waitFor(() => client.history.some((state) => stable(withoutSeq(state)) === stable(expectedDraft)),
    "exact draft checkpoint after browser reopen");
  ok(joinedDraft.you === joinedA.you, "browser reopen reclaims the original draft seat");

  const offer = client.state.draft.wheel.find((item) => item.offeredTo === joinedA.you);
  client.send({ type: "draftPick", bundle: offer.id });
  await waitFor(() => client.state?.phase === "won" && client.state.map, "browser-away trailhead");
  const current = client.state.map.nodes.find((node) => node.id === client.state.map.currentId);
  const destination = current.links.map((id) => client.state.map.nodes.find((node) => node.id === id))
    .find((node) => node?.type === "combat");
  client.send({ type: "advance", to: destination.id });
  await waitFor(() => client.state?.phase === "setup", "browser-away room setup");
  client.send({ type: "setClock", divisor: 4 });
  await waitFor(() => client.state?.clock?.divisor === 4, "browser-away quarter speed");
  client.send({ type: "start" });
  await waitFor(() => client.state?.phase === "playing" && client.state.tick >= 1, "browser-away live combat");

  // visibilitychange/pagehide sends this before the browser freezes. The server deliberately closes
  // that socket, which prevents a zombie background connection from keeping combat alive.
  client.send({ type: "suspend" });
  await waitFor(() => client.ws.readyState === 3, "server closes background-suspended socket");
  client.close();
  await wait(500);
  const parkedA = loadSavedRooms(dataDir).find((room) => room.code === "BRSAVE");
  ok(parkedA?.phase === "playing", "backgrounding retains the live combat checkpoint");
  const parkedTick = parkedA.tick;
  await wait(700);
  const parkedB = loadSavedRooms(dataDir).find((room) => room.code === "BRSAVE");
  ok(parkedB?.tick === parkedTick && parkedB.phase === "playing",
    "combat simulation stays frozen for the entire browser-away interval");
  const expectedCombat = withoutSeq(connectedSnapshot(parkedB));

  client = await connect(server.base);
  client.send({ type: "join", code: "BRSAVE", name: "Ignored Again", token: "browser-token-1" });
  const joinedCombat = await client.next("joined");
  await waitFor(() => client.history.some((state) => stable(withoutSeq(state)) === stable(expectedCombat)),
    "exact combat checkpoint after browser foreground");
  ok(joinedCombat.you === joinedA.you, "foreground reconnect reclaims the same combat seat");
  await waitFor(() => client.state?.tick > parkedTick, "simulation resumes after browser foreground");
  ok(client.state.phase === "playing", "the resumed run makes forward progress without being replaced");

  client.send({ type: "leave" });
  await client.next("left");
  await waitFor(() => loadSavedRooms(dataDir).length === 0, "deliberate browser Leave clears saved run");
  ok(true, "explicit Leave still abandons the run and releases its room code");
  client.close();
  const stopped = await stopPrivateServer(server); server = null;
  ok(stopped.code === 0, "browser-away lifecycle server exits cleanly");
}

// Regression for the 2026-07-24 production shared-freeze: periodic saves must never block the
// event loop on disk latency. The write pipeline is async; only serialize runs on the caller's
// stack. A lagging volume may delay SAVES but a schedule()-triggered flush must return immediately,
// and a newer synchronous snapshot (graceful shutdown) must never be overwritten by a slower,
// older in-flight async write.
async function asyncNonBlockingFlushChecks() {
  const fixtureRoom = (code, treasure) => {
    const room = newRoom(code);
    room.phase = "playing"; room._runId = `run-${code.toLowerCase()}-proof`;
    room.level = { currentId: "n1", nodes: [{ id: "n1", type: "combat", links: [] }] };
    const player = addPlayer(room, "p1", "Latency Proof");
    player.token = `${code.toLowerCase()}-token`;
    player.treasure = treasure;
    return room;
  };

  {
    // 1) A slow disk delays the save, not the caller.
    const dataDir = join(scratch, "async-slow");
    const room = fixtureRoom("SLOWIO", 1);
    const io = {
      writeFile: async (path, bytes) => { await wait(400); return Bun.write(path, bytes); },
      fsyncFile: async () => {},
      rename: (from, to) => import("node:fs/promises").then((fs) => fs.rename(from, to)),
      unlink: (path) => import("node:fs/promises").then((fs) => fs.unlink(path)),
    };
    const manager = createRunPersistence({ dataDir, rooms: new Map([[room.code, room]]), intervalMs: 250, io });
    const before = Date.now();
    manager.schedule();                                  // lastFlushAt=0 → flushes on this call
    const elapsed = Date.now() - before;
    ok(elapsed < 100, `schedule() returns immediately while the disk lags (took ${elapsed}ms)`);
    ok(!existsSync(join(dataDir, ACTIVE_RUNS_FILE)), "the lagging write has not landed yet at call time");
    await waitFor(() => {
      try { return loadSavedRooms(dataDir)[0]?.players.get("p1")?.treasure === 1; } catch { return false; }
    }, "slow async save eventually lands", 3_000);
    manager.close();
  }

  {
    // 2) Supersession: a newer synchronous shutdown snapshot beats an older in-flight async write.
    const dataDir = join(scratch, "async-supersede");
    const room = fixtureRoom("SUPRSD", 1);
    let releaseSlowWrite;
    const gate = new Promise((resolve) => { releaseSlowWrite = resolve; });
    const io = {
      writeFile: async (path, bytes) => { await gate; return Bun.write(path, bytes); },
      fsyncFile: async () => {},
      rename: (from, to) => import("node:fs/promises").then((fs) => fs.rename(from, to)),
      unlink: (path) => import("node:fs/promises").then((fs) => fs.unlink(path)),
    };
    const manager = createRunPersistence({ dataDir, rooms: new Map([[room.code, room]]), intervalMs: 250, io });
    manager.schedule();                                  // async write now in flight, holding treasure=1
    room.players.get("p1").treasure = 2;
    ok(manager.flushSync({ force: true }), "a synchronous snapshot commits while an older write is in flight");
    releaseSlowWrite();
    await wait(150);                                     // let the stale async write finish its pipeline
    ok(loadSavedRooms(dataDir)[0]?.players.get("p1")?.treasure === 2,
      "the older in-flight async write never overwrites the newer committed snapshot");
    manager.close();
  }

  {
    // 3) A failed async write marks state dirty and a later schedule() retries durably.
    const dataDir = join(scratch, "async-retry");
    const room = fixtureRoom("RETRYIO", 7);
    let failures = 0;
    const io = {
      writeFile: async (path, bytes) => {
        if (failures++ === 0) throw new Error("injected disk failure");
        return Bun.write(path, bytes);
      },
      fsyncFile: async () => {},
      rename: (from, to) => import("node:fs/promises").then((fs) => fs.rename(from, to)),
      unlink: (path) => import("node:fs/promises").then((fs) => fs.unlink(path)).catch(() => {}),
    };
    const warnings = [];
    const manager = createRunPersistence({
      dataDir, rooms: new Map([[room.code, room]]), intervalMs: 250, io,
      warn: (message) => warnings.push(message),
    });
    manager.schedule();
    await waitFor(() => warnings.some((line) => /injected disk failure/.test(line)), "failed write warns", 2_000);
    await waitFor(() => {
      manager.schedule();                                // ticks keep calling schedule in production
      try { return loadSavedRooms(dataDir)[0]?.players.get("p1")?.treasure === 7; } catch { return false; }
    }, "failed save retries and lands durably", 3_000);
    manager.close();
  }
}

// The ordered async append queue that replaced synchronous telemetry/combat-log writes in
// server.js: order is preserved, a stalled disk drops NEW lines loudly instead of growing
// without bound, and append errors warn without throwing.
async function diskQueueChecks() {
  {
    const seen = [];
    const queue = createDiskQueue({
      appendFile: async (file, data) => {
        await wait(data === "first" ? 80 : 1);           // slow head, fast tail — order must hold
        seen.push(data);
      },
    });
    queue.append("a.log", "first");
    queue.append("a.log", "second");
    queue.append("b.log", "third");
    ok(queue.depth === 3, "pending appends are tracked");
    await waitFor(() => seen.length === 3, "all appends complete", 2_000);
    ok(seen.join(",") === "first,second,third", "append order is strict FIFO even when the head is slow");
    ok(queue.depth === 0 && queue.dropped === 0, "drained queue reports zero depth and zero drops");
  }
  {
    let releaseDisk;
    const gate = new Promise((resolve) => { releaseDisk = resolve; });
    const warnings = [];
    const queue = createDiskQueue({
      appendFile: () => gate,
      warn: (message) => warnings.push(message),
      maxDepth: 3,
    });
    for (let index = 0; index < 5; index++) queue.append("stalled.log", `line ${index}`);
    ok(queue.depth === 3 && queue.dropped === 2, "a stalled disk drops new lines at the bound instead of growing");
    ok(warnings.some((line) => /backlog full/.test(line)), "dropping is loud, never silent");
    releaseDisk();
    ok(await queue.drain(2_000), "drain resolves once the disk recovers");
  }
  {
    const warnings = [];
    const queue = createDiskQueue({
      appendFile: async () => { throw new Error("disk exploded"); },
      warn: (message) => warnings.push(message),
    });
    queue.append("bad.log", "line");
    await queue.drain(1_000);
    ok(warnings.some((line) => /disk exploded/.test(line)) && queue.depth === 0,
      "append errors warn and release the queue instead of throwing");
  }
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

// The lane-change cooldown (owner 2026-07-24) is stored as an ABSOLUTE `room.tick` deadline on the
// player. Both halves ride the same whole-graph v8 snapshot, so a mid-combat save/restore must
// resume owing exactly the time it owed — never permanently stuck, never silently reset to free.
function laneCooldownDurabilityCheck() {
  const dataDir = join(scratch, "lane-cooldown");
  const room = newRoom("LANECD");
  room.phase = "playing"; room._runId = "run-lane-cooldown-proof";
  room.level = { currentId: "n1", nodes: [{ id: "n1", type: "combat", links: [] }] };
  room.laneCount = 2; room.lanes = [[], []]; room.allies = [[], []];
  room.tick = 4_321;                                   // a real mid-combat clock, not tick 0
  const player = addPlayer(room, "p1", "Mover");
  player.token = "lane-cooldown-token"; player.lane = 0;
  ok(changeLane(room, player, "down") === true, "mid-combat lane change lands before the save");
  const owed = laneChangeCdLeft(room, player);
  ok(owed === LANE_CHANGE_CD_TICKS, "…arming the full six-second lane cooldown");

  const writer = createRunPersistence({ dataDir, rooms: new Map([[room.code, room]]) });
  ok(writer.flushSync({ force: true }), "a room mid lane-cooldown is durable");
  writer.close();

  const restored = loadSavedRooms(dataDir).find((entry) => entry.code === "LANECD");
  const restoredPlayer = restored.players.get("p1");
  ok(restored.tick === room.tick && restoredPlayer.laneCdUntil === player.laneCdUntil,
    "restore carries room.tick and the absolute lane deadline together");
  ok(laneChangeCdLeft(restored, restoredPlayer) === owed,
    "restored run owes exactly the ticks it owed — never permanently stuck, never permanently free");
  ok(changeLane(restored, restoredPlayer, "up") === false, "the restored player is still cooling down");
  restored.tick += owed;
  ok(changeLane(restored, restoredPlayer, "up") === true, "…and moves freely once the remainder elapses");
}

// PAID-OWNERSHIP CREDIT (owner ruling 2026-07-24) — the per-seat "this seat already bought this
// card" ledger that makes taking your own swapped-out card back FREE. It is plain nested-object
// state on the room, so it rides the same whole-graph v8 snapshot as `room.loot` itself: a restart
// between rooms must not silently re-charge a card the seat already paid for, and must not hand the
// discount to anybody else.
function lootCreditDurabilityCheck() {
  const dataDir = join(scratch, "loot-credit");
  const room = newRoom("LOOTCR");
  room.phase = "won"; room._runId = "run-loot-credit-proof";
  room.level = { currentId: "n1", nodes: [{ id: "n1", type: "combat", links: [] }] };
  const main = addPlayer(room, "p1", "Main"); main.token = "loot-credit-token";
  const companion = addPlayer(room, "p1-b1", "Comp", { bot: true, owner: "p1", partyRole: "companion" });
  const guest = addPlayer(room, "p2", "Guest"); guest.token = "loot-credit-guest";
  main.partyRole = "main";
  main.deckList = Array(10).fill("oSword"); main.backpack = [...main.deckList];
  companion.deckList = ["oHatchet", "oSpear", "oBow"]; companion.backpack = [...companion.deckList];
  guest.deckList = Array(10).fill("oSword"); guest.backpack = [...guest.deckList];
  room.loot = ["oHoly"]; main.bidPoints = 20; guest.bidPoints = 20;

  ok(assignLoot(room, main, { key: "oHoly", toPlayerId: companion.id, outgoingKey: "oSpear" }),
    "first acquisition lands and returns the outgoing card to the shared pool");
  ok(main.bidPoints === 20 - itemTreasure("oHoly"), "…charging the seat that card's value exactly once");
  ok(lootCreditOf(room, "p1", "oSpear") === 1, "…and minting one paid-ownership credit for the returned card");

  const writer = createRunPersistence({ dataDir, rooms: new Map([[room.code, room]]) });
  ok(writer.flushSync({ force: true }), "a room holding paid-ownership credits is durable");
  writer.close();

  const restored = loadSavedRooms(dataDir).find((entry) => entry.code === "LOOTCR");
  ok(lootCreditOf(restored, "p1", "oSpear") === 1, "the credit survives the v8 round-trip intact");
  const restoredMain = restored.players.get("p1");
  const restoredComp = restored.players.get("p1-b1");
  const before = restoredMain.bidPoints;
  ok(assignLoot(restored, restoredMain, { key: "oSpear", toPlayerId: restoredComp.id, outgoingKey: "oHoly" }) === true,
    "the restored seat takes its own swapped-out card back");
  ok(restoredMain.bidPoints === before,
    "…for FREE — a restart never re-charges a card this seat already bought");
  ok(lootCreditOf(restored, "p1", "oSpear") === 0, "…the credit is consumed exactly once");
  ok(lootCreditOf(restored, "p1", "oHoly") === 1, "…while the newly returned card mints its own");

  const restoredGuest = restored.players.get("p2");
  const guestBefore = restoredGuest.bidPoints;
  claimLoot(restored, restoredGuest, "oHoly");
  ok(restoredGuest.backpack.includes("oHoly") && restoredGuest.bidPoints === guestBefore - itemTreasure("oHoly"),
    "a DIFFERENT seat still pays full price for that same returned card after a restore");
}

async function dormantRestoreRetentionCheck() {
  const dataDir = join(scratch, "dormant-restore");
  const room = newRoom("DORMANT");
  room.phase = "setup"; room._runId = "run-dormant-proof";
  room.level = { currentId: "n1", nodes: [{ id: "n1", type: "combat", links: [] }] };
  const player = addPlayer(room, "p1", "Returns Maybe"); player.token = "reap-token";
  const writer = createRunPersistence({ dataDir, rooms: new Map([[room.code, room]]) });
  ok(writer.flushSync({ force: true }), "dormant-room fixture is durable before boot");
  writer.close();
  // KM_REAP_MS used to delete this restored active run after 250ms. Keep setting the retired knob
  // so this regression fails if the destructive grace-timer path ever comes back accidentally.
  let server = await startPrivateServer(dataDir, { KM_REAP_MS: "250", KM_RUN_SAVE_MS: "250" });
  await wait(750);
  ok(loadSavedRooms(dataDir).some((saved) => saved.code === "DORMANT"),
    "a restored dormant run survives beyond the retired reap window");
  const client = await connect(server.base);
  client.send({ type: "join", code: "DORMANT", token: "reap-token" });
  const joined = await client.next("joined");
  await waitFor(() => client.state?.phase === "setup", "restored dormant room reconnect");
  ok(joined.you === "p1", "the retained room remains reclaimable by its original token");
  client.send({ type: "leave" });
  await client.next("left");
  await waitFor(() => loadSavedRooms(dataDir).length === 0, "explicit leave removes retained run");
  ok(true, "explicit Leave, not elapsed browser-away time, retires the durable run");
  client.close();
  const stopped = await stopPrivateServer(server); server = null;
  ok(stopped.code === 0, "dormant-retention server exits cleanly");
}


// LEGACY BODY-KEY SAVE RESTORE (2026-08-12 rename): a live Railway save written BEFORE the rename
// carries the archaic keys (juggernaut, quakeCap, leverage, ...) in every body-reference field.
// Restore must translate ALL of them to the live keys so the run keeps playing — a miss here
// corrupts the owner's and his friend's active runs.
function legacyBodyKeyRestoreCheck() {
  const dataDir = join(scratch, "legacy-keys");
  const room = newRoom("OLDKEY");
  room.phase = "playing";
  room._runId = "run-legacy-keys";
  room.level = { currentId: "n1", nodes: [{ id: "n1", type: "combat", links: [],
    foes: [{ bodyKey: "ratTrader", gear: ["oSword"], level: 2 }] }] };
  room.laneCount = 1; room.lanes = [[]]; room.allies = [[]];
  const player = addPlayer(room, "p61", "OldSave");
  player.token = "legacy-token";
  player.runLevel = 4;
  wearBody(player, "cryptoChimera");
  player.levelAllocation = { hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 1 };
  // Hand-rewrite to the PRE-RENAME on-disk shape: old body keys + old passive-state fields.
  player.bodyKey = "quakeCap"; player.homeBody = "quakeCap";
  player.chimeraCycle = undefined; player.chimeraCardClock = undefined;
  delete player.chimeraCycle; delete player.chimeraCardClock;
  player.quakeCycle = 2; player.quakeCardClock = 1;
  const foe = spawnEnemy("goldenGolem", ["oSword"], 3, { hp: 0, melee: 1, ranged: 0, mastery: 0, specialty: 1 });
  foe.queue = [];
  foe.bodyKey = "juggernaut";
  room.lanes[0].push(foe);
  const piperFoe = spawnEnemy("paidPiper", [], 2, { hp: 1, melee: 0, ranged: 0, mastery: 0, specialty: 0 });
  piperFoe.queue = [];
  piperFoe.bodyKey = "hedge"; piperFoe.knightPulseBonus = undefined; delete piperFoe.knightPulseBonus;
  piperFoe.hedgePulseBonus = 2;
  room.lanes[0].push(piperFoe);
  room.unlockedBodies = new Set(["rookie", "leverage", "counterparty", "quakeCap"]);
  room.adoptedBodies = new Set(["rentier"]);
  room.draftedFoes = [{ bodyKey: "bloodfund", gear: ["oSpear"], greedy: true, owner: "p61", slot: 0,
    opt: { bodyKey: "bloodfund", gear: ["oSpear"] } }];

  const rooms = new Map([[room.code, room]]);
  const manager = createRunPersistence({ dataDir, rooms, intervalMs: 250 });
  ok(manager.flushSync({ force: true }), "old-key fixture envelope writes successfully");
  manager.close();

  const restored = loadSavedRooms(dataDir)[0];
  const hero = restored.players.get("p61");
  ok(hero.bodyKey === "cryptoChimera" && hero.homeBody === "cryptoChimera",
    "restored hero translates quakeCap -> cryptoChimera on bodyKey AND homeBody");
  ok(hero.chimeraCycle === 2 && hero.chimeraCardClock === 1
      && !("quakeCycle" in hero) && !("quakeCardClock" in hero),
    "mid-fight Crypto-Chimera rotation clock carries across under its renamed fields");
  ok(stable(hero.levelAllocation) === stable({ hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 1 })
      && Number.isFinite(allocationPoints("cryptoChimera", hero.levelAllocation)),
    "specialty allocation on the renamed body survives verbatim and stays legal under the live key");
  const golem = restored.lanes[0].find((f) => f.bodyKey === "goldenGolem");
  ok(!!golem && !restored.lanes[0].some((f) => f.bodyKey === "juggernaut"),
    "restored foe translates juggernaut -> goldenGolem");
  const piper = restored.lanes[0].find((f) => f.bodyKey === "paidPiper");
  ok(!!piper && piper.knightPulseBonus === 2 && !("hedgePulseBonus" in piper),
    "restored Paid Piper foe keeps its pulse bonus under the renamed field");
  ok(restored.unlockedBodies.has("royalRat") && restored.unlockedBodies.has("bondBehemoth")
      && restored.unlockedBodies.has("cryptoChimera") && !restored.unlockedBodies.has("leverage")
      && !restored.unlockedBodies.has("counterparty"),
    "unlockedBodies Set members translate (stocked/felled roster)");
  ok(restored.adoptedBodies.has("vengefulVampire") && !restored.adoptedBodies.has("rentier"),
    "adoptedBodies Set members translate");
  ok(restored.draftedFoes[0].bodyKey === "marketCrashMinotaur"
      && restored.draftedFoes[0].opt.bodyKey === "marketCrashMinotaur",
    "drafted/stocked foe specs translate bloodfund -> marketCrashMinotaur (nested opt too)");
  ok(restored.level.nodes[0].foes[0].bodyKey === "tollTroll",
    "map-node pending foe lists translate ratTrader -> tollTroll");
  // Play the restored run forward: the live snapshot pipeline must resolve every translated body
  // against the REAL tables (an unknown key would surface as a missing name/blank body here).
  const snap = connectedSnapshot(restored);
  const snapHero = snap.players.find((entry) => entry.id === "p61");
  ok(snapHero?.bodyKey === "cryptoChimera",
    "restored run plays forward: the live snapshot pipeline ships the translated body key");
  ok(leveledPassives(hero).length > 0,
    "restored run plays forward: leveling tables resolve ranked passives under the live key");
}

try {
  await persistenceFormatChecks();
  counterFloorChecks();
  await asyncNonBlockingFlushChecks();
  await diskQueueChecks();
  await exactRestartReconnect();
  await browserAwayResumeCheck();
  await highIdRestoreCheck();
  laneCooldownDurabilityCheck();
  lootCreditDurabilityCheck();
  await corruptBootCheck();
  await dormantRestoreRetentionCheck();
  legacyBodyKeyRestoreCheck();
  console.log(`\nRUN PERSISTENCE: ${passed} passed, 0 failed`);
} finally {
  for (const ws of liveSockets) try { ws.close(); } catch {}
  for (const processHandle of liveProcesses) {
    try { processHandle.kill(); } catch {}
    try { await withTimeout(processHandle.exited, 2_000, "cleanup exit"); } catch {}
  }
  if (scratch.startsWith(join(tmpdir(), "km-run-persistence-"))) rmSync(scratch, { recursive: true, force: true });
}
