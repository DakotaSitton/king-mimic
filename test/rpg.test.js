// RPG crawler — deterministic rules suite.   bun run test/rpg.test.js
// Covers the owner's rules (body = one passive, deck slots = level, weapon swing speed + pushback, minor
// actions), the honesty rule (preview numbers = real numbers), pushback/stagger/slam, each passive, floors
// and stairs, the boss, co-op scaling/revives, and the co-op wire.
import * as sim from "../engine/rpg/sim.js";
import { initFor, snapFor, mirrorFrom, applySnap } from "../engine/rpg/net.js";
import { CARDS, BODIES, FOES, FLOORS, TUNING as T } from "../engine/rpg/content.js";
import { botThink } from "../engine/rpg/bot.js";

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log("FAIL:", msg); } };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const P = (body, extra = {}) => ({ id: "a", body, ...BODIES[body].suggested, ...extra });
const run = (players, seed = 11) => sim.createRun({ seed, players });
const steps = (S, sec) => { for (let i = 0; i < Math.round(sec / sim.DT); i++) sim.step(S, sim.DT); };
// an empty arena: a room's floor with every foe removed, the player in the middle
function arena(players, seed = 5) {
  const S = run(players, seed);
  const r = S.floor.rooms[1];
  S.ents = S.ents.filter((e) => e.kind === "player");
  for (const rs of S.rooms) rs.foes = [];
  S.items = [];
  for (const e of S.ents) { e.x = r.cx; e.y = r.cy; }
  return { S, r };
}
function foeAt(S, key, x, y, level = 1) {
  const fr = S.floor.rooms[1];
  // built field-for-field like sim.spawnFoe (not exported), awake and placed exactly
  const F = FOES[key];
  const o = { id: S.nextId++, side: "foe", kind: "foe", foe: key, x, y, level, hp: 1, maxHp: 1, shield: 0, speed: T.speed, r: T.radius, mods: {},
    mx: 0, my: 0, fx: -1, fy: 0, cast: null, dash: null, kb: null, slowUntil: 0, slowPct: 0, stunUntil: 0, iframeUntil: 0, recoverUntil: 0, dots: [], dead: false,
    body: F.body, weapon: F.weapon, deck: F.deck.slice(0, level), actions: F.actions.slice(), cds: F.actions.map(() => 0), bag: [], fought: [],
    ratCd: 0, angelT: 0, rage: 0, rageAcc: 0, interest: 0, attacks: 0, goreAcc: 0, vampAcc: 0, mouseUntil: 0, firstHit: false, forceSeq: 0,
    hpMul: F.hpMul ?? 1, room: fr.id, awake: true, rest: 99, strafe: 1, strafeT: 0, tgtId: null, tgtT: 0 };
  sim.recalc(o, false); o.hp = o.maxHp;
  S.ents.push(o); S.rooms[fr.id].foes.push(o.id);
  return o;
}

