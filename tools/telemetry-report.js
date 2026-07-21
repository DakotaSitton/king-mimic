// Telemetry report (owner ask 2026-06-12: "see what I'm always/never picking").
// Reads telemetry.jsonl (written by server.js) and prints pick RATES — every table is
// picked / offered, so "never picked despite N offers" is a real signal, not absence of
// data. Local: bun tools/telemetry-report.js [days]
// Production: bunx @railway/cli ssh cat /var/data/telemetry.jsonl | bun tools/telemetry-report.js --stdin
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eliteBodyAnte, itemTreasure } from "../game.js";

const args = process.argv.slice(2);
const argValue = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const FILE = argValue("--file") || process.env.KM_TELEMETRY_FILE || join(import.meta.dir, "..", "telemetry.jsonl");
const runOnly = argValue("--run");
const sourceOnly = argValue("--source");
const days = Number(args.find((a) => /^\d+(\.\d+)?$/.test(a))) || 0;
const since = days > 0 ? Date.now() - days * 86_400_000 : 0;

let lines = [];
try {
  const raw = args.includes("--stdin") ? await Bun.stdin.text() : readFileSync(FILE, "utf8");
  lines = raw.split("\n").filter(Boolean);
}
catch { console.log("No telemetry.jsonl yet — play a (non-DEMO) run first."); process.exit(0); }
// PROVENANCE FILTER (owner 2026-07-09): by default the report shows GENUINE HUMAN play only —
// automated runs (harness:true) are dropped whole, and bot seat picks (bot:true) don't count as human
// choices. Owner-lab runs are also excluded because their all-body offer set is intentionally not a
// public-alpha sample. Set KEEP_HARNESS=1 / KEEP_OWNER_LAB=1 explicitly to include either cohort.
// Old lines (no harness/bot/source field) pass through as human, so history isn't silently discarded.
const keepHarness = !!process.env.KEEP_HARNESS;
const keepOwnerLab = !!process.env.KEEP_OWNER_LAB || sourceOnly === "owner_lab";
const evAll = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter((e) => e && e.ts >= since
    && (!runOnly || e.runId === runOnly)
    && (!sourceOnly || (e.source ?? "direct/unknown") === sourceOnly));
const harnessDropped = keepHarness ? 0 : evAll.filter((e) => e.harness === true).length;
const ownerLabDropped = keepOwnerLab ? 0 : evAll.filter((e) => e.source === "owner_lab").length;
const ev = evAll.filter((e) => (keepHarness || e.harness !== true) && (keepOwnerLab || e.source !== "owner_lab"));
const humanPick = (e) => keepHarness || e.bot !== true;   // a bot seat's pick is not a human choice

// --- acquisition funnel: aggregate game milestones by the room's closed storefront tag ---------
// Storefront page views/payments stay in that storefront's own analytics. These rows cover the game
// side of the same cohort: run created, first combat reached, run ended, and explicit replay.
const acquisition = {};
const acquisitionRow = (source) => (acquisition[source] ??= {
  starts: new Set(), firstCombats: new Set(), ends: new Set(), replays: 0,
});
for (const e of ev) {
  const row = acquisitionRow(e.source ?? "direct/unknown");
  if (e.type === "run_start" && e.runId) row.starts.add(e.runId);
  if (e.type === "combat_start" && e.runId) row.firstCombats.add(e.runId);
  if (e.type === "run_end" && e.runId) row.ends.add(e.runId);
  if (e.type === "restart_run") row.replays++;
}
if (Object.keys(acquisition).length) {
  console.log("\n== ACQUISITION — game-side funnel ==");
  console.log("source                   starts  first combat  run ends  replays");
  for (const [source, row] of Object.entries(acquisition).sort((a, b) => a[0].localeCompare(b[0])))
    console.log(`${source.padEnd(24)} ${String(row.starts.size).padStart(6)}  ${String(row.firstCombats.size).padStart(12)}  ${String(row.ends.size).padStart(8)}  ${String(row.replays).padStart(7)}`);
  console.log("Page views and completed payments come from the storefront dashboard, not game telemetry.");
}

