// King Mimic — Flick. The run lives in this page (engine/flick/sim.js, stepped every frame); this file is
// only the eyes and thumbs: canvas floor, left-thumb stick, a 3-card hand on the right with flick-aim.
//
// Aiming: press a card and drag — a reticle grows from your mimic showing exactly what it will hit (the
// same `shapeOf`/`hitsOf` the card resolves with). Let go to cast. Or TAP a card to ready it (reticle
// auto-aims at your target), then flick anywhere on the right side, or tap the card again to cast at
// the auto-aim. Drag back onto where you started to cancel. Hold a card to read it. Tap anything on
// the floor to read it (tapping a foe also makes it your target).
// A card you can't afford yet (or flick while still swinging) QUEUES and fires the moment it can.

import { CARDS, BODIES, UNITS, GEMS, TUNING } from "/engine/flick/content.js";
import {
  createRun, step, play, setMove, playerOf, shapeOf, hitsOf, cardCost, cardVals, bodyStats, windupOf,
  takeCard, wear, closeReward, nextCardOf,
} from "/engine/flick/sim.js";
import { botThink } from "/engine/flick/bot.js";

const $ = (id) => document.getElementById(id);
const PID = "you";
const DEAD = 12;          // px of drag before a press becomes an aim
const AIM_PX = 100;       // px of drag that reaches a placed card's full range
const HOLD_MS = 380;      // hold a card this long without dragging to read it
let S = null, chosenBody = null, deck = new Set(), lookCard = null;

// ------------------------------------------------------------------ canvas + art
const cv = $("cv"), ctx = cv.getContext("2d");
let W = 0, H = 0, DPR = 1, TS = 44;
const cam = { x: 0, y: 0 };
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  TS = Math.max(30, Math.min(64, Math.min(H / 8.2, W / 15)));
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

