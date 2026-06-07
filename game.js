// King Mimic — pure game logic (no networking, no I/O).
// server.js wires this to WebSockets; tests import it and drive it deterministically.
// Every function takes a `room` (plain state object) and mutates/returns plainly.

// ---------------------------------------------------------------------------
// Tunables / data
// ---------------------------------------------------------------------------
export const LANES = 3;
export const CARAVAN_MAX_HP = 20;
export const ROOM_SIZE = 7;
export const GOD_CD = 5;       // god-mode item cooldown (~0.5s) — spam everything for testing

// Bodies = HP/atk templates. A PLAYER wears one (its HP is your HP); a FOE uses one.
// Defeat a foe and its body unlocks for the WHOLE PARTY to wear — the mimic.
// A body carries: stats (maxHp/atk/cd) + an optional single `passive` (trigger → ops)
// + `ante` (its cost toward a room's required ante). Items add ante on top.
export const BODIES = {
  rookie:      { name: "Rookie Mimic", maxHp: 8,  atk: 2, cd: 0,  color: "#9ad",    spawn: false },
  pixie:       { name: "Penny Pixie",  maxHp: 5,  atk: 1, cd: 30, color: "#7f7",    spawn: true,  ante: 2 },
  auditAngel:  { name: "Audit Angel",  maxHp: 8,  atk: 2, cd: 45, color: "#d9f",    spawn: true,  ante: 4 },
  killionaire: { name: "Killionaire",  maxHp: 13, atk: 4, cd: 70, color: "#e6c34a", spawn: true,  ante: 7 },
  // Summon token + bodies with a single readable passive (the requested examples).
  rat:         { name: "Rat",        maxHp: 1, atk: 1, cd: 25, color: "#c9a98c", spawn: true, summon: true, ante: 1,
                 passiveText: "Attacks for 1 on its timer.",
                 passive: [{ on: "hourglass", ops: [{ do: "attack" }] }] },
  royalRat:    { name: "Royal Rat",  maxHp: 3, atk: 0, cd: 50, color: "#b8a3c9", spawn: true, ante: 2,
                 passiveText: "Summons a rat on its timer.",
                 passive: [{ on: "hourglass", ops: [{ do: "summon", body: "rat", count: 1 }] }] },
  fatCat:      { name: "Fat Cat",    maxHp: 4, atk: 1, cd: 45, color: "#f0b070", spawn: true, ante: 3,
                 passiveText: "Summons a rat when hit.",
                 passive: [{ on: "damaged",   ops: [{ do: "summon", body: "rat", count: 1 }] }] },

  // ===== The full bestiary (content.js families, wired to the engine's verbs) =====
  // Fam 1 — heals itself when it attacks
  babyfangs:   { name: "Boss Babyfangs",       maxHp: 3,  atk: 1, cd: 35, color: "#d98a8a", spawn: true, ante: 2, passiveText: "Heals itself 1 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "healAttack" }] }] },
  vampire:     { name: "Vengeful Vampire",     maxHp: 5,  atk: 2, cd: 42, color: "#b85c6e", spawn: true, ante: 4, passiveText: "Heals itself 2 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "healAttack" }] }] },
  greatsword:  { name: "Gutsy Greatswordsman", maxHp: 7,  atk: 3, cd: 50, color: "#8c4a58", spawn: true, ante: 6, passiveText: "Heals itself 3 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "healAttack" }] }] },
  // Fam 2 — grows stronger (+1) each time it acts
  internImp:   { name: "Intern Imp",           maxHp: 3,  atk: 1, cd: 35, color: "#d0a0e0", spawn: true, ante: 3, passiveText: "Ramps +1 Physical Power every 3.5s.", passive: [{ every: 35, ops: [{ do: "counter", amount: 1 }] }] },
  medusa:      { name: "Middle-Mgmt Medusa",   maxHp: 5,  atk: 2, cd: 42, color: "#a878c8", spawn: true, ante: 5, passiveText: "Ramps +1 Physical Power every 4.2s.", passive: [{ every: 42, ops: [{ do: "counter", amount: 1 }] }] },
  magnate:     { name: "Money Magnate",        maxHp: 7,  atk: 3, cd: 50, color: "#8050a0", spawn: true, ante: 7, passiveText: "Ramps +1 Physical Power every 5.0s.", passive: [{ every: 50, ops: [{ do: "counter", amount: 1 }] }] },
  // Fam 3 — plain attackers (Penny Pixie = the starter "pixie")
  youngdead:   { name: "Yuppie Youngdead",     maxHp: 4,  atk: 2, cd: 40, color: "#9fbf6f", spawn: true, ante: 3 },
  phoenix:     { name: "Fiscal Phoenix",       maxHp: 6,  atk: 3, cd: 48, color: "#e0a040", spawn: true, ante: 5 },
  // Fam 4 — deals extra damage when it attacks
  basilisk:    { name: "Bubble-Burst Basilisk",maxHp: 2,  atk: 1, cd: 35, color: "#6fbf9f", spawn: true, ante: 2, passiveText: "Hits your lane for 1 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "deal", amount: 1 }] }] },
  lizardWizard:{ name: "Lizard Wizard",        maxHp: 4,  atk: 2, cd: 42, color: "#4f9f7f", spawn: true, ante: 4, passiveText: "Hits your lane for 2 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "deal", amount: 2 }] }] },
  runeblade:   { name: "Rent-Seeking Runeblade",maxHp: 6, atk: 3, cd: 50, color: "#357f5f", spawn: true, ante: 6, passiveText: "Hits your lane for 3 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "deal", amount: 3 }] }] },
  // Fam 5 — strikes back when it's hit
  accountant:  { name: "Angry Accountant",     maxHp: 3,  atk: 1, cd: 40, color: "#d0c060", spawn: true, ante: 3, passiveText: "Strikes back for 1 when it's hit.", passive: [{ on: "damaged", ops: [{ do: "attack" }] }] },
  minotaur:    { name: "Market-Crash Minotaur",maxHp: 5,  atk: 2, cd: 46, color: "#b09030", spawn: true, ante: 5, passiveText: "Strikes back for 2 when it's hit.", passive: [{ on: "damaged", ops: [{ do: "attack" }] }] },
  pyramid:     { name: "Pyramid Scheme Head",  maxHp: 7,  atk: 3, cd: 52, color: "#806020", spawn: true, ante: 7, passiveText: "Strikes back for 3 when it's hit.", passive: [{ on: "damaged", ops: [{ do: "attack" }] }] },
  // Fam 6 — lashes its lane when it's hit
  starfish:    { name: "Psychic Starfish",     maxHp: 2,  atk: 1, cd: 40, color: "#e08fae", spawn: true, ante: 3, passiveText: "Hits its lane for 1 when it's struck.", passive: [{ on: "damaged", ops: [{ do: "deal", amount: 1 }] }] },
  efreeti:     { name: "E-Finance Efreeti",    maxHp: 4,  atk: 1, cd: 46, color: "#d06f4e", spawn: true, ante: 4, passiveText: "Hits its lane for 2 when it's struck.", passive: [{ on: "damaged", ops: [{ do: "deal", amount: 2 }] }] },
  neptune:     { name: "Nepotistic Neptune",   maxHp: 6,  atk: 1, cd: 52, color: "#4f8fbf", spawn: true, ante: 5, passiveText: "Hits its lane for 3 when it's struck.", passive: [{ on: "damaged", ops: [{ do: "deal", amount: 3 }] }] },
  // Fam 7 — heals itself on its timer
  wageslave:   { name: "Weary Wageslave",      maxHp: 3,  atk: 1, cd: 40, color: "#a0a0b0", spawn: true, ante: 2, passiveText: "Heals 1 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "healSelf", amount: 1 }] }] },
  behemoth:    { name: "Bond Behemoth",        maxHp: 7,  atk: 1, cd: 48, color: "#707088", spawn: true, ante: 4, passiveText: "Heals 2 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "healSelf", amount: 2 }] }] },
  atlas:       { name: "Atlas, Shrugging",     maxHp: 11, atk: 1, cd: 56, color: "#505060", spawn: true, ante: 6, passiveText: "Heals 3 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "healSelf", amount: 3 }] }] },
  // Fam 8 — spawns rats when hit (Fat Cat = t1)
  fatterCatter:{ name: "Fatter Catter",        maxHp: 6,  atk: 1, cd: 48, color: "#e8a060", spawn: true, ante: 4, passiveText: "Spawns 1 rat when hit.", passive: [{ on: "damaged", ops: [{ do: "summon", body: "rat", count: 1 }] }] },
  fattestCattest:{ name: "Fattest Cattest",    maxHp: 8,  atk: 1, cd: 54, color: "#d89050", spawn: true, ante: 6, passiveText: "Spawns 2 rats when hit.", passive: [{ on: "damaged", ops: [{ do: "summon", body: "rat", count: 2 }] }] },
  // Fam 9 — chips its lane on its timer (flat damage)
  mummy:       { name: "Money-Munching Mummy", maxHp: 2,  atk: 0, cd: 38, color: "#c8b890", spawn: true, ante: 2, passiveText: "Chips its lane for 1 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "deal", amount: 1 }] }] },
  cerberus:    { name: "Cashflow Cerberus",    maxHp: 4,  atk: 0, cd: 44, color: "#a89870", spawn: true, ante: 4, passiveText: "Chips its lane for 2 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "deal", amount: 2 }] }] },
  lilLich:     { name: "Lil Lich",             maxHp: 6,  atk: 0, cd: 50, color: "#887850", spawn: true, ante: 6, passiveText: "Chips its lane for 3 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "deal", amount: 3 }] }] },
  // Fam 10 — summons rats on its timer (Royal Rat = t1)
  royalerRat:  { name: "Royaler Rat",          maxHp: 4,  atk: 0, cd: 52, color: "#a890c0", spawn: true, ante: 4, passiveText: "Summons 2 rats on its timer.", passive: [{ on: "hourglass", ops: [{ do: "summon", body: "rat", count: 2 }] }] },
  royalestRat: { name: "Royalest Rat",         maxHp: 6,  atk: 0, cd: 58, color: "#9880b0", spawn: true, ante: 6, passiveText: "Summons 3 rats on its timer.", passive: [{ on: "hourglass", ops: [{ do: "summon", body: "rat", count: 3 }] }] },
  // Fam 11 — gains +1s on its timer
  dayTrader:   { name: "Day-Trader Demon",     maxHp: 2,  atk: 0, cd: 38, color: "#d07070", spawn: true, ante: 3, passiveText: "Ramps +1 Physical Power every 3.8s.", passive: [{ every: 38, ops: [{ do: "counter", amount: 1 }] }] },
  harpy:       { name: "Hedge-Fund Harpy",     maxHp: 4,  atk: 0, cd: 44, color: "#b05858", spawn: true, ante: 5, passiveText: "Ramps +2 Physical Power every 4.4s.", passive: [{ every: 44, ops: [{ do: "counter", amount: 2 }] }] },
  balrog:      { name: "Bigwig Balrog",        maxHp: 6,  atk: 0, cd: 52, color: "#904040", spawn: true, ante: 7, passiveText: "Ramps +3 Physical Power every 5.2s.", passive: [{ every: 52, ops: [{ do: "counter", amount: 3 }] }] },
  // Fam 12 — deals and heals itself on its timer (Audit Angel = t1, kept generic above)
  banshee:     { name: "Bailout Banshee",      maxHp: 5,  atk: 0, cd: 46, color: "#c0b0e0", spawn: true, ante: 4, passiveText: "Hits your lane for 2 and heals itself 2 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "deal", amount: 2 }, { do: "healSelf", amount: 2 }] }] },
  griffin:     { name: "Golden-Parachute Griffin", maxHp: 7, atk: 0, cd: 54, color: "#e6c34a", spawn: true, ante: 6, passiveText: "Hits your lane for 3 and heals itself 3 on its timer.", passive: [{ on: "hourglass", ops: [{ do: "deal", amount: 3 }, { do: "healSelf", amount: 3 }] }] },

  // ===== BOSSES — the floor-enders (content.js BOSSES, wired to the engine) =====
  // Bosses are Combatants like everyone else: NO auto-swing. All threat lives in
  // passives carrying EXPLICIT numeric amounts (they have no Power; atk:0). `boss:true`
  // flags them for buildRoom + the renderer; they're never in FOE_BODIES so they only
  // ever spawn at a boss node.
  hydra: {
    name: "Hyper-Inflation Hydra", maxHp: 40, atk: 0, cd: 50, color: "#5fd0a0", spawn: false, boss: true, ante: 0,
    passiveText: "Enters with three +1s. Spawns a rat in its lane when struck. Hourglass: gains a +1, then chips every lane for its +1s.",
    passive: [
      { on: "enter",     ops: [{ do: "counter", amount: 3 }] },
      { on: "damaged",   ops: [{ do: "summon", body: "rat", count: 1 }] },
      { on: "hourglass", ops: [{ do: "counter", amount: 1 }, { do: "dealEachLane", amount: 0 }] }, // amount 0 → uses counters only
    ],
  },
  litigationLich: {
    name: "Litigation Lich", maxHp: 30, atk: 0, cd: 55, color: "#9a7fc0", spawn: false, boss: true, ante: 0,
    dmgReduce: 2, // parity armor: every incoming hit is softened by 2 (a single point always slips through)
    passiveText: "Takes 2 less from every source (one point always slips through). Hourglass: summons a litigant.",
    passive: [
      { on: "hourglass", ops: [{ do: "summonArmed", body: "accountant", gear: ["sword"], count: 1 }] },
    ],
  },
  djinn: {
    name: "Djinn of Deals", maxHp: 34, atk: 0, cd: 48, color: "#d0904f", spawn: false, boss: true, ante: 0,
    passiveText: "Strikes back for 3 when struck. Hourglass: scorches every lane for 3.",
    passive: [
      { on: "damaged",   ops: [{ do: "deal", amount: 3 }] },
      { on: "hourglass", ops: [{ do: "dealEachLane", amount: 3 }] },
    ],
  },
  kingMimic: {
    name: "King Mimic", maxHp: 50, atk: 0, cd: 60, color: "#e6c34a", spawn: false, boss: true, ante: 0,
    ward: true, // cannot be damaged while ANY other foe is on the board — clear the court first
    passiveText: "Enters flanked by three nemeses. Cannot be harmed while any other foe lives. Hourglass: summons a fresh nemesis.",
    passive: [
      { on: "enter",     ops: [{ do: "summonArmed", body: "killionaire", gear: ["fire"],  count: 1, lane: 0 },
                                { do: "summonArmed", body: "minotaur",    gear: ["gavel"], count: 1, lane: 1 },
                                { do: "summonArmed", body: "phoenix",     gear: ["bow"],   count: 1, lane: 2 }] },
      { on: "hourglass", ops: [{ do: "summonArmed", body: "vampire", gear: ["bow"], count: 1 }] },
    ],
  },

  // Player-class bodies (chosen at the start; never spawned as foes). The atk/cd
  // pair IS the archetype dial: warrior hits hard and steady, rogue fast, mage slow.
  warrior:     { name: "Warrior", maxHp: 12, phys: 2, mag: 0, cd: 40, color: "#e0885a", spawn: false, affinity: "physical" },
  rogue:       { name: "Rogue",   maxHp: 7,  phys: 1, mag: 0, cd: 18, color: "#6fcf97", spawn: false, affinity: "physical", itemCdMul: 0.7 },  // tempo: spammer — all cooldowns shorter
  mage:        { name: "Mage",    maxHp: 6,  phys: 0, mag: 2, cd: 60, color: "#8a9cff", spawn: false, affinity: "magical", itemCdCap: 45 },   // tempo: heavy — caps big spells (Fire/Lightning)
  cleric:      { name: "Cleric",  maxHp: 9,  phys: 0, mag: 1, cd: 45, color: "#f1d06a", spawn: false, affinity: "magical" },
};
export const STARTER_BODY = "rookie";

// Player classes: a body (the key doubles as its bodyKey) + a 3-item starter kit.
export const CLASSES = {
  warrior: { name: "Warrior", blurb: "Sturdy front-liner — heavy melee and shields.",      kit: ["sword", "gavel", "shield"] },
  rogue:   { name: "Rogue",   blurb: "Fragile and fast — pick targets and disrupt.",        kit: ["sword", "bow", "cold"] },
  mage:    { name: "Mage",    blurb: "Ranged control — big targeted fire and lane lightning.", kit: ["fire", "lightning", "wind"] },
  cleric:  { name: "Cleric",  blurb: "Resilient support — heal, shield, and chip damage.",   kit: ["heal", "shield", "lightning"] },
};

// ITEMS — the whole playable vocabulary. Self-contained: each is {name, cd, text, ops}.
// target: "front" = front foe in your lane · "pick" = your aimed foe (any lane; falls back
// to front of your lane) · "lane" = every foe in your lane. cd = ticks to recharge.
// `ante` = the item's contribution to a room's ante when a foe holds it.
// `fragile` = usable only ONCE per fight, then spent (resets each room).
// `type` = damage school. "physical" items scale with the wielder's Physical Power,
// "magical" with Magical Power. Utility items (heal/shield/wind/ratNest) are untyped.
export const KIT = {
  sword:     { name: "Sword",     cd: 25, ante: 1, type: "physical", text: "Deal 3 (+Phys) to the front foe.",                ops: [{ do: "deal", amount: 3, target: "front" }] },
  bow:       { name: "Bow",       cd: 30, ante: 1, type: "physical", text: "Deal 3 (+Phys) to your targeted foe.",             ops: [{ do: "deal", amount: 3, target: "pick" }] },
  fire:      { name: "Fire",      cd: 70, ante: 3, type: "magical",  text: "Deal 6 (+Mag) to your targeted foe.",              ops: [{ do: "deal", amount: 6, target: "pick" }] },
  lightning: { name: "Lightning", cd: 40, ante: 2, type: "magical",  text: "Deal 2 (+Mag) to every foe in your target's lane.", ops: [{ do: "deal", amount: 2, target: "lane" }] },
  wind:      { name: "Wind",      cd: 35, ante: 1, type: "magical",  text: "Move your targeted foe to the next lane.",          ops: [{ do: "move", target: "pick" }] },
  cold:      { name: "Cold",      cd: 30, ante: 1, type: "magical",  text: "Deal 1 (+Mag) to your targeted foe and delay its next attack by 3.0s.", ops: [{ do: "deal", amount: 1, target: "pick" }, { do: "delay", amount: 30, target: "pick" }] },
  gavel:     { name: "Gavel",     cd: 80, ante: 3, type: "physical", text: "Deal 7 (+Phys) to the front foe.",                 ops: [{ do: "deal", amount: 7, target: "front" }] },
  heal:      { name: "Heal",      cd: 50, ante: 1, text: "Heal yourself 4 HP.",                                ops: [{ do: "healSelf", amount: 4 }] },
  shield:    { name: "Shield",    cd: 45, ante: 1, text: "Block 4 incoming damage in your lane.",              ops: [{ do: "shield", amount: 4 }] },
  // Fragile — one use per fight.
  bomb:      { name: "Bomb",      cd: 20, ante: 2, type: "physical", fragile: true, text: "Once per fight: deal 5 (+Phys) to every foe in your target's lane.", ops: [{ do: "deal", amount: 5, target: "lane" }] },
  ratNest:   { name: "Rat Nest",  cd: 25, ante: 2, fragile: true, text: "Once per fight: summon 2 rats (1 HP each) on your side.", ops: [{ do: "summon", body: "rat", count: 2 }] },
};
export const KIT_POOL = Object.keys(KIT);
export const DRAFT_PICKS = 3;   // how many items each player drafts at the start of a run
export const STOCK_MAX = 12;        // max foes you can stock into a room
// Each dropped item is worth Treasure points = its ante (its weight). Loot is FREE to
// claim, but every item someone snatches is one LESS item converted to Treasure when the
// party leaves the room — the core greed tension: take the gear OR bank its value.
export const itemTreasure = (key) => (KIT[key]?.ante ?? 1);

// Ante a foe contributes = its body's ante + the ante of any items it holds.
export const anteOfFoe = (f) =>
  (BODIES[f.bodyKey]?.ante ?? 0) + (f.gear ?? []).reduce((s, g) => s + (KIT[g]?.ante ?? 0), 0);
export const anteCurrent = (room) => (room.draftedFoes ?? []).reduce((s, f) => s + anteOfFoe(f), 0);

// Kit SPACE is a Treasure spectrum. Each player starts with KIT_SLOTS_BASE slots and can
// buy up to MAX_KIT with Treasure; each extra slot costs more than the last. This is the
// "kit upgrades for more space" sink — a second place the shared purse competes for spend.
export const MAX_KIT = 8;            // hard ceiling on a kit's size
export const KIT_SLOTS_BASE = 5;     // slots a fresh player carries (class kit is 3 → 2 free to grow)
export const KIT_SLOT_COST_MUL = 4;  // Treasure for the next slot = (slots bought so far + 1) × this
// Cost to grow FROM `slots` to `slots+1`. null once you've hit the ceiling.
export const kitSlotCost = (slots) =>
  slots >= MAX_KIT ? null : ((slots | 0) - KIT_SLOTS_BASE + 1) * KIT_SLOT_COST_MUL;

// SHOP nodes — spend Treasure on CHOSEN items (vs. random loot). A shelf of items at
// a markup over their loot value, so skipping loot to bank Treasure and buying what you
// actually want is a real loop. Reroll the shelf for a flat fee.
export const SHOP_COST_MUL = 3;     // a ware costs itemTreasure(key) × this
export const SHOP_WARES = 5;        // items on the shelf at once
export const SHOP_REROLL_COST = 3;  // Treasure to reroll the whole shelf
export const shopPrice = (key) => itemTreasure(key) * SHOP_COST_MUL;
// Roll a fresh shelf: SHOP_WARES distinct items, each priced. (Determinism-friendly:
// tests can set room.shop.wares directly.)
export function rollShopWares() {
  const pool = [...KIT_POOL].sort(() => Math.random() - 0.5).slice(0, SHOP_WARES);
  return pool.map((key) => ({ key, cost: shopPrice(key) }));
}

// Room enchantments — every room carries one. It makes the fight nastier AND sweetens
// the reward (extra loot picks, sometimes a bonus item). Determinism-friendly: tests set
// room.enchant directly; live play picks at random.
export const ENCHANTS = [
  { key: "hastened",  name: "Hastened",     text: "Foes act 20% faster — but the loot is richer.", foeCdMul: 0.8, rewardBonus: 1 },
  { key: "fortified", name: "Fortified",    text: "Foes have +2 HP — and they drop more.",          foeHpBonus: 2, rewardBonus: 1 },
  { key: "savage",    name: "Savage",       text: "Foes hit for +1 — richer spoils await.",          foeAtkBonus: 1, rewardBonus: 1 },
  { key: "hoard",     name: "Cursed Hoard", text: "Foes are tougher, but an extra prize awaits.",    foeHpBonus: 1, rewardBonus: 0, bonusLoot: ["fire"] },
];
export const pickEnchant = () => ENCHANTS[Math.floor(Math.random() * ENCHANTS.length)];
export function applyEnchantToFoe(foe, en) {
  if (!en) return;
  if (en.foeHpBonus) { foe.maxHp += en.foeHpBonus; foe.hp += en.foeHpBonus; }
  if (en.foeAtkBonus) foe.phys = (foe.phys ?? 0) + en.foeAtkBonus; // Savage: +Physical Power
  if (en.foeCdMul) foe.cdMul = en.foeCdMul;
}

// Foe DRAFT POOL: a random foe body + a random (threatening) item — plug and play. Both
// the body and the item add to the foe's ante, so each floor's offers feel different.
// Summons (rats) are never offered; they only enter via summon effects. Pure no-op items
// for a foe (shield/wind/heal) are excluded so no offered foe is pointless.
export const PALETTE_SLOTS = 3; // how many foe choices you see at once
const FOE_BODIES = ["pixie", "basilisk", "accountant", "vampire", "auditAngel", "harpy",
  "minotaur", "royalRat", "fatCat", "behemoth", "banshee", "killionaire", "greatsword",
  "atlas", "wageslave", "starfish", "internImp", "mummy", "medusa", "phoenix", "efreeti", "lizardWizard"];
// Item rarity drives the loot loop:
//  • COMMON — basic standardized attacks (low ante → low Treasure). Baseline rank-and-file
//    carry these; you'll mostly SKIP them and let them convert to Treasure on the way out.
//  • SPICY — the uncommons/rares worth claiming (and wearing/looting). Greedy picks carry these.
const COMMON_ITEMS = ["sword", "bow"];
const SPICY_ITEMS = ["fire", "lightning", "gavel", "cold", "bomb", "ratNest"];
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function buildFoePool() { // the GREEDY palette — armed with the spicy stuff
  return [...FOE_BODIES].sort(() => Math.random() - 0.5).map((b) => ({ bodyKey: b, gear: [rnd(SPICY_ITEMS)] }));
}

// Rank-and-file: the room arrives PRE-STOCKED with these (cheap, common, mostly unarmed
// bodies) scaled to the floor — that's the "balancing mechanism". Players then ADD greedy
// armed picks from the palette for richer loot/Treasure. Baseline foes drop no gear (little
// loot) but still unlock their body on defeat (mimic progression); the juicy loot comes
// from what you greedily invite in.
const BASELINE_POOL = ["pixie", "youngdead", "wageslave", "mummy", "basilisk", "accountant", "starfish"];
export function baselineSize(room, type) {
  const cleared = room.level ? room.level.nodes.filter((n) => n.cleared).length : 0;
  const n = 3 + ((room.floor ?? 1) - 1) * 2 + cleared + (type === "elite" ? 2 : 0); // grows w/ floor & depth
  return Math.max(3, Math.min(STOCK_MAX - 2, n));   // leave headroom under STOCK_MAX for greed picks
}
export function buildBaseline(room, type) {
  // each rank-and-file carries a COMMON item — a standardized attack so they actually
  // threaten, and low-value loot you'll usually leave behind for Treasure.
  return Array.from({ length: baselineSize(room, type) },
    () => ({ bodyKey: rnd(BASELINE_POOL), gear: [rnd(COMMON_ITEMS)], baseline: true }));
}

// The boss roster — one ends each floor. Floors rotate through them, then loop.
export const BOSS_BODIES = ["hydra", "litigationLich", "djinn", "kingMimic"];
// Which boss guards a given floor (1-indexed). Deterministic so the map preview and the
// fight agree, and so tests can assert it. King Mimic is the floor-4 capstone, then it loops.
export const bossForFloor = (floor = 1) => BOSS_BODIES[((floor | 0) - 1 + BOSS_BODIES.length * 100) % BOSS_BODIES.length];

// ---------------------------------------------------------------------------
// Rooms / level
// ---------------------------------------------------------------------------
export function newRoom(code) {
  return {
    code,
    god: (code || "").toUpperCase() === "DEMO", // playtest god mode
    players: new Map(),
    lanes: Array.from({ length: LANES }, () => []),   // foes
    allies: Array.from({ length: LANES }, () => []),  // friendly summons (player side)
    laneShield: new Array(LANES).fill(0),
    unlockedBodies: new Set([STARTER_BODY]),
    treasure: 0,                    // shared party bank — spent on bodies, kit space, and shop wares
    unlockedTiers: new Set(),       // ante values whose entire tier is purchased & free to swap to
    shop: null,                     // at a shop node: { wares: [{key, cost}] }
    caravan: { hp: CARAVAN_MAX_HP, max: CARAVAN_MAX_HP },
    phase: "lobby",                 // lobby | draft | stock | setup | playing | won | lost | shop
    level: null,
    levelComplete: false,
    floor: 1,                       // climbs each time you clear a boss (ante scales with it)
    enchant: null,                  // a room-wide modifier: harder fight, richer reward
    draftedFoes: [],                // the foes you stocked into this room
    foePool: [],                    // the full draft pool for this room
    foePalette: [],                 // the PALETTE_SLOTS choices currently shown
    foeNext: 0,                     // next pool index to roll into a slot
    anteRequired: 0,                // minimum ante you must stock before you can begin
    loot: [],                       // gear claimable after winning (= what the foes carried);
                                    // unclaimed drops convert to Treasure on leaving the room
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
    { id: "n3", type: "shop",   cleared: false, x: 0.5,  y: 0.42, links: ["n4"] },
    { id: "n4", type: "elite",  cleared: false, x: 0.5,  y: 0.60, links: ["n5"] },
    { id: "n5", type: "combat", cleared: false, x: 0.5,  y: 0.78, links: ["n6"] },
    { id: "n6", type: "boss",   cleared: false, x: 0.5,  y: 0.95, links: [] },
  ];
  // pre-roll enchants so the map can preview them on hover (combat/elite only; boss & shop have none)
  for (const n of nodes) if (n.type === "combat" || n.type === "elite") n.enchant = pickEnchant();
  return { nodes, currentId: "n0" };
}

export const nodeById = (room, id) => (room.level ? room.level.nodes.find((n) => n.id === id) : null);
export const currentNode = (room) => (room.level ? nodeById(room, room.level.currentId) : null);

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------
// Per-item cooldown (falls back to the KIT default if the item carries none).
// An item's effective cooldown for a given wielder. A body's TEMPO bends it:
//  • itemCdMul (< 1): "spammer" body — every cooldown shorter.
//  • itemCdCap: "heavy" body — caps the cooldown, taming big spells (Fire/Gavel) most.
export const itemCd = (inv, body) => {
  let cd = inv.cd != null ? inv.cd : KIT[inv.key].cd;
  if (body?.itemCdMul) cd *= body.itemCdMul;
  if (body?.itemCdCap) cd = Math.min(cd, body.itemCdCap);
  return Math.max(1, Math.round(cd));
};

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

// Build a live inventory from a player's drafted card keys.
export function kitFromPicks(picks) {
  return picks.filter((k) => KIT[k]).map((key) => ({ key, charge: 0, cd: KIT[key].cd }));
}

export function wearBody(player, bodyKey, keepWoundRatio = false) {
  const b = BODIES[bodyKey];
  const ratio = keepWoundRatio && player.maxHp ? player.hp / player.maxHp : 1;
  player.bodyKey = bodyKey;
  player.maxHp = b.maxHp;
  player.hp = Math.max(1, Math.round(b.maxHp * ratio));
  player.phys = b.phys ?? 0;   // body affinity → Physical Power
  player.mag = b.mag ?? 0;     // body affinity → Magical Power
}

// ---------------------------------------------------------------------------
// Treasure economy — a TIERED unlock. A body's tier = its `ante`. Player/starter
// bodies have no ante → tier 0 (free, gated only by the pool). Foe tiers are bought
// with Treasure: defeating a foe REACHES its tier (makes it purchasable); spending
// Treasure unlocks the WHOLE tier — every body of that ante becomes swappable.
// ---------------------------------------------------------------------------
export const TIER_COST_MUL = 5;                       // Treasure to unlock a tier = ante × this
export const tierCost = (ante) => ante * TIER_COST_MUL;
// Treasure now comes from LOOT you DON'T claim (see itemTreasure / bankUnclaimedLoot) —
// not a flat per-room payout. Greed for gear directly trades against the party's purse.
// Tiers you've REACHED (defeated ≥1 body of that ante) — these are purchasable.
export const tiersReached = (room) =>
  [...new Set([...room.unlockedBodies].map((k) => BODIES[k]?.ante ?? 0).filter((a) => a > 0))].sort((x, y) => x - y);

// Can this player swap INTO `key` right now?
export function canSwapTo(room, player, key) {
  const b = BODIES[key];
  if (!b || b.boss || b.summon) return false;                       // bosses & summon tokens (rats) are never adoptable
  if ([...room.players.values()].some((q) => q !== player && q.bodyKey === key)) return false; // exclusive
  const ante = b.ante ?? 0;
  if (ante === 0) return room.unlockedBodies.has(key);              // tier-0 (rookie/classes): must be in the pool
  return (room.unlockedTiers ?? new Set()).has(ante);               // foe tiers: the whole tier must be purchased
}

// Spend Treasure to unlock a whole ante tier. Requires the tier be reached (defeated).
export function buyTier(room, ante) {
  if (!ante || (room.unlockedTiers ?? new Set()).has(ante)) return false;
  if (!tiersReached(room).includes(ante)) return false;            // must have felled one of that weight first
  const cost = tierCost(ante);
  if ((room.treasure ?? 0) < cost) return false;
  room.treasure -= cost;
  (room.unlockedTiers ??= new Set()).add(ante);
  return true;
}

// EXCLUSIVE body swap — a literal trade through the shared pool. A body worn by another
// player is off-limits. Your current body is RELEASED back into the pool and the chosen
// one becomes you; the swap sticks across rooms (homeBody). `targetKey` null = quick-cycle
// to the next swappable body. Returns the adopted bodyKey, or null if not allowed.
export function swapBody(room, player, targetKey = null) {
  if (!player?.alive) return null;
  let target;
  if (targetKey) {
    if (!canSwapTo(room, player, targetKey)) return null;
    target = targetKey;
  } else {
    const avail = Object.keys(BODIES).filter((k) => k === player.bodyKey || canSwapTo(room, player, k));
    const idx = avail.indexOf(player.bodyKey);
    target = avail[(idx + 1) % avail.length];
  }
  if (!target || target === player.bodyKey) return null;
  room.unlockedBodies.add(player.bodyKey); // my old body goes up into the pool (and reveals its tier)
  wearBody(player, target, true);
  player.homeBody = target;                // "that body is me now" — persists into the next room
  return target;
}

// Networking-free: caller (server) attaches `.ws` afterward.
export function addPlayer(room, id, name) {
  const player = {
    id, name: name || "Adventurer", side: "hero", lane: 1, counters: 0, targetId: null,
    bodyKey: STARTER_BODY, homeBody: STARTER_BODY, classKey: null,
    hp: 0, maxHp: 0, alive: true, downTimer: 0, kitSlots: KIT_SLOTS_BASE,
    inv: freshKit(room.god), draftPicks: [], ws: null,
  };
  wearBody(player, STARTER_BODY);
  if (room.god) { player.maxHp = 999; player.hp = 999; }
  room.players.set(id, player);
  return player;
}

// ---------------------------------------------------------------------------
// Enemies / rooms
// ---------------------------------------------------------------------------
// A foe is just a Combatant with side:"foe". `loadout` arms it with items
// (item keys or {key,cd}) that fire through the same resolver players use.
let _foeSeq = 1;
export function spawnEnemy(bodyKey, loadout = []) {
  const b = BODIES[bodyKey];
  return {
    id: "f" + _foeSeq++, // stable id so the client can target a specific foe
    bodyKey, hp: b.maxHp, maxHp: b.maxHp, phys: b.phys ?? b.atk ?? 0, mag: b.mag ?? 0, charge: 0, side: "foe", lane: 0, counters: 0,
    equipment: loadout.map((l) => {
      const key = typeof l === "string" ? l : l.key;
      return { key, charge: 0, cd: (typeof l === "object" && l.cd) || KIT[key]?.cd || 40 };
    }),
  };
}

// Lay out the room's foes. If the player stocked a composition (the foe-draft), use
// it verbatim; otherwise auto-fill (god mode, bosses, or a skipped draft).
export function buildRoom(room) {
  room.lanes = Array.from({ length: LANES }, () => []);
  const type = currentNode(room)?.type ?? "combat";
  if (type === "boss") {
    // A boss node spawns the ONE designed boss for this floor (center lane). No generic
    // auto-fill — the boss's own passives are the room. Its `enter` trigger fires now so
    // King Mimic arrives flanked by its court and Hydra arrives already ramped.
    spawnBoss(room);
    return; // boss + its summoned court are already enchanted/seeded inside spawnBoss
  }
  if (room.draftedFoes?.length) {
    // round-robin fill: foe i → lane i % LANES, so lanes fill evenly left→right→loop
    room.draftedFoes.forEach((f, i) => room.lanes[i % LANES].push(spawnEnemy(f.bodyKey, f.gear ?? [])));
  } else {
    let size, pool;
    if (type === "elite") { size = ROOM_SIZE + 3; pool = ["pixie", "auditAngel", "killionaire", "killionaire"]; }
    else { size = ROOM_SIZE; pool = ["pixie", "auditAngel", "killionaire"]; }
    for (let i = 0; i < size; i++) {
      room.lanes[i % LANES].push(spawnEnemy(pool[Math.floor(Math.random() * pool.length)]));
    }
  }
  // enchant augments every foe; seed item cooldowns so first shots stagger (no idle start)
  for (const lane of room.lanes) for (const f of lane) {
    applyEnchantToFoe(f, room.enchant);
    for (const it of f.equipment ?? []) it.charge = Math.floor(Math.random() * (it.cd + 1));
  }
  formUp(room); // the wall forms: tanky bodies to the front, squishy/ranged hide at the back
}

// FORMATION — within each lane, the toughest body holds the FRONT (the "base", index 0,
// where it eats melee/`front` hits and shields the lane); squishier foes hide BEHIND it.
// Sort by HP (legible: "the big one's up front"); stable id tiebreak. Front foes die first,
// so the backline is naturally exposed as the wall crumbles. Re-callable after summons.
export const tankiness = (f) => (f.maxHp ?? 0);
export function formUp(room) {
  for (const lane of room.lanes) {
    lane.sort((a, b) => tankiness(b) - tankiness(a) || (a.id < b.id ? -1 : 1));
  }
}

// Spawn the floor's boss into the center lane and fire its one-time `enter` passive
// (counters/court). The enter passive may itself summon armed foes (King Mimic's nemeses),
// so we place the boss FIRST so those summons land in the right lanes.
export function spawnBoss(room) {
  const bossKey = bossForFloor(room.floor ?? 1);
  const boss = spawnEnemy(bossKey);
  boss.lane = 1;
  applyEnchantToFoe(boss, room.enchant);
  room.lanes[1].push(boss);
  runPassive(room, boss, "enter"); // ramps Hydra, summons King Mimic's court, etc.
  // seed item cooldowns on the boss AND anything it summoned so nothing fires on tick 0
  for (const lane of room.lanes) for (const f of lane) {
    for (const it of f.equipment ?? []) it.charge = Math.floor(Math.random() * (it.cd + 1));
  }
  formUp(room); // boss (highest HP) holds the front of its lane; its court files in behind
  return boss;
}

export function enterRoom(room) {
  room.laneShield = new Array(LANES).fill(0);
  room.lanes = Array.from({ length: LANES }, () => []);
  room.allies = Array.from({ length: LANES }, () => []);
  room.caravan.max = room.god ? 999 : CARAVAN_MAX_HP;
  room.caravan.hp = room.caravan.max;
  // Unlocked bodies ACCUMULATE across the whole run (the mimic hook) — NEVER wiped per
  // room. Just ensure the starter is present; god mode opens the whole roster for testing.
  if (!room.unlockedBodies) room.unlockedBodies = new Set([STARTER_BODY]);
  room.unlockedBodies.add(STARTER_BODY);
  if (room.god) for (const k of Object.keys(BODIES)) room.unlockedBodies.add(k);
  for (const p of room.players.values()) {
    // God: full kit on the rookie body. Otherwise the chosen class's body + starter kit.
    p.inv = room.god ? freshKit(true)
          : kitFromPicks(p.draftPicks?.length ? p.draftPicks : KIT_POOL.slice(0, DRAFT_PICKS));
    p.lane = 1; p.alive = true; p.downTimer = 0;
    wearBody(p, room.god ? STARTER_BODY : (p.homeBody ?? STARTER_BODY));
    if (room.god) { p.maxHp = 999; p.hp = 999; }
  }
  // Foe-draft: ordinary rooms let you stock the foes first. Bosses & god auto-fill.
  room.draftedFoes = [];
  room.loot = [];
  const type = currentNode(room)?.type ?? "combat";
  // only combat/elite carry an enchant; shop & boss have none
  room.enchant = (!room.god && (type === "combat" || type === "elite"))
    ? (currentNode(room)?.enchant ?? pickEnchant()) : null;
  room.shop = null;
  if (!room.god && type === "shop") {
    room.shop = { wares: rollShopWares() };   // a fresh shelf of buyable items
    room.phase = "shop";
  } else if (room.god || type === "boss") {
    buildRoom(room);
    room.phase = "setup";
  } else {
    // Ordinary room: it ARRIVES pre-stocked with rank-and-file scaled to the floor (the
    // baseline difficulty). Players then ADD greedy armed picks from the palette — pure
    // upside-for-risk, and the way you invite a body you want to wear/loot.
    room.draftedFoes = buildBaseline(room, type);
    room.foePool = buildFoePool(type);
    room.foePalette = room.foePool.slice(0, PALETTE_SLOTS).map((o) => ({ ...o }));
    room.foeNext = PALETTE_SLOTS;
    room.anteRequired = 0;          // no gate — the baseline guarantees a fight; greed is optional
    room.phase = "stock";
  }
}

// ---------------------------------------------------------------------------
// Foe draft ("stock the room") — solo for now: place foes into lanes, then fight.
// ---------------------------------------------------------------------------
export function addFoe(room, idx) {
  if (room.phase !== "stock") return;
  const opt = room.foePalette?.[idx];
  if (!opt || room.draftedFoes.length >= STOCK_MAX) return;
  // greedy pick (flagged so the baseline rank-and-file stays fixed). lane is assigned
  // automatically (round-robin) at buildRoom time — no manual placement.
  room.draftedFoes.push({ bodyKey: opt.bodyKey, gear: [...(opt.gear ?? [])], greedy: true });
  // a fresh choice rolls into that slot so there's always something new to pick
  const pool = room.foePool ?? [];
  if (pool.length) { room.foePalette[idx] = { ...pool[room.foeNext % pool.length] }; room.foeNext++; }
}

export function removeFoe(room, i) {
  if (room.phase !== "stock") return;
  const f = room.draftedFoes[i];
  if (f && f.greedy) room.draftedFoes.splice(i, 1); // baseline rank-and-file can't be removed
}

export function commitStock(room) {
  if (room.phase !== "stock") return;   // baseline guarantees a fight — no ante gate
  buildRoom(room);
  room.phase = "setup";
}

// Claim a piece of the room's loot into your kit (grows your kit, up to MAX_KIT).
// FREE and first-come (any player may grab any drop). Each claim REMOVES the item from
// the pool, so it no longer converts to Treasure when the party leaves (the greed tension).
// Solo for now: the claiming player keeps it; it persists via their draftPicks.
export function claimLoot(room, player, key) {
  if (room.phase !== "won") return;
  const i = room.loot.indexOf(key);
  if (i < 0 || !KIT[key]) return;
  if (player.draftPicks.length >= (player.kitSlots ?? KIT_SLOTS_BASE)) return; // out of kit space
  room.loot.splice(i, 1);
  player.draftPicks.push(key);           // carried into future rooms via kitFromPicks
}

// Spend shared Treasure to buy this player ONE more kit slot (up to MAX_KIT).
export function buyKitSlot(room, player) {
  if (!player) return false;
  const slots = player.kitSlots ?? KIT_SLOTS_BASE;
  const cost = kitSlotCost(slots);
  if (cost == null || (room.treasure ?? 0) < cost) return false;
  room.treasure -= cost;
  player.kitSlots = slots + 1;
  return true;
}

// Treasure the party would bank right now = the value of every UNCLAIMED drop.
export const pendingTreasure = (room) =>
  (room.loot ?? []).reduce((s, k) => s + itemTreasure(k), 0);

// Leaving a cleared room: whatever loot nobody snatched converts to shared Treasure.
// (Shared bank for now; the per-player even split is a multiplayer-loot refinement.)
export function bankUnclaimedLoot(room) {
  room.treasure = (room.treasure ?? 0) + pendingTreasure(room);
  room.loot = [];
}

// Between rooms (won screen) or at a shop: drop an item from your kit (e.g. to free
// space under the kit cap so you can claim/buy something better).
export function dropItem(room, player, key) {
  if (room.phase !== "won" && room.phase !== "shop") return;
  const i = (player.draftPicks ?? []).indexOf(key);
  if (i >= 0) player.draftPicks.splice(i, 1);
}

export function beginCombat(room) {
  if (room.phase === "setup") room.phase = "playing";
}

// ---------------------------------------------------------------------------
// Class select — each player picks a class (body + 3-card starter kit) before the
// run's first room. When everyone has chosen, the level auto-starts.
// ---------------------------------------------------------------------------
export function startDraft(room) {
  room.phase = "draft";
  room.level = null;
  room.levelComplete = false;
  room.floor = 1;                 // a fresh run starts on floor 1
  room.unlockedBodies = new Set([STARTER_BODY]); // a NEW run resets the adopted-body pool
  room.treasure = 0;                             // …and the treasury
  room.unlockedTiers = new Set();                // …and every purchased tier
  for (const p of room.players.values()) { p.classKey = null; p.draftPicks = []; p.kitSlots = KIT_SLOTS_BASE; } // …and bought kit space
}

export function chooseClass(room, player, classKey) {
  if (room.phase !== "draft" || !CLASSES[classKey]) return;
  player.classKey = classKey;
  player.homeBody = classKey;             // the class key doubles as its bodyKey
  player.draftPicks = [...CLASSES[classKey].kit];
  wearBody(player, classKey);             // show the class immediately while others choose
  maybeFinishDraft(room);
}

export function draftComplete(room) {
  return room.players.size > 0 &&
    [...room.players.values()].every((p) => !!p.classKey);
}

export function maybeFinishDraft(room) {
  if (room.phase === "draft" && draftComplete(room)) startLevel(room);
}

export function startLevel(room) {
  room.level = buildLevel();
  room.levelComplete = false;
  enterRoom(room);
}

// After clearing a boss, descend to the next floor: a fresh map, higher ante. Your
// kit and claimed items carry on; only death (the caravan falling) ends the run.
export function descend(room) {
  if (room.phase !== "won" || !room.levelComplete) return false;
  bankUnclaimedLoot(room);          // unclaimed drops convert to Treasure on the way out
  room.floor = (room.floor ?? 1) + 1;
  room.level = buildLevel();
  room.levelComplete = false;
  enterRoom(room);
  return true;
}

export function advanceLevel(room, toId) {
  if (room.phase !== "won" || !room.level || room.levelComplete) return false;
  const cur = currentNode(room);
  if (!cur || !cur.links.includes(toId)) return false;
  const target = nodeById(room, toId);
  if (!target) return false;
  bankUnclaimedLoot(room);          // unclaimed drops convert to Treasure on the way out
  cur.cleared = true;
  room.level.currentId = toId;
  enterRoom(room);
  return true;
}

// ---------------------------------------------------------------------------
// Shop node — spend shared Treasure on chosen items (and kit space, via buyKitSlot).
// ---------------------------------------------------------------------------
// Buy a ware off the shelf into the player's kit (respects kit space). Removes it
// from the shelf so it can't be bought twice.
export function buyShopItem(room, player, key) {
  if (room.phase !== "shop" || !player || !room.shop) return false;
  const i = (room.shop.wares ?? []).findIndex((w) => w.key === key);
  if (i < 0 || !KIT[key]) return false;
  const ware = room.shop.wares[i];
  if (player.draftPicks.length >= (player.kitSlots ?? KIT_SLOTS_BASE)) return false; // no kit space
  if ((room.treasure ?? 0) < ware.cost) return false;                                // can't afford
  room.treasure -= ware.cost;
  room.shop.wares.splice(i, 1);
  player.draftPicks.push(key);      // carried into future rooms via kitFromPicks
  return true;
}

// Reroll the whole shelf for a flat fee.
export function rerollShop(room) {
  if (room.phase !== "shop" || !room.shop) return false;
  if ((room.treasure ?? 0) < SHOP_REROLL_COST) return false;
  room.treasure -= SHOP_REROLL_COST;
  room.shop.wares = rollShopWares();
  return true;
}

// Leave the shop for a linked node — same graph move as advanceLevel, from the shop phase.
export function leaveShop(room, toId) {
  if (room.phase !== "shop" || !room.level) return false;
  const cur = currentNode(room);
  if (!cur || !cur.links.includes(toId) || !nodeById(room, toId)) return false;
  cur.cleared = true;
  room.level.currentId = toId;
  enterRoom(room);
  return true;
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Effect resolver — the SINGLE place card effects resolve, identically for heroes
// and foes. `source` is any Combatant (has .side 'hero'|'foe' and .lane). Targets
// are RELATIVE to the source: 'foe'/'target' = its front enemy, 'lane' = its lane,
// 'ally'/'self'/'caravan' = its own side. Verbs not wired yet no-op (safe by design).
// ---------------------------------------------------------------------------
export const heroesInLane = (room, lane) =>
  [...room.players.values()].filter((p) => p.alive && p.lane === lane);

// A combatant's effective attack = base + accumulated +1 counters (the ramp lever).
// Power stats. A combatant deals item/strike damage = base + matching Power.
// Physical Power is ramped by `counters` (the "gains +1 attack" passives).
export const effPhys = (c) => (c.phys ?? c.atk ?? 0) + (c.counters ?? 0);
export const effMag  = (c) => (c.mag ?? 0);
export const powerFor = (c, school) => school === "magical" ? effMag(c) : school === "physical" ? effPhys(c) : 0;
export const effAtk = effPhys; // legacy alias (snapshot label / older callers)

// A hit aimed at the hero side of a lane: lane shield absorbs first, then the front
// defender, else the caravan. Shared by foe body-attacks AND foe 'deal' effects.
export function foeHitLane(room, li, dmg) {
  if (room.laneShield[li] > 0) {
    const absorbed = Math.min(room.laneShield[li], dmg);
    room.laneShield[li] -= absorbed; dmg -= absorbed;
  }
  if (dmg <= 0) return;
  // friendly summons block before the player/caravan — the front ally takes the hit
  const ally = room.allies[li][0];
  if (ally) {
    ally.hp -= dmg;
    if (ally.hp <= 0) room.allies[li].shift();
    else { ally.lane = li; ally.side = "hero"; runPassive(room, ally, "damaged"); }
    return;
  }
  const defenders = heroesInLane(room, li);
  if (defenders.length) damagePlayer(room, defenders[0], dmg);
  else room.caravan.hp = Math.max(0, room.caravan.hp - dmg);
}

// The foe a player is currently aiming at, if it still exists. { foe, lane } or null.
export function targetedFoe(room, player) {
  if (!player.targetId) return null;
  for (let i = 0; i < LANES; i++) {
    const f = room.lanes[i].find((e) => e.id === player.targetId);
    if (f) return { foe: f, lane: i };
  }
  return null;
}

// Resolve an item's foe target. 'pick' = your aimed foe. 'front' = the front foe of the
// lane you're aimed at (melee follows your target's lane). Falls back to your own lane.
export function aimedFoe(room, player, kind) {
  const t = targetedFoe(room, player);
  if (kind === "pick") {
    if (t) return t;
    const own = room.lanes[player.lane];
    return own[0] ? { foe: own[0], lane: player.lane } : null;
  }
  const lane = t ? t.lane : player.lane;
  const arr = room.lanes[lane];
  return arr[0] ? { foe: arr[0], lane } : null;
}

export function setTarget(room, player, foeId) {
  player.targetId = foeId; // validity is checked at resolve time
}

// Flat list of all foes (lane order, front-first) — used for Tab cycling.
const allFoes = (room) => room.lanes.flatMap((arr, i) => arr.map((e) => ({ foe: e, lane: i })));

// Tab through targets in order (dir +1/-1).
export function cycleTarget(room, player, dir = 1) {
  const foes = allFoes(room);
  if (!foes.length) { player.targetId = null; return; }
  const idx = foes.findIndex((x) => x.foe.id === player.targetId);
  const next = idx < 0 ? 0 : (idx + dir + foes.length) % foes.length;
  player.targetId = foes[next].foe.id;
}

// Every player always has a valid aim during combat (default = a foe in their lane).
export function ensureTarget(room, player) {
  if (targetedFoe(room, player)) return;
  const own = room.lanes[player.lane];
  if (own[0]) { player.targetId = own[0].id; return; }
  const foes = allFoes(room);
  player.targetId = foes.length ? foes[0].foe.id : null;
}

// Summon `count` bodies into the source's lane — on the SOURCE's side. A foe summons
// foes; a hero (or friendly summon) summons allies. The symmetric reinforcement verb.
export function summonBodies(room, source, op) {
  const baseLane = Math.max(0, Math.min(LANES - 1, source.lane | 0));
  for (let k = 0; k < (op.count ?? 1); k++) {
    const li = op.lane != null ? Math.max(0, Math.min(LANES - 1, op.lane | 0)) : baseLane;
    const into = source.side === "hero" ? room.allies[li] : room.lanes[li];
    const tok = spawnEnemy(op.body, op.gear ?? []); // `summonArmed` passes gear → a real threatening court
    tok.side = source.side; tok.lane = li;
    into.push(tok);
  }
}

// Fire a body's passive for a given trigger ("hourglass" = its timer, "damaged" = on hit).
export function runPassive(room, combatant, trigger) {
  const passive = BODIES[combatant.bodyKey]?.passive;
  if (!passive) return;
  // `every:N` passives run on their OWN clock (see simulateTick), never on triggers.
  const ops = passive.filter((x) => x.on === trigger && !x.every).flatMap((x) => x.ops);
  if (ops.length) resolveOps(room, combatant, ops);
}

// Tick a combatant's self-timed (`every:N`) passives, each on its own independent clock
// (stored in `pcharge`). Decoupled from the body timer and from any player action.
export function tickOwnTimers(room, c) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas) return;
  c.pcharge = c.pcharge || {};
  for (let pi = 0; pi < pas.length; pi++) {
    if (!pas[pi].every) continue;
    c.pcharge[pi] = (c.pcharge[pi] ?? 0) + 1;
    if (c.pcharge[pi] >= pas[pi].every * (c.cdMul ?? 1)) { c.pcharge[pi] = 0; resolveOps(room, c, pas[pi].ops); }
  }
}

export function resolveOps(room, source, ops, school = null) {
  for (const op of ops) {
    const amt = op.amount ?? 0;
    const li = source.lane, lane = room.lanes[li];

    // Foes are simpler: damage lands on the hero side of their lane; summon adds to it.
    if (source.side === "foe") {
      if (op.do === "deal") foeHitLane(room, li, amt + (source.counters ?? 0)); // +1s boost item damage
      else if (op.do === "dealEachLane") {                                       // boss: chip every lane at once
        const each = amt + (source.counters ?? 0);                              // amount 0 → pure counter-scaled (Hydra)
        if (each > 0) for (let l = 0; l < LANES; l++) foeHitLane(room, l, each);
      }
      else if (op.do === "attack") foeHitLane(room, li, effAtk(source));         // strike for its attack
      else if (op.do === "healAttack") source.hp = Math.min(source.maxHp, source.hp + effAtk(source));
      else if (op.do === "summon" || op.do === "summonArmed") summonBodies(room, source, op);
      else if (op.do === "healSelf" || op.do === "heal") source.hp = Math.min(source.maxHp, source.hp + amt);
      else if (op.do === "counter") source.counters = (source.counters ?? 0) + amt; // ramps its attack
      continue;
    }

    switch (op.do) {
      case "deal": {
        const bonus = powerFor(source, school);           // Physical/Magical Power scales the item
        if (op.target === "lane") {                       // every foe in your TARGET's lane
          const tl = (targetedFoe(room, source) ?? { lane: source.lane }).lane;
          for (const e of [...room.lanes[tl]]) damageEnemy(room, tl, e, amt + bonus);
          break;
        }
        const t = aimedFoe(room, source, op.target);     // 'front' or 'pick'
        if (t) damageEnemy(room, t.lane, t.foe, amt + bonus);
        break;
      }
      case "move": {                                      // Wind: shove the aimed foe over a lane
        const t = aimedFoe(room, source, op.target);
        if (t) {
          const from = room.lanes[t.lane], idx = from.indexOf(t.foe);
          if (idx >= 0) { from.splice(idx, 1); room.lanes[(t.lane + 1) % LANES].push(t.foe); }
        }
        break;
      }
      case "delay": {                                     // Cold: push the foe's attack back
        const t = aimedFoe(room, source, op.target);
        if (t) {                                          // delay BOTH clocks: its item attack and its body passive
          t.foe.charge = Math.max(0, t.foe.charge - amt);
          if (t.foe.equipment) for (const it of t.foe.equipment) it.charge = Math.max(0, it.charge - amt);
        }
        break;
      }
      case "summon":   summonBodies(room, source, op); break; // hero summons an ally
      case "shield":   room.laneShield[li] += amt; break;
      case "healSelf": source.hp = Math.min(source.maxHp, source.hp + amt); break;
      case "counter":  source.counters = (source.counters ?? 0) + amt; break;
      default: break; // verb not implemented yet — intentional, never silently wrong
    }
  }
}

export function useItem(room, player, slot) {
  if (room.phase !== "playing" || !player.alive) return;
  const inv = player.inv[slot];
  if (!inv || inv.spent) return;        // a spent fragile item is done for the fight
  if (inv.charge < itemCd(inv, BODIES[player.bodyKey])) return; // not ready (body tempo bends cd)
  const item = KIT[inv.key];
  if (item?.ops) resolveOps(room, player, item.ops, item.type);
  inv.charge = 0;
  if (item?.fragile) inv.spent = true;
}

// Total foes on the board (used by the King Mimic ward).
export const foeCount = (room) => room.lanes.reduce((n, l) => n + l.length, 0);

// Boss defensive flags fold incoming damage into what actually lands:
//  • ward (King Mimic): immune while any OTHER foe is on the board — clear the court first.
//  • dmgReduce (Litigation Lich): every hit is softened, but at least 1 always slips through.
// Ordinary foes have no flags, so this is a no-op for them (pure foe/hero symmetry preserved).
export function effectiveDamageTo(room, enemy, amount) {
  const body = BODIES[enemy.bodyKey] ?? {};
  if (body.ward && foeCount(room) > 1) return 0;       // protected while its court stands
  if (body.dmgReduce && amount > 0) return Math.max(1, amount - body.dmgReduce);
  return amount;
}

export function damageEnemy(room, laneIdx, enemy, amount) {
  amount = effectiveDamageTo(room, enemy, amount);
  if (amount <= 0) return;                              // warded/fully-absorbed: no hit, no on-damaged trigger
  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    const lane = room.lanes[laneIdx];
    const i = lane.indexOf(enemy);
    if (i >= 0) lane.splice(i, 1);
    if (!BODIES[enemy.bodyKey]?.summon) room.unlockedBodies.add(enemy.bodyKey); // the mimic (summons aren't adoptable loot)
  } else {
    enemy.lane = laneIdx; enemy.side = "foe";
    runPassive(room, enemy, "damaged"); // e.g. Fat Cat spawns a rat when hit
  }
}

export function damagePlayer(room, p, amount) {
  if (!p.alive) return;
  p.hp -= amount;
  if (p.hp <= 0) { p.hp = 0; p.alive = false; } // out for the rest of the fight; revived on room clear
}

// One simulation step. Pure: never broadcasts. The server calls this then broadcasts.
export function simulateTick(room) {
  room.tick++;
  if (room.phase !== "playing") return;

  for (const p of room.players.values()) {
    if (!p.alive) continue; // downed heroes stay out until the room is cleared — no mid-combat revive
    ensureTarget(room, p); // always keep a valid aim
    const body = BODIES[p.bodyKey];
    for (const inv of p.inv) {
      const max = itemCd(inv, body);
      if (inv.charge < max) inv.charge++;
    }
  }

  for (let i = 0; i < LANES; i++) {
    for (const e of [...room.lanes[i]]) { // copy: passives/summons may grow the lane mid-tick
      e.side = "foe"; e.lane = i;
      // items: each charges and fires through the shared resolver (fragile fires once)
      if (e.equipment) for (const it of e.equipment) {
        if (it.spent) continue;
        if (it.charge < it.cd) { it.charge++; continue; }
        it.charge = 0;
        const item = KIT[it.key];
        if (item?.ops) resolveOps(room, e, item.ops);
        if (item?.fragile) it.spent = true;
      }
      // per-passive independent timers: a passive carrying `every:N` runs on its OWN
      // clock, decoupled from the body timer and from anything the players do — so a
      // body can ramp every 3.5s AND heal every 5s at their own cadences (visible ramps).
      tickOwnTimers(room, e);
      // body timer: on completion, fire its (non-self-timed) hourglass passives. Foes
      // have NO base swing — damage comes from items and passives, like players.
      e.charge++;
      if (e.charge < BODIES[e.bodyKey].cd * (e.cdMul ?? 1)) continue; // enchant may hasten
      e.charge = 0;
      runPassive(room, e, "hourglass"); // e.g. Royal Rat summons; an attacker strikes
    }
  }

  // friendly summons: same timing rules, but they attack the front FOE in their lane
  for (let i = 0; i < LANES; i++) {
    for (const al of [...room.allies[i]]) {
      al.side = "hero"; al.lane = i;
      tickOwnTimers(room, al); // allies honor self-timed passives too
      al.charge++;
      if (al.charge < BODIES[al.bodyKey].cd) continue;
      al.charge = 0;
      runPassive(room, al, "hourglass"); // a friendly summoner makes more allies
      const foe = room.lanes[i][0];
      const admg = effPhys(al);
      if (foe && admg > 0) damageEnemy(room, i, foe, admg);
    }
  }

  const enemiesLeft = room.lanes.reduce((n, l) => n + l.length, 0);
  if (room.caravan.hp <= 0) room.phase = "lost";
  else if (enemiesLeft === 0) {
    room.phase = "won";
    // Clearing a room patches the party back up — full heal + revive any downed heroes,
    // so you head into the loot/next-room screen whole.
    for (const p of room.players.values()) { p.alive = true; p.downTimer = 0; p.hp = p.maxHp; }
    // Loot = the items the stocked foes carried (+ any bonus the enchantment grants). It's
    // FREE to claim; whatever nobody takes converts to Treasure when the party leaves.
    const gear = (room.draftedFoes ?? []).flatMap((f) => f.gear ?? []).filter((k) => KIT[k]);
    if (room.enchant?.bonusLoot) gear.push(...room.enchant.bonusLoot.filter((k) => KIT[k]));
    room.loot = gear;
    const cur = currentNode(room);
    if (cur && cur.type === "boss") { cur.cleared = true; room.levelComplete = true; }
  }
}

// ---------------------------------------------------------------------------
// Snapshot (client state)
// ---------------------------------------------------------------------------
// The client only needs each body's DISPLAY fields (name/color/stats/passiveText/
// tempo). Strip the internal `passive` op-trees and the `spawn` flag so we don't ship
// (or leak) the whole mechanic definition ~10×/sec — the bulk of the per-tick payload.
const publicBody = ({ passive, spawn, ...rest }) => rest;
export const publicBodies = () =>
  Object.fromEntries(Object.entries(BODIES).map(([k, b]) => [k, publicBody(b)]));

export function snapshot(room) {
  return {
    type: "state",
    phase: room.phase,
    god: !!room.god,
    tick: room.tick,
    floor: room.floor ?? 1,
    enchant: room.enchant ? { name: room.enchant.name, text: room.enchant.text } : null,
    lanes: room.lanes.map((arr, i) => ({
      shield: room.laneShield[i],
      enemies: arr.map((e) => ({
        id: e.id, bodyKey: e.bodyKey, hp: e.hp, maxHp: e.maxHp, charge: e.charge,
        cd: Math.round(BODIES[e.bodyKey].cd * (e.cdMul ?? 1)),
        passive: BODIES[e.bodyKey]?.passiveText ?? null,
        boss: !!BODIES[e.bodyKey]?.boss,
        aoe: (BODIES[e.bodyKey]?.passive ?? []).some((p) => (p.ops ?? []).some((o) => o.do === "dealEachLane")), // telegraph: hits EVERY lane
        warded: !!BODIES[e.bodyKey]?.ward && foeCount(room) > 1, // King Mimic: untouchable until its court falls
        atk: effPhys(e), phys: effPhys(e), mag: effMag(e), counters: e.counters ?? 0,
        gear: (e.equipment ?? []).map((it) => ({
          key: it.key, name: KIT[it.key]?.name ?? it.key, text: KIT[it.key]?.text ?? "", charge: it.charge, cd: it.cd, spent: !!it.spent,
        })),
      })),
      allies: (room.allies?.[i] ?? []).map((a) => ({
        bodyKey: a.bodyKey, hp: a.hp, maxHp: a.maxHp,
      })),
    })),
    caravan: room.caravan,
    map: room.level
      ? { nodes: room.level.nodes, currentId: room.level.currentId, levelComplete: !!room.levelComplete }
      : null,
    unlockedBodies: [...room.unlockedBodies],
    bodies: publicBodies(),
    treasure: room.treasure ?? 0,
    unlockedTiers: [...(room.unlockedTiers ?? [])],
    tiersReached: tiersReached(room),
    tierCostMul: TIER_COST_MUL,     // client labels tier buttons from this (no hardcoded mirror)
    loot: room.phase === "won" && room.loot?.length ? {
      pending: pendingTreasure(room),   // Treasure the party banks if it claims nothing more
      cards: room.loot.map((k) => ({ key: k, name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "", cd: KIT[k]?.cd ?? null, value: itemTreasure(k) })),
    } : null,
    shop: room.phase === "shop" && room.shop ? {
      rerollCost: SHOP_REROLL_COST,
      wares: (room.shop.wares ?? []).map((w) => ({
        key: w.key, name: KIT[w.key]?.name ?? w.key, text: KIT[w.key]?.text ?? "",
        cd: KIT[w.key]?.cd ?? null, type: KIT[w.key]?.type ?? null, cost: w.cost,
      })),
    } : null,
    stock: room.phase === "stock" ? {
      max: STOCK_MAX,
      canBegin: true,                       // baseline guarantees a fight; greed is optional upside
      baselineCount: room.draftedFoes.filter((f) => !f.greedy).length,
      greedCount: room.draftedFoes.filter((f) => f.greedy).length,
      greedAnte: room.draftedFoes.filter((f) => f.greedy).reduce((s, f) => s + anteOfFoe(f), 0),
      palette: room.foePalette.map((o) => ({
        bodyKey: o.bodyKey, name: BODIES[o.bodyKey].name,
        maxHp: BODIES[o.bodyKey].maxHp, ante: anteOfFoe(o),
        passive: BODIES[o.bodyKey]?.passiveText ?? null,
        gear: (o.gear ?? []).map((k) => ({ name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "" })),
      })),
      placed: room.draftedFoes.map((f, i) => ({
        bodyKey: f.bodyKey, name: BODIES[f.bodyKey].name, lane: i % LANES, ante: anteOfFoe(f),
        gear: (f.gear ?? []).map((k) => KIT[k]?.name ?? k), greedy: !!f.greedy,
      })),
    } : null,
    draft: room.phase === "draft" ? {
      classes: Object.entries(CLASSES).map(([key, c]) => ({
        key, name: c.name, blurb: c.blurb,
        body: { name: BODIES[key].name, maxHp: BODIES[key].maxHp, atk: BODIES[key].phys ?? 0, phys: BODIES[key].phys ?? 0, mag: BODIES[key].mag ?? 0, affinity: BODIES[key].affinity ?? null, cd: BODIES[key].cd, color: BODIES[key].color },
        kit: c.kit.map((k) => ({ key: k, name: KIT[k].name, text: KIT[k].text, cd: KIT[k].cd })),
      })),
    } : null,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, lane: p.lane, targetId: p.targetId ?? null,
      bodyKey: p.bodyKey, hp: p.hp, maxHp: p.maxHp, alive: p.alive,
      phys: p.phys ?? 0, mag: p.mag ?? 0,
      classKey: p.classKey ?? null,
      kitSlots: p.kitSlots ?? KIT_SLOTS_BASE,            // current kit capacity (buyable)
      kitSlotCost: kitSlotCost(p.kitSlots ?? KIT_SLOTS_BASE), // Treasure for the next slot (null = maxed)
      kit: (p.draftPicks ?? []).map((k) => ({ key: k, name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "" })),
      inv: p.inv.map((inv) => ({
        key: inv.key, name: KIT[inv.key].name, text: KIT[inv.key].text, type: KIT[inv.key].type ?? null,
        fragile: !!KIT[inv.key].fragile, spent: !!inv.spent,
        charge: inv.charge, cd: itemCd(inv, BODIES[p.bodyKey]), ready: !inv.spent && inv.charge >= itemCd(inv, BODIES[p.bodyKey]),
      })),
    })),
  };
}
