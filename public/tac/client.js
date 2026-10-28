// King Mimic — hex tactics client. Renders server snapshots as a flat SVG dungeon floor with fog of
// war and a camera that follows you, and sends: move (to a hex), play (slot + aimed hex), struggle,
// reshuffle, end turn / rest, descend, wear, plus the draft pick.
// The server is authoritative; this file mirrors its geometry (hex.js + floor.js line of sight) only
// to preview moves and ranges.
import { key as hk, parseKey, same, distance, disk, reachable, pathTo, toWorld, neighbors } from "/tac/hex.js";
import { lineOfSight } from "/tac/floor.js";

const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const params = new URLSearchParams(location.search);
const ROOM = (params.get("room") || "main").replace(/[^\w-]/g, "").slice(0, 24) || "main";
const CID_KEY = "km-tac-cid";
let cid = sessionStorage.getItem(CID_KEY);
if (!cid) { cid = "p" + Math.random().toString(36).slice(2, 12); sessionStorage.setItem(CID_KEY, cid); }

const S_UNIT = 10;                      // hex circumradius in SVG units
const PX_PER_UNIT = 2.7;                // camera zoom: a hex is ~54 CSS px across
let ws = null, myId = null, CAT = null, S = null, MAP = null;
const ui = { armed: null, blastAt: null, confirmMove: null, inspect: null, lastScreen: null };
const WHY = {
  moxie: "Not enough moxie", range: "Out of range — move closer", aim: "Tap a foe in range", noneNear: "No foes around you",
  reach: "Can't reach that hex", turn: "Not your turn", empty: "Nothing to draw", nobody: "Reconnecting…",
  sight: "No clear line — something's in the way", hand: "Struggle is for an empty hand", stairs: "Stand on the stairs first",
  husk: "Stand on a body to wear it",
};

// ---------------------------------------------------------------------------------------------
// Net
function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => ws.send(JSON.stringify({ t: "hello", cid, room: ROOM, name: playerName() }));
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === "welcome") { myId = m.id; CAT = m.catalog; return; }
    if (m.t === "nope") { toast(WHY[m.why] ?? "Can't do that"); return; }
    if (m.t === "state") onState(m);
  };
  ws.onclose = (ev) => {
    if (ev.code === 4000) { toast("Opened in another tab"); return; }
    toast("Reconnecting…"); MAP = null; setTimeout(connect, 1000);
  };
}
const send = (o) => { if (ws?.readyState === 1) ws.send(JSON.stringify(o)); };
const playerName = () => ($("name").value || localStorage.getItem("km-tac-name") || "Mimic").trim().slice(0, 16);

// ---------------------------------------------------------------------------------------------
// Catalog helpers (display names only — never internal keys on screen)
const STRUGGLE_KEY = "__struggle";
const cardOf = (k) => k === STRUGGLE_KEY
  ? { name: "Struggle", cost: CAT.struggle.cost, text: `Deal ${CAT.struggle.damage} to an adjacent foe. Always there when your hand is empty.`, shape: "single", range: CAT.struggle.range, radius: 0, kind: "melee", uses: Infinity }
  : CAT?.cards[k] ?? { name: "Card", cost: 1, text: "", shape: "self", range: 0, radius: 0, kind: "", uses: 1 };
const bodyOf = (k) => CAT?.bodies[k] ?? { name: "Mimic", color: "#9ad", hp: 1, speed: 3, passive: "", art: "kingMimic" };
const artUrl = (k) => `/foes/${bodyOf(k).art || "kingMimic"}.svg`;
const kindColor = (k) => ({ melee: "var(--melee)", ranged: "var(--ranged)" })[cardOf(k).kind] ?? "var(--support)";
function geoText(k) {
  const c = cardOf(k);
  if (c.shape === "self") return "Self";
  if (c.shape === "around") return `Everyone within ${c.radius}`;
  if (c.shape === "blast") return `Range ${c.range} · blast ${c.radius}`;
  if (c.shape === "random") return `Random foe in range ${c.range}`;
  if (c.shape === "line") return `${c.range === 1 ? "Melee" : `Range ${c.range}`} · +${c.radius} behind`;
  return c.range === 1 ? "Melee · range 1" : `Range ${c.range}`;
}
const usesPips = (left, max) => (Number.isFinite(max) ? `<span class="uses" title="${left} of ${max} uses left this floor">${"●".repeat(Math.max(0, left))}${"○".repeat(Math.max(0, max - left))}</span>` : "");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------------------------------------------------------------------------------------------
// State
function onState(s) {
  if (s.map) setMap(s.map);
  S = s;
  if (!(S.turn === "explore" || (S.turn === "hero" && !s.you?.ended)) || s.phase !== "floor") { ui.armed = null; ui.blastAt = null; ui.confirmMove = null; }
  if (ui.armed != null && ui.armed !== "struggle" && !s.you?.hand[ui.armed]) ui.armed = null;
  if (ui.inspect && !entity(ui.inspect)) ui.inspect = null;
  const scr = screenFor(s);
  if (scr !== ui.lastScreen) { ui.lastScreen = scr; showScreen(scr); }
  // effects first, from where tokens were drawn (shoves glide, a killing blow still shows)
  if (scr === "floor" && MAP) { playFx(s.fx ?? []); renderBoard(); renderDock(); renderInspect(); }
  else renderScreen(scr);
}
function screenFor(s) {
  if (!s.you) return "boot";
  if (!s.you.picked || s.phase === "draft") return "draft";
  return s.phase;   // floor / over
}
const entities = () => [...(S?.heroes ?? []), ...(S?.foes ?? [])];
const entity = (id) => entities().find((e) => e.id === id) ?? null;
const me = () => S?.heroes?.find((h) => h.id === myId) ?? null;
const exploring = () => S?.phase === "floor" && S.turn === "explore";
const canAct = () => S?.phase === "floor" && S.you && !S.you.dead && (S.turn === "explore" || (S.turn === "hero" && !S.you.ended));
const myCombatTurn = () => S?.turn === "hero" && canAct();

