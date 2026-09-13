// Real-browser session recovery against an already-running private server.
// BASE=http://localhost:3996 node test/session-recovery.test.js
// Uses normal production rooms: harness rooms intentionally do not retain dropped seats.
// Fault injection affects transport only; every game snapshot comes from the real server.
import { chromium } from "playwright";

const BASE = (process.env.BASE ?? "http://localhost:3996").replace(/\/$/, "");
const TAKEOVER = "This run is open in another tab.";
const errors = [];
const contexts = [];
let browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

async function launchBrowser() {
  const channel = process.platform === "win32" ? "msedge" : "chrome";
  try { return await chromium.launch({ headless: true, channel }); }
  catch (error) {
    if (process.env.CI) throw error;
    return chromium.launch({ headless: true });
  }
}

async function newContext() {
  const context = await browser.newContext({
    viewport: { width: 1120, height: 820 }, hasTouch: false, deviceScaleFactor: 1,
  });
  context.setDefaultTimeout(10_000);
  contexts.push(context);
  // Observe browser-delivered messages without replacing handlers, delaying traffic, or
  // constructing state. The counter detects even a brief reclaim between stable UI checks.
  await context.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    const probe = window.__sessionRecoveryProbe = { joined: [], closes: [], connections: 0, playing: false };
    window.WebSocket = class extends NativeWebSocket {
      constructor(...args) {
        super(...args);
        probe.connections++;
        this.addEventListener("message", (event) => {
          let message;
          try { message = JSON.parse(event.data); } catch { return; }
          if (message.type === "joined") probe.joined.push({ code: message.code, you: message.you });
          if (message.type === "state" && message.phase === "playing") probe.playing = true;
        });
        this.addEventListener("close", (event) => probe.closes.push(event.code));
      }
    };
  });
  context.on("page", (page) => page.on("pageerror", (error) => errors.push(error.message)));
  return context;
}

const probe = (page) => page.evaluate(() => window.__sessionRecoveryProbe);
const phase = (page, wanted) => page.waitForFunction(
  (expected) => window.KM?.state?.phase === expected, wanted, { timeout: 15_000 });
const identity = (page) => page.evaluate(() => ({
  you: window.KM?.you, room: localStorage.getItem("km_room"), token: localStorage.getItem("km_token"),
}));

async function createRoom(page) {
  await page.goto(BASE, { waitUntil: "load" });
  await page.locator("#createBtn").click();
  await phase(page, "draft");
  return identity(page);
}

async function leaveOwnedRooms(context) {
  // Only connected clients can send; replaced clients retain identity but cannot send Leave.
  for (const page of context.pages()) {
    if (page.isClosed()) continue;
    await page.evaluate(() => window.KM?.send({ type: "leave" })).catch(() => {});
  }
  // Give the server a turn to process the explicit cleanup before contexts close their sockets.
  const page = context.pages().find((candidate) => !candidate.isClosed());
  if (page) await page.waitForTimeout(150).catch(() => {});
}

async function stableOwner(active, replaced, expected, label) {
  const before = await Promise.all([probe(active), probe(replaced)]);
  await active.waitForTimeout(3_300); // More than three former one-second reclaim cycles.
  const after = await Promise.all([probe(active), probe(replaced)]);
  assert(after.every((value, i) => value.joined.length === before[i].joined.length),
    `${label}: no automatic seat-stealing loop`);
  const current = await identity(active);
  assert(current.you === expected.you && current.room === expected.room,
    `${label}: original room and player seat retained`);
}

async function proveForwardProgress(page) {
  await page.locator("[data-bundle]:not([disabled])").first().click();
  await phase(page, "won");
  const firstRoom = page.locator(".room-card.node-combat[data-advance]").first();
  await firstRoom.waitFor({ state: "visible" });
  // Foe chips inside the room card intentionally inspect; use its explicit Enter action.
  await firstRoom.locator(".room-enter").click();
  await phase(page, "setup");
  await page.getByRole("button", { name: /begin combat/i }).filter({ visible: true }).first().click();
  await phase(page, "playing");
  const start = await page.evaluate(() => window.KM.state.tick);
  await page.waitForFunction((tick) => window.KM?.state?.tick > tick, start);
  assert(true, "reclaimed client drafts, selects a room, starts combat, and advances the live simulation");
}

