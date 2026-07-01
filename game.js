// King Mimic — pure game logic (no networking, no I/O).
// server.js wires this to WebSockets; tests import it and drive it deterministically.
// Every function takes a `room` (plain state object) and mutates/returns plainly.

// CARD/MOXIE COMBAT (rewrite 2026-06-21, see CARDS_SPEC.md): cooldowns are DEAD. Every card-casting
// entity has MOXIE (0..MOXIE_CAP, +1/sec). Cards (KIT entries with `ops`) cost moxie. resolveOps is
// unchanged — playing a card spends moxie then resolves its ops. Players hold a HAND drawn from a
// shuffled DECK (a played card shuffles back in, you draw a fresh one); foes cycle an ordered QUEUE
// (cast the front when affordable, move it to the back). Body passives / summons / boss clocks stay.
import { CARD_COST } from "./content-cards.js"; // FOE_DECKS retired: foes now build decks via rollKit (1:1 parity)

// ---------------------------------------------------------------------------
// Tunables / data
// ---------------------------------------------------------------------------

// --- barrel: bodies/lane/HP-mult leaf data now lives in engine/bodies.js ---
export * from "./engine/bodies.js";
import {
  LANES, LANE_FLOOR, deriveLaneCount, getHpMult, setHpMult, bodyMaxHp,
  getCdMult, setCdMult, cdScale, ROOM_SIZE, GOD_CD, STALL_LIMIT,
  BODIES, STARTER_BODY, clog, logNm, MOXIE_SET, ELITE_SET, COMMON_SET,
  SET_COMMONS, DRAFT_BODIES, DRAFT_WHEEL_MIN, CLASSES,
} from "./engine/bodies.js";


// --- barrel: KIT table + item/card classification now lives in engine/kit.js ---
export * from "./engine/kit.js";
import {
  KIT, isPassiveItem, isRanged, cardKind, triggerKind,
  meleeBonusOf, rangedBonusOf, kindBonusOf, kindForOp, foeOpSnipes,
  KIT_POOL, itemTreasure, isCard, MAX_KIT,
} from "./engine/kit.js";
// --- barrel: deck/card logic + moxie constants now live in engine/cards.js ---
export * from "./engine/cards.js";
import {
  DRAFT_PICKS, STOCK_MAX, MOXIE_CAP, MOXIE_REGEN_TICKS, POISON_PERIOD, START_MOXIE, HAND_SIZE,
  MIN_DECK, PLAYER_POOL, STARTER_DECK, deckKeys, countKey, defaultCardCost, cardCost,
  cardDealInfo, cardScaleGlyph, cardDmgLabel, cardLiveDmg, mintCard, mintCards, shuffle,
  dealHand, drawUp, FOE_START_MIN, FOE_START_MAX, buildQueue, regenMoxie,
} from "./engine/cards.js";

// ===========================================================================
// FOE LEVELS (owner spec 2026-06-27) — every combatant has an integer level ≥ 1. A room holds foes
// of a RANGE of levels (see generateRoomFoes). LEVEL 1 IS THE BASE (no bonus). Each level grants,
// CUMULATIVELY (owner correction 2026-06-27 — the combat grant starts at LEVEL 3, not level 1):
//   • reaching an EVEN level → +3 HP   (L2, L4, L6 …)
//   • reaching an ODD level ≥3 → +1 COMBAT (L3, L5, L7 …; the relevant damaging stat: melee OR ranged)
//   So L1 BASE · L2 +3 HP · L3 +1 combat · L4 +6 HP +1 combat · L5 +6 HP +2 combat …  ⇒
//     HP bonus     = LEVEL_HP_PER_EVEN   × floor(L/2)
//     combat bonus = LEVEL_COMBAT_PER_ODD × floor((L-1)/2)
// And each level adds +2 ANTE (scales infinitely): a foe's total ante = sum(item ante) + 2×level.
// SYMMETRY PILLAR (owner 2026-06-27): leveling is the SAME for both sides — a level-3 Market-Crash
// Minotaur is identical as a player or a foe. Players level their OWN bodies on this curve (applyBodyLevel).
export const LEVEL_HP_PER_EVEN   = 3;   // +HP granted on reaching each EVEN level (tunable)
export const LEVEL_COMBAT_PER_ODD = 1;  // +combat granted on reaching each ODD level ≥3 (tunable)
export const LEVEL_ANTE_PER      = 2;   // +ante per level — "+2 ANTE to the foe" (tunable)
export const FOE_LEVEL_MIN       = 1;   // every foe is at least level 1 (the BASE — no bonus)
export const foeLevel        = (f) => Math.max(FOE_LEVEL_MIN, (f?.level ?? FOE_LEVEL_MIN) | 0);
export const levelHpBonus    = (L) => LEVEL_HP_PER_EVEN   * Math.floor(Math.max(FOE_LEVEL_MIN, L | 0) / 2);
// combat starts at L3: floor((L-1)/2) → L1 0, L2 0, L3 1, L4 1, L5 2 … (owner correction 2026-06-27)
export const levelCombatBonus = (L) => LEVEL_COMBAT_PER_ODD * Math.floor((Math.max(FOE_LEVEL_MIN, L | 0) - 1) / 2);
export const levelAnte       = (L) => LEVEL_ANTE_PER      * Math.max(FOE_LEVEL_MIN, L | 0);
// A leveled foe's max HP = its body's base HP (HP-knob scaled) + the level HP bonus. Summon/boss
// bodies are EXEMPT from leveling (their stats are tuned absolutely — see spawnEnemy), so callers
// that want the live display number should gate on those; this raw helper is for normal foes.
export const foeMaxHpFor = (bodyKey, level = FOE_LEVEL_MIN) => bodyMaxHp(BODIES[bodyKey] ?? {}) + levelHpBonus(level);

// THE ANTE FORMULA (owner 2026-06-12, de-tiered; LEVELS added 2026-06-27) — a foe's ante is now
// ITEMS + LEVEL, where every item carries its own `ante` value and each level adds +2 (levelAnte).
// [FLAG — body base dropped] The pre-level formula was `1 + sum(items)` (a static +1 for the body).
// The owner's level spec is explicit — "total ante = (sum of items' ante) + 2×level" — so the body's
// flat +1 is REPLACED by the level term (a level-1 foe antes 2, where it used to ante 1+items). The
// body's own gold (`bodyAnteOf`) still drives ADOPTION/unlock pricing, untouched.
export const bodyAnteOf = (f) => BODIES[f.bodyKey]?.gold ?? 0;
export const itemsAnteOf = (f) => (f?.gear ?? []).reduce((s, g) => s + (KIT[g]?.ante ?? 0), 0);
export const anteOfFoe = (f) => itemsAnteOf(f) + levelAnte(foeLevel(f));
// What a foe DROPS = its full ante (owner 2026-06-11) — the same ⚖ number the palette
// shows, body weight included. It used to be its gear's value alone, which understated
// every foe's worth by its body weight on the "drops in loot" line.
export const foeLootValue = (f) => anteOfFoe(f);
export const anteCurrent = (room) => (room.draftedFoes ?? []).reduce((s, f) => s + anteOfFoe(f), 0);

// 1:1 SPLIT-INCOME economy (owner 2026-06-10): the foes PAY THEIR ANTE. A cleared room's
// value V = exactly the total ante that was stocked into it (bodies 1/3/5 + items 1/2/4 —
// the same big gold numbers from the stock screen, no separate bookkeeping). V is SPLIT
// across the party as fairly as possible (equal shares; remainder coins to the lowest
// TOTAL EARNINGS first — not the lightest wallet). Treasure then buys the rewards on offer — this room's loot, the shop, body
// tiers, kit slots — the same sinks as ever ("and future rewards, like the current system").
export const bodyValue = (f) => bodyAnteOf(f);                  // a body pays its ante weight
// V = the stocked ante (sum of every foe's items + 2×level). Room EFFECTS were removed
// (owner 2026-06-28: "remove all room effects") so there is no longer a room base-ante term.
export function roomValue(room) {
  return (room.draftedFoes ?? []).reduce((s, f) => s + anteOfFoe(f), 0);
}


// SHOP nodes — a VALUE-FOR-VALUE swap (owner 2026-06-24): gold is gone, so a ware is bought by
// trading in owned cards whose summed VALUE (itemTreasure) covers the ware's value. The shelf is a
// few offered card keys, each carrying its own value. Determinism-friendly: tests set room.shop.wares.
export const SHOP_WARES = 5;        // cards on the shelf at once
export const shopPrice = (key) => itemTreasure(key);   // a ware's value (what your pay-cards must cover)
// Roll a fresh shelf: SHOP_WARES distinct CARDS from the player pool, drawn uniformly. A ware is a
// `{key, value}` record (value = itemTreasure). Determinism-friendly: tests can set room.shop.wares directly.
export function rollShopWares() {
  return [...PLAYER_POOL].sort(() => Math.random() - 0.5).slice(0, SHOP_WARES)
    .map((key) => ({ key, value: shopPrice(key) }));
}

// ROOM EFFECTS REMOVED (owner 2026-06-28: "remove all room effects — they no longer contribute
// to the gameplay beyond an artifact"). The whole enchant layer — Wandering Monster, Acid Rain,
// Armory, Hasted, Toughened, Rat Colony, the King's Gift, per-room base-ante, the global room-timer
// bars — is gone. Rooms are now ONLY a random foe selection to the ante (floor × party). The map no
// longer pre-rolls a modifier, foes carry no enchant mults, and there are no room-wide clocks.

// Foe DRAFT POOL: a random foe body + a random (threatening) item — plug and play. Both
// the body and the item add to the foe's ante, so each floor's offers feel different.
// Summons (rats) are never offered; they only enter via summon effects. Heal is excluded
// (a baseline foe healing itself is a stall, not a threat); Wind is excluded because the
// shove has no foe-side meaning yet (foes don't move players) — it'd silently degrade to a
// weak deal. Shields are fine as a SECOND item (the first slot guarantees a threat).
export const PALETTE_SLOTS = 3; // how many foe choices you see at once
// The greedy pool spans ALL rarities (spec §1: uncommon/rare live in the foe pool —
// felling one reaches its tier). Summon tokens and bosses never appear.
// owner 2026-06-22: foes now wear the NEW archetype roster too (the old bodies are retired from
// the game — kept defined only as test scaffolding). One roster for players and foes.
const FOE_BODIES = [...COMMON_SET, ...ELITE_SET];   // foes = commons + ELITES (incl. Atlas); elites carry 2 base ante (owner 2026-06-28)
// Item rarity drives the loot loop:
//  • COMMON — basic standardized attacks (low ante → low Treasure). Baseline rank-and-file
//    carry these; you'll mostly SKIP them and let them convert to Treasure on the way out.
//  • SPICY — the worth-claiming items. Greedy picks carry these.
// FOE GEAR = THE PLAYER CARD UNIVERSE (owner 2026-06-24): foes draw from the EXACT same pool as
// players — full symmetry, no foe-only subset. PLAYER_POOL is the one shared card universe (o* + d*).
// A foe's threat is still shaped by the slot logic: the FIRST/guaranteed slot is gated to a card
// this body can actually deal damage with (itemThreatens) so there's never a toothless opener; later
// slots draw the whole pool (utility/defensive cards included, exactly as a player's deck mixes them).
// Item COUNT (rollFoeGear's tail) stays the difficulty lever — not a curated foe rarity tier.
const COMMON_ITEMS = [...PLAYER_POOL];      // cheap-guarantee + fallback pool = the player pool
const SPICY_ITEMS = [...PLAYER_POOL];       // first ("worth-claiming") slot = the player pool
const FOE_SPICY_ITEMS = SPICY_ITEMS.filter((k) => !KIT[k].fragile);
const FOE_SECOND_ITEMS = [...PLAYER_POOL];  // second-slot grab-bag = the player pool
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
// ===========================================================================
// ARCHETYPE-AWARE KITS (owner spec 2026-06-27) — every foe has at least FOE_MIN_CARDS cards, and
// every kit item must FIT the body's archetype: a caster/ranged body (e.g. Lizard Wizard) takes
// magical/ranged cards and melee-only buffs are kept off it; a melee body takes melee/physical
// cards and ranged-only buffs are kept off it. Pure utility (shields/heals/summons/taunt/worn) fits
// ANY body. A FLEX body (no innate melee/ranged identity) accepts both.
// [FLAG — archetype map] The school-free archetype bodies carry NO phys/mag/affinity field, so I
// DERIVED each body's melee/ranged/flex identity from its own passive's damage flavor (the owner's
// own grouping: SUMMONERS/CASTERS → ranged, melee-passive bruisers → melee, the rest → flex). This
// is the one table to hand-correct if any body is mis-cast. melee={Wageslave,Vampire,Minotaur};
// ranged={Fat Cat,Royal Rat,Paid Piper,Lizard Wizard,Crypto-Chimera}; everything else flex.
export const FOE_ARCHETYPE = {
  frugal: "ranged", leverage: "ranged", hedge: "ranged", ratBaron: "ranged", quakeCap: "ranged",
  mutualMend: "melee", rentier: "melee", bloodfund: "melee",
  compound: "flex", discountDuel: "flex", heavyHand: "flex", pyramidRogue: "flex",
  ratTrader: "flex", counterparty: "flex", juggernaut: "flex",
  atlas: "flex",   // the elite: school-free flat-10 reflect → any fitting kit
  // NEW (owner 2026-06-27, batch B):
  medusa: "ranged", bonelord: "ranged", fundjin: "flex", killionaire: "flex", basilisk: "flex",
  auditAngel: "flex", depressionDemon: "flex", debtDragon: "flex", neptune: "flex",
};
// A body's archetype, falling back to its explicit affinity (player bodies) then "flex".
export const foeArchetype = (bodyKey) => FOE_ARCHETYPE[bodyKey]
  ?? (BODIES[bodyKey]?.affinity === "physical" ? "melee" : BODIES[bodyKey]?.affinity === "magical" ? "ranged" : "flex");
// An item's COMBAT FLAVOR for archetype-fit: "melee" / "ranged" / "util". Driven by cardKind for
// damaging cards, plus the melee/ranged BUFF ops (Sharpened Edges / Wizard Hat / Demon Form / Sage
// Mode / Berserker) so a ranged foe never grabs a melee-only buff and vice-versa. Everything else
// (shields, heals, summons, generic +damage, worn passives) is pure utility → fits any body.
export function itemFlavor(key) {
  const it = KIT[key]; if (!it) return "util";
  const ops = it.ops ?? [];
  if (ops.some((o) => o.do === "meleeBonus"  || (o.do === "regen" && (o.kind === "meleeBonus"  || o.kind === "berserk")))) return "melee";
  if (ops.some((o) => o.do === "rangedBonus" || (o.do === "regen" &&  o.kind === "rangedBonus"))) return "ranged";
  const k = cardKind(key);
  return (k === "melee" || k === "ranged") ? k : "util";
}
// Does this item FIT the body's archetype? Utility fits any; a flex body accepts both; otherwise the
// item's melee/ranged flavor must match the body's.
export function itemFitsArchetype(bodyKey, key) {
  const fl = itemFlavor(key);
  if (fl === "util") return true;
  const arch = foeArchetype(bodyKey);
  return arch === "flex" || fl === arch;
}
// Which stat a foe's level "+1 combat" lands on: the kind its damaging gear is BUILT from ("the foe
// picks the stat matching its damaging items"). Majority melee vs ranged wins; ties fall back to the
// body archetype, then melee.
export function foeCombatStat(bodyKey, gearKeys = []) {
  let melee = 0, ranged = 0;
  for (const k of gearKeys) {
    if (!(KIT[k]?.ops ?? []).some((o) => o.do === "deal")) continue;
    const kind = cardKind(k);
    if (kind === "melee") melee++; else if (kind === "ranged") ranged++;
  }
  if (melee > ranged) return "melee";
  if (ranged > melee) return "ranged";
  return foeArchetype(bodyKey) === "ranged" ? "ranged" : "melee";
}

// Can this body actually HURT someone with this item? A deal op with base amount 0 rides
// entirely on the matching school's Power — a 0-sword summoner wielding a Scary Knife is a
// DUD that pays out like a threat (owner exploit 2026-06-10: a room full of duds = free
// money). Every gear roll filters on this; no foe ever spawns unable to deal damage.
export function itemThreatens(bodyKey, itemKey) {
  const it = KIT[itemKey];
  if (!it?.ops) return false;
  const b = BODIES[bodyKey] ?? {};
  const pow = it.type === "physical" ? (b.phys ?? 0)
            : it.type === "magical" ? (b.mag ?? 0) + (b.swordFeedsStaff ? (b.phys ?? 0) : 0)
            : 0;
  return it.ops.some((o) => o.do === "deal" && (o.amount ?? 0) + pow > 0);
}
// Roll a foe's gear: ONE guaranteed item this BODY can deal damage with, then a TAILED number of
// extra distinct items. ITEM COUNT is the difficulty lever (owner 2026-06-19: "items decide
// difficulty… foes should have upwards of 5-6 sometimes"). The count varies so the board mixes lone
// attackers with the occasional LOADED 4-6-item monster — a pricey draft you choose to take on:
//   • most foes roll LIGHT — 1..(floor+1) items (the floor raises the baseline);
//   • a minority (≈12% on f1 → 24% on f3) are MONSTERS — 4-6 items, regardless of floor.
// `floor` is the heaviness knob (buildFoePool/wanderer pass the real floor; the King's decree court
// passes a big number for a heavy court; the cheap-slot guarantee passes 0 = exactly one item).
// Extra DAMAGE items stay school-checked (no knife-waving casters); utility/shields/worn/tokens fit
// any body. Hard-capped at FOE_MAX_GEAR so even a monster stays a readable wall of bars.
export const FOE_MAX_GEAR = 6;
export const FOE_MIN_CARDS = 3;   // owner spec 2026-06-27: every foe has AT LEAST 3 cards
// Build a body's kit of exactly `count` ARCHETYPE-FIT cards (clamped to [FOE_MIN_CARDS, FOE_MAX_GEAR]):
// slot 1 is a fitting card this body can actually deal damage with (never toothless), the rest draw
// the body's full fitting pool (damaging + utility), distinct where possible, dups only once it's dry.
export function rollFoeKit(bodyKey, count = FOE_MIN_CARDS) {
  count = Math.max(FOE_MIN_CARDS, Math.min(FOE_MAX_GEAR, count | 0 || FOE_MIN_CARDS));
  // fitting cards: utility fits any body, and a DAMAGE card must both fit the archetype AND actually
  // threaten this body (no dud-damage cards like a base-0 Pile On on a 0/0 chassis — owner exploit rule).
  const fit = PLAYER_POOL.filter((k) => itemFitsArchetype(bodyKey, k)
    && (!(KIT[k].ops ?? []).some((o) => o.do === "deal") || itemThreatens(bodyKey, k)));
  const dmg = fit.filter((k) => (KIT[k].ops ?? []).some((o) => o.do === "deal"));
  const gear = [dmg.length ? rnd(dmg) : (fit.length ? rnd(fit) : "oSword")];  // slot 1: fitting + damaging
  while (gear.length < count) {
    const fresh = fit.filter((k) => !gear.includes(k));     // prefer distinct bars
    if (!fresh.length) break;                               // fitting pool dry → stop, the min pad covers it
    gear.push(rnd(fresh));
  }
  while (gear.length < FOE_MIN_CARDS) gear.push(rnd(fit.length ? fit : ["oSword"]));  // never below the floor (allow dups)
  return gear;
}
// Roll a foe's gear: an ARCHETYPE-FIT kit sized off the floor. ITEM COUNT is still a difficulty lever
// (most foes light, a minority loaded), now with a hard FLOOR of FOE_MIN_CARDS (3). `primary` is kept
// for signature compatibility — the pool is derived from the body's archetype, not the arg.
export function rollFoeGear(bodyKey, primary, floor = 1) {
  let count = FOE_MIN_CARDS;
  if (floor > 0) {
    const monster = Math.random() < (0.12 + 0.06 * (floor - 1));    // loaded-foe odds climb with depth
    count = monster ? 4 + Math.floor(Math.random() * 3)             // 4..6 cards: a monster
                    : FOE_MIN_CARDS + Math.floor(Math.random() * 2); // 3..4 cards: the norm
  }
  return rollFoeKit(bodyKey, count);
}
// the stocking palette — armed; per-foe gear count follows rollFoeGear's tail (light, w/ monsters)
export function buildFoePool(floor = 1) {
  return [...FOE_BODIES].sort(() => Math.random() - 0.5).map((b) => ({ bodyKey: b, gear: rollFoeGear(b, FOE_SPICY_ITEMS, floor) }));
}
// ===========================================================================
// NO ANTE FLOOR + ROOM GENERATION (owner spec 2026-06-27) — the floor-raising ratchet (anteMin /
// upTheAnte / the "pad to a minimum" gate) is RETIRED. A room is GENERATED to fill its ante BUDGET
// (anteCap) with a mix of foe LEVELS + fitting items, with NO MINIMUM: sometimes the budget is met
// by one small low-level foe (a "mini opponent"), sometimes a full-ante room. That variance is the
// point. ANTE_MIN/ANTE_CAP_BASE/ANTE_STEP survive only as back-compat constants (snapshot fields,
// old imports); they no longer drive a floor.
export const ANTE_MIN = 0, ANTE_CAP_BASE = 5, ANTE_STEP = 0;
// THE ROOM ANTE SCHEMA = floor × party (owner 2026-06-27: "the room ante schema is: floor x party").
// [FLAG — supersedes the AskUserQuestion "build-power ante" pick] The owner's written spec is floor ×
// party, which is exactly this existing formula, so the budget stays here. ROOM_ANTE_BUDGET_PER is the
// per-unit scale (solo·floor1 = 5 ≈ one minimal foe; 4P·floor3 = 60 a packed room) — flip it to "build-
// power ante" only if the owner confirms he wants rooms to track the party's loadout instead of floor×party.
// An ELITE room is a DOUBLE-ANTE room (×2): no special centerpiece body — the bigger budget naturally
// rolls a "better selection of bodies and items", and THAT is the inbuilt reward (owner 2026-06-27).
export const ROOM_ANTE_BUDGET_PER = 5;
export const roomAnteBudget = (room, type = currentNode(room)?.type) =>
  ROOM_ANTE_BUDGET_PER * bossBudget(room.players?.size ?? 1, room.floor ?? 1) * (type === "elite" ? 2 : 1);
// Rooms FILL to the ante (owner 2026-06-27: "a random selection of foes to EQUAL that ante"). The old
// "mini opponent" early-stop variance is retired — set > 0 to bring it back.
export const ROOM_FILL_STOP_CHANCE = 0;     // per-foe early-stop chance (0 = always fill to the ante)
export const FOE_LEVEL_CAP = 8;             // sanity ceiling on a single GENERATED foe's level (tunable)
export const PALETTE_OPTION_CAP = 11;       // a single optional greedy-add option's max ante (tunable)
// The cheapest a single generated foe can cost: FOE_MIN_CARDS value-1 cards + a level-1 foe's ante.
export const minFoeAnte = () => FOE_MIN_CARDS + levelAnte(FOE_LEVEL_MIN);
// [FLAG — level distribution] Roll ONE leveled, archetype-fit foe whose total ante ≤ maxAnte. Levels
// cost LEVEL_ANTE_PER each; I reserve FOE_MIN_CARDS ante for the guaranteed 3-card kit floor, pick a
// level within what's left, then spend the rest on extra cards. Every live card is ante 1, so card
// COUNT == card ante — the bound ante = count + 2×level ≤ maxAnte holds. The level is capped THREE ways
// and BIASED toward low: (a) the budget can afford it, (b) FOE_LEVEL_CAP sanity, (c) LEVEL_FLOOR_BASE +
// floor — early floors stay low-level so room 1 can't open on a level-8 mini-boss. `level = 1 +
// min(two draws)` is triangular toward 1, so high-level foes are the rare top of a wide RANGE, not the
// norm. This whole distribution is MY call (the owner left it open) — tune these to reshape the curve.
export const LEVEL_FLOOR_BASE = 2;   // a foe's level cap = LEVEL_FLOOR_BASE + floor (then clamped) (tunable)
export function rollLeveledFoe(bodyKey, maxAnte = minFoeAnte(), floor = 1) {
  maxAnte = Math.max(minFoeAnte(), (maxAnte | 0) || minFoeAnte());
  const budgetCap = Math.floor((maxAnte - FOE_MIN_CARDS) / LEVEL_ANTE_PER);   // levels the budget can afford
  const floorCap  = LEVEL_FLOOR_BASE + Math.max(1, floor | 0);                // early floors stay low-level
  const lvCap = Math.max(1, Math.min(FOE_LEVEL_CAP, budgetCap, floorCap));
  const ri = () => Math.floor(Math.random() * lvCap);
  const level = 1 + Math.min(ri(), ri());                              // triangular → biased toward LOW levels
  const cardBudget = maxAnte - levelAnte(level);                       // ≥ FOE_MIN_CARDS by construction
  const maxCards = Math.max(FOE_MIN_CARDS, Math.min(FOE_MAX_GEAR, cardBudget));
  const count = FOE_MIN_CARDS + Math.floor(Math.random() * (maxCards - FOE_MIN_CARDS + 1));
  return { bodyKey, gear: rollFoeKit(bodyKey, count), level, greedy: false, owner: null };
}
// Generate a room's foes to FILL the budget with no minimum. Adds leveled fitting foes one at a time
// (each ≤ the remaining budget) until the budget can't fit another foe, STOCK_MAX is hit, or a random
// early stop fires (the mini-opponent variance). A combat room always has at least ONE foe.
export function generateRoomFoes(room, budget = room.anteCap ?? roomAnteBudget(room), floor = room?.floor ?? 1) {
  const foes = [];
  let remaining = budget;
  while (remaining >= minFoeAnte() && foes.length < STOCK_MAX) {
    const f = rollLeveledFoe(rnd(FOE_BODIES), remaining, floor);
    const a = anteOfFoe(f);
    if (a <= 0 || a > remaining) break;                               // safety (the bound guarantees a ≤ remaining)
    foes.push(f); remaining -= a;
    if (Math.random() < ROOM_FILL_STOP_CHANCE) break;                 // variance: stop short → a mini-opponent room
  }
  if (!foes.length) foes.push(rollLeveledFoe(rnd(FOE_BODIES), Math.max(minFoeAnte(), budget), floor));
  return foes;
}

// ELITES = DOUBLE-ANTE ROOMS (owner spec 2026-06-27: "have elites just be included in rooms"). An elite
// is no longer a bespoke centerpiece body — it's a normal room generated to DOUBLE the ante (roomAnteBudget
// ×2). The bigger budget naturally rolls higher-level, better-geared foes; felling/looting those richer
// bodies + items IS the reward ("the reward being inbuilt to the better selection of bodies and items").
// `generateEliteFoes` is just `generateRoomFoes` at the doubled budget, kept as a named helper for tests
// and any caller that wants an elite room's foes directly.
export function generateEliteFoes(room, floor = room?.floor ?? 1) {
  return generateRoomFoes(room, roomAnteBudget(room, "elite"), floor);
}
// DORMANT — the old named-elite (Atlas) machinery, retired from the live flow (owner 2026-06-27). Kept as
// an opt-in hook: if the owner later wants a SPECIFIC marquee elite body in a room, `rollEliteFoe()` mints
// one as a high-LEVEL loaded foe whose total ante ≈ ELITE_BODY_VALUE. Nothing calls it now.
export const ELITE_BODY = "atlas";       // [dormant] a candidate marquee-elite body
export const ELITE_BODY_VALUE = 15;      // [dormant] its target ante if reinstated as a centerpiece
export function rollEliteFoe(bodyKey = ELITE_BODY, value = ELITE_BODY_VALUE, floor = 1) {
  value = Math.max(minFoeAnte(), value | 0);
  const level = Math.max(1, Math.min(FOE_LEVEL_CAP, Math.round((value - FOE_MIN_CARDS) / LEVEL_ANTE_PER)));
  const cards = Math.max(FOE_MIN_CARDS, Math.min(FOE_MAX_GEAR, value - levelAnte(level)));
  return { bodyKey, gear: rollFoeKit(bodyKey, cards), level, greedy: false, owner: null, elite: true };
}

// Optional GREEDY-ADD palette (pure upside — invite extra foes for loot; no floor to meet). Each
// option is a fresh LEVELED, archetype-fit foe. `rollCheapOption`/`ensureCheapSlot`/`fitsAnteWindow`
// survive as no-op/cap-only shims so the old palette plumbing + tests keep working without a floor.
export function rollCheapOption() { return rollLeveledFoe(rnd(FOE_BODIES), minFoeAnte()); }
export function ensureCheapSlot(room) {}                              // no floor → no cheap-slot guarantee
export const fitsAnteWindow = (room, o) => anteOfFoe(o) <= (room.anteCap ?? PALETTE_OPTION_CAP);
export function nextPaletteOption(room, avoid = null) {
  const skip = avoid instanceof Set ? avoid : (avoid?.length ? new Set(avoid) : null);
  let body = rnd(FOE_BODIES);
  for (let t = 0; t < 8 && skip && skip.has(body); t++) body = rnd(FOE_BODIES);   // prefer a body not already shown
  return rollLeveledFoe(body, PALETTE_OPTION_CAP, room.floor ?? 1);
}
// The floor-raising ratchet is RETIRED (no floor). Kept as an inert no-op so the server's upAnte
// route, the client button, and existing imports don't break.
export function upTheAnte(room) { return false; }

// THE STOCKING GATE (owner spec 2026-06-27, NO FLOOR): the room arrives PRE-GENERATED to its budget,
// so there is no minimum ante to meet — the party may begin immediately, or optionally invite extra
// greedy foes for more loot first. `stockAnteRequired` returns 0 (no gate); `stockReady` is always
// true. `picksRequiredFor` survives only as the DOUBLE-FEATURE (elite) label.
export const picksRequiredFor = (type) => (type === "elite" ? 2 : 1);
export const stockAnteRequired = (room, type = currentNode(room)?.type) => 0;
export const playerPicks = (room, playerId) =>
  (room.draftedFoes ?? []).filter((f) => f.owner === playerId).length;   // display only
export const stockReady = (room) => true;

// ---------------------------------------------------------------------------
// ELITE COST lives on the BODY, not the fight (owner 2026-06-28: "elites cost money in the body selection
// screen not their fight"). The old elite ROOM-entry spend (eliteLock/payEliteCost/ELITE_COST_SPARES/
// partySpareCards) is RETIRED — elite rooms are FREE to enter (just a transparent double-ante room). The
// cost moved to ADOPTING an elite body in the WEAR/PILOT screen: see adoptCost()/swapBody() below.
// ---------------------------------------------------------------------------

// The boss roster (BOSS_SPEC_V1): Hydra / Litigation Lich / Djinn of Deals / Kleptomaniac
// Kraken rotate over a run's 3 boss floors. King Mimic stays OUT of the rotation — he IS
// the throne floor (owner 2026-06-12, unlocked by the first complete 3-floor run).
export const BOSS_BODIES = ["hydra", "litigationLich", "djinn", "kraken"];
// THE SCALING CONTRACT: encounter budget = partySize (1–4) × floor (1–3), xy ∈ 1..12.
// Per-player pressure scales with floor ONLY — party size scales the total. Every boss
// spends its budget on its own signature dial; thread THIS into every new knob.
export const bossBudget = (players, floor) =>
  Math.max(1, Math.min(4, players | 0 || 1)) * Math.max(1, floor | 0 || 1);