const bump = (m, k, f = "n") => { (m[k] ??= {}); m[k][f] = (m[k][f] ?? 0) + 1; };
const table = (title, m, offeredField, pickedField, pickedLabel) => {
  const rows = Object.entries(m)
    .map(([k, v]) => ({ key: k, offered: v[offeredField] ?? 0, picked: v[pickedField] ?? 0 }))
    .map((r) => ({ ...r, rate: r.offered ? (100 * r.picked / r.offered).toFixed(0) + "%" : "—" }))
    .sort((a, b) => (b.picked / (b.offered || 1)) - (a.picked / (a.offered || 1)));
  if (!rows.length) return;
  console.log(`\n== ${title} ==`);
  const w = Math.max(...rows.map((r) => r.key.length), 4);
  console.log(`${"".padEnd(w)}  offered  ${pickedLabel.padStart(7)}   rate`);
  for (const r of rows) console.log(`${r.key.padEnd(w)}  ${String(r.offered).padStart(7)}  ${String(r.picked).padStart(7)}   ${r.rate}`);
  const never = rows.filter((r) => r.offered >= 3 && r.picked === 0).map((r) => r.key);
  if (never.length) console.log(`NEVER ${pickedLabel} (≥3 offers): ${never.join(", ")}`);
};

// --- draft wheel: bodies & items offered vs locked ---------------------------------
const draftBodies = {}, draftItems = {};
for (const e of ev) {
  if (e.type === "run_start" || e.type === "draft_offer") for (const b of e.wheel ?? []) {
    bump(draftBodies, b.body, "offered");
    for (const it of b.items ?? []) bump(draftItems, it, "offered");
  }
  if (e.type === "draft_pick" && humanPick(e)) {
    bump(draftBodies, e.body, "picked");
    for (const it of e.items ?? []) bump(draftItems, it, "picked");
  }
}
table("DRAFT — bodies on the wheel", draftBodies, "offered", "picked", "locked");
table("DRAFT — items in bundles", draftItems, "offered", "picked", "locked");

// --- stocking: palette options offered vs invited -----------------------------------
const stockBodies = {}, stockItems = {};
for (const e of ev) {
  if (e.type === "palette_offer") for (const o of e.options ?? []) {
    bump(stockBodies, o.body, "offered");
    for (const g of o.gear ?? []) bump(stockItems, g, "offered");
  }
  if (e.type === "stock_pick" && humanPick(e)) {
    bump(stockBodies, e.body, "picked");
    for (const g of e.gear ?? []) bump(stockItems, g, "picked");
  }
}
table("STOCKING — foe bodies (palette slots seen vs invited)", stockBodies, "offered", "picked", "invited");
table("STOCKING — foe gear", stockItems, "offered", "picked", "invited");

// --- shop: wares shelved vs bought ---------------------------------------------------
const shop = {};
for (const e of ev) {
  if (e.type === "shop_offer") for (const k of e.wares ?? []) bump(shop, k, "offered");
  if (e.type === "shop_buy" && humanPick(e)) bump(shop, e.key, "picked");
}
table("SHOP — wares", shop, "offered", "picked", "bought");

// --- loot: dropped vs claimed (loot_offer = the FULL drop, incl. solo which auto-collects) ----------
const loot = {};
for (const e of ev) {
  if (e.type === "loot_offer") for (const k of e.cards ?? []) bump(loot, k, "offered");
  if (e.type === "loot_claim" && humanPick(e)) bump(loot, e.key, "picked");
}
table("LOOT — drops", loot, "offered", "picked", "claimed");

