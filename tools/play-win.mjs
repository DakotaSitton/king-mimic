// ⤳ FOLDED INTO tools/shoot.mjs 2026-06-27 — its solo combat/draft brain IS the canonical tool's
//   brain. Kept for history. For real screenshots use the canonical entry point: node tools/shoot.mjs
// PLAY-TO-WIN (owner 2026-06-27) — King Mimic, played to actually CLEAR the floor boss.
// Boots its own fresh bun server on a private port, drives the real client in headless Edge
// via window.KM, and screenshots each phase. Strategy is rewritten from play-smart.mjs around
// what actually kills a SOLO run:
//   • SOLO = one knockdown ENDS the run (deadlock guard: sole hero down + no allies → instant loss).
//     So survival is everything — proactively shield/heal, never self-harm, never bank into a lethal beat.
//   • The boss lives in snapshot.boss, NOT in lanes[].enemies. Ranged 'pick' cards hit it via
//     targetId=boss.id; lane cards (Lightning/Meteors) hit it too; melee reaches it only when the
//     lane is clear. The prior driver never targeted the boss — that was the wall it stalled on.
//   • Boss-aware: Hydra spawns a biting head per damage INSTANCE → use BIG SINGLE hits, never multi/AoE.
//     Lich caps damage to 1 during 'objection' → chip/ramp then unload in 'recess'. Kraken = gentle.
//   • Kit-aware draft: score body HP + passive + the 10-card deck's shields/sustain/economy/efficient dmg.
// Usage: node tools/play-win.mjs   ·   BUDGET=320 NODES=8 BODIES=1 VP=mobile HEADED=1
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const VP = (process.env.VP || "mobile").toLowerCase();
const HEADED = !!process.env.HEADED;
const PORT = Number(process.env.PORT || (3400 + Math.floor(Math.random() * 500)));
const BASE = `http://localhost:${PORT}`;
const MAX_NODES = Number(process.env.NODES || 8);
const BUDGET_MS = Number(process.env.BUDGET || 320) * 1000;
const BODIES = Number(process.env.BODIES || 1);
const ROOT = join(import.meta.dirname, "..");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = join(ROOT, "tools", "shots", `win-${VP}-${STAMP}`);
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  mobile:  { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true,  touchParam: true },
  desktop: { viewport: { width: 1120, height: 820 }, deviceScaleFactor: 1, hasTouch: false, touchParam: false },
};
const V = VIEWPORTS[VP] || VIEWPORTS.mobile;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a);

