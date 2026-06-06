// Headless screenshotter — drives the live game and captures PNGs.
// Playwright's own browser launch hangs under Bun, so we connect over CDP to an
// Edge that's already running headless with --remote-debugging-port=9222.
// Driver: tools/shoot.ps1 (starts Edge, runs this, cleans up). Server must be up.
import { chromium } from "playwright";

const URL = process.env.URL ?? "http://localhost:3000";
const CDP = process.env.CDP ?? "http://127.0.0.1:9222";
const OUT = "tools/shots";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const page = await context.newPage();
await page.setViewportSize({ width: 1120, height: 760 });
await page.goto(URL, { waitUntil: "networkidle" });

// Create a normal room (blank code = random, NOT god mode) so we see real numbers.
await page.fill("#name", "Hero");
await page.click("#createBtn");

// --- shot 1: the draft overlay ---
await page.waitForSelector("#draftOverlay:not(.hidden)", { timeout: 5000 });
await wait(300);
await page.screenshot({ path: `${OUT}/1-draft.png` });
console.log("captured draft");

// pick 3 cards -> auto-advances to setup
const opts = await page.$$(".draft-opt");
for (let i = 0; i < 3 && i < opts.length; i++) { await opts[i].click(); await wait(120); }

// --- shot 2: setup (positioning, foes lined up, cooldowns frozen) ---
await page.waitForFunction(() => !document.getElementById("game").classList.contains("hidden"));
await wait(500);
await page.screenshot({ path: `${OUT}/2-setup.png` });
console.log("captured setup");

// begin combat, let a few ticks of charge bars build
await page.click("#startBtn");
await wait(1600);
await page.screenshot({ path: `${OUT}/3-combat.png` });
console.log("captured combat");

await page.close();
await browser.close();   // detaches CDP; the Edge process is killed by the PS driver
console.log("done");
