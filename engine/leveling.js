// King Mimic — run-wide point leveling and body-upgrade catalog.
//
// A normal body earns one freely reallocatable point for every level above 1.
// HP / melee / ranged ranks cost one point each. Mastery is body-specific and
// may be bought once; Specialty is body-specific and repeatable unless its
// authored row has a cap. The same allocation shape is carried by heroes and
// foes so combat remains symmetric.
import { BODIES } from "./bodies.js";

export const LEVEL_HP_PER_POINT = 4;
export const LEVEL_MASTERY_COST = 2;
export const LEVEL_SPECIALTY_COST = 1;
export const levelPointBudget = (level) => Math.max(0, ((level ?? 1) | 0) - 1);

// Fantasy-first elite tiers. The +2/+4/+6 ante premiums stay deliberately
// close to the previous flat +3; adoption is a separate first-wear run cost.
// FLAG (owner): tier membership and numbers are intentionally easy to retune.
export const ELITE_TIERS = Object.freeze({
  1: Object.freeze({ name: "Elite I", ante: 2, adopt: 4,
    bodies: Object.freeze(["auditAngel", "bankruptBarghest", "depressionDemon", "hedgefundKnight", "recessionRevenant", "shortscerer"]) }),
  2: Object.freeze({ name: "Elite II", ante: 4, adopt: 7,
    bodies: Object.freeze(["basilisk", "callingCaltist", "medusa", "debtDragon", "wanderCastle", "oligarchyOoze", "gdpGiant", "onePercenterCyclops"]) }),
  3: Object.freeze({ name: "Elite III · Mythic", ante: 6, adopt: 11,
    bodies: Object.freeze(["killionaire", "fundjin", "neptune", "atlas", "sphinx", "bonelord", "affluenceAnubis", "timeshareTyrant", "psychicVeteran", "salesSage"]) }),
});

export const ELITE_TIER_BY_BODY = Object.freeze(Object.fromEntries(
  Object.entries(ELITE_TIERS).flatMap(([tier, def]) => def.bodies.map((key) => [key, Number(tier)])),
));
export const eliteTierOf = (bodyKey) => ELITE_TIER_BY_BODY[bodyKey] ?? 0;
export const eliteTierDef = (bodyKey) => ELITE_TIERS[eliteTierOf(bodyKey)] ?? null;

const up = (mastery, specialty, specialtyCap = null) => Object.freeze({
  mastery: Object.freeze({ name: "Mastery", cost: LEVEL_MASTERY_COST, text: mastery, cap: 1 }),
  specialty: Object.freeze({ name: "Specialty", cost: LEVEL_SPECIALTY_COST, text: specialty, repeatable: true,
    ...(specialtyCap == null ? {} : { cap: specialtyCap }) }),
});

