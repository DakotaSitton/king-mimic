// REAL RPG-crawler run: fresh rpg-server on a private port + real Edge at phone-landscape touch size. Every
// action is REAL touch input through CDP — the left-thumb stick, weapon/action buttons dragged into flicks,
// button taps, flicks on the open right side, taps on foes for info boxes, the Bag, the stairs and Wear
// buttons. The test pilot (engine/rpg/bot.js, read through window.__rpg.bot()) only DECIDES what to do; it
// never writes game state. Screenshots land in tools/shots/rpg/<TAG>/.
//   node tools/rpg-shoot.mjs                      solo · BODY=<starter key>
//   PLAYERS=3 node tools/rpg-shoot.mjs            co-op: three phones open /?room=CODE and play together
//   BASE=http://host:port node tools/rpg-shoot.mjs   drive an already-running server
//   BUDGET=300 (seconds)  VW=852 VH=393  TAG=name
import { chromium } from "playwright";
import { spawn } from "child_process";
import { mkdirSync, readdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "tools", "shots", "rpg", process.env.TAG || "run");
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith(".png")) unlinkSync(join(OUT, f));
const PLAYERS = +(process.env.PLAYERS || 1), BUDGET = +(process.env.BUDGET || 300);
const BODIES = ["goldenGolem", "auditAngel", "lizardWizard", "royalRat"];
const firstBody = process.env.BODY || "goldenGolem";
const VP = { width: +(process.env.VW || 852), height: +(process.env.VH || 393) };
let server = null, BASE = process.env.BASE;
if (!BASE) {
  const port = 3400 + Math.floor(Math.random() * 500);
  BASE = `http://127.0.0.1:${port}`;
  server = spawn("bun", ["run", "rpg-server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
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
    seen: { drag: 0, tap: 0, field: 0, landed: 0, stuck: 0, equips: 0, wore: 0, descends: 0 }, lastCast: 0, mode: i };
  p.stick = { ox: 110, oy: VP.height - 95 };
  return p;
}
const shot = async (p, name) => { await p.page.screenshot({ path: join(OUT, `${String(shotN++).padStart(2, "0")}-p${p.i}-${name}.png`) }); };

// touchStart/touchMove carry every finger that is down; lifting ONE finger is a touchEnd listing just it
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
async function tapSel(p, sel) { const b = await p.page.$(sel); if (!b) return false; await b.evaluate((el) => el.scrollIntoView({ block: "nearest" })); const bb = await b.boundingBox(); if (!bb) return false; await tap(p, bb.x + bb.width / 2, bb.y + bb.height / 2); return true; }
const ui = (p) => p.page.evaluate(() => window.__rpg.ui());
const look = (p) => p.page.evaluate(() => {
  const k = window.__rpg, S = k.S; if (!S) return null;
  const me = S.ents.find((e) => e.kind === "player" && e.pid === k.pid); if (!me) return null;
  return { phase: S.phase, t: S.t, floorN: S.floorN, level: S.level, me: { kb: !!me.kb, dash: !!me.dash, stun: +(me.stunUntil - S.t).toFixed(2), fs: me.forceSeq, mx: me.mx, my: me.my, x: me.x, y: me.y, hp: me.hp, maxHp: me.maxHp, casting: !!me.cast, dead: me.dead, bag: me.bag?.length ?? 0, deck: me.deck.length },
    intent: k.bot(), players: S.ents.filter((e) => e.kind === "player").length,
    foes: S.ents.filter((e) => e.side === "foe" && !e.dead && (e.kind === "unit" || e.awake)).map((f) => ({ kind: f.kind, cast: !!f.cast, scr: k.toScreen(f.x, f.y), boss: f.foe === "minotaur" })),
    attacks: S.stats.attacks, felled: S.stats.felled, revives: S.stats.revives ?? 0, ui: k.ui(), btns: [0, 1, 2].map((i) => k.btnCenter(i)),
    wearBtn: !!document.querySelector('#ctx [data-do="wear"]'), stairsBtn: !!document.querySelector('#ctx [data-do="descend"]') };
});

// ---- 1. every phone picks a body and a loadout, then enters (co-op: joins the room) ----
const ps = [];
for (let i = 0; i < PLAYERS; i++) ps.push(await phone(i));
await sleep(700);
const SHAPE = await ps[0].page.evaluate(async () => { const m = await import("/engine/rpg/content.js"); return Object.fromEntries(Object.entries(m.CARDS).filter(([, c]) => c.shape).map(([k, c]) => [k, { kind: c.shape.kind, range: c.shape.range ?? 0 }])); });
for (const p of ps) {
  if (ROOM) await p.page.fill("#coop-name", ["Dakota", "Marit", "Wyatt", "Zach"][p.i]);
  if (p.i === 0) await shot(p, "pick-body");
  await tapSel(p, `.bodycard[data-body="${p.body}"]`); await sleep(120);
  await tapSel(p, "#to-load"); await sleep(200);
  if (p.i === 0) {
    // change one pick: a different deck card
    const k = await p.page.evaluate(() => [...document.querySelectorAll(".tile")].filter((t) => !t.classList.contains("in")).map((t) => t.dataset.card).find((c) => c === "vigor" || c === "ward"));
    if (k) await tapSel(p, `.tile[data-card="${k}"]`); await sleep(120);
    await shot(p, "loadout");
  }
  p.loadOk = await p.page.evaluate(() => !document.querySelector("#enter").disabled);
  await tapSel(p, "#enter"); await sleep(ROOM ? 900 : 400);
}
await sleep(500);
await shot(ps[0], "floor-start");
if (ROOM) { const s1 = await look(ps[0]); ps[0].partyAtStart = s1?.players; }

// ---- 2. dive with real touches ----
const g = { aimShot: 0, foeReticle: 0, info: 0, bagShot: 0, floorShots: 0, bossShot: false, bossN: 0, midShots: 0, downShot: false, allyShot: false, stairsShot: false };
const t0 = Date.now();
let fin = null, lastFloor = 0;
while ((Date.now() - t0) / 1000 < BUDGET) {
  let ended = false;
  for (const p of ps) {
    const s = await look(p); if (!s) continue;
    if (s.phase !== "play") { ended = true; continue; }
    if (process.env.DEBUG && (p.dbg = (p.dbg ?? 0) + 1) % 25 === 0) console.log(`[p${p.i}] t=${s.t.toFixed(1)} me=${s.me.x.toFixed(1)},${s.me.y.toFixed(1)} kb=${s.me.kb} dash=${s.me.dash} stun=${s.me.stun} fs=${s.me.fs} mxy=${(s.me.mx ?? 0).toFixed(2)},${(s.me.my ?? 0).toFixed(2)} live=${[...p.live.keys()]} stickOn=${p.stickOn} dead=${s.me.dead} cast=${s.me.casting} foes=${s.foes.length} intent=${JSON.stringify({ m: s.intent?.move?.map((v) => +v.toFixed(2)), c: s.intent?.cast?.key, eq: s.intent?.equip, d: s.intent?.descend })} wear=${s.wearBtn} stairs=${s.stairsBtn} ui=${JSON.stringify({ a: s.ui.armed, p: s.ui.pending, ai: s.ui.aiming, bag: s.ui.bag, info: s.ui.info })}`);
    if (p.i === 0 && s.floorN !== lastFloor) { lastFloor = s.floorN; await sleep(300); await shot(p, `floor-${s.floorN + 1}`); }
    if (s.me.dead) { await stick(p, 0, 0); if (!g.downShot && ROOM) { g.downShot = true; await shot(p, "downed"); } continue; }
    // a found card for an empty slot: open the Bag and tap it in (real taps)
    if (s.intent?.equip >= 0) {
      await stick(p, 0, 0);
      await tapSel(p, "#bagbtn"); await sleep(150);
      if (await tapSel(p, `#bag-body .bt[data-act="equip"][data-i="${s.intent.equip}"]`)) p.seen.equips++;
      await sleep(ROOM ? 200 : 120);
      if (p.i === 0 && g.bagShot < 2) { g.bagShot++; await shot(p, `bag-${g.bagShot}`); }
      await tapSel(p, "#bag-done"); await sleep(100);
      continue;
    }
    // a body underfoot: the lead phone wears the first one it finds
    if (p.i === 0 && s.wearBtn && p.seen.wore === 0 && (p.wearTries = (p.wearTries ?? 0) + 1) <= 3) {
      await stick(p, 0, 0); await shot(p, "body-underfoot");
      if (await tapSel(p, '#ctx [data-do="wear"]')) { p.seen.wore++; await sleep(250); await shot(p, "wore-body"); }
      continue;
    }
    if (s.intent?.descend && s.stairsBtn) {
      await stick(p, 0, 0);
      if (p.i === 0 && !g.stairsShot) { g.stairsShot = true; await shot(p, "stairs"); }
      if (await tapSel(p, '#ctx [data-do="descend"]')) p.seen.descends++;
      await sleep(ROOM ? 500 : 250);
      continue;
    }
    const mv = s.intent?.move ?? [0, 0];
    // several pages share one headless browser: input on one blurs another, and the game drops every touch
    // on blur (as it should). A real thumb would just press again — so does the pilot.
    if (p.stickOn && Math.hypot(s.me.mx ?? 0, s.me.my ?? 0) < 0.05 && Math.hypot(mv[0], mv[1]) > 0.3) { await touch(p, "end", 1); p.stickOn = false; p.seen.repress = (p.seen.repress ?? 0) + 1; }
    await stick(p, mv[0], mv[1]);
    if (p.i === 0 && s.foes.some((f) => f.cast) && g.foeReticle < 2) { g.foeReticle++; await shot(p, `foe-reticle-${g.foeReticle}`); }
    if (p.i === 0 && ROOM && !g.allyShot && s.foes.length >= 3) { g.allyShot = true; await shot(p, "party-fight"); if (ps[1]) await shot(ps[1], "party-fight-other-phone"); }
    const onScreen = (f) => f.scr[0] > 20 && f.scr[0] < VP.width - 20 && f.scr[1] > 20 && f.scr[1] < VP.height - 20;
    if (p.i === 0 && s.foes.some((f) => f.kind === "foe" && onScreen(f)) && g.info === 0 && (g.infoTries = (g.infoTries ?? 0) + 1) <= 5) {
      const f = s.foes.find((x) => x.kind === "foe" && onScreen(x));
      await stick(p, 0, 0); await tap(p, f.scr[0], f.scr[1]); await sleep(220);
      if ((await ui(p)).info) { g.info++; await shot(p, "foe-info"); }
    }
    const boss = s.foes.some((f) => f.boss);
    if (p.i === 0 && boss && !g.bossShot) { g.bossShot = true; await sleep(250); await shot(p, "boss"); }
    if (p.i === 0 && boss) { g.bossN++; if (g.bossN % 60 === 30 && g.bossN < 200) await shot(p, `boss-fight-${g.bossN}`); }
    const c = s.intent?.cast;
    if (c && !s.me.casting && Date.now() - p.lastCast > 300) {
      p.lastCast = Date.now();
      const [cx, cy] = s.btns[c.slot];
      const ang = Math.atan2(c.aim.dy, c.aim.dx);
      const R = SHAPE[c.key];
      const len = R.kind === "circle" ? 12 + Math.min(1, (c.aim.dist ?? 0) / (R.range || 1)) * 100 : 60;
      let ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len;
      const fits = ex > 4 && ex < VP.width - 4 && ey > 4 && ey < VP.height - 4;
      p.mode++;
      if (fits && p.mode % 3 !== 0) {
        await touch(p, "start", 2, cx, cy);
        for (let k = 1; k <= 4; k++) { await touch(p, "move", 2, cx + (ex - cx) * (k / 4), cy + (ey - cy) * (k / 4)); await sleep(16); }
        if (p.i === 0 && g.aimShot < 3) { g.aimShot++; await sleep(60); await shot(p, `aiming-${g.aimShot}-${c.key}`); }
        await touch(p, "end", 2); p.seen.drag++;
      } else if (c.slot === 0 && p.mode % 2 === 0) {
        // flick on the open right side = swing the weapon that way
        const fx = VP.width * 0.62, fy = VP.height * 0.42;
        ex = fx + Math.cos(ang) * len; ey = fy + Math.sin(ang) * len;
        await touch(p, "start", 3, fx, fy);
        for (let k = 1; k <= 4; k++) { await touch(p, "move", 3, fx + (ex - fx) * (k / 4), fy + (ey - fy) * (k / 4)); await sleep(16); }
        await touch(p, "end", 3); p.seen.field++;
      } else { await tap(p, cx, cy); p.seen.tap++; }
      await sleep(ROOM ? 120 : 30);
      const u = await p.page.evaluate(() => { const k = window.__rpg; const me = k.S?.ents.find((e) => e.kind === "player" && e.pid === k.pid); return { ...k.ui(), attacks: k.S?.stats.attacks ?? 0, casting: !!me?.cast }; });
      if (u.aiming) p.seen.stuck++;
      if (u.attacks > s.attacks || u.pending || u.casting) p.seen.landed++;
    }
    if (p.i === 0 && g.midShots < 3 && s.foes.length >= 2 && Math.random() < 0.01) { g.midShots++; await shot(p, `fight-${g.midShots}`); }
  }
  if (ended) break;
  await sleep(20);
}
for (const p of ps) await stick(p, 0, 0);
fin = await look(ps[0]);
await sleep(500);
for (const p of ps.slice(0, 2)) await shot(p, `end-${fin?.phase ?? "timeout"}`);
const endUi = await ui(ps[0]);
let again = false;
if (endUi.end) { await tapSel(ps[0], "#again"); await sleep(700); again = (await ui(ps[0])).screen === "pick-body" && (!ps[1] || (await ui(ps[1])).screen === "pick-body"); await shot(ps[0], "again"); }

const per = ps.map((p) => ({ body: p.body, loadOk: p.loadOk, ...p.seen }));
console.log(JSON.stringify({ base: BASE, room: ROOM, players: PLAYERS, partyAtStart: ps[0].partyAtStart ?? 1, phase: fin?.phase, floor: (fin?.floorN ?? 0) + 1, level: fin?.level,
  simTime: Math.round(fin?.t ?? 0), attacks: fin?.attacks, felled: fin?.felled, revives: fin?.revives, ...g, again, errors: errors.length }));
console.log(JSON.stringify(per));
if (errors.length) console.log("ERRORS:\n" + errors.slice(0, 20).join("\n"));
console.log("shots:", OUT);
await browser.close();
if (server) server.kill();
const gestures = per.reduce((a, s) => a + s.drag + s.field + s.tap, 0), landed = per.reduce((a, s) => a + s.landed, 0), stuck = per.reduce((a, s) => a + s.stuck, 0);
const ok = !errors.length && per.every((s) => s.loadOk) && (fin?.attacks ?? 0) > 5 && stuck === 0 && landed >= gestures * 0.8
  && (!ROOM || (ps[0].partyAtStart === PLAYERS && per.every((s) => s.drag + s.field + s.tap > 0)));
console.log(`gestures ${gestures}, landed/queued ${landed}, stuck ${stuck}`);
console.log(ok ? "RPG SHOOT OK" : "RPG SHOOT FAILED");
process.exit(ok ? 0 : 1);
