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
ok(!html.includes('/sim-results.html') && !html.includes('Full combat sim results'),
  "public lobby does not advertise the internal combat-simulation report");
ok(html.includes('apple-mobile-web-app-capable') && html.includes('rel="manifest"')
  && html.includes('id="iosInstallHint"') && html.includes('Add to Home Screen'),
  "iOS lobby exposes the installed full-screen escape hatch");
ok(html.includes('id="clockBtn"') && html.includes('aria-pressed="false"'),
  "top HUD includes one real, initially hidden player clock button");

const healthRes = await fetch(BASE + "/health");
ok(healthRes.ok && (await healthRes.json()).ok === true, `GET /health → ${healthRes.status}`);

// every referenced script/stylesheet must load
const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]))];
let servedClient = "", servedInventory = "";
for (const a of assets) {
  const res = await fetch(BASE + a);
  ok(res.ok, `asset ${a} → ${res.status}`);
  if (a.endsWith(".js")) ok((res.headers.get("content-type") || "").includes("javascript"), `${a} served as javascript`);
  if (a === "/client.js" && res.ok) servedClient = await res.text();
  if (a === "/inventory.js" && res.ok) servedInventory = await res.text();
}
// Deployment regression: the original ROOM OPTIONS logic was correct on the server, but the
// live site kept serving a stale renderer and soft-locked the restored won state. The serve suite
// must fail against any endpoint that does not contain the screen-aware overlay guards.
ok(servedClient.includes('if (_ovScreen === "won" && sig === _brSig) return;'),
  "served client rebuilds the Room cleared overlay after returning from setup");
ok(servedClient.includes('if (_ovScreen === "setup" && sig === _setupSig) return;'),
  "served client rebuilds setup after reselecting a room");
ok(!servedClient.includes("drawSummonStrip(me, myAllyTarget);")
  && servedClient.includes('kind: "summon"')
  && servedClient.includes("drawCompactSummonChip(s.a")
  && !servedClient.includes("drawSummonBody(s.a")
  && servedClient.includes("SUMMON_CHIP_H")
  && servedClient.includes('`${isFront ? "FRONT" : `#${rank}`} · `')
  && servedClient.includes("drawDepthBadge")
  && servedClient.includes('`${rank} FRONT`')
  && servedClient.includes("lateral: true"),
  "served client uses compact summon combat rows with HP/moxie/action and blocker-order badges");
ok(servedClient.includes("function maskDjinnLanePresentation(rawLanes, bossPanel)")
  && servedClient.includes('foe?.bodyKey === "djinn"')
  && servedClient.includes('bossPanel.bodyKey === "djinn" ? null : myTarget')
  && servedClient.includes('if (boss.bodyKey !== "djinn") foeBoxes.push'),
  "served Djinn copies share one presentation contract and the command deck cannot reveal the real target");
ok(servedClient.includes('send({ type: "restartRun" });')
  && servedClient.includes('data-leavetolobby="1"')
  && servedClient.includes('phase === "won" && !state.runWon'),
  "served completed-run screen has explicit forward and lobby exits above the map");
ok(!servedClient.includes('function renderShop()')
  && !servedClient.includes('type: "buyWare"')
  && !servedClient.includes('type: "rerollShop"')
  && servedClient.includes('node.type !== "shop"'),
  "served client removes shop presentation/actions and filters stale shop nodes");
ok(servedClient.includes('drawCompactSummonChip(e, _tc ? _tc.x : x')
  && servedClient.includes('detailW, "foe", e.id === myTarget'),
  "served client keeps hostile summons in the same compact HP/moxie/action grammar");
ok(servedClient.includes('data-${kind}panel="1"')
  && servedClient.includes('let _levelPanelOpen = false;')
  && servedClient.includes('let _deckPanelOpen = false;')
  && servedClient.includes('ov.querySelectorAll("[data-levelpanel]")')
  && servedClient.includes('ov.querySelectorAll("[data-deckpanel]")'),
  "served client defaults the level and deck/backpack detail panels to compact disclosures");
ok(servedClient.includes("+4 max HP per point") && servedClient.includes("preview ${Math.max(1"),
  "served level sheet shows cumulative and preview max HP for repeated health ranks");
ok(!servedClient.includes("HOW YOU DIED")
  && !servedClient.includes("clog-recap")
  && servedClient.includes("Full Combat Log · ")
  && servedClient.includes("trimStart()[0]"),
  "served defeat modal is one correctly colored chronological combat log without a duplicate recap");
ok(servedClient.includes('send({ type: "setClock", divisor: next });')
  && servedClient.includes("state.clock?.requests?.[you]")
  && servedClient.includes("CLOCK_DIVISORS = Object.freeze([1, 2, 4])"),
  "served clock control cycles the local human seat through the validated setClock protocol");