// The owner-facing source for every wearable body's fourth and fifth rows.
// Specialty text is written per rank; rank one reproduces the balance-review
// artifact and later ranks extend it conservatively.
export const BODY_UPGRADES = Object.freeze({
  frugal: up("Whenever Fat Cat summons from damage taken, it also deals damage to the front foe equal to the living rats in its lane.", "Every summoned body gains +1 melee and ranged damage per rank; a merged rat stack receives the bonus once."),
  leverage: up("Every summon enters with shield equal to its per-body moxie cost (rats count as 1).", "Every 3 moxie spent summons +1 additional rat per rank."),
  hedge: up("Trigger every 2 cards instead of 3.", "Every summon effect creates +1 body per rank."),
  ratTrader: up("Passive healing becomes 3 instead of 2.", "Passive overhealing becomes shield; ranks after the first add +1 spill shield."),
  compound: up("The doubled first card gains +1 flat output.", "Start combat with 2 moxie at rank 1, then +1 per rank.", 9),
  discountDuel: up("Start combat with +2 damage instead of +1.", "Your first card each combat costs 1 less per rank (minimum 1).", 9),
  pyramidRogue: up("Cross-triggers grant +2 damage instead of +1.", "Completing a melee+ranged pair grants 2 shield at rank 1, then +1 per rank."),
  bloodfund: up("Counterattacks deal 2 instead of 1.", "Start each combat with 1 moxie.", 1),
  heavyHand: up("Trigger every 3 moxie instead of 4.", "Each passive damage gain also grants 2 shield at rank 1, then +1 per rank."),
  rentier: up("Passive healing becomes 2 instead of 1.", "Passive overhealing becomes shield; ranks after the first add +1 spill shield."),
  ratBaron: up("Ranged cards cost 2 less instead of 1 (minimum 1).", "Your first ranged card each combat refunds 1 moxie per rank.", 10),
  counterparty: up("Passive damage gain becomes +2 instead of +1.", "Start each combat with +1 damage.", 1),
  juggernaut: up("Starting shield becomes 150% of max HP.", "Your first shield break each combat grants +1 damage per rank."),
  quakeCap: up("Trigger every 2 cards instead of 3.", "Passive lane damage gains +1 per rank."),
  mutualMend: up("Passive damage becomes 2 instead of 1.", "Every second passive trigger hits the lane for 1 damage per rank."),
  bribedBishop: up("Healing grants +2 damage instead of +1.", "Overhealing becomes shield; ranks after the first add +1 spill shield."),
  chequeCherub: up("Passive healing becomes 8 instead of 6.", "The passive heal also grants 3 shield at rank 1, then +1 per rank."),
  pyramidHead: up("Trigger every 2 cards instead of 3.", "The free card gains +1 flat output per rank."),
  pennyPixie: up("Melee cards cost 2 less instead of 1 (minimum 1).", "Discounted melee cards deal +1 damage per rank."),
  econElemental: up("Start each combat with 5 moxie.", "The first 10-moxie trigger happens 1 second sooner per rank.", 6),
  warewolf: up("Wolf form grants +4 melee instead of +3.", "Human form damage reduction gains +1 per rank."),
  atlas: up("Shrug triggers every 8 damage instead of 10.", "Shrug base damage becomes 7 at rank 1, then +1 per rank."),
  killionaire: up("The double-moxie rush never ends. If you defeated anything during a 6-second window, gain +3 damage instead of +1.", "Start combat with 2 moxie per rank.", 5),
  basilisk: up("Passive poison becomes 2 instead of 1.", "Passive threshold drops by 1 moxie (minimum 2).", 1),
  // The second Fundjin clock now follows the shared two-point Mastery price; telemetry remains the
  // tuning check for whether this unusually large identity unlock needs an effect adjustment.
  fundjin: up("In addition to their 6-second timers, spending 6 moxie triggers both gods.", "Every god strike gains +1 base damage per rank."),
  auditAngel: up("Non-damaging cards grant 2 moxie instead of 1.", "Non-damaging cards also grant +1 shield per rank."),
  medusa: up("Damage applies 2 poison instead of 1.", "A poison defeat grants 2 moxie at rank 1, then +1 per rank.", 9),
  depressionDemon: up("Every debuff you apply lasts twice as long.", "Every debuff you apply gains +1 magnitude per rank."),
  bonelord: up("Each defeated summon you own grants +2 melee and ranged damage instead of +1.", "Each 12-second wave summons +1 rat per rank."),
  debtDragon: up("Trigger every 8 moxie gained instead of 10.", "The payoff gains +1 melee and ranged damage per rank."),
  neptune: up("Your card cost penalty becomes +1 instead of +2, and the replay threshold becomes 5+ instead of 6+.", "Each expensive card Neptune doubles also grants 2 shield at rank 1, then +1 per rank."),
  sphinx: up("Trigger every 5 moxie instead of 6.", "Lane-lifesteal base damage gains +1 per rank."),
  wanderCastle: up("Costly-shield threshold becomes 4 instead of 5.", "Every shield gain gets +1 more per rank."),
  affluenceAnubis: up("Each wave adds +2 rats to future waves instead of +1.", "Each wave adds +1 further rat of growth per rank."),
  timeshareTyrant: up("All your summons gain moxie twice as fast.", "The Amalgamation service clock is 1 second shorter per rank (minimum 3 seconds).", 9),
  oligarchyOoze: up("The stolen card uses its normal moxie cost instead of double.", "Every later damaging hit against you pays +1 moxie toward the stolen card per rank."),
  moneymancer: up("The ranged-discount clock arms every 5 seconds instead of 6.", "The armed ranged discount is +1 stronger per rank."),
  // FLAG (supportive upgrade designs, 2026-07-21): Dakota authored each new body's base passive and
  // established that Mastery/Specialty should custom-support it. These are the smallest direct
  // extensions of those passives; all numbers remain easy for him to retune after owner runs.
  gdpGiant: up("The guard applies while any melee card costing 6+ is held or queued, not only the armed card.", "The queued-melee guard takes 1 more damage off per rank."),
  hedgefundKnight: up("The shield/melee pulse triggers every 5 seconds instead of 6.", "Each pulse grants +1 extra melee or shield per rank."),
  psychicVeteran: up("Melee cards also add your ranged bonus to their damage.", "Melee cards aimed outside your lane deal +1 extra damage per rank."),
  // FLAG (supportive upgrade design, 2026-07-21): the owner authored the base Cyclops but not its
  // two level rows. These directly support its melee/cost identity and remain owner-review defaults.
  onePercenterCyclops: up("Your innate melee bonus becomes +4 instead of +3.", "Start combat with 1 moxie per rank.", 10),
  bankruptBarghest: up("Each melee attack adds 2 marks instead of 1.", "Each mark adds +1 further damage per rank to this Barghest's future melee attacks.", 3),
  recessionRevenant: up("Gain moxie twice as fast during the six-second afterlife.", "Gain +1 melee and ranged damage per rank during the afterlife.", 3),
  shortscerer: up("The guard applies while any qualifying ranged or summon card is held or queued.", "The guard reduces damage by 1 more per rank.", 3),
  callingCaltist: up("The health exchange becomes 1 health per missing moxie instead of 2.", "Health payments cost 1 less per rank (minimum 0).", 10),
  salesSage: up("Halved ranged costs round down instead of up.", "Halved ranged cards cost 1 less per rank (minimum 0).", 5),
});

