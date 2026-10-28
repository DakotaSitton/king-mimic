// King Mimic twin-stick client. Renders server snapshots on a canvas, predicts your own token,
// and sends: stick movement, card plays (3 visible cards), foe taps (targeting).
const $ = (id) => document.getElementById(id);
const canvas = $("stage"), ctx = canvas.getContext("2d");
const params = new URLSearchParams(location.search);
const ROOM = (params.get("room") || "main").replace(/[^\w-]/g, "").slice(0, 24) || "main";
const CID_KEY = "km-rt-cid";
// per TAB (sessionStorage): survives reloads and a sleeping phone, but two tabs are two players
let cid = sessionStorage.getItem(CID_KEY);
if (!cid) { cid = "p" + Math.random().toString(36).slice(2, 12); sessionStorage.setItem(CID_KEY, cid); }

let ws = null, myId = null, CAT = null;
let snaps = [];             // [{at, s}] newest last
let S = null;               // latest snapshot
const local = { x: 2, y: 4.5, fs: -1, phase: null, lastSend: 0 };
const fx = [];              // transient effects: {k, t0, dur, ...}
const icons = new Map();

// ---------------------------------------------------------------------------------------------
// Net
function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => ws.send(JSON.stringify({ t: "hello", cid, room: ROOM, name: ($("name").value || localStorage.getItem("km-rt-name") || "Mimic").trim() }));
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === "welcome") { myId = m.id; CAT = m.catalog; return; }
    if (m.t === "nope") return onNope(m);
    if (m.t === "state") onState(m);
  };
  ws.onclose = (ev) => {
    if (ev.code === 4000) { toast("Opened in another tab"); return; }
    toast("Reconnecting…"); setTimeout(connect, 1000);
  };
}
const send = (o) => { if (ws?.readyState === 1) ws.send(JSON.stringify(o)); };

function onState(s) {
  const now = performance.now();
  snaps.push({ at: now, s });
  if (snaps.length > 6) snaps.shift();
  const prevPhase = S?.phase;
  S = s;
  if (s.you) {
    if (s.you.fs !== local.fs || s.phase !== "fight" || s.you.dead) { local.x = s.you.x; local.y = s.you.y; local.fs = s.you.fs; }
  }
  for (const e of s.fx ?? []) if (e.x != null) lastPos.set(e.id, { x: e.x, y: e.y, r: 0.55 });
  for (const e of [...(s.foes ?? []), ...(s.heroes ?? [])]) lastPos.set(e.id, { x: e.x, y: e.y, r: e.r });
  for (const e of s.fx ?? []) spawnFx(e, now);
  const scr = screenFor(s);
  if (prevPhase !== s.phase || scr !== lastScreen) { lastScreen = scr; onPhase(); }
  renderPanels();
}

