// King Mimic — pure game logic (no networking, no I/O).
// server.js wires this to WebSockets; tests import it and drive it deterministically.
// Every function takes a `room` (plain state object) and mutates/returns plainly.

import { EQUIPMENT } from "./content.js";

// ---------------------------------------------------------------------------
// Tunables / data
// ---------------------------------------------------------------------------
export const LANES = 3;
export const CARAVAN_MAX_HP = 20;
export const ROOM_SIZE = 7;
export const REVIVE_TICKS = 100;
export const GOD_CD = 5;       // god-mode item cooldown (~0.5s) — spam everything for testing

// Bodies = HP/atk templates. A PLAYER wears one (its HP is your HP); a FOE uses one.
// Defeat a foe and its body unlocks for the WHOLE PARTY to wear — the mimic.
export const BODIES = {
  rookie:      { name: "Rookie Mimic", maxHp: 8,  atk: 2, cd: 0,  color: "#9ad",    spawn: false },
  pixie:       { name: "Penny Pixie",  maxHp: 5,  atk: 1, cd: 30, color: "#7f7",    spawn: true },
  auditAngel:  { name: "Audit Angel",  maxHp: 8,  atk: 2, cd: 45, color: "#d9f",    spawn: true },
  killionaire: { name: "Killionaire",  maxHp: 13, atk: 4, cd: 70, color: "#e6c34a", spawn: true },
};
export const STARTER_BODY = "rookie";

// A small, hand-picked PLAYABLE slice of the card library. cd = ticks to recharge.
export const KIT = {
  fire:        { cd: 25 },
  fireII:      { cd: 55 },
  lightning:   { cd: 35 },
  towershield: { cd: 60 },
  wheelbarrow: { cd: 95 },
  light:       { cd: 70 },
  fairyBottle: { cd: 45 },
};
export const KIT_POOL = Object.keys(KIT);

// ---------------------------------------------------------------------------
// Rooms / level
// ---------------------------------------------------------------------------
export function newRoom(code) {
  return {
    code,
    god: (code || "").toUpperCase() === "DEMO", // playtest god mode
    players: new Map(),
    lanes: Array.from({ length: LANES }, () => []),
    laneShield: new Array(LANES).fill(0),
    unlockedBodies: new Set([STARTER_BODY]),
    caravan: { hp: CARAVAN_MAX_HP, max: CARAVAN_MAX_HP },
    phase: "lobby",                 // lobby | setup | playing | won | lost
    level: null,
    levelComplete: false,
    tick: 0,
    handle: null,
  };
}

// A small Slay-the-Spire-style graph. Top (y=0) start, bottom (y=1) boss.
export function buildLevel() {
  const nodes = [
    { id: "n0", type: "combat", cleared: false, x: 0.5,  y: 0.04, links: ["n1", "n2"] },
    { id: "n1", type: "combat", cleared: false, x: 0.28, y: 0.22, links: ["n3"] },
    { id: "n2", type: "combat", cleared: false, x: 0.72, y: 0.22, links: ["n3"] },
    { id: "n3", type: "combat", cleared: false, x: 0.5,  y: 0.42, links: ["n4"] },
    { id: "n4", type: "elite",  cleared: false, x: 0.5,  y: 0.60, links: ["n5"] },
    { id: "n5", type: "combat", cleared: false, x: 0.5,  y: 0.78, links: ["n6"] },
    { id: "n6", type: "boss",   cleared: false, x: 0.5,  y: 0.95, links: [] },
  ];
  return { nodes, currentId: "n0" };
}

export const nodeById = (room, id) => (room.level ? room.level.nodes.find((n) => n.id === id) : null);
export const currentNode = (room) => (room.level ? nodeById(room, room.level.currentId) : null);

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------
// Per-item cooldown (falls back to the KIT default if the item carries none).
export const itemCd = (inv) => (inv.cd != null ? inv.cd : KIT[inv.key].cd);

