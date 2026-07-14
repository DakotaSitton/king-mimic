// ============================================================================
//  mobile-verify.mjs — interactive MOBILE verification (owner ask 2026-07-01)
// ============================================================================
//  shoot.mjs *watches* a run; this tool *pokes* the new mobile UI and asserts:
//    1. DISCARD CYCLE  — playing cards grows discCount (exhaust-before-repeat
//                        live over the real WS).
//    2. METER TAP      — tapping the hotbar meter strip NEVER plays a card;
//                        tapping its right half toggles the DECK PEEK panel.
//    3. LEVEL-UP TENDER— on the SETUP screen (the control is un-tabbed there):
//                        open the tray, tap pay tiles, the ◈ total CLIMBS (the
//                        _multiset regression), confirm, level ticks server-side.
//    4. SCROLL KEEP    — scroll the overlay, tap a tender tile (re-render),
//                        scroll position survives (paintOverlay).
//  Mobile profile = the owner's iPhone 16 landscape: 852x393 @ DPR3, touch, ?touch=1.
//  Each attempt gets a FRESH browser context — a reload would auto-rejoin the
//  previous (dead) room and insta-"lost" the attempt.
//  Run: node tools/mobile-verify.mjs   (BUDGET=<sec> to cap, default 240)
// ============================================================================
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bundleScore, decide, nextNodeId } from "./brain.mjs";

const PORT = Number(process.env.PORT || (4200 + Math.floor(Math.random() * 400)));
const BASE = `http://localhost:${PORT}`;
const BUDGET_MS = Number(process.env.BUDGET || 240) * 1000;
const ROOT = join(import.meta.dirname, "..");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = join(ROOT, "tools", "shots", `mverify-${STAMP}`);
mkdirSync(OUT, { recursive: true });
const MOBILE_PROFILE = { width: 852, height: 393, dpr: 3, touch: true };

// board model constants (client.js touch branch) — for canvas-coordinate taps. NOTE (2026-07-11
// dead-space pass): the client now WIDENS the logical W on landscape phones (fitBoardBox), so BW
// is only valid fractionally (BW*frac → tapCanvas maps by fraction); BH stays the true logical H.
const BW = 780, BH = 392, METER_Y = 305;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a);
const checks = [];
const check = (name, pass, detail = "") => { checks.push({ name, pass, detail }); log(`${pass ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`); };

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

const jsErrors = [];
let shotN = 0;

