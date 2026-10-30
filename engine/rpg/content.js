// King Mimic — RPG CRAWLER content: every body, weapon, deck card, action, foe and floor in ONE table.
//
// Owner brief (2026-10-29, late night): "a co-op pokemon mystery dungeon but now real-time style big damn
// rpg." His rules (CANON):
//   • BODIES have a unique passive that drastically changes how they play. EVERYTHING ELSE IS A CARD.
//   • Cards live in DECKS. Players have DECK SLOTS EQUAL TO THEIR LEVEL. Deck cards dictate everything
//     combat-wise: movement, size, damage to melee / spells / ranged, armor, shield at the start of rooms…
//   • A MAIN WEAPON with its own swing speed and PUSHBACK — sword and shield, greatsword, spear, bow,
//     crossbow, fire magic, arcane magic, ice magic, blood magic.
//   • MINOR ACTION cards — unique spells and abilities.
//   • Kept from FLICK (core locked 10/29): the flick-aim + charge-up verb, foes telegraphing the same way,
//     co-op for up to four.
//
// INTERPRETATION CALLS (mine — his to overrule, each is one edit here):
//   • A body gives ONLY its passive. Everyone starts from the same base health / speed / size (TUNING);
//     the deck changes those. Foes are built the same way (body + weapon + deck + actions) — full parity.
//   • Passives are HIS existing King Mimic passives (engine/bodies.js), translated to real time.
//     Audit Angel, Vengeful Vampire, Golden Golem etc. keep his wording where it still makes sense.
//   • Minor actions sit in 2 ACTION SLOTS of their own (not deck slots) and run on COOLDOWNS. No mana, no
//     gems — those were FLICK's; "everything else is a card" replaced them.
//   • Weapons are free and endless: their wind-up + recovery IS the swing speed.
//   • Pushback: every hit shoves by `push` tiles (bigger bodies budge less). A shove of `staggerAt` or more
//     breaks the target's wind-up; slamming someone into a wall hurts and staggers.
//   • Mystery-dungeon floors: rooms + halls, foes asleep until you come close, loot on the floor and from
//     the fallen, STAIRS down; the last floor is a boss den. Party XP is shared (one level for everyone).
//   • Mimic hook kept: a fallen foe sometimes leaves its BODY — step on it and Wear it to take its passive.
//
// EVERY NUMBER, CARD NAME, CARD TEXT AND FOE/FLOOR CHOICE NOT LISTED ABOVE IS A PLACEHOLDER (FLAG).
// Dakota edits these by hand; the engine reads only this file.
// Units: 1 = one floor tile. Times in seconds. Angles in degrees.

export const TUNING = {                                                                     // all FLAG
  // ---- everyone's base (bodies add nothing; deck cards change these) ----
  baseHp: 24, hpPerLevel: 2, speed: 3.0, radius: 0.38,
  castMoveMul: 0.5,      // you can drift while winding up
  actionSlots: 2,        // minor actions: their own slots
  levelXp: [0, 4, 10, 18, 28, 40, 55, 72, 92],   // party XP to reach level 1, 2, 3, … (a felled foe gives its level)
  maxLevel: 9,           // = most deck slots
  bagMax: 16,
  shieldCapMul: 1,       // most shield anyone can hold = this × max health
  shieldFade: 8,         // shield lost per second while no foe is awake (shields are for fights)
  // ---- pushback ----
  pushDecay: 11,         // how fast a shove dies out (higher = snappier)
  staggerAt: 1.3,        // a shove at least this long breaks a wind-up …
  stunTime: 0.35,        // … and leaves the target reeling this long
  slamSpeed: 7,          // knocked into a wall at this speed or faster = a slam
  slamDmg: 2,
  // ---- foes ----
  foeHpMul: 0.6,         // foes wear their deck at reduced health (readability + early floors stay gentle)
  foeSpeedMul: 0.8,
  foeWindupMul: 1.25,    // foes telegraph longer than you do …
  foeWindupAdd: 0.3,     // … and never less than this
  foeCastGap: 0.8,       // seconds a foe rests between swings
  wakeRange: 5.5,        // a sleeping foe wakes when someone comes this close in its sight (or enters its room)
  dropCard: 0.35,        // chance a felled foe drops one of its cards …
  dropBody: 0.25,        // … and (non-swarm) leaves its body to wear
  // ---- passives ----
  ratCap: 3, fatCatCooldown: 1.5, angelEvery: 6, angelHeal: 6, angelRange: 6,
  rageEvery: 3, interestEvery: 4, trollEvery: 4, trollHeal: 2, echoEvery: 2, echoDmg: 1,
  mouseRage: 2, mouseRageTime: 6, poisonDps: 1, poisonTime: 3, goreEvery: 3, goreDmg: 1, goreRange: 2.2,
  haste: 0.3,            // Lizard Wizard / Penny Pixie: that tag winds up and cools down this much faster
  // ---- summons ----
  dashSpeed: 22, summonAggro: 10, summonHeel: 1.6, summonLeash: 12,
  // ---- floors ----
  fullHealOnFloor: true, // a new floor stands everyone up at full health
  // ---- co-op (up to 4) ----
  maxPlayers: 4, reviveRange: 1.5, reviveTime: 2.5, reviveHp: 0.35,
  coopFoeHp: 0.35, coopBossHp: 0.75, foeTokens: 1, spreadAggro: 2.5, retarget: 1.4,
};