// [PLACEHOLDER] rotation: each run draws 3 DISTINCT bosses of the 4, seeded at run start
// (startDraft) so the map preview and the fight always agree within a run. A fixed
// floor→boss table would make the 4th boss unreachable.
export const drawBossRotation = () => [...BOSS_BODIES].sort(() => Math.random() - 0.5).slice(0, 3);
// THE THRONE (owner 2026-06-12): past floor 3 sits King Mimic — the TRUE final boss,
// outside the 3-of-4 rotation. Beating him completes the run.
export const THRONE_FLOOR = 4;
// Which boss guards a given floor (1-indexed) — run-seeded, deterministic within the run.
// Lazily seeds rooms that never ran startDraft (manually-built test rooms).
export function bossForFloor(room, floor = room?.floor ?? 1) {
  if ((floor | 0) >= THRONE_FLOOR) return "kingMimic";
  room.bossDraw ??= drawBossRotation();
  const n = room.bossDraw.length;
  return room.bossDraw[((floor | 0) - 1 + n * 100) % n];
}

// ---------------------------------------------------------------------------
// Rooms / level
// ---------------------------------------------------------------------------
export function newRoom(code) {
  return {
    code,
    god: (code || "").toUpperCase() === "DEMO", // playtest god mode
    players: new Map(),
    laneCount: LANES,                                 // live lane count (derived from players at enterRoom)
    lanes: Array.from({ length: LANES }, () => []),   // foes
    allies: Array.from({ length: LANES }, () => []),  // friendly summons (player side)
    unlockedBodies: new Set([STARTER_BODY]),
    adoptedBodies: new Set(),                         // bodies PAID for (adopted) this run — free to re-wear

    // No currency wallet (owner 2026-06-23: gold gone). There is no player.treasure / shared
    // purse — bodies are free to wear once felled, and the shop is value-for-value (tender owned
    // cards whose ◈ covers the ware). `lastRoomValue` is the cleared room's ante SUM, display only.
    lastRoomValue: 0,               // the last room's ante sum — display only, NO gold credited
    shop: null,                     // at a shop node: { wares: [{key, cost}] }
    // CARAVAN DELETED (owner 2026-06-27): there is no shared HP pool any more. You stay in the run
    // as long as ANY of your combatants — a player body OR a summon — is alive (see the loss guard).
    boss: null,                     // the BACK-LINE boss entity (spans all lanes); Djinn lives in a lane instead
    bossDraw: null,                 // this run's 3-of-4 boss rotation (seeded at startDraft)
    itemUses: 0,                    // party-wide item-use counter (Djinn's every-3rd trigger)
    phase: "lobby",                 // lobby | draft | stock | setup | playing | won | lost | shop
    level: null,
    levelComplete: false,
    runWon: false,                  // the King fell on the throne floor — the run is COMPLETE
    floor: 1,                       // climbs each time you clear a boss (ante scales with it)
    enchant: null,                  // (room effects removed 2026-06-28 — always null; kept for back-compat)
    draftedFoes: [],                // the foes you stocked into this room
    foePool: [],                    // the full draft pool for this room
    foePalette: [],                 // the PALETTE_SLOTS choices currently shown
    foeNext: 0,                     // next pool index to roll into a slot
    anteRequired: 0,                // minimum ante you must stock before you can begin
    anteMin: 2, anteCap: 5,         // "up the ante" ratchet (run-scoped) — BOTH ends only ever climb
    loot: [],                       // gear claimable after winning (= what the foes carried);
                                    // unclaimed drops convert to Treasure on leaving the room
    tick: 0,
    handle: null,
  };
}

// A PROCEDURAL Slay-the-Spire-style graph (owner ask 2026-06-10: real path choices, not
// one static fork). Top (y≈0) start, bottom (y≈1) boss. Rows: 1 start → two branching
// rows → an ALL-SHOP row (every path shops exactly once — the economy loop is
// load-bearing) → a late branching row → boss. Branching rows are 2–3 wide; links go to
// the proportional next-row column plus an occasional neighbor, so paths FORK and MERGE
// but never cross far. Elites are sprinkled (heavier after the shop); ≥1 guaranteed per
// floor. Regenerated fresh by descend(), so every floor's map is different.
let _nodeSeq = 0;
// ELITE GIMMICKS (owner 2026-06-29): an elite room is a normal fight PLUS one of these modifiers, for
// double rewards. THIS IS THE OWNER'S TABLE — rename / retune / extend freely (add a key + handle it where
// noted). Effects: `foeCostCut` is read in foeCast; acidRain / foeScaling are handled in applyGimmickTick.
export const GIMMICKS = {
  acidRain:   { name: "Acid Rain",       blurb: "Acid drips — every body in the room takes 1 every ~3s." },
  cheapFoes:  { name: "Cut-Rate Foes",   blurb: "Every foe's cards cost ⚡1 less — they cast faster.", foeCostCut: 1 },
  foeScaling: { name: "Runaway Scaling", blurb: "Every foe ramps: +1 damage every ~4s." },
};
const GIMMICK_KEYS = Object.keys(GIMMICKS);
const pickGimmick = () => GIMMICK_KEYS[Math.floor(Math.random() * GIMMICK_KEYS.length)];

export function buildLevel(floor = 1) {
  // The THRONE floor is a single boss room — no crawl, no shop, just the King. The map
  // still renders (one ♛ node) so the advance/preview plumbing needs no special cases.
  if (floor >= THRONE_FLOOR) {
    const n = { id: "n" + _nodeSeq++, type: "boss", cleared: false, x: 0.5, y: 0.5, links: [], row: 0 };
    return { nodes: [n], currentId: n.id };
  }
  // RANDOM 3-PICK CRAWL (owner 2026-06-29, "kill the STS map"): a TRAILHEAD opens the floor, then every
  // step offers EXACTLY 3 fresh rooms whose TYPES are rolled independently — mostly Fights, sometimes a
  // Shop, sometimes an Elite (a gimmick room with double rewards). A floor is FLOOR_ROOMS picks, then the
  // boss. Each node links to ALL of the next row's nodes, so the choice offered is always the full 3.
  const FLOOR_ROOMS = 5;                          // rooms offered before the floor boss
  // per-option type roll: Fight common · Shop occasional · Elite occasional (tunable — owner's to retune).
  const rollType = () => { const r = Math.random(); return r < 0.14 ? "shop" : r < 0.38 ? "elite" : "combat"; };
  const plan = [
    { type: "start", w: 1 },
    ...Array.from({ length: FLOOR_ROOMS }, () => ({ type: "roll", w: 3 })),
    { type: "boss", w: 1 },
  ];
  const nodes = [];
  const rows = plan.map((spec, r) => {
    const y = 0.04 + (r / (plan.length - 1)) * 0.91;
    const row = Array.from({ length: spec.w }, (_, i) => {
      const type = spec.type === "roll" ? rollType() : spec.type;
      const n = { id: "n" + _nodeSeq++, type, cleared: false, x: (i + 1) / (spec.w + 1), y, links: [], row: r };
      nodes.push(n);
      return n;
    });
    return row;
  });
  // every offered row keeps ≥1 plain FIGHT — you're never forced into all-shops / all-elites (owner 2026-06-29).
  for (const row of rows) {
    if (row.length === 3 && !row.some((n) => n.type === "combat")) row[Math.floor(Math.random() * 3)].type = "combat";
  }
  // …and guarantee ≥1 ELITE per floor so every floor offers a gimmick room — flip a fight whose row keeps
  // another fight (so the ≥1-fight rule above still holds).
  if (!nodes.some((n) => n.type === "elite")) {
    const row = rows.find((rw) => rw.filter((n) => n.type === "combat").length >= 2) || rows.find((rw) => rw.some((n) => n.type === "combat"));
    const c = row && row.find((n) => n.type === "combat");
    if (c) c.type = "elite";
  }
  // each ELITE carries a random GIMMICK (the owner's table: acid rain / cut-rate foes / runaway scaling).
  for (const n of nodes) if (n.type === "elite") n.gimmick = pickGimmick();
  // FULL connectivity: every node links to EVERY node in the next row → the pick offered is always the
  // full 3 (the boss row is one node, so the last room's only "next" is the forced boss).
  for (let r = 0; r < rows.length - 1; r++) for (const a of rows[r]) for (const b of rows[r + 1]) a.links.push(b.id);
  return { nodes, currentId: rows[0][0].id };
}

// Pre-generate each combat/elite node's foe roster at MAP BUILD (owner 2026-06-28: rooms must show what's
// inside them). The map preview and the actual fight then MATCH, and a node's contents are STABLE across
// the floor. Boss/shop nodes carry no roster. Call right after buildLevel(), before enterRoom().
export function stockLevelRooms(room) {
  if (!room?.level?.nodes) return;
  for (const n of room.level.nodes) {
    if (n.type === "combat" || n.type === "elite") {
      n.foes = generateRoomFoes(room, roomAnteBudget(room, n.type), room.floor ?? 1);
    }
  }
}

export const nodeById = (room, id) => (room.level ? room.level.nodes.find((n) => n.id === id) : null);
export const currentNode = (room) => (room.level ? nodeById(room, room.level.currentId) : null);

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------
// Per-item cooldown (falls back to the KIT default if the item carries none).
// An item's effective cooldown for a given wielder. A body's TEMPO bends it:
//  • itemCdMul (< 1): "spammer" body — every cooldown shorter.
//  • itemCdCap: "heavy" body — caps the cooldown, taming big spells (Fire/Gavel) most.
export const itemCd = (inv, body) => {
  let cd = inv.cd != null ? inv.cd : KIT[inv.key].cd;
  const school = KIT[inv.key]?.type;
  // School CDR (V2 §4.4): Pixie's swords / Lizard Wizard's staves charge faster.
  if (school === "physical" && body?.swordCdMul) cd *= body.swordCdMul;
  if (school === "magical" && body?.staffCdMul) cd *= body.staffCdMul;
  if (body?.itemCdMul) cd *= body.itemCdMul;
  if (body?.itemCdCap) cd = Math.min(cd, body.itemCdCap);
  return Math.max(1, Math.round(cd));   // global playtest slow-down
};

export function freshKit(god = false) {
  // God mode: every item, tiny cooldown, ready to fire immediately.
  if (god) return KIT_POOL.map((key) => ({ key, charge: GOD_CD, cd: GOD_CD }));
  // The random STARTER kit is pressable actives only — worn passives (Aegis) come from the
  // draft/shop, not the fallback roll (a starter should always have things to press).
  const pool = KIT_POOL.filter((k) => !isPassiveItem(k));
  const out = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const key = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    out.push({ key, charge: 0, cd: KIT[key].cd });
  }
  return out;
}

// Build a live inventory from a player's drafted card keys.
export function kitFromPicks(picks) {
  return picks.filter((k) => KIT[k]).map((key) => ({ key, charge: 0, cd: KIT[key].cd }));
}

// A player's RUN-WIDE level (owner 2026-06-29: REVERSED the earlier per-body decision). There is now ONE
// level per player that applies to WHATEVER body they currently wear and CARRIES OVER on a body swap — a
// freshly worn body is immediately at the player's current level. (Foe leveling is UNCHANGED: foes still
// take their own per-spawn level — see foeLevel/spawnEnemy. This is only about the player's own level
// following them across the bodies they wear.) Summon/boss bodies remain exempt from the grants below.
export const runLevelOf = (player) =>
  Math.max(FOE_LEVEL_MIN, (player?.runLevel ?? FOE_LEVEL_MIN) | 0);
// PLAYER-SIDE LEVELING (owner spec 2026-06-27, 1:1 SYMMETRY; run-wide since 2026-06-29) — a player levels
// on the EXACT foe curve (levelHpBonus/levelCombatBonus), so a level-3 Market-Crash Minotaur is identical
// as a player or a foe. Recomputes from the worn body's BASE each call (idempotent): maxHp = base + the
// level HP bonus, and the level's COMBAT bonus lands on the body's combat stat (melee/ranged, via
// foeCombatStat over the player's DECK — the same "picks the stat matching its damaging items" rule the
// foe uses). The combat base is stashed on levelMelee/levelRanged and (re)applied at beginCombat —
// mirroring how a foe's spawn bakes its level combat into meleeBonus/rangedBonus (foes skip the per-fight
// reset). Summon/boss bodies are EXEMPT (same as the foe exemption in spawnEnemy) — they get no grants and
// player.level reads 1 while worn, but the run-wide runLevel is untouched. `ratio` keeps the wound % through
// a swap, so the player's level instantly re-applies (more HP/combat) to a body they swap into.
export function applyBodyLevel(player, ratio = 1) {
  const b = BODIES[player.bodyKey] || {};
  const leveled = !(b.summon || b.boss);
  const lvl = player.level = leveled ? runLevelOf(player) : FOE_LEVEL_MIN;
  const hpBonus = leveled ? levelHpBonus(lvl) : 0;
  const combatBonus = leveled ? levelCombatBonus(lvl) : 0;
  const stat = combatBonus ? foeCombatStat(player.bodyKey, player.deckList ?? []) : null; // "melee" | "ranged"
  player.levelMelee  = stat === "melee"  ? combatBonus : 0;
  player.levelRanged = stat === "ranged" ? combatBonus : 0;
  player.maxHp = bodyMaxHp(b) + hpBonus;
  player.hp = Math.max(1, Math.round(player.maxHp * Math.min(1, ratio)));
}

export function wearBody(player, bodyKey, keepWoundRatio = false) {
  const b = BODIES[bodyKey];
  const ratio = keepWoundRatio && player.maxHp ? player.hp / player.maxHp : 1;
  player.bodyKey = bodyKey;
  player.phys = b.phys ?? b.atk ?? 0;   // body affinity → Physical Power (sword); matches spawnEnemy
  player.mag = b.mag ?? 0;              // body affinity → Magical Power (staff)
  applyBodyLevel(player, ratio);        // the SAME level curve foes use → +HP/+combat for THIS body's level
  player.echoCharge = 0; player.echoReady = false; player.echoArmed = false; // a new body = a fresh echo bar
}

// ---------------------------------------------------------------------------
// Body purchase — a TIERED unlock, now PER-PLAYER. A body's tier = its `ante`. Player/draft
// bodies have no ante → tier 0 (free, gated only by the pool). Foe tiers are bought from the
// player's OWN wallet: defeating a foe REACHES its tier for the party (makes it purchasable);
// a player then spends to unlock that whole tier for THEMSELVES (every body of that ante).
// ---------------------------------------------------------------------------
// BODY SWAP (owner 2026-06-24): a felled/unlocked body is FREE to wear — the gold buy-in ladder
// is DEAD (no treasure, no unlockGold threshold, no buyUnlock). You wear what you've beaten: a body
// must be in room.unlockedBodies (felled), not a boss/summon, not the starter Rookie, and not worn
// by another player (exclusive). That's the whole gate now.
// ---------------------------------------------------------------------------
export function canSwapTo(room, player, key) {
  const b = BODIES[key];
  if (!b || b.boss || b.summon || key === STARTER_BODY) return false; // bosses, summon tokens, AND the Rookie Mimic are never adoptable
  if ([...room.players.values()].some((q) => q !== player && q.bodyKey === key)) return false; // exclusive
  // "ones I've SEEN only" (owner 2026-06-12): a body must itself have been felled/released into the
  // pool. A felled body is then ADOPTABLE — wearing it the first time costs (see adoptCost).
  return room.unlockedBodies.has(key);
}

// ELITE BODY ADOPTION COST (owner 2026-06-28: "elites are bodies that cost 5 to become after they're
// defeated"). Wearing a felled ELITE body the FIRST time is an ADOPTION: pay a FLAT price in card VALUE (the
// same value-for-value tender the shop/levelUp use), after which it's the party's for the run (free to
// re-wear). COMMON bodies stay FREE to wear. ADOPT_COST is the single knob; the starter is always free.
export const ADOPT_COST = 5;   // FLAG — flat card-VALUE price to ADOPT (become) an ELITE body, once (tunable)
// What it costs to wear `key` right now: 0 for the starter, a common body, or one already adopted this run;
// else (an un-adopted ELITE) ADOPT_COST.
export function adoptCost(room, key) {
  if (!key || key === STARTER_BODY) return 0;
  if (room?.adoptedBodies?.has?.(key)) return 0;          // already adopted this run → free to re-wear
  return BODIES[key]?.elite ? ADOPT_COST : 0;             // only ELITES cost to become; commons are free (owner 2026-06-28)
}
// VALUE-FOR-VALUE TENDER (shared rule, mirrors buyWare/levelUp): pay `cost` by handing in owned `payKeys`
// whose summed itemTreasure covers it; copies spend from SPARES before deck copies; the deck never drops
// below MIN_DECK. Validates fully, then COMMITS the spend. Returns true (cards spent) / false (nothing spent).
export function tenderValue(player, payKeys = [], cost = 0) {
  if (cost <= 0) return true;
  const pay = Array.isArray(payKeys) ? payKeys : [];
  if (!pay.length || !pay.every((k) => KIT[k])) return false;
  const need = {};
  for (const k of pay) need[k] = (need[k] ?? 0) + 1;
  for (const k of Object.keys(need)) if (countKey(player.backpack, k) < need[k]) return false;   // own every copy
  if (pay.reduce((s, k) => s + itemTreasure(k), 0) < cost) return false;                          // value covers it
  let deckPulls = 0;
  for (const k of Object.keys(need)) {
    const spare = Math.max(0, countKey(player.backpack, k) - countKey(player.deckList, k));
    deckPulls += Math.max(0, need[k] - spare);
  }
  if (deckPulls > 0 && (player.deckList?.length ?? 0) - deckPulls < MIN_DECK) return false;
  for (const k of pay) {
    const bi = player.backpack.indexOf(k);
    if (bi >= 0) player.backpack.splice(bi, 1);
    if (countKey(player.backpack, k) < countKey(player.deckList, k)) {
      const di = (player.deckList ?? []).indexOf(k);
      if (di >= 0) player.deckList.splice(di, 1);
    }
  }
  return true;
}

// EXCLUSIVE body swap — a literal trade through the shared pool. A body worn by another player is
// off-limits. Your current body is RELEASED back into the pool and the chosen one becomes you; the swap
// sticks across rooms (homeBody). `targetKey` null = quick-cycle. An un-adopted body must be PAID for the
// first time (pass `payKeys` covering adoptCost). Returns the adopted bodyKey, or null if not allowed.
export function swapBody(room, player, targetKey = null, payKeys = []) {
  if (!player?.alive) return null;
  let target;
  if (targetKey) {
    if (!canSwapTo(room, player, targetKey)) return null;
    target = targetKey;
  } else {
    // quick-cycle steps only among bodies FREE right now (current + already-adopted), so a [Q] cycle never
    // silently needs payment; a priced un-adopted body is adopted explicitly (menu sends `to` + payKeys).
    const avail = Object.keys(BODIES).filter((k) => k === player.bodyKey ||
      (canSwapTo(room, player, k) && adoptCost(room, k) === 0));
    const idx = avail.indexOf(player.bodyKey);
    target = avail[(idx + 1) % avail.length];
  }
  if (!target || target === player.bodyKey) return null;
  // ADOPTION COST: a body not yet adopted this run must be PAID for (flat card-value) the first time worn.
  const cost = adoptCost(room, target);
  if (cost > 0) {
    if (!tenderValue(player, payKeys, cost)) return null;     // can't afford / bad pay-cards → reject the swap
    (room.adoptedBodies ??= new Set()).add(target);          // adopted — free to re-wear for the rest of the run
  }
  room.unlockedBodies.add(player.bodyKey); // my old body goes up into the pool
  wearBody(player, target, true);
  player.homeBody = target;                // "that body is me now" — persists into the next room
  return target;
}

// PLAYER LEVEL-UP (owner spec 2026-06-27) — spend ITEM-VALUES to raise the player's RUN-WIDE level one
// step. The GRANTS are the foe curve (applyBodyLevel → +HP/+combat on the worn body); the COST is a
// player-economy number the owner gave separately: cost to reach level L = LEVEL_UP_COST_PER × (L-1) → 5
// to hit L2, 10 for L3, 15 for L4 … (the step LANDING on L; from level `cur` the next step targets cur+1
// and costs 5×cur).
export const LEVEL_UP_COST_PER = 5;   // item-value multiplier on (L-1) for a level step (tunable)
export const levelUpCost = (targetLevel) => LEVEL_UP_COST_PER * Math.max(0, (targetLevel | 0) - 1);
// Raise the player's RUN-WIDE level (owner 2026-06-29) one step, tendered in the player's CHOSEN owned
// cards (tenderValue — the SAME value-for-value rule the shop's buyWare uses: the picked cards' summed
// itemTreasure must COVER the cost; copies spend from SPARES before deck copies; never drops the deck
// below MIN_DECK). On success the player's level ticks up and re-applies to the body they're wearing right
// now (applyBodyLevel, keeping the wound %), and follows them onto every body they later wear. Out-of-
// combat only (a prep action). Returns bool. `payKeys` = the spare cards the PLAYER chose to feed (the
// client's pay-picker mirrors the shop's tender flow).
// [FLAG — cost reading] "cost-to-reach-level-L = 5×(L-1)" read as the SINGLE step that lands on L (5/10/15…),
// matching all three of the owner's examples literally.
export function levelUp(room, player, payKeys = []) {
  if (!player?.alive || !room) return false;
  if (room.phase === "playing") return false;                 // not mid-fight (stock/shop/setup only)
  const b = BODIES[player.bodyKey] || {};
  if (b.summon || b.boss) return false;                       // only normal bodies level (foe-symmetric exemption)
  const target = runLevelOf(player) + 1;                      // ONE run-wide level per player (not per-body)
  if (target > FOE_LEVEL_CAP) return false;                   // share the foe sanity ceiling
  if (!tenderValue(player, payKeys, levelUpCost(target))) return false;  // pay the chosen spares (validates + commits)
  player.runLevel = target;                                   // the run-wide level ticks up — it follows every body worn
  applyBodyLevel(player, player.maxHp ? player.hp / player.maxHp : 1);
  return true;
}

// OUT of a run (lobby/draft — no level yet), the board preview tracks the party size live:
// lanes = players, resized on every join/leave. Once a run starts, the lane count is LOCKED
// at enterRoom per room (a joiner/leaver mid-run doesn't reshape a live board). Without this
// the lobby/draft board showed the stale newRoom default (3 lanes) regardless of party size.
export function syncLobbyLanes(room) {
  if (room.level) return;
  room.laneCount = deriveLaneCount(room, "combat");
  room.lanes = Array.from({ length: room.laneCount }, () => []);
  room.allies = Array.from({ length: room.laneCount }, () => []);
}

// Networking-free: caller (server) attaches `.ws` afterward.
// opts.bot — a squad body the host owns but isn't personally piloting: it auto-drafts a
// bundle and fights on AUTO (fires its kit on cooldown, exactly like a foe). The human
// "remotes into" one body at a time; the rest run as bots. opts.owner — the connection/seat
// that owns this slot (so one human can hold several player entities at once).
export function addPlayer(room, id, name, opts = {}) {
  const player = {
    // lane is clamped to the LIVE lane count: a late joiner lands in a real lane (a solo
    // run has only lane 0 — an unclamped default of 1 crashed every subsequent tick).
    id, name: name || "Adventurer", side: "hero", lane: Math.min(1, (room.laneCount ?? LANES) - 1), depth: 0, counters: 0, meleeBonus: 0, rangedBonus: 0, shield: 0, targetId: null, allyTargetId: null,
    bodyKey: STARTER_BODY, homeBody: STARTER_BODY, classKey: null,
    // RUN-WIDE LEVELING (owner 2026-06-29, reversed from per-body): `runLevel` is the ONE level the player
    // carries across every body they wear; `level` is the level APPLIED to the worn body (kept in sync by
    // applyBodyLevel — equals runLevel except on exempt summon/boss bodies). levelMelee/levelRanged = the
    // level's combat base, re-applied each fight (beginCombat) like a foe's spawn-baked bonus. Default 1 = base.
    level: FOE_LEVEL_MIN, runLevel: FOE_LEVEL_MIN, levelMelee: 0, levelRanged: 0,
    hp: 0, maxHp: 0, alive: true, downTimer: 0,
    lockedBundle: null, drafted: false, // draft-wheel lock state
    bot: !!opts.bot,                // a squad body on autopilot (auto-drafts, fights on AUTO)
    // CARD/MOXIE era (owner 2026-06-21): the body you PILOT defaults to MANUAL — playing your own
    // cards IS the game now (the old "AUTO, tired of clicking" default was for the cooldown era).
    // Un-piloted squad bots still auto-fight (you can't hand-drive four at once). Toggle flips it.
    autoFire: !!opts.bot,
    manualPref: !opts.bot,
    owner: opts.owner ?? id,        // the seat/connection that controls this entity (self by default)
    // BACKPACK + DECK (owner 2026-06-24): `backpack` = ALL owned card keys (the full repo); `deckList`
    // = the chosen COMBAT deck (a sub-multiset of backpack, length ≥ MIN_DECK). Combat draws ONLY from
    // the deck (mintCards(deckList)); the backpack is never drawn from in combat. Both start empty here
    // and are seeded from the starter set on draft/enterRoom.
    inv: freshKit(room.god), backpack: [], deckList: [], ws: null,
    // CARD/MOXIE state (CARDS_SPEC §3): `cards` = playable collection; deck/hand are the live
    // draw pile + face-up hand, (re)dealt at beginCombat. `inv` is kept for worn-passive stat reads.
    moxie: START_MOXIE, moxieClock: 0, cards: [], deck: [], hand: [],
  };
  wearBody(player, STARTER_BODY);
  if (room.god) { player.maxHp = 999; player.hp = 999; }
  room.players.set(id, player);
  syncLobbyLanes(room);   // lobby/draft board preview matches the party size (no-op mid-run)
  return player;
}

// ---------------------------------------------------------------------------
// Enemies / rooms
// ---------------------------------------------------------------------------
// A foe is just a Combatant with side:"foe". `loadout` arms it with items
// (item keys or {key,cd}) that fire through the same resolver players use.
let _foeSeq = 1;
export function spawnEnemy(bodyKey, loadout = [], level = FOE_LEVEL_MIN) {
  const b = BODIES[bodyKey] || {}; // tolerate unknown keys (e.g. a boss's deleted court — next slice)
  // FOE LEVELS (owner spec 2026-06-27): normal foes take the level grants — +levelHpBonus to maxHp and
  // +levelCombatBonus to the stat their KIT deals with (melee→meleeBonus, ranged→rangedBonus, via
  // foeCombatStat). SUMMON tokens + BOSSES are EXEMPT (their stats are tuned absolutely, like the
  // HP-knob exemption) so a rat stays 1 HP and a boss keeps its budget no matter the passed level.
  const leveled = !(b.summon || b.boss);
  const lvl = leveled ? Math.max(FOE_LEVEL_MIN, (level | 0) || FOE_LEVEL_MIN) : FOE_LEVEL_MIN;
  const gearKeys = loadout.map((l) => (typeof l === "string" ? l : l.key));
  const hpBonus = leveled ? levelHpBonus(lvl) : 0;
  const combatBonus = leveled ? levelCombatBonus(lvl) : 0;
  const stat = combatBonus ? foeCombatStat(bodyKey, gearKeys) : null;   // "melee" | "ranged" — the kit's flavor
  const foe = {
    id: "f" + _foeSeq++, // stable id so the client can target a specific foe
    bodyKey, level: lvl, hp: bodyMaxHp(b) + hpBonus, maxHp: bodyMaxHp(b) + hpBonus,
    phys: b.phys ?? b.atk ?? 0, mag: b.mag ?? 0, charge: 0, side: "foe", lane: 0, counters: 0,
    meleeBonus: stat === "melee" ? combatBonus : 0, rangedBonus: stat === "ranged" ? combatBonus : 0, shield: 0,
    // equipment is kept ONLY for worn-passive stat reads (itemStatBonus/itemDmgReduce). Active gear
    // no longer fires on a cooldown — it joins the moxie-cast QUEUE below (CARDS_SPEC §3).
    equipment: loadout.map((l) => {
      const key = typeof l === "string" ? l : l.key;
      return { key, charge: 0, cd: KIT[key]?.cd ?? 40 };
    }),
  };
  // its cast queue = the drafted/stocked gear keys, built via rollKit (WYSIWYG — owner 2026-06-23;
  // the old innate FOE_DECKS deck stacked on top is retired, so the queue == what the draft showed).
  buildQueue(foe, gearKeys);
  applyCombatStart(foe);   // open-of-fight grants (Malevolent Mouse +1 / Golden Golem +2 shield / Centaur double)
  return foe;
}

// The lane a greedy add's owner holds (clamped to the live lane count).
export function ownerLaneOf(room, ownerId) {
  const p = room.players?.get(ownerId);
  return Math.max(0, Math.min((room.laneCount ?? LANES) - 1, p?.ownedLane ?? 0));
}
// The lane each drafted foe will occupy. COLLECTIVE DRAFT (owner 2026-06-19): foes are no longer
// pinned to the drafter's lane — the party drafts ONE shared pool, then the foes "sort themselves
// out" across the lanes tankiest-first (dealt round-robin in HP order, so each lane gets a wall
// before any lane gets a second — no single lane drowns). formUp then fronts each lane's tankiest.
// Pinned foes (the Wandering Monster) keep their lane. Deterministic (stable HP+index sort) so
// buildRoom's placement and the snapshot preview always agree.
export function placedLanes(room) {
  const laneN = room.laneCount ?? LANES;
  const foes = room.draftedFoes ?? [];
  const out = new Array(foes.length);
  const free = [];
  foes.forEach((f, i) => {
    if (f.lane != null) out[i] = Math.max(0, Math.min(f.lane, laneN - 1)); // pinned (Wandering Monster)
    else free.push(i);
  });
  const hp = (i) => foeMaxHpFor(foes[i].bodyKey, foeLevel(foes[i]));   // leveled HP → tankiest-first
  free.sort((a, b) => hp(b) - hp(a) || (a - b));   // tankiest first, stable index tiebreak
  free.forEach((idx, k) => { out[idx] = k % laneN; });
  return out;
}

// Lay out the room's foes. If the player stocked a composition (the foe-draft), use
// it verbatim; otherwise auto-fill (god mode, bosses, or a skipped draft).
export function buildRoom(room) {
  room.lanes = Array.from({ length: room.laneCount }, () => []);
  const type = currentNode(room)?.type ?? "combat";
  if (type === "boss") {
    // A boss node spawns the ONE designed boss for this floor — back-line (room.boss) or
    // lane-bound (Djinn). No generic auto-fill, no enchant: the boss's clocks ARE the room.
    spawnBoss(room);
    return;
  }
  if (room.draftedFoes?.length) {
    // Place each foe per placedLanes(): baseline round-robins; a greedy add goes to its owner's
    // lane (the player who invited it fights it). buildRoom + the snapshot share this layout.
    const ln = placedLanes(room);
    room.draftedFoes.forEach((f, i) => room.lanes[ln[i]].push(spawnEnemy(f.bodyKey, f.gear ?? [], foeLevel(f))));
  } else {
    let size, pool;
    if (type === "elite") { size = ROOM_SIZE + 3; pool = ["juggernaut", "counterparty", "bloodfund", "heavyHand"]; }
    else { size = ROOM_SIZE; pool = ["frugal", "discountDuel", "ratBaron"]; }
    for (let i = 0; i < size; i++) {
      room.lanes[i % room.laneCount].push(spawnEnemy(pool[Math.floor(Math.random() * pool.length)]));
    }
  }
  // every foe item starts at BASE (empty bar) so nothing reads as pre-charged on spawn.
  // (Earlier a random/staggered seed left bars partially filled.)
  for (const lane of room.lanes) for (const f of lane) {
    for (const it of f.equipment ?? []) it.charge = 0;
  }
  formUp(room); // the wall forms: tanky bodies to the front, squishy/ranged hide at the back
}

