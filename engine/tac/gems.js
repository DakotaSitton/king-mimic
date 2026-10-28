// King Mimic — hex tactics GEMS (owner 2026-10-28). Four card types and stats:
//   RUBY     (was Strength) — +1 = +1 damage on Ruby cards, plus health
//   EMERALD  (was Agility)  — +1 = +1 damage on Emerald cards, plus movement
//   SAPPHIRE (was Mind)     — +1 = +1 damage on Sapphire cards, plus mana (a per-floor pool;
//                             hitting 0 doesn't kill; most spells can be boosted by spending mana)
//   DIAMOND                 — boosts ONLY Diamond cards ("usually spells but divine")
// Owner examples: Dagger, Javelin and a Bow are Emerald.
//
// PLACEHOLDER TABLE — the owner assigns gems by hand; overwrite any line. Seeded by a rough rule:
// healing / holy cards → Diamond; KM ranged-typed magic → Sapphire; light weapons and physical
// cards that reach past 1 hex → Emerald; everything else (heavy weapons, guards) → Ruby.
export const GEMS = ["ruby", "emerald", "sapphire", "diamond"];
export const CARD_GEM = {
  // RUBY (36)
  oSword: "ruby",                 // Sword
  oHatchet: "ruby",               // Hatchet
  oSpear: "ruby",                 // Spear
  oMallet: "ruby",                // Mallet
  oZweihander: "ruby",            // Zweihänder
  oPowerUp: "ruby",               // Power Up
  dBuckler: "ruby",               // Tiny Buckler
  dShield: "ruby",                // Shield
  dShieldBash: "ruby",            // Shield Bash
  dThorns: "ruby",                // Thorns
  dStoneskin: "ruby",             // Stoneskin
  dGrit: "ruby",                  // Grit
  dTowerShield: "ruby",           // Tower Shield
  dLiquidMetal: "ruby",           // Liquid Metal Crown
  dPatience: "ruby",              // Patience
  oMoxiePool: "ruby",             // Moxie Pool
  oGlacius: "ruby",               // Glacius
  oSharpEdges: "ruby",            // Sharpened Edges
  coolShoes: "ruby",              // Cool Shoes
  oButcherCleaver: "ruby",        // Butcher's Cleaver
  oAnimatedBlade: "ruby",         // Animated Blade
  oGravityShield: "ruby",         // Gravity Greatshield
  oRainblow: "ruby",              // Rainblow Blade
  oWhip: "ruby",                  // Whip
  oCrossBlade: "ruby",            // Cross-Blade
  oContinentClub: "ruby",         // Continent-Club
  oLionLance: "ruby",             // Lion Lance
  oJaw: "ruby",                   // Jaw
  oButterflyKnife: "ruby",        // Butterfly Knife
  oMirrorMace: "ruby",            // Mirror Mace
  oMeteorMaul: "ruby",            // Meteor Maul
  oPiercer: "ruby",               // Piercer
  oStarblade: "ruby",             // Starblade
  oLightspeedLashwhip: "ruby",    // Lightspeed Lashwhip
  oGuillotwineAxe: "ruby",        // Guillotwine Axe
  oWarsEternity: "ruby",          // Wars Eternity
  // EMERALD (10)
  oBow: "emerald",                // Bow
  oDagger: "emerald",             // Dagger
  oJavelin: "emerald",            // Javelin
  oTwinUchis: "emerald",          // Twin Uchis
  oComboBlade: "emerald",         // Combo Blade
  dSawShield: "emerald",          // Saw Shield
  oOmnislash: "emerald",          // Omnislash
  oRepeatXbow: "emerald",         // Repeating Crossbow
  oTriblade: "emerald",           // Triblade
  oGravitySword: "emerald",       // Gravity Greatsword
  // SAPPHIRE (28)
  oFire: "sapphire",              // Fire
  oIce: "sapphire",               // Ice
  oLightning: "sapphire",         // Lightning
  oArcane: "sapphire",            // Arcane
  oDark: "sapphire",              // Dark
  oWind: "sapphire",              // Wind
  oForce: "sapphire",             // Force
  oMeteors: "sapphire",           // Meteors
  oEarth: "sapphire",             // Earth
  oBile: "sapphire",              // Bile
  oAstralFist: "sapphire",        // Astral Fist
  oFlameOrbs: "sapphire",         // Flame Orbs
  oLeechstorm: "sapphire",        // Leechstorm
  oMiasmicWave: "sapphire",       // Miasmic Wave
  oLightningLance: "sapphire",    // Lightning Lance
  oLifedrain: "sapphire",         // Lifedrain
  oHex: "sapphire",               // Hex
  oFlameSteps: "sapphire",        // Flame Steps
  oFlameStrike: "sapphire",       // Flame Strike
  oArcaneStorm: "sapphire",       // Arcane Storm
  oEarthquake: "sapphire",        // Earthquake
  oDoomWhisper: "sapphire",       // Doom Whisper
  oBlizzard: "sapphire",          // Blizzard
  dTaunt: "sapphire",             // Taunt
  oPetLeech: "sapphire",          // Pet Leech
  oPowerWordGun: "sapphire",      // Power Word: Gun
  oBlackHole: "sapphire",         // Black Hole
  oBansheeWail: "sapphire",       // Banshee Wail
  // DIAMOND (7)
  oHoly: "diamond",               // Holy
  oHolyLance: "diamond",          // Holy Lance
  dHeartGuard: "diamond",         // Heart Guard
  dTrollskin: "diamond",          // Trollskin Tiara
  oRedVial: "diamond",            // Red Vial
  oMediumRedVial: "diamond",      // Medium Red Vial
  oSageMode: "diamond",           // Sage Mode
};
export const gemOf = (key) => CARD_GEM[key] ?? "ruby";

