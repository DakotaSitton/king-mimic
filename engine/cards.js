// King Mimic engine — deck/card logic + moxie constants (extracted from game.js barrel).
// Imports leaf data from bodies/kit; rollKit + hasBuff are call-time forward deps (via barrel).
import { BODIES } from "./bodies.js";
import { KIT, KIT_POOL, isCard, cardKind, genericDamageBonusOf, meleeBonusOf, meleeStatBonusOf,
  rangedBonusOf, rangedStatBonusOf, triggerKind } from "./kit.js";
import { leveledBody, masteryRank, specialtyRank } from "./leveling.js";
import { CARD_COST } from "../content-cards.js";
import { rollKit, hasBuff } from "../game.js";

export const DRAFT_PICKS = 3;   // how many items each player drafts at the start of a run
export const STOCK_MAX = 12;        // hard ceiling on total foes in a room (enforced in addFoe; the stock UI it once gated is deleted — 2026-07-19)
export const FOES_PER_LANE = 4;     // room foe cap = 4 per lane (owner 2026-07-03: "4 foes to a lane") — caps swarms

// ── MOXIE / CARD constants + helpers (CARDS_SPEC §1, §4) ────────────────────────────────────
export const MOXIE_CAP = 10;            // moxie ceiling
export const MOXIE_REGEN_TICKS = 10;    // +1 moxie per 10 ticks = 1/sec (TICK_MS 100)
export const POISON_PERIOD = 60;        // poison deals 1 dmg PER STACK every 60 ticks = 6s (owner 2026-06-27)
export const START_MOXIE = 0;           // both sides open with this (symmetry rule) — owner 2026-06-23: open at 0, earn the first cast
export const HAND_SIZE = 3;             // player hand target; hand = min(HAND_SIZE, collection size) — owner 2026-06-24: 3 feels better than 5

// Body-specific enemy deck eligibility. This is intentionally narrower than card ownership: a
// player wearing the Cyclops may still keep/play ranged cards, but generated or injected foe
// loadouts strip them so enemy decks never recreate the ranged mismatch the owner ruled out.
// PARTY MODE companions use the same three-card, one-visible-card cadence as foes. Keeping one
// card in hand makes the other two the draw queue; after all three resolve, the discard returns in
// the same order. The main body and ordinary human seats keep the authored three-card hand.
// PARTY OVERHAUL (owner 2026-07-28: "all their hands in front of me, no auto"). Companions used to be
// foe-style — a single visible card on a fixed cycle, auto-fired by the server. They are now real,
// player-controlled bodies: a full HAND_SIZE hand the human plays by hand, exactly like the main body.
export const handSizeFor = (p) => HAND_SIZE;

// Explicit, data-authored card-weight seam. Untagged cards retain normal stat scaling.
export const cardWeightTag = (key) => KIT[key]?.weightTag ?? null;
export const isHeavyCard = (key) => cardWeightTag(key) === "heavy";
export const isLightCard = (key) => cardWeightTag(key) === "light";
// Odd Light rounding is isolated here pending the owner's final rule.
export const scaleCardStatBonus = (key, amount) => cardWeightTag(key) === "heavy"
  ? amount * 2 : cardWeightTag(key) === "light" ? Math.floor(amount / 2) : amount;

// Light/Heavy only changes scaling from the typed melee/ranged stats. Generic +damage remains
// literal: a Light card never halves it and a Heavy card never doubles it. A both-kind card keeps
// the established rule that generic damage feeds each kind, while weighting only the two stats.
export function weightedCardKindBonus(key, c, kind, bothKinds = kind === "both") {
  const generic = genericDamageBonusOf(c);
  if (bothKinds || kind === "both")
    return 2 * generic + scaleCardStatBonus(key, meleeStatBonusOf(c) + rangedStatBonusOf(c));
  if (kind === "melee") return generic + scaleCardStatBonus(key, meleeStatBonusOf(c));
  if (kind === "ranged") return generic + scaleCardStatBonus(key, rangedStatBonusOf(c));
  return 0;
}

export function foeCardAllowed(bodyKey, key) {
  if (bodyKey === "onePercenterCyclops") return !["ranged", "both"].includes(triggerKind(key));
  return true;
}