// FORMATION — within each lane, the toughest body holds the FRONT (the "base", index 0,
// where it eats melee/`front` hits and shields the lane); squishier foes hide BEHIND it.
// Sort by HP (legible: "the big one's up front"); stable id tiebreak. Front foes die first,
// so the backline is naturally exposed as the wall crumbles. Re-callable after summons.
export const tankiness = (f) => (f.maxHp ?? 0);
export function formUp(room) {
  for (const lane of room.lanes) {
    lane.sort((a, b) => tankiness(b) - tankiness(a) || (a.id < b.id ? -1 : 1));
  }
}

// ===========================================================================
// BOSS_SPEC_V1 machinery — spawn, clocks, on-damaged triggers, item-entities.
// ===========================================================================
// First-draft per-boss numbers (ticks at cdMult 1; ALL [PLACEHOLDER] — redial on playtest).
// Boss maxHp base lives on the body; everything else lives here so tests can read it.
// PACE REDIAL (owner 2026-06-12, live from the train playtest): "all their cooldowns are
// too long — 1.5× harder". Every boss clock cd ÷ 1.5 from the 06-11 first draft. Summon
// TOKENS (head bite, bone wizard blast) keep their own clocks — a rat's clock is a rat's
// clock; the BOSS acts 1.5× as often. Still [PLACEHOLDER] dials.
export const BOSS_DEFS = {
  // Hydra rework (owner 2026-06-12): 5 heads pre-placed, waves now start at 1 and DOUBLE
  // (hyper-inflation), low 1/2/3 floor-scaled maul on its own clock. [PLACEHOLDER] cds.
  hydra:          { startHeads: 5, headCd: 130, headStart: 1, inflate: 2, maulCd: 85 },
  // Boss clocks HALVED at the flag-off seam (sim sweep 2026-06-13): party DPS doubled
  // when cds went literal, so fights end ~2× faster — at the old tick counts the Kraken's
  // median fight ENDED before its first steal fired. These restore the boss tempo the
  // owner tuned on 2026-06-12 ("1.5× harder"), in mechanics-per-fight terms.
  litigationLich: { stanceCd: 45, wizardCd: 70 },      // 4.5s stance windows (owner 6/14: harder to KILL — stance is its real lever, faster wizards did nothing in sim); bone wizards every 7s
  djinn:          { teleportCd: 45, aoeCd: 55, aoeDmg: 2, everyNthItem: 3 },
  kraken:         { stealCd: 65, capPerPlayer: 2,      // steal every 6.5s (owner 6/14: eased from 47; 28 was an unkillable stall in sim); tentacle cap = 2 × players (8 at 4P)
                    replenishCd: (floor) => Math.max(30, 60 - 10 * ((floor | 0) - 1)) }, // 6s, −1s/floor
  // KING MIMIC'S DECK (owner 2026-06-12): each card is its OWN bar — the active card
  // charges, fires its big move, then rotates out for the next. Random rotation, every
  // card covered before the deck reshuffles (a shuffle bag — no repeats inside a pass).
  // Effects PERSIST past their card: the court stays, steals stay stolen, the stance
  // holds until the stance card comes back around. steal/stance/aoe reuse the other
  // bosses' clock cases verbatim — the ultimate mimic plays THEIR moves; only decree is his.
  // All cds/dmg/ante are [PLACEHOLDER] dials.
  kingMimic: {
    cards: [
      { kind: "decree",  cd: 65, label: "♛ DECREE — the court assembles", color: "#e6c34a" },
      { kind: "steal",   cd: 50, label: "👑 STEAL — hands off the crown", color: "#d06fb0" },
      { kind: "stance",  cd: 45, label: "🛡 STANCE — the guard shifts",   color: "#9a7fc0" },
      { kind: "aoe",     cd: 60, label: "☄ CALAMITY — every lane",       color: "#ff9ed2", dmg: 3, aoe: true }, // (= PASSIVE_BAR_COLOR; declared later — TDZ)
    ],
    decreeAnte: 7,                 // "powerful, heavily-anted foes" — each rolled to clear this bar
  },
};
// The items the Djinn conjures: normal table, common/uncommon, damaging only (a summoned
// shield that protects nobody is a dud, not a threat). The ≥1 weapon floor makes even the
// amount-0 school items (Scary Knife) land on the entity's 0-Power chassis.
export const DJINN_ITEM_POOL = Object.keys(KIT).filter((k) =>
  (KIT[k].ante ?? 1) <= 2 &&                       // modest values only (was common/uncommon)
  (KIT[k].ops ?? []).some((o) => o.do === "deal"));

// BOSS PAYDAY (owner 2026-06-12, de-golded 2026-06-24): "each boss gives a guaranteed selection of
// rares." Gold is gone — the bounty is now just the rare CARD shelf, claimed FREE into the backpack.
// De-tiered reading of "rares": the EXPENSIVE end of the kit (ante ≥ RARE_ANTE). The shelf is
// players + 2 distinct rolls.
export const RARE_ANTE = 3;
export const RARE_POOL = Object.keys(KIT).filter((k) => (KIT[k].ante ?? 0) >= RARE_ANTE);
export const rollBossLoot = (room) =>
  [...RARE_POOL].sort(() => Math.random() - 0.5).slice(0, Math.max(1, room.players.size || 1) + 2);

// A boss CLOCK: { kind, cd (ticks, cdMult baked in at creation — the landmine), charge,
// label/color/dmg/aoe → its threat bar }. Generic: the back-line boss and the lane-bound
// Djinn both run their mechanics on these.
const bossClock = (kind, cd, bar = {}) =>
  ({ kind, cd: Math.max(1, Math.round(cd)), charge: 0, ...bar });

// Drop a foe-side body straight into a lane (boss summons: heads/wizards/tentacles).
export function spawnFoeInLane(room, bodyKey, lane, gear = []) {
  const li = Math.max(0, Math.min(room.laneCount - 1, lane | 0));
  const f = spawnEnemy(bodyKey, gear);
  f.side = "foe"; f.lane = li;
  room.lanes[li].push(f);
  return f;
}

// An ITEM-ENTITY (Djinn summon / Kraken steal): wraps an item key — HP = the item's gold
// cost (itemTreasure), attacks with the item's own op on its natural cooldown via the
// ordinary foe equipment machinery. `extra.restoreTo` links a stolen one back to its owner.
export function spawnItemEntity(room, itemKey, lane, extra = {}) {
  const f = spawnFoeInLane(room, "itemEntity", lane, [itemKey]);
  f.hp = f.maxHp = Math.max(1, itemTreasure(itemKey));
  f.itemKey = itemKey;
  f.name = (extra.restoreTo ? "Stolen " : "Conjured ") + (KIT[itemKey]?.name ?? itemKey);
  if (extra.restoreTo) f.passiveText = "STOLEN — kill it to take it back.";
  Object.assign(f, extra);
  formUp(room);
  return f;
}

// Spread `count` spawns across lanes, always topping up the EMPTIEST lane first (measured
// by `weigh`) — Hydra's round-robin waves and the Kraken's wall replenish both use this.
function spawnSpread(room, bodyKey, count, weigh = (lane) => lane.length) {
  for (let k = 0; k < count; k++) {
    let li = 0;
    for (let i = 1; i < room.laneCount; i++) if (weigh(room.lanes[i]) < weigh(room.lanes[li])) li = i;
    spawnFoeInLane(room, bodyKey, li);
  }
  formUp(room);
}
const tentaclesOf = (lane) => lane.filter((f) => f.bodyKey === "tentacle").length;
export const tentacleCount = (room) => room.lanes.reduce((n, l) => n + tentaclesOf(l), 0);

// ---------------------------------------------------------------------------
// King Mimic's deck driver. One card up at a time (one clock, flagged `deck:true`);
// when it fires, the NEXT card replaces it. The bag refills with all four, shuffled,
// never repeating the just-fired card across the reshuffle seam.
// ---------------------------------------------------------------------------
export const drawKingDeck = () => [...BOSS_DEFS.kingMimic.cards].sort(() => Math.random() - 0.5);
export function nextKingCard(boss) {
  if (!boss.deck?.length) {
    boss.deck = drawKingDeck();
    if (boss.deck.length > 1 && boss.deck[0].kind === boss.lastCard)
      boss.deck.push(boss.deck.shift());
  }
  const card = boss.deck.shift();
  boss.lastCard = card.kind;
  boss.clocks = [bossClock(card.kind, card.cd,
    { label: card.label, color: card.color, dmg: card.dmg ?? 0, aoe: !!card.aoe, deck: true })];
}
// DECREE: deploy powerful, heavily-anted foes (owner's words) — armed rolls until the
// ante clears the bar (best-of-30 fallback under it, so a cold streak still lands a court).
export function rollDecreeFoe(minAnte = BOSS_DEFS.kingMimic.decreeAnte) {
  let best = null;
  for (let t = 0; t < 30; t++) {
    const bodyKey = rnd(FOE_BODIES);
    const o = { bodyKey, gear: rollFoeGear(bodyKey, FOE_SPICY_ITEMS, 5) }; // boss court: heavily armed
    if (anteOfFoe(o) >= minAnte) return o;
    if (!best || anteOfFoe(o) > anteOfFoe(best)) best = o;
  }
  return best;
}

// Kraken steal: lock a random usable item on a random player and animate it against the
// party. Guards (spec): one stolen item per player at most, and never below 1 usable item.
export function krakenSteal(room) {
  const usable = (p) => p.inv.filter((iv) => !iv.stolen && !iv.spent && KIT[iv.key]?.ops?.length);
  const victims = [...room.players.values()].filter((p) =>
    p.alive && !p.inv.some((iv) => iv.stolen) && usable(p).length >= 2);
  if (!victims.length) return null;
  const v = victims[Math.floor(Math.random() * victims.length)];
  const pool = usable(v);
  const iv = pool[Math.floor(Math.random() * pool.length)];
  iv.stolen = true;                                  // hotbar lock — exactly as long as the entity lives
  return spawnItemEntity(room, iv.key, v.lane, { restoreTo: { playerId: v.id, key: iv.key } });
}

// One boss clock fired — the whole V2 boss vocabulary lives in this switch.
export function fireBossClock(room, boss, clock) {
  switch (clock.kind) {
    case "heads": {                                  // Hydra: HYPER-inflation — each wave DOUBLES (1, 2, 4, 8…)
      spawnSpread(room, "hydraHead", boss.headWave ?? 1);
      boss.headWave = Math.max(2, (boss.headWave ?? 1) * (BOSS_DEFS.hydra.inflate ?? 2));
      break;
    }
    case "stance":                                   // Lich: ⚖ OBJECTION (cap 1) ⇄ recess (−1)
      boss.stance = boss.stance === "objection" ? "recess" : "objection";
      break;
    case "wizards":                                  // Lich: bone wizards, `players`-at-a-time, spread
      spawnSpread(room, "boneWizard", Math.max(1, room.players.size || 1));
      break;
    case "teleport": {                               // Djinn: relocate to a random OTHER lane
      if (room.laneCount < 2) break;
      const from = boss.lane | 0;
      let to = Math.floor(Math.random() * (room.laneCount - 1));
      if (to >= from) to++;
      const arr = room.lanes[from], i = arr.indexOf(boss);
      if (i >= 0) { arr.splice(i, 1); boss.lane = to; room.lanes[to].push(boss); formUp(room); }
      break;
    }
    case "aoe":                                      // Djinn: hit EVERY lane (the all-lanes telegraph flash applies)
      for (let l = 0; l < room.laneCount; l++) foeHitLane(room, l, clock.dmg ?? 0, boss);
      break;
    case "steal": krakenSteal(room); break;
    case "decree": {                                 // King: a heavy armed foe PER PLAYER, emptiest lanes first
      const n = Math.max(1, room.players.size || 1);
      for (let k = 0; k < n; k++) {
        let li = 0;
        for (let i = 1; i < room.laneCount; i++) if (room.lanes[i].length < room.lanes[li].length) li = i;
        const o = rollDecreeFoe();
        if (o) spawnFoeInLane(room, o.bodyKey, li, o.gear);
      }
      formUp(room);
      break;
    }
    case "replenish": {                              // Kraken: back UP TO CAP, regardless of how many fell
      const deficit = (boss.tentacleCap ?? 0) - tentacleCount(room);
      if (deficit > 0) spawnSpread(room, "tentacle", deficit, tentaclesOf);
      break;
    }
    default: break;
  }
}

// Advance a combatant's boss clocks one tick (charge → fire → reset).
export function tickBossClocks(room, c) {
  for (const k of c.clocks ?? []) {
    if (++k.charge < k.cd) continue;
    k.charge = 0;
    fireBossClock(room, c, k);
    if (k.deck) { nextKingCard(c); break; }   // the fired card rotates out — c.clocks was just replaced
  }
}

// On-damaged boss triggers WITH lane attribution — the lane the damaging source came from
// is a first-class fact (BOSS_SPEC_V1 architecture). Hydra rework (owner 2026-06-12,
// corrected 00:20): a head pops up for every INSTANCE of damage that lands — one head
// per hit, any size (the owner's first wording said "point"; he meant instance). No
// per-lane rate limit: a 4-strike Omnislash is 4 instances and blooms 4 heads. Big slow
// hits are the efficient way to hurt it; spam feeds the garden.
export function bossOnDamaged(room, boss, laneIdx, landed = 1) {
  if (boss.bodyKey !== "hydra" || !(landed > 0)) return;
  spawnFoeInLane(room, "hydraHead", laneIdx);
  formUp(room);
}

// Is the back-line boss still standing?
export const bossAlive = (room) => !!(room.boss && room.boss.hp > 0);

// Spawn the floor's boss (BOSS_SPEC_V1). Back-line bosses (Hydra/Lich/Kraken) become
// room.boss — a caravan-mirror spanning every lane, NOT a lane entry. The Djinn occupies
// a lane like an ordinary foe and relocates. HP = body base × players × floor (the budget).
export function spawnBoss(room) {
  const bossKey = bossForFloor(room, room.floor ?? 1);
  const players = Math.max(1, room.players.size || 1);
  const floor = room.floor ?? 1;
  const budget = bossBudget(players, floor);
  const def = BOSS_DEFS[bossKey] ?? {};
  const boss = spawnEnemy(bossKey);
  boss.hp = boss.maxHp = Math.round(bodyMaxHp(BODIES[bossKey]) * budget);
  if (bossKey === "hydra") {
    boss.headWave = def.headStart ?? 1;
    boss.clocks = [
      bossClock("heads", def.headCd, { label: "🐍 heads", color: "#5fd0a0" }),
      // the "very low 1, 2, 3 base attack" (owner): a floor-scaled maul on every lane
      bossClock("aoe", def.maulCd ?? 50, { label: "🐉 maul", color: "#ff9ed2", dmg: floor, aoe: true }),
    ];
  } else if (bossKey === "litigationLich") {
    boss.stance = "objection";                       // opens in court — the party waits out the cap
    boss.clocks = [
      bossClock("stance", def.stanceCd, { label: "⚖ stance", color: "#9a7fc0" }),
      bossClock("wizards", def.wizardCd, { label: "💀 wizards", color: "#cfd0e8" }),
    ];
  } else if (bossKey === "djinn") {
    boss.clocks = [
      bossClock("teleport", def.teleportCd, { label: "🌀 move", color: "#d0904f" }),
      bossClock("aoe", def.aoeCd, { label: "✦all", color: PASSIVE_BAR_COLOR, dmg: def.aoeDmg, aoe: true }),
    ];
  } else if (bossKey === "kraken") {
    boss.tentacleCap = (def.capPerPlayer ?? 2) * players;
    boss.clocks = [
      bossClock("steal", def.stealCd, { label: "🦑 steal", color: "#d06fb0" }),
      bossClock("replenish", def.replenishCd(floor), { label: "🐙 wall", color: "#5f8fd0" }),
    ];
  } else if (bossKey === "kingMimic") {
    boss.deck = [];          // the deck driver: one card = one bar; budget rides room.floor (= THRONE_FLOOR)
    nextKingCard(boss);      // opens with no stance up — the first STANCE card raises the guard
  }
  if (BODIES[bossKey]?.backline) {
    boss.lane = null; boss.depth = null;
    room.boss = boss;
    if (bossKey === "kraken")                        // it ENTERS behind its wall
      spawnSpread(room, "tentacle", boss.tentacleCap, tentaclesOf);
    if (bossKey === "hydra")                         // it OPENS behind five heads (owner 2026-06-12)
      spawnSpread(room, "hydraHead", def.startHeads ?? 5);
  } else {
    boss.lane = Math.floor((room.laneCount - 1) / 2);
    room.lanes[boss.lane].push(boss);
    formUp(room);
  }
  return boss;
}

export function enterRoom(room) {
  // Lanes = player count for this room (god keeps ≥3). Derive BEFORE building the arrays.
  room.laneCount = deriveLaneCount(room, currentNode(room)?.type ?? "combat");
  room.lanes = Array.from({ length: room.laneCount }, () => []);
  room.allies = Array.from({ length: room.laneCount }, () => []);
  room.boss = null;                       // a stale back-line boss never follows you into the next room
  resetRoomVotes(room);                   // a fresh room → wipe last won-screen's next-room votes/locks
  room.itemUses = 0;                      // the Djinn's party-wide counter starts fresh per room
  room.useCounts = {};                    // telemetry: per-room item-use tally
  room.freezeFoes = 0; room.freezeHeroes = 0;   // ⏳ a Time Stop never outlives its room
  // Unlocked bodies ACCUMULATE across the whole run (the mimic hook) — NEVER wiped per
  // room. Just ensure the starter is present; god mode opens the whole roster for testing.
  if (!room.unlockedBodies) room.unlockedBodies = new Set([STARTER_BODY]);
  room.unlockedBodies.add(STARTER_BODY);
  if (room.god) for (const k of Object.keys(BODIES)) room.unlockedBodies.add(k);
  // Each player OWNS a distinct lane (their body + their greedy-add sit there). With lanes =
  // player count this is a bijection; in boss/god rooms (≥3 lanes) extra lanes are unowned.
  let _li = 0;
  for (const p of room.players.values()) {
    // God: full kit on the rookie body. Otherwise the worn-passive stat reads come from the backpack.
    p.inv = room.god ? freshKit(true)
          : kitFromPicks(p.backpack?.length ? p.backpack : KIT_POOL.slice(0, DRAFT_PICKS));
    // CARD collection = the playable DECK, floored to MIN_DECK (10) and padded from the hand-
    // designed STARTER_DECK so a run always opens with a real deck. beginCombat shuffles these
    // into deck+hand; the draw pile grows with no max as you add cards.
    p.cards = mintCards(deckKeys(p, room.god));
    p.ownedLane = Math.min(room.laneCount - 1, _li++);
    // owner 2026-06-21: REOPEN with the party formation you arranged last setup (snapshotted in
    // beginCombat) — clamped to this room's lane count — instead of resetting to one-body-per-lane.
    // First room (no save yet) falls back to your owned lane at the front.
    const savedLane = p.partyLane;
    p.lane = Number.isInteger(savedLane) ? Math.max(0, Math.min(room.laneCount - 1, savedLane)) : p.ownedLane;
    p.depth = Number.isInteger(p.partyDepth) ? p.partyDepth : 0;
    p.alive = true; p.downTimer = 0;
    wearBody(p, room.god ? STARTER_BODY : (p.homeBody ?? STARTER_BODY));
    if (room.god) { p.maxHp = 999; p.hp = 999; }
  }
  // a saved formation can stack several bodies in one lane — normalize each lane's depths to a
  // clean 0..n-1 front→back line so the blocking order stays unambiguous (mirrors moveDepth).
  for (let ln = 0; ln < room.laneCount; ln++) {
    [...room.players.values()].filter((p) => p.lane === ln)
      .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || (a.id < b.id ? -1 : 1))
      .forEach((p, i) => { p.depth = i; });
  }
  // Foe-draft: ordinary rooms let you stock the foes first. Bosses & god auto-fill.
  room.draftedFoes = [];
  room.loot = [];
  room.tradeOffers = [];        // stale trade offers don't carry between rooms
  const type = currentNode(room)?.type ?? "combat";
  room.enchant = null;            // room EFFECTS removed (owner 2026-06-28) — rooms carry no modifier
  // ELITE GIMMICK (owner 2026-06-29): an elite room loads its rolled modifier; every other room clears it.
  const _gk = type === "elite" ? currentNode(room)?.gimmick : null;
  room.gimmick = (_gk && GIMMICKS[_gk]) ? { ...GIMMICKS[_gk], key: _gk } : null;
  // wire the gimmick's room-wide clock via the room-timer engine: Acid Rain bleeds everyone, Runaway Scaling
  // ramps the foes. Cut-Rate Foes needs no clock (read live in foeCast). Reset every room — stale never carries.
  room.roomTimers = _gk === "acidRain"   ? [{ kind: "acid",  cd: 30, charge: 0, amount: 1 }]
                  : _gk === "foeScaling" ? [{ kind: "scale", cd: 40, charge: 0, amount: 1 }]
                  : [];
  room.shop = null;
  if (type === "start") {
    // TRAILHEAD (owner 2026-06-29): lanes + bodies are set up above, but there's no fight here — drop
    // straight into the between-rooms CHOOSER so the player picks their FIRST room. No foes, no loot.
    room.draftedFoes = [];
    room.phase = "won";
    room.lastRoomValue = 0;
  } else if (!room.god && type === "shop") {
    room.shop = { wares: rollShopWares() };   // a fresh shelf of buyable items
    room.phase = "shop";
  } else if (room.god || type === "boss") {
    buildRoom(room);
    room.phase = "setup";
  } else {
    // ROOM-DRAFT, not foe-draft (owner spec 2026-06-27): you choose the ROOM — the map branch IS the
    // offer — and its foes arrive PRE-BUILT. A room = a RANDOM SELECTION OF FOES that EQUALS the room
    // ante (floor × party; an "elite" room is simply a DOUBLE-ANTE room — ×2 — whose reward is INBUILT
    // to the richer, higher-level, better-geared bodies/items you fell and loot). There is NO per-foe
    // stock/greedy step: the room goes STRAIGHT to formation/setup, exactly like a boss does. The old
    // "stock" phase + greedy palette are retired from the live flow (their server handlers / snapshot
    // block survive as harmless no-ops, all gated on phase === "stock").
    room.draftedFoes = [];
    room.anteMin = ANTE_MIN;        // 0 — the floor is retired (snapshot/back-compat)
    room.anteCap = roomAnteBudget(room, type);   // the ROOM ANTE: floor × party (×2 for an elite "double-ante" room)
    // BOTH combat and elite rooms are the same code path now: a random foe selection that FILLS the
    // ante. Elite ≠ a special centerpiece body any more — it's just the double budget (owner 2026-06-27,
    // "have elites just be included in rooms").
    // Use the room's PRE-BUILT roster (stocked at map build so the map preview matches the fight); fall
    // back to a fresh roll for legacy/test rooms that never went through stockLevelRooms.
    const _node = currentNode(room);
    const _pre = _node?.foes;
    room.draftedFoes.push(...((_pre && _pre.length)
      ? _pre.map((f) => ({ ...f, gear: [...(f.gear ?? [])] }))
      : generateRoomFoes(room, room.anteCap, room.floor ?? 1)));
    room.foePalette = [];           // no greedy-add palette — rooms are pre-built (foe-offer step removed)
    room.picksRequired = picksRequiredFor(type);   // DOUBLE-FEATURE label only (no gate)
    room.anteRequired = 0;          // NO floor — kept 0 for back-compat
    buildRoom(room);                // place the pre-built foes now (the room is fully stocked on entry)
    room.phase = "setup";           // straight to formation — the foe-offer (stock) step is gone
  }
}

// (Wandering Monster removed 2026-06-28 with the rest of the room effects — no pre-placed foe.)

// ---------------------------------------------------------------------------
// Stock the room. The room arrives EMPTY; the party invites foes from the palette into
// their own lanes until the required ante is met (anteRequired ≤ anteCurrent gates
// commitStock). Every stocked foe's body-value AND its carried items feed the room value
// V — so a richer room raises EVERYONE's mirrored income equally.
// ---------------------------------------------------------------------------
// Low-level primitive: push a greedy foe from palette slot `idx` (no owner, no per-player cap).
// Used by tests/fuzz/utilities. Live play goes through addGreedy (per-player, owner-tagged).
export function addFoe(room, idx, owner = null) {
  if (room.phase !== "stock") return false;
  const opt = room.foePalette?.[idx];
  if (!opt || room.draftedFoes.length >= STOCK_MAX) return false;
  // remember the slot + option so removal is a true UNDO (see restorePaletteSlot)
  room.draftedFoes.push({ bodyKey: opt.bodyKey, gear: [...(opt.gear ?? [])], greedy: true, owner, slot: idx, opt: { ...opt } });
  // a fresh choice rolls into that slot so there's always something new to pick — avoiding the
  // OTHER slots' bodies so the palette never shows the same foe twice
  if ((room.foePool ?? []).length) {
    const avoid = new Set(room.foePalette.filter((_, j) => j !== idx).map((o) => o?.bodyKey).filter(Boolean));
    room.foePalette[idx] = nextPaletteOption(room, avoid);
  }
  ensureCheapSlot(room);                       // the cheap-option guarantee survives rerolls
  return true;
}

// Live player action (COLLECTIVE DRAFT, owner 2026-06-19): draft a foe from the palette into the
// shared pool. FREE-FOR-ALL — no per-player cap; anyone adds as many as they like until the room's
// ante is met (the only ceiling is STOCK_MAX, enforced in addFoe). The owner tag is kept for
// telemetry/credit only — it no longer pins the foe to a lane (placedLanes sorts by tankiness).
export function addGreedy(room, player, idx) {
  if (room.phase !== "stock" || !player) return false;
  return addFoe(room, idx, player.id);
}

// Removal is an UNDO: the pick's original option goes BACK into the palette slot it came
// from, overwriting whatever rolled in. Remove/re-add cycles therefore reveal nothing new —
// the reroll-scry loop (fishing the wheel for the weakest foes, owner 2026-06-12) is dead,
// while plain adds still roll fresh options for everyone else.
function restorePaletteSlot(room, f) {
  if (f?.slot == null || !f.opt || !room.foePalette?.[f.slot]) return;
  room.foePalette[f.slot] = { ...f.opt };
  ensureCheapSlot(room);   // the restored option may displace the cheap guarantee
}

// NO TAKE-BACKS (owner 2026-06-19: "once you draft a foe it's there, your regret be damned").
// The live remove action is now a no-op; a drafted foe is committed. (`removeFoe` survives as a
// test/utility primitive.) Kept exported so the server's stockRemove route + imports stay valid.
export function removeGreedy(room, player) {
  return false;
}

// Index-based removal primitive (only removes greedy foes). Used by tests/legacy.
export function removeFoe(room, i) {
  if (room.phase !== "stock") return;
  const f = room.draftedFoes[i];
  if (f && f.greedy) { restorePaletteSlot(room, f); room.draftedFoes.splice(i, 1); } // baseline rank-and-file can't be removed
}

// COLLECTIVE DRAFT (owner 2026-06-19): there's no per-body quota anymore — the party fills ONE
// shared ante, so squad bots no longer auto-place (the piloting human drafts the whole room, free-
// for-all). No-op kept so commitStock's call + existing imports stay valid; the begin gate can't
// soft-lock now because the human can always add another foe until the ante is met.
export function autoStockBots(room) {}

export function commitStock(room) {
  if (room.phase !== "stock") return;
  autoStockBots(room);                  // squad bots fill their own lanes before the gate is checked
  if (!stockReady(room)) return;        // everyone (the human included) places their pick(s) first
  buildRoom(room);
  room.phase = "setup";
}

// Claim a piece of the room's loot into your BACKPACK (owner 2026-06-24: free — no gold, no cap).
// Loot is a SHARED, SCARCE set — one instance of each drop, first-come. There is NO stash —
// unclaimed loot is gone on leave. The card joins the backpack only; it stays out of the combat
// deck until the player explicitly moveToDeck's it.
export function claimLoot(room, player, key) {
  if (room.phase !== "won") return;
  const i = room.loot.indexOf(key);
  if (i < 0 || !KIT[key]) return;
  room.loot.splice(i, 1);
  (player.backpack ??= []).push(key);    // carried into future rooms; the deck is chosen separately
}

// Remove ONE copy of `key` from a player's backpack, pulling it out of the deckList too if it's
// there — but NEVER let either drop below MIN_DECK. Returns true on success. The shared primitive
// behind dropItem and buyWare's pay-in.
function pullFromBackpack(player, key) {
  const bi = (player.backpack ?? []).indexOf(key);
  if (bi < 0) return false;
  if ((player.backpack?.length ?? 0) <= MIN_DECK) return false;   // backpack floor
  const di = (player.deckList ?? []).indexOf(key);
  if (di >= 0 && (player.deckList?.length ?? 0) <= MIN_DECK) return false; // pulling it would break the deck floor
  player.backpack.splice(bi, 1);
  if (di >= 0) player.deckList.splice(di, 1);
  return true;
}

// Between rooms (won screen) or at a shop: drop a card from your backpack. Never shrinks the
// backpack or the deck below the MIN_DECK (10) floor (owner 2026-06-24).
export function dropItem(room, player, key) {
  if (room.phase !== "won" && room.phase !== "shop") return;
  pullFromBackpack(player, key);
}

// ---------------------------------------------------------------------------
// DECK / BACKPACK MOVES (out of combat — ANY non-"playing" phase). The backpack is the full owned
// repo; the deckList is the chosen combat deck, a sub-multiset of the backpack, floored at MIN_DECK.
// Owner 2026-06-27: "edit deck at any time outside of combat even after the room is chosen" → relaxed
// from won/shop-only to every phase except live combat, so `setup` (room already drafted, pre-fight)
// edits work too. The MIN_DECK floor invariant is unchanged. (FLAG — only the deck<->backpack MOVES
// open up here; dropItem and player trades stay won/shop-only, a separate dial if the owner wants them
// in setup as well. CLIENT: the deck-editor UI must be surfaced in `setup` — that's the other agent's job.)
const editable = (room) => room.phase !== "playing";

// Add ONE copy of `key` from the backpack into the combat deck (no max), as long as the deck doesn't
// already hold as many copies as the backpack owns. Returns true on success.
export function moveToDeck(room, player, key) {
  if (!editable(room) || !player) return false;
  if (countKey(player.deckList, key) < countKey(player.backpack, key)) {
    (player.deckList ??= []).push(key);
    return true;
  }
  return false;
}

// Remove ONE copy of `key` from the combat deck back to the backpack (the card stays owned). NEVER
// lets the deck drop below MIN_DECK (10). Returns true on success.
export function moveToBackpack(room, player, key) {
  if (!editable(room) || !player) return false;
  if ((player.deckList?.length ?? 0) <= MIN_DECK) return false;   // the 10-card floor is absolute
  const i = (player.deckList ?? []).indexOf(key);
  if (i < 0) return false;
  player.deckList.splice(i, 1);
  return true;
}

