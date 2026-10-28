// REAL-game driver for hex tactics: fresh tac-server on a throwaway port (or BASE=url), real Edge
// phones at 852x393 touch, playing ONLY through taps on the real UI. Screenshots → tools/shots/tac/.
//   node tools/tac-shoot.mjs                 (solo, 2 rooms)
//   PLAYERS=2 ROOMS=2 node tools/tac-shoot.mjs
//   PORTRAIT=1 / DESKTOP=1 change the viewport.
import { chromium } from "playwright";
import { spawn } from "child_process";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "tools", "shots", "tac");
mkdirSync(OUT, { recursive: true });
const PLAYERS = +(process.env.PLAYERS ?? 1), ROOMS = +(process.env.ROOMS ?? 2), BUDGET = +(process.env.BUDGET ?? 240);
const VP = process.env.DESKTOP ? { width: 1440, height: 860 } : process.env.PORTRAIT ? { width: 393, height: 852 } : { width: 852, height: 393 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let server = null, base = process.env.BASE;
if (!base) {
  const port = 3300 + Math.floor(Math.random() * 600);
  server = spawn("bun", ["run", "tac-server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(port), FOE_BEAT_MS: "260" }, stdio: ["ignore", "pipe", "pipe"] });
  server.stderr.on("data", (d) => process.stderr.write("[server] " + d));
  base = `http://localhost:${port}`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + "/health")).ok) break; } catch {} await sleep(150); }
}
const room = "shoot" + Math.random().toString(36).slice(2, 7);
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "msedge", headless: true });
const errors = [];
const stats = { plays: 0, moves: 0, ends: 0, rooms: 0, inspects: 0, foeTurns: 0, shots: [] };
let shotN = 0;
async function shot(page, name) {
  const f = join(OUT, `${String(++shotN).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: f }); stats.shots.push(f);
}
async function phone(i) {
  const ctx = await browser.newContext({ viewport: VP, hasTouch: !process.env.DESKTOP, isMobile: !process.env.DESKTOP, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`p${i} pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`p${i} console: ${m.text()}`); });
  page.on("response", (r) => { if (r.status() >= 400) errors.push(`p${i} HTTP ${r.status()} ${r.url()}`); });
  await page.goto(`${base}/?room=${room}`);
  await page.fill("#name", ["Ana", "Bo", "Cy"][i] ?? "P" + i);
  await page.tap("#go");
  return page;
}
const tapAt = async (page, b) => page.touchscreen ? page.mouse.click(b.x, b.y) : null;
async function tapSel(page, sel) {
  const b = await page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; }, sel);
  if (!b) return false;
  if (process.env.DESKTOP) await page.mouse.click(b.x, b.y); else await page.touchscreen.tap(b.x, b.y);
  return true;
}
const visible = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && !e.classList.contains("hidden") && e.offsetParent !== null; }, sel);
const state = (page) => page.evaluate(() => ({
  screen: ["boot", "draft", "doors", "reward", "over"].find((id) => !document.getElementById(id).classList.contains("hidden")) ?? (document.getElementById("dock").classList.contains("hidden") ? "?" : "fight"),
  banner: document.getElementById("banner").textContent, endEnabled: !document.getElementById("end").disabled,
  moxie: +document.getElementById("mx-num").textContent,
}));

