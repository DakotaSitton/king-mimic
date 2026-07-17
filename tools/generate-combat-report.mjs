// Generate the public, reproducible combat-simulation report.
//
//   bun tools/generate-combat-report.mjs
//   CONTROLLED_TRIALS=100 STARTER_TRIALS=100 bun tools/generate-combat-report.mjs
//
// This is evidence, not an automatic balance authority. It deliberately measures only the first
// floor-one combat under a simple auto-fire policy. All bodies receive identical room seeds in each
// matrix; the starter matrix separately seeds each body's authored rollKit before resetting the room
// seed, so kit generation cannot perturb the paired encounter.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// GAME_ROOT is a verification escape hatch for a dirty worktree: point it at a clean detached
// worktree to prove the published results match the committed engine without touching owner edits.
const gameModule = process.env.GAME_ROOT
  ? pathToFileURL(resolve(process.env.GAME_ROOT, "game.js")).href
  : new URL("../game.js", import.meta.url).href;
const G = await import(gameModule);

const CONTROLLED_TRIALS = Number(process.env.CONTROLLED_TRIALS ?? 1000);
const STARTER_TRIALS = Number(process.env.STARTER_TRIALS ?? 400);
const MAX_TICKS = Number(process.env.MAX_TICKS ?? 4000);
const SEED = Number(process.env.SEED ?? 0x4b4d2026) >>> 0;
const CONTROLLED_DECK = [
  "oSword", "oHatchet", "oSpear", "oBow", "oDagger",
  "oFire", "oLightning", "oWind", "oArcane", "oHoly",
];

function hash(text) {
  let h = 2166136261;
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function seedRandom(trial, salt = 0) {
  let x = (SEED + Math.imul((trial | 0) + 1, 0x9e3779b1) + salt) >>> 0;
  if (!x) x = 0x6d2b79f5;
  Math.random = () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 0x100000000;
  };
}

function forceBody(room, player, bodyKey, deck) {
  player.bodyKey = bodyKey;
  player.homeBody = bodyKey;
  player.backpack = [...deck];
  player.deckList = [...deck];
  player.lockedBundle = null;
  player.drafted = true;
  G.wearBody(player, bodyKey);
  G.maybeFinishDraft(room);
}

function autoFight(room) {
  let ticks = 0;
  let minHpFraction = 1;
  for (const p of room.players.values()) p.autoFire = true;
  while (room.phase === "playing" && ticks < MAX_TICKS) {
    for (const p of room.players.values()) {
      if (!p.alive) continue;
      minHpFraction = Math.min(minHpFraction, Math.max(0, p.hp) / Math.max(1, p.maxHp));
      const foes = room.lanes.flat().filter((e) => e.hp > 0).sort((a, b) => a.hp - b.hp);
      if (foes.length) p.targetId = foes[0].id;
      G.ensureTarget(room, p);
    }
    G.simulateTick(room);
    for (const p of room.players.values())
      minHpFraction = Math.min(minHpFraction, Math.max(0, p.hp) / Math.max(1, p.maxHp));
    ticks++;
  }
  const p = [...room.players.values()][0];
  return {
    won: room.phase !== "lost" && room.phase !== "playing",
    stalled: room.phase === "playing",
    ticks,
    minHpFraction: p ? minHpFraction : 0,
  };
}

function firstCombat(bodyKey, deck, trial) {
  // Reset here so every body sees the same draft/map/room random stream for a given trial.
  seedRandom(trial);
  const room = G.newRoom(`REPORT-${trial}`);
  room.telemOff = true;
  const player = G.addPlayer(room, "p1", "Report Bot");
  G.startDraft(room);
  forceBody(room, player, bodyKey, deck);

  for (let guard = 0; guard < 12; guard++) {
    if (room.phase === "won") {
      const links = (G.currentNode(room)?.links ?? [])
        .map((id) => (room.level?.nodes ?? []).find((n) => n.id === id))
        .filter(Boolean);
      const next = links.find((n) => n.type === "combat") ?? links[0];
      if (!next || !G.advanceLevel(room, next.id)) break;
    } else if (room.phase === "stock") {
      while (!G.stockReady(room)) G.addGreedy(room, player, 0);
      G.commitStock(room);
    } else if (room.phase === "setup") {
      G.beginCombat(room);
      return autoFight(room);
    } else break;
  }
  return { won: false, stalled: true, ticks: MAX_TICKS, minHpFraction: 0 };
}

function starterDeck(bodyKey, trial) {
  seedRandom(trial, hash(bodyKey) ^ 0xa11ce);
  return G.rollKit(bodyKey);
}

function runMatrix(id, label, trials, deckFor) {
  const keys = [...G.SET_COMMONS, ...Object.keys(G.BODIES).filter((key) => G.BODIES[key].elite)];
  const rows = [];
  console.log(`\n${label}: ${keys.length} bodies × ${trials} fights`);
  for (const key of keys) {
    let wins = 0, stalls = 0, ticks = 0, winTicks = 0, winHp = 0;
    for (let trial = 0; trial < trials; trial++) {
      const result = firstCombat(key, deckFor(key, trial), trial);
      wins += result.won ? 1 : 0;
      stalls += result.stalled ? 1 : 0;
      ticks += result.ticks;
      if (result.won) { winTicks += result.ticks; winHp += result.minHpFraction; }
    }
    const body = G.BODIES[key];
    const row = {
      key,
      name: body.name,
      elite: !!body.elite,
      trials,
      wins,
      losses: trials - wins,
      stalls,
      winRate: wins / trials,
      avgTicks: ticks / trials,
      avgWinSeconds: wins ? winTicks / wins / 10 : null,
      avgWinLowHpFraction: wins ? winHp / wins : null,
    };
    rows.push(row);
    console.log(`${body.name.padEnd(27)} ${(row.winRate * 100).toFixed(1).padStart(5)}%  stalls ${String(stalls).padStart(3)}`);
  }
  rows.sort((a, b) => b.winRate - a.winRate || a.avgTicks - b.avgTicks || a.name.localeCompare(b.name));
  return { id, label, trialsPerBody: trials, totalFights: trials * keys.length, rows };
}

const controlled = runMatrix(
  "controlled",
  "Canonical fixed-deck first combat",
  CONTROLLED_TRIALS,
  () => CONTROLLED_DECK,
);
const starters = runMatrix(
  "starters",
  "Authored starter-kit first combat",
  STARTER_TRIALS,
  starterDeck,
);

const report = {
  generatedAt: new Date().toISOString(),
  version: 1,
  methodology: {
    seed: SEED,
    pairedRoomSeeds: true,
    policy: "Auto-fire; aim at the lowest-HP living foe each tick",
    scope: "First floor-one combat only",
    tickRate: 10,
    maxTicks: MAX_TICKS,
    controlledDeck: CONTROLLED_DECK.map((key) => ({ key, name: G.KIT[key].name })),
    warning: "Simulation results are evidence for owner review, not authority to change balance. Boss and utility outcomes can be highly policy-sensitive.",
  },
  matrices: [controlled, starters],
};

writeFileSync(new URL("../public/combat-sim-results.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nWrote public/combat-sim-results.json (${controlled.totalFights + starters.totalFights} fights).`);