// ---------------------------------------------------------------------------
// Player-to-player TRADING — a straight 1-for-1 card swap (owner 2026-06-24: gold is gone, so there
// is no value settlement — equal cards or not, the swap is value-for-value by choice). Out-of-combat
// only (won/shop).
// ---------------------------------------------------------------------------
const tradeable = (room) => room.phase === "won" || room.phase === "shop";

// Execute an AGREED 1-for-1 swap: `a` gives `aKey`, `b` gives `bKey`; each receives the other's card
// in its backpack (and, if the given card was in the deck, the received card takes its deck slot so
// the deck size is preserved). Validates ownership only — no gold, no settlement.
export function tradeItems(room, a, b, aKey, bKey) {
  if (!tradeable(room) || !a || !b || a === b) return false;
  const ai = (a.backpack ?? []).indexOf(aKey);
  const bi = (b.backpack ?? []).indexOf(bKey);
  if (ai < 0 || bi < 0 || !KIT[aKey] || !KIT[bKey]) return false;
  a.backpack.splice(ai, 1); (b.backpack ??= []).push(aKey);
  b.backpack.splice(bi, 1); (a.backpack ??= []).push(bKey);
  // keep the deck consistent: a card swapped out of the deck is replaced in place by the incoming one
  const adi = (a.deckList ?? []).indexOf(aKey); if (adi >= 0) a.deckList.splice(adi, 1, bKey);
  const bdi = (b.deckList ?? []).indexOf(bKey); if (bdi >= 0) b.deckList.splice(bdi, 1, aKey);
  return true;
}

// SQUAD GIVE (owner 2026-06-21): hand a card to ANOTHER OF YOUR OWN bodies — INSTANT, no offer, no
// gold (it's all you; the seat's holdings move freely). Same-seat only; no space gate now (backpacks
// have no cap). Pulls the card from the giver's backpack (and deck if present) and adds it to the
// receiver's backpack. Out-of-combat (won/shop), like trades.
export function giveOwnItem(room, from, toId, key) {
  if (!tradeable(room) || !from) return false;
  const to = room.players.get(toId);
  if (!to || to === from) return false;
  const seat = (p) => p.owner ?? p.id;
  if (seat(to) !== seat(from)) return false;                         // your own squad only
  const i = (from.backpack ?? []).indexOf(key);
  if (i < 0 || !KIT[key]) return false;
  from.backpack.splice(i, 1);
  const di = (from.deckList ?? []).indexOf(key); if (di >= 0) from.deckList.splice(di, 1); // can't keep a card you gave away in your deck
  (to.backpack ??= []).push(key);
  return true;
}

// SQUAD SWAP (owner 2026-06-21): exchange ONE card between two of YOUR OWN bodies — instant, no
// offer, no gold. Same-seat only, out-of-combat (won/shop). Each side's deck slot is preserved if
// the swapped card was in the deck.
export function swapOwnItems(room, from, toId, fromKey, toKey) {
  if (!tradeable(room) || !from) return false;
  const to = room.players.get(toId);
  if (!to || to === from) return false;
  const seat = (p) => p.owner ?? p.id;
  if (seat(to) !== seat(from)) return false;                         // your own squad only
  const fi = (from.backpack ?? []).indexOf(fromKey);
  const ti = (to.backpack ?? []).indexOf(toKey);
  if (fi < 0 || ti < 0 || !KIT[fromKey] || !KIT[toKey]) return false;
  from.backpack.splice(fi, 1, toKey);   // replace in place in the backpack
  to.backpack.splice(ti, 1, fromKey);
  const fdi = (from.deckList ?? []).indexOf(fromKey); if (fdi >= 0) from.deckList.splice(fdi, 1, toKey);
  const tdi = (to.deckList ?? []).indexOf(toKey); if (tdi >= 0) to.deckList.splice(tdi, 1, fromKey);
  return true;
}

// Execute an agreed one-way GIFT (cross-human): `from` hands `key` to `to` — free now (no gold, no
// space gate). The card leaves the giver's backpack/deck and joins the receiver's backpack.
export function giftItem(room, from, to, key) {
  if (!tradeable(room) || !from || !to || from === to) return false;
  const i = (from.backpack ?? []).indexOf(key);
  if (i < 0 || !KIT[key]) return false;
  from.backpack.splice(i, 1);
  const di = (from.deckList ?? []).indexOf(key); if (di >= 0) from.deckList.splice(di, 1);
  (to.backpack ??= []).push(key);
  return true;
}

let _offerSeq = 1;
// Propose a trade: `from` offers their `give` to `to`. `want` = a swap (their card) OR null = a
// one-way GIFT. Stored until accepted/declined. Ownership is checked against the backpack.
export function proposeTrade(room, from, toId, give, want = null) {
  if (!tradeable(room) || !from) return false;
  const to = room.players.get(toId);
  if (!to || to === from) return false;
  if (!(from.backpack ?? []).includes(give)) return false;
  if (want != null && !(to.backpack ?? []).includes(want)) return false;   // swap must name a held card
  (room.tradeOffers ??= []).push({ id: "of" + _offerSeq++, from: from.id, to: toId, give, want: want ?? null });
  return true;
}

// The target accepts: re-validate and execute (gift when want is null, else a swap), then clear it.
export function acceptTrade(room, accepter, offerId) {
  const offers = room.tradeOffers ?? [];
  const i = offers.findIndex((o) => o.id === offerId);
  if (i < 0) return false;
  const o = offers[i];
  if (!accepter || accepter.id !== o.to) return false;       // only the target can accept
  const from = room.players.get(o.from);
  if (!from) { offers.splice(i, 1); return false; }
  const okTrade = o.want == null ? giftItem(room, from, accepter, o.give)
                                 : tradeItems(room, from, accepter, o.give, o.want);
  if (okTrade) offers.splice(i, 1);
  return okTrade;
}

// Withdraw/decline an offer (either party, or a cleanup).
export function declineTrade(room, player, offerId) {
  const offers = room.tradeOffers ?? [];
  const i = offers.findIndex((o) => o.id === offerId && (o.from === player?.id || o.to === player?.id));
  if (i < 0) return false;
  offers.splice(i, 1);
  return true;
}

export function beginCombat(room) {
  room.combatLog = []; room._endLogged = false; room._fileLogged = false;
  clog(room, "— Combat begins (Floor " + (room.floor ?? 1) + ") —");
  if (room.phase === "setup") {
    room.phase = "playing";
    // owner 2026-06-21: remember the lanes/depths you arranged in SETUP so the NEXT room reopens
    // with the SAME formation (no reset to one-body-per-lane). Snapshot NOW — before combat moves
    // scramble depth — so it captures your deliberate placement, not the post-fight scramble.
    for (const p of room.players.values()) { p.partyLane = p.lane; p.partyDepth = p.depth ?? 0; }
  }
  room._bestFoeHp = undefined; room._bestCav = undefined; room._stallTicks = 0; // reset anti-stall
  // Per-fight state, symmetric for players (inv) and foes (equipment):
  //  • thorns buffs (Spikes) expire — "this fight" only;
  //  • shields expire too (owner bug report 2026-06-12: a banked buffer was carrying
  //    across rooms). PLAYERS only — foe shields are spawn-granted (Armory) and fresh
  //    per room anyway, so zeroing them here would erase the modifier;
  //  • `startCharged` items (Trusty Shield) open the fight ready to fire.
  for (const p of room.players.values()) {
    p.thorns = 0; p.shield = 0; p.buffs = [];   // buffs (Power Up etc.) are per-fight — don't carry across rooms
    p.echoCharge = 0; p.echoReady = false; p.echoArmed = false;  // the echo bar is per-fight state
    // per-fight ramps & body clocks reset (owner 2026-06-23): the +1-damage ramp (counters), the
    // moxie/hit/play accumulators, the melee+ranged pair latch, and a stray double all start fresh —
    // otherwise a Bond Behemoth / Malevolent Mouse would compound its bonus across rooms.
    // melee/ranged bonus reset to the BODY-LEVEL base (not 0): a leveled body's +combat is permanent,
    // the same way a foe's spawn bakes its level combat in — in-fight ramps (Sharpened Edges) add on top.
    p.counters = 0; p.meleeBonus = p.levelMelee ?? 0; p.rangedBonus = p.levelRanged ?? 0; p.pspend = {}; p.pcharge = {}; p.pair = {}; p.doubleNext = false;
    p.regens = []; p.bloodToIron = null; p.poison = 0; p.poisonClock = 0; p.timers = [];   // ongoing card effects are per-fight
    dealHand(p);                       // shuffle the collection → deck + opening hand, moxie = START_MOXIE
    applyCombatStart(p);               // Malevolent Mouse +1 / Golden Golem +2 shield / Centless Centaur double
  }
  for (const lane of room.lanes) for (const f of lane) {
    f.thorns = 0;
    for (const it of f.equipment ?? []) if (KIT[it.key]?.startCharged) it.charge = it.cd;
  }
  room.roomTimers = [];            // room effects removed 2026-06-28 — no global room clocks
}

// ---------------------------------------------------------------------------
// THE DRAFT — each player locks one bundle off the shared wheel (a lowest-power body +
// 3 random items), EXCLUSIVELY. When everyone has locked, the level auto-starts.
// ---------------------------------------------------------------------------
// Draft bundles roll CHEAP (value-1) items only — value climbs through loot/shop, not the wheel.
// KIT FIT (owner 2026-06-12): 2 of the 3 items are IN-HOUSE — the body's own school, with
// untyped utility (shields) fitting anyone — so no bundle is a trap (a Lizard Wizard never
// opens on a Bow). The third is a WILD CARD from the whole common pool ON PURPOSE: the odd
// cross-school find (a Minotaur holding Lightning that answers a rat flood) is strategy,
// not noise. Slot 1 is in-house AND damaging so no loadout is a dud and combat can't
// deadlock from a toothless party.
const CHEAP_KIT = PLAYER_POOL.filter((k) => (KIT[k].ante ?? 1) <= 1); // value-1 cards from the owner's set
const DAMAGING_ITEMS = CHEAP_KIT.filter((k) => (KIT[k].ops ?? []).some((o) => o.do === "deal"));
const inHouseFor = (bodyKey, k) => {
  const school = ((BODIES[bodyKey]?.mag ?? 0) > 0) ? "magical" : "physical";
  return !KIT[k].type || KIT[k].type === school;   // untyped utility fits any body
};
// A body's RANDOM STARTER DECK — MIN_DECK (10) value-1 cards, freshly rolled per body so each
// of the wheel's bodies offers a different deck (owner 2026-06-22). The first three slots keep
// the original KIT-FIT guarantee (slot 1 in-house + damaging, slot 2 in-house, slot 3 a wild
// that may roam off-school) so no body opens on a trap; the remaining slots fill to 10, biased
// in-house so the body's school Power stays relevant, occasionally wild for spice. DUPLICATES
// are allowed once the distinct pool runs dry (a starter can run copies) — that's how a ≤8-card
// in-house pool still reaches a 10-card deck.
export function rollKit(bodyKey) {
  const house = CHEAP_KIT.filter((k) => inHouseFor(bodyKey, k));
  const first = rnd(house.filter((k) => DAMAGING_ITEMS.includes(k)));      // slot 1: in-house + damaging
  const second = rnd(house.filter((k) => k !== first));                    // slot 2: in-house
  const wild = rnd(CHEAP_KIT.filter((k) => k !== first && k !== second)); // slot 3: any value-1 item
  const deck = [first, second, wild];
  while (deck.length < MIN_DECK) {                                         // slots 4..10: fill to MIN_DECK
    const pool = Math.random() < 0.75 ? house : CHEAP_KIT;                 // mostly in-house, sometimes wild
    const fresh = pool.filter((k) => !deck.includes(k));                   // prefer variety, allow dups when dry
    deck.push(rnd(fresh.length ? fresh : pool));
  }
  return deck;
}
let _bundleSeq = 1;
// Roll the shared wheel: distinct low bodies, each with a fresh 3-item bundle. At least
// DRAFT_WHEEL_MIN and always ≥ players + 1 so locking stays a real exclusive choice (the last
// locker still sees two options) while the common solo/squad case fits one phone row (5).
export function rollDraftWheel(playerCount = 1) {
  const size = Math.min(DRAFT_BODIES.length, Math.max(DRAFT_WHEEL_MIN, playerCount + 1));
  const bodies = [...DRAFT_BODIES].sort(() => Math.random() - 0.5).slice(0, size);
  return bodies.map((bodyKey) => ({ id: "bndl" + _bundleSeq++, bodyKey, items: rollKit(bodyKey) }));
}

// Late-join grow (owner 2026-06-19: rooms open straight into the draft, so players now ARRIVE
// mid-draft instead of waiting in a lobby). Append fresh bundles — bodies not already on the
// wheel — up to the same target rollDraftWheel uses, WITHOUT disturbing existing bundles, so
// anyone who already locked a pick keeps it. Caps at the body pool, like the initial roll.
export function growDraftWheel(room) {
  if (room.phase !== "draft") return;
  const wheel = room.draftWheel ?? (room.draftWheel = []);
  const target = Math.min(DRAFT_BODIES.length, Math.max(DRAFT_WHEEL_MIN, room.players.size + 1));
  if (wheel.length >= target) return;
  const used = new Set(wheel.map((w) => w.bodyKey));
  const fresh = DRAFT_BODIES.filter((b) => !used.has(b)).sort(() => Math.random() - 0.5);
  while (wheel.length < target && fresh.length) {
    const bodyKey = fresh.shift();
    wheel.push({ id: "bndl" + _bundleSeq++, bodyKey, items: rollKit(bodyKey) });
  }
}

// A human JOINED a room that had already left the draft for pre-combat staging. The no-lobby flow
// (owner 2026-06-19) lets the host solo-draft and auto-start the run BEFORE a friend's socket lands,
// which stranded the newcomer: no body/kit pick, lanes locked at the host-only count, both bodies
// stacked in lane 0 (the "multiplayer is bugged / we overlapped" report, 2026-06-24). Pull the room
// BACK to the draft so the newcomer (and any squad bots they brought) pick a loadout, and so the
// lanes + caravan re-derive for the bigger party once the draft completes. Picks already locked are
// preserved (each still-undrafted seat just needs to choose). Only fires in PRE-COMBAT staging —
// once a fight is live the lanes are locked, so a mid-combat arrival folds in at the next room. The
// in-progress level (if any) is KEPT so maybeFinishDraft RE-ENTERS the current node rather than
// rebuilding the floor — a between-rooms drop-in keeps run progress.
export function reopenDraftForJoin(room) {
  // also reopen from the run-start TRAILHEAD (phase "won" at a "start" node, owner 2026-06-29): a friend
  // who lands while you're still choosing the first room still gets to draft. A between-rooms "won" does
  // NOT reopen (they fold in next room — unchanged).
  const atTrailhead = room.phase === "won" && currentNode(room)?.type === "start";
  if (!atTrailhead && !["draft", "stock", "setup", "shop"].includes(room.phase)) return false;
  room.phase = "draft";
  growDraftWheel(room);     // guarantee a still-open bundle for every undrafted seat at the new size
  syncLobbyLanes(room);     // grow the board preview when no level is staged yet (no-op mid-run)
  return true;
}

export function startDraft(room) {
  room.phase = "draft";
  room.level = null;
  room.levelComplete = false;
  room.runWon = false;            // a fresh run, a fresh claim on the throne
  room.floor = 1;                 // a fresh run starts on floor 1
  room.anteMin = ANTE_MIN; room.anteCap = ANTE_CAP_BASE; // fresh run, fresh roll window (the ratchet resets here only)
  room.bossDraw = drawBossRotation();  // this run's 3-of-4 boss rotation, seeded once (map preview agrees)
  room.unlockedBodies = new Set([STARTER_BODY]); // a NEW run resets the adopted-body pool
  room.draftWheel = rollDraftWheel(room.players.size); // the shared body+items wheel
  syncLobbyLanes(room);   // board preview = party size (covers a re-draft after a lost run)
  // …and every player's backpack/deck and draft lock (a fresh run wipes them). No gold to reset.
  for (const p of room.players.values()) {
    p.classKey = null; p.backpack = []; p.deckList = [];
    p.lockedBundle = null; p.drafted = false;
    // RUN-WIDE LEVEL resets to 1 each NEW RUN (owner 2026-06-29): the level follows you across bodies
    // WITHIN a run, but a fresh run starts back at level 1 (roguelike convention).
    p.runLevel = FOE_LEVEL_MIN; p.level = FOE_LEVEL_MIN; p.levelMelee = 0; p.levelRanged = 0;
  }
  // SQUAD (owner 2026-06-18): the human drafts a body + kit for EACH of their bodies — so squad
  // bodies are NOT auto-drafted anymore. The client cycles through them (possess + draftPick per
  // body); the run starts once every body is picked. (autoDraftBots is kept for any future true-AI
  // bot, but no longer fired here — every current bot is a human-owned squad body.)
}

// Apply a chosen body + starter cards as a player's locked loadout, then maybe finish the draft.
// The bundle's cards (MIN_DECK value-1 cards) seed BOTH the backpack (owned repo) AND the deckList
// (combat deck) — so a fresh player opens with a full ≥10-card deck that's already in the backpack.
function applyDraftPick(room, player, bodyKey, items, bundleId = null) {
  player.bodyKey = bodyKey;
  player.homeBody = bodyKey;
  player.backpack = [...items];
  player.deckList = [...items];
  player.lockedBundle = bundleId;
  player.drafted = true;
  wearBody(player, bodyKey);              // show the chosen body immediately while others pick
  maybeFinishDraft(room);
}

// Live draft: lock a wheel bundle EXCLUSIVELY (no two players on the same one).
export function draftPick(room, player, bundleId) {
  if (room.phase !== "draft" || !player) return;
  const b = (room.draftWheel ?? []).find((x) => x.id === bundleId);
  if (!b) return;
  if ([...room.players.values()].some((q) => q !== player && q.lockedBundle === bundleId)) return; // exclusive
  applyDraftPick(room, player, b.bodyKey, b.items, bundleId);
}

// Back-compat: a class is just a body + a fixed 3-item kit applied as a draft pick (no
// exclusivity — multiple players may share a class). Used by tests / the legacy class UI.
export function chooseClass(room, player, classKey) {
  if (room.phase !== "draft" || !CLASSES[classKey]) return;
  player.classKey = classKey;
  applyDraftPick(room, player, classKey, CLASSES[classKey].kit, null);
}

export function draftComplete(room) {
  return room.players.size > 0 &&
    [...room.players.values()].every((p) => p.drafted);
}

export function maybeFinishDraft(room) {
  if (room.phase !== "draft" || !draftComplete(room)) return;
  // A reopened drop-in draft (reopenDraftForJoin) kept the staged level, so RE-ENTER the current
  // node with the bigger party — lanes/caravan re-derive, map progress kept. A fresh run has no
  // level yet → build floor 1 and enter it.
  if (room.level) enterRoom(room);
  else startLevel(room);
}

// Squad bots don't sit at the draft wheel — each undrafted bot grabs a distinct still-open
// bundle the instant the wheel exists, so the human only ever picks for the body they're
// piloting and the draft never stalls waiting on autopilots. The wheel is always sized
// ≥ players + 2, so a bundle is guaranteed free for every seat.
export function autoDraftBots(room) {
  if (room.phase !== "draft") return;
  for (const p of room.players.values()) {
    if (!p.bot || p.drafted) continue;
    const taken = new Set([...room.players.values()].map((q) => q.lockedBundle).filter(Boolean));
    const b = (room.draftWheel ?? []).find((x) => !taken.has(x.id));
    if (b) applyDraftPick(room, p, b.bodyKey, b.items, b.id);  // also maybeFinishDraft()s
  }
}

export function startLevel(room) {
  room.level = buildLevel(room.floor ?? 1);
  stockLevelRooms(room);                 // pre-build every room's roster so the map can preview it
  room.levelComplete = false;
  enterRoom(room);                       // a trailhead level opens on the room CHOOSER (enterRoom handles "start")
}

// After clearing a boss, descend to the next floor: a fresh map, higher ante. Your
// kit and claimed items carry on; only death (the caravan falling) ends the run.
export function descend(room) {
  if (room.phase !== "won" || !room.levelComplete || room.runWon) return false; // the throne is the LAST floor
  // No banking: the room's value was already mirrored into every wallet on clear; unclaimed
  // loot is simply gone ("use it or lose it"). enterRoom resets room.loot for the next room.
  room.floor = (room.floor ?? 1) + 1;
  room.level = buildLevel(room.floor);
  stockLevelRooms(room);                 // pre-build every room's roster so the map can preview it
  room.levelComplete = false;
  enterRoom(room);                       // next floor also opens on a trailhead choice (enterRoom handles "start")
  return true;
}

export function advanceLevel(room, toId) {
  if (room.phase !== "won" || !room.level || room.levelComplete) return false;
  const cur = currentNode(room);
  if (!cur || !cur.links.includes(toId)) return false;
  const target = nodeById(room, toId);
  if (!target) return false;
  // Elite rooms are FREE to enter (owner 2026-06-28: the cost is on the BODY, not the fight).
  // No banking — value was mirrored to every wallet on clear; unclaimed loot is forfeited.
  cur.cleared = true;
  room.level.currentId = toId;
  enterRoom(room);
  return true;
}

// ---------------------------------------------------------------------------
// CO-OP ROOM VOTE (owner 2026-06-28): the won-screen next-room choice is a VOTE, not
// first-click-wins. Each HUMAN SEAT (a non-bot player entity — one human piloting several
// squad bodies is still ONE seat, since its bot bodies share its owner) casts a CHANGEABLE
// vote for an uncleared link; their icon rides the room they picked. When ALL seated humans
// lock in, the room with the MOST votes wins (TIES broken at random) and the party enters it
// through the existing advanceLevel path. SOLO (exactly 1 human seat) resolves INSTANTLY — a
// single vote/tap enters immediately — so the owner's solo phone playtest and the
// screenshot/loop tools (which drive solo and send {type:"advance"}) behave exactly as before.
// ---------------------------------------------------------------------------

// Human SEATS = the non-bot player entities (the squad primaries). Bot squad bodies share
// their owner's seat, so they never cast their own vote.
export const humanSeats = (room) => [...room.players.values()].filter((p) => !p.bot);

// Wipe the next-room vote/lock state — called whenever a fresh room opens (enterRoom) so a won
// screen never inherits stale votes from the room you just left.
export function resetRoomVotes(room) {
  room.roomVotes = {};
  room.roomLocks = {};
}

// Cast or CHANGE a seat's vote for the next room. Validates: the won screen is open (phase
// "won", a live level, not levelComplete), `seatId` is a real human seat, and `toId` is a
// valid uncleared link of the current node. Re-voting just moves the seat's icon. Returns
// true only if the move RESOLVED into entering a room (solo, or the final lock); false if it
// merely recorded/changed a vote.
export function voteRoom(room, seatId, toId) {
  if (room.phase !== "won" || !room.level || room.levelComplete) return false;
  const cur = currentNode(room);
  if (!cur || !cur.links.includes(toId) || !nodeById(room, toId)) return false;
  const seats = humanSeats(room);
  if (!seats.some((s) => s.id === seatId)) return false;
  (room.roomVotes ??= {})[seatId] = toId;
  // SOLO: one human seat → the vote IS the decision (first-click-wins behavior preserved).
  if (seats.length <= 1) return tallyRoomVote(room);
  return maybeResolveRoomVote(room);
}

// Lock a seat's vote in. A seat with no vote can't lock. When every human seat is locked the
// tally fires. Returns true if it resolved into entering a room.
export function lockRoom(room, seatId) {
  if (room.phase !== "won" || !room.level || room.levelComplete) return false;
  const seats = humanSeats(room);
  if (!seats.some((s) => s.id === seatId)) return false;
  if ((room.roomVotes ??= {})[seatId] == null) return false;   // nothing to lock yet
  (room.roomLocks ??= {})[seatId] = true;
  return maybeResolveRoomVote(room);
}

// Un-lock a seat (a human changes their mind before the LAST seat commits). Never enters.
export function unlockRoom(room, seatId) {
  if (room.roomLocks) delete room.roomLocks[seatId];
  return false;
}

// Fire the tally once EVERY human seat is locked in. No-op until then.
function maybeResolveRoomVote(room) {
  const seats = humanSeats(room);
  if (!seats.length) return false;
  const locks = room.roomLocks ?? {};
  if (!seats.every((s) => locks[s.id])) return false;
  return tallyRoomVote(room);
}

// Tally seat votes: the link with the MOST votes wins; a TIE is broken at random among the
// tied links. Then enter that room via advanceLevel. Only votes for STILL-VALID links count
// (a vote for a now-cleared link is ignored). advanceLevel → enterRoom wipes the votes.
function tallyRoomVote(room) {
  const cur = currentNode(room);
  if (!cur) return false;
  const votes = room.roomVotes ?? {};
  const tally = {};
  for (const seatId of Object.keys(votes)) {
    const to = votes[seatId];
    if (cur.links.includes(to)) tally[to] = (tally[to] ?? 0) + 1;
  }
  const ids = Object.keys(tally);
  if (!ids.length) return false;
  const max = Math.max(...ids.map((id) => tally[id]));
  const top = ids.filter((id) => tally[id] === max);
  const toId = top[Math.floor(Math.random() * top.length)];
  return advanceLevel(room, toId);
}

// ---------------------------------------------------------------------------
// Shop node — a VALUE-FOR-VALUE card swap (owner 2026-06-24): trade in owned cards whose summed
// value covers the ware's value to take the ware into your backpack. No gold.
// ---------------------------------------------------------------------------
// Buy a ware by trading in pay-cards. Validates: phase "shop", the ware is offered, every payKey is
// owned (by count in the backpack — duplicates spend separately), and the summed value of the
// pay-cards ≥ the ware's value. Also rejects if pulling a pay-card would drop the deckList below
// MIN_DECK. On success: remove the pay-cards from the backpack (and the deck if present, respecting
// the floor), remove the ware from the shelf, add the ware to the backpack. Returns boolean.
export function buyWare(room, player, wareKey, payKeys = []) {
  if (room.phase !== "shop" || !player || !room.shop) return false;
  const wi = (room.shop.wares ?? []).findIndex((w) => w.key === wareKey);
  if (wi < 0 || !KIT[wareKey]) return false;
  const pay = Array.isArray(payKeys) ? payKeys : [];
  if (!pay.length || !pay.every((k) => KIT[k])) return false;
  // every pay-card must be owned, counting duplicates against the backpack's multiset
  const need = {};
  for (const k of pay) need[k] = (need[k] ?? 0) + 1;
  for (const k of Object.keys(need)) if (countKey(player.backpack, k) < need[k]) return false;
  // value must cover the ware
  const wareVal = itemTreasure(wareKey);
  const paidVal = pay.reduce((s, k) => s + itemTreasure(k), 0);
  if (paidVal < wareVal) return false;
  // Tendered copies come from the SPARE stash first (owner 2026-06-24): a key's deck copies are only
  // pulled when its spares are exhausted — so spending a spare never shrinks the deck. Guard the
  // MIN_DECK floor against the pulls the payment would ACTUALLY force.
  const payCount = {}; for (const k of pay) payCount[k] = (payCount[k] ?? 0) + 1;
  let deckPulls = 0;
  for (const k of Object.keys(payCount)) {
    const spare = Math.max(0, countKey(player.backpack, k) - countKey(player.deckList, k));
    deckPulls += Math.max(0, payCount[k] - spare);   // copies that must come out of the deck
  }
  if (deckPulls > 0 && (player.deckList?.length ?? 0) - deckPulls < MIN_DECK) return false;
  // commit: remove each pay-card from the backpack; pull from the deck ONLY when the backpack can no
  // longer cover the deck's copies of that key (i.e. the spares for it have run out).
  for (const k of pay) {
    const bi = player.backpack.indexOf(k);
    if (bi >= 0) player.backpack.splice(bi, 1);
    if (countKey(player.backpack, k) < countKey(player.deckList, k)) {
      const di = (player.deckList ?? []).indexOf(k);
      if (di >= 0) player.deckList.splice(di, 1);
    }
  }
  room.shop.wares.splice(wi, 1);
  (player.backpack ??= []).push(wareKey);
  return true;
}

// Reroll the whole shelf — free now (no gold). Kept so the client's reroll button keeps working.
export function rerollShop(room, player) {
  if (room.phase !== "shop" || !room.shop || !player) return false;
  room.shop.wares = rollShopWares();
  return true;
}

// Leave the shop for a linked node — same graph move as advanceLevel, from the shop phase.
export function leaveShop(room, toId) {
  if (room.phase !== "shop" || !room.level) return false;
  const cur = currentNode(room);
  if (!cur || !cur.links.includes(toId) || !nodeById(room, toId)) return false;
  cur.cleared = true;
  room.level.currentId = toId;
  enterRoom(room);
  return true;
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Effect resolver — the SINGLE place card effects resolve, identically for heroes
// and foes. `source` is any Combatant (has .side 'hero'|'foe' and .lane). Targets
// are RELATIVE to the source: 'foe'/'target' = its front enemy, 'lane' = its lane,
// 'ally'/'self'/'caravan' = its own side. Verbs not wired yet no-op (safe by design).
// ---------------------------------------------------------------------------
export const heroesInLane = (room, lane) =>
  [...room.players.values()].filter((p) => p.alive && p.lane === lane);

// The DEPTH LINE within a lane: living heroes ordered front→back (lower `depth` = closer to
// the foes). Stable tiebreak by id so the order never jitters.
export const laneHeroes = (room, lane) =>
  heroesInLane(room, lane).sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || (a.id < b.id ? -1 : 1));

// The UNIFIED friendly line: heroes AND summon tokens together, front→back by depth
// (owner ask 2026-06-10: "I should be able to get in front of my rat — and behind it").
// New summons spawn at the FRONT (the meat-shield default); ↑/↓ walks a hero past them
// one entity at a time. THIS is the blocking order single-target foe hits resolve down.
export const laneLine = (room, lane) => [
  ...heroesInLane(room, lane),
  ...(room.allies?.[lane] ?? []).filter((t) => t.hp > 0),
].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || (String(a.id) < String(b.id) ? -1 : 1));

// Step forward (toward the foes, to block) or back one slot in the lane's UNIFIED line —
// a literal swap with the neighbor, hero or summon. Solo / front / rear edges no-op.
// Depths are renormalized to 0..n-1 first so the line is always a clean ordered stack.
export function moveDepth(room, player, dir) {
  if (!player?.alive) return;
  const line = laneLine(room, player.lane);
  line.forEach((c, i) => { c.depth = i; });           // normalize to a clean 0..n-1 line
  const i = line.indexOf(player);
  const j = dir === "fwd" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= line.length) return;     // already at the front / back
  [line[i].depth, line[j].depth] = [line[j].depth, line[i].depth];
}