async function myTurn(page, label) {
  // 1) play any card that has a lit target
  for (let guard = 0; guard < 8; guard++) {
    let played = false;
    for (let s = 0; s < 3; s++) {
      const info = await page.evaluate((s) => { const b = document.querySelector(`#hand .card[data-slot="${s}"]`); return { ok: b && !b.classList.contains("empty") && !b.classList.contains("broke") && !b.disabled }; }, s);
      if (!info.ok) continue;
      await tapSel(page, `#hand .card[data-slot="${s}"]`); await sleep(120);
      const hint = await page.evaluate(() => document.getElementById("hint").textContent);
      if (!stats.armedShot) { stats.armedShot = 1; await shot(page, `${label}-card-armed`); }
      const before = await page.evaluate(() => document.getElementById("mx-num").textContent);
      if (/card again/.test(hint)) {
        await tapSel(page, `#hand .card[data-slot="${s}"]`);
      } else if (await page.$(".tok.target")) {
        const id = await page.evaluate(() => document.querySelector(".tok.target").dataset.id);
        await tapSel(page, `.tok[data-id="${id}"] .ring`);
        if (/hex in range/.test(hint)) { await sleep(120); await tapSel(page, `.tok[data-id="${id}"] .ring`); }
      } else { await tapSel(page, `#hand .card[data-slot="${s}"]`); continue; }
      await sleep(350);
      const after = await page.evaluate(() => document.getElementById("mx-num").textContent);
      if (after !== before) { stats.plays++; played = true; break; }
      await page.keyboard.press("Escape");
    }
    if (await state(page).then((s) => s.screen !== "fight")) return;
    if (played) continue;
    // 2) walk: the lit hex closest to the nearest foe, cheap ones first
    const step = await page.evaluate(() => {
      const foes = [...document.querySelectorAll(".tok.foe")].map((t) => t.querySelector(".ring").getBoundingClientRect());
      const me = document.querySelector(".tok.me .ring")?.getBoundingClientRect();
      if (!foes.length || !me) return null;
      const c = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
      const near = (p) => Math.min(...foes.map((f) => Math.hypot(c(f).x - p.x, c(f).y - p.y)));
      const lit = [...document.querySelectorAll(".tile.mv1, .tile.mv2")].map((t) => ({ p: c(t.getBoundingClientRect()), cost: t.classList.contains("mv2") ? 2 : 1 }));
      const here = near(c(me));
      const best = lit.sort((a, b) => near(a.p) - near(b.p))[0];
      return best && near(best.p) < here - 5 ? best : null;
    });
    if (!step) break;
    const before = await page.evaluate(() => document.querySelector(".tok.me")?.style.transform);
    for (let k = 0; k < step.cost; k++) { await page.touchscreen.tap(step.p.x, step.p.y); await sleep(120); }
    await sleep(800);
    const after = await page.evaluate(() => document.querySelector(".tok.me")?.style.transform);
    if (after === before) break;
    stats.moves++;
  }
  if (!stats.inspectShot && await page.$(".tok.foe")) {
    const id = await page.evaluate(() => document.querySelector(".tok.foe").dataset.id);
    await tapSel(page, `.tok[data-id="${id}"] .ring`); await sleep(250);
    if (await visible(page, "#inspect")) { stats.inspects++; stats.inspectShot = 1; await shot(page, `${label}-inspect-foe`); }
    await tapSel(page, "#inspect .x"); await sleep(150);
  }
  if ((await state(page)).endEnabled) { await tapSel(page, "#end"); stats.ends++; }
}

const pages = [];
for (let i = 0; i < PLAYERS; i++) pages.push(await phone(i));
const t0 = Date.now();
let lastScreen = "", seenFoeTurn = false, fightShots = 0;
try {
  while ((Date.now() - t0) / 1000 < BUDGET) {
    const st = await state(pages[0]);
    if (st.screen !== lastScreen) { lastScreen = st.screen; if (st.screen !== "fight" && st.screen !== "?") await shot(pages[0], st.screen); }
    if (st.screen === "draft") { for (const p of pages) await tapSel(p, "#offers .choice"); await sleep(400); continue; }
    if (st.screen === "doors") { if (stats.rooms >= ROOMS) break; for (const p of pages) await tapSel(p, "#door-list .choice"); stats.rooms++; await sleep(700); fightShots = 0; continue; }
    if (st.screen === "reward") {
      for (const p of pages) { await tapSel(p, "#loot .choice"); await tapSel(p, "#bodies .choice"); await sleep(150); }
      await shot(pages[0], "reward-picked");
      for (const p of pages) await tapSel(p, "#reward-done");
      await sleep(600); continue;
    }
    if (st.screen === "over") break;
    if (st.screen === "fight") {
      if (fightShots === 0) { fightShots++; await sleep(500); await shot(pages[0], `room${stats.rooms}-start`); }
      if (/Foes/.test(st.banner)) {
        if (!seenFoeTurn) { seenFoeTurn = true; await sleep(300); await shot(pages[0], `room${stats.rooms}-foe-turn`); }
        stats.foeTurns++; await sleep(300); continue;
      }
      let acted = false;
      for (const [i, p] of pages.entries()) {
        const s = await state(p);
        if (s.screen === "fight" && s.endEnabled) { await myTurn(p, `p${i}-room${stats.rooms}`); acted = true; }
      }
      if (!acted) await sleep(250);
      else if (fightShots === 1) { fightShots++; await shot(pages[0], `room${stats.rooms}-after-turn`); }
      continue;
    }
    await sleep(250);
  }
} finally {
  await shot(pages[0], "final");
  if (PLAYERS > 1) await shot(pages[1], "final-p1");
  await browser.close();
  server?.kill();
}
const okRun = errors.length === 0 && stats.plays > 0 && stats.ends > 0 && stats.inspects > 0 && seenFoeTurn;
console.log(JSON.stringify({ base, room, viewport: VP, ...stats, shots: stats.shots.length, seenFoeTurn, errors }, null, 1));
console.log(okRun ? "TAC SHOOT OK" : "TAC SHOOT FAILED");
process.exit(okRun ? 0 : 1);
