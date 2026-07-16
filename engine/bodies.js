// King Mimic engine — bodies & lane/HP-mult leaf data (extracted from game.js barrel).
// Pure-data leaf: BODIES/CLASSES tables, body-set rosters, HP-mult state, lane constants, clog.

// Lanes scale with the party: LANES is the legacy default (manually-built rooms / fallback);
// the LIVE count for a room is room.laneCount, derived from the player count at enterRoom.
export const LANES = 3;
// Solo = 1 lane (pure "player owns a lane"). The documented fallback if solo plays flat is a
// floor of 2 (keeps lateral movement in solo) — flip LANE_FLOOR to 2 and nothing else changes.
export const LANE_FLOOR = 1;
// Lanes = number of players, clamped [LANE_FLOOR, 4]. BOSS_SPEC_V1: the V2 bosses are
// lane-count-agnostic by construction, so boss rooms use the party-size board like any
// other room. God rooms keep the legacy ≥3-lane testing board.
export function deriveLaneCount(room, type) {
  const players = Math.max(1, room.players?.size ?? 1);
  const base = Math.max(LANE_FLOOR, Math.min(4, players));
  return room.god ? Math.max(3, base) : base;
}
// HP knob: every body's (and the caravan's) health is scaled by this so combats last
// longer without touching damage. LIVE DEFAULT IS 1 — the doubled-HP tuning was removed
// 2026-06-10 (owner call after playtest: V2 numbers stand on their own). The knob itself
// stays as a balance dial (tests exercise it; summon tokens are always exempt). It flows
// through every combatant-creation site (spawnEnemy, wearBody) + the caravan + the
// body-display projection, so nothing desyncs.
let _hpMult = 1;
export const getHpMult = () => _hpMult;
export const setHpMult = (n) => { _hpMult = n; };
// Summon TOKENS are exempt from the knob: their HP is tuned absolutely (a rat is 1 HP at
// any pacing — owner call 2026-06-10), and doubling disposable blockers warps combat math.
export const bodyMaxHp = (b) => Math.round((b?.maxHp ?? 0) * (b?.summon ? 1 : _hpMult));
// (caravanMaxHp DELETED 2026-06-27 with the caravan itself — there is no shared HP pool now.)

// THE UNIVERSAL COOLDOWN MULTIPLIER IS DEAD (owner 2026-06-12: "turn off the doubled
// cooldowns flag; change numbers, not universal modifiers"). Every cd/duration in this
// file is now a LITERAL tick count (10 ticks = 1 second, TICK_MS 100) and the item texts
// tell the truth. The knob caused two desync landmine classes (bake-at-creation, buff
// uptime) — pace changes now go through the numbers themselves. Inert stubs remain so
// older harnesses (test headers, balance.js) don't crash; they change nothing.
export const getCdMult = () => 1;
export const setCdMult = () => {};
export const cdScale = () => 1;
// (A hero-only cooldown ease lived here for ~an hour on 2026-06-12 and was REVERTED the
// same night: the owner's 1:1 SYMMETRY rule is identity-level — heroes and foes share
// every multiplier. Ease difficulty through the room/ante economy instead, never tempo.)
export const ROOM_SIZE = 7;
export const GOD_CD = 5;       // god-mode item cooldown (~0.5s) — spam everything for testing
// Anti-stall safety net: if the fight makes NO progress toward either outcome (no new low in
// total foe HP AND no new low in caravan HP) for this many ticks (~150s), resolve it as a loss.
// This is NOT escalation (nothing ramps) — just a guarantee that combat always terminates, even
// against a perfect heal-vs-damage equilibrium the party can't break. Far beyond any real fight.
export const STALL_LIMIT = 1500;

