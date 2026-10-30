// King Mimic — Dungeon (RPG crawler). This file is the eyes and thumbs: canvas floor, left-thumb stick, and
// on the right your WEAPON (big button) plus two MINOR ACTIONS. The rules all live in engine/rpg/sim.js:
//   • SOLO (no ?room=): the run is simulated right here in the page, every frame.
//   • CO-OP (/?room=CODE, up to 4 phones): the server runs the run; this page mirrors it
//     (engine/rpg/net.js), moves your own mimic instantly and reports it, and sends your attacks.
//
// Aiming (FLICK's verb, kept): press a button and drag — a reticle grows from your mimic showing exactly
// what it will hit, how hard, and where the pushback sends them (the same shapeOf / dmgAgainst / pushOf
// the attack resolves with). Let go to unleash. TAP a button = unleash at your target. Flick anywhere on
// the right side of the screen = swing your weapon that way. Drag back onto where you started to cancel.
// Hold a button to read it. Tap anything on the floor to read it (tapping a foe also makes it your target).
// Attacking while still winding up QUEUES the next one.

import { CARDS, BODIES, UNITS, FLOORS, TUNING, PLAYER_COLORS } from "/engine/rpg/content.js";
import {
  createRun, step, play, setMove, playerOf, shapeOf, hitsOf, dmgOf, dmgAgainst, pushOf, pushDir, shoveDist, windupOf,
  cooldownOf, cdLeft, blockedWhy, slotKey, walk, equip, unequip, wearItem, descend, itemUnder, onStairs, foeIntent, statsFor,
} from "/engine/rpg/sim.js";
import { mirrorFrom, applySnap, advanceMirror } from "/engine/rpg/net.js";
import { botThink } from "/engine/rpg/bot.js";

const $ = (id) => document.getElementById(id);
const DEAD = 12;          // px of drag before a press becomes an aim
const AIM_PX = 100;       // px of drag that reaches a placed attack's full range
const HOLD_MS = 380;      // hold a button this long without dragging to read it
const ROOM = (new URLSearchParams(location.search).get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || null;
const CID = sessionStorage.kmRpgCid || (sessionStorage.kmRpgCid = Math.random().toString(36).slice(2, 12));   // per tab
let PID = ROOM ? null : "you";   // co-op: the public id the server hands this phone (its seat id stays private)
let S = null, chosenBody = null, lookCard = null;
let pickW = null, pickA = [], pickD = [];

// ------------------------------------------------------------------ canvas + art
const cv = $("cv"), ctx = cv.getContext("2d");
let W = 0, H = 0, DPR = 1, TS = 36;
const cam = { x: 0, y: 0 };
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  TS = Math.max(26, Math.min(54, Math.min(H / 10.5, W / 19)));     // ~19 × 10.5 tiles on a landscape phone
}
addEventListener("resize", resize); resize();
const sx = (x) => (x - cam.x) * TS + W / 2, sy = (y) => (y - cam.y) * TS + H / 2;
const wxOf = (px) => (px - W / 2) / TS + cam.x, wyOf = (py) => (py - H / 2) / TS + cam.y;

const IMG = {};
const img = (src) => IMG[src] ?? Object.assign((IMG[src] = new Image()), { src });
const bodyArt = (k) => `/foes/${BODIES[k].art}.svg`;
const cardArt = (k) => `/cards/${CARDS[k].art}.svg`;
const entArt = (e) => (e.kind === "unit" ? `/foes/${UNITS[e.unit].art}.svg` : bodyArt(e.body));
for (const k in BODIES) img(bodyArt(k));
for (const k in CARDS) img(cardArt(k));
for (const k in UNITS) img(`/foes/${UNITS[k].art}.svg`);

const COL = { gold: "#ffcf4a", teal: "#3ee6c4", coral: "#ff6b5a", green: "#6be38a", sky: "#9fd8ff" };
const TYPE_COL = { weapon: "#ffcf4a", deck: "#7fb8ff", action: "#c79bff" };
const TAG_WORD = { melee: "Melee", ranged: "Ranged", spell: "Spell" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const secs = (v) => `${Math.round(v * 100) / 100}s`;
const floorName = (n) => FLOORS[n]?.name?.split(" ")[0] ?? `B${n + 1}F`;

// ------------------------------------------------------------------ co-op connection
let ws = null, lobby = null, replaced = false, lastMoveSent = 0;
function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws?room=${ROOM}&cid=${CID}`);
  ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch { return; } onNet(m); };
  ws.onclose = () => { if (!replaced) setTimeout(connect, 1200); };
}
const sendNet = (m) => { if (ws?.readyState === 1) ws.send(JSON.stringify(m)); };
function onNet(m) {
  if (m.t === "lobby") { lobby = m; renderCoop(); }
  else if (m.t === "init") {
    const newFloor = S?.remote && S.floorN !== m.floorN;
    PID = m.you; S = mirrorFrom(m); startView(newFloor);
  }
  else if (m.t === "snap") { if (S?.remote) applySnap(S, m, PID, performance.now()); }
  else if (m.t === "reset") { if (S?.remote) { S = null; backToPick(); } }
  else if (m.t === "full") toast("This room is full — four players already");
  else if (m.t === "replaced") { replaced = true; toast("This game opened in another tab"); }
}
if (ROOM) connect();

// ------------------------------------------------------------------ start screens
function showScreen(id) {
  for (const s of ["pick-body", "pick-load"]) $(s).classList.toggle("hidden", s !== id);
  $("hud").classList.toggle("hidden", id !== null);
}
function renderCoop() {
  const box = $("coop");
  if (!ROOM) { box.innerHTML = `<button id="coop-make" class="ghost">Play with friends</button>`; return; }
  const ps = lobby?.players ?? [];
  const who = ps.length ? ps.map((p) => `<span class="pp" style="--pc:${p.color}"><img src="${bodyArt(p.body)}" alt="">${esc(p.name)}${p.down ? " (down)" : p.away ? " (away)" : ""}</span>`).join("") : `<span class="dim">Nobody's in yet.</span>`;
  const state = !lobby ? "Connecting…" : ps.length >= (lobby.max ?? 4) ? "Room full" : lobby.running && lobby.phase === "play" ? "Run in progress — you'll appear beside your friends" : "Pick a body and loadout to start";
  box.innerHTML = `<span class="room">Room <b>${ROOM}</b></span><button id="coop-invite" class="ghost">Invite</button>
    <input id="coop-name" maxlength="16" placeholder="Your name" value="${esc(localStorage.kmRpgName ?? "")}">
    <span class="who">${who}</span><span class="dim">${esc(state)}</span><a class="dim" href="/">Solo</a>`;
}
$("coop").addEventListener("click", async (ev) => {
  if (ev.target.id === "coop-make") { const code = Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join(""); location.search = `?room=${code}`; }
  if (ev.target.id === "coop-invite") {
    const url = `${location.origin}/?room=${ROOM}`;
    try { if (navigator.share) await navigator.share({ title: "King Mimic", text: "Join my dive", url }); else { await navigator.clipboard.writeText(url); toast("Invite link copied"); } }
    catch { toast(url); }
  }
});
$("coop").addEventListener("input", (ev) => { if (ev.target.id === "coop-name") localStorage.kmRpgName = ev.target.value.slice(0, 16); });

function renderBodies() {
  const starters = Object.keys(BODIES).filter((k) => BODIES[k].starter);
  $("bodies").innerHTML = starters.map((k) => {
    const b = BODIES[k], w = CARDS[b.suggested.weapon];
    return `<button class="bodycard ${chosenBody === k ? "sel" : ""}" data-body="${k}">
      <img src="${bodyArt(k)}" alt=""><b>${esc(b.name)}</b>
      <span class="pas">${esc(b.passiveText)}</span>
      <span class="sug">Suggested: ${esc(w.name)}</span></button>`;
  }).join("");
  $("to-load").disabled = !chosenBody;
  renderCoop();
}
$("bodies").addEventListener("click", (ev) => {
  const b = ev.target.closest(".bodycard"); if (!b) return;
  if (chosenBody !== b.dataset.body) {
    chosenBody = b.dataset.body; const sg = BODIES[chosenBody].suggested;
    pickW = sg.weapon; pickA = sg.actions.slice(); pickD = sg.deck.slice(0, 1); lookCard = null;
  }
  renderBodies();
});
$("to-load").addEventListener("click", () => { if (!chosenBody) return; showScreen("pick-load"); renderLoad(); });
$("back").addEventListener("click", () => { showScreen("pick-body"); renderBodies(); });

function shapeWords(c) {
  const s = c.shape;
  switch (s.kind) {
    case "arc": return `Swing · reach ${s.r} · ${s.deg}° wide`;
    case "line": return `Thrust · ${s.len} long · hits all on it`;
    case "shot": return `Projectile · range ${s.range}${s.pierce ? " · pierces" : " · first foe it meets"}${s.homing ? " · seeks" : ""}`;
    case "circle": return c.summon ? `Summon · up to ${s.range} away` : `Placed · radius ${s.r} · up to ${s.range} away`;
    case "self": return s.r ? `Around you · radius ${s.r}` : "On you";
    case "dash": return `Dash · ${s.len} tiles`;
  }
  return "";
}
const MOD_WORDS = { hp: "health", speed: "speed", size: "size", meleeDmg: "melee damage", rangedDmg: "ranged damage", spellDmg: "spell damage",
  allDmg: "all damage", armor: "armor", meleeResist: "melee resist", rangedResist: "ranged resist", spellResist: "spell resist",
  roomShield: "shield per fight", swing: "swing speed", push: "pushback", reach: "reach", cooldown: "action recharge", lifesteal: "lifesteal",
  thorns: "thorns", poise: "poise" };
