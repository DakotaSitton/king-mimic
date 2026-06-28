// Phone-landscape screenshotter for the mobile UI pass. Drives headless Edge with a
// real device-scale-factor so the capture matches a phone (e.g. 844x390 @ dpr3).
// Usage: bun tools/shotphone.js <name> <demo> [W] [H] [DPR] [extraQS]
//   bun tools/shotphone.js before-combat cardcombat 844 390 3 "touch=1"
const EDGE = process.env.EDGE ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const URL = process.env.URL ?? "http://localhost:3000";
const OUT = "tools/shots";
const [name, demo = "cardcombat", W = "844", H = "390", DPR = "3", qs = "touch=1"] = process.argv.slice(2);
const RUN = Date.now();
const out = `${process.cwd()}\\${OUT}\\${name}.png`;
const profile = `${process.env.TEMP ?? "."}\\km-phone-${name}-${RUN}`;
const url = `${URL}/?demo=${demo}${qs ? "&" + qs : ""}`;
const proc = Bun.spawn([
  EDGE, "--headless=new", "--disable-gpu", "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars", "--disk-cache-size=1",
  `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
  `--force-device-scale-factor=${DPR}`,
  "--run-all-compositor-stages-before-draw", "--virtual-time-budget=2500",
  `--screenshot=${out}`, url,
], { stdout: "ignore", stderr: "ignore" });
await proc.exited;
const f = Bun.file(out);
console.log(`${(await f.exists()) ? "OK" : "FAIL"} ${out}  (${(await f.exists()) ? await f.size : 0} bytes)  url=${url}  vp=${W}x${H}@${DPR}`);
