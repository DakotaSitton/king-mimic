// King Mimic — run-wide point leveling and body-upgrade catalog.
//
// A normal body earns one freely reallocatable point for every level above 1.
// HP / melee / ranged ranks cost one point each. Mastery is body-specific and
// may be bought once; Specialty is body-specific and repeatable unless its
// authored row has a cap. The same allocation shape is carried by heroes and
// foes so combat remains symmetric.
import { BODIES } from "./bodies.js";

// OWNER 2026-07-26, verbatim: "hp increase bonus is 3 instead of 4 on the level up screen now."
// 4 → 3. This is the ONLY definition; the level-up screen's copy is generated from it
// (`knowledgeCatalog`, engine/snapshot.js) so the printed "+N max HP per point" moves with it.
export const LEVEL_HP_PER_POINT = 3;
export const LEVEL_MASTERY_COST = 2;
export const LEVEL_SPECIALTY_COST = 1;
export const levelPointBudget = (level) => Math.max(0, ((level ?? 1) | 0) - 1);

// Fantasy-first elite tiers. The +2/+4/+6 ante premiums stay deliberately
// close to the previous flat +3; adoption is a separate first-wear run cost.
// FLAG (owner): tier membership and numbers are intentionally easy to retune.
export const ELITE_TIERS = Object.freeze({
  1: Object.freeze({ name: "Elite I", ante: 2, adopt: 4,
    bodies: Object.freeze(["auditAngel", "bankruptBarghest", "depressionDemon", "hedgefundKnight", "recessionRevenant", "shortscerer", "basilisk", "callingCaltist", "medusa", "oligarchyOoze", "gdpGiant"]) }),
  2: Object.freeze({ name: "Elite II", ante: 4, adopt: 7,
    bodies: Object.freeze([]) }),
  3: Object.freeze({ name: "Elite III · Mythic", ante: 6, adopt: 11,
    bodies: Object.freeze(["killionaire", "fundjin", "neptune", "atlas", "sphinx", "bonelord", "affluenceAnubis", "timeshareTyrant", "psychicVeteran", "salesSage", "debtDragon", "wanderCastle", "onePercenterCyclops"]) }),
});

export const ELITE_TIER_BY_BODY = Object.freeze(Object.fromEntries(
  Object.entries(ELITE_TIERS).flatMap(([tier, def]) => def.bodies.map((key) => [key, Number(tier)])),
));
export const eliteTierOf = (bodyKey) => ELITE_TIER_BY_BODY[bodyKey] ?? 0;
export const eliteTierDef = (bodyKey) => ELITE_TIERS[eliteTierOf(bodyKey)] ?? null;

const up = (mastery, specialty, specialtyCap = null, masteryCost = LEVEL_MASTERY_COST) => Object.freeze({
  mastery: Object.freeze({ name: "Mastery", cost: masteryCost, text: mastery, cap: 1 }),
  specialty: Object.freeze({ name: "Specialty", cost: LEVEL_SPECIALTY_COST, text: specialty, repeatable: true,
    ...(specialtyCap == null ? {} : { cap: specialtyCap }) }),
});