// ── DECK SIZING (owner 2026-06-22) ──────────────────────────────────────────────────────────
// "Starter kits going forward need to be much larger — 10 cards minimum, and that's the default
// smallest deck allowed size." MIN_DECK is the FLOOR everywhere a deck is built or edited: you
// may add cards freely (NO max) but moving cards deck→backpack may never drop below MIN_DECK.
// (The backpack-editing screen that enforces this on remove is the deferred §1-economy build;
// this constant is the single source of truth it binds to.)
export const MIN_DECK = 10;
// PLAYER_POOL — the OWNER's canonical normal-offer universe: the draft wheel, starter decks, loot,
// shop, and symmetric foe gear all derive from it. Archived cards remain defined/addressable in KIT
// for legacy or special references, but this explicit key seam keeps them out of ordinary offers.
export const ARCHIVED_PLAYER_CARDS = Object.freeze(["oCrystalBall", "oHedgeKnight"]);
const ARCHIVED_PLAYER_CARD_SET = new Set(ARCHIVED_PLAYER_CARDS);
const PLAYER_CARD_CATALOG = [
  "oSword", "oHatchet", "oSpear", "oBow", "oDagger", "oJavelin", "oMallet", "oZweihander",
  "oTwinUchis", "oPowerUp", "oBigWizardHat", "oComboBlade",                                    // base melee (11)
  "oFire", "oIce", "oLightning", "oArcane", "oDark", "oWind", "oHoly", "oForce", "oMeteors", // base ranged/utility (9)
  "oEarth", "oBile", "oAstralFist", "oFlameOrbs", "oStudy", "oLeechstorm",
  "oMiasmicWave", "oTornado", "oTsunami", "oLightningLance", "oHolyLance", "oLifedrain",
  "oHex", "oFlameSteps", "oFlameStrike", "oArcaneStorm", "oEarthquake", "oDoomWhisper",
  "oBlizzard",  // lane-wide Ice: damage 3 + matching six-second damage reduction; cost 7

  // DEFENSIVE SET (owner 2026-06-24) — now live in draft/loot/foe kits (11)
  "dBuckler", "dTaunt", "dShield", "dShieldBash", "dHeartGuard", "dThorns",
  "dStoneskin", "dGrit", "dBloodIron", "dTowerShield", "dTrollskin", "dLiquidMetal",
  "oRedVial", "oMediumRedVial", "oMassiveRedVial", "oTranscend", "dSawShield", "dPatience",
  // OWNER BATCH (owner 2026-06-25) — new cards in draft/loot/foe kits. (13)
  // `coolShoes` is a CASTABLE LASTING card since 2026-07-06 (owner: "there's no such thing as a passive").
  // isCard() filters it from the combat deck/queue (never drawn/cast); it only acts while held. Safe to
  // draft now that deckKeys no longer pads short decks (the old Swords-seeding bug is fixed).
  // (Wizard Hat DELETED 2026-07-09 — merged into the now-MODAL Sharpened Edges, owner directive.)
  "oOmnislash", "oHaste", "oHedgeKnight", "oMoxiePool", "oGlacius", "oSharpEdges",
  "oRepeatXbow", "oDemonForm", "oSageMode", "oBerserker",
  "coolShoes",
  // NEW (owner 2026-06-27, batch B):
  "oButcherCleaver", "oPetLeech", "oSlow", "oAnimatedBlade", "oWeakness",
  // NEW (owner 2026-07-06, batch C — 13 cards; unstated numbers FLAGGED in kit.js):
  "oMoonGreat", "oDualHand", "oPowerWordGun", "oGravityShield", "oTreasureBlade", "oRainblow",
  "oEarthElemental", "oJesterplate", "oLavaElemental", "oWhip", "oCrossBlade", "oContinentClub",
  "oTeleBlades", "oGiantsBelt",
  // NEW (owner 2026-07-07, batch D — 5 cards; unstated numbers FLAGGED in kit.js). In the pool =
  // draftable, loot, shop, foe gear IMMEDIATELY (the symmetry pillar — foes cast these too).
  "oBlackHole", "oLionLance", "oCrystalBall", "oMirrorShield", "oGrandSpirit",
  // NEW (owner 2026-07-10, batch E): Jaw — melee ⚡5, deal 3 to the front foe; heal AND shield each = the damage landed (capped).
  "oJaw",
  // NEW (owner 2026-07-10, batch 2 / W2-A — piercing + multi-hit melee cards; original costs FLAGGED in kit.js).
  // In the pool = draftable / loot / shop / foe gear (the symmetry pillar). FLAG (owner): pool placement
  // + rarity is his call. NOTE (symmetry): foe-side pierce IS now wired (MOD-3, owner 2026-07-10) —
  // a FOE casting one of these bypasses the target player's shield/ward/DR/stoneskin (damagePlayer pierce).
  "oButterflyKnife", "oMirrorMace", "oMeteorMaul", "oPiercer", "oTriblade",
  // NEW (owner 2026-07-10, batch W2-B — 2 special shields w/ per-shield damage modifiers; costs FLAGGED in kit.js):
  "oPunishGlutton", "oRevealLight",
  // NEW (owner 2026-07-10, batch 2 W2-C — foe control; costs/durations FLAGGED in kit.js). Symmetric:
  // foes cast these at players too (Banshee saps the hero lane; Za Warudo stasis-locks it).
  "oBansheeWail", "oZaWarudo",
  // NEW (owner 2026-07-10, batch W2-D — 3 cards; reposition/periodic/delayed; numbers FLAGGED in kit.js).
  "oGravitySword", "oCrimsonCrown", "oStarblade",
  // OWNER BATCH (2026-07-21): lane lash, repeating overflow axe, periodic shield engine, modal arm.
  "oLightspeedLashwhip", "oGuillotwineAxe", "oWarsEternity", "oMastersArm",
  // OWNER EXPANSION (2026-07-19): disposable summon cards + summon engine.
  "oPetRats", "oIceling", "oFireling", "oEarthling", "oLightling", "oRatKing",
  "oJarSlime", "oSplitter", "oBloodMoonOni", "oDivineTreasure",
];
export const PLAYER_POOL = PLAYER_CARD_CATALOG.filter((key) => !ARCHIVED_PLAYER_CARD_SET.has(key));
// The starter offer pool is exactly the current V1 card band. V is offer value/rarity;
// C is the separate in-combat moxie cost.
export const STARTER_CARD_POOL = Object.freeze([
  "oSword", "oHatchet", "oSpear", "oBow", "oDagger", "oZweihander", "oIce", "oLightning",
  "oArcane", "oWind", "dBuckler", "dTaunt", "dShield",
  "dHeartGuard", "dTowerShield", "oRepeatXbow", "oAnimatedBlade",
  "oRainblow", "oButterflyKnife", "oEarth", "oBile", "oAstralFist", "oFlameOrbs", "oStudy",
  "oLeechstorm", "dGrit", "oRedVial", "oMediumRedVial", "oMassiveRedVial", "dBloodIron",
  "oPetRats", "oIceling", "oFireling", "oEarthling", "oLightling",
]);
// The STARTER DECK — MIN_DECK (10) of the owner's own cards, a balanced spread so the deckbuilder
// has texture on the first play. Used as the no-draft fallback / pad-to-floor base in deckKeys.
export const STARTER_DECK = [
  "oSword", "oHatchet", "oSpear", "oBow", "oDagger",   // physical
  "oFire", "oLightning", "oWind", "oArcane", "oHoly",  // magical / support
];
// The card keys a player's combat DECK is built from this room: EXACTLY their chosen COMBAT deck
// (player.deckList — a sub-multiset of the backpack), filtered to castable cards. Combat only ever
// draws from the DECK; the backpack is never drawn from in combat.
// NO SEEDING (owner 2026-06-25): the deck is never padded / topped-up / substituted. The old
// "pad to MIN_DECK from STARTER_DECK" was REMOVED — it injected starter Swords/Hatchets the player
// never chose (a deck holding an ops-less item like the retired slimeCrown, which isCard() strips out, counted as
// < MIN_DECK castable and got padded → the bug that forced Swords into a real run). The 10-card
// minimum is a DECK-BUILDER planning floor (enforced in the builder ops), NOT a combat-time
// auto-fill. An EMPTY deckList still falls back to STARTER_DECK so a deckless player isn't cardless
// — that is the ONLY remaining seed, flagged for owner review.
// God mode = the whole pool (testing). Pure: returns keys, mintCards turns them into instances.
export function deckKeys(p, god = false) {
  if (god) return KIT_POOL;
  return (p?.deckList?.length ? p.deckList : STARTER_DECK).filter((k) => KIT[k] && isCard(k));
}
// Multiset count of `key` in a list (used by the backpack/deckList invariant checks).
export const countKey = (list, key) => (list ?? []).reduce((n, k) => n + (k === key ? 1 : 0), 0);

