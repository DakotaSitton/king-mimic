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
const SUMMON_CARD_END = "The summon lasts until defeated or combat ends. This card leaves combat circulation until the fight ends.";
export const KIT = {
  // Kraken-only attack cards. They never enter PLAYER_POOL; the spawned tentacle picks the
  // floor-matched cost and the resolver reads its CURRENT HP at cast time.
  tKrakenTentacle1: { name: "Tentacle Crush", cost: 4, color: "#7f6fb0", text: "Deal damage equal to this tentacle's current health to the front foe.", ops: [{ do: "deal", ofHp: true, target: "front" }] },
  tKrakenTentacle2: { name: "Tentacle Crush", cost: 3, color: "#7f6fb0", text: "Deal damage equal to this tentacle's current health to the front foe.", ops: [{ do: "deal", ofHp: true, target: "front" }] },
  tKrakenTentacle3: { name: "Tentacle Crush", cost: 2, color: "#7f6fb0", text: "Deal damage equal to this tentacle's current health to the front foe.", ops: [{ do: "deal", ofHp: true, target: "front" }] },
  tKrakenTentacle4: { name: "Tentacle Crush", cost: 2, color: "#7f6fb0", text: "Deal damage equal to this tentacle's current health to the front foe.", ops: [{ do: "deal", ofHp: true, target: "front" }] },
  tClockworkVolley: { name: "Clockwork Volley", cost: 6, ranged: true, kind: "ranged", color: "#8aa6b8", text: "Deal 1 ranged damage to every foe in this lane.", ops: [{ do: "deal", amount: 1, target: "lane" }] },
  // ===== OWNER'S CANONICAL BASE SET (hand-designed, submitted 2026-06-22; FLATTENED to school-free
  // 2026-06-24). These are THE in-game cards: the draft wheel, starter decks, loot and shop draw from
  // PLAYER_POOL (= these keys). `cost` = moxie price; `ante` is overlaid from TEMP_CARD_VALUE_TIERS
  // below (owner 2026-07-13: provisional values 1 through 5). NO `type`/`mult`/
  // Power — every number is FLAT (pinned to the owner's own Power-2 baseline from `_ownerprobe.mjs`,
  // his to re-tune). melee→front/front2/front3 · ranged→aimed (`ranged:true`) · lane→whole lane. (The legacy
  // first-set + post-floor-3 cards were DELETED from KIT 2026-07-09 on owner's order "remove all the old
  // ones" — every retired key is gone; only these owner cards + the t* summon casts remain.) =====
  // --- MELEE ---
  oSword:      { name: "Sword",        ante: 1, cost: 3, color: "#cfd8e2", vfx: { kind: "sword", anchor: "target" }, text: "Deal 2 to the front foe.",                         ops: [{ do: "deal", amount: 2, target: "front" }] },
  oHatchet:    { name: "Hatchet",      ante: 1, cost: 4, color: "#d89060", text: "Deal 3 to the front foe.",                         ops: [{ do: "deal", amount: 3, target: "front" }] },
  oSpear:      { name: "Spear",        ante: 1, cost: 4, color: "#c0b8a0", text: "Deal 2 to the front foe AND the foe behind it.",   ops: [{ do: "deal", amount: 2, target: "front2" }] },
  oDagger:     { name: "Dagger",       ante: 1, cost: 2, color: "#e7e0c0", text: "Deal 1 to the front foe.",                         ops: [{ do: "deal", amount: 1, target: "front" }] },
  oMallet:     { name: "Mallet",       ante: 1, cost: 5, color: "#b88a5a", text: "Deal 4 to the front foe; gain shield equal to the damage dealt.", ops: [{ do: "deal", amount: 4, target: "front" }, { do: "shield", ofDealt: true }] },
  oZweihander: { name: "Zweihänder",   ante: 1, cost: 6, color: "#ffd24a", text: "Deal 5 to the front foe.",                         ops: [{ do: "deal", amount: 5, target: "front" }] },
  oTwinUchis:  { name: "Twin Uchis",   ante: 1, cost: 4, color: "#e0c060", text: "Deal 2 to the front foe twice (each hit takes your melee bonus).", ops: [{ do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }] },
  oPowerUp:    { name: "Power Up",     ante: 1, cost: 3, color: "#ff9a5a", text: "Gain +1 damage (melee AND ranged) for the rest of the fight.", ops: [{ do: "counter", amount: 1 }] }, // cost 3 = OWNER RULING 2026-07-11 (was 4 after the R2 sweep); effect unchanged — +1-to-both is the generic `counter` ramp.
  oComboBlade: { name: "Combo Blade",  ante: 1, cost: 1, color: "#ffb060", text: "Melee the front foe for 1.", ops: [{ do: "deal", amount: 1, target: "front" }] },
  // --- RANGED (aimed) ---
  oBow:        { name: "Bow",          ante: 1, cost: 4, ranged: true, kind: "melee", color: "#a8e06a", text: "Deal 2 to any foe you target (melee).", ops: [{ do: "deal", amount: 2, target: "pick" }] },
  oJavelin:    { name: "Javelin",      ante: 1, cost: 5, ranged: true, kind: "melee", color: "#c8d870", text: "Deal 5 to any foe you target (melee).", ops: [{ do: "deal", amount: 5, target: "pick" }] },
  oFire:       { name: "Fire",         ante: 1, cost: 5, ranged: true, color: "#ff7a3c", text: "Deal 6 to your aimed foe.",          ops: [{ do: "deal", amount: 6, target: "pick" }] },
  // ICE: ranged hit, then a six-second damage reduction equal to the damage that landed.
  oIce:        { name: "Ice",          ante: 1, cost: 5, ranged: true, color: "#a8e0ff", text: "Deal 3 to your aimed foe and reduce its damage by the same amount for 6 seconds.", ops: [{ do: "deal", amount: 3, target: "pick" }, { do: "sap", ofDealt: true, dur: 60, target: "pick" }] },
  oArcane:     { name: "Arcane",       ante: 1, cost: 2, ranged: true, color: "#9b8cff", text: "Deal 1 to your aimed foe.",          ops: [{ do: "deal", amount: 1, target: "pick" }] },
  oDark:       { name: "Dark",         ante: 1, cost: 5, ranged: true, color: "#8060a8", text: "Deal 4 to your aimed foe; heal the damage dealt.", ops: [{ do: "deal", amount: 4, target: "pick", lifesteal: true }] },
  oWind:       { name: "Wind",         ante: 1, cost: 3, ranged: true, color: "#bcd8ff", text: "Deal 2 to your aimed foe, then shove it to the front or back of its lane.", ops: [{ do: "deal", amount: 2, target: "pick" }, { do: "repositionPick", fallback: "back" }] },
  oEarth:      { name: "Earth",        ante: 1, cost: 5, ranged: true, color: "#a58b62", text: "Deal 3 to your aimed foe; gain temporary shield equal to the damage dealt for 6 seconds.", ops: [{ do: "deal", amount: 3, target: "pick" }, { do: "tempShield", ofDealt: true, dur: 60 }] },
  oBile:       { name: "Bile",         ante: 1, cost: 3, ranged: true, color: "#8fd14f", text: "Put 1 plus your ranged bonus poison on your aimed foe.", ops: [{ do: "poison", amount: 1, plusRangedBonus: true, target: "pick" }] },
  oAstralFist: { name: "Astral Fist",  ante: 1, cost: 8, ranged: true, color: "#8f7cff", text: "Deal 8 to your aimed foe; excess damage spills into foes behind it.", ops: [{ do: "deal", amount: 8, target: "pick", overflow: true }] },
  // FLAG (owner): "3 random targets" is implemented as three independent living-target rolls;
  // the same surviving target can be selected by more than one orb.
  oFlameOrbs:  { name: "Flame Orbs",   ante: 1, cost: 9, ranged: true, color: "#ff6b3d", text: "Deal 3 to a random target three times.", ops: [{ do: "deal", amount: 3, target: "random", hits: 3 }] },
  oLeechstorm: { name: "Leechstorm", ante: 1, cost: 7, ranged: true, color: "#8a6a4a", text: "Attach a leech to every foe in your aimed foe's lane. Every 6 seconds, each leech deals 1 plus your ranged bonus to its foe and heals you for that amount while you live. Leeches stack and last until their foe is defeated or combat ends.", ops: [{ do: "leech", amount: 1, plusRangedBonus: true, period: 60, target: "pickLane" }] },
  oMiasmicWave:{ name: "Miasmic Wave", ante: 2, cost: 7, ranged: true, color: "#739c50", text: "Put 3 plus your ranged bonus poison on every foe in your aimed foe's lane.", ops: [{ do: "poison", amount: 3, plusRangedBonus: true, target: "pickLane" }] },
  oTornado:    { name: "Tornado", ante: 2, cost: 5, ranged: true, color: "#bcd8ff", text: "Deal 1 plus your ranged bonus to every foe in your aimed foe's lane immediately. A tornado remains for this fight: it deals the same damage to foes entering its lane and to occupants every 6 seconds, then moves to an adjacent lane; its next move returns to the lane it left.", ops: [{ do: "tornado", amount: 1, plusRangedBonus: true, target: "pickLane", period: 60 }] },
  oTsunami:    { name: "Tsunami", ante: 2, cost: 8, ranged: true, color: "#4e9fd4", text: "Deal 6 to your aimed foe's lane, then move it left, right, or reverse its order.", ops: [{ do: "deal", amount: 6, target: "pickLane" }, { do: "laneArrange" }] },
  oLightningLance: { name: "Lightning Lance", ante: 2, cost: 4, ranged: true, color: "#5fd0ff", text: "Deal 4 to your aimed foe; excess damage leaps to another target.", ops: [{ do: "deal", amount: 4, target: "pick", overflowRandom: true }] },
  oHolyLance:  { name: "Holy Lance", ante: 3, cost: 5, ranged: true, color: "#74e69a", text: "Deal 3 to your aimed foe and heal allies in that lane by the damage dealt.", ops: [{ do: "deal", amount: 3, target: "pick" }, { do: "healPath", ofDealt: true }] },
  oLifedrain:  { name: "Lifedrain", ante: 4, cost: 6, ranged: true, lasting: true, color: "#8060a8", text: "Drain 4 plus ranged from your aimed foe now and every 6 seconds.", ops: [{ do: "deal", amount: 4, target: "pick", lifesteal: true }, { do: "leech", amount: 4, plusRangedBonus: true, period: 60, target: "pick" }] },
  oHex:        { name: "Hex", ante: 2, cost: 2, ranged: true, color: "#9b6cc0", text: "Your aimed foe takes 1 plus your ranged bonus more damage from all sources this fight.", ops: [{ do: "vulnerable", amount: 1, plusRangedBonus: true, target: "pick", dur: 9999 }] },
  oFlameSteps: { name: "Flame Steps", ante: 3, cost: 8, ranged: true, color: "#ff7a3c", text: "Deal 5 to every foe in your lane now and again in 6 seconds.", ops: [{ do: "deal", amount: 5, target: "lane" }, { do: "timer", period: 60, once: true, captureLane: "source", ops: [{ do: "deal", amount: 5, target: "storedLane" }] }] },
  oFlameStrike:{ name: "Flame Strike", ante: 4, cost: 7, ranged: true, lasting: true, color: "#ff633d", text: "Deal 4 to your aimed foe's lane now and every 6 seconds.", ops: [{ do: "deal", amount: 4, target: "pickLane" }, { do: "timer", period: 60, captureLane: "aimed", ops: [{ do: "deal", amount: 4, target: "storedLane" }] }] },
  oArcaneStorm:{ name: "Arcane Storm", ante: 3, cost: 6, ranged: true, color: "#9b8cff", text: "Deal 1 to random targets five times.", ops: [{ do: "deal", amount: 1, target: "random", hits: 5 }] },
  oEarthquake: { name: "Earthquake", ante: 3, cost: 9, ranged: true, lasting: true, color: "#a58b62", text: "Deal 1 to your aimed foe's lane; every 6 seconds repeat it with 1 more damage.", ops: [{ do: "deal", amount: 1, target: "pickLane" }, { do: "timer", period: 60, captureLane: "aimed", boost: 1, ramp: 1, ops: [{ do: "deal", amount: 1, target: "storedLane" }] }] },
  oDoomWhisper:{ name: "Doom Whisper", ante: 3, cost: 1, ranged: true, color: "#8060a8", text: "In 6 seconds, deal 2 to your aimed foe.", ops: [{ do: "timer", period: 60, once: true, captureTarget: true, ops: [{ do: "deal", amount: 2, target: "storedTarget" }] }] },
  // --- LANE / UTILITY ---
  oLightning:  { name: "Lightning",    ante: 1, cost: 5, color: "#5fd0ff", vfx: { kind: "lightning", anchor: "lane" }, text: "Deal 3 to every foe in your aimed foe's lane.",     ops: [{ do: "deal", amount: 3, target: "pickLane" }] },
  oMeteors:    { name: "Meteors",      ante: 1, cost: 6, color: "#ff5a3c", vfx: { kind: "meteors", anchor: "lane" }, text: "Deal 6 to every foe in your aimed foe's lane.",     ops: [{ do: "deal", amount: 6, target: "pickLane" }] },
  // BLIZZARD: Ice applied across the aimed foe's lane — the same hit and six-second damage reduction,
  // once per foe. `ofLastHit` keeps the reduction tied to each target's resolved hit instead of the
  // sum across the whole lane.
  oBlizzard:   { name: "Blizzard",     ante: 1, cost: 7, ranged: true, color: "#a8e0ff", text: "Deal 3 to every foe in your aimed foe's lane and reduce each foe's damage by the damage dealt to it for 6 seconds.", ops: [{ do: "deal", amount: 3, target: "pickLane" }, { do: "sap", ofLastHit: true, dur: 60 }] },
  oHoly:       { name: "Holy",         ante: 1, cost: 4, color: "#74e69a", text: "Heal your ally-target (or most-hurt lane ally) for 5 plus your ranged bonus.", ops: [{ do: "healAlly", amount: 5, plusRangedBonus: true }] },
  // FORCE (owner 2026-07-06): the ONE ranged-typed shield — every other shield is typeless. Its
  // explicit `ranged` keeps it feeding ranged play-triggers, and the shield SCALES off the wearer's
  // ranged bonus (plusRangedBonus → + rangedBonusOf in the shield op), so the text says so.
  oForce:      { name: "Force",        ante: 1, cost: 5, ranged: true, color: "#6cd6ff", text: "Gain a 6-point shield plus your ranged bonus.", ops: [{ do: "shield", amount: 6, plusRangedBonus: true }] },

  // ===== DEFENSIVE SET (owner submission 2026-06-24): school-free shield/sustain cards. value 1, ante 1.
  // `icon` emojis are placeholders (owner's art to set).
  // NO explicit `ranged` flags needed here (owner 2026-07-06): the whole set derives its type from
  // opsTouchFoes — shields/armor/sustain touch no foe → TYPELESS ("none": no 🎯 badge, feeds neither
  // onPlayRanged nor onPlayMelee — a Buckler no longer buffs Runeblade). Taunt DOES touch a foe
  // (drags it) → ranged. Shield Bash strikes the front → melee. oForce (above) is the one
  // deliberately ranged-typed shield. =====
  dBuckler:    { name: "Tiny Buckler", ante: 1, cost: 1, icon: "🛡", color: "#6cd6ff", text: "Gain a 1-point shield.",              ops: [{ do: "shield", amount: 1 }] },
  dTaunt:      { name: "Taunt",        ante: 1, cost: 1, ranged: true, icon: "🪧", color: "#e0c060", text: "Drag your aimed foe to the front of YOUR lane.", ops: [{ do: "pullFront", target: "pick" }] },
  dShield:     { name: "Shield",       ante: 1, cost: 3, icon: "🛡", color: "#6cd6ff", text: "Gain a 3-point shield.",              ops: [{ do: "shield", amount: 3 }] }, // shield 3 = OWNER RULING 2026-07-11 (was 2); cost ⚡3 unchanged
  dShieldBash: { name: "Shield Bash",  ante: 1, cost: 3, icon: "🛡", color: "#b0c0d0", text: "Gain a 1-point shield, then deal damage equal to your current shield to the front foe.", ops: [{ do: "shield", amount: 1 }, { do: "deal", ofShield: true, target: "front" }] },
  dHeartGuard: { name: "Heart Guard",  ante: 1, cost: 4, icon: "💗", color: "#f08aa0", text: "Gain a 2-point shield and heal 2.",   ops: [{ do: "shield", amount: 2 }, { do: "healSelf", amount: 2 }] },
  dThorns:     { name: "Thorns",       ante: 1, cost: 3, lasting: true, icon: "🌵", color: "#8aa06a", text: "This fight: attackers take 1 damage when they hit you.", ops: [{ do: "thorns", amount: 1 }] },
  dStoneskin:  { name: "Stoneskin",    ante: 1, cost: 4, lasting: true, icon: "🪨", color: "#9a9aa0", text: "This fight: take 1 less damage from all sources.", ops: [{ do: "buff", buff: "stoneskin", amount: 1, dur: 9999 }] },
  dGrit:       { name: "Grit", ante: 1, cost: 2, color: "#8794a3", text: "Gain 1 shield and 1 damage reduction for 6 seconds.", ops: [{ do: "shield", amount: 1 }, { do: "buff", buff: "stoneskin", amount: 1, dur: 60 }] },
  dBloodIron:  { name: "Blood To Iron", ante: 1, cost: 10, icon: "🩸", color: "#a04050", text: "Gain shield equal to your missing health now and every 6 seconds.", lasting: true, ops: [{ do: "shieldMissing" }, { do: "timer", period: 60, ops: [{ do: "shieldMissing" }] }] },
  oRedVial:    { name: "Red Vial", ante: 1, cost: 1, color: "#d74b55", text: "Heal 1.", ops: [{ do: "healSelf", amount: 1 }] },
  oMediumRedVial: { name: "Medium Red Vial", ante: 1, cost: 3, color: "#d74b55", text: "Heal 4.", ops: [{ do: "healSelf", amount: 4 }] },
  oMassiveRedVial: { name: "Massive Red Vial", ante: 1, cost: 8, color: "#d74b55", text: "Heal 11.", ops: [{ do: "healSelf", amount: 11 }] },
  oTranscend:  { name: "Transcend", ante: 2, cost: 10, color: "#d9d5ff", text: "Go to full health, then choose melee or ranged and gain +1 for each 5 health you have.", ops: [{ do: "healFull" }, { do: "modalBonusPerHp", divisor: 5 }] },
  dSawShield:  { name: "Saw Shield", ante: 2, cost: 3, kind: "melee", ranged: true, color: "#b0c0d0", text: "Gain 3 shield, then deal 1 to your aimed foe (melee).", ops: [{ do: "shield", amount: 3 }, { do: "deal", amount: 1, target: "pick" }] },
  dPatience:   { name: "Patience", ante: 2, cost: 8, color: "#8e9cb8", text: "Gain 8 shield and +2 melee and ranged for this fight.", ops: [{ do: "shield", amount: 8 }, { do: "counter", amount: 2 }] },
  dTowerShield:{ name: "Tower Shield", ante: 1, cost: 5, icon: "🛡", color: "#6cd6ff", text: "Gain a 5-point shield.",              ops: [{ do: "shield", amount: 5 }] },
  dTrollskin:  { name: "Trollskin Tiara",     ante: 1, cost: 2, lasting: true, icon: "👑", color: "#7fb08a", text: "This fight: heal 2 every 6 seconds.", ops: [{ do: "regen", kind: "heal", amount: 2, period: 60 }] },
  dLiquidMetal:{ name: "Liquid Metal Crown",  ante: 1, cost: 3, lasting: true, icon: "👑", color: "#c0c0d8", text: "This fight: gain 3 shield every 6 seconds.", ops: [{ do: "regen", kind: "shield", amount: 3, period: 60 }] },

  // ===== OWNER BATCH (designs submitted 2026-06-25) — faithfully implemented as engine cards. value 1,
  // ante 1; `cost` = chosen moxie price (see report for the anchor each is pinned to). `icon` emojis are
  // placeholders (owner's art to set). FLAGGED unspecified numbers are noted in the card comment. =====
  oOmnislash:  { name: "Omnislash",    ante: 1, cost: 6, kind: "melee", icon: "🗡", color: "#ffd24a", text: "Melee the front foe 4 times for 2 each.",
                 ops: [{ do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }] }, // FLAGGED: owner didn't set per-hit dmg — picked 2 (8 base, scales 4× off melee bonus)
  oHaste:      { name: "Haste",        ante: 1, cost: 3, icon: "⚡", color: "#ffe06a", text: "You (or your ally-target) gain double moxie for 6 seconds.", ops: [{ do: "buff", buff: "haste", amount: 1, dur: 60 }] },
  oHedgeKnight:{ name: "Hedgefund Knight", ante: 1, cost: 6, icon: "🤴", color: "#d8c050", text: `Summon a Hedgefund Knight in your lane, just in front of or behind you. It has 5 HP, takes 1 less damage from every hit, gains 1 moxie per second, and at 3 moxie automatically deals 2 to the front foe. ${SUMMON_CARD_END}`, ops: [{ do: "summon", body: "hedgeKnight", count: 1 }] },
  oMoxiePool:  { name: "Moxie Pool",   ante: 1, cost: 3, lasting: true, icon: "💧", color: "#5fd0ff", text: "This fight: gain 2 moxie every 6 seconds.", ops: [{ do: "regen", kind: "moxie", amount: 2, period: 60 }] },
  oGlacius:    { name: "Glacius",      ante: 1, cost: 8, kind: "melee", icon: "❄", color: "#a8e0ff", text: "In 6 seconds, deal 15 to the front foe.", ops: [{ do: "timer", period: 60, once: true, ops: [{ do: "deal", amount: 15, target: "front" }] }] },
  // SHARPENED EDGES — MODAL (owner 2026-07-09): on play the PLAYER picks melee OR ranged; +1 to all
  // cards of that kind this fight. Wizard Hat (the old ranged-only twin) is MERGED IN and DELETED. A
  // FOE has no reticle → it auto-picks by its body archetype (melee body → melee, ranged → ranged,
  // flex → the default). The `modalBonus` op carries the choice (see cardPick + resolveOps).
  oBigWizardHat: { name: "Big Wizard Hat", ante: 1, cost: 4, icon: "🎩", color: "#9b8cff", text: "This fight: ranged cards deal +3.", ops: [{ do: "rangedBonus", amount: 3 }] },
  oSharpEdges: { name: "Sharpened Edges", ante: 1, cost: 2, icon: "🗡", color: "#cfd8e2", text: "This fight: pick melee or ranged — all your cards of that kind deal +1.", ops: [{ do: "modalBonus", amount: 1 }] }, // cost 2 = OWNER RULING 2026-07-11 (was 3 after the R2 sweep; Power Up ⚡3 sits above it). PLAYER picks the kind at play (pick contract → client popover); a FOE picks by its own kit/bonuses (see modalKind, combat.js — heuristic FLAGGED there).
  oStudy:      { name: "Study",        ante: 1, cost: 1, icon: "📚", color: "#7f91bd", text: "Choose melee or ranged; in 6 seconds, gain +1 to that kind.", ops: [{ do: "timer", period: 60, once: true, pickKind: true, ops: [{ do: "modalBonus", amount: 1 }] }] },
  oRepeatXbow: { name: "Repeating Crossbow", ante: 1, cost: 4, ranged: true, kind: "melee", lasting: true, icon: "🏹", color: "#c8d870", text: "This fight, every 6 seconds: melee your target foe for 1.", ops: [{ do: "timer", period: 60, target: "pick", ops: [{ do: "deal", amount: 1, target: "pick" }] }] },
  // DEMON FORM — MODAL, per-tick (owner 2026-07-09): pick melee or ranged; +1 to THAT kind every 6s
  // (lasting). Foe auto-picks by archetype. The `regen kind:"modalBonus"` op resolves the chosen kind
  // AT CAST into a meleeBonus/rangedBonus regen record (see resolveOps), so the tick handler is unchanged.
  oDemonForm:  { name: "Demon Form",   ante: 1, cost: 3, lasting: true, icon: "😈", color: "#b85c6e", text: "This fight: pick melee or ranged — every 6 seconds gain +1 to that kind and take 1 damage.",
                 ops: [{ do: "regen", kind: "modalBonus", amount: 1, period: 60 },
                        { do: "timer", period: 60, ops: [{ do: "selfHit", amount: 1 }] }] }, // FLAG: cost 3 (pre-R2 2 + R2's +1). +1/6s modal bonus = owner's numbers. SELF-DAMAGE 1/6s, typeless — owner ruling 2026-07-10: the every-6s tick hits the CASTER (selfHit → selfDamage; shield eats first, fires on-damaged triggers), touches NO foe, so opsTouchFoes stays false → the card remains UNTYPED (no 🎯 badge, no ranged play-triggers, no Lizard-Wizard ranged pricing). Keeps the modal +melee/+ranged. FLAG 1 dmg / 6s (period 60).
  // SAGE MODE: every six seconds heals 1 and grows the melee/ranged kind chosen at cast.
  oSageMode:   { name: "Sage Mode",    ante: 1, cost: 4, lasting: true, icon: "🧙", color: "#8a9cff", text: "This fight: every 6 seconds, heal 1 and gain +1 melee or ranged.", ops: [{ do: "regen", kind: "heal", amount: 1, period: 60 }, { do: "regen", kind: "modalBonus", amount: 1, period: 60 }] },
  oBerserker:  { name: "Berserker Armor", ante: 1, cost: 2, lasting: true, icon: "🪓", color: "#a04050", text: "This fight, every 6 seconds: gain +1 melee damage, 1 shield, and take 1 damage.", ops: [{ do: "regen", kind: "berserk", amount: 1, melee: 1, shield: 1, period: 60 }] },
  // === NEW CARDS (owner 2026-06-27, batch B) ============================================
  oButcherCleaver: { name: "Butcher's Cleaver", ante: 1, cost: 5, kind: "melee", icon: "🔪", color: "#c0504a", text: "Deal 4 to the front foe; heal the damage dealt.", ops: [{ do: "deal", amount: 4, target: "front", lifesteal: true }] },
  // PET LEECH — REWORKED (OWNER RULINGS 2026-07-11): ⚡2 (was 4), and NOT a caster buff anymore — a
  // DEBUFF attached to the foe you have AIMED at cast time (the `leech` op → a drain record living ON
  // that foe): every 6s the carrier takes 1 + the caster's ranged bonus and the CASTER heals the same;
  // drain dies with the carrier / at fight end (no timer — each lasts the rest of combat). REUSABLE
  // by owner fiat — no lasting/once-per-fight grammar; each cast attaches to the currently aimed foe,
  // and same-foe casts STACK (owner-stated design: two leeches = 2 dmg / 2 heal per tick, etc.).
  // Renders as a chip ON THE FOE with the stack count (entityEffects).
  oPetLeech:   { name: "Pet Leech",    ante: 1, cost: 2, ranged: true, icon: "🪱", color: "#8a6a4a", text: "Attach a leech to your aimed foe: every 6 seconds it takes 1 + your ranged bonus and you heal the same. Leeches stack.", ops: [{ do: "leech", amount: 1, plusRangedBonus: true, period: 60 }] },
  oSlow:       { name: "Slow",         ante: 1, cost: 3, ranged: true, icon: "🐌", color: "#8a9cff", text: "Halve your aimed foe's moxie gain for 6 seconds.", ops: [{ do: "slow", target: "pick", dur: 60 }] },
  oAnimatedBlade: { name: "Animated Blade", ante: 1, cost: 4, kind: "melee", lasting: true, icon: "⚔", color: "#c8d0d8", text: "This fight, every 6 seconds: melee the front foe for 2.", ops: [{ do: "timer", period: 60, ops: [{ do: "deal", amount: 2, target: "front" }] }] },
  oWeakness:   { name: "Weakness",     ante: 1, cost: 3, ranged: true, icon: "📉", color: "#a08aae", text: "Your aimed foe deals half damage (rounded up) for 6 seconds.", ops: [{ do: "weakness", target: "pick", dur: 60 }] },
  // ===== OWNER BATCH C (designs submitted 2026-07-06, late-night drop) — faithfully implemented.
  // Every number the owner did NOT state is FLAGGED in its card's comment (his to re-tune);
  // `icon` emojis are placeholders (owner's art to set). =====
  oMoonGreat:  { name: "Moonlight Greatsword", ante: 1, cost: 6, kind: "both", ranged: false, icon: "🌙", color: "#9fb8e8", text: "Melee + ranged: deal 5 to the front foe, adding BOTH bonuses. If both are 3+, it also beams the whole lane for the same damage.",
                 ops: [{ do: "deal", amount: 5, target: "front", bothKinds: true, beamWhenDual: 3 }] },
  oDualHand:   { name: "Dual-Handing Two-Handers", ante: 1, cost: 4, lasting: true, icon: "🙌", color: "#d8c050", text: "This fight: melee cards you play that cost 6 or more are played an additional time.", ops: [{ do: "dualWield" }] }, // EFFECT REPLACED (owner 2026-07-10): was "your melee cards costing 5+ cost 3 less"; NOW melee cards costing ≥6 resolve one extra time this fight (playCard/foeCast `times += 1`, reusing the Neptune doubleExpensive replay path). FLAG: threshold 6 is a POST-R2 cost. FLAG: this-fight duration (per-fight `dualWield` flag, cleared in beginCombat). FLAGGED: cost 4 (R2 bumped the owner's picked 3).
  oPowerWordGun: { name: "Power Word: Gun", ante: 1, cost: 10, ranged: true, icon: "🔫", color: "#ff5a3c", text: "Deal 13 to your aimed foe.", ops: [{ do: "deal", amount: 13, target: "pick" }] },
  // FLAG (owner 2026-07-09): asked to make Gravity Greatshield "only affect the lane it's in". It's a
  // SELF-CAST shield, so "the lane it's in" = the CASTER'S OWN lane → the sap op carries
  // target:"selfLane" (foes in source.lane, hero-cast; heroes in the foe's own lane, foe-cast).
  // Amounts unchanged (shield 6 / sap 3 / dur 60). Owner to confirm the "caster's own lane" read.
  oGravityShield: { name: "Gravity Greatshield", ante: 1, cost: 6, icon: "🕳", color: "#8a9cff", text: "Gain a 6-point shield; foes in your lane deal 3 less damage for 6 seconds.",
                 ops: [{ do: "shield", amount: 6 }, { do: "sap", amount: 3, dur: 60, target: "selfLane" }] },
  oTreasureBlade: { name: "Treasure Blade", ante: 1, cost: 4, kind: "melee", icon: "💰", color: "#e6c34a", text: "Deal 3 to the front foe; gain moxie equal to the damage dealt.", ops: [{ do: "deal", amount: 3, target: "front", moxieFromDealt: true }] }, // FLAGGED: base 3 / cost 3 picked
  oRainblow:   { name: "Rainblow Blade", ante: 1, cost: 4, kind: "both", ranged: false, icon: "🌈", color: "#c07fe8", text: "Melee + ranged: strike the front foe for 1 + both bonuses; 6 seconds later, strike your whole lane the same way.",
                 ops: [{ do: "deal", amount: 1, target: "front", bothKinds: true },   // immediate front strike, melee + ranged
                         { do: "timer", period: 60, once: true, ops: [{ do: "deal", amount: 1, target: "lane", bothKinds: true }] }] }, // base 1 = OWNER RULING 2026-07-11 "give 1 base damage" (was 0/pure scaling). FLAG interpretation: he named ONE number without saying which hit — applied to BOTH the front strike AND the delayed lane strike; say if only one should carry it. cost 4 unchanged. Both strikes are statically melee+ranged (owner 2026-07-16).
  oEarthElemental: { name: "Earth Elemental", ante: 1, cost: 5, icon: "⛰", color: "#9a8c6a", text: `Summon an Earth Elemental in your lane, just in front of or behind you. It has 8 HP, gains 1 moxie per second, and at 5 moxie automatically deals 2 to the front foe and heals itself 2. ${SUMMON_CARD_END}`, ops: [{ do: "summon", body: "earthElemental", count: 1 }] },
  oJesterplate: { name: "Jesterplate", ante: 1, cost: 3, lasting: true, icon: "🃏", color: "#e08ac0", text: "This fight: gain 1 moxie every time you take damage.", ops: [{ do: "moxieOnHit", amount: 1 }] },
  oLavaElemental: { name: "Lava Elemental", ante: 1, cost: 7, icon: "🌋", color: "#ff7a3c", text: `Summon a Lava Elemental in your lane, just in front of or behind you. It has 10 HP, gains 1 moxie per second, and at 5 moxie automatically deals 3 to every foe in its lane. ${SUMMON_CARD_END}`, ops: [{ do: "summon", body: "lavaElemental", count: 1 }] },
  oWhip:       { name: "Whip", ante: 1, cost: 4, kind: "melee", icon: "〰️", color: "#c9a98c", text: "Deal 2 to every foe in your lane (melee); the front foe takes 3.", ops: [{ do: "deal", amount: 2, target: "lane", frontExtra: 1 }] }, // OWNER RULING 2026-07-11: +1 to the FRONT foe (front takes 3, rest of lane 2); cost unchanged. FLAG mechanism: `frontExtra` = a FLAT +N rider on the lane hit for the lane's front foe only (applied after bonuses — a melee bonus lifts the whole lane, the front still lands exactly +1 above the rest); the foe threat bar prints the per-target lane hit (the front's +1 lives in the text).
  oCrossBlade: { name: "Cross-Blade", ante: 1, cost: 5, kind: "melee", icon: "✚", color: "#cfd8e2", text: "Deal 2 to every foe in your lane (melee), then again in 6 seconds.",
                 ops: [{ do: "deal", amount: 2, target: "lane" }, { do: "timer", period: 60, once: true, ops: [{ do: "deal", amount: 2, target: "lane" }] }] }, // FLAGGED: base 2 / cost 4 picked; the echo strike scales melee but fires no play-triggers (a timer, not a play)
  oContinentClub: { name: "Continent-Club", ante: 1, cost: 10, kind: "melee", icon: "🏔", color: "#b88a5a", text: "Deal 12 to the front foe; excess damage overflows down the lane.", ops: [{ do: "deal", amount: 12, target: "front", overflow: true }] },
  oTeleBlades: { name: "Telekinetic Blades", ante: 1, cost: 3, lasting: true, icon: "🔮", color: "#9b8cff", text: "This fight: your melee cards strike your AIMED foe instead of the front, scaling with your ranged bonus.", ops: [{ do: "tkBlades" }] },
  oGiantsBelt: { name: "Giant's Belt", ante: 1, cost: 5, lasting: true, icon: "🥋", color: "#a0b070", text: "Once per fight, double your base max HP and heal the gained amount.", ops: [{ do: "giantBelt" }] },
  // COOL SHOES — a CASTABLE LASTING card (owner 2026-07-06: "There's no such thing as a passive…
  // They're just a card. They have a castable moxie cost! They're a passive like Stoneskin is a
  // passive."). This KILLS the worn-passive class for live content: shoes are drawn, cast for ⚡3,
  // and install a fight-long +1-moxie-per-play buff (the Stoneskin pattern) — no more invisible
  // always-on-from-the-backpack behavior. Symmetric: a foe casts them from its queue like any card.
  coolShoes:   { name: "Cool Shoes",   ante: 1, cost: 3, lasting: true, icon: "👟", color: "#5fd0ff", text: "This fight: gain 1 moxie each time you play a card.", ops: [{ do: "moxieOnPlay", amount: 1 }] },

  // ===== OWNER BATCH D (designs submitted 2026-07-07) — faithfully implemented. Every number the
  // owner did NOT state carries a FLAG comment at its definition (his to re-tune); literal ante 1 is
  // normalized below by the owner's temporary five-band value overlay. `icon` emojis are placeholders (owner art
  // pending — client ART_ALIAS is owned by the parallel renderer agent). =====
  // BLACK HOLE: immediate board-wide 8, then another board-wide 8 every six seconds.
  oBlackHole:  { name: "Black Hole", ante: 1, cost: 10, lasting: true, icon: "⚫", color: "#7f5fd0", text: "Deal 8 to every foe and boss, then retrigger every 6 seconds.",
                 ops: [{ do: "deal", amount: 8, target: "board" }, { do: "timer", period: 60, ops: [{ do: "deal", amount: 8, target: "board" }] }] },
  // LION LANCE: Spear's two-target hit plus a permanent +2 generic damage rider.
  oLionLance:  { name: "Lion Lance", ante: 1, cost: 5, icon: "🦁", color: "#e0a050", text: "Deal 2 to the front foe AND the foe behind it; gain +2 damage (melee AND ranged) for the rest of the fight.",
                 ops: [{ do: "deal", amount: 2, target: "front2" }, { do: "counter", amount: 2 }] },
  // CRYSTAL BALL (owner: "pick a card from your deck to put in your hand and gain +1 ranged for
  // combat"). RANGED BY OWNER FIAT (owner 2026-07-07: "crystal ball IS ranged") — the SECOND explicit
  // `ranged` exception to the foe-affecting derivation, exactly like oForce: 🎯 badge, feeds ranged
  // play-triggers (Runeblade), takes ranged kind-pricing (Lizard Wizard −1). The tutor is the new
  // `tutor` op — the play message's `pick` (a draw-pile card KEY) chooses; bad/missing pick → random.
  oCrystalBall:{ name: "Crystal Ball", ante: 4, cost: 4, ranged: true, icon: "🧿", color: "#b48fe0", text: "Put a card of your choice from your deck into your hand; gain +1 ranged damage this fight.",
                 ops: [{ do: "tutor" }, { do: "rangedBonus", amount: 1 }] }, // FLAG: cost 3 picked pre-R2 (now 4). +1 ranged is the owner's number. TUTOR POOL WIDENED (owner 2026-07-10 "let it pick ANY card including used ones"): the tutor now draws from the WHOLE deck — draw pile + DISCARD (already-played cards) — no longer excluding used cards. See the `tutor` op (combat.js) + the deckCard picker (client.js) which now offer drawPile + discPile.
  // MIRROR SHIELD (owner: "gain shield and the next foe attack that hits you hits them as well").
  // The reflect is a one-shot charge (`mirror` op → mirrorShield counter, consumed by the next attack
  // that LANDS on the wearer). REFLECT MAGNITUDE = OWNER RULING 2026-07-11 "if they hit with a 10
  // damage card it should reflect 10 damage": the FULL raw hit (the attacker's swing incl. its own
  // bonuses, BEFORE the wearer's DR/auras soften it), not the post-mitigation landed amount — see
  // reflectThorns (combat.js). Trigger semantics unchanged: one-shot, direct hits only. Typeless.
  oMirrorShield:{ name: "Mirror Shield", ante: 1, cost: 5, icon: "🪞", color: "#9fd8e8", text: "Gain a 4-point shield; the next foe attack that hits you strikes the attacker back for its full damage.",
                 ops: [{ do: "shield", amount: 4 }, { do: "mirror" }] },
  // GRAND SPIRIT (owner: "10 moxie summon that when you play it lets you pick between three of its
  // bodies, attacker, caster, or tank"). The `summonPick` op resolves the play message's `pick`
  // ("attacker"/"caster"/"tank") to a token body; foes/bots (no interactive pick) take `fallback`.
  oGrandSpirit:{ name: "Grand Spirit", ante: 1, cost: 10, icon: "👻", color: "#8fd0b8", text: `Choose and summon a Grand Spirit in your lane, just in front of or behind you. Attacker: 18 HP; at 3 moxie deals 5 to the front foe. Caster: 16 HP; at 6 moxie deals 5 to every foe in its lane. Tank: 20 HP; at 6 moxie deals 3 to the front foe, heals itself 3, and gains 3 shield. Every form gains 1 moxie per second and casts automatically. ${SUMMON_CARD_END}`,
                 ops: [{ do: "summonPick", options: { attacker: "grandAttacker", caster: "grandCaster", tank: "grandTank" }, fallback: "attacker" }] }, // FLAG: default pick = attacker (the most universally useful body when nobody chooses); cost 10 is the owner's number

  // ===== OWNER BATCH E (design submitted 2026-07-10) — faithfully implemented; unstated numbers FLAGGED. =====
  // JAW (owner 2026-07-10): "melee, cost 5. Hit the front foe for 3, and you HEAL for the damage done
  // AND gain SHIELD for the damage done — both equal to the damage that ACTUALLY landed, so if only 2
  // lands on a low-HP foe, heal 2 + shield 2." MELEE-typed (target:"front" → cardKind "melee", like
  // Sword/Mallet — fires melee play-triggers, NOT ranged). `lifesteal` = the heal; `shieldFromDealt` =
  // the shield (new op flag, parallel to lifesteal/moxieFromDealt); both read the SAME dealt total so
  // they stay EQUAL. `capLanded` caps that credited total to the damage the foe could actually absorb
  // (HP + shield before the hit) so the low-HP case heals/shields 2, not 3 — the foe still TAKES the
  // full 3 (overkill), only the SELF credit caps. capLanded is OPT-IN: every other lifesteal/refund
  // card (Dark, Butcher's Cleaver, Treasure Blade) keeps crediting the full swing on overkill, UNCHANGED.
  oJaw:        { name: "Jaw",           ante: 1, cost: 5, color: "#ddccae", text: "Deal 3 to the front foe; heal AND gain shield each equal to the damage dealt.", ops: [{ do: "deal", amount: 3, target: "front", lifesteal: true, shieldFromDealt: true, capLanded: true }] }, // FLAG: color #ddccae (bone/ivory — owner named no hue). dmg 3 / cost 5 / ante 1 are the owner's numbers.

  // ===== OWNER BATCH 2 — W2-A: PIERCING + MULTI-HIT MELEE (designs submitted 2026-07-10, Piercer
  // added 2026-07-21). All five are
  // MELEE, single-front strikes. PIERCE: the deal op carries `pierce: true`; damageEnemy then IGNORES
  // EVERY defensive effect on the foe — Totem dmgReduce aura, ward, body dmgReduce, Lich stance caps,
  // worn DR/stoneskin, AND the shield buffer — landing full damage straight on HP. TRIBLADE is NOT
  // pierce: it's three DISCRETE deal ops (the Omnislash multi-hit pattern), so each 1-damage hit
  // interacts with shields / thorns / on-hit procs separately (three hits, not one 3-hit). Damage
  // numbers ARE the owner's (stated); every COST is a FLAG (his to tune) — pinned a notch above the
  // equivalent non-piercing weapon because ignore-all-defence is a premium. FLAG (owner): POOL
  // placement / rarity is the owner's call — registered in PLAYER_POOL like every prior batch. =====
  oButterflyKnife: { name: "Butterfly Knife", ante: 1, cost: 3, kind: "melee", icon: "🦋", color: "#c8b0e0", text: "Deal 1 to the front foe. This damage ignores all defensive effects and triggers no reactions.", ops: [{ do: "deal", amount: 1, target: "front", pierce: true, noReact: true }] }, // FLAG: cost 3 (a piercing Dagger — Dagger ⚡2, +1 for ignore-all-defence). noReact = OWNER RULING 2026-07-11 "should not trigger any defensive actions either like fat cat or Minotaur": its damage fires NO on-damaged/reactive hook on the victim — no on:"damaged" body passives (Fat Cat rat), no accel/hit-clock ramps, no Atlas shrug, no Blood-To-Iron count, no thorns/mirror reflect, no boss on-damaged. Symmetric player/foe. FLAG property name `noReact` (mechanical; owner to rename if wanted).
  oMirrorMace:     { name: "Mirror Mace", ante: 1, cost: 4, kind: "melee", icon: "🔨", color: "#b8c8d8", text: "Deal 3 to the front foe. This damage ignores all defensive effects and triggers no reactions.", ops: [{ do: "deal", amount: 3, target: "front", pierce: true, noReact: true }] },
  oMeteorMaul:     { name: "Meteor Maul", ante: 1, cost: 7, kind: "melee", icon: "☄", color: "#e0785a", text: "Deal 5 to the front foe. This damage ignores all defensive effects and triggers no reactions.", ops: [{ do: "deal", amount: 5, target: "front", pierce: true, noReact: true }] }, // FLAG: cost 7 (5 through all defence — Javelin ⚡5 + pierce premium, at the Glacius tier). noReact = OWNER RULING 2026-07-11 "apply the butterfly knife to its bigger cousin cards"
  oPiercer:        { name: "Piercer", ante: 3, cost: 9, kind: "melee", icon: "🗡", color: "#d06d52", text: "Deal 9 to the front foe. This damage ignores all defensive effects and triggers no reactions. Excess damage overflows down the lane.", ops: [{ do: "deal", amount: 9, target: "front", pierce: true, noReact: true, overflow: true }] }, // FLAG: color/icon are best-fit placeholders; V3/M9 and all mechanics are owner-authored.
  oTriblade:       { name: "Triblade", ante: 1, cost: 5, kind: "melee", icon: "🔱", color: "#d0d8e0", text: "Deal 2 to the front foe three times (each hit takes your melee bonus).", ops: [{ do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }] },

  // ===== W2-B SPECIAL SHIELDS (owner 2026-07-10): shields that carry a per-shield DAMAGE MODIFIER
  // (`shieldMod`). The shield op records a segment in `shieldSegs`; absorbShield spends those segments
  // (special-before-normal, FIFO) with their modifier before the plain scalar pool. Typeless self
  // cards (no `type`/`ranged`/`kind`) — pure shields, like dShield. Icons/colors are PLACEHOLDER art
  // (art direction is the owner's). =====
  // PUNISHMENT GLUTTON — "Gain 10 shield, this shield takes double damage." The 10 display drains 2×
  // fast (each point of hit spends 2 shield → ~5 real absorption); overflow carries to HP as normal.
  oPunishGlutton:{ name: "Punishment Glutton", ante: 1, cost: 4, icon: "🩸", color: "#c0607a", text: "Gain a 10-point shield that takes double damage.",
                 ops: [{ do: "shield", amount: 10, shieldMod: "double" }] }, // FLAG cost 4: ~5 effective absorption (10 at 2×), like dTowerShield's 5 (⚡5) but front-loaded/flashier — owner's number. Amount 10 is owner-stated.
  // SWORDS OF REVEALING LIGHT — REDESIGNED (OWNER RULINGS 2026-07-11: "it turns every hit against it
  // into 1… its own buff, cost 7"; addendum: COUNT-based — "the next 3 instances of incoming damage"
  // each become exactly 1, no time limit, and it may only be cast ONCE PER FIGHT "like every other
  // permanent buff"). The old 3-shield-absorb-1 segment is GONE. The `revealLight` op arms a 3-charge
  // counter on the unit it's cast on (your ally-target, else self — the defensive-cast grammar); each
  // incoming damage instance >0 consumes a charge and lands as exactly 1; the 4th hit is full damage.
  // ONCE-PER-FIGHT = the engine's TWO existing permanent-buff grammars, reused exactly: `lasting:true`
  // (a cast permanent leaves the deck for the fight — Stoneskin/Cool Shoes) + the Giant's Belt
  // applied-flag no-op guard (`_revealLightApplied`, so a second COPY can't re-arm it either).
  // Cap applied in combat.js (revealLightCap) AFTER DR/auras and BEFORE shields — FLAGGED there.
  oRevealLight:{ name: "Swords of Revealing Light", ante: 1, cost: 7, lasting: true, icon: "🗡", color: "#f0d890", text: "Once per fight: the next 3 hits against you (or your ally-target) each deal exactly 1.",
                 ops: [{ do: "revealLight", count: 3 }] }, // cost 7 / 3 hits / into-exactly-1 / once-per-fight = the owner's numbers (2026-07-11). FLAG: a hit of exactly 1 still consumes a charge (it IS an instance of incoming damage — say if only >1 hits should drain). FLAG: pierce (Butterfly/Mirror Mace/Meteor Maul) bypasses the cap AND consumes no charge, like every defensive effect.

  // ===== OWNER BATCH 2, W2-C (owner 2026-07-10) — foe-control / debuff. Reuse batch-C's `sap`
  // debuff machinery (flat −N outgoing damage, lane-scoped, symmetric) for Banshee Wail; add a new
  // `stasis` status (lane lockout: no casts / no moxie / no positive triggers) for Za Warudo. Every
  // unstated number (cost, duration) is FLAGGED — owner's to tune. Icons are placeholders. =====
  // BANSHEE WAIL (owner: "Ranged. All foes in your lane deal −1 (+ranged)."). The lane debuff = base
  // −1 PLUS the caster's ranged bonus, via the `sap` op's new `plusRanged` flag. target:"selfLane" =
  // the caster's own lane (foes when hero-cast, heroes when foe-cast — symmetric), reaching the boss.
  oBansheeWail: { name: "Banshee Wail", ante: 1, cost: 3, ranged: true, icon: "😱", color: "#b0c4de", text: "All foes in your lane deal 1 less damage (plus your ranged bonus) for 6 seconds.",
                  ops: [{ do: "sap", amount: 1, plusRanged: true, dur: 60, target: "selfLane" }] }, // cost 3 (owner-set 2026-07-10): a whole-LANE + ranged-scaling debuff. FLAG: dur 60 (=6s) matches the existing debuff convention (Slow/Weakness/sap); base −1 + ranged is the owner's number.
  // ZA WARUDO (owner: "All foes in a lane can't play cards or gain moxie, nothing positive triggers
  // for them."). A `stasis` status: while active the engine blocks foeCast/playCard (no casts),
  // regenMoxie (no moxie gain), and tickRegens (no positive/beneficial-passive triggers) for the
  // affected combatants. Lane-scoped + symmetric, reaching the boss like every lane cast.
  oZaWarudo:    { name: "Za Warudo", ante: 1, cost: 9, icon: "⏱", color: "#d0c060", text: "All foes in your lane can't play cards, gain moxie, or trigger anything positive for 6 seconds.",
                  ops: [{ do: "stasis", dur: 60, target: "selfLane" }] },

  // ===== OWNER BATCH W2-D (designs submitted 2026-07-10) — REPOSITION / PERIODIC / DELAYED: three
  // distinct timed mechanics, each faithfully reusing an existing engine pattern (no reinvention).
  // Every number the owner did NOT state carries a FLAG at its definition (his to re-tune); `icon`
  // emojis are placeholders (owner art pending). Literal antes are normalized by the five-band overlay below. =====
  // GRAVITY GREATSWORD (owner 2026-07-10): "Melee. Pull your target to in front of you, then deal 5 to
  // them." PULL reuses Taunt's `pullFront` op — drag the AIMED foe (reticle) across into the CASTER's
  // lane and to its front (unshift), so a back-lane target is dragged to face you — THEN a melee `deal 5`
  // to the new front hits it. MELEE-typed (the front deal; no `ranged` flag). The pull reads target:"pick"
  // (aimedFoe falls back to your lane's front if you haven't aimed → a harmless no-op reposition that still deals 5).
  oGravitySword: { name: "Gravity Greatsword", ante: 1, cost: 6, kind: "melee", icon: "🪐", color: "#8a9cff", text: "Pull your target in front of you, then deal 5 to it.",
                 ops: [{ do: "pullFront", target: "pick" }, { do: "deal", amount: 5, target: "front" }] }, // FLAG: cost 6 picked (deal 5 + a cross-lane pull ≈ Zweihänder ⚡6). FLAG dmg 5 = owner's number. FLAG pull semantics: `pullFront` UNSHIFTS the target to the front, PUSHING the old front foe back one slot (simplest — no swap); a reticle-less cast pulls/hits your current front foe. Owner to confirm push-vs-swap.
  // CRIMSON CROWN (owner 2026-07-10): "Every 6 seconds take 1 and summon 2 rats." Built as a CARD granting
  // a THIS-FIGHT periodic passive (Big Wizard Hat "this fight" persistence — the `timer` lives on the caster,
  // reset per combat in beginCombat) + the every-6s `timer` tick (period 60). Each tick: `selfHit 1` (routes
  // through the existing selfDamage helper — shield eats first, fires on-damaged triggers) AND summon 2 rats.
  oCrimsonCrown: { name: "Crimson Crown", ante: 1, cost: 3, lasting: true, icon: "👑", color: "#c0304a", text: "This card remains in play this fight. Every 6 seconds, take 1 damage and summon 2 rats in your current lane, just in front of or behind you. Each rat has 1 HP and gains 1 moxie per second; same-kind rats in a lane merge into one shared-HP stack whose 3-moxie Bite deals damage equal to its living rat count to the front foe. This card leaves combat circulation until the fight ends.",
                 ops: [{ do: "timer", period: 60, ops: [{ do: "selfHit", amount: 1 }, { do: "summon", body: "rat", count: 2 }] }] }, // cost 3 (owner-set 2026-07-10): a recurring 2-rats-per-6s summon engine. CARD-vs-BODY (owner UNSTATED) → built as a CARD w/ this-fight passive (Big Wizard Hat pattern); say if it should instead be a worn body/crown. FLAG owner numbers: 6s period / take 1 / 2 rats / `rat` body.
  // STARBLADE (owner 2026-07-10): "Melee, deal 2. In 10 seconds gain 10 moxie." Immediate melee `deal 2`,
  // then a ONE-SHOT `timer` (period 100 ticks = 10s, once:true — the Cross-Blade / Rainblow delayed-strike
  // mechanism) that fires `gainMoxie 10` a single time and expires (never repeats).
  oStarblade: { name: "Starblade", ante: 1, cost: 4, kind: "melee", icon: "⭐", color: "#ffd24a", text: "Deal 2 to the front foe; in 10 seconds gain 10 moxie.",
                 ops: [{ do: "deal", amount: 2, target: "front" }, { do: "timer", period: 100, once: true, ops: [{ do: "gainMoxie", amount: 10 }] }] }, // FLAG: cost 4 picked (deal 2 + a delayed near-full moxie refill). FLAG owner numbers: dmg 2 / 10s (100-tick) delay / 10 moxie (MOXIE_CAP is 10, so this refills to cap).

  // ===== OWNER CARD BATCH (2026-07-21) — exact owner-set value/cost placements and numbers. =====
  oLightspeedLashwhip: { name: "Lightspeed Lashwhip", ante: 5, cost: 1, kind: "melee", icon: "⚡", color: "#f2dc62", text: "Deal 1 melee damage to every foe in your lane.",
                 ops: [{ do: "deal", amount: 1, target: "lane" }] },
  oGuillotwineAxe: { name: "Guillotwine Axe", ante: 4, cost: 8, kind: "melee", icon: "🪓", color: "#9f4259", text: "Deal 7 to the front foe, with excess damage spilling down the lane. In 6 seconds, do it again.",
                 ops: [{ do: "deal", amount: 7, target: "front", overflow: true }, { do: "timer", period: 60, once: true, ops: [{ do: "deal", amount: 7, target: "front", overflow: true }] }] },
  oWarsEternity: { name: "Wars Eternity", ante: 5, cost: 9, kind: "melee", lasting: true, icon: "∞", color: "#7d6fbd", text: "This card remains in play this fight. Now and every 6 seconds, deal 3 to the front foe and gain shield equal to the damage dealt. This card leaves combat circulation until the fight ends.",
                 ops: [{ do: "deal", amount: 3, target: "front" }, { do: "shield", ofDealt: true }, { do: "timer", period: 60, ops: [{ do: "deal", amount: 3, target: "front" }, { do: "shield", ofDealt: true }] }] },
  oMastersArm: { name: "Masters Arm", ante: 4, cost: 7, kind: "melee", icon: "⚔", color: "#d8b96c", text: "Choose one on cast. Rapier: deal 6; that foe deals that much less damage for 6 seconds. Spear: deal 6 to the front foe and one foe behind it. Staff: deal 6 and double your moxie gain for 6 seconds.",
                 ops: [
                   // FLAG: autonomous foe copies take Rapier when no explicit choice exists.
                   { do: "weaponChoice", fallback: "rapier", prompt: "choose Rapier, Spear, or Staff", options: [
                     { key: "rapier", label: "Rapier", icon: "🗡", text: "Deal 6. That foe deals that much less damage for 6 seconds." },
                     { key: "spear", label: "Spear", icon: "🔱", text: "Deal 6 to the front foe and one foe behind it." },
                     { key: "staff", label: "Staff", icon: "✦", text: "Deal 6. Double your moxie gain for 6 seconds." },
                   ] },
                   { do: "deal", amount: 6, target: "front", whenPick: "rapier" },
                   { do: "sap", ofLastHit: true, dur: 60, whenPick: "rapier" },
                   { do: "deal", amount: 6, target: "front2", whenPick: "spear" },
                   { do: "deal", amount: 6, target: "front", whenPick: "staff" },
                   { do: "buff", buff: "haste", amount: 1, dur: 60, target: "self", whenPick: "staff" },
                 ] },

  // ===== OWNER CARD EXPANSION (2026-07-19) — summon cards exhaust for the fight after play. =====
  oPetRats:    { name: "Pet Rats", ante: 1, cost: 3, color: "#c9a98c", text: `Summon 2 rats in your lane, just in front of or behind you. Each has 1 HP and gains 1 moxie per second; same-kind rats in a lane merge into one shared-HP stack whose 3-moxie Bite automatically deals damage equal to its living rat count to the front foe. ${SUMMON_CARD_END}`, ops: [{ do: "summon", body: "rat", count: 2 }] },
  oIceling:    { name: "Iceling", ante: 1, cost: 3, color: "#a8e0ff", text: `Summon an Iceling in your lane, just in front of or behind you. It has 1 HP, gains 1 moxie per second, and at 3 moxie automatically deals 1 to an aimed foe (front foe fallback) and reduces that foe's damage by 1 for 6 seconds. ${SUMMON_CARD_END}`, ops: [{ do: "summon", body: "iceling", count: 1 }] },
  oFireling:   { name: "Fireling", ante: 1, cost: 3, color: "#ff7a3c", text: `Summon a Fireling in your lane, just in front of or behind you. It has 1 HP, gains 1 moxie per second, and at 3 moxie automatically deals 1 to every foe in its lane. ${SUMMON_CARD_END}`, ops: [{ do: "summon", body: "fireling", count: 1 }] },
  oEarthling:  { name: "Earthling", ante: 1, cost: 3, color: "#a58b62", text: `Summon an Earthling in your lane, just in front of or behind you. It has 3 HP, gains 1 moxie per second, and at 3 moxie automatically gains 1 shield. ${SUMMON_CARD_END}`, ops: [{ do: "summon", body: "earthling", count: 1 }] },
  oLightling:  { name: "Lightling", ante: 1, cost: 3, color: "#f2df7a", text: `Summon a Lightling in your lane, just in front of or behind you. It has 1 HP, gains 1 moxie per second, and at 3 moxie automatically heals the lowest-health ally for 2; excess healing becomes shield. ${SUMMON_CARD_END}`, ops: [{ do: "summon", body: "lightling", count: 1 }] },
  oRatKing:    { name: "Rat King", ante: 2, cost: 8, color: "#d3ad68", text: `Summon a Rat King in your lane, just in front of or behind you. It has 6 HP and summons 1 rat whenever damaged. It gains 1 moxie per second; at 3 moxie it automatically deals its current HP to the front foe and summons 2 rats. Rats merge and bite by living rat count. ${SUMMON_CARD_END}`, ops: [{ do: "summon", body: "ratKing", count: 1 }] },
  oJarSlime:   { name: "Jar Slime", ante: 2, cost: 8, color: "#70b69b", text: `Summon a Jar Slime in your lane, just in front of or behind you. It has 3 HP, takes at most 1 damage per hit, and cannot heal or gain shield. Whenever damaged it deals 1 to every foe in its lane. It gains 1 moxie per second and at 3 moxie automatically deals 1 to every foe in its lane. ${SUMMON_CARD_END}`, ops: [{ do: "summon", body: "jarSlime", count: 1 }] },
  oSplitter:   { name: "Splitter", ante: 2, cost: 9, color: "#bcd8ff", text: `Summon a Splitter in your lane, just in front of or behind you. It has 8 HP and gains 1 moxie per second. At 3 moxie it automatically deals 3 ranged damage to an aimed foe (front foe fallback), carries excess damage onward, and permanently gains +1 ranged damage after each cast. ${SUMMON_CARD_END}`, ops: [{ do: "summon", body: "splitter", count: 1 }] },
  oBloodMoonOni: { name: "Blood-Moon Oni", ante: 2, cost: 9, color: "#a04050", text: `Summon a Blood-Moon Oni in your lane, just in front of or behind you. It has 6 HP, gains 1 moxie per second, and at 6 moxie automatically deals 6 to the front foe. If defeated, it returns in the same lane after 6 seconds while its summoner lives; combat ending stops returns. This card leaves combat circulation until the fight ends.`, ops: [{ do: "summon", body: "bloodMoonOni", count: 1, resummon: 60 }] },
  oDivineTreasure: { name: "Divine Treasure", ante: 5, cost: 10, lasting: true, color: "#e6c34a", text: "This card remains in play this fight. Now and every 6 seconds, animate an exact 10 moxie of weapon cards, distributed across lanes starting from your lane. Each weapon has HP equal to its wrapped card's moxie cost, gains 1 moxie per second, and automatically casts that card at its normal cost and targeting. Weapons last until defeated or combat ends. This card leaves combat circulation until the fight ends.", ops: [{ do: "animateWeapons", budget: 10 }, { do: "timer", period: 60, ops: [{ do: "animateWeapons", budget: 10 }] }] },

  // ===== SUMMON-ONLY CARDS (owner 2026-06-24): the cards summon TOKENS cast. ante 0 (no economic
  // value) and NEVER in PLAYER_POOL — not draftable, not loot, not shop, not foe gear. A summoned
  // token earns moxie and casts these exactly like any other combatant (the symmetry pillar extended
  // to summons). Keyed `t*` so they're easy to keep out of every pool. =====
  tBite:       { name: "Bite", ante: 0, cost: 3, color: "#c9a98c", text: "Deal 1 to the front foe.", ops: [{ do: "deal", amount: 1, target: "front" }] }, // FLAG: token cost 2→3 (+1 sweep; owner never set token costs — his to tune)
  tIceling:    { name: "Iceling Bolt", ante: 0, cost: 3, ranged: true, color: "#a8e0ff", text: "Deal 1 and reduce the target's damage by 1 for 6 seconds.", ops: [{ do: "deal", amount: 1, target: "pick" }, { do: "sap", amount: 1, dur: 60, target: "pick" }] },
  tFireling:   { name: "Fireling Burst", ante: 0, cost: 3, ranged: true, color: "#ff7a3c", text: "Deal 1 to every foe in its lane.", ops: [{ do: "deal", amount: 1, target: "lane" }] },
  tEarthling:  { name: "Earthen Coat", ante: 0, cost: 3, color: "#a58b62", text: "Gain 1 shield.", ops: [{ do: "shield", amount: 1 }] },
  tLightling:  { name: "Lightling Glow", ante: 0, cost: 3, color: "#f2df7a", text: "Overheal the lowest-health ally for 2.", ops: [{ do: "healLowest", amount: 2, overheal: true }] },
  tRatKing:    { name: "Royal Bite", ante: 0, cost: 3, kind: "melee", color: "#d3ad68", text: "Deal current health to the front foe and summon 2 rats.", ops: [{ do: "deal", ofHp: true, target: "front" }, { do: "summon", body: "rat", count: 2 }] },
  tJarSlime:   { name: "Jar Splash", ante: 0, cost: 3, ranged: true, color: "#70b69b", text: "Deal 1 to every foe in its lane.", ops: [{ do: "deal", amount: 1, target: "lane" }] },
  tSplitter:   { name: "Split Bolt", ante: 0, cost: 3, ranged: true, color: "#bcd8ff", text: "Deal 3 to an aimed foe with overflow; gain +1 damage each cast.", ops: [{ do: "deal", amount: 3, target: "pick", overflow: true }, { do: "rangedBonus", amount: 1 }] },
  tBloodMoonOni:{ name: "Blood-Moon Cleave", ante: 0, cost: 6, kind: "melee", color: "#a04050", text: "Deal 6 to the front foe.", ops: [{ do: "deal", amount: 6, target: "front" }] },
  // Earth/Lava Elemental tokens (owner 2026-07-16): the summons' own casts.
  tEarthWard:  { name: "Earth Jab", ante: 0, cost: 5, kind: "melee", color: "#9a8c6a", text: "Deal 2 to the front foe and heal itself 2.", ops: [{ do: "deal", amount: 2, target: "front" }, { do: "healSelf", amount: 2 }] },
  tLavaSurge:  { name: "Lava Surge", ante: 0, cost: 5, color: "#ff7a3c", text: "Deal 3 to every foe in its lane.", ops: [{ do: "deal", amount: 3, target: "lane" }] },
  // The Hedgefund Knight summon's swing: a +1'd bite (1 base + the knight's "+1 damage" baked in = 2).
  tKnightStrike:{ name: "Knight Strike", ante: 0, cost: 3, kind: "melee", color: "#d8c050", text: "Deal 2 to the front foe.", ops: [{ do: "deal", amount: 2, target: "front" }] }, // FLAG: token cost 2→3 (+1 sweep — owner's to tune)
  // Grand Spirit tokens' own casts (owner 2026-07-16).
  tSpiritStrike:{ name: "Spirit Strike", ante: 0, cost: 3, kind: "melee", color: "#d0906a", text: "Deal 5 to the front foe.", ops: [{ do: "deal", amount: 5, target: "front" }] },
  tSpiritBolt: { name: "Spirit Bolt", ante: 0, cost: 6, color: "#8fb8e0", text: "Deal 5 to every foe in its lane.", ops: [{ do: "deal", amount: 5, target: "lane" }] },
  tSpiritGuard:{ name: "Spirit Guard", ante: 0, cost: 6, kind: "melee", color: "#8fd0b8", text: "Deal 3 to the front foe, heal itself 3, and gain 3 shield.", ops: [{ do: "deal", amount: 3, target: "front" }, { do: "healSelf", amount: 3 }, { do: "shield", amount: 3 }] },
};

