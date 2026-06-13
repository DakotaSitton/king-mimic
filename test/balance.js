// King Mimic — PURE-ENGINE BALANCE SIMULATION HARNESS.
// Run: bun test/balance.js          (env RUNS=n to change boss-sim iterations, default 200)
//
// Read-only analysis: imports game.js directly (no server, no DOM), pins the canonical
// knobs (hpMult 1, cdMult 1) exactly like test/game.test.js, and produces the data behind
// BALANCE_REPORT.md:
//   A. Item DPS & gold-efficiency table (analytic, DPS = per-press dmg / (cd/10))
//   B. Foe-gear appearance rates (10k+ rolled foes through buildFoePool)
//   C. Boss time-to-kill / threat sims (bossRig-pattern, scripted party, RUNS per cell)
//   D. Body-template passive value per 10s (empirical 30s skirmish per template)
//   E. Ante-vs-threat audit (10k rolled foes: paid ante vs analytic gear DPS)
import * as G from "../game.js";
const { KIT, BODIES } = G;

G.setHpMult(1); // canonical knobs — same pins as test/game.test.js
G.setCdMult(1);

const RUNS = Number(process.env.RUNS ?? 200);
const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const median = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const section = (t) => console.log(`\n${"=".repeat(78)}\n${t}\n${"=".repeat(78)}`);

// ---------------------------------------------------------------------------
// A. ITEM DPS & EFFICIENCY
// ---------------------------------------------------------------------------
// Representative bodies: matching-school 1-Power and 3-Power WITHOUT school CDR or
// offensive passives that would pollute the number (echo bodies' bars never self-arm,
// so they are clean chassis): centaur/centaurR (phys 1/3), mouse/mouseR (mag 1/3).
const REP = { physical: ["centaur", "centaurR"], magical: ["mouse", "mouseR"] };
const SPAWNABLE = Object.keys(BODIES).filter((k) => BODIES[k].spawn);

// Analytic per-press damage of one item on one body (single-target; deal ops only;
// honors the engine's ≥1 weapon floor and Runeblade's swordFeedsStaff via powerFor).
function perPress(itemKey, bodyKey) {
  const b = BODIES[bodyKey];
  const item = KIT[itemKey];
  const stub = { bodyKey, phys: b.phys ?? 0, mag: b.mag ?? 0 };
  let per = 0;
  for (const op of item.ops ?? []) {
    if (op.do !== "deal") continue;
    let hit = (op.amount ?? 0) + (item.type ? G.powerFor(stub, item.type) : 0);
    if (item.type && hit < 1) hit = 1;
    per += hit;
  }
  return per;
}
function itemDps(itemKey, bodyKey) {
  const cd = G.itemCd({ key: itemKey, cd: KIT[itemKey].cd }, BODIES[bodyKey]); // body CDR honored
  const per = perPress(itemKey, bodyKey);
  return { per, cd, dps: per / (cd / 10) };
}