// A card's moxie cost: the Content map (content-cards.js) wins; else a rubric fallback so any
// unlisted KIT key still gets a sane price. Applied ONTO KIT once, here, at module load.
export const defaultCardCost = (key) => {
  const it = KIT[key]; if (!it) return 2;
  const biggest = Math.max(0, ...((it.ops ?? []).map((o) => o.amount ?? 0)));
  return Math.max(1, Math.min(6, Math.round(((it.ante ?? 1) + biggest) / 2)));
};
// Honor a card's OWN `cost` first (the owner's cards carry it), then the Content map, then the
// rubric fallback — never overwrite an authored cost (CARDS_SPEC §2; merge landmine in HANDOFF).
for (const k of KIT_POOL) KIT[k].cost = KIT[k].cost ?? CARD_COST[k] ?? defaultCardCost(k);
// A card's moxie cost, optionally reduced by the WEARER's body discount ("my <school> cards cost N
// less"). Passing no body = the raw cost (tests/tools). Used everywhere cost is read so the hand,
// foe queue, affordability, and the spend all agree.
// FLOOR REMOVED (owner 2026-07-10): cost-reduction now floors at 0 (FREE), not 1 — a fully-reduced
// card can reach 0. Every reduction below clamps `Math.max(0, …)`, not `Math.max(1, …)`.
export const cardCost = (key, body) => {
  let c = KIT[key]?.cost ?? defaultCardCost(key);
  const d = body?.costDiscount;
  if (d && KIT[key]?.type === d.school) c = Math.max(0, c - (d.amount ?? 1));   // floor 0 (owner 2026-07-10)
  // KIND-PRICING (owner 2026-07-06 batch C): Penny-Pinching Pixie (melee −1) / Lizard Wizard
  // (ranged −1). The kind is the play-trigger tag (triggerKind), so "ranged" covers aimed
  // debuffs (Slow/Weakness/Taunt) and Force, the one ranged shield — matching the owner's tag model.
  const kd = body?.costKind, tk = triggerKind(key);
  if (kd && (tk === kd.kind || tk === "both")) {
    if (kd.divisor) {
      const divide = c / Math.max(1, kd.divisor);
      c = (kd.rounding === "floor" ? Math.floor(divide) : Math.ceil(divide)) - (kd.after ?? 0);
      c = Math.max(kd.floor ?? 0, c);
    } else c = kd.set != null ? kd.set : Math.max(kd.floor ?? 0, c - (kd.amount ?? 1));
  }
  if (body?.costAdd) c = Math.min(body.costMax ?? 10, c + body.costAdd);   // Nepotistic Neptune (owner 2026-06-27): all cards cost +N, capped at costMax
  return c;
};
// The LIVE play cost — cardCost plus the caster's per-fight STATE: Pyramid-Scheme Head's FREE next
// card. Used by playCard/foeCast AND the hand-affordability display so the UI and the spend agree.
// (Dual-Handing Two-Handers' old melee-5+ cost −3 was REMOVED 2026-07-10 — its effect is now a replay
// of ≥6-cost melee cards, applied in playCard/foeCast via the `dualWield` flag, NOT a cost change.)
const opsCanSummon = (ops) => (ops ?? []).some((op) =>
  ["summon", "summonArmed", "summonPick", "animateWeapons"].includes(op.do)
  || (op.do === "timer" && opsCanSummon(op.ops)));
export const cardCanSummon = (key) => opsCanSummon(KIT[key]?.ops);

export const playCost = (key, body, player) => {
  let c = cardCost(key, body);
  if (player?.freeNext) c = 0;
  else if ((player?.firstCardDiscount ?? 0) > 0
      && (player?.firstCardDiscountUses != null
        ? (player?.bodyCardsPlayed ?? 0) < player.firstCardDiscountUses
        : !player?._firstCardPlayed))
    c = Math.max(player?.firstCardDiscountFloor ?? 1, c - player.firstCardDiscount);
  if ((player?.firstRangedDiscount ?? 0) > 0 && !player?._firstRangedPlayed
      && ["ranged", "both"].includes(triggerKind(key)))
    c = Math.max(0, c - player.firstRangedDiscount);
  if ((player?.firstMeleeDiscount ?? 0) > 0 && !player?._firstMeleePlayed
      && ["melee", "both"].includes(triggerKind(key)))
    c = Math.max(0, c - player.firstMeleeDiscount);
  if ((player?.nextRangedDiscount ?? 0) > 0
      && (["ranged", "both"].includes(triggerKind(key)) || cardCanSummon(key)))
    c = Math.max(0, c - player.nextRangedDiscount);
  return c;
};

// Some bodies split a live card price across moxie and health. This is the single affordability
// contract used by heroes, foes, auto-play, queues, and snapshots. Calling Caltist's owner wording
// is read as "pay 5 moxie, then 2 health per point of the remaining live cost"; health cannot be
// paid lethally. FLAG: that exact split/nonlethal rule and the supportive upgrade numbers are tunable.
export const cardPayment = (key, body, player) => {
  const totalCost = playCost(key, body, player);
  const hc = body?.healthCast, tk = triggerKind(key);
  const eligible = ["ranged", "both"].includes(tk) || cardCanSummon(key);
  const nonlethalOrMoxie = (payment) => payment.healthCost > 0 && player?.hp != null
      && player.hp <= payment.healthCost && (player.moxie ?? 0) >= totalCost
    ? { totalCost, moxieCost: totalCost, healthCost: 0 }
    : payment;
  if (!hc || !eligible)
    return { totalCost, moxieCost: totalCost, healthCost: 0 };
  // Calling Caltist Mastery: the first eligible card each combat may move its entire
  // live price to health. The cast sites enforce the ordinary non-lethal payment rule.
  if (player?.bodyKey === "callingCaltist" && masteryRank(player) && !player._healthCastMasteryUsed)
    return nonlethalOrMoxie({ totalCost, moxieCost: 0, healthCost: totalCost, healthMastery: true });
  if (totalCost <= (hc.threshold ?? 5))
    return { totalCost, moxieCost: totalCost, healthCost: 0 };
  const moxieCost = hc.threshold ?? 5;
  const multiplier = player?.bodyKey === "callingCaltist" ? 1 : (hc.multiplier ?? 2);
  const healthCost = Math.max(0, (totalCost - moxieCost) * multiplier - (hc.discount ?? 0));
  return nonlethalOrMoxie({ totalCost, moxieCost, healthCost });
};