// Bodies = HP/atk templates. A PLAYER wears one (its HP is your HP); a FOE uses one.
// Defeat a foe and its body unlocks for the WHOLE PARTY to wear — the mimic.
// A body carries: stats (maxHp/atk/cd) + an optional single `passive` (trigger → ops)
// + `ante` (its cost toward a room's required ante). Items add ante on top.
export const BODIES = {
  rookie:      { name: "Rookie Mimic", maxHp: 9, phys: 1, mag: 0, cd: 0, color: "#9ad", spawn: false },  // +1 HP (owner 2026-06-12)
  // ===== SUMMON TOKENS — never adoptable, never in any pool; they only enter via summon
  // effects. Rats are the EXCEPTION to "no innate swing": a built-in every-2s attack.
  // Aura tokens (V2 §4.2) carry `aura: { dmgBonus?, dmgReduce? }` — lane-scoped, live while
  // the token stands, fully symmetric (a foe Totem protects foes). =====
  rat:         { name: "Rat", maxHp: 1, cd: 0, color: "#c9a98c", spawn: false, summon: true, gold: 0,
                 passiveText: "Bites for 1 (costs 3 moxie).", kit: ["tBite"] },  // owner 2026-06-24: a rat plays by the same moxie/card rules — 1 HP, no passive, casts its Bite
  largeRat:    { name: "Large Rat", maxHp: 3, phys: 2, mag: 0, cd: 0, color: "#a98c6a", spawn: false, summon: true, gold: 0,
                 passiveText: "Attacks for 2 every 4s.",
                 passive: [{ every: 40, ops: [{ do: "attack" }] }] },
  totem:       { name: "Totem", maxHp: 3, phys: 0, mag: 0, cd: 0, color: "#7fb08a", spawn: false, summon: true, gold: 0,
                 aura: { dmgReduce: 1 },
                 passiveText: "Allies in its lane take 1 less damage while it stands." },
  flag:        { name: "Flag", maxHp: 3, phys: 0, mag: 0, cd: 0, color: "#e08a8a", spawn: false, summon: true, gold: 0,
                 aura: { dmgBonus: 1 },
                 passiveText: "Allies in its lane deal +1 damage while it stands." },
  knight:      { name: "Hedgefund Knight", maxHp: 6, phys: 1, mag: 0, cd: 0, color: "#d8c050", spawn: false, summon: true, gold: 0,
                 aura: { dmgBonus: 1, dmgReduce: 1 },
                 passiveText: "Attacks every 4s; allies in its lane deal +1 and take 1 less while it stands.",
                 passive: [{ every: 40, ops: [{ do: "attack" }] }] },
  // OWNER'S SUMMON (Hedgefund Knight card, 2026-06-25): hp 5, +1 damage, +1 damage resist. Casts by the
  // moxie/card rules like a rat (kit = tKnightStrike, a +1'd bite); the +1 RESIST is the body-level
  // `dmgReduce` (flows through effectiveDamageTo, symmetric — a foe-summoned one is just as tanky). NO
  // aura — this is the lone bruiser knight, distinct from the aura `knight` above.
  // Earth/Lava Elemental tokens (owner 2026-07-06 batch C): summoned by their cards, cast their own
  // t* kit like any token. HP FLAGGED on the summon cards.
  earthElemental: { name: "Earth Elemental", maxHp: 4, phys: 0, mag: 0, cd: 0, color: "#9a8c6a", spawn: false, summon: true, gold: 0,
                 kit: ["tEarthWard", "tBite"] },
  lavaElemental:  { name: "Lava Elemental", maxHp: 3, phys: 0, mag: 0, cd: 0, color: "#ff7a3c", spawn: false, summon: true, gold: 0,
                 kit: ["tLavaSurge"] },
  hedgeKnight: { name: "Hedgefund Knight", maxHp: 5, phys: 0, mag: 0, cd: 0, color: "#d8c050", spawn: false, summon: true, gold: 0,
                 dmgReduce: 1, kit: ["tKnightStrike"],
                 passiveText: "Takes 1 less from every hit. Strikes the front foe for 2 (costs 3 moxie)." },
  // GRAND SPIRIT bodies (owner 2026-07-07 batch D): the ⚡10 summon's three pickable forms — the
  // play's `pick` (attacker/caster/tank) chooses; foes/bots default to the attacker. Cast their t*
  // kits by the moxie rules like every token; the tank simply STANDS at the front (summons spawn
  // front-of-line by default) and wards. ALL stats are FLAGGED — the owner named the three roles
  // (attacker, caster, tank) and the ⚡10 price; every number below is mine to be re-tuned.
  // OWNER +50% BUFF (2026-07-09: "buff grand spirit by 50%") — HP scaled ×1.5 on all three bodies
  // (6→9, 4→6, 12→18) and the Attacker/Caster DAMAGE ×1.5 on their exclusive t* kits below
  // (tSpiritStrike 4→6, tSpiritBolt 2→3). All ×1.5 land on exact integers, no rounding. The Tank's
  // ward stays on the SHARED tEarthWard (earthElemental reuses it) — its +50% is purely the HP.
  grandAttacker: { name: "Grand Spirit (Attacker)", maxHp: 9, phys: 0, mag: 0, cd: 0, color: "#d0906a", spawn: false, summon: true, gold: 0,
                 kit: ["tSpiritStrike"],
                 passiveText: "Strikes the front foe for 6 (costs 4 moxie)." }, // FLAG: hp 9 = 6 ×1.5 (owner +50% 2026-07-09); damage rides tSpiritStrike (now 6 = 4 ×1.5)
  grandCaster: { name: "Grand Spirit (Caster)", maxHp: 6, phys: 0, mag: 0, cd: 0, color: "#8fb8e0", spawn: false, summon: true, gold: 0,
                 kit: ["tSpiritBolt"],
                 passiveText: "Scorches every foe in its lane for 3 (costs 4 moxie)." }, // FLAG: hp 6 = 4 ×1.5 (owner +50% 2026-07-09); damage rides tSpiritBolt (now 3 = 2 ×1.5 lane)
  grandTank:   { name: "Grand Spirit (Tank)", maxHp: 18, phys: 0, mag: 0, cd: 0, color: "#9aa8c0", spawn: false, summon: true, gold: 0,
                 kit: ["tEarthWard"],
                 passiveText: "A bulwark — blocks at the front and shields the ally in front of it (or itself) for 2 (costs 3 moxie)." }, // FLAG: hp 18 = 12 ×1.5 (owner +50% 2026-07-09); ward unchanged (SHARED tEarthWard, earthElemental reuses it)

  // ===== BOSSES (BOSS_SPEC_V1, owner-dictated 2026-06-11) — the V2 floor-enders. =====
  // `maxHp` here is the PER-BUDGET-UNIT base: a live boss spawns with maxHp × players ×
  // floor (bossBudget). Mechanics do NOT live in `passive` op-trees — each boss gets
  // spawn-time `clocks` (see spawnBoss/fireBossClock) so every knob can ride the budget.
  // `backline:true` = the caravan-mirror: the boss spans ALL lanes behind the foe rows
  // (room.boss, not a lane entry); melee reaches it only when the attacker's lane is clear.
  // HYDRA REWORK (owner 2026-06-12 ~23:35): opens behind FIVE heads · a very low 1/2/3
  // (floor) maul · EVERY point of damage it takes grows a head in that lane · the head
  // clock is HYPER-inflationary (waves double: 1, 2, 4, 8…). The whole fight is a DPS
  // race: hit hard enough to outrun the inflation your own hits feed.
  hydra: {
    name: "Hyper-Inflation Hydra", maxHp: 21, atk: 0, cd: 0, color: "#5fd0a0", spawn: false, boss: true, backline: true, gold: 0,
    passiveText: "Every 6s, gains +1 melee and summons heads equal to its current +1s. Plays Swarm, Regenerate, Heads Up, Inflation, and Bite from its deck.",
  },
  litigationLich: {
    name: "Litigation Lich", maxHp: 15, atk: 0, cd: 0, color: "#9a7fc0", spawn: false, boss: true, backline: true, gold: 0,
    passiveText: "Alternates stances: OBJECTION caps every hit at 1; recess only softens by 1. Plays Bone Legjon, Power Word: Annihilate, Eye Beam, Frost Orb, and Life Drain from its deck.",
  },
  djinn: {
    name: "Djinn of Deals", maxHp: 19, atk: 0, cd: 0, color: "#d0904f", spawn: false, boss: true, gold: 0,
    passiveText: "Always fights across four lanes. After every real card it plays, moves behind the most bodies in another lane. False copies cast convincing no-op spells.",
  },
  kraken: {
    name: "Kleptomaniac Kraken", maxHp: 19, atk: 0, cd: 0, color: "#5f8fd0", spawn: false, boss: true, backline: true, gold: 0,
    passiveText: "Steals your cards and turns them on you — kill the stolen card to take it back. Hides behind a wall of tentacles.",
  },
  // ===== BOSS SUMMON TOKENS — summon-class (HP-knob exempt, never adoptable). =====
  // Heads are "like rats — 1/1s" (owner ruling 2026-06-11): the rat's bite on the rat's clock.
  hydraHead:  { name: "Hydra Head", maxHp: 1, phys: 1, mag: 0, cd: 0, color: "#5fd0a0", spawn: false, summon: true, gold: 0,
                passiveText: "Bites for 1 every 4s. Re-walls its lane.",
                passive: [{ every: 40, ops: [{ do: "attack" }] }] },
  boneWizard: { name: "Bone Wizard", maxHp: 3, phys: 0, mag: 0, cd: 0, color: "#cfd0e8", spawn: false, summon: true, gold: 0,
                passiveText: "Blasts EVERYONE in its lane for 1 every 10s.",
                passive: [{ every: 100, ops: [{ do: "deal", amount: 1, target: "lane" }] }] },
  tentacle:   { name: "Tentacle", maxHp: 1, phys: 0, mag: 0, cd: 0, color: "#7f6fb0", spawn: false, summon: true, gold: 0,
                passiveText: "A wall of suckers — it only blocks." },
  // An ITEM-ENTITY chassis (Djinn summons / Kraken steals): spawnItemEntity overrides its
  // name + HP (= the item's gold cost) per instance; the wrapped item rides `equipment`
  // and fires through the ordinary foe item machinery (resolver, threat bars, the lot).
  itemEntity: { name: "Animated Item", maxHp: 1, phys: 0, mag: 0, cd: 0, color: "#d8b66a", spawn: false, summon: true, gold: 0,
                passiveText: "A possessed card — kill it to silence it." },
  // DJINN / LICH authored summon bodies (owner 2026-07-15). Kitchen pace maps onto the
  // already-live token clocks: very slow = 6s, medium = 4s.
  kitchenSlow5: { name: "Animated Kitchen", maxHp: 5, phys: 1, mag: 0, cd: 0, color: "#d8b66a", spawn: false, summon: true, gold: 0,
                  passiveText: "Attacks for 1 every 6s.",
                  passive: [{ every: 60, ops: [{ do: "attack" }] }] }, // FLAG — owner confirmation: very slow maps to the shared 6s token clock
  kitchenMedium: { name: "Animated Kitchen", maxHp: 2, phys: 2, mag: 0, cd: 0, color: "#d8b66a", spawn: false, summon: true, gold: 0,
                   passiveText: "Attacks for 2 every 4s.",
                   passive: [{ every: 40, ops: [{ do: "attack" }] }] }, // FLAG — owner confirmation: medium maps to the shared 4s token clock
  kitchenSlow3: { name: "Animated Kitchen", maxHp: 3, phys: 2, mag: 0, cd: 0, color: "#d8b66a", spawn: false, summon: true, gold: 0,
                  passiveText: "Attacks for 2 every 6s.",
                  passive: [{ every: 60, ops: [{ do: "attack" }] }] }, // FLAG — owner confirmation: very slow maps to the shared 6s token clock
  frostOrb: { name: "Frost Orb", maxHp: 1, phys: 0, mag: 0, cd: 0, color: "#a8e0ff", spawn: false, summon: true, gold: 0,
              passiveText: "Casts Blizzard." },
  // THE TRUE FINAL BOSS (owner 2026-06-12, unlocked by the first complete 3-floor run).
  // The V1 ward/nemesis design is DEAD (BOSS_SPEC rule). V2: he plays his OWN DECK — one
  // card up at a time, its own bar, shuffle-bag rotation (see BOSS_DEFS.kingMimic). His
  // cards ARE the game's mechanics: a court of heavy foes, the Kraken's steal, a guard
  // stance, the all-lanes scorch. The ultimate mimic mimics the bosses you already beat.
  kingMimic: {
    name: "King Mimic", maxHp: 16, atk: 0, cd: 0, color: "#e6c34a", spawn: false, boss: true, backline: true, gold: 0,
    passiveText: "Plays his own deck, one card at a time: DECREE summons a heavy court, STEAL turns your cards on you, STANCE guards the crown, CALAMITY scorches every lane. Every card resolves before the deck reshuffles.",
  },

  // ===== ELITES (owner spec 2026-06-27) — a high-tier BODY worth ~15 points, ONE TIER BELOW A BOSS.
  // Unlike a boss, an elite is a LEVELED foe (takes the level curve) and is ADOPTABLE once felled — the
  // 1:1 symmetry pillar (you can WEAR what you beat). Its mechanic lives in special handling (atlasReflect),
  // not a passive op-tree, so it works identically on a foe OR a player wearing it. `atlasReflect:true` is
  // the flag the damage path reads. ATLAS IS THE ONLY ELITE THE OWNER SPECIFIED — more need owner design.
  // [FLAG — base maxHp 14] picked as a heavy "tier below a boss" base (boss bases are 15–21); the level
  // curve stacks on top (a 15-value Atlas spawns ~L6 → 14+9 = 23 HP). Tunable.
  atlas: {
    name: "Atlas, Shrugging", maxHp: 14, phys: 0, mag: 0, cd: 0, color: "#b08d57", gold: 1, atlasReflect: true,
    passiveText: "Every 10 damage he takes, he SHRUGS — dealing 5 plus his melee & ranged bonus to every opposing combatant in his lane. The same lane-wide payback whether you face him or wear him.",
  },

  // Player-class bodies (chosen at the start; never spawned as foes). The atk/cd
  // pair IS the archetype dial: warrior hits hard and steady, rogue fast, mage slow.
  warrior:     { name: "Warrior", maxHp: 13, phys: 2, mag: 0, cd: 70, color: "#e0885a", spawn: false, affinity: "physical" },
  rogue:       { name: "Rogue",   maxHp: 8,  phys: 1, mag: 0, cd: 35, color: "#6fcf97", spawn: false, affinity: "physical", itemCdMul: 0.7 },  // tempo: spammer — all cooldowns shorter
  mage:        { name: "Mage",    maxHp: 7,  phys: 0, mag: 2, cd: 100, color: "#8a9cff", spawn: false, affinity: "magical", itemCdCap: 80 },   // tempo: heavy — caps big spells (Fire/Lightning)
  cleric:      { name: "Cleric",  maxHp: 10, phys: 0, mag: 1, cd: 80, color: "#f1d06a", spawn: false, affinity: "magical" },

  // ===========================================================================
  // THE ARCHETYPE SET (owner spec 2026-06-23) — 15 SCHOOL-FREE player bodies: {name, maxHp,
  // passive}, no sword/staff Power. The owner authored every name + passive; the HP band (6–10)
  // and the engine wiring are tuned to role × passive strength (summoners/casters low, bruisers
  // mid, tanks high). Keys stay PROVISIONAL (owner spec 2026-06-21) — the human NAMES are the
  // canonical layer (NAMES.md). Draftable + foe-rostered via MOXIE_SET; gold 1 (flat economy);
  // art deferred → fallback icon.
  // Trigger DSL: {hit:N}=per N damage TAKEN · {spend:N}=per N moxie spent · {play:N}=per N cards
  // played · {dealtMelee:N}/{dealtRanged:N}=per N melee/ranged damage DEALT · {pairMR}=once a melee
  // AND a ranged card have both been played (UNUSED after the 2026-06-28 Runeblade rework) · per-card
  // EVENTS: {onDeal}=a damaging card landed · {onPlayNonDmg}=a non-damaging card · {onPlayRanged}/
  // {onPlayMelee}=a ranged/melee card by triggerKind (ranged = FOE-AFFECTING cards only; self/ally
  // shields/heals/buffs/summons are typeless → neither; owner 2026-07-06) · {gain:N}=per N
  // moxie gained · {onKill}=a foe fell in your lane · combatStart={counters,shield,doubleNext,moxie}.
  // --- SUMMONERS / CASTERS (low HP) ------------------------------------------------------
  frugal:      { name: "Fat Cat", maxHp: 8, cd: 0, color: "#f0b070", gold: 1,                  // → Fat Cat
                 passiveText: "Every 3 damage taken: summon a rat.",
                 passive: [{ hit: 3, ops: [{ do: "summon", body: "rat", count: 1 }] }] },
  leverage:    { name: "Royal Rat", maxHp: 6, cd: 0, color: "#b8a3c9", gold: 1,                // → Royal Rat
                 passiveText: "Every 3 moxie spent: summon a rat.",                            // owner 2026-07-09: trigger 4 → 3
                 passive: [{ spend: 3, ops: [{ do: "summon", body: "rat", count: 1 }] }] },
  hedge:       { name: "Paid Piper", maxHp: 6, cd: 0, color: "#c9b86a", gold: 1,               // → Paid Piper
                 passiveText: "Every 3 cards played: summon a rat.",
                 passive: [{ play: 3, ops: [{ do: "summon", body: "rat", count: 1 }] }] },
  ratBaron:    { name: "Lizard Wizard", maxHp: 6, cd: 0, color: "#4f9f7f", gold: 1,            // → Lizard Wizard
                 // CHANGED (owner 2026-07-06, corrected 07-07: "1 LESS not 1 total") — replaces the old
                 // per-3-ranged-damage moxie clock (worst body in the 7/06 tier sim, 30% fight winrate).
                 // "Ranged" = the play-trigger tag (foe-affecting cards incl. Slow/Weakness/Taunt + Force).
                 passiveText: "All your ranged cards cost 1 less.",
                 costKind: { kind: "ranged", amount: 1 } },
  // --- BRUISERS / FLEX (mid HP) ----------------------------------------------------------
  compound:    { name: "Centless Centaur", maxHp: 7, cd: 0, color: "#d8b46a", gold: 1,         // → Centless Centaur
                 passiveText: "The first card you play each combat resolves twice.",
                 combatStart: { doubleNext: true } },
  discountDuel:{ name: "Malevolent Mouse", maxHp: 7, cd: 0, color: "#9a8ca8", gold: 1,         // → Malevolent Mouse
                 passiveText: "Start each combat with +1 damage.",
                 combatStart: { counters: 1 } },
  heavyHand:   { name: "Interest Imp", maxHp: 7, cd: 0, color: "#c98a4a", gold: 1,             // → Interest Imp
                 passiveText: "Every 4 moxie spent: gain +1 damage.",
                 passive: [{ spend: 4, ops: [{ do: "counter", amount: 1 }] }] },
  mutualMend:  { name: "Weary Wageslave", maxHp: 7, cd: 0, color: "#a0a0b0", gold: 1,          // → Weary Wageslave
                 passiveText: "Every 2nd card played: melee the front foe for 1.",
                 passive: [{ play: 2, ops: [{ do: "deal", amount: 1, target: "front" }] }] },
  pyramidRogue:{ name: "Rent-Seeking Runeblade", maxHp: 8, cd: 0, color: "#357f5f", gold: 1,   // → Rent-Seeking Runeblade
                 passiveText: "Play a ranged card: +1 melee damage. Play a melee card: +1 ranged damage.",
                 passive: [{ onPlayRanged: true, ops: [{ do: "meleeBonus", amount: 1 }] },
                           { onPlayMelee:  true, ops: [{ do: "rangedBonus", amount: 1 }] }] },
  rentier:     { name: "Vengeful Vampire", maxHp: 8, cd: 0, color: "#b85c6e", gold: 1,         // → Vengeful Vampire
                 passiveText: "Every 2 melee damage dealt: heal 1.",
                 passive: [{ dealtMelee: 2, ops: [{ do: "healSelf", amount: 1 }] }] },
  quakeCap:    { name: "Crypto-Chimera", maxHp: 8, cd: 0, color: "#8a6ad0", gold: 1,           // → Crypto-Chimera
                 passiveText: "Every 3rd card played: deal 1 ranged to the foe lane.",
                 passive: [{ play: 3, ops: [{ do: "deal", amount: 1, target: "lane" }] }] },
  // --- TANKS (high HP) -------------------------------------------------------------------
  ratTrader:   { name: "Toll Troll", maxHp: 9, cd: 0, color: "#6a9f7f", gold: 1,              // → Toll Troll
                 passiveText: "Every 4 moxie spent: heal 2.",
                 passive: [{ spend: 4, ops: [{ do: "healSelf", amount: 2 }] }] },
  bloodfund:   { name: "Market-Crash Minotaur", maxHp: 9, cd: 0, color: "#b09030", gold: 1,   // → Market-Crash Minotaur
                 passiveText: "Every 3 damage taken: melee the front foe for 1.",
                 passive: [{ hit: 3, ops: [{ do: "deal", amount: 1, target: "front" }] }] },
  counterparty:{ name: "Bond Behemoth", maxHp: 10, cd: 0, color: "#7f8fb0", gold: 1,          // → Bond Behemoth
                 passiveText: "Every 3 damage taken: gain +1 damage.",
                 passive: [{ hit: 3, ops: [{ do: "counter", amount: 1 }] }] },
  juggernaut:  { name: "Golden Golem", maxHp: 10, cd: 0, color: "#e0c050", gold: 1,           // → Golden Golem
                 passiveText: "Enter combat with a 2-point shield; every 10 moxie spent: gain shield equal to your max health.",
                 combatStart: { shield: 2 },
                 passive: [{ spend: 10, ops: [{ do: "shield", ofMaxHp: true }] }] },
  // === NEW BODIES (owner 2026-06-27, batch B) — HP values are my defaults, flagged for tuning ========
  killionaire: { name: "Killionaire", maxHp: 7, cd: 0, color: "#e0c84a", gold: 1,
                 passiveText: "Start each combat with 3 moxie.",   // FLAG (owner 2026-07-09): start 3 (nerfed from 4), on-deal gain removed
                 combatStart: { moxie: 3 },
                 passive: [] },
  basilisk:    { name: "Bankrupt Basilisk", maxHp: 8, cd: 0, color: "#6a9f5f", gold: 1,
                 passiveText: "Every 5 moxie spent: each foe in your lane deals 1 less for the rest of the fight.",
                 passive: [{ spend: 5, ops: [{ do: "weakenLane", amount: 1 }] }] },
  // FLAG — FUSED TWO-GOD ELITE (owner 2026-06-27: "fundjin and raisingprofitjin … are one elite body —
  // two gods together"). ONE body, BOTH god effects: Fundjin melee-strikes the lane / Raising-Profitsjin
  // ranged-strikes the front twice (both already present below, per BALANCE_BATCH flag #1). `elite: true`
  // marks the tier — currently a COSMETIC marker: it does NOT change ante/HP/draft-weight or pull the body
  // from the common pool (gold/maxHp left untouched so balance & the foe roster don't shift). Owner dials
  // whether an elite-tier body should cost/weigh more. NAME "Fundjin & Raising-Profitsjin" is a PLACEHOLDER
  // for the owner to overwrite. Art: still keyed to the existing `fundjin` art alias — client art untouched.
  fundjin:     { name: "Fundjin & Raising-Profitsjin", maxHp: 8, cd: 0, color: "#c06ad0", gold: 1, elite: true,
                 passiveText: "Two gods, one body. Fundjin melee-strikes the whole foe lane for 1 every 6s; Raising-Profitsjin ranged-strikes the front foe twice every 6s.",
                 passive: [{ every: 60, kind: "melee", ops: [{ do: "deal", amount: 1, target: "lane" }] },
                           { every: 60, kind: "ranged", ops: [{ do: "deal", amount: 1, target: "front" }, { do: "deal", amount: 1, target: "front" }] }] },
  auditAngel:  { name: "Audit Angel", maxHp: 6, cd: 0, color: "#8ad0ff", gold: 1,
                 passiveText: "Each non-damaging card you play: gain 1 moxie.",
                 passive: [{ onPlayNonDmg: true, ops: [{ do: "gainMoxie", amount: 1 }] }] },
  medusa:      { name: "Mid-Management Medusa", maxHp: 7, cd: 0, color: "#5fae8a", gold: 1,
                 passiveText: "Each ranged card you play: apply 1 poison to the foe lane.",
                 passive: [{ onPlayRanged: true, ops: [{ do: "poison", amount: 1, target: "lane" }] }] },
  depressionDemon: { name: "Depression Demon", maxHp: 7, cd: 0, color: "#6a5c8a", gold: 1,
                 passiveText: "Every debuff you apply lasts twice as long.",
                 debuffMult: 2 },
  bonelord:    { name: "Bookie Bonelord", maxHp: 8, cd: 0, color: "#b0a890", gold: 1,
                 passiveText: "Every 3 moxie gained: summon a rat. Each foe defeated in your lane: +1 melee.",
                 passive: [{ gain: 3, ops: [{ do: "summon", body: "rat", count: 1 }] },
                           { onKill: true, ops: [{ do: "meleeBonus", amount: 1 }] }] },
  debtDragon:  { name: "Debt Dragon", maxHp: 9, cd: 0, color: "#c0504a", gold: 1,
                 passiveText: "Every 10 moxie gained: +3 melee and +3 ranged damage.",
                 passive: [{ gain: 10, ops: [{ do: "meleeBonus", amount: 3 }, { do: "rangedBonus", amount: 3 }] }] },
  neptune:     { name: "Nepotistic Neptune", maxHp: 8, cd: 0, color: "#4a7fd0", gold: 1,
                 passiveText: "Your cards cost 2 more (max 10), but any card costing 6+ resolves twice.",
                 costAdd: 2, costMax: 10, doubleExpensive: 6 },   // FLAG: threshold retargeted 5→6 (owner 2026-07-10 "change to be 6 and above"). 6 is a POST-R2 cost (R2 bumped every card +1), so this now doubles cards the owner considers "6 and above" in the current cost regime.
  // === NEW BODIES (owner 2026-07-06, batch C) — HP values are my defaults, FLAGGED for his tuning ====
  bribedBishop: { name: "Bribed Bishop", maxHp: 8, cd: 0, color: "#e8d8a0", gold: 1,   // FLAG hp 8
                 passiveText: "Every time he's healed: +1 melee damage.",   // FLAG reading: fires on healing RECEIVED, any source
                 onHealedMelee: 1 },
  chequeCherub: { name: "Cheque Cherub", maxHp: 6, cd: 0, color: "#f0c8e0", gold: 1,   // FLAG hp 6
                 passiveText: "Every card you play: heal your ally-target 1 (or shield 1 if they're at full health).",
                 passive: [{ play: 1, ops: [{ do: "chequeHeal", amount: 1 }] }] },
  pyramidHead: { name: "Pyramid-Scheme Head", maxHp: 7, cd: 0, color: "#d8b66a", gold: 1,  // FLAG hp 7
                 passiveText: "Every 3 cards you play: the next card is FREE.",
                 passive: [{ play: 3, ops: [{ do: "freeNext" }] }] },
  // OVERHAUL (owner 2026-07-09): HP DOUBLED 7 → 14 (FLAG: owner said "double it"); promoted to ELITE
  // (added to ELITE_SET below → elite:true + gold 2 base ante). New passive: every 6 moxie SPENT
  // (FLAG: owner first said 3, corrected to 6), deal (1 + its RANGED bonus) to every foe in its lane
  // and heal itself by the TOTAL damage dealt; overheal spills to shield (Task 4, `overheal:true`).
  // FLAG base=1 + spend=6 + heal-amount = total lane damage dealt (mirrors the old lifesteal reading).
  sphinx:      { name: "Stockbroking Sphinx", maxHp: 14, cd: 0, color: "#c8a060", gold: 1, elite: true,
                 passiveText: "Every 6 moxie spent: deal 1 + ranged bonus to the foe lane, healing the damage dealt (overheal → shield).",
                 passive: [{ spend: 6, ops: [{ do: "deal", amount: 1, target: "lane", lifesteal: true, overheal: true }] }] },
  pennyPixie:  { name: "Penny-Pinching Pixie", maxHp: 6, cd: 0, color: "#8fe0c0", gold: 1, // FLAG hp 6
                 passiveText: "All your melee cards cost 1 less.",
                 costKind: { kind: "melee", amount: 1 } },
  econElemental: { name: "Economy Elemental", maxHp: 7, cd: 0, color: "#7fd0a8", gold: 1,  // FLAG hp 7
                 passiveText: "Every 6 seconds: gain 4 moxie. Every other 6 seconds: lose 2.",
                 combatStart: { cycle: { period: 60, seq: [4, -2] } } },
  // === NEW ELITE (owner 2026-07-06): Wandering Castle ===
  wanderCastle: { name: "Wandering Castle", maxHp: 12, cd: 0, color: "#b0a8d8", gold: 2,   // FLAG hp 12
                 passiveText: "Casting a card costing 5+ grants that much shield. Every shield he gains is 1 bigger.",
                 costlyShield: 5, shieldGainBonus: 1 },
  // === NEW ELITE (owner 2026-07-10): Affluence Anubis — a snowballing summoner ===
  // OWNER-AUTHORED: maxHp 12, ELITE, every 6s summon (1 + N) rats where N = "every foe that has been
  // defeated" (owner: "base 1 actually + every foe that has been defeated"). The dynamic count rides the
  // `countPerKill:1` summon op → summonBodies reads room.defeated (per-combat, per-side kill counter).
  // ── OPEN OWNER DECISIONS (defaults implemented + FLAGGED — his to rule): ──────────────────────────
  //   (a) SCOPE — counts kills THIS COMBAT (room.defeated resets each fight in beginCombat). Alt = a
  //       whole-RUN kill count. Default = this-combat.
  //   (b) INTERPRETATION — "foe that has been defeated" read from the CASTER's POV = the CASTER's ENEMIES
  //       defeated (fully symmetric): a FOE Anubis counts PLAYERS downed; a PLAYER Anubis counts real
  //       foes felled. Alt = always the foe-TEAM's defeated count regardless of side. Default = caster's-
  //       enemies (symmetric). ⚠ SNOWBALL NOTE for the owner: with the default, a foe Anubis makes MORE
  //       rats as the players die — it piles onto a losing player (the ranged-foe dogpile complaint). His call.
  //   (c) SUMMON-TOKENS INCLUDED (owner RULING 2026-07-10) — enemy summon tokens (rats/tentacles/animated
  //       items) DO count, his explicit anti-summon design ("punishing enemy rats adding to his summon
  //       pool"). Symmetric: hero-side ally tokens count too (hurtAllyToken/foeHitLaneAll bump .hero).
  //   RAT TYPE = `rat` (the 1-HP tBite summon) — FLAG (owner didn't specify rat vs largeRat).
  //   COLOR #c9a24a (Anubis/wealth gold) — FLAG. gold 2 = elite base ante (set by ELITE_SET loop below).
  affluenceAnubis: { name: "Affluence Anubis", maxHp: 12, cd: 0, color: "#c9a24a", gold: 1, elite: true,  // FLAG color #c9a24a · FLAG rat type `rat`
                 passiveText: "Every 6s: summon a rat for each foe defeated (plus one).",
                 passive: [{ every: 60, ops: [{ do: "summon", body: "rat", count: 1, countPerKill: 1 }] }] },  // owner: base 1 + one per foe defeated · every:60 = 6s (10 ticks/s, cf. largeRat every:40=4s)
  // === WAREWOLF (owner 2026-07-11) — a TWO-FORM body that FLIPS every 6 seconds, starting HUMAN. ==========
  // The spelling "Warewolf" is INTENTIONAL (a pun — "ware" as in merchant ware, matching the money-monster
  // theme of Economy Elemental / Hedgefund Knight / Bribed Bishop); do NOT "correct" it.
  //   HUMAN form (start): −3 to BOTH melee AND ranged damage, and +1 DR (takes 1 less damage per hit).
  //   WAREWOLF form:      +3 MELEE damage only; ranged returns to NORMAL (no −3, no bonus); NO DR.
  // The flip toggles between these every 6s. Mechanism REUSES the Economy Elemental clock precedent
  // (combatStart → a `regens` record → tickRegens fires the flip) — a PURE TIME clock, so it is not
  // coupled to moxie-spend the way an `every:N` body passive would be for a card-caster. The form lives
  // on the combatant as `c.wform` ("human"|"wolf"); the flip adjusts meleeBonus/rangedBonus as DELTAS
  // (so it composes with other bonus sources) and sets the per-combatant `dmgReduce` (0/1) absolutely.
  // The ±3 / +1 DR / 6s numbers ARE owner-stated (2026-07-11). FLAG maxHp 8 = placeholder (owner: "doesn't
  // care about the exact number"). FLAG color #8f96a3 (moonlit grey) = art direction, owner may retune.
  // ICON is FORM-DEPENDENT: /foes/warewolfHuman.svg (human) vs /foes/warewolf.svg (wolf) — see client formArt.
  // DECK: auto-assigned by the draft (rollKit), exactly like every common body — no bespoke per-body deck
  // exists in this engine; owner may retune via loadout. Draftable common (added to MOXIE_SET below).
  warewolf: { name: "Warewolf", maxHp: 8, phys: 0, mag: 0, cd: 0, color: "#8f96a3", gold: 1,  // FLAG maxHp 8 (placeholder) · FLAG color #8f96a3 (art direction)
                 passiveText: "Transforms every 6s. HUMAN: −3 melee & ranged, takes 1 less damage. WAREWOLF: +3 melee, no damage reduction.",
                 combatStart: { warewolf: { period: 60 } } },  // period 60 = 6s (owner-stated); installs the flip clock in applyCombatStart, ticked by tickRegens
};
export const STARTER_BODY = "rookie";
// --- COMBAT LOG recorder (side-effect-only; capped ring buffer, shipped to client only on fight end) ---
export function clog(room, msg) { if (!room) return; const L = (room.combatLog ??= []); L.push(msg); if (L.length > 1500) L.shift(); }
export function logNm(e) { const nm = BODIES[e?.bodyKey]?.name ?? e?.name ?? "?"; return (e && e.side !== "hero") ? "foe " + nm : nm; } // owner 2026-06-26: tag the foe side so a foe wearing the SAME body as a hero never reads identically (the "X (from X)" ambiguity)
// The 15 moxie-economy bodies (above), in spec order — appended to the draft wheel pool below.
export const MOXIE_SET = ["frugal", "leverage", "hedge", "ratTrader", "compound",
  "discountDuel", "pyramidRogue", "bloodfund", "heavyHand", "rentier",
  "ratBaron", "counterparty", "juggernaut", "quakeCap", "mutualMend",
  // NEW (owner 2026-06-27, batch B):
  "killionaire", "basilisk", "fundjin", "auditAngel", "medusa",
  "depressionDemon", "bonelord", "debtDragon", "neptune",
  // NEW (owner 2026-07-06, batch C — 6 commons + the Wandering Castle elite):
  "bribedBishop", "chequeCherub", "pyramidHead", "sphinx", "pennyPixie", "econElemental", "wanderCastle",
  // NEW (owner 2026-07-10): the Affluence Anubis elite (snowballing rat-summoner):
  "affluenceAnubis",
  // NEW (owner 2026-07-11): the Warewolf — a two-form flip body. Added as a COMMON so it is DRAFTABLE
  // (and foe-rosterable, full symmetry). ⚠ FLAG — adding a common shifts draft/foe odds slightly (one more
  // body in DRAFT_BODIES / the foe roster); the owner may prefer it POOL-GATED (define it but leave it out of
  // MOXIE_SET) instead. Left in the pool so FORCEBODY=warewolf can draft it for real-gameplay verification.
  "warewolf"];