// ---------------------------------------------------------------------------------------------
// Input: left-half floating stick, taps on foes, keyboard for desk testing
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0, t0: 0, moved: 0 };
const STICK_R = 56;
const keys = new Set();
function arenaRect() {
  const W = innerWidth, H = innerHeight;
  const handW = $("hand").classList.contains("hidden") ? 0 : $("hand").getBoundingClientRect().width;
  const aw = CAT?.arena.w ?? 16, ah = CAT?.arena.h ?? 9;
  const padT = 38, pad = 8, padB = 24;   // padB keeps HP bars under bottom-row tokens on screen
  const availW = W - handW - pad * 2, availH = H - padT - padB;
  const sc = Math.min(availW / aw, availH / ah);
  return { sc, ox: pad + (availW - aw * sc) / 2, oy: padT + (availH - ah * sc) / 2, w: aw * sc, h: ah * sc };
}
const toScreen = (x, y, R = arenaRect()) => [R.ox + x * R.sc, R.oy + y * R.sc];
function foeAt(px, py) {
  if (!S) return null;
  const R = arenaRect();
  let best = null, bd = Infinity;
  for (const f of renderFoes()) {
    const [sx, sy] = toScreen(f.x, f.y, R);
    const d = Math.hypot(px - sx, py - sy);
    if (d < f.r * R.sc + 18 && d < bd) { bd = d; best = f; }
  }
  return best;
}
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const f = foeAt(t.clientX, t.clientY);
    if (stick.id == null && t.clientX < innerWidth * 0.5 && !f) {
      Object.assign(stick, { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY, vx: 0, vy: 0, t0: performance.now(), moved: 0 });
    } else {
      tapAt(t.clientX, t.clientY);
    }
  }
}, { passive: false });
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) if (t.identifier === stick.id) {
    const dx = t.clientX - stick.ox, dy = t.clientY - stick.oy, d = Math.hypot(dx, dy);
    stick.moved = Math.max(stick.moved, d);
    // the base follows the thumb past the rim so direction changes stay instant
    if (d > STICK_R) { stick.ox = t.clientX - dx / d * STICK_R; stick.oy = t.clientY - dy / d * STICK_R; }
    stick.x = t.clientX; stick.y = t.clientY;
    const ddx = stick.x - stick.ox, ddy = stick.y - stick.oy, dd = Math.hypot(ddx, ddy);
    const mag = dd < 6 ? 0 : Math.min(1, dd / STICK_R);
    stick.vx = dd ? ddx / dd * mag : 0; stick.vy = dd ? ddy / dd * mag : 0;
  }
}, { passive: false });
const endTouch = (e) => {
  for (const t of e.changedTouches) if (t.identifier === stick.id) {
    if (stick.moved < 10 && performance.now() - stick.t0 < 260) tapAt(t.clientX, t.clientY);
    stick.id = null; stick.vx = stick.vy = 0;
  }
};
canvas.addEventListener("touchend", endTouch);
canvas.addEventListener("touchcancel", endTouch);
canvas.addEventListener("mousedown", (e) => tapAt(e.clientX, e.clientY));
function tapAt(px, py) {
  if (S?.phase !== "fight") return;
  const f = foeAt(px, py);
  if (f) send({ t: "target", id: f.id });
  else if (px > innerWidth * 0.5) send({ t: "target", id: null });   // tap open ground → back to auto
}
addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if (["1", "2", "3"].includes(e.key)) play(+e.key - 1);
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
function moveVector() {
  let x = stick.vx, y = stick.vy;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  if (keys.has("w") || keys.has("arrowup")) y -= 1;
  if (keys.has("s") || keys.has("arrowdown")) y += 1;
  const m = Math.hypot(x, y);
  return m > 1 ? [x / m, y / m] : [x, y];
}
for (const b of document.querySelectorAll(".card")) {
  b.addEventListener("touchstart", (e) => { e.preventDefault(); play(+b.dataset.slot); }, { passive: false });
  b.addEventListener("click", () => play(+b.dataset.slot));
}
function play(slot) { if (S?.phase === "fight") send({ t: "play", slot }); }
const NOPE = { moxie: "Not enough moxie", reach: "Too far — get closer", noTarget: "No foe to target", busy: null, down: "You're down", empty: null };
function onNope(m) {
  const el = document.querySelector(`.card[data-slot="${m.slot}"]`);
  if (el) { el.classList.remove("nope"); void el.offsetWidth; el.classList.add("nope"); }
  if (NOPE[m.why]) toast(NOPE[m.why]);
}
let toastTimer = 0;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), 1100); }