// THE DAMAGE NUMBER (owner 2026-06-25 rework) — ONE number = "what this card does RIGHT NOW", followed
// immediately by the GLYPH of the stat it scales from. No more "+4"/"✕+1" deltas: the number is the
// whole printed amount, the glyph names where the scaling comes from. When the live number is ABOVE the
// card's base, the client paints it GOLD (it's boosted); at base, neutral.
//   🗡 melee bonus · 🎯 ranged bonus · 🛡 caster shield (ofShield) · 👥 allies in lane (perAlly)
//   ❤ heal · 🛡 shield · (no glyph) flat / non-scaling
// `cardDealInfo` reduces a card to its headline effect so every label/projection reads from one place.
// Multi-hit (Omnislash's four `deal 2` ops) → `count` > 1; we render per-hit×count ("2🗡×4") so the
// player sees BOTH the per-strike value (which the bonus lifts) and the hit count (FLAGGED choice).
export function cardDealInfo(key) {
  const it = KIT[key]; if (!it?.ops?.length) return null;
  const flattenTimers = (ops) => ops.flatMap((o) => o.do === "timer" ? flattenTimers(o.ops ?? []) : [o]);
  const choice = it.ops.find((o) => o.do === "weaponChoice");
  const fallback = choice?.fallback ?? choice?.options?.[0]?.key;
  const visibleOps = choice ? it.ops.filter((o) => o.do !== "weaponChoice" && (!o.whenPick || o.whenPick === fallback)) : it.ops;
  const allOps = flattenTimers(visibleOps);
  const deals = allOps.filter((o) => (o.do === "deal" || o.do === "schoolStrike" || o.do === "tornado"));
  if (deals.length) {
    const d = deals[0];
    // a multi-hit card is N identical `deal` ops on the SAME target — count them so the label is "x×N".
    const same = deals.filter((o) => (o.amount ?? 0) === (d.amount ?? 0) && o.target === d.target
      && !!o.ofShield === !!d.ofShield && !!o.ofHp === !!d.ofHp && (o.perAlly ?? 0) === (d.perAlly ?? 0));
    const count = same.length * Math.max(1, d.hits ?? 1);
    const displayKind = cardKind(key) === "untyped" ? triggerKind(key) : cardKind(key);
    const glyph = d.ofShield ? "🛡" : d.ofHp ? "❤" : d.perAlly ? "👥" : d.bothKinds ? "🗡🎯" : displayKind === "melee" ? "🗡" : displayKind === "ranged" ? "🎯" : "";
    return { effect: "deal", amount: d.amount ?? 0, mult: d.mult ?? 1, count, glyph,
             kind: displayKind, bothKinds: !!d.bothKinds, perAlly: d.perAlly ?? 0, ofShield: !!d.ofShield, ofHp: !!d.ofHp };
  }
  const s = allOps.find((o) => o.do === "shield" || o.do === "shieldAlly" || o.do === "tempShield");
  if (s) return { effect: "shield", amount: s.amount ?? 0, mult: s.mult ?? 1, count: 1, glyph: "🛡", ofDealt: !!s.ofDealt };
  const h = allOps.find((o) => o.do === "healAlly" || o.do === "healSelf");
  if (h) return { effect: "heal", amount: h.amount ?? 0, mult: 1, count: 1, glyph: "❤" };
  const su = allOps.find((o) => o.do === "summon" || o.do === "summonPick" || o.do === "animateWeapons"); // summonPick = Grand Spirit's choose-a-body summon (owner 2026-07-07)
  if (su) return { effect: "summon", amount: su.count ?? 1, mult: 1, count: 1, glyph: "🐀" };
  return null;
}
// Just the scaling-source glyph for a card (no number) — handy for the deck tiles / list rows.
export function cardScaleGlyph(key) { return cardDealInfo(key)?.glyph ?? ""; }
// Compose "number+glyph" (and ×count for multi-hit). `n` is the printed amount for ONE hit.
const dmgLabelFrom = (info, n) => {
  if (!info) return "";
  if (info.effect === "summon") return `🐀×${info.amount}`;                 // tokens: count, not damage
  const tail = info.count > 1 ? `×${info.count}` : "";
  return `${n}${info.glyph}${tail}`;
};
// BASE label (the printed amount with NO caster bonus) — what the deck panel / tooltip / draft show, so
// base stays discoverable next to the live hand number. ofShield/perAlly read 0 at base (no shield/allies).
export function cardDmgLabel(key) {
  const info = cardDealInfo(key); if (!info) return "";
  return dmgLabelFrom(info, info.amount * info.mult);
}
// THE ONE live deal-bonus computation — kind bonus (melee/ranged/both), Veteran of the Psychic
// Wars' cost-scaled melee, and perAlly scaling — shared by cardLiveDmg, cardLiveSummary AND
// cardGlyphs below so no preview surface can ever drift from another. `part` needs only
// { kind, bothKinds, perAlly } (the shape cardDealInfo/cardOutcomes already emit).
export function liveDealBonus(key, part, c, allies = 0) {
  let bonus = weightedCardKindBonus(key, c, part.kind, part.bothKinds);
  // VETERAN OF THE PSYCHIC WARS: expose its cost-scaled melee damage in the live number.
  // The Specialty's extra cross-lane damage remains room-aware and is added by the resolver.
  const psychic = ["melee", "both"].includes(cardKind(key)) ? leveledBody(c)?.psychicMelee : null;
  if (psychic) {
    bonus += Math.floor(playCost(key, leveledBody(c), c) / Math.max(1, psychic.costDivisor ?? 2));
    if (psychic.addRangedBonus && !part.bothKinds) bonus += rangedBonusOf(c);
  }
  if (part.perAlly) bonus += part.perAlly * Math.max(0, allies);                 // ally-count scaling
  if (c?.bodyKey === "juggernaut" && (c.shield ?? 0) > 0) bonus += 2 * specialtyRank(c);
  if (c?.bodyKey === "onePercenterCyclops" && cardWeightTag(key) === "heavy"
      && ["melee", "both"].includes(part.kind))
    bonus += Math.floor((c.maxHp ?? 0) / (masteryRank(c) ? 3 : 5));
  if ((c?.nextHeavyBonus ?? 0) > 0 && cardWeightTag(key) === "heavy") bonus += c.nextHeavyBonus;
  return bonus;
}
// LIVE label for a specific caster `c` (player or foe): base + that caster's APPLICABLE bonus folded into
// the printed number. melee/ranged → kindBonusOf; ofShield → its current shield; perAlly → +perAlly per
// OTHER ally in its lane (allies count passed in, since the room isn't in scope everywhere). Returns
// { label, base, now, boosted } so a caller can color by `boosted` and break down in the tooltip.
export function cardLiveDmg(key, c, allies = 0) {
  const info = cardDealInfo(key);
  if (!info) return { label: "", base: 0, now: 0, boosted: false, glyph: "", count: 1 };
  const baseN = info.amount * info.mult;
  let nowN = baseN;
  if (info.effect === "deal") {
    if (info.ofShield) nowN = (c?.shield ?? 0);                                  // Shield Bash: = current shield
    else if (info.ofHp) nowN = Math.max(0, c?.hp ?? 0);                           // Kraken tentacle: = current HP
    else nowN = baseN + liveDealBonus(key, info, c, allies);
  }
  return { label: dmgLabelFrom(info, nowN), base: baseN, now: nowN,
           boosted: nowN > baseN, glyph: info.glyph, count: info.count };
}

// ── COMPOUND CARD SUMMARY (owner 2026-07-14 readability pass) ────────────────────────────────
// cardDealInfo above reduces a card to ONE headline op (the single live-damage number the foe/summon
// threat chips read). That is too little for a COMPOUND player card — Heart Guard is shield 2 + heal 2,
// but cardDealInfo stops at the shield. cardOutcomes generalizes it: it walks the ops IN ORDER and
// emits one part per PRIMARY immediate outcome (attack / multi-hit / shield / heal / summon), so the
// first-glance summary can show EVERY safely-derivable number — Heart Guard → "🛡2 ❤2", Mallet →
// "4🗡 🛡4", Omnislash → "2🗡×4". It reads straight from KIT[*].ops (NOT a second hand-maintained table
// that could drift). Rider flags on a deal (lifesteal / shieldFromDealt / moxieFromDealt) are conveyed
// by the card's prose, never as separate numeric parts; only real outcome OPS become parts.
const sameDeal = (a, b) => a.do === b.do && (a.amount ?? 0) === (b.amount ?? 0) && a.target === b.target
  && !!a.ofShield === !!b.ofShield && !!a.ofHp === !!b.ofHp && (a.perAlly ?? 0) === (b.perAlly ?? 0) && !!a.bothKinds === !!b.bothKinds;