const pct = new Set(["speed", "size", "meleeDmg", "rangedDmg", "spellDmg", "allDmg", "meleeResist", "rangedResist", "spellResist", "swing", "push", "reach", "cooldown", "lifesteal", "poise"]);
const modWords = (m) => Object.entries(m).map(([k, v]) => `${v > 0 ? "+" : "−"}${pct.has(k) ? `${Math.round(Math.abs(v) * 100)}%` : Math.abs(v)} ${MOD_WORDS[k] ?? k}`).join(" · ");
function cardFacts(k, e) {
  const c = CARDS[k], ee = e ?? { body: chosenBody, kind: "player", mods: {} };
  if (c.type === "deck") return modWords(c.mods);
  const bits = [TAG_WORD[c.tag], `wind-up ${secs(windupOf(ee, k))}`];
  if (c.type === "weapon") bits.push(`recovery ${secs(c.recover ?? 0)}`);
  if (c.type === "action") bits.push(`recharge ${secs(cooldownOf(ee, k))}`);
  if (c.dmg) bits.push(`${c.dmg} dmg`);
  if (c.push) bits.push(`push ${c.push}`);
  return bits.join(" · ");
}
function cardDetailHtml(k, e) {
  const c = CARDS[k];
  return `<div class="hd"><img src="${cardArt(k)}" alt=""><div><b>${esc(c.name)}</b><br><span class="kind" style="--tc:${TYPE_COL[c.type]}">${c.type === "deck" ? "Deck card" : c.type === "action" ? "Minor action" : "Weapon"}</span></div></div>
    <div class="row">${esc(cardFacts(k, e))}</div>
    ${c.shape ? `<div class="row">${esc(shapeWords(c))}</div>` : ""}
    <div class="row txt"><b>${esc(c.text)}</b></div>`;
}
const listOf = (type) => Object.keys(CARDS).filter((k) => CARDS[k].type === type && !CARDS[k].natural);
function renderLoad() {
  const b = BODIES[chosenBody];
  $("load-sum").innerHTML = `<img src="${bodyArt(chosenBody)}" alt=""> ${esc(b.name)} — ${esc(b.passiveText)}`;
  const tile = (k, on) => { const c = CARDS[k];
    return `<button class="tile ${on ? "in" : ""} ${lookCard === k ? "look" : ""}" data-card="${k}" style="--gc:${TYPE_COL[c.type]}">
      <img src="${cardArt(k)}" alt=""><span class="t"><b>${esc(c.name)}</b><small>${esc(c.type === "deck" ? modWords(c.mods) : `${TAG_WORD[c.tag]} · ${secs(windupOf({ body: chosenBody, kind: "player", mods: {} }, k))}${c.cooldown ? ` · ${c.cooldown}s` : ""}`)}</small></span></button>`; };
  $("pool").innerHTML =
    `<h3>Weapon <small>pick 1 — your main attack</small></h3>${listOf("weapon").map((k) => tile(k, pickW === k)).join("")}
     <h3>Minor actions <small>pick ${TUNING.actionSlots} — on cooldowns</small></h3>${listOf("action").map((k) => tile(k, pickA.includes(k))).join("")}
     <h3>Deck <small>level 1 = 1 slot · one more slot every level</small></h3>${listOf("deck").map((k) => tile(k, pickD.includes(k))).join("")}`;
  $("enter").disabled = !(pickW && pickA.length === TUNING.actionSlots && pickD.length === 1);
  $("detail").innerHTML = lookCard ? cardDetailHtml(lookCard)
    : `<div class="row"><b>${esc(b.name)}</b>: ${esc(b.passiveText)}</div>
       <div class="row">Your <b>weapon</b> is your main attack — free and endless; its wind-up is its swing speed.</div>
       <div class="row"><b>Minor actions</b> recharge after use. <b>Deck</b> cards change your stats; you get one more deck slot every level.</div>
       <div class="row">Cards you find go in your <b>Bag</b> — swap them in any time.</div>`;
}
$("pool").addEventListener("click", (ev) => {
  const t = ev.target.closest(".tile"); if (!t) return;
  const k = t.dataset.card, c = CARDS[k]; lookCard = k;
  if (c.type === "weapon") pickW = k;
  else {
    const list = c.type === "action" ? pickA : pickD, max = c.type === "action" ? TUNING.actionSlots : 1;
    const i = list.indexOf(k);
    if (i >= 0) list.splice(i, 1); else { if (list.length >= max) list.shift(); list.push(k); }
  }
  renderLoad();
});
$("enter").addEventListener("click", () => startRun());
$("again").addEventListener("click", () => {
  if (S?.remote) { sendNet({ t: "again" }); return; }
  S = null; backToPick();
});
function backToPick() {
  for (const id of ["end", "bag", "info"]) $(id).classList.add("hidden");
  showScreen("pick-body"); renderBodies();
}

let botMem = {};
function startRun() {
  const lo = { body: chosenBody, weapon: pickW, actions: pickA.slice(), deck: pickD.slice() };
  if (ROOM) { sendNet({ t: "join", ...lo, name: localStorage.kmRpgName || "" }); return; }
  S = createRun({ seed: (Math.random() * 2147483646 + 1) | 0, players: [{ id: PID, ...lo }] });
  startView(false);
}
function startView(newFloor) {
  armed = -1; pending = null; aim = null; targetId = null; infoFor = null; botMem = {}; lastFx = newFloor ? lastFx : 0; firstPlay = firstPlay && newFloor;
  hurtAt.clear(); floaters.length = 0; camSet = false; hudSig = ""; ctxSig = ""; bagSig = "";
  $("info").classList.add("hidden");
  if (!newFloor) for (const id of ["bag", "end"]) $(id).classList.add("hidden");
  showScreen(null);
  $("roomchip").classList.toggle("hidden", !ROOM); $("roomchip").textContent = ROOM ? `Room ${ROOM}` : "";
  if (newFloor) toast(FLOORS[S.floorN]?.name ?? "Deeper…");
  try { if (matchMedia("(pointer: coarse)").matches) document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
}
$("roomchip").addEventListener("click", () => navigator.clipboard?.writeText(`${location.origin}/?room=${ROOM}`).then(() => toast("Invite link copied")));

// ------------------------------------------------------------------ input
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0, t0: 0, moved: 0 };
const STICK_R = 54;
let aim = null;          // live gesture {id, slot, sx, sy, t0, moved, from: "card"|"field", dir, len, holdTimer}
let armed = -1;          // slot whose reticle is showing
let pending = null;      // queued attack {slot, key, a, at}
let targetId = null;     // the foe you tapped
let firstPlay = false;
const keys = new Set();
let mouse = null;        // desktop aim

const me = () => S && playerOf(S, PID);
const overlayOpen = () => !$("bag").classList.contains("hidden") || !$("end").classList.contains("hidden");
const bagOpen = () => !$("bag").classList.contains("hidden");

addEventListener("pointerdown", (ev) => {
  if (!S || overlayOpen() || !me()) return;
  const card = ev.target.closest?.(".card");
  if (card) { ev.preventDefault(); cardDown(ev, +card.dataset.slot); return; }
  if (ev.target !== cv) return;                       // HUD buttons handle their own taps
  if (ev.pointerType === "mouse") {
    mouse = { x: ev.clientX, y: ev.clientY };
    if (ev.button === 0) { const hit = pickEnt(ev.clientX, ev.clientY); if (hit && hit.side === "hero") tapAt(ev.clientX, ev.clientY); else castSlot(0, defaultAim(0)); }
    return;
  }
  // left side = the stick; a new touch there takes the stick over (a lost finger-up can't leave it stuck)
  if (ev.clientX < W * 0.45) {
    Object.assign(stick, { id: ev.pointerId, ox: ev.clientX, oy: ev.clientY, x: ev.clientX, y: ev.clientY, vx: 0, vy: 0, t0: performance.now(), moved: 0 });
    return;
  }
  if (aim) clearTimeout(aim.holdTimer);
  // right side, off the buttons: a flick here swings your weapon that way; a tap reads what's under it
  aim = { id: ev.pointerId, slot: 0, sx: ev.clientX, sy: ev.clientY, t0: performance.now(), moved: 0, from: "field", dir: null, len: 0 };
}, { passive: false });

addEventListener("pointermove", (ev) => {
  if (ev.pointerType === "mouse") { mouse = { x: ev.clientX, y: ev.clientY }; return; }
  if (ev.pointerId === stick.id) {
    const dx = ev.clientX - stick.ox, dy = ev.clientY - stick.oy, d = Math.hypot(dx, dy);
    stick.moved = Math.max(stick.moved, d);
    if (d > STICK_R) { stick.ox = ev.clientX - (dx / d) * STICK_R; stick.oy = ev.clientY - (dy / d) * STICK_R; }
    stick.x = ev.clientX; stick.y = ev.clientY;
    const ddx = stick.x - stick.ox, ddy = stick.y - stick.oy, dd = Math.hypot(ddx, ddy);
    const mag = dd < 6 ? 0 : Math.min(1, dd / STICK_R);
    stick.vx = dd ? (ddx / dd) * mag : 0; stick.vy = dd ? (ddy / dd) * mag : 0;
  } else if (aim && ev.pointerId === aim.id) {
    const dx = ev.clientX - aim.sx, dy = ev.clientY - aim.sy, d = Math.hypot(dx, dy);
    aim.moved = Math.max(aim.moved, d); aim.len = d;
    aim.dir = d > DEAD ? [dx / d, dy / d] : null;
    if (aim.moved > DEAD && aim.holdTimer) { clearTimeout(aim.holdTimer); aim.holdTimer = null; }
    if (aim.moved > DEAD && aim.from === "field") armed = 0;
    if (aim.moved > DEAD && aim.from === "card" && infoFor?.card) { infoFor = null; $("info").classList.add("hidden"); }
  }
}, { passive: false });