async function takeoverRecovery() {
  const context = await newContext();
  try {
    const first = await context.newPage();
    const original = await createRoom(first);
    const second = await context.newPage();
    await second.goto(BASE, { waitUntil: "load" });
    await phase(second, "draft");
    assert(await first.evaluate(() => document.visibilityState === "visible")
      && await second.evaluate(() => document.visibilityState === "visible"),
    "both same-profile clients remain visible, exercising simultaneous window ownership");
    await first.locator("#lobbyErr").filter({ hasText: TAKEOVER }).waitFor({ state: "visible" });
    await first.getByRole("button", { name: "Resume here", exact: true }).waitFor({ state: "visible" });
    if (process.env.SESSION_RECOVERY_SHOT)
      await first.screenshot({ path: process.env.SESSION_RECOVERY_SHOT, fullPage: true });
    assert((await probe(first)).closes.includes(4001), "replaced socket receives the dedicated takeover close code");
    await stableOwner(second, first, original, "second window owns the run");

    const joinedBefore = (await probe(first)).joined.length;
    await first.evaluate(() => {
      window.dispatchEvent(new Event("pageshow"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await stableOwner(second, first, original, "foreground events do not reclaim a replaced session");
    assert((await probe(first)).joined.length === joinedBefore, "replaced window remains inactive after foreground events");

    await first.getByRole("button", { name: "Resume here", exact: true }).click();
    await first.waitForFunction((count) => window.__sessionRecoveryProbe.joined.length > count, joinedBefore);
    await second.locator("#lobbyErr").filter({ hasText: TAKEOVER }).waitFor({ state: "visible" });
    await second.getByRole("button", { name: "Resume here", exact: true }).waitFor({ state: "visible" });
    await stableOwner(first, second, original, "explicit Resume here transfers ownership once");
    await proveForwardProgress(first);
  } finally { await leaveOwnedRooms(context); await context.close(); }
}

async function entryFailureRecovery() {
  const context = await newContext();
  try {
    const page = await context.newPage();
    let failConnections = true;
    // A closed transport before admission must be actionable even though `you` is still null.
    // Playwright has no unrouteWebSocket: disabling this gate restores ordinary server forwarding.
    await page.routeWebSocket(/\/ws$/, (route) => {
      if (failConnections) route.close({ code: 1013, reason: "test connection unavailable" });
      else route.connectToServer();
    });
    await page.goto(BASE, { waitUntil: "load" });
    await page.locator("#createBtn").click();
    await page.waitForFunction(() => {
      const message = document.getElementById("lobbyErr")?.textContent ?? "";
      return /connect/i.test(message) && /could not|fail|unable/i.test(message);
    });
    assert(await page.locator("#lobbyErr").isVisible(), "initial connection failure is visible in the entry lobby");
    assert((await probe(page)).joined.length === 0, "failed entry has not silently created or joined a room");
    failConnections = false;
    await page.locator("#createBtn").click();
    await phase(page, "draft");
    assert((await probe(page)).joined.length === 1, "entry retry joins one real room after connectivity returns");
  } finally { await leaveOwnedRooms(context); await context.close(); }
}

async function savedRunFailureRecovery() {
  const context = await newContext();
  try {
    const page = await context.newPage();
    const original = await createRoom(page);
    let failConnections = true;
    let failedAttempts = 0;
    await page.routeWebSocket(/\/ws$/, (route) => {
      if (failConnections) {
        failedAttempts++;
        route.close({ code: 1013, reason: "test connection unavailable" });
      } else route.connectToServer();
    });
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => {
      const message = document.getElementById("lobbyErr")?.textContent ?? "";
      return /connect/i.test(message) && /retry/i.test(message);
    });
    const saved = await identity(page);
    assert(saved.room === original.room && saved.token === original.token,
      "failed saved-run admission preserves the durable room and reconnect token");
    assert((await probe(page)).joined.length === 0, "saved-run failure occurs before any seat is assigned to the reloaded client");
    const deadline = Date.now() + 8_000;
    while (failedAttempts < 2 && Date.now() < deadline) await page.waitForTimeout(100);
    assert(failedAttempts >= 2, "saved-run admission retries automatically before receiving its first joined response");
    failConnections = false;
    await phase(page, "draft");
    const resumed = await identity(page);
    assert(resumed.you === original.you && resumed.room === original.room && resumed.token === original.token,
      "restored connectivity automatically resumes the exact original room and seat");
    await proveForwardProgress(page);
  } finally { await leaveOwnedRooms(context); await context.close(); }
}

async function silentAdmissionRecovery() {
  const context = await newContext();
  try {
    const page = await context.newPage();
    let holdAdmission = true;
    await page.routeWebSocket(/\/ws$/, (route) => {
      // Open the browser transport but neither connect a server nor reply to admission.
      if (!holdAdmission) route.connectToServer();
    });
    await page.goto(BASE, { waitUntil: "load" });
    await page.locator("#createBtn").click();
    await page.waitForFunction(() => {
      const message = document.getElementById("lobbyErr")?.textContent ?? "";
      return /connect/i.test(message) && /could not|fail|unable/i.test(message);
    }, null, { timeout: 15_000 });
    assert((await probe(page)).joined.length === 0, "silent admission timeout reports failure without assigning a seat");
    holdAdmission = false;
    await page.locator("#createBtn").click();
    await phase(page, "draft");
    assert((await probe(page)).joined.length === 1, "entry recovers after a silent admission timeout");
  } finally { await leaveOwnedRooms(context); await context.close(); }
}

try {
  const health = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(5_000) });
  assert(health.ok, `existing private server responds at ${BASE}`);
  browser = await launchBrowser();
  await takeoverRecovery();
  await entryFailureRecovery();
  await savedRunFailureRecovery();
  await silentAdmissionRecovery();
  assert(errors.length === 0, `no uncaught browser errors (${errors.join(" | ") || "none"})`);
  console.log("\nSESSION RECOVERY OK");
} catch (error) {
  console.error(`\nSESSION RECOVERY FAILED: ${error.stack || error}`);
  process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close();
}