// ── CARD KNOWLEDGE (from game.js KIT — total dmg = dmg*hits; flags drive the AI) ──────────────
const CARD = {
  oSword:{c:2,dmg:3,tgt:"front"}, oHatchet:{c:3,dmg:4,tgt:"front"}, oSpear:{c:2,dmg:2,tgt:"front2"},
  oDagger:{c:1,dmg:1,tgt:"front"}, oMallet:{c:4,dmg:4,tgt:"front",shield:4}, oZweihander:{c:5,dmg:6,tgt:"front"},
  oTwinUchis:{c:3,dmg:2,hits:2,tgt:"front",multi:1}, oPowerUp:{c:2,ramp:1}, oComboBlade:{c:3,dmg:2,tgt:"front",ramp:1},
  oBow:{c:2,dmg:2,tgt:"pick",ranged:1}, oJavelin:{c:4,dmg:5,tgt:"pick",ranged:1}, oFire:{c:3,dmg:5,tgt:"pick",ranged:1},
  oIce:{c:3,dmg:3,tgt:"pick",ranged:1}, oArcane:{c:1,dmg:1,tgt:"pick",ranged:1}, oDark:{c:4,dmg:4,tgt:"pick",ranged:1,heal:4},
  oWind:{c:2,dmg:3,tgt:"pick",ranged:1}, oLightning:{c:3,dmg:3,tgt:"lane",multi:1}, oMeteors:{c:5,dmg:6,tgt:"lane",multi:1},
  oHoly:{c:3,heal:5}, oForce:{c:4,shield:6}, dBuckler:{c:1,shield:1}, dTaunt:{c:1,tgt:"pick",util:1},
  dShield:{c:2,shield:2}, dShieldBash:{c:2,shield:1,dmg:1,tgt:"front",bash:1}, dHeartGuard:{c:3,shield:2,heal:2},
  dThorns:{c:3,lasting:1,util:1}, dStoneskin:{c:4,lasting:1,dr:1}, dBloodIron:{c:4,lasting:1,util:1},
  dTowerShield:{c:4,shield:5}, dTrollskin:{c:4,lasting:1,regenHeal:1}, dLiquidMetal:{c:5,lasting:1,regenShield:1},
  oOmnislash:{c:5,dmg:2,hits:4,tgt:"front",multi:1}, oHaste:{c:3,lasting:1,economy:1}, oHedgeKnight:{c:5,summon:1},
  oMoxiePool:{c:3,lasting:1,economy:1}, oGlacius:{c:6,dmg:8,tgt:"front"}, oSharpEdges:{c:2,lasting:1,meleeBuff:1},
  oWizardHat:{c:2,lasting:1,rangedBuff:1}, oRepeatXbow:{c:1,dmg:1,tgt:"pick",ranged:1}, oDemonForm:{c:4,lasting:1,meleeRamp:1},
  oSageMode:{c:4,lasting:1,rangedRamp:1}, oBerserker:{c:4,lasting:1,selfHarm:1}, oPileOn:{c:2,dmg:0,tgt:"front",perAlly:1},
  coolShoes:{worn:1,economy:1},
};
const tot = (k) => (CARD[k]?.dmg || 0) * (CARD[k]?.hits || 1);
const shOf = (k) => CARD[k]?.shield || 0;
const heOf = (k) => CARD[k]?.heal || 0;

// Body passive value for the draft (survival-weighted). Keyed by MOXIE_SET key.
const BODY_PASSIVE = { goldenGolem:9, tollTroll:6, bondBehemoth:5, vengefulVampire:4, marketCrashMinotaur:4, wearyWageslave:3,
  centlessCentaur:2, cryptoChimera:2, interestImp:2, malevolentMouse:2, rentSeekingRuneblade:2, fatCat:1, paidPiper:1, royalRat:1, tollTroll2:0 };
