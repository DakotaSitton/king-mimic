// King Mimic engine — level/room world building (extracted from game.js barrel).
// Value/level math + shop-roll + level-graph (buildLevel/GIMMICKS/currentNode) + enterRoom + descend.
// Foe-generation, boss machinery, buildRoom, room lifecycle stay in game.js and are called via barrel.
import { BODIES, bodyMaxHp, deriveLaneCount, STARTER_BODY, ELITE_SET } from "./bodies.js";
import { LEVEL_HP_PER_POINT, eliteTierDef, legacyLevelAllocation } from "./leveling.js";
import { KIT, itemTreasure, KIT_POOL } from "./kit.js";
import { PLAYER_POOL, DRAFT_PICKS, mintCards, deckKeys } from "./cards.js";
import {
  THRONE_FLOOR, generateRoomFoes, generateOpeningRoomFoes, roomAnteBudget, ANTE_MIN, picksRequiredFor,
  resetRoomVotes, freshKit, kitFromPicks, wearBody, buildRoom,
  rollRoomAnte, rollSkew,
} from "../game.js";

// ==== value / level math + shop roll ====
// ===========================================================================
// FOE LEVELS (owner spec 2026-06-27) — every combatant has an integer level ≥ 1. A room holds foes
// of a RANGE of levels (see generateRoomFoes). LEVEL 1 IS THE BASE (no bonus). Each level grants,
// CUMULATIVELY (owner correction 2026-06-27 — the combat grant starts at LEVEL 3, not level 1):
//   • reaching an EVEN level → +4 HP   (L2, L4, L6 …)
//   • reaching an ODD level ≥3 → +1 COMBAT (L3, L5, L7 …; the relevant damaging stat: melee OR ranged)
//   So L1 BASE · L2 +4 HP · L3 +1 combat · L4 +8 HP +1 combat · L5 +8 HP +2 combat …  ⇒
//     HP bonus     = LEVEL_HP_PER_EVEN   × floor(L/2)
//     combat bonus = LEVEL_COMBAT_PER_ODD × floor((L-1)/2)
// And each level adds +2 ANTE (scales infinitely): a foe's total ante = sum(item ante) + 2×level.
// SYMMETRY PILLAR (owner 2026-06-27): leveling is the SAME for both sides — a level-3 Market-Crash
// Minotaur is identical as a player or a foe. Players level their OWN bodies on this curve (applyBodyLevel).
// owner 2026-07-09: "Every level up that increases health, make it 4" — the per-HP-level grant 3 → 4.
export const LEVEL_HP_PER_EVEN   = 4;   // +HP granted on reaching each EVEN level (owner-set 2026-07-09; tunable)
export const LEVEL_COMBAT_PER_ODD = 1;  // +combat granted on reaching each ODD level ≥3 (tunable)
export const LEVEL_ANTE_PER      = 2;   // +ante per level ABOVE 1 (owner 2026-07-02: level 1 is the free base)
export const FOE_LEVEL_MIN       = 1;   // every foe is at least level 1 (the BASE — no bonus)
export const foeLevel        = (f) => Math.max(FOE_LEVEL_MIN, (f?.level ?? FOE_LEVEL_MIN) | 0);
export const levelHpBonus    = (L, allocation = null) => LEVEL_HP_PER_POINT
  * (allocation?.hp ?? legacyLevelAllocation(Math.max(FOE_LEVEL_MIN, L | 0)).hp);
// combat starts at L3: floor((L-1)/2) → L1 0, L2 0, L3 1, L4 1, L5 2 … (owner correction 2026-06-27)
export const levelCombatBonus = (L, allocation = null) => allocation
  ? Math.max(0, (allocation.melee | 0) + (allocation.ranged | 0))
  : LEVEL_COMBAT_PER_ODD * Math.floor((Math.max(FOE_LEVEL_MIN, L | 0) - 1) / 2);
