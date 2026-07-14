// ============================================================================
//  loop-to-win.mjs — headless loop-to-boss-victory harness (tools/* only)
// ============================================================================
//  Runs the autopilot across many attempts until at least one floor-1 boss
//  victory (bossClears >= 1) is recorded, then stops and reports.
//
//  Usage:
//    node tools/loop-to-win.mjs              # default: up to 30 attempts, 90s each
//    ATTEMPTS=5 node tools/loop-to-win.mjs   # fewer attempts (e.g. for a quick check)
//    BUDGET=120 node tools/loop-to-win.mjs   # longer budget per attempt (seconds)
//    HEADED=1   node tools/loop-to-win.mjs   # watch attempt 1 in a visible window
//
//  Output: per-attempt one-liner + final summary + loop-report.json (repo root)
//          + optional proof screenshot in tools/shots/ on a boss win.
// ============================================================================
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { bundleScore, decide, nextNodeId } from "./brain.mjs";

const ROOT          = join(import.meta.dirname, "..");
const MAX_ATTEMPTS  = Number(process.env.ATTEMPTS || 30);
const BUDGET_MS     = Number(process.env.BUDGET   || 90) * 1000;
const BASE_PORT     = 3700;
const HEADED        = !!process.env.HEADED;
const SHOTS_DIR     = join(ROOT, "tools", "shots");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Server lifecycle (mirrors shoot.mjs) ─────────────────────────────────────────────────────
function killServer(srv, port) {
  try {
    if (process.platform === "win32") {
      spawnSync("powershell", ["-NoProfile", "-Command",
        `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue ` +
        `| Select-Object -Expand OwningProcess -Unique ` +
        `| ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`,
      ]);
      spawnSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"]);
    } else {
      srv.kill("SIGKILL");
    }
  } catch {}
}

function startServer(port) {
  const BASE = `http://localhost:${port}`;
  return new Promise((resolve, reject) => {
    const srv = spawn("bun", ["run", "server.js"], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(port) },
      shell: true,
    });
    let out = "";
    srv.stdout.on("data", (d) => (out += d));
    srv.stderr.on("data", (d) => (out += d));
    srv.on("exit", (code) => {
      if (!srv._ready) reject(new Error(`server exited early (${code}): ${out.slice(0, 120)}`));
    });
    (async () => {
      for (let i = 0; i < 80; i++) {
        try {
          const r = await fetch(BASE + "/", { signal: AbortSignal.timeout(1000) });
          if (r.ok) { srv._ready = true; return resolve(srv); }
        } catch {}
        await sleep(250);
      }
      reject(new Error(`server never reachable on ${BASE}\n${out.slice(0, 200)}`));
    })();
  });
}

