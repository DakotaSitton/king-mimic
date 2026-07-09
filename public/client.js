// King Mimic client — thin renderer over the authoritative server snapshot.
// VERTICAL lanes: 3 columns, enemies up top charging downward, the Caravan is a bar along the
// bottom that you stand in front of. We never simulate locally — we draw the last 'state' message.

const $ = (id) => document.getElementById(id);

// layout — COLS is dynamic (lanes = player count, 1–4); per-lane WIDTHS are dynamic too
// (BORROWED WIDTH, owner picked D 2026-07-07) — see updateLaneWidths() below the band setup.
// The board got a 2026-06-10 readability overhaul: bigger canvas, big labeled cards with
// on-card passive text, fat threat bars. CSS caps the canvas at 100% width for phones.
const W = 780;
let COLS = 3;
// IS_TOUCH is a fixed device property (coarse primary pointer, or ?touch=1 to force it for
// screenshots/devtools). Decided ONCE here so the WHOLE mobile layout can branch off it and desktop
// keeps the exact literals below — byte-for-byte unchanged. (The touch HUD wiring still lives at its
// original spot far below; this is just the early read so the board geometry can use it.)
const IS_TOUCH = new URLSearchParams(location.search).has("touch") || matchMedia("(pointer: coarse)").matches;
// Vertical bands. DESKTOP (owner 2026-06-19/24): the FRIENDLY ZONE between the foe stack and the
// caravan was cramped, and the HAND of cards (HOTBAR_H 92→140) is the main mechanic, so the board
// grew DOWNWARD; H feeds --bh and the CSS aspect-ratio/fit reads W/H back through --bw/--bh, so
// changing H here never needs a matching CSS edit.
// MOBILE (owner 2026-06-25): a landscape phone is wide+short (~2.2:1) but this board is a near-square
// vertical stack (foes → heroes → caravan → hand). Fit that tall surface to a short screen and the
// whole 780-wide board letterboxes to ~45% of the width — every hardcoded Npx font renders ~half size
// with big empty flanks. The ONLY lever that enlarges on-screen text is the logical→device SCALE
// (= displayedWidth / W). The board is width-capped by the viewport, so raising that scale means
// SHRINKING the logical HEIGHT until WIDTH (not height) is the fit constraint. So on touch we KEEP
// W=780 — lane geometry, foe-card widths, hotbar slot widths, and ALL click math (toCanvas maps to
// 0..W) stay valid and proportioned — and only compress the vertical BANDS into a wide-short surface
// that fills the phone width → ~2× text. Foe cards + hero stack condense to fit (see render()).
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

let ws = null, you = null, state = null;
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
let myRoom = null, rejoinTimer = null, rejoinDelay = 1000;

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
setupReopen.onclick = () => { _setupDismissed = false; _setupSig = ""; renderSetup(); render(); };
document.body.appendChild(setupReopen);

function connect(onOpen) {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = onOpen;
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === "joined") {
      you = msg.you;
      activeId = msg.you;          // pilot your primary body until you possess another
      myRoom = msg.code;
      rejoinDelay = 1000;
      banner.style.display = "none";
      localStorage.setItem("km_room", msg.code);
      $("roomCode").textContent = "ROOM " + msg.code;
      $("lobby").classList.add("hidden");
      $("game").classList.remove("hidden");
      sizeCanvas();
    } else if (msg.type === "state") {
      // a PHASE CHANGE dismisses any floating inspect tip — without this, a tip opened by tap
      // (kit card / foe chip) lingers over the NEXT screen when the phase flips without a local
      // click (e.g. the last co-op partner locks the draft while your card tip is open).
      if (state?.phase !== msg.phase) foeTip.classList.add("hidden");
      state = msg;
      render();
      if (_auto) autoStep();
    } else if (msg.type === "error") {
      if (myRoom && /No such room/i.test(msg.message)) {
        // auto-rejoin failed for good (room reaped / run over) — back to a clean lobby.
        // Silent when it was a stale saved room on page open (nothing to apologize for).
        const wasInGame = you !== null;
        stopRejoin();
        myRoom = null; you = null; activeId = null; state = null;
        localStorage.removeItem("km_room");
        banner.style.display = "none";
        $("game").classList.add("hidden");
        $("lobby").classList.remove("hidden");
        $("lobbyErr").textContent = wasInGame ? "The room is gone — start a new one." : "";
        return;
      }
      $("lobbyErr").textContent = msg.message;
    }
  };
  ws.onclose = () => { if (you && myRoom) scheduleRejoin(); };
}
const send = (o) => ws && ws.readyState === 1 && ws.send(JSON.stringify(o));

// ---- auto-rejoin ---------------------------------------------------------
function stopRejoin() { if (rejoinTimer) clearTimeout(rejoinTimer); rejoinTimer = null; }
function tryRejoin() {
  rejoinTimer = null;
  if (!myRoom || (ws && ws.readyState <= 1)) return;
  connect(() => send({ type: "join", code: myRoom, name: $("name").value.trim(), token: TOKEN }));
}
function scheduleRejoin(now = false) {
  if (rejoinTimer || !myRoom) return;
  banner.style.display = "block";
  rejoinTimer = setTimeout(tryRejoin, now ? 0 : rejoinDelay);
  rejoinDelay = Math.min(rejoinDelay * 2, 5000);
}
// a phone waking from lock should snap back instantly, not wait out the backoff
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && myRoom && (!ws || ws.readyState > 1)) {
    stopRejoin(); rejoinDelay = 1000; scheduleRejoin(true);
  }
});

// ---- panel bridge --------------------------------------------------------
// map.js / inventory.js read live state and send actions through this object.
window.KM = {
  send: (o) => send(o),
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
};

