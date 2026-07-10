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
  // ===== OWNER'S CANONICAL BASE SET (hand-designed, submitted 2026-06-22; FLATTENED to school-free
  // 2026-06-24). These are THE in-game cards: the draft wheel, starter decks, loot and shop draw from
  // PLAYER_POOL (= these keys). `cost` = moxie price; `ante:1` = value 1 (all base). NO `type`/`mult`/
  // Power — every number is FLAT (pinned to the owner's own Power-2 baseline from `_ownerprobe.mjs`,
  // his to re-tune). melee→front/front2 · ranged→aimed (`ranged:true`) · lane→whole lane. (The legacy
  // first-set + post-floor-3 cards were DELETED from KIT 2026-07-09 on owner's order "remove all the old
  // ones" — every retired key is gone; only these owner cards + the t* summon casts remain.) =====
  // --- MELEE ---
  oSword:      { name: "Sword",        ante: 1, cost: 3, color: "#cfd8e2", text: "Deal 3 to the front foe.",                         ops: [{ do: "deal", amount: 3, target: "front" }] },
  oHatchet:    { name: "Hatchet",      ante: 1, cost: 4, color: "#d89060", text: "Deal 4 to the front foe.",                         ops: [{ do: "deal", amount: 4, target: "front" }] },
  oSpear:      { name: "Spear",        ante: 1, cost: 3, color: "#c0b8a0", text: "Deal 2 to the front foe AND the foe behind it.",   ops: [{ do: "deal", amount: 2, target: "front2" }] },
  oDagger:     { name: "Dagger",       ante: 1, cost: 2, color: "#e7e0c0", text: "Deal 1 to the front foe.",                         ops: [{ do: "deal", amount: 1, target: "front" }] },
  oMallet:     { name: "Mallet",       ante: 1, cost: 5, color: "#b88a5a", text: "Deal 4 to the front foe; gain shield equal to the damage dealt.", ops: [{ do: "deal", amount: 4, target: "front" }, { do: "shield", ofDealt: true }] },
  oZweihander: { name: "Zweihänder",   ante: 1, cost: 6, color: "#ffd24a", text: "Deal 6 to the front foe.",                         ops: [{ do: "deal", amount: 6, target: "front" }] },
  oTwinUchis:  { name: "Twin Uchis",   ante: 1, cost: 4, color: "#e0c060", text: "Deal 2 to the front foe twice (each hit takes your melee bonus).", ops: [{ do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }] },
  oPowerUp:    { name: "Power Up",     ante: 1, cost: 4, color: "#ff9a5a", text: "Gain +1 damage (melee AND ranged) for the rest of the fight.", ops: [{ do: "counter", amount: 1 }] }, // FLAG: cost 3 picked (owner: PowerUp must cost MORE than Sharpened Edges ⚡2 → ⚡3). +1-to-both is the generic `counter` ramp, unchanged.
  oComboBlade: { name: "Combo Blade",  ante: 1, cost: 4, color: "#ffb060", text: "Deal 2 to the front foe; your next 3 cards deal +1.", ops: [{ do: "deal", amount: 2, target: "front" }, { do: "comboBuff", n: 3, amount: 1 }] },
  // --- RANGED (aimed) ---
  oBow:        { name: "Bow",          ante: 1, cost: 3, ranged: true, kind: "melee", color: "#a8e06a", text: "Deal 2 to any foe you target (melee).", ops: [{ do: "deal", amount: 2, target: "pick" }] },
  oJavelin:    { name: "Javelin",      ante: 1, cost: 5, ranged: true, kind: "melee", color: "#c8d870", text: "Deal 5 to any foe you target (melee).", ops: [{ do: "deal", amount: 5, target: "pick" }] },
  oFire:       { name: "Fire",         ante: 1, cost: 4, ranged: true, color: "#ff7a3c", text: "Deal 5 to your aimed foe.",          ops: [{ do: "deal", amount: 5, target: "pick" }] },
  // ICE (owner 2026-07-09): "change ice to be ranged, deal 1, remove moxie from target equal to the damage
  // dealt." RANGED (already), single deal of 1 to the aimed foe, then delay {ofDealt} drains the target's
  // moxie by the damage just dealt (1 at base; scales with ranged bonus). cost 3 UNCHANGED (owner named none).
  oIce:        { name: "Ice",          ante: 1, cost: 4, ranged: true, color: "#a8e0ff", text: "Deal 1 to your aimed foe and drain moxie from it equal to the damage dealt.", ops: [{ do: "deal", amount: 1, target: "pick" }, { do: "delay", target: "pick", ofDealt: true }] }, // FLAG: base 1 is the owner's stated number
  oArcane:     { name: "Arcane",       ante: 1, cost: 2, ranged: true, color: "#9b8cff", text: "Deal 1 to your aimed foe.",          ops: [{ do: "deal", amount: 1, target: "pick" }] },
  oDark:       { name: "Dark",         ante: 1, cost: 5, ranged: true, color: "#8060a8", text: "Deal 4 to your aimed foe; heal the damage dealt.", ops: [{ do: "deal", amount: 4, target: "pick", lifesteal: true }] },
  oWind:       { name: "Wind",         ante: 1, cost: 3, ranged: true, color: "#bcd8ff", text: "Deal 3 to your aimed foe and push it to the back of its lane.", ops: [{ do: "deal", amount: 3, target: "pick" }, { do: "pushBack", target: "pick" }] },
  // --- LANE / UTILITY ---
  oLightning:  { name: "Lightning",    ante: 1, cost: 4, color: "#5fd0ff", text: "Deal 3 to every foe in your lane.",                ops: [{ do: "deal", amount: 3, target: "lane" }] },
  oMeteors:    { name: "Meteors",      ante: 1, cost: 6, color: "#ff5a3c", text: "Deal 6 to every foe in your lane.",                ops: [{ do: "deal", amount: 6, target: "lane" }] },
  // BLIZZARD (owner 2026-07-09): "put Blizzard in the pool as a 1-cost item, moxie cost 6; make it do [Ice's
  // new effect] to an entire lane." = the LANE mirror of the new Ice — deal 1 to EVERY foe in your lane, then
  // drain each foe's moxie by the damage dealt to it (delay {ofDealt}, lane). RANGED (lane AoE reaching foes).
  // ante 1 = value-1 pool card; moxie cost 6 is the owner's number. DISTINCT from the deleted first-set `blizzard`.
  oBlizzard:   { name: "Blizzard",     ante: 1, cost: 7, ranged: true, color: "#a8e0ff", text: "Deal 1 to every foe in your lane and drain moxie from each equal to the damage dealt.", ops: [{ do: "deal", amount: 1, target: "lane" }, { do: "delay", target: "lane", ofDealt: true }] }, // FLAG: base 1 mirrors Ice per owner ("do that to an entire lane") — he may want more
  oHoly:       { name: "Holy",         ante: 1, cost: 4, color: "#74e69a", text: "Heal 5 to your ally-target (or the most-hurt friendly in your lane).", ops: [{ do: "healAlly", amount: 5 }] },
  // FORCE (owner 2026-07-06): the ONE ranged-typed shield — every other shield is typeless. Its
  // explicit `ranged` keeps it feeding ranged play-triggers, and the shield SCALES off the wearer's
  // ranged bonus (plusRangedBonus → + rangedBonusOf in the shield op), so the text says so.
  oForce:      { name: "Force",        ante: 1, cost: 5, ranged: true, color: "#6cd6ff", text: "Gain a shield of 6 + your ranged bonus.", ops: [{ do: "shield", amount: 6, plusRangedBonus: true }] },

  // ===== DEFENSIVE SET (owner submission 2026-06-24): school-free shield/sustain cards. value 1, ante 1.
  // `icon` emojis are placeholders (owner's art to set).
  // NO explicit `ranged` flags needed here (owner 2026-07-06): the whole set derives its type from
  // opsTouchFoes — shields/armor/sustain touch no foe → TYPELESS ("none": no 🎯 badge, feeds neither
  // onPlayRanged nor onPlayMelee — a Buckler no longer buffs Runeblade). Taunt DOES touch a foe
  // (drags it) → ranged. Shield Bash strikes the front → melee. oForce (above) is the one
  // deliberately ranged-typed shield. =====
  dBuckler:    { name: "Tiny Buckler", ante: 1, cost: 2, icon: "🛡", color: "#6cd6ff", text: "Gain a 1-point shield.",              ops: [{ do: "shield", amount: 1 }] },
  dTaunt:      { name: "Taunt",        ante: 1, cost: 2, ranged: true, icon: "🪧", color: "#e0c060", text: "Drag your aimed foe to the front of YOUR lane.", ops: [{ do: "pullFront", target: "pick" }] },
  dShield:     { name: "Shield",       ante: 1, cost: 3, icon: "🛡", color: "#6cd6ff", text: "Gain a 2-point shield.",              ops: [{ do: "shield", amount: 2 }] },
  dShieldBash: { name: "Shield Bash",  ante: 1, cost: 3, icon: "🛡", color: "#b0c0d0", text: "Gain 1 shield, then deal damage equal to your current shield to the front foe.", ops: [{ do: "shield", amount: 1 }, { do: "deal", ofShield: true, target: "front" }] },
  dHeartGuard: { name: "Heart Guard",  ante: 1, cost: 4, icon: "💗", color: "#f08aa0", text: "Gain a 2-point shield and heal 2.",   ops: [{ do: "shield", amount: 2 }, { do: "healSelf", amount: 2 }] },
  dThorns:     { name: "Thorns",       ante: 1, cost: 4, lasting: true, icon: "🌵", color: "#8aa06a", text: "This fight: attackers take 1 damage when they hit you.", ops: [{ do: "thorns", amount: 1 }] },
  dStoneskin:  { name: "Stoneskin",    ante: 1, cost: 5, lasting: true, icon: "🪨", color: "#9a9aa0", text: "This fight: take 1 less damage from all sources.", ops: [{ do: "buff", buff: "stoneskin", amount: 1, dur: 9999 }] },
  dBloodIron:  { name: "Blood To Iron", ante: 1, cost: 5, icon: "🩸", color: "#a04050", text: "For 6 seconds, each hit you take is counted; when it ends, gain 1 shield per hit.", ops: [{ do: "bloodToIron", dur: 60 }] },
  dTowerShield:{ name: "Tower Shield", ante: 1, cost: 5, icon: "🛡", color: "#6cd6ff", text: "Gain a 5-point shield.",              ops: [{ do: "shield", amount: 5 }] },
  dTrollskin:  { name: "Trollskin Tiara",     ante: 1, cost: 4, lasting: true, icon: "👑", color: "#7fb08a", text: "This fight: heal 2 every 6 seconds.", ops: [{ do: "regen", kind: "heal", amount: 2, period: 60 }] },
  dLiquidMetal:{ name: "Liquid Metal Crown",  ante: 1, cost: 6, lasting: true, icon: "👑", color: "#c0c0d8", text: "This fight: gain 3 shield every 6 seconds.", ops: [{ do: "regen", kind: "shield", amount: 3, period: 60 }] },

  // ===== OWNER BATCH (designs submitted 2026-06-25) — faithfully implemented as engine cards. value 1,
  // ante 1; `cost` = chosen moxie price (see report for the anchor each is pinned to). `icon` emojis are
  // placeholders (owner's art to set). FLAGGED unspecified numbers are noted in the card comment. =====
  oOmnislash:  { name: "Omnislash",    ante: 1, cost: 6, kind: "melee", icon: "🗡", color: "#ffd24a", text: "Melee the front foe 4 times for 2 each.",
                 ops: [{ do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }] }, // FLAGGED: owner didn't set per-hit dmg — picked 2 (8 base, scales 4× off melee bonus)
  oHaste:      { name: "Haste",        ante: 1, cost: 4, icon: "⚡", color: "#ffe06a", text: "You (or your ally-target) gain double moxie for 6 seconds.", ops: [{ do: "buff", buff: "haste", amount: 1, dur: 60 }] },
  oHedgeKnight:{ name: "Hedgefund Knight", ante: 1, cost: 6, icon: "🤴", color: "#d8c050", text: "Summon a Hedgefund Knight (hp 5, +1 damage, +1 damage resist).", ops: [{ do: "summon", body: "hedgeKnight", count: 1 }] },
  oMoxiePool:  { name: "Moxie Pool",   ante: 1, cost: 3, lasting: true, icon: "💧", color: "#5fd0ff", text: "This fight: gain 1 moxie every 6 seconds.", ops: [{ do: "regen", kind: "moxie", amount: 1, period: 60 }] },
  oGlacius:    { name: "Glacius",      ante: 1, cost: 7, kind: "melee", icon: "❄", color: "#a8e0ff", text: "Deal 8 to the front foe.", ops: [{ do: "deal", amount: 8, target: "front" }] },
  // SHARPENED EDGES — MODAL (owner 2026-07-09): on play the PLAYER picks melee OR ranged; +1 to all
  // cards of that kind this fight. Wizard Hat (the old ranged-only twin) is MERGED IN and DELETED. A
  // FOE has no reticle → it auto-picks by its body archetype (melee body → melee, ranged → ranged,
  // flex → the default). The `modalBonus` op carries the choice (see cardPick + resolveOps).
  oBigWizardHat: { name: "Big Wizard Hat", ante: 1, cost: 6, icon: "🎩", color: "#9b8cff", text: "This fight: all your ranged cards deal +3.", ops: [{ do: "rangedBonus", amount: 3 }] }, // owner 2026-07-09: ⚡5, +3 ranged for the combat (fixed-ranged counterpart to the retired Wizard Hat which merged into modal Sharpened Edges)
  oSharpEdges: { name: "Sharpened Edges", ante: 1, cost: 3, icon: "🗡", color: "#cfd8e2", text: "This fight: pick melee or ranged — all your cards of that kind deal +1.", ops: [{ do: "modalBonus", amount: 1 }] }, // cost 2 UNCHANGED (owner: Power Up sits ABOVE this)
  oRepeatXbow: { name: "Repeating Crossbow", ante: 1, cost: 2, ranged: true, kind: "melee", icon: "🏹", color: "#c8d870", text: "Deal 1 to any foe you target (melee).", ops: [{ do: "deal", amount: 1, target: "pick" }] },
  // DEMON FORM — MODAL, per-tick (owner 2026-07-09): pick melee or ranged; +1 to THAT kind every 6s
  // (lasting). Foe auto-picks by archetype. The `regen kind:"modalBonus"` op resolves the chosen kind
  // AT CAST into a meleeBonus/rangedBonus regen record (see resolveOps), so the tick handler is unchanged.
  oDemonForm:  { name: "Demon Form",   ante: 1, cost: 3, lasting: true, icon: "😈", color: "#b85c6e", text: "This fight: pick melee or ranged — gain +1 to that kind every 6 seconds.", ops: [{ do: "regen", kind: "modalBonus", amount: 1, period: 60 }] }, // FLAG: cost 2 picked (owner: "deal 1 but be cheaper" than ⚡3 → +1 bonus at ⚡2). +1/6s are owner's numbers.
  // SAGE MODE — REPURPOSED to a lasting HEAL (owner 2026-07-09): no longer +ranged (Demon Form's modal
  // covers ranged now). Heals every 6s, the Trollskin Tiara pattern. Costs MORE than Demon Form.
  oSageMode:   { name: "Sage Mode",    ante: 1, cost: 4, lasting: true, icon: "🧙", color: "#8a9cff", text: "This fight: heal 2 every 6 seconds.", ops: [{ do: "regen", kind: "heal", amount: 2, period: 60 }] }, // FLAG: heal 2 / cost 3 picked (owner suggested heal 2, ⚡3+; ⚡3 is the floor of "more than Demon Form ⚡2"). NOTE: heal-2 @ ⚡3 EXACTLY duplicates Trollskin Tiara — owner may want to differentiate (heal 3, or a different cost).
  oBerserker:  { name: "Berserker Armor", ante: 1, cost: 4, lasting: true, icon: "🪓", color: "#a04050", text: "This fight every 6 seconds: gain +1 melee damage, 1 shield, and take 1 damage.", ops: [{ do: "regen", kind: "berserk", amount: 1, melee: 1, shield: 1, period: 60 }] }, // FLAGGED: combo — +1 melee bonus & +1 shield & 1 self-dmg per period; the granted shield usually eats the self-dmg
  oPileOn:     { name: "Pile On",      ante: 1, cost: 3, kind: "melee", icon: "👥", color: "#e0c060", text: "Melee the front foe for damage equal to the allies in your lane, counting yourself (at least 1).", ops: [{ do: "deal", amount: 1, perAlly: 1, target: "front" }] }, // base 1 = YOU count (owner 2026-07-08: floor of 1 when solo); perAlly adds +1 per OTHER ally on top — same math as counting self
  // === NEW CARDS (owner 2026-06-27, batch B) ============================================
  oButcherCleaver: { name: "Butcher's Cleaver", ante: 1, cost: 5, kind: "melee", icon: "🔪", color: "#c0504a", text: "Deal 4 to the front foe; heal the damage dealt.", ops: [{ do: "deal", amount: 4, target: "front", lifesteal: true }] },
  oPetLeech:   { name: "Pet Leech",    ante: 1, cost: 4, ranged: true, lasting: true, icon: "🪱", color: "#8a6a4a", text: "This fight, every 6 seconds: deal 1 to your aimed foe and heal 1.", ops: [{ do: "timer", period: 60, ops: [{ do: "deal", amount: 1, target: "pick", lifesteal: true }] }] },
  oSlow:       { name: "Slow",         ante: 1, cost: 3, ranged: true, icon: "🐌", color: "#8a9cff", text: "Halve your aimed foe's moxie gain for 6 seconds.", ops: [{ do: "slow", target: "pick", dur: 60 }] },
  oAnimatedBlade: { name: "Animated Blade", ante: 1, cost: 4, kind: "melee", lasting: true, icon: "⚔", color: "#c8d0d8", text: "This fight, every 6 seconds: melee the front foe for 1.", ops: [{ do: "timer", period: 60, ops: [{ do: "deal", amount: 1, target: "front" }] }] },
  oWeakness:   { name: "Weakness",     ante: 1, cost: 3, ranged: true, icon: "📉", color: "#a08aae", text: "Your aimed foe deals half damage (rounded up) for 6 seconds.", ops: [{ do: "weakness", target: "pick", dur: 60 }] },
  // ===== OWNER BATCH C (designs submitted 2026-07-06, late-night drop) — faithfully implemented.
  // Every number the owner did NOT state is FLAGGED in its card's comment (his to re-tune);
  // `icon` emojis are placeholders (owner's art to set). =====
  oMoonGreat:  { name: "Moonlight Greatsword", ante: 1, cost: 6, kind: "melee", icon: "🌙", color: "#9fb8e8", text: "Deal 4 to the front foe, adding BOTH your melee and ranged bonuses. If both are 3+, it strikes your whole lane instead.",
                 ops: [{ do: "deal", amount: 4, target: "front", bothKinds: true, laneWhenDual: 3 }] }, // FLAGGED: base 4 + cost 5 picked (owner gave the dual mechanic + the 3+ gate, no damage/cost). LANE form fires BOTH melee AND ranged play-triggers (owner 2026-07-09); the FRONT form stays MELEE-only (his ruling named only the lane form — say if the front form should fire both too).
  oDualHand:   { name: "Dual-Handing Two-Handers", ante: 1, cost: 4, lasting: true, icon: "🙌", color: "#d8c050", text: "This fight: your melee cards costing 5 or more cost 3 less.", ops: [{ do: "twoHand" }] }, // FLAGGED: cost 3 picked
  oPowerWordGun: { name: "Power Word: Gun", ante: 1, cost: 10, ranged: true, icon: "🔫", color: "#ff5a3c", text: "Deal 13 to your aimed foe.", ops: [{ do: "deal", amount: 13, target: "pick" }] },
  // FLAG (owner 2026-07-09): asked to make Gravity Greatshield "only affect the lane it's in". It's a
  // SELF-CAST shield, so "the lane it's in" = the CASTER'S OWN lane → the sap op carries
  // target:"selfLane" (foes in source.lane, hero-cast; heroes in the foe's own lane, foe-cast).
  // Amounts unchanged (shield 6 / sap 3 / dur 60). Owner to confirm the "caster's own lane" read.
  oGravityShield: { name: "Gravity Greatshield", ante: 1, cost: 6, icon: "🕳", color: "#8a9cff", text: "Gain a 6-point shield; foes in your lane deal 3 less damage for 6 seconds.",
                 ops: [{ do: "shield", amount: 6 }, { do: "sap", amount: 3, dur: 60, target: "selfLane" }] },
  oTreasureBlade: { name: "Treasure Blade", ante: 1, cost: 4, kind: "melee", icon: "💰", color: "#e6c34a", text: "Deal 3 to the front foe; gain moxie equal to the damage dealt.", ops: [{ do: "deal", amount: 3, target: "front", moxieFromDealt: true }] }, // FLAGGED: base 3 / cost 3 picked
  oRainblow:   { name: "Rainblow Blade", ante: 1, cost: 4, icon: "🌈", color: "#c07fe8", text: "Strike the front foe for your melee + ranged bonuses; 6 seconds later, strike your whole lane the same way.",
                 ops: [{ do: "deal", amount: 0, target: "front", bothKinds: true },   // NEW (owner 2026-07-09): immediate front strike, melee + ranged
                        { do: "timer", period: 60, once: true, ops: [{ do: "deal", amount: 0, target: "lane", bothKinds: true }] }] }, // FLAGGED: base 0 both = pure melee+ranged scaling (owner's words — add a flat base if wanted); cost 3 UNCHANGED though the card gained a hit → may warrant a cost bump (owner's call). Delayed lane strike still fires BOTH play-triggers. TYPE NOTE: the new direct front `deal` makes cardKind="melee", so at CAST Rainblow now classifies MELEE (was ranged) — affects Lizard-Wizard pricing + which play-trigger fires at cast; the immediate front strike does NOT force both triggers. Say if you want BOTH hits to fire melee+ranged triggers uniformly.
  oEarthElemental: { name: "Earth Elemental", ante: 1, cost: 5, icon: "⛰", color: "#9a8c6a", text: "Summon an Earth Elemental: it wards whoever's in front of it (or itself) and jabs the front foe.", ops: [{ do: "summon", body: "earthElemental", count: 1 }] }, // FLAGGED: cost 4 + token hp 4 / ward 2 / jab 1 picked
  oJesterplate: { name: "Jesterplate", ante: 1, cost: 4, lasting: true, icon: "🃏", color: "#e08ac0", text: "This fight: gain 1 moxie every time you take damage.", ops: [{ do: "moxieOnHit", amount: 1 }] }, // FLAGGED: cost 3 picked
  oLavaElemental: { name: "Lava Elemental", ante: 1, cost: 6, icon: "🌋", color: "#ff7a3c", text: "Summon a Lava Elemental: it scorches the whole foe lane.", ops: [{ do: "summon", body: "lavaElemental", count: 1 }] }, // FLAGGED: cost 5 + token hp 3 / surge 1 picked
  oWhip:       { name: "Whip", ante: 1, cost: 4, kind: "melee", icon: "〰️", color: "#c9a98c", text: "Deal 2 to every foe in your lane (melee).", ops: [{ do: "deal", amount: 2, target: "lane" }] }, // FLAGGED: base 2 / cost 3 picked (owner: lane damage, tagged melee)
  oCrossBlade: { name: "Cross-Blade", ante: 1, cost: 5, kind: "melee", icon: "✚", color: "#cfd8e2", text: "Deal 2 to every foe in your lane (melee), then again in 6 seconds.",
                 ops: [{ do: "deal", amount: 2, target: "lane" }, { do: "timer", period: 60, once: true, ops: [{ do: "deal", amount: 2, target: "lane" }] }] }, // FLAGGED: base 2 / cost 4 picked; the echo strike scales melee but fires no play-triggers (a timer, not a play)
  oContinentClub: { name: "Continent-Club", ante: 1, cost: 10, kind: "melee", icon: "🏔", color: "#b88a5a", text: "Deal 12 to the front foe; excess damage overflows down the lane.", ops: [{ do: "deal", amount: 12, target: "front", overflow: true }] },
  oTeleBlades: { name: "Telekinetic Blades", ante: 1, cost: 4, lasting: true, icon: "🔮", color: "#9b8cff", text: "This fight: your melee cards strike your AIMED foe instead of the front, scaling with your ranged bonus.", ops: [{ do: "tkBlades" }] }, // FLAGGED: cost 3 picked; read = melee cards aim (front→pick) + take the RANGED bonus; play-triggers still melee — say if those should flip too
  oGiantsBelt: { name: "Giant's Belt", ante: 1, cost: 6, lasting: true, icon: "🥋", color: "#a0b070", text: "This fight: your max health doubles and you heal the gained amount.", ops: [{ do: "giantBelt" }] }, // FLAGGED: cost 5 picked; duration read as THIS FIGHT (owner said "passive" — worn passives are dead per his own 7/06 ruling, so it's a lasting cast like Stoneskin)
  // COOL SHOES — a CASTABLE LASTING card (owner 2026-07-06: "There's no such thing as a passive…
  // They're just a card. They have a castable moxie cost! They're a passive like Stoneskin is a
  // passive."). This KILLS the worn-passive class for live content: shoes are drawn, cast for ⚡3,
  // and install a fight-long +1-moxie-per-play buff (the Stoneskin pattern) — no more invisible
  // always-on-from-the-backpack behavior. Symmetric: a foe casts them from its queue like any card.
  coolShoes:   { name: "Cool Shoes",   ante: 1, cost: 4, lasting: true, icon: "👟", color: "#5fd0ff", text: "This fight: gain 1 moxie each time you play a card.", ops: [{ do: "moxieOnPlay", amount: 1 }] },

  // ===== OWNER BATCH D (designs submitted 2026-07-07) — faithfully implemented. Every number the
  // owner did NOT state carries a FLAG comment at its definition (his to re-tune); ante 1 keeps the
  // pool-wide "every owner card is value 1" convention. `icon` emojis are placeholders (owner art
  // pending — client ART_ALIAS is owned by the parallel renderer agent). =====
  // BLACK HOLE — REWORKED (owner 2026-07-10): "raise its cost to 10, make it cover the ENTIRE board
  // (every lane + the back-line boss), and buff its damage to be more impactful." target "board" =
  // every foe in every lane PLUS the back-line boss (deal + sap both). The old "pickLane" (aimed-lane
  // only) is retired. The debuff reuses batch C's `sap` machinery (flat −N outgoing damage), now
  // board-wide via the same "board" target (falls through to sap's whole-board branch on both sides).
  oBlackHole:  { name: "Black Hole", ante: 1, cost: 10, icon: "⚫", color: "#7f5fd0", text: "Deal 10 to EVERY foe on the board (all lanes + the back-line boss); those foes deal 8 less for 6 seconds.",
                 ops: [{ do: "deal", amount: 10, target: "board" }, { do: "sap", amount: 8, dur: 60, target: "board" }] }, // FLAG: dmg 10 is my PROPOSED buff (owner to set) — up from 8, now board-wide. cost 10 / sap −8 / 6s are the owner's numbers (cost 10 per his 7/10 addendum, capped like PW:Gun/Continent-Club/Grand Spirit).
  // LION LANCE (owner: "melee deal damage and gain a sword bonus for the rest of combat"; ruled
  // 2026-07-07 melee-typed, melee-school damage — falls out of the front-foe strike). RIDER CHANGED
  // (owner 2026-07-09): the "+1 melee for the fight" rider becomes the GENERIC +1 (the `counter` op)
  // that lifts BOTH melee and ranged — kept the deal-3-to-front. Granted AFTER the strike (ops in order).
  oLionLance:  { name: "Lion Lance", ante: 1, cost: 5, icon: "🦁", color: "#e0a050", text: "Deal 3 to the front foe; gain +1 damage (melee AND ranged) for the rest of the fight.",
                 ops: [{ do: "deal", amount: 3, target: "front" }, { do: "counter", amount: 1 }] }, // FLAG: dmg 3 / +1 generic / cost 4 UNCHANGED — a Sword (3 dmg) fused with a Power Up tick (+1 both). Card stays MELEE-typed (the front deal), only the rider widened melee→both.
  // CRYSTAL BALL (owner: "pick a card from your deck to put in your hand and gain +1 ranged for
  // combat"). RANGED BY OWNER FIAT (owner 2026-07-07: "crystal ball IS ranged") — the SECOND explicit
  // `ranged` exception to the foe-affecting derivation, exactly like oForce: 🎯 badge, feeds ranged
  // play-triggers (Runeblade), takes ranged kind-pricing (Lizard Wizard −1). The tutor is the new
  // `tutor` op — the play message's `pick` (a draw-pile card KEY) chooses; bad/missing pick → random.
  oCrystalBall:{ name: "Crystal Ball", ante: 1, cost: 4, ranged: true, icon: "🧿", color: "#b48fe0", text: "Put a card of your choice from your draw pile into your hand; gain +1 ranged damage this fight.",
                 ops: [{ do: "tutor" }, { do: "rangedBonus", amount: 1 }] }, // FLAG: cost 3 picked (a fight-long +1 ranged is ~⚡2; the tutor is worth ~⚡1 on top). +1 ranged is the owner's number.
  // MIRROR SHIELD (owner: "gain shield and the next foe attack that hits you hits them as well").
  // The reflect is a one-shot charge (`mirror` op → mirrorShield counter, consumed by the next attack
  // that LANDS on the wearer — reflects the landed amount back at the attacker). Typeless (self card).
  oMirrorShield:{ name: "Mirror Shield", ante: 1, cost: 5, icon: "🪞", color: "#9fd8e8", text: "Gain a 3-point shield; the next foe attack that hits you strikes the attacker back for the same damage.",
                 ops: [{ do: "shield", amount: 3 }, { do: "mirror" }] }, // FLAG: shield 3 / cost 4 picked (dShield 2→⚡2 + the one-shot reflect ≈ ⚡2); recasts stack another charge, consumed one per attack
  // GRAND SPIRIT (owner: "10 moxie summon that when you play it lets you pick between three of its
  // bodies, attacker, caster, or tank"). The `summonPick` op resolves the play message's `pick`
  // ("attacker"/"caster"/"tank") to a token body; foes/bots (no interactive pick) take `fallback`.
  oGrandSpirit:{ name: "Grand Spirit", ante: 1, cost: 10, icon: "👻", color: "#8fd0b8", text: "Summon a Grand Spirit — choose its body: Attacker, Caster, or Tank.",
                 ops: [{ do: "summonPick", options: { attacker: "grandAttacker", caster: "grandCaster", tank: "grandTank" }, fallback: "attacker" }] }, // FLAG: default pick = attacker (the most universally useful body when nobody chooses); cost 10 is the owner's number

  // ===== W2-B SPECIAL SHIELDS (owner 2026-07-10): shields that carry a per-shield DAMAGE MODIFIER
  // (`shieldMod`). The shield op records a segment in `shieldSegs`; absorbShield spends those segments
  // (special-before-normal, FIFO) with their modifier before the plain scalar pool. Typeless self
  // cards (no `type`/`ranged`/`kind`) — pure shields, like dShield. Icons/colors are PLACEHOLDER art
  // (art direction is the owner's). =====
  // PUNISHMENT GLUTTON — "Gain 10 shield, this shield takes double damage." The 10 display drains 2×
  // fast (each point of hit spends 2 shield → ~5 real absorption); overflow carries to HP as normal.
  oPunishGlutton:{ name: "Punishment Glutton", ante: 1, cost: 4, icon: "🩸", color: "#c0607a", text: "Gain a 10-point shield that takes double damage.",
                 ops: [{ do: "shield", amount: 10, shieldMod: "double" }] }, // FLAG cost 4: ~5 effective absorption (10 at 2×), like dTowerShield's 5 (⚡5) but front-loaded/flashier — owner's number. Amount 10 is owner-stated.
  // SWORDS OF REVEALING LIGHT — "Gain 3 shield, this shield takes 1 damage max." Chips ≤1 off itself
  // per hit; the rest of a big hit PASSES THROUGH (→ HP here, or the next shield if stacked). Anti-chip.
  oRevealLight:{ name: "Swords of Revealing Light", ante: 1, cost: 3, icon: "🗡", color: "#f0d890", text: "Gain a 3-point shield that takes at most 1 damage per hit.",
                 ops: [{ do: "shield", amount: 3, shieldMod: "cap1" }] }, // FLAG cost 3: a durable anti-chip 3-shield (great vs many small hits, weak vs big ones) ≈ dShield tier (⚡3) — owner's number. Amount 3 is owner-stated. FLAG overflow reading: pass-through-to-HP (literal "1 damage max"), owner to confirm vs block.

  // ===== SUMMON-ONLY CARDS (owner 2026-06-24): the cards summon TOKENS cast. ante 0 (no economic
  // value) and NEVER in PLAYER_POOL — not draftable, not loot, not shop, not foe gear. A summoned
  // token earns moxie and casts these exactly like any other combatant (the symmetry pillar extended
  // to summons). Keyed `t*` so they're easy to keep out of every pool. =====
  tBite:       { name: "Bite", ante: 0, cost: 3, color: "#c9a98c", text: "Deal 1 to the front foe.", ops: [{ do: "deal", amount: 1, target: "front" }] }, // FLAG: token cost 2→3 (+1 sweep; owner never set token costs — his to tune)
  // Earth/Lava Elemental tokens (owner 2026-07-06): the summons' own casts. Numbers FLAGGED on the summon cards.
  tEarthWard:  { name: "Earth Ward", ante: 0, cost: 3, color: "#9a8c6a", text: "Shield the ally in front of it (or itself) for 2.", ops: [{ do: "shieldFront", amount: 2 }] }, // FLAG: token cost 2→3 (+1 sweep — owner's to tune)
  tLavaSurge:  { name: "Lava Surge", ante: 0, cost: 4, color: "#ff7a3c", text: "Deal 1 to every foe in its lane.", ops: [{ do: "deal", amount: 1, target: "lane" }] }, // FLAG: token cost 3→4 (+1 sweep — owner's to tune)
  // The Hedgefund Knight summon's swing: a +1'd bite (1 base + the knight's "+1 damage" baked in = 2).
  tKnightStrike:{ name: "Knight Strike", ante: 0, cost: 3, kind: "melee", color: "#d8c050", text: "Deal 2 to the front foe.", ops: [{ do: "deal", amount: 2, target: "front" }] }, // FLAG: token cost 2→3 (+1 sweep — owner's to tune)
  // Grand Spirit tokens' own casts (owner 2026-07-07 batch D): Attacker swings heavy, Caster scorches
  // its lane; the Tank reuses tEarthWard (the Earth Elemental's ward). Numbers FLAGGED on the bodies.
  tSpiritStrike:{ name: "Spirit Strike", ante: 0, cost: 4, kind: "melee", color: "#d0906a", text: "Deal 6 to the front foe.", ops: [{ do: "deal", amount: 6, target: "front" }] }, // FLAG: 6 dmg = 4 ×1.5 (owner "buff grand spirit by 50%" 2026-07-09); EXCLUSIVE to grandAttacker / ⚡4 (FLAG: token cost 3→4, +1 sweep — owner's to tune)
  tSpiritBolt: { name: "Spirit Bolt", ante: 0, cost: 4, color: "#8fb8e0", text: "Deal 3 to every foe in its lane.", ops: [{ do: "deal", amount: 3, target: "lane" }] }, // FLAG: 3 lane = 2 ×1.5 (owner +50% 2026-07-09); EXCLUSIVE to grandCaster / ⚡4 (FLAG: token cost 3→4, +1 sweep — owner's to tune)
};
// An item that's worn for an ongoing effect rather than pressed (no active ops). The kit/UI
// treats these as always-on badges, not cooldown buttons.
export const isPassiveItem = (key) => !!KIT[key]?.passive && !(KIT[key]?.ops?.length);
// FOE-AFFECTING (owner 2026-07-06): does any op (looking through timers) REACH A FOE — damage,
// a drag/push, a moxie drain, a hex? Self/ally cards (armor, shields, heals, buffs, ramps,
// summons) don't. This predicate is what "ranged" MEANS now: "the ranged tag should normally
// only apply to cards effecting foes. Like a projectile. A spell. Not armor."
// ("pickLane" = every foe in your AIMED foe's lane — legacy Black Hole target. "board" = the WHOLE
// board (every lane + the back-line boss) — the REWORKED Black Hole, owner 2026-07-10; both reach
// foes, so a card using them derives ranged.)
const FOE_TARGETS = new Set(["pick", "front", "front2", "lane", "pickLane", "board"]);
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

