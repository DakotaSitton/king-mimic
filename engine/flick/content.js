// King Mimic — FLICK mode content: the demo's whole card pool, body pool and tuning in ONE table.
//
// Owner brief (2026-10-29): slow-paced REAL-TIME deckbuilder; move stick on the left, a 3-card hand on
// the right; tap a card → an aim reticle from your mimic shows exactly what it will hit; flick to aim.
// Foes show their next card above their heads and the same reticle while they wind up. A floor is rooms
// and hallways ending in a boss. Level-1 player picks a body and a starting deck.
// Round 2 (after his first phone playtest — "felt great… build around this"): rooms bigger, camera
// further out; cards ramp up (wind-up) instead of costing moxie; cards are reusable or one use; up to 4
// players in co-op vs swarms, casters + rangers, bruisers and a floor boss.
// Round 3 (same evening): MANA IS BACK AS A POOL — "Sapphire now dictates mana like how Ruby dictates
// health." Players and foes LEVEL UP (levels obvious), gaining health and mana innately, and more of it
// if they have the gem for it. "Mana is like health, it is only recovered via new floors or cards. So
// now spells can just cost mana. Some cards are still one use, but heals for example are fine to be
// repeatable and based on mana now." Cards still cycle through the deck.
//
// OWNER-STATED (canon):
//   • Four gems. Ruby = health, Emerald = movement speed, Sapphire = mana, Diamond = no stat ("the cards
//     make up for it"). A body's gem gives a one-increment bonus to cards of the same gem, usually damage.
//   • Levels: everyone gains health + mana per level; Ruby / Sapphire bodies gain more of theirs.
//   • Mana and health only come back from cards or a new floor. Spells cost mana; weapons ramp up.
//   • Heals are repeatable (paid with mana); some cards stay one use.
//   • Cards wind up before they land; bigger weapons take longer and cover more (Zweihänder vs Sword);
//     Spear is a thin hurtbox.
//   • Card names: Sword, Spear, Hatchet, Zweihänder, Lightning Bolt, Fireball, Blizzard, Arcane Orb,
//     Summon Efreeti, Sunbeam (heals allies, hurts foes, persistent area) — "etc, keep going".
//   • Royal Rat: every card played also summons a rat (1 HP, aggros, quick 1-damage bite).
//     Fat Cat: being attacked summons a rat. Lizard Wizard: spell cards are cheaper.
//
// EVERYTHING ELSE HERE IS A PLACEHOLDER (FLAG) — mana costs, level gains and XP steps, wind-ups, sizes,
// damage, HP, which cards stay one use (Summon Efreeti, Blizzard, Earthquake, Mana Vial), the Mana Vial
// card itself, which gem each card and body carries, the extra cards, the foe roster and the boss.
// Dakota edits these by hand; the engine reads only this file.
//
// Units: 1 = one floor tile. Times in seconds. Angles in degrees.

export const GEMS = {                                                                       // FLAG amounts
  ruby:     { name: "Ruby",     color: "#ff4d6d", stat: "+6 health, +2 more each level" },
  emerald:  { name: "Emerald",  color: "#3ddc84", stat: "+20% move speed" },
  sapphire: { name: "Sapphire", color: "#4d9bff", stat: "+8 mana, +3 more each level" },
  diamond:  { name: "Diamond",  color: "#d8f0ff", stat: "No stat — Diamond cards are stronger" },
};
export const GEM_STATS = {                                                                  // FLAG
  ruby: { hp: 6, hpPerLevel: 2 }, emerald: { speed: 0.2 }, sapphire: { mana: 8, manaPerLevel: 3 }, diamond: {},
};

