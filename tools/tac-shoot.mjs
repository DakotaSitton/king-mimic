// REAL-game driver for hex tactics floors: fresh tac-server on a throwaway port (or BASE=url), real
// Edge phones (852x393 touch by default), playing ONLY through taps on the real UI: draft → explore
// the floor (fog, free roaming) → fights (cards, moves, end turn) → loot → stairs → next floor.
// Screenshots → tools/shots/tac/.
//   node tools/tac-shoot.mjs                 (solo, up to 2 floors)
//   PLAYERS=2 FLOORS=2 node tools/tac-shoot.mjs
//   PORTRAIT=1 / DESKTOP=1 / VW=812 VH=335 change the viewport.
import { chromium } from "playwright";
import { spawn } from "child_process";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "tools", "shots", "tac");
mkdirSync(OUT, { recursive: true });
const PLAYERS = +(process.env.PLAYERS ?? 1), FLOORS = +(process.env.FLOORS ?? 2), BUDGET = +(process.env.BUDGET ?? 240);
const VP = process.env.VW ? { width: +process.env.VW, height: +process.env.VH } : process.env.DESKTOP ? { width: 1440, height: 860 } : process.env.PORTRAIT ? { width: 393, height: 852 } : { width: 852, height: 393 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let server = null, base = process.env.BASE;
if (!base) {
  const port = 3300 + Math.floor(Math.random() * 600);
  server = spawn("bun", ["run", "tac-server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(port), FOE_BEAT_MS: "220" }, stdio: ["ignore", "pipe", "pipe"] });
  server.stderr.on("data", (d) => process.stderr.write("[server] " + d));
  base = `http://localhost:${port}`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + "/health")).ok) break; } catch {} await sleep(150); }
}
const room = "shoot" + Math.random().toString(36).slice(2, 7);
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "msedge", headless: true });
const errors = [];
const stats = { plays: 0, moves: 0, roams: 0, ends: 0, fights: 0, floors: 1, descents: 0, wears: 0, inspects: 0, foeTurns: 0, shots: [] };
const once = new Set();
let shotN = 0;
async function shot(page, name) {
  const f = join(OUT, `${String(++shotN).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: f }); stats.shots.push(f);
}
async function shotOnce(page, name) { if (once.has(name)) return; once.add(name); await shot(page, name); }
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
async function tapXY(page, x, y) { if (process.env.DESKTOP) await page.mouse.click(x, y); else await page.touchscreen.tap(x, y); }
async function tapSel(page, sel) {
  const b = await page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; }, sel);
  if (!b) return false;
  await tapXY(page, b.x, b.y);
  return true;
}
const visible = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && !e.classList.contains("hidden") && e.offsetParent !== null; }, sel);
const state = (page) => page.evaluate(() => ({
  screen: ["boot", "draft", "camp", "over"].find((id) => !document.getElementById(id).classList.contains("hidden")) ?? (document.getElementById("dock").classList.contains("hidden") ? "?" : "floor"),
  banner: document.getElementById("banner").textContent, endEnabled: !document.getElementById("end").disabled,
  where: document.getElementById("where").textContent,
  context: document.getElementById("context").classList.contains("hidden") ? "" : document.getElementById("context").textContent,
}));
// on-screen centre of a hex tile / token (only ones inside the visible board)
const tilePoints = (page, sel) => page.evaluate((sel) => {
  const box = document.getElementById("board").getBoundingClientRect();
  return [...document.querySelectorAll(sel)].map((g) => { const r = g.querySelector("polygon").getBoundingClientRect(); return { k: g.dataset.k, x: r.x + r.width / 2, y: r.y + r.height / 2 }; })
    .filter((p) => p.x > box.x + 12 && p.x < box.right - 12 && p.y > box.y + 40 && p.y < box.bottom - 12);
}, sel);
const visits = new Map();

async function explore(page) {
  const st = await state(page);
  if (/stairs/i.test(st.context)) { await shotOnce(page, "on-stairs"); await tapSel(page, "#context"); stats.descents++; await sleep(900); return; }
  // stairs on the map? walk there. Otherwise head for the nearest unexplored edge (frontier).
  const target = await page.evaluate((visited) => {
    const cells = new Map([...document.querySelectorAll(".cell")].map((g) => [g.dataset.k, g]));
    const ctr = (g) => { const r = g.querySelector("polygon").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    const box = document.getElementById("board").getBoundingClientRect();
    const onScreen = (p) => p.x > box.x + 12 && p.x < box.right - 12 && p.y > box.y + 44 && p.y < box.bottom - 12;
    const meR = document.querySelector(".tok.me .ring")?.getBoundingClientRect(); if (!meR) return null;
    const me = { x: meR.x + meR.width / 2, y: meR.y + meR.height / 2 };
    const D = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const known = [...cells.entries()].filter(([, g]) => g.classList.contains("floor") && !g.classList.contains("unseen"));
    const stairs = document.querySelector(".cell:not(.unseen) .stair")?.closest(".cell");
    let goal = stairs ? { k: stairs.dataset.k, ...ctr(stairs) } : null;
    if (!goal) {
      const frontier = known.filter(([k]) => { const [q, r] = k.split(",").map(Number); return D.some(([dq, dr]) => cells.get(`${q + dq},${r + dr}`)?.classList.contains("unseen")); })
        .map(([k, g]) => ({ k, ...ctr(g) })).filter((p) => !(visited[p.k] >= 2));
      goal = frontier.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    }
    if (!goal) return null;
    if (onScreen(goal)) return goal;
    const pts = known.map(([k, g]) => ({ k, ...ctr(g) })).filter(onScreen);
    return pts.sort((a, b) => Math.hypot(a.x - goal.x, a.y - goal.y) - Math.hypot(b.x - goal.x, b.y - goal.y))[0] ?? null;
  }, Object.fromEntries(visits));
  if (!target) { await sleep(300); return; }
  visits.set(target.k, (visits.get(target.k) ?? 0) + 1);
  await tapXY(page, target.x, target.y); stats.roams++;
  await sleep(1100);
}
async function fightTurn(page, label) {
  for (let guard = 0; guard < 8; guard++) {
    let played = false;
    for (let s = 0; s < 3; s++) {
      const ok = await page.evaluate((s) => { const b = document.querySelectorAll("#hand .card")[s]; return !!b && !b.classList.contains("empty") && !b.classList.contains("broke") && !b.disabled; }, s);
      if (!ok) continue;
      await tapSel(page, `#hand .card:nth-child(${s + 1})`); await sleep(120);
      const hint = await page.evaluate(() => document.getElementById("hint").textContent);
      await shotOnce(page, `${label}-card-armed`);
      const before = await page.evaluate(() => document.getElementById("mx-num").textContent);
      if (/card again/.test(hint)) await tapSel(page, `#hand .card:nth-child(${s + 1})`);
      else if (await page.$(".tok.target")) {
        const id = await page.evaluate(() => document.querySelector(".tok.target").dataset.id);
        await tapSel(page, `.tok[data-id="${id}"] .ring`);
        if (/hex in range/.test(hint)) { await sleep(120); await tapSel(page, `.tok[data-id="${id}"] .ring`); }
      } else { await tapSel(page, `#hand .card:nth-child(${s + 1})`); continue; }
      await sleep(380);
      const after = await page.evaluate(() => document.getElementById("mx-num").textContent);
      if (after !== before) { stats.plays++; played = true; break; }
      await page.keyboard.press("Escape");
    }
    if ((await state(page)).screen !== "floor" || !(await state(page)).endEnabled || /Exploring/.test((await state(page)).banner)) return;
    if (played) continue;
    const step = await page.evaluate(() => {
      const c = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
      const foes = [...document.querySelectorAll(".tok.foe .ring")].map((t) => c(t.getBoundingClientRect()));
      const me = document.querySelector(".tok.me .ring")?.getBoundingClientRect();
      if (!foes.length || !me) return null;
      const near = (p) => Math.min(...foes.map((f) => Math.hypot(f.x - p.x, f.y - p.y)));
      const lit = [...document.querySelectorAll(".cell.mv1, .cell.mv2")].map((g) => ({ p: c(g.querySelector("polygon").getBoundingClientRect()), cost: g.classList.contains("mv2") ? 2 : 1 }));
      const best = lit.sort((a, b) => near(a.p) - near(b.p))[0];
      return best && near(best.p) < near(c(me)) - 5 ? best : null;
    });
    if (!step) break;
    const before = await page.evaluate(() => document.querySelector(".tok.me")?.style.transform);
    for (let k = 0; k < step.cost; k++) { await tapXY(page, step.p.x, step.p.y); await sleep(120); }
    await sleep(850);
    if (before === await page.evaluate(() => document.querySelector(".tok.me")?.style.transform)) break;
    stats.moves++;
  }
  if (!stats.inspects && await page.$(".tok.foe")) {
    const id = await page.evaluate(() => document.querySelector(".tok.foe").dataset.id);
    await tapSel(page, `.tok[data-id="${id}"] .ring`); await sleep(250);
    if (await visible(page, "#inspect")) { stats.inspects++; await shot(page, `${label}-inspect-foe`); }
    await tapSel(page, "#inspect .x"); await sleep(150);
  }
  const st = await state(page);
  if (st.endEnabled && !/Exploring/.test(st.banner)) { await tapSel(page, "#end"); stats.ends++; }
}

