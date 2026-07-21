// Deterministic executable matrix for every wearable body's base/Mastery/Specialty behavior.
// Run directly: bun run test/body-passives.test.js
import assert from "node:assert/strict";
import * as G from "../game.js";
import { bodyPassiveSandbox } from "./support/body-passive-sandbox.js";

G.setHpMult(1);
G.setCdMult(1);

const eq = (actual, expected, label) => assert.equal(actual, expected, `${label}: got ${actual}, expected ${expected}`);
const ok = (value, label) => assert.ok(value, label);
const repeat = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };
const loss = (before, after) => before - after;
const buffLeft = (c, kind) => c.buffs?.find((b) => b.kind === kind)?.left ?? 0;

const CASES = {
  frugal(s, profile) {
    const threshold = 3;
    const targetBefore = s.target.hp;
    s.damageActor(threshold);
    eq(s.ratUnits(), 1, "Fat Cat damage trigger summoned one rat");
    const rat = s.ownSummons().find((c) => c.bodyKey === "rat");
    eq(rat.ratUnitHp, 1, "Fat Cat passive rat HP stays native");
    eq(rat.summonDamageBonus, profile === "specialty" ? 1 : 0, "Fat Cat summon Specialty damage");
    eq(targetBefore - s.target.hp, profile === "mastery" ? 1 : 0,
      "Fat Cat Mastery deals the living-rat count after its summon");
    return `hit=${threshold} rats=1 ratHP=${rat.ratUnitHp} summonDamage=+${rat.summonDamageBonus} ratBurst=${targetBefore - s.target.hp}`;
  },

  leverage(s, profile) {
    const threshold = 3;
    const ratsExpected = profile === "specialty" ? 2 : 1;
    repeat(threshold, () => s.play("dBuckler"));
    eq(s.ratUnits(), ratsExpected, "Royal Rat spend trigger rat count");
    const rat = s.ownSummons().find((c) => c.bodyKey === "rat");
    eq(rat.shield, profile === "mastery" ? 1 : 0, "Royal Rat Mastery gives a passive rat its cost-1 shield");
    eq(rat.meleeBonus, 0, "Royal Rat rows do not add summon damage");
    return `spend=${threshold} rats=${ratsExpected} ratShield=${rat.shield} summonDamage=+${rat.meleeBonus}`;
  },

  hedge(s, profile) {
    const threshold = profile === "mastery" ? 2 : 3;
    repeat(threshold, () => s.play("dBuckler"));
    const expected = profile === "specialty" ? 3 : 2;
    eq(s.ratUnits(), expected, "Paid Piper card trigger rat count");
    const rat = s.ownSummons().find((c) => c.bodyKey === "rat");
    eq(rat.meleeBonus, 0, "Paid Piper Mastery changes cadence without summon damage");
    return `plays=${threshold} rats=${expected} summonDamage=+${rat.meleeBonus}`;
  },

  ratTrader(s, profile) {
    if (profile === "specialty") s.setActorHp(1000);
    else s.setActorHp(990);
    repeat(2, () => s.play("oDagger"));
    if (profile === "specialty") eq(s.actor.shield, 2, "Toll Troll overheal became shield");
    else eq(s.actor.hp, 990 + (profile === "mastery" ? 3 : 2), "Toll Troll passive healing");
    return `spent=4 hp=${s.actor.hp} shield=${s.actor.shield}`;
  },

  compound(s, profile) {
    const startMoxie = s.actor.moxie;
    const before = s.target.hp;
    s.play("oDagger");
    const dealt = loss(before, s.target.hp);
    eq(dealt, profile === "mastery" ? 4 : 2, "Centless Centaur doubled first card output");
    eq(startMoxie, profile === "specialty" ? 2 : 0, "Centless Centaur specialty starting moxie");
    return `firstCardDamage=${dealt} startMoxie=${startMoxie}`;
  },

  discountDuel(s, profile) {
    eq(s.actor.counters, profile === "mastery" ? 2 : 1, "Malevolent Mouse starting damage");
    s.play("oDagger", { moxie: 2 });
    eq(s.actor.moxie, profile === "specialty" ? 1 : 0, "Malevolent Mouse first-card cost");
    return `startDamage=${s.actor.counters} daggerCost=${2 - s.actor.moxie}`;
  },

  pyramidRogue(s, profile) {
    s.play("oArcane");
    s.play("oDagger");
    const bonus = profile === "mastery" ? 2 : 1;
    eq(s.actor.meleeBonus, bonus, "Runeblade ranged-to-melee cross-trigger");
    eq(s.actor.rangedBonus, bonus, "Runeblade melee-to-ranged cross-trigger");
    eq(s.actor.shield, profile === "specialty" ? 2 : 0, "Runeblade completed-pair shield");
    return `melee=+${bonus} ranged=+${bonus} shield=${s.actor.shield}`;
  },

  bloodfund(s, profile) {
    eq(s.actor.moxie, profile === "specialty" ? 1 : 0, "Market-Crash Minotaur opening moxie");
    const before = s.target.hp;
    s.damageActor(3);
    const counter = loss(before, s.target.hp);
    eq(counter, profile === "mastery" ? 2 : 1, "Market-Crash Minotaur counterattack");
    eq(s.actor.shield, 0, "Market-Crash Minotaur no longer refunds shield from damage taken");

    const ranked = bodyPassiveSandbox("bloodfund", "base", s.side, { allocation: { melee: 1 } });
    const rankedBefore = ranked.target.hp;
    ranked.play("oDagger");
    eq(loss(rankedBefore, ranked.target.hp), 2, "Market-Crash Minotaur melee allocation reached a live melee card");
    return `counter=${counter} startMoxie=${profile === "specialty" ? 1 : 0} meleeRankCard=2`;
  },

  heavyHand(s, profile) {
    const threshold = profile === "mastery" ? 3 : 4;
    repeat(threshold, () => s.play("dBuckler"));
    eq(s.actor.counters, 1, "Interest Imp spend trigger damage gain");
    eq(s.actor.shield, threshold + (profile === "specialty" ? 2 : 0), "Interest Imp passive shield");
    return `spent=${threshold} damage=+1 shield=${s.actor.shield}`;
  },

  rentier(s, profile) {
    s.setActorHp(profile === "specialty" ? 1000 : 990);
    s.play("oSword");
    if (profile === "specialty") eq(s.actor.shield, 1, "Vengeful Vampire overheal became shield");
    else eq(s.actor.hp, 990 + (profile === "mastery" ? 2 : 1), "Vengeful Vampire passive healing");
    return `dealt=2 hp=${s.actor.hp} shield=${s.actor.shield}`;
  },

  ratBaron(s, profile) {
    s.play("oFire", { moxie: 5 });
    const expectedCost = profile === "mastery" ? 3 : 4;
    const refund = profile === "specialty" ? 1 : 0;
    eq(s.actor.moxie, 5 - expectedCost + refund, "Lizard Wizard ranged cost/refund");
    return `fireCost=${expectedCost} firstRefund=${refund}`;
  },

  counterparty(s, profile) {
    const opening = profile === "specialty" ? 1 : 0;
    eq(s.actor.counters, opening, "Bond Behemoth opening damage");
    s.damageActor(3);
    eq(s.actor.counters, opening + (profile === "mastery" ? 2 : 1), "Bond Behemoth hit trigger damage gain");
    eq(s.actor.shield, 0, "Bond Behemoth no longer refunds shield from damage taken");
    return `hit=3 openingDamage=+${opening} totalDamage=+${s.actor.counters}`;
  },

  juggernaut(s, profile) {
    const starting = profile === "mastery" ? 1500 : 1000;
    eq(s.actor.shield, starting, "Golden Golem starting shield");
    if (profile === "specialty") {
      s.damageActor(starting);
      eq(s.actor.counters, 1, "Golden Golem first shield break damage reward");
    }
    return `startShield=${starting} breakDamage=${s.actor.counters}`;
  },

  quakeCap(s, profile) {
    const threshold = profile === "mastery" ? 2 : 3;
    const before = s.target.hp;
    repeat(threshold, () => s.play("dBuckler"));
    const dealt = loss(before, s.target.hp);
    eq(dealt, profile === "specialty" ? 2 : 1, "Crypto-Chimera card-clock lane damage");
    return `plays=${threshold} laneDamage=${dealt}`;
  },

  mutualMend(s, profile) {
    const plays = profile === "specialty" ? 4 : 2;
    const before = s.target.hp;
    repeat(plays, () => s.play("dBuckler"));
    const dealt = loss(before, s.target.hp);
    const expected = profile === "specialty" ? 3 : profile === "mastery" ? 2 : 1;
    eq(dealt, expected, "Weary Wageslave passive strike lifecycle");
    return `plays=${plays} damage=${dealt}`;
  },

  bribedBishop(s, profile) {
    s.setActorHp(profile === "specialty" ? 1000 : 990);
    s.play("dHeartGuard");
    eq(s.actor.counters, profile === "mastery" ? 2 : 1, "Bribed Bishop healed trigger damage");
    if (profile === "specialty") eq(s.actor.shield, 4, "Bribed Bishop card shield plus overheal shield");
    return `healTrigger=+${s.actor.counters} hp=${s.actor.hp} shield=${s.actor.shield}`;
  },

  chequeCherub(s, profile) {
    s.setActorHp(990);
    repeat(3, () => s.play("dBuckler"));
    const healed = s.actor.hp - 990;
    eq(healed, profile === "mastery" ? 8 : 6, "Cheque Cherub third-card heal");
    eq(s.actor.shield, 3 + (profile === "specialty" ? 3 : 0), "Cheque Cherub passive target shield");
    return `thirdCardHeal=${healed} shield=${s.actor.shield}`;
  },

  pyramidHead(s, profile) {
    const threshold = profile === "mastery" ? 2 : 3;
    repeat(threshold, () => s.play("dBuckler"));
    ok(s.actor.freeNext, "Pyramid-Scheme Head armed a free card");
    const before = s.target.hp;
    s.play("oSword", { moxie: 0 });
    const dealt = loss(before, s.target.hp);
    eq(dealt, profile === "specialty" ? 3 : 2, "Pyramid-Scheme Head free-card output");
    if (profile === "specialty") {
      const bash = bodyPassiveSandbox("pyramidHead", "specialty", s.side);
      repeat(3, () => bash.play("dBuckler"));
      ok(bash.actor.freeNext, "Pyramid-Scheme Head armed the no-amount output control");
      const bashBefore = bash.target.hp;
      bash.play("dShieldBash", { moxie: 0 });
      eq(loss(bashBefore, bash.target.hp), 5,
        "free-card output boosts Shield Bash's amount-bearing shield, not its no-amount deal twice");
    }
    return `plays=${threshold} freeSwordDamage=${dealt}`;
  },

  pennyPixie(s, profile) {
    const before = s.target.hp;
    s.play("oSword", { moxie: 3 });
    const expectedCost = profile === "mastery" ? 1 : 2;
    eq(s.actor.moxie, 3 - expectedCost, "Penny-Pinching Pixie melee discount");
    const dealt = loss(before, s.target.hp);
    eq(dealt, profile === "specialty" ? 3 : 2, "Penny-Pinching Pixie discounted melee damage");
    return `swordCost=${expectedCost} damage=${dealt}`;
  },

  econElemental(s, profile) {
    const pulse = s.actor.regens.find((g) => g.kind === "economyPulse");
    ok(pulse, "Economy Elemental installed its live pulse");
    eq(s.actor.moxie, profile === "mastery" ? 5 : 0, "Economy Elemental opening moxie");
    eq(pulse.charge, profile === "specialty" ? 10 : 0, "Economy Elemental first-pulse advance");
    s.actor.queue = []; s.target.queue = [];
    const beforeNormal = s.actor.moxie;
    s.advance(10);
    eq(s.actor.moxie, beforeNormal, "Economy Elemental suppresses normal one-second moxie income");
    pulse.charge = 59;
    s.actor.moxie = 0;
    s.advance(1);
    eq(s.actor.moxie, 10, "Economy Elemental pulse fills the moxie bank");
    return `start=${profile === "mastery" ? 5 : 0} normalRegen=0 firstAdvance=${profile === "specialty" ? 10 : 0} pulse=10`;
  },

  warewolf(s, profile) {
    eq(s.actor.wform, "human", "Warewolf starts human");
    eq(s.actor.meleeBonus, -3, "Warewolf human melee penalty");
    eq(s.actor.rangedBonus, -3, "Warewolf human ranged penalty");
    const hpBefore = s.actor.hp;
    s.damageActor(3);
    eq(loss(hpBefore, s.actor.hp), profile === "specialty" ? 1 : 2, "Warewolf human damage reduction");
    const clock = s.actor.regens.find((g) => g.kind === "warewolf");
    clock.charge = 59;
    s.advance(1);
    eq(s.actor.wform, "wolf", "Warewolf tick flipped form");
    eq(s.actor.meleeBonus, profile === "mastery" ? 4 : 3, "Warewolf wolf melee bonus");
    eq(s.actor.rangedBonus, 0, "Warewolf wolf ranged restoration");
    return `humanDR=${profile === "specialty" ? 2 : 1} wolfMelee=${s.actor.meleeBonus}`;
  },

  atlas(s, profile) {
    const threshold = profile === "mastery" ? 8 : 10;
    const before = s.target.hp;
    s.damageActor(threshold);
    const shrug = loss(before, s.target.hp);
    eq(shrug, profile === "specialty" ? 7 : 5, "Atlas SHRUG lane retaliation");
    return `hit=${threshold} shrug=${shrug}`;
  },

  killionaire(s, profile) {
    const start = profile === "specialty" ? 2 : 0;
    eq(s.actor.moxie, start, "Killionaire starting moxie");
    ok(s.actor.buffs.some((b) => b.killionaireRush && b.kind === "haste"), "Killionaire starts in its double-moxie rush");
    if (s.side === "hero") s.addOpposingTarget();
    else {
      const backup = { ...s.target, id: "backup", name: "Backup Hero", alive: true, hp: 1000, maxHp: 1000,
        lane: 0, depth: 1, hand: [], queue: [], buffs: [], regens: [] };
      s.room.players.set(backup.id, backup);
    }
    s.setTargetHp(1);
    s.play("oSword", { moxie: 10 });
    ok(s.actor.killionaireRushKilled, "Killionaire records a defeat inside the current rush window");
    s.actor.queue = []; s.target.queue = [];
    s.advance(60);
    const gain = profile === "mastery" ? 3 : 1;
    eq(s.actor.counters, gain, "Killionaire rush-window damage reward");
    ok(s.actor.buffs.some((b) => b.killionaireRush), "a successful Killionaire window restarts");
    s.advance(60);
    eq(s.actor.buffs.some((b) => b.killionaireRush), profile === "mastery", "Killionaire Mastery keeps the rush alive without another defeat");
    return `startMoxie=${start} firstWindowDamage=+${gain} noKillRestart=${profile === "mastery"}`;
  },

  basilisk(s, profile) {
    const threshold = profile === "specialty" ? 2 : 3;
    repeat(threshold, () => s.play("dBuckler"));
    eq(s.target.poison, profile === "mastery" ? 2 : 1, "Bankrupt Basilisk spend poison");
    return `spent=${threshold} poison=${s.target.poison}`;
  },

  fundjin(s, profile) {
    const spendBefore = s.target.hp;
    repeat(6, () => s.play("dBuckler"));
    const spendDealt = loss(spendBefore, s.target.hp);
    eq(spendDealt, profile === "mastery" ? 3 : 0,
      "Fundjin moxie clock exists only with the explicit Mastery");
    // Park both auto-casters so this assertion isolates the literal time clock from queued cards
    // and, under Mastery, the second spend clock those automatic casts could feed.
    s.actor.queue = [];
    s.target.queue = [];
    s.actor.moxie = 0;
    s.target.moxie = 0;
    const period = 60;
    const before = s.target.hp;
    s.advance(period - 1);
    eq(loss(before, s.target.hp), 0, "Fundjin time clock does not fire a tick early");
    s.advance(1);
    const dealt = loss(before, s.target.hp);
    eq(dealt, profile === "specialty" ? 6 : 3, "Fundjin dual timer strikes");
    return `ticks=${period} timedDamage=${dealt} spendDamage=${spendDealt}`;
  },

  auditAngel(s, profile) {
    s.play("dBuckler", { moxie: 5 });
    eq(s.actor.moxie, 5 - 1 + (profile === "mastery" ? 2 : 1), "Audit Angel non-damage moxie refund");
    eq(s.actor.shield, 1 + (profile === "specialty" ? 1 : 0), "Audit Angel non-damage shield");
    return `refund=${profile === "mastery" ? 2 : 1} shield=${s.actor.shield}`;
  },

  medusa(s, profile) {
    if (profile === "specialty") s.setTargetHp(2);
    s.play("oDagger", { moxie: 2 });
    eq(s.target.poison, profile === "mastery" ? 2 : 1, "Mid-Management Medusa damage poison");
    if (profile === "specialty") {
      s.actor.moxie = 0;
      // Keep this oracle on the poison-defeat reward: a live foe would otherwise
      // immediately spend the reward on its next queued card in this same tick.
      s.actor.queue = [];
      s.target.poisonClock = G.POISON_PERIOD - 1;
      s.advance(1);
      eq(s.actor.moxie, 2, "Mid-Management Medusa poison defeat granted moxie");
    }
    return `poison=${profile === "mastery" ? 2 : 1} poisonKillMoxie=${profile === "specialty" ? s.actor.moxie : 0}`;
  },

  depressionDemon(s, profile) {
    const bonus = profile === "specialty" ? 3 : 2;
    const duration = profile === "mastery" ? 120 : 60;
    G.resolveOps(s.room, s.actor, [
      { do: "poison", amount: 1, target: "pick" },
      { do: "slow", target: "pick", dur: 60 },
      { do: "weakness", target: "pick", dur: 60 },
      { do: "vulnerable", amount: 1, target: "pick", dur: 60 },
      { do: "weakenLane", amount: 1 },
      { do: "sap", amount: 1, target: "pick", dur: 60 },
      { do: "stasis", target: "selfLane", dur: 60 },
      { do: "leech", amount: 1, target: "pick" },
    ]);
    eq(s.target.poison, 1 + bonus, "Depression Demon poison magnitude");
    eq(s.target.buffs.find((b) => b.kind === "slow")?.amount, bonus, "Depression Demon slow magnitude");
    eq(s.target.buffs.find((b) => b.kind === "weakness")?.amount, bonus, "Depression Demon weakness magnitude");
    eq(s.target.buffs.find((b) => b.kind === "vulnerable")?.amount, 1 + bonus, "Depression Demon vulnerability magnitude");
    eq(s.target.counters, -(1 + bonus), "Depression Demon permanent weaken magnitude");
    eq(s.target.buffs.find((b) => b.kind === "sap")?.amount, 1 + bonus, "Depression Demon sap magnitude");
    eq(s.target.buffs.find((b) => b.kind === "stasis")?.amount, bonus, "Depression Demon stasis magnitude");
    eq(s.target.leeches?.[0]?.amount, 1 + bonus, "Depression Demon Pet Leech magnitude");
    for (const kind of ["slow", "weakness", "vulnerable", "sap", "stasis"])
      eq(buffLeft(s.target, kind), duration, `Depression Demon ${kind} duration`);
    return `magnitude=+${bonus} timedDuration=${duration} leech=${1 + bonus}`;
  },

  bonelord(s, profile) {
    const clock = s.actor.regens.find((g) => g.kind === "bookieRats");
    ok(clock, "Bookie Bonelord installed its 12-second rat clock");
    eq(clock.period, 120, "Bookie Bonelord wave cadence");
    clock.charge = 119;
    s.advance(1);
    const rats = profile === "specialty" ? 3 : 2;
    eq(s.ratUnits(), rats, "Bookie Bonelord rat wave size");
    const ownRat = s.ownSummons().find((c) => c.bodyKey === "rat");
    s.damageOwnSummon(ownRat, 1);
    const gain = profile === "mastery" ? 2 : 1;
    eq(s.actor.counters, gain, "Bookie Bonelord owned-summon defeat reward");
    s.setTargetHp(1);
    s.damageTarget(1);
    eq(s.actor.counters, gain, "Bookie Bonelord ignores non-summon defeats");
    return `period=120 wave=${rats} ownedDefeatGain=${gain}`;
  },

  debtDragon(s, profile) {
    const threshold = profile === "mastery" ? 8 : 10;
    s.actor.moxie = 0;
    s.advance(threshold * 10);
    const gain = profile === "specialty" ? 4 : 3;
    eq(s.actor.meleeBonus, gain, "Debt Dragon moxie-gain melee payoff");
    eq(s.actor.rangedBonus, gain, "Debt Dragon moxie-gain ranged payoff");
    return `gained=${threshold} melee=+${gain} ranged=+${gain}`;
  },

  neptune(s, profile) {
    const swordBefore = s.target.hp;
    s.play("oSword", { moxie: 10 });
    const swordCost = profile === "mastery" ? 4 : 5;
    eq(s.actor.moxie, 10 - swordCost, "Nepotistic Neptune below-threshold card tax");
    eq(loss(swordBefore, s.target.hp), 2, "Nepotistic Neptune below-threshold Sword stays single");
    eq(s.actor.shield, 0, "Nepotistic Neptune Specialty does not shield a non-replayed card");
    const before = s.target.hp;
    s.play("oHatchet", { moxie: 10 });
    const cost = profile === "mastery" ? 5 : 6;
    eq(s.actor.moxie, 10 - cost, "Nepotistic Neptune threshold card tax");
    eq(loss(before, s.target.hp), 6, "Nepotistic Neptune Hatchet still replays at the lowered Mastery threshold");
    eq(s.actor.shield, profile === "specialty" ? 2 : 0, "Nepotistic Neptune doubled-card shield");
    return `swordCost=${swordCost} singleDamage=2 hatchetCost=${cost} doubledDamage=6 shield=${s.actor.shield}`;
  },

  sphinx(s, profile) {
    const threshold = profile === "mastery" ? 5 : 6;
    const before = s.target.hp;
    repeat(threshold, () => s.play("dBuckler"));
    const passive = profile === "specialty" ? 2 : 1;
    eq(loss(before, s.target.hp), passive, "Stockbroking Sphinx spend lane damage");
    eq(s.actor.shield, threshold + passive, "Stockbroking Sphinx overheal spill");
    return `spent=${threshold} lifestealDamage=${passive} totalShield=${s.actor.shield}`;
  },

  wanderCastle(s, profile) {
    const key = profile === "mastery" ? "oHoly" : "oFire";
    const cost = profile === "mastery" ? 4 : 5;
    s.play(key, { moxie: 10 });
    const expected = cost + (profile === "specialty" ? 2 : 1);
    eq(s.actor.shield, expected, "Wandering Castle costly-card shield plus shield bonus");
    return `${key}Cost=${cost} shield=${expected}`;
  },

  affluenceAnubis(s, profile) {
    const period = 60;
    const clock = s.actor.regens.find((g) => g.kind === "escalatingRats");
    ok(clock, "Affluence Anubis installed its rat-wave clock");
    clock.charge = period - 1;
    s.advance(1);
    const rats = profile === "base" ? 2 : 3;
    eq(s.ratUnits(), rats, "Affluence Anubis first rat wave");
    eq(clock.growth, profile === "base" ? 1 : 2, "Affluence Anubis future-wave growth");
    return `period=${period} growth=+${clock.growth} firstWaveRats=${rats}`;
  },

  timeshareTyrant(s, profile) {
    let amalgam = s.ownSummons().find((c) => c.bodyKey === "clockworkAmalgamation");
    ok(amalgam, "Timeshare Tyrant starts with its Clockwork Amalgamation");
    eq(amalgam.maxHp, 12, "Clockwork Amalgamation max HP");
    amalgam.moxie = 0; amalgam.moxieClock = 0;
    G.regenMoxie(amalgam, 5);
    eq(amalgam.moxie, profile === "mastery" ? 1 : 0, "Timeshare Tyrant summon moxie rate");
    const clock = s.actor.regens.find((g) => g.kind === "timeshare");
    const period = profile === "specialty" ? 110 : 120;
    eq(clock.period, period, "Timeshare Tyrant service cadence");
    amalgam.queue = []; amalgam.hp = 2; clock.charge = period - 1;
    s.advance(1);
    eq(amalgam.hp, 12, "Timeshare service fully heals a living Amalgamation");
    eq(amalgam.counters, 1, "Timeshare service adds one damage");
    eq(amalgam.dynamicAura.dmgReduce, 2, "Timeshare service adds one protection");
    s.damageOwnSummon(amalgam, 99);
    eq(s.ownSummons().filter((c) => c.bodyKey === "clockworkAmalgamation").length, 0, "defeated Amalgamation leaves play");
    clock.charge = period - 1;
    s.advance(1);
    amalgam = s.ownSummons().find((c) => c.bodyKey === "clockworkAmalgamation");
    ok(amalgam, "Timeshare service revives a defeated Amalgamation");
    eq(amalgam.counters, 1, "revived Amalgamation retains its damage tier");
    eq(amalgam.dynamicAura.dmgReduce, 2, "revived Amalgamation retains its protection tier");
    return `service=${period / 10}s moxieRate=${profile === "mastery" ? 2 : 1}x damage=2 protection=2 revived=12HP`;
  },

  oligarchyOoze(s, profile) {
    ok(G.entityTrackers(s.room, s.actor).some((tracker) => tracker.id === "body:oligarchyOoze:waiting"),
      "Oligarchy Ooze shows its passive before a card is stolen");
    s.hitActorWithCard("oSword");
    eq(s.actor.oozeStolenKey, "oSword", "Oligarchy Ooze steals the first damaging card");
    const cost = profile === "mastery" ? 3 : 6;
    eq(G.oligarchyStolenCost(s.actor), cost, "Oligarchy Ooze stolen-card cost");
    ok(G.entityTrackers(s.room, s.actor).some((tracker) => tracker.id === "body:oligarchyOoze:held"),
      "Oligarchy Ooze replaces the waiting passive with its held-card tracker");
    s.actor.moxie = 0;
    s.hitActorWithCard("oDagger");
    eq(s.actor.moxie, profile === "specialty" ? 1 : 0, "Oligarchy Ooze later-hit moxie payment");
    s.actor.moxie = cost;
    const before = s.target.hp;
    ok(G.tryOligarchyCast(s.room, s.actor), "Oligarchy Ooze auto-casts its held card when affordable");
    eq(loss(before, s.target.hp), 2, "Oligarchy Ooze stolen Sword damage");
    eq(s.actor.oozeStolenKey, "oSword", "Oligarchy Ooze keeps the stolen card for repeated casts");
    return `held=oSword cost=${cost} hitPayment=${profile === "specialty" ? 1 : 0} replayDamage=2`;
  },

  moneymancer(s, profile) {
    const clock = s.actor.regens.find((g) => g.kind === "moneymancer");
    const period = profile === "mastery" ? 50 : 60;
    eq(clock.period, period, "Moneymancer discount cadence");
    clock.charge = period - 1;
    s.advance(1);
    const discount = profile === "specialty" ? 4 : 3;
    eq(s.actor.nextRangedDiscount, discount, "Moneymancer armed discount amount");
    s.play("oSword", { moxie: 10 });
    eq(s.actor.nextRangedDiscount, discount, "Moneymancer melee card preserves ranged discount");
    s.play("oFire", { moxie: 10 });
    const cost = 5 - discount;
    eq(s.actor.moxie, 10 - cost, "Moneymancer discounted ranged-card cost");
    eq(s.actor.nextRangedDiscount, 0, "Moneymancer ranged card consumes discount");
    return `period=${period / 10}s discount=${discount} fireCost=${cost}`;
  },

  gdpGiant(s, profile) {
    const costly = G.mintCard("oOmnislash"), cheap = G.mintCard("oSword");
    if (s.side === "hero") {
      s.actor.cards = [costly, cheap]; s.actor.hand = [costly, cheap];
      s.actor.cardQueue = profile === "mastery" ? [] : [{ id: costly.id }];
      s.actor.queuedCard = s.actor.cardQueue[0] ?? null;
    } else {
      s.actor.queue = profile === "mastery" ? [cheap, costly] : [costly, cheap];
    }
    const before = s.actor.hp;
    s.damageActor(5);
    const dr = profile === "specialty" ? 3 : 2;
    eq(loss(before, s.actor.hp), 5 - dr, "GDP Giant live queued-melee damage reduction");
    return `qualifier=${profile === "mastery" ? "held" : "queued"} cost=6+ DR=${dr}`;
  },

  hedgefundKnight(s, profile) {
    const clock = s.actor.regens.find((g) => g.kind === "hedgefundKnight");
    const period = profile === "mastery" ? 50 : 60;
    eq(clock?.period, period, "Hedgefund Knight pulse cadence");
    s.actor.queue = []; s.target.queue = [];
    s.actor.shield = 6; clock.charge = period - 1;
    s.advance(1);
    const meleeGain = profile === "specialty" ? 3 : 2;
    eq(s.actor.meleeBonus, meleeGain, "Hedgefund Knight shield-to-melee branch");
    s.actor.shield = 0; s.actor.meleeBonus = 2; clock.charge = period - 1;
    s.advance(1);
    const shieldGain = profile === "specialty" ? 6 : 5;
    eq(s.actor.shield, shieldGain, "Hedgefund Knight melee-to-shield branch");
    return `period=${period / 10}s shield6→melee+${meleeGain} melee2→shield${shieldGain}`;
  },

  psychicVeteran(s, profile) {
    s.room.laneCount = 2;
    s.room.lanes[1] = [];
    s.room.allies[1] = [];
    if (s.side === "hero") {
      s.room.lanes[0] = s.room.lanes[0].filter((c) => c !== s.target);
      s.target.lane = 1; s.room.lanes[1].push(s.target); s.actor.targetId = s.target.id;
    } else s.target.lane = 1;
    s.actor.lane = 0;
    s.actor.rangedBonus = profile === "mastery" ? 2 : 0;
    const before = s.target.hp;
    s.play("oSword", { moxie: 10 });
    const dealt = profile === "mastery" ? 5 : profile === "specialty" ? 4 : 3;
    eq(loss(before, s.target.hp), dealt, "Veteran of the Psychic Wars cross-lane cost-scaled melee");
    return `SwordCost=3 crossLane=true damage=${dealt}`;
  },

  onePercenterCyclops(s, profile) {
    const opening = profile === "specialty" ? 1 : 0;
    const melee = profile === "mastery" ? 4 : 3;
    eq(s.actor.meleeBonus, melee, "Credit-Cursed Cyclops innate melee bonus");
    eq(s.actor.rangedBonus, -3, "Credit-Cursed Cyclops innate ranged penalty");
    eq(s.actor.moxie, opening, "Credit-Cursed Cyclops Specialty opening moxie");
    eq(G.cardCost("oSword", G.leveledBody(s.actor)), 4, "Credit-Cursed Cyclops adds one to card costs");
    eq(G.cardCost("oPowerWordGun", G.leveledBody(s.actor)), 10, "Credit-Cursed Cyclops cost tax caps at 10");
    const before = s.target.hp;
    s.play("oSword", { moxie: 10 });
    eq(loss(before, s.target.hp), 2 + melee, "Credit-Cursed Cyclops melee bonus reaches live cards");
    return `melee=+${melee} ranged=-3 SwordCost=4 SwordDamage=${2 + melee} startMoxie=${opening}`;
  },

  bankruptBarghest(s, profile) {
    const before = s.target.hp;
    s.play("oSword");
    const first = before - s.target.hp;
    ok(G.entityTrackers(s.room, s.target).some((tracker) => tracker.id.startsWith("body:bankruptBarghest:")),
      "Bankrupt Barghest marks are visible on their target");
    const mid = s.target.hp;
    s.play("oSword");
    const second = mid - s.target.hp;
    eq(first, 2, "Bankrupt Barghest first melee is unmarked");
    eq(second, profile === "base" ? 3 : 4, "Bankrupt Barghest future melee consumes source-specific marks");
    return `first=${first} second=${second}`;
  },

  recessionRevenant(s, profile) {
    s.setActorHp(1, 10);
    s.damageActor(1);
    eq(s.actor.revenantAfterlifeTicks, 60, "Recession Revenant enters six-second afterlife");
    eq(s.actor.alive, true, "Recession Revenant remains active in afterlife");
    s.actor.moxie = 0; s.advance(10);
    eq(s.actor.moxie, profile === "mastery" ? 2 : 1, "Recession Revenant afterlife moxie rate");
    const standingBefore = s.target.hp;
    s.play("oDagger");
    eq(standingBefore - s.target.hp, profile === "specialty" ? 2 : 1,
      "Recession Revenant Specialty adds afterlife damage");
    s.setTargetHp(1, 1);
    const before = s.target.hp;
    s.play("oDagger");
    eq(before - Math.max(0, s.target.hp), 1, "Recession Revenant can still cast in afterlife");
    eq(s.actor.hp, 10, "Recession Revenant defeat restores full health");
    eq(s.actor.revenantAfterlifeTicks, 0, "Recession Revenant revival ends afterlife");
    s.setActorHp(1, 10); s.damageActor(1);
    eq(s.actor.revenantAfterlifeTicks, 0, "Recession Revenant cannot enter afterlife twice");
    if (s.side === "hero") eq(s.actor.alive, false, "Recession Revenant's second hero-side death is final");
    else ok(!s.room.lanes[0].includes(s.actor), "Recession Revenant's second foe-side death is final");
    return `afterlifeMoxie=${profile === "mastery" ? 2 : 1} revived=10/10 bonus=${profile === "specialty" ? 1 : 0} onceOnly=true`;
  },

  shortscerer(s, profile) {
    if (s.side === "hero") {
      s.actor.cards = G.mintCards(["oMeteors"]); s.actor.hand = [...s.actor.cards];
      if (profile !== "mastery") G.requestCardPlay(s.room, s.actor, s.actor.hand[0].id);
    } else G.buildQueue(s.actor, profile === "mastery" ? ["oDagger", "oMeteors"] : ["oMeteors"]);
    const before = s.actor.hp;
    s.damageActor(5);
    const taken = before - s.actor.hp;
    eq(taken, profile === "specialty" ? 3 : 4, "Shortscerer qualifying card guard");
    return `incoming5→${taken} heldMastery=${profile === "mastery"}`;
  },

  callingCaltist(s, profile) {
    s.setActorHp(20, 20);
    s.play("oMeteors", { moxie: 5 });
    const paid = profile === "base" ? 2 : 1;
    eq(s.actor.hp, 20 - paid, "Calling Caltist pays the ranged-card shortfall in health");
    eq(s.actor.moxie, 0, "Calling Caltist pays only five moxie");
    return `Meteors=⚡5+♥${paid}`;
  },

  salesSage(s, profile) {
    const ranged = G.cardCost("oFire", G.leveledBody(s.actor));
    const melee = G.cardCost("oSword", G.leveledBody(s.actor));
    eq(ranged, profile === "base" ? 3 : 2, "Sales Sage halves ranged card cost");
    eq(melee, 3, "Sales Sage leaves melee card cost unchanged");
    return `Fire5→${ranged} Sword=${melee}`;
  },
};