// ---------------------------------------------------------------- the loadout
{
  const S = run([{ id: "a", body: "fatCat", weapon: "spear", actions: ["dodgeRoll", "charge"], deck: [] }, { id: "b", body: "lizardWizard", weapon: "spear", actions: ["dodgeRoll", "charge"], deck: [] }]);
  const a = sim.playerOf(S, "a"), b = sim.playerOf(S, "b");
  ok(a.maxHp === b.maxHp && a.speed === b.speed && a.r === b.r, "a body adds no stats — only its passive");
  ok(a.maxHp === T.baseHp, "level 1 with an empty deck = the base health");
}
{
  const S = run([P("fatCat", { deck: ["vigor"] })]);
  const e = sim.playerOf(S, "a");
  ok(e.deck.length === 1 && e.level === 1, "level 1 = one deck slot");
  ok(e.maxHp === T.baseHp + 8, "Vigor: +8 health");
  e.bag.push("giant", "swift", "spear");
  ok(!sim.equip(S, "a", 0).ok, "a full deck refuses another card");
  ok(sim.unequip(S, "a", "deck", 0).ok && e.deck.length === 0 && e.maxHp === T.baseHp, "unequip Vigor → back in the bag, health back to base");
  const gi = e.bag.indexOf("giant");
  ok(sim.equip(S, "a", gi).ok && e.r > T.radius && e.maxHp === T.baseHp + 6, "Giant: bigger and +6 health");
  const wi = e.bag.indexOf("spear"); const oldW = e.weapon;
  ok(sim.equip(S, "a", wi).ok && e.weapon === "spear" && e.bag.includes(oldW), "a weapon from the bag swaps with yours");
  // level up opens a slot
  S.xp = 0; sim.step(S, 0);
  const before = e.deck.length;
  for (let i = 0; i < 6 && S.level < 2; i++) { S.xp += 1; }
  // gainXp is internal: kill a foe to level
  const f = foeAt(S, "mouse", e.x + 1, e.y); f.hp = 1; sim.damage(S, f, 5, e, "test");
  for (let i = 0; i < 5 && S.level < 2; i++) { const g = foeAt(S, "mouse", e.x + 1, e.y); sim.damage(S, g, 99, e, "test"); }
  ok(S.level >= 2 && e.level === S.level, "felling foes levels the party up");
  const si = e.bag.indexOf("swift");
  ok(sim.equip(S, "a", si).ok && e.deck.length === before + 1, "a new level = one more deck slot");
}
{
  const S = run([P("fatCat")]);
  const e = sim.playerOf(S, "a"); e.bag.push("firebomb");
  ok(!sim.equip(S, "a", e.bag.length - 1).ok, "both action slots full → refuse");
  sim.unequip(S, "a", "action", 0);
  ok(sim.equip(S, "a", e.bag.indexOf("firebomb")).ok && sim.cdLeft(S, e, 2) > 0, "a freshly equipped action starts recharging");
}

