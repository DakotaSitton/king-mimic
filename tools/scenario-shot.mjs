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
//    "minFoeRowH": N        fail any playing-frame proof whose real foe row is shorter than N
//    "script": [ ... ]      a minimal ACTION SCRIPT, run in order:
//        {"wait": seconds}        let the real game tick
//        {"play": k}              play hand slot k via the client's own key binding
//                                 (Digit1-9 → playHandSlot: affordability + pick-popover included)
//        {"play": "cardKey"}      same verb by KEY — resolves the card's CURRENT slot first
//                                 (a prior play reorders the hand, so an index can go stale)
//        {"tapFoe": i}            tap the i-th live foe hit-box on the canvas (targets it)
//        {"touchStartFoe": i}     put a real touch down on foe i (pair with touchEndFoe)
//        {"touchEndFoe": true}    release a foe hold after its inspector has opened
//        {"tapAlly": i}           tap the i-th hero/ally hit-box (heal-aim / possess)
//        {"tapHand": i}           quick-tap hand slot i; asserts no inspector is left open
//        {"touchStartHand": i}    put a real touch down on hand slot i (pair with touchEndHand)
//        {"touchEndHand": true}   release it; asserts the hold did not cast/move a card
//        {"tapDeckPanel": true}   open/close the real DECK & BACKPACK disclosure
//        {"tapMelt": true}        arm the real two-step melt-excess-cards confirmation
//        {"partyDeckSwap": {player,out,in}} replace one party body's deck card from its own stash
//        {"clickNewRun": true}    click the completed-run NEW RUN control and require draft
//        {"expectHandInspect": i|null} assert the semantic hold-only inspector state
//        {"tapBody": bodyKey}     tap a body in the open WEAR menu
//        {"expectPickKind": kind|null} assert the live pick modal kind (e.g. meleeRanged)
//        {"pickOption": key}      tap a choice in that pick modal (e.g. ranged)
//        {"cancelPick": true}     cancel the pick modal without committing its parent action
//        {"expectBody": bodyKey}  assert the piloted body's worn body
//        {"expectLevelPick": key} assert its run-level combat allocation
//        {"expectCastFx": [kinds]} assert every client received the named active cast effects
//        {"expectActiveCastFx": []} assert every client's transient cast layer has cleared
//        {"expectCardFxCleared": key} assert one card's transient effects cleared on every client
//        {"shot": "name"}         take a named screenshot
//        {"shotNow": "name"}      take one immediately (for sub-second transient effects)
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
const HUMAN_PLAYERS = Math.max(1, Math.min(4, spec.humanPlayers | 0 || 1));
const MIN_FOE_ROW_H = Number.isFinite(Number(spec.minFoeRowH)) ? Math.max(0, Number(spec.minFoeRowH)) : 0;
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

const jsErrors = [], shots = [], layoutProofs = [];
let shotN = 0, srv = null;
const seen404 = new Set();