ok(servedClient.includes('1: "1×"')
  && servedClient.includes('2: "½×"')
  && servedClient.includes('4: "¼×"'),
  "served clock control contains normal, half-speed, and quarter-speed labels");
ok(servedClient.includes("const allyHeld = effective > authoritativeRequest;")
  && servedClient.includes("An ally is holding the slower")
  && servedClient.includes("Slowest player wins.")
  && servedClient.includes('setAttribute("aria-pressed", String(requested > 1))'),
  "served clock accessibility explains own request, effective speed, co-op priority, and slowdown state");
ok(servedClient.includes("if (IS_TOUCH && _inspectFoeId != null && !_foeHeld)")
  && servedClient.includes("tap anywhere to close"),
  "served touch foe inspector closes safely on the next deliberate tap");
ok(servedClient.includes("const boardCrowded = IS_TOUCH && boardBodyCount >= 5;")
  && servedClient.includes("boardCrowded ? 20 : 24")
  && servedClient.includes("Math.max(37, R_HERO + 1)"),
  "served mobile board keeps compact player art without shrinking the touch target");
ok(servedInventory.includes("km-body-opt")
  && !servedInventory.includes('upgrade point" + (me.levelPoints === 1 ? "" : "s") + " follow"')
  && !servedInventory.includes("bonusTag"),
  "served body picker omits redundant upgrade-points-follow copy");
ok(html.includes('id="planBtn"')
  && servedClient.includes('send({ type: "queueCard"')
  && servedClient.includes("queuedCardsShown")
  && servedClient.includes("PLAN #"),
  "served squad command UI exposes ordered per-body cast plans");
ok(servedClient.includes("drawGenericCastFx")
  && servedClient.includes('fx.sourceId !== activeId && fx.cardName'),
  "served client paints universal cast feedback and ally card-name callouts");
ok(servedInventory.includes("☷ COMMAND — select a body, deck and plan")
  && servedInventory.includes("window.KM.manageBody"),
  "served body sheet routes each commanded body into its own loadout manager");

const simPageRes = await fetch(BASE + "/sim-results.html");
const simPage = await simPageRes.text();
ok(simPageRes.ok && simPage.includes("Combat Sim Results") && simPage.includes("data-matrix=\"starters\""),
  `GET /sim-results.html serves the complete phone report shell â†’ ${simPageRes.status}`);
const simDataRes = await fetch(BASE + "/combat-sim-results.json");
let simData = null;
try { simData = await simDataRes.json(); } catch {}
ok(simDataRes.ok && simData?.matrices?.length === 2
  && simData.matrices.every((m) => m.rows?.length === 37),
  `GET /combat-sim-results.json serves both complete 37-body matrices â†’ ${simDataRes.status}`);

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