// ---------------------------------------------------------------- weapons, cooldowns, honesty
{
  const { S } = arena([P("goldenGolem", { weapon: "greatsword", deck: [] })]);
  const e = sim.playerOf(S, "a");
  const f = foeAt(S, "troll", e.x + 1.6, e.y);
  const sh = sim.shapeOf(S, e, "greatsword", { dx: 1, dy: 0 });
  const hits = sim.hitsOf(S, e, sh).foes;
  ok(hits.includes(f), "the greatsword's preview covers the foe");
  const want = sim.dmgAgainst(S, e, f, sim.dmgOf(S, e, "greatsword"), "melee", e.x, e.y);
  const hp0 = f.hp + f.shield;
  ok(sim.play(S, "a", 0, { dx: 1, dy: 0 }).ok, "weapon swing begins");
  ok(sim.play(S, "a", 0, { dx: 1, dy: 0 }).why === "busy", "one swing at a time");
  steps(S, sim.windupOf(e, "greatsword") + 0.02);
  ok(near(hp0 - (f.hp + f.shield), want), `preview damage = real damage (${want})`);
  ok(sim.blockedWhy(S, e, 0) === "busy", "recovery after the swing");
  steps(S, CARDS.greatsword.recover + 0.05);
  ok(!sim.blockedWhy(S, e, 0), "recovered");
}
{
  // sword and shield: half of a hit from the front, full from behind
  const { S } = arena([P("fatCat", { weapon: "swordShield", deck: [] })]);
  const e = sim.playerOf(S, "a"); e.fx = 1; e.fy = 0;
  const front = sim.dmgAgainst(S, { x: e.x + 2, y: e.y }, e, 8, "melee", e.x + 2, e.y);
  const back = sim.dmgAgainst(S, { x: e.x - 2, y: e.y }, e, 8, "melee", e.x - 2, e.y);
  ok(front === 4 && back === 8, `sword and shield blocks half from the front (${front} vs ${back})`);
  e.cast = { key: "swordShield", slot: 0, t: 0, dur: 1 };
  ok(sim.dmgAgainst(S, null, e, 8, "melee", e.x + 2, e.y) === 8, "…but not while swinging");
}
{
  // armor and resists
  const { S } = arena([P("fatCat", { deck: ["ironSkin"] })]);
  const e = sim.playerOf(S, "a");
  ok(sim.dmgAgainst(S, null, e, 3, "melee") === 2 && sim.dmgAgainst(S, null, e, 1, "melee") === 1, "Iron Skin: −1 per hit, never below 1");
  e.deck = ["spellward"]; sim.recalc(e);
  ok(sim.dmgAgainst(S, null, e, 10, "spell") === 7 && sim.dmgAgainst(S, null, e, 10, "melee") === 10, "Spellward: −30% from spells only");
  e.deck = ["focus"]; sim.recalc(e);
  ok(sim.dmgOf(S, e, "fireMagic") === Math.round(4 * 1.3) && sim.dmgOf(S, e, "spear") === 4, "Focus boosts spells, not melee");
  e.deck = ["quickHands"]; sim.recalc(e);
  ok(near(sim.windupOf(e, "greatsword"), 1.1 * 0.8) && near(sim.windupOf(e, "firebomb"), 0.8), "Quick Hands: weapon wind-ups only");
  e.deck = ["longArm"]; sim.recalc(e);
  ok(near(sim.shapeOf(S, e, "spear", { dx: 1, dy: 0 }).len, Math.min(3.3 * 1.25, sim.rayToWall(S, e.x, e.y, 1, 0, 3.3 * 1.25))), "Long Arm: weapon reach +25%");
}
{
  // action cooldowns
  const { S } = arena([P("fatCat", { actions: ["shieldUp", "warStomp"] })]);
  const e = sim.playerOf(S, "a");
  foeAt(S, "troll", e.x + 5, e.y).speed = 0;      // an awake foe: shields only fade when nobody is
  ok(sim.play(S, "a", 1, { dx: 1, dy: 0 }).ok, "an action fires");
  steps(S, 0.4);
  ok(e.shield >= 8, "Shield Up shields");
  ok(sim.blockedWhy(S, e, 1) === "cooldown" && sim.play(S, "a", 1, {}).why === "cooldown", "then recharges");
  steps(S, CARDS.shieldUp.cooldown);
  ok(!sim.blockedWhy(S, e, 1), "recharged");
  e.deck = ["clockwork"]; sim.recalc(e);
  ok(near(sim.cooldownOf(e, "warStomp"), 8 * 0.75), "Clockwork: −25% recharge");
}
{
  // blood magic: pays health, heals per foe hit; can't pay with your last health
  const { S } = arena([P("vengefulVampire", { body: "fatCat", deck: [] })]);
  const e = sim.playerOf(S, "a");
  foeAt(S, "wageslave", e.x + 2, e.y); foeAt(S, "wageslave", e.x + 3.5, e.y);
  const hp0 = e.hp;
  sim.play(S, "a", 0, { dx: 1, dy: 0 });
  ok(e.hp === hp0 - 2, "Blood Magic costs 2 health up front");
  steps(S, 0.6);
  ok(e.hp === hp0 - 2 + 2, "…and heals 1 per foe hit (2 hit)");
  e.hp = 2; e.recoverUntil = 0;
  ok(sim.blockedWhy(S, e, 0) === "health", "can't pay with your last health");
}
{
  // projectiles: arrows stop at the first foe; crossbow bolts pierce
  const { S } = arena([P("medusa", { body: "fatCat", weapon: "bow", deck: [] })]);
  const e = sim.playerOf(S, "a");
  const f1 = foeAt(S, "wageslave", e.x + 2, e.y), f2 = foeAt(S, "wageslave", e.x + 3.5, e.y);
  f1.fx = f2.fx = 1;
  sim.play(S, "a", 0, { dx: 1, dy: 0 }); steps(S, 1.2);
  ok(f1.hp < f1.maxHp && f2.hp === f2.maxHp, "an arrow hits only the first foe");
  e.weapon = "crossbow"; f1.hp = f1.maxHp; e.recoverUntil = 0;
  sim.play(S, "a", 0, { dx: 1, dy: 0 }); steps(S, 1.5);
  ok(f1.hp < f1.maxHp && f2.hp < f2.maxHp, "a crossbow bolt pierces both");
}