function endPointer(ev) {
  if (ev.pointerId === stick.id) {
    if (stick.moved < 10 && performance.now() - stick.t0 < 300) tapAt(ev.clientX, ev.clientY);
    stick.id = null; stick.vx = stick.vy = 0; return;
  }
  if (!aim || ev.pointerId !== aim.id) return;
  const a = aim; aim = null; clearTimeout(a.holdTimer); armed = -1;
  const quick = performance.now() - a.t0 < HOLD_MS;
  if (a.from === "field") {
    if (a.moved <= DEAD) tapAt(ev.clientX, ev.clientY);
    else if (a.len > DEAD) castSlot(0, rawAim(0, a.dir, a.len));
    return;
  }
  if (a.moved <= DEAD) { if (quick) castSlot(a.slot, defaultAim(a.slot)); return; }   // tap = unleash at your target; a hold just read it
  if (a.len <= DEAD) { toast("Cancelled"); return; }                                   // dragged back to where it began
  castSlot(a.slot, rawAim(a.slot, a.dir, a.len));
}
addEventListener("pointerup", endPointer);
addEventListener("pointercancel", (ev) => {     // the OS took the touch: drop it, never attack from it
  if (ev.pointerId === stick.id) { stick.id = null; stick.vx = stick.vy = 0; }
  if (aim && ev.pointerId === aim.id) { clearTimeout(aim.holdTimer); aim = null; armed = -1; }
});
function dropTouches() { stick.id = null; stick.vx = stick.vy = 0; if (aim) clearTimeout(aim.holdTimer); aim = null; armed = -1; keys.clear(); }
addEventListener("blur", dropTouches);
document.addEventListener("visibilitychange", () => { if (document.hidden) dropTouches(); });

function cardDown(ev, slot) {
  const e = me(); if (!e || !slotKey(e, slot)) return;
  if (aim) clearTimeout(aim.holdTimer);
  if (pending && pending.slot === slot) { pending = null; toast("Unqueued"); return; }
  aim = { id: ev.pointerId, slot, sx: ev.clientX, sy: ev.clientY, t0: performance.now(), moved: 0, from: "card", dir: null, len: 0 };
  armed = slot;
  aim.holdTimer = setTimeout(() => { if (aim && aim.slot === slot && aim.moved <= DEAD) showCardInfo(slotKey(me(), slot)); }, HOLD_MS);
}

addEventListener("keydown", (ev) => {
  if (!S || ev.target?.tagName === "INPUT" || overlayOpen()) return;
  keys.add(ev.key.toLowerCase());
  if (ev.key === " ") castSlot(0, defaultAim(0));
  if (ev.key === "1" || ev.key === "2") castSlot(+ev.key, defaultAim(+ev.key));
  if (ev.key === "b") openBag();
  if (ev.key === "Escape") { $("info").classList.add("hidden"); infoFor = null; }
});
addEventListener("keyup", (ev) => keys.delete(ev.key.toLowerCase()));
addEventListener("contextmenu", (ev) => ev.preventDefault());

// ---- aim: what a gesture means in the world ----
function liveFoes() { return S.ents.filter((o) => !o.dead && o.side === "foe" && (o.kind === "unit" || o.awake)); }
function autoTarget() {
  const e = me(); const foes = liveFoes(); if (!foes.length) return null;
  const t = foes.find((f) => f.id === targetId); if (t) return t;
  const bodies = foes.filter((f) => f.kind === "foe"), pool = bodies.length ? bodies : foes;
  return pool.reduce((a, b) => (Math.hypot(a.x - e.x, a.y - e.y) <= Math.hypot(b.x - e.x, b.y - e.y) ? a : b));
}
function autoAim(slot) {
  const e = me(), t = autoTarget(), c = CARDS[slotKey(e, slot)];
  if (!t) return { dx: e.fx, dy: e.fy, dist: c?.shape.range ? c.shape.range * 0.6 : 0 };
  return { dx: t.x - e.x, dy: t.y - e.y, dist: Math.hypot(t.x - e.x, t.y - e.y) };
}
// raw drag → aim, then a light, VISIBLE assist (the preview shows the snapped result — still honest)
function rawAim(slot, dir, len) {
  const key = slotKey(me(), slot); if (!key) return null;
  if (!dir) return autoAim(slot);
  const c = CARDS[key];
  const a = { dx: dir[0], dy: dir[1], dist: c.shape.kind === "circle" ? Math.max(0, Math.min(1, (len - DEAD) / AIM_PX)) * c.shape.range : undefined };
  return assist(key, a);
}
function mouseAim(slot) {
  const e = me(), key = slotKey(e, slot); if (!key || !mouse) return autoAim(slot);
  const x = wxOf(mouse.x), y = wyOf(mouse.y);
  return assist(key, { dx: x - e.x, dy: y - e.y, dist: Math.hypot(x - e.x, y - e.y) });
}
function assist(key, a) {
  const e = me(), c = CARDS[key], foes = liveFoes();
  if (!foes.length || c.shape.kind === "self" || c.iframes) return a;
  const d0 = Math.hypot(a.dx, a.dy) || 1, ux = a.dx / d0, uy = a.dy / d0;
  if (c.shape.kind === "circle") {
    const px = e.x + ux * (a.dist ?? 0), py = e.y + uy * (a.dist ?? 0);
    let best = null, bd = 1.0;
    for (const f of foes) { const d = Math.hypot(f.x - px, f.y - py) - f.r; if (d < bd) { bd = d; best = f; } }
    if (best) { const dd = Math.hypot(best.x - e.x, best.y - e.y); if (dd <= c.shape.range + 0.5) return { dx: best.x - e.x, dy: best.y - e.y, dist: dd }; }
    return a;
  }
  const reach = (c.shape.r ?? c.shape.len ?? c.shape.range ?? 3) + 0.6;
  let best = null, ba = (10 * Math.PI) / 180;
  for (const f of foes) {
    const fx = f.x - e.x, fy = f.y - e.y, fd = Math.hypot(fx, fy); if (fd > reach) continue;
    let da = Math.abs(Math.atan2(fy, fx) - Math.atan2(uy, ux)); if (da > Math.PI) da = 2 * Math.PI - da;
    if (da < ba) { ba = da; best = f; }
  }
  return best ? { dx: best.x - e.x, dy: best.y - e.y, dist: Math.hypot(best.x - e.x, best.y - e.y) } : a;
}
function currentAim() {
  if (armed < 0 || !slotKey(me(), armed)) return null;
  if (aim && aim.slot === armed && aim.dir) return rawAim(armed, aim.dir, aim.len);
  return defaultAim(armed);
}
// the one aim used both for the reticle with no drag and for every non-drag attack (tap, click, key)
function defaultAim(slot) {
  const e = me(), c = CARDS[slotKey(e, slot)];
  if (c?.iframes) { const m = Math.hypot(e.mx, e.my); return m > 0.2 ? { dx: e.mx, dy: e.my } : { dx: e.fx, dy: e.fy }; }   // a roll goes where you're walking
  return mouse && !matchMedia("(pointer: coarse)").matches ? mouseAim(slot) : autoAim(slot);
}

function castSlot(slot, a) {
  const e = me(), key = slotKey(e, slot); if (!e || e.dead || !key || !a) return;
  firstPlay = true;
  const why = blockedWhy(S, e, slot);
  if (why === "busy" || why === "stunned") { pending = { slot, key, a, at: performance.now() }; return; }   // queue: fires when this one lands
  if (why === "cooldown") { toast(`${CARDS[key].name} is recharging — ${cdLeft(S, e, slot).toFixed(1)}s`); return; }
  if (why === "health") { toast(`${CARDS[key].name} needs more than ${CARDS[key].hpCost} health`); return; }
  if (why) return;
  if (S.remote) {
    sendNet({ t: "play", slot, aim: { dx: a.dx, dy: a.dy, dist: a.dist }, x: e.x, y: e.y, fs: e.forceSeq });
    // show it winding up at once; the server's copy replaces this within a snapshot
    e.cast = { key, slot, t: 0, dur: windupOf(e, key), aim: { dx: a.dx, dy: a.dy, dist: a.dist },
      locked: CARDS[key].shape.kind === "circle" ? shapeOf(S, e, key, a) : null, local: true, sentAt: performance.now() };
    if (slot > 0) { e.cds = e.cds.slice(); e.cds[slot - 1] = S.t + cooldownOf(e, key); }
    pending = null; return;
  }
  if (play(S, PID, slot, a).ok) pending = null;
}
function tickPending() {
  if (!pending) return;
  const e = me();
  if (!e || e.dead || slotKey(e, pending.slot) !== pending.key || performance.now() - pending.at > 3000) { pending = null; return; }
  const why = blockedWhy(S, e, pending.slot);
  if (why === "busy" || why === "stunned") return;
  const p = pending; pending = null;
  castSlot(p.slot, CARDS[p.key].iframes ? p.a : assist(p.key, p.a));
}

function pickEnt(px, py) {
  const x = wxOf(px), y = wyOf(py);
  let best = null, bd = Infinity;
  for (const o of S.ents) {
    if ((o.dead && o.kind !== "player") || !visible(o)) continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < o.r + 0.5 && d < bd) { bd = d; best = o; }
  }
  return best;
}
function tapAt(px, py) {
  const hit = pickEnt(px, py);
  if (hit) { if (hit.side === "foe") targetId = hit.id; showEntInfo(hit); return; }
  const x = wxOf(px), y = wyOf(py), it = S.items.find((i) => Math.hypot(i.x - x, i.y - y) < 0.6);
  if (it) { infoFor = { item: it.id }; renderInfo(); return; }
  $("info").classList.add("hidden"); infoFor = null;
}
$("me").addEventListener("click", () => { const e = me(); if (e) showEntInfo(e); });

