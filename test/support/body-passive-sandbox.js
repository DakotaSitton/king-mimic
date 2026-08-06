import * as G from "../../game.js";

export const PROFILE_ALLOCATIONS = Object.freeze({
  base: Object.freeze({ hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 0 }),
  mastery: Object.freeze({ hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 0 }),
  specialty: Object.freeze({ hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 1 }),
});

export const allocationFor = (profile, extra = {}) => ({
  ...PROFILE_ALLOCATIONS[profile],
  ...extra,
});

const resetCombatant = (c, allocation) => {
  c.alive = true;
  c.maxHp = c.hp = 1000;
  c.shield = 0;
  c.counters = 0;
  c.meleeBonus = allocation.melee;
  c.rangedBonus = allocation.ranged;
  c.moxie = 0;
  c.charge = 0;
  c.regens = [];
  c.timers = [];
  c.buffs = [];
  c.passiveProgress = {};
  c.queue = [];
  c.cards = [];
  c.hand = [];
  c.deck = [];
  c.discard = [];
  c.autoFire = false;
  G.applyCombatStart(c);
};

/**
 * A deterministic, networking-free one-lane combat room. Every action below
 * enters through the same public damage/card/tick functions used by a live run.
 */
export function bodyPassiveSandbox(bodyKey, profile, side, options = {}) {
  const allocation = allocationFor(profile, options.allocation);
  const level = G.allocationPoints(bodyKey, allocation) + 1;
  if (!Number.isFinite(level)) throw new Error(`${bodyKey}/${profile}: invalid allocation`);

  const room = G.newRoom(`BODY-PASSIVE-${bodyKey}-${profile}-${side}`);
  room.phase = "playing";
  room.tick = 0;
  room.laneCount = 1;
  room.lanes = [[]];
  room.allies = [[]];
  room.caravan = { hp: 1e9, max: 1e9 };
  room.defeated = { hero: 0, foe: 0 };
  room.combatLog = [];

  const hero = G.addPlayer(room, "hero", "Sandbox Hero");
  hero.lane = 0;
  hero.depth = 0;
  hero.runLevel = side === "hero" ? level : 1;
  hero.levelAllocation = side === "hero" ? { ...allocation } : G.emptyLevelAllocation();
  G.wearBody(hero, side === "hero" ? bodyKey : "rookie");

  const foe = side === "foe"
    ? G.spawnEnemy(bodyKey, [], level, allocation)
    : G.spawnEnemy("rookie", []);
  foe.lane = 0;
  room.lanes[0] = [foe];

  const actor = side === "hero" ? hero : foe;
  const target = side === "hero" ? foe : hero;
  resetCombatant(actor, allocation);
  if (target !== actor) {
    target.alive = true;
    target.maxHp = target.hp = 1000;
    target.shield = 0;
    target.counters = 0;
    target.meleeBonus = 0;
    target.rangedBonus = 0;
    target.moxie = 0;
    target.queue = [];
    target.autoFire = false;
  }
  hero.targetId = foe.id;
  hero.allyTargetId = hero.id;
  G.seedBodyCombatSummons(room);

  const play = (key, { moxie = 99, pick = null } = {}) => {
    actor.moxie = moxie;
    if (side === "hero") {
      actor.cards = G.mintCards([key]);
      actor.hand = [...actor.cards];
      actor.deck = [];
      actor.discard = [];
      const card = actor.hand[0];
      if (!card) throw new Error(`could not mint ${key}`);
      if (!G.playCard(room, actor, card.id, pick)) throw new Error(`${bodyKey}/${profile}/${side}: ${key} did not play`);
    } else {
      G.buildQueue(actor, [key]);
      actor.moxie = moxie;
      if (!actor.queue.some((card) => card.key === key)) throw new Error(`could not queue ${key}`);
      const wanted = actor.queue.findIndex((card) => card.key === key);
      if (wanted > 0) actor.queue.unshift(actor.queue.splice(wanted, 1)[0]);
      if (!G.foeCast(room, actor)) throw new Error(`${bodyKey}/${profile}/${side}: ${key} did not cast`);
    }
    return true;
  };

  const damageActor = (amount, opts = {}) => side === "hero"
    ? G.damagePlayer(room, actor, amount, { source: target, ...opts })
    : G.damageEnemy(room, 0, actor, amount, target, opts);

  const damageTarget = (amount, opts = {}) => side === "hero"
    ? G.damageEnemy(room, 0, target, amount, actor, opts)
    : G.damagePlayer(room, target, amount, { source: actor, ...opts });

  const hitActorWithCard = (key, moxie = 99) => {
    if (side === "hero") {
      G.buildQueue(target, [key]);
      target.moxie = moxie;
      const wanted = target.queue.findIndex((card) => card.key === key);
      if (wanted < 0) throw new Error(`could not queue opposing ${key}`);
      if (wanted > 0) target.queue.unshift(target.queue.splice(wanted, 1)[0]);
      if (!G.foeCast(room, target)) throw new Error(`opposing ${key} did not cast`);
    } else {
      target.cards = G.mintCards([key]);
      target.hand = [...target.cards]; target.deck = []; target.disc = [];
      target.moxie = moxie; target.targetId = actor.id;
      if (!G.playCard(room, target, target.hand[0].id)) throw new Error(`opposing ${key} did not play`);
    }
  };

  const damageOwnSummon = (token, amount) => side === "hero"
    ? G.hurtAllyToken(room, 0, token, amount, target)
    : G.damageEnemy(room, 0, token, amount, target);

  const advance = (ticks) => {
    for (let i = 0; i < ticks; i++) G.simulateTick(room);
  };

  const opposingUnits = () => side === "hero"
    ? room.lanes[0].filter((c) => c !== target)
    : [...room.players.values(), ...room.allies[0]].filter((c) => c !== target);

  const ownSummons = () => side === "hero"
    ? room.allies[0]
    : room.lanes[0].filter((c) => c !== actor);

  const ratUnits = () => ownSummons()
    .filter((c) => c.bodyKey === "rat")
    .reduce((sum, c) => sum + (c.ratCount ?? 1), 0);

  const withRandom = (values, fn) => {
    const sequence = Array.isArray(values) ? values : [values];
    if (!sequence.length) throw new Error("withRandom requires at least one deterministic sample");
    const original = Math.random;
    let index = 0;
    Math.random = () => sequence[Math.min(index++, sequence.length - 1)];
    try { return fn(); }
    finally { Math.random = original; }
  };

  return {
    G, room, actor, target, hero, foe, side, profile, allocation,
    play, damageActor, damageTarget, hitActorWithCard, damageOwnSummon, advance, opposingUnits, ownSummons, ratUnits,
    withRandom,
    setActorHp(hp, maxHp = actor.maxHp) { actor.maxHp = maxHp; actor.hp = hp; },
    setTargetHp(hp, maxHp = target.maxHp) { target.maxHp = maxHp; target.hp = hp; },
    addOpposingTarget(hp = 1000) {
      if (side === "hero") {
        const extra = G.spawnEnemy("rookie", []); extra.hp = extra.maxHp = hp; extra.queue = []; extra.lane = 0;
        room.lanes[0].push(extra); return extra;
      }
      const extra = G.spawnEnemy("rookie", []); extra.side = "hero"; extra.hp = extra.maxHp = hp; extra.queue = []; extra.lane = 0; extra.depth = -1;
      room.allies[0].push(extra); return extra;
    },
  };
}