const authored = Object.keys(G.BODY_UPGRADES).sort();
const registered = Object.keys(CASES).sort();
eq(authored.length, 46, "BODY_UPGRADES exact manifest count");
assert.deepEqual(registered, authored, "executable body registry must exactly match BODY_UPGRADES");

// Owner 2026-07-18: no upgrade may grant shield from a damage-taken body clock. This exact scan
// prevents a future row from silently recreating the recursive defensive pattern.
const damageTriggeredShieldSpecialties = authored.filter((bodyKey) => {
  const hasDamageTakenTrigger = G.BODIES[bodyKey]?.passive?.some((p) => p.hit);
  if (!hasDamageTakenTrigger) return false;
  const ranked = G.leveledPassives({
    bodyKey,
    levelAllocation: { ...G.emptyLevelAllocation(), specialty: 1 },
  });
  return ranked.some((p) => p.hit && p.ops?.some((op) => op.do === "shield"));
});
assert.deepEqual(damageTriggeredShieldSpecialties, [],
  "no Specialty grants shield from a damage-triggered body passive");
console.log("DAMAGE-TRIGGER SHIELD SPECIALTIES: none");

const profiles = ["base", "mastery", "specialty"];
const sides = ["hero", "foe"];
let passed = 0;
let failed = 0;
let controlsPassed = 0;