// ── Single attempt ────────────────────────────────────────────────────────────────────────────
async function runAttempt(attemptNum) {
  const port = BASE_PORT + attemptNum * 3;   // unique port per attempt; avoids TIME_WAIT collisions
  const BASE = `http://localhost:${port}`;
  const T0   = Date.now();
  const log  = (...a) => console.log(`  [A${String(attemptNum).padStart(2,"0")}][${((Date.now()-T0)/1000).toFixed(1)}s]`, ...a);

  const result = { attempt: attemptNum, port, bossClears: 0, floor: null, finalPhase: null, jsErrors: 0, error: null, proofShot: null };

  // Boot server
  let srv;
  for (let i = 1; i <= 3; i++) {
    try { srv = await startServer(port); break; }
    catch (e) { log(`server boot fail (try ${i}): ${String(e).slice(0, 80)}`); await sleep(1000); }
  }
  if (!srv) { result.error = "server-boot-failed"; return result; }

  const browser = await chromium.launch({ headless: !HEADED, channel: "msedge" });
  const ctx     = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true });
  const page    = await ctx.newPage();

  // Capture JS errors (not per-tick console.log — we only care about actual errors)
  const jsErrList = [];
  page.on("pageerror", (e) => jsErrList.push(String(e.message || e).slice(0, 120)));

  const getState = () => page.evaluate(() => window.KM?.state ?? null);
  const getYou   = () => page.evaluate(() => window.KM?.you ?? null);
  const send     = (msg) => page.evaluate((m) => window.KM.send(m), msg);

  try {
    await page.goto(BASE + "/?harness=1&touch=1", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.KM, { timeout: 12000 });

    // Create a solo run (mirrors shoot.mjs lobby interaction)
    await page.evaluate(() => {
      document.querySelector('#bodiesPick .bp-opt[data-bodies="1"]')?.click();
      document.getElementById("name").value = "Loop";
      document.getElementById("createBtn").click();
    });
    await page.waitForFunction(() => !!window.KM?.state, { timeout: 9000 }).catch(() => {});

    let nodesCleared = 0, lastPhase = null, wonHandled = false, done = false;
    let sawBoss = false, stockTries = 0, stuckSince = Date.now();

    while (Date.now() - T0 < BUDGET_MS) {
      const s = await getState();
      if (!s) { await sleep(150); continue; }
      const phase = s.phase;
      const you   = await getYou();
      const me    = s.players?.find((p) => p.id === you && !p.bot)
                 || s.players?.find((p) => !p.bot)
                 || s.players?.[0];

      // Phase change: reset guards
      if (phase !== lastPhase) {
        log(`PHASE -> ${phase} (floor ${s.floor ?? "?"}${s.map?.bossName ? ", boss: " + s.map.bossName : ""})`);
        lastPhase = phase; stuckSince = Date.now(); stockTries = 0; wonHandled = false;
      }
      // Detect boss appearance
      if (s.boss && s.boss.hp > 0 && !sawBoss) {
        sawBoss = true;
        log(`BOSS: ${s.boss.name} (${s.boss.hp}/${s.boss.maxHp})`);
      }

      // ── Phase handlers ──────────────────────────────────────────────────────
      if (phase === "lobby") {
        await send({ type: "start" });

      } else if (phase === "draft") {
        const wheel = (s.draft?.wheel ?? []).filter((w) => !w.lockedBy && (w.offeredTo == null || w.offeredTo === you));
        if (wheel.length) {
          const best = wheel.slice().sort((a, b) => bundleScore(b) - bundleScore(a))[0];
          await send({ type: "draftPick", bundle: best.id });
        } else if (s.draft?.classes?.[0]) {
          await send({ type: "chooseClass", key: s.draft.classes[0].key });
        }

      } else if (phase === "stock") {
        const st = s.stock;
        if (st?.canBegin) {
          await send({ type: "stockBegin" });
        } else if (stockTries < (st?.max ?? 12) && st?.palette?.length) {
          // Pick the lowest-ante (cheapest to stock) foe so we pass the ante gate quickly
          let b = 0;
          st.palette.forEach((o, i) => {
            const cur = st.palette[b];
            if ((o.ante ?? 99) < (cur.ante ?? 99) ||
                ((o.ante ?? 99) === (cur.ante ?? 99) && (o.maxHp ?? 99) < (cur.maxHp ?? 99))) b = i;
          });
          await send({ type: "stockAdd", idx: b });
          stockTries++;
        } else {
          result.error = "stock-ante-gate";
          done = true;
        }

      } else if (phase === "setup") {
        await send({ type: "start" });

      } else if (phase === "playing") {
        if (me && me.alive !== false) {
          const action = decide(s, me);
          if (action?.target) await send({ type: "target", foeId: action.target });
          if (action?.cardId) await send({ type: "playCard", id: action.cardId });
        }

      } else if (phase === "won" && !wonHandled) {
        wonHandled = true;
        const wasBoss = sawBoss;
        // Claim all loot cards
        for (const c of (s.loot?.cards ?? [])) await send({ type: "claimLoot", key: c.key });
        nodesCleared++;
        sawBoss = false;

        if (wasBoss) {
          result.bossClears++;
          log(`BOSS CLEARED! bossClears=${result.bossClears} floor=${s.floor}`);
          // Proof screenshot on first boss clear
          try {
            mkdirSync(SHOTS_DIR, { recursive: true });
            const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            const proofPath = join(SHOTS_DIR, `loop-win-A${attemptNum}-${stamp}.png`);
            await page.screenshot({ path: proofPath });
            result.proofShot = proofPath;
            log(`Proof screenshot: ${proofPath}`);
          } catch (e) { log(`(proof screenshot failed: ${e.message})`); }
          // We have our win — stop this attempt
          done = true;
        } else if (s.runWon) {
          log("RUN WON (no boss? unusual)");
          done = true;
        } else if (s.map?.levelComplete) {
          await send({ type: "descend" });
        } else {
          const to = nextNodeId(s.map);
          if (to) await send({ type: "advance", to });
          else done = true;
        }

      } else if (phase === "shop" && !wonHandled) {
        wonHandled = true;
        const to = nextNodeId(s.map);
        await send({ type: "leaveShop", to });

      } else if (phase === "lost") {
        log("LOST");
        done = true;
      }

      if (done) break;
      // Stall guard: non-playing phases stuck >10s = something is wrong
      if (phase !== "playing" && Date.now() - stuckSince > 10000) {
        log(`STALL in '${phase}' >10s`);
        result.error = `stall:${phase}`;
        break;
      }
      await sleep(150);
    }

    if (!done && Date.now() - T0 >= BUDGET_MS) {
      log(`Budget exhausted (${BUDGET_MS / 1000}s)`);
      result.error = result.error ?? "budget-exhausted";
    }

    const fs = await getState();
    result.floor      = fs?.floor ?? null;
    result.finalPhase = fs?.phase ?? null;
    result.jsErrors   = jsErrList.length;

  } catch (e) {
    result.error    = String(e.message || e).slice(0, 120);
    result.jsErrors = jsErrList.length;
  }

  await browser.close().catch(() => {});
  killServer(srv, port);
  await sleep(600);   // brief pause so OS releases the port before we move on
  return result;
}