export const emptyLevelAllocation = () => ({ hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 0 });
export const cleanLevelAllocation = (allocation) => {
  const out = emptyLevelAllocation();
  for (const key of Object.keys(out)) {
    const value = allocation?.[key];
    if (!Number.isInteger(value) || value < 0) return null;
    out[key] = value;
  }
  return out;
};

// Saved runs created before the Basilisk cadence guard could legally own the
// now-retired second Specialty rank. Mutate that one known-valid legacy shape
// in place so shared graph references survive v8 restore; every other body,
// allocation field, and malformed/unknown value remains untouched.
export function migrateSavedLevelAllocation(bodyKey, allocation) {
  if (bodyKey === "basilisk" && allocation?.specialty === 2) allocation.specialty = 1;
  return allocation;
}
export function allocationPoints(bodyKey, allocation) {
  const a = cleanLevelAllocation(allocation); if (!a) return Infinity;
  const def = BODY_UPGRADES[bodyKey];
  if (a.mastery > 1 || (!def && (a.mastery || a.specialty))) return Infinity;
  if (def?.specialty?.cap != null && a.specialty > def.specialty.cap) return Infinity;
  return a.hp + a.melee + a.ranged
    + a.mastery * (def?.mastery?.cost ?? 0)
    + a.specialty * (def?.specialty?.cost ?? 0);
}
export function validLevelAllocation(bodyKey, level, allocation, requireAll = false) {
  const used = allocationPoints(bodyKey, allocation), budget = levelPointBudget(level);
  return Number.isFinite(used) && (requireAll ? used === budget : used <= budget);
}

// Converts the old alternating curve losslessly: L2's +4 HP becomes hp:1,
// L3's +1 combat becomes one combat rank, and so on. Also supplies a safe
// all-HP fallback for malformed/cached-client state.
export function legacyLevelAllocation(level, old = null, preferred = "melee") {
  const budget = levelPointBudget(level);
  if (old && Number.isInteger(old.hp) && Number.isInteger(old.melee) && Number.isInteger(old.ranged)
      && Number.isInteger(old.mastery) && Number.isInteger(old.specialty)) return { ...old };
  const hp = Math.min(budget, Math.floor(Math.max(1, level | 0) / 2));
  const combat = budget - hp;
  const oldMelee = Math.max(0, old?.melee | 0), oldRanged = Math.max(0, old?.ranged | 0);
  const melee = oldMelee + oldRanged > 0
    ? Math.round(combat * oldMelee / (oldMelee + oldRanged))
    : preferred === "ranged" ? 0 : combat;
  return { hp, melee, ranged: combat - melee, mastery: 0, specialty: 0 };
}