// SOLO ROOM UNDO: exercise the real WebSocket route, not only the pure engine function.
// A chosen fight exposes the setup rollback; taking it returns to the same room-options node;
// starting combat burns the checkpoint so a late rollback message is harmless.
{
  const { applyOps } = (await import("../public/net-delta.js")).default;
  const ws = new WebSocket(BASE.replace(/^http/, "ws") + "/ws");
  let state = null, seq = -1, joined = null;
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === "joined") joined = m;
    else if (m.type === "state") { state = m; seq = m.seq ?? -1; }
    else if (m.type === "delta" && state && m.base === seq) { applyOps(state, m.ops); seq = m.seq; }
  };
  const waitFor = async (pred, label) => {
    for (let i = 0; i < 80; i++) {
      if (pred()) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    ok(false, `room-back ws: timed out waiting for ${label}`);
    return false;
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.send(JSON.stringify({ type: "create", name: "RoomBackProbe", nt: true }));
  if (await waitFor(() => joined && state?.phase === "draft", "draft")) {
    const offer = state.draft?.wheel?.find((w) => w.offeredTo === joined.you);
    ok(!!offer, "room-back ws: solo draft offer exists");
    ws.send(JSON.stringify({ type: "draftPick", bundle: offer?.id }));
    if (await waitFor(() => state?.phase === "won", "trailhead room options")) {
      const fromId = state.map.currentId;
      const from = state.map.nodes.find((n) => n.id === fromId);
      const target = from?.links.map((id) => state.map.nodes.find((n) => n.id === id))
        .find((n) => n?.type === "combat");
      ok(!!target, "room-back ws: a combat room is available");
      ws.send(JSON.stringify({ type: "advance", to: target?.id }));
      if (await waitFor(() => state?.phase === "setup", "setup")) {
        ok(state.canReturnToRooms === true, "room-back ws: setup exposes Room options");
        ws.send(JSON.stringify({ type: "backToRooms" }));
        if (await waitFor(() => state?.phase === "won", "returned room options")) {
          ok(state.map.currentId === fromId, "room-back ws: rollback restores the prior map node");
          ws.send(JSON.stringify({ type: "advance", to: target?.id }));
          if (await waitFor(() => state?.phase === "setup", "setup again")) {
            ws.send(JSON.stringify({ type: "start" }));
            if (await waitFor(() => state?.phase === "playing", "combat")) {
              ws.send(JSON.stringify({ type: "backToRooms" }));
              await new Promise((r) => setTimeout(r, 200));
              ok(state?.phase === "playing" && state.canReturnToRooms === false,
                "room-back ws: combat permanently commits the room choice");
            }
          }
        }
      }
    }
  }
  try { ws.send(JSON.stringify({ type: "leave" })); } catch {}
  await new Promise((r) => setTimeout(r, 100));
  ws.close();
}

// ── WS SNAPSHOT-DELTA PROTOCOL (perf/net 2026-07-11) ────────────────────────────────────────
// ROOM CLOCK: exercise the real two-human WebSocket route. Each seat owns one request, the slowest
// present human wins, forged speeds are refused without mutating state, and a leaving partner stops
// holding the shared room slow. This intentionally runs in draft: the protocol is room-scoped while
// the client exposes the button only during live combat.
{
  const { applyOps } = (await import("../public/net-delta.js")).default;
  const wsUrl = BASE.replace(/^http/, "ws") + "/ws";
  const dial = async () => {
    const client = { ws: new WebSocket(wsUrl), state: null, seq: -1, joined: null, errors: [] };
    client.ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.type === "joined") client.joined = m;
      else if (m.type === "state") { client.state = m; client.seq = m.seq ?? -1; }
      else if (m.type === "delta" && client.state && m.base === client.seq) {
        applyOps(client.state, m.ops); client.seq = m.seq;
      } else if (m.type === "error") client.errors.push(m.message);
    };
    await new Promise((res, rej) => { client.ws.onopen = res; client.ws.onerror = rej; });
    return client;
  };
  const waitFor = async (pred, label) => {
    for (let i = 0; i < 100; i++) {
      if (pred()) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    ok(false, `room-clock ws: timed out waiting for ${label}`);
    return false;
  };

  const A = await dial();
  A.ws.send(JSON.stringify({ type: "create", name: "ClockProbeA", nt: true }));
  if (await waitFor(() => A.joined && A.state?.clock, "host snapshot")) {
    const B = await dial();
    B.ws.send(JSON.stringify({ type: "join", code: A.joined.code, name: "ClockProbeB" }));
    if (await waitFor(() => B.joined && A.state?.clock?.requests?.[B.joined.you] === 1,
      "partner clock request")) {
      const aId = A.joined.you, bId = B.joined.you;
      ok(A.state.clock.divisor === 1 && A.state.clock.requests[aId] === 1,
        "room-clock ws: both human seats begin at normal speed");

      A.ws.send(JSON.stringify({ type: "setClock", divisor: 2 }));
      if (await waitFor(() => A.state?.clock?.divisor === 2 && A.state.clock.requests[aId] === 2,
        "host half-speed request")
        && await waitFor(() => B.state?.clock?.divisor === 2, "partner half-speed snapshot"))
        ok(true, "room-clock ws: one human's half-speed request reaches the party");

      B.ws.send(JSON.stringify({ type: "setClock", divisor: 4 }));
      if (await waitFor(() => A.state?.clock?.divisor === 4 && A.state.clock.requests[bId] === 4,
        "partner quarter-speed request")
        && await waitFor(() => B.state?.clock?.divisor === 4, "partner quarter-speed snapshot"))
        ok(true, "room-clock ws: the slower quarter-speed request wins");

      A.ws.send(JSON.stringify({ type: "setClock", divisor: 1 }));
      if (await waitFor(() => A.state?.clock?.requests?.[aId] === 1, "host normal-speed request"))
        ok(A.state.clock.divisor === 4,
          "room-clock ws: one human cannot speed past a partner's slower request");

      const errorsBefore = B.errors.length;
      B.ws.send(JSON.stringify({ type: "setClock", divisor: 3 }));
      if (await waitFor(() => B.errors.length > errorsBefore, "invalid-speed refusal"))
        ok(/1.*½.*¼/.test(B.errors.at(-1)) && B.state?.clock?.divisor === 4,
          "room-clock ws: forged intermediate speed is refused without changing the room");

      B.ws.send(JSON.stringify({ type: "leave" }));
      if (await waitFor(() => A.state?.clock?.divisor === 1 && !(bId in A.state.clock.requests),
        "partner departure"))
        ok(true, "room-clock ws: a departed partner no longer holds the room slow");
    }
    try { B.ws.close(); } catch {}
  }
  try { A.ws.send(JSON.stringify({ type: "leave" })); } catch {}
  await new Promise((r) => setTimeout(r, 100));
  try { A.ws.close(); } catch {}
}

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
