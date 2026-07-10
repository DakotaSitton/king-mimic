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
  // EMPTY 2026-07-09 (owner: "remove all the old ones"): every key this map priced was a first-set /
  // post-floor-3 card that has now been DELETED from KIT. The owner's canonical cards each carry their
  // OWN `cost` in kit.js, so the cost overlay in cards.js (`KIT[k].cost ?? CARD_COST[k] ?? …`) reads the
  // card's own cost and never needs this table. Kept exported (cards.js imports it) as the hook for any
  // future Content-authored price override.
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