// TEMPORARY CARD VALUES (owner 2026-07-13): five bands from weakest = 1 through best = 5.
// This is deliberately one auditable overlay rather than 81 scattered edits: Dakota called the
// bands provisional, so re-tiering one card later is a one-line move. The five lists are exhaustive
// over the normal PLAYER_POOL (proved in game.test.js); archived and summon-only cards retain their
// authored definition values outside this offer-tier overlay.
//
// Method for this first pass: value 1 = simple/weak/conditional baseline; 2–4 are progressively
// stronger upgrades/engines; value 5 = run-defining, multiplicative, or board-breaking. Numeric quantiles
// were rejected because the current auto-bot fails to cast most candidate cards before a short fight
// resolves. These strength bands also keep a broad enough value-1 attack pool for valid starter decks
// and budget-safe base foe kits.
export const TEMP_CARD_VALUE_TIERS = Object.freeze({
  1: Object.freeze([
    "oSword", "oHatchet", "oSpear", "oBow", "oDagger", "oZweihander", "oIce", "oLightning",
    "oArcane", "oWind", "dBuckler", "dTaunt", "dShield",
    "dHeartGuard", "dTowerShield", "oRepeatXbow", "oAnimatedBlade",
    "oRainblow", "oButterflyKnife", "oEarth", "oBile", "oAstralFist", "oFlameOrbs", "oStudy",
    "oLeechstorm", "dGrit", "oRedVial", "oMediumRedVial", "oMassiveRedVial", "dBloodIron",
    "oPetRats", "oIceling", "oFireling", "oEarthling", "oLightling",
  ]),
  2: Object.freeze([
    "dShieldBash", "oJavelin", "oTwinUchis", "oComboBlade", "oFire", "oHoly", "dThorns",
    "oMoxiePool", "oSlow", "oJesterplate", "oWhip", "oTeleBlades", "oMirrorMace",
    "oPunishGlutton", "oBansheeWail", "oGravitySword", "oContinentClub",
    "oMiasmicWave", "oTornado", "oTsunami", "oLightningLance", "oHex", "oTranscend",
    "dSawShield", "dPatience", "oRatKing", "oJarSlime", "oSplitter", "oBloodMoonOni",
  ]),
  3: Object.freeze([
    "oMallet", "oPowerUp", "oDark", "oForce", "oBlizzard", "oTriblade", "oPiercer", "dTrollskin", "oHaste", "oGlacius",
    "oSharpEdges", "oDemonForm", "oSageMode", "oButcherCleaver", "oPetLeech", "oWeakness",
    "oDualHand", "oEarthElemental", "oLavaElemental", "oCrossBlade", "oMeteorMaul", "oStarblade",
    "oBigWizardHat", "oCrimsonCrown", "oHolyLance", "oFlameSteps", "oArcaneStorm",
    "oEarthquake", "oDoomWhisper",
  ]),
  4: Object.freeze([
    "oMeteors", "dStoneskin", "dLiquidMetal", "oOmnislash", "oBerserker", "oPowerWordGun",
    "oGravityShield", "oMirrorShield", "oGrandSpirit", "oJaw", "oRevealLight",
    "oTreasureBlade", "oLionLance", "oLifedrain", "oFlameStrike", "oGuillotwineAxe", "oMastersArm",
  ]),
  5: Object.freeze([
    "oMoonGreat", "coolShoes", "oGiantsBelt", "oBlackHole", "oZaWarudo", "oDivineTreasure",
    "oLightspeedLashwhip", "oWarsEternity",
  ]),
});
for (const [value, keys] of Object.entries(TEMP_CARD_VALUE_TIERS))
  for (const key of keys) if (KIT[key]) KIT[key].ante = Number(value);

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
const FOE_TARGETS = new Set(["pick", "front", "front2", "front3", "lane", "pickLane", "board", "random", "storedLane", "storedTarget"]);
export const opsTouchFoes = (ops) => (ops ?? []).some((o) => o.do === "timer" ? opsTouchFoes(o.ops) : FOE_TARGETS.has(o.target));
// DUAL-KIND (owner 2026-07-09): does any op (through timers) scale from BOTH melee AND ranged
// (bothKinds:true)? Moonlight Greatsword + Rainblow Blade. Recurses `timer` wrappers so Rainblow's
// delayed lane strike counts. Single source for the 🗡🎯 badge (snapshot imports it; was a local copy).
export const opsBothKinds = (ops) => (ops ?? []).some((o) => o.do === "timer" ? opsBothKinds(o.ops) : o.bothKinds === true);
// RANGED vs MELEE — the player-facing targeting/badge classification. MELEE is the NARROW
// category: ONLY true melee weapons (cardKind "melee" — front/front2/front3 strikes plus the
// explicit-melee aimed weapons). RANGED = the rest of the FOE-AFFECTING cards (spells, lane AoE,
// aimed debuffs like Slow/Weakness/Taunt). Cards that touch no foe — shields, heals, self/ally
// buffs, ramps, summons — are TYPELESS: no 🎯 badge, no trigger type (owner 2026-07-06,
// supersedes the 6/28 "everything not melee is ranged" rule). An explicit `ranged` flag still
// wins both ways (Bow/Javelin/Crossbow stay reticle-driven ranged; oForce is the one deliberate
// ranged-typed shield). Worn passives carry no badge; melee always strikes the front of YOUR lane.
export const isRanged = (key) => {
  const explicit = KIT[key]?.ranged;
  if (explicit != null) return explicit;
  const kind = cardKind(key);
  return !isPassiveItem(key) && kind !== "melee" && kind !== "both" && opsTouchFoes(KIT[key]?.ops);
};
// CARD KIND (owner 2026-06-25) — the BONUS/icon/trigger type, SEPARATE from targeting:
//   melee  🗡 = sword bonus + melee triggers (dealtMelee / the melee half of pairMR)
//   ranged 🎯 = target bonus + ranged triggers (dealtRanged / the ranged half of pairMR)
//   both   🗡🎯 = both bonuses + both trigger families (Moonlight Greatsword / Rainblow Blade)
//   untyped    = neither (pure shields / heals / buffs — no damage, no bonus, no icon)
// Targeting (front vs aimed `pick` vs aimed-lane `pickLane` AoE) is INDEPENDENT. Lightning/Meteors hit
// non-adjacent foes → that's a RANGED flavour, so `target:"pickLane"` derives ranged. Bow/Javelin
// AIM (target:"pick") but are MELEE cards ("target anything", pay the melee bonus) — they carry
// an explicit `kind:"melee"` that overrides the pick→ranged default.
export const cardKind = (key) => {
  const it = KIT[key]; if (!it) return "untyped";
  if (it.kind) return it.kind;                                          // explicit override (Bow/Javelin)
  const deal = (it.ops || []).find((o) => o.do === "deal");
  if (!deal) return "untyped";                                         // shields / heals / buffs
  return (deal.target === "front" || deal.target === "front2" || deal.target === "front3") ? "melee" : "ranged"; // pick OR lane → ranged
};
// TRIGGER KIND — the axis for card-PLAY mechanic triggers (onPlayMelee / onPlayRanged, and the
// melee/ranged halves of pairMR): "melee" / "ranged" / "both" / "none". MELEE is narrow (true melee
// weapons, cardKind "melee"); RANGED = foe-affecting cards (opsTouchFoes — projectiles, spells,
// aimed debuffs); everything self/ally-facing (armor, shields, heals, buffs, ramps, summons) is
// "none" and feeds NEITHER trigger (owner 2026-07-06 ruling, supersedes the 6/28 two-bucket
// "utility counts ranged" rule). An explicit `ranged` flag overrides the derivation — oForce is
// the one deliberate ranged-typed shield (its shield scales off the ranged bonus).
// This is the single source of truth for a card's play-trigger type. (The dealtMelee/dealtRanged
// DAMAGE clocks stay on cardKind: they fire on damage LANDED, and a damaging card is always typed
// melee/ranged, so the axes agree wherever damage exists.)
export const triggerKind = (key) => {
  const kind = cardKind(key);
  if (kind === "melee" || kind === "ranged" || kind === "both") return kind;
  return (KIT[key]?.ranged ?? opsTouchFoes(KIT[key]?.ops)) ? "ranged" : "none";
};
// CARD SCALE (owner 2026-07-14 readability pass) — the prominent MELEE / RANGED / BOTH / neutral
// treatment the client paints on the card face. This is the card's *scaling classification*, NOT its
// targeting shape: it answers "which bonus lifts this card, at a glance". It reuses the engine's own
// triggerKind (the single source of the melee/ranged bucket that governs bonuses, play-triggers, and
// kind-pricing), so the badge can NEVER disagree with combat truth; bothKinds cards read "both". Thus
// Bow/Javelin/Repeating Crossbow (aimed but kind:"melee") correctly read MELEE, not ranged; oForce +
// Crystal Ball (the two deliberate ranged exceptions) read RANGED; pure self/ally utility — shields,
// heals, buffs, ramps, and summons that touch no foe and carry no ranged flag — reads "none" and gets
// NO false melee/ranged badge (owner: "must not be falsely presented as melee/ranged to fill space").
export const cardScale = (key) => opsBothKinds(KIT[key]?.ops) ? "both" : triggerKind(key);
// The total bonus an entity applies to a card of `kind`: the generic ramp (`counters`, which a
// `counter` op grants and which lifts BOTH symbols) PLUS any type-specific bonus (a future
// melee-only / ranged-only grant lifts just one). Untyped attacks get nothing.
// `summonDamageBonus` is Fat Cat's source-wide Specialty. Keep it separate from counters so a
// merged rat stack can recompute both its native N-rat bite and the per-living-rat Specialty bonus.
export const meleeBonusOf  = (c) => (c.counters ?? 0) + (c.meleeBonus ?? 0) + (c.summonDamageBonus ?? 0) + (c.revenantAfterlifeBonus ?? 0);
export const rangedBonusOf = (c) => (c.counters ?? 0) + (c.rangedBonus ?? 0) + (c.summonDamageBonus ?? 0) + (c.revenantAfterlifeBonus ?? 0);
export const kindBonusOf = (c, kind) => kind === "melee" ? meleeBonusOf(c)
  : kind === "ranged" ? rangedBonusOf(c)
  : kind === "both" ? meleeBonusOf(c) + rangedBonusOf(c)
  : 0;
