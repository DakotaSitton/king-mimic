// King Mimic client — thin renderer over the authoritative server snapshot.
// VERTICAL lanes: 3 columns, enemies up top charging downward, the Caravan is a bar along the
// bottom that you stand in front of. We never simulate locally — we draw the last 'state' message.

const $ = (id) => document.getElementById(id);

// layout — COLS/COLW are dynamic now (lanes = player count, 1–4); set each render from state.
// The board got a 2026-06-10 readability overhaul: bigger canvas, big labeled cards with
// on-card passive text, fat threat bars. CSS caps the canvas at 100% width for phones.
const W = 780;
let COLS = 3, COLW = W / COLS;
const PLAYER_Y = 444, CARAVAN_Y = 470, CARAVAN_H = 30, HOTBAR_Y = 508, HOTBAR_H = 92;
const H = HOTBAR_Y + HOTBAR_H + 6;

let ws = null, you = null, state = null;

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
        myRoom = null; you = null; state = null;
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
  state: null, you: null, _cbs: [],
  onState(cb) { this._cbs.push(cb); if (this.state) try { cb(this.state, this.you); } catch {} },
};

// ---- lobby ---------------------------------------------------------------
$("name").value ||= localStorage.getItem("km_name") || ""; // name survives refresh (phones)
$("createBtn").onclick = () => {
  const code = $("code").value.trim().toUpperCase();
  localStorage.setItem("km_name", $("name").value.trim());
  connect(() => send({ type: "create", name: $("name").value.trim(), code: code || undefined, token: TOKEN }));
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
  if (_auto) { connect(() => send({ type: "create", name: "Hero" })); return; }
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
  royalRat:    { name: "Junior Royal Rat", maxHp: 5, atk: 0, cd: 0, color: "#b8a3c9", rarity: "common" },
  royalRatU:   { name: "Royal Rat", maxHp: 8, atk: 0, cd: 0, color: "#b8a3c9", rarity: "uncommon" },
  fatCat:      { name: "Junior Fat Cat", maxHp: 5, atk: 0, cd: 0, color: "#f0b070", rarity: "common" },
  lizardWizard:{ name: "Junior Lizard Wizard", maxHp: 5, atk: 0, cd: 0, color: "#4f9f7f", rarity: "common" },
  pixie:       { name: "Junior Penny-Pinching Pixie", maxHp: 7, atk: 1, cd: 0, color: "#7f7", rarity: "common" },
  runeblade:   { name: "Junior Rent-Seeking Runeblade", maxHp: 5, atk: 1, cd: 0, color: "#357f5f", rarity: "common" },
  vampire:     { name: "Vengeful Vampire", maxHp: 11, atk: 3, cd: 0, color: "#b85c6e", rarity: "uncommon" },
  minotaur:    { name: "Junior Market-Crash Minotaur", maxHp: 9, atk: 1, cd: 0, color: "#b09030", rarity: "common" },
  minotaurR:   { name: "Senior Market-Crash Minotaur", maxHp: 22, atk: 3, cd: 0, color: "#b09030", rarity: "rare" },
  wageslave:   { name: "Junior Weary Wageslave", maxHp: 9, atk: 1, cd: 0, color: "#a0a0b0", rarity: "common" },
  auditAngel:  { name: "Audit Angel", maxHp: 5, atk: 0, cd: 0, color: "#d9f" },        // legacy combat1–4 fixtures
  killionaire: { name: "Killionaire", maxHp: 13, atk: 4, cd: 0, color: "#e6c34a" },    // legacy combat1–4 fixtures
};
const DEMO_KIT = [
  { key: "fire",      name: "Fireball",  text: "Deal staff + 3 to your aimed foe.",            cd: 45 },
  { key: "blade",     name: "Sword",     text: "Deal sword + 1 to the front foe.",             cd: 20 },
  { key: "heal",      name: "Heal",      text: "Heal staff + 2 to your ally-target.",          cd: 30 },
  { key: "lightning", name: "Lightning", text: "Deal staff + 2 to every foe in your lane.",    cd: 50 },
  { key: "bow",       name: "Bow",       text: "Deal sword + 1 to your aimed foe.",            cd: 25 },
];
const DEMO_NODES = [
  { id: "n0", type: "combat", cleared: true,  x: 0.5,  y: 0.04, links: ["n1", "n2"] },
  { id: "n1", type: "combat", cleared: false, x: 0.28, y: 0.22, links: ["n3"] },
  { id: "n2", type: "combat", cleared: false, x: 0.72, y: 0.22, links: ["n3"] },
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
  return { key, name: k.name, text: k.text, charge, cd: k.cd, ready: charge >= k.cd };
};
function buildDemoState(kind) {
  const base = {
    type: "state", god: false, tick: 84, draft: null, laneCount: 3,
    floor: 2, enchant: { name: "Hastened", text: "Foes act 20% faster — but the loot is richer." },
    caravan: { hp: kind === "combat" ? 14 : 20, max: 20 },
    map: kind === "draft" ? null : { nodes: DEMO_NODES, currentId: "n1", levelComplete: false },
    unlockedBodies: ["rookie", "pixie", "vampire", "royalRat", "minotaur"], bodies: DEMO_BODIES,
    lanes: [
      // lane 0: an UNCOMMON summoner — Royal Rat's 4s rat clock (🐀 bar) + its ⏩ accel tag
      { enemies: [
        _enemy("royalRatU", 7, 18, [{ key: "blade", name: "Sword" }], "t1",
          "Summons 2 rats every 4s; each staff item it resolves shaves 1s off the clock.",
          { mag: 2, tags: ["⏩ −1s on staff"],
            bars: [{ kind: "passive", harm: false, label: "🐀2", color: "#b8a3c9", cd: 40, frac: 0.7 }] }),
        _enemy("rat", 1, 8, [{ key: "blade", name: "Bite" }]),
        _enemy("rat", 1, 14, [{ key: "blade", name: "Bite" }]),
      ] },
      // lane 1 (yours): an uncommon Vampire fronting a RARE Minotaur; a rat + a gold-ring totem block
      { allies: [{ bodyKey: "rat", hp: 1, maxHp: 1 }, { bodyKey: "totem", hp: 3, maxHp: 3, aura: { dmgReduce: 1 } }],
        enemies: [
          _enemy("vampire", 9, 24, [{ key: "blade", name: "Sword" }], "t2",
            "Heals 2 after each sword item it resolves.", { tags: ["⚡ on sword"], phys: 3 }),
          _enemy("minotaurR", 20, 12, [{ key: "blade", name: "Sword" }], null,
            "Counter: swords the front enemy when it takes damage.", { tags: ["⚡ counter"], phys: 3, shield: 2 }),
        ] },
      // lane 2: a Wageslave self-healing (♥ bar) beside a Fat Cat whose clock jumps when hit
      { enemies: [
        _enemy("wageslave", 7, 10, [{ key: "blade", name: "Sword" }], null, "Heals 2 every 3s.",
          { bars: [{ kind: "passive", harm: false, label: "♥2", color: "#74e69a", cd: 30, frac: 0.35 }] }),
        _enemy("fatCat", 5, 20, [{ key: "fire", name: "Fireball" }], null,
          "Summons 1 rat every 4s; every hit it takes shaves 1s off the clock.",
          { mag: 1, tags: ["⏩ −1s when hit"],
            bars: [{ kind: "passive", harm: false, label: "🐀1", color: "#b8a3c9", cd: 40, frac: 0.45 }] }),
      ] },
    ],
    players: [
      { id: "me", name: "Hero", lane: 1, bodyKey: "vampire", hp: 4, maxHp: 6, shield: 2, alive: true, phys: 2,
        passive: "Heals 2 whenever it swords.", tags: ["⚡ on sword"], picks: [], targetId: "t2", kitSlots: 4, kitSlotCost: 4, treasure: 0, unlockedTiers: [],
        kit: [{ key: "blade", name: "Blade", text: "Deal sword + 1 to the front foe.", value: 1 }, { key: "fire", name: "Fire", text: "Deal staff + 3 to your aimed foe.", value: 1 }, { key: "heal", name: "Heal", text: "Heal staff + 2.", value: 1 }],
        inv: [_inv("blade", 20), _inv("fire", 16), _inv("heal", 8)] },
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
      max: 12, picksRequired: 1, canBegin: false, anteStocked: 8, greedTreasure: 5,
      picks: [{ id: "me", name: "Hero", picks: 1 }, { id: "p2", name: "Mara", picks: 0 }],
      palette: [
        { bodyKey: "pixie", name: "Junior Penny-Pinching Pixie", maxHp: 7, ante: 2, tier: 1, bodyAnte: 1, lootValue: 1, passive: "Its sword items charge 25% faster.", gear: [{ name: "Sword", text: "Deal sword + 1 to the front foe." }] },
        { bodyKey: "royalRatU", name: "Royal Rat", maxHp: 8, ante: 5, tier: 2, bodyAnte: 3, lootValue: 2, passive: "Summons 2 rats every 4s; each staff item it resolves shaves 1s off the clock.", gear: [{ name: "Magic Missile", text: "Deal staff to your aimed foe (very fast)." }] },
        { bodyKey: "minotaurR", name: "Senior Market-Crash Minotaur", maxHp: 22, ante: 13, tier: 3, bodyAnte: 5, lootValue: 8, passive: "Counter: swords the front enemy when it takes damage.", gear: [{ name: "Repeating Crossbow", text: "Deal sword to your aimed foe (relentless)." }, { name: "Blizzard", text: "Deal staff + 2 to every foe in your lane and drain 10 charge." }] },
      ],
      placed: [ // every stocked foe is a player invite now — removable, hover for the card
        { bodyKey: "pixie", name: "Junior Penny-Pinching Pixie", lane: 0, ante: 2, tier: 1, maxHp: 7, phys: 1, mag: 0, bodyAnte: 1, lootValue: 1, gear: [{ name: "Sword", text: "Deal sword + 1 to the front foe." }], greedy: true },
        { bodyKey: "wageslave", name: "Junior Weary Wageslave", lane: 1, ante: 2, tier: 1, maxHp: 9, phys: 1, mag: 0, bodyAnte: 1, lootValue: 1, gear: [{ name: "Bow", text: "Deal sword + 1 to your aimed foe." }], greedy: true },
        { bodyKey: "vampire", name: "Vengeful Vampire", lane: 2, ante: 4, tier: 2, maxHp: 11, phys: 3, mag: 0, bodyAnte: 3, lootValue: 1, passive: "Heals 2 after each sword item it resolves.", gear: [{ name: "Sword", text: "Deal sword + 1 to the front foe." }], greedy: true },
      ],
    };
  } else if (kind === "won") {
    base.phase = "won";
    base.caravan = { hp: 11, max: 20 };
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
  you = "me";
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
  you = null; state = null;
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
  else if (e.code === "Tab") { send({ type: "cycleTarget", dir: e.shiftKey ? -1 : 1 }); e.preventDefault(); }
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
  $("help").innerHTML = `◀ ▶ change lane &nbsp;·&nbsp; ▲ ▼ step forward / back past teammates and your summons (the front of the line blocks) &nbsp;·&nbsp; tap a foe to aim, an ally to aim heals &nbsp;·&nbsp; tap an item card to use it &nbsp;·&nbsp; 🎭 swap body`;
  const TK = {
    laneUp: { type: "lane", dir: "up" }, laneDown: { type: "lane", dir: "down" },
    fwd: { type: "move", dir: "fwd" }, back: { type: "move", dir: "back" },
    cycle: { type: "cycleTarget", dir: 1 }, swap: { type: "swapBody" },
  };
  document.querySelectorAll("#touchHud [data-tk]").forEach((b) => {
    // pointerdown (not click): a soft-real-time game wants the step on finger DOWN
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); send(TK[b.dataset.tk]); });
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
function sizeCanvas() { cv.width = W; cv.height = H; }
sizeCanvas();

// mouse tracking for hover tooltips
const mouse = { x: -1, y: -1 };
let foeBoxes = []; // filled each render: { x, y, w, h, id } for click-to-target
let heroBoxes = []; // filled each render: { x, y, r, id } for click-to-ALLY-target (heals)
const toCanvas = (e) => {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
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
    <div class="tip-stat">❤${f.maxHp ?? "?"}${(f.phys ?? 0) > 0 ? ` · ⚔${f.phys}` : ""}${(f.mag ?? 0) > 0 ? ` · ✨${f.mag}` : ""}${f.bodyAnte ? ` · T${f.bodyAnte}` : ""}${f.lootValue ? ` · 💰${f.lootValue}` : ""}</div>
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

// Dual target slots (V2): click a FOE to aim your offense at it; click an ALLY to aim
// your support (Heal) at them. The two slots never cross — no mis-target states exist.
cv.addEventListener("click", (e) => {
  const p = toCanvas(e);
  // touch only: the hotbar cards double as the item buttons (no number keys on a
  // phone). Same geometry drawHotbar uses; desktop keeps hotbar clicks inert.
  if (IS_TOUCH && p.y >= HOTBAR_Y && state) {
    const inv = state.players?.find((pl) => pl.id === you)?.inv ?? [];
    const k = Math.floor(p.x / (W / Math.max(inv.length, 1)));
    if (k >= 0 && k < inv.length) send({ type: "use", slot: k });
    return;
  }
  const hit = foeBoxes.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
  if (hit) { send({ type: "target", foeId: hit.id }); return; }
  const ah = heroBoxes.find((b) => (p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= b.r * b.r);
  if (ah) send({ type: "allyTarget", playerId: ah.id });
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
};
// Generated rarity keys end in U/R (royalRatU, atlasR) — fall back to the family's icon.
const iconFor = (k) => FOE_ICON[k] || FOE_ICON[(k || "").replace(/[UR]$/, "")] || "❔";

// Drawn foe art, lazily loaded from /foes/<bodyKey>.svg (generated by tools/generate-foe-art.js).
// Falls back to the emoji above until the image is ready.
const _foeSprites = {};
function foeSprite(key) {
  // rarity variants (…U/…R) share their family's art — one drawing serves all three tiers
  if (!(key in _foeSprites)) { const img = new Image(); img.src = `/foes/${(key || "").replace(/[UR]$/, "")}.svg`; _foeSprites[key] = img; }
  return _foeSprites[key];
}

function render() {
  if (!state) return;
  const { lanes, caravan, players, bodies, phase } = state;
  // touch HUD only exists while the board is the active surface — out of combat it
  // would sit on top of the map/shop/inventory panels and steal their taps
  if (IS_TOUCH) $("touchHud").classList.toggle("tactive", phase === "playing" || phase === "setup");
  // lanes = player count (1–4): lay out N columns dynamically across the same board width.
  COLS = Math.max(1, state.laneCount || lanes.length || 3);
  COLW = W / COLS;

  // HUD
  $("caravan").textContent = `⛺ Caravan ${caravan.hp}/${caravan.max}`;
  const foesLeft = lanes.reduce((n, l) => n + l.enemies.length, 0);
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
  const me = players.find((p) => p.id === you);
  // ONE line, always: your passive/tags live on your card + the inventory panel now, so the
  // hud carries only vitals — a wrapped hud was costing the short-viewport laptops a text row.
  $("bodyInfo").textContent = me
    ? `${state.god ? "⚡GOD · " : ""}${bodies[me.bodyKey].name} ${me.hp}/${me.maxHp}${me.shield > 0 ? ` +${me.shield}🛡` : ""}${me.dr > 0 ? ` 🛡-${me.dr}` : ""} · [Q] swap (${state.unlockedBodies.length})`
    : "";
  const btn = $("startBtn");
  const complete = state.map && state.map.levelComplete;
  // hidden during play/draft/stock, and during a mid-level win (you advance via the map)
  btn.classList.toggle("hidden", phase === "playing" || phase === "draft" || phase === "stock" || (phase === "won" && !complete));
  if (phase === "won" && complete) { btn.textContent = "DESCEND ▶"; btn.onclick = () => send({ type: "descend" }); }
  else if (phase === "lost") { btn.textContent = "PLAY AGAIN"; btn.onclick = () => send({ type: "start" }); }
  else if (phase === "setup") { btn.textContent = "BEGIN COMBAT ▶"; btn.onclick = () => send({ type: "start" }); }
  else { btn.textContent = "ENTER ROOM"; btn.onclick = () => send({ type: "start" }); }

  renderOverlay();

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
  // FRIENDLY DEPTH LINE geometry per lane: heroes stack front→back (front = nearest the foes
  // = the blocker), the rear anchored just above the caravan; summons hold a row in front;
  // foes stack above the whole friendly stack. Computed up front so foes know where to stop.
  const HERO_STEP = 23, REAR_Y = CARAVAN_Y - 22, R_HERO = 16;
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
    const foeBottom = slots.length ? frontY - 34 : REAR_Y - 18;
    laneStacks[i] = { slots, frontY, foeBottom };
  }
  // ===== FOE CARDS (2026-06-10 redesign) — built to be read by a STRANGER, not just the
  // designer: a rarity ribbon names the tier, the header band carries the body's hue, both
  // power schools show (⚔ sword / ✨ staff), the passive is printed ON the card (wrapped),
  // and every clock is a fat labeled bar with its time-to-fire. Front two ranks get the
  // full card; the deeper backline condenses to name + HP + slim bars.
  const RIBBON = { common: "#7c8696", uncommon: "#4aa3ff", rare: "#ffd24a" };
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
      ctx.fillStyle = e.boss ? "#ffd24a" : (RIBBON[b.rarity] || "#39404d");
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
        ctx.fillStyle = "#f4f5f7";
        fitText(b.name || e.bodyKey, tx, y + 7, (x + cardW - (targeted ? 26 : 8)) - tx, 15, 10);
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
        fitText(b.name || e.bodyKey, tx, y + 4, (x + cardW - 44) - tx, 11, 9);
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
      const p = s.p, px = colCenter(i), mine = p.id === you;
      const col = bodies[p.bodyKey]?.color ?? "#68a";
      heroBoxes.push({ x: px, y: py, r: R_HERO + 9, id: p.id });   // click an ally → ally-target
      ctx.globalAlpha = p.alive ? 1 : 0.3;
      // YOUR ally-target (heals aim here) — dashed green ring (outside the clock ring)
      if (p.id === myAllyTarget) {
        ctx.beginPath(); ctx.arc(px, py, R_HERO + 9, 0, Math.PI * 2);
        ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.strokeStyle = "#74e69a"; ctx.stroke(); ctx.setLineDash([]);
      }
      // YOUR BODY'S OWN CLOCK (Royal Rat's rats / Atlas's ramp / Wageslave's heal): a colored
      // progress RING around the mimic + labeled mini-bars below — the worn passive is no
      // longer invisible (owner bug report 2026-06-10).
      const bts = p.alive ? (p.bodyThreats || []) : [];
      if (bts.length) {
        const t0 = bts[0];
        ctx.beginPath();
        ctx.arc(px, py, R_HERO + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, t0.frac || 0));
        ctx.lineWidth = 3; ctx.strokeStyle = t0.color || "#b8a3c9"; ctx.stroke();
      }
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
      bar(px - 18, py + R_HERO + 2, 36, 4, p.hp / p.maxHp, p.hp / p.maxHp > 0.4 ? "#6c6" : "#e66");
      // the body clock again as labeled mini-bars under the HP bar (skip while offline/down
      // — those labels need the space)
      if (!p.offline) bts.slice(0, 2).forEach((t, bi) => {
        bar(px - 18, py + R_HERO + 8 + bi * 7, 36, 5, t.frac || 0, t.color || "#b8a3c9");
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = mine ? "#ffd24a" : "#cfd3dc"; ctx.font = (mine ? "bold " : "") + "11px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(mine ? "YOU" : p.name, px, py - R_HERO - 2);
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
    ctx.fillText(phase === "won" ? (complete ? "FLOOR CLEARED — DESCEND ▶" : "ROOM CLEARED") : "THE CARAVAN FALLS", W / 2, CARAVAN_Y / 2);
  }

  // notify side panels (map.js / inventory.js)
  window.KM.state = state; window.KM.you = you;
  for (const cb of window.KM._cbs) { try { cb(state, you); } catch (e) {} }
}

// Hover a foe → a small card: stats, its passive (in words), and its item.
function drawFoeInspect(bodies) {
  const hit = foeBoxes.find((b) => b.e && mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h);
  if (!hit) return;
  const e = hit.e, bd = bodies[e.bodyKey] || {};
  const lines = [bd.name || e.bodyKey];
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
const NODE_LABEL = { combat: "Fight ▶", elite: "Elite ★ ▶", boss: "BOSS ♛ ▶", shop: "Shop 🛒 ▶" };

// Party + trading panel (out of combat). Pick one of YOUR items, then click a teammate's
// item to propose a swap — the value gap is settled in treasure (lesser-item giver pays).
function buildTradeSection() {
  const others = (state.players || []).filter((p) => p.id !== you);
  const offers = (state.trade && state.trade.offers) || [];
  if (!others.length && !offers.length) return "";   // solo: nothing to trade
  const me = state.players.find((p) => p.id === you) || {};
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
  const incoming = offers.filter((o) => o.to === you).map((o) =>
    `<div class="trade-offer">${o.fromName} offers <b>${o.giveName}</b> (💰${o.giveVal}) for your <b>${o.wantName}</b> (💰${o.wantVal})
      <button class="lane-btn" data-accept="${o.id}">Accept</button><button class="lane-btn" data-decline="${o.id}">✕</button></div>`).join("");
  const outgoing = offers.filter((o) => o.from === you).map((o) =>
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
  const me = state.players.find((p) => p.id === you) || {};
  const kit = me.kit || [];
  const slots = me.kitSlots ?? 5;
  const treasure = me.treasure || 0;   // per-player wallet (mirrored income)
  const shop = state.shop;
  const map = state.map || {};
  const cur = (map.nodes || []).find((n) => n.id === map.currentId);
  const nexts = (cur?.links || []).map((id) => (map.nodes || []).find((n) => n.id === id)).filter(Boolean);
  const full = kit.length >= slots;
  const sig = JSON.stringify([shop.wares, shop.rerollCost, kit.map((k) => k.key), slots,
    me.kitSlotCost, treasure, nexts.map((n) => [n.id, n.type]),
    _tradeGive, (state.trade?.offers || []).map((o) => o.id),
    (state.players || []).map((p) => [p.id, (p.kit || []).map((k) => k.key).join(), p.treasure])]);
  if (sig === _shopSig) return;
  _shopSig = sig;

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
    <p class="draft-sub" style="margin-top:14px">Your kit (${kit.length}/${slots})${full ? ` · <span class="ante-no">full</span>` : ""} — click an item to drop it &nbsp;·&nbsp; ${slotBtn}</p>
    <div class="draft-grid">${kit.map((it) => `
      <button class="draft-opt kit-item" data-drop="${it.key}">
        <span class="dn">${it.name}</span><span class="dt">${it.text}</span>
        <span class="dcd">click to drop ✕</span>
      </button>`).join("") || `<span class="lane-empty">— empty —</span>`}</div>`;

  const leaveSection = `<p class="draft-sub" style="margin-top:14px">Move on:</p>
    <div class="advance-row">${nexts.map((n) => `
      <button class="advance-btn node-${n.type}" data-leave="${n.id}">${NODE_LABEL[n.type] || "Next ▶"}</button>`).join("")}</div>`;

  ov.classList.remove("hidden");
  ov.innerHTML = `<div class="draft-card">
    <h2>Shop 🛒 <span class="tre" style="float:right">💰 ${treasure}</span></h2>
    <p class="draft-sub" style="margin-top:6px">Buy what you actually want — banked Treasure spends here.
      <button class="lane-btn" data-reroll="1" ${treasure < shop.rerollCost ? "disabled" : ""}>↻ Reroll · 💰${shop.rerollCost}</button></p>
    ${waresSection}${kitSection}${buildTradeSection()}${leaveSection}
  </div>`;
  ov.querySelectorAll("[data-buy]").forEach((b) => b.onclick = () => send({ type: "buyShopItem", key: b.dataset.buy }));
  ov.querySelectorAll("[data-drop]").forEach((b) => b.onclick = () => send({ type: "dropItem", key: b.dataset.drop }));
  ov.querySelectorAll("[data-buyslot]").forEach((b) => b.onclick = () => send({ type: "buyKitSlot" }));
  ov.querySelectorAll("[data-reroll]").forEach((b) => b.onclick = () => send({ type: "rerollShop" }));
  ov.querySelectorAll("[data-leave]").forEach((b) => b.onclick = () => send({ type: "leaveShop", to: b.dataset.leave }));
  wireTrade(ov);
}

// The between-rooms screen: grab loot (free; whatever you leave becomes Treasure),
// spend Treasure on kit space, manage your kit, then choose the next room.
function renderBetweenRooms() {
  const ov = $("draftOverlay");
  const me = state.players.find((p) => p.id === you) || {};
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
    slots, me.kitSlotCost, treasure, nexts.map((n) => [n.id, n.type]), complete, state.floor,
    _tradeGive, (state.trade?.offers || []).map((o) => o.id),
    (state.players || []).map((p) => [p.id, (p.kit || []).map((k) => k.key).join(), p.treasure])]);
  if (sig === _brSig) return;
  _brSig = sig;

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
  const kitSection = `
    <p class="draft-sub" style="margin-top:14px">Your kit (${kit.length}/${slots}) — click an item to drop it &nbsp;·&nbsp; ${slotBtn}</p>
    <div class="draft-grid">${kit.map((it) => `
      <button class="draft-opt kit-item" data-drop="${it.key}">
        <span class="dn">${it.name}</span><span class="dt">${it.text}</span>
        <span class="dcd">click to drop ✕</span>
      </button>`).join("") || `<span class="lane-empty">— empty —</span>`}</div>`;

  const advanceSection = complete
    ? `<button class="stock-begin" data-descend="1">Descend to Floor ${(state.floor || 1) + 1} ▶</button>`
    : `<p class="draft-sub" style="margin-top:14px">Choose the next room:</p>
       <div class="advance-row">${nexts.map((n) => `
         <button class="advance-btn node-${n.type}" data-advance="${n.id}">${NODE_LABEL[n.type] || "Next ▶"}</button>`).join("")}</div>`;

  ov.classList.remove("hidden");
  ov.innerHTML = `<div class="draft-card">
    <h2>Room cleared! 🎉 <span class="tre" style="float:right">💰 ${treasure}</span></h2>
    <p class="draft-sub" style="margin-top:2px">The foes paid their ante — <b class="tre">⚖${earned}</b> split across the party (remainder to the poorest).</p>
    ${lootSection}${kitSection}${buildTradeSection()}${advanceSection}
  </div>`;
  ov.querySelectorAll("[data-loot]").forEach((b) => b.onclick = () => send({ type: "claimLoot", key: b.dataset.loot }));
  ov.querySelectorAll("[data-drop]").forEach((b) => b.onclick = () => send({ type: "dropItem", key: b.dataset.drop }));
  ov.querySelectorAll("[data-buyslot]").forEach((b) => b.onclick = () => send({ type: "buyKitSlot" }));
  ov.querySelectorAll("[data-advance]").forEach((b) => b.onclick = () => send({ type: "advance", to: b.dataset.advance }));
  const desc = ov.querySelector("[data-descend]");
  if (desc) desc.onclick = () => send({ type: "descend" });
  wireTrade(ov);
}

const laneLabel = (l, n) => n <= 1 ? "Lane" :
  (n === 3 ? ["Left", "Mid", "Right"][l] : (n === 2 ? ["Left", "Right"][l] : "Lane " + (l + 1)));
function renderStock() {
  const ov = $("draftOverlay");
  const s = state.stock;
  const laneN = state.laneCount || 3;
  const sig = JSON.stringify([s.palette, s.placed, s.picksRequired, s.picks, s.anteStocked, s.greedTreasure, state.floor, state.enchant, laneN]);
  if (sig === _stockSig) return;
  _stockSig = sig;

  const need = s.picksRequired ?? 1;
  const mine = (s.picks ?? []).find((x) => x.id === you);
  const myFull = (mine?.picks ?? 0) >= need;
  const palette = s.palette.map((o, idx) => {
    const items = (o.gear ?? []).map((g) => `<span class="fgear">◆ <b>${g.name}</b> — ${g.text}</span>`).join("");
    const pass = o.passive ? `<span class="fpass">✦ ${o.passive}</span>` : "";
    return `<div class="foe-opt">
      <b class="fbig" title="ante — this foe's weight (body + items); richer rooms pay everyone more">${o.ante ?? o.bodyAnte}</b>
      <span class="fn">${iconFor(o.bodyKey)} ${o.name}</span>
      <span class="fstat" title="💰 = its items' value: they DROP as claimable loot when it dies, and feed the room's payout to everyone">❤ ${o.maxHp} HP · 🎭 T${o.tier ?? "?"} body · drops 💰${o.lootValue} in loot</span>
      ${items}${pass}
      <span class="fadd"><button class="lane-btn" data-add="${idx}" ${myFull ? "disabled" : ""}>+ Invite into your lane</button></span>
    </div>`;
  }).join("");

  // every stocked foe is a player pick — removable, hover for its full card
  const lanes = [...Array(laneN).keys()].map((l) => {
    const inLane = s.placed.map((f, i) => ({ f, i })).filter((x) => x.f.lane === l);
    const chips = inLane.map(({ f, i }) =>
      `<button class="foe-chip greedy" data-remove="${i}" data-tipfoe="${i}">${iconFor(f.bodyKey)} ${f.name} <b>⚖${f.ante ?? ""}</b> ✕</button>`
    ).join("") || `<span class="lane-empty">— empty —</span>`;
    return `<div class="stock-lane"><div class="stock-lane-h">${laneLabel(l, laneN)}</div>${chips}</div>`;
  }).join("");

  const who = (s.picks ?? []).map((x) =>
    `<span class="${x.picks >= need ? "ante-ok" : "ante-no"}">${x.id === you ? "You" : x.name} ${x.picks}/${need}</span>`).join(" · ");
  const df = need === 2 ? `<b class="ante-over">★ DOUBLE FEATURE — every player invites TWO</b> · ` : "";
  const ench = state.enchant ? `<p class="enchant-line">Floor ${state.floor} · ✦ <b>${state.enchant.name}</b> — ${state.enchant.text}</p>` : "";
  ov.classList.remove("hidden");
  ov.innerHTML = `<div class="draft-card stock-wide">
    <h2>Stock the room</h2>
    ${ench}
    <p class="draft-sub">${df}Each player invites <b>${need === 2 ? "two foes" : "one foe"}</b> from the palette into <b>their own lane</b>. The ⚖ ante is its weight — richer rooms pay <b>everyone</b> more. ${who} · ⚖${s.anteStocked} stocked · 💰${s.greedTreasure} loot</p>
    <div class="foe-palette">${palette}</div>
    <div class="stock-lanes">${lanes}</div>
    <button class="stock-begin" ${s.canBegin ? "" : "disabled"}>${s.canBegin ? "Begin combat ▶" : (myFull ? "Waiting on the party…" : "Place your invite to begin")}</button>
  </div>`;
  ov.querySelectorAll("[data-add]").forEach((b) =>
    b.onclick = () => send({ type: "stockAdd", idx: +b.dataset.add }));
  ov.querySelectorAll("[data-remove]").forEach((b) =>
    b.onclick = () => send({ type: "stockRemove", i: +b.dataset.remove }));
  ov.querySelector(".stock-begin").onclick = () => send({ type: "stockBegin" });
}

// The DRAFT WHEEL: a shared set of low body+3-item bundles; lock one EXCLUSIVELY. The chosen
// body is your chassis (HP/affinity/tempo); the 3 items are your starter kit.
function renderDraft() {
  const ov = $("draftOverlay");
  const d = state.draft;
  const wheel = d.wheel || [];
  const picks = d.picks || [];
  const myPick = picks.find((p) => p.id === you);
  const myBundle = myPick?.bundle ?? null;
  const sig = JSON.stringify([wheel.map((w) => [w.id, w.lockedBy]), myBundle, picks.map((p) => [p.id, p.drafted])]);
  if (sig === _draftSig) return;
  _draftSig = sig;

  const cards = wheel.map((w) => {
    const lockedByMe = w.lockedBy === you;
    const lockedByOther = !!w.lockedBy && !lockedByMe;
    const owner = lockedByOther ? (picks.find((p) => p.id === w.lockedBy)?.name || "ally") : null;
    const items = w.items.map((it) => `<li><b>${it.name}</b> — ${it.text}</li>`).join("");
    const tag = lockedByMe ? " ✓ (you)" : owner ? " — " + owner : "";
    return `<button class="class-opt${lockedByMe ? " taken" : ""}${lockedByOther ? " locked-other" : ""}" data-bundle="${w.id}" ${lockedByOther ? "disabled" : ""}>
      <span class="cn" style="color:${w.color}">${iconFor(w.bodyKey)} ${w.name}${tag}</span>
      <span class="cstat">❤ ${w.maxHp} HP&nbsp;·&nbsp;you act only through items${w.passive ? " · ✦ " + w.passive : ""}</span>
      <ul class="ckit">${items}</ul>
    </button>`;
  }).join("");
  const status = picks.map((p) => {
    const who = p.id === you ? "You" : p.name;
    return `<span class="${p.drafted ? "ready" : ""}">${who}: ${p.drafted ? "locked ✓" : "choosing…"}</span>`;
  }).join("");

  ov.classList.remove("hidden");
  ov.innerHTML = `<div class="draft-card">
    <h2>Draft your mimic</h2>
    <p class="draft-sub">A low body + a 3-item kit — lock one (exclusive). The run starts when everyone's locked.</p>
    <div class="class-grid">${cards}</div>
    <div class="draft-status">${status}</div>
  </div>`;
  ov.querySelectorAll("[data-bundle]").forEach((b) => {
    b.onclick = () => send({ type: "draftPick", bundle: b.dataset.bundle });
  });
}

// spread overlapping players in the same lane so they don't fully stack
function lanePush(players, p) {
  const same = players.filter((q) => q.lane === p.lane);
  const idx = same.indexOf(p);
  return same.length > 1 ? (idx - (same.length - 1) / 2) * 26 : 0;
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
    ctx.fillStyle = item.spent ? "#2a2230" : passive ? col + "44" : item.ready ? col + "66" : "#333a47";
    ctx.save(); roundRect(bx, by, bw, bh, 8); ctx.clip();
    ctx.fillRect(bx, by + bh * (1 - frac), bw, bh * frac);
    // item-color identity strip across the bottom — the SAME hue this item shows on a foe's bar
    ctx.fillStyle = col; ctx.fillRect(bx, by + bh - 4, bw, 4);
    ctx.restore();
    // border: gold when ready, the item hue when worn, purple for a fragile
    ctx.lineWidth = 2; ctx.strokeStyle = item.spent ? "#5a4a6a" : passive ? col : item.ready ? "#e6c34a" : item.fragile ? "#9a7fd0" : "#2a2f3a";
    roundRect(bx, by, bw, bh, 8); ctx.stroke();
    // labels: slot number (or ▣ for a worn passive) + item name
    ctx.globalAlpha = item.spent ? 0.45 : 1;
    ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.font = "bold 13px ui-monospace, monospace"; ctx.fillText(passive ? "▣" : String(k + 1), bx + 6, by + 5);
    // 🎯 = RANGED (the aiming reticle drives it); unmarked actives are MELEE (your lane's front)
    if (item.ranged && !passive) { ctx.textAlign = "right"; ctx.font = "12px serif"; ctx.fillText("🎯", bx + bw - 5, by + 5); }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 14px ui-monospace, monospace"; ctx.fillText(item.name, bx + bw / 2, by + bh / 2 - 2);
    ctx.textBaseline = "bottom";
    if (item.spent) {
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
  const lbl = (t.label || "").slice(0, Math.floor((w - 44) / 7.5));
  ctx.fillStyle = "#000c"; ctx.fillText(lbl, x + 7, cy + 1);            // shadow for contrast on any hue
  ctx.fillStyle = "#fff";  ctx.fillText(lbl, x + 6, cy);
  const rt = frac >= 1 ? "NOW" : Math.max(0, (t.cd * (1 - frac)) / 10).toFixed(1) + "s";
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
