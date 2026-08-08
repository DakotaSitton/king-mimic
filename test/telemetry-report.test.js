// Storefront-source funnel regression for the CLI telemetry report.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let passed = 0;
const ok = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  passed++;
  console.log(`PASS: ${label}`);
};

const scratch = mkdtempSync(join(tmpdir(), "km-telemetry-report-"));
const file = join(scratch, "events.jsonl");
const now = Date.now();
const event = (source, runId, type, extra = {}) => ({
  ts: now, code: `R${runId.slice(-1)}`, runId, floor: 1, party: 1,
  harness: false, bots: 0, source, type, ...extra,
});
const events = [
  event("itch", "run-1", "run_start", { wheel: [] }),
  event("itch", "run-1", "combat_start", { players: [] }),
  event("itch", "run-1", "combat_start", { players: [] }),
  event("itch", "run-1", "room_result", { skew: "veteran",
    stocked: [{ body: "counterparty", level: 2, gear: ["oFire", "oLightning", "oSword"] }] }),
  event("itch", "run-1", "run_end", { result: "lost" }),
  event("itch", "run-2", "run_start", { wheel: [] }),
  event("itch", "run-2", "restart_run"),
  event("itch", "run-2", "combat_start", { players: [] }),
  event(null, "run-3", "run_start", { wheel: [] }),
  event(null, "run-3", "combat_start", { players: [] }),
  event("owner_lab", "run-owner", "run_start", { wheel: [{ body: "atlas", items: ["oSword"] }] }),
  { ...event("itch", "run-harness", "run_start", { wheel: [] }), harness: true },
  // 2026-08-04 provenance shapes: a Party companion's pick/result is stamped bot:false (human-
  // commanded since the all-hands change), historical/autopilot lines keep bot:true and stay
  // excluded, and a code-initiated possess carries auto:true for its own UI row.
  event("itch", "run-1", "draft_pick", { seat: "h-b1", body: "bloodfund", items: [], bot: false }),
  event("itch", "run-1", "draft_pick", { seat: "old-b1", body: "harnessOnly", items: [], bot: true }),
  event("itch", "run-1", "room_result", { result: "won", ticks: 100, players: [
    { seat: "h", owner: "h", bot: false, body: "juggernaut", cards: {} },
    { seat: "h-b1", owner: "h", bot: false, body: "frugal", cards: {} },
    { seat: "old-b2", owner: "old", bot: true, body: "phantomBot", cards: {} },
  ] }),
  event("itch", "run-1", "ui_interaction", { seat: "h", bot: false, surface: "squad", action: "possess" }),
  event("itch", "run-1", "ui_interaction", { seat: "h", bot: false, surface: "squad", action: "possess", auto: true }),
];

function report(...args) {
  const child = Bun.spawnSync(["bun", "run", "tools/telemetry-report.js", "--file", file, ...args], {
    cwd: join(import.meta.dir, ".."), stdout: "pipe", stderr: "pipe",
  });
  const output = new TextDecoder().decode(child.stdout) + new TextDecoder().decode(child.stderr);
  if (child.exitCode !== 0) throw new Error(`report exited ${child.exitCode}:\n${output}`);
  return output;
}

try {
  writeFileSync(file, events.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
  const itch = report("--source", "itch");
  ok(/itch\s+2\s+2\s+1\s+1/.test(itch),
    "itch funnel deduplicates combats and counts starts, first combats, ends, and replays");
  ok(!/direct\/unknown\s+/.test(itch), "--source itch excludes direct and unknown traffic");
  ok(/acquisition itch/.test(itch), "report footer states the active acquisition filter");
  ok(!/run-harness/.test(itch) && /dropped 1 harness/.test(itch),
    "default genuine-human provenance still excludes harness traffic");

  const all = report();
  ok(/direct\/unknown\s+1\s+1\s+0\s+0/.test(all),
    "unattributed traffic remains explicit in the unfiltered funnel");
  ok(!/owner_lab\s+/.test(all) && !/Atlas, Shrugging\s+/.test(all)
    && /dropped 1 harness and 1 owner-lab events/.test(all),
    "default public-human report excludes owner-lab events and names the dropped cohort");
  const owner = report("--source", "owner_lab");
  ok(/owner_lab\s+1\s+0\s+0\s+0/.test(owner) && /Atlas, Shrugging\s+1\s+0/.test(owner),
    "an explicit owner_lab source report can inspect the isolated playtest cohort");
  ok(/Page views and completed payments come from the storefront dashboard/.test(all),
    "report does not pretend game telemetry contains storefront views or payments");
  ok(/FOE LEVELS — generated non-boss opponents/.test(all) && /Level\s+2\s+1\s+100\.0%/.test(all),
    "report measures exact generated foe levels from room results");
  ok(/ROOM COMPOSITION — actual outcomes by generation bias/.test(all) && /veteran\s+1\s+1\.00\s+100\.0%/.test(all),
    "report audits actual room-composition outcomes by generation bias");
  // Party provenance (2026-08-04): companion bodies stamped bot:false are HUMAN results everywhere.
  // Display contract (owner 2026-08-07): tables print the REAL in-game names, never internal keys.
  ok(/Fat Cat/.test(all) && /Golden Golem/.test(all) && !/frugal/.test(all) && !/juggernaut/.test(all),
    "a Party seat's companion body appears in the human BODIES/measured tables under its in-game name");
  ok(!/phantomBot/.test(all), "a machine-piloted (bot:true) body result stays out of the human tables");
  ok(/Market-Crash Minotaur/.test(all) && !/bloodfund/.test(all),
    "a companion's hand-picked draft bundle counts as a human draft pick, printed by in-game name");
  ok(!/harnessOnly/.test(all), "a historical bot:true draft pick stays excluded (no fake reclassification)");
  ok(/squad\/possess \(auto\)/.test(all) && /squad\/possess\s{2,}/.test(all),
    "deliberate possession taps and auto-advance switches report as separate UI rows");
  console.log(`TELEMETRY REPORT: ${passed} passed, 0 failed`);
} finally {
  if (scratch.startsWith(join(tmpdir(), "km-telemetry-report-")))
    rmSync(scratch, { recursive: true, force: true });
}