// ------------------------------------------------------------------ info boxes
let infoFor = null, infoTimer = 0;
function showEntInfo(o) { infoFor = { ent: o.id }; renderInfo(); }
function showCardInfo(k) { if (!k) return; infoFor = { card: k }; renderInfo(); }
const chips = (list, now) => list.map((k) => `<span class="chip ${k === now ? "now" : ""}" style="--tc:${TYPE_COL[CARDS[k].type]}"><img src="${cardArt(k)}" alt="">${esc(CARDS[k].name)}${k === now ? " ◂" : ""}</span>`).join("");
function renderInfo() {
  const box = $("info");
  if (!infoFor || !S) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  if (infoFor.card) { box.className = "info mine"; box.innerHTML = `<button class="x" aria-label="Close">×</button>${cardDetailHtml(infoFor.card, me())}`; return; }
  if (infoFor.item) {
    const it = S.items.find((i) => i.id === infoFor.item);
    if (!it) { box.classList.add("hidden"); infoFor = null; return; }
    box.className = "info mine";
    box.innerHTML = `<button class="x" aria-label="Close">×</button>` + (it.kind === "card" ? `${cardDetailHtml(it.key, me())}<div class="row">Walk over it to pick it up.</div>`
      : `<div class="hd"><img src="${bodyArt(it.key)}" alt=""><div><b>${esc(BODIES[it.key].name)}</b> <span class="dim">— a body</span></div></div><div class="row txt"><b>${esc(BODIES[it.key].passiveText)}</b></div><div class="row">Stand on it and tap Wear to take its passive.</div>`);
    return;
  }
  const o = S.ents.find((x) => x.id === infoFor.ent);
  if (!o) { box.classList.add("hidden"); infoFor = null; return; }
  const mine = o.side === "hero";
  box.className = `info ${mine ? "mine" : ""}`;
  if (o.kind === "unit") {
    const u = UNITS[o.unit], left = Math.max(0, o.life - (S.t - o.bornAt));
    box.innerHTML = `<button class="x" aria-label="Close">×</button><div class="hd"><img src="${entArt(o)}" alt=""><div><b>${esc(u.name)}</b>
      <div class="row">${mine ? "Your side's summon" : "Foe summon"} · HP <b>${Math.max(0, o.hp)}/${o.maxHp}</b> · <b>${left.toFixed(0)}s</b> left</div></div></div>`;
    return;
  }
  const b = BODIES[o.body], foe = o.kind === "foe";
  const now = foe && o.awake ? foeIntent(S, o) : o.cast?.key ?? null;
  const title = o.kind === "player" && o.pid !== PID ? `${esc(o.name)} · ${esc(b.name)}` : esc(b.name);
  const m = o.mods ?? {};
  const facts = [`<b>Lv ${o.level ?? 1}</b>`, `HP <b>${Math.max(0, Math.ceil(o.hp))}/${o.maxHp}</b>`, o.shield >= 1 ? `🛡 <b>${Math.ceil(o.shield)}</b>` : "",
    m.armor ? `armor <b>${m.armor}</b>` : "", `speed <b>${(o.speed ?? 3).toFixed(1)}</b>`, foe && !o.awake ? "asleep" : "", o.kind === "player" && o.dead ? "<b>down</b>" : ""].filter(Boolean).join(" · ");
  box.innerHTML = `<button class="x" aria-label="Close">×</button>
    <div class="hd"><img src="${entArt(o)}" alt=""><div><b>${title}</b><div class="row">${facts}</div></div></div>
    <div class="row"><b>Passive:</b> ${esc(b.passiveText)}</div>
    <div class="cards">${chips([o.weapon], now)}${chips(o.actions ?? [], now)}</div>
    ${o.deck?.length ? `<div class="cards">${chips(o.deck)}</div>` : ""}
    ${foe && now ? `<div class="row txt">${o.cast ? `<b>${esc(CARDS[now].name)}</b> lands in <b>${Math.max(0, o.cast.dur - o.cast.t).toFixed(1)}s</b>` : `Next: <b>${esc(CARDS[now].name)}</b>`}</div>` : ""}`;
}
$("info").addEventListener("click", (ev) => { if (ev.target.closest(".x")) { $("info").classList.add("hidden"); infoFor = null; } });

let toastT = 0;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add("hidden"), 1600); }