// ---- lobby ---------------------------------------------------------------
$("name").value ||= localStorage.getItem("km_name") || ""; // name survives refresh (phones)
// SQUAD: ?bodies=N (1–4) → you pilot N bodies; the room runs as an N-player game and the
// extra bodies are bots that auto-draft/stock and fight on AUTO. Dev hook for now; a lobby
// control comes with the "how do you want to play" options later.
let _bodies = Math.max(1, Math.min(4, parseInt(new URLSearchParams(location.search).get("bodies"), 10) || 1));
// Lobby squad selector (1–4). Before a room exists it just remembers the choice for the
// `create` message; once we're IN a room (pre-run) it live-updates via {type:"setBodies"}.
// The server bumps players.size, which laneCount/the board preview already follow.
function paintBodiesPick() {
  document.querySelectorAll("#bodiesPick .bp-opt").forEach((b) =>
    b.classList.toggle("on", +b.dataset.bodies === _bodies));
}
document.querySelectorAll("#bodiesPick .bp-opt").forEach((b) => b.onclick = () => {
  _bodies = Math.max(1, Math.min(4, +b.dataset.bodies));
  paintBodiesPick();
  if (myRoom && you) send({ type: "setBodies", n: _bodies });   // in a room → change it live
});
paintBodiesPick();
$("createBtn").onclick = () => {
  const code = $("code").value.trim().toUpperCase();
  localStorage.setItem("km_name", $("name").value.trim());
  connect(() => send({ type: "create", name: $("name").value.trim(), code: code || undefined, token: TOKEN, bodies: _bodies }));
};
$("joinBtn").onclick = () => {
  const code = $("code").value.trim().toUpperCase();
  if (!code) { $("lobbyErr").textContent = "Enter the room name to join."; return; }
  localStorage.setItem("km_name", $("name").value.trim());
  connect(() => send({ type: "join", code, name: $("name").value.trim(), token: TOKEN }));
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
  if (_auto) { connect(() => send({ type: "create", name: "Hero", bodies: _bodies })); return; }
  if (_demo) return;
  // Mid-run refresh: bounce straight back into the saved room (the token reclaims the seat).
  const saved = localStorage.getItem("km_room");
  if (saved) {
    myRoom = saved;
    connect(() => send({ type: "join", code: saved, name: $("name").value.trim(), token: TOKEN }));
  }
});
function autoStep() {
  if (!state) return;
  if (state.phase === "lobby" && !_autoDone.has("enter")) {
    _autoDone.add("enter");
    send({ type: "start" });               // lobby → draft
  } else if (state.phase === "draft" && _auto !== "draft" && !_autoDone.has("pick")) {
    _autoDone.add("pick");
    send({ type: "chooseClass", key: state.draft.classes[0].key });
  } else if (state.phase === "stock" && _auto !== "stock" && !_autoDone.has("stock")) {
    _autoDone.add("stock");
    [[1, 0], [3, 1], [5, 2], [0, 2]].forEach(([idx, lane]) => send({ type: "stockAdd", idx, lane }));
    setTimeout(() => send({ type: "stockBegin" }), 120);
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
  tentacle:    { name: "Tentacle", maxHp: 1, atk: 0, cd: 0, color: "#7f6fb0" },
  itemEntity:  { name: "Animated Item", maxHp: 2, atk: 0, cd: 0, color: "#d8b66a" },
  boneWizard:  { name: "Bone Wizard", maxHp: 3, atk: 0, cd: 0, color: "#cfd0e8" },
  hydraHead:   { name: "Hydra Head", maxHp: 1, atk: 1, cd: 0, color: "#5fd0a0" },
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
// their absence, but the demo ships them so `?demo=won|shop` shows the real counter).
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
  return { id, bodyKey, hp, maxHp: DEMO_BODIES[bodyKey].maxHp, charge, cd, gear, passive: passive ?? null,
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
        { id: "w1", bodyKey: "pixie", name: "Penny Pixie", maxHp: 5, color: "#7f7", passive: null, lockedBy: "me",
          items: [it("Sword", "Deal 3 to the front foe."), it("Bow", "Deal 3 to your targeted foe."), it("Heal", "Heal yourself 4 HP.")] },
        { id: "w2", bodyKey: "basilisk", name: "Bubble-Burst Basilisk", maxHp: 2, color: "#6fbf9f", passive: "Hits your lane for 1 on its timer.", lockedBy: "p2",
          items: [it("Fire", "Deal 6 to your targeted foe."), it("Cold", "Deal 1 and delay its next attack."), it("Shield", "Block 4 in your lane.")] },
        { id: "w3", bodyKey: "mummy", name: "Money-Munching Mummy", maxHp: 2, color: "#c8b890", passive: "Chips its lane for 1 on its timer.", lockedBy: null,
          items: [it("Lightning", "Deal 2 to every foe in your target's lane."), it("Gavel", "Deal 7 to the front foe."), it("Wind", "Move your targeted foe over a lane.")] },
        { id: "w4", bodyKey: "accountant", name: "Angry Accountant", maxHp: 3, color: "#d0c060", passive: "Strikes back for 1 when it's hit.", lockedBy: null,
          items: [it("Bow", "Deal 3 to your targeted foe."), it("Bomb", "Once per fight: deal 5 to a lane."), it("Heal", "Heal yourself 4 HP.")] },
        { id: "w5", bodyKey: "wageslave", name: "Weary Wageslave", maxHp: 3, color: "#a0a0b0", passive: "Heals 1 on its timer.", lockedBy: null,
          items: [it("Sword", "Deal 3 to the front foe."), it("Lightning", "Deal 2 to a lane."), it("Cold", "Deal 1 and delay.")] },
        { id: "w6", bodyKey: "youngdead", name: "Yuppie Youngdead", maxHp: 4, color: "#9fbf6f", passive: null, lockedBy: null,
          items: [it("Bow", "Deal 3 to your targeted foe."), it("Fire", "Deal 6 to your targeted foe."), it("Shield", "Block 4 in your lane.")] },
      ],
      picks: [{ id: "me", name: "Hero", drafted: true, bundle: "w1" }, { id: "p2", name: "Mara", drafted: true, bundle: "w2" }],
      classes: DEMO_CLASSES,
    };
  } else if (kind === "stock") {
    base.phase = "stock";
    base.lanes = [{ shield: 0, enemies: [] }, { shield: 0, enemies: [] }, { shield: 0, enemies: [] }];
    base.stock = {
      max: 12, picksRequired: 1, canBegin: true, anteStocked: 6, anteRequired: 6, greedTreasure: 8,
      anteMin: 2, anteCap: 5, anteStep: 3,
      picks: [{ id: "me", name: "Hero", picks: 1 }, { id: "p2", name: "Mara", picks: 0 }],
      palette: [
        { bodyKey: "pixie", name: "Penny-Pinching Pixie", maxHp: 8, phys: 1, mag: 0, ante: 2, bodyAnte: 1, lootValue: 1, passive: "Its sword items charge 25% faster.", gear: [{ name: "Sword", text: "Deal sword + 1 to the front foe." }] },
        { bodyKey: "royalRat", name: "Royal Rat", maxHp: 6, phys: 0, mag: 0, ante: 2, bodyAnte: 1, lootValue: 1, passive: "Summons 2 rats every 8s; each staff item it resolves shaves 1.5s off the clock.", gear: [{ name: "Magic Missile", text: "Deal staff to your aimed foe (very fast)." }] },
        { bodyKey: "minotaur", name: "Market-Crash Minotaur", maxHp: 10, phys: 1, mag: 0, ante: 9, bodyAnte: 1, lootValue: 8, passive: "Every 7s: swords the front enemy. Taking a hit shaves 1.5s off the clock.", gear: [{ name: "Repeating Crossbow", text: "Deal sword to your aimed foe (relentless)." }, { name: "Blizzard", text: "Deal staff + 2 to every foe in your lane and drain 10 charge." }] },
      ],
      placed: [ // every stocked foe is a player invite now — removable, hover for the card
        { bodyKey: "pixie", name: "Penny-Pinching Pixie", lane: 0, ante: 2, maxHp: 8, phys: 1, mag: 0, bodyAnte: 1, lootValue: 1, gear: [{ name: "Sword", text: "Deal sword + 1 to the front foe." }], greedy: true },
        { bodyKey: "wageslave", name: "Weary Wageslave", lane: 1, ante: 2, maxHp: 10, phys: 1, mag: 0, bodyAnte: 1, lootValue: 1, gear: [{ name: "Bow", text: "Deal sword + 1 to your aimed foe." }], greedy: true },
        { bodyKey: "vampire", name: "Vengeful Vampire", lane: 2, ante: 2, maxHp: 8, phys: 2, mag: 0, bodyAnte: 1, lootValue: 1, passive: "Heals 1 after each sword item it resolves.", gear: [{ name: "Sword", text: "Deal sword + 1 to the front foe." }], greedy: true },
      ],
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
  } else if (kind === "shop") {
    base.phase = "shop";
    // a backpack to pay with (value-for-value), plus a full deck to edit
    base.players[0].backpack = _bp(["blade", "blade", "fire", "heal", "bow", "lightning", "blade", "fire", "heal", "bow", "fire", "lightning"]);
    base.players[0].deckList = _bp(["blade", "blade", "fire", "heal", "bow", "lightning", "blade", "fire", "heal", "bow"]);
    base.players[0].deckSize = 10; base.players[0].minDeck = 10;
    base.lanes = [{ shield: 0, enemies: [] }, { shield: 0, enemies: [] }, { shield: 0, enemies: [] }];
    base.map = { nodes: DEMO_NODES.map((n) => n.id === "n3" ? { ...n, type: "shop" } : n), currentId: "n3", levelComplete: false, bossName: "Hyper-Inflation Hydra", ..._demoMapMeta(DEMO_NODES, "n3") };
    base.shop = { wares: [
      { key: "gavel", name: "Gavel", text: "Deal 7 (+Phys) to the front foe.", value: 3, cost: 4 },
      { key: "fire", name: "Fire", text: "Deal 6 (+Mag) to your targeted foe.", value: 3, cost: 2 },
      { key: "shield", name: "Shield", text: "Block 4 incoming damage in your lane.", value: 1, cost: 2 },
      { key: "cold", name: "Cold", text: "Deal 1 (+Mag) and delay its next attack by 3.0s.", value: 1, cost: 1 },
      { key: "bomb", name: "Bomb", text: "Once per fight: deal 5 (+Phys) to every foe in your target's lane.", value: 2, cost: 3 },
    ] };
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
      effects: [{ icon: "🩸", label: "Blood To Iron — storing 4 dmg, repays as shield", left: 32, dur: 50 },
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
    // KRAKEN floor — the back-line banner, its tentacle wall, a stolen hotbar slot and
    // the stolen-item entity to kill for the rescue. 2 players, 2 lanes.
    base.phase = "playing";
    base.laneCount = 2;
    base.caravan = { hp: 15, max: 20 };
    base.boss = {
      id: "B1", bodyKey: "kraken", name: "Kleptomaniac Kraken", hp: 21, maxHp: 36, color: "#5f8fd0",
      passive: "Steals your items and turns them on you — kill the stolen item to take it back. Hides behind a wall of tentacles.",
      stance: null, stanceLabel: null, tentacleCap: 4,
      threats: [
        { kind: "clock", harm: false, label: "🦑 steal", color: "#d06fb0", frac: 0.62, cd: 280, dmg: 0 },
        { kind: "clock", harm: false, label: "🐙 wall", color: "#5f8fd0", frac: 0.31, cd: 200, dmg: 0 },
      ],
    };
    base.lanes = [
      { enemies: [
        _enemy("tentacle", 1, 0, [], "tn1", "A wall of suckers — it only blocks.", { reactive: false }),
        _enemy("tentacle", 1, 0, [], "tn2", "A wall of suckers — it only blocks.", { reactive: false }),
      ] },
      { enemies: [
        _enemy("tentacle", 1, 0, [], "tn3", "A wall of suckers — it only blocks.", { reactive: false }),
        _enemy("itemEntity", 2, 18, [{ key: "bow", name: "Bow", cd: 50, dmg: 1 }], "s1",
          "STOLEN — kill it to take it back.", { name: "Stolen Bow" }),
      ] },
    ];
    base.players = [
      { id: "me", name: "Hero", lane: 1, depth: 0, bodyKey: "vampire", hp: 6, maxHp: 11, alive: true, phys: 3,
        targetId: "B1",
        inv: [_inv("blade", 20), { ..._inv("bow", 0), stolen: true, ready: false }, _inv("fire", 30)] },
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
      { enemies: [_enemy("boneWizard", 3, 0, [], "w1", "Blasts EVERYONE in its lane for 1 every 6s.",
        { bars: [{ kind: "passive", harm: true, label: "✦1", color: "#ff9ed2", cd: 120, frac: 0.55, dmg: 1 }] })] },
      { enemies: [_enemy("boneWizard", 3, 0, [], "w2", "Blasts EVERYONE in its lane for 1 every 6s.",
        { bars: [{ kind: "passive", harm: true, label: "✦1", color: "#ff9ed2", cd: 120, frac: 0.9, dmg: 1 }] })] },
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
$("leaveBtn").onclick = () => {
  if (ws) { ws.onclose = null; try { ws.close(); } catch {} ws = null; }
  stopRejoin();
  myRoom = null; localStorage.removeItem("km_room"); // a deliberate leave shouldn't auto-rejoin
  banner.style.display = "none";
  you = null; activeId = null; state = null;
  $("game").classList.add("hidden");
  $("lobby").classList.remove("hidden");
  $("lobbyErr").textContent = "";
};

// ---- input ---------------------------------------------------------------
// Vertical lanes: left/right move between columns. 1-4 use items. (Server lanes are abstract:
// 'up' = lane-1 = move left, 'down' = lane+1 = move right.)
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if ($("game").classList.contains("hidden")) return; // in the lobby: never hijack typing
  if (e.code === "ArrowLeft" || e.code === "KeyA") { send({ type: "lane", dir: "up" }); e.preventDefault(); }
  else if (e.code === "ArrowRight" || e.code === "KeyD") { send({ type: "lane", dir: "down" }); e.preventDefault(); }
  else if (e.code === "ArrowUp" || e.code === "KeyW") { send({ type: "move", dir: "fwd" }); e.preventDefault(); }   // step toward foes (block)
  else if (e.code === "ArrowDown" || e.code === "KeyS") { send({ type: "move", dir: "back" }); e.preventDefault(); } // drop back behind teammates
  // Tab cycles POSSESSION among your squad (SQUAD model); Shift+Tab cycles the other way.
  // With a single body it falls back to the server's target cycle so the key still does
  // something useful for solo/legacy play.
  else if (e.code === "Tab") { cyclePossess(e.shiftKey ? -1 : 1) || send({ type: "cycleTarget", dir: e.shiftKey ? -1 : 1 }); e.preventDefault(); }
  else if (e.code === "KeyQ") { send({ type: "swapBody" }); e.preventDefault(); }
  else if (e.code.startsWith("Digit") || e.code.startsWith("Numpad")) {
    const n = Number(e.code.replace(/\D/g, ""));
    if (n >= 1 && n <= 9) { playHandSlot(n - 1); e.preventDefault(); }
  }
});

// CARD/MOXIE: play the hand card in slot k (by its instance id), if you can afford it. Shared by
// the number keys, a hotbar tap (touch), and a hotbar click (desktop). The server gates affordability
// too — this just avoids a wasted message and lets the UI ignore taps on dimmed cards.
function playHandSlot(k) {
  const card = (pilot()?.hand ?? [])[k];
  if (!card || card.affordable === false) return;
  if (card.pick) { openPickUI(card); return; }   // pick-cards (owner 2026-07-07): choose first, then play
  send({ type: "playCard", id: card.id });
}

// ── PICK POPOVER (owner cards 2026-07-07: Grand Spirit / Crystal Ball) ──────────────────────
// A hand card whose descriptor carries `pick` needs a choice BEFORE the play message:
//   {kind:"summonBody", options:[{key,label,icon}]} → one button per body (attacker/caster/tank)
//   {kind:"deckCard"}                               → the draw pile, grouped ×N, tap = tutor that card
// Plain DOM over the canvas (the overlays' pattern), sends the SAME playCard message + pick, and
// cancels on backdrop tap / Esc. The server validates the pick and has engine-side fallbacks, so a
// stale or garbage pick can never crash or softlock the seat.
let _pickEl = null;
function closePickUI() { if (_pickEl) { _pickEl.remove(); _pickEl = null; } }
function openPickUI(card) {
  closePickUI();
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;";
  const panel = document.createElement("div");
  panel.style.cssText = "background:#151a23;border:1px solid #39404d;border-radius:10px;padding:14px 16px;max-width:min(92vw,420px);max-height:80vh;overflow-y:auto;font-family:ui-monospace,monospace;color:#f4f5f7;";
  const title = document.createElement("div");
  title.style.cssText = "font-weight:700;margin-bottom:10px;font-size:15px;color:#ffd24a;";
  const kind = card.pick?.kind;
  title.textContent = kind === "summonBody" ? `${card.name} — choose its body` : `${card.name} — pick a card from your deck`;
  panel.appendChild(title);
  const send1 = (pick) => { send({ type: "playCard", id: card.id, pick }); closePickUI(); };
  const btn = (label, pick, iconKey) => {
    const b = document.createElement("button");
    b.style.cssText = "display:flex;align-items:center;gap:10px;width:100%;margin:4px 0;padding:8px 10px;background:#0f131b;border:1px solid #39404d;border-radius:8px;color:#f4f5f7;font:600 14px ui-monospace,monospace;cursor:pointer;text-align:left;";
    if (iconKey) { const im = document.createElement("img"); im.src = foeSprite(iconKey).src; im.width = 30; im.height = 30; b.appendChild(im); }
    const sp = document.createElement("span"); sp.textContent = label; b.appendChild(sp);
    b.onclick = () => send1(pick);
    panel.appendChild(b); return b;
  };
  if (kind === "summonBody") {
    for (const o of card.pick.options ?? []) btn(o.label, o.key, o.icon);
  } else if (kind === "deckCard") {
    const pile = pilot()?.drawPile ?? [];
    if (!pile.length) {
      const d = document.createElement("div"); d.style.cssText = "color:#a6afbd;font-size:12px;margin-bottom:6px;";
      d.textContent = "Draw pile is empty — plays with no tutor."; panel.appendChild(d);
      btn("Play anyway", "");
    }
    const grouped = new Map();               // one button per distinct card key, ×N label
    for (const c of pile) grouped.set(c.key, { c, n: (grouped.get(c.key)?.n ?? 0) + 1 });
    [...grouped.values()].sort((a, b) => a.c.name.localeCompare(b.c.name))
      .forEach(({ c, n }) => btn(`⚡${c.cost} ${c.name}${n > 1 ? ` ×${n}` : ""}${c.dmg ? `  ${c.dmg}` : ""}`, c.key));
  } else { send1(""); return; }              // unknown pick kind: the engine fallback decides
  const cancel = document.createElement("button");
  cancel.style.cssText = "margin-top:10px;width:100%;padding:7px;background:none;border:1px solid #59637255;border-radius:8px;color:#a6afbd;font:12px ui-monospace,monospace;cursor:pointer;";
  cancel.textContent = "cancel"; cancel.onclick = closePickUI; panel.appendChild(cancel);
  wrap.appendChild(panel);
  wrap.onclick = (e) => { if (e.target === wrap) closePickUI(); };
  document.body.appendChild(wrap);
  _pickEl = wrap;
}
addEventListener("keydown", (e) => { if (e.key === "Escape") closePickUI(); });

// ---- touch controls --------------------------------------------------------
// Phones get a floating d-pad + action buttons (see #touchHud in index.html) that
// send the SAME messages the keyboard sends — the server can't tell them apart.
// Gated on a coarse primary pointer so desktop never changes; ?touch=1 forces it
// (screenshots, devtools device mode). Item use on touch = tapping the hotbar card.
// (IS_TOUCH is declared up top now — the board geometry needs it — so this block just uses it.)
if (IS_TOUCH) {
  document.body.classList.add("touch");
  $("help").innerHTML = `tap a LANE to walk there &nbsp;·&nbsp; tap a FOE to target it &nbsp;·&nbsp; tap a TEAMMATE to aim heals &nbsp;·&nbsp; tap one of YOUR bodies to pilot it &nbsp;·&nbsp; HOLD a foe to read it &nbsp;·&nbsp; ▲ ▼ step forward / back past teammates and your summons (the front of the line blocks) &nbsp;·&nbsp; 🎯 one-shot pick (aim heals at your OWN body) &nbsp;·&nbsp; 🔁 cycle which body you pilot &nbsp;·&nbsp; tap an item card to use it &nbsp;·&nbsp; 🎭 swap body`;
  const TK = {
    // laneUp/laneDown are GONE (owner 2026-07-06, "the dpad still feels super clunky"):
    // lane movement is now a TAP on the board lane itself (cv click handler). ▲ ▼ stay —
    // a lane tap means "walk there"; depth-stepping past teammates has no tap surface.
    fwd: { type: "move", dir: "fwd" }, back: { type: "move", dir: "back" },
    swap: { type: "swapBody" },
    // `cycle` no longer sends a server message — it cycles LOCAL possession (handled below).
  };
  document.querySelectorAll("#touchHud [data-tk]").forEach((b) => {
    // pointerdown (not click): a soft-real-time game wants the step on finger DOWN
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (b.dataset.tk === "cycle") { cyclePossess(1); return; } // 🔁 pilot the next squad body
      send(TK[b.dataset.tk]);
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
function sizeCanvas() {
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

// mouse tracking for hover tooltips
const mouse = { x: -1, y: -1 };
let foeBoxes = []; // filled each render: { x, y, w, h, id } for click-to-target
let _inspectFoeId = null; // touch: a tapped foe whose inspect overlay stays open (desktop uses hover)
let heroBoxes = []; // filled each render: { x, y, r, id } for click-to-ALLY-target (heals)
let _effectBoxes = []; // filled each render: { x, y, r, label, left, dur, timed } for buff-chip hover
let _tapChip = null;   // touch (owner 2026-07-01): a tapped buff/debuff chip shows its label for a moment ({...box, until})
let _deckPeek = false; // touch (owner 2026-07-01): 🂠-counter tap toggles the draw/discard peek panel
// HOLD a hand card to READ it (owner 2026-07-01: no hover on a phone, and a plain tap PLAYS the
// card — so its text was unreadable in combat). ~360ms hold pins the card's tooltip; the release
// click is swallowed via _handHeld so reading never casts.
let _handTip = null;      // {k, until} — hand slot whose tooltip is pinned
let _handHeld = false, _handHoldTimer = null, _handHoldXY = null;
let _foeHeld = false;     // touch: a 360ms hold pinned a foe's inspect — eat the release click (tap = TARGET now)
let _bossBannerBottom = 0; // y of the boss banner's bottom edge (set in drawBossBanner) — foe stacks start below it

// ── FLOATING FEEDBACK (owner 2026-06-24): show buffs/passives FIRING. A small rising "+N" label pops
// on an entity whenever its damage (⚔ counters), shield (🛡), or health (❤ heal/regen) ticks UP —
// players AND foes, any source (Power Up, bruiser ramps, regen crowns, heals…). Driven purely off
// snapshot deltas (no server hooks): diff each entity's stats once per snapshot.
let _floaters = [];        // { id, text, color, born, dx }
let _fctPrev = {};         // id -> { hp, shield, counters } from the previous snapshot
let _fctTick = -1;
const FCT_LIFE = 9;        // snapshots a floater lives (~0.9s at the ~10/s snapshot cadence)
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
    const push = (text, color) => _floaters.push({ id: e.id, text, color, born: state.tick, dx: Math.random() * 22 - 11 });
    if (dC > 0) push(`+${dC} ⚔`, "#ffd24a");          // gained damage (Power Up / bruiser ramp)
    if (dS > 0) push(`+${dS} 🛡`, "#7fd6ff");          // gained shield (regen crown / passive)
    if (dH > 0 && st.hp <= (e.maxHp ?? 1e9)) push(`+${dH} ❤`, "#7ce08a"); // healed (regen / lifesteal)
  }
  _fctPrev = cur;
}
function _drawFct() {
  if (!_floaters.length) return;
  _floaters = _floaters.filter((f) => (state.tick - f.born) < FCT_LIFE);
  for (const f of _floaters) {
    const box = foeBoxes.find((b) => b.id === f.id) || heroBoxes.find((b) => b.id === f.id);
    if (!box) continue;                               // entity off-screen / gone this frame
    const t = (state.tick - f.born) / FCT_LIFE;       // 0..1 over its life
    const cx = (box.w != null ? box.x + box.w / 2 : box.x) + f.dx;
    const topY = (box.w != null ? box.y : box.y - (box.r || 14));
    const y = topY - 4 - t * 24;                      // rises as it ages
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.font = "bold 15px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillStyle = "#000b"; ctx.fillText(f.text, cx + 1, y + 1);
    ctx.fillStyle = f.color; ctx.fillText(f.text, cx, y);
  }
  ctx.globalAlpha = 1;
}
// map a client point to LOGICAL board coords (0..W, 0..H) — independent of backing-store/DPR
const toCanvas = (e) => {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
};
cv.addEventListener("mousemove", (e) => { const p = toCanvas(e); mouse.x = p.x; mouse.y = p.y; render(); });
cv.addEventListener("mouseleave", () => { mouse.x = mouse.y = -1; render(); });
// PRESS-AND-HOLD a hand card → pin its tooltip (touch only; desktop reads via hover). Same 360ms /
// 10px-drift grammar as the HTML .km-card hold. The release click is eaten in the cv click handler.
cv.addEventListener("touchstart", (e) => {
  _handHeld = false; _foeHeld = false;
  const t = e.touches[0]; if (!t || (state?.phase !== "playing" && state?.phase !== "setup")) return;
  const p = toCanvas(t);
  if (p.y < HOTBAR_Y + 22) {
    // BOARD hold: a plain tap TARGETS a foe now (owner 2026-07-06), so reading one moved
    // here — hold ~360ms to pin its inspect overlay, same grammar as the hand strip below.
    const fb = foeBoxes.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
    if (!fb) return;
    _handHoldXY = { x: t.clientX, y: t.clientY };
    clearTimeout(_handHoldTimer);
    _handHoldTimer = setTimeout(() => { _foeHeld = true; _inspectFoeId = fb.id; render(); }, 360);
    return;
  }
  const hand = pilot()?.hand ?? [];
  if (!hand.length) return;
  const k = Math.floor(p.x / (W / hand.length));
  if (k < 0 || k >= hand.length) return;
  _handHoldXY = { x: t.clientX, y: t.clientY };
  clearTimeout(_handHoldTimer);
  _handHoldTimer = setTimeout(() => { _handHeld = true; _handTip = { k, until: Date.now() + 4000 }; render(); }, 360);
}, { passive: true });
cv.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  if (t && _handHoldXY && Math.hypot(t.clientX - _handHoldXY.x, t.clientY - _handHoldXY.y) > 10) clearTimeout(_handHoldTimer);
}, { passive: true });
cv.addEventListener("touchend", () => clearTimeout(_handHoldTimer), { passive: true });
// --- stock-screen hover card: full body + loadout inspect for any placed foe chip -------
// One floating div, event-delegated (the chips are rebuilt every snapshot, so per-chip
// listeners would be lost); content is read from the LATEST snapshot at hover time.
const foeTip = document.createElement("div");
foeTip.id = "kmTip"; foeTip.className = "hidden";
document.body.appendChild(foeTip);
const escTip = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const escAttr = (s) => escTip(s).replace(/"/g, "&quot;");   // safe inside a double-quoted attribute
function foeTipHtml(f) {
  const gear = (f.gear ?? []).map((g) => (typeof g === "string" ? { name: g, text: "" } : g));
  return `<b class="tip-name">${escTip(f.name)}</b>
    <div class="tip-stat">❤${f.maxHp ?? "?"}${(f.counters ?? 0) > 0 ? ` · ✦+${f.counters} dmg` : ""}${f.bodyAnte ? ` · ⚖${f.bodyAnte} body` : ""}</div>
    ${f.passive ? `<div class="tip-pass">✦ ${escTip(f.passive)}</div>` : ""}
    ${gear.map((g) => `<div class="tip-item"><b>${g.cost != null ? `⚡${g.cost} ` : "◆ "}${escTip(g.name)}</b>${g.text ? `<div>${escTip(g.text)}</div>` : ""}</div>`).join("")
      || `<div class="tip-item">— no items (body only) —</div>`}`;
}
// Resolve the foe object behind a tip chip — STOCK placed foes (data-tipfoe) and ROOM-PREVIEW foes
// (data-roomtip-node, read fresh from the snapshot so the tip never goes stale).
const tipFoeFor = (chip) =>
  chip.dataset.tipfoe != null ? (state?.stock?.placed?.[+chip.dataset.tipfoe] ?? null)
  : chip.dataset.roomtipNode != null ? roomTipFoe(chip)
  : null;
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
  foeTip.innerHTML = `<b class="tip-name">${escTip(el.dataset.ctName || "Card")}${cost ? ` <span class="tip-cost">⚡${escTip(cost)}</span>` : ""}</b>
    <div class="tip-pass">${escTip(el.dataset.ctText || "—")}</div>`;
  foeTip.classList.remove("hidden");
  const r = el.getBoundingClientRect();
  foeTip.style.left = Math.max(6, Math.min(window.innerWidth - 250, r.left)) + "px";
  const above = r.top - foeTip.offsetHeight - 6;
  foeTip.style.top = (above < 6 ? r.bottom + 6 : above) + "px";
}
// DESKTOP hover: stock chips AND room-preview chips both raise the floating foe inspector;
// data-ct card chips (draft kit) raise their own-card tip the same way.
document.addEventListener("mouseover", (e) => {
  const kc = e.target.closest?.("[data-ct-name]");
  if (kc) { showDataTip(kc); return; }
  const chip = e.target.closest?.("[data-tipfoe],[data-roomtip-node]");
  if (!chip) { foeTip.classList.add("hidden"); return; }
  showFoeTip(chip, tipFoeFor(chip));
});
// MOBILE tap (also works on desktop click): tapping a room-preview foe chip opens its tip and must
// NOT advance the room button underneath — capture-phase stopPropagation eats the click before the
// room-card's onclick fires. Same deal for a draft kit card chip (its parent button picks the
// bundle — reading a card must not lock a draft). Tapping anywhere else dismisses the tip.
document.addEventListener("click", (e) => {
  const chip = e.target.closest?.("[data-roomtip-node]");
  if (chip) {
    e.stopPropagation();          // capture phase → the room-select button never sees this tap
    const f = roomTipFoe(chip);
    if (f) showFoeTip(chip, f); else foeTip.classList.add("hidden");
    return;
  }
  const kc = e.target.closest?.("[data-ct-name]");
  if (kc) {
    e.stopPropagation();          // capture phase → the bundle button never sees this tap
    showDataTip(kc);
    return;
  }
  foeTip.classList.add("hidden");  // tap elsewhere → put the inspector away
}, true);

// PRESS-AND-HOLD a deck/backpack/draft card → its description in a floating tip (owner 2026-06-29: on a
// phone the inline `.dt` text is hidden and the `title=` tooltip needs a mouse, so you couldn't tell what
// an item DOES). Hold ~360ms to read; a quick tap still moves the card. Reuses the foe-tip element/styles.
let _cardHoldTimer = null, _cardHeld = false, _cardHoldXY = null;
function showCardTip(el) {
  const name = el.querySelector(".dn")?.textContent?.trim() || "Card";
  const txt = el.getAttribute("title") || el.querySelector(".dt")?.textContent || "";
  if (!txt) return;
  foeTip.innerHTML = `<b class="tip-name">${escTip(name)}</b><div class="tip-pass">${escTip(txt)}</div>`;
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

// Board clicks (SQUAD model). DESKTOP default = POSSESS: clicking one of YOUR squad bodies
// re-points the HUD/keys to it; targeting hides under the 🎯 Target toggle (one-shot, below):
// when ARMED, the next click instead sets your target (foe → {target}, ally/own body →
// {allyTarget}) and disarms, so a stray click can't mis-aim.
// TOUCH taps aim DIRECTLY (owner 2026-07-06): tap a foe = target it, tap a teammate = aim
// heals, tap your own body = pilot it, tap open lane floor = walk there (replaced the
// dpad's ◀ ▶), HOLD a foe = read it. 🎯 still works armed (needed to heal-aim your OWN body).
cv.addEventListener("click", (e) => {
  const p = toCanvas(e);
  // The HAND lives in the hotbar strip: a click/tap on a card plays it (desktop AND touch now —
  // cards ARE the buttons). Same geometry drawHotbar uses; routes to the piloted body.
  if (p.y >= HOTBAR_Y && state) {
    // the METER STRIP (moxie pips + 🂠/🗑 counts) is NOT a card — a tap there must never play one.
    // Tapping its right half (the counts) toggles the DECK PEEK panel (the phone has no side panel).
    if (p.y <= HOTBAR_Y + 22) {
      if (p.x > W * 0.5) { _deckPeek = !_deckPeek; render(); }
      return;
    }
    // a HOLD that pinned a card's tooltip must not ALSO play it — eat the release click
    if (_handHeld) { _handHeld = false; return; }
    const hand = pilot()?.hand ?? [];
    const k = Math.floor(p.x / (W / Math.max(hand.length, 1)));
    if (k >= 0 && k < hand.length) { _handTip = null; playHandSlot(k); }
    return;
  }
  const foeHit = foeBoxes.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
  const heroHit = heroBoxes.find((b) => (p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= b.r * b.r);

  if (targetArmed) {                                 // ONE-SHOT target pick (armed by 🎯)
    // pick whichever is NEARER the tap — an ally tap must not get stolen by an overlapping foe
    // box (bug: ally-targeting "stopped working" because foeHit always won). foe → attack aim,
    // ally / your own body → heal aim.
    const fd = foeHit ? (p.x - (foeHit.x + foeHit.w / 2)) ** 2 + (p.y - (foeHit.y + foeHit.h / 2)) ** 2 : Infinity;
    const hd = heroHit ? (p.x - heroHit.x) ** 2 + (p.y - heroHit.y) ** 2 : Infinity;
    if (foeHit && fd <= hd) send({ type: "target", foeId: foeHit.id });
    else if (heroHit) send({ type: "allyTarget", playerId: heroHit.id });
    if (foeHit || heroHit) { setTargetArmed(false); return; }               // consumed the pick
    return;                                          // a miss disarms nothing — try again
  }

  // TAP A BUFF/DEBUFF CHIP (owner 2026-07-01): no hover on a phone — a tap shows the chip's label
  // for a moment instead (drawEffectTooltip renders _tapChip). Checked BEFORE the foe card so a
  // chip riding a card wins the tap; aiming (above) still beats everything.
  const chipHit = _effectBoxes.find((b) => (p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= b.r * b.r);
  if (chipHit) { _tapChip = { ...chipHit, until: Date.now() + 2500 }; render(); return; }

  // TOUCH TAP GRAMMAR (owner 2026-07-06): aiming shouldn't need the 🎯 arm on a phone.
  if (IS_TOUCH && (state?.phase === "playing" || state?.phase === "setup")) {
    if (_foeHeld) { _foeHeld = false; return; }      // a hold pinned an inspect — don't also aim
    // overlap pick: the NEARER of foe box / hero circle wins, same fix as the armed path above
    const fd = foeHit ? (p.x - (foeHit.x + foeHit.w / 2)) ** 2 + (p.y - (foeHit.y + foeHit.h / 2)) ** 2 : Infinity;
    const hd = heroHit ? (p.x - heroHit.x) ** 2 + (p.y - heroHit.y) ** 2 : Infinity;
    if (foeHit && fd <= hd) { _inspectFoeId = null; send({ type: "target", foeId: foeHit.id }); return; }
    if (heroHit) {
      const pl = state?.players?.find((q) => q.id === heroHit.id);
      if (!pl) return;
      if (isMine(pl)) {                              // YOURS → pilot it (possess grammar unchanged)
        if (heroHit.id !== activeId) {
          activeId = heroHit.id;
          setTargetArmed(false);                     // switching bodies cancels a stale arm
          send({ type: "possess", id: heroHit.id }); // server routes all later input here
          render();                                  // repaint HUD/ring immediately
        }
      } else send({ type: "allyTarget", playerId: heroHit.id });   // TEAMMATE → aim heals
      return;
    }
    if (_inspectFoeId != null) { _inspectFoeId = null; render(); }
    // open lane floor → WALK there (server clamps; {lane:N} jumps straight to the column).
    // laneAt maps through the BORROWED-WIDTH geometry, so a slim empty lane still takes the tap.
    const lane = Math.max(0, Math.min(COLS - 1, laneAt(p.x)));
    if (lane !== (pilot()?.lane ?? lane)) send({ type: "lane", lane });
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

// (colCenter now lives with the BORROWED-WIDTH lane geometry near the top — per-lane widths.)

// Foe icons by body key. Emoji placeholders — replace a value with real art later
// (e.g. swap to drawing an Image keyed on bodyKey) and nothing else has to change.
const FOE_ICON = {
  rookie: "🎭", warrior: "🛡️", rogue: "🗡️", mage: "🔮", cleric: "✨",
  pixie: "🧚", auditAngel: "👼", killionaire: "🤑",
  rat: "🐀", royalRat: "👑", fatCat: "🐈",
  babyfangs: "🦷", vampire: "🧛", greatsword: "🤺",
  internImp: "😈", medusa: "🐍", magnate: "💰",
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
  hydraHead: "🐍", boneWizard: "💀", tentacle: "🐙", itemEntity: "🪄",
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
  bribedBishop: "auditAngel", chequeCherub: "auditAngel", pyramidHead: "runeblade",
  sphinx: "medusa", pennyPixie: "pixie", econElemental: "totem", wanderCastle: "juggernaut",
  earthElemental: "totem", lavaElemental: "phoenix",
  // GRAND SPIRIT summon bodies (owner 2026-07-07, pick-a-form card): no art yet — ⚠ ALL PLACEHOLDER
  // best-fit aliases to existing silhouettes so the summoned form never 404s to a ❔; owner art pass
  // replaces these. Keys land with the parallel cards branch (attacker/caster/tank forms).
  grandAttacker: "minotaur", grandCaster: "lizardWizard", grandTank: "atlas",
};
// Resolve a bodyKey to its ART file stem (alias first, then the inert legacy U/R strip).
const artStem = (k) => ART_ALIAS[k] || (k || "").replace(/[UR]$/, "");
// Bodies are flat now (bare family keys); the trailing-U/R strip is a harmless legacy guard.
const iconFor = (k) => FOE_ICON[artStem(k)] || FOE_ICON[k] || "❔";
// HTML icon: the vector token (public/foes/<key>.svg) as an <img>, so menus use the SAME art as
// the board. If the sprite is missing the onerror swaps the <img> for its alt emoji — so this can
// never render worse than the old emoji. (Canvas draws via foeSprite(); only HTML uses this.)
const iconImg = (k) => `<img class="km-ico" src="/foes/${artStem(k)}.svg" alt="${iconFor(k)}" onerror="this.outerHTML=this.alt">`;

// Drawn foe art, lazily loaded from /foes/<bodyKey>.svg (generated by tools/generate-foe-art.js).
// Falls back to the emoji above until the image is ready.
const _foeSprites = {};
function foeSprite(key) {
  // bodies are flat now — bare family keys map straight to their art (legacy U/R strip kept inert)
  if (!(key in _foeSprites)) { const img = new Image(); img.src = `/foes/${artStem(key)}.svg`; _foeSprites[key] = img; }
  return _foeSprites[key];
}

// The summon-placement toggle: two big buttons, shown while your kit holds a live summon item.
// Visible in SETUP too (owner 2026-06-19) so you can pre-set FRONT/BEHIND before the fight, same
// as the fire-mode toggle. The active side is server state (player.summonSide).
function updateSummonSide() {
  const el = $("summonSide"); if (!el) return;
  const me = pilot();
  // owner 2026-06-21: the Front/Back row stays PUT all through combat/setup so switching bodies
  // never reshuffles the rail ("hurts my eyes"). When the piloted body can't summon, the buttons
  // just go inert (dimmed/disabled) — the slot is reserved, not collapsed.
  // ⚠ me can be NULL mid-combat (snapshot gap / seat vanished) — `me?.alive !== false` alone reads
  // TRUE for null and fell through to `me.summonSide` → a pageerror EVERY render tick (caught by
  // tools/mobile-verify.mjs 2026-07-01). A missing pilot means nothing to render: require me.
  const live = !!me && (state?.phase === "playing" || state?.phase === "setup") && me.alive !== false;
  el.classList.toggle("hidden", !live);
  if (!live) return;
  const canSummon = !!(me?.bodySummons ||                 // worn summoner body (Royal Rat & kin)
     (me?.inv ?? []).some((iv) => iv.summons && !iv.spent && !iv.stolen));
  const side = me.summonSide ?? "front";
  const f = $("ssFront"), b = $("ssBack");
  el.classList.toggle("inert", !canSummon);
  f.disabled = b.disabled = !canSummon;
  f.classList.toggle("on", canSummon && side !== "back");
  b.classList.toggle("on", canSummon && side === "back");
  f.onclick = () => { if (canSummon) send({ type: "summonSide", side: "front" }); };
  b.onclick = () => { if (canSummon) send({ type: "summonSide", side: "back" }); };
}

// The fire-mode toggle (owner 2026-06-12 "tired of clicking"): ⚡ AUTO fires ready DAMAGING
// items by itself; heals/shields/summons/one-shots stay manual. Sticky server state
// (player.autoFire) — same sticky-mode contract as the summon toggle, no per-press questions.
function updateFireMode() {
  const el = $("fireMode"); if (!el) return;
  const me = pilot();
  const show = !!me && (state?.phase === "playing" || state?.phase === "setup") && me.alive !== false; // setup too; null me = nothing to render (same crash class as updateSummonSide)

  el.classList.toggle("hidden", !show);
  if (!show) return;
  const b = $("fmToggle");                                  // ONE button now (saves space) — flips the piloted body
  b.classList.toggle("on", !!me.autoFire);
  // SHORT label on the narrow phone rail (the "— tap for…" hint overflowed the 118px panel); desktop
  // keeps the descriptive text (owner 2026-06-25 overflow sweep).
  b.textContent = IS_TOUCH ? (me.autoFire ? "⚡ AUTO" : "✋ MANUAL")
                           : (me.autoFire ? "⚡ AUTO — tap for manual" : "✋ MANUAL — tap for auto");
  b.onclick = () => send({ type: "autoFire", on: !me.autoFire });
}

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
  const sig = JSON.stringify([squad.map((p) => [p.id, p.hp, p.maxHp, p.shield, p.bodyKey, p.autoFire, p.alive]), activeId]);
  if (sig === _squadBarSig) return;
  _squadBarSig = sig;
  const chip = (bg, brd, op) => `padding:5px 9px;margin:2px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:bold;border:2px solid ${brd};background:${bg};color:#dfe7f0;opacity:${op}`;
  const chips = squad.map((p) => {
    const active = p.id === activeId, dead = p.alive === false;
    const tag = active ? "🎮" : p.autoFire ? "⚡" : "✋";
    const shield = p.shield > 0 ? ` <span style="color:#bfe9ff">🛡${p.shield}</span>` : "";   // shield rides the HP readout
    return `<button data-pilot="${p.id}" style="${chip(active ? "#2a2616" : dead ? "#2a1a1a" : "#171a21", active ? "#e6c34a" : "#2a2f3a", dead ? 0.5 : 1)}">${iconImg(p.bodyKey)} ${p.hp}/${p.maxHp}${shield} ${tag}</button>`;
  }).join("");
  el.innerHTML = chips + `<button data-cycle="1" style="${chip("#171a21", "#2a2f3a", 1)}">⏭ next</button>`;
  el.querySelectorAll("[data-pilot]").forEach((b) => b.onclick = () => {
    const id = b.dataset.pilot;
    if (id === activeId) return;
    activeId = id; setTargetArmed(false); send({ type: "possess", id }); render();
  });
  el.querySelector("[data-cycle]").onclick = () => cyclePossess(1);
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

// SQUAD-SIZE row (lobby phase only): mirror of the lobby picker, live-edits via setBodies.
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
  send({ type: "setBodies", n: _bodies });
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
function updateTargetBtn() {
  const el = $("targetRow"); if (!el) return;
  const me = pilot();
  const show = state?.phase === "playing" && me?.alive !== false;
  el.classList.toggle("hidden", !show);
  if (!show) { if (targetArmed) setTargetArmed(false); return; }
  const b = $("targetBtn");
  if (b && !b._wired) { b._wired = true; b.onclick = () => setTargetArmed(!targetArmed); }
}

function render() {
  if (!state) return;
  // RESILIENCE (owner live bug 2026-07-09): render() is driven synchronously by ws 'state' messages
  // (connect().onmessage) and input/resize events — there is NO requestAnimationFrame loop and NO
  // outer catch. So any throw AFTER ctx.clearRect() below aborts the frame with the canvas already
  // cleared, and because the throw is deterministic on the bad snapshot it repeats every message →
  // the board (foes + heroes + hand/deck) stays permanently blank while the simulation keeps running
  // underneath, and you lose without seeing it. A single bad frame must never be able to do that:
  // wrap the whole draw so a throwing frame is LOGGED (never silently swallowed) and DROPPED — the
  // next snapshot repaints from a clean clearRect. Root-cause guards still fix known offenders; this
  // is the backstop for the unknown next one.
  try {
    _renderFrame();
  } catch (e) {
    console.error("render(): frame draw threw — dropping this frame so the board can't stay blank.",
      { phase: state?.phase, tick: state?.tick, error: e });
  }
}
function _renderFrame() {
  const { lanes, players, bodies, phase } = state;   // caravan deleted (owner 2026-06-27)
  try { _fctSnap(); } catch (e) {}   // floating +N feedback for buffs/passives — eye-candy, never let it break the board
  // Possession is a COMBAT concept — out of combat (draft/stock/shop/won/lobby/lost) the
  // human manages their PRIMARY seat's economy, so snap the pilot back to `you`. This keeps
  // the inventory panel + the loot/shop overlays coherent on one body between rooms.
  // DRAFT keeps the active body too — you pick a body+kit for EACH squad member, so the draft
  // selector drives `activeId` to whichever one you're choosing for. Only the economy phases snap home.
  // …and tell the SERVER too (it routes input by the last possess) — otherwise stock/shop/loot
  // actions after a draft would still land on the last body you drafted for, not your primary.
  // SQUAD: the human pilots EACH body through the whole run, so possession now persists
  // through the per-body economy phases too — draft (pick a body+kit per slot), stock (stock
  // each lane), won (loot/kit/swap per body), and shop (buy per body). Only snap home in the
  // truly un-managed phases (lobby/lost/etc.), where there's no per-body action to take.
  // Whenever activeId changes we also tell the SERVER (it routes input by the last possess),
  // and we guard activeId against a body that left the snapshot (died/dropped → fall to primary).
  const MANAGED = phase === "playing" || phase === "setup" || phase === "draft" ||
    phase === "stock" || phase === "won" || phase === "shop";
  if (!MANAGED && activeId !== you) {
    activeId = you; setTargetArmed(false); send({ type: "possess", id: you });
  } else if (MANAGED && activeId !== you && !(players || []).some((p) => p.id === activeId && isMine(p))) {
    // possessed body vanished from the snapshot — fall back to primary and re-point the server
    activeId = you; send({ type: "possess", id: you });
  }
  // touch HUD only exists while the board is the active surface — out of combat it
  // would sit on top of the map/shop/inventory panels and steal their taps. In SETUP the d-pad is
  // live only once the deck-editor overlay is dismissed (board reachable); otherwise it'd float over it.
  if (IS_TOUCH) $("touchHud").classList.toggle("tactive", phase === "playing" || (phase === "setup" && _setupDismissed));
  // the map only outranks overlays on the WON screen (clicking it picks the path);
  // everywhere else overlays cover it — wide cards (draft) slide under it otherwise
  document.body.classList.toggle("map-top", phase === "won");
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
  const foesLeft = lanes.reduce((n, l) => n + l.enemies.length, 0) + (state.boss ? 1 : 0);
  const rt = (state.roomTimers ?? [])[0];
  // room effects (enchants) are retired — the HUD carries only a live room TIMER if the engine ships one
  const ench = rt ? ` · ${rt.kind === "acid" ? "☢" : rt.kind === "scale" ? "📈" : "🐀"} ${((rt.cd * (1 - rt.frac)) / 10).toFixed(1)}s` : "";
  $("waveInfo").textContent = {
    lobby: "Press ENTER ROOM when everyone's in",
    draft: "Choose your class…",
    stock: `Floor ${state.floor} — stock the room${ench}`,
    setup: `Floor ${state.floor} — position your party, then Begin Combat`,
    playing: `Floor ${state.floor} · Foes left: ${foesLeft}${state.gimmick ? ` · ⚠ ${state.gimmick.name}` : ""}${ench}`,
    won: "Room cleared! 🎉",
    lost: "",
  }[phase] ?? "";
  const me = pilot();
  // ONE line, always: your passive/tags live on your card + the inventory panel now, so the
  // hud carries only vitals — a wrapped hud was costing the short-viewport laptops a text row.
  $("bodyInfo").textContent = me
    ? `${state.god ? "⚡GOD · " : ""}${bodies[me.bodyKey].name} ${me.hp}/${me.maxHp}${me.shield > 0 ? ` +${me.shield}🛡` : ""}${me.dr > 0 ? ` 🛡-${me.dr}` : ""}${bonusLabel(me.meleeBonus, me.rangedBonus) ? " · " + bonusLabel(me.meleeBonus, me.rangedBonus) : ""}${IS_TOUCH ? "" : ` · [Q] swap (${state.unlockedBodies.length})`}`
    : "";
  // MOBILE clutter cut: the room code matters at JOIN, not mid-fight — hide it during active combat
  // so the slim phone HUD spends its width on vitals (it returns out of combat / on setup).
  if (IS_TOUCH) $("roomCode").style.display = phase === "playing" ? "none" : "";
  const btn = $("startBtn");
  const complete = state.map && state.map.levelComplete;
  // hidden during play/draft/stock, and during a mid-level win (you advance via the map)
  btn.classList.toggle("hidden", phase === "playing" || phase === "draft" || phase === "stock" || (phase === "won" && !complete));
  if (phase === "won" && complete && state.runWon) { btn.textContent = "👑 NEW RUN"; btn.onclick = () => send({ type: "start" }); }
  else if (phase === "won" && complete) { btn.textContent = "DESCEND ▶"; btn.onclick = () => send({ type: "descend" }); }
  else if (phase === "lost") { btn.textContent = "PLAY AGAIN"; btn.onclick = () => send({ type: "start" }); }
  else if (phase === "setup") { btn.textContent = "BEGIN COMBAT ▶"; btn.onclick = () => send({ type: "start" }); }
  else { btn.textContent = "ENTER ROOM"; btn.onclick = () => send({ type: "start" }); }

  renderOverlay();
  updateCombatLog(phase);        // post-fight record panel (only on lost/won, with a log present)

  sizeCanvas();                  // match backing store to the displayed size every frame (cheap: reallocs only on a real change) — robust to layout settling after join
  ctx.clearRect(0, 0, W, H);

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

  // enemies as readable cards in FORMATION: the toughest (index 0) holds the FRONT, drawn
  // largest nearest the player; deeper ranks taper smaller & dimmer (the wall + its backline).
  // Each card is a telegraph — the charge bar + border heat say WHEN it acts; an `aoe` foe
  // about to fire flashes an ALL-LANES warning (and tints the whole board).
  foeBoxes = [];
  heroBoxes = [];
  _effectBoxes = [];
  _bossBannerBottom = 0;
  const myTarget = me?.targetId;
  const myAllyTarget = me?.allyTargetId;
  const throb = 0.5 + 0.5 * Math.sin((state.tick ?? 0) * 0.4); // shared pulse for telegraphs
  let aoeAlarm = 0;                                            // strongest incoming all-lanes hit
  // THE BACK-LINE BOSS (BOSS_SPEC_V1) — the caravan's mirror on the foe side: one wide
  // banner spanning every lane behind the foe rows. Click it to target it (melee only
  // reaches it when YOUR lane is clear — it's the lane's back wall).
  if (state.boss) drawBossBanner(state.boss, myTarget, throb);
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
  const REAR_Y = CARAVAN_Y - (IS_TOUCH ? 66 : 70), R_HERO = IS_TOUCH ? 24 : 26;
  // PLAYER-SIZED SUMMONS (owner 2026-06-27): a lane's summons render as full player-sized bodies
  // (own slot, circle + nameplate + passive/stat line) — UNLESS the lane holds more than the cap,
  // in which case they FALL BACK to the capped coin cluster (the hydra-head / kraken-tentacle swarm
  // that can't fit player-sized). FLAG: the threshold is SUMMON_PLAYER_CAP (mobile is tighter).
  const SUMMON_PLAYER_CAP = IS_TOUCH ? 2 : 4;
  // VERTICAL SPACING (owner 2026-06-27 summon-clip fix): a hero owns ~50px (icon + the HP nameplate
  // that hangs below it), a summon row only ~26px. A flat step made the hero nameplate / its name
  // label collide with an adjacent summon row — "clipping on summons", worst in the SOLO+summon case.
  // So each slot reserves a kind-aware GAP to its neighbour below, anchored at the rear (last slot
  // center = REAR_Y) and stacked upward — tight enough for deep stacks, generous enough a summon row
  // never lands under a hero's nameplate.
  const slotGap = (upper, lower) => {
    const heroAbove = upper.kind === "hero", heroBelow = lower.kind === "hero";
    // owner 2026-06-29 ("my hp covers it"): bumped so a FRONT body's HP plate (+ a summon's new cast feed)
    // no longer COVERS the body stacked behind it. Heroes hang a ~46px plate; summons now ~60px (cast feed).
    if (heroAbove && heroBelow) return 66;   // two heroes (multiplayer stack): clear the hanging HP plate
    if (heroAbove) return 70;                // hero over a summon row: clear the hero's hanging HP plate
    if (heroBelow) return 52;                // summon row over a hero: clear the summon's cast feed
    return 44;                               // summon row over summon row
  };
  // top bound for the foe stacks: just below the boss banner (so a head swarm can't run up over it),
  // else the board top. Computed HERE (before the friendly planner) because a crowd lane's friendly
  // stack must reserve honest foe headroom before it compresses its own side.
  const foeTopBound = state.boss ? _bossBannerBottom + 6 : 8;
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
  // slot EXTENTS (crowd planner): how far a slot's print reaches above/below its center y. The full
  // hero's bottom extent equals the old REAR_Y offset (circle + plate + passive line just clears the
  // caravan band); compact teammate rows and coin rows are near-symmetric slivers.
  const slotExt = (s, ch) =>
    s.kind === "hero"   ? { top: R_HERO + 18, bottom: IS_TOUCH ? 66 : 70 }
    : s.kind === "heroC" ? { top: Math.ceil(ch / 2) + 2, bottom: Math.ceil(ch / 2) + 2 }
    : s.kind === "summon" ? { top: R_HERO + 16, bottom: R_HERO + 46 }
    : /* tokens */         { top: 18, bottom: 26 };
  const laneStacks = [];
  for (let i = 0; i < COLS; i++) {
    const toks = lanes[i].allies || [];
    const heroesHere = players.filter((p) => p.lane === i);
    // HERO-SIDE CROWD MODE (owner picked D, 2026-07-07): more than CROWD_SLOTS friendly slots →
    // the possessed body keeps full size, teammates compact to in-place rows, and ALL summons fall
    // back to the (always-fits) coin cluster row. Depth ORDER never changes — a compact row sits
    // exactly where the full hero would.
    const crowdH = heroesHere.length + toks.length > CROWD_SLOTS;
    const playerSized = !crowdH && toks.length <= SUMMON_PLAYER_CAP;   // few summons → full size; a swarm/crowd → coin cluster
    const ents = [
      ...heroesHere.map((p) => ({ kind: crowdH && p.id !== activeId ? "heroC" : "hero", p, depth: p.depth ?? 0, id: p.id })),
      ...(toks.map((a, k) => ({ kind: playerSized ? "summon" : "token", a, depth: a.depth ?? -1, id: "tk" + k }))),
    ].sort((x, y) => x.depth - y.depth || (x.id < y.id ? -1 : 1));
    const slots = [];
    for (const e of ents) {
      if (e.kind !== "token") { slots.push(e); continue; }     // hero / player-sized summon = its own slot
      // OVERFLOW swarm only: collapse the coin tokens into one cluster row (mobile — and any crowd
      // lane — merges all of them; the row takes the front-most token's depth slot).
      const merge = (IS_TOUCH || crowdH)
        ? slots.find((s) => s.kind === "tokens")
        : (slots[slots.length - 1]?.kind === "tokens" ? slots[slots.length - 1] : null);
      if (merge) merge.toks.push(e.a);
      else slots.push({ kind: "tokens", toks: [e.a] });
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
    let y = REAR_Y;
    for (let s = slots.length - 1; s >= 0; s--) {
      ys[s] = y;
      if (s > 0) y -= slotGap(slots[s - 1], slots[s]);
    }
    const TOP_MARGIN = 86;                    // leave room for at least one foe card above the line
    if (ys.length && ys[0] < TOP_MARGIN) { const shift = TOP_MARGIN - ys[0]; for (let s = 0; s < ys.length; s++) ys[s] += shift; }
    const frontY = ys.length ? ys[0] : REAR_Y;
    // foes stop ABOVE the front entity (a token row needs ~28px clearance, a hero ~66 for its label)
    const foeBottom = slots.length ? frontY - (slots[0].kind === "hero" ? 66 : 36) : REAR_Y - 18;
    laneStacks[i] = { slots, ys, frontY, foeBottom, compactH: HERO_COMPACT_H };
  }
  // ===== FOE CARDS (2026-06-10 redesign) — built to be read by a STRANGER, not just the
  // designer: a rarity ribbon names the tier, the header band carries the body's hue, both
  // power schools show (⚔ sword / ✨ staff), the passive is printed ON the card (wrapped),
  // and every clock is a fat labeled bar with its time-to-fire. Front two ranks get the
  // full card; the deeper backline condenses to name + HP + slim bars.
  // ribbon hue now keys off the body's GOLD value (tiers retired 2026-06-12):
  // cheap grey · mid blue · expensive gold
  const ribbonFor = (g) => (g >= 5 ? "#ffd24a" : g >= 3 ? "#4aa3ff" : g >= 1 ? "#7c8696" : "#39404d");
  // (foeTopBound moved up beside the triage planner — the friendly stack needs it first.)
  for (let i = 0; i < COLS; i++) {
    let stackBottom = laneStacks[i].foeBottom;  // foes stack above this lane's friendly line
    // SUMMON-TOKEN SWARM (owner 2026-06-25 hydra fix): the Hyper-Inflation Hydra blooms dozens of 1-HP
    // heads (and the Kraken its tentacles). As stacking foe CARDS they overran the boss banner and
    // clipped off the top of the board. Collapse a lane's summon-token foes into a capped, always-fits
    // coin grid (the foe-side mirror of the friendly summon row); the real foes then stack above it.
    const laneEnemies = lanes[i].enemies;
    const tokenFoes = laneEnemies.filter((e) => bodies[e.bodyKey]?.summon);
    const realFoes  = laneEnemies.filter((e) => !bodies[e.bodyKey]?.summon);
    if (tokenFoes.length) stackBottom = drawFoeTokenCluster(i, stackBottom, foeTopBound, tokenFoes, myTarget);
    // FOE CROWD MODE (owner picked D, 2026-07-07): more than CROWD_SLOTS queue-foes in this lane →
    // triage. The headliners (front / casting-next / your target) keep full rows; everyone else is a
    // one-line mini in its exact depth slot. BOTH platforms share this renderer — fit is guaranteed
    // by the height arithmetic inside, never by clipping a body off the board.
    if (foePlans[i].crowd) {
      aoeAlarm = Math.max(aoeAlarm, drawFoeCrowdLane(i, stackBottom, foeTopBound, realFoes, foePlans[i], myTarget, throb, bodies));
    } else if (IS_TOUCH) {
    // MOBILE (owner 2026-06-29): the tall stacked foe CARDS clipped off the top of a landscape phone when
    // a lane held 3–4 foes. Draw each lane foe as ONE compact row instead, with rowH sized so the whole
    // stack fits between the friendly line (stackBottom) and the board/boss top (foeTopBound). Up to 4 fit;
    // each row carries icon+name, HP/shield, current moxie, and the next cast card. Desktop is unchanged.
      const nF = realFoes.length;
      if (nF) {
        const rowGap = 3;
        const avail = stackBottom - foeTopBound;
        // READABILITY (owner 2026-07-07 "genuinely needs to be bigger"): rows GROW into whatever
        // vertical space the fight leaves free (cap 40→64) and only tighten back toward the old
        // density when a lane actually holds a full stack; fonts inside scale with rowH.
        const rowH = Math.max(24, Math.min(64, Math.floor((avail - (nF - 1) * rowGap) / Math.max(1, nF))));
        const cardW = Math.min(460, Math.round((laneW(i) - 14) * 0.97));
        const rx = laneX(i) + (laneW(i) - cardW) / 2;
        realFoes.forEach((e) => {
          const rb = bodies[e.bodyKey] || {};
          const ry = stackBottom - rowH;
          stackBottom = ry - rowGap;                  // the next (deeper) row stacks above
          foeBoxes.push({ x: rx, y: ry, w: cardW, h: rowH, id: e.id, e });
          const rtargeted = e.id && e.id === myTarget;
          const rfrac = e.threat ? e.threat.frac : 0;
          if (e.aoe && rfrac > 0.66) aoeAlarm = Math.max(aoeAlarm, rfrac); // still feeds the board-wide alarm
          drawFoeRow(rx, ry, cardW, rowH, e, rb, rtargeted, throb);
        });
      }
    } else {
    realFoes.forEach((e, j) => {
      const b = bodies[e.bodyKey] || {};
      // EVERY damaging clock this foe runs gets its own color-coded bar (its items + any
      // damaging passive). `threat` is the soonest of them — it drives the border heat and
      // the AoE alarm. A reactive-only foe (strikes back when hit) has no clock at all.
      const threats = (e.threats && e.threats.length) ? e.threats
        : (e.threat ? [{ frac: e.threat.frac, cd: e.threat.cd, color: "#fc6", label: "" }] : []);
      const reactive = threats.length === 0 && !(e.tags && e.tags.length);
      const frac = e.threat ? e.threat.frac : 0;
      const tBarH = IS_TOUCH ? 15 : 17;            // big-card threat-bar height (slimmer on the short phone board)
      const scale = Math.max(0.62, 1 - j * 0.12);  // taper by depth in the lane
      const dim = Math.max(0.55, 1 - j * 0.15);
      // front ranks → the full card. On the short mobile board only the FRONT (most imminent) foe
      // gets the full card; deeper ranks condense so the stack fits without clipping off the top.
      const big = j < (IS_TOUCH ? 1 : 2);
      // width rides the lane, capped so a solo run's single lane doesn't yield door-sized cards
      // (cap 340→420, owner 2026-07-07 readability: use the lane width that was sitting empty)
      const cardW = Math.min(420, Math.round((laneW(i) - 16) * (0.85 + 0.15 * scale)));
      const x = laneX(i) + (laneW(i) - cardW) / 2;
      const innerX = x + 12, innerW = cardW - 20;   // content sits right of the rarity ribbon
      // measure the passive text FIRST (wrap to ≤2 lines) so the card can size to fit it
      ctx.font = "12px ui-monospace, monospace";
      const plines = big && e.passive ? wrapLines(e.passive, innerW - 4, IS_TOUCH ? 1 : 2) : [];
      // MOBILE clutter cut: drop the secondary tag-keyword row on touch — the passive line already
      // states the trigger, and the row's ~15px is what the short board needs to keep stacked foes
      // fully on-screen. (Desktop keeps tags.)
      const hasTags = big && !IS_TOUCH && e.tags && e.tags.length;
      const rowH = big ? (IS_TOUCH ? 18 : 21) : 10, gap = big ? 4 : 2;
      const nRows = Math.max(1, threats.length);
      const headH = (big ? 48 : 30) + plines.length * 14 + (hasTags ? 15 : 0);
      // VERTICAL foe cast queue (owner 2026-06-24): the upcoming cards STACK instead of sitting
      // side-by-side, so the card grows to fit up to 3 stacked chips; bar-row foes are unchanged.
      const qN = e.queue?.length ? Math.min(IS_TOUCH ? 2 : 3, e.queue.length) : 0;
      const qch = big ? (IS_TOUCH ? 15 : 22) : 10, qgap = 3;
      const bodyH = qN ? qN * qch + (qN - 1) * qgap : nRows * rowH + (nRows - 1) * gap;
      const effN = (e.effects ?? []).length;                 // active-buff chips get their own row under the body
      const effRowH = effN ? (big ? (IS_TOUCH ? 15 : 20) : 14) : 0;
      const cardH = Math.round(headH + bodyH + effRowH + (big ? (IS_TOUCH ? 4 : 8) : 4));
      const y = stackBottom - cardH;
      stackBottom = y - (IS_TOUCH ? 3 : 8);        // the next (deeper) card stacks above
      foeBoxes.push({ x, y, w: cardW, h: cardH, id: e.id, e });
      const targeted = e.id && e.id === myTarget;
      const charging = e.aoe && frac > 0.66;      // a board-wide hit is imminent
      if (charging) aoeAlarm = Math.max(aoeAlarm, frac);
      ctx.globalAlpha = dim;
      // card body + telegraph border (heat rises with the charge; AoE pulses red)
      ctx.fillStyle = "#151a23"; roundRect(x, y, cardW, cardH, 9); ctx.fill();
      // header band in the body's own hue — the card "belongs" to its monster
      ctx.save(); roundRect(x, y, cardW, cardH, 9); ctx.clip();
      ctx.fillStyle = (b.color || "#39404d") + "2e";
      ctx.fillRect(x, y, cardW, big ? 48 : 30);
      // rarity ribbon down the left edge: grey common · blue uncommon · gold rare (boss = gold)
      ctx.fillStyle = e.boss ? "#ffd24a" : ribbonFor(b.gold ?? 0);
      ctx.fillRect(x, y, 6, cardH);
      ctx.restore();
      ctx.lineWidth = e.boss ? 4 : targeted ? 3 : 2;
      ctx.strokeStyle = charging ? `rgba(255,${Math.round(60 + 40 * throb)},60,1)`
        : targeted ? "#3df" : e.boss ? "#ffcf4a" : frac > 0.75 ? "#f55" : frac > 0.45 ? "#fc6" : (b.color || "#333");
      roundRect(x, y, cardW, cardH, 9); ctx.stroke();
      // icon (drawn art with emoji fallback) — anchored in the header band
      const iconSz = big ? 44 : 24;
      const iconCy = y + (big ? 25 : 16);
      const spr = foeSprite(e.bodyKey);
      if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, innerX, iconCy - iconSz / 2, iconSz, iconSz);
      else { ctx.font = `${iconSz - 6}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(e.bodyKey), innerX + iconSz / 2, iconCy); }
      const tx = innerX + iconSz + 8;
      if (e.boss) { ctx.font = "15px serif"; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText(e.warded ? "♛🔒" : "♛", x + cardW - (targeted ? 24 : 6), y + 4); }
      if (targeted) { ctx.font = "15px serif"; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText("🎯", x + cardW - 5, y + 4); }
      if (big) {
        // name + stat row — BOTH schools show, so a caster finally reads as a caster
        // (per-entity name wins: a stolen item reads "Stolen Bow", not "Animated Item")
        ctx.fillStyle = "#f4f5f7";
        fitText(e.name || b.name || e.bodyKey, tx, y + 6, (x + cardW - (targeted ? 26 : 8)) - tx, 19, 12);
        ctx.font = "bold 15px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        let sx = tx;
        if ((e.phys ?? 0) > 0) { ctx.fillStyle = "#ffc98a"; ctx.fillText(`⚔${e.phys}`, sx, y + 29); sx += 37; }
        if ((e.mag ?? 0) > 0)  { ctx.fillStyle = "#9b8cff"; ctx.fillText(`✨${e.mag}`, sx, y + 29); sx += 37; }
        ctx.fillStyle = "#9bf09b"; const _hp = `❤${e.hp}/${e.maxHp}`; ctx.fillText(_hp, sx, y + 29); sx += ctx.measureText(_hp).width + 10;
        // the foe's DAMAGE BONUS, inline with its stats (owner 2026-06-25): 🗡 to melee / 🎯 to ranged
        { const bl = bonusLabel(e.meleeBonus, e.rangedBonus); if (bl) { ctx.fillStyle = "#ffd24a"; ctx.fillText(bl, sx, y + 29); } }
        let badgeR = x + cardW - 7; ctx.textAlign = "right";
        if (e.shield > 0)   { ctx.fillStyle = "#7fd6ff"; ctx.fillText(`🛡+${e.shield}`, badgeR, y + 29); badgeR -= 50; }
        if (e.dr > 0)       { ctx.fillStyle = "#b6a8ff"; ctx.fillText(`-${e.dr}dmg`, badgeR, y + 29); badgeR -= 50; }
        if (e.thorns > 0)   { ctx.fillStyle = "#a8d08a"; ctx.fillText(`🌵${e.thorns}`, badgeR, y + 29); }
        // the passive, in words, ON the card — no more hover-to-understand
        if (plines.length) {
          ctx.font = "13px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
          ctx.fillStyle = "#d4dae4";
          plines.forEach((ln, li) => ctx.fillText(ln, innerX + 2, y + 48 + li * 14));
        }
        if (hasTags) {
          // auto-fit so multiple/long trigger tags ("⚡ per 3 ranged dealt") never spill the card edge
          ctx.fillStyle = "#ffd98a";
          fitText(e.tags.join("   "), innerX + 2, y + 48 + plines.length * 14 + 2, innerW - 2, 11, 9);
        }
      } else {
        // condensed backline: still carries its NAME now, not just a heart
        ctx.fillStyle = "#e8eaee";
        fitText(e.name || b.name || e.bodyKey, tx, y + 4, (x + cardW - 44) - tx, 13, 10);
        ctx.font = "bold 13px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillStyle = "#9bf09b"; ctx.fillText(`❤${e.hp}`, tx, y + 17);
        if (e.dr > 0) { ctx.fillStyle = "#b6a8ff"; ctx.fillText(`-${e.dr}`, tx + 40, y + 17); }
        ctx.textAlign = "right";
        if ((e.phys ?? 0) > 0) { ctx.fillStyle = "#aeb6c2"; ctx.fillText(`⚔${e.phys}`, x + cardW - 6, y + 17); }
        else if ((e.mag ?? 0) > 0) { ctx.fillStyle = "#aeb6c2"; ctx.fillText(`✨${e.mag}`, x + cardW - 6, y + 17); }
        else { const bl = bonusLabel(e.meleeBonus, e.rangedBonus); if (bl) { ctx.fillStyle = "#ffd24a"; ctx.fillText(bl, x + cardW - 6, y + 17); } } // back-row foe's damage bonus
      }
      // the THREAT BARS — one per clock, color-coded to the item/passive, stacked at the
      // bottom; each fills toward its next hit. A reactive foe shows a flat grey track.
      let by = y + headH;
      // FOE CAST QUEUE (card/moxie): the foe's upcoming casts. The FRONT chip fills as it banks moxie
      // toward casting it ("building up to play"); the next chips wait, dim. Replaces the dead
      // equipment-cooldown bars (hover the foe for its full deck). Body-passive timer bars only show
      // when there's NO queue (summoned tokens that still act on time).
      if (e.queue?.length) {
        drawFoeQueue(innerX, by, innerW, qch, e, big, qN, qgap);
      } else if (reactive) {
        ctx.fillStyle = "#2a2f38"; roundRect(innerX, by, innerW, big ? 17 : 8, 4); ctx.fill();
        if (big) { ctx.fillStyle = "#a6afbd"; ctx.font = "bold 12px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.reactive ? "⚡ strikes back when hit" : "— no attack —", x + cardW / 2, by + 9); }
      } else {
        for (const t of threats) {
          threatBar(innerX, by, innerW, big ? tBarH : 8, t, big);
          by += rowH + gap;
        }
      }
      // active-effect chips (buffs / regen / thorns) — icon + countdown ring, hover for detail
      if (effN) drawEffectChips(innerX, y + headH + bodyH + (big ? 11 : 8), e.effects, big);
      // ALL-LANES warning above a charging AoE foe
      if (charging) {
        ctx.globalAlpha = 0.55 + 0.45 * throb;
        ctx.fillStyle = "#c00"; roundRect(x, y - 18, cardW, 16, 5); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("⚠ HITS ALL LANES", x + cardW / 2, y - 10);
      }
      ctx.globalAlpha = 1;
    });
    }
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
  for (let i = 0; i < COLS; i++) {
    const { slots, ys, compactH } = laneStacks[i];
    // draw BACK-to-FRONT (owner 2026-06-24): the front entity (and a hero's HP nameplate, which hangs
    // BELOW it into the next slot) renders ON TOP — so a rat stacked behind you never covers your HP bar.
    slots.map((s, si) => ({ s, si })).reverse().forEach(({ s, si }) => {
      const py = ys[si], isFront = si === 0;
      if (s.kind === "summon") { drawSummonBody(s.a, colCenter(i), py, isFront, i); return; }
      if (s.kind === "heroC") { drawHeroCompact(s.p, i, py, compactH ?? HERO_COMPACT_H, isFront, myAllyTarget); return; }
      if (s.kind === "tokens") {
        // adaptive spacing (owner 2026-06-25): spread summons wide enough to read when there are a
        // few, and only tighten as the swarm grows so they still fit the lane.
        // CAP TO THE LANE (owner 2026-06-26): the row used to floor the step at 22px with NO width cap,
        // so a big pack spilled across lanes and covered the heroes' HP plates. Now it fits its lane —
        // draw as many coins as fit at a readable pitch, fold the rest into a "+N" coin (mirrors the
        // foe token cluster). Centered on the lane, never wider than it.
        const all = s.toks, _n = all.length, COIN = 26;
        const fit = Math.max(3, Math.floor((laneW(i) - 24) / COIN));   // coins that fit the lane at full pitch
        const overflow = _n > fit;
        const cells = overflow ? fit : _n;                          // last cell = "+N" when overflowing
        const _step = cells <= 1 ? 0 : Math.min(40, (laneW(i) - 24) / (cells - 1));
        for (let j = 0; j < cells; j++) {
          const ax = colCenter(i) + (j - (cells - 1) / 2) * _step;
          if (overflow && j === cells - 1) {                        // "+N more" chip (rest of the pack)
            ctx.beginPath(); ctx.arc(ax, py, 13, 0, Math.PI * 2);
            ctx.fillStyle = "#11241b"; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = "#3ec98a"; ctx.stroke();
            ctx.fillStyle = "#cdf6e0"; ctx.font = "bold 10px ui-monospace, monospace";
            ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("+" + (_n - (cells - 1)), ax, py + 0.5);
            continue;
          }
          const a = all[j];
          // friendly green ring marks your side; AURA tokens (totem/flag/knight) get gold
          ctx.beginPath(); ctx.arc(ax, py, 13, 0, Math.PI * 2);
          ctx.fillStyle = "#10221a"; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = a.aura ? "#ffd24a" : "#3ec98a"; ctx.stroke();
          // SUMMON CAST FEED on a coin (owner 2026-07-07 "summons should show what they play and
          // when"): the coin's rim carries its castFrac as a filling arc in the card's color — the
          // same "how soon" grammar as the foe chips, shrunk to coin scale. (The WHAT is the row
          // label below; a coin has no room for a name.)
          const q0 = (a.queue || [])[0];
          if (q0) {
            const cf = Math.max(0, Math.min(1, a.castFrac ?? 0));
            if (cf > 0.02) {
              ctx.beginPath(); ctx.arc(ax, py, 15.5, -Math.PI / 2, -Math.PI / 2 + cf * Math.PI * 2);
              ctx.lineWidth = 2.5; ctx.strokeStyle = q0.color || "#ffb27a"; ctx.stroke();
            }
          }
          // vector token clipped into the coin (emoji fallback) — same art as the foe cards, so a
          // summoned rat/fireling reads as itself and never renders as mobile tofu
          const tsp = foeSprite(a.bodyKey);
          if (tsp.complete && tsp.naturalWidth) {
            ctx.save(); ctx.beginPath(); ctx.arc(ax, py, 12, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(tsp, ax - 13, py - 13, 26, 26); ctx.restore();
          } else {
            ctx.font = "15px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(iconFor(a.bodyKey), ax, py + 1);
          }
          ctx.font = "bold 10px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillStyle = "#000c"; ctx.fillText(String(a.hp), ax + 0.5, py + 14);   // dark backing so the HP reads over the board
          ctx.fillStyle = "#cdf6e0"; ctx.fillText(String(a.hp), ax, py + 13);
        }
        // the row's CAST FEED label (the WHAT): first coin's front card, right of the row when the
        // lane has spare width — "⚡cost Name". The per-coin arc above already carries the WHEN.
        {
          const q0 = (all[0]?.queue || [])[0];
          const rowRight = colCenter(i) + ((cells - 1) / 2) * _step + 16;
          if (q0 && laneX(i) + laneW(i) - rowRight > 64) {
            ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.fillStyle = "#9fc9b0"; ctx.fillText(`⚡${q0.cost ?? "?"} ${q0.name}`, rowRight + 4, py);
          }
        }
        if (isFront) { ctx.font = "11px serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("🛡", laneX(i) + 4, py); }
        return;
      }
      // SQUAD: `possessed` = the body you're piloting right now (gold ring + 👑 + YOU);
      // `owned` = another body your seat owns but is on AUTO (a bot you can click to possess —
      // marked with a dashed gold "remote-in" ring). `mine` keeps the possessed-body styling.
      const p = s.p, px = colCenter(i);
      const possessed = p.id === activeId;
      const owned = isMine(p) && !possessed;       // your other squad bodies (clickable to pilot)
      const mine = possessed;
      const col = bodies[p.bodyKey]?.color ?? "#68a";
      heroBoxes.push({ x: px, y: py, r: R_HERO + 9, id: p.id });   // click: possess (yours) / 🎯-armed ally-target
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
      // owner 2026-06-19 readability pass: the worn-body passive clock used to be a RING around
      // the tiny mimic + stacked mini-bars ("bar surrounding tiny window icons") — cramped and
      // hard to read. Now the mimic is clean, and the passive rides ONE slim labeled line under a
      // tidy nameplate. (bts kept for that single line.)
      const bts = p.alive ? (p.bodyThreats || []) : [];
      // the front blocker gets a cyan shield arc on the foe-facing side
      if (isFront && p.alive) { ctx.beginPath(); ctx.arc(px, py, R_HERO + 3, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 3; ctx.strokeStyle = "#5cc6ff"; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(px, py, R_HERO, 0, Math.PI * 2);
      ctx.fillStyle = "#0c0f15"; ctx.fill();
      ctx.lineWidth = mine ? 3 : 2; ctx.strokeStyle = mine ? "#ffd24a" : col; ctx.stroke();
      const spr = foeSprite(p.bodyKey);
      if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, px - R_HERO + 2, py - R_HERO + 2, (R_HERO - 2) * 2, (R_HERO - 2) * 2);
      else { ctx.font = (R_HERO + 4) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(p.bodyKey), px, py + 1); }
      if (mine) { ctx.font = "14px serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText("👑", px, py - R_HERO); }
      if (isFront) { ctx.font = "11px serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("🛡", laneX(i) + 4, py); }
      // CLEAN NAMEPLATE under the mimic: a rounded chip with an HP fill behind ❤ hp/max — prettier
      // and clearer than the bare green bar, and it reads at a glance like the foe cards' stat row.
      const npW = 104, npH = 24, npX = px - npW / 2, npY = py + R_HERO + 4;   // grown w/ the hero (owner 2026-07-07)
      const hpFrac = Math.max(0, p.hp / p.maxHp);
      ctx.fillStyle = "#11151d"; roundRect(npX, npY, npW, npH, 6); ctx.fill();
      ctx.save(); roundRect(npX, npY, npW, npH, 6); ctx.clip();
      ctx.fillStyle = hpFrac > 0.4 ? "#2f6b3a" : "#7a2f2f"; ctx.fillRect(npX, npY, npW * hpFrac, npH); ctx.restore();
      ctx.lineWidth = mine ? 2 : 1; ctx.strokeStyle = mine ? "#ffd24a" : "#39404d"; roundRect(npX, npY, npW, npH, 6); ctx.stroke();
      ctx.font = "bold 15px ui-monospace, monospace"; ctx.textBaseline = "middle";
      if (p.shield > 0) {
        // owner 2026-06-21: the shield lives IN the HP bar now — a cyan cap on the RIGHT with 🛡amount,
        // HP shifts left. (Was a bare 🛡 floating at the lane edge with no number.)
        const capW = Math.min(npW * 0.45, 10 + String(p.shield).length * 9);
        ctx.save(); roundRect(npX, npY, npW, npH, 6); ctx.clip();
        ctx.fillStyle = "#1c4a63"; ctx.fillRect(npX + npW - capW, npY, capW, npH); ctx.restore();
        ctx.fillStyle = "#eef3f8"; ctx.textAlign = "left"; ctx.fillText(`❤${p.hp}/${p.maxHp}`, npX + 6, npY + npH / 2 + 0.5);
        ctx.fillStyle = "#bfe9ff"; ctx.textAlign = "right"; ctx.fillText(`🛡${p.shield}`, npX + npW - 5, npY + npH / 2 + 0.5);
      } else {
        ctx.fillStyle = "#eef3f8"; ctx.textAlign = "center"; ctx.fillText(`❤ ${p.hp}/${p.maxHp}`, px, npY + npH / 2 + 0.5);
      }
      // ONE slim body-passive line beneath the nameplate (color-coded, no ring), if any
      if (!p.offline && bts.length) bar(npX, npY + npH + 2, npW, 4, bts[0].frac || 0, bts[0].color || "#b8a3c9");
      if ((p.effects ?? []).length) drawEffectChips(npX, npY + npH + (bts.length ? 13 : 8), p.effects, false);
      ctx.globalAlpha = 1;
      // label: possessed body = bold gold "YOU"; an owned squad bot = its name in gold-ish
      // with an AUTO tag (it's clickable to pilot); everyone else = plain name.
      ctx.fillStyle = mine ? "#ffd24a" : owned ? "#d9c98a" : "#cfd3dc";
      ctx.font = mine ? "bold 14px ui-monospace, monospace" : "13px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      { const _bl = bonusLabel(p.meleeBonus, p.rangedBonus); ctx.fillText((mine ? "YOU" : p.name) + (_bl ? "  " + _bl : ""), px, py - R_HERO - 2); } // your damage bonus, right on your hero (owner 2026-06-25)
      if (owned && p.alive) { ctx.fillStyle = "#caa84a"; ctx.font = "9px ui-monospace, monospace"; ctx.fillText("🎮 AUTO", px, py - R_HERO - 14); }
      if (!p.alive) { ctx.fillStyle = "#e66"; ctx.fillText("DOWN", px, py + R_HERO + 12); }
      if (p.offline) { ctx.fillStyle = "#e6a23c"; ctx.fillText("OFFLINE", px, py + R_HERO + (p.alive ? 12 : 22)); }
    });
  }

  // TARGET TELEGRAPH (owner 2026-06-27): a small circle holding the ATTACKING foe's portrait, drawn to
  // the RIGHT of every PLAYER it threatens RIGHT NOW (snapshot `tgtPids`). Multiple foes aiming at one
  // player stack multiple circles. This REPLACES the abstract ▸/≣ glyph that used to ride the foe card.
  {
    const aimed = new Map();                                   // playerId → [attacking foe portraits]
    for (const lane of (lanes || [])) for (const f of (lane.enemies || []))
      for (const pid of (f.tgtPids || [])) { if (!aimed.has(pid)) aimed.set(pid, []); aimed.get(pid).push(f.portrait || f.bodyKey); }
    const TR = 15;                                             // telegraph circle radius (11→15, owner 2026-07-07: this is THE "incoming" signal — it must read at arm's length; touch caps at 3 faces so the bigger stack can't spill into the next lane)
    for (const [pid, faces] of aimed) {
      const hb = heroBoxes.find((b) => b.id === pid);
      if (!hb) continue;
      // a COMPACT teammate row (crowd mode) carries its own shrunken face anchor (tx/ty/tr) —
      // the faces sit beside the row instead of riding the full-size circle
      const tr = hb.tr ?? TR;
      faces.slice(0, IS_TOUCH ? 3 : 4).forEach((face, k) => {
        const cx = (hb.tx ?? hb.x + R_HERO + 10) + k * (tr * 2 + 3), cy = hb.ty ?? hb.y - 2;
        ctx.beginPath(); ctx.arc(cx, cy, tr, 0, Math.PI * 2);
        ctx.fillStyle = "#1a0c0c"; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "#ff5a4a"; ctx.stroke();        // a red "incoming" ring
        const spr = foeSprite(face);
        if (spr.complete && spr.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, tr - 1, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(spr, cx - tr, cy - tr, tr * 2, tr * 2); ctx.restore(); }
        else { ctx.font = (tr + 2) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(face), cx, cy + 1); }
      });
    }
  }

  // (Caravan bar deleted 2026-06-27 — no shared HP pool. The strip below the play area is now just a
  // quiet seam between the board and the hand; the hero nameplates are free to hang into it.)
  ctx.fillStyle = "#13161e"; ctx.fillRect(0, CARAVAN_Y, W, CARAVAN_H);

  // hotbar (your items)
  drawHotbar(me);

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
}

// Compact, ALWAYS-FITS coin grid for a lane's summon-token foes (hydra heads / kraken tentacles /
// summoned rats). Bottom-anchored at `bottomY`, grows upward in rows, hard-capped so it never crosses
// `topBound` (board top / boss-banner bottom) — that cap is what keeps the hydra's heads on-screen.
// Every visible coin is click-to-target (pushed to foeBoxes); when there are more tokens than cells,
// the last chip shows "+N". Returns the new stackBottom (cluster top − gap) so real cards stack above.
function drawFoeTokenCluster(laneIdx, bottomY, topBound, toks, myTarget) {
  const cell = IS_TOUCH ? 25 : 30;                          // coin cell = diameter + gap
  const r = (cell - 8) / 2;                                 // coin radius
  // BORROWED WIDTH (owner picked D 2026-07-07): the uniform `COLW` global was retired when lane
  // widths went dynamic, but this cluster still read it → `COLW is not defined` threw the instant a
  // FOE summoned a token body (rat/hydra head/tentacle/…), aborting render() AFTER ctx.clearRect and
  // leaving the whole board blank while the sim ran on ("the board disappeared and I lost"). Use the
  // same per-lane accessors every other draw path uses, so the cluster sits in its real lane box.
  const colX = laneX(laneIdx), colW = laneW(laneIdx);
  const perRow = Math.max(1, Math.floor((colW - 8) / cell));
  const avail = Math.max(cell, bottomY - topBound - 14);    // headroom kept for the count label
  const maxRows = Math.max(1, Math.floor(avail / cell));
  const capacity = perRow * maxRows;
  const n = toks.length;
  const overflow = n > capacity;
  const cells = overflow ? capacity : n;                    // chips drawn (last = "+N" when overflow)
  const shown = overflow ? cells - 1 : cells;               // real coins (rest fold into the +N chip)
  const rows = Math.ceil(cells / perRow);
  const icon = iconFor(toks[0].bodyKey);
  // the swarm's identity + live count, above the cluster (clamped to the lane), when there's room
  const labelY = bottomY - rows * cell - 12;
  if (labelY > topBound - 2) {
    ctx.fillStyle = "#cdd6e3";
    fitText(`${icon}×${n}`, colX + colW / 2, labelY, colW - 10, 12, 9, "center", "alphabetic");
  }
  for (let idx = 0; idx < cells; idx++) {
    const row = Math.floor(idx / perRow);                   // 0 = TOP row
    const rowFromBottom = rows - 1 - row;
    const inRow = Math.min(perRow, cells - row * perRow);
    const colInRow = idx - row * perRow;
    const cy = bottomY - r - rowFromBottom * cell;
    const startX = colX + (colW - inRow * cell) / 2 + cell / 2;
    const cx = startX + colInRow * cell;
    if (overflow && idx === cells - 1) {                    // "+N hidden" chip
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = "#21262f"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "#7c8696"; ctx.stroke();
      ctx.fillStyle = "#dfe7f0"; ctx.font = `bold ${IS_TOUCH ? 10 : 11}px ui-monospace, monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`+${n - shown}`, cx, cy + 0.5);
      continue;
    }
    const e = toks[idx];
    const targeted = e.id && e.id === myTarget;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#241312"; ctx.fill();                  // dark foe-side fill
    ctx.lineWidth = targeted ? 3 : 2; ctx.strokeStyle = targeted ? "#3df" : "#d2683f"; ctx.stroke(); // foe ring
    const tsp = foeSprite(e.bodyKey);
    if (tsp.complete && tsp.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(tsp, cx - r, cy - r, r * 2, r * 2); ctx.restore();
    } else {
      ctx.font = `${Math.round(r * 1.3)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(icon, cx, cy + 1);
    }
    // HP pip inside the bottom rim (heads read "1"); dark backing for contrast over any sprite
    ctx.font = `bold ${IS_TOUCH ? 9 : 10}px ui-monospace, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#000b"; ctx.fillText(String(e.hp), cx + 0.5, cy + r - 1.5);
    ctx.fillStyle = "#ffd0c0"; ctx.fillText(String(e.hp), cx, cy + r - 2);
    foeBoxes.push({ x: cx - r, y: cy - r, w: r * 2, h: r * 2, id: e.id, e });
  }
  return bottomY - rows * cell - 18;                        // real foes stack above the cluster + label
}

// A SUMMON rendered PLAYER-SIZED (owner 2026-06-27): a full circle + nameplate + a passive/stat line,
// the SAME footprint as a hero or foe body — so a Hedgefund Knight shows the card it casts, a totem
// its aura, and a rat-stack its live "N rats". `a` is the ally snapshot. Display-only (no click box —
// summons aren't targeted). The capped coin cluster (drawFoeTokenCluster) still handles overflow swarms.
function drawSummonBody(a, px, py, isFront, laneIdx) {
  const R = IS_TOUCH ? 24 : 26;                              // = R_HERO: player-sized (grown w/ the hero, owner 2026-07-07)
  const aura = !!a.aura;
  const col = aura ? "#ffd24a" : (a.color || "#3ec98a");
  // name above the circle — a ✦ prefix marks it a SUMMON at a glance (owner 2026-06-29: never read as a hero)
  ctx.fillStyle = aura ? "#ffe9a8" : "#cfeede"; ctx.font = "13px ui-monospace, monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(`✦ ${a.name || "Summon"}`, px, py - R - 2);
  // front blocker accent (cyan shield arc on the foe-facing side)
  if (isFront) { ctx.beginPath(); ctx.arc(px, py, R + 3, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 3; ctx.strokeStyle = "#5cc6ff"; ctx.stroke(); }
  // the body circle — a DASHED ring (green; gold for aura tokens) reads "conjured", visually distinct
  // from a hero's SOLID ring + 👑, so a summon can never be mistaken for a player (owner 2026-06-29)
  ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2);
  ctx.fillStyle = "#0c130f"; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
  const spr = foeSprite(a.bodyKey);
  if (spr.complete && spr.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(px, py, R - 1, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(spr, px - R + 2, py - R + 2, (R - 2) * 2, (R - 2) * 2); ctx.restore(); }
  else { ctx.font = (R + 2) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(a.bodyKey), px, py + 1); }
  if (isFront) { ctx.font = "11px serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("\u{1F6E1}", laneX(laneIdx) + 4, py); }
  // nameplate chip: HP fill behind ❤ hp/max (+ a cyan shield cap), like a hero
  const npW = 86, npH = 20, npX = px - npW / 2, npY = py + R + 4;
  const hpFrac = Math.max(0, a.hp / Math.max(1, a.maxHp));
  ctx.fillStyle = "#11151d"; roundRect(npX, npY, npW, npH, 6); ctx.fill();
  ctx.save(); roundRect(npX, npY, npW, npH, 6); ctx.clip();
  ctx.fillStyle = hpFrac > 0.4 ? "#2f6b3a" : "#7a2f2f"; ctx.fillRect(npX, npY, npW * hpFrac, npH);
  if (a.shield > 0) { const capW = Math.min(npW * 0.42, 10 + String(a.shield).length * 8); ctx.fillStyle = "#1c4a63"; ctx.fillRect(npX + npW - capW, npY, capW, npH); }
  ctx.restore();
  ctx.lineWidth = 1; ctx.strokeStyle = aura ? "#caa84a" : "#39404d"; roundRect(npX, npY, npW, npH, 6); ctx.stroke();
  ctx.font = "bold 12px ui-monospace, monospace"; ctx.textBaseline = "middle";
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
    const chH = 13, f = Math.max(0.04, Math.min(1, a.castFrac ?? 0));
    ctx.fillStyle = "#0a0d12"; roundRect(npX, ly, npW, chH, 3); ctx.fill();                 // track
    ctx.save(); roundRect(npX, ly, npW, chH, 3); ctx.clip();
    ctx.fillStyle = (q.color || "#ffb27a") + "cc"; ctx.fillRect(npX, ly, npW * f, chH); ctx.restore();
    ctx.lineWidth = 1; ctx.strokeStyle = "#ffffff66"; roundRect(npX + 0.5, ly + 0.5, npW - 1, chH - 1, 3); ctx.stroke();
    ctx.font = "9px ui-monospace, monospace"; ctx.textBaseline = "middle";
    ctx.textAlign = "left"; ctx.fillStyle = "#fff";
    const nm = q.name.length > 6 ? q.name.slice(0, 5) + "…" : q.name;
    ctx.fillText(`⚡${a.moxie ?? 0}/${q.cost} ${nm}`, npX + 4, ly + chH / 2 + 0.5);
    const dlbl = q.dmgNow || q.dmg || "";
    if (dlbl) { ctx.textAlign = "right"; ctx.fillStyle = "#ffd2a8"; ctx.font = "bold 10px ui-monospace, monospace"; ctx.fillText(dlbl, npX + npW - 3, ly + chH / 2 + 0.5); }
    ly += chH + 1;
  } else if ((a.threats || []).length) {
    // TIMER summons (Large Rat / aura-Knight strike clocks): the SAME chip grammar as the cast
    // feed — label + fill + −dmg — instead of the old naked 4px bar (owner 2026-07-07: every
    // friendly summon shows WHAT it plays and WHEN, timer-casters included).
    const t = a.threats[0], chH = 13, f = Math.max(0.04, Math.min(1, t.frac || 0));
    ctx.fillStyle = "#0a0d12"; roundRect(npX, ly, npW, chH, 3); ctx.fill();
    ctx.save(); roundRect(npX, ly, npW, chH, 3); ctx.clip();
    ctx.fillStyle = (t.color || "#ff9ed2") + "cc"; ctx.fillRect(npX, ly, npW * f, chH); ctx.restore();
    ctx.lineWidth = 1; ctx.strokeStyle = "#ffffff66"; roundRect(npX + 0.5, ly + 0.5, npW - 1, chH - 1, 3); ctx.stroke();
    ctx.font = "9px ui-monospace, monospace"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
    const lbl = t.label || "attack";
    ctx.fillText(lbl.length > 9 ? lbl.slice(0, 8) + "…" : lbl, npX + 4, ly + chH / 2 + 0.5);
    if (t.dmg > 0) { ctx.textAlign = "right"; ctx.fillStyle = "#ffd2a8"; ctx.font = "bold 10px ui-monospace, monospace"; ctx.fillText(`−${t.dmg}`, npX + npW - 3, ly + chH / 2 + 0.5); }
    ly += chH + 1;
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
// right-side anchor where the target-telegraph pass parks this hero's shrunken incoming faces.
// The possessed body never routes here — it always keeps the full ring + 👑 + nameplate.
function drawHeroCompact(p, laneIdx, py, h, isFront, myAllyTarget) {
  const rw = Math.min(laneW(laneIdx) - 12, 252);
  const x0 = colCenter(laneIdx) - rw / 2;
  const owned = isMine(p);                        // yours-on-AUTO (tap to pilot); teammates plain
  const col = state?.bodies?.[p.bodyKey]?.color ?? "#68a";
  const r = Math.max(9, Math.min(12, Math.floor(h / 2)));
  const cx = x0 + r + 2;
  ctx.globalAlpha = p.alive ? 1 : 0.3;
  if (owned && p.alive) { ctx.beginPath(); ctx.arc(cx, py, r + 3, 0, Math.PI * 2); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = "#caa84a"; ctx.stroke(); ctx.setLineDash([]); }
  if (p.id === myAllyTarget) { ctx.beginPath(); ctx.arc(cx, py, r + 6, 0, Math.PI * 2); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = "#74e69a"; ctx.stroke(); ctx.setLineDash([]); }
  if (isFront && p.alive) { ctx.beginPath(); ctx.arc(cx, py, r + 3, Math.PI * 1.15, Math.PI * 1.85); ctx.lineWidth = 2.5; ctx.strokeStyle = "#5cc6ff"; ctx.stroke(); }
  ctx.beginPath(); ctx.arc(cx, py, r, 0, Math.PI * 2);
  ctx.fillStyle = "#0c0f15"; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
  const spr = foeSprite(p.bodyKey);
  if (spr.complete && spr.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(cx, py, r - 1, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(spr, cx - r + 1, py - r + 1, (r - 1) * 2, (r - 1) * 2); ctx.restore(); }
  else { ctx.font = (r + 3) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(p.bodyKey), cx, py + 1); }
  // right side: reserved face strip (telegraph pass) ← HP bar ← name fills the middle
  const faceR = 9, facesW = 3 * (faceR * 2 + 3);
  const barH = Math.max(11, Math.min(15, h - 5)), barW = Math.min(88, Math.round(rw * 0.36));
  const barX = x0 + rw - facesW - barW - 4, barY = py - barH / 2;
  const nameX = cx + r + 6;
  ctx.fillStyle = owned ? "#d9c98a" : "#cfd3dc";
  fitText(p.name, nameX, py, Math.max(24, barX - nameX - 6), Math.min(12, Math.max(9, h - 8)), 8, "left", "middle");
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
    ctx.fillStyle = "#eef3f8"; ctx.textAlign = "left"; ctx.fillText(`❤${p.hp}/${p.maxHp}`, barX + 4, py + 0.5);
    ctx.fillStyle = "#bfe9ff"; ctx.textAlign = "right"; ctx.fillText(`🛡${p.shield}`, barX + barW - 3, py + 0.5);
  } else { ctx.fillStyle = "#eef3f8"; ctx.textAlign = "center"; ctx.fillText(`❤${p.hp}/${p.maxHp}`, barX + barW / 2, py + 0.5); }
  if (!p.alive) { ctx.fillStyle = "#e66"; ctx.textAlign = "left"; ctx.font = "bold 9px ui-monospace, monospace"; ctx.fillText("DOWN", barX + barW + 4, py + 0.5); }
  else if (p.offline) { ctx.fillStyle = "#e6a23c"; ctx.textAlign = "left"; ctx.font = "bold 9px ui-monospace, monospace"; ctx.fillText("OFFLINE", barX + barW + 4, py + 0.5); }
  ctx.globalAlpha = 1;
  if (isFront) { ctx.font = "11px serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("🛡", laneX(laneIdx) + 4, py); }
  // hit circle rides the icon (tap teammate = heal-aim / tap your AUTO body = pilot — grammar unchanged);
  // tx/ty/tr = where the telegraph pass draws this hero's shrunken incoming-attack faces.
  heroBoxes.push({ x: cx, y: py, r: Math.max(16, r + 6), id: p.id, tx: x0 + rw - facesW + faceR, ty: py, tr: faceR });
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
  ctx.lineWidth = targeted ? 2 : 1;
  ctx.strokeStyle = charging ? `rgba(255,${Math.round(60 + 40 * throb)},60,1)` : targeted ? "#3df" : frac > 0.75 ? "#f55" : "#2a2f38";
  roundRect(x, y, w, h, 5); ctx.stroke();
  const iconSz = Math.max(8, h - 4);
  const spr = foeSprite(e.bodyKey);
  if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, x + 6, y + (h - iconSz) / 2, iconSz, iconSz);
  else { ctx.font = `${iconSz}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(e.bodyKey), x + 6 + iconSz / 2, y + h / 2); }
  const chipW = Math.min(Math.round(w * 0.42), 132);
  const chipH = Math.max(8, h - 4), chipX = x + w - chipW - 5, chipY = y + (h - chipH) / 2;
  if (e.queue?.length) drawFoeQueue(chipX, chipY, chipW, chipH, e, true, 1, 0);
  const fs = Math.max(8, Math.min(11, h - 4));
  ctx.font = `bold ${fs}px ui-monospace, monospace`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
  const hpL = `❤${e.hp}`, hpX = chipX - 6;
  const hpW = ctx.measureText(hpL).width;
  ctx.fillStyle = "#9bf09b"; ctx.fillText(hpL, hpX, y + h / 2 + 0.5);
  const nx = x + 6 + iconSz + 5;
  ctx.fillStyle = "#dfe4ec";
  fitText(e.name || b.name || e.bodyKey, nx, y + h / 2, Math.max(20, hpX - hpW - 6 - nx), fs, 7, "left", "middle");
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
  const avail = Math.max(20, stackBottom - topBound);
  const need = () => fulls * fullH + minis * miniH + (n - 1) * gap;
  if (need() > avail && fulls) fullH = Math.max(FOE_FULL_MIN, Math.floor((avail - minis * miniH - (n - 1) * gap) / fulls));
  if (need() > avail && minis) miniH = Math.max(FOE_MINI_MIN, Math.floor((avail - fulls * fullH - (n - 1) * gap) / minis));
  if (need() > avail) {                       // extreme case: fit is mathematical, never clipped
    gap = 2;
    const k = (avail - (n - 1) * gap) / (fulls * fullH + minis * miniH);
    fullH = Math.max(9, Math.floor(fullH * k));
    miniH = Math.max(7, Math.floor(miniH * k));
  }
  const cardW = Math.min(460, Math.round((laneW(laneIdx) - 14) * 0.97));
  const rx = laneX(laneIdx) + (laneW(laneIdx) - cardW) / 2;
  let bottom = stackBottom;
  realFoes.forEach((e) => {
    const b = bodies[e.bodyKey] || {};
    const full = plan.keep.has(e.id);
    const rowH = full ? fullH : miniH;
    const ry = bottom - rowH;
    bottom = ry - gap;                        // the next (deeper) row stacks above
    foeBoxes.push({ x: rx, y: ry, w: cardW, h: rowH, id: e.id, e });
    const targeted = e.id && e.id === myTarget;
    const frac = e.threat ? e.threat.frac : 0;
    if (e.aoe && frac > 0.66) alarm = Math.max(alarm, frac);
    if (full) drawFoeRow(rx, ry, cardW, rowH, e, b, targeted, throb);
    else drawFoeMini(rx, ry, cardW, rowH, e, b, targeted, throb);
  });
  return alarm;
}

// THE BOSS BANNER (BOSS_SPEC_V1) — one wide card across the top of the board: ♛ name,
// HP, the Lich's stance telegraph, and a labeled bar per mechanic clock. The caravan's
// mirror: it spans every lane because the boss does. Clickable/hoverable like a foe card.
function drawBossBanner(boss, myTarget, throb) {
  const bars = boss.threats || [];
  const bx = 6, bw = W - 12, by = 6, headH = 24, hpH = 14;
  const bh = headH + hpH + bars.length * 15 + (boss.stanceLabel ? 17 : 0) + 10;
  _bossBannerBottom = by + bh;                     // foe stacks (esp. hydra head clusters) start below this
  const targeted = boss.id === myTarget;
  ctx.fillStyle = "#151a23f0"; roundRect(bx, by, bw, bh, 10); ctx.fill();
  ctx.lineWidth = targeted ? 4 : 3;
  ctx.strokeStyle = targeted ? "#3df" : "#ffcf4a";
  roundRect(bx, by, bw, bh, 10); ctx.stroke();
  const spr = foeSprite(boss.bodyKey), iconSz = 20, ix = bx + 10;
  if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, ix, by + 4, iconSz, iconSz);
  else { ctx.font = "17px serif"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(iconFor(boss.bodyKey), ix, by + 5); }
  // measure the HP readout first so the NAME can be clamped to the gap before it (never overlaps it)
  const hpStr = `❤${boss.hp}/${boss.maxHp}`, nameX = ix + iconSz + 8;
  ctx.font = "bold 16px ui-monospace, monospace"; const hpW = ctx.measureText(hpStr).width;
  const nameMaxW = (bx + bw - (targeted ? 30 : 10) - hpW - 10) - nameX;
  ctx.fillStyle = "#ffd24a";
  fitText(`♛ ${boss.name}`, nameX, by + 7, Math.max(40, nameMaxW), 17, 11);
  ctx.textAlign = "right";
  if (targeted) { ctx.font = "15px serif"; ctx.fillText("🎯", bx + bw - 8, by + 5); }
  ctx.fillStyle = "#9bf09b"; ctx.font = "bold 16px ui-monospace, monospace";
  ctx.fillText(hpStr, bx + bw - (targeted ? 30 : 10), by + 8);
  bar(bx + 10, by + headH + 2, bw - 20, 8, boss.hp / boss.maxHp, boss.color || "#ffcf4a");
  let yy = by + headH + hpH;
  if (boss.stanceLabel) {                      // the Lich's calendar — burst the weak window
    const obj = boss.stance === "objection";
    ctx.globalAlpha = obj ? 0.7 + 0.3 * throb : 1;
    ctx.fillStyle = obj ? "#8e2f2f" : "#2e7d4f";
    roundRect(bx + 10, yy, bw - 20, 14, 4); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff"; ctx.font = "bold 12px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(boss.stanceLabel, bx + bw / 2, yy + 7);
    yy += 17;
  }
  for (const t of bars) { threatBar(bx + 10, yy, bw - 20, 12, t, true); yy += 15; }
  foeBoxes.push({ x: bx, y: by, w: bw, h: bh, id: boss.id,
    e: { ...boss, atk: 0, dr: 0, gear: [], threat: null, boss: true } });
}

// Hover a foe → a small card: stats, its passive (in words), and its item.
function drawFoeInspect(bodies) {
  const hit = foeBoxes.find((b) => b.e && mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h)
    || (_inspectFoeId != null && foeBoxes.find((b) => b.e && b.id === _inspectFoeId));   // touch: a tapped foe stays inspected
  if (!hit) return;
  const e = hit.e, bd = bodies[e.bodyKey] || {};
  const lines = [e.name || bd.name || e.bodyKey];
  lines.push(`❤ ${e.hp}/${e.maxHp}${e.shield > 0 ? `   🛡${e.shield}` : ""}    ⚔ ${e.atk}${e.dr > 0 ? `   🛡-${e.dr}` : ""}`);
  if (e.queue?.length) {        // the FULL deck, front-first — the hover the owner asked for
    lines.push(`⚡ moxie ${e.moxie ?? 0}/${e.moxieMax ?? 10}  ·  deck (casts top→down):`);
    e.queue.forEach((c, i) => lines.push(`  ${i === 0 ? "▶" : "·"} ${c.name}  ⚡${c.cost}`));
  } else if (e.reactive) lines.push(`⚡ reactive — only strikes when hit`);
  if (e.passive) lines.push(`✦ ${e.passive}`);
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

// ---- overlays (class select + stock) -------------------------------------
// One container, dispatched by phase. Each rebuilds only when something visible
// changes (a signature compare) to avoid per-tick flicker / lost clicks.
let _draftSig = "", _stockSig = "", _brSig = "", _shopSig = "", _setupSig = "";
// SETUP deck-editor (owner 2026-06-27): the deck-builder + level-up surface BEFORE combat. Tapping
// "Position on board" dismisses it so the board is reachable; a floating ✎ button reopens. Reset
// every time we leave the setup phase.
let _setupDismissed = false;
// ROOMS ↔ BACKPACK toggle (owner 2026-06-28): the won + shop overlays split into two tabs — ROOMS
// (the next-room previews + boss counter + the exits) and BACKPACK (deck builder, loot, trade). The
// choice persists across re-renders/screens; defaults to ROOMS so the boss counter + what's-inside
// preview lead. Part of every won/shop render signature so flipping the tab repaints.
let _ovTab = "rooms";
// PROPOSE-TRADE compose state (player→player 1:1 swap, out of combat). Survives re-renders so the
// running selection stays put; validated against the live snapshot each build (a card/partner that
// vanished clears itself). A want is REQUIRED and must match the give's ◈ value (no gifts, 2026-07-02).
let _tradeTo = null, _tradeGive = null, _tradeWant = null;
const NODE_LABEL = { combat: "Fight", elite: "Elite ★", boss: "BOSS ♛", shop: "Shop 🛒" };
// Advance buttons sorted + arrowed LEFT→RIGHT to match the map drawing. The server now
// sorts links by x too, but the client re-sorts so the buttons can never lie about
// direction even against an old server snapshot.
function advBtns(nexts, attr) {
  const ns = [...nexts].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
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
// rooms are double-ante, so their N already runs higher — we just badge them ★. Boss → its name,
// shop → 🛒. "" when the engine hasn't attached an ante to this node yet (graceful pre-merge).
function roomAnteLabel(n) {
  if (!n) return "";
  if (n.type === "boss") return state.map?.bossName ? `♛ ${state.map.bossName}` : "♛ boss";
  if (n.type === "shop") return "🛒 wares";
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
  const ns = [...nexts].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  let myVote = null, myLocked = false;          // my own seat's current vote + lock
  for (const id of Object.keys(byNode)) for (const v of byNode[id])
    if (v.seat === you) { myVote = id; myLocked = !!v.locked; }
  const cards = ns.map((n, i) => {
    const base = NODE_LABEL[n.type] || "Next";
    const lbl = ns.length === 1 ? `${base} ▶` : i === 0 ? `◀ ${base}` : i === ns.length - 1 ? `${base} ▶` : base;
    const deal = n.type === "boss" ? (state.map?.bossName ?? "")
               : n.enchant ? `✦ ${n.enchant.name}${n.enchant.baseAnte ? ` · antes +${n.enchant.baseAnte}` : ""}` : "";
    const voters = (byNode[n.id] || []).map((v) =>
      `<span class="vote-badge${v.seat === you ? " mine" : ""}${v.locked ? " locked" : ""}" title="${v.name}${v.locked ? " — locked" : ""}" style="color:${v.color}">${iconImg(v.bodyKey)}${v.locked ? "🔒" : ""}</span>`).join("");
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
    `<div class="trade-offer"><b>${o.fromName}</b> offers <b>${o.giveName}</b> <b class="cval">◈${o.giveVal}</b> for your <b>${o.wantName ?? "?"}</b> <b class="cval">◈${o.wantVal ?? "?"}</b>
      <button class="lane-btn" data-accept="${o.id}">Accept</button><button class="lane-btn" data-decline="${o.id}">✕</button></div>`).join("");
  const outgoing = offers.filter((o) => o.from === meId).map((o) =>
    `<div class="trade-offer pending">You offered <b>${o.giveName}</b> (◈${o.giveVal}) for ${o.toName}'s ${o.wantName ?? "?"} — waiting…
      <button class="lane-btn" data-decline="${o.id}">Withdraw</button></div>`).join("");
  return (incoming || outgoing) ? `<div class="trade-box">${incoming}${outgoing}</div>` : "";
}

// Wire the offers strip (won + shop): accept an incoming 1:1 swap, or withdraw/decline an offer.
function wireTrade(ov) {
  ov.querySelectorAll("[data-accept]").forEach((b) => b.onclick = () => send({ type: "acceptTrade", offer: b.dataset.accept }));
  ov.querySelectorAll("[data-decline]").forEach((b) => b.onclick = () => send({ type: "declineTrade", offer: b.dataset.decline }));
}
// SQUAD SELECTOR (stock/won/shop) — a row of little buttons, one per body your seat owns,
// gold-highlighted for the body you're currently piloting. Clicking one possesses that body so
// every economy panel below (loot/kit/wallet/shop) retargets to it. Same look as the draft
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
    const who = s.id === you ? "You" : s.name;
    const name = bodies[s.bodyKey]?.name || s.bodyKey || "—";
    const extra = status ? status(s) : "";
    const style = `padding:7px 11px;margin:3px;border-radius:9px;cursor:pointer;min-width:104px;`
      + `display:inline-flex;flex-direction:column;align-items:center;gap:2px;`
      + `border:2px solid ${isActive ? "#e6c34a" : "#2a2f3a"};`
      + `background:${isActive ? "#2a2616" : "#171a21"};color:#dfe7f0;`;
    return `<button class="km-body-slot" data-squadslot="${s.id}" style="${style}">
      <span style="font-size:11px;opacity:.8">${who} · 🃏${s.deckSize ?? 0}</span>
      <span style="font-weight:bold;font-size:13px">${iconImg(s.bodyKey)} ${name}${extra}</span>
    </button>`;
  }).join("");
  return `<div class="draft-status" style="flex-wrap:wrap;justify-content:center;margin-bottom:8px">${slots}</div>`;
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
// The segmented control atop the won/shop overlays. Two tabs; the active one is gold. `_ovTab`
// persists, so a flip survives the next snapshot's re-render (it's in each render signature).
function tabBarHtml() {
  const tabs = [["rooms", "🚪 Rooms"], ["backpack", "🎒 Backpack"]];
  return `<div class="km-tabs">${tabs.map(([k, l]) =>
    `<button class="km-tab${_ovTab === k ? " on" : ""}" data-ovtab="${k}">${l}</button>`).join("")}</div>`;
}
function wireTabs(ov, rerender) {
  ov.querySelectorAll("[data-ovtab]").forEach((b) => b.onclick = () => {
    if (_ovTab === b.dataset.ovtab) return;
    _ovTab = b.dataset.ovtab;
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
    const key = (f.bodyKey || "") + "|" + f.level + "|" + f.maxHp + "|" + deckSig;
    let g = idx.get(key);
    if (!g) { g = { bodyKey: f.bodyKey, name: f.name || f.bodyKey || "foe", level: f.level, maxHp: f.maxHp, passive: f.passive ?? null, deck, count: 0 }; idx.set(key, g); groups.push(g); }
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
      ? `<span class="rf-deck">${g.deck.map((d) => `${d.cost != null ? `⚡${d.cost} ` : ""}${d.name}${d.count > 1 ? `×${d.count}` : ""}`).join(" · ")}</span>`
      : "";
    return `<span class="room-foe" data-roomtip-node="${escTip(n.id)}" data-roomtip-i="${gi}" title="tap for details">` +
      `${iconImg(g.bodyKey)} <span class="rf-name">${g.name}${g.count > 1 ? ` ×${g.count}` : ""}</span>` +
      `<span class="room-foe-stat">${g.level != null ? `Lv${g.level} ` : ""}❤${g.maxHp ?? "?"}</span>${deck}</span>`;
  }).join("")}</div>`;
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
    maxHp: g.maxHp, passive: g.passive,
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
  if (!nexts || !nexts.length) return `<p class="draft-sub">No exits from here.</p>`;
  const ns = [...nexts].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  // CO-OP VOTE badges (owner 2026-06-28): each voter's body icon rides the room they picked; my own
  // vote highlights the card. byNode is "" in solo (server omits it / one seat), so this is invisible
  // outside co-op and the rich preview is unchanged.
  const byNode = (state.roomVotes && state.roomVotes.byNode) || {};
  let myVote = null;
  for (const id of Object.keys(byNode)) for (const v of byNode[id]) if (v.seat === you) myVote = id;
  return `<div class="room-cards">${ns.map((n) => {
    const name = NODE_LABEL[n.type] || "Next";
    const ante = n.ante != null ? `<span class="room-ante">⚖${n.ante}</span>` : "";
    // ANTE V3 (owner 2026-07-03): ⚖ is the THREAT; ◈ is what actually drops = everything above each
    // foe's flat +1 base (its cards + level/elite surplus as random treasures). So ◈ runs 1-per-foe
    // BELOW ⚖ — the base is a cover charge. Both are shown so the reward-vs-threat gap is visible.
    const loot = n.loot != null ? `<span class="room-loot">◈${n.loot} loot</span>` : "";
    // ROOM EFFECT (elites dissolved): the ★ badge now marks an effect-bearing room of any stripe.
    const elite = n.gimmick ? `<span class="room-tag elite">★ ${n.gimmick}</span>` : "";
    const gimmickLine = n.gimmickBlurb ? `<div class="room-gimmick">⚠ ${n.gimmickBlurb}</div>` : "";
    // …and the effect BRINGS ITEMS ("acid rain includes 3 value of items"): list its pot explicitly.
    const rewardLine = n.gimmick
      ? `<div class="room-reward">💰 ${n.gimmick} pot: +◈${n.gimmickPot ?? 0} extra items in the loot</div>` : "";
    const cost = n.cost != null ? `<span class="room-cost${n.locked ? " locked" : ""}">${n.locked ? "🔒" : "◈"}${n.cost}</span>` : "";
    let body;
    if (n.type === "boss") body = `<div class="room-foes"><span class="room-foe">♛ ${state.map?.bossName || "the boss"}</span></div>`;
    else if (n.type === "shop") body = `<div class="room-foes"><span class="room-foe">🛒 wares for sale</span></div>`;
    else body = roomFoesHtml(n) || `<div class="room-foes"><span class="lane-empty">— ${n.ante != null ? `⚖${n.ante} threat` : "contents unknown"} —</span></div>`;
    const lock = (n.locked && n.lockReason) ? `<div class="room-lock">🔒 ${n.lockReason}</div>` : "";
    const voters = (byNode[n.id] || []).map((v) =>
      `<span class="vote-badge${v.seat === you ? " mine" : ""}${v.locked ? " locked" : ""}" title="${v.name}${v.locked ? " — locked" : ""}" style="color:${v.color}">${iconImg(v.bodyKey)}${v.locked ? "🔒" : ""}</span>`).join("");
    const voteRow = voters ? `<div class="vote-badges">${voters}</div>` : "";
    // Dedicated ENTER action bar (owner 2026-06-29): the foe chips fill the card and intercept taps to
    // show foe info, so a clear non-chip target lets you just GO. It's a plain (non-chip) child of the
    // card button, so a tap bubbles to the card's advance/leave handler — tapping a chip still inspects.
    const enterLbl = n.type === "boss" ? "▶ Fight the boss" : n.type === "shop" ? "▶ Enter shop" : "▶ Enter room";
    const enter = `<span class="room-enter">${enterLbl}</span>`;
    return `<button class="room-card node-${n.type}${n.locked ? " is-locked" : ""}${myVote === n.id ? " is-myvote" : ""}" data-${attr}="${n.id}">
      <div class="room-card-h"><span class="room-name">${name}</span>${elite}${ante}${loot}${cost}</div>
      ${gimmickLine}${rewardLine}${body}${lock}${voteRow}${enter}</button>`;
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
    others.map((p) => `<button class="trade-item${p.id === _tradeTo ? " sel" : ""}" data-tradeto="${p.id}">${p.name}</button>`).join("")}</div>` : "";
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
  if (state?.phase === "stock" && state.stock) return renderStock();
  if (state?.phase === "shop" && state.shop) return renderShop();
  if (state?.phase === "won") return renderBetweenRooms();
  if (state?.phase === "setup") return renderSetup();
  if (!ov.classList.contains("hidden")) { ov.classList.add("hidden"); ov.innerHTML = ""; _ovScreen = ""; _draftSig = _stockSig = _brSig = _shopSig = _setupSig = ""; }
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
  if (!saved) { ov.scrollTop = 0; return; }
  const now = [ov, ...ov.querySelectorAll("*")];
  saved.forEach((st, i) => { if (st && now[i]) now[i].scrollTop = st; });
}

// ── COMBAT LOG panel (owner 2026-06-25): an ordered, scrollable record of the whole fight, shown
// only when the fight is OVER (lost/won) and the server shipped state.combatLog. Built once per new
// log (signature-gated, like the draft overlay), scrolled to the BOTTOM so the death is in view.
// ✕ hides it (revealing the board); ▶ Play Again restarts (same as the startBtn).
let _clogSig = "";
let _clogDismissed = false;   // ✕ on the combat-log panel STICKS for the current death (don't re-pop each render)
const _clogClass = (line) => {
  const c = (line || "")[0];
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
    // rebuild: header (title + ✕) · scrollable monospace list (line per entry, colored by prefix) · ▶ Play Again
    const rows = log.map((line) => {
      const d = document.createElement("div");
      d.className = _clogClass(line);
      d.textContent = line;
      return d.outerHTML;
    }).join("");
    el.innerHTML =
      '<div class="clog-head"><span>Combat Log</span><button class="clog-x" title="Close">✕</button></div>' +
      '<div class="clog-list">' + rows + '</div>' +
      '<div class="clog-foot"><button class="clog-play">▶ Play Again</button></div>';
    el.querySelector(".clog-x").onclick = () => { el.classList.add("hidden"); _clogDismissed = true; }; // sticks for this death
    el.querySelector(".clog-play").onclick = () => send({ type: "start" });
  }
  if (!_clogDismissed && el.classList.contains("hidden")) {
    el.classList.remove("hidden");
    const list = el.querySelector(".clog-list");
    if (list) list.scrollTop = list.scrollHeight;   // death is last — open scrolled to the bottom
  }
}

// ── CARD ECONOMY (owner 2026-06-24): gold is gone. A card's VALUE (◈) is the only resource —
// shown on every listed card and spent value-for-value at the shop. The deck-builder edits the
// COMBAT deck (deckList) out of the full owned repo (backpack); combat draws only from the deck.

// Multiset → { key: count }. Accepts card DESCRIPTORS ({key,...}) or bare key STRINGS — the pay
// trays (_lvlPay/_shopPay) hold bare keys, and counting them as descriptors read every count as
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
// exactly like the shop's tender flow. `_lvlOpen` = the pay tray is expanded; `_lvlPay` = the backpack
// card keys tendered (one entry per copy). Survives re-renders so the running total + Confirm stay put.
let _lvlOpen = false;
let _lvlPay = [];
// The LEVEL-UP control. Collapsed: the player's RUN-WIDE level + a button to open the pay-picker. Opened:
// a value-for-value tender tray (mirrors the shop) — tap spare cards until their summed ◈ COVERS the cost,
// then Confirm. Spares are spent before deck copies and the deck never drops below MIN_DECK (server-side
// tenderValue re-validates). Renders nothing until the engine ships player.nextLevelCost (graceful pre-merge).
function buildLevelUp(me) {
  const cost = me.nextLevelCost;
  if (cost == null) return "";
  const level = me.level ?? 1;
  const bodyName = (state.bodies || {})[me.bodyKey]?.name || me.bodyKey || "your body";
  const spares = backpackSpare(me);
  const haveVal = spares.reduce((s, c) => s + (c.value ?? 0), 0);
  // BANKED TREASURE (owner 2026-07-06): convertBag's ◈ auto-covers whatever the tendered cards
  // don't — the server (tenderWithTreasure) deducts only the shortfall, never more.
  const bank = me.treasure ?? 0;
  if (!_lvlOpen) {
    const canOpen = haveVal + bank >= cost;
    return `<div class="km-levelup">
      <span class="lvl-info">⭐ <b>${bodyName}</b> · Lv ${level} <span class="dcd">(run-wide)</span>${bank > 0 ? ` · 💎<b class="cval">◈${bank}</b>` : ""}</span>
      <button class="km-lvl-btn" data-lvlopen="1" ${canOpen ? "" : "disabled"}
        title="Tender SPARE backpack cards (value-for-value) and/or banked 💎◈ to raise your run-wide level — it follows you onto every body you wear. Spares are spent before deck copies; your deck never drops below the minimum.">
        ${canOpen ? `Level Up ▲ <b class="cval">◈${cost}</b>` : `Need ◈${cost} in spares${bank > 0 ? " + 💎" : ""}`}
      </button>
    </div>`;
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
    return `<button class="draft-opt km-card${isPay ? " sel" : ""}" data-lvlpay="${c.key}" data-paid="${isPay ? 1 : 0}">
      <span class="dn">${c.name} <b class="cval">◈${c.value ?? 0}</b></span><span class="dt">${c.text || ""}</span>
      <span class="dcd">${c.cost != null ? `⚡${c.cost}` : ""}${isPay ? " · ◈ tendered" : ""}</span>
    </button>`;
  }).join("");
  return `<div class="km-levelup km-levelup-open">
    <div class="shop-paybar">
      <span class="shop-paymsg">Level <b>${bodyName}</b> → Lv ${level + 1} · ◈${cost} — tendered
        <b class="${enough ? "ante-ok" : "ante-no"}">◈${paid}${bankUsed > 0 ? ` + 💎◈${bankUsed}` : ""}/${cost}</b>${enough ? " ✓" : ""}</span>
      <button class="km-lvl-btn shop-confirm" data-lvlconfirm="1" ${enough ? "" : "disabled"}>✓ Level Up</button>
      <button class="lane-btn" data-lvlcancel="1">Cancel</button>
    </div>
    <div class="km-deck-h">💳 PAY WITH SPARE CARDS <span class="dcd">— tap to tender (cover ◈${cost})</span></div>
    <div class="draft-grid shop-shelf">${tiles || `<span class="lane-empty">— no spare cards to tender — move some out of your deck first —</span>`}</div>
  </div>`;
}
// Wire the level-up picker inside an overlay (won + setup). `rerender` repaints the host screen after a
// tender tap/open/cancel; Confirm sends the CHOSEN pay keys (the server re-validates via tenderValue).
function wireLevelUp(ov, me, rerender) {
  ov.querySelectorAll("[data-lvlopen]").forEach((b) => b.onclick = () => { _lvlOpen = true; _lvlPay = []; rerender?.(); });
  ov.querySelectorAll("[data-lvlcancel]").forEach((b) => b.onclick = () => { _lvlOpen = false; _lvlPay = []; rerender?.(); });
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
    send({ type: "levelUp", pay: [..._lvlPay] });
    _lvlOpen = false; _lvlPay = [];
  });
}
// One card tile (shared look across deck / backpack / wares / loot): name, ◈value, ⚡cost, text.
// `attr`/`val` wire the click data-attribute; `dis` greys it; `extra` adds a trailing line.
function cardTile(c, attr, val, dis, extra) {
  return `<button class="draft-opt km-card" data-${attr}="${val}"${dis ? " disabled" : ""} title="${c.text || ""}">
    <span class="dn">${c.name} <b class="cval">◈${c.value ?? 0}</b></span>
    <span class="dt">${c.text || ""}</span>
    <span class="dcd">${c.cost != null ? `⚡${c.cost}` : ""}${extra ? ` · ${extra}` : ""}</span>
  </button>`;
}
// THE DECK-BUILDER (out of combat — won + shop). Two groups: DECK (me.deckList) and BACKPACK
// (owned-not-in-deck). Tap a deck card → moveToBackpack; tap a backpack card → moveToDeck. The deck
// can't drop below the floor (server refuses), so at the floor the deck cards grey out. The caller
// supplies a `rerender` (clears its sig + re-renders) used to repaint after a move next tick.
function buildDeckBuilder(me) {
  const deck = me.deckList || [];
  const spare = backpackSpare(me);
  const size = me.deckSize ?? deck.length;
  const min = me.minDeck ?? 10;
  const atFloor = size <= min;     // removing any deck card now is refused by the server
  const deckCards = deck.length
    ? deck.map((c) => cardTile(c, "todeck-remove", c.key, atFloor)).join("")
    : `<span class="lane-empty">— deck empty —</span>`;
  const spareCards = spare.length
    ? spare.map((c) => cardTile(c, "todeck-add", c.key, false)).join("")
    : `<span class="lane-empty">— all owned cards are in the deck —</span>`;
  // CONVERT THE BAG (owner 2026-07-06): melt ALL spares into banked 💎◈ for level-ups/adoptions.
  // Inline are-you-sure (no browser confirm): the ♻ button swaps to a confirm row via wireDeckBuilder.
  const bagVal = spare.reduce((s, c) => s + (c.value ?? 0), 0);
  const bank = me.treasure ?? 0;
  const wornSpares = spare.some((c) => c.passive);   // melting a worn passive (Cool Shoes) kills its effect
  const convert = `<span class="km-convert">
      ${bank > 0 ? `💎<b class="cval">◈${bank}</b>` : ""}
      <button class="lane-btn" data-convarm="1" ${spare.length ? "" : "disabled"}
        title="Melt EVERY spare card into banked 💎◈ to spend on level-ups and body adoptions. Your deck is untouched. Spent worn passives stop working.">♻ Bag → 💎◈${bagVal}</button>
      <span class="km-convconfirm hidden">Melt ALL ${spare.length} spare cards${wornSpares ? " (incl. worn passives — their effects END)" : ""} into <b class="cval">💎◈${bagVal}</b>? This can't be undone.
        <button class="km-lvl-btn shop-confirm" data-convgo="1">✓ Convert</button>
        <button class="lane-btn" data-convcancel="1">Cancel</button>
      </span>
    </span>`;
  return `<div class="km-deckbuild">
    <p class="draft-sub" style="margin:0 0 6px">
      <b>Deck ${size}/${min}+</b>${atFloor ? ` · <span class="ante-no">at minimum — add before you stash</span>` : ""}</p>
    <div class="km-deck-cols">
      <div class="km-deck-group">
        <div class="km-deck-h">🃏 DECK <span class="dcd">(${deck.length})</span></div>
        <div class="draft-grid">${deckCards}</div>
      </div>
      <div class="km-deck-group">
        <div class="km-deck-h">🎒 BACKPACK <span class="dcd">(${spare.length} spare)</span> ${convert}</div>
        <div class="draft-grid">${spareCards}</div>
      </div>
    </div>
  </div>`;
}
// Wire the deck-builder. Moves just send; the next snapshot carries the new deck/backpack and the
// overlay re-renders itself (deckList/backpack are in the render sig), so no manual repaint needed.
// The ♻ convert flow is a local two-step (arm → are-you-sure → send) — DOM-toggled in place, no rerender.
function wireDeckBuilder(ov) {
  ov.querySelectorAll("[data-todeck-add]").forEach((b) =>
    b.onclick = () => send({ type: "moveToDeck", key: b.dataset.todeckAdd }));
  ov.querySelectorAll("[data-todeck-remove]").forEach((b) =>
    b.onclick = () => send({ type: "moveToBackpack", key: b.dataset.todeckRemove }));
  ov.querySelectorAll("[data-convarm]").forEach((b) => b.onclick = () => {
    b.classList.add("hidden");
    b.parentElement.querySelector(".km-convconfirm")?.classList.remove("hidden");
  });
  ov.querySelectorAll("[data-convcancel]").forEach((b) => b.onclick = () => {
    const wrap = b.closest(".km-convert");
    wrap?.querySelector(".km-convconfirm")?.classList.add("hidden");
    wrap?.querySelector("[data-convarm]")?.classList.remove("hidden");
  });
  ov.querySelectorAll("[data-convgo]").forEach((b) => b.onclick = () => send({ type: "convertBag" }));
}

// SHOP PAY SELECTION (value-for-value): the selected ware + the backpack card keys tendered as
// payment. Survives re-renders so the running total + Confirm stay put. Cleared on buy/reroll/leave.
let _shopWare = null;        // { key, value } of the ware being bought
let _shopPay = [];           // backpack card keys tendered (one entry per copy spent)

// The shop screen: value-for-value. Pick a ware, tender backpack cards whose summed ◈ EXACTLY equals
// the ware's ◈ value — the buy AUTO-COMMITS the instant they match (owner 2026-06-29: "too many confirm
// steps"; an even trade is the only action at exact value, so the old ✓ Buy tap was redundant). Reroll +
// Leave are free. Plus the deck-builder so you can re-deck what you bought.
function renderShop() {
  const ov = $("draftOverlay");
  // SQUAD: the shop acts for the ACTIVE (possessed) body — its backpack/deck, its buys (the server
  // routes buyWare/moveToDeck/moveToBackpack/rerollShop to whoever we possess).
  const me = pilot() || {};
  const backpack = backpackSpare(me);   // tender only SPARE cards — never your DECK (owner 2026-06-24: "only show backpack items")
  const shop = state.shop;
  const map = state.map || {};
  const cur = (map.nodes || []).find((n) => n.id === map.currentId);
  const nexts = (cur?.links || []).map((id) => (map.nodes || []).find((n) => n.id === id)).filter(Boolean);

  // a stale pay selection (cards spent / ware sold from under us) clears itself
  if (_shopWare && !shop.wares.some((w) => w.key === _shopWare.key)) { _shopWare = null; _shopPay = []; }
  const bpCount = _multiset(backpack);
  const payCount = {};
  _shopPay = _shopPay.filter((k) => { payCount[k] = (payCount[k] || 0) + 1; return payCount[k] <= (bpCount[k] || 0); });

  const sig = JSON.stringify([shop.wares.map((w) => [w.key, w.value]),
    backpack.map((c) => c.key), (me.deckList || []).map((c) => c.key), me.deckSize,
    nexts.map((n) => [n.id, n.type, n.ante, n.locked, n.cost, (n.contents || []).length]), activeId, _shopWare, _shopPay,
    map.roomsToBoss, map.currentRow, _ovTab, _tradeTo, _tradeGive, _tradeWant,
    (state.trade?.offers || []).map((o) => o.id),
    (state.players || []).map((p) => [p.id, p.bidPoints ?? 0, (p.backpack || []).map((c) => c.key).join()])]);
  if (sig === _shopSig) return;
  _shopSig = sig;
  const selector = squadSelectorHtml();
  const rerender = () => { _shopSig = ""; renderShop(); };

  // pay running total (◈) against the selected ware's value
  const paid = _shopPay.reduce((s, k) => s + (backpack.find((c) => c.key === k)?.value ?? 0), 0);
  const need = _shopWare?.value ?? 0;
  const remaining = Math.max(0, need - paid);
  const enough = _shopWare && paid === need;     // EVEN trade only (owner 2026-06-24): exact ◈ value, no overpay

  const waresSection = shop.wares.length ? `
    <div class="km-deck-h">🛒 WARES <span class="dcd">— tap one to buy</span></div>
    <div class="draft-grid shop-shelf">${shop.wares.map((w) => {
      const on = _shopWare && _shopWare.key === w.key;
      return `<button class="draft-opt km-card${on ? " sel" : ""}" data-ware="${w.key}">
        <span class="dn">${w.name} <b class="cval">◈${w.value ?? 0}</b></span><span class="dt">${w.text}</span>
        <span class="dcd">${w.cost != null ? `⚡${w.cost}` : ""}${on ? " · ✓ selected" : ""}</span>
      </button>`;
    }).join("")}</div>` : `<p class="draft-sub">Sold out — nothing left on the shelf.</p>`;

  // pay tray: shown once a ware is picked — tap backpack cards to tender them (value-for-value)
  const paySection = !_shopWare ? `<p class="draft-sub shop-paynote" style="margin-top:10px">⬆ Pick a ware, then tap spare cards below to pay its ◈ value — it's yours the moment they match.</p>` : `
    <div class="shop-paybar">
      <span class="shop-paymsg">Paying <b>${_shopWare.name}</b> ◈${need} — tendered
        <b class="${enough ? "ante-ok" : "ante-no"}">◈${paid}/${need}</b> — buys automatically at ◈${need}</span>
      <button class="lane-btn" data-cancelbuy="1">Cancel</button>
    </div>
    <div class="km-deck-h">💳 PAY WITH SPARE CARDS <span class="dcd">— tap to tender</span></div>
    <div class="draft-grid shop-shelf">${backpack.length ? (() => {
      // EVEN-TRADE tender (owner 2026-06-24): only show backpack cards that can still be part of an
      // EXACT-value trade for this ware — a card worth more than what's still owed is hidden, so you
      // can never overpay. Already-tendered copies stay visible (tap to take one back).
      const seen = {}, tendered = _multiset(_shopPay);
      const tiles = backpack.map((c) => {
        seen[c.key] = (seen[c.key] || 0) + 1;
        const isPay = seen[c.key] <= (tendered[c.key] || 0);   // this COPY (nth of its key) is tendered
        if (!isPay && (c.value ?? 0) > remaining) return "";   // would overshoot — not an even trade
        return `<button class="draft-opt km-card${isPay ? " sel" : ""}" data-pay="${c.key}" data-paid="${isPay ? 1 : 0}">
          <span class="dn">${c.name} <b class="cval">◈${c.value ?? 0}</b></span><span class="dt">${c.text}</span>
          <span class="dcd">${c.cost != null ? `⚡${c.cost}` : ""}${isPay ? " · ◈ tendered" : ""}</span>
        </button>`;
      }).join("");
      return tiles || `<span class="lane-empty">— no card makes an even ◈${need} trade —</span>`;
    })() : `<span class="lane-empty">— no spare cards to tender — move some out of your deck first —</span>`}</div>`;

  const swapLine = ` <button class="km-tier-btn" data-swapbody="1">🎭 Swap body (free)</button>`;

  // ROOMS tab: the boss counter + the exits (each a what's-inside room card). BACKPACK tab: the
  // shop shelf + pay tray, plus the deck-builder + party trade. The toggle picks which is shown.
  const roomsTab = `${bossCounterHtml()}
    <p class="draft-sub" style="margin-top:8px">Leave the shop — choose an exit:</p>
    ${roomCardsHtml(nexts, "leave")}`;
  const backpackTab = `<p class="draft-sub" style="margin-top:6px">Value-for-value: pick a ware, then tender backpack cards whose ◈ sums to its price.
      <button class="lane-btn" data-reroll="1">↻ Reroll (free)</button>${swapLine}</p>
    <div class="overlay-cols">
      <div class="ov-col">${waresSection}${paySection}</div>
      <div class="ov-col">${buildDeckBuilder(me)}${buildOffersStrip()}${buildTradeCompose()}</div>
    </div>`;

  ov.classList.remove("hidden");
  paintOverlay(ov, "shop", `<div class="draft-card shop-wide">
    <h2>Shop 🛒</h2>
    ${selector}
    ${tabBarHtml()}
    ${_ovTab === "rooms" ? roomsTab : backpackTab}
  </div>`);
  ov.querySelectorAll("[data-ware]").forEach((b) => b.onclick = () => {
    const w = shop.wares.find((x) => x.key === b.dataset.ware);
    if (!w) return;
    _shopWare = (_shopWare && _shopWare.key === w.key) ? null : { key: w.key, name: w.name, value: w.value ?? 0 };
    _shopPay = [];
    rerender();
  });
  ov.querySelectorAll("[data-pay]").forEach((b) => b.onclick = () => {
    if (!_shopWare) return;
    const k = b.dataset.pay;
    // decide by THIS copy's tendered state (data-paid), not mere key presence, so duplicate copies
    // can each be tendered toward the price (tap an untendered copy → ADD; a tendered one → take back)
    if (b.dataset.paid === "1") { const idx = _shopPay.indexOf(k); if (idx >= 0) _shopPay.splice(idx, 1); }
    else _shopPay.push(k);
    // AUTO-COMMIT (owner 2026-06-29 "too many confirm steps"): overshoot is impossible (overpriced
    // cards are hidden) and the trade must be EXACT, so the moment ◈ tendered === the ware's ◈ the
    // only legal action is to buy — fire it here instead of a redundant ✓ Buy tap. Server re-validates.
    const tendered = _shopPay.reduce((s, pk) => s + (backpack.find((c) => c.key === pk)?.value ?? 0), 0);
    if (tendered === (_shopWare.value ?? 0)) {
      send({ type: "buyWare", key: _shopWare.key, pay: [..._shopPay] });
      _shopWare = null; _shopPay = [];
      return;                                     // server pushes fresh state → repaint
    }
    rerender();
  });
  ov.querySelectorAll("[data-cancelbuy]").forEach((b) => b.onclick = () => { _shopWare = null; _shopPay = []; rerender(); });
  wireDeckBuilder(ov);
  ov.querySelectorAll("[data-reroll]").forEach((b) => b.onclick = () => { _shopWare = null; _shopPay = []; send({ type: "rerollShop" }); });
  ov.querySelectorAll("[data-leave]").forEach((b) => b.onclick = () => send({ type: "leaveShop", to: b.dataset.leave }));
  ov.querySelectorAll("[data-swapbody]").forEach((b) => b.onclick = () => window.KM.openBodyModal?.());
  wireSquadSelector(ov, rerender);
  wireTrade(ov);
  wireTabs(ov, rerender);
  wireTradeCompose(ov, rerender);
}

// The between-rooms (WON) screen: claim loot FREE into the backpack, edit your combat deck, then
// choose the next room. Loot is a SHARED set; in single-player the server may have auto-collected it
// into the backpack already (loot empty) — handle that gracefully.
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
  const nexts = complete ? [] : (cur?.links || []).map((id) => (map.nodes || []).find((n) => n.id === id)).filter(Boolean);
  const sig = JSON.stringify([loot && loot.cards.map((c) => c.key), earned,
    (me.backpack || []).map((c) => c.key), (me.deckList || []).map((c) => c.key), me.deckSize,
    nexts.map((n) => [n.id, n.type, n.ante, n.locked, n.cost, (n.contents || []).length]), complete, state.runWon, state.floor, activeId,
    map.roomsToBoss, map.currentRow, _ovTab, _tradeTo, _tradeGive, _tradeWant,
    (state.trade?.offers || []).map((o) => o.id),
    state.roomVotes,   // co-op vote/lock state must rebuild the room picker when an icon moves
    me.level, me.nextLevelCost, me.treasure, _lvlOpen, _lvlPay,   // level-up picker + 💎 bank must repaint on change
    (state.players || []).map((p) => [p.id, p.bidPoints ?? 0, (p.backpack || []).map((c) => c.key).join()])]);
  if (sig === _brSig) return;
  _brSig = sig;
  const selector = squadSelectorHtml();
  const rerender = () => { _brSig = ""; renderBetweenRooms(); };

  // SPOILS. Solo runs auto-collect into the backpack (loot null/empty) — say so rather than show a
  // dead panel. CO-OP (owner 2026-07-02, BID POINTS): the pool's value was split into per-seat claim
  // budgets on clear (excess → the seat furthest behind, so everyone's loot stays equivalent over
  // the run) — a claim spends your points, an over-budget card greys out with its price.
  const gated = (state.players || []).length > 1;
  const myPts = (state.players || []).find((p) => p.id === you)?.bidPoints ?? 0;
  const partyPts = gated ? `<p class="draft-sub loot-pts">${(state.players || []).filter((p) => !p.bot)
    .map((p) => `${p.id === you ? "You" : p.name} <b class="cval">◈${p.bidPoints ?? 0}</b>`).join(" · ")}</p>` : "";
  const lootSection = loot && loot.cards.length ? `
    <p class="draft-sub" style="margin-top:6px">${gated
      ? `Spoils — you have <b class="cval">◈${myPts}</b> to spend:`
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
    ? `<button class="stock-begin" data-newrun="1">👑 NEW RUN ▶</button>`
    : complete
    ? `<button class="stock-begin" data-descend="1">Descend to ${(state.floor || 1) + 1 >= 4 ? "the THRONE ♛" : `Floor ${(state.floor || 1) + 1}`} ▶</button>`
    : `${bossCounterHtml()}
       <p class="draft-sub" style="margin-top:8px">${humanSeats >= 2
         ? "Vote for the next room — the party moves when every seat locks in:"
         : "Pick a room:"}</p>
       ${roomCardsHtml(nexts, "advance")}
       ${humanSeats >= 2 ? roomVoteBar() : ""}`;
  const backpackTab = `${buildLevelUp(me)}
    ${(loot && loot.cards.length) ? `<div class="overlay-cols">
      <div class="ov-col">${lootSection}</div>
      <div class="ov-col">${buildDeckBuilder(me)}${buildOffersStrip()}${buildTradeCompose()}</div>
    </div>` : `${buildDeckBuilder(me)}${buildOffersStrip()}${buildTradeCompose()}`}`;

  ov.classList.remove("hidden");
  paintOverlay(ov, "won", `<div class="draft-card loot-wide">
    <h2>${state.runWon ? "👑 The King is dead — the throne is YOURS!" : complete ? "Boss slain! 👑" : trailhead ? "🚪 Choose your first room" : "Room cleared! 🎉"}</h2>
    ${selector}
    <p class="draft-sub" style="margin-top:2px">${complete
      ? `Boss slain — a shelf of RARES dropped${gated ? " (spoils split as bid points)" : ""}.`
      : trailhead ? `Pick where your crawl begins.`
      : `⚖${earned} threat cleared${gated ? " — spoils split as bid points below" : " — spoils collected into your backpack"}.`}${swapLine}</p>
    ${tabBarHtml()}
    ${_ovTab === "rooms" ? roomsTab : backpackTab}
  </div>`);
  ov.querySelectorAll("[data-loot]").forEach((b) => b.onclick = () => send({ type: "claimLoot", key: b.dataset.loot }));
  wireDeckBuilder(ov);
  wireLevelUp(ov, me, rerender);
  ov.querySelectorAll("[data-advance]").forEach((b) => b.onclick = () => send({ type: "advance", to: b.dataset.advance }));
  ov.querySelectorAll("[data-lockroom]").forEach((b) => b.onclick = () => send({ type: "lockRoom" }));
  ov.querySelectorAll("[data-unlockroom]").forEach((b) => b.onclick = () => send({ type: "unlockRoom" }));
  ov.querySelectorAll("[data-swapbody]").forEach((b) => b.onclick = () => window.KM.openBodyModal?.());
  const desc = ov.querySelector("[data-descend]");
  if (desc) desc.onclick = () => send({ type: "descend" });
  const nr = ov.querySelector("[data-newrun]");
  if (nr) nr.onclick = () => send({ type: "start" });   // runWon unlocks `start` from the won phase
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
// gate is won/shop only); the UI is wired and works the moment that lands.
function renderSetup() {
  const ov = $("draftOverlay");
  const me = pilot() || {};
  const reopen = $("setupReopen");
  if (reopen) { reopen.classList.toggle("hidden", !_setupDismissed); reopen.textContent = "✎ Edit deck / level up"; }
  if (_setupDismissed) {                                   // board visible for positioning
    if (!ov.classList.contains("hidden")) { ov.classList.add("hidden"); ov.innerHTML = ""; }
    _setupSig = "";
    return;
  }
  const selector = squadSelectorHtml();
  const sig = JSON.stringify(["setup", (me.deckList || []).map((c) => c.key), (me.backpack || []).map((c) => c.key),
    me.deckSize, me.level, me.nextLevelCost, me.treasure, me.bodyKey, activeId, _lvlOpen, _lvlPay,
    (state.players || []).map((p) => [p.id, p.bidPoints ?? 0, (p.backpack || []).map((c) => c.key).join()])]);
  if (sig === _setupSig) return;
  _setupSig = sig;
  const rerender = () => { _setupSig = ""; renderSetup(); };
  const swapLine = ` <button class="km-tier-btn" data-swapbody="1">🎭 Swap body (free)</button>`;
  ov.classList.remove("hidden");
  paintOverlay(ov, "setup", `<div class="draft-card loot-wide">
    <h2>Get ready — Floor ${state.floor || 1}</h2>
    ${selector}
    <p class="draft-sub" style="margin-top:2px">Tune your deck and body before the fight begins.${swapLine}</p>
    ${buildLevelUp(me)}
    ${buildDeckBuilder(me)}
    <div class="advance-row" style="margin-top:12px">
      <button class="advance-btn" data-begincombat="1">⚔ BEGIN COMBAT ▶</button>
      <button class="advance-btn node-shop" data-setupclose="1">Position on board ✕</button>
    </div>
  </div>`);
  wireDeckBuilder(ov);
  wireLevelUp(ov, me, rerender);
  ov.querySelector("[data-begincombat]").onclick = () => send({ type: "start" });
  ov.querySelector("[data-setupclose]").onclick = () => { _setupDismissed = true; renderSetup(); render(); };
  ov.querySelectorAll("[data-swapbody]").forEach((b) => b.onclick = () => window.KM.openBodyModal?.());
  wireSquadSelector(ov, rerender);
}

const laneLabel = (l, n) => n <= 1 ? "Lane" :
  (n === 3 ? ["Left", "Mid", "Right"][l] : (n === 2 ? ["Left", "Right"][l] : "Lane " + (l + 1)));
function renderStock() {
  const ov = $("draftOverlay");
  const s = state.stock;
  const laneN = state.laneCount || 3;
  const sig = JSON.stringify([s.palette, s.placed, s.anteRequired, s.anteStocked, s.canBegin, s.anteCap, state.floor, laneN]);
  if (sig === _stockSig) return;
  _stockSig = sig;

  // COLLECTIVE DRAFT (owner 2026-06-19): free-for-all — anyone drafts any foe, no take-backs, until
  // the SHARED ante is met (overshoot allowed). No per-player picks, no per-lane ownership; the
  // foes auto-sort across lanes (tankiest to the front).
  const need = s.anteRequired ?? 0;
  const have = s.anteStocked ?? 0;
  const remaining = Math.max(0, need - have);
  const full = (s.placed?.length ?? 0) >= (s.max ?? 99);
  const palette = s.palette.map((o, idx) => {
    const items = (o.gear ?? []).map((g) => `<span class="fgear">◆ <b>${g.name}</b> — ${g.text}</span>`).join("");
    const pass = o.passive ? `<span class="fpass">✦ ${o.passive}</span>` : "";
    // body Power on the card (⚔ sword / ✨ staff) — what its gear scales with
    const pow = (o.phys ? ` · ⚔${o.phys}` : "") + (o.mag ? ` · ✨${o.mag}` : "");
    // the WHOLE card drafts now (owner 2026-06-19: tap anywhere on the foe panel, not a tiny button)
    return `<div class="foe-opt${full ? " is-disabled" : ""}"${full ? "" : ` data-add="${idx}"`} title="${full ? "the room is full" : "tap anywhere to draft this foe into the room"}">
      <b class="fbig" title="ante — this foe's weight (body 1 + its items): what it pays into the party split when the room clears, and what its items are worth as spoils. Richer rooms pay everyone more.">${o.ante ?? 1}</b>
      <span class="fn">${iconImg(o.bodyKey)} ${o.name}</span>
      <span class="fstat">❤ ${o.maxHp} HP${pow}</span>
      ${items}${pass}
      <span class="fadd">${full ? "— room full —" : "＋ Draft into the room"}</span>
    </div>`;
  }).join("");

  // read-only preview: how the drafted foes auto-sort across the lanes (tankiest up front). No ✕ —
  // a drafted foe is committed.
  const lanes = [...Array(laneN).keys()].map((l) => {
    const inLane = s.placed.map((f, i) => ({ f, i })).filter((x) => x.f.lane === l);
    const chips = inLane.map(({ f }) =>
      `<span class="foe-chip greedy">${iconImg(f.bodyKey)} ${f.name} <b>⚖${f.ante ?? ""}</b></span>`
    ).join("") || `<span class="lane-empty">— empty —</span>`;
    return `<div class="stock-lane"><div class="stock-lane-h">${laneLabel(l, laneN)}</div>${chips}</div>`;
  }).join("");

  const meter = `<span class="${have >= need ? "ante-ok" : "ante-no"}">⚖ ${have} / ${need}</span>`;
  const df = (s.picksRequired ?? 1) === 2 ? `<b class="ante-over">★ DOUBLE FEATURE — double the ante</b> · ` : "";
  ov.classList.remove("hidden");
  paintOverlay(ov, "stock", `<div class="draft-card stock-wide">
    <h2>Draft the room — Floor ${state.floor}</h2>
    <p class="draft-sub">${df}Draft foes until the ante is met: ${meter} — <b>no take-backs</b>.</p>
    <p class="draft-sub">🎲 Rolls show ⚖${s.anteMin ?? 2}–${s.anteCap ?? 5}
      <button class="lane-btn" data-upante="1" title="Raise BOTH ends of the roll window for the REST OF THE RUN — it never goes back down.">♠ Up the ante → ⚖${(s.anteMin ?? 2) + (s.anteStep ?? 3)}–${(s.anteCap ?? 5) + (s.anteStep ?? 3)}</button></p>
    <div class="foe-palette">${palette}</div>
    <div class="stock-lanes">${lanes}</div>
    <button class="stock-begin" ${s.canBegin ? "" : "disabled"}>${s.canBegin ? "Begin combat ▶" : `Draft ⚖${remaining} more to begin`}</button>
  </div>`);
  const rerender = () => { _stockSig = ""; renderStock(); };
  ov.querySelectorAll("[data-add]").forEach((b) =>
    b.onclick = () => { send({ type: "stockAdd", idx: +b.dataset.add }); rerender(); });
  ov.querySelector(".stock-begin").onclick = () => send({ type: "stockBegin" });
  const ua = ov.querySelector("[data-upante]");
  if (ua) ua.onclick = () => send({ type: "upAnte" });
}

// The DRAFT WHEEL: a shared set of low body+3-item bundles; lock one EXCLUSIVELY. The chosen
// body is your chassis (HP/affinity/tempo); the 3 items are your starter kit.
function renderDraft() {
  const ov = $("draftOverlay");
  const d = state.draft;
  const bodies = state.bodies || {};
  const wheel = d.wheel || [];
  const picks = d.picks || [];
  // YOUR squad — every body this seat owns (primary first). You draft a body + kit for EACH.
  const squad = (state.players || []).filter(isMine)
    .sort((a, b) => (a.id === you ? -1 : b.id === you ? 1 : (a.id < b.id ? -1 : 1)));
  const draftedOf = (id) => picks.find((p) => p.id === id)?.drafted ?? false;
  // which body you're choosing for right now (falls back to your primary)
  if (!squad.some((s) => s.id === activeId)) activeId = you;
  const activeDraftId = activeId;
  const mineIds = new Set(squad.map((s) => s.id));

  const sig = JSON.stringify([wheel.map((w) => [w.id, w.lockedBy]), activeDraftId, squad.map((s) => [s.id, draftedOf(s.id), s.bodyKey]),
    d.hold, picks.map((p) => [p.id, p.drafted])]);   // co-op hold + ALLY draft states repaint too (owner 2026-07-06)
  if (sig === _draftSig) return;
  _draftSig = sig;

  const cards = wheel.map((w) => {
    const lockedByActive = w.lockedBy === activeDraftId;
    const lockedByMine = w.lockedBy && mineIds.has(w.lockedBy) && !lockedByActive;   // another of MY bodies took it
    const lockedByOther = w.lockedBy && !mineIds.has(w.lockedBy);                     // a true ally (multiplayer)
    const whoMine = lockedByMine ? (squad.find((s) => s.id === w.lockedBy)?.name || "your other body") : null;
    const owner = lockedByOther ? (picks.find((p) => p.id === w.lockedBy)?.name || "ally") : null;
    // STARTER DECK = 5 pairs (owner 2026-07-01): group the 10 cards to distinct entries with a ×2
    // badge. Each entry is a data-ct chip — tap/hover reads the card's full text (the inline text
    // is hidden on touch, where there's no room and no hover).
    const kg = new Map();
    for (const it of w.items) { const g = kg.get(it.key) ?? { ...it, count: 0 }; g.count++; kg.set(it.key, g); }
    const items = [...kg.values()].map((it) =>
      `<li class="kit-card" data-ct-name="${escAttr(it.name)}" data-ct-cost="${it.cost ?? ""}" data-ct-text="${escAttr(it.text || "")}">
        <b>${it.name}</b>${it.count > 1 ? `<span class="kit-x">×${it.count}</span>` : ""}<span class="kt-text"> — ${it.text}</span></li>`).join("");
    const tag = lockedByActive ? " ✓ (this body)" : whoMine ? " — " + whoMine : owner ? " — " + owner : "";
    const disabled = lockedByMine || lockedByOther;                                   // exclusive across the whole table
    return `<button class="class-opt${lockedByActive ? " taken" : ""}${disabled ? " locked-other" : ""}" data-bundle="${w.id}" ${disabled ? "disabled" : ""}>
      <span class="cn" style="color:${w.color}">${iconImg(w.bodyKey)} ${w.name}${tag}</span>
      <span class="cstat">❤ ${w.maxHp} HP&nbsp;·&nbsp;you act only through items${w.passive ? " · ✦ " + w.passive : ""}</span>
      <ul class="ckit">${items}</ul>
    </button>`;
  }).join("");

  // the per-body selector — a little button per body, highlighted for the one you're picking for
  const slots = squad.map((s) => {
    const done = draftedOf(s.id), isActive = s.id === activeDraftId;
    const who = s.id === you ? "You" : s.name;
    const label = done ? (bodies[s.bodyKey]?.name || s.bodyKey) : "— choose —";
    const style = `padding:7px 11px;margin:3px;border-radius:9px;cursor:pointer;min-width:104px;`
      + `display:inline-flex;flex-direction:column;align-items:center;gap:2px;`
      + `border:2px solid ${isActive ? "#e6c34a" : done ? "#3f7a55" : "#2a2f3a"};`
      + `background:${isActive ? "#2a2616" : done ? "#16241a" : "#171a21"};color:#dfe7f0;`;
    return `<button class="km-body-slot" data-slot="${s.id}" style="${style}">
      <span style="font-size:11px;opacity:.8">${who}${done ? " ✓" : ""}</span>
      <span style="font-weight:bold;font-size:13px">${label}</span>
    </button>`;
  }).join("");

  const allDone = squad.every((s) => draftedOf(s.id));
  const active = squad.find((s) => s.id === activeDraftId);
  const activeName = active ? (active.id === you ? "your main body" : active.name) : "your body";
  // CO-OP HOLD (owner 2026-07-06): every seat drafted a fresh run → the engine WAITS for ▶ so
  // late friends can still join and pick. Solo never holds (d.hold is false → old instant start).
  const draftedN = picks.filter((p) => p.drafted).length;
  const statusLine = d.hold
    ? `✓ everyone in the room has picked (${draftedN}/${picks.length}). Friends can still join with the room code — start when you're ALL in:`
    : allDone
      ? (picks.length > 1 ? `✓ your picks are locked — waiting on allies (${draftedN}/${picks.length} picked)…` : "✓ all bodies picked — starting the run…")
      : `Now choosing for <b style="color:#e6c34a">${activeName}</b>:`;

  ov.classList.remove("hidden");
  paintOverlay(ov, "draft", `<div class="draft-card draft-wide">
    <h2>Draft your squad</h2>
    <p class="draft-sub">Pick a body + starter deck (5 cards ×2 copies) for EACH of your bodies — click a slot to choose for it. Tap a card to read it.</p>
    <div class="draft-status" style="flex-wrap:wrap;justify-content:center">${slots}</div>
    <p class="draft-sub" style="margin-top:6px">${statusLine}</p>
    ${d.hold ? `<p style="text-align:center;margin:4px 0 10px"><button class="km-lvl-btn shop-confirm" data-beginrun="1" style="font-size:16px;padding:10px 22px">▶ Start run — ${picks.length} player${picks.length === 1 ? "" : "s"} in</button></p>` : ""}
    <div class="class-grid">${cards}</div>
  </div>`);
  ov.querySelectorAll("[data-beginrun]").forEach((b) => b.onclick = () => send({ type: "beginRun" }));

  ov.querySelectorAll("[data-slot]").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.slot;
      if (id === activeId) return;
      activeId = id;
      send({ type: "possess", id });   // route my next draftPick to this body
      _draftSig = null; renderDraft();
    };
  });
  ov.querySelectorAll("[data-bundle]").forEach((b) => {
    b.onclick = () => {
      send({ type: "possess", id: activeId });                 // make sure the pick lands on the chosen body
      send({ type: "draftPick", bundle: b.dataset.bundle });
      const next = squad.find((s) => s.id !== activeId && !draftedOf(s.id));  // flow to the next un-picked body
      if (next) { activeId = next.id; send({ type: "possess", id: next.id }); }
      _draftSig = null;
    };
  });
}

// THE HAND + MOXIE METER (card/moxie rewrite). The hotbar strip is now your HAND: up to 5 face-up
// cards you tap/click (or 1–9) to play, each gated by its ⚡ moxie cost. A meter across the top shows
// your moxie (fills 1/sec, caps 10) and your draw-pile size. Unaffordable cards dim.
function drawHotbar(me) {
  const hand = me?.hand ?? [];
  const moxie = me?.moxie ?? 0, moxMax = me?.moxieMax ?? 10;
  // ── moxie meter (top strip of the hotbar band) ──
  const mY = HOTBAR_Y + 2, mH = 17;
  ctx.fillStyle = "#0c0f15"; roundRect(6, mY, W - 12, mH, 5); ctx.fill();
  ctx.font = "bold 13px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  // MOBILE clutter cut: drop the "MOXIE" word (the gold pip track + "n/10" already read as the meter)
  // and slide the pips to the left edge so the bigger phone meter isn't crowded.
  if (!IS_TOUCH) ctx.fillStyle = "#e6c34a", ctx.fillText("MOXIE", 14, mY + mH / 2 + 1);
  const pipR = 5, pipGap = 5, px0 = IS_TOUCH ? 16 : 66;
  for (let i = 0; i < moxMax; i++) {
    const cx = px0 + i * (pipR * 2 + pipGap) + pipR;
    ctx.beginPath(); ctx.arc(cx, mY + mH / 2, pipR, 0, Math.PI * 2);
    ctx.fillStyle = i < moxie ? "#e6c34a" : "#23282f"; ctx.fill();
    if (i < moxie) { ctx.strokeStyle = "#fff4c0"; ctx.lineWidth = 0.75; ctx.stroke(); }
  }
  ctx.fillStyle = "#cfd8e2"; ctx.textAlign = "right";
  ctx.fillText(`${moxie}/${moxMax}  ·  🂠 ${me?.deckCount ?? 0} · 🗑 ${me?.discCount ?? 0}`, W - 14, mY + mH / 2 + 1);  // tap the counts → deck peek
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
    const c = hand[k], bx = k * slotW + pad, by = top, bw = slotW - pad * 2, bh = cardH;
    const col = c.color || "#6a7384", aff = c.affordable !== false;
    // unaffordable floor 0.5 → 0.65: you still need to READ the card you're banking moxie toward
    // (at 0.5 + dim text it vanished on a dark screen at night — owner 2026-06-24)
    ctx.globalAlpha = aff ? 1 : 0.65;
    ctx.fillStyle = "#171a21"; roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.save(); roundRect(bx, by, bw, bh, 8); ctx.clip();
    if (aff) { ctx.fillStyle = col + "22"; ctx.fillRect(bx, by, bw, bh); }
    ctx.fillStyle = col; ctx.fillRect(bx, by + bh - 4, bw, 4);           // school-color identity strip
    ctx.restore();
    ctx.lineWidth = 2; ctx.strokeStyle = aff ? "#e6c34a" : "#2a2f3a"; roundRect(bx, by, bw, bh, 8); ctx.stroke();
    // ⚡cost (top-left) + 🎯 ranged marker (top-right)
    ctx.fillStyle = aff ? "#e6c34a" : "#7c8696"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.font = "bold 18px ui-monospace, monospace"; ctx.fillText(`⚡${c.cost}`, bx + 6, by + 5);
    // VALUE (top-right) — the resource indicator that replaces gold (owner 2026-06-24); 🎯 tucks to its left
    let trx = bx + bw - 5;
    if (c.value != null) {
      ctx.fillStyle = aff ? "#b9a6e0" : "#8a82a0"; ctx.textAlign = "right"; ctx.font = "bold 15px ui-monospace, monospace";
      const vtxt = `◈${c.value}`; ctx.fillText(vtxt, trx, by + 5); trx -= ctx.measureText(vtxt).width + 6;
    }
    // (the scaling glyph now rides the damage number below — no separate corner kind-icon)
    // name (upper) + the live damage label (number + scaling glyph) + play hint (bottom)
    // name — auto-fit so a long card ("Repeating Crossbow", "Liquid Metal King Slime Crown") never
    // spills the slot; shrinks then ellipsizes inside the card width (owner 2026-06-25 overflow sweep).
    ctx.fillStyle = aff ? "#fff" : "#9aa3b0";
    fitText(c.name, bx + bw / 2, by + bh * 0.34, bw - 12, 17, 10, "center", "middle");
    { const lbl = c.dmgNow || c.dmg; if (lbl) {   // LIVE damage (base + your current bonus); GOLD when boosted above base
      ctx.font = "bold 22px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = !aff ? "#7c8696" : c.boosted ? "#ffd24a" : "#dfe7f0";
      ctx.fillText(lbl, bx + bw / 2, by + bh * 0.63);
    } }
    ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.font = "bold 13px ui-monospace, monospace";
    ctx.fillStyle = aff ? "#bfe8c8" : "#9a6a6a";
    ctx.fillText(aff ? "▶ play" : `need ⚡${c.cost}`, bx + bw / 2, by + bh - 5);
    ctx.globalAlpha = 1;
    if (mouse.x >= bx && mouse.x <= bx + bw && mouse.y >= by && mouse.y <= by + bh) hovered = c;
  }
  if (_handTip && (Date.now() > _handTip.until || !hand[_handTip.k])) _handTip = null;   // expired / stale slot
  if (hovered) drawTooltip(hovered);
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
  ctx.font = "12px ui-monospace, monospace";
  const lines = wrapText(`${item.name} — ${item.text}`, 46);
  const w = Math.min(W - 20, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20);
  const h = lines.length * 16 + 14;
  const x = Math.min(Math.max(10, anchorX - w / 2), W - w - 10);
  const y = HOTBAR_Y - h - 6;
  ctx.fillStyle = "#000e"; roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = "#e6c34a"; ctx.lineWidth = 1; roundRect(x, y, w, h, 8); ctx.stroke();
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  lines.forEach((l, i) => drawColoredText(l, x + 10, y + 8 + i * 16));
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
  const s = Math.max(1, Math.min(1.6, h / 40));
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
  ctx.lineWidth = e.boss ? 3 : targeted ? 2.5 : 1.5;
  ctx.strokeStyle = charging ? `rgba(255,${Math.round(60 + 40 * throb)},60,1)`
    : targeted ? "#3df" : e.boss ? "#ffcf4a" : frac > 0.75 ? "#f55" : frac > 0.45 ? "#fc6" : (b.color || "#333");
  roundRect(x, y, w, h, 8); ctx.stroke();
  // icon (art with emoji fallback), vertically centered
  const iconSz = Math.min(Math.round(26 * s), h - 8);
  const ix = x + 9, iy = y + h / 2;
  const spr = foeSprite(e.bodyKey);
  if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, ix, iy - iconSz / 2, iconSz, iconSz);
  else { ctx.font = `${iconSz - 5}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(iconFor(e.bodyKey), ix + iconSz / 2, iy); }
  // RIGHT: the front cast chip (next card + live moxie/cost fill). Reserve its width first.
  const chipW = Math.min(Math.round(154 * s), Math.max(90, Math.round(w * 0.44)));
  const chipX = x + w - chipW - 7, chipH = Math.min(Math.round(18 * s), h - 10), chipY = y + (h - chipH) / 2;
  // name width reserves the 🎯/♛ marker's corner when one shows (the scaled-up marker used to land on the name's tail)
  const tx = ix + iconSz + 7, blockW = chipX - tx - 6 - ((e.boss || targeted) ? Math.round(18 * s) : 0);
  // name (top line) — the "as much info as possible" without spilling into the chip
  ctx.fillStyle = "#f4f5f7";
  fitText(e.name || b.name || e.bodyKey, tx, y + Math.round(4 * s), blockW, Math.round((h >= 34 ? 13 : 12) * s), 10);
  // stat line (bottom): ❤HP/max · 🛡+shield · ⚡moxie — its CURRENT moxie, beside its HP, at all times
  ctx.font = `bold ${Math.round((h >= 30 ? 11 : 10) * s)}px ui-monospace, monospace`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  let sx = tx; const ly = y + h - Math.round(6 * s);
  ctx.fillStyle = "#9bf09b"; const hpL = `❤${e.hp}/${e.maxHp}`; ctx.fillText(hpL, sx, ly); sx += ctx.measureText(hpL).width + 7;
  if (e.shield > 0) { ctx.fillStyle = "#7fd6ff"; const shL = `🛡+${e.shield}`; ctx.fillText(shL, sx, ly); sx += ctx.measureText(shL).width + 7; }
  ctx.fillStyle = "#e6c34a"; ctx.fillText(`⚡${e.moxie ?? 0}/${e.moxieMax ?? 10}`, sx, ly);
  // target / boss marker, tucked top-right of the text block (clear of the chip)
  if (e.boss || targeted) { ctx.font = `${Math.round(13 * s)}px serif`; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText(targeted ? "🎯" : "♛", chipX - 3, y + 3); }
  // the chip: FRONT cast card (drawFoeQueue n=1 shows ⚡moxie/cost name −dmg, filled by castFrac), or a
  // reactive / no-attack note when the foe runs no cast queue (so moxie/HP still read off the stat line)
  if (e.queue && e.queue.length) {
    drawFoeQueue(chipX, chipY, chipW, chipH, e, true, 1, 0);
  } else {
    ctx.fillStyle = "#0a0d12"; roundRect(chipX, chipY, chipW, chipH, 4); ctx.fill();
    ctx.strokeStyle = "#ffffff22"; ctx.lineWidth = 1; roundRect(chipX + 0.5, chipY + 0.5, chipW - 1, chipH - 1, 4); ctx.stroke();
    ctx.fillStyle = "#a6afbd"; ctx.font = `bold ${Math.round(10 * s)}px ui-monospace, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(e.reactive ? "⚡ strikes back" : "— no attack —", chipX + chipW / 2, chipY + chipH / 2);
  }
}

// FOE CAST QUEUE (card/moxie): up to `n` upcoming cards, front-first, STACKED VERTICALLY (owner
// 2026-06-24). The front chip fills by moxie/cost (`castFrac`) — "this foe is building moxie to cast
// this"; the rest wait dim. Tinted by each card's school color. Full-width rows leave room for the
// card NAME alongside its ⚡cost. The full deck still shows on hover (drawFoeInspect).
function drawFoeQueue(x, y, w, h, e, big, n = 3, gap = 3) {
  const q = (e.queue || []).slice(0, n);
  if (!q.length) return;
  // The abstract ▸/▸▸/≣ target glyph is GONE (owner 2026-06-27) — WHO a foe hits is now telegraphed
  // by a portrait circle drawn ON the targeted player (see the telegraph pass in render()). The queue
  // card keeps only the TOTAL damage (−N, per-hit × count) so the number can never lie.
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
      const pre = `${front ? `⚡${e.moxie ?? 0}/${c.cost}` : `⚡${c.cost}`} `;
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

// ACTIVE-EFFECT chips (owner 2026-06-24): a left-to-right row of small icons, each ringed by a
// countdown arc when the effect is timed (≤60s) or a steady ring when it lasts the whole fight.
// Pushes a hitbox per chip so drawEffectTooltip can label it on hover. Used on foe cards + players.
function drawEffectChips(x, cy, effs, big) {
  if (!effs?.length) return;
  const r = (big ? 8 : 6) + (IS_TOUCH ? 2 : 0), gap = big ? 6 : 4, step = r * 2 + gap;  // touch: bigger, readable chips
  effs.slice(0, 8).forEach((eff, i) => {
    const ccx = x + r + i * step;
    const timed = eff.left != null && eff.dur && eff.dur <= 600;   // ≤60s reads as a real countdown
    ctx.beginPath(); ctx.arc(ccx, cy, r, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = "#0a0d12"; ctx.stroke(); // track
    if (timed) {
      const frac = Math.max(0, Math.min(1, eff.left / eff.dur));
      ctx.beginPath(); ctx.arc(ccx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.lineWidth = 2; ctx.strokeStyle = "#ffcf4a"; ctx.stroke();      // draining amber arc
    } else {
      ctx.beginPath(); ctx.arc(ccx, cy, r, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = "#6a86b0"; ctx.stroke(); // steady (this fight)
    }
    ctx.font = `${Math.round(r * 1.5)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(eff.icon, ccx, cy + 1);
    _effectBoxes.push({ x: ccx, y: cy, r: r + (IS_TOUCH ? 8 : 2), label: eff.label, left: eff.left, dur: eff.dur, timed });  // fat-finger pad on touch
  });
}
// DECK PEEK (owner 2026-07-01): tap the hotbar's 🂠/🗑 counts to toggle a panel listing the draw
// pile, the discard, and lasting in-play cards — the phone has no side deck panel, and with
// exhaust-before-repeat the piles are real information. Names are SORTED (grouped ×N) so the
// panel never leaks the actual draw order.
function drawDeckPeek() {
  if (!_deckPeek) return;
  const me = pilot();
  if (!me || state?.phase !== "playing") return;
  const group = (pile) => { const m = {}; for (const c of pile || []) m[c.name] = (m[c.name] || 0) + 1;
    return Object.keys(m).sort().map((n) => `  · ${n}${m[n] > 1 ? ` ×${m[n]}` : ""}`); };
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
  const txt = hit.label + (hit.timed ? `  (${Math.max(0, hit.left / 10).toFixed(1)}s left)` : "  (this fight)");
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
  ctx.font = `bold ${h >= 14 ? 12 : 11}px ui-monospace, monospace`; ctx.textAlign = "left";
  const lbl = (t.label || "").slice(0, Math.floor((w - (t.dmg > 0 ? 78 : 44)) / 7.5)); // leave room for "−N · "
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