// --- combat: item presses (AUTO included) --------------------------------------------
const uses = {};
let fights = 0, losses = 0, bossFights = {}, runs = { won: 0, lost: 0 };
for (const e of ev) {
  if (e.type === "room_result") {
    fights++; if (e.result === "lost") losses++;
    for (const [k, n] of Object.entries(e.uses ?? {})) { (uses[k] ??= { n: 0 }); uses[k].n += n; }
    if (e.boss) { (bossFights[e.boss] ??= { n: 0, lost: 0, ticks: 0 }); const b = bossFights[e.boss]; b.n++; b.ticks += e.ticks ?? 0; if (e.result === "lost") b.lost++; }
  }
  if (e.type === "run_end") runs[e.result] = (runs[e.result] ?? 0) + 1;
}
const useRows = Object.entries(uses).sort((a, b) => b[1].n - a[1].n);
if (useRows.length) {
  console.log("\n== COMBAT — legacy aggregate casts (all seats, AUTO included) ==");
  for (const [k, v] of useRows) console.log(`${k.padEnd(14)} ${v.n}`);
}
if (Object.keys(bossFights).length) {
  console.log("\n== BOSSES ==");
  for (const [k, b] of Object.entries(bossFights))
    console.log(`${k.padEnd(16)} fights ${b.n}  losses ${b.lost}  avg ${(b.ticks / b.n / 10).toFixed(1)}s`);
}

// --- generated foe levels: future owner feedback should be measured, not inferred from gear -------
const foeLevels = {}, roomsWithKnownLevels = new Set(), roomsWithLeveledFoes = new Set();
let knownFoes = 0, unknownFoes = 0;
for (const e of ev) if (e.type === "room_result" && !e.boss) {
  const roomKey = `${e.runId ?? e.code}:${e.combat ?? e.ts}`;
  for (const foe of e.stocked ?? []) {
    if (!Number.isInteger(foe.level) || foe.level < 1) { unknownFoes++; continue; }
    knownFoes++; roomsWithKnownLevels.add(roomKey);
    foeLevels[foe.level] = (foeLevels[foe.level] ?? 0) + 1;
    if (foe.level > 1) roomsWithLeveledFoes.add(roomKey);
  }
}
if (knownFoes || unknownFoes) {
  console.log("\n== FOE LEVELS — generated non-boss opponents ==");
  for (const [level, n] of Object.entries(foeLevels).sort((a, b) => Number(a[0]) - Number(b[0])))
    console.log(`Level ${level.padStart(2)}  ${String(n).padStart(5)}  ${(100 * n / knownFoes).toFixed(1).padStart(5)}%`);
  if (roomsWithKnownLevels.size)
    console.log(`Rooms with any level 2+: ${roomsWithLeveledFoes.size}/${roomsWithKnownLevels.size} (${(100 * roomsWithLeveledFoes.size / roomsWithKnownLevels.size).toFixed(1)}%).`);
  if (unknownFoes) console.log(`Historical foes without a recorded level: ${unknownFoes} (excluded from percentages).`);
}

// --- room-composition outcomes by generator bias -----------------------------------------------
// This makes the biases auditable in real play: a label is only successful when the actual stocked
// foes show its tendency while still combining levels, rich gear, and occasional elite bodies.
const composition = {};
for (const e of ev) if (e.type === "room_result" && !e.boss && typeof e.skew === "string") {
  const foes = e.stocked ?? [];
  const known = foes.filter((f) => Number.isInteger(f.level) && f.level >= 1);
  const row = composition[e.skew] ??= { rooms: 0, foes: 0, levels: 0, known: 0, leveled: 0, rich: 0, elite: 0 };
  row.rooms++; row.foes += foes.length;
  row.known += known.length; row.levels += known.reduce((n, f) => n + f.level, 0);
  row.leveled += known.some((f) => f.level > 1);
  row.rich += foes.some((f) => (f.gear ?? []).some((k) => itemTreasure(k) > 1));
  row.elite += foes.some((f) => eliteBodyAnte(f.body) > 0);
}
if (Object.keys(composition).length) {
  console.log("\n== ROOM COMPOSITION — actual outcomes by generation bias ==");
  console.log("bias        rooms  avg foes  any L2+  avg level  rich gear  elite");
  for (const [skew, row] of Object.entries(composition).sort()) {
    const pct = (n) => `${(100 * n / row.rooms).toFixed(1)}%`;
    console.log(`${skew.padEnd(11)} ${String(row.rooms).padStart(5)}  ${(row.foes / row.rooms).toFixed(2).padStart(8)}`
      + `  ${pct(row.leveled).padStart(7)}  ${(row.known ? row.levels / row.known : 0).toFixed(2).padStart(9)}`
      + `  ${pct(row.rich).padStart(9)}  ${pct(row.elite).padStart(6)}`);
  }
}