export const TUNING = {                                                                     // all FLAG
  speed: 3.0,            // tiles / second, before gems
  radius: 0.38,          // token radius
  castMoveMul: 0.45,     // you can drift while a card ramps up
  hand: 3,
  deckSize: 8,           // starting deck = 8 different cards
  // ---- health, mana, levels ----
  mana: 10,              // everyone's mana at level 1, before Sapphire
  hpPerLevel: 3,         // everyone gains this much max health per level …
  manaPerLevel: 3,       // … and this much max mana (Ruby / Sapphire add theirs on top — GEM_STATS)
  levelXp: [0, 4, 10, 18, 28, 40],   // party XP needed to reach level 1, 2, 3, … (a felled foe gives its level)
  maxLevel: 6,
  spellDiscount: 1,      // Lizard Wizard: spells cost this much less (never below 1)
  roomClearHeal: 0,      // owner: health and mana come back only from cards or a new floor
  // ---- foes ----
  foeHpMul: 0.9,         // floor-1 foes wear their body at reduced HP (the hex branch's level-0 idea)
  foeSpeedMul: 0.75,
  foeWindupMul: 1.25,    // foes telegraph longer than you do …
  foeWindupAdd: 0.35,    // … and never less than this, so a Dagger is still dodgeable on a phone
  foeCastGap: 1.0,       // seconds a foe rests between cards
  roomLevels: [1, 1, 2, 3], bossLevel: 4, addsLevel: 2,   // foe levels by fight room, the boss, its pack
  // ---- summons / misc ----
  ratCap: 3,             // living rats per owner (oldest crumbles)
  fatCatCooldown: 1.5,   // Fat Cat can spawn at most one rat per this many seconds
  shieldCap: 12,         // most shield anyone can hold
  dashSpeed: 22,         // tiles / second while charging
  fizzle: 0.35,          // a spell flicked without the mana for it fizzles (cycles out) after this long
  summonAggro: 10,       // summons go after foes within this many tiles
  summonHeel: 1.6,       // idle summons stay this close to their owner …
  summonLeash: 12,       // … and hop back to them past this distance
  // ---- co-op (up to 4) — all FLAG ----
  maxPlayers: 4,
  reviveRange: 1.5,      // stand this close to a downed friend …
  reviveTime: 2.5,       // … for this long to stand them back up
  reviveHp: 0.35,        // share of max HP they come back with (also when the room is cleared)
  coopFoeHp: 0.4,        // each extra player: room foes +40% HP …
  coopBossHp: 0.8,       // … the boss +80% HP …
  // … and the room's `extra` foes join (one per extra player) — see ENCOUNTERS
  foeTokens: 1,          // foes allowed to wind up at once in a room = this + party size (swarms and
                         // the boss don't need one) — keeps a crowded room readable
  spreadAggro: 2.5,      // a foe treats a hero already targeted by N others as N×this tiles farther
  retarget: 1.4,         // seconds between a foe's target choices
};

