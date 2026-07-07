// King Mimic engine — deck/card logic + moxie constants (extracted from game.js barrel).
// Imports leaf data from bodies/kit; rollKit + hasBuff are call-time forward deps (via barrel).
import { BODIES } from "./bodies.js";
import { KIT, KIT_POOL, isCard, cardKind, kindBonusOf } from "./kit.js";
import { CARD_COST } from "../content-cards.js";
import { rollKit, hasBuff } from "../game.js";

export const DRAFT_PICKS = 3;   // how many items each player drafts at the start of a run
export const STOCK_MAX = 12;        // hard ceiling on total foes in a room (back-compat / retired stock UI)
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
// PLAYER_POOL — the OWNER's canonical base set (the `o*` keys). THIS is the in-game card universe:
// the draft wheel, starter decks, loot and shop all draw from here. The retired first-set keys are
// excluded on purpose (kept in KIT only as test scaffolding). Defined here as the single source the
// pools below derive from; see the KIT section flagged "OWNER'S CANONICAL BASE SET".
export const PLAYER_POOL = [
  "oSword", "oHatchet", "oSpear", "oBow", "oDagger", "oJavelin", "oMallet", "oZweihander",
  "oTwinUchis", "oPowerUp", "oComboBlade",                                    // base melee (11)
  "oFire", "oIce", "oLightning", "oArcane", "oDark", "oWind", "oHoly", "oForce", "oMeteors", // base ranged/utility (9)
  // DEFENSIVE SET (owner 2026-06-24) — now live in draft/loot/foe kits (11)
  "dBuckler", "dTaunt", "dShield", "dShieldBash", "dHeartGuard", "dThorns",
  "dStoneskin", "dBloodIron", "dTowerShield", "dTrollskin", "dLiquidMetal",
  // OWNER BATCH (owner 2026-06-25) — new cards in draft/loot/foe kits. (13)
  // `coolShoes` is a CASTABLE LASTING card since 2026-07-06 (owner: "there's no such thing as a passive").
  // isCard() filters it from the combat deck/queue (never drawn/cast); it only acts while held. Safe to
  // draft now that deckKeys no longer pads short decks (the old Swords-seeding bug is fixed).
  "oOmnislash", "oHaste", "oHedgeKnight", "oMoxiePool", "oGlacius", "oSharpEdges",
  "oWizardHat", "oRepeatXbow", "oDemonForm", "oSageMode", "oBerserker", "oPileOn",
  "coolShoes",
  // NEW (owner 2026-06-27, batch B):
  "oButcherCleaver", "oPetLeech", "oSlow", "oAnimatedBlade", "oWeakness",
];
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
// less", floor 1). Passing no body = the raw cost (tests/tools). Used everywhere cost is read so the
// hand, foe queue, affordability, and the spend all agree.
export const cardCost = (key, body) => {
  let c = KIT[key]?.cost ?? defaultCardCost(key);
  const d = body?.costDiscount;
  if (d && KIT[key]?.type === d.school) c = Math.max(1, c - (d.amount ?? 1));
  if (body?.costAdd) c = Math.min(body.costMax ?? 10, c + body.costAdd);   // Nepotistic Neptune (owner 2026-06-27): all cards cost +N, capped at costMax
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
  const deals = it.ops.filter((o) => (o.do === "deal" || o.do === "schoolStrike"));
  if (deals.length) {
    const d = deals[0];
    // a multi-hit card is N identical `deal` ops on the SAME target — count them so the label is "x×N".
    const same = deals.filter((o) => (o.amount ?? 0) === (d.amount ?? 0) && o.target === d.target
      && !!o.ofShield === !!d.ofShield && (o.perAlly ?? 0) === (d.perAlly ?? 0));
    const count = same.length;
    const glyph = d.ofShield ? "🛡" : d.perAlly ? "👥" : cardKind(key) === "melee" ? "🗡" : cardKind(key) === "ranged" ? "🎯" : "";
    return { effect: "deal", amount: d.amount ?? 0, mult: d.mult ?? 1, count, glyph,
             kind: cardKind(key), perAlly: d.perAlly ?? 0, ofShield: !!d.ofShield };
  }
  const s = it.ops.find((o) => o.do === "shield");
  if (s) return { effect: "shield", amount: s.amount ?? 0, mult: s.mult ?? 1, count: 1, glyph: "🛡", ofDealt: !!s.ofDealt };
  const h = it.ops.find((o) => o.do === "healAlly" || o.do === "healSelf");
  if (h) return { effect: "heal", amount: h.amount ?? 0, mult: 1, count: 1, glyph: "❤" };
  const su = it.ops.find((o) => o.do === "summon");
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
    else {
      let bonus = (info.kind === "melee" || info.kind === "ranged") ? kindBonusOf(c, info.kind) : 0;
      if (info.perAlly) bonus += info.perAlly * Math.max(0, allies);             // Pile On: +perAlly per ally
      nowN = baseN + bonus;
    }
  }
  return { label: dmgLabelFrom(info, nowN), base: baseN, now: nowN,
           boosted: nowN > baseN, glyph: info.glyph, count: info.count };
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
  if (hasBuff(e, "slow")) step *= 0.5;            // Slow (owner 2026-06-27): moxie charges at HALF rate while slowed
  e.moxieClock = (e.moxieClock ?? 0) + step;
  while (e.moxieClock >= MOXIE_REGEN_TICKS) { e.moxieClock -= MOXIE_REGEN_TICKS; e.moxie = Math.min(MOXIE_CAP, (e.moxie ?? 0) + 1); }
}