const COL = { gold: "#ffcf4a", teal: "#3ee6c4", coral: "#ff6b5a", green: "#6be38a" };
const gemChip = (g) => `<span class="gem ${g}">${GEMS[g].name}</span>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ------------------------------------------------------------------ start screens
function showScreen(id) {
  for (const s of ["pick-body", "pick-deck"]) $(s).classList.toggle("hidden", s !== id);
  $("hud").classList.toggle("hidden", id !== null);
  if (id === null) $("hud").classList.remove("hidden");
}
function renderBodies() {
  const starters = Object.keys(BODIES).filter((k) => BODIES[k].starter);
  $("bodies").innerHTML = starters.map((k) => {
    const b = BODIES[k], st = bodyStats(k, false);
    return `<button class="bodycard ${chosenBody === k ? "sel" : ""}" data-body="${k}" data-gem="${b.gem}">
      <img src="${bodyArt(k)}" alt=""><b>${esc(b.name)}</b>${gemChip(b.gem)}
      <span class="stat">${esc(GEMS[b.gem].stat)}</span>
      <span class="hp">${st.maxHp} HP · ${st.maxMana} mana</span>
      <span class="pas">${esc(b.passiveText)}</span>
      <span class="pas">${esc(GEMS[b.gem].name)} cards get +1.</span></button>`;
  }).join("");
  $("to-deck").disabled = !chosenBody;
}
$("bodies").addEventListener("click", (ev) => {
  const b = ev.target.closest(".bodycard"); if (!b) return;
  if (chosenBody !== b.dataset.body) { chosenBody = b.dataset.body; deck = new Set(BODIES[chosenBody].suggested); lookCard = null; }
  renderBodies();
});
$("to-deck").addEventListener("click", () => { if (!chosenBody) return; showScreen("pick-deck"); renderDeck(); });
$("back").addEventListener("click", () => { showScreen("pick-body"); renderBodies(); });

function shapeWords(c) {
  const s = c.shape;
  switch (s.kind) {
    case "arc": return `Swing · reach ${s.r} · ${s.deg}° wide`;
    case "line": return `Line · ${s.len} long · ${s.w} wide · hits all on it`;
    case "shot": return `Projectile · first foe it meets · range ${s.range}`;
    case "circle": return c.summon ? `Summon · up to ${s.range} away` : `Placed · radius ${s.r} · up to ${s.range} away`;
    case "self": return s.r ? `Around you · radius ${s.r}` : "On you";
    case "dash": return `Charge · ${s.len} tiles`;
  }
  return "";
}
function bonusWords(c) {
  const b = c.bonus ?? {};
  return [b.dmg && `+${b.dmg} damage`, b.heal && `+${b.heal} healing`, b.shield && `+${b.shield} shield`, b.count && `+${b.count} rat`,
    b.unitDmg && `+${b.unitDmg} Efreeti damage`, b.tick && `+${b.tick} each second (hurt and heal)`].filter(Boolean).join(", ");
}
function cardDetailHtml(k, body) {
  const c = CARDS[k], e = { body, kind: "player" };
  const cost = cardCost(e, k), on = BODIES[body]?.gem === c.gem;
  return `<div class="hd"><img src="${cardArt(k)}" alt=""><div><b>${esc(c.name)}</b><br>${gemChip(c.gem)} <span class="row">${c.type === "spell" ? "Spell" : "Weapon"}</span></div></div>
    <div class="row">Cost <b>${cost}</b>${cost !== c.cost ? ` <s>${c.cost}</s>` : ""} mana · wind-up <b>${c.windup}s</b></div>
    <div class="row">${esc(shapeWords(c))}</div>
    <div class="row txt"><b>${esc(c.text)}</b></div>
    <div class="bonus ${on ? "" : "off"}">${GEMS[c.gem].name} body: ${esc(bonusWords(c))} ${on ? "✓ yours" : ""}</div>`;
}
function renderDeck() {
  const b = BODIES[chosenBody];
  $("deck-body").innerHTML = `${esc(b.name)} ${gemChip(b.gem)}`;
  const keys = Object.keys(CARDS).sort((a, c) => (CARDS[a].gem === b.gem ? 0 : 1) - (CARDS[c].gem === b.gem ? 0 : 1));
  $("pool").innerHTML = keys.map((k) => {
    const c = CARDS[k];
    return `<button class="tile ${deck.has(k) ? "in" : ""} ${lookCard === k ? "look" : ""}" data-card="${k}" style="--gc:${GEMS[c.gem].color}">
      <img src="${cardArt(k)}" alt=""><span class="t"><b>${esc(c.name)}</b><small>${c.windup}s · ${c.shape.kind === "shot" ? "throw" : c.shape.kind}</small></span>
      <span class="c">${cardCost({ body: chosenBody }, k)}</span></button>`;
  }).join("");
  $("deck-n").textContent = `${deck.size}/${TUNING.deckSize}`;
  $("enter").disabled = deck.size !== TUNING.deckSize;
  $("detail").innerHTML = lookCard ? cardDetailHtml(lookCard, chosenBody)
    : `<div class="row">Tap a card to add or remove it, and read it here.</div><div class="row">Your deck is ${TUNING.deckSize} different cards. You hold 3 at a time; a played card is replaced from your deck.</div>`;
}
$("pool").addEventListener("click", (ev) => {
  const t = ev.target.closest(".tile"); if (!t) return;
  const k = t.dataset.card; lookCard = k;
  if (deck.has(k)) deck.delete(k);
  else if (deck.size < TUNING.deckSize) deck.add(k);
  else toast("Deck is full — tap a card in it to take it out");
  renderDeck();
});
$("enter").addEventListener("click", () => startRun());
$("again").addEventListener("click", () => { $("end").classList.add("hidden"); S = null; showScreen("pick-body"); renderBodies(); });

let botMem = {}, runStartedAt = 0;
function startRun() {
  S = createRun({ seed: (Math.random() * 2147483646 + 1) | 0, players: [{ id: PID, body: chosenBody, deck: [...deck] }] });
  const me = playerOf(S, PID); cam.x = me.x; cam.y = me.y;
  armed = -1; pending = null; aim = null; targetId = null; infoFor = null; botMem = {}; lastFx = 0; firstPlay = false;
  hurtAt.clear(); floaters.length = 0; rewardShownFor = null;   // ids restart each run — no stale flashes
  $("info").classList.add("hidden"); $("reward").classList.add("hidden"); $("end").classList.add("hidden");
  showScreen(null); handSig = ""; runStartedAt = performance.now();
  try { if (matchMedia("(pointer: coarse)").matches) document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
}

// ------------------------------------------------------------------ input
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0, t0: 0, moved: 0 };
const STICK_R = 54;
let aim = null;          // live aim gesture {id, slot, sx, sy, t0, moved, from, dir, len, wasArmed, holdTimer}
let armed = -1;          // readied slot
let pending = null;      // queued cast {slot, key, raw, at}
let targetId = null;     // the foe you tapped
let firstPlay = false;
const keys = new Set();
let mouse = null;        // desktop aim

const me = () => S && playerOf(S, PID);
const handKey = (i) => me()?.hand[i] ?? null;
const overlayOpen = () => !$("reward").classList.contains("hidden") || !$("end").classList.contains("hidden");

addEventListener("pointerdown", (ev) => {
  if (!S || overlayOpen()) return;
  const card = ev.target.closest?.(".card");
  if (card) { ev.preventDefault(); cardDown(ev, +card.dataset.slot); return; }
  if (ev.target !== cv) return;                       // HUD buttons handle their own taps
  if (ev.pointerType === "mouse") {
    mouse = { x: ev.clientX, y: ev.clientY };
    if (armed >= 0 && ev.button === 0) castSlot(armed, defaultAim(armed));
    else if (ev.button === 0) tapAt(ev.clientX, ev.clientY);
    return;
  }
  // left side = the stick. You only have one left thumb, so a new touch there takes the stick over
  // (if a finger-up ever went missing — iOS edge swipes do that — the stick can't stay stuck)
  if (ev.clientX < W * 0.45) {
    Object.assign(stick, { id: ev.pointerId, ox: ev.clientX, oy: ev.clientY, x: ev.clientX, y: ev.clientY, vx: 0, vy: 0, t0: performance.now(), moved: 0 });
    return;
  }
  if (aim) clearTimeout(aim.holdTimer);   // likewise a new right-hand touch replaces any stale gesture
  aim = { id: ev.pointerId, slot: armed, sx: ev.clientX, sy: ev.clientY, t0: performance.now(), moved: 0, from: armed >= 0 ? "field" : "tap", dir: null, len: 0 };
}, { passive: false });

addEventListener("pointermove", (ev) => {
  if (ev.pointerType === "mouse") { mouse = { x: ev.clientX, y: ev.clientY }; return; }
  if (ev.pointerId === stick.id) {
    const dx = ev.clientX - stick.ox, dy = ev.clientY - stick.oy, d = Math.hypot(dx, dy);
    stick.moved = Math.max(stick.moved, d);
    if (d > STICK_R) { stick.ox = ev.clientX - (dx / d) * STICK_R; stick.oy = ev.clientY - (dy / d) * STICK_R; }   // the base follows your thumb
    stick.x = ev.clientX; stick.y = ev.clientY;
    const ddx = stick.x - stick.ox, ddy = stick.y - stick.oy, dd = Math.hypot(ddx, ddy);
    const mag = dd < 6 ? 0 : Math.min(1, dd / STICK_R);
    stick.vx = dd ? (ddx / dd) * mag : 0; stick.vy = dd ? (ddy / dd) * mag : 0;
  } else if (aim && ev.pointerId === aim.id) {
    const dx = ev.clientX - aim.sx, dy = ev.clientY - aim.sy, d = Math.hypot(dx, dy);
    aim.moved = Math.max(aim.moved, d); aim.len = d;
    aim.dir = d > DEAD ? [dx / d, dy / d] : null;
    if (aim.moved > DEAD && aim.holdTimer) { clearTimeout(aim.holdTimer); aim.holdTimer = null; }
    // a hold that opened the card's info and then starts dragging is an aim after all
    if (aim.moved > DEAD && aim.from === "card" && infoFor?.card) { infoFor = null; $("info").classList.add("hidden"); }
  }
}, { passive: false });

function endPointer(ev) {
  if (ev.pointerId === stick.id) {
    if (stick.moved < 10 && performance.now() - stick.t0 < 300) tapAt(ev.clientX, ev.clientY);
    stick.id = null; stick.vx = stick.vy = 0; return;
  }
  if (!aim || ev.pointerId !== aim.id) return;
  const a = aim; aim = null; clearTimeout(a.holdTimer);
  const quick = performance.now() - a.t0 < HOLD_MS;
  if (a.from === "tap") { if (a.moved <= DEAD) tapAt(ev.clientX, ev.clientY); return; }
  if (a.moved <= DEAD) {
    if (a.from === "card") {
      if (!quick) { armed = -1; return; }                    // that was a hold-to-read
      if (a.wasArmed) castSlot(a.slot, defaultAim(a.slot));  // tap a readied card again = cast where the reticle shows
      // else: stays readied — flick anywhere on the right, or tap it again
    } else {
      const hit = pickEnt(ev.clientX, ev.clientY);
      if (hit) { if (hit.side === "foe") targetId = hit.id; showEntInfo(hit); } else armed = -1;
    }
    return;
  }
  if (a.len <= DEAD) { armed = -1; toast("Cancelled"); return; }   // dragged back to where it began
  castSlot(a.slot, rawAim(a.slot, a.dir, a.len));
}
addEventListener("pointerup", endPointer);
addEventListener("pointercancel", (ev) => {     // the OS took the touch: drop it, never cast from it
  if (ev.pointerId === stick.id) { stick.id = null; stick.vx = stick.vy = 0; }
  if (aim && ev.pointerId === aim.id) { clearTimeout(aim.holdTimer); aim = null; }
});
function dropTouches() { stick.id = null; stick.vx = stick.vy = 0; if (aim) clearTimeout(aim.holdTimer); aim = null; keys.clear(); }
addEventListener("blur", dropTouches);
document.addEventListener("visibilitychange", () => { if (document.hidden) dropTouches(); });

function cardDown(ev, slot) {
  if (!handKey(slot)) return;
  if (aim) clearTimeout(aim.holdTimer);   // a new card press always wins over a stale gesture
  aim = null;
  if (pending && pending.slot === slot) { pending = null; armed = -1; toast("Unqueued"); return; }
  aim = { id: ev.pointerId, slot, sx: ev.clientX, sy: ev.clientY, t0: performance.now(), moved: 0, from: "card", dir: null, len: 0, wasArmed: armed === slot };
  armed = slot;
  aim.holdTimer = setTimeout(() => { if (aim && aim.slot === slot && aim.moved <= DEAD) showCardInfo(handKey(slot)); }, HOLD_MS);
}

addEventListener("keydown", (ev) => {
  if (!S) return;
  keys.add(ev.key.toLowerCase());
  if (["1", "2", "3"].includes(ev.key)) { const s = +ev.key - 1; if (armed === s) castSlot(s, defaultAim(s)); else armed = s; }
  if (ev.key === "Escape") { armed = -1; $("info").classList.add("hidden"); infoFor = null; }
});
addEventListener("keyup", (ev) => keys.delete(ev.key.toLowerCase()));
addEventListener("contextmenu", (ev) => { ev.preventDefault(); armed = -1; });

// ---- aim: what a gesture means in the world ----
function liveFoes() { return S.ents.filter((o) => !o.dead && o.side === "foe" && (o.kind === "unit" || o.awake)); }
function autoTarget() {
  const e = me(); const foes = liveFoes(); if (!foes.length) return null;
  const t = foes.find((f) => f.id === targetId); if (t) return t;
  const bodies = foes.filter((f) => f.kind === "foe"), pool = bodies.length ? bodies : foes;
  return pool.reduce((a, b) => (Math.hypot(a.x - e.x, a.y - e.y) <= Math.hypot(b.x - e.x, b.y - e.y) ? a : b));
}
function autoAim(slot) {
  const e = me(), t = autoTarget(), c = CARDS[handKey(slot)];
  if (!t) return { dx: e.fx, dy: e.fy, dist: c?.shape.range ? c.shape.range * 0.6 : 0 };
  return { dx: t.x - e.x, dy: t.y - e.y, dist: Math.hypot(t.x - e.x, t.y - e.y) };
}
// raw drag → aim, then a light, VISIBLE assist: a reticle near a foe sticks to it (the preview shows
// the snapped result, so what you see is still exactly what you get)
function rawAim(slot, dir, len) {
  const key = handKey(slot); if (!key) return null;
  if (!dir) return autoAim(slot);
  const c = CARDS[key];
  const a = { dx: dir[0], dy: dir[1], dist: c.shape.kind === "circle" ? Math.max(0, Math.min(1, (len - DEAD) / AIM_PX)) * c.shape.range : undefined };
  return assist(key, a);
}
function mouseAim(slot) {
  const e = me(), key = handKey(slot); if (!key || !mouse) return autoAim(slot);
  const x = wxOf(mouse.x), y = wyOf(mouse.y);
  return assist(key, { dx: x - e.x, dy: y - e.y, dist: Math.hypot(x - e.x, y - e.y) });
}
function assist(key, a) {
  const e = me(), c = CARDS[key], foes = liveFoes();
  if (!foes.length || c.shape.kind === "self") return a;
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
// the aim the reticle shows right now (null = no reticle)
function currentAim() {
  if (armed < 0 || !handKey(armed)) return null;
  if (aim && aim.slot === armed && aim.dir) return rawAim(armed, aim.dir, aim.len);
  return defaultAim(armed);
}
// the one aim used both for the reticle with no drag and for every non-drag cast (tap again, click,
// key) — so the reticle always shows what will happen
function defaultAim(slot) {
  return mouse && !matchMedia("(pointer: coarse)").matches ? mouseAim(slot) : autoAim(slot);
}

function castSlot(slot, a) {
  const e = me(), key = handKey(slot); if (!e || !key || !a) return;
  firstPlay = true;
  const r = play(S, PID, slot, a);
  if (r.ok) { armed = -1; pending = null; return; }
  if (r.why === "mana" || r.why === "busy") {          // queue it: fires the moment you can
    pending = { slot, key, a, at: performance.now() }; armed = -1;
  }
}
function tickPending() {
  if (!pending) return;
  const e = me();
  if (!e || e.dead || handKey(pending.slot) !== pending.key || performance.now() - pending.at > 6000) { pending = null; return; }
  if (e.cast || e.dash || e.mana < cardCost(e, pending.key)) return;
  // re-run the assist so a queued flick still tracks the foe you flicked at
  const a = assist(pending.key, pending.a);
  if (play(S, PID, pending.slot, a).ok) pending = null;
}

function pickEnt(px, py) {
  const x = wxOf(px), y = wyOf(py);
  let best = null, bd = Infinity;
  for (const o of S.ents) {
    if (o.dead || !visible(o)) continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < o.r + 0.45 && d < bd) { bd = d; best = o; }
  }
  return best;
}
function tapAt(px, py) {
  const hit = pickEnt(px, py);
  if (hit) { if (hit.side === "foe") targetId = hit.id; showEntInfo(hit); }
  else { $("info").classList.add("hidden"); infoFor = null; }
}
$("me").addEventListener("click", () => { const e = me(); if (e) showEntInfo(e); });

// ------------------------------------------------------------------ info boxes
let infoFor = null, infoTimer = 0;
function showEntInfo(o) { infoFor = { ent: o.id }; renderInfo(); }
function showCardInfo(k) { if (!k) return; infoFor = { card: k }; renderInfo(); }
function renderInfo() {
  const box = $("info");
  if (!infoFor) { box.classList.add("hidden"); return; }
  if (infoFor.card) {
    box.className = "info mine";
    box.innerHTML = `<button class="x" aria-label="Close">×</button>${cardDetailHtml(infoFor.card, me()?.body)}`;
    return;
  }
  const o = S.ents.find((x) => x.id === infoFor.ent);
  if (!o) { box.classList.add("hidden"); infoFor = null; return; }
  const mine = o.side === "hero";
  box.className = `info ${mine ? "mine" : ""}`;
  if (o.kind === "unit") {
    const u = UNITS[o.unit], left = Math.max(0, o.life - (S.t - o.bornAt));
    box.innerHTML = `<button class="x" aria-label="Close">×</button><div class="hd"><img src="${entArt(o)}" alt=""><div><b>${esc(u.name)}</b>
      <div class="row">${mine ? "Your summon" : "Foe summon"} · HP <b>${Math.max(0, o.hp)}/${o.maxHp}</b> · <b>${left.toFixed(0)}s</b> left</div></div></div>
      <div class="row">${u.attack.kind === "bite" ? `Bites the nearest ${mine ? "foe" : "enemy"} for <b>${u.attack.dmg + (o.bonus ?? 0)}</b> every ${u.attack.every}s.` : `Hurls a <b>${u.attack.dmg + (o.bonus ?? 0)}</b>-damage firebolt every ${u.attack.every}s.`}</div>`;
    return;
  }
  const b = BODIES[o.body];
  const foe = o.kind === "foe";
  const cards = foe ? o.deck : o.hand.filter(Boolean);
  const now = o.cast?.key ?? (foe ? nextCardOf(o) : null);
  box.innerHTML = `<button class="x" aria-label="Close">×</button>
    <div class="hd"><img src="${entArt(o)}" alt=""><div><b>${esc(b.name)}</b> ${gemChip(b.gem)}
      <div class="row">HP <b>${Math.max(0, Math.ceil(o.hp))}/${o.maxHp}</b>${o.shield ? ` · 🛡 <b>${o.shield}</b>` : ""}${!o.awake && foe ? " · asleep" : ""}</div></div></div>
    <div class="row">${esc(GEMS[b.gem].stat)} · ${esc(b.passiveText)}</div>
    <div class="cards">${cards.map((k) => `<span class="chip ${foe && k === now ? "now" : ""}"><img src="${cardArt(k)}" alt="">${esc(CARDS[k].name)}${foe && k === now ? " ◂ next" : ""}</span>`).join("")}</div>
    ${foe && now ? `<div class="row txt">${o.cast ? `<b>${esc(CARDS[now].name)}</b> lands in <b>${Math.max(0, o.cast.dur - o.cast.t).toFixed(1)}s</b>` : `Next: <b>${esc(CARDS[now].name)}</b>`} — ${esc(CARDS[now].text)}</div>` : ""}`;
}
$("info").addEventListener("click", (ev) => { if (ev.target.closest(".x")) { $("info").classList.add("hidden"); infoFor = null; } });

let toastT = 0;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add("hidden"), 1200); }

// ------------------------------------------------------------------ HUD
let handSig = "", hudSig = "";
function updateHud() {
  const e = me(); if (!e) return;
  const b = BODIES[e.body];
  const sig = `${e.body}|${Math.ceil(e.hp)}|${e.maxHp}|${e.shield}`;
  if (sig !== hudSig) {
    hudSig = sig;
    $("me-art").src = bodyArt(e.body); $("me-name").textContent = b.name; $("me-gem").className = `gem ${b.gem}`; $("me-gem").textContent = GEMS[b.gem].name;
    $("me-hp").style.width = `${Math.max(0, (e.hp / e.maxHp) * 100)}%`; $("me-hp-n").textContent = `${Math.max(0, Math.ceil(e.hp))} / ${e.maxHp}`;
    $("me-shield").classList.toggle("hidden", !e.shield); $("me-shield").textContent = `🛡 ${e.shield} shield`;
  }
  // mana pips
  const mana = $("mana");
  if (mana.childElementCount !== e.maxMana) mana.innerHTML = "<i></i>".repeat(e.maxMana);
  [...mana.children].forEach((p, i) => p.style.setProperty("--f", `${Math.max(0, Math.min(1, e.mana - i)) * 100}%`));
  $("mana-n").textContent = Math.floor(e.mana);
  // hand
  const hs = e.hand.map((k, i) => `${k}:${k ? cardCost(e, k) : 0}:${armed === i}:${pending?.slot === i}`).join("|") + e.body;
  const cards = document.querySelectorAll("#hand .card");
  if (hs !== handSig) {
    const old = handSig.split("|").map((s) => s.split(":")[0]);
    handSig = hs;
    cards.forEach((el, i) => {
      const k = e.hand[i];
      el.classList.toggle("empty", !k);
      if (!k) { el.innerHTML = ""; return; }
      const c = CARDS[k], cost = cardCost(e, k);
      el.style.setProperty("--gc", GEMS[c.gem].color);
      el.innerHTML = `<span class="cost ${cost < c.cost ? "cheap" : ""}">${cost}</span><span class="kind">${c.type === "spell" ? "spell" : ""}</span>
        <img src="${cardArt(k)}" alt=""><span class="nm">${esc(c.name)}</span><span class="fill"></span>`;
      el.classList.toggle("armed", armed === i);
      el.classList.toggle("queued", pending?.slot === i);
      if (old[i] && old[i] !== k) { el.classList.remove("fresh"); void el.offsetWidth; el.classList.add("fresh"); }
    });
  }
  cards.forEach((el, i) => {
    const k = e.hand[i]; if (!k) return;
    const cost = cardCost(e, k), need = cost > 0 ? Math.max(0, 1 - e.mana / cost) : 0;
    el.classList.toggle("poor", need > 0);
    el.classList.toggle("busy", !!e.cast);
    el.querySelector(".fill")?.style.setProperty("--need", `${need * 100}%`);
  });
  const nx = e.draw[e.draw.length - 1];
  const ni = $("next").querySelector("img");
  $("next").style.visibility = nx ? "visible" : "hidden";
  if (nx && ni.dataset.k !== nx) { ni.src = cardArt(nx); ni.dataset.k = nx; }
  // tip
  let tip = "";
  if (pending) tip = `<b>${esc(CARDS[pending.key].name)}</b> queued — casts the moment you can (tap it to unqueue)`;
  else if (armed >= 0 && handKey(armed)) {
    const c = CARDS[handKey(armed)];
    tip = aim?.dir ? `<b>${esc(c.name)}</b> · let go to cast` : `<b>${esc(c.name)}</b> · flick to aim · tap again to cast`;
  } else if (!firstPlay) tip = "Tap a card, then flick where it goes";
  if ($("tip").innerHTML !== tip) $("tip").innerHTML = tip;
  // boss bar
  const boss = S.ents.find((o) => o.kind === "foe" && BODIES[o.body].boss && o.awake);
  $("boss").classList.toggle("hidden", !boss);
  if (boss) { $("boss-name").textContent = BODIES[boss.body].name; $("boss-hp").style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`; }
  if (infoFor && performance.now() - infoTimer > 200) { infoTimer = performance.now(); renderInfo(); }
}