// ---------------------------------------------------------------- pushback
{
  const { S } = arena([P("goldenGolem", { weapon: "spear", deck: [] })]);
  const e = sim.playerOf(S, "a");
  const f = foeAt(S, "wageslave", e.x + 1.5, e.y); f.speed = 0;
  const x0 = f.x, d = sim.shoveDist(f, sim.pushOf(e, "spear"));
  sim.play(S, "a", 0, { dx: 1, dy: 0 }); steps(S, 0.52);
  steps(S, 1);
  ok(Math.abs((f.x - x0) - d) < 0.25, `the spear shoves its target ~${d.toFixed(2)} tiles (moved ${(f.x - x0).toFixed(2)})`);
  const g = foeAt(S, "troll", 0, 0, 3);
  ok(sim.shoveDist(g, 2) < sim.shoveDist(f, 2), "big bodies (Giant) budge less");
  const m = foeAt(S, "mouse", 0, 0, 1);
  ok(sim.shoveDist(m, 2) > sim.shoveDist(f, 2), "tiny bodies fly farther");
}
{
  // a big shove breaks a wind-up (stagger); a boss shrugs it off
  const { S } = arena([P("goldenGolem", { weapon: "greatsword", deck: [] })]);
  const e = sim.playerOf(S, "a");
  const f = foeAt(S, "centaur", e.x + 1.8, e.y);
  f.cast = { key: "bow", slot: 0, t: 0, dur: 5, aim: { dx: -1, dy: 0 } };
  sim.play(S, "a", 0, { dx: 1, dy: 0 }); steps(S, 1.12);
  ok(!f.cast && S.t < f.stunUntil + 0.01, "the greatsword staggers: the foe's wind-up is broken");
  ok(S.fx.some((x) => x.type === "stagger"), "…with a STAGGER effect");
}
{
  // slammed into a wall
  const { S, r } = arena([P("goldenGolem", { weapon: "greatsword", deck: [] })]);
  const e = sim.playerOf(S, "a");
  e.x = r.x + r.w - 2.4; e.y = r.cy;
  const f = foeAt(S, "mouse", r.x + r.w - 0.5, r.cy);
  const hp0 = f.hp;
  sim.play(S, "a", 0, { dx: 1, dy: 0 }); steps(S, 1.3);
  ok(S.fx.some((x) => x.type === "slam" && x.id === f.id) || f.dead, "a shove into a wall slams");
  ok(f.dead || hp0 - f.hp >= sim.dmgOf(S, e, "greatsword") , "the slam hurts on top of the hit");
}