// The owner-facing source for every wearable body's fourth and fifth rows.
// Specialty text is written per rank; rank one reproduces the balance-review
// artifact and later ranks extend it conservatively.
export const BODY_UPGRADES = Object.freeze({
  fatCat: up("While you have a summon in your lane, take 1 less damage.", "Your summons deal +1 damage per rank."),
  royalRat: up("Every 3-moxie passive trigger summons 3 rats instead of 1.", "Every summon enters with +1 shield per rank."),
  paidPiper: up("Your summon effects create twice as many bodies.", "The first time you summon each combat, gain double moxie for 3 seconds per rank.", null, 3),
  tollTroll: up("Each passive heal also raises max HP by the amount healed for the current fight.", "Passive healing increases by 1 per rank."),
  centlessCentaur: up("The first card resolves three times instead of twice.", "Start combat with 2 moxie per rank; this opening moxie can overflow.", 9),
  malevolentMouse: up("Whenever anything is defeated, reactivate the six-second damage bonus.", "While the bonus is active, gain +1 melee and +1 ranged damage per rank.", 9),
  rentSeekingRuneblade: up("Cards costing 5+ grant +1 cross-type damage per moxie cost above 4 instead of +1.", "Each completed melee+ranged pair grants 1 shield per rank."),
  marketCrashMinotaur: up("Each passive melee trigger attacks twice.", "Each passive melee hit deals +2 damage per rank.", 1),
  interestImp: up("Each passive trigger grants +2 damage instead of +1.", "Each trigger also grants +1 melee or ranged damage at random per rank."),
  vengefulVampire: up("Every damage dealt counts toward passive healing instead of every 2 damage.", "Whenever you heal at least 5, gain +1 melee and ranged damage per rank."),
  lizardWizard: up("Your first ranged card each combat costs 4 less.", "Each ranged card played grants +2 ranged damage for 6 seconds per rank; stacks expire independently.", 10),
  bondBehemoth: up("Trigger every 2 damage taken instead of 3.", "After 10 seconds, gain +2 melee and ranged damage per rank.", 1),
  goldenGolem: up("The first time your shield is depleted, gain double moxie for 12 seconds.", "While shielded, gain +2 damage per rank."),
  cryptoChimera: up("After completing the three-effect rotation, immediately repeat all three effects.", "Each rotating effect gains +2 output per rank."),
  wearyWageslave: up("Attack after every card instead of every second card.", "The passive melee attack deals +2 damage per rank."),
  bribedBishop: up("Whenever you are healed, gain +2 damage.", "Every 5 healing you deal grants +2 damage per rank."),
  chequeCherub: up("Trigger every 2 cards instead of 3.", "The passive heal also grants 2 shield per rank."),
  pyramidHead: up("The free card resolves twice.", "Each free card grants 1 moxie per rank."),
  pennyPixie: up("Your first melee card each combat costs 4 less.", "Each melee card played grants +2 melee damage for 6 seconds per rank; stacks expire independently."),
  econElemental: up("The 10-moxie pulse happens every 5 seconds instead of 6.", "Start combat with 2 moxie per rank.", 6),
  warewolf: up("Human form has 2 damage reduction, and the Wolf-form melee bonus grows by +1 each transform.", "Heal 2 per rank whenever you transform."),
  atlas: up("SHRUG triggers every 6 damage taken instead of 10.", "SHRUG deals +3 damage per rank."),
  killionaire: up("The double-moxie rush never ends. If you defeated anything during a 6-second window, gain +3 damage instead of +1.", "Start combat with 2 moxie per rank.", 5),
  basilisk: up("Trigger every 2 moxie spent instead of 3.", "For the first 6 seconds, foes in your lane deal 1 less damage per rank.", 1),
  fundjin: up("Both gods strike every 3 seconds instead of every 6.", "Each god strike gains +1 damage per rank."),
  auditAngel: up("The passive heal becomes 12 instead of 6.", "The passive heal also grants 2 shield per rank."),
  medusa: up("Damage applies 2 poison instead of 1.", "Poisoned foes deal up to 1 less damage per rank, limited by their poison stacks.", 9),
  depressionDemon: up("Every debuff you apply lasts twice as long.", "Every debuff you apply gains +1 magnitude per rank."),
  bonelord: up("Each defeated summon you own grants +2 melee and ranged damage instead of +1.", "Each 12-second wave summons +1 rat per rank."),
  debtDragon: up("The 10-moxie-gained payoff becomes +9 melee and ranged damage instead of +5.", "Every 10 moxie spent refunds 1 moxie per rank.", 5),
  neptune: up("Cards cost 2 more instead of 3.", "Start combat with 2 moxie per rank."),
  sphinx: up("Every time an option is used, the next choice happens 1 second faster, down to 6 seconds.", "Every passive option gains +2 effect per rank."),
  wanderCastle: up("All shield gains are doubled.", "Every 6 seconds, deal 1 damage to your target per rank."),
  affluenceAnubis: up("Each wave adds +2 rats to future waves instead of +1.", "Each wave adds +1 further rat of growth per rank."),
  timeshareTyrant: up("All your summons gain moxie twice as fast.", "The Amalgamation service clock is 1 second shorter per rank (minimum 3 seconds).", 9),
  oligarchyOoze: up("Digested cards use their base moxie cost instead of base cost +3.", "Whenever you play a digested card, heal 1 per rank."),
  moneymancer: up("The discount clock arms every 4 seconds instead of 6.", "The armed ranged-or-summon discount is +1 stronger per rank."),
  gdpGiant: up("The queued-heavy guard reduces damage by 3 instead of 1.", "Each heavy card played makes the next heavy card deal +1 damage per rank."),
  hedgefundKnight: up("The shield/melee pulse triggers every 4 seconds instead of 6.", "Each pulse grants +2 extra shield or +1 extra melee per rank."),
  psychicVeteran: up("Melee cards also add your ranged bonus to their damage.", "Melee cards aimed outside your lane deal +1 extra damage per rank."),
  onePercenterCyclops: up("Heavy-tagged melee cards gain +1 damage per 3 max HP instead of per 5 max HP.", "Start combat with 1 moxie per rank.", 10),
  bankruptBarghest: up("Each damaging hit adds 2 marks instead of 1.", "Your first card per rank each combat costs 2 less.", 3),
  recessionRevenant: up("The afterlife lasts 3 seconds longer and grants double moxie.", "During the afterlife, gain +2 melee and ranged damage per rank.", 3),
  shortscerer: up("The queued-card guard reduces damage by 2 instead of 1.", "The first ranged or summon card costing 5+ refunds 2 moxie per rank.", 3),
  callingCaltist: up("The first ranged or summon card each combat can replace its entire moxie cost with nonlethal health.", "Every 6 seconds, restore up to 2 health spent on card costs per rank.", 10),
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

// Clamp known pre-balance allocations whose once-legal Specialty ranks now exceed their caps.
// Mutate in place so shared graph references survive v8 restore; removed ranks become unallocated
// points the owner may spend again instead of continuing to power an invalid saved build.
export function migrateSavedLevelAllocation(bodyKey, allocation) {
  if (bodyKey === "basilisk" && allocation?.specialty === 2) allocation.specialty = 1;
  if (bodyKey === "debtDragon" && Number.isInteger(allocation?.specialty)
      && allocation.specialty > 5) allocation.specialty = 5;
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
export const specialtyRank = (c) => {
  const rank = Math.max(0, c?.levelAllocation?.specialty | 0);
  const cap = BODY_UPGRADES[c?.bodyKey]?.specialty?.cap;
  return cap == null ? rank : Math.min(rank, cap);
};

// A per-combatant body view for cost/static-field mechanics. Never mutates the
// shared BODIES table, so two copies of the same body can own different ranks.
export function leveledBody(c) {
  const base = BODIES[c?.bodyKey] ?? {};
  const m = masteryRank(c), s = specialtyRank(c);
  // Depression Demon replaced its old base duration multiplier with an always-on
  // magnitude bonus, so even a rank-zero wearer needs an instance-derived view.
  if (!m && !s && c?.bodyKey !== "depressionDemon") return base;
  const b = { ...base };
  switch (c?.bodyKey) {
    case "lizardWizard": if (m) b.firstKindDiscount = { kind: "ranged", amount: 4 }; break;
    case "pennyPixie": if (m) b.firstKindDiscount = { kind: "melee", amount: 4 }; break;
    case "malevolentMouse": b.combatStart = { ...base.combatStart,
      malevolentMouse: { ...base.combatStart?.malevolentMouse, reactivateOnDefeat: !!m,
        meleeBonus: s, rangedBonus: s } }; break;
    case "neptune": b.costAdd = m ? 2 : 3; b.doubleAll = true; break;
    case "depressionDemon": b.debuffMagnitude = 2 + s; b.debuffMult = m ? 2 : 1; break;
    case "medusa": if (m) b.poisonOnDamage = 2; break;
    case "wanderCastle": b.shieldGainMultiplier = m ? 2 : 1; break;
    case "gdpGiant": b.queuedHeavyGuard = { ...base.queuedHeavyGuard, dr: m ? 3 : 1 };
      b.nextHeavyDamage = s; break;
    case "psychicVeteran": b.psychicMelee = { ...base.psychicMelee, addRangedBonus: !!m,
      crossLaneBonus: s }; break;
    case "bankruptBarghest": b.barghestMarks = { ...base.barghestMarks, perHit: m ? 2 : 1,
      value: 1 }; b.firstCardsDiscount = s ? { count: s, amount: 2 } : null; break;
    case "recessionRevenant": b.revenantAfterlife = { ...base.revenantAfterlife,
      duration: m ? 90 : 60, damageBonus: 2 * s }; break;
    case "shortscerer": b.queuedHighGuard = { ...base.queuedHighGuard,
      threshold: 5, dr: m ? 2 : 1 }; b.firstHighCardRefund = 2 * s; break;
    case "callingCaltist": b.healthCast = { ...base.healthCast, multiplier: 1,
      fullFirst: !!m, restorePool: 2 * s }; break;
    case "oligarchyOoze": b.digestedCard = { ...base.digestedCard, costAdd: m ? 0 : 3,
      healOnPlay: s }; break;
    case "econElemental": b.combatStart = { ...base.combatStart,
      economyPulse: { ...base.combatStart?.economyPulse, period: m ? 50 : 60 }, openingMoxie: 2 * s }; break;
    case "moneymancer": b.combatStart = { ...base.combatStart,
      moneymancer: { ...base.combatStart?.moneymancer, period: m ? 40 : 60, discount: 3 + s } }; break;
    case "warewolf": b.combatStart = { ...base.combatStart,
      warewolf: { ...base.combatStart?.warewolf, humanDr: m ? 2 : 1, wolfMelee: 2,
        wolfMeleePerTransform: m ? 1 : 0, healOnTransform: 2 * s } }; break;
    case "atlas": b.atlasReflectConfig = { ...base.atlasReflectConfig,
      threshold: m ? 6 : 10, damage: 6 + 3 * s, scalesWithBonuses: false }; break;
    case "onePercenterCyclops": b.heavyMeleeMaxHp = { ...base.heavyMeleeMaxHp,
      divisor: m ? 3 : 5 }; break;
    case "bribedBishop": b.onHealedDamage = m ? 2 : 0;
      b.healingDamageThreshold = s ? { healing: 5, damage: 2 * s } : null; break;
    case "salesSage": b.costKind = { ...base.costKind, rounding: m ? "floor" : "ceil",
      after: s }; break;
  }
  return b;
}

const cloneOps = (ops) => (ops ?? []).map((op) => ({ ...op,
  ...(Array.isArray(op.steps) ? { steps: op.steps.map((step) => ({ ...step })) } : {}),
}));
export function leveledPassives(c) {
  const source = BODIES[c?.bodyKey]?.passive ?? [];
  const pas = source.map((p) => ({ ...p, ops: cloneOps(p.ops) }));
  const m = masteryRank(c), s = specialtyRank(c);
  const first = pas[0];
  switch (c?.bodyKey) {
    case "royalRat": if (m && first) first.ops[0].count = 3; break;
    case "tollTroll": if (first) { first.ops[0].amount = 2 + s; first.ops[0].fightMaxHp = !!m; } break;
    case "rentSeekingRuneblade":
      if (m) for (const p of pas) for (const op of p.ops) op.perCostOver = 4;
      if (s) pas.push({ pairMR: true, ops: [{ do: "shield", amount: s }] });
      break;
    case "marketCrashMinotaur": if (first) { first.ops[0].amount = 1 + 2 * s; if (m) first.ops.push({ ...first.ops[0] }); } break;
    case "interestImp": if (first) { first.ops[0].amount = m ? 2 : 1;
      if (s) first.ops.push({ do: "randomDamageBonus", amount: s }); } break;
    case "vengefulVampire": if (first) first.dealt = m ? 1 : 2; break;
    case "bondBehemoth": if (first) first.hit = m ? 2 : 3; break;
    case "cryptoChimera": if (first) { const cycle = first.ops[0]; cycle.repeatCycle = !!m;
      if (s) for (const step of cycle.steps ?? []) step.amount = (step.amount ?? 0) + 2 * s; } break;
    case "wearyWageslave": if (first) { first.play = m ? 1 : 2; first.ops[0].amount = 1 + 2 * s; } break;
    case "chequeCherub": if (first) { first.play = m ? 2 : 3; if (s) first.ops[0].shield = 2 * s; } break;
    case "pyramidHead": if (first) { first.ops[0].doubleFree = !!m; first.ops[0].moxieOnFree = s; } break;
    case "fundjin": for (const p of pas) { p.every = m ? 30 : 60;
      if (s) for (const op of p.ops) if (op.do === "deal") op.amount = (op.amount ?? 0) + s; } break;
    case "auditAngel": if (first) { first.ops[0].amount = m ? 12 : 6;
      if (s) first.ops[0].shield = 2 * s; } break;
    case "debtDragon": if (first) { for (const op of first.ops) op.amount = m ? 9 : 5;
      if (s) pas.push({ spend: 10, ops: [{ do: "gainMoxie", amount: s }] }); } break;
    case "basilisk": if (first) first.spend = m ? 2 : 3; break;
    case "wanderCastle": if (s) pas.push({ every: 60, ops: [{ do: "deal", amount: s, target: "target", noBonus: true }] }); break;
    case "sphinx":
      if (!first) break;
      first.every = m ? Math.max(60, 120 - 10 * (c.sphinxPassiveUses ?? 0)) : 120;
      first.ops[0].amount = 12 + 2 * s;
      break;
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
    case "fatCat": return `Every 3 damage taken: summon a rat.${extra(m ? "While you have a summon in your lane, take 1 less damage." : "")}${extra(s ? `Your summons deal +${s} damage.` : "")}`;
    case "royalRat": return `Every 3 moxie spent: summon ${m ? 3 : 1} rat${m ? "s" : ""}.${extra(s ? `Every summon enters with +${s} shield.` : "")}`;
    case "paidPiper": return `Every 3 cards played: summon 2 rats.${extra(m ? "Your summon effects create twice as many bodies." : "")}${extra(s ? `The first time you summon this combat, gain double moxie for ${3 * s} seconds.` : "")}`;
    case "tollTroll": return `Every 4 moxie spent: heal ${2 + s}.${extra(m ? "Each passive heal also raises max HP by the amount healed for this fight." : "")}`;
    case "centlessCentaur": return `The first card you play each combat resolves ${m ? "three times" : "twice"}.${extra(s ? `Start combat with ${2 * s} overflow-capable moxie.` : "")}`;
    case "malevolentMouse": return `Start each combat with +2 damage for 6 seconds${s ? `, plus +${s} melee and +${s} ranged damage` : ""}.${extra(m ? "Whenever anything is defeated, reactivate the bonus." : "")}`;
    case "rentSeekingRuneblade": return m
      ? `Cards costing 5+ grant +1 opposite-type damage per moxie cost above 4.${extra(s ? `Each completed melee+ranged pair grants ${s} shield.` : "")}`
      : `Play a ranged card: +1 melee damage. Play a melee card: +1 ranged damage.${extra(s ? `Each completed melee+ranged pair grants ${s} shield.` : "")}`;
    case "marketCrashMinotaur": return `Every 3 damage taken: melee the front foe ${m ? "twice" : "once"} for ${1 + 2 * s} damage per hit.`;
    case "interestImp": return `Every 4 moxie spent: gain +${m ? 2 : 1} damage.${extra(s ? `Also gain +${s} melee or ranged damage at random.` : "")}`;
    case "vengefulVampire": return `Every ${m ? 1 : 2} damage dealt: heal 1.${extra(s ? `Whenever you heal at least 5, gain +${s} melee and ranged damage.` : "")}`;
    case "lizardWizard": return `All your ranged cards cost 1 less.${extra(m ? "Your first ranged card each combat costs 4 less." : "")}${extra(s ? `Each ranged card played grants +${2 * s} ranged damage for 6 seconds; stacks expire independently.` : "")}`;
    case "bondBehemoth": return `Every ${m ? 2 : 3} damage taken: gain +1 damage.${extra(s ? `After 10 seconds, gain +${2 * s} melee and ranged damage.` : "")}`;
    case "goldenGolem": return `Enter combat with shield equal to max health.${extra(m ? "The first time your shield is depleted, gain double moxie for 12 seconds." : "")}${extra(s ? `While shielded, gain +${2 * s} damage.` : "")}`;
    case "cryptoChimera": return `Every 3 cards played, rotate between: melee the front foe for ${3 + 2 * s}; deal ${2 + 2 * s} ranged damage to the foe lane; gain ${3 + 2 * s} shield.${extra(m ? "After completing the rotation, immediately repeat all three effects." : "")}`;
    case "wearyWageslave": return `Every ${m ? "card" : "2nd card"} played: melee the front foe for ${1 + 2 * s}.`;
    case "bribedBishop": return `Every 6 seconds, arm your next card to heal your ally target for that card's moxie cost.${extra(m ? "Whenever you are healed, gain +2 damage." : "")}${extra(s ? `Every 5 healing you deal grants +${2 * s} damage.` : "")}`;
    case "chequeCherub": return `Every ${m ? "2nd" : "3rd"} card: heal the target for 6.${extra(s ? `Also grant ${2 * s} shield.` : "")}`;
    case "pyramidHead": return `Every 3 cards you play: the next card is FREE${m ? " and resolves twice" : ""}.${extra(s ? `Each free card grants ${s} moxie.` : "")}`;
    case "pennyPixie": return `All your melee cards cost 1 less.${extra(m ? "Your first melee card each combat costs 4 less." : "")}${extra(s ? `Each melee card played grants +${2 * s} melee damage for 6 seconds; stacks expire independently.` : "")}`;
    case "econElemental": return `Does not gain moxie normally. Every ${m ? 5 : 6} seconds, gain 10 moxie.${extra(s ? `Start combat with ${2 * s} moxie.` : "")}`;
    case "warewolf": return `Transforms every 6s. HUMAN: normal damage, takes ${m ? 2 : 1} less damage. WAREWOLF: +2 melee${m ? ", growing by +1 each transform" : ""}, no damage reduction.${extra(s ? `Heal ${2 * s} whenever you transform.` : "")}`;
    case "atlas": return `Every ${m ? 6 : 10} damage taken: SHRUG for ${6 + 3 * s} damage to every opponent in the lane. SHRUG damage does not scale with damage bonuses.`;
    case "killionaire": return `Start combat with double moxie gain for 6 seconds. ${m ? "The rush always repeats; a window with a defeat grants +3 damage." : "When it ends, a window with a defeat grants +1 damage and repeats the rush."}${extra(s ? `Start combat with ${2 * s} moxie.` : "")}`;
    case "basilisk": return `Every ${m ? 2 : 3} moxie spent: poison the foe lane by 1.${extra(s ? `For the first 6 seconds, foes in your lane deal ${s} less damage.` : "")}`;
    case "fundjin": return `Two gods, one body. Every ${m ? 3 : 6}s, Fundjin melee-strikes the foe lane for ${1 + s}; Raising-Profitsjin ranged-strikes the front foe twice for ${1 + s}.`;
    case "auditAngel": return `Every 6 seconds, heal your ally target for ${m ? 12 : 6}. Each non-damaging card you play shortens the current cooldown by 1 second.${extra(s ? `The heal also grants ${2 * s} shield.` : "")}`;
    case "medusa": return `Whenever you deal damage to a target, also poison it by ${m ? 2 : 1}.${extra(s ? `Poisoned foes deal up to ${s} less damage, limited by their poison stacks.` : "")}`;
    case "depressionDemon": return `Every debuff you apply gains +${2 + s} magnitude.${extra(m ? "Every debuff you apply lasts twice as long." : "")}`;
    case "bonelord": return `Every 12 seconds, summon ${2 + s} rats. Whenever something you summoned is defeated, gain +${m ? 2 : 1} melee and ranged damage.`;
    case "debtDragon": return `Every 10 moxie gained: +${m ? 9 : 5} melee and +${m ? 9 : 5} ranged damage.${extra(s ? `Every 10 moxie spent refunds ${s} moxie.` : "")}`;
    case "neptune": return `All your cards cost ${m ? 2 : 3} more (max 10) and resolve twice.${extra(s ? `Start combat with ${2 * s} moxie.` : "")}`;
    case "sphinx": {
      const amount = 12 + 2 * s;
      const cadence = m ? Math.max(6, 12 - (c.sphinxPassiveUses ?? 0)) : 12;
      return `Every ${cadence} seconds, choose an available option: heal your ally target for ${amount} + ranged bonus, deal ${amount} + ranged bonus to your target, or gain up to ${amount} moxie (${Math.max(0, amount - 10)} above the normal cap). Each option locks until all three have been chosen.${extra(m ? "Each use makes the next choice 1 second faster, down to 6 seconds." : "")}`;
    }
    case "wanderCastle": return `Every card you play grants shield equal to its moxie cost.${extra(m ? "All shield gains are doubled." : "")}${extra(s ? `Every 6 seconds, deal ${s} damage to your target.` : "")}`;
    case "affluenceAnubis": return `Every 6 seconds, add +${1 + (m ? 1 : 0) + s} rat${1 + (m ? 1 : 0) + s === 1 ? "" : "s"} to all future waves, then summon that wave.`;
    case "timeshareTyrant": return `Start with a 12-HP Clockwork Amalgamation. Every ${Math.max(3, 12 - s)} seconds, revive it if dead; otherwise fully heal it and give it +1 damage and +1 protection.${extra(m ? "All your summons gain moxie twice as fast." : "")}`;
    case "oligarchyOoze": return `Digest the first damaging card used against you each combat and automatically play it at ${m ? "base moxie cost" : "base moxie cost +3"} (maximum 10).${extra(s ? `Whenever you play a digested card, heal ${s}.` : "")}`;
    case "moneymancer": return `Every ${m ? 4 : 6} seconds, arm your next ranged or summon card to cost ${3 + s} less.`;
    case "gdpGiant": return `While a Heavy-tagged card is queued, take ${m ? 3 : 1} less damage.${extra(s ? `Each Heavy-tagged card played makes the next Heavy-tagged card deal +${s} damage.` : "")}`;
    case "hedgefundKnight": return `Every ${m ? 4 : 6} seconds: if unshielded, gain ${6 + 2 * s} shield; if shielded, gain +${3 + s} melee damage instead.`;
    case "psychicVeteran": return `Melee cards can target any foe and deal +1 damage per 2 moxie cost${m ? ", plus your ranged bonus" : ""}.${extra(s ? `Melee cards aimed outside your lane deal +${s} more.` : "")}`;
    case "onePercenterCyclops": return `All cards cost 1 more (max 10). Heavy-tagged melee cards deal +1 damage for every ${m ? 3 : 5} max HP.${extra(s ? `Start combat with ${s} moxie.` : "")}`;
    case "bankruptBarghest": return `Whenever you damage a target, mark it ${m ? "twice" : "once"}. Your later damage to that target gains +1 per mark.${extra(s ? `Your first ${s} card${s === 1 ? "" : "s"} this combat cost 2 less.` : "")}`;
    case "recessionRevenant": return `The first time it dies each combat, it keeps acting for ${m ? 9 : 6} seconds${m ? " with double moxie gain" : ""}${s ? ` and +${2 * s} melee and ranged damage` : ""}. A defeat during that time restores it to full health.`;
    case "shortscerer": return `While queuing a ranged or summon card costing 5+ moxie, foes deal ${m ? 2 : 1} less damage.${extra(s ? `The first qualifying card refunds ${2 * s} moxie.` : "")}`;
    case "callingCaltist": return `Ranged or summon cards costing more than 5 moxie may pay 5 moxie plus 1 health per moxie above 5. Health payment cannot be lethal.${extra(m ? "The first ranged or summon card each combat can replace its entire moxie cost with nonlethal health." : "")}${extra(s ? `Every 6 seconds, restore up to ${2 * s} health spent on card costs.` : "")}`;
    case "salesSage": return `Ranged cards cost half, rounded ${m ? "down" : "up"}${s ? `, then cost ${s} less` : ""}.`;
    default: return base.passiveText ?? null;
  }
}

export function bodyUpgradeSnapshot(bodyKey) {
  const d = BODY_UPGRADES[bodyKey];
  return d ? { mastery: { ...d.mastery }, specialty: { ...d.specialty } } : null;
}
