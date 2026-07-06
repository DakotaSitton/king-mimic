// King Mimic engine — KIT item table + item/card classification (extracted from game.js barrel).
// Self-contained leaf: depends only on its own KIT table.

// ITEMS — the whole playable vocabulary. Self-contained: each is {name, cd, text, ops}.
// target: "front" = front foe in your lane · "pick" = your aimed foe (any lane; falls back
// to front of your lane) · "lane" = every foe in your lane. cd = ticks to recharge.
// `ante` = the item's contribution to a room's ante when a foe holds it.
// `fragile` = usable only ONCE per fight, then spent (resets each room).
// `type` = damage school. "physical" items scale with the wielder's Physical Power,
// "magical" with Magical Power. Utility items (heal/shield/wind/ratNest) are untyped.
// `color` is the item's identity hue — used everywhere it's shown (the foe threat bars and
// the player hotbar) so a given item reads as the SAME color on a foe and in your kit.
// `passive` (no `ops`) = a WORN item that's never pressed; its effect is always-on. Aegis
// grants `dr` (flat damage reduction) to whoever carries it — player or foe, symmetric.
export const KIT = {
  // ===== THE FIRST-SET KIT (SLICE_SPEC_V2 §3) — 12 common / 8 uncommon / 4 rare. cd in
  // TICKS (seconds×10). type:physical = sword icon, magical = staff icon. "+N" is the item's
  // base; the wielder's sword/staff Power adds on top. `ante` doubles as the rarity's value
  // weight (1/2/3) for loot, shop pricing, and foe-gear treasure. =====
  // --- COMMON (12) -----------------------------------------------------------------------
  blade:        { name: "Sword",        cd: 40, ante: 1, type: "physical", color: "#cfd8e2", text: "Deal sword + 1 to the front foe in your lane.",      ops: [{ do: "deal", amount: 1, target: "front" }] },
  bow:          { name: "Bow",          cd: 50, ante: 1, type: "physical", ranged: true, color: "#a8e06a", text: "Deal sword + 1 to your aimed foe.",      ops: [{ do: "deal", amount: 1, target: "pick" }] },
  hatchet:      { name: "Hatchet",      cd: 85, ante: 1, type: "physical", color: "#d89060", text: "Deal sword + 4 to the front foe.",                   ops: [{ do: "deal", amount: 4, target: "front" }] },
  fire:         { name: "Fireball",     cd: 80, ante: 1, type: "magical",  color: "#ff7a3c", text: "Deal staff + 3 to your aimed foe.",                  ops: [{ do: "deal", amount: 3, target: "pick" }] },
  lightning:    { name: "Lightning",    cd: 85, ante: 1, type: "magical",  color: "#5fd0ff", text: "Deal staff + 2 to every foe in your lane.",          ops: [{ do: "deal", amount: 2, target: "lane" }] },
  wind:         { name: "Wind",         cd: 55, ante: 1, type: "magical",  color: "#bcd8ff", text: "Deal staff + 1 to your aimed foe and push it to the back of its lane.", ops: [{ do: "deal", amount: 1, target: "pick" }, { do: "pushBack", target: "pick" }] },
  smallShield:  { name: "Small Shield", cd: 40, ante: 1, color: "#6cd6ff", text: "Gain a 1-point shield buffer.",                                        ops: [{ do: "shield", amount: 1 }] },
  heal:         { name: "Heal",         cd: 55, ante: 1, type: "magical",  color: "#74e69a", text: "Heal staff + 2 to your ally-target (or the most-hurt friendly in your lane).", ops: [{ do: "healAlly", amount: 2 }] },
  bigShield:    { name: "Big Shield",   cd: 80, ante: 1, color: "#6cd6ff", text: "Gain a 3-point shield buffer.",                                        ops: [{ do: "shield", amount: 3 }] },
  summonRat:    { name: "Rat",          cd: 65, ante: 1, type: "magical",  color: "#c9a98c", text: "Summon a rat in your lane.",                          ops: [{ do: "summon", body: "rat", count: 1 }] },
  gangUp:       { name: "Gang Up",      cd: 55, ante: 1, type: "physical", color: "#e0c060", text: "Deal sword + 1, +1 per other ally in your lane, to the front foe.", ops: [{ do: "deal", amount: 1, target: "front", perAlly: 1 }] },
  summonBigRat: { name: "Summon Large Rat", cd: 95, ante: 1, type: "magical", color: "#a98c6a", text: "Summon a large rat in your lane.",                 ops: [{ do: "summon", body: "largeRat", count: 1 }] },
  // --- UNCOMMON (8) ----------------------------------------------------------------------
  scaryKnife:   { name: "Scary Knife",  cd: 30, ante: 2, type: "physical", color: "#e7e0c0", text: "A cheap jab: deal sword to the front foe.",          ops: [{ do: "deal", amount: 0, target: "front" }] },
  spear:        { name: "Spear",        cd: 80, ante: 2, type: "physical", color: "#c0b8a0", text: "Deal sword + 3 to the front TWO foes in your lane.", ops: [{ do: "deal", amount: 3, target: "front2" }] },
  magicMissile: { name: "Magic Missile", cd: 35, ante: 2, type: "magical", color: "#9b8cff", text: "A cheap jab: deal staff to your aimed foe.",          ops: [{ do: "deal", amount: 0, target: "pick" }] },
  darkness:     { name: "Darkness",     cd: 85, ante: 2, type: "magical",  color: "#8060a8", text: "Deal staff + 3 to your aimed foe; heal yourself the damage dealt.", ops: [{ do: "deal", amount: 3, target: "pick", lifesteal: true }] },
  totem:        { name: "Totem",        cd: 85, ante: 2, type: "magical",  color: "#7fb08a", text: "Summon a totem: allies in its lane take 1 less damage while it stands.", ops: [{ do: "summon", body: "totem", count: 1 }] },
  flag:         { name: "Flag",         cd: 85, ante: 2, type: "physical", color: "#e08a8a", text: "Summon a flag: allies in its lane deal +1 damage while it stands.", ops: [{ do: "summon", body: "flag", count: 1 }] },
  trustyShield: { name: "Trusty Shield", cd: 65, ante: 2, color: "#6cd6ff", startCharged: true, text: "Gain a 2-point shield buffer.", ops: [{ do: "shield", amount: 2 }] },
  spikes:       { name: "Spikes",       cd: 70, ante: 2, color: "#b0b8c0", text: "This fight: attackers that strike you take 1 (thorns).",              ops: [{ do: "thorns", amount: 1 }] },
  // --- RARE (4) --------------------------------------------------------------------------
  crossbow:     { name: "Repeating Crossbow", cd: 25, ante: 4, type: "physical", ranged: true, color: "#c8d870", text: "A cheap jab: deal sword to your aimed foe.", ops: [{ do: "deal", amount: 0, target: "pick" }] },
  blizzard:     { name: "Blizzard",     cd: 95, ante: 4, type: "magical", color: "#a8e0ff", text: "Deal staff + 2 to every foe in your lane and drain 3 moxie from each.", ops: [{ do: "deal", amount: 2, target: "lane" }, { do: "delay", amount: 3, target: "lane" }] },
  knightBanner: { name: "Hedgefund Knight", cd: 100, ante: 4, type: "physical", color: "#d8c050", text: "Summon a knight: attacks every 4s; allies in its lane deal +1 and take 1 less while it stands.", ops: [{ do: "summon", body: "knight", count: 1 }] },
  // Worn passive — never pressed, always on (no ops). The Aegis dr pattern.
  slimeCrown:   { name: "Liquid Metal King Slime Crown", cd: 0, ante: 4, color: "#b6a8ff", passive: { dr: 1 }, text: "Worn: take 1 less from every hit." },
  // ===== THE POST-FLOOR-3 WAVE (owner's spitball list, build-ordered 2026-06-12 22:19).
  // De-tiered: each carries ONE gold number; every value here is a [PLACEHOLDER] dial.
  // Buffs are timed and symmetric (a foe holding one buffs itself the same way). The
  // once-per-fight panic buttons are fragile + startCharged: ready the moment the fight
  // opens, one press, gone till the next room. =====
  // (sim audit, same night: buff cds raised so uptime < 100% — dur 80 over cd 70 was a
  // PERMANENT buff; Omnislash strikes got a +2 base — amount-0 ×4 was strictly worse
  // than a 1g Sword. Still all [PLACEHOLDER].)
  haste:      { name: "Haste",       cd: 160, ante: 3, color: "#ffe06a", text: "For 7.5s: you (or your ally-target) gain moxie twice as fast.",  ops: [{ do: "buff", buff: "haste", amount: 1, dur: 75 }] },
  powerBoost: { name: "Power Boost", cd: 220, ante: 3, color: "#ff9a5a", text: "For 12s: +2 sword AND staff Power — yours, or your ally-target's.", ops: [{ do: "buff", buff: "power", amount: 2, dur: 120 }] },
  stoneSkin:  { name: "Stone Skin",  cd: 220, ante: 3, color: "#b8c0a8", text: "For 12s: you (or your ally-target) take 2 less from every hit.",  ops: [{ do: "buff", buff: "stoneskin", amount: 2, dur: 120 }] },
  omnislash:  { name: "Omnislash",   cd: 130, ante: 5, type: "physical", color: "#ffd24a", text: "Strike the front foe FOUR times (sword + 2 each).",
                ops: [{ do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }] },
  gigaCast:   { name: "Giga Cast",   cd: 55, ante: 5, fragile: true, startCharged: true, color: "#c06aff", text: "Once per fight: your NEXT staff card resolves FOUR times.", ops: [{ do: "gigaArm" }] },
  timeStop:   { name: "Time Stop",   cd: 55, ante: 6, fragile: true, startCharged: true, color: "#8ad0ff", text: "Once per fight: every foe FREEZES for 4.5s — gains no moxie and casts nothing.",           ops: [{ do: "timeStop", dur: 45 }] },
  revive:     { name: "Revive",      cd: 55, ante: 6, fragile: true, startCharged: true, color: "#7fe6c0", text: "Once per fight: restore a downed teammate to full HP (ally-target first; full-heals if nobody is down).", ops: [{ do: "revive" }] },

  // ===== OWNER'S CANONICAL BASE SET (hand-designed, submitted 2026-06-22; FLATTENED to school-free
  // 2026-06-24). These are THE in-game cards: the draft wheel, starter decks, loot and shop draw from
  // PLAYER_POOL (= these keys). `cost` = moxie price; `ante:1` = value 1 (all base). NO `type`/`mult`/
  // Power — every number is FLAT (pinned to the owner's own Power-2 baseline from `_ownerprobe.mjs`,
  // his to re-tune). melee→front/front2 · ranged→aimed (`ranged:true`) · lane→whole lane. The
  // first-set keys above stay defined only as test scaffolding (retired from every in-game pool). =====
  // --- MELEE ---
  oSword:      { name: "Sword",        ante: 1, cost: 2, color: "#cfd8e2", text: "Deal 3 to the front foe.",                         ops: [{ do: "deal", amount: 3, target: "front" }] },
  oHatchet:    { name: "Hatchet",      ante: 1, cost: 3, color: "#d89060", text: "Deal 4 to the front foe.",                         ops: [{ do: "deal", amount: 4, target: "front" }] },
  oSpear:      { name: "Spear",        ante: 1, cost: 2, color: "#c0b8a0", text: "Deal 2 to the front foe AND the foe behind it.",   ops: [{ do: "deal", amount: 2, target: "front2" }] },
  oDagger:     { name: "Dagger",       ante: 1, cost: 1, color: "#e7e0c0", text: "Deal 1 to the front foe.",                         ops: [{ do: "deal", amount: 1, target: "front" }] },
  oMallet:     { name: "Mallet",       ante: 1, cost: 4, color: "#b88a5a", text: "Deal 4 to the front foe; gain shield equal to the damage dealt.", ops: [{ do: "deal", amount: 4, target: "front" }, { do: "shield", ofDealt: true }] },
  oZweihander: { name: "Zweihänder",   ante: 1, cost: 5, color: "#ffd24a", text: "Deal 6 to the front foe.",                         ops: [{ do: "deal", amount: 6, target: "front" }] },
  oTwinUchis:  { name: "Twin Uchis",   ante: 1, cost: 3, color: "#e0c060", text: "Deal 2 to the front foe twice (each hit takes your melee bonus).", ops: [{ do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }] },
  oPowerUp:    { name: "Power Up",     ante: 1, cost: 2, color: "#ff9a5a", text: "Gain +1 damage for the rest of the fight.",        ops: [{ do: "counter", amount: 1 }] },
  oComboBlade: { name: "Combo Blade",  ante: 1, cost: 3, color: "#ffb060", text: "Deal 2 to the front foe; your next 3 cards deal +1.", ops: [{ do: "deal", amount: 2, target: "front" }, { do: "comboBuff", n: 3, amount: 1 }] },
  // --- RANGED (aimed) ---
  oBow:        { name: "Bow",          ante: 1, cost: 2, ranged: true, kind: "melee", color: "#a8e06a", text: "Deal 2 to any foe you target (melee).", ops: [{ do: "deal", amount: 2, target: "pick" }] },
  oJavelin:    { name: "Javelin",      ante: 1, cost: 4, ranged: true, kind: "melee", color: "#c8d870", text: "Deal 5 to any foe you target (melee).", ops: [{ do: "deal", amount: 5, target: "pick" }] },
  oFire:       { name: "Fire",         ante: 1, cost: 3, ranged: true, color: "#ff7a3c", text: "Deal 5 to your aimed foe.",          ops: [{ do: "deal", amount: 5, target: "pick" }] },
  oIce:        { name: "Ice",          ante: 1, cost: 3, ranged: true, color: "#a8e0ff", text: "Deal 3 to your aimed foe and drain 1 of its moxie.", ops: [{ do: "deal", amount: 3, target: "pick" }, { do: "delay", amount: 1, target: "pick" }] },
  oArcane:     { name: "Arcane",       ante: 1, cost: 1, ranged: true, color: "#9b8cff", text: "Deal 1 to your aimed foe.",          ops: [{ do: "deal", amount: 1, target: "pick" }] },
  oDark:       { name: "Dark",         ante: 1, cost: 4, ranged: true, color: "#8060a8", text: "Deal 4 to your aimed foe; heal the damage dealt.", ops: [{ do: "deal", amount: 4, target: "pick", lifesteal: true }] },
  oWind:       { name: "Wind",         ante: 1, cost: 2, ranged: true, color: "#bcd8ff", text: "Deal 3 to your aimed foe and push it to the back of its lane.", ops: [{ do: "deal", amount: 3, target: "pick" }, { do: "pushBack", target: "pick" }] },
  // --- LANE / UTILITY ---
  oLightning:  { name: "Lightning",    ante: 1, cost: 3, color: "#5fd0ff", text: "Deal 3 to every foe in your lane.",                ops: [{ do: "deal", amount: 3, target: "lane" }] },
  oMeteors:    { name: "Meteors",      ante: 1, cost: 5, color: "#ff5a3c", text: "Deal 6 to every foe in your lane.",                ops: [{ do: "deal", amount: 6, target: "lane" }] },
  oHoly:       { name: "Holy",         ante: 1, cost: 3, color: "#74e69a", text: "Heal 5 to your ally-target (or the most-hurt friendly in your lane).", ops: [{ do: "healAlly", amount: 5 }] },
  // FORCE (owner 2026-07-06): the ONE ranged-typed shield — every other shield is typeless. Its
  // explicit `ranged` keeps it feeding ranged play-triggers, and the shield SCALES off the wearer's
  // ranged bonus (plusRangedBonus → + rangedBonusOf in the shield op), so the text says so.
  oForce:      { name: "Force",        ante: 1, cost: 4, ranged: true, color: "#6cd6ff", text: "Gain a shield of 6 + your ranged bonus.", ops: [{ do: "shield", amount: 6, plusRangedBonus: true }] },

  // ===== DEFENSIVE SET (owner submission 2026-06-24): school-free shield/sustain cards. value 1, ante 1.
  // `icon` emojis are placeholders (owner's art to set).
  // NO explicit `ranged` flags needed here (owner 2026-07-06): the whole set derives its type from
  // opsTouchFoes — shields/armor/sustain touch no foe → TYPELESS ("none": no 🎯 badge, feeds neither
  // onPlayRanged nor onPlayMelee — a Buckler no longer buffs Runeblade). Taunt DOES touch a foe
  // (drags it) → ranged. Shield Bash strikes the front → melee. oForce (above) is the one
  // deliberately ranged-typed shield. =====
  dBuckler:    { name: "Tiny Buckler", ante: 1, cost: 1, icon: "🛡", color: "#6cd6ff", text: "Gain a 1-point shield.",              ops: [{ do: "shield", amount: 1 }] },
  dTaunt:      { name: "Taunt",        ante: 1, cost: 1, ranged: true, icon: "🪧", color: "#e0c060", text: "Drag your aimed foe to the front of YOUR lane.", ops: [{ do: "pullFront", target: "pick" }] },
  dShield:     { name: "Shield",       ante: 1, cost: 2, icon: "🛡", color: "#6cd6ff", text: "Gain a 2-point shield.",              ops: [{ do: "shield", amount: 2 }] },
  dShieldBash: { name: "Shield Bash",  ante: 1, cost: 2, icon: "🛡", color: "#b0c0d0", text: "Gain 1 shield, then deal damage equal to your current shield to the front foe.", ops: [{ do: "shield", amount: 1 }, { do: "deal", ofShield: true, target: "front" }] },
  dHeartGuard: { name: "Heart Guard",  ante: 1, cost: 3, icon: "💗", color: "#f08aa0", text: "Gain a 2-point shield and heal 2.",   ops: [{ do: "shield", amount: 2 }, { do: "healSelf", amount: 2 }] },
  dThorns:     { name: "Thorns",       ante: 1, cost: 3, lasting: true, icon: "🌵", color: "#8aa06a", text: "This fight: attackers take 1 damage when they hit you.", ops: [{ do: "thorns", amount: 1 }] },
  dStoneskin:  { name: "Stoneskin",    ante: 1, cost: 4, lasting: true, icon: "🪨", color: "#9a9aa0", text: "This fight: take 1 less damage from all sources.", ops: [{ do: "buff", buff: "stoneskin", amount: 1, dur: 9999 }] },
  dBloodIron:  { name: "Blood To Iron", ante: 1, cost: 4, icon: "🩸", color: "#a04050", text: "For 6 seconds, each hit you take is counted; when it ends, gain 1 shield per hit.", ops: [{ do: "bloodToIron", dur: 60 }] },
  dTowerShield:{ name: "Tower Shield", ante: 1, cost: 4, icon: "🛡", color: "#6cd6ff", text: "Gain a 5-point shield.",              ops: [{ do: "shield", amount: 5 }] },
  dTrollskin:  { name: "Trollskin Tiara",     ante: 1, cost: 3, lasting: true, icon: "👑", color: "#7fb08a", text: "This fight: heal 2 every 6 seconds.", ops: [{ do: "regen", kind: "heal", amount: 2, period: 60 }] },
  dLiquidMetal:{ name: "Liquid Metal Crown",  ante: 1, cost: 5, lasting: true, icon: "👑", color: "#c0c0d8", text: "This fight: gain 3 shield every 6 seconds.", ops: [{ do: "regen", kind: "shield", amount: 3, period: 60 }] },

  // ===== OWNER BATCH (designs submitted 2026-06-25) — faithfully implemented as engine cards. value 1,
  // ante 1; `cost` = chosen moxie price (see report for the anchor each is pinned to). `icon` emojis are
  // placeholders (owner's art to set). FLAGGED unspecified numbers are noted in the card comment. =====
  oOmnislash:  { name: "Omnislash",    ante: 1, cost: 5, kind: "melee", icon: "🗡", color: "#ffd24a", text: "Melee the front foe 4 times for 2 each.",
                 ops: [{ do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }] }, // FLAGGED: owner didn't set per-hit dmg — picked 2 (8 base, scales 4× off melee bonus)
  oHaste:      { name: "Haste",        ante: 1, cost: 3, icon: "⚡", color: "#ffe06a", text: "You (or your ally-target) gain double moxie for 6 seconds.", ops: [{ do: "buff", buff: "haste", amount: 1, dur: 60 }] },
  oHedgeKnight:{ name: "Hedgefund Knight", ante: 1, cost: 5, icon: "🤴", color: "#d8c050", text: "Summon a Hedgefund Knight (hp 5, +1 damage, +1 damage resist).", ops: [{ do: "summon", body: "hedgeKnight", count: 1 }] },
  oMoxiePool:  { name: "Moxie Pool",   ante: 1, cost: 2, lasting: true, icon: "💧", color: "#5fd0ff", text: "This fight: gain 1 moxie every 6 seconds.", ops: [{ do: "regen", kind: "moxie", amount: 1, period: 60 }] },
  oGlacius:    { name: "Glacius",      ante: 1, cost: 6, kind: "melee", icon: "❄", color: "#a8e0ff", text: "Deal 8 to the front foe.", ops: [{ do: "deal", amount: 8, target: "front" }] },
  oSharpEdges: { name: "Sharpened Edges", ante: 1, cost: 2, icon: "🗡", color: "#cfd8e2", text: "This fight: all your melee cards deal +1.", ops: [{ do: "meleeBonus", amount: 1 }] },
  oWizardHat:  { name: "Wizard Hat",   ante: 1, cost: 2, icon: "🎩", color: "#9b8cff", text: "This fight: all your ranged cards deal +1.", ops: [{ do: "rangedBonus", amount: 1 }] },
  oRepeatXbow: { name: "Repeating Crossbow", ante: 1, cost: 1, ranged: true, kind: "melee", icon: "🏹", color: "#c8d870", text: "Deal 1 to any foe you target (melee).", ops: [{ do: "deal", amount: 1, target: "pick" }] },
  oDemonForm:  { name: "Demon Form",   ante: 1, cost: 3, lasting: true, icon: "😈", color: "#b85c6e", text: "This fight: gain +1 melee damage every 6 seconds.", ops: [{ do: "regen", kind: "meleeBonus", amount: 1, period: 60 }] },
  oSageMode:   { name: "Sage Mode",    ante: 1, cost: 3, lasting: true, icon: "🧙", color: "#8a9cff", text: "This fight: gain +1 ranged damage every 6 seconds.", ops: [{ do: "regen", kind: "rangedBonus", amount: 1, period: 60 }] },
  oBerserker:  { name: "Berserker Armor", ante: 1, cost: 3, lasting: true, icon: "🪓", color: "#a04050", text: "This fight every 6 seconds: gain +1 melee damage, 1 shield, and take 1 damage.", ops: [{ do: "regen", kind: "berserk", amount: 1, melee: 1, shield: 1, period: 60 }] }, // FLAGGED: combo — +1 melee bonus & +1 shield & 1 self-dmg per period; the granted shield usually eats the self-dmg
  oPileOn:     { name: "Pile On",      ante: 1, cost: 2, kind: "melee", icon: "👥", color: "#e0c060", text: "Melee the front foe for damage equal to the allies in your lane.", ops: [{ do: "deal", amount: 0, perAlly: 1, target: "front" }] }, // perAlly counts OTHER allies; +1 floor on a school deal does not apply (untyped base)
  // === NEW CARDS (owner 2026-06-27, batch B) ============================================
  oButcherCleaver: { name: "Butcher's Cleaver", ante: 1, cost: 4, kind: "melee", icon: "🔪", color: "#c0504a", text: "Deal 4 to the front foe; heal the damage dealt.", ops: [{ do: "deal", amount: 4, target: "front", lifesteal: true }] },
  oPetLeech:   { name: "Pet Leech",    ante: 1, cost: 3, ranged: true, lasting: true, icon: "🪱", color: "#8a6a4a", text: "This fight, every 6 seconds: deal 1 to your aimed foe and heal 1.", ops: [{ do: "timer", period: 60, ops: [{ do: "deal", amount: 1, target: "pick", lifesteal: true }] }] },
  oSlow:       { name: "Slow",         ante: 1, cost: 2, ranged: true, icon: "🐌", color: "#8a9cff", text: "Halve your aimed foe's moxie gain for 6 seconds.", ops: [{ do: "slow", target: "pick", dur: 60 }] },
  oAnimatedBlade: { name: "Animated Blade", ante: 1, cost: 3, kind: "melee", lasting: true, icon: "⚔", color: "#c8d0d8", text: "This fight, every 6 seconds: melee the front foe for 1.", ops: [{ do: "timer", period: 60, ops: [{ do: "deal", amount: 1, target: "front" }] }] },
  oWeakness:   { name: "Weakness",     ante: 1, cost: 2, ranged: true, icon: "📉", color: "#a08aae", text: "Your aimed foe deals half damage (rounded up) for 6 seconds.", ops: [{ do: "weakness", target: "pick", dur: 60 }] },
  // COOL SHOES — a WORN PASSIVE item (owner 2026-06-25, REWORKED): no ops, never cast. `passive.moxieOnPlay`
  // grants +N moxie every time the wearer PLAYS a card (playCard / foeCast), capped at MOXIE_CAP. This
  // REPLACES the old `moxieRegen` (a moxie-over-time tick that was just a Moxie-Pool clone). isPassiveItem
  // keeps it out of the combat deck/queue (never drawn/cast); it stays IN PLAYER_POOL (a draftable/lootable
  // card like any other — safe now that deckKeys no longer pads short decks). A foe wearing it refunds too.
  coolShoes:   { name: "Cool Shoes",   ante: 1, cost: 3, icon: "👟", color: "#5fd0ff", passive: { moxieOnPlay: 1 }, text: "Worn: gain 1 moxie each time you play a card." },

  // ===== SUMMON-ONLY CARDS (owner 2026-06-24): the cards summon TOKENS cast. ante 0 (no economic
  // value) and NEVER in PLAYER_POOL — not draftable, not loot, not shop, not foe gear. A summoned
  // token earns moxie and casts these exactly like any other combatant (the symmetry pillar extended
  // to summons). Keyed `t*` so they're easy to keep out of every pool. =====
  tBite:       { name: "Bite", ante: 0, cost: 2, color: "#c9a98c", text: "Deal 1 to the front foe.", ops: [{ do: "deal", amount: 1, target: "front" }] },
  // The Hedgefund Knight summon's swing: a +1'd bite (1 base + the knight's "+1 damage" baked in = 2).
  tKnightStrike:{ name: "Knight Strike", ante: 0, cost: 2, kind: "melee", color: "#d8c050", text: "Deal 2 to the front foe.", ops: [{ do: "deal", amount: 2, target: "front" }] },
};
// An item that's worn for an ongoing effect rather than pressed (no active ops). The kit/UI
// treats these as always-on badges, not cooldown buttons.
export const isPassiveItem = (key) => !!KIT[key]?.passive && !(KIT[key]?.ops?.length);
// FOE-AFFECTING (owner 2026-07-06): does any op (looking through timers) REACH A FOE — damage,
// a drag/push, a moxie drain, a hex? Self/ally cards (armor, shields, heals, buffs, ramps,
// summons) don't. This predicate is what "ranged" MEANS now: "the ranged tag should normally
// only apply to cards effecting foes. Like a projectile. A spell. Not armor."
const FOE_TARGETS = new Set(["pick", "front", "front2", "lane"]);
export const opsTouchFoes = (ops) => (ops ?? []).some((o) => o.do === "timer" ? opsTouchFoes(o.ops) : FOE_TARGETS.has(o.target));
// RANGED vs MELEE — the player-facing targeting/badge classification. MELEE is the NARROW
// category: ONLY true melee weapons (cardKind "melee" — front/front2 strikes plus the
// explicit-melee aimed weapons). RANGED = the rest of the FOE-AFFECTING cards (spells, lane AoE,
// aimed debuffs like Slow/Weakness/Taunt). Cards that touch no foe — shields, heals, self/ally
// buffs, ramps, summons — are TYPELESS: no 🎯 badge, no trigger type (owner 2026-07-06,
// supersedes the 6/28 "everything not melee is ranged" rule). An explicit `ranged` flag still
// wins both ways (Bow/Javelin/Crossbow stay reticle-driven ranged; oForce is the one deliberate
// ranged-typed shield). Worn passives carry no badge; melee always strikes the front of YOUR lane.
export const isRanged = (key) => KIT[key]?.ranged ?? (!isPassiveItem(key) && cardKind(key) !== "melee" && opsTouchFoes(KIT[key]?.ops));
// CARD KIND (owner 2026-06-25) — the BONUS/icon/trigger type, SEPARATE from targeting:
//   melee  🗡 = sword bonus + melee triggers (dealtMelee / the melee half of pairMR)
//   ranged 🎯 = target bonus + ranged triggers (dealtRanged / the ranged half of pairMR)
//   untyped    = neither (pure shields / heals / buffs — no damage, no bonus, no icon)
// Targeting (front vs aimed `pick` vs `lane` AoE) is INDEPENDENT. Lightning/Meteors hit
// non-adjacent foes → that's a RANGED flavour, so `target:"lane"` derives ranged. Bow/Javelin
// AIM (target:"pick") but are MELEE cards ("target anything", pay the melee bonus) — they carry
// an explicit `kind:"melee"` that overrides the pick→ranged default.
export const cardKind = (key) => {
  const it = KIT[key]; if (!it) return "untyped";
  if (it.kind) return it.kind;                                          // explicit override (Bow/Javelin)
  const deal = (it.ops || []).find((o) => o.do === "deal");
  if (!deal) return "untyped";                                         // shields / heals / buffs
  return (deal.target === "front" || deal.target === "front2") ? "melee" : "ranged"; // pick OR lane → ranged
};
// TRIGGER KIND — the axis for card-PLAY mechanic triggers (onPlayMelee / onPlayRanged, and the
// melee/ranged halves of pairMR): "melee" / "ranged" / "none". MELEE is narrow (true melee
// weapons, cardKind "melee"); RANGED = foe-affecting cards (opsTouchFoes — projectiles, spells,
// aimed debuffs); everything self/ally-facing (armor, shields, heals, buffs, ramps, summons) is
// "none" and feeds NEITHER trigger (owner 2026-07-06 ruling, supersedes the 6/28 two-bucket
// "utility counts ranged" rule). An explicit `ranged` flag overrides the derivation — oForce is
// the one deliberate ranged-typed shield (its shield scales off the ranged bonus).
// This is the single source of truth for a card's play-trigger type. (The dealtMelee/dealtRanged
// DAMAGE clocks stay on cardKind: they fire on damage LANDED, and a damaging card is always typed
// melee/ranged, so the axes agree wherever damage exists.)
export const triggerKind = (key) =>
  cardKind(key) === "melee" ? "melee" : (KIT[key]?.ranged ?? opsTouchFoes(KIT[key]?.ops)) ? "ranged" : "none";
