// Serve-level test: the running server returns the page and every asset it references,
// plus the JSON endpoints. Catches 404s / wrong content-types that break the browser.
// Run (server must be up): bun run test/serve.test.js
import { PLAYER_POOL, WEARABLE_BODIES, BOSS_BODIES, PARTY_KIT_CARDS } from "../game.js";

const BASE = process.env.BASE ?? "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("❌ " + label); } };

const indexRes = await fetch(BASE + "/");
ok(indexRes.ok, `GET / → ${indexRes.status}`);
const html = await indexRes.text();
ok(html.includes("<canvas"), "index.html includes the combat canvas");
ok(html.includes('id="map"') && html.includes('id="inventory"'), "index.html has map + inventory panels");
ok(html.includes("body.touch.map-panel-open #map")
  && !html.includes("body.touch.map-top #draftOverlay")
  && html.includes('id="mapPanelClose"')
  && html.includes("body.touch .km-map-open")
  && !html.includes("body.touch .room-card-h .room-loot"),
  "mobile between-room view uses a dedicated map surface and keeps immediate-room loot visible");
ok(!html.includes('/sim-results.html') && !html.includes('Full combat sim results'),
  "public lobby does not advertise the internal combat-simulation report");
ok(html.includes('apple-mobile-web-app-capable') && html.includes('rel="manifest"')
  && html.includes('id="iosInstallHint"') && html.includes('Add to Home Screen'),
  "iOS lobby exposes the installed full-screen escape hatch");
ok(html.includes('<meta name="description" content="Wear the bodies of the foes you defeat. Take the throne."')
  && html.includes('property="og:description"') && html.includes('name="twitter:description"'),
  "served entry exposes truthful standard, Open Graph, and Twitter descriptions");
ok(html.includes('id="createBtn"') && html.includes('>Play Solo</button>')
  && html.indexOf('id="createBtn"') < html.indexOf('id="friendsPanel"')
  && html.includes('>Play With Friends</summary>'),
  "served cold start leads with Play Solo and keeps friends secondary");
ok(html.includes('<b>Party Mode</b>')
  && html.includes('2–4 bodies · each with a 10-card deck')
  && html.includes('data-bodies="1">Off</button>')
  && /#bodiesPick \.bp-opt\s*\{[^}]*place-items:center;[^}]*padding:0;/s.test(html),
  "served entry exposes Party Mode as an optional two-to-four-body party");
ok(html.includes('id="knowledgeBtn"') && html.includes('id="knowledgeBook"')
  && html.includes('data-knowledge-tab="basics"') && html.includes('data-knowledge-tab="bodies"')
  && html.includes('data-knowledge-tab="cards"') && html.includes('data-knowledge-tab="bosses"'),
  "served cold start exposes the four-section Knowledge Book dialog");
ok(html.includes('including your display name, room code, storefront source, gameplay choices, results, and combat logs')
  && html.includes('Raw pointer coordinates are not collected; the game has no chat.'),
  "served entry exposes the telemetry/privacy disclosure");
ok(!html.includes('github.com/DakotaSitton/king-mimic/issues'),
  "served entry has no private-repository feedback dead end");
ok(html.includes('id="clockBtn"') && html.includes('aria-pressed="false"'),
  "top HUD includes one real, initially hidden player clock button");

const healthRes = await fetch(BASE + "/health");
ok(healthRes.ok && (await healthRes.json()).ok === true, `GET /health → ${healthRes.status}`);

const knowledgeRes = await fetch(BASE + "/knowledge.json");
const knowledge = knowledgeRes.ok ? await knowledgeRes.json() : null;
ok(knowledgeRes.ok && Array.isArray(knowledge?.mechanics) && knowledge.mechanics.length >= 5,
  `GET /knowledge.json → ${knowledgeRes.status} with simple mechanics`);
ok(knowledge?.bodies?.length === WEARABLE_BODIES.length
  && WEARABLE_BODIES.every((key) => knowledge.bodies.some((body) => body.key === key && body.upgrades?.mastery && body.upgrades?.specialty)),
  "knowledge catalog contains every wearable body and both level-up bonuses");