// ---------------------------------------------------------------------------------------------
// Prediction + interpolation
let lastFrame = performance.now();
function tickLocal(dt) {
  if (!S || S.phase !== "fight" || !S.you || S.you.dead) return;
  const [vx, vy] = moveVector();
  const sp = S.you.speed ?? 4.2, me = S.heroes.find((h) => h.id === myId);
  const r = me?.r ?? 0.55, aw = CAT.arena.w, ah = CAT.arena.h;
  local.x = Math.max(r, Math.min(aw - r, local.x + vx * sp * dt));
  local.y = Math.max(r, Math.min(ah - r, local.y + vy * sp * dt));
  // tokens don't stack: your own token slides off foes locally (the server moves foes off you too)
  for (const f of S.foes ?? []) {
    const dx = local.x - f.x, dy = local.y - f.y, d = Math.hypot(dx, dy), min = r + f.r;
    if (d > 0 && d < min) { local.x += dx / d * (min - d); local.y += dy / d * (min - d); }
  }
  local.x = Math.max(r, Math.min(aw - r, local.x)); local.y = Math.max(r, Math.min(ah - r, local.y));
  const now = performance.now();
  if (now - local.lastSend > 45) { local.lastSend = now; send({ t: "move", x: +local.x.toFixed(3), y: +local.y.toFixed(3), fs: local.fs }); }
}
const INTERP_MS = 100;
function interpEnts(list) {
  if (snaps.length < 2) return S?.[list] ?? [];
  const rt = performance.now() - INTERP_MS;
  let a = snaps[0], b = snaps[snaps.length - 1];
  for (let i = snaps.length - 1; i > 0; i--) if (snaps[i - 1].at <= rt) { a = snaps[i - 1]; b = snaps[i]; break; }
  const k = Math.max(0, Math.min(1, (rt - a.at) / Math.max(1, b.at - a.at)));
  const prev = new Map((a.s[list] ?? []).map((e) => [e.id, e]));
  return (b.s[list] ?? []).map((e) => {
    const p = prev.get(e.id);
    return p ? { ...e, x: p.x + (e.x - p.x) * k, y: p.y + (e.y - p.y) * k } : e;
  });
}
const renderFoes = () => interpEnts("foes");
function renderHeroes() {
  return interpEnts("heroes").map((h) => (h.id === myId && S.phase === "fight" && !h.dead ? { ...h, x: local.x, y: local.y } : h));
}

// ---------------------------------------------------------------------------------------------
// Effects
function spawnFx(e, now) {
  if (e.k === "hit") fx.push({ k: "num", id: e.id, x: e.x, y: e.y, s: e.n > 0 ? "-" + e.n : "0", c: e.id === myId ? "#ff6f61" : "#fff4e0", t0: now, dur: 800 });
  else if (e.k === "heal") fx.push({ k: "num", id: e.id, s: "+" + e.n, c: "#7be38f", t0: now, dur: 800 });
  else if (e.k === "shield") fx.push({ k: "num", id: e.id, s: "+" + e.n + " shield", c: "#7cc7ff", t0: now, dur: 800 });
  else if (e.k === "buff") fx.push({ k: "num", id: e.id, s: e.s, c: "#f2c14e", t0: now, dur: 900 });
  else if (e.k === "strike" || e.k === "cast") {
    if (e.k === "cast" && e.shape !== "self") return;   // the strike event draws hits
    fx.push({ k: "strike", src: e.src, to: e.to ?? [], shape: e.shape, color: CAT?.cards?.[e.key]?.color ?? "#fff", t0: now, dur: 260 });
  } else if (e.k === "die") fx.push({ k: "puff", x: e.x, y: e.y, t0: now, dur: 500 });
  else if (e.k === "room") toast("Room " + e.n);
}
const lastPos = new Map();
const findEnt = (id) => [...(S?.foes ?? []), ...(S?.heroes ?? [])].find((e) => e.id === id) ?? (id === myId ? { x: local.x, y: local.y } : lastPos.get(id) ?? null);

