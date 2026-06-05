// ===========================================================================
// King Mimic — content library (SKELETON, faithful transcription of the paper set).
// The engine reads this; cards are data, not code.
//
// SHAPE
//   Foes/Bosses/Tokens: { name, tier, atk, hp, trig:[{on, ops:[...]}], passive:[...], text }
//   Equipment:          { name, type, tier, tags:[...], ops:[...], text, cd, size }
//
//   trig.on   : "attack" | "hourglass" | "damaged" | "attacked" | "enter"
//   op.do     : attack | deal | heal | healForAttack | counter | summon | flatDamage
//               | shield | reduceFoeAtk | moveFoe | buffAttack | special
//   `text`    : the crisp, human-readable description — source of truth + hover tooltip.
//   `tier`    : star rating (1=*, 2=**, 3=***). For foes it's the stat-line step.
//   `cd`/`size` (equipment): cooldown ticks + space on the cooldown bar.
//               NULL = comes from the scaling formula we haven't designed yet (TODO).
//
// Anything whose logic isn't wired yet carries an op `{do:"special", key, note}` and is
// surfaced as clearly-stubbed. Nothing silently no-ops; `text` always tells the truth.
//
// OPEN RULES QUESTIONS (block correct *implementation*, not this transcription) — see chat.
// ===========================================================================

export const RULES = `
Run: start with 3 random equipment (your cooldown bar). A level is a map of room nodes;
clear a room, pick the next node. Each room = foes lined up in the order they act, scaled by
a formula. Before a room you position freely across lanes; cooldowns are frozen until you press
start. In combat foes telegraph their next action; you fire equipment off cooldown to clear the
room. Combat runs until one side is gone. After a room, each player is offered equipment and may
trade with teammates at equal value.
`.trim();

// ---------------------------------------------------------------------------
// Friendly / summoned tokens (referenced by summon ops). Some statlines unspecified in source.
// ---------------------------------------------------------------------------
export const TOKENS = {
  rat:          { name: "Rat",            atk: 1, hp: 1, trig: [], text: "A 1/1 rat. (Exact rat statline TODO — not given in source.)" },
  head:         { name: "Head",           atk: 1, hp: 1, trig: [], text: "Hydra head token. (Statline TODO.)" },
  fireling:     { name: "Fireling",       atk: 0, hp: 1, trig: [{ on: "hourglass", ops: [{ do: "deal", amount: 1, target: "foe" }] }], text: "1 HP. Deal 1. (Trigger timing TODO.)" },
  lightling:    { name: "Lightling",      atk: 0, hp: 1, trig: [{ on: "hourglass", ops: [{ do: "heal", amount: 1, target: "ally" }] }], text: "1 HP. Heal 1. (Trigger timing TODO.)" },
  earthling:    { name: "Earthling",      atk: 0, hp: 2, trig: [], text: "2 HP wall." },
  fireElemental:{ name: "Fire Elemental", atk: 0, hp: 3, trig: [{ on: "hourglass", ops: [{ do: "deal", amount: 1, target: "lane" }] }], text: "3 HP. Deal 1 to this lane." },
  earthElemental:{name: "Earth Elemental",atk: 0, hp: 4, trig: [], text: "4 HP wall." },
  aspectFlame:  { name: "Aspect of Flame",atk: 0, hp: 4, trig: [{ on: "hourglass", ops: [{ do: "deal", amount: 2, target: "lane" }] }], text: "4 HP. Deal 2 to a lane." },
  aspectEarth:  { name: "Aspect of Earth",atk: 0, hp: 6, trig: [{ on: "hourglass", ops: [{ do: "shield", amount: 1 }] }], text: "6 HP. Shield 1." },
  aspectRats:   { name: "Aspect of Rats", atk: 0, hp: 2, trig: [{ on: "hourglass", ops: [{ do: "special", key: "doubleRats", note: "Double friendly rats in my lane, then add 1." }] }], text: "2 HP. Hourglass: double the friendly rats in my lane, then add 1." },
  ratElemental: { name: "Rat Elemental",  atk: 0, hp: 1, trig: [{ on: "hourglass", ops: [{ do: "summon", token: "rat", count: 1 }] }], text: "1 HP. Hourglass: play a rat." },
  animatedSword:{ name: "Animated Sword", atk: 0, hp: 1, trig: [], passive: [{ do: "special", key: "attackEqualsOwner", note: "My attack equals your attack." }], text: "1 HP. Its attack equals your attack." },
};