// ------------------------------------------------------------------ reward + end
let rewardShownFor = null;
function checkOverlays() {
  const rw = S.rewards[PID];
  if (rw && rewardShownFor !== rw) { rewardShownFor = rw; renderReward(); $("reward").classList.remove("hidden"); armed = -1; pending = null; dropTouches(); }
  if (S.phase !== "play" && $("end").classList.contains("hidden")) {
    const won = S.phase === "won", t = S.endedAt ?? S.t;
    $("end-title").textContent = won ? "Floor cleared!" : "You fell";
    $("end-sub").textContent = `${won ? "The Market-Crash Minotaur is down." : "The floor got you this time."} ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")} · ${S.stats.plays} cards played · ${S.stats.rooms} rooms cleared`;
    $("end").classList.remove("hidden"); $("reward").classList.add("hidden");
  }
}
function renderReward() {
  const rw = S.rewards[PID], e = me();
  $("rw-heal").textContent = TUNING.roomClearHeal ? `+${TUNING.roomClearHeal} HP` : "";
  $("rw-cards").innerHTML = rw.cards.map((k) => { const c = CARDS[k];
    return `<button class="rw ${rw.took === k ? "on" : rw.took ? "gone" : ""}" data-card="${k}"><img src="${cardArt(k)}" alt=""><span class="t"><b>${esc(c.name)} ${gemChip(c.gem)}</b><small>${cardCost(e, k)} mana · ${esc(c.text)}</small></span></button>`; }).join("")
    || `<span class="sub">Nothing to take.</span>`;
  $("rw-body-sub").classList.toggle("hidden", !rw.bodies.length);
  $("rw-bodies").innerHTML = rw.bodies.map((k) => {
    const b = BODIES[k], st = bodyStats(k, false), hpAfter = Math.max(1, st.maxHp - (e.maxHp - e.hp));
    return `<button class="rw ${rw.wore === k ? "on" : rw.wore ? "gone" : ""}" data-body="${k}"><img src="${bodyArt(k)}" alt=""><span class="t"><b>${esc(b.name)} ${gemChip(b.gem)}</b>
      <small>HP ${Math.ceil(e.hp)} → ${hpAfter}/${st.maxHp} · ${esc(GEMS[b.gem].stat)} · ${esc(b.passiveText)}</small></span></button>`; }).join("");
}
$("rw-cards").addEventListener("click", (ev) => { const t = ev.target.closest(".rw"); if (t && takeCard(S, PID, t.dataset.card)) { renderReward(); handSig = ""; } });
$("rw-bodies").addEventListener("click", (ev) => { const t = ev.target.closest(".rw"); if (t && wear(S, PID, t.dataset.body)) { renderReward(); hudSig = ""; handSig = ""; } });
$("rw-done").addEventListener("click", () => { closeReward(S, PID); rewardShownFor = null; $("reward").classList.add("hidden"); });

