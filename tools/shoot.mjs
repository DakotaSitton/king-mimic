// ============================================================================
//  shoot.mjs — THE canonical King Mimic screenshot tool (owner 2026-06-27)
// ============================================================================
//  ┌──────────────────────────────────────────────────────────────────────┐
//  │  node tools/shoot.mjs        ← run this. Real SOLO run, phone-landscape │
//  └──────────────────────────────────────────────────────────────────────┘
//
//  WHY THIS FILE EXISTS: every screenshot of this game must be the REAL game.
//  This tool plays an ACTUAL run the way the owner plays — SOLO, on a phone in
//  landscape — and screenshots the live canvas at every phase. There is no
//  hand-built scene, no fixed foe roster, no injected fixture: it boots a fresh
//  server on its own port, drives the REAL client in real Edge via the client's
//  own window.KM bridge (create → draft → stock → setup → live combat →
//  won/shop/descend → … → lost/run-win), and shoots what actually renders.
//
//  It supersedes tools/playtest.mjs and tools/play-win.mjs (kept for history) by
//  merging: play-win's boss-aware solo combat/draft brain (so the run survives
//  deep enough to screenshot real content) + playtest's asset-404 / console-error
//  capture (so a missing sprite or broken request can't hide). Every frame is
//  forced to repaint after sprites settle, so loaded art is always drawn.
//
//  ⚠ The OTHER thing in tools/ — realshot.js / realsnap.js — is a HAND-BUILT
//    FIXTURE (a fabricated 3-player floor-2 scene that never happens in solo
//    play). It is NOT this. Its output is watermarked "FIXTURE — NOT A REAL
//    GAME". Use THIS file for any screenshot meant to represent the game.
//
//  Usage:
//    node tools/shoot.mjs              # SOLO, mobile (phone-landscape, touch), headless — the default
//    VP=desktop node tools/shoot.mjs   # desktop viewport instead
//    BODIES=3  node tools/shoot.mjs    # drive a Party 3 run (solo is still the default)
//    HEADED=1  node tools/shoot.mjs    # watch it play in a visible window
//    NODES=10  node tools/shoot.mjs    # stop after N cleared nodes (default 8)
//    BUDGET=200 node tools/shoot.mjs   # wall-clock seconds budget (default 240)
//    BASE=https://… NODES=2 node tools/shoot.mjs # run the same gate against a deployed build
//    CAPTURE_CAST_FX=1 node tools/shoot.mjs # add immediate shots for semantic cast-VFX events
//  Output: tools/shots/real-<vp>-<ts>/NN-<phase>-<label>.png + report.json + MANIFEST.txt
// ============================================================================
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bundleScore, decide, nextNodeId } from "./brain.mjs";

const VP = (process.env.VP || "mobile").toLowerCase();
const HEADED = !!process.env.HEADED;
const PORT = Number(process.env.PORT || (3500 + Math.floor(Math.random() * 400)));
const REMOTE_BASE = (process.env.BASE || "").trim().replace(/\/$/, "");
const BASE = REMOTE_BASE || `http://localhost:${PORT}`;
const MAX_NODES = Number(process.env.NODES || 8);
const BUDGET_MS = Number(process.env.BUDGET || 240) * 1000;
const BODIES = Number(process.env.BODIES || 1);          // 1 = SOLO, the way the owner plays
const CAPTURE_CAST_FX = process.env.CAPTURE_CAST_FX === "1";
// ── INJECTED NETWORK PAIN (perf/net 2026-07-11, tunnel-lag proof) ─────────────────────────────
//   LATENCY=<ms>  round-trip latency to inject (split half per direction)
//   JITTER=<ms>   extra random 0..JITTER/2 per direction (FIFO-preserving — never reorders)
//   DROP=<n>      hard-drop every nth INCOMING ws message (forces real seq gaps so the delta
//                 protocol's keyframe recovery is exercised, not just claimed)
// The pain is a WebSocket shim installed BEFORE the client loads: Chromium's CDP network
// throttling does NOT apply to WebSocket frames after the upgrade (long-standing limitation),
// so the shim is what actually stresses the input path. CDP emulateNetworkConditions is ALSO
// applied so HTTP assets feel the same latency. All knobs inert when unset — byte-identical run.
const LATENCY = Number(process.env.LATENCY || 0);
const JITTER = Number(process.env.JITTER || 0);
const DROP = Number(process.env.DROP || 0);
const ROOT = join(import.meta.dirname, "..");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = join(ROOT, "tools", "shots", `real-${VP}-${STAMP}`);
mkdirSync(OUT, { recursive: true });

