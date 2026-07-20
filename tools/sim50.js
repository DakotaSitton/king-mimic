// Seedable balance baseline over the REAL pure-engine lifecycle.
//
// This deliberately mirrors test/fuzz.js:
//   draftPick -> room choice -> setup -> playing -> won/lost -> loot/deck/level -> descend
// The policy is structural bot evidence, not a prediction of human win rates or design authority.
//
// Examples:
//   RUNS=50 SEED=local-check bun run tools/sim50.js
//   RUNS=1000 SEED=public-alpha-2026-07-20 OUT=BALANCE_BASELINE_2026-07-20.md bun run tools/sim50.js
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as G from "../game.js";

const DEFAULT_RUNS = 50;
const RUNS = Number(process.env.RUNS ?? DEFAULT_RUNS);
const SOLO_RUNS = Number(process.env.SOLO_RUNS ?? RUNS);
const DUO_RUNS = Number(process.env.DUO_RUNS ?? RUNS);
const SEED = String(process.env.SEED ?? "km-balance-default-v1");
const MAX_FIGHT_TICKS = Number(process.env.MAX_FIGHT_TICKS ?? 5000);
const OUT = process.env.OUT ? resolve(process.cwd(), process.env.OUT) : null;
const TICKS_PER_SECOND = 10;

if (!Number.isInteger(SOLO_RUNS) || SOLO_RUNS < 1 || !Number.isInteger(DUO_RUNS) || DUO_RUNS < 1)
  throw new Error("SOLO_RUNS and DUO_RUNS must be positive integers");
if (SOLO_RUNS !== DUO_RUNS)
  throw new Error(`solo and duo run counts must match (got ${SOLO_RUNS} and ${DUO_RUNS})`);
if (!Number.isInteger(MAX_FIGHT_TICKS) || MAX_FIGHT_TICKS < 1)
  throw new Error("MAX_FIGHT_TICKS must be a positive integer");

function hashSeed(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

Math.random = mulberry32(hashSeed(SEED));

const pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : "n/a";
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))];
};
const seconds = (ticks) => (ticks / TICKS_PER_SECOND).toFixed(1);
const bodyName = (key) => G.BODIES[key]?.name ?? key;
const addCount = (record, key, amount = 1) => { record[key] = (record[key] ?? 0) + amount; };
const sortedEntries = (record) => Object.entries(record).sort(([a], [b]) => a.localeCompare(b));

function outcomeBucket() {
  return { fights: 0, wins: 0, losses: 0, stalls: 0, ticks: [] };
}

function cohortStats(label, party, runs) {
  return {
    label, party, runs, thrones: 0, defeats: 0, stalls: 0,
    deepestFloors: [], runTicks: [], deepestDistribution: {}, endReasons: {},
    encounters: { ordinary: outcomeBucket(), elite: outcomeBucket(), boss: outcomeBucket() },
    bosses: Object.fromEntries([...G.BOSS_BODIES, "kingMimic"].map((key) => [key, outcomeBucket()])),
    starters: {}, stallSignatures: {},
  };
}

function bossInRoom(room) {
  if (room.boss && room.boss.hp > 0) return room.boss;
  return room.lanes.flat().find((foe) => G.BODIES[foe.bodyKey]?.boss && !foe.falseDjinn && foe.hp > 0) ?? null;
}

function fightDescriptor(room) {
  const boss = bossInRoom(room);
  const foes = room.lanes.flat().filter((foe) => foe.hp > 0 && !foe.falseDjinn);
  const kind = boss ? "boss" : foes.some((foe) => G.BODIES[foe.bodyKey]?.elite) ? "elite" : "ordinary";
  const roster = [...foes, ...(room.boss && room.boss.hp > 0 ? [room.boss] : [])]
    .map((foe) => foe.bodyKey).sort();
  return { kind, bossKey: boss?.bodyKey ?? null, roster };
}