// Card draft value: shields/sustain/economy/efficient-damage up, self-harm/dead down.
function cardDraftScore(k) {
  const cd = CARD[k]; if (!cd) return 1;
  let s = 0;
  if (cd.shield) s += 2 + cd.shield * 0.8;  // shields are the solo lifeline — weight them up
  if (cd.heal) s += 3 + cd.heal * 0.6;      // a heal in the deck lets me undo chip between bursts
  if (cd.dr) s += 6;                        // Stoneskin: −1 all dmg is huge vs chip
  if (cd.regenShield || cd.regenHeal) s += 5;
  if (cd.economy) s += 4;                   // moxie acceleration wins the tempo war
  if (cd.ramp || cd.meleeBuff || cd.rangedBuff || cd.meleeRamp || cd.rangedRamp) s += 1.5;
  if (cd.dmg) s += Math.min(3, tot(k) / Math.max(1, cd.c)); // damage efficiency (capped — don't over-greed)
  if (cd.heal && cd.dmg) s += 3;            // lifesteal (Dark): damage AND sustain
  if (cd.selfHarm) s -= 4;                  // Berserker self-damage is a solo liability
  if (cd.summon) s += 2;                    // a Hedge Knight = a free extra body/blocker
  if (cd.worn && cd.economy) s += 4;        // Cool Shoes worn engine
  if (cd.c <= 1) s += 0.5;                  // cheap = playable from turn 1 at 0 moxie
  return s;
}
// A bundle's defensive floor — does its deck even let me survive? Heavily reward having a
// heal AND a real shield; a glass body with only attacks is how a solo run gets burst down.
function deckDefenseBonus(keys) {
  let b = 0;
  const hasHeal = keys.some((k) => heOf(k) > 0);
  const hasBigShield = keys.some((k) => shOf(k) >= 4);
  const hasAnyShield = keys.some((k) => shOf(k) > 0);
  const hasDR = keys.some((k) => CARD[k]?.dr);
  const hasEco = keys.some((k) => CARD[k]?.economy);
  if (hasHeal) b += 6; if (hasBigShield) b += 5; if (hasAnyShield) b += 3;
  if (hasDR) b += 4; if (hasEco) b += 4;
  if (!hasAnyShield && !hasHeal) b -= 10;   // pure glass cannon → avoid
  return b;
}
// A bundle's OFFENSE floor — kill-speed is survival (a dead foe stops attacking). A deck that can't
// kill stalls and loses on attrition (run E: an all-defense goldenGolem couldn't end a fight). Reward
// several damage cards + a real nuke; punish a near-toothless deck.
function deckOffenseBonus(keys) {
  const dmgCards = keys.filter((k) => tot(k) > 0);
  const nuke = Math.max(0, ...keys.map((k) => tot(k)));   // biggest single hit available
  let b = dmgCards.length * 1.5 + Math.min(nuke, 8);
  if (dmgCards.length < 3) b -= 8;                          // too few attackers → stall risk
  if (nuke < 4) b -= 4;                                     // no real finisher
  return b;
}
// Total bundle value for the draft: HP + body passive (×2 — a shield-engine/heal body IS the run) +
// deck quality + a hard defensive floor.
function bundleScore(w) {
  const hp = w.maxHp ?? 6;
  const kit = (w.items ?? []).map((o) => o.key || o);
  return hp * 1.8 + (BODY_PASSIVE[w.bodyKey] ?? 0) * 2 + kit.reduce((a, k) => a + cardDraftScore(k), 0)
       + deckDefenseBonus(kit) + deckOffenseBonus(kit);
}

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