// --- deck history: which randomized starter cards are cut at the first opportunity -----------
// A run becomes eligible only after combat #2 starts: a room-1 death gave the player no between-fight
// edit opportunity. Duplicate copies are compared as multisets. "ASAP" means reduced by combat #2.
const counts = (list = []) => {
  const out = {};
  for (const key of list) out[key] = (out[key] ?? 0) + 1;
  return out;
};
const histories = {};
for (const e of ev) if (e.type === "combat_start") {
  for (const p of e.players ?? []) {
    if (!humanPick(p)) continue;
    const id = `${e.runId ?? `${e.code}:${e.ts}`}|${p.seat ?? p.owner ?? "solo"}`;
    (histories[id] ??= []).push({ combat: e.combat ?? 0, starter: p.starterDeck ?? [], deck: p.deck ?? [] });
  }
}
const starterCuts = {};
for (const history of Object.values(histories)) {
  history.sort((a, b) => a.combat - b.combat);
  if (history.length < 2) continue;
  const starter = counts(history[0].starter?.length ? history[0].starter : history[0].deck);
  const second = counts(history[1].deck);
  for (const [key, startCopies] of Object.entries(starter)) {
    const row = (starterCuts[key] ??= { eligible: 0, asap: 0, ever: 0, full: 0, start: 0, removed: 0, firstCutSum: 0 });
    row.eligible++; row.start += startCopies;
    if ((second[key] ?? 0) < startCopies) row.asap++;
    let minCopies = startCopies, firstCut = 0;
    for (const snap of history) {
      const n = counts(snap.deck)[key] ?? 0;
      minCopies = Math.min(minCopies, n);
      if (!firstCut && n < startCopies) firstCut = snap.combat;
    }
    if (minCopies < startCopies) { row.ever++; row.firstCutSum += firstCut; }
    if (minCopies === 0) row.full++;
    row.removed += startCopies - minCopies;
  }
}
const cutRows = Object.entries(starterCuts)
  .map(([key, r]) => ({ key, ...r, asapRate: r.eligible ? 100 * r.asap / r.eligible : 0 }))
  .sort((a, b) => b.asapRate - a.asapRate || b.ever - a.ever || a.key.localeCompare(b.key));
if (cutRows.length) {
  console.log("\n== STARTER DECK — cuts at first real opportunity ==");
  console.log("card                 eligible  cut ASAP  ever cut  full cut  copies removed  avg first cut");
  for (const r of cutRows) console.log(
    `${r.key.padEnd(20)} ${String(r.eligible).padStart(8)}  ${`${r.asap} (${r.asapRate.toFixed(0)}%)`.padStart(8)}  ${String(r.ever).padStart(8)}  ${String(r.full).padStart(8)}  ${`${r.removed}/${r.start}`.padStart(14)}  ${(r.ever ? r.firstCutSum / r.ever : 0).toFixed(1).padStart(13)}`);
  console.log("ASAP = fewer copies at combat 2 than in the rolled starter; room-1 deaths are excluded.");
}