// shape kinds — what the reticle draws and what gets hit:
//   arc   {r, deg}        swing around the caster, follows the caster while ramping up
//   line  {len, w}        instant thrust/bolt from the caster, hits everything in it, stops at walls
//   shot  {range, w, speed} projectile, hits the FIRST foe, stops at walls
//   circle{range, r}      lands at the aimed point (drag farther = farther, up to range)
//   self  {r}             ring around the caster
//   dash  {len, w}        the caster charges along the aim, hitting everything passed
// type: weapon (free — just its ramp-up) · spell (costs `cost` mana) · item (free)
// effects: dmg, heal (allies), shield (self), mana (self), zone {dur, every, dmg, heal, slow}, summon
// once: true = ONE USE (spent until the next floor); otherwise the card goes back into your deck.
// bonus: what a matching-gem body adds — the "one increment".
export const CARDS = {
  // ---------------- RUBY — strength ----------------
  sword: {
    name: "Sword", gem: "ruby", type: "weapon", windup: 0.7, art: "oSword",
    shape: { kind: "arc", r: 1.7, deg: 110 }, dmg: 3, bonus: { dmg: 1 },
    text: "Slash the arc in front of you for 3.",
  },
  hatchet: {
    name: "Hatchet", gem: "ruby", type: "weapon", windup: 0.65, art: "oHatchet",
    shape: { kind: "shot", range: 5, w: 0.45, speed: 10 }, dmg: 3, bonus: { dmg: 1 },
    text: "Throw a hatchet: 3 to the first foe it meets.",
  },
  zweihander: {
    name: "Zweihänder", gem: "ruby", type: "weapon", windup: 1.8, art: "oZweihander",
    shape: { kind: "arc", r: 2.6, deg: 200 }, dmg: 8, bonus: { dmg: 1 },
    text: "Long ramp, huge sweep: 8 to everything in a wide arc.",
  },
  charge: {
    name: "Charge", gem: "ruby", type: "weapon", windup: 1.0, art: "oPileOn",
    shape: { kind: "dash", len: 4.5, w: 1.0 }, dmg: 4, bonus: { dmg: 1 },
    text: "Charge forward, hitting everything you pass for 4.",
  },
  shield: {
    name: "Shield", gem: "ruby", type: "spell", cost: 2, windup: 0.5, art: "dShield",
    shape: { kind: "self", r: 0 }, shield: 5, bonus: { shield: 1 },
    text: "Gain a 5-point shield.",
  },
  earthquake: {
    name: "Earthquake", gem: "ruby", type: "spell", cost: 4, once: true, windup: 1.3, art: "oEarthquake",
    shape: { kind: "self", r: 2.6 }, dmg: 7, bonus: { dmg: 1 },
    text: "Slam the ground: 7 to everything around you.",
  },
  // ---------------- EMERALD — agility ----------------
  dagger: {
    name: "Dagger", gem: "emerald", type: "weapon", windup: 0.4, art: "oDagger",
    shape: { kind: "arc", r: 1.25, deg: 70 }, dmg: 2, bonus: { dmg: 1 },
    text: "Quick stab for 2.",
  },
  spear: {
    name: "Spear", gem: "emerald", type: "weapon", windup: 0.8, art: "oSpear",
    shape: { kind: "line", len: 3.3, w: 0.45 }, dmg: 4, bonus: { dmg: 1 },
    text: "Long thin thrust: 4 to everything on the line.",
  },
  bow: {
    name: "Bow", gem: "emerald", type: "weapon", windup: 0.9, art: "oBow",
    shape: { kind: "shot", range: 9, w: 0.3, speed: 15 }, dmg: 3, bonus: { dmg: 1 },
    text: "Loose an arrow: 3 to the first foe it meets.",
  },
  javelin: {
    name: "Javelin", gem: "emerald", type: "weapon", windup: 1.2, art: "oJavelin",
    shape: { kind: "line", len: 7, w: 0.4 }, dmg: 4, bonus: { dmg: 1 },
    text: "Hurl a javelin: 4 to every foe along a long line.",
  },
  petRats: {
    name: "Pet Rats", gem: "emerald", type: "spell", cost: 2, windup: 0.5, art: "oPetRats",
    shape: { kind: "circle", range: 2.5, r: 0.7 }, summon: { unit: "rat", count: 2 }, bonus: { count: 1 },
    text: "Summon 2 rats. Rats have 1 HP, draw foes' attention and bite for 1.",
  },
  bite: {
    name: "Bite", gem: "emerald", type: "weapon", windup: 0.25, art: "tBite",
    shape: { kind: "arc", r: 0.95, deg: 80 }, dmg: 1, bonus: { dmg: 1 },
    text: "Nip whatever is in front of you for 1.",
  },
  // ---------------- SAPPHIRE — mind / mana ----------------
  arcaneOrb: {
    name: "Arcane Orb", gem: "sapphire", type: "spell", cost: 1, windup: 0.6, art: "oArcane",
    shape: { kind: "shot", range: 7, w: 0.5, speed: 8.5 }, dmg: 3, bonus: { dmg: 1 },
    text: "A slow orb: 3 to the first foe it meets.",
  },
  lightningBolt: {
    name: "Lightning Bolt", gem: "sapphire", type: "spell", cost: 3, windup: 0.8, art: "oLightning",
    shape: { kind: "line", len: 8, w: 0.7 }, dmg: 5, bonus: { dmg: 1 },
    text: "A bolt that pierces: 5 to every foe on the line.",
  },
  fireball: {
    name: "Fireball", gem: "sapphire", type: "spell", cost: 3, windup: 1.1, art: "oFire",
    shape: { kind: "circle", range: 7, r: 1.5 }, dmg: 6, bonus: { dmg: 1 },
    text: "Lob a fireball where you aim: 6 to everything in the blast.",
  },
  blizzard: {
    name: "Blizzard", gem: "sapphire", type: "spell", cost: 4, once: true, windup: 1.3, art: "oBlizzard",
    shape: { kind: "circle", range: 7, r: 2.4 }, dmg: 3, zone: { dur: 4, every: 1, dmg: 2, slow: 0.5 },
    bonus: { dmg: 1 },
    text: "Freeze an area: 3 now, then 2 every second for 4 seconds. Foes inside move at half speed.",
  },
  summonEfreeti: {
    name: "Summon Efreeti", gem: "sapphire", type: "spell", cost: 4, once: true, windup: 1.4, art: "oFlameOrbs",
    shape: { kind: "circle", range: 3, r: 0.8 }, summon: { unit: "efreeti", count: 1 }, bonus: { unitDmg: 1 },
    text: "Summon an Efreeti for 25 seconds. It hurls 2-damage firebolts at foes.",
  },
  manaVial: {
    name: "Mana Vial", gem: "sapphire", type: "item", once: true, windup: 0.4, art: "oMoxiePool",
    shape: { kind: "self", r: 0 }, mana: 6, bonus: { mana: 2 },
    text: "Drink: get 6 mana back.",
  },
  // ---------------- DIAMOND — divine; no body stat, the cards carry it ----------------
  starblade: {
    name: "Starblade", gem: "diamond", type: "weapon", windup: 0.75, art: "oStarblade",
    shape: { kind: "arc", r: 1.9, deg: 130 }, dmg: 5, bonus: { dmg: 1 },
    text: "A shining sweep: 5 to everything in a wide arc.",
  },
  sunbeam: {
    name: "Sunbeam", gem: "diamond", type: "spell", cost: 4, windup: 1.2, art: "oHoly",
    shape: { kind: "circle", range: 7, r: 2.2 }, zone: { dur: 5, every: 1, dmg: 2, heal: 1 },
    bonus: { tick: 1 },
    text: "A lasting beam: every second for 5 seconds, 2 to foes and +1 HP to allies inside.",
  },
  holyLight: {
    name: "Holy Light", gem: "diamond", type: "spell", cost: 3, windup: 0.8, art: "oMediumRedVial",
    shape: { kind: "self", r: 2.4 }, heal: 6, bonus: { heal: 2 },
    text: "Heal you and every ally around you for 6.",
  },
  holyLance: {
    name: "Holy Lance", gem: "diamond", type: "spell", cost: 3, windup: 0.9, art: "oHolyLance",
    shape: { kind: "line", len: 6, w: 0.6 }, dmg: 5, selfHeal: 2, bonus: { dmg: 1 },
    text: "5 to every foe on the line, and heal yourself for 2.",
  },
  // ---------------- the fallback (not in the deck picker) ----------------
  // Owner's hex-tactics ruling, carried over: when every card you could hold is spent, you still have a
  // free weak Struggle. Foes get it too (parity).
  struggle: {
    name: "Struggle", gem: null, type: "weapon", windup: 0.6, art: "oAstralFist", hidden: true,
    shape: { kind: "arc", r: 1.2, deg: 90 }, dmg: 1, bonus: {},
    text: "Out of cards: a weak swing for 1.",
  },
};

