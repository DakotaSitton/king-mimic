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
// HEADLESS QUIRK (cost a midnight to find): on Windows, headless Edge clamps the
// window to the OS minimum width — 470 logical px on this box — while --screenshot
// still crops to the requested size. Ask for W<470 and the real viewport is 470:
// right-anchored fixed elements land OUTSIDE the crop and "disappear". So 470 is
// the narrowest honest phone-portrait shot; real narrower phones need a real phone.
const MIN_W = 470;
const W = Math.max(MIN_W, Number(process.env.W ?? 1120)), H = Number(process.env.H ?? 820);

// Every screen worth eyeballing. Each maps to a ?demo= state in public/client.js.
const STATES = ["draft", "stock", "setup", "combat", "won", "shop"];
const want = process.argv.slice(2);
const states = want.length ? want : STATES;

// FRESH profile per run + no disk cache (owner 2026-06-19): a REUSED profile let Edge cache
// client.js across runs, so screenshots showed STALE code even after the file changed (the
// no-store header didn't beat the persistent profile cache). A unique dir each run can't.
const RUN = Date.now();
for (const s of states) {
  const out = `${process.cwd()}\\${OUT}\\demo-${s}.png`;
  const profile = `${process.env.TEMP ?? "."}\\km-shot-${s}-${RUN}`;
  const proc = Bun.spawn([
    EDGE, "--headless=new", "--disable-gpu", "--no-first-run",
    "--no-default-browser-check", "--hide-scrollbars", "--disk-cache-size=1",
    `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
    "--run-all-compositor-stages-before-draw", "--virtual-time-budget=2000",
    `--screenshot=${out}`, `${URL}/?demo=${s}${process.env.QS ? "&" + process.env.QS : ""}`,
  ], { stdout: "ignore", stderr: "ignore" });
  await proc.exited;
  const f = Bun.file(out);
  console.log(`${(await f.exists()) ? "✓" : "✗"} demo-${s}.png  (${(await f.exists()) ? (await f.size) : 0} bytes)`);
}
console.log("done");