// ---------------------------------------------------------------------------------------------
// Floor map (static per floor) + client line of sight with the server's exact rules
function setMap(m) {
  const floor = new Set(m.floor), pillars = new Set(m.pillars);
  const inRect = (h) => { const row = h.r, col = h.q + (h.r - (h.r & 1)) / 2; return row >= 0 && row < m.rows && col >= 0 && col < m.cols; };
  MAP = {
    n: m.n, floor, pillars, hazards: new Map(m.hazards), stairs: m.stairs,
    has: inRect, walkable: (h) => floor.has(hk(h)), blocksSight: (h) => !inRect(h) || !floor.has(hk(h)),
  };
  MAP.board = { has: MAP.walkable };
  buildBoard();
}
const sees = (a, b) => distance(a, b) <= 1 || lineOfSight(MAP, { q: a.q, r: a.r }, { q: b.q, r: b.r });

// ---------------------------------------------------------------------------------------------
// Board (SVG) + camera
const svg = $("board");
const layers = {};
const tiles = new Map();     // hex key → {g, poly, label, hex, kind}
const toks = new Map();      // entity id → {g, ...}
const props = new Map();     // item id → svg group
function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.append(n);
  return n;
}
// Portrait phones stand the floor upright; same hexes.
const portraitMQ = matchMedia("(orientation: portrait)");
let upright = portraitMQ.matches;
portraitMQ.addEventListener("change", () => { upright = portraitMQ.matches; if (MAP) buildBoard(); });
const px = (h) => { const p = toWorld(h); return upright ? { x: p.y * S_UNIT, y: -p.x * S_UNIT } : { x: p.x * S_UNIT, y: p.y * S_UNIT }; };
function hexPoints(c, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - (upright ? 0 : 30)); pts.push(`${(c.x + r * Math.cos(a)).toFixed(2)},${(c.y + r * Math.sin(a)).toFixed(2)}`); }
  return pts.join(" ");
}
function buildBoard() {
  svg.replaceChildren();
  tiles.clear(); toks.clear(); props.clear();
  const defs = el("defs", {}, svg);
  el("circle", { cx: 0, cy: 0, r: 6.6 }, el("clipPath", { id: "tokclip" }, defs));
  const grad = el("radialGradient", { id: "pillar", cx: "40%", cy: "35%", r: "70%" }, defs);
  el("stop", { offset: "0", "stop-color": "#8a8370" }, grad); el("stop", { offset: "1", "stop-color": "#3b3a33" }, grad);
  for (const n of ["tiles", "marks", "props", "tokens", "chips", "fx"]) layers[n] = el("g", { class: n }, svg);
  // floor + the wall ring around it (walls are drawn only where they touch walkable ground)
  const cells = new Map();
  for (const k of MAP.floor) cells.set(k, "floor");
  for (const k of MAP.pillars) cells.set(k, "pillar");
  for (const k of [...MAP.floor, ...MAP.pillars]) for (const n of neighbors(parseKey(k))) { const nk = hk(n); if (!cells.has(nk)) cells.set(nk, "wall"); }
  for (const [k, kind] of cells) {
    const h = parseKey(k), c = px(h);
    const g = el("g", { class: `cell ${kind} unseen`, "data-k": k }, layers.tiles);
    const poly = el("polygon", { points: hexPoints(c, S_UNIT * (kind === "wall" ? 1.0 : 0.94)), class: "tile" }, g);
    if (kind === "pillar") { el("circle", { cx: c.x + 0.8, cy: c.y + 1.2, r: 6.6, class: "pillar-shadow" }, g); el("circle", { cx: c.x, cy: c.y, r: 6, fill: "url(#pillar)", class: "pillar" }, g); }
    const hz = MAP.hazards.get(k);
    if (hz) for (const [dx, dy] of [[-3.2, 1.6], [0, -2.4], [3.2, 1.6]]) el("polygon", { points: `${c.x + dx - 1.9},${c.y + dy + 1.6} ${c.x + dx},${c.y + dy - 2} ${c.x + dx + 1.9},${c.y + dy + 1.6}`, class: "spike" }, g);
    if (same(h, MAP.stairs)) for (let i = 0; i < 3; i++) el("rect", { x: c.x - 5 + i * 1.4, y: c.y - 3.6 + i * 2.6, width: 10 - i * 2.8, height: 1.7, rx: 0.5, class: "stair" }, g);
    const label = el("text", { x: c.x, y: c.y, class: "cost" }, g);
    tiles.set(k, { g, poly, label, hex: h, kind, base: `cell ${kind}` });
  }
  cam.snap = true;
  if (S) { ui.lastScreen = null; onState({ ...S, fx: [] }); }
}
// Camera: follows your token; drag the board to look around (it re-centres when you move).
const cam = { x: 0, y: 0, tx: 0, ty: 0, snap: true, pan: null, follow: true, raf: 0 };
function viewSize() { const r = svg.getBoundingClientRect(); return { w: Math.max(1, r.width) / PX_PER_UNIT, h: Math.max(1, r.height) / PX_PER_UNIT }; }
function aimCamera() {
  const m = me(); if (!m || !cam.follow) return;
  const p = px(m); cam.tx = p.x; cam.ty = p.y;
  // in a fight, frame it: aim between you and the foes in sight, but never lose you off the edge
  const foes = (S.foes ?? []).filter((f) => f.awake);
  if (S.turn !== "explore" && foes.length) {
    const v = viewSize();
    const fx = foes.reduce((a, f) => a + px(f).x, 0) / foes.length, fy = foes.reduce((a, f) => a + px(f).y, 0) / foes.length;
    cam.tx = p.x + Math.max(-v.w * 0.3, Math.min(v.w * 0.3, (fx - p.x) / 2));
    cam.ty = p.y + Math.max(-v.h * 0.25, Math.min(v.h * 0.25, (fy - p.y) / 2));
  }
  if (cam.snap) { cam.x = cam.tx; cam.y = cam.ty; cam.snap = false; }
  if (!cam.raf) cam.raf = requestAnimationFrame(stepCamera);
}
function stepCamera() {
  cam.raf = 0;
  cam.x += (cam.tx - cam.x) * 0.2; cam.y += (cam.ty - cam.y) * 0.2;
  applyCamera();
  if (Math.hypot(cam.tx - cam.x, cam.ty - cam.y) > 0.2) cam.raf = requestAnimationFrame(stepCamera);
}
function applyCamera() {
  const v = viewSize();
  svg.setAttribute("viewBox", `${(cam.x - v.w / 2).toFixed(2)} ${(cam.y - v.h / 2).toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`);
}
addEventListener("resize", () => applyCamera());
svg.addEventListener("pointerdown", (ev) => { cam.pan = { x: ev.clientX, y: ev.clientY, cx: cam.x, cy: cam.y, moved: false }; });
svg.addEventListener("pointermove", (ev) => {
  if (!cam.pan) return;
  const dx = ev.clientX - cam.pan.x, dy = ev.clientY - cam.pan.y;
  if (!cam.pan.moved && Math.hypot(dx, dy) < 9) return;
  cam.pan.moved = true; cam.follow = false;
  cam.x = cam.tx = cam.pan.cx - dx / PX_PER_UNIT; cam.y = cam.ty = cam.pan.cy - dy / PX_PER_UNIT;
  applyCamera();
});
const endPan = () => { setTimeout(() => { cam.pan = null; }, 0); };
svg.addEventListener("pointerup", endPan); svg.addEventListener("pointercancel", endPan);