// ------------------------------------------------------------------ HUD
let hudSig = "", partySig = "", ctxSig = "", btnSig = "";
function updateHud() {
  const e = me(); if (!e) return;
  const b = BODIES[e.body];
  const lv = S.level ?? e.level ?? 1, xp = S.xp ?? 0, lo = TUNING.levelXp[lv - 1] ?? 0, hi = TUNING.levelXp[lv];
  const buffs = [e.shield >= 1 ? `🛡 ${Math.ceil(e.shield)}` : "", e.rage ? `+${e.rage} rage` : "", e.interest ? `+${e.interest} interest` : "",
    S.t < (e.mouseUntil ?? 0) ? `+${TUNING.mouseRage} fury` : "", e.firstHit ? "next hit ×2" : ""].filter(Boolean).join(" · ");
  const sig = `${e.body}|${Math.ceil(e.hp)}|${e.maxHp}|${e.color}|${lv}|${xp}|${buffs}`;
  if (sig !== hudSig) {
    hudSig = sig;
    $("me-art").src = bodyArt(e.body); $("me-name").textContent = b.name;
    $("me-lv").textContent = `Lv ${lv}`;
    $("me-xp").style.width = hi ? `${Math.max(0, Math.min(1, (xp - lo) / (hi - lo))) * 100}%` : "100%";
    $("me-hp").style.width = `${Math.max(0, (e.hp / e.maxHp) * 100)}%`; $("me-hp-n").textContent = `${Math.max(0, Math.ceil(e.hp))} / ${e.maxHp}`;
    $("me-buffs").textContent = buffs;
    document.querySelector("#me .portrait").style.borderColor = e.color ?? COL.teal;
  }
  // the three buttons: weapon (big) + two actions
  const bs = `${e.weapon}|${(e.actions ?? []).join(",")}|${e.body}|${pending?.slot ?? -1}|${armed}`;
  const cards = document.querySelectorAll("#hand .card");
  if (bs !== btnSig) {
    btnSig = bs;
    cards.forEach((el) => {
      const slot = +el.dataset.slot, k = slotKey(e, slot);
      el.classList.toggle("empty", !k);
      if (!k) { el.innerHTML = `<span class="nm">empty</span>`; el.classList.remove("armed", "queued"); return; }
      const c = CARDS[k];
      el.style.setProperty("--gc", TYPE_COL[c.type]);
      el.innerHTML = `<span class="ramp">${secs(windupOf(e, k))}</span><img src="${cardArt(k)}" alt=""><span class="nm">${esc(c.name)}</span><span class="fill"></span><span class="cd"></span>`;
      el.classList.toggle("armed", armed === slot);
      el.classList.toggle("queued", pending?.slot === slot);
    });
  }
  // winding up / recovering dims the weapon; actions show their recharge
  cards.forEach((el) => {
    const slot = +el.dataset.slot, k = slotKey(e, slot); if (!k) return;
    let need = 0, label = "";
    if (e.cast && e.cast.slot === slot) need = 1 - Math.min(1, e.cast.t / e.cast.dur);
    else if (slot === 0 && S.t < (e.recoverUntil ?? 0)) need = Math.min(1, (e.recoverUntil - S.t) / Math.max(0.05, CARDS[k].recover ?? 0.3)) * 0.6;
    if (slot > 0) { const left = cdLeft(S, e, slot), tot = cooldownOf(e, k) || 1; if (left > 0) { need = Math.max(need, left / tot); label = left >= 1 ? `${Math.ceil(left)}` : left.toFixed(1); } }
    el.classList.toggle("busy", !!e.cast || !!e.dead);
    el.classList.toggle("cooling", !!label);
    el.querySelector(".fill")?.style.setProperty("--need", `${need * 100}%`);
    const cd = el.querySelector(".cd"); if (cd && cd.textContent !== label) cd.textContent = label;
  });
  // context buttons: the stairs, a body to wear
  const it = !e.dead ? itemUnder(S, e) : null, body = it?.kind === "body" ? it : null;
  const stairs = onStairs(S, e) && S.phase === "play";
  const cs = `${stairs}|${body?.id}|${body?.key}|${S.floorN}`;
  if (cs !== ctxSig) {
    ctxSig = cs;
    $("ctx").innerHTML = (stairs ? `<button class="go" data-do="descend">Take the stairs to ${esc(floorName(S.floorN + 1))} ▼</button>` : "")
      + (body ? `<button class="go wear" data-do="wear" data-id="${body.id}"><img src="${bodyArt(body.key)}" alt="">Wear ${esc(BODIES[body.key].name)}<small>${esc(BODIES[body.key].passiveText)}</small></button>` : "");
  }
  // tip
  let tip = "";
  const downedNear = S.ents.find((o) => o.kind === "player" && o.dead && o.pid !== PID && !o.away && Math.hypot(o.x - e.x, o.y - e.y) <= TUNING.reviveRange + e.r);
  if (downedNear) tip = `Standing <b>${esc(downedNear.name)}</b> back up… stay close`;
  else if (pending) tip = `<b>${esc(CARDS[pending.key].name)}</b> queued — tap it again to unqueue`;
  else if (armed >= 0 && slotKey(e, armed)) tip = aim?.dir ? `<b>${esc(CARDS[slotKey(e, armed)].name)}</b> · let go to unleash` : `<b>${esc(CARDS[slotKey(e, armed)].name)}</b> · drag to aim, or let go`;
  else if (!firstPlay) tip = "Tap your weapon to attack · drag it to aim · flick the right side to swing";
  if ($("tip").innerHTML !== tip) $("tip").innerHTML = tip;
  $("downed").classList.toggle("hidden", !(e.dead && S.phase === "play"));
  const boss = S.ents.find((o) => o.kind === "foe" && BODIES[o.body]?.boss && o.awake && !o.dead);
  $("boss").classList.toggle("hidden", !boss);
  if (boss) { $("boss-name").textContent = `${BODIES[boss.body].name} · Lv ${boss.level}`; $("boss-hp").style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`; }
  const fc = floorName(S.floorN); if ($("floorchip").textContent !== fc) $("floorchip").textContent = fc;
  const bn = e.bag?.length ? `${e.bag.length}` : ""; if ($("bag-n").textContent !== bn) $("bag-n").textContent = bn;
  $("bagbtn").classList.toggle("free", e.deck.length < e.level && e.bag.some((k) => CARDS[k].type === "deck"));
  // party (co-op)
  const friends = S.ents.filter((o) => o.kind === "player" && o.pid !== PID);
  const ps = friends.map((o) => `${o.id}:${Math.ceil(o.hp)}:${o.maxHp}:${o.dead}:${o.away}:${o.body}:${Math.round((o.revive ?? 0) * 4)}`).join("|");
  if (ps !== partySig) {
    partySig = ps;
    $("party").innerHTML = friends.map((o) => `<button class="mate ${o.dead ? "down" : ""} ${o.away ? "away" : ""}" data-id="${o.id}" style="--pc:${o.color}">
      <img src="${bodyArt(o.body)}" alt=""><span class="mn">${esc(o.name)}</span>
      <span class="bar hp"><i style="width:${o.dead ? 0 : Math.max(0, (o.hp / o.maxHp) * 100)}%"></i></span>
      ${o.away ? `<em>away</em>` : o.dead ? `<em>down${o.revive ? ` ${Math.min(100, Math.round((o.revive / TUNING.reviveTime) * 100))}%` : ""}</em>` : ""}</button>`).join("");
  }
  if (infoFor && performance.now() - infoTimer > 200) { infoTimer = performance.now(); renderInfo(); }
  if (bagOpen()) renderBag();
}
$("party").addEventListener("click", (ev) => { const m = ev.target.closest(".mate"); const o = m && S?.ents.find((x) => x.id === +m.dataset.id); if (o) showEntInfo(o); });
$("ctx").addEventListener("click", (ev) => {
  const b = ev.target.closest("button"); if (!b || !S) return;
  if (b.dataset.do === "descend") { if (S.remote) sendNet({ t: "descend" }); else if (descend(S, PID)) startView(true); }
  if (b.dataset.do === "wear") { const id = +b.dataset.id; if (S.remote) sendNet({ t: "wear", id }); else wearItem(S, PID, id); hudSig = ""; btnSig = ""; }
});

// ------------------------------------------------------------------ the bag (change your loadout any time)
let bagSig = "";
function openBag() { if (!S || !me()) return; dropTouches(); bagSig = ""; renderBag(); $("bag").classList.remove("hidden"); }
$("bagbtn").addEventListener("click", openBag);
$("bag-done").addEventListener("click", () => $("bag").classList.add("hidden"));
function renderBag() {
  const e = me(); if (!e) return;
  const sig = `${e.weapon}|${e.deck.join()}|${e.actions.join()}|${e.bag.join()}|${e.level}|${e.body}`;
  if (sig === bagSig) return;
  bagSig = sig;
  const tile = (k, act, i, cat) => { const c = CARDS[k];
    return `<button class="tile bt" data-act="${act}" data-i="${i}" data-cat="${cat ?? ""}" style="--gc:${TYPE_COL[c.type]}"><img src="${cardArt(k)}" alt="">
      <span class="t"><b>${esc(c.name)}</b><small>${esc(c.type === "deck" ? modWords(c.mods) : c.text)}</small></span></button>`; };
  const empty = (n, what) => Array.from({ length: n }, () => `<span class="tile slot">empty ${what} slot</span>`).join("");
  const st = statsFor(e);
  $("bag-sub").innerHTML = `${esc(BODIES[e.body].name)} · Lv ${e.level} · ${st.maxHp} health · speed ${st.speed.toFixed(1)}`;
  // what you found comes first (a landscape phone is short); then what you're wearing
  $("bag-body").innerHTML = `
    <h3>Bag <small>${e.bag.length}/${TUNING.bagMax} — tap to equip (a weapon swaps with yours)</small></h3><div class="bag-row">${e.bag.map((k, i) => tile(k, "equip", i)).join("") || `<span class="dim">Nothing yet — cards lie around the dungeon and fall from foes.</span>`}</div>
    <h3>Deck <small>${e.deck.length}/${e.level} slots — tap to put back in the bag</small></h3><div class="bag-row">${e.deck.map((k, i) => tile(k, "unequip", i, "deck")).join("")}${empty(Math.max(0, e.level - e.deck.length), "deck")}</div>
    <h3>Weapon and minor actions <small>${e.actions.length}/${TUNING.actionSlots} actions</small></h3><div class="bag-row">${tile(e.weapon, "none", 0)}${e.actions.map((k, i) => tile(k, "unequip", i, "action")).join("")}${empty(Math.max(0, TUNING.actionSlots - e.actions.length), "action")}</div>`;
}
$("bag-body").addEventListener("click", (ev) => {
  const t = ev.target.closest(".bt"); if (!t || !S) return;
  const i = +t.dataset.i, act = t.dataset.act;
  if (act === "equip") {
    if (S.remote) sendNet({ t: "equip", i });
    else { const r = equip(S, PID, i); if (!r.ok) toast(r.why === "deck full" ? "Your deck is full — take a card out first" : r.why === "actions full" ? "Both action slots are full — take one out first" : "Can't"); }
  } else if (act === "unequip") {
    if (S.remote) sendNet({ t: "unequip", cat: t.dataset.cat, i });
    else { const r = unequip(S, PID, t.dataset.cat, i); if (!r.ok) toast(r.why === "bag full" ? "Your bag is full" : "Can't"); }
  }
  bagSig = ""; hudSig = ""; btnSig = "";
});

// ------------------------------------------------------------------ end
function checkOverlays() {
  if (S.phase !== "play" && $("end").classList.contains("hidden")) {
    const won = S.phase === "won", t = S.endedAt ?? S.t;
    const party = S.ents.filter((o) => o.kind === "player").length;
    $("end-title").textContent = won ? "The dungeon is cleared!" : party > 1 ? "The party fell" : "You fell";
    $("end-sub").textContent = `${won ? "The Market-Crash Minotaur is down." : `Down on ${floorName(S.floorN)}.`} ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")} · ${S.stats.felled} foes felled · reached level ${S.level ?? 1}${S.stats.revives ? ` · ${S.stats.revives} revives` : ""}`;
    $("again").textContent = S.remote ? "Play again (everyone)" : "Play again";
    $("end").classList.remove("hidden"); $("bag").classList.add("hidden");
  }
}

