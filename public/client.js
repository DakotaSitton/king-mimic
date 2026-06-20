// King Mimic client — thin renderer over the authoritative server snapshot.
// VERTICAL lanes: 3 columns, enemies up top charging downward, the Caravan is a bar along the
// bottom that you stand in front of. We never simulate locally — we draw the last 'state' message.

const $ = (id) => document.getElementById(id);

// layout — COLS/COLW are dynamic now (lanes = player count, 1–4); set each render from state.
// The board got a 2026-06-10 readability overhaul: bigger canvas, big labeled cards with
// on-card passive text, fat threat bars. CSS caps the canvas at 100% width for phones.
const W = 780;
let COLS = 3, COLW = W / COLS;
// Vertical bands (owner 2026-06-19 rebalance): the FRIENDLY ZONE between the foe stack and the
// caravan was cramped. The board gained +28 logical px and ALL of it went to that band — foes keep
// their room (foeBottom unchanged in absolute terms), caravan + hotbar shifted down. These are the
// single source of truth; the CSS aspect-ratio/fit reads W and H back through the --bw/--bh vars set
// just below, so changing H here never needs a matching CSS edit.
const PLAYER_Y = 472, CARAVAN_Y = 498, CARAVAN_H = 30, HOTBAR_Y = 536, HOTBAR_H = 92;
const H = HOTBAR_Y + HOTBAR_H + 6;   // 634
document.documentElement.style.setProperty("--bw", W);
document.documentElement.style.setProperty("--bh", H);

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
const DEMO_NODES = [
  { id: "n0", type: "combat", cleared: true,  x: 0.5,  y: 0.04, links: ["n1", "n2"] },
  { id: "n1", type: "combat", cleared: false, x: 0.28, y: 0.22, links: ["n3"],
    enchant: { name: "Acid Rain (heavy)", text: "Every 5s, acid hits each hero and summon for 1. The room antes +4.", baseAnte: 4 } },
  { id: "n2", type: "combat", cleared: false, x: 0.72, y: 0.22, links: ["n3"],
    enchant: { name: "Wandering Monster (6)", text: "Vengeful Vampire is already in the room (random lane). Its ⚖6 pays out with the rest.", baseAnte: 0 } },
  { id: "n3", type: "combat", cleared: false, x: 0.5,  y: 0.42, links: ["n4"] },
  { id: "n4", type: "elite",  cleared: false, x: 0.5,  y: 0.60, links: ["n5"] },
  { id: "n5", type: "combat", cleared: false, x: 0.5,  y: 0.78, links: ["n6"] },
  { id: "n6", type: "boss",   cleared: false, x: 0.5,  y: 0.95, links: [] },
];
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
function buildDemoState(kind) {
  const base = {
    type: "state", god: false, tick: 84, draft: null, laneCount: 3,
    floor: 2, enchant: { name: "Hastened", text: "Foes act 20% faster — but the loot is richer." },
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
        passive: "Heals 1 whenever it swords.", tags: ["⚡ on sword"], picks: [], targetId: "t2", kitSlots: 4, kitSlotCost: 4, treasure: 0, unlockedTiers: [],
        kit: [{ key: "blade", name: "Blade", text: "Deal sword + 1 to the front foe.", value: 1 }, { key: "fire", name: "Fire", text: "Deal staff + 3 to your aimed foe.", value: 1 }, { key: "heal", name: "Heal", text: "Heal staff + 2.", value: 1 }],
        inv: [_inv("blade", 20), _inv("fire", 16), _inv("heal", 8), _inv("summonRat", 30)], summonSide: "front" },
      { id: "p2", name: "Mara", lane: 2, bodyKey: "royalRat", hp: 5, maxHp: 6, alive: true, picks: [], inv: [], treasure: 9, kit: [{ key: "bow", name: "Bow", text: "Deal sword + 2 to your aimed foe.", value: 1 }] },
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
    base.map = { nodes: DEMO_NODES, currentId: "n0", levelComplete: false, bossName: "Hyper-Inflation Hydra" };
    base.lanes = [{ shield: 0, enemies: [] }, { shield: 0, enemies: [] }, { shield: 0, enemies: [] }];
    base.players[0].treasure = 14;
    base.roomValue = 6;   // V mirrored to every wallet on this clear
    base.trade = { offers: [{ id: "of1", from: "p2", to: "me", fromName: "Mara", toName: "Hero",
      give: "gavel", giveName: "Gavel", giveVal: 3, want: "sword", wantName: "Sword", wantVal: 1 }] };
    base.loot = { cards: [
      { key: "fire", name: "Fire", text: "Deal 6 to your targeted foe.", cd: 70, value: 3 },
      { key: "lightning", name: "Lightning", text: "Deal 2 to every foe in your target's lane.", cd: 40, value: 2 },
      { key: "bow", name: "Bow", text: "Deal 3 to your targeted foe.", cd: 30, value: 1 },
    ] };
  } else if (kind === "shop") {
    base.phase = "shop";
    base.players[0].treasure = 22;
    base.lanes = [{ shield: 0, enemies: [] }, { shield: 0, enemies: [] }, { shield: 0, enemies: [] }];
    base.map = { nodes: DEMO_NODES.map((n) => n.id === "n3" ? { ...n, type: "shop" } : n), currentId: "n3", levelComplete: false };
    base.shop = { rerollCost: 3, wares: [
      { key: "gavel", name: "Gavel", text: "Deal 7 (+Phys) to the front foe.", cd: 80, cost: 9 },
      { key: "fire", name: "Fire", text: "Deal 6 (+Mag) to your targeted foe.", cd: 70, cost: 9 },
      { key: "shield", name: "Shield", text: "Block 4 incoming damage in your lane.", cd: 45, cost: 3 },
      { key: "cold", name: "Cold", text: "Deal 1 (+Mag) and delay its next attack by 3.0s.", cd: 30, cost: 3 },
      { key: "bomb", name: "Bomb", text: "Once per fight: deal 5 (+Phys) to every foe in your target's lane.", cd: 20, cost: 6 },
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
      kitSlots: 3, treasure: 0, unlockedTiers: [],
      inv: i === 0 ? [_inv("fire", 70), _inv("lightning", 25), _inv("bow", 12)] : [],
    }));
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
      { id: "me", name: "Hero", lane: 0, depth: 0, bodyKey: "killionaire", hp: 9, maxHp: 13, alive: true, phys: 4, targetId: "t1", kitSlots: 3, treasure: 0, inv: [_inv("fire", 70), _inv("lightning", 25), _inv("bow", 12)] },
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
        targetId: "B1", kitSlots: 3, treasure: 4, unlockedTiers: [],
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
        targetId: "B1", kitSlots: 3, treasure: 0, unlockedTiers: [],
        inv: [_inv("blade", 20), _inv("fire", 45), _inv("heal", 10)] },
      { id: "p2", name: "Mara", lane: 1, depth: 0, bodyKey: "pixie", hp: 5, maxHp: 7, alive: true, inv: [] },
    ];
  } else if (kind === "solo") {
    // solo = ONE lane (lanes = player count). Verifies the N-column renderer at N=1.
    base.phase = "playing";
    base.laneCount = 1;
    base.caravan = { hp: 16, max: 20 };
    base.lanes = [{ shield: 2, enemies: [
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
  // a broken fixture should SAY so on the shot, not silently fall back to the lobby
  try { state = buildDemoState(_demo); render(); }
  catch (err) {
    ctx.fillStyle = "#f66"; ctx.font = "12px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    String(err.stack || err).split("\n").forEach((ln, i) => ctx.fillText(ln.slice(0, 110), 8, 8 + i * 14));
  }
});
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
    if (n >= 1 && n <= 9) { send({ type: "use", slot: n - 1 }); e.preventDefault(); }
  }
});

