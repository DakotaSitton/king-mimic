// King Mimic screenshotter — captures the demo-state screens via Edge's native
// `--headless --screenshot` flag. NO Playwright / CDP: those hang under Bun (and
// there's no Node on this box), so we drive Edge directly. The `?demo=` states are
// purpose-built to render deterministically on load, so a one-shot capture is exact.
//
// Usage:  bun tools/screenshot.js            (server must already be on :3000)
//         bun tools/screenshot.js won shop   (only those states)
// Driver: tools/shoot.ps1 boots the server, runs this, cleans up.
const EDGE = process.env.EDGE ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const URL = process.env.URL ?? "http://localhost:3000";
const OUT = "tools/shots";
const W = Number(process.env.W ?? 1120), H = Number(process.env.H ?? 820);

// Every screen worth eyeballing. Each maps to a ?demo= state in public/client.js.
const STATES = ["draft", "stock", "setup", "combat", "won", "shop"];
const want = process.argv.slice(2);
const states = want.length ? want : STATES;

for (const s of states) {
  const out = `${process.cwd()}\\${OUT}\\demo-${s}.png`;
  const profile = `${process.env.TEMP ?? "."}\\km-shot-${s}`;
  const proc = Bun.spawn([
    EDGE, "--headless=new", "--disable-gpu", "--no-first-run",
    "--no-default-browser-check", "--hide-scrollbars",
    `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
    "--run-all-compositor-stages-before-draw", "--virtual-time-budget=2000",
    `--screenshot=${out}`, `${URL}/?demo=${s}`,
  ], { stdout: "ignore", stderr: "ignore" });
  await proc.exited;
  const f = Bun.file(out);
  console.log(`${(await f.exists()) ? "✓" : "✗"} demo-${s}.png  (${(await f.exists()) ? (await f.size) : 0} bytes)`);
}
console.log("done");