function assertCombatInvariants(room) {
  for (const player of room.players.values()) {
    if (player.alive && G.deckKeys(player).length === 0) throw new Error("player is cardless in combat");
    if (Number.isNaN(player.hp)) throw new Error("player hp is NaN");
    if (player.hp > player.maxHp) throw new Error(`player over-healed (${player.hp}/${player.maxHp})`);
  }
  for (const foe of room.lanes.flat()) {
    if (Number.isNaN(foe.hp)) throw new Error(`foe hp is NaN (${foe.bodyKey})`);
    if (foe.hp > foe.maxHp) throw new Error(`foe over-healed (${foe.bodyKey} ${foe.hp}/${foe.maxHp})`);
  }
}

function autoFight(room) {
  const descriptor = fightDescriptor(room);
  for (const player of room.players.values()) player.autoFire = true;
  let ticks = 0;
  while (room.phase === "playing" && ticks < MAX_FIGHT_TICKS) {
    for (const player of room.players.values()) {
      if (!player.alive) continue;
      const foes = room.lanes.flat();
      if (foes.length) {
        foes.sort((a, b) => a.hp - b.hp);
        player.targetId = foes[0].id;
      }
      G.ensureTarget(room, player);
    }
    G.simulateTick(room);
    assertCombatInvariants(room);
    ticks++;
  }
  const outcome = room.phase === "won" ? "win" : room.phase === "lost" ? "loss" : "stall";
  return { ...descriptor, outcome, ticks };
}

function recordFight(stats, fight) {
  const bucket = stats.encounters[fight.kind];
  bucket.fights++;
  bucket.ticks.push(fight.ticks);
  if (fight.outcome === "win") bucket.wins++;
  else if (fight.outcome === "loss") bucket.losses++;
  else bucket.stalls++;

  if (fight.bossKey) {
    const boss = stats.bosses[fight.bossKey] ??= outcomeBucket();
    boss.fights++;
    boss.ticks.push(fight.ticks);
    if (fight.outcome === "win") boss.wins++;
    else if (fight.outcome === "loss") boss.losses++;
    else boss.stalls++;
  }
  if (fight.outcome === "stall") addCount(stats.stallSignatures, fight.roster.join(" + ") || "empty board");
}

function spareCards(player) {
  const spares = [...(player.backpack ?? [])];
  for (const key of player.deckList ?? []) {
    const index = spares.indexOf(key);
    if (index >= 0) spares.splice(index, 1);
  }
  return spares;
}

function improveParty(room) {
  for (const player of room.players.values()) {
    const felled = [...room.unlockedBodies].find((key) => G.canSwapTo(room, player, key));
    if (felled) G.swapBody(room, player, felled);
    if (room.loot?.length) G.claimLoot(room, player, room.loot[0]);

    for (const key of [...(player.backpack ?? [])])
      if ((G.KIT[key]?.ops ?? []).some((op) => op.do === "deal")) G.moveToDeck(room, player, key);

    let guard = 0;
    while (guard++ < 4) {
      const spares = spareCards(player);
      const cost = player.nextLevelCost ?? G.levelUpCost((player.runLevel ?? 1) + 1);
      const payment = [];
      for (const key of spares) {
        if (payment.reduce((sum, item) => sum + G.itemTreasure(item), 0) >= cost) break;
        payment.push(key);
      }
      if (payment.reduce((sum, item) => sum + G.itemTreasure(item), 0) < cost) break;
      if (!G.levelUp(room, player, payment)) break;
    }
  }
}

function chooseDrafts(room, players) {
  G.startDraft(room);
  const starters = [];
  for (const player of players) {
    const offers = (room.draftWheel ?? []).filter((bundle) => bundle.offeredTo === player.id);
    if (!offers.length) throw new Error(`draft wheel dealt no bundles to ${player.id}`);
    const bundle = offers[Math.floor(Math.random() * offers.length)];
    G.draftPick(room, player, bundle.id);
    if (!player.drafted) throw new Error(`draftPick failed for ${player.id}`);
    starters.push(player.bodyKey);
  }
  if (players.length > 1 && !G.beginRun(room)) throw new Error("beginRun failed after complete duo draft");
  if (room.phase !== "won" || G.currentNode(room)?.type !== "start")
    throw new Error(`draft did not reach the live trailhead (phase=${room.phase}, node=${G.currentNode(room)?.type})`);
  return starters;
}