// ===========================================================================
// THE BODY ROSTER (MOXIE_SET, above): the source for drafting AND foe-rostering (school-free rip, owner
// 2026-06-23). COMMON vs ELITE TIER (owner 2026-06-28): the original 15 are COMMONS; the batch-B 9 + Atlas
// are ELITES. An ELITE is defined as: (1) it costs ADOPT_COST (5) to BECOME after you fell it — commons are
// FREE to wear; (2) it carries 2 BASE ANTE instead of 1 as a foe (gold 2 → it eats more room budget, so it's
// rarer AND a richer loot/threat). Elites STILL appear as foes in rooms; they're only kept OUT of the
// run-start DRAFT wheel (you EARN an elite by felling + paying — you never start as one). Owner NAMED the
// elite set; Atlas ("Atlas, Shrugging") was an orphan body (defined, never spawned) — now wired in.
// ===========================================================================
export const ELITE_SET = ["killionaire", "basilisk", "fundjin", "auditAngel", "medusa",
  "depressionDemon", "bonelord", "debtDragon", "neptune", "atlas",    // ⭐ the elite tier (owner 2026-06-28)
  "wanderCastle",                                                     // ⭐ batch C (owner 2026-07-06)
  "sphinx",                                                           // ⭐ Sphinx overhaul (owner 2026-07-09): common → ELITE (gold 2 ante, out of the run-start draft wheel)
  "affluenceAnubis"];                                                 // ⭐ Affluence Anubis (owner 2026-07-10): elite rat-summoner (gold 2 ante, earned by felling + ADOPT_COST, out of the run-start wheel)
