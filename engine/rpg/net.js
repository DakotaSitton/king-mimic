// King Mimic — RPG crawler co-op wire format (forked from FLICK). The server runs the sim; each phone gets
// the floor once (again on every new floor) and then ~20 snapshots a second carrying only what it needs
// (its own bag, everyone's bodies, loadouts and reticles, new effects, newly explored tiles). The phone
// rebuilds a state object with the same shape the sim uses, so the renderer and the reticle code
// (shapeOf / hitsOf / dmgAgainst) work on it unchanged.

const r3 = (v) => Math.round(v * 1000) / 1000;
const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; };

// ---------------------------------------------------------------- server side
export function initFor(S, pid) {
  const f = S.floor, me = S.ents.find((e) => e.kind === "player" && e.pid === pid);
  return { t: "init", you: me?.pub ?? pid, seed: S.seed, floorN: S.floorN, stairs: S.stairs,
    floor: { w: f.w, h: f.h, tiles: b64(f.tiles), rooms: f.rooms, start: f.start }, seen: b64(S.seen) };
}

function cast(c) {
  if (!c) return null;
  return { key: c.key, slot: c.slot, t: r3(c.t), dur: r3(c.dur), aim: c.aim, locked: c.locked };
}
function entOut(e, mine) {
  const o = { id: e.id, side: e.side, kind: e.kind, x: r3(e.x), y: r3(e.y), r: e.r, hp: e.hp, maxHp: e.maxHp, level: e.level ?? 1,
    fx: r3(e.fx), fy: r3(e.fy), speed: e.speed, slowUntil: e.slowUntil, slowPct: e.slowPct, stunUntil: e.stunUntil, iframeUntil: e.iframeUntil };
  if (e.shield) o.shield = e.shield;
  if (e.dead) { o.dead = true; o.diedAt = e.diedAt; }
  if (e.cast) o.cast = cast(e.cast);
  if (e.dash) o.dash = { ...e.dash };
  if (e.kb) o.kb = 1;
  if (e.dots?.length) o.dots = e.dots.map((d) => d.kind);
  if (e.kind !== "unit") Object.assign(o, { body: e.body, weapon: e.weapon, deck: e.deck, actions: e.actions, cds: e.cds, mods: e.mods,
    rage: e.rage, interest: e.interest, mouseUntil: e.mouseUntil, firstHit: e.firstHit, recoverUntil: e.recoverUntil });
  // players are named by their public id only — the seat id (e.pid) stays secret
  if (e.kind === "player") Object.assign(o, { pid: e.pub ?? e.pid, name: e.name, color: e.color, away: !!e.away,
    revive: e.dead ? r3(e.revive ?? 0) : 0, forceSeq: e.forceSeq });
  if (e.kind === "foe") Object.assign(o, { foe: e.foe, awake: e.awake, room: e.room, tgtId: e.tgtId });
  if (e.kind === "unit") Object.assign(o, { unit: e.unit, owner: e.owner, life: e.life, bornAt: e.bornAt });
  if (mine) o.bag = e.bag;
  return o;
}

// cur = this phone's cursor: { fxN, seen: Uint8Array of what it already knows, floorN }. `pid` = its seat id.
// A new floor sends a fresh init instead of a snapshot.
export function snapFor(S, pid, cur) {
  if (cur.floorN !== S.floorN) {
    cur.floorN = S.floorN; cur.seen = new Uint8Array(S.seen); cur.fxN = S.fxN ?? 0;
    return initFor(S, pid);
  }
  const seenNew = [];
  for (let i = 0; i < S.seen.length; i++) if (S.seen[i] && !cur.seen[i]) { cur.seen[i] = 1; seenNew.push(i); }
  const fx = S.fx.filter((f) => f.n > cur.fxN);
  if (fx.length) cur.fxN = fx[fx.length - 1].n;
  const me = S.ents.find((e) => e.kind === "player" && e.pid === pid);
  return {
    t: "snap", st: r3(S.t), phase: S.phase, endedAt: S.endedAt ?? null, level: S.level, xp: S.xp, floorN: S.floorN,
    ents: S.ents.filter((e) => !e.dead || e.kind === "player" || S.t - e.diedAt < 0.6).map((e) => entOut(e, e === me)),
    projs: S.projs.map((p) => ({ x: r3(p.x), y: r3(p.y), dx: r3(p.dx), dy: r3(p.dy), speed: p.speed, w: p.w, side: p.side, key: p.key })),
    zones: S.zones.map((z) => ({ x: z.x, y: z.y, r: z.r, until: z.until, every: z.every, next: z.next, key: z.key, side: z.side })),
    items: S.items.map((it) => ({ id: it.id, kind: it.kind, key: it.key, x: r3(it.x), y: r3(it.y) })),
    fx: fx.map((f) => ({ ...f })),
    locked: [...S.locked], seen: seenNew,
    rooms: S.rooms.map((r) => ({ id: r.id, kind: r.kind, status: r.status, awake: r.awake, foes: r.foes })),
    stats: S.stats,
  };
}