// LEVEL term retained from ANTE V3 (owner 2026-07-03): "Higher level foes increase their base difficulty by 2 per level."
// This is the LEVEL term only (the flat +4 body/action base lives in FOE_BASE_ANTE); level 1 costs
// NOTHING, each level above it adds LEVEL_ANTE_PER — base difficulty = FOE_BASE_ANTE + 2×(level−1).
export const levelAnte       = (L) => LEVEL_ANTE_PER * (Math.max(FOE_LEVEL_MIN, L | 0) - 1);
// A leveled foe's max HP = its body's base HP (HP-knob scaled) + the level HP bonus. Summon/boss
// bodies are EXEMPT from leveling (their stats are tuned absolutely — see spawnEnemy), so callers
// that want the live display number should gate on those; this raw helper is for normal foes.
export const foeMaxHpFor = (bodyKey, level = FOE_LEVEL_MIN, allocation = null) =>
  bodyMaxHp(BODIES[bodyKey] ?? {}) + levelHpBonus(level, allocation);

// THE ANTE FORMULA — ANTE V4 (owner 2026-07-13): a foe's ante = BASE + ITEMS + LEVELS-ABOVE-1 + ELITE BODY.
// "Level 1 non-elite foes with 3 common items start at (4+3) = 7 value. Higher level foes increase
// their base difficulty by 2 per level, + their 3 items." So every foe carries a FLAT +4 base
// difficulty for its independent HP/action/passive economy; each item counts its own value; level 1 is free,
// each level above adds 2 to the base difficulty; wearing an ELITE body (ELITE_SET) adds its premium
// on top ("Elites start higher"). A fresh common with 3 value-1 cards = 4+3 = ⚖7; the SAME body as an
// elite = 4+3+3 = ⚖10. The body's own gold (`bodyAnteOf`) still drives adoption pricing, untouched.
// Owner 2026-07-13: 1→4 to price each foe's independent HP/action/passive economy. Room budgets stay
// [4×PF, 12×PF] deliberately, so this actor tax reduces simultaneous foe count instead of scaling out.
export const FOE_BASE_ANTE   = 4;
export const ELITE_BODY_ANTE = 2;   // compatibility alias: the Tier-I premium; use eliteBodyAnte(bodyKey)
export const eliteBodyAnte = (bodyKey) => eliteTierDef(bodyKey)?.ante ?? 0;
export const bodyAnteOf = (f) => BODIES[f.bodyKey]?.gold ?? 0;
export const itemsAnteOf = (f) => (f?.gear ?? []).reduce((s, g) => s + (KIT[g]?.ante ?? 0), 0);
export const anteOfFoe = (f) => FOE_BASE_ANTE + itemsAnteOf(f) + levelAnte(foeLevel(f)) + eliteBodyAnte(f?.bodyKey);
// What a foe DROPS (◈): its carried cards, two guaranteed random commons, and compensation for
// every level/elite premium. The weakest legal level-1 common body therefore drops five value-1
// cards—its three carried cards plus two more—so the first win always funds a level-up.
export const FOE_BASE_LOOT = 2;
export const foeLootValue = (f) => FOE_BASE_LOOT + itemsAnteOf(f)
  + levelAnte(foeLevel(f)) + eliteBodyAnte(f?.bodyKey);
export const anteCurrent = (room) => (room.draftedFoes ?? []).reduce((s, f) => s + anteOfFoe(f), 0);

// 1:1 SPLIT-INCOME economy (owner 2026-06-10): the foes PAY THEIR ANTE. A cleared room's
// value V = exactly the total ante that was stocked into it (bodies 1/3/5 + items 1/2/4 —
// the same big gold numbers from the stock screen, no separate bookkeeping). V is SPLIT
// across the party as fairly as possible (equal shares; remainder coins to the lowest
// TOTAL EARNINGS first — not the lightest wallet). Treasure then buys the rewards on offer — this room's loot, the shop, body
// tiers, kit slots — the same sinks as ever ("and future rewards, like the current system").
export const bodyValue = (f) => bodyAnteOf(f);                  // a body pays its ante weight
// V = the stocked ante (sum of every foe's items + 2×level). Room EFFECTS were removed
// (owner 2026-06-28: "remove all room effects") so there is no longer a room base-ante term.
export function roomValue(room) {
  return (room.draftedFoes ?? []).reduce((s, f) => s + anteOfFoe(f), 0);
}