// ------------------------------------------------------------------ drawing
const visible = (o) => {
  if (o.kind === "unit" || o.kind === "player") return true;
  if (o.awake) return true;
  return !!S.seen[Math.floor(o.y) * S.floor.w + Math.floor(o.x)];
};
const seenAt = (x, y) => !!S.seen[Math.floor(y) * S.floor.w + Math.floor(x)];
function drawFloor() {
  const f = S.floor;
  const x0 = Math.max(0, Math.floor(wxOf(0)) - 1), x1 = Math.min(f.w - 1, Math.ceil(wxOf(W)) + 1);
  const y0 = Math.max(0, Math.floor(wyOf(0)) - 1), y1 = Math.min(f.h - 1, Math.ceil(wyOf(H)) + 1);
  const s = TS + 0.5;
  const fl = (xx, yy) => xx >= 0 && yy >= 0 && xx < f.w && yy < f.h && f.tiles[yy * f.w + xx] !== 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = y * f.w + x; if (!S.seen[k]) continue;
    const t = f.tiles[k], px = sx(x), py = sy(y);
    if (t === 0) {
      if (!(fl(x - 1, y) || fl(x + 1, y) || fl(x, y - 1) || fl(x, y + 1) || fl(x - 1, y - 1) || fl(x + 1, y - 1) || fl(x - 1, y + 1) || fl(x + 1, y + 1))) continue;
      ctx.fillStyle = "#3a4152"; ctx.fillRect(px, py, s, s);
      ctx.fillStyle = "#454d61"; ctx.fillRect(px, py, s, 2);
      if (fl(x, y + 1)) { ctx.fillStyle = "#1c2029"; ctx.fillRect(px, py + TS * 0.6, s, TS * 0.4 + 0.5); }
      continue;
    }
    ctx.fillStyle = t === 1 ? ((x + y) & 1 ? "#2c3242" : "#2a3040") : ((x + y) & 1 ? "#232835" : "#212633");
    ctx.fillRect(px, py, s, s);
    if (S.locked.has(k)) {
      ctx.fillStyle = "rgba(255,107,90,.22)"; ctx.fillRect(px, py, s, s);
      ctx.strokeStyle = COL.coral; ctx.lineWidth = 2.5;
      for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(px + (TS * i) / 4, py + 3); ctx.lineTo(px + (TS * i) / 4, py + TS - 3); ctx.stroke(); }
    }
  }
  // the stairs down
  if (S.stairs && seenAt(S.stairs.x, S.stairs.y)) {
    const x = sx(S.stairs.x), y = sy(S.stairs.y), r = TS * 0.75;
    ctx.fillStyle = "#11141b"; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(255,207,74,${0.16 + i * 0.12})`; ctx.fillRect(x - r + 3, y - r + 3 + i * (r * 2 - 6) / 4, r * 2 - 6, (r * 2 - 6) / 4 - 2); }
    ctx.strokeStyle = COL.gold; ctx.lineWidth = 2; ctx.strokeRect(x - r, y - r, r * 2, r * 2);
    ctx.font = `900 ${Math.round(TS * 0.55)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = COL.gold; ctx.fillText("▼", x, y + 1);
  }
}
function drawItems() {
  for (const it of S.items) {
    if (!seenAt(it.x, it.y)) continue;
    const x = sx(it.x), y = sy(it.y) + Math.sin(S.t * 3 + it.id) * 2, s = TS * 0.5;
    if (it.kind === "card") {
      const c = CARDS[it.key];
      ctx.save(); ctx.translate(x, y);
      ctx.shadowColor = TYPE_COL[c.type]; ctx.shadowBlur = 10;
      roundRect(-s / 2, -s * 0.65, s, s * 1.3, 4); ctx.fillStyle = "#1c2130"; ctx.fill(); ctx.shadowBlur = 0;
      ctx.lineWidth = 2; ctx.strokeStyle = TYPE_COL[c.type]; ctx.stroke();
      const im = img(cardArt(it.key)); if (im.complete && im.naturalWidth) ctx.drawImage(im, -s * 0.4, -s * 0.4, s * 0.8, s * 0.8);
      ctx.restore();
    } else {
      ctx.globalAlpha = 0.55;
      const im = img(bodyArt(it.key)); if (im.complete && im.naturalWidth) ctx.drawImage(im, x - TS * 0.4, y - TS * 0.4, TS * 0.8, TS * 0.8);
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.ellipse(x, y + TS * 0.35, TS * 0.38, TS * 0.12, 0, 0, Math.PI * 2); ctx.strokeStyle = COL.teal; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = "800 10px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = COL.teal; ctx.fillText("BODY", x, y + TS * 0.42);
    }
  }
}
function shapePath(sh, p = 1) {
  ctx.beginPath();
  if (sh.kind === "circle") ctx.arc(sx(sh.x), sy(sh.y), Math.max(1, sh.r * TS * p), 0, Math.PI * 2);
  else if (sh.kind === "arc") { const cx = sx(sh.x), cy = sy(sh.y); ctx.moveTo(cx, cy); ctx.arc(cx, cy, sh.r * TS * p, sh.a - sh.half, sh.a + sh.half); ctx.closePath(); }
  else if (sh.kind === "line") {
    const hw = sh.w / 2, L = sh.len * p, px = -sh.dy * hw, py = sh.dx * hw;
    ctx.moveTo(sx(sh.x + px), sy(sh.y + py)); ctx.lineTo(sx(sh.x + sh.dx * L + px), sy(sh.y + sh.dy * L + py));
    ctx.lineTo(sx(sh.x + sh.dx * L - px), sy(sh.y + sh.dy * L - py)); ctx.lineTo(sx(sh.x - px), sy(sh.y - py)); ctx.closePath();
  }
}
function drawShape(sh, rgb, p, dashed) {
  shapePath(sh); ctx.fillStyle = `rgba(${rgb},.13)`; ctx.fill();
  ctx.setLineDash(dashed ? [7, 5] : []); ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${rgb},.9)`; ctx.stroke(); ctx.setLineDash([]);
  if (p != null) { shapePath(sh, p); ctx.fillStyle = `rgba(${rgb},.32)`; ctx.fill(); }
  if (sh.kind === "line" && sh.len > 0.3) {
    const ex = sh.x + sh.dx * sh.len, ey = sh.y + sh.dy * sh.len, s = 0.32;
    ctx.beginPath(); ctx.moveTo(sx(ex + sh.dx * s), sy(ey + sh.dy * s));
    ctx.lineTo(sx(ex - sh.dy * s), sy(ey + sh.dx * s)); ctx.lineTo(sx(ex + sh.dy * s), sy(ey - sh.dx * s)); ctx.closePath();
    ctx.fillStyle = `rgba(${rgb},.9)`; ctx.fill();
  }
}
const GOLD = "255,207,74", CORAL = "255,107,90", SKY = "140,200,255";
function castShape(o) { return o.cast.locked ?? shapeOf(S, o, o.cast.key, o.cast.aim); }

function drawZones() {
  for (const z of S.zones) {
    const left = z.until - S.t, a = Math.max(0, Math.min(1, left * 2));
    const g = ctx.createRadialGradient(sx(z.x), sy(z.y), 0, sx(z.x), sy(z.y), z.r * TS);
    g.addColorStop(0, `rgba(255,236,140,${0.5 * a})`); g.addColorStop(1, `rgba(255,200,60,${0.12 * a})`);
    ctx.beginPath(); ctx.arc(sx(z.x), sy(z.y), z.r * TS, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = `rgba(255,220,100,${a})`; ctx.lineWidth = 2; ctx.stroke();
  }
}

// the reticle: exactly what it hits, how hard, and where each target gets shoved
function drawAimPreview(e) {
  const a = currentAim(); if (!a) return;
  const key = slotKey(e, armed), c = CARDS[key];
  const sh = shapeOf(S, e, key, a); if (!sh) return;
  const why = blockedWhy(S, e, armed);
  if (why === "cooldown" || why === "health") {
    drawShape(sh, "150,152,165", null, true);
    label(e, why === "cooldown" ? `recharging ${cdLeft(S, e, armed).toFixed(1)}s` : "not enough health", "#9aa3b5");
    return;
  }
  if (sh.placed) {
    ctx.beginPath(); ctx.arc(sx(e.x), sy(e.y), sh.range * TS, 0, Math.PI * 2);
    ctx.setLineDash([3, 6]); ctx.strokeStyle = "rgba(255,207,74,.35)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(sx(e.x), sy(e.y)); ctx.lineTo(sx(sh.x), sy(sh.y)); ctx.strokeStyle = "rgba(255,207,74,.5)"; ctx.stroke();
  }
  drawShape(sh, GOLD, null, true);
  if (c.shape.kind === "dash") { ctx.beginPath(); ctx.arc(sx(sh.x + sh.dx * sh.len), sy(sh.y + sh.dy * sh.len), e.r * TS, 0, Math.PI * 2); ctx.strokeStyle = "rgba(62,230,196,.8)"; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); }
  const h = hitsOf(S, e, sh), base = dmgOf(S, e, key), push = pushOf(e, key);
  if (c.dmg || c.zone?.dmg) for (const f of h.foes) {
    ring(f, COL.gold, 2.5);
    const amt = c.dmg ? dmgAgainst(S, e, f, base, c.tag, e.x, e.y) : 0;
    label(f, [amt && `−${amt}${e.firstHit ? " ×2" : ""}`, c.zone?.dmg && `−${c.zone.dmg}/s`].filter(Boolean).join(" "), COL.gold);
    if (push > 0) {   // the shove: an arrow to where it ends up; gold-white when it'll stagger
      const d = shoveDist(f, push), [dx, dy] = pushDir(sh, f), stag = d >= TUNING.staggerAt && !BODIES[f.body]?.boss;
      const ex = f.x + dx * d, ey = f.y + dy * d;
      ctx.beginPath(); ctx.moveTo(sx(f.x), sy(f.y)); ctx.lineTo(sx(ex), sy(ey)); ctx.strokeStyle = stag ? "#fff6d0" : "rgba(255,207,74,.85)"; ctx.lineWidth = stag ? 3 : 2; ctx.stroke();
      const a2 = Math.atan2(dy, dx); ctx.beginPath(); ctx.moveTo(sx(ex), sy(ey)); ctx.lineTo(sx(ex) - Math.cos(a2 - 0.5) * 7, sy(ey) - Math.sin(a2 - 0.5) * 7); ctx.lineTo(sx(ex) - Math.cos(a2 + 0.5) * 7, sy(ey) - Math.sin(a2 + 0.5) * 7); ctx.closePath(); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
      if (stag) { ctx.font = "900 10px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.lineWidth = 3; ctx.strokeStyle = "#000"; ctx.strokeText("STAGGER", sx(f.x), sy(f.y) + f.r * TS + 8); ctx.fillStyle = "#fff6d0"; ctx.fillText("STAGGER", sx(f.x), sy(f.y) + f.r * TS + 8); }
    }
  }
  if (c.heal || c.zone?.heal) for (const f of h.allies) { ring(f, COL.green, 2); label(f, `+${c.heal || c.zone.heal}${c.zone?.heal ? "/s" : ""}`, COL.green); }
  if (c.summon) { const u = UNITS[c.summon.unit]; ctx.globalAlpha = 0.55; ctx.drawImage(img(`/foes/${u.art}.svg`), sx(sh.x) - TS * 0.35, sy(sh.y) - TS * 0.35, TS * 0.7, TS * 0.7); ctx.globalAlpha = 1; }
  if (c.hpCost) label(e, `−${c.hpCost} health`, "#ff9a8f");
}
function ring(o, color, w) { ctx.beginPath(); ctx.arc(sx(o.x), sy(o.y), o.r * TS + 4, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); }
function label(o, text, color) {
  if (!text) return;
  ctx.font = "800 14px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  const x = sx(o.x), y = sy(o.y) - o.r * TS - TS * 0.62 - 6;
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
}

const hurtAt = new Map();
const ownerColor = (o) => S.ents.find((p) => p.id === o.owner)?.color;
const DOT_COL = { burn: "#ff9a4a", poison: "#9be36b" };
function drawEnt(o) {
  const x = sx(o.x), y = sy(o.y), R = o.r * TS;
  const downed = o.kind === "player" && o.dead;
  const fade = o.dead && !downed ? Math.max(0, 1 - (S.t - o.diedAt) / 0.5) : 1;
  const asleep = o.kind === "foe" && !o.awake;
  const ghost = S.t < (o.iframeUntil ?? 0);
  const base = fade * (asleep ? 0.6 : o.away ? 0.35 : ghost ? 0.45 : 1);
  ctx.globalAlpha = base;
  ctx.beginPath(); ctx.ellipse(x, y + R * 0.8, R * 0.95, R * 0.35, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill();
  const hero = o.side === "hero";
  const col = o.kind === "player" ? o.color ?? COL.teal : o.kind === "unit" && hero ? ownerColor(o) ?? COL.teal : hero ? COL.teal : COL.coral;
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fillStyle = downed ? "#2a2d33" : hero ? "#123029" : "#33191a"; ctx.fill();
  if (S.t < (o.slowUntil ?? 0)) { ctx.fillStyle = "rgba(120,190,255,.35)"; ctx.fill(); }
  const im = img(entArt(o));
  if (downed) ctx.globalAlpha *= 0.45;
  if (im.complete && im.naturalWidth) ctx.drawImage(im, x - R * 0.92, y - R * 0.92, R * 1.84, R * 1.84);
  ctx.globalAlpha = base;
  const h = hurtAt.get(o.id);
  if (h != null && S.t - h < 0.14 && S.t >= h) { ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fill(); }
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.lineWidth = o.kind === "player" ? (o.pid === PID ? 3.2 : 2.6) : o.kind === "unit" ? 1.6 : BODIES[o.body]?.role === "bruiser" ? 3.2 : 2.2;
  ctx.strokeStyle = downed ? "#8a8f99" : col; ctx.stroke();
  for (const [i, d] of (o.dots ?? []).entries()) { ctx.beginPath(); ctx.arc(x, y, R + 2.5 + i * 2.5, 0, Math.PI * 2); ctx.strokeStyle = DOT_COL[d.kind ?? d] ?? "#fff"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }
  if (BODIES[o.body]?.boss) { ctx.beginPath(); ctx.arc(x, y, R + 4, 0, Math.PI * 2); ctx.strokeStyle = COL.gold; ctx.lineWidth = 2; ctx.stroke(); }
  // a raised shield (sword and shield, not swinging): a little arc on the side it guards
  if (CARDS[o.weapon]?.block && !o.cast && !o.dead && o.kind !== "unit" && !asleep) {
    const a = Math.atan2(o.fy, o.fx);
    ctx.beginPath(); ctx.arc(x, y, R + 5, a - 1.0, a + 1.0); ctx.strokeStyle = "rgba(159,216,255,.95)"; ctx.lineWidth = 3.5; ctx.stroke();
  }
  if (downed) {
    const p = Math.min(1, (o.revive ?? 0) / TUNING.reviveTime);
    ctx.beginPath(); ctx.arc(x, y, R + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.font = `800 ${Math.round(R * 1.1)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = col; ctx.fillText("✚", x, y);
  }
  if (o.kind === "player" && o.pid === PID && !downed) {
    const fx = o.fx, fy = o.fy, d = R + 6;
    ctx.beginPath(); ctx.moveTo(x + fx * (d + 5), y + fy * (d + 5)); ctx.lineTo(x + fx * d - fy * 4, y + fy * d + fx * 4); ctx.lineTo(x + fx * d + fy * 4, y + fy * d - fx * 4); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
  }
  if (o.id === targetId && !o.dead) { ctx.setLineDash([4, 4]); ring(o, "#ffffff", 1.5); ctx.setLineDash([]); }
  if (S.t < (o.stunUntil ?? 0) && !o.dead) {   // reeling from a stagger
    ctx.font = `900 ${Math.round(Math.max(11, R * 0.8))}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff6d0";
    for (let i = 0; i < 3; i++) { const a = S.t * 8 + i * 2.1; ctx.fillText("✦", x + Math.cos(a) * R * 0.8, y - R - 4 + Math.sin(a) * R * 0.25); }
  }
  if (o.kind !== "unit" && !(o.dead && !downed)) {
    const br = Math.max(6.5, R * 0.42), bx = x - R * 0.82, by = y + R * 0.62;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fillStyle = "rgba(10,12,18,.92)"; ctx.fill();
    ctx.strokeStyle = hero ? col : COL.coral; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = `900 ${Math.round(br * 1.3)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = hero ? "#fff" : "#ffd6d0"; ctx.fillText(String(o.level ?? 1), bx, by + 0.5);
  }
  if (o.maxHp > 1 && !o.dead) {
    const bw = Math.max(22, R * 2), bh = 4, bx = x - bw / 2, by = y + R + 4;
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = hero ? "#2fd3b0" : "#ff5e4d"; ctx.fillRect(bx, by, bw * Math.max(0, o.hp / o.maxHp), bh);
    if (o.shield) { ctx.fillStyle = COL.sky; ctx.fillRect(bx, by - 3, Math.min(bw, (o.shield / o.maxHp) * bw), 2); }
  }
  if (o.kind === "player" && o.pid !== PID) {
    ctx.font = "700 11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.8)"; ctx.strokeText(o.name, x, y + R + 10); ctx.fillStyle = col; ctx.fillText(o.name, x, y + R + 10);
  }
  if (asleep) { ctx.font = "700 11px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#c9d2e6"; ctx.fillText("z z", x + R, y - R); }
  ctx.globalAlpha = 1;
}
// the foe's next attack floats above its head; while it winds up, a ring fills and the reticle shows
function drawIntent(o) {
  if (o.kind !== "foe" || !o.awake || o.dead) return;
  const key = foeIntent(S, o); if (!key) return;
  const base = Math.max(15, Math.min(24, TS * 0.5)), s = o.cast ? base + 5 : base;
  const x = sx(o.x), y = sy(o.y) - o.r * TS - s / 2 - 5;
  ctx.fillStyle = o.cast ? "#3a1714" : "rgba(20,22,30,.9)"; roundRect(x - s / 2, y - s / 2, s, s, 5); ctx.fill();
  ctx.lineWidth = 1.8; ctx.strokeStyle = o.cast ? COL.coral : "rgba(255,107,90,.55)"; ctx.stroke();
  const im = img(cardArt(key)); if (im.complete && im.naturalWidth) ctx.drawImage(im, x - s / 2 + 2, y - s / 2 + 2, s - 4, s - 4);
  if (o.cast) {
    const p = Math.min(1, o.cast.t / o.cast.dur);
    ctx.beginPath(); ctx.arc(x, y, s / 2 + 4, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.strokeStyle = COL.coral; ctx.lineWidth = 2.5; ctx.stroke();
  }
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

const PROJ_COL = { bow: "#f1e2b0", crossbow: "#e8d2a0", throwingKnife: "#dfe6f3", arcaneMagic: "#b8a2ff", bolt: "#ff9a4a" };
function drawProjs() {
  for (const p of S.projs) {
    const c = PROJ_COL[p.key] ?? "#fff", x = sx(p.x), y = sy(p.y);
    ctx.beginPath(); ctx.moveTo(sx(p.x - p.dx * 0.6), sy(p.y - p.dy * 0.6)); ctx.lineTo(x, y); ctx.strokeStyle = c; ctx.globalAlpha = 0.5; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(x, y, Math.max(3.5, (p.w / 2) * TS * 0.8), 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
    if (p.side === "foe") { ctx.strokeStyle = COL.coral; ctx.lineWidth = 2; ctx.stroke(); }
  }
}

let lastFx = 0;
const floaters = [];
function consumeFx() {
  for (const f of S.fx) {
    if (f.n <= lastFx) continue;
    lastFx = f.n;
    const o = f.id != null ? S.ents.find((x) => x.id === f.id) : null;
    const fl = (x, y, text, color, big) => floaters.push({ t0: f.t0, x, y, text, color, big });
    if (f.type === "dmg") { hurtAt.set(f.id, f.t0); fl(f.x, f.y, `${f.amt}`, o?.kind === "player" ? "#ff7466" : "#ffffff"); }
    else if (f.type === "heal") fl(f.x, f.y, `+${f.amt}`, COL.green);
    else if (f.type === "shield") { if (o) fl(o.x, o.y, `+${f.amt} 🛡`, COL.sky); }
    else if (f.type === "buff") fl(f.x, f.y, f.text, COL.gold);
    else if (f.type === "stagger" && o) fl(o.x, o.y, "STAGGER!", "#fff6d0", true);
    else if (f.type === "slam" && o) fl(o.x, o.y, "SLAM!", "#fff6d0", true);
    else if (f.type === "miss" && o) fl(o.x, o.y, "dodged", COL.sky);
    else if (f.type === "pickup" && o) { fl(f.x, f.y, `+ ${CARDS[f.key].name}`, TYPE_COL[CARDS[f.key].type], true); if (o.pid === PID) toast(`${CARDS[f.key].name} → your bag`); }
    else if (f.type === "lock") toast("The Minotaur's den — the doors slam shut!");
    else if (f.type === "pack") toast("The Minotaur calls its pack!");
    else if (f.type === "floor" && !S.remote) { /* startView toasts it */ }
    else if (f.type === "wear" && o) fl(o.x, o.y, o.pid === PID ? `You are now ${BODIES[f.body].name}` : `${o.name} is now ${BODIES[f.body].name}`, o.color ?? COL.teal, true);
    else if (f.type === "down" && o) { if (o.pid === PID) toast("You're down!"); else toast(`${o.name} is down — stand beside them`); }
    else if (f.type === "revive" && o) fl(o.x, o.y, "Back up!", o.color ?? COL.green, true);
    else if (f.type === "join" && o && o.pid !== PID && S.t > 0.5) toast(`${o.name} joined`);
    else if (f.type === "level" && o) {
      fl(o.x, o.y, `LEVEL ${f.level}!`, COL.gold, true);
      if (o.pid === PID) toast(`Level ${f.level} — a new deck slot! (Bag)`);
    }
  }
}
function drawFx() {
  for (const f of S.fx) {
    const age = S.t - f.t0;
    if (f.type === "land" && age < 0.25 && age >= 0) {
      shapePath(f.shape); ctx.fillStyle = f.side === "hero" ? `rgba(255,236,170,${0.5 * (1 - age / 0.25)})` : `rgba(255,120,100,${0.5 * (1 - age / 0.25)})`; ctx.fill();
    } else if (["die", "summon", "pop", "revive", "join", "fizzle", "slam", "pickup"].includes(f.type) && age < 0.4 && age >= 0) {
      ctx.beginPath(); ctx.arc(sx(f.x), sy(f.y), TS * (0.2 + age * 2), 0, Math.PI * 2);
      ctx.strokeStyle = f.type === "summon" ? `rgba(255,200,120,${1 - age / 0.4})` : f.type === "revive" || f.type === "join" ? `rgba(107,227,138,${1 - age / 0.4})`
        : f.type === "slam" ? `rgba(255,246,208,${1 - age / 0.4})` : `rgba(255,255,255,${0.8 * (1 - age / 0.4)})`;
      ctx.lineWidth = f.type === "slam" ? 4 : 2; ctx.stroke();
    } else if (f.type === "level" && age < 1 && age >= 0) {
      const o = S.ents.find((x) => x.id === f.id);
      if (o) { ctx.beginPath(); ctx.arc(sx(o.x), sy(o.y), TS * (0.4 + age * 1.6), 0, Math.PI * 2); ctx.strokeStyle = `rgba(255,207,74,${1 - age})`; ctx.lineWidth = 3; ctx.stroke(); }
    } else if (f.type === "angel" && age < 0.5 && age >= 0) {
      const a = S.ents.find((x) => x.id === f.id), b = S.ents.find((x) => x.id === f.to);
      if (a && b) { ctx.beginPath(); ctx.moveTo(sx(a.x), sy(a.y)); ctx.lineTo(sx(b.x), sy(b.y)); ctx.strokeStyle = `rgba(107,227,138,${1 - age * 2})`; ctx.lineWidth = 3; ctx.stroke(); }
    }
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i], age = S.t - f.t0;
    if (age > (f.big ? 1.6 : 0.9) || age < -0.5) { floaters.splice(i, 1); continue; }
    ctx.font = f.big ? "800 16px system-ui, sans-serif" : "800 14px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const x = sx(f.x), y = sy(f.y) - TS * 0.6 - Math.max(0, age) * 34;
    ctx.globalAlpha = Math.max(0, Math.min(1, 2.2 - age * 2.2));
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.strokeText(f.text, x, y); ctx.fillStyle = f.color; ctx.fillText(f.text, x, y);
    ctx.globalAlpha = 1;
  }
}
function drawFriendArrows() {
  for (const o of S.ents) {
    if (o.kind !== "player" || o.pid === PID || o.away) continue;
    const x = sx(o.x), y = sy(o.y), m = 22;
    if (x > m && x < W - m && y > m && y < H - m) continue;
    const cx = W / 2, cy = H / 2, dx = x - cx, dy = y - cy;
    const k = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m) / Math.abs(dy || 1e-6));
    const ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(ax, ay);
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fillStyle = "rgba(10,12,18,.85)"; ctx.fill(); ctx.strokeStyle = o.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.rotate(a); ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(10, -5); ctx.lineTo(10, 5); ctx.closePath(); ctx.fillStyle = o.color; ctx.fill(); ctx.rotate(-a);
    ctx.font = "800 11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = o.dead ? "#ff9a8f" : o.color;
    ctx.fillText(o.dead ? "✚" : (o.name || "?")[0].toUpperCase(), 0, 0.5);
    ctx.restore();
  }
}
function drawStick() {
  if (stick.id == null) {
    const x = 34 + STICK_R, y = H - STICK_R - 30;
    ctx.beginPath(); ctx.arc(x, y, STICK_R, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fill();
    return;
  }
  ctx.beginPath(); ctx.arc(stick.ox, stick.oy, STICK_R, 0, Math.PI * 2); ctx.strokeStyle = "rgba(62,230,196,.45)"; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(stick.ox + stick.vx * STICK_R, stick.oy + stick.vy * STICK_R, 22, 0, Math.PI * 2); ctx.fillStyle = "rgba(62,230,196,.4)"; ctx.fill();
}
let miniN = 0;
function drawMini() {
  if (miniN++ % 6) return;
  const mc = $("mini"), m = mc.getContext("2d"), f = S.floor;
  const sc = Math.min(mc.width / f.w, mc.height / f.h), ox = (mc.width - f.w * sc) / 2, oy = (mc.height - f.h * sc) / 2;
  m.clearRect(0, 0, mc.width, mc.height);
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    const k = y * f.w + x; if (!S.seen[k] || !f.tiles[k]) continue;
    m.fillStyle = S.locked.has(k) ? COL.coral : f.tiles[k] === 1 ? "#5a6378" : "#3b4253"; m.fillRect(ox + x * sc, oy + y * sc, sc + 0.3, sc + 0.3);
  }
  m.font = "bold 9px system-ui";
  for (const r of f.rooms) {
    const rs = S.rooms[r.id]; if (!rs) continue;
    if (!S.seen[Math.floor(r.cy) * f.w + Math.floor(r.cx)]) continue;
    if (r.kind === "boss") { m.fillStyle = COL.coral; m.fillText("BOSS", Math.max(2, Math.min(mc.width - 26, ox + r.cx * sc - 11)), Math.max(10, Math.min(mc.height - 3, oy + r.cy * sc + 3))); }
    else if (rs.status === "clear" && r.kind !== "start") { m.fillStyle = "rgba(107,227,138,.8)"; m.fillText("✓", ox + r.cx * sc - 3, oy + r.cy * sc + 3); }
  }
  if (S.stairs && seenAt(S.stairs.x, S.stairs.y)) { m.fillStyle = COL.gold; m.fillText("▼", ox + S.stairs.x * sc - 4, oy + S.stairs.y * sc + 4); }
  for (const it of S.items) if (seenAt(it.x, it.y)) { m.fillStyle = it.kind === "body" ? COL.teal : COL.gold; m.fillRect(ox + it.x * sc - 1, oy + it.y * sc - 1, 2.5, 2.5); }
  for (const p of S.ents) {
    if (p.kind !== "player" || p.away) continue;
    m.fillStyle = p.dead ? "#8a8f99" : p.color ?? COL.teal; m.beginPath(); m.arc(ox + p.x * sc, oy + p.y * sc, p.pid === PID ? 3 : 2.4, 0, Math.PI * 2); m.fill();
  }
}

