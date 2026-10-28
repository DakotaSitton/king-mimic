// King Mimic — hex tactics client. Renders server snapshots as a flat SVG hex board and sends:
// move (to a hex), play (slot + aimed hex), end turn, plus draft / door / reward picks.
// The server is authoritative; this file only mirrors its geometry to preview moves and ranges.
import { key as hk, same, distance, disk, reachable, pathTo, toWorld, createBoard } from "/tac/hex.js";

const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const params = new URLSearchParams(location.search);
const ROOM = (params.get("room") || "main").replace(/[^\w-]/g, "").slice(0, 24) || "main";
const CID_KEY = "km-tac-cid";
let cid = sessionStorage.getItem(CID_KEY);
if (!cid) { cid = "p" + Math.random().toString(36).slice(2, 12); sessionStorage.setItem(CID_KEY, cid); }

const S_UNIT = 10;                      // hex circumradius in SVG units
let ws = null, myId = null, CAT = null, S = null, board = null;
const ui = { armed: null, blastAt: null, confirmMove: null, inspect: null, lastScreen: null };
const WHY = {
  moxie: "Not enough moxie", range: "Out of range — move closer", aim: "Tap a foe in range", noneNear: "No foes around you",
  reach: "Can't reach that hex", turn: "Not your turn", empty: "No card there", nobody: "Reconnecting…",
};

// ---------------------------------------------------------------------------------------------
// Net
function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => ws.send(JSON.stringify({ t: "hello", cid, room: ROOM, name: playerName() }));
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === "welcome") { myId = m.id; CAT = m.catalog; board = createBoard(CAT.board.cols, CAT.board.rows); buildBoard(); return; }
    if (m.t === "nope") { toast(WHY[m.why] ?? "Can't do that"); return; }
    if (m.t === "state") onState(m);
  };
  ws.onclose = (ev) => {
    if (ev.code === 4000) { toast("Opened in another tab"); return; }
    toast("Reconnecting…"); setTimeout(connect, 1000);
  };
}
const send = (o) => { if (ws?.readyState === 1) ws.send(JSON.stringify(o)); };
const playerName = () => ($("name").value || localStorage.getItem("km-tac-name") || "Mimic").trim().slice(0, 16);

// ---------------------------------------------------------------------------------------------
// Catalog helpers (display names only — never internal keys on screen)
const cardOf = (k) => CAT?.cards[k] ?? { name: "Card", cost: 1, text: "", shape: "self", range: 0, radius: 0, kind: "" };
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
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------------------------------------------------------------------------------------------
// State
function onState(s) {
  const prev = S;
  S = s;
  if (s.phase !== "fight" || s.turn !== "hero" || s.you?.ended) { ui.armed = null; ui.blastAt = null; ui.confirmMove = null; }
  if (ui.armed != null && !s.you?.hand[ui.armed]) ui.armed = null;
  if (ui.inspect && !entity(ui.inspect)) ui.inspect = null;
  const scr = screenFor(s);
  if (scr !== ui.lastScreen) { ui.lastScreen = scr; showScreen(scr); }
  // effects first, from the positions tokens were drawn at (shoves glide, a killing blow still shows)
  if (scr === "fight") { playFx(s.fx ?? []); renderBoard(); renderDock(); renderInspect(); }
  else renderScreen(scr);
}
function screenFor(s) {
  if (!s.you) return "boot";
  if (!s.you.picked) return "draft";
  if (s.you.waitNext && s.phase !== "doors" && s.phase !== "over") return "wait";
  if (s.phase === "draft") return "draft";
  return s.phase;   // doors / fight / reward / over
}
const entities = () => [...(S?.heroes ?? []), ...(S?.foes ?? [])];
const entity = (id) => entities().find((e) => e.id === id) ?? null;
const me = () => S?.heroes?.find((h) => h.id === myId) ?? null;
const myTurn = () => S?.phase === "fight" && S.turn === "hero" && S.you && !S.you.dead && !S.you.ended && !S.you.waitNext;