ok(knowledge?.bodies?.every((body, index, bodies) => index === 0
  || bodies[index - 1].eliteTier < body.eliteTier
  || (bodies[index - 1].eliteTier === body.eliteTier && bodies[index - 1].name.localeCompare(body.name) <= 0)),
  "knowledge bodies are grouped by tier and alphabetized within each tier");
ok(knowledge?.cards?.length === PLAYER_POOL.length
  && PLAYER_POOL.every((key) => knowledge.cards.some((card) => card.key === key && card.name && card.text && Number.isFinite(card.cost))),
  "knowledge catalog contains every live player card with cost and effect text");
ok(knowledge?.cards?.every((card, index, cards) => index === 0
  || cards[index - 1].value < card.value
  || (cards[index - 1].value === card.value && cards[index - 1].name.localeCompare(card.name) <= 0)),
  "knowledge cards are grouped by value tier and alphabetized within each tier");
ok(knowledge?.bosses?.length === BOSS_BODIES.length + 1
  && knowledge.bosses.some((boss) => boss.key === "kingMimic")
  && knowledge.bosses.every((boss) => boss.passive && boss.cards.length),
  "knowledge catalog includes every floor boss plus King Mimic and their action decks");

// every referenced script/stylesheet must load
const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]))];
let servedClient = "", servedKnowledge = "", servedInventory = "", servedMap = "", servedCss = "", servedMapCss = "", servedManifest = null;
for (const a of assets) {
  const res = await fetch(BASE + a);
  ok(res.ok, `asset ${a} → ${res.status}`);
  if (a.endsWith(".js")) ok((res.headers.get("content-type") || "").includes("javascript"), `${a} served as javascript`);
  if (a === "/client.js" && res.ok) servedClient = await res.text();
  if (a === "/knowledge.js" && res.ok) servedKnowledge = await res.text();
  if (a === "/inventory.js" && res.ok) servedInventory = await res.text();
  if (a === "/map.js" && res.ok) servedMap = await res.text();
  if (a === "/style.css" && res.ok) servedCss = await res.text();
  if (a === "/map.css" && res.ok) servedMapCss = await res.text();
  if (a === "/manifest.json" && res.ok) { try { servedManifest = await res.json(); } catch {} }
}
ok(servedManifest?.description === "Wear the bodies of the foes you defeat. Take the throne.",
  "served manifest describes taking the throne, not protecting the caravan");
ok(servedKnowledge.includes('fetch("/knowledge.json")')
  && servedKnowledge.includes('data-knowledge-search')
  && servedKnowledge.includes('window.KM.knowledge')
  && servedCss.includes('.knowledge-shell')
  && servedCss.includes('.knowledge-cards'),
  "served Knowledge Book lazily loads live content, filters it, and ships responsive styling");
ok(servedClient.includes('url.searchParams.set("room", code)')
  && servedClient.includes("navigator.share(payload)")
  && servedClient.includes("navigator.clipboard?.writeText")
  && servedClient.includes("document.execCommand(\"copy\")"),
  "served client generates room invite URLs with native-share and copy fallbacks");
ok(servedClient.includes('ENTRY_PARAMS.get("room")')
  && servedClient.includes('Room ${code || "requested"} wasn’t found. Check the code, or Play Solo.')
  && servedCss.includes("body.touch.room-active #rotateNudge"),
  "served client recognizes room links, recovers missing rooms, and leaves portrait entry usable");
ok(servedClient.includes('OWNER_LAB_HASH.get("ownerLab")')
  && servedClient.includes('location.hash.replace(/^#/, "")')
  && servedClient.includes('searchParams.delete("ownerLab")')
  && servedClient.includes('OWNER_LAB_HASH.delete("ownerLab")')
  && servedClient.includes('ownerLabKey: OWNER_LAB_KEY || undefined')
  && servedClient.includes('Owner Playtest Lab')
  && servedCss.includes('.owner-lab-banner'),
  "served client consumes the private owner link and visibly labels the authenticated all-body draft");
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
  && servedClient.includes('bossPanel.laneBound ? null : myTarget')
  && servedClient.includes('if (!boss.laneBound) foeBoxes.push')
  && servedClient.includes('!laneEnemies.some((e) => e.boss)'),
  "served Djinn copies share one visible row contract and lane-bound command decks are not duplicate target surfaces");