// Client mirror of the sim's movement field.
function moveField(c, maxSteps, avoidHazards = c.side === "foe") {
  const opp = c.side === "hero" ? S.foes : S.heroes.filter((h) => !h.dead);
  const fr = (c.side === "hero" ? S.heroes.filter((h) => !h.dead) : S.foes).filter((f) => f.id !== c.id);
  const blocked = new Set(opp.map(hk)), taken = new Set(fr.map(hk));
  const avoid = avoidHazards ? MAP.hazards : null;
  const pass = (h) => !blocked.has(hk(h)) && !(avoid && avoid.has(hk(h)));
  return reachable(MAP.board, { q: c.q, r: c.r }, maxSteps, pass, (h) => pass(h) && !taken.has(hk(h)));
}
const moveCost = (c, steps) => Math.ceil(Math.max(0, steps - c.steps) / c.speed);
let exploredSet = new Set(), visibleSet = new Set();
function myMoves() {
  const m = me(); if (!m || !canAct()) return new Map();
  const roam = exploring();
  const max = roam ? 200 : m.steps + S.you.moxie * m.speed;
  const field = moveField(m, max, false), safe = moveField(m, max, true);   // same rule as the server
  const out = new Map();
  for (const [k, v] of field) {
    if (v.steps === 0 || v.passOnly || !exploredSet.has(k)) continue;
    const sv = safe.get(k), cost = (n) => (roam ? 0 : moveCost(m, n));
    const useSafe = sv && !sv.passOnly && cost(sv.steps) <= cost(v.steps);
    const pick = useSafe ? sv : v;
    out.set(k, { ...pick, hex: v.hex, cost: cost(pick.steps), field: useSafe ? safe : field });
  }
  return out;
}
// Hexes a card can affect from where you stand (clear line only); the foes it can be aimed at.
function cardReach(k, from) {
  const c = cardOf(k);
  if (c.shape === "self") return { hexes: [], targets: [] };
  const r = c.shape === "around" ? c.radius : c.range;
  const hexes = disk(from, r).filter((h) => MAP.walkable(h) && !same(h, from) && sees(from, h));
  const set = new Set(hexes.map(hk));
  return { hexes, targets: S.foes.filter((f) => set.has(hk(f))) };
}
// What an inspected foe can hit on ITS next turn with its next card (moxie income minus the card
// cost buys movement; it avoids hazards and needs a clear line, like the rules).
function threatOf(f) {
  const k = f.next; if (!k) return { hexes: new Set(), short: 0 };
  const c = cardOf(k);
  const moxie = Math.min(CAT.moxieCap, f.mx + CAT.turnMoxie);
  const budget = moxie - c.cost;
  if (budget < 0) return { hexes: new Set(), short: -budget };
  const out = new Set();
  if (c.shape === "self") return { hexes: out, short: 0 };
  const reach = c.shape === "around" ? c.radius : c.range + (c.shape === "blast" ? c.radius : 0);
  for (const [, v] of moveField({ ...f, steps: 0 }, budget * f.speed)) {
    if (v.passOnly) continue;
    for (const h of disk(v.hex, reach)) if (MAP.walkable(h) && exploredSet.has(hk(h)) && sees(v.hex, h)) out.add(hk(h));
  }
  return { hexes: out, short: 0 };
}