export function cardOutcomes(key) {
  const it = KIT[key]; if (!it?.ops?.length) return [];
  const isPrimary = (o) => o.do === "deal" || o.do === "schoolStrike" || o.do === "tornado" || o.do === "shield" || o.do === "shieldAlly" || o.do === "tempShield"
    || o.do === "healAlly" || o.do === "healSelf" || o.do === "summon" || o.do === "summonPick" || o.do === "animateWeapons";
  const flattenTimers = (ops) => ops.flatMap((o) => o.do === "timer" ? flattenTimers(o.ops ?? []) : [o]);
  // Prefer immediate outcomes. If a card is purely delayed/periodic (Glacius, Repeating Crossbow),
  // use the nested timer outcome as its headline without duplicating cards that also act immediately.
  const choice = it.ops.find((o) => o.do === "weaponChoice");
  const fallback = choice?.fallback ?? choice?.options?.[0]?.key;
  const authoredOps = choice ? it.ops.filter((o) => o.do !== "weaponChoice" && (!o.whenPick || o.whenPick === fallback)) : it.ops;
  const ops = authoredOps.some(isPrimary) ? authoredOps : flattenTimers(authoredOps);
  const rawKind = cardKind(key), kind = rawKind === "untyped" ? triggerKind(key) : rawKind, parts = [];
  let lastDeal = null;
  for (let i = 0; i < ops.length; i++) {
    const o = ops[i];
    if (o.do === "deal" || o.do === "schoolStrike" || o.do === "tornado") {
      let count = Math.max(1, o.hits ?? 1);
      while (i + 1 < ops.length && sameDeal(ops[i + 1], o)) { count++; i++; }   // collapse a multi-hit run (Omnislash/Twin Uchis/Triblade)
      const glyph = o.ofShield ? "🛡" : o.ofHp ? "❤" : o.perAlly ? "👥" : o.bothKinds ? "🗡🎯" : kind === "melee" ? "🗡" : kind === "ranged" ? "🎯" : "";
      lastDeal = { effect: "deal", base: (o.amount ?? 0) * (o.mult ?? 1), glyph, count,
        kind, bothKinds: !!o.bothKinds, perAlly: o.perAlly ?? 0, ofShield: !!o.ofShield, ofHp: !!o.ofHp };
      parts.push(lastDeal);
    } else if (o.do === "shield" || o.do === "shieldAlly" || o.do === "tempShield") {
      // ofDealt shield (Mallet) = the damage just dealt → mirror the preceding deal's number/scaling;
      // plusRangedBonus shield (Force) scales off the caster's ranged bonus.
      parts.push({ effect: "shield", base: o.ofDealt ? (lastDeal?.base ?? 0) : (o.amount ?? 0),
        glyph: "🛡", count: 1, ofDealt: !!o.ofDealt, plusRanged: !!o.plusRangedBonus });
    } else if (o.do === "healAlly" || o.do === "healSelf") {
      parts.push({ effect: "heal", base: o.amount ?? 0, glyph: "❤", count: 1 });
    } else if (o.do === "summon" || o.do === "summonPick" || o.do === "animateWeapons") {
      parts.push({ effect: "summon", base: o.count ?? (o.budget ? 1 : 1), glyph: "🐀", count: 1 });
    }
  }
  return parts;
}
// One outcome part → its printed segment. Deals read "number+glyph(+×count)" (the glyph names the
// SCALING SOURCE — the established damage convention: 🗡 melee · 🎯 ranged · 🛡 shield · 👥 allies);
// shields/heals read "glyph+number" (the glyph names the OUTCOME: 🛡 shield gained · ❤ heal); summons
// read "🐀×count" (tokens, not damage).
const partSeg = (p, n) => p.effect === "summon" ? `🐀×${p.base}`
  : p.effect === "deal" ? `${n}${p.glyph}${p.count > 1 ? `×${p.count}` : ""}`
  : `${p.glyph}${n}`;
// BASE compound label (no caster bonus) — the discoverable printed numbers on a static tile.
export function cardSummaryLabel(key) { return cardOutcomes(key).map((p) => partSeg(p, p.base)).join("  "); }
// LIVE compound label for caster `c`: fold the caster's applicable bonus into each scaling part with
// the SAME math cardLiveDmg uses. ofShield deals read the caster's current shield; ofDealt shields
// mirror the preceding deal's live value; plusRanged shields add the ranged bonus. → { label, boosted }.
export function cardLiveSummary(key, c, allies = 0) {
  const parts = cardOutcomes(key);
  if (!parts.length) return { label: "", boosted: false };
  let boosted = false, lastDealLive = 0;
  const segs = parts.map((p) => {
    let n = p.base;
    if (p.effect === "deal") {
      if (p.ofShield) n = c?.shield ?? 0;
      else if (p.ofHp) n = Math.max(0, c?.hp ?? 0);
      else n = p.base + liveDealBonus(key, p, c, allies);
      lastDealLive = n;
      if (n > p.base) boosted = true;
    } else if (p.effect === "shield") {
      if (p.ofDealt) n = lastDealLive;
      else if (p.plusRanged) n = p.base + rangedBonusOf(c);
      if (n > p.base) boosted = true;
    }
    return partSeg(p, n);
  });
  return { label: segs.join("  "), boosted };
}