// ---------------------------------------------------------------------------
// Foes — the bestiary (also wearable bodies via the mimic). "X/Y" = atk X / hp Y.
// ---------------------------------------------------------------------------
export const FOES = {
  // Attack: heal self for attack
  babyfangs:  { name: "Boss Babyfangs",         tier: 1, atk: 1, hp: 3, trig: [{ on: "attack", ops: [{ do: "healForAttack" }] }], text: "On attack: heal itself for its attack." },
  vampire:    { name: "Vengeful Vampire",       tier: 2, atk: 2, hp: 5, trig: [{ on: "attack", ops: [{ do: "healForAttack" }] }], text: "On attack: heal itself for its attack." },
  greatsword: { name: "Gutsy Greatswordsman",   tier: 3, atk: 3, hp: 7, trig: [{ on: "attack", ops: [{ do: "healForAttack" }] }], text: "On attack: heal itself for its attack." },

  // Attack: gain a +1
  internImp:  { name: "Intern Imp",             tier: 1, atk: 1, hp: 3, trig: [{ on: "attack", ops: [{ do: "counter", amount: 1 }] }], text: "On attack: gain a +1." },
  medusa:     { name: "Middle-Management Medusa",tier: 2, atk: 2, hp: 5, trig: [{ on: "attack", ops: [{ do: "counter", amount: 1 }] }], text: "On attack: gain a +1." },
  killionaire:{ name: "Killionaire",            tier: 3, atk: 3, hp: 7, trig: [{ on: "attack", ops: [{ do: "counter", amount: 1 }] }], text: "On attack: gain a +1." },

  // Hourglass: Attack
  pixie:      { name: "Penny-Pinching Pixie",   tier: 1, atk: 1, hp: 2, trig: [{ on: "hourglass", ops: [{ do: "attack" }] }], text: "Hourglass: attack." },
  youngdead:  { name: "Yuppie Youngdead",       tier: 2, atk: 2, hp: 4, trig: [{ on: "hourglass", ops: [{ do: "attack" }] }], text: "Hourglass: attack." },
  phoenix:    { name: "Fiscal Phoenix",         tier: 3, atk: 3, hp: 6, trig: [{ on: "hourglass", ops: [{ do: "attack" }] }], text: "Hourglass: attack." },

  // Attack: Deal N
  basilisk:   { name: "Bubble-Burst Basilisk",  tier: 1, atk: 1, hp: 2, trig: [{ on: "attack", ops: [{ do: "deal", amount: 1, target: "target" }] }], text: "Attack: deal 1." },
  lizardWizard:{name: "Lizard Wizard",          tier: 2, atk: 2, hp: 4, trig: [{ on: "attack", ops: [{ do: "deal", amount: 2, target: "target" }] }], text: "Attack: deal 2." },
  runeblade:  { name: "Rent-Seeking Runeblade", tier: 3, atk: 3, hp: 6, trig: [{ on: "attack", ops: [{ do: "deal", amount: 3, target: "target" }] }], text: "Attack: deal 3." },

  // Damaged: Attack
  accountant: { name: "Angry Accountant",       tier: 1, atk: 1, hp: 3, trig: [{ on: "damaged", ops: [{ do: "attack" }] }], text: "When damaged: attack." },
  minotaur:   { name: "Market-Crash Minotaur",  tier: 2, atk: 2, hp: 5, trig: [{ on: "damaged", ops: [{ do: "attack" }] }], text: "When damaged: attack." },
  pyramid:    { name: "Pyramid Scheme Head",    tier: 3, atk: 3, hp: 7, trig: [{ on: "damaged", ops: [{ do: "attack" }] }], text: "When damaged: attack." },

  // Damaged: Deal N to lane
  starfish:   { name: "Psychic Starfish",       tier: 1, atk: 1, hp: 2, trig: [{ on: "damaged", ops: [{ do: "deal", amount: 1, target: "lane" }] }], text: "When damaged: deal 1 to its lane." },
  efreeti:    { name: "E-Finance Efreeti",      tier: 2, atk: 1, hp: 4, trig: [{ on: "damaged", ops: [{ do: "deal", amount: 2, target: "lane" }] }], text: "When damaged: deal 2 to its lane." },
  neptune:    { name: "Nepotistic Neptune",     tier: 3, atk: 1, hp: 6, trig: [{ on: "damaged", ops: [{ do: "deal", amount: 3, target: "lane" }] }], text: "When damaged: deal 3 to its lane." },

  // Hourglass: Heal self N
  wageslave:  { name: "Weary Wageslave",        tier: 1, atk: 1, hp: 3,  trig: [{ on: "hourglass", ops: [{ do: "heal", amount: 1, target: "self" }] }], text: "Hourglass: heal itself 1." },
  behemoth:   { name: "Bond Behemoth",          tier: 2, atk: 1, hp: 7,  trig: [{ on: "hourglass", ops: [{ do: "heal", amount: 2, target: "self" }] }], text: "Hourglass: heal itself 2." },
  atlas:      { name: "Atlas, Shrugging",       tier: 3, atk: 1, hp: 11, trig: [{ on: "hourglass", ops: [{ do: "heal", amount: 3, target: "self" }] }], text: "Hourglass: heal itself 3." },

  // Attacked: Play rats
  fatCat:     { name: "Fat Cat",                tier: 1, atk: 1, hp: 2, trig: [{ on: "attacked", ops: [{ do: "summon", token: "rat", count: 1 }] }], text: "When attacked: play a rat." },
  fatterCatter:{name: "Fatter Catter",          tier: 2, atk: 1, hp: 6, trig: [{ on: "attacked", ops: [{ do: "summon", token: "rat", count: 1 }] }], text: "When attacked: play a rat." },
  fattestCattest:{name:"Fattest Cattest",       tier: 3, atk: 1, hp: 8, trig: [{ on: "attacked", ops: [{ do: "summon", token: "rat", count: 2 }] }], text: "When attacked: play 2 rats." },

  // Hourglass: Deal 0 to lane (+Flat Damage passive)
  mummy:      { name: "Money-Munching Mummy",   tier: 1, atk: 0, hp: 2, trig: [{ on: "hourglass", ops: [{ do: "deal", amount: 0, target: "lane" }] }], passive: [{ do: "flatDamage", amount: 1 }], text: "Hourglass: deal 0 to its lane (+1 Flat Damage → 1). Has +1 Flat Damage." },
  cerberus:   { name: "Cashflow Cerberus",      tier: 2, atk: 0, hp: 4, trig: [{ on: "hourglass", ops: [{ do: "deal", amount: 0, target: "lane" }] }], passive: [{ do: "flatDamage", amount: 2 }], text: "Hourglass: deal 0 to its lane (+2 Flat Damage → 2). Has +2 Flat Damage." },
  lilLich:    { name: "Lil Lich",               tier: 3, atk: 0, hp: 6, trig: [{ on: "hourglass", ops: [{ do: "deal", amount: 0, target: "lane" }] }], passive: [{ do: "flatDamage", amount: 3 }], text: "Hourglass: deal 0 to its lane (+3 Flat Damage → 3). Has +3 Flat Damage." },

  // Hourglass: Summon rats
  royalRat:   { name: "Royal Rat",              tier: 1, atk: 0, hp: 2, trig: [{ on: "hourglass", ops: [{ do: "summon", token: "rat", count: 1 }] }], text: "Hourglass: summon 1 rat." },
  royalerRat: { name: "Royaler Rat",            tier: 2, atk: 0, hp: 4, trig: [{ on: "hourglass", ops: [{ do: "summon", token: "rat", count: 2 }] }], text: "Hourglass: summon 2 rats." },
  royalestRat:{ name: "Royalest Rat",           tier: 3, atk: 0, hp: 6, trig: [{ on: "hourglass", ops: [{ do: "summon", token: "rat", count: 3 }] }], text: "Hourglass: summon 3 rats." },

  // Hourglass: gain +1s
  dayTrader:  { name: "Day-Trader Demon",       tier: 1, atk: 0, hp: 2, trig: [{ on: "hourglass", ops: [{ do: "counter", amount: 1 }] }], text: "Hourglass: gain a +1." },
  harpy:      { name: "Hedge-Fund Harpy",       tier: 2, atk: 0, hp: 4, trig: [{ on: "hourglass", ops: [{ do: "counter", amount: 2 }] }], text: "Hourglass: gain two +1s." },
  balrog:     { name: "Bigwig Balrog",          tier: 3, atk: 0, hp: 6, trig: [{ on: "hourglass", ops: [{ do: "counter", amount: 3 }] }], text: "Hourglass: gain three +1s." },

  // Hourglass: Deal N, heals all flat damage it deals
  auditAngel: { name: "Audit Angel",            tier: 1, atk: 0, hp: 3, trig: [{ on: "hourglass", ops: [{ do: "deal", amount: 1, target: "target" }, { do: "special", key: "healOwnFlat", note: "Heal all flat damage I deal." }] }], text: "Hourglass: deal 1, and heal itself for all flat damage it deals." },
  banshee:    { name: "Bailout Banshee",        tier: 2, atk: 0, hp: 5, trig: [{ on: "hourglass", ops: [{ do: "deal", amount: 2, target: "target" }, { do: "special", key: "healOwnFlat", note: "Heal all flat damage I deal." }] }], text: "Hourglass: deal 2, and heal itself for all flat damage it deals." },
  griffin:    { name: "Golden-Parachute Griffin",tier: 3, atk: 0, hp: 7, trig: [{ on: "hourglass", ops: [{ do: "deal", amount: 3, target: "target" }, { do: "special", key: "healOwnFlat", note: "Heal all flat damage I deal." }] }], text: "Hourglass: deal 3, and heal itself for all flat damage it deals." },
};

