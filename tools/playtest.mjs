// ⤳ SUPERSEDED 2026-06-27 by tools/shoot.mjs (the canonical real-screenshot command — solo+mobile
//   default, boss-aware brain, 404/art capture). Kept for history. For real shots: node tools/shoot.mjs
// REAL INTERACTIVE PLAYTHROUGH DRIVER (owner 2026-06-26).
// The honest answer to "actually playtest and run through the game." This is NOT a frozen
// constructed snapshot (that's what tools/realshot.js does — one hand-built scene). This:
//   1. Boots a FRESH server on a private port → always the CURRENT game.js/server.js, never the
//      possibly-stale live :3000 the owner is tunneling to.
//   2. Drives the REAL client in a REAL Edge browser (Playwright, system msedge channel — no
//      bundled-chromium download needed) through the REAL phases via the client's own window.KM
//      bridge: create → draft → stock → setup → live combat → won/shop/descend → … → lost/run-win.
//   3. Screenshots the LIVE canvas at every phase + repeatedly through ticking combat.
//   4. Captures every console error + uncaught pageerror — these are real client bugs.
//   5. Reads window.KM.state to log a state summary per phase and flag logic stalls (e.g. a stock
//      screen that can never meet its ante gate) as BUGS.
//
// Usage:
//   node tools/playtest.mjs                 # mobile (phone-landscape, touch layout), headless
//   VP=desktop node tools/playtest.mjs      # desktop viewport
//   HEADED=1 node tools/playtest.mjs        # watch it play in a visible window
//   NODES=6 node tools/playtest.mjs         # stop after N combat nodes (default 4)
//   BUDGET=120 node tools/playtest.mjs      # wall-clock seconds budget (default 90)
// Output: tools/shots/play-<VP>-<ts>/NN-<phase>-<label>.png  +  report.json  +  a console summary.

import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const VP = (process.env.VP || "mobile").toLowerCase();
const HEADED = !!process.env.HEADED;
// Fresh random port per run: even if a prior run's bun lingers, this run gets a clean port (and the
// god-mode room code "DEMO" is therefore always free on its own brand-new server).
const PORT = Number(process.env.PORT || (3200 + Math.floor(Math.random() * 600)));
const BASE = `http://localhost:${PORT}`;
const MAX_NODES = Number(process.env.NODES || 4);   // combat nodes to clear before we stop
const BUDGET_MS = Number(process.env.BUDGET || 90) * 1000;
const BODIES = Number(process.env.BODIES || 1);
const ROOT = join(import.meta.dirname, "..");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = join(ROOT, "tools", "shots", `play-${VP}-${STAMP}`);
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  mobile:  { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true,  touchParam: true },
  desktop: { viewport: { width: 1120, height: 820 }, deviceScaleFactor: 1, hasTouch: false, touchParam: false },
};
const V = VIEWPORTS[VP] || VIEWPORTS.mobile;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a);
let T0 = Date.now();

// ── boot a fresh server on the private port (current code) ───────────────────
function startServer() {
  return new Promise((resolve, reject) => {
    const srv = spawn("bun", ["run", "server.js"], {
      cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, shell: true,
    });
    let out = "";
    srv.stdout.on("data", (d) => { out += d; });
    srv.stderr.on("data", (d) => { out += d; });
    srv.on("exit", (code) => { if (!srv._ready) reject(new Error(`server exited early (${code}):\n${out}`)); });
    // poll until it answers
    (async () => {
      for (let i = 0; i < 60; i++) {
        try {
          const r = await fetch(BASE + "/", { signal: AbortSignal.timeout(1000) });
          if (r.ok) { srv._ready = true; return resolve(srv); }
        } catch {}
        await sleep(250);
      }
      reject(new Error("server never became reachable on " + BASE + "\n" + out));
    })();
  });
}

// ── main ─────────────────────────────────────────────────────────────────────
const jsErrors = [];
const shots = [];
const phaseLog = [];
let shotN = 0;