function renderBoard() {
  if (!MAP) return;
  exploredSet = new Set(S.explored); visibleSet = new Set(S.visible);
  const m = me();
  const marks = new Map(), labels = new Map();
  let targets = new Set();
  if (canAct() && m) {
    if (ui.armed != null) {
      const k = ui.armed === "struggle" ? STRUGGLE_KEY : S.you.hand[ui.armed]?.key;
      const reach = cardReach(k, m);
      for (const h of reach.hexes) marks.set(hk(h), "range");
      targets = new Set(reach.targets.map((f) => f.id));
      if (ui.blastAt) for (const h of disk(ui.blastAt, cardOf(k).radius)) marks.set(hk(h), "blast");
    } else if (!exploring()) {
      const moves = myMoves();
      for (const [k, v] of moves) if (v.cost <= 2) marks.set(k, v.cost <= 1 ? "mv1" : "mv2");
      if (ui.confirmMove) {
        const mv = moves.get(hk(ui.confirmMove));
        if (mv) { for (const h of pathTo(mv.field, ui.confirmMove).slice(1)) marks.set(hk(h), "path"); labels.set(hk(ui.confirmMove), String(mv.cost)); }
      }
    }
  }
  const insp = ui.inspect && entity(ui.inspect);
  if (insp?.side === "foe" && insp.awake && ui.armed == null) for (const k of threatOf(insp).hexes) if (!marks.has(k)) marks.set(k, "threat");
  for (const [k, t] of tiles) {
    const fog = visibleSet.has(k) ? "" : exploredSet.has(k) ? " memory" : " unseen";
    const mark = marks.get(k);
    t.g.setAttribute("class", t.base + fog + (mark ? ` ${mark}` : ""));
    t.label.textContent = labels.get(k) ?? "";
  }
  renderProps();
  // tokens
  const seen = new Set();
  for (const e of entities()) {
    if (e.dead) continue;
    seen.add(e.id);
    let t = toks.get(e.id);
    const pos = px(e);
    if (!t) { t = makeToken(e); toks.set(e.id, t); t.g.style.transform = t.chip.style.transform = `translate(${pos.x}px,${pos.y}px)`; }
    updateToken(t, e, targets);
    t.pos = pos;
    if (!t.animating) t.g.style.transform = t.chip.style.transform = `translate(${pos.x}px,${pos.y}px)`;
  }
  for (const [id, t] of toks) if (!seen.has(id)) {   // fallen or out of sight: fade out, then go
    toks.delete(id); t.chip.remove();
    t.g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 200, fill: "forwards" }).onfinish = () => t.g.remove();
  }
  aimCamera(); applyCamera();
}
// Gear (cards on the floor) and bodies left by felled foes.
function renderProps() {
  const keep = new Set();
  for (const it of S.items ?? []) {
    keep.add(it.id);
    if (props.has(it.id)) continue;
    const c = px(it), g = el("g", { class: it.husk ? "prop husk" : "prop gear" }, layers.props);
    if (it.husk) {
      el("circle", { cx: c.x, cy: c.y, r: 5.6, fill: bodyOf(it.husk).color, class: "husk-disc" }, g);
      el("image", { href: artUrl(it.husk), x: c.x - 5.2, y: c.y - 5.2, width: 10.4, height: 10.4, class: "husk-art" }, g);
    } else {
      el("rect", { x: c.x - 3.2, y: c.y - 4.3, width: 6.4, height: 8.6, rx: 1.2, class: "gear-card", style: `--k:${kindColor(it.key)}` }, g);
      el("rect", { x: c.x - 2, y: c.y - 3, width: 4, height: 1.2, rx: 0.5, class: "gear-line" }, g);
    }
    props.set(it.id, g);
  }
  for (const [id, g] of props) if (!keep.has(id)) { g.remove(); props.delete(id); }
}

// A token: portrait disc, HP ring (side colour), HP pill, shield badge, teammate initial, intent chip.
const RING_R = 7.5, RING_C = 2 * Math.PI * RING_R;
function makeToken(e) {
  const g = el("g", { class: "tok", "data-id": e.id }, layers.tokens);
  el("circle", { r: 9.2, class: "halo" }, g);
  const disc = el("circle", { r: 6.9, fill: bodyOf(e.body).color }, g);
  const img = el("image", { href: artUrl(e.body), x: -6.6, y: -6.6, width: 13.2, height: 13.2, "clip-path": "url(#tokclip)", preserveAspectRatio: "xMidYMid slice" }, g);
  el("circle", { r: RING_R, class: "ringbg" }, g);
  const ring = el("circle", { r: RING_R, class: "ring", transform: "rotate(-90)", "stroke-dasharray": `${RING_C} ${RING_C}` }, g);
  const hpPill = el("g", {}, g);
  const hpRect = el("rect", { x: -3.6, y: 6.1, width: 7.2, height: 4, rx: 2, class: "hppill" }, hpPill);
  const hpText = el("text", { x: 0, y: 8.15, class: "hptext" }, hpPill);
  const sh = el("g", {}, g);
  el("circle", { cx: 6.1, cy: -5.6, r: 2.6, class: "shbadge" }, sh);
  const shText = el("text", { x: 6.1, y: -5.5, class: "shtext" }, sh);
  const mate = el("g", {}, g);
  el("circle", { cx: -6.1, cy: -5.6, r: 2.6, class: "matebadge" }, mate);
  const mateText = el("text", { x: -6.1, y: -5.5, class: "matetext" }, mate);
  const chip = el("g", { class: "chip" }, layers.chips);
  return { g, disc, img, ring, hpRect, hpText, sh, shText, mate, mateText, chip, body: e.body };
}
function updateToken(t, e, targets) {
  if (t.body !== e.body) { t.body = e.body; t.img.setAttribute("href", artUrl(e.body)); t.disc.setAttribute("fill", bodyOf(e.body).color); }
  const cls = ["tok", e.side];
  if (e.id === myId) cls.push("me");
  if (targets.has(e.id)) cls.push("target");
  if (ui.inspect === e.id) cls.push("inspected");
  if (S.acting === e.id) cls.push("acting");
  if (e.side === "foe" && !e.awake) cls.push("asleep");
  if (e.side === "hero" && e.ended && S.turn !== "foe") cls.push("ended");
  t.g.setAttribute("class", cls.join(" "));
  const frac = Math.max(0, Math.min(1, e.hp / Math.max(1, e.mhp)));
  t.ring.setAttribute("stroke-dasharray", `${(RING_C * frac).toFixed(2)} ${RING_C}`);
  const hpStr = String(Math.max(0, e.hp));
  t.hpText.textContent = hpStr;
  const pw = 4 + hpStr.length * 2.3;
  t.hpRect.setAttribute("x", (-pw / 2).toFixed(2)); t.hpRect.setAttribute("width", pw.toFixed(2));
  t.sh.style.display = e.sh > 0 ? "" : "none";
  t.shText.textContent = e.sh;
  const showMate = e.side === "hero" && e.id !== myId && (S.heroes?.length ?? 0) > 1;
  t.mate.style.display = showMate ? "" : "none";
  t.mateText.textContent = (e.name ?? "?").slice(0, 1).toUpperCase();
  t.chip.replaceChildren();
  if (e.side === "foe" && e.next) {
    const c = cardOf(e.next);
    const name = !e.awake ? "Asleep" : c.name.length > 13 ? c.name.slice(0, 12) + "…" : c.name;
    const w = (e.awake ? 7.4 : 4) + name.length * 1.72;
    t.chip.setAttribute("class", "chip" + (!e.awake ? " sleep" : e.mx + CAT.turnMoxie < c.cost ? " broke" : ""));
    el("rect", { x: -w / 2, y: -14.2, width: w, height: 5, rx: 2.5, class: "bg" }, t.chip);
    if (e.awake) {
      el("circle", { cx: -w / 2 + 2.5, cy: -11.7, r: 1.85, class: "coin" }, t.chip);
      const ct = el("text", { x: -w / 2 + 2.5, y: -11.6, class: "cointext" }, t.chip); ct.textContent = c.cost;
    }
    const nt = el("text", { x: -w / 2 + (e.awake ? 5 : 2), y: -11.6, class: "name" }, t.chip); nt.textContent = name;
  }
}