// ---------------------------------------------------------------- passives (his KM passives, real time)
{
  const { S } = arena([P("fatCat")]);
  const e = sim.playerOf(S, "a"); const f = foeAt(S, "wageslave", e.x + 3, e.y);
  sim.damage(S, e, 2, f, "test");
  ok(S.ents.some((u) => u.kind === "unit" && u.unit === "rat" && u.owner === e.id), "Fat Cat: hit → a rat");
}
{
  const { S } = arena([P("royalRat")]);
  const e = sim.playerOf(S, "a");
  sim.play(S, "a", 0, { dx: 1, dy: 0 });
  ok(S.ents.some((u) => u.kind === "unit" && u.unit === "rat" && u.owner === e.id), "Royal Rat: attack → a rat");
}
{
  const S = run([P("goldenGolem")], 3);
  const e = sim.playerOf(S, "a");
  const fr = S.floor.rooms[1]; e.x = fr.cx; e.y = fr.cy;
  sim.step(S);
  ok(e.shield === e.maxHp, "Golden Golem: walking into a fight = shield equal to max health");
  for (const o of S.ents) if (o.kind === "foe") o.dead = true;
  steps(S, 10);
  ok(e.shield === 0, "…and it fades once no foe is awake");
}
{
  const { S } = arena([P("vengefulVampire", { weapon: "spear" })]);
  const e = sim.playerOf(S, "a"); e.hp = 10; const f = foeAt(S, "troll", e.x + 1, e.y, 3);
  sim.damage(S, f, 4, e, "test");
  ok(e.hp === 12, "Vengeful Vampire: 4 dealt → heal 2");
}
{
  const { S } = arena([P("bondBehemoth")]);
  const e = sim.playerOf(S, "a"); const f = foeAt(S, "wageslave", e.x + 3, e.y);
  sim.damage(S, e, 7, f, "test");
  ok(e.rage === 2 && sim.dmgOf(S, e, "greatsword") === 9 + 2, "Bond Behemoth: 7 taken → +2 damage");
}
{
  const { S } = arena([P("medusa")]);
  const e = sim.playerOf(S, "a"); const f = foeAt(S, "troll", e.x + 3, e.y, 3);
  sim.damage(S, f, 1, e, "test");
  const hp = f.hp; steps(S, 3.05);
  ok(f.hp === hp - 3, "Medusa: damage poisons, 1 a second for 3 seconds");
}
{
  const { S } = arena([P("centlessCentaur", { weapon: "spear", deck: [] })]);
  const e = sim.playerOf(S, "a"); const f = foeAt(S, "troll", e.x + 1.5, e.y, 3); f.fx = 1;
  e.firstHit = true;
  const hp = f.hp, one = sim.dmgAgainst(S, e, f, sim.dmgOf(S, e, "spear"), "melee", e.x, e.y);
  sim.play(S, "a", 0, { dx: 1, dy: 0 }); steps(S, 0.55);
  ok(hp - f.hp === one * 2 && !e.firstHit, "Centless Centaur: the first attack of a fight lands twice");
}
{
  const S = run([P("auditAngel"), { id: "b", ...P("fatCat"), id: "b" }]);
  const a = sim.playerOf(S, "a"), b = sim.playerOf(S, "b");
  b.x = a.x + 1; b.y = a.y; b.hp = 5;
  steps(S, 0.1);
  ok(b.hp === 11, "Audit Angel: heals the most hurt ally nearby for 6");
}
{
  const e = { kind: "player", body: "lizardWizard", mods: {} }, g = { kind: "player", body: "fatCat", mods: {} };
  ok(near(sim.windupOf(e, "fireMagic"), 0.8 * 0.7) && near(sim.windupOf(e, "spear"), 0.5), "Lizard Wizard: spells wind up 30% faster, melee unchanged");
  ok(near(sim.cooldownOf(e, "firebomb"), 9 * 0.7) && near(sim.cooldownOf(g, "firebomb"), 9), "…and spell actions recharge faster");
  const px = { kind: "player", body: "pennyPixie", mods: {} };
  ok(near(sim.windupOf(px, "greatsword"), 1.1 * 0.7), "Penny-Pinching Pixie: melee 30% faster");
}
{
  // foe parity: a foe's deck slots = its level; its body passive works for it too
  const { S } = arena([P("fatCat")]);
  const t1 = foeAt(S, "troll", 0, 0, 1), t3 = foeAt(S, "troll", 0, 0, 3);
  ok(t1.deck.length === 1 && t3.deck.length === 3 && t3.maxHp > t1.maxHp, "a foe uses as many deck cards as its level");
  const fc = foeAt(S, "fatCat", 5, 5, 1);
  sim.damage(S, fc, 1, sim.playerOf(S, "a"), "test");
  ok(S.ents.some((u) => u.kind === "unit" && u.owner === fc.id), "a Fat Cat foe summons rats when hit too");
}