// A combatant's effective attack = base + accumulated +1 counters (the ramp lever).
// Power stats. A combatant deals item/strike damage = base + matching Power.
// Physical Power is ramped by `counters` (the "gains +1 attack" passives).
// Stat bonus from WORN passive items (Trusty Blade=+phys, Trusty Staff=+mag). Symmetric: a player
// reads `inv`, a foe reads `equipment` — same shape as itemDmgReduce.
export function itemStatBonus(c, stat) {
  const gear = c?.inv ?? c?.equipment ?? [];
  return gear.reduce((s, it) => s + (it?.spent ? 0 : (KIT[it.key]?.passive?.[stat] ?? 0)), 0);
}
export const effPhys = (c) => (c.phys ?? c.atk ?? 0) + (c.counters ?? 0) + itemStatBonus(c, "phys") + buffAmt(c, "power") + buffAmt(c, "swordPower");
export const effMag  = (c) => (c.mag ?? 0) + itemStatBonus(c, "mag") + buffAmt(c, "power");
// Magical (staff) Power; a body with `swordFeedsStaff` (Runeblade) adds its sword Power to staff too.
export const powerFor = (c, school) => {
  if (school === "magical") return effMag(c) + (BODIES[c.bodyKey]?.swordFeedsStaff ? effPhys(c) : 0);
  if (school === "physical") return effPhys(c);
  return 0;
};
export const effAtk = effPhys; // legacy alias (snapshot label / older callers)

// A hit aimed at the hero side of a lane: lane shield absorbs first, then the front
// defender, else the caravan. Shared by foe body-attacks AND foe 'deal' effects.
// Spend a combatant's shield buffer first; returns the leftover damage that reaches real HP.
// Per-body shields (Big Shield / Trusty Shield) replaced the old per-lane shield entirely.
export function absorbShield(c, dmg) {
  if (!c || dmg <= 0 || !(c.shield > 0)) return dmg;
  const used = Math.min(c.shield, dmg);
  c.shield -= used;
  return dmg - used;
}
// AURA TOKENS (V2 §4.2): a standing summon can carry `aura: { dmgBonus?, dmgReduce? }`,
// lane-scoped and SIDE-scoped (a foe Totem protects foes — fully symmetric). The same aura
// type does NOT stack: the strongest standing token applies. A token is NOT covered by its
// OWN aura (else a −1 totem is unkillable by chip damage); other tokens' auras do cover it.
export function laneAura(room, c, kind) {
  if (!c || c.lane == null) return 0;
  const arr = c.side === "foe" ? (room.lanes?.[c.lane] ?? []) : (room.allies?.[c.lane] ?? []);
  let best = 0;
  for (const t of arr) {
    if (t === c || !(t.hp > 0)) continue;
    const a = BODIES[t.bodyKey]?.aura?.[kind] ?? 0;
    if (a > best) best = a;
  }
  return best;
}

// V2 §4.8, GENERALIZED: a body with `accel: { on, amount }` ADDS charge to its own
// `every:N` clock(s) whenever its trigger fires — `on:"damaged"` (Atlas, Fat Cat) or
// `on:"sword"/"staff"` (Paid Piper / Royal Rat speed their summon bar by resolving items).
// The boost is scaled by the same multipliers as the clock thresholds so it's
// proportionally identical at any global speed (the landmine: clocks must ride _cdMult).
export function accelClocks(c, trigger) {
  const ac = BODIES[c.bodyKey]?.accel;
  if (!ac || ac.on !== trigger) return;
  const pas = BODIES[c.bodyKey]?.passive ?? [];
  // moxie world (owner 2026-06-21): for a card-CASTER, "shave time off the clock" becomes "add
  // progress toward the next cast" — the accel bumps the moxie-spent accumulator (flushed by the
  // next spendTriggerPassives). Summons/tokens keep the literal time-clock bump.
  if (isCaster(c)) {
    const bump = Math.max(1, Math.round((ac.amount ?? 10) / 10));
    c.pspend = c.pspend || {};
    pas.forEach((p, pi) => { if (p.every) c.pspend[pi] = (c.pspend[pi] ?? 0) + bump; });
  } else {
    c.pcharge = c.pcharge || {};
    pas.forEach((p, pi) => { if (p.every) c.pcharge[pi] = (c.pcharge[pi] ?? 0) + (ac.amount ?? 10) * (c.cdMul ?? 1); });
  }
}

// THORNS (V2 §4.6, Spikes): a struck defender spikes its attacker back for a flat N.
// Fires on DIRECT hits only (single-target strikes through the blocking line), never on
// lane AoE, and the reflection itself carries NO attacker — so chains can't recurse.
function reflectThorns(room, victim, attacker) {
  const n = victim?.thorns ?? 0;
  if (!(n > 0) || !attacker || attacker === victim) return;
  if (attacker.side === "foe") {
    damageEnemy(room, attacker.lane | 0, attacker, n);
  } else if (attacker.id != null && room.players?.has?.(attacker.id)) {
    damagePlayer(room, attacker, n);
  } else {
    // an ally summon token: direct chip, removed when it falls
    attacker.hp -= n;
    const lane = room.allies?.[attacker.lane | 0];
    const i = lane ? lane.indexOf(attacker) : -1;
    if (attacker.hp <= 0 && i >= 0) lane.splice(i, 1);
  }
}

// Damage one ally summon token (shield → aura reduce → HP), with on-damaged symmetry.
// Returns the amount that got past the aura (what "landed" for lifesteal purposes).
function hurtAllyToken(room, li, al, dmg, attacker = null) {
  al.lane = li; al.side = "hero";
  dmg -= laneAura(room, al, "dmgReduce");
  if (dmg <= 0) return 0;
  const landed = dmg;
  dmg = absorbShield(al, dmg);
  if (dmg > 0) {
    al.hp -= dmg;
    if (al.hp <= 0) { const i = room.allies[li].indexOf(al); if (i >= 0) room.allies[li].splice(i, 1); }
    else { if (al.ratStack) syncRatStack(al); runPassive(room, al, "damaged"); accelClocks(al, "damaged"); }
  }
  reflectThorns(room, al, attacker);
  return landed;
}

// BREACH (owner spec 2026-06-27, replaces the caravan damage-sink): the NEAREST lane to `from`
// that has ANY defender — a player body OR a summon token — in its unified line. A foe whose own
// lane is empty FOLLOWS THE BODIES instead of whiffing into a (now-deleted) caravan. Returns the
// lane index, or -1 when the WHOLE board is undefended (no bodies, no summons anywhere → the party
// has already lost). Equidistant lanes tie to the LOWER index (flag: left-bias on a tie).
export function nearestDefendedLane(room, from = 0) {
  const n = room.laneCount ?? room.lanes.length;
  for (let d = 0; d < n; d++) {
    for (const li of (d === 0 ? [from] : [from - d, from + d])) {
      if (li < 0 || li >= n) continue;
      if (laneLine(room, li).length) return li;
    }
  }
  return -1;
}

// A combatant's effective HP for the ranged-snipe pick = HP + shield.
const effHpOf = (c) => (c?.hp ?? 0) + (c?.shield ?? 0);
// RANGED foe targeting (owner spec 2026-06-27): the single LOWEST effective-HP (hp+shield) PLAYER
// across ALL lanes — a cross-lane snipe that NEVER targets a summon (summons only BLOCK melee).
// Ties among equal-lowest resolve to the NEAREST player (smaller lane-distance to `fromLane`, then
// lower lane index). Returns null when no player is alive anywhere (a lone summon survives the run).
export function lowestEHpPlayer(room, fromLane = 0) {
  let best = null;
  for (const p of room.players.values()) {
    if (!p.alive) continue;
    if (best === null) { best = p; continue; }
    const a = effHpOf(p), b = effHpOf(best);
    if (a < b) { best = p; continue; }
    if (a === b) {
      const da = Math.abs((p.lane ?? 0) - (fromLane ?? 0));
      const db = Math.abs((best.lane ?? 0) - (fromLane ?? 0));
      if (da < db || (da === db && (p.lane ?? 0) < (best.lane ?? 0))) best = p;
    }
  }
  return best;
}

// A foe's RANGED deal: snipe the weakest player anywhere (lowestEHpPlayer), never a summon. Returns
// the damage that LANDED (Darkness lifesteals off this). No player alive → whiffs (returns 0).
export function foeHitRanged(room, dmg, attacker = null) {
  if (dmg <= 0) return 0;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");
  const t = lowestEHpPlayer(room, attacker?.lane ?? 0);
  if (!t) return 0;
  const landed = damagePlayer(room, t, dmg);
  reflectThorns(room, t, attacker);
  return landed;
}

// A foe's single-target MELEE hit on the hero side of a lane. The FRONT of the lane's UNIFIED
// line (heroes and summons interleaved by depth) blocks. An empty lane BREACHES to the nearest
// defended lane (`redirect`, the default) and hits the front there — never the old caravan; a
// per-lane chip (dealEachLane) passes `redirect=false` so it just hits its own lane's front or
// nobody. Returns the damage that LANDED (past auras/armor, into shield+HP — Darkness lifesteals).
export function foeHitLane(room, li, dmg, attacker = null, redirect = true) {
  if (dmg <= 0) return 0;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");   // foe-side Flag/Knight
  let front = laneLine(room, li)[0];
  if (!front) {
    if (!redirect) return 0;                                   // per-lane chip into an empty lane: hits nobody (no caravan)
    const rl = nearestDefendedLane(room, li);                  // BREACH: follow the bodies, never whiff
    if (rl < 0) return 0;                                      // whole board undefended → the party already lost
    li = rl; front = laneLine(room, li)[0];
  }
  if (room.players?.has?.(front.id)) {
    const landed = damagePlayer(room, front, dmg);
    reflectThorns(room, front, attacker);
    return landed;
  }
  return hurtAllyToken(room, li, front, dmg, attacker);
}

// Spear, foe side (V2 §4.9): the front TWO of the unified line each take the full hit; an empty
// lane BREACHES to the nearest defended lane (follow the bodies; no caravan).
export function foeHitFront2(room, li, dmg, attacker = null) {
  if (dmg <= 0) return;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");
  let line = laneLine(room, li);
  if (!line.length) {
    const rl = nearestDefendedLane(room, li);
    if (rl < 0) return;
    li = rl; line = laneLine(room, li);
  }
  for (const v of line.slice(0, 2)) {
    if (room.players?.has?.(v.id)) { damagePlayer(room, v, dmg); reflectThorns(room, v, attacker); }
    else hurtAllyToken(room, li, v, dmg, attacker);
  }
}

// A foe's lane-AoE (Lightning): hits EVERY hero and EVERY friendly summon in the lane — the mirror
// of a player's `target:"lane"` deal hitting every foe in a lane. Nobody blocks for anybody (that's
// the point of AoE) and thorns don't fire (no single "striker" contact). An empty lane simply hits
// NOBODY now (no caravan; an area with no occupants does no damage — this also keeps an Atlas shrug
// literal to "his whole lane"). Auras still apply per victim.
export function foeHitLaneAll(room, li, dmg, attacker = null) {
  if (dmg <= 0) return;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");
  const allies = [...(room.allies[li] ?? [])];
  const heroes = laneHeroes(room, li);
  for (const al of allies) {
    al.lane = li; al.side = "hero";
    const cut = dmg - laneAura(room, al, "dmgReduce");
    if (cut <= 0) continue;
    const left = absorbShield(al, cut);
    if (left <= 0) continue;
    al.hp -= left;
    if (al.hp <= 0) { const i = room.allies[li].indexOf(al); if (i >= 0) room.allies[li].splice(i, 1); }
    else { if (al.ratStack) syncRatStack(al); runPassive(room, al, "damaged"); accelClocks(al, "damaged"); }
  }
  for (const p of heroes) damagePlayer(room, p, dmg);
}

// ATLAS, SHRUGGING (owner spec 2026-06-27) — the elite's 1:1 SYMMETRIC reflect. A damage-TAKEN
// accumulator (`atlasClock`): every ATLAS_REFLECT_PER CUMULATIVE damage Atlas TAKES, he SHRUGS, dealing
// ATLAS_REFLECT_HIT to ALL OPPOSING combatants in his lane. foe-Atlas → every hero + ally summon in his
// lane (empty lane → the caravan); player-Atlas → every foe (+ the back-line boss) in his lane. Fed the
// GROSS landed damage from damagePlayer/damageEnemy (shielded damage counts, like the other on-damaged
// clocks). A room-level re-entrancy guard stops a shrug's own AoE from cascading another shrug.
export const ATLAS_REFLECT_PER = 10;   // every N CUMULATIVE damage Atlas TAKES… (tunable)
export const ATLAS_REFLECT_HIT = 10;   // …he deals N to ALL OPPOSING combatants in his lane (tunable)
export function atlasReflect(room, c, landed) {
  if (!room || !BODIES[c?.bodyKey]?.atlasReflect || !(landed > 0)) return;
  if (room._inShrug) return;                              // a shrug's AoE never re-triggers a shrug (anti-cascade)
  c.atlasClock = (c.atlasClock ?? 0) + landed;
  if (c.atlasClock < ATLAS_REFLECT_PER) return;
  room._inShrug = true;
  try {
    while (c.atlasClock >= ATLAS_REFLECT_PER) {
      c.atlasClock -= ATLAS_REFLECT_PER;
      const li = c.lane | 0;
      clog(room, "  ⚛ " + logNm(c) + " SHRUGS — " + ATLAS_REFLECT_HIT + " to his whole lane");
      if (c.side === "foe") {
        foeHitLaneAll(room, li, ATLAS_REFLECT_HIT, c);    // → every hero + ally summon (empty → caravan)
      } else {
        for (const e of [...(room.lanes?.[li] ?? [])]) damageEnemy(room, li, e, ATLAS_REFLECT_HIT, c);
        if (bossAlive(room)) damageEnemy(room, li, room.boss, ATLAS_REFLECT_HIT, c);  // the back-line boss too
      }
    }
  } finally { room._inShrug = false; }
}

// Ops that actually damage the hero side of a foe's lane (vs. heal/summon/ramp/move).
const FOE_DMG_OPS = new Set(["deal", "dealEachLane", "attack", "schoolStrike"]);
const opsHarm = (ops) => (ops ?? []).some((o) => FOE_DMG_OPS.has(o.do));
export const PASSIVE_BAR_COLOR = "#ff9ed2"; // the hue for a body's innate DAMAGING clock
// A short label for a body-timer bar. Damaging clocks read "✦N"; non-damaging timers (summon/heal)
// read with their own icon so a Royal Rat / Wageslave bar is legible at a glance.
function timerLabel(e, ops) {
  const harm = (ops ?? []).find((x) => FOE_DMG_OPS.has(x.do));
  if (harm) {
    if (harm.do === "dealEachLane") return "✦all";
    if (harm.do === "attack") return "✦" + effAtk(e);
    if (harm.do === "schoolStrike") return "✦" + powerFor(e, harm.school);
    return "✦" + ((harm.amount ?? 0) + (e.counters ?? 0));
  }
  const o = (ops ?? [])[0] ?? {};
  if (o.do === "summon") return "🐀" + (o.count ?? 1);
  if (o.do === "healSelf" || o.do === "heal") return "♥" + (o.amount ?? 0);
  if (o.do === "counter") return "▲" + (o.amount ?? 0);
  return "✦";
}
// Hue for a non-damaging timer bar (so it doesn't read as incoming damage).
function nonHarmColor(ops) {
  const o = (ops ?? [])[0] ?? {};
  if (o.do === "summon") return "#b8a3c9";                 // rat-purple
  if (o.do === "healSelf" || o.do === "heal") return "#74e69a"; // heal-green
  return "#8a93a3";                                        // neutral grey
}

// EVERY incoming-damage clock a foe runs, as an array of bars (one per source) — so a foe
// carrying two items, or an item PLUS a damaging passive, shows two color-coded bars. Each:
//   { kind:"item"|"passive", key?, label, color, frac (0..1), cd (ticks) }
// A foe attacks on three kinds of independent clock — its body timer (hourglass passives),
// each gear item, and any self-timed (`every:N`) passive — and only the DAMAGING ones go in
// here (a worn Aegis has no clock, so no bar; it shows as a 🛡 badge instead). Order is stable
// (passives, then gear in slot order) so bars don't jump around frame to frame.
// The hit a foe 'deal' op lands RIGHT NOW — the resolver AND the snapshot's threat-bar
// damage preview both call this, so the number printed on the bar can never lie.
export function foeDealHit(room, source, op, school, kind = null) {
  // Gang Up, foe side: +N per OTHER foe in its lane
  const pals = op.perAlly ? op.perAlly * Math.max(0, (room.lanes[source.lane]?.length ?? 1) - 1) : 0;
  const pwr = school ? powerFor(source, school) * (op.mult ?? 1) : 0;
  const ctr = school === "physical" ? 0 : kindBonusOf(source, kindForOp(op, kind)); // melee→🗡 / ranged→🎯 bonus (generic counters lifts both)
  const shd = op.ofShield ? (source.shield ?? 0) : 0;             // Shield Bash: deal = current shield
  let hit = Math.round(((op.amount ?? 0) + pals + pwr + ctr + shd) * (source.dmgMul ?? 1));
  if (hasBuff(source, "weakness")) hit = Math.ceil(hit / 2);   // Weakness (owner 2026-06-27): the weakened attacker deals half, round up
  if (school && hit < 1) hit = 1; // a weapon always lands ≥1, even on the wrong body
  return hit;
}
// What a foe clock will deal to the hero side when its bar fills — the sum of its ops'
// hits by the resolver's own math. AoE ops report the PER-TARGET hit (the label/text
// already says it's a lane/board hit). 0 = the clock doesn't damage (heal/summon bars).
export function foeOpsDmg(room, e, ops, school = null) {
  const dm = (x) => Math.round(x * (e.dmgMul ?? 1));
  let total = 0;
  for (const op of ops ?? []) {
    if (op.do === "deal") total += foeDealHit(room, e, op, school);
    else if (op.do === "schoolStrike") total += dm(powerFor(e, op.school));
    else if (op.do === "dealEachLane") total += dm((op.amount ?? 0) + (e.counters ?? 0));
    else if (op.do === "attack") total += dm(effAtk(e));
  }
  return total;
}
// Item version: an ARMED echo body resolves a matching-school item's ops TWICE — the
// preview doubles only while the charge is lit, so the bar number can never lie.
export const foeItemDmg = (room, e, key) => {
  const item = KIT[key];
  if (!item?.ops) return 0;
  const times = item.type && BODIES[e.bodyKey]?.echo === item.type && e.echoArmed ? 2 : 1;
  return foeOpsDmg(room, e, item.ops, item.type) * times;
};

export function foeThreats(room, e) {
  const body = BODIES[e.bodyKey] || {};
  const cdMul = e.cdMul ?? 1;
  const out = [];
  const frac = (charge, cd) => Math.min(1, (charge ?? 0) / cd);
  const pas = body.passive ?? [];
  const pc = e.pcharge || {};
  // EVERY body TIMER (damaging or not) gets a bar — damaging ones are pink/threat-colored, summon/
  // heal timers a neutral hue (`harm:false`) so a Royal Rat / Wageslave clock is visible but doesn't
  // read as incoming damage. Triggers (on sword/staff/damaged) are NOT bars — they ship as `tags`.
  pas.forEach((p, pi) => {
    const isTimer = p.every || p.on === "hourglass";
    if (!isTimer) return;
    const cd = (p.every ? p.every : body.cd) * cdMul;
    if (!cd) return;                                       // cd:0 bodies have no hourglass clock
    const charge = p.every ? pc[pi] : e.charge;
    const harm = opsHarm(p.ops);
    out.push({ kind: "passive", harm, label: timerLabel(e, p.ops),
      dmg: harm ? foeOpsDmg(room, e, p.ops) : 0,           // the bar says how hard it hits
      color: harm ? PASSIVE_BAR_COLOR : nonHarmColor(p.ops), frac: frac(charge, cd), cd: Math.round(cd) });
  });
  // CARD-CAST telegraph (owner 2026-06-24): foes attack by spending moxie on their FRONT queue card,
  // not on item cooldowns — so the next attack is that front card. Show it as a bar: the fill = moxie
  // progress toward affording it, the number = the hit it'll land, and the countdown = seconds of
  // moxie regen left (1/sec). Players have a HAND, not a queue, so this only fires for foes. (The
  // worn `equipment` list no longer cooldown-fires — it's kept only for passive-stat reads, so it
  // gets no bar; its DR still shows as the 🛡 badge.)
  const fq = (e.queue ?? [])[0];
  if (fq && KIT[fq.key]?.ops) {
    const item = KIT[fq.key];
    const cost = Math.max(1, cardCost(fq.key, body));
    const harm = opsHarm(item.ops);
    out.push({ kind: "cast", harm, key: fq.key, label: item.name ?? fq.key,
      dmg: harm ? foeOpsDmg(room, e, item.ops, item.type) : 0,
      color: item.color ?? "#ccd", frac: Math.min(1, (e.moxie ?? 0) / cost), cd: cost * 10 });
  }
  // the ECHO bar (echo bodies, owner redesign 2026-06-12): charges toward the double,
  // pushed back by the wearer's own uses. Shows for foes AND for the player's own body line.
  if (body.echo) {
    const ecd = Math.round(ECHO_CD * cdMul);
    out.push({ kind: "echo", harm: false, dmg: 0, color: "#9ad0e6", cd: ecd,
      label: e.echoArmed ? "🔁 echo ARMED" : e.echoReady ? "🔁 echo READY" : "🔁 echo",
      frac: e.echoArmed || e.echoReady ? 1 : frac(e.echoCharge ?? 0, ecd) });
  }
  // BOSS CLOCKS (V2 bosses): every mechanic clock gets a labeled bar; the damaging ones
  // (the Djinn's all-lanes scorch) carry the resolver's own number via `dmg`.
  for (const k of e.clocks ?? []) {
    out.push({ kind: "clock", harm: (k.dmg ?? 0) > 0, label: k.label ?? k.kind, dmg: k.dmg ?? 0,
      color: k.color ?? "#8a93a3", frac: frac(k.charge, k.cd), cd: k.cd });
  }
  return out;
}

// The SOONEST INCOMING DAMAGE from a foe, as { frac, cd } — drives the card's border heat + AoE
// alarm, so it only considers DAMAGING clocks (a healer/summoner shouldn't glow red). Null = none.
export function foeThreat(room, e) {
  const bars = foeThreats(room, e).filter((b) => b.harm);
  if (!bars.length) return null;
  const soonest = bars.reduce((a, b) => (b.frac > a.frac ? b : a));
  return { frac: soonest.frac, cd: soonest.cd };
}

// A foe's TRIGGER passives, as short ⚡ tags (no clock → no bar). Surfaces "when I sword/staff/take
// damage" effects that were previously invisible. Symmetric — used for the player's body line too.
export function bodyTags(bodyKey) {
  const out = [];
  for (const p of BODIES[bodyKey]?.passive ?? []) {
    if (p.on === "sword") out.push("⚡ on sword");
    else if (p.on === "staff") out.push("⚡ on staff");
    else if (p.on === "damaged") out.push(opsHarm(p.ops) ? "⚡ counter" : "⚡ when hit");
    // school-free trigger clocks (owner 2026-06-23) — event-driven, no time bar, so they ship as tags
    else if (p.hit != null) out.push(`⚡ per ${p.hit} hp lost`);
    else if (p.spend != null) out.push(`⚡ per ${p.spend} moxie`);
    else if (p.play != null) out.push(`⚡ per ${p.play} cards`);
    else if (p.dealtMelee != null) out.push(`⚡ per ${p.dealtMelee} melee dealt`);
    else if (p.dealtRanged != null) out.push(`⚡ per ${p.dealtRanged} ranged dealt`);
    else if (p.pairMR) out.push("⚡ melee + ranged");
  }
  const cs = BODIES[bodyKey]?.combatStart; // open-of-fight grants (Malevolent Mouse / Golden Golem / Centaur)
  if (cs?.counters) out.push(`✦ +${cs.counters} dmg at start`);
  if (cs?.shield) out.push(`🛡 +${cs.shield} at start`);
  if (cs?.doubleNext) out.push("🔁 first card doubled");
  const ac = BODIES[bodyKey]?.accel; // the clock speed-up (Royal Rat / Fat Cat / Atlas)
  if (ac) out.push(`⏩ −${(ac.amount ?? 10) / 10}s ${ac.on === "damaged" ? "when hit" : "on " + ac.on}`);
  return out;
}

// The foe a player is currently aiming at, if it still exists. { foe, lane } or null.
// Aiming at the BACK-LINE boss attributes the hit to the ATTACKER's lane — "the lane the
// damaging source comes from" is a first-class fact (Hydra consumes it).
export function targetedFoe(room, player) {
  if (!player.targetId) return null;
  if (bossAlive(room) && player.targetId === room.boss.id)
    return { foe: room.boss, lane: player.lane };
  for (let i = 0; i < room.laneCount; i++) {
    const f = room.lanes[i].find((e) => e.id === player.targetId);
    if (f) return { foe: f, lane: i };
  }
  return null;
}

// Resolve an item's foe target (owner ruling 2026-06-10: melee NEVER reaches sideways).
//  'pick'  = RANGED: your aimed foe anywhere on the board (falls back to your lane's front).
//  'front' = MELEE: the front foe of YOUR OWN lane, no matter where the reticle points —
//            hitting something two lanes away with a sword is silly.
// The BACK-LINE boss is the lane's back wall: melee reaches it only when the lane has no
// foes in front (lane-blocking summons — heads, tentacles — re-wall the lane); ranged can
// always aim at it via 'pick'.
export function aimedFoe(room, player, kind) {
  if (kind === "pick") {
    const t = targetedFoe(room, player);
    if (t) return t;
  }
  const arr = room.lanes[player.lane];
  if (arr[0]) return { foe: arr[0], lane: player.lane };
  return bossAlive(room) ? { foe: room.boss, lane: player.lane } : null;
}

export function setTarget(room, player, foeId) {
  player.targetId = foeId; // validity is checked at resolve time
}

// V2 §4.1 — the ALLY-target slot, beside the foe slot. Click a foe → foe-target; click an
// ally → ally-target. Support items (Heal) read ONLY this; offense reads ONLY targetId.
export function setAllyTarget(room, player, allyId) {
  player.allyTargetId = allyId; // validity checked at resolve time (dead/gone → fallback)
}

// Flat list of all foes (lane order, front-first; the back-line boss last) — Tab cycling
// and the aim fallback both walk this, so the boss is always targetable.
const allFoes = (room) => [
  ...room.lanes.flatMap((arr, i) => arr.map((e) => ({ foe: e, lane: i }))),
  ...(bossAlive(room) ? [{ foe: room.boss, lane: 0 }] : []),
];

// Tab through targets in order (dir +1/-1).
export function cycleTarget(room, player, dir = 1) {
  const foes = allFoes(room);
  if (!foes.length) { player.targetId = null; return; }
  const idx = foes.findIndex((x) => x.foe.id === player.targetId);
  const next = idx < 0 ? 0 : (idx + dir + foes.length) % foes.length;
  player.targetId = foes[next].foe.id;
}

// Every player always has a valid aim during combat (default = a foe in their lane).
export function ensureTarget(room, player) {
  if (targetedFoe(room, player)) return;
  const own = room.lanes[player.lane];
  if (own[0]) { player.targetId = own[0].id; return; }
  const foes = allFoes(room);
  player.targetId = foes.length ? foes[0].foe.id : null;
}

// Summon `count` bodies into the source's lane — on the SOURCE's side. A foe summons
// foes; a hero (or friendly summon) summons allies. The symmetric reinforcement verb.
export function summonBodies(room, source, op) {
  // A summon of a DELETED body (e.g. King Mimic's old court, pre-boss-slice) must spawn
  // nothing — an unknown key would enter as a 0-HP ghost that still counts for foeCount,
  // holding the King's ward up off an invisible court.
  if (!BODIES[op.body]) return;
  const baseLane = Math.max(0, Math.min(room.laneCount - 1, source.lane | 0));
  const isRat = RAT_KEYS.has(op.body);   // RATS ONLY merge (rat/largeRat) — knights/totems never do
  for (let k = 0; k < (op.count ?? 1); k++) {
    const li = op.lane != null ? Math.max(0, Math.min(room.laneCount - 1, op.lane | 0)) : baseLane;
    const into = source.side === "hero" ? room.allies[li] : room.lanes[li];
    // RAT-MERGE (owner spec 2026-06-27): a rat summoned into a lane that ALREADY holds a rat-stack of
    // the SAME body on this side folds into it — +1 rat (HP and bite), renamed "N rats", killed as
    // ONE HP pool. `rat` and `largeRat` keep separate stacks (see syncRatStack).
    if (isRat) {
      const stack = into.find((t) => t.ratStack && t.bodyKey === op.body && t.side === source.side && t.hp > 0);
      if (stack) { stack.hp += (RAT_UNIT[op.body]?.hp ?? 1); syncRatStack(stack); continue; }
      const seed = spawnEnemy(op.body);
      seed.side = source.side; seed.lane = li; seed.ratStack = true; syncRatStack(seed);
      if (source.side === "hero") {
        const d = source.depth ?? (laneLine(room, li)[0]?.depth ?? 0);
        seed.depth = d + (source.summonSide === "back" ? 0.5 : -0.5);
      }
      into.push(seed);
      continue;
    }
    const tok = spawnEnemy(op.body, op.gear ?? []); // `summonArmed` passes gear → a real threatening court
    tok.side = source.side; tok.lane = li;
    if (source.side === "hero") {
      // RELATIVE placement (owner 2026-06-12): your summons enter just in FRONT of you
      // (meat-shield, the default) or just BEHIND you (player toggle `summonSide`).
      // Fractional depth slots the token between neighbors; the next moveDepth
      // normalization cleans the line back to integers.
      const d = source.depth ?? (laneLine(room, li)[0]?.depth ?? 0);
      tok.depth = d + (source.summonSide === "back" ? 0.5 : -0.5);
    }
    into.push(tok);
  }
  clog(room, "  ✦ " + logNm(source) + " summons " + (op.count ?? 1) + "× " + (BODIES[op.body]?.name ?? op.body));
}

// RAT-STACK MODEL (owner spec 2026-06-27): a rat-stack is ONE entity holding N rats, killed as a
// single HP pool — HP = N×unitHP, bite = N×unitBite, named "N rats". `rat` and `largeRat` keep their
// OWN identity and form SEPARATE stacks (a rat never folds into a large-rat stack — different
// creature, different per-unit stats). Bite scales via `counters`: a `rat` casts tBite (deal 1 +
// counters); a `largeRat` swings its attack (effAtk = phys + counters). For the default `rat`
// (unitHP 1, unitBite 1) this is exactly the owner's law: HP = count = bite. Rats are HP-knob-exempt.
// FLAG: per-unit stats are these named tunables; cross-body merging is intentionally OFF.
export const RAT_KEYS = new Set(["rat", "largeRat"]);
const RAT_UNIT = { rat: { hp: 1, bite: 1 }, largeRat: { hp: 3, bite: 2 } };
// Re-derive a stack's count/HP-cap/bite/name from its live HP. Whole units only (ceil), so a stack
// downgrades a rat at a time as it bleeds (3 rats 3hp → take 1 → "2 rats" bite 2; dies at 0).
export function syncRatStack(s) {
  if (!s?.ratStack) return;
  const u = RAT_UNIT[s.bodyKey] ?? RAT_UNIT.rat;
  if (s.hp < 0) s.hp = 0;
  const n = Math.max(0, Math.ceil(s.hp / u.hp));
  s.ratCount = n;
  s.maxHp = Math.max(u.hp, n * u.hp);                 // ≥ one unit for HP-bar math; n=0 → splice removes it
  s.counters = Math.max(0, (n - 1) * u.bite);         // the other (n−1) units' bite, carried on the attack
  s.name = n > 1 ? n + " " + (s.bodyKey === "largeRat" ? "large rats" : "rats") : (BODIES[s.bodyKey]?.name ?? "Rat");
}