export function randomLevelAllocation(bodyKey, level, rng = Math.random) {
  const a = emptyLevelAllocation();
  const def = BODY_UPGRADES[bodyKey];
  let left = levelPointBudget(level);
  while (left > 0) {
    const options = ["hp", "melee", "ranged"];
    if (def && !a.mastery && def.mastery.cost <= left) options.push("mastery");
    if (def && def.specialty.cost <= left && (def.specialty.cap == null || a.specialty < def.specialty.cap)) options.push("specialty");
    const pick = options[Math.max(0, Math.min(options.length - 1, Math.floor(rng() * options.length)))];
    a[pick]++;
    left -= pick === "mastery" ? def.mastery.cost : pick === "specialty" ? def.specialty.cost : 1;
  }
  return a;
}

export const masteryRank = (c) => Math.min(1, Math.max(0, c?.levelAllocation?.mastery | 0));
export const specialtyRank = (c) => Math.max(0, c?.levelAllocation?.specialty | 0);

// A per-combatant body view for cost/static-field mechanics. Never mutates the
// shared BODIES table, so two copies of the same body can own different ranks.
export function leveledBody(c) {
  const base = BODIES[c?.bodyKey] ?? {};
  const m = masteryRank(c), s = specialtyRank(c);
  // Depression Demon replaced its old base duration multiplier with an always-on
  // magnitude bonus, so even a rank-zero wearer needs an instance-derived view.
  if (!m && !s && c?.bodyKey !== "depressionDemon") return base;
  const b = { ...base };
  switch (c.bodyKey) {
    case "ratBaron": if (m) b.costKind = { ...base.costKind, amount: 2, floor: 1 }; break;
    case "pennyPixie": if (m) b.costKind = { ...base.costKind, amount: 2, floor: 1 }; break;
    case "neptune": if (m) { b.costAdd = 1; b.doubleExpensive = 5; } break;
    case "depressionDemon": b.debuffMagnitude = 2 + s; b.debuffMult = m ? 2 : 1; break;
    case "medusa": if (m) b.poisonOnDamage = 2; break;
    case "wanderCastle": if (m) b.costlyShield = 4; b.shieldGainBonus = (base.shieldGainBonus ?? 0) + s; break;
    case "gdpGiant": b.queuedMeleeGuard = { ...base.queuedMeleeGuard, anyHeld: !!m,
      dr: (base.queuedMeleeGuard?.dr ?? 2) + s }; break;
    case "psychicVeteran": b.psychicMelee = { ...base.psychicMelee, addRangedBonus: !!m,
      crossLaneBonus: s }; break;
    case "bankruptBarghest": b.barghestMarks = { ...base.barghestMarks, perHit: m ? 2 : 1,
      value: 1 + s }; break;
    case "shortscerer": b.queuedHighGuard = { ...base.queuedHighGuard, anyHeld: !!m,
      dr: (base.queuedHighGuard?.dr ?? 1) + s }; break;
    case "callingCaltist": b.healthCast = { ...base.healthCast, multiplier: m ? 1 : 2,
      discount: s }; break;
    case "salesSage": b.costKind = { ...base.costKind, rounding: m ? "floor" : "ceil",
      after: s }; break;
  }
  return b;
}