// ---------------------------------------------------------------------------
// Bosses. ATK/HP are formulas: P = party size, F = floor level.
// ---------------------------------------------------------------------------
export const BOSSES = {
  hydra: {
    name: "Hyper-Inflation Hydra", boss: true, atkFormula: "F", hpFormula: "P*F*4",
    trig: [
      { on: "enter", ops: [{ do: "special", key: "countersEqualParty", note: "Enter with +1s equal to party size." }] },
      { on: "damaged", ops: [{ do: "special", key: "ratsPerParty", note: "Make rats per party size in that lane." }] },
      { on: "hourglass", ops: [{ do: "counter", amount: 1 }, { do: "special", key: "playHeadsPerCounters", note: "Play heads in each lane equal to my +1s." }] },
    ],
    text: "Enters with +1s = party size. When damaged: spawn rats (= party size) in that lane. Hourglass: gain a +1, then play heads in each lane equal to its +1s. ATK = floor · HP = party × floor × 4.",
  },
  litigationLich: {
    name: "Litigation Lich", boss: true, atkFormula: "F", hpFormula: "P*F*4",
    trig: [
      { on: "hourglass", ops: [{ do: "special", key: "summonAnte", note: "Summon Antes worth of bodies, biggest first." }] },
    ],
    passive: [{ do: "special", key: "parityArmor", note: "Odd turns: take only 1 damage from all sources. Even turns: take 1 less from all sources." }],
    text: "Hourglass: summon an Ante's worth of bodies, biggest first. Odd turns: takes only 1 damage from all sources. Even turns: takes 1 less from all sources. ATK = floor · HP = party × floor × 4.",
  },
  djinn: {
    name: "Djinn of Deals", boss: true, atkFormula: "F", hpFormula: "P*F*4",
    trig: [
      { on: "damaged", ops: [{ do: "special", key: "moveAndAttack", note: "Move and attack, right→left if needed." }] },
      { on: "hourglass", ops: [{ do: "special", key: "attackEachLane", note: "Attack each lane." }] },
    ],
    passive: [{ do: "special", key: "tollOnPlay", note: "Whenever a player plays a card, they lose 1 HP." }],
    text: "When damaged: move and attack (right→left). Hourglass: attack each lane. Whenever a player plays a card, they lose 1 HP. ATK = floor · HP = party × floor × 4.",
  },
  kingMimic: {
    name: "King Mimic", boss: true, atk: 4, hp: 99,
    trig: [
      { on: "enter", ops: [{ do: "special", key: "playNemeses", note: "Play all 3 nemeses." }] },
      { on: "hourglass", ops: [{ do: "special", key: "equipBlackMarket", note: "Reveal the top 3 black markets and equip one to me." }] },
    ],
    passive: [{ do: "special", key: "wardWhileOthers", note: "Can't be damaged while any other foe is on the board." }],
    text: "Enters by playing all 3 nemeses. Hourglass: reveal the top 3 black markets and equip one. Cannot be damaged while any other foe is on the board. ATK 4 / HP 99.",
  },
};

