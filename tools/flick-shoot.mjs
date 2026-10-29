// REAL Flick run: fresh flick-server on a private port + real Edge at phone-landscape touch size. Every
// action is REAL touch input through CDP — the left-thumb stick, card presses dragged into flicks,
// tap-to-ready then flick on the field, taps on foes for info boxes, taps on reward/end buttons. The
// test pilot (engine/flick/bot.js, read through window.__flick.bot()) only DECIDES what to do; it never
// writes game state. Screenshots land in tools/shots/flick/.
//   node tools/flick-shoot.mjs                      BODY=fatCat|royalRat|lizardWizard|auditAngel
//   BASE=http://host:port node tools/flick-shoot.mjs   drive an already-running server
//   BUDGET=300 (seconds)  VW=852 VH=393
import { chromium } from "playwright";
import { spawn } from "child_process";
import { mkdirSync, readdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "tools", "shots", "flick", process.env.TAG || "run");
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith(".png")) unlinkSync(join(OUT, f));
const BODY = process.env.BODY || "fatCat", BUDGET = +(process.env.BUDGET || 300);
const VP = { width: +(process.env.VW || 852), height: +(process.env.VH || 393) };
let server = null, BASE = process.env.BASE;
if (!BASE) {
  const port = 3400 + Math.floor(Math.random() * 500);
  BASE = `http://127.0.0.1:${port}`;
  server = spawn("bun", ["run", "flick-server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
  server.stderr.on("data", (d) => process.stderr.write("[server] " + d));
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + "/health")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
}
const errors = [];
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "msedge", headless: true });
const ctx = await browser.newContext({ viewport: VP, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("response", (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
await page.goto(BASE + "/");
const cdp = await ctx.newCDPSession(page);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0;
const shots = [];
const shot = async (name) => { const f = join(OUT, `${String(shotN++).padStart(2, "0")}-${name}.png`); await page.screenshot({ path: f }); shots.push(f); };

// ---- real multi-touch: every event carries all live points ----
const live = new Map();   // id → {x, y}
// Probed (Edge/CDP): touchStart/touchMove carry every finger that is down; lifting ONE finger is a
// touchEnd listing just that finger (a touchMove with fewer points lifts nothing).
async function touch(type, id, x, y) {
  if (type === "end") {
    const p = live.get(id); live.delete(id); if (!p) return;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [{ x: p.x, y: p.y, id }] });
    return;
  }
  live.set(id, { x, y });
  const pts = [...live.entries()].map(([i, p]) => ({ x: p.x, y: p.y, id: i }));
  await cdp.send("Input.dispatchTouchEvent", { type: type === "start" ? "touchStart" : "touchMove", touchPoints: pts });
}
const STICK = { id: 1, ox: 110, oy: VP.height - 95, on: false };
async function stick(vx, vy) {
  const m = Math.hypot(vx, vy);
  if (m < 0.05) { if (STICK.on) { await touch("end", 1); STICK.on = false; } return; }
  if (!STICK.on) { await touch("start", 1, STICK.ox, STICK.oy); STICK.on = true; }
  await touch("move", 1, STICK.ox + (vx / m) * 48, STICK.oy + (vy / m) * 48);
}
async function tap(x, y) { await touch("start", 7, x, y); await sleep(40); await touch("end", 7); }
async function tapSel(sel) { const b = await page.$(sel); if (!b) return false; const bb = await b.boundingBox(); if (!bb) return false; await tap(bb.x + bb.width / 2, bb.y + bb.height / 2); return true; }
const ui = () => page.evaluate(() => window.__flick.ui());
const look = () => page.evaluate(() => {
  const k = window.__flick, S = k.S; if (!S) return null;
  const me = S.ents.find((e) => e.kind === "player");
  const intent = k.bot();
  const foes = S.ents.filter((e) => e.side === "foe" && !e.dead && (e.kind === "unit" || e.awake)).map((f) => ({ id: f.id, kind: f.kind, x: f.x, y: f.y, cast: !!f.cast, scr: k.toScreen(f.x, f.y) }));
  const card = intent?.cast ? { slot: intent.cast.slot, key: intent.cast.key, shape: null } : null;
  return { phase: S.phase, t: S.t, me: { x: me.x, y: me.y, hp: me.hp, maxHp: me.maxHp, mana: me.mana, casting: !!me.cast, body: me.body, hand: me.hand },
    intent, foes, rooms: S.rooms.map((r) => r.status), plays: S.stats.plays, reward: !!S.rewards[k.pid], ui: k.ui(), card,
    cards: [0, 1, 2].map((i) => k.cardCenter(i)) };
});
const RANGE = await page.evaluate(async () => { const m = await import("/engine/flick/content.js"); return Object.fromEntries(Object.entries(m.CARDS).map(([k, c]) => [k, { kind: c.shape.kind, range: c.shape.range ?? 0 }])); });

// ---- 1. pick a body ----
await sleep(500);
await shot("pick-body");
await tapSel(`.bodycard[data-body="${BODY}"]`); await sleep(150);
await shot("body-selected");
await tapSel("#to-deck"); await sleep(250);
// ---- 2. tweak the suggested deck: take one out, put another in ----
const outKey = await page.evaluate(() => document.querySelector(".tile.in")?.dataset.card);
await tapSel(`.tile[data-card="${outKey}"]`); await sleep(120);
const inKey = await page.evaluate(() => document.querySelector(".tile:not(.in)")?.dataset.card);
await tapSel(`.tile[data-card="${inKey}"]`); await sleep(150);
await shot("deck");
const deckOk = await page.evaluate(() => document.querySelectorAll(".tile.in").length);
await tapSel("#enter"); await sleep(400);
await shot("floor-start");

// ---- 3. play the floor with real touches ----
const seen = { flickDrag: 0, flickField: 0, tapTap: 0, landed: 0, stuck: 0, aimShot: 0, foeReticle: 0, info: 0, rewards: 0, wore: 0, took: 0, boss: 0, queued: 0 };
const t0 = Date.now();
let lastCast = 0, mode = 0, lastPlays = 0, bossShot = false, midShots = 0;
while ((Date.now() - t0) / 1000 < BUDGET) {
  const s = await look(); if (!s) { await sleep(100); continue; }
  if (s.phase !== "play") break;
  if (s.ui.reward) {
    await stick(0, 0);
    seen.rewards++;
    await sleep(200); await shot(`reward-${seen.rewards}`);
    if (await tapSel("#rw-cards .rw")) seen.took++;
    await sleep(120);
    if (process.env.WEAR !== "0" && seen.wore === 0 && (await tapSel("#rw-bodies .rw"))) { seen.wore++; await sleep(150); await shot("wore-body"); }
    await tapSel("#rw-done"); await sleep(250);
    continue;
  }
  const mv = s.intent?.move ?? [0, 0];
  await stick(mv[0], mv[1]);
  if (s.foes.some((f) => f.cast) && seen.foeReticle < 2) { seen.foeReticle++; await shot(`foe-reticle-${seen.foeReticle}`); }
  if (s.foes.some((f) => f.kind === "foe") && seen.info === 0) {
    // tap a foe to read it (also targets it)
    const f = s.foes.find((x) => x.kind === "foe");
    await stick(0, 0); await tap(f.scr[0], f.scr[1]); await sleep(250);
    const u = await ui(); if (u.info) { seen.info++; await shot("foe-info"); }
  }
  const boss = s.rooms[5] === "active";
  if (boss && !bossShot) { bossShot = true; await sleep(300); await shot("boss-room"); }
  if (boss) seen.boss++;
  const c = s.intent?.cast;
  if (c && !s.me.casting && Date.now() - lastCast > 350) {
    lastCast = Date.now();
    const [cx, cy] = s.cards[c.slot];
    const R = RANGE[c.key];
    const ang = Math.atan2(c.aim.dy, c.aim.dx);
    const len = R.kind === "circle" ? 12 + Math.min(1, (c.aim.dist ?? 0) / (R.range || 1)) * 100 : 60;
    let ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len;
    const fits = ex > 4 && ex < VP.width - 4 && ey > 4 && ey < VP.height - 4;
    mode++;
    if (fits && mode % 3 !== 0) {
      // press the card and drag the flick
      await touch("start", 2, cx, cy);
      for (let i = 1; i <= 4; i++) { await touch("move", 2, cx + (ex - cx) * (i / 4), cy + (ey - cy) * (i / 4)); await sleep(16); }
      if (seen.aimShot < 3) { seen.aimShot++; await sleep(60); await shot(`aiming-${seen.aimShot}-${c.key}`); }
      await touch("end", 2); seen.flickDrag++;
    } else if (mode % 6 === 0) {
      // tap to ready (auto-aim), tap again to cast
      await tap(cx, cy); await sleep(90);
      if (seen.tapTap === 0) await shot(`readied-${c.key}`);
      await tap(cx, cy); seen.tapTap++;
    } else {
      // tap to ready, then flick on the open field
      await tap(cx, cy); await sleep(80);
      const fx = VP.width * 0.62, fy = VP.height * 0.42;
      ex = fx + Math.cos(ang) * len; ey = fy + Math.sin(ang) * len;
      await touch("start", 3, fx, fy);
      for (let i = 1; i <= 4; i++) { await touch("move", 3, fx + (ex - fx) * (i / 4), fy + (ey - fy) * (i / 4)); await sleep(16); }
      await touch("end", 3); seen.flickField++;
    }
    const u = await page.evaluate(() => ({ ...window.__flick.ui(), plays: window.__flick.S?.stats.plays ?? 0 }));
    if (u.pending) seen.queued++;
    if (u.aiming) seen.stuck++;          // every gesture must have ended — a hung gesture blocks the hand
    if (u.plays > s.plays || u.pending) seen.landed++;
  }
  if (s.plays > lastPlays) lastPlays = s.plays;
  if (midShots < 3 && s.foes.length >= 2 && Math.random() < 0.01) { midShots++; await shot(`fight-${midShots}`); }
  if (boss && seen.boss % 60 === 30 && seen.boss < 200) await shot(`boss-fight-${seen.boss}`);
  await sleep(25);
}
await stick(0, 0);
const fin = await look();
await sleep(500);
await shot(`end-${fin?.phase}`);
const endUi = await ui();
let again = false;
if (endUi.end) { await tapSel("#again"); await sleep(300); again = (await ui()).screen === "pick-body"; await shot("again"); }

console.log(JSON.stringify({ base: BASE, body: BODY, deckOk, phase: fin?.phase, simTime: Math.round(fin?.t ?? 0), plays: fin?.plays, rooms: fin?.rooms,
  hp: fin ? `${Math.ceil(fin.me.hp)}/${fin.me.maxHp}` : null, ...seen, again, errors: errors.length }, null, 0));
if (errors.length) console.log("ERRORS:\n" + errors.slice(0, 20).join("\n"));
console.log("shots:", OUT);
await browser.close();
if (server) server.kill();
const gestures = seen.flickDrag + seen.flickField + seen.tapTap;
const ok = !errors.length && deckOk === 8 && (fin?.plays ?? 0) > 5 && seen.flickDrag > 0 && seen.flickField > 0 && seen.tapTap > 0 && endUi.end
  && seen.stuck === 0 && seen.landed >= gestures * 0.8;
console.log(`gestures ${gestures}, landed/queued ${seen.landed}, stuck ${seen.stuck}`);
console.log(ok ? "FLICK SHOOT OK" : "FLICK SHOOT FAILED");
process.exit(ok ? 0 : 1);