// iPhone 16 landscape (852x393 CSS px) @ DPR3 with touch = the owner's real device profile (the default);
// desktop is the secondary viewport. Both pass ?touch=1 to engage the touch HUD on mobile.
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

// Brain (CARD table, bundleScore, decide, nextNodeId) are imported from brain.mjs above.

// ── boot a fresh server on a private port (always the CURRENT code) ───────────────────────────
function startServer() {
  return new Promise((resolve, reject) => {
    const srv = spawn("bun", ["run", "server.js"], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, shell: true });
    let out = ""; srv.stdout.on("data", (d) => (out += d)); srv.stderr.on("data", (d) => (out += d));
    srv.on("exit", (code) => { if (!srv._ready) reject(new Error(`server exited early (${code}):\n${out}`)); });
    (async () => {
      for (let i = 0; i < 80; i++) {
        try { const r = await fetch(BASE + "/", { signal: AbortSignal.timeout(1000) }); if (r.ok) { srv._ready = true; return resolve(srv); } } catch {}
        await sleep(250);
      }
      reject(new Error("server never reachable on " + BASE + "\n" + out));
    })();
  });
}

const jsErrors = [], shots = [], phaseLog = [];
let shotN = 0;

async function run() {
  console.log("════════════════════════════════════════════════════════════════════");
  console.log("  King Mimic — REAL PLAYTHROUGH screenshot tool (tools/shoot.mjs)");
  console.log(`  mode: ${BODIES === 1 ? "SOLO" : "PARTY " + BODIES} · viewport: ${VP} ${V.viewport.width}x${V.viewport.height}@${V.deviceScaleFactor}${V.hasTouch ? " touch" : ""}`);
  console.log("  These shots ARE the game — a real run, real client, live canvas.");
  console.log("════════════════════════════════════════════════════════════════════");
  log(REMOTE_BASE ? `using deployed server ${BASE} …` : `booting fresh server on ${PORT} …`);
  let srv;
  if (!REMOTE_BASE) {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try { srv = await startServer(); break; }
      catch (e) { log(`  server boot failed (try ${attempt}): ${String(e).slice(0, 120)}`); await sleep(1500); }
    }
    if (!srv) throw new Error("server would not boot after retries");
  } else {
    const health = await fetch(BASE + "/health", { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error(`deployed server health failed: ${health.status}`);
  }
  log("server up. launching Edge (" + VP + (HEADED ? ", headed" : ", headless") + ") …");
  const browser = await chromium.launch({ headless: !HEADED, channel: "msedge" });
  const ctx = await browser.newContext({ viewport: V.viewport, deviceScaleFactor: V.deviceScaleFactor, hasTouch: V.hasTouch });
  const page = await ctx.newPage();
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

  if (LATENCY > 0 || DROP > 0) {
    log(`⚠ injected network pain: RTT ${LATENCY}ms · jitter 0-${JITTER}ms · drop ${DROP ? "1/" + DROP : "off"} (ws shim + CDP)`);
    await ctx.addInitScript(([lat, jit, drop]) => {
      const Real = window.WebSocket;
      const oneWay = () => lat / 2 + Math.random() * (jit / 2);
      window.WebSocket = class extends Real {
        constructor(...a) { super(...a); this._inAt = 0; this._outAt = 0; this._inN = 0; }
        send(data) {   // delayed FIFO — a later message can never overtake an earlier one
          const now = performance.now();
          this._outAt = Math.max(this._outAt, now + oneWay());
          setTimeout(() => { try { Real.prototype.send.call(this, data); } catch {} }, this._outAt - now);
        }
        set onmessage(fn) {
          super.onmessage = fn == null ? fn : (ev) => {
            if (drop > 0 && ++this._inN % drop === 0) return;   // forced gap → keyframe recovery must kick in
            const now = performance.now();
            this._inAt = Math.max(this._inAt, now + oneWay());
            setTimeout(() => fn(ev), this._inAt - now);
          };
        }
        get onmessage() { return super.onmessage; }
      };
    }, [LATENCY, JITTER, DROP]);
    if (LATENCY > 0) {   // HTTP-side latency too (does not touch ws frames — that's the shim's job)
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: LATENCY / 2, downloadThroughput: -1, uploadThroughput: -1 });
    }
  }

  // Real client bugs we must never let hide: console errors, uncaught pageerrors, and — the sneaky
  // one — any HTTP >=400 (a 404 on a foe sprite means art falls back to emoji "tofu" in-game).
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

  const getState = () => page.evaluate(() => window.KM?.state ?? null);
  const getYou = () => page.evaluate(() => window.KM?.you ?? null);
  const send = (msg) => page.evaluate((m) => window.KM.send(m), msg);
  // Force a clean repaint with whatever sprites have loaded, THEN shoot — so a freshly-requested
  // async foe sprite (new Image(), no onload repaint) is actually drawn instead of its emoji
  // fallback. Combat repaints constantly on ticks; this matters for the static phase-enter frames.
  async function shoot(phase, label) {
    try { await page.evaluate(() => window.dispatchEvent(new Event("resize"))); } catch {}
    await sleep(140);   // > the 80ms resize debounce → a render() with loaded art
    const n = `${String(++shotN).padStart(2, "0")}-${phase}-${label}.png`;
    await page.screenshot({ path: join(OUT, n) }); shots.push(n); log(`  📸 ${n}`);
  }

  await page.goto(BASE + "/?harness=1" + (V.touchParam ? "&touch=1" : ""), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.KM, { timeout: 12000 });

  T0 = Date.now();
  // Drive the REAL lobby exactly like a player: set body count + name, click Create. No room code →
  // a NORMAL run (no god mode). This is the honest path: whatever the engine deals, we screenshot.
  await page.evaluate(({ bodies }) => {
    document.querySelector(`#bodiesPick .bp-opt[data-bodies="${bodies}"]`)?.click();
    document.getElementById("name").value = "Claude";
    document.getElementById("createBtn").click();
  }, { bodies: BODIES });
  await page.waitForFunction(() => !!window.KM?.state, { timeout: 9000 }).catch(() => log("  ✖ no state after create — WS may not have connected"));

  let nodesCleared = 0, lastPhase = null, combatShotAt = 0, stockTries = 0, stuckSince = Date.now();
  let wonHandled = false, done = false, draftLogged = false, partyEquipmentChecked = false, sawBoss = false, bossClears = 0;
  const renderChecks = {};
  const seenCastFx = new Set(), capturedCastKinds = new Set();
  const manualSet = new Set();
  const mine = (s, you) => (s.players ?? []).filter((p) => (p.owner ?? p.id) === you);
  const possess = async (id) => { await send({ type: "possess", id }); if (!manualSet.has(id)) { await send({ type: "autoFire", on: false }); manualSet.add(id); } };
  // nextNodeId imported from brain.mjs: skips locked/unaffordable elite nodes, prefers safe non-elite path
  const dumpState = (s, tag) => { try { writeFileSync(join(OUT, `state-${tag}.json`), JSON.stringify(s, null, 2)); } catch {} };

  while (Date.now() - T0 < BUDGET_MS) {
    const s = await getState();
    if (!s) { await sleep(200); continue; }
    const phase = s.phase;
    const you = await getYou();
    const me = s.players?.find((p) => p.id === you && !p.bot) || s.players?.find((p) => !p.bot) || s.players?.[0];

    // Optional proof mode: capture the live canvas as soon as a NEW semantic cast event reaches the
    // real client. No card-name/prose matching; the engine-authored event kind is the data seam.
    if (CAPTURE_CAST_FX) for (const fx of s.castFx ?? []) {
      if (seenCastFx.has(fx.id)) continue;
      seenCastFx.add(fx.id);
      if (capturedCastKinds.has(fx.kind)) continue;
      capturedCastKinds.add(fx.kind);
      const n = `${String(++shotN).padStart(2, "0")}-playing-vfx-${String(fx.kind).replace(/[^\w-]+/g, "-")}.png`;
      await page.screenshot({ path: join(OUT, n) }); shots.push(n); log(`  📸 ${n} (cast event ${fx.id})`);
    }

    if (phase !== lastPhase) {
      log(`PHASE → ${phase} (floor ${s.floor ?? "?"}${s.map?.bossName ? ", boss: " + s.map.bossName : ""}, ${s.players?.length ?? 0}p)`);
      phaseLog.push({ phase, floor: s.floor, t: ((Date.now() - T0) / 1000).toFixed(1) });
      await shoot(phase, "enter"); lastPhase = phase; stuckSince = Date.now(); stockTries = 0; wonHandled = false;
      if ((phase === "setup" || phase === "playing") && !renderChecks[phase]) {
        const proof = await page.evaluate(() => ({
          renderErrors: window.KM?.renderErrorCount ?? 0,
          heroes: window.KM?.hit?.heroes?.length ?? 0,
          foes: window.KM?.hit?.foes?.length ?? 0,
          board: window.KM?.board ?? null,
          lastRenderError: window.KM?.lastRenderError ?? null,
        }));
        renderChecks[phase] = proof;
        if (proof.renderErrors || proof.heroes < 1 || proof.foes < 1 || !proof.board?.W || !proof.board?.H) {
          jsErrors.push({ kind: "RENDER_HEALTH", t: ((Date.now() - T0) / 1000).toFixed(1),
            text: `${phase} render unhealthy: ${JSON.stringify(proof)}` });
          dumpState(s, `render-${phase}`);
          break;
        }
      }
    }
    if (s.boss && s.boss.hp > 0 && !sawBoss) { sawBoss = true; log(`  ⚔ BOSS: ${s.boss.name} (${s.boss.hp}/${s.boss.maxHp})`); await shoot("playing", "boss-engage"); }

    if (phase === "lobby") {
      await send({ type: "start" });
    } else if (phase === "draft") {
      const picks = s.draft?.picks ?? [];
      const myIds = mine(s, you).map((p) => p.id);
      const undrafted = picks.find((pk) => myIds.includes(pk.id) && !pk.drafted);
      const draftId = undrafted?.id ?? you;
      const wheel = (s.draft?.wheel ?? []).filter((w) => !w.lockedBy && (w.offeredTo == null || w.offeredTo === draftId));
      if (!draftLogged) { draftLogged = true; log("  WHEEL: " + JSON.stringify((s.draft?.wheel ?? []).map((w) => ({ b: w.bodyKey, hp: w.maxHp })))); }
      if (wheel.length) {
        // FORCEBODY (opt-in, still REAL gameplay): bias the draft to a body when it's offered — accepts
        // a PRIORITY LIST, so FORCEBODY=leverage,hedge,frugal drafts whichever rat-summoner the random
        // wheel surfaced (the run then grows a real player-sized rat-stack to screenshot).
        const want = (process.env.FORCEBODY || "").split(",").map((s) => s.trim()).filter(Boolean);
        const forced = want.map((k) => wheel.find((w) => w.bodyKey === k)).find(Boolean);
        const best = forced || wheel.slice().sort((a, b) => bundleScore(b) - bundleScore(a))[0];
        if (BODIES > 1) {
          if (undrafted) { await possess(undrafted.id); log(`  party draft [${undrafted.name}] → ${best.bodyKey} (hp ${best.maxHp})`); await send({ type: "draftPick", bundle: best.id }); }
        } else { log(`  draft → ${best.bodyKey} (hp ${best.maxHp}, score ${bundleScore(best).toFixed(1)})`); await send({ type: "draftPick", bundle: best.id }); }
      } else if (s.draft?.classes?.[0]) await send({ type: "chooseClass", key: s.draft.classes[0].key });
    } else if (phase === "stock") {
      const st = s.stock;
      if (st?.canBegin) await send({ type: "stockBegin" });
      else if (stockTries < (st?.max ?? 12) && st?.palette?.length) {
        // FORCEFOE (opt-in, still REAL gameplay): stock a specific foe when offered — e.g. FORCEFOE=frugal
        // stocks a Fat Cat that summons rats (they MERGE into one "N rats" foe stack to screenshot).
        const foeWant = (process.env.FORCEFOE || "").split(",").map((s) => s.trim()).filter(Boolean);
        let b = foeWant.map((k) => st.palette.findIndex((o) => o.bodyKey === k)).find((ix) => ix >= 0) ?? -1;
        if (b < 0) { b = 0; st.palette.forEach((o, i) => {
          const cur = st.palette[b];
          if ((o.ante ?? 99) < (cur.ante ?? 99) || ((o.ante ?? 99) === (cur.ante ?? 99) && (o.maxHp ?? 99) < (cur.maxHp ?? 99))) b = i;
        }); }
        await send({ type: "stockAdd", idx: b }); stockTries++;
      } else { jsErrors.push({ kind: "STALL", t: ((Date.now() - T0) / 1000).toFixed(1), text: "stock ante gate unreachable" }); break; }
    } else if (phase === "setup") {
      if (BODIES > 1 && !partyEquipmentChecked) {
        partyEquipmentChecked = true;
        await page.locator("[data-partypanel]").click();
        await sleep(180);
        const partyEquipment = await page.evaluate(() => ({
          bodies: document.querySelectorAll(".party-loadout-body").length,
          cards: document.querySelectorAll("[data-partycard-body]").length,
          moveButtons: document.querySelectorAll("[data-partydest]").length,
        }));
        renderChecks.partyEquipment = partyEquipment;
        if (partyEquipment.bodies !== BODIES || partyEquipment.cards < BODIES * 3
          || partyEquipment.moveButtons !== BODIES) {
          jsErrors.push({ kind: "PARTY_EQUIPMENT", t: ((Date.now() - T0) / 1000).toFixed(1),
            text: `party equipment unhealthy: ${JSON.stringify(partyEquipment)}` });
          break;
        }
        await page.locator(".party-loadout-grid").scrollIntoViewIfNeeded();
        await sleep(120);
        await shoot("setup", "party-equipment");
      }
      await send({ type: "start" });
    } else if (phase === "playing") {
      if (BODIES > 1) {
        for (const body of mine(s, you)) {
          if (body.alive === false) continue;
          await possess(body.id);
          const action = decide(s, body);
          if (action?.target) await send({ type: "target", foeId: action.target });
          if (action?.cardId) await send({ type: "playCard", id: action.cardId });
        }
      } else if (me && me.alive !== false) {
        const action = decide(s, me);
        if (action?.target) await send({ type: "target", foeId: action.target });
        if (action?.cardId) await send({ type: "playCard", id: action.cardId });
      }
      if (Date.now() - combatShotAt > 1400) { combatShotAt = Date.now(); await shoot("playing", "tick"); }
    } else if (phase === "won" && !wonHandled) {
      wonHandled = true;
      const wasBoss = sawBoss;
      for (const c of (s.loot?.cards ?? [])) await send({ type: "claimLoot", key: c.key });
      nodesCleared++;
      if (wasBoss) { bossClears++; await shoot("won", `BOSS-CLEARED-${bossClears}`); log(`  🏆 BOSS CLEARED (#${bossClears})`); }
      else await shoot("won", `cleared-${nodesCleared}`);
      sawBoss = false;
      if (s.runWon) { await shoot("won", "RUN-COMPLETE"); log("RUN COMPLETE 👑"); done = true; }
      else if (nodesCleared >= MAX_NODES) { log(`cleared ${nodesCleared} nodes — stopping`); done = true; }
      else if (s.map?.levelComplete) { log("  floor cleared → descend"); await send({ type: "descend" }); }
      else { const to = nextNodeId(s.map); if (to) { log(`  advance → ${to}`); await send({ type: "advance", to }); } else done = true; }
    } else if (phase === "shop" && !wonHandled) {
      wonHandled = true; const to = nextNodeId(s.map); await send({ type: "leaveShop", to });
    } else if (phase === "lost") {
      dumpState(s, "death");
      await shoot("lost", "death");
      log("CARAVAN FELL — run over.");
      done = true;
    }

    if (done) break;
    if (phase !== "playing" && Date.now() - stuckSince > 14000) { jsErrors.push({ kind: "STALL", t: ((Date.now() - T0) / 1000).toFixed(1), text: `stuck in '${phase}'>14s` }); dumpState(s, "stall"); break; }
    await sleep(200);
  }

  const fs = await getState();
  await shoot(fs?.phase ?? "end", "final").catch(() => {});

  // wire accounting (client-side counters, public/client.js): keyframe vs delta traffic + recoveries
  const net = await page.evaluate(() => window.__netStats ?? null).catch(() => null);
  const perf = await page.evaluate(() => window.__perfStats ?? null).catch(() => null);
  if (net) log(`NET: ${net.msgs} msgs · ${(net.bytes / 1024).toFixed(1)}KB total · full ${net.full}×${net.full ? Math.round(net.fullBytes / net.full) : 0}B · delta ${net.delta}×${net.delta ? Math.round(net.deltaBytes / net.delta) : 0}B · keyframeReqs ${net.keyframeReqs}`);

  const report = { when: new Date().toISOString(), tool: "tools/shoot.mjs", real: true, mode: BODIES === 1 ? "solo" : `party-${BODIES}`,
    viewport: VP, viewportSize: V.viewport, deviceProfile, dpr: V.deviceScaleFactor, touch: V.hasTouch, port: PORT,
    base: BASE, deployed: !!REMOTE_BASE, latency: LATENCY, jitter: JITTER, drop: DROP, net, perf,
    nodesCleared, bossClears, finalPhase: fs?.phase ?? null, runWon: !!fs?.runWon, floor: fs?.floor ?? null,
    phases: phaseLog, screenshots: shots, castFxCaptured: [...capturedCastKinds], renderChecks,
    jsErrorCount: jsErrors.length, jsErrors };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  // A human-readable provenance stamp dropped next to the shots — so the folder itself testifies
  // these are real, never a fixture.
  writeFileSync(join(OUT, "MANIFEST.txt"),
    `KING MIMIC — REAL PLAYTHROUGH SCREENSHOTS\n` +
    `tool       : tools/shoot.mjs (the canonical real-screenshot command)\n` +
    `when       : ${report.when}\n` +
    `mode       : ${report.mode} · viewport ${VP} ${V.viewport.width}x${V.viewport.height}@${V.deviceScaleFactor}${V.hasTouch ? " touch" : ""}\n` +
    `phases     : ${phaseLog.map((p) => p.phase).join(" → ")}\n` +
    `nodesClear : ${nodesCleared}   bossClears: ${bossClears}   final: ${report.finalPhase}   floor: ${report.floor}   runWon: ${report.runWon}\n` +
    `JS errors  : ${jsErrors.length} (console errors + pageerrors + HTTP>=400 / missing art)\n` +
    `\nThese frames are the LIVE game canvas during an actual run. They are NOT the\n` +
    `tools/realshot.js / realsnap.js FIXTURE (a fabricated 3-player scene, watermarked\n` +
    `"FIXTURE — NOT A REAL GAME"). For any screenshot that represents the game, use this.\n`);

  await browser.close();
  if (srv) try {
    if (process.platform === "win32") {
      spawnSync("powershell", ["-NoProfile", "-Command", `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`]);
      spawnSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"]);
    } else srv.kill("SIGKILL");
  } catch {}

  console.log("\n──────── REAL PLAYTHROUGH SUMMARY ────────");
  console.log(`mode       : ${report.mode}   viewport: ${VP} ${V.viewport.width}x${V.viewport.height}@${V.deviceScaleFactor}`);
  console.log(`phases     : ${phaseLog.map((p) => p.phase).join(" → ")}`);
  console.log(`nodes clr  : ${nodesCleared}   bossClears: ${bossClears}   final: ${fs?.phase}   floor: ${fs?.floor}   runWon: ${!!fs?.runWon}`);
  console.log(`screenshots: ${shots.length} → ${OUT}`);
  console.log(`JS errors  : ${jsErrors.length}${jsErrors.length ? "  ⚠ see report.json" : "  ✓ clean (no errors, no 404s, no missing art)"}`);
  process.exit(jsErrors.length ? 1 : 0);
}
run().catch((e) => { console.error("DRIVER ERROR:", e); process.exit(1); });