// ── CARD GLYPHS (2026-08-04) — machine-derived compact shorthand ────────────────────────────
// ONE short string per card = "what this card actually does", derived STRAIGHT from KIT[*].ops
// (never the prose `text`). Shipped on the compact combat surfaces where a card NAME already
// shows with no room for prose: the foe cast-queue chips, the summon strip, and the hero /
// companion intent-badge + queued-card projections (engine/snapshot.js). Live numbers use the
// SAME math as every other preview (liveDealBonus here; the foe-queue site passes the
// foeItemDmg-resolved per-hit through opts.dealNow) so a glyph can never disagree with the
// cast bar or hand number beside it.
//
// FLAG (owner): the ENTIRE vocabulary below is a placeholder table — every symbol and wording
// is the owner's to re-tune. Symbols lean on glyphs the client already renders on canvas
// (♥ ⚡ ☠ 🛡 🎯 🌵 🪨 🐌 ⏩ ⛔ 🔻 🪞 🌟 🩸 from card faces / effect chips), plus these shapes:
//   ▮N ▮▮N ▮▮▮N   damage to the front / front-2 / front-3 foe(s)
//   🎯N            damage to the aimed target (foe-side pick snipes; falls back to the front foe)
//   ≡N             damage to a whole lane (own / aimed / stored)   ☄N every lane   ✦N random target
//   ×k             the hit repeats k times          ⤵ excess overflows (⤵✦ leaps to a random foe)
//   ♥N heal · ♥full full heal · ♥=dmg lifesteal (heal = the damage dealt)
//   🛡N shield (🛡N⏳ temporary · 🛡=dmg shield = the damage dealt · 🛡=lost shield = missing HP)
//   ☠N poison · ↓N sap (target deals −N) · ↓½ halves damage · 🐌 halves moxie gain
//   🔻N takes +N from all sources · ⛔ stasis lockout (≡-prefixed when lane-wide)
//   ↑N buff (+N dmg; ↑N🗡 melee-only · ↑N🎯 ranged-only · ↑N🗡/🎯 pick a kind)
//   ⚡+N moxie gain · ⚡=dmg moxie refund = damage dealt · 🩸N self-damage · 🌵N thorns · 🪨N dmg reduction
//   ＋Name(×k) summon · 🪞 reflect the next hit · 🌟N the next N hits become 1 · ▮+N the front foe takes +N extra
//   ↩ push · ↪ pull · ⇆ rearrange the lane
//   ⟲6s the tokens before it repeat every 6s · ⏳6s they land once, later · ⟲6s+1 repeats and grows by 1
//
// FLAG (owner): EVERY override below is a HAND-AUTHORED string for a card whose ops do NOT
// decompose into the vocabulary — this table doubles as the owner's "too complex to shorthand"
// audit list for his simplify pass. Re-word freely; keys must exist in KIT (test-enforced).
export const GLYPH_OVERRIDES = Object.freeze({
  coolShoes:       "⚡+1/play",     // FLAG: moxieOnPlay trigger — no per-event vocabulary
  oJesterplate:    "⚡+1/hit",      // FLAG: moxieOnHit trigger
  oCrystalBall:    "🃏pick ↑1🎯",   // FLAG: tutor (fetch any deck card) has no glyph
  oDualHand:       "🗡⚡6+ ×2",     // FLAG: rules change — melee cards costing 6+ resolve twice
  oTeleBlades:     "🗡→🎯aim",      // FLAG: rules change — melee aims like ranged, scales with 🎯
  oGiantsBelt:     "HP×2 ♥+HP",    // FLAG: once per fight — double base max HP, heal the gain
  oPunishGlutton:  "🛡10 2×dmg",   // FLAG: shieldMod "double" — the shield drains twice per hit
  oGrandSpirit:    "＋Spirit pick", // FLAG: summonPick choice (attacker / caster / tank body)
  oDivineTreasure: "＋⚔⚡10 ⟲6s",  // FLAG: animateWeapons — 10 moxie of weapon tokens every 6s
});
// Scope prefix for a DAMAGE token (always) and for a debuff token (lane/board scopes only —
// single-target debuffs read scope from the hit beside them, matching the oIce "🎯3 ↓3" shape).
const GLYPH_SHAPE = { front: "▮", front2: "▮▮", front3: "▮▮▮", pick: "🎯", storedTarget: "🎯",
  lane: "≡", pickLane: "≡", selfLane: "≡", storedLane: "≡", board: "☄", random: "✦" };
const glyphLaneish = (target) => target === "board" ? "☄"
  : ["lane", "pickLane", "selfLane", "storedLane"].includes(target) ? "≡" : "";