// --- effects ---------------------------------------------------------------------------------
function playFx(list) {
  for (const f of list) {
    if (f.k === "move" && f.path?.length > 1) walk(f.id, f.path);
    else if (f.k === "pushed") walk(f.id, [f.to]);
    else if (f.k === "hit" && f.n >= 0) floatOn(f.id, f.abs >= f.n && f.n > 0 ? `${f.n}🛡` : `−${f.n - (f.abs ?? 0)}`, f.abs >= f.n && f.n > 0 ? "shield" : "dmg");
    else if (f.k === "heal") floatOn(f.id, `+${f.n}`, "heal");
    else if (f.k === "shield") floatOn(f.id, `+${f.n}🛡`, "shield");
    else if (f.k === "buff") floatOn(f.id, f.s, "buff");
    else if (f.k === "cast") strike(f);
    else if (f.k === "combat") toast("Spotted! Your turn", 1300);
    else if (f.k === "calm") toast("All clear", 1100);
    else if (f.k === "floor") { toast(`Floor ${f.n}`, 1400); cam.snap = true; cam.follow = true; }
    else if (f.k === "pickup" && f.id === myId) toast(`Picked up ${cardOf(f.key).name}`, 1300);
    else if (f.k === "wear" && f.id === myId) toast(`You wear the ${bodyOf(f.body).name}`, 1400);
    else if (f.k === "rest") toast("You rest a turn", 900);
    else if (f.k === "turn" && f.side === "hero" && f.round > 1) toast(`Round ${f.round} · your turn`, 1000);
  }
}
function walk(id, path) {
  const t = toks.get(id); if (!t) return;
  if (id === myId) cam.follow = true;
  const frames = path.map((h) => { const p = px(h); return { transform: `translate(${p.x}px,${p.y}px)` }; });
  if (frames.length < 2 && t.pos) frames.unshift({ transform: `translate(${t.pos.x}px,${t.pos.y}px)` });
  const dur = Math.min(900, 110 * (frames.length - 1));
  t.animating = true;
  const done = () => { if (!t.animating) return; t.animating = false; if (t.pos) t.g.style.transform = t.chip.style.transform = `translate(${t.pos.x}px,${t.pos.y}px)`; };
  t.g.animate(frames, { duration: dur, easing: "ease-in-out" });
  t.chip.animate(frames, { duration: dur, easing: "ease-in-out" }).onfinish = done;
  setTimeout(done, dur + 30);
}
function floatOn(id, text, kind) {
  const t = toks.get(id); const e = entity(id);
  const p = t?.pos ?? (e ? px(e) : null); if (!p) return;
  const n = el("text", { x: p.x + (Math.random() - 0.5) * 6, y: p.y - 4, class: `float ${kind}` }, layers.fx);
  n.textContent = text;
  n.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-9px)", opacity: 1, offset: .6 }, { transform: "translateY(-12px)", opacity: 0 }], { duration: 1050, easing: "ease-out" }).onfinish = () => n.remove();
}
function strike(f) {
  const src = entity(f.src);
  const a = toks.get(f.src)?.pos ?? (src ? px(src) : null);
  const color = f.src?.startsWith("f") ? "#ff806a" : "#f2c76f";
  const hexes = f.shape === "around" || f.shape === "blast" ? disk(f.at, f.radius) : f.shape === "self" ? [] : [f.at];
  for (const h of hexes) {
    if (!MAP.walkable(h)) continue;
    const poly = el("polygon", { points: hexPoints(px(h), S_UNIT * 0.94), fill: color, opacity: 0 }, layers.fx);
    poly.animate([{ opacity: .45 }, { opacity: 0 }], { duration: 600, easing: "ease-out" }).onfinish = () => poly.remove();
  }
  if (a && f.at && (f.shape === "single" || f.shape === "line" || f.shape === "blast")) {
    const b = px(f.at);
    const ln = el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: color, class: "fxline" }, layers.fx);
    ln.animate([{ opacity: 1, strokeWidth: 1.4 }, { opacity: 0, strokeWidth: .3 }], { duration: 450, easing: "ease-out" }).onfinish = () => ln.remove();
  }
}