// --- UI interaction economy: semantic taps only, no coordinates/text/DOM selectors ----------------
const ui = {}, uiSurfaces = {};
for (const e of ev) if (e.type === "ui_interaction" && humanPick(e)) {
  const key = `${e.surface ?? "unknown"}/${e.action ?? "unknown"}`;
  ui[key] = (ui[key] ?? 0) + 1;
  uiSurfaces[e.surface ?? "unknown"] = (uiSurfaces[e.surface ?? "unknown"] ?? 0) + 1;
}
const uiTotal = Object.values(ui).reduce((n, v) => n + v, 0);
if (uiTotal) {
  console.log("\n== UI — semantic interactions (human seats) ==");
  console.log("surface totals: " + Object.entries(uiSurfaces).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n} (${(100 * n / uiTotal).toFixed(0)}%)`).join(" · "));
  console.log("action                         taps  share");
  for (const [key, n] of Object.entries(ui).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
    console.log(`${key.padEnd(30)} ${String(n).padStart(5)}  ${(100 * n / uiTotal).toFixed(1).padStart(5)}%`);
  console.log("Command rows are attempts (useful for friction); local rows are panel/navigation views.");
}

// --- card quality facts: draw conversion, stranded draws, affordability, and sustain ------------
const cardFacts = {}, bodyFacts = {};
let measuredFights = 0, measuredPlayers = 0;
const add = (obj, field, n = 0) => { obj[field] = (obj[field] ?? 0) + (Number(n) || 0); };
for (const e of ev) if (e.type === "room_result" && e.players?.length) {
  const measuredSeats = e.players.filter((p) => humanPick(p));
  if (!measuredSeats.length) continue;
  measuredFights++;
  for (const p of measuredSeats) {
    measuredPlayers++;
    const b = (bodyFacts[p.body ?? "unknown"] ??= { fights: 0, wins: 0, ticks: 0, absorbed: 0, hpDamage: 0, heal: 0, overheal: 0, locked: 0, rejected: 0 });
    b.fights++; if (e.result === "won") b.wins++; b.ticks += e.ticks ?? 0;
    add(b, "absorbed", p.shieldDamageAbsorbed); add(b, "hpDamage", p.hpDamage);
    add(b, "heal", p.healEffective); add(b, "overheal", p.overhealWasted);
    add(b, "locked", p.handLockedTicks); add(b, "rejected", Object.values(p.rejected ?? {}).reduce((n, v) => n + v, 0));
    for (const [key, c] of Object.entries(p.cards ?? {})) {
      const r = (cardFacts[key] ??= { fights: 0, copies: 0, draws: 0, casts: 0, manual: 0, auto: 0,
        held: 0, affordable: 0, unaffordable: 0, locked: 0, stranded: 0, unexposed: 0, rejected: 0,
        healAttempted: 0, healEffective: 0, overheal: 0, overhealShield: 0,
        shield: 0, shieldAbsorbed: 0, shieldSpent: 0 });
      r.fights++; add(r, "copies", c.deckCopies); add(r, "draws", c.draws); add(r, "casts", c.casts);
      add(r, "manual", c.manualCasts); add(r, "auto", c.autoCasts); add(r, "held", c.heldTicks);
      add(r, "affordable", c.affordableTicks); add(r, "unaffordable", c.unaffordableTicks);
      add(r, "locked", c.presentDuringHandLockTicks); add(r, "stranded", c.strandedDraws);
      add(r, "unexposed", c.unexposedEndDraws);
      add(r, "rejected", Object.values(c.rejected ?? {}).reduce((n, v) => n + v, 0));
      add(r, "healAttempted", c.healAttempted); add(r, "healEffective", c.healEffective);
      add(r, "overheal", c.overhealWasted); add(r, "overhealShield", c.overhealToShield);
      add(r, "shield", c.shieldGranted);
      add(r, "shieldAbsorbed", c.shieldDamageAbsorbed); add(r, "shieldSpent", c.shieldResourceSpent);
    }
  }
}
const factRows = Object.entries(cardFacts).map(([key, r]) => ({ key, ...r,
  castRate: r.draws ? 100 * r.casts / r.draws : 0,
  strandedRate: r.draws ? 100 * r.stranded / r.draws : 0,
  unaffRate: r.held ? 100 * r.unaffordable / r.held : 0,
})).sort((a, b) => b.strandedRate - a.strandedRate || b.unaffRate - a.unaffRate || a.key.localeCompare(b.key));
if (factRows.length) {
  console.log("\n== CARDS — draw conversion and affordability (human seats) ==");
  console.log("card                   draws  casts  cast%  stranded  unexposed end  unaffordable hold  rejected taps");
  for (const r of factRows) console.log(
    `${r.key.padEnd(21)} ${String(r.draws).padStart(6)}  ${String(r.casts).padStart(5)}  ${r.castRate.toFixed(0).padStart(4)}%  ${`${r.stranded} (${r.strandedRate.toFixed(0)}%)`.padStart(10)}  ${String(r.unexposed).padStart(13)}  ${`${r.unaffordable}/${r.held} (${r.unaffRate.toFixed(0)}%)`.padStart(18)}  ${String(r.rejected).padStart(13)}`);
  console.log("Stranded = drawn and still held at combat end; it is evidence, not an automatic 'trap' label.");
}
const sustainRows = factRows.filter((r) => r.healAttempted || r.shield || r.shieldAbsorbed)
  .sort((a, b) => (b.shieldAbsorbed + b.healEffective) - (a.shieldAbsorbed + a.healEffective));
if (sustainRows.length) {
  console.log("\n== CARDS — sustain contribution (human seats) ==");
  console.log("card                  heal requested/effective  wasted  to shield  shield granted  damage stopped/resource spent");
  for (const r of sustainRows) console.log(
    `${r.key.padEnd(21)} ${`${r.healAttempted}/${r.healEffective}`.padStart(24)}  ${String(r.overheal).padStart(6)}  ${String(r.overhealShield).padStart(9)}  ${String(r.shield).padStart(14)}  ${`${r.shieldAbsorbed}/${r.shieldSpent}`.padStart(29)}`);
}
const bodyRows = Object.entries(bodyFacts).sort((a, b) => b[1].fights - a[1].fights);
if (bodyRows.length) {
  console.log("\n== BODIES — measured combat outcomes (human seats) ==");
  console.log("body                   fights  win%  avg time  hand-lock avg  rejected taps  shield stopped  hp damage  heal / wasted");
  for (const [key, r] of bodyRows) console.log(
    `${key.padEnd(21)} ${String(r.fights).padStart(6)}  ${(100 * r.wins / r.fights).toFixed(0).padStart(3)}%  ${(r.ticks / r.fights / 10).toFixed(1).padStart(7)}s  ${(r.locked / r.fights / 10).toFixed(1).padStart(12)}s  ${String(r.rejected).padStart(13)}  ${String(r.absorbed).padStart(14)}  ${String(r.hpDamage).padStart(9)}  ${`${r.heal}/${r.overheal}`.padStart(14)}`);
}
console.log(`\nFights: ${fights} (${losses} lost) · Runs ended: ${runs.won ?? 0} won / ${runs.lost ?? 0} lost · Events: ${ev.length}`);
if (measuredFights) console.log(`Measured combat summaries: ${measuredFights} fights / ${measuredPlayers} human-seat results.`);
console.log(keepHarness || keepOwnerLab
  ? `Provenance overrides: KEEP_HARNESS=${keepHarness ? 1 : 0}, KEEP_OWNER_LAB=${keepOwnerLab ? 1 : 0} (${ev.length}/${evAll.length} events included).`
  : `Provenance: GENUINE PUBLIC HUMAN only — dropped ${harnessDropped} harness and ${ownerLabDropped} owner-lab events; bot-seat picks excluded. (KEEP_HARNESS=1 / KEEP_OWNER_LAB=1 to include those cohorts.)`);
console.log(`Source: ${args.includes("--stdin") ? "stdin (use Railway /var/data/telemetry.jsonl for production)" : FILE}${runOnly ? ` · run ${runOnly}` : ""}${sourceOnly ? ` · acquisition ${sourceOnly}` : ""}.`);