// PICK CONTRACT (owner 2026-07-07 batch D): a card whose play takes a CHOICE ships a `pick`
// descriptor on its snapshot card (cardDescriptor + the hand card) so the client can offer the
// choice and send it back as the play message's `pick` string. Derived straight from the ops:
//   summonPick → { kind: "summonBody", options: [{ key, label, icon: <token bodyKey> }, …] }
//   tutor      → { kind: "deckCard" }   (the client offers the player's own draw pile)
//   modalBonus / regen kind:"modalBonus" → { kind: "meleeRanged", options: [melee, ranged] }
//     (Sharpened Edges / Demon Form: the PLAYER picks the kind; a FOE auto-picks by archetype, no UI)
// null for every ordinary card — the field is simply absent from its descriptor.
export const cardPick = (key) => {
  for (const o of KIT[key]?.ops ?? []) {
    if (o.do === "summonPick") return { kind: "summonBody",
      options: Object.entries(o.options ?? {}).map(([k, body]) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), icon: body })) };
    if (o.do === "tutor") return { kind: "deckCard" };
    if (o.do === "modalBonus" || (o.do === "regen" && o.kind === "modalBonus")) return { kind: "meleeRanged",
      options: [{ key: "melee", label: "Melee", icon: "🗡" }, { key: "ranged", label: "Ranged", icon: "🎯" }] };
  }
  return null;
};

// Backpack/deck size has NO MAXIMUM (owner 2026-06-24): there is no buyable-slot economy and no
// gold — the only sanity ceiling is a high memory cap so a backpack can't grow unbounded. MAX_KIT
// survives ONLY as that ceiling; the gold-priced kit-slot ladder is GONE. (The squad give/swap
// gates still read MAX_KIT as a free-slot check, never a gameplay cap.)
export const MAX_KIT = 200;          // sanity ceiling ONLY (memory) — not a gameplay limit
