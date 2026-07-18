// King Mimic — run-wide point leveling and body-upgrade catalog.
//
// A normal body earns one freely reallocatable point for every level above 1.
// HP / melee / ranged ranks cost one point each. Mastery is body-specific and
// may be bought once; Specialty is body-specific and repeatable. The same
// allocation shape is carried by heroes and foes so combat remains symmetric.
import { BODIES } from "./bodies.js";

export const LEVEL_HP_PER_POINT = 4;
export const levelPointBudget = (level) => Math.max(0, ((level ?? 1) | 0) - 1);

// Fantasy-first elite tiers. The +2/+4/+6 ante premiums stay deliberately
// close to the previous flat +3; adoption is a separate first-wear run cost.
// FLAG (owner): tier membership and numbers are intentionally easy to retune.
export const ELITE_TIERS = Object.freeze({
  1: Object.freeze({ name: "Elite I", ante: 2, adopt: 4,
    bodies: Object.freeze(["killionaire", "auditAngel", "depressionDemon", "bonelord"]) }),
  2: Object.freeze({ name: "Elite II", ante: 4, adopt: 7,
    bodies: Object.freeze(["basilisk", "medusa", "debtDragon", "wanderCastle"]) }),
  3: Object.freeze({ name: "Elite III · Mythic", ante: 6, adopt: 11,
    bodies: Object.freeze(["fundjin", "neptune", "atlas", "sphinx", "affluenceAnubis"]) }),
});

export const ELITE_TIER_BY_BODY = Object.freeze(Object.fromEntries(
  Object.entries(ELITE_TIERS).flatMap(([tier, def]) => def.bodies.map((key) => [key, Number(tier)])),
));
export const eliteTierOf = (bodyKey) => ELITE_TIER_BY_BODY[bodyKey] ?? 0;
export const eliteTierDef = (bodyKey) => ELITE_TIERS[eliteTierOf(bodyKey)] ?? null;

const up = (masteryCost, mastery, specialtyCost, specialty, specialtyCap = null) => Object.freeze({
  mastery: Object.freeze({ name: "Mastery", cost: masteryCost, text: mastery, cap: 1 }),
  specialty: Object.freeze({ name: "Specialty", cost: specialtyCost, text: specialty, repeatable: true,
    ...(specialtyCap == null ? {} : { cap: specialtyCap }) }),
});

