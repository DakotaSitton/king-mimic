// ⚠ FIXTURE SCENE BUILDER — NOT A REAL PLAYTHROUGH.  (relabeled by owner 2026-06-27)
// ----------------------------------------------------------------------------------------------
// This uses real game.js primitives (spawnEnemy / spawnBoss / simulateTick / snapshot), so each
// ENTITY is genuine — BUT the SCENE is hand-configured: a FIXED 3-player floor-2 combat with a
// hardcoded "longest-named" foe roster (below), a forced hydra boss, a forced head count. That board
// never arises in the owner's real SOLO play; it's a worst-case TEXT-OVERFLOW / hydra-bloom render-QA
// fixture. Real entities + a fake scene = exactly what made this get mistaken for "the game".
//
//   ➤ For a real run's actual state/screenshots, drive the game: node tools/shoot.mjs
//
// Standalone:  bun tools/realsnap.js <scene>   → prints the FIXTURE snapshot JSON (debugging)
// Imported by: tools/realshot.js (serves /realsnap?scene=X to the watermarked fixture renderer)
import {
  newRoom, addPlayer, wearBody, buildLevel, enterRoom, buildRoom, beginCombat,
  simulateTick, snapshot, spawnFoeInLane, summonBodies, MIN_DECK, KIT, isCard, BODIES,
} from "../game.js";

// Pick real, LONG-named cards (the worst case for text layout) that are genuinely castable cards.
// Falls back to padding so we always clear MIN_DECK. Every key here is a real KIT entry.
const LONG_CARDS = [
  "oRepeatXbow", "oHedgeKnight", "oBerserker", "oSharpEdges", "oWizardHat", "oGlacius",
  "oDemonForm", "oSageMode", "oOmnislash", "magicMissile", "oArcane", "oLightning",
  "oFire", "oSpear", "oBow", "oHoly",
].filter((k) => KIT[k] && isCard(k));

// Real foes with the LONGEST body names + real gear (long card names ride their cast queues), so the
// `combat` scene doubles as the text-overflow stress case. All keys are real BODIES/KIT entries.
const FOE_ROSTER = [
  { bodyKey: "bloodfund",    gear: ["oSpear", "oRepeatXbow"] }, // Market-Crash Minotaur (21)
  { bodyKey: "pyramidRogue", gear: ["oArcane", "oSharpEdges"] }, // Rent-Seeking Runeblade (22)
  { bodyKey: "rentier",      gear: ["oFire", "oHedgeKnight"] }, // Vengeful Vampire (16)
  { bodyKey: "discountDuel", gear: ["oBow"] },                  // Malevolent Mouse (16)
  { bodyKey: "compound",     gear: ["oSword"] },                // Centless Centaur (16)
  { bodyKey: "ratBaron",     gear: ["oLightning", "oWizardHat"] }, // Lizard Wizard (13)
];

function makeDeck() {
  const d = [...LONG_CARDS];
  while (d.length < MIN_DECK + 2) d.push("oFire");
  return d;
}

// Add a party of `n` (pilot id "me" first — the client sets you="me"). Returns the room.
function freshParty(n, floor) {
  const r = newRoom("RS");                  // NOT "DEMO" → real run, god mode OFF
  r.telemOff = true;
  r.floor = floor;
  const names = ["Hero", "Ally Two", "Ally Three", "Ally Four"];
  for (let i = 0; i < n; i++) {
    const id = i === 0 ? "me" : "ally" + (i + 1);
    const p = addPlayer(r, id, names[i] ?? ("P" + (i + 1)));
    p.homeBody = i === 0 ? "frugal" : (["leverage", "compound", "rentier"][i - 1] ?? "frugal");
    if (i === 0) { p.backpack = makeDeck(); p.deckList = makeDeck(); }
  }
  return r;
}

// A GENUINE mid-combat against the real long-named foe roster, advanced by the real tick loop.
function buildCombat(party = 3) {
  const r = freshParty(party, 2);
  // Drive the real run into its first combat node, then stock the exact roster + start combat.
  r.level = buildLevel(2);
  enterRoom(r);                             // floor-2 combat node → phase "stock", builds palette/enchant
  r.draftedFoes = FOE_ROSTER.slice(0, Math.max(party + 2, 4)).map((f) => ({ ...f }));
  buildRoom(r);                             // real placement: tankiest-first across lanes, formUp()
  r.phase = "setup";
  beginCombat(r);                           // deals real hands, builds real queues, seeds combat-start grants
  for (let i = 0; i < 22; i++) simulateTick(r); // let moxie bank, queues fill, charges climb → a living board
  return snapshot(r);
}

