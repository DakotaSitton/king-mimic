// ============================================================================
//  scenario-shot.mjs — SCENARIO capture harness (dev tool, 2026-07-11)
// ============================================================================
//  ┌────────────────────────────────────────────────────────────────────────┐
//  │  node tools/scenario-shot.mjs tools/scenarios/<name>.json              │
//  └────────────────────────────────────────────────────────────────────────┘
//
//  WHY: some visual surfaces are unreachable in a random run within any sane
//  budget (a 15-foe crowd, a DR-carrying foe, an exact hand). This harness
//  reaches them WITHOUT a fixture: it boots the REAL server (with KM_SCENARIO=1,
//  which this harness sets on its own throwaway child process — the live server
//  never runs with it), drives the REAL client in real Edge, creates a room the
//  way a player does, then injects ONLY the STARTING CONDITIONS via the gated
//  {type:"scenario"} message. From that moment the ordinary tick loop runs and
//  everything on screen is the live game — the same bar tools/shoot.mjs holds.
//
//  ⚠ This is a CAPTURE/PROOF tool for hard-to-reach states. It is NOT a
//    substitute for `node tools/shoot.mjs` random-run verification (CLAUDE.md
//    bar) — a scenario proves a surface renders, shoot.mjs proves the game
//    plays. It is also NOT tools/realshot.js (frozen fixture) reborn: no scene
//    is hand-painted here; the engine ticks for real.
//
//  Scenario JSON = the engine spec (see applyScenario, engine/lobby.js) plus
//  optional harness fields:
//    "bodies": N            create the room with N bodies (default players.length)
//    "openBodyMenu": true   open the REAL body-swap menu after boot (adoption shots)
//    "script": [ ... ]      a minimal ACTION SCRIPT, run in order:
//        {"wait": seconds}        let the real game tick
//        {"play": k}              play hand slot k via the client's own key binding
//                                 (Digit1-9 → playHandSlot: affordability + pick-popover included)
//        {"play": "cardKey"}      same verb by KEY — resolves the card's CURRENT slot first
//                                 (a prior play reorders the hand, so an index can go stale)
//        {"tapFoe": i}            tap the i-th live foe hit-box on the canvas (targets it)
//        {"tapAlly": i}           tap the i-th hero/ally hit-box (heal-aim / possess)
//        {"tapHand": i}           quick-tap hand slot i; asserts no inspector is left open
//        {"touchStartHand": i}    put a real touch down on hand slot i (pair with touchEndHand)
//        {"touchEndHand": true}   release it; asserts the hold did not cast/move a card
//        {"expectHandInspect": i|null} assert the semantic hold-only inspector state
//        {"shot": "name"}         take a named screenshot
//    No other verbs — this is deliberately not a general automation language.
//
//  Env: VP=desktop|iphone16 (default mobile = iPhone 16 landscape 852x393@3 touch) · HEADED=1 · PORT=n
//  Output: tools/shots/scenario-<name>-<ts>/NN-<label>.png + report.json + MANIFEST.txt
//  Exit: non-zero on any JS error / pageerror / HTTP>=400 / failed injection.
// ============================================================================
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

const SPEC_PATH = process.argv[2];
if (!SPEC_PATH) { console.error("usage: node tools/scenario-shot.mjs tools/scenarios/<name>.json"); process.exit(1); }
const spec = JSON.parse(readFileSync(SPEC_PATH, "utf8"));
const NAME = spec.name ?? basename(SPEC_PATH, ".json");
const VP = (process.env.VP || "mobile").toLowerCase();
const HEADED = !!process.env.HEADED;
const PORT = Number(process.env.PORT || (4200 + Math.floor(Math.random() * 400)));
const BASE = `http://localhost:${PORT}`;
const ROOT = join(import.meta.dirname, "..");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = join(ROOT, "tools", "shots", `scenario-${NAME}-${STAMP}`);
mkdirSync(OUT, { recursive: true });