section("A. ITEM DPS & EFFICIENCY (analytic; DPS = per-press / (cd/10); single-target)");
const dealItems = Object.keys(KIT).filter((k) => (KIT[k].ops ?? []).some((o) => o.do === "deal"));
console.log("| item | type | cd(s) | ante | dmg@P1 | DPS@P1 | DPS/g@P1 | dmg@P3 | DPS@P3 | DPS/g@P3 | best body (DPS) | tgt |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const k of dealItems.sort((a, b) => (KIT[a].ante - KIT[b].ante) || a.localeCompare(b))) {
  const it = KIT[k];
  const school = it.type ?? "physical"; // untyped deal items don't exist; guard anyway
  const [b1, b3] = REP[school] ?? REP.physical;
  const d1 = itemDps(k, b1), d3 = itemDps(k, b3);
  // best case across every spawnable body (school CDR variants included)
  let best = null;
  for (const bk of SPAWNABLE) {
    const d = itemDps(k, bk);
    if (!best || d.dps > best.dps) best = { ...d, body: bk };
  }
  const tgt = it.ops.find((o) => o.do === "deal")?.target ?? "?";
  console.log(`| ${it.name} | ${it.type ?? "—"} | ${fmt(it.cd / 10, 1)} | ${it.ante} | ${d1.per} | ${fmt(d1.dps)} | ${fmt(d1.dps / it.ante)} | ${d3.per} | ${fmt(d3.dps)} | ${fmt(d3.dps / it.ante)} | ${best.body} (${fmt(best.dps)}) | ${tgt} |`);
}
console.log("\nNon-deal items (summons / utility / buffs), analytic notes:");
console.log("  summonRat:    cd 3.5s, ante 1 — token deals 0.5 DPS sustained while alive (1 every 2s)");
console.log("  summonBigRat: cd 5.5s, ante 1 — token deals 1.0 DPS sustained (2 every 2s, 3 HP)");
console.log("  knightBanner: cd 6.0s, ante 4 — token 0.5 DPS + lane aura (+1 dmg out, −1 in), 6 HP");
console.log("  totem(2g)/flag(2g): aura only (−1 in / +1 out per lane hit), 3 HP");
console.log("  heal: (staff+2)/3s · smallShield 1/2s · bigShield 3/4.5s · trustyShield 2/3.5s precharged");
console.log("  spikes: 1 thorns per fight (per-melee-hit reflect) · slimeCrown: worn, −1 every hit taken");
console.log("  haste(3g): 5s double charge per 8s cd (~62% uptime → ~+62% kit DPS while up)");
console.log("  powerBoost(3g): +2 BOTH Powers for 8s per 7s cd (near-permanent +2 — see report)");
console.log("  stoneSkin(3g): −2/hit for 8s per 7s cd (near-permanent) · gigaCast(5g): next staff item ×4, once/fight");
console.log("  timeStop(6g): freeze foe clocks 3s, once/fight · revive(6g): full-restore a downed ally, once/fight");

