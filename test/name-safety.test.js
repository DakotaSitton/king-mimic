// Public-name boundary regression. Run against a private server:
//   PORT=3998 bun run server.js
//   BASE=http://localhost:3998 node test/name-safety.test.js
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
let pass = 0;
let stage = "normalization assertions";
const watchdog = setTimeout(() => {
  console.error(`FAIL: name-safety browser regression timed out during ${stage}`);
  process.exit(1);
}, 20_000);
const ok = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  pass++;
  console.log(`PASS: ${label}`);
};

async function nameFromServer(name) {
  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(BASE.replace(/^http/, "ws") + "/ws");
    let playerId = null;
    const timer = setTimeout(() => { try { ws.close(); } catch {} reject(new Error("snapshot name timeout")); }, 5000);
    ws.onerror = () => { clearTimeout(timer); reject(new Error("snapshot name websocket error")); };
    ws.onopen = () => ws.send(JSON.stringify({ type: "create", name, nt: true }));
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "joined") playerId = message.you;
      if (message.type !== "state" || !playerId) return;
      const player = message.players?.find((candidate) => candidate.id === playerId);
      if (!player) return;
      clearTimeout(timer);
      ws.close();
      resolve(player.name);
    };
  });
}

stage = "server normalization assertions";
ok(await nameFromServer(null) === "Adventurer", "non-string name uses the safe default");
ok(await nameFromServer(" \u0000\t\r\n ") === "Adventurer", "control-only name uses the safe default");
ok(await nameFromServer("  Zoë 🧙🏽‍♀️ & Co  ") === "Zoë 🧙🏽‍♀️ & Co", "Unicode graphemes and punctuation survive trimming");
const capped = await nameFromServer("😀".repeat(20));
ok([...new Intl.Segmenter("und", { granularity: "grapheme" }).segment(capped)].length === 14,
  "name cap counts Unicode graphemes, not UTF-16 code units");

// Exactly 14 graphemes after control stripping/trimming: if a player name reaches an innerHTML
// sink unescaped this becomes a real SVG element and runs its onload handler.
const submitted = " \u0000<svg/onload=x>TAIL ";
const expected = "<svg/onload=x>";
ok(await nameFromServer(submitted) === expected, "malicious-shaped name is normalized without corrupting display text");

stage = "browser launch";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 3, hasTouch: true });
page.setDefaultTimeout(10_000);
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error)));
await page.addInitScript(() => {
  // Keep this regression out of human telemetry without adding a production-only client hook.
  const send = WebSocket.prototype.send;
  WebSocket.prototype.send = function sendWithoutTelemetry(raw) {
    try {
      const message = JSON.parse(raw);
      if (message.type === "create") { message.nt = true; raw = JSON.stringify(message); }
    } catch {}
    return send.call(this, raw);
  };
});

try {
  stage = "page load";
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  stage = "create malicious-name room";
  await page.evaluate((value) => {
    // DOM clicks avoid Playwright's desktop-style actionability heuristics over the touch-only
    // landscape shell; these are the exact handlers a real tap invokes.
    document.querySelector('#bodiesPick [data-bodies="2"]').click();
    document.querySelector("#name").value = value;
    document.querySelector("#createBtn").click();
  }, submitted); // two bodies force the derived bot name through draft innerHTML
  stage = "normalized snapshot";
  await page.waitForFunction((want) => {
    const km = window.KM;
    return km?.state?.players?.some((player) => player.id === km.you && player.name === want);
  }, expected);

  stage = "render inspection";
  const rendered = await page.evaluate((want) => {
    const primary = window.KM.state.players.find((player) => player.id === window.KM.you);
    const bot = window.KM.state.players.find((player) => player.bot && player.owner === window.KM.you);
    const overlay = document.querySelector("#draftOverlay");
    return {
      primaryName: primary?.name,
      botName: bot?.name,
      injectedSvgCount: overlay?.querySelectorAll("svg[onload]").length ?? -1,
      literalNameVisible: overlay?.textContent.includes(want) ?? false,
    };
  }, expected);

  ok(rendered.primaryName === expected, "server snapshot carries the normalized human name");
  ok(rendered.botName === "Companion 1", "server-derived companion name is fixed safe text");
  ok(rendered.injectedSvgCount === 0, "rendered draft markup contains no injected SVG element");
  ok(rendered.literalNameVisible, "escaped name remains visible as literal player text");
  ok(pageErrors.length === 0, `malicious-shaped render raises no page errors (${pageErrors.join("; ")})`);
} finally {
  stage = "browser close";
  await browser.close();
}

console.log(`NAME SAFETY: ${pass} passed, 0 failed`);
clearTimeout(watchdog);
process.exit(0); // Playwright occasionally leaves an Edge transport handle alive under Bun on Windows.
