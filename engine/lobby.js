// King Mimic engine — session & room runtime (extracted from game.js barrel).
// Broader than "lobby": also holds foe-generation, boss machinery, and room-building (buildRoom/formUp),
// which the module map left unassigned — grouping them here yields a pure-barrel game.js and avoids
// risky scattered slices. Owns _foeSeq / _offerSeq / _bundleSeq. Eval-time leaf reads (COMMON_SET/
// ELITE_SET/PLAYER_POOL/KIT) import from siblings; everything else imports from the barrel (call time).
import { COMMON_SET, ELITE_SET } from "./bodies.js";
import { KIT } from "./kit.js";
import { PLAYER_POOL } from "./cards.js";
import {
  ATLAS_REFLECT_PER,
  BODIES,
  BUFF_META,
  CLASSES,
  DRAFT_BODIES,
  DRAFT_MAX_PLAYERS,
  DRAFT_OFFERS_PER_PLAYER,
  DRAFT_PICKS,
  ECHO_CD,
  ECHO_DELAY,
  ELITE_BODY_ANTE,
  eliteBodyAnte,
  FOE_BASE_ANTE,
  FOE_DMG_OPS,
  FOE_LEVEL_MIN,
  FOE_START_MAX,
  FOE_START_MIN,
  GIMMICKS,
  GOD_CD,
  HAND_SIZE,
  KIT_POOL,
  LANES,
  LANE_FLOOR,
  LEVEL_ANTE_PER,
  LEVEL_COMBAT_PER_ODD,
  LEVEL_HP_PER_EVEN,
  MAX_KIT,
  MIN_DECK,
  MOXIE_CAP,
  MOXIE_REGEN_TICKS,
  MOXIE_SET,
  PASSIVE_BAR_COLOR,
  POISON_PERIOD,
  RAT_KEYS,
  ROOM_SIZE,
  SET_COMMONS,
  SHOP_WARES,
  STALL_LIMIT,
  STARTER_BODY,
  STARTER_DECK,
  START_MOXIE,
  STOCK_MAX,
  FOES_PER_LANE,
  absorbShield,
  accelClocks,
  addBuff,
  aimedFoe,
  anteCurrent,
  anteOfFoe,
  applyCombatStart,
  armEcho,
  atlasReflect,
  autoPlay,
  beginCombatMetrics,
  bodyAnteOf,
  bodyMaxHp,
  bodyTags,
  bodyValue,
  buffAmt,
  buildLevel,
  buildQueue,
  cardCost,
  cardDealInfo,
  cardDescriptor,
  cardDmgLabel,
  cardEventPassives,
  cardKind,
  cardLiveDmg,
  cardScaleGlyph,
  cdScale,
  clog,
  countKey,
  currentNode,
  cycleTarget,
  damageEnemy,
  damagePlayer,
  dealHand,
  dealtTriggerPassives,
  deckKeys,
  defaultCardCost,
  deriveLaneCount,
  descend,
  drainClocks,
  drawUp,
  echoDelay,
  effAtk,
  effMag,
  effPhys,
  effectiveDamageTo,
  ensureTarget,
  enterRoom,
  entityEffects,
  fireSchoolTrigger,
  foeCardCost,
  foeCast,
  foeCount,
  foeDealHit,
  foeHitFront2,
  foeHitLane,
  foeHitLaneAll,
  foeHitRanged,
  foeItemDmg,
  foeLevel,
  foeLootValue,
  foeMaxHpFor,
  foeOpSnipes,
  foeOpsDmg,
  foeTelegraph,
  foeThreat,
  foeThreats,
  gainTriggerPassives,
  getCdMult,
  getHpMult,
  hasBuff,
  heroesInLane,
  hitTriggerPassives,
  isCard,
  isPassiveItem,
  isRanged,
  itemDmgReduce,
  itemStatBonus,
  itemTreasure,
  itemsAnteOf,
  kindBonusOf,
  kindForOp,
  laneAura,
  laneHeroes,
  laneLine,
  levelAnte,
  levelCombatBonus,
  levelHpBonus,
  logNm,
  lowestEHpPlayer,
  meleeBonusOf,
  mintCard,
  mintCards,
  moveDepth,
  nearestDefendedLane,
  nodeById,
  opsHarm,
  playCard,
  playTriggerPassives,
  powerFor,
  publicBodies,
  rangedBonusOf,
  regenMoxie,
  resolveOps,
  rollShopWares,
  roomValue,
  runPassive,
  setAllyTarget,
  setCdMult,
  setHpMult,
  setTarget,
  shopPrice,
  shuffle,
  simulateTick,
  snapshot,
  spendTriggerPassives,
  stockLevelRooms,
  summonBodies,
  syncRatStack,
  targetedFoe,
  tickBloodToIron,
  tickBuffs,
  tickDjinnCounter,
  tickEchoBar,
  tickOwnTimers,
  tickPoison,
  tickRegens,
  tickTimers,
  triggerKind,
  useItem,
} from "../game.js";

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
export const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
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
  // NEW (owner 2026-07-10): Affluence Anubis — a pure SUMMONER, grouped ranged like the other summoners
  // (Fat Cat/Royal Rat/Paid Piper). FLAG (my derivation): only steers what GEAR a foe-Anubis auto-picks
  // (its identity is summoning, not casting), so this is low-stakes — omit it and it defaults to "flex".
  affluenceAnubis: "ranged",
};
// A body's archetype, falling back to its explicit affinity (player bodies) then "flex".
export const foeArchetype = (bodyKey) => FOE_ARCHETYPE[bodyKey]
  ?? (BODIES[bodyKey]?.affinity === "physical" ? "melee" : BODIES[bodyKey]?.affinity === "magical" ? "ranged" : "flex");
// An item's COMBAT FLAVOR for archetype-fit: "melee" / "ranged" / "util". Driven by cardKind for
// damaging cards, plus the melee/ranged BUFF ops (Berserker's melee ramp; Crystal Ball's ranged
// rider) so a ranged foe never grabs a melee-only buff and vice-versa. The MODAL buffs (Sharpened
// Edges / Demon Form, owner 2026-07-09) carry NEITHER a plain meleeBonus nor rangedBonus op — their
// `modalBonus` picks a kind AT CAST by body affinity — so they read as UTIL and FIT ANY body (a
// ranged foe auto-picks ranged, a melee foe melee). Everything else (shields, heals, summons,
// generic +damage, Sage Mode's heal) is pure utility → fits any body.
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