// ── THE COMBAT BRAIN — pure: given the snapshot + my body, return {cardId, target} or null ──────
function decide(s, me) {
  const lane = me.lane ?? 0;
  const laneArr = (s.lanes?.[lane]?.enemies ?? []).filter((e) => (e.hp ?? 0) > 0);
  const boss = s.boss && s.boss.hp > 0 ? s.boss : null;
  const bossKey = boss?.bodyKey;
  const hp = me.hp ?? 0, maxHp = me.maxHp ?? 1, shield = me.shield ?? 0, moxie = me.moxie ?? 0;
  const ehp = hp + shield;

  // enrich affordable hand with card knowledge
  const hand = (me.hand ?? []).filter((c) => c.affordable).map((c) => ({ ...c, cd: CARD[c.key] || {} }));
  const shields = hand.filter((c) => shOf(c.key) > 0).sort((a, b) => shOf(a.key) - shOf(b.key));
  const heals = hand.filter((c) => heOf(c.key) > 0).sort((a, b) => heOf(b.key) - heOf(a.key));
  const dmgs = hand.filter((c) => tot(c.key) > 0);

  // incoming damage TO ME this lane. A foe's queued `hit` is PER-HIT — multiply by the card's
  // hit count (Twin Uchis 3×2=6, Omnislash 2×4=8) or my burst estimate halves and I die. (← the
  // bug that lost a deep run: read 3 for a 6-damage Twin Uchis.)
  const hitOf = (f) => { const q = f.queue?.[0]; if (!q) return 0; return (q.hit || 0) * (CARD[q.key]?.hits || 1); };
  const willCast = (f, frac) => (f.castFrac ?? 0) >= frac && hitOf(f) > 0;
  const incomingNow = laneArr.filter((f) => willCast(f, 0.5)).reduce((a, f) => a + hitOf(f), 0);
  const incomingSoon = laneArr.filter((f) => willCast(f, 0.12)).reduce((a, f) => a + hitOf(f), 0);
  const biggestHit = Math.max(0, ...laneArr.map(hitOf));
  let bossAoe = 0;
  for (const t of (boss?.threats ?? [])) if ((t.frac ?? 0) >= 0.55 && (t.dmg || 0) > 0) bossAoe += (t.dmg || 0);
  const dangerNow = incomingNow + bossAoe;
  // the opening (low moxie, no ramp, foe building its first burst) is the deadliest window
  const opening = (s.tick ?? 9999) < 60 || moxie < 4;

  const front = laneArr[0] || null;
  const aimFront = () => (front ? front.id : (boss ? boss.id : null));
  const canHit = (k, foe, isFront) => {
    const t = CARD[k]?.tgt;
    if (t === "pick" || t === "lane") return true;        // ranged/lane reach anything in/behind lane
    if (t === "front2") return isFront || laneArr[1]?.id === foe.id;
    return isFront;                                        // melee front only
  };
  const play = (c, target) => (c ? { cardId: c.id, target } : null);

  // 1) DEFENSE FIRST — never let a solo body get knocked out. On a lethal near-future burst:
  //    (a) KILL the scariest imminent attacker this turn if I can (removes the burst entirely);
  //    (b) else raise the biggest shield that covers it; (c) else heal; (d) else lay a DR engine.
  const threat = Math.max(dangerNow, incomingSoon);            // worst plausible next ~2s
  if ((threat > 0 && ehp - threat <= maxHp * 0.3) || ehp <= maxHp * 0.5) {
    const scary = laneArr.filter((f) => hitOf(f) > 0).sort((a, b) => (hitOf(b) - hitOf(a)) || (b.castFrac - a.castFrac));
    for (const f of scary) {
      const eff = (f.hp ?? 0) + (f.shield ?? 0);
      const isFront = front?.id === f.id;
      const k = dmgs.filter((c) => tot(c.key) >= eff && canHit(c.key, f, isFront)).sort((a, b) => a.cost - b.cost)[0];
      if (k) return play(k, f.id);
    }
    const need = Math.max(threat - shield + 3, 0);
    let pick = shields.filter((c) => shOf(c.key) >= need).sort((a, b) => shOf(a.key) - shOf(b.key))[0]
            || shields.slice().sort((a, b) => shOf(b.key) - shOf(a.key))[0] || null;
    if (heals[0] && hp <= maxHp * 0.5 && (!pick || heOf(heals[0].key) >= shOf(pick.key))) pick = heals[0];
    if (pick) return play(pick, aimFront());
    const dr = hand.find((c) => c.cd.dr && (me.dr ?? 0) === 0);   // Stoneskin still cuts the burst
    if (dr) return play(dr, aimFront());
  }

  // 2) KILL the most-imminent foe I can one-shot (removing a queued attacker = less incoming)
  const threats = laneArr.filter((f) => hitOf(f) > 0).sort((a, b) => (b.castFrac - a.castFrac) || (hitOf(b) - hitOf(a)));
  for (const f of threats) {
    const eff = (f.hp ?? 0) + (f.shield ?? 0);
    const isFront = front?.id === f.id;
    const k = dmgs.filter((c) => tot(c.key) >= eff && canHit(c.key, f, isFront)).sort((a, b) => a.cost - b.cost)[0];
    if (k) return play(k, f.id);
  }

  // 3) Stand a shield cushion when foes are armed — size it to the TOTAL imminent alpha (multiple foes
  //    casting together is what one-shots me on deep floors: Spear+Spear+Glacius = 18), not one hit.
  const cushion = Math.min(Math.max(incomingSoon, biggestHit, 4), maxHp + 6);
  if ((incomingSoon > 0 || (opening && laneArr.some((f) => hitOf(f) > 0))) && shield < cushion) {
    const sh = shields.filter((c) => c.cost <= 4).sort((a, b) => shOf(b.key) - shOf(a.key))[0] || shields[0];
    if (sh && moxie >= sh.cost) return play(sh, aimFront());
  }

  // 3.5) Lay PROACTIVE lasting engines early (each leaves the hand after one cast — no replay loop).
  //      Defensive first (Stoneskin DR / Trollskin heal-regen / LiquidMetal shield-regen), then economy
  //      (MoxiePool / Haste). Skip if a burst lands THIS beat; keep a shield's worth of moxie in reserve.
  if (incomingNow === 0) {
    const reserve = incomingSoon > 0 ? (shields[0]?.cost ?? 0) : 0;
    const engine = hand.filter((c) => { const d = c.cd; return !d.selfHarm && (d.dr || d.regenHeal || d.regenShield || d.economy); })
      .filter((c) => !(c.cd.dr && (me.dr ?? 0) > 0))                       // don't re-lay Stoneskin if DR already up
      .sort((a, b) => cardDraftScore(b.key) - cardDraftScore(a.key))[0];
    if (engine && moxie - engine.cost >= reserve) return play(engine, aimFront());
  }

  // 4) Heal when wounded and not under an imminent beat
  if (hp <= maxHp * 0.55 && heals[0] && dangerNow < ehp - 2) return play(heals[0], aimFront());

  // 5) DEAL DAMAGE — focus lane foes (lowest hp first; front for melee), else the boss
  if (laneArr.length) {
    // prefer a clean kill on the lowest-hp foe; else chip the front foe
    const byHp = laneArr.slice().sort((a, b) => (a.hp - b.hp));
    for (const f of byHp) {
      const eff = (f.hp ?? 0) + (f.shield ?? 0);
      const isFront = front?.id === f.id;
      const killer = dmgs.filter((c) => tot(c.key) >= eff && canHit(c.key, f, isFront)).sort((a, b) => a.cost - b.cost)[0];
      if (killer) return play(killer, f.id);
    }
    // no kill available — biggest hit on the front foe (melee) or a ranged/lane chip
    const best = dmgs.filter((c) => canHit(c.key, front, true)).sort((a, b) => tot(b.key) - tot(a.key))[0]
              || dmgs.sort((a, b) => tot(b.key) - tot(a.key))[0];
    if (best) return play(best, best.cd.tgt === "pick" ? (front?.id ?? aimFront()) : aimFront());
  } else if (boss) {
    // BOSS: Lich objection caps damage to 1 → don't waste big cards, chip/ramp instead
    const capped = boss.stance === "objection";
    let pool = dmgs.slice();
    if (bossKey === "hydra") pool = pool.filter((c) => !c.cd.multi);   // each instance spawns a head → single hits only
    if (capped) pool = pool.filter((c) => c.cost <= 2);                // only cheap chip while capped
    // big single hit first (max total dmg), cheapest on ties
    const best = pool.sort((a, b) => (tot(b.key) - tot(a.key)) || (a.cost - b.cost))[0];
    if (best) return play(best, boss.id);
  }

  // 6) RAMP when totally safe — lay down economy/defense engines (never self-harm)
  if (dangerNow === 0 && incomingSoon === 0) {
    const ramps = hand.filter((c) => {
      const d = c.cd; return !d.selfHarm && (d.economy || d.dr || d.ramp || d.meleeBuff || d.rangedBuff ||
        d.regenShield || d.regenHeal || d.meleeRamp || d.rangedRamp);
    }).sort((a, b) => cardDraftScore(b.key) - cardDraftScore(a.key));
    if (ramps[0]) return play(ramps[0], aimFront());
    // or bank a shield if cheap & I have nothing better and moxie is near cap
    if (moxie >= 8 && shields[0] && shield < maxHp) return play(shields[0], aimFront());
  }

  return null; // bank moxie
}