// ------------------------------------------------------------------------------------------------
// CARDS. type: weapon (your main attack) · deck (passive stat card, one per deck slot) · action (minor
// action: a spell or ability on a cooldown). tag: melee / ranged / spell — what deck cards boost or resist.
//
// shape kinds (what the reticle draws and what gets hit):
//   arc {r, deg} swing around you · line {len, w} thrust/bolt, hits all on it, stops at walls
//   shot {range, w, speed, pierce?, homing?} projectile, first foe it meets (pierce = all of them)
//   circle {range, r} lands where you aim · self {r} ring around you · dash {len, w} you charge along it
// weapon/action fields: windup, recover (weapon: lag after the swing), cooldown (action), dmg, push,
//   burn {dps, time}, slow {pct, time}, hpCost, healOnHit, block (sword and shield: share of damage taken
//   from the front while not swinging), heal, shield, summon {unit, count}, zone {dur, every, dmg, heal},
//   iframes (dash: untouchable while moving).
// deck `mods`: hp, speed, size, meleeDmg / rangedDmg / spellDmg / allDmg (+share), armor (−N per hit),
//   meleeResist / rangedResist / spellResist (−share taken), roomShield (shield when a fight starts),
//   swing (wind-ups this share faster), push (+share pushback), reach (+share reach/range), cooldown
//   (actions recharge this share faster), lifesteal (share of damage healed), thorns (melee attackers
//   take N), poise (shoves move you this share less).
// ------------------------------------------------------------------------------------------------
export const CARDS = {
  // ======================= WEAPONS (owner's list) =======================
  swordShield: {
    name: "Sword and Shield", type: "weapon", tag: "melee", art: "oSword",
    windup: 0.35, recover: 0.2, shape: { kind: "arc", r: 1.5, deg: 100 }, dmg: 3, push: 0.6, block: 0.5,
    text: "Quick slash for 3. While you aren't swinging, your shield takes half of every hit from the front.",
  },
  greatsword: {
    name: "Greatsword", type: "weapon", tag: "melee", art: "oZweihander",
    windup: 1.1, recover: 0.45, shape: { kind: "arc", r: 2.4, deg: 200 }, dmg: 9, push: 2.2,
    text: "Long wind-up, huge sweep: 9 to everything around the front, and sends them flying.",
  },
  spear: {
    name: "Spear", type: "weapon", tag: "melee", art: "oSpear",
    windup: 0.5, recover: 0.3, shape: { kind: "line", len: 3.3, w: 0.5 }, dmg: 4, push: 1.3,
    text: "Long thin thrust: 4 to everything on the line, pushing them back to the tip.",
  },
  bow: {
    name: "Bow", type: "weapon", tag: "ranged", art: "oBow",
    windup: 0.45, recover: 0.25, shape: { kind: "shot", range: 9, w: 0.3, speed: 17 }, dmg: 3, push: 0.3,
    text: "Loose an arrow: 3 to the first foe it meets.",
  },
  crossbow: {
    name: "Crossbow", type: "weapon", tag: "ranged", art: "oRepeatXbow",
    windup: 0.9, recover: 0.6, shape: { kind: "shot", range: 10, w: 0.35, speed: 26, pierce: true }, dmg: 6, push: 1.6,
    text: "Slow to load. The bolt punches through every foe in its path for 6 and knocks them back.",
  },
  fireMagic: {
    name: "Fire Magic", type: "weapon", tag: "spell", art: "oFire",
    windup: 0.8, recover: 0.4, shape: { kind: "circle", range: 6, r: 1.3 }, dmg: 4, push: 1.0, burn: { dps: 1, time: 3 },
    text: "Lob fire where you aim: 4 to everything in the blast, blown outward, and they burn for 1 a second.",
  },
  arcaneMagic: {
    name: "Arcane Magic", type: "weapon", tag: "spell", art: "oArcane",
    windup: 0.3, recover: 0.2, shape: { kind: "shot", range: 8, w: 0.45, speed: 11, homing: 4 }, dmg: 2, push: 0.2,
    text: "Fast seeking bolts: 2 to the first foe, curving toward whatever you aimed near.",
  },
  iceMagic: {
    name: "Ice Magic", type: "weapon", tag: "spell", art: "oIce",
    windup: 0.6, recover: 0.35, shape: { kind: "arc", r: 3.2, deg: 50 }, dmg: 3, push: 0.4, slow: { pct: 0.5, time: 2 },
    text: "A cone of frost: 3 to everything in it, and they move at half speed for 2 seconds.",
  },
  bloodMagic: {
    name: "Blood Magic", type: "weapon", tag: "spell", art: "oLifedrain",
    windup: 0.5, recover: 0.3, shape: { kind: "line", len: 5, w: 0.8 }, dmg: 7, push: 0.8, hpCost: 2, healOnHit: 1,
    text: "Pay 2 health: a lance of blood for 7 to every foe on the line. Heal 1 for each foe it hits.",
  },
  // natural weapons — the floor's creatures fight with these (a mimic wearing their loot can too)
  bite: {
    name: "Bite", type: "weapon", tag: "melee", art: "tBite", natural: true,
    windup: 0.25, recover: 0.25, shape: { kind: "arc", r: 0.95, deg: 80 }, dmg: 1, push: 0.15,
    text: "Nip whatever is in front of you for 1.",
  },

  // ======================= DECK CARDS (passive; one per deck slot) =======================
  vigor:      { name: "Vigor",       type: "deck", art: "dHeartGuard",  mods: { hp: 8 },                    text: "+8 health." },
  giant:      { name: "Giant",       type: "deck", art: "oGiantsBelt",  mods: { size: 0.3, hp: 6, push: 0.25, poise: 0.3, speed: -0.1 },
                text: "30% bigger: +6 health, +25% pushback, shoves move you 30% less, 10% slower." },
  tiny:       { name: "Tiny",        type: "deck", art: "oWeakness",    mods: { size: -0.35, hp: -14, speed: 0.25 },
                text: "35% smaller and 25% faster, but −14 health." },
  swift:      { name: "Swift",       type: "deck", art: "coolShoes",    mods: { speed: 0.2 },               text: "Move 20% faster." },
  whetstone:  { name: "Whetstone",   type: "deck", art: "oSharpEdges",  mods: { meleeDmg: 0.3 },            text: "+30% melee damage." },
  fletching:  { name: "Fletching",   type: "deck", art: "oPiercer",     mods: { rangedDmg: 0.3 },           text: "+30% ranged damage." },
  focus:      { name: "Focus",       type: "deck", art: "oStudy",       mods: { spellDmg: 0.3 },            text: "+30% spell damage." },
  ironSkin:   { name: "Iron Skin",   type: "deck", art: "dStoneskin",   mods: { armor: 1 },                 text: "Take 1 less from every hit (never below 1)." },
  ward:       { name: "Ward",        type: "deck", art: "dShield",      mods: { roomShield: 6 },            text: "Start every fight with a 6-point shield." },
  quickHands: { name: "Quick Hands", type: "deck", art: "oHaste",       mods: { swing: 0.2 },               text: "Your weapon winds up 20% faster." },
  heavyHands: { name: "Heavy Hands", type: "deck", art: "oMallet",      mods: { push: 0.6 },                text: "+60% pushback." },
  longArm:    { name: "Long Arm",    type: "deck", art: "oMastersArm",  mods: { reach: 0.25 },              text: "+25% weapon reach and range." },
  clockwork:  { name: "Clockwork",   type: "deck", art: "oZaWarudo",    mods: { cooldown: 0.25 },           text: "Actions recharge 25% faster." },
  leech:      { name: "Leech",       type: "deck", art: "oPetLeech",    mods: { lifesteal: 0.15 },          text: "Heal 15% of the damage you deal." },
  thorns:     { name: "Thorns",      type: "deck", art: "dThorns",      mods: { thorns: 2 },                text: "Anything that hits you in melee takes 2." },
  spellward:  { name: "Spellward",   type: "deck", art: "oMirrorShield",mods: { spellResist: 0.3 },         text: "Take 30% less from spells." },
  arrowguard: { name: "Arrowguard",  type: "deck", art: "dTowerShield", mods: { rangedResist: 0.3 },        text: "Take 30% less from ranged." },
  anchor:     { name: "Anchor",      type: "deck", art: "dPatience",    mods: { poise: 0.6 },               text: "Shoves move you 60% less." },
  brute:      { name: "Brute",       type: "deck", art: "oBerserker",   mods: { allDmg: 0.15, hp: 4 },      text: "+15% damage of every kind, +4 health." },

  // ======================= MINOR ACTIONS (cooldowns) =======================
  dodgeRoll: {
    name: "Dodge Roll", type: "action", tag: "melee", art: "oWind", windup: 0.08, cooldown: 4,
    shape: { kind: "dash", len: 3, w: 0.6 }, iframes: true,
    text: "Roll 3 tiles. Nothing can touch you while you roll.",
  },
  charge: {
    name: "Charge", type: "action", tag: "melee", art: "oPileOn", windup: 0.6, cooldown: 7,
    shape: { kind: "dash", len: 4.5, w: 1.0 }, dmg: 4, push: 2.0,
    text: "Charge forward: 4 to everything you pass, bowling them over.",
  },
  warStomp: {
    name: "War Stomp", type: "action", tag: "melee", art: "oEarth", windup: 0.45, cooldown: 8,
    shape: { kind: "self", r: 2.0 }, dmg: 2, push: 2.4,
    text: "Stomp: 2 to everything around you and shove it all away.",
  },
  throwingKnife: {
    name: "Throwing Knife", type: "action", tag: "ranged", art: "oDagger", windup: 0.2, cooldown: 2.5,
    shape: { kind: "shot", range: 7, w: 0.3, speed: 20 }, dmg: 3, push: 0.3,
    text: "Flick a knife: 3 to the first foe it meets.",
  },
  firebomb: {
    name: "Firebomb", type: "action", tag: "spell", art: "oFlameStrike", windup: 0.8, cooldown: 9,
    shape: { kind: "circle", range: 6, r: 1.7 }, dmg: 5, push: 1.4, burn: { dps: 2, time: 3 },
    text: "Throw a firebomb: 5 to everything in the blast, and they burn for 2 a second.",
  },
  frostNova: {
    name: "Frost Nova", type: "action", tag: "spell", art: "oBlizzard", windup: 0.5, cooldown: 11,
    shape: { kind: "self", r: 2.5 }, dmg: 2, push: 0.6, slow: { pct: 0.6, time: 3 },
    text: "Freeze the air around you: 2 to everything near, and they crawl at 40% speed for 3 seconds.",
  },
  lightningBolt: {
    name: "Lightning Bolt", type: "action", tag: "spell", art: "oLightning", windup: 0.7, cooldown: 7,
    shape: { kind: "line", len: 8, w: 0.7 }, dmg: 6, push: 0.8,
    text: "A bolt that pierces: 6 to every foe on a long line.",
  },
  earthquake: {
    name: "Earthquake", type: "action", tag: "spell", art: "oEarthquake", windup: 1.2, cooldown: 14,
    shape: { kind: "self", r: 2.8 }, dmg: 7, push: 1.6,
    text: "Slam the ground: 7 to everything around you.",
  },
  healingLight: {
    name: "Healing Light", type: "action", tag: "spell", art: "oMediumRedVial", windup: 0.7, cooldown: 12,
    shape: { kind: "self", r: 2.6 }, heal: 8,
    text: "Heal you and every ally around you for 8.",
  },
  shieldUp: {
    name: "Shield Up", type: "action", tag: "melee", art: "dBuckler", windup: 0.25, cooldown: 10,
    shape: { kind: "self", r: 0 }, shield: 8,
    text: "Gain an 8-point shield.",
  },
  sunbeam: {
    name: "Sunbeam", type: "action", tag: "spell", art: "oHoly", windup: 1.0, cooldown: 16,
    shape: { kind: "circle", range: 7, r: 2.2 }, zone: { dur: 5, every: 1, dmg: 2, heal: 1 },
    text: "A lasting beam: every second for 5 seconds, 2 to foes and +1 health to allies inside.",
  },
  petRats: {
    name: "Pet Rats", type: "action", tag: "spell", art: "oPetRats", windup: 0.4, cooldown: 10,
    shape: { kind: "circle", range: 2.5, r: 0.7 }, summon: { unit: "rat", count: 2 },
    text: "Summon 2 rats. Rats have 1 health, draw foes' attention and bite for 1.",
  },
  summonEfreeti: {
    name: "Summon Efreeti", type: "action", tag: "spell", art: "oFlameOrbs", windup: 1.2, cooldown: 30,
    shape: { kind: "circle", range: 3, r: 0.8 }, summon: { unit: "efreeti", count: 1 },
    text: "Summon an Efreeti for 20 seconds. It hurls 2-damage firebolts at foes.",
  },
};

