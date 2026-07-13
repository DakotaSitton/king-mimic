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

// SCENARIO GATE (dev capture tool, 2026-07-11): the {type:"scenario"} injection hook must NOT exist
// unless the server process was started with KM_SCENARIO=1. This suite's server is started WITHOUT
// it (the normal way), so a scenario message must be refused verbatim and the room left untouched.
await new Promise((resolve) => {
  const ws = new WebSocket(BASE.replace(/^http/, "ws") + "/ws");
  let refusal = null, devRefusal = null, settled = false;
  const done = (fn) => { if (settled) return; settled = true; clearTimeout(timer); try { fn?.(); } catch {} try { ws.close(); } catch {} resolve(); };
  const timer = setTimeout(() => done(() => ok(false, "scenario-gate: timed out waiting for the refusal")), 8000);
  ws.onerror = () => done(() => ok(false, "scenario-gate: websocket error"));
  ws.onopen = () => ws.send(JSON.stringify({ type: "create", name: "GateProbe", nt: true }));
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === "joined") {
      ws.send(JSON.stringify({ type: "scenario", spec: { name: "gate-probe", foes: [{ body: "frugal" }] } }));
      ws.send(JSON.stringify({ type: "devAction", action: "moxie" }));
    } else if (m.type === "error") {
      if (/developer lab/.test(m.message)) devRefusal = m.message;
      else refusal = m.message;
    } else if (m.type === "state" && refusal != null && devRefusal != null) {
      done(() => {
        ok(/disabled/.test(refusal), `scenario without KM_SCENARIO=1 is refused ("${refusal}")`);
        ok(/disabled/.test(devRefusal), `devAction without KM_SCENARIO=1 is refused ("${devRefusal}")`);
        ok(m.scenario == null, "refused scenario leaves the snapshot untagged");
        ok(m.phase === "draft", `refused scenario leaves the room untouched (phase ${m.phase})`);
      });
    }
  };
});

// ── WS SNAPSHOT-DELTA PROTOCOL (perf/net 2026-07-11) ────────────────────────────────────────
// The tick broadcast is keyframe+delta now (server.js broadcastState / public/net-delta.js).
// Prove the wire contract against the REAL running server with TWO sockets in one room:
//   • seq-tagged keyframes + gapless delta chain on socket A;
//   • socket B's out-of-cadence keyframes (its join + a snapFull request) land at seqs where A
//     got a DELTA — so A's delta-reconstructed state can be cross-checked against a genuinely
//     independent full snapshot of the SAME seq. That is the whole correctness claim of the
//     protocol: applying deltas yields exactly the state a keyframe would have carried.
{
  const { applyOps } = (await import("../public/net-delta.js")).default;
  // canonical stringify (sorted keys) — delta application can re-add keys in a different order,
  // and JSON key order is not semantics.
  const stable = (v) => JSON.stringify(v, (k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.keys(val).sort().map((kk) => [kk, val[kk]])) : val);
  const wsUrl = BASE.replace(/^http/, "ws") + "/ws";
  const dial = async (rec) => {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    ws.onmessage = (ev) => { try { rec.push(JSON.parse(ev.data)); } catch {} };
    return ws;
  };
  const aMsgs = [], bMsgs = [];
  const A = await dial(aMsgs);
  A.send(JSON.stringify({ type: "create", name: "DeltaProbeA", nt: true }));
  await new Promise((r) => setTimeout(r, 600));
  const joined = aMsgs.find((m) => m.type === "joined");
  ok(!!joined, "ws create → joined");
  const B = await dial(bMsgs);
  B.send(JSON.stringify({ type: "join", code: joined?.code ?? "", name: "DeltaProbeB" }));
  await new Promise((r) => setTimeout(r, 1400));
  B.send(JSON.stringify({ type: "snapFull" }));             // a client that hit a gap asks for this
  const bBefore = bMsgs.length;
  await new Promise((r) => setTimeout(r, 1800));            // > another half keyframe interval
  const aStream = aMsgs.filter((m) => m.type === "state" || m.type === "delta");
  ok(aStream.length > 20, `ws broadcast stream flows (${aStream.length} msgs)`);
  ok(aStream[0]?.type === "state" && aStream[0].seq != null, "first broadcast is a seq-tagged keyframe");
  ok(aStream.some((m) => m.type === "delta"), "deltas flow between keyframes");
  ok(aStream.filter((m) => m.type === "state").length >= 2, "periodic keyframes arrive");
  ok(bMsgs.slice(bBefore).some((m) => m.type === "state"), "snapFull → keyframe recovery within a tick");
  // reconstruct A's live state exactly the way the client does; record it at every seq
  const aStates = new Map(); // seq → stable(state) with the seq field removed
  let live = null, liveSeq = -1, chainOk = aStream.length > 1;
  for (const m of aStream) {
    if (m.type === "state") { live = structuredClone(m); liveSeq = m.seq; }
    else {
      if (m.base !== liveSeq) { chainOk = false; break; }
      applyOps(live, m.ops); liveSeq = m.seq;
    }
    const snap = structuredClone(live); delete snap.seq;
    aStates.set(liveSeq, stable(snap));
  }
  ok(chainOk, "seq chain is gapless; every delta bases on the previous snapshot");
  // cross-check: every full B received where A applied a DELTA must equal A's rebuilt state
  const aDeltaSeqs = new Set(aStream.filter((m) => m.type === "delta").map((m) => m.seq));
  let compared = 0, matched = 0;
  for (const m of bMsgs) {
    if (m.type !== "state" || !aDeltaSeqs.has(m.seq) || !aStates.has(m.seq)) continue;
    compared++;
    const snap = structuredClone(m); delete snap.seq;
    if (stable(snap) === aStates.get(m.seq)) matched++;
  }
  ok(compared >= 1, `independent same-seq keyframes to cross-check (${compared})`);
  ok(compared >= 1 && matched === compared, `delta-reconstructed state matches server keyframes exactly (${matched}/${compared})`);
  B.send(JSON.stringify({ type: "leave" }));
  A.send(JSON.stringify({ type: "leave" }));                // don't leave a ticking room behind
  await new Promise((r) => setTimeout(r, 150));
  B.close(); A.close();
}

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
