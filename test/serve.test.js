// Serve-level test: the running server returns the page and every asset it references,
// plus the JSON endpoints. Catches 404s / wrong content-types that break the browser.
// Run (server must be up): bun run test/serve.test.js
const BASE = process.env.BASE ?? "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("❌ " + label); } };

const indexRes = await fetch(BASE + "/");
ok(indexRes.ok, `GET / → ${indexRes.status}`);
const html = await indexRes.text();
ok(html.includes("<canvas"), "index.html includes the combat canvas");
ok(html.includes('id="map"') && html.includes('id="inventory"'), "index.html has map + inventory panels");

// every referenced script/stylesheet must load
const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]))];
for (const a of assets) {
  const res = await fetch(BASE + a);
  ok(res.ok, `asset ${a} → ${res.status}`);
  if (a.endsWith(".js")) ok((res.headers.get("content-type") || "").includes("javascript"), `${a} served as javascript`);
}

// (the /content JSON endpoint + /cards.html gallery were retired 2026-06-24 — they served the
//  pre-rewrite cooldown-bar card model from content.js, which the live moxie/card game never reads.)

// foe art (generated SVG badges) must serve as svg — LIVE body keys (the retired
// killionaire/pixie/auditAngel were swapped out 2026-06-24; their art lingered on disk)
for (const id of ["rookie", "frugal", "leverage", "royalRat"]) {
  const r = await fetch(BASE + `/foes/${id}.svg`);
  ok(r.ok && (r.headers.get("content-type") || "").includes("svg"), `foe art /foes/${id}.svg`);
}

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
