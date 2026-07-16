// King Mimic engine — level/room world building (extracted from game.js barrel).
// Value/level math + shop-roll + level-graph (buildLevel/GIMMICKS/currentNode) + enterRoom + descend.
// Foe-generation, boss machinery, buildRoom, room lifecycle stay in game.js and are called via barrel.
import { BODIES, bodyMaxHp, deriveLaneCount, STARTER_BODY, ELITE_SET } from "./bodies.js";
import { KIT, itemTreasure, KIT_POOL } from "./kit.js";
import { PLAYER_POOL, DRAFT_PICKS, mintCards, deckKeys } from "./cards.js";
import {
  THRONE_FLOOR, generateRoomFoes, roomAnteBudget, ANTE_MIN, picksRequiredFor,
  resetRoomVotes, freshKit, kitFromPicks, wearBody, buildRoom,
  rollRoomAnte, rollSkew, minFoeAnte,
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
export const levelHpBonus    = (L) => LEVEL_HP_PER_EVEN   * Math.floor(Math.max(FOE_LEVEL_MIN, L | 0) / 2);
// combat starts at L3: floor((L-1)/2) → L1 0, L2 0, L3 1, L4 1, L5 2 … (owner correction 2026-06-27)
export const levelCombatBonus = (L) => LEVEL_COMBAT_PER_ODD * Math.floor((Math.max(FOE_LEVEL_MIN, L | 0) - 1) / 2);
// LEVEL term retained from ANTE V3 (owner 2026-07-03): "Higher level foes increase their base difficulty by 2 per level."
// This is the LEVEL term only (the flat +4 body/action base lives in FOE_BASE_ANTE); level 1 costs
// NOTHING, each level above it adds LEVEL_ANTE_PER — base difficulty = FOE_BASE_ANTE + 2×(level−1).
export const levelAnte       = (L) => LEVEL_ANTE_PER * (Math.max(FOE_LEVEL_MIN, L | 0) - 1);
// A leveled foe's max HP = its body's base HP (HP-knob scaled) + the level HP bonus. Summon/boss
// bodies are EXEMPT from leveling (their stats are tuned absolutely — see spawnEnemy), so callers
// that want the live display number should gate on those; this raw helper is for normal foes.
export const foeMaxHpFor = (bodyKey, level = FOE_LEVEL_MIN) => bodyMaxHp(BODIES[bodyKey] ?? {}) + levelHpBonus(level);

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
export const ELITE_BODY_ANTE = 3;   // elite-body premium ON TOP of the base (owner: "Elites start higher")
export const eliteBodyAnte = (bodyKey) => (ELITE_SET.includes(bodyKey) ? ELITE_BODY_ANTE : 0);
export const bodyAnteOf = (f) => BODIES[f.bodyKey]?.gold ?? 0;
export const itemsAnteOf = (f) => (f?.gear ?? []).reduce((s, g) => s + (KIT[g]?.ante ?? 0), 0);
export const anteOfFoe = (f) => FOE_BASE_ANTE + itemsAnteOf(f) + levelAnte(foeLevel(f)) + eliteBodyAnte(f?.bodyKey);
// What a foe DROPS (◈) — ANTE V4 (owner 2026-07-13): the owner's original rule that value above the
// body/action base becomes reward still holds after increasing that base from 1 to 4. A foe gives
// that many random treasures as well." So loot = its carried CARDS (drop as themselves) + its
// surplus ABOVE the flat base 4 — every level over 1 (LEVEL_ANTE_PER each) and its elite-body
// premium come down as THAT MANY random treasures (rollCompItems, at win). ONLY the +4 base
// difficulty is threat-only — a cover charge you fight through for no reward. Hence ◈ = ⚖ − 4 per
// foe (the bases); a level-1 common still drops exactly its items, a leveled/elite foe drops more.
export const foeLootValue = (f) => itemsAnteOf(f) + levelAnte(foeLevel(f)) + eliteBodyAnte(f?.bodyKey);
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


// SHOP nodes — a VALUE-FOR-VALUE swap (owner 2026-06-24): gold is gone, so a ware is bought by
// trading in owned cards whose summed VALUE (itemTreasure) covers the ware's value. The shelf is a
// few offered card keys, each carrying its own value. Determinism-friendly: tests set room.shop.wares.
export const SHOP_WARES = 5;        // cards on the shelf at once
export const shopPrice = (key) => itemTreasure(key);   // a ware's value (what your pay-cards must cover)
// Roll a fresh shelf: SHOP_WARES distinct CARDS from the player pool, drawn uniformly. A ware is a
// `{key, value}` record (value = itemTreasure). Determinism-friendly: tests can set room.shop.wares directly.
export function rollShopWares() {
  return [...PLAYER_POOL].sort(() => Math.random() - 0.5).slice(0, SHOP_WARES)
    .map((key) => ({ key, value: shopPrice(key) }));
}

// ==== level graph: node minting, GIMMICKS, buildLevel, currentNode ====
let _nodeSeq = 0;
// ROOM EFFECTS (owner 2026-07-02, elites dissolved): ANY combat room can roll one of these modifiers.
// An effect BRINGS ITEMS with it ("acid rain includes 3 value of items"): its `pot` counts INTO the
// room's advertised ⚖ ante AND drops as random items on the win — suffering the effect pays.
// THIS IS THE OWNER'S TABLE — rename / retune / extend freely (add a key + handle it where noted).
// Mechanics: `foeCostCut` is read in foeCast; acidRain / foeScaling are handled in applyGimmickTick.
// [FLAG — placeholder pots] pot=3 across the board is MY placeholder; retune per effect.
export const GIMMICKS = {
  acidRain:   { name: "Acid Rain",       blurb: "Acid drips — every body in the room takes 1 every ~3s.", pot: 3 },
  cheapFoes:  { name: "Cut-Rate Foes",   blurb: "Every foe's cards cost ⚡1 less — they cast faster.", foeCostCut: 1, pot: 3 },
  foeScaling: { name: "Runaway Scaling", blurb: "Every foe ramps: +1 damage every ~4s.", pot: 3 },
};
const GIMMICK_KEYS = Object.keys(GIMMICKS);
const pickGimmick = () => GIMMICK_KEYS[Math.floor(Math.random() * GIMMICK_KEYS.length)];
// [FLAG — my knob] how often a combat room that can AFFORD an effect actually rolls one.
export const ROOM_EFFECT_CHANCE = 0.25;
// Owner 2026-07-15: Shops do not pay like fights, so make them genuinely occasional. FLAG: the
// exact 5% rate is the tuning call made for "reduce their rate"; the owner did not state a number.
export const SHOP_ROOM_CHANCE = 0.05;

export function buildLevel(floor = 1) {
  // The THRONE floor is a single boss room — no crawl, no shop, just the King. The map
  // still renders (one ♛ node) so the advance/preview plumbing needs no special cases.
  if (floor >= THRONE_FLOOR) {
    const n = { id: "n" + _nodeSeq++, type: "boss", cleared: false, x: 0.5, y: 0.5, links: [], row: 0 };
    return { nodes: [n], currentId: n.id };
  }
  // RANDOM 3-PICK CRAWL (owner 2026-06-29, "kill the STS map"): a TRAILHEAD opens the floor, then every
  // step offers EXACTLY 3 fresh rooms whose TYPES are rolled independently — mostly Fights, sometimes a
  // Shop. ELITE ROOMS ARE DISSOLVED (owner 2026-07-02): rooms differ by their ROLLED ante + SKEW +
  // optional EFFECT (assigned at stocking), not by a type badge. A floor is FLOOR_ROOMS picks, then the
  // boss. Each node links to ALL of the next row's nodes, so the choice offered is always the full 3.
  const FLOOR_ROOMS = 5;                          // rooms offered before the floor boss
  // Per-option type roll: Fight common · Shop occasional. The opening trio is always three fights
  // (owner 2026-07-15); later rows roll independently, then the safety pass below keeps >=1 fight.
  const rollType = (row) => (row > 1 && Math.random() < SHOP_ROOM_CHANCE ? "shop" : "combat");
  const plan = [
    { type: "start", w: 1 },
    ...Array.from({ length: FLOOR_ROOMS }, () => ({ type: "roll", w: 3 })),
    { type: "boss", w: 1 },
  ];
  const nodes = [];
  const rows = plan.map((spec, r) => {
    const y = 0.04 + (r / (plan.length - 1)) * 0.91;
    const row = Array.from({ length: spec.w }, (_, i) => {
      const type = spec.type === "roll" ? rollType(r) : spec.type;
      const n = { id: "n" + _nodeSeq++, type, cleared: false, x: (i + 1) / (spec.w + 1), y, links: [], row: r };
      nodes.push(n);
      return n;
    });
    return row;
  });
  // every offered row keeps ≥1 plain FIGHT — you're never forced into all-shops (owner 2026-06-29).
  for (const row of rows) {
    if (row.length === 3 && !row.some((n) => n.type === "combat")) row[Math.floor(Math.random() * 3)].type = "combat";
  }
  // FULL connectivity: every node links to EVERY node in the next row → the pick offered is always the
  // full 3 (the boss row is one node, so the last room's only "next" is the forced boss).
  for (let r = 0; r < rows.length - 1; r++) for (const a of rows[r]) for (const b of rows[r + 1]) a.links.push(b.id);
  return { nodes, currentId: rows[0][0].id };
}

// Pre-generate each combat node's roster at MAP BUILD (owner 2026-06-28: rooms must show what's
// inside them). The map preview and the actual fight then MATCH, and a node's contents are STABLE
// across the floor. ANTE V2 (owner 2026-07-02): each node ROLLS its own budget in the
// [P×F×1 … P×F×3] range, may roll an EFFECT (whose pot spends from that budget and later drops as
// items), rolls a SKEW, and stores its ACTUAL total as `n.ante` — the advertised ⚖ is always the
// real contents, never the pre-roll target. Boss/shop nodes carry no roster.
export function stockLevelRooms(room) {
  if (!room?.level?.nodes) return;
  for (const n of room.level.nodes) {
    if (n.type !== "combat") continue;
    let budget = rollRoomAnte(room);
    // EFFECT — only when the room can still afford a foe next to the pot, and the dice say so
    n.effect = null;
    if (Math.random() < ROOM_EFFECT_CHANCE) {
      const gk = pickGimmick();
      const pot = GIMMICKS[gk].pot ?? 0;
      if (budget >= minFoeAnte() + pot) { n.effect = gk; budget -= pot; }
    }
    n.skew = rollSkew(budget);
    n.foes = generateRoomFoes(room, budget, room.floor ?? 1, n.skew);
    n.ante = n.foes.reduce((s, f) => s + anteOfFoe(f), 0)
           + (n.effect ? (GIMMICKS[n.effect].pot ?? 0) : 0);
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
  room.loot = [];
  room.tradeOffers = [];        // stale trade offers don't carry between rooms
  const type = currentNode(room)?.type ?? "combat";
  room.enchant = null;            // the old free-floating room ENCHANTS stay dead (owner 2026-06-28)
  // ROOM EFFECT (owner 2026-07-02, elites dissolved): ANY combat room may carry its rolled effect;
  // the effect's `pot` was priced into the node's ante and drops as items on the win.
  const _gk = type === "combat" ? currentNode(room)?.effect : null;
  room.gimmick = (_gk && GIMMICKS[_gk]) ? { ...GIMMICKS[_gk], key: _gk } : null;
  // wire the gimmick's room-wide clock via the room-timer engine: Acid Rain bleeds everyone, Runaway Scaling
  // ramps the foes. Cut-Rate Foes needs no clock (read live in foeCast). Reset every room — stale never carries.
  room.roomTimers = _gk === "acidRain"   ? [{ kind: "acid",  cd: 30, charge: 0, amount: 1 }]
                  : _gk === "foeScaling" ? [{ kind: "scale", cd: 40, charge: 0, amount: 1 }]
                  : [];
  room.shop = null;
  if (type === "start") {
    // TRAILHEAD (owner 2026-06-29): lanes + bodies are set up above, but there's no fight here — drop
    // straight into the between-rooms CHOOSER so the player picks their FIRST room. No foes, no loot.
    room.draftedFoes = [];
    room.phase = "won";
    room.lastRoomValue = 0;
  } else if (!room.god && type === "shop") {
    room.shop = { wares: rollShopWares() };   // a fresh shelf of buyable items
    room.phase = "shop";
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
  // No banking: the room's value was already mirrored into every wallet on clear; unclaimed
  // loot is simply gone ("use it or lose it"). enterRoom resets room.loot for the next room.
  room.floor = (room.floor ?? 1) + 1;
  room.level = buildLevel(room.floor);
  stockLevelRooms(room);                 // pre-build every room's roster so the map can preview it
  room.levelComplete = false;
  enterRoom(room);                       // next floor also opens on a trailhead choice (enterRoom handles "start")
  return true;
}