// Fire a body's passive for a given trigger ("hourglass" = its timer, "damaged" = on hit).
export function runPassive(room, combatant, trigger) {
  const passive = BODIES[combatant.bodyKey]?.passive;
  if (!passive) return;
  // `every:N` passives run on their OWN clock (see simulateTick), never on triggers.
  const ops = passive.filter((x) => x.on === trigger && !x.every).flatMap((x) => x.ops);
  if (ops.length) resolveOps(room, combatant, ops);
}

// Fire a combatant's school-keyed triggers ("when I sword / when I staff") after a matching-icon
// item OR a schoolStrike resolves. physical→"sword", magical→"staff". Symmetric (players + foes).
// Also feeds school-keyed `accel` clocks (Royal Rat / Paid Piper summon-bar speed-ups).
export function fireSchoolTrigger(room, source, type) {
  const trig = type === "physical" ? "sword" : type === "magical" ? "staff" : null;
  if (!trig) return;
  runPassive(room, source, trig);
  accelClocks(source, trig);
}

// A card-CASTER drives its `every:N` body passives off MOXIE SPENT (see spendTriggerPassives), not
// time — so those clocks pause here. A SUMMON/token (no hand, no queue) has no moxie, so it keeps
// the original time clock below (a summoned rat still attacks every 4s).
const isCaster = (c) => Array.isArray(c?.hand) || (c?.queue?.length > 0);

// TIME clocks for non-casters only: each `every:N` passive runs on its own tick clock (`pcharge`).
export function tickOwnTimers(room, c) {
  if (isCaster(c)) return;                 // casters use moxie-spent triggers instead (owner 2026-06-21)
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas) return;
  c.pcharge = c.pcharge || {};
  for (let pi = 0; pi < pas.length; pi++) {
    if (!pas[pi].every) continue;
    c.pcharge[pi] = (c.pcharge[pi] ?? 0) + 1;
    if (c.pcharge[pi] >= pas[pi].every * (c.cdMul ?? 1)) { c.pcharge[pi] = 0; resolveOps(room, c, pas[pi].ops); }
  }
}

// CARD/BODY TIMED EFFECTS (owner 2026-06-27): room-aware "every N ticks → ops" that ALSO works for casters
// (tickOwnTimers skips them). Runs `c.timers` (card-granted: Animated Blade, Pet Leech) for any combatant,
// plus body `every:N` passives for CASTERS (non-casters get those via tickOwnTimers — no double-fire).
export function tickTimers(room, c, lane) {
  if (lane != null) c.lane = lane;
  if (c.timers?.length) for (const tm of c.timers) {
    if (++tm.charge >= tm.period * (c.cdMul ?? 1)) { tm.charge = 0; resolveOps(room, c, tm.ops); }
  }
  if (!isCaster(c)) return;
  const pas = BODIES[c.bodyKey]?.passive; if (!pas) return;
  c.pcharge = c.pcharge || {};
  for (let pi = 0; pi < pas.length; pi++) {
    if (!pas[pi].every) continue;
    c.pcharge[pi] = (c.pcharge[pi] ?? 0) + 1;
    if (c.pcharge[pi] >= pas[pi].every * (c.cdMul ?? 1)) { c.pcharge[pi] = 0; resolveOps(room, c, pas[pi].ops); }
  }
}

// Advance clock-passive `pi` by `amt`; each time it crosses `need`, fire its ops (with the passive's
// own school, so a "deal staff" passive scales with staff Power). Shared by moxie-spend AND damage.
function advancePassive(room, c, pi, p, amt, need) {
  c.pspend = c.pspend || {};
  c.pspend[pi] = (c.pspend[pi] ?? 0) + amt;
  while (c.pspend[pi] >= need) { c.pspend[pi] -= need; resolveOps(room, c, p.ops, p.school || null); }
}
// MOXIE-SPENT body passives (owner 2026-06-21):
//   {spend:N, school?}  — fires per N moxie spent (optionally only on that school's cards)
//   {spendOrHit:N}      — same clock is ALSO fed by damage taken (hitTriggerPassives) = the tank ramp
//   {every:N}           — legacy tick→moxie clock (need = round(N/10))
// `school` is the cast card's type (physical/magical) so a {spend, school} clock only counts its school.
export function spendTriggerPassives(room, c, spent, school = null) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas || !(spent > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) {
    const p = pas[pi];
    if (p.spend != null)           { if (p.school && p.school !== school) continue; advancePassive(room, c, pi, p, spent, p.spend); }
    else if (p.spendOrHit != null) advancePassive(room, c, pi, p, spent, p.spendOrHit);
    else if (p.every)              advancePassive(room, c, pi, p, spent, Math.max(1, Math.round(p.every / 10)));
  }
}
// DAMAGE-TAKEN body clocks: {spendOrHit:N} (the legacy bruiser ramp, fed by spend OR hit) AND
// {hit:N} (owner 2026-06-23 school-free set — fed ONLY by damage taken: Fat Cat summon, Market-Crash
// Minotaur counter-strike, Bond Behemoth +1). Symmetric — players (damagePlayer) and foes (damageEnemy).
export function hitTriggerPassives(room, c, dmg) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas || !(dmg > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) {
    if (pas[pi].spendOrHit != null) advancePassive(room, c, pi, pas[pi], dmg, pas[pi].spendOrHit);
    else if (pas[pi].hit != null)   advancePassive(room, c, pi, pas[pi], dmg, pas[pi].hit);
  }
}

// PER-CARD-PLAYED body clocks (owner 2026-06-23 school-free set): {play:N} fires every N cards cast
// (Paid Piper summon, Crypto-Chimera lane chip, Weary Wageslave melee); {pairMR} fires once a melee
// AND a ranged card have both been played, then re-arms. Called once per card by playCard/foeCast with
// the card's TWO-BUCKET triggerKind ranged-ness (not-melee = ranged, so utility satisfies the ranged
// half). Symmetric (players + foes). NOTE: no body wears pairMR after the 2026-06-28 Runeblade rework —
// the machinery stays for reuse (owner: flagged as currently unused).
export function playTriggerPassives(room, c, ranged) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas) return;
  for (let pi = 0; pi < pas.length; pi++) {
    const p = pas[pi];
    if (p.play != null) advancePassive(room, c, pi, p, 1, p.play);
    else if (p.pairMR) {
      c.pair = c.pair || {};
      if (ranged) c.pair.ranged = true; else c.pair.melee = true;
      if (c.pair.melee && c.pair.ranged) { c.pair.melee = c.pair.ranged = false; resolveOps(room, c, p.ops, p.school || null); }
    }
  }
}

// PER-DAMAGE-DEALT body clocks (owner 2026-06-23 school-free set): {dealtMelee:N}/{dealtRanged:N}
// accumulate the damage a wearer's melee/ranged cards LAND and fire every N (Vengeful Vampire heal,
// Lizard Wizard moxie). Fed by playCard/foeCast with the card's ranged-ness + total landed. Symmetric.
export function dealtTriggerPassives(room, c, dmg, ranged) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas || !(dmg > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) {
    const p = pas[pi];
    if (ranged && p.dealtRanged != null) advancePassive(room, c, pi, p, dmg, p.dealtRanged);
    else if (!ranged && p.dealtMelee != null) advancePassive(room, c, pi, p, dmg, p.dealtMelee);
  }
}

// PER-MOXIE-GAINED body clocks (owner 2026-06-27): {gain:N} fires every N moxie the wearer GAINS (Bookie
// Bonelord → summon a rat; Debt Dragon → +3 melee & ranged). Fed from the moxie-gain sites with the delta.
export function gainTriggerPassives(room, c, gained) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas || !(gained > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) if (pas[pi].gain != null) advancePassive(room, c, pi, pas[pi], gained, pas[pi].gain);
}

// PER-CARD EVENT triggers (owner 2026-06-27): onDeal (Killionaire — a damaging card landed), onPlayNonDmg
// (Audit Angel — a non-damaging card), onPlayRanged (Mid-Management Medusa — a ranged card), onPlayMelee
// (Rent-Seeking Runeblade — a melee card). Once per card, symmetric (players + foes). dealt = damage this
// card LANDED; isDmg = the card carries a damaging op. `ranged` is the TWO-BUCKET triggerKind (not-melee =
// ranged), so utility cards count as ranged here — onPlayMelee fires iff !ranged.
export function cardEventPassives(room, c, dealt, ranged, isDmg) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas) return;
  for (const p of pas) {
    if (p.onDeal && dealt > 0) resolveOps(room, c, p.ops, p.school || null);
    if (p.onPlayNonDmg && !isDmg)  resolveOps(room, c, p.ops, p.school || null);
    if (p.onPlayRanged && ranged)  resolveOps(room, c, p.ops, p.school || null);
    if (p.onPlayMelee && !ranged)  resolveOps(room, c, p.ops, p.school || null);
  }
}

// OPEN-OF-FIGHT grants (owner 2026-06-23): a body's combatStart fires once at the start of each combat
// — Malevolent Mouse (+1 damage = a counter), Golden Golem (+2 shield), Centless Centaur (first card
// doubled). Applied AFTER the per-fight reset, so it's fresh each fight (players: beginCombat; foes:
// spawnEnemy, which already mints a fresh instance per room).
export function applyCombatStart(c) {
  // (Cool Shoes' moxie-over-time seeding was removed 2026-06-25 — it's now an ON-PLAY refund; see
  // moxieOnPlayBonus in playCard/foeCast. Nothing worn needs seeding at the open of a fight now.)
  const cs = BODIES[c.bodyKey]?.combatStart;
  if (!cs) return;
  if (cs.counters)  c.counters = (c.counters ?? 0) + cs.counters;
  if (cs.shield)    c.shield = (c.shield ?? 0) + cs.shield;
  if (cs.doubleNext) c.doubleNext = true;
  if (cs.moxie != null) c.moxie = cs.moxie;   // Killionaire (owner 2026-06-27): start each combat with N moxie
}

// THE ECHO BAR (owner redesign 2026-06-12, supersedes the armed-clock — the clunky-feel
// fix): an echo body's bar charges on its own, and EVERY item its wearer uses PUSHES IT
// BACK — heavy slow kits charge through the pushback, spam never does. The body "wants
// big slow buttons" is now enforced in-fight, not at kit-build. Full bar: a FOE arms
// instantly (no hands); a PLAYER gets a lit ECHO button and arms it by CHOICE — a
// consume decision, never a press-timing one (sticky-mode contract). Armed → the next
// matching-school item resolves twice (the doubling machinery is unchanged).
// NOTE the AUTO-mode anti-synergy is deliberate: constant auto-presses keep the bar
// down — the deliberate-play body punishes autopilot. [PLACEHOLDER] dials.
export const ECHO_CD = 70, ECHO_DELAY = 15;  // 7s bar, 1.5s pushback per use (owner 2026-06-15: ×1.5 then +1s tempo passes; was 40/10)
export function tickEchoBar(c, isFoe) {
  if (!BODIES[c.bodyKey]?.echo || c.echoArmed || c.echoReady) return;
  c.echoCharge = (c.echoCharge ?? 0) + 1;
  if (c.echoCharge >= ECHO_CD * (c.cdMul ?? 1)) {
    c.echoCharge = 0;
    if (isFoe) c.echoArmed = true; else c.echoReady = true;
  }
}
export function echoDelay(c) {   // an item use pushes the wearer's OWN echo bar back
  if (BODIES[c.bodyKey]?.echo) c.echoCharge = Math.max(0, (c.echoCharge ?? 0) - ECHO_DELAY);
}
export function armEcho(room, player) {  // the player's button: READY → ARMED, their call
  if (room.phase !== "playing" || !player?.echoReady) return false;
  player.echoReady = false; player.echoArmed = true;
  return true;
}

// TIMED BUFFS (the post-floor-3 wave, owner-ordered 2026-06-12): generic {kind, amount,
// left} entries on ANY combatant, ticked down once per room tick. Symmetric by
// construction — a foe holding a buff item buffs itself the same way.
//  • haste — items charge double-speed · power — +N to BOTH schools (feeds effPhys/effMag,
//    so previews and snapshots inherit it) · stoneskin — −N off every incoming hit.
// Durations are literal ticks like every other number (the cdMult knob that once made
// buff uptime differ between test and live pacing is dead — owner 2026-06-12).
export function addBuff(c, kind, amount, dur) { const d = Math.max(1, dur | 0); (c.buffs ??= []).push({ kind, amount: amount ?? 0, left: d, dur: d }); }
export const buffAmt = (c, kind) => (c?.buffs ?? []).reduce((s, b) => s + (b.kind === kind ? b.amount : 0), 0);
export const hasBuff = (c, kind) => (c?.buffs ?? []).some((b) => b.kind === kind);
export function tickBuffs(c) { if (c?.buffs?.length) c.buffs = c.buffs.filter((b) => --b.left > 0); }

// RECURRING REGENS (owner cards 2026-06-24): a cast that grants an ongoing per-fight tick — Trollskin
// Tiara (heal N every P) / Liquid Metal Crown (shield N every P). Stored on the combatant, cleared
// per-fight like buffs. `period` is in ticks (10/sec). Symmetric (players + foes).
export function tickRegens(c) {
  if (!c?.regens?.length) return;
  for (const g of c.regens) {
    if (++g.charge < g.period * (c.cdMul ?? 1)) continue;
    g.charge = 0;
    if (g.kind === "heal") c.hp = Math.min(c.maxHp, (c.hp ?? 0) + g.amount);
    else if (g.kind === "shield") c.shield = (c.shield ?? 0) + g.amount;
    // MOXIE-OVER-TIME (Moxie Pool / Cool Shoes, owner 2026-06-25): bank moxie on a clock, capped.
    else if (g.kind === "moxie") c.moxie = Math.min(MOXIE_CAP, (c.moxie ?? 0) + g.amount);
    // RAMP-OVER-TIME (Demon Form / Sage Mode): the 🗡/🎯 type-specific bonus climbs each period.
    else if (g.kind === "meleeBonus") c.meleeBonus = (c.meleeBonus ?? 0) + g.amount;
    else if (g.kind === "rangedBonus") c.rangedBonus = (c.rangedBonus ?? 0) + g.amount;
    // BERSERKER ARMOR (owner 2026-06-25): each period grant +1 melee bonus AND +1 shield, then take
    // `amount` self-damage (its own +shield typically eats it — a self-stoking ramp). Symmetric:
    // tickRegens runs on any combatant. Self-damage hits shield first, then HP; if it kills, the tick
    // loops leave the corpse for the next damage path to clear (a 1/period self-hit never out-races the
    // +1 shield it grants, so this is an edge case only if shields were spent elsewhere).
    else if (g.kind === "berserk") {
      c.meleeBonus = (c.meleeBonus ?? 0) + (g.melee ?? 1);
      c.shield = (c.shield ?? 0) + (g.shield ?? 1);
      const left = absorbShield(c, g.amount ?? 1);
      if (left > 0) {
        c.hp = (c.hp ?? 0) - left;
        if (c.hp <= 0) { c.hp = 0; if (c.alive !== undefined) c.alive = false; }
      }
    }
  }
}
// BLOOD TO IRON (owner card 2026-06-24): for `left` ticks, damage the wearer takes is STORED (it still
// lands); when the window closes, that stored total becomes shield. The store hook lives in
// damagePlayer/damageEnemy; this runs the countdown + payout. Per-fight, symmetric.
export function tickBloodToIron(c) {
  const b = c?.bloodToIron;
  if (!b) return;
  if (--b.left > 0) return;
  c.shield = (c.shield ?? 0) + b.stored;
  c.bloodToIron = null;
}
// POISON (owner 2026-06-27): a stacking DoT — `c.poison` damage every POISON_PERIOD ticks, routed through
// the normal damage path so death + lane-removal are handled. Per-fight, symmetric. laneIdx = the entity's lane.
export function tickPoison(room, c, laneIdx) {
  if (!room || !(c?.poison > 0)) return;
  if ((c.poisonClock = (c.poisonClock ?? 0) + 1) < POISON_PERIOD) return;
  c.poisonClock = 0;
  const dmg = c.poison;
  if (room.players?.has?.(c.id)) damagePlayer(room, c, dmg);
  else if (c.side === "hero") hurtAllyToken(room, laneIdx ?? c.lane ?? 0, c, dmg);          // a friendly summon
  else damageEnemy(room, (c === room.boss ? (c.lane | 0) : (laneIdx ?? c.lane ?? 0)), c, dmg); // a foe (or the back-line boss)
}

// Drain every clock a combatant owns (Blizzard's bite) — SYMMETRIC: foe equipment and
// player inv are the same concept, so one drain serves both sides (the old foe-only
// drain was why a foe Blizzard was a no-op vs players — the reason it was exiled from
// the foe pools; fixed 2026-06-12, owner bug report "I've never seen a blizzard").
// STALL (moxie world): a "delay" effect now sets a target's MOXIE back — the meaningful tempo
// resource — instead of the dead per-item charge. The echo bar and boss clocks are still
// time-based, so they're still pushed back too (Blizzard/Time-Stop-adjacent stalls stay honest).
export function drainClocks(c, amt) {
  c.moxie = Math.max(0, (c.moxie ?? 0) - amt);
  c.echoCharge = Math.max(0, (c.echoCharge ?? 0) - amt);
  if (c.clocks) for (const k of c.clocks) k.charge = Math.max(0, k.charge - amt);
}

// Acid Rain / Rat Colony: advance the room's global cooldown bars; fire each on completion.
function processRoomTimers(room) {
  for (const t of room.roomTimers ?? []) {
    if (++t.charge < t.cd) continue;
    t.charge = 0;
    if (t.kind === "acid") {                                   // 1 to each hero AND each hero-summon
      for (const p of room.players.values()) damagePlayer(room, p, t.amount ?? 1);
      for (const lane of room.allies) for (const al of [...lane]) {
        const left = absorbShield(al, t.amount ?? 1);
        if (left > 0) { if ((al.hp -= left) <= 0) { const i = lane.indexOf(al); if (i >= 0) lane.splice(i, 1); } else if (al.ratStack) syncRatStack(al); }
      }
    } else if (t.kind === "ratSpawn") {                        // a rat joins the enemy in a random lane (merges into the lane's stack)
      const li = Math.floor(Math.random() * room.laneCount);
      const colony = { side: "foe", lane: li };
      summonBodies(room, colony, { do: "summon", body: "rat", count: 1, lane: li });
    } else if (t.kind === "scale") {                           // Runaway Scaling (elite gimmick): every foe ramps +N damage
      for (const lane of room.lanes) for (const e of lane) e.counters = (e.counters ?? 0) + (t.amount ?? 1);
      if (bossAlive(room)) room.boss.counters = (room.boss.counters ?? 0) + (t.amount ?? 1);
    }
  }
}

// The most-wounded friendly in the source's lane (self included) — Heal's auto-target. A hero
// heals heroes+allies; a foe heals foes. Returns null if nobody's hurt to pick.
function lowestHpFriendly(room, source) {
  const li = source.lane;
  const pool = source.side === "foe"
    ? room.lanes[li]
    : [...laneHeroes(room, li), ...(room.allies?.[li] ?? [])];
  let best = null;
  for (const c of pool) if (c && c.hp > 0 && (best === null || c.hp / c.maxHp < best.hp / best.maxHp)) best = c;
  return best;
}

// `boost` (owner 2026-06-21): a body's effectBoost adds N to a qualifying card's effect — applied to
// every amount-bearing op of that card. `op.power` lets a passive's deal/heal scale with a named
// school's Power even when the call has no school (e.g. a tank's "deal my staff to the lane" clock).
export function resolveOps(room, source, ops, school = null, boost = 0, kind = null) {
  let dealt = 0;                          // damage THIS card has dealt so far (shield {ofDealt} reads it)
  for (const op of ops) {
    const amt = (op.amount ?? 0) + (op.amount != null ? boost : 0);
    const li = source.lane, lane = room.lanes[li];

    // Foes are simpler: damage lands on the hero side of their lane; summon adds to it.
    if (source.side === "foe") {
      const dm = (x) => Math.round(x * (source.dmgMul ?? 1));                     // Aggressive room: ×1.2 outgoing
      // school-tagged items scale with the foe's sword/staff Power (symmetry); school-less passives
      // keep their flat amount (+ counters, for ramping bosses). `target:"lane"` AoE hits the whole
      // hero side of the lane (mirrors a player's lane deal hitting every foe in a lane).
      if (op.do === "deal") {
        const hit = foeDealHit(room, source, op, op.power || school, kind); // Gang Up + Power×mult + melee/ranged bonus + the ≥1 floor
        if (op.target === "lane") { foeHitLaneAll(room, li, hit, source); dealt += hit; }
        else if (op.target === "front2") { foeHitFront2(room, li, hit, source); dealt += hit; }
        else if (foeOpSnipes(op)) {                                             // RANGED (owner 2026-06-27): snipe the weakest PLAYER, cross-lane, never a summon
          const landed = foeHitRanged(room, hit, source);
          dealt += landed;
          if (op.lifesteal && landed > 0) source.hp = Math.min(source.maxHp, source.hp + landed); // Darkness
        }
        else {                                                                  // MELEE front (breach-redirect to the nearest defended lane)
          const landed = foeHitLane(room, li, hit, source);
          dealt += landed;
          if (op.lifesteal && landed > 0) source.hp = Math.min(source.maxHp, source.hp + landed); // Darkness
        }
      }
      else if (op.do === "schoolStrike") { foeHitLane(room, li, dm(powerFor(source, op.school)), source); fireSchoolTrigger(room, source, op.school); }
      else if (op.do === "dealEachLane") {                                       // boss: chip every lane at once (no breach — an empty lane just hits nobody)
        const each = dm(amt + (source.counters ?? 0));                          // amount 0 → pure counter-scaled (Hydra)
        if (each > 0) for (let l = 0; l < room.laneCount; l++) foeHitLane(room, l, each, source, false);
      }
      else if (op.do === "attack") foeHitLane(room, li, dm(effAtk(source)), source); // strike for its attack
      else if (op.do === "healAttack") source.hp = Math.min(source.maxHp, source.hp + effAtk(source));
      else if (op.do === "summon" || op.do === "summonArmed") summonBodies(room, source, op);
      else if (op.do === "delay") {                  // foe Blizzard/Ice: drain the HEROES' moxie
        if (op.target === "lane") {
          // lane-wide drain (Blizzard): hits every hero and ally-summon in the foe's lane
          for (const h of heroesInLane(room, li)) drainClocks(h, amt);
          for (const al of room.allies?.[li] ?? []) drainClocks(al, amt);
        } else {
          // single-target drain (Ice target:"pick"): foes have no reticle, so "pick" resolves
          // to the front of the lane line — same entity the preceding deal op hits.
          const front = laneLine(room, li)[0];
          if (front) drainClocks(front, amt);
        }
      }
      else if (op.do === "buff") addBuff(source, op.buff, op.amount, op.dur);   // a foe buffs itself, same rules
      else if (op.do === "timeStop") room.freezeHeroes = Math.max(room.freezeHeroes ?? 0, op.dur ?? 30);
      else if (op.do === "healSelf" || op.do === "heal") { source.hp = Math.min(source.maxHp, source.hp + amt + (op.power ? powerFor(source, op.power) : 0)); clog(room, "  ✦ " + logNm(source) + " heals " + amt); }
      else if (op.do === "armDouble") source.doubleNext = true;                 // next card resolves twice
      else if (op.do === "comboBuff") source.comboPending = { left: op.n ?? 1, amount: op.amount ?? 1 }; // your NEXT N cards +amount
      else if (op.do === "healAlly") { const t = lowestHpFriendly(room, source); if (t) t.hp = Math.min(t.maxHp, t.hp + amt + powerFor(source, school)); }
      else if (op.do === "shield") { const sg = amt + (op.ofMaxHp ? source.maxHp : 0) + (op.ofDealt ? dealt : (op.power ? powerFor(source, op.power) * (op.mult ?? 1) : 0)); source.shield = (source.shield ?? 0) + sg; if (sg > 0) clog(room, "  ✦ " + logNm(source) + " +" + sg + " shield"); }  // flat + max HP (Golden Golem) / dealt / power×mult — owner 2026-06-26: log the REAL gain, skip the +0 noise
      else if (op.do === "thorns") source.thorns = (source.thorns ?? 0) + amt;  // per-fight spikes (symmetric)
      else if (op.do === "counter") { source.counters = (source.counters ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " +" + amt + " dmg"); } // ramps its attack
      else if (op.do === "gainMoxie") { const _g0 = source.moxie ?? 0; source.moxie = Math.min(MOXIE_CAP, _g0 + amt); gainTriggerPassives(room, source, (source.moxie ?? 0) - _g0); } // Lizard Wizard: bank moxie; feeds {gain:N} clocks
      else if (op.do === "regen") (source.regens ??= []).push({ kind: op.kind ?? "heal", amount: op.amount ?? 1, period: op.period ?? 30, melee: op.melee, shield: op.shield, charge: 0 });
      else if (op.do === "meleeBonus") { source.meleeBonus = (source.meleeBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " melee +" + amt); } // Sharpened Edges: 🗡-only ramp
      else if (op.do === "rangedBonus") { source.rangedBonus = (source.rangedBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " ranged +" + amt); } // Wizard Hat: 🎯-only ramp
      else if (op.do === "bloodToIron") source.bloodToIron = { stored: 0, left: op.dur ?? 50, dur: op.dur ?? 50 };
      else if (op.do === "timer") (source.timers ??= []).push({ ops: op.ops ?? [], period: op.period ?? 60, charge: 0 }); // owner 2026-06-27: card-granted "every N ticks → ops" (Animated Blade, Pet Leech)
      continue;
    }

    switch (op.do) {
      case "deal": {
        let bonus = powerFor(source, op.power || school) * (op.mult ?? 1); // Power×mult scales the card
        if ((op.power || school) !== "physical") bonus += kindBonusOf(source, kindForOp(op, kind)); // melee→🗡 bonus, ranged→🎯 bonus; a generic +1 (counters) lifts both, untyped gets none
        if (op.perAlly) {                                 // Gang Up: +N per OTHER ally (heroes + summons) in your lane
          const others = heroesInLane(room, source.lane).length - 1 + (room.allies?.[source.lane]?.length ?? 0);
          bonus += op.perAlly * Math.max(0, others);
        }
        // a weapon always lands AT LEAST 1 (owner 2026-06-10): a zero-base school item on
        // a wrong-school body (Scary Knife on a summoner) must still deal damage
        let dmg = amt + bonus + (op.ofShield ? (source.shield ?? 0) : 0); // Shield Bash: deal = current shield
        if (hasBuff(source, "weakness")) dmg = Math.ceil(dmg / 2);   // Weakness (owner 2026-06-27): half damage, round up
        if (school && dmg < 1) dmg = 1;
        if (op.target === "lane") {                       // V2: every foe in YOUR lane (Lightning/Blizzard)
          for (const e of [...room.lanes[source.lane]]) dealt += damageEnemy(room, source.lane, e, dmg, source);
          if (source.side === "hero" && bossAlive(room))  // the back-line boss sits behind every lane —
            dealt += damageEnemy(room, source.lane, room.boss, dmg, source); // lane AoE used to miss it (owner bug 2026-06-17)
          break;
        }
        if (op.target === "front2") {                     // Spear: the front TWO foes in your lane
          for (const e of [...room.lanes[source.lane].slice(0, 2)]) dealt += damageEnemy(room, source.lane, e, dmg, source);
          break;
        }
        const t = aimedFoe(room, source, op.target);     // 'front' or 'pick'
        if (t) {
          const landed = damageEnemy(room, t.lane, t.foe, dmg, source);
          dealt += landed;
          if (op.lifesteal && landed > 0) source.hp = Math.min(source.maxHp, source.hp + landed); // Darkness
        }
        break;
      }
      case "move": {                                      // legacy: shove the aimed foe over a lane
        const t = aimedFoe(room, source, op.target);
        if (t) {
          const from = room.lanes[t.lane], idx = from.indexOf(t.foe);
          if (idx >= 0) { from.splice(idx, 1); room.lanes[(t.lane + 1) % room.laneCount].push(t.foe); }
        }
        break;
      }
      case "pushBack": {                                  // Wind: send the aimed foe to the BACK of its lane
        const t = aimedFoe(room, source, op.target ?? "pick");
        if (t) {
          const arr = room.lanes[t.lane], idx = arr.indexOf(t.foe);
          if (idx >= 0 && arr.length > 1) { arr.splice(idx, 1); arr.push(t.foe); }
        }
        break;
      }
      case "delay": {                                     // charge drain (V2 §4.7): push EVERY clock back
        if (op.target === "lane") {                       // Blizzard: every foe in your lane…
          for (const e of room.lanes[source.lane]) drainClocks(e, amt);
          if (source.side === "hero" && bossAlive(room)) drainClocks(room.boss, amt); // …AND the back-line boss (owner bug 2026-06-17)
          break;
        }
        const t = aimedFoe(room, source, op.target);
        if (t) drainClocks(t.foe, amt);
        break;
      }
      case "buff": {   // Haste / Power Boost / Stone Skin — castable on a TEAMMATE via the
        // ally-target slot (owner 2026-06-12), same slot heals read; falls back to self.
        const at = source.allyTargetId != null ? room.players?.get(source.allyTargetId) : null;
        addBuff((at && at.alive) ? at : source, op.buff, op.amount, op.dur);
        break;
      }
      case "poison": case "slow": case "weakness": case "weakenLane": {
        // DEBUFFS (owner 2026-06-27) on the OPPOSING side, side-aware (hero→foes, foe→heroes+summons).
        const li = source.lane | 0;
        const opp = source.side === "foe" ? laneLine(room, li) : [...(room.lanes[li] ?? [])];
        const dmul = BODIES[source.bodyKey]?.debuffMult ?? 1;   // Depression Demon (owner 2026-06-27): your debuffs last 2×
        const apply = (t) => { if (!t) return;
          if (op.do === "poison")        t.poison = (t.poison ?? 0) + (amt || 1);
          else if (op.do === "slow")     addBuff(t, "slow", 0, (op.dur ?? 60) * dmul);
          else if (op.do === "weakness") addBuff(t, "weakness", 0, (op.dur ?? 60) * dmul);
          else /* weakenLane */          t.counters = (t.counters ?? 0) - (amt || 1); }; // a NEGATIVE counter — permanent for the fight
        if (op.target === "lane" || op.do === "weakenLane") opp.forEach(apply);
        else apply(source.side === "foe" ? opp[0] : aimedFoe(room, source, op.target ?? "pick")?.foe);
        break;
      }
      case "gigaArm":  source.gigaArmed = true; break;    // Giga Cast: the NEXT staff item resolves ×4
      case "timeStop": room.freezeFoes = Math.max(room.freezeFoes ?? 0, op.dur ?? 30); break; // ⏳ freeze the foe side
      case "revive": {  // once-per-fight rescue: a downed teammate to FULL (ally-target first), else a full heal
        const at = source.allyTargetId != null ? room.players?.get(source.allyTargetId) : null;
        const t = (at && !at.alive) ? at
              : [...room.players.values()].find((q) => !q.alive)
              ?? ((at && at.alive) ? at : lowestHpFriendly(room, source));
        if (t) { t.alive = true; t.downTimer = 0; t.hp = t.maxHp; }
        break;
      }
      case "summon":   summonBodies(room, source, op); break; // hero summons an ally (V2 §4.10: items do this now)
      case "attack": { // SYMMETRY: a worn body's "attack/I-sword" passive strikes a foe for its effective Power
        const t = aimedFoe(room, source, op.target ?? "front");
        if (t) damageEnemy(room, t.lane, t.foe, effAtk(source), source);
        break;
      }
      case "healAttack": source.hp = Math.min(source.maxHp, source.hp + effAtk(source)); break; // lifesteal-style body passive
      case "healAlly": {
        // SMART TANK HEALING (owner 2026-06-21): your ALLY-target slot (🎯 → tap an ally) is the
        // priority — pin the tank and heals land on the tank WHILE IT NEEDS THEM. But a foe wouldn't
        // waste a hit, and neither should a healer: if the pinned target is already topped off we DON'T
        // overheal it, we slide to the most-hurt friendly in the lane instead. No pin set → just heal
        // the most-hurt friendly. Offense never reads this slot.
        const at = source.allyTargetId != null ? room.players?.get(source.allyTargetId) : null;
        const needsHeal = (q) => q && q.alive && q.hp < q.maxHp;
        const t = needsHeal(at) ? at : (lowestHpFriendly(room, source) ?? (at && at.alive ? at : null));
        if (t) t.hp = Math.min(t.maxHp, t.hp + amt + powerFor(source, school));
        break;
      }
      case "schoolStrike": { // "I sword/staff": deal my school Power to a foe, then emit that school's trigger
        const ts = aimedFoe(room, source, op.target ?? "front");
        if (ts) damageEnemy(room, ts.lane, ts.foe, powerFor(source, op.school), source);
        fireSchoolTrigger(room, source, op.school);
        break;
      }
      case "shield": { const sg = amt + (op.ofMaxHp ? source.maxHp : 0) + (op.ofDealt ? dealt : (op.power ? powerFor(source, op.power) * (op.mult ?? 1) : 0)); source.shield = (source.shield ?? 0) + sg; if (sg > 0) clog(room, "  ✦ " + logNm(source) + " +" + sg + " shield"); break; } // flat + max HP (Golden Golem) / dealt / power×mult — owner 2026-06-26: log REAL gain, skip +0
      case "comboBuff": source.comboPending = { left: op.n ?? 1, amount: op.amount ?? 1 }; break; // your NEXT N cards deal +amount
      case "thorns":   source.thorns = (source.thorns ?? 0) + amt; break; // Spikes: per-fight reflect buff
      case "healSelf": source.hp = Math.min(source.maxHp, source.hp + amt + (op.power ? powerFor(source, op.power) : 0)); clog(room, "  ✦ " + logNm(source) + " heals " + amt); break;
      case "armDouble": source.doubleNext = true; break;  // body passive: my NEXT card resolves twice
      case "counter":  source.counters = (source.counters ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " +" + amt + " dmg"); break;
      case "gainMoxie": source.moxie = Math.min(MOXIE_CAP, (source.moxie ?? 0) + amt); break; // Lizard Wizard: bank moxie
      case "pullFront": {  // Taunt (owner 2026-06-25): DRAG the aimed foe into YOUR lane and to its
        // front — pull it across lanes to face you, not just to the head of its own lane.
        const tp = aimedFoe(room, source, op.target ?? "pick");
        if (tp) {
          const from = room.lanes[tp.lane], idx = from.indexOf(tp.foe);
          if (idx >= 0) { from.splice(idx, 1); tp.foe.lane = source.lane; room.lanes[source.lane].unshift(tp.foe); }
        }
        break;
      }
      case "regen":    (source.regens ??= []).push({ kind: op.kind ?? "heal", amount: op.amount ?? 1, period: op.period ?? 30, melee: op.melee, shield: op.shield, charge: 0 }); break; // Trollskin / Liquid Metal / Moxie Pool / Demon Form / Sage Mode / Berserker
      case "meleeBonus": source.meleeBonus = (source.meleeBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " melee +" + amt); break; // Sharpened Edges: 🗡-only ramp (counters lifts both, this lifts only melee)
      case "rangedBonus": source.rangedBonus = (source.rangedBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " ranged +" + amt); break; // Wizard Hat: 🎯-only ramp
      case "bloodToIron": source.bloodToIron = { stored: 0, left: op.dur ?? 50, dur: op.dur ?? 50 }; break; // store damage → shield when the window closes
      default: break; // verb not implemented yet — intentional, never silently wrong
      // (the "echoArm" op died with the armed-clock echo — the bar lives in tickEchoBar now)
    }
  }
  return dealt;   // total damage this op-list LANDED — feeds {dealtMelee}/{dealtRanged} body clocks
}

