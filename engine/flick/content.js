// King Mimic — FLICK mode content: the demo's whole card pool, body pool and tuning in ONE table.
//
// Owner brief (2026-10-29): slow-paced REAL-TIME deckbuilder; move stick on the left, a 3-card hand on
// the right; tap a card → an aim reticle from your mimic shows exactly what it will hit; flick to aim.
// Foes show their next card above their heads and the same reticle while they wind up. A floor is rooms
// and hallways ending in a boss. Level-1 player picks a body and a starting deck.
//
// OWNER-STATED (canon):
//   • Four gems. Ruby = +HP, Emerald = +movement speed, Sapphire = +mana, Diamond = no stat ("the cards
//     make up for it"). A body's gem gives a one-increment bonus to cards of the same gem, usually damage.
//   • Cards wind up before they land; bigger weapons take longer and cover more (Zweihänder vs Sword);
//     Spear is a thin hurtbox.
//   • Card names: Sword, Spear, Hatchet, Zweihänder, Lightning Bolt, Fireball, Blizzard, Arcane Orb,
//     Summon Efreeti, Sunbeam (heals allies, hurts foes, persistent area) — "etc, keep going".
//   • Royal Rat: every card played also summons a rat (1 HP, aggros, quick 1-damage bite).
//     Fat Cat: being attacked summons a rat. Lizard Wizard: spell cards are cheaper.
//
// EVERYTHING ELSE HERE IS A PLACEHOLDER (FLAG) — costs, windups, sizes, damage, HP, which gem each card
// and body carries, the extra cards (Dagger, Bow, Javelin, Charge, Shield, Earthquake, Pet Rats, Holy
// Light, Holy Lance), the foe roster and the boss. Dakota edits these by hand; the engine reads only
// this file, so changing a number here changes the game.
//
// Units: 1 = one floor tile. Times in seconds. Angles in degrees.

export const GEMS = {
  ruby:     { name: "Ruby",     color: "#ff4d6d", stat: "+6 max HP" },                        // FLAG amounts
  emerald:  { name: "Emerald",  color: "#3ddc84", stat: "+20% move speed" },
  sapphire: { name: "Sapphire", color: "#4d9bff", stat: "+3 max mana, +25% mana regen" },
  diamond:  { name: "Diamond",  color: "#d8f0ff", stat: "No stat — Diamond cards are stronger" },
};
export const GEM_STATS = {                                                                  // FLAG
  ruby: { hp: 6 }, emerald: { speed: 0.2 }, sapphire: { mana: 3, regen: 0.25 }, diamond: {},
};

export const TUNING = {                                                                     // all FLAG
  speed: 3.0,            // tiles / second, before gems
  mana: 8,               // max mana, before gems
  regen: 0.9,            // mana / second, before gems
  startMana: 4,
  radius: 0.38,          // token radius
  castMoveMul: 0.45,     // you can drift while winding up
  hand: 3,
  deckSize: 8,           // starting deck = 8 different cards
  roomClearHeal: 4,      // HP back when a room is cleared
  foeHpMul: 0.5,         // floor-1 foes wear their body at half HP (the hex branch's level-0 idea)
  foeSpeedMul: 0.75,
  foeRegenMul: 0.7,
  foeWindupMul: 1.25,    // foes telegraph longer than you do …
  foeWindupAdd: 0.35,    // … and never less than this, so a Dagger is still dodgeable on a phone
  foeCastGap: 0.8,       // seconds a foe rests between cards
  ratCap: 3,             // living rats per owner (oldest crumbles)
  fatCatCooldown: 1.5,   // Fat Cat can spawn at most one rat per this many seconds
};