async function run() {
  log(`booting fresh server on ${PORT} …`);
  const srv = await startServer();
  log("server up. launching Edge (" + VP + (HEADED ? ", headed" : ", headless") + ") …");

  const browser = await chromium.launch({ headless: !HEADED, channel: "msedge" });
  const ctx = await browser.newContext({
    viewport: V.viewport, deviceScaleFactor: V.deviceScaleFactor, hasTouch: V.hasTouch,
  });
  const page = await ctx.newPage();

  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      const txt = m.text();
      jsErrors.push({ t: ((Date.now() - T0) / 1000).toFixed(1), kind: m.type(), text: txt });
      log(`  ⚠ console.${m.type()}: ${txt.slice(0, 200)}`);
    }
  });
  page.on("pageerror", (e) => {
    jsErrors.push({ t: ((Date.now() - T0) / 1000).toFixed(1), kind: "pageerror", text: String(e.stack || e) });
    log(`  ✖ PAGEERROR: ${String(e.message || e).slice(0, 200)}`);
  });
  // catch missing assets (404 art/icons/etc.) BY URL — the bug class that hides behind a generic
  // "Failed to load resource" console line. Ignore favicon noise.
  const seen404 = new Set();
  page.on("response", (r) => {
    const u = r.url(), st = r.status();
    if (st >= 400 && !/favicon/.test(u) && !seen404.has(u)) {
      seen404.add(u);
      jsErrors.push({ t: ((Date.now() - T0) / 1000).toFixed(1), kind: `http${st}`, text: u });
      log(`  ✖ HTTP ${st}: ${u}`);
    }
  });

  const url = BASE + "/" + (V.touchParam ? "?touch=1" : "");
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.KM, { timeout: 10000 });

  const getState = () => page.evaluate(() => window.KM?.state ?? null);
  const km = (msg) => page.evaluate((m) => window.KM.send(m), msg);
  async function shoot(phase, label) {
    const name = `${String(++shotN).padStart(2, "0")}-${phase}-${label}.png`;
    await page.screenshot({ path: join(OUT, name) });
    shots.push(name);
    log(`  📸 ${name}`);
  }

  // kick off a real room by driving the REAL lobby: set the body count + name and click
  // #createBtn — that's what opens the WebSocket (KM.send is a no-op until ws is connected).
  T0 = Date.now();
  await page.evaluate(({ bodies, god }) => {
    document.querySelector(`#bodiesPick .bp-opt[data-bodies="${bodies}"]`)?.click();
    document.getElementById("name").value = "Tester";
    // GOD: the literal room code "DEMO" boots a god-mode room (caravan/HP 999, full roster,
    // bosses auto-fill) so the run survives all the way to the bosses we want to screenshot.
    if (god) document.getElementById("code").value = "DEMO";
    document.getElementById("createBtn").click();
  }, { bodies: BODIES, god: !!process.env.GOD });
  // wait for the server to seat us (joined → first state)
  const connected = await page.waitForFunction(() => !!window.KM?.state, { timeout: 8000 })
    .then(() => true).catch(() => false);
  if (!connected) log("  ✖ never received a state after create — WS may not have connected");

  let nodesCleared = 0;
  let lastPhase = null;
  let combatShotAt = 0;
  let stockTries = 0;
  let stuckSince = Date.now();
  let wonHandled = false;   // won/shop progression is one-shot per node (advancing twice skips rooms)
  let done = false;

  // the next reachable node from the live map (mirrors map.js: current node's uncleared links)
  const nextNodeId = (map) => {
    if (!map?.nodes) return null;
    const cur = map.nodes.find((n) => n.id === map.currentId);
    const links = (cur?.links ?? []).filter((id) => map.nodes.find((n) => n.id === id && !n.cleared));
    return links[0] ?? (cur?.links ?? [])[0] ?? null;
  };

  while (Date.now() - T0 < BUDGET_MS) {
    const s = await getState();
    if (!s) { await sleep(200); continue; }
    const phase = s.phase;
    const me = s.players?.find((p) => p.id === s.you) || s.players?.[0];

    if (phase !== lastPhase) {
      log(`PHASE → ${phase}  (floor ${s.floor ?? "?"}, ${s.players?.length ?? 0} players)`);
      phaseLog.push({ t: ((Date.now() - T0) / 1000).toFixed(1), phase, floor: s.floor });
      await shoot(phase, "enter");
      lastPhase = phase;
      stuckSince = Date.now();
      stockTries = 0;
      wonHandled = false;
    }

    // ── per-phase actions ──
    if (phase === "lobby") {
      await km({ type: "start" });
    } else if (phase === "draft") {
      // wheel draft preferred; fall back to legacy class pick
      const bundle = s.draft?.wheel?.find((w) => !w.lockedBy)?.id;
      if (bundle) await km({ type: "draftPick", bundle });
      else if (s.draft?.classes?.[0]) await km({ type: "chooseClass", key: s.draft.classes[0].key });
    } else if (phase === "stock") {
      const st = s.stock;
      if (st?.canBegin) {
        await km({ type: "stockBegin" });
      } else if (stockTries < (st?.max ?? 8) && (st?.palette?.length)) {
        // add the LIGHTEST available body each time — meets the ante gate with the weakest
        // possible room, so the AUTO pilot survives deeper and we screenshot more content
        // (shops, elites, bosses) instead of dying on floor 1.
        let best = 0;
        st.palette.forEach((o, i) => { if ((o.ante ?? 99) < (st.palette[best].ante ?? 99)) best = i; });
        await km({ type: "stockAdd", idx: best });
        stockTries++;
      } else {
        // tried to fill and still can't begin → real stall worth reporting
        jsErrors.push({ t: ((Date.now() - T0) / 1000).toFixed(1), kind: "STALL",
          text: `stock phase can't reach ante gate: stocked=${st?.anteStocked} required=${st?.anteRequired} after ${stockTries} picks` });
        log(`  ✖ STALL: stock ante gate unreachable (${st?.anteStocked}/${st?.anteRequired})`);
        break;
      }
    } else if (phase === "setup") {
      await km({ type: "start" });
    } else if (phase === "playing") {
      // make sure combat actually resolves: AUTO fires ready damaging cards itself
      if (me && !me.autoFire) await km({ type: "autoFire", on: true });
      // also exercise manual play: aim at the first foe and play one affordable card
      const foe = (s.lanes?.[me?.lane ?? 0]?.enemies?.[0]) || s.lanes?.flatMap((l) => l.enemies)?.[0];
      if (foe) await km({ type: "target", foeId: foe.id });
      const card = me?.hand?.find((c) => c.affordable);
      if (card) await km({ type: "playCard", id: card.id });
      // periodic combat screenshots so we SEE the live fight, not just its bookends
      if (Date.now() - combatShotAt > 1600) { combatShotAt = Date.now(); await shoot("playing", "tick"); }
    } else if (phase === "won" && !wonHandled) {
      wonHandled = true;
      for (const c of (s.loot?.cards ?? [])) await km({ type: "claimLoot", key: c.key });
      nodesCleared++;
      await shoot("won", `cleared-${nodesCleared}`);
      if (s.runWon || nodesCleared >= MAX_NODES) {
        log(s.runWon ? "RUN COMPLETE 👑" : `cleared ${nodesCleared} nodes — stopping`);
        done = true;
      } else if (s.map?.levelComplete) {
        log("  floor cleared → descend");
        await km({ type: "descend" });
      } else {
        const to = nextNodeId(s.map);
        if (to) { log(`  advance → node ${to}`); await km({ type: "advance", to }); }
        else { jsErrors.push({ t: ((Date.now() - T0) / 1000).toFixed(1), kind: "STALL", text: "won but no reachable next node" }); log("  ✖ STALL: no reachable next node"); done = true; }
      }
    } else if (phase === "shop" && !wonHandled) {
      wonHandled = true;
      const to = nextNodeId(s.map);
      await km({ type: "leaveShop", to });
    } else if (phase === "lost") {
      await shoot("lost", "death");
      log("CARAVAN FELL — run over");
      done = true;
    }

    if (done) break;
    // global anti-stuck: if a non-combat phase doesn't advance for 12s, bail with a note
    if (phase !== "playing" && Date.now() - stuckSince > 12000) {
      jsErrors.push({ t: ((Date.now() - T0) / 1000).toFixed(1), kind: "STALL", text: `stuck in phase '${phase}' >12s` });
      log(`  ✖ STALL: stuck in '${phase}' >12s — bailing`);
      break;
    }
    await sleep(250);
  }

  // final frame + report
  const finalState = await getState();
  await shoot(finalState?.phase ?? "end", "final").catch(() => {});

  const report = {
    when: new Date().toISOString(), viewport: VP, port: PORT, budgetMs: BUDGET_MS,
    nodesCleared, durationS: ((Date.now() - T0) / 1000).toFixed(1),
    finalPhase: finalState?.phase ?? null, runWon: !!finalState?.runWon,
    phases: phaseLog, screenshots: shots,
    jsErrorCount: jsErrors.length, jsErrors,
  };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));

  await browser.close();
  // Reliable cleanup: kill whatever is LISTENING on our port (the bun grandchild under the shell),
  // not just the shell pid — otherwise an orphan squats the port and poisons the next run.
  try {
    if (process.platform === "win32") {
      spawnSync("powershell", ["-NoProfile", "-Command",
        `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ` +
        `Select-Object -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`]);
      spawnSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"]);
    } else { srv.kill("SIGKILL"); }
  } catch {}

  console.log("\n──────── PLAYTEST SUMMARY ────────");
  console.log(`viewport   : ${VP} ${V.viewport.width}x${V.viewport.height}@${V.deviceScaleFactor}`);
  console.log(`phases     : ${phaseLog.map((p) => p.phase).join(" → ") || "(none)"}`);
  console.log(`nodes clr  : ${nodesCleared}   final phase: ${report.finalPhase}   runWon: ${report.runWon}`);
  console.log(`screenshots: ${shots.length}  →  ${OUT}`);
  console.log(`JS errors  : ${jsErrors.length}`);
  for (const e of jsErrors.slice(0, 12)) console.log(`   [${e.kind} @${e.t}s] ${e.text.split("\n")[0].slice(0, 160)}`);
  console.log("report.json:", join(OUT, "report.json"));
  process.exit(0);
}

run().catch((e) => { console.error("DRIVER ERROR:", e); process.exit(1); });