// ---------------------------------------------------------------------------------------------
// Board
const svg = $("board");
const layers = {};
const tiles = new Map();     // hex key → {poly, label, hex}
const toks = new Map();      // entity id → {g, ...}
function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.append(n);
  return n;
}
// Portrait phones stand the board upright (heroes at the bottom, foes at the top); same hexes.
const portraitMQ = matchMedia("(orientation: portrait)");
let upright = portraitMQ.matches;
portraitMQ.addEventListener("change", () => { upright = portraitMQ.matches; if (board) buildBoard(); });
const px = (h) => { const p = toWorld(h); return upright ? { x: p.y * S_UNIT, y: -p.x * S_UNIT } : { x: p.x * S_UNIT, y: p.y * S_UNIT }; };
function hexPoints(c, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - (upright ? 0 : 30)); pts.push(`${(c.x + r * Math.cos(a)).toFixed(2)},${(c.y + r * Math.sin(a)).toFixed(2)}`); }
  return pts.join(" ");
}
function buildBoard() {
  svg.replaceChildren();
  tiles.clear(); toks.clear();
  const xs = board.cells.map((h) => px(h).x), ys = board.cells.map((h) => px(h).y);
  const w = upright ? S_UNIT : S_UNIT * Math.sqrt(3) / 2, pad = 2;
  const minX = Math.min(...xs) - w - pad, maxX = Math.max(...xs) + w + pad;
  const minY = Math.min(...ys) - S_UNIT - 13, maxY = Math.max(...ys) + S_UNIT + pad + 3;   // headroom for intent chips
  svg.setAttribute("viewBox", `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const defs = el("defs", {}, svg);
  const clip = el("clipPath", { id: "tokclip" }, defs);
  el("circle", { cx: 0, cy: 0, r: 6.6 }, clip);
  for (const n of ["tiles", "marks", "tokens", "chips", "fx"]) layers[n] = el("g", { class: n }, svg);
  for (const h of board.cells) {
    const c = px(h);
    const poly = el("polygon", { points: hexPoints(c, S_UNIT * 0.94), class: "tile" + (((h.r & 1) ^ ((h.q + (h.r >> 1)) & 1)) ? " alt" : ""), "data-k": hk(h) }, layers.tiles);
    const label = el("text", { x: c.x, y: c.y, class: "cost" }, layers.tiles);
    tiles.set(hk(h), { poly, label, hex: h, base: poly.getAttribute("class") });
  }
  if (S) { ui.lastScreen = null; onState(S); }
}

// Client mirror of the sim's movement field: through friends, never through opponents, stop on empty.
function moveField(c, maxSteps) {
  const opp = c.side === "hero" ? S.foes : S.heroes.filter((h) => !h.dead);
  const fr = (c.side === "hero" ? S.heroes.filter((h) => !h.dead) : S.foes).filter((f) => f.id !== c.id);
  const blocked = new Set(opp.map(hk)), taken = new Set(fr.map(hk));
  return reachable(board, { q: c.q, r: c.r }, maxSteps, (h) => !blocked.has(hk(h)), (h) => !blocked.has(hk(h)) && !taken.has(hk(h)));
}
const moveCost = (c, steps) => Math.ceil(Math.max(0, steps - c.steps) / c.speed);
function myMoves() {
  const m = me(); if (!m || !myTurn()) return new Map();
  const field = moveField(m, m.steps + S.you.moxie * m.speed);
  const out = new Map();
  for (const [k, v] of field) if (v.steps > 0 && !v.passOnly) out.set(k, { ...v, cost: moveCost(m, v.steps), field });
  return out;
}
// Hexes a card can affect from where you stand; the foes it can be aimed at.
function cardReach(k, from) {
  const c = cardOf(k);
  const foes = S.foes;
  if (c.shape === "self") return { hexes: [], targets: [] };
  if (c.shape === "around") return { hexes: disk(from, c.radius).filter((h) => board.has(h) && !same(h, from)), targets: foes.filter((f) => distance(f, from) <= c.radius) };
  const hexes = disk(from, c.range).filter((h) => board.has(h) && !same(h, from));
  return { hexes, targets: foes.filter((f) => distance(f, from) <= c.range) };
}
// What an inspected foe can hit on ITS next turn with its next card: its +5 income minus the card
// cost buys movement (its banked steps reset), then the card's reach from every hex it could stand on.
function threatOf(f) {
  const k = f.next; if (!k) return { hexes: new Set(), short: 0 };
  const c = cardOf(k);
  const moxie = Math.min(CAT.moxieCap, f.mx + CAT.turnMoxie);
  const budget = moxie - c.cost;
  if (budget < 0) return { hexes: new Set(), short: -budget };
  const field = moveField({ ...f, steps: 0 }, budget * f.speed);
  const reach = c.shape === "self" ? -1 : c.shape === "around" ? c.radius : c.range + (c.shape === "blast" ? c.radius : 0);
  const out = new Set();
  if (reach < 0) return { hexes: out, short: 0 };
  for (const [, v] of field) if (!v.passOnly) for (const h of disk(v.hex, reach)) if (board.has(h)) out.add(hk(h));
  return { hexes: out, short: 0 };
}

function renderBoard(prev) {
  if (!board) return;
  const m = me();
  // --- tile marks
  const marks = new Map();   // key → class
  const labels = new Map();
  let targets = new Set();
  if (myTurn() && m) {
    if (ui.armed != null) {
      const k = S.you.hand[ui.armed]?.key;
      const reach = cardReach(k, m);
      for (const h of reach.hexes) marks.set(hk(h), "range");
      targets = new Set(reach.targets.map((f) => f.id));
      if (ui.blastAt) for (const h of disk(ui.blastAt, cardOf(k).radius)) if (board.has(h)) marks.set(hk(h), "blast");
    } else {
      // lit = reachable for free steps or 1 moxie; dimmer = 2 moxie; further hexes stay plain but
      // still answer a tap (with a path + cost preview first)
      const moves = myMoves();
      for (const [k, v] of moves) if (v.cost <= 2) marks.set(k, v.cost <= 1 ? "mv1" : "mv2");
      if (ui.confirmMove) {
        const mv = moves.get(hk(ui.confirmMove));
        if (mv) { for (const h of pathTo(mv.field, ui.confirmMove).slice(1)) marks.set(hk(h), "path"); labels.set(hk(ui.confirmMove), String(mv.cost)); }
      }
    }
  }
  const insp = ui.inspect && entity(ui.inspect);
  if (insp?.side === "foe" && ui.armed == null) for (const k of threatOf(insp).hexes) if (!marks.has(k)) marks.set(k, "threat");
  for (const [k, t] of tiles) {
    const cls = marks.get(k);
    t.poly.setAttribute("class", cls ? `tile ${cls}` : t.base);
    t.label.textContent = labels.get(k) ?? "";
  }
  // --- tokens
  const seen = new Set();
  for (const e of entities()) {
    if (e.dead) continue;
    seen.add(e.id);
    let t = toks.get(e.id);
    const pos = px(e);
    if (!t) {
      t = makeToken(e);
      toks.set(e.id, t);
      t.g.style.transform = `translate(${pos.x}px,${pos.y}px)`;
      t.chip.style.transform = `translate(${pos.x}px,${pos.y}px)`;
    }
    updateToken(t, e, targets);
    t.pos = pos;
    if (!t.animating) { t.g.style.transform = `translate(${pos.x}px,${pos.y}px)`; t.chip.style.transform = t.g.style.transform; }
  }
  for (const [id, t] of toks) if (!seen.has(id)) {   // fallen: fade out, then go
    toks.delete(id); t.chip.remove();
    t.g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, delay: 250, fill: "forwards" }).onfinish = () => t.g.remove();
  }
}
// A token: portrait disc, HP as a ring around it (side colour), HP number pill underneath,
// shield badge top-right, teammate initial top-left. Compact so neighbours never collide.
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
  if (e.side === "hero" && e.ended && S.turn === "hero") cls.push("ended");
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
  // intent chip: the foe's next card floats over its head (cost coin + name)
  t.chip.replaceChildren();
  if (e.side === "foe" && e.next) {
    const c = cardOf(e.next);
    const name = c.name.length > 13 ? c.name.slice(0, 12) + "…" : c.name;
    const w = 7.4 + name.length * 1.72;
    t.chip.setAttribute("class", "chip" + (e.mx + CAT.turnMoxie < c.cost ? " broke" : ""));
    el("rect", { x: -w / 2, y: -14.2, width: w, height: 5, rx: 2.5, class: "bg" }, t.chip);
    el("circle", { cx: -w / 2 + 2.5, cy: -11.7, r: 1.85, class: "coin" }, t.chip);
    const ct = el("text", { x: -w / 2 + 2.5, y: -11.6, class: "cointext" }, t.chip); ct.textContent = c.cost;
    const nt = el("text", { x: -w / 2 + 5, y: -11.6, class: "name" }, t.chip); nt.textContent = name;
  }
}

// --- effects: walk along paths, floating numbers, strike lines --------------------------------
function playFx(list) {
  for (const f of list) {
    if (f.k === "move" && f.path?.length > 1) walk(f.id, f.path);
    else if (f.k === "pushed") walk(f.id, [f.to]);
    else if (f.k === "hit" && f.n >= 0) floatOn(f.id, f.abs >= f.n && f.n > 0 ? `${f.n}🛡` : `−${f.n - (f.abs ?? 0)}`, f.abs >= f.n && f.n > 0 ? "shield" : "dmg");
    else if (f.k === "heal") floatOn(f.id, `+${f.n}`, "heal");
    else if (f.k === "shield") floatOn(f.id, `+${f.n}🛡`, "shield");
    else if (f.k === "buff") floatOn(f.id, f.s, "buff");
    else if (f.k === "cast") strike(f);
    else if (f.k === "turn" && f.side === "hero") toast(`Round ${f.round} · your turn`, 1100);
  }
}
function walk(id, path) {
  const t = toks.get(id); if (!t) return;
  const frames = path.map((h) => { const p = px(h); return { transform: `translate(${p.x}px,${p.y}px)` }; });
  if (frames.length < 2 && t.pos) frames.unshift({ transform: `translate(${t.pos.x}px,${t.pos.y}px)` });
  const dur = Math.min(700, 120 * (frames.length - 1));
  t.animating = true;
  const done = () => { if (!t.animating) return; t.animating = false; if (t.pos) { t.g.style.transform = `translate(${t.pos.x}px,${t.pos.y}px)`; t.chip.style.transform = t.g.style.transform; } };
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
  const src = entity(f.src) ?? null;
  const a = toks.get(f.src)?.pos ?? (src ? px(src) : null);
  const color = f.src?.startsWith("f") ? "#ff806a" : "#f2c76f";
  const hexes = f.shape === "around" ? disk(f.at, f.radius) : f.shape === "blast" ? disk(f.at, f.radius) : f.shape === "self" ? [] : [f.at];
  for (const h of hexes) {
    if (!board.has(h)) continue;
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
  for (const t of tiles.values()) { const c = px(t.hex); const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = t.hex; } }
  return bd <= S_UNIT ? best : null;
}
svg.addEventListener("click", (ev) => {
  if (S?.phase !== "fight" || !board) return;
  const p = svgPoint(ev);
  const h = hexAtPoint(p);
  const tokEl = ev.target.closest?.(".tok");
  const who = tokEl ? entity(tokEl.dataset.id) : (h ? entities().find((e) => !e.dead && same(e, h)) : null);
  tapBoard(h ?? (who && { q: who.q, r: who.r }), who);
});
function tapBoard(h, who) {
  const m = me();
  if (myTurn() && ui.armed != null && m) {
    const k = S.you.hand[ui.armed]?.key;
    const c = cardOf(k);
    if (c.shape === "single" || c.shape === "line") {
      if (who?.side === "foe") {
        if (distance(who, m) > c.range) return toast(WHY.range);
        return play(ui.armed, { q: who.q, r: who.r });
      }
      return disarm();
    }
    if (c.shape === "blast") {
      if (!h || distance(h, m) > c.range) return disarm();
      if (ui.blastAt && same(ui.blastAt, h)) return play(ui.armed, h);
      ui.blastAt = h; renderAll(); hint("Tap again to cast here"); return;
    }
    return disarm();
  }
  if (who && who.id !== ui.inspect && (who.side === "foe" || who.id === myId || !myTurn())) { ui.inspect = who.id; ui.confirmMove = null; return renderAll(); }
  if (who && who.id === ui.inspect) { ui.inspect = null; return renderAll(); }
  if (myTurn() && h) {
    const mv = myMoves().get(hk(h));
    if (mv) {
      if (mv.cost >= 2 && !(ui.confirmMove && same(ui.confirmMove, h))) { ui.confirmMove = h; renderAll(); hint(`Move costs ${mv.cost} moxie — tap again`); return; }
      ui.confirmMove = null; ui.inspect = null;
      send({ t: "move", to: h });
      return;
    }
  }
  ui.confirmMove = null;
  if (ui.inspect) { ui.inspect = null; }
  renderAll();
}
function play(slot, at) {
  const card = S.you.hand[slot];
  if (card && cardOf(card.key).cost > S.you.moxie) { toast(WHY.moxie); return; }
  send({ t: "play", slot, at });
  disarm();
}
function disarm() { ui.armed = null; ui.blastAt = null; renderAll(); }
function renderAll() { if (S?.phase === "fight") { renderBoard(); renderDock(); renderInspect(); } }

// ---------------------------------------------------------------------------------------------
// Dock
const cardBtns = [...document.querySelectorAll("#hand .card")];
cardBtns.forEach((b) => b.addEventListener("click", () => {
  const slot = +b.dataset.slot;
  const card = S?.you?.hand[slot]; if (!card || !myTurn()) return;
  const c = cardOf(card.key);
  if (ui.armed === slot) {
    if (c.shape === "self" || c.shape === "around" || c.shape === "random") return play(slot, { q: S.you.q, r: S.you.r });
    return disarm();
  }
  ui.armed = slot; ui.blastAt = null; ui.confirmMove = null; ui.inspect = null;
  renderAll();
}));
$("end").addEventListener("click", () => { if (myTurn()) { disarm(); send({ t: "end" }); } });

function renderDock() {
  const you = S.you, m = me();
  if (!you || !m) return;
  const b = bodyOf(you.body);
  $("me-name").textContent = b.name;
  $("me-hp-text").textContent = `♥ ${Math.max(0, m.hp)}/${m.mhp}${m.sh ? `  🛡 ${m.sh}` : ""}`;
  $("me-hp").style.width = `${100 * Math.max(0, m.hp) / Math.max(1, m.mhp)}%`;
  $("me-status").innerHTML = groupStatus(m.status).map((s) => `<span title="${esc(s.tip)}">${esc(s.label)}${s.n > 1 ? ` ×${s.n}` : ""}${s.turns ? ` · ${s.turns}t` : ""}</span>`).join("");
  // the armed card's full text floats over the board, so a short phone dock never hides it
  const info = $("cardinfo"), armedKey = ui.armed != null ? you.hand[ui.armed]?.key : null;
  info.classList.toggle("hidden", !armedKey);
  if (armedKey) { const c = cardOf(armedKey); info.style.setProperty("--k", kindColor(armedKey)); info.innerHTML = `<span class="c">${c.cost}</span><b>${esc(c.name)}</b><em>${esc(geoText(armedKey))}</em><p>${esc(c.text)}</p>`; }
  $("mx-num").textContent = you.moxie;
  $("mx-steps").textContent = you.steps > 0 && myTurn() ? `${you.steps} free step${you.steps > 1 ? "s" : ""}` : `Speed ${m.speed}`;
  const armedCost = ui.armed != null ? cardOf(you.hand[ui.armed]?.key).cost : ui.confirmMove ? (myMoves().get(hk(ui.confirmMove))?.cost ?? 0) : 0;
  $("mx-pips").innerHTML = Array.from({ length: CAT.moxieCap }, (_, i) =>
    `<i class="${i < you.moxie ? (i >= you.moxie - armedCost ? "spend" : "on") : ""}"></i>`).join("");
  cardBtns.forEach((btn, i) => {
    const card = you.hand[i];
    btn.classList.toggle("empty", !card);
    if (!card) { btn.innerHTML = ""; return; }
    const c = cardOf(card.key);
    btn.style.setProperty("--k", kindColor(card.key));
    btn.innerHTML = `<span class="c">${c.cost}</span><b>${esc(c.name)}</b><em>${esc(geoText(card.key))}</em><p>${esc(c.text)}</p>`;
    btn.classList.toggle("broke", c.cost > you.moxie);
    btn.classList.toggle("armed", ui.armed === i);
    btn.disabled = !myTurn();
  });
  const end = $("end");
  const waitNames = (S.waitingOn ?? []).filter((id) => id !== myId).map((id) => S.heroes.find((h) => h.id === id)?.name).filter(Boolean);
  end.disabled = !myTurn();
  end.textContent = S.turn === "foe" ? "Foes are acting…" : you.dead ? "You're down" : you.ended ? (waitNames.length ? `Waiting for ${waitNames.join(", ")}` : "Ending…") : "End turn";
  // banner + where
  $("where").textContent = `Room ${S.depth + 1} · Round ${S.round}`;
  const banner = $("banner");
  banner.className = S.turn === "foe" ? "foe" : myTurn() ? "you" : "";
  banner.textContent = S.turn === "foe" ? "Foes' turn" : myTurn() ? "Your turn" : you.dead ? "Down" : "Waiting";
  if (!hintLocked) {
    let h = "";
    if (myTurn()) {
      if (ui.armed != null) {
        const c = cardOf(you.hand[ui.armed]?.key);
        h = c.shape === "self" || c.shape === "around" || c.shape === "random" ? "Tap the card again to play it"
          : c.shape === "blast" ? "Tap a hex in range to aim"
          : cardReach(you.hand[ui.armed]?.key, me()).targets.length ? "Tap a lit foe" : "No foe in range — tap a card to put it down";
      } else h = "Tap a lit hex to move · tap a card · tap a foe to inspect";
    } else if (S.turn === "foe") h = "Tap a foe to see everything about it";
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
// identical effects (two copies of a repeating card) read as one chip with a count
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
    const q = e.queue ?? [];
    const th = threatOf(e);
    cards = `<p class="sect">Next card${th.short ? ` · saving up (needs ${th.short} more next turn)` : ""}</p>` + q.map((k, i) => qcard(k, i === 0)).join("");
  } else if (e.id === myId) {
    cards = `<p class="sect">Deck</p><div class="chips"><span>${S.you.deck} in draw pile</span><span>${S.you.disc} discarded</span><span>${S.you.deckList.length} cards total</span></div>`;
  }
  box.innerHTML = `
    <header class="${foe ? "foe" : "hero"}"><img src="${artUrl(e.body)}" alt=""><div><div class="tag">${foe ? (b.elite ? "Elite foe" : "Foe") : "Mimic"}</div><h3>${esc(name)}</h3></div>
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
const SCREENS = ["boot", "draft", "doors", "reward", "over"];
function showScreen(scr) {
  for (const id of SCREENS) $(id).classList.toggle("hidden", id !== scr && !(scr === "wait" && id === "doors"));
  const inFight = scr === "fight";
  $("dock").classList.toggle("hidden", !inFight);
  $("field").classList.toggle("hidden", !inFight);
  if (inFight) { ui.inspect = null; renderAll(); }
  else renderScreen(scr);
}
function bodyChoice(k, extra = "", foeSide = false) {
  const b = bodyOf(k);
  return `<div class="head"><img src="${artUrl(k)}" alt=""><div><b>${esc(b.name)}</b><div class="meta">♥ ${b.hp} · Speed ${b.speed}${b.elite ? " · Elite" : ""}</div></div></div>${extra}`;
}
const cardList = (keys) => `<ul>${keys.map((k) => `<li style="--k:${kindColor(k)}" title="${esc(cardOf(k).text)}">${esc(cardOf(k).name)} · ${cardOf(k).cost}</li>`).join("")}</ul>`;
function renderScreen(scr) {
  if (!S) return;
  if (scr === "draft") {
    $("offers").innerHTML = (S.offers ?? []).map((o, i) =>
      `<button class="choice" data-i="${i}">${bodyChoice(o.bodyKey, `<p>${esc(bodyOf(o.bodyKey).passive)}</p>${cardList(o.deck)}`)}</button>`).join("")
      || `<p class="fine">Picked — waiting for the others…</p>`;
    $("offers").querySelectorAll(".choice").forEach((b) => b.onclick = () => send({ t: "draft", i: +b.dataset.i }));
    $("draft-wait").textContent = S.you?.picked && S.waiting?.length ? `Waiting for ${S.waiting.join(", ")}` : "Body passives are not active in tactics yet.";
  } else if (scr === "doors" || scr === "wait") {
    $("doors-eyebrow").textContent = `Room ${S.depth + 1}`;
    const names = Object.fromEntries((S.heroes ?? []).map((h) => [h.id, h.name]));
    $("door-list").innerHTML = (S.doors ?? []).map((d, i) => {
      const voters = Object.entries(S.votes ?? {}).filter(([, v]) => v === i).map(([id]) => `<i>${esc(id === myId ? "You" : names[id] ?? "Ally")}</i>`).join("");
      return `<button class="choice foeside${S.votes?.[myId] === i ? " picked" : ""}" data-i="${i}"><div class="votes">${voters}</div><div class="door-foes">${d.foes.map((f) =>
        `<div class="door-foe"><img src="${artUrl(f.bodyKey)}" alt=""><div><b>${esc(bodyOf(f.bodyKey).name)}</b><div class="meta">♥ ${bodyOf(f.bodyKey).hp}${bodyOf(f.bodyKey).elite ? " · Elite" : ""}</div>${cardList(f.kit)}</div></div>`).join("")}</div></button>`;
    }).join("");
    $("door-list").querySelectorAll(".choice").forEach((b) => b.onclick = () => send({ t: "door", i: +b.dataset.i }));
    $("door-wait").textContent = scr === "wait" ? "You'll join at the next door." : (S.heroes?.length ?? 0) > 1 ? "Everyone votes; most votes wins." : "";
  } else if (scr === "reward") {
    const r = S.reward;
    if (!r) return;
    $("loot").innerHTML = r.cards.map((k, i) => `<button class="choice${r.card === i ? " picked" : ""}" data-kind="card" data-i="${i}" style="border-left:4px solid ${kindColor(k)}"><b>${esc(cardOf(k).name)} · ${cardOf(k).cost}</b><div class="meta">${esc(geoText(k))}</div><p>${esc(cardOf(k).text)}</p></button>`).join("") || `<p class="fine">Nothing to take.</p>`;
    $("bodies").innerHTML = r.bodies.map((k, i) => `<button class="choice foeside${r.body === i ? " picked" : ""}" data-kind="body" data-i="${i}">${bodyChoice(k, `<p>${esc(bodyOf(k).passive)}</p>`)}</button>`).join("");
    for (const b of document.querySelectorAll("#reward .choice")) b.onclick = () => send({ t: "reward", kind: b.dataset.kind, i: +b.dataset.i });
    $("reward-done").disabled = r.done;
    $("reward-done").textContent = r.done ? "Waiting for the party…" : r.body != null ? "Wear it and continue" : "Continue";
  } else if (scr === "over") {
    $("over-text").textContent = S.depth ? `You cleared ${S.depth} room${S.depth > 1 ? "s" : ""}.` : "The first room took you.";
  }
}
$("reward-done").onclick = () => send({ t: "reward", kind: "done", i: 0 });
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