// Summoned units (not wearable). Rats are the owner's spec; the Efreeti's numbers are FLAG.
export const UNITS = {
  rat:     { name: "Rat", art: "rat", hp: 1, speed: 3.4, r: 0.26, life: 7,
             attack: { kind: "bite", reach: 0.3, every: 1.0, dmg: 1 } },                // FLAG speed/reach/every/life
  efreeti: { name: "Efreeti", art: "efreeti", hp: 8, speed: 2.6, r: 0.36, life: 25,
             attack: { kind: "bolt", range: 7, every: 1.4, dmg: 2, speed: 9, w: 0.35, keepAway: 2 } }, // FLAG all
};

// BODIES — what a mimic can wear. `hp` is the body's level-1 base; levels and gems add on top. Foes wear
// the same bodies (at TUNING.foeHpMul, at their room's level) and play the cards in `deck`.
// `role` only steers a FOE's feet (owner's monster mix: swarms, casters, rangers, bruisers, boss):
//   swarm — rush in, nip, never wait for a turn · melee — walk up and swing · bruiser — slow, huge,
//   heavy hits · ranger / caster — keep their distance and sidestep while they wait · healer — hang back
//   with hurt friends · boss — the floor boss.  speedMul / r (token size) are FLAG.
export const BODIES = {
  // ---- starter choices (owner: Ruby / Emerald / Sapphire / Diamond) ----
  fatCat: {
    name: "Fat Cat", gem: "ruby", hp: 20, art: "fatCat", starter: true, role: "melee",
    passive: "hitRat", passiveText: "Whenever you're hit, summon a rat.",
    suggested: ["sword", "zweihander", "hatchet", "charge", "shield", "earthquake", "holyLight", "spear"],
    deck: ["sword", "zweihander"],
  },
  royalRat: {
    name: "Royal Rat", gem: "emerald", hp: 20, art: "royalRat", starter: true, role: "melee",
    passive: "playRat", passiveText: "Every card you play also summons a rat.",
    suggested: ["dagger", "spear", "bow", "javelin", "petRats", "arcaneOrb", "sword", "holyLight"],
    deck: ["dagger", "bow"],
  },
  lizardWizard: {
    name: "Lizard Wizard", gem: "sapphire", hp: 20, art: "lizardWizard", starter: true, role: "caster",
    passive: "spellDiscount", passiveText: "Spells cost 1 less mana (never below 1).",
    suggested: ["arcaneOrb", "lightningBolt", "fireball", "blizzard", "holyLight", "manaVial", "bow", "dagger"],
    deck: ["arcaneOrb", "lightningBolt"],
  },
  auditAngel: {
    name: "Audit Angel", gem: "diamond", hp: 20, art: "auditAngel", starter: true, role: "healer",
    passive: null, passiveText: "No passive.",
    suggested: ["starblade", "sunbeam", "holyLight", "holyLance", "sword", "dagger", "spear", "manaVial"],
    deck: ["holyLance", "holyLight"],
  },
  // ---- floor-1 foes (wearable once felled) — FLAG roster ----
  malevolentMouse: {
    name: "Malevolent Mouse", gem: "emerald", hp: 5, art: "mouse", r: 0.26, speedMul: 1.3, role: "swarm",
    passive: null, passiveText: "No passive. Comes in packs.",
    deck: ["bite"],
  },
  wearyWageslave: {
    name: "Weary Wageslave", gem: "ruby", hp: 18, art: "wageslave", role: "melee",
    passive: null, passiveText: "No passive.",
    deck: ["sword", "hatchet"],
  },
  centlessCentaur: {
    name: "Centless Centaur", gem: "emerald", hp: 16, art: "centaur", role: "ranger",
    passive: null, passiveText: "No passive. Keeps its distance.",
    deck: ["bow", "javelin"],
  },
  interestImp: {
    name: "Interest Imp", gem: "sapphire", hp: 14, art: "internImp", role: "caster",
    passive: null, passiveText: "No passive. Keeps its distance.",
    deck: ["arcaneOrb", "fireball", "manaVial"],
  },
  bondBehemoth: {
    name: "Bond Behemoth", gem: "ruby", hp: 40, art: "behemoth", r: 0.62, speedMul: 0.8, role: "bruiser",
    passive: null, passiveText: "No passive. Huge and slow; hits like a truck.",
    deck: ["zweihander", "charge", "earthquake"],
  },
  // ---- the boss ----
  marketCrashMinotaur: {
    name: "Market-Crash Minotaur", gem: "ruby", hp: 50, art: "minotaur", boss: true, r: 0.75, role: "boss",
    passive: null, passiveText: "Boss. Charges, sweeps, shakes the ground (twice) and calls a pack of mice at half health.",
    deck: ["charge", "zweihander", "earthquake", "charge", "zweihander", "earthquake"],
  },
};

