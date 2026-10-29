// REAL Flick run: fresh flick-server on a private port + real Edge at phone-landscape touch size. Every
// action is REAL touch input through CDP — the left-thumb stick, card presses dragged into flicks,
// tap-to-ready then flick on the field, taps on foes for info boxes, taps on reward/end buttons. The
// test pilot (engine/flick/bot.js, read through window.__flick.bot()) only DECIDES what to do; it never
// writes game state. Screenshots land in tools/shots/flick/<TAG>/.
//   node tools/flick-shoot.mjs                      solo · BODY=fatCat|royalRat|lizardWizard|auditAngel
//   PLAYERS=3 node tools/flick-shoot.mjs            co-op: three phones open /?room=CODE and play together
//   BASE=http://host:port node tools/flick-shoot.mjs   drive an already-running server
//   BUDGET=300 (seconds)  VW=852 VH=393  WEAR=0 (never wear a body)  TAG=name
import { chromium } from "playwright";
import { spawn } from "child_process";
import { mkdirSync, readdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "tools", "shots", "flick", process.env.TAG || "run");
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith(".png")) unlinkSync(join(OUT, f));
const PLAYERS = +(process.env.PLAYERS || 1), BUDGET = +(process.env.BUDGET || 300);
const BODIES = ["fatCat", "lizardWizard", "royalRat", "auditAngel"];
const firstBody = process.env.BODY || "fatCat";
const VP = { width: +(process.env.VW || 852), height: +(process.env.VH || 393) };
let server = null, BASE = process.env.BASE;
if (!BASE) {
  const port = 3400 + Math.floor(Math.random() * 500);
  BASE = `http://127.0.0.1:${port}`;
  server = spawn("bun", ["run", "flick-server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
  server.stderr.on("data", (d) => process.stderr.write("[server] " + d));
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + "/health")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
}
const ROOM = PLAYERS > 1 ? "T" + Math.random().toString(36).slice(2, 6).toUpperCase() : null;
const errors = [];
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "msedge", headless: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0;

async function phone(i) {
  const ctx = await browser.newContext({ viewport: VP, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[p${i}] ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[p${i}] console: ${m.text()}`); });
  page.on("response", (r) => { if (r.status() >= 400) errors.push(`[p${i}] ${r.status()} ${r.url()}`); });
  await page.goto(BASE + (ROOM ? `/?room=${ROOM}` : "/"));
  const cdp = await ctx.newCDPSession(page);
  const p = { i, page, cdp, live: new Map(), stickOn: false, body: i === 0 ? firstBody : BODIES[i % BODIES.length],
    seen: { flickDrag: 0, flickField: 0, tapTap: 0, landed: 0, stuck: 0, rewards: 0, wore: 0 }, lastCast: 0, mode: i };
  p.stick = { ox: 110, oy: VP.height - 95 };
  return p;
}
const shot = async (p, name) => { await p.page.screenshot({ path: join(OUT, `${String(shotN++).padStart(2, "0")}-p${p.i}-${name}.png`) }); };

// Probed (Edge/CDP): touchStart/touchMove carry every finger that is down; lifting ONE finger is a
// touchEnd listing just that finger (a touchMove with fewer points lifts nothing).
async function touch(p, type, id, x, y) {
  if (type === "end") {
    const q = p.live.get(id); p.live.delete(id); if (!q) return;
    await p.cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [{ x: q.x, y: q.y, id }] });
    return;
  }
  p.live.set(id, { x, y });
  const pts = [...p.live.entries()].map(([k, q]) => ({ x: q.x, y: q.y, id: k }));
  await p.cdp.send("Input.dispatchTouchEvent", { type: type === "start" ? "touchStart" : "touchMove", touchPoints: pts });
}
async function stick(p, vx, vy) {
  const m = Math.hypot(vx, vy);
  if (m < 0.05) { if (p.stickOn) { await touch(p, "end", 1); p.stickOn = false; } return; }
  if (!p.stickOn) { await touch(p, "start", 1, p.stick.ox, p.stick.oy); p.stickOn = true; }
  await touch(p, "move", 1, p.stick.ox + (vx / m) * 48, p.stick.oy + (vy / m) * 48);
}
async function tap(p, x, y) { await touch(p, "start", 7, x, y); await sleep(40); await touch(p, "end", 7); }
async function tapSel(p, sel) { const b = await p.page.$(sel); if (!b) return false; const bb = await b.boundingBox(); if (!bb) return false; await tap(p, bb.x + bb.width / 2, bb.y + bb.height / 2); return true; }
const ui = (p) => p.page.evaluate(() => window.__flick.ui());
const look = (p) => p.page.evaluate(() => {
  const k = window.__flick, S = k.S; if (!S) return null;
  const me = S.ents.find((e) => e.kind === "player" && e.pid === k.pid); if (!me) return null;
  return { phase: S.phase, t: S.t, me: { x: me.x, y: me.y, hp: me.hp, maxHp: me.maxHp, casting: !!me.cast, dead: me.dead },
    intent: k.bot(), players: S.ents.filter((e) => e.kind === "player").length, downed: S.ents.filter((e) => e.kind === "player" && e.dead).length,
    foes: S.ents.filter((e) => e.side === "foe" && !e.dead && (e.kind === "unit" || e.awake)).map((f) => ({ kind: f.kind, cast: !!f.cast, scr: k.toScreen(f.x, f.y) })),
    rooms: S.rooms.map((r) => r.status), plays: S.stats.plays, revives: S.stats.revives ?? 0, ui: k.ui(), cards: [0, 1, 2].map((i) => k.cardCenter(i)) };
});

// ---- 1. every phone picks a body and a deck, then enters (co-op: joins the room) ----
const ps = [];
for (let i = 0; i < PLAYERS; i++) ps.push(await phone(i));
await sleep(700);
const RANGE = await ps[0].page.evaluate(async () => { const m = await import("/engine/flick/content.js"); return Object.fromEntries(Object.entries(m.CARDS).map(([k, c]) => [k, { kind: c.shape.kind, range: c.shape.range ?? 0 }])); });
for (const p of ps) {
  if (ROOM) await p.page.fill("#coop-name", ["Dakota", "Marit", "Wyatt", "Zach"][p.i]);
  if (p.i === 0) await shot(p, "pick-body");
  await tapSel(p, `.bodycard[data-body="${p.body}"]`); await sleep(120);
  await tapSel(p, "#to-deck"); await sleep(200);
  if (p.i === 0) {
    // tweak the suggested deck: take one out, put another in
    const outKey = await p.page.evaluate(() => document.querySelector(".tile.in")?.dataset.card);
    await tapSel(p, `.tile[data-card="${outKey}"]`); await sleep(100);
    const inKey = await p.page.evaluate(() => document.querySelector(".tile:not(.in)")?.dataset.card);
    await tapSel(p, `.tile[data-card="${inKey}"]`); await sleep(120);
    await shot(p, "deck");
  }
  p.deckOk = await p.page.evaluate(() => document.querySelectorAll(".tile.in").length);
  await tapSel(p, "#enter"); await sleep(ROOM ? 900 : 400);
}
await sleep(500);
await shot(ps[0], "floor-start");
if (ROOM) { const s1 = await look(ps[0]); ps[0].partyAtStart = s1?.players; }

// ---- 2. play the floor with real touches ----
const g = { aimShot: 0, foeReticle: 0, info: 0, boss: 0, bossShot: false, midShots: 0, downShot: false, allyShot: false };
const t0 = Date.now();
let fin = null;
while ((Date.now() - t0) / 1000 < BUDGET) {
  let ended = false;
  for (const p of ps) {
    const s = await look(p); if (!s) continue;
    if (s.phase !== "play") { ended = true; continue; }
    if (s.ui.reward) {
      await stick(p, 0, 0);
      p.seen.rewards++;
      if (p.i === 0) { await sleep(150); await shot(p, `reward-${p.seen.rewards}`); }
      await tapSel(p, "#rw-cards .rw"); await sleep(100);
      if (process.env.WEAR !== "0" && p.seen.wore === 0 && p.i === 0) {
        // wear the offer that leaves the most HP (the sheet shows "HP a → b/max")
        const best = await p.page.evaluate(() => { let k = null, hi = -1; for (const b of document.querySelectorAll("#rw-bodies .rw")) { const m = b.textContent.match(/→\s*(\d+)/); if (m && +m[1] > hi) { hi = +m[1]; k = b.dataset.body; } } return k; });
        if (best && (await tapSel(p, `#rw-bodies .rw[data-body="${best}"]`))) { p.seen.wore++; await sleep(150); await shot(p, "wore-body"); }
      }
      await tapSel(p, "#rw-done"); await sleep(150);
      continue;
    }
    if (s.me.dead) { await stick(p, 0, 0); if (!g.downShot && ROOM) { g.downShot = true; await shot(p, "downed"); } continue; }
    const mv = s.intent?.move ?? [0, 0];
    await stick(p, mv[0], mv[1]);
    if (p.i === 0 && s.foes.some((f) => f.cast) && g.foeReticle < 2) { g.foeReticle++; await shot(p, `foe-reticle-${g.foeReticle}`); }
    if (p.i === 0 && ROOM && !g.allyShot && s.foes.length >= 3) { g.allyShot = true; await shot(p, "party-fight"); if (ps[1]) await shot(ps[1], "party-fight-other-phone"); }
    if (p.i === 0 && s.foes.some((f) => f.kind === "foe") && g.info === 0) {
      const f = s.foes.find((x) => x.kind === "foe");
      await stick(p, 0, 0); await tap(p, f.scr[0], f.scr[1]); await sleep(220);
      if ((await ui(p)).info) { g.info++; await shot(p, "foe-info"); }
    }
    const boss = s.rooms[5] === "active";
    if (p.i === 0 && boss && !g.bossShot) { g.bossShot = true; await sleep(250); await shot(p, "boss-room"); }
    if (p.i === 0 && boss) { g.boss++; if (g.boss % 60 === 30 && g.boss < 200) await shot(p, `boss-fight-${g.boss}`); }
    const c = s.intent?.cast;
    if (c && !s.me.casting && Date.now() - p.lastCast > 350) {
      p.lastCast = Date.now();
      const [cx, cy] = s.cards[c.slot];
      const ang = Math.atan2(c.aim.dy, c.aim.dx);
      const R = RANGE[c.key];
      const len = R.kind === "circle" ? 12 + Math.min(1, (c.aim.dist ?? 0) / (R.range || 1)) * 100 : 60;
      let ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len;
      const fits = ex > 4 && ex < VP.width - 4 && ey > 4 && ey < VP.height - 4;
      p.mode++;
      if (fits && p.mode % 3 !== 0) {
        await touch(p, "start", 2, cx, cy);
        for (let k = 1; k <= 4; k++) { await touch(p, "move", 2, cx + (ex - cx) * (k / 4), cy + (ey - cy) * (k / 4)); await sleep(16); }
        if (p.i === 0 && g.aimShot < 3) { g.aimShot++; await sleep(60); await shot(p, `aiming-${g.aimShot}-${c.key}`); }
        await touch(p, "end", 2); p.seen.flickDrag++;
      } else if (p.mode % 6 === 0) {
        await tap(p, cx, cy); await sleep(90);
        await tap(p, cx, cy); p.seen.tapTap++;
      } else {
        await tap(p, cx, cy); await sleep(80);
        const fx = VP.width * 0.62, fy = VP.height * 0.42;
        ex = fx + Math.cos(ang) * len; ey = fy + Math.sin(ang) * len;
        await touch(p, "start", 3, fx, fy);
        for (let k = 1; k <= 4; k++) { await touch(p, "move", 3, fx + (ex - fx) * (k / 4), fy + (ey - fy) * (k / 4)); await sleep(16); }
        await touch(p, "end", 3); p.seen.flickField++;
      }
      await sleep(ROOM ? 120 : 30);   // co-op: let the server's snapshot carry the play back
      const u = await p.page.evaluate(() => { const k = window.__flick; const me = k.S?.ents.find((e) => e.kind === "player" && e.pid === k.pid); return { ...k.ui(), plays: k.S?.stats.plays ?? 0, casting: !!me?.cast }; });
      if (u.aiming) p.seen.stuck++;          // every gesture must have ended — a hung gesture blocks the hand
      if (u.plays > s.plays || u.pending || u.casting) p.seen.landed++;
    }
    if (p.i === 0 && g.midShots < 3 && s.foes.length >= 2 && Math.random() < 0.01) { g.midShots++; await shot(p, `fight-${g.midShots}`); }
  }
  if (ended) break;
  await sleep(20);
}
for (const p of ps) await stick(p, 0, 0);
fin = await look(ps[0]);
await sleep(500);
for (const p of ps.slice(0, 2)) await shot(p, `end-${fin?.phase}`);
const endUi = await ui(ps[0]);
let again = false;
if (endUi.end) { await tapSel(ps[0], "#again"); await sleep(700); again = (await ui(ps[0])).screen === "pick-body" && (!ps[1] || (await ui(ps[1])).screen === "pick-body"); await shot(ps[0], "again"); }