const glyphSecs = (period) => `${Math.round((period ?? 60) / 10)}s`;
// The derivation. `caster` null = base numbers (static surfaces / tests); with a caster the deal /
// plus-ranged numbers fold that entity's LIVE bonuses via liveDealBonus/rangedBonusOf. opts:
//   dealNow — resolver-supplied per-hit total for the FIRST deal group (the foe-queue site passes
//             foeItemDmg's number so source multipliers like the half-strength Lich orb hold);
//             mirrored ofDealt/ofLastHit riders follow it, so "🎯3 ↓3" can never split.
//   pick    — a known weaponChoice pick ("rapier"/"spear"/"staff"); falls back to the caster's
//             _pick, then the authored fallback — the same order foeOpsDmg resolves.
export function cardGlyphs(key, caster = null, allies = 0, opts = {}) {
  if (GLYPH_OVERRIDES[key] != null) return GLYPH_OVERRIDES[key];
  const it = KIT[key]; if (!it?.ops?.length) return "";
  const rawKind = cardKind(key), kind = rawKind === "untyped" ? triggerKind(key) : rawKind;
  const plusRanged = (o) => (o.plusRangedBonus || o.plusRanged) && caster ? rangedBonusOf(caster) : 0;
  const state = { lastDeal: 0, dealNowUsed: false };
  const segs = [];   // { text, when } — when = null (immediate) | "⟲6s" | "⏳10s" | "⟲6s+1" …
  const walk = (ops, when) => {
    const choice = (ops ?? []).find((o) => o.do === "weaponChoice");
    const choices = new Set((choice?.options ?? []).map((o) => o.key));
    const picked = choices.has(opts.pick) ? opts.pick
      : choices.has(caster?._pick) ? caster._pick
      : (choice?.fallback ?? choice?.options?.[0]?.key);
    const list = (ops ?? []).filter((o) => o.do !== "weaponChoice" && (!o.whenPick || o.whenPick === picked));
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o.do === "deal") {
        let count = Math.max(1, o.hits ?? 1);   // collapse a multi-hit run (Omnislash / Flame Orbs)
        while (i + 1 < list.length && list[i + 1].do === "deal" && sameDeal(list[i + 1], o)) { count += Math.max(1, list[i + 1].hits ?? 1); i++; }
        let n;
        if (o.ofShield) n = caster ? (caster.shield ?? 0) : "=🛡";
        else if (o.ofHp) n = caster ? Math.max(0, caster.hp ?? 0) : "=HP";
        else n = (o.amount ?? 0) * (o.mult ?? 1)
          + (caster ? liveDealBonus(key, { kind, bothKinds: !!o.bothKinds, perAlly: o.perAlly ?? 0 }, caster, allies) : 0);
        if (opts.dealNow != null && !state.dealNowUsed) { n = opts.dealNow; state.dealNowUsed = true; }
        if (typeof n === "number") state.lastDeal = n;
        segs.push({ text: `${GLYPH_SHAPE[o.target] ?? ""}${n}${count > 1 ? `×${count}` : ""}${o.overflowRandom ? "⤵✦" : o.overflow ? "⤵" : ""}`, when });
        if (o.lifesteal) segs.push({ text: "♥=dmg", when });
        if (o.shieldFromDealt) segs.push({ text: "🛡=dmg", when });
        if (o.moxieFromDealt) segs.push({ text: "⚡=dmg", when });
        if (o.frontExtra) segs.push({ text: `▮+${o.frontExtra}`, when });   // Whip's front rider
        // Moonlight Greatsword: the lane beam exists exactly while BOTH live bonuses clear the
        // bar — a conditional token present only when the beam would actually fire. FLAG wording.
        if (o.beamWhenDual && caster && meleeBonusOf(caster) >= o.beamWhenDual && rangedBonusOf(caster) >= o.beamWhenDual)
          segs.push({ text: `≡${n}`, when });
      }
      else if (o.do === "shield" || o.do === "tempShield" || o.do === "shieldAlly") {
        const n = o.ofDealt ? state.lastDeal : (o.amount ?? 0) + plusRanged(o);
        segs.push({ text: `🛡${n}${o.do === "tempShield" ? "⏳" : ""}`, when });
      }
      else if (o.do === "shieldMissing")
        segs.push({ text: caster ? `🛡${Math.max(0, (caster.maxHp ?? 0) - (caster.hp ?? 0))}` : "🛡=lost", when });
      else if (o.do === "sap")
        segs.push({ text: `${glyphLaneish(o.target)}↓${(o.ofDealt || o.ofLastHit) ? state.lastDeal : (o.amount ?? 0) + plusRanged(o)}`, when });
      else if (o.do === "poison") segs.push({ text: `${glyphLaneish(o.target)}☠${(o.amount ?? 0) + plusRanged(o)}`, when });
      else if (o.do === "vulnerable") segs.push({ text: `${glyphLaneish(o.target)}🔻${(o.amount ?? 0) + plusRanged(o)}`, when });
      else if (o.do === "weakness") segs.push({ text: `${glyphLaneish(o.target)}↓½`, when });
      else if (o.do === "slow") segs.push({ text: `${glyphLaneish(o.target)}🐌`, when });
      else if (o.do === "stasis") segs.push({ text: `${glyphLaneish(o.target)}⛔`, when });
      else if (o.do === "leech") {
        const n = (o.amount ?? 0) + plusRanged(o), rec = `⟲${glyphSecs(o.period)}`;
        const prev = segs[segs.length - 1], prev2 = segs[segs.length - 2];
        // Lifedrain's shape — an identical lifesteal hit followed by the same recurring drain reads
        // as ONE "drain N now and every 6s" group instead of printing the pair twice.
        if (prev?.text === "♥=dmg" && typeof prev2?.text === "string" && prev2.text.endsWith(String(n)))
          segs.push({ text: "", when: rec });
        else { segs.push({ text: `${GLYPH_SHAPE[o.target] ?? "🎯"}${n}`, when: rec }); segs.push({ text: "♥=dmg", when: rec }); }
      }
      else if (o.do === "tornado") segs.push({ text: `≡${(o.amount ?? 0) + plusRanged(o)}`, when: `⟲${glyphSecs(o.period)}` });
      else if (o.do === "healSelf" || o.do === "healAlly" || o.do === "healLowest")
        segs.push({ text: `♥${(o.amount ?? 0) + plusRanged(o)}`, when });
      else if (o.do === "healPath") segs.push({ text: `♥${o.ofDealt ? state.lastDeal : o.amount ?? 0}`, when });
      else if (o.do === "healFull") segs.push({ text: "♥full", when });
      else if (o.do === "counter") segs.push({ text: `↑${o.amount ?? 1}`, when });
      else if (o.do === "rangedBonus") segs.push({ text: `↑${o.amount ?? 1}🎯`, when });
      else if (o.do === "modalBonus") segs.push({ text: `↑${o.amount ?? 1}🗡/🎯`, when });
      else if (o.do === "modalBonusPerHp")   // Transcend fires AFTER its full heal, so live = maxHp/divisor
        segs.push({ text: caster ? `↑${Math.floor(Math.max(0, caster.maxHp ?? caster.hp ?? 0) / Math.max(1, o.divisor ?? 5))}🗡/🎯` : `↑HP÷${o.divisor ?? 5}`, when });
      else if (o.do === "buff")
        segs.push({ text: o.buff === "haste" ? "⏩"
          : o.buff === "stoneskin" ? `🪨${o.amount ?? 1}${(o.dur ?? 9999) < 9999 ? "⏳" : ""}`
          : `↑${o.amount ?? 1}`, when });
      else if (o.do === "regen") {
        const rec = `⟲${glyphSecs(o.period)}`;
        if (o.kind === "heal") segs.push({ text: `♥${o.amount ?? 1}`, when: rec });
        else if (o.kind === "shield") segs.push({ text: `🛡${o.amount ?? 1}`, when: rec });
        else if (o.kind === "moxie") segs.push({ text: `⚡+${o.amount ?? 1}`, when: rec });
        else if (o.kind === "modalBonus") segs.push({ text: `↑${o.amount ?? 1}🗡/🎯`, when: rec });
        else if (o.kind === "berserk") segs.push({ text: `↑${o.melee ?? 1}🗡`, when: rec },
          { text: `🛡${o.shield ?? 1}`, when: rec }, { text: `🩸${o.amount ?? 1}`, when: rec });
        else segs.push({ text: "?", when: rec });   // unknown regen kind → loud (test forbids "?")
      }
      else if (o.do === "timer") {
        const mark = `${o.once ? "⏳" : "⟲"}${glyphSecs(o.period)}${o.ramp ? `+${o.ramp}` : ""}`;
        const before = segs.length;
        walk(o.ops ?? [], mark);
        const inner = segs.slice(before);
        // "Now and again every 6s" cards (Wars Eternity / Black Hole / Cross-Blade): when the timer
        // repeats EXACTLY the tokens just printed, collapse to a single trailing marker.
        const tail = segs.slice(Math.max(0, before - inner.length), before);
        if (inner.length && tail.length === inner.length
          && tail.every((s, j) => s.when === when && s.text === inner[j].text)) {
          segs.length = before;                     // drop the duplicated token run…
          segs.push({ text: "", when: mark });      // …keep only the timing marker
        }
      }
      else if (o.do === "selfHit") segs.push({ text: `🩸${o.amount ?? 1}`, when });
      else if (o.do === "gainMoxie") segs.push({ text: `⚡+${o.amount ?? 1}`, when });
      else if (o.do === "summon")
        segs.push({ text: `＋${BODIES[o.body]?.name ?? o.body}${(o.count ?? 1) > 1 ? `×${o.count}` : ""}`, when });
      else if (o.do === "pullFront") segs.push({ text: "↪", when });
      else if (o.do === "repositionPick") segs.push({ text: "↩", when });
      else if (o.do === "laneArrange") segs.push({ text: "⇆", when });
      else if (o.do === "mirror") segs.push({ text: "🪞", when });
      else if (o.do === "revealLight") segs.push({ text: `🌟${o.count ?? 1}`, when });
      else if (o.do === "thorns") segs.push({ text: `🌵${o.amount ?? 1}`, when });
      else segs.push({ text: "?", when });          // unknown op → loud "?" (test forbids it; add
                                                    // vocabulary or a GLYPH_OVERRIDES entry)
    }
  };
  walk(it.ops, null);
  // Assembly: emit each token, and one timing marker at the END of every run sharing that timing
  // (Sage Mode's two 6s regens read "♥1 ↑1🗡/🎯 ⟲6s", not two markers).
  const parts = [];
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].text) parts.push(segs[i].text);
    const w = segs[i].when;
    if (w && (i + 1 >= segs.length || segs[i + 1].when !== w)) parts.push(w);
  }
  return parts.join(" ");
}