ok(servedClient.includes('send({ type: "restartRun" });')
  && servedClient.includes('data-leavetolobby="1"')
  && servedClient.includes('phase === "won" && !state.runWon')
  && servedClient.includes('roomOverlay.classList.add("hidden");')
  && servedClient.includes('roomOverlay.innerHTML = "";'),
  "served completed-run screen has explicit forward and lobby exits above the map");
ok(servedClient.includes("function handSlotFromKey(e)") && servedClient.includes("const keyHint = `[${k + 1}] `"),
  "served hand supports resilient number-key slots and visible desktop key hints");
ok(servedClient.includes('kind === "sphinxChoice"')
  && servedClient.includes('send({ type: "passiveChoice", choice: pick });')
  && servedClient.includes('_pickHand?.card?.passiveChoice'),
  "served client presents the Stockbroking Sphinx choice in-hand and routes it authoritatively");
ok(servedClient.includes('title="Possible loot value">◈${n.loot} loot')
  && servedClient.includes("Possible drops:") && servedClient.includes("in random cards")
  && servedClient.includes('data-openmap="1"') && servedClient.includes("window.KM.openLevelMap?.()")
  && servedMap.includes('className = "map-inspector hidden"')
  && servedMap.includes("window.KM.openLevelMap = openPanel")
  && servedMap.includes('class="map-body"') && servedMap.includes("<small>${f.level")
  && servedMap.includes('dot.addEventListener("click", () => inspectNode')
  && servedMap.includes('if (nextNodeSig !== nodeSig)')
  && servedMap.includes('board.classList.add("is-inspecting")')
  && html.includes('aria-label="Close level map">CLOSE ×</button>')
  && servedMap.includes('aria-label="Back to full map">← MAP</button>')
  && /#mapPanelClose\s*\{[^}]*min-width:\s*76px;[^}]*min-height:\s*44px;/s.test(servedMapCss)
  && /\.map-inspector header button\s*\{[^}]*min-width:\s*68px;[^}]*min-height:\s*44px;/s.test(servedMapCss)
  && servedMap.includes('Every carried card shown below can drop')
  && !servedMap.includes("createElementNS")
  && !servedMapCss.includes(".map-lines"),
  "served room cards and the stable connector-free map expose touch-safe perfect-info inspection");
ok(!servedClient.includes("drawLaneBossMarker(")
  && !servedClient.includes("LANE_BOSS_MARKER_W")
  && servedClient.includes("const laneEnemies = lanes[i].enemies;")
  && servedClient.includes("drawFoeTacticalLane(i, stackBottom, laneTopBound, realFoes"),
  "served lane-bound bosses occupy distinct ordered tactical rows instead of detached or overlapping markers");
ok(/#draftOverlay \.victory-actions\s*\{[^}]*flex-direction:\s*column;[^}]*width:\s*100%;/s.test(servedCss)
  && /#draftOverlay \.victory-actions > \.advance-btn\.setup-position\s*\{[^}]*width:\s*100%;/s.test(servedCss),
  "served completed-run actions keep NEW RUN and Leave to lobby centered at equal full width");
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
// The level sheet must read the SERVER's HP constants, never a literal. It hardcoded
// "+4 max HP per point" until 2026-07-26, when the owner moved the point value to 3 and added a
// flat per-level grant — the label silently lied, and THIS ASSERTION was pinning the lie in place.
// Assert the mechanism (reads the snapshot, states the flat grant) plus the absence of any
// hardcoded per-point number, so the next constant change cannot desync the sheet again.
ok(servedClient.includes("+${hpp} max HP per point")
  && servedClient.includes("state?.levelHpPerPoint")
  && servedClient.includes("state?.levelHpFlatPer")
  && servedClient.includes("every level also grants +${hpFlatPer()}")
  && servedClient.includes("preview ${Math.max(1"),
  "served level sheet reads HP constants from the snapshot and states the flat per-level grant");