// Summoned units (not wearable). Rats are the owner's spec; the Efreeti's numbers are FLAG.
export const UNITS = {
  rat:     { name: "Rat", art: "rat", hp: 1, speed: 3.4, r: 0.26, life: 7,
             attack: { kind: "bite", reach: 0.3, every: 1.0, dmg: 1 } },
  efreeti: { name: "Efreeti", art: "efreeti", hp: 8, speed: 2.6, r: 0.36, life: 20,
             attack: { kind: "bolt", range: 7, every: 1.4, dmg: 2, speed: 9, w: 0.35, keepAway: 2 } },
};

// ------------------------------------------------------------------------------------------------
// BODIES — a body is ONE passive. `kmText` = his original King Mimic wording; `passiveText` = the real-time
// translation (FLAG wording + numbers in TUNING). `suggested` = the loadout pre-picked when you choose it
// (one tap to start; change anything). `role` only steers a FOE's feet.
// ------------------------------------------------------------------------------------------------
export const BODIES = {
  fatCat: {
    name: "Fat Cat", art: "fatCat", starter: true, role: "melee", passive: "hitRat",
    kmText: "Every 3 damage taken: summon a rat.",
    passiveText: "Whenever you're hit, summon a rat (at most one every 1.5 s).",
    suggested: { weapon: "swordShield", actions: ["warStomp", "shieldUp"], deck: ["vigor"] },
  },
  royalRat: {
    name: "Royal Rat", art: "royalRat", starter: true, role: "melee", passive: "playRat",
    kmText: "Every 3 moxie spent: summon a rat.",
    passiveText: "Every attack and action you make also summons a rat (3 at a time).",
    suggested: { weapon: "spear", actions: ["petRats", "dodgeRoll"], deck: ["swift"] },
  },
  lizardWizard: {
    name: "Lizard Wizard", art: "lizardWizard", starter: true, role: "caster", passive: "spellHaste",
    kmText: "All your ranged cards cost 1 less.",
    passiveText: "Your spells wind up and recharge 30% faster.",
    suggested: { weapon: "fireMagic", actions: ["frostNova", "lightningBolt"], deck: ["focus"] },
  },
  pennyPixie: {
    name: "Penny-Pinching Pixie", art: "pixie", starter: true, role: "melee", passive: "meleeHaste",
    kmText: "All your melee cards cost 1 less.",
    passiveText: "Your melee attacks wind up and recharge 30% faster.",
    suggested: { weapon: "greatsword", actions: ["charge", "dodgeRoll"], deck: ["heavyHands"] },
  },
  vengefulVampire: {
    name: "Vengeful Vampire", art: "vengefulVampire", starter: true, role: "caster", passive: "vampire",
    kmText: "Every 2 damage dealt: heal 1.",
    passiveText: "Every 2 damage you deal heals you 1.",
    suggested: { weapon: "bloodMagic", actions: ["dodgeRoll", "lightningBolt"], deck: ["brute"] },
  },
  goldenGolem: {
    name: "Golden Golem", art: "goldenGolem", starter: true, role: "bruiser", passive: "golem",
    kmText: "Enter combat with shield equal to max health.",
    passiveText: "Start every fight with a shield equal to your max health.",
    suggested: { weapon: "greatsword", actions: ["warStomp", "charge"], deck: ["giant"] },
  },
  auditAngel: {
    name: "Audit Angel", art: "auditAngel", starter: true, role: "healer", passive: "angel",
    kmText: "Every 6 seconds, heal your ally target for 6.",
    passiveText: "Every 6 seconds, heal the most hurt ally near you (or yourself) for 6.",
    suggested: { weapon: "arcaneMagic", actions: ["healingLight", "sunbeam"], deck: ["vigor"] },
  },
  bondBehemoth: {
    name: "Bond Behemoth", art: "bondBehemoth", starter: true, role: "bruiser", passive: "rage",
    kmText: "Every 3 damage taken: gain +1 damage.",
    passiveText: "Every 3 damage you take: +1 damage on everything, until the next floor.",
    suggested: { weapon: "greatsword", actions: ["charge", "shieldUp"], deck: ["anchor"] },
  },
  medusa: {
    name: "Mid-Management Medusa", art: "medusa", starter: true, role: "ranger", passive: "medusa",
    kmText: "Whenever you deal damage to a target, also poison it by 1.",
    passiveText: "Whatever you damage is poisoned: 1 a second for 3 seconds.",
    suggested: { weapon: "bow", actions: ["throwingKnife", "dodgeRoll"], deck: ["fletching"] },
  },
  centlessCentaur: {
    name: "Centless Centaur", art: "centlessCentaur", starter: true, role: "ranger", passive: "firstTwice",
    kmText: "The first card you play each combat resolves twice.",
    passiveText: "Your first attack in each fight lands twice.",
    suggested: { weapon: "crossbow", actions: ["dodgeRoll", "firebomb"], deck: ["fletching"] },
  },
  // ---- the floor's creatures (wearable when they leave their body) ----
  malevolentMouse: {
    name: "Malevolent Mouse", art: "malevolentMouse", role: "swarm", passive: "mouseRage",
    kmText: "Start each combat with +2 damage for 6 seconds.",
    passiveText: "Start every fight with +2 damage for 6 seconds.",
  },
  wearyWageslave: {
    name: "Weary Wageslave", art: "wearyWageslave", role: "melee", passive: "echo",
    kmText: "Every 2nd card played: melee the front foe for 1.",
    passiveText: "Every 2nd attack, also jab the nearest foe for 1.",
  },
  interestImp: {
    name: "Interest Imp", art: "interestImp", role: "caster", passive: "interest",
    kmText: "Every 4 moxie spent: gain +1 damage.",
    passiveText: "Every 4 attacks: +1 damage on everything, until the next floor.",
  },
  tollTroll: {
    name: "Toll Troll", art: "tollTroll", role: "bruiser", passive: "troll",
    kmText: "Every 4 moxie spent: heal 2.",
    passiveText: "Every 4 attacks: heal 2.",
  },
  marketCrashMinotaur: {
    name: "Market-Crash Minotaur", art: "marketCrashMinotaur", role: "boss", passive: "gore", boss: true,
    kmText: "Every 3 damage taken: melee the front foe for 1.",
    passiveText: "Every 3 damage taken: gore the nearest foe for 1.",
  },
};

