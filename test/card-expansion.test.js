import * as G from "../game.js";

let pass = 0, fail = 0;
const ok = (v, label) => { if (v) pass++; else { fail++; console.error("FAIL", label); } };
const eq = (a, b, label) => ok(a === b, `${label} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

function rig(keys = [], laneCount = 2) {
  const room = G.newRoom("EXP");
  const player = G.addPlayer(room, "p", "P");
  G.wearBody(player, "rookie");
  player.maxHp = player.hp = 100; player.lane = 0; player.depth = 0; player.autoFire = false;
  player.cards = G.mintCards(keys); player.hand = [...player.cards]; player.deck = []; player.disc = []; player.inPlay = [];
  player.moxie = 99; player.targetId = null;
  room.phase = "playing"; room.laneCount = laneCount; room.lanes = Array.from({ length: laneCount }, () => []);
  room.allies = Array.from({ length: laneCount }, () => []); room.defeated = { hero: 0, foe: 0 };
  return { room, player };
}
function foe(room, lane, hp = 100) {
  const f = G.spawnEnemy("rookie", []); f.hp = f.maxHp = hp; f.queue = []; f.lane = lane; room.lanes[lane].push(f); return f;
}
function cast(room, player, key, pick = null) {
  player.moxie = 99;
  const card = player.hand.find((c) => c.key === key);
  ok(!!card, `${key} is available to cast`);
  return card ? G.playCard(room, player, card.id, pick) : false;
}
function tickCardTimers(room, source, n = 60) { for (let i = 0; i < n; i++) G.tickTimers(room, source, source.lane); }

const authored = {
  oBile: [3, 1], oEarth: [5, 1], oAstralFist: [8, 1], oFlameOrbs: [9, 1], oLeechstorm: [7, 1], oStudy: [1, 1],
  oMiasmicWave: [7, 2], oTornado: [5, 2], oTsunami: [8, 2], oLightningLance: [4, 2], oHolyLance: [5, 3],
  oLifedrain: [6, 4], oHex: [2, 2], oFlameSteps: [8, 3], oFlameStrike: [7, 4], oArcaneStorm: [6, 3],
  oEarthquake: [9, 3], oDoomWhisper: [1, 3], dGrit: [2, 1], oRedVial: [1, 1], oMediumRedVial: [3, 1],
  oMassiveRedVial: [8, 1], dBloodIron: [10, 1], oTranscend: [10, 2], dSawShield: [3, 2], dPatience: [8, 2],
  oPetRats: [3, 1], oIceling: [3, 1], oFireling: [3, 1], oEarthling: [3, 1], oLightling: [3, 1],
  oRatKing: [8, 2], oJarSlime: [8, 2], oSplitter: [9, 2], oBloodMoonOni: [9, 2], oDivineTreasure: [10, 5],
};
for (const [key, [cost, value]] of Object.entries(authored)) {
  eq(G.KIT[key]?.cost, cost, `${key} keeps its authored moxie cost`);
  eq(G.itemTreasure(key), value, `${key} keeps its authored treasure value`);
  ok(G.PLAYER_POOL.includes(key), `${key} is live in the player pool`);
}
ok(!G.KIT.oPileOn && !G.PLAYER_POOL.includes("oPileOn"), "Pile On is removed");
ok(!G.KIT.oAcid && !G.PLAYER_POOL.includes("oAcid"), "Acid is replaced by Bile");

// Summon cards carry their whole combat contract in player-facing copy. This table intentionally
// checks mechanics rather than exact prose so wording may improve without silently dropping a fact.
const summonCopyFacts = {
  oHedgeKnight: ["5 HP", "1 less damage", "1 moxie per second", "3 moxie", "deals 2", "front foe"],
  oEarthElemental: ["8 HP", "1 moxie per second", "5 moxie", "deals 2", "heals itself 2"],
  oLavaElemental: ["10 HP", "1 moxie per second", "5 moxie", "deals 3", "every foe in its lane"],
  oGrandSpirit: ["Attacker: 18 HP", "Caster: 16 HP", "Tank: 20 HP", "3 moxie", "6 moxie", "gains 3 shield"],
  oCrimsonCrown: ["remains in play", "Every 6 seconds", "take 1 damage", "2 rats", "1 HP", "3-moxie Bite"],
  oPetRats: ["2 rats", "1 HP", "shared-HP stack", "3-moxie Bite", "living rat count"],
  oIceling: ["1 HP", "3 moxie", "deals 1", "front foe fallback", "damage by 1 for 6 seconds"],
  oFireling: ["1 HP", "3 moxie", "deals 1", "every foe in its lane"],
  oEarthling: ["3 HP", "3 moxie", "gains 1 shield"],
  oLightling: ["1 HP", "3 moxie", "lowest-health ally for 2", "excess healing becomes shield"],
  oRatKing: ["6 HP", "summons 1 rat whenever damaged", "3 moxie", "current HP", "summons 2 rats"],
  oJarSlime: ["3 HP", "at most 1 damage per hit", "cannot heal or gain shield", "3 moxie", "every foe in its lane"],
  oSplitter: ["8 HP", "3 moxie", "3 ranged damage", "excess damage onward", "+1 ranged damage"],
  oBloodMoonOni: ["6 HP", "6 moxie", "deals 6", "same lane after 6 seconds", "summoner lives"],
  oDivineTreasure: ["remains in play", "every 6 seconds", "exact 10 moxie", "HP equal", "normal cost and targeting"],
};
for (const [key, facts] of Object.entries(summonCopyFacts)) {
  const text = G.KIT[key]?.text ?? "";
  for (const fact of facts) ok(text.includes(fact), `${key} copy states ${fact}`);
  ok(text.includes("leaves combat circulation until the fight ends"), `${key} explains combat circulation`);
  ok(key === "oCrimsonCrown" || key === "oDivineTreasure" || text.includes("just in front of or behind you"),
    `${key} explains summon depth placement`);
}
for (const fact of ["aimed foe's lane", "every 6 seconds", "foes entering", "moves to an adjacent lane", "returns to the lane it left"])
  ok(G.KIT.oTornado.text.includes(fact), `Tornado copy states ${fact}`);
eq(G.cardPick("oTsunami").options.map((o) => o.key).join(","), "left,reverse,right",
  "Tsunami direction choices are laid out spatially: left, neutral reverse, right");
for (const fact of ["every foe in your aimed foe's lane", "Every 6 seconds", "1 plus your ranged bonus", "heals you", "Leeches stack", "combat ends"])
  ok(G.KIT.oLeechstorm.text.includes(fact), `Leechstorm copy states ${fact}`);

// Aimed lane, never caster lane.
{
  const { room, player } = rig(["oMiasmicWave", "oLeechstorm"]); player.rangedBonus = 2;
  const home = foe(room, 0), a = foe(room, 1), b = foe(room, 1); player.targetId = a.id;
  cast(room, player, "oMiasmicWave");
  eq(home.poison ?? 0, 0, "Miasmic Wave leaves the caster lane alone");
  eq(a.poison, 5, "Miasmic Wave poisons the aimed lane"); eq(b.poison, 5, "Miasmic Wave poisons every aimed-lane foe");
  cast(room, player, "oLeechstorm"); eq(a.leeches.length, 1, "Leechstorm attaches in aimed lane"); eq(b.leeches.length, 1, "Leechstorm attaches to every aimed-lane foe");
}

// Hex, overflow, and Holy Lance path healing.
{
  const { room, player } = rig(["oHex", "oLightningLance", "oHolyLance"]); player.rangedBonus = 2;
  const primary = foe(room, 1, 20), other = foe(room, 1, 20); player.targetId = primary.id;
  cast(room, player, "oHex"); const before = primary.hp; G.damageEnemy(room, 1, primary, 2, player);
  eq(before - primary.hp, 5, "Hex adds 1+ranged damage from an independent source");
  primary.hp = 2; primary.maxHp = 2; other.hp = other.maxHp = 20; player.rangedBonus = 0;
  const random = Math.random; try { Math.random = () => 0; cast(room, player, "oLightningLance"); } finally { Math.random = random; }
  eq(other.maxHp - other.hp, 2, "Lightning Lance sends only excess damage to another target");
  const ally = G.spawnEnemy("rat", []); ally.side = "hero"; ally.lane = 1; ally.hp = 1; ally.maxHp = 5; room.allies[1].push(ally);
  const holyTarget = foe(room, 1, 20); player.targetId = holyTarget.id; cast(room, player, "oHolyLance");
  eq(ally.hp, 4, "Holy Lance heals allies in the target lane for damage dealt");
}

// Delayed cards snapshot the authored lane/target at cast time.
{
  const { room, player } = rig(["oFlameStrike"], 2);
  const original = foe(room, 1, 100), decoy = foe(room, 0, 100); player.targetId = original.id;
  cast(room, player, "oFlameStrike"); const afterInitial = original.hp; player.targetId = decoy.id; tickCardTimers(room, player);
  eq(afterInitial - original.hp, 4, "Flame Strike repeats in its captured aimed lane");
}
{
  const { room, player } = rig(["oEarthquake"], 2); const original = foe(room, 1, 100), decoy = foe(room, 0, 100); player.targetId = original.id;
  cast(room, player, "oEarthquake"); const afterQuake = original.hp; player.targetId = decoy.id;
  tickCardTimers(room, player); eq(afterQuake - original.hp, 2, "Earthquake's first repeat grows to 2");
  const afterSecond = original.hp; tickCardTimers(room, player); eq(afterSecond - original.hp, 3, "Earthquake grows by 1 each repeat");
}
{
  const { room, player } = rig(["oDoomWhisper"], 2); const original = foe(room, 1, 100), decoy = foe(room, 0, 100); player.targetId = original.id;
  cast(room, player, "oDoomWhisper"); player.targetId = decoy.id; const old = original.hp; tickCardTimers(room, player);
  eq(old - original.hp, 2, "Doom Whisper retains its original target"); eq(decoy.maxHp - decoy.hp, 0, "Doom Whisper does not follow a later reticle");
}

// Tsunami's explicit choice moves the aimed lane, and Transcend uses post-heal HP.
{
  const { room, player } = rig(["oTsunami", "oTranscend"], 3); const target = foe(room, 1, 100); player.targetId = target.id;
  cast(room, player, "oTsunami", "left"); ok(room.lanes[0].includes(target) && room.lanes[1].length === 0, "Tsunami moves every surviving target-lane foe left");
  player.hp = 40; cast(room, player, "oTranscend", "ranged"); eq(player.hp, 100, "Transcend restores full health"); eq(player.rangedBonus, 20, "Transcend gains +1 per 5 post-heal HP");
}

// Defensive/sustain batch.
{
  const { room, player } = rig(["dGrit", "oMediumRedVial", "dSawShield", "dPatience"]); const target = foe(room, 0, 100); player.targetId = target.id;
  cast(room, player, "dGrit"); eq(player.shield, 1, "Grit grants 1 shield"); eq(G.buffAmt(player, "stoneskin"), 1, "Grit grants 1 DR for six seconds");
  player.hp = 50; cast(room, player, "oMediumRedVial"); eq(player.hp, 54, "Medium Red Vial heals 4");
  cast(room, player, "dSawShield"); eq(player.shield, 4, "Saw Shield adds 3 shield"); eq(target.maxHp - target.hp, 1, "Saw Shield deals 1 to its aimed target");
  cast(room, player, "dPatience"); eq(player.shield, 12, "Patience grants 8 shield"); eq(G.meleeBonusOf(player), 2, "Patience grants +2 melee"); eq(G.rangedBonusOf(player), 2, "Patience grants +2 ranged");
}

// Summon cards leave circulation, while summon innate cards remain reusable.
{
  const { room, player } = rig(["oPetRats"]); foe(room, 0, 100); const id = player.hand[0].id;
  cast(room, player, "oPetRats"); eq(room.allies[0][0]?.hp, 2, "Pet Rats summons two rats into one merged entity");
  ok(player.inPlay.some((c) => c.id === id) && !player.disc.some((c) => c.id === id), "summon card exhausts from combat circulation");
  const king = G.spawnEnemy("ratKing", []); king.side = "hero"; king.lane = 0; king.moxie = 99; room.allies[0].push(king);
  eq(king.queue.length, 1, "Rat King has one innate action"); G.foeCast(room, king); eq(king.queue.length, 1, "Rat King's summon-bearing innate action remains reusable");
}

// Jar Slime constraints and on-damaged splash.
{
  const { room, player } = rig(["oJarSlime"]); const target = foe(room, 0, 100);
  G.wearBody(player, "leverage"); player.levelAllocation = { ...G.emptyLevelAllocation(), mastery: 1 };
  cast(room, player, "oJarSlime");
  const jar = room.allies[0].find((t) => t.bodyKey === "jarSlime");
  eq(jar.shield ?? 0, 0, "Royal Rat's summon-cost Mastery cannot bypass Jar Slime's no-shield rule");
  G.resolveOps(room, jar, [{ do: "shield", amount: 9 }, { do: "healSelf", amount: 9 }]); eq(jar.shield ?? 0, 0, "Jar Slime cannot gain shield");
  const hp = jar.hp; G.hurtAllyToken(room, 0, jar, 10, target); eq(hp - jar.hp, 1, "Jar Slime takes at most 1 damage"); eq(target.maxHp - target.hp, 1, "Jar Slime splashes its lane when damaged");
}

// Shared expansion verbs stay symmetric for foe-held copies.
{
  const { room, player } = rig([]); player.lane = 1; player.hp = player.maxHp = 100;
  const ally = G.spawnEnemy("rat", []); ally.side = "hero"; ally.lane = 1; room.allies[1].push(ally);
  const caster = G.spawnEnemy("rookie", ["oMiasmicWave", "oPetRats"]);
  caster.queue = G.mintCards(["oMiasmicWave", "oPetRats"]);
  caster.side = "foe"; caster.lane = 1; caster.rangedBonus = 2; caster.moxie = 99; room.lanes[1].push(caster);
  G.foeCast(room, caster); eq(player.poison, 5, "foe Miasmic Wave poisons the hero in its lane"); eq(ally.poison, 5, "foe Miasmic Wave poisons friendly summons too");
  caster.moxie = 99; G.foeCast(room, caster); eq(caster.queue.length, 1, "foe summon card leaves its queue after one cast");
  ok(room.lanes[1].some((t) => t.bodyKey === "rat"), "foe Pet Rats creates a hostile merged rat stack");
  caster.hp = 40; caster.maxHp = 100; G.resolveOps(room, caster, G.KIT.dBloodIron.ops, null, 0, null, "dBloodIron");
  eq(caster.shield, 60, "foe Blood To Iron uses the same missing-health shield calculation");
}

// Divine Treasure spends an exact 10-moxie partition; Blood-Moon Oni returns while its summoner lives.
{
  const { room, player } = rig(["oDivineTreasure", "oBloodMoonOni"]); foe(room, 0, 100);
  cast(room, player, "oDivineTreasure"); const animated = room.allies.flat().filter((t) => t.bodyKey === "itemEntity");
  eq(animated.reduce((n, t) => n + G.cardCost(t.equipment[0].key), 0), 10, "Divine Treasure summons exactly 10 moxie of weapons");
  ok(animated.every((t) => t.maxHp === G.cardCost(t.equipment[0].key)), "animated weapon HP equals its card cost");
  cast(room, player, "oBloodMoonOni"); const oni = room.allies.flat().find((t) => t.bodyKey === "bloodMoonOni"); ok(!!oni, "Blood-Moon Oni is summoned");
  G.hurtAllyToken(room, oni.lane, oni, 99, room.lanes[0][0]); ok(!room.allies.flat().includes(oni), "defeated Oni leaves the board");
  for (let i = 0; i < 60; i++) G.simulateTick(room);
  ok(room.allies.flat().some((t) => t.bodyKey === "bloodMoonOni"), "Oni resummons six seconds later while its summoner lives");
}

// Player Tornado belongs to the hero side and strikes foes that enter its lane.
{
  const { room, player } = rig(["oTornado"], 2); player.rangedBonus = 2; const target = foe(room, 1, 100); player.targetId = target.id;
  cast(room, player, "oTornado"); eq(target.maxHp - target.hp, 3, "Tornado immediately deals 1+ranged to the aimed lane");
  const hazard = room.tornadoes[0]; eq(hazard.side, "hero", "player Tornado is hero-owned");
  room.lanes[1].splice(room.lanes[1].indexOf(target), 1); room.lanes[0].push(target); target.lane = 0; G.tickTornadoes(room);
  room.lanes[0].splice(room.lanes[0].indexOf(target), 1); room.lanes[1].push(target); target.lane = 1; const before = target.hp; G.tickTornadoes(room);
  eq(before - target.hp, 3, "Tornado damages a foe when it moves into the hazard lane");
}

console.log(fail ? `CARD EXPANSION FAIL — ${pass} passed, ${fail} failed` : `CARD EXPANSION PASS — ${pass} passed`);
if (fail) process.exit(1);