// The total bonus an entity applies to a card of `kind`: the generic ramp (`counters`, which a
// `counter` op grants and which lifts BOTH symbols) PLUS any type-specific bonus (a future
// melee-only / ranged-only grant lifts just one). Untyped attacks get nothing.
export const meleeBonusOf  = (c) => (c.counters ?? 0) + (c.meleeBonus ?? 0);
export const rangedBonusOf = (c) => (c.counters ?? 0) + (c.rangedBonus ?? 0);
export const kindBonusOf = (c, kind) => kind === "melee" ? meleeBonusOf(c) : kind === "ranged" ? rangedBonusOf(c) : 0;
// The kind to charge for a deal op: an explicit card `kind` (passed by playCard/foeCast) wins;
// otherwise derive from the op's target so PASSIVE-dealt hits (Minotaur front, Crypto lane) self-type.
export const kindForOp = (op, kind = null) => kind ?? ((op?.target === "front" || op?.target === "front2") ? "melee" : "ranged");
// FOE RANGED ROUTING (owner 2026-06-27): a foe `deal` op snipes the weakest PLAYER (cross-lane,
// never a summon) iff it AIMS a single target — `target:"pick"`. Every ranged-flagged card aims
// (Bow/Fire/Ice/Arcane/Dark/Wind/…); melee cards hit front/front2 and AoE hits `lane`, so those
// route to the melee-front/AoE paths instead. Foe damage PASSIVES never aim, so they melee.
export const foeOpSnipes = (op) => op?.target === "pick";
export const KIT_POOL = Object.keys(KIT);

// Each loot item is worth Treasure points = its ante (its weight). Under the mirrored-income
// model this value is both (a) part of the room value V credited to every wallet on clear and
// (b) the COST to claim that item (claimLoot) — so grabbing gear converts your own income into
// the item, while a player who skips it keeps the cash. Equal earnings, divergent holdings.
export const itemTreasure = (key) => (KIT[key]?.ante ?? 1);

// PLAYABLE card = has ops (worn passives have none → never drawn into a hand / never cast).
export const isCard = (key) => !!(KIT[key]?.ops?.length);

// Backpack/deck size has NO MAXIMUM (owner 2026-06-24): there is no buyable-slot economy and no
// gold — the only sanity ceiling is a high memory cap so a backpack can't grow unbounded. MAX_KIT
// survives ONLY as that ceiling; the gold-priced kit-slot ladder is GONE. (The squad give/swap
// gates still read MAX_KIT as a free-slot check, never a gameplay cap.)
export const MAX_KIT = 200;          // sanity ceiling ONLY (memory) — not a gameplay limit