// ------------------------------------------------------------------------------------------------
// FOES — built exactly like players. A foe of level N uses the first N cards of its deck (deck slots =
// level, same rule as you), so put the defining card first. hpMul is a deliberate asymmetry (FLAG).
// ------------------------------------------------------------------------------------------------
export const FOES = {
  mouse:     { body: "malevolentMouse", weapon: "bite",        deck: ["tiny", "swift"],                actions: [] },
  wageslave: { body: "wearyWageslave",  weapon: "swordShield", deck: ["vigor", "ironSkin"],            actions: [] },
  centaur:   { body: "centlessCentaur", weapon: "bow",         deck: ["fletching", "swift"],           actions: ["throwingKnife"] },
  imp:       { body: "interestImp",     weapon: "fireMagic",   deck: ["focus", "vigor"],               actions: [] },
  lizard:    { body: "lizardWizard",    weapon: "iceMagic",    deck: ["focus", "spellward"],           actions: ["frostNova"] },
  angel:     { body: "auditAngel",      weapon: "arcaneMagic", deck: ["vigor", "ward"],                actions: ["healingLight"] },
  fatCat:    { body: "fatCat",          weapon: "swordShield", deck: ["vigor", "thorns"],              actions: ["shieldUp"] },
  vampire:   { body: "vengefulVampire", weapon: "bloodMagic",  deck: ["brute", "vigor"],               actions: [] },
  troll:     { body: "tollTroll",       weapon: "greatsword",  deck: ["giant", "vigor", "ironSkin"],   actions: ["warStomp"] },
  behemoth:  { body: "bondBehemoth",    weapon: "greatsword",  deck: ["giant", "giant", "anchor"],     actions: ["charge"] },
  minotaur:  { body: "marketCrashMinotaur", weapon: "greatsword", deck: ["giant", "giant", "vigor", "anchor", "ironSkin", "vigor"],
               actions: ["charge", "earthquake"], hpMul: 3.2, boss: true },
};