export const COMMON_SET = MOXIE_SET.filter((k) => !ELITE_SET.includes(k));    // the 15 originals
for (const k of new Set([...MOXIE_SET, ...ELITE_SET])) if (BODIES[k]) BODIES[k].spawn = true;  // commons + elites (incl. Atlas) spawnable
for (const k of ELITE_SET) if (BODIES[k]) { BODIES[k].elite = true; BODIES[k].gold = 2; }      // tag the tier + 2 base ante
export const SET_COMMONS = [...COMMON_SET];          // "the common bodies"

// THE INITIAL DRAFT — the run entry. COMMON bodies ONLY (owner 2026-06-28: you don't start as an elite —
// elites are earned by felling + paying ADOPT_COST). Each bundle pre-rolls a starter deck; every
// player/body receives its own three-offer partition.
export const DRAFT_BODIES = [...COMMON_SET];   // commons only — elites never roll into the run-start wheel
// INITIAL DRAFT (owner 2026-07-14): every draftable player/body gets exactly three private
// body+deck offers. Offer bodies never overlap between players.
export const DRAFT_OFFERS_PER_PLAYER = 3;
export const DRAFT_MAX_PLAYERS = Math.floor(DRAFT_BODIES.length / DRAFT_OFFERS_PER_PLAYER);

// Player classes: legacy body presets retained for compatibility and test helpers.
// FLAG (owner 2026-07-09): the class starter kits referenced first-set cards that were DELETED with
// "remove all the old ones" — remapped 1:1 to their owner-pool equivalents (blade→oSword, bow→oBow,
// scaryKnife→oDagger, hatchet→oHatchet, fire→oFire, lightning→oLightning, wind→oWind, heal→oHoly,
// bigShield→dShield) so the legacy chooseClass path + its draft snapshot stay functional. Owner may retune.
export const CLASSES = {
  warrior: { name: "Warrior", blurb: "Sturdy front-liner — heavy melee and shields.",      kit: ["oSword", "dShield", "oHatchet"] },
  rogue:   { name: "Rogue",   blurb: "Fragile and fast — pick targets and disrupt.",        kit: ["oSword", "oBow", "oDagger"] },
  mage:    { name: "Mage",    blurb: "Ranged control — big targeted fire and lane lightning.", kit: ["oFire", "oLightning", "oWind"] },
  cleric:  { name: "Cleric",  blurb: "Resilient support — heal, shield, and chip damage.",   kit: ["oHoly", "dShield", "oLightning"] },
};
