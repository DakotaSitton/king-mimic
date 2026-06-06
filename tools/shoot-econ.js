// Captures the new between-rooms ECONOMY screen via an injected ?demo=won state,
// plus a live combat shot. Connects over CDP to an already-running headless Edge
// (Playwright's own launch hangs under Bun). Driver: inline PS in the session, or
// adapt tools/shoot.ps1 to run this instead of screenshot.js. Server must be up.
import { chromium } from "playwright";

const URL = process.env.URL ?? "http://localhost:3000";
const CDP = process.env.CDP ?? "http://127.0.0.1:9222";
const OUT = "tools/shots";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const page = await context.newPage();
await page.setViewportSize({ width: 1120, height: 760 });

// The economy / between-rooms screen (offline demo state — deterministic).
await page.goto(`${URL}/?demo=won`, { waitUntil: "networkidle" });
await page.waitForSelector("#draftOverlay:not(.hidden)", { timeout: 5000 });
await wait(400);
await page.screenshot({ path: `${OUT}/econ-won.png` });
console.log("captured econ-won");

await page.close();
await browser.close();
console.log("done");