function endReasonFor(room, lastFight) {
  if (room.runWon) return "throne";
  if (!lastFight) return `unexpected:${room.phase}`;
  const place = lastFight.bossKey ? `boss:${lastFight.bossKey}` : lastFight.kind;
  return `${lastFight.outcome}:${place}`;
}

function playRun(stats, index) {
  const room = G.newRoom(`SIM-${stats.party}-${index}`);
  room.telemOff = true;
  const players = Array.from({ length: stats.party }, (_, seat) =>
    G.addPlayer(room, `p${seat + 1}`, `Bot ${seat + 1}`));
  const starters = chooseDrafts(room, players);

  let runTicks = 0;
  let lastFight = null;
  let steps = 0;
  while (!room.runWon && room.phase !== "lost") {
    if (++steps > 120) throw new Error(`run step cap exceeded at floor ${room.floor}, phase ${room.phase}`);
    if (room.phase === "setup") {
      G.beginCombat(room);
      if (room.phase !== "playing") throw new Error(`beginCombat did not enter playing (phase=${room.phase})`);
      lastFight = autoFight(room);
      runTicks += lastFight.ticks;
      recordFight(stats, lastFight);
      if (lastFight.outcome === "stall") break;
    } else if (room.phase === "won") {
      improveParty(room);
      if (room.runWon) break;
      if (room.levelComplete) {
        if (!G.descend(room)) throw new Error(`descend failed from floor ${room.floor}`);
      } else {
        const next = G.currentNode(room)?.links?.[0];
        if (!next || !G.advanceLevel(room, next))
          throw new Error(`advanceLevel failed from ${G.currentNode(room)?.id ?? "unknown"}`);
      }
    } else throw new Error(`unexpected phase ${room.phase}`);
  }

  const reason = endReasonFor(room, lastFight);
  const deepest = room.floor ?? 1;
  stats.runTicks.push(runTicks);
  stats.deepestFloors.push(deepest);
  addCount(stats.deepestDistribution, String(deepest));
  addCount(stats.endReasons, reason);
  if (room.runWon) stats.thrones++;
  else if (lastFight?.outcome === "stall") stats.stalls++;
  else stats.defeats++;

  for (const key of starters) {
    const row = stats.starters[key] ??= { seats: 0, thrones: 0, defeats: 0, stalls: 0, deepest: [] };
    row.seats++;
    row.deepest.push(deepest);
    if (room.runWon) row.thrones++;
    else if (lastFight?.outcome === "stall") row.stalls++;
    else row.defeats++;
  }
}

function encounterRows(stats) {
  return ["ordinary", "elite", "boss"].map((kind) => {
    const row = stats.encounters[kind];
    const label = kind === "elite" ? "Elite-body encounter" : kind[0].toUpperCase() + kind.slice(1);
    return `| ${label} | ${row.fights} | ${row.wins} | ${row.losses} | ${row.stalls} | ${pct(row.wins, row.fights)} | ${seconds(percentile(row.ticks, 0.5))}s | ${seconds(percentile(row.ticks, 0.9))}s |`;
  }).join("\n");
}

function bossRows(stats) {
  return Object.entries(stats.bosses)
    .sort(([a], [b]) => bodyName(a).localeCompare(bodyName(b)))
    .map(([key, row]) => `| ${bodyName(key)} | ${row.fights} | ${row.wins} | ${row.losses} | ${row.stalls} | ${pct(row.wins, row.fights)} | ${seconds(percentile(row.ticks, 0.5))}s | ${seconds(percentile(row.ticks, 0.9))}s |`)
    .join("\n");
}

function starterRows(stats) {
  return Object.entries(stats.starters)
    .sort(([a], [b]) => bodyName(a).localeCompare(bodyName(b)))
    .map(([key, row]) => `| ${bodyName(key)} | ${row.seats} | ${row.thrones} | ${row.defeats} | ${row.stalls} | ${pct(row.thrones, row.seats)} | ${mean(row.deepest).toFixed(2)} |`)
    .join("\n");
}

function distributionRows(record, firstHeader) {
  const rows = sortedEntries(record).map(([key, count]) => `| ${key} | ${count} |`);
  return `| ${firstHeader} | Runs |\n|---|---:|\n${rows.join("\n")}`;
}

