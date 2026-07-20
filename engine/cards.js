// King Mimic engine — deck/card logic + moxie constants (extracted from game.js barrel).
// Imports leaf data from bodies/kit; rollKit + hasBuff are call-time forward deps (via barrel).
import { BODIES } from "./bodies.js";
import { KIT, KIT_POOL, isCard, cardKind, kindBonusOf, meleeBonusOf, rangedBonusOf, triggerKind } from "./kit.js";
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
export const ARCHIVED_PLAYER_CARDS = Object.freeze(["oCrystalBall"]);
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
  // NEW (owner 2026-07-10, batch 2 / W2-A — 4 piercing + multi-hit melee cards; costs FLAGGED in kit.js).
  // In the pool = draftable / loot / shop / foe gear (the symmetry pillar). FLAG (owner): pool placement
  // + rarity is his call. NOTE (symmetry): foe-side pierce IS now wired (MOD-3, owner 2026-07-10) —
  // a FOE casting one of these bypasses the target player's shield/ward/DR/stoneskin (damagePlayer pierce).
  "oButterflyKnife", "oMirrorMace", "oMeteorMaul", "oTriblade",
  // NEW (owner 2026-07-10, batch W2-B — 2 special shields w/ per-shield damage modifiers; costs FLAGGED in kit.js):
  "oPunishGlutton", "oRevealLight",
  // NEW (owner 2026-07-10, batch 2 W2-C — foe control; costs/durations FLAGGED in kit.js). Symmetric:
  // foes cast these at players too (Banshee saps the hero lane; Za Warudo stasis-locks it).
  "oBansheeWail", "oZaWarudo",
  // NEW (owner 2026-07-10, batch W2-D — 3 cards; reposition/periodic/delayed; numbers FLAGGED in kit.js).
  "oGravitySword", "oCrimsonCrown", "oStarblade",
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
  if (kd && (tk === kd.kind || tk === "both")) c = kd.set != null ? kd.set : Math.max(kd.floor ?? 0, c - (kd.amount ?? 1));
  if (body?.costAdd) c = Math.min(body.costMax ?? 10, c + body.costAdd);   // Nepotistic Neptune (owner 2026-06-27): all cards cost +N, capped at costMax
  return c;
};
// The LIVE play cost — cardCost plus the caster's per-fight STATE: Pyramid-Scheme Head's FREE next
// card. Used by playCard/foeCast AND the hand-affordability display so the UI and the spend agree.
// (Dual-Handing Two-Handers' old melee-5+ cost −3 was REMOVED 2026-07-10 — its effect is now a replay
// of ≥6-cost melee cards, applied in playCard/foeCast via the `dualWield` flag, NOT a cost change.)
export const playCost = (key, body, player) => {
  let c = cardCost(key, body);
  if (player?.freeNext) c = 0;
  else if ((player?.firstCardDiscount ?? 0) > 0 && !player?._firstCardPlayed)
    c = Math.max(1, c - player.firstCardDiscount);
  if ((player?.nextRangedDiscount ?? 0) > 0 && ["ranged", "both"].includes(triggerKind(key)))
    c = Math.max(0, c - player.nextRangedDiscount);
  return c;
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
  const allOps = flattenTimers(it.ops);
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
    else {
      let bonus = info.bothKinds
        ? meleeBonusOf(c) + rangedBonusOf(c)
        : (info.kind === "melee" || info.kind === "ranged") ? kindBonusOf(c, info.kind) : 0;
      if (info.perAlly) bonus += info.perAlly * Math.max(0, allies);             // ally-count scaling
      nowN = baseN + bonus;
    }
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
  const ops = it.ops.some(isPrimary) ? it.ops : flattenTimers(it.ops);
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
      else {
        let bonus = p.bothKinds ? meleeBonusOf(c) + rangedBonusOf(c)
          : (p.kind === "melee" || p.kind === "ranged") ? kindBonusOf(c, p.kind) : 0;
        if (p.perAlly) bonus += p.perAlly * Math.max(0, allies);
        n = p.base + bonus;
      }
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

// Card instances carry a unique id so duplicate keys + shuffle/draw animations are unambiguous.
let _cardSeq = 1;
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
  const want = Math.min(HAND_SIZE, p.cards.length);
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
  if ((p.deck?.length ?? 0) === 0 && (p.disc?.length ?? 0) > 0) { p.deck = shuffle(p.disc); p.disc = []; }
}
// Draw from the deck to refill the hand toward HAND_SIZE (deck holds the rest of the collection);
// a dry deck recycles the discard first, so drawing only stops when BOTH piles are empty.
export function drawUp(p) {
  while ((p.hand?.length ?? 0) < HAND_SIZE) {
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
    const gear = gearKeys.filter((k) => PLAYER_POOL.includes(k));
    const fallback = gear.length ? [] : rollKit(foe.bodyKey).slice(0, FOE_START_MIN);
    keys = [...gear, ...fallback].filter((k) => KIT[k] && isCard(k));
  }
  foe.queue = shuffle(keys.map(mintCard));
  foe.moxie = START_MOXIE; foe.moxieClock = 0;
}
// One moxie tick for any caster: +step toward the next second; on a full second, +1 moxie (capped).
export function regenMoxie(e, step = 1) {
  if (hasBuff(e, "stasis")) return;               // ZA WARUDO (W2-C): can't gain moxie while in stasis — the single moxie clock, symmetric for heroes/foes/allies (suppression point 2/3)
  if (hasBuff(e, "slow")) step *= 0.5;            // Slow (owner 2026-06-27): moxie charges at HALF rate while slowed
  step *= e.moxieGainMul ?? 1;                    // Timeshare Tyrant Mastery: all owned summons charge at double speed
  e.moxieClock = (e.moxieClock ?? 0) + step;
  while (e.moxieClock >= MOXIE_REGEN_TICKS) { e.moxieClock -= MOXIE_REGEN_TICKS; e.moxie = Math.min(MOXIE_CAP, (e.moxie ?? 0) + 1); }
}