ok(!/\+\d+ max HP per point/.test(servedClient),
  "served level sheet hardcodes NO per-point HP number");
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
ok(servedClient.includes('? `◷ ${effectiveLabel}${pending ? "…" : ""}`')
  && /body\.touch #hud #clockBtn\s*\{[^}]*min-width:\s*64px;[^}]*min-height:\s*44px;/s.test(servedCss),
  "served touch clock is visibly labeled and keeps a full 64×44 thumb target");
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
  && servedClient.includes("☷ Auto Queue")
  && servedClient.includes("✓ Tap Cards")
  && servedClient.includes("AUTO #")
  && servedClient.includes("QUEUE 1"),
  "served Party command names and explains the ordered per-body auto-queue");
ok(/\.assign-chip-grid\s*\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/s.test(html)
  && servedClient.includes('<b>BODY ${index + 1} · ${escTip(bodyName)}</b>')
  && !servedClient.includes("data-assignmain"),
  "served Party loot modal gives every equal body two five-card rows and no append exception");
ok(servedClient.includes("drawGenericCastFx")
  && servedClient.includes('fx.sourceId !== activeId && fx.cardName'),
  "served client paints universal cast feedback and ally card-name callouts");
ok(servedInventory.includes("☷ COMMAND — select a body, deck & auto-queue")
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
  && simData.matrices.every((m) => m.rows?.length === 41),
  `GET /combat-sim-results.json preserves both historical 41-body matrices without an unrequested rerun â†’ ${simDataRes.status}`);

// (the /content JSON endpoint + /cards.html gallery were retired 2026-06-24 — they served the
//  pre-rewrite cooldown-bar card model from content.js, which the live moxie/card game never reads.)