// ---------------------------------------------------------------- phone side
export function mirrorFrom(init) {
  const f = init.floor;
  return {
    remote: true, t: 0, phase: "play", endedAt: null, level: 1, xp: 0, floorN: init.floorN, stairs: init.stairs,
    floor: { w: f.w, h: f.h, tiles: unb64(f.tiles), rooms: f.rooms, start: f.start },
    seen: unb64(init.seen), locked: new Set(), ents: [], projs: [], zones: [], items: [], fx: [], rooms: [],
    stats: { attacks: 0, felled: 0, floors: 0 }, recvAt: 0,
  };
}

// fold a snapshot into the mirror. Other bodies glide from where they were drawn to where the server says
// they are over the next ~snapshot; your own body stays where your thumb put it unless the server moved
// you (forceSeq), you're being shoved, or you're mid-charge.
export function applySnap(M, s, pid, now) {
  M.t = s.st; M.phase = s.phase; M.endedAt = s.endedAt; M.stats = s.stats; M.level = s.level; M.xp = s.xp;
  M.locked = new Set(s.locked);
  for (const i of s.seen) M.seen[i] = 1;
  M.projs = s.projs; M.zones = s.zones; M.rooms = s.rooms; M.items = s.items;
  for (const f of s.fx) M.fx.push(f);
  if (M.fx.length && M.fx[0].t0 < M.t - 2) M.fx = M.fx.filter((f) => f.t0 >= M.t - 2);
  const old = new Map(M.ents.map((e) => [e.id, e]));
  // fresh objects every time: a field the server dropped (a finished cast, a spent shield) must vanish
  M.ents = s.ents.map((n) => {
    const o = old.get(n.id);
    if (!o) return { ...n, gx: n.x, gy: n.y, sx: n.x, sy: n.y };
    const mine = n.kind === "player" && n.pid === pid;
    if (mine) {
      const forced = n.forceSeq !== o.forceSeq || n.dash || n.kb || n.dead || o.dead;
      const keep = forced ? {} : { x: o.x, y: o.y };
      // something I just flicked shows its wind-up at once; the server's copy takes over when it arrives
      const optimistic = !n.cast && o.cast?.local && now - o.cast.sentAt < 400 ? { cast: o.cast } : {};
      return { ...n, mx: o.mx, my: o.my, ...keep, ...optimistic };
    }
    return { ...n, sx: o.x, sy: o.y, gx: n.x, gy: n.y, x: o.x, y: o.y };
  });
  M.recvAt = now;
}
// between snapshots: run the clocks forward and glide the others
export function advanceMirror(M, dt, now, pid, gap = 0.05) {
  M.t += dt;
  const k = Math.min(1, (now - M.recvAt) / 1000 / gap);
  for (const e of M.ents) {
    if (e.cast) e.cast.t = Math.min(e.cast.dur, e.cast.t + dt);
    if (e.kind === "player" && e.pid === pid) continue;
    if (e.gx != null) { e.x = e.sx + (e.gx - e.sx) * k; e.y = e.sy + (e.gy - e.sy) * k; }
  }
  for (const p of M.projs) { p.x += p.dx * p.speed * dt; p.y += p.dy * p.speed * dt; }
}
