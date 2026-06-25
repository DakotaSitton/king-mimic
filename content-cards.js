// content-cards.js — King Mimic combat content data (moxie + decks rewrite, 2026-06-21)
// PURE DATA. No logic, no imports. The engine (game.js) consumes ONE map now: CARD_COST.
//
//   CARD_COST  — moxie cost (integer 1..6) for EVERY KIT key. The engine overlays this
//                onto KIT (a card's `cost`), per CARDS_SPEC §2. `ante` stays the card
//                value; `cost` is the moxie price to play. `cd` is dead/ignored.
//
//   FOE_DECKS  — ⚠️ RETIRED 2026-06-24, no longer read by the engine. game.js imports only
//                CARD_COST; foes build their queue from drafted gear via `rollKit` (WYSIWYG),
//                so this per-body innate-deck map sat dead. KEPT as design data (this file is
//                untracked — there's no git copy — so the decks are preserved here rather than
//                deleted) for if innate foe decks ever return. Nothing imports it but the dead
//                `_cardlist.mjs` scratch script.
//
// Every CARD_COST key is a real KIT key.
// Cost rubric: honor the named anchors in CARDS_SPEC §2; otherwise
//   cost ≈ clamp(round((ante + biggest op.amount) / 2), 1, 6), then sanity-adjust.

export const CARD_COST = {
  // --- COMMON (12) ---
  blade: 1,         // anchor: cheap fast sword jab
  bow: 2,           // anchor: standard single-target ranged sword
  hatchet: 3,       // anchor: strong single-target sword
  fire: 2,          // anchor: standard single-target staff
  lightning: 4,     // anchor: lane AoE staff
  wind: 2,          // anchor: small staff + pushback utility
  smallShield: 1,   // anchor: 1-pt utility shield
  heal: 2,          // anchor: standard heal
  bigShield: 3,     // anchor: bigger shield
  summonRat: 2,     // anchor: summon a rat
  gangUp: 2,        // anchor: scaling single-target sword
  summonBigRat: 4,  // anchor: strong summon (large rat)
  // --- UNCOMMON (8) ---
  scaryKnife: 1,    // anchor: very-fast cheap jab
  spear: 3,         // anchor: strong front-two sword
  magicMissile: 1,  // anchor: very-fast cheap staff
  darkness: 3,      // anchor: strong single-target staff w/ lifesteal
  totem: 4,         // anchor: strong summon (aura token)
  flag: 4,          // anchor: strong summon (aura token)
  trustyShield: 2,  // anchor: small shield
  spikes: 2,        // anchor: small utility (thorns)
  // --- RARE (4) ---
  crossbow: 1,      // anchor: relentless cheap ranged sword
  blizzard: 5,      // anchor: premium lane AoE + clock drain
  knightBanner: 6,  // anchor: game-swinging big summon
  slimeCrown: 3,    // WORN PASSIVE (no ops, never played) — costed for completeness only
  // --- POST-FLOOR-3 WAVE ---
  haste: 3,         // round((3+1)/2)=2, bumped: a tempo buff is premium
  powerBoost: 4,    // round((3+2)/2)=3, bumped: +2 both schools for 12s is strong
  stoneSkin: 4,     // round((3+2)/2)=3, bumped: -2 dmg for 12s is strong defense
  omnislash: 5,     // ante 5; 4 hits (sword+2 each) = big burst → premium
  gigaCast: 6,      // fragile one-shot panic button → max
  timeStop: 6,      // fragile one-shot panic button → max
  revive: 6,        // fragile one-shot panic button → max
};

export const FOE_DECKS = {
  // ===== MAGICAL bodies (mag>0 → staff cards) =====
  // royalRat: rat-summoning caster — leans into staff summons + a cheap blast.
  royalRat: ["magicMissile", "summonRat", "fire"],
  // fatCat: rat-summoning caster that snowballs on damage — cheap staff + a rat + AoE.
  fatCat: ["magicMissile", "summonRat", "lightning"],
  // paidPiper: rat-summoning caster — cheap staff + summon + a heavier hit.
  paidPiper: ["magicMissile", "fire", "summonRat"],
  // mouse: echo caster — a cheap staff feeds the echo, then a big payoff hit.
  mouse: ["magicMissile", "fire", "lightning"],
  // lizardWizard: fast-staff caster — spam-priced missiles then a strong staff.
  lizardWizard: ["magicMissile", "fire", "darkness"],
  // ===== HYBRID body (phys>0 AND mag>0) — runeblade casts staff that adds its sword Power =====
  // runeblade: cross-school — a cheap staff, a sword jab, and a heavy staff finisher.
  runeblade: ["magicMissile", "blade", "fire"],
  // ===== PHYSICAL bodies (phys>0 → sword cards) =====
  // centaur: echo attacker — cheap sword feeds the echo, then a heavy sword doubles.
  centaur: ["scaryKnife", "hatchet", "bow"],
  // pixie: fast-sword attacker — relentless cheap jabs then a strong swing.
  pixie: ["scaryKnife", "blade", "hatchet"],
  // vampire: heavy sword body that heals off swords — sword jab + the biggest swings.
  vampire: ["blade", "hatchet", "spear"],
  // minotaur: counter-tank — chips with a cheap sword, then a front-two cleave.
  minotaur: ["scaryKnife", "spear", "gangUp"],
  // wageslave: self-healing tank — cheap sword + scaling gang-up to grind you down.
  wageslave: ["blade", "gangUp", "hatchet"],
  // atlas: growing tank — cheap sword early, heavy hatchet once its attack climbs.
  atlas: ["scaryKnife", "hatchet", "spear"],

  // ===== NEW ARCHETYPE ROSTER (owner 2026-06-22) — foes wear these now. Decks use existing card
  // keys (themed to the body's archetype) until the new card set is merged. =====
  // Casters (staff):
  frugal:      ["magicMissile", "fire", "lightning"],
  leverage:    ["fire", "lightning", "darkness"],
  hedge:       ["magicMissile", "fire", "bigShield"],
  ratTrader:   ["magicMissile", "summonRat", "fire"],
  compound:    ["magicMissile", "fire", "lightning"],
  // Attackers (sword):
  discountDuel:["scaryKnife", "blade", "hatchet"],
  pyramidRogue:["scaryKnife", "summonRat", "bow"],
  bloodfund:   ["blade", "hatchet", "bow"],
  heavyHand:   ["hatchet", "spear", "blade"],
  rentier:     ["blade", "fire", "magicMissile"],
  // Tanks (mix):
  ratBaron:    ["blade", "summonRat", "hatchet"],
  counterparty:["blade", "bigShield", "hatchet"],
  juggernaut:  ["blade", "hatchet", "spear"],
  quakeCap:    ["magicMissile", "lightning", "fire"],
  mutualMend:  ["blade", "heal", "hatchet"],
};