// A REAL Hyper-Inflation Hydra boss room. The hydra opens behind five heads (engine), then we bloom more
// heads with the engine's OWN `spawnFoeInLane(room,"hydraHead",lane)` — the exact call `bossOnDamaged`
// makes each time the hydra is struck — to reproduce a mid-fight head count deterministically. `extra`
// heads ≈ the hits the hydra has taken. Solo (1 lane) is the worst-case vertical stack.
function buildHydra(party = 1, extra = 11) {
  const r = freshParty(party, 1);
  r.bossDraw = ["hydra"];                   // force the floor's boss to the hydra (run-seeded draw)
  r.level = buildLevel(1);
  const bossNode = r.level.nodes.find((n) => n.type === "boss");
  r.level.currentId = bossNode.id;          // enter the boss node directly
  enterRoom(r);                             // type "boss" → buildRoom → spawnBoss(hydra): room.boss + 5 heads
  r.phase = "setup";
  beginCombat(r);
  // Bloom the heads the way real damage does, round-robin across lanes (matches a struck hydra).
  for (let i = 0; i < extra; i++) spawnFoeInLane(r, "hydraHead", i % r.laneCount);
  for (let i = 0; i < 30; i++) simulateTick(r); // charge the heads/maul clocks → live threat bars
  return snapshot(r);
}

// RAT-SWARM scene (owner 2026-06-26): a big FRIENDLY summon pack in your lane — the worst case for the
// friendly summon ROW (which had no width cap and spilled across lanes, covering info) — plus a FOE
// summoner swarm next door (the capped foe-cluster path) for comparison. All via the real engine.
function buildRats(party = 3) {
  const r = freshParty(party, 2);
  r.level = buildLevel(2);
  enterRoom(r);
  r.draftedFoes = FOE_ROSTER.slice(0, Math.max(party, 2)).map((f) => ({ ...f }));
  buildRoom(r);
  r.phase = "setup";
  beginCombat(r);
  const me = r.players.get("me");
  summonBodies(r, me, { body: "rat", count: 16, lane: me.lane });   // friendly pack in YOUR lane (overflow case)
  const foeLane = (me.lane + 1) % r.laneCount;
  for (let i = 0; i < 11; i++) spawnFoeInLane(r, "rat", foeLane);    // foe swarm next door (capped cluster)
  for (let i = 0; i < 8; i++) simulateTick(r);
  return snapshot(r);
}

export function buildRealSnap(scene = "combat") {
  switch (scene) {
    case "combat":    return buildCombat(3);
    case "combatsolo":return buildCombat(1);
    case "hydra":     return buildHydra(1, 11);  // solo: worst-case vertical head stack
    case "hydra3":    return buildHydra(3, 16);  // 3 lanes: spread bloom
    case "rats":      return buildRats(3);       // friendly summon-row overflow + foe cluster
    default:          return buildCombat(3);
  }
}

// Standalone debug: print the snapshot (or a compact summary with `--summary`).
if (import.meta.main) {
  const scene = process.argv[2] || "combat";
  const snap = buildRealSnap(scene);
  if (process.argv.includes("--summary")) {
    const heads = (snap.lanes || []).reduce((n, l) => n + l.enemies.filter((e) => e.bodyKey === "hydraHead").length, 0);
    console.log(JSON.stringify({
      scene, phase: snap.phase, floor: snap.floor, laneCount: snap.laneCount,
      players: snap.players.map((p) => ({ id: p.id, body: BODIES[p.bodyKey]?.name, hand: p.hand.map((c) => c.name) })),
      boss: snap.boss ? { name: snap.boss.name, hp: snap.boss.hp + "/" + snap.boss.maxHp, headWave: snap.boss.headWave } : null,
      lanes: snap.lanes.map((l) => l.enemies.map((e) => e.name)),
      hydraHeads: heads,
    }, null, 2));
  } else {
    console.log(JSON.stringify(snap));
  }
}