console.log("BODY PASSIVE CAUSAL MATRIX");
console.log("body\tprofile\tside\tresult\tobservation");
for (const bodyKey of authored) {
  for (const profile of profiles) {
    for (const side of sides) {
      try {
        if (profile !== "base") {
          // Same-level negative control: spend the rank's exact point cost on HP, then require
          // the base oracle. This catches upgrades that accidentally key off run level alone.
          const rankCost = G.BODY_UPGRADES[bodyKey][profile].cost;
          const control = bodyPassiveSandbox(bodyKey, "base", side, { allocation: { hp: rankCost } });
          const controlObservation = CASES[bodyKey](control, "base");
          ok(typeof controlObservation === "string" && controlObservation.length > 0,
            `${bodyKey}/${profile}/${side} same-level control emitted an observation`);
          controlsPassed++;
        }
        const sandbox = bodyPassiveSandbox(bodyKey, profile, side);
        const observation = CASES[bodyKey](sandbox, profile);
        ok(typeof observation === "string" && observation.length > 0, `${bodyKey}/${profile}/${side} emitted an observation`);
        passed++;
        console.log(`${bodyKey}\t${profile}\t${side}\tPASS\t${observation}`);
      } catch (error) {
        failed++;
        console.log(`${bodyKey}\t${profile}\t${side}\tFAIL\t${error.message}`);
      }
    }
  }
}