// Retired shop helpers remain as save/test compatibility only. Live maps never mint shop nodes and
// the client exposes no shop surface.
export const SHOP_WARES = 5;        // cards on the shelf at once
export const shopPrice = (key) => itemTreasure(key);   // a ware's value (what your pay-cards must cover)
// Roll a fresh shelf: SHOP_WARES distinct CARDS from the player pool, drawn uniformly. A ware is a
// `{key, value}` record (value = itemTreasure). Determinism-friendly: tests can set room.shop.wares directly.
export function rollShopWares() {
  return [...PLAYER_POOL].sort(() => Math.random() - 0.5).slice(0, SHOP_WARES)
    .map((key) => ({ key, value: shopPrice(key) }));
}

// ==== level graph: node minting, buildLevel, currentNode ====
let _nodeSeq = 0;
// Retired room-effect records remain readable for old saves/scenarios, but live generation and
// room entry never select or activate one.
export const GIMMICKS = {
  acidRain:   { name: "Acid Rain",       blurb: "Acid drips — every body in the room takes 1 every ~3s.", pot: 3 },
  cheapFoes:  { name: "Cut-Rate Foes",   blurb: "Every foe's cards cost ⚡1 less — they cast faster.", foeCostCut: 1, pot: 3 },
  foeScaling: { name: "Runaway Scaling", blurb: "Every foe ramps: +1 damage every ~4s.", pot: 3 },
};
export const ROOM_EFFECT_CHANCE = 0;
export const SHOP_ROOM_CHANCE = 0;

export function buildLevel(floor = 1) {
  // The THRONE floor is a single boss room — no crawl, no shop, just the King. The map
  // still renders (one ♛ node) so the advance/preview plumbing needs no special cases.
  if (floor >= THRONE_FLOOR) {
    const n = { id: "n" + _nodeSeq++, type: "boss", cleared: false, x: 0.5, y: 0.5, links: [], row: 0 };
    return { nodes: [n], currentId: n.id };
  }
  // RANDOM 3-PICK CRAWL (owner 2026-06-29, "kill the STS map"): a TRAILHEAD opens the floor, then every
  // step offers EXACTLY 3 fights. Shops and room effects are retired for now. ELITE ROOMS ARE
  // DISSOLVED (owner 2026-07-02): later rooms differ by rolled ante + skew, not by a type badge. A floor is FLOOR_ROOMS picks, then the
  // boss. Each node links to ALL of the next row's nodes, so the choice offered is always the full 3.
  const FLOOR_ROOMS = 5;                          // rooms offered before the floor boss
  const plan = [
    { type: "start", w: 1 },
    ...Array.from({ length: FLOOR_ROOMS }, () => ({ type: "roll", w: 3 })),
    { type: "boss", w: 1 },
  ];
  const nodes = [];
  const rows = plan.map((spec, r) => {
    const y = 0.04 + (r / (plan.length - 1)) * 0.91;
    const row = Array.from({ length: spec.w }, (_, i) => {
      const type = spec.type === "roll" ? "combat" : spec.type;
      const n = { id: "n" + _nodeSeq++, type, cleared: false, x: (i + 1) / (spec.w + 1), y, links: [], row: r };
      nodes.push(n);
      return n;
    });
    return row;
  });
  // FULL connectivity: every node links to EVERY node in the next row → the pick offered is always the
  // full 3 (the boss row is one node, so the last room's only "next" is the forced boss).
  for (let r = 0; r < rows.length - 1; r++) for (const a of rows[r]) for (const b of rows[r + 1]) a.links.push(b.id);
  return { nodes, currentId: rows[0][0].id };
}