// shape kinds — what the reticle draws and what gets hit:
//   arc   {r, deg}        swing around the caster, follows the caster while winding up
//   line  {len, w}        instant thrust/bolt from the caster, hits everything in it, stops at walls
//   shot  {range, w, speed} projectile, hits the FIRST foe, stops at walls
//   circle{range, r}      lands at the aimed point (drag farther = farther, up to range)
//   self  {r}             ring around the caster
//   dash  {len, w}        the caster charges along the aim, hitting everything passed
// effects: dmg, heal (allies), shield (self), slow {pct, dur}, zone {dur, every, dmg, heal, slow},
//          summon {unit, count}
// bonus: what a matching-gem body adds — the "one increment".
export const CARDS = {
  // ---------------- RUBY — strength ----------------
  sword: {
    name: "Sword", gem: "ruby", type: "weapon", cost: 2, windup: 0.4, art: "oSword",
    shape: { kind: "arc", r: 1.7, deg: 110 }, dmg: 3, bonus: { dmg: 1 },
    text: "Slash the arc in front of you for 3.",
  },
  hatchet: {
    name: "Hatchet", gem: "ruby", type: "weapon", cost: 2, windup: 0.35, art: "oHatchet",
    shape: { kind: "shot", range: 5, w: 0.45, speed: 10 }, dmg: 3, bonus: { dmg: 1 },
    text: "Throw a hatchet: 3 to the first foe it meets.",
  },
  zweihander: {
    name: "Zweihänder", gem: "ruby", type: "weapon", cost: 4, windup: 1.1, art: "oZweihander",
    shape: { kind: "arc", r: 2.6, deg: 200 }, dmg: 7, bonus: { dmg: 1 },
    text: "Slow, huge sweep: 7 to everything in a wide arc.",
  },
  charge: {
    name: "Charge", gem: "ruby", type: "weapon", cost: 3, windup: 0.6, art: "oPileOn",
    shape: { kind: "dash", len: 4.5, w: 1.0 }, dmg: 4, bonus: { dmg: 1 },
    text: "Charge forward, hitting everything you pass for 4.",
  },
  shield: {
    name: "Shield", gem: "ruby", type: "weapon", cost: 2, windup: 0.2, art: "dShield",
    shape: { kind: "self", r: 0 }, shield: 4, bonus: { shield: 1 },
    text: "Gain a 4-point shield.",
  },
  earthquake: {
    name: "Earthquake", gem: "ruby", type: "spell", cost: 4, windup: 1.0, art: "oEarthquake",
    shape: { kind: "self", r: 2.4 }, dmg: 4, bonus: { dmg: 1 },
    text: "Slam the ground: 4 to everything around you.",
  },
  // ---------------- EMERALD — agility ----------------
  dagger: {
    name: "Dagger", gem: "emerald", type: "weapon", cost: 1, windup: 0.15, art: "oDagger",
    shape: { kind: "arc", r: 1.25, deg: 70 }, dmg: 2, bonus: { dmg: 1 },
    text: "Quick stab for 2.",
  },
  spear: {
    name: "Spear", gem: "emerald", type: "weapon", cost: 2, windup: 0.5, art: "oSpear",
    shape: { kind: "line", len: 3.3, w: 0.45 }, dmg: 4, bonus: { dmg: 1 },
    text: "Long thin thrust: 4 to everything on the line.",
  },
  bow: {
    name: "Bow", gem: "emerald", type: "weapon", cost: 2, windup: 0.6, art: "oBow",
    shape: { kind: "shot", range: 9, w: 0.3, speed: 15 }, dmg: 3, bonus: { dmg: 1 },
    text: "Loose an arrow: 3 to the first foe it meets.",
  },
  javelin: {
    name: "Javelin", gem: "emerald", type: "weapon", cost: 3, windup: 0.8, art: "oJavelin",
    shape: { kind: "line", len: 7, w: 0.4 }, dmg: 4, bonus: { dmg: 1 },
    text: "Hurl a javelin: 4 to every foe along a long line.",
  },
  petRats: {
    name: "Pet Rats", gem: "emerald", type: "spell", cost: 2, windup: 0.3, art: "oPetRats",
    shape: { kind: "circle", range: 2.5, r: 0.7 }, summon: { unit: "rat", count: 2 }, bonus: { count: 1 },
    text: "Summon 2 rats. Rats have 1 HP, draw foes' attention and bite for 1.",
  },
  // ---------------- SAPPHIRE — mind / mana ----------------
  arcaneOrb: {
    name: "Arcane Orb", gem: "sapphire", type: "spell", cost: 1, windup: 0.3, art: "oArcane",
    shape: { kind: "shot", range: 7, w: 0.5, speed: 6 }, dmg: 2, bonus: { dmg: 1 },
    text: "A slow orb: 2 to the first foe it meets.",
  },
  lightningBolt: {
    name: "Lightning Bolt", gem: "sapphire", type: "spell", cost: 3, windup: 0.5, art: "oLightning",
    shape: { kind: "line", len: 7, w: 0.7 }, dmg: 4, bonus: { dmg: 1 },
    text: "A bolt that pierces: 4 to every foe on the line.",
  },
  fireball: {
    name: "Fireball", gem: "sapphire", type: "spell", cost: 3, windup: 0.8, art: "oFire",
    shape: { kind: "circle", range: 6, r: 1.4 }, dmg: 5, bonus: { dmg: 1 },
    text: "Lob a fireball where you aim: 5 to everything in the blast.",
  },
  blizzard: {
    name: "Blizzard", gem: "sapphire", type: "spell", cost: 4, windup: 0.9, art: "oBlizzard",
    shape: { kind: "circle", range: 6, r: 2.0 }, dmg: 2, zone: { dur: 3, every: 1, dmg: 1, slow: 0.5 },
    bonus: { dmg: 1 },
    text: "Freeze an area: 2 now, then 1 every second for 3 seconds. Foes inside move at half speed.",
  },
  summonEfreeti: {
    name: "Summon Efreeti", gem: "sapphire", type: "spell", cost: 5, windup: 1.0, art: "oFlameOrbs",
    shape: { kind: "circle", range: 3, r: 0.8 }, summon: { unit: "efreeti", count: 1 }, bonus: { unitDmg: 1 },
    text: "Summon an Efreeti for 12 seconds. It hurls 2-damage firebolts at foes.",
  },
  // ---------------- DIAMOND — divine; no body stat, the cards carry it ----------------
  starblade: {
    name: "Starblade", gem: "diamond", type: "weapon", cost: 2, windup: 0.45, art: "oStarblade",
    shape: { kind: "arc", r: 1.9, deg: 130 }, dmg: 4, bonus: { dmg: 1 },
    text: "A shining sweep: 4 to everything in a wide arc.",
  },
  sunbeam: {
    name: "Sunbeam", gem: "diamond", type: "spell", cost: 4, windup: 0.8, art: "oHoly",
    shape: { kind: "circle", range: 6, r: 1.8 }, zone: { dur: 5, every: 1, dmg: 1, heal: 1 },
    bonus: { tick: 1 },
    text: "A lasting beam: every second for 5 seconds, 1 to foes and +1 HP to allies inside.",
  },
  holyLight: {
    name: "Holy Light", gem: "diamond", type: "spell", cost: 2, windup: 0.4, art: "oMediumRedVial",
    shape: { kind: "self", r: 2.0 }, heal: 4, bonus: { heal: 1 },
    text: "Heal you and every ally around you for 4.",
  },
  holyLance: {
    name: "Holy Lance", gem: "diamond", type: "spell", cost: 3, windup: 0.6, art: "oHolyLance",
    shape: { kind: "line", len: 5, w: 0.6 }, dmg: 4, selfHeal: 2, bonus: { dmg: 1 },
    text: "4 to every foe on the line, and heal yourself for 2.",
  },
};

