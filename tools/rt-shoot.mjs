// REAL twin-stick run: fresh rt-server on a private port + real Edge at phone-landscape touch size.
// The bot plays through REAL touch input (CDP touch events on the left-thumb stick, taps on cards
// and foes) and screenshots each phase into tools/shots/rt/.
//   node tools/rt-shoot.mjs                 solo
//   PLAYERS=2 node tools/rt-shoot.mjs       two phones in one room (co-op)
//   BASE=http://host:port node tools/rt-shoot.mjs   drive an already-running server instead
//   ROOMS=3 BUDGET=150 (seconds)
//   LATE=1 PLAYERS=2 node tools/rt-shoot.mjs   second phone opens the link mid-fight (late-join path)
import { chromium } from "playwright";
import { spawn } from "child_process";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "tools", "shots", "rt");
mkdirSync(OUT, { recursive: true });
const LATE = process.env.LATE === "1";
const PLAYERS = +(process.env.PLAYERS || 1), ROOMS = +(process.env.ROOMS || 2), BUDGET = +(process.env.BUDGET || 150);
const VP = { width: 852, height: 393 };
let server = null, BASE = process.env.BASE;
if (!BASE) {
  const port = 3300 + Math.floor(Math.random() * 600);
  BASE = `http://127.0.0.1:${port}`;
  server = spawn("bun", ["run", "rt-server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
  server.stderr.on("data", (d) => process.stderr.write("[server] " + d));
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + "/health")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
}
const room = "shoot" + Math.random().toString(36).slice(2, 7);
const errors = [];
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "msedge", headless: true });
const shots = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function phone(i) {
  const ctx = await browser.newContext({ viewport: VP, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[p${i}] ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[p${i}] console: ${m.text()}`); });
  page.on("response", (r) => { if (r.status() >= 400) errors.push(`[p${i}] ${r.status()} ${r.url()}`); });
  await page.goto(`${BASE}/?room=${room}`);
  const cdp = await ctx.newCDPSession(page);
  return { i, page, cdp, stickOn: false, origin: [120, 290] };
}
const shot = async (p, name) => { const f = join(OUT, `${String(shots.length).padStart(2, "0")}-p${p.i}-${name}.png`); await p.page.screenshot({ path: f }); shots.push(f); };
const state = (p) => p.page.evaluate(() => {
  const k = window.__km; const S = k.S; if (!S) return null;
  return { phase: S.phase, depth: S.depth, you: S.you, foes: S.foes, heroes: S.heroes, local: k.local, R: k.arenaRect(), offers: S.offers?.length ?? 0, doors: S.doors?.length ?? 0, reward: S.reward };
});
async function stick(p, vx, vy) {
  const [ox, oy] = p.origin;
  const pt = [{ x: ox + vx * 50, y: oy + vy * 50, id: 1 }];
  if (!p.stickOn) { await p.cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: ox, y: oy, id: 1 }] }); p.stickOn = true; }
  await p.cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt });
}
async function stickOff(p) { if (p.stickOn) { await p.cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); p.stickOn = false; } }
async function tapSel(p, sel) { const b = await p.page.$(sel); if (!b) return false; const bb = await b.boundingBox(); if (!bb) return false; await p.page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); return true; }

const ps = [];
const startPhone = async (p) => { await p.page.fill("#name", "Bot" + p.i); await tapSel(p, "#go"); };
for (let i = 0; i < (LATE ? 1 : PLAYERS); i++) ps.push(await phone(i));
await sleep(600);
await shot(ps[0], "boot");
for (const p of ps) await startPhone(p);
await sleep(500);
await shot(ps[0], "draft");
for (const p of ps) await tapSel(p, "#offers .pick");
await sleep(500);
const late = { joined: false, sawOffers: false, sawWait: false, fought: false };

const seen = { fight: false, reticle: false, reward: 0, doorsShots: 0, fightShots: 0, plays: 0, tapTarget: false, over: false };
const t0 = Date.now();
let lastPhase = {};
while ((Date.now() - t0) / 1000 < BUDGET) {
  if (LATE && !late.joined && lastPhase[0] === "fight") {   // second phone opens the link mid-fight
    const p = await phone(1); ps.push(p); late.joined = true;
    await sleep(400); await startPhone(p); await sleep(700);
    late.sawOffers = (await p.page.$$("#draft:not(.hidden) #offers .pick")).length === 3;
    await shot(p, "late-draft"); await tapSel(p, "#offers .pick"); await sleep(500);
    late.sawWait = /next door/.test(await p.page.textContent("#draft-wait"));
    await shot(p, "late-waiting");
  }
  for (const p of ps) {
    const s = await state(p); if (!s) continue;
    if (LATE && p.i === 1 && s.phase === "fight" && s.heroes.some((h) => h.id === s.you.id)) late.fought = true;
    if (LATE && p.i === 1 && s.you?.waitNext) continue;
    const entered = lastPhase[p.i] !== s.phase; lastPhase[p.i] = s.phase;
    if (s.phase === "doors") {
      await stickOff(p);
      if (entered && p.i === 0) { await sleep(250); await shot(p, `doors-room${s.depth + 1}`); }
      await tapSel(p, "#door-list .pick");
    } else if (s.phase === "reward") {
      await stickOff(p);
      if (entered) { seen.reward++; await sleep(250); if (p.i === 0) await shot(p, `reward-${s.depth}`); }
      if (!s.reward?.done) { await tapSel(p, "#loot .mini"); await sleep(120); await tapSel(p, "#bodies .mini"); await sleep(120); await tapSel(p, "#reward-done"); }
    } else if (s.phase === "over") {
      await stickOff(p); seen.over = true;
      if (entered && p.i === 0) await shot(p, "over");
    } else if (s.phase === "fight") {
      seen.fight = true;
      const me = s.heroes.find((h) => h.id === s.you.id) ?? s.you;
      const foes = s.foes.filter((f) => !f.dead);
      if (entered && p.i === 0) { await sleep(400); await shot(p, `fight-room${s.depth + 1}-start`); seen.fightShots++; }
      // steer: toward the target to melee range, out of any live reticle
      const tgt = foes.find((f) => f.id === s.you.target);
      let vx = 0, vy = 0;
      if (tgt) { const d = Math.hypot(tgt.x - s.local.x, tgt.y - s.local.y) || 1; if (d > 1.9) { vx = (tgt.x - s.local.x) / d; vy = (tgt.y - s.local.y) / d; } }
      for (const f of foes) {
        const zs = [f.cast?.zone, ...(f.zones ?? []).filter((z) => z.p > 0).map((z) => z.zone)].filter(Boolean);
        for (const z of zs) {
          const parts = z.shape === "multi" ? z.parts : [z];
          for (const c of parts) {
            const d = Math.hypot(s.local.x - c.x, s.local.y - c.y) || 1, rr = (c.r ?? c.len ?? 2) + 0.9;
            if (d < rr) { vx = (s.local.x - c.x) / d; vy = (s.local.y - c.y) / d; }
          }
        }
      }
      if (vx || vy) await stick(p, vx, vy); else await stickOff(p);
      const casting = foes.some((f) => f.cast);
      if (casting && !seen.reticle && p.i === 0) { seen.reticle = true; await shot(p, `fight-room${s.depth + 1}-reticle`); }
      // tap-to-target once per run on the farthest foe (proves the tap path)
      if (!seen.tapTarget && foes.length > 1 && p.i === 0) {
        const far = [...foes].sort((a, b) => Math.hypot(b.x - me.x, b.y - me.y) - Math.hypot(a.x - me.x, a.y - me.y))[0];
        const x = s.R.ox + far.x * s.R.sc, y = s.R.oy + far.y * s.R.sc;
        await p.page.touchscreen.tap(x, y); await sleep(250);
        const after = await state(p);
        seen.tapTarget = after?.you?.tapped === far.id;
        await shot(p, `fight-room${s.depth + 1}-tapped`);
      }
      const ready = (s.you.hand ?? []).findIndex((c) => c?.ok);
      if (ready >= 0) { await tapSel(p, `.card[data-slot="${ready}"]`); seen.plays++; }
      if (p.i === 0 && seen.fightShots < 3 && Math.random() < 0.02) { await shot(p, `fight-room${s.depth + 1}-mid`); seen.fightShots++; }
    }
  }
  if (seen.over || seen.reward >= ROOMS) break;
  await sleep(70);
}
for (const p of ps) await stickOff(p);
const s = await state(ps[0]);
if (s?.phase === "doors") await shot(ps[0], `doors-final`);
if (s?.phase === "fight") {   // still fighting at budget: say why (sustain wall vs stuck bot)
  await shot(ps[0], "fight-at-budget");
  console.log("at budget:", JSON.stringify({ you: { hp: s.you.hp, body: s.you.body, hand: s.you.hand.map((c) => c && `${c.key}:${c.why ?? "ok"}`) },
    foes: s.foes.map((f) => ({ body: f.body, hp: f.hp, sh: f.sh, next: f.next, x: f.x, y: f.y })) }));
}
await browser.close();
if (server) server.kill();
console.log(JSON.stringify({ base: BASE, room, players: PLAYERS, ...seen, ...(LATE ? { late } : {}), finalPhase: s?.phase, depth: s?.depth, errors: errors.length }, null, 1));
for (const e of errors.slice(0, 20)) console.log("  ERR " + e);
console.log(shots.join("\n"));
const okRun = seen.fight && seen.reticle && seen.plays > 0 && errors.length === 0 && (seen.reward >= 1 || seen.over)
  && (!LATE || (late.sawOffers && late.sawWait && late.fought));
console.log(okRun ? "RT SHOOT OK" : "RT SHOOT FAILED");
process.exit(okRun ? 0 : 1);