// ── LEVEL-UP DAMAGE TYPE (owner R4 2026-07-10) ──────────────────────────────────────────────────
// A level-up's +combat bonus lands on ONE damage type. A PLAYER now CHOOSES it (melee/ranged — the
// SAME modal pick Sharpened Edges / Demon Form use). A FOE has no reticle, so it AUTO-picks the type
// that most benefits its PASSIVE — read off FOE_ARCHETYPE (the owner's own melee/ranged/flex grouping
// of each body's passive damage flavor). A FLEX body has no innate identity, so it decides by its
// damaging KIT (foeCombatStat) — exactly as the pre-R4 behavior did. Kept player/foe SYMMETRIC: both
// go through the one function below; a foe/bot simply passes no `pick`.
// [FLAG — foe level-up damage-type map] archetype → the +combat type a leveling foe ramps. melee↦melee
// and ranged↦ranged mirror the passive's own flavor; FLEX is intentionally OMITTED so a flex foe falls
// to its kit. Owner's to re-cast (force a flex archetype onto a fixed side, or flip a body's ramp).
export const ARCHETYPE_LEVEL_DMG = { melee: "melee", ranged: "ranged" };   // FLAG — flex omitted on purpose → kit decides (owner to tune)
// The damage stat ("melee"|"ranged") a level-up's +combat bonus lands on. `pick` = a PLAYER's explicit
// choice (honored when "melee"/"ranged"); otherwise AUTO by archetype, a FLEX body falling to its
// damaging kit. Foes/bots pass no pick → always the archetype/kit auto-pick (symmetry with the player).
export function levelDamageType(bodyKey, gearKeys = [], pick = null) {
  if (pick === "melee" || pick === "ranged") return pick;                   // PLAYER choice wins (modal-pick parity)
  return ARCHETYPE_LEVEL_DMG[foeArchetype(bodyKey)] ?? foeCombatStat(bodyKey, gearKeys);  // FOE/auto: passive-first, flex→kit
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
// [RETIRED 2026-07-02 — elite ROOMS dissolved with ante v2] The one-day-old "elite rooms give every
// foe a 4th card" reward (2026-07-01) died with the elite room type; elite BODIES carry their
// premium in anteOfFoe (ELITE_BODY_ANTE) instead. Export kept for back-compat only.
export const ELITE_MIN_CARDS = FOE_MIN_CARDS + 1;
// Build a body's BASE kit of exactly `count` ARCHETYPE-FIT VALUE-1 cards (clamped to
// [FOE_MIN_CARDS, FOE_MAX_GEAR]). The generator budgets the mandatory kit as 3×1; richer cards may
// enter only through enrichFoeGear, which charges the exact 1→2/5 difference. This two-stage contract
// prevents a cheap foe from accidentally rolling above its allocated room ante.
export function rollFoeKit(bodyKey, count = FOE_MIN_CARDS, minCards = FOE_MIN_CARDS) {
  count = Math.max(minCards, Math.min(FOE_MAX_GEAR, count | 0 || minCards));
  // fitting cards: utility fits any body, and a DAMAGE card must both fit the archetype AND actually
  // threaten this body (no dud-damage cards like a base-0 Pile On on a 0/0 chassis — owner exploit rule).
  const fit = PLAYER_POOL.filter((k) => itemTreasure(k) === 1 && itemFitsArchetype(bodyKey, k)
    && (!(KIT[k].ops ?? []).some((o) => o.do === "deal") || itemThreatens(bodyKey, k)));
  const dmg = fit.filter((k) => (KIT[k].ops ?? []).some((o) => o.do === "deal"));
  const gear = [dmg.length ? rnd(dmg) : (fit.length ? rnd(fit) : "oSword")];  // slot 1: fitting + damaging
  while (gear.length < count) {
    const fresh = fit.filter((k) => !gear.includes(k));     // prefer distinct bars
    if (!fresh.length) break;                               // fitting pool dry → stop, the min pad covers it
    gear.push(rnd(fresh));
  }
  while (gear.length < minCards) gear.push(rnd(fit.length ? fit : ["oSword"]));  // never below the floor (allow dups)
  return gear;
}
// Roll a foe's gear: an ARCHETYPE-FIT kit sized off the floor. ITEM COUNT is still a difficulty lever
// (most foes light, a minority loaded), now with a hard FLOOR of FOE_MIN_CARDS (3). `primary` is kept
// for signature compatibility — the pool is derived from the body's archetype, not the arg.
export function rollFoeGear(bodyKey, primary, floor = 1) {
  // owner ruling 2026-07-12: EXACTLY FOE_MIN_CARDS. Card COUNT is retired as a difficulty lever — a
  // foe casts only its FRONT queue card, moxie-gated (foeCast), so cards past what it can cast in a
  // fight were pure free reward, never threat. The honest levers stay LEVELS and item QUALITY
  // (enrichFoeGear). `primary`/`floor` kept for the signature + callers.
  return rollFoeKit(bodyKey, FOE_MIN_CARDS);
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
// THE ROOM ANTE SCHEMA — ANTE V4 (owner 2026-07-13): every room rolls a VARIABLE budget based on
// "players × floors × 4 × (random variable of 1 to 3)". ANTE V4.1 (owner 2026-07-15): never
// roll below one legal foe. The effective range is therefore
// [max(party × floor × 4, minimum foe) … party × floor × 12]. This matters at solo floor 1:
// the old 4–6 rolls all normalized to the same ⚖7/◈3 fight and made the nominal range mostly fake.
// The rolled budget is spent on leveled, equipped foes (plus an optional
// room EFFECT that carries its own item pot) under a per-room SKEW, so two same-ante rooms can
// feel completely different. Elite ROOMS are dissolved — elite BODIES carry their premium in
// anteOfFoe instead. [FLAG for owner: implemented as a CONTINUOUS range after the legal-minimum
// clamp; if you meant DISCRETE tiers {4×PF, 8×PF, 12×PF}, say so and I'll switch the roll.]
export const ROOM_ANTE_BASE_PER = 4;    // base multiplier = 4×1 (owner 2026-07-03: "×4 × 1")
export const ROOM_ANTE_PEAK_PER = 12;   // peak multiplier = 4×3 (owner 2026-07-03: "×4 × 3")
export const roomAnteRange = (room) => {
  const pf = Math.max(1, (room.players?.size ?? 1)) * Math.max(1, (room.floor ?? 1));
  return [Math.max(ROOM_ANTE_BASE_PER * pf, minFoeAnte()), ROOM_ANTE_PEAK_PER * pf];
};
export const rollRoomAnte = (room) => {
  const [lo, hi] = roomAnteRange(room);
  return lo + Math.floor(Math.random() * (hi - lo + 1));   // uniform, inclusive
};
// Back-compat helper (old callers/tests): the PEAK of the range. The live path rolls per node.
export const ROOM_ANTE_BUDGET_PER = ROOM_ANTE_PEAK_PER;
export const roomAnteBudget = (room, type = currentNode(room)?.type) => roomAnteRange(room)[1];
// Rooms FILL to the ante (owner 2026-06-27: "a random selection of foes to EQUAL that ante"). The old
// "mini opponent" early-stop variance is retired — set > 0 to bring it back.
export const ROOM_FILL_STOP_CHANCE = 0;     // per-foe early-stop chance (0 = always fill to the ante)
export const FOE_LEVEL_CAP = 8;             // sanity ceiling on a single GENERATED foe's level (tunable)
export const PALETTE_OPTION_CAP = 11;       // a single optional greedy-add option's max ante (tunable)
// The cheapest a single generated foe can cost: +4 action/body base + 3 value-1 cards, level 1
// free = ⚖7 (owner 2026-07-13). Room budgets deliberately remain [4×PF, 12×PF].
export const minFoeAnte = (minCards = FOE_MIN_CARDS) => FOE_BASE_ANTE + minCards + levelAnte(FOE_LEVEL_MIN);

// ---------------------------------------------------------------------------
// ROOM SKEWS (owner 2026-07-02): "number of foes, levels, items, and bodies … each should be
// equally skewed so there is a diversity of experiences" — a high-level Mouse ≠ a kitted Mouse ≠
// two Mice. Every generated room rolls ONE skew deciding how its budget is spent:
//   swarm   → many minimal foes (COUNT is the lever)
//   veteran → few foes, the budget goes into LEVELS
//   arsenal → few foes, the budget goes into ITEMS (more cards + higher-value items)
//   bodies  → ELITE bodies (each carries the ELITE_BODY_ANTE premium)
//   mixed   → anything goes (the old free-form distribution)
// ---------------------------------------------------------------------------
export const ROOM_SKEWS = ["swarm", "veteran", "arsenal", "bodies", "mixed"];
// A skew only enters the roll when its defining lever can actually appear. Before this guard,
// solo floor 1 could roll `swarm` despite being unable to afford two foes, or `bodies` despite
// being unable to afford an elite; both silently collapsed back to the same plain ⚖7 setup.
export const roomSkewsForBudget = (budget = Infinity) => ROOM_SKEWS.filter((skew) =>
  (skew !== "swarm" || budget >= minFoeAnte() * 2)
  && (skew !== "bodies" || budget >= minFoeAnte() + ELITE_BODY_ANTE));
export const rollSkew = (budget = Infinity) => rnd(roomSkewsForBudget(budget));

// TEMPORARY owner-authored value bands (2026-07-13): every castable value-2–5 card is eligible for
// budgeted item-quality upgrades. This activates arsenal rooms and the boss rare shelf.
export const RICH_ITEM_POOL = Object.keys(KIT).filter((k) => (KIT[k]?.ops?.length ?? 0) > 0 && itemTreasure(k) >= 2);

// Upgrade up to `tries` of a foe's ◈1 cards to higher-value items within `budget` ante. Each upgrade
// swaps a common slot for an archetype-fit rich card and costs the value DIFFERENCE. FOE-side rich
// items are DAMAGING ONLY: a sustain/control rare on a foe (Trollskin / Stoneskin / Revive…) can
// out-heal the party into a never-resolving fight (the anti-stall guard is gone by owner decree,
// 2026-06-24) — fuzz caught exactly that. Players still receive the full rich variety as DROPS
// (rollCompItems). Returns the ante actually spent.
function enrichFoeGear(f, budget, tries = 1) {
  let spent = 0;
  for (let t = 0; t < tries && budget - spent > 0; t++) {
    const slot = f.gear.findIndex((g) => itemTreasure(g) <= 1);
    if (slot < 0) break;
    const fits = RICH_ITEM_POOL.filter((k) =>
      itemTreasure(k) - 1 <= budget - spent && !f.gear.includes(k)
      && (KIT[k].ops ?? []).some((o) => o.do === "deal")     // damaging only — never a sustain stall
      && itemFitsArchetype(f.bodyKey, k)
      && itemThreatens(f.bodyKey, k));
    if (!fits.length) break;
    const rich = rnd(fits);
    spent += itemTreasure(rich) - itemTreasure(f.gear[slot]);
    f.gear[slot] = rich;
  }
  return spent;
}

export const LEVEL_FLOOR_BASE = 2;   // a foe's level cap = LEVEL_FLOOR_BASE + floor (then clamped) (tunable)
// Roll ONE leveled, archetype-fit foe whose total ante ≤ maxAnte, under a SKEW. The elite-body
// premium (eliteBodyAnte) is charged off the top; then levels (2× per level ABOVE 1), then cards.
//   veteran → level rolls to the affordable/floor cap (±1); a dead remainder may upgrade one card
//   arsenal → level 1; the whole surplus goes into higher-value card upgrades
//   swarm   → minimal: level 1, exactly 3 commons
//   mixed   → triangular-low level, then one possible quality upgrade
export function rollLeveledFoe(bodyKey, maxAnte = minFoeAnte(), floor = 1, skew = "mixed") {
  const premium = eliteBodyAnte(bodyKey);
  maxAnte = Math.max(minFoeAnte() + premium, (maxAnte | 0) || minFoeAnte());
  // spendable beyond the mandatory base = the flat +4 body/action base, elite premium, and 3×value-1 cards
  let left = maxAnte - premium - FOE_MIN_CARDS - FOE_BASE_ANTE;
  // LEVEL — capped by budget, the floor curve, and sanity; level 1 is FREE (ante v2)
  const lvCap = Math.max(1, Math.min(FOE_LEVEL_CAP,
    LEVEL_FLOOR_BASE + Math.max(1, floor | 0),
    1 + Math.floor(left / LEVEL_ANTE_PER)));
  let level = 1;
  if (skew === "veteran") level = Math.max(1, lvCap - Math.floor(Math.random() * 2));
  else if (skew === "mixed") { const ri = () => 1 + Math.floor(Math.random() * lvCap); level = Math.min(ri(), ri()); }
  left -= levelAnte(level);
  // CARDS — owner ruling 2026-07-12: every foe holds EXACTLY FOE_MIN_CARDS. Card COUNT is retired as
  // a difficulty lever (a foe casts only its front card, moxie-gated → extra cards were reward, not
  // threat). `arsenal` now pours its whole surplus into item QUALITY (enrichFoeGear below); `left`
  // is left untouched so that surplus is available, and generateRoomFoes turns any remainder into
  // MORE foes — the room's ⚖ budget still spends in full.
  const count = FOE_MIN_CARDS;
  const f = { bodyKey, gear: rollFoeKit(bodyKey, count), level, greedy: false, owner: null };
  // ITEM QUALITY — arsenal spends its whole allocation here. Other concentrated skews spend their
  // primary lever first (levels / elite body), then may use one card upgrade for an otherwise-dead
  // 1–4 point remainder. Swarm stays minimal because count is its defining lever.
  if (left > 0 && skew !== "swarm") enrichFoeGear(f, left, skew === "arsenal" ? 3 : 1);
  return f;
}
// ROOM FOE CAP (owner 2026-07-03: "4 foes to a lane"): a room holds at most FOES_PER_LANE foes per
// lane, and lanes scale with the party (deriveLaneCount = players clamped 1–4). So the cap is 4 (solo)
// up to 16 (4-player). This is what bounds a SWARM at big budgets: the count stops here and any budget
// a capped swarm can't spend is simply left unspent (n.ante records the ACTUAL total, so ⚖ stays honest).
export const roomFoeCap = (room) => FOES_PER_LANE * (room?.laneCount ?? deriveLaneCount(room, "combat"));

// Generate a room's foes to FILL the budget under ONE skew (rolled here when not given). Adds
// leveled fitting foes one at a time until the budget can't fit another, the per-lane foe cap is
// hit, or the early-stop fires. A combat room always has at least ONE foe (a tiny budget just overshoots).
export function generateRoomFoes(room, budget = room.anteCap ?? roomAnteBudget(room), floor = room?.floor ?? 1, skew = null) {
  skew = ROOM_SKEWS.includes(skew) ? skew : rollSkew(budget);
  const foes = [];
  const cap = roomFoeCap(room);           // ≤ 4 foes per lane (owner 2026-07-03)
  let remaining = budget;
  // the bodies skew shops the ELITE roster while it can afford the premium; others mix freely —
  // but NOBODY draws an elite body the remaining budget can't pay for (its +3 would overshoot
  // and strand un-spent ante, breaking the fill-to-the-ante contract).
  const pool = () => {
    const canElite = remaining >= minFoeAnte() + ELITE_BODY_ANTE;
    if (skew === "swarm") return COMMON_SET;   // count lever: elites would consume the second actor's budget
    return (skew === "bodies" && canElite) ? ELITE_SET : canElite ? FOE_BODIES : COMMON_SET;
  };
  // veteran/arsenal/bodies CONCENTRATE (few big foes); swarm fragments; mixed cuts a random slice
  const cut = () => skew === "swarm" ? minFoeAnte()
    : (skew === "veteran" || skew === "arsenal" || skew === "bodies") ? remaining
    : Math.max(minFoeAnte(), Math.ceil(remaining * (0.4 + Math.random() * 0.6)));
  while (remaining >= minFoeAnte() && foes.length < cap) {
    const f = rollLeveledFoe(rnd(pool()), Math.min(cut(), remaining), floor, skew);
    const a = anteOfFoe(f);
    if (a <= 0 || a > remaining) break;                               // safety (the bound guarantees a ≤ remaining)
    foes.push(f); remaining -= a;
    if (Math.random() < ROOM_FILL_STOP_CHANCE) break;                 // variance: stop short → a mini-opponent room
  }
  if (!foes.length) {
    // Sub-minimum solo rolls normalize to ONE legal common foe at ⚖7. Never choose an elite here:
    // its +3 body premium would turn a nominal budget 4–6 into ⚖10 and defeat the survivability fix.
    const fallbackPool = budget >= minFoeAnte() + ELITE_BODY_ANTE ? FOE_BODIES : COMMON_SET;
    foes.push(rollLeveledFoe(rnd(fallbackPool), Math.max(minFoeAnte(), budget), floor, skew));
  }
  return foes;
}

// Convert NON-ITEM ante (levels, elite-body premiums, effect pots) into CLAIMABLE items worth
// EXACTLY `value` — "each level will add value to the room which will take the form of random
// items" (owner 2026-07-02). Mostly ◈1 commons, sometimes a higher-value item, never overshooting
// — exact conservation keeps ⚖ = ◈ and the bid-points grant honest.
export function rollCompItems(value) {
  const out = [];
  let left = Math.max(0, value | 0);
  while (left > 0) {
    const rich = RICH_ITEM_POOL.filter((k) => itemTreasure(k) <= left);
    if (rich.length && Math.random() < 0.25) { const k = rnd(rich); out.push(k); left -= itemTreasure(k); }
    else { out.push(rnd(CHEAP_KIT)); left -= 1; }
  }
  return out;
}

// [RETIRED 2026-07-02 — elite ROOMS dissolved with ante v2] Kept as a shim for old callers/tests:
// a room generated at the PEAK of the ante range under the elite-bodies skew.
export function generateEliteFoes(room, floor = room?.floor ?? 1) {
  return generateRoomFoes(room, roomAnteRange(room)[1], floor, "bodies");
}
// DORMANT — the old named-elite (Atlas) machinery, retired from the live flow (owner 2026-06-27). Kept as
// an opt-in hook: if the owner later wants a SPECIFIC marquee elite body in a room, `rollEliteFoe()` mints
// one as a high-LEVEL loaded foe whose total ante ≈ ELITE_BODY_VALUE. Nothing calls it now.
export const ELITE_BODY = "atlas";       // [dormant] a candidate marquee-elite body
export const ELITE_BODY_VALUE = 15;      // [dormant] its target ante if reinstated as a centerpiece
export function rollEliteFoe(bodyKey = ELITE_BODY, value = ELITE_BODY_VALUE, floor = 1) {
  const premium = eliteBodyAnte(bodyKey);
  value = Math.max(minFoeAnte() + premium, value | 0);
  const spendable = value - FOE_BASE_ANTE - premium - FOE_MIN_CARDS;
  const level = Math.max(1, Math.min(FOE_LEVEL_CAP, 1 + Math.floor(spendable / LEVEL_ANTE_PER)));
  return { bodyKey, gear: rollFoeKit(bodyKey, FOE_MIN_CARDS), level, greedy: false, owner: null, elite: true };
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
  const stat = combatBonus ? levelDamageType(player.bodyKey, player.deckList ?? [], player.levelPick) : null; // R4: player CHOICE (levelPick), else archetype/kit auto
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

// TREASURE BANK (owner 2026-07-06): a per-player banked ◈ balance, minted by CONVERTING spare
// backpack cards (convertBackpack below) and spent on LEVEL-UPS and BODY ADOPTIONS — the two sinks
// the owner named. The SHOP stays cards-only (value-for-value trade-in, deliberately untouched).
// Persists across rooms; resets each new run (startDraft), like runLevel/bidPoints.
// Tender rule: the chosen cards cover what they cover (same COVER semantics as tenderValue — excess
// card value still burns), and only the SHORTFALL comes out of the bank — treasure never overpays.
export function tenderWithTreasure(player, payKeys = [], cost = 0) {
  if (cost <= 0) return true;
  const pay = Array.isArray(payKeys) ? payKeys : [];
  const cardVal = pay.reduce((s, k) => s + itemTreasure(k), 0);
  const fromBank = Math.max(0, cost - cardVal);
  if ((player?.treasure ?? 0) < fromBank) return false;          // the bank can't close the gap
  if (!tenderValue(player, pay, cost - fromBank)) return false;  // validate + commit the card part
  player.treasure = (player.treasure ?? 0) - fromBank;
  return true;
}

// CONVERT THE BAG (owner 2026-07-06: "converts all my current bagged items into pure treasure
// amount for level ups and bodies"). Melts every SPARE copy — backpack beyond what the deck holds,
// exactly what the deck-builder shows as the 🎒 — into banked ◈ at itemTreasure value. The combat
// deck is untouched (so MIN_DECK is safe by construction). NOTE: worn passives (Cool Shoes, a spare
// Crown) are spares too — they melt and their worn effect is gone; the client confirms before
// sending. Out-of-combat only (prep action, same gate as levelUp). Returns the ◈ minted (0 = refused
// or nothing to melt).
export function convertBackpack(room, player) {
  if (!room || !player || room.phase === "playing") return 0;
  const deck = {}; for (const k of (player.deckList ?? [])) deck[k] = (deck[k] ?? 0) + 1;
  const keep = [], melt = [], seen = {};
  for (const k of (player.backpack ?? [])) {
    seen[k] = (seen[k] ?? 0) + 1;
    if (seen[k] <= (deck[k] ?? 0)) keep.push(k); else melt.push(k);   // deck copies stay, spares melt
  }
  if (!melt.length) return 0;
  const value = melt.reduce((s, k) => s + itemTreasure(k), 0);
  player.backpack = keep;
  player.treasure = (player.treasure ?? 0) + value;
  return value;
}

// EXCLUSIVE body swap — a literal trade through the shared pool. A body worn by another player is
// off-limits. Your current body is RELEASED back into the pool and the chosen one becomes you; the swap
// sticks across rooms (homeBody). `targetKey` null = quick-cycle. An un-adopted body must be PAID for the
// first time (pass `payKeys` covering adoptCost). `dmgType` optionally moves the player's whole
// accumulated level-combat grant as part of the SAME validated swap; it is committed only after the
// target/payment gates pass, so cancelling or failing an adoption cannot mutate the build.
// Returns the adopted bodyKey, or null if not allowed.
export function swapBody(room, player, targetKey = null, payKeys = [], dmgType = null) {
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
    if (!tenderWithTreasure(player, payKeys, cost)) return null;  // cards + banked ◈ shortfall; can't afford → reject
    (room.adoptedBodies ??= new Set()).add(target);          // adopted — free to re-wear for the rest of the run
  }
  if (levelCombatBonus(runLevelOf(player)) > 0 && (dmgType === "melee" || dmgType === "ranged"))
    player.levelPick = dmgType;                              // body-swap respec: MOVE the fixed grant, never add another
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
// `dmgType` (R4, owner 2026-07-10): the melee/ranged CHOICE the client raised via the same modal pick
// Sharpened Edges / Demon Form use. Stored on player.levelPick and applied through applyBodyLevel →
// levelDamageType. Absent/garbage → the pick is left as-is (auto by archetype for a fresh/bot player).
export function levelUp(room, player, payKeys = [], dmgType = null) {
  if (!player?.alive || !room) return false;
  if (room.phase === "playing") return false;                 // not mid-fight (stock/shop/setup only)
  const b = BODIES[player.bodyKey] || {};
  if (b.summon || b.boss) return false;                       // only normal bodies level (foe-symmetric exemption)
  const target = runLevelOf(player) + 1;                      // ONE run-wide level per player (not per-body)
  // FLAG (levelcap bug fix, owner live-playtest 2026-07-09: "couldn't level up past 8 despite enough cards"):
  // the player path used to gate on FOE_LEVEL_CAP (=8, lobby.js:371) — a foe-GENERATION sanity ceiling that
  // leaked in via "share the foe sanity ceiling". That hard-capped the PLAYER at level 8 even with tender to
  // spare. Removed: there is NO owner-stated player-level cap (his spec is purely cost-gated, levelUpCost =
  // 5×(L-1), examples open-ended). Player leveling is now bounded only by the escalating value-for-value tender.
  // If a player-side ceiling is ever wanted it's a DESIGN number the owner must state — add a PLAYER_LEVEL_CAP
  // here; do NOT reuse the foe constant.
  if (!tenderWithTreasure(player, payKeys, levelUpCost(target))) return false;  // chosen spares + banked ◈ shortfall (validates + commits)
  player.runLevel = target;                                   // the run-wide level ticks up — it follows every body worn
  if (dmgType === "melee" || dmgType === "ranged") player.levelPick = dmgType;  // R4: honor the player's melee/ranged choice
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
    // levelPick (R4, owner 2026-07-10): the damage TYPE the player CHOSE for their level +combat bonus
    // ("melee"/"ranged"; null = auto by archetype). Run-wide like runLevel — the latest level-up choice
    // governs the whole (non-cumulative) combat grant and carries onto every body the player wears.
    level: FOE_LEVEL_MIN, runLevel: FOE_LEVEL_MIN, levelMelee: 0, levelRanged: 0, levelPick: null,
    hp: 0, maxHp: 0, alive: true, downTimer: 0,
    lockedBundle: null, drafted: false, // draft-wheel lock state
    bidPoints: 0, lootEarned: 0,    // loot BID POINTS: claim budget + cumulative granted this run (owner 2026-07-02)
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
    treasure: 0,   // banked ◈ (owner 2026-07-06): minted by convertBackpack, spent on level-ups/adoptions
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
  const stat = combatBonus ? levelDamageType(bodyKey, gearKeys) : null;   // R4: FOE auto-pick by passive/archetype (flex → kit)
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
      // GAMBIT — the King's OFFENSE (ENGINE, owner 2026-07-09: "King Mimic should give himself CRAZY
      // STRONG cards and play them RANDOMLY"). On this bar he draws a RANDOM card from KING_ARSENAL
      // (below) and plays it against the party as the King — see the "cast" case in fireBossClock.
      // Until now his deck did NO direct damage but CALAMITY's flat 3 (decree/steal/stance are
      // court/theft/guard); this card is what finally makes him THREATEN. [FLAG — Claude picks, owner
      // tunes]: cd 55, and the COUNT of "cast" cards in this bag (currently ONE) are his aggression
      // dials — add more "cast" entries / lower cd to make the King cast strong cards more often.
      // label/color are placeholders (owner art).
      { kind: "cast",    cd: 55, label: "🃏 GAMBIT — a card from the King's hand", color: "#e6c34a" }, // [FLAG] cd + count
    ],
    decreeAnte: 7,                 // "powerful, heavily-anted foes" — each rolled to clear this bar
  },
};

// THE KING'S ARSENAL (ENGINE for owner's 2026-07-09 direction). The GAMBIT/"cast" deck card draws a
// RANDOM key from this list and plays it AGAINST the party as the King (see fireBossClock "cast").
// These are REAL, existing high-impact PLAYER_POOL cards, used here as PLACEHOLDERS.
// [FLAG — DESIGN OWNERSHIP]: the exact SELECTION and its power are the OWNER's to author. Swap or
// extend this list freely; every entry must be a KIT key whose ops DEAL DAMAGE. Current placeholder
// set + their headline numbers (all owner-tunable at each card's own definition in kit.js):
//   oPowerWordGun  — 13 to the weakest hero anywhere (ranged snipe, cross-lane)
//   oContinentClub — 12 to the front hero of a lane
//   oBlackHole     — 10 to EVERY hero on the board (all lanes) + those heroes deal −8 for 6s (owner 2026-07-10 rework)
//   oMeteors       — 6 to a whole lane
//   oGlacius       — 8 to the front hero of a lane
export const KING_ARSENAL = ["oPowerWordGun", "oContinentClub", "oBlackHole", "oMeteors", "oGlacius"]; // [FLAG] owner's card set
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
    case "cast": {                                   // King GAMBIT: draw a RANDOM card from KING_ARSENAL and play it (owner 2026-07-09)
      const key = rnd(KING_ARSENAL);
      const item = KIT[key];
      if (!item?.ops) break;                         // an arsenal typo can't crash the fight
      // The King is a BACK-LINE boss (lane = null), but a played card needs a lane so its target
      // (front / lane / pickLane / ranged-snipe) resolves EXACTLY as a lane foe's cast would. Lend it
      // a RANDOM lane for the resolve, then restore — nothing observes boss.lane mid-resolve (this
      // runs synchronously inside one tick, before any snapshot). Reuses foeCast's own resolver.
      const savedLane = boss.lane;
      boss.side = "foe";                             // resolveOps' foe branch (tests call fireBossClock directly)
      boss.lane = room.laneCount > 0 ? Math.floor(Math.random() * room.laneCount) : 0;
      clog(room, "  ↳ draws " + (item.name ?? key)); // legibility (coordinator 2026-07-09): name the card he drew; resolveOps/damagePlayer log the hits
      resolveOps(room, boss, item.ops, item.type, 0, cardKind(key));
      boss.lane = savedLane;
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
    // LEGIBILITY (coordinator 2026-07-09): announce every King deck-card play so the fight log
    // reads as the King actively slinging cards, not silent dead air (his whole deck fired
    // unlogged before — the reason the owner read it as "no deck"). Only King's clocks carry
    // `deck`, so non-King bosses are untouched.
    if (k.deck && k.label) clog(room, "♛ " + logNm(c) + ": " + k.label);
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

// ── LOOT BID POINTS (owner 2026-07-02): "if the room was 10, give each player points divided by
// the number of players in the room, give the excess to players so everyone's loot stays
// equivalent over the run." On every CO-OP room clear the loot pool's TOTAL VALUE is granted as
// spend-to-claim BID POINTS: each human SEAT gets floor(V/seats); the excess goes 1 point at a
// time to the seat with the LOWEST cumulative granted this run (join order breaks ties), so a
// short-changed seat catches up and every seat's granted total tracks an equal share of V over
// the run. Points CARRY across rooms (claim nothing → richer next room; unclaimed CARDS still
// vanish on advance, but their VALUE was banked as your points, so no equity is lost) and reset
// on a NEW RUN (startDraft). Squad bodies are not seats — a bot body's claim spends its OWNING
// seat's points (the card still lands in the claiming body's backpack).
export const seatOf = (room, player) =>
  (player?.bot && room.players.get(player.owner)) || player;
export function grantBidPoints(room, value) {
  const seats = [...room.players.values()].filter((p) => !p.bot);
  if (!seats.length || !(value > 0)) return;
  const base = Math.floor(value / seats.length);
  for (const s of seats) { s.bidPoints = (s.bidPoints ?? 0) + base; s.lootEarned = (s.lootEarned ?? 0) + base; }
  let excess = value - base * seats.length;
  while (excess-- > 0) {   // remainder → the current lowest cumulative earner (first-joined on ties)
    const low = seats.reduce((a, b) => ((b.lootEarned ?? 0) < (a.lootEarned ?? 0) ? b : a));
    low.bidPoints += 1; low.lootEarned += 1;
  }
}

// Claim a piece of the room's loot into your BACKPACK. Loot is a SHARED, SCARCE set — one
// instance of each drop, first-come. There is NO stash — unclaimed loot is gone on leave. The
// card joins the backpack only; it stays out of the combat deck until the player explicitly
// moveToDeck's it. CO-OP (owner 2026-07-02): the claim costs the card's value in the claiming
// SEAT's bid points — speed only decides WHICH card you get, never how much value. Solo runs
// auto-collect on clear and never reach here.
export function claimLoot(room, player, key) {
  if (room.phase !== "won") return;
  const i = room.loot.indexOf(key);
  if (i < 0 || !KIT[key]) return;
  if (room.players.size > 1) {                  // co-op: pay the card's value from your seat's points
    const seat = seatOf(room, player);
    const cost = itemTreasure(key);
    if ((seat.bidPoints ?? 0) < cost) return;   // can't cover it → the claim bounces
    seat.bidPoints -= cost;
  }
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
// Player-to-player TRADING — a STRICT 1:1 VALUE swap (owner 2026-07-02: "nobody is able to gift —
// all the players have the exact same resource totals over a run for fairness and fun"). The old
// by-choice looseness (2026-06-24) and the one-way GIFT are RETIRED: every cross-seat exchange must
// move equal ◈ value both ways, so trading can never bend the bid-points equity. (Same-seat squad
// moves — giveOwnItem/swapOwnItems — stay free: one wallet, no equity to bend.) Out-of-combat only.
// ---------------------------------------------------------------------------
export const tradeable = (room) => room.phase === "won" || room.phase === "shop";

// Execute an AGREED 1-for-1 swap: `a` gives `aKey`, `b` gives `bKey`; each receives the other's card
// in its backpack (and, if the given card was in the deck, the received card takes its deck slot so
// the deck size is preserved). Validates ownership AND equal ◈ value (the 1:1 rule).
export function tradeItems(room, a, b, aKey, bKey) {
  if (!tradeable(room) || !a || !b || a === b) return false;
  const ai = (a.backpack ?? []).indexOf(aKey);
  const bi = (b.backpack ?? []).indexOf(bKey);
  if (ai < 0 || bi < 0 || !KIT[aKey] || !KIT[bKey]) return false;
  if (itemTreasure(aKey) !== itemTreasure(bKey)) return false;   // 1:1 — equal value or no deal
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

// [RETIRED 2026-07-02 — owner: "nobody is able to gift"] The one-way cross-seat GIFT is dead:
// nothing routes here anymore (proposeTrade rejects want-less offers; acceptTrade drops stale ones).
// Kept only because deletes are the owner's call; do NOT wire anything back to it.
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
// Propose a trade: `from` offers their `give` for `to`'s `want` — a REQUIRED, EQUAL-◈-VALUE card
// (owner 2026-07-02: no gifts, 1:1 only — seat resource totals must stay identical over the run).
// Stored until accepted/declined. Ownership is checked against the backpack.
export function proposeTrade(room, from, toId, give, want = null) {
  if (!tradeable(room) || !from) return false;
  const to = room.players.get(toId);
  if (!to || to === from) return false;
  if (want == null) return false;                                          // gifts are dead — 1:1 only
  if (!(from.backpack ?? []).includes(give)) return false;
  if (!(to.backpack ?? []).includes(want)) return false;                   // swap must name a held card
  if (itemTreasure(give) !== itemTreasure(want)) return false;             // equal ◈ value or no offer
  (room.tradeOffers ??= []).push({ id: "of" + _offerSeq++, from: from.id, to: toId, give, want });
  return true;
}

// The target accepts: re-validate and execute the 1:1 swap, then clear it. A want-less offer (a
// pre-2026-07-02 gift, or anything that snuck past propose) is DROPPED, never executed.
export function acceptTrade(room, accepter, offerId) {
  const offers = room.tradeOffers ?? [];
  const i = offers.findIndex((o) => o.id === offerId);
  if (i < 0) return false;
  const o = offers[i];
  if (!accepter || accepter.id !== o.to) return false;       // only the target can accept
  const from = room.players.get(o.from);
  if (!from || o.want == null) { offers.splice(i, 1); return false; }   // stale gift offers die here
  const okTrade = tradeItems(room, from, accepter, o.give, o.want);     // re-validates value equality
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
  // FOE LOADOUT LOG (owner 2026-07-05): record each foe's body + gear + WORN passives (⚙-marked) at the
  // open of the fight. Only a foe's CASTS were logged before, never its loadout — so a Cool-Shoes-fueled
  // spam or a worn Crown was invisible after the fact ("what killed me?"). Now the log answers it.
  for (const lane of room.lanes) for (const f of lane) {
    const gear = (f.equipment ?? []).map((it) => (isPassiveItem(it.key) ? "⚙" : "") + (KIT[it.key]?.name ?? it.key));
    clog(room, "  · " + logNm(f) + (f.level > 1 ? " L" + f.level : "") + " — " + (gear.length ? gear.join(", ") : "no gear"));
  }
  if (room.phase === "setup") {
    room.phase = "playing";
    // owner 2026-06-21: remember the lanes/depths you arranged in SETUP so the NEXT room reopens
    // with the SAME formation (no reset to one-body-per-lane). Snapshot NOW — before combat moves
    // scramble depth — so it captures your deliberate placement, not the post-fight scramble.
    for (const p of room.players.values()) { p.partyLane = p.lane; p.partyDepth = p.depth ?? 0; }
  }
  room._bestFoeHp = undefined; room._bestCav = undefined; room._stallTicks = 0; // reset anti-stall
  room.defeated = { hero: 0, foe: 0 };  // KILL TRACKING per combat (owner 2026-07-10, Affluence Anubis): real bodies felled this fight, per side — feeds the dynamic `countPerKill` summon. Fresh every fight (scope = this-combat; FLAG on the body def)
  // Per-fight state, symmetric for players (inv) and foes (equipment):
  //  • thorns buffs (Spikes) expire — "this fight" only;
  //  • shields expire too (owner bug report 2026-06-12: a banked buffer was carrying
  //    across rooms). PLAYERS only — foe shields are spawn-granted (Armory) and fresh
  //    per room anyway, so zeroing them here would erase the modifier;
  //  • `startCharged` items (Trusty Shield) open the fight ready to fire.
  for (const p of room.players.values()) {
    p.thorns = 0; p.shield = 0; p.shieldSegs = []; p.buffs = [];   // buffs (Power Up etc.) are per-fight — don't carry across rooms; shieldSegs = W2-B special-shield segments, also per-fight
    p.echoCharge = 0; p.echoReady = false; p.echoArmed = false;  // the echo bar is per-fight state
    // per-fight ramps & body clocks reset (owner 2026-06-23): the +1-damage ramp (counters), the
    // moxie/hit/play accumulators, the melee+ranged pair latch, and a stray double all start fresh —
    // otherwise a Bond Behemoth / Malevolent Mouse would compound its bonus across rooms.
    // melee/ranged bonus reset to the BODY-LEVEL base (not 0): a leveled body's +combat is permanent,
    // the same way a foe's spawn bakes its level combat in — in-fight ramps (Sharpened Edges) add on top.
    p.counters = 0; p.meleeBonus = p.levelMelee ?? 0; p.rangedBonus = p.levelRanged ?? 0; p.pspend = {}; p.pcharge = {}; p.pair = {}; p.doubleNext = false;
    p.dmgReduce = 0; p.wform = null;   // WAREWOLF (owner 2026-07-11): clear form/DR each fight so a body-swap sheds a stale Warewolf state; applyCombatStart re-seeds HUMAN form for a Warewolf
    p.regens = []; p.bloodToIron = null; p.poison = 0; p.poisonClock = 0; p.poisonSourceCard = null; p.timers = [];   // ongoing card effects are per-fight
    p.moxieOnPlayBuff = 0;   // Cool Shoes' cast-installed refund is per-fight too (owner 2026-07-06)
    p.dualWield = false; p.tkBlades = false; p.freeNext = false; p.moxieOnHitBuff = 0;   // batch-C cast buffs are per-fight (owner 2026-07-06); dualWield = Dual-Handing Two-Handers' ≥6-melee replay (owner 2026-07-10)
    p.mirrorShield = 0; p._pick = null;   // batch-D: an unspent Mirror Shield charge is per-fight too; no play-pick carries over (owner 2026-07-07)
    p.revealLight = 0; p._revealLightApplied = false;   // Swords of Revealing Light (owner 2026-07-11): unspent hit-conversion charges + the once-per-fight guard are per-fight
    p.leeches = [];   // Pet Leech (owner 2026-07-11): a foe-cast leech riding a hero dies at fight end (foes spawn fresh per room)
    // Giant's Belt's per-fight maxHp double is now undone at ROOM CLEAR (combat.js won-block), NOT here.
    // Reverting it at the next beginCombat instead let a stale _giantBase snapshot clobber a between-room
    // level-up / body-swap's correctly-recomputed maxHp (owner playtest 2026-07-10 — an L2 Minotaur that
    // should be 13/13 entered 7/7). Undoing it when the fight ends means _giantBase never survives that long.
    dealHand(p);                       // shuffle the collection → deck + opening hand, moxie = START_MOXIE
    applyCombatStart(p);               // Malevolent Mouse +1 / Golden Golem +2 shield / Centless Centaur double
  }
  for (const lane of room.lanes) for (const f of lane) {
    f.thorns = 0;
    for (const it of f.equipment ?? []) if (KIT[it.key]?.startCharged) it.charge = it.cd;
  }
  room.roomTimers = [];            // room effects removed 2026-06-28 — no global room clocks
  beginCombatMetrics(room);        // snapshot deck/opening hand/boss before the first simulation tick
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
// A body's RANDOM STARTER DECK — 5 DISTINCT value-1 cards × 2 COPIES EACH (owner 2026-07-01:
// "starting item lists should have 5 pairs of 2 instead of 10 unique cards"), still MIN_DECK (10)
// total, freshly rolled per body so each of the wheel's bodies offers a different deck. The first
// three PICKS keep the original KIT-FIT guarantee (pick 1 in-house + damaging, pick 2 in-house,
// pick 3 a wild that may roam off-school) so no body opens on a trap; the remaining picks fill to
// 5, biased in-house so the body's school Power stays relevant, occasionally wild for spice. A
// dry pool may repeat a pick (then a pair stacks past ×2) — same escape hatch as before.
export function rollKit(bodyKey) {
  const house = CHEAP_KIT.filter((k) => inHouseFor(bodyKey, k));
  const first = rnd(house.filter((k) => DAMAGING_ITEMS.includes(k)));      // pick 1: in-house + damaging
  const second = rnd(house.filter((k) => k !== first));                    // pick 2: in-house
  const wild = rnd(CHEAP_KIT.filter((k) => k !== first && k !== second)); // pick 3: any value-1 item
  const picks = [first, second, wild];
  while (picks.length < MIN_DECK / 2) {                                    // picks 4..5: fill to 5 distinct
    const pool = Math.random() < 0.75 ? house : CHEAP_KIT;                 // mostly in-house, sometimes wild
    const fresh = pool.filter((k) => !picks.includes(k));                  // prefer variety, allow dups when dry
    picks.push(rnd(fresh.length ? fresh : pool));
  }
  return picks.flatMap((k) => [k, k]);                                     // 5 pairs of 2 = the 10-card deck
}
let _bundleSeq = 1;
const draftPlayerIds = (players = 1) => typeof players === "number"
  ? Array.from({ length: Math.max(0, players | 0) }, (_, i) => `draft-player-${i + 1}`)
  : [...players].map((p) => typeof p === "string" ? p : p?.id).filter(Boolean);

// Roll exactly three PRIVATE offers per draftable player/body. The body pool is shuffled once and
// partitioned, so no two players are ever shown the same chassis. `offeredTo` is authoritative:
// draftPick validates it server-side; the client filter is only presentation.
export function rollDraftWheel(players = 1) {
  const ids = draftPlayerIds(players);
  if (ids.length > DRAFT_MAX_PLAYERS) throw new RangeError(
    `initial draft supports ${DRAFT_MAX_PLAYERS} player bodies (${DRAFT_BODIES.length} unique bodies / ${DRAFT_OFFERS_PER_PLAYER} offers each)`,
  );
  const bodies = [...DRAFT_BODIES].sort(() => Math.random() - 0.5);
  let at = 0;
  return ids.flatMap((offeredTo) => Array.from({ length: DRAFT_OFFERS_PER_PLAYER }, () => {
    const bodyKey = bodies[at++];
    return { id: "bndl" + _bundleSeq++, bodyKey, items: rollKit(bodyKey), offeredTo };
  }));
}

// Late-join/squad grow: give every newly added draftable body its own three fresh offers WITHOUT
// disturbing anybody's existing triple or lock. Repeated calls are idempotent.
export function growDraftWheel(room) {
  if (room.phase !== "draft") return;
  const wheel = room.draftWheel ?? (room.draftWheel = []);
  if (room.players.size > DRAFT_MAX_PLAYERS) throw new RangeError(
    `initial draft supports at most ${DRAFT_MAX_PLAYERS} player bodies`,
  );
  const currentIds = new Set(room.players.keys());
  const kept = wheel.filter((w) => currentIds.has(w.offeredTo));
  if (kept.length !== wheel.length) wheel.splice(0, wheel.length, ...kept);
  const used = new Set(wheel.map((w) => w.bodyKey));
  const fresh = DRAFT_BODIES.filter((b) => !used.has(b)).sort(() => Math.random() - 0.5);
  for (const player of room.players.values()) {
    let count = wheel.filter((w) => w.offeredTo === player.id).length;
    while (count < DRAFT_OFFERS_PER_PLAYER) {
      const bodyKey = fresh.shift();
      if (!bodyKey) throw new RangeError("not enough unique bodies to complete the initial draft");
      wheel.push({ id: "bndl" + _bundleSeq++, bodyKey, items: rollKit(bodyKey), offeredTo: player.id });
      count++;
    }
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
  room._runSeq = (room._runSeq ?? 0) + 1;
  room._runId = null;                  // server phase seam mints the log-safe run id before telemetry starts
  room._combatSeq = 0;
  room._combatMetrics = null;
  room.unlockedBodies = new Set([STARTER_BODY]); // a NEW run resets the adopted-body pool
  room.draftWheel = rollDraftWheel(room.players.values()); // three private body+deck offers per player body
  syncLobbyLanes(room);   // board preview = party size (covers a re-draft after a lost run)
  // …and every player's backpack/deck and draft lock (a fresh run wipes them). No gold to reset.
  for (const p of room.players.values()) {
    p.classKey = null; p.backpack = []; p.deckList = []; p.runStarterDeck = [];
    p.lockedBundle = null; p.drafted = false;
    // RUN-WIDE LEVEL resets to 1 each NEW RUN (owner 2026-06-29): the level follows you across bodies
    // WITHIN a run, but a fresh run starts back at level 1 (roguelike convention).
    p.runLevel = FOE_LEVEL_MIN; p.level = FOE_LEVEL_MIN; p.levelMelee = 0; p.levelRanged = 0; p.levelPick = null;
    p.bidPoints = 0; p.lootEarned = 0;   // loot BID POINTS are per-run (owner 2026-07-02)
    p.treasure = 0;                      // banked ◈ is per-run too (owner 2026-07-06)
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
  player.runStarterDeck = [...items];
  player.lockedBundle = bundleId;
  player.drafted = true;
  wearBody(player, bodyKey);              // show the chosen body immediately while others pick
  maybeFinishDraft(room);
}

// Live draft: a player may lock only one of THEIR three offers. Bundles and body choices are
// globally distinct, but the ownership check remains server-authoritative against forged clients.
export function draftPick(room, player, bundleId) {
  if (room.phase !== "draft" || !player) return;
  const b = (room.draftWheel ?? []).find((x) => x.id === bundleId);
  if (!b || b.offeredTo !== player.id) return;
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
  // Only PRESENT seats gate the draft — a departed human (gone/left) shouldn't stall the party
  // (bots are always present and auto-draft). At least one present seat must exist to "complete"
  // (a room of only-departed humans doesn't silently start a run with nobody in it).
  const present = [...room.players.values()].filter(seatPresent);
  return present.length > 0 && present.every((p) => p.drafted);
}

export function maybeFinishDraft(room) {
  if (room.phase !== "draft" || !draftComplete(room)) return;
  // A reopened drop-in draft (reopenDraftForJoin) kept the staged level, so RE-ENTER the current
  // node with the bigger party — lanes/caravan re-derive, map progress kept. A fresh run has no
  // level yet → build floor 1 and enter it.
  if (room.level) { enterRoom(room); return; }
  // CO-OP HOLD (owner 2026-07-06 roommate playtest: "it force started us before everyone had
  // joined"): with 2+ HUMAN seats a completed FRESH-run draft WAITS for an explicit {beginRun}
  // (the ▶ Start run button) so late friends can still join and draft. Solo and 1-human squads
  // keep the instant start (every harness/test relies on it).
  const humans = [...room.players.values()].filter((q) => !q.bot && !q.gone).length;
  if (humans >= 2) return;   // departed humans don't keep the fresh-run draft on hold
  startLevel(room);
}

// The explicit co-op run start — any drafted seat presses ▶ once the party's all in. Fresh runs
// only: a reopened mid-run draft resumes by itself through maybeFinishDraft and never holds.
export function beginRun(room) {
  if (!room || room.phase !== "draft" || room.level || !draftComplete(room)) return false;
  startLevel(room);
  return true;
}

// Squad bots don't sit at the draft wheel — each undrafted bot grabs a still-open bundle from
// ITS private triple the instant the wheel exists, so the human only ever picks for the body they're
// piloting and the draft never stalls waiting on autopilots.
export function autoDraftBots(room) {
  if (room.phase !== "draft") return;
  for (const p of room.players.values()) {
    if (!p.bot || p.drafted) continue;
    const taken = new Set([...room.players.values()].map((q) => q.lockedBundle).filter(Boolean));
    const b = (room.draftWheel ?? []).find((x) => x.offeredTo === p.id && !taken.has(x.id));
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

// A seat still OWES an action at an "all seats must X" gate only if it's PRESENT. The server
// flags a human seat `gone` when its socket drops mid-run — the seat is HELD for token-reconnect
// (phone lock / refresh) but MUST NOT strand the party at the draft/vote/lock gates — and clears
// `gone` on reconnect; a deliberate LEAVE deletes the seat outright. BOTS never disconnect and
// always count (even if a flag leaked onto one). Engine tests never set `gone`, so every seat is
// present there and this predicate changes nothing for them. (owner 2026-07-09: "dead lobby my
// friend left" — an empty human seat used to block the party forever.)
export const seatPresent = (p) => !!p && (p.bot || !p.gone);

// Human SEATS that must act = the PRESENT non-bot player entities (the squad primaries). Bot
// squad bodies share their owner's seat, so they never cast their own vote; a departed (gone)
// human is dropped so its now-empty seat can't block the room-advance vote/lock.
export const humanSeats = (room) => [...room.players.values()].filter((p) => !p.bot && !p.gone);

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

// Fire the tally once EVERY PRESENT human seat is locked in. No-op until then. Exported so the
// server can re-fire it the instant a seat departs (that departure may itself satisfy the gate).
export function maybeResolveRoomVote(room) {
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
    if (!seatPresent(room.players.get(seatId))) continue;   // a departed/left seat's stale vote doesn't decide the room
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

// ===========================================================================
// SCENARIO INJECTION (dev capture tool, 2026-07-11) — boot a room from a JSON spec so any game
// state can be REACHED and screenshotted in the REAL game (owner verification bar: real server,
// real client, real tick loop — only the STARTING CONDITIONS are injected; fixture renderers are
// banned). The server routes {type:"scenario"} here ONLY when the process runs with KM_SCENARIO=1
// (see server.js) — the live public server never sets it, so this hook has zero live exposure.
//
// CONTRACT:
//  • Every content key is validated against the REAL tables (BODIES / KIT / BUFF_META kinds) and an
//    unknown key FAILS LOUDLY before any mutation — the tool can never invent content.
//  • The room is built through the REAL construction path (buildLevel → stockLevelRooms → enterRoom
//    → beginCombat), then mutated to the spec; the ordinary tick loop takes over from there.
//  • Spec shape (all fields optional unless noted):
//      { name, phase: "playing"|"setup", floor,
//        players: [{ body, level, deck:[cardKey…], hand:[⊆deck, ≤HAND_SIZE], moxie, hp, maxHp,
//                    shield, buffs:[{kind,amount,dur}], treasure, unlocked:[bodyKey…],
//                    adopted:[bodyKey…], lane }…],       // players[i] → the room's i-th body
//        foes: [{ body (required), gear:[cardKey…], level, count, hp, maxHp, dmgReduce,
//                 buffs:[{kind,amount,dur}], lane }…],   // ≥1 required; count expands copies
//        summons: [{ side:"hero"|"foe", body, count, lane, player }…] }   // pre-placed tokens
//    phase "setup" = pre-fight formation screen (body menu shots); combat-only fields (hand/moxie/
//    buffs/summons) are REJECTED there — beginCombat would silently wipe them.
// ===========================================================================
export const SCENARIO_MAX_FOES = 24;   // sanity ceiling (a 4-lane room caps at 16 anyway)
export function applyScenario(room, spec) {
  const fail = (m) => { throw new Error(m); };
  if (!room) fail("no room");
  if (!spec || typeof spec !== "object") fail("scenario spec must be a JSON object");
  const phase = spec.phase ?? "playing";
  if (phase !== "playing" && phase !== "setup") fail(`scenario phase must be "playing" or "setup" (got "${phase}")`);
  const keyOf = (what, k, table) => {
    if (typeof k !== "string" || !Object.prototype.hasOwnProperty.call(table, k))
      fail(`unknown ${what} key ${JSON.stringify(k)}`);
    return k;
  };
  const buffKinds = Object.keys(BUFF_META);
  const checkBuffs = (list, whose) => {
    for (const b of list ?? [])
      if (!b || !buffKinds.includes(b.kind))
        fail(`unknown buff kind ${JSON.stringify(b?.kind)} on ${whose} (known: ${buffKinds.join(", ")})`);
  };
  // ── VALIDATE EVERYTHING FIRST — no mutation below until the whole spec is proven real ──────────
  const players = [...room.players.values()];
  const pspecs = Array.isArray(spec.players) ? spec.players : [];
  if (pspecs.length > players.length)
    fail(`spec names ${pspecs.length} players but the room has ${players.length} bodies (create with bodies=${pspecs.length})`);
  pspecs.forEach((ps, i) => {
    if (!ps) return;
    if (ps.body != null) keyOf("body", ps.body, BODIES);
    const deck = ps.deck?.length ? ps.deck : STARTER_DECK;
    for (const k of deck) keyOf("card", k, KIT);
    const hand = ps.hand ?? [];
    if (hand.length > HAND_SIZE) fail(`players[${i}].hand holds ${hand.length} cards — HAND_SIZE is ${HAND_SIZE}`);
    for (const k of hand) {
      keyOf("card", k, KIT);
      if (!isCard(k)) fail(`players[${i}].hand card "${k}" is not castable (no ops) — it can never sit in a hand`);
      if (countKey(hand, k) > countKey(deck, k)) fail(`players[${i}].hand card "${k}" exceeds its deck copies`);
    }
    checkBuffs(ps.buffs, `players[${i}]`);
    for (const k of ps.unlocked ?? []) keyOf("body", k, BODIES);
    for (const k of ps.adopted ?? []) keyOf("body", k, BODIES);
    if (phase === "setup" && (ps.hand?.length || ps.moxie != null || ps.buffs?.length))
      fail(`players[${i}]: hand/moxie/buffs need phase "playing" — combat start would wipe them in "setup"`);
  });
  const fspecs = [];
  for (const fs of spec.foes ?? []) {
    if (!fs) continue;
    keyOf("foe body", fs.body, BODIES);
    for (const g of fs.gear ?? []) keyOf("card", g, KIT);
    checkBuffs(fs.buffs, `foe ${fs.body}`);
    const n = Math.max(1, fs.count | 0 || 1);
    for (let c = 0; c < n; c++) fspecs.push(fs);
  }
  if (!fspecs.length) fail("scenario needs at least one foe");
  if (fspecs.length > SCENARIO_MAX_FOES) fail(`${fspecs.length} foes exceeds the SCENARIO_MAX_FOES ceiling (${SCENARIO_MAX_FOES})`);
  for (const s of spec.summons ?? []) {
    if (!s || (s.side !== "hero" && s.side !== "foe")) fail(`summon side must be "hero" or "foe"`);
    keyOf("summon body", s.body, BODIES);
    if (phase === "setup") fail(`summons need phase "playing" — combat start would clear the board in "setup"`);
  }
  // ── APPLY — the spec is proven; build through the REAL room path, then mutate to it ────────────
  room.telemOff = true;                                  // a dev-tool room never pollutes pick-rate telemetry
  room.scenario = String(spec.name ?? "scenario").slice(0, 64);
  room.floor = Math.max(1, spec.floor | 0 || 1);
  players.forEach((p, i) => {                            // what the draft would have set, per body
    const ps = pspecs[i] ?? {};
    const body = ps.body ?? STARTER_BODY;
    const deck = ps.deck?.length ? [...ps.deck] : [...STARTER_DECK];
    p.homeBody = body; p.bodyKey = body;
    p.backpack = [...deck]; p.deckList = deck;
    p.drafted = true; p.lockedBundle = null;
    p.runLevel = Math.max(FOE_LEVEL_MIN, ps.level | 0 || FOE_LEVEL_MIN); p.levelPick = null;
    if (Number.isInteger(ps.lane)) { p.partyLane = ps.lane; p.partyDepth = 0; }
  });
  // REAL map machinery: a genuine floor graph whose first combat node carries the spec's exact
  // roster — so the map preview, the ⚖ ante, and the fight all agree, like any live room.
  room.level = buildLevel(Math.min(room.floor, THRONE_FLOOR - 1)); // below-throne floors always hold combat nodes
  stockLevelRooms(room);
  const node = room.level.nodes.find((n) => n.type === "combat") ?? fail("no combat node on the floor map");
  node.effect = null;
  node.foes = fspecs.map((fs) => ({ bodyKey: fs.body, gear: [...(fs.gear ?? [])],
    level: Math.max(FOE_LEVEL_MIN, fs.level | 0 || FOE_LEVEL_MIN), greedy: false, owner: null }));
  node.ante = node.foes.reduce((s, f) => s + anteOfFoe(f), 0);
  room.level.currentId = node.id;
  enterRoom(room);   // the REAL entry: lanes derive, bodies worn (homeBody), roster staged, phase → "setup"
  // Re-spawn the roster OURSELVES (same spawnEnemy the real path uses) so each spec entry keeps a
  // handle for its overrides — buildRoom's tankiest-first shuffle would sever the spec↔entity map.
  room.lanes = Array.from({ length: room.laneCount }, () => []);
  fspecs.forEach((fs, i) => {
    const li = Math.max(0, Math.min(room.laneCount - 1, Number.isInteger(fs.lane) ? fs.lane : i % room.laneCount));
    const f = spawnEnemy(fs.body, fs.gear ?? [], Math.max(FOE_LEVEL_MIN, fs.level | 0 || FOE_LEVEL_MIN));
    f.lane = li;
    if (fs.maxHp != null) f.maxHp = Math.max(1, fs.maxHp | 0);
    if (fs.hp != null) f.hp = Math.max(1, Math.min(f.maxHp, fs.hp | 0)); else f.hp = Math.min(f.hp, f.maxHp);
    if (fs.dmgReduce != null) f.dmgReduce = Math.max(0, fs.dmgReduce | 0);   // → the foe-side ⬡ armor badge
    for (const b of fs.buffs ?? []) addBuff(f, b.kind, b.amount ?? 0, b.dur ?? 9999);  // foe buffs survive beginCombat
    room.lanes[li].push(f);
  });
  formUp(room);
  players.forEach((p, i) => {                            // run-state the draft/shop would have accrued
    const ps = pspecs[i] ?? {};
    for (const k of ps.unlocked ?? []) room.unlockedBodies.add(k);
    for (const k of ps.adopted ?? []) { room.unlockedBodies.add(k); (room.adoptedBodies ??= new Set()).add(k); }
    if (ps.treasure != null) p.treasure = Math.max(0, ps.treasure | 0);
    if (ps.maxHp != null) p.maxHp = Math.max(1, ps.maxHp | 0);
    if (ps.hp != null) p.hp = Math.max(1, Math.min(p.maxHp, ps.hp | 0)); else p.hp = Math.min(p.hp, p.maxHp);
  });
  if (phase === "setup") return room;                    // formation screen — the ▶ start is the player's
  beginCombat(room);                                     // the REAL combat open: deals hands, resets per-fight state
  players.forEach((p, i) => {                            // now the per-fight overrides beginCombat would have wiped
    const ps = pspecs[i] ?? {};
    if (ps.hand?.length) {                               // exact opening hand: PULL the keys from the dealt piles
      const pool = [...(p.hand ?? []), ...(p.deck ?? [])];
      const hand = [];
      for (const k of ps.hand) {
        const ix = pool.findIndex((c) => c.key === k);
        if (ix < 0) fail(`players[${i}].hand card "${k}" missing from the dealt piles (deck filtered it?)`);
        hand.push(pool.splice(ix, 1)[0]);
      }
      p.hand = hand; p.deck = pool; p.disc = [];
    }
    if (ps.moxie != null) p.moxie = Math.max(0, Math.min(MOXIE_CAP, ps.moxie | 0));
    if (ps.shield != null) p.shield = Math.max(0, ps.shield | 0);
    for (const b of ps.buffs ?? []) addBuff(p, b.kind, b.amount ?? 0, b.dur ?? 9999);
  });
  for (const s of spec.summons ?? []) {                  // pre-placed tokens enter via the REAL summon verb
    const src = s.side === "hero"
      ? players[Math.max(0, Math.min(players.length - 1, s.player | 0))]
      : { side: "foe", lane: Math.max(0, Math.min(room.laneCount - 1, s.lane | 0)) };
    summonBodies(room, src, { do: "summon", body: s.body, count: Math.max(1, s.count | 0 || 1),
      ...(s.lane != null ? { lane: s.lane } : {}) });
  }
  return room;
}
