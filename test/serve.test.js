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

// JSON endpoints
const cRes = await fetch(BASE + "/content");
ok(cRes.ok, `GET /content → ${cRes.status}`);
const content = await cRes.json().catch(() => null);
ok(content && Object.keys(content.equipment || {}).length > 0, "/content returns equipment library");
ok(content && Object.keys(content.foes || {}).length > 0, "/content returns foes");

ok((await fetch(BASE + "/cards.html")).ok, "GET /cards.html (card gallery)");

// foe art (generated SVG badges) must serve as svg
for (const id of ["killionaire", "pixie", "auditAngel", "rookie"]) {
  const r = await fetch(BASE + `/foes/${id}.svg`);
  ok(r.ok && (r.headers.get("content-type") || "").includes("svg"), `foe art /foes/${id}.svg`);
}

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