let camSet = false;
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = "#07090d"; ctx.fillRect(0, 0, W, H);
  if (!S) return;
  const e = me(); if (!e) return;
  if (!camSet) { cam.x = e.x; cam.y = e.y + 0.6; camSet = true; }
  cam.x += (e.x - cam.x) * 0.18; cam.y += (e.y + 0.6 - cam.y) * 0.18;
  drawFloor();
  drawItems();
  drawZones();
  for (const o of S.ents) if (o.cast && !o.dead && o.side === "foe" && visible(o)) drawShape(castShape(o), CORAL, Math.min(1, o.cast.t / o.cast.dur), false);
  for (const o of S.ents) if (o.cast && !o.dead && o.kind === "player" && o.pid !== PID) drawShape(castShape(o), SKY, Math.min(1, o.cast.t / o.cast.dur), false);
  if (e.cast) drawShape(castShape(e), GOLD, Math.min(1, e.cast.t / e.cast.dur), false);
  if (!e.dead) drawAimPreview(e);
  const ents = S.ents.filter(visible).sort((a, b) => a.y - b.y);
  for (const o of ents) drawEnt(o);
  drawProjs();
  for (const o of ents) drawIntent(o);
  drawFx();
  drawFriendArrows();
  drawStick();
  drawMini();
}