// ---------------------------------------------------------------------------
// B. FOE-GEAR APPEARANCE RATES
// ---------------------------------------------------------------------------
section("B. FOE-GEAR APPEARANCE RATES (buildFoePool pipeline)");
{
  const slot1 = {}, slot2 = {};
  let total = 0, withSecond = 0;
  while (total < 10000) {
    for (const o of G.buildFoePool()) {
      total++;
      slot1[o.gear[0]] = (slot1[o.gear[0]] ?? 0) + 1;
      if (o.gear[1]) { withSecond++; slot2[o.gear[1]] = (slot2[o.gear[1]] ?? 0) + 1; }
    }
  }
  console.log(`${total} rolled foes (${withSecond} carried a second item = ${fmt(100 * withSecond / total, 1)}%)\n`);
  console.log("| item | slot1 % | slot2 % | overall %/foe |");
  console.log("|---|---|---|---|");
  const keys = Object.keys(KIT).sort((a, b) =>
    ((slot1[b] ?? 0) + (slot2[b] ?? 0)) - ((slot1[a] ?? 0) + (slot2[a] ?? 0)));
  for (const k of keys) {
    const s1 = slot1[k] ?? 0, s2 = slot2[k] ?? 0;
    if (!s1 && !s2) continue;
    console.log(`| ${KIT[k].name} | ${fmt(100 * s1 / total, 1)} | ${fmt(100 * s2 / total, 1)} | ${fmt(100 * (s1 + s2) / total, 1)} |`);
  }
  const never = Object.keys(KIT).filter((k) => !slot1[k] && !slot2[k]);
  console.log(`\nNEVER appeared in ${total} rolls: ${never.map((k) => KIT[k].name).join(", ") || "(none)"}`);
  // classify: in any foe pool at all?  (constants mirrored from game.js "Foe DRAFT POOL",
  // snapshot 2026-06-12 — game.js is being edited live; re-mirror if these drift)
  const SPICY = ["fire", "lightning", "scaryKnife", "magicMissile", "darkness", "spear", "crossbow", "gangUp", "blizzard", "omnislash"];
  const SECOND = [...SPICY, "smallShield", "bigShield", "trustyShield", "slimeCrown", "totem", "flag", "summonRat", "blade", "bow", "hatchet", "spikes", "summonBigRat", "knightBanner"];
  const COMMON = ["blade", "bow", "hatchet"];
  for (const k of never) {
    const inAny = SPICY.includes(k) || SECOND.includes(k) || COMMON.includes(k);
    console.log(`  - ${KIT[k].name}: ${inAny ? "IN a pool but statistically absent" : "NOT in any foe pool (excluded by design or omission)"}`);
  }
  // secondary pipelines, for the footnote
  const cheap = {};
  for (let i = 0; i < 10000; i++) { const o = G.rollCheapOption(); cheap[o.gear[0]] = (cheap[o.gear[0]] ?? 0) + 1; }
  console.log("\nrollCheapOption (palette cheap-slot guarantee) slot1 split over 10k:");
  console.log("  " + Object.entries(cheap).map(([k, n]) => `${KIT[k].name} ${fmt(n / 100, 1)}%`).join(" · "));
  const decree = {};
  let decreeAnte = 0;
  for (let i = 0; i < 10000; i++) {
    const o = G.rollDecreeFoe();
    decreeAnte += G.anteOfFoe(o);
    for (const g of o.gear) decree[g] = (decree[g] ?? 0) + 1;
  }
  console.log("King Mimic DECREE gear split over 10k rolls (mean ante " + fmt(decreeAnte / 10000, 1) + "):");
  console.log("  " + Object.entries(decree).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${KIT[k].name} ${fmt(n / 100, 1)}%`).join(" · "));
}

// ---------------------------------------------------------------------------
// C. BOSS TIME-TO-KILL / THREAT SIMS
// ---------------------------------------------------------------------------
// bossRig pattern from test/game.test.js: N pixies (100 HP) one per lane, boss spawned by
// spawnBoss, caravan effectively infinite. Party kit: blade+bow+fire each. Scripted bot:
// every player presses every ready item every tick; ranged aims the BOSS while it stands,
// then mops the lowest-HP leftover. (The bot never rescues Kraken-stolen items — a steal
// permanently costs the victim one slot, which is itself part of the threat measurement.)
function bossSim(bossKey, players, floor) {
  const r = G.newRoom("BS");
  r.bossDraw = [bossKey, bossKey, bossKey];
  const ps = [];
  for (let i = 0; i < players; i++) ps.push(G.addPlayer(r, "p" + i, "P" + i));
  ps.forEach((p, i) => {
    G.wearBody(p, "pixie");
    p.maxHp = p.hp = 100; p.lane = i; p.ownedLane = i; p.depth = 0;
    p.inv = ["blade", "bow", "fire"].map((k) => ({ key: k, charge: 0, cd: KIT[k].cd }));
  });
  r.floor = floor; r.laneCount = players;
  r.lanes = Array.from({ length: players }, () => []);
  r.allies = Array.from({ length: players }, () => []);
  r.caravan = { hp: 1e9, max: 1e9 };
  const boss = G.spawnBoss(r);
  r.phase = "playing";
  let taken = 0, bossDeadTick = null, t = 0;
  const prev = ps.map((p) => p.hp);
  const CAP = 6000;
  while (r.phase === "playing" && t < CAP) {
    for (const p of ps) {
      if (!p.alive) continue;
      if (boss.hp > 0) p.targetId = boss.id;
      else {
        const foes = r.lanes.flat();
        if (foes.length) p.targetId = foes.reduce((a, f) => (f.hp < a.hp ? f : a)).id;
      }
      G.ensureTarget(r, p);
      for (let s = 0; s < p.inv.length; s++) G.useItem(r, p, s);
    }
    G.simulateTick(r);
    ps.forEach((p, i) => { if (p.hp < prev[i]) taken += prev[i] - p.hp; prev[i] = p.hp; });
    if (bossDeadTick == null && boss.hp <= 0) bossDeadTick = t + 1;
    t++;
  }
  return {
    won: r.phase === "won", ticks: t, bossDeadTick,
    takenPerPlayer: taken / players, timeout: t >= CAP,
  };
}

section(`C. BOSS TTK SIMS (${RUNS} runs/cell; party = pixies with blade+bow+fire; 100 HP each)`);
console.log("| boss | P | floor | budget | win% | med TTK boss (s) | med clear (s) | med dmg taken /player | timeouts |");
console.log("|---|---|---|---|---|---|---|---|---|");
const cells = [];
for (const bk of G.BOSS_BODIES) for (const floor of [1, 3]) for (const players of [1, 2]) cells.push([bk, players, floor]);
for (const players of [1, 2]) cells.push(["kingMimic", players, 4]);
for (const [bk, players, floor] of cells) {
  const res = [];
  for (let i = 0; i < RUNS; i++) res.push(bossSim(bk, players, floor));
  const wins = res.filter((x) => x.won);
  const ttk = median(wins.map((x) => x.bossDeadTick).filter((x) => x != null)) / 10;
  const clr = median(wins.map((x) => x.ticks)) / 10;
  const dmg = median(res.map((x) => x.takenPerPlayer));
  const to = res.filter((x) => x.timeout).length;
  console.log(`| ${BODIES[bk].name} | ${players} | ${floor} | ${G.bossBudget(players, floor)} | ${fmt(100 * wins.length / res.length, 0)} | ${fmt(ttk, 1)} | ${fmt(clr, 1)} | ${fmt(dmg, 0)} | ${to} |`);
}

// ---------------------------------------------------------------------------
// D. BODY TEMPLATE COMPARISON (base variant), 30s standard skirmish
// ---------------------------------------------------------------------------
// One player wears the body, holds ONE heavy item (cd 4.5–5s): the body's accel-trigger
// school if it has one, else its own school (fire 4.5s for mages, hatchet 5s for fighters).
// Presses it every cooldown, arms ECHO whenever lit. Incoming pressure: 2 dmg every 2s
// (feeds on-damaged accel + gives heals headroom). Passive value/10s =
// (measured dmg − baseline-presses × baseline per-press) + healing, normalized.
section("D. BODY TEMPLATE COMPARISON (base variant, 30s skirmish, value per 10s)");
function skirmish(bodyKey) {
  const r = G.newRoom("D");
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, bodyKey); p.lane = 0; p.depth = 0; p.maxHp = 500; p.hp = 250;
  const b = BODIES[bodyKey];
  const accelOn = b.accel?.on;
  const school = accelOn === "sword" ? "physical" : accelOn === "staff" ? "magical"
    : (b.mag ?? 0) > 0 ? "magical" : "physical";
  const itemKey = school === "magical" ? "fire" : "hatchet";
  p.inv = [{ key: itemKey, charge: 0, cd: KIT[itemKey].cd }];
  r.phase = "playing"; r.laneCount = 1; r.allies = [[]]; r.caravan = { hp: 1e9, max: 1e9 };
  const foe = G.spawnEnemy("lizardWizard", []); foe.hp = foe.maxHp = 1e9; r.lanes = [[foe]];
  let presses = 0, heal = 0, prevHp = p.hp;
  const TICKS = 300;
  for (let t = 1; t <= TICKS; t++) {
    if (p.echoReady) G.armEcho(r, p);
    if (p.inv[0].charge >= G.itemCd(p.inv[0], BODIES[p.bodyKey])) { G.useItem(r, p, 0); presses++; }
    if (t % 20 === 0) G.damagePlayer(r, p, 2);
    G.simulateTick(r);
    if (p.hp > prevHp) heal += p.hp - prevHp;
    prevHp = p.hp;
  }
  // baseline: a passive-less chassis with the same printed Power pressing on the nominal cd
  const basePow = school === "magical" ? (b.mag ?? 0) : (b.phys ?? 0);
  const basePer = Math.max(1, (KIT[itemKey].ops[0].amount ?? 0) + basePow);
  // matches the bot's actual press schedule (first press lands one full cd in):
  const basePresses = Math.floor((TICKS - 1) / KIT[itemKey].cd);
  const dmg = foe.maxHp - foe.hp;
  return { itemKey, dmg, presses, heal, baseline: basePresses * basePer,
    value10: ((dmg - basePresses * basePer) + heal) / (TICKS / 100) };
}
{
  const rows = [];
  for (const tpl of G.BODY_TEMPLATES) {
    // average 20 sims (summon lane RNG / rounding are mild, but cheap to smooth)
    const acc = { dmg: 0, heal: 0, presses: 0, value10: 0 };
    let item = "";
    for (let i = 0; i < 20; i++) {
      const s = skirmish(tpl.key);
      acc.dmg += s.dmg; acc.heal += s.heal; acc.presses += s.presses; acc.value10 += s.value10;
      item = s.itemKey;
    }
    rows.push({ key: tpl.key, name: BODIES[tpl.key].name, hp: BODIES[tpl.key].maxHp,
      item, dmg: acc.dmg / 20, heal: acc.heal / 20, presses: acc.presses / 20, value10: acc.value10 / 20 });
  }
  rows.sort((a, b) => b.value10 - a.value10);
  console.log("| body (base) | HP | item used | dmg/30s | heal/30s | presses | PASSIVE VALUE /10s |");
  console.log("|---|---|---|---|---|---|---|");
  for (const r of rows)
    console.log(`| ${r.name} | ${r.hp} | ${r.item} | ${fmt(r.dmg, 1)} | ${fmt(r.heal, 1)} | ${fmt(r.presses, 1)} | ${fmt(r.value10, 2)} |`);
}

// ---------------------------------------------------------------------------
// E. ANTE-vs-THREAT AUDIT
// ---------------------------------------------------------------------------
// 10k+ rolled foes (the live stocking pipeline). Threat = analytic single-target DPS of
// the foe's gear ON its body (school Power, CDR, ≥1 floor — the same math as section A,
// through the foe-side equipment cds spawnEnemy actually bakes).
section("E. ANTE-vs-THREAT AUDIT (10k rolled foes; gear DPS on the rolled body)");
function gearDps(bodyKey, gear) {
  const foe = G.spawnEnemy(bodyKey, gear); // equipment cds carry the body's school CDR
  let dps = 0;
  for (const it of foe.equipment) {
    const item = KIT[it.key];
    let per = 0;
    for (const op of item?.ops ?? []) {
      if (op.do !== "deal") continue;
      let hit = (op.amount ?? 0) + (item.type ? G.powerFor(foe, item.type) : 0);
      if (item.type && hit < 1) hit = 1;
      per += hit;
    }
    if (per > 0) dps += per / (it.cd / 10);
  }
  return dps;
}
{
  const samples = [];
  while (samples.length < 10000)
    for (const o of G.buildFoePool()) samples.push({ ...o, ante: G.anteOfFoe(o), dps: gearDps(o.bodyKey, o.gear) });
  const byAnte = new Map();
  for (const s of samples) {
    if (!byAnte.has(s.ante)) byAnte.set(s.ante, []);
    byAnte.get(s.ante).push(s.dps);
  }
  console.log("| ante | n | mean DPS | min | max | mean DPS/ante |");
  console.log("|---|---|---|---|---|---|");
  for (const a of [...byAnte.keys()].sort((x, y) => x - y)) {
    const v = byAnte.get(a);
    const mean = v.reduce((s, x) => s + x, 0) / v.length;
    console.log(`| ${a} | ${v.length} | ${fmt(mean)} | ${fmt(Math.min(...v))} | ${fmt(Math.max(...v))} | ${fmt(mean / a)} |`);
  }
  // worst value-for-the-King (low DPS per ante paid) and best (out-threaten their price)
  const ratio = samples.map((s) => ({ ...s, r: s.dps / s.ante }));
  ratio.sort((a, b) => a.r - b.r);
  const label = (s) => `${BODIES[s.bodyKey].name} + [${s.gear.map((g) => KIT[g].name).join(", ")}] ante ${s.ante} → ${fmt(s.dps)} DPS (${fmt(s.r)}/g)`;
  const uniq = (arr, n) => {
    const seen = new Set(), out = [];
    for (const s of arr) {
      const k = s.bodyKey + "|" + s.gear.join(",");
      if (seen.has(k)) continue;
      seen.add(k); out.push(s);
      if (out.length >= n) break;
    }
    return out;
  };
  console.log("\nWORST paid threats (lowest DPS per ante point):");
  for (const s of uniq(ratio, 8)) console.log("  - " + label(s));
  console.log("\nBEST value threats (highest DPS per ante point):");
  for (const s of uniq([...ratio].reverse(), 8)) console.log("  - " + label(s));
  const duds = samples.filter((s) => s.dps < 0.6);
  console.log(`\nDuds (gear DPS < 0.6) among ${samples.length}: ${duds.length} (${fmt(100 * duds.length / samples.length, 2)}%)`);
}

console.log("\n✅ balance harness complete.");