// WORN-PASSIVE moxie refund (Cool Shoes, owner 2026-06-25): +N moxie each time the wearer plays/casts
// a card. Reads worn gear (player.inv / foe.equipment) — symmetric across both sides; callers cap at
// MOXIE_CAP.
const moxieOnPlayBonus = (c) => {
  let n = 0;
  for (const it of (c?.inv ?? c?.equipment ?? [])) if (!it?.spent) n += KIT[it.key]?.passive?.moxieOnPlay ?? 0;
  return n;
};
// PLAY A CARD (CARDS_SPEC §5) — replaces the old cooldown `useItem`. Spend moxie, resolve the card's
// ops (ECHO / Giga / school-trigger / Djinn all UNCHANGED), then the card leaves the hand: a fragile
// one-shot is gone for the fight; everything else shuffles back into the deck. Draw to refill the hand.
export function playCard(room, player, id) {
  if (room.phase !== "playing" || !player.alive) return false;
  const body = BODIES[player.bodyKey];
  const hi = (player.hand ?? []).findIndex((c) => c.id === id);
  if (hi < 0) return false;                          // not a card in your hand
  const card = player.hand[hi];
  const item = KIT[card.key];
  if (!item?.ops) return false;                      // worn passive — nothing to cast
  const cost = cardCost(card.key, body);             // body discount baked in
  if ((player.moxie ?? 0) < cost) return false;      // can't afford it yet
  player.moxie -= cost;
  clog(room, "▶ " + logNm(player) + " plays " + (KIT[card.key]?.name ?? card.key));
  // ECHO arms a double; Giga ×4 on staff; armDouble body passive doubles the NEXT card (any school).
  let times = item.type && body?.echo === item.type && player.echoArmed ? 2 : 1;
  if (body?.doubleExpensive != null && cost >= body.doubleExpensive) times *= 2;   // Nepotistic Neptune (owner 2026-06-27): a ≥N-cost card resolves twice
  if (times === 2) player.echoArmed = false;
  if (player.gigaArmed && item.type === "magical") { times *= 4; player.gigaArmed = false; }
  if (player.doubleNext) { times *= 2; player.doubleNext = false; }
  // effectBoost: "my <school> cards costing ≥ minCost gain +N"; combo: "your next N cards deal +amount"
  const eb = body?.effectBoost;
  let boost = (eb && item.type === eb.school && cost >= (eb.minCost ?? 0)) ? (eb.amount ?? 1) : 0;
  const usedCombo = (player.combo?.left ?? 0) > 0;
  if (usedCombo) boost += player.combo.amount || 0;
  let dealtTot = 0;
  for (let n = 0; n < times; n++) dealtTot += (resolveOps(room, player, item.ops, item.type, boost, cardKind(card.key)) || 0);
  if (item.type) fireSchoolTrigger(room, player, item.type);
  spendTriggerPassives(room, player, cost, item.type); // school-tagged so {spend,school} clocks count right
  const trigRanged = triggerKind(card.key) === "ranged";                         // TWO-BUCKET: not-melee = ranged (utility counts ranged)
  playTriggerPassives(room, player, trigRanged);                                 // {play}/{pairMR} body clocks — pairMR ranged half now also satisfied by utility
  dealtTriggerPassives(room, player, dealtTot, cardKind(card.key) === "ranged"); // {dealtMelee}/{dealtRanged} — by DAMAGE kind (utility deals none → unaffected)
  cardEventPassives(room, player, dealtTot, trigRanged, _isDamageCard(card.key)); // onDeal / onPlayNonDmg / onPlayRanged / onPlayMelee — two-bucket ranged
  if (usedCombo && player.combo) { if (--player.combo.left <= 0) player.combo = null; } // spend one combo charge
  if (player.comboPending) { player.combo = player.comboPending; player.comboPending = null; } // a comboBuff just set the next run
  echoDelay(player);                                 // every play pushes the wearer's own echo bar back
  { const mr = moxieOnPlayBonus(player); if (mr) player.moxie = Math.min(MOXIE_CAP, (player.moxie ?? 0) + mr); } // Cool Shoes: +moxie on every play
  (room.useCounts ??= {})[card.key] = ((room.useCounts ?? {})[card.key] ?? 0) + 1; // telemetry: per-room casts
  if (item.ops?.length) tickDjinnCounter(room, player); // Djinn: every 3rd party card bites back
  // route the played card OUT of hand: fragile → gone this fight · lasting → stays in play ·
  // else → shuffled back into the deck
  if (item.fragile) player.cards = (player.cards ?? []).filter((c) => c.id !== card.id);
  else if (item.lasting) (player.inPlay ??= []).push(card); // fight-long PASSIVE (owner 2026-06-24): stays IN PLAY, restored next combat via dealHand
  else { (player.deck ??= []).push(card); shuffle(player.deck); }                        // shuffles back in
  // REFILL IN PLACE (owner 2026-06-24): the replacement draws into the SAME slot the played card
  // left, so the hand stays positionally stable instead of collapsing left + appending at the end —
  // every other card keeps its spot; only the played slot's card changes. If the deck is dry there's
  // nothing to slot in, so the card is just removed (the hand naturally shrinks at the end of a fight).
  if ((player.deck?.length ?? 0) > 0) player.hand.splice(hi, 1, player.deck.shift());
  else player.hand.splice(hi, 1);
  drawUp(player);                                    // top up any still-empty slots (no-op in the common case)
  return true;
}

// Back-compat shim: a few tools/tests still fire by slot index → play that hand card by id.
export function useItem(room, player, slot) {
  const card = (player.hand ?? [])[slot | 0];
  return card ? playCard(room, player, card.id) : false;
}

// AUTO targets DAMAGE first: play the priciest affordable DAMAGING card. If none is affordable yet
// but a pricier damaging card is pending in hand, HOLD to bank moxie toward it (unless moxie is
// capped — then don't waste regen). This kills the starvation where a lone cheap utility (Small
// Shield⚡1) gets replayed forever at moxie 1 and the real damage never fires (QA finding 2026-06-21).
const _DMG_OPS = new Set(["deal", "schoolStrike", "attack", "summon", "summonArmed", "dealEachLane"]);
const _isDamageCard = (key) => (KIT[key]?.ops ?? []).some((o) => _DMG_OPS.has(o.do));
export function autoPlay(room, p) {
  const hand = p.hand ?? [], bd = BODIES[p.bodyKey];
  const cost = (c) => cardCost(c.key, bd);
  const aff = hand.filter((c) => cost(c) <= (p.moxie ?? 0));
  if (!aff.length) return;                                              // nothing affordable — bank
  const priciest = (list) => list.reduce((a, b) => (cost(b) > cost(a) ? b : a));
  const dmgAff = aff.filter((c) => _isDamageCard(c.key));
  if (dmgAff.length) return void playCard(room, p, priciest(dmgAff).id); // hit something now
  const pendingDmg = hand.some((c) => _isDamageCard(c.key) && cost(c) > (p.moxie ?? 0));
  if (pendingDmg && (p.moxie ?? 0) < MOXIE_CAP) return;                 // bank toward the real hit
  playCard(room, p, priciest(aff).id);                                  // else best utility/heal/buff
}

// FOE CAST (symmetric with playCard): spend moxie on the FRONT queue card if affordable, resolve its
// ops (echo/school-trigger included), then rotate it to the back. One cast per tick. Returns bool.
// a foe's EFFECTIVE card cost: the same body discount you get, minus any elite-room gimmick cut (Cut-Rate Foes).
export const foeCardCost = (key, bd, room) => Math.max(0, cardCost(key, bd) - (room?.gimmick?.foeCostCut ?? 0));

export function foeCast(room, e) {
  const q = e.queue;
  if (!q || !q.length) return false;
  const card = q[0], item = KIT[card.key], bd = BODIES[e.bodyKey];
  if (!item?.ops) { q.push(q.shift()); return false; }   // dud guard (passives shouldn't be queued)
  const cost = foeCardCost(card.key, bd, room);           // foe body discount + any elite gimmick cut
  if ((e.moxie ?? 0) < cost) return false;               // not enough moxie yet
  e.moxie -= cost;
  clog(room, "↳ " + logNm(e) + " casts " + (KIT[card.key]?.name ?? card.key));
  let times = item.type && bd?.echo === item.type && e.echoArmed ? 2 : 1;
  if (bd?.doubleExpensive != null && cost >= bd.doubleExpensive) times *= 2;   // Nepotistic Neptune (symmetric)
  if (times === 2) e.echoArmed = false;
  if (e.doubleNext) { times *= 2; e.doubleNext = false; }
  const eb = bd?.effectBoost;
  let boost = (eb && item.type === eb.school && cost >= (eb.minCost ?? 0)) ? (eb.amount ?? 1) : 0;
  const usedCombo = (e.combo?.left ?? 0) > 0;
  if (usedCombo) boost += e.combo.amount || 0;
  let dealtTot = 0;
  for (let n = 0; n < times; n++) dealtTot += (resolveOps(room, e, item.ops, item.type, boost, cardKind(card.key)) || 0);
  if (item.type) fireSchoolTrigger(room, e, item.type);  // foe "when I sword/staff" fires too
  spendTriggerPassives(room, e, cost, item.type);        // school-tagged spend → body clocks
  const trigRanged = triggerKind(card.key) === "ranged";                      // TWO-BUCKET: not-melee = ranged (symmetric with players)
  playTriggerPassives(room, e, trigRanged);                                   // {play}/{pairMR} body clocks — pairMR ranged half also satisfied by utility
  dealtTriggerPassives(room, e, dealtTot, cardKind(card.key) === "ranged");   // {dealtMelee}/{dealtRanged} — by DAMAGE kind (utility deals none → unaffected)
  cardEventPassives(room, e, dealtTot, trigRanged, _isDamageCard(card.key)); // onDeal / onPlayNonDmg / onPlayRanged / onPlayMelee — two-bucket ranged
  if (usedCombo && e.combo) { if (--e.combo.left <= 0) e.combo = null; }
  if (e.comboPending) { e.combo = e.comboPending; e.comboPending = null; }
  echoDelay(e);
  { const mr = moxieOnPlayBonus(e); if (mr) e.moxie = Math.min(MOXIE_CAP, (e.moxie ?? 0) + mr); } // Cool Shoes (symmetric): +moxie on every cast
  if (item.lasting) q.shift();   // a fight-long PASSIVE leaves the queue, never cycles back (symmetric w/ players' inPlay)
  else q.push(q.shift());                                 // front → back
  return true;
}

// Djinn of Deals (BOSS_SPEC_V1): a PARTY-WIDE item-use counter — every player's use ticks
// it; every 3rd use, the Djinn conjures an item-entity of its own into the lane of the
// player whose use tripped the counter. One press = one tick (echo doubles ops, not uses).
export function tickDjinnCounter(room, player) {
  const djinn = room.lanes.flat().find((f) => f.bodyKey === "djinn" && f.hp > 0);
  if (!djinn) return;
  room.itemUses = (room.itemUses ?? 0) + 1;
  if (room.itemUses % (BOSS_DEFS.djinn.everyNthItem ?? 3) !== 0) return;
  spawnItemEntity(room, rnd(DJINN_ITEM_POOL), player.lane);
}

// Total foes on the board (used by the King Mimic ward).
export const foeCount = (room) => room.lanes.reduce((n, l) => n + l.length, 0);

// Boss defensive flags fold incoming damage into what actually lands:
//  • ward (King Mimic): immune while any OTHER foe is on the board — clear the court first.
//  • dmgReduce (Litigation Lich): every hit is softened, but at least 1 always slips through.
// Ordinary foes have no flags, so this is a no-op for them (pure foe/hero symmetry preserved).
// Flat damage reduction a combatant carries from WORN passive items (Aegis). Symmetric: a
// player reads `inv`, a foe reads `equipment` — same gear, same softening of every incoming hit.
export function itemDmgReduce(combatant) {
  const gear = combatant?.inv ?? combatant?.equipment ?? [];
  return gear.reduce((s, it) => s + (it?.spent ? 0 : (KIT[it.key]?.passive?.dr ?? 0)), 0);
}

export function effectiveDamageTo(room, enemy, amount) {
  const body = BODIES[enemy.bodyKey] ?? {};
  if (body.ward && foeCount(room) > 1) return 0;       // protected while its court stands
  if (body.dmgReduce && amount > 0) amount = Math.max(1, amount - body.dmgReduce);
  // Litigation Lich stances (BOSS_SPEC_V1): ⚖ OBJECTION caps every hit it takes at 1;
  // recess softens every hit by 1, but a point always slips through (the engine's existing
  // ≥1 convention — so school-tagged deals keep their weapon floor unless the CAP is up).
  if (enemy.stance === "objection" && amount > 0) amount = Math.min(amount, 1);
  else if (enemy.stance === "recess" && amount > 0) amount = Math.max(1, amount - 1);
  const dr = itemDmgReduce(enemy) + buffAmt(enemy, "stoneskin"); // worn Aegis + Stone Skin soften every hit (floor 0)
  if (dr && amount > 0) amount = Math.max(0, amount - dr);
  return amount;
}

// Hero-side damage to a foe. `attacker` (the hero/summon dealing it) feeds the lane auras
// (Flag: +1 out) and thorns reflection; pass nothing for source-less damage (acid, thorns).
// Returns the damage that LANDED (past ward/armor/auras, into shield+HP) — lifesteal's feed.
export function damageEnemy(room, laneIdx, enemy, amount, attacker = null) {
  enemy.lane = laneIdx; enemy.side = "foe";
  if (attacker) amount += laneAura(room, attacker, "dmgBonus");  // hero-side Flag/Knight
  amount -= laneAura(room, enemy, "dmgReduce");                  // a foe-side Totem softens the hit
  amount = effectiveDamageTo(room, enemy, amount);
  if (amount <= 0) return 0;                            // warded/fully-absorbed: no hit, no on-damaged trigger
  const landed = amount;
  clog(room, "  → " + landed + " to " + logNm(enemy) + (attacker ? " (from " + logNm(attacker) + ")" : ""));
  if (enemy.bloodToIron) enemy.bloodToIron.stored += 1;   // Blood To Iron (foe side): count the HIT — 1 shield per instance (owner 2026-06-27)
  amount = absorbShield(enemy, amount);                 // its shield buffer eats the hit before HP
  if (amount > 0) {
    enemy.hp -= amount;
    if (enemy.hp <= 0) {
      clog(room, "  ☠ " + logNm(enemy) + " falls");
      const lane = room.lanes[laneIdx];
      const i = lane.indexOf(enemy);
      if (i >= 0) lane.splice(i, 1);
      // onKill (owner 2026-06-27): a foe defeated in a lane fires that lane's HERO defenders' onKill passives (Bookie Bonelord → +1 melee)
      for (const h of laneHeroes(room, laneIdx)) { const ap = BODIES[h.bodyKey]?.passive; if (ap) for (const pk of ap) if (pk.onKill) resolveOps(room, h, pk.ops, pk.school || null); }
      if (enemy === room.boss) room.boss = null;        // the back-line boss falls (never in a lane array)
      // Kraken rescue: killing a stolen-item entity returns the item to its owner's hotbar
      // mid-fight — the lock is exactly as long as the entity lives.
      if (enemy.restoreTo) {
        const owner = room.players?.get?.(enemy.restoreTo.playerId);
        const iv = owner?.inv?.find((x) => x.stolen && x.key === enemy.restoreTo.key);
        if (iv) iv.stolen = false;
      }
      const b = BODIES[enemy.bodyKey] ?? {};
      if (!b.summon && !b.boss) room.unlockedBodies.add(enemy.bodyKey); // the mimic (summons/bosses aren't adoptable loot)
    }
  }
  if (enemy.ratStack && enemy.hp > 0) syncRatStack(enemy);   // a surviving rat-stack drops to "N rats", bite N
  // ON-DAMAGED triggers fire on the GROSS hit whenever the foe SURVIVES — even if its shield ate the
  // whole blow (owner 2026-06-24: "damage taken" counts shielded damage; a shielded Fat Cat still rats).
  if (enemy.hp > 0) {
    runPassive(room, enemy, "damaged"); // e.g. Fat Cat spawns a rat when hit
    accelClocks(enemy, "damaged");              // a hit speeds bruiser ramp clocks
    hitTriggerPassives(room, enemy, landed);    // {hit}/{spendOrHit} clocks ramp on damage taken (gross)
    atlasReflect(room, enemy, landed);          // Atlas, Shrugging: every 10 taken → 10 to his whole lane
    if (BODIES[enemy.bodyKey]?.boss) bossOnDamaged(room, enemy, laneIdx, landed); // Hydra: a head per POINT landed
  }
  reflectThorns(room, enemy, attacker);   // a thorned foe spikes its striker back
  return landed;
}

// Returns the damage that LANDED (past auras/armor, into shield+HP).
export function damagePlayer(room, p, amount) {
  if (!p.alive) return 0;
  amount -= laneAura(room, p, "dmgReduce");       // Totem/Knight: lane allies take −1
  const dr = itemDmgReduce(p) + buffAmt(p, "stoneskin");  // worn Crown + Stone Skin soften every hit (floor 0)
  if (dr && amount > 0) amount = Math.max(0, amount - dr);
  if (amount <= 0) return 0;
  const landed = amount;
  clog(room, "  ✖ " + landed + " to " + logNm(p));
  if (p.bloodToIron) p.bloodToIron.stored += 1;   // Blood To Iron: count the HIT — 1 shield per instance (owner 2026-06-27), repaid as shield later
  amount = absorbShield(p, amount);               // per-body shield buffer eats the hit before HP
  p.hp -= amount;                                 // amount is 0 when the shield ate the whole hit
  if (p.hp <= 0) { p.hp = 0; p.alive = false; clog(room, "  ☠ " + logNm(p) + " goes DOWN"); } // out for the rest of the fight; revived on room clear
  // ON-DAMAGED triggers fire on the GROSS hit even when a shield fully absorbs it (owner 2026-06-24:
  // "damage taken" counts shielded damage — a shielded Fat Cat still earns its rat).
  else { runPassive(room, p, "damaged"); accelClocks(p, "damaged"); hitTriggerPassives(room, p, landed); atlasReflect(room, p, landed); } // worn on-damaged + bruiser ramp + Atlas shrug
  return landed;
}

// One simulation step. Pure: never broadcasts. The server calls this then broadcasts.
export function simulateTick(room) {
  room.tick++;
  if (room.phase !== "playing") return;
  // ⏳ Time Stop counters (one per side — a foe-held Time Stop freezes the heroes)
  if (room.freezeFoes > 0) room.freezeFoes--;
  if (room.freezeHeroes > 0) room.freezeHeroes--;

  for (const p of room.players.values()) {
    if (!p.alive) continue; // downed heroes stay out unless a Revive item brings them back
    ensureTarget(room, p); // always keep a valid aim
    tickBuffs(p);
    if (room.freezeHeroes > 0) continue;            // frozen heroes: every clock stands still
    tickRegens(p); tickBloodToIron(p); tickPoison(room, p, p.lane);  // ongoing card effects (Trollskin / Liquid Metal / Blood To Iron / Poison)
    const body = BODIES[p.bodyKey];
    const step = 1 + (hasBuff(p, "haste") ? 1 : 0); // Haste: moxie charges double-speed
    { const _pm0 = p.moxie ?? 0; regenMoxie(p, step); gainTriggerPassives(room, p, (p.moxie ?? 0) - _pm0); }   // +1 moxie/sec + {gain:N} body clocks (owner 2026-06-27)
    // AUTO play (owner 2026-06-12: "tired of clicking"): play the most-expensive AFFORDABLE card in
    // hand — best use of the moxie on the board — one per tick. Manual stays the default.
    if (p.autoFire) autoPlay(room, p);
    // SYMMETRY: a worn body's passives fire for the player exactly as they do for a foe. Self-timed
    // `every:N` clocks (Royal Rat summon, Wageslave heal) run via tickOwnTimers; the hourglass timer
    // fires the body's on-hourglass passive. Only the kit items stay manual (click-to-fire).
    tickOwnTimers(room, p); tickTimers(room, p, p.lane);
    tickEchoBar(p, false);  // a full bar lights the ECHO button — arming is the player's call
    if (body?.cd > 0) {
      p.charge = (p.charge ?? 0) + 1;
      if (p.charge >= body.cd) { p.charge = 0; runPassive(room, p, "hourglass"); }
    }
  }

  for (let i = 0; i < room.laneCount; i++) {
    for (const e of [...room.lanes[i]]) { // copy: passives/summons may grow the lane mid-tick
      e.side = "foe"; e.lane = i;
      tickBuffs(e);
      if (room.freezeFoes > 0) continue;  // ⏳ Time Stop: the whole foe machine stands still
      tickRegens(e); tickBloodToIron(e); tickPoison(room, e, i);  // ongoing card effects, foe side (symmetry)
      // CARD CAST (symmetric, CARDS_SPEC §5): charge moxie, then cast the FRONT queue card if
      // affordable — one per tick — and cycle it to the back. (Body passives still run below.)
      { const _em0 = e.moxie ?? 0; regenMoxie(e, 1 + (hasBuff(e, "haste") ? 1 : 0)); gainTriggerPassives(room, e, (e.moxie ?? 0) - _em0); }
      foeCast(room, e);
      // per-passive independent timers: a passive carrying `every:N` runs on its OWN
      // clock, decoupled from the body timer and from anything the players do — so a
      // body can ramp every 3.5s AND heal every 5s at their own cadences (visible ramps).
      tickOwnTimers(room, e); tickTimers(room, e, i);
      tickEchoBar(e, true);   // a foe echo body auto-arms on a full bar — no hands, no button
      // a lane-bound boss (the Djinn) runs its mechanics on boss clocks, not passives
      if (e.clocks) tickBossClocks(room, e);
      // body timer: on completion, fire its (non-self-timed) hourglass passives. Foes
      // have NO base swing — damage comes from items and passives, like players.
      e.charge++;
      if (e.charge < BODIES[e.bodyKey].cd * (e.cdMul ?? 1)) continue; // enchant may hasten
      e.charge = 0;
      runPassive(room, e, "hourglass"); // e.g. Royal Rat summons; an attacker strikes
    }
  }

  // friendly summons: same timing rules, but they attack the front FOE in their lane
  for (let i = 0; i < room.laneCount; i++) {
    for (const al of [...room.allies[i]]) {
      al.side = "hero"; al.lane = i;
      tickBuffs(al);
      if (room.freezeHeroes > 0) continue;        // a foe Time Stop freezes the hero side — summons too
      tickRegens(al); tickBloodToIron(al); tickPoison(room, al, i);
      // SUMMON CASTING (owner 2026-06-24): a token with a queue (e.g. a rat's Bite) earns moxie and
      // casts at the FRONT FOE in its lane — exactly as a foe casts at the front hero (foeCast is
      // side-agnostic; resolveOps branches on side). Tokens with no queue (auras) just stand.
      if (al.queue?.length) { regenMoxie(al, 1); foeCast(room, al); }
      tickOwnTimers(room, al); tickTimers(room, al, i); // self-timed passives (largeRat/knight) + card timers (owner 2026-06-27)
      if (BODIES[al.bodyKey]?.cd > 0) {           // summoner allies fire on their body clock
        al.charge = (al.charge ?? 0) + 1;
        if (al.charge >= BODIES[al.bodyKey].cd) { al.charge = 0; runPassive(room, al, "hourglass"); }
      }
    }
  }

  // the BACK-LINE boss (Hydra/Lich/Kraken) ticks its clocks from behind the lanes
  if (bossAlive(room)) {
    room.boss.side = "foe"; tickBuffs(room.boss);
    if (!(room.freezeFoes > 0)) { tickPoison(room, room.boss, room.boss.lane | 0); tickBossClocks(room, room.boss); }  // ⏳ Time Stop freezes bosses too
  }

  if (!(room.freezeFoes > 0)) processRoomTimers(room); // Acid Rain / Rat Colony freeze with the foes

  const enemiesLeft = room.lanes.reduce((n, l) => n + l.length, 0) + (bossAlive(room) ? 1 : 0);
  const heroesAlive = [...room.players.values()].some((p) => p.alive);
  const alliesLeft = room.allies.reduce((n, l) => n + l.length, 0);
  if (enemiesLeft === 0) {
    room.phase = "won";
    // Clearing a room patches the party back up — full heal + revive any downed heroes,
    // so you head into the loot/next-room screen whole.
    for (const p of room.players.values()) { p.alive = true; p.downTimer = 0; p.hp = p.maxHp; }
    // Loot = the cards the felled foes carried. A shared scarce set claimed FREE into the backpack
    // (owner 2026-06-24: no gold). Card VALUE is the only resource — loot is simply the cards on offer.
    const gear = (room.draftedFoes ?? []).flatMap((f) => f.gear ?? []).filter((k) => KIT[k]);
    room.loot = gear;
    room.lastRoomValue = roomValue(room);   // display only (the ante sum) — no gold is credited
    const cur = currentNode(room);
    if (cur && cur.type === "boss") {
      cur.cleared = true; room.levelComplete = true;
      if ((room.floor ?? 1) >= THRONE_FLOOR) room.runWon = true;  // the King fell — RUN COMPLETE
      // BOSS PAYDAY: a guaranteed shelf of rare cards (free to claim into the backpack — no gold)
      room.loot = [...room.loot, ...rollBossLoot(room)];
    }
    // owner 2026-06-24: a SINGLE player just COLLECTS the room's loot straight into the backpack
    // (no claim screen) — cards arrive innately into the backpack (NOT the deck; the deck is chosen).
    // (Multiplayer keeps the shared-claim model.)
    if (room.players.size === 1) {
      const solo = [...room.players.values()][0];
      for (const k of room.loot) if (KIT[k]) (solo.backpack ??= []).push(k);
      room.loot = [];
    }
  }
  // THE SOLE LOSS (owner 2026-06-27, caravan deleted): you are in the run as long as ANY of your
  // combatants — a player body OR a summon — is alive. A lone surviving rat-stack keeps you in. The
  // party loses only when EVERY player body AND EVERY summon is defeated. (Checked AFTER the win
  // above, so an ally that clears the board on its dying tick still scores the win.)
  else if (!heroesAlive && alliesLeft === 0) { room.phase = "lost"; if (!room._endLogged) { room._endLogged = true; clog(room, "═══ YOUR PARTY FALLS ═══"); } }

  // (Anti-stall auto-LOSS removed 2026-06-24 — owner: "not needed." A slow fight no longer times out
  // into a surprise loss; the deadlock guard above still ends a genuinely wiped party. STALL_LIMIT is
  // kept exported only for the QA driver's stuck-detection.)
}

// ---------------------------------------------------------------------------
// Snapshot (client state)
// ---------------------------------------------------------------------------
// The client only needs each body's DISPLAY fields (name/color/stats/passiveText/
// tempo). Strip the internal `passive` op-trees and the `spawn` flag so we don't ship
// (or leak) the whole mechanic definition ~10×/sec — the bulk of the per-tick payload.
const publicBody = ({ passive, spawn, ...rest }) => ({ ...rest, maxHp: bodyMaxHp(rest) });
// BODIES is static, so build the public projection ONCE and reuse it every snapshot
// (it was rebuilt 10×/sec/room). The only live input is the HP knob — rebuild on change.
let _publicBodies = null, _publicBodiesMult = null;
export const publicBodies = () => {
  if (!_publicBodies || _publicBodiesMult !== getHpMult()) {
    _publicBodies = Object.fromEntries(Object.entries(BODIES).map(([k, b]) => [k, publicBody(b)]));
    _publicBodiesMult = getHpMult();
  }
  return _publicBodies;
};

