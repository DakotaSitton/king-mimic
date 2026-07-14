// SMART PLAYTHROUGH (owner 2026-06-27) — me actually PLAYING, not the crash-test driver.
// Same real-server + real-Edge + window.KM bridge as tools/playtest.mjs, but with a STRATEGY:
//   • Draft the TANKIEST body on the wheel (survivability > the random first pick).
//   • Stock the lightest rooms (meet the ante gate with the weakest foes).
//   • Combat (manual control, NO mindless auto-fire): if I'm low or a foe is about to fire, BLOCK/HEAL;
//     otherwise focus-fire the lowest-HP foe with my biggest affordable hit (kill attackers fast).
// Usage: node tools/play-smart.mjs   ·   VP=desktop / NODES=6 / BUDGET=150 / HEADED=1 to taste.
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const VP = (process.env.VP || "mobile").toLowerCase();
const HEADED = !!process.env.HEADED;
const PORT = Number(process.env.PORT || (3200 + Math.floor(Math.random() * 600)));
const BASE = `http://localhost:${PORT}`;
const MAX_NODES = Number(process.env.NODES || 6);
const BUDGET_MS = Number(process.env.BUDGET || 150) * 1000;
const BODIES = Number(process.env.BODIES || 1);
const ROOT = join(import.meta.dirname, "..");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = join(ROOT, "tools", "shots", `smart-${VP}-${STAMP}`);
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  mobile:  { viewport: { width: 852, height: 393 }, deviceScaleFactor: 3, hasTouch: true,  touchParam: true },
  iphone16:{ viewport: { width: 852, height: 393 }, deviceScaleFactor: 3, hasTouch: true,  touchParam: true },
  desktop: { viewport: { width: 1120, height: 820 }, deviceScaleFactor: 1, hasTouch: false, touchParam: false },
};
const V = VIEWPORTS[VP];
if (!V) throw new Error(`unknown VP=${VP}; expected mobile, iphone16, or desktop`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a);

