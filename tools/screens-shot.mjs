// screens-shot.mjs — capture the NEW SCREENS reliably via a DEMO (god) room on the live :3000.
// God mode = the player can't lose (999 HP) + every body unlocked, so we always reach a WON screen (the
// rooms↔backpack toggle + room contents + "Boss in N" counter) and can show the WEAR menu (⭐ elites, ◈5).
// Usage: node tools/screens-shot.mjs   (server must be up on :3000)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = join(import.meta.dirname, "..", "tools", "shots", "new-screens");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[screens]", ...a);
const shots = [];

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 900, height: 820 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e.message || e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
const shoot = async (label) => { const f = join(OUT, label + ".png"); await page.evaluate(() => window.dispatchEvent(new Event("resize"))); await sleep(200); await page.screenshot({ path: f }); shots.push(f); log("📸", label); };
const st = () => page.evaluate(() => window.KM?.state ?? null);
const send = (m) => page.evaluate((x) => window.KM.send(x), m);

await page.goto(BASE + "/?harness=1", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!window.KM, { timeout: 12000 });
await page.evaluate(() => {
  document.querySelector('#bodiesPick .bp-opt[data-bodies="1"]')?.click();
  document.getElementById("name").value = "Claude";
  document.getElementById("code").value = "DEMO";        // god mode → unbeatable + all bodies unlocked
  document.getElementById("createBtn").click();
});
await page.waitForFunction(() => !!window.KM?.state, { timeout: 9000 });

// god combat: just fire a card each tick at the front foe until the room is WON
const deadline = Date.now() + 150000;
let wonShot = false, wearShot = false;
while (Date.now() < deadline) {
  const s = await st();
  if (!s) { await sleep(200); continue; }
  if (s.phase === "lobby") { await send({ type: "start" }); }
  else if (s.phase === "draft") {
    const w = (s.draft?.wheel ?? []).find((x) => !x.lockedBy);
    if (w) await send({ type: "draftPick", bundle: w.id });
    else if (s.draft?.classes?.[0]) await send({ type: "chooseClass", key: s.draft.classes[0].key });
  } else if (s.phase === "setup") {
    if (!wearShot) {                                       // grab the WEAR menu here (side panel + modal are mounted)
      try {
        await page.waitForSelector(".km-body-modal", { timeout: 4000 });
        for (let i = 0; i < 15; i++) { const n = await page.evaluate(() => document.querySelectorAll(".km-body-modal .km-body-grid > *").length); if (n > 0) break; await sleep(300); }
        await page.evaluate(() => document.querySelector(".km-body-modal")?.classList.remove("hidden"));
        await sleep(500); await shoot("02-wear-menu-elites");
        await page.evaluate(() => document.querySelector(".km-body-modal")?.classList.add("hidden"));
      } catch (e) { log("wear skip:", String(e).slice(0, 60)); }
      wearShot = true;
    }
    await send({ type: "start" });
  }
  else if (s.phase === "playing") {
    const you = await page.evaluate(() => window.KM.you);
    const me = (s.players ?? []).find((p) => p.id === you) ?? s.players?.[0];
    const lane = me?.lane ?? 0;
    const foe = (s.lanes?.[lane]?.enemies ?? []).find((e) => (e.hp ?? 0) > 0) || s.boss;
    const card = (me?.hand ?? []).find((c) => c.affordable);
    if (foe) await send({ type: "target", foeId: foe.id });
    if (card) await send({ type: "playCard", id: card.id });
  } else if (s.phase === "won") {
    if (!wonShot) { await sleep(400); await shoot("01-won-rooms-toggle+contents+bosscounter"); wonShot = true; break; }
  } else if (s.phase === "shop") { await sleep(400); await shoot("01b-shop"); break; }
  await sleep(180);
}

// the WEAR menu: unhide the modal (rendered live) → ⭐ elites + ◈5 adopt price among the unlocked bodies
try {
  await page.waitForSelector(".km-body-modal", { timeout: 6000 });
  for (let i = 0; i < 25; i++) { const n = await page.evaluate(() => document.querySelectorAll(".km-body-modal .km-body-grid > *").length); if (n > 0) break; await sleep(300); }
  const kids = await page.evaluate(() => document.querySelectorAll(".km-body-modal .km-body-grid > *").length);
  await page.evaluate(() => document.querySelector(".km-body-modal")?.classList.remove("hidden"));
  await sleep(500);
  await shoot("02-wear-menu-elites");
  log("wear grid bodies:", kids);
} catch (e) { log("wear capture skipped:", String(e).slice(0, 80)); }

log("done. shots:", shots.length, "| jsErrors:", errs.length, errs.slice(0, 2));
await browser.close();
process.exit(0);