// FLOORS — the dive. Each fight room on a floor gets one random pack from `packs`; each extra player adds
// one more foe from `extra`. `level` = foe level on that floor. The last floor is the boss den. FLAG all.
export const FLOORS = [
  { name: "B1F", fights: 3, level: 1, loot: 3,
    packs: [["mouse", "mouse", "mouse"], ["wageslave", "mouse"], ["centaur", "mouse"], ["imp", "wageslave"]],
    extra: ["mouse", "wageslave", "mouse"] },
  { name: "B2F", fights: 3, level: 2, loot: 3,
    packs: [["mouse", "mouse", "mouse", "mouse", "wageslave"], ["centaur", "imp", "wageslave"], ["fatCat", "angel"], ["vampire", "mouse", "mouse"]],
    extra: ["mouse", "centaur", "wageslave"] },
  { name: "B3F", fights: 4, level: 3, loot: 4,
    packs: [["troll", "mouse", "mouse"], ["lizard", "centaur", "wageslave"], ["behemoth", "angel"], ["vampire", "imp", "fatCat"], ["mouse", "mouse", "mouse", "mouse", "centaur"]],
    extra: ["mouse", "imp", "wageslave"] },
  { name: "B4F — the Minotaur's den", fights: 1, level: 4, loot: 1, boss: "minotaur", bossLevel: 6,
    packs: [["wageslave", "centaur", "mouse"]], extra: ["mouse", "imp", "mouse"] },
];
// at half health the boss calls a pack: count + one per extra player. FLAG.
export const BOSS_ADDS = { at: 0.5, foe: "mouse", count: 3, perPlayer: 1, level: 3 };
// co-op colours, in join order. FLAG.
export const PLAYER_COLORS = ["#3ee6c4", "#5fb8ff", "#c79bff", "#b6f05a"];