// Summoned units (not wearable). Rats are the owner's spec; the Efreeti's numbers are FLAG.
export const UNITS = {
  rat:     { name: "Rat", art: "rat", hp: 1, speed: 3.4, r: 0.26, life: 7,
             attack: { kind: "bite", reach: 0.3, every: 1.0, dmg: 1 } },                // FLAG speed/reach/every/life
  efreeti: { name: "Efreeti", art: "efreeti", hp: 6, speed: 2.6, r: 0.36, life: 12,
             attack: { kind: "bolt", range: 6, every: 1.5, dmg: 2, speed: 9 } },          // FLAG all
};

// BODIES — what a mimic can wear. `hp` is the body's base; gems add on top. Foes wear the same bodies
// (at TUNING.foeHpMul) and play the cards in `deck` — the same cards you can loot.
export const BODIES = {
  // ---- starter choices (owner: Ruby / Emerald / Sapphire / Diamond) ----
  fatCat: {
    name: "Fat Cat", gem: "ruby", hp: 20, art: "fatCat", starter: true,
    passive: "hitRat", passiveText: "Whenever you're hit, summon a rat.",
    suggested: ["sword", "zweihander", "shield", "hatchet", "charge", "holyLight", "petRats", "spear"],
    deck: ["sword", "zweihander"],
  },
  royalRat: {
    name: "Royal Rat", gem: "emerald", hp: 20, art: "royalRat", starter: true,
    passive: "playRat", passiveText: "Every card you play also summons a rat.",
    suggested: ["dagger", "spear", "bow", "javelin", "petRats", "arcaneOrb", "sword", "holyLight"],
    deck: ["dagger", "bow"],
  },
  lizardWizard: {
    name: "Lizard Wizard", gem: "sapphire", hp: 20, art: "lizardWizard", starter: true,
    passive: "spellDiscount", passiveText: "Spell cards cost 1 less.",
    suggested: ["arcaneOrb", "lightningBolt", "fireball", "blizzard", "summonEfreeti", "holyLight", "sword", "bow"],
    deck: ["arcaneOrb", "lightningBolt"],
  },
  auditAngel: {
    name: "Audit Angel", gem: "diamond", hp: 20, art: "auditAngel", starter: true,
    passive: null, passiveText: "No passive.",
    suggested: ["starblade", "sunbeam", "holyLight", "holyLance", "spear", "arcaneOrb", "fireball", "shield"],
    deck: ["holyLance", "holyLight"],
  },
  // ---- floor-1 foes (wearable once felled) — FLAG roster ----
  wearyWageslave: {
    name: "Weary Wageslave", gem: "ruby", hp: 18, art: "wageslave",
    passive: null, passiveText: "No passive.",
    deck: ["sword", "hatchet"],
  },
  centlessCentaur: {
    name: "Centless Centaur", gem: "emerald", hp: 18, art: "centaur",
    passive: null, passiveText: "No passive.",
    deck: ["spear", "bow"],
  },
  interestImp: {
    name: "Interest Imp", gem: "sapphire", hp: 16, art: "internImp",
    passive: null, passiveText: "No passive.",
    deck: ["arcaneOrb", "fireball"],
  },
  // ---- the boss ----
  marketCrashMinotaur: {
    name: "Market-Crash Minotaur", gem: "ruby", hp: 44, art: "minotaur", boss: true, r: 0.7, regenMul: 1.6,
    passive: null, passiveText: "Boss. Charges, sweeps, and shakes the ground.",
    deck: ["charge", "zweihander", "earthquake", "zweihander"],
  },
};

// Which bodies populate floor-1 fight rooms (each room draws from this list). FLAG.
export const FOE_POOL = ["wearyWageslave", "centlessCentaur", "interestImp", "fatCat", "royalRat", "lizardWizard", "auditAngel"];
// Foes per fight room, in order of the rooms you reach. FLAG.
export const ROOM_FOES = [2, 2, 3, 3];
export const BOSS = "marketCrashMinotaur";
