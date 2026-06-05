// Deterministic unit tests for the King Mimic game logic. No server, no timing.
// Run: bun run test/game.test.js
import * as G from "../game.js";

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("❌ " + label); } };
const eq = (a, b, label) => ok(a === b, `${label} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

function playingRoom() {
  const r = G.newRoom("TEST");
  const p = G.addPlayer(r, "p1", "Tester");
  G.startLevel(r);
  G.beginCombat(r);
  return { r, p };
}

// ---- room / lobby ----------------------------------------------------------
{
  const r = G.newRoom("AAAA");
  eq(r.phase, "lobby", "new room is in lobby");
  eq(r.level, null, "no level until started");
  eq(r.caravan.hp, G.CARAVAN_MAX_HP, "caravan starts full");
}

// ---- player ----------------------------------------------------------------
{
  const r = G.newRoom("AAAA");
  const p = G.addPlayer(r, "p1", "X");
  eq(p.bodyKey, "rookie", "starts as rookie body");
  eq(p.hp, 8, "rookie HP 8");
  eq(p.inv.length, 3, "starts with 3 equipment");
  ok(p.alive, "starts alive");
}

// ---- level start / setup ---------------------------------------------------
{
  const r = G.newRoom("AAAA");
  G.addPlayer(r, "p1", "X");
  G.startLevel(r);
  eq(r.phase, "setup", "startLevel → setup (pre-combat positioning)");
  eq(r.level.nodes.length, 7, "level has 7 nodes");
  eq(r.level.currentId, "n0", "start at n0");
  const foes = r.lanes.reduce((n, l) => n + l.length, 0);
  eq(foes, G.ROOM_SIZE, "combat room pre-filled with ROOM_SIZE foes");
  G.beginCombat(r);
  eq(r.phase, "playing", "beginCombat → playing");
}

// ---- item effects ----------------------------------------------------------
{
  const { r, p } = playingRoom();
  p.lane = 0;
  r.lanes = [[G.spawnEnemy("killionaire")], [], []]; // 13 HP front foe
  p.inv = [{ key: "fire", charge: G.KIT.fire.cd }];
  G.useItem(r, p, 0);
  eq(r.lanes[0][0].hp, 11, "fire deals 2 to front foe");
  eq(p.inv[0].charge, 0, "item resets to cooldown after use");

  r.lanes[0] = [G.spawnEnemy("killionaire")];
  p.inv = [{ key: "fireII", charge: G.KIT.fireII.cd }];
  G.useItem(r, p, 0);
  eq(r.lanes[0][0].hp, 9, "fireII deals 4");

  r.lanes[0] = [G.spawnEnemy("pixie"), G.spawnEnemy("pixie")];
  p.inv = [{ key: "lightning", charge: G.KIT.lightning.cd }];
  G.useItem(r, p, 0);
  ok(r.lanes[0].every((e) => e.hp === 4), "lightning hits whole lane for 1");

  r.lanes[0] = [G.spawnEnemy("pixie")];
  p.inv = [{ key: "fire", charge: 0 }]; // not ready
  G.useItem(r, p, 0);
  eq(r.lanes[0][0].hp, 5, "unready item does nothing");

  p.lane = 1; r.laneShield = [0, 0, 0];
  p.inv = [{ key: "wheelbarrow", charge: G.KIT.wheelbarrow.cd }];
  G.useItem(r, p, 0);
  eq(r.laneShield[1], 3, "wheelbarrow adds 3 to lane shield");

  r.caravan.hp = 10; p.inv = [{ key: "light", charge: G.KIT.light.cd }];
  G.useItem(r, p, 0);
  eq(r.caravan.hp, 13, "light heals caravan 3");
  r.caravan.hp = 19; p.inv = [{ key: "light", charge: G.KIT.light.cd }];
  G.useItem(r, p, 0);
  eq(r.caravan.hp, 20, "heal caps at max");
}

// ---- kill + mimic unlock ---------------------------------------------------
{
  const { r } = playingRoom();
  const e = G.spawnEnemy("pixie");
  r.lanes = [[e], [], []];
  G.damageEnemy(r, 0, e, 99);
  eq(r.lanes[0].length, 0, "dead foe removed from lane");
  ok(r.unlockedBodies.has("pixie"), "slain foe's body unlocks for the party");
}

// ---- enemy attacks: caravan vs defender vs shield ---------------------------
{
  const { r, p } = playingRoom();
  p.lane = 0; r.laneShield = [0, 0, 0];

  let e = G.spawnEnemy("pixie"); e.charge = G.BODIES.pixie.cd - 1;
  r.lanes = [[], [e], []]; // lane 1 undefended
  const cav = r.caravan.hp;
  G.simulateTick(r);
  eq(r.caravan.hp, cav - 1, "undefended lane: foe hits the caravan");

  p.lane = 2; e = G.spawnEnemy("pixie"); e.charge = G.BODIES.pixie.cd - 1;
  r.lanes = [[], [], [e]];
  const hp = p.hp;
  G.simulateTick(r);
  eq(p.hp, hp - 1, "defended lane: foe hits the player");

  p.lane = 2; r.laneShield = [0, 0, 5];
  e = G.spawnEnemy("killionaire"); e.charge = G.BODIES.killionaire.cd - 1;
  r.lanes = [[], [], [e]];
  const hp2 = p.hp;
  G.simulateTick(r);
  eq(r.laneShield[2], 1, "shield absorbs the hit (5 - 4)");
  eq(p.hp, hp2, "player behind shield takes no damage");
}

// ---- downed + auto-revive --------------------------------------------------
{
  const { r, p } = playingRoom();
  p.lane = 2; p.hp = 1;
  const e = G.spawnEnemy("killionaire"); e.charge = G.BODIES.killionaire.cd - 1;
  r.lanes = [[], [], [e]]; r.laneShield = [0, 0, 0];
  G.simulateTick(r);
  ok(!p.alive, "player downed at 0 HP");
  eq(p.downTimer, G.REVIVE_TICKS, "down timer armed");
  e.charge = 0; // keep it from firing again for a while
  for (let i = 0; i < G.REVIVE_TICKS; i++) G.simulateTick(r);
  ok(p.alive, "player auto-revives after REVIVE_TICKS");
  eq(p.hp, Math.round(p.maxHp / 2), "revives at half HP");
}

// ---- win / loss ------------------------------------------------------------
{
  const { r } = playingRoom();
  r.lanes = [[], [], []];
  G.simulateTick(r);
  eq(r.phase, "won", "clearing every foe → won");
  ok(!r.levelComplete, "clearing a non-boss room doesn't finish the level");
}
{
  const { r, p } = playingRoom();
  p.lane = 0; r.caravan.hp = 1;
  const e = G.spawnEnemy("pixie"); e.charge = G.BODIES.pixie.cd - 1;
  r.lanes = [[], [e], []]; // undefended
  G.simulateTick(r);
  eq(r.phase, "lost", "caravan reaching 0 → lost");
}

// ---- node advancement ------------------------------------------------------
{
  const { r } = playingRoom();
  ok(G.advanceLevel(r, "n1") === false, "cannot advance mid-combat");
  r.lanes = [[], [], []]; G.simulateTick(r); // → won
  ok(G.advanceLevel(r, "n5") === false, "cannot advance to a non-linked node");
  ok(G.advanceLevel(r, "n1") === true, "advance to a linked node succeeds");
  eq(r.level.currentId, "n1", "current node is now n1");
  ok(G.nodeById(r, "n0").cleared, "previous node marked cleared");
  eq(r.phase, "setup", "advancing drops into setup for the next room");
}

// ---- boss completes the level ---------------------------------------------
{
  const r = G.newRoom("AAAA");
  G.addPlayer(r, "p1", "X");
  G.startLevel(r);
  r.level.currentId = "n6"; // jump to boss
  G.enterRoom(r); G.beginCombat(r);
  r.lanes = [[], [], []];
  G.simulateTick(r);
  eq(r.phase, "won", "clearing the boss room → won");
  ok(r.levelComplete, "boss clear sets levelComplete");
  ok(G.nodeById(r, "n6").cleared, "boss node marked cleared");
  ok(G.advanceLevel(r, "n0") === false, "no advancing after the level is complete");
}

// ---- wearBody wound ratio --------------------------------------------------
{
  const p = { hp: 8, maxHp: 8 };
  G.wearBody(p, "killionaire");
  eq(p.maxHp, 13, "wearing Killionaire sets maxHp 13");
  eq(p.hp, 13, "full HP when not carrying wounds");
  p.hp = 6;
  G.wearBody(p, "pixie", true);
  eq(p.maxHp, 5, "wearing Pixie sets maxHp 5");
  eq(p.hp, Math.max(1, Math.round(5 * (6 / 13))), "wound % carries across body swap");
}

// ---- god mode (DEMO room) --------------------------------------------------
{
  const r = G.newRoom("DEMO");
  ok(r.god, "a room named DEMO enables god mode");
  const p = G.addPlayer(r, "p1", "X");
  eq(p.inv.length, G.KIT_POOL.length, "god player gets every item");
  ok(p.hp >= 999, "god player has huge HP");
  G.startLevel(r); G.beginCombat(r);
  const me = [...r.players.values()][0];
  ok(me.inv.every((it) => it.charge >= it.cd), "god items start fully charged (ready)");
  eq(r.caravan.hp, 999, "god caravan is huge");
  ok(r.unlockedBodies.size > 1, "god mode unlocks all bodies for swapping");
  me.lane = 0;
  r.lanes = [[G.spawnEnemy("killionaire")], [], []];
  G.useItem(r, me, me.inv.findIndex((it) => it.key === "fire"));
  eq(r.lanes[0][0].hp, 11, "god player fires immediately — no waiting on cooldowns");
  ok(G.newRoom("AAAA").god === false, "ordinary rooms are not god mode");
}

// ---- snapshot --------------------------------------------------------------
{
  const r = G.newRoom("AAAA");
  G.addPlayer(r, "p1", "X");
  let s = G.snapshot(r);
  eq(s.map, null, "lobby snapshot: map is null");
  eq(s.players.length, 1, "snapshot lists the player");
  ok(s.players[0].inv.every((it) => it.name && typeof it.text === "string"), "inv items carry name + text for tooltips");
  G.startLevel(r);
  s = G.snapshot(r);
  ok(s.map && s.map.nodes.length === 7, "started snapshot exposes the 7-node map");
  eq(s.map.currentId, "n0", "snapshot map currentId n0");
  eq(s.phase, "setup", "snapshot reflects setup phase");
}

// ---- summary ---------------------------------------------------------------
console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