const cloneOps = (ops) => (ops ?? []).map((op) => ({ ...op }));
export function leveledPassives(c) {
  const source = BODIES[c?.bodyKey]?.passive ?? [];
  const pas = source.map((p) => ({ ...p, ops: cloneOps(p.ops) }));
  const m = masteryRank(c), s = specialtyRank(c);
  const first = pas[0];
  if (!first) return pas;
  switch (c.bodyKey) {
    case "frugal": if (m) first.ops.push({ do: "dealRatsInLane", target: "front", noBonus: true }); break;
    case "leverage": if (s) first.ops[0].count = 1 + s; break;
    case "hedge": if (m) first.play = 2; break;
    case "ratTrader": if (m) first.ops[0].amount = 3; if (s) { first.ops[0].overheal = true; first.ops[0].spillBonus = s - 1; } break;
    case "pyramidRogue":
      if (m) for (const p of pas) for (const op of p.ops) if (op.amount != null) op.amount = 2;
      if (s) pas.push({ pairMR: true, ops: [{ do: "shield", amount: 1 + s }] });
      break;
    case "bloodfund": if (m) first.ops[0].amount = 2; break;
    case "heavyHand": if (m) first.spend = 3; if (s) first.ops.push({ do: "shield", amount: 1 + s }); break;
    case "rentier": if (m) first.ops[0].amount = 2; if (s) { first.ops[0].overheal = true; first.ops[0].spillBonus = s - 1; } break;
    case "counterparty": if (m) first.ops[0].amount = 2; break;
    case "quakeCap": if (m) first.play = 2; if (s) first.ops[0].amount = 1 + s; break;
    case "mutualMend": if (m) first.ops[0].amount = 2; if (s) first.ops[0].alternateLane = s; break;
    case "chequeCherub": if (m) first.ops[0].amount = 8; if (s) first.ops[0].shield = 2 + s; break;
    case "pyramidHead": if (m) first.play = 2; break;
    case "fundjin": for (const p of pas) { if (m) p.spend = 6; if (s) for (const op of p.ops) if (op.do === "deal") op.amount = (op.amount ?? 0) + s; } break;
    case "auditAngel": if (m) first.ops[0].amount = 2; if (s) first.ops.push({ do: "shield", amount: s }); break;
    case "debtDragon": if (m) first.gain = 8; if (s) for (const op of first.ops) op.amount = 3 + s; break;
    case "basilisk": if (m) first.ops[0].amount = 2; if (s) first.spend = Math.max(2, 3 - s); break;
    case "sphinx": if (m) first.spend = 5; if (s) first.ops[0].amount = 1 + s; break;
  }
  return pas;
}