// ------------------------------------------------------------------ drawing
const visible = (o) => {
  if (o.kind === "unit" || o.kind === "player") return true;
  if (o.awake) return true;
  return !!S.seen[Math.floor(o.y) * S.floor.w + Math.floor(o.x)];
};
function drawFloor() {
  const f = S.floor;
  const x0 = Math.max(0, Math.floor(wxOf(0)) - 1), x1 = Math.min(f.w - 1, Math.ceil(wxOf(W)) + 1);
  const y0 = Math.max(0, Math.floor(wyOf(0)) - 1), y1 = Math.min(f.h - 1, Math.ceil(wyOf(H)) + 1);
  const s = TS + 0.5;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = y * f.w + x; if (!S.seen[k]) continue;
    const t = f.tiles[k], px = sx(x), py = sy(y);
    if (t === 0) {
      // only walls that border floor are drawn; the rest of the rock stays black
      const fl = (xx, yy) => xx >= 0 && yy >= 0 && xx < f.w && yy < f.h && f.tiles[yy * f.w + xx] !== 0;
      if (!(fl(x - 1, y) || fl(x + 1, y) || fl(x, y - 1) || fl(x, y + 1) || fl(x - 1, y - 1) || fl(x + 1, y - 1) || fl(x - 1, y + 1) || fl(x + 1, y + 1))) continue;
      ctx.fillStyle = "#3a4152"; ctx.fillRect(px, py, s, s);                         // wall top
      ctx.fillStyle = "#454d61"; ctx.fillRect(px, py, s, 3);
      if (fl(x, y + 1)) { ctx.fillStyle = "#1c2029"; ctx.fillRect(px, py + TS * 0.6, s, TS * 0.4 + 0.5); }   // south face, so walls stand up
      continue;
    }
    ctx.fillStyle = t === 1 ? ((x + y) & 1 ? "#2c3242" : "#2a3040") : ((x + y) & 1 ? "#232835" : "#212633");
    ctx.fillRect(px, py, s, s);
    if (S.locked.has(k)) {
      ctx.fillStyle = "rgba(255,107,90,.22)"; ctx.fillRect(px, py, s, s);
      ctx.strokeStyle = COL.coral; ctx.lineWidth = 3;
      for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(px + (TS * i) / 4, py + 3); ctx.lineTo(px + (TS * i) / 4, py + TS - 3); ctx.stroke(); }
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
  if (sh.kind === "line" && sh.len > 0.3) {   // arrow head shows the direction of a thrust/shot
    const ex = sh.x + sh.dx * sh.len, ey = sh.y + sh.dy * sh.len, s = 0.32;
    ctx.beginPath(); ctx.moveTo(sx(ex + sh.dx * s), sy(ey + sh.dy * s));
    ctx.lineTo(sx(ex - sh.dy * s), sy(ey + sh.dx * s)); ctx.lineTo(sx(ex + sh.dy * s), sy(ey - sh.dx * s)); ctx.closePath();
    ctx.fillStyle = `rgba(${rgb},.9)`; ctx.fill();
  }
}
const GOLD = "255,207,74", CORAL = "255,107,90";
function castShape(o) { return o.cast.locked ?? shapeOf(S, o, o.cast.key, o.cast.aim); }