// same device profiles as shoot.mjs (the owner's iPhone 16 landscape default)
const IPHONE16_LANDSCAPE = {
  viewport: { width: 852, height: 393 }, deviceScaleFactor: 3, hasTouch: true, touchParam: true,
};
const VIEWPORTS = {
  mobile: IPHONE16_LANDSCAPE,
  iphone16: IPHONE16_LANDSCAPE,
  desktop: { viewport: { width: 1120, height: 820 }, deviceScaleFactor: 1, hasTouch: false, touchParam: false },
};
const V = VIEWPORTS[VP];
if (!V) throw new Error(`unknown VP=${VP}; expected mobile, iphone16, or desktop`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a);

// ── boot a fresh server on a private port WITH the scenario gate armed ───────────────────────────
function startServer() {
  return new Promise((resolve, reject) => {
    const srv = spawn("bun", ["run", "server.js"], {
      cwd: ROOT, shell: true,
      env: { ...process.env, PORT: String(PORT), KM_SCENARIO: "1" },   // the gate exists ONLY on this child
    });
    let out = ""; srv.stdout.on("data", (d) => (out += d)); srv.stderr.on("data", (d) => (out += d));
    srv.on("exit", (code) => { if (!srv._ready) reject(new Error(`server exited early (${code}):\n${out}`)); });
    (async () => {
      for (let i = 0; i < 80; i++) {
        try { const r = await fetch(BASE + "/", { signal: AbortSignal.timeout(1000) }); if (r.ok) { srv._ready = true; srv._out = () => out; return resolve(srv); } } catch {}
        await sleep(250);
      }
      reject(new Error("server never reachable on " + BASE + "\n" + out));
    })();
  });
}

const jsErrors = [], shots = [];
let shotN = 0, srv = null;

function killServer() {
  try {
    if (!srv) return;
    if (process.platform === "win32") {
      spawnSync("powershell", ["-NoProfile", "-Command", `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`]);
      spawnSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"]);
    } else srv.kill("SIGKILL");
  } catch {}
}