let basiliskCombinedPassed = 0;
for (const side of sides) {
  try {
    const sandbox = bodyPassiveSandbox("basilisk", "base", side, {
      allocation: { mastery: 1, specialty: 1 },
    });
    sandbox.play("dBuckler");
    eq(sandbox.target.poison ?? 0, 0,
      `Bankrupt Basilisk Mastery + max Specialty does not trigger after one moxie (${side})`);
    sandbox.play("dBuckler");
    eq(sandbox.target.poison, 2,
      `Bankrupt Basilisk Mastery + max Specialty poisons by two after two moxie (${side})`);
    basiliskCombinedPassed++;
    console.log(`basilisk\tmastery+specialty\t${side}\tPASS\tspent=2 poison=2 noTriggerAt=1`);
  } catch (error) {
    failed++;
    console.log(`basilisk\tmastery+specialty\t${side}\tFAIL\t${error.message}`);
  }
}

const expected = authored.length * profiles.length * sides.length;
const expectedControls = authored.length * (profiles.length - 1) * sides.length;
console.log(`SUMMARY ${failed ? "FAIL" : "PASS"}: ${passed}/${expected} cells + ${controlsPassed}/${expectedControls} same-level controls + ${basiliskCombinedPassed}/${sides.length} Basilisk combined-rank guards = ${passed + controlsPassed + basiliskCombinedPassed} causal executions, ${failed} failed; ${authored.length} bodies; ${sides.length} sides.`);
eq(passed, expected, "every body/profile/side case passed");
eq(controlsPassed, expectedControls, "every ranked cell passed its same-level no-rank control");
eq(basiliskCombinedPassed, sides.length, "Basilisk combined Mastery + max Specialty is causal on both sides");