// ── Main loop ─────────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("════════════════════════════════════════════════════════════════════");
  console.log("  King Mimic — LOOP TO WIN  (tools/loop-to-win.mjs)");
  console.log(`  Max attempts: ${MAX_ATTEMPTS}  ·  Budget per attempt: ${BUDGET_MS / 1000}s`);
  console.log(`  Stop criterion: bossClears >= 1 in any attempt`);
  console.log("════════════════════════════════════════════════════════════════════\n");

  const results = [];
  let winner    = null;

  for (let a = 1; a <= MAX_ATTEMPTS; a++) {
    console.log(`\n[Attempt ${a}/${MAX_ATTEMPTS}]`);
    const r = await runAttempt(a);
    results.push(r);

    // One-liner result
    const line = [
      `  Attempt ${String(a).padStart(2)}: floor=${r.floor ?? "?"}`,
      `bossClears=${r.bossClears}`,
      `phase=${r.finalPhase ?? "?"}`,
      `jsErr=${r.jsErrors}`,
      r.error ? `ERR=${r.error}` : "ok",
    ].join("  ");
    console.log(line);

    if (r.bossClears >= 1) {
      winner = r;
      console.log(`\n  *** FLOOR-1 BOSS VICTORY on attempt ${a}! ***`);
      break;
    }
  }

  // Write loop-report.json
  const report = {
    when:        new Date().toISOString(),
    tool:        "tools/loop-to-win.mjs",
    maxAttempts: MAX_ATTEMPTS,
    budgetPerAttemptSec: BUDGET_MS / 1000,
    attempts:    results.length,
    victory:     !!winner,
    winAttempt:  winner ? winner.attempt : null,
    winner,
    results,
  };
  writeFileSync(join(ROOT, "loop-report.json"), JSON.stringify(report, null, 2));

  // Summary
  console.log("\n──────── LOOP-TO-WIN SUMMARY ────────");
  if (winner) {
    console.log(`VICTORY in ${winner.attempt} attempt(s)`);
    console.log(`  floor=${winner.floor}  bossClears=${winner.bossClears}  phase=${winner.finalPhase}  jsErrors=${winner.jsErrors}`);
    if (winner.proofShot) console.log(`  proof: ${winner.proofShot}`);
  } else {
    const bestBoss = Math.max(...results.map((r) => r.bossClears));
    console.log(`No floor-1 boss victory in ${results.length} attempt(s).  Best bossClears=${bestBoss}`);
    console.log("  Tune ATTEMPTS or BUDGET and rerun; the orchestrator runs the full loop post-merge.");
  }
  console.log("loop-report.json written to repo root.");
  process.exit(0);
}

main().catch((e) => { console.error("LOOP ERROR:", e); process.exit(1); });