export function freshKit(god = false) {
  // God mode: every item, tiny cooldown, ready to fire immediately.
  if (god) return KIT_POOL.map((key) => ({ key, charge: GOD_CD, cd: GOD_CD }));
  const pool = [...KIT_POOL];
  const out = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const key = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    out.push({ key, charge: 0, cd: KIT[key].cd });
  }
  return out;
}

export function wearBody(player, bodyKey, keepWoundRatio = false) {
  const b = BODIES[bodyKey];
  const ratio = keepWoundRatio && player.maxHp ? player.hp / player.maxHp : 1;
  player.bodyKey = bodyKey;
  player.maxHp = b.maxHp;
  player.hp = Math.max(1, Math.round(b.maxHp * ratio));
}

// Networking-free: caller (server) attaches `.ws` afterward.
export function addPlayer(room, id, name) {
  const player = {
    id, name: name || "Adventurer", lane: 1,
    bodyKey: STARTER_BODY, hp: 0, maxHp: 0, alive: true, downTimer: 0,
    inv: freshKit(room.god), ws: null,
  };
  wearBody(player, STARTER_BODY);
  if (room.god) { player.maxHp = 999; player.hp = 999; }
  room.players.set(id, player);
  return player;
}

// ---------------------------------------------------------------------------
// Enemies / rooms
// ---------------------------------------------------------------------------
export function spawnEnemy(bodyKey) {
  const b = BODIES[bodyKey];
  return { bodyKey, hp: b.maxHp, maxHp: b.maxHp, atk: b.atk, charge: 0 };
}

// All foes present from the start. Count/composition scale with the current node type.
export function buildRoom(room) {
  room.lanes = Array.from({ length: LANES }, () => []);
  const type = currentNode(room)?.type ?? "combat";
  let size, pool;
  if (type === "boss") { size = ROOM_SIZE + 5; pool = ["auditAngel", "killionaire", "killionaire"]; }
  else if (type === "elite") { size = ROOM_SIZE + 3; pool = ["pixie", "auditAngel", "killionaire", "killionaire"]; }
  else { size = ROOM_SIZE; pool = ["pixie", "auditAngel", "killionaire"]; }
  for (let i = 0; i < size; i++) {
    const lane = Math.floor(Math.random() * LANES);
    room.lanes[lane].push(spawnEnemy(pool[Math.floor(Math.random() * pool.length)]));
  }
}

export function enterRoom(room) {
  room.phase = "setup";
  room.laneShield = new Array(LANES).fill(0);
  room.caravan.max = room.god ? 999 : CARAVAN_MAX_HP;
  room.caravan.hp = room.caravan.max;
  // god mode unlocks every body for swap testing
  room.unlockedBodies = new Set([STARTER_BODY, ...(room.god ? Object.keys(BODIES) : [])]);
  for (const p of room.players.values()) {
    p.inv = freshKit(room.god); p.lane = 1; p.alive = true; p.downTimer = 0;
    wearBody(p, STARTER_BODY);
    if (room.god) { p.maxHp = 999; p.hp = 999; }
  }
  buildRoom(room);
}

export function beginCombat(room) {
  if (room.phase === "setup") room.phase = "playing";
}

export function startLevel(room) {
  room.level = buildLevel();
  room.levelComplete = false;
  enterRoom(room);
}