// The combat HUD must describe the per-instance mechanics it is actually running.  Keeping this
// beside leveledBody/leveledPassives makes the numbers come from the same ranks for heroes and foes;
// snapshot code must never fall back to the catalog's rank-zero prose for a leveled combatant.
export function leveledPassiveText(c) {
  const base = BODIES[c?.bodyKey] ?? {};
  const m = masteryRank(c), s = specialtyRank(c);
  // These two bodies gained new base mechanics after the static body catalog was
  // authored. Always derive their runtime prose here, including at rank zero.
  if (!m && !s && c?.bodyKey !== "killionaire" && c?.bodyKey !== "depressionDemon") return base.passiveText ?? null;
  const extra = (text) => text ? ` ${text}` : "";
  switch (c.bodyKey) {
    case "frugal": return `Every 3 damage taken: summon a rat${m ? ", then deal damage to the front foe equal to the living rats in this lane" : ""}.${extra(s ? `Every summoned body gains +${s} melee and ranged damage; a merged rat stack gets the bonus once.` : "")}`;
    case "leverage": return `Every 3 moxie spent: summon ${1 + s} rat${1 + s === 1 ? "" : "s"}.${extra(m ? "Every summon enters with shield equal to its per-body moxie cost (rats count as 1)." : "")}`;
    case "hedge": return `Every ${m ? 2 : 3} cards played: summon ${2 + s} rats.${extra(s ? `Every summon effect creates +${s} body.` : "")}`;
    case "ratTrader": return `Every 4 moxie spent: heal ${m ? 3 : 2}.${extra(s ? `Overhealing becomes shield${s > 1 ? ` with +${s - 1} spill shield` : ""}.` : "")}`;
    case "compound": return `The first card you play each combat resolves twice${m ? ", with +1 flat output" : ""}.${extra(s ? `Start combat with ${1 + s} moxie.` : "")}`;
    case "discountDuel": return `Start each combat with +${m ? 2 : 1} damage.${extra(s ? `Your first card costs ${s} less (minimum 1).` : "")}`;
    case "pyramidRogue": return `Play a ranged card: +${m ? 2 : 1} melee damage. Play a melee card: +${m ? 2 : 1} ranged damage.${extra(s ? `Completing a melee+ranged pair grants ${1 + s} shield.` : "")}`;
    case "bloodfund": return `Every 3 damage taken: melee the front foe for ${m ? 2 : 1}.${extra(s ? "Start each combat with 1 moxie." : "")}`;
    case "heavyHand": return `Every ${m ? 3 : 4} moxie spent: gain +1 damage.${extra(s ? `Also gain ${1 + s} shield.` : "")}`;
    case "rentier": return `Every 2 damage dealt: heal ${m ? 2 : 1}.${extra(s ? `Overhealing becomes shield${s > 1 ? ` with +${s - 1} spill shield` : ""}.` : "")}`;
    case "ratBaron": return `All your ranged cards cost ${m ? "2 less (minimum 1)" : "1 less"}.${extra(s ? `Your first ranged card each combat refunds ${s} moxie.` : "")}`;
    case "counterparty": return `Every 3 damage taken: gain +${m ? 2 : 1} damage.${extra(s ? "Start each combat with +1 damage." : "")}`;
    case "juggernaut": return `Enter combat with shield equal to ${m ? "150% of max" : "max"} health.${extra(s ? `Your first shield break grants +${s} damage.` : "")}`;
    case "quakeCap": return `Every ${m ? "2nd" : "3rd"} card played: deal ${1 + s} ranged damage to the foe lane.`;
    case "mutualMend": return `Every 2nd card played: melee the front foe for ${m ? 2 : 1}.${extra(s ? `Every second trigger also deals ${s} damage to the foe lane.` : "")}`;
    case "bribedBishop": return `Whenever healed: gain +${m ? 2 : 1} damage.${extra(s ? `Overhealing becomes shield${s > 1 ? ` with +${s - 1} spill shield` : ""}.` : "")}`;
    case "chequeCherub": return `Every 3rd card: heal the target for ${m ? 8 : 6}.${extra(s ? `Also grant ${2 + s} shield.` : "")}`;
    case "pyramidHead": return `Every ${m ? 2 : 3} cards you play: the next card is FREE.${extra(s ? `That free card gains +${s} flat output.` : "")}`;
    case "pennyPixie": return `All your melee cards cost ${m ? "2 less (minimum 1)" : "1 less"}.${extra(s ? `Discounted melee cards deal +${s} damage.` : "")}`;
    case "econElemental": return `Does not gain moxie normally. Every 6 seconds, gain 10 moxie.${extra(m ? "Start combat with 5 moxie." : "")}${extra(s ? `The first trigger happens ${s} second${s === 1 ? "" : "s"} sooner.` : "")}`;
    case "warewolf": return `Transforms every 6s. HUMAN: −3 melee & ranged, takes ${1 + s} less damage. WAREWOLF: +${m ? 4 : 3} melee, no damage reduction.`;
    case "atlas": return `Every ${m ? 8 : 10} damage taken: SHRUG for ${s ? 6 + s : 5} plus melee & ranged bonus to every opponent in the lane.`;
    case "killionaire": return `Start combat with double moxie gain for 6 seconds. ${m ? "The rush always repeats; a window with a defeat grants +3 damage." : "When it ends, a window with a defeat grants +1 damage and repeats the rush."}${extra(s ? `Start combat with ${2 * s} moxie.` : "")}`;
    case "basilisk": return `Every ${Math.max(2, 3 - s)} moxie spent: poison the foe lane by ${m ? 2 : 1}.`;
    case "fundjin": return `Two gods, one body. Every 6s, Fundjin melee-strikes the foe lane for ${1 + s}; Raising-Profitsjin ranged-strikes the front foe twice for ${1 + s}.${extra(m ? "Spending 6 moxie also triggers both gods." : "")}`;
    case "auditAngel": return `Each non-damaging card you play: gain ${m ? 2 : 1} moxie.${extra(s ? `Also gain ${s} shield.` : "")}`;
    case "medusa": return `Whenever you deal damage to a target, also poison it by ${m ? 2 : 1}.${extra(s ? `A poison defeat grants ${1 + s} moxie.` : "")}`;
    case "depressionDemon": return `Every debuff you apply gains +${2 + s} magnitude.${extra(m ? "Every debuff you apply lasts twice as long." : "")}`;
    case "bonelord": return `Every 12 seconds, summon ${2 + s} rats. Whenever something you summoned is defeated, gain +${m ? 2 : 1} melee and ranged damage.`;
    case "debtDragon": return `Every ${m ? 8 : 10} moxie gained: +${3 + s} melee and +${3 + s} ranged damage.`;
    case "neptune": return `Your cards cost ${m ? 1 : 2} more (max 10), but any card costing ${m ? 5 : 6}+ resolves twice.${extra(s ? `Each doubled card also grants ${1 + s} shield.` : "")}`;
    case "sphinx": return `Every ${m ? 5 : 6} moxie spent: deal ${1 + s} + ranged bonus to the foe lane, healing the damage dealt (overheal → shield).`;
    case "wanderCastle": return `Casting a card costing ${m ? 4 : 5}+ grants that much shield. Every shield gain is ${1 + s} bigger.`;
    case "affluenceAnubis": return `Every 6 seconds, add +${1 + (m ? 1 : 0) + s} rat${1 + (m ? 1 : 0) + s === 1 ? "" : "s"} to all future waves, then summon that wave.`;
    case "timeshareTyrant": return `Start with a 12-HP Clockwork Amalgamation. Every ${Math.max(3, 12 - s)} seconds, revive it if dead; otherwise fully heal it and give it +1 damage and +1 protection.${extra(m ? "All your summons gain moxie twice as fast." : "")}`;
    case "oligarchyOoze": return `Steal the first damaging card used against you each combat and automatically cast it at ${m ? "normal" : "double"} moxie cost (maximum 10).${extra(s ? `Every later damaging hit pays ${s} moxie toward it.` : "")}`;
    case "moneymancer": return `Every ${m ? 5 : 6} seconds, arm your next ranged card to cost ${3 + s} less.`;
    case "gdpGiant": return `${m ? "While any held or queued" : "While the queued"} melee card costs 6+ moxie, take ${2 + s} less damage.`;
    case "hedgefundKnight": return `Every ${m ? 5 : 6} seconds: if shielded, gain +1 melee per 3 shield (minimum 1)${s ? ` plus ${s}` : ""}; otherwise gain ${3 + s} shield +1 per melee bonus.`;
    case "psychicVeteran": return `Melee cards can target any foe and deal +1 damage per 2 moxie cost${m ? ", plus your ranged bonus" : ""}.${extra(s ? `Melee cards aimed outside your lane deal +${s} more.` : "")}`;
    case "onePercenterCyclops": return `Innately has +${m ? 4 : 3} melee and -3 ranged damage. All cards cost 1 more (max 10). Enemy loadouts never include ranged cards.${extra(s ? `Start combat with ${s} moxie.` : "")}`;
    case "bankruptBarghest": return `Every melee attack marks its target ${m ? "twice" : "once"}. Future melee attacks by this Barghest deal +${1 + s} damage per mark.`;
    case "recessionRevenant": return `The first time it dies each combat, it keeps acting for 6 seconds${m ? " with double moxie gain" : ""}${s ? ` and +${s} melee and ranged damage` : ""}. A defeat during that time restores it to full health.`;
    case "shortscerer": return `While ${m ? "holding or queuing" : "queuing"} a ranged or summon card costing 6+ moxie, foes deal ${1 + s} less damage.`;
    case "callingCaltist": return `Ranged cards costing more than 5 moxie may pay 5 moxie plus ${m ? 1 : 2} health per moxie above 5${s ? `, reduced by ${s}` : ""}. Health payment cannot be lethal.`;
    case "salesSage": return `Ranged cards cost half, rounded ${m ? "down" : "up"}${s ? `, then cost ${s} less` : ""}.`;
    default: return base.passiveText ?? null;
  }
}

export function bodyUpgradeSnapshot(bodyKey) {
  const d = BODY_UPGRADES[bodyKey];
  return d ? { mastery: { ...d.mastery }, specialty: { ...d.specialty } } : null;
}