// --- board input ----------------------------------------------------------------------------
function svgPoint(ev) {
  const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function hexAtPoint(p) {
  let best = null, bd = Infinity;
  for (const t of tiles.values()) {
    if (t.kind !== "floor" || !exploredSet.has(hk(t.hex))) continue;
    const c = px(t.hex); const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bd) { bd = d; best = t.hex; }
  }
  return bd <= S_UNIT ? best : null;
}
svg.addEventListener("click", (ev) => {
  if (S?.phase !== "floor" || !MAP || cam.pan?.moved) return;
  const h = hexAtPoint(svgPoint(ev));
  const tokEl = ev.target.closest?.(".tok");
  const who = tokEl ? entity(tokEl.dataset.id) : (h ? entities().find((e) => !e.dead && same(e, h)) : null);
  tapBoard(h ?? (who && { q: who.q, r: who.r }), who);
});
function tapBoard(h, who) {
  const m = me();
  if (canAct() && ui.armed != null && m) {
    const k = ui.armed === "struggle" ? STRUGGLE_KEY : S.you.hand[ui.armed]?.key;
    const c = cardOf(k);
    if (c.shape === "single" || c.shape === "line") {
      if (who?.side === "foe") {
        if (distance(who, m) > c.range) return toast(WHY.range);
        if (!sees(m, who)) return toast(WHY.sight);
        return play(ui.armed, { q: who.q, r: who.r });
      }
      return disarm();
    }
    if (c.shape === "blast") {
      if (!h || distance(h, m) > c.range) return disarm();
      if (!sees(m, h)) return toast(WHY.sight);
      if (ui.blastAt && same(ui.blastAt, h)) return play(ui.armed, h);
      ui.blastAt = h; renderAll(); hint("Tap again to cast here"); return;
    }
    return disarm();
  }
  if (who && who.id !== ui.inspect && (who.side === "foe" || who.id === myId || !canAct())) { ui.inspect = who.id; ui.confirmMove = null; return renderAll(); }
  if (who && who.id === ui.inspect) { ui.inspect = null; return renderAll(); }
  if (canAct() && h) {
    const mv = myMoves().get(hk(h));
    if (mv) {
      if (mv.cost >= 2 && !(ui.confirmMove && same(ui.confirmMove, h))) { ui.confirmMove = h; renderAll(); hint(`Move costs ${mv.cost} moxie — tap again`); return; }
      ui.confirmMove = null; ui.inspect = null;
      cam.follow = true;
      send({ t: "move", to: h });
      return;
    }
  }
  ui.confirmMove = null;
  if (ui.inspect) ui.inspect = null;
  renderAll();
}
function play(slot, at) {
  if (slot === "struggle") { send({ t: "struggle", at }); return disarm(); }
  const card = S.you.hand[slot];
  if (card && cardOf(card.key).cost > S.you.moxie) { toast(WHY.moxie); return; }
  send({ t: "play", slot, at });
  disarm();
}
function disarm() { ui.armed = null; ui.blastAt = null; renderAll(); }
function renderAll() { if (S?.phase === "floor" && MAP) { renderBoard(); renderDock(); renderInspect(); } }

// ---------------------------------------------------------------------------------------------
// Dock
const cardBtns = [...document.querySelectorAll("#hand .card")];
cardBtns.forEach((b) => b.addEventListener("click", () => {
  const slot = b.dataset.slot === "struggle" ? "struggle" : +b.dataset.slot;
  const key = slot === "struggle" ? STRUGGLE_KEY : S?.you?.hand[slot]?.key;
  if (!key || !canAct()) return;
  const c = cardOf(key);
  if (ui.armed === slot) {
    if (c.shape === "self" || c.shape === "around" || c.shape === "random") return play(slot, { q: S.you.q, r: S.you.r });
    return disarm();
  }
  ui.armed = slot; ui.blastAt = null; ui.confirmMove = null; ui.inspect = null;
  renderAll();
}));
$("end").addEventListener("click", () => { if (canAct()) { disarm(); send({ t: "end" }); } });
$("reshuffle").addEventListener("click", () => { if (canAct()) { disarm(); send({ t: "reshuffle" }); } });
$("context").addEventListener("click", () => {
  if (!canAct()) return;
  if (S.you.onStairs) send({ t: "descend" });
  else if (S.you.husk) send({ t: "wear" });
});