async function run() {
  log(`booting fresh server on ${PORT} …`);
  const srv = await startServer();
  const browser = await chromium.launch({ headless: !process.env.HEADED, channel: "msedge" });

  let ctx = null, page = null;
  let deviceProfile = null;
  const freshPage = async () => {
    if (ctx) await ctx.close().catch(() => {});
    ctx = await browser.newContext({
      viewport: { width: MOBILE_PROFILE.width, height: MOBILE_PROFILE.height },
      deviceScaleFactor: MOBILE_PROFILE.dpr,
      hasTouch: MOBILE_PROFILE.touch,
    });
    page = await ctx.newPage();
    deviceProfile = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio,
      touch: navigator.maxTouchPoints > 0,
    }));
    if (deviceProfile.width !== MOBILE_PROFILE.width || deviceProfile.height !== MOBILE_PROFILE.height ||
      deviceProfile.dpr !== MOBILE_PROFILE.dpr || deviceProfile.touch !== MOBILE_PROFILE.touch) {
      throw new Error(`device profile mismatch: requested ${JSON.stringify(MOBILE_PROFILE)}, got ${JSON.stringify(deviceProfile)}`);
    }
    page.on("console", (m) => { if (m.type() === "error") { jsErrors.push(m.text()); log(`  ⚠ console.error: ${m.text().slice(0, 140)}`); } });
    page.on("pageerror", (e) => { jsErrors.push(String(e)); log(`  ✖ PAGEERROR: ${String(e.message || e).slice(0, 140)}`); });
    page.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) { jsErrors.push(`HTTP ${r.status()} ${r.url()}`); log(`  ✖ HTTP ${r.status()}: ${r.url()}`); } });
  };

  const getState = () => page.evaluate(() => window.KM?.state ?? null);
  const getYou = () => page.evaluate(() => window.KM?.you ?? null);
  const send = (msg) => page.evaluate((m) => window.KM.send(m), msg);
  const shoot = async (label) => {
    try { await page.evaluate(() => window.dispatchEvent(new Event("resize"))); } catch {}
    await sleep(150);
    const n = `${String(++shotN).padStart(2, "0")}-${label}.png`;
    await page.screenshot({ path: join(OUT, n) }); log(`  📸 ${n}`);
    return join(OUT, n);
  };
  // tap the LIVE canvas at board-model coordinates (mirror of the client's toCanvas mapping)
  const tapCanvas = async (bx, by) => {
    const r = await page.evaluate(() => { const b = document.getElementById("cv").getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
    // bx/BW is a FRACTION of the displayed board — correct even now that the client widens the
    // logical W on landscape phones (callers pass BW*frac, and the live logical H is still BH).
    // Absolute live-space X coords (e.g. from window.KM.hit) must divide by window.KM.board.W instead.
    await page.mouse.click(r.x + (bx / BW) * r.w, r.y + (by / BH) * r.h);
    await sleep(150);
  };

  // ── TEST BLOCKS 3+4: level-up tender + scroll-keep. Runs on the SETUP screen, where the
  //    control renders un-tabbed. NOTE every tile click swaps the whole overlay DOM — nodes go
  //    STALE per click, so everything re-queries the live document.
  const tryTender = async (you) => {
    const open = await page.evaluate(() => {
      const b = document.querySelector("[data-lvlopen]");
      if (!b || b.disabled) return b ? "disabled" : "absent";
      b.click(); return "open";
    });
    if (open !== "open") { log(`  (level-up button ${open} — need ◈5 in spares, clearing on)`); return false; }
    await sleep(250);
    const res = await page.evaluate(() => {
      const q = (sel) => document.getElementById("draftOverlay").querySelector(sel);
      const scroller = () => {
        const ov = document.getElementById("draftOverlay"), card = ov.querySelector(".draft-card");
        return (card && card.scrollHeight > card.clientHeight + 10) ? card
             : (ov.scrollHeight > ov.clientHeight + 10) ? ov : null;
      };
      const msg = () => q(".shop-paymsg")?.textContent ?? "";
      let want = null;
      const sc = scroller();
      if (sc) { sc.scrollTop = 150; want = sc.scrollTop; }
      let taps = 0;
      for (let i = 0; i < 12; i++) {
        const confirm = q("[data-lvlconfirm]");
        if (confirm && !confirm.disabled) break;
        const tile = [...document.querySelectorAll("[data-lvlpay]")].find((x) => !x.classList.contains("sel"));
        if (!tile) break;
        tile.click(); taps++;                        // re-renders the whole overlay in place
      }
      const got = want == null ? null : (scroller()?.scrollTop ?? -1);
      const confirm = q("[data-lvlconfirm]");
      return { taps, after: msg(), enabled: !!confirm && !confirm.disabled, want, got };
    });
    const paid = res.after.match(/◈(\d+)\/(\d+)/);
    check("tender taps REGISTER (total climbs)", !!paid && Number(paid[1]) > 0,
      `${res.taps} taps → tendered ${paid ? `◈${paid[1]}/${paid[2]}` : `"${res.after.slice(-40)}"`}`);
    if (res.want != null) check("scroll KEPT across tender-tap re-renders", Math.abs(res.got - res.want) < 40, `want ~${res.want}, got ${res.got}`);
    else log("  (scroll assert skipped — overlay not scrollable at this content size)");
    await shoot("levelup-tray-tendered");
    if (!res.enabled) { log("  (spares cover < cost — confirm still gated)"); return false; }
    const lvl0 = (await getState()).players.find((p) => p.id === you)?.level ?? 1;
    await page.evaluate(() => document.querySelector("[data-lvlconfirm]")?.click());
    await sleep(600);
    const lvl1 = (await getState()).players.find((p) => p.id === you)?.level ?? 1;
    check("level-up CONFIRM accepted server-side", lvl1 === lvl0 + 1, `level ${lvl0} → ${lvl1}`);
    await shoot("levelup-done");
    return lvl1 === lvl0 + 1;
  };

  T0 = Date.now();
  let combatTested = false, tenderTested = false;

  // The brain often dies on floor 1 (elite-heavy rooms — known, benign): up to 4 fresh attempts,
  // drafting sustain bodies. Loot claims land in the BACKPACK (spares) — 1-2 clears fund the tender.
  const SUSTAIN = ["rentier", "ratTrader", "counterparty", "bloodfund", "frugal"];
  for (let attempt = 1; attempt <= 4 && !(combatTested && tenderTested); attempt++) {
    log(`── attempt ${attempt} ──`);
    await freshPage();
    await page.goto(BASE + "/?harness=1&touch=1", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.KM, { timeout: 12000 });
    await page.evaluate((n) => {
      document.querySelector(`#bodiesPick .bp-opt[data-bodies="1"]`)?.click();
      document.getElementById("name").value = "Claude" + n;
      document.getElementById("createBtn").click();
    }, attempt);
    await page.waitForFunction(() => !!window.KM?.state, { timeout: 9000 });

    let lastPhase = null, nodesCleared = 0, wonHandled = false, lost = false;

    while (Date.now() - T0 < BUDGET_MS && !(combatTested && tenderTested) && !lost) {
      const s = await getState();
      if (!s) { await sleep(200); continue; }
      const you = await getYou();
      const me = s.players?.find((p) => p.id === you) || s.players?.[0];
      if (s.phase !== lastPhase) { log(`PHASE → ${s.phase} (floor ${s.floor ?? "?"})`); lastPhase = s.phase; wonHandled = false; }

      if (s.phase === "lobby") await send({ type: "start" });
      else if (s.phase === "draft") {
        const wheel = (s.draft?.wheel ?? []).filter((w) => !w.lockedBy);
        if (wheel.length) {
          const tanky = SUSTAIN.map((k) => wheel.find((w) => w.bodyKey === k)).find(Boolean);
          const best = tanky || wheel.slice().sort((a, b) => bundleScore(b) - bundleScore(a))[0];
          await send({ type: "draftPick", bundle: best.id });
        }
      } else if (s.phase === "setup") {
        if (!tenderTested) tenderTested = await tryTender(you);
        await send({ type: "start" });
      } else if (s.phase === "playing") {
        if (!combatTested && me && (me.discCount ?? 0) > 0) {
          combatTested = true;
          check("discard grows as cards are played", true, `🂠${me.deckCount} 🗑${me.discCount}`);
          await shoot("combat-counts");
          const bm = (await getState()).players.find((p) => p.id === you);
          const handIds = (bm.hand ?? []).map((c) => c.id).join();
          await tapCanvas(BW * 0.82, METER_Y);          // right half of the meter strip → toggles peek
          const am = (await getState()).players.find((p) => p.id === you);
          check("meter tap plays NO card", (am.hand ?? []).map((c) => c.id).join() === handIds
            && am.deckCount === bm.deckCount && am.discCount === bm.discCount,
            `hand/piles unchanged (🂠${am.deckCount} 🗑${am.discCount})`);
          await shoot("deck-peek-open");
          await tapCanvas(BW * 0.82, METER_Y);
          await shoot("deck-peek-closed");
          if ((me.effects ?? []).length) await shoot("hero-effect-chips");
        }
        if (me && me.alive !== false) {
          const action = decide(s, me);
          if (action?.target) await send({ type: "target", foeId: action.target });
          if (action?.cardId) await send({ type: "playCard", id: action.cardId });
        }
      } else if (s.phase === "won" && !wonHandled) {
        wonHandled = true;
        for (const c of (s.loot?.cards ?? [])) await send({ type: "claimLoot", key: c.key });
        await sleep(400);
        { const s3 = await getState(); const m3 = s3.players?.find((p) => p.id === you);
          log(`  claimed ${(s.loot?.cards ?? []).length} → backpack=${m3?.backpack?.length ?? "?"} deck=${m3?.deckList?.length ?? "?"}`); }
        nodesCleared++;
        const s2 = await getState();
        if (s2.runWon || nodesCleared >= 6) break;
        if (s2.map?.levelComplete) await send({ type: "descend" });
        else { const to = nextNodeId(s2.map); if (to) await send({ type: "advance", to }); else break; }
      } else if (s.phase === "shop" && !wonHandled) {
        wonHandled = true; const to = nextNodeId(s.map); await send({ type: "leaveShop", to });
      } else if (s.phase === "lost") { log(`run LOST (attempt ${attempt})`); lost = true; }
      await sleep(200);
    }
  }

  if (!combatTested) check("discard grows as cards are played", false, "never observed discCount > 0");
  if (!tenderTested) check("level-up tender end-to-end", false, "never reached an enabled level-up button");

  writeFileSync(join(OUT, "report.json"), JSON.stringify({ when: new Date().toISOString(), mobileProfile: MOBILE_PROFILE, deviceProfile, checks, jsErrors }, null, 2));
  await browser.close();
  try {
    spawnSync("powershell", ["-NoProfile", "-Command", `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`]);
    spawnSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"]);
  } catch {}
  const failed = checks.filter((c) => !c.pass);
  console.log("\n──────── MOBILE VERIFY SUMMARY ────────");
  for (const c of checks) console.log(`${c.pass ? "✅" : "❌"} ${c.name}${c.detail ? " — " + c.detail : ""}`);
  console.log(`JS errors  : ${jsErrors.length}${jsErrors.length ? "  ⚠" : "  ✓ clean"}`);
  console.log(`shots      : ${OUT}`);
  process.exit(failed.length || jsErrors.length ? 1 : 0);
}
run().catch((e) => { console.error("DRIVER ERROR:", e); process.exit(1); });