// ---------------------------------------------------------------- floors, stairs, boss
{
  const S = run([P("fatCat")], 21);
  ok(S.stairs && S.floor.rooms.at(-1).kind === "stairs", "floor 1 ends in a stairs room");
  ok(S.items.filter((i) => i.kind === "card").length === FLOORS[0].loot, "loot lies on the floor");
  const e = sim.playerOf(S, "a");
  ok(!sim.descend(S, "a"), "no descending from away from the stairs");
  e.x = S.stairs.x; e.y = S.stairs.y; e.hp = 3; e.rage = 4;
  ok(sim.descend(S, "a") && S.floorN === 1 && e.hp === e.maxHp && e.rage === 0, "the stairs: next floor, full health, per-floor buffs reset");
  ok(Math.hypot(e.x - S.floor.start.x, e.y - S.floor.start.y) < 1.5, "…arriving at the new floor's start");
  // walk an item: picking up
  const it = S.items[0]; e.x = it.x; e.y = it.y; sim.step(S);
  ok(e.bag.includes(it.key) && !S.items.includes(it), "walking over a card picks it up");
}
{
  const S = run([P("fatCat")], 22);
  const e = sim.playerOf(S, "a");
  for (let n = 0; n < FLOORS.length - 1; n++) { e.x = S.stairs.x; e.y = S.stairs.y; sim.descend(S, "a"); }
  ok(S.floorN === FLOORS.length - 1 && !S.stairs && S.floor.rooms.at(-1).kind === "boss", "the last floor is the boss den (no stairs)");
  const boss = S.ents.find((o) => o.foe === "minotaur");
  ok(boss && boss.level === FLOORS.at(-1).bossLevel && boss.deck.length === 6, "the Minotaur: level 6, six deck cards");
  const br = S.floor.rooms.at(-1); e.x = br.cx - 3; e.y = br.cy; sim.step(S);
  ok(S.locked.size > 0 && boss.awake, "entering the den seals it and wakes the boss");
  sim.damage(S, boss, Math.ceil(boss.maxHp * 0.55), e, "test");
  ok(S.ents.filter((o) => o.foe === "mouse" && o.awake).length >= 3, "at half health it calls its pack");
  sim.damage(S, boss, 9999, e, "test");
  ok(S.phase === "won", "boss down = the dungeon is cleared");
}
{
  // a dropped body: wear it to take its passive; yours is left on the floor
  const { S } = arena([P("fatCat")]);
  const e = sim.playerOf(S, "a");
  S.items.push({ id: 9999, kind: "body", key: "vengefulVampire", x: e.x, y: e.y });
  ok(sim.itemUnder(S, e)?.id === 9999, "standing on a body");
  ok(sim.wearItem(S, "a", 9999) && e.body === "vengefulVampire" && S.items.find((i) => i.id === 9999).key === "fatCat", "Wear: you take its passive, it takes your old body");
  ok(e.maxHp === T.baseHp + 8 || e.maxHp === sim.statsFor(e).maxHp, "wearing a body doesn't change your stats (only the passive)");
}

// ---------------------------------------------------------------- review regressions
{
  // swapping deck cards in and out must never heal (wounds deeper than the new max wait as a debt)
  const S = run([P("fatCat", { deck: ["vigor"] })]);
  const e = sim.playerOf(S, "a"); e.bag.push("tiny");
  e.hp = 2;
  const wounds0 = e.maxHp - e.hp;
  sim.unequip(S, "a", "deck", 0);
  sim.equip(S, "a", e.bag.indexOf("tiny"));
  ok(e.hp === 1 && !e.dead, "a loadout change never downs you");
  sim.unequip(S, "a", "deck", 0);
  sim.equip(S, "a", e.bag.indexOf("vigor"));
  ok(e.maxHp - e.hp === wounds0, `swapping cards back keeps every wound (${e.hp}/${e.maxHp})`);
}
{
  // a card lying beside a body never hides the Wear button
  const { S } = arena([P("fatCat")]);
  const e = sim.playerOf(S, "a"); e.bag = Array(T.bagMax).fill("vigor");
  S.items.push({ id: 801, kind: "card", key: "swift", x: e.x + 0.3, y: e.y }, { id: 802, kind: "body", key: "medusa", x: e.x - 0.3, y: e.y });
  ok(sim.itemUnder(S, e)?.id === 802, "the body is found even with a card closer in the list");
}