// The owner-facing source for every wearable body's fourth and fifth rows.
// Specialty text is written per rank; rank one reproduces the balance-review
// artifact and later ranks extend it conservatively.
export const BODY_UPGRADES = Object.freeze({
  frugal: up(2, "Trigger every 2 damage instead of 3.", 2, "Your passive-summoned rats gain +1 max HP per rank."),
  leverage: up(3, "Trigger every 2 moxie instead of 3.", 2, "Every third rat you summon enters with +1 shield per rank."),
  hedge: up(3, "Trigger every 2 cards instead of 3.", 2, "Summon +1 rat per passive trigger per rank."),
  ratTrader: up(1, "Passive healing becomes 3 instead of 2.", 2, "Passive overhealing becomes shield; ranks after the first add +1 spill shield."),
  compound: up(2, "The doubled first card gains +1 flat output.", 2, "Start combat with 2 moxie at rank 1, then +1 per rank."),
  discountDuel: up(2, "Start combat with +2 damage instead of +1.", 2, "Your first card each combat costs 1 less per rank (minimum 1)."),
  pyramidRogue: up(3, "Cross-triggers grant +2 damage instead of +1.", 2, "Completing a melee+ranged pair grants 2 shield at rank 1, then +1 per rank."),
  bloodfund: up(2, "Counterattacks deal 2 instead of 1.", 2, "Each passive trigger also grants 2 shield at rank 1, then +1 per rank."),
  heavyHand: up(2, "Trigger every 3 moxie instead of 4.", 2, "Each passive damage gain also grants 2 shield at rank 1, then +1 per rank."),
  rentier: up(2, "Passive healing becomes 2 instead of 1.", 2, "Passive overhealing becomes shield; ranks after the first add +1 spill shield."),
  ratBaron: up(3, "Ranged cards cost 2 less instead of 1 (minimum 1).", 2, "Your first ranged card each combat refunds 1 moxie per rank."),
  counterparty: up(3, "Passive damage gain becomes +2 instead of +1.", 2, "Each passive trigger also grants 2 shield at rank 1, then +1 per rank."),
  juggernaut: up(2, "Starting shield becomes 150% of max HP.", 2, "Your first shield break each combat grants +1 damage per rank."),
  quakeCap: up(2, "Trigger every 2 cards instead of 3.", 2, "Passive lane damage gains +1 per rank."),
  mutualMend: up(2, "Passive damage becomes 2 instead of 1.", 2, "Every second passive trigger hits the lane for 1 damage per rank."),
  bribedBishop: up(2, "Healing grants +2 damage instead of +1.", 2, "Overhealing becomes shield; ranks after the first add +1 spill shield."),
  chequeCherub: up(1, "Passive healing becomes 8 instead of 6.", 2, "The passive heal also grants 3 shield at rank 1, then +1 per rank."),
  pyramidHead: up(3, "Trigger every 2 cards instead of 3.", 2, "The free card gains +1 flat output per rank."),
  pennyPixie: up(3, "Melee cards cost 2 less instead of 1 (minimum 1).", 2, "Discounted melee cards deal +1 damage per rank."),
  econElemental: up(2, "The gain phase grants 4 moxie instead of 3.", 2, "The loss phase also grants 2 shield at rank 1, then +1 per rank."),
  warewolf: up(2, "Wolf form grants +4 melee instead of +3.", 2, "Human form damage reduction gains +1 per rank."),
  atlas: up(2, "Shrug triggers every 8 damage instead of 10.", 3, "Shrug base damage becomes 7 at rank 1, then +1 per rank."),
  killionaire: up(2, "Start combat with 5 moxie instead of 3.", 2, "Your first card costs 2 less at rank 1, then 1 more per rank (minimum 1)."),
  basilisk: up(2, "Passive poison becomes 2 instead of 1.", 3, "Passive threshold drops by 1 moxie per rank (minimum 1).", 2),
  fundjin: up(3, "Both god timers become 5 seconds instead of 6.", 3, "Every god strike gains +1 base damage per rank."),
  auditAngel: up(2, "Non-damaging cards grant 2 moxie instead of 1.", 2, "Non-damaging cards also grant +1 shield per rank."),
  medusa: up(2, "Damage applies 2 poison instead of 1.", 2, "A poison defeat grants 2 moxie at rank 1, then +1 per rank."),
  depressionDemon: up(2, "Debuffs last 3× as long instead of 2×.", 2, "Applying a debuff deals 1 ranged damage to that target per rank."),
  bonelord: up(2, "Defeats grant +2 damage instead of +1.", 2, "Start combat with +1 passive damage stack per rank."),
  debtDragon: up(2, "Trigger every 8 moxie gained instead of 10.", 3, "The payoff gains +1 melee and ranged damage per rank."),
  neptune: up(2, "Your card cost penalty becomes +1 instead of +2.", 2, "Each expensive card Neptune doubles also grants 2 shield at rank 1, then +1 per rank."),
  sphinx: up(2, "Trigger every 5 moxie instead of 6.", 3, "Lane-lifesteal base damage gains +1 per rank."),
  wanderCastle: up(2, "Costly-shield threshold becomes 4 instead of 5.", 2, "Every shield gain gets +1 more per rank."),
  affluenceAnubis: up(3, "Rat waves arrive every 5 seconds instead of 6.", 3, "Every wave summons +1 rat per rank."),
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
  if (!m && !s) return base;
  const b = { ...base };
  switch (c.bodyKey) {
    case "ratBaron": if (m) b.costKind = { ...base.costKind, amount: 2, floor: 1 }; break;
    case "pennyPixie": if (m) b.costKind = { ...base.costKind, amount: 2, floor: 1 }; break;
    case "neptune": if (m) b.costAdd = 1; break;
    case "depressionDemon": if (m) b.debuffMult = 3; break;
    case "medusa": if (m) b.poisonOnDamage = 2; break;
    case "wanderCastle": if (m) b.costlyShield = 4; b.shieldGainBonus = (base.shieldGainBonus ?? 0) + s; break;
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
    case "frugal": if (m) first.hit = 2; break;
    case "leverage": if (m) first.spend = 2; break;
    case "hedge": if (m) first.play = 2; if (s) first.ops[0].count = 2 + s; break;
    case "ratTrader": if (m) first.ops[0].amount = 3; if (s) { first.ops[0].overheal = true; first.ops[0].spillBonus = s - 1; } break;
    case "pyramidRogue":
      if (m) for (const p of pas) for (const op of p.ops) if (op.amount != null) op.amount = 2;
      if (s) pas.push({ pairMR: true, ops: [{ do: "shield", amount: 1 + s }] });
      break;
    case "bloodfund": if (m) first.ops[0].amount = 2; if (s) first.ops.push({ do: "shield", amount: 1 + s }); break;
    case "heavyHand": if (m) first.spend = 3; if (s) first.ops.push({ do: "shield", amount: 1 + s }); break;
    case "rentier": if (m) first.ops[0].amount = 2; if (s) { first.ops[0].overheal = true; first.ops[0].spillBonus = s - 1; } break;
    case "counterparty": if (m) first.ops[0].amount = 2; if (s) first.ops.push({ do: "shield", amount: 1 + s }); break;
    case "quakeCap": if (m) first.play = 2; if (s) first.ops[0].amount = 1 + s; break;
    case "mutualMend": if (m) first.ops[0].amount = 2; if (s) first.ops[0].alternateLane = s; break;
    case "chequeCherub": if (m) first.ops[0].amount = 8; if (s) first.ops[0].shield = 2 + s; break;
    case "pyramidHead": if (m) first.play = 2; break;
    case "fundjin": for (const p of pas) { if (m) p.every = 50; if (s) for (const op of p.ops) if (op.do === "deal") op.amount = (op.amount ?? 0) + s; } break;
    case "auditAngel": if (m) first.ops[0].amount = 2; if (s) first.ops.push({ do: "shield", amount: s }); break;
    case "bonelord": if (m) first.ops[0].amount = 2; break;
    case "debtDragon": if (m) first.gain = 8; if (s) for (const op of first.ops) op.amount = 3 + s; break;
    case "basilisk": if (m) first.ops[0].amount = 2; if (s) first.spend = Math.max(1, 3 - s); break;
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
  if (!m && !s) return base.passiveText ?? null;
  const extra = (text) => text ? ` ${text}` : "";
  switch (c.bodyKey) {
    case "frugal": return `Every ${m ? 2 : 3} damage taken: summon a rat.${extra(s ? `Passive-summoned rats have +${s} max HP.` : "")}`;
    case "leverage": return `Every ${m ? 2 : 3} moxie spent: summon a rat.${extra(s ? `Every third rat enters with +${s} shield.` : "")}`;
    case "hedge": return `Every ${m ? 2 : 3} cards played: summon ${2 + s} rats.`;
    case "ratTrader": return `Every 4 moxie spent: heal ${m ? 3 : 2}.${extra(s ? `Overhealing becomes shield${s > 1 ? ` with +${s - 1} spill shield` : ""}.` : "")}`;
    case "compound": return `The first card you play each combat resolves twice${m ? ", with +1 flat output" : ""}.${extra(s ? `Start combat with ${1 + s} moxie.` : "")}`;
    case "discountDuel": return `Start each combat with +${m ? 2 : 1} damage.${extra(s ? `Your first card costs ${s} less (minimum 1).` : "")}`;
    case "pyramidRogue": return `Play a ranged card: +${m ? 2 : 1} melee damage. Play a melee card: +${m ? 2 : 1} ranged damage.${extra(s ? `Completing a melee+ranged pair grants ${1 + s} shield.` : "")}`;
    case "bloodfund": return `Every 3 damage taken: melee the front foe for ${m ? 2 : 1}.${extra(s ? `Also gain ${1 + s} shield.` : "")}`;
    case "heavyHand": return `Every ${m ? 3 : 4} moxie spent: gain +1 damage.${extra(s ? `Also gain ${1 + s} shield.` : "")}`;
    case "rentier": return `Every 2 damage dealt: heal ${m ? 2 : 1}.${extra(s ? `Overhealing becomes shield${s > 1 ? ` with +${s - 1} spill shield` : ""}.` : "")}`;
    case "ratBaron": return `All your ranged cards cost ${m ? "2 less (minimum 1)" : "1 less"}.${extra(s ? `Your first ranged card each combat refunds ${s} moxie.` : "")}`;
    case "counterparty": return `Every 3 damage taken: gain +${m ? 2 : 1} damage.${extra(s ? `Also gain ${1 + s} shield.` : "")}`;
    case "juggernaut": return `Enter combat with shield equal to ${m ? "150% of max" : "max"} health.${extra(s ? `Your first shield break grants +${s} damage.` : "")}`;
    case "quakeCap": return `Every ${m ? "2nd" : "3rd"} card played: deal ${1 + s} ranged damage to the foe lane.`;
    case "mutualMend": return `Every 2nd card played: melee the front foe for ${m ? 2 : 1}.${extra(s ? `Every second trigger also deals ${s} damage to the foe lane.` : "")}`;
    case "bribedBishop": return `Whenever healed: gain +${m ? 2 : 1} damage.${extra(s ? `Overhealing becomes shield${s > 1 ? ` with +${s - 1} spill shield` : ""}.` : "")}`;
    case "chequeCherub": return `Every 3rd card: heal the target for ${m ? 8 : 6}.${extra(s ? `Also grant ${2 + s} shield.` : "")}`;
    case "pyramidHead": return `Every ${m ? 2 : 3} cards you play: the next card is FREE.${extra(s ? `That free card gains +${s} flat output.` : "")}`;
    case "pennyPixie": return `All your melee cards cost ${m ? "2 less (minimum 1)" : "1 less"}.${extra(s ? `Discounted melee cards deal +${s} damage.` : "")}`;
    case "econElemental": return `Alternates every 6 seconds between gaining ${m ? 4 : 3} moxie and losing 1.${extra(s ? `The loss phase also grants ${1 + s} shield.` : "")}`;
    case "warewolf": return `Transforms every 6s. HUMAN: −3 melee & ranged, takes ${1 + s} less damage. WAREWOLF: +${m ? 4 : 3} melee, no damage reduction.`;
    case "atlas": return `Every ${m ? 8 : 10} damage taken: SHRUG for ${s ? 6 + s : 5} plus melee & ranged bonus to every opponent in the lane.`;
    case "killionaire": return `Start each combat with ${m ? 5 : 3} moxie.${extra(s ? `Your first card costs ${1 + s} less (minimum 1).` : "")}`;
    case "basilisk": return `Every ${Math.max(1, 3 - s)} moxie spent: poison the foe lane by ${m ? 2 : 1}.`;
    case "fundjin": return `Two gods, one body. Every ${m ? 5 : 6}s, Fundjin melee-strikes the foe lane for ${1 + s}; Raising-Profitsjin ranged-strikes the front foe twice for ${1 + s}.`;
    case "auditAngel": return `Each non-damaging card you play: gain ${m ? 2 : 1} moxie.${extra(s ? `Also gain ${s} shield.` : "")}`;
    case "medusa": return `Whenever you deal damage to a target, also poison it by ${m ? 2 : 1}.${extra(s ? `A poison defeat grants ${1 + s} moxie.` : "")}`;
    case "depressionDemon": return `Every debuff you apply lasts ${m ? "three times as" : "twice as"} long.${extra(s ? `Applying a debuff deals ${s} ranged damage to that target.` : "")}`;
    case "bonelord": return `Whenever something is defeated in your lane: gain +${m ? 2 : 1} damage.${extra(s ? `Start combat with +${s} damage.` : "")}`;
    case "debtDragon": return `Every ${m ? 8 : 10} moxie gained: +${3 + s} melee and +${3 + s} ranged damage.`;
    case "neptune": return `Your cards cost ${m ? 1 : 2} more (max 10), but any card costing 6+ resolves twice.${extra(s ? `Each doubled card also grants ${1 + s} shield.` : "")}`;
    case "sphinx": return `Every ${m ? 5 : 6} moxie spent: deal ${1 + s} + ranged bonus to the foe lane, healing the damage dealt (overheal → shield).`;
    case "wanderCastle": return `Casting a card costing ${m ? 4 : 5}+ grants that much shield. Every shield gain is ${1 + s} bigger.`;
    case "affluenceAnubis": return `Every ${m ? 5 : 6} seconds, summon one rat plus another for each wave${s ? `, plus ${s} more` : ""}.`;
    default: return base.passiveText ?? null;
  }
}

export function bodyUpgradeSnapshot(bodyKey) {
  const d = BODY_UPGRADES[bodyKey];
  return d ? { mastery: { ...d.mastery }, specialty: { ...d.specialty } } : null;
}