// foe art (generated SVG badges) must serve as svg — LIVE body keys (the retired
// killionaire/pixie/auditAngel were swapped out 2026-06-24; their art lingered on disk)
for (const id of ["rookie", "frugal", "leverage", "royalRat", "gdpGiant", "hedgefundKnight", "psychicVeteran", "onePercenterCyclops",
  "bankruptBarghest", "recessionRevenant", "shortscerer", "callingCaltist", "salesSage"]) {
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

// PARTY MODE: the canonical wire API provisions one main body and fixed-size
// PARTY_KIT_CARDS companions (10 as of the 2026-07-29 owner ruling; was 5, was 3
// — the literal "3" here was never rebaselined on the 7/28 raise and sat red),
// and can resize the still-open draft without leaving stale bodies or offers
// behind.
{
  const { applyOps } = (await import("../public/net-delta.js")).default;
  const ws = new WebSocket(BASE.replace(/^http/, "ws") + "/ws");
  let state = null, seq = -1, joined = null, fullCount = 0, lastFullHasBodies = false;
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === "joined") joined = m;
    else if (m.type === "state") {
      state = m; seq = m.seq ?? -1; fullCount++; lastFullHasBodies = "bodies" in m;
    }
    else if (m.type === "delta" && state && m.base === seq) { applyOps(state, m.ops); seq = m.seq; }
  };
  const waitFor = async (pred, label) => {
    for (let i = 0; i < 100; i++) {
      if (pred()) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    ok(false, `party-mode ws: timed out waiting for ${label}`);
    return false;
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.send(JSON.stringify({ type: "create", name: "PartyProbe", nt: true, partySize: 4 }));
  if (await waitFor(() => joined && state?.phase === "draft" && state.players?.length === 4, "Party 4 draft")) {
    const mine = state.players.filter((player) => player.owner === joined.you);
    const main = mine.find((player) => player.id === joined.you);
    const companions = mine.filter((player) => player.id !== joined.you);
    ok(main?.partyRole === "main" && companions.length === 3
      && companions.every((player) => player.partyRole === "companion"),
    "party-mode ws: Party 4 exposes one main body and three companions");
    ok(state.draft.wheel.filter((offer) => offer.offeredTo === main.id)
      .every((offer) => offer.deckSize === 10)
      && companions.every((companion) => state.draft.wheel
        .filter((offer) => offer.offeredTo === companion.id)
        .every((offer) => offer.deckSize === PARTY_KIT_CARDS)),
    "party-mode ws: main offers have ten cards and companion offers have PARTY_KIT_CARDS");
    // PARTY-WIDE FOE AIM (owner 2026-07-30): a seat's foe-target applies to EVERY body it owns;
    // ally targets stay per-body. This is the message-layer contract — foe-id validity remains a
    // resolve-time concern (setTarget stores blindly), which is what lets it assert outside combat.
    ws.send(JSON.stringify({ type: "target", foeId: "zzAimProbe" }));
    if (await waitFor(() => state.players.filter((player) => player.owner === joined.you)
      .every((player) => player.targetId === "zzAimProbe"), "party-wide foe aim")) {
      ok(true, "party-mode ws: a foe-target propagates to every body the seat owns");
    }
    const allyMark = companions[0].id;
    ws.send(JSON.stringify({ type: "allyTarget", playerId: allyMark }));
    if (await waitFor(() => state.players.find((player) => player.id === joined.you)?.allyTargetId === allyMark,
      "per-body ally aim")) {
      ok(state.players.filter((player) => player.owner === joined.you && player.id !== joined.you)
        .every((player) => (player.allyTargetId ?? null) === null),
      "party-mode ws: an ally-target stays on the acting body only");
    }
    ws.send(JSON.stringify({ type: "setPartySize", n: 2 }));
    if (await waitFor(() => state?.players?.length === 2
      && state.players.every((player) => player.partySize === 2), "Party 2 resize")) {
      ok(state.draft.wheel.length === 6
        && state.draft.wheel.filter((offer) => offer.role === "companion")
          .every((offer) => offer.deckSize === PARTY_KIT_CARDS),
      "party-mode ws: draft resize removes stale bodies and preserves companion decks");
      const mainOffer = state.draft.wheel.find((offer) => offer.offeredTo === joined.you);
      ws.send(JSON.stringify({ type: "draftPick", bundle: mainOffer?.id }));
      if (await waitFor(() => state?.draft?.picks?.find((pick) => pick.id === joined.you)?.drafted,
        "main body draft pick")) {
        ws.send(JSON.stringify({ type: "setPartySize", n: 1 }));
        if (await waitFor(() => state?.phase === "won" && state.players?.length === 1,
          "completed downsized draft")) {
          ok(true, "party-mode ws: removing the last undrafted companion completes the draft");
          const beforeLegacyFull = fullCount;
          ws.send(JSON.stringify({ type: "snapFull", static: false }));
          if (await waitFor(() => fullCount > beforeLegacyFull, "legacy complete keyframe")) {
            ok(lastFullHasBodies,
              "party-mode ws: a client without compact capability keeps complete keyframes");
          }
        }
      }
    }
  }
  try { ws.send(JSON.stringify({ type: "leave" })); } catch {}
  await new Promise((r) => setTimeout(r, 100));
  ws.close();
}

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
  A.send(JSON.stringify({ type: "create", name: "DeltaProbeA", nt: true, compactSnapshots: true }));
  await new Promise((r) => setTimeout(r, 600));
  const joined = aMsgs.find((m) => m.type === "joined");
  ok(!!joined, "ws create → joined");
  const B = await dial(bMsgs);
  B.send(JSON.stringify({ type: "join", code: joined?.code ?? "", name: "DeltaProbeB", compactSnapshots: true }));
  await new Promise((r) => setTimeout(r, 1400));
  B.send(JSON.stringify({ type: "snapFull" }));             // a client that hit a gap asks for this
  const bBefore = bMsgs.length;
  await new Promise((r) => setTimeout(r, 1800));            // > another half keyframe interval
  const aStream = aMsgs.filter((m) => m.type === "state" || m.type === "delta");
  ok(aStream.length > 20, `ws broadcast stream flows (${aStream.length} msgs)`);
  ok(aStream[0]?.type === "state" && aStream[0].seq != null, "first broadcast is a seq-tagged keyframe");
  ok(aStream.some((m) => m.type === "delta"), "deltas flow between keyframes");
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
  const compactBefore = bMsgs.length;
  B.send(JSON.stringify({ type: "snapFull", static: false }));
  await new Promise((r) => setTimeout(r, 250));
  const compact = bMsgs.slice(compactBefore).find((m) => m.type === "state");
  ok(!!compact && !("bodies" in compact),
    "a client with the static catalog can recover through a compact keyframe");
  B.send(JSON.stringify({ type: "leave" }));
  A.send(JSON.stringify({ type: "leave" }));                // don't leave a ticking room behind
  await new Promise((r) => setTimeout(r, 150));
  B.close(); A.close();
}

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