function drawZones() {
  for (const z of S.zones) {
    const left = z.until - S.t, a = Math.min(1, left * 2);
    const g = ctx.createRadialGradient(sx(z.x), sy(z.y), 0, sx(z.x), sy(z.y), z.r * TS);
    if (z.key === "sunbeam") { g.addColorStop(0, `rgba(255,236,140,${0.5 * a})`); g.addColorStop(1, `rgba(255,200,60,${0.12 * a})`); }
    else { g.addColorStop(0, `rgba(190,230,255,${0.45 * a})`); g.addColorStop(1, `rgba(120,190,255,${0.15 * a})`); }
    ctx.beginPath(); ctx.arc(sx(z.x), sy(z.y), z.r * TS, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = z.key === "sunbeam" ? `rgba(255,220,100,${a})` : `rgba(200,235,255,${a})`; ctx.lineWidth = 2; ctx.stroke();
    // a tick ring that tightens toward each pulse
    const ph = 1 - Math.max(0, z.next - S.t) / z.every;
    ctx.beginPath(); ctx.arc(sx(z.x), sy(z.y), z.r * TS * (1 - ph * 0.85), 0, Math.PI * 2); ctx.strokeStyle = `rgba(255,255,255,${0.35 * a})`; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

function drawAimPreview(e) {
  const a = currentAim(); if (!a) return;
  const key = handKey(armed), c = CARDS[key], v = cardVals(e, key);
  const sh = shapeOf(S, e, key, a); if (!sh) return;
  if (sh.placed) {
    ctx.beginPath(); ctx.arc(sx(e.x), sy(e.y), c.shape.range * TS, 0, Math.PI * 2);
    ctx.setLineDash([3, 6]); ctx.strokeStyle = "rgba(255,207,74,.35)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(sx(e.x), sy(e.y)); ctx.lineTo(sx(sh.x), sy(sh.y)); ctx.strokeStyle = "rgba(255,207,74,.5)"; ctx.stroke();
  }
  drawShape(sh, GOLD, null, true);
  if (c.shape.kind === "dash") { ctx.beginPath(); ctx.arc(sx(sh.x + sh.dx * sh.len), sy(sh.y + sh.dy * sh.len), e.r * TS, 0, Math.PI * 2); ctx.strokeStyle = "rgba(62,230,196,.8)"; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); }
  // exactly what it hits
  const h = hitsOf(S, e, sh);
  const dmg = v.dmg || v.zoneDmg;
  if (dmg) for (const f of h.foes) {
    ring(f, COL.gold, 3);
    label(f, [v.dmg && `−${v.dmg}`, v.zoneDmg && `−${v.zoneDmg}/s`].filter(Boolean).join(" "), COL.gold);
  }
  const heal = v.heal || v.zoneHeal;
  if (heal) for (const f of h.allies) { ring(f, COL.green, 2.5); label(f, `+${v.heal || v.zoneHeal}${v.zoneHeal ? "/s" : ""}`, COL.green); }
  if (c.summon) { const u = UNITS[c.summon.unit]; ctx.globalAlpha = 0.55; ctx.drawImage(img(`/foes/${u.art}.svg`), sx(sh.x) - TS * 0.35, sy(sh.y) - TS * 0.35, TS * 0.7, TS * 0.7); ctx.globalAlpha = 1; }
}
function ring(o, color, w) { ctx.beginPath(); ctx.arc(sx(o.x), sy(o.y), o.r * TS + 5, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); }
function label(o, text, color) {
  ctx.font = "800 15px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  const x = sx(o.x), y = sy(o.y) - o.r * TS - 33;
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
}

const hurtAt = new Map();
function drawEnt(o) {
  const x = sx(o.x), y = sy(o.y), R = o.r * TS;
  const fade = o.dead ? Math.max(0, 1 - (S.t - o.diedAt) / 0.5) : 1;
  const asleep = o.kind === "foe" && !o.awake;
  ctx.globalAlpha = fade * (asleep ? 0.6 : 1);
  ctx.beginPath(); ctx.ellipse(x, y + R * 0.8, R * 0.95, R * 0.35, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill();
  const hero = o.side === "hero";
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fillStyle = hero ? "#123029" : "#33191a"; ctx.fill();
  const im = img(entArt(o));
  if (im.complete && im.naturalWidth) ctx.drawImage(im, x - R * 0.92, y - R * 0.92, R * 1.84, R * 1.84);
  const h = hurtAt.get(o.id);
  if (h && S.t - h < 0.14) { ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fill(); }
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.lineWidth = o.kind === "player" ? 3.5 : o.kind === "unit" ? 1.8 : 2.6;
  ctx.strokeStyle = hero ? COL.teal : COL.coral; ctx.stroke();
  if (BODIES[o.body]?.boss) { ctx.beginPath(); ctx.arc(x, y, R + 4, 0, Math.PI * 2); ctx.strokeStyle = COL.gold; ctx.lineWidth = 2; ctx.stroke(); }
  if (o.kind === "player") {    // facing chevron
    const fx = o.fx, fy = o.fy, d = R + 7;
    ctx.beginPath(); ctx.moveTo(x + fx * (d + 6), y + fy * (d + 6)); ctx.lineTo(x + fx * d - fy * 5, y + fy * d + fx * 5); ctx.lineTo(x + fx * d + fy * 5, y + fy * d - fx * 5); ctx.closePath();
    ctx.fillStyle = COL.teal; ctx.fill();
  }
  if (o.id === targetId && !o.dead) { ctx.setLineDash([4, 4]); ring(o, "#ffffff", 1.5); ctx.setLineDash([]); }
  // hp bar (not for 1-HP rats)
  if (o.maxHp > 1 && !o.dead) {
    const bw = Math.max(26, R * 2), bh = 4.5, bx = x - bw / 2, by = y + R + 5;
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = hero ? "#2fd3b0" : "#ff5e4d"; ctx.fillRect(bx, by, bw * Math.max(0, o.hp / o.maxHp), bh);
    if (o.shield) { ctx.fillStyle = "#9fd8ff"; ctx.fillRect(bx, by - 3, Math.min(bw, (o.shield / o.maxHp) * bw), 2); }
  }
  if (asleep) { ctx.font = "700 12px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#c9d2e6"; ctx.fillText("z z", x + R, y - R); }
  ctx.globalAlpha = 1;
}
// the foe's next card floats above its head; while it winds up, a ring fills and the reticle shows
function drawIntent(o) {
  if (o.kind !== "foe" || !o.awake || o.dead) return;
  const key = o.cast?.key ?? nextCardOf(o); if (!key) return;
  const x = sx(o.x), y = sy(o.y) - o.r * TS - 17, s = o.cast ? 26 : 21;
  ctx.fillStyle = o.cast ? "#3a1714" : "rgba(20,22,30,.9)"; roundRect(x - s / 2, y - s / 2, s, s, 6); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = o.cast ? COL.coral : "rgba(255,107,90,.55)"; ctx.stroke();
  const im = img(cardArt(key)); if (im.complete && im.naturalWidth) ctx.drawImage(im, x - s / 2 + 2, y - s / 2 + 2, s - 4, s - 4);
  if (o.cast) {
    const p = Math.min(1, o.cast.t / o.cast.dur);
    ctx.beginPath(); ctx.arc(x, y, s / 2 + 5, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.strokeStyle = COL.coral; ctx.lineWidth = 3; ctx.stroke();
  }
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

const PROJ_COL = { bow: "#f1e2b0", hatchet: "#e09a62", arcaneOrb: "#b8a2ff", bolt: "#ff9a4a" };
function drawProjs() {
  for (const p of S.projs) {
    const c = PROJ_COL[p.key] ?? "#fff", x = sx(p.x), y = sy(p.y);
    ctx.beginPath(); ctx.moveTo(sx(p.x - p.dx * 0.5), sy(p.y - p.dy * 0.5)); ctx.lineTo(x, y); ctx.strokeStyle = c; ctx.globalAlpha = 0.5; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(x, y, Math.max(4, (p.w / 2) * TS * 0.8), 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
    if (p.side === "foe") { ctx.strokeStyle = COL.coral; ctx.lineWidth = 2; ctx.stroke(); }
  }
}

let lastFx = 0;
const floaters = [];
function consumeFx() {
  for (const f of S.fx) {
    if (f.n <= lastFx) continue;
    lastFx = f.n;
    if (f.type === "dmg") { hurtAt.set(f.id, f.t0); const o = S.ents.find((x) => x.id === f.id); floaters.push({ t0: f.t0, x: f.x, y: f.y, text: `${f.amt}`, color: o?.kind === "player" ? "#ff7466" : "#ffffff" }); }
    else if (f.type === "heal") floaters.push({ t0: f.t0, x: f.x, y: f.y, text: `+${f.amt}`, color: COL.green });
    else if (f.type === "shield") { const o = S.ents.find((x) => x.id === f.id); if (o) floaters.push({ t0: f.t0, x: o.x, y: o.y, text: `+${f.amt} 🛡`, color: "#9fd8ff" }); }
    else if (f.type === "lock" && S.rooms[f.room]?.kind === "boss") toast("The Minotaur wakes!");
    else if (f.type === "lock") toast("Doors sealed");
    else if (f.type === "wear") floaters.push({ t0: f.t0, x: me().x, y: me().y, text: `You are now ${BODIES[f.body].name}`, color: COL.teal, big: true });
  }
}
function drawFx() {
  for (const f of S.fx) {
    const age = S.t - f.t0;
    if (f.type === "land" && age < 0.25) {
      shapePath(f.shape); ctx.fillStyle = f.side === "hero" ? `rgba(255,236,170,${0.5 * (1 - age / 0.25)})` : `rgba(255,120,100,${0.5 * (1 - age / 0.25)})`; ctx.fill();
    } else if ((f.type === "die" || f.type === "summon" || f.type === "pop") && age < 0.4) {
      ctx.beginPath(); ctx.arc(sx(f.x), sy(f.y), TS * (0.2 + age * 2), 0, Math.PI * 2);
      ctx.strokeStyle = f.type === "summon" ? `rgba(62,230,196,${1 - age / 0.4})` : `rgba(255,255,255,${0.8 * (1 - age / 0.4)})`; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i], age = S.t - f.t0;
    if (age > (f.big ? 1.6 : 0.9)) { floaters.splice(i, 1); continue; }
    ctx.font = f.big ? "800 17px system-ui, sans-serif" : "800 16px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const x = sx(f.x), y = sy(f.y) - TS * 0.6 - age * 34;
    ctx.globalAlpha = Math.min(1, 2.2 - age * 2.2);
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.strokeText(f.text, x, y); ctx.fillStyle = f.color; ctx.fillText(f.text, x, y);
    ctx.globalAlpha = 1;
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
  for (const r of f.rooms) {
    const rs = S.rooms[r.id];
    if (r.kind === "boss" && S.seen[Math.floor(r.cy) * f.w + Math.floor(r.cx)]) {
      m.fillStyle = COL.coral; m.font = "bold 9px system-ui";
      m.fillText("BOSS", Math.max(2, Math.min(mc.width - 26, ox + r.cx * sc - 11)), Math.max(10, Math.min(mc.height - 3, oy + r.cy * sc + 3)));
    }
    else if (rs.status === "clear" && r.kind === "fight" && S.seen[Math.floor(r.cy) * f.w + Math.floor(r.cx)]) { m.fillStyle = "rgba(107,227,138,.8)"; m.fillText("✓", ox + r.cx * sc - 3, oy + r.cy * sc + 3); }
  }
  const e = me(); m.fillStyle = COL.teal; m.beginPath(); m.arc(ox + e.x * sc, oy + e.y * sc, 2.6, 0, Math.PI * 2); m.fill();
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = "#07090d"; ctx.fillRect(0, 0, W, H);
  if (!S) return;
  const e = me();
  // your mimic sits a little above centre: the bottom corners belong to your thumbs
  cam.x += (e.x - cam.x) * 0.18; cam.y += (e.y + 0.5 - cam.y) * 0.18;
  drawFloor();
  drawZones();
  for (const o of S.ents) if (o.cast && !o.dead && o.side === "foe" && visible(o)) drawShape(castShape(o), CORAL, Math.min(1, o.cast.t / o.cast.dur), false);
  if (e.cast) drawShape(castShape(e), GOLD, Math.min(1, e.cast.t / e.cast.dur), false);
  if (!e.dead) drawAimPreview(e);
  const ents = S.ents.filter(visible).sort((a, b) => a.y - b.y);
  for (const o of ents) drawEnt(o);
  drawProjs();
  for (const o of ents) drawIntent(o);
  drawFx();
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
    setMove(S, PID, overlayOpen() ? 0 : mx, overlayOpen() ? 0 : my);
    tickPending();
    let left = dt; while (left > 1e-6) { const h = Math.min(left, 1 / 60); step(S, h); left -= h; }
    consumeFx();
    updateHud();
    checkOverlays();
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
showScreen("pick-body"); renderBodies();

// ------------------------------------------------------------------ test hooks (read-only + bot brain)
window.__flick = {
  get S() { return S; }, pid: PID,
  toScreen: (x, y) => [sx(x), sy(y)],
  bot: () => (S ? botThink(S, PID, botMem) : null),
  ui: () => ({ armed, pending: pending ? pending.key : null, aiming: !!aim, info: !$("info").classList.contains("hidden"),
    reward: !$("reward").classList.contains("hidden"), end: !$("end").classList.contains("hidden"),
    screen: ["pick-body", "pick-deck"].find((s) => !$(s).classList.contains("hidden")) ?? "run", TS }),
  cardCenter: (i) => { const r = document.querySelector(`#hand .card[data-slot="${i}"]`).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; },
};