// ---------------------------------------------------------------- co-op
{
  const S = run([P("fatCat"), { ...P("royalRat"), id: "b" }], 31);
  const a = sim.playerOf(S, "a");
  const fr = S.floor.rooms[1];
  const n1 = S.rooms[1].foes.length;
  a.x = fr.cx; a.y = fr.cy; sim.step(S);
  ok(S.rooms[1].foes.length === n1 + 1, "a party of 2 wakes one extra foe");
  const f = S.ents.find((o) => o.id === S.rooms[1].foes[0]);
  ok(f.maxHp > sim.statsFor(f).maxHp, "…and the room's foes are tougher");
  // down, not out
  const b = sim.playerOf(S, "b");
  sim.damage(S, b, 999, f, "test");
  ok(b.dead && S.phase === "play", "one player down ≠ the run lost");
  b.x = a.x + 0.5; b.y = a.y;
  steps(S, T.reviveTime + 0.1);
  ok(!b.dead, "a friend standing beside you stands you up");
  sim.damage(S, a, 999, f, "test"); sim.damage(S, b, 999, f, "test");
  ok(S.phase === "lost", "everyone down = lost");
}
{
  // the wire: a phone's mirror carries loadouts, bag, items; a new floor resends the floor
  const S = run([P("lizardWizard")], 41);
  const cur = { fxN: 0, seen: new Uint8Array(S.seen), floorN: S.floorN };
  const M = mirrorFrom(JSON.parse(JSON.stringify(initFor(S, "a"))));
  const snap = JSON.parse(JSON.stringify(snapFor(S, "a", cur)));
  applySnap(M, snap, sim.playerOf(S, "a").pub, 0);
  const me = M.ents.find((e) => e.kind === "player");
  ok(me.weapon === "fireMagic" && me.actions.length === 2 && me.deck.length === 1 && Array.isArray(me.bag), "the wire carries your loadout and bag");
  ok(M.items.length === S.items.length && M.stairs, "…the floor's items and stairs");
  ok(!JSON.stringify(snap).includes('"pid":"a"'), "…and never the seat id");
  const e = sim.playerOf(S, "a"); e.x = S.stairs.x; e.y = S.stairs.y; sim.descend(S, "a");
  ok(snapFor(S, "a", cur).t === "init", "a new floor sends a fresh init");
  // a shove is the server's to move
  e.kb = { vx: 5, vy: 0 }; const x0 = e.x;
  sim.netMove(S, "a", { x: e.x + 0.3, y: e.y, fs: e.forceSeq });
  ok(e.x === x0, "a phone can't walk out of a shove");
  e.kb = null; const fs = e.forceSeq;
  sim.netMove(S, "a", { x: e.x + 30, y: e.y, fs });
  ok(e.forceSeq !== fs && Math.abs(e.x - x0) < 2, "a teleport report is clamped and snaps the phone back");
}

// ---------------------------------------------------------------- the test pilot: whole dives, no stalls
{
  for (const [bodies, seed] of [[["goldenGolem"], 1], [["vengefulVampire"], 2], [["auditAngel", "fatCat"], 3], [["royalRat", "lizardWizard", "medusa", "bondBehemoth"], 4]]) {
    const ps = bodies.map((b, i) => ({ ...P(b), id: `p${i}` }));
    const S = run(ps, 900 + seed); const mem = ps.map(() => ({})); const next = ps.map(() => 0);
    while (S.phase === "play" && S.t < 1200) {
      ps.forEach((p, i) => {
        if (S.t < next[i]) return; next[i] = S.t + 0.25;
        const d = botThink(S, p.id, mem[i]); sim.setMove(S, p.id, d.move[0], d.move[1]);
        if (d.equip >= 0) sim.equip(S, p.id, d.equip);
        if (d.cast) sim.play(S, p.id, d.cast.slot, d.cast.aim);
        if (d.descend) sim.descend(S, p.id);
      });
      sim.step(S);
    }
    ok(S.phase !== "play", `pilot dive [${bodies.join(", ")}] ends (${S.phase} on floor ${S.floorN + 1}, ${Math.round(S.t)}s) — no stall`);
  }
}

console.log(fail ? `❌ RPG FAILED — ${fail} failed, ${pass} passed` : `✅ RPG ALL PASS — ${pass} passed`);
process.exit(fail ? 1 : 0);
