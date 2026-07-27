// King Mimic client — thin renderer over the authoritative server snapshot.
// VERTICAL lanes: 3 columns, enemies up top charging downward, the Caravan is a bar along the
// bottom that you stand in front of. We never simulate locally — we draw the last 'state' message.

const $ = (id) => document.getElementById(id);

// layout — COLS is dynamic (lanes = player count, 1–4); per-lane WIDTHS are dynamic too
// (BORROWED WIDTH, owner picked D 2026-07-07) — see updateLaneWidths() below the band setup.
// The board got a 2026-06-10 readability overhaul: bigger canvas, big labeled cards with
// on-card passive text, fat threat bars. CSS caps the canvas at 100% width for phones.
// 2026-07-11 (owner "dead space" pass): W is a LET now — on a landscape phone fitBoardBox()
// (below, next to sizeCanvas) widens the logical width to the screen's real aspect so the board
// fills the viewport instead of letterboxing at the fixed 780. Everything downstream (lanes,
// hotbar slots, hit boxes, toCanvas click math) reads W at call time, so it all follows.
const BASE_W = 780;      // the tuned base surface — desktop and portrait always use exactly this
let W = BASE_W;
let COLS = 3;
// IS_TOUCH is a fixed device property (coarse primary pointer, or ?touch=1 to force it for
// screenshots/devtools). Decided ONCE here so the WHOLE mobile layout can branch off it and desktop
// keeps the exact literals below — byte-for-byte unchanged. (The touch HUD wiring still lives at its
// original spot far below; this is just the early read so the board geometry can use it.)
const IS_TOUCH = new URLSearchParams(location.search).has("touch") || matchMedia("(pointer: coarse)").matches;
// HARNESS (owner 2026-07-09): ?harness=1 marks this connection as an automated run (screenshot/co-op
// tools), forwarded on create/join so the server tags the run's telemetry harness:true. Lets an
// analyst filter automated data out of genuine human pick-rate stats. Inert for real players (false).
const ENTRY_PARAMS = new URLSearchParams(location.search);
const HARNESS = ENTRY_PARAMS.has("harness");
// Developer Lab is a two-key gate: the browser asks with ?dev=1, and the server must have been
// started with KM_SCENARIO=1. A production server ignores this request and never exposes controls.
const DEV_REQUESTED = ENTRY_PARAMS.has("dev");
// A private owner link carries its credential in the URL fragment so it never reaches the HTTP
// request/proxy logs. Accept the earlier query form as a fallback, capture either once in memory,
// then scrub both before any room or invite URL is generated. The server remains the authority.
const OWNER_LAB_HASH = new URLSearchParams(location.hash.replace(/^#/, ""));
const OWNER_LAB_KEY = OWNER_LAB_HASH.get("ownerLab") ?? ENTRY_PARAMS.get("ownerLab");
if (OWNER_LAB_HASH.has("ownerLab") || ENTRY_PARAMS.has("ownerLab")) {
  const cleanUrl = new URL(location.href);
  cleanUrl.searchParams.delete("ownerLab");
  OWNER_LAB_HASH.delete("ownerLab");
  cleanUrl.hash = OWNER_LAB_HASH.toString();
  history.replaceState(history.state, "", cleanUrl);
}
// Vertical bands. DESKTOP (owner 2026-06-19/24): the FRIENDLY ZONE between the foe stack and the
// caravan was cramped, and the HAND of cards (HOTBAR_H 92→140) is the main mechanic, so the board
// grew DOWNWARD; H feeds --bh and the CSS aspect-ratio/fit reads W/H back through --bw/--bh, so
// changing H here never needs a matching CSS edit.
// MOBILE (owner 2026-06-25): a landscape phone is wide+short (~2.2:1) but this board is a near-square
// vertical stack (foes → heroes → caravan → hand). Fit that tall surface to a short screen and the
// whole 780-wide board letterboxes to ~45% of the width — every hardcoded Npx font renders ~half size
// with big empty flanks. The ONLY lever that enlarges on-screen text is the logical→device SCALE
// (= displayedWidth / W). The board is width-capped by the viewport, so raising that scale means
// SHRINKING the logical HEIGHT until WIDTH (not height) is the fit constraint. So on touch we
// compress the vertical BANDS into a wide-short surface (H below) → ~2× text; foe cards + hero
// stack condense to fit (see render()). 2026-07-11: the residual letterbox (board 780/392 ≈ 1.99
// vs a ~2.4:1 phone box) is gone too — fitBoardBox() widens W to the measured box aspect, so the
// lanes/hotbar stretch across the WHOLE screen. All geometry + click math read the live W.
let PLAYER_Y, CARAVAN_Y, CARAVAN_H, HOTBAR_Y, HOTBAR_H, H;
if (IS_TOUCH) {
  HOTBAR_H = 96; CARAVAN_H = 22; H = 392;     // ~half the desktop height → the board fills the phone width
  HOTBAR_Y = H - HOTBAR_H - 2;                // the hand pinned to the bottom edge (stays the star on mobile)
  CARAVAN_Y = HOTBAR_Y - CARAVAN_H - 4;       // caravan bar just above the hand
  PLAYER_Y  = CARAVAN_Y - 24;                 // lane shield-band anchor (heroes derive REAR_Y from CARAVAN_Y)
} else {
  PLAYER_Y = 472; CARAVAN_Y = 498; CARAVAN_H = 30; HOTBAR_Y = 536; HOTBAR_H = 140;
  H = HOTBAR_Y + HOTBAR_H + 6;                 // 682
}
document.documentElement.style.setProperty("--bw", W);
document.documentElement.style.setProperty("--bh", H);
// ── CROWD MODE + BORROWED WIDTH (owner picked D, 2026-07-07) ────────────────────────────────
// The crush case (?demo=crush): 4 heroes + summons + 5 foes in ONE lane overflowed both ends of
// the board while near-empty lanes hoarded most of the width. Two-part fix, always on:
//   TRIAGE — a crowded lane SIDE keeps its headliners full-size and compresses the rest to
//   one-line rows, FIT BY CONSTRUCTION (a body can never be pushed off the board again);
//   BORROWED WIDTH — lane widths are weighted by occupancy, so the crowd gets the room.
// FLAG (owner re-tune): every knob for both parts lives in this block.
const CROWD_SLOTS = 3;                     // a lane side with MORE than this many slots enters crowd mode
const LANE_MIN_W = IS_TOUCH ? 84 : 110;    // slim walkable strip an empty lane keeps (floor-taps still land)
const LANE_MAX_FRAC = 0.58;                // the most crowded lane may borrow up to this share of the board
const LANE_W_SOFTCAP = 4;                  // occupancy a lane holds before it earns extra width (≤ everywhere → uniform, so uncrowded fights render exactly as before)
const FOE_FULL_H  = IS_TOUCH ? 34 : 56;    // crowd mode: desired full-row height (front / casting-next / your target)
const FOE_FULL_MIN = IS_TOUCH ? 24 : 34;   //   … its floor before the minis start giving instead
const FOE_MINI_H  = IS_TOUCH ? 15 : 18;    // crowd mode: one-line mini row height (everyone else)
const FOE_MINI_MIN = 10;                   //   … its floor before the last-resort proportional squeeze
const HERO_COMPACT_H = IS_TOUCH ? 20 : 22; // crowd mode: teammate compact-row height (possessed body stays full)
// ── NARROW-LANE DENSITY TIER (owner 2026-07-24: "the board at 4 players is unreadable") ──────
// At 3–4 lanes a phone-landscape lane is only ~215–305px wide. The foe row is a HORIZONTAL strip
// (portrait │ name+stats │ cast chip), so its name block collapsed to ~38px — foe names truncated
// to two characters ("Ca…") and the cast telegraph — the game's best mechanic — lost its card name
// ("0/10 B…"). Meanwhile a big empty band sat ABOVE the foe row: the lanes were starving sideways
// while wasting height. This tier trades that band for width: below LANE_NARROW_W the foe row
// STACKS (name row → stat rail → HP bar → FULL-WIDTH telegraph), grows into the free height, and
// the board drops repeated per-lane furniture (the tautological `1 FRONT` pill on a lane holding a
// single body, companion 🗡🎯 pips) instead of shrinking print below legibility.
// FLAG (owner re-tune): every threshold in this block is mine, not his.
const LANE_NARROW_W = 320;                 // a lane at/below this width enters the narrow tier
const FOE_STACK_MAX_W = 310;               // a foe card at/below this width stacks instead of stripping
const FOE_STACK_MIN_H = 54;                //   … and only when the row can seat name + stat rail +
                                           //   HP bar + telegraph (below this the wide strip is used)
const FOE_STACK_IDEAL_H = IS_TOUCH ? 104 : 96; // narrow lanes spend the empty band on a taller foe row
const HERO_INTENT_BAND = 26;               // narrow lanes reserve this above the name label for the
                                           //   compact teammate-intent badge (it used to collide with it)
// ── COMPACT BOSS RAIL (owner 2026-07-24: "I kept having foes go off screen … we need to be able to
// see 4 players and 4 foes in each lane") ────────────────────────────────────────────────────────
// A phone-landscape board holds 268 logical px above the caravan, and the hero column claims ~147 of
// them, so the foe planner never had more than ~121 to spend. The boss COMMAND DECK (identity + HP +
// RULE prose + full-width intent tiles carrying outcome prose) then took 92 of those, leaving ~37px
// for as many as six bodies — which is exactly why every lane of a 4-lane boss room collapsed to one
// `+N ADDS` row while 22 of 26 foes were invisible. At BOSS_RAIL_COLS lanes or more on a short touch
// board the deck folds to ONE RAIL: identity, HP bar, live stance, and one countdown chip per boss
// action. Nothing is deleted — HOLDING the rail opens the ordinary foe inspector, which already
// prints the rule, every threat in words, the whole cast deck, and the active effects.
// FLAG (owner re-tune): the fold threshold and all four rail measurements are mine, not his.
const BOSS_RAIL_COLS = 3;   // fold the deck at this many lanes or more (touch only — solo/2-lane keep it)
const BOSS_RAIL_H = 24;     //   … the folded rail's total height
const BOSS_RAIL_TOP = 3;    //   … its inset from the top edge of the board
const BOSS_RAIL_GAP = 3;    //   … and the clearance the foe stacks keep below it
const BOSS_RAIL_CHIPS = 3;  //   … how many live boss actions get a countdown chip (the rest hold-read)
// The height at which a foe row stops BEING a row — below this a body has neither a tappable surface
// nor a legible glyph. This, and nothing else, is what may trigger the `+N ADDS` aggregate: not lane
// width, and not a per-body ideal that a crowded lane can never afford.
// FLAG (owner re-tune): mine.
const FOE_ROW_FLOOR = IS_TOUCH ? 13 : 16;
// Summons use one compact combat row on both sides: small portrait, HP, moxie, and next action.
// Keep this shared with the layout planner so the painted row and its reserved space cannot drift.
const SUMMON_CHIP_H = IS_TOUCH ? 38 : 42;
// Compact paint must not mean a compact tap. Keep the visible row crisp while retaining the
// established 44px touch surface for direct heals/targets and feed that footprint to layout math.
const SUMMON_CHIP_HIT_H = IS_TOUCH ? 44 : SUMMON_CHIP_H;
const SUMMON_CHIP_MAX_W = IS_TOUCH ? 190 : 210;
// Per-lane geometry (set every render by updateLaneWidths; module-level so the CLICK handlers —
// which run between renders — hit-test against the same lanes the player is looking at).
let _laneX = [0, W / 3, (2 * W) / 3], _laneW = [W / 3, W / 3, W / 3];
const laneX = (i) => _laneX[i] ?? 0;
const laneW = (i) => _laneW[i] ?? W / COLS;
const colCenter = (i) => laneX(i) + laneW(i) / 2;
// x → lane index (floor-tap {lane:N} walking; replaces the uniform Math.floor(x / COLW))
const laneAt = (x) => { for (let i = COLS - 1; i >= 0; i--) if (x >= laneX(i)) return i; return 0; };
// BORROWED WIDTH: weight each lane by how many entities stand in it (both sides). A lane only
// earns extra width for occupancy BEYOND the softcap, so a normal 2–4-body fight stays uniform;
// the crush lane grows to LANE_MAX_FRAC while empty lanes shrink to a walkable LANE_MIN_W strip.
// Two crowded lanes split the surplus proportionally. Total always = W (exact, last lane absorbs
// the rounding), so lane fills/dividers/hit zones never gap or overlap.
function updateLaneWidths(lanes, players) {
  const counts = Array.from({ length: COLS }, (_, i) =>
    (players || []).filter((p) => p.lane === i).length
    + ((lanes?.[i]?.allies?.length) ?? 0)
    + ((lanes?.[i]?.enemies?.length) ?? 0));
  const weights = counts.map((c) => 1 + Math.max(0, c - LANE_W_SOFTCAP));
  const maxW = COLS === 1 ? W : Math.max(LANE_MIN_W, W * LANE_MAX_FRAC);
  const sumWt = weights.reduce((a, b) => a + b, 0) || COLS;
  let w = weights.map((wt) => (W * wt) / sumWt);
  for (let pass = 0; pass < 4; pass++) {                       // clamp → redistribute, a few passes settle it
    for (let i = 0; i < COLS; i++) w[i] = Math.max(LANE_MIN_W, Math.min(maxW, w[i]));
    const diff = W - w.reduce((a, b) => a + b, 0);
    if (Math.abs(diff) < 0.5) break;
    const adj = [...w.keys()].filter((i) => (diff > 0 ? w[i] < maxW : w[i] > LANE_MIN_W));
    if (!adj.length) break;
    for (const i of adj) w[i] += diff / adj.length;
  }
  _laneW = w.map((v) => Math.round(v));
  _laneW[COLS - 1] += W - _laneW.reduce((a, b) => a + b, 0);   // exact total — the last lane absorbs rounding
  _laneX = []; let x = 0;
  for (let i = 0; i < COLS; i++) { _laneX[i] = x; x += _laneW[i]; }
}
// 🗡/🎯 bonus label for an entity (owner 2026-06-25): its total bonus to melee / ranged cards.
// A generic +1 lifts BOTH, so they read equal (🗡🎯N) until a type-specific card diverges them
// (then 🗡A 🎯B). "" when the entity has no bonus.
const bonusLabel = (mb, rb) => {
  mb = mb || 0; rb = rb || 0;
  if (!mb && !rb) return "";
  if (mb === rb) return `🗡🎯${mb}`;
  return [mb ? `🗡${mb}` : "", rb ? `🎯${rb}` : ""].filter(Boolean).join(" ");
};
// R5 (owner: always-on): like bonusLabel but NEVER empty — a player's melee AND ranged damage
// bonus stays on their HUD line + hero token at ALL times (0 included), so you always know your
// damage add without opening anything. Foes still use the conditional bonusLabel above.
const bonusLabelAlways = (mb, rb) => {
  mb = mb || 0; rb = rb || 0;
  return mb === rb ? `🗡🎯${mb}` : `🗡${mb} 🎯${rb}`;
};
// Foes keep both numbers explicit. Collapsing equal values to 🗡🎯N made the melee value look like
// an unlabeled sword/target marker in the compact enemy row—the exact ambiguity these stats solve.
const foeBonusLabelAlways = (mb, rb) => `🗡${mb || 0} 🎯${rb || 0}`;

let ws = null, you = null, state = null;
let _queueEcho = null; // {bodyId,id,pick,at}; optimistic echo only, snapshots remain authoritative
let _planMode = false;
const _planQueueEcho = new Map(); // body id → {entries:[{id,pick}],at}; ordered input feedback only
// A touch that ends combat can otherwise be retargeted by the browser onto the room picker that
// just appeared under it. Gesture ids distinguish that carried release from a fresh immediate tap:
// no timer, no forced pause — the very next deliberate pointerdown is accepted normally.
let _pointerGesture = 0, _roomGuardGesture = -1;
const countPointerGesture = () => { _pointerGesture++; };
if ("PointerEvent" in window) document.addEventListener("pointerdown", countPointerGesture, true);
else {
  document.addEventListener("touchstart", countPointerGesture, true);
  document.addEventListener("mousedown", countPointerGesture, true);
}
function notePhaseChange(from, to) {
  if (from === "playing" && to === "won") _roomGuardGesture = _pointerGesture;
  else if (to !== "won") _roomGuardGesture = -1;
}
function consumeCarriedCombatClick(e) {
  if (_roomGuardGesture < 0) return false;
  if (e?.detail === 0 || _pointerGesture !== _roomGuardGesture) {
    _roomGuardGesture = -1;               // keyboard or a fresh pointer gesture: intentional
    return false;
  }
  _roomGuardGesture = -1;                 // consume only the carried release; never delay later taps
  e?.preventDefault?.();
  e?.stopPropagation?.();
  return true;
}
// SQUAD: which of YOUR bodies you're currently piloting. Defaults to your primary seat
// (`you`); clicking a squad body on the board re-points it (and tells the server to route
// your input there via {type:"possess"}). `me` everywhere below is the ACTIVE body, not
// just the primary seat — the hotbar/inventory/toggles all follow it.
let activeId = null;
// The piloted body: the possessed one if it still exists in the snapshot, else the primary
// seat. (A possessed body that dies/leaves the snapshot falls back so the HUD never blanks.)
const pilot = () => {
  const ps = state?.players;
  if (!ps) return null;
  return ps.find((p) => p.id === activeId) ?? ps.find((p) => p.id === you) ?? null;
};
// every body in YOUR squad (the seats your primary seat owns). `owner` equals `you` for
// your whole squad; legacy single-body snapshots have no `owner`, so the primary seat
// itself always counts as yours.
const isMine = (p) => p && (p.owner === you || p.id === you);
// Cycle possession among your living squad bodies. Returns true if it switched (squad > 1),
// so the caller can fall back to another behavior for solo play. Drives possess + HUD.
function cyclePossess(dir = 1) {
  const squad = (state?.players || []).filter((p) => isMine(p) && p.alive !== false);
  if (squad.length < 2) return false;
  let i = squad.findIndex((p) => p.id === activeId);
  if (i < 0) i = 0;
  const next = squad[(i + dir + squad.length) % squad.length];
  if (next.id === activeId) return true;
  activeId = next.id;
  setTargetArmed(false);
  send({ type: "possess", id: next.id });
  render();
  return true;
}

// ---- connection ----------------------------------------------------------
// Identity that survives refresh / phone-lock: TOKEN names this person's seat on the server;
// km_room remembers where to go back to. A drop mid-run auto-rejoins with both.
const TOKEN = (() => {
  let t = localStorage.getItem("km_token");
  if (!t) {
    t = crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
    localStorage.setItem("km_token", t);
  }
  return t;
})();
let myRoom = null, rejoinTimer = null, rejoinDelay = 1000, livenessTimer = null, msgSeq = 0;

// ── SNAPSHOT DELTA PROTOCOL, client side (perf/net 2026-07-11, tunnel-lag work) ─────────────
// The server now broadcasts a FULL snapshot ({type:"state", seq} — a keyframe) every N ticks and
// {type:"delta", seq, base, ops} JSON patches in between (public/net-delta.js is the shared
// codec). We apply deltas IN PLACE onto `state`; a seq gap, an out-of-order base, or an apply
// failure sends {type:"snapFull"} and the server re-keyframes this socket on its next tick —
// the board can lag ≤100ms behind but can never render a corrupted snapshot.
let _snapSeq = -1, _fullReqAt = 0, _staticBodies = null, _netRenderRaf = 0;
// Bounded, privacy-safe client timing counters. The two-client harness reads these to distinguish
// transport gaps from JSON/apply/render stalls without recording raw input or gameplay content.
window.__perfStats = {
  messages: 0, maxGapMs: 0, maxParseMs: 0, maxApplyMs: 0, maxRenderMs: 0,
  over50ms: 0, over100ms: 0, keyframeMaxBytes: 0, lastMessageAt: 0,
  longTasks: 0, maxLongTaskMs: 0, keyframes: [],
};
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perfStats.longTasks++;
      window.__perfStats.maxLongTaskMs = Math.max(window.__perfStats.maxLongTaskMs, entry.duration);
    }
  }).observe({ type: "longtask", buffered: true });
} catch {}
function _perfSample(kind, ms) {
  const s = window.__perfStats;
  const key = kind === "parse" ? "maxParseMs" : kind === "apply" ? "maxApplyMs" : "maxRenderMs";
  s[key] = Math.max(s[key], ms);
  if (ms >= 50) s.over50ms++;
  if (ms >= 100) s.over100ms++;
}
function _scheduleNetRender() {
  if (_netRenderRaf) return;
  _netRenderRaf = requestAnimationFrame(() => {
    _netRenderRaf = 0;
    render();
    if (_auto) autoStep();
  });
}
// FLAG 500ms (owner re-tune): keyframe-request throttle — a burst of undeliverable deltas right
// after a gap must collapse into ONE snapFull, not a request per message.
function _requestFull() {
  const now = Date.now();
  if (now - _fullReqAt < 500) return;
  _fullReqAt = now;
  window.__netStats.keyframeReqs++;
  send({ type: "snapFull", static: !_staticBodies });
}
// live wire accounting — the measurement/latency harnesses read this (window.__netStats)
window.__netStats = { msgs: 0, bytes: 0, full: 0, fullBytes: 0, delta: 0, deltaBytes: 0, keyframeReqs: 0 };
function _netStat(raw, isFull) {
  const n = typeof raw === "string" ? raw.length : (raw?.byteLength ?? 0);
  const s = window.__netStats;
  s.msgs++; s.bytes += n;
  if (isFull) { s.full++; s.fullBytes += n; } else { s.delta++; s.deltaBytes += n; }
}

const banner = document.createElement("div");
banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99;background:#7a2d2d;color:#ffe;" +
  "font:13px ui-monospace,monospace;text-align:center;padding:4px;display:none";
banner.textContent = "⚡ Connection lost — reconnecting…";
document.body.appendChild(banner);

// SETUP deck-editor reopen button: floats over the board while the setup editor is dismissed
// (so you can position your party, then tap to reopen the deck/level-up panel). Shown only in
// the setup phase when dismissed; hidden everywhere else (managed in renderSetup/renderOverlay).
const setupReopen = document.createElement("button");
setupReopen.id = "setupReopen";
setupReopen.className = "hidden";
setupReopen.textContent = "✎ Edit deck / level up";
setupReopen.onclick = () => {
  uiTelem("panel", "setup_reopen");
  _setupDismissed = false; _setupSig = ""; renderSetup(); render();
};
document.body.appendChild(setupReopen);

function connect(onOpen) {
  // A refused create/join leaves its socket open but unattached. Reusing the entry controls should
  // replace that socket instead of accumulating idle connections behind repeated recovery attempts.
  if (ws && ws.readyState <= 1) {
    ws.onopen = null; ws.onclose = null; ws.onerror = null;
    try { ws.close(); } catch {}
  }
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = onOpen;
  ws.onmessage = (ev) => {
    msgSeq++;                       // liveness tick: forceReconnect() watches this to know the socket is truly live
    const receivedAt = performance.now();
    const perf = window.__perfStats;
    if (perf.lastMessageAt && document.visibilityState === "visible")
      perf.maxGapMs = Math.max(perf.maxGapMs, receivedAt - perf.lastMessageAt);
    perf.lastMessageAt = receivedAt;
    perf.messages++;
    const parseAt = performance.now();
    const msg = JSON.parse(ev.data);
    _perfSample("parse", performance.now() - parseAt);
    if (msg.type === "joined") {
      you = msg.you;
      activeId = msg.you;          // pilot your primary body until you possess another
      _planMode = false; _planQueueEcho.clear();
      _castFxSeen = 0; _castFxActive.length = 0; _castFxAnchors.clear();
      myRoom = msg.code;
      pendingJoinCode = "";
      rejoinDelay = 1000;
      banner.style.display = "none";
      localStorage.setItem("km_room", msg.code);
      $("roomCode").textContent = "ROOM " + msg.code;
      enterRoomSurface(msg.code);
      sizeCanvas();
    } else if (msg.type === "state") {
      // a PHASE CHANGE dismisses any floating inspect tip — without this, a tip opened by tap
      // (kit card / foe chip) lingers over the NEXT screen when the phase flips without a local
      // click (e.g. the last co-op partner locks the draft while your card tip is open).
      _netStat(ev.data, true);
      const keyframeBytes = typeof ev.data === "string" ? ev.data.length : (ev.data?.byteLength ?? 0);
      perf.keyframeMaxBytes = Math.max(perf.keyframeMaxBytes, keyframeBytes);
      perf.keyframes.push({ at: Math.round(receivedAt), bytes: keyframeBytes });
      if (perf.keyframes.length > 24) perf.keyframes.shift();
      if (msg.bodies) _staticBodies = msg.bodies;
      else if (_staticBodies) msg.bodies = _staticBodies;
      else { _requestFull(); return; }
      const prevPhase = state?.phase;
      if (prevPhase !== msg.phase) { foeTip.classList.add("hidden"); _tw.clear(); }  // a new screen never slides in from the old one's geometry
      notePhaseChange(prevPhase, msg.phase);
      state = msg;
      _snapSeq = msg.seq ?? -1;                    // keyframe → this is the new delta base
      // interp-registry hygiene: on keyframes, drop tween entries not painted for a while
      if (_tw.size > 400) { const cut = performance.now() - 2000; for (const [k, t] of _tw) if (t.at < cut) _tw.delete(k); }
      _scheduleNetRender();
    } else if (msg.type === "delta") {
      // JSON patch between snapshots. Apply IN PLACE, strictly in seq order; anything off →
      // ask for a keyframe and drop this message (the server re-fulls us within a tick).
      _netStat(ev.data, false);
      if (!state || msg.base !== _snapSeq) { _requestFull(); return; }
      const prevPhase = state.phase;
      const applyAt = performance.now();
      try { KMDelta.applyOps(state, msg.ops); _snapSeq = msg.seq; }
      catch (e) { console.warn("delta apply failed — requesting keyframe", e); _requestFull(); return; }
      _perfSample("apply", performance.now() - applyAt);
      if (prevPhase !== state.phase) { foeTip.classList.add("hidden"); _tw.clear(); }
      notePhaseChange(prevPhase, state.phase);
      _scheduleNetRender();
    } else if (msg.type === "error") {
      if (/No such room/i.test(msg.message)) {
        // A missing invite/manual join gets an actionable recovery. A stale saved-room auto-rejoin
        // stays silent on cold load, while an in-game room reap explains what happened.
        const attemptedRoom = pendingJoinCode || myRoom || cleanRoomCode($("code").value);
        const wasInGame = you !== null;
        stopRejoin();
        myRoom = null; you = null; activeId = null; state = null;
        localStorage.removeItem("km_room");
        banner.style.display = "none";
        showEntryLobby();
        if (wasInGame || pendingJoinCode) showRoomRecovery(attemptedRoom, wasInGame);
        else $("lobbyErr").textContent = "";
        pendingJoinCode = "";
        return;
      }
      $("lobbyErr").textContent = msg.message;
    }
  };
  ws.onclose = () => { if (you && myRoom) scheduleRejoin(); };
  // An error that never produces a clean close (e.g. a half-dead pipe) still needs to route to
  // the same rejoin path — onclose may never come otherwise.
  ws.onerror = () => { if (you && myRoom) scheduleRejoin(); };
}
const CLIENT_QUEUE_CANCEL_INPUTS = new Set([
  "possess", "summonSide", "autoFire", "echoArm", "lane", "move", "use",
  "target", "allyTarget", "cycleTarget", "swapBody",
]);
const send = (o) => {
  if (state?.phase === "playing" && CLIENT_QUEUE_CANCEL_INPUTS.has(o?.type))
    _queueEcho = { bodyId: activeId, id: null, pick: null, at: Date.now() };
  return ws && ws.readyState === 1 && ws.send(JSON.stringify(o));
};
const uiTelem = (surface, action) => send({ type: "uiEvent", surface, action });

// ---- auto-rejoin ---------------------------------------------------------
function stopRejoin() { if (rejoinTimer) clearTimeout(rejoinTimer); rejoinTimer = null; }
function tryRejoin() {
  rejoinTimer = null;
  if (!myRoom || (ws && ws.readyState <= 1)) return;
  connect(() => send({ type: "join", code: myRoom, name: $("name").value.trim(), token: TOKEN,
    compactSnapshots: true, harness: HARNESS, dev: DEV_REQUESTED }));
}
function scheduleRejoin(now = false) {
  if (rejoinTimer || !myRoom) return;
  banner.style.display = "block";
  rejoinTimer = setTimeout(tryRejoin, now ? 0 : rejoinDelay);
  rejoinDelay = Math.min(rejoinDelay * 2, 5000);
}
// Force a fresh socket, DON'T trust readyState. A mobile browser freezes a backgrounded tab's JS and
// silently kills the socket's TCP; because JS is frozen onclose never fires, so on return ws can still
// read OPEN (readyState 1) over a dead pipe — a "zombie" that fails the visibility gate (no reconnect)
// yet passes send() (every tap is serialized into the void). So on resume we tear the old socket down
// ourselves and rejoin. The server's newest-socket-wins reclaim (server.js) makes forcing a new socket
// on every foreground idempotent and safe.
function forceReconnect() {
  if (!myRoom) return;
  if (ws) { ws.onclose = null; ws.onerror = null; try { ws.close(); } catch {} }
  stopRejoin(); rejoinDelay = 1000; scheduleRejoin(true);
  // Liveness net: a frozen socket can even reopen dead. If no snapshot lands fast, rejoin again —
  // self-terminates once a message advances msgSeq (live) or the tab goes hidden again.
  const mark = msgSeq;
  clearTimeout(livenessTimer);
  livenessTimer = setTimeout(() => {
    if (myRoom && msgSeq === mark && document.visibilityState === "visible") forceReconnect();
  }, 1500);
}
// a phone waking from lock should snap back instantly, not wait out the backoff — and never gate on
// readyState, which a mobile freeze can leave lying "OPEN" on a dead socket.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && myRoom) forceReconnect();
});
// some mobile browsers restore a backgrounded tab from bfcache and fire pageshow, not visibilitychange.
window.addEventListener("pageshow", () => { if (myRoom) forceReconnect(); });

// ---- panel bridge --------------------------------------------------------
// map.js / inventory.js read live state and send actions through this object.
window.KM = {
  send: (o) => send(o),
  uiTelem,
  state: null, you: null, activeId: null, _cbs: [],
  // panels are handed the ACTIVE (possessed) body id, not the primary seat — the body
  // card + swap modal follow whichever squad body you're piloting.
  onState(cb) { this._cbs.push(cb); if (this.state) try { cb(this.state, this.activeId ?? this.you); } catch {} },
  // PILOT a squad body from a panel (the body-select menu in inventory.js). Possession is a
  // LOCAL concept (activeId), so panels can't just send {possess} — they route through here so
  // the client re-points the HUD/board too. No-op if the id isn't a body this seat owns.
  possess(id) {
    if (!id || id === activeId) return;
    const p = (state?.players || []).find((q) => q.id === id);
    if (!isMine(p)) return;
    activeId = id; setTargetArmed(false); send({ type: "possess", id }); render();
  },
  // The existing body sheet doubles as the one-person squad manager. Outside combat, choosing a
  // body lands directly in that body's deck/backpack editor; during combat it simply commands it.
  manageBody(id) {
    const managedPhase = state?.phase === "setup" || state?.phase === "won";
    if (managedPhase) {
      _deckPanelOpen = true;
      if (state.phase === "won") _ovTab = "backpack";
      if (state.phase === "setup") _setupDismissed = false;
    }
    // Re-selecting the body already under command should still open its editor.
    // `possess` intentionally no-ops for that id, so repaint the managed phase here.
    if (id === activeId) { render(); return; }
    this.possess(id);
  },
  // Wear/adopt atomically. The five-row body sheet immediately exposes free reallocation
  // for the newly worn body's Mastery and Specialty.
  swapBody(bodyKey, pay = []) {
    const me = pilot(); if (!me || !bodyKey) return;
    send({ type: "swapBody", to: bodyKey, pay });
  },
};

// ---- lobby ---------------------------------------------------------------
const ENTRY_PITCH = "Wear the bodies of the foes you defeat. Take the throne.";
const cleanRoomCode = (value) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
const ENTRY_ROOM = cleanRoomCode(ENTRY_PARAMS.get("room"));
const ENTRY_SOURCE = ENTRY_PARAMS.get("source") === "itch" ? "itch" : null;
let pendingJoinCode = "";
let inviteStatusTimer = null;

function showEntryLobby() {
  document.body.classList.remove("room-active", "combat-focus", "map-top");
  $("roomActions").classList.add("hidden");
  $("inviteStatus").textContent = "";
  // The room overlay is a fixed sibling of #game, so hiding the game alone leaves a completed-run
  // victory card painted over the lobby after Leave to lobby. Dismiss the room layer explicitly.
  const roomOverlay = $("draftOverlay");
  roomOverlay.classList.add("hidden");
  roomOverlay.innerHTML = "";
  $("game").classList.add("hidden");
  $("lobby").classList.remove("hidden");
}
function enterRoomSurface(code) {
  document.body.classList.add("room-active");
  $("inviteRoomCode").textContent = "ROOM " + code;
  $("roomActions").classList.remove("hidden");
  $("lobbyErr").textContent = "";
  $("lobby").classList.add("hidden");
  $("game").classList.remove("hidden");
}
function showRoomRecovery(code, wasInGame = false) {
  if (code) {
    $("code").value = code;
    $("friendsPanel").open = true;
  }
  $("lobbyErr").textContent = wasInGame
    ? "That room is gone. Play Solo to start a new run, or enter another room code."
    : `Room ${code || "requested"} wasn’t found. Check the code, or Play Solo.`;
}
function roomInviteUrl(code) {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", code);
  return url.toString();
}
function setInviteStatus(message, clearAfter = 2600) {
  clearTimeout(inviteStatusTimer);
  $("inviteStatus").textContent = message;
  if (clearAfter) inviteStatusTimer = setTimeout(() => { $("inviteStatus").textContent = ""; }, clearAfter);
}
async function copyInvite(url) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); return true; }
  } catch {}
  const field = document.createElement("textarea");
  field.value = url;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;left:-9999px;top:0";
  document.body.appendChild(field);
  field.select();
  let copied = false;
  try { copied = document.execCommand("copy"); } catch {}
  field.remove();
  return copied;
}
async function shareInvite() {
  if (!myRoom) return;
  const url = roomInviteUrl(myRoom);
  const payload = { title: "King Mimic", text: ENTRY_PITCH, url };
  if (typeof navigator.share === "function") {
    try { await navigator.share(payload); setInviteStatus("Invite shared."); return; }
    catch (error) { if (error?.name === "AbortError") return; }
  }
  if (await copyInvite(url)) setInviteStatus("Invite copied.");
  else setInviteStatus(`Copy this invite: ${url}`, 0);
}

$("name").value ||= localStorage.getItem("km_name") || ""; // name survives refresh (phones)
if (ENTRY_ROOM) {
  $("code").value = ENTRY_ROOM;
  $("invitedRoomLabel").textContent = ENTRY_ROOM;
  $("inviteArrival").classList.remove("hidden");
  $("friendsPanel").open = true;
}
$("inviteBtn").onclick = shareInvite;
// iOS Safari cannot enter true browser-chrome-free mode from a tap. The installed PWA can, and the
// manifest/meta contract already supports it, so teach that escape hatch once in the lobby instead
// of letting an accidental high combat tap reveal Safari's URL bar with no explanation.
{
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;
  const hint = $("iosInstallHint"), close = $("iosInstallClose");
  if (hint && ios && !standalone && localStorage.getItem("km_ios_install_tip") !== "dismissed") hint.classList.add("show");
  if (close) close.onclick = () => { hint?.classList.remove("show"); localStorage.setItem("km_ios_install_tip", "dismissed"); };
}
// PARTY MODE: off = one full-deck main body; 2–4 adds one to three foe-style three-card
// companions. `?bodies=` remains a compatibility alias for old links.
let _bodies = Math.max(1, Math.min(4,
  parseInt(ENTRY_PARAMS.get("partySize") ?? ENTRY_PARAMS.get("party") ?? ENTRY_PARAMS.get("bodies"), 10) || 1));
// Before a room exists the picker remembers the choice for create/join; in a pre-run room it
// updates through the canonical setPartySize message.
// The server bumps players.size, which laneCount/the board preview already follow.
function paintBodiesPick() {
  document.querySelectorAll("#bodiesPick .bp-opt").forEach((b) =>
    b.classList.toggle("on", +b.dataset.bodies === _bodies));
  const create = $("createBtn");
  if (create) create.textContent = _bodies > 1 ? `Play Party · ${_bodies}` : "Play Solo";
}
document.querySelectorAll("#bodiesPick .bp-opt").forEach((b) => b.onclick = () => {
  _bodies = Math.max(1, Math.min(4, +b.dataset.bodies));
  paintBodiesPick();
  if (myRoom && you) send({ type: "setPartySize", n: _bodies });
});
paintBodiesPick();
function createEntryRoom(customCode) {
  const code = cleanRoomCode(customCode);
  pendingJoinCode = "";
  $("lobbyErr").textContent = "";
  localStorage.setItem("km_name", $("name").value.trim());
  connect(() => send({ type: "create", name: $("name").value.trim(), code: code || undefined,
    token: TOKEN, partySize: _bodies, compactSnapshots: true, source: ENTRY_SOURCE, harness: HARNESS,
    dev: DEV_REQUESTED, ownerLabKey: OWNER_LAB_KEY || undefined }));
}
$("createBtn").onclick = () => createEntryRoom("");
$("createFriendsBtn").onclick = () => createEntryRoom($("code").value);
$("joinBtn").onclick = () => {
  const code = cleanRoomCode($("code").value);
  if (!code) { $("lobbyErr").textContent = "Enter the room name to join."; return; }
  pendingJoinCode = code;
  $("lobbyErr").textContent = "";
  localStorage.setItem("km_name", $("name").value.trim());
  connect(() => send({ type: "join", code, name: $("name").value.trim(), token: TOKEN,
    partySize: _bodies, compactSnapshots: true, harness: HARNESS, dev: DEV_REQUESTED }));
};
$("startBtn").onclick = () => send({ type: "start" });
// Enter in either lobby field submits: join if a room name is filled in, else create.
for (const id of ["name", "code"]) $(id).addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  ($("code").value.trim() ? $("joinBtn") : $("createBtn")).click();
});

// Screenshot auto-driver: ?auto=draft|setup|combat creates a normal room and walks
// it to the requested phase. Inert during normal play (only runs when the param is set).
const _auto = new URLSearchParams(location.search).get("auto");
const _autoDone = new Set();
window.addEventListener("load", () => {
  if (_auto) { connect(() => send({ type: "create", name: "Hero", partySize: _bodies,
    compactSnapshots: true, harness: HARNESS })); return; }
  if (_demo) return;
  // Mid-run refresh: bounce straight back into the saved room (the token reclaims the seat).
  const saved = localStorage.getItem("km_room");
  if (saved && !ENTRY_ROOM) {
    myRoom = saved;
    connect(() => send({ type: "join", code: saved, name: $("name").value.trim(), token: TOKEN, harness: HARNESS, dev: DEV_REQUESTED }));
  }
});
function autoStep() {
  if (!state) return;
  if (state.phase === "lobby" && !_autoDone.has("enter")) {
    _autoDone.add("enter");
    send({ type: "start" });               // lobby → draft
  } else if (state.phase === "draft" && _auto !== "draft" && !_autoDone.has("pick")) {
    _autoDone.add("pick");
    const offer = (state.draft.wheel || []).find((w) => w.offeredTo == null || w.offeredTo === you);
    if (offer) send({ type: "draftPick", bundle: offer.id });
  } else if (state.phase === "setup" && _auto === "combat" && !_autoDone.has("start")) {
    _autoDone.add("start");
    setTimeout(() => send({ type: "start" }), 150);
  }
}

// Offline demo render: ?demo=combat|setup|draft injects a representative state and
// draws it with no networking, so a plain headless screenshot is deterministic.
const _demo = new URLSearchParams(location.search).get("demo");
const DEMO_BODIES = {
  rookie:      { name: "Rookie Mimic", maxHp: 8, atk: 1, cd: 0, color: "#9ad" },
  rat:         { name: "Rat", maxHp: 1, atk: 1, cd: 0, color: "#c9a98c" },
  totem:       { name: "Totem", maxHp: 3, atk: 0, cd: 0, color: "#7fb08a" },
  // the 12 flat bodies (owner 2026-06-18: rarity tiers dead — one entry per family, clean
  // name, HP = base+1, gold 1; power comes from the items a foe carries, not a tier).
  royalRat:    { name: "Royal Rat", maxHp: 6, atk: 0, cd: 0, color: "#b8a3c9" },
  fatCat:      { name: "Fat Cat", maxHp: 6, atk: 0, cd: 0, color: "#f0b070" },
  paidPiper:   { name: "Paid Piper", maxHp: 6, atk: 0, cd: 0, color: "#c9b86a" },
  centaur:     { name: "Centless Centaur", maxHp: 8, atk: 1, cd: 0, color: "#d8b46a" },
  pixie:       { name: "Penny-Pinching Pixie", maxHp: 8, atk: 1, cd: 0, color: "#7f7" },
  vampire:     { name: "Vengeful Vampire", maxHp: 8, atk: 2, cd: 0, color: "#b85c6e" },
  mouse:       { name: "Malovelant Mouse", maxHp: 6, atk: 0, cd: 0, color: "#9a8ca8" },
  lizardWizard:{ name: "Lizard Wizard", maxHp: 6, atk: 0, cd: 0, color: "#4f9f7f" },
  runeblade:   { name: "Rent-Seeking Runeblade", maxHp: 6, atk: 1, cd: 0, color: "#357f5f" },
  minotaur:    { name: "Market-Crash Minotaur", maxHp: 10, atk: 1, cd: 0, color: "#b09030" },
  wageslave:   { name: "Weary Wageslave", maxHp: 10, atk: 1, cd: 0, color: "#a0a0b0" },
  atlas:       { name: "Atlas, Shrugging", maxHp: 10, atk: 1, cd: 0, color: "#8a93a3" },
  auditAngel:  { name: "Audit Angel", maxHp: 5, atk: 0, cd: 0, color: "#d9f" },        // legacy combat1–4 fixtures
  killionaire: { name: "Killionaire", maxHp: 13, atk: 4, cd: 0, color: "#e6c34a" },    // legacy combat1–4 fixtures
  // BOSS_SPEC_V1 fixtures (?demo=boss / boss2)
  tentacle:    { name: "Tentacle", maxHp: 1, atk: 0, cd: 0, color: "#7f6fb0", summon: true },
  itemEntity:  { name: "Animated Item", maxHp: 2, atk: 0, cd: 0, color: "#d8b66a", summon: true },
  boneWizard:  { name: "Bone Wizard", maxHp: 3, atk: 0, cd: 0, color: "#cfd0e8", summon: true },
  hydraHead:   { name: "Hydra Head", maxHp: 1, atk: 1, cd: 0, color: "#5fd0a0", summon: true },
};
const DEMO_KIT = [
  { key: "fire",      name: "Fireball",  text: "Deal staff + 3 to your aimed foe.",            cd: 45 },
  { key: "blade",     name: "Sword",     text: "Deal sword + 1 to the front foe.",             cd: 20 },
  { key: "heal",      name: "Heal",      text: "Heal staff + 2 to your ally-target.",          cd: 30 },
  { key: "lightning", name: "Lightning", text: "Deal staff + 2 to every foe in your lane.",    cd: 50 },
  { key: "bow",       name: "Bow",       text: "Deal sword + 1 to your aimed foe.",            cd: 25 },
  { key: "summonRat", name: "Rat",       text: "Summon a rat in your lane.",                   cd: 35 },
];
// `contents` = the pre-built foe roster INSIDE a combat/elite room (one entry per foe), mirroring the
// engine's snapshot so the demo exercises the what's-inside preview + boss counter. `row` tags the
// graph row (0 = start) the boss counter reads.
const _foe = (bodyKey, name, level, maxHp, ante) => ({ bodyKey, name, level, maxHp, ante });
const DEMO_NODES = [
  // `ante` = the room's ROOM ANTE (the threat preview the advance buttons / map show). Elite rooms
  // are double-ante, so their number runs higher. (Enchants are retired — nodes no longer carry one.)
  { id: "n0", type: "combat", cleared: true,  x: 0.5,  y: 0.04, links: ["n1", "n2"], ante: 4, row: 0,
    contents: [_foe("rookie", "Rookie Mimic", 1, 8, 2), _foe("rat", "Rat", 1, 1, 1)] },
  { id: "n1", type: "combat", cleared: false, x: 0.28, y: 0.22, links: ["n3"], ante: 6, row: 1,
    contents: [_foe("royalRat", "Royal Rat", 2, 7, 3), _foe("rat", "Rat", 1, 1, 1), _foe("rat", "Rat", 1, 1, 1)] },
  { id: "n2", type: "combat", cleared: false, x: 0.72, y: 0.22, links: ["n3"], ante: 8, row: 1,
    contents: [_foe("vampire", "Vengeful Vampire", 2, 9, 4), _foe("fatCat", "Fat Cat", 2, 7, 4)] },
  { id: "n3", type: "combat", cleared: false, x: 0.5,  y: 0.42, links: ["n4"], ante: 5, row: 2,
    contents: [_foe("wageslave", "Weary Wageslave", 1, 10, 5)] },
  { id: "n4", type: "elite",  cleared: false, x: 0.5,  y: 0.60, links: ["n5"], ante: 14, row: 3,
    contents: [_foe("minotaur", "Market-Crash Minotaur", 3, 12, 8), _foe("vampire", "Vengeful Vampire", 2, 9, 4), _foe("pixie", "Penny-Pinching Pixie", 1, 8, 2)] },
  { id: "n5", type: "combat", cleared: false, x: 0.5,  y: 0.78, links: ["n6"], ante: 7, row: 4,
    contents: [_foe("centaur", "Centless Centaur", 2, 9, 4), _foe("paidPiper", "Paid Piper", 2, 7, 3)] },
  { id: "n6", type: "boss",   cleared: false, x: 0.5,  y: 0.95, links: [], row: 5 },
];
// Add the boss-counter fields to a demo map for a given current node (graceful: client tolerates
// their absence, but the demo ships them so `?demo=won` shows the real counter).
const _demoMapMeta = (nodes, currentId) => {
  const cur = nodes.find((n) => n.id === currentId);
  const boss = nodes.find((n) => n.type === "boss");
  const rowCount = Math.max(0, ...nodes.map((n) => n.row ?? 0)) + 1;
  const currentRow = cur?.row ?? 0;
  const bossRow = boss?.row ?? rowCount - 1;
  return { rowCount, currentRow, roomsToBoss: Math.max(0, bossRow - currentRow) };
};
const DEMO_CLASSES = [
  { key: "warrior", name: "Warrior", blurb: "Sturdy front-liner — heavy melee and shields.", body: { maxHp: 12, atk: 3, cd: 40, color: "#e0885a" },
    kit: [{ name: "Sword", text: "Deal 3 to the front foe." }, { name: "Gavel", text: "Deal 7 to the front foe." }, { name: "Shield", text: "Block 4 incoming damage in your lane." }] },
  { key: "rogue", name: "Rogue", blurb: "Fragile and fast — pick targets and disrupt.", body: { maxHp: 7, atk: 2, cd: 18, color: "#6fcf97" },
    kit: [{ name: "Sword", text: "Deal 3 to the front foe." }, { name: "Bow", text: "Deal 3 to your targeted foe." }, { name: "Cold", text: "Deal 1 and delay its next attack by 3.0s." }] },
  { key: "mage", name: "Mage", blurb: "Ranged control — big targeted fire and lane lightning.", body: { maxHp: 6, atk: 1, cd: 60, color: "#8a9cff" },
    kit: [{ name: "Fire", text: "Deal 6 to your targeted foe." }, { name: "Lightning", text: "Deal 2 to every foe in your target's lane." }, { name: "Wind", text: "Move your targeted foe to the next lane." }] },
  { key: "cleric", name: "Cleric", blurb: "Resilient support — heal, shield, and chip damage.", body: { maxHp: 9, atk: 2, cd: 45, color: "#f1d06a" },
    kit: [{ name: "Heal", text: "Heal yourself 4 HP." }, { name: "Shield", text: "Block 4 incoming damage in your lane." }, { name: "Lightning", text: "Deal 2 to every foe in your target's lane." }] },
];
const DEMO_ITEM_COLOR = { blade: "#cfd8e2", bow: "#a8e06a", fire: "#ff7a3c", lightning: "#5fd0ff", wind: "#bcd8ff", scaryKnife: "#e7e0c0", magicMissile: "#9b8cff", heal: "#74e69a" };
// extra: { tags:[…], bars:[…non-harm timer bars…], phys, shield, … }
const _enemy = (bodyKey, hp, charge, gear, id, passive, extra) => {
  gear = gear ?? [];
  const cd = 30;
  const itemBars = gear.filter((g) => g.key).map((g, k) => ({
    kind: "item", harm: true, key: g.key, label: g.name || g.key, color: DEMO_ITEM_COLOR[g.key] || "#ccd",
    cd: g.cd || cd, frac: Math.min(1, ((charge + k * 9) % (cd + 1)) / cd),
    dmg: g.dmg ?? 2 + k, // display-only fixture number — live bars get the resolver's math
  }));
  const threats = [...(extra?.bars ?? []), ...itemBars];
  const harm = threats.filter((b) => b.harm);
  const { bars, tags, ...rest } = extra || {};
  return { id, bodyKey, name: DEMO_BODIES[bodyKey].name, hp, maxHp: DEMO_BODIES[bodyKey].maxHp, charge, cd, gear, passive: passive ?? null,
    threats, tags: tags ?? [], dr: 0, reactive: threats.length === 0 && !(tags && tags.length),
    threat: harm.length ? harm.reduce((a, b) => (b.frac > a.frac ? b : a)) : null, ...rest };
};
const _inv = (key, charge) => {
  const k = DEMO_KIT.find((x) => x.key === key) ?? { name: key, text: "", cd: 30 }; // tolerate a stale fixture key
  return { key, name: k.name, text: k.text, charge, cd: k.cd, ready: charge >= k.cd,
    summons: /summon/i.test(k.text) };  // fixture mirror of the live snapshot flag
};
// CARD DESCRIPTOR fixture (matches the live cardDescriptor: {key,name,text,value,color,cost,dmg,ranged}).
const _DMG_LBL = { blade: "⚔+1", fire: "✨+3", heal: "❤+2", bow: "⚔+1", lightning: "✨+2", summonRat: "🐀×1", gavel: "⚔+7", shield: "🛡4", cold: "✨+1", bomb: "✨+5" };
const _CD_COST = { blade: 1, fire: 2, heal: 2, bow: 1, lightning: 4, summonRat: 2, gavel: 3, shield: 2, cold: 1, bomb: 3 };
const _cd = (key, value = 1) => {
  const k = DEMO_KIT.find((x) => x.key === key) ?? { name: key, text: "" };
  return { key, name: k.name ?? key, text: k.text ?? "", value, color: DEMO_ITEM_COLOR[key] ?? null,
    cost: _CD_COST[key] ?? 1, dmg: _DMG_LBL[key] ?? "", ranged: /fire|bow|lightning|cold/.test(key) };
};
const _bp = (keys) => keys.map((k) => _cd(k, 1));   // a backpack/deck list of descriptors
function buildDemoState(kind) {
  const base = {
    type: "state", god: false, tick: 84, draft: null, laneCount: 3,
    floor: 2,
    caravan: { hp: kind === "combat" ? 14 : 20, max: 20 },
    map: kind === "draft" ? null : { nodes: DEMO_NODES, currentId: "n1", levelComplete: false, bossName: "Hyper-Inflation Hydra" },
    unlockedBodies: ["rookie", "pixie", "vampire", "royalRat", "minotaur"], bodies: DEMO_BODIES,
    lanes: [
      // lane 0: an UNCOMMON summoner — Royal Rat's 4s rat clock (🐀 bar) + its ⏩ accel tag
      { enemies: [
        _enemy("royalRat", 6, 18, [{ key: "blade", name: "Sword" }], "t1",
          "Summons 2 rats every 8s; each staff item it resolves shaves 1.5s off the clock.",
          { mag: 0, tags: ["⏩ −1.5s on staff"],
            bars: [{ kind: "passive", harm: false, label: "🐀2", color: "#b8a3c9", cd: 80, frac: 0.7 }] }),
        _enemy("rat", 1, 8, [{ key: "blade", name: "Bite" }]),
        _enemy("rat", 1, 14, [{ key: "blade", name: "Bite" }]),
      ] },
      // lane 1 (yours): an uncommon Vampire fronting a RARE Minotaur; a rat + a gold-ring totem block
      { allies: [{ bodyKey: "rat", hp: 1, maxHp: 1 }, { bodyKey: "totem", hp: 3, maxHp: 3, aura: { dmgReduce: 1 } }],
        enemies: [
          _enemy("vampire", 8, 24, [{ key: "blade", name: "Sword" }], "t2",
            "Heals 1 after each sword item it resolves.", { tags: ["⚡ on sword"], phys: 2 }),
          _enemy("minotaur", 10, 12, [{ key: "blade", name: "Sword" }], null,
            "Every 7s: swords the front enemy. Taking a hit shaves 1.5s off the clock.", { tags: ["⚡ counter"], phys: 1, shield: 2 }),
        ] },
      // lane 2: a Wageslave self-healing (♥ bar) beside a Fat Cat whose clock jumps when hit
      { enemies: [
        _enemy("wageslave", 8, 10, [{ key: "blade", name: "Sword" }], null, "Heals 2 every 5.5s.",
          { bars: [{ kind: "passive", harm: false, label: "♥2", color: "#74e69a", cd: 55, frac: 0.35 }] }),
        _enemy("fatCat", 6, 20, [{ key: "fire", name: "Fireball" }], null,
          "Summons 1 rat every 8s; every hit it takes shaves 1.5s off the clock.",
          { mag: 0, tags: ["⏩ −1.5s when hit"],
            bars: [{ kind: "passive", harm: false, label: "🐀1", color: "#b8a3c9", cd: 80, frac: 0.45 }] }),
      ] },
    ],
    players: [
      { id: "me", name: "Hero", lane: 1, bodyKey: "vampire", hp: 4, maxHp: 6, shield: 2, alive: true, phys: 2,
        passive: "Heals 1 whenever it swords.", tags: ["⚡ on sword"], picks: [], targetId: "t2",
        inv: [_inv("blade", 20), _inv("fire", 16), _inv("heal", 8), _inv("summonRat", 30)], summonSide: "front",
        // a 12-card backpack / 10-card deck (2 spare) + a body level so the SETUP deck-editor and
        // level-up control have something to render. level/nextLevelCost mirror the engine fields.
        backpack: _bp(["blade", "blade", "fire", "heal", "bow", "lightning", "blade", "fire", "heal", "bow", "summonRat", "lightning"]),
        deckList: _bp(["blade", "blade", "fire", "heal", "bow", "lightning", "blade", "fire", "heal", "bow"]),
        deckSize: 10, minDeck: 10, level: 3, nextLevelCost: 2 },
      { id: "p2", name: "Mara", lane: 2, bodyKey: "royalRat", hp: 5, maxHp: 6, alive: true, picks: [], inv: [], backpack: [], deckList: [], deckSize: 0, minDeck: 10 },
    ],
  };
  if (kind === "draft") {
    base.phase = "draft";
    base.lanes = [{ shield: 0, enemies: [] }, { shield: 0, enemies: [] }, { shield: 0, enemies: [] }];
    base.players[0].inv = [];
    const it = (name, text) => ({ key: name.toLowerCase(), name, text });
    base.draft = {
      wheel: [
        { id: "w1", offeredTo: "me", bodyKey: "pixie", name: "Penny Pixie", maxHp: 5, color: "#7f7", passive: null, lockedBy: "me",
          items: [it("Sword", "Deal 3 to the front foe."), it("Bow", "Deal 3 to your targeted foe."), it("Heal", "Heal yourself 4 HP.")] },
        { id: "w2", offeredTo: "p2", bodyKey: "basilisk", name: "Bubble-Burst Basilisk", maxHp: 2, color: "#6fbf9f", passive: "Hits your lane for 1 on its timer.", lockedBy: "p2",
          items: [it("Fire", "Deal 6 to your targeted foe."), it("Cold", "Deal 1 and delay its next attack."), it("Shield", "Block 4 in your lane.")] },
        { id: "w3", offeredTo: "me", bodyKey: "mummy", name: "Money-Munching Mummy", maxHp: 2, color: "#c8b890", passive: "Chips its lane for 1 on its timer.", lockedBy: null,
          items: [it("Lightning", "Deal 2 to every foe in your target's lane."), it("Gavel", "Deal 7 to the front foe."), it("Wind", "Move your targeted foe over a lane.")] },
        { id: "w4", offeredTo: "me", bodyKey: "accountant", name: "Angry Accountant", maxHp: 3, color: "#d0c060", passive: "Strikes back for 1 when it's hit.", lockedBy: null,
          items: [it("Bow", "Deal 3 to your targeted foe."), it("Bomb", "Once per fight: deal 5 to a lane."), it("Heal", "Heal yourself 4 HP.")] },
        { id: "w5", offeredTo: "p2", bodyKey: "wageslave", name: "Weary Wageslave", maxHp: 3, color: "#a0a0b0", passive: "Heals 1 on its timer.", lockedBy: null,
          items: [it("Sword", "Deal 3 to the front foe."), it("Lightning", "Deal 2 to a lane."), it("Cold", "Deal 1 and delay.")] },
        { id: "w6", offeredTo: "p2", bodyKey: "youngdead", name: "Yuppie Youngdead", maxHp: 4, color: "#9fbf6f", passive: null, lockedBy: null,
          items: [it("Bow", "Deal 3 to your targeted foe."), it("Fire", "Deal 6 to your targeted foe."), it("Shield", "Block 4 in your lane.")] },
      ],
      picks: [{ id: "me", name: "Hero", drafted: true, bundle: "w1" }, { id: "p2", name: "Mara", drafted: true, bundle: "w2" }],
      classes: DEMO_CLASSES,
    };
  } else if (kind === "won") {
    base.phase = "won";
    base.caravan = { hp: 11, max: 20 };
    // stand at n0 so the advance row shows TWO deal-labeled choices (n1 + n2)
    base.map = { nodes: DEMO_NODES, currentId: "n0", levelComplete: false, bossName: "Hyper-Inflation Hydra", ..._demoMapMeta(DEMO_NODES, "n0") };
    base.lanes = [{ shield: 0, enemies: [] }, { shield: 0, enemies: [] }, { shield: 0, enemies: [] }];
    base.roomValue = 6;   // the room's ante sum (display only — no gold)
    // a 12-card backpack with a 10-card deck (2 spare) — exercises the deck-builder at the floor
    base.players[0].backpack = _bp(["blade", "blade", "fire", "heal", "bow", "lightning", "blade", "fire", "heal", "bow", "summonRat", "lightning"]);
    base.players[0].deckList = _bp(["blade", "blade", "fire", "heal", "bow", "lightning", "blade", "fire", "heal", "bow"]);
    base.players[0].deckSize = 10; base.players[0].minDeck = 10;
    base.players[1].deckSize = 11;
    base.trade = { offers: [{ id: "of1", from: "p2", to: "me", fromName: "Mara", toName: "Hero",
      give: "gavel", giveName: "Gavel", giveVal: 3, want: null, wantName: "", wantVal: 0 }] };
    base.loot = { cards: [
      _cd("fire", 3), _cd("lightning", 2), _cd("bow", 1),
    ] };
  } else if (kind === "squadwon") {
    // a SOLO 3-body SQUAD on the won screen — exercises the per-body deck-builder via the squad
    // selector (each body has its own backpack/deck). Switch bodies with the selector at the top.
    base.phase = "won";
    base.caravan = { hp: 41, max: 60 };
    base.map = { nodes: DEMO_NODES, currentId: "n0", levelComplete: false, bossName: "Hyper-Inflation Hydra", ..._demoMapMeta(DEMO_NODES, "n0") };
    base.lanes = [{ shield: 0, enemies: [] }, { shield: 0, enemies: [] }, { shield: 0, enemies: [] }];
    base.roomValue = 8; base.trade = { offers: [] };   // solo squad → no cross-human offers
    const sq = (id, name, lane, body, hp, maxHp, deck, spare) => ({
      id, name, lane, bodyKey: body, owner: "me", hp, maxHp, shield: 0, alive: true, inv: [],
      deckList: _bp(deck), backpack: _bp([...deck, ...spare]), deckSize: deck.length, minDeck: 10,
      level: 2, nextLevelCost: 2,
    });
    const D10 = ["blade", "blade", "fire", "heal", "bow", "lightning", "blade", "fire", "heal", "bow"];
    base.players = [
      sq("me", "Hero", 0, "vampire", 6, 8, D10, ["summonRat", "fire"]),
      sq("p2", "Hero #2", 1, "minotaur", 10, 12, D10, ["bow"]),
      sq("p3", "Hero #3", 2, "royalRat", 5, 6, D10, ["lightning", "summonRat", "heal"]),
    ];
    base.loot = { cards: [_cd("fire", 3), _cd("bow", 1)] };
  } else if (/^combat[1-4]$/.test(kind)) {
    // combat1..combat4 — N players = N lanes, each player in their own lane. Shows the
    // dynamic N-column renderer at every party size.
    const n = Number(kind.slice(-1));
    base.phase = "playing";
    base.laneCount = n;
    base.caravan = { hp: 15, max: 20 };
    const FOE_SET = [
      [_enemy("killionaire", 11, 52, [{ key: "fire", name: "Fire" }], "t1", null, { phys: 4, counters: 1 }),
       _enemy("pixie", 4, 30, [{ key: "bow", name: "Bow" }]), _enemy("rat", 1, 8)],
      [_enemy("auditAngel", 6, 42, [{ key: "lightning", name: "Lightning" }], null, "Scorches every lane for 3.", { aoe: true, phys: 2 }),
       _enemy("fatCat", 4, 20, [], null, "Summons a rat when hit.")],
      [_enemy("royalRat", 3, 30, [], null, "Summons a rat on its timer."), _enemy("rat", 1, 8)],
      [_enemy("killionaire", 9, 40, [{ key: "fire", name: "Fire" }], null, null, { phys: 4 }),
       _enemy("pixie", 3, 18, [{ key: "bow", name: "Bow" }])],
    ];
    base.lanes = Array.from({ length: n }, (_, i) => ({ shield: i === 1 ? 1 : 0, enemies: FOE_SET[i] }));
    const PBODY = ["killionaire", "pixie", "auditAngel", "fatCat"];
    const PNAME = ["Hero", "Mara", "Bex", "Yuki"];
    const PHP = [9, 4, 6, 4];
    base.players = Array.from({ length: n }, (_, i) => ({
      id: i === 0 ? "me" : "p" + (i + 1), name: PNAME[i], lane: i, bodyKey: PBODY[i],
      hp: PHP[i], maxHp: DEMO_BODIES[PBODY[i]].maxHp, alive: true,
      phys: PBODY[i] === "killionaire" ? 4 : 0, targetId: i === 0 ? "t1" : null,
      inv: i === 0 ? [_inv("fire", 70), _inv("lightning", 25), _inv("bow", 12)] : [],
    }));
  } else if (kind === "cardcombat") {
    // CARD/MOXIE combat: a player HAND + moxie meter + foes with cast QUEUES (front filling toward
    // a cast). The screen the rewrite is about — used to eyeball the hand, moxie pips, and foe bars.
    base.phase = "playing";
    base.laneCount = 2;
    base.caravan = { hp: 14, max: 20 };
    const kd = (k) => DEMO_KIT.find((x) => x.key === k) || { name: k, text: "" };
    // demo damage labels (live game derives these from card ops in the snapshot via cardDmgLabel)
    const DMG = { blade: "⚔+1", fire: "✨+3", hatchet: "⚔+4", lightning: "✨+2", heal: "❤+2",
      scaryKnife: "⚔", spear: "⚔+3", gangUp: "⚔+1", magicMissile: "✨", summonRat: "🐀×1" };
    const hcard = (key, cost, type, color, ranged, aff, kind) => ({ id: "h" + key, key, name: kd(key).name, text: kd(key).text,
      cost, type, color, dmg: DMG[key] || "", ranged: !!ranged, kind: kind || (ranged ? "ranged" : "melee"), summons: false, affordable: aff !== false });
    // demo per-card damage numbers (live game sends `hit` = deal amount + the foe's counters from the snapshot)
    const HIT = { blade: 1, fire: 3, hatchet: 4, lightning: 2, spear: 3, gangUp: 1 };
    const qc = (key, cost, type, color, front) => ({ key, name: kd(key).name, cost, type, color, dmg: DMG[key] || "", hit: HIT[key] ?? null, front: !!front });
    base.players = [{
      id: "me", name: "Hero", lane: 0, bodyKey: "vampire", hp: 6, maxHp: 8, shield: 2, alive: true, phys: 2, meleeBonus: 2, rangedBonus: 1,
      targetId: "t1", moxie: 4, moxieMax: 10, deckCount: 6, inv: [],
      effects: [{ icon: "🩸", label: "Blood To Iron — missing-health shield repeats", left: 32, dur: 60 },
                { icon: "🪨", label: "Stoneskin — less damage taken", left: 90, dur: 120 }],
      hand: [
        hcard("blade", 1, "physical", "#cfd8e2", false, true, "melee"),
        hcard("fire", 2, "magical", "#ff7a3c", true, true, "ranged"),
        hcard("hatchet", 3, "physical", "#d89060", false, true, "melee"),
        hcard("lightning", 4, "magical", "#5fd0ff", false, false, "ranged"), // lane AoE = ranged (target:false flag, kind wins)
        hcard("heal", 2, "magical", "#74e69a", true, true, "untyped"),       // heal = no icon
      ],
    }];
    base.lanes = [
      { shield: 0, enemies: [
        _enemy("minotaur", 10, 0, [], "t1", null, { phys: 1, moxie: 2, moxieMax: 10, castFrac: 1, meleeBonus: 2, rangedBonus: 2,
          effects: [{ icon: "💪", label: "Power +2", left: 70, dur: 120 }, { icon: "🌵", label: "Thorns — attackers take 1", left: null, dur: null }],
          queue: [qc("scaryKnife", 1, "physical", "#e7e0c0", true), qc("spear", 3, "physical", "#c0b8a0"), qc("gangUp", 2, "physical", "#e0c060")] }),
        _enemy("pixie", 4, 0, [], null, null, { phys: 1, moxie: 1, moxieMax: 10, castFrac: 1,
          queue: [qc("scaryKnife", 1, "physical", "#e7e0c0", true), qc("hatchet", 3, "physical", "#d89060")] }) ] },
      { shield: 0, enemies: [
        _enemy("royalRat", 6, 0, [], null, "Summons rats per ~8 moxie it spends.", { mag: 0, moxie: 0, moxieMax: 10, castFrac: 0,
          queue: [qc("magicMissile", 1, "magical", "#9b8cff", true), qc("summonRat", 2, "magical", "#c9a98c"), qc("fire", 2, "magical", "#ff7a3c")] }) ] },
    ];
  } else if (kind === "crush") {
    // WORST-CASE READABILITY PROBE (owner 2026-07-07): "4 players all crowded on one lane and
    // ~5 foes in that lane — that's the puzzle." Every ingredient here happens in real play
    // (players pick lanes freely; foe summons push a lane past 4): 4 heroes + 2 rat summons
    // + 5 queued foes all in lane 0 of a 4-lane board, effects and telegraphs on.
    base.phase = "playing";
    base.laneCount = 4;
    base.caravan = { hp: 12, max: 20 };
    const kd = (k) => DEMO_KIT.find((x) => x.key === k) || { name: k, text: "" };
    const DMG = { blade: "⚔+1", fire: "✨+3", hatchet: "⚔+4", spear: "⚔+3", gangUp: "⚔+1", magicMissile: "✨", summonRat: "🐀×1", scaryKnife: "⚔", bow: "⚔+1" };
    const HIT = { blade: 1, fire: 3, hatchet: 4, spear: 3, gangUp: 1, scaryKnife: 2, bow: 1 };
    const qc = (key, cost, type, color, front) => ({ key, name: kd(key).name, cost, type, color, dmg: DMG[key] || "", hit: HIT[key] ?? null, front: !!front });
    const hcard = (key, cost, type, color, ranged, kind2) => ({ id: "h" + key, key, name: kd(key).name, text: kd(key).text, cost, type, color, dmg: DMG[key] || "", ranged: !!ranged, kind: kind2 || (ranged ? "ranged" : "melee"), summons: false, affordable: true });
    base.players = [
      { id: "me", name: "Hero", lane: 0, depth: 0, bodyKey: "vampire", hp: 6, maxHp: 8, shield: 3, alive: true, phys: 2, meleeBonus: 2,
        targetId: "c1", moxie: 5, moxieMax: 10, deckCount: 7, inv: [],
        effects: [{ icon: "🪨", label: "Stoneskin — less damage taken", left: 90, dur: 120 }],
        hand: [hcard("blade", 1, "physical", "#cfd8e2", false), hcard("fire", 2, "magical", "#ff7a3c", true), hcard("heal", 2, "magical", "#74e69a", true, "untyped")] },
      { id: "p2", name: "Mara", lane: 0, depth: 1, bodyKey: "pixie", hp: 4, maxHp: 8, shield: 0, alive: true,
        effects: [{ icon: "💪", label: "Power +2", left: 40, dur: 120 }] },
      { id: "p3", name: "Bex", lane: 0, depth: 2, bodyKey: "auditAngel", hp: 5, maxHp: 5, shield: 2, alive: true },
      { id: "p4", name: "Yuki", lane: 0, depth: 3, bodyKey: "fatCat", hp: 2, maxHp: 6, shield: 0, alive: true },
    ];
    const crushFoe = (id, bodyKey, hp, extra, queue) => _enemy(bodyKey, hp, 0, [], id, null, { moxieMax: 10, ...extra, queue });
    base.lanes = [
      { shield: 1,
        allies: [{ bodyKey: "rat", hp: 1, maxHp: 1, name: "Rat" }, { bodyKey: "rat", hp: 1, maxHp: 1, name: "Rat" }],
        enemies: [
          crushFoe("c1", "minotaur", 10, { phys: 2, moxie: 7, castFrac: 0.7, tgtPids: ["me"], effects: [{ icon: "🌵", label: "Thorns — attackers take 1", left: null, dur: null }] },
            [qc("spear", 3, "physical", "#c0b8a0", true), qc("gangUp", 2, "physical", "#e0c060")]),
          crushFoe("c2", "vampire", 8, { phys: 2, moxie: 3, castFrac: 0.3, tgtPids: ["me"] },
            [qc("blade", 1, "physical", "#cfd8e2", true), qc("hatchet", 3, "physical", "#d89060")]),
          crushFoe("c3", "pixie", 6, { moxie: 2, castFrac: 0.4, tgtPids: ["p2"] },
            [qc("magicMissile", 1, "magical", "#9b8cff", true)]),
          crushFoe("c4", "royalRat", 6, { moxie: 4, castFrac: 0.5 },
            [qc("summonRat", 2, "magical", "#c9a98c", true), qc("fire", 2, "magical", "#ff7a3c")]),
          crushFoe("c5", "wageslave", 9, { phys: 1, moxie: 1, castFrac: 0.1, tgtPids: ["p4"] },
            [qc("scaryKnife", 1, "physical", "#e7e0c0", true)]),
        ] },
      { enemies: [crushFoe("d1", "fatCat", 6, { moxie: 2, castFrac: 0.2 }, [qc("blade", 1, "physical", "#cfd8e2", true)])] },
      { enemies: [crushFoe("d2", "mouse", 5, { moxie: 0, castFrac: 0 }, [qc("bow", 1, "physical", "#a8e06a", true)])] },
      { enemies: [] },
    ];
  } else if (kind === "line") {
    // showcase the DEPTH LINE: 3 players stacked in lane 0 (front blocker + 2 behind) with two
    // rat summons holding the front row; a 4th player solo-defends lane 1.
    base.phase = "playing";
    base.laneCount = 2;
    base.caravan = { hp: 17, max: 20 };
    base.lanes = [
      { shield: 0, allies: [{ bodyKey: "rat", hp: 1, maxHp: 1 }, { bodyKey: "rat", hp: 1, maxHp: 1 }],
        enemies: [_enemy("killionaire", 11, 50, [{ key: "fire", name: "Fire" }], "t1", null, { phys: 4, counters: 1 }),
                  _enemy("pixie", 4, 28, [{ key: "bow", name: "Bow" }])] },
      { shield: 1, enemies: [_enemy("auditAngel", 6, 40, [{ key: "lightning", name: "Lightning" }], null, "Scorches every lane for 3.", { aoe: true, phys: 2 })] },
    ];
    base.players = [
      { id: "me", name: "Hero", lane: 0, depth: 0, bodyKey: "killionaire", hp: 9, maxHp: 13, alive: true, phys: 4, targetId: "t1", inv: [_inv("fire", 70), _inv("lightning", 25), _inv("bow", 12)] },
      { id: "p2", name: "Mara", lane: 0, depth: 1, bodyKey: "pixie", hp: 4, maxHp: 5, alive: true, inv: [] },
      { id: "p3", name: "Bex", lane: 0, depth: 2, bodyKey: "auditAngel", hp: 6, maxHp: 8, alive: true, inv: [] },
      { id: "p4", name: "Yuki", lane: 1, depth: 0, bodyKey: "fatCat", hp: 4, maxHp: 4, alive: true, inv: [] },
    ];
  } else if (kind === "boss") {
    // KRAKEN floor — one scaled deck card, the separate one-at-a-time theft, four lanes.
    base.phase = "playing";
    base.laneCount = 4;
    base.caravan = { hp: 15, max: 20 };
    base.boss = {
      id: "B1", bodyKey: "kraken", name: "Kleptomaniac Kraken", hp: 38, maxHp: 38, color: "#5f8fd0",
      passive: "Spans all four lanes. Steals one real draw/used card at a time until its animated body is defeated.",
      stance: null, stanceLabel: null,
      threats: [
        { kind: "cast", castBar: true, harm: false, label: "Tentacles", intent: "Summon 2 8-HP tentacles, one per lane", color: "#7f6fb0", frac: 0.62, cd: 60, dmg: 0 },
        { kind: "clock", harm: false, label: "Steal a card", intent: "A stolen card is active — defeat it before another can be taken", color: "#d06fb0", frac: 0.31, cd: 65, dmg: 0 },
      ],
    };
    base.lanes = [
      { enemies: [
        _enemy("tentacle", 8, 0, [], "tn1", "Crushes for its current health at 4 moxie.", { reactive: false }),
      ] },
      { enemies: [] },
      { enemies: [_enemy("itemEntity", 5, 18, [{ key: "bow", name: "Bow", cd: 50, dmg: 1 }], "s1",
        "STOLEN from Hero — kill it to return the card.", { name: "Stolen Bow",
          stolenCard: { cardKey: "bow", cardName: "Bow", ownerId: "me", returnsOnDefeat: true } })] },
      { enemies: [] },
    ];
    base.players = [
      { id: "me", name: "Hero", lane: 1, depth: 0, bodyKey: "vampire", hp: 6, maxHp: 11, alive: true, phys: 3,
        targetId: "B1",
        stolenCards: [{ cardKey: "bow", cardName: "Bow", entityId: "s1", state: "stolen" }],
        inv: [_inv("blade", 20), _inv("fire", 30)] },
      { id: "p2", name: "Mara", lane: 0, depth: 0, bodyKey: "pixie", hp: 5, maxHp: 7, alive: true, inv: [] },
    ];
  } else if (kind === "boss2") {
    // LICH floor — the stance telegraph (OBJECTION) on the banner + bone wizards in lanes.
    base.phase = "playing";
    base.laneCount = 2;
    base.caravan = { hp: 17, max: 20 };
    base.boss = {
      id: "B1", bodyKey: "litigationLich", name: "Litigation Lich", hp: 19, maxHp: 28, color: "#9a7fc0",
      passive: "Alternates stances: OBJECTION caps every hit at 1; recess only softens by 1 — burst the weak window. Summons bone wizards.",
      stance: "objection", stanceLabel: "⚖ OBJECTION — capped at 1",
      threats: [
        { kind: "clock", harm: false, label: "⚖ stance", color: "#9a7fc0", frac: 0.8, cd: 200, dmg: 0 },
        { kind: "clock", harm: false, label: "💀 wizards", color: "#cfd0e8", frac: 0.45, cd: 240, dmg: 0 },
      ],
    };
    base.lanes = [
      { enemies: [_enemy("boneWizard", 3, 0, [], "w1", "Blasts EVERYONE in its lane for 1 every 10s.",
        { bars: [{ kind: "passive", harm: true, label: "✦1", scope: "lane", color: "#ff9ed2", cd: 100, frac: 0.55, dmg: 1 }] })] },
      { enemies: [_enemy("boneWizard", 3, 0, [], "w2", "Blasts EVERYONE in its lane for 1 every 10s.",
        { bars: [{ kind: "passive", harm: true, label: "✦1", scope: "lane", color: "#ff9ed2", cd: 100, frac: 0.9, dmg: 1 }] })] },
    ];
    base.players = [
      { id: "me", name: "Hero", lane: 0, depth: 0, bodyKey: "vampire", hp: 8, maxHp: 11, alive: true, phys: 3,
        targetId: "B1",
        inv: [_inv("blade", 20), _inv("fire", 45), _inv("heal", 10)] },
      { id: "p2", name: "Mara", lane: 1, depth: 0, bodyKey: "pixie", hp: 5, maxHp: 7, alive: true, inv: [] },
    ];
  } else if (kind === "solo") {
    // solo = ONE lane (lanes = player count). Verifies the N-column renderer at N=1.
    base.phase = "playing";
    base.laneCount = 1;
    base.caravan = { hp: 16, max: 20 };
    // a SUMMON line in front of the solo hero (the owner's real scenario: solo + summons, summonSide
    // "front") — exercises the friendly-line spacing fix so the tokens don't clip the hero/nameplate.
    base.lanes = [{ shield: 2,
      allies: [{ bodyKey: "rat", hp: 1, maxHp: 1 }, { bodyKey: "rat", hp: 1, maxHp: 1 }, { bodyKey: "totem", hp: 3, maxHp: 3, aura: { dmgReduce: 1 } }],
      enemies: [
      _enemy("killionaire", 11, 52, [{ key: "fire", name: "Fire" }], "t1", null, { phys: 4, counters: 1 }),
      _enemy("pixie", 4, 30, [{ key: "bow", name: "Bow" }]),
      _enemy("fatCat", 4, 20, [], null, "Summons a rat when hit."),
      _enemy("rat", 1, 8),
    ] }];
    base.players = [base.players[0]];
    base.players[0].lane = 0;
  } else {
    base.phase = kind === "setup" ? "setup" : "playing";
  }
  return base;
}
if (_demo) window.addEventListener("load", () => {
  you = "me"; activeId = "me";
  $("roomCode").textContent = "ROOM DEMO";
  $("lobby").classList.add("hidden");
  $("game").classList.remove("hidden");
  sizeCanvas();
  // a broken fixture/fetch should SAY so on the shot, not silently fall back to the lobby
  const showErr = (err) => { ctx.fillStyle = "#f66"; ctx.font = "12px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    String(err.stack || err).split("\n").forEach((ln, i) => ctx.fillText(ln.slice(0, 110), 8, 8 + i * 14)); };
  // HONEST RENDER HOOK (dev/test only — owner 2026-06-25): `?demo=realsnap&scene=X` pulls a GENUINE
  // client snapshot from a harness that drives the ACTUAL game.js engine (real run, real foe roster,
  // real hydra) and serves it at /realsnap. This supersedes the hand-built buildDemoSnap fixture so a
  // screenshot reflects how the game really looks. GATED behind ?demo=realsnap → inert in normal play
  // (a real player never sets it; against the live server /realsnap 404s and showErr paints the error).
  if (_demo === "realsnap") {
    const scene = new URLSearchParams(location.search).get("scene") || "combat";
    fetch("/realsnap?scene=" + encodeURIComponent(scene))
      .then((r) => r.json()).then((s) => { if (s && s.error) throw new Error(s.error); state = s; render(); }).catch(showErr);
    return;
  }
  // LIVE scene (owner 2026-06-25): pull a REAL snapshot from game.js so the shot can never go stale
  // the way the hand-maintained fixtures did. Other scenes still use the client fixtures for now.
  if (_demo === "cardcombat") {
    fetch("/demosnap").then((r) => r.json()).then((s) => { if (s && s.error) throw new Error(s.error); state = s; render(); }).catch(showErr);
    return;
  }
  // COMBAT-LOG scene (owner 2026-06-25): a real lost-phase snapshot carrying a sample combatLog,
  // so the screenshot proves the Combat Log panel renders, scrolls, and is color-coded.
  if (_demo === "lostlog") {
    fetch("/demosnap?scene=lost").then((r) => r.json()).then((s) => { if (s && s.error) throw new Error(s.error); state = s; render(); }).catch(showErr);
    return;
  }
  try {
    state = buildDemoState(_demo); render();
    // screenshot hook: ?demo=…&bodymodal=1 pops the body-select menu open so it can be captured
    // (render() already ran the panel callbacks, so inventory.js has built the menu by now)
    if (new URLSearchParams(location.search).has("bodymodal")) window.KM.openBodyModal?.();
  } catch (err) { showErr(err); }
});
// ↺ RESTART (owner 2026-07-06, roommate playtest lock-up): a ROOM-WIDE hard reset — everyone back
// to a fresh draft, every seat kept. Two-tap confirm (no popup): first tap arms for 4s, second sends.
let _restartArm = 0;
$("restartBtn").onclick = () => {
  const b = $("restartBtn");
  if (Date.now() - _restartArm < 4000) {
    _restartArm = 0; b.textContent = "↺ Restart";
    send({ type: "restartRun" });
  } else {
    _restartArm = Date.now(); b.textContent = "↺ Everyone? tap again";
    setTimeout(() => { if (Date.now() - _restartArm >= 3900) { _restartArm = 0; b.textContent = "↺ Restart"; } }, 4200);
  }
};
// PLAYER CLOCK: the snapshot owns the effective room speed and every human seat's request. The
// button may echo only this seat's requested divisor while the command round-trips; it never advances
// combat or predicts that the room clock changed. In co-op the largest divisor (slowest request) wins.
const CLOCK_DIVISORS = Object.freeze([1, 2, 4]);
const CLOCK_LABELS = Object.freeze({ 1: "1×", 2: "½×", 4: "¼×" });
const clockDivisor = (value) => CLOCK_DIVISORS.includes(Number(value)) ? Number(value) : 1;
let _clockPending = null;
function updateClockBtn() {
  const b = $("clockBtn");
  const live = state?.phase === "playing";
  b.classList.toggle("hidden", !live);
  if (!live) { _clockPending = null; return; }

  const effective = clockDivisor(state.clock?.divisor);
  const authoritativeRequest = clockDivisor(state.clock?.requests?.[you]);
  let requested = authoritativeRequest;
  let pending = false;
  if (_clockPending) {
    if (authoritativeRequest === _clockPending.divisor || Date.now() - _clockPending.at > PEND_MS) {
      _clockPending = null;
    } else {
      requested = _clockPending.divisor;
      pending = true;
    }
  }

  const effectiveLabel = CLOCK_LABELS[effective];
  const requestedLabel = CLOCK_LABELS[requested];
  const next = CLOCK_DIVISORS[(CLOCK_DIVISORS.indexOf(requested) + 1) % CLOCK_DIVISORS.length];
  // Compare against the confirmed request, not the optimistic echo: until the server accepts this
  // seat's new request, an ally really is still the reason the authoritative clock is slower.
  const allyHeld = effective > authoritativeRequest;
  const allyCopy = allyHeld ? ` An ally is holding the slower ${effectiveLabel} clock.` : "";
  const pendingCopy = pending
    ? ` Your ${requestedLabel} request is pending; your confirmed request is ${CLOCK_LABELS[authoritativeRequest]}.`
    : "";
  const help = `Combat clock. Effective speed: ${effectiveLabel}. Your request: ${requestedLabel}. `
    + `Slowest player wins.${allyCopy}${pendingCopy} Click to request ${CLOCK_LABELS[next]}.`;
  b.title = help;
  b.setAttribute("aria-label", help);
  b.setAttribute("aria-pressed", String(requested > 1));
  b.classList.toggle("pending", pending);
  b.classList.toggle("ally-held", allyHeld);
  b.textContent = IS_TOUCH
    ? `◷ ${effectiveLabel}${pending ? "…" : ""}`
    : `Clock ${effectiveLabel}${allyHeld ? " · ally" : ""}${pending ? ` · requesting ${requestedLabel}` : ""}`;
}
$("clockBtn").onclick = () => {
  if (state?.phase !== "playing") return;
  const authoritativeRequest = clockDivisor(state.clock?.requests?.[you]);
  const requested = _clockPending && Date.now() - _clockPending.at <= PEND_MS
    ? _clockPending.divisor : authoritativeRequest;
  const next = CLOCK_DIVISORS[(CLOCK_DIVISORS.indexOf(requested) + 1) % CLOCK_DIVISORS.length];
  if (!CLOCK_DIVISORS.includes(next)) return;
  _clockPending = { divisor: next, at: Date.now() };
  send({ type: "setClock", divisor: next });
  updateClockBtn();
};

// SQUAD COMMAND is opt-in and squad-only. Solo keeps the original tap/one-card-queue surface
// byte-for-byte: this button stays hidden and normal card taps retain their legacy behavior.
function updatePlanBtn() {
  const b = $("planBtn");
  const squad = (state?.players || []).filter(isMine);
  const show = state?.phase === "playing" && squad.length >= 2;
  b.classList.toggle("hidden", !show);
  if (!show) { _planMode = false; b.setAttribute("aria-pressed", "false"); return; }
  const count = queuedCardsShown(pilot()).length;
  b.setAttribute("aria-pressed", String(_planMode));
  b.textContent = _planMode ? `✓ Plan${count ? ` · ${count}` : ""}` : `☷ Plan${count ? ` · ${count}` : ""}`;
  b.title = _planMode
    ? "PLAN ON — tap cards in the order you want them cast. Tap a numbered card to remove it; tap again to append it at the end. Each body keeps its own plan."
    : "Build an ordered cast plan for the body you are commanding. Cards fire one at a time, in order, at their first legal moment.";
  b.setAttribute("aria-label", b.title);
}
$("planBtn").onclick = () => {
  if (state?.phase !== "playing" || (state.players || []).filter(isMine).length < 2) return;
  _planMode = !_planMode;
  uiTelem("combat", _planMode ? "plan_on" : "plan_off");
  updatePlanBtn(); render();
};
function leaveToLobby() {
  // Tell the server to DROP our seat (any phase) BEFORE we close — otherwise a mid-run close just
  // HOLDS the seat and the party stays gated on our now-empty chair ("dead lobby my friend left").
  send({ type: "leave" });
  if (ws) { ws.onclose = null; try { ws.close(); } catch {} ws = null; }
  stopRejoin();
  myRoom = null; localStorage.removeItem("km_room"); // a deliberate leave shouldn't auto-rejoin
  banner.style.display = "none";
  you = null; activeId = null; state = null;
  _clockPending = null; _planMode = false; _planQueueEcho.clear();
  $("clockBtn").classList.add("hidden"); $("planBtn").classList.add("hidden");
  showEntryLobby();
  $("lobbyErr").textContent = "";
}
$("leaveBtn").onclick = leaveToLobby;

// A completed run is not an ordinary phase start. Route every visible victory CTA through the
// explicit room-wide fresh-draft protocol so stale won guards cannot leave the throne screen inert.
function startFreshRun(button = null) {
  if (button && !markActionPending(button, "STARTING NEW RUN…")) return;
  send({ type: "restartRun" });
}

// ── OPTIMISTIC INPUT ECHO (perf/net 2026-07-11, tunnel-lag work) ────────────────────────────
// Over a 150-300ms tunnel a tap used to do NOTHING until the next server snapshot round-tripped
// — the game read as dead. Now the INTENT paints immediately (target ring / heal-aim ring /
// lane walk / card-play dim) as a PENDING value, and the server stays the only authority: the
// moment a snapshot confirms it the pending entry dissolves into the real value; if the server
// never agrees (invalid pick, race, dropped message) the entry expires and the snapshot silently
// wins. NO OUTCOME is ever faked — no predicted damage, HP, or kills; input feedback only.
// FLAG PEND_MS (owner re-tune): 1500ms ≈ several round trips on a bad tunnel day.
const PEND_MS = 1500;
const _pend = new Map();       // "<kind>|<bodyId>" → { v, at }  (kinds: target / ally / lane)
const _pendPlays = new Map();  // hand-card instance id → sent-at ms (dims until it leaves the hand)
function serverQueuedCards(me) {
  if (Array.isArray(me?.queuedCards)) return me.queuedCards;
  return me?.queuedCard ? [me.queuedCard] : [];
}
function queuedCardsShown(me) {
  const serverQueue = serverQueuedCards(me);
  const echo = _planQueueEcho.get(me?.id);
  if (!echo) return serverQueue;
  if (Date.now() - echo.at > PEND_MS) { _planQueueEcho.delete(me?.id); return serverQueue; }
  const serverSig = serverQueue.map((q) => `${q.id}:${q.pick ?? ""}`).join("|");
  const echoSig = echo.entries.map((q) => `${q.id}:${q.pick ?? ""}`).join("|");
  if (serverSig === echoSig) { _planQueueEcho.delete(me.id); return serverQueue; }
  const projected = echo.entries.map((entry, index) => {
    const card = (me?.hand ?? []).find((c) => c.id === entry.id);
    return card ? { id: card.id, key: card.key, name: card.name, cost: card.cost,
      shortfall: Math.max(0, (card.cost ?? 0) - (me?.moxie ?? 0)), pick: entry.pick ?? null,
      priority: index + 1, planned: true } : null;
  }).filter(Boolean);
  return projected;
}
function queuedCardShown(me) {
  const serverQueued = serverQueuedCards(me)[0] ?? null;
  if (serverQueued?.planned || _planQueueEcho.has(me?.id)) return queuedCardsShown(me)[0] ?? null;
  const echo = _queueEcho;
  if (!echo || echo.bodyId !== me?.id) return serverQueued;
  if (Date.now() - echo.at > PEND_MS) { _queueEcho = null; return serverQueued; }
  if (echo.id == null) return null;
  const card = (me?.hand ?? []).find((c) => c.id === echo.id);
  if (!card) { _queueEcho = null; return serverQueued; }
  return { id: card.id, key: card.key, name: card.name, cost: card.cost,
    shortfall: Math.max(0, (card.cost ?? 0) - (me?.moxie ?? 0)), pick: echo.pick ?? null };
}
function pendSet(kind, v) { _pend.set(kind + "|" + activeId, { v, at: Date.now() }); render(); }
// read a value through its pending overlay — the server value wins on match or expiry
function pendRead(kind, serverVal) {
  const k = kind + "|" + activeId, p = _pend.get(k);
  if (!p) return serverVal;
  if (serverVal === p.v || Date.now() - p.at > PEND_MS) { _pend.delete(k); return serverVal; }
  return p.v;
}
// is this exact value still an UNCONFIRMED local echo? (drives the dashed pending styling)
function pendActive(kind, v) {
  const p = _pend.get(kind + "|" + activeId);
  return !!p && p.v === v && Date.now() - p.at <= PEND_MS;
}
// echoing send wrappers — every aim/walk tap-site routes through these
function sendTarget(foeId) { pendSet("target", foeId); send({ type: "target", foeId }); }
function sendAllyTarget(playerId) { pendSet("ally", playerId); send({ type: "allyTarget", playerId }); }
// ── LANE-CHANGE COOLDOWN (owner 2026-07-24: six seconds between lane changes) ────────────────
// The ENGINE is authoritative (engine/combat.js changeLane): during `playing` a VOLUNTARY lane
// change is REFUSED while ticks remain, and the refusal is recorded on the player. Depth
// (↑/↓ and the ▲▼ touch pad → {type:"move"}) is NOT gated and never reads any of this.
// Snapshot contract — per player `laneCd` (ticks LEFT, 0 = ready, projected 0 outside `playing`)
// and `laneBlockedTick` (the room tick of the last REFUSED change); room-level `laneChangeCd` is
// the full cooldown, so the fraction below never hardcodes the owner's 60.
// Units: TICKS. 10 ticks = 1 second (engine TICK_MS = 100) — a protocol constant, not a
// gameplay number, so it carries no FLAG.
const TICKS_PER_SEC = 10;
const laneCdTicks = () => Math.max(0, (state?.players || []).find((q) => q.id === activeId)?.laneCd ?? 0);
const laneCdReady = () => laneCdTicks() <= 0;
// null when an older server ships no room-level max — the readout then shows seconds with no bar
// rather than inventing a denominator.
const laneCdMaxTicks = () =>
  (Number.isFinite(state?.laneChangeCd) && state.laneChangeCd > 0) ? state.laneChangeCd : null;
// FLAG (assistant default — presentation only, owner's to re-tune): how long a REFUSED lane press
// stays lit. Long enough to be seen at a glance, short enough that mashing reads as many taps.
const LANE_BLOCK_FLASH_MS = 900;
let _laneBlock = null;              // { at, lane } — most recent refused change (local echo + server confirm)
let _laneBlockSeen;                 // last `laneBlockedTick` turned into a flash (undefined = never observed)
let _laneBlockOwner = null;         // the body those two belong to (possession switches reset them)
function noteLaneBlocked(lane) {    // local echo: light the refusal on finger-down, not one RTT later
  _laneBlock = { at: Date.now(), lane: lane == null ? null : lane };
  render();
}
// Fold the server's authoritative refusal marker into the same flash. The FIRST observation only
// seeds the baseline — a stale `laneBlockedTick` carried in from an earlier room must not flash.
function syncLaneBlocked(mePlayer) {
  if (_laneBlockOwner !== activeId) { _laneBlockOwner = activeId; _laneBlockSeen = undefined; _laneBlock = null; }
  const t = mePlayer?.laneBlockedTick ?? null;
  if (t === _laneBlockSeen) return;
  const first = _laneBlockSeen === undefined;
  _laneBlockSeen = t;
  if (!first && t != null) _laneBlock = { at: Date.now(), lane: _laneBlock?.lane ?? null };
}
function sendLane(lane) {
  // Do NOT predict a move the cooldown will refuse. The old unconditional pendSet painted the hero
  // in the tapped lane for PEND_MS on every mashed tap, so a refused walk looked like a ghost hero
  // sliding across the board for the whole six seconds. Still SEND: the server records the refusal
  // (laneCdBlockedTick / laneCdBlocks → telemetry) and a refused {lane} is a clean no-op.
  if (!laneCdReady()) { noteLaneBlocked(lane); send({ type: "lane", lane }); return; }
  pendSet("lane", lane); send({ type: "lane", lane });
}
function sendLaneDir(dir) {   // arrow-key steps predict the clamped landing lane locally
  const meNow = (state?.players || []).find((q) => q.id === activeId);
  const cur = meNow ? pendRead("lane", meNow.lane) : null;
  const to = cur == null ? null : Math.max(0, Math.min(COLS - 1, cur + (dir === "up" ? -1 : 1)));
  if (!laneCdReady()) {
    // An edge press (already in lane 0 / the last lane) changes nothing, so the engine charges and
    // refuses nothing — don't flash a "locked" the server never recorded.
    if (to !== cur) { noteLaneBlocked(to); send({ type: "lane", dir }); }
    return;
  }
  if (to != null) pendSet("lane", to);
  send({ type: "lane", dir });
}
// The cooldown readout. Drawn into the EMPTY seam strip below the board (the band the caravan bar
// used to occupy), centred on the piloted body's lane, so it adds no layout and steals no taps.
// Silent at COLS === 1: a solo run has one lane, so there is nothing to cool down.
function drawLaneCooldown(players) {
  if (COLS < 2 || state?.phase !== "playing") return;
  const me = (players || []).find((p) => p.id === activeId);
  if (!me) return;
  const left = laneCdTicks();
  const flash = _laneBlock && Date.now() - _laneBlock.at < LANE_BLOCK_FLASH_MS ? _laneBlock : null;
  if (!left && !flash) return;                       // ready and nothing refused → no chrome at all
  const lane = Math.max(0, Math.min(COLS - 1, me.lane | 0));
  ctx.save();
  // A refused press also outlines the lane you tried to enter, so the rejection is spatial and not
  // just a number in a strip. Stroke only — it can never hide a body.
  if (flash && flash.lane != null && flash.lane !== lane) {
    ctx.globalAlpha = 0.55 * (1 - (Date.now() - flash.at) / LANE_BLOCK_FLASH_MS);
    ctx.strokeStyle = "#ff6a5a"; ctx.lineWidth = 3;
    ctx.strokeRect(laneX(flash.lane) + 2, 2, Math.max(0, laneW(flash.lane) - 4), CARAVAN_Y - 4);
    ctx.globalAlpha = 1;
  }
  // FLAG (assistant defaults — pill geometry inside the existing seam band; owner's to re-tune).
  // Nothing here changes the board's layout: the strip is already painted and already empty.
  const h = Math.max(12, CARAVAN_H - 6);
  const w = Math.max(96, Math.min(laneW(lane) - 10, 208));
  const x = Math.round(colCenter(lane) - w / 2), y = Math.round(CARAVAN_Y + (CARAVAN_H - h) / 2);
  const max = laneCdMaxTicks();
  const secs = left / TICKS_PER_SEC;
  const hot = !!flash;
  ctx.fillStyle = "#0c0f15";
  ctx.strokeStyle = hot ? "#ff6a5a" : left ? "#e6c34a" : "#4a5262";
  ctx.lineWidth = hot ? 2 : 1;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.fill(); ctx.stroke(); }
  else { ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
  if (max && left) {                                  // elapsed fraction — fills as the lock releases
    const frac = Math.max(0, Math.min(1, 1 - left / max));
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 2, y + 2, Math.max(0, (w - 4) * frac), h - 4, 4);
    else ctx.rect(x + 2, y + 2, Math.max(0, (w - 4) * frac), h - 4);
    ctx.fillStyle = hot ? "#5a1c18" : "#3a3417"; ctx.fill();
    ctx.restore();
  }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.max(9, Math.min(12, h - 8))}px ui-monospace, monospace`;
  ctx.fillStyle = hot ? "#ffb3a8" : left ? "#e6c34a" : "#9aa3b0";
  const label = left
    ? `${hot ? "✋ LANE LOCKED" : "🔒 LANE"} ${secs.toFixed(1)}s`
    : "✋ LANE LOCKED";
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  ctx.restore();
}

// ── RENDER INTERPOLATION (perf/net 2026-07-11, tunnel-lag work) ─────────────────────────────
// The canvas used to snap every entity to each 100ms snapshot — under tunnel jitter that reads
// as teleporting. Each entity's DRAW position now glides from where it was last painted to its
// new slot over LERP_MS. Layout math stays on the raw server slots, and NUMBERS (HP / moxie /
// counters / bars) keep snapping — motion is smoothed, values are never tweened lies. Hit-boxes
// are pushed at the SMOOTHED position so taps land on what the eye sees. Phase changes clear
// the registry (message handler) — a new room never slides in from the old one's geometry.
// FLAG LERP_MS (owner re-tune): 120ms ≈ one server tick of glide.
const LERP_MS = 120;
const _tw = new Map();   // entity key ("h:"/"a:"/"f:" + id) → { x, y, fx, fy, tx, ty, t0, at }
let _twNeed = false, _twRaf = 0;
function twPos(key, x, y) {
  const now = performance.now();
  let t = _tw.get(key);
  if (!t) { t = { x, y, fx: x, fy: y, tx: x, ty: y, t0: 0, at: now }; _tw.set(key, t); }
  if (t.tx !== x || t.ty !== y) { t.fx = t.x; t.fy = t.y; t.tx = x; t.ty = y; t.t0 = now; }   // retarget mid-glide from the drawn spot
  const k = t.t0 ? Math.min(1, (now - t.t0) / LERP_MS) : 1;
  t.x = t.fx + (t.tx - t.fx) * k;
  t.y = t.fy + (t.ty - t.fy) * k;
  t.at = now;
  if (k < 1) _twNeed = true;   // still gliding → _renderFrame schedules one rAF repaint
  return t;
}

// ── CAST VFX (semantic events from engine/combat.js) ─────────────────────────
// Every card gets a source wind-up plus a resolver-authored path. True body passives use the body
// portrait; delayed card effects keep the originating card art. Ordered targets are gameplay order,
// not client guesses. Fixed caps keep AUTO/echo/passive storms bounded without blocking input.
const CAST_FX_ACTIVE_MAX = 36;
const CAST_FX_DUR = { cast: 900, path: 860, sword: 600, lightning: 650, meteors: 760 };
let _castFxSeen = 0;
const _castFxActive = [];
const _castFxAnchors = new Map();             // last painted entity centers; lets a lethal hit land visibly

// ── STATE IS SACRED; EFFECTS ARE DECORATION (owner ruling 2026-07-25) ────────────────────────
// Three rules, enforced by construction rather than by tuning:
//  1. Every path/glow/ring/overlay paints BENEATH the unit cards and rows (drawCastFxUnder runs
//     before a single body draws; drawCastFxOver only re-reads anchors and lights borders). Motion
//     is untouched, but a flying graphic can no longer sit on an HP number.
//  2. The traveling card graphic is scaled down — it identifies WHICH card is in flight, it is not
//     a portrait.
//  3. Impact is an EDGE-FLASH on the target's own border (a border cannot occlude the content it
//     surrounds) plus a floating damage number placed in provably free space (see fctFreeBands).
// FLAG (owner re-tune): traveling-token scale. 1 = the old ~portrait size; owner steer was ~40%.
const CAST_FX_TOKEN_SCALE = 0.4;
// FLAG (owner re-tune): unscaled token art size (card art vs. body portrait) before the scale above.
const CAST_FX_TOKEN_BASE = { card: 29, body: 31 };
// FLAG (owner re-tune): a lane/summon effect with no real body to light keeps a small landing ring;
// this is its max radius. It is drawn under the units, so it cannot cover anything either way.
const CAST_FX_LANDING_R = 12;
// FLAG (owner re-tune): edge-flash lifetime (ms) and how many borders may glow at once.
const CAST_FX_EDGE_MS = 280;
const CAST_FX_EDGE_MAX = 24;
const _fxEdge = new Map();                    // entity id → { at, color, mag } (bounded, pooled)

// An impact registers here instead of painting an expanding ring over the board. Repeat hits on one
// body in the same window keep the strongest, so a Spear passing through four bodies still reads.
function noteEdgeFlash(id, color, mag = 1) {
  if (id == null) return;
  const now = performance.now(), prev = _fxEdge.get(id);
  if (prev && now - prev.at < CAST_FX_EDGE_MS && (prev.mag ?? 0) >= mag) { prev.at = now; return; }
  _fxEdge.set(id, { at: now, color: color || "#e6c34a", mag: Math.max(0, Math.min(1, mag)) });
  if (_fxEdge.size > CAST_FX_EDGE_MAX) {
    for (const [key, v] of _fxEdge) { if (now - v.at > CAST_FX_EDGE_MS) _fxEdge.delete(key); }
    while (_fxEdge.size > CAST_FX_EDGE_MAX) _fxEdge.delete(_fxEdge.keys().next().value);
  }
}

// Post-unit pass: light the target's OWN border. The stroke is INSET inside the entity's own
// (non-overlapping) hit-box, so by construction it lands on the card's border/padding band and can
// never cross into a neighbouring row, lane, or the body's own text.
function drawEdgeFlashes() {
  if (!_fxEdge.size) return;
  const now = performance.now();
  for (const [id, f] of _fxEdge) {
    const age = (now - f.at) / CAST_FX_EDGE_MS;
    if (age >= 1) { _fxEdge.delete(id); continue; }
    const box = foeBoxes.find((b) => b.id === id) || heroBoxes.find((b) => b.id === id);
    if (!box) continue;
    const a = Math.sin(Math.PI * Math.min(1, age * 0.9 + 0.1)) * (0.45 + 0.55 * (f.mag ?? 1));
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.strokeStyle = f.color; ctx.lineWidth = 2;
    ctx.shadowColor = f.color; ctx.shadowBlur = 6;
    if (box.w != null && box.h != null) roundRect(box.x + 1.5, box.y + 1.5, Math.max(2, box.w - 3), Math.max(2, box.h - 3), 6);
    else { ctx.beginPath(); ctx.arc(box.x, box.y, Math.max(4, (box.r ?? 14) - 1.5), 0, Math.PI * 2); }
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function syncCastFx() {
  const now = performance.now(), tick = state?.tick ?? 0;
  for (const fx of state?.castFx ?? []) {
    if (!(fx.id > _castFxSeen)) continue;
    _castFxSeen = fx.id;
    const ageMs = Math.max(0, tick - (fx.tick ?? tick)) * 100;
    if (ageMs > (CAST_FX_DUR[fx.kind] ?? 400)) continue; // reconnect/keyframe: never replay an expired ring as a burst
    _castFxActive.push({ ...fx, at: now - ageMs });
  }
  if (_castFxActive.length > CAST_FX_ACTIVE_MAX)
    _castFxActive.splice(0, _castFxActive.length - CAST_FX_ACTIVE_MAX);
}

function rememberCastFxAnchors() {
  const now = performance.now();
  for (const b of foeBoxes) _castFxAnchors.set("foe:" + b.id, { x: b.x + b.w / 2, y: b.y + b.h / 2, at: now });
  // fxCapTop = the top of this body's persistent name chip (heroes on a narrow lane only). The
  // cast-name callout docks above it so transient FX can never sit on the label.
  for (const b of heroBoxes) _castFxAnchors.set("hero:" + b.id,
    { x: b.w != null ? b.x + b.w / 2 : b.x, y: b.h != null ? b.y + b.h / 2 : b.y, at: now,
      fxCapTop: b.fxCapTop ?? null, intentBadge: !!b.intentBadge });
  if (_castFxAnchors.size > 400) {
    const cut = now - 3000;
    for (const [key, a] of _castFxAnchors) if (a.at < cut) _castFxAnchors.delete(key);
  }
}

function castFxAnchor(fx, target = null) {
  const targetId = target?.id ?? fx.targetId, targetSide = target?.side ?? fx.targetSide;
  const key = targetId != null ? `${targetSide || "foe"}:${targetId}` : null;
  if (key && _castFxAnchors.has(key)) return _castFxAnchors.get(key);
  const lane = target?.lane ?? fx.lane;
  return { x: colCenter(Math.max(0, Math.min(COLS - 1, lane | 0))),
    y: targetSide === "hero" ? PLAYER_Y : Math.max(70, PLAYER_Y * 0.48) };
}

function castFxSourceAnchor(fx) {
  const key = fx.sourceId != null ? `${fx.sourceSide || "hero"}:${fx.sourceId}` : null;
  if (key && _castFxAnchors.has(key)) return _castFxAnchors.get(key);
  return { x: colCenter(Math.max(0, Math.min(COLS - 1, fx.lane | 0))),
    y: fx.sourceSide === "foe" ? Math.max(70, PLAYER_Y * 0.48) : PLAYER_Y };
}

function drawGenericCastFx(fx, p) {
  const a = castFxSourceAnchor(fx), alpha = Math.sin(Math.PI * p), color = fx.color || "#e6c34a";
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.shadowColor = color; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(a.x, a.y, 18 + p * 22, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = alpha * 0.25;
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(a.x, a.y, 14 + p * 8, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  // The universal animation carries the card's OWN token, so every successful card remains visually
  // identifiable even without a bespoke Sword/Lightning/Meteors effect. Unique generated SVGs make
  // this a genuinely card-specific motion language rather than 134 differently named generic rings.
  const art = fx.cardKey ? cardSprite(fx.cardKey) : null;
  if (art?.complete && art.naturalWidth) {
    const size = 20 + 8 * Math.sin(Math.PI * p), lift = p * 16;
    ctx.save(); ctx.translate(a.x, a.y - lift); ctx.rotate((fx.sourceSide === "foe" ? -1 : 1) * (p - 0.5) * 0.34);
    ctx.globalAlpha = Math.min(1, alpha * 1.4); ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.drawImage(art, -size / 2, -size / 2, size, size); ctx.restore();
  }
  // Other heroes get the small card-name callout. Your own hand already names your cast, so the
  // actively commanded body keeps the board clear of duplicate copy.
  // …and a narrow lane has ONE band above the name chip. The teammate-intent badge already owns it
  // and already names the card, so a callout there would print the same name twice, stacked.
  const bandTaken = a.fxCapTop != null && a.intentBadge;
  if (fx.sourceSide === "hero" && fx.sourceId !== activeId && fx.cardName && !bandTaken) {
    // The callout started 34px above the body's CENTER — which on a narrow lane is EXACTLY the
    // name-chip band (py − R_HERO − 22 … − 3), so a companion's own cast printed straight across
    // "Companion 2". A body that reports fxCapTop (narrow lanes, where the friendly planner
    // reserves HERO_INTENT_BAND above the chip) docks the callout ABOVE that chip and rises inside
    // the reserved band instead of climbing into the foe rows.
    // FLAG (owner re-tune): the 3px chip clearance and the 5px docked rise are mine.
    const y = a.fxCapTop != null ? a.fxCapTop - 12 - p * 5 : a.y - 34 - p * 12;
    ctx.globalAlpha = Math.min(1, alpha * 1.35);
    ctx.font = "bold 11px ui-monospace, monospace";
    const label = String(fx.cardName), tw = Math.min(150, ctx.measureText(label).width + 12);
    ctx.fillStyle = "#0c0f15dd"; roundRect(a.x - tw / 2, y - 9, tw, 18, 7); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1; roundRect(a.x - tw / 2, y - 9, tw, 18, 7); ctx.stroke();
    ctx.fillStyle = "#f7f8fb"; fitText(label, a.x, y, tw - 8, 11, 8, "center", "middle");
  }
  ctx.restore();
}

function castFxArt(fx) {
  return fx.cardKey ? cardSprite(fx.cardKey) : fx.bodyKey ? foeSprite(fx.bodyKey) : null;
}

function castFxRoutePoint(points, q) {
  if (points.length <= 1) return points[0] ?? { x: 0, y: 0 };
  const scaled = Math.max(0, Math.min(0.9999, q)) * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(scaled)), t = scaled - i;
  return { x: points[i].x + (points[i + 1].x - points[i].x) * t,
    y: points[i].y + (points[i + 1].y - points[i].y) * t };
}

function drawCastFxToken(fx, point, alpha, spin = 0) {
  const art = castFxArt(fx), color = fx.color || "#e6c34a";
  // SHRUNK (owner 2026-07-25): this used to render at roughly hero-portrait size and was the
  // graphic sitting on top of foe rows in the boss-crowd capture. It still has to answer "which
  // card is flying at whom", which a small token does; it never had to be a portrait.
  const size = Math.max(6, Math.round((fx.bodyKey ? CAST_FX_TOKEN_BASE.body : CAST_FX_TOKEN_BASE.card) * CAST_FX_TOKEN_SCALE));
  const ring = size / 2 + Math.max(1.5, size * 0.1);
  ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(spin);
  ctx.globalAlpha = alpha; ctx.fillStyle = "#090c12e8"; ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.11); ctx.shadowColor = color; ctx.shadowBlur = 7;
  ctx.beginPath(); ctx.arc(0, 0, ring, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 4;
  if (art?.complete && art.naturalWidth)
    ctx.drawImage(art, -size / 2, -size / 2, size, size);
  else {
    ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.max(8, Math.round(size * 0.52))}px ui-monospace, monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✦", 0, 1);
  }
  ctx.restore();
}

// `keys` is parallel to `points`: keys[i] is the entity id standing at points[i] (null for the
// source and for synthetic lane landing points). Impact lights THAT body's border instead of
// painting a ring across whatever happens to be behind it.
function drawPathRoute(fx, points, p, branch = 0, keys = null) {
  if (!points.length) return;
  const color = fx.color || "#e6c34a";
  const travel = Math.max(0, Math.min(1, (p - 0.08 - branch * 0.035) / 0.72));
  const fade = p < 0.82 ? 1 : Math.max(0, (1 - p) / 0.18);
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.18 + 0.32 * fade;
  ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
  const reached = travel * Math.max(1, points.length - 1);
  for (let i = 1; i < points.length; i++) {
    const burst = reached - i;
    if (burst < 0 || burst > 0.62) continue;
    const a = 1 - burst / 0.62;
    const id = keys?.[i] ?? null;
    if (id != null) { noteEdgeFlash(id, color, a); continue; }   // real body → light its own border
    // No body at this point (an empty lane / summon destination): keep a SMALL landing ring so the
    // effect still lands somewhere visible. Bounded by CAST_FX_LANDING_R and drawn under the units.
    const r = CAST_FX_LANDING_R * (0.35 + 0.65 * burst / 0.62);
    ctx.globalAlpha = a * 0.7; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(points[i].x, points[i].y, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  drawCastFxToken(fx, castFxRoutePoint(points, travel), Math.min(1, fade * 1.25),
    (fx.sourceSide === "foe" ? -1 : 1) * travel * 0.7);
}

function drawPathCastFx(fx, p) {
  const source = castFxSourceAnchor(fx);
  if (fx.shape === "self") {
    const a = p * Math.PI * 2, r = 22 + 5 * Math.sin(Math.PI * p);
    drawPathRoute(fx, [source, { x: source.x + Math.cos(a) * r, y: source.y - 17 - Math.sin(a) * 10 },
      source], p);
    return;
  }
  const targets = (fx.targets ?? []).map((target) => ({ target, point: castFxAnchor(fx, target) }));
  if (fx.shape === "board" && targets.length) {
    const byLane = new Map();
    for (const entry of targets) {
      const lane = entry.target.lane ?? fx.lane ?? 0;
      if (!byLane.has(lane)) byLane.set(lane, []);
      byLane.get(lane).push(entry);
    }
    let branch = 0;
    for (const entries of byLane.values())
      drawPathRoute(fx, [source, ...entries.map((e) => e.point)], p, branch++,
        [null, ...entries.map((e) => e.target.id ?? null)]);
    return;
  }
  const points = targets.map((entry) => entry.point);
  const keys = [null, ...targets.map((entry) => entry.target.id ?? null)];
  if (!points.length) {
    const lane = Math.max(0, Math.min(COLS - 1, fx.lanes?.[0] ?? fx.lane ?? 0));
    const friendlyLaneEffect = ["summon", "summonArmed", "summonPick", "animateWeapons"].includes(fx.op);
    const targetSide = friendlyLaneEffect ? fx.sourceSide : (fx.sourceSide === "foe" ? "hero" : "foe");
    points.push({ x: colCenter(lane), y: targetSide === "hero"
      ? Math.max(90, PLAYER_Y - 66) : Math.max(70, PLAYER_Y * 0.42) });
    keys.push(null);   // synthetic lane landing point — no body to light
  }
  drawPathRoute(fx, [source, ...points], p, 0, keys);
}

function drawSwordFx(fx, p) {
  const a = castFxAnchor(fx), r = 22 + 8 * Math.sin(Math.PI * p);
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(fx.sourceSide === "foe" ? -0.72 : 0.72);
  ctx.globalAlpha = Math.sin(Math.PI * p);
  ctx.shadowColor = "#fff4c4"; ctx.shadowBlur = 10;
  ctx.strokeStyle = "#fff4c4"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-r * 0.42, 0); ctx.lineTo(r, 0); ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = "#d2a84f"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(-r * 0.48, 0); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r * 0.48, -8); ctx.lineTo(-r * 0.48, 8); ctx.stroke();
  ctx.fillStyle = "#f4f6fb"; ctx.beginPath(); ctx.moveTo(r + 7, 0); ctx.lineTo(r - 2, -4); ctx.lineTo(r - 2, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#d2a84f"; ctx.beginPath(); ctx.arc(-r - 2, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawLightningFx(fx, p) {
  const lane = Math.max(0, Math.min(COLS - 1, fx.lane | 0)), x = laneX(lane), w = laneW(lane);
  const alpha = Math.sin(Math.PI * p);
  ctx.save();
  const glow = ctx.createLinearGradient(0, 0, 0, CARAVAN_Y);
  glow.addColorStop(0, `rgba(95,208,255,${0.08 * alpha})`);
  glow.addColorStop(0.5, `rgba(120,225,255,${0.22 * alpha})`);
  glow.addColorStop(1, `rgba(95,208,255,${0.06 * alpha})`);
  ctx.fillStyle = glow; ctx.fillRect(x + 2, 0, Math.max(0, w - 4), CARAVAN_Y);
  ctx.globalAlpha = alpha * 0.62; ctx.strokeStyle = "#bff5ff"; ctx.lineWidth = 2;
  ctx.shadowColor = "#5fd0ff"; ctx.shadowBlur = 7; ctx.lineJoin = "round";
  for (let bolt = 0; bolt < 2; bolt++) {
    const bx = x + w * (0.36 + bolt * 0.28), skew = bolt % 2 ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(bx, 4);
    for (let y = 42, step = 0; y < CARAVAN_Y; y += 42, step++)
      ctx.lineTo(bx + skew * ((step % 2 ? -1 : 1) * Math.min(22, w * 0.035)), y);
    ctx.lineTo(bx, CARAVAN_Y - 4); ctx.stroke();
  }
  ctx.restore();
}

function drawMeteorsFx(fx, p) {
  const lane = Math.max(0, Math.min(COLS - 1, fx.lane | 0)), x = laneX(lane), w = laneW(lane);
  const foeImpact = fx.sourceSide !== "foe";
  const ys = foeImpact ? [74, 132, 196] : [PLAYER_Y - 70, PLAYER_Y - 18, PLAYER_Y + 34];
  const xs = [0.24, 0.54, 0.78];
  const actual = (fx.targets ?? []).slice(0, 6).map((target) => castFxAnchor(fx, target));
  const impacts = actual.length ? actual : xs.map((u, i) => ({ x: x + w * u, y: ys[i] }));
  ctx.save();
  for (let i = 0; i < impacts.length; i++) {
    const delay = i * 0.09, q = Math.max(0, Math.min(1, (p - delay) / 0.76));
    if (q <= 0) continue;
    const ix = impacts[i].x, iy = Math.max(28, Math.min(CARAVAN_Y - 18, impacts[i].y));
    if (q < 0.58) {
      const fall = q / 0.58, my = -36 + (iy + 36) * (1 - Math.pow(1 - fall, 2));
      ctx.globalAlpha = Math.min(1, fall * 2);
      ctx.strokeStyle = "#ff9a55"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.shadowColor = "#ff5a3c"; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.moveTo(ix - 20, my - 32); ctx.lineTo(ix, my); ctx.stroke();
      ctx.fillStyle = "#fff0c2"; ctx.shadowColor = "#ff5a3c"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(ix, my, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else {
      const hit = (q - 0.58) / 0.42, fade = 1 - hit * 0.78;
      ctx.globalAlpha = fade; ctx.strokeStyle = "#ffb36b"; ctx.lineWidth = 3;
      ctx.shadowColor = "#ff5a3c"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(ix, iy, 9 + hit * 24, 4 + hit * 11, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#fff0c2"; ctx.beginPath(); ctx.arc(ix, iy, 5 * (1 - hit * 0.45), 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#ff7047"; ctx.lineWidth = 2;
      for (let s = 0; s < 4; s++) {
        const a = -2.6 + s * 0.72, d = 8 + hit * 17;
        ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * 5, iy + Math.sin(a) * 3);
        ctx.lineTo(ix + Math.cos(a) * d, iy + Math.sin(a) * d * 0.55); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// UNDER-PASS — runs before the first body paints. Anchors come from the previous frame's boxes
// (rememberCastFxAnchors now runs in the over-pass, after the units draw); that map was always the
// "last painted entity centers" cache, so one frame of lag costs nothing and buys a hard guarantee
// that no travel path, glow, ring or authored overlay can ever sit on top of a stat.
function drawCastFxUnder() {
  syncCastFx();
  const now = performance.now();
  for (let i = _castFxActive.length - 1; i >= 0; i--) {
    const fx = _castFxActive[i], dur = CAST_FX_DUR[fx.kind] ?? 400, p = (now - fx.at) / dur;
    if (p >= 1) { _castFxActive.splice(i, 1); continue; }
    if (fx.kind === "cast") drawGenericCastFx(fx, p);
    else if (fx.kind === "path") {
      const overlayDur = CAST_FX_DUR[fx.overlay] ?? dur;
      const overlayP = (now - fx.at) / overlayDur;
      if (overlayP < 1) {
        if (fx.overlay === "sword") drawSwordFx(fx, overlayP);
        else if (fx.overlay === "lightning") drawLightningFx(fx, overlayP);
        else if (fx.overlay === "meteors") drawMeteorsFx(fx, overlayP);
      }
      drawPathCastFx(fx, p);
    }
    else if (fx.kind === "sword") drawSwordFx(fx, p);
    else if (fx.kind === "lightning") drawLightningFx(fx, p);
    else if (fx.kind === "meteors") drawMeteorsFx(fx, p);
  }
}

// OVER-PASS — the only cast-FX ink allowed above the units, and it is confined to borders the game
// already draws. Also re-reads the anchor cache from the boxes this frame actually painted.
function drawCastFxOver() {
  rememberCastFxAnchors();
  drawEdgeFlashes();
}

// ---- input ---------------------------------------------------------------
// Vertical lanes: left/right move between columns. Number keys play the matching hand slot.
// (Server lanes are abstract:
// 'up' = lane-1 = move left, 'down' = lane+1 = move right.)
function handSlotFromKey(e) {
  const byCode = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || "");
  const byKey = /^([1-9])$/.exec(e.key || "");
  return Number((byCode || byKey)?.[1] || 0) - 1;
}
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if ($("game").classList.contains("hidden")) return; // in the lobby: never hijack typing
  if (e.code === "ArrowLeft" || e.code === "KeyA") { sendLaneDir("up"); e.preventDefault(); }
  else if (e.code === "ArrowRight" || e.code === "KeyD") { sendLaneDir("down"); e.preventDefault(); }
  else if (e.code === "ArrowUp" || e.code === "KeyW") { send({ type: "move", dir: "fwd" }); e.preventDefault(); }   // step toward foes (block)
  else if (e.code === "ArrowDown" || e.code === "KeyS") { send({ type: "move", dir: "back" }); e.preventDefault(); } // drop back behind teammates
  // Tab / Shift+Tab cycle the FOE TARGET (owner 2026-07-10 bug report — "tab target change" was
  // dead once you piloted a squad: cyclePossess() returned true and SWALLOWED the target cycle, so
  // Tab only ever changed which body you piloted). Possession is switched by CLICKING a squad body
  // or a squad-bar chip (🔁 on touch), so Tab is dedicated to the target again — solo and squad alike.
  else if (e.code === "Tab") { send({ type: "cycleTarget", dir: e.shiftKey ? -1 : 1 }); e.preventDefault(); }
  else if (e.code === "KeyQ") { send({ type: "swapBody" }); e.preventDefault(); }
  // POSSESS-CYCLE (owner 2026-07-10): re-added after Tab became the foe-target cycle (b602fc0). Backtick /
  // Shift+backtick pilots the next / previous body in YOUR squad — the SAME cyclePossess the old Tab used
  // (and that clicking a squad body or the 🔁 chip still triggers). FLAG (owner default): ` (Backquote) is
  // a default binding — an unbound key chosen so it collides with nothing (arrows/WASD move, Tab targets,
  // Q swaps, 1-9 hand slots) — rebind at will.
  else if (e.code === "Backquote") { cyclePossess(e.shiftKey ? -1 : 1); e.preventDefault(); }
  else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    const slot = handSlotFromKey(e);
    if (slot >= 0) { playHandSlot(slot); e.preventDefault(); }
  }
});

// CARD/MOXIE: an affordable card casts now; an unaffordable card becomes the player's one queued
// manual intent and fires as soon as live moxie reaches its live cost.  The server owns the queue;
// this local echo only makes the tap visible during the network round trip.
function sendCardIntent(card, pick = null) {
  if (!card || _pendPlays.has(card.id)) return;
  if (_planMode && (state?.players || []).filter(isMine).length >= 2) {
    const current = queuedCardsShown(pilot()).map((q) => ({ id: q.id, pick: q.pick ?? null }));
    const existing = current.findIndex((q) => q.id === card.id);
    if (existing >= 0 && current[existing].pick !== (pick ?? null)) current[existing] = { id: card.id, pick: pick ?? null };
    else if (existing >= 0) current.splice(existing, 1);
    else current.push({ id: card.id, pick: pick ?? null });
    _planQueueEcho.set(activeId, { entries: current, at: Date.now() });
    send({ type: "queueCard", id: card.id, ...(typeof pick === "string" ? { pick } : {}) });
    updatePlanBtn(); render();
    return;
  }
  const queued = queuedCardShown(pilot());
  if (card.affordable === false) {
    const togglingOff = queued?.id === card.id && (queued?.pick ?? null) === (pick ?? null);
    _queueEcho = { bodyId: activeId, id: togglingOff ? null : card.id,
      pick: togglingOff ? null : pick, at: Date.now() };
  } else {
    _queueEcho = { bodyId: activeId, id: null, pick: null, at: Date.now() };
    _pendPlays.set(card.id, Date.now());
  }
  send({ type: "playCard", id: card.id, ...(typeof pick === "string" ? { pick } : {}) });
  render();
}
function playHandSlot(k) {
  if (_pickHand) {
    const choice = pickHandEntries()[k];
    if (!choice) return;
    if (choice.nav) { _pickHand.page += choice.nav; _handTip = null; render(); return; }
    choosePickHand(choice.pickKey);
    return;
  }
  const card = (pilot()?.hand ?? [])[k];
  if (!card) return;
  if (card.pick) { openPickUI(card); return; }   // pick-cards (owner 2026-07-07): choose first, then play
  sendCardIntent(card);
}

// ── PICK POPOVER (owner cards 2026-07-07: Grand Spirit / Crystal Ball) ──────────────────────
// A hand card whose descriptor carries `pick` needs a choice BEFORE the play message:
//   {kind:"summonBody", options:[{key,label,icon}]} → one button per body (attacker/caster/tank)
//   {kind:"deckCard"}                               → the draw pile, grouped ×N, tap = tutor that card
//   {kind:"meleeRanged", options:[melee,ranged]}    → the MODAL buffs (Sharpened Edges / Demon Form):
//     pick which kind the +1 buffs (foes/bots never reach here — the engine auto-picks by kit/bonuses)
//     FLAG UI SHAPE (owner 2026-07-11 SE ruling asked for a minimal two-option tap choice): kept the
//     EXISTING pick-popover grammar (same surface as Grand Spirit / Crystal Ball / level-up) — two big
//     tap buttons 🗡 Melee / 🎯 Ranged — rather than inventing a second inline-toggle grammar beside
//     SUMMONS FRONT/BACK. Owner to say if he wants it inline on the hotbar card instead.
// Plain DOM over the canvas (the overlays' pattern), sends the SAME playCard message + pick, and
// cancels on backdrop tap / Esc. The server validates the pick and has engine-side fallbacks, so a
// stale or garbage pick can never crash or softlock the seat.
let _pickEl = null, _pickHand = null, _passiveChoiceSent = null;
const PICK_PAGE_SIZE = 3;
function pickChoicesFor(card) {
  const kind = card?.pick?.kind;
  if (kind === "summonBody") return (card.pick.options ?? []).map((o) => {
    const b = state?.bodies?.[o.icon] ?? {};
    return { pickKey: o.key, name: o.label, text: b.passiveText || "Summon this body.",
      color: b.color || card.color, bodyKey: o.icon, hp: b.maxHp };
  });
  if (kind === "meleeRanged" || kind === "position" || kind === "laneArrange" || kind === "weaponChoice" || kind === "sphinxChoice") return (card.pick.options ?? []).map((o) => ({
    pickKey: o.key, name: o.label, text: kind === "weaponChoice" || kind === "sphinxChoice" ? o.text : kind === "position"
      ? (o.key === "front" ? "Move the aimed foe to the front of its lane." : "Move the aimed foe to the back of its lane.")
      : kind === "laneArrange" ? (o.key === "reverse" ? "Reverse front-to-back order in the aimed lane." : `Move every foe in the aimed lane ${o.key}.`)
      : `Choose ${o.label.toLowerCase()} for this card's effect.`,
    color: card.color, glyph: o.icon,
  }));
  if (kind === "deckCard") {
    const me = pilot(), pile = [...(me?.drawPile ?? []), ...(me?.discPile ?? [])];
    if (!pile.length) return [{ pickKey: "", name: "Play Anyway", text: "Your draw and discard piles are empty.", color: card.color, glyph: "▶" }];
    const grouped = new Map();
    for (const c of pile) grouped.set(c.key, { c, n: (grouped.get(c.key)?.n ?? 0) + 1 });
    return [...grouped.values()].sort((a, b) => a.c.name.localeCompare(b.c.name)).map(({ c, n }) => ({
      ...c, pickKey: c.key, cardKey: c.key, name: `${c.name}${n > 1 ? ` ×${n}` : ""}`,
    }));
  }
  return [{ pickKey: "", name: "Play", text: "Use the card's default choice.", color: card?.color, glyph: "▶" }];
}
function pickHandEntries() {
  if (!_pickHand) return [];
  const all = _pickHand.choices;
  if (all.length <= 5) return all;
  const pages = Math.ceil(all.length / PICK_PAGE_SIZE);
  _pickHand.page = Math.max(0, Math.min(pages - 1, _pickHand.page | 0));
  const out = all.slice(_pickHand.page * PICK_PAGE_SIZE, (_pickHand.page + 1) * PICK_PAGE_SIZE);
  if (_pickHand.page > 0) out.unshift({ nav: -1, name: "Previous", text: "Earlier choices.", glyph: "◀", color: "#596372" });
  if (_pickHand.page < pages - 1) out.push({ nav: 1, name: "Next", text: "More choices.", glyph: "▶", color: "#596372" });
  return out;
}
function closePickUI(redraw = true) {
  if (_pickEl) { _pickEl.remove(); _pickEl = null; }
  _pickHand = null; _handTip = null;
  if (redraw && state) render();
}
function cancelPickHand() {
  if (_pickHand?.card?.passiveChoice) return; // an armed body choice is mandatory; its timer waits here
  const onCancel = _pickHand?.onCancel;
  closePickUI();
  onCancel?.();
}
function choosePickHand(pick) {
  const ph = _pickHand;
  if (!ph) return;
  _pickHand = null; _handTip = null;
  if (ph.onPick) ph.onPick(pick);
  else sendCardIntent(ph.card, pick);
  render();
}
function openPickHand(card, onPick, onCancel) {
  _pickHand = { card, kind: card.pick?.kind || "unknown", choices: pickChoicesFor(card), page: 0, onPick, onCancel };
  _handTip = null;
  render();
}
function syncPassiveChoice() {
  const choice = pilot()?.passiveChoice ?? null;
  if (!choice) {
    _passiveChoiceSent = null;
    if (_pickHand?.card?.passiveChoice) { _pickHand = null; _handTip = null; }
    return;
  }
  if (_passiveChoiceSent?.id === choice.id && Date.now() - _passiveChoiceSent.at < 1500) {
    if (_pickHand?.card?.passiveChoice) { _pickHand = null; _handTip = null; }
    return;
  }
  if (_pickHand?.card?.id === choice.id || _pickHand || _pickEl) return;
  _pickHand = {
    card: choice, kind: choice.pick?.kind || "sphinxChoice", choices: pickChoicesFor(choice), page: 0,
    onPick: (pick) => {
      _passiveChoiceSent = { id: choice.id, at: Date.now() };
      send({ type: "passiveChoice", choice: pick });
    },
    onCancel: null,
  };
  _handTip = null;
}
window.KM.choosePick = choosePickHand;
// `onPick(pick)` (R4) overrides the default playCard send — the LEVEL-UP flow reuses this same
// meleeRanged popover to choose which type its +combat ramps, then sends a `levelUp` instead.
function openPickUI(card, onPick, onCancel) {
  closePickUI(false);
  if (card?.id && state?.phase === "playing") { openPickHand(card, onPick, onCancel); return; }
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;";
  const panel = document.createElement("div");
  panel.style.cssText = "background:#151a23;border:1px solid #39404d;border-radius:10px;padding:14px 16px;max-width:min(92vw,420px);max-height:80vh;overflow-y:auto;font-family:ui-monospace,monospace;color:#f4f5f7;";
  const title = document.createElement("div");
  title.style.cssText = "font-weight:700;margin-bottom:10px;font-size:15px;color:#ffd24a;";
  const kind = card.pick?.kind;
  wrap.className = "km-pick-modal"; wrap.dataset.pickKind = kind || "unknown";
  title.textContent = kind === "summonBody" ? `${card.name} — choose its body`
    : kind === "meleeRanged" ? `${card.name} — ${card.pick?.prompt || "melee or ranged?"}`
    : kind === "weaponChoice" ? `${card.name} — ${card.pick?.prompt || "choose a weapon"}`
    : kind === "sphinxChoice" ? `${card.name} — ${card.pick?.prompt || "choose one"}`
    : kind === "position" ? `${card.name} — front or back?`
    : kind === "laneArrange" ? `${card.name} — reshape the aimed lane`
    : `${card.name} — pick a card from your deck`;
  panel.appendChild(title);
  const send1 = (pick) => {
    if (onPick) onPick(pick);
    else sendCardIntent(card, pick);
    closePickUI();
  };
  const btn = (label, pick, iconKey, cardKey) => {
    const b = document.createElement("button");
    b.dataset.pick = String(pick);
    b.style.cssText = "display:flex;align-items:center;gap:10px;width:100%;margin:4px 0;padding:8px 10px;background:#0f131b;border:1px solid #39404d;border-radius:8px;color:#f4f5f7;font:600 14px ui-monospace,monospace;cursor:pointer;text-align:left;";
    if (iconKey) { const im = document.createElement("img"); im.src = foeSprite(iconKey).src; im.width = 40; im.height = 40; b.appendChild(im); }  // pick-popover body icon 30→40 (icons +30%)
    else if (cardKey) { const im = document.createElement("img"); im.src = `/cards/${cardArtStem(cardKey)}.svg`; im.width = 32; im.height = 32; im.onerror = () => im.remove(); b.appendChild(im); }  // tutor picker: the card's own icon
    const sp = document.createElement("span"); sp.textContent = label; b.appendChild(sp);
    b.onclick = () => send1(pick);
    panel.appendChild(b); return b;
  };
  if (kind === "summonBody") {
    for (const o of card.pick.options ?? []) btn(o.label, o.key, o.icon);
  } else if (kind === "meleeRanged" || kind === "position" || kind === "laneArrange" || kind === "weaponChoice" || kind === "sphinxChoice") {
    // MODAL buffs (owner 2026-07-09): the emoji is a plain glyph, NOT a foe-sprite key → bake it into
    // the label (don't pass it as iconKey, which would try to load a sprite).
    for (const o of card.pick.options ?? []) btn(`${o.icon ?? ""} ${o.label}`.trim(), o.key);
  } else if (kind === "deckCard") {
    // owner 2026-07-10 "let it pick ANY card including used ones": offer the WHOLE deck — draw pile
    // PLUS discard (already-played cards) — not just the draw pile. The engine tutor matches (deck+disc).
    const me = pilot();
    const pile = [...(me?.drawPile ?? []), ...(me?.discPile ?? [])];
    if (!pile.length) {
      const d = document.createElement("div"); d.style.cssText = "color:#a6afbd;font-size:12px;margin-bottom:6px;";
      d.textContent = "Deck is empty — plays with no tutor."; panel.appendChild(d);
      btn("Play anyway", "");
    }
    const grouped = new Map();               // one button per distinct card key, ×N label
    for (const c of pile) grouped.set(c.key, { c, n: (grouped.get(c.key)?.n ?? 0) + 1 });
    [...grouped.values()].sort((a, b) => a.c.name.localeCompare(b.c.name))
      .forEach(({ c, n }) => btn(`⚡${c.cost} ${c.name}${n > 1 ? ` ×${n}` : ""}${c.dmg ? `  ${c.dmg}` : ""}`, c.key, null, c.key));
  } else { send1(""); return; }              // unknown pick kind: the engine fallback decides
  const cancel = document.createElement("button");
  cancel.dataset.pickCancel = "1";
  cancel.style.cssText = "margin-top:10px;width:100%;padding:7px;background:none;border:1px solid #59637255;border-radius:8px;color:#a6afbd;font:12px ui-monospace,monospace;cursor:pointer;";
  const cancel1 = () => { closePickUI(); onCancel?.(); };
  cancel.textContent = "cancel"; cancel.onclick = cancel1; panel.appendChild(cancel);
  wrap.appendChild(panel);
  wrap.onclick = (e) => { if (e.target === wrap) cancel1(); };
  document.body.appendChild(wrap);
  _pickEl = wrap;
}
addEventListener("keydown", (e) => { if (e.key === "Escape") _pickHand ? cancelPickHand() : closePickUI(); });

// ---- read-current-body affordance (R6) -------------------------------------
// The ⓘ HUD button reads your CURRENT body's card (passive/HP/tempo) WITHOUT opening the swap menu
// — window.KM.openBodyCard lives in inventory.js and reuses the swap grid's body-card visual. It's a
// dedicated DOM button (NOT a board tap), so it never collides with the aim tap grammar
// (tap-foe=attack, tap-any-body=support-aim; 🔁 drives another body). Shown only with a live body.
$("bodyCardBtn")?.addEventListener("click", () => window.KM?.openBodyCard?.());

// ---- touch controls --------------------------------------------------------
// Phones get a floating d-pad + action buttons (see #touchHud in index.html) that
// send the SAME messages the keyboard sends — the server can't tell them apart.
// Gated on a coarse primary pointer so desktop never changes; ?touch=1 forces it
// (screenshots, devtools device mode). Item use on touch = tapping the hotbar card.
// (IS_TOUCH is declared up top now — the board geometry needs it — so this block just uses it.)
if (IS_TOUCH) {
  document.body.classList.add("touch");
  $("help").innerHTML = `tap a LANE to walk there &nbsp;·&nbsp; tap a FOE to attack-aim &nbsp;·&nbsp; tap a BODY or summon (yours too) to aim support &nbsp;·&nbsp; 🔁 command your next body &nbsp;·&nbsp; HOLD a foe to read it &nbsp;·&nbsp; ▲ ▼ step forward / back &nbsp;·&nbsp; tap a card to play it`;
  const TK = {
    // laneUp/laneDown are GONE (owner 2026-07-06, "the dpad still feels super clunky"):
    // lane movement is now a TAP on the board lane itself (cv click handler). ▲ ▼ stay —
    // a lane tap means "walk there"; depth-stepping past teammates has no tap surface.
    fwd: { type: "move", dir: "fwd" }, back: { type: "move", dir: "back" },
    // `cycle` no longer sends a server message — it cycles LOCAL possession (handled below).
  };
  document.querySelectorAll("#touchHud [data-tk]").forEach((b) => {
    // pointerdown (not click): a soft-real-time game wants the step on finger DOWN
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const tk = b.dataset.tk;
      // LOCAL-action buttons (owner 2026-07-27: "in party mode mobile there's no switch bodies button").
      // These three were sending `undefined` to the server — none was ever wired. The 🔁 cycle in
      // particular never switched bodies, which was masked until tap-to-possess became tap-to-aim, so
      // party-mobile lost body-switching entirely. Wire each to its real handler: 🔁 cycles to the next
      // owned body, 🎭 opens the direct body picker (possess any one — better than cycling four), ⓘ reads
      // the current body's card.
      if (tk === "cycle") { cyclePossess(1); return; }
      if (tk === "swap") { window.KM?.openBodyModal?.(); return; }
      if (tk === "bodycard") { window.KM?.openBodyCard?.(); return; }
      const msg = TK[tk];
      if (msg) send(msg);   // fwd / back → the same server "move" the keyboard sends
    });
    b.addEventListener("contextmenu", (e) => e.preventDefault()); // no long-press menu mid-fight
  });
  if (new URLSearchParams(location.search).has("tprobe")) setTimeout(() => { // headless layout probe
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().width > innerWidth + 2)
      .slice(0, 8)
      .map((el) => `${el.tagName}#${el.id || el.className}=${Math.round(el.getBoundingClientRect().width)}`);
    document.title = `vw:${innerWidth} sw:${document.documentElement.scrollWidth} | ${wide.join(" ")}`;
  }, 500);
}

// ---- rendering -----------------------------------------------------------
const cv = $("cv"), ctx = cv.getContext("2d");
// RESPONSIVE BOARD (owner 2026-06-19): the board is a fixed W×H LOGICAL surface, but the canvas
// BACKING STORE is now sized to the element's DISPLAYED size × devicePixelRatio, with one transform
// mapping logical→device pixels. CSS scales the element up to fill the screen; this keeps it CRISP
// (text/shapes re-rasterize at the real pixel size) instead of stretching a 780px raster. Every
// draw call still uses W/H — only the transform changes, so nothing else in render() moves.
function applyTransform() { ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0); }
// ── PHONE-LANDSCAPE FILL (owner 2026-07-11 "dead space" pass) ──────────────────────────────
// The board is 780×392 logical on touch (aspect ~1.99) but a landscape phone's usable box is
// ~2.3–2.6:1, and the old CSS fit used a fixed worst-case 64px chrome budget — so the canvas
// letterboxed to ~75% of the width (black flanks; the ▲▼ pad floating in one) with a dead band
// under the hotbar. Now the client MEASURES the real box each frame — #center's content width
// (its padding reserves the ▲▼ gutter) by the height left below the actual hud row (so a hud
// that wraps taller auto-shrinks the board instead of clipping the hotbar off the overflow:hidden
// page) — sizes the canvas element to exactly that box, and widens the LOGICAL W to the same
// aspect. Zero letterbox by construction, and X/Y draw scales stay equal so nothing distorts.
// Tap math is untouched: toCanvas maps through the same rect and the same live W.
// Desktop/portrait: W snaps back to BASE_W and CSS sizing resumes (inline styles cleared).
const W_MAX = BASE_W * 2;   // sanity cap (no sane phone box is wider than ~2.6:1)
function fitBoardBox() {
  const phoneLandscape = IS_TOUCH && innerWidth > innerHeight && innerHeight <= 600;
  if (!phoneLandscape) {
    if (W !== BASE_W || cv.style.width) {
      W = BASE_W; document.documentElement.style.setProperty("--bw", W);
      cv.style.width = ""; cv.style.height = ""; cv.style.maxHeight = "";
    }
    return;
  }
  const center = cv.parentElement, game = $("game");
  if (!center || !game || game.classList.contains("hidden")) return;  // lobby — nothing to fit yet
  const cs = getComputedStyle(center);
  const availW = center.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  const top = cv.getBoundingClientRect().top;                          // real chrome height, measured not guessed
  const inset = parseFloat(getComputedStyle(game).paddingBottom) || 0; // env(safe-area-inset-bottom) via #game
  const availH = innerHeight - top - inset - 4;                        // 4px breathing room at the bottom edge
  if (availW < 40 || availH < 120) return;                             // degenerate mid-layout pass — keep the last fit
  W = Math.max(BASE_W, Math.min(W_MAX, Math.round(H * availW / availH)));
  const fitW = Math.min(availW, availH * (W / H));                     // == availW unless the BASE_W floor kicked in
  const wPx = fitW.toFixed(1) + "px", hPx = (fitW * H / W).toFixed(1) + "px";
  if (cv.style.width !== wPx || cv.style.height !== hPx) {             // write-on-change only (this runs every frame)
    document.documentElement.style.setProperty("--bw", W);
    cv.style.width = wPx; cv.style.height = hPx;
    cv.style.maxHeight = "none";                                       // the CSS fallback clamp must not fight the measured box
  }
}
function sizeCanvas() {
  fitBoardBox();                                           // settle the element box (and W) before reading it back
  const dpr = Math.min(3, window.devicePixelRatio || 1);   // cap DPR so hi-dpi phones don't allocate huge buffers
  const r = cv.getBoundingClientRect();
  if (!r.width || !r.height) { cv.width = W; cv.height = H; applyTransform(); return; } // hidden/pre-layout: native fallback
  const bw = Math.max(1, Math.round(r.width * dpr)), bh = Math.max(1, Math.round(r.height * dpr));
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }            // realloc only on a real size change
  applyTransform();
}
sizeCanvas();
// re-fit on viewport changes (the board was fixed-size before, so nothing listened for resize)
let _resizeT;
addEventListener("resize", () => { clearTimeout(_resizeT); _resizeT = setTimeout(() => { sizeCanvas(); render(); }, 80); });

// Mouse tracking is DESKTOP-ONLY. Safari/Chromium synthesize a compatibility mousemove after a
// touch tap and leave it parked under the finger; feeding that into the desktop hover renderers made
// a plain phone tap raise card/foe/effect inspectors. Touch has explicit hold/tap inspect state below.
const mouse = { x: -1, y: -1 };
let foeBoxes = []; // filled each render: { x, y, w, h, id } for click-to-target
let _inspectFoeId = null; // touch: a tapped foe whose inspect overlay stays open (desktop uses hover)
let heroBoxes = []; // filled each render: circle {x,y,r,id} or mini-card {x,y,w,h,id} for ally targeting
let _effectBoxes = []; // filled each render: { x, y, r, label, left, dur, timed } for buff-chip hover
let _tapChip = null;   // touch (owner 2026-07-01): a tapped buff/debuff chip shows its label for a moment ({...box, until})
let _deckPeek = false; // touch (owner 2026-07-01): 🂠-counter tap toggles the draw/discard peek panel
// HOLD a hand card to READ it (owner 2026-07-01: no hover on a phone, and a plain tap PLAYS the
// card — so its text was unreadable in combat). ~360ms hold shows the card's full inspector ONLY
// while the finger stays down; the release click is swallowed via _handHeld so reading never casts.
// Owner 2026-07-13: a tap must never leave the inspector bar covering the board.
let _handTip = null;      // {k} — hand slot being actively held
let _handHeld = false, _handHoldTimer = null, _handHoldXY = null;
let _foeHeld = false;     // touch: a 360ms hold pinned a foe's inspect — eat the release click (tap = TARGET now)
let _bossBannerBottom = 0; // y of the boss banner's bottom edge (set in drawBossBanner) — foe stacks start below it
let _bossBannerGap = 6;    // …and the clearance the foe stacks keep under it (the folded rail runs tighter)
// LAYOUT PROOF (owner 2026-07-24 "foes go off screen"): per-lane foe-band geometry, republished every
// render on window.KM.board.foeBands so a harness can ASSERT how many foes a lane actually drew and
// how tall each row was — instead of a human counting rectangles in a screenshot.
let _foeBands = [];
// PAINTED-BUT-NOT-TAPPABLE ink (owner 2026-07-25). Hit-boxes are the board's map of what you can
// TOUCH; a few real readouts carry no hit-box at all — the teammate intent badge (which owns
// HERO_INTENT_BAND above the name chip) and the lane shield-pool overlay. Floating damage numbers
// must treat them as solid, or the number lands on the card name it is meant to sit above.
// Refilled every render, right where each of them paints.
let _fxBlockers = [];

// ── FLOATING FEEDBACK (owner 2026-06-24): show buffs/passives FIRING. A small rising "+N" label pops
// on an entity whenever its damage (⚔ counters), shield (🛡), or health (❤ heal/regen) ticks UP —
// players AND foes, any source (Power Up, bruiser ramps, regen crowns, heals…). Driven purely off
// snapshot deltas (no server hooks): diff each entity's stats once per snapshot.
let _floaters = [];        // { id, text, color, mag, born, dx }
let _fctPrev = {};         // id -> { hp, shield, counters } from the previous snapshot
let _fctTick = -1;
const FCT_LIFE = 9;        // snapshots a floater lives (~0.9s at the ~10/s snapshot cadence)
const FCT_MAX = 24;        // pooled/bounded: a Meteors + boss-swarm tick can't spawn an unbounded list
// ── DAMAGE NUMBERS (owner ruling 2026-07-25: "the number scales with the damage") ───────────────
// Amount comes from the REAL snapshot delta on the entity — the same source the ❤/🛡/⚔ gain
// floaters have used since 2026-06-24 — so nothing is inferred or guessed.
// FLAG (owner re-tune): the whole damage→size mapping.
//   `1` damage draws at FCT_PX_MIN; `FCT_PX_FULL` damage and above draws at FCT_PX_MAX; the
//   exponent shapes the middle (<1 = ramps early so chip damage still reads as "small but there").
//   Worked examples at the shipped values: 1→12px, 2→14.5px, 4→17.7px, 6→19.6px, 10→24.3px, 18+→30px.
const FCT_PX_MIN = 12;
const FCT_PX_MAX = 30;
const FCT_PX_FULL = 18;
const FCT_PX_CURVE = 0.7;
// FLAG (owner re-tune): the hard floor a clamped number may shrink to before it is dropped, and how
// far a floater may drift inside its band over its life.
const FCT_PX_FLOOR = 9;
const FCT_RISE = 18;
const FCT_DOCK_WHEN_PACKED = true;   // see fctPlace's last tier
function fctPx(mag) {
  const span = Math.max(1, FCT_PX_FULL - 1);
  const t = Math.max(0, Math.min(1, (Math.abs(mag ?? 1) - 1) / span));
  return FCT_PX_MIN + (FCT_PX_MAX - FCT_PX_MIN) * Math.pow(t, FCT_PX_CURVE);
}
function fctLaneOf(cx) {
  for (let i = 0; i < COLS; i++) if (cx >= laneX(i) && cx < laneX(i) + laneW(i)) return i;
  return Math.max(0, Math.min(COLS - 1, Math.floor((cx / Math.max(1, W)) * COLS)));
}
// FLAG (owner re-tune): clearance kept around every drawn body, and how far from its target a
// number may be parked before it is dropped as more confusing than useful.
const FCT_PAD = 2;
const FCT_NEAR = 120;
// Vertical bands in this narrow column that NO drawn body occupies — INCLUDING the target's own row,
// which is why a number can never sit on the very stat it is reporting. Boxes never overlap (the
// scenario harness asserts that), so a label inside a band is incapable of covering a name, HP
// value, shield value or telegraph. `fxTop`/`fxBottom` override the hit-box where the painted
// extent is larger than the touch target (hero name chip + HP plate). Bounded O(boxes).
function fctFreeBands(left, right) {
  const spans = [];
  const add = (b) => {
    const rectW = b.w != null, rectH = b.h != null, rad = b.r ?? 14;
    const bl = b.fxLeft ?? (rectW ? b.x : b.x - rad), br = b.fxRight ?? (rectW ? b.x + b.w : b.x + rad);
    if (br <= left || bl >= right) return;
    const top = b.fxTop ?? (rectH ? b.y : b.y - rad);
    const bottom = b.fxBottom ?? (rectH ? b.y + b.h : b.y + rad);
    spans.push([top - FCT_PAD, bottom + FCT_PAD]);
  };
  for (const b of foeBoxes) add(b);
  for (const b of heroBoxes) add(b);
  for (const b of _fxBlockers) add(b);
  for (const d of _fctDrawn) add(d);   // numbers already placed this frame — never stack two on one spot
  spans.sort((a, b) => a[0] - b[0]);
  const bands = [];
  let y = Math.max(2, _bossBannerBottom || 0);   // the boss banner owns the strip above the lanes
  for (const [t, b] of spans) { if (t > y) bands.push([y, t]); y = Math.max(y, b); }
  if (CARAVAN_Y - 2 > y) bands.push([y, CARAVAN_Y - 2]);
  return bands;
}
// Pick the size AND the slot together. Two clamps, both hard:
//   • horizontal — the label is shrunk until it fits inside its OWN lane column, so the largest
//     number can never bleed into a neighbouring lane;
//   • vertical — it is placed in a free band (nearest above the row first, per the owner's ask,
//     then nearest below, then the roomiest in that column) and shrunk to that band's height, so
//     the largest number can never bleed onto a neighbouring row.
function fctPlace(f, box) {
  const rect = box.w != null && box.h != null, rad = box.r ?? 14;
  const cx0 = rect ? box.x + box.w / 2 : box.x;
  const top = rect ? box.y : box.y - rad, bottom = rect ? box.y + box.h : box.y + rad;
  const lane = fctLaneOf(cx0);
  const laneL = laneX(lane) + 3, laneR = laneX(lane) + laneW(lane) - 3, laneInner = Math.max(24, laneR - laneL);
  let px = fctPx(f.mag);
  for (let guard = 0; guard < 6; guard++) {
    ctx.font = `bold ${px}px ui-monospace, monospace`;
    const tw = ctx.measureText(f.text).width;
    if (tw <= laneInner || px <= FCT_PX_FLOOR) break;
    px = Math.max(FCT_PX_FLOOR, px * (laneInner / tw) * 0.98);
  }
  ctx.font = `bold ${px}px ui-monospace, monospace`;
  const tw = ctx.measureText(f.text).width;
  const need = px + 3;
  const rowHalf = rect ? box.w / 2 : rad;
  // Three horizontal candidates, all inside the target's own lane: over the row's centre, and just
  // OUTSIDE either end of it. A solo/wide board leaves fat empty margins beside the foe cards, so
  // the beside-slots usually win and the number lands level with the row it belongs to. A narrow
  // 4-lane board has full-width rows, so the side candidates clamp back onto the centre and the
  // search falls through to the vertical gaps.
  const candXs = [cx0 + f.dx, cx0 + rowHalf + tw / 2 + 4, cx0 - rowHalf - tw / 2 - 4];
  const rowMid = (top + bottom) / 2;
  let best = null;
  for (const raw of candXs) {
    const cx = Math.max(laneL + tw / 2, Math.min(laneR - tw / 2, raw));
    const hOff = Math.abs(cx - cx0);
    for (const b of fctFreeBands(cx - tw / 2 - 2, cx + tw / 2 + 2)) {
      if (b[1] - b[0] < need) continue;
      // vertical distance from the row; 0 means the band runs BESIDE it
      const vGap = b[1] <= top ? top - b[1] : b[0] >= bottom ? b[0] - bottom : 0;
      if (vGap > FCT_NEAR) continue;
      // Owner's ask is "above the row", so above wins ties; sideways costs a little, distance costs more.
      const score = vGap + hOff * 0.55 + (b[1] <= top ? 0 : 6);
      if (!best || score < best.score)
        best = { score, cx, band: b, dir: b[0] >= bottom ? 1 : -1, vGap };
    }
  }
  let band = best?.band ?? null, dir = best?.dir ?? -1, cx = best?.cx ?? cx0;
  if (!band) {                                    // then: the roomiest nearby band, shrunk to fit
    cx = Math.max(laneL + tw / 2, Math.min(laneR - tw / 2, cx0 + f.dx));
    const away = (b) => b[1] <= top ? top - b[1] : b[0] >= bottom ? b[0] - bottom : 0;
    for (const b of fctFreeBands(cx - tw / 2 - 2, cx + tw / 2 + 2)) {
      if (away(b) > FCT_NEAR || b[1] - b[0] < FCT_PX_FLOOR + 3) continue;
      if (!band || b[1] - b[0] > band[1] - band[0]) band = b;
    }
    if (band) { px = Math.max(FCT_PX_FLOOR, Math.min(px, band[1] - band[0] - 3)); dir = band[1] <= top ? -1 : 1; }
  }
  if (!band) {
    // PACKED BOARD (4 players × 4 foes + boss + summons on a phone): there is no free floor left in
    // this lane at all — every pixel from the boss banner to the seam belongs to some body. Rather
    // than print nothing on exactly the busiest fight, the number DOCKS onto its own target's row,
    // clamped to that row's rect and its own lane, so it still cannot touch a NEIGHBOURING row or
    // lane (the owner's stated clamp). It rides a translucent pill so the row reads through it, and
    // it is gone in ~0.9s. FLAG (owner ruling): set FCT_DOCK_WHEN_PACKED = false to make a fully
    // packed lane print no number at all instead of briefly sitting on its own target's row.
    if (!FCT_DOCK_WHEN_PACKED) return null;
    px = Math.max(FCT_PX_FLOOR, Math.min(px, bottom - top - 4));
    return { cx, px, band: [top, bottom], dir: -1, adjacent: true, docked: true, rowMid };
  }
  return { cx, px, band, dir, rowMid, beside: (best?.vGap ?? 1) === 0,
    adjacent: dir < 0 ? band[1] >= top - 4 : band[0] <= bottom + 4 };
}
function _fctSnap() {
  if (!state || state.tick === _fctTick) return;   // once per SNAPSHOT (not per possession re-render)
  _fctTick = state.tick;
  if (state.phase !== "playing") { _fctPrev = {}; _floaters = []; return; }  // combat only
  const cur = {};
  const ents = [...(state.players || [])];
  for (const lane of (state.lanes || [])) for (const e of (lane.enemies || [])) ents.push(e); // snapshot lanes are { enemies, allies }
  for (const e of ents) {
    if (e.id == null) continue;
    const st = { hp: e.hp ?? 0, shield: e.shield ?? 0, counters: e.counters ?? 0 };
    cur[e.id] = st;
    const prev = _fctPrev[e.id];
    if (!prev) continue;                              // first sight this fight — nothing to compare
    const dC = st.counters - prev.counters, dS = st.shield - prev.shield, dH = st.hp - prev.hp;
    const push = (text, color, mag) => _floaters.push({ id: e.id, text, color, mag, born: state.tick,
      dx: Math.random() * 10 - 5 });
    if (dC > 0) push(`+${dC} ⚔`, "#ffd24a", dC);      // gained damage (Power Up / bruiser ramp)
    if (dS > 0) push(`+${dS} 🛡`, "#7fd6ff", dS);      // gained shield (regen crown / passive)
    if (dH > 0 && st.hp <= (e.maxHp ?? 1e9)) push(`+${dH} ❤`, "#7ce08a", dH); // healed (regen / lifesteal)
    // NEW (owner 2026-07-25): the game had no damage numbers at all. A hit now prints the real
    // amount, sized by that amount, and lights the victim's own border in the same beat. Heal /
    // shield / regen above share this exact codepath, so the whole feedback family stays one system.
    if (dH < 0) { push(`-${-dH}`, "#ff6b6b", -dH); noteEdgeFlash(e.id, "#ff5f5f", Math.min(1, -dH / FCT_PX_FULL)); }
    else if (dH > 0) noteEdgeFlash(e.id, "#7ce08a", Math.min(1, dH / FCT_PX_FULL));
    else if (dS > 0) noteEdgeFlash(e.id, "#7fd6ff", Math.min(1, dS / FCT_PX_FULL));
  }
  if (_floaters.length > FCT_MAX) _floaters.splice(0, _floaters.length - FCT_MAX);
  _fctPrev = cur;
}
// LAYOUT PROOF (same idea as window.KM.board.foeBands): the exact rect every damage/heal number
// painted this frame, so a harness can ASSERT "no floater rect intersects any body rect" instead of
// a human squinting at a PNG. Published on window.KM.ui.fct.
let _fctDrawn = [];
function _drawFct() {
  _fctDrawn = [];
  if (!_floaters.length) return;
  _floaters = _floaters.filter((f) => (state.tick - f.born) < FCT_LIFE);
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.lineJoin = "round";
  for (const f of _floaters) {
    const box = foeBoxes.find((b) => b.id === f.id) || heroBoxes.find((b) => b.id === f.id);
    if (!box) continue;                               // entity off-screen / gone this frame
    const slot = fctPlace(f, box);
    if (!slot) continue;                              // no provably-free space → stay silent
    const t = (state.tick - f.born) / FCT_LIFE;       // 0..1 over its life
    const room = Math.max(0, (slot.band[1] - slot.band[0]) - slot.px - 2);
    const drift = slot.docked ? 0 : Math.min(FCT_RISE, room) * t;
    // A band running BESIDE the row starts level with it and rises; a band above/below starts at the
    // edge nearest the row and drifts away. Every position is clamped inside the band it was sized to.
    const y = slot.docked ? slot.band[0] + (slot.band[1] - slot.band[0] + slot.px) / 2
      : slot.beside
        ? Math.max(slot.band[0] + slot.px + 2, Math.min(slot.band[1] - 2, slot.rowMid + slot.px / 2 - drift))
        : slot.dir < 0 ? slot.band[1] - 2 - drift : slot.band[0] + slot.px + 2 + drift;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.font = `bold ${slot.px}px ui-monospace, monospace`;
    if (slot.docked) {                                // let the row read THROUGH the number
      const pw = ctx.measureText(f.text).width + 8;
      ctx.globalAlpha = Math.max(0, 1 - t) * 0.55; ctx.fillStyle = "#05070c";
      roundRect(slot.cx - pw / 2, y - slot.px, pw, slot.px + 2, 4); ctx.fill();
      ctx.globalAlpha = Math.max(0, 1 - t);
    }
    // A tether back toward the row, drawn only inside the same free band — it never crosses a card.
    if (!slot.adjacent) {
      const anchorY = slot.dir < 0 ? slot.band[1] - 1 : slot.band[0] + 1;
      ctx.globalAlpha = Math.max(0, 1 - t) * 0.5;
      ctx.strokeStyle = f.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(slot.cx, y + (slot.dir < 0 ? 1 : -slot.px)); ctx.lineTo(slot.cx, anchorY); ctx.stroke();
      ctx.globalAlpha = Math.max(0, 1 - t);
    }
    ctx.lineWidth = Math.max(2, slot.px * 0.16); ctx.strokeStyle = "#05070ccc";
    ctx.strokeText(f.text, slot.cx, y);               // outline scales with the number so a 30px hit stays legible
    ctx.fillStyle = f.color; ctx.fillText(f.text, slot.cx, y);
    const tw = ctx.measureText(f.text).width;
    _fctDrawn.push({ id: f.id, text: f.text, px: Math.round(slot.px * 10) / 10,
      x: slot.cx - tw / 2, y: y - slot.px, w: tw, h: slot.px, docked: !!slot.docked });
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
// map a client point to LOGICAL board coords (0..W, 0..H) — independent of backing-store/DPR
const toCanvas = (e) => {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
};
// Enlarged mobile hitboxes may overlap by a few pixels in a hectic lane. Resolve that overlap by
// nearest center instead of whichever entity happened to draw first.
const nearestRectHit = (boxes, p) => boxes
  .filter((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h)
  .sort((a, b) => ((p.x - (a.x + a.w / 2)) ** 2 + (p.y - (a.y + a.h / 2)) ** 2)
    - ((p.x - (b.x + b.w / 2)) ** 2 + (p.y - (b.y + b.h / 2)) ** 2))[0];
const nearestHeroHit = (boxes, p) => boxes
  .filter((b) => b.w != null
    ? p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h
    : (p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= b.r * b.r)
  .sort((a, b) => {
    const ad = (p.x - (a.w != null ? a.x + a.w / 2 : a.x)) ** 2 + (p.y - (a.h != null ? a.y + a.h / 2 : a.y)) ** 2;
    const bd = (p.x - (b.w != null ? b.x + b.w / 2 : b.x)) ** 2 + (p.y - (b.h != null ? b.y + b.h / 2 : b.y)) ** 2;
    return ad - bd;
  })[0];
cv.addEventListener("mousemove", (e) => { if (IS_TOUCH) return; const p = toCanvas(e); mouse.x = p.x; mouse.y = p.y; render(); });
cv.addEventListener("mouseleave", () => { mouse.x = mouse.y = -1; render(); });
// PRESS-AND-HOLD a hand card → pin its tooltip (touch only; desktop reads via hover). Same 360ms /
// 10px-drift grammar as the HTML .km-card hold. The release click is eaten in the cv click handler.
cv.addEventListener("touchstart", (e) => {
  _handHeld = false; _foeHeld = false;
  if (_handTip) { _handTip = null; render(); }
  const t = e.touches[0]; if (!t || (state?.phase !== "playing" && state?.phase !== "setup")) return;
  const p = toCanvas(t);
  if (p.y < HOTBAR_Y + 22) {
    // BOARD hold: a plain tap TARGETS a foe now (owner 2026-07-06), so reading one moved
    // here — hold ~360ms to pin its inspect overlay, same grammar as the hand strip below.
    const fb = nearestRectHit(foeBoxes, p);
    if (!fb) return;
    _handHoldXY = { x: t.clientX, y: t.clientY };
    clearTimeout(_handHoldTimer);
    _handHoldTimer = setTimeout(() => { _foeHeld = true; _inspectFoeId = fb.id; render(); }, 360);
    return;
  }
  const hand = _pickHand ? pickHandEntries() : (pilot()?.hand ?? []);
  if (!hand.length) return;
  const k = Math.floor(p.x / (W / hand.length));
  if (k < 0 || k >= hand.length) return;
  _handHoldXY = { x: t.clientX, y: t.clientY };
  clearTimeout(_handHoldTimer);
  _handHoldTimer = setTimeout(() => { _handHeld = true; _handTip = { k }; render(); }, 360);
}, { passive: true });
cv.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  if (t && _handHoldXY && Math.hypot(t.clientX - _handHoldXY.x, t.clientY - _handHoldXY.y) > 10) clearTimeout(_handHoldTimer);
}, { passive: true });
const endCanvasHold = () => {
  clearTimeout(_handHoldTimer); _handHoldXY = null;
  if (_handTip) { _handTip = null; render(); }       // full card inspector exists only during the hold
};
cv.addEventListener("touchend", endCanvasHold, { passive: true });
cv.addEventListener("touchcancel", endCanvasHold, { passive: true });
// --- foe hover card: full body + loadout inspect for room-preview foe chips -------------
// One floating div, event-delegated (the chips are rebuilt every snapshot, so per-chip
// listeners would be lost); content is read from the LATEST snapshot at hover time.
const foeTip = document.createElement("div");
foeTip.id = "kmTip"; foeTip.className = "hidden"; foeTip.setAttribute("role", "tooltip");
foeTip.setAttribute("aria-live", "polite");
document.body.appendChild(foeTip);
const escTip = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const escAttr = (s) => escTip(s).replace(/"/g, "&quot;");   // safe inside a double-quoted attribute
const levelAllocLabel = (a) => a ? [
  a.hp ? `❤+${a.hp * 4}` : "", a.melee ? `🗡+${a.melee}` : "", a.ranged ? `🎯+${a.ranged}` : "",
  a.mastery ? "Mastery" : "", a.specialty ? `Specialty ×${a.specialty}` : "",
].filter(Boolean).join(" · ") : "";
function foeTipHtml(f) {
  const gear = (f.gear ?? []).map((g) => (typeof g === "string" ? { name: g, text: "" } : g));
  const allocation = levelAllocLabel(f.levelAllocation);
  return `<b class="tip-name">${escTip(f.name)}</b>
    <div class="tip-stat">❤${f.maxHp ?? "?"}${(f.counters ?? 0) > 0 ? ` · ✦+${f.counters} dmg` : ""}${f.bodyAnte ? ` · ⚖${f.bodyAnte} body` : ""}</div>
    ${allocation ? `<div class="tip-pass">Lv${f.level ?? 1} · ${escTip(allocation)}</div>` : ""}
    ${f.passive ? `<div class="tip-pass">✦ ${escTip(f.passive)}</div>` : ""}
    ${gear.map((g) => `<div class="tip-item"><b>${g.cost != null ? `⚡${g.cost} ` : "◆ "}${escTip(g.name)}</b>${g.text ? `<div>${escTip(g.text)}</div>` : ""}</div>`).join("")
      || `<div class="tip-item">— no items (body only) —</div>`}`;
}
// Resolve the foe object behind a ROOM-PREVIEW tip chip (data-roomtip-node, read fresh from the
// snapshot so the tip never goes stale). The stock-phase data-tipfoe chips died with the stock step.
const tipFoeFor = (chip) =>
  chip.dataset.roomtipNode != null ? roomTipFoe(chip) : null;
function showFoeTip(chip, f) {
  if (!f) { foeTip.classList.add("hidden"); return; }
  foeTip.innerHTML = foeTipHtml(f);
  foeTip.classList.remove("hidden");
  const r = chip.getBoundingClientRect();
  foeTip.style.left = Math.max(6, Math.min(window.innerWidth - 250, r.left)) + "px";
  foeTip.style.top = Math.min(window.innerHeight - foeTip.offsetHeight - 6, r.bottom + 6) + "px";
}
// A CARD chip that carries its own tip payload in data attrs (data-ct-name/-cost/-text) — the
// draft kit's ×2-grouped cards use this so a TAP reads the card on a phone (owner 2026-07-01:
// "there currently isn't a way for players to see the cards' actual effects in mobile").
function showDataTip(el) {
  const cost = el.dataset.ctCost;
  const key = el.dataset.ctKey;
  const icon = key ? cardIconImg(key) : "";
  const scale = el.dataset.ctScale;
  const sum = el.dataset.ctSum;
  foeTip.innerHTML = `<b class="tip-name">${icon}${escTip(el.dataset.ctName || "Card")}${cost ? ` <span class="tip-cost">⚡${escTip(cost)}</span>` : ""}</b>
    ${(scale || sum) ? `<div class="tip-cardmeta">${scale ? escTip(scale) : ""}${scale && sum ? " · " : ""}${sum ? escTip(sum) : ""}</div>` : ""}
    <div class="tip-pass">${escTip(el.dataset.ctText || "—")}</div>`;
  foeTip.classList.remove("hidden");
  const r = el.getBoundingClientRect();
  foeTip.style.left = Math.max(6, Math.min(window.innerWidth - 250, r.left)) + "px";
  const above = r.top - foeTip.offsetHeight - 6;
  foeTip.style.top = (above < 6 ? r.bottom + 6 : above) + "px";
}
// DESKTOP hover: room-preview chips raise the floating foe inspector;
// data-ct card chips (draft kit) raise their own-card tip the same way.
document.addEventListener("mouseover", (e) => {
  const kc = e.target.closest?.("[data-ct-name]");
  if (kc) { showDataTip(kc); return; }
  const chip = e.target.closest?.("[data-roomtip-node]");
  if (IS_TOUCH && chip?.matches?.("[data-roomtip-node]")) return; // touch uses hold-to-read; no synthetic-hover trap
  if (!chip) { foeTip.classList.add("hidden"); return; }
  showFoeTip(chip, tipFoeFor(chip));
});
// DESKTOP click: a room-preview foe chip opens its detail instead of entering. TOUCH follows the
// combat/deck grammar: quick tap chooses the room; hold ~360ms reads the foe and eats the release.
// Draft-kit chips keep tap-to-read because the surrounding bundle remains a large separate target.
let _roomHoldTimer = null, _roomHeld = false, _roomHoldXY = null;
document.addEventListener("click", (e) => {
  const chip = e.target.closest?.("[data-roomtip-node]");
  if (chip) {
    if (!IS_TOUCH) {
      e.stopPropagation();        // desktop click remains inspect-only
      const f = roomTipFoe(chip);
      if (f) showFoeTip(chip, f); else foeTip.classList.add("hidden");
      return;
    }
    if (_roomHeld) {              // the hold already opened detail; never also enter the room
      e.stopPropagation(); e.preventDefault(); _roomHeld = false; return;
    }
    foeTip.classList.add("hidden"); // quick touch continues to the room-card action
  }
  const kc = e.target.closest?.("[data-ct-name]");
  if (kc) {
    e.stopPropagation();          // capture phase → the bundle button never sees this tap
    showDataTip(kc);
    return;
  }
  foeTip.classList.add("hidden");  // tap elsewhere → put the inspector away
}, true);
document.addEventListener("touchstart", (e) => {
  const chip = e.target.closest?.("[data-roomtip-node]");
  if (!IS_TOUCH || !chip) return;
  _roomHeld = false;
  const t = e.touches[0]; _roomHoldXY = t ? { x: t.clientX, y: t.clientY } : null;
  clearTimeout(_roomHoldTimer);
  _roomHoldTimer = setTimeout(() => {
    _roomHeld = true;
    const f = roomTipFoe(chip);
    if (f) showFoeTip(chip, f);
  }, 360);
}, { passive: true });
document.addEventListener("touchmove", (e) => {
  if (!_roomHoldXY) return;
  const t = e.touches[0];
  if (t && Math.hypot(t.clientX - _roomHoldXY.x, t.clientY - _roomHoldXY.y) > 10) clearTimeout(_roomHoldTimer);
}, { passive: true });
document.addEventListener("touchend", () => { clearTimeout(_roomHoldTimer); _roomHoldXY = null; }, { passive: true });

// PRESS-AND-HOLD a deck/backpack/draft card → its description in a floating tip (owner 2026-06-29: on a
// phone the inline `.dt` text is hidden and the `title=` tooltip needs a mouse, so you couldn't tell what
// an item DOES). Hold ~360ms to read; a quick tap still moves the card. Reuses the foe-tip element/styles.
let _cardHoldTimer = null, _cardHeld = false, _cardHoldXY = null;
function showCardTip(el) {
  const name = el.querySelector(".dn")?.textContent?.trim() || "Card";
  const txt = el.getAttribute("title") || el.querySelector(".dt")?.textContent || "";
  if (!txt) return;
  const ico = el.querySelector(".km-ico")?.outerHTML || "";   // reuse the tile's card icon in the read popover
  foeTip.innerHTML = `<b class="tip-name">${ico}${escTip(name)}</b><div class="tip-pass">${escTip(txt)}</div>`;
  foeTip.classList.remove("hidden");
  const r = el.getBoundingClientRect();
  foeTip.style.left = Math.max(6, Math.min(window.innerWidth - 250, r.left)) + "px";
  const above = r.top - foeTip.offsetHeight - 6;
  foeTip.style.top = (above < 6 ? r.bottom + 6 : above) + "px";
}
document.addEventListener("touchstart", (e) => {
  const el = e.target.closest?.(".km-card[title]");
  if (!el) return;
  _cardHeld = false;
  const t = e.touches[0]; _cardHoldXY = t ? { x: t.clientX, y: t.clientY } : null;
  clearTimeout(_cardHoldTimer);
  _cardHoldTimer = setTimeout(() => { _cardHeld = true; showCardTip(el); }, 360);
}, { passive: true });
document.addEventListener("touchmove", (e) => {
  if (!_cardHoldXY) return;
  const t = e.touches[0];
  if (t && Math.hypot(t.clientX - _cardHoldXY.x, t.clientY - _cardHoldXY.y) > 10) clearTimeout(_cardHoldTimer);
}, { passive: true });
document.addEventListener("touchend", () => { clearTimeout(_cardHoldTimer); }, { passive: true });
// a hold that opened the tip must NOT also move the card — eat the click that follows the release
document.addEventListener("click", (e) => {
  if (_cardHeld && e.target.closest?.(".km-card")) { e.stopPropagation(); e.preventDefault(); _cardHeld = false; }
}, true);

// Board clicks (SQUAD model). DIRECT AIM on BOTH desktop and touch (owner 2026-07-06 touch,
// extended to desktop 2026-07-10): a plain board click/tap aims immediately — a FOE = attack-target it
// ({target}), ANY BODY (a teammate, an owned companion, or yourself) = aim support at it ({allyTarget}),
// an OPEN lane floor = walk there. Switching which body you hand-drive is the 🔁 cycle button, NOT a tap
// (owner 2026-07-27: tap-to-possess made aiming support at a party companion impossible). Desktop still
// reads a foe on HOVER; HOLD a foe on touch = read it. The 🎯 Target toggle (below) is the ARMED
// one-shot pick with the same reach; when armed the next click aims and disarms.
cv.addEventListener("click", (e) => {
  const p = toCanvas(e);
  // A held foe inspector is modal on touch: the first deliberate tap after opening it closes the
  // readout and is consumed, regardless of whether it lands on the board, a chip, or the hand.
  // This avoids both the old "stuck" popup and an accidental card play/target change underneath it.
  // The synthetic click after the opening hold is still eaten by _foeHeld in the board path below.
  if (IS_TOUCH && _inspectFoeId != null && !_foeHeld) {
    _inspectFoeId = null;
    render();
    return;
  }
  // The HAND lives in the hotbar strip: a click/tap on a card plays it (desktop AND touch now —
  // cards ARE the buttons). Same geometry drawHotbar uses; routes to the piloted body.
  if (p.y >= HOTBAR_Y && state) {
    // the METER STRIP (moxie pips + 🂠/🗑 counts) is NOT a card — a tap there must never play one.
    // Tapping its right half (the counts) toggles the DECK PEEK panel (the phone has no side panel).
    if (p.y <= HOTBAR_Y + 22) {
      if (!_pickHand && p.x > W * 0.5) { _deckPeek = !_deckPeek; render(); }
      return;
    }
    // a HOLD that pinned a card's tooltip must not ALSO play it — eat the release click
    if (_handHeld) { _handHeld = false; return; }
    const hand = _pickHand ? pickHandEntries() : (pilot()?.hand ?? []);
    const k = Math.floor(p.x / (W / Math.max(hand.length, 1)));
    if (k >= 0 && k < hand.length) { _handTip = null; playHandSlot(k); }
    return;
  }
  const foeHit = nearestRectHit(foeBoxes, p);
  const heroHit = nearestHeroHit(heroBoxes, p);

  if (targetArmed) {                                 // ONE-SHOT target pick (armed by 🎯)
    // pick whichever is NEARER the tap — an ally tap must not get stolen by an overlapping foe
    // box (bug: ally-targeting "stopped working" because foeHit always won). foe → attack aim,
    // ally / your own body → heal aim.
    const fd = foeHit ? (p.x - (foeHit.x + foeHit.w / 2)) ** 2 + (p.y - (foeHit.y + foeHit.h / 2)) ** 2 : Infinity;
    const hd = heroHit ? (p.x - (heroHit.w != null ? heroHit.x + heroHit.w / 2 : heroHit.x)) ** 2
      + (p.y - (heroHit.h != null ? heroHit.y + heroHit.h / 2 : heroHit.y)) ** 2 : Infinity;
    if (foeHit && fd <= hd) sendTarget(foeHit.id);
    else if (heroHit) sendAllyTarget(heroHit.id);
    if (foeHit || heroHit) { setTargetArmed(false); return; }               // consumed the pick
    return;                                          // a miss disarms nothing — try again
  }

  // TAP A BUFF/DEBUFF CHIP (owner 2026-07-01): no hover on a phone — a tap shows the chip's label
  // for a moment instead (drawEffectTooltip renders _tapChip). Checked BEFORE the foe card so a
  // chip riding a card wins the tap; aiming (above) still beats everything.
  const chipHit = _effectBoxes.find((b) => (p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= b.r * b.r);
  if (chipHit) { _tapChip = { ...chipHit, until: Date.now() + 2500 }; render(); return; }

  // DIRECT-AIM TAP GRAMMAR (owner 2026-07-06 touch; extended to DESKTOP 2026-07-10 per owner bug
  // report — "could not click selves or others" on web: a plain board click now aims directly on the
  // mouse too, instead of only under the one-shot 🎯 arm). A click on a FOE attack-targets it; a click
  // on ANY BODY (a teammate, an owned companion, or yourself) aims support at it; an OPEN lane walks
  // there. Hand-driving a different body is the 🔁 button, not a tap (owner 2026-07-27). Desktop keeps
  // hover-to-inspect (this fires on click, not hover); the 🎯 arm still exists as an alt aim path.
  if (state?.phase === "playing" || state?.phase === "setup") {
    if (_foeHeld) { _foeHeld = false; return; }      // a hold pinned an inspect — don't also aim (touch)
    // overlap pick: the NEARER of foe box / hero circle wins, same fix as the armed path above
    const fd = foeHit ? (p.x - (foeHit.x + foeHit.w / 2)) ** 2 + (p.y - (foeHit.y + foeHit.h / 2)) ** 2 : Infinity;
    const hd = heroHit ? (p.x - (heroHit.w != null ? heroHit.x + heroHit.w / 2 : heroHit.x)) ** 2
      + (p.y - (heroHit.h != null ? heroHit.y + heroHit.h / 2 : heroHit.y)) ** 2 : Infinity;
    if (foeHit && fd <= hd) { _inspectFoeId = null; sendTarget(foeHit.id); return; }
    if (heroHit) {
      // TAP = AIM (owner 2026-07-27: "in party mode I can't have my bodies select other bodies for
      // support cards"). A tap on ANY body aims your current card's SUPPORT at it — your own companion
      // or yourself included — the same as a foe tap aims an ATTACK. Switching which body you hand-drive
      // is the 🔁 cycle button's job (touchHud data-tk="cycle"); a tap no longer POSSESSES, because in
      // party mode possess-on-tap stole every attempt to aim a heal/buff at a companion (the tap
      // switched control out from under the caster instead of setting its ally target).
      if (heroHit.ally) { sendAllyTarget(heroHit.id); return; } // a friendly SUMMON → heal-aim it (owner 2026-07-10; never possessable)
      const pl = state?.players?.find((q) => q.id === heroHit.id);
      if (!pl) return;
      sendAllyTarget(heroHit.id);         // self, an owned companion, or a co-op teammate → aim support here
      return;
    }
    if (_inspectFoeId != null) { _inspectFoeId = null; render(); }
    // open lane floor → WALK there (server clamps; {lane:N} jumps straight to the column).
    // laneAt maps through the BORROWED-WIDTH geometry, so a slim empty lane still takes the tap.
    const lane = Math.max(0, Math.min(COLS - 1, laneAt(p.x)));
    if (lane !== pendRead("lane", pilot()?.lane ?? lane)) sendLane(lane);   // compare against the ECHOED lane so a double-tap doesn't resend
    return;
  }

  // A plain DESKTOP click on a foe (not aiming) toggles its inspect overlay (hover reads too).
  // Any other click dismisses a stuck inspect.
  if (foeHit) { _inspectFoeId = (_inspectFoeId === foeHit.id) ? null : foeHit.id; render(); return; }
  if (_inspectFoeId != null) { _inspectFoeId = null; render(); }

  // DEFAULT: possess one of YOUR squad bodies. Clicking a foe / a body you don't own does nothing.
  if (heroHit) {
    const pl = state?.players?.find((q) => q.id === heroHit.id);
    if (isMine(pl) && heroHit.id !== activeId) {
      activeId = heroHit.id;
      setTargetArmed(false);                         // switching bodies cancels a stale arm
      send({ type: "possess", id: heroHit.id });     // server routes all later input here
      render();                                       // repaint HUD/ring immediately
    }
  }
});

// RIGHT-CLICK PINS A FOE'S INSPECT CARD (owner 2026-07-10). The b602fc0 fix made a plain LEFT-click AIM at
// the foe (dropping the old left-click-to-pin), so inspect-pinning moved here to the context menu. Right-
// click a foe → toggle its inspect overlay stuck open (drawFoeInspect reads _inspectFoeId); right-click
// empty board → clear a pin. Hover-inspect (mouse.x/y, drawFoeInspect's first branch) is UNCHANGED and
// still wins while the cursor is over another foe. preventDefault kills the browser menu over the board.
// A right-click never fires the LEFT-click aim handler above (click = button 0 only), so aiming/heal-aim
// and Tab-cycle-target are untouched. Desktop-only by nature (touch uses the 360ms hold at line ~1076).
cv.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const p = toCanvas(e);
  const foeHit = nearestRectHit(foeBoxes, p);
  if (foeHit) { _inspectFoeId = (_inspectFoeId === foeHit.id) ? null : foeHit.id; render(); return; }
  if (_inspectFoeId != null) { _inspectFoeId = null; render(); }
});

// (colCenter now lives with the BORROWED-WIDTH lane geometry near the top — per-lane widths.)

// Foe icons by body key. Emoji placeholders — replace a value with real art later
// (e.g. swap to drawing an Image keyed on bodyKey) and nothing else has to change.
const FOE_ICON = {
  rookie: "🎭", warrior: "🛡️", rogue: "🗡️", mage: "🔮", cleric: "✨",
  pixie: "🧚", auditAngel: "👼", killionaire: "🤑",
  rat: "🐀", royalRat: "👑", fatCat: "🐈",
  babyfangs: "🦷", vampire: "🧛", greatsword: "🤺",
  internImp: "😈", medusa: "🐍", magnate: "💰", sphinx: "🦁", affluenceAnubis: "🐕",
  gdpGiant: "🦶", hedgefundKnight: "🛡️", psychicVeteran: "🧠", onePercenterCyclops: "👁️",
  bankruptBarghest: "🐺", recessionRevenant: "💀", shortscerer: "🧙", callingCaltist: "☎️", salesSage: "📈",
  youngdead: "🧟", phoenix: "🦅",
  basilisk: "🦎", lizardWizard: "🧙", runeblade: "⚔️",
  accountant: "🧮", minotaur: "🐂", pyramid: "🔺",
  starfish: "⭐", efreeti: "🧞", neptune: "🔱",
  wageslave: "😩", behemoth: "🦏", atlas: "🗿",
  fatterCatter: "😼", fattestCattest: "🐅",
  mummy: "🪦", cerberus: "🐕", lilLich: "💀",
  royalerRat: "👑", royalestRat: "👑",
  dayTrader: "📉", harpy: "🦤", balrog: "👹",
  banshee: "👻", griffin: "🦁",
  // the V2 first set (rarity variants fall back to the family icon via iconFor)
  paidPiper: "🎺", centaur: "🐴", mouse: "🐭", juggernaut: "🤖",
  largeRat: "🐹", totem: "🪵", flag: "🚩", knight: "🏇",
  // BOSS_SPEC_V1: the four floor bosses + their summons
  hydra: "🐉", litigationLich: "⚖️", djinn: "🧞", kraken: "🦑", kingMimic: "👑",
  hydraHead: "🐍", boneWizard: "💀", tentacle: "🐙", itemEntity: "🪄", frostOrb: "🔮",
};
// ART ALIAS (owner 2026-06-24): the money-monster bodies (MOXIE_SET) were renamed off their old
// provisional keys, so their art lives under a DIFFERENT file than the bodyKey. Map each body to its
// matching existing silhouette so the icon finally fits the name. ⚠ 2 are BEST-FIT placeholders until
// the owner draws true art: Toll Troll→balrog, Crypto-Chimera→cerberus. (Golden Golem got its own
// token 2026-07-01 — /foes/juggernaut.svg from the generator MAP — so it no longer shares atlas.svg.)
const ART_ALIAS = {
  frugal: "fatCat", leverage: "royalRat", hedge: "paidPiper", compound: "centaur",
  discountDuel: "mouse", pyramidRogue: "runeblade", bloodfund: "minotaur", heavyHand: "internImp",
  rentier: "vampire", ratBaron: "lizardWizard", counterparty: "behemoth", mutualMend: "wageslave",
  ratTrader: "balrog", quakeCap: "cerberus",
  // Hedgefund Knight is a SUMMON body with no art of its own → it 404'd on /foes/hedgeKnight.svg
  // and fell through to a ❔ token every time it was summoned. Best-fit to the knight silhouette
  // (also gives it the 🏇 emoji fallback). ⚠ PLACEHOLDER — owner may want unique art (card icon is 🤴).
  hedgeKnight: "knight",
  // BATCH-C bodies + tokens (owner 2026-07-06): no art yet — ⚠ ALL PLACEHOLDER best-fit aliases to
  // existing silhouettes so nothing 404s to a ❔; the owner's art pass replaces these.
  // (sphinx GRADUATED 2026-07-10: its own /foes/sphinx.svg from the MAP — delapouite/greek-sphinx — no longer aliased.)
  bribedBishop: "auditAngel", chequeCherub: "auditAngel", pyramidHead: "runeblade",
  pennyPixie: "pixie", econElemental: "totem", wanderCastle: "juggernaut",
  earthElemental: "totem", lavaElemental: "phoenix",
  // GRAND SPIRIT summon bodies (owner 2026-07-07, pick-a-form card): no art yet — ⚠ ALL PLACEHOLDER
  // best-fit aliases to existing silhouettes so the summoned form never 404s to a ❔; owner art pass
  // replaces these. Keys land with the parallel cards branch (attacker/caster/tank forms).
  grandAttacker: "minotaur", grandCaster: "lizardWizard", grandTank: "atlas",
  // New authored boss summons reuse existing rendered tokens until Dakota's art pass.
  kitchenSlow5: "itemEntity", kitchenMedium: "itemEntity", kitchenSlow3: "itemEntity", frostOrb: "itemEntity",
  iceling: "frostOrb", fireling: "fireling", earthling: "earthling", lightling: "lightling",
  ratKing: "royalRat", jarSlime: "itemEntity", splitter: "djinn", bloodMoonOni: "balrog",
};
// Resolve a bodyKey to its ART file stem (alias first, then the inert legacy U/R strip).
// Alias resolution FOLLOWS CHAINS (2026-07-19): iceling→frostOrb→itemEntity used to stop after one
// hop and fetch /foes/frostOrb.svg — a file that never existed — 404ing every co-op run that summoned
// an iceling. Bounded walk; a self-alias (fireling→fireling = "has its own art") terminates at once.
const artStem = (k) => {
  let s = k;
  for (let hops = 0; hops < 8; hops++) { const next = ART_ALIAS[s]; if (!next || next === s) break; s = next; }
  return s === k ? (k || "").replace(/[UR]$/, "") : s;
};
// Bodies are flat now (bare family keys); the trailing-U/R strip is a harmless legacy guard.
const iconFor = (k) => FOE_ICON[artStem(k)] || FOE_ICON[k] || "❔";
// HTML icon: the vector token (public/foes/<key>.svg) as an <img>, so menus use the SAME art as
// the board. If the sprite is missing the onerror swaps the <img> for its alt emoji — so this can
// never render worse than the old emoji. (Canvas draws via foeSprite(); only HTML uses this.)
const iconImg = (k) => `<img class="km-ico" src="/foes/${artStem(k)}.svg" alt="${iconFor(k)}" onerror="this.outerHTML=this.alt">`;
// map.js loads after this file and uses the exact same alias-aware rendered body art.
window.KM.bodyIconHtml = iconImg;

// Drawn foe art, lazily loaded from /foes/<bodyKey>.svg (generated by tools/generate-foe-art.js).
// Falls back to the emoji above until the image is ready.
const _foeSprites = {};
function foeSprite(key) {
  // bodies are flat now — bare family keys map straight to their art (legacy U/R strip kept inert)
  if (!(key in _foeSprites)) {
    const img = new Image();
    // REPAINT-ON-LOAD (owner boss-icon bug 2026-07-09): render() has NO requestAnimationFrame loop —
    // it only runs on ws 'state' messages + input events (see render() header). A sprite that finishes
    // loading AFTER its first draw would otherwise stay the fallback emoji/❔ until the NEXT state
    // message happened to repaint. That bit the BOSS BANNER hardest: the boss sprite is brand-new
    // (each boss is seen once per run), so its very first paint always hit the not-yet-`complete`
    // image and the icon showed blank/fallback until some later tick. Ask for a repaint the instant the
    // art is ready, so the real icon lands on first appearance. Fires once per sprite; render()'s own
    // `if (!state) return` + try/catch make the callback safe, and image load events are always async
    // tasks (never synchronous with the src assignment) so this can't re-enter the in-flight render.
    img.onload = () => render();
    img.src = `/foes/${artStem(key)}.svg`;
    _foeSprites[key] = img;
  }
  return _foeSprites[key];
}

// WAREWOLF form-dependent art (owner 2026-07-11): the Warewolf body swaps its ICON with its LIVE form.
// Live-combat combatant snapshots carry `.form` ("human"|"wolf"); resolve the art stem from it —
// wolf → /foes/warewolf.svg, human/unset → /foes/warewolfHuman.svg. A pure PASS-THROUGH (returns the
// plain .bodyKey) for every other body, so wrapping a render call in formArt() is a no-op elsewhere.
// (Pre-combat menus — draft wheel, roster, votes — pass the bare bodyKey → they show the WOLF identity
//  icon. FLAG: to make menus show the HUMAN start-form instead, wrap those iconImg() calls in formArt too.)
const formArt = (e) => (e && e.bodyKey === "warewolf") ? (e.form === "wolf" ? "warewolf" : "warewolfHuman") : (e && e.bodyKey);

// CARD ART (2026-07-10) — the card-token twin of foeSprite/iconImg. Every card has a tinted vector
// token at /cards/<key>.svg (tools/generate-card-art.js). A card with no art file degrades to a
// generic 🃏 (never blank/❔): the canvas draw guards on the sprite being `complete`, and the HTML
// <img> swaps to its emoji alt onerror. Keys are raw and injective: no cross-card art aliases.
const CARD_FALLBACK = "🃏";
const cardArtStem = (key) => key;
const _cardSprites = {};
function cardSprite(key) {
  if (!key) return null;
  if (!(key in _cardSprites)) {
    const img = new Image();
    img.onload = () => render();      // repaint when art lands mid-frame (same reason as foeSprite)
    img.src = `/cards/${cardArtStem(key)}.svg`;
    _cardSprites[key] = img;
  }
  return _cardSprites[key];
}
// HTML card icon: /cards/<key>.svg as an <img class="km-ico"> (reuses the foe icon sizing/CSS), with a
// 🃏 emoji fallback swapped in onerror so a missing sprite never blanks a card row.
const cardIconImg = (key) => key
  ? `<img class="km-ico" src="/cards/${cardArtStem(key)}.svg" alt="${CARD_FALLBACK}" onerror="this.outerHTML=this.alt">`
  : "";

// The summon-placement toggle: two big buttons, shown while your kit holds a live summon item.
// Visible in SETUP too (owner 2026-06-19) so you can pre-set FRONT/BEHIND before the fight, same
// as the fire-mode toggle. The active side is server state (player.summonSide).
function updateSummonSide() {
  const el = $("summonSide"); if (!el) return;
  const me = pilot();
  const live = !!me && (state?.phase === "playing" || state?.phase === "setup") && me.alive !== false;
  const canSummon = !!(me?.bodySummons ||
    (me?.inv ?? []).some((iv) => iv.summons && !iv.spent && !iv.stolen));
  const show = live && canSummon;
  el.classList.toggle("hidden", !show);
  if (!show) return;
  const side = me.summonSide ?? "front";
  const toggle = $("ssFront"), oldBack = $("ssBack");
  if (oldBack) oldBack.classList.add("hidden");
  toggle.classList.add("on");
  toggle.textContent = side === "back" ? "🏹 SUMMONS: BACK" : "🛡 SUMMONS: FRONT";
  toggle.onclick = () => send({ type: "summonSide", side: side === "back" ? "front" : "back" });
}

// Player casting is direct card play. There is no player-facing fire-mode control.
function updateFireMode() { const el = $("fireMode"); if (el) el.classList.add("hidden"); }

// SQUAD BAR (combat) — every body you own, always on screen so you never hunt the board to
// switch. Tap a chip to pilot that body (the rest fight on AUTO); ⏭ tabs to the next. Each
// chip shows HP + whether it's the one you're piloting (🎮) or on AUTO (⚡). Sig-guarded so it
// only rebuilds when something changes (no flicker / no mid-tap re-render).
let _squadBarSig = "";
function updateSquadBar() {
  const el = $("squadBar"); if (!el) return;
  const squad = (state?.players || []).filter(isMine)
    .sort((a, b) => (a.id === you ? -1 : b.id === you ? 1 : (a.id < b.id ? -1 : 1)));
  const show = (state?.phase === "playing" || state?.phase === "setup") && squad.length >= 2;
  el.classList.toggle("hidden", !show);
  if (!show) { _squadBarSig = ""; return; }
  const sig = JSON.stringify([squad.map((p) => [p.id, p.hp, p.maxHp, p.shield, p.dr, p.bodyKey, p.alive]), activeId]);
  if (sig === _squadBarSig) return;
  _squadBarSig = sig;
  const chip = (bg, brd, op) => `padding:5px 9px;margin:2px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:bold;border:2px solid ${brd};background:${bg};color:#dfe7f0;opacity:${op}`;
  const chips = squad.map((p) => {
    const active = p.id === activeId, dead = p.alive === false;
    const tag = active ? "🎮" : "";
    const shield = p.shield > 0 ? ` <span style="color:#bfe9ff">🛡${p.shield}</span>` : "";   // shield rides the HP readout
    const armor = (p.dr ?? 0) > 0 ? ` <span style="color:#b6a8ff">⬡${p.dr}</span>` : "";      // FLAG: ⬡N = armor (flat DR), matches the canvas hex badge (owner 7/11)
    return `<button data-pilot="${p.id}" style="${chip(active ? "#2a2616" : dead ? "#2a1a1a" : "#171a21", active ? "#e6c34a" : "#2a2f3a", dead ? 0.5 : 1)}">${iconImg(formArt(p))} ${p.hp}/${p.maxHp}${shield}${armor} ${tag}</button>`;
  }).join("");
  el.innerHTML = chips;
  el.querySelectorAll("[data-pilot]").forEach((b) => b.onclick = () => {
    const id = b.dataset.pilot;
    if (id === activeId) return;
    activeId = id; setTargetArmed(false); send({ type: "possess", id }); render();
  });
}

// The ECHO button (owner redesign 2026-06-12) — only while wearing an echo body. The bar
// fills on its own, your presses push it back; FULL lights the button; tapping it arms
// the double on your next matching-school item. A consume decision, never a timing one.
function updateEchoBtn() {
  const el = $("echoRow"); if (!el) return;
  const me = pilot();
  const show = state?.phase === "playing" && me?.alive !== false && !!me?.echo;
  el.classList.toggle("hidden", !show);
  if (!show) return;
  const b = $("echoBtn");
  const school = me.echo === "physical" ? "⚔ melee" : "✨ ranged";
  b.disabled = !me.echoReady;
  b.classList.toggle("on", !!(me.echoReady || me.echoArmed));
  b.textContent = me.echoArmed ? `🔁 ECHO ARMED — your next ${school} item resolves TWICE`
    : me.echoReady ? `🔁 ECHO READY — tap to arm the double`
    : `🔁 Echo charging… your own presses push it back`;
  b.onclick = () => me.echoReady && send({ type: "echoArm" });
}

// PARTY-SIZE row (legacy lobby phase only): mirror of the entry picker.
function updateSquadRow() {
  const el = $("squadRow"); if (!el) return;
  const show = state?.phase === "lobby";
  el.classList.toggle("hidden", !show);
  if (!show) return;
  // reflect the real count: your squad size = the bodies your seat owns (server-authoritative)
  const mine = (state.players || []).filter(isMine).length || _bodies;
  _bodies = Math.max(1, Math.min(4, mine));
  el.querySelectorAll(".sq-opt").forEach((b) =>
    b.classList.toggle("on", +b.dataset.bodies === _bodies));
}
// wire the in-game squad buttons once (state is read live inside the handler)
document.querySelectorAll("#squadRow .sq-opt").forEach((b) => b.onclick = () => {
  _bodies = Math.max(1, Math.min(4, +b.dataset.bodies));
  send({ type: "setPartySize", n: _bodies });
  paintBodiesPick();
});

// 🎯 TARGET toggle. Board clicks default to POSSESS now; arming this makes the NEXT board
// click a one-shot target pick (foe → {target}, ally/own body → {allyTarget}), then it
// disarms. Shown in combat only.
let targetArmed = false;
function setTargetArmed(on) {
  targetArmed = on;
  const b = $("targetBtn");
  if (b) { b.classList.toggle("on", on); b.textContent = on ? "🎯 Click a target…" : "🎯 Target"; }
}
function updateTargetBtn() { const el = $("targetRow"); if (el) el.classList.add("hidden"); if (targetArmed) setTargetArmed(false); }

// Broken-render backstop state (see render()'s catch). While _renderBroken is set, _renderFrame
// SKIPS its clearRect so the last drawn pixels stay frozen on screen instead of blanking.
let _renderBroken = false;
let _renderErrSig = "";   // stack of the last logged render error — log once per DISTINCT error, not per frame
// Small top-corner tag so a frozen board is diagnosable at a glance. Deliberately trivial
// (rect + text, own try/catch) so the banner itself can never take the backstop down.
function _drawRenderErrorBanner() {
  try {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#3a1113e6";
    ctx.fillRect(W - 190, 4, 186, 16);
    ctx.strokeStyle = "#c05050"; ctx.lineWidth = 1; ctx.strokeRect(W - 189.5, 4.5, 185, 15);
    ctx.fillStyle = "#ffd7d7"; ctx.font = "bold 10px ui-monospace, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("⚠ render error — see console", W - 97, 12.5);
  } catch (e) { /* never let the banner compound a render failure */ }
}
// Teammate intent sits on the body that will perform it. Manual queues/plans are exact; Party AUTO
// uses the server-projected next/banking card. The piloted body's full hotbar already carries this
// information, so only companions and fellow players get the spatial badge.
// Returns whether a badge was actually painted — the cast-name callout shares this band and must
// not print a second copy of the same card name on top of it.
function drawHeroIntentBadge(p, px, py, radius, laneWidth = null) {
  const intent = p?.intentCard;
  if (!intent || !p.alive || p.id === activeId || !["playing", "won", "lost"].includes(state?.phase)) return false;
  // The badge's bottom edge (py − radius − 22) was EXACTLY the top edge of the body's name-label
  // chip (py − radius − 4 − 18) — its 2px border painted straight through "Companion 3" on the
  // owner's 4-lane board. Narrow lanes now clear the label outright and shrink the badge to one
  // line; the friendly planner reserves HERO_INTENT_BAND for it so it no longer paints over foes.
  // FLAG (owner re-tune): the compact height and the 23px label clearance are mine.
  const narrow = laneWidth != null && laneWidth <= LANE_NARROW_W;
  const w = IS_TOUCH ? 78 : 112, h = narrow ? HERO_INTENT_BAND - 4 : (IS_TOUCH ? 30 : 34);
  let x = px - w / 2, y = py - radius - h - 22 - (narrow ? 4 : 0);
  x = Math.max(4, Math.min(W - w - 4, x));
  y = Math.max(28, y);
  const mode = intent.mode === "auto" ? "AUTO NEXT" : intent.mode === "plan" ? "PLAN 1" : "QUEUED";
  const color = intent.mode === "auto" ? "#5cc6ff" : intent.mode === "plan" ? "#c9a7ff" : "#74e69a";
  _fxBlockers.push({ x, y, w, h, id: `intent:${p.id}` });   // no hit-box of its own — see _fxBlockers
  ctx.save();
  ctx.fillStyle = "#090c12ed"; roundRect(x, y, w, h, 7); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2; roundRect(x, y, w, h, 7); ctx.stroke();
  const art = cardSprite(intent.key), icon = h - 6;
  if (art?.complete && art.naturalWidth) ctx.drawImage(art, x + 3, y + 3, icon, icon);
  else { ctx.fillStyle = color; ctx.font = "bold 15px serif"; ctx.textAlign = "center";
    ctx.textBaseline = "middle"; ctx.fillText("✦", x + 3 + icon / 2, y + h / 2); }
  const tx = x + icon + 7, tw = w - icon - 10;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  if (narrow) {
    // ONE line on a narrow lane: the card NAME plus its ⚡cost. The mode keeps its border/ring hue
    // (blue AUTO / violet PLAN / green QUEUED) instead of spending a whole text row on the word.
    ctx.fillStyle = color; ctx.font = "bold 9px ui-monospace, monospace";
    const cTxt = `⚡${intent.cost ?? 0}`, cW = ctx.measureText(cTxt).width;
    ctx.textAlign = "right"; ctx.fillText(cTxt, x + w - 4, y + h / 2);
    ctx.fillStyle = "#f3f6fb";
    fitText(intent.name ?? intent.key ?? "Card", tx, y + h / 2, Math.max(20, tw - cW - 4), 10, 7, "left", "middle");
    ctx.restore();
    return true;
  }
  ctx.fillStyle = color; ctx.font = `bold ${IS_TOUCH ? 8 : 9}px ui-monospace, monospace`;
  fitText(`${mode} · ⚡${intent.cost ?? 0}`, tx, y + (IS_TOUCH ? 8 : 9), tw,
    IS_TOUCH ? 8 : 9, 7, "left", "middle");
  ctx.fillStyle = "#f3f6fb"; ctx.font = `bold ${IS_TOUCH ? 9 : 11}px ui-monospace, monospace`;
  fitText(intent.name ?? intent.key ?? "Card", tx, y + h - (IS_TOUCH ? 7 : 9), tw,
    IS_TOUCH ? 9 : 11, 8, "left", "middle");
  ctx.restore();
  return true;
}

function render() {
  if (!state) return;
  const renderAt = performance.now();
  syncPassiveChoice();
  document.body.classList.toggle("owner-lab", !!state.ownerLab);
  if (myRoom) $("inviteRoomCode").textContent = state.ownerLab ? `OWNER LAB · ${myRoom}` : `ROOM ${myRoom}`;
  // RESILIENCE (owner live bug 2026-07-09; hardened 2026-07-19 after the July-17 "crowdH" blank
  // board): render() is driven synchronously by ws 'state' messages (connect().onmessage) and
  // input/resize events — there is NO requestAnimationFrame loop and NO outer catch. _renderFrame
  // clears the canvas up front, so a DETERMINISTIC throw mid-draw used to blank the board on every
  // snapshot while the sim ran on underneath, and you lost without seeing it. Backstop contract:
  //   • the throw is LOGGED once per distinct error (KM.renderErrorCount still bumps every frame so
  //     harnesses see it) — never silently swallowed, never a per-frame console flood;
  //   • _renderBroken makes subsequent frames SKIP their clearRect, freezing the last drawn pixels
  //     instead of blanking, with a small top-corner banner marking the board as stale;
  //   • every frame still ATTEMPTS the full draw — the first success clears the flag and repaints
  //     one clean frame immediately, so a recovered renderer resumes normal clearing.
  // Root-cause guards still fix known offenders; this is the backstop for the unknown next one.
  try {
    _renderFrame();
    if (_renderBroken) {              // recovered — re-enable clearing and repaint clean right away
      _renderBroken = false; _renderErrSig = "";
      _renderFrame();
    }
  } catch (e) {
    const detail = `phase=${state?.phase} tick=${state?.tick} ${e?.stack || e}`;
    if (window.KM) {
      window.KM.renderErrorCount = (window.KM.renderErrorCount || 0) + 1;
      window.KM.lastRenderError = detail;
    }
    const sig = String(e?.stack || e);
    if (sig !== _renderErrSig) {
      _renderErrSig = sig;
      console.error("render(): frame draw threw — freezing the last drawn pixels until a frame succeeds.",
        detail);
    }
    _renderBroken = true;
    // A throw between ctx.save()/restore() would leave a stale clip/alpha on the context and quietly
    // corrupt every later frame (clearRect honors clips!). Unwind the save stack (restore() on an
    // empty stack is a spec'd no-op), then re-normalize the basics the draw code assumes.
    try {
      for (let i = 0; i < 64; i++) ctx.restore();
      applyTransform();
      ctx.globalAlpha = 1; ctx.setLineDash([]);
    } catch (e2) { /* context is unusable — the frozen pixels are still better than blank */ }
    _drawRenderErrorBanner();
  } finally {
    _perfSample("render", performance.now() - renderAt);
  }
}

// Duplicity is an information game: the authoritative snapshot keeps each target id distinct, but
// every Djinn body must present the same public vitals, effects, and intent. This creates disposable
// view models only; target ids, lane positions, and server state remain untouched.
function maskDjinnLanePresentation(rawLanes, bossPanel) {
  if (bossPanel?.bodyKey !== "djinn") return rawLanes;
  const threats = bossPanel.threats || [];
  const soonest = threats.filter((t) => t.harm).sort((a, b) => foeThreatSeconds(a) - foeThreatSeconds(b))[0] || null;
  const targetIds = [...new Set(threats.flatMap((t) => t.targetIds || []))];
  return (rawLanes || []).map((lane) => ({ ...lane,
    enemies: (lane.enemies || []).map((foe) => foe?.bodyKey === "djinn" ? {
      ...foe,
      name: bossPanel.name,
      hp: bossPanel.hp,
      maxHp: bossPanel.maxHp,
      shield: bossPanel.shield ?? 0,
      passive: bossPanel.passive,
      boss: true,
      counters: bossPanel.counters ?? 0,
      meleeBonus: bossPanel.meleeBonus ?? 0,
      rangedBonus: bossPanel.rangedBonus ?? 0,
      castBars: bossPanel.castBars || [],
      threats,
      threat: soonest,
      tgtPids: targetIds,
      effects: bossPanel.effects || [],
      trackers: bossPanel.trackers || [],
    } : foe),
  }));
}
// Lane-bound bosses stay in the same visible foe-row grammar as their blockers. The engine keeps
// the authoritative body last in its lane array, so drawing that row in order communicates "back"
// without literally covering or replacing the boss. Djinn copies use the same path and remain fair.
function _renderFrame() {
  const { bodies, phase } = state;   // caravan deleted (owner 2026-06-27)
  const bossPanel = state.bossUi || state.boss;
  const lanes = maskDjinnLanePresentation(state.lanes, bossPanel);
  _twNeed = false;                          // RENDER INTERPOLATION: set by twPos while anything still glides
  // OPTIMISTIC LANE ECHO: paint the piloted body in its PENDING lane (walk starts under the
  // finger); the server's snapshot reconciles/expires it in pendRead. Non-destructive overlay —
  // `state` itself is never touched, so the authority stays intact.
  let players = state.players;
  {
    const meRaw = (players || []).find((q) => q.id === activeId);
    if (meRaw) {
      const laneShown = pendRead("lane", meRaw.lane);
      if (laneShown !== meRaw.lane) players = players.map((q) => (q.id === meRaw.id ? { ...q, lane: laneShown } : q));
    }
  }
  // card-play echo hygiene: a pending card that LEFT the hand is confirmed; expiry catches rejects
  if (_pendPlays.size) {
    const inHand = new Set();
    for (const pl of state.players || []) for (const c of pl.hand || []) inHand.add(c.id);
    for (const [id, at] of _pendPlays) if (!inHand.has(id) || Date.now() - at > PEND_MS) _pendPlays.delete(id);
  }
  try { _fctSnap(); } catch (e) {}   // floating +N feedback for buffs/passives — eye-candy, never let it break the board
  // Possession is a COMBAT concept — out of combat the human manages their PRIMARY seat's
  // economy, so snap the pilot back to `you`. This keeps the inventory panel + the loot overlay
  // coherent on one body between rooms.
  // SQUAD: the human pilots EACH body through the whole run, so possession persists through the
  // per-body economy phases too — draft (pick a body+kit per slot), setup, and won (loot/kit/swap
  // per body). Only snap home in the truly un-managed phases (lobby/lost/etc.), where there's no
  // per-body action to take.
  // Whenever activeId changes we also tell the SERVER (it routes input by the last possess),
  // and we guard activeId against a body that left the snapshot (died/dropped → fall to primary).
  const MANAGED = phase === "playing" || phase === "setup" || phase === "draft" ||
    phase === "won";
  if (!MANAGED && activeId !== you) {
    activeId = you; setTargetArmed(false); send({ type: "possess", id: you });
  } else if (MANAGED && activeId !== you && !(players || []).some((p) => p.id === activeId && isMine(p))) {
    // possessed body vanished from the snapshot — fall back to primary and re-point the server
    activeId = you; send({ type: "possess", id: you });
  }
  // LANE COOLDOWN: fold the server's refusal marker into the local flash (see syncLaneBlocked).
  // Runs after the activeId guard so a possession switch resets the flash with its body.
  syncLaneBlocked((players || []).find((p) => p.id === activeId));
  // touch HUD only exists while the board is the active surface — out of combat it
  // would sit on top of the map/inventory panels and steal their taps. In SETUP the d-pad is
  // live only once the deck-editor overlay is dismissed (board reachable); otherwise it'd float over it.
  if (IS_TOUCH) $("touchHud").classList.toggle("tactive", phase === "playing" || (phase === "setup" && _setupDismissed));
  // the map only outranks overlays on the WON screen (clicking it picks the path);
  // everywhere else overlays cover it — wide cards (draft) slide under it otherwise
  document.body.classList.toggle("map-top", phase === "won" && !state.runWon);
  // Combat is a focused board, not a dashboard: the map and full inventory/deck list are useful
  // between rooms, but duplicate the canvas during a fight and surround it with static text.
  document.body.classList.toggle("combat-focus", phase === "playing");
  updateClockBtn();
  updatePlanBtn();
  updateSquadBar();
  updateSummonSide();
  updateFireMode();
  updateEchoBtn();
  updateSquadRow();
  updateTargetBtn();
  // lanes = player count (1–4): lay out N columns dynamically across the same board width,
  // then weight the widths by occupancy (BORROWED WIDTH — inert until a lane actually crowds).
  COLS = Math.max(1, state.laneCount || lanes.length || 3);
  updateLaneWidths(lanes, players);

  // HUD
  // Caravan deleted (owner 2026-06-27): the old shared-HP readout is gone; this slot now carries
  // only the ⏳ Time Stop badge when one is ticking (the loss is "every body + summon defeated").
  $("caravan").textContent = state.freeze > 0 ? `⏳ TIME STOP ${(state.freeze / 10).toFixed(1)}s` : "";
  // A merged rat/head stack is one engine target but still represents N living adds.
  // Count units here so "BOSS + N adds" stays truthful after Hydra heads merge by lane.
  const laneFoes = lanes.reduce((n, l) => n + l.enemies.reduce(
    (sum, foe) => sum + Math.max(1, foe.stackCount ?? 1), 0), 0);
  const addsLeft = Math.max(0, laneFoes - (bossPanel?.laneBound ? 1 : 0));
  const foesLeft = laneFoes + (state.boss ? 1 : 0);
  $("waveInfo").textContent = {
    lobby: "Press ENTER ROOM when everyone's in",
    draft: "Choose your class…",
    setup: `Floor ${state.floor} — position your party, then Begin Combat`,
    playing: bossPanel
      ? `Floor ${state.floor} · BOSS + ${addsLeft} add${addsLeft === 1 ? "" : "s"}`
      : `Floor ${state.floor} · Foes left: ${foesLeft}`,
    won: "Room cleared! 🎉",
    lost: "",
  }[phase] ?? "";
  const me = pilot();
  // ONE line, always: your passive/tags live on your card + the inventory panel now, so the
  // hud carries only vitals — a wrapped hud was costing the short-viewport laptops a text row.
  $("bodyInfo").textContent = me
    // FLAG "⬡N armor" (owner re-skin, 7/11): DR was "🛡-N", which read as minus-N SHIELD. ⬡ = the
    // text cousin of the drawn hex armor badge; 🛡 now means the absorb pool exclusively.
    ? (phase === "playing" ? "" : `${state.god ? "⚡GOD · " : ""}${bodies[me.bodyKey].name} ${me.hp}/${me.maxHp}${me.shield > 0 ? ` +${me.shield}🛡` : ""}${me.dr > 0 ? ` ⬡${me.dr} armor` : ""}${" · " + bonusLabelAlways(me.meleeBonus, me.rangedBonus)}`)
    : "";
  // the ⓘ read-current-body button rides the HUD: shown only when you're piloting a live body
  { const bcb = $("bodyCardBtn"); if (bcb) bcb.style.display = me ? "" : "none"; }
  // MOBILE clutter cut: the room code matters at JOIN, not mid-fight — hide it during active combat
  // so the slim phone HUD spends its width on vitals (it returns out of combat / on setup).
  if (IS_TOUCH) $("roomCode").style.display = phase === "playing" ? "none" : "";
  const btn = $("startBtn");
  // Mobile combat already carries body vitals on the hero and all mechanics on the board. Keep the
  // page chrome to two unmistakable icons instead of spending a third of the header on button copy.
  $("restartBtn").textContent = IS_TOUCH && phase === "playing" ? "↻" : "↻ Restart";
  $("leaveBtn").textContent = IS_TOUCH && phase === "playing" ? "×" : "Leave";
  const complete = state.map && state.map.levelComplete;
  // hidden during play/draft, and during a mid-level win (you advance via the map)
  const lossLogOpen = phase === "lost" && (state.combatLog?.length ?? 0) > 0 && !_clogDismissed;
  // SETUP's overlay has one fixed, full-width Begin Combat footer. Hiding the duplicate header CTA
  // leaves one obvious transition; if a squad dismisses the overlay to arrange bodies, it returns.
  const setupOverlayOpen = phase === "setup" && !_setupDismissed;
  btn.classList.toggle("hidden", phase === "playing" || phase === "draft" || setupOverlayOpen ||
    (phase === "won" && !complete) || lossLogOpen);
  if (phase === "won" && complete && state.runWon) { btn.textContent = "👑 NEW RUN"; btn.onclick = () => startFreshRun(btn); }
  else if (phase === "won" && complete) { btn.textContent = "DESCEND ▶"; btn.onclick = () => send({ type: "descend" }); }
  else if (phase === "lost") { btn.textContent = "PLAY AGAIN"; btn.onclick = () => send({ type: "start" }); }
  else if (phase === "setup") { btn.textContent = "BEGIN COMBAT ▶"; btn.onclick = () => send({ type: "start" }); }
  else { btn.textContent = "ENTER ROOM"; btn.onclick = () => send({ type: "start" }); }

  renderOverlay();
  updateCombatLog(phase);        // post-fight record panel (only on lost/won, with a log present)

  sizeCanvas();                  // match backing store to the displayed size every frame (cheap: reallocs only on a real change) — robust to layout settling after join
  // BLANK-BOARD GUARD (see render()'s catch): after a mid-draw throw, skip the clear so the last
  // drawn pixels stay frozen on screen; render() re-enables clearing the moment a frame succeeds.
  if (!_renderBroken) ctx.clearRect(0, 0, W, H);

  _fxBlockers = [];
  // lane columns — quiet slate "dungeon floor" (lifted a hair off pure black so the vignette
  // below has something to sink into); gentle odd/even alternation still separates the lanes
  for (let i = 0; i < COLS; i++) {
    ctx.fillStyle = i % 2 ? "#10131a" : "#13161e";
    ctx.fillRect(laneX(i), 0, laneW(i), CARAVAN_Y);
    if (lanes[i].shield > 0) {                   // shield pool absorbing incoming hits
      ctx.fillStyle = "#4cf2";
      ctx.fillRect(laneX(i), PLAYER_Y - 24, laneW(i), CARAVAN_Y - (PLAYER_Y - 24));
      ctx.strokeStyle = "#6df"; ctx.lineWidth = 2;
      ctx.strokeRect(laneX(i) + 1, PLAYER_Y - 24, laneW(i) - 2, CARAVAN_Y - (PLAYER_Y - 24));
      ctx.fillStyle = "#bdf"; ctx.font = "bold 12px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("\u{1F6E1} " + lanes[i].shield, colCenter(i), PLAYER_Y - 14);
      // the lane shield readout is a SHIELD VALUE — sacred, and it has no hit-box either
      _fxBlockers.push({ x: laneX(i), y: PLAYER_Y - 26, w: laneW(i), h: 26, id: `laneShield:${i}` });
    }
  }
  // lane dividers (per-lane x — they follow the borrowed widths)
  ctx.strokeStyle = "#222833"; ctx.lineWidth = 1;
  for (let i = 1; i < COLS; i++) { ctx.beginPath(); ctx.moveTo(laneX(i), 0); ctx.lineTo(laneX(i), CARAVAN_Y); ctx.stroke(); }

  // DUNGEON VIGNETTE (owner 2026-06-24): a torch-lit-room feel — the play area stays its dim
  // slate at the heart and sinks into shadow toward the edges. Pure edge-darkening, no added
  // hue, kept low-alpha so it reads as quiet depth and never as a "loud" effect. Drawn here,
  // BEHIND every foe/hero card (those paint their own opaque fills), so it never dims content —
  // only the empty floor, which actually pulls the eye to the fight.
  const _vg = ctx.createRadialGradient(W / 2, CARAVAN_Y * 0.46, CARAVAN_Y * 0.16, W / 2, CARAVAN_Y * 0.46, W * 0.64);
  _vg.addColorStop(0, "rgba(0,0,0,0)");
  _vg.addColorStop(0.6, "rgba(0,0,0,0)");
  _vg.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = _vg; ctx.fillRect(0, 0, W, CARAVAN_Y);

  // CAST FX, UNDER-PASS (owner ruling 2026-07-25 — "state is sacred; effects are decoration").
  // Travel paths, glows, authored Sword/Lightning/Meteors art and the traveling card token all
  // paint HERE, on the empty floor, before the boss banner and every foe/hero card. They keep their
  // full motion; they simply cannot cover a name, HP, shield or telegraph any more. Guarded so a
  // decoration fault can never blank the units that now paint after it.
  try { drawCastFxUnder(); } catch (e) { ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.shadowBlur = 0; }

  // enemies as readable cards in FORMATION: the toughest (index 0) holds the FRONT, drawn
  // largest nearest the player; deeper ranks taper smaller & dimmer (the wall + its backline).
  // Each card is a telegraph — the charge bar + border heat say WHEN it acts; an `aoe` foe
  // about to fire flashes an ALL-LANES warning (and tints the whole board).
  foeBoxes = [];
  heroBoxes = [];
  _effectBoxes = [];
  _bossBannerBottom = 0;
  _bossBannerGap = 6;
  _foeBands = [];
  // OPTIMISTIC AIM ECHO: pending target/heal-aim paints the SAME rings immediately; the server
  // value takes over on confirm/expiry (pendRead). drawPendingEcho marks the unconfirmed ring.
  const myTarget = pendRead("target", me?.targetId ?? null);
  const myAllyTarget = pendRead("ally", me?.allyTargetId ?? null);
  const throb = 0.5 + 0.5 * Math.sin((state.tick ?? 0) * 0.4); // shared pulse for telegraphs
  // One space-free incoming signal per threatened hero-side entity, regardless of attacker count.
  const incomingTargets = new Set();
  for (const lane of (lanes || [])) for (const f of (lane.enemies || []))
    for (const pid of (f.tgtPids || [])) incomingTargets.add(pid);
  let aoeAlarm = 0;                                            // strongest incoming all-lanes hit
  for (const threat of bossPanel?.threats || []) {
    for (const id of threat.targetIds || []) incomingTargets.add(id);
    if (threat.harm && threat.scope === "all-lanes" && (threat.frac ?? 0) > 0.66)
      aoeAlarm = Math.max(aoeAlarm, threat.frac ?? 0);
  }
  // THE BACK-LINE BOSS (BOSS_SPEC_V1) — the caravan's mirror on the foe side: one wide
  // banner spanning every lane behind the foe rows. Click it to target it (melee only
  // reaches it when YOUR lane is clear — it's the lane's back wall).
  // The Djinn command deck reports shared boss state but is deliberately not a target surface: making
  // it glow or click only for the authoritative id would expose which identical lane row is real.
  if (bossPanel) drawBossBanner(bossPanel, bossPanel.laneBound ? null : myTarget, throb);
  drawTornadoHazards(state.tornadoes || []);
  // FRIENDLY DEPTH LINE geometry per lane: heroes stack front→back (front = nearest the foes
  // = the blocker), the rear anchored just above the caravan; summons hold a row in front;
  // foes stack above the whole friendly stack. Computed up front so foes know where to stop.
  // owner 2026-06-19: heroes grown (16→22) for real presence beside the foe cards; REAR_Y lifts
  // far enough off the caravan that the bigger circle PLUS its nameplate+passive line (~50px below
  // center) clear the caravan bar (drawn after, so it paints over anything beneath it). The foe
  // stack follows via foeBottom, so this just borrows empty space from the top of the board.
  // READABILITY (owner 2026-07-07): heroes grown again (22→24 touch / 26 desktop) with the
  // nameplate + labels scaled to match; REAR_Y drops the extra so the bigger plate still clears
  // the caravan band.
  // Portrait pass (owner 2026-07-19): identity art is compact; HP/action surfaces carry the truth.
  // STATUS RAIL (owner 2026-07-18): reserve the full body → HP plate → effect-chip stack in that
  // order. The old bottom anchor left no room beneath HP, so its clamp painted buffs over the bar.
  // Portrait art is identity, not the information surface. Keep it deliberately smaller than the
  // HP/action rows on touch while preserving the existing 37px minimum hit target below.
  const boardBodyCount = players.length + lanes.reduce((n, lane) =>
    n + (lane.enemies?.length ?? 0) + (lane.allies?.length ?? 0), 0);
  const boardCrowded = IS_TOUCH && boardBodyCount >= 5;
  // FOE-FIRST READABILITY (owner 2026-07-26: "enemy readability is everything … it should look like
  // [the roomy foe card] whenever possible"). At 3–4 lanes on a phone the friendly stack (anchored to
  // the caravan, grown UPWARD) ate the foe band, so a foe SHARING a lane with your bodies fell below
  // FOE_STACK_MIN_H and rendered as a truncated top strip, while a foe ALONE in a lane stayed a full
  // card. Foe-first inverts the priority: in a lane stacking 2+ of your bodies, ALL of them — the
  // piloted body included (owner 2026-07-26) — drop to compact rows (you drive your bodies from the
  // hotbar + Plan, not their board portrait), freeing the shared foe a legible stacked card.
  // Scoped to COLS>=BOSS_RAIL_COLS touch → solo and 2-lane co-op stay byte-identical.
  // FLAG (owner re-tune): the lane-count threshold is mine, not his.
  const foeFirstLanes = IS_TOUCH && COLS >= BOSS_RAIL_COLS;
  const R_HERO = IS_TOUCH ? (boardCrowded ? 20 : 24) : 30;
  const HERO_PLATE_W = IS_TOUCH ? 94 : 100;
  const HERO_PLATE_H = IS_TOUCH ? 21 : 23;
  const HERO_EFFECT_R = 6 + (IS_TOUCH ? 4 : 0);
  const HERO_EFFECT_HIT_R = HERO_EFFECT_R + (IS_TOUCH ? 8 : 2);
  const HERO_BOTTOM_RESERVE = R_HERO + 4 + HERO_PLATE_H + 10 + HERO_EFFECT_HIT_R + 2;
  const REAR_Y = CARAVAN_Y - HERO_BOTTOM_RESERVE;
  // Summons remain direct targets in the blocking line, but paint as compact combat rows rather than
  // player-sized portraits. Kind-aware extents reserve each row and the hero's hanging HP/effect rail.
  // A compact hero's touch hitbox is a fixed radius-16 circle (drawHeroCompact: max(16, r+6)), so its
  // slot must reserve that 16px half-extent — not merely ceil(compactH/2)+2 (≈12), which let two
  // adjacent compact bodies (a foe-first lane with two teammates/companions) overlap their tap targets.
  const HERO_COMPACT_HALF = 16;
  const slotTop = (slot, compactH = HERO_COMPACT_H) => slot.kind === "hero" ? R_HERO + 24
    : slot.kind === "heroC" ? Math.max(HERO_COMPACT_HALF, Math.ceil(compactH / 2) + 2)
    : SUMMON_CHIP_HIT_H / 2 + 2;
  const slotBottom = (slot, compactH = HERO_COMPACT_H) => slot.kind === "hero" ? HERO_BOTTOM_RESERVE
    : slot.kind === "heroC" ? Math.max(HERO_COMPACT_HALF, Math.ceil(compactH / 2) + 2)
    : SUMMON_CHIP_HIT_H / 2 + 2;
  const slotGap = (upper, lower) => slotBottom(upper) + slotTop(lower) + 5;
  // top bound for the foe stacks: just below the boss banner (so a head swarm can't run up over it),
  // else the board top. Computed HERE (before the friendly planner) because a crowd lane's friendly
  // stack must reserve honest foe headroom before it compresses its own side.
  const foeTopBound = bossPanel ? _bossBannerBottom + _bossBannerGap : 8;
  // FOE TRIAGE PLAN (crowd mode, owner picked D 2026-07-07): with more than CROWD_SLOTS queue-foes
  // in a lane, only the headliners keep a full row — the FRONT blocker, the foe CLOSEST TO CASTING
  // (highest castFrac, tie → front-most), and YOUR current target. Everyone else compresses to a
  // one-line mini in its exact depth slot (drawFoeMini — still tappable, still holds-to-inspect).
  // minH = the plan's floor height, so the friendly planner can reserve real space for the foes.
  const planFoeLane = (realFoes, tgt) => {
    const n = realFoes.length;
    if (n <= CROWD_SLOTS) return { crowd: false, keep: null, minH: 0 };
    const keep = new Set([realFoes[0].id]);                    // the FRONT always reads full
    let ci = 0;
    for (let j = 1; j < n; j++) if ((realFoes[j].castFrac ?? 0) > (realFoes[ci].castFrac ?? 0)) ci = j;
    keep.add(realFoes[ci].id);                                 // …and whoever casts soonest
    const t = realFoes.find((e) => e.id === tgt); if (t) keep.add(t.id);   // …and your target
    const fulls = keep.size, minis = n - fulls;
    return { crowd: true, keep, minH: fulls * FOE_FULL_MIN + minis * FOE_MINI_MIN + (n - 1) * 2 };
  };
  const foePlans = [];
  for (let i = 0; i < COLS; i++)
    foePlans[i] = planFoeLane(lanes[i].enemies.filter((e) => !bodies[e.bodyKey]?.summon), myTarget);
  // Reserve the foe side's real mobile footprint before positioning the friendly line. A foe-token
  // row used to claim its height only during drawing, after a back summon had already pulled the
  // hero upward; the remaining real foe could then start above y=0.
  // A BOSS lane at 3+ lanes is the starved case (owner 2026-07-24): the command rail sits on top of
  // the band, so ask for the foe side's real WANT — four full rows plus one-line minis for the rest
  // — not merely its absolute floor. The hero only ever yields up to 14px either way, so all this
  // decides is whether that existing cap is reached in a lane that plainly needs it.
  // …and ONLY for the lone-hero yield (`want`). The multi-slot branch below uses this same figure to
  // SQUEEZE a hero+summon stack together, and that squeeze has no anti-overlap floor — inflating the
  // ask there pulled a friendly summon's 44px touch row into its hero's (caught by scenario-shot's
  // friendly-overlap proof on four-player-lich-stress). Multi-slot lanes keep the original floor.
  const crowdedBossBoard = !!bossPanel && COLS >= BOSS_RAIL_COLS;
  const mobileFoeNeed = (i, want = false) => {
    if (!IS_TOUCH) return 0;
    const enemies = lanes[i].enemies || [];
    const tokenN = enemies.filter((e) => bodies[e.bodyKey]?.summon).length;
    const realN = enemies.length - tokenN;
    const tokenH = tokenN ? SUMMON_CHIP_HIT_H + 4 : 0; // hostile summons use one directly targetable combat row
    const realWant = Math.min(realN, 4) * FOE_FULL_MIN + Math.max(0, realN - 4) * FOE_MINI_H
      + Math.max(0, realN - 1) * 3;
    const realH = foePlans[i].crowd
      ? (want && crowdedBossBoard ? Math.max(foePlans[i].minH, realWant) : foePlans[i].minH)
      : realN * FOE_FULL_MIN + Math.max(0, realN - 1) * 3;
    const addsH = tokenH + realH + (tokenN && realN ? 3 : 0);
    return addsH;
  };
  // slot EXTENTS (crowd planner): how far a slot's print reaches above/below its center y. The full
  // hero's bottom extent equals the REAR_Y offset (circle + plate + effect rail just clears the
  // caravan band); compact teammate rows and coin rows are near-symmetric slivers.
  const slotExt = (s, ch) => ({ top: slotTop(s, ch), bottom: slotBottom(s, ch) });
  const laneStacks = [];
  for (let i = 0; i < COLS; i++) {
    const toks = lanes[i].allies || [];
    const heroesHere = players.filter((p) => p.lane === i);
    const compactFriendlyGrid = IS_TOUCH && heroesHere.length === 1 && toks.length === 3
      && laneW(i) < 520;
    // FOE-FIRST applies only where the pain is: a lane STACKING two or more of your bodies (party mode
    // / co-op cluster), which is what buries the shared foe. A lane with a lone body already leaves the
    // foe its room, so it keeps the exact prior layout — this is also what keeps the many-foe crowd
    // scenarios (one body per lane) byte-identical.
    const laneFoeFirst = foeFirstLanes && heroesHere.length >= 2;
    // In a crowd lane the possessed body stays full-size (crowdH). In a FOE-FIRST lane it does NOT:
    // owner 2026-07-26 ruled every one of your bodies — piloted included — compacts so the lane's foe
    // gets a full card (you drive the piloted body from the hotbar + Plan, not its board portrait).
    // Every summon still remains its own directly targetable body.
    const crowdH = heroesHere.length + toks.length > CROWD_SLOTS;
    const ents = [
      ...heroesHere.map((p) => ({ kind: compactFriendlyGrid || (crowdH && p.id !== activeId) || laneFoeFirst ? "heroC" : "hero", p, depth: p.depth ?? 0, id: p.id })),
      ...(toks.map((a, k) => ({ kind: "summon", a, depth: a.depth ?? -1, id: "sm" + k }))),
    ].sort((x, y) => x.depth - y.depth || (x.id < y.id ? -1 : 1));
    const slots = [];
    for (const e of ents) {
      if (e.kind !== "token") { slots.push(e); continue; }     // hero / summon body = its own slot
      // OVERFLOW swarm only: collapse the coin tokens into one cluster row (mobile — and any crowd
      // lane — merges all of them; the row takes the front-most token's depth slot).
      // Merge only adjacent tokens. Searching the whole lane erased a hero boundary, so a FRONT
      // summon and a BACK summon were painted together in the first token row on mobile.
      const merge = slots[slots.length - 1]?.kind === "tokens" ? slots[slots.length - 1] : null;
      if (merge) merge.toks.push(e.a);
      else slots.push({ kind: "tokens", toks: [e.a] });
    }
    // Wide solo lanes spend their abundant WIDTH on the party. The former 60px vertical diagonal
    // pushed the front body through a boss command panel while leaving most of the phone empty.
    // Seat the hero + up to three summons laterally in one bounded formation band. The depth rail plus
    // FRONT/#rank inside each summon row carries exact blocker order without detached label clutter.
    // Pack the REAL touch widths rather than centers-at-a-magic-step: the previous three-summon
    // fallback vertically squeezed four friendly touch surfaces together in boss + foe stress rooms.
    const lateralGap = 10;
    const heroTouchW = 2 * (IS_TOUCH ? Math.max(37, R_HERO + 1) : R_HERO + 9);
    const lateralInnerW = laneW(i) - 8;
    const lateralSummonW = toks.length
      ? Math.min(SUMMON_CHIP_MAX_W, Math.floor((lateralInnerW - heroTouchW - lateralGap * (slots.length - 1)) / toks.length))
      : 0;
    // Four narrow multiplayer lanes cannot fit one hero plus three full-width summon strips in a
    // vertical rail. Use the same compact combat-row grammar in a true 2×2 formation: every body
    // keeps a separate 44px target, HP, moxie and next action, while no surface overlaps a neighbor.
    if (compactFriendlyGrid && slots.length === 4) {
      const gridGapX = 8, gridGapY = 6;
      const gridW = Math.floor((laneW(i) - 16 - gridGapX) / 2);
      const leftX = laneX(i) + 8 + gridW / 2;
      const rightX = leftX + gridW + gridGapX;
      const backY = CARAVAN_Y - SUMMON_CHIP_HIT_H / 2 - 3;
      const frontY = backY - SUMMON_CHIP_HIT_H - gridGapY;
      const xs = [leftX, rightX, rightX, leftX];
      const ys = [frontY, frontY, backY, backY];
      laneStacks[i] = { slots, xs, ys, frontY, foeBottom: frontY - SUMMON_CHIP_HIT_H / 2 - 8,
        compactH: SUMMON_CHIP_H, lateral: true, grid: true, summonChipW: gridW };
      continue;
    }
    if (heroesHere.length === 1 && toks.length > 0 && toks.length <= 3 && lateralSummonW >= 84) {
      const halfWidths = slots.map((s) => s.kind === "hero" ? heroTouchW / 2 : lateralSummonW / 2);
      const totalW = halfWidths.reduce((sum, half) => sum + half * 2, 0) + lateralGap * (slots.length - 1);
      let cursor = laneX(i) + (laneW(i) - totalW) / 2;
      const xs = halfWidths.map((half, si) => {
        const x = cursor + half;
        cursor += half * 2 + (si < halfWidths.length - 1 ? lateralGap : 0);
        return x;
      });
      const ys = slots.map(() => REAR_Y - 4);
      // A LATERAL formation seats every slot on ONE y, so a body's head band (name chip →
      // teammate-intent badge → cast-name callout) has no slot in front of it to hide behind the
      // way the vertical rail does — it hangs straight into the foe stack. Reserve it here exactly
      // as the vertical planner does below (`heroTop`); without it the narrow tier's own intent
      // badge printed over the foe card it had just made readable.
      const lateralHeadBand = laneW(i) <= LANE_NARROW_W ? HERO_INTENT_BAND : 0;
      const ext = slots.map((s) => {
        const e = slotExt(s, HERO_COMPACT_H);
        return s.kind === "hero" ? { top: e.top + lateralHeadBand, bottom: e.bottom } : e;
      });
      const frontAt = ys.reduce((best, y, si) => y - ext[si].top < best.edge ? { edge: y - ext[si].top, y } : best,
        { edge: Infinity, y: REAR_Y });
      laneStacks[i] = { slots, xs, ys, frontY: frontAt.y, foeBottom: frontAt.edge - 8,
        compactH: HERO_COMPACT_H, lateral: true, summonChipW: lateralSummonW };
      continue;
    }
    if (crowdH && slots.length) {
      // FIT BY CONSTRUCTION (the actual bug being fixed): anchor the REAR slot's PRINT just above
      // the caravan band, stack upward by extents, and if the front would invade the reserved foe
      // headroom, first floor the compact rows, then squeeze the center span itself (overlap beats
      // off-board). The old TOP_MARGIN shift — which pushed the rear straight through the caravan —
      // never runs for a crowd lane, so no body can leave the board in either direction.
      let compactH = HERO_COMPACT_H;
      const plan = (ch) => {
        const ext = slots.map((s) => slotExt(s, ch));
        const ys2 = new Array(slots.length);
        ys2[slots.length - 1] = CARAVAN_Y - ext[slots.length - 1].bottom - 2;
        for (let s = slots.length - 2; s >= 0; s--)
          ys2[s] = ys2[s + 1] - (ext[s].bottom + ext[s + 1].top + 4);
        return { ext, ys2 };
      };
      let { ext, ys2 } = plan(compactH);
      const reserveTop = foeTopBound + (foePlans[i].crowd ? foePlans[i].minH + 10 : 78);
      const rearY = ys2[slots.length - 1];
      if (ys2[0] - ext[0].top < reserveTop) {
        compactH = 12; ({ ext, ys2 } = plan(compactH));
        if (ys2[0] - ext[0].top < reserveTop && slots.length > 1) {
          const span = rearY - ys2[0];
          const availSpan = Math.max(slots.length * 8, rearY - (reserveTop + ext[0].top));
          const k = Math.min(1, availSpan / span);
          for (let s = 0; s < ys2.length; s++) ys2[s] = rearY - (rearY - ys2[s]) * k;
        }
      }
      const frontY = ys2[0];
      laneStacks[i] = { slots, ys: ys2, frontY, foeBottom: frontY - ext[0].top - 8, compactH };
      continue;
    }
    // walk REAR→FRONT, accumulating kind-aware gaps; each slot carries its own center y. The whole
    // line is then nudged DOWN if a tight stack would push the front slot off the top of the board.
    // (≤ CROWD_SLOTS only — this path is byte-identical to the pre-crowd renderer.)
    const ys = new Array(slots.length);
    // Anchor the rear print above the seam. HERO_BOTTOM_RESERVE includes the dedicated effect rail,
    // so even a lone touch hero may not spend that space by dropping toward the hand.
    let y = REAR_Y;
    for (let s = slots.length - 1; s >= 0; s--) {
      ys[s] = y;
      if (s > 0) y -= slotGap(slots[s - 1], slots[s]);
    }
    if (IS_TOUCH && ys.length === 1) {
      // A lone hero was anchored at the desktop rear line even when a lane-bound boss moved an
      // add into that lane. Spend the phone's small safe gap above the hand to keep both hitboxes
      // honest; the add stays at its tactical depth and the hero yields by at most 14px.
      // …but the clearance it measured (R_HERO + 20) was NOT the clearance the foe band actually
      // gets: `foeBottom` below subtracts R_HERO + 26 and, in a narrow lane, HERO_INTENT_BAND on top
      // of that — 32px more. So the yield never fired in exactly the 4-lane boss case that needed
      // it (owner 2026-07-24). Measure the same clearance both places. The 14px cap is unchanged.
      const frontClear = slots[0].kind === "hero"
        ? R_HERO + 26 + (laneW(i) <= LANE_NARROW_W ? HERO_INTENT_BAND : 0)
        : R_HERO + 20;
      const needY = foeTopBound + mobileFoeNeed(i, true) + frontClear;
      ys[0] += Math.min(14, Math.max(0, needY - ys[0]));
    }
    if (IS_TOUCH && ys.length > 1) {
      // Keep the rear anchored above the hand and squeeze only the center span when the mixed foe
      // side needs headroom. The old downward shift traded top clipping for back-summon/hand overlap.
      const frontClear = slots[0].kind === "hero" ? R_HERO + 26 : slots[0].kind === "heroC" ? 20 : 48;
      const rearY = ys[ys.length - 1];
      const minFrontY = foeTopBound + mobileFoeNeed(i) + frontClear;
      if (ys[0] < minFrontY) {
        const span = rearY - ys[0];
        const minSpan = Math.max(12, (ys.length - 1) * 16);
        const fittedSpan = Math.max(minSpan, rearY - minFrontY);
        const k = span > 0 ? Math.min(1, fittedSpan / span) : 1;
        for (let s = 0; s < ys.length; s++) ys[s] = rearY - (rearY - ys[s]) * k;
      }
    } else if (!IS_TOUCH) {
      const TOP_MARGIN = 86;                  // desktop: leave room for at least one foe card above the line
      if (ys.length && ys[0] < TOP_MARGIN) { const shift = TOP_MARGIN - ys[0]; for (let s = 0; s < ys.length; s++) ys[s] += shift; }
    }
    const frontY = ys.length ? ys[0] : REAR_Y;
    // Summon bodies reserve their portrait/name footprint above the foe line.
    // NARROW LANES also reserve the teammate-intent badge band (it sits above the name label now,
    // and an unreserved badge paints straight over the foe card the owner is trying to read).
    // Reserved uniformly per lane — keying it off `intentCard` would make foe rows jump between ticks.
    const heroTop = R_HERO + 26 + (laneW(i) <= LANE_NARROW_W ? HERO_INTENT_BAND : 0);
    const foeBottom = slots.length ? frontY - (slots[0].kind === "hero" ? heroTop : (IS_TOUCH ? 48 : 52)) : REAR_Y - 18;
    laneStacks[i] = { slots, ys, frontY, foeBottom, compactH: HERO_COMPACT_H };
  }
  // ===== FOE SIDE — per-lane triage between the boss marker, summon-token clusters, and the
  // tactical foe rows. (The 2026-06-10 full-card foe renderer and its ribbonFor helper were
  // deleted 2026-07-19 — they were unreachable behind drawFoeTacticalLane.)
  // (foeTopBound moved up beside the triage planner — the friendly stack needs it first.)
  for (let i = 0; i < COLS; i++) {
    let stackBottom = laneStacks[i].foeBottom;  // foes stack above this lane's friendly line
    // SUMMON-TOKEN SWARM (owner 2026-06-25 hydra fix): the Hyper-Inflation Hydra blooms dozens of 1-HP
    // heads (and the Kraken its tentacles). As stacking foe CARDS they overran the boss banner and
    // clipped off the top of the board. Collapse a lane's summon-token foes into a capped, always-fits
    // coin grid (the foe-side mirror of the friendly summon row); the real foes then stack above it.
    const laneEnemies = lanes[i].enemies;
    const laneTopBound = foeTopBound;
    const tokenFoes = laneEnemies.filter((e) => bodies[e.bodyKey]?.summon);
    const realFoes  = laneEnemies.filter((e) => !bodies[e.bodyKey]?.summon);
    const addHeadroom = stackBottom - laneTopBound;
    // `+N ADDS` IS THE LAST RESORT, NOT THE DEFAULT (owner 2026-07-24: "I kept having foes go off
    // screen"). The aggregate hides real bodies, so it may fire only when the band physically cannot
    // seat one distinct FOE_ROW_FLOOR row per body. The old gate ALSO fired on lane WIDTH (`< 260`
    // is every lane at 4 players) and otherwise demanded 28px for EVERY body — 183px in a six-body
    // lane that has ~100 — so a 4-lane boss room always collapsed to four summary rows and 22 of 26
    // foes were invisible. Never aggregate a lane-bound boss either: the tactical solver already
    // compresses row height while preserving one distinct hitbox per body.
    // …and it must account for the GRID the tactical solver can lay out: a solo/2-lane board is
    // 400–920px wide, so its foes ride 2–4 abreast in ONE band. Measuring the need as one row per
    // body made a wide lane collapse while it still had room for a legible four-across row.
    const gridCols = Math.max(1, Math.min(laneEnemies.length,
      Math.floor((laneW(i) - 14 + 3) / ((IS_TOUCH ? 220 : 250) + 3))));
    const gridRows = Math.ceil(laneEnemies.length / gridCols);
    const honestRows = gridRows * FOE_ROW_FLOOR + (gridRows - 1);
    if (IS_TOUCH && bossPanel && laneEnemies.length > 1 && !laneEnemies.some((e) => e.boss)
        && addHeadroom < honestRows) {
      aoeAlarm = Math.max(aoeAlarm,
        drawNarrowBossAddSummary(i, stackBottom, laneTopBound, laneEnemies, myTarget));
      _foeBands[i] = { top: laneTopBound, bottom: stackBottom, bodies: laneEnemies.length, drawn: 1, mode: "adds" };
      continue;
    }
    // FOE SUMMON PARITY (owner 2026-07-11): the SAME few-vs-swarm gate the friendly lane uses
    // (playerSized above). A FEW foe summons (≤ FOE_SUMMON_CAP) each render as a full conjured BODY
    // — the foe variant of drawSummonBody, identical footprint to a player's summon, differing only
    // in side (foe ring + tap-to-target, no friendly blocker arc). Only a true SWARM folds to the
    // capped, always-fits coin cluster (that swarm case IS symmetric with the player coin fallback).
    if (tokenFoes.length) {
      // SHARE THE BAND BY BODY COUNT when it cannot pay both sides in full (owner 2026-07-24). The
      // reservation was an unconditional FOE_FULL_MIN per real foe; under a boss rail that is more
      // than the whole band, so the token cluster always fell through to its smallest presentation
      // AND still took a fixed 30px — one summoned rat cost four real foes their rows. Scoped to
      // BOSS lanes: every other lane keeps the exact reservation it had before.
      const reserveForReal = IS_TOUCH && realFoes.length
        ? (crowdedBossBoard
            ? Math.min(realFoes.length * FOE_FULL_MIN + Math.max(0, realFoes.length - 1) * 3 + 3,
                       Math.round(addHeadroom * realFoes.length / laneEnemies.length))
            : realFoes.length * FOE_FULL_MIN + Math.max(0, realFoes.length - 1) * 3 + 3)
        : 0;
      stackBottom = drawFoeTokenCluster(i, stackBottom, laneTopBound, tokenFoes, myTarget, reserveForReal);
    }
    // TACTICAL OVERVIEW (2026-07-12): every ordinary foe uses the same compact row on desktop and
    // touch. Portrait + HP + next cast + charge stay glanceable; passive prose and the full queue live
    // in hold/hover inspection. Equal rows mean five (or sixteen) foes remain visible at once instead
    // of the first two consuming the board as text cards. (The unreachable legacy full-card branch
    // that used to sit below was deleted 2026-07-19 — real foes always take this path.)
    const drawnBefore = foeBoxes.length;
    if (realFoes.length) {
      aoeAlarm = Math.max(aoeAlarm,
        drawFoeTacticalLane(i, stackBottom, laneTopBound, realFoes, myTarget, throb, bodies));
    }
    const rows = foeBoxes.slice(drawnBefore);
    _foeBands[i] = { top: laneTopBound, bottom: laneStacks[i].foeBottom,
      bodies: laneEnemies.length, tokens: tokenFoes.length,
      drawn: rows.length + tokenFoes.length, mode: "rows",
      rowH: rows.length ? Math.round(Math.min(...rows.map((b) => b.h))) : 0,
      minTop: rows.length ? Math.round(Math.min(...rows.map((b) => b.y))) : laneTopBound };
  }
  // board-wide red flash when an all-lanes hit is winding up — "oh god, here it comes"
  if (aoeAlarm > 0) {
    ctx.globalAlpha = 0.08 + 0.14 * throb * aoeAlarm;
    ctx.fillStyle = "#f00"; ctx.fillRect(0, 0, W, CARAVAN_Y);
    ctx.globalAlpha = 1;
  }

  // THE FRIENDLY LINE — heroes and summon-token rows interleaved by depth within each
  // lane; the FRONT slot (nearest the foes) is the lane's blocker (🛡 + cyan accent).
  // ↑/↓ steps you forward/back past teammates AND your own summons. Gold ring + 👑 = YOU.
  // The pill's own width, so a caller can lay it out as part of a group before painting it.
  const depthBadgeW = (rank, front) => {
    ctx.font = `bold ${front ? 11 : 12}px ui-monospace, monospace`;
    return front ? Math.max(58, ctx.measureText(`${rank} FRONT`).width + 12) : 22;
  };
  // `dock` = an explicit {x, y} top-left (LATERAL lanes hand the pill to the name-chip band, where
  // it has room — beside the portrait it had to stand in the strip the summon row occupies).
  const drawDepthBadge = (px, py, rank, front, halfW, halfH, laneIdx, dock = null) => {
    const label = front ? `${rank} FRONT` : String(rank), h = 18;
    ctx.font = `bold ${front ? 11 : 12}px ui-monospace, monospace`;
    const w = front ? Math.max(58, ctx.measureText(label).width + 12) : 22;
    const laneL = laneX(laneIdx) + 4, laneR = laneX(laneIdx) + laneW(laneIdx) - 4;
    const leftX = px - halfW - w - 3, rightX = px + halfW + 3;
    let x, y = py - h / 2;
    if (dock) { x = dock.x; y = dock.y; }
    else if (leftX >= laneL) x = leftX;
    else if (rightX + w <= laneR) x = rightX;
    else {
      // A borrowed 84px lane cannot seat a 58px FRONT pill beside a full body. Keep it lane-local
      // and move it into the clear band above the name instead of painting the portrait/next lane.
      x = Math.max(laneL, Math.min(laneR - w, px - w / 2));
      y = py - halfH - h - 4;
    }
    ctx.fillStyle = front ? "#123543" : "#18202b"; roundRect(x, y, w, h, 6); ctx.fill();
    ctx.lineWidth = front ? 2 : 1; ctx.strokeStyle = front ? "#5cc6ff" : "#536072";
    roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.stroke();
    ctx.fillStyle = front ? "#d8f8ff" : "#c8d0dc"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  };
  for (let i = 0; i < COLS; i++) {
    const { slots, xs, ys, compactH, lateral, grid, summonChipW } = laneStacks[i];
    // A depth rail makes the unified blocking order explicit even though diagonal bodies borrow
    // horizontal room to preserve their silhouettes. Its arrow points toward the foes; slot 1 is the
    // entity their next ordinary melee hit reaches first.
    if (slots.length > 1 && !grid) {
      const px = (si) => xs?.[si] ?? colCenter(i);
      ctx.save();
      ctx.strokeStyle = "#5cc6ff88"; ctx.fillStyle = "#bff6ff"; ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(px(0), ys[0]);
      for (let si = 1; si < slots.length; si++) ctx.lineTo(px(si), ys[si]);
      ctx.stroke(); ctx.setLineDash([]);
      const fx = px(0), fy = ys[0];
      ctx.beginPath(); ctx.moveTo(fx, fy - 43); ctx.lineTo(fx - 6, fy - 32); ctx.lineTo(fx + 6, fy - 32); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // draw BACK-to-FRONT (owner 2026-06-24): the front entity (and a hero's HP nameplate, which hangs
    // BELOW it into the next slot) renders ON TOP — so a rat stacked behind you never covers your HP bar.
    slots.map((s, si) => ({ s, si })).reverse().forEach(({ s, si }) => {
      const pyRaw = ys[si], isFront = si === 0;
      // RENDER INTERPOLATION: heroes/summons glide to their new slot (lane walks, depth steps,
      // stack shifts); layout math above stayed on the raw slots. Token rows tween per-coin below.
      const slotX = xs?.[si] ?? colCenter(i);
      const _sm = s.kind === "hero" || s.kind === "heroC" ? twPos("h:" + s.p.id, slotX, pyRaw)
                : s.kind === "summon" ? twPos("a:" + s.a.id, slotX, pyRaw) : null;
      const py = _sm ? _sm.y : pyRaw;
      if (s.kind === "summon") {
        const chipW = Math.max(84, Math.min(SUMMON_CHIP_MAX_W,
          lateral ? summonChipW : laneW(i) - 12));
        drawCompactSummonChip(s.a, _sm.x - chipW / 2, py, chipW, "hero",
          s.a.id === myAllyTarget, isFront, incomingTargets.has(s.a.id), si + 1);
        // On a narrow LATERAL lane the body beside this row owns the band right above it — its
        // (lane-clamped) name chip spans most of the lane at the very same y. Hand this row the
        // same FX ceiling so its cast-name callout docks above that chip instead of clipping it.
        if (lateral && laneW(i) <= LANE_NARROW_W) {
          const box = heroBoxes[heroBoxes.length - 1];
          if (box?.id === s.a.id) box.fxCapTop = py - R_HERO - 22;
        }
        return; // FRONT/#rank is integrated into the row; no detached badge competing for space
      }
      if (s.kind === "heroC") {
        drawHeroCompact(s.p, i, py, compactH ?? HERO_COMPACT_H, isFront, myAllyTarget,
          incomingTargets.has(s.p.id), grid ? _sm.x : null, grid ? summonChipW : null, !!grid);
        return; // compact rows already carry an attached front shield; a detached pill would cover neighbors
      }
      if (s.kind === "tokens") {
        // Rectangular summon cards stay capped to their lane and the board is their sole target surface.
        const all = s.toks, _n = all.length;
        const detailGap = 6;
        const detailW = Math.min(152, Math.floor((laneW(i) - 16 - detailGap * (_n - 1)) / Math.max(1, _n)));
        // Every summon stays a real, ID-bearing tactical card. Readable groups lay out normally;
        // cramped groups fan/overlap below without creating a synthetic representative.
        if (_n === 1 || (_n <= 5 && detailW >= 78)) {
          const chipW = _n === 1 ? Math.max(58, Math.min(184, laneW(i) - 16)) : detailW;
          const totalW = _n * chipW + (_n - 1) * detailGap;
          // Formation becomes spatially readable too: FRONT fans left/up toward the foe, BACK
          // fans right/down away from the hero. Narrow lanes naturally reduce the offset to zero.
          const room = Math.max(0, (laneW(i) - totalW - 16) / 2);
          const formationShift = Math.min(170, room) * (isFront ? -1 : 1);
          const left = colCenter(i) + formationShift - totalW / 2;
          all.forEach((a, j) => {
            // RENDER INTERPOLATION: the mini-card glides to its new slot like every other entity
            const _tc = a.id != null ? twPos("a:" + a.id, left + j * (chipW + detailGap), py) : null;
            drawCompactSummonChip(a, _tc ? _tc.x : left + j * (chipW + detailGap), _tc ? _tc.y : py, chipW, "hero", a.id === myAllyTarget, isFront, incomingTargets.has(a.id));
          });
          return;
        }
        // No duplicate strip and no synthetic representative: even a cramped group keeps one real
        // ID-bearing body card per summon. Cards fan/overlap inside the lane; nearest-center hit
        // resolution above makes each visible body directly selectable on touch.
        const roomW = Math.max(58, laneW(i) - 16);
        const chipW = Math.min(112, Math.max(72, roomW * 0.72));
        const step = _n > 1 ? Math.max(12, (roomW - chipW) / (_n - 1)) : 0;
        const totalW = chipW + step * (_n - 1);
        const left = colCenter(i) - totalW / 2;
        all.forEach((a, j) => {
          const x = left + j * step;
          const y = py + (j - (_n - 1) / 2) * Math.min(4, 18 / Math.max(1, _n - 1));
          const _tc = a.id != null ? twPos("a:" + a.id, x, y) : null;
          drawCompactSummonChip(a, _tc ? _tc.x : x, _tc ? _tc.y : y, chipW, "hero",
            a.id === myAllyTarget, isFront, incomingTargets.has(a.id));
        });
        return;

      }
      // SQUAD: `possessed` = the body you're piloting right now (gold ring + 👑 + YOU);
      // `owned` = another body your seat owns but is on AUTO (a bot you can click to possess —
      // marked with a dashed gold "remote-in" ring). `mine` keeps the possessed-body styling.
      const p = s.p, px = _sm.x;                   // interpolated center (lane walks glide, not teleport)
      const possessed = p.id === activeId;
      const owned = isMine(p) && !possessed;       // your other squad bodies (clickable to pilot)
      const mine = possessed;
      const col = bodies[p.bodyKey]?.color ?? "#68a";
      // fxCapTop = the top of this body's persistent name chip. Narrow lanes reserve
      // HERO_INTENT_BAND above it, so transient cast FX has somewhere honest to dock; wide lanes
      // reserve nothing there and keep the original FX placement.
      // fxTop/fxBottom = the body's TRUE painted extent (name chip above, HP plate + effect rail
      // below) as reserved by the friendly planner. The round hit-box is a touch target and is much
      // smaller than the print, so floating damage numbers key off these instead — otherwise a
      // number could land squarely on a hero's HP plate. (owner 2026-07-25)
      const heroHit = { x: px, y: py,
        r: IS_TOUCH ? Math.max(37, R_HERO + 1) : R_HERO + 9, id: p.id,
        fxTop: py - R_HERO - 24, fxBottom: py + HERO_BOTTOM_RESERVE,
        // …and the PRINT is wider than the circle too (HP plate, name chip) — widened again once
        // the name chip's real width is known, a few lines down.
        fxLeft: px - HERO_PLATE_W / 2, fxRight: px + HERO_PLATE_W / 2,
        fxCapTop: laneW(i) <= LANE_NARROW_W ? py - R_HERO - 22 : null }; // crowded art shrinks; touch target does not
      heroBoxes.push(heroHit);
      ctx.globalAlpha = p.alive ? 1 : 0.3;
      // a squad-mate on AUTO you can take over: dashed gold ring says "tap to pilot"
      if (owned && p.alive) {
        ctx.beginPath(); ctx.arc(px, py, R_HERO + 5, 0, Math.PI * 2);
        ctx.setLineDash([3, 3]); ctx.lineWidth = 2; ctx.strokeStyle = "#caa84a"; ctx.stroke(); ctx.setLineDash([]);
      }
      // YOUR ally-target (heals aim here) — dashed green ring (outside the clock ring)
      if (p.id === myAllyTarget) {
        ctx.beginPath(); ctx.arc(px, py, R_HERO + 9, 0, Math.PI * 2);
        ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.strokeStyle = "#74e69a"; ctx.stroke(); ctx.setLineDash([]);
      }
      // Tight red incoming outline in the same footprint as the cyan front arc. Red paints first;
      // cyan paints over its foe-facing segment, so both signals remain legible together.
      if (p.alive && incomingTargets.has(p.id)) {
        ctx.save(); ctx.globalAlpha = 0.72 + 0.22 * throb;
        ctx.beginPath(); ctx.arc(px, py, R_HERO + 3, 0, Math.PI * 2);
        ctx.lineWidth = 3; ctx.strokeStyle = "#ff4b45"; ctx.stroke(); ctx.restore();
      }
      // Keep timed effects and passive progress in the same fixed rail below the body.
      const statuses = p.alive ? entityStatus(p, 4) : [];
      // the front blocker gets a cyan shield arc on the foe-facing side
      if (isFront && p.alive) { ctx.beginPath(); ctx.arc(px, py, R_HERO + 3, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 3; ctx.strokeStyle = "#5cc6ff"; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(px, py, R_HERO, 0, Math.PI * 2);
      ctx.fillStyle = "#0c0f15"; ctx.fill();
      ctx.lineWidth = mine ? 3 : 2; ctx.strokeStyle = mine ? "#ffd24a" : col; ctx.stroke();
      const spr = foeSprite(formArt(p));            // WAREWOLF: hero token tracks the live form
      if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, px - R_HERO + 2, py - R_HERO + 2, (R_HERO - 2) * 2, (R_HERO - 2) * 2);
      else { ctx.font = (R_HERO + 4) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(p.bodyKey), px, py + 1); }
      heroHit.intentBadge = drawHeroIntentBadge(p, px, py, R_HERO, laneW(i));
      // REPEATED CHROME (owner 2026-07-24): "front" only means something when something stands
      // BEHIND you. A lane holding a single body drew this 🛡 and a `1 FRONT` pill anyway — four
      // times across the board, in the width the foe cards needed. Both are now depth-only.
      // …and in a LATERAL formation the lane's left edge is where the SUMMON row stands, so the
      // lane-anchored glyph printed on top of that card. Hang it off the body instead.
      if (isFront && slots.length > 1) {
        ctx.font = "11px serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText("🛡", lateral ? Math.max(laneX(i) + 4, px - R_HERO - 21) : laneX(i) + 4, py);
      }
      // CLEAN NAMEPLATE under the mimic: a rounded chip with an HP fill behind ❤ hp/max — prettier
      // and clearer than the bare green bar, and it reads at a glance like the foe cards' stat row.
      // A DEAD body skips the whole plate (+ passive/effects) — it collapses to a slim DOWN pill below
      // (owner 2026-07-10 pile-up fix) so a felled front body can't hang a 58px stack onto a summon
      // that's still carrying the fight in the slot behind it.
      // A body pushed to the far side of the LAST lane (lateral summon packing) hung its 94px HP
      // plate, effect rail, and label off the right edge of the board. Everything under the portrait
      // is clamped to the board now — off-center beats clipped.
      const npW = HERO_PLATE_W, npH = HERO_PLATE_H, npY = py + R_HERO + 4;
      const npX = Math.max(2, Math.min(W - npW - 2, px - npW / 2));
      if (p.alive) {
        const hpFrac = Math.max(0, p.hp / p.maxHp);
        ctx.fillStyle = "#11151d"; roundRect(npX, npY, npW, npH, 6); ctx.fill();
        ctx.save(); roundRect(npX, npY, npW, npH, 6); ctx.clip();
        ctx.fillStyle = hpFrac > 0.4 ? "#2f6b3a" : "#7a2f2f"; ctx.fillRect(npX, npY, npW * hpFrac, npH); ctx.restore();
        ctx.lineWidth = mine ? 2 : 1; ctx.strokeStyle = mine ? "#ffd24a" : "#39404d"; roundRect(npX, npY, npW, npH, 6); ctx.stroke();
        ctx.font = `bold ${IS_TOUCH ? 13 : 14}px ui-monospace, monospace`; ctx.textBaseline = "middle";
        if (p.shield > 0) {
          // owner 2026-06-21: the shield lives IN the HP bar now — a cyan cap on the RIGHT with 🛡amount,
          // HP shifts left. (Was a bare 🛡 floating at the lane edge with no number.)
          const capW = Math.min(npW * 0.45, 10 + String(p.shield).length * 9);
          ctx.save(); roundRect(npX, npY, npW, npH, 6); ctx.clip();
          ctx.fillStyle = "#1c4a63"; ctx.fillRect(npX + npW - capW, npY, capW, npH); ctx.restore();
          ctx.fillStyle = "#eef3f8"; ctx.textAlign = "left"; ctx.fillText(`❤${p.hp}/${p.maxHp}`, npX + 6, npY + npH / 2 + 0.5);
          ctx.fillStyle = "#bfe9ff"; ctx.textAlign = "right"; ctx.fillText(`🛡${p.shield}`, npX + npW - 5, npY + npH / 2 + 0.5);
        } else {
          ctx.fillStyle = "#eef3f8"; ctx.textAlign = "center"; ctx.fillText(`❤ ${p.hp}/${p.maxHp}`, npX + npW / 2, npY + npH / 2 + 0.5);
        }
        // ⚡ MOXIE PILL beside the HP plate (owner-approved 2026-07-11) — the PILOTED body only, on touch:
        // put current moxie right next to the portrait/HP so "how much can I spend" sits by the thing that
        // spends it (the hotbar meter carries the same number). Gold-bordered to read as the moxie color.
        // FLAG: colors/size owner-tunable; touch-gated (desktop reads moxie off the labeled hotbar meter).
        if (mine && IS_TOUCH) {
          const mxTxt = `⚡${p.moxie ?? 0}`;
          ctx.font = "bold 12px ui-monospace, monospace"; ctx.textBaseline = "middle";
          const mpW = ctx.measureText(mxTxt).width + 12, mpY = npY;
          const mpX = Math.min(npX + npW + 4, W - mpW - 2);
          ctx.fillStyle = "#1d1a10"; roundRect(mpX, mpY, mpW, npH, 6); ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = "#e6c34a"; roundRect(mpX, mpY, mpW, npH, 6); ctx.stroke();
          ctx.fillStyle = "#ffe9a8"; ctx.textAlign = "center"; ctx.fillText(mxTxt, mpX + mpW / 2, mpY + npH / 2 + 0.5);
        }
        // ARMOR (flat DR — Warewolf human form / worn DR / Stoneskin) = the hex badge LEFT of the HP
        // plate (owner 7/11: it read "🛡-1" in the HUD, i.e. "minus one shield"); 🛡 stays the absorb pool.
        if ((p.dr ?? 0) > 0) drawArmorBadge(npX - 11, npY + npH / 2, IS_TOUCH ? 10 : 9, p.dr);
        // ONE slim body-passive line beneath the nameplate (color-coded, no ring), if any.
        // Layout reserves this rail, so it never needs to clamp upward across HP.
        if (statuses.length) {
          drawCenteredEffectChips(px, npY + npH + 10, statuses, false, 4);
        }
      }
      ctx.globalAlpha = 1;
      // label: possessed body = bold gold "YOU"; an owned squad bot = its name in gold-ish
      // with an AUTO tag (it's clickable to pilot); everyone else = plain name.
      ctx.fillStyle = mine ? "#ffd24a" : owned ? "#d9c98a" : "#cfd3dc";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      let _rankDock = null;   // set below when the depth pill rides the name chip instead of the body
      {
        const _bl = bonusLabelAlways(p.meleeBonus, p.rangedBonus);
        // R5 keeps YOUR damage add pinned to your own token at all times. On a narrow lane the same
        // pips repeated on every companion were pure width tax — four "🗡🎯0"s widening four label
        // chips into each other and into the intent badge. Companions drop them there; a tap on the
        // body still opens its full card. FLAG (owner re-tune): piloted body is never affected.
        const _label = (mine || laneW(i) > LANE_NARROW_W) ? (mine ? "👑 YOU" : p.name) + "  " + _bl : p.name;
        const labelY = py - R_HERO - 4;
        // NARROW LATERAL LANE (owner 2026-07-24): the summon row and the body share ONE horizontal
        // strip here, so the detached depth pill had to stand in the ~18px between them — touching
        // the ally card on one side and the body's ring on the other. Reserving its width in the
        // packer would have cost the summon row ~20px of telegraph (its name already sits at the
        // 7px floor), so the pill moves UP and rides the name chip as one group: that band is free,
        // the ally card keeps its full width, and clear air is left around the portrait.
        // FLAG (owner re-tune): the 3px pill↔chip gap is mine.
        const rankPill = lateral && slots.length > 1 && laneW(i) <= LANE_NARROW_W;
        const rankW = rankPill ? depthBadgeW(si + 1, isFront) : 0;
        const rankPad = rankW ? rankW + 3 : 0;
        const labelMax = Math.max(72, laneW(i) - 8 - rankPad);
        // …and the chip stays inside its own lane, so a body parked at a lane edge (lateral summon
        // packing) can no longer print its name across the divider or off the canvas.
        ctx.font = `${mine ? "bold " : ""}${mine ? 14 : 13}px ui-monospace, monospace`;
        const labelW = Math.min(labelMax, ctx.measureText(_label).width + 10);
        const groupW = labelW + rankPad;
        const gLeft = Math.max(laneX(i) + 2,
          Math.min(laneX(i) + laneW(i) - groupW - 2, px - groupW / 2));
        const lx = gLeft + labelW / 2;
        // The name chip is the widest thing this body paints; a floating number placed "beside" the
        // portrait was landing on it, because the hit-box is only a circle. (owner 2026-07-25)
        heroHit.fxLeft = Math.min(heroHit.fxLeft, gLeft - 2);
        heroHit.fxRight = Math.max(heroHit.fxRight, gLeft + groupW + 2);
        if (rankW) _rankDock = { x: gLeft + labelW + 3, y: labelY - 18 };
        if (IS_TOUCH) {
          ctx.fillStyle = "#090c10e6"; roundRect(lx - labelW / 2, labelY - 18, labelW, 19, 5); ctx.fill();
          ctx.fillStyle = mine ? "#ffd24a" : owned ? "#d9c98a" : "#cfd3dc";
        }
        // (fitText draws BOLD; a companion label was never bold, so it keeps its own plain draw.)
        if (mine) fitText(_label, lx, labelY, labelMax, 14, 10, "center", "bottom");
        else { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(ellip(_label, labelMax), lx, labelY); }
      } // R5: crown + player melee/ranged bonus share ONE fitted label, never the same painted pixels

      // DOWN → a slim pill in the nameplate band (replaces the felled body's full HP plate), so its
      // whole print hangs only ~R+22 and clears a summon carrying the fight below it (owner 2026-07-10).
      if (!p.alive) {
        // Keep the lethal card AND its source inside a half-lane even beside a surviving summon.
        // Full prose remains available in downCause.label; the board uses the body's distinctive
        // final word ("Neptune", "Hydra", "Elemental") as a compact callout.
        const downSource = p.downCause?.sourceBodyName?.trim().split(/\s+/).pop();
        const downWhat = downSource && p.downCause?.cause
          ? `${downSource}/${p.downCause.cause}`
          : p.downCause?.cause || downSource || p.downCause?.label;
        const downLabel = downWhat
          ? `DOWN · ${downWhat}${p.downCause.hpLost > 0 ? ` · ${p.downCause.hpLost} HP` : ""}`
          : "DOWN";
        ctx.font = "bold 11px ui-monospace, monospace";
        const downMaxW = lateral
          ? Math.max(92, laneW(i) / Math.max(1, slots.length) - 14)
          : Math.max(92, laneW(i) - 12);
        const dpW = Math.min(Math.max(56, ctx.measureText(downLabel).width + 16), downMaxW);
        const laneMid = laneX(i) + laneW(i) / 2;
        const dpCenter = lateral ? px + Math.sign(px - laneMid) * 18 : px; // nudge away from the adjacent summon plate
        const dpH = 18, dpX = dpCenter - dpW / 2, dpY = py + R_HERO + 5;
        heroHit.fxLeft = Math.min(heroHit.fxLeft, dpX - 2);        // the DOWN pill is print too
        heroHit.fxRight = Math.max(heroHit.fxRight, dpX + dpW + 2);
        ctx.fillStyle = "#241213"; roundRect(dpX, dpY, dpW, dpH, 6); ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = "#7a2f2f"; roundRect(dpX, dpY, dpW, dpH, 6); ctx.stroke();
        ctx.fillStyle = "#e77"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        fitText(downLabel, dpCenter, dpY + dpH / 2 + 0.5, dpW - 10, 11, 8, "center", "middle");
      }
      if (slots.length > 1) drawDepthBadge(px, py, si + 1, isFront, R_HERO, R_HERO, i, _rankDock);
      if (p.offline) { ctx.fillStyle = "#e6a23c"; ctx.fillText("OFFLINE", px, py + R_HERO + (p.alive ? 12 : 22)); }
    });
  }

  // PENDING-ECHO OVERLAY: dashed markers on the intents the server hasn't confirmed yet
  drawPendingEcho(myTarget, myAllyTarget);

  // (Caravan bar deleted 2026-06-27 — no shared HP pool. The strip below the play area is now just a
  // quiet seam between the board and the hand; the hero nameplates are free to hang into it.)
  ctx.fillStyle = "#13161e"; ctx.fillRect(0, CARAVAN_Y, W, CARAVAN_H);

  // LANE-CHANGE COOLDOWN readout — painted into that (empty) seam strip, so it costs no layout.
  try { drawLaneCooldown(players); } catch (e) { ctx.globalAlpha = 1; }

  // hotbar (your items)
  drawHotbar(me);

  // cast-FX OVER-pass: refresh the anchor cache from the boxes just painted, then light the
  // impacted bodies' OWN borders. The motion itself already went down under the board above.
  try { drawCastFxOver(); } catch (e) { ctx.globalAlpha = 1; }

  // inspect a foe on hover (details on demand)
  drawFoeInspect(bodies);

  // banner
  if (phase === "won" || phase === "lost") {
    const complete = state.map && state.map.levelComplete;
    ctx.fillStyle = "#000a"; ctx.fillRect(0, 0, W, CARAVAN_Y);
    ctx.fillStyle = phase === "won" ? (complete ? "#e6c34a" : "#7e7") : "#e66";
    ctx.font = "bold 28px ui-monospace, monospace";
    ctx.fillText(phase === "won" ? (state.runWon ? "👑 THE THRONE IS YOURS" : complete ? "FLOOR CLEARED — DESCEND ▶" : "ROOM CLEARED") : "YOUR PARTY FALLS", W / 2, CARAVAN_Y / 2);
  }

  // floating +N buff/passive feedback, drawn on top of the board entities
  try { _drawFct(); } catch (e) { ctx.globalAlpha = 1; }
  // buff-chip hover label, topmost
  try { drawEffectTooltip(); } catch (e) {}
  // 🂠 deck-peek panel (tap the hotbar counts), topmost
  try { drawDeckPeek(); } catch (e) {}

  // notify side panels (map.js / inventory.js). Panels get the ACTIVE body so the
  // inventory/body-swap follow possession; map.js keys off state, not the id.
  window.KM.state = state; window.KM.you = you; window.KM.activeId = activeId;
  window.KM.hit = { foes: foeBoxes, heroes: heroBoxes };   // live LOGICAL hit-boxes for the probe harnesses
  window.KM.board = { W, H, bossBottom: _bossBannerBottom, caravanY: CARAVAN_Y,
    laneW: _laneW.slice(0, COLS), foeBands: _foeBands.slice(0, COLS),
    fxBlockers: _fxBlockers };  // command-panel boundary + per-lane foe geometry + painted-but-untappable ink, for real-client layout proofs
  // LANE COOLDOWN, exposed on the same harness bridge as the hit-boxes above. `paintedLane` is the
  // lane the client is actually DRAWING the piloted body in (post optimistic-echo), so a probe can
  // prove the client never predicts a move the cooldown will refuse.
  window.KM.laneCd = { left: laneCdTicks(), max: laneCdMaxTicks(),
    blockedAt: _laneBlock?.at ?? null, blockedLane: _laneBlock?.lane ?? null,
    paintedLane: (players || []).find((p) => p.id === activeId)?.lane ?? null };
  window.KM.ui = { fct: _fctDrawn,   // floating damage/heal number rects — non-occlusion proof surface
    handInspect: _handTip?.k ?? null, pickKind: _pickHand?.kind ?? _pickEl?.dataset?.pickKind ?? null,
    pickChoices: _pickHand ? pickHandEntries().map((c) => ({ key: c.pickKey ?? null, name: c.name, nav: c.nav ?? 0 })) : [],
    castFx: _castFxActive.map((fx) => ({ id: fx.id, kind: fx.kind, shape: fx.shape ?? null,
      overlay: fx.overlay ?? null,
      lane: fx.lane, lanes: fx.lanes ?? [],
      sourceId: fx.sourceId ?? null, cardKey: fx.cardKey ?? null,
      bodyKey: fx.bodyKey ?? null, cardName: fx.cardName ?? null, targetId: fx.targetId ?? null,
      targets: fx.targets ?? [] })) };
  const panelId = pilot()?.id ?? you;
  for (const cb of window.KM._cbs) { try { cb(state, panelId); } catch (e) {} }

  // ── FIXTURE WATERMARK (owner 2026-06-27) ───────────────────────────────────────────────────
  // ANY `?demo=…` render is a hand-built FIXTURE, never real gameplay (e.g. tools/realshot.js's
  // fabricated 3-player scene). A REAL player never sets `?demo=`, and the canonical screenshot
  // tool (tools/shoot.mjs) drives a real run with NO demo param — so this branch is 100% inert in
  // the live game and on every honest screenshot. Drawn last → topmost, burned into the PNG, so a
  // fixture can never be passed off as the real game by accident.
  if (_demo) {
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.15; ctx.fillStyle = "#ff3b3b";
    ctx.font = `bold ${Math.max(18, Math.round(W / 15))}px system-ui, sans-serif`;
    ctx.translate(W / 2, H / 2); ctx.rotate(-0.34);
    const span = Math.hypot(W, H);
    for (let yy = -span / 2; yy < span / 2; yy += Math.max(40, W / 7)) ctx.fillText("FIXTURE — NOT A REAL GAME", 0, yy);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.93; ctx.fillStyle = "#7a0010"; ctx.fillRect(0, 0, W, 22);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText("⚠ FIXTURE — NOT REAL GAMEPLAY · real shots: node tools/shoot.mjs", W / 2, 11);
    ctx.globalAlpha = 1; ctx.strokeStyle = "#ff3b3b"; ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, W - 4, H - 4);
    ctx.restore();
  }

  // RENDER INTERPOLATION: while any entity is mid-glide, keep painting between snapshots.
  // One pending rAF at a time; the loop self-terminates ≤LERP_MS after the last position change.
  if (_twNeed && !_twRaf) _twRaf = requestAnimationFrame(() => { _twRaf = 0; render(); });
}

// ── PENDING-ECHO OVERLAY (optimistic input, 2026-07-11) ─────────────────────────────────────
// An UNCONFIRMED intent draws in the exact grammar of its confirmed ring — same hue, same
// placement — but DASHED and slightly dimmed; the moment the server's snapshot confirms, the
// pending entry dissolves and the solid ring takes over seamlessly.
// FLAG styling (owner re-skin): dashes [5,4], alpha 0.75, hues match the confirmed rings
// (#3df target / #74e69a heal-aim / #ffd24a lane-walk).
function drawPendingEcho(myTarget, myAllyTarget) {
  if (!_pend.size) return;
  ctx.save();
  ctx.setLineDash([5, 4]); ctx.globalAlpha = 0.75; ctx.lineWidth = 2;
  if (myTarget != null && pendActive("target", myTarget)) {
    const b = foeBoxes.find((f) => f.id === myTarget);
    if (b) { ctx.strokeStyle = "#3df"; roundRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 8); ctx.stroke(); }
  }
  if (myAllyTarget != null && pendActive("ally", myAllyTarget)) {
    const b = heroBoxes.find((h) => h.id === myAllyTarget);
    if (b) {
      ctx.strokeStyle = "#74e69a";
      if (b.r != null) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2); ctx.stroke(); }
      else { roundRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 8); ctx.stroke(); }
    }
  }
  // lane walk in flight: a dashed gold ring rides the piloted body while the server catches up
  const lanePend = _pend.get("lane|" + activeId);
  if (lanePend && Date.now() - lanePend.at <= PEND_MS) {
    const b = heroBoxes.find((h) => h.id === activeId);
    if (b && b.r != null) { ctx.strokeStyle = "#ffd24a"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
}

// One summon combat row on either side: compact identity art, durability, truthful action resource,
// next action, and progress. A separate 44px touch box keeps shrinking art from shrinking input.
function drawCompactSummonChip(a, x, centerY, w, side, targeted, isFront = false, incoming = false, rank = null) {
  const h = SUMMON_CHIP_H;
  const foe = side === "foe";
  const q0 = (a.queue || [])[0];
  const next = foeTokenAction(a);
  const frac = Math.max(0, Math.min(1, q0 ? (a.castFrac ?? 0) : (next.frac ?? 0)));
  const ready = !!q0 && frac >= 0.999;
  const urgent = ready || (!q0 && !!next.imminent);
  const seed = String(a.id ?? a.bodyKey ?? "").split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  const bob = Math.sin((state?.tick ?? 0) * 0.2 + seed) * (urgent ? 1.8 : 0.75);
  const y = centerY - h / 2 + bob;
  const col = a.aura ? "#ffd24a" : (a.color || (foe ? "#d2683f" : "#3ec98a"));
  const sideCol = foe ? "#d2683f" : "#3ec98a";

  ctx.save();
  if (urgent) { ctx.shadowColor = q0?.color || next.color || col; ctx.shadowBlur = 8 + 4 * Math.sin((state?.tick ?? 0) * 0.45); }
  ctx.fillStyle = foe ? "#241616" : "#10221a";
  roundRect(x, y, w, h, 7); ctx.fill();
  ctx.save(); roundRect(x, y, w, h, 7); ctx.clip();
  if (frac > 0) {
    ctx.globalAlpha = 0.18 + (urgent ? 0.1 : 0);
    ctx.fillStyle = q0?.color || next.color || col;
    ctx.fillRect(x, y + h - 12, (w * frac), 12);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = col; ctx.fillRect(x, y, 4, h);
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = targeted ? (foe ? "#3df" : "#74e69a") : sideCol;
  ctx.lineWidth = targeted ? 2.5 : 1.5;
  if (targeted) ctx.setLineDash([4, 2]);
  roundRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, 7); ctx.stroke();
  ctx.setLineDash([]);
  if (incoming && !foe) { ctx.lineWidth = 2.5; ctx.strokeStyle = "#ff4b45"; roundRect(x - 1, y - 1, w + 2, h + 2, 8); ctx.stroke(); }

  const art = h - 10, ix = x + 5, iy = y + 5;
  ctx.fillStyle = "#090c10"; roundRect(ix, iy, art, art, 5); ctx.fill();
  const spr = foeSprite(formArt(a));
  if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, ix, iy, art, art);
  else { ctx.fillStyle = "#eef3f8"; ctx.font = `${Math.round(art * 0.62)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(a.bodyKey), ix + art / 2, iy + art / 2); }
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; roundRect(ix + 0.5, iy + 0.5, art - 1, art - 1, 5); ctx.stroke();

  const tx = ix + art + 6, tr = x + w - 5;
  ctx.fillStyle = foe ? "#ffe2d8" : "#e2ffeb";
  const depth = rank != null ? `${isFront ? "FRONT" : `#${rank}`} · ` : "";
  const displayName = `${depth}${a.name || a.bodyKey}${a.ratCount > 1 ? ` ×${a.ratCount}` : ""}`;
  const hpLabel = `♥${a.hp}/${a.maxHp}`;
  const shieldLabel = a.shield > 0 ? `🛡${a.shield}` : "";
  ctx.font = "bold 10px ui-monospace, monospace";
  const shieldCapW = shieldLabel ? Math.min(34, Math.max(20, ctx.measureText(shieldLabel).width + 6)) : 0;
  const hpRight = tr - (shieldCapW ? shieldCapW + 3 : 0);
  const hpReserve = ctx.measureText(hpLabel).width + 7 + (tr - hpRight);
  const nameW = tr - tx - hpReserve;
  if (nameW >= 9) fitText(displayName, tx, y + 4, nameW, IS_TOUCH ? 11 : 12, 7, "left", "top");
  const hpFrac = a.hp / Math.max(1, a.maxHp ?? a.hp);
  ctx.fillStyle = hpFrac <= 0.35 ? "#ff8a80" : "#9bf09b";
  ctx.font = "bold 10px ui-monospace, monospace"; ctx.textAlign = "right"; ctx.textBaseline = "top";
  ctx.fillText(hpLabel, hpRight, y + 4);
  if (shieldLabel) {
    ctx.fillStyle = "#1c4a63"; roundRect(tr - shieldCapW, y + 2, shieldCapW, 14, 4); ctx.fill();
    ctx.fillStyle = "#bfe9ff"; ctx.font = "bold 9px ui-monospace, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(shieldLabel, tr - shieldCapW / 2, y + 9);
  }

  const charge = `⚡${a.moxie ?? 0}/${q0?.cost ?? a.moxieMax ?? 10}`;
  const action = q0 ? `${charge} ${q0.name}${q0.dmgNow ? " · " + q0.dmgNow : ""}`
    : next.text;
  // ACTIVE-EFFECT CHIPS (owner 2026-07-27: "I can't see buffs and debuffs on summons"). This compact
  // summon chip omitted them entirely, though foes AND full summon bodies both show them. Seat up to two
  // status chips at the action line's right (tap/hold one for detail — drawEffectChipAt registers the
  // hit box), reserving their width so the action text yields rather than overprints.
  const sumEffs = entityStatus(a, 2);
  const _er = IS_TOUCH ? 7 : 6, _estep = _er * 2 + 2, _chipsW = sumEffs.length ? sumEffs.length * _estep + 3 : 0;
  ctx.fillStyle = urgent ? "#fff2a8" : (next.color || q0?.color || (foe ? "#e8b2a2" : "#a9d8b8"));
  fitText(action, tx, y + h - 14, Math.max(18, tr - tx - _chipsW), 9, 7, "left", "top");
  for (let k = 0; k < sumEffs.length; k++) drawEffectChipAt(tr - _er - k * _estep, y + h - 9, _er, sumEffs[k]);
  if (urgent && !sumEffs.length) { ctx.fillStyle = "#fff2a8"; ctx.font = "bold 11px serif"; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText("✦", tr, y + h / 2); }
  if (isFront) { ctx.fillStyle = "#bff6ff"; ctx.font = "10px serif"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("🛡", x - 1, y - 5); }
  ctx.restore();

  if (a.id != null) {
    const hitY = centerY - SUMMON_CHIP_HIT_H / 2;
    if (foe) foeBoxes.push({ x, y: hitY, w, h: SUMMON_CHIP_HIT_H, id: a.id, e: a });
    else heroBoxes.push({ x, y: hitY, w, h: SUMMON_CHIP_HIT_H, id: a.id, ally: true });
  }
}

// A hostile summon is a combat decision, not decoration. In the exact Lich phone layout only ~25
// logical px remain between the boss banner and hero, so the old 38px "detailed" card fell back to a
// nameless 17px coin. This tactical token fits the SAME 24px budget while carrying identity, HP,
// action scope/damage, and time-to-fire. Full prose/deck detail remains on hold.
const foeScopeLabel = (scope) => scope === "all-lanes" ? "ALL"
  : scope === "lane" ? "LANE"
  : scope === "aimed" ? "AIM"
  : scope === "random" ? "RANDOM"
  : scope === "highest" ? "HIGHEST HP"
  : scope === "front3" ? "FRONT3"
  : scope === "front2" ? "FRONT2"
  : scope === "front" ? "FRONT" : "";
const foeThreatSeconds = (t) => Math.max(0, ((t?.cd ?? 0) * (1 - Math.max(0, Math.min(1, t?.frac ?? 0)))) / 10);
function foeTokenAction(a) {
  const q0 = (a.queue || [])[0];
  if (q0) {
    const now = a.moxie ?? 0, cost = q0.cost ?? 0;
    const charge = now >= cost ? "READY" : `⚡${now}/${cost}`;
    const frac = a.castFrac ?? 0;
    const effect = q0.harm
      ? `HIT ${foeScopeLabel(q0.scope)} ${q0.dmgNow || q0.dmg || q0.name}`
      : q0.name;
    // Moxie progress stays truthful under Slow/Haste; a guessed seconds countdown did not.
    return { text: `${effect} · ${charge}`, frac, harm: !!q0.harm, imminent: !!q0.harm && frac > 0.75,
      priority: (q0.harm ? 10 : 2) + frac, color: q0.color || "#d2683f" };
  }
  const harms = (a.threats || []).filter((t) => t.harm);
  const t = harms.sort((x, y) => foeThreatSeconds(x) - foeThreatSeconds(y))[0];
  if (t) {
    const secs = foeThreatSeconds(t);
    const frac = t.frac ?? 0;
    return { text: `HIT ${foeScopeLabel(t.scope)} · ${t.dmg ?? "?"} DMG · ${secs.toFixed(1)}s`, frac,
      harm: true, imminent: frac > 0.75, priority: 10 + frac, color: t.color || "#ff9ed2" };
  }
  if (a.aura) {
    const effects = [];
    if (a.aura.dmgBonus) effects.push(`+${a.aura.dmgBonus} DMG`);
    if (a.aura.dmgReduce) effects.push(`−${a.aura.dmgReduce} TAKEN`);
    return { text: `AURA ALLIES ${effects.join(" / ") || "BUFF"}`, frac: 1,
      harm: false, imminent: false, priority: 5, color: a.color || "#7fb08a" };
  }
  return { text: a.reactive ? "REACTIVE" : "BLOCKER · NO ATTACK", frac: 0,
    harm: false, imminent: false, priority: a.reactive ? 1 : 0, color: "#7c8696" };
}
// `rowH` (owner 2026-07-24): a crowded boss lane splits its foe band between the summon cluster and
// the real foes, so this row must be able to run SHORTER than its 30px ideal. Below 24px the two
// text lines cannot both seat, so the row folds to one line that still carries name, HP and action.
function drawFoeSummonTacticalChip(a, x, centerY, w, targeted, touchHitH = null, rowH = 30) {
  const h = Math.max(12, Math.round(rowH)), y = centerY - h / 2, oneLine = h < 24;
  const action = foeTokenAction(a), imminent = action.imminent;
  ctx.save();
  ctx.fillStyle = "#241616"; roundRect(x, y, w, h, 5); ctx.fill();
  ctx.save(); roundRect(x, y, w, h, 5); ctx.clip();
  ctx.fillStyle = (a.color || "#d2683f") + "24"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = action.color; ctx.globalAlpha = 0.72; ctx.fillRect(x, y + h - 3, w * Math.max(0.03, Math.min(1, action.frac)), 3);
  ctx.restore();
  ctx.lineWidth = imminent ? 2 : 1.25; ctx.strokeStyle = imminent ? "#ff5b55" : "#d2683f";
  roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 5); ctx.stroke();
  if (targeted) { ctx.lineWidth = 1.5; ctx.strokeStyle = "#3df"; roundRect(x + 2, y + 2, w - 4, h - 4, 4); ctx.stroke(); }

  // Portrait only when the lane can seat it without stealing the words. A borrowed-width 84px lane
  // gets two full text lines; wider lanes retain the summon art/personality too.
  let tx = x + 5;
  if (w >= 100 && h >= 16) {
    const art = h - 6, iy = y + 3;
    const spr = foeSprite(formArt(a));
    ctx.fillStyle = "#090c10"; roundRect(tx, iy, art, art, 4); ctx.fill();
    if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, tx, iy, art, art);
    else { ctx.fillStyle = "#eef3f8"; ctx.font = `${Math.round(art * 0.65)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(a.bodyKey), tx + art / 2, iy + art / 2); }
    tx += art + 4;
  }
  const tr = x + w - 4;
  if (oneLine) {
    const label = `${a.name || a.bodyKey} ♥${a.hp}/${a.maxHp}`;
    ctx.font = `bold 9px ui-monospace, monospace`;
    const nameW = Math.min(ctx.measureText(label).width, Math.max(18, (tr - tx) * 0.55));
    ctx.fillStyle = "#ffe2d8";
    fitText(label, tx, y + h / 2 - 1, nameW, 9, 6, "left", "middle");
    ctx.fillStyle = imminent ? "#fff2a8" : "#e8b2a2";
    fitText(action.text, tx + nameW + 5, y + h / 2 - 1, Math.max(16, tr - tx - nameW - 5), 9, 6, "left", "middle");
  } else {
    ctx.fillStyle = "#ffe2d8";
    fitText(`${a.name || a.bodyKey} · ♥${a.hp}/${a.maxHp}`, tx, y + 3, Math.max(18, tr - tx), 10, 6, "left", "top");
    ctx.fillStyle = imminent ? "#fff2a8" : "#e8b2a2";
    fitText(action.text, tx, y + h - 11, Math.max(18, tr - tx), 9, 6, "left", "top");
  }
  ctx.restore();
  if (a.id != null) {
    // The touch surface keeps its established +14px bleed over the painted row (30 → the familiar
    // 44), so a normal-height chip is byte-identical; a SHORT shared-band row scales its bleed down
    // with it rather than reaching 14px into the foe rows stacked immediately above and below.
    const hitH = touchHitH ?? (IS_TOUCH ? Math.max(24, Math.min(44, h + 14)) : h), hitY = centerY - hitH / 2;
    foeBoxes.push({ x, y: hitY, w, h: hitH, id: a.id, e: a });
  }
}

// LAST RESORT ONLY (see the gate in render(), rewritten 2026-07-24). When a lane's foe band cannot
// seat even a FOE_ROW_FLOOR row per body, stacking full bodies would push them through the command
// rail and off the board — so represent that one tactical decision once instead of hiding it. The
// row is one honest target surface: when the player already aims a member it shows that member;
// otherwise it shows the most imminent threat. Name, HP, action, highlight, inspector payload, and
// tap id all describe that same entity, and the `+N ADDS` suffix says out loud that more are there.
function drawNarrowBossAddSummary(laneIdx, bottomY, topBound, foes, myTarget) {
  const aimed = foes.find((foe) => foe.id === myTarget);
  const hottest = foes.map((foe) => ({ foe, action: foeTokenAction(foe) }))
    .sort((a, b) => b.action.priority - a.action.priority)[0]?.foe || foes[0];
  const target = aimed || hottest;
  const extra = Math.max(0, foes.length - 1);
  const grouped = {
    ...target,
    id: target.id,
    name: `${target.name || target.bodyKey}${extra ? ` · +${extra} ADD${extra === 1 ? "" : "S"}` : ""}`,
    hp: target.hp,
    maxHp: target.maxHp,
  };
  const x = laneX(laneIdx) + 6, w = Math.max(54, laneW(laneIdx) - 12);
  // Pin the aggregate immediately below the command/positional band. Anchoring it to `bottomY`
  // made the strip drift down through party names whenever a tall boss panel reduced headroom.
  const cy = topBound + 17;
  drawFoeSummonTacticalChip(grouped, x, cy, w, !!aimed, 30);
  let alarm = 0;
  for (const foe of foes) for (const threat of foe.threats || [])
    if (threat.harm && threat.scope === "all-lanes" && (threat.frac ?? 0) > 0.66)
      alarm = Math.max(alarm, threat.frac ?? 0);
  return alarm;
}

// Constrained hostile summons still read as bodies: portrait + cast-progress ring are the target,
// with one terse HP/action line.  Full detail remains on hold, but there is no detached target card.
function drawFoeSummonCoin(a, px, py, cellW, targeted) {
  const R = IS_TOUCH ? 23 : 25, action = foeTokenAction(a);
  ctx.save();
  ctx.fillStyle = "#160f10"; ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.fill();
  const spr = foeSprite(formArt(a));
  if (spr.complete && spr.naturalWidth) {
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, R - 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(spr, px - R + 2, py - R + 2, (R - 2) * 2, (R - 2) * 2); ctx.restore();
  } else {
    ctx.fillStyle = "#eef3f8"; ctx.font = `${R + 3}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(iconFor(a.bodyKey), px, py + 1);
  }
  ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2);
  ctx.lineWidth = targeted ? 3 : 2; ctx.strokeStyle = targeted ? "#3df" : "#d2683f";
  if (targeted) ctx.setLineDash([4, 2]); ctx.stroke(); ctx.setLineDash([]);
  if ((action.frac ?? 0) > 0) {
    ctx.beginPath(); ctx.arc(px, py, R + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, action.frac));
    ctx.lineWidth = 3; ctx.strokeStyle = action.imminent ? "#ff5b55" : (action.color || "#e8b2a2"); ctx.stroke();
  }
  ctx.fillStyle = "#ffe2d8";
  fitText(a.name || a.bodyKey || "Summon", px, py - R - 4, Math.max(48, cellW - 4), 11, 7, "center", "bottom");
  const q0 = (a.queue || [])[0];
  const line = `♥${a.hp}/${a.maxHp}${q0 ? ` · ⚡${a.moxie ?? 0}/${q0.cost ?? "?"}${q0.dmgNow ? ` ${q0.dmgNow}` : ""}` : ""}`;
  ctx.fillStyle = action.imminent ? "#fff2a8" : "#e8b2a2";
  fitText(line, px, py + R + 4, Math.max(48, cellW - 2), 10, 7, "center", "top");
  ctx.restore();
  if (a.id != null) foeBoxes.push({ x: px - (R + 8), y: py - (R + 8), w: (R + 8) * 2,
    h: (R + 8) * 2, id: a.id, e: a });
}

// Hostile summons use the same compact combat-row grammar as friendly summons. A physically cramped
// swarm falls back to the shorter tactical row, then one named group card.
function drawFoeTokenCluster(laneIdx, bottomY, topBound, toks, myTarget, reserveAbove = 0) {
  // BORROWED WIDTH (owner picked D 2026-07-07): the uniform `COLW` global was retired when lane
  // widths went dynamic, but this cluster still read it → `COLW is not defined` threw the instant a
  // FOE summoned a token body (rat/hydra head/tentacle/…), aborting render() AFTER ctx.clearRect and
  // leaving the whole board blank while the sim ran on ("the board disappeared and I lost"). Use the
  // same per-lane accessors every other draw path uses, so the cluster sits in its real lane box.
  const colX = laneX(laneIdx), colW = laneW(laneIdx);
  const available = bottomY - topBound - reserveAbove;
  const detailGap = 6;
  const detailW = Math.min(SUMMON_CHIP_MAX_W,
    Math.floor((colW - 12 - detailGap * (toks.length - 1)) / Math.max(1, toks.length)));
  if (toks.length <= 3 && detailW >= 84 && available >= SUMMON_CHIP_HIT_H + 4) {
    const totalW = toks.length * detailW + (toks.length - 1) * detailGap;
    const left = colX + (colW - totalW) / 2;
    const cy = bottomY - SUMMON_CHIP_HIT_H / 2 - 2;
    toks.forEach((e, j) => {
      const x = left + j * (detailW + detailGap);
      const _tc = e.id != null ? twPos("f:" + e.id, x, cy) : null;
      drawCompactSummonChip(e, _tc ? _tc.x : x, Math.max(_tc ? _tc.y : cy, topBound + SUMMON_CHIP_HIT_H / 2),
        detailW, "foe", e.id === myTarget);
    });
    return bottomY - SUMMON_CHIP_HIT_H - 4;
  }
  // Do not greedily consume the height reserved for real foes above this token cluster.
  const n = toks.length;
  const miniW = Math.min(152, Math.floor((colW - 12 - detailGap * (n - 1)) / Math.max(1, n)));
  // A crowded BOSS lane hands this cluster a share of the band, not the whole thing (see the
  // reserveForReal split in render()). Spend what the share allows instead of taking a fixed 30px:
  // one summoned rat used to cost four real foes their rows on the owner's 4-lane phone board.
  const detailH = Math.max(FOE_ROW_FLOOR, Math.min(30, bottomY - topBound - reserveAbove - 4));
  if (n <= 5 && miniW >= 62 && bottomY - topBound - reserveAbove >= FOE_ROW_FLOOR + 4) {
    const totalW = n * miniW + (n - 1) * detailGap;
    const left = colX + (colW - totalW) / 2;
    const cy = bottomY - detailH / 2 - 2;
    toks.forEach((e, j) => {
      // RENDER INTERPOLATION: the foe mini-card glides to its new slot
      const _tc = e.id != null ? twPos("f:" + e.id, left + j * (miniW + detailGap), cy) : null;
      // A boss can add/reflow summons while its intent grid is live. Never let the cosmetic tween
      // traverse that telemetry: clamp the drawn chip (and therefore its hitbox) below the banner.
      const drawY = Math.max(_tc ? _tc.y : cy, topBound + detailH / 2);
      drawFoeSummonTacticalChip(e, _tc ? _tc.x : left + j * (miniW + detailGap), drawY, miniW, e.id === myTarget, null, detailH);
    });
    return bottomY - detailH - 4;
  }
  // A true swarm is one tactical decision, so present one large named group card instead of a grid
  // of tiny circles. The representative target is the lowest-HP member (or the member already aimed
  // at), while the text reports the full live count and total HP.
  const aimed = toks.find((e) => e.id === myTarget);
  const target = aimed || toks.reduce((best, e) => !best || e.hp < best.hp ? e : best, null);
  const hottest = toks.map((e) => ({ e, action: foeTokenAction(e) }))
    .sort((a, b) => b.action.priority - a.action.priority)[0]?.e || target;
  const homogeneous = toks.every((e) => e.bodyKey === toks[0].bodyKey && (e.name || e.bodyKey) === (toks[0].name || toks[0].bodyKey));
  const grouped = {
    ...hottest,
    id: target.id,
    name: homogeneous ? `${toks[0].name || toks[0].bodyKey} ×${n}` : `${n} summons`,
    hp: toks.reduce((sum, e) => sum + Math.max(0, e.hp || 0), 0),
    maxHp: toks.reduce((sum, e) => sum + Math.max(0, e.maxHp || 0), 0),
  };
  const groupX = colX + 6, groupW = Math.max(52, colW - 12), groupY = Math.max(topBound + detailH / 2, bottomY - detailH / 2 - 2);
  drawFoeSummonTacticalChip(grouped, groupX, groupY, groupW, !!aimed, null, detailH);
  return bottomY - detailH - 4;

}

// A SUMMON rendered PLAYER-SIZED (owner 2026-06-27): a full circle + nameplate + a passive/stat line,
// the SAME footprint as a hero or foe body — so a Hedgefund Knight shows the card it casts, a totem
// its aura, and a rat-stack its live "N rats". `a` is the ally/enemy snapshot. The capped coin cluster
// (drawFoeTokenCluster) still handles overflow swarms.
// SIDE (owner 2026-07-11): `isFoe` renders the FOE variant at TRUE 1:1 with the player's — same name /
// HP-plate / cast-feed / passive footprint, only the SIDE-specific bits change: a foe ring, a
// tap-to-TARGET box (foeBoxes, not the friendly heal-aim heroBoxes), no friendly blocker arc/🛡, and a
// cyan pinned-TARGET ring (not the green heal-aim ring). `myAllyTarget` carries the foe target id on
// that side. FLAG (owner, art): foe ring #d2683f (matches the foe coin cluster); ✦ kept on both sides.
// Live renderer for friendly summons and readable hostile summons.
function drawSummonBody(a, px, py, isFront, laneIdx, myAllyTarget, topGuard, isFoe = false, incoming = false) {
  const R = IS_TOUCH ? 30 : 33;                              // = R_HERO: player-sized (grown w/ the hero, icons +30% 2026-07-10; 24/26→30/33)
  // A solo phone lane is hundreds of pixels wide. Spend that room on readable unit telemetry while
  // preserving the compact plates used by genuinely crowded multiplayer lanes.
  const spacious = IS_TOUCH && laneW(laneIdx) >= 260;
  const aura = !!a.aura;
  const col = aura ? "#ffd24a" : isFoe ? "#d2683f" : (a.color || "#3ec98a");   // FLAG: foe ring #d2683f (= drawFoeTokenCluster)
  // TARGET HITBOX: a PLAYER summon is heal-aimable — `ally:true` routes the click to allyTarget (never
  // possess — a summon isn't yours to pilot); the engine's allyTargetOf lands heals on this token id.
  // A FOE summon is tap-to-TARGET like any other foe — pushed to foeBoxes as a rect (carrying `e` so
  // hold-to-inspect works), exactly the grammar drawFoeTokenCluster/drawFoeRow use. Same footprint.
  if (a.id != null) {
    if (isFoe) foeBoxes.push({ x: px - (R + 6), y: py - (R + 6), w: (R + 6) * 2, h: (R + 6) * 2, id: a.id, e: a });
    else heroBoxes.push({ x: px, y: py, r: R + 6, id: a.id, ally: true });
  }
  // pinned-target ring (dashes): green heal-aim for a teammate summon, cyan #3df TARGET ring for a foe
  // summon — the same cyan a targeted foe coin/row gets (drawFoeTokenCluster).
  if (a.id != null && a.id === myAllyTarget) { ctx.beginPath(); ctx.arc(px, py, R + 6, 0, Math.PI * 2); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = isFoe ? "#3df" : "#74e69a"; ctx.stroke(); ctx.setLineDash([]); }
  if (incoming && !isFoe) { ctx.beginPath(); ctx.arc(px, py, R + 4, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = "#ff4b45"; ctx.stroke(); }
  // name above the circle — a ✦ prefix marks it a SUMMON at a glance (owner 2026-06-29: never read as a hero).
  // CLAMPED (owner 2026-07-10 pile-up fix): topGuard = the lowest y a print ABOVE this coin reaches (the
  // foe stack for a front summon, or the body/summon stacked above it). The label parks just under that
  // guard when the slot is tight, so it can never ride up into the foe row or a felled body's DOWN pill.
  // A dark backing keeps it legible on the frames where it lands near the coin's top rim.
  ctx.font = `${spacious ? 15 : 13}px ui-monospace, monospace`;
  const _nm = `✦ ${a.name || "Summon"}`;
  // On the short touch board the label rides the top of the portrait; drawing it after the art keeps
  // it readable without spending the scarce gap above the coin (where a boss add row may sit).
  const _natY = py - R + (IS_TOUCH ? 8 : -3), _nameY = Math.max(_natY, (topGuard ?? -Infinity) + 12);
  const _nameMax = Math.min(spacious ? 154 : 112, Math.max(54, laneW(laneIdx) - 10));
  // front blocker accent (cyan shield arc on the foe-facing side) — friendly-only; a foe summon has
  // no friendly blocker styling (matches the foe coin cluster / foe rows, which draw no blocker arc)
  if (isFront && !isFoe) { ctx.beginPath(); ctx.arc(px, py, R + 3, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 3; ctx.strokeStyle = "#5cc6ff"; ctx.stroke(); }
  // the body circle — a DASHED ring (green; gold for aura tokens) reads "conjured", visually distinct
  // from a hero's SOLID ring + 👑, so a summon can never be mistaken for a player (owner 2026-06-29)
  ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2);
  ctx.fillStyle = "#0c130f"; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
  const spr = foeSprite(formArt(a));
  if (spr.complete && spr.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(px, py, R - 1, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(spr, px - R + 2, py - R + 2, (R - 2) * 2, (R - 2) * 2); ctx.restore(); }
  else { ctx.font = (R + 2) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(a.bodyKey), px, py + 1); }
  if (isFront && !isFoe) { ctx.font = "11px serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("\u{1F6E1}", laneX(laneIdx) + 4, py); }
  // Paint the label after the portrait. The prior touch-only y sat inside the coin and then the coin
  // was drawn over it, producing the broken "✦ ...ts" rat labels seen in live co-op.
  ctx.font = `${spacious ? 15 : 13}px ui-monospace, monospace`;
  if (_nameY !== _natY || IS_TOUCH) { const tw = Math.min(_nameMax, ctx.measureText(_nm).width); ctx.fillStyle = "#0a0d12e6"; roundRect(px - tw / 2 - 4, _nameY - (spacious ? 17 : 15), tw + 8, spacious ? 20 : 17, 4); ctx.fill(); }
  ctx.fillStyle = aura ? "#ffe9a8" : "#cfeede";
  fitText(_nm, px, _nameY, _nameMax, spacious ? 15 : 13, 10, "center", "bottom");
  // nameplate chip: HP fill behind ❤ hp/max (+ a cyan shield cap), like a hero
  const npW = spacious ? 112 : 86, npH = spacious ? 22 : 20, npX = px - npW / 2, npY = py + R + 4;
  const hpFrac = Math.max(0, a.hp / Math.max(1, a.maxHp));
  ctx.fillStyle = "#11151d"; roundRect(npX, npY, npW, npH, 6); ctx.fill();
  ctx.save(); roundRect(npX, npY, npW, npH, 6); ctx.clip();
  ctx.fillStyle = hpFrac > 0.4 ? "#2f6b3a" : "#7a2f2f"; ctx.fillRect(npX, npY, npW * hpFrac, npH);
  if (a.shield > 0) { const capW = Math.min(npW * 0.42, 10 + String(a.shield).length * 8); ctx.fillStyle = "#1c4a63"; ctx.fillRect(npX + npW - capW, npY, capW, npH); }
  ctx.restore();
  ctx.lineWidth = 1; ctx.strokeStyle = aura ? "#caa84a" : "#39404d"; roundRect(npX, npY, npW, npH, 6); ctx.stroke();
  ctx.font = `bold ${spacious ? 14 : 12}px ui-monospace, monospace`; ctx.textBaseline = "middle";
  if (a.shield > 0) {
    ctx.fillStyle = "#eef3f8"; ctx.textAlign = "left"; ctx.fillText(`❤${a.hp}/${a.maxHp}`, npX + 5, npY + npH / 2 + 0.5);
    ctx.fillStyle = "#bfe9ff"; ctx.textAlign = "right"; ctx.fillText(`\u{1F6E1}${a.shield}`, npX + npW - 4, npY + npH / 2 + 0.5);
  } else { ctx.fillStyle = "#eef3f8"; ctx.textAlign = "center"; ctx.fillText(`❤ ${a.hp}/${a.maxHp}`, px, npY + npH / 2 + 0.5); }
  // CAST FEED: the front card it's banking toward, drawn like a foe's cast chip — a track filled by
  // castFrac ("how soon"), ⚡moxie/cost + card name on the left, live damage on the right (owner 2026-06-29:
  // summons now show WHAT they play and WHEN, like foes). Kept ~1 line tall so deep stacks don't clip.
  let ly = npY + npH + 3;
  const q = (a.queue || [])[0];
  if (q) {
    const chH = spacious ? 16 : 13, f = Math.max(0.04, Math.min(1, a.castFrac ?? 0));
    ctx.fillStyle = "#0a0d12"; roundRect(npX, ly, npW, chH, 3); ctx.fill();                 // track
    ctx.save(); roundRect(npX, ly, npW, chH, 3); ctx.clip();
    ctx.fillStyle = (q.color || "#ffb27a") + "cc"; ctx.fillRect(npX, ly, npW * f, chH); ctx.restore();
    ctx.lineWidth = 1; ctx.strokeStyle = "#ffffff66"; roundRect(npX + 0.5, ly + 0.5, npW - 1, chH - 1, 3); ctx.stroke();
    const dlbl = q.dmgNow || q.dmg || "";
    ctx.font = `bold ${spacious ? 12 : 10}px ui-monospace, monospace`;
    const dmgReserve = dlbl ? ctx.measureText(dlbl).width + 7 : 0;
    ctx.fillStyle = "#fff";
    fitText(`⚡${a.moxie ?? 0}/${q.cost} ${q.name}`, npX + 4, ly + chH / 2 + 0.5,
      npW - 8 - dmgReserve, spacious ? 11 : 9, 8, "left", "middle");
    if (dlbl) { ctx.textAlign = "right"; ctx.fillStyle = "#ffd2a8"; ctx.font = `bold ${spacious ? 12 : 10}px ui-monospace, monospace`; ctx.fillText(dlbl, npX + npW - 3, ly + chH / 2 + 0.5); }
    ly += chH + 1;
  } else if ((a.threats || []).length) {
    // TIMER summons (Large Rat / aura-Knight strike clocks): the SAME chip grammar as the cast
    // feed — label + fill + −dmg — instead of the old naked 4px bar (owner 2026-07-07: every
    // friendly summon shows WHAT it plays and WHEN, timer-casters included).
    const t = a.threats[0], chH = spacious ? 16 : 13, f = Math.max(0.04, Math.min(1, t.frac || 0));
    ctx.fillStyle = "#0a0d12"; roundRect(npX, ly, npW, chH, 3); ctx.fill();
    ctx.save(); roundRect(npX, ly, npW, chH, 3); ctx.clip();
    ctx.fillStyle = (t.color || "#ff9ed2") + "cc"; ctx.fillRect(npX, ly, npW * f, chH); ctx.restore();
    ctx.lineWidth = 1; ctx.strokeStyle = "#ffffff66"; roundRect(npX + 0.5, ly + 0.5, npW - 1, chH - 1, 3); ctx.stroke();
    const lbl = t.label || "attack";
    const dmgLabel = t.dmg > 0 ? `−${t.dmg}` : "";
    ctx.font = `bold ${spacious ? 12 : 10}px ui-monospace, monospace`;
    const dmgReserve = dmgLabel ? ctx.measureText(dmgLabel).width + 7 : 0;
    ctx.fillStyle = "#fff";
    fitText(lbl, npX + 4, ly + chH / 2 + 0.5, npW - 8 - dmgReserve, spacious ? 11 : 9, 8, "left", "middle");
    if (dmgLabel) { ctx.textAlign = "right"; ctx.fillStyle = "#ffd2a8"; ctx.font = `bold ${spacious ? 12 : 10}px ui-monospace, monospace`; ctx.fillText(dmgLabel, npX + npW - 3, ly + chH / 2 + 0.5); }
    ly += chH + 1;
  }
  // ACTIVE-EFFECT CHIPS (owner 2026-07-10 "read like a body"): the summon's buffs/DoTs/regens as the
  // SAME icon+countdown-ring chips foes and players show — centered under the cast feed, only when it
  // actually carries effects (so a plain conjure adds no row). Hover/tap for detail (drawEffectTooltip).
  const summonStatuses = entityStatus(a, 5);
  if (summonStatuses.length) {
    const effs = summonStatuses;
    const _r = 6 + (IS_TOUCH ? 4 : 0);
    drawCenteredEffectChips(px, ly + _r + 1, effs, false, 5);
    ly += _r * 2 + 4;
  }
  // the passive text, clipped — shown for the readable FRONT card on desktop (collisions otherwise)
  if (a.passive && isFront && !IS_TOUCH) {
    ctx.font = "9px ui-monospace, monospace"; ctx.fillStyle = "#9fb0c0"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(a.passive.length > 34 ? a.passive.slice(0, 33) + "…" : a.passive, px, ly);
  }
}

// COMPACT TEAMMATE ROW (crowd mode, owner picked D 2026-07-07): a hero in a crowded lane, in the
// exact depth slot the full circle would hold — small body-colored icon ring (dashed-gold overlay
// when it's YOUR body on AUTO), name, the nameplate shrunk to one HP bar (❤n/n + 🛡 cap), and a
// The full row gets a red border when targeted; no attacker portraits or reserved dead width.
// The possessed body normally keeps the full ring; the explicit 1-player + 3-summon phone grid
// routes it here too so all four friendly bodies share one stable, non-overlapping row grammar.
function drawHeroCompact(p, laneIdx, py, h, isFront, myAllyTarget, incoming = false,
  xCenter = null, width = null, gridTarget = false) {
  const rw = width ?? Math.min(laneW(laneIdx) - 12, 252);
  const x0 = (xCenter ?? colCenter(laneIdx)) - rw / 2;
  const owned = isMine(p);                        // yours-on-AUTO (tap to pilot); teammates plain
  const col = state?.bodies?.[p.bodyKey]?.color ?? "#68a";
  const r = Math.max(9, Math.min(12, Math.floor(h / 2)));
  const cx = x0 + r + 2;
  ctx.globalAlpha = p.alive ? 1 : 0.3;
  ctx.fillStyle = "#10151f"; roundRect(x0, py - h / 2, rw, h, 5); ctx.fill();
  ctx.lineWidth = owned ? 1.5 : 1; ctx.strokeStyle = owned ? "#b99a43" : "#39404d";
  roundRect(x0 + 0.5, py - h / 2 + 0.5, rw - 1, h - 1, 5); ctx.stroke();
  if (incoming && p.alive) {
    ctx.save(); ctx.globalAlpha = 0.72 + 0.22 * (0.5 + 0.5 * Math.sin((state?.tick ?? 0) * 0.4));
    ctx.lineWidth = 2; ctx.strokeStyle = "#ff4b45";
    roundRect(x0 - 2, py - h / 2 - 1, rw + 4, h + 2, 5); ctx.stroke(); ctx.restore();
  }
  if (owned && p.alive) { ctx.beginPath(); ctx.arc(cx, py, r + 3, 0, Math.PI * 2); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = "#caa84a"; ctx.stroke(); ctx.setLineDash([]); }
  if (p.id === myAllyTarget) { ctx.beginPath(); ctx.arc(cx, py, r + 6, 0, Math.PI * 2); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = "#74e69a"; ctx.stroke(); ctx.setLineDash([]); }
  if (isFront && p.alive) { ctx.beginPath(); ctx.arc(cx, py, r + 3, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 2.5; ctx.strokeStyle = "#5cc6ff"; ctx.stroke(); }
  ctx.beginPath(); ctx.arc(cx, py, r, 0, Math.PI * 2);
  ctx.fillStyle = "#0c0f15"; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
  const spr = foeSprite(formArt(p));
  if (spr.complete && spr.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(cx, py, r - 1, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(spr, cx - r + 1, py - r + 1, (r - 1) * 2, (r - 1) * 2); ctx.restore(); }
  else { ctx.font = (r + 3) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(p.bodyKey), cx, py + 1); }
  // right side: HP bar; removing the portrait strip gives its width back to name and health.
  const barH = Math.max(11, Math.min(15, h - 5)), barW = Math.min(88, Math.round(rw * 0.36));
  const barX = x0 + rw - barW - 4, barY = py - barH / 2;
  let nameX = cx + r + 6;
  const intent = p.id !== activeId && p.alive ? p.intentCard : null;
  if (intent && barX - nameX > 38) {
    const sz = Math.max(12, Math.min(20, h - 4)), art = cardSprite(intent.key);
    ctx.fillStyle = "#090c12"; ctx.strokeStyle = intent.mode === "auto" ? "#5cc6ff"
      : intent.mode === "plan" ? "#c9a7ff" : "#74e69a";
    ctx.lineWidth = 1.5; roundRect(nameX, py - sz / 2, sz, sz, 4); ctx.fill(); ctx.stroke();
    if (art?.complete && art.naturalWidth) ctx.drawImage(art, nameX + 1, py - sz / 2 + 1, sz - 2, sz - 2);
    nameX += sz + 4;
  }
  // Crowd mode still owes the player a live timer signal. Seat the nearest timed effect between
  // name and HP (falling back to the first steady effect) instead of dropping every chip when the
  // full hero card compacts. The shared chip painter keeps the Starblade-style countdown ring.
  let nameR = barX - 6;
  const compactEffects = entityStatus(p, 4);
  const compactEffect = p.alive
    ? (compactEffects.find((e) => e.left != null && e.dur) || compactEffects[0])
    : null;
  if (compactEffect && h >= 15 && nameR - nameX > 46) {
    const er = Math.min(Math.max(6, Math.round(Math.min(11, h - 4) * 0.7)), Math.floor(h / 2) - 1);
    drawEffectChipAt(nameR - er, py, er, compactEffect);
    nameR -= er * 2 + 4;
  }
  ctx.fillStyle = owned ? "#d9c98a" : "#cfd3dc";
  const intentPrefix = intent ? (intent.mode === "auto" ? "AUTO" : intent.mode === "plan" ? "PLAN" : "Q") + ` ${intent.name} · ` : "";
  const compactName = !p.alive && p.downCause?.label ? `${p.name} · ${p.downCause.label}`
    : intentPrefix + (owned ? `YOU · ${p.name}` : p.name);
  fitText(compactName, nameX, py, Math.max(24, nameR - nameX), Math.min(12, Math.max(9, h - 8)), 8, "left", "middle");
  const hpFrac = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = "#11151d"; roundRect(barX, barY, barW, barH, 4); ctx.fill();
  ctx.save(); roundRect(barX, barY, barW, barH, 4); ctx.clip();
  ctx.fillStyle = hpFrac > 0.4 ? "#2f6b3a" : "#7a2f2f"; ctx.fillRect(barX, barY, barW * hpFrac, barH);
  if (p.shield > 0) { const capW = Math.min(barW * 0.4, 8 + String(p.shield).length * 7); ctx.fillStyle = "#1c4a63"; ctx.fillRect(barX + barW - capW, barY, capW, barH); }
  ctx.restore();
  ctx.lineWidth = 1; ctx.strokeStyle = owned ? "#8a7a3a" : "#39404d"; roundRect(barX, barY, barW, barH, 4); ctx.stroke();
  const fs2 = Math.max(8, Math.min(11, barH - 3));
  ctx.font = `bold ${fs2}px ui-monospace, monospace`; ctx.textBaseline = "middle";
  if (p.shield > 0) {
    const shieldText = `🛡${p.shield}`;
    const shieldW = Math.min(Math.max(18, ctx.measureText(shieldText).width + 4), barW * 0.42);
    ctx.fillStyle = "#eef3f8";
    fitText(`❤${p.hp}/${p.maxHp}`, barX + 3, py + 0.5,
      Math.max(16, barW - shieldW - 7), fs2, 7, "left", "middle");
    ctx.fillStyle = "#bfe9ff";
    fitText(shieldText, barX + barW - 3, py + 0.5,
      Math.max(14, shieldW), fs2, 7, "right", "middle");
  } else { ctx.fillStyle = "#eef3f8"; ctx.textAlign = "center"; ctx.fillText(`❤${p.hp}/${p.maxHp}`, barX + barW / 2, py + 0.5); }
  if (!p.alive) { ctx.fillStyle = "#e66"; ctx.textAlign = "left"; ctx.font = "bold 9px ui-monospace, monospace"; ctx.fillText("DOWN", barX + barW + 4, py + 0.5); }
  else if (p.offline) { ctx.fillStyle = "#e6a23c"; ctx.textAlign = "left"; ctx.font = "bold 9px ui-monospace, monospace"; ctx.fillText("OFFLINE", barX + barW + 4, py + 0.5); }
  ctx.globalAlpha = 1;
  if (isFront) { ctx.font = "11px serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("🛡", laneX(laneIdx) + 4, py); }
  // Normal compact teammates keep the icon circle. The 2×2 phone grid uses its whole 44px cell so
  // shrinking the portrait never shrinks the player's reliable tap surface.
  if (gridTarget) heroBoxes.push({ x: x0, y: py - SUMMON_CHIP_HIT_H / 2,
    w: rw, h: SUMMON_CHIP_HIT_H, id: p.id });
  else heroBoxes.push({ x: cx, y: py, r: Math.max(16, r + 6), id: p.id });
}

// ONE-LINE FOE MINI (crowd mode, owner picked D 2026-07-07): a triaged-out foe in its exact depth
// slot — rarity sliver, real SVG icon, name, ❤HP, and the slim next-cast chip (cost + fill + −dmg,
// the standard drawFoeQueue grammar). Pushed to foeBoxes by the caller, so tap-to-target and
// hold-to-inspect keep working at every size.
function drawFoeMini(x, y, w, h, e, b, targeted, throb) {
  const frac = e.threat ? e.threat.frac : 0;
  const charging = e.aoe && frac > 0.66;
  ctx.fillStyle = "#12161e"; roundRect(x, y, w, h, 5); ctx.fill();
  ctx.save(); roundRect(x, y, w, h, 5); ctx.clip();
  ctx.fillStyle = (b.color || "#39404d") + "1a"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = e.boss ? "#ffd24a" : ((b.gold ?? 0) >= 5 ? "#ffd24a" : (b.gold ?? 0) >= 3 ? "#4aa3ff" : (b.gold ?? 0) >= 1 ? "#7c8696" : "#39404d");
  ctx.fillRect(x, y, 3, h);
  ctx.restore();
  ctx.lineWidth = 1;
  ctx.strokeStyle = charging ? `rgba(255,${Math.round(60 + 40 * throb)},60,1)` : frac > 0.75 ? "#f55" : "#2a2f38";
  roundRect(x, y, w, h, 5); ctx.stroke();
  // cyan target rides INSIDE the heat border so it never hides the red charge state (owner 2026-07-12)
  if (targeted) { ctx.lineWidth = 1.5; ctx.strokeStyle = "#3df"; roundRect(x + 1.5, y + 1.5, w - 3, h - 3, 4); ctx.stroke(); }
  const iconSz = Math.max(8, h - 4);
  const spr = foeSprite(formArt(e));
  if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, x + 6, y + (h - iconSz) / 2, iconSz, iconSz);
  else { ctx.font = `${iconSz}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(e.bodyKey), x + 6 + iconSz / 2, y + h / 2); }
  const chipW = Math.min(Math.round(w * 0.42), 132);
  const chipH = Math.max(8, h - 4), chipX = x + w - chipW - 5, chipY = y + (h - chipH) / 2;
  if (e.queue?.length) drawFoeQueue(chipX, chipY, chipW, chipH, e, true, 1, 0);
  const fs = Math.max(8, Math.min(11, h - 4));
  const hasBar = h >= 13;                                   // a proportion bar only seats on a tall-enough mini
  const tcy = y + h / 2 + 0.5 - (hasBar ? Math.round(h * 0.12) : 0);   // lift text a hair to clear the underline bar
  ctx.font = `bold ${fs}px ui-monospace, monospace`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
  const hpL = `❤${e.hp}`, hpX = chipX - 6;
  const hpW = ctx.measureText(hpL).width;
  ctx.fillStyle = "#9bf09b"; ctx.fillText(hpL, hpX, tcy);
  const nx = x + 6 + iconSz + 5;
  // one active-effect glyph (its most-recent buff/DoT) when the row seats it — a hover/tap hitbox like
  // the full row's chips; the headliner rows (drawFoeRow) show the complete set.
  let nameR = hpX - hpW - 6;
  const eff0 = entityStatus(e, 4)[0];
  if (eff0 && h >= 15 && nameR - nx > 46) {
    // a real disc+ring chip now (owner 7/11) — was a bare glyph inheriting whatever fillStyle was live
    const gr = Math.min(Math.max(6, Math.round(fs * 0.7)), Math.floor(h / 2) - 1);
    const gcx = nameR - gr, gcy = y + h / 2;
    drawEffectChipAt(gcx, gcy, gr, eff0);
    nameR -= gr * 2 + 4;
  }
  ctx.fillStyle = "#dfe4ec";
  fitText(e.name || b.name || e.bodyKey, nx, tcy, Math.max(20, nameR - nx), fs, 7, "left", "middle");
  // HP BAR (owner 2026-07-10 "read like a body"): a slim proportion bar underlining the name→HP span,
  // with a cyan shield cap — so even the tiniest crowd mini shows HP as a bar, not just the ❤n number.
  if (hasBar) {
    const bH = Math.max(2, Math.round(h * 0.16)), bY = y + h - bH - 1, bX = nx, bW = hpX + 2 - nx;
    if (bW > 12) {
      const hf = Math.max(0, e.hp / Math.max(1, e.maxHp));
      bar(bX, bY, bW, bH, hf, hf > 0.4 ? "#2f9b4a" : "#c0453a", "#0a0d12");
      if (e.shield > 0) { const capW = Math.min(bW * 0.4, 5 + String(e.shield).length * 4); ctx.fillStyle = "#1c4a63"; ctx.fillRect(bX + bW - capW, bY, capW, bH); }
    }
  }
}

// Universal combat overview: every foe gets one equal-priority tactical row. The row grows when a
// lane is sparse and compresses only when entity count demands it; no foe disappears and no passive
// paragraph is repeated on the battlefield. Full prose/deck detail remains in drawFoeInspect().
function drawFoeTacticalLane(laneIdx, stackBottom, topBound, foes, myTarget, throb, bodies) {
  if (!foes.length) return 0;
  const gap = IS_TOUCH ? 3 : 5;
  const avail = Math.max(1, stackBottom - topBound);
  const usableLaneW = laneW(laneIdx);
  const innerLaneW = Math.max(1, usableLaneW - 14);
  // NARROW LANES SPEND HEIGHT ON WIDTH (owner 2026-07-24): at 3–4 lanes the row was capped at 70px
  // and a large empty band sat above it while the card starved sideways. A narrow card stacks its
  // bands (drawFoeRowStacked), so let it grow into that band — the telegraph and the name both come
  // back. WIDE lanes (solo / 2-lane) have the MOST room, yet were capped LOWEST (70px) — owner
  // 2026-07-27: "the foes could be bigger, look how much space there is." Raised to match the narrow
  // ideal so a few-foe wide fight fills its band instead of floating small in dead space; the
  // `rowH = min(idealMax, avail/rows)` divide still keeps a single foe from ballooning to the whole board.
  // FLAG (owner to tune): the wide-lane ideal is mine.
  const idealMax = innerLaneW <= FOE_STACK_MAX_W ? FOE_STACK_IDEAL_H : (IS_TOUCH ? 104 : 92);
  const min = IS_TOUCH ? 28 : 30;
  const readable = IS_TOUCH ? 40 : 38;
  let cols = 1;
  let rows = foes.length;
  let rowH = Math.min(idealMax, Math.floor((avail - (rows - 1) * gap) / rows));
  // Landscape phones are wide but short. When a vertical stack would crush tactical rows, spend
  // that unused width on a small grid. This keeps the body, HP, bonuses, and next card attached at
  // a readable height instead of shrinking two-to-five foes into overlapping 24px strips.
  if (rowH < readable) {
    const minCardW = IS_TOUCH ? 220 : 250;
    const maxCols = Math.max(1, Math.min(foes.length, Math.floor((innerLaneW + gap) / (minCardW + gap))));
    for (let c = 2; c <= maxCols; c++) {
      const rr = Math.ceil(foes.length / c);
      const hh = Math.min(idealMax, Math.floor((avail - (rr - 1) * gap) / rr));
      if (hh >= readable) { cols = c; rows = rr; rowH = hh; break; }
      if (hh > rowH) { cols = c; rows = rr; rowH = hh; }
    }
  }
  // DENSE FALLBACK (owner 2026-07-24 "foes go off screen"). This used to hand the crowd solver
  // keep=ALL, so a starved lane squeezed every FULL row — and the wide strip's bands (name along the
  // top, stat line along the bottom, cast chip between them) physically collide below ~24px, which
  // is how a boss lane ended up with rows nothing could be read off. drawFoeMini is DESIGNED as one
  // line and stays readable down to FOE_MINI_H, so buy as many FULL rows as the band can genuinely
  // afford — front blocker, then whoever casts soonest, then your pinned target, then front→back —
  // and give every remaining body an honest mini instead of a squeezed pretence. Either way each
  // body keeps its own row, its own hitbox, and its own telegraph.
  if (rowH < min && cols === 1) {
    const n = foes.length, g = IS_TOUCH ? 3 : 5;
    const rank = [];
    const rankPush = (e) => { if (e && !rank.includes(e)) rank.push(e); };
    rankPush(foes[0]);
    rankPush(foes.reduce((a, e) => ((e.castFrac ?? 0) > (a.castFrac ?? 0) ? e : a), foes[0]));
    rankPush(foes.find((e) => e.id === myTarget));
    foes.forEach(rankPush);
    let fulls = 0;
    while (fulls < n
      && (fulls + 1) * FOE_FULL_MIN + (n - fulls - 1) * FOE_MINI_H + (n - 1) * g <= avail) fulls++;
    return drawFoeCrowdLane(laneIdx, stackBottom, topBound, foes,
      { crowd: true, keep: new Set(rank.slice(0, fulls).map((e) => e.id)), minH: 0 },
      myTarget, throb, bodies);
  }
  const cardW = Math.min(500, Math.floor((innerLaneW - (cols - 1) * gap) / cols));
  let alarm = 0;
  foes.forEach((e, idx) => {
    const row = Math.floor(idx / cols), col = idx % cols;
    const inRow = Math.min(cols, foes.length - row * cols);
    const rowW = inRow * cardW + (inRow - 1) * gap;
    const x = laneX(laneIdx) + (usableLaneW - rowW) / 2 + col * (cardW + gap);
    const yRaw = stackBottom - rowH - row * (rowH + gap);
    const tween = twPos("f:" + e.id, x, yRaw);
    const pos = { x: tween.x, y: Math.max(tween.y, topBound) };
    foeBoxes.push({ x: pos.x, y: pos.y, w: cardW, h: rowH, id: e.id, e });
    const frac = e.threat?.frac ?? 0;
    if (e.aoe && frac > 0.66) alarm = Math.max(alarm, frac);
    drawFoeRow(pos.x, pos.y, cardW, rowH, e, bodies[e.bodyKey] || {}, e.id === myTarget, throb);
  });
  return alarm;
}

// CROWD-LANE FOE STACK (owner picked D, 2026-07-07): both platforms route here when a lane holds
// more than CROWD_SLOTS queue-foes. plan.keep (front / casting-next / your target) get full rows
// (drawFoeRow, fonts riding rowH); everyone else gets a one-line mini in its depth slot. Heights are
// solved so the WHOLE stack fits stackBottom→topBound — floors first, then a proportional squeeze as
// the last resort — so a foe can never clip off the top of the board again. Returns the strongest
// imminent-AoE fraction so render()'s board-wide alarm still fires.
function drawFoeCrowdLane(laneIdx, stackBottom, topBound, realFoes, plan, myTarget, throb, bodies) {
  const n = realFoes.length;
  if (!n) return 0;
  let alarm = 0;
  const fulls = plan.keep.size, minis = n - fulls;
  let fullH = FOE_FULL_H, miniH = FOE_MINI_H, gap = 3;
  const avail = Math.max(1, stackBottom - topBound);
  const need = () => fulls * fullH + minis * miniH + (n - 1) * gap;
  if (need() > avail && fulls) fullH = Math.max(FOE_FULL_MIN, Math.floor((avail - minis * miniH - (n - 1) * gap) / fulls));
  if (need() > avail && minis) miniH = Math.max(FOE_MINI_MIN, Math.floor((avail - fulls * fullH - (n - 1) * gap) / minis));
  if (need() > avail) {                       // extreme case: fit is mathematical, never clipped
    gap = avail > n ? 1 : 0;
    const content = Math.max(1, avail - (n - 1) * gap);
    const k = content / Math.max(1, fulls * fullH + minis * miniH);
    fullH = Math.max(1, Math.floor(fullH * k));
    miniH = Math.max(1, Math.floor(miniH * k));
  }
  const cardW = Math.min(460, Math.round((laneW(laneIdx) - 14) * 0.97));
  const rx = laneX(laneIdx) + (laneW(laneIdx) - cardW) / 2;
  let bottom = stackBottom;
  realFoes.forEach((e) => {
    const b = bodies[e.bodyKey] || {};
    const full = plan.keep.has(e.id);
    const rowH = full ? fullH : miniH;
    const ryRaw = bottom - rowH;
    bottom = ryRaw - gap;                     // the next (deeper) row stacks above (layout stays raw)
    const _tween = twPos("f:" + e.id, rx, ryRaw); // RENDER INTERPOLATION: the row glides to its new slot
    const _tf = { x: _tween.x, y: Math.max(_tween.y, topBound) }; // never tween across boss telemetry
    foeBoxes.push({ x: _tf.x, y: _tf.y, w: cardW, h: rowH, id: e.id, e });
    const targeted = e.id && e.id === myTarget;
    const frac = e.threat ? e.threat.frac : 0;
    if (e.aoe && frac > 0.66) alarm = Math.max(alarm, frac);
    if (full) drawFoeRow(_tf.x, _tf.y, cardW, rowH, e, b, targeted, throb);
    else drawFoeMini(_tf.x, _tf.y, cardW, rowH, e, b, targeted, throb);
  });
  return alarm;
}

// A boss is a command deck, not a bundle of micro-bars. Identity and the persistent rule stay fixed;
// every live action gets a bounded tile with an action name, explicit outcome/scope, and countdown.
// This same panel is used for the lane-bound Djinn through snapshot.bossUi.
function drawBossIntentTile(x, y, w, h, threat, order) {
  const compact = IS_TOUCH && h <= 34;
  const frac = Math.max(0, Math.min(1, threat.frac || 0));
  const seconds = foeThreatSeconds(threat);
  const imminent = seconds <= 2;
  const color = threat.color || (threat.harm ? "#d45b64" : "#6687a8");
  ctx.fillStyle = threat.harm ? "#271619" : "#131a22"; roundRect(x, y, w, h, 6); ctx.fill();
  ctx.save(); roundRect(x, y, w, h, 6); ctx.clip();
  ctx.globalAlpha = 0.32; ctx.fillStyle = color; ctx.fillRect(x, y, Math.max(4, w * frac), h); ctx.restore();
  ctx.lineWidth = imminent ? 2 : 1; ctx.strokeStyle = imminent ? "#ff736b" : "#ffffff35";
  roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.stroke();

  const time = frac >= 1 ? "NOW" : `${seconds.toFixed(1)}s`;
  ctx.font = `bold ${compact ? 12 : IS_TOUCH ? 15 : 14}px ui-monospace, monospace`;
  const timeW = ctx.measureText(time).width + 12;
  ctx.fillStyle = imminent ? "#5b2022" : "#0a0e14";
  const timeH = compact ? 15 : IS_TOUCH ? 18 : 19;
  roundRect(x + w - timeW - 5, y + 3, timeW, timeH, 5); ctx.fill();
  ctx.fillStyle = imminent ? "#fff0e8" : "#f3f6fa"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(time, x + w - timeW / 2 - 5, y + 3 + timeH / 2);

  const lane = threat.lane != null ? `LANE ${Number(threat.lane) + 1}` : "";
  const scope = lane || foeScopeLabel(threat.scope);
  const actionLabel = (threat.label || "BOSS ACTION").replace(/^Power Word:\s*/i, "");
  const title = `${order === 0 ? "NEXT" : "ALSO"} · ${actionLabel}`;
  ctx.fillStyle = order === 0 ? "#ffe38a" : "#eef2f7";
  fitText(title, x + 7, y + 3, Math.max(24, w - timeW - 20), compact ? 12 : IS_TOUCH ? 15 : 14, compact ? 9 : 11, "left", "top");
  let intent = threat.intent || (threat.dmg > 0 ? `HIT FOR ${threat.dmg}` : actionLabel);
  if (threat.lane != null) intent = intent.replace(new RegExp(`^Lane\\s+${Number(threat.lane) + 1}(?::|\\s+)\\s*`, "i"), "");
  if (threat.scope === "all-lanes") intent = intent.replace(/^Every lane\s+/i, "");
  if (threat.scope === "highest") intent = intent.replace(/^Highest-HP hero\s+/i, "");
  intent = intent.replace(/\s+damage$/i, "");
  const outcome = [scope, intent]
    .filter(Boolean).join(" · ");
  ctx.fillStyle = "#f4f6fa";
  fitText(outcome, x + 7, y + h - (compact ? 4 : 6), w - 14, compact ? 11 : IS_TOUCH ? 14 : 13, compact ? 8 : 10, "left", "bottom");
}

function drawBossBanner(boss, myTarget, throb) {
  const bars = (boss.threats || [])
    .filter((threat) => !(boss.stanceClock && threat.kind === "clock" && /stance/i.test(threat.label || "")))
    .sort((a, b) => foeThreatSeconds(a) - foeThreatSeconds(b));
  const effects = entityStatus(boss, 8);
  // THE FOLD (owner 2026-07-24): at 3–4 lanes on a phone the deck below is worth more than every
  // foe in the room, so it collapses to one rail and the prose moves into the hold inspector.
  if (IS_TOUCH && H <= 430 && COLS >= BOSS_RAIL_COLS) return drawBossRail(boss, bars, effects, myTarget);
  _bossBannerGap = 6;
  const coreRule = (boss.passive || "").match(/^[^.?!]+[.?!]?/)?.[0] || "";
  // A 393px-tall phone cannot hold a desktop-height command deck plus two party lanes. Compact the
  // same information into one command rail: stance replaces the redundant static Lich rule, four
  // concurrent actions may share one row, and active effects live in the identity line.
  const shortTouch = IS_TOUCH && H <= 430;
  const bx = 6, bw = W - 12, by = 6, headH = shortTouch ? 26 : 30, hpH = shortTouch ? 8 : 12;
  // The King's current action tile already explains the active mode. Reprinting his entire
  // five-mode catalog on a short phone stole the only readable row from the court below it.
  const showCoreRule = !!coreRule && !(shortTouch
    && (boss.stanceLabel || boss.bodyKey === "djinn"));
  const ruleStep = showCoreRule ? (shortTouch ? 16 : 18) : 0;
  const stanceStep = boss.stanceLabel ? (shortTouch ? 18 : 20) : 0;
  const actionH = shortTouch ? 32 : IS_TOUCH ? 38 : 40, actionGap = shortTouch ? 4 : 5;
  const minActionW = shortTouch ? 142 : 190;
  const maxTouchCols = Math.max(1, Math.floor((bw - 20 + actionGap) / (minActionW + actionGap)));
  const actionCols = bars.length ? Math.min(bars.length, IS_TOUCH ? Math.min(5, maxTouchCols) : 2) : 1;
  const actionRows = bars.length ? Math.ceil(bars.length / actionCols) : 0;
  const effectH = effects.length && !shortTouch ? (IS_TOUCH ? 22 : 20) : 0;
  const bh = headH + hpH + ruleStep + stanceStep + actionRows * actionH
    + Math.max(0, actionRows - 1) * actionGap + effectH + (shortTouch ? 4 : 6);
  _bossBannerBottom = by + bh;
  const targeted = boss.id === myTarget;

  ctx.fillStyle = "#111720f5"; roundRect(bx, by, bw, bh, 10); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = "#ffcf4a"; roundRect(bx, by, bw, bh, 10); ctx.stroke();
  if (targeted) { ctx.lineWidth = 2; ctx.strokeStyle = "#3df"; roundRect(bx + 4, by + 4, bw - 8, bh - 8, 7); ctx.stroke(); }

  const spr = foeSprite(boss.bodyKey), iconSz = shortTouch ? 20 : 24, ix = bx + 10;
  if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, ix, by + 3, iconSz, iconSz);
  else { ctx.font = "21px serif"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(iconFor(boss.bodyKey), ix, by + 4); }
  const hpStr = `❤${boss.hp}/${boss.maxHp}`, nameX = ix + iconSz + 8;
  ctx.font = `bold ${shortTouch ? 15 : 18}px ui-monospace, monospace`; const hpW = ctx.measureText(hpStr).width;
  const targetW = targeted ? 26 : 0;
  const effectCount = shortTouch ? Math.min(3, effects.length) : 0;
  const effectR = 8, effectStep = 20;
  const effectW = effectCount ? effectR * 2 + (effectCount - 1) * effectStep : 0;
  const effectX = bx + bw - 10 - targetW - hpW - effectW - 8;
  const bossLabel = `♛ ${boss.name}`;
  ctx.fillStyle = "#ffd24a";
  fitText(bossLabel, nameX, by + (shortTouch ? 5 : 6),
    Math.max(60, (effectCount ? effectX - 4 : bx + bw - 12 - hpW - targetW) - nameX),
    shortTouch ? 17 : 20, shortTouch ? 11 : 13);
  if (effectCount) effects.slice(0, effectCount).forEach((effect, i) =>
    drawEffectChipAt(effectX + effectR + i * effectStep, by + headH / 2, effectR, effect));
  ctx.fillStyle = "#9bf09b"; ctx.font = `bold ${shortTouch ? 15 : 18}px ui-monospace, monospace`; ctx.textAlign = "right"; ctx.textBaseline = "top";
  ctx.fillText(hpStr, bx + bw - 10 - targetW, by + (shortTouch ? 5 : 6));
  if (targeted) { ctx.fillStyle = "#8ff5ff"; ctx.font = "bold 18px ui-monospace, monospace"; ctx.fillText("⌖", bx + bw - 7, by + 5); }
  bar(bx + 10, by + headH + 1, bw - 20, shortTouch ? 5 : 8, boss.hp / boss.maxHp, boss.color || "#ffcf4a");

  let yy = by + headH + hpH;
  if (showCoreRule) {
    const rh = shortTouch ? 14 : 16;
    ctx.fillStyle = "#0b1017"; roundRect(bx + 10, yy, bw - 20, rh, 4); ctx.fill();
    ctx.fillStyle = "#ffdc72"; ctx.font = `bold ${shortTouch ? 11 : 13}px ui-monospace, monospace`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("RULE", bx + 17, yy + rh / 2 + 0.5);
    ctx.fillStyle = "#e4e9f0";
    fitText(coreRule, bx + (shortTouch ? 52 : 60), yy + rh / 2 + 0.5,
      bw - (shortTouch ? 68 : 78), shortTouch ? 12 : IS_TOUCH ? 14 : 13, shortTouch ? 9 : 10, "left", "middle");
    yy += ruleStep;
  }
  if (boss.stanceLabel) {
    const obj = boss.stance === "objection";
    const stanceFrac = Math.max(0, Math.min(1, boss.stanceClock?.frac ?? 0));
    const sh = shortTouch ? 16 : 18;
    ctx.fillStyle = obj ? "#672729" : "#1f6543"; roundRect(bx + 10, yy, bw - 20, sh, 5); ctx.fill();
    if (stanceFrac > 0) { ctx.globalAlpha = 0.45; ctx.fillStyle = obj ? "#df5a58" : "#5bd58c"; roundRect(bx + 10, yy, (bw - 20) * stanceFrac, sh, 5); ctx.fill(); ctx.globalAlpha = 1; }
    const stanceLeft = boss.stanceClock ? foeThreatSeconds({ cd: boss.stanceClock.cd, frac: stanceFrac }).toFixed(1) : null;
    ctx.fillStyle = "#fff";
    const stanceText = `${shortTouch ? "" : "DEFENSE NOW · "}${boss.stanceLabel}${stanceLeft ? ` · switches in ${stanceLeft}s` : ""}`;
    fitText(stanceText, bx + bw / 2, yy + sh / 2 + 0.5, bw - 32,
      shortTouch ? 13 : 15, shortTouch ? 10 : 11, "center", "middle");
    yy += stanceStep;
  }

  if (bars.length) {
    const colGap = 6, innerW = bw - 20;
    const tileW = (innerW - (actionCols - 1) * colGap) / actionCols;
    bars.forEach((threat, i) => {
      const row = Math.floor(i / actionCols), col = i % actionCols;
      drawBossIntentTile(bx + 10 + col * (tileW + colGap), yy + row * (actionH + actionGap),
        tileW, actionH, threat, i);
    });
    yy += actionRows * actionH + Math.max(0, actionRows - 1) * actionGap;
  }
  if (effects.length && !shortTouch) drawEffectChips(bx + 14, yy + (IS_TOUCH ? 10 : 9), effects, false);
  if (!boss.laneBound) foeBoxes.push({ x: bx, y: by, w: bw, h: bh, id: boss.id,
    e: { ...boss, atk: 0, dr: 0, gear: [], threat: null, boss: true } });
}

// THE FOLDED COMMAND DECK — one rail, drawn instead of drawBossBanner's stack at 3+ lanes on a
// short touch board. It keeps everything the player steers by in real time: WHO the boss is, its HP
// as both a number and a proportion bar, its live DEFENSE STANCE (which decides whether melee or
// ranged even connects), and one countdown chip per queued action carrying the action name, its
// scope, its damage and its seconds. What it defers — the persistent RULE paragraph and each
// action's outcome prose — is one HOLD away: the rail publishes the same foeBoxes entry the deck
// did, so hold-to-inspect prints all of it (drawFoeInspect), and tap-to-target is unchanged.
// FLAG (owner re-tune): every measurement here, and the choice of what folds, is mine.
function drawBossRail(boss, bars, effects, myTarget) {
  const bx = 6, bw = W - 12, by = BOSS_RAIL_TOP, bh = BOSS_RAIL_H;
  _bossBannerBottom = by + bh;
  _bossBannerGap = BOSS_RAIL_GAP;
  const targeted = boss.id === myTarget;
  ctx.fillStyle = "#111720f5"; roundRect(bx, by, bw, bh, 7); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = "#ffcf4a"; roundRect(bx, by, bw, bh, 7); ctx.stroke();
  if (targeted) { ctx.lineWidth = 1.5; ctx.strokeStyle = "#3df"; roundRect(bx + 3, by + 3, bw - 6, bh - 6, 5); ctx.stroke(); }
  const barH = 3, rowY = by + 3, rowH = bh - barH - 7;   // the HP proportion bar owns the bottom edge
  // The DEFENSE STANCE is a live rule, not flavour — it rides the rail as its first chip so a Lich
  // or the King never hides which damage type currently lands.
  const stance = boss.stanceLabel ? {
    label: boss.stanceLabel, frac: boss.stanceClock?.frac ?? 0, cd: boss.stanceClock?.cd ?? 0,
    color: boss.stance === "objection" ? "#df5a58" : "#5bd58c",
    harm: boss.stance === "objection", stance: true,
  } : null;
  const chips = [...(stance ? [stance] : []), ...bars].slice(0, BOSS_RAIL_CHIPS);
  const chipGap = 4;
  const chipW = chips.length
    ? Math.max(76, Math.min(230, Math.floor((bw * 0.56 - (chips.length - 1) * chipGap) / chips.length)))
    : 0;
  const chipsW = chips.length ? chips.length * chipW + (chips.length - 1) * chipGap : 0;
  const chipLeft = bx + bw - 7 - chipsW;
  chips.forEach((threat, i) => drawBossRailChip(chipLeft + i * (chipW + chipGap), rowY, chipW, rowH, threat, i));
  // IDENTITY, left → right: portrait · ♛ name · active-effect chips · ❤hp/max
  const iconSz = Math.min(rowH, 16), ix = bx + 7;
  const spr = foeSprite(boss.bodyKey);
  if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, ix, rowY + (rowH - iconSz) / 2, iconSz, iconSz);
  else {
    ctx.fillStyle = "#ffd24a"; ctx.font = `${iconSz}px serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(iconFor(boss.bodyKey), ix + iconSz / 2, rowY + rowH / 2);
  }
  const cy = rowY + rowH / 2;
  const hpStr = `❤${boss.hp}/${boss.maxHp}`;
  ctx.font = "bold 12px ui-monospace, monospace";
  const hpW = ctx.measureText(hpStr).width;
  const effR = 6, effStep = 15, effN = Math.min(3, effects.length);
  const effW = effN ? effN * effStep + 4 : 0;
  const nameX = ix + iconSz + 6;
  const nameW = Math.max(36, (chipLeft - 8) - hpW - effW - 8 - nameX);
  ctx.fillStyle = "#ffd24a";
  fitText(`♛ ${boss.name}`, nameX, cy, nameW, 13, 9, "left", "middle");
  let statX = nameX + nameW + 6;
  for (let i = 0; i < effN; i++) drawEffectChipAt(statX + effR + i * effStep, cy, effR, effects[i]);
  statX += effW;
  ctx.fillStyle = "#9bf09b"; ctx.font = "bold 12px ui-monospace, monospace";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(hpStr, statX, cy);
  bar(bx + 6, by + bh - barH - 2, bw - 12, barH, boss.hp / boss.maxHp, boss.color || "#ffcf4a");
  if (!boss.laneBound) foeBoxes.push({ x: bx, y: by, w: bw, h: bh, id: boss.id,
    e: { ...boss, atk: 0, dr: 0, gear: [], threat: null, boss: true } });
}
// One rail chip = one live boss action (or the stance), filled by its own countdown fraction so the
// deck's telegraph language survives the fold: name, scope, damage, seconds. Prose lives in the hold.
function drawBossRailChip(x, y, w, h, threat, order) {
  const frac = Math.max(0, Math.min(1, threat.frac || 0));
  const seconds = foeThreatSeconds(threat);
  const imminent = !threat.stance && seconds <= 2;
  const color = threat.color || (threat.harm ? "#d45b64" : "#6687a8");
  ctx.fillStyle = threat.harm ? "#271619" : "#131a22"; roundRect(x, y, w, h, 5); ctx.fill();
  ctx.save(); roundRect(x, y, w, h, 5); ctx.clip();
  ctx.globalAlpha = 0.34; ctx.fillStyle = color; ctx.fillRect(x, y, Math.max(3, w * frac), h); ctx.restore();
  ctx.lineWidth = imminent ? 2 : 1; ctx.strokeStyle = imminent ? "#ff736b" : "#ffffff35";
  roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 5); ctx.stroke();
  const time = threat.stance ? (threat.cd ? `${seconds.toFixed(1)}s` : "") : frac >= 1 ? "NOW" : `${seconds.toFixed(1)}s`;
  ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
  const timeW = time ? ctx.measureText(time).width + 6 : 0;
  if (time) { ctx.fillStyle = imminent ? "#ffd9d2" : "#e9eef5"; ctx.fillText(time, x + w - 5, y + h / 2); }
  const scope = threat.stance ? "" : threat.lane != null ? `L${Number(threat.lane) + 1}` : foeScopeLabel(threat.scope);
  const label = (threat.label || "BOSS ACTION").replace(/^Power Word:\s*/i, "");
  const dmg = !threat.stance && threat.dmg > 0 ? ` −${threat.dmg}` : "";
  const lead = threat.stance ? "🛡" : order === 0 ? "▶" : "·";
  ctx.fillStyle = threat.stance ? "#e8fff0" : order === 0 ? "#ffe38a" : "#eef2f7";
  fitText(`${lead} ${label}${dmg}${scope ? ` · ${scope}` : ""}`, x + 6, y + h / 2,
    Math.max(20, w - timeW - 12), 11, 8, "left", "middle");
}

// Hover a foe → a small card: stats, its passive (in words), and its item.
function drawFoeInspect(bodies) {
  const hit = foeBoxes.find((b) => b.e && mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h)
    || (_inspectFoeId != null && foeBoxes.find((b) => b.e && b.id === _inspectFoeId));   // touch: a tapped foe stays inspected
  if (!hit) return;
  const e = hit.e, bd = bodies[e.bodyKey] || {};
  const lines = [e.name || bd.name || e.bodyKey];
  lines.push(`❤ ${e.hp}/${e.maxHp}${e.shield > 0 ? `   🛡${e.shield}` : ""}    ⚔ ${e.atk}`);
  if (e.levelAllocation) lines.push(`Lv${e.level ?? 1} · ${levelAllocLabel(e.levelAllocation) || "no upgrades"}`);
  // FLAG "armor" wording (owner re-skin, 7/11): DR prose — was "🛡-N", which read as minus-N SHIELD
  if (e.dr > 0) lines.push(`⬡ armor ${e.dr} — every hit it takes is reduced by ${e.dr}`);
  // Live intent belongs in the hold inspector too. Timer summons (Bone Wizard, Hydra Head) have no
  // card queue, so passive prose alone never answered the urgent question: what hits whom, and when?
  const inspectThreats = (e.threats ?? []).filter((threat) => e.boss || threat.harm).slice(0, 5);
  for (const t of inspectThreats) {
    const scope = foeScopeLabel(t.scope) || "ATTACK";
    if (t.castBar) {
      const effect = t.intent || t.label;
      lines.push(`⏱ ${scope} in ${foeThreatSeconds(t).toFixed(1)}s · ${effect}`);
    } else if (t.kind === "cast") {
      const q = (e.queue ?? []).find((c) => c.key === t.key) ?? (e.queue ?? [])[0];
      const charge = q && (e.moxie ?? 0) >= (q.cost ?? 0) ? "READY" : `⚡${e.moxie ?? 0}/${q?.cost ?? "?"}`;
      lines.push(`⏱ ${scope}  −${t.dmg ?? "?"}  ·  ${charge}  ·  ${t.label}`);
    } else lines.push(`⏱ ${scope}  −${t.dmg ?? "?"} in ${foeThreatSeconds(t).toFixed(1)}s  ·  ${t.label}`);
  }
  if (e.queue?.length) {        // the FULL deck, front-first — the hover the owner asked for
    lines.push(`⚡ moxie ${e.moxie ?? 0}/${e.moxieMax ?? 10}  ·  deck (casts top→down):`);
    e.queue.forEach((c, i) => {
      lines.push(`  ${i === 0 ? "▶" : "·"} ${c.name}  ⚡${c.cost}`);
      if (i === 0 && c.text) lines.push(...wrapText(c.text, 88).slice(0, 3).map((s) => `     ${s}`));
    });
  } else if (e.reactive) lines.push(`⚡ reactive — only strikes when hit`);
  if (e.passive) lines.push(`✦ ${e.passive}`);
  // ACTIVE EFFECTS BY NAME (owner 7/11 phone legibility): hold-to-inspect enumerates every chip with
  // its full label + time left — on touch there is no hover, so the chips alone can't carry the info.
  for (const ef of entityStatus(e, 8))
    lines.push(`${ef.icon} ${ef.label}${ef.left != null ? ` — ${(Math.max(0, ef.left) / 10).toFixed(1)}s left` : ""}`);
  if (IS_TOUCH && _inspectFoeId != null) lines.push("✕ tap anywhere to close");
  ctx.font = "12px ui-monospace, monospace";
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
  const h = lines.length * 15 + 12;
  const x = Math.min(Math.max(6, hit.x), W - w - 6);
  const y = Math.max(6, hit.y - h - 4);
  ctx.fillStyle = "#000d"; roundRect(x, y, w, h, 7); ctx.fill();
  ctx.strokeStyle = "#7fd0ff"; ctx.lineWidth = 1; roundRect(x, y, w, h, 7); ctx.stroke();
  ctx.fillStyle = "#e8e8ea"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, x + 9, y + 7 + i * 15));
}

// ---- overlays (class select / rooms / setup / won) ------------------------
// One container, dispatched by phase. Each rebuilds only when something visible
// changes (a signature compare) to avoid per-tick flicker / lost clicks.
let _draftSig = "", _brSig = "", _setupSig = "";
// SETUP deck-editor (owner 2026-06-27): the deck-builder + level-up surface BEFORE combat. Tapping
// "Position on board" dismisses it so the board is reachable; a floating ✎ button reopens. Reset
// every time we leave the setup phase.
let _setupDismissed = false;
// ROOMS ↔ BACKPACK toggle (owner 2026-06-28): the won overlay splits into two tabs — ROOMS
// (the next-room previews + boss counter + the exits) and BACKPACK (deck builder, loot, trade). The
// choice persists across re-renders/screens; defaults to ROOMS so the boss counter + what's-inside
// preview lead. Part of the won render signature so flipping the tab repaints.
let _ovTab = "rooms";
// PARTY MODE lead-tab latch: the `floor:node` of the won screen whose default tab we already
// overrode to the assign board, so the override happens once per room and never fights the player.
let _lootLedFor = null;
// PROPOSE-TRADE compose state (player→player 1:1 swap, out of combat). Survives re-renders so the
// running selection stays put; validated against the live snapshot each build (a card/partner that
// vanished clears itself). A want is REQUIRED and must match the give's ◈ value (no gifts, 2026-07-02).
let _tradeTo = null, _tradeGive = null, _tradeWant = null;
const NODE_LABEL = { combat: "Fight", elite: "Elite ★", boss: "BOSS ♛" };
// Old snapshots can outlive a server deploy. Never turn a retired node type into a public route.
const publicRoomNodes = (nodes) => (nodes || []).filter((node) => node && node.type !== "shop");
// Advance buttons sorted + arrowed LEFT→RIGHT to match the map drawing. The server now
// sorts links by x too, but the client re-sorts so the buttons can never lie about
// direction even against an old server snapshot.
function advBtns(nexts, attr) {
  const ns = publicRoomNodes(nexts).sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  return ns.map((n, i) => {
    const base = NODE_LABEL[n.type] || "Next";
    const lbl = ns.length === 1 ? `${base} ▶` : i === 0 ? `◀ ${base}` : i === ns.length - 1 ? `${base} ▶` : base;
    // the button carries the room's ANTE — the next-room threat preview. On phones the map is often
    // out of sight, so the advance buttons are where you read what you're walking into.
    const deal = roomAnteLabel(n);
    // elite ENTRY COST: show the spare-card price (◈N) on the advance button; 🔒 when unaffordable.
    const lock = n.cost != null ? ` ${n.locked ? "🔒" : "◈"}${n.cost}` : "";
    return `<button class="advance-btn node-${n.type}" data-${attr}="${n.id}">${lbl}${lock}${deal ? `<span class="adv-deal">${deal}</span>` : ""}</button>`;
  }).join("");
}
// The next-room ANTE preview for a button / map node: ⚖N (the threat weight you'll face). Elite
// rooms are double-ante, so their N already runs higher — we just badge them ★. Boss → its name.
// "" when the engine hasn't attached an ante to this node yet (graceful pre-merge).
function roomAnteLabel(n) {
  if (!n) return "";
  if (n.type === "boss") return state.map?.bossName ? `♛ ${state.map.bossName}` : "♛ boss";
  if (n.ante == null) return "";
  return `⚖${n.ante}${n.type === "elite" ? " ★ elite" : ""}`;
}

// CO-OP ROOM VOTE (owner 2026-06-28): the multiplayer won-screen room picker. Tapping a room
// CASTS/CHANGES this seat's vote (still {type:"advance"} — the server now treats it as a vote);
// each voter's body icon rides the room they picked. A separate Lock-in confirms; the tally
// fires (server-side) when the last seat locks. Solo never reaches here (advBtns handles it —
// one tap goes). `you` is this client's seat id, so we can mark/own our vote + lock.
function roomVoteHtml(nexts) {
  const rv = state.roomVotes || { byNode: {}, seatCount: 0, lockedCount: 0 };
  const byNode = rv.byNode || {};
  const ns = publicRoomNodes(nexts).sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  let myVote = null, myLocked = false;          // my own seat's current vote + lock
  for (const id of Object.keys(byNode)) for (const v of byNode[id])
    if (v.seat === you) { myVote = id; myLocked = !!v.locked; }
  const cards = ns.map((n, i) => {
    const base = NODE_LABEL[n.type] || "Next";
    const lbl = ns.length === 1 ? `${base} ▶` : i === 0 ? `◀ ${base}` : i === ns.length - 1 ? `${base} ▶` : base;
    const deal = n.type === "boss" ? (state.map?.bossName ?? "")
               : n.enchant ? `✦ ${n.enchant.name}${n.enchant.baseAnte ? ` · antes +${n.enchant.baseAnte}` : ""}` : "";
    const voters = (byNode[n.id] || []).map((v) =>
      `<span class="vote-badge${v.seat === you ? " mine" : ""}${v.locked ? " locked" : ""}" title="${escAttr(v.name || "Adventurer")}${v.locked ? " — locked" : ""}" style="color:${v.color}">${iconImg(v.bodyKey)}${v.locked ? "🔒" : ""}</span>`).join("");
    return `<button class="advance-btn node-${n.type}${myVote === n.id ? " is-myvote" : ""}" data-advance="${n.id}">${lbl}${deal ? `<span class="adv-deal">${deal}</span>` : ""}<span class="vote-badges">${voters}</span></button>`;
  }).join("");
  const lockBtn = !myVote
    ? `<button class="km-tier-btn" disabled>Tap a room to vote</button>`
    : myLocked
    ? `<button class="km-tier-btn" data-unlockroom="1">🔓 Unlock my vote</button>`
    : `<button class="stock-begin" style="margin-top:0;width:auto" data-lockroom="1">🔒 Lock in</button>`;
  return `<div class="advance-row">${cards}</div>
    <div class="vote-bar">${lockBtn}<span class="vote-progress">${rv.lockedCount}/${rv.seatCount} locked</span></div>`;
}

// "Rooms to showdown" — the map is flavor on a phone; the count is the load-bearing fact.
// Every advance steps exactly one row, so remaining rooms = rows below the current one.
function showdownLine() {
  const map = state.map; if (!map?.nodes?.length || map.levelComplete) return "";
  const cur = map.nodes.find((n) => n.id === map.currentId); if (!cur) return "";
  const ys = [...new Set(map.nodes.map((n) => Math.round((n.y ?? 0) * 1000)))].sort((a, b) => a - b);
  const left = ys.length - 1 - ys.indexOf(Math.round((cur.y ?? 0) * 1000));
  return left > 0 ? ` · ♛ ${left} room${left === 1 ? "" : "s"} to ${map.bossName ?? "the boss"}` : "";
}

// Slim offers strip — INCOMING 1:1 swaps (another human offering a card FOR one of yours) and your
// OWN pending offers. Both sides always show (owner 2026-07-02: gifts are gone, every trade is an
// equal-◈ swap), so accepting is never a surprise about what leaves your backpack.
function buildOffersStrip() {
  const meId = pilot()?.id ?? you;
  const offers = (state.trade && state.trade.offers) || [];
  const incoming = offers.filter((o) => o.to === meId).map((o) =>
    `<div class="trade-offer"><b>${escTip(o.fromName || "Adventurer")}</b> offers <b>${o.giveName}</b> <b class="cval">◈${o.giveVal}</b> for your <b>${o.wantName ?? "?"}</b> <b class="cval">◈${o.wantVal ?? "?"}</b>
      <button class="lane-btn" data-accept="${o.id}">Accept</button><button class="lane-btn" data-decline="${o.id}">✕</button></div>`).join("");
  const outgoing = offers.filter((o) => o.from === meId).map((o) =>
    `<div class="trade-offer pending">You offered <b>${o.giveName}</b> (◈${o.giveVal}) for ${escTip(o.toName || "Adventurer")}'s ${o.wantName ?? "?"} — waiting…
      <button class="lane-btn" data-decline="${o.id}">Withdraw</button></div>`).join("");
  return (incoming || outgoing) ? `<div class="trade-box">${incoming}${outgoing}</div>` : "";
}

// Wire the offers strip: accept an incoming 1:1 swap, or withdraw/decline an offer.
function wireTrade(ov) {
  ov.querySelectorAll("[data-accept]").forEach((b) => b.onclick = () => send({ type: "acceptTrade", offer: b.dataset.accept }));
  ov.querySelectorAll("[data-decline]").forEach((b) => b.onclick = () => send({ type: "declineTrade", offer: b.dataset.decline }));
}
// SQUAD SELECTOR (setup/won) — a row of little buttons, one per body your seat owns,
// gold-highlighted for the body you're currently piloting. Clicking one possesses that body so
// every economy panel below (loot/kit/wallet) retargets to it. Same look as the draft
// slot-selector. `status(s)` lets each phase annotate a body (e.g. ✓ done, lane name).
// Returns "" for a solo seat (one body — no selector needed).
function squadSelectorHtml(status) {
  const squad = (state?.players || []).filter(isMine)
    .sort((a, b) => (a.id === you ? -1 : b.id === you ? 1 : (a.id < b.id ? -1 : 1)));
  if (squad.length < 2) return "";
  if (!squad.some((s) => s.id === activeId)) activeId = you;   // guard a stale active id
  const bodies = state.bodies || {};
  const slots = squad.map((s) => {
    const isActive = s.id === activeId;
    const who = s.id === you ? "You" : escTip(s.name || "Adventurer");
    const name = bodies[s.bodyKey]?.name || s.bodyKey || "—";
    const extra = status ? status(s) : "";
    const style = `padding:7px 11px;margin:3px;border-radius:9px;cursor:pointer;min-width:104px;`
      + `display:inline-flex;flex-direction:column;align-items:center;gap:2px;`
      + `border:2px solid ${isActive ? "#e6c34a" : "#2a2f3a"};`
      + `background:${isActive ? "#2a2616" : "#171a21"};color:#dfe7f0;`;
    return `<button class="km-body-slot" data-squadslot="${s.id}" style="${style}">
      <span style="font-size:11px;opacity:.8">${who} · 🃏${s.deckSize ?? 0}</span>
      <span style="font-weight:bold;font-size:13px">${iconImg(formArt(s))} ${name}${extra}</span>
    </button>`;
  }).join("");
  return `<div class="km-squad-command">
    <div class="km-squad-command-copy"><b>PARTY CONTROL</b><small>Select your main body or a companion to edit and command it.</small></div>
    <div class="draft-status" style="flex-wrap:wrap;justify-content:center;margin:4px 0 8px">${slots}</div>
  </div>`;
}
// Wire a squad selector inside an overlay: clicking a body possesses it + re-renders. Each
// renderX clears its own sig before calling so the overlay rebuilds against the new active body.
function wireSquadSelector(ov, rerender) {
  ov.querySelectorAll("[data-squadslot]").forEach((b) => b.onclick = () => {
    const id = b.dataset.squadslot;
    if (id === activeId) return;
    activeId = id;
    send({ type: "possess", id });          // server routes all later economy actions here
    rerender();
  });
}

// ── ROOMS ↔ BACKPACK TOGGLE (owner 2026-06-28) ────────────────────────────────────────────────
// The segmented control atop the won overlay. Two tabs; the active one is gold. `_ovTab`
// persists, so a flip survives the next snapshot's re-render (it's in each render signature).
// PARTY MODE (owner 2026-07-24) prepends a third tab — the loot→party assign board — and it LEADS
// (see the auto-select latch in renderBetweenRooms); the room picker stays one tap away.
function tabBarHtml(lead = []) {
  const tabs = [...lead, ["rooms", "🚪 Rooms"], ["backpack", "🎒 Backpack"]];
  return `<div class="km-tabs">${tabs.map(([k, l]) =>
    `<button class="km-tab${_ovTab === k ? " on" : ""}" data-ovtab="${k}">${l}</button>`).join("")}</div>`;
}

function mapButtonHtml() {
  return `<button class="km-map-open" data-openmap="1"><b>🗺 Open map</b><span>all rooms · foes · boss</span></button>`;
}
function wireTabs(ov, rerender) {
  ov.querySelectorAll("[data-ovtab]").forEach((b) => b.onclick = () => {
    if (_ovTab === b.dataset.ovtab) return;
    _ovTab = b.dataset.ovtab;
    // telemetry's vocabulary is a CLOSED server-side allowlist (navigation/rooms_tab,
    // navigation/backpack_tab). The Party assign tab has no entry there, and adding one would mean
    // touching server.js — so it simply emits nothing rather than sending a dropped message.
    if (_ovTab === "rooms" || _ovTab === "backpack") uiTelem("navigation", `${_ovTab}_tab`);
    rerender();
  });
}

// Group a node's pre-built roster (`contents` = one entry per foe) into "icon Name ×count · Lv ❤hp"
// rows. Copies that differ in level/hp stay separate groups so the preview never lies. Returns the
// group list (graceful: [] when the engine shipped no contents — an older snapshot).
function groupRoomFoes(n) {
  const cs = Array.isArray(n && n.contents) ? n.contents : [];
  const groups = [], idx = new Map();
  for (const f of cs) {
    const deck = Array.isArray(f.deck) ? f.deck : [];
    const deckSig = deck.map((d) => d.key + "x" + d.count).join(",");   // foes whose DECKS differ stay separate
    const allocSig = JSON.stringify(f.levelAllocation || {});
    const key = (f.bodyKey || "") + "|" + f.level + "|" + f.maxHp + "|" + allocSig + "|" + deckSig;
    let g = idx.get(key);
    if (!g) { g = { bodyKey: f.bodyKey, name: f.name || f.bodyKey || "foe", level: f.level, levelAllocation: f.levelAllocation ?? null, maxHp: f.maxHp, passive: f.passive ?? null, deck, count: 0 }; idx.set(key, g); groups.push(g); }
    g.count++;
  }
  return groups;
}
// The WHAT'S-INSIDE roster for one room card. "" when there are no contents (caller falls back to the
// ante-only line), so we never render `undefined`/`[object Object]`.
function roomFoesHtml(n) {
  const groups = groupRoomFoes(n);
  if (!groups.length) return "";
  // each chip carries its node id + group index so the foe tooltip (foeTipHtml) can re-read the
  // FULL detail — passive + every gear card's description — from the latest snapshot on hover/tap.
  return `<div class="room-foes">${groups.map((g, gi) => {
    // each foe's DECK — the gear cards it'll play (owner 2026-06-29), grouped "Name×count · …"
    const deck = (g.deck || []).length
      ? `<span class="rf-deck"><b>Possible drops:</b> ${g.deck.map((d) => `${d.cost != null ? `⚡${d.cost} ` : ""}${d.name}${d.count > 1 ? `×${d.count}` : ""}`).join(" · ")}</span>`
      : "";
    const readHint = IS_TOUCH ? "hold for details" : "click for details";
    return `<span class="room-foe" data-roomtip-node="${escTip(n.id)}" data-roomtip-i="${gi}" title="${readHint}">` +
      `${iconImg(g.bodyKey)} <span class="rf-name">${g.name}${g.count > 1 ? ` ×${g.count}` : ""}</span>` +
      `<span class="room-foe-stat">${g.level != null ? `Lv${g.level} ` : ""}❤${g.maxHp ?? "?"}</span>${deck}</span>`;
  }).join("")}</div>${n.compLoot ? `<div class="room-common-loot">+ ◈${n.compLoot} in random cards</div>` : ""}`;
}
// Build a foeTipHtml-compatible foe object from one room-preview group (icon/name/HP + passive +
// every gear card with its description). `count`s fold into the displayed names so the tip reads
// like the in-fight foe tooltip. Returns null when the node/group can't be resolved (stale tap).
function roomTipFoe(chip) {
  const nodeId = chip.dataset.roomtipNode, gi = +chip.dataset.roomtipI;
  const node = (state?.map?.nodes || []).find((n) => n.id === nodeId);
  const g = node ? groupRoomFoes(node)[gi] : null;
  if (!g) return null;
  return {
    name: g.count > 1 ? `${g.name} ×${g.count}` : g.name,
    level: g.level, levelAllocation: g.levelAllocation, maxHp: g.maxHp, passive: g.passive,
    gear: (g.deck || []).map((d) => ({ name: d.count > 1 ? `${d.name} ×${d.count}` : d.name, cost: d.cost ?? null, text: d.text || "" })),
  };
}
// THE BOSS COUNTER for the ROOMS view: "Boss in N rooms" + a Room X/Y progress chip. Reads the new
// map.roomsToBoss/rowCount/currentRow; gracefully falls back to the row-count in showdownLine() when
// an older snapshot lacks them (never crashes / shows undefined).
function bossCounterHtml() {
  const map = state.map || {};
  if (map.roomsToBoss == null) {
    const s = showdownLine().replace(/^ · /, "");   // "♛ N rooms to X" or ""
    return s ? `<div class="boss-counter">${s}</div>` : "";
  }
  const n = map.roomsToBoss;
  const boss = map.bossName ? ` · ${map.bossName}` : "";
  const label = n <= 0 ? `♛ BOSS NEXT${boss}` : `♛ Boss in ${n} room${n === 1 ? "" : "s"}${boss}`;
  return `<div class="boss-counter"><span class="bc-main">${label}</span></div>`;   // STS "Room X/Y" map framing dropped (owner 2026-06-29)
}
// The ROOMS view body: one card per advanceable next room, sorted left→right to match the map.
// Each card shows its label, ⚖ante, elite ◈cost (+🔒/lockReason when unaffordable) and the foe
// roster inside. Clicks reuse the SAME data-advance / data-leave attrs the overlays already wire.
function roomCardsHtml(nexts, attr) {
  const ns = publicRoomNodes(nexts).sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  if (!ns.length) return `<p class="draft-sub">No exits from here.</p>`;
  // CO-OP VOTE badges (owner 2026-06-28): each voter's body icon rides the room they picked; my own
  // vote highlights the card. byNode is "" in solo (server omits it / one seat), so this is invisible
  // outside co-op and the rich preview is unchanged.
  const byNode = (state.roomVotes && state.roomVotes.byNode) || {};
  let myVote = null;
  for (const id of Object.keys(byNode)) for (const v of byNode[id]) if (v.seat === you) myVote = id;
  return `<div class="room-cards">${ns.map((n) => {
    const name = NODE_LABEL[n.type] || "Next";
    const ante = n.ante != null ? `<span class="room-ante">⚖${n.ante}</span>` : "";
    // ⚖ is threat; ◈ previews carried cards, two guaranteed commons per body, and level/elite loot.
    const loot = n.loot != null ? `<span class="room-loot" title="Possible loot value">◈${n.loot} loot</span>` : "";
    const cost = n.cost != null ? `<span class="room-cost${n.locked ? " locked" : ""}">${n.locked ? "🔒" : "◈"}${n.cost}</span>` : "";
    let body;
    if (n.type === "boss") body = `<div class="room-foes"><span class="room-foe">♛ ${state.map?.bossName || "the boss"}</span></div>`;
    else body = roomFoesHtml(n) || `<div class="room-foes"><span class="lane-empty">— ${n.ante != null ? `⚖${n.ante} threat` : "contents unknown"} —</span></div>`;
    const lock = (n.locked && n.lockReason) ? `<div class="room-lock">🔒 ${n.lockReason}</div>` : "";
    const voters = (byNode[n.id] || []).map((v) =>
      `<span class="vote-badge${v.seat === you ? " mine" : ""}${v.locked ? " locked" : ""}" title="${escAttr(v.name || "Adventurer")}${v.locked ? " — locked" : ""}" style="color:${v.color}">${iconImg(v.bodyKey)}${v.locked ? "🔒" : ""}</span>`).join("");
    const voteRow = voters ? `<div class="vote-badges">${voters}</div>` : "";
    // Dedicated ENTER action bar (owner 2026-06-29): the foe chips fill the card and intercept taps to
    // show foe info, so a clear non-chip target lets you just GO. It's a plain (non-chip) child of the
    // card button, so a tap bubbles to the card's advance/leave handler — tapping a chip still inspects.
    const enterLbl = n.type === "boss" ? "▶ Fight the boss" : "▶ Enter room";
    const enter = `<span class="room-enter">${enterLbl}</span>`;
    return `<button class="room-card node-${n.type}${n.locked ? " is-locked" : ""}${myVote === n.id ? " is-myvote" : ""}" data-${attr}="${n.id}">
      <div class="room-card-h"><span class="room-name">${name}</span>${ante}${loot}${cost}</div>
      ${body}${lock}${voteRow}${enter}</button>`;
  }).join("")}</div>`;
}

// CO-OP VOTE bar: the Lock-in / Unlock control + "X/Y locked" progress, shown under the room cards
// when 2+ human seats are present. Solo never renders this (tap-to-go resolves instantly server-side).
function roomVoteBar() {
  const rv = state.roomVotes || { byNode: {}, seatCount: 0, lockedCount: 0 };
  const byNode = rv.byNode || {};
  let myVote = null, myLocked = false;
  for (const id of Object.keys(byNode)) for (const v of byNode[id]) if (v.seat === you) { myVote = id; myLocked = !!v.locked; }
  const lockBtn = !myVote
    ? `<button class="km-tier-btn" disabled>Tap a room to vote</button>`
    : myLocked
    ? `<button class="km-tier-btn" data-unlockroom="1">🔓 Unlock my vote</button>`
    : `<button class="stock-begin" style="margin-top:0;width:auto" data-lockroom="1">🔒 Lock in</button>`;
  return `<div class="vote-bar">${lockBtn}<span class="vote-progress">${rv.lockedCount}/${rv.seatCount} locked</span></div>`;
}

// ── PLAYER↔PLAYER TRADE compose (owner 2026-06-28; 1:1-only 2026-07-02) ───────────────────────
// Pick a partner, a SPARE card of yours to give, and a REQUIRED equal-◈ card of theirs to receive
// (gifts are gone — seat resource totals stay identical over the run). Sends proposeTrade
// {to,give,want}; the partner accepts/declines in their offers strip. "" for a solo seat.
function buildTradeCompose() {
  const players = state.players || [];
  const meId = pilot()?.id ?? you;
  // Trade is between SEATS (humans). Exclude your own squad bodies — handing a card to one of those
  // is the instant giveItem/moveItem flow, not a proposed trade. So a solo seat (even an N-body
  // squad) shows nothing here; only genuine other players appear.
  const others = players.filter((p) => p.id !== meId && !isMine(p));
  if (!others.length) return "";                                   // solo seat — no one to trade with
  const me = players.find((p) => p.id === meId) || {};
  if (_tradeTo && !others.some((p) => p.id === _tradeTo)) _tradeTo = null;
  if (!_tradeTo && others.length === 1) _tradeTo = others[0].id;   // auto-pick the only partner
  const target = others.find((p) => p.id === _tradeTo) || null;
  const mySpare = backpackSpare(me);
  if (_tradeGive && !mySpare.some((c) => c.key === _tradeGive)) _tradeGive = null;
  const theirSpare = target ? backpackSpare(target) : [];
  if (_tradeWant && !theirSpare.some((c) => c.key === _tradeWant)) _tradeWant = null;

  const targetRow = others.length > 1 ? `<div class="trade-party"><span class="trade-label">To</span>${
    others.map((p) => `<button class="trade-item${p.id === _tradeTo ? " sel" : ""}" data-tradeto="${p.id}">${escTip(p.name || "Adventurer")}</button>`).join("")}</div>` : "";
  const giveRow = `<div class="trade-give-row"><span class="trade-label">You give</span>${
    mySpare.length ? mySpare.map((c) => `<button class="trade-item${c.key === _tradeGive ? " sel" : ""}" data-tradegive="${c.key}">${c.name} <span class="cval">◈${c.value ?? 0}</span></button>`).join("")
      : `<span class="lane-empty">— no spare cards to give —</span>`}</div>`;
  // 1:1 ONLY (owner 2026-07-02): gifts are gone, and a want must MATCH the give's ◈ value — the
  // shelf shows only equal-value picks so an illegal offer can't even be composed.
  const giveVal = _tradeGive ? (mySpare.find((c) => c.key === _tradeGive)?.value ?? 0) : null;
  const wantable = giveVal == null ? [] : theirSpare.filter((c) => (c.value ?? 0) === giveVal);
  if (_tradeWant && !wantable.some((c) => c.key === _tradeWant)) _tradeWant = null;
  const wantRow = target ? `<div class="trade-give-row"><span class="trade-label">You want</span>${
    giveVal == null ? `<span class="lane-empty">— pick your card first —</span>`
    : wantable.length ? wantable.map((c) => `<button class="trade-item${c.key === _tradeWant ? " sel" : ""}" data-tradewant="${c.key}">${c.name} <span class="cval">◈${c.value ?? 0}</span></button>`).join("")
    : `<span class="lane-empty">— they hold no ◈${giveVal} spare (1:1 trades only) —</span>`}</div>` : "";
  const canSend = !!(_tradeTo && _tradeGive && _tradeWant);
  const sendLbl = "🔄 Propose 1:1 swap";
  return `<div class="trade-box trade-compose"><div class="km-deck-h">🤝 PROPOSE A TRADE</div>
    ${targetRow}${giveRow}${wantRow}
    <div class="trade-give-row"><button class="lane-btn trade-send" data-tradesend="1"${canSend ? "" : " disabled"}>${sendLbl}</button></div></div>`;
}
function wireTradeCompose(ov, rerender) {
  ov.querySelectorAll("[data-tradeto]").forEach((b) => b.onclick = () => { _tradeTo = b.dataset.tradeto; _tradeWant = null; rerender(); });
  ov.querySelectorAll("[data-tradegive]").forEach((b) => b.onclick = () => { _tradeGive = (_tradeGive === b.dataset.tradegive) ? null : b.dataset.tradegive; rerender(); });
  ov.querySelectorAll("[data-tradewant]").forEach((b) => b.onclick = () => { _tradeWant = b.dataset.tradewant || null; rerender(); });
  const sb = ov.querySelector("[data-tradesend]");
  if (sb) sb.onclick = () => {
    if (!_tradeTo || !_tradeGive || !_tradeWant) return;   // 1:1 — no want, no offer
    send({ type: "proposeTrade", to: _tradeTo, give: _tradeGive, want: _tradeWant });
    _tradeGive = null; _tradeWant = null;   // keep the partner; clear the card picks for the next offer
  };
}

function renderOverlay() {
  const ov = $("draftOverlay");
  // leaving setup → forget the dismiss state + hide the floating reopen button
  if (state?.phase !== "setup") { _setupDismissed = false; $("setupReopen")?.classList.add("hidden"); }
  if (state?.phase === "draft" && state.draft) return renderDraft();
  if (state?.phase === "won") return renderBetweenRooms();
  if (state?.phase === "setup") return renderSetup();
  if (!ov.classList.contains("hidden")) { ov.classList.add("hidden"); ov.innerHTML = ""; _ovScreen = ""; _draftSig = _brSig = _setupSig = ""; }
}

// Repaint the overlay WITHOUT the scroll snapping to the top. Every tap re-renders its whole screen
// via innerHTML, which resets every scroller (the overlay itself on desktop, .draft-card / inner
// shelves on phone) — so picking a card mid-list yanked the view back up on almost every screen.
// A same-screen repaint keeps its DOM shape, so scroll positions are saved/restored by element
// index; a GENUINE screen change (different tag, or reopening after a hide) still opens at the top.
let _ovScreen = "";
function paintOverlay(ov, screen, html) {
  const keep = _ovScreen === screen;
  const saved = keep ? [ov, ...ov.querySelectorAll("*")].map((el) => el.scrollTop) : null;
  ov.innerHTML = html;
  _ovScreen = screen;
  if (!keep) uiTelem("screen", `view_${screen}`);
  if (!saved) { ov.scrollTop = 0; return; }
  const now = [ov, ...ov.querySelectorAll("*")];
  saved.forEach((st, i) => { if (st && now[i]) now[i].scrollTop = st; });
}

// DJINN TORNADO — server state owns lane movement and exposure. The client paints the
// entire hazardous player-lane column with its authored floor damage, so a moving hazard
// never exists only in hidden simulation state.
function drawTornadoHazards(tornadoes) {
  for (const t of tornadoes) {
    const i = Math.max(0, Math.min(COLS - 1, t.lane | 0));
    const x = laneX(i) + 3, w = laneW(i) - 6;
    const top = Math.max(8, _bossBannerBottom + 4), bottom = CARAVAN_Y - 18;
    const h = Math.max(20, bottom - top);
    ctx.save();
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = "#a8e0ff"; roundRect(x, top, w, h, 10); ctx.fill();
    ctx.globalAlpha = 0.62; ctx.strokeStyle = "#a8e0ff"; ctx.lineWidth = 1.5; ctx.setLineDash([7, 6]);
    roundRect(x + 1, top + 1, w - 2, h - 2, 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#dff7ff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const [dy, size, alpha] of [[0.25, 15, 0.35], [0.52, 24, 0.72], [0.78, 17, 0.42]]) {
      ctx.globalAlpha = alpha; ctx.font = `${size}px serif`; ctx.fillText("🌪", x + w / 2, top + h * dy);
    }
    const label = `ENTER / 6s · ${t.damage ?? 0} DMG`;
    ctx.globalAlpha = 1; ctx.font = "bold 9px ui-monospace, monospace";
    const lw = Math.min(w - 12, ctx.measureText(label).width + 14), lx = x + (w - lw) / 2, ly = top + 5;
    ctx.fillStyle = "#10232bea"; roundRect(lx, ly, lw, 17, 7); ctx.fill();
    ctx.strokeStyle = "#a8e0ff99"; ctx.lineWidth = 1; roundRect(lx + .5, ly + .5, lw - 1, 16, 7); ctx.stroke();
    ctx.fillStyle = "#dff7ff"; ctx.fillText(label, x + w / 2, ly + 8.5);
    ctx.restore();
  }
}

// Immediate DOM echo for consequential overlay taps. The server still owns every transition; this
// only closes the tunnel round-trip gap so a room/draft/start tap visibly lands under the finger.
function markActionPending(button, label, childSelector = null) {
  if (!button || button.getAttribute("aria-busy") === "true") return false;
  const target = childSelector ? button.querySelector(childSelector) : button;
  const prior = target?.textContent ?? "";
  button.classList.add("is-action-pending"); button.setAttribute("aria-busy", "true");
  if (target) target.textContent = label;
  setTimeout(() => {
    if (!button.isConnected) return;
    button.classList.remove("is-action-pending"); button.removeAttribute("aria-busy");
    if (target?.isConnected) target.textContent = prior;
  }, PEND_MS);
  return true;
}

// ── COMBAT LOG panel (owner 2026-06-25): an ordered, scrollable record of the whole fight, shown
// only when the fight is OVER (lost/won) and the server shipped state.combatLog. Built once per new
// log (signature-gated, like the draft overlay), scrolled to the BOTTOM so the death is in view.
// ✕ hides it (revealing the board); ▶ Play Again restarts (same as the startBtn).
let _clogSig = "";
let _clogDismissed = false;   // ✕ on the combat-log panel STICKS for the current death (don't re-pop each render)
const _clogClass = (line) => {
  const c = (line || "").trimStart()[0];
  if (c === "▶") return "cl-hero";
  if (c === "↳") return "cl-foe";
  if (c === "✦") return "cl-proc";
  if (c === "→") return "cl-todmg";
  if (c === "✖" || c === "☠") return "cl-hit";
  if (c === "⛺") return "cl-cav";
  return "cl-info";                       // — info, ═══ headers, anything else
};
function updateCombatLog(phase) {
  const el = $("combatLog");
  if (!el) return;
  const log = state && phase === "lost" ? state.combatLog : null;   // DEATH only — a win goes to loot/advance, no post-mortem
  if (!log || !log.length) {               // not a death snapshot — hide + reset
    if (!el.classList.contains("hidden")) { el.classList.add("hidden"); el.innerHTML = ""; }
    _clogSig = ""; _clogDismissed = false;
    return;
  }
  const sig = phase + ":" + log.length + ":" + (log[log.length - 1] || "");
  if (sig !== _clogSig) {
    _clogSig = sig; _clogDismissed = false;   // a fresh death → show the panel again
    // One chronological record: header (title + ✕) · the full scrollable log · ▶ Play Again.
    // Damage lines already carry their resolved source/card, mitigation, shield, HP movement, and
    // lethal state. Repeating a selected subset above the real log hid the actual chronology.
    const rows = log.map((line) => {
      const d = document.createElement("div");
      d.className = _clogClass(line);
      d.textContent = line;
      return d.outerHTML;
    }).join("");
    // DEFEAT HEADLINE (owner-approved 2026-07-11): the modal only titled itself "Combat Log" — add a clear
    // "Defeat — Floor N" headline atop it (real floor from state; no invented copy). Both platforms.
    const floorN = (state && state.floor) || 1;
    el.innerHTML =
      '<div class="clog-head"><div class="clog-title"><span class="clog-defeat">Defeat — Floor ' + floorN + '</span>' +
      '<span class="clog-sub">Full Combat Log · ' + log.length + ' entries</span></div><button class="clog-x" title="Close">✕</button></div>' +
      '<div class="clog-list">' + rows + '</div>' +
      '<div class="clog-foot"><button class="clog-play">▶ Play Again</button></div>';
    el.querySelector(".clog-x").onclick = () => {
      el.classList.add("hidden"); _clogDismissed = true;
      $("startBtn")?.classList.remove("hidden"); // the header Play Again replaces the dismissed modal CTA
    }; // sticks for this death
    el.querySelector(".clog-play").onclick = () => send({ type: "start" });
  }
  if (!_clogDismissed && el.classList.contains("hidden")) {
    el.classList.remove("hidden");
    const list = el.querySelector(".clog-list");
    if (list) list.scrollTop = list.scrollHeight;   // death is last — open scrolled to the bottom
  }
}

// ── CARD ECONOMY (owner 2026-06-24): gold is gone. A card's VALUE (◈) is the only resource —
// shown on every listed card and tendered for permanent progression. The deck-builder edits the
// COMBAT deck (deckList) out of the full owned repo (backpack); combat draws only from the deck.

// Multiset → { key: count }. Accepts card DESCRIPTORS ({key,...}) or bare key STRINGS — the pay
// tender trays hold bare keys, and counting them as descriptors read every count as
// { undefined: N } → the level-up prune wiped each tap as "stale" and Confirm could never enable.
function _multiset(cards) {
  const m = {};
  for (const c of cards || []) { const k = typeof c === "string" ? c : c?.key; m[k] = (m[k] || 0) + 1; }
  return m;
}
// The backpack MINUS the deck, by multiset: the owned cards not currently in the combat deck.
// Returns a flat list of descriptors (one entry per spare copy). The deck holds a sub-multiset of
// the backpack, so this is always ≥ 0 per key.
function backpackSpare(me) {
  const inDeck = _multiset(me.deckList);
  const spare = [];
  for (const c of me.backpack || []) {
    if ((inDeck[c.key] || 0) > 0) inDeck[c.key]--;   // one copy is "spoken for" by the deck
    else spare.push(c);
  }
  return spare;
}
// LEVEL-UP PAY SELECTION (owner 2026-06-29): the player CHOOSES which spare cards to feed the level-up,
// through the shared tender flow. `_lvlOpen` = the pay tray is expanded; `_lvlPay` = the backpack
// card keys tendered (one entry per copy). Survives re-renders so the running total + Confirm stay put.
let _lvlOpen = false;
let _lvlPay = [];
let _lvlAlloc = null;
let _lvlAllocOwner = null;
let _lvlAllocPending = false;
// The detailed level sheet and deck/backpack editor are intentionally compact until requested.
// These disclosure choices persist across snapshots/screens so a player actively editing a build is
// not forced to reopen it after every server-authoritative update.
let _levelPanelOpen = false;
let _deckPanelOpen = false;
let _partyPanelOpen = false;
let _partyMove = null; // { body, key, zone:"deck"|"spare" } — two-tap cross-body move/swap
// HP-per-point and the flat per-level grant are SERVER constants (snapshot `levelHpPerPoint` /
// `levelHpFlatPer`). Read them — never hardcode. Both labels here silently lied on 2026-07-26 when
// the owner moved the point value 4→3 and added a flat +2/level; the fallbacks are a last resort
// for an old server that doesn't ship the fields.
const hpPerPoint = () => state?.levelHpPerPoint ?? 3;
const hpFlatPer  = () => state?.levelHpFlatPer ?? 2;
const LEVEL_ROWS = [
  { key: "hp", label: "Health", effect: null, cost: 1 },   // computed live in the level sheet
  { key: "melee", label: "Melee", effect: "+1 melee damage", cost: 1 },
  { key: "ranged", label: "Ranged", effect: "+1 ranged damage", cost: 1 },
];
const LEVEL_ALLOC_KEYS = ["hp", "melee", "ranged", "mastery", "specialty"];
const sameLevelAllocation = (a, b) => LEVEL_ALLOC_KEYS.every((key) => (a?.[key] ?? 0) === (b?.[key] ?? 0));
function collapsiblePanelHtml(kind, title, meta, open, content = "") {
  return `<section class="km-collapsible km-${kind}-panel${open ? " is-open" : ""}">
    <button type="button" class="km-collapse-toggle" data-${kind}panel="1" aria-expanded="${open ? "true" : "false"}">
      <span class="km-collapse-title">${title}</span>
      <span class="km-collapse-meta">${meta}</span>
      <span class="km-collapse-chevron" aria-hidden="true">${open ? "▾" : "▸"}</span>
    </button>
    ${open ? `<div class="km-collapse-body">${content}</div>` : ""}
  </section>`;
}
function levelAllocFor(me) {
  const owner = `${me.id}:${me.bodyKey}:${me.level}`;
  if (!_lvlAlloc || _lvlAllocOwner !== owner) {
    _lvlAllocOwner = owner;
    _lvlAlloc = { hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 0, ...(me.levelAllocation || {}) };
    _lvlAllocPending = false;
  } else if (_lvlAllocPending && sameLevelAllocation(me.levelAllocation, _lvlAlloc)) {
    // The authoritative snapshot has acknowledged the last instant-save edit.
    _lvlAllocPending = false;
    _lvlAlloc = { hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 0, ...(me.levelAllocation || {}) };
  } else if (!_lvlAllocPending && !sameLevelAllocation(me.levelAllocation, _lvlAlloc)) {
    // A server-side level-up/body swap changed the allocation outside this open sheet.
    _lvlAlloc = { hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 0, ...(me.levelAllocation || {}) };
  }
  return _lvlAlloc;
}
function levelAllocUsed(me, allocation = levelAllocFor(me)) {
  const u = me.levelUpgrades || {};
  return (allocation.hp || 0) + (allocation.melee || 0) + (allocation.ranged || 0)
    + (allocation.mastery || 0) * (u.mastery?.cost || 0)
    + (allocation.specialty || 0) * (u.specialty?.cost || 0);
}
function buildLevelRows(me, budget) {
  const a = levelAllocFor(me), upgrades = me.levelUpgrades || {};
  const rows = [...LEVEL_ROWS,
    ...(upgrades.mastery ? [{ key: "mastery", label: upgrades.mastery.name || "Mastery", effect: upgrades.mastery.text, cost: upgrades.mastery.cost, cap: 1 }] : []),
    ...(upgrades.specialty ? [{ key: "specialty", label: upgrades.specialty.name || "Specialty", effect: upgrades.specialty.text, cost: upgrades.specialty.cost, cap: upgrades.specialty.cap ?? null }] : []),
  ];
  const used = levelAllocUsed(me, a), left = Math.max(0, budget - used);
  const bodyName = (state.bodies || {})[me.bodyKey]?.name || me.bodyKey || "Body";
  return `<div class="km-level-sheet">
    <div class="km-level-sheet-head"><b>${bodyName} · Upgrade Points</b><span class="${left ? "ante-ok" : ""}">${used}/${budget} spent${left ? ` · ${left} free` : ""}</span></div>
    ${rows.map((row) => {
      const rank = a[row.key] || 0, capped = row.cap != null && rank >= row.cap;
      const canAdd = !capped && used + row.cost <= budget;
      // HP reads the server constants. It also states the flat per-level grant, which the old
      // label omitted entirely — a point-buy is NOT the only way HP goes up any more.
      const hpp = hpPerPoint();
      const effect = row.key === "hp"
        ? `+${hpp} max HP per point · +${rank * hpp} total · preview ${Math.max(1, (me.maxHp ?? 1) + (rank - (me.levelAllocation?.hp ?? 0)) * hpp)} max HP`
          + ` · every level also grants +${hpFlatPer()} regardless`
        : row.effect;
      return `<div class="km-level-row">
        <div><b>${row.label}</b> <span class="dcd">· ${row.cost}pt${row.key === "specialty" ? "/rank" : ""}</span><small>${effect}</small></div>
        <div class="km-rank-step"><button data-lvlrank="${row.key}" data-dir="-1" ${rank > 0 ? "" : "disabled"}>−</button><b>${rank}</b><button data-lvlrank="${row.key}" data-dir="1" data-cost="${row.cost}" data-cap="${row.cap ?? ""}" ${canAdd ? "" : "disabled"}>+</button></div>
      </div>`;
    }).join("")}
  </div>`;
}
// The LEVEL-UP control. Collapsed: the player's RUN-WIDE level + a button to open the pay-picker. Opened:
// a value-for-value tender tray — tap spare cards until their summed ◈ COVERS the cost,
// then Confirm. Spares are spent before deck copies and the deck never drops below MIN_DECK (server-side
// tenderValue re-validates). Renders nothing until the engine ships player.nextLevelCost (graceful pre-merge).
function buildLevelUp(me) {
  const cost = me.nextLevelCost;
  if (cost == null) return "";
  const level = me.level ?? 1;
  const bodyName = (state.bodies || {})[me.bodyKey]?.name || me.bodyKey || "your body";
  const partyN = me.partySize ?? 1;
  const levelScope = partyN > 1 ? `party-wide · all ${partyN} bodies` : "run-wide";
  const spares = backpackSpare(me);
  const haveVal = spares.reduce((s, c) => s + (c.value ?? 0), 0);
  // BANKED TREASURE (owner 2026-07-06): convertBag's ◈ auto-covers whatever the tendered cards
  // don't — the server (tenderWithTreasure) deducts only the shortfall, never more.
  const bank = me.treasure ?? 0;
  const sheetBudget = (me.levelPoints ?? Math.max(0, level - 1)) + (_lvlOpen ? 1 : 0);
  const freePoints = Math.max(0, sheetBudget - levelAllocUsed(me));
  const panelOpen = _levelPanelOpen || _lvlOpen;
  const wrap = (content = "") => collapsiblePanelHtml("level", "⭐ LEVEL UP",
    `${bodyName} · Lv ${level}${freePoints ? ` · ${freePoints}pt free` : ""}`, panelOpen, content);
  if (!panelOpen) return wrap();
  if (!_lvlOpen) {
    const canOpen = haveVal + bank >= cost;
    const rows = buildLevelRows(me, me.levelPoints ?? Math.max(0, level - 1));
    const edited = levelAllocFor(me), allocationChanged = !sameLevelAllocation(me.levelAllocation, edited);
    return wrap(`<div class="km-levelup">
      <span class="lvl-info">⭐ <b>${bodyName}</b> · Lv ${level} <span class="dcd">(${levelScope})</span>${bank > 0 ? ` · 💎<b class="cval">◈${bank}</b>` : ""}</span>
      ${canOpen ? `<button class="km-lvl-btn" data-lvlopen="1"
        title="Raise every body in this party by one level. Cost equals ${partyN} ordinary level-up${partyN === 1 ? "" : "s"}.">Level Up ▲ <b class="cval">◈${cost}</b></button>`
        : `<span class="km-lvl-locked" title="Level up with spare backpack cards or banked treasure.">Next level · need <b class="cval">◈${cost}</b> in spares${bank > 0 ? " + 💎" : ""}</span>`}
      ${rows}
      ${allocationChanged ? `<span class="km-lvl-saving">Saving allocation…</span>` : ""}
    </div>`);
  }
  // expanded picker — prune a stale selection (cards spent/moved out from under us) against the live spares
  const bpCount = _multiset(spares.map((c) => c.key)), payCount = {};
  _lvlPay = _lvlPay.filter((k) => { payCount[k] = (payCount[k] || 0) + 1; return payCount[k] <= (bpCount[k] || 0); });
  const paid = _lvlPay.reduce((s, k) => s + (spares.find((c) => c.key === k)?.value ?? 0), 0);
  const bankUsed = Math.min(bank, Math.max(0, cost - paid));   // the shortfall 💎 will cover
  const enough = paid + bankUsed >= cost;   // COVER the cost (owner rule) — banked ◈ closes any gap it can
  const tendered = _multiset(_lvlPay), seen = {};
  const tiles = spares.map((c) => {
    seen[c.key] = (seen[c.key] || 0) + 1;
    const isPay = seen[c.key] <= (tendered[c.key] || 0);   // this COPY (nth of its key) is tendered
    return `<button class="draft-opt km-card${isPay ? " sel" : ""}" data-lvlpay="${c.key}" data-paid="${isPay ? 1 : 0}" title="${c.text || ""}">
      ${cardFaceHtml(c, isPay ? "◈ tendered" : "")}
    </button>`;
  }).join("");
  const rows = buildLevelRows(me, (me.levelPoints ?? Math.max(0, level - 1)) + 1);
  return wrap(`<div class="km-levelup km-levelup-open">
    <div class="tender-paybar">
      <span class="tender-paymsg">Level <b>${partyN > 1 ? `party (${partyN} bodies)` : bodyName}</b> → Lv ${level + 1} · ◈${cost} — tendered
        <b class="${enough ? "ante-ok" : "ante-no"}">◈${paid}${bankUsed > 0 ? ` + 💎◈${bankUsed}` : ""}/${cost}</b>${enough ? " ✓" : ""}</span>
      <button class="km-lvl-btn tender-confirm" data-lvlconfirm="1" ${enough ? "" : "disabled"}>✓ Level Up</button>
      <button class="lane-btn" data-lvlcancel="1">Cancel</button>
    </div>
    ${rows}
    <div class="km-deck-h">💳 PAY WITH SPARE CARDS <span class="dcd">— tap to tender (cover ◈${cost})</span></div>
    <div class="draft-grid tender-shelf">${tiles || `<span class="lane-empty">— no spare cards to tender — move some out of your deck first —</span>`}</div>
  </div>`);
}
// Wire the level-up picker inside an overlay (won + setup). `rerender` repaints the host screen after a
// tender tap/open/cancel; Confirm sends the CHOSEN pay keys (the server re-validates via tenderValue).
function wireLevelUp(ov, me, rerender) {
  ov.querySelectorAll("[data-levelpanel]").forEach((b) => b.onclick = () => {
    const wasOpen = _levelPanelOpen || _lvlOpen;
    _levelPanelOpen = !wasOpen;
    uiTelem("panel", _levelPanelOpen ? "level_open" : "level_close");
    if (wasOpen && _lvlOpen) {
      _lvlOpen = false; _lvlPay = []; _lvlAlloc = null; _lvlAllocOwner = null; _lvlAllocPending = false;
    }
    rerender?.();
  });
  ov.querySelectorAll("[data-lvlopen]").forEach((b) => b.onclick = () => {
    uiTelem("panel", "level_open");
    _levelPanelOpen = true; _lvlOpen = true; _lvlPay = []; rerender?.();
  });
  ov.querySelectorAll("[data-lvlcancel]").forEach((b) => b.onclick = () => {
    _lvlOpen = false; _lvlPay = []; _lvlAlloc = null; _lvlAllocOwner = null; _lvlAllocPending = false; rerender?.();
  });
  ov.querySelectorAll("[data-lvlrank]").forEach((b) => b.onclick = () => {
    const a = levelAllocFor(me), key = b.dataset.lvlrank, dir = Number(b.dataset.dir) || 0;
    const next = Math.max(0, (a[key] || 0) + dir);
    const cap = b.dataset.cap === "" || b.dataset.cap == null ? null : Number(b.dataset.cap);
    if (cap != null && next > cap) return;
    const before = a[key] || 0; a[key] = next;
    const budget = (me.levelPoints ?? Math.max(0, (me.level ?? 1) - 1)) + (_lvlOpen ? 1 : 0);
    if (levelAllocUsed(me, a) > budget) a[key] = before;
    // Free reallocations are reversible and cost nothing, so each valid tap is authoritative now.
    // The old extra "Apply" button let players enter combat with a build that existed only locally.
    if (!_lvlOpen && a[key] !== before) {
      _lvlAllocPending = true;
      send({ type: "allocateLevel", allocation: { ...a } });
    }
    rerender?.();
  });
  ov.querySelectorAll("[data-lvlpay]").forEach((b) => b.onclick = () => {
    const k = b.dataset.lvlpay;
    // decide by THIS copy's tendered state, not mere key presence — so a 2nd/3rd copy of the same
    // card can be tendered (tapping an untendered copy always ADDS; tapping a tendered one takes one back)
    if (b.dataset.paid === "1") { const idx = _lvlPay.indexOf(k); if (idx >= 0) _lvlPay.splice(idx, 1); }
    else _lvlPay.push(k);
    rerender?.();
  });
  ov.querySelectorAll("[data-lvlconfirm]").forEach((b) => b.onclick = () => {
    // an EMPTY tender is fine when the 💎 bank covers the whole cost (server deducts the shortfall)
    if (!_lvlPay.length && (me.treasure ?? 0) < (me.nextLevelCost ?? Infinity)) return;
    const pay = [..._lvlPay];
    send({ type: "levelUp", pay, allocation: { ...levelAllocFor(me) } });
    _lvlOpen = false; _lvlPay = []; _lvlAlloc = null; _lvlAllocOwner = null; _lvlAllocPending = false;
  });
}
// One card tile (shared look across deck / backpack / loot): name, ◈value, ⚡cost, text.
// `attr`/`val` wire the click data-attribute; `dis` greys it; `extra` adds a trailing line.
// Engine-derived scale metadata. Card faces use the symbol; the longer wording is progressive
// disclosure for hover/hold and assistive labels instead of a repeated pill on every card.
const SCALE_DOM = {
  melee:  { word: "Melee scaling",  glyph: "🗡",   bg: "#e7d3a8", fg: "#1a140a" },
  ranged: { word: "Ranged scaling", glyph: "🎯",   bg: "#8fd8ff", fg: "#08131c" },
  both:   { word: "Melee + ranged", glyph: "🗡🎯", bg: "#ffd24a", fg: "#1a1400" },
  none:   { word: "Utility",        glyph: "◆",   bg: "#9aa3b0", fg: "#0c0f15" },
};
function scaleMeta(c) {
  return SCALE_DOM[c?.scale]
    || SCALE_DOM[c?.bothKinds ? "both" : c?.kind === "melee" ? "melee" : (c?.ranged || c?.kind === "ranged") ? "ranged" : "none"];
}
function scaleChip(c) {
  const b = scaleMeta(c);
  return `<span class="km-scale" style="--scale-bg:${b.bg};--scale-fg:${b.fg}" title="${b.word}" aria-label="${b.word}">${b.glyph}</span>`;
}
function cardFaceHtml(c, extra = "") {
  const sum = String(c.sum || c.dmg || "");   // base first-glance number line (out-of-combat = no live bonus)
  const scale = scaleMeta(c);
  const scaleAlreadyInSummary = !!sum && sum.includes(scale.glyph);
  return `<span class="km-card-art" aria-hidden="true">${cardIconImg(c.key)}</span>
    <span class="km-card-copy">
      <span class="dn"><span class="km-card-name">${c.name || c.key}</span>${c.value != null ? ` <b class="cval">◈${c.value}</b>` : ""}</span>
      <span class="km-cardmeta">${scaleAlreadyInSummary ? "" : scaleChip(c)}${sum ? `<span class="km-sum">${sum}</span>` : ""}${c.cost != null ? `<span class="km-cost">${paymentText(c)}</span>` : ""}</span>
      <span class="dt">${c.text || ""}</span>
      ${extra ? `<span class="dcd">${extra}</span>` : ""}
    </span>`;
}
function cardTile(c, attr, val, dis, extra) {
  const sum = c.sum || c.dmg || "";
  const scale = scaleMeta(c);
  const label = `${c.name || c.key}. ${scale.word}. ${sum ? sum + ". " : ""}${c.cost != null ? `Cost ${paymentText(c)}. ` : ""}${c.value != null ? `Value ${c.value}. ` : ""}${c.text || ""}`;
  return `<button class="draft-opt km-card${dis ? " is-locked" : ""}" data-${attr}="${val}"${dis ? ` data-locked="1" aria-disabled="true"` : ""} title="${c.text || ""}" aria-label="${escAttr(label)}">
    ${cardFaceHtml(c, extra)}
  </button>`;
}
// THE DECK-BUILDER (outside combat). Two groups: DECK (me.deckList) and BACKPACK
// (owned-not-in-deck). Tap a deck card → moveToBackpack; tap a backpack card → moveToDeck. The deck
// can't drop below the floor (server refuses), so at the floor the deck cards grey out. The caller
// supplies a `rerender` (clears its sig + re-renders) used to repaint after a move next tick.
function buildDeckBuilder(me) {
  const deck = me.deckList || [];
  const spare = backpackSpare(me);
  const size = me.deckSize ?? deck.length;
  const min = me.minDeck ?? 10;
  const max = me.maxDeck ?? Infinity;
  const atFloor = size <= min;     // removing any deck card now is refused by the server
  const atCeiling = size >= max;
  const deckCards = deck.length
    ? deck.map((c) => cardTile(c, "todeck-remove", c.key, atFloor)).join("")
    : `<span class="lane-empty">— deck empty —</span>`;
  const spareCards = spare.length
    ? spare.map((c) => cardTile(c, "todeck-add", c.key, atCeiling)).join("")
    : `<span class="lane-empty">— all owned cards are in the deck —</span>`;
  // CONVERT THE BAG (owner 2026-07-06): melt ALL spares into banked 💎◈ for level-ups/adoptions.
  // Large, full-width callout: this is a progression/economy action, not header chrome.
  const bagVal = spare.reduce((s, c) => s + (c.value ?? 0), 0);
  const bank = me.treasure ?? 0;
  const wornSpares = spare.some((c) => c.passive);   // melting a worn passive (Cool Shoes) kills its effect
  const convert = `<div class="km-convert${spare.length ? "" : " is-empty"}">
      <button class="km-convert-main" data-convarm="1" ${spare.length ? "" : "disabled"}
        title="Melt EVERY spare card into banked 💎◈ to spend on level-ups and body adoptions. Your deck is untouched. Spent worn passives stop working.">
        <span class="km-convert-icon">♻</span>
        <span class="km-convert-copy"><b>MELT EXCESS CARDS</b><small>${spare.length ? `${spare.length} backpack card${spare.length === 1 ? "" : "s"} · deck untouched` : "No excess cards to melt"}</small></span>
        <span class="km-convert-payout"><small>GET</small><b>+◈${bagVal}</b></span>
      </button>
      <div class="km-convconfirm hidden">
        <span><b>Melt all ${spare.length}?</b>${wornSpares ? " Worn passives will stop working." : " Your deck stays safe."} This can't be undone.</span>
        <button class="km-lvl-btn tender-confirm km-convert-confirm" data-convgo="1">✓ MELT · +◈${bagVal}</button>
        <button class="lane-btn km-convert-cancel" data-convcancel="1">Cancel</button>
      </div>
      <div class="km-convert-bank">BANK AFTER MELT <b>💎◈${bank + bagVal}</b></div>
    </div>`;
  const panelOpen = _deckPanelOpen;
  const wrap = (content = "") => collapsiblePanelHtml("deck", "🎒 DECK & BACKPACK",
    `${deck.length} deck · ${spare.length} spare${bank > 0 ? ` · 💎◈${bank}` : ""}`, panelOpen, content);
  if (!panelOpen) return wrap();
  return wrap(`<div class="km-deckbuild">
    <p class="draft-sub deck-guide" style="margin:0 0 6px">
      <span class="deck-rule${atFloor ? " ante-no" : ""}">${Number.isFinite(max)
        ? `🔒 Companion deck stays at exactly ${min} cards · use Party Equipment to swap a slot`
        : atFloor ? `🔒 ${min}-card minimum · add a spare before removing one`
        : "Tap cards to move them between deck and backpack"}</span>
      <span class="card-legend">🗡 melee · 🎯 ranged · ◆ utility · hold to read</span></p>
    ${convert}
    <div class="km-deck-cols">
      <div class="km-deck-group">
        <div class="km-deck-h"><span class="km-deck-label">🃏 DECK <span class="dcd">(${deck.length})</span></span></div>
        <div class="draft-grid">${deckCards}</div>
      </div>
      <div class="km-deck-group">
        <div class="km-deck-h"><span class="km-deck-label">🎒 BACKPACK <span class="dcd">(${spare.length} spare)</span></span></div>
        <div class="draft-grid">${spareCards}</div>
      </div>
    </div>
  </div>`);
}
// Wire the deck-builder. Moves just send; the next snapshot carries the new deck/backpack and the
// overlay re-renders itself (deckList/backpack are in the render sig), so no manual repaint needed.
// The ♻ convert flow is a local two-step (arm → are-you-sure → send) — DOM-toggled in place, no rerender.
function wireDeckBuilder(ov, rerender) {
  ov.querySelectorAll("[data-deckpanel]").forEach((b) => b.onclick = () => {
    _deckPanelOpen = !_deckPanelOpen;
    uiTelem("panel", _deckPanelOpen ? "deck_open" : "deck_close");
    rerender?.();
  });
  const move = (b, type, key) => {
    if (b.classList.contains("is-pending")) return;
    b.classList.add("is-pending"); b.setAttribute("aria-busy", "true");
    send({ type, key });
    setTimeout(() => { if (b.isConnected) { b.classList.remove("is-pending"); b.removeAttribute("aria-busy"); } }, PEND_MS);
  };
  ov.querySelectorAll("[data-todeck-add]").forEach((b) =>
    b.onclick = () => { if (b.dataset.locked !== "1") move(b, "moveToDeck", b.dataset.todeckAdd); });
  ov.querySelectorAll("[data-todeck-remove]").forEach((b) =>
    b.onclick = () => { if (b.dataset.locked !== "1") move(b, "moveToBackpack", b.dataset.todeckRemove); });
  ov.querySelectorAll("[data-convarm]").forEach((b) => b.onclick = () => {
    uiTelem("economy", "melt_arm");
    b.classList.add("hidden");
    b.parentElement.querySelector(".km-convconfirm")?.classList.remove("hidden");
  });
  ov.querySelectorAll("[data-convcancel]").forEach((b) => b.onclick = () => {
    uiTelem("economy", "melt_cancel");
    const wrap = b.closest(".km-convert");
    wrap?.querySelector(".km-convconfirm")?.classList.add("hidden");
    wrap?.querySelector("[data-convarm]")?.classList.remove("hidden");
  });
  ov.querySelectorAll("[data-convgo]").forEach((b) => b.onclick = () => send({ type: "convertBag" }));
}

// PARTY EQUIPMENT: one compact two-tap board across every body this seat owns. Within one body,
// tap one deck card and one stash card to replace the deck slot. Across bodies, tap any two cards
// to swap them in place; a selected stash card can instead move straight into another member's
// stash. Exact deck/stash zones are sent so duplicate card keys cannot replace the wrong copy.
function buildPartyLoadout() {
  const party = (state?.players || []).filter(isMine)
    .sort((a, b) => (a.id === you ? -1 : b.id === you ? 1 : (a.id < b.id ? -1 : 1)));
  if (party.length < 2) { _partyMove = null; return ""; }
  const selectedPlayer = _partyMove && party.find((p) => p.id === _partyMove.body);
  const selectedCards = selectedPlayer
    ? (_partyMove.zone === "deck" ? selectedPlayer.deckList || [] : backpackSpare(selectedPlayer))
    : [];
  if (_partyMove && !selectedCards.some((c) => c.key === _partyMove.key)) _partyMove = null;
  const selectedBody = _partyMove ? party.find((p) => p.id === _partyMove.body) : null;
  const selectedRole = selectedBody?.id === you ? "Main" : selectedBody?.name || "Companion";
  const selectedName = _partyMove
    ? `${selectedRole} ${_partyMove.zone === "deck" ? "deck" : "stash"} · ${
        (selectedCards.find((c) => c.key === _partyMove.key)?.name) || _partyMove.key}`
    : "Select a card";
  const cardButton = (p, c, zone) => {
    const selected = _partyMove?.body === p.id && _partyMove?.key === c.key && _partyMove?.zone === zone;
    const sameBodyReplacement = !!_partyMove && _partyMove.body === p.id && _partyMove.zone !== zone;
    const crossBodySwap = !!_partyMove && _partyMove.body !== p.id;
    const action = selected ? `${zone} selected`
      : sameBodyReplacement ? "tap to replace"
      : crossBodySwap ? "tap to swap"
      : zone === "deck" ? "in deck" : "in stash";
    return `<button class="draft-opt km-card party-equip-card${selected ? " sel" : ""}${sameBodyReplacement ? " is-replace-target" : ""}"
      data-partycard-body="${escAttr(p.id)}" data-partycard-key="${escAttr(c.key)}" data-partycard-zone="${zone}"
      aria-label="${escAttr(`${c.name || c.key}. ${action}.`)}">
      ${cardFaceHtml(c, action)}
    </button>`;
  };
  const bodies = party.map((p, index) => {
    const deck = p.deckList || [], spare = backpackSpare(p);
    const role = p.id === you ? "MAIN" : `COMPANION ${index}`;
    const bodyName = state.bodies?.[p.bodyKey]?.name || p.bodyKey || "Body";
    const canMoveHere = _partyMove?.zone === "spare" && _partyMove.body !== p.id;
    const selectedHere = _partyMove?.body === p.id;
    return `<article class="party-loadout-body${selectedHere ? " is-selected" : ""}" data-party-body="${escAttr(p.id)}">
      <header>${iconImg(formArt(p))}<span><b>${role} · ${bodyName}</b><small>Lv ${p.level ?? 1} · ${deck.length}${p.maxDeck ? `/${p.maxDeck}` : ""} cards</small>${
        p.partyRole === "companion" ? `<small class="party-edit-hint">Deck ↔ stash: tap one card in each</small>` : ""
      }</span></header>
      <div class="km-deck-h">DECK · ${deck.length}</div>
      <div class="party-equip-grid">${deck.map((c) => cardButton(p, c, "deck")).join("")}</div>
      <div class="km-deck-h">STASH · ${spare.length}</div>
      <div class="party-equip-grid">${spare.length ? spare.map((c) => cardButton(p, c, "spare")).join("")
        : `<span class="lane-empty">— none —</span>`}</div>
      <button class="lane-btn party-move-here" data-partydest="${escAttr(p.id)}"${canMoveHere ? "" : " disabled"}>
        Move selected stash card here
      </button>
    </article>`;
  }).join("");
  const content = `<div class="party-loadout-guide"><b>${escTip(selectedName)}</b><span>${
    _partyMove
      ? `Now tap a ${_partyMove.zone === "deck" ? "stash" : "deck"} card in ${escTip(selectedRole)} to replace it. Other bodies are also valid swap targets.`
      : "Edit a companion: tap a deck card, then tap its stash replacement."
  }</span></div><div class="party-loadout-grid">${bodies}</div>`;
  return collapsiblePanelHtml("party", "↔ PARTY EQUIPMENT",
    `${party.length} bodies · tap deck + stash to replace`, _partyPanelOpen, content);
}

function wirePartyLoadout(ov, rerender) {
  ov.querySelectorAll("[data-partypanel]").forEach((b) => b.onclick = () => {
    _partyPanelOpen = !_partyPanelOpen;
    rerender?.();
  });
  ov.querySelectorAll("[data-partycard-body]").forEach((b) => b.onclick = () => {
    const next = { body: b.dataset.partycardBody, key: b.dataset.partycardKey, zone: b.dataset.partycardZone };
    const swap = (from, to) => send({
      type: "swapItem", from: from.body, to: to.body,
      fromKey: from.key, toKey: to.key,
      fromDeck: from.zone === "deck", toDeck: to.zone === "deck",
    });
    if (!_partyMove) _partyMove = next;
    else if (_partyMove.body === next.body && _partyMove.key === next.key && _partyMove.zone === next.zone)
      _partyMove = null;
    else if (_partyMove.body === next.body && _partyMove.zone !== next.zone) {
      swap(_partyMove, next);
      _partyMove = null;
    }
    else if (_partyMove.body === next.body) _partyMove = next;
    else {
      swap(_partyMove, next);
      _partyMove = null;
    }
    rerender?.();
  });
  ov.querySelectorAll("[data-partydest]").forEach((b) => b.onclick = () => {
    if (!_partyMove || _partyMove.zone !== "spare" || _partyMove.body === b.dataset.partydest) return;
    send({
      type: "moveItem", from: _partyMove.body, to: b.dataset.partydest,
      key: _partyMove.key, fromDeck: false,
    });
    _partyMove = null;
    rerender?.();
  });
}

// ── PARTY LOOT ASSIGN (owner 2026-07-24: "Change party mode to not bother with the stash. Let me
// just get the loot, easily sort it out to each companion or my main body.") ──────────────────
// The whole flow is TAP A LOOTED CARD → TAP A DESTINATION, on the won screen, with no stash detour.
// Wire format is one message: {type:"assignLoot", key, to, out}. `out` is REQUIRED for a companion
// (its deck is locked at exactly 3, so the incoming card REPLACES a named slot and the outgoing
// card goes back onto the SHARED loot pool) and ignored by the main body, which appends.
// Two accepted paths, both live: card → slot (direct), or card → companion → slot (focus first).
// The stash/backpack route (claimLoot + the deck builder) is untouched and still serves solo and
// ordinary co-op — this is Party mode's route, added alongside it.
const partyBodies = () => (state?.players || []).filter(isMine)
  .sort((a, b) => (a.id === you ? -1 : b.id === you ? 1 : (a.id < b.id ? -1 : 1)));
// Party mode = this seat drives a main body plus at least one companion. Ordinary co-op seats own
// exactly one body and never see the assign tab.
function partyModeOn() {
  const mine = partyBodies();
  return mine.length > 1 && mine.some((p) => p.partyRole === "companion");
}
// ── AUTO-ACQUIRE (owner 2026-07-26: "It should be in party mode like solo except I have the option
// to easily put each item to a party member instead of myself. I had to click through the items way
// too much.") The room's spoils now land in the seat's MAIN body's backpack on clear, with ZERO
// taps — so this board no longer BUYS cards out of a shared pool, it DISTRIBUTES cards the seat
// already owns. Its source list is every SPARE the seat holds: a backpack copy that body's own deck
// does not claim, which is exactly what the 🎒 and the melt button already mean. Cards this room
// dropped are badged NEW and sort first, so "the spoils I just got" stay one glance away.
// The shared-pool path is still rendered identically when a pool exists (ordinary co-op), so one
// board serves both and there is no second screen to keep in sync.
function seatSpares() {
  const out = [];
  for (const p of partyBodies()) {
    const deck = {};
    for (const c of (p.deckList || [])) deck[c.key] = (deck[c.key] ?? 0) + 1;
    const seen = {};
    for (const c of (p.backpack || [])) {
      seen[c.key] = (seen[c.key] ?? 0) + 1;
      if (seen[c.key] > (deck[c.key] ?? 0)) out.push({ card: c, holder: p });   // mirrors backpackSpares
    }
  }
  return out;
}
// The board's tiles: one per (key, holder), with a ×N count so three copies cost one glance, not
// three. `from` is null for a shared-pool card (co-op) and the holder id for an owned spare.
function assignSources() {
  const fresh = new Set(state.lootTaken || []);
  const pool = ((state.loot && state.loot.cards) || [])
    .map((c) => ({ key: c.key, card: c, from: null, holder: null, n: 1, fresh: false, pool: true }));
  const byBody = new Map();
  for (const { card, holder } of seatSpares()) {
    const id = `${holder.id} ${card.key}`;
    if (byBody.has(id)) { byBody.get(id).n++; continue; }
    byBody.set(id, { key: card.key, card, from: holder.id, holder, n: 1,
      fresh: fresh.has(card.key), pool: false });
  }
  const owned = [...byBody.values()].sort((a, b) =>
    (b.fresh - a.fresh) || ((b.card.value ?? 0) - (a.card.value ?? 0))
    || String(a.card.name || a.key).localeCompare(String(b.card.name || b.key)));
  return [...pool, ...owned];
}
let _assignSel = null;     // { key, from } — the card awaiting a destination (from=null → shared pool)
let _assignBody = null;    // optional focused companion (the card → companion → slot path)
let _assignEcho = null;    // { in, out, to, at } — the last companion swap, so the returned card is legible
// The 3-card companion rule is the ENGINE's (deckMaxFor); read it off the snapshot rather than
// restating it here, so a re-ruling in the engine can never be contradicted by this screen.
const companionCap = (p) => (p.maxDeck ?? null);
function buildLootAssign(myPts, gated) {
  const party = partyBodies();
  const sources = assignSources();
  const priced = gated && (state.players || []).filter((p) => !p.bot).length > 1;   // mirrors lootPriced
  // AFFORDABILITY mirrors the engine exactly (itemTreasure vs the SEAT's bidPoints, and only where
  // 2+ HUMAN SEATS actually bid), so we never light a destination the server would bounce. A card
  // the seat already owns is never priced.
  const afford = (src) => !priced || !src.pool || ((src.card.value ?? 0) <= myPts);
  const same = (a, b) => !!a && !!b && a.key === b.key && (a.from ?? null) === (b.from ?? null);
  if (_assignSel && !sources.some((s) => same(s, _assignSel) && afford(s))) { _assignSel = null; _assignBody = null; }
  if (_assignBody && !party.some((p) => p.id === _assignBody && p.partyRole === "companion")) _assignBody = null;
  // Hold the "came back" marker until the snapshot has actually re-listed the card (PEND_MS covers
  // the round trip), then until it is routed somewhere else.
  if (_assignEcho && Date.now() - _assignEcho.at > PEND_MS
    && !sources.some((s) => s.key === _assignEcho.out)) _assignEcho = null;

  const selSrc = sources.find((s) => same(s, _assignSel)) || null;
  const selCard = selSrc?.card || null;
  const nameOf = (k) => sources.find((s) => s.key === k)?.card?.name || k;
  const shortName = (p) => (state.bodies?.[p.bodyKey]?.name || p.bodyKey || "body");
  const lootTiles = sources.map((s) => {
    const c = s.card, ok = afford(s), sel = same(s, _assignSel);
    const returned = _assignEcho?.out === c.key && !s.pool;
    const where = s.pool ? "shared pool"
      : s.holder.id === you ? "on you" : `on ${shortName(s.holder)}`;
    const note = sel ? "▼ pick a destination"
      : !ok ? `🔒 need ◈${c.value ?? 0}`
      : returned ? "↩ came off that companion — re-assign it"
      : s.fresh ? `✨ NEW · ${where}`
      : where;
    return `<button class="draft-opt km-card party-equip-card${sel ? " sel" : ""}${returned ? " is-returned" : ""}${s.fresh ? " is-fresh" : ""}"
      data-assignloot="${escAttr(c.key)}" data-assignfrom="${escAttr(s.from ?? "")}"
      ${ok ? "" : ` data-locked="1" aria-disabled="true"`}
      title="${escAttr(c.text || "")}"
      aria-label="${escAttr(`${c.name || c.key}${s.n > 1 ? ` ×${s.n}` : ""}. Value ${c.value ?? 0}. ${where}. ${note}.`)}">
      ${cardFaceHtml(c, note)}${s.n > 1 ? `<span class="assign-count">×${s.n}</span>` : ""}
    </button>`;
  }).join("");

  const bodies = party.map((p) => {
    const companion = p.partyRole === "companion";
    const deck = p.deckList || [];
    const owned = new Set((p.backpack || []).map((c) => c.key));
    const cap = companionCap(p);
    const bodyName = state.bodies?.[p.bodyKey]?.name || p.bodyKey || "Body";
    const role = companion ? "COMPANION" : "MAIN";
    const focused = _assignBody === p.id;
    const dimmed = !!_assignBody && !focused && companion;
    const slots = deck.map((c, si) => {
      // A slot is a legal swap target only when a card is selected, the target is a companion, the
      // slot is not the very card coming in (the engine refuses key === out), and the ledger really
      // owns it (the engine refuses a deck card missing from the backpack).
      const valid = !!_assignSel && companion && c.key !== _assignSel.key && owned.has(c.key) && !dimmed;
      const note = valid
        ? `↔ swap out · ${nameOf(_assignSel.key)} takes slot ${si + 1}`
        : _assignSel && companion && c.key === _assignSel.key ? "same card — pick another slot"
        : `slot ${si + 1}`;
      return `<button class="draft-opt km-card party-equip-card${valid ? " is-replace-target" : ""}"
        data-assignslot-body="${escAttr(p.id)}" data-assignslot-key="${escAttr(c.key)}"
        ${valid ? "" : ` data-locked="1" aria-disabled="true"`}
        title="${escAttr(c.text || "")}"
        aria-label="${escAttr(`${c.name || c.key}. ${note}.`)}">
        ${cardFaceHtml(c, note)}
      </button>`;
    }).join("");
    const rule = companion
      ? `🔒 deck locked at ${cap ?? deck.length} — assigning REPLACES a slot`
      : `∞ no limit — assigning ADDS a card`;
    // MAIN BODY: appends. When the selected card is ALREADY a spare on this very body (the normal
    // case after auto-acquire) the engine reads the same message as "commit it to this body's own
    // deck", so the button says what it will actually do rather than promising a move.
    const here = !!_assignSel && _assignSel.from === p.id;
    const action = companion
      ? `<button class="lane-btn party-move-here" data-assignbody="${escAttr(p.id)}"${_assignSel ? "" : " disabled"}>
          ${focused ? "▲ Pick a slot above" : `Swap into ${escTip(bodyName)}…`}</button>`
      : `<button class="lane-btn party-move-here" data-assignmain="${escAttr(p.id)}"${_assignSel ? "" : " disabled"}>
          ${_assignSel
            ? `＋ ${here ? "Put" : "Move"} ${escTip(nameOf(_assignSel.key))} in ${escTip(bodyName)}'s deck`
            : "＋ Add selected card here"}</button>`;
    return `<article class="party-loadout-body${focused ? " is-selected" : ""}${dimmed ? " is-dimmed" : ""}"
      data-assign-body-card="${escAttr(p.id)}">
      <header>${iconImg(formArt(p))}<span><b>${role} · ${bodyName}</b>
        <small>Lv ${p.level ?? 1} · ${deck.length}${cap ? `/${cap}` : ""} cards</small>
        <small class="party-edit-hint">${rule}</small></span></header>
      <div class="km-deck-h">DECK · ${deck.length}${cap ? ` / ${cap}` : ""}</div>
      <div class="party-equip-grid">${slots || `<span class="lane-empty">— empty —</span>`}</div>
      ${action}
    </article>`;
  }).join("");

  // PARTY-WIDE MELT (owner 2026-07-24: melt every spare across the whole party in ONE action instead
  // of opening each body). Mirrors the single-body MELT EXCESS CARDS affordance exactly — same
  // arm→confirm safety gate, same worn-passive warning, same BANK AFTER readout — but one tap covers
  // every body this seat drives. The totals are the ENGINE's own pre-tap projection
  // (`players[].partyBag` = partySpareSummary), never re-derived here, so this button can never
  // promise a number the server would not mint. Wire: {type:"convertPartyBags"}. It renders only
  // when the snapshot actually carries the projection, so an older server simply shows no control.
  const seat = party.find((p) => p.id === you) || party[0] || {};
  const bag = seat.partyBag || null;
  const meltable = (bag?.count ?? 0) > 0;
  const bodyWord = (n) => `bod${n === 1 ? "y" : "ies"}`;
  const partyMelt = !bag ? "" : `<div class="km-deck-h">♻ SPARE CARDS · WHOLE PARTY</div>
    <div class="km-convert${meltable ? "" : " is-empty"}">
      <button class="km-convert-main" data-partymeltarm="1"${meltable ? "" : " disabled"}
        title="Melt EVERY spare card across all ${party.length} bodies you drive into banked 💎◈ to spend on level-ups and body adoptions. Every deck is untouched. Spent worn passives stop working.">
        <span class="km-convert-icon">♻</span>
        <span class="km-convert-copy"><b>MELT EXCESS CARDS · WHOLE PARTY</b><small>${meltable
          ? `${bag.count} spare card${bag.count === 1 ? "" : "s"} across ${bag.bodies} ${bodyWord(bag.bodies)} · every deck untouched`
          : "No excess cards anywhere in the party"}</small></span>
        <span class="km-convert-payout"><small>GET</small><b>+◈${bag.value}</b></span>
      </button>
      <div class="km-convconfirm hidden">
        <span><b>Melt all ${bag.count} across ${bag.bodies} ${bodyWord(bag.bodies)}?</b>${bag.hasPassive
          ? " A WORN PASSIVE is in there — it will stop working."
          : " Every deck stays safe."} This can't be undone.</span>
        <button class="km-lvl-btn tender-confirm km-convert-confirm" data-partymeltgo="1">✓ MELT PARTY · +◈${bag.value}</button>
        <button class="lane-btn km-convert-cancel" data-partymeltcancel="1">Cancel</button>
      </div>
      <div class="km-convert-bank">BANK AFTER MELT <b>💎◈${(seat.treasure ?? 0) + bag.value}</b></div>
    </div>`;

  // NOTE: already-escaped MARKUP — do not run this through escTip at the call site.
  const fresh = (state.lootTaken || []).length;
  const poolLeft = sources.filter((s) => s.pool).length;
  const mainName = state.bodies?.[(party.find((p) => p.id === you) || party[0] || {}).bodyKey]?.name || "you";
  const headline = selCard
    ? `${escTip(selCard.name || selCard.key)} <b class="cval">◈${selCard.value ?? 0}</b> selected`
    : fresh ? `✔ ${fresh} card${fresh === 1 ? "" : "s"} collected — already yours`
    : sources.length ? "Tap a card to move it" : "Nothing to hand out";
  const guide = selCard
    ? (_assignBody
        ? `Tap one of the 3 deck slots above — that card comes back to ${escTip(mainName)}.`
        : `Now tap a companion deck slot to REPLACE it, or “＋” on your main body.`)
    : fresh
      ? `The room's spoils went straight to ${escTip(mainName)}. Tap any card below to hand it to a party member instead.`
      : sources.length
        ? `Tap where it goes: a companion slot (1-for-1 swap, deck stays locked) or your main body.`
        : `Clear a room and its spoils land here automatically.`;
  const returned = _assignEcho && sources.some((s) => s.key === _assignEcho.out)
    ? `<p class="draft-sub assign-returned">↩ <b>${escTip(nameOf(_assignEcho.out))}</b> came off that companion and is back below — assign it to another body.</p>`
    : "";
  const pts = priced ? `<p class="draft-sub loot-pts">${(state.players || []).filter((p) => !p.bot)
    .map((p) => `${p.id === you ? "You" : escTip(p.name || "Adventurer")} <b class="cval">◈${p.bidPoints ?? 0}</b>`).join(" · ")}</p>` : "";
  return `<div class="party-loadout-guide"><b>${headline}</b><span>${guide}</span></div>
    ${returned}
    <div class="km-deck-h">🎁 YOUR SPOILS <span class="dcd">(${
      sources.reduce((n, s) => n + s.n, 0)} card${sources.length === 1 ? "" : "s"})${
      fresh ? ` — ${fresh} new this room` : ""}${
      poolLeft ? ` — ${poolLeft} unclaimed` : ""}${priced ? ` — you have ◈${myPts}` : ""}</span></div>
    ${pts}
    <div class="party-equip-grid assign-loot-grid">${lootTiles || `<span class="lane-empty">— nothing to hand out —</span>`}</div>
    <div class="party-loadout-grid">${bodies}</div>
    ${partyMelt}`;
}
// Wire the assign board. Every commit is ONE {assignLoot} message; the authoritative snapshot
// repaints the decks and the returned card (both are in the won-screen render signature).
function wireLootAssign(ov, rerender) {
  const commit = (to, out) => {
    const sel = _assignSel;
    if (!sel) return;
    // Echo only a REAL displacement: a same-body companion swap keeps the outgoing card on that very
    // body (it just becomes its spare), which the board already shows without a "came back" banner.
    _assignEcho = out && sel.from !== to ? { in: sel.key, out, to, at: Date.now() } : null;
    send({ type: "assignLoot", key: sel.key, to, out: out ?? null, from: sel.from ?? null });
    _assignSel = null; _assignBody = null;
    rerender?.();
  };
  ov.querySelectorAll("[data-assignloot]").forEach((b) => b.onclick = () => {
    if (b.dataset.locked === "1") return;
    const pick = { key: b.dataset.assignloot, from: b.dataset.assignfrom || null };
    const on = _assignSel && _assignSel.key === pick.key && (_assignSel.from ?? null) === pick.from;
    _assignSel = on ? null : pick;                 // tapping the chosen card again cancels
    if (!_assignSel) _assignBody = null;
    rerender?.();
  });
  ov.querySelectorAll("[data-assignbody]").forEach((b) => b.onclick = () => {
    if (!_assignSel) return;
    const id = b.dataset.assignbody;
    _assignBody = _assignBody === id ? null : id;
    rerender?.();
  });
  ov.querySelectorAll("[data-assignslot-body]").forEach((b) => b.onclick = () => {
    if (b.dataset.locked === "1" || !_assignSel) return;
    commit(b.dataset.assignslotBody, b.dataset.assignslotKey);
  });
  ov.querySelectorAll("[data-assignmain]").forEach((b) => b.onclick = () => commit(b.dataset.assignmain, null));
  // PARTY MELT: the same two-step arm→confirm the single-body melt uses (wireDeckBuilder), with its
  // own data hooks so the two controls can never bind each other's buttons. The server stamps the
  // economy/melt_confirm telemetry off the message itself, so only arm/cancel are reported here.
  ov.querySelectorAll("[data-partymeltarm]").forEach((b) => b.onclick = () => {
    uiTelem("economy", "melt_arm");
    b.classList.add("hidden");
    b.parentElement.querySelector(".km-convconfirm")?.classList.remove("hidden");
  });
  ov.querySelectorAll("[data-partymeltcancel]").forEach((b) => b.onclick = () => {
    uiTelem("economy", "melt_cancel");
    const wrap = b.closest(".km-convert");
    wrap?.querySelector(".km-convconfirm")?.classList.add("hidden");
    wrap?.querySelector("[data-partymeltarm]")?.classList.remove("hidden");
  });
  ov.querySelectorAll("[data-partymeltgo]").forEach((b) => b.onclick = () => send({ type: "convertPartyBags" }));
}

// The between-rooms (WON) screen: claim loot into the backpack, edit your combat deck, then choose
// the next room. Co-op loot is one run-scoped SHARED pool: anything unclaimed carries forward and
// returns on later won screens. Solo still auto-collects immediately (loot empty here).
function renderBetweenRooms() {
  const ov = $("draftOverlay");
  // SQUAD: loot/deck/swap apply to the ACTIVE (possessed) body — the server routes
  // claimLoot/moveToDeck/moveToBackpack/swapBody to whoever we possess.
  const me = pilot() || {};
  const earned = state.roomValue || 0; // the room's ante sum (display only — no gold credited)
  const loot = state.loot;
  const map = state.map || {};
  const complete = !!map.levelComplete;
  const cur = (map.nodes || []).find((n) => n.id === map.currentId);
  const trailhead = cur?.type === "start";   // run-start chooser: "choose your first room", no earnings line
  const nexts = complete ? [] : publicRoomNodes((cur?.links || [])
    .map((id) => (map.nodes || []).find((n) => n.id === id)));
  // PARTY MODE: the reward/assign board LEADS this screen (owner: "let me just get the loot, easily
  // sort it out"). Latched per room so it only overrides the default tab once — a player who taps
  // over to Rooms stays there for the rest of this won screen. Only leads when there is actually
  // something to hand out: the run-start chooser has no spoils, so the room picker still leads there.
  // Party spoils are AUTO-ACQUIRED now, so the lead condition is "this room actually dropped
  // something" (`lootTaken`) rather than "something is still unclaimed" — which is always 0 here.
  const partyMode = partyModeOn();
  const spoils = (state.lootTaken || []).length || (loot ? loot.cards.length : 0);
  const wonSig = `${state.floor ?? 0}:${map.currentId ?? ""}`;
  if (partyMode && spoils) {
    if (_lootLedFor !== wonSig) { _lootLedFor = wonSig; if (_ovTab === "rooms") _ovTab = "assign"; }
  } else if (!partyMode) { _lootLedFor = null; if (_ovTab === "assign") _ovTab = "rooms"; }
  const sig = JSON.stringify([loot && loot.cards.map((c) => c.key), earned,
    (me.backpack || []).map((c) => c.key), (me.deckList || []).map((c) => c.key), me.deckSize,
    nexts.map((n) => [n.id, n.type, n.ante, n.locked, n.cost, (n.contents || []).length]), complete, state.runWon, state.floor, activeId,
    map.roomsToBoss, map.currentRow, _ovTab, _levelPanelOpen, _deckPanelOpen, _partyPanelOpen,
    _partyMove, _assignSel?.key ?? null, _assignSel?.from ?? null, _assignBody,
    _assignEcho?.out ?? null, partyMode, spoils,
    _tradeTo, _tradeGive, _tradeWant,
    (state.trade?.offers || []).map((o) => o.id),
    state.roomVotes,   // co-op vote/lock state must rebuild the room picker when an icon moves
    me.level, LEVEL_ALLOC_KEYS.map((key) => me.levelAllocation?.[key] ?? 0),
    me.nextLevelCost, me.treasure, _lvlOpen, _lvlPay,   // level-up picker + 💎 bank must repaint on change
    (state.players || []).map((p) => [p.id, p.bidPoints ?? 0,
      (p.backpack || []).map((c) => c.key).join(), (p.deckList || []).map((c) => c.key).join()])]);
  // Returning from setup deliberately restores the exact room-options snapshot.  The data
  // signature therefore matches the screen we rendered before setup, but the DOM does not.
  // Only reuse a signature when that screen is still the one actually painted.
  if (_ovScreen === "won" && sig === _brSig) return;
  _brSig = sig;
  const selector = squadSelectorHtml();
  const rerender = () => { _brSig = ""; renderBetweenRooms(); };

  // SPOILS. Solo runs auto-collect into the backpack (loot null/empty) — say so rather than show a
  // dead panel. CO-OP (owner 2026-07-02, BID POINTS): each room's NEW drop value is split into per-seat
  // claim budgets (excess → the seat furthest behind). Unclaimed cards remain in this run-wide pool;
  // a later room can provide the points that make one affordable.
  // GATED = bid points are actually arbitrating, i.e. 2+ HUMAN SEATS (engine: lootPriced). It used
  // to count PLAYERS, so a one-seat party — whose companions are real player entities — showed a
  // co-op claim economy it never had. Party mode reads as solo here, which is what it now is.
  const gated = (state.players || []).filter((p) => !p.bot).length > 1;
  const myPts = (state.players || []).find((p) => p.id === you)?.bidPoints ?? 0;
  const partyPts = gated ? `<p class="draft-sub loot-pts">${(state.players || []).filter((p) => !p.bot)
    .map((p) => `${p.id === you ? "You" : escTip(p.name || "Adventurer")} <b class="cval">◈${p.bidPoints ?? 0}</b>`).join(" · ")}</p>` : "";
  const lootSection = loot && loot.cards.length ? `
    <p class="draft-sub" style="margin-top:6px">${gated
      ? `Shared spoils — unclaimed cards carry forward · you have <b class="cval">◈${myPts}</b> to spend:`
      : `Spoils — <b>free</b> to claim:`}</p>
    ${partyPts}
    <div class="draft-grid">${loot.cards.map((c) => {
      const afford = !gated || (c.value ?? 0) <= myPts;
      return cardTile(c, "loot", c.key, !afford, afford ? "＋ claim" : `need ◈${c.value ?? 0}`);
    }).join("")}</div>` : "";

  const swapLine = ` <button class="km-tier-btn" data-swapbody="1">🎭 Swap body (free)</button>`;

  // ROOMS tab: the path forward. When the floor's done it's a single Descend / New-Run button;
  // otherwise the boss counter + a what's-inside card per next room. In CO-OP (2+ human seats)
  // tapping a room CASTS a vote (the server treats {type:"advance"} as a vote), each voter's icon
  // rides the room they picked, and a Lock-in bar appears — the party moves when every seat locks.
  // Solo (≤1 seat) keeps the instant tap-to-go. BACKPACK tab: level-up, spoils, deck-builder, trade.
  const humanSeats = (state.players || []).filter((p) => !p.bot).length;
  const roomsTab = state.runWon
    ? `<div class="advance-row victory-actions">
         <button class="stock-begin" data-newrun="1">👑 NEW RUN ▶</button>
         <button class="advance-btn setup-position" data-leavetolobby="1">Leave to lobby</button>
       </div>`
    : complete
    ? `<button class="stock-begin" data-descend="1">Descend to ${(state.floor || 1) + 1 >= 4 ? "the THRONE ♛" : `Floor ${(state.floor || 1) + 1}`} ▶</button>`
    : `<div class="room-overview">${bossCounterHtml()}${mapButtonHtml()}</div>
       <p class="draft-sub" style="margin-top:8px">${humanSeats >= 2
          ? "Vote for the next room — the party moves when every seat locks in:"
          : "Pick a room:"} <span class="room-legend">⚖ threat · ◈ possible loot</span></p>
       ${roomCardsHtml(nexts, "advance")}
       ${humanSeats >= 2 ? roomVoteBar() : ""}`;
  const assignTab = partyMode ? buildLootAssign(myPts, gated) : "";
  const backpackTab = `${buildLevelUp(me)}${buildPartyLoadout()}
    ${(loot && loot.cards.length) ? `<div class="overlay-cols">
      <div class="ov-col">${lootSection}</div>
      <div class="ov-col">${buildDeckBuilder(me)}${buildOffersStrip()}${buildTradeCompose()}</div>
    </div>` : `${buildDeckBuilder(me)}${buildOffersStrip()}${buildTradeCompose()}`}`;

  ov.classList.remove("hidden");
  paintOverlay(ov, "won", `<div class="draft-card loot-wide">
    <h2>${state.runWon ? "👑 The King is dead — the throne is YOURS!" : complete ? "Boss slain! 👑" : trailhead ? "🚪 Choose your first room" : "Room cleared! 🎉"}</h2>
    ${selector}
    <p class="draft-sub" style="margin-top:2px">${complete
      ? `Boss slain — a shelf of RARES dropped${gated ? " into the shared pool (new value split as bid points)" : ""}.`
      : trailhead ? `Pick where your crawl begins.`
      : `⚖${earned} threat cleared${gated ? " — new spoils joined the shared pool below" : " — spoils collected into your backpack"}.`}${swapLine}</p>
    ${tabBarHtml(partyMode ? [["assign", "🎁 Loot → Party"]] : [])}
    ${_ovTab === "assign" ? assignTab : _ovTab === "rooms" ? roomsTab : backpackTab}
  </div>`);
  ov.querySelectorAll("[data-loot]").forEach((b) => b.onclick = () => {
    if (b.dataset.locked === "1") return;
    send({ type: "claimLoot", key: b.dataset.loot });
  });
  wireLootAssign(ov, rerender);
  wireDeckBuilder(ov, rerender);
  wirePartyLoadout(ov, rerender);
  wireLevelUp(ov, me, rerender);
  const openMap = ov.querySelector("[data-openmap]");
  if (openMap) openMap.onclick = () => window.KM.openLevelMap?.();
  ov.querySelectorAll("[data-advance]").forEach((b) => b.onclick = (e) => {
    if (consumeCarriedCombatClick(e)) return;
    const label = humanSeats >= 2 ? "VOTING…" : "ENTERING…";
    if (markActionPending(b, label, ".room-enter")) send({ type: "advance", to: b.dataset.advance });
  });
  ov.querySelectorAll("[data-lockroom]").forEach((b) => b.onclick = () => send({ type: "lockRoom" }));
  ov.querySelectorAll("[data-unlockroom]").forEach((b) => b.onclick = () => send({ type: "unlockRoom" }));
  ov.querySelectorAll("[data-swapbody]").forEach((b) => b.onclick = () => window.KM.openBodyModal?.());
  const desc = ov.querySelector("[data-descend]");
  if (desc) desc.onclick = () => send({ type: "descend" });
  const nr = ov.querySelector("[data-newrun]");
  if (nr) nr.onclick = () => startFreshRun(nr);
  const leave = ov.querySelector("[data-leavetolobby]");
  if (leave) leave.onclick = leaveToLobby;
  wireSquadSelector(ov, rerender);
  wireTrade(ov);
  wireTabs(ov, rerender);
  wireTradeCompose(ov, rerender);
}

// THE SETUP screen (owner 2026-06-27): after a room is chosen but BEFORE combat, surface the
// deck-builder + level-up so you can edit your deck "at any time outside of combat." A full overlay
// suits the SOLO owner (one lane — nothing to position); "Position on board ✕" dismisses it to the
// board (the floating ✎ button reopens), so multiplayer can still arrange the line. The deck moves
// send moveToDeck/moveToBackpack — FLAG: the engine must allow those in `setup` (today its editable()
// gate is outside-combat only); the UI is wired and works the moment that lands.
function renderSetup() {
  const ov = $("draftOverlay");
  const me = pilot() || {};
  const ownedBodyCount = (state?.players || []).filter(isMine).length;
  const reopen = $("setupReopen");
  if (reopen) { reopen.classList.toggle("hidden", !_setupDismissed); reopen.textContent = "✎ Edit deck / level up"; }
  if (_setupDismissed) {                                   // board visible for positioning
    if (!ov.classList.contains("hidden")) { ov.classList.add("hidden"); ov.innerHTML = ""; }
    _setupSig = "";
    return;
  }
  const selector = squadSelectorHtml();
  const sig = JSON.stringify(["setup", (me.deckList || []).map((c) => c.key), (me.backpack || []).map((c) => c.key),
    me.deckSize, me.level, LEVEL_ALLOC_KEYS.map((key) => me.levelAllocation?.[key] ?? 0),
    me.nextLevelCost, me.treasure, me.bodyKey, activeId,
    _levelPanelOpen, _deckPanelOpen, _partyPanelOpen, _partyMove, _lvlOpen, _lvlPay,
    (state.players || []).map((p) => [p.id, p.bidPoints ?? 0,
      (p.backpack || []).map((c) => c.key).join(), (p.deckList || []).map((c) => c.key).join()])]);
  if (_ovScreen === "setup" && sig === _setupSig) return;
  _setupSig = sig;
  const rerender = () => { _setupSig = ""; renderSetup(); };
  const swapLine = ` <button class="km-tier-btn" data-swapbody="1">🎭 Swap body (free)</button>`;
  ov.classList.remove("hidden");
  // .setup-scroll wraps the scrollable content so the action bar can sit as a NON-overlapping flex footer
  // below it (mobile landscape-short) — otherwise the sticky bar sliced the 🎒 BACKPACK row. See index.html.
  paintOverlay(ov, "setup", `<div class="draft-card loot-wide setup-card">
    <div class="setup-scroll">
      <div class="setup-head">
        <h2>Get ready — Floor ${state.floor || 1}</h2>
        ${state.canReturnToRooms ? `<button class="km-back-rooms" data-backrooms="1">↩ ROOM OPTIONS</button>` : ""}
      </div>
      ${selector}
      <p class="draft-sub setup-lead" style="margin-top:2px">Tune your deck and body before the fight begins.${swapLine}</p>
      ${buildLevelUp(me)}
      ${buildPartyLoadout()}
      ${buildDeckBuilder(me)}
    </div>
    <div class="advance-row" style="margin-top:12px">
      <button class="advance-btn" data-begincombat="1">⚔ BEGIN COMBAT ▶</button>
      ${ownedBodyCount > 1 ? `<button class="advance-btn setup-position" data-setupclose="1">↙ ARRANGE PARTY</button>` : ""}
    </div>
  </div>`);
  wireDeckBuilder(ov, rerender);
  wirePartyLoadout(ov, rerender);
  wireLevelUp(ov, me, rerender);
  ov.querySelector("[data-begincombat]").onclick = (e) => {
    if (markActionPending(e.currentTarget, "STARTING…")) send({ type: "start" });
  };
  const backRooms = ov.querySelector("[data-backrooms]");
  if (backRooms) backRooms.onclick = (e) => {
    if (markActionPending(e.currentTarget, "RETURNING…")) send({ type: "backToRooms" });
  };
  const setupClose = ov.querySelector("[data-setupclose]");
  if (setupClose) setupClose.onclick = () => { _setupDismissed = true; renderSetup(); render(); };
  ov.querySelectorAll("[data-swapbody]").forEach((b) => b.onclick = () => window.KM.openBodyModal?.());
  wireSquadSelector(ov, rerender);
}

// INITIAL DRAFT: exactly three private body+starter-deck offers for the body currently selected.
// The engine partitions offers without overlap and validates ownership when one is picked.
function renderDraft() {
  const ov = $("draftOverlay");
  const d = state.draft;
  const bodies = state.bodies || {};
  const allOffers = d.wheel || [];
  const picks = d.picks || [];
  // YOUR squad — every body this seat owns (primary first). You draft a body + kit for EACH.
  const squad = (state.players || []).filter(isMine)
    .sort((a, b) => (a.id === you ? -1 : b.id === you ? 1 : (a.id < b.id ? -1 : 1)));
  const draftedOf = (id) => picks.find((p) => p.id === id)?.drafted ?? false;
  // which body you're choosing for right now (falls back to your primary)
  if (!squad.some((s) => s.id === activeId)) activeId = you;
  const activeDraftId = activeId;
  // Legacy/demo snapshots without offeredTo remain readable; live snapshots expose only the active
  // body's assigned triple. Teammates' offers never appear or consume phone space.
  const wheel = allOffers.filter((w) => w.offeredTo == null || w.offeredTo === activeDraftId);
  const mineIds = new Set(squad.map((s) => s.id));

  // Human presence is deliberately separate from body count: one person piloting four bodies is
  // still one connected player. The draft header must answer "did my friend join?" directly.
  const humans = (state.players || []).filter((p) => !p.bot);
  const ownedBy = (seatId) => (state.players || []).filter((p) => (p.owner ?? p.id) === seatId);
  const humanReady = (seat) => {
    const owned = ownedBy(seat.id);
    return owned.length > 0 && owned.every((p) => draftedOf(p.id));
  };
  const sig = JSON.stringify([!!state.ownerLab, allOffers.map((w) => [w.id, w.offeredTo, w.lockedBy]), activeDraftId, squad.map((s) => [s.id, draftedOf(s.id), s.bodyKey]),
    d.hold, picks.map((p) => [p.id, p.drafted]), humans.map((p) => [p.id, p.name, p.offline, humanReady(p), ownedBy(p.id).length])]);
  if (_ovScreen === "draft" && sig === _draftSig) return;
  _draftSig = sig;

  // ALL-AT-ONCE PARTY BUILDER (owner 2026-07-27: "let me see all their options at once … instead of
  // having to catalogue to memory as I pick"). Was one grid for the ACTIVE slot only; now one section
  // per body, each showing that body's own offers, so the whole team is comparable on one screen.
  // `optionButton` renders one bundle button FOR a specific body id (forId) — was hard-wired to the
  // active body; the section loop below passes each slot's own id.
  const optionButton = (w, forId) => {
    const lockedByActive = w.lockedBy === forId;
    const lockedByMine = w.lockedBy && mineIds.has(w.lockedBy) && !lockedByActive;   // another of MY bodies took it
    const lockedByOther = w.lockedBy && !mineIds.has(w.lockedBy);                     // a true ally (multiplayer)
    const whoMine = lockedByMine ? escTip(squad.find((s) => s.id === w.lockedBy)?.name || "your other body") : null;
    const owner = lockedByOther ? escTip(picks.find((p) => p.id === w.lockedBy)?.name || "ally") : null;
    // STARTER DECK = 5 pairs (owner 2026-07-01): group the 10 cards to distinct entries with a ×2
    // badge. Each entry is a data-ct chip — tap/hover reads the card's full text (the inline text
    // is hidden on touch, where there's no room and no hover).
    const kg = new Map();
    for (const it of w.items) { const g = kg.get(it.key) ?? { ...it, count: 0 }; g.count++; kg.set(it.key, g); }
    const deckLabel = w.role === "companion"
      ? "3-card foe-style cycle"
      : `${w.deckSize ?? w.items.length}-card main deck`;
    // Dense flex-wrap NAME chips (owner 2026-07-09: the full 5-line ×2 kit list made every body card so
    // tall the draft scrolled on phone AND desktop). Each chip is still a data-ct card → tap/hover
    // reads the full effect text via showDataTip; the inline prose moved entirely into that tip. LAYOUT
    // ONLY — same cards, same ×2 counts, nothing about the deck changed.
    const items = [...kg.values()].map((it) => {
      // Starter cards are real mini-tiles, not a punctuation-heavy text list. The card's own art is the
      // primary identity; scale stays as one compact engine-derived symbol with its word in the tooltip.
      const b = scaleMeta(it);
      const itemSum = String(it.sum || "");
      const scaleAlreadyInSummary = itemSum.includes(b.glyph);
      return `<li class="kit-card" data-ct-key="${escAttr(it.key)}" data-ct-name="${escAttr(it.name)}" data-ct-cost="${it.cost ?? ""}" data-ct-text="${escAttr(it.text || "")}" data-ct-scale="${b.glyph} ${b.word}"${it.sum ? ` data-ct-sum="${escAttr(it.sum)}"` : ""}>
        <span class="kit-art" aria-hidden="true">${cardIconImg(it.key)}</span>
        <span class="kit-name"><b>${it.name}</b></span>
        <span class="kit-meta">${scaleAlreadyInSummary ? "" : `<span class="kit-scale" title="${b.word}" aria-label="${b.word}">${b.glyph}</span>`}${itemSum ? `<span class="kit-sum">${escAttr(itemSum)}</span>` : ""}${it.count > 1 ? `<span class="kit-x">×${it.count}</span>` : ""}</span>
      </li>`;
    }).join("");
    const tag = lockedByActive ? " ✓ (this body)" : whoMine ? " — " + whoMine : owner ? " — " + owner : "";
    const disabled = lockedByMine || lockedByOther;                                   // exclusive across the whole table
    return `<button class="class-opt${lockedByActive ? " taken" : ""}${disabled ? " locked-other" : ""}" data-bundle="${w.id}" data-forid="${forId}" ${disabled ? "disabled" : ""}>
      <span class="class-head">
        <span class="body-portrait" aria-hidden="true">${iconImg(w.bodyKey)}</span>
        <span class="class-copy"><span class="cn" style="color:${w.color}">${w.name}${tag}</span>
        <span class="cstat">❤ ${w.maxHp} HP · ${deckLabel}${w.passive ? " · ✦ " + w.passive : ""}</span></span>
        <span class="class-pick">${lockedByActive ? "SELECTED" : "CHOOSE"}</span>
      </span>
      <ul class="ckit">${items}</ul>
    </button>`;
  };
  // One section per body: its label + drafted state + its own offers. Solo (squad 1) keeps a single grid.
  const offersFor = (id) => allOffers.filter((w) => w.offeredTo == null || w.offeredTo === id);
  const sections = squad.map((s, index) => {
    const who = s.id === you ? "Main body" : `Companion ${index}`;
    const done = draftedOf(s.id);
    const chosen = done ? escTip(bodies[s.bodyKey]?.name || s.bodyKey) : null;
    const isActive = s.id === activeDraftId;
    const opts = offersFor(s.id).map((w) => optionButton(w, s.id)).join("");
    const headStyle = `margin:14px 4px 6px;padding:5px 10px;border-radius:8px;font-size:13px;`
      + `border-left:3px solid ${done ? "#3f7a55" : isActive ? "#e6c34a" : "#3a4150"};`
      + `background:${done ? "#132018" : isActive ? "#221e12" : "#151922"};color:#dfe7f0;`;
    return `<div class="party-slot-section">
      <div class="slot-section-head" style="${headStyle}"><b>${who}</b> ${done ? `· <span style="color:#7fdd9e">✓ ${chosen}</span> <span style="opacity:.6;font-size:11px">(pick another to change)</span>` : `· <span style="color:#e6c34a">choose one below</span>`}</div>
      <div class="class-grid">${opts}</div>
    </div>`;
  }).join("");

  // (the per-body tab selector was retired 2026-07-27 — the all-at-once sections carry each slot's
  // label + drafted state inline, so a separate tab bar is redundant.)
  const allDone = squad.every((s) => draftedOf(s.id));
  const active = squad.find((s) => s.id === activeDraftId);
  const activeName = active ? (active.id === you ? "your main body" : escTip(active.name || "companion")) : "your body";
  const readyHumans = humans.filter(humanReady).length;
  const partyHtml = `<div class="party-presence">
    <div class="party-summary"><b>PARTY · ${humans.length}</b><span>ROOM ${escTip(myRoom || "—")}</span></div>
    ${humans.map((seat) => {
      const owned = ownedBy(seat.id), ready = owned.filter((p) => draftedOf(p.id)).length;
      const readyText = seat.offline ? "disconnected"
        : ready === owned.length ? `ready · ${ready}/${owned.length} bod${owned.length === 1 ? "y" : "ies"}`
        : `choosing · ${ready}/${owned.length} bodies`;
      return `<div class="party-seat${seat.id === you ? " mine" : ""}${seat.offline ? " offline" : ""}">
        <span class="party-dot"></span>
        <span class="party-name">${escTip(seat.name || "Adventurer")}</span>
        ${seat.id === you ? `<span class="party-you">YOU</span>` : ""}
        <span class="party-ready${ready === owned.length ? " done" : ""}">${readyText}</span>
      </div>`;
    }).join("")}
  </div>`;
  // CO-OP HOLD (owner 2026-07-06): every seat drafted a fresh run → the engine WAITS for ▶ so
  // late friends can still join and pick. Solo never holds (d.hold is false → old instant start).
  const draftedN = picks.filter((p) => p.drafted).length;
  const statusLine = d.hold
    ? `✓ ${readyHumans}/${humans.length} players ready · ${draftedN}/${picks.length} bodies drafted. Start when everyone you invited is listed above:`
    : allDone
      ? (humans.length > 1 ? `✓ your party is ready · waiting on ${Math.max(0, humans.length - readyHumans)} player${humans.length - readyHumans === 1 ? "" : "s"} (${draftedN}/${picks.length} bodies)` : "✓ all bodies picked — starting the run…")
      : squad.length === 1 ? `Choose your <b style="color:#e6c34a">body + starter deck</b>:`
      : `Pick a body for <b style="color:#e6c34a">each slot below</b> — compare them all, then tap CHOOSE:`;

  // Solo keeps its single grid; a party shows every slot's section at once (the all-at-once builder).
  const optionsHtml = squad.length === 1
    ? `<div class="class-grid">${wheel.map((w) => optionButton(w, activeDraftId)).join("")}</div>`
    : sections;
  ov.classList.remove("hidden");
  paintOverlay(ov, "draft", `<div class="draft-card draft-wide${state.ownerLab ? " owner-lab-draft" : ""}">
    <h2>${state.ownerLab ? "Owner Playtest Lab" : squad.length === 1 ? "Choose your body" : "Build your party"}</h2>
    ${state.ownerLab ? `<p class="owner-lab-banner">NORMAL RUN · ALL ${new Set(wheel.map((offer) => offer.bodyKey)).size} WEARABLE BODIES · EXCLUDED FROM PUBLIC-ALPHA BALANCE DATA</p>` : ""}
    ${partyHtml}
    <p class="draft-sub">Your main body gets a full starter deck. Each companion gets a three-card foe-style cycle. Tap any card to read it.</p>
    <p class="draft-sub" style="margin-top:6px">${statusLine}</p>
    ${d.hold ? `<p style="text-align:center;margin:4px 0 10px"><button class="km-lvl-btn tender-confirm" data-beginrun="1" style="font-size:16px;padding:10px 22px">▶ Start with ${humans.length} player${humans.length === 1 ? "" : "s"}</button></p>` : ""}
    ${optionsHtml}
  </div>`);
  ov.querySelectorAll("[data-beginrun]").forEach((b) => b.onclick = () => send({ type: "beginRun" }));

  ov.querySelectorAll("[data-bundle]").forEach((b) => {
    b.onclick = () => {
      if (!markActionPending(b, "CHOOSING…", ".class-pick")) return;
      const forId = b.dataset.forid || activeId;   // each option carries the body it's FOR (all-at-once builder)
      activeId = forId;
      send({ type: "possess", id: forId });                    // make sure the pick lands on THIS section's body
      send({ type: "draftPick", bundle: b.dataset.bundle });
      const next = squad.find((s) => s.id !== forId && !draftedOf(s.id));  // hop possession to the next un-picked body
      if (next) { activeId = next.id; send({ type: "possess", id: next.id }); }
      _draftSig = null;
    };
  });
}

// THE HAND + MOXIE METER (card/moxie rewrite). The hotbar strip is now your HAND: up to 5 face-up
// cards you tap/click (or 1–9) to play, each gated by its ⚡ moxie cost. A meter across the top shows
// your moxie (fills 1/sec, caps 10) and your draw-pile size. Unaffordable cards dim.
// Width-aware ellipsis using the CURRENTLY set ctx.font (unlike fitText, doesn't force bold or
// resize — keeps the caller's font weight/size so a dim passive line reads like the board's).
function ellip(text, maxW) {
  text = String(text);
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}

// IN-COMBAT CARD TEXT (owner 2026-07-09: "when I'm playing I want to actually read the cards and what
// they do, even in combat", esp. on phone). Fit a card's effect text as centered, number-colored,
// wrapped lines into the vertical band [top,bottom] at width maxW — scale the font maxPx→minPx until
// the wrap fits the band, then clip surplus lines with an ellipsis. Reuses the tooltip's word-wrap +
// gold-number coloring so the on-card copy reads the same as the hover popup. Draws nothing if the
// band is too short (the hover/hold tooltip still carries the full text).
function drawCardText(text, cx, top, bottom, maxW, maxPx, minPx, baseColor) {
  text = String(text || ""); if (!text) return;
  const bandH = bottom - top; if (bandH < minPx) return;
  let px = maxPx, lines = [];
  for (; px >= minPx; px--) {
    ctx.font = `${px}px ui-monospace, monospace`;
    const cpl = Math.max(4, Math.floor(maxW / (px * 0.62)));   // monospace glyph ≈ 0.6em wide
    lines = wrapText(text, cpl);
    if (lines.length * (px + 2) <= bandH) break;
  }
  ctx.font = `${px}px ui-monospace, monospace`;
  const lineH = px + 2, maxLines = Math.max(1, Math.floor(bandH / lineH));
  if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = ellip(lines[maxLines - 1] + "…", maxW); }
  let y = top + (bandH - lines.length * lineH) / 2 + lineH / 2;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  for (const ln of lines) { const s = ellip(ln, maxW), w = ctx.measureText(s).width; drawColoredText(s, cx - w / 2, y, baseColor); y += lineH; }
}

// Canvas uses the same symbol-first scale metadata as DOM card tiles. Full words are reserved for
// inspection; the card face gets one large, consistently placed mechanic mark.
const scaleOf = (c) => scaleMeta(c);
function drawScaleMark(c, right, cy, px = 16) {
  const b = scaleOf(c);
  ctx.font = `bold ${px}px ui-monospace, monospace`;
  const w = ctx.measureText(b.glyph).width + 10, h = px + 5;
  ctx.fillStyle = b.bg; roundRect(right - w, cy - h / 2, w, h, 6); ctx.fill();
  ctx.fillStyle = b.fg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(b.glyph, right - w / 2, cy + 0.5);
  return w;
}

function drawPickHand(me) {
  const entries = pickHandEntries();
  const mY = HOTBAR_Y + 2, mH = 17;
  ctx.fillStyle = "#15130b"; roundRect(6, mY, W - 12, mH, 5); ctx.fill();
  ctx.strokeStyle = "#e6c34a"; ctx.lineWidth = 1.5; roundRect(6, mY, W - 12, mH, 5); ctx.stroke();
  ctx.fillStyle = "#ffd24a"; ctx.font = "bold 13px ui-monospace, monospace"; ctx.textBaseline = "middle";
  ctx.textAlign = "left"; fitText(`CHOOSE · ${_pickHand.card.name}`, 14, mY + mH / 2 + 1, W * 0.68, 13, 10, "left", "middle");
  ctx.textAlign = "right";
  const pages = _pickHand.choices.length > 5 ? Math.ceil(_pickHand.choices.length / PICK_PAGE_SIZE) : 1;
  const mandatory = !!_pickHand.card?.passiveChoice;
  ctx.fillText(mandatory ? "Choose one" : pages > 1 ? `${_pickHand.page + 1}/${pages} · Esc cancels` : "Esc cancels", W - 14, mY + mH / 2 + 1);
  const top = mY + mH + 3, cardH = H - top - 4, slotW = W / Math.max(entries.length, 1), pad = 5;
  let hovered = null;
  for (let k = 0; k < entries.length; k++) {
    const c = entries[k], bx = k * slotW + pad, by = top, bw = slotW - pad * 2, bh = cardH;
    const col = c.color || "#6a7384";
    ctx.fillStyle = "#171a21"; roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.save(); roundRect(bx, by, bw, bh, 8); ctx.clip();
    ctx.fillStyle = col + "2b"; ctx.fillRect(bx, by, bw, bh);
    let spr = c.bodyKey ? foeSprite(c.bodyKey) : cardSprite(c.cardKey || c.key);
    if (spr?.complete && spr.naturalWidth) {
      const wm = Math.min(bw - 8, bh - 8);
      ctx.globalAlpha = IS_TOUCH ? 0.38 : 0.28;
      ctx.drawImage(spr, bx + bw / 2 - wm / 2, by + bh / 2 - wm / 2, wm, wm);
      ctx.globalAlpha = 1;
    } else if (c.glyph) {
      ctx.globalAlpha = 0.28; ctx.font = `${Math.min(54, bh * 0.55)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(c.glyph, bx + bw / 2, by + bh / 2); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = col; ctx.fillRect(bx, by + bh - 4, bw, 4);
    ctx.restore();
    ctx.strokeStyle = c.nav ? "#7c8696" : "#e6c34a"; ctx.lineWidth = 2; roundRect(bx, by, bw, bh, 8); ctx.stroke();
    ctx.fillStyle = "#e6c34a"; ctx.font = "bold 14px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(String(k + 1), bx + 6, by + 5);
    ctx.textAlign = "right";
    if (c.hp != null) ctx.fillText(`❤${c.hp}`, bx + bw - 6, by + 5);
    else if (c.cost != null) ctx.fillText(`⚡${c.cost}${c.value != null ? ` · ◈${c.value}` : ""}`, bx + bw - 6, by + 5);
    else if (c.glyph) ctx.fillText(c.glyph, bx + bw - 6, by + 5);
    const cx = bx + bw / 2;
    ctx.fillStyle = "#fff"; fitText(c.name, cx, by + 31, bw - 12, IS_TOUCH ? 13 : 17, 9, "center", "middle");
    drawCardText(c.text, cx, by + 41, by + bh - 20, bw - 12, IS_TOUCH ? 11 : 13, 8, "#d7dee8");
    ctx.fillStyle = c.nav ? "#b6c0cf" : "#bfe8c8"; ctx.font = "bold 12px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(c.nav < 0 ? "◀ previous" : c.nav > 0 ? "next ▶" : "▶ choose", cx, by + bh - 5);
    if (mouse.x >= bx && mouse.x <= bx + bw && mouse.y >= by && mouse.y <= by + bh) hovered = c;
  }
  if (_handTip && !entries[_handTip.k]) _handTip = null;
  if (!IS_TOUCH && hovered) drawTooltip(hovered);
  else if (_handTip) drawTooltip(entries[_handTip.k], (_handTip.k + 0.5) * slotW);
}

const paymentText = (c) => `⚡${c?.cost ?? 0}${(c?.healthCost ?? 0) > 0 ? ` ♥${c.healthCost}` : ""}`;

function drawHotbar(me) {
  if (_pickHand && !_pickHand.card?.passiveChoice && (!me?.hand?.some((c) => c.id === _pickHand.card.id) || state?.phase !== "playing")) _pickHand = null;
  if (_pickHand) { drawPickHand(me); return; }
  const hand = me?.hand ?? [];
  const moxie = me?.moxie ?? 0, moxMax = me?.moxieMax ?? 10;
  const serverOrPlanQueue = queuedCardsShown(me);
  const queuedCard = serverOrPlanQueue[0] ?? queuedCardShown(me);
  const queuedCards = serverOrPlanQueue.length ? serverOrPlanQueue : (queuedCard ? [queuedCard] : []);
  const orderedPlan = queuedCards.some((q) => q.planned) || queuedCards.length > 1;
  // ── moxie meter (top strip of the hotbar band) ──
  const mY = HOTBAR_Y + 2, mH = 17;
  ctx.fillStyle = "#0c0f15"; roundRect(6, mY, W - 12, mH, 5); ctx.fill();
  if (queuedCard) { ctx.lineWidth = 2; ctx.strokeStyle = "#ffd24a"; roundRect(6, mY, W - 12, mH, 5); ctx.stroke(); }
  ctx.font = "bold 13px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  // LABEL the meter on mobile too (owner-approved 2026-07-11): the bare gold pip track read as an
  // unlabeled dot row on the phone. The "⚡MOXIE" word names it (desktop already showed "MOXIE"); the
  // wide phone meter has room, so the pips just start after the label. FLAG: label text/color tunable.
  ctx.fillStyle = "#e6c34a"; ctx.fillText(IS_TOUCH ? "⚡MOXIE" : "MOXIE", 14, mY + mH / 2 + 1);
  const pipR = 5, pipGap = 5, px0 = IS_TOUCH ? 88 : 66;
  for (let i = 0; i < moxMax; i++) {
    const cx = px0 + i * (pipR * 2 + pipGap) + pipR;
    ctx.beginPath(); ctx.arc(cx, mY + mH / 2, pipR, 0, Math.PI * 2);
    ctx.fillStyle = i < moxie ? "#e6c34a" : "#23282f"; ctx.fill();
    if (i < moxie) { ctx.strokeStyle = "#fff4c0"; ctx.lineWidth = 0.75; ctx.stroke(); }
  }
  ctx.fillStyle = "#cfd8e2"; ctx.textAlign = "right";
  const meterRight = queuedCard
    ? orderedPlan
      ? `PLAN 1: ${queuedCard.name} @ ${paymentText(queuedCard)}${queuedCards.length > 1 ? ` · +${queuedCards.length - 1} next` : ""}`
      : `⏳ ${queuedCard.name} · fires at ${paymentText(queuedCard)}`
    : `${moxie}/${moxMax}  ·  🂠 ${me?.deckCount ?? 0} · 🗑 ${me?.discCount ?? 0}`;
  fitText(meterRight, W - 14, mY + mH / 2 + 1, Math.max(80, W - (px0 + moxMax * (pipR * 2 + pipGap) + 12)), 13, 9, "right", "middle");
  // ── the hand of cards ──
  const top = mY + mH + 3, cardH = H - top - 4;
  const slotW = W / Math.max(hand.length, 1), pad = 5;
  let hovered = null;
  if (!hand.length) {
    ctx.fillStyle = "#8b94a6"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "15px ui-monospace, monospace"; ctx.fillText("— no cards in hand —", W / 2, top + cardH / 2);
    return;
  }
  for (let k = 0; k < hand.length; k++) {
    const c = hand[k], bx = k * slotW + pad, by = top, bw = slotW - pad * 2, bh = cardH, cardCx = bx + bw / 2;
    const col = c.color || "#6a7384", aff = c.affordable !== false;
    // OPTIMISTIC PLAY ECHO (perf/net 2026-07-11): a tapped card dims + dashes as "casting…" the
    // instant it's sent, and stays that way until the server's snapshot removes it from the hand
    // (or the echo expires and the card silently returns to normal — the play never happened).
    // FLAG styling (owner re-skin): 0.55 dim + dashed gold border + "casting…" footer.
    const pendPlay = _pendPlays.has(c.id);
    const queuedPos = queuedCards.findIndex((q) => q.id === c.id);
    const queuedTap = queuedPos >= 0;
    const queueLabel = orderedPlan ? `PLAN #${queuedPos + 1}` : "QUEUED";
    const cardAlpha = (aff || queuedTap ? 1 : 0.9) * (pendPlay ? 0.55 : 1);
    // Affordability is state, not permission to erase a decision. Keep the full face readable and
    // communicate "not yet" through the muted gold, border, and live moxie meter.
    ctx.globalAlpha = cardAlpha;
    ctx.fillStyle = "#171a21"; roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.save(); roundRect(bx, by, bw, bh, 8); ctx.clip();
    ctx.fillStyle = col + (aff ? "22" : "14"); ctx.fillRect(bx, by, bw, bh);
    // CARD ART (2026-07-10) — the card's tinted token as a faint emblem BEHIND the text. Layout-safe:
    // it adds no vertical space and never reflows the name/effect/damage, which all paint on top. The
    // token is already tinted to the card's hue, so it reads as this card's identity. ⚠ glyphs are
    // owner-overridable placeholders (tools/generate-card-art.js). Missing sprite → nothing drawn.
    const cspr = cardSprite(c.key);
    if (cspr && cspr.complete && cspr.naturalWidth) {
      const wm = Math.min(bw - 6, bh - 6);
      ctx.globalAlpha = cardAlpha * (IS_TOUCH ? 0.36 : 0.24);
      ctx.drawImage(cspr, bx + bw / 2 - wm / 2, by + bh / 2 - wm / 2, wm, wm);
      ctx.globalAlpha = cardAlpha;                                       // restore the card alpha
    }
    ctx.fillStyle = col; ctx.fillRect(bx, by + bh - 4, bw, 4);           // school-color identity strip
    ctx.restore();
    if (pendPlay || queuedTap) ctx.setLineDash(queuedTap ? [8, 4] : [5, 4]);
    ctx.lineWidth = queuedTap ? 3 : 2; ctx.strokeStyle = queuedTap ? "#ffd24a" : aff ? "#e6c34a" : "#596273"; roundRect(bx, by, bw, bh, 8); ctx.stroke();
    ctx.setLineDash([]);
    // ⚡cost (top-left)
    ctx.fillStyle = aff ? "#e6c34a" : "#c7ad6e"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.font = "bold 18px ui-monospace, monospace"; ctx.fillText(paymentText(c), bx + 6, by + 5);
    // top-right, right→left: ◈VALUE then one large engine-derived scale SYMBOL.
    let trx = bx + bw - 5;
    if (c.value != null) {
      ctx.fillStyle = aff ? "#b9a6e0" : "#b7acc9"; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.font = "bold 15px ui-monospace, monospace";
      const vtxt = `◈${c.value}`; ctx.fillText(vtxt, trx, by + 5); trx -= ctx.measureText(vtxt).width + 6;
    }
    drawScaleMark(c, trx, by + (IS_TOUCH ? 13 : 15), IS_TOUCH ? 16 : 17);
    if (orderedPlan && queuedTap) {
      const label = `#${queuedPos + 1}`;
      ctx.font = "bold 12px ui-monospace, monospace";
      const lw = ctx.measureText(label).width + 10;
      ctx.fillStyle = "#ffd24a"; roundRect(cardCx - lw / 2, by + 4, lw, 20, 8); ctx.fill();
      ctx.fillStyle = "#11151d"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, cardCx, by + 14);
    }
    // ── interior, headroom-derived so it adapts to the desktop-tall / phone-short card without
    // clipping. On the 70px-tall iPhone hand, separate damage + "play" footer bands consumed the
    // ENTIRE description area. Touch cards therefore carry the live headline beside their name and
    // give the remaining face to the actual effect; affordability is already conveyed by the cost,
    // moxie meter, dimming, and border. Desktop keeps the roomy three-band treatment below. ──
    // COMPOUND SUMMARY (owner 2026-07-14): the full first-glance number line — EVERY immediate outcome,
    // not just the headline op (Heart Guard → "🛡2 ❤2"). sumNow is the live value; boosted = gold.
    const sumLbl = c.sumNow || c.sum || c.dmgNow || c.dmg || "";
    const sumBoost = c.sumBoosted ?? c.boosted;
    if (IS_TOUCH) {
      // below the top row (cost/pill/value): NAME (left) + SUMMARY (right, gold when boosted) on one
      // emphasized line, then the effect text fills the remaining face (owner wants cards readable in-fight).
      const lineY = by + 32;
      ctx.font = "bold 15px ui-monospace, monospace"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      let sumW = 0;
      if (sumLbl) {
        ctx.fillStyle = !aff ? "#cbd2dc" : sumBoost ? "#ffd24a" : "#dfe7f0";
        ctx.fillText(sumLbl, bx + bw - 6, lineY); sumW = ctx.measureText(sumLbl).width + 8;
      }
      ctx.fillStyle = !aff ? "#e3e7ed" : "#fff";
      fitText(c.name, bx + 6, lineY, bw - 12 - sumW, 15, 10, "left", "middle");
      const txTop = by + 41, txBot = by + bh - 3;
      const faceText = queuedTap
        ? `${queueLabel} · tap to remove${orderedPlan ? " · fires in order" : ` · fires at ${paymentText(c)}`}`
        : pendPlay ? "casting…" : c.text;
      if (faceText && txBot - txTop >= 9)
        drawCardText(faceText, cardCx, txTop, txBot, bw - 10, 12, 9, queuedTap || pendPlay ? "#ffe9a8" : aff ? "#d7dee8" : "#c1c8d2");
      ctx.globalAlpha = 1;
      continue;
    }
    // DESKTOP — bottom-up reserved bands: footer (▶ play / need ⚡N) · compound
    // summary · effect text, each with an explicit gap so the summary and the "need ⚡N" line can never
    // crowd into the description.
    const headB = by + 24, footRes = 18, footT = by + bh - footRes;
    const nameH = 18;
    const dmgRes = sumLbl ? 26 : 0;
    // name — auto-fit so a long card ("Repeating Crossbow") never spills the slot (owner overflow sweep)
    ctx.fillStyle = aff ? "#fff" : "#e3e7ed";
    fitText(c.name, cardCx, headB + nameH / 2, bw - 10, 17, 10, "center", "middle");
    // effect text ON the card face — the always-readable copy (hover/hold still shows the full tooltip)
    const txTop = headB + nameH + 1, txBot = footT - dmgRes - 5;
    if (c.text && txBot - txTop >= 10)
      drawCardText(c.text, cardCx, txTop, txBot, bw - 10, 13, 9, aff ? "#d7dee8" : "#c1c8d2");
    if (sumLbl) {   // LIVE compound summary (base + your current bonus); GOLD when boosted; fit so it never spills
      ctx.fillStyle = !aff ? "#cbd2dc" : sumBoost ? "#ffd24a" : "#dfe7f0";
      fitText(sumLbl, cardCx, footT - dmgRes / 2, bw - 12, 22, 13, "center", "middle");
    }
    ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.font = "bold 13px ui-monospace, monospace";
    ctx.fillStyle = queuedTap || pendPlay ? "#ffe9a8" : aff ? "#bfe8c8" : "#9a6a6a";
    const keyHint = `[${k + 1}] `;
    ctx.fillText(keyHint + (queuedTap ? `${queueLabel} · remove` : pendPlay ? "casting…" : aff ? "▶ play" : `queue for ${paymentText(c)}`), cardCx, by + bh - 4);
    ctx.globalAlpha = 1;
    if (mouse.x >= bx && mouse.x <= bx + bw && mouse.y >= by && mouse.y <= by + bh) hovered = c;
  }
  if (_handTip && !hand[_handTip.k]) _handTip = null;                                  // stale slot
  if (!IS_TOUCH && hovered) drawTooltip(hovered);                                      // touch never inherits synthetic hover from a tap
  else if (_handTip) drawTooltip(hand[_handTip.k], (_handTip.k + 0.5) * slotW);          // touch: the HELD card's text
}

// Draw `text` at (x,y) left-aligned, coloring DAMAGE/EFFECT numbers (a digit-run right after a
// +, ×, x, or a ⚔/✨/🛡/❤ icon) in `numColor` so a glance reads "this number is a factor that gets
// added/multiplied" (owner 2026-06-22). Iterates by code points so the ⚔/✨ emoji never split.
function drawColoredText(text, x, y, baseColor = "#fff", numColor = "#ffd24a") {
  const chars = [...String(text)]; let cx = x, prev = "";
  for (let i = 0; i < chars.length;) {
    if (/[0-9]/.test(chars[i])) {
      let num = ""; while (i < chars.length && /[0-9]/.test(chars[i])) { num += chars[i]; i++; }
      ctx.fillStyle = ["+", "×", "x", "⚔", "✨", "🛡", "❤", "-"].includes(prev) ? numColor : baseColor;
      ctx.fillText(num, cx, y); cx += ctx.measureText(num).width; prev = "0";
    } else {
      ctx.fillStyle = baseColor; ctx.fillText(chars[i], cx, y); cx += ctx.measureText(chars[i]).width;
      if (chars[i] !== " ") prev = chars[i]; i++;
    }
  }
  return cx - x;
}

// crisp, readable hover popup — the card's own text, straight from the library. `anchorX` lets a
// touch HOLD pin it over the held card's slot (default = the mouse, for desktop hover).
function drawTooltip(item, anchorX = mouse.x) {
  // header (owner 2026-07-14 readability): the scale treatment word + the live compound number line,
  // so the hover/hold popover leads with the SAME first-glance vocabulary the card face shows.
  const badge = scaleOf(item), sum = item.sumNow || item.sum || item.dmgNow || item.dmg || "";
  const header = item.scale || item.kind != null || item.ranged != null
    ? `${badge.glyph} ${badge.word}${sum ? "  ·  " + sum : ""}` : "";
  // Long summon rules must remain complete on a short landscape board. Adapt type and line width to
  // available space; never slice or ellipsize the authoritative card text.
  const fullText = `${item.name} — ${item.text}`;
  const availableH = Math.max(70, HOTBAR_Y - 12);
  let fontSize = 12, lineH = 16, lines = [];
  for (; fontSize >= 8; fontSize--) {
    lineH = fontSize + 4;
    const chars = Math.min(100, Math.max(46, Math.floor((W - 40) / Math.max(5, fontSize * 0.58))) + (12 - fontSize) * 8);
    lines = [...(header ? [header] : []), ...wrapText(fullText, chars)];
    if (lines.length * lineH + 14 <= availableH) break;
  }
  fontSize = Math.max(8, fontSize);
  // card-read popover carries the card's crisp icon in the top-left; only the first (name) line is
  // indented past it, so wrapped effect lines keep the full width. Missing sprite → no icon, no indent.
  const spr = item.key ? cardSprite(item.key) : null;
  const hasIcon = spr && spr.complete && spr.naturalWidth;
  const iconSz = 18, ind = hasIcon ? iconSz + 5 : 0;
  ctx.font = `${fontSize}px ui-monospace, monospace`;
  const w = Math.min(W - 20, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20 + ind);
  const h = lines.length * lineH + 14;
  const x = Math.min(Math.max(10, anchorX - w / 2), W - w - 10);
  const y = Math.max(6, HOTBAR_Y - h - 6);
  ctx.fillStyle = "#000e"; roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = "#e6c34a"; ctx.lineWidth = 1; roundRect(x, y, w, h, 8); ctx.stroke();
  if (hasIcon) ctx.drawImage(spr, x + 8, y + 7, iconSz, iconSz);
  ctx.font = `${fontSize}px ui-monospace, monospace`;
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  lines.forEach((l, i) => drawColoredText(l, x + 10 + (i === 0 ? ind : 0), y + 8 + i * lineH));
}

function wrapText(text, max) {
  const words = text.split(" "), lines = []; let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) { lines.push(line.trim()); line = w; }
    else line += " " + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

// MOBILE COMPACT FOE ROW (owner 2026-06-29): a landscape phone (~844×390) is too short for the tall
// stacked foe CARDS — with 3–4 foes in one lane they ran UP off the top of the board. Each lane foe
// instead draws as ONE compact, guaranteed-to-fit row: a rarity ribbon + body-hue wash, the icon and
// name, a stat line (❤HP · 🛡shield · ⚡moxie), and on the RIGHT the FRONT cast chip (next card + live
// moxie/cost fill + −damage) so its next move is always legible. render() sizes rowH so up to ~4 stack
// without clipping; the telegraph border (red-pulse AoE / cyan target / gold boss / threat heat) is kept.
function drawFoeRow(x, y, w, h, e, b, targeted, throb) {
  // READABILITY (owner 2026-07-07): every size in the row rides `s` = how much taller than the
  // old 40px cap the row is — a sparse fight gets big print, a packed lane degrades to the old density.
  const s = Math.max(0.76, Math.min(1.6, h / 40));
  const frac = e.threat ? e.threat.frac : 0;
  const charging = e.aoe && frac > 0.66;             // a board-wide hit is winding up
  // body + faint body-hue wash + rarity ribbon down the left edge
  ctx.fillStyle = "#151a23"; roundRect(x, y, w, h, 8); ctx.fill();
  ctx.save(); roundRect(x, y, w, h, 8); ctx.clip();
  ctx.fillStyle = (b.color || "#39404d") + "22"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = e.boss ? "#ffd24a" : ((b.gold ?? 0) >= 5 ? "#ffd24a" : (b.gold ?? 0) >= 3 ? "#4aa3ff" : (b.gold ?? 0) >= 1 ? "#7c8696" : "#39404d");
  ctx.fillRect(x, y, 5, h);
  ctx.restore();
  // telegraph border — same language as the desktop card
  // TARGET + THREAT both show (owner 2026-07-12): the cyan target rides as a SEPARATE inset ring so
  // pinning a foe no longer hides its red "about to attack" charge heat (the border below).
  ctx.lineWidth = e.boss ? 3 : 1.5;
  ctx.strokeStyle = charging ? `rgba(255,${Math.round(60 + 40 * throb)},60,1)`
    : e.boss ? "#ffcf4a" : frac > 0.75 ? "#f55" : frac > 0.45 ? "#fc6" : (b.color || "#333");
  roundRect(x, y, w, h, 8); ctx.stroke();
  if (targeted) { ctx.lineWidth = 2; ctx.strokeStyle = "#3df"; roundRect(x + 2.5, y + 2.5, w - 5, h - 5, 6); ctx.stroke(); }
  // NARROW-LANE TIER (owner 2026-07-24): a 3–4-lane phone card is ~215–305px wide. Laying portrait │
  // name │ telegraph side by side left the name ~38px ("Ca…") and truncated the cast label
  // ("0/10 B…"). Re-flow into bands instead — the height is free, the width is not.
  const narrow = w <= FOE_STACK_MAX_W;
  if (narrow && h >= FOE_STACK_MIN_H) { drawFoeRowStacked(x, y, w, h, e, b, targeted); return; }
  // icon (art with emoji fallback), vertically centered
  const iconSz = Math.min(Math.round(34 * s), h - 8);        // foe-row icon coeff 26→34 (icons +30%; still capped to the row height)
  const ix = x + 9, iy = y + h / 2;
  const spr = foeSprite(formArt(e));
  if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, ix, iy - iconSz / 2, iconSz, iconSz);
  else { ctx.font = `${iconSz - 5}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(e.bodyKey), ix + iconSz / 2, iy); }
  // RIGHT: the front cast chip (next card + live moxie/cost fill). Reserve its width first.
  const chipW = Math.min(Math.round(154 * s), Math.max(90, Math.round(w * 0.44)));
  const chipX = x + w - chipW - 7, chipH = Math.min(Math.round(18 * s), h - 10), chipY = y + (h - chipH) / 2;
  // name width reserves the 🎯/♛ marker's corner when one shows (the scaled-up marker used to land on the name's tail)
  const tx = ix + iconSz + 7, blockW = chipX - tx - 6 - ((e.boss || targeted) ? Math.round(18 * s) : 0);
  const ly = y + h - Math.round(6 * s);
  // ACTIVE EFFECTS share the lower stat rail with HP/moxie/bonuses. They used to float on the name
  // line while hero effects lived under the HP plate, so the eye had to hunt per body type.
  const effs = entityStatus(e, 4);
  // Foe bonuses get a permanent reserved seat beside the name. Keeping them on the lower stat rail
  // let long HP/shield/moxie strings squeeze them out—the regression visible on high-HP foes.
  const foeBonus = foeBonusLabelAlways(e.meleeBonus, e.rangedBonus);
  ctx.font = `bold ${Math.round(10 * s)}px ui-monospace, monospace`;
  // …except on a NARROW card, where that permanent seat was wider than the whole name block and
  // truncated the foe's identity to two letters. There the bonus falls back to the stat line below,
  // where it yields to HP/shield/moxie instead of outranking the name.
  const foeBonusW = narrow ? 0 : ctx.measureText(foeBonus).width;
  ctx.fillStyle = "#f4f5f7";
  fitText(e.name || b.name || e.bodyKey, tx, y + Math.round(4 * s), Math.max(20, blockW - foeBonusW - 7), Math.round((h >= 34 ? 13 : 12) * s), 10);
  if (!narrow) {
    ctx.fillStyle = "#ffd24a"; ctx.font = `bold ${Math.round(10 * s)}px ui-monospace, monospace`;
    ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText(foeBonus, tx + blockW, y + Math.round(5 * s));
  }
  // HP BAR: a slim fill bar under the name so HP reads as a PROPORTION, not just the ❤n/n text — drawn
  // only when the row is tall enough to seat it clear of both the name and the stat line.
  const hbY = y + Math.round(18 * s), hbH = Math.max(3, Math.round(4 * s));
  if (hbY + hbH <= ly - Math.round(12 * s)) {
    const hf = Math.max(0, e.hp / Math.max(1, e.maxHp));
    bar(tx, hbY, blockW, hbH, hf, hf > 0.4 ? "#2f9b4a" : "#c0453a", "#0a0d12");
    if (e.shield > 0) { const capW = Math.min(blockW * 0.4, 6 + String(e.shield).length * 5 * s); ctx.fillStyle = "#1c4a63"; ctx.fillRect(tx + blockW - capW, hbY, capW, hbH); }
  }
  // stat line (bottom): ❤HP/max · 🛡+shield · ⚡moxie · 🌵thorns/🔒warded/aura — CURRENT moxie beside HP
  ctx.font = `bold ${Math.round((h >= 30 ? 11 : 10) * s)}px ui-monospace, monospace`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  let sx = tx;
  ctx.fillStyle = "#9bf09b"; const hpL = `❤${e.hp}/${e.maxHp}`; ctx.fillText(hpL, sx, ly); sx += ctx.measureText(hpL).width + 7;
  if (e.shield > 0) { ctx.fillStyle = "#7fd6ff"; const shL = `🛡+${e.shield}`; ctx.fillText(shL, sx, ly); sx += ctx.measureText(shL).width + 7; }
  // ARMOR (flat DR) hex badge in the stat line — this row never showed DR at all before (owner 7/11)
  if (e.dr > 0 && sx < chipX - 26) { const ar = Math.max(7, Math.round((IS_TOUCH ? 8 : 7) * s)); drawArmorBadge(sx + ar, ly - Math.round(4 * s), ar, e.dr); sx += ar * 2 + 7; }
  // extra-state badges, appended while there's still room before the cast chip
  const badge = (txt, col) => {
    const bw = ctx.measureText(txt).width;
    if (sx + bw > chipX - 6) return false;
    ctx.fillStyle = col; ctx.fillText(txt, sx, ly); sx += bw + 7; return true;
  };
  // Active effects outrank the duplicate moxie readout: the cast chip already shows moxie/cost,
  // while a suppressed Pet Leech/poison/slow token makes the continuing mechanic look absent.
  if (effs.length) {
    const er = IS_TOUCH ? Math.max(8, Math.round(6 * s)) : Math.max(6, Math.round(5 * s));
    const estep = er * 2 + 3;
    const emax = Math.max(0, Math.min(effs.length, Math.floor((chipX - 6 - sx) / estep)));
    const ecy = ly - Math.round(4 * s);
    for (let k = 0; k < emax; k++) drawEffectChipAt(sx + er + k * estep, ecy, er, effs[k]);
    sx += emax * estep;
  }
  badge(`⚡${e.moxie ?? 0}/${e.moxieMax ?? 10}`, "#e6c34a");
  if (narrow) badge(foeBonus, "#ffd24a");   // narrow: the bonus rides here, after HP/shield/moxie
  if (e.thorns > 0) badge(`🌵${e.thorns}`, "#a8d08a");
  if (e.warded) badge("🔒ward", "#ffcf4a");
  if (e.aura) badge("✦aura", "#ffe9a8");
  // target / boss marker, tucked top-right of the text block (clear of the chip)
  if (e.boss || targeted) { ctx.font = `${Math.round(13 * s)}px serif`; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText(targeted ? "🎯" : "♛", chipX - 3, y + 3); }
  drawFoeCastChip(chipX, chipY, chipW, chipH, e, Math.round(10 * s));
}
// THE TELEGRAPH — the one surface that says WHAT is coming and HOW SOON: the FRONT cast card
// (drawFoeQueue n=1 shows ⚡moxie/cost name −dmg, filled by castFrac), a passive threat bar, or a
// reactive / no-attack note when the foe runs no cast queue (so moxie/HP still read off the stat
// line). Shared by the wide row and the narrow stacked card so the two can never drift apart.
function drawFoeCastChip(cx, cy, cw, ch, e, labelPx) {
  if (e.queue && e.queue.length) {
    drawFoeQueue(cx, cy, cw, ch, e, true, 1, 0);
  } else if ((e.threats || []).length) {
    const soonest = e.threats.reduce((a, threat) => (threat.frac > a.frac ? threat : a));
    threatBar(cx, cy, cw, ch, soonest, true);
  } else {
    ctx.fillStyle = "#0a0d12"; roundRect(cx, cy, cw, ch, 4); ctx.fill();
    ctx.strokeStyle = "#ffffff22"; ctx.lineWidth = 1; roundRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1, 4); ctx.stroke();
    ctx.fillStyle = "#a6afbd"; ctx.font = `bold ${labelPx}px ui-monospace, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(e.reactive ? "⚡ strikes back" : "— no attack —", cx + cw / 2, cy + ch / 2);
  }
}
// ── NARROW-LANE FOE CARD (owner 2026-07-24 "unreadable at 4 players") ────────────────────────
// Same information as the wide row, re-flowed into horizontal BANDS so nothing has to compete for a
// ~215px line: portrait + NAME on top, one stat rail beside the portrait, an HP proportion bar, and
// the CAST TELEGRAPH as a full-width bar along the bottom — where it finally has room for the card
// name and the −damage together. Called only from drawFoeRow (frame/border/target ring already
// painted there, so both tiers keep one telegraph border language).
// FLAG (owner re-tune): band proportions and the stat-rail priority order are mine.
function drawFoeRowStacked(x, y, w, h, e, b, targeted) {
  const pad = h >= 84 ? 6 : 4;
  const inX = x + 7, inW = w - 14, inR = inX + inW;
  // bottom-anchored telegraph FIRST — it outranks every other band for the space it needs
  const chipH = Math.max(15, Math.min(26, Math.round(h * 0.26)));
  const chipY = y + h - pad - chipH;
  const barH = Math.max(3, Math.round(h * 0.05));
  const barY = chipY - 5 - barH;
  // FOE_STACK_MIN_H is set so this band always seats BOTH a name line and a stat rail — a card that
  // cannot is handed back to the wide strip rather than silently dropping shield/moxie/effects.
  const textTop = y + pad, textH = Math.max(12, barY - 3 - textTop);
  const iconSz = Math.max(16, Math.min(40, textH));
  const spr = foeSprite(formArt(e));
  if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, inX, textTop + (textH - iconSz) / 2, iconSz, iconSz);
  else {
    ctx.fillStyle = "#f4f5f7"; ctx.font = `${Math.max(11, iconSz - 4)}px serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(iconFor(e.bodyKey), inX + iconSz / 2, textTop + textH / 2);
  }
  const tx = inX + iconSz + 6;
  // 🎯 target / ♛ boss keeps its own corner so it can never land on the name's tail. ♛ is a
  // MONOCHROME glyph — without an explicit fill it inherits the card's own background and vanishes.
  const markW = (e.boss || targeted) ? 17 : 0;
  if (markW) {
    ctx.fillStyle = targeted ? "#3df" : "#ffcf4a";
    ctx.font = "14px serif"; ctx.textAlign = "right"; ctx.textBaseline = "top";
    ctx.fillText(targeted ? "🎯" : "♛", inR, textTop);
  }
  const nameH = Math.round(textH * 0.54);
  const statPx = Math.max(9, Math.min(13, Math.round((textH - nameH) * 0.58)));
  ctx.fillStyle = "#f4f5f7";
  fitText(e.name || b.name || e.bodyKey, tx, textTop + nameH / 2,
    Math.max(24, inR - markW - 4 - tx), Math.max(11, Math.min(17, Math.round(nameH * 0.78))), 10, "left", "middle");
  {
    // STAT RAIL, in falling priority: ❤HP → 🛡shield → ⬡armor → ⚡moxie → active effects → 🗡/🎯 bonus.
    // Anything that no longer fits is simply dropped (the wide row's permanent bonus seat is what
    // squeezed the NAME to two characters here).
    const ly = textTop + nameH + (textH - nameH) / 2;
    const rail = inR - markW - 2;
    ctx.font = `bold ${statPx}px ui-monospace, monospace`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    let sx = tx;
    const item = (txt, col) => {
      const bw = ctx.measureText(txt).width;
      if (sx + bw > rail) return false;
      ctx.fillStyle = col; ctx.fillText(txt, sx, ly); sx += bw + 6; return true;
    };
    item(`❤${e.hp}/${e.maxHp}`, "#9bf09b");
    if (e.shield > 0) item(`🛡+${e.shield}`, "#7fd6ff");
    if (e.dr > 0 && sx + 20 < rail) { const ar = Math.max(7, Math.round(statPx * 0.72)); drawArmorBadge(sx + ar, ly, ar, e.dr); sx += ar * 2 + 6; }
    item(`⚡${e.moxie ?? 0}/${e.moxieMax ?? 10}`, "#e6c34a");
    const effs = entityStatus(e, 4);
    if (effs.length) {
      const er = Math.max(IS_TOUCH ? 8 : 6, Math.round(statPx * 0.62)), estep = er * 2 + 3;
      const emax = Math.max(0, Math.min(effs.length, Math.floor((rail - sx) / estep)));
      for (let k = 0; k < emax; k++) drawEffectChipAt(sx + er + k * estep, ly, er, effs[k]);
      sx += emax * estep;
      ctx.font = `bold ${statPx}px ui-monospace, monospace`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    }
    item(foeBonusLabelAlways(e.meleeBonus, e.rangedBonus), "#ffd24a");
    if (e.thorns > 0) item(`🌵${e.thorns}`, "#a8d08a");
    if (e.warded) item("🔒ward", "#ffcf4a");
    if (e.aura) item("✦aura", "#ffe9a8");
  }
  // HP as a PROPORTION across the whole card, with the cyan shield cap on the right
  const hf = Math.max(0, e.hp / Math.max(1, e.maxHp));
  bar(inX, barY, inW, barH, hf, hf > 0.4 ? "#2f9b4a" : "#c0453a", "#0a0d12");
  if (e.shield > 0) {
    const capW = Math.min(inW * 0.4, 6 + String(e.shield).length * 5);
    ctx.fillStyle = "#1c4a63"; ctx.fillRect(inR - capW, barY, capW, barH);
  }
  drawFoeCastChip(inX, chipY, inW, chipH, e, Math.max(9, Math.min(12, Math.round(chipH * 0.5))));
}

// FOE CAST QUEUE (card/moxie): up to `n` upcoming cards, front-first, STACKED VERTICALLY (owner
// 2026-06-24). The front chip fills by moxie/cost (`castFrac`) — "this foe is building moxie to cast
// this"; the rest wait dim. Tinted by each card's school color. Full-width rows leave room for the
// card NAME alongside its ⚡cost. The full deck still shows on hover (drawFoeInspect).
function drawFoeQueue(x, y, w, h, e, big, n = 3, gap = 3) {
  const q = (e.queue || []).slice(0, n);
  if (!q.length) return;
  // The abstract ▸/▸▸/≣ target glyph is GONE (owner 2026-06-27) — WHO a foe hits is now telegraphed
  // by the targeted player's red incoming outline. The queue card keeps only the TOTAL damage
  // (−N, per-hit × count) so the number can never lie.
  for (let i = 0; i < q.length; i++) {
    const c = q[i], cy = y + i * (h + gap), col = c.color || "#fc6", front = i === 0;
    ctx.fillStyle = "#0a0d12"; roundRect(x, cy, w, h, 4); ctx.fill();                  // track
    if (front) {                                                                       // moxie fill
      const f = Math.max(0.05, Math.min(1, e.castFrac ?? 0));
      ctx.save(); roundRect(x, cy, w, h, 4); ctx.clip();
      ctx.fillStyle = col; ctx.fillRect(x, cy, w * f, h); ctx.restore();
    }
    ctx.lineWidth = front ? 1.5 : 1; ctx.strokeStyle = front ? "#ffffffcc" : "#ffffff22";
    roundRect(x + 0.5, cy + 0.5, w - 1, h - 1, 4); ctx.stroke();
    ctx.fillStyle = front ? "#fff" : "#aeb6c2"; ctx.textBaseline = "middle";
    if (big) {
      // left: ⚡cost + the card name (truncated). The FRONT chip shows LIVE moxie/cost (owner 2026-06-29,
      // mobile): the foe's CURRENT moxie, visible at all times, on the very card it's banking toward —
      // the fill (castFrac) is the "how soon", the number is the "where it is now".
      // READABILITY (owner 2026-07-07): the print rides the CHIP height (a taller row → a bigger chip
      // → bigger text), and the name truncates by MEASURED width, not a fixed 9 chars.
      const fs = Math.max(10, Math.min(17, Math.round(h * 0.58)));
      const dmgFont = `bold ${fs + 1}px ui-monospace, monospace`;
      const rTxt = c.hit != null ? `−${c.hit}` : (c.dmg ? String(c.dmg) : "");
      ctx.font = dmgFont;
      const rW = rTxt ? ctx.measureText(rTxt).width + 8 : 0;
      ctx.textAlign = "left"; ctx.font = `${fs}px ui-monospace, monospace`;
      const pre = `${front ? `⚡${e.moxie ?? 0}/${c.cost}` : `⚡${c.cost}`}${(c.healthCost ?? 0) > 0 ? ` ♥${c.healthCost}` : ""} `;
      let nm = c.name;
      const maxW = w - 10 - rW;
      if (ctx.measureText(pre + nm).width > maxW) {
        while (nm.length > 1 && ctx.measureText(pre + nm + "…").width > maxW) nm = nm.slice(0, -1);
        nm += "…";
      }
      ctx.fillText(pre + nm, x + 5, cy + h / 2);
      // right: the TOTAL damage this foe will deal (−N, bright) — or its effect label
      ctx.textAlign = "right"; ctx.font = dmgFont;
      if (c.hit != null) { ctx.fillStyle = front ? "#ff8a5a" : "#cc7a6a"; ctx.fillText(`−${c.hit}`, x + w - 5, cy + h / 2); }
      else if (c.dmg)   { ctx.fillStyle = front ? "#cdd6e3" : "#a6afbd"; ctx.fillText(c.dmg, x + w - 5, cy + h / 2); }
    } else {
      // condensed backline: show DAMAGE if it's an attack, else the moxie cost
      ctx.textAlign = "center"; ctx.font = "bold 10px ui-monospace, monospace";
      if (c.hit != null) { ctx.fillStyle = front ? "#ff8a5a" : "#cc7a6a"; ctx.fillText(`−${c.hit}`, x + w / 2, cy + h / 2); }
      else ctx.fillText(`⚡${c.cost}`, x + w / 2, cy + h / 2);
    }
  }
}

// ONE active-effect chip (owner 2026-07-11 phone legibility): dark disc + countdown ring + glyph
// (+ a corner stack/amount count when the engine ships `n`). EVERY surface that shows effect chips
// (foe cards, mobile foe rows, crowd minis, heroes, summon tokens) routes through this, so the chip
// grammar is identical everywhere. Pushes the tap/hover hitbox for drawEffectTooltip.
// FLAG (owner re-skin): disc/ring hues + the amber countdown color are placeholders.
function entityStatus(e, cap = 4) {
  const all = [...(e?.effects || []), ...(e?.trackers || [])];
  if (all.length <= cap) return all;
  const hidden = all.slice(Math.max(0, cap - 1));
  return [...all.slice(0, Math.max(0, cap - 1)), {
    icon: "+", label: `${hidden.length} more trackers — ${hidden.map((x) => x.label).join(" · ")}`, n: hidden.length,
  }];
}

function drawEffectChipAt(ccx, cy, r, eff) {
  ctx.save();
  const timed = eff.left != null && eff.dur && eff.dur <= 600;   // ≤60s reads as a real countdown
  ctx.beginPath(); ctx.arc(ccx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#0d1118"; ctx.fill();                         // disc: a chip always reads as a CHIP, never a bare glyph floating on the card
  ctx.lineWidth = 2; ctx.strokeStyle = "#0a0d12"; ctx.stroke();  // ring track
  if (timed) {
    const frac = Math.max(0, Math.min(1, eff.left / eff.dur));
    ctx.beginPath(); ctx.arc(ccx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.strokeStyle = "#ffcf4a"; ctx.stroke();                   // draining amber arc
  } else {
    ctx.beginPath(); ctx.arc(ccx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = "#6a86b0"; ctx.stroke(); // steady (this fight)
  }
  const cardArt = eff.cardKey ? cardSprite(eff.cardKey) : null;
  const bodyArt = !cardArt && eff.bodyKey ? foeSprite(eff.bodyKey) : null;
  const tokenArt = cardArt?.complete && cardArt.naturalWidth ? cardArt
    : bodyArt?.complete && bodyArt.naturalWidth ? bodyArt : null;
  if (tokenArt) {
    // The timer IS the card continuing to act. Reuse the exact card token instead of translating
    // Animated Blade/Rainblow/Starblade/Pet Leech into generic stopwatch/hourglass symbols.
    ctx.save(); ctx.beginPath(); ctx.arc(ccx, cy, Math.max(1, r - 2), 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(tokenArt, ccx - r + 2, cy - r + 2, (r - 2) * 2, (r - 2) * 2); ctx.restore();
  } else {
    ctx.font = `${Math.round(r * 1.5)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = eff.kind === "poison" ? "#79df78" : "#e8ecf2";   // poison keeps its own green status identity; other monochrome glyphs stay neutral
    ctx.fillText(eff.icon, ccx, cy + 1);
  }
  if ((eff.n ?? 0) > 1) {      // stack/amount count, bottom-right on the ring (Poison ×3, Power +2, Sapped −3)
    ctx.font = `bold ${Math.max(8, Math.round(r * 0.95))}px ui-monospace, monospace`;
    const bx = ccx + r * 0.8, byy = cy + r * 0.8;
    ctx.fillStyle = "#0a0d12"; ctx.fillText(String(eff.n), bx + 1, byy + 1);   // dark halo for contrast
    ctx.fillStyle = "#ffffff"; ctx.fillText(String(eff.n), bx, byy);
  }
  if (eff.progress?.mode === "threshold") {
    const txt = `${eff.progress.current}/${eff.progress.max}`;
    ctx.font = `bold ${Math.max(7, Math.round(r * 0.72))}px ui-monospace, monospace`;
    const tw = ctx.measureText(txt).width, pw = tw + 4, ph = Math.max(8, Math.round(r * 0.82));
    const px = ccx - pw / 2, py = cy + r - ph * 0.45;
    ctx.fillStyle = "#0a0d12e8"; roundRect(px, py, pw, ph, 3); ctx.fill();
    ctx.fillStyle = "#fff3ba"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, ccx, py + ph / 2 + 0.25);
  }
  ctx.restore();
  _effectBoxes.push({ x: ccx, y: cy, r: r + (IS_TOUCH ? 8 : 2), label: eff.label, left: eff.left, dur: eff.dur, timed });  // fat-finger pad on touch
}
// ACTIVE-EFFECT chips (owner 2026-06-24): a left-to-right row of chips — countdown arc when the effect
// is timed (≤60s), steady ring when it lasts the whole fight. Used on foe cards + players + summons.
function drawEffectChips(x, cy, effs, big) {
  if (!effs?.length) return;
  // touch chips grew 2→4 px of radius (owner 7/11: chips unreadable at phone scale) — FLAG size, owner-tunable
  const r = (big ? 8 : 6) + (IS_TOUCH ? 4 : 0), gap = big ? 6 : 4, step = r * 2 + gap;
  effs.slice(0, 8).forEach((eff, i) => drawEffectChipAt(x + r + i * step, cy, r, eff));
}
// Round bodies (heroes + summons) keep one centered rail beneath their HP/cast plate. The previous
// left-edge anchor made one effect sit far left while a three-effect stack crept toward the body.
function drawCenteredEffectChips(cx, cy, effs, big, cap = 8) {
  const shown = (effs || []).slice(0, cap);
  if (!shown.length) return;
  const r = (big ? 8 : 6) + (IS_TOUCH ? 4 : 0), gap = big ? 6 : 4, step = r * 2 + gap;
  const width = r * 2 + (shown.length - 1) * step;
  // keep the rail (and therefore its tap targets) on the board — a body parked at the far edge of
  // the last lane used to lose its outermost chips off-canvas
  const left = Math.max(2, Math.min(W - width - 2, cx - width / 2));
  drawEffectChips(left, cy, shown, big);
}
// FLAG (owner re-skin, 2026-07-11): the DAMAGE-REDUCTION badge. DR used to render as "🛡-N" text,
// which read as "minus N shield" (owner: "that -1 shield for DR for warewolf looks bad") — but 🛡 is
// the ABSORB pool. Now: ONE drawn hexagonal armor-plate badge in the established DR purple (#b6a8ff)
// with the per-hit reduction inside, used for players, foes, and inspect overlays alike. The hex
// SHAPE and the word "armor" (in prose/tooltips) are placeholders — owner may re-skin both.
function drawArmorBadge(cx, cy, r, n) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {           // pointy-top hexagon
    const a = -Math.PI / 2 + i * Math.PI / 3;
    i ? ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle = "#b6a8ff"; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = "#3a2f6b"; ctx.stroke();
  ctx.fillStyle = "#221a44"; ctx.font = `bold ${Math.max(9, Math.round(r * 1.15))}px ui-monospace, monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(n), cx, cy + 0.5);
  ctx.restore();
  // tappable like an effect chip — on touch the badge explains itself (no hover on a phone)
  _effectBoxes.push({ x: cx, y: cy, r: r + (IS_TOUCH ? 8 : 2), label: `armor ${n} — every hit it takes is reduced by ${n}`, left: null, dur: null, timed: false, perm: true });
}
// DECK PEEK (owner 2026-07-01): tap the hotbar's 🂠/🗑 counts to toggle a panel listing the draw
// pile, the discard, and lasting in-play cards — the phone has no side deck panel, and with
// exhaust-before-repeat the piles are real information. Names are SORTED (grouped ×N) so the
// panel never leaks the actual draw order.
function drawDeckPeek() {
  if (!_deckPeek) return;
  const me = pilot();
  if (!me || state?.phase !== "playing") return;
  // READABILITY (owner 2026-07-14): each peek line leads with the scale glyph and trails the number
  // summary — the same vocabulary as the hand. UTILITY cards carry no glyph (no false melee/ranged tag).
  const PEEK_GLYPH = { melee: "🗡", ranged: "🎯", both: "🗡🎯", none: "" };
  const group = (pile) => {
    const m = {}, meta = {};
    for (const c of pile || []) { m[c.name] = (m[c.name] || 0) + 1; meta[c.name] = c; }
    return Object.keys(m).sort().map((n) => { const c = meta[n], g = PEEK_GLYPH[c.scale] ?? "", s = c.sum || c.dmg || "";
      return `  ${g ? g + " " : "· "}${n}${m[n] > 1 ? ` ×${m[n]}` : ""}${s ? "  " + s : ""}`; }); };
  const lines = [`🂠 Draw pile (${me.deckCount ?? 0}) — sorted, order hidden`, ...group(me.drawPile)];
  lines.push(`🗑 Discard (${me.discCount ?? 0}) — reshuffles when the draw pile runs dry`, ...group(me.discPile));
  if (me.inPlayCards?.length) lines.push(`★ In play this fight`, ...group(me.inPlayCards));
  lines.push(`(tap the 🂠 counter to close)`);
  ctx.font = "12px ui-monospace, monospace";
  const w = Math.min(W - 12, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18);
  const h = Math.min(HOTBAR_Y - 12, lines.length * 15 + 12);
  const x = W - w - 6, y = 6;
  ctx.fillStyle = "#000e"; roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = "#e6c34a"; ctx.lineWidth = 1; roundRect(x, y, w, h, 8); ctx.stroke();
  ctx.fillStyle = "#e8ecf2"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  lines.slice(0, Math.max(1, Math.floor((h - 12) / 15))).forEach((l, i) => ctx.fillText(l, x + 9, y + 7 + i * 15));
}
// Hover a buff chip → a small label with its remaining duration (or "this fight"). On touch a
// TAPPED chip (_tapChip) shows the same label for a moment, since there is no hover.
function drawEffectTooltip() {
  let hit = _effectBoxes.find((b) => (mouse.x - b.x) ** 2 + (mouse.y - b.y) ** 2 <= b.r * b.r);
  if (!hit && _tapChip) { if (Date.now() < _tapChip.until) hit = _tapChip; else _tapChip = null; }
  if (!hit) return;
  const txt = hit.label + (hit.timed ? `  (${Math.max(0, hit.left / 10).toFixed(1)}s left)` : hit.perm ? "" : "  (this fight)");   // perm (armor badge): no duration suffix at all
  ctx.font = "12px ui-monospace, monospace";
  const w = ctx.measureText(txt).width + 16, h = 22;
  const x = Math.min(Math.max(6, hit.x - w / 2), W - w - 6);
  const y = Math.max(6, hit.y - h - 8);
  ctx.fillStyle = "#000e"; roundRect(x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = "#ffcf4a"; ctx.lineWidth = 1; roundRect(x, y, w, h, 6); ctx.stroke();
  ctx.fillStyle = "#f0e6c8"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(txt, x + 8, y + h / 2 + 0.5);
}
function bar(x, y, w, h, frac, color, bg = "#0006") {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}
// A single color-coded threat bar: a rounded track with the item/passive's color filling
// toward its next hit, the item name overlaid left and the time-to-fire right (when there's
// room). Near-full bars get a bright outline so an imminent hit pops.
function threatBar(x, y, w, h, t, withLabel) {
  const frac = Math.max(0, Math.min(1, t.frac || 0));
  ctx.fillStyle = "#0a0d12"; roundRect(x, y, w, h, 4); ctx.fill();      // track
  ctx.strokeStyle = "#ffffff1c"; ctx.lineWidth = 1; roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 4); ctx.stroke(); // always-visible rim
  if (frac > 0) { ctx.fillStyle = t.color || "#fc6"; roundRect(x, y, Math.max(4, frac * w), h, 4); ctx.fill(); }
  if (frac > 0.85) { ctx.strokeStyle = "#ffffffcc"; ctx.lineWidth = 1.5; roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 4); ctx.stroke(); }
  if (!withLabel) return;
  ctx.textBaseline = "middle";
  const cy = y + h / 2 + 0.5;
  ctx.font = `bold ${h >= 14 ? 12 : h >= 11 ? 11 : 9}px ui-monospace, monospace`; ctx.textAlign = "left";
  const lbl = (t.intent || t.label || "").slice(0, Math.floor((w - (t.dmg > 0 ? 78 : 44)) / 7.5)); // leave room for "−N · "
  ctx.fillStyle = "#000c"; ctx.fillText(lbl, x + 7, cy + 1);            // shadow for contrast on any hue
  ctx.fillStyle = "#fff";  ctx.fillText(lbl, x + 6, cy);
  // the hit it lands when full + the countdown: "−3 · 1.8s" — the question a player is
  // actually asking of a filling bar ("how hard, how soon")
  const rt = (t.dmg > 0 ? `−${t.dmg} · ` : "") + (frac >= 1 ? "NOW" : Math.max(0, (t.cd * (1 - frac)) / 10).toFixed(1) + "s");
  ctx.textAlign = "right";
  ctx.fillStyle = "#000c"; ctx.fillText(rt, x + w - 5, cy + 1);
  ctx.fillStyle = "#fff";  ctx.fillText(rt, x + w - 6, cy);
}
// Wrap `str` to at most `maxLines` lines of width `maxW` using the CURRENT ctx.font.
// The last line is ellipsized if the text doesn't fit. Returns the lines (it draws nothing).
function wrapLines(str, maxW, maxLines) {
  const words = String(str).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (let i = 0; i < words.length; i++) {
    const t = cur ? cur + " " + words[i] : words[i];
    if (!cur || ctx.measureText(t).width <= maxW) cur = t;
    else {
      lines.push(cur); cur = words[i];
      if (lines.length === maxLines) {            // out of room — ellipsize the last line
        let last = lines[maxLines - 1];
        while (last.length > 1 && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
        lines[maxLines - 1] = last + "…";
        return lines;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
// Draw a left-anchored label that always fits `maxW`: shrink the font from `basePx`
// down to `minPx`, then ellipsize as a last resort. Beats a blind character slice —
// long money-monster names ("Bubble-Burst Basilisk") render whole or gracefully clipped.
function fitText(str, x, y, maxW, basePx = 13, minPx = 9, align = "left", baseline = "top") {
  str = String(str);
  ctx.textAlign = align; ctx.textBaseline = baseline;
  let px = basePx;
  for (; px > minPx; px--) { ctx.font = `bold ${px}px ui-monospace, monospace`; if (ctx.measureText(str).width <= maxW) break; }
  ctx.font = `bold ${px}px ui-monospace, monospace`;
  if (ctx.measureText(str).width > maxW) {
    let s = str;
    while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
    str = s + "…";
  }
  ctx.fillText(str, x, y);
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