function renderDock() {
  const you = S.you, m = me();
  if (!you || !m) return;
  const b = bodyOf(you.body);
  $("me-name").textContent = b.name;
  $("me-hp-text").textContent = `♥ ${Math.max(0, m.hp)}/${m.mhp}${m.sh ? `  🛡 ${m.sh}` : ""}`;
  $("me-hp").style.width = `${100 * Math.max(0, m.hp) / Math.max(1, m.mhp)}%`;
  $("me-status").innerHTML = groupStatus(m.status).map((s) => `<span title="${esc(s.tip)}">${esc(s.label)}${s.n > 1 ? ` ×${s.n}` : ""}${s.turns ? ` · ${s.turns}t` : ""}</span>`).join("");
  $("mx-num").textContent = you.moxie;
  $("mx-steps").textContent = exploring() ? "Moving is free" : you.steps > 0 && canAct() ? `${you.steps} free step${you.steps > 1 ? "s" : ""}` : `Speed ${m.speed}`;
  const armedKey = ui.armed === "struggle" ? STRUGGLE_KEY : ui.armed != null ? you.hand[ui.armed]?.key : null;
  const armedCost = armedKey ? cardOf(armedKey).cost : ui.confirmMove ? (myMoves().get(hk(ui.confirmMove))?.cost ?? 0) : 0;
  $("mx-pips").innerHTML = Array.from({ length: CAT.moxieCap }, (_, i) =>
    `<i class="${i < you.moxie ? (i >= you.moxie - armedCost ? "spend" : "on") : ""}"></i>`).join("");
  const handEmpty = !you.hand.some(Boolean);
  cardBtns.forEach((btn, i) => {
    const card = you.hand[i];
    let key = card?.key, slotId = i;
    if (!card && handEmpty && i === 0) { key = STRUGGLE_KEY; slotId = "struggle"; }
    btn.dataset.slot = slotId;
    btn.classList.toggle("empty", !key);
    if (!key) { btn.innerHTML = ""; return; }
    const c = cardOf(key);
    btn.style.setProperty("--k", kindColor(key));
    btn.innerHTML = `<span class="c">${c.cost}</span><b>${esc(c.name)}</b><em>${esc(geoText(key))}${card ? usesPips(card.uses, card.max) : ""}</em><p>${esc(c.text)}</p>`;
    btn.classList.toggle("broke", c.cost > you.moxie);
    btn.classList.toggle("armed", ui.armed === slotId);
    btn.disabled = !canAct();
  });
  // the armed card's full text floats over the board, so a short phone dock never hides it
  const info = $("cardinfo");
  info.classList.toggle("hidden", !armedKey);
  if (armedKey) { const c = cardOf(armedKey); info.style.setProperty("--k", kindColor(armedKey)); info.innerHTML = `<span class="c">${c.cost}</span><b>${esc(c.name)}</b><em>${esc(geoText(armedKey))}</em><p>${esc(c.text)}</p>`; }
  // actions: reshuffle; contextual stairs / wear
  $("rs-cost").textContent = you.reshuffle;
  $("reshuffle").disabled = !canAct() || you.moxie < you.reshuffle || (handEmpty && !you.deck && !you.disc);
  const ctx = $("context");
  const huskHp = you.husk ? Math.max(1, Math.round(bodyOf(you.husk).hp * (you.huskLevel === 0 ? S.level0Hp : 1))) : 0;
  const ctxText = you.onStairs ? "Take the stairs ↓" : you.husk ? `Wear ${bodyOf(you.husk).name} · ♥${huskHp}${you.huskLevel === 0 ? " (lv 0)" : ""}` : "";
  ctx.classList.toggle("hidden", !ctxText);
  $("actions").classList.toggle("ctx", !!ctxText);
  ctx.classList.toggle("gold", !!you.onStairs);
  ctx.textContent = ctxText;
  ctx.disabled = !canAct();
  const end = $("end");
  const waitNames = (S.waitingOn ?? []).filter((id) => id !== myId).map((id) => S.heroes.find((h) => h.id === id)?.name).filter(Boolean);
  end.disabled = !canAct();
  end.textContent = S.turn === "foe" ? "Foes are acting…" : you.dead ? "You're down" : you.ended ? (waitNames.length ? `Waiting for ${waitNames.join(", ")}` : "…")
    : exploring() ? "Rest a turn" : "End turn";
  $("where").textContent = `Floor ${S.floor}${S.turn === "hero" || S.turn === "foe" ? ` · Round ${S.round}` : ""}`;
  const banner = $("banner");
  banner.className = S.turn === "foe" ? "foe" : myCombatTurn() ? "you" : exploring() ? "calm" : "";
  banner.textContent = S.turn === "foe" ? "Foes' turn" : myCombatTurn() ? "Your turn" : exploring() ? "Exploring" : you.dead ? "Down" : "Waiting";
  if (!hintLocked) {
    let h = "";
    if (canAct() && ui.armed != null) {
      const c = cardOf(armedKey);
      h = c.shape === "self" || c.shape === "around" || c.shape === "random" ? "Tap the card again to play it"
        : c.shape === "blast" ? "Tap a hex in range to aim"
        : cardReach(armedKey, me()).targets.length ? "Tap a lit foe" : "No foe in range — tap a card to put it down";
    } else if (exploring()) h = you.onStairs ? "The stairs lead down" : "Tap any mapped hex to walk there";
    else if (myCombatTurn()) h = "Tap a lit hex to move · tap a card · tap a foe to inspect";
    else if (S.turn === "foe") h = "Tap a foe to see everything about it";
    $("hint").textContent = h;
  }
}
let hintLocked = 0;
function hint(text) {
  $("hint").textContent = text;
  clearTimeout(hintLocked); hintLocked = setTimeout(() => { hintLocked = 0; renderAll(); }, 1800);
}