// What a gem point does (owner: "+1 in that stat granting all cards of that color 1 damage on top of:
// health for strength, movement for agility, and mana for mind"; Diamond boosts only Diamond cards).
// The "on top of" amounts are placeholders.
export const RUBY_HP_PER_POINT = 2;        // FLAG
export const EMERALD_SPEED_PER_POINT = 1;  // FLAG: +1 hex per moxie of movement
export const SAPPHIRE_MANA_PER_POINT = 2;  // FLAG: max mana per point (mana refills each floor)
export const MANA_BOOST_MAX = 3;           // FLAG: most mana one spell can take; each mana = +1 to its effect
export const LEVEL_FLAT_HP = 2;            // owner (lane game): "Every level now gives 2 hp no matter what."

// PLACEHOLDER base gems per body (owner: "multiple stat differences" between bodies). Seeded as 3
// points split by the gems of the cards each body's draft decks usually hold; overwrite any line.
export const BODY_GEMS = {
  rookie: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },                   // Rookie Mimic
  fatCat: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },                   // Fat Cat
  royalRat: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },                 // Royal Rat
  paidPiper: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },                // Paid Piper
  tollTroll: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },                // Toll Troll
  centlessCentaur: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },          // Centless Centaur
  malevolentMouse: { ruby: 1, emerald: 1, sapphire: 1, diamond: 0 },          // Malevolent Mouse
  rentSeekingRuneblade: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },     // Rent-Seeking Runeblade
  marketCrashMinotaur: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },      // Market-Crash Minotaur
  interestImp: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },              // Interest Imp
  vengefulVampire: { ruby: 2, emerald: 1, sapphire: 0, diamond: 0 },          // Vengeful Vampire
  lizardWizard: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },             // Lizard Wizard
  bondBehemoth: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },             // Bond Behemoth
  goldenGolem: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },              // Golden Golem
  cryptoChimera: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },            // Crypto-Chimera
  wearyWageslave: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },           // Weary Wageslave
  bribedBishop: { ruby: 1, emerald: 1, sapphire: 1, diamond: 0 },             // Bribed Bishop
  chequeCherub: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },             // Cheque Cherub
  pyramidHead: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },              // Pyramid-Scheme Head
  pennyPixie: { ruby: 2, emerald: 0, sapphire: 0, diamond: 1 },               // Penny-Pinching Pixie
  econElemental: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },            // Economy Elemental
  moneymancer: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },              // Moneymancer
  warewolf: { ruby: 2, emerald: 1, sapphire: 0, diamond: 0 },                 // Warewolf
  killionaire: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },              // Killionaire
  basilisk: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },                 // Bankrupt Basilisk
  fundjin: { ruby: 1, emerald: 1, sapphire: 1, diamond: 0 },                  // Fundjin & Raising-Profitsjin
  auditAngel: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },               // Audit Angel
  medusa: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },                   // Mid-Management Medusa
  depressionDemon: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },          // Depression Demon
  bonelord: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },                 // Bookie Bonelord
  debtDragon: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },               // Debt Dragon
  neptune: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },                  // Nepotistic Neptune
  atlas: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },                    // Atlas, Shrugging
  wanderCastle: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },             // Wandering Castle
  sphinx: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },                   // Stockbroking Sphinx
  affluenceAnubis: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },          // Affluence Anubis
  timeshareTyrant: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },          // Timeshare Tyrant
  oligarchyOoze: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },            // Oligarchy Ooze
  gdpGiant: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },                 // GDP Giant
  hedgefundKnight: { ruby: 2, emerald: 1, sapphire: 0, diamond: 0 },          // Hedgefund Knight
  psychicVeteran: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },           // Veteran of the Psychic Wars
  onePercenterCyclops: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },      // Credit-Cursed Cyclops
  bankruptBarghest: { ruby: 2, emerald: 1, sapphire: 0, diamond: 0 },         // Bankrupt Barghest
  recessionRevenant: { ruby: 2, emerald: 0, sapphire: 1, diamond: 0 },        // Recession Revenant
  shortscerer: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },              // Shortscerer
  callingCaltist: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },           // Calling Caltist
  salesSage: { ruby: 1, emerald: 0, sapphire: 2, diamond: 0 },                // Sales Sage
};
export const bodyGems = (bodyKey) => BODY_GEMS[bodyKey] ?? { ruby: 1, emerald: 1, sapphire: 1, diamond: 0 };