// ---------------------------------------------------------------------------
// Equipment — the player's cards. type ∈ deal | summon | passive | sale.
// cd/size = NULL until the scaling formula exists. `tags` for future filtering.
// ---------------------------------------------------------------------------
export const EQUIPMENT = {
  // ---------------- Tier 1 (*) ----------------
  fire:        { name: "Fire",        type: "deal",   tier: 1, tags: ["deal"], ops: [{ do: "deal", amount: 2, target: "foe" }], text: "Deal 2.", cd: null, size: null },
  lightning:   { name: "Lightning",   type: "deal",   tier: 1, tags: ["deal","lane"], ops: [{ do: "deal", amount: 1, target: "lane" }], text: "Deal 1 to the lane.", cd: null, size: null },
  ice:         { name: "Ice",         type: "deal",   tier: 1, tags: ["deal","debuff"], ops: [{ do: "deal", amount: 1, target: "foe" }, { do: "reduceFoeAtk", amount: 1, dur: "turn" }], text: "Deal 1 to a foe and reduce its damage by 1 this turn.", cd: null, size: null },
  light:       { name: "Light",       type: "deal",   tier: 1, tags: ["heal"], ops: [{ do: "heal", amount: 3, target: "ally" }], text: "Heal 3.", cd: null, size: null },
  fireling:    { name: "Fireling",    type: "summon", tier: 1, tags: ["summon"], ops: [{ do: "summon", token: "fireling", count: 1 }], text: "Summon a Fireling (1 HP, Deal 1).", cd: null, size: null },
  lightling:   { name: "Lightling",   type: "summon", tier: 1, tags: ["summon","heal"], ops: [{ do: "summon", token: "lightling", count: 1 }], text: "Summon a Lightling (1 HP, Heal 1).", cd: null, size: null },
  earthling:   { name: "Earthling",   type: "summon", tier: 1, tags: ["summon","wall"], ops: [{ do: "summon", token: "earthling", count: 1 }], text: "Summon an Earthling (2 HP wall).", cd: null, size: null },
  fluffySlippers:{name:"Fluffy Slippers",type:"passive",tier:1, tags:["passive","flat"], passive: [{ do: "flatDamage", amount: 1 }, { do: "special", key: "takeMore", note: "Take 1 more from all sources." }], text: "+1 Flat Damage, but take 1 more from all sources.", cd: null, size: null },
  quickBrace:  { name: "Quick Brace", type: "sale",   tier: 1, tags: ["sale"], ops: [{ do: "special", key: "nextIsSale", note: "Your next card is a sale." }], text: "Your next card is a sale.", cd: null, size: null },
  magicMissile:{ name: "Magic Missile",type:"sale",   tier: 1, tags: ["sale","deal"], ops: [{ do: "deal", amount: 1, target: "foe" }], text: "Deal 1. (Sale)", cd: null, size: null },
  magicSurge:  { name: "Magic Surge", type: "sale",   tier: 1, tags: ["sale","flat"], ops: [{ do: "buffAttack", amount: 1, kind: "flat", dur: "turn" }], text: "Deal +1 Flat Damage this turn. (Sale)", cd: null, size: null },
  manaShield:  { name: "Mana Shield", type: "deal",   tier: 1, tags: ["deal","shield"], ops: [{ do: "deal", amount: 1, target: "foe" }, { do: "shield", amount: 1 }], text: "Deal 1. Shield 1.", cd: null, size: null },
  towershield: { name: "Trusty Towershield",type:"sale",tier:1, tags:["sale","shield"], ops: [{ do: "shield", amount: 1 }], text: "Shield 1. (Sale)", cd: null, size: null },
  fairyBottle: { name: "Fairy Bottle", type: "sale",  tier: 1, tags: ["sale","heal"], ops: [{ do: "heal", amount: 2, target: "ally" }], text: "Heal 2. (Sale)", cd: null, size: null },
  pocketSand:  { name: "Pocket Sand", type: "sale",   tier: 1, tags: ["sale","debuff"], ops: [{ do: "reduceFoeAtk", amount: 2, dur: "round" }], text: "Reduce a foe's damage by 2 this round. (Sale)", cd: null, size: null },
  wheelbarrow: { name: "Big Ol Wheelbarrow",type:"deal",tier:1, tags:["shield"], ops: [{ do: "shield", amount: 3 }], text: "Shield 3.", cd: null, size: null },
  bigPecks:    { name: "Big Pecks",   type: "passive",tier: 1, tags: ["passive","hp"], passive: [{ do: "special", key: "maxHp", amount: 1, note: "+1 HP." }], text: "+1 HP.", cd: null, size: null },
  bolster:     { name: "Bolster",     type: "deal",   tier: 1, tags: ["counter","shield"], ops: [{ do: "counter", amount: 1 }, { do: "shield", amount: 1 }], text: "Gain a +1. Shield 1.", cd: null, size: null },
  mendDefend:  { name: "Mend and Defend",type:"deal", tier: 1, tags: ["heal","shield"], ops: [{ do: "heal", amount: 2, target: "ally" }, { do: "shield", amount: 1 }], text: "Heal 2. Shield 1.", cd: null, size: null },
  taunt:       { name: "Taunt",       type: "deal",   tier: 1, tags: ["shield","move"], ops: [{ do: "shield", amount: 2 }, { do: "moveFoe" }], text: "Shield 2. Move a foe.", cd: null, size: null },
  cripple:     { name: "Cripple",     type: "deal",   tier: 1, tags: ["debuff"], ops: [{ do: "reduceFoeAtk", amount: 3, dur: "round" }], text: "Reduce a foe's damage by 3 this round.", cd: null, size: null },
  gust:        { name: "Gust",        type: "deal",   tier: 1, tags: ["deal","move"], ops: [{ do: "deal", amount: 1, target: "foe" }, { do: "moveFoe" }], text: "Deal 1. Move that foe.", cd: null, size: null },
  waveOfSlugs: { name: "Wave of Slugs",type: "deal",  tier: 1, tags: ["debuff","lane"], ops: [{ do: "special", key: "laneAtkDown", amount: 2, note: "All foes in a lane deal 2 less this turn." }], text: "All foes in a lane deal 2 less this turn.", cd: null, size: null },
  doubleStrike:{ name: "Double Strike",type: "deal",  tier: 1, tags: ["attack"], ops: [{ do: "special", key: "attackAnyway", note: "You attack this turn even if you played a deal; it does double when you do." }], text: "You attack this turn even if you played a deal — and it deals double.", cd: null, size: null },
  ratElemental:{ name: "Rat Elemental",type: "summon",tier: 1, tags: ["summon"], ops: [{ do: "summon", token: "ratElemental", count: 1 }], text: "Summon a Rat Elemental (1 HP, Hourglass: play a rat).", cd: null, size: null },
  momentum:    { name: "Momentum",    type: "deal",   tier: 1, tags: ["buff"], ops: [{ do: "buffAttack", amount: 1, dur: "turn" }], text: "+1 damage with attacks this turn.", cd: null, size: null },
  bountyStrike:{ name: "Bounty Strike",type: "deal",  tier: 1, tags: ["attack","counter","heal"], ops: [{ do: "attack" }, { do: "special", key: "onKill", note: "If this defeats: gain a +1 and heal 2." }], text: "Attack. If it defeats the foe: gain a +1 and heal 2.", cd: null, size: null },
  fishingPole: { name: "Fishing Pole",type: "deal",   tier: 1, tags: ["move","attack"], ops: [{ do: "moveFoe" }, { do: "attack" }], text: "Move a foe. Attack.", cd: null, size: null },
  buildUp:     { name: "Build-Up",    type: "deal",   tier: 1, tags: ["attack","counter"], ops: [{ do: "attack" }, { do: "counter", amount: 1 }], text: "Attack. Gain a +1.", cd: null, size: null },
  pierce:      { name: "Pierce",      type: "deal",   tier: 1, tags: ["attack","pierce"], ops: [{ do: "attack", bonus: 1 }, { do: "special", key: "pierce", note: "Excess damage carries to the foe behind." }], text: "Attack with +1 damage; any excess hits the foe behind.", cd: null, size: null },
  cripplingBlow:{name: "Crippling Blow",type:"deal",  tier: 1, tags: ["attack","debuff"], ops: [{ do: "attack" }, { do: "reduceFoeAtk", amount: 1, dur: "turn" }], text: "Attack. That foe deals 1 less this turn.", cd: null, size: null },
  nerdCrush:   { name: "Nerd Crush",  type: "deal",   tier: 1, tags: ["attack"], ops: [{ do: "attack" }, { do: "special", key: "execute", amount: 2, note: "+2 if foe has less health than you." }], text: "Attack; deal +2 if the foe has less health than you.", cd: null, size: null },
  recycleStrike:{name: "Recycle Strike",type:"deal",  tier: 1, tags: ["attack","draw"], ops: [{ do: "attack" }, { do: "special", key: "returnCard", note: "Put a card back in your hand." }], text: "Attack. Put a card back in your hand.", cd: null, size: null },
  gravebeam:   { name: "Gravebeam",   type: "deal",   tier: 1, tags: ["deal","draw"], ops: [{ do: "deal", amount: 2, target: "foe" }, { do: "special", key: "returnCard", note: "Put a card back in your hand." }], text: "Deal 2. Put a card back in your hand.", cd: null, size: null },
  animatedSword:{name: "Animated Sword",type:"summon",tier: 1, tags: ["summon"], ops: [{ do: "summon", token: "animatedSword", count: 1 }], text: "Summon an Animated Sword (1 HP; its attack equals your attack).", cd: null, size: null },
  bloodPrice:  { name: "Blood Price", type: "sale",   tier: 1, tags: ["sale","attack","selfharm"], ops: [{ do: "special", key: "loseHp", amount: 2, note: "Lose 2 HP." }, { do: "attack" }], text: "Lose 2 HP. Attack. (Sale)", cd: null, size: null },
  heavyBlade:  { name: "Heavy Blade", type: "passive",tier: 1, tags: ["passive","attack"], passive: [{ do: "buffAttack", amount: 1, perm: true }], text: "+1 damage with attacks.", cd: null, size: null },

  // ---------------- Tier 2 (**) ----------------
  windCuffs:   { name: "Wind Cuffs",  type: "passive",tier: 2, tags: ["passive","move"], passive: [{ do: "special", key: "hourglassMoveFoe", note: "Hourglass: move a foe." }], text: "Hourglass: move a foe.", cd: null, size: null },
  trample:     { name: "Trample",     type: "passive",tier: 2, tags: ["passive","attack","trample"], passive: [{ do: "buffAttack", amount: 1, perm: true }, { do: "special", key: "trample", note: "Attacks trample (excess hits behind)." }], text: "+1 damage with attacks; attacks trample.", cd: null, size: null },
  returning:   { name: "Returning",   type: "passive",tier: 2, tags: ["passive","attack","target"], passive: [{ do: "buffAttack", amount: 1, perm: true }, { do: "special", key: "targetAny", note: "Attacks may target any foe." }], text: "+1 damage with attacks; attacks may target any foe.", cd: null, size: null },
  swiftStrike: { name: "Swift Strike",type: "sale",   tier: 2, tags: ["sale","attack"], ops: [{ do: "attack" }], text: "Attack. (Sale)", cd: null, size: null },
  sharkbite:   { name: "Sharkbite",   type: "sale",   tier: 2, tags: ["sale","attack","lifesteal"], ops: [{ do: "special", key: "loseHp", amount: 2, note: "Take 2 damage." }, { do: "attack" }, { do: "special", key: "lifesteal", note: "Heal for the damage you deal." }], text: "Take 2 damage. Attack. Heal for the damage you deal. (Sale)", cd: null, size: null },
  flurry:      { name: "Flurry",      type: "deal",   tier: 2, tags: ["attack"], ops: [{ do: "attack" }, { do: "attack" }], text: "Attack. Attack.", cd: null, size: null },
  liquidMetalBlade:{name:"Liquid Metal Blade",type:"deal",tier:2, tags:["attack","shield"], ops: [{ do: "attack" }, { do: "special", key: "shieldEqualDamage", note: "Gain shield equal to damage dealt." }], text: "Attack; gain shield equal to the damage dealt.", cd: null, size: null },
  flowState:   { name: "Flow State",  type: "deal",   tier: 2, tags: ["attack","draw"], ops: [{ do: "attack" }, { do: "special", key: "playTopCard", note: "Play the top card of your deck." }], text: "Attack, then play the top card of your deck.", cd: null, size: null },
  fireII:      { name: "Fire II",     type: "deal",   tier: 2, tags: ["deal"], ops: [{ do: "deal", amount: 4, target: "foe" }], text: "Deal 4.", cd: null, size: null },
  lightningII: { name: "Lightning II",type: "deal",   tier: 2, tags: ["deal"], ops: [{ do: "deal", amount: 2, target: "twoFoes" }], text: "Deal 2 to two different targets.", cd: null, size: null },
  iceII:       { name: "Ice II",      type: "deal",   tier: 2, tags: ["deal","debuff"], ops: [{ do: "deal", amount: 2, target: "foe" }, { do: "reduceFoeAtk", amount: 2, dur: "turn" }], text: "Deal 2 and give that foe -2 attack this turn.", cd: null, size: null },
  windII:      { name: "Wind II",     type: "deal",   tier: 2, tags: ["deal","lane","move"], ops: [{ do: "deal", amount: 1, target: "lane" }, { do: "special", key: "moveLane", note: "Move all foes in it." }], text: "Deal 1 to a lane and move all foes in it.", cd: null, size: null },
  fireElemental:{name: "Fire Elemental",type:"summon",tier: 2, tags: ["summon"], ops: [{ do: "summon", token: "fireElemental", count: 1 }], text: "Summon a Fire Elemental (3 HP, Deal 1 to this lane).", cd: null, size: null },
  earthElemental:{name:"Earth Elemental",type:"summon",tier:2, tags: ["summon","wall"], ops: [{ do: "summon", token: "earthElemental", count: 1 }], text: "Summon an Earth Elemental (4 HP wall).", cd: null, size: null },
  potOfGreed:  { name: "Pot Of Greed",type: "sale",   tier: 2, tags: ["sale","draw"], ops: [{ do: "special", key: "draw", amount: 2, note: "Draw 2 cards." }], text: "Draw 2 cards. (Sale)", cd: null, size: null },
  wizardHat:   { name: "Wizard Hat",  type: "passive",tier: 2, tags: ["passive","flat"], passive: [{ do: "flatDamage", amount: 1 }], text: "+1 to Flat Damage.", cd: null, size: null },
  rewind:      { name: "Rewind",      type: "deal",   tier: 2, tags: ["special"], ops: [{ do: "special", key: "fireAllHourglass", note: "Activate all your hourglass effects immediately." }], text: "Activate all your hourglass effects immediately.", cd: null, size: null },

  // ---------------- Tier 3 (***) ----------------
  aspectOfFlame:{name: "Aspect of Flame",type:"summon",tier:3, tags: ["summon"], ops: [{ do: "summon", token: "aspectFlame", count: 1 }], text: "Summon Aspect of Flame (4 HP, Deal 2 to a lane).", cd: null, size: null },
  aspectOfEarth:{name: "Aspect of Earth",type:"summon",tier:3, tags: ["summon","wall"], ops: [{ do: "summon", token: "aspectEarth", count: 1 }], text: "Summon Aspect of Earth (6 HP, Shield 1).", cd: null, size: null },
  equilibrium: { name: "Equilibrium", type: "deal",   tier: 3, tags: ["special","heal","deal"], ops: [{ do: "special", key: "equilibrium", note: "Restore to full OR deal missing health." }], text: "Restore a target to full, or deal its missing health.", cd: null, size: null },
  thornCrown:  { name: "Thorn Crown", type: "passive",tier: 3, tags: ["passive","retaliate"], passive: [{ do: "special", key: "thorns", amount: 2, note: "Deal 2 to foes that damage you." }], text: "Deal 2 to foes that damage you.", cd: null, size: null },
  unbreakable: { name: "Unbreakable", type: "deal",   tier: 3, tags: ["shield"], ops: [{ do: "shield", amount: 10 }], text: "Shield 10.", cd: null, size: null },
  aspectOfRats:{ name: "Aspect of Rats",type:"summon",tier: 3, tags: ["summon"], ops: [{ do: "summon", token: "aspectRats", count: 1 }], text: "Summon Aspect of Rats (2 HP, Hourglass: double friendly rats in its lane, then add 1).", cd: null, size: null },
  ironSkin:    { name: "Iron Skin",   type: "passive",tier: 3, tags: ["passive","shield"], passive: [{ do: "special", key: "hourglassShield", amount: 1, note: "Hourglass: Shield 1." }], text: "Hourglass: Shield 1.", cd: null, size: null },
  duelistBlade:{ name: "Duelist Blade",type: "passive",tier: 3, tags: ["passive","attack"], passive: [{ do: "buffAttack", amount: 1, perm: true }, { do: "special", key: "adjacentBonus", amount: 1, note: "+2 total if target is adjacent." }], text: "Your attacks deal +1 (+2 if the target is adjacent).", cd: null, size: null },
  undyingStrike:{name: "Undying Strike",type:"deal",  tier: 3, tags: ["attack","recursion"], ops: [{ do: "attack" }, { do: "special", key: "replayFromUsed", note: "Hourglass: play me from your used pile as a sale." }], text: "Attack. Hourglass: replay it from your used pile as a sale.", cd: null, size: null },
  butterflyBlades:{name:"Butterfly Blades",type:"sale",tier:3, tags: ["sale","attack"], ops: [{ do: "attack" }, { do: "attack" }], text: "Attack. Attack. (Sale)", cd: null, size: null },
  berserkerArmor:{name:"Berserker Armor",type:"passive",tier:3, tags:["passive","attack","risk"], passive: [{ do: "special", key: "berserker", note: "Hourglass: put a counter on me; take damage = my counters; +1 with attacks per counter; can't be discarded." }], text: "Hourglass: gain a counter. Take damage equal to its counters; +1 damage with attacks per counter. Cannot be discarded.", cd: null, size: null },
  everflowingRobes:{name:"Everflowing Robes",type:"passive",tier:3, tags:["passive","deck"], passive: [{ do: "special", key: "reshuffle", note: "When your bag empties, shuffle your used pile into it." }], text: "When you run out of cards in your bag, shuffle your used pile back in.", cd: null, size: null },
};

// Flat lookup of everything by id.
export const ALL = { ...TOKENS, ...FOES, ...BOSSES, ...EQUIPMENT };
