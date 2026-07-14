// Telemetry report (owner ask 2026-06-12: "see what I'm always/never picking").
// Reads telemetry.jsonl (written by server.js) and prints pick RATES — every table is
// picked / offered, so "never picked despite N offers" is a real signal, not absence of
// data. Run: bun tools/telemetry-report.js   (optionally: bun tools/telemetry-report.js 7
// to only count the last 7 days)
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILE = join(import.meta.dir, "..", "telemetry.jsonl");
const days = Number(process.argv[2]) || 0;
const since = days > 0 ? Date.now() - days * 86_400_000 : 0;

let lines = [];
try { lines = readFileSync(FILE, "utf8").split("\n").filter(Boolean); }
catch { console.log("No telemetry.jsonl yet — play a (non-DEMO) run first."); process.exit(0); }
// PROVENANCE FILTER (owner 2026-07-09): by default the report shows GENUINE HUMAN play only —
// automated runs (harness:true) are dropped whole, and bot seat picks (bot:true) don't count as human
// choices. Set KEEP_HARNESS=1 to include everything. Old lines (no harness/bot field) pass through as
// human, so historical data isn't silently discarded.
const keepHarness = !!process.env.KEEP_HARNESS;
const evAll = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter((e) => e && e.ts >= since);
const harnessDropped = keepHarness ? 0 : evAll.filter((e) => e.harness === true).length;
const ev = keepHarness ? evAll : evAll.filter((e) => e.harness !== true);
const humanPick = (e) => keepHarness || e.bot !== true;   // a bot seat's pick is not a human choice

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
  console.log("\n== COMBAT — item presses (all fights, AUTO included) ==");
  for (const [k, v] of useRows) console.log(`${k.padEnd(14)} ${v.n}`);
}
if (Object.keys(bossFights).length) {
  console.log("\n== BOSSES ==");
  for (const [k, b] of Object.entries(bossFights))
    console.log(`${k.padEnd(16)} fights ${b.n}  losses ${b.lost}  avg ${(b.ticks / b.n / 10).toFixed(1)}s`);
}
console.log(`\nFights: ${fights} (${losses} lost) · Runs ended: ${runs.won ?? 0} won / ${runs.lost ?? 0} lost · Events: ${ev.length}`);
console.log(keepHarness
  ? `Provenance: KEEP_HARNESS=1 — automated + human data COMBINED (${evAll.length} events).`
  : `Provenance: GENUINE HUMAN only — dropped ${harnessDropped} harness events; bot-seat picks excluded. (KEEP_HARNESS=1 to include all.)`);