// ------------------------------------------------------------------ loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (S) {
    let mx = stick.vx, my = stick.vy;
    if (keys.has("a") || keys.has("arrowleft")) mx -= 1; if (keys.has("d") || keys.has("arrowright")) mx += 1;
    if (keys.has("w") || keys.has("arrowup")) my -= 1; if (keys.has("s") || keys.has("arrowdown")) my += 1;
    if (overlayOpen()) mx = my = 0;
    const e = me();
    if (S.remote) {
      advanceMirror(S, dt, now, PID);
      if (e && !e.dead && S.phase === "play") {
        setMove(S, PID, mx, my);
        if (!e.dash && !e.kb) {
          let left = dt; while (left > 1e-6) { const h = Math.min(left, 1 / 60); walk(S, e, h); left -= h; }
          // bump into foes exactly as the server does (friends pass through each other there too)
          for (const o of S.ents) {
            if (o.side === "hero" || o.dead || (o.kind === "foe" && !o.awake)) continue;
            const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy), min = e.r + o.r;
            if (d < min && d > 1e-4) { const k = Math.min(0.25, (min - d) * 0.5); e.x += (dx / d) * k; e.y += (dy / d) * k; }
          }
        }
        if (!e.dash && !e.kb && now - lastMoveSent > 50) { lastMoveSent = now; sendNet({ t: "move", x: e.x, y: e.y, mx: e.mx, my: e.my, fs: e.forceSeq }); }
      }
    } else if (!bagOpen()) {           // solo: the bag pauses the dungeon
      setMove(S, PID, mx, my);
      let left = dt; while (left > 1e-6) { const h = Math.min(left, 1 / 60); step(S, h); left -= h; }
    }
    tickPending();
    if (me()) { consumeFx(); updateHud(); checkOverlays(); }
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
showScreen("pick-body"); renderBodies();

// ------------------------------------------------------------------ test hooks (read-only + bot brain)
window.__rpg = {
  get S() { return S; }, get pid() { return PID; }, room: ROOM,
  toScreen: (x, y) => [sx(x), sy(y)],
  bot: () => (S && me() ? botThink(S, PID, botMem) : null),
  ui: () => ({ armed, pending: pending ? pending.key : null, aiming: !!aim, info: !$("info").classList.contains("hidden"),
    bag: bagOpen(), end: !$("end").classList.contains("hidden"),
    screen: ["pick-body", "pick-load"].find((s) => !$(s).classList.contains("hidden")) ?? (S ? "run" : "waiting"), TS, lobby }),
  btnCenter: (slot) => { const r = document.querySelector(`#hand .card[data-slot="${slot}"]`).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; },
};