// ---------------------------------------------------------------------------------------------
// Inspector: everything about a creature, in plain words
function groupStatus(list) {
  const out = new Map();
  for (const s of list) { const g = out.get(s.label); if (g) { g.n++; g.turns = Math.max(g.turns ?? 0, s.turns ?? 0) || null; } else out.set(s.label, { ...s, n: 1 }); }
  return [...out.values()];
}
function renderInspect() {
  const box = $("inspect");
  const e = ui.inspect && entity(ui.inspect);
  if (!e) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const b = bodyOf(e.body);
  const foe = e.side === "foe";
  const name = foe ? b.name : e.id === myId ? `You · ${b.name}` : `${e.name} · ${b.name}`;
  const bonus = [e.bonus.all ? `+${e.bonus.all} all damage` : "", e.bonus.melee ? `+${e.bonus.melee} melee` : "", e.bonus.ranged ? `+${e.bonus.ranged} ranged` : ""].filter(Boolean);
  const chips = [...groupStatus(e.status).map((s) => `<span title="${esc(s.tip)}">${esc(s.label)}${s.n > 1 ? ` ×${s.n}` : ""}${s.turns ? `<small>${s.turns} turn${s.turns > 1 ? "s" : ""}</small>` : ""}</span>`), ...bonus.map((x) => `<span>${esc(x)}</span>`)];
  let cards = "";
  if (foe) {
    const th = threatOf(e);
    cards = `<p class="sect">${e.awake ? "Next card" : "Asleep · its cards"}${e.awake && th.short ? ` · saving up (needs ${th.short} more next turn)` : ""}</p>` + (e.queue ?? []).map((k, i) => qcard(k, i === 0 && e.awake)).join("");
  } else if (e.id === myId) {
    cards = `<p class="sect">Deck this floor</p><div class="chips"><span>${S.you.deck} to draw</span><span>${S.you.disc} discarded</span><span>${S.you.spent} used up</span><span>${S.you.deckList.length} cards total</span></div>`;
  }
  box.innerHTML = `
    <header class="${foe ? "foe" : "hero"}"><img src="${artUrl(e.body)}" alt=""><div><div class="tag">${foe ? `${b.elite ? "Elite foe" : "Foe"}${e.level === 0 ? " · level 0" : ""}${e.awake ? "" : " · asleep"}` : `Mimic${e.level === 0 ? " · level 0 body" : ""}`}</div><h3>${esc(name)}</h3></div>
      <button class="x" aria-label="Close">×</button></header>
    <div class="stats">
      <div class="stat hp"><b>${Math.max(0, e.hp)}/${e.mhp}</b><span>Health</span></div>
      <div class="stat sh"><b>${e.sh}</b><span>Shield</span></div>
      <div class="stat mx"><b>${e.mx}</b><span>Moxie</span></div>
      <div class="stat"><b>${e.speed}</b><span>Speed</span></div>
    </div>
    ${chips.length ? `<p class="sect">Effects</p><div class="chips">${chips.join("")}</div>` : ""}
    ${cards}
    ${b.passive ? `<p class="sect">Body passive</p><p class="passive">${esc(b.passive)}<small>Not active in tactics yet.</small></p>` : ""}`;
  box.querySelector(".x").onclick = () => { ui.inspect = null; renderAll(); };
}
function qcard(k, next) {
  const c = cardOf(k);
  return `<div class="qcard${next ? " next" : ""}" style="--k:${kindColor(k)}"><span class="c">${c.cost}</span><b>${esc(c.name)}</b><em>${esc(geoText(k))}</em><p>${esc(c.text)}</p></div>`;
}

// ---------------------------------------------------------------------------------------------
// Screens
const SCREENS = ["boot", "draft", "over"];
function showScreen(scr) {
  for (const id of SCREENS) $(id).classList.toggle("hidden", id !== scr);
  const onFloor = scr === "floor";
  $("dock").classList.toggle("hidden", !onFloor);
  $("field").classList.toggle("hidden", !onFloor);
  if (onFloor) { ui.inspect = null; cam.snap = true; cam.follow = true; requestAnimationFrame(() => renderAll()); }
  else renderScreen(scr);
}
function bodyChoice(k, extra = "") {
  const b = bodyOf(k);
  return `<div class="head"><img src="${artUrl(k)}" alt=""><div><b>${esc(b.name)}</b><div class="meta">♥ ${b.hp} · Speed ${b.speed}${b.elite ? " · Elite" : ""}</div></div></div>${extra}`;
}
const cardList = (keys) => `<ul>${keys.map((k) => `<li style="--k:${kindColor(k)}" title="${esc(cardOf(k).text)}">${esc(cardOf(k).name)} · ${cardOf(k).cost}</li>`).join("")}</ul>`;
function renderScreen(scr) {
  if (!S || !CAT) return;
  if (scr === "draft") {
    $("offers").innerHTML = (!S.you?.picked ? (S.offers ?? []) : []).map((o, i) =>
      `<button class="choice" data-i="${i}">${bodyChoice(o.bodyKey, `<p>${esc(bodyOf(o.bodyKey).passive)}</p>${cardList(o.deck)}`)}</button>`).join("")
      || `<p class="fine">Picked — waiting for the others…</p>`;
    $("offers").querySelectorAll(".choice").forEach((b) => b.onclick = () => send({ t: "draft", i: +b.dataset.i }));
    $("draft-wait").textContent = S.you?.picked && S.waiting?.length ? `Waiting for ${S.waiting.join(", ")}` : "Body passives are not active in tactics yet.";
  } else if (scr === "over") {
    $("over-text").textContent = S.floor > 1 ? `You reached floor ${S.floor}.` : "The first floor took you.";
  }
}
$("restart").onclick = () => send({ t: "restart" });

// ---------------------------------------------------------------------------------------------
let toastTimer = 0;
function toast(text, ms = 1600) {
  const t = $("toast"); t.textContent = text; t.classList.remove("hidden");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), ms);
}
$("name").value = localStorage.getItem("km-tac-name") || "";
$("room-hint").textContent = ROOM === "main" ? "Co-op: open this same link on another phone." : `Room ${ROOM} · open this same link on another phone to join.`;
$("go").onclick = () => { localStorage.setItem("km-tac-name", playerName()); $("boot").classList.add("hidden"); connect(); };
$("field").classList.add("hidden");
addEventListener("keydown", (e) => { if (e.key === "Escape") { ui.inspect = null; disarm(); } });