// The fight rooms, in the order you reach them. `foes` are there for one player; each extra player
// adds the next body from `extra`. Owner's mix: swarms, casters and rangers, big bruisers, a boss. FLAG.
export const ENCOUNTERS = [
  { name: "A pack of mice",   foes: ["malevolentMouse", "malevolentMouse", "malevolentMouse", "malevolentMouse", "wearyWageslave"],
    extra: ["malevolentMouse", "malevolentMouse", "wearyWageslave"] },
  { name: "Ranged ambush",    foes: ["centlessCentaur", "interestImp", "wearyWageslave"],
    extra: ["centlessCentaur", "fatCat", "lizardWizard"] },
  { name: "The bruiser",      foes: ["bondBehemoth", "malevolentMouse", "malevolentMouse", "auditAngel"],
    extra: ["malevolentMouse", "interestImp", "royalRat"] },
  { name: "Everything at once", foes: ["bondBehemoth", "lizardWizard", "centlessCentaur", "malevolentMouse", "malevolentMouse"],
    extra: ["royalRat", "interestImp", "wearyWageslave"] },
];
export const BOSS = "marketCrashMinotaur";
// at half health the boss calls a pack: count + one per extra player. FLAG.
export const BOSS_ADDS = { at: 0.5, body: "malevolentMouse", count: 3, perPlayer: 1 };
// co-op colours, in join order (you are always marked by the chevron). FLAG.
export const PLAYER_COLORS = ["#3ee6c4", "#5fb8ff", "#c79bff", "#b6f05a"];