// Card instances carry a unique id so duplicate keys + shuffle/draw animations are unambiguous.
let _cardSeq = 1;
// Persistence restore: move the process-local mint strictly past an observed durable id without
// manufacturing cards (or touching RNG). Returns the next id suffix for focused verification.
export function floorCardIdCounter(maxUsed) {
  if (!Number.isSafeInteger(maxUsed) || maxUsed < 0) throw new RangeError("card id floor must be a nonnegative safe integer");
  _cardSeq = Math.max(_cardSeq, maxUsed + 1);
  return _cardSeq;
}
export const mintCard = (key) => ({ id: "c" + _cardSeq++, key });
export const mintCards = (keys) => (keys ?? []).filter((k) => KIT[k] && isCard(k)).map(mintCard);
export function shuffle(a) {   // Fisher–Yates, in place
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Shuffle a player's collection into the draw pile, draw up to a full hand. Resets moxie. Called at
// beginCombat (and any time the collection changes mid-fight, e.g. a card joins). Idempotent-ish.
export function dealHand(p) {
  p.cards ??= [];
  const want = Math.min(handSizeFor(p), p.cards.length);
  const pool = shuffle([...p.cards]);
  p.hand = pool.slice(0, want);
  p.deck = pool.slice(want);
  p.disc = [];                         // DISCARD pile (owner 2026-07-01) — played cards rest here until the deck runs dry
  p.inPlay = [];                       // fight-long PASSIVE cards already played (lasting) — reset each combat
  p.moxie = START_MOXIE; p.moxieClock = 0;
}
// EXHAUST-BEFORE-REPEAT (owner 2026-07-01): a played card goes to the DISCARD, not straight back
// into the draw pile — you see your WHOLE deck before any card repeats. (Foes already worked this
// way: their queue rotates front→back.) Only when the draw pile runs dry does the discard shuffle
// back in to become the new deck.
export function recycleDeck(p) {
  if ((p.deck?.length ?? 0) === 0 && (p.disc?.length ?? 0) > 0) {
    // Every hero body (companions included now — owner 2026-07-28) reshuffles its discard like a player.
    p.deck = shuffle(p.disc);
    p.disc = [];
  }
}
// Draw from the deck to refill the hand toward HAND_SIZE (deck holds the rest of the collection);
// a dry deck recycles the discard first, so drawing only stops when BOTH piles are empty.
export function drawUp(p) {
  const want = handSizeFor(p);
  while ((p.hand?.length ?? 0) < want) {
    if ((p.deck?.length ?? 0) === 0) { recycleDeck(p); if ((p.deck?.length ?? 0) === 0) break; }
    p.hand.push(p.deck.shift());
  }
}
// Foe queue: a foe draws its cards from the SAME pool + school-fit builder a player uses (rollKit →
// the owner's set), so the card VOCABULARY is 1:1. But a foe OPENS SMALL — only FOE_START_MIN..MAX
// (1–2) cards, not a player's full 10 (owner 2026-06-22); we take the first slots of rollKit, which
// are its in-house (school-correct) guarantees. Deck SIZE is intentionally asymmetric here — the
// owner is reworking the ante/scaling that grows a foe's deck. The draw differs too (visible queue
// vs hidden hand, the telegraph — owner kept it). Stocked owner-card gear joins on top.
export const FOE_START_MIN = 1, FOE_START_MAX = 2; // a foe's starting card count (tunable)
export function buildQueue(foe, gearKeys = []) {
  const b = BODIES[foe.bodyKey] || {};
  // Bosses run a scripted deck (no queue). SUMMON tokens cast their OWN innate kit — summon-only cards
  // (e.g. a rat's Bite), NEVER the player pool — and a summon-ENTITY (the Djinn's animated item) with
  // no kit casts the gear it embodies. Normal foes cast EXACTLY their stocked gear (WYSIWYG, owner
  // 2026-06-24): off-pool legacy gear is dropped, with a one-card rollKit fallback only if a foe has no
  // castable gear (rollFoeGear's guaranteed damaging first slot means it never fires in practice). The
  // old 1–2 innate rollKit cards stacked ON TOP of gear are gone.
  let keys;
  if (b.boss) keys = [];
  else if (b.summon) keys = (b.kit?.length ? b.kit : gearKeys).filter((k) => KIT[k] && isCard(k));
  else {
    const gear = gearKeys.filter((k) => PLAYER_POOL.includes(k) && foeCardAllowed(foe.bodyKey, k));
    const fallback = gear.length ? [] : rollKit(foe.bodyKey)
      .filter((k) => foeCardAllowed(foe.bodyKey, k)).slice(0, FOE_START_MIN);
    keys = [...gear, ...fallback].filter((k) => KIT[k] && isCard(k));
  }
  foe.queue = shuffle(keys.map(mintCard));
  foe.moxie = START_MOXIE; foe.moxieClock = 0;
}
// Add moxie without ever destroying an existing authored overflow. Ordinary gains still stop at the
// normal cap; Stockbroking Sphinx passes its larger one-shot ceiling so the overflow remains spendable.
export function gainMoxieCapped(e, amount, cap = MOXIE_CAP) {
  if (!e || !(amount > 0)) return 0;
  const before = Math.max(0, e.moxie ?? 0);
  e.moxie = Math.max(before, Math.min(cap, before + amount));
  return e.moxie - before;
}

// One moxie tick for any caster: +step toward the next second; on a full second, +1 moxie (capped).
export function regenMoxie(e, step = 1) {
  if (hasBuff(e, "stasis")) return;               // ZA WARUDO (W2-C): can't gain moxie while in stasis — the single moxie clock, symmetric for heroes/foes/allies (suppression point 2/3)
  if (e?.bodyKey === "econElemental") return;      // this body banks only its authored 10-moxie pulse; Haste/Slow never restore ordinary regen
  if (hasBuff(e, "slow")) step *= 0.5;            // Slow (owner 2026-06-27): moxie charges at HALF rate while slowed
  step *= e.moxieGainMul ?? 1;                    // Timeshare Tyrant Mastery: all owned summons charge at double speed
  e.moxieClock = (e.moxieClock ?? 0) + step;
  while (e.moxieClock >= MOXIE_REGEN_TICKS) { e.moxieClock -= MOXIE_REGEN_TICKS; gainMoxieCapped(e, 1); }
}