// ---------------------------------------------------------------------------------------------
// Drawing
function icon(key) {
  if (!key) return null;
  if (!icons.has(key)) {
    const img = new Image(); img.src = `/foes/${key}.svg`;
    const rec = { img, ok: false, bad: false };
    img.onload = () => (rec.ok = true); img.onerror = () => (rec.bad = true);
    icons.set(key, rec);
  }
  return icons.get(key);
}
const ZONE_FILL = "rgba(255,111,97,", ZONE_LINE = "#ff6f61";
function pathZone(z, R, scale = 1) {
  const [x, y] = toScreen(z.x ?? 0, z.y ?? 0, R), s = R.sc;
  ctx.beginPath();
  if (z.shape === "circle") ctx.arc(x, y, z.r * s * scale, 0, Math.PI * 2);
  else if (z.shape === "arc") { ctx.moveTo(x, y); ctx.arc(x, y, z.r * s * scale, z.a - z.half, z.a + z.half); ctx.closePath(); }
  else if (z.shape === "line") {
    const ca = Math.cos(z.a), sa = Math.sin(z.a), L = z.len * s * scale, hw = z.w * s / 2;
    ctx.moveTo(x - sa * hw, y + ca * hw); ctx.lineTo(x - sa * hw + ca * L, y + ca * hw + sa * L);
    ctx.lineTo(x + sa * hw + ca * L, y - ca * hw + sa * L); ctx.lineTo(x + sa * hw, y - ca * hw); ctx.closePath();
  }
}
function drawZone(z, p, R, linger = false) {
  if (!z) return;
  if (z.shape === "multi") { for (const c of z.parts) drawZone(c, p, R, linger); return; }
  ctx.save();
  if (linger && p <= 0) {
    pathZone(z, R); ctx.setLineDash([6, 6]); ctx.strokeStyle = "rgba(255,111,97,.55)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore(); return;
  }
  pathZone(z, R); ctx.fillStyle = ZONE_FILL + "0.16)"; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = ZONE_LINE; ctx.stroke();
  pathZone(z, R, Math.max(0.02, p)); ctx.fillStyle = ZONE_FILL + (0.25 + 0.3 * p) + ")"; ctx.fill();
  ctx.restore();
}
function drawFloor(R) {
  ctx.fillStyle = "#14111c"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#211b2d"; ctx.fillRect(R.ox, R.oy, R.w, R.h);
  ctx.strokeStyle = "rgba(255,255,255,.045)"; ctx.lineWidth = 1;
  for (let x = 1; x < CAT.arena.w; x++) { ctx.beginPath(); ctx.moveTo(R.ox + x * R.sc, R.oy); ctx.lineTo(R.ox + x * R.sc, R.oy + R.h); ctx.stroke(); }
  for (let y = 1; y < CAT.arena.h; y++) { ctx.beginPath(); ctx.moveTo(R.ox, R.oy + y * R.sc); ctx.lineTo(R.ox + R.w, R.oy + y * R.sc); ctx.stroke(); }
  ctx.strokeStyle = "#4a3f60"; ctx.lineWidth = 4; ctx.strokeRect(R.ox - 2, R.oy - 2, R.w + 4, R.h + 4);
}
function drawToken(e, R, opts = {}) {
  const [x, y] = toScreen(e.x, e.y, R), rad = e.r * R.sc;
  const ring = e.side === "foe" ? "#ff6f61" : e.id === myId ? "#4fd1c5" : "#86e0d6";
  ctx.save();
  if (e.dead) ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.arc(x, y + rad * 0.18, rad * 1.02, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fillStyle = "#efe7d8"; ctx.fill();
  const ic = icon(CAT.bodies[e.body]?.art);
  if (ic?.ok) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, rad * 0.92, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(ic.img, x - rad * 0.9, y - rad * 0.9, rad * 1.8, rad * 1.8); ctx.restore(); }
  else { ctx.fillStyle = CAT.bodies[e.body]?.color ?? "#999"; ctx.font = `700 ${Math.round(rad)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText((CAT.bodies[e.body]?.name ?? "?")[0], x, y + 1); }
  ctx.lineWidth = Math.max(2.5, rad * 0.16); ctx.strokeStyle = ring; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.stroke();
  // HP + shield bar under the token
  const bw = Math.max(34, rad * 2.2), bh = 6, bx = x - bw / 2, by = y + rad + 4;
  ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = e.side === "foe" ? "#ff6f61" : "#4fd1c5"; ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.mhp), bh);
  if (e.sh > 0) { ctx.fillStyle = "#7cc7ff"; ctx.fillRect(bx, by - 3, Math.min(bw, bw * e.sh / e.mhp), 3); }
  ctx.font = "700 11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = "#f3ecdf";
  ctx.fillText(`${e.hp}${e.sh ? " +" + e.sh : ""}`, x, by + bh + 1);
  ctx.restore();
  if (e.side === "foe" && !e.dead) drawFoeIntent(e, x, y, rad);
  if (e.side === "hero" && e.id !== myId) { ctx.font = "700 11px system-ui"; ctx.fillStyle = "#86e0d6"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(e.name ?? "", x, y - rad - 3); }
}
// The foe's visible telegraph: its NEXT card (name + moxie charge) floats over its head.
function drawFoeIntent(e, x, y, rad) {
  const card = CAT.cards[e.cast?.key ?? e.next];
  if (!card) return;
  const label = card.name, cost = card.cost;
  ctx.save();
  ctx.font = "700 11px system-ui";
  const tw = ctx.measureText(label).width, w = tw + 26, h = 17, bx = x - w / 2, by = y - rad - h - 5;
  ctx.fillStyle = e.cast ? "#ff6f61" : "rgba(31,26,43,.92)"; roundRect(bx, by, w, h, 6); ctx.fill();
  ctx.strokeStyle = card.color; ctx.lineWidth = 1.5; ctx.stroke();
  // moxie charge pie toward the card's cost
  const f = e.cast ? 1 : Math.min(1, e.mx / Math.max(1, cost));
  ctx.beginPath(); ctx.moveTo(bx + 10, by + h / 2); ctx.arc(bx + 10, by + h / 2, 6, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.closePath();
  ctx.fillStyle = "#f2c14e"; ctx.fill();
  ctx.beginPath(); ctx.arc(bx + 10, by + h / 2, 6, 0, Math.PI * 2); ctx.strokeStyle = "rgba(242,193,78,.6)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = e.cast ? "#2a0b07" : "#f3ecdf"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(label, bx + 20, by + h / 2 + 0.5);
  ctx.restore();
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawTargetMark(f, R, tapped) {
  const [x, y] = toScreen(f.x, f.y, R), rad = f.r * R.sc + 7, t = performance.now() / 1000;
  ctx.save(); ctx.strokeStyle = "#f2c14e"; ctx.lineWidth = 3; if (!tapped) ctx.setLineDash([5, 5]);
  const spin = tapped ? 0 : t;
  for (let i = 0; i < 4; i++) { const a = spin + i * Math.PI / 2; ctx.beginPath(); ctx.arc(x, y, rad, a + 0.25, a + Math.PI / 2 - 0.25); ctx.stroke(); }
  ctx.restore();
}
function drawStick() {
  if (stick.id == null) {
    if (S?.phase !== "fight") return;
    ctx.save(); ctx.globalAlpha = 0.22; ctx.strokeStyle = "#f3ecdf"; ctx.lineWidth = 2;
    const x = 26 + STICK_R + 10, y = innerHeight - STICK_R - 22;
    ctx.beginPath(); ctx.arc(x, y, STICK_R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fillStyle = "#f3ecdf"; ctx.fill(); ctx.restore();
    return;
  }
  ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = "#f3ecdf"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(stick.ox, stick.oy, STICK_R, 0, Math.PI * 2); ctx.stroke();
  const kx = stick.ox + stick.vx * STICK_R, ky = stick.oy + stick.vy * STICK_R;
  ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(kx, ky, 22, 0, Math.PI * 2); ctx.fillStyle = "#4fd1c5"; ctx.fill(); ctx.restore();
}
function drawFx(R, now) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i], k = (now - f.t0) / f.dur;
    if (k >= 1) { fx.splice(i, 1); continue; }
    ctx.save();
    if (f.k === "num") {
      const e = findEnt(f.id) ?? (f.x != null ? { x: f.x, y: f.y, r: 0.55 } : null); if (!e) { ctx.restore(); continue; }
      const [x, y] = toScreen(e.x, e.y, R);
      ctx.globalAlpha = 1 - k * k; ctx.font = "800 15px system-ui"; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.7)";
      const yy = y - (e.r ?? 0.55) * R.sc - 26 - k * 22;
      ctx.strokeText(f.s, x, yy); ctx.fillStyle = f.c; ctx.fillText(f.s, x, yy);
    } else if (f.k === "strike") {
      const src = findEnt(f.src); if (!src) { ctx.restore(); continue; }
      const [sx, sy] = toScreen(src.x, src.y, R);
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.color; ctx.lineWidth = 4; ctx.lineCap = "round";
      for (const id of f.to) {
        const t = findEnt(id); if (!t) continue;
        const [tx, ty] = toScreen(t.x, t.y, R);
        if (f.shape === "arc" || f.shape === "line") {
          const a = Math.atan2(ty - sy, tx - sx), rr = Math.hypot(tx - sx, ty - sy);
          ctx.beginPath(); ctx.arc(sx, sy, rr * (0.7 + 0.3 * k), a - 0.7, a + 0.7); ctx.stroke();
        } else if (f.shape === "around" || f.shape === "blast") {
          ctx.beginPath(); ctx.arc(tx, ty, 10 + k * 26, 0, Math.PI * 2); ctx.stroke();
        } else {
          const px = sx + (tx - sx) * Math.min(1, k * 2.2), py = sy + (ty - sy) * Math.min(1, k * 2.2);
          ctx.beginPath(); ctx.moveTo(sx + (tx - sx) * Math.max(0, k * 2.2 - 0.4), sy + (ty - sy) * Math.max(0, k * 2.2 - 0.4)); ctx.lineTo(px, py); ctx.stroke();
          ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fillStyle = f.color; ctx.fill();
        }
      }
      if (f.shape === "around") { ctx.beginPath(); ctx.arc(sx, sy, R.sc * 2.6 * k, 0, Math.PI * 2); ctx.stroke(); }
      if (f.shape === "self") { ctx.beginPath(); ctx.arc(sx, sy, R.sc * (0.6 + 0.6 * k), 0, Math.PI * 2); ctx.stroke(); }
    } else if (f.k === "puff") {
      const [x, y] = toScreen(f.x, f.y, R);
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = "#ff6f61"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, R.sc * (0.5 + k), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}
function frame() {
  const now = performance.now(), dt = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now;
  const dpr = Math.min(2, devicePixelRatio || 1);
  if (canvas.width !== Math.round(innerWidth * dpr) || canvas.height !== Math.round(innerHeight * dpr)) { canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  tickLocal(dt);
  if (CAT && S) {
    const R = arenaRect();
    drawFloor(R);
    if (S.phase === "fight") {
      const foes = renderFoes(), heroes = renderHeroes();
      for (const f of foes) for (const z of f.zones ?? []) drawZone(z.zone, z.p, R, z.linger);
      for (const f of foes) if (f.cast) drawZone(f.cast.zone, f.cast.p, R);
      const me = heroes.find((h) => h.id === myId);
      if (me && !me.dead && (S.you?.hand ?? []).some((c) => c && CAT.cards[c.key]?.reach)) {
        const [x, y] = toScreen(me.x, me.y, R);
        ctx.save(); ctx.strokeStyle = "rgba(242,193,78,.28)"; ctx.setLineDash([4, 6]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, (me.r + CAT.reach + 0.55) * R.sc, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      const tgt = foes.find((f) => f.id === S.you?.target);
      for (const h of heroes) drawToken(h, R);
      for (const f of foes) drawToken(f, R);
      if (tgt) drawTargetMark(tgt, R, S.you.tapped === tgt.id);
      drawFx(R, now);
    }
  } else { ctx.fillStyle = "#14111c"; ctx.fillRect(0, 0, innerWidth, innerHeight); }
  drawStick();
  if (S?.phase === "fight") renderHand();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------------------------
// Panels (DOM)
const cardName = (k) => CAT?.cards[k]?.name ?? "Card";
const bodyName = (k) => CAT?.bodies[k]?.name ?? "Body";
const KIND_LABEL = { melee: "Melee", ranged: "Ranged", both: "Both", none: "Support" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ico = (k, cls = "") => {
  const art = CAT?.bodies[k]?.art;
  return art ? `<img class="ico ${cls}" src="/foes/${art}.svg" alt="">`
    : `<span class="ico ${cls}" style="display:grid;place-items:center;color:#2a1c00">${esc((bodyName(k) || "?")[0])}</span>`;
};
function chips(keys) {
  const counts = new Map(); for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  return `<div class="chips">${[...counts].map(([k, n]) => `<span class="chip" style="--c:${CAT.cards[k]?.color ?? "#888"}">${esc(cardName(k))}${n > 1 ? " ×" + n : ""}</span>`).join("")}</div>`;
}
function show(id) {
  for (const s of ["boot", "draft", "doors", "reward", "over"]) $(s).classList.toggle("hidden", s !== id);
  const fight = id === null;
  $("hud").classList.toggle("hidden", !fight); $("hand").classList.toggle("hidden", !fight);
}
let started = false, lastScreen = undefined;
const screenFor = (s) => (!s.you?.picked || s.you?.waitNext) && s.phase !== "over" ? "draft" : s.phase === "fight" ? null : s.phase;
function onPhase() {
  if (!started || !S) return;
  show(screenFor(S));
  if (S.phase !== "fight") { stick.id = null; stick.vx = stick.vy = 0; }
}
let panelKey = "";
function renderPanels() {
  if (!started || !S || !CAT) return;
  const key = JSON.stringify([S.phase, S.offers, S.doors, S.votes, S.reward, S.waiting, S.you?.picked, S.you?.waitNext, S.depth]);
  if (key === panelKey) return; panelKey = key;
  if (screenFor(S) === "draft") {
    document.querySelector("#draft h2").textContent = S.you?.picked ? "Joining your party" : "Pick your first body";
    if (S.offers && !S.you?.picked) {
      $("offers").innerHTML = S.offers.map((o, i) => `<button class="pick" data-i="${i}">
        <div class="head">${ico(o.bodyKey, "you")}<div><b>${esc(bodyName(o.bodyKey))}</b><div class="hp">${CAT.bodies[o.bodyKey]?.hp ?? "?"} health</div></div></div>
        ${chips(o.deck)}</button>`).join("");
      for (const b of $("offers").querySelectorAll(".pick")) b.onclick = () => send({ t: "draft", i: +b.dataset.i });
      $("draft-wait").textContent = "";
    } else {
      $("offers").innerHTML = "";
      $("draft-wait").textContent = S.you?.waitNext ? "Your party is mid-room — you join at the next door."
        : S.waiting?.length ? `Waiting for ${S.waiting.join(", ")}…` : "Starting…";
    }
  } else if (S.phase === "doors") {
    $("doors-title").textContent = `Room ${S.depth + 1} — choose a room by what's inside`;
    const names = new Map((S.heroes ?? []).map((h) => [h.id, h.name]));
    $("door-list").innerHTML = S.doors.map((d, i) => {
      const voters = Object.entries(S.votes ?? {}).filter(([, v]) => v === i).map(([pid]) => names.get(pid) ?? "?");
      return `<button class="pick ${S.votes?.[myId] === i ? "chosen" : ""}" data-i="${i}">
        ${(S.heroes ?? []).length > 1 ? `<div class="votes">${voters.length ? "✓ " + esc(voters.join(", ")) : "&nbsp;"}</div>` : ""}
        ${d.foes.map((f) => `<div class="foe-line">${ico(f.bodyKey)}<div class="who"><b>${esc(bodyName(f.bodyKey))}${CAT.bodies[f.bodyKey]?.elite ? " ★" : ""}</b>
          <span class="hp">${CAT.bodies[f.bodyKey]?.hp ?? "?"} health</span>${chips(f.kit)}</div></div>`).join("")}</button>`;
    }).join("");
    for (const b of $("door-list").querySelectorAll(".pick")) b.onclick = () => send({ t: "door", i: +b.dataset.i });
    const others = (S.heroes ?? []).length > 1;
    $("door-wait").textContent = S.votes?.[myId] != null && others ? "Waiting for the party to agree…" : others ? "Everyone taps a door; most votes wins." : "";
  } else if (S.phase === "reward" && S.reward) {
    const r = S.reward;
    $("loot").innerHTML = r.cards.length ? r.cards.map((k, i) => `<button class="mini ${r.card === i ? "chosen" : ""}" data-kind="card" data-i="${i}">
      <div class="top"><span class="c">${CAT.cards[k]?.cost ?? "?"}</span><b>${esc(cardName(k))}</b></div><div class="t">${esc(CAT.cards[k]?.text ?? "")}</div></button>`).join("")
      : `<p class="fine">Nothing to take.</p>`;
    $("bodies").innerHTML = r.bodies.map((k, i) => `<button class="mini ${r.body === i ? "chosen" : ""}" data-kind="body" data-i="${i}">
      <div class="top">${ico(k)}<b>${esc(bodyName(k))}</b></div><div class="t">${CAT.bodies[k]?.hp ?? "?"} health</div></button>`).join("")
      + `<button class="mini ${r.body == null ? "chosen" : ""}" data-kind="keep"><div class="top">${ico(S.you.body, "you")}<b>Stay ${esc(bodyName(S.you.body))}</b></div><div class="t">${S.you.mhp} health</div></button>`;
    for (const b of document.querySelectorAll("#reward .mini")) b.onclick = () => {
      if (b.dataset.kind === "keep") { if (r.body != null) send({ t: "reward", kind: "body", i: r.body }); }
      else send({ t: "reward", kind: b.dataset.kind, i: +b.dataset.i });
    };
    $("reward-done").disabled = r.done;
    $("reward-wait").textContent = r.done ? "Waiting for the party…" : "";
  } else if (S.phase === "over") {
    $("over-text").textContent = `You cleared ${S.depth} room${S.depth === 1 ? "" : "s"}.`;
  }
}
$("reward-done").onclick = () => send({ t: "reward", kind: "done", i: 0 });
$("restart").onclick = () => send({ t: "restart" });