async function run() {
  console.log("════════════════════════════════════════════════════════════════════");
  console.log("  King Mimic — SCENARIO capture (tools/scenario-shot.mjs)");
  console.log(`  scenario: ${NAME} · viewport: ${VP} ${V.viewport.width}x${V.viewport.height}@${V.deviceScaleFactor}${V.hasTouch ? " touch" : ""}`);
  console.log("  Real server + real client + real tick loop — only the START is injected.");
  console.log("════════════════════════════════════════════════════════════════════");
  log(`booting KM_SCENARIO=1 server on ${PORT} …`);
  for (let attempt = 1; attempt <= 4 && !srv; attempt++) {
    try { srv = await startServer(); }
    catch (e) { log(`  server boot failed (try ${attempt}): ${String(e).slice(0, 120)}`); await sleep(1500); }
  }
  if (!srv) throw new Error("server would not boot after retries");
  if (!/SCENARIO MODE/.test(srv._out())) log("  ⚠ server banner missing the SCENARIO MODE line — check server.js gate");
  log("server up. launching Edge …");
  const browser = await chromium.launch({ headless: !HEADED, channel: "msedge" });
  const ctx = await browser.newContext({ viewport: V.viewport, deviceScaleFactor: V.deviceScaleFactor, hasTouch: V.hasTouch });
  const page = await ctx.newPage();
  const cdp = V.hasTouch ? await ctx.newCDPSession(page) : null;
  const deviceProfile = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio,
    touch: navigator.maxTouchPoints > 0,
  }));
  const profileMismatch = deviceProfile.width !== V.viewport.width || deviceProfile.height !== V.viewport.height ||
    deviceProfile.dpr !== V.deviceScaleFactor || deviceProfile.touch !== V.hasTouch;
  if (profileMismatch) {
    throw new Error(`device profile mismatch: requested ${V.viewport.width}x${V.viewport.height}@${V.deviceScaleFactor} touch=${V.hasTouch}; ` +
      `got ${deviceProfile.width}x${deviceProfile.height}@${deviceProfile.dpr} touch=${deviceProfile.touch}`);
  }
  log(`device profile verified: ${deviceProfile.width}x${deviceProfile.height}@${deviceProfile.dpr}${deviceProfile.touch ? " touch" : ""}`);

  // identical accountability to shoot.mjs: console errors, pageerrors, HTTP>=400 (missing art) all fail the run
  page.on("console", (m) => { if (m.type() === "error") { jsErrors.push({ kind: "error", t: ((Date.now() - T0) / 1000).toFixed(1), text: m.text() }); log(`  ⚠ console.error: ${m.text().slice(0, 140)}`); } });
  page.on("pageerror", (e) => { jsErrors.push({ kind: "pageerror", t: ((Date.now() - T0) / 1000).toFixed(1), text: String(e.stack || e) }); log(`  ✖ PAGEERROR: ${String(e.message || e).slice(0, 140)}`); });
  const seen404 = new Set();
  page.on("response", (r) => {
    const u = r.url(), st = r.status();
    if (st >= 400 && !/favicon/.test(u) && !seen404.has(u)) {
      seen404.add(u);
      jsErrors.push({ kind: `http${st}`, t: ((Date.now() - T0) / 1000).toFixed(1), text: u });
      log(`  ✖ HTTP ${st}: ${u}`);
    }
  });

  const send = (msg) => page.evaluate((m) => window.KM.send(m), msg);
  async function shot(label) {
    try { await page.evaluate(() => window.dispatchEvent(new Event("resize"))); } catch {}
    await sleep(140);   // > the 80ms resize debounce → a render() with loaded art (shoot.mjs pattern)
    const n = `${String(++shotN).padStart(2, "0")}-${label}.png`;
    await page.screenshot({ path: join(OUT, n) }); shots.push(n); log(`  📸 ${n}`);
  }
  // tap a live canvas hit-box (window.KM.hit — the client's own logical boxes) with a REAL touch/click
  async function tapEntity(kindKey, i) {
    const pt = await page.evaluate(({ kindKey, i }) => {
      const boxes = (kindKey === "foe" ? window.KM?.hit?.foes : window.KM?.hit?.heroes) ?? [];
      const b = boxes[i]; if (!b) return null;
      const cv = document.getElementById("cv"); if (!cv) return null;
      const r = cv.getBoundingClientRect();
      const { W, H } = window.KM.board ?? { W: r.width, H: r.height };
      const cx = b.w != null ? b.x + b.w / 2 : b.x;     // hero entries may be circles {x,y,r}
      const cy = b.h != null ? b.y + b.h / 2 : b.y;
      return { x: r.left + (cx / W) * r.width, y: r.top + (cy / H) * r.height };
    }, { kindKey, i });
    if (!pt) { log(`  ⚠ tap ${kindKey}[${i}] — no live hit-box`); return; }
    if (V.hasTouch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
    log(`  👆 tap ${kindKey}[${i}] @ ${pt.x.toFixed(0)},${pt.y.toFixed(0)}`);
    // a tap synthesizes a trailing hover at the same point, which pins the foe INSPECT card over the
    // board — park the pointer in a dead corner so the next shot shows the board, not the tooltip
    await page.mouse.move(4, 4);
  }
  const handState = () => page.evaluate(() => {
    const km = window.KM, me = (km?.state?.players ?? []).find((p) => p.id === (km.activeId ?? km.you)) ?? (km?.state?.players ?? [])[0];
    return { ids: (me?.hand ?? []).map((c) => c.id), inspect: km?.ui?.handInspect ?? null };
  });
  const handPoint = (i) => page.evaluate((i) => {
    const km = window.KM, me = (km?.state?.players ?? []).find((p) => p.id === (km.activeId ?? km.you)) ?? (km?.state?.players ?? [])[0];
    const n = me?.hand?.length ?? 0, cv = document.getElementById("cv");
    if (!cv || i < 0 || i >= n) return null;
    const r = cv.getBoundingClientRect(), H = km?.board?.H ?? 392;
    return { x: r.left + ((i + 0.5) / n) * r.width, y: r.top + ((H - 35) / H) * r.height };
  }, i);
  let heldHand = null;
  async function tapHand(i) {
    const pt = await handPoint(i); if (!pt) throw new Error(`tapHand ${i}: live hand slot missing`);
    if (V.hasTouch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
    await sleep(120);
    const after = await handState();
    if (after.inspect != null) throw new Error(`tapHand ${i}: inspector opened from a quick tap (slot ${after.inspect})`);
    log(`  👆 tap hand[${i}] — inspector stayed closed`);
  }
  async function touchStartHand(i) {
    if (!cdp) throw new Error("touchStartHand requires a touch viewport");
    const pt = await handPoint(i); if (!pt) throw new Error(`touchStartHand ${i}: live hand slot missing`);
    heldHand = { pt, before: await handState() };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y }] });
    log(`  ☝ hold start hand[${i}]`);
  }
  async function touchEndHand() {
    if (!cdp || !heldHand) throw new Error("touchEndHand without touchStartHand");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(120);
    const after = await handState();
    if (after.ids.join() !== heldHand.before.ids.join()) throw new Error("held hand card cast or moved on release");
    heldHand = null;
    log("  👆 hold release — hand unchanged");
  }
  // resolve {"play": k | "cardKey"} to the card's CURRENT hand slot (the piloted body's live hand)
  const handSlotOf = (want) => page.evaluate((want) => {
    const km = window.KM; if (!km?.state) return -1;
    const me = (km.state.players ?? []).find((p) => p.id === (km.activeId ?? km.you)) ?? (km.state.players ?? [])[0];
    const hand = me?.hand ?? [];
    if (typeof want === "number") return want >= 0 && want < hand.length ? want : -1;
    return hand.findIndex((c) => c.key === want);
  }, want);

  await page.goto(BASE + "/?harness=1" + (V.touchParam ? "&touch=1" : ""), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.KM, { timeout: 12000 });
  T0 = Date.now();

  // create the room exactly like a player (the same path shoot.mjs drives)
  const bodies = Math.max(1, Math.min(4, spec.bodies ?? (spec.players?.length || 1)));
  await page.evaluate(({ bodies }) => {
    document.querySelector(`#bodiesPick .bp-opt[data-bodies="${bodies}"]`)?.click();
    document.getElementById("name").value = "Scenario";
    document.getElementById("createBtn").click();
  }, { bodies });
  await page.waitForFunction(() => !!window.KM?.state, { timeout: 9000 });

  // inject the starting conditions through the gated hook, then wait for the REAL loop to carry them
  log(`injecting scenario "${NAME}" …`);
  await send({ type: "scenario", spec });
  await page.waitForFunction((nm) => window.KM?.state?.scenario === nm, NAME, { timeout: 8000 }).catch(async () => {
    const err = await page.evaluate(() => document.getElementById("lobbyErr")?.textContent || "");
    throw new Error(`scenario was not applied${err ? ` — server said: ${err}` : ""}`);
  });
  const wantPhase = spec.phase ?? "playing";
  await page.waitForFunction((ph) => window.KM?.state?.phase === ph, wantPhase, { timeout: 8000 });
  log(`scenario live (phase ${wantPhase}).`);

  if (spec.openBodyMenu) {   // adoption shots: open the REAL body-swap menu (same surface a player taps)
    const via = await page.evaluate(() => {
      const btn = [...document.querySelectorAll("[data-swapbody]")].find((b) => b.offsetParent !== null);
      if (btn) { btn.click(); return "its real button"; }
      if (window.KM?.openBodyModal) { window.KM.openBodyModal(); return "the KM bridge"; }
      return null;
    });
    log(`  body menu opened via ${via ?? "NOTHING — no surface found"}`);
    await sleep(300);
  }

  await shot("boot");
  const script = Array.isArray(spec.script) && spec.script.length ? spec.script
    : [{ wait: 1 }, { shot: "scene" }, { wait: 2.5 }, { shot: "scene-2" }, { wait: 2.5 }, { shot: "scene-3" }];
  for (const step of script) {
    if (step.wait != null) { await sleep(Math.max(0, step.wait * 1000)); }
    else if (step.play != null) {
      const k = await handSlotOf(typeof step.play === "string" ? step.play : Math.max(0, Math.min(8, step.play | 0)));
      if (k < 0 || k > 8) { log(`  ⚠ play ${JSON.stringify(step.play)} — not in the live hand`); continue; }
      await page.keyboard.press(`Digit${k + 1}`);       // the client's own hand binding (playHandSlot)
      log(`  🃏 play hand slot ${k}${typeof step.play === "string" ? ` (${step.play})` : ""}`);
      await sleep(250);
    }
    else if (step.tapFoe != null) await tapEntity("foe", step.tapFoe | 0);
    else if (step.tapAlly != null) await tapEntity("hero", step.tapAlly | 0);
    else if (step.tapHand != null) await tapHand(step.tapHand | 0);
    else if (step.touchStartHand != null) await touchStartHand(step.touchStartHand | 0);
    else if (step.touchEndHand) await touchEndHand();
    else if (Object.hasOwn(step, "expectHandInspect")) {
      const got = (await handState()).inspect, want = step.expectHandInspect;
      if (got !== want) throw new Error(`hand inspector: expected ${want}, got ${got}`);
      log(`  ✓ hand inspector ${want == null ? "closed" : `on slot ${want}`}`);
    }
    else if (step.shot != null) await shot(String(step.shot).replace(/[^\w-]+/g, "-"));
    else log(`  ⚠ unknown script step ${JSON.stringify(step)} — see the action verbs at the top of this file`);
  }
  const fs = await page.evaluate(() => ({ phase: window.KM?.state?.phase, tick: window.KM?.state?.tick, floor: window.KM?.state?.floor }));
  await shot("final").catch(() => {});

  const report = { when: new Date().toISOString(), tool: "tools/scenario-shot.mjs", scenario: NAME, specPath: SPEC_PATH,
    real: { server: true, client: true, tickLoop: true, startingConditions: "injected via KM_SCENARIO=1 {type:'scenario'}" },
    viewport: VP, viewportSize: V.viewport, deviceProfile, dpr: V.deviceScaleFactor, touch: V.hasTouch, port: PORT, bodies,
    finalPhase: fs?.phase ?? null, finalTick: fs?.tick ?? null,
    screenshots: shots, jsErrorCount: jsErrors.length, jsErrors };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(OUT, "MANIFEST.txt"),
    `KING MIMIC — SCENARIO CAPTURE\n` +
    `tool       : tools/scenario-shot.mjs\n` +
    `scenario   : ${NAME} (${SPEC_PATH})\n` +
    `when       : ${report.when}\n` +
    `viewport   : ${VP} ${V.viewport.width}x${V.viewport.height}@${V.deviceScaleFactor}${V.hasTouch ? " touch" : ""}\n` +
    `final      : phase ${report.finalPhase} · tick ${report.finalTick}\n` +
    `JS errors  : ${jsErrors.length}\n` +
    `\nThese frames are the LIVE canvas of a real server + real client + real tick loop.\n` +
    `Only the STARTING CONDITIONS were injected (KM_SCENARIO=1 dev gate; the live server\n` +
    `never sets it). This is a capture tool for hard-to-reach states — it does NOT replace\n` +
    `tools/shoot.mjs random-run verification, and it is NOT the realshot.js fixture.\n`);

  await browser.close();
  killServer();
  console.log("\n──────── SCENARIO CAPTURE SUMMARY ────────");
  console.log(`scenario   : ${NAME}   final phase: ${fs?.phase}`);
  console.log(`screenshots: ${shots.length} → ${OUT}`);
  console.log(`JS errors  : ${jsErrors.length}${jsErrors.length ? "  ⚠ see report.json" : "  ✓ clean"}`);
  process.exit(jsErrors.length ? 1 : 0);
}
run().catch((e) => { console.error("DRIVER ERROR:", e); killServer(); process.exit(1); });
