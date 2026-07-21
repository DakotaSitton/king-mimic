// Real mobile interaction regression for the dedicated level map. This deliberately holds a
// touch across a live-state callback storm: rebuilding the pressed node before touchend used to
// cancel the click, while tiny dismissal controls made the resulting sheet sticky.
// Run with a fresh server: BASE=http://localhost:3000 node test/mobile-map-interaction.test.js
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
let browser;
const errors = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

async function launchBrowser() {
  const channel = process.platform === "win32" ? "msedge" : "chrome";
  try {
    return await chromium.launch({ headless: true, channel });
  } catch (error) {
    // Local contributors may have Playwright Chromium instead of a system browser channel.
    if (process.env.CI) throw error;
    return chromium.launch({ headless: true });
  }
}

try {
  browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 852, height: 393 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const cdp = await context.newCDPSession(page);

  async function slowTouch(locator, duringHold) {
    await locator.waitFor({ state: "visible" });
    const box = await locator.boundingBox();
    assert(box && box.width > 0 && box.height > 0, "touch target has a visible box");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, radiusX: 3, radiusY: 3, force: 1, id: 1 }],
    });
    if (duringHold) await duringHold();
    await page.waitForTimeout(120);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }

  await page.goto(`${BASE}/?touch=1&harness=1&auto=setup`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Choose your first room/i }).waitFor({ timeout: 15_000 });
  await page.locator("[data-openmap]").tap();
  await page.locator("body.map-panel-open #map").waitFor();

  const combatNodes = page.locator("#map .node-combat");
  assert(await combatNodes.count() > 1, "whole-floor combat nodes are present");
  const firstNode = combatNodes.first();

  await slowTouch(firstNode, async () => {
    const stable = await page.evaluate(() => {
      const held = document.querySelector("#map .node-combat");
      for (let i = 0; i < 12; i++) {
        for (const cb of window.KM._cbs) cb(window.KM.state, window.KM.activeId ?? window.KM.you);
      }
      return held?.isConnected && held === document.querySelector("#map .node-combat");
    });
    assert(stable, "pressed map node survives live-state refreshes");
  });
  const inspector = page.locator("#map .map-inspector:not(.hidden)");
  await inspector.waitFor();
  assert(await inspector.count() === 1, "held touch opens exactly one room-intel sheet");

  const back = inspector.getByRole("button", { name: "Back to full map" });
  const backBox = await back.boundingBox();
  assert(backBox?.width >= 44 && backBox?.height >= 44, "MAP back control is at least 44×44 CSS pixels");
  await slowTouch(back);
  await page.locator("#map .map-inspector").waitFor({ state: "hidden" });
  assert(await page.locator("body.map-panel-open").count() === 1, "MAP back returns to the same open map");

  await slowTouch(combatNodes.nth(1));
  await inspector.waitFor();
  const close = page.getByRole("button", { name: "Close level map" });
  const closeBox = await close.boundingBox();
  assert(closeBox?.width >= 44 && closeBox?.height >= 44, "CLOSE control is at least 44×44 CSS pixels");
  await slowTouch(close);
  await page.locator("body:not(.map-panel-open)").waitFor();
  assert(await page.locator("#map .map-inspector.hidden").count() === 1,
    "one CLOSE touch dismisses both room intel and the map");

  await page.locator("[data-openmap]").tap();
  await slowTouch(page.locator("#map .node-combat").first());
  await inspector.waitFor();
  await slowTouch(inspector.getByRole("button", { name: "Back to full map" }));
  await slowTouch(page.getByRole("button", { name: "Close level map" }));
  await page.locator(".room-card[data-advance]").first().tap();
  await page.waitForFunction(() => window.KM?.state?.phase === "setup", null, { timeout: 10_000 });
  assert(true, "room selection still advances after repeated map open/inspect/close cycles");
  assert(errors.length === 0, `no browser errors (${errors.join(" | ") || "none"})`);

  await context.close();
  console.log("\nMOBILE MAP INTERACTION OK");
} catch (error) {
  console.error(`\nMOBILE MAP INTERACTION FAILED: ${error.stack || error}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
}