export function advanceLevel(room, toId) {
  if (room.phase !== "won" || !room.level || room.levelComplete) return false;
  const cur = currentNode(room);
  if (!cur || !cur.links.includes(toId)) return false;
  const target = nodeById(room, toId);
  if (!target) return false;
  cur.cleared = true;
  room.level.currentId = toId;
  enterRoom(room);
  return true;
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------
export function useItem(room, player, slot) {
  if (room.phase !== "playing" || !player.alive) return;
  const inv = player.inv[slot];
  if (!inv) return;
  if (inv.charge < itemCd(inv)) return; // not ready
  const li = player.lane, lane = room.lanes[li];
  switch (inv.key) {
    case "fire":        if (lane[0]) damageEnemy(room, li, lane[0], 2); break;
    case "fireII":      if (lane[0]) damageEnemy(room, li, lane[0], 4); break;
    case "lightning":   for (const e of [...lane]) damageEnemy(room, li, e, 1); break;
    case "towershield": room.laneShield[li] += 1; break;
    case "wheelbarrow": room.laneShield[li] += 3; break;
    case "light":       room.caravan.hp = Math.min(room.caravan.max, room.caravan.hp + 3); break;
    case "fairyBottle": room.caravan.hp = Math.min(room.caravan.max, room.caravan.hp + 2); break;
  }
  inv.charge = 0;
}

export function damageEnemy(room, laneIdx, enemy, amount) {
  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    const lane = room.lanes[laneIdx];
    const i = lane.indexOf(enemy);
    if (i >= 0) lane.splice(i, 1);
    room.unlockedBodies.add(enemy.bodyKey); // the mimic
  }
}

export function damagePlayer(room, p, amount) {
  if (!p.alive) return;
  p.hp -= amount;
  if (p.hp <= 0) { p.hp = 0; p.alive = false; p.downTimer = REVIVE_TICKS; }
}

export function revivePlayer(p) {
  p.alive = true; p.downTimer = 0;
  p.hp = Math.max(1, Math.round(p.maxHp / 2));
}

// One simulation step. Pure: never broadcasts. The server calls this then broadcasts.
export function simulateTick(room) {
  room.tick++;
  if (room.phase !== "playing") return;

  for (const p of room.players.values()) {
    if (!p.alive) { if (p.downTimer > 0 && --p.downTimer === 0) revivePlayer(p); continue; }
    for (const inv of p.inv) {
      const max = itemCd(inv);
      if (inv.charge < max) inv.charge++;
    }
  }

  for (let i = 0; i < LANES; i++) {
    for (const e of room.lanes[i]) {
      e.charge++;
      if (e.charge < BODIES[e.bodyKey].cd) continue;
      e.charge = 0;
      let dmg = e.atk;
      if (room.laneShield[i] > 0) {
        const absorbed = Math.min(room.laneShield[i], dmg);
        room.laneShield[i] -= absorbed; dmg -= absorbed;
      }
      if (dmg <= 0) continue;
      const defenders = [...room.players.values()].filter((p) => p.alive && p.lane === i);
      if (defenders.length) damagePlayer(room, defenders[0], dmg);
      else room.caravan.hp = Math.max(0, room.caravan.hp - dmg);
    }
  }

  const enemiesLeft = room.lanes.reduce((n, l) => n + l.length, 0);
  if (room.caravan.hp <= 0) room.phase = "lost";
  else if (enemiesLeft === 0) {
    room.phase = "won";
    const cur = currentNode(room);
    if (cur && cur.type === "boss") { cur.cleared = true; room.levelComplete = true; }
  }
}

// ---------------------------------------------------------------------------
// Snapshot (client state)
// ---------------------------------------------------------------------------
export function snapshot(room) {
  return {
    type: "state",
    phase: room.phase,
    god: !!room.god,
    tick: room.tick,
    lanes: room.lanes.map((arr, i) => ({
      shield: room.laneShield[i],
      enemies: arr.map((e) => ({
        bodyKey: e.bodyKey, hp: e.hp, maxHp: e.maxHp, charge: e.charge, cd: BODIES[e.bodyKey].cd,
      })),
    })),
    caravan: room.caravan,
    map: room.level
      ? { nodes: room.level.nodes, currentId: room.level.currentId, levelComplete: !!room.levelComplete }
      : null,
    unlockedBodies: [...room.unlockedBodies],
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, lane: p.lane,
      bodyKey: p.bodyKey, hp: p.hp, maxHp: p.maxHp, alive: p.alive,
      inv: p.inv.map((inv) => ({
        key: inv.key, name: EQUIPMENT[inv.key].name, text: EQUIPMENT[inv.key].text,
        charge: inv.charge, cd: itemCd(inv), ready: inv.charge >= itemCd(inv),
      })),
    })),
    bodies: BODIES,
  };
}
