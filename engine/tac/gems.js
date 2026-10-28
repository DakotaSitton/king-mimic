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