// The kind to charge for a deal op: an explicit card `kind` (passed by playCard/foeCast) wins;
// otherwise derive from the op's target so PASSIVE-dealt hits (Minotaur front, Crypto lane) self-type.
export const kindForOp = (op, kind = null) => kind ?? ((op?.target === "front" || op?.target === "front2" || op?.target === "front3") ? "melee" : "ranged");
// FOE RANGED ROUTING (owner 2026-06-27): a foe `deal` op snipes the weakest PLAYER (cross-lane,
// never a summon) iff it AIMS a single target — `target:"pick"`. Every ranged-flagged card aims
// (Bow/Fire/Ice/Arcane/Dark/Wind/…); melee cards hit front/front2/front3 and AoE hits `lane`, so those
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
//   repositionPick → { kind: "position", options: [front, back] }
// null for every ordinary card — the field is simply absent from its descriptor.
export const cardPick = (key) => {
  const findPick = (ops) => { for (const o of ops ?? []) {
    if (o.do === "weaponChoice") return { kind: "weaponChoice", prompt: o.prompt,
      options: (o.options ?? []).map(({ key, label, icon, text }) => ({ key, label, icon, text })) };
    if (o.do === "summonPick") return { kind: "summonBody",
      options: Object.entries(o.options ?? {}).map(([k, body]) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), icon: body })) };
    if (o.do === "tutor") return { kind: "deckCard" };
    if (o.do === "modalBonus" || o.do === "modalBonusPerHp" || (o.do === "regen" && o.kind === "modalBonus")) return { kind: "meleeRanged",
      options: [{ key: "melee", label: "Melee", icon: "🗡" }, { key: "ranged", label: "Ranged", icon: "🎯" }] };
    if (o.do === "repositionPick") return { kind: "position",
      options: [{ key: "front", label: "Shove to Front", icon: "⬆" }, { key: "back", label: "Push to Back", icon: "⬇" }] };
    if (o.do === "laneArrange") return { kind: "laneArrange",
      // Spatial picker order: the left action sits left, neutral/reverse sits center, right sits right.
      options: [{ key: "left", label: "Move Lane Left", icon: "⬅" }, { key: "reverse", label: "Reverse Order", icon: "↕" }, { key: "right", label: "Move Lane Right", icon: "➡" }] };
    if (o.do === "timer") { const nested = findPick(o.ops); if (nested) return nested; }
  } return null; };
  return findPick(KIT[key]?.ops);
};

// Backpack/deck size has NO MAXIMUM (owner 2026-06-24): there is no buyable-slot economy and no
// gold — the only sanity ceiling is a high memory cap so a backpack can't grow unbounded. MAX_KIT
// survives ONLY as that ceiling; the gold-priced kit-slot ladder is GONE. (The squad give/swap
// gates still read MAX_KIT as a free-slot check, never a gameplay cap.)
export const MAX_KIT = 200;          // sanity ceiling ONLY (memory) — not a gameplay limit