function stallRows(stats) {
  const rows = Object.entries(stats.stallSignatures)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([signature, count]) => `| ${signature.split(" + ").map(bodyName).join(" + ")} | ${count} |`);
  return rows.length ? `| Living opponent signature at cap | Stalls |\n|---|---:|\n${rows.join("\n")}` : "No fight reached the stall cap.";
}

function cohortSection(stats) {
  const starterNote = stats.party > 1
    ? "Rows are seat-run attribution: both starting bodies inherit the shared run outcome. They are correlations under this policy, not independent body win rates."
    : "Rows attribute each run to its originally drafted body even if the policy later swaps bodies.";
  return `## ${stats.label}

| Runs | Thrones | Defeats | Stalled runs | Throne rate | Mean deepest floor | Mean / median / p90 simulated run time |
|---:|---:|---:|---:|---:|---:|---:|
| ${stats.runs} | ${stats.thrones} | ${stats.defeats} | ${stats.stalls} | ${pct(stats.thrones, stats.runs)} | ${mean(stats.deepestFloors).toFixed(2)} | ${seconds(mean(stats.runTicks))}s / ${seconds(percentile(stats.runTicks, 0.5))}s / ${seconds(percentile(stats.runTicks, 0.9))}s |

### Encounter outcomes

"Elite-body encounter" means an ordinary combat node containing at least one elite wearable body; elite room types are retired.

| Kind | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
${encounterRows(stats)}

### Boss outcomes

| Boss | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
${bossRows(stats)}

### Starter-body attribution

${starterNote}

| Starter body | Seat-runs | Thrones | Defeats | Stalls | Throne share | Mean deepest floor |
|---|---:|---:|---:|---:|---:|---:|
${starterRows(stats)}

### Deepest floor

${distributionRows(stats.deepestDistribution, "Floor")}

### End reasons

${distributionRows(stats.endReasons, "Reason")}

### Stall signatures

${stallRows(stats)}`;
}

const solo = cohortStats("Solo", 1, SOLO_RUNS);
const duo = cohortStats("Two-player", 2, DUO_RUNS);
for (let i = 0; i < SOLO_RUNS; i++) playRun(solo, i);
for (let i = 0; i < DUO_RUNS; i++) playRun(duo, i);

const report = `# King Mimic bot-policy balance baseline — 2026-07-20

This is **structural bot-policy evidence, not a prediction of human outcomes and not authority to change balance**. It exercises public engine APIs through the live run lifecycle without fixtures, god mode, direct state wins, retired class selection, stock, shops, or bespoke combat advantages.

## Configuration

- Seed: \`${SEED}\` (FNV-1a string hash feeding Mulberry32; all engine \`Math.random\` calls use this stream)
- Runs: ${SOLO_RUNS} solo + ${DUO_RUNS} two-player
- Fight cap: ${MAX_FIGHT_TICKS} ticks (${seconds(MAX_FIGHT_TICKS)} simulated seconds)
- Tick rate: ${TICKS_PER_SECOND}/second
- Generator command: \`RUNS=${SOLO_RUNS} SEED=${SEED} OUT=BALANCE_BASELINE_2026-07-20.md bun run tools/sim50.js\`
- Policy: pick a random private live draft bundle; choose the first offered room link; enable normal \`autoFire\`; aim each living body at the lowest-HP lane foe; after wins, use the fuzz policy's first legal body swap, first shared-loot claim, damaging-card deck additions, and spare-funded level-ups; descend through floor 3 and fight the floor-4 throne.

${cohortSection(solo)}

${cohortSection(duo)}

## Limitations

- The policy does not plan card order, coordinate lanes, choose targets tactically beyond lowest HP, value loot, optimize level allocation, coordinate duo roles, or use human timing and judgment.
- It always chooses the first map link. Room contents are seeded and randomized, but route selection is not strategic.
- A stall is a fight still in \`playing\` after ${MAX_FIGHT_TICKS} ticks. It is reported, not converted into a win or loss; this matches the fuzz harness's treatment of genuine sustain walls.
- Simulated durations count combat ticks only. CLI wall time is a separate performance property of this offline tool.
`;

if (OUT) {
  writeFileSync(OUT, report, "utf8");
  console.log(`Wrote ${OUT}`);
} else process.stdout.write(report);
