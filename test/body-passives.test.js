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
    const hpBefore = s.actor.hp;
    s.damageActor(threshold);
    eq(s.ratUnits(), 1, "Fat Cat damage trigger summoned one rat");
    const rat = s.ownSummons().find((c) => c.bodyKey === "rat");
    eq(rat.ratUnitHp, 1, "Fat Cat passive rat HP stays native");
    eq(loss(hpBefore, s.actor.hp), threshold, "Fat Cat Mastery does not reduce the hit before a summon exists");
    const secondHp = s.actor.hp;
    s.damageActor(threshold);
    eq(loss(secondHp, s.actor.hp), profile === "mastery" ? 2 : 3,
      "Fat Cat Mastery grants one damage reduction only with a summon in its lane");
    const before = s.target.hp;
    s.play("oDagger");
    eq(loss(before, s.target.hp), profile === "specialty" ? 2 : 1,
      "Fat Cat Specialty grants the wearer one damage per rank");
    return `rats=${s.ratUnits()} secondHit=${loss(secondHp, s.actor.hp)} dagger=${loss(before, s.target.hp)}`;
  },

  leverage(s, profile) {
    const threshold = 3;
    repeat(threshold, () => s.play("dBuckler"));
    const ratsExpected = profile === "mastery" ? 3 : 1;
    eq(s.ratUnits(), ratsExpected, "Royal Rat spend trigger rat count");
    const rat = s.ownSummons().find((c) => c.bodyKey === "rat");
    eq(rat.shield, profile === "specialty" ? ratsExpected : 0,
      "Royal Rat Specialty gives every summoned rat one shield per rank");
    return `spend=${threshold} rats=${ratsExpected} ratShield=${rat.shield}`;
  },

  hedge(s, profile) {
    const threshold = 3;
    repeat(threshold, () => s.play("dBuckler"));
    const expected = profile === "mastery" ? 4 : 2;
    eq(s.ratUnits(), expected, "Paid Piper card trigger rat count");
    eq(buffLeft(s.actor, "haste"), profile === "specialty" ? 30 : 0,
      "Paid Piper Specialty grants double moxie for three seconds on its first summon");
    if (profile === "mastery") {
      const cardSummon = bodyPassiveSandbox("hedge", "mastery", s.side);
      cardSummon.play("oPetRats");
      eq(cardSummon.ratUnits(), 4, "Paid Piper Mastery doubles card-created summons too");
    }
    if (profile === "specialty") {
      s.actor.queue = []; s.target.queue = [];
      s.advance(30);
      repeat(3, () => s.play("dBuckler"));
      eq(buffLeft(s.actor, "haste"), 0, "Paid Piper Specialty fires only for the first summon each combat");
    }
    return `plays=3 rats=${s.ratUnits()} firstSummonHaste=${profile === "specialty" ? 30 : 0}`;
  },

  ratTrader(s, profile) {
    s.setActorHp(990, 1000);
    repeat(2, () => s.play("oDagger"));
    const heal = profile === "specialty" ? 3 : 2;
    ok(s.actor.hp >= 990 + heal, "Toll Troll heals by two plus one per Specialty rank");
    eq(s.actor.maxHp, profile === "mastery" ? 1000 + heal : 1000,
      "Toll Troll Mastery grows fight-local max HP by exactly the passive heal");
    return `spent=4 heal>=${s.actor.hp - 990} fightMaxHpGain=${s.actor.maxHp - 1000}`;
  },

  compound(s, profile) {
    const startMoxie = s.actor.moxie;
    const before = s.target.hp;
    s.play("oDagger");
    const dealt = loss(before, s.target.hp);
    eq(dealt, profile === "mastery" ? 6 : 4, "Centless Centaur first card resolves twice, or three times with Mastery");
    eq(startMoxie, profile === "specialty" ? 2 : 0, "Centless Centaur specialty starting moxie");
    if (profile === "specialty") {
      const overflow = bodyPassiveSandbox("compound", "base", s.side, { allocation: { specialty: 6 } });
      eq(overflow.actor.moxie, 12, "Centless Centaur opening Specialty moxie may overflow the normal cap");
    }
    return `firstCardDamage=${dealt} startMoxie=${startMoxie}`;
  },

  discountDuel(s, profile) {
    const opening = s.target.hp;
    s.play("oDagger", { moxie: 10 });
    const openingCost = 10 - s.actor.moxie;
    eq(openingCost, 2, "Malevolent Mouse leaves card costs unchanged");
    eq(s.actor.meleeBonus, profile === "specialty" ? 1 : 0,
      "Malevolent Mouse Specialty adds melee damage during the active six-second window");
    eq(s.actor.rangedBonus, profile === "specialty" ? 1 : 0,
      "Malevolent Mouse Specialty adds ranged damage during the active six-second window");
    eq(loss(opening, s.target.hp), profile === "specialty" ? 4 : 3,
      "Malevolent Mouse opens with +2 damage plus its active Specialty modal bonus");
    s.actor.queue = []; s.target.queue = [];
    s.advance(60);
    eq(s.actor.meleeBonus, 0, "Malevolent Mouse Specialty melee bonus expires with the opening window");
    eq(s.actor.rangedBonus, 0, "Malevolent Mouse Specialty ranged bonus expires with the opening window");
    const expired = s.target.hp;
    s.play("oDagger");
    eq(loss(expired, s.target.hp), 1, "Malevolent Mouse opening damage expires after six seconds");
    if (profile === "mastery") {
      s.setTargetHp(1, 1000);
      s.play("oDagger");
      const next = s.addOpposingTarget();
      const before = next.hp;
      s.play("oDagger");
      eq(loss(before, next.hp), 3, "Malevolent Mouse Mastery reactivates +2 damage after a defeat");
    }
    return `openingDagger=${profile === "specialty" ? 4 : 3} openingCost=${openingCost} expiredDagger=1 killRestart=${profile === "mastery"}`;
  },

  pyramidRogue(s, profile) {
    s.play("oMeteors");
    s.play("oZweihander");
    const bonus = profile === "mastery" ? 2 : 1;
    eq(s.actor.meleeBonus, bonus, "Runeblade high-cost ranged card grants one per cost above four with Mastery");
    eq(s.actor.rangedBonus, bonus, "Runeblade high-cost melee card grants one per cost above four with Mastery");
    eq(s.actor.shield, profile === "specialty" ? 1 : 0, "Runeblade completed-pair shield is one per Specialty rank");
    return `melee=+${bonus} ranged=+${bonus} shield=${s.actor.shield}`;
  },

  bloodfund(s, profile) {
    const before = s.target.hp;
    s.damageActor(3);
    const counter = loss(before, s.target.hp);
    eq(counter, profile === "mastery" ? 2 : profile === "specialty" ? 3 : 1,
      "Market-Crash Minotaur Mastery repeats the strike and Specialty adds two damage");
    eq(s.actor.shield, 0, "Market-Crash Minotaur no longer refunds shield from damage taken");

    const weighted = bodyPassiveSandbox("bloodfund", "base", s.side, { allocation: { melee: 4 } });
    const lightBefore = weighted.target.hp;
    weighted.play("oDagger");
    eq(loss(lightBefore, weighted.target.hp), 3, "Light Dagger receives half of an even melee stat bonus");
    const heavyBefore = weighted.target.hp;
    weighted.play("oZweihander");
    eq(loss(heavyBefore, weighted.target.hp), 13, "Heavy Zweihander receives double an even melee stat bonus");
    return `counter=${counter} Light(+4)=3 Heavy(+4)=13`;
  },

  heavyHand(s, profile) {
    const threshold = 4;
    repeat(threshold, () => s.play("dBuckler"));
    eq(s.actor.counters, profile === "mastery" ? 2 : 1, "Interest Imp Mastery grants +2 general damage per trigger");
    eq((s.actor.meleeBonus ?? 0) + (s.actor.rangedBonus ?? 0), profile === "specialty" ? 1 : 0,
      "Interest Imp Specialty assigns one modal damage rank per trigger");
    if (profile === "specialty") {
      const ranked = bodyPassiveSandbox("heavyHand", "base", s.side, { allocation: { specialty: 3 } });
      ranked.withRandom([0.1, 0.9, 0.1], () => repeat(4, () => ranked.play("dBuckler")));
      eq(ranked.actor.meleeBonus, 2, "Interest Imp rolls each Specialty rank independently (two melee samples)");
      eq(ranked.actor.rangedBonus, 1, "Interest Imp rolls each Specialty rank independently (one ranged sample)");
    }
    return `spent=4 general=+${s.actor.counters} modal=+${(s.actor.meleeBonus ?? 0) + (s.actor.rangedBonus ?? 0)}`;
  },

  rentier(s, profile) {
    s.setActorHp(980, 1000);
    s.play("oSword");
    eq(s.actor.hp, 980 + (profile === "mastery" ? 2 : 1), "Vengeful Vampire Mastery heals all damage dealt");
    if (profile === "specialty") {
      G.resolveOps(s.room, s.actor, [{ do: "healSelf", amount: 4 }]);
      eq((s.actor.meleeBonus ?? 0) + (s.actor.rangedBonus ?? 0), 0,
        "Vengeful Vampire Specialty ignores a heal below five");
      G.resolveOps(s.room, s.actor, [{ do: "healSelf", amount: 5 }]);
      eq(s.actor.meleeBonus, 1, "Vengeful Vampire Specialty grants melee after a heal of at least five");
      eq(s.actor.rangedBonus, 1, "Vengeful Vampire Specialty grants ranged after a heal of at least five");
    }
    return `dealt=2 healed=${profile === "mastery" ? 2 : 1} fiveHealBonus=${profile === "specialty" ? 1 : 0}`;
  },

  ratBaron(s, profile) {
    s.play("oFire", { moxie: 10 });
    const firstCost = profile === "mastery" ? 1 : 4;
    eq(s.actor.moxie, 10 - firstCost, "Lizard Wizard Mastery discounts its first ranged card by four");
    if (profile === "mastery") {
      s.play("oFire", { moxie: 10 });
      eq(s.actor.moxie, 6, "Lizard Wizard's later ranged cards retain only the base one-moxie discount");
    }
    if (profile === "specialty") {
      eq(s.actor.rangedBonus, 2, "Lizard Wizard Specialty adds a six-second ranged stack per play");
      s.actor.queue = []; s.target.queue = [];
      s.advance(10);
      s.play("oArcane", { moxie: 10 });
      eq(s.actor.rangedBonus, 4, "Lizard Wizard Specialty stacks overlap");
      s.advance(50);
      eq(s.actor.rangedBonus, 2, "Lizard Wizard timed stacks expire independently");
      s.advance(10);
      eq(s.actor.rangedBonus, 0, "Lizard Wizard's later timed stack expires on its own clock");
    }
    return `firstFireCost=${firstCost} timedRanged=${profile === "specialty" ? "+2/+4/+2/0" : "none"}`;
  },

  counterparty(s, profile) {
    const threshold = profile === "mastery" ? 2 : 3;
    s.damageActor(threshold);
    eq(s.actor.counters, 1, "Bond Behemoth damage-taken trigger grants +1 damage");
    eq(s.actor.shield, 0, "Bond Behemoth no longer refunds shield from damage taken");
    if (profile === "specialty") {
      s.actor.queue = []; s.target.queue = [];
      s.advance(99);
      eq(s.actor.meleeBonus + s.actor.rangedBonus, 0, "Bond Behemoth Specialty waits ten seconds");
      s.advance(1);
      eq(s.actor.meleeBonus, 2, "Bond Behemoth Specialty grants +2 melee per rank after ten seconds");
      eq(s.actor.rangedBonus, 2, "Bond Behemoth Specialty grants +2 ranged per rank after ten seconds");
    }
    return `hit=${threshold} damage=+1 tenSecondModal=${profile === "specialty" ? 2 : 0}`;
  },

  juggernaut(s, profile) {
    const starting = 1000;
    eq(s.actor.shield, starting, "Golden Golem starting shield");
    const beforeShielded = s.target.hp;
    s.play("oDagger");
    eq(loss(beforeShielded, s.target.hp), profile === "specialty" ? 3 : 1,
      "Golden Golem Specialty grants +2 damage only while currently shielded");
    const hasteBefore = (s.actor.buffs ?? []).filter((b) => b.kind === "haste").length;
    s.damageActor(starting);
    const afterBreak = s.target.hp;
    s.play("oDagger");
    eq(loss(afterBreak, s.target.hp), 1, "Golden Golem Specialty turns off when current shield reaches zero");
    if (profile === "specialty") {
      G.resolveOps(s.room, s.actor, [{ do: "shield", amount: 1 }]);
      const restored = s.target.hp;
      s.play("oDagger");
      eq(loss(restored, s.target.hp), 3, "Golden Golem Specialty turns back on when shield is restored");
    }
    if (profile === "mastery") {
      eq(buffLeft(s.actor, "haste"), 120, "Golden Golem Mastery grants twelve seconds of double moxie on first shield loss");
      G.resolveOps(s.room, s.actor, [{ do: "shield", amount: 1 }]);
      s.damageActor(1);
      eq((s.actor.buffs ?? []).filter((b) => b.kind === "haste").length, hasteBefore + 1,
        "Golden Golem Mastery shield-break haste is once per combat");
    }
    return `startShield=${starting} shieldedDagger=${profile === "specialty" ? 3 : 1} breakHaste=${profile === "mastery" ? 120 : 0}`;
  },

  quakeCap(s, profile) {
    const extra = s.addOpposingTarget();
    const before = s.target.hp + extra.hp;
    repeat(9, () => s.play("oDagger"));
    const total = loss(before, s.target.hp + extra.hp);
    const passive = profile === "mastery" ? 14 : profile === "specialty" ? 13 : 7;
    eq(total, 9 + passive, "Crypto-Chimera rotates melee 3, lane ranged 2, then shield 3 every third card");
    eq(s.actor.shield, profile === "mastery" ? 6 : profile === "specialty" ? 5 : 3,
      "Crypto-Chimera shield step and Mastery full-cycle encore");
    ok(s.target.hp < 1000 && extra.hp < 1000, "Crypto-Chimera ranged rotation hits the full opposing lane");
    return `plays=9 passiveDamage=${passive} shield=${s.actor.shield}`;
  },

  mutualMend(s, profile) {
    const plays = profile === "mastery" ? 1 : 2;
    const before = s.target.hp;
    repeat(plays, () => s.play("dBuckler"));
    const dealt = loss(before, s.target.hp);
    const expected = profile === "specialty" ? 3 : 1;
    eq(dealt, expected, "Weary Wageslave passive strike lifecycle");
    return `plays=${plays} damage=${dealt}`;
  },

  bribedBishop(s, profile) {
    s.setActorHp(980, 1000);
    s.actor.queue = []; s.target.queue = [];
    s.advance(59);
    s.play("oDagger", { moxie: 10 });
    eq(s.actor.hp, 980, "Bribed Bishop does not heal from a card before its six-second arm");
    s.advance(1);
    s.play("oSword", { moxie: 10 });
    eq(s.actor.hp, 983, "Bribed Bishop's armed next card heals its live three-moxie cost to the ally target");
    s.play("oSword", { moxie: 10 });
    eq(s.actor.hp, 983, "Bribed Bishop consumes the armed heal after one card");
    if (profile === "specialty") {
      s.advance(60);
      s.play("oDagger", { moxie: 10 });
      eq(s.actor.counters, 2, "Bribed Bishop Specialty converts each cumulative five passive healing into +2 damage");
      s.advance(60);
      s.play("oSword", { moxie: 10 });
      eq(s.actor.counters, 2, "Bribed Bishop Specialty carries only the remainder after a five-healing group");
    }
    return `armedHeal=3 oneShot=true fiveHealDamage=${profile === "specialty" ? 2 : 0}`;
  },

  chequeCherub(s, profile) {
    s.setActorHp(990);
    const threshold = profile === "mastery" ? 2 : 3;
    repeat(threshold, () => s.play("oDagger"));
    const healed = s.actor.hp - 990;
    eq(healed, 6, "Cheque Cherub passive heal stays six");
    eq(s.actor.shield, profile === "specialty" ? 2 : 0, "Cheque Cherub Specialty grants two shield per rank");
    return `trigger=${threshold} heal=${healed} shield=${s.actor.shield}`;
  },

  pyramidHead(s, profile) {
    repeat(2, () => {
      s.play("dBuckler");
      ok(!s.actor.freeNext, "Pyramid-Scheme Head cannot arm its free card early");
    });
    s.play("dBuckler");
    ok(s.actor.freeNext, "Pyramid-Scheme Head armed a free card");
    const before = s.target.hp;
    s.play("oSword", { moxie: 0 });
    const dealt = loss(before, s.target.hp);
    eq(dealt, profile === "mastery" ? 4 : 2, "Pyramid-Scheme Head Mastery doubles the free card");
    eq(s.actor.moxie, profile === "specialty" ? 1 : 0,
      "Pyramid-Scheme Head Specialty grants one moxie per free card");
    return `plays=3 freeSwordDamage=${dealt} freeMoxie=${s.actor.moxie}`;
  },

  pennyPixie(s, profile) {
    s.play("oMallet", { moxie: 10 });
    const firstCost = profile === "mastery" ? 1 : 4;
    eq(s.actor.moxie, 10 - firstCost, "Penny-Pinching Pixie Mastery discounts its first melee card by four");
    if (profile === "mastery") {
      s.play("oMallet", { moxie: 10 });
      eq(s.actor.moxie, 6, "Penny-Pinching Pixie's later melee cards retain only the base one-moxie discount");
    }
    if (profile === "specialty") {
      eq(s.actor.meleeBonus, 2, "Penny-Pinching Pixie Specialty adds a six-second melee stack per play");
      s.actor.queue = []; s.target.queue = [];
      s.advance(10);
      s.play("oSword", { moxie: 10 });
      eq(s.actor.meleeBonus, 4, "Penny-Pinching Pixie Specialty stacks overlap");
      s.advance(50);
      eq(s.actor.meleeBonus, 2, "Penny-Pinching Pixie timed stacks expire independently");
      s.advance(10);
      eq(s.actor.meleeBonus, 0, "Penny-Pinching Pixie's later timed stack expires on its own clock");
    }
    return `firstMalletCost=${firstCost} timedMelee=${profile === "specialty" ? "+2/+4/+2/0" : "none"}`;
  },

  econElemental(s, profile) {
    const pulse = s.actor.regens.find((g) => g.kind === "economyPulse");
    ok(pulse, "Economy Elemental installed its live pulse");
    eq(pulse.period, profile === "mastery" ? 50 : 60, "Economy Elemental Mastery changes the pulse to five seconds");
    eq(s.actor.moxie, profile === "specialty" ? 2 : 0, "Economy Elemental Specialty starts with two moxie per rank");
    s.actor.queue = []; s.target.queue = [];
    const beforeNormal = s.actor.moxie;
    s.advance(10);
    eq(s.actor.moxie, beforeNormal, "Economy Elemental suppresses normal one-second moxie income");
    pulse.charge = pulse.period - 1;
    s.actor.moxie = 0;
    s.advance(1);
    eq(s.actor.moxie, 10, "Economy Elemental pulse fills the moxie bank");
    return `period=${pulse.period / 10}s start=${profile === "specialty" ? 2 : 0} normalRegen=0 pulse=10`;
  },

  warewolf(s, profile) {
    eq(s.actor.wform, "human", "Warewolf starts human");
    eq(s.actor.meleeBonus, 0, "Warewolf human form has no melee penalty");
    eq(s.actor.rangedBonus, 0, "Warewolf human form has no ranged penalty");
    const hpBefore = s.actor.hp;
    s.damageActor(3);
    eq(loss(hpBefore, s.actor.hp), profile === "mastery" ? 1 : 2, "Warewolf Mastery raises human-form reduction to two");
    const clock = s.actor.regens.find((g) => g.kind === "warewolf");
    clock.charge = 59;
    s.setActorHp(990, 1000);
    s.advance(1);
    eq(s.actor.wform, "wolf", "Warewolf tick flipped form");
    eq(s.actor.meleeBonus, profile === "mastery" ? 3 : 2, "Warewolf wolf bonus starts at two and Mastery grows it per transform");
    eq(s.actor.rangedBonus, 0, "Warewolf wolf ranged restoration");
    eq(s.actor.hp, 990 + (profile === "specialty" ? 2 : 0), "Warewolf Specialty heals two per transform");
    if (profile === "mastery") {
      clock.charge = 59; s.advance(1);
      clock.charge = 59; s.advance(1);
      eq(s.actor.meleeBonus, 4, "Warewolf Mastery grows the wolf bonus again on the next wolf transform");
    }
    return `humanDR=${profile === "mastery" ? 2 : 1} wolfMelee=${profile === "mastery" ? "3→4" : 2} transformHeal=${profile === "specialty" ? 2 : 0}`;
  },

  atlas(s, profile) {
    const threshold = profile === "mastery" ? 6 : 10;
    s.actor.meleeBonus = 7; s.actor.rangedBonus = 5;
    const before = s.target.hp;
    s.damageActor(threshold);
    const shrug = loss(before, s.target.hp);
    eq(shrug, profile === "specialty" ? 9 : 6, "Atlas SHRUG uses fixed base damage and ignores damage bonuses");
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
    const threshold = profile === "mastery" ? 2 : 3;
    repeat(threshold, () => s.play("dBuckler"));
    eq(s.target.poison, 1, "Bankrupt Basilisk Mastery changes the spend threshold, not poison magnitude");
    if (profile === "specialty") {
      const hpBefore = s.actor.hp;
      s.damageActor(4, { source: s.target });
      eq(loss(hpBefore, s.actor.hp), 3, "Bankrupt Basilisk Specialty suppresses foes in its lane during the opening six seconds");
      s.actor.queue = []; s.target.queue = [];
      s.advance(60);
      const expired = s.actor.hp;
      s.damageActor(4, { source: s.target });
      eq(loss(expired, s.actor.hp), 4, "Bankrupt Basilisk Specialty suppression expires after six seconds");
    }
    return `spent=${threshold} poison=1 openingSuppression=${profile === "specialty" ? 1 : 0}`;
  },

  fundjin(s, profile) {
    s.actor.queue = [];
    s.target.queue = [];
    s.actor.moxie = 0;
    s.target.moxie = 0;
    const period = profile === "mastery" ? 30 : 60;
    const before = s.target.hp;
    s.advance(period - 1);
    eq(loss(before, s.target.hp), 0, "Fundjin time clock does not fire a tick early");
    s.advance(1);
    const dealt = loss(before, s.target.hp);
    eq(dealt, profile === "specialty" ? 6 : 3, "Fundjin dual timer strikes");
    return `period=${period / 10}s timedDamage=${dealt}`;
  },

  auditAngel(s, profile) {
    s.setActorHp(980, 1000);
    s.actor.queue = []; s.target.queue = [];
    const clock = s.actor.regens.find((g) => g.kind === "auditAngel");
    ok(clock, "Audit Angel installs its six-second ally-heal clock");
    clock.charge = 49;
    s.play("oHaste", { moxie: 10 });
    s.advance(1);
    const heal = profile === "mastery" ? 12 : 6;
    eq(s.actor.hp, 980 + heal, "Audit Angel non-damaging cards reduce the heal clock by one second");
    eq(s.actor.shield, profile === "specialty" ? 2 : 0, "Audit Angel Specialty adds two shield per heal rank");
    return `nonDamageAdvance=1s heal=${heal} shield=${s.actor.shield}`;
  },

  medusa(s, profile) {
    s.play("oDagger", { moxie: 2 });
    eq(s.target.poison, profile === "mastery" ? 2 : 1, "Mid-Management Medusa damage poison");
    if (profile === "specialty") {
      const hpBefore = s.actor.hp;
      s.damageActor(4, { source: s.target });
      eq(loss(hpBefore, s.actor.hp), 3,
        "Mid-Management Medusa Specialty reduces poisoned foes' damage by poison stacks up to rank");
    }
    return `poison=${profile === "mastery" ? 2 : 1} poisonedFoeDR=${profile === "specialty" ? 1 : 0}`;
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
    const threshold = 10;
    s.actor.moxie = 0;
    s.advance(threshold * 10);
    const gain = profile === "mastery" ? 9 : 5;
    eq(s.actor.meleeBonus, gain, "Debt Dragon moxie-gain melee payoff");
    eq(s.actor.rangedBonus, gain, "Debt Dragon moxie-gain ranged payoff");
    if (profile === "specialty") {
      repeat(10, () => s.play("dBuckler", { moxie: 1 }));
      eq(s.actor.moxie, 1, "Debt Dragon Specialty refunds one moxie per rank after ten spent");
    }
    return `gained=${threshold} melee=+${gain} ranged=+${gain} spendRefund=${profile === "specialty" ? 1 : 0}`;
  },

  neptune(s, profile) {
    const swordBefore = s.target.hp;
    s.play("oSword", { moxie: 10 });
    const swordCost = profile === "mastery" ? 5 : 6;
    eq(s.actor.moxie, 10 - swordCost, "Nepotistic Neptune adds three to all card costs, or two with Mastery");
    eq(loss(swordBefore, s.target.hp), 4, "Nepotistic Neptune doubles every card, including Sword");
    eq(bodyPassiveSandbox("neptune", "base", s.side, { allocation: { specialty: 99 } }).actor.moxie, 10,
      "Nepotistic Neptune opening Specialty moxie respects the global cap");
    return `swordCost=${swordCost} doubledDamage=4 startMoxie=${profile === "specialty" ? 2 : 0}`;
  },

  sphinx(s, profile) {
    s.actor.rangedBonus = 3;
    const before = s.target.hp;
    s.advance(120);
    if (s.side === "hero") {
      eq(s.target.hp, before, "Stockbroking Sphinx waits for the wearer's choice");
      ok(s.actor.sphinxChoiceReady, "Stockbroking Sphinx arms its three-way choice");
      ok(G.chooseSphinxPassive(s.room, s.actor, "deal"), "Stockbroking Sphinx accepts its damage choice");
    }
    const hit = (profile === "specialty" ? 14 : 12) + 3;
    eq(loss(before, s.target.hp), hit, "Stockbroking Sphinx ranged-scaling target damage");
    eq(s.actor.sphinxPassiveUses, 1, "Stockbroking Sphinx records one used option");
    if (profile === "mastery") {
      const secondBefore = s.target.hp;
      s.advance(109);
      eq(s.target.hp, secondBefore, "Stockbroking Sphinx Mastery waits through the shortened clock");
      s.advance(1);
      if (s.side === "hero") ok(G.chooseSphinxPassive(s.room, s.actor, "heal"), "Stockbroking Sphinx uses a different second choice");
      eq(s.actor.sphinxPassiveUses, 2, "Stockbroking Sphinx Mastery makes the next choice arrive after 11 seconds");
      ok(!G.sphinxChoicesAvailable(s.actor).includes("deal"), "Stockbroking Sphinx keeps its first choice locked during the cycle");
    }
    return `first=120 next=${profile === "mastery" ? 110 : 120} damage=${hit} uses=${s.actor.sphinxPassiveUses}`;
  },

  wanderCastle(s, profile) {
    s.play("oSword", { moxie: 10 });
    eq(s.actor.shield, profile === "mastery" ? 6 : 3,
      "Wandering Castle grants shield equal to every card's live cost and Mastery doubles shield gain");
    if (profile === "specialty") {
      s.actor.queue = []; s.target.queue = [];
      const before = s.target.hp;
      s.advance(59);
      eq(s.target.hp, before, "Wandering Castle Specialty waits the full six seconds");
      s.advance(1);
      eq(loss(before, s.target.hp), 1, "Wandering Castle Specialty deals one aimed damage per rank every six seconds");
    }
    return `SwordCost=3 shield=${s.actor.shield} timedDamage=${profile === "specialty" ? 1 : 0}`;
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
    s.setActorHp(990, 1000);
    s.actor.moxie = cost;
    const before = s.target.hp;
    ok(G.tryOligarchyCast(s.room, s.actor), "Oligarchy Ooze auto-casts its held card when affordable");
    eq(loss(before, s.target.hp), 2, "Oligarchy Ooze stolen Sword damage");
    eq(s.actor.hp, 990 + (profile === "specialty" ? 1 : 0),
      "Oligarchy Ooze Specialty heals one per rank whenever it plays the digested card");
    eq(s.actor.oozeStolenKey, "oSword", "Oligarchy Ooze keeps the stolen card for repeated casts");
    return `held=oSword cost=${cost} replayHeal=${profile === "specialty" ? 1 : 0} replayDamage=2`;
  },

  moneymancer(s, profile) {
    const clock = s.actor.regens.find((g) => g.kind === "moneymancer");
    const period = profile === "mastery" ? 40 : 60;
    eq(clock.period, period, "Moneymancer discount cadence");
    clock.charge = period - 1;
    s.advance(1);
    const discount = profile === "specialty" ? 4 : 3;
    eq(s.actor.nextRangedDiscount, discount, "Moneymancer armed discount amount");
    s.play("oSword", { moxie: 10 });
    eq(s.actor.nextRangedDiscount, discount, "Moneymancer melee card preserves ranged-or-summon discount");
    s.play("oLavaElemental", { moxie: 10 });
    const cost = 7 - discount;
    eq(s.actor.moxie, 10 - cost, "Moneymancer discount applies to summon cards too");
    eq(s.actor.nextRangedDiscount, 0, "Moneymancer summon card consumes the discount");
    return `period=${period / 10}s discount=${discount} summonCost=${cost}`;
  },

  gdpGiant(s, profile) {
    const costly = G.mintCard("oOmnislash"), cheap = G.mintCard("oMallet");
    if (s.side === "hero") {
      s.actor.cards = [costly, cheap]; s.actor.hand = [costly, cheap];
      s.actor.cardQueue = [{ id: costly.id }];
      s.actor.queuedCard = s.actor.cardQueue[0] ?? null;
    } else s.actor.queue = [costly, cheap];
    const before = s.actor.hp;
    s.damageActor(5);
    const dr = profile === "mastery" ? 3 : 1;
    eq(loss(before, s.actor.hp), 5 - dr, "GDP Giant live queued-heavy damage reduction");
    const low = bodyPassiveSandbox("gdpGiant", profile, s.side);
    if (low.side === "hero") {
      const c = G.mintCard("oPowerWordGun"); low.actor.cards = [c]; low.actor.hand = [c];
      low.actor.cardQueue = [{ id: c.id }]; low.actor.queuedCard = low.actor.cardQueue[0];
    } else G.buildQueue(low.actor, ["oPowerWordGun"]);
    const lowBefore = low.actor.hp; low.damageActor(5);
    eq(loss(lowBefore, low.actor.hp), 5, "GDP Giant heavy guard excludes an untagged ten-cost card");
    if (profile === "specialty") {
      const first = s.target.hp; s.play("oZweihander", { moxie: 10 });
      const firstDamage = loss(first, s.target.hp);
      const second = s.target.hp; s.play("oZweihander", { moxie: 10 });
      const secondDamage = loss(second, s.target.hp);
      const third = s.target.hp; s.play("oZweihander", { moxie: 10 });
      const thirdDamage = loss(third, s.target.hp);
      eq(secondDamage, firstDamage + 1, "GDP Giant Specialty gives the next heavy one bonus damage per rank");
      eq(thirdDamage, secondDamage, "GDP Giant next-heavy bonus is one-shot and cannot stack");
    }
    return `queuedHeavy=Zweihander DR=${dr} expensiveNonHeavy=PowerWordGun nextHeavy=${profile === "specialty" ? "+0/+1/+1" : "none"}`;
  },

  hedgefundKnight(s, profile) {
    const clock = s.actor.regens.find((g) => g.kind === "hedgefundKnight");
    const period = profile === "mastery" ? 40 : 60;
    eq(clock?.period, period, "Hedgefund Knight pulse cadence");
    s.actor.queue = []; s.target.queue = [];
    s.actor.shield = 1; clock.charge = period - 1;
    s.advance(1);
    const meleeGain = profile === "specialty" ? 4 : 3;
    eq(s.actor.meleeBonus, meleeGain, "Hedgefund Knight shield-to-melee branch");
    s.actor.shield = 0; s.actor.meleeBonus = 0; clock.charge = period - 1;
    s.advance(1);
    const shieldGain = profile === "specialty" ? 8 : 6;
    eq(s.actor.shield, shieldGain, "Hedgefund Knight melee-to-shield branch");
    return `period=${period / 10}s shielded→melee+${meleeGain} unshielded→shield${shieldGain}`;
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
    eq(s.actor.meleeBonus, 0, "Credit-Cursed Cyclops no longer has a flat melee bonus");
    eq(s.actor.rangedBonus, 0, "Credit-Cursed Cyclops no longer has a ranged penalty");
    eq(s.actor.moxie, opening, "Credit-Cursed Cyclops Specialty opening moxie");
    eq(G.cardCost("oSword", G.leveledBody(s.actor)), 4, "Credit-Cursed Cyclops adds one to card costs");
    eq(G.cardCost("oPowerWordGun", G.leveledBody(s.actor)), 10, "Credit-Cursed Cyclops cost tax caps at 10");
    s.setActorHp(5, 15);
    const before = s.target.hp;
    s.play("oZweihander", { moxie: 10 });
    const bonus = profile === "mastery" ? 5 : 3;
    eq(loss(before, s.target.hp), 5 + bonus,
      "Credit-Cursed Cyclops heavy melee gains one damage per five health, or per three with Mastery");
    return `heavy=Zweihander currentHp=5 maxHp=15 heavyBonus=+${bonus} startMoxie=${opening}`;
  },

  bankruptBarghest(s, profile) {
    const before = s.target.hp;
    s.play("oFire", { moxie: 10 });
    const first = before - s.target.hp;
    ok(G.entityTrackers(s.room, s.target).some((tracker) => tracker.id.startsWith("body:bankruptBarghest:")),
      "Bankrupt Barghest marks are visible on their target");
    const mid = s.target.hp;
    s.play("oFire", { moxie: 10 });
    const second = mid - s.target.hp;
    eq(first, 6, "Bankrupt Barghest first ranged hit is unmarked");
    eq(second, profile === "mastery" ? 8 : 7,
      "Bankrupt Barghest marks and Mastery apply to any landed damage, not only melee");
    if (profile === "specialty") {
      const discounted = bodyPassiveSandbox("bankruptBarghest", "specialty", s.side);
      discounted.play("oSword", { moxie: 10 });
      eq(discounted.actor.moxie, 9, "Bankrupt Barghest Specialty discounts the first card by two");
      discounted.play("oSword", { moxie: 10 });
      eq(discounted.actor.moxie, 7, "Bankrupt Barghest Specialty rank one discounts only the first card");
    }
    return `first=${first} second=${second}`;
  },

  recessionRevenant(s, profile) {
    s.setActorHp(1, 10);
    s.damageActor(1);
    const duration = profile === "mastery" ? 90 : 60;
    eq(s.actor.revenantAfterlifeTicks, duration, "Recession Revenant Mastery extends afterlife by three seconds");
    eq(s.actor.alive, true, "Recession Revenant remains active in afterlife");
    s.actor.moxie = 0; s.advance(10);
    eq(s.actor.moxie, profile === "mastery" ? 2 : 1, "Recession Revenant afterlife moxie rate");
    const standingBefore = s.target.hp;
    s.play("oDagger");
    eq(standingBefore - s.target.hp, profile === "specialty" ? 3 : 1,
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
    return `afterlife=${duration / 10}s moxie=${profile === "mastery" ? 2 : 1} revived=10/10 bonus=${profile === "specialty" ? 2 : 0} onceOnly=true`;
  },

  shortscerer(s, profile) {
    if (s.side === "hero") {
      s.actor.cards = G.mintCards(["oMeteors"]); s.actor.hand = [...s.actor.cards];
      G.requestCardPlay(s.room, s.actor, s.actor.hand[0].id);
    } else G.buildQueue(s.actor, ["oMeteors"]);
    const before = s.actor.hp;
    s.damageActor(5);
    const taken = before - s.actor.hp;
    eq(taken, profile === "mastery" ? 3 : 4, "Shortscerer Mastery raises the queued cost-five guard to two");
    if (profile === "specialty") {
      s.play("oMeteors", { moxie: 10 });
      eq(s.actor.moxie, 6, "Shortscerer Specialty refunds two moxie on the first qualifying ranged card");
      s.play("oMeteors", { moxie: 10 });
      eq(s.actor.moxie, 4, "Shortscerer Specialty refund is once per combat");
    }
    return `incoming5→${taken} firstRefund=${profile === "specialty" ? 2 : 0}`;
  },

  callingCaltist(s, profile) {
    s.setActorHp(20, 20);
    const liveCost = G.cardCost("oMeteors", G.leveledBody(s.actor));
    s.play("oMeteors", { moxie: profile === "mastery" ? 0 : liveCost - 1 });
    const paid = profile === "mastery" ? liveCost : 1;
    eq(s.actor.hp, 20 - paid, "Calling Caltist pays the ranged-card shortfall in health");
    if (profile === "specialty") {
      s.actor.queue = []; s.target.queue = [];
      s.advance(59);
      eq(s.actor.hp, 19, "Calling Caltist does not recover spent health early");
      s.advance(1);
      eq(s.actor.hp, 20, "Calling Caltist recovers only the one health actually spent, below its two-rank budget");
      s.setActorHp(17, 20); s.advance(60);
      eq(s.actor.hp, 17, "Calling Caltist recovery cannot heal unrelated missing health after its pool is empty");
    }
    return `MeteorsLiveCost=${liveCost} healthPaid=${paid} sixSecondRecovery=${profile === "specialty" ? 1 : 0}`;
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
      `Bankrupt Basilisk Mastery + Specialty does not trigger after one moxie (${side})`);
    sandbox.play("dBuckler");
    eq(sandbox.target.poison, 1,
      `Bankrupt Basilisk Mastery + Specialty poisons by one after two moxie (${side})`);
    basiliskCombinedPassed++;
    console.log(`basilisk\tmastery+specialty\t${side}\tPASS\tspent=2 poison=1 noTriggerAt=1`);
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
eq(basiliskCombinedPassed, sides.length, "Basilisk combined Mastery + Specialty is causal on both sides");