// ---- touch controls --------------------------------------------------------
// Phones get a floating d-pad + action buttons (see #touchHud in index.html) that
// send the SAME messages the keyboard sends — the server can't tell them apart.
// Gated on a coarse primary pointer so desktop never changes; ?touch=1 forces it
// (screenshots, devtools device mode). Item use on touch = tapping the hotbar card.
const IS_TOUCH = new URLSearchParams(location.search).has("touch") || matchMedia("(pointer: coarse)").matches;
if (IS_TOUCH) {
  document.body.classList.add("touch");
  $("help").innerHTML = `◀ ▶ change lane &nbsp;·&nbsp; ▲ ▼ step forward / back past teammates and your summons (the front of the line blocks) &nbsp;·&nbsp; tap one of YOUR bodies to pilot it &nbsp;·&nbsp; 🎯 arms a one-shot target pick &nbsp;·&nbsp; 🔁 cycle which body you pilot &nbsp;·&nbsp; tap an item card to use it &nbsp;·&nbsp; 🎭 swap body`;
  const TK = {
    laneUp: { type: "lane", dir: "up" }, laneDown: { type: "lane", dir: "down" },
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
let heroBoxes = []; // filled each render: { x, y, r, id } for click-to-ALLY-target (heals)
// map a client point to LOGICAL board coords (0..W, 0..H) — independent of backing-store/DPR
const toCanvas = (e) => {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
};
cv.addEventListener("mousemove", (e) => { const p = toCanvas(e); mouse.x = p.x; mouse.y = p.y; render(); });
cv.addEventListener("mouseleave", () => { mouse.x = mouse.y = -1; render(); });
// --- stock-screen hover card: full body + loadout inspect for any placed foe chip -------
// One floating div, event-delegated (the chips are rebuilt every snapshot, so per-chip
// listeners would be lost); content is read from the LATEST snapshot at hover time.
const foeTip = document.createElement("div");
foeTip.id = "kmTip"; foeTip.className = "hidden";
document.body.appendChild(foeTip);
const escTip = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
function foeTipHtml(f) {
  const gear = (f.gear ?? []).map((g) => (typeof g === "string" ? { name: g, text: "" } : g));
  return `<b class="tip-name">${escTip(f.name)}</b>
    <div class="tip-stat">❤${f.maxHp ?? "?"}${(f.phys ?? 0) > 0 ? ` · ⚔${f.phys}` : ""}${(f.mag ?? 0) > 0 ? ` · ✨${f.mag}` : ""}${f.bodyAnte ? ` · 💰${f.bodyAnte} body` : ""}</div>
    ${f.passive ? `<div class="tip-pass">✦ ${escTip(f.passive)}</div>` : ""}
    ${gear.map((g) => `<div class="tip-item"><b>◆ ${escTip(g.name)}</b>${g.text ? `<div>${escTip(g.text)}</div>` : ""}</div>`).join("")
      || `<div class="tip-item">— no items (body only) —</div>`}`;
}
document.addEventListener("mouseover", (e) => {
  const chip = e.target.closest?.("[data-tipfoe]");
  const f = chip ? state?.stock?.placed?.[+chip.dataset.tipfoe] : null;
  if (!f) { foeTip.classList.add("hidden"); return; }
  foeTip.innerHTML = foeTipHtml(f);
  foeTip.classList.remove("hidden");
  const r = chip.getBoundingClientRect();
  foeTip.style.left = Math.max(6, Math.min(window.innerWidth - 250, r.left)) + "px";
  foeTip.style.top = Math.min(window.innerHeight - foeTip.offsetHeight - 6, r.bottom + 6) + "px";
});

// Board clicks (SQUAD model). DEFAULT = POSSESS: clicking one of YOUR squad bodies
// re-points the HUD/keys to it and tells the server to route your input there. Targeting
// is no longer a plain click — it moved under the 🎯 Target toggle (one-shot, below):
// when ARMED, the next click instead sets your target (foe → {target}, ally/own body →
// {allyTarget}) and disarms. The two never overlap, so a stray click can't mis-aim.
cv.addEventListener("click", (e) => {
  const p = toCanvas(e);
  // touch only: the hotbar cards double as the item buttons (no number keys on a
  // phone). Same geometry drawHotbar uses; desktop keeps hotbar clicks inert.
  // Routes to whatever body you're piloting (server obeys possess; the hotbar drawn = pilot()).
  if (IS_TOUCH && p.y >= HOTBAR_Y && state) {
    const inv = pilot()?.inv ?? [];
    const k = Math.floor(p.x / (W / Math.max(inv.length, 1)));
    if (k >= 0 && k < inv.length) send({ type: "use", slot: k });
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

const colCenter = (i) => i * COLW + COLW / 2;

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
  paidPiper: "🎺", centaur: "🐴", mouse: "🐭",
  largeRat: "🐹", totem: "🪵", flag: "🚩", knight: "🏇",
  // BOSS_SPEC_V1: the four floor bosses + their summons
  hydra: "🐉", litigationLich: "⚖️", djinn: "🧞", kraken: "🦑", kingMimic: "👑",
  hydraHead: "🐍", boneWizard: "💀", tentacle: "🐙", itemEntity: "🪄",
};
// Bodies are flat now (bare family keys); the trailing-U/R strip is a harmless legacy guard.
const iconFor = (k) => FOE_ICON[k] || FOE_ICON[(k || "").replace(/[UR]$/, "")] || "❔";

// Drawn foe art, lazily loaded from /foes/<bodyKey>.svg (generated by tools/generate-foe-art.js).
// Falls back to the emoji above until the image is ready.
const _foeSprites = {};
function foeSprite(key) {
  // bodies are flat now — bare family keys map straight to their art (legacy U/R strip kept inert)
  if (!(key in _foeSprites)) { const img = new Image(); img.src = `/foes/${(key || "").replace(/[UR]$/, "")}.svg`; _foeSprites[key] = img; }
  return _foeSprites[key];
}

// The summon-placement toggle: two big buttons, shown while your kit holds a live summon item.
// Visible in SETUP too (owner 2026-06-19) so you can pre-set FRONT/BEHIND before the fight, same
// as the fire-mode toggle. The active side is server state (player.summonSide).
function updateSummonSide() {
  const el = $("summonSide"); if (!el) return;
  const me = pilot();
  const show = (state?.phase === "playing" || state?.phase === "setup") && me?.alive !== false &&
    (me?.bodySummons ||                                  // worn summoner body (Royal Rat & kin)
     (me?.inv ?? []).some((iv) => iv.summons && !iv.spent && !iv.stolen));
  el.classList.toggle("hidden", !show);
  if (!show) return;
  const side = me.summonSide ?? "front";
  const f = $("ssFront"), b = $("ssBack");
  f.classList.toggle("on", side !== "back");
  b.classList.toggle("on", side === "back");
  f.onclick = () => send({ type: "summonSide", side: "front" });
  b.onclick = () => send({ type: "summonSide", side: "back" });
}

// The fire-mode toggle (owner 2026-06-12 "tired of clicking"): ⚡ AUTO fires ready DAMAGING
// items by itself; heals/shields/summons/one-shots stay manual. Sticky server state
// (player.autoFire) — same sticky-mode contract as the summon toggle, no per-press questions.
function updateFireMode() {
  const el = $("fireMode"); if (!el) return;
  const me = pilot();
  const show = (state?.phase === "playing" || state?.phase === "setup") && me?.alive !== false; // setup too, so you can pre-set

  el.classList.toggle("hidden", !show);
  if (!show) return;
  const b = $("fmToggle");                                  // ONE button now (saves space) — flips the piloted body
  b.classList.toggle("on", !!me.autoFire);
  b.textContent = me.autoFire ? "⚡ AUTO — tap for manual" : "✋ MANUAL — tap for auto";
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
  const sig = JSON.stringify([squad.map((p) => [p.id, p.hp, p.maxHp, p.bodyKey, p.autoFire, p.alive]), activeId]);
  if (sig === _squadBarSig) return;
  _squadBarSig = sig;
  const chip = (bg, brd, op) => `padding:5px 9px;margin:2px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:bold;border:2px solid ${brd};background:${bg};color:#dfe7f0;opacity:${op}`;
  const chips = squad.map((p) => {
    const active = p.id === activeId, dead = p.alive === false;
    const tag = active ? "🎮" : p.autoFire ? "⚡" : "✋";
    return `<button data-pilot="${p.id}" style="${chip(active ? "#2a2616" : dead ? "#2a1a1a" : "#171a21", active ? "#e6c34a" : "#2a2f3a", dead ? 0.5 : 1)}">${iconFor(p.bodyKey)} ${p.hp}/${p.maxHp} ${tag}</button>`;
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
  const school = me.echo === "physical" ? "⚔ sword" : "🪄 staff";
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
  const { lanes, caravan, players, bodies, phase } = state;
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
  // would sit on top of the map/shop/inventory panels and steal their taps
  if (IS_TOUCH) $("touchHud").classList.toggle("tactive", phase === "playing" || phase === "setup");
  // the map only outranks overlays on the WON screen (clicking it picks the path);
  // everywhere else overlays cover it — wide cards (draft) slide under it otherwise
  document.body.classList.toggle("map-top", phase === "won");
  updateSquadBar();
  updateSummonSide();
  updateFireMode();
  updateEchoBtn();
  updateSquadRow();
  updateTargetBtn();
  // lanes = player count (1–4): lay out N columns dynamically across the same board width.
  COLS = Math.max(1, state.laneCount || lanes.length || 3);
  COLW = W / COLS;

  // HUD
  $("caravan").textContent = `⛺ Caravan ${caravan.hp}/${caravan.max}` + (state.freeze > 0 ? ` · ⏳ TIME STOP ${(state.freeze / 10).toFixed(1)}s` : "");
  const foesLeft = lanes.reduce((n, l) => n + l.enemies.length, 0) + (state.boss ? 1 : 0);
  const rt = (state.roomTimers ?? [])[0];
  const rtTxt = rt ? ` · ${rt.kind === "acid" ? "☢" : "🐀"} ${((rt.cd * (1 - rt.frac)) / 10).toFixed(1)}s` : "";
  const ench = state.enchant ? ` · ✦ ${state.enchant.name}${rtTxt}` : "";
  $("waveInfo").textContent = {
    lobby: "Press ENTER ROOM when everyone's in",
    draft: "Choose your class…",
    stock: `Floor ${state.floor} — stock the room${ench}`,
    setup: `Floor ${state.floor} — position your party, then Begin Combat`,
    playing: `Floor ${state.floor} · Foes left: ${foesLeft}${ench}`,
    won: "Room cleared! 🎉",
    lost: "",
  }[phase] ?? "";
  const me = pilot();
  // ONE line, always: your passive/tags live on your card + the inventory panel now, so the
  // hud carries only vitals — a wrapped hud was costing the short-viewport laptops a text row.
  $("bodyInfo").textContent = me
    ? `${state.god ? "⚡GOD · " : ""}${bodies[me.bodyKey].name} ${me.hp}/${me.maxHp}${me.shield > 0 ? ` +${me.shield}🛡` : ""}${me.dr > 0 ? ` 🛡-${me.dr}` : ""} · [Q] swap (${state.unlockedBodies.length})`
    : "";
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

  sizeCanvas();                  // match backing store to the displayed size every frame (cheap: reallocs only on a real change) — robust to layout settling after join
  ctx.clearRect(0, 0, W, H);

  // lane columns
  for (let i = 0; i < COLS; i++) {
    ctx.fillStyle = i % 2 ? "#0d1118" : "#10141b";
    ctx.fillRect(i * COLW, 0, COLW, CARAVAN_Y);
    if (lanes[i].shield > 0) {                   // shield pool absorbing incoming hits
      ctx.fillStyle = "#4cf2";
      ctx.fillRect(i * COLW, PLAYER_Y - 24, COLW, CARAVAN_Y - (PLAYER_Y - 24));
      ctx.strokeStyle = "#6df"; ctx.lineWidth = 2;
      ctx.strokeRect(i * COLW + 1, PLAYER_Y - 24, COLW - 2, CARAVAN_Y - (PLAYER_Y - 24));
      ctx.fillStyle = "#bdf"; ctx.font = "bold 12px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("\u{1F6E1} " + lanes[i].shield, colCenter(i), PLAYER_Y - 14);
    }
  }
  // lane dividers
  ctx.strokeStyle = "#222833"; ctx.lineWidth = 1;
  for (let i = 1; i < COLS; i++) { ctx.beginPath(); ctx.moveTo(i * COLW, 0); ctx.lineTo(i * COLW, CARAVAN_Y); ctx.stroke(); }

  // enemies as readable cards in FORMATION: the toughest (index 0) holds the FRONT, drawn
  // largest nearest the player; deeper ranks taper smaller & dimmer (the wall + its backline).
  // Each card is a telegraph — the charge bar + border heat say WHEN it acts; an `aoe` foe
  // about to fire flashes an ALL-LANES warning (and tints the whole board).
  foeBoxes = [];
  heroBoxes = [];
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
  const HERO_STEP = 30, REAR_Y = CARAVAN_Y - 62, R_HERO = 22;
  // ONE unified friendly line per lane — heroes AND summon tokens interleaved by depth
  // (you can stand in front of your rats now). Consecutive tokens collapse into a single
  // horizontal row so a rat pack costs one slot of vertical space, not five.
  const laneStacks = [];
  for (let i = 0; i < COLS; i++) {
    const ents = [
      ...players.filter((p) => p.lane === i).map((p) => ({ kind: "hero", p, depth: p.depth ?? 0, id: p.id })),
      ...((lanes[i].allies || []).map((a, k) => ({ kind: "token", a, depth: a.depth ?? -1, id: "tk" + k }))),
    ].sort((x, y) => x.depth - y.depth || (x.id < y.id ? -1 : 1));
    const slots = [];
    for (const e of ents) {
      const last = slots[slots.length - 1];
      if (e.kind === "token" && last?.kind === "tokens") last.toks.push(e.a);
      else slots.push(e.kind === "token" ? { kind: "tokens", toks: [e.a] } : e);
    }
    const frontY = REAR_Y - Math.max(0, slots.length - 1) * HERO_STEP;
    // foes stop ABOVE the front entity's label
    const foeBottom = slots.length ? frontY - 60 : REAR_Y - 18;
    laneStacks[i] = { slots, frontY, foeBottom };
  }
  // ===== FOE CARDS (2026-06-10 redesign) — built to be read by a STRANGER, not just the
  // designer: a rarity ribbon names the tier, the header band carries the body's hue, both
  // power schools show (⚔ sword / ✨ staff), the passive is printed ON the card (wrapped),
  // and every clock is a fat labeled bar with its time-to-fire. Front two ranks get the
  // full card; the deeper backline condenses to name + HP + slim bars.
  // ribbon hue now keys off the body's GOLD value (tiers retired 2026-06-12):
  // cheap grey · mid blue · expensive gold
  const ribbonFor = (g) => (g >= 5 ? "#ffd24a" : g >= 3 ? "#4aa3ff" : g >= 1 ? "#7c8696" : "#39404d");
  for (let i = 0; i < COLS; i++) {
    let stackBottom = laneStacks[i].foeBottom;  // foes stack above this lane's friendly line
    lanes[i].enemies.forEach((e, j) => {
      const b = bodies[e.bodyKey] || {};
      // EVERY damaging clock this foe runs gets its own color-coded bar (its items + any
      // damaging passive). `threat` is the soonest of them — it drives the border heat and
      // the AoE alarm. A reactive-only foe (strikes back when hit) has no clock at all.
      const threats = (e.threats && e.threats.length) ? e.threats
        : (e.threat ? [{ frac: e.threat.frac, cd: e.threat.cd, color: "#fc6", label: "" }] : []);
      const reactive = threats.length === 0 && !(e.tags && e.tags.length);
      const frac = e.threat ? e.threat.frac : 0;
      const scale = Math.max(0.62, 1 - j * 0.12);  // taper by depth in the lane
      const dim = Math.max(0.55, 1 - j * 0.15);
      const big = j < 2;                            // front two ranks → the full card
      // width rides the lane, capped so a solo run's single lane doesn't yield door-sized cards
      const cardW = Math.min(340, Math.round((COLW - 16) * (0.85 + 0.15 * scale)));
      const x = i * COLW + (COLW - cardW) / 2;
      const innerX = x + 12, innerW = cardW - 20;   // content sits right of the rarity ribbon
      // measure the passive text FIRST (wrap to ≤2 lines) so the card can size to fit it
      ctx.font = "11px ui-monospace, monospace";
      const plines = big && e.passive ? wrapLines(e.passive, innerW - 4, 2) : [];
      const hasTags = big && e.tags && e.tags.length;
      const rowH = big ? 21 : 10, gap = big ? 4 : 2;
      const nRows = Math.max(1, threats.length);
      const headH = (big ? 46 : 30) + plines.length * 13 + (hasTags ? 15 : 0);
      const cardH = Math.round(headH + nRows * rowH + (nRows - 1) * gap + (big ? 8 : 4));
      const y = stackBottom - cardH;
      stackBottom = y - 8;                         // the next (deeper) card stacks above
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
      ctx.fillRect(x, y, cardW, big ? 44 : 30);
      // rarity ribbon down the left edge: grey common · blue uncommon · gold rare (boss = gold)
      ctx.fillStyle = e.boss ? "#ffd24a" : ribbonFor(b.gold ?? 0);
      ctx.fillRect(x, y, 6, cardH);
      ctx.restore();
      ctx.lineWidth = e.boss ? 4 : targeted ? 3 : 2;
      ctx.strokeStyle = charging ? `rgba(255,${Math.round(60 + 40 * throb)},60,1)`
        : targeted ? "#3df" : e.boss ? "#ffcf4a" : frac > 0.75 ? "#f55" : frac > 0.45 ? "#fc6" : (b.color || "#333");
      roundRect(x, y, cardW, cardH, 9); ctx.stroke();
      // icon (drawn art with emoji fallback) — anchored in the header band
      const iconSz = big ? 40 : 24;
      const iconCy = y + (big ? 24 : 16);
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
        fitText(e.name || b.name || e.bodyKey, tx, y + 7, (x + cardW - (targeted ? 26 : 8)) - tx, 15, 10);
        ctx.font = "bold 13px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        let sx = tx;
        if ((e.phys ?? 0) > 0) { ctx.fillStyle = "#ffc98a"; ctx.fillText(`⚔${e.phys}`, sx, y + 27); sx += 34; }
        if ((e.mag ?? 0) > 0)  { ctx.fillStyle = "#9b8cff"; ctx.fillText(`✨${e.mag}`, sx, y + 27); sx += 34; }
        ctx.fillStyle = "#9bf09b"; ctx.fillText(`❤${e.hp}/${e.maxHp}`, sx, y + 27);
        let badgeR = x + cardW - 7; ctx.textAlign = "right";
        if (e.shield > 0)   { ctx.fillStyle = "#7fd6ff"; ctx.fillText(`🛡+${e.shield}`, badgeR, y + 27); badgeR -= 44; }
        if (e.counters > 0) { ctx.fillStyle = "#ffd24a"; ctx.fillText(`▲${e.counters}`, badgeR, y + 27); badgeR -= 36; }
        if (e.dr > 0)       { ctx.fillStyle = "#b6a8ff"; ctx.fillText(`-${e.dr}dmg`, badgeR, y + 27); badgeR -= 44; }
        if (e.thorns > 0)   { ctx.fillStyle = "#a8d08a"; ctx.fillText(`🌵${e.thorns}`, badgeR, y + 27); }
        // the passive, in words, ON the card — no more hover-to-understand
        if (plines.length) {
          ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
          ctx.fillStyle = "#c8cdd8";
          plines.forEach((ln, li) => ctx.fillText(ln, innerX + 2, y + 46 + li * 13));
        }
        if (hasTags) {
          ctx.fillStyle = "#ffd98a"; ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
          ctx.fillText(e.tags.join("   "), innerX + 2, y + 46 + plines.length * 13 + 2);
        }
      } else {
        // condensed backline: still carries its NAME now, not just a heart
        ctx.fillStyle = "#e8eaee";
        fitText(e.name || b.name || e.bodyKey, tx, y + 4, (x + cardW - 44) - tx, 11, 9);
        ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillStyle = "#9bf09b"; ctx.fillText(`❤${e.hp}`, tx, y + 17);
        if (e.dr > 0) { ctx.fillStyle = "#b6a8ff"; ctx.fillText(`-${e.dr}`, tx + 40, y + 17); }
        ctx.textAlign = "right"; ctx.fillStyle = "#aeb6c2";
        if ((e.phys ?? 0) > 0) ctx.fillText(`⚔${e.phys}`, x + cardW - 6, y + 17);
        else if ((e.mag ?? 0) > 0) ctx.fillText(`✨${e.mag}`, x + cardW - 6, y + 17);
      }
      // the THREAT BARS — one per clock, color-coded to the item/passive, stacked at the
      // bottom; each fills toward its next hit. A reactive foe shows a flat grey track.
      let by = y + headH;
      if (reactive) {
        ctx.fillStyle = "#2a2f38"; roundRect(innerX, by, innerW, big ? 17 : 8, 4); ctx.fill();
        if (big) { ctx.fillStyle = "#8a93a3"; ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.reactive ? "⚡ strikes back when hit" : "— no attack —", x + cardW / 2, by + 9); }
      } else {
        for (const t of threats) {
          threatBar(innerX, by, innerW, big ? 17 : 8, t, big);
          by += rowH + gap;
        }
      }
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
    const { slots, frontY } = laneStacks[i];
    slots.forEach((s, si) => {
      const py = frontY + si * HERO_STEP, isFront = si === 0;
      if (s.kind === "tokens") {
        s.toks.forEach((a, j) => {
          const ax = colCenter(i) + (j - (s.toks.length - 1) / 2) * 30;
          // friendly green ring marks your side; AURA tokens (totem/flag/knight) get gold
          ctx.beginPath(); ctx.arc(ax, py, 13, 0, Math.PI * 2);
          ctx.fillStyle = "#10221a"; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = a.aura ? "#ffd24a" : "#3ec98a"; ctx.stroke();
          ctx.font = "15px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(iconFor(a.bodyKey), ax, py + 1);
          ctx.fillStyle = "#bfe8d4"; ctx.font = "bold 9px ui-monospace, monospace";
          ctx.textBaseline = "top";
          ctx.fillText(String(a.hp), ax, py + 13);
        });
        if (isFront) { ctx.font = "11px serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("🛡", i * COLW + 4, py); }
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
      if (mine) { ctx.font = "12px serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText("👑", px, py - R_HERO); }
      if (isFront) { ctx.font = "11px serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("🛡", i * COLW + 4, py); }
      // CLEAN NAMEPLATE under the mimic: a rounded chip with an HP fill behind ❤ hp/max — prettier
      // and clearer than the bare green bar, and it reads at a glance like the foe cards' stat row.
      const npW = 74, npH = 18, npX = px - npW / 2, npY = py + R_HERO + 4;
      const hpFrac = Math.max(0, p.hp / p.maxHp);
      ctx.fillStyle = "#11151d"; roundRect(npX, npY, npW, npH, 6); ctx.fill();
      ctx.save(); roundRect(npX, npY, npW, npH, 6); ctx.clip();
      ctx.fillStyle = hpFrac > 0.4 ? "#2f6b3a" : "#7a2f2f"; ctx.fillRect(npX, npY, npW * hpFrac, npH); ctx.restore();
      ctx.lineWidth = mine ? 2 : 1; ctx.strokeStyle = mine ? "#ffd24a" : "#39404d"; roundRect(npX, npY, npW, npH, 6); ctx.stroke();
      ctx.fillStyle = "#eef3f8"; ctx.font = "bold 12px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`❤ ${p.hp}/${p.maxHp}`, px, npY + npH / 2 + 0.5);
      // ONE slim body-passive line beneath the nameplate (color-coded, no ring), if any
      if (!p.offline && bts.length) bar(npX, npY + npH + 2, npW, 4, bts[0].frac || 0, bts[0].color || "#b8a3c9");
      ctx.globalAlpha = 1;
      // label: possessed body = bold gold "YOU"; an owned squad bot = its name in gold-ish
      // with an AUTO tag (it's clickable to pilot); everyone else = plain name.
      ctx.fillStyle = mine ? "#ffd24a" : owned ? "#d9c98a" : "#cfd3dc";
      ctx.font = (mine ? "bold " : "") + "11px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(mine ? "YOU" : p.name, px, py - R_HERO - 2);
      if (owned && p.alive) { ctx.fillStyle = "#caa84a"; ctx.font = "8px ui-monospace, monospace"; ctx.fillText("🎮 AUTO", px, py - R_HERO - 13); }
      if (!p.alive) { ctx.fillStyle = "#e66"; ctx.fillText("DOWN", px, py + R_HERO + 12); }
      if (p.offline) { ctx.fillStyle = "#e6a23c"; ctx.fillText("OFFLINE", px, py + R_HERO + (p.alive ? 12 : 22)); }
    });
  }

  // caravan bar (the shared thing you defend)
  ctx.fillStyle = "#1a1f29"; ctx.fillRect(0, CARAVAN_Y, W, CARAVAN_H);
  ctx.fillStyle = caravan.hp / caravan.max > 0.35 ? "#5a3" : "#c44";
  ctx.fillRect(0, CARAVAN_Y, W * Math.max(0, caravan.hp) / caravan.max, CARAVAN_H);
  ctx.fillStyle = "#fff"; ctx.font = "bold 15px ui-monospace, monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`CARAVAN  ${caravan.hp}/${caravan.max}`, W / 2, CARAVAN_Y + CARAVAN_H / 2);

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
    ctx.fillText(phase === "won" ? (state.runWon ? "👑 THE THRONE IS YOURS" : complete ? "FLOOR CLEARED — DESCEND ▶" : "ROOM CLEARED") : "THE CARAVAN FALLS", W / 2, CARAVAN_Y / 2);
  }

  // notify side panels (map.js / inventory.js). Panels get the ACTIVE body so the
  // inventory/body-swap follow possession; map.js keys off state, not the id.
  window.KM.state = state; window.KM.you = you; window.KM.activeId = activeId;
  const panelId = pilot()?.id ?? you;
  for (const cb of window.KM._cbs) { try { cb(state, panelId); } catch (e) {} }
}

// THE BOSS BANNER (BOSS_SPEC_V1) — one wide card across the top of the board: ♛ name,
// HP, the Lich's stance telegraph, and a labeled bar per mechanic clock. The caravan's
// mirror: it spans every lane because the boss does. Clickable/hoverable like a foe card.
function drawBossBanner(boss, myTarget, throb) {
  const bars = boss.threats || [];
  const bx = 6, bw = W - 12, by = 6, headH = 24, hpH = 14;
  const bh = headH + hpH + bars.length * 15 + (boss.stanceLabel ? 17 : 0) + 10;
  const targeted = boss.id === myTarget;
  ctx.fillStyle = "#151a23f0"; roundRect(bx, by, bw, bh, 10); ctx.fill();
  ctx.lineWidth = targeted ? 4 : 3;
  ctx.strokeStyle = targeted ? "#3df" : "#ffcf4a";
  roundRect(bx, by, bw, bh, 10); ctx.stroke();
  const spr = foeSprite(boss.bodyKey), iconSz = 20, ix = bx + 10;
  if (spr.complete && spr.naturalWidth) ctx.drawImage(spr, ix, by + 4, iconSz, iconSz);
  else { ctx.font = "17px serif"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(iconFor(boss.bodyKey), ix, by + 5); }
  ctx.fillStyle = "#ffd24a"; ctx.font = "bold 15px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText(`♛ ${boss.name}`, ix + iconSz + 8, by + 7);
  ctx.textAlign = "right";
  if (targeted) { ctx.font = "15px serif"; ctx.fillText("🎯", bx + bw - 8, by + 5); }
  ctx.fillStyle = "#9bf09b"; ctx.font = "bold 14px ui-monospace, monospace";
  ctx.fillText(`❤${boss.hp}/${boss.maxHp}`, bx + bw - (targeted ? 30 : 10), by + 8);
  bar(bx + 10, by + headH + 2, bw - 20, 8, boss.hp / boss.maxHp, boss.color || "#ffcf4a");
  let yy = by + headH + hpH;
  if (boss.stanceLabel) {                      // the Lich's calendar — burst the weak window
    const obj = boss.stance === "objection";
    ctx.globalAlpha = obj ? 0.7 + 0.3 * throb : 1;
    ctx.fillStyle = obj ? "#8e2f2f" : "#2e7d4f";
    roundRect(bx + 10, yy, bw - 20, 14, 4); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff"; ctx.font = "bold 11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(boss.stanceLabel, bx + bw / 2, yy + 7);
    yy += 17;
  }
  for (const t of bars) { threatBar(bx + 10, yy, bw - 20, 12, t, true); yy += 15; }
  foeBoxes.push({ x: bx, y: by, w: bw, h: bh, id: boss.id,
    e: { ...boss, atk: 0, dr: 0, gear: [], threat: null, boss: true } });
}

// Hover a foe → a small card: stats, its passive (in words), and its item.
function drawFoeInspect(bodies) {
  const hit = foeBoxes.find((b) => b.e && mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h);
  if (!hit) return;
  const e = hit.e, bd = bodies[e.bodyKey] || {};
  const lines = [e.name || bd.name || e.bodyKey];
  lines.push(`❤ ${e.hp}/${e.maxHp} HP    ⚔ ${e.atk} atk${e.dr > 0 ? `    🛡 -${e.dr} dmg` : ""}`);
  if (e.threat) lines.push(`⏱ next hit every ${(e.threat.cd / 10).toFixed(1)}s`);
  else lines.push(`⚡ reactive — only strikes when hit`);
  if (e.passive) lines.push(`✦ ${e.passive}`);
  for (const g of e.gear ?? []) { // list EVERY carried item (multiple is normal now)
    lines.push(`${g.passive ? "▣" : "◆"} ${g.name}${g.spent ? " (spent)" : g.passive ? "  ·  worn" : `  ·  ${(g.cd / 10).toFixed(1)}s cd`}`);
    if (g.text) lines.push(`   ${g.text}`);
  }
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
let _draftSig = "", _stockSig = "", _brSig = "", _shopSig = "";
let _tradeGive = null;   // the key of YOUR item currently selected to offer in a trade
const NODE_LABEL = { combat: "Fight", elite: "Elite ★", boss: "BOSS ♛", shop: "Shop 🛒" };
// Advance buttons sorted + arrowed LEFT→RIGHT to match the map drawing. The server now
// sorts links by x too, but the client re-sorts so the buttons can never lie about
// direction even against an old server snapshot.
function advBtns(nexts, attr) {
  const ns = [...nexts].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  return ns.map((n, i) => {
    const base = NODE_LABEL[n.type] || "Next";
    const lbl = ns.length === 1 ? `${base} ▶` : i === 0 ? `◀ ${base}` : i === ns.length - 1 ? `${base} ▶` : base;
    // the button carries the room's DEAL — on phones the map is often out of sight
    const deal = n.type === "boss" ? (state.map?.bossName ?? "")
               : n.enchant ? `✦ ${n.enchant.name}${n.enchant.baseAnte ? ` · antes +${n.enchant.baseAnte}` : ""}` : "";
    return `<button class="advance-btn node-${n.type}" data-${attr}="${n.id}">${lbl}${deal ? `<span class="adv-deal">${deal}</span>` : ""}</button>`;
  }).join("");
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

// Party + trading panel (out of combat). Pick one of YOUR items, then click a teammate's
// item to propose a swap — the value gap is settled in treasure (lesser-item giver pays).
function buildTradeSection() {
  // SQUAD: trade FROM the active (possessed) body — its kit is "your offer", everyone else
  // (true allies AND your own other bodies) is a trade partner. proposeTrade routes via possess,
  // so offers land as from=active body; incoming/outgoing filter on the active body's id.
  const meId = pilot()?.id ?? you;
  const others = (state.players || []).filter((p) => p.id !== meId);
  const offers = (state.trade && state.trade.offers) || [];
  if (!others.length && !offers.length) return "";   // solo: nothing to trade
  const me = state.players.find((p) => p.id === meId) || {};
  const myKit = me.kit || [];
  const giveRow = myKit.map((it) =>
    `<button class="trade-item${_tradeGive === it.key ? " sel" : ""}" data-give="${it.key}">${it.name} <b class="tre">💰${it.value ?? ""}</b></button>`).join("")
    || `<span class="lane-empty">— your kit is empty —</span>`;
  const partyRows = others.map((p) => {
    const kit = (p.kit || []).map((it) =>
      `<button class="trade-item" data-want="${it.key}" data-with="${p.id}" ${_tradeGive ? "" : "disabled"} title="${_tradeGive ? "propose swapping your " + _tradeGive + " for this" : "select one of your items first"}">${it.name} <b class="tre">💰${it.value ?? ""}</b></button>`).join("")
      || `<span class="lane-empty">— empty —</span>`;
    return `<div class="trade-party"><span class="trade-who">${iconFor(p.bodyKey)} ${p.name} <b class="tre">💰${p.treasure ?? 0}</b></span><div class="trade-kit">${kit}</div></div>`;
  }).join("");
  const incoming = offers.filter((o) => o.to === meId).map((o) =>
    `<div class="trade-offer">${o.fromName} offers <b>${o.giveName}</b> (💰${o.giveVal}) for your <b>${o.wantName}</b> (💰${o.wantVal})
      <button class="lane-btn" data-accept="${o.id}">Accept</button><button class="lane-btn" data-decline="${o.id}">✕</button></div>`).join("");
  const outgoing = offers.filter((o) => o.from === meId).map((o) =>
    `<div class="trade-offer pending">You offered <b>${o.giveName}</b> for ${o.toName}'s <b>${o.wantName}</b> — waiting…
      <button class="lane-btn" data-decline="${o.id}">Withdraw</button></div>`).join("");
  return `<div class="trade-box">
    <p class="draft-sub" style="margin-top:14px">Trade with the party — the value gap is settled in 💰 (whoever gives the lesser item pays):</p>
    <div class="trade-give-row"><span class="trade-label">Your offer:</span>${giveRow}</div>
    ${partyRows}
    ${incoming ? `<div class="trade-incoming">${incoming}</div>` : ""}
    ${outgoing ? `<div class="trade-outgoing">${outgoing}</div>` : ""}
  </div>`;
}

// Drop buttons are DANGEROUS under end-of-fight click spam: the overlay renders right
// under the player's finger (owner playtest 2026-06-12 — accidental kit drops). Two
// guards: taps in the overlay's first 600ms are swallowed, and dropping takes a second
// confirming tap (the first arms the button, disarming itself after 1.8s).
function wireDropButtons(ov) {
  const t0 = Date.now();
  ov.querySelectorAll("[data-drop]").forEach((b) => b.onclick = () => {
    if (Date.now() - t0 < 600) return;             // the fight's last frantic taps land here
    const lbl = b.querySelector(".dcd");
    if (b.dataset.armed) { send({ type: "dropItem", key: b.dataset.drop }); return; }
    b.dataset.armed = "1"; b.style.outline = "2px solid #e08a8a";
    if (lbl) lbl.textContent = "tap AGAIN to drop ✕";
    setTimeout(() => {
      delete b.dataset.armed; b.style.outline = "";
      if (lbl) lbl.textContent = "tap twice to drop ✕";
    }, 1800);
  });
}

// Wire trade buttons inside an overlay (shared by the won + shop screens).
function wireTrade(ov) {
  ov.querySelectorAll("[data-give]").forEach((b) => b.onclick = () => {
    _tradeGive = (_tradeGive === b.dataset.give) ? null : b.dataset.give; _brSig = _shopSig = ""; render();
  });
  ov.querySelectorAll("[data-want]").forEach((b) => b.onclick = () => {
    if (_tradeGive) { send({ type: "proposeTrade", to: b.dataset.with, give: _tradeGive, want: b.dataset.want }); _tradeGive = null; }
  });
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
      <span style="font-size:11px;opacity:.8">${who} · 💰${s.treasure ?? 0}</span>
      <span style="font-weight:bold;font-size:13px">${iconFor(s.bodyKey)} ${name}${extra}</span>
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

function renderOverlay() {
  const ov = $("draftOverlay");
  if (state?.phase === "draft" && state.draft) return renderDraft();
  if (state?.phase === "stock" && state.stock) return renderStock();
  if (state?.phase === "shop" && state.shop) return renderShop();
  if (state?.phase === "won") return renderBetweenRooms();
  if (!ov.classList.contains("hidden")) { ov.classList.add("hidden"); ov.innerHTML = ""; _draftSig = _stockSig = _brSig = _shopSig = ""; }
}

// The shop screen: spend shared Treasure on chosen items + kit space, then move on.
function renderShop() {
  const ov = $("draftOverlay");
  // SQUAD: the shop spends for the ACTIVE (possessed) body, not the primary seat — its wallet,
  // its kit, its buys (the server routes buyShopItem/rerollShop/buyKitSlot to whoever we possess).
  const me = pilot() || {};
  const kit = me.kit || [];
  const slots = me.kitSlots ?? 5;
  const treasure = me.treasure || 0;   // per-player wallet (mirrored income)
  const shop = state.shop;
  const map = state.map || {};
  const cur = (map.nodes || []).find((n) => n.id === map.currentId);
  const nexts = (cur?.links || []).map((id) => (map.nodes || []).find((n) => n.id === id)).filter(Boolean);
  const full = kit.length >= slots;
  const sig = JSON.stringify([shop.wares, shop.rerollCost, kit.map((k) => k.key), slots,
    me.kitSlotCost, treasure, nexts.map((n) => [n.id, n.type]), activeId,
    _tradeGive, (state.trade?.offers || []).map((o) => o.id),
    (state.players || []).map((p) => [p.id, (p.kit || []).map((k) => k.key).join(), p.treasure])]);
  if (sig === _shopSig) return;
  _shopSig = sig;
  const selector = squadSelectorHtml();

  const waresSection = shop.wares.length ? `
    <div class="draft-grid">${shop.wares.map((w) => {
      const cant = treasure < w.cost || full;
      return `<button class="draft-opt" data-buy="${w.key}" ${cant ? "disabled" : ""} title="${full ? "kit full" : "buy"}">
        <span class="dn">${w.name} <b class="tre">💰${w.cost}</b></span><span class="dt">${w.text}</span>
        <span class="dcd">${w.cd != null ? (w.cd / 10).toFixed(1) + "s cd" : ""}</span>
      </button>`;
    }).join("")}</div>` : `<p class="draft-sub">Sold out — nothing left on the shelf.</p>`;

  const slotBtn = me.kitSlotCost != null
    ? `<button class="km-tier-btn" data-buyslot="1" ${treasure < me.kitSlotCost ? "disabled" : ""}>+1 Kit Slot · 💰${me.kitSlotCost}</button>`
    : `<span class="dcd">kit space maxed</span>`;
  const kitSection = `
    <p class="draft-sub" style="margin-top:14px">Your kit (${kit.length}/${slots})${full ? ` · <span class="ante-no">full</span>` : ""} — tap an item twice to drop it &nbsp;·&nbsp; ${slotBtn} <button class="km-tier-btn" data-swapbody="1">🎭 Swap body</button></p>
    <div class="draft-grid">${kit.map((it) => `
      <button class="draft-opt kit-item" data-drop="${it.key}">
        <span class="dn">${it.name}</span><span class="dt">${it.text}</span>
        <span class="dcd">tap twice to drop ✕</span>
      </button>`).join("") || `<span class="lane-empty">— empty —</span>`}</div>`;

  const leaveSection = `<p class="draft-sub" style="margin-top:14px">Move on${showdownLine()}:</p>
    <div class="advance-row">${advBtns(nexts, "leave")}</div>`;

  ov.classList.remove("hidden");
  // Two-column body (wide screens): the shelf on the left, your kit + party trade on the right,
  // so the screen fits without scrolling. Collapses to one column on phones (see .overlay-cols).
  ov.innerHTML = `<div class="draft-card shop-wide">
    <h2>Shop 🛒 <span class="tre" style="float:right">💰 ${treasure}</span></h2>
    ${selector}
    <p class="draft-sub" style="margin-top:6px">Buy what you actually want — banked Treasure spends here.
      <button class="lane-btn" data-reroll="1" ${treasure < shop.rerollCost ? "disabled" : ""}>↻ Reroll · 💰${shop.rerollCost}</button></p>
    <div class="overlay-cols">
      <div class="ov-col">${waresSection}</div>
      <div class="ov-col">${kitSection}${buildTradeSection()}</div>
    </div>
    ${leaveSection}
  </div>`;
  ov.querySelectorAll("[data-buy]").forEach((b) => b.onclick = () => send({ type: "buyShopItem", key: b.dataset.buy }));
  wireDropButtons(ov);
  ov.querySelectorAll("[data-buyslot]").forEach((b) => b.onclick = () => send({ type: "buyKitSlot" }));
  ov.querySelectorAll("[data-reroll]").forEach((b) => b.onclick = () => send({ type: "rerollShop" }));
  ov.querySelectorAll("[data-leave]").forEach((b) => b.onclick = () => send({ type: "leaveShop", to: b.dataset.leave }));
  ov.querySelectorAll("[data-swapbody]").forEach((b) => b.onclick = () => window.KM.openBodyModal?.());
  wireSquadSelector(ov, () => { _shopSig = ""; renderShop(); });
  wireTrade(ov);
}

// The between-rooms screen: grab loot (free; whatever you leave becomes Treasure),
// spend Treasure on kit space, manage your kit, then choose the next room.
function renderBetweenRooms() {
  const ov = $("draftOverlay");
  // SQUAD: loot/kit/swap apply to the ACTIVE (possessed) body — its wallet pays for claims,
  // its kit fills, its body swaps (server routes claimLoot/dropItem/buyKitSlot/swapBody to it).
  const me = pilot() || {};
  const kit = me.kit || [];
  const slots = me.kitSlots ?? 5;
  const treasure = me.treasure || 0;   // per-player wallet (mirrored income)
  const earned = state.roomValue || 0; // V credited to EVERY player on this clear
  const loot = state.loot;
  const map = state.map || {};
  const complete = !!map.levelComplete;
  const cur = (map.nodes || []).find((n) => n.id === map.currentId);
  const nexts = complete ? [] : (cur?.links || []).map((id) => (map.nodes || []).find((n) => n.id === id)).filter(Boolean);
  const sig = JSON.stringify([loot && loot.cards.map((c) => c.key), earned, kit.map((k) => k.key),
    slots, me.kitSlotCost, treasure, nexts.map((n) => [n.id, n.type]), complete, state.runWon, state.floor, activeId,
    _tradeGive, (state.trade?.offers || []).map((o) => o.id),
    (state.players || []).map((p) => [p.id, (p.kit || []).map((k) => k.key).join(), p.treasure])]);
  if (sig === _brSig) return;
  _brSig = sig;
  const selector = squadSelectorHtml();

  const full = kit.length >= slots;
  const lootSection = loot && loot.cards.length ? `
    <p class="draft-sub" style="margin-top:6px">Spoils — a <b>shared</b> set. Claiming an item <b>costs</b> its value (the room's ante was already paid out)${full ? ` · <span class="ante-no">kit full</span>` : ""}:</p>
    <div class="draft-grid">${loot.cards.map((c) => {
      const cant = full || treasure < c.value;
      return `<button class="draft-opt" data-loot="${c.key}" ${cant ? "disabled" : ""} title="${full ? "kit full" : treasure < c.value ? "can't afford" : "claim (costs its value)"}">
        <span class="dn">＋ ${c.name} <b class="tre">💰${c.value}</b></span><span class="dt">${c.text}</span>
        <span class="dcd">${c.cd != null ? (c.cd / 10).toFixed(1) + "s cd" : ""}</span>
      </button>`;
    }).join("")}</div>` : `<p class="draft-sub" style="margin-top:6px">No loot dropped.</p>`;

  const slotBtn = me.kitSlotCost != null
    ? `<button class="km-tier-btn" data-buyslot="1" ${treasure < me.kitSlotCost ? "disabled" : ""}>+1 Kit Slot · 💰${me.kitSlotCost}</button>`
    : `<span class="dcd">kit space maxed</span>`;
  // the overlay covers the inventory panel on phones — give body swap a path of its own
  const kitSection = `
    <p class="draft-sub" style="margin-top:14px">Your kit (${kit.length}/${slots}) — tap an item twice to drop it &nbsp;·&nbsp; ${slotBtn} <button class="km-tier-btn" data-swapbody="1">🎭 Swap body</button></p>
    <div class="draft-grid">${kit.map((it) => `
      <button class="draft-opt kit-item" data-drop="${it.key}">
        <span class="dn">${it.name}</span><span class="dt">${it.text}</span>
        <span class="dcd">tap twice to drop ✕</span>
      </button>`).join("") || `<span class="lane-empty">— empty —</span>`}</div>`;

  const advanceSection = state.runWon
    ? `<button class="stock-begin" data-newrun="1">👑 NEW RUN ▶</button>`
    : complete
    ? `<button class="stock-begin" data-descend="1">Descend to ${(state.floor || 1) + 1 >= 4 ? "the THRONE ♛" : `Floor ${(state.floor || 1) + 1}`} ▶</button>`
    : `<p class="draft-sub" style="margin-top:14px">Choose the next room (left to right, as the map shows)${showdownLine()}:</p>
       <div class="advance-row">${advBtns(nexts, "advance")}</div>`;

  ov.classList.remove("hidden");
  // Two-column body (wide screens): spoils on the left, your kit + party trade on the right, so
  // the loot screen + its path buttons fit without scrolling. One column on phones (.overlay-cols).
  ov.innerHTML = `<div class="draft-card loot-wide">
    <h2>${state.runWon ? "👑 The King is dead — the throne is YOURS!" : complete ? "Boss slain! 👑" : "Room cleared! 🎉"} <span class="tre" style="float:right">💰 ${treasure}</span></h2>
    ${selector}
    <p class="draft-sub" style="margin-top:2px">${complete
      ? `Boss bounty — <b class="tre">💰${state.bossGold ?? 10}</b> each, and a shelf of RARES below. Spend it.`
      : `The foes paid their ante — <b class="tre">⚖${earned}</b> split across the party (remainder to whoever's earned least).`}</p>
    <div class="overlay-cols">
      <div class="ov-col">${lootSection}</div>
      <div class="ov-col">${kitSection}${buildTradeSection()}</div>
    </div>
    ${advanceSection}
  </div>`;
  ov.querySelectorAll("[data-loot]").forEach((b) => b.onclick = () => send({ type: "claimLoot", key: b.dataset.loot }));
  wireDropButtons(ov);
  ov.querySelectorAll("[data-buyslot]").forEach((b) => b.onclick = () => send({ type: "buyKitSlot" }));
  ov.querySelectorAll("[data-advance]").forEach((b) => b.onclick = () => send({ type: "advance", to: b.dataset.advance }));
  ov.querySelectorAll("[data-swapbody]").forEach((b) => b.onclick = () => window.KM.openBodyModal?.());
  const desc = ov.querySelector("[data-descend]");
  if (desc) desc.onclick = () => send({ type: "descend" });
  const nr = ov.querySelector("[data-newrun]");
  if (nr) nr.onclick = () => send({ type: "start" });   // runWon unlocks `start` from the won phase
  wireSquadSelector(ov, () => { _brSig = ""; renderBetweenRooms(); });
  wireTrade(ov);
}

const laneLabel = (l, n) => n <= 1 ? "Lane" :
  (n === 3 ? ["Left", "Mid", "Right"][l] : (n === 2 ? ["Left", "Right"][l] : "Lane " + (l + 1)));
function renderStock() {
  const ov = $("draftOverlay");
  const s = state.stock;
  const laneN = state.laneCount || 3;
  const sig = JSON.stringify([s.palette, s.placed, s.anteRequired, s.anteStocked, s.canBegin, s.anteCap, state.floor, state.enchant, laneN]);
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
      <span class="fn">${iconFor(o.bodyKey)} ${o.name}</span>
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
      `<span class="foe-chip greedy">${iconFor(f.bodyKey)} ${f.name} <b>⚖${f.ante ?? ""}</b></span>`
    ).join("") || `<span class="lane-empty">— empty —</span>`;
    return `<div class="stock-lane"><div class="stock-lane-h">${laneLabel(l, laneN)}</div>${chips}</div>`;
  }).join("");

  const meter = `<span class="${have >= need ? "ante-ok" : "ante-no"}">⚖ ${have} / ${need}</span>`;
  const df = (s.picksRequired ?? 1) === 2 ? `<b class="ante-over">★ DOUBLE FEATURE — double the ante</b> · ` : "";
  const ench = state.enchant ? `<p class="enchant-line">Floor ${state.floor} · ✦ <b>${state.enchant.name}</b> — ${state.enchant.text}</p>` : "";
  ov.classList.remove("hidden");
  ov.innerHTML = `<div class="draft-card stock-wide">
    <h2>Draft the room</h2>
    ${ench}
    <p class="draft-sub">${df}Draft foes until the ante is met: ${meter} — <b>no take-backs</b>.</p>
    <p class="draft-sub">🎲 Rolls show ⚖${s.anteMin ?? 2}–${s.anteCap ?? 5}
      <button class="lane-btn" data-upante="1" title="Raise BOTH ends of the roll window for the REST OF THE RUN — it never goes back down.">♠ Up the ante → ⚖${(s.anteMin ?? 2) + (s.anteStep ?? 3)}–${(s.anteCap ?? 5) + (s.anteStep ?? 3)}</button></p>
    <div class="foe-palette">${palette}</div>
    <div class="stock-lanes">${lanes}</div>
    <button class="stock-begin" ${s.canBegin ? "" : "disabled"}>${s.canBegin ? "Begin combat ▶" : `Draft ⚖${remaining} more to begin`}</button>
  </div>`;
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

  const sig = JSON.stringify([wheel.map((w) => [w.id, w.lockedBy]), activeDraftId, squad.map((s) => [s.id, draftedOf(s.id), s.bodyKey])]);
  if (sig === _draftSig) return;
  _draftSig = sig;

  const cards = wheel.map((w) => {
    const lockedByActive = w.lockedBy === activeDraftId;
    const lockedByMine = w.lockedBy && mineIds.has(w.lockedBy) && !lockedByActive;   // another of MY bodies took it
    const lockedByOther = w.lockedBy && !mineIds.has(w.lockedBy);                     // a true ally (multiplayer)
    const whoMine = lockedByMine ? (squad.find((s) => s.id === w.lockedBy)?.name || "your other body") : null;
    const owner = lockedByOther ? (picks.find((p) => p.id === w.lockedBy)?.name || "ally") : null;
    const items = w.items.map((it) => `<li><b>${it.name}</b> — ${it.text}</li>`).join("");
    const tag = lockedByActive ? " ✓ (this body)" : whoMine ? " — " + whoMine : owner ? " — " + owner : "";
    const disabled = lockedByMine || lockedByOther;                                   // exclusive across the whole table
    return `<button class="class-opt${lockedByActive ? " taken" : ""}${disabled ? " locked-other" : ""}" data-bundle="${w.id}" ${disabled ? "disabled" : ""}>
      <span class="cn" style="color:${w.color}">${iconFor(w.bodyKey)} ${w.name}${tag}</span>
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

  ov.classList.remove("hidden");
  ov.innerHTML = `<div class="draft-card draft-wide">
    <h2>Draft your squad</h2>
    <p class="draft-sub">Pick a body + 3-item kit for EACH of your bodies — click a slot to choose for it. The run starts once all are picked.</p>
    <div class="draft-status" style="flex-wrap:wrap;justify-content:center">${slots}</div>
    <p class="draft-sub" style="margin-top:6px">${allDone ? "✓ all bodies picked — starting the run…" : `Now choosing for <b style="color:#e6c34a">${activeName}</b>:`}</p>
    <div class="class-grid">${cards}</div>
  </div>`;

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

function drawHotbar(me) {
  const inv = me?.inv ?? [];
  const slotW = W / Math.max(inv.length, 1), pad = 6;
  let hovered = null;
  for (let k = 0; k < inv.length; k++) {
    const x = k * slotW, item = inv[k];
    const bx = x + pad, by = HOTBAR_Y + pad, bw = slotW - pad * 2, bh = HOTBAR_H - pad * 2;
    ctx.fillStyle = "#171a21"; roundRect(bx, by, bw, bh, 8); ctx.fill();
    if (!item) continue;
    // A WORN passive (Aegis) is always-on — no cooldown, shown full in its own hue. An active
    // fills from the bottom as it recharges and glows its item color when ready.
    const passive = !!item.passive;
    const col = item.color || "#6a7384";
    const frac = passive ? 1 : Math.min(1, item.charge / item.cd);
    ctx.fillStyle = item.stolen ? "#3a1f2e" : item.spent ? "#2a2230" : passive ? col + "44" : item.ready ? col + "66" : "#333a47";
    ctx.save(); roundRect(bx, by, bw, bh, 8); ctx.clip();
    ctx.fillRect(bx, by + bh * (1 - frac), bw, bh * frac);
    // item-color identity strip across the bottom — the SAME hue this item shows on a foe's bar
    ctx.fillStyle = col; ctx.fillRect(bx, by + bh - 4, bw, 4);
    ctx.restore();
    // border: gold when ready, the item hue when worn, purple for a fragile, kraken-pink when stolen
    ctx.lineWidth = 2; ctx.strokeStyle = item.stolen ? "#d06fb0" : item.spent ? "#5a4a6a" : passive ? col : item.ready ? "#e6c34a" : item.fragile ? "#9a7fd0" : "#2a2f3a";
    roundRect(bx, by, bw, bh, 8); ctx.stroke();
    // labels: slot number (or ▣ for a worn passive) + item name
    ctx.globalAlpha = item.spent || item.stolen ? 0.55 : 1;
    ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.font = "bold 13px ui-monospace, monospace"; ctx.fillText(passive ? "▣" : String(k + 1), bx + 6, by + 5);
    // 🎯 = RANGED (the aiming reticle drives it); unmarked actives are MELEE (your lane's front)
    if (item.ranged && !passive) { ctx.textAlign = "right"; ctx.font = "12px serif"; ctx.fillText("🎯", bx + bw - 5, by + 5); }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 14px ui-monospace, monospace"; ctx.fillText(item.name, bx + bw / 2, by + bh / 2 - 2);
    ctx.textBaseline = "bottom";
    if (item.stolen) {       // Kraken lock — kill the stolen entity to take it back
      ctx.fillStyle = "#f0a8d0"; ctx.font = "bold 10px ui-monospace, monospace"; ctx.fillText("STOLEN — kill it!", bx + bw / 2, by + bh - 5);
    } else if (item.spent) {
      ctx.fillStyle = "#c9a9e0"; ctx.font = "bold 11px ui-monospace, monospace"; ctx.fillText("SPENT", bx + bw / 2, by + bh - 5);
    } else if (passive) {
      ctx.fillStyle = "#d6ccff"; ctx.font = "bold 11px ui-monospace, monospace"; ctx.fillText(`WORN · 🛡-${item.dr}`, bx + bw / 2, by + bh - 5);
    } else if (!item.ready) {
      ctx.fillStyle = "#e6edf5"; ctx.font = "bold 12px ui-monospace, monospace"; ctx.fillText(((item.cd - item.charge) / 10).toFixed(1) + "s", bx + bw / 2, by + bh - 5);
    } else if (item.fragile) {
      ctx.fillStyle = "#c9a9e0"; ctx.font = "bold 10px ui-monospace, monospace"; ctx.fillText("1× READY", bx + bw / 2, by + bh - 5);
    } else {
      ctx.fillStyle = "#bfe8c8"; ctx.font = "bold 10px ui-monospace, monospace"; ctx.fillText("READY", bx + bw / 2, by + bh - 5);
    }
    ctx.globalAlpha = 1;
    if (mouse.x >= bx && mouse.x <= bx + bw && mouse.y >= by && mouse.y <= by + bh) hovered = item;
  }
  if (hovered) drawTooltip(hovered);
}

// crisp, readable hover popup — the card's own text, straight from the library.
function drawTooltip(item) {
  ctx.font = "12px ui-monospace, monospace";
  const lines = wrapText(`${item.name} — ${item.text}`, 46);
  const w = Math.min(W - 20, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20);
  const h = lines.length * 16 + 14;
  const x = Math.min(Math.max(10, mouse.x - w / 2), W - w - 10);
  const y = HOTBAR_Y - h - 6;
  ctx.fillStyle = "#000e"; roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = "#e6c34a"; ctx.lineWidth = 1; roundRect(x, y, w, h, 8); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, x + 10, y + 8 + i * 16));
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
function fitText(str, x, y, maxW, basePx = 13, minPx = 9) {
  ctx.textAlign = "left"; ctx.textBaseline = "top";
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