let handKey = "";
function renderHand() {
  const y = S.you; if (!y) return;
  const moxie = y.moxie;
  const k = JSON.stringify([y.hand, Math.floor(moxie * 10), y.hp, y.mhp, (S.heroes.find((h) => h.id === myId) ?? {}).sh, y.deck, y.disc, S.depth]);
  if (k === handKey) return; handKey = k;
  document.querySelectorAll(".card").forEach((el, i) => {
    const c = y.hand[i];
    if (!c) { el.className = "card empty"; el.innerHTML = ""; return; }
    const card = CAT.cards[c.key] ?? { name: "?", cost: 0, text: "", kind: "none" };
    const charge = Math.min(1, moxie / Math.max(1, card.cost));
    el.className = "card" + (c.ok ? " ready" : "") + (c.why === "reach" ? " far" : "");
    el.innerHTML = `<span class="stripe" style="background:${card.color}"></span><span class="cost">${card.cost}</span>
      <span class="tag">${c.why === "reach" ? "Too far" : KIND_LABEL[card.kind] ?? ""}</span>
      <span class="name">${esc(card.name)}</span><span class="text">${esc(card.text)}</span>
      <span class="charge" style="width:${charge * 100}%"></span>`;
  });
  const pips = $("moxie-pips");
  if (pips.children.length !== 10) pips.innerHTML = "<i></i>".repeat(10);
  [...pips.children].forEach((p, i) => { p.className = moxie >= i + 1 ? "on" : moxie > i ? "part" : ""; if (p.className === "part") p.style.setProperty("--f", ((moxie - i) * 100).toFixed(0) + "%"); });
  $("moxie-text").textContent = Math.floor(moxie);
  $("deck-count").textContent = `Deck ${y.deck} · Discard ${y.disc}`;
  const me = S.heroes.find((h) => h.id === myId);
  $("me-name").textContent = `${S.heroes.length > 1 ? (me?.name ?? "") + " · " : ""}${bodyName(y.body)}`;
  $("me-hp").style.width = `${Math.max(0, y.hp / y.mhp) * 100}%`;
  $("me-sh").style.width = `${Math.min(1, (me?.sh ?? 0) / y.mhp) * 100}%`;
  $("me-hp-text").textContent = `${y.hp}/${y.mhp}${me?.sh ? " · shield " + me.sh : ""}`;
  $("me-tags").textContent = y.dead ? "Down — your party can still clear the room" : (me?.tags ?? []).join(" · ");
  $("room-label").textContent = `Room ${S.depth + 1}`;
}

// ---------------------------------------------------------------------------------------------
// Boot
$("name").value = localStorage.getItem("km-rt-name") || "";
$("room-hint").textContent = ROOM === "main" ? "Friends who open this same link join your run." : `Room: ${ROOM}`;
$("go").onclick = async () => {
  const n = ($("name").value || "Mimic").trim(); localStorage.setItem("km-rt-name", n);
  try { await document.documentElement.requestFullscreen?.({ navigationUI: "hide" }); } catch {}
  try { await screen.orientation?.lock?.("landscape"); } catch {}
  started = true;
  if (!ws) connect();
  else if (ws.readyState === 1) ws.send(JSON.stringify({ t: "hello", cid, room: ROOM, name: n }));
  panelKey = "";
  if (S) { onPhase(); renderPanels(); }
};
requestAnimationFrame(frame);
window.__km = { get S() { return S; }, get local() { return local; }, arenaRect, toScreen, get myId() { return myId; } };
