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
  event("itch", "run-1", "run_end", { result: "lost" }),
  event("itch", "run-2", "run_start", { wheel: [] }),
  event("itch", "run-2", "restart_run"),
  event("itch", "run-2", "combat_start", { players: [] }),
  event(null, "run-3", "run_start", { wheel: [] }),
  event(null, "run-3", "combat_start", { players: [] }),
  { ...event("itch", "run-harness", "run_start", { wheel: [] }), harness: true },
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
  ok(!/run-harness/.test(itch) && /dropped 1 harness events/.test(itch),
    "default genuine-human provenance still excludes harness traffic");

  const all = report();
  ok(/direct\/unknown\s+1\s+1\s+0\s+0/.test(all),
    "unattributed traffic remains explicit in the unfiltered funnel");
  ok(/Page views and completed payments come from the storefront dashboard/.test(all),
    "report does not pretend game telemetry contains storefront views or payments");
  console.log(`TELEMETRY REPORT: ${passed} passed, 0 failed`);
} finally {
  if (scratch.startsWith(join(tmpdir(), "km-telemetry-report-")))
    rmSync(scratch, { recursive: true, force: true });
}