function startServer() {
  return new Promise((resolve, reject) => {
    const srv = spawn("bun", ["run", "server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, shell: true });
    let out = ""; srv.stdout.on("data", (d) => (out += d)); srv.stderr.on("data", (d) => (out += d));
    srv.on("exit", (code) => { if (!srv._ready) reject(new Error(`server exited early (${code}):\n${out}`)); });
    (async () => {
      for (let i = 0; i < 60; i++) {
        try { const r = await fetch(BASE + "/", { signal: AbortSignal.timeout(1000) }); if (r.ok) { srv._ready = true; return resolve(srv); } } catch {}
        await sleep(250);
      }
      reject(new Error("server never reachable on " + BASE + "\n" + out));
    })();
  });
}

const jsErrors = [], shots = [], phaseLog = [];
let shotN = 0;

// ── strategy helpers ─────────────────────────────────────────────────────────
// approx body HP by key (the wheel may also expose hp/maxHp directly, which wins)
const BODY_HP = { juggernaut: 10, quakeCap: 9, heavyHand: 9, bloodfund: 9, counterparty: 8, rentier: 8, compound: 8,
  pyramidRogue: 7, ratBaron: 7, discountDuel: 7, mutualMend: 7, hedge: 7, leverage: 7, frugal: 6, ratTrader: 6 };
const DEF_RE = /shield|block|guard|stone\s?skin|tower|buckler|skin|tiara|ward|aegis|taunt|thorn/i;
const HEAL_RE = /heal|mend|vamp|lifest|regen|guard/i;
const txt = (c) => `${c.name || ""} ${c.text || ""}`;
const dmgOf = (c) => parseFloat(String(c.dmgNow ?? c.dmg ?? "0").replace(/[^\d.]/g, "")) || 0;

async function run() {
  log(`booting fresh server on ${PORT} …`);
  const srv = await startServer();
  log("server up. launching Edge (" + VP + ") …");
  const browser = await chromium.launch({ headless: !HEADED, channel: "msedge" });
  const ctx = await browser.newContext({ viewport: V.viewport, deviceScaleFactor: V.deviceScaleFactor, hasTouch: V.hasTouch });
  const page = await ctx.newPage();
  const deviceProfile = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio,
    touch: navigator.maxTouchPoints > 0,
  }));
  if (deviceProfile.width !== V.viewport.width || deviceProfile.height !== V.viewport.height ||
    deviceProfile.dpr !== V.deviceScaleFactor || deviceProfile.touch !== V.hasTouch) {
    throw new Error(`device profile mismatch: requested ${V.viewport.width}x${V.viewport.height}@${V.deviceScaleFactor} touch=${V.hasTouch}; ` +
      `got ${deviceProfile.width}x${deviceProfile.height}@${deviceProfile.dpr} touch=${deviceProfile.touch}`);
  }
  page.on("console", (m) => { if (m.type() === "error") { jsErrors.push({ kind: "error", text: m.text() }); log(`  ⚠ console.error: ${m.text().slice(0, 160)}`); } });
  page.on("pageerror", (e) => { jsErrors.push({ kind: "pageerror", text: String(e.stack || e) }); log(`  ✖ PAGEERROR: ${String(e.message || e).slice(0, 160)}`); });

  const getState = () => page.evaluate(() => window.KM?.state ?? null);
  const send = (msg) => page.evaluate((m) => window.KM.send(m), msg);
  async function shoot(phase, label) { const n = `${String(++shotN).padStart(2, "0")}-${phase}-${label}.png`; await page.screenshot({ path: join(OUT, n) }); shots.push(n); log(`  📸 ${n}`); }

  await page.goto(BASE + "/?harness=1" + (V.touchParam ? "&touch=1" : ""), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.KM, { timeout: 10000 });

  T0 = Date.now();
  await page.evaluate(({ bodies }) => {
    document.querySelector(`#bodiesPick .bp-opt[data-bodies="${bodies}"]`)?.click();
    document.getElementById("name").value = "Claude";
    document.getElementById("createBtn").click();
  }, { bodies: BODIES });
  await page.waitForFunction(() => !!window.KM?.state, { timeout: 8000 }).catch(() => log("  ✖ no state after create"));

  let nodesCleared = 0, lastPhase = null, combatShotAt = 0, stockTries = 0, stuckSince = Date.now(), wonHandled = false, done = false, draftLogged = false;
  const nextNodeId = (map) => { if (!map?.nodes) return null; const cur = map.nodes.find((n) => n.id === map.currentId); const links = (cur?.links ?? []).filter((id) => map.nodes.find((n) => n.id === id && !n.cleared)); return links[0] ?? (cur?.links ?? [])[0] ?? null; };

  while (Date.now() - T0 < BUDGET_MS) {
    const s = await getState();
    if (!s) { await sleep(200); continue; }
    const phase = s.phase;
    const me = s.players?.find((p) => p.id === s.you) || s.players?.[0];

    if (phase !== lastPhase) { log(`PHASE → ${phase} (floor ${s.floor ?? "?"})`); phaseLog.push({ phase, floor: s.floor }); await shoot(phase, "enter"); lastPhase = phase; stuckSince = Date.now(); stockTries = 0; wonHandled = false; }

    if (phase === "lobby") {
      await send({ type: "start" });
    } else if (phase === "draft") {
      const wheel = (s.draft?.wheel ?? []).filter((w) => !w.lockedBy);
      if (!draftLogged) { draftLogged = true; log("  WHEEL: " + JSON.stringify((s.draft?.wheel ?? []).map((w) => ({ id: w.id, body: w.body ?? w.bodyKey, hp: w.hp ?? w.maxHp })))); }
      if (wheel.length) {
        // survivability = HP + defensive kit (a high-HP body with no shields is a glass cannon)
        const kitKeys = (w) => (w.items ?? []).map((o) => (o && (o.key || o.name || o.text)) || String(o));
        const score = (w) => { const hp = w.hp ?? w.maxHp ?? BODY_HP[w.body ?? w.bodyKey] ?? 6; const it = kitKeys(w); return hp + it.filter((k) => DEF_RE.test(k)).length * 3 + it.filter((k) => HEAL_RE.test(k)).length * 4; };
        const best = wheel.slice().sort((a, b) => score(b) - score(a))[0];
        log(`  draft → ${best.body ?? best.bodyKey} (score ${score(best)}, kit ${kitKeys(best).join(",")})`);
        await send({ type: "draftPick", bundle: best.id });
      } else if (s.draft?.classes?.[0]) await send({ type: "chooseClass", key: s.draft.classes[0].key });
    } else if (phase === "stock") {
      const st = s.stock;
      if (st?.canBegin) await send({ type: "stockBegin" });
      else if (stockTries < (st?.max ?? 8) && st?.palette?.length) { let b = 0; st.palette.forEach((o, i) => { if ((o.ante ?? 99) < (st.palette[b].ante ?? 99)) b = i; }); await send({ type: "stockAdd", idx: b }); stockTries++; }
      else { jsErrors.push({ kind: "STALL", text: "stock ante gate unreachable" }); break; }
    } else if (phase === "setup") {
      await send({ type: "start" });
    } else if (phase === "playing") {
      const ehp = (me?.hp ?? 0) + (me?.shield ?? 0);
      const lowHp = ehp <= (me?.maxHp ?? 1) * 0.55;
      const foes = (s.lanes ?? []).flatMap((l) => l.enemies ?? []).filter((e) => (e.hp ?? 0) > 0);
      const imminent = foes.some((e) => (e.threat?.frac ?? 0) > 0.72);
      const hand = (me?.hand ?? []).filter((c) => c.affordable);
      const defCards = hand.filter((c) => DEF_RE.test(txt(c)) && dmgOf(c) === 0);
      const healCards = hand.filter((c) => HEAL_RE.test(txt(c)));
      const dmgCards = hand.filter((c) => dmgOf(c) > 0).sort((a, b) => dmgOf(b) - dmgOf(a));
      // focus-fire the lowest-HP foe (kill it → fewer attackers), tiebreak the most-imminent
      const tgt = foes.slice().sort((a, b) => (a.hp - b.hp) || ((b.threat?.frac ?? 0) - (a.threat?.frac ?? 0)))[0];
      // 1) one-shot the most-imminent foe I CAN kill this turn; 2) block/heal when low or about to be hit;
      // 3) focus biggest damage on the lowest-HP foe; 4) else BANK moxie (don't fritter it on chip utility).
      const killable = foes.filter((f) => dmgCards.some((c) => dmgOf(c) >= f.hp)).sort((a, b) => ((b.threat?.frac ?? 0) - (a.threat?.frac ?? 0)) || (a.hp - b.hp))[0];
      let pick = null, aimId = tgt?.id;
      if (killable) { aimId = killable.id; pick = dmgCards.find((c) => dmgOf(c) >= killable.hp); }
      else if ((lowHp || imminent) && (defCards[0] || healCards[0])) pick = (lowHp && healCards[0]) || defCards[0] || healCards[0];
      else if (dmgCards[0]) pick = dmgCards[0];
      if (aimId) await send({ type: "target", foeId: aimId });
      if (pick) await send({ type: "playCard", id: pick.id });
      if (Date.now() - combatShotAt > 1500) { combatShotAt = Date.now(); await shoot("playing", "tick"); }
    } else if (phase === "won" && !wonHandled) {
      wonHandled = true;
      for (const c of (s.loot?.cards ?? [])) await send({ type: "claimLoot", key: c.key });
      nodesCleared++; await shoot("won", `cleared-${nodesCleared}`);
      if (s.runWon || nodesCleared >= MAX_NODES) { log(s.runWon ? "RUN COMPLETE 👑" : `cleared ${nodesCleared} nodes — stopping`); done = true; }
      else if (s.map?.levelComplete) { log("  floor cleared → descend"); await send({ type: "descend" }); }
      else { const to = nextNodeId(s.map); if (to) { log(`  advance → ${to}`); await send({ type: "advance", to }); } else done = true; }
    } else if (phase === "shop" && !wonHandled) {
      wonHandled = true; const to = nextNodeId(s.map); await send({ type: "leaveShop", to });
    } else if (phase === "lost") {
      await shoot("lost", "death"); log("CARAVAN FELL — run over"); done = true;
    }

    if (done) break;
    if (phase !== "playing" && Date.now() - stuckSince > 12000) { jsErrors.push({ kind: "STALL", text: `stuck in '${phase}'>12s` }); break; }
    await sleep(220);
  }

  const fs = await getState();
  await shoot(fs?.phase ?? "end", "final").catch(() => {});
  writeFileSync(join(OUT, "report.json"), JSON.stringify({ when: new Date().toISOString(), viewport: VP, viewportSize: V.viewport, deviceProfile, nodesCleared, finalPhase: fs?.phase ?? null, runWon: !!fs?.runWon, phases: phaseLog, jsErrors }, null, 2));
  await browser.close();
  try {
    if (process.platform === "win32") {
      spawnSync("powershell", ["-NoProfile", "-Command", `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`]);
      spawnSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"]);
    } else srv.kill("SIGKILL");
  } catch {}

  console.log("\n──────── SMART PLAY SUMMARY ────────");
  console.log(`phases     : ${phaseLog.map((p) => p.phase).join(" → ")}`);
  console.log(`nodes clr  : ${nodesCleared}   final: ${fs?.phase}   runWon: ${!!fs?.runWon}`);
  console.log(`screenshots: ${shots.length} → ${OUT}`);
  console.log(`JS errors  : ${jsErrors.length}`);
  process.exit(0);
}
run().catch((e) => { console.error("DRIVER ERROR:", e); process.exit(1); });