function watchPage(page, label = "host") {
  page.on("console", (m) => { if (m.type() === "error") {
    jsErrors.push({ kind: "error", client: label, t: ((Date.now() - T0) / 1000).toFixed(1), text: m.text() });
    log(`  ⚠ ${label} console.error: ${m.text().slice(0, 140)}`);
  } });
  page.on("pageerror", (e) => {
    jsErrors.push({ kind: "pageerror", client: label, t: ((Date.now() - T0) / 1000).toFixed(1), text: String(e.stack || e) });
    log(`  ✖ ${label} PAGEERROR: ${String(e.message || e).slice(0, 140)}`);
  });
  page.on("response", (r) => {
    const u = r.url(), st = r.status(), key = `${label}:${st}:${u}`;
    if (st >= 400 && !/favicon/.test(u) && !seen404.has(key)) {
      seen404.add(key);
      jsErrors.push({ kind: `http${st}`, client: label, t: ((Date.now() - T0) / 1000).toFixed(1), text: u });
      log(`  ✖ ${label} HTTP ${st}: ${u}`);
    }
  });
}

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
  const clients = [{ page, label: "player-1" }];
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

  // Every participating client is held to the same error bar. A clean host cannot hide a broken peer.
  watchPage(page, "host");

  const send = (msg) => page.evaluate((m) => window.KM.send(m), msg);
  async function captureLayoutProof(targetPage, label, clientLabel) {
    const proof = await targetPage.evaluate(({ label, clientLabel }) => {
      const km = window.KM ?? {}, state = km.state ?? {};
      const cv = document.getElementById("cv"), controls = document.getElementById("controls");
      const canvas = cv?.getBoundingClientRect(), control = controls?.getBoundingClientRect();
      const board = km.board ?? {}, boss = state.bossUi || state.boss || null;
      const bossRect = boss && canvas && board.H > 0 && board.bossBottom > 0 ? {
        left: canvas.left,
        right: canvas.right,
        top: canvas.top + (6 / board.H) * canvas.height,
        bottom: canvas.top + (board.bossBottom / board.H) * canvas.height,
      } : null;
      const bossBoardRect = boss && board.W > 0 && board.bossBottom > 0 ? {
        left: 0, right: board.W, top: 6, bottom: board.bossBottom,
      } : null;
      const controlVisible = !!control && control.width > 0 && control.height > 0;
      const controlBossOverlap = !!(controlVisible && bossRect
        && control.left < bossRect.right && control.right > bossRect.left
        && control.top < bossRect.bottom && control.bottom > bossRect.top);
      const boxRect = (box) => box?.r != null
        ? { left: box.x - box.r, right: box.x + box.r, top: box.y - box.r, bottom: box.y + box.r }
        : { left: box.x, right: box.x + box.w, top: box.y, bottom: box.y + box.h };
      const intersects = (a, b) => a.left < b.right && a.right > b.left
        && a.top < b.bottom && a.bottom > b.top;
      const foes = km.hit?.foes ?? [], heroes = km.hit?.heroes ?? [];
      const foeHeroOverlaps = [];
      foes.filter((box) => box.id !== boss?.id).forEach((foe, fi) =>
        heroes.forEach((hero, hi) => {
          const foeRect = boxRect(foe), heroRect = boxRect(hero);
          if (intersects(foeRect, heroRect)) foeHeroOverlaps.push({
            foe: fi, foeId: foe.id, foeRect, hero: hi, heroId: hero.id, heroRect,
          });
        }));
      const friendlyOverlaps = [];
      heroes.forEach((hero, hi) => heroes.slice(hi + 1).forEach((other, oi) => {
        const heroRect = boxRect(hero), otherRect = boxRect(other);
        if (hero.id !== other.id && intersects(heroRect, otherRect)) friendlyOverlaps.push({
          hero: hi, heroId: hero.id, heroRect,
          other: hi + oi + 1, otherId: other.id, otherRect,
        });
      }));
      const bossHeroOverlaps = bossBoardRect ? heroes.map((hero, hi) => ({
        hero: hi, heroId: hero.id, heroRect: boxRect(hero),
      })).filter(({ heroRect }) => intersects(bossBoardRect, heroRect)) : [];
      const positionalBossMarkers = foes.filter((box) => box.e?.positionalOnly)
        .map((box) => ({ id: box.id, lane: box.e?.lane ?? null }));
      const laneBossBoxes = foes.filter((box) => box.id === boss?.id && box.e?.boss && !box.e?.positionalOnly);
      const laneBossRows = laneBossBoxes
        .map((box) => ({ id: box.id, lane: box.e?.lane ?? null, rect: boxRect(box) }));
      const laneBossFoeOverlaps = laneBossBoxes.flatMap((bossBox) => foes
        .filter((box) => box.id !== bossBox.id)
        .filter((box) => intersects(boxRect(bossBox), boxRect(box)))
        .map((box) => ({ bossId: bossBox.id, bossRect: boxRect(bossBox), foeId: box.id, foeRect: boxRect(box) })));
      const djinnRows = foes.filter((box) => box.e?.bodyKey === "djinn" && !box.e?.positionalOnly);
      const djinnRowOverlaps = [];
      djinnRows.forEach((row, index) => djinnRows.slice(index + 1).forEach((other) => {
        if (intersects(boxRect(row), boxRect(other))) djinnRowOverlaps.push({
          id: row.id, rect: boxRect(row), otherId: other.id, otherRect: boxRect(other),
        });
      }));
      const lanes = state.lanes ?? [];
      const ordinaryFoes = lanes.flatMap((lane) => lane.enemies ?? [])
        .filter((foe) => foe.id !== boss?.id && !foe.boss);
      const summons = lanes.flatMap((laneState, lane) => (laneState.allies ?? []).map((summon) => ({
        id: summon.id, bodyKey: summon.bodyKey, name: summon.name, hp: summon.hp,
        maxHp: summon.maxHp, lane, moxie: summon.moxie,
        next: summon.queue?.[0]?.name ?? null,
      })));
      const sx = canvas && board.W > 0 ? canvas.width / board.W : 0;
      const sy = canvas && board.H > 0 ? canvas.height / board.H : 0;
      const friendlyTouchSizes = heroes.map((hero) => {
        const rect = boxRect(hero);
        return { id: hero.id, width: (rect.right - rect.left) * sx,
          height: (rect.bottom - rect.top) * sy };
      });
      const canvasContained = !!canvas && canvas.left >= -0.5 && canvas.top >= -0.5
        && canvas.right <= window.innerWidth + 0.5 && canvas.bottom <= window.innerHeight + 0.5;
      return {
        label,
        client: clientLabel,
        scenario: state.scenario ?? null,
        phase: state.phase ?? null,
        renderErrorCount: km.renderErrorCount ?? 0,
        boss: boss ? { id: boss.id, bodyKey: boss.bodyKey, hp: boss.hp, maxHp: boss.maxHp,
          lane: boss.lane ?? null } : null,
        board: { W: board.W ?? null, H: board.H ?? null, bossBottom: board.bossBottom ?? 0,
          caravanY: board.caravanY ?? null, laneW: board.laneW ?? null, foeBands: board.foeBands ?? null },
        canvas: canvas ? { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height } : null,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        canvasContained,
        controls: control ? { x: control.x, y: control.y, width: control.width, height: control.height } : null,
        controlBossOverlap,
        foeHitboxes: foes.length,
        heroHitboxes: heroes.length,
        foeHeroOverlapCount: foeHeroOverlaps.length,
        foeHeroOverlaps,
        friendlyOverlapCount: friendlyOverlaps.length,
        friendlyOverlaps,
        bossHeroOverlapCount: bossHeroOverlaps.length,
        bossHeroOverlaps,
        positionalBossMarkers,
        laneBossRows,
        laneBossFoeOverlaps,
        djinnRowOverlaps,
        humanPlayerCount: (state.players ?? []).filter((player) => !player.bot).length,
        ordinaryFoeCount: ordinaryFoes.length,
        ordinaryFoes: ordinaryFoes.map((foe) => ({ id: foe.id, bodyKey: foe.bodyKey, name: foe.name })),
        summonCount: summons.length,
        summons,
        friendlyTouchSizes,
        castFx: (state.castFx ?? []).map((fx) => ({ id: fx.id, kind: fx.kind, cardKey: fx.cardKey ?? null })),
        activeCastFx: (km.ui?.castFx ?? []).map((fx) => ({ id: fx.id, kind: fx.kind, cardKey: fx.cardKey ?? null })),
      };
    }, { label, clientLabel });
    layoutProofs.push(proof);
    if (proof.renderErrorCount) throw new Error(`${label}: client reported ${proof.renderErrorCount} render error(s)`);
    if (proof.controlBossOverlap) throw new Error(`${label}: context controls overlap the boss command panel`);
    if (proof.bossHeroOverlapCount) throw new Error(`${label}: ${proof.bossHeroOverlapCount} hero/boss-panel overlap(s) ${JSON.stringify(proof.bossHeroOverlaps)}`);
    if (proof.foeHeroOverlapCount) throw new Error(`${label}: ${proof.foeHeroOverlapCount} foe/hero touch hitbox overlap(s) ${JSON.stringify(proof.foeHeroOverlaps)}`);
    if (proof.phase === "playing" && proof.friendlyOverlapCount)
      throw new Error(`${label}: ${proof.friendlyOverlapCount} friendly touch hitbox overlap(s); summons=${JSON.stringify(proof.summons)} overlaps=${JSON.stringify(proof.friendlyOverlaps)}`);
    if (proof.phase === "playing" && MIN_FOE_ROW_H > 0) {
      const tinyFoeBands = (proof.board.foeBands ?? []).map((band, lane) => ({ lane, ...band }))
        .filter((band) => band.bodies > band.tokens && band.rowH < MIN_FOE_ROW_H);
      if (tinyFoeBands.length)
        throw new Error(`${label}: real foe row below ${MIN_FOE_ROW_H}px ${JSON.stringify(tinyFoeBands)}`);
    }
    // Duplicity cannot be fair if the authoritative Djinn has a unique lane marker. The command
    // panel remains, while every lane body uses the same ordinary presentation contract.
    if (proof.boss?.bodyKey === "djinn" && proof.positionalBossMarkers.length !== 0)
      throw new Error(`${label}: Djinn leaked a unique positional marker`);
    if (["djinn", "kingMimic"].includes(proof.boss?.bodyKey) && proof.laneBossRows.length !== 1)
      throw new Error(`${label}: ${proof.boss.bodyKey} must have exactly one distinct lane-row hitbox (got ${proof.laneBossRows.length})`);
    if (proof.laneBossFoeOverlaps.length)
      throw new Error(`${label}: lane-bound boss row overlaps another foe ${JSON.stringify(proof.laneBossFoeOverlaps)}`);
    if (proof.djinnRowOverlaps.length)
      throw new Error(`${label}: Djinn identities overlap each other ${JSON.stringify(proof.djinnRowOverlaps)}`);
    if (proof.phase === "playing" && (!proof.foeHitboxes || !proof.heroHitboxes))
      throw new Error(`${label}: playing frame is missing live foe/hero hitboxes`);
    if (!proof.canvasContained)
      throw new Error(`${label}: game canvas escapes the ${proof.viewport.width}x${proof.viewport.height} viewport`);
    if (proof.scenario === "four-player-boss-four-foes-three-summons" && proof.phase === "playing") {
      if (proof.humanPlayerCount !== 4 || proof.ordinaryFoeCount < 4 || proof.summonCount !== 3)
        throw new Error(`${label}: exact crowd contract failed (players=${proof.humanPlayerCount}, foes=${proof.ordinaryFoeCount}, summons=${proof.summonCount})`);
      if ((label === "boot" || label === "four-player-crowd-opening") && proof.ordinaryFoeCount !== 4)
        throw new Error(`${label}: opening frame must contain exactly four ordinary foes (got ${proof.ordinaryFoeCount})`);
      if (proof.boss?.bodyKey !== "litigationLich" || proof.boss.maxHp !== 60)
        throw new Error(`${label}: expected a four-player 60-HP Litigation Lich`);
      const requiredFoes = ["bloodfund", "bribedBishop", "compound", "warewolf"];
      const foeBodies = new Set(proof.ordinaryFoes.map((foe) => foe.bodyKey));
      if (!requiredFoes.every((bodyKey) => foeBodies.has(bodyKey)))
        throw new Error(`${label}: an original ordinary foe disappeared (${[...foeBodies].join(",")})`);
      const summonBodies = proof.summons.map((summon) => summon.bodyKey).sort().join(",");
      if (summonBodies !== "grandAttacker,grandCaster,grandTank")
        throw new Error(`${label}: summon roster mismatch (${summonBodies})`);
      if (proof.heroHitboxes !== 7)
        throw new Error(`${label}: expected seven distinct friendly hitboxes, got ${proof.heroHitboxes}`);
      const tooSmall = proof.friendlyTouchSizes.filter((size) => Math.min(size.width, size.height) < 24);
      if (tooSmall.length)
        throw new Error(`${label}: friendly touch targets below 24 CSS px ${JSON.stringify(tooSmall)}`);
    }
    return proof;
  }
  async function shot(label) {
    for (const client of clients) {
      try { await client.page.evaluate(() => window.dispatchEvent(new Event("resize"))); } catch {}
    }
    await sleep(140);   // > the 80ms resize debounce → a render() with loaded art (shoot.mjs pattern)
    for (const client of clients) {
      await captureLayoutProof(client.page, label, client.label);
      const suffix = client === clients[0] ? "" : `-${client.label}`;
      const n = `${String(++shotN).padStart(2, "0")}-${label}${suffix}.png`;
      await client.page.screenshot({ path: join(OUT, n) }); shots.push(n); log(`  📸 ${n}`);
    }
  }
  // tap a live canvas hit-box (window.KM.hit — the client's own logical boxes) with a REAL touch/click
  async function shotNow(label) {
    for (const client of clients) {
      await captureLayoutProof(client.page, label, client.label);
      const suffix = client === clients[0] ? "" : `-${client.label}`;
      const n = `${String(++shotN).padStart(2, "0")}-${label}${suffix}.png`;
      await client.page.screenshot({ path: join(OUT, n) }); shots.push(n); log(`  📸 ${n}`);
    }
  }
  const entityPoint = (kindKey, i) => page.evaluate(({ kindKey, i }) => {
      const boxes = (kindKey === "foe" ? window.KM?.hit?.foes : window.KM?.hit?.heroes) ?? [];
      const b = boxes[i]; if (!b) return null;
      const cv = document.getElementById("cv"); if (!cv) return null;
      const r = cv.getBoundingClientRect();
      const { W, H } = window.KM.board ?? { W: r.width, H: r.height };
      const cx = b.w != null ? b.x + b.w / 2 : b.x;     // hero entries may be circles {x,y,r}
      const cy = b.h != null ? b.y + b.h / 2 : b.y;
      return { x: r.left + (cx / W) * r.width, y: r.top + (cy / H) * r.height };
    }, { kindKey, i });
  async function tapEntity(kindKey, i) {
    const pt = await entityPoint(kindKey, i);
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
  let heldFoe = null;
  async function touchStartFoe(i) {
    if (!cdp) throw new Error("touchStartFoe requires a touch viewport");
    const pt = await entityPoint("foe", i); if (!pt) throw new Error(`touchStartFoe ${i}: live foe hit-box missing`);
    heldFoe = { pt };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y }] });
    log(`  ☝ hold start foe[${i}]`);
  }
  async function touchEndFoe() {
    if (!cdp || !heldFoe) throw new Error("touchEndFoe without touchStartFoe");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    heldFoe = null;
    log("  👆 foe hold release");
  }
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
  const pilotState = () => page.evaluate(() => {
    const km = window.KM, me = (km?.state?.players ?? []).find((p) => p.id === (km.activeId ?? km.you)) ?? (km?.state?.players ?? [])[0];
    return { body: me?.bodyKey ?? null, levelPick: me?.levelPick ?? null, levelBonus: me?.levelBonus ?? 0 };
  });
  async function tapBody(bodyKey) {
    if (!/^[\w-]+$/.test(bodyKey)) throw new Error(`tapBody: unsafe body key ${JSON.stringify(bodyKey)}`);
    const opt = page.locator(`.km-body-grid [data-body-key="${bodyKey}"]`).first();
    if (!await opt.count() || !await opt.isVisible()) throw new Error(`tapBody: visible WEAR option ${bodyKey} missing`);
    if (await opt.isDisabled()) throw new Error(`tapBody: WEAR option ${bodyKey} is disabled`);
    await opt.click();
    log(`  🎭 tap body ${bodyKey}`);
  }
  async function expectPickKind(want) {
    const got = await page.evaluate(() => window.KM?.ui?.pickKind
      ?? document.querySelector(".km-pick-modal")?.dataset.pickKind ?? null);
    if (got !== want) throw new Error(`pick modal: expected ${want}, got ${got}`);
    log(`  ✓ pick modal ${want == null ? "closed" : want}`);
  }
  async function pickOption(key) {
    if (!/^[\w-]+$/.test(key)) throw new Error(`pickOption: unsafe key ${JSON.stringify(key)}`);
    const opt = page.locator(`.km-pick-modal [data-pick="${key}"]`).first();
    if (await opt.count() && await opt.isVisible()) await opt.click();
    else {
      const chosen = await page.evaluate((pick) => {
        if (!window.KM?.ui?.pickChoices?.some((c) => c.key === pick)) return false;
        window.KM.choosePick?.(pick);
        return true;
      }, key);
      if (!chosen) throw new Error(`pickOption: visible option ${key} missing`);
    }
    log(`  ✓ pick ${key}`);
  }
  async function cancelPick() {
    const b = page.locator('.km-pick-modal [data-pick-cancel="1"]').first();
    if (await b.count() && await b.isVisible()) await b.click();
    else {
      const closed = await page.evaluate(() => {
        if (!window.KM?.ui?.pickKind) return false;
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape" }));
        return true;
      });
      if (!closed) throw new Error("cancelPick: visible cancel button missing");
    }
    log("  ✓ pick cancelled");
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

  // Create the room exactly like a player.  A multiplayer capture uses one body per independent
  // browser context, so four seats are four real WebSocket clients rather than one player plus bots.
  const bodies = HUMAN_PLAYERS > 1 ? 1 : Math.max(1, Math.min(4, spec.bodies ?? (spec.players?.length || 1)));
  await page.evaluate(({ bodies }) => {
    document.querySelector(`#bodiesPick .bp-opt[data-bodies="${bodies}"]`)?.click();
    document.getElementById("name").value = "Scenario";
    document.getElementById("createBtn").click();
  }, { bodies });
  await page.waitForFunction(() => !!window.KM?.state, { timeout: 9000 });
  const peerContexts = [];
  if (HUMAN_PLAYERS > 1) {
    const roomCode = await page.evaluate(() => document.getElementById("roomCode")?.textContent.replace(/^ROOM\s+/, "").trim());
    if (!roomCode) throw new Error("host room code was not visible for multiplayer joins");
    for (let i = 2; i <= HUMAN_PLAYERS; i++) {
      const peerCtx = await browser.newContext({ viewport: V.viewport, deviceScaleFactor: V.deviceScaleFactor, hasTouch: V.hasTouch });
      const peer = await peerCtx.newPage();
      peerContexts.push(peerCtx);
      clients.push({ page: peer, label: `player-${i}` });
      watchPage(peer, `player-${i}`);
      await peer.goto(BASE + "/?harness=1" + (V.touchParam ? "&touch=1" : ""), { waitUntil: "domcontentloaded" });
      await peer.waitForFunction(() => !!window.KM, { timeout: 12000 });
      await peer.evaluate(({ roomCode, i }) => {
        document.getElementById("name").value = `Player ${i}`;
        document.getElementById("code").value = roomCode;
        document.getElementById("joinBtn").click();
      }, { roomCode, i });
      await peer.waitForFunction(() => !!window.KM?.state, { timeout: 9000 });
      log(`  player ${i} joined ${roomCode} through an independent browser context`);
    }
    await page.waitForFunction((want) => (window.KM?.state?.players ?? []).filter((p) => !p.bot).length === want,
      HUMAN_PLAYERS, { timeout: 9000 });
    log(`${HUMAN_PLAYERS} real browser clients are seated.`);
  }

  // inject the starting conditions through the gated hook, then wait for the REAL loop to carry them
  log(`injecting scenario "${NAME}" …`);
  await send({ type: "scenario", spec });
  await page.waitForFunction((nm) => window.KM?.state?.scenario === nm, NAME, { timeout: 8000 }).catch(async () => {
    const err = await page.evaluate(() => document.getElementById("lobbyErr")?.textContent || "");
    throw new Error(`scenario was not applied${err ? ` — server said: ${err}` : ""}`);
  });
  const wantPhase = spec.phase ?? "playing";
  await page.waitForFunction((ph) => window.KM?.state?.phase === ph, wantPhase, { timeout: 8000 });
  const seatedHumans = await page.evaluate(() => (window.KM?.state?.players ?? []).filter((p) => !p.bot).length);
  if (seatedHumans !== HUMAN_PLAYERS) throw new Error(`expected ${HUMAN_PLAYERS} human clients, snapshot has ${seatedHumans}`);
  log(`scenario live (phase ${wantPhase}, ${seatedHumans} human clients).`);

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
    else if (Array.isArray(step.expectCastFx)) {
      for (const client of clients) {
        await client.page.waitForFunction((kinds) => kinds.every((kind) =>
          (window.KM?.ui?.castFx ?? []).some((fx) => fx.kind === kind)), step.expectCastFx,
        { timeout: 1200 });
        const observed = await client.page.evaluate(() => ({
          active: window.KM?.ui?.castFx ?? [],
          history: window.KM?.state?.castFx ?? [],
        }));
        const generic = observed.history.find((fx) => fx.kind === "cast" && fx.cardKey === "oMeteors");
        if (step.expectCastFx.includes("cast")
            && (!generic || !observed.active.some((fx) => fx.id === generic.id)))
          throw new Error(`${client.label}: generic card-specific Meteors pulse was not active`);
        log(`  ✓ ${client.label} active cast FX: ${step.expectCastFx.join(", ")}`);
      }
    }
    else if (Array.isArray(step.expectActiveCastFx)) {
      for (const client of clients) {
        const active = await client.page.evaluate(() => window.KM?.ui?.castFx ?? []);
        const kinds = active.map((fx) => fx.kind);
        if (kinds.join(",") !== step.expectActiveCastFx.join(","))
          throw new Error(`${client.label}: expected active cast FX ${JSON.stringify(step.expectActiveCastFx)}, got ${JSON.stringify(kinds)}`);
        log(`  ✓ ${client.label} cast FX cleared`);
      }
    }
    else if (step.expectCardFxCleared != null) {
      for (const client of clients) {
        const active = await client.page.evaluate((key) => (window.KM?.ui?.castFx ?? [])
          .filter((fx) => fx.cardKey === key), String(step.expectCardFxCleared));
        if (active.length)
          throw new Error(`${client.label}: ${step.expectCardFxCleared} cast FX did not clear: ${JSON.stringify(active)}`);
        log(`  ✓ ${client.label} ${step.expectCardFxCleared} cast FX cleared`);
      }
    }
    else if (step.tapFoe != null) await tapEntity("foe", step.tapFoe | 0);
    else if (step.touchStartFoe != null) await touchStartFoe(step.touchStartFoe | 0);
    else if (step.touchEndFoe) await touchEndFoe();
    else if (step.tapAlly != null) await tapEntity("hero", step.tapAlly | 0);
    else if (step.tapHand != null) await tapHand(step.tapHand | 0);
    else if (step.touchStartHand != null) await touchStartHand(step.touchStartHand | 0);
    else if (step.touchEndHand) await touchEndHand();
    else if (step.tapDeckPanel) {
      const hit = await page.evaluate(() => { const b = document.querySelector("[data-deckpanel]"); b?.click(); return !!b; });
      if (!hit) throw new Error("tapDeckPanel: no live deck panel button");
      await sleep(160);
    }
    else if (step.tapMelt) {
      const hit = await page.evaluate(() => { const b = document.querySelector("[data-convarm]"); b?.click(); return !!b; });
      if (!hit) throw new Error("tapMelt: no live melt button");
      await sleep(100);
    }
    else if (step.partyDeckSwap) {
      const playerIndex = Math.max(0, step.partyDeckSwap.player | 0);
      const outKey = String(step.partyDeckSwap.out ?? "");
      const inKey = String(step.partyDeckSwap.in ?? "");
      if (!/^[\w-]+$/.test(outKey) || !/^[\w-]+$/.test(inKey))
        throw new Error("partyDeckSwap: out/in must be safe card keys");
      const before = await page.evaluate(({ playerIndex, outKey, inKey }) => {
        const p = window.KM?.state?.players?.[playerIndex];
        if (!p) return null;
        const deck = (p.deckList ?? []).map((c) => c.key);
        const backpack = (p.backpack ?? []).map((c) => c.key);
        return {
          bodyId: p.id, deckLength: deck.length, backpackLength: backpack.length,
          outCount: deck.filter((key) => key === outKey).length,
          inCount: deck.filter((key) => key === inKey).length,
        };
      }, { playerIndex, outKey, inKey });
      if (!before || before.outCount < 1 || before.backpackLength <= before.deckLength)
        throw new Error(`partyDeckSwap: player ${playerIndex} lacks the requested deck/stash state`);
      const toggle = page.locator("[data-partypanel]").first();
      if (!await toggle.count()) throw new Error("partyDeckSwap: Party Equipment panel missing");
      if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
      const body = page.locator(`[data-party-body="${before.bodyId}"]`);
      await body.waitFor({ state: "visible", timeout: 3000 });
      const deckCard = body.locator(`[data-partycard-zone="deck"][data-partycard-key="${outKey}"]`).first();
      const stashCard = body.locator(`[data-partycard-zone="spare"][data-partycard-key="${inKey}"]`).first();
      if (!await deckCard.count() || !await stashCard.count())
        throw new Error(`partyDeckSwap: rendered ${outKey} deck / ${inKey} stash pair missing`);
      await deckCard.click();
      await sleep(120);
      const targets = await body.locator(".party-equip-card.is-replace-target").count();
      const targetReady = await stashCard.evaluate((b) =>
        b.classList.contains("is-replace-target") && /tap to replace/i.test(b.textContent || ""));
      const guide = await page.locator(".party-loadout-guide").innerText();
      if (!targetReady || targets < 1 || !/tap a stash card/i.test(guide))
        throw new Error(`partyDeckSwap: replacement target unclear (targets=${targets}, guide=${JSON.stringify(guide)})`);
      await shot("party-deck-selected-stash-lit");
      await stashCard.click();
      await page.waitForFunction(({ bodyId, outKey, inKey, before }) => {
        const p = window.KM?.state?.players?.find((x) => x.id === bodyId);
        const deck = (p?.deckList ?? []).map((c) => c.key);
        return deck.length === before.deckLength
          && deck.filter((key) => key === outKey).length === before.outCount - 1
          && deck.filter((key) => key === inKey).length === before.inCount + 1
          && (p?.backpack?.length ?? -1) === before.backpackLength;
      }, { bodyId: before.bodyId, outKey, inKey, before }, { timeout: 4000 });
      layoutProofs.partyDeckSwap = { playerIndex, bodyId: before.bodyId, outKey, inKey, targets,
        deckLength: before.deckLength, backpackLength: before.backpackLength, ok: true };
      log(`  ✓ party player ${playerIndex}: ${outKey} deck ↔ ${inKey} stash`);
    }
    else if (step.clickNewRun) {
      const buttons = page.locator("[data-newrun]");
      const count = await buttons.count();
      if (count !== 1) throw new Error(`clickNewRun: expected one visible completed-run button, got ${count}`);
      await buttons.click();
      await page.waitForFunction(() => window.KM?.state?.phase === "draft", { timeout: 4000 });
      log("  ✓ completed-run NEW RUN advanced to a fresh draft");
    }
    else if (Object.hasOwn(step, "expectHandInspect")) {
      const got = (await handState()).inspect, want = step.expectHandInspect;
      if (got !== want) throw new Error(`hand inspector: expected ${want}, got ${got}`);
      log(`  ✓ hand inspector ${want == null ? "closed" : `on slot ${want}`}`);
    }
    else if (step.tapBody != null) await tapBody(String(step.tapBody));
    else if (Object.hasOwn(step, "expectPickKind")) await expectPickKind(step.expectPickKind);
    else if (step.pickOption != null) await pickOption(String(step.pickOption));
    else if (step.cancelPick) await cancelPick();
    else if (step.expectBody != null) {
      const got = (await pilotState()).body, want = String(step.expectBody);
      if (got !== want) throw new Error(`body: expected ${want}, got ${got}`);
      log(`  ✓ body ${want}`);
    }
    else if (Object.hasOwn(step, "expectLevelPick")) {
      const got = (await pilotState()).levelPick, want = step.expectLevelPick == null ? null : String(step.expectLevelPick);
      if (got !== want) throw new Error(`level pick: expected ${want}, got ${got}`);
      log(`  ✓ level pick ${want ?? "auto"}`);
    }
    else if (step.shot != null) await shot(String(step.shot).replace(/[^\w-]+/g, "-"));
    else if (step.shotNow != null) await shotNow(String(step.shotNow).replace(/[^\w-]+/g, "-"));
    else log(`  ⚠ unknown script step ${JSON.stringify(step)} — see the action verbs at the top of this file`);
  }
  const fs = await page.evaluate(() => ({ phase: window.KM?.state?.phase, tick: window.KM?.state?.tick, floor: window.KM?.state?.floor }));
  await shot("final").catch(() => {});

  const report = { when: new Date().toISOString(), tool: "tools/scenario-shot.mjs", scenario: NAME, specPath: SPEC_PATH,
    real: { server: true, client: true, tickLoop: true, multiplayerClients: seatedHumans,
      startingConditions: "injected via KM_SCENARIO=1 {type:'scenario'}" },
    viewport: VP, viewportSize: V.viewport, deviceProfile, dpr: V.deviceScaleFactor, touch: V.hasTouch,
    port: PORT, bodies, humanPlayers: seatedHumans, minFoeRowH: MIN_FOE_ROW_H || null,
    finalPhase: fs?.phase ?? null, finalTick: fs?.tick ?? null,
    screenshots: shots, layoutProofs, jsErrorCount: jsErrors.length, jsErrors };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(OUT, "MANIFEST.txt"),
    `KING MIMIC — SCENARIO CAPTURE\n` +
    `tool       : tools/scenario-shot.mjs\n` +
    `scenario   : ${NAME} (${SPEC_PATH})\n` +
    `when       : ${report.when}\n` +
    `viewport   : ${VP} ${V.viewport.width}x${V.viewport.height}@${V.deviceScaleFactor}${V.hasTouch ? " touch" : ""}\n` +
    `players    : ${report.humanPlayers} independent browser client${report.humanPlayers === 1 ? "" : "s"}\n` +
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
