// King Mimic client — thin renderer over the authoritative server snapshot.
// VERTICAL lanes: 3 columns, enemies up top charging downward, the Caravan is a bar along the
// bottom that you stand in front of. We never simulate locally — we draw the last 'state' message.

const $ = (id) => document.getElementById(id);

// layout
const W = 540, COLS = 3, COLW = W / COLS;
const PLAYER_Y = 340, CARAVAN_Y = 366, CARAVAN_H = 26, HOTBAR_Y = 406, HOTBAR_H = 92;
const H = HOTBAR_Y + HOTBAR_H + 6;

let ws = null, you = null, state = null;

// ---- connection ----------------------------------------------------------
function connect(onOpen) {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = onOpen;
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === "joined") {
      you = msg.you;
      $("roomCode").textContent = "ROOM " + msg.code;
      $("lobby").classList.add("hidden");
      $("game").classList.remove("hidden");
      sizeCanvas();
    } else if (msg.type === "state") {
      state = msg;
      render();
      if (_auto) autoStep();
    } else if (msg.type === "error") {
      $("lobbyErr").textContent = msg.message;
    }
  };
  ws.onclose = () => { if (you) $("lobbyErr").textContent = "Disconnected."; };
}
const send = (o) => ws && ws.readyState === 1 && ws.send(JSON.stringify(o));

// ---- panel bridge --------------------------------------------------------
// map.js / inventory.js read live state and send actions through this object.
window.KM = {
  send: (o) => send(o),
  state: null, you: null, _cbs: [],
  onState(cb) { this._cbs.push(cb); if (this.state) try { cb(this.state, this.you); } catch {} },
};

// ---- lobby ---------------------------------------------------------------
$("createBtn").onclick = () => {
  const code = $("code").value.trim().toUpperCase();
  connect(() => send({ type: "create", name: $("name").value.trim(), code: code || undefined }));
};
$("joinBtn").onclick = () => {
  const code = $("code").value.trim().toUpperCase();
  if (!code) { $("lobbyErr").textContent = "Enter the room name to join."; return; }
  connect(() => send({ type: "join", code, name: $("name").value.trim() }));
};
$("startBtn").onclick = () => send({ type: "start" });