const pages = [];
for (let i = 0; i < PLAYERS; i++) pages.push(await phone(i));
const t0 = Date.now();
let lastScreen = "", lastWhere = "", inFight = false;
try {
  while ((Date.now() - t0) / 1000 < BUDGET) {
    const st = await state(pages[0]);
    if (st.screen !== lastScreen) { lastScreen = st.screen; if (st.screen !== "?") await shot(pages[0], st.screen); }
    if (st.screen === "draft") { for (const p of pages) await tapSel(p, "#offers .choice"); await sleep(500); continue; }
    if (st.screen === "over") break;
    if (st.screen === "camp") {
      for (const [i, p] of pages.entries()) {
        await sleep(300);
        if (i === 0) await shotOnce(p, `camp-floor${stats.floors}`);
        if (await p.$('[data-act="levelup"]:not([disabled])')) { await tapSel(p, '[data-act="levelup"]'); stats.levels = (stats.levels ?? 0) + 1; await sleep(300); }
        if (await p.$('[data-alloc][data-d="1"]:not([disabled])')) { await tapSel(p, '[data-alloc][data-d="1"]'); await sleep(300); if (i === 0) await shotOnce(p, "camp-levelled"); }
        if (await p.$('[data-tab="form"]')) { await tapSel(p, '[data-tab="form"]'); await sleep(250); if (i === 0) await shotOnce(p, "camp-forms"); }
        const wearable = await p.$('[data-form]:not([disabled])');
        if (wearable && !stats.wears) { await tapSel(p, '[data-form]:not([disabled])'); stats.wears++; await sleep(300); if (i === 0) await shotOnce(p, "camp-new-form"); }
        if (await p.$('[data-tab="deck"]')) { await tapSel(p, '[data-tab="deck"]'); await sleep(200); if (i === 0) await shotOnce(p, "camp-deck"); }
        if (!(await p.evaluate(() => document.querySelector('[data-act="ready"]')?.textContent ?? "")).match(/Waiting|Descending/)) await tapSel(p, '[data-act="ready"]');
      }
      stats.camps = (stats.camps ?? 0) + 1;
      await sleep(900); continue;
    }
    if (st.screen !== "floor") { await sleep(250); continue; }
    const floorNo = +(st.where.match(/Floor (\d+)/)?.[1] ?? 1);
    if (st.where !== lastWhere && /Floor/.test(st.where) && floorNo !== +(lastWhere.match(/Floor (\d+)/)?.[1] ?? 0)) {
      lastWhere = st.where; stats.floors = Math.max(stats.floors, floorNo); visits.clear();
      if (floorNo > FLOORS) break;
      await sleep(400); await shot(pages[0], `floor${floorNo}-start`);
    }
    lastWhere = st.where;
    if (/Foes/.test(st.banner)) { await shotOnce(pages[0], "foe-turn"); stats.foeTurns++; await sleep(300); continue; }
    if (/Exploring/.test(st.banner)) {
      if (inFight) { inFight = false; await shotOnce(pages[0], "after-fight"); }
      await explore(pages[0]);
      continue;
    }
    if (!inFight) { inFight = true; stats.fights++; await sleep(300); await shotOnce(pages[0], `fight-${stats.fights}-start`); }
    let acted = false;
    for (const [i, p] of pages.entries()) {
      const s = await state(p);
      if (s.screen === "floor" && s.endEnabled && /Your turn/.test(s.banner)) { await fightTurn(p, `p${i}-f${floorNo}`); acted = true; }
    }
    if (!acted) await sleep(250);
  }
} finally {
  await shot(pages[0], "final");
  if (PLAYERS > 1) await shot(pages[1], "final-p1");
  await browser.close();
  server?.kill();
}
const okRun = errors.length === 0 && stats.roams > 0 && stats.fights > 0 && stats.plays > 0 && stats.ends > 0;
console.log(JSON.stringify({ base, room, viewport: VP, ...stats, shots: stats.shots.length, errors }, null, 1));
console.log(okRun ? "TAC SHOOT OK" : "TAC SHOOT FAILED");
process.exit(okRun ? 0 : 1);