// THE CARD DESCRIPTOR (owner 2026-06-24) — the single shape the client renders for any card, used
// for the backpack, the deckList, the shop wares, and loot. `value` = itemTreasure (the only
// resource), `cost` = the moxie cost for THIS body (discount baked in), `dmg` = headline label,
// `ranged` = whether the reticle drives it. Pass the wearer's body so the cost is the live one.
export const cardDescriptor = (key, body = null) => ({
  key, name: KIT[key]?.name ?? key, text: KIT[key]?.text ?? "",
  value: itemTreasure(key), color: KIT[key]?.color ?? null,
  cost: cardCost(key, body), dmg: cardDmgLabel(key), ranged: isRanged(key), kind: cardKind(key),
});

// ACTIVE-EFFECT chips (owner 2026-06-24): the timed/ongoing buffs a combatant is CARRYING, each as
// { icon, label, left, dur } — the client draws a small icon with a countdown ring (when timed) and a
// hover label. Innate body passives are NOT listed here (always-on; shown as the card's passive text).
const BUFF_META = {
  power:      { icon: "💪", label: "Power" },
  swordPower: { icon: "💪", label: "Power" },
  haste:      { icon: "⏩", label: "Haste — moxie 2× faster" },
  stoneskin:  { icon: "🪨", label: "Stoneskin — less damage taken" },
  slow:       { icon: "🐌", label: "Slow — moxie charges at half rate" },     // debuff (owner 2026-06-27)
  weakness:   { icon: "📉", label: "Weakness — deals half damage (round up)" }, // debuff (owner 2026-06-27)
};
export function entityEffects(c) {
  const out = [];
  for (const b of (c.buffs ?? [])) {
    const m = BUFF_META[b.kind] ?? { icon: "✦", label: b.kind };
    out.push({ icon: m.icon, label: `${m.label}${b.amount ? ` +${b.amount}` : ""}`, left: b.left, dur: b.dur ?? b.left });
  }
  if (c.bloodToIron) out.push({ icon: "🩸", label: `Blood To Iron — ${c.bloodToIron.stored} hit(s) counted, repays 1 shield each`, left: c.bloodToIron.left, dur: c.bloodToIron.dur ?? c.bloodToIron.left });
  if ((c.poison ?? 0) > 0) out.push({ icon: "☠", label: `Poison ×${c.poison} — ${c.poison} dmg every ${Math.round(POISON_PERIOD / 10)}s`, left: POISON_PERIOD - (c.poisonClock ?? 0), dur: POISON_PERIOD });   // poison DoT chip (owner 2026-06-27)
  for (const g of (c.regens ?? [])) {
    const heal = (g.kind ?? "heal") === "heal";
    out.push({ icon: heal ? "💚" : "🛡", label: `Regen — +${g.amount} ${heal ? "heal" : "shield"} every ${Math.round((g.period ?? 30) / 10)}s`, left: null, dur: null });
  }
  // card-granted TIMERS (Pet Leech, Animated Blade) — lasting drains/strikes on the CASTER. These are
  // not foe debuffs (the effect lives on you), but they DID show no chip at all before (entityEffects
  // skipped c.timers); surface them like regens so the player can see the ongoing effect. (owner 2026-06-29)
  for (const tm of (c.timers ?? [])) {
    const op = (tm.ops ?? [])[0] ?? {};
    const secs = Math.round((tm.period ?? 60) / 10), amt = op.amount ?? 1;
    out.push(op.lifesteal
      ? { icon: "🩸", label: `Drain — ${amt} dmg + heal ${amt} every ${secs}s`, left: null, dur: null }
      : { icon: "⏱", label: `Strike — ${amt} dmg every ${secs}s`, left: null, dur: null });
  }
  if ((c.thorns ?? 0) > 0) out.push({ icon: "🌵", label: `Thorns — attackers take ${c.thorns}`, left: null, dur: null });
  return out;
}

// The deal op that governs a foe's NEXT attack: the front queued card's deal, else its first
// damaging body passive (attack/deal/schoolStrike/dealEachLane). Drives the target telegraph.
function foeFrontDealOp(e) {
  const fc = (e.queue ?? [])[0];
  if (fc) { const d = (KIT[fc.key]?.ops ?? []).find((o) => o.do === "deal"); if (d) return d; }
  for (const p of BODIES[e.bodyKey]?.passive ?? []) {
    const d = (p.ops ?? []).find((o) => FOE_DMG_OPS.has(o.do));
    if (d) return d;
  }
  return null;
}
// TARGET TELEGRAPH (owner spec 2026-06-27): the PLAYER id(s) a foe's next/primary attack lands on
// RIGHT NOW — the client draws a small portrait circle on each. Mirrors the resolver's routing:
// ranged (pick) snipes the weakest player; melee front/front2 hits the front PLAYER of its own
// (breach-resolved) lane IF that front is a player (a summon blocker shows no circle — not a player);
// lane/eachLane AoE marks every player it would hit. Returns an array of player ids (often 0 or 1).
export function foeTelegraph(room, e) {
  const op = foeFrontDealOp(e);
  if (!op) return [];
  const li = e.lane | 0;
  const isPlayer = (c) => !!(c && room.players?.has?.(c.id));
  if (op.do === "dealEachLane") {
    const out = [];
    for (let l = 0; l < (room.laneCount ?? room.lanes.length); l++) { const f = laneLine(room, l)[0]; if (isPlayer(f)) out.push(f.id); }
    return out;
  }
  if (op.target === "lane") return heroesInLane(room, li).map((p) => p.id);
  if (foeOpSnipes(op)) { const t = lowestEHpPlayer(room, li); return t ? [t.id] : []; }
  let line = laneLine(room, li);
  if (!line.length) { const rl = nearestDefendedLane(room, li); if (rl < 0) return []; line = laneLine(room, rl); }
  return line.slice(0, op.target === "front2" ? 2 : 1).filter(isPlayer).map((c) => c.id);
}

export function snapshot(room) {
  return {
    type: "state",
    phase: room.phase,
    god: !!room.god,
    tick: room.tick,
    floor: room.floor ?? 1,
    runWon: !!room.runWon,                // King Mimic fell — the run is complete (victory screen)
    freeze: room.freezeFoes ?? 0,         // ⏳ Time Stop ticks left on the foe side (HUD badge)
    laneCount: room.laneCount ?? LANES,   // N columns for the renderer (= player count, 1–4)
    lanes: room.lanes.map((arr, i) => ({
      enemies: arr.map((e) => ({
        id: e.id, bodyKey: e.bodyKey, name: e.name ?? BODIES[e.bodyKey]?.name ?? e.bodyKey, level: e.level ?? 1, hp: e.hp, maxHp: e.maxHp, shield: e.shield ?? 0, charge: e.charge,
        cd: Math.round((BODIES[e.bodyKey]?.cd ?? 0) * (e.cdMul ?? 1)),
        threat: foeThreat(room, e),     // {frac, cd} soonest INCOMING damage — drives border heat + AoE alarm
        threats: foeThreats(room, e),   // ALL damaging clocks (one labeled, color-coded bar each)
        tgtPids: foeTelegraph(room, e), // TARGET TELEGRAPH: which PLAYER(s) this foe's next attack hits → on-player portrait circle
        portrait: e.bodyKey,            // the sprite the telegraph circle shows (this foe's face)
        reactive: (BODIES[e.bodyKey]?.passive ?? []).some((p) => p.on === "damaged" && opsHarm(p.ops)), // hits back when struck (no clock)
        tags: bodyTags(e.bodyKey),      // ⚡ trigger labels (on sword/staff/when hit) — no clock, shown as tags
        dr: itemDmgReduce(e) + buffAmt(e, "stoneskin"),  // worn DR + Stone Skin → 🛡 badge
        passive: e.passiveText ?? BODIES[e.bodyKey]?.passiveText ?? null,
        boss: !!BODIES[e.bodyKey]?.boss,
        aoe: (BODIES[e.bodyKey]?.passive ?? []).some((p) => (p.ops ?? []).some((o) => o.do === "dealEachLane"))
          || (e.clocks ?? []).some((k) => k.aoe), // telegraph: hits EVERY lane (Djinn's scorch clock too)
        warded: !!BODIES[e.bodyKey]?.ward && foeCount(room) > 1, // King Mimic: untouchable until its court falls
        atk: effPhys(e), phys: effPhys(e), mag: effMag(e), counters: e.counters ?? 0, meleeBonus: meleeBonusOf(e), rangedBonus: rangedBonusOf(e),
        thorns: e.thorns ?? 0,                              // spikes buff → 🌵 badge
        effects: entityEffects(e),                          // active timed/ongoing buffs → icon+ring chips
        aura: BODIES[e.bodyKey]?.aura ?? null,              // foe-side Totem/Flag token badge
        // CARD CAST (CARDS_SPEC §6): moxie + the ordered queue (front casts first) + a "casts soon"
        // fraction = moxie / front-card cost. Replaces the cooldown charge for card casting.
        moxie: e.moxie ?? 0, moxieMax: MOXIE_CAP,
        queue: (e.queue ?? []).map((c, qi) => {
          const dop = (KIT[c.key]?.ops ?? []).find((o) => o.do === "deal" && (o.amount ?? 0) > 0);
          // LIVE: a queued hit reads boosted off the FOE's OWN bonus (a ramped foe's queued cards read
          // gold too). allies = OTHER foes in this lane (mirror of the perAlly foe-side resolver).
          const foeAllies = Math.max(0, (arr?.length ?? 1) - 1);
          const live = cardLiveDmg(c.key, e, foeAllies);
          const hits = live.count ?? 1;
          return {
            key: c.key, name: KIT[c.key]?.name ?? c.key, cost: foeCardCost(c.key, BODIES[e.bodyKey], room),
            type: KIT[c.key]?.type ?? null, color: KIT[c.key]?.color ?? null, dmg: cardDmgLabel(c.key),
            dmgNow: live.label, boosted: live.boosted, dmgGlyph: live.glyph, front: qi === 0,
            hit: dop ? live.now * hits : null,  // TOTAL live damage (per-hit × hit count) — owner 2026-06-27: a 4-hit Omnislash now reads its real total (−8), not one hit (−2)
            hits,                               // hit count, so the UI can show the ×N multiplier
            tgt: dop?.target ?? null,           // where it lands (front / front2 / lane / pick) → the foe-target icon
          };
        }),
        castFrac: (() => { const f = (e.queue ?? [])[0]; return f ? Math.min(1, (e.moxie ?? 0) / Math.max(1, foeCardCost(f.key, BODIES[e.bodyKey], room))) : 0; })(),
        gear: (e.equipment ?? []).map((it) => ({
          key: it.key, name: KIT[it.key]?.name ?? it.key, text: KIT[it.key]?.text ?? "", spent: !!it.spent,
          color: KIT[it.key]?.color ?? null, passive: isPassiveItem(it.key),
        })),
      })),
      // SUMMONS render PLAYER-SIZED now (owner 2026-06-27) — the client draws a full circle +
      // nameplate + passive/stat line like a hero/foe, so a Hedgefund Knight shows its card, passive
      // and stats. Carry the full display payload (a rat-stack reports its live "N rats" name + count).
      allies: (room.allies?.[i] ?? []).map((a) => ({
        bodyKey: a.bodyKey, hp: a.hp, maxHp: a.maxHp,
        name: a.name ?? BODIES[a.bodyKey]?.name ?? a.bodyKey,
        color: BODIES[a.bodyKey]?.color ?? "#3ec98a",
        depth: a.depth ?? 0,                      // tokens sit IN the lane's unified line now
        aura: BODIES[a.bodyKey]?.aura ?? null,    // aura tokens get a distinct ring client-side
        ratCount: a.ratStack ? (a.ratCount ?? 1) : null, // a merged rat-stack: how many rats
        shield: a.shield ?? 0,
        phys: effPhys(a), mag: effMag(a),         // its stats (rat-stack bite rides phys/counters)
        passive: a.passiveText ?? BODIES[a.bodyKey]?.passiveText ?? null,
        threats: foeThreats(room, a),             // its own clock bars (largeRat/knight attack timers)
        // CARD CAST (owner 2026-06-29): summons read like foes now — moxie + the front card it's banking
        // toward + a "casts soon" fraction = moxie / front-card cost, so you see WHAT it plays and WHEN.
        moxie: a.moxie ?? 0,
        castFrac: (() => { const f = (a.queue ?? [])[0]; return f ? Math.min(1, (a.moxie ?? 0) / Math.max(1, cardCost(f.key, BODIES[a.bodyKey]))) : 0; })(),
        // the card it casts (Hedgefund Knight / rat Bite) — front-of-queue name + ⚡cost + live damage
        queue: (a.queue ?? []).slice(0, 1).map((c) => ({
          name: KIT[c.key]?.name ?? c.key, dmg: cardDmgLabel(c.key), color: KIT[c.key]?.color ?? null,
          dmgNow: cardLiveDmg(c.key, a, 0).label, cost: cardCost(c.key, BODIES[a.bodyKey]),
        })),
      })),
    })),
    // THE BACK-LINE BOSS — the wide foe-side banner the renderer draws behind the foe rows.
    // behind the foe rows. Stance telegraphs + every mechanic clock ride along as bars.
    boss: bossAlive(room) ? {
      id: room.boss.id, bodyKey: room.boss.bodyKey,
      name: BODIES[room.boss.bodyKey]?.name ?? room.boss.bodyKey,
      hp: room.boss.hp, maxHp: room.boss.maxHp,
      color: BODIES[room.boss.bodyKey]?.color ?? "#ffd24a",
      passive: BODIES[room.boss.bodyKey]?.passiveText ?? null,
      stance: room.boss.stance ?? null,
      stanceLabel: room.boss.stance === "objection" ? "⚖ OBJECTION — capped at 1"
                 : room.boss.stance === "recess" ? "recess — bleed it" : null,
      headWave: room.boss.headWave ?? null,         // Hydra: how many heads the NEXT clock brings
      tentacleCap: room.boss.tentacleCap ?? null,   // Kraken: the wall it replenishes to
      threats: foeThreats(room, room.boss),         // its clocks as labeled, color-coded bars
    } : null,
    map: room.level
      ? (() => {
          // foe → a light PREVIEW descriptor (owner 2026-06-28: "show what is actually inside" the rooms),
          // now incl. the foe's DECK — its gear cards, GROUPED to {key,name,count} (owner 2026-06-29).
          // each grouped deck card also carries its KIT description `text` so the room-preview chips
          // can show the full card text on hover/tap (owner 2026-06-29) — reuses the authored KIT copy.
          const _foeDeck = (f) => {
            const out = [], seen = new Map();
            for (const k of (f.gear ?? [])) {
              let g = seen.get(k);
              if (!g) { g = { key: k, name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "", cost: KIT[k]?.cost ?? null, count: 0 }; seen.set(k, g); out.push(g); }
              g.count++;
            }
            return out;
          };
          // `passive` = the SAME readable string the live foe-state serializer ships (see enemies[].passive
          // below): the body's authored passiveText, so the preview tooltip matches the in-fight tooltip.
          const _foePrev = (f) => ({ bodyKey: f.bodyKey, name: BODIES[f.bodyKey]?.name ?? f.bodyKey,
            level: foeLevel(f), maxHp: foeMaxHpFor(f.bodyKey, foeLevel(f)), ante: anteOfFoe(f),
            passive: f.passiveText ?? BODIES[f.bodyKey]?.passiveText ?? null, deck: _foeDeck(f) });
          const _rowOf = (n) => n.row ?? 0;
          const _rowCount = Math.max(0, ...room.level.nodes.map(_rowOf)) + 1;
          const _cur = room.level.nodes.find((n) => n.id === room.level.currentId);
          const _currentRow = _cur ? _rowOf(_cur) : 0;
          const _boss = room.level.nodes.find((n) => n.type === "boss");
          const _bossRow = _boss ? _rowOf(_boss) : _rowCount - 1;
          return { // each combat/elite node previews its ROOM ANTE (floor × party, ×2 elite) AND the ACTUAL
            // pre-built roster INSIDE it, so you can SEE the next room before choosing it. Room effects gone.
            // Elite rooms are FREE to enter now (owner 2026-06-28) — the elite cost moved to body adoption.
            nodes: room.level.nodes.map((n) => ({
              id: n.id, type: n.type, x: n.x, y: n.y, links: n.links, cleared: !!n.cleared, row: _rowOf(n),
              ante: (n.type === "combat" || n.type === "elite") ? roomAnteBudget(room, n.type) : null,
              ...((n.type === "combat" || n.type === "elite") ? { contents: (n.foes ?? []).map(_foePrev) } : {}),
              ...(n.gimmick && GIMMICKS[n.gimmick] ? { gimmick: GIMMICKS[n.gimmick].name, gimmickBlurb: GIMMICKS[n.gimmick].blurb } : {}),
            })),
            currentId: room.level.currentId, levelComplete: !!room.levelComplete,
            // BOSS COUNTER (owner 2026-06-28): rooms remaining until this floor's boss.
            rowCount: _rowCount, currentRow: _currentRow,
            // the trailhead "start" row isn't a room, so don't count it toward the boss (owner 2026-06-29).
            roomsToBoss: Math.max(0, _bossRow - _currentRow - (room.level.nodes.some((n) => n.type === "start") ? 1 : 0)),
            bossName: BODIES[bossForFloor(room, room.floor ?? 1)]?.name ?? null }; })() // run-seeded preview: the floor's boss by name
      : null,
    // CO-OP ROOM VOTE (owner 2026-06-28): on the won screen, who voted for which next-room node
    // (each voter's seat id + name + body icon/color + lock state), grouped by node id, plus the
    // lock progress. Null off the won screen and in solo (1 seat resolves instantly — no vote UI).
    roomVotes: (room.phase === "won" && room.level && !room.levelComplete) ? (() => {
      const seats = humanSeats(room);
      if (seats.length < 2) return null;                 // solo: instant-resolve, no badges/locks
      const votes = room.roomVotes ?? {}, locks = room.roomLocks ?? {};
      const byNode = {};
      for (const s of seats) {
        const to = votes[s.id];
        if (to == null) continue;
        (byNode[to] ??= []).push({ seat: s.id, name: s.name, bodyKey: s.bodyKey,
          color: BODIES[s.bodyKey]?.color ?? "#9ad", locked: !!locks[s.id] });
      }
      return { byNode, seatCount: seats.length, lockedCount: seats.filter((s) => locks[s.id]).length };
    })() : null,
    unlockedBodies: [...room.unlockedBodies].filter((k) => k !== STARTER_BODY), // never offer the Rookie Mimic as a swap (owner 2026-06-24)
    bodies: publicBodies(),
    // ELITE BODY ADOPTION (owner 2026-06-28): the flat card-VALUE price to ADOPT a non-starter body the
    // first time you wear it; once adopted it's in `adopted` and free. The WEAR screen shows the price and
    // tenders cards (send `swapBody {to, pay:[keys]}`); the server re-validates the value covers `cost`.
    adopt: { cost: ADOPT_COST, adopted: [...(room.adoptedBodies ?? [])] },
    roomValue: room.lastRoomValue ?? 0,   // the last room's ante sum (display only — no gold)
    loot: room.phase === "won" && room.loot?.length ? {
      cards: room.loot.map((k) => cardDescriptor(k)),   // claimable cards (free into the backpack)
    } : null,
    // pending player-to-player trade offers (out of combat only) — a straight card-for-card swap
    trade: tradeable(room) ? {
      offers: (room.tradeOffers ?? []).map((o) => ({
        id: o.id, from: o.from, to: o.to,
        fromName: room.players.get(o.from)?.name ?? "?", toName: room.players.get(o.to)?.name ?? "?",
        give: o.give, giveName: KIT[o.give]?.name ?? o.give, giveVal: itemTreasure(o.give),
        want: o.want, wantName: KIT[o.want]?.name ?? o.want, wantVal: itemTreasure(o.want),
      })),
    } : null,
    // ELITE GIMMICK (owner 2026-06-29): the active room's modifier, surfaced so the client can banner it
    // during the fight (the room PREVIEW reads node.gimmick instead). Null in every non-elite room.
    gimmick: room.gimmick ? { name: room.gimmick.name, blurb: room.gimmick.blurb, key: room.gimmick.key } : null,
    // the gimmick's live room-wide clock (Acid Rain / Runaway Scaling) → the HUD shows a countdown chip.
    roomTimers: (room.roomTimers ?? []).map((t) => ({ kind: t.kind, cd: t.cd, frac: Math.min(1, (t.charge ?? 0) / Math.max(1, t.cd)) })),
    // SHOP — value-for-value (owner 2026-06-24): each ware is a card descriptor carrying its `value`;
    // the client pays by selecting owned cards whose summed value ≥ the ware's value. No gold/reroll fee.
    shop: room.phase === "shop" && room.shop ? {
      wares: (room.shop.wares ?? []).map((w) => cardDescriptor(w.key)),
    } : null,
    stock: room.phase === "stock" ? {
      max: STOCK_MAX,
      picksRequired: room.picksRequired ?? 1,         // DOUBLE FEATURE label only (gate is ante now)
      picks: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, picks: playerPicks(room, p.id) })),
      // COLLECTIVE DRAFT: the begin gate is the SHARED ante — once the drafted pool meets the room's
      // requirement (party × floor, ×2 elite), anyone can begin. Overshoot is allowed.
      anteRequired: room.anteRequired ?? 0,           // ⚖ the party must reach to begin
      canBegin: anteCurrent(room) >= (room.anteRequired ?? 0),
      anteStocked: anteCurrent(room),                 // total drafted weight (display)
      anteMin: room.anteMin ?? ANTE_MIN, anteCap: room.anteCap ?? ANTE_CAP_BASE, anteStep: ANTE_STEP, // the roll window + ratchet preview
      greedTreasure: room.draftedFoes.reduce((s, f) => s + foeLootValue(f), 0), // ITEM loot only
      palette: room.foePalette.map((o) => ({
        bodyKey: o.bodyKey, name: BODIES[o.bodyKey].name, level: foeLevel(o), maxHp: foeMaxHpFor(o.bodyKey, foeLevel(o)),
        phys: BODIES[o.bodyKey]?.phys ?? 0, mag: BODIES[o.bodyKey]?.mag ?? 0, // body Power — what its gear scales with
        ante: anteOfFoe(o),                 // ← THE BIG NUMBER (body gold + items)
        bodyAnte: bodyAnteOf(o),            // the body's own gold alone (also its adoption price)
        lootValue: foeLootValue(o),         // gear → Treasure if you don't claim it
        passive: BODIES[o.bodyKey]?.passiveText ?? null,
        gear: (o.gear ?? []).map((k) => ({ name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "" })),
      })),
      placed: (() => { const ln = placedLanes(room); return room.draftedFoes.map((f, i) => {
        const b = BODIES[f.bodyKey] ?? {};
        return {
          bodyKey: f.bodyKey, name: b.name ?? f.bodyKey, lane: ln[i], level: foeLevel(f),
          // full inspect payload — the stock screen's hover card reads these
          maxHp: foeMaxHpFor(f.bodyKey, foeLevel(f)), phys: b.phys ?? 0, mag: b.mag ?? 0,
          passive: b.passiveText ?? null,
          ante: anteOfFoe(f),
          bodyAnte: bodyAnteOf(f), lootValue: foeLootValue(f),
          gear: (f.gear ?? []).map((k) => ({ name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "" })),
          greedy: !!f.greedy, owner: f.owner ?? null,
        };
      }); })(),
    } : null,
    draft: room.phase === "draft" ? {
      // THE WHEEL — the live draft: lowest-power bodies, each with a 3-item bundle; lock one
      // exclusively. `lockedBy` is the player id holding it (off-limits to everyone else).
      wheel: (room.draftWheel ?? []).map((b) => ({
        id: b.id, bodyKey: b.bodyKey, name: BODIES[b.bodyKey].name, maxHp: BODIES[b.bodyKey].maxHp,
        color: BODIES[b.bodyKey].color, passive: BODIES[b.bodyKey]?.passiveText ?? null,
        lockedBy: [...room.players.values()].find((p) => p.lockedBundle === b.id)?.id ?? null,
        items: b.items.map((k) => ({ key: k, name: KIT[k].name, text: KIT[k].text, cd: KIT[k].cd })),
      })),
      picks: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, drafted: !!p.drafted, bundle: p.lockedBundle ?? null })),
      // legacy class options (back-compat: chooseClass / older UIs still work)
      classes: Object.entries(CLASSES).map(([key, c]) => ({
        key, name: c.name, blurb: c.blurb,
        body: { name: BODIES[key].name, maxHp: BODIES[key].maxHp, atk: BODIES[key].phys ?? 0, phys: BODIES[key].phys ?? 0, mag: BODIES[key].mag ?? 0, affinity: BODIES[key].affinity ?? null, cd: BODIES[key].cd, color: BODIES[key].color },
        kit: c.kit.map((k) => ({ key: k, name: KIT[k].name, text: KIT[k].text, cd: KIT[k].cd })),
      })),
    } : null,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, lane: p.lane, depth: p.depth ?? 0, targetId: p.targetId ?? null,
      allyTargetId: p.allyTargetId ?? null,                // support-slot aim (click an ally)
      thorns: p.thorns ?? 0,                               // Spikes buff badge
      effects: entityEffects(p),                           // active timed/ongoing buffs → icon+ring chips
      offline: !p.ws && !p.bot,                          // seat held, socket gone (bots are never "offline")
      owner: p.owner ?? p.id,                            // SQUAD: the seat that owns this body (itself for a lone player)
      bot: !!p.bot,                                      // a squad body the human isn't piloting right now (on AUTO)
      bodyKey: p.bodyKey, hp: p.hp, maxHp: p.maxHp, shield: p.shield ?? 0, counters: p.counters ?? 0, meleeBonus: meleeBonusOf(p), rangedBonus: rangedBonusOf(p), alive: p.alive,
      level: runLevelOf(p), nextLevelCost: levelUpCost(runLevelOf(p) + 1),   // PLAYER LEVELING (owner 2026-06-29): the player's RUN-WIDE level + cost to level once more (drives the pay-picker)
      phys: p.phys ?? 0, mag: p.mag ?? 0, dr: itemDmgReduce(p) + buffAmt(p, "stoneskin"),  // worn DR + Stone Skin
      passive: BODIES[p.bodyKey]?.passiveText ?? null, tags: bodyTags(p.bodyKey), // your worn body's effect + ⚡ triggers
      bodyThreats: foeThreats(room, p),                          // your body's own timer bars (Royal Rat/Wageslave)
      classKey: p.classKey ?? null,
      summonSide: p.summonSide ?? "front",               // where YOUR summons enter the line
      autoFire: !!p.autoFire,                            // ⚡ AUTO: ready damaging items fire themselves
      echo: BODIES[p.bodyKey]?.echo ?? null,             // worn echo body's school (drives the ECHO button)
      echoReady: !!p.echoReady, echoArmed: !!p.echoArmed,
      bodySummons: [].concat(BODIES[p.bodyKey]?.passive ?? [])  // a worn summoner body shows the toggle too
        .some((ps) => (ps.ops ?? []).some((o) => o.do === "summon")),
      // BACKPACK + DECK (owner 2026-06-24): the full owned repo and the chosen combat deck, each a
      // list of card descriptors. The client wave builds the deckbuilder against THESE two fields.
      backpack: (p.backpack ?? []).map((k) => cardDescriptor(k, BODIES[p.bodyKey])),
      deckList: (p.deckList ?? []).map((k) => cardDescriptor(k, BODIES[p.bodyKey])),
      deckSize: (p.deckList ?? []).length, minDeck: MIN_DECK,   // floor display for the editor
      // CARD/MOXIE (CARDS_SPEC §6): moxie + the face-up HAND (client plays by id) + draw-pile size.
      moxie: p.moxie ?? 0, moxieMax: MOXIE_CAP,
      hand: (p.hand ?? []).map((c) => {
        const cc = cardCost(c.key, BODIES[p.bodyKey]);   // body discount baked in
        // LIVE damage (owner 2026-06-25): the snapshot sends the value THIS caster deals RIGHT NOW, so the
        // client paints gold without recomputing. allies = OTHER heroes + ally-summons in the player's lane
        // (mirrors the perAlly resolver count); ofShield reads the player's current shield.
        const allies = Math.max(0, heroesInLane(room, p.lane).length - 1) + (room.allies?.[p.lane]?.length ?? 0);
        const live = cardLiveDmg(c.key, p, allies);
        return { id: c.id, key: c.key, name: KIT[c.key]?.name ?? c.key, text: KIT[c.key]?.text ?? "",
          cost: cc, value: itemTreasure(c.key), type: KIT[c.key]?.type ?? null, color: KIT[c.key]?.color ?? null,
          dmg: cardDmgLabel(c.key), dmgNow: live.label, boosted: live.boosted, dmgBase: live.base, dmgGlyph: live.glyph,
          ranged: isRanged(c.key), kind: cardKind(c.key), summons: (KIT[c.key]?.ops ?? []).some((o) => o.do === "summon"),
          affordable: (p.moxie ?? 0) >= cc };
      }),
      deckCount: (p.deck ?? []).length,
      // DECK PANEL (owner 2026-06-25): the live draw-pile + lasting-in-play cards, so the side panel
      // can show the whole deck with drawable cards BRIGHT and not-currently-drawable ones (in hand /
      // in play) greyed. Light descriptors (key/name/cost/color/kind) — enough to render a tile.
      drawPile: (p.deck ?? []).map((c) => ({ key: c.key, name: KIT[c.key]?.name ?? c.key, cost: cardCost(c.key, BODIES[p.bodyKey]), color: KIT[c.key]?.color ?? null, kind: cardKind(c.key), dmg: cardDmgLabel(c.key) })),
      inPlayCards: (p.inPlay ?? []).map((c) => ({ key: c.key, name: KIT[c.key]?.name ?? c.key, cost: cardCost(c.key, BODIES[p.bodyKey]), color: KIT[c.key]?.color ?? null, kind: cardKind(c.key), dmg: cardDmgLabel(c.key) })),
      inv: p.inv.map((inv) => ({
        key: inv.key, name: KIT[inv.key].name, text: KIT[inv.key].text, type: KIT[inv.key].type ?? null,
        ranged: isRanged(inv.key),             // 🎯 badge: the reticle drives this item
        color: KIT[inv.key].color ?? null, passive: isPassiveItem(inv.key), dr: KIT[inv.key]?.passive?.dr ?? 0,
        fragile: !!KIT[inv.key].fragile, spent: !!inv.spent,
        summons: (KIT[inv.key].ops ?? []).some((o) => o.do === "summon"), // shows the front/behind toggle

        stolen: !!inv.stolen,                  // Kraken lock — the slot renders STOLEN until its entity dies
        charge: inv.charge, cd: itemCd(inv, BODIES[p.bodyKey]), ready: !inv.spent && !inv.stolen && inv.charge >= itemCd(inv, BODIES[p.bodyKey]),
      })),
    })),
    // COMBAT LOG — only shipped when the fight is OVER (never streamed every tick).
    combatLog: (room.phase === "lost" || room.phase === "won") ? (room.combatLog ?? []) : undefined,
  };
}