// Screenshot auto-driver: ?auto=draft|setup|combat creates a normal room and walks
// it to the requested phase. Inert during normal play (only runs when the param is set).
const _auto = new URLSearchParams(location.search).get("auto");
const _autoDone = new Set();
window.addEventListener("load", () => {
  if (_auto) connect(() => send({ type: "create", name: "Hero" }));
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
  rookie:      { name: "Rookie Mimic", maxHp: 8,  atk: 2, cd: 0,  color: "#9ad" },
  pixie:       { name: "Penny Pixie",  maxHp: 5,  atk: 1, cd: 30, color: "#7f7" },
  auditAngel:  { name: "Audit Angel",  maxHp: 8,  atk: 2, cd: 45, color: "#d9f" },
  killionaire: { name: "Killionaire",  maxHp: 13, atk: 4, cd: 70, color: "#e6c34a" },
  rat:         { name: "Rat",        maxHp: 1, atk: 1, cd: 25, color: "#c9a98c" },
  royalRat:    { name: "Royal Rat",  maxHp: 3, atk: 0, cd: 50, color: "#b8a3c9" },
  fatCat:      { name: "Fat Cat",    maxHp: 4, atk: 1, cd: 45, color: "#f0b070" },
};
const DEMO_KIT = [
  { key: "fire",      name: "Fire",      text: "Deal 6 to your targeted foe.",                cd: 70 },
  { key: "lightning", name: "Lightning", text: "Deal 2 to every foe in your target's lane.",  cd: 40 },
  { key: "bow",       name: "Bow",       text: "Deal 3 to your targeted foe.",                cd: 30 },
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
const _enemy = (bodyKey, hp, charge, gear, id, passive) => ({ id, bodyKey, hp, maxHp: DEMO_BODIES[bodyKey].maxHp, charge, cd: DEMO_BODIES[bodyKey].cd, gear: gear ?? [], passive: passive ?? null });
const _inv = (key, charge) => { const k = DEMO_KIT.find((x) => x.key === key); return { key, name: k.name, text: k.text, charge, cd: k.cd, ready: charge >= k.cd }; };
function buildDemoState(kind) {
  const base = {
    type: "state", god: false, tick: 84, draft: null,
    floor: 2, enchant: { name: "Hastened", text: "Foes act 20% faster — but the loot is richer." },
    caravan: { hp: kind === "combat" ? 14 : 20, max: 20 },
    map: kind === "draft" ? null : { nodes: DEMO_NODES, currentId: "n1", levelComplete: false },
    unlockedBodies: ["rookie", "pixie"], bodies: DEMO_BODIES,
    lanes: [
      { shield: 0, enemies: [_enemy("killionaire", 9, 52, [{ key: "fire", name: "Fire" }]), _enemy("fatCat", 4, 20, [], null, "Summons a rat when hit.")] },
      { shield: 1, allies: [{ bodyKey: "rat", hp: 1, maxHp: 1 }, { bodyKey: "royalRat", hp: 3, maxHp: 3 }], enemies: [_enemy("auditAngel", 5, 38, [{ key: "lightning", name: "Lightning" }])] },
      { shield: 0, enemies: [_enemy("royalRat", 3, 30, [], null, "Summons a rat on its timer."), _enemy("killionaire", 13, 61, [{ key: "bow", name: "Bow" }], "t1"), _enemy("rat", 1, 8)] },
    ],
    players: [
      { id: "me", name: "Hero", lane: 1, bodyKey: "rookie", hp: 6, maxHp: 8, alive: true, picks: [], targetId: "t1", kitSlots: 5, kitSlotCost: 4,
        kit: [{ key: "fire", name: "Fire", text: "Deal 6 to your targeted foe." }, { key: "lightning", name: "Lightning", text: "Deal 2 to every foe in your target's lane." }, { key: "sword", name: "Sword", text: "Deal 3 to the front foe." }],
        inv: [_inv("fire", 70), _inv("lightning", 25), _inv("bow", 12)] },
      { id: "p2", name: "Mara", lane: 2, bodyKey: "pixie", hp: 4, maxHp: 5, alive: true, picks: [], inv: [] },
    ],
  };
  if (kind === "draft") {
    base.phase = "draft";
    base.lanes = [{ shield: 0, enemies: [] }, { shield: 0, enemies: [] }, { shield: 0, enemies: [] }];
    base.players[0].inv = [];
    base.players[0].classKey = "mage";
    base.players[1].classKey = null;
    base.draft = { classes: DEMO_CLASSES };
  } else if (kind === "stock") {
    base.phase = "stock";
    base.lanes = [{ shield: 0, enemies: [] }, { shield: 0, enemies: [] }, { shield: 0, enemies: [] }];
    base.stock = {
      max: 12, anteRequired: 8, anteCurrent: 13, canBegin: true,
      palette: [
        { bodyKey: "accountant", name: "Angry Accountant", maxHp: 3, ante: 4, passive: "Strikes back when it's hit.", gear: [{ name: "Sword", text: "Deal 3 to the front foe." }] },
        { bodyKey: "royalRat", name: "Royal Rat", maxHp: 3, ante: 3, passive: "Summons a rat on its timer.", gear: [{ name: "Bow", text: "Deal 3 to your targeted foe." }] },
        { bodyKey: "killionaire", name: "Killionaire", maxHp: 13, ante: 10, passive: null, gear: [{ name: "Fire", text: "Deal 6 to your targeted foe." }] },
      ],
      placed: [
        { bodyKey: "killionaire", name: "Killionaire", lane: 0, ante: 10, gear: ["Fire"] },
        { bodyKey: "royalRat", name: "Royal Rat", lane: 1, ante: 3, gear: ["Bow"] },
        { bodyKey: "accountant", name: "Angry Accountant", lane: 2, ante: 4, gear: ["Sword"] },
      ],
    };
  } else if (kind === "won") {
    base.phase = "won";
    base.caravan = { hp: 11, max: 20 };
    base.lanes = [{ shield: 0, enemies: [] }, { shield: 0, enemies: [] }, { shield: 0, enemies: [] }];
    base.treasure = 14;
    base.loot = { pending: 6, cards: [
      { key: "fire", name: "Fire", text: "Deal 6 to your targeted foe.", cd: 70, value: 3 },
      { key: "lightning", name: "Lightning", text: "Deal 2 to every foe in your target's lane.", cd: 40, value: 2 },
      { key: "bow", name: "Bow", text: "Deal 3 to your targeted foe.", cd: 30, value: 1 },
    ] };
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
  state = buildDemoState(_demo);
  render();
});
$("leaveBtn").onclick = () => {
  if (ws) { ws.onclose = null; try { ws.close(); } catch {} ws = null; }
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
  else if (e.code === "Tab") { send({ type: "cycleTarget", dir: e.shiftKey ? -1 : 1 }); e.preventDefault(); }
  else if (e.code === "KeyQ") { send({ type: "swapBody" }); e.preventDefault(); }
  else if (e.code.startsWith("Digit") || e.code.startsWith("Numpad")) {
    const n = Number(e.code.replace(/\D/g, ""));
    if (n >= 1 && n <= 9) { send({ type: "use", slot: n - 1 }); e.preventDefault(); }
  }
});

// ---- rendering -----------------------------------------------------------
const cv = $("cv"), ctx = cv.getContext("2d");
function sizeCanvas() { cv.width = W; cv.height = H; }
sizeCanvas();

// mouse tracking for hover tooltips
const mouse = { x: -1, y: -1 };
let foeBoxes = []; // filled each render: { x, y, w, h, id } for click-to-target
const toCanvas = (e) => {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
};
cv.addEventListener("mousemove", (e) => { const p = toCanvas(e); mouse.x = p.x; mouse.y = p.y; render(); });
cv.addEventListener("mouseleave", () => { mouse.x = mouse.y = -1; render(); });
// click a foe to aim at it (Bow / Fire / Wind / Cold act on your aimed foe)
cv.addEventListener("click", (e) => {
  const p = toCanvas(e);
  const hit = foeBoxes.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
  if (hit) send({ type: "target", foeId: hit.id });
});

const colCenter = (i) => i * COLW + COLW / 2;

// Foe icons by body key. Emoji placeholders — replace a value with real art later
// (e.g. swap to drawing an Image keyed on bodyKey) and nothing else has to change.
const FOE_ICON = {
  rookie: "🎭", pixie: "🧚", auditAngel: "👼", killionaire: "🤑",
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
};

// Drawn foe art, lazily loaded from /foes/<bodyKey>.svg (generated by tools/generate-foe-art.js).
// Falls back to the emoji above until the image is ready.
const _foeSprites = {};
function foeSprite(key) {
  if (!(key in _foeSprites)) { const img = new Image(); img.src = `/foes/${key}.svg`; _foeSprites[key] = img; }
  return _foeSprites[key];
}

function render() {
  if (!state) return;
  const { lanes, caravan, players, bodies, phase } = state;

  // HUD
  $("caravan").textContent = `⛺ Caravan ${caravan.hp}/${caravan.max}`;
  const foesLeft = lanes.reduce((n, l) => n + l.enemies.length, 0);
  const ench = state.enchant ? ` · ✦ ${state.enchant.name}` : "";
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
  $("bodyInfo").textContent = me
    ? `${state.god ? "⚡GOD · " : ""}${bodies[me.bodyKey].name} ${me.hp}/${me.maxHp} · [Q] swap body (${state.unlockedBodies.length})`
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

  // enemies as readable cards: icon + name + ATK + HP + the charge telegraph.
  // index 0 = front (nearest the caravan), stacking upward.
  foeBoxes = [];
  const myTarget = me?.targetId;
  for (let i = 0; i < COLS; i++) {
    lanes[i].enemies.forEach((e, j) => {
      const b = bodies[e.bodyKey] || {};
      const frac = e.cd ? e.charge / e.cd : 0;
      const cardW = COLW - 18, cardH = 54;
      const x = i * COLW + 9;
      const y = PLAYER_Y - 78 - j * (cardH + 8);
      foeBoxes.push({ x, y, w: cardW, h: cardH, id: e.id }); // for click-to-target
      // card background + telegraph border (reddens as the attack nears)
      ctx.fillStyle = "#161b24"; roundRect(x, y, cardW, cardH, 8); ctx.fill();
      const targeted = e.id && e.id === myTarget;
      ctx.lineWidth = e.boss ? 4 : targeted ? 3 : 2;
      ctx.strokeStyle = targeted ? "#3df" : e.boss ? "#ffcf4a" : frac > 0.75 ? "#f55" : frac > 0.45 ? "#fc6" : (b.color || "#333");
      roundRect(x, y, cardW, cardH, 8); ctx.stroke();
      if (targeted) { ctx.font = "13px serif"; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText("🎯", x + cardW - 4, y + 3); }
      // boss flair: a crown, and a lock badge while it's warded (untouchable until its court falls)
      if (e.boss) { ctx.font = "13px serif"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(e.warded ? "♛🔒" : "♛", x + 4, y + 3); }
      // icon: drawn art from /foes/<bodyKey>.svg, emoji fallback until it loads
      const spr = foeSprite(e.bodyKey);
      if (spr.complete && spr.naturalWidth) {
        ctx.drawImage(spr, x + 5, y + (cardH - 38) / 2, 38, 38);
      } else {
        ctx.font = "24px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(FOE_ICON[e.bodyKey] || "❔", x + 22, y + 23);
      }
      // name
      ctx.fillStyle = "#e8e8ea"; ctx.font = "bold 11px ui-monospace, monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText((b.name || e.bodyKey).slice(0, 13), x + 47, y + 6);
      // power / hp  (⚔ shows live Physical Power; ▲N = visible ramp stacks)
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillStyle = "#fc8"; ctx.fillText(`⚔ ${e.phys ?? b.atk ?? 0}`, x + 47, y + 22);
      ctx.fillStyle = "#8e8"; ctx.fillText(`❤ ${e.hp}/${e.maxHp}`, x + 88, y + 22);
      if (e.counters > 0) { ctx.fillStyle = "#ffd24a"; ctx.fillText(`▲${e.counters}`, x + cardW - 32, y + 22); }
      // the item the foe wields — its NAME, sitting just above the charge bar
      if (e.gear && e.gear.length) {
        const g = e.gear[0];
        ctx.globalAlpha = g.spent ? 0.4 : 1;
        ctx.fillStyle = "#d9a3ff"; ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText((g.spent ? "✗ " : "") + g.name.slice(0, 13), x + 47, y + 34);
        ctx.globalAlpha = 1;
      }
      // a small marker if the body has a passive (full text on hover)
      if (e.passive) {
        ctx.fillStyle = "#7fd0ff"; ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.fillText("✦", x + cardW - 6, y + 20);
      }
      // charge bar (what you watch) across the bottom
      bar(x + 6, y + cardH - 10, cardW - 12, 6, frac, frac > 0.75 ? "#f55" : "#fc6", "#0008");
      // remember this card for hover-inspect
      foeBoxes[foeBoxes.length - 1].e = e;
    });
  }

  // friendly summons: small tokens just in front of the player, blocking the lane
  for (let i = 0; i < COLS; i++) {
    const al = lanes[i].allies || [];
    al.forEach((a, j) => {
      const ax = colCenter(i) + (j - (al.length - 1) / 2) * 26;
      const ay = PLAYER_Y - 48;
      // friendly green ring marks it as a blocker on your side
      ctx.beginPath(); ctx.arc(ax, ay, 11, 0, Math.PI * 2);
      ctx.fillStyle = "#10221a"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "#3ec98a"; ctx.stroke();
      // the actual creature glyph (rats are 🐀), with a small HP pip
      ctx.font = "13px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(FOE_ICON[a.bodyKey] || "🐀", ax, ay + 1);
      ctx.fillStyle = "#bfe8d4"; ctx.font = "bold 8px ui-monospace, monospace";
      ctx.textBaseline = "top";
      ctx.fillText(String(a.hp), ax, ay + 11);
    });
  }

  // players (just in front of the caravan, in their lane). Your body's HP is your shield.
  for (const p of players) {
    const px = colCenter(p.lane) + lanePush(players, p), mine = p.id === you;
    ctx.globalAlpha = p.alive ? 1 : 0.3;
    ctx.beginPath(); ctx.arc(px, PLAYER_Y, 15, 0, Math.PI * 2);
    ctx.fillStyle = bodies[p.bodyKey]?.color ?? "#68a"; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = mine ? "#fff" : "#0008"; ctx.stroke();
    bar(px - 16, PLAYER_Y + 18, 32, 4, p.hp / p.maxHp, p.hp / p.maxHp > 0.4 ? "#6c6" : "#e66");
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#cfd3dc"; ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(mine ? "YOU" : p.name, px, PLAYER_Y - 18);
    if (!p.alive) { ctx.fillStyle = "#e66"; ctx.fillText("DOWN", px, PLAYER_Y + 36); }
  }

  // caravan bar (the shared thing you defend)
  ctx.fillStyle = "#1a1f29"; ctx.fillRect(0, CARAVAN_Y, W, CARAVAN_H);
  ctx.fillStyle = caravan.hp / caravan.max > 0.35 ? "#5a3" : "#c44";
  ctx.fillRect(0, CARAVAN_Y, W * Math.max(0, caravan.hp) / caravan.max, CARAVAN_H);
  ctx.fillStyle = "#fff"; ctx.font = "bold 13px ui-monospace, monospace";
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
  lines.push(`❤ ${e.hp}/${e.maxHp} HP    ⚔ ${e.atk} atk`);
  if (e.cd) lines.push(`⏱ acts every ${(e.cd / 10).toFixed(1)}s`);
  if (e.passive) lines.push(`✦ ${e.passive}`);
  if (e.gear && e.gear.length) {
    const g = e.gear[0];
    lines.push(`◆ ${g.name}${g.spent ? " (spent)" : `  ·  ${(g.cd / 10).toFixed(1)}s cd`}`);
    if (g.text) lines.push(`   ${g.text}`);
  }
  ctx.font = "11px ui-monospace, monospace";
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
let _draftSig = "", _stockSig = "", _brSig = "";
const NODE_LABEL = { combat: "Fight ▶", elite: "Elite ★ ▶", boss: "BOSS ♛ ▶" };
function renderOverlay() {
  const ov = $("draftOverlay");
  if (state?.phase === "draft" && state.draft) return renderDraft();
  if (state?.phase === "stock" && state.stock) return renderStock();
  if (state?.phase === "won") return renderBetweenRooms();
  if (!ov.classList.contains("hidden")) { ov.classList.add("hidden"); ov.innerHTML = ""; _draftSig = _stockSig = _brSig = ""; }
}

// The between-rooms screen: grab loot (free; whatever you leave becomes Treasure),
// spend Treasure on kit space, manage your kit, then choose the next room.
function renderBetweenRooms() {
  const ov = $("draftOverlay");
  const me = state.players.find((p) => p.id === you) || {};
  const kit = me.kit || [];
  const slots = me.kitSlots ?? 5;
  const treasure = state.treasure || 0;
  const loot = state.loot;
  const map = state.map || {};
  const complete = !!map.levelComplete;
  const cur = (map.nodes || []).find((n) => n.id === map.currentId);
  const nexts = complete ? [] : (cur?.links || []).map((id) => (map.nodes || []).find((n) => n.id === id)).filter(Boolean);
  const sig = JSON.stringify([loot && [loot.cards.map((c) => c.key), loot.pending], kit.map((k) => k.key),
    slots, me.kitSlotCost, treasure, nexts.map((n) => [n.id, n.type]), complete, state.floor]);
  if (sig === _brSig) return;
  _brSig = sig;

  const full = kit.length >= slots;
  const lootSection = loot && loot.cards.length ? `
    <p class="draft-sub" style="margin-top:6px">Spoils — free to grab. What you <b>leave</b> banks as <b class="tre">💰${loot.pending}</b> Treasure${full ? ` · <span class="ante-no">kit full</span>` : ""}:</p>
    <div class="draft-grid">${loot.cards.map((c) => `
      <button class="draft-opt" data-loot="${c.key}" ${full ? "disabled" : ""} title="grab it, or leave it for 💰${c.value}">
        <span class="dn">＋ ${c.name} <b class="tre">💰${c.value}</b></span><span class="dt">${c.text}</span>
        <span class="dcd">${c.cd != null ? (c.cd / 10).toFixed(1) + "s cd" : ""}</span>
      </button>`).join("")}</div>` : `<p class="draft-sub" style="margin-top:6px">No loot dropped.</p>`;

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
    ${lootSection}${kitSection}${advanceSection}
  </div>`;
  ov.querySelectorAll("[data-loot]").forEach((b) => b.onclick = () => send({ type: "claimLoot", key: b.dataset.loot }));
  ov.querySelectorAll("[data-drop]").forEach((b) => b.onclick = () => send({ type: "dropItem", key: b.dataset.drop }));
  ov.querySelectorAll("[data-buyslot]").forEach((b) => b.onclick = () => send({ type: "buyKitSlot" }));
  ov.querySelectorAll("[data-advance]").forEach((b) => b.onclick = () => send({ type: "advance", to: b.dataset.advance }));
  const desc = ov.querySelector("[data-descend]");
  if (desc) desc.onclick = () => send({ type: "descend" });
}

const LANE_NAMES = ["Left", "Mid", "Right"];
function renderStock() {
  const ov = $("draftOverlay");
  const s = state.stock;
  const sig = JSON.stringify([s.palette, s.placed, s.anteCurrent, s.anteRequired, state.floor, state.enchant]);
  if (sig === _stockSig) return;
  _stockSig = sig;

  const palette = s.palette.map((o, idx) => {
    const item = o.gear[0] ? `<span class="fgear">◆ <b>${o.gear[0].name}</b> — ${o.gear[0].text}</span>` : "";
    const pass = o.passive ? `<span class="fpass">✦ ${o.passive}</span>` : "";
    return `<div class="foe-opt">
      <span class="fn">${FOE_ICON[o.bodyKey] || ""} ${o.name} <b class="fante">${o.ante}⚜</b></span>
      <span class="fstat">❤ ${o.maxHp} HP</span>
      ${item}${pass}
      <span class="fadd"><button class="lane-btn" data-add="${idx}">+ Add</button></span>
    </div>`;
  }).join("");

  const lanes = [0, 1, 2].map((l) => {
    const inLane = s.placed.map((f, i) => ({ f, i })).filter((x) => x.f.lane === l);
    const chips = inLane.map(({ f, i }) =>
      `<button class="foe-chip" data-remove="${i}" title="click to remove">${FOE_ICON[f.bodyKey] || ""} ${f.name}${f.gear.length ? " ✦" : ""}</button>`
    ).join("") || `<span class="lane-empty">— empty —</span>`;
    return `<div class="stock-lane"><div class="stock-lane-h">${LANE_NAMES[l]}</div>${chips}</div>`;
  }).join("");

  const over = s.anteCurrent > s.anteRequired ? ` <span class="ante-over">(+${s.anteCurrent - s.anteRequired} greed)</span>` : "";
  const anteLabel = s.canBegin
    ? `Ante <b class="ante-ok">${s.anteCurrent}</b> / ${s.anteRequired} met${over} — keep stocking for richer loot, or begin`
    : `Ante <b class="ante-no">${s.anteCurrent}</b> / ${s.anteRequired} — stock more to reach the minimum`;
  const ench = state.enchant ? `<p class="enchant-line">Floor ${state.floor} · ✦ <b>${state.enchant.name}</b> — ${state.enchant.text}</p>` : "";
  ov.classList.remove("hidden");
  ov.innerHTML = `<div class="draft-card stock-wide">
    <h2>Stock the room</h2>
    ${ench}
    <p class="draft-sub">${anteLabel} · ${s.placed.length}/${s.max} foes · added foes auto-fill lanes left→right</p>
    <div class="foe-palette">${palette}</div>
    <div class="stock-lanes">${lanes}</div>
    <button class="stock-begin" ${s.canBegin ? "" : "disabled"}>${s.canBegin ? "Begin combat ▶" : "Ante not met"}</button>
  </div>`;
  ov.querySelectorAll("[data-add]").forEach((b) =>
    b.onclick = () => send({ type: "stockAdd", idx: +b.dataset.add }));
  ov.querySelectorAll("[data-remove]").forEach((b) =>
    b.onclick = () => send({ type: "stockRemove", i: +b.dataset.remove }));
  ov.querySelector(".stock-begin").onclick = () => send({ type: "stockBegin" });
}

function renderDraft() {
  const ov = $("draftOverlay");
  const me = state.players.find((p) => p.id === you);
  const myClass = me?.classKey ?? null;
  const classes = state.draft.classes;
  const sig = JSON.stringify([classes.map((c) => c.key), myClass,
    state.players.map((p) => [p.name, p.classKey])]);
  if (sig === _draftSig) return;
  _draftSig = sig;

  const cards = classes.map((c) => {
    const chosen = myClass === c.key;
    const kit = c.kit.map((k) => `<li><b>${k.name}</b> — ${k.text}</li>`).join("");
    return `<button class="class-opt${chosen ? " taken" : ""}" data-key="${c.key}">
      <span class="cn" style="color:${c.body.color}">${chosen ? "✓ " : ""}${c.name}</span>
      <span class="cstat">❤ ${c.body.maxHp} HP&nbsp;&nbsp;·&nbsp;&nbsp;you act only through items</span>
      <span class="cblurb">${c.blurb}</span>
      <ul class="ckit">${kit}</ul>
    </button>`;
  }).join("");
  const status = state.players.map((p) => {
    const done = !!p.classKey;
    const who = p.id === you ? "You" : p.name;
    const label = done ? (classes.find((c) => c.key === p.classKey)?.name ?? p.classKey) : "choosing…";
    return `<span class="${done ? "ready" : ""}">${who}: ${label}${done ? " ✓" : ""}</span>`;
  }).join("");

  ov.classList.remove("hidden");
  ov.innerHTML = `<div class="draft-card">
    <h2>Choose your class</h2>
    <p class="draft-sub">Your body + a 3-card starter kit · locks in automatically when everyone's chosen</p>
    <div class="class-grid">${cards}</div>
    <div class="draft-status">${status}</div>
  </div>`;
  ov.querySelectorAll(".class-opt").forEach((b) => {
    b.onclick = () => send({ type: "chooseClass", key: b.dataset.key });
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
    const frac = Math.min(1, item.charge / item.cd);
    // cooldown overlay: fills up from the bottom as the item recharges
    ctx.fillStyle = item.spent ? "#2a2230" : item.ready ? "#2a6" : "#3a4150";
    ctx.save(); roundRect(bx, by, bw, bh, 8); ctx.clip();
    ctx.fillRect(bx, by + bh * (1 - frac), bw, bh * frac);
    ctx.restore();
    // border (gold when ready, purple for a fragile item)
    ctx.lineWidth = 2; ctx.strokeStyle = item.spent ? "#5a4a6a" : item.ready ? "#e6c34a" : item.fragile ? "#9a7fd0" : "#2a2f3a";
    roundRect(bx, by, bw, bh, 8); ctx.stroke();
    // labels: slot number + item name
    ctx.globalAlpha = item.spent ? 0.45 : 1;
    ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.font = "bold 12px ui-monospace, monospace"; ctx.fillText(String(k + 1), bx + 6, by + 5);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 13px ui-monospace, monospace"; ctx.fillText(item.name, bx + bw / 2, by + bh / 2);
    if (item.spent) {
      ctx.fillStyle = "#c9a9e0"; ctx.font = "10px ui-monospace, monospace"; ctx.textBaseline = "bottom";
      ctx.fillText("SPENT", bx + bw / 2, by + bh - 4);
    } else if (!item.ready) {
      ctx.fillStyle = "#cdd"; ctx.font = "10px ui-monospace, monospace"; ctx.textBaseline = "bottom";
      ctx.fillText(((item.cd - item.charge) / 10).toFixed(1) + "s", bx + bw / 2, by + bh - 4);
    } else if (item.fragile) {
      ctx.fillStyle = "#c9a9e0"; ctx.font = "9px ui-monospace, monospace"; ctx.textBaseline = "bottom";
      ctx.fillText("1×", bx + bw / 2, by + bh - 4);
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
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