const per = ps.map((p) => ({ body: p.body, deckOk: p.deckOk, ...p.seen }));
console.log(JSON.stringify({ base: BASE, room: ROOM, players: PLAYERS, partyAtStart: ps[0].partyAtStart ?? 1, phase: fin?.phase, simTime: Math.round(fin?.t ?? 0),
  plays: fin?.plays, revives: fin?.revives, rooms: fin?.rooms, ...g, again, errors: errors.length }, null, 0));
console.log(JSON.stringify(per));
if (errors.length) console.log("ERRORS:\n" + errors.slice(0, 20).join("\n"));
console.log("shots:", OUT);
await browser.close();
if (server) server.kill();
const gestures = per.reduce((a, s) => a + s.flickDrag + s.flickField + s.tapTap, 0), landed = per.reduce((a, s) => a + s.landed, 0), stuck = per.reduce((a, s) => a + s.stuck, 0);
const ok = !errors.length && per.every((s) => s.deckOk === 8) && (fin?.plays ?? 0) > 5 && stuck === 0 && landed >= gestures * 0.8 && endUi.end && again
  && (!ROOM || (ps[0].partyAtStart === PLAYERS && per.every((s) => s.flickDrag + s.flickField + s.tapTap > 0)));
console.log(`gestures ${gestures}, landed/queued ${landed}, stuck ${stuck}`);
console.log(ok ? "FLICK SHOOT OK" : "FLICK SHOOT FAILED");
process.exit(ok ? 0 : 1);