// Pre-generate each combat node's roster at MAP BUILD (owner 2026-06-28: rooms must show what's
// inside them). The map preview and the actual fight then MATCH, and a node's contents are STABLE
// across the floor. ANTE V2 (owner 2026-07-02): each node ROLLS its own budget in the
// [P×F×1 … P×F×3] range, rolls a SKEW, and stores its ACTUAL total as `n.ante`—except the
// floor-1 opening row, which always contains one weakest legal body per party body.
export function stockLevelRooms(room) {
  if (!room?.level?.nodes) return;
  for (const n of room.level.nodes) {
    if (n.type !== "combat") continue;
    const opening = (room.floor ?? 1) === 1 && n.row === 1;
    const budget = rollRoomAnte(room);
    n.effect = null;
    n.skew = opening ? "swarm" : rollSkew(budget);
    n.foes = opening ? generateOpeningRoomFoes(room)
      : generateRoomFoes(room, budget, room.floor ?? 1, n.skew);
    n.ante = n.foes.reduce((s, f) => s + anteOfFoe(f), 0);
  }
}

export const nodeById = (room, id) => (room.level ? room.level.nodes.find((n) => n.id === id) : null);
export const currentNode = (room) => (room.level ? nodeById(room, room.level.currentId) : null);

// ==== enterRoom ====
export function enterRoom(room) {
  room.roomReturn = null;                  // direct entries never inherit an old room-choice undo checkpoint
  // Lanes = player count for this room (god keeps ≥3). Derive BEFORE building the arrays.
  room.laneCount = deriveLaneCount(room, currentNode(room)?.type ?? "combat");
  room.lanes = Array.from({ length: room.laneCount }, () => []);
  room.allies = Array.from({ length: room.laneCount }, () => []);
  room.boss = null;                       // a stale back-line boss never follows you into the next room
  room.tornadoes = [];                    // a Djinn hazard never follows the party into another room
  resetRoomVotes(room);                   // a fresh room → wipe last won-screen's next-room votes/locks
  room.itemUses = 0;                      // the Djinn's party-wide counter starts fresh per room
  room.useCounts = {};                    // telemetry: per-room item-use tally
  room.freezeFoes = 0; room.freezeHeroes = 0;   // ⏳ a Time Stop never outlives its room
  // Unlocked bodies ACCUMULATE across the whole run (the mimic hook) — NEVER wiped per
  // room. Just ensure the starter is present; god mode opens the whole roster for testing.
  if (!room.unlockedBodies) room.unlockedBodies = new Set([STARTER_BODY]);
  room.unlockedBodies.add(STARTER_BODY);
  if (room.god) for (const k of Object.keys(BODIES)) room.unlockedBodies.add(k);
  // Each player OWNS a distinct lane (their body + their greedy-add sit there). With lanes =
  // player count this is a bijection; in boss/god rooms (≥3 lanes) extra lanes are unowned.
  let _li = 0;
  for (const p of room.players.values()) {
    // God: full kit on the rookie body. Otherwise the worn-passive stat reads come from the backpack.
    p.inv = room.god ? freshKit(true)
          : kitFromPicks(p.backpack?.length ? p.backpack : KIT_POOL.slice(0, DRAFT_PICKS));
    // CARD collection = the playable DECK, floored to MIN_DECK (10) and padded from the hand-
    // designed STARTER_DECK so a run always opens with a real deck. beginCombat shuffles these
    // into deck+hand; the draw pile grows with no max as you add cards.
    p.cards = mintCards(deckKeys(p, room.god));
    p.ownedLane = Math.min(room.laneCount - 1, _li++);
    // owner 2026-06-21: REOPEN with the party formation you arranged last setup (snapshotted in
    // beginCombat) — clamped to this room's lane count — instead of resetting to one-body-per-lane.
    // First room (no save yet) falls back to your owned lane at the front.
    const savedLane = p.partyLane;
    p.lane = Number.isInteger(savedLane) ? Math.max(0, Math.min(room.laneCount - 1, savedLane)) : p.ownedLane;
    p.depth = Number.isInteger(p.partyDepth) ? p.partyDepth : 0;
    p.alive = true; p.downTimer = 0;
    wearBody(p, room.god ? STARTER_BODY : (p.homeBody ?? STARTER_BODY));
    if (room.god) { p.maxHp = 999; p.hp = 999; }
  }
  // a saved formation can stack several bodies in one lane — normalize each lane's depths to a
  // clean 0..n-1 front→back line so the blocking order stays unambiguous (mirrors moveDepth).
  for (let ln = 0; ln < room.laneCount; ln++) {
    [...room.players.values()].filter((p) => p.lane === ln)
      .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || (a.id < b.id ? -1 : 1))
      .forEach((p, i) => { p.depth = i; });
  }
  // Foe-draft: ordinary rooms let you stock the foes first. Bosses & god auto-fill.
  room.draftedFoes = [];
  // `room.loot` is the run-shared spoils pool. Unclaimed cards survive room entry so a later
  // clear can add enough bid points for somebody to afford them; startDraft owns the new-run reset.
  room.loot ??= [];
  room.tradeOffers = [];        // stale trade offers don't carry between rooms
  const type = currentNode(room)?.type ?? "combat";
  room.enchant = null;            // the old free-floating room ENCHANTS stay dead (owner 2026-06-28)
  room.gimmick = null;
  room.roomTimers = [];
  room.shop = null;
  if (type === "start") {
    // TRAILHEAD (owner 2026-06-29): lanes + bodies are set up above, but there's no fight here — drop
    // straight into the between-rooms CHOOSER so the player picks their FIRST room. No foes or new
    // drops; any unclaimed spoils carried from the prior floor remain in the shared pool.
    room.draftedFoes = [];
    room.phase = "won";
    room.lastRoomValue = 0;
  } else if (room.god || type === "boss") {
    buildRoom(room);
    room.phase = "setup";
  } else {
    // ROOM-DRAFT, not foe-draft (owner spec 2026-06-27): you choose the ROOM — the map branch IS the
    // offer — and its foes arrive PRE-BUILT. ANTE V2 (owner 2026-07-02): the room's budget was ROLLED
    // per node in [P×F×1 … P×F×3] and spent under a SKEW at map build; anteCap mirrors the node's
    // ACTUAL total. There is NO per-foe stock/greedy step: the room goes STRAIGHT to formation/setup.
    // The old "stock" phase + greedy palette stay retired (harmless no-ops gated on phase === "stock").
    room.draftedFoes = [];
    room.anteMin = ANTE_MIN;        // 0 — the floor is retired (snapshot/back-compat)
    // Use the room's PRE-BUILT roster (stocked at map build so the map preview matches the fight); fall
    // back to a fresh roll for legacy/test rooms that never went through stockLevelRooms.
    const _node = currentNode(room);
    const _pre = _node?.foes;
    room.anteCap = _node?.ante ?? rollRoomAnte(room);   // the node's actual ⚖ (fresh roll for legacy rooms)
    room.draftedFoes.push(...((_pre && _pre.length)
      ? _pre.map((f) => ({ ...f, gear: [...(f.gear ?? [])] }))
      : generateRoomFoes(room, room.anteCap, room.floor ?? 1)));
    room.foePalette = [];           // no greedy-add palette — rooms are pre-built (foe-offer step removed)
    room.picksRequired = picksRequiredFor(type);   // DOUBLE-FEATURE label only (no gate)
    room.anteRequired = 0;          // NO floor — kept 0 for back-compat
    buildRoom(room);                // place the pre-built foes now (the room is fully stocked on entry)
    room.phase = "setup";           // straight to formation — the foe-offer (stock) step is gone
  }
}

// ==== descend ====
export function descend(room) {
  if (room.phase !== "won" || !room.levelComplete || room.runWon) return false; // the throne is the LAST floor
  // The shared spoils pool and each seat's bid points both carry across floors within the run.
  room.floor = (room.floor ?? 1) + 1;
  room.level = buildLevel(room.floor);
  stockLevelRooms(room);                 // pre-build every room's roster so the map can preview it
  room.levelComplete = false;
  enterRoom(room);                       // next floor also opens on a trailhead choice (enterRoom handles "start")
  return true;
}