async function run() {
  log(`booting fresh server on ${PORT} …`);
  let srv;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try { srv = await startServer(); break; }
    catch (e) { log(`  server boot failed (try ${attempt}): ${String(e).slice(0, 120)}`); await sleep(1500); }
  }
  if (!srv) throw new Error("server would not boot after retries");
  log("server up. launching Edge (" + VP + ") …");
  const browser = await chromium.launch({ headless: !HEADED, channel: "msedge" });
  const ctx = await browser.newContext({ viewport: V.viewport, deviceScaleFactor: V.deviceScaleFactor, hasTouch: V.hasTouch });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") { jsErrors.push({ kind: "error", text: m.text() }); log(`  ⚠ console.error: ${m.text().slice(0, 140)}`); } });
  page.on("pageerror", (e) => { jsErrors.push({ kind: "pageerror", text: String(e.stack || e) }); log(`  ✖ PAGEERROR: ${String(e.message || e).slice(0, 140)}`); });

  const getState = () => page.evaluate(() => window.KM?.state ?? null);
  const getYou = () => page.evaluate(() => window.KM?.you ?? null);
  const send = (msg) => page.evaluate((m) => window.KM.send(m), msg);
  async function shoot(phase, label) { const n = `${String(++shotN).padStart(2, "0")}-${phase}-${label}.png`; await page.screenshot({ path: join(OUT, n) }); shots.push(n); log(`  📸 ${n}`); }

  await page.goto(BASE + "/?harness=1" + (V.touchParam ? "&touch=1" : ""), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.KM, { timeout: 12000 });

  T0 = Date.now();
  await page.evaluate(({ bodies }) => {
    document.querySelector(`#bodiesPick .bp-opt[data-bodies="${bodies}"]`)?.click();
    document.getElementById("name").value = "Claude";
    document.getElementById("createBtn").click();
  }, { bodies: BODIES });
  await page.waitForFunction(() => !!window.KM?.state, { timeout: 9000 }).catch(() => log("  ✖ no state after create"));

  let nodesCleared = 0, lastPhase = null, combatShotAt = 0, stockTries = 0, stuckSince = Date.now();
  let wonHandled = false, done = false, draftLogged = false, sawBoss = false, bossClears = 0;
  const manualSet = new Set();   // SQUAD: bodies I've switched to manual (autoFire off) so I fully pilot them
  const mine = (s, you) => (s.players ?? []).filter((p) => (p.owner ?? p.id) === you);
  const possess = async (id) => { await send({ type: "possess", id }); if (!manualSet.has(id)) { await send({ type: "autoFire", on: false }); manualSet.add(id); } };
  const nextNodeId = (map) => { if (!map?.nodes) return null; const cur = map.nodes.find((n) => n.id === map.currentId); const links = (cur?.links ?? []).filter((id) => map.nodes.find((n) => n.id === id && !n.cleared)); return links[0] ?? (cur?.links ?? [])[0] ?? null; };
  const dumpState = (s, tag) => { try { writeFileSync(join(OUT, `state-${tag}.json`), JSON.stringify(s, null, 2)); } catch {} };

  while (Date.now() - T0 < BUDGET_MS) {
    const s = await getState();
    if (!s) { await sleep(200); continue; }
    const phase = s.phase;
    const you = await getYou();
    const me = s.players?.find((p) => p.id === you && !p.bot) || s.players?.find((p) => !p.bot) || s.players?.[0];

    if (phase !== lastPhase) {
      log(`PHASE → ${phase} (floor ${s.floor ?? "?"}${s.map?.bossName ? ", boss: " + s.map.bossName : ""})`);
      phaseLog.push({ phase, floor: s.floor, t: ((Date.now() - T0) / 1000).toFixed(1) });
      await shoot(phase, "enter"); lastPhase = phase; stuckSince = Date.now(); stockTries = 0; wonHandled = false;
    }
    if (s.boss && s.boss.hp > 0 && !sawBoss) { sawBoss = true; log(`  ⚔ BOSS ENGAGED: ${s.boss.name} (${s.boss.hp}/${s.boss.maxHp} hp)`); await shoot("playing", "boss-engage"); }

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
        const best = wheel.slice().sort((a, b) => bundleScore(b) - bundleScore(a))[0];
        const kit = (best.items ?? []).map((o) => o.key || o);
        if (BODIES > 1) {
          // SQUAD: draft a bundle for EACH of my undrafted bodies (possess the seat, then pick).
          if (undrafted) {
            await possess(undrafted.id);
            log(`  squad draft [${undrafted.name}] → ${best.bodyKey} (hp ${best.maxHp}, score ${bundleScore(best).toFixed(1)})`);
            await send({ type: "draftPick", bundle: best.id });
          }
        } else {
          log(`  draft → ${best.bodyKey} (hp ${best.maxHp}, score ${bundleScore(best).toFixed(1)})  kit: ${kit.join(",")}`);
          await send({ type: "draftPick", bundle: best.id });
        }
      } else if (s.draft?.classes?.[0]) await send({ type: "chooseClass", key: s.draft.classes[0].key });
    } else if (phase === "stock") {
      const st = s.stock;
      if (st?.canBegin) await send({ type: "stockBegin" });
      else if (stockTries < (st?.max ?? 12) && st?.palette?.length) {
        // add the LOWEST-ANTE foe (weakest gear → least burst; a Fire+TwinUchis foe is what one-shots me),
        // tie-break the lowest-HP body (easier kill = less incoming)
        let b = 0; st.palette.forEach((o, i) => {
          const cur = st.palette[b];
          if ((o.ante ?? 99) < (cur.ante ?? 99) || ((o.ante ?? 99) === (cur.ante ?? 99) && (o.maxHp ?? 99) < (cur.maxHp ?? 99))) b = i;
        });
        await send({ type: "stockAdd", idx: b }); stockTries++;
      } else { jsErrors.push({ kind: "STALL", text: "stock ante gate unreachable" }); break; }
    } else if (phase === "setup") {
      await send({ type: "start" });
    } else if (phase === "playing") {
      if (BODIES > 1) {
        // SQUAD: pilot EVERY one of my alive bodies — possess each, decide, act. Foes split across
        // lanes so each body faces less simultaneous burst; the caravan buffer + redundancy absorb a
        // knockdown that would instantly end a solo run.
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
      log("CARAVAN FELL — run over. combatLog tail:");
      for (const line of (s.combatLog ?? []).slice(-12)) log("    " + (typeof line === "string" ? line : JSON.stringify(line)));
      done = true;
    }

    if (done) break;
    if (phase !== "playing" && Date.now() - stuckSince > 14000) { jsErrors.push({ kind: "STALL", text: `stuck in '${phase}'>14s` }); dumpState(s, "stall"); break; }
    await sleep(200);
  }

  const fs = await getState();
  await shoot(fs?.phase ?? "end", "final").catch(() => {});
  writeFileSync(join(OUT, "report.json"), JSON.stringify({ when: new Date().toISOString(), viewport: VP, bodies: BODIES,
    nodesCleared, bossClears, finalPhase: fs?.phase ?? null, runWon: !!fs?.runWon, floor: fs?.floor ?? null, phases: phaseLog, jsErrors }, null, 2));
  await browser.close();
  try {
    if (process.platform === "win32") {
      spawnSync("powershell", ["-NoProfile", "-Command", `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`]);
      spawnSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"]);
    } else srv.kill("SIGKILL");
  } catch {}

  console.log("\n──────── PLAY-TO-WIN SUMMARY ────────");
  console.log(`phases     : ${phaseLog.map((p) => p.phase).join(" → ")}`);
  console.log(`nodes clr  : ${nodesCleared}   bossClears: ${bossClears}   final: ${fs?.phase}   floor: ${fs?.floor}   runWon: ${!!fs?.runWon}`);
  console.log(`screenshots: ${shots.length} → ${OUT}`);
  console.log(`JS errors  : ${jsErrors.length}`);
  process.exit(0);
}
run().catch((e) => { console.error("DRIVER ERROR:", e); process.exit(1); });
