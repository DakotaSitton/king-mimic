// Deterministic unit tests for the King Mimic game logic. No server, no timing.
// Run: bun run test/game.test.js
import * as G from "../game.js";

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("❌ " + label); } };
const eq = (a, b, label) => ok(a === b, `${label} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

// Stock a specific foe directly (bypasses the random palette) — for deterministic tests.
function stockFoe(r, bodyKey, gear) { r.draftedFoes.push({ bodyKey, gear: gear || [] }); }

// Stock from the (random) palette until ante is met, then commit.
function stockAndBegin(r) {
  let guard = 0;
  while (G.anteCurrent(r) < r.anteRequired && guard++ < 60) G.addFoe(r, 0);
  G.commitStock(r);
}

function playingRoom() {
  const r = G.newRoom("TEST");
  const p = G.addPlayer(r, "p1", "Tester");
  G.startLevel(r);
  r.laneCount = 3;                  // resolver tests drive a 3-lane board (solo would be 1 lane)
  if (r.phase === "stock") stockAndBegin(r); // satisfy ante & skip into combat (builds 3 lanes)
  G.beginCombat(r);
  r.allies = [[], [], []];          // enterRoom sized side-arrays to the solo lane count; widen to 3
  r.laneShield = [0, 0, 0];
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
  eq(r.phase, "stock", "startLevel → foe-draft (stock) for an ordinary room");
  eq(r.level.nodes.length, 7, "level has 7 nodes");
  eq(r.level.currentId, "n0", "start at n0");
  stockAndBegin(r);
  eq(r.phase, "setup", "committing the stock → setup (positioning)");
  G.beginCombat(r);
  eq(r.phase, "playing", "beginCombat → playing");
}

// ---- item effects ----------------------------------------------------------
{
  const { r, p } = playingRoom();
  p.lane = 0;
  r.lanes = [[G.spawnEnemy("killionaire")], [], []]; // 13 HP front foe
  p.inv = [{ key: "sword", charge: G.KIT.sword.cd }];
  G.useItem(r, p, 0);
  eq(r.lanes[0][0].hp, 10, "Sword deals 3 to the front foe");
  eq(p.inv[0].charge, 0, "item resets to cooldown after use");

  r.lanes[0] = [G.spawnEnemy("killionaire")];
  p.inv = [{ key: "gavel", charge: G.KIT.gavel.cd }];
  G.useItem(r, p, 0);
  eq(r.lanes[0][0].hp, 6, "Gavel deals 7 to the front foe");

  r.lanes[0] = [G.spawnEnemy("pixie"), G.spawnEnemy("pixie")];
  p.inv = [{ key: "lightning", charge: G.KIT.lightning.cd }];
  G.useItem(r, p, 0);
  ok(r.lanes[0].every((e) => e.hp === 3), "Lightning hits the whole lane for 2");

  r.lanes[0] = [G.spawnEnemy("pixie")];
  p.inv = [{ key: "sword", charge: 0 }]; // not ready
  G.useItem(r, p, 0);
  eq(r.lanes[0][0].hp, 5, "unready item does nothing");

  p.lane = 1; r.laneShield = [0, 0, 0];
  p.inv = [{ key: "shield", charge: G.KIT.shield.cd }];
  G.useItem(r, p, 0);
  eq(r.laneShield[1], 4, "Shield adds 4 to the lane shield");

  p.maxHp = 12; p.hp = 5;
  p.inv = [{ key: "heal", charge: G.KIT.heal.cd }];
  G.useItem(r, p, 0);
  eq(p.hp, 9, "Heal restores 4 to yourself");
  p.hp = 11; p.inv = [{ key: "heal", charge: G.KIT.heal.cd }];
  G.useItem(r, p, 0);
  eq(p.hp, 12, "Heal caps at your max HP");
}

// ---- targeting (Bow / Fire / Wind / Cold act on your aimed foe) -------------
{
  const { r, p } = playingRoom();
  p.lane = 0;
  const a = G.spawnEnemy("killionaire"), b = G.spawnEnemy("killionaire");
  r.lanes = [[a], [b], []]; // a in my lane, b in another lane

  // Bow with no target → falls back to front of my lane (a)
  p.inv = [{ key: "bow", charge: G.KIT.bow.cd }];
  G.useItem(r, p, 0);
  eq(a.hp, 10, "Bow with no aim hits the front of your lane");

  // aim at b (another lane), then Bow hits b — proving ranged targeting
  G.setTarget(r, p, b.id);
  p.inv = [{ key: "bow", charge: G.KIT.bow.cd }];
  G.useItem(r, p, 0);
  eq(b.hp, 10, "Bow hits your aimed foe in another lane");

  // Cold: minor damage + delay (pushes the aimed foe's attack charge back)
  b.charge = 50;
  p.inv = [{ key: "cold", charge: G.KIT.cold.cd }];
  G.useItem(r, p, 0);
  eq(b.hp, 9, "Cold deals 1 to the aimed foe");
  eq(b.charge, 20, "Cold delays the aimed foe's attack by 30 ticks");

  // Wind: shove the aimed foe (b, lane 1) into the next lane (lane 2)
  p.inv = [{ key: "wind", charge: G.KIT.wind.cd }];
  G.useItem(r, p, 0);
  eq(r.lanes[1].length, 0, "Wind removes the foe from its lane");
  ok(r.lanes[2].includes(b), "Wind shoves it into the next lane");
}

// ---- targeting: default aim, Tab cycle, melee + lane follow the target ------
{
  const { r, p } = playingRoom();
  p.lane = 0;
  const a = G.spawnEnemy("rat"), b = G.spawnEnemy("rat"), c = G.spawnEnemy("rat");
  r.lanes = [[a], [b], [c]];
  G.ensureTarget(r, p);
  eq(p.targetId, a.id, "default aim = a foe in your own lane");
  G.cycleTarget(r, p, 1); eq(p.targetId, b.id, "Tab cycles to the next foe");
  G.cycleTarget(r, p, 1); eq(p.targetId, c.id, "…and the next");
  G.cycleTarget(r, p, 1); eq(p.targetId, a.id, "…looping around");
  G.cycleTarget(r, p, -1); eq(p.targetId, c.id, "Shift+Tab cycles backward");

  // melee (front) follows the TARGET's lane, not where you're standing
  G.setTarget(r, p, c.id);            // aim at lane 2
  p.inv = [{ key: "sword", charge: G.KIT.sword.cd }];
  G.useItem(r, p, 0);
  ok(!r.lanes[2].includes(c), "Sword (melee) hits the front of your target's lane");
}
{
  // lane damage also follows your target's lane
  const { r, p } = playingRoom();
  p.lane = 0;
  r.lanes = [[], [G.spawnEnemy("pixie"), G.spawnEnemy("pixie")], []];
  G.setTarget(r, p, r.lanes[1][0].id);
  p.inv = [{ key: "lightning", charge: G.KIT.lightning.cd }];
  G.useItem(r, p, 0);
  ok(r.lanes[1].every((e) => e.hp === 3), "Lightning hits every foe in your target's lane (2 dmg)");
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

// ---- enemy attacks via ITEMS: caravan vs defender vs shield -----------------
// Foes have no base swing — they damage through the item they hold.
{
  const { r, p } = playingRoom();
  p.lane = 0; r.laneShield = [0, 0, 0];
  const armed = () => { const e = G.spawnEnemy("pixie", [{ key: "sword", cd: 10 }]); e.equipment[0].charge = 10; return e; };

  let e = armed();
  r.lanes = [[], [e], []]; // lane 1 undefended
  const cav = r.caravan.hp;
  G.simulateTick(r);
  eq(r.caravan.hp, cav - 3, "undefended lane: the foe's item hits the caravan for 3");

  p.lane = 2; e = armed();
  r.lanes = [[], [], [e]];
  const hp = p.hp;
  G.simulateTick(r);
  eq(p.hp, hp - 3, "defended lane: the foe's item hits the player");

  p.lane = 2; r.laneShield = [0, 0, 5];
  e = armed();
  r.lanes = [[], [], [e]];
  const hp2 = p.hp;
  G.simulateTick(r);
  eq(r.laneShield[2], 2, "shield absorbs the foe's item (5 - 3)");
  eq(p.hp, hp2, "player behind shield takes no damage");
}

// ---- downed: NO mid-combat revive (out until the room is cleared) ----------
{
  const { r, p } = playingRoom();
  p.lane = 2; p.hp = 1;
  const e = G.spawnEnemy("killionaire", [{ key: "sword", cd: 10 }]); e.equipment[0].charge = 10;
  r.lanes = [[], [], [e]]; r.laneShield = [0, 0, 0];
  G.simulateTick(r);
  ok(!p.alive, "player downed at 0 HP");
  e.equipment[0].cd = 99999; // stop it firing again so the room never clears
  for (let i = 0; i < 150; i++) G.simulateTick(r);
  ok(!p.alive, "stays down for the whole fight — no mid-combat revive");
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
  const e = G.spawnEnemy("pixie", [{ key: "sword", cd: 10 }]); e.equipment[0].charge = 10;
  r.lanes = [[], [e], []]; // undefended — its item hits the caravan
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
  eq(r.phase, "stock", "advancing into an ordinary room opens the foe-draft");
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
  eq(r.lanes[0][0].hp, 7, "god player fires immediately — Fire deals 6, no cooldown wait");
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
  eq(s.phase, "stock", "snapshot reflects the foe-draft (stock) phase");
}

// ---- symmetry: a foe wields equipment through the SAME resolver ------------
{
  const { r, p } = playingRoom();
  p.lane = 0; p.hp = 8; r.laneShield = [0, 0, 0];
  const e = G.spawnEnemy("pixie", [{ key: "bow", cd: 10 }]); // a pixie holding a Bow
  eq(e.side, "foe", "spawned foe is a combatant with side 'foe'");
  eq(e.equipment.length, 1, "foe carries its drafted item");
  e.charge = -999;                 // keep its body attack from firing this tick
  e.equipment[0].charge = 10;      // its Bow is charged
  r.lanes = [[e], [], []];
  G.simulateTick(r);
  eq(p.hp, 5, "foe's Bow deals 3 to the front hero (same resolver as players)");
  eq(e.equipment[0].charge, 0, "foe item goes on cooldown after firing");
}

// ---- resolver parity: player Sword deals 3 via the data-driven path ---------
{
  const { r, p } = playingRoom();
  p.lane = 0; r.lanes = [[G.spawnEnemy("killionaire")], [], []];
  p.inv = [{ key: "sword", charge: G.KIT.sword.cd }];
  G.useItem(r, p, 0);
  eq(r.lanes[0][0].hp, 10, "player Sword deals 3 through the shared resolver");
}

// ---- foe deal respects lane shield -----------------------------------------
{
  const { r, p } = playingRoom();
  p.lane = 0; p.hp = 8; r.laneShield = [5, 0, 0];
  const e = G.spawnEnemy("pixie", [{ key: "fire", cd: 10 }]); // Fire = deal 6
  e.charge = -999; e.equipment[0].charge = 10;
  r.lanes = [[e], [], []];
  G.simulateTick(r);
  eq(r.laneShield[0], 0, "foe Fire is absorbed by lane shield first (5 of 6)");
  eq(p.hp, 7, "only the 1 overflow damage reaches the shielded hero");
}

// ---- class select ----------------------------------------------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  const b = G.addPlayer(r, "p2", "B");
  G.startDraft(r);
  eq(r.phase, "draft", "startDraft → class-select phase");
  eq(a.classKey, null, "class select clears any prior choice");

  const classes = G.snapshot(r).draft.classes.map((c) => c.key);
  ok(classes.includes("warrior") && classes.includes("mage"), "all four classes are offered");
  ok(G.snapshot(r).draft.classes[0].kit.length === 3, "each class advertises a 3-card kit");

  G.chooseClass(r, a, "mage");
  eq(a.classKey, "mage", "class choice is recorded");
  eq(a.bodyKey, "mage", "player wears the class body immediately");
  eq(a.draftPicks.length, 3, "class grants a 3-card starter kit");
  eq(r.phase, "draft", "still selecting while a teammate hasn't chosen");

  G.chooseClass(r, b, "cleric");
  eq(r.phase, "stock", "level auto-starts into the foe-draft once everyone has chosen");
  eq(a.inv.length, 3, "class kit becomes the inventory");
  eq(a.inv[0].key, "fire", "mage kit leads with Fire");
  eq(a.maxHp, G.BODIES.mage.maxHp, "player has the mage body's HP (6)");
  eq(b.inv[0].key, "heal", "cleric kit leads with Heal");
}

// ---- the draft WHEEL: lock a low body+items bundle, exclusively -------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  const b = G.addPlayer(r, "p2", "B");
  G.startDraft(r);
  const d = G.snapshot(r).draft;
  ok(d.wheel.length >= r.players.size + 2, "the wheel offers at least players + 2 bundles");
  ok(d.wheel.every((x) => x.items.length === 3), "each bundle is a body + 3 items");
  ok(d.wheel.every((x) => G.DRAFT_BODIES.includes(x.bodyKey)), "wheel bodies come from the low-power draft pool");
  ok(d.wheel.every((x) => x.items.some((it) => G.KIT[it.key].ops?.some((o) => o.do === "deal"))),
    "every bundle has at least one damaging item (no dud loadouts)");
  const b0 = r.draftWheel[0].id, b1 = r.draftWheel[1].id;
  G.draftPick(r, a, b0);
  eq(a.bodyKey, r.draftWheel[0].bodyKey, "locking sets the player's chassis to the bundle body");
  eq(a.draftPicks.length, 3, "and grants the bundle's 3-item kit");
  ok(a.drafted, "the player is marked drafted");
  eq(r.phase, "draft", "still drafting while B hasn't locked");
  G.draftPick(r, b, b0);
  ok(!b.drafted, "a bundle locked by another player is off-limits (exclusive)");
  G.draftPick(r, b, b1);
  ok(b.drafted, "B locks a different bundle");
  eq(r.phase, "stock", "both locked → the run starts (first room's stock), 2 lanes for 2 players");
  eq(r.laneCount, 2, "lanes = the 2 drafters");
}

// ---- foe draft + ante gate -------------------------------------------------
// palette: 0 rat(1) · 1 royalRat(2) · 2 fatCat(3) · 3 pixie+bow(3) · 4 audit+lightning(6)
//          5 killionaire(7) · 6 killionaire+fire(10) · 7 fatCat+ratNest(5)
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  eq(r.phase, "stock", "ordinary room opens the foe-draft, not setup");

  const s0 = G.snapshot(r).stock;
  ok(s0.baselineCount >= 1, "the room arrives PRE-STOCKED with rank-and-file (≥1 per lane)");
  ok(s0.canBegin, "you can begin immediately — the baseline guarantees a fight");
  eq(s0.greedCount, 0, "no greedy picks added yet");
  eq(s0.palette.length, G.PALETTE_SLOTS, "you see 3 greedy choices at a time");
  ok(s0.palette.every((o) => o.gear.length === 1), "every offered greedy foe carries an item");
  ok(s0.palette.every((o) => o.lootValue >= 1 && o.bodyAnte >= 0), "each choice reports loot value AND body tier, decoupled");

  // picking a slot ADDS a greedy foe on top of the baseline and rolls a fresh choice in
  const before = r.draftedFoes.length;
  G.addFoe(r, 0);
  eq(r.draftedFoes.length, before + 1, "stocking adds a greedy foe");
  ok(r.draftedFoes[r.draftedFoes.length - 1].greedy, "the added foe is flagged greedy");
  ok(r.foePalette[0] && r.foePalette[0].bodyKey, "a new choice rolled into the slot");
  const s1 = G.snapshot(r).stock;
  ok(s1.greedCount === 1 && s1.greedTreasure >= 1, "greed forecasts ITEM loot Treasure (not body ante)");

  // baseline rank-and-file can't be removed; greedy picks can
  G.removeFoe(r, r.draftedFoes.findIndex((f) => !f.greedy));
  ok(r.draftedFoes.some((f) => !f.greedy), "rank-and-file can't be removed");
  G.removeFoe(r, r.draftedFoes.findIndex((f) => f.greedy));
  eq(G.snapshot(r).stock.greedCount, 0, "greedy picks can be removed");

  G.commitStock(r);
  eq(r.phase, "setup", "committing (no ante gate) → setup");
  ok(r.lanes.flat().length >= 1, "the baseline foes are placed into lanes");
}

// ---- round-robin fills lanes evenly, left→right→loop ----------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.laneCount = 3;                                           // 3-lane board (e.g. a 3-player party)
  r.draftedFoes = [];                                        // clear the baseline for a clean round-robin check
  for (let i = 0; i < 6; i++) stockFoe(r, "pixie", ["bow"]); // 6 foes
  G.commitStock(r);
  eq(r.lanes[0].length, 2, "lane 0 gets foes 0 & 3");
  eq(r.lanes[1].length, 2, "lane 1 gets foes 1 & 4");
  eq(r.lanes[2].length, 2, "lane 2 gets foes 2 & 5");
}

// ---- lanes = player count (1–4), boss/god floor at 3 -----------------------
{
  const mk = (n) => {
    const r = G.newRoom("AAAA");
    const ps = [];
    for (let i = 0; i < n; i++) ps.push(G.addPlayer(r, "p" + i, "P" + i));
    G.startDraft(r);
    for (const p of ps) G.chooseClass(r, p, "warrior"); // all chosen → startLevel → enterRoom
    return r;
  };
  eq(mk(1).laneCount, 1, "solo → 1 lane (pure player = lane)");
  eq(mk(2).laneCount, 2, "2 players → 2 lanes");
  eq(mk(3).laneCount, 3, "3 players → 3 lanes");
  eq(mk(4).laneCount, 4, "4 players → 4 lanes");
  const r4 = mk(4);
  eq(r4.lanes.length, 4, "lanes array sized to the count");
  eq(r4.allies.length, 4, "allies array sized to the count");
  eq(r4.laneShield.length, 4, "laneShield array sized to the count");
  // a 4-lane room fights to a real win (round-robin fill across 4 lanes resolves)
  G.commitStock(r4); G.beginCombat(r4);
  for (let i = 0; i < 4; i++) r4.lanes[i] = [];
  G.simulateTick(r4);
  eq(r4.phase, "won", "a 4-lane room clears like any other");
  // boss room floors at 3 lanes even solo — bosses are designed around 3 lanes, untouched
  const rb = G.newRoom("AAAA"); G.addPlayer(rb, "p1", "X"); G.startLevel(rb);
  rb.level.currentId = "n6"; G.enterRoom(rb);
  eq(rb.laneCount, 3, "a solo boss room keeps 3 lanes (boss code untouched)");
  ok(rb.lanes[1].some((e) => G.BODIES[e.bodyKey].boss), "the boss spawns in center lane 1");
  // god room also keeps the legacy 3-lane board
  const rg = G.newRoom("DEMO"); G.addPlayer(rg, "p1", "X"); G.startLevel(rg);
  eq(rg.laneCount, 3, "a god room keeps 3 lanes");
}

// ---- greedy-add: ONE per player, into that player's own lane, feeds V ------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  const b = G.addPlayer(r, "p2", "B");
  G.startDraft(r); G.chooseClass(r, a, "warrior"); G.chooseClass(r, b, "mage"); // 2 players → 2 lanes
  eq(r.phase, "stock", "two players → stock phase");
  eq(a.ownedLane, 0, "player A owns lane 0");
  eq(b.ownedLane, 1, "player B owns lane 1");
  // pin the palette so picks are deterministic
  r.foePalette = [{ bodyKey: "killionaire", gear: ["fire"] }, { bodyKey: "vampire", gear: ["lightning"] }, { bodyKey: "pixie", gear: ["bow"] }];
  ok(G.addGreedy(r, a, 0), "A invites a greedy body");
  ok(G.addGreedy(r, b, 1), "B invites a greedy body");
  G.addGreedy(r, a, 2);                                   // re-add → replaces A's pick (one per player)
  eq(r.draftedFoes.filter((f) => f.greedy && f.owner === a.id).length, 1, "only ONE greedy per player");
  eq(r.draftedFoes.filter((f) => f.greedy && f.owner === b.id).length, 1, "…each player has their own");
  // placement: each greedy sits in its owner's lane
  const ln = G.placedLanes(r);
  r.draftedFoes.forEach((f, i) => {
    if (f.greedy && f.owner === a.id) eq(ln[i], a.ownedLane, "A's greedy is placed in A's lane");
    if (f.greedy && f.owner === b.id) eq(ln[i], b.ownedLane, "B's greedy is placed in B's lane");
  });
  // remove only your own
  ok(G.removeGreedy(r, a), "A removes their greedy pick");
  eq(r.draftedFoes.filter((f) => f.greedy && f.owner === a.id).length, 0, "A's greedy is gone");
  ok(r.draftedFoes.some((f) => f.greedy && f.owner === b.id), "B's greedy is untouched");
  r.foePalette[0] = { bodyKey: "killionaire", gear: ["fire"] };  // re-pin (the slot re-rolled earlier)
  G.addGreedy(r, a, 0);                                   // A re-adds (killionaire, body 7 + fire 3)
  G.commitStock(r); G.beginCombat(r);
  ok(r.lanes[a.ownedLane].some((e) => e.bodyKey === "killionaire"), "A's greedy spawned in A's lane");
  ok(r.lanes[b.ownedLane].some((e) => e.bodyKey === "vampire"), "B's greedy spawned in B's lane");
  // V includes both greedy bodies + all loot items → both players credited equally
  for (let i = 0; i < r.laneCount; i++) r.lanes[i] = [];
  G.simulateTick(r);
  eq(a.treasure, b.treasure, "greedy adds raise EVERY player's income equally (mirrored)");
  ok(a.treasure > 0, "income was credited");
}

// ---- floors: the baseline pre-stock scales with the floor ------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");        // solo → 1 lane
  const base1 = G.snapshot(r).stock.baselineCount;
  ok(base1 >= 1, "floor 1 solo room pre-stocks a baseline of rank-and-file");
  r.floor = 3; G.enterRoom(r);
  ok(G.snapshot(r).stock.baselineCount > base1, "the baseline scales up with the floor");
  // party size also scales the baseline (per-lane pressure stays constant)
  const r3 = G.newRoom("AAAA");
  const x = G.addPlayer(r3, "x1", "X"), y = G.addPlayer(r3, "x2", "Y"), z = G.addPlayer(r3, "x3", "Z");
  G.startDraft(r3); G.chooseClass(r3, x, "warrior"); G.chooseClass(r3, y, "warrior"); G.chooseClass(r3, z, "warrior");
  ok(G.snapshot(r3).stock.baselineCount > base1, "a 3-player party faces a larger baseline than solo");
}
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.level.currentId = "n6"; G.enterRoom(r);   // jump to the boss
  G.beginCombat(r); r.lanes = [[], [], []]; G.simulateTick(r);
  ok(r.levelComplete, "boss cleared → level complete");
  eq(r.floor, 1, "still floor 1");
  ok(G.descend(r), "descend works after clearing the boss");
  eq(r.floor, 2, "descending advances the floor");
  eq(r.level.currentId, "n0", "a fresh map begins");
  eq(r.phase, "stock", "and you enter the first room of the new floor");
}

// ---- room enchantments: augment foes + sweeten loot ------------------------
{
  const foe = G.spawnEnemy("pixie"); // 5 HP, atk 1
  G.applyEnchantToFoe(foe, { foeHpBonus: 2, foeAtkBonus: 1, foeCdMul: 0.8 });
  eq(foe.maxHp, 7, "Fortified-style enchant adds HP");
  eq(foe.phys, 2, "Savage-style enchant adds physical power");
  eq(foe.cdMul, 0.8, "Hastened-style enchant speeds the foe's timer");
}
{
  const { r, p } = playingRoom();
  p.lane = 0; r.laneShield = [0, 0, 0];
  const e = G.spawnEnemy("rat"); e.cdMul = 0.5;           // rat attacks via its timer passive
  e.charge = Math.ceil(G.BODIES.rat.cd * 0.5) - 1;
  r.lanes = [[e], [], []];
  const hp = p.hp;
  G.simulateTick(r);
  eq(p.hp, hp - 1, "a hastened foe fires its timer on the shortened cd");
}
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.enchant = { rewardBonus: 1, bonusLoot: ["fire"] };    // override the random roll
  stockFoe(r, "pixie", ["bow"]); stockFoe(r, "killionaire", ["fire"]);
  G.commitStock(r); G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r);
  const loot = G.snapshot(r).loot;
  ok(loot.cards.some((c) => c.key === "fire"), "the enchant's bonus item is in the loot");
  ok(loot.cards.some((c) => c.key === "bow"), "alongside the foes' items");
}

// ---- summon passives: Royal Rat (timer) & Fat Cat (when hit) ----------------
{
  const { r } = playingRoom();
  const rr = G.spawnEnemy("royalRat");
  rr.charge = G.BODIES.royalRat.cd - 1; // about to complete its timer
  r.lanes = [[rr], [], []];
  G.simulateTick(r);
  eq(r.lanes[0].length, 2, "Royal Rat summons a rat when its timer completes");
  ok(r.lanes[0].some((e) => e.bodyKey === "rat"), "the summon is a rat");
}
{
  const { r, p } = playingRoom();
  p.lane = 0;
  const fc = G.spawnEnemy("fatCat"); // 4 HP
  r.lanes = [[fc], [], []];
  p.inv = [{ key: "sword", charge: G.KIT.sword.cd }]; // 3 dmg — it survives
  G.useItem(r, p, 0);
  ok(fc.hp > 0, "Fat Cat survives the hit");
  eq(r.lanes[0].length, 2, "Fat Cat summons a rat when it takes damage");
}

// ---- fragile items: one use per fight --------------------------------------
{
  const { r, p } = playingRoom();
  p.lane = 0;
  r.lanes = [[G.spawnEnemy("killionaire"), G.spawnEnemy("pixie")], [], []];
  p.inv = [{ key: "bomb", charge: G.KIT.bomb.cd }]; // 5 to the lane
  G.useItem(r, p, 0);
  eq(r.lanes[0].length, 1, "Bomb's lane damage clears the pixie");
  eq(r.lanes[0][0].hp, 8, "and chunks the killionaire (13-5)");
  ok(p.inv[0].spent, "Bomb is spent after one use (fragile)");
  p.inv[0].charge = G.KIT.bomb.cd;
  const before = r.lanes[0][0].hp;
  G.useItem(r, p, 0);
  eq(r.lanes[0][0].hp, before, "a spent fragile item can't fire again this fight");
}
{
  const { r } = playingRoom();
  const cat = G.spawnEnemy("fatCat", [{ key: "ratNest", cd: 5 }]);
  cat.charge = -999;               // keep its body timer quiet
  cat.equipment[0].charge = 5;     // Rat Nest ready
  r.lanes = [[cat], [], []];
  G.simulateTick(r);
  ok(r.lanes[0].length >= 3, "a foe's Rat Nest summons 2 rats");
  ok(cat.equipment[0].spent, "Rat Nest is spent (fragile) after firing");
}

// ---- deadlock guard: combat must always terminate --------------------------
// A downed party + a foe that can't damage the caravan (spent fragile, reactive-only
// passive) used to hang forever. With no living hero and no summons, it's a loss.
{
  const { r, p } = playingRoom();
  p.hp = 0; p.alive = false;                          // the whole party is down
  const mino = G.spawnEnemy("minotaur", [{ key: "bomb" }]);
  mino.equipment[0].spent = true;                     // its only weapon is used up
  r.lanes = [[mino], [], []];                         // a live but inert foe remains
  r.allies = [[], [], []];                            // no summons to carry the fight
  const caravanBefore = r.caravan.hp;
  G.simulateTick(r);
  eq(r.phase, "lost", "downed party + inert foe + no allies → loss (no infinite stall)");
  eq(r.caravan.hp, caravanBefore, "the caravan didn't have to fall first");
}
// …but a summoned ally can still carry the fight when the party is down.
{
  const { r, p } = playingRoom();
  p.hp = 0; p.alive = false;
  const mino = G.spawnEnemy("minotaur", [{ key: "bomb" }]);
  mino.hp = 1; mino.equipment[0].spent = true;
  r.lanes = [[mino], [], []];
  r.allies = [[G.spawnEnemy("rat")], [], []];         // a friendly rat lives on
  r.allies[0][0].side = "hero"; r.allies[0][0].charge = G.BODIES.rat.cd; // ready to swing
  G.simulateTick(r);
  ok(r.phase !== "lost", "a living ally keeps the room alive instead of forcing a loss");
}

// foes are never armed with fragile (one-shot) consumables — they'd go inert
{
  const pool = G.buildFoePool();
  ok(pool.every((f) => f.gear.every((k) => !G.KIT[k].fragile)),
    "buildFoePool never arms a foe with a fragile item");
}

// ---- anti-stall: a heal-locked fight always terminates (never hangs) -------
{
  // a healer the hero can't damage, that also can't threaten the caravan → pure equilibrium.
  // The stall guard resolves it as a loss at STALL_LIMIT — combat must ALWAYS terminate.
  const { r, p } = playingRoom();
  p.lane = 0; p.inv = [];                      // the hero does nothing
  r.lanes = [[G.spawnEnemy("greatsword")], [], []]; // greatsword heals itself, no gear → no caravan threat
  let ticks = 0;
  while (r.phase === "playing" && ticks < G.STALL_LIMIT + 50) { G.simulateTick(r); ticks++; }
  eq(r.phase, "lost", "a zero-progress fight resolves (anti-stall → loss), never hangs");
  ok(ticks >= G.STALL_LIMIT && ticks <= G.STALL_LIMIT + 5, "it resolves right at the stall limit");
  // a NORMAL fight is nowhere near the limit: a hero that kills the foe wins immediately
  const { r: r2, p: p2 } = playingRoom();
  p2.lane = 0; r2.lanes = [[G.spawnEnemy("pixie")], [], []];
  p2.inv = [{ key: "fire", charge: G.KIT.fire.cd }];
  G.useItem(r2, p2, 0); G.simulateTick(r2);
  eq(r2.phase, "won", "killing the foe wins at once — the stall guard never interferes with real play");
}

// ---- friendly summons: players summon allies that tank & fight --------------
{
  const { r, p } = playingRoom();
  p.lane = 1;
  p.inv = [{ key: "ratNest", charge: G.KIT.ratNest.cd }];
  G.useItem(r, p, 0);
  eq(r.allies[1].length, 2, "the player's Rat Nest summons 2 allies on their side");
  ok(r.allies[1].every((a) => a.side === "hero"), "summoned units are friendly");
}
{
  // a friendly unit blocks the foe's hit instead of the player
  const { r, p } = playingRoom();
  p.lane = 2; const hp = p.hp; r.laneShield = [0, 0, 0];
  const wall = G.spawnEnemy("rat"); wall.side = "hero";
  r.allies[2] = [wall];
  const e = G.spawnEnemy("killionaire", [{ key: "sword", cd: 10 }]); e.equipment[0].charge = 10;
  r.lanes = [[], [], [e]];
  G.simulateTick(r);
  eq(p.hp, hp, "the ally soaks the foe's item hit, the player is untouched");
  eq(r.allies[2].length, 0, "the 1-HP ally dies blocking");
}
{
  // a friendly unit attacks the front foe in its lane
  const { r } = playingRoom();
  const al = G.spawnEnemy("rat"); al.side = "hero"; al.charge = G.BODIES.rat.cd - 1;
  r.allies[0] = [al];
  const foe = G.spawnEnemy("killionaire");
  r.lanes = [[foe], [], []];
  G.simulateTick(r);
  eq(foe.hp, 12, "the friendly rat attacks the front foe for 1");
}

// ---- the wider bestiary: family passives are wired ------------------------
{
  // Fam 1 — a Vampire heals itself when it attacks
  const { r, p } = playingRoom();
  p.lane = 0; r.laneShield = [0, 0, 0];
  const v = G.spawnEnemy("vampire"); v.hp = 2; v.charge = G.BODIES.vampire.cd - 1;
  r.lanes = [[v], [], []];
  G.simulateTick(r);
  eq(v.hp, 4, "Vampire heals for its attack (2) when it strikes");
}
{
  // Fam 2 — an Intern Imp ramps on its OWN timer (decoupled from the body clock)
  const { r, p } = playingRoom();
  p.lane = 0; p.hp = 12; p.maxHp = 12; r.laneShield = [0, 0, 0];
  const imp = G.spawnEnemy("internImp"); imp.pcharge = { 0: G.BODIES.internImp.passive[0].every - 1 };
  r.lanes = [[imp], [], []];
  G.simulateTick(r);
  eq(imp.counters, 1, "Intern Imp ramps +1 on its own self-timer");
  // and the +1 boosts the damage of the item it holds
  const e = G.spawnEnemy("pixie", [{ key: "bow", cd: 10 }]); e.equipment[0].charge = 10; e.counters = 2;
  r.lanes = [[e], [], []]; r.laneShield = [0, 0, 0];
  const hp = p.hp;
  G.simulateTick(r);
  eq(p.hp, hp - 5, "a +2 foe's Bow hits for 3 + 2 = 5");
}
{
  // Fam 5 — an Accountant strikes back the instant it's hit
  const { r, p } = playingRoom();
  p.lane = 0; p.hp = 8; r.laneShield = [0, 0, 0];
  const acc = G.spawnEnemy("accountant"); // 3 HP, atk 1
  r.lanes = [[acc], [], []];
  p.inv = [{ key: "sword", charge: G.KIT.sword.cd }]; // deals 3 → it dies, no retaliation
  G.useItem(r, p, 0);
  eq(r.lanes[0].length, 0, "Sword kills the Accountant outright");
  // now a survivable hit triggers the counter-attack
  const acc2 = G.spawnEnemy("accountant"); r.lanes = [[acc2], [], []];
  p.hp = 8; p.inv = [{ key: "bow", charge: G.KIT.bow.cd }]; // 3 dmg, but give it 5 HP to survive
  acc2.hp = 5;
  G.useItem(r, p, 0);
  ok(acc2.hp > 0, "Accountant survives the bow");
  eq(p.hp, 7, "and strikes back for 1 when damaged");
}
{
  // all 36+ bodies exist and every passive maps to a real verb (no silent no-ops)
  const VERBS = new Set(["deal", "attack", "healAttack", "healSelf", "heal", "counter", "summon", "move", "delay", "shield", "dealEachLane", "summonArmed"]);
  let withPassive = 0;
  for (const key of Object.keys(G.BODIES)) {
    const p = G.BODIES[key].passive;
    if (!p) continue;
    withPassive++;
    for (const t of p) for (const op of t.ops) ok(VERBS.has(op.do), `body ${key} passive uses a real verb (${op.do})`);
  }
  ok(withPassive >= 20, `the bestiary has many bodies with wired passives (${withPassive})`);
  ok(Object.keys(G.BODIES).length >= 38, "the full roster is present");
}

// ---- Power scaling: body affinity boosts matching-school item damage -------
{
  // items carry a damage school; utility items are untyped
  eq(G.KIT.sword.type, "physical", "Sword is physical");
  eq(G.KIT.fire.type, "magical", "Fire is magical");
  ok(!G.KIT.heal.type, "Heal is untyped (utility)");
}
{
  const { r, p } = playingRoom();
  p.lane = 0;
  const hitWith = (key) => {
    const foe = G.spawnEnemy("killionaire"); // 13 HP
    r.lanes = [[foe], [], []];
    p.inv = [{ key, charge: G.KIT[key].cd }];
    G.useItem(r, p, 0);
    return 13 - foe.hp; // damage dealt
  };
  // rookie has no affinity → items deal their base
  eq(hitWith("sword"), 3, "rookie Sword deals base 3 (no Power)");
  // warrior (phys 2): physical items scale, magical items don't
  G.wearBody(p, "warrior");
  eq(p.phys, 2, "wearing Warrior grants Physical Power 2");
  eq(hitWith("sword"), 5, "Warrior Sword = 3 + 2 Physical Power");
  eq(hitWith("fire"), 6, "Warrior Fire (magical) ignores Physical Power");
  // mage (mag 2): magical items scale, physical items don't
  G.wearBody(p, "mage");
  eq(hitWith("fire"), 8, "Mage Fire = 6 + 2 Magical Power");
  eq(hitWith("sword"), 3, "Mage Sword (physical) ignores Magical Power");
}

// ---- player-to-player trading: swap items, settle the value gap in treasure -
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  const b = G.addPlayer(r, "p2", "B");
  G.startDraft(r); G.chooseClass(r, a, "warrior"); G.chooseClass(r, b, "mage");
  // get to an out-of-combat (won) screen so trading is allowed
  r.draftedFoes = []; stockFoe(r, "pixie", ["bow"]); G.commitStock(r); G.beginCombat(r);
  for (let i = 0; i < r.laneCount; i++) r.lanes[i] = [];
  G.simulateTick(r);                                 // → won (both wallets credited equally)
  eq(r.phase, "won", "out of combat");
  // give A a Fire (value 3), B a Bow (value 1); fund both wallets so settlement is affordable
  a.draftPicks = ["fire"]; b.draftPicks = ["bow"];
  a.treasure = 50; b.treasure = 50;
  const aT = a.treasure, bT = b.treasure;
  // can't trade items you don't own
  ok(!G.tradeItems(r, a, b, "gavel", "bow"), "can't trade an item you don't hold");
  // A trades Fire(3) for B's Bow(1): B gave the lesser item → B pays the 2 gap to A
  ok(G.tradeItems(r, a, b, "fire", "bow"), "trade executes");
  ok(a.draftPicks.includes("bow") && !a.draftPicks.includes("fire"), "A now holds the Bow");
  ok(b.draftPicks.includes("fire") && !b.draftPicks.includes("bow"), "B now holds the Fire");
  eq(b.treasure, bT - 2, "B (gave the lesser item) paid the 2-value gap");
  eq(a.treasure, aT + 2, "A received the 2-value settlement");
  // equal-value swap settles nothing
  a.draftPicks = ["sword"]; b.draftPicks = ["bow"]; // both value 1
  const aT2 = a.treasure, bT2 = b.treasure;
  ok(G.tradeItems(r, a, b, "sword", "bow"), "equal-value trade executes");
  eq(a.treasure, aT2, "no settlement when values match");
  eq(b.treasure, bT2, "…for either side");
  // offer / accept handshake
  a.draftPicks = ["fire"]; b.draftPicks = ["bow"];
  ok(G.proposeTrade(r, a, b.id, "fire", "bow"), "A proposes a trade");
  eq(G.snapshot(r).trade.offers.length, 1, "the offer is visible in the snapshot");
  ok(!G.acceptTrade(r, a, r.tradeOffers[0].id), "the proposer can't accept their own offer");
  ok(G.acceptTrade(r, b, r.tradeOffers[0].id), "the target accepts → executes");
  ok(b.draftPicks.includes("fire"), "the accepted trade moved the item");
  eq(r.tradeOffers.length, 0, "the offer is cleared once accepted");
}

// ---- between rooms: drop an item from your kit -----------------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.enchant = {};
  stockFoe(r, "killionaire", ["fire"]); stockFoe(r, "pixie", ["bow"]); G.commitStock(r); G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r); // win
  const before = a.draftPicks.length;
  const snapKit = G.snapshot(r).players[0].kit;
  ok(Array.isArray(snapKit) && snapKit.length === before, "snapshot exposes the managed kit");
  G.dropItem(r, a, a.draftPicks[0]);
  eq(a.draftPicks.length, before - 1, "dropping an item removes it from your kit");
  ok(G.dropItem(r, a, "nope") === undefined, "dropping a non-existent item is a safe no-op");
}

// ---- the full loop: stock → fight → advance up the map → shop → boss → complete ----
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  const path = ["n1", "n3", "n4", "n5", "n6"]; // n0 start → … → n3 SHOP → … → boss
  let rooms = 0, shops = 0;
  for (let step = 0; step <= path.length; step++) {
    if (r.phase === "shop") {                 // a shop node: browse, then leave down the path
      shops++;
      eq(r.shop.wares.length, G.SHOP_WARES, "the shop shelf is stocked");
      ok(G.leaveShop(r, path[step]), "leave the shop to the next node");
      continue;
    }
    if (r.phase === "stock") stockAndBegin(r);
    eq(r.phase, "setup", "next room is ready to fight");
    G.beginCombat(r);
    r.lanes = [[], [], []]; G.simulateTick(r); // clear the room
    eq(r.phase, "won", "room cleared");
    rooms++;
    if (r.levelComplete) break;
    ok(G.advanceLevel(r, path[step]), "advance to the next node on the path");
  }
  ok(r.levelComplete, "clearing the boss completes the level");
  eq(rooms, 5, "ran the 5 fights on the path (n0,n1,n4,n5,n6-boss)");
  eq(shops, 1, "and visited the shop node (n3)");
}

// ---- loot: claim gear, greed scales rewards, foe-only filtered -------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.enchant = {};                        // pin the enchant so loot is deterministic
  const kitBefore = a.draftPicks.length;
  r.draftedFoes = [];                                                   // controlled loot: no baseline commons
  stockFoe(r, "pixie", ["bow"]); stockFoe(r, "killionaire", ["fire"]); // ante 3 + 10 = 13
  G.commitStock(r); G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r);
  eq(r.phase, "won", "room cleared");

  const loot = G.snapshot(r).loot;
  ok(loot && loot.cards.length === 2, "won snapshot offers the foes' usable items");
  a.kitSlots = 5;                          // free space so the claim isn't gated (base kit is full)
  G.claimLoot(r, a, "fire");
  eq(a.draftPicks.length, kitBefore + 1, "claimed item is added to your kit");
  ok(a.draftPicks.includes("fire"), "the specific item was claimed");
  G.advanceLevel(r, "n1");
  ok(a.inv.some((it) => it.key === "fire"), "claimed Fire carries into the next room");
}
{
  // mirrored income: clearing a room credits the FULL room value V to every wallet. Claiming
  // an item COSTS its value (converting your own income into gear); skipping it keeps the cash.
  // There's no banking on leave — unclaimed loot is forfeited (its value was already credited).
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "mage");
  r.enchant = {};                                         // no enchant bonus loot
  r.draftedFoes = [];                                     // controlled loot: no baseline commons
  stockFoe(r, "pixie", ["bow"]); stockFoe(r, "auditAngel", ["lightning"]); stockFoe(r, "killionaire", ["fire"]);
  G.commitStock(r); G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r);
  eq(G.snapshot(r).roomValue, 6, "room value V = sum of loot item antes (bow1+lightning2+fire3)");
  eq(a.treasure, 6, "the full V is mirrored into the player's wallet on clear");
  a.kitSlots = 5;                                         // free space (base kit is full at 3)
  G.claimLoot(r, a, "fire");                              // snatch the 3-value drop — costs 3
  eq(a.treasure, 3, "claiming an item costs its value out of your wallet");
  G.advanceLevel(r, "n1");
  eq(a.treasure, 3, "leaving forfeits unclaimed loot — NO banking (value was already credited)");
}
{
  // MIRRORED INCOME invariant: every player is credited the SAME full V (not split), and a
  // greedy-added body feeds V with its body-value (on top of its carried item as loot).
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  const b = G.addPlayer(r, "p2", "B");
  G.startDraft(r); G.chooseClass(r, a, "warrior"); G.chooseClass(r, b, "mage");
  r.enchant = {}; r.draftedFoes = [];
  stockFoe(r, "pixie", ["bow"]);                                  // a plain loot item: bow(1)
  r.draftedFoes.push({ bodyKey: "killionaire", gear: ["fire"], greedy: true }); // greedy: body 7 + fire 3
  G.commitStock(r); G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r);                       // clear → credit V to all
  eq(G.snapshot(r).roomValue, 11, "V = loot items (bow1+fire3) + greedy body-value (killionaire 7) = 11");
  eq(a.treasure, 11, "player A credited the FULL V");
  eq(b.treasure, 11, "player B credited the FULL V — mirrored, not split");
  eq(a.treasure, b.treasure, "every player's cumulative earnings are identical (the hard invariant)");
  a.kitSlots = 5;                                                  // free space (base kit is full at 3)
  G.claimLoot(r, a, "fire");                                       // A converts income → gear (costs 3)
  eq(a.treasure, 8, "A's holdings diverge after spending");
  eq(b.treasure, 11, "B kept the cash — earnings were equal, holdings now differ");
}
{
  // every item works for both sides now — a foe's Rat Nest is claimable loot too
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.enchant = {};
  r.draftedFoes = [];                                                       // controlled loot: no baseline commons
  stockFoe(r, "fatCat", ["ratNest"]); stockFoe(r, "killionaire", ["fire"]); // ratNest + fire
  G.commitStock(r); G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r);
  const loot = G.snapshot(r).loot;
  ok(loot.cards.some((c) => c.key === "ratNest"), "summon items are claimable too (both sides)");
  ok(loot.cards.some((c) => c.key === "fire"), "and so is the rest");
}

// ---- loot: unarmed foes drop nothing; can't over-claim ---------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "rogue");
  r.enchant = {};                                // no bonus-loot enchant
  r.draftedFoes = [];                            // controlled: just one unarmed foe, no baseline
  stockFoe(r, "killionaire", []);                // unarmed, ante 7
  G.commitStock(r); G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r);     // win
  eq(G.snapshot(r).loot, null, "unarmed foes leave no loot to claim");
  G.claimLoot(r, a, "fire");
  eq(a.draftPicks.length, 3, "nothing claimable → kit unchanged");
}

// ---- stock: greedy picks pile on, capped at STOCK_MAX ----------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "rogue");
  eq(r.phase, "stock", "ordinary room opens in the stock phase");
  for (let i = 0; i < G.STOCK_MAX + 3; i++) G.addFoe(r, i % 3); // pile on greedy picks
  eq(r.draftedFoes.length, G.STOCK_MAX, "baseline + greedy picks cap at STOCK_MAX");
  G.commitStock(r);
  eq(r.phase, "setup", "committing always works — the baseline guarantees a fight");
}

// ---- god mode skips the foe-draft ------------------------------------------
{
  const r = G.newRoom("DEMO");
  G.addPlayer(r, "p1", "A");
  G.startLevel(r);
  eq(r.phase, "setup", "god mode auto-fills and skips straight to setup");
  ok(r.lanes.reduce((n, l) => n + l.length, 0) > 0, "god room is auto-populated");
}

// ---- class body + kit persist across rooms ---------------------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r);
  G.chooseClass(r, a, "rogue");
  eq(r.phase, "stock", "solo: choosing a class opens the foe-draft");
  const kit = a.inv.map((i) => i.key).join();
  stockAndBegin(r);                             // satisfy ante, begin
  G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r);   // clear room → won
  G.advanceLevel(r, "n1");                      // next room, same run
  eq(a.inv.map((i) => i.key).join(), kit, "class kit carries into the next room");
  eq(a.bodyKey, "rogue", "player resets to their class body each room");
}

// ---- clearing a room full-heals and revives the party ----------------------
{
  const { r, p } = playingRoom();
  p.hp = 1;                                   // wounded
  r.lanes = [[], [], []];                      // no foes left → next tick wins
  G.simulateTick(r);
  eq(r.phase, "won", "empty lanes → room won");
  eq(p.hp, p.maxHp, "the party full-heals on room clear");
}
{
  const { r, p } = playingRoom();
  p.alive = false; p.hp = 0; p.downTimer = 5;  // downed mid-fight
  r.lanes = [[], [], []];
  G.simulateTick(r);
  ok(p.alive && p.hp === p.maxHp, "a downed hero is revived to full on room clear");
}

// ---- exclusive body swap: a literal trade through the shared pool -----------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  const b = G.addPlayer(r, "p2", "B");
  G.startDraft(r); G.chooseClass(r, a, "warrior"); G.chooseClass(r, b, "mage");
  r.unlockedBodies.add("behemoth"); a.treasure = 999; // 4-ante foe felled → tier reached; A is funded
  // gated: can't adopt the Behemoth until A buys its tier
  eq(G.swapBody(r, a, "behemoth"), null, "can't adopt a body whose tier isn't unlocked yet");
  ok(G.buyTier(r, a, 4), "spend YOUR wallet to unlock the whole 4-ante tier");
  ok(G.canSwapTo(r, a, "efreeti"), "unlocking the tier opens the ENTIRE 4-ante roster, even undefeated bodies");
  // A adopts the Behemoth — its old Warrior body is released, Behemoth becomes A
  eq(G.swapBody(r, a, "behemoth"), "behemoth", "A swaps into the Behemoth");
  eq(a.homeBody, "behemoth", "the swap sticks across rooms (homeBody updated)");
  ok(r.unlockedBodies.has("warrior"), "A's old body is released back into the pool");
  // exclusivity: B can't also be the Behemoth while A wears it
  eq(G.swapBody(r, b, "behemoth"), null, "a body worn by another player is off-limits");
  eq(b.bodyKey, "mage", "B is unchanged after a blocked swap");
  // tier-0 (class) body A released is swappable by B (gated by the pool, not a tier)
  eq(G.swapBody(r, b, "warrior"), "warrior", "B adopts the released tier-0 body");
}

// ---- tiered Treasure economy: clear rooms → bank → unlock whole tiers -------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.enchant = {};
  r.draftedFoes = []; stockFoe(r, "behemoth", ["fire"]); G.commitStock(r); G.beginCombat(r); // only the Behemoth, no baseline
  G.damageEnemy(r, 0, r.lanes[0][0], 999);          // fell the 4-ante Behemoth
  G.simulateTick(r);                                 // room won → V mirrored to the wallet
  ok(a.treasure > 0, "clearing the room credits the room value V to the player's wallet");
  G.advanceLevel(r, "n1");
  ok(G.tiersReached(r).includes(4), "felling a 4-ante foe makes the 4-tier purchasable");
  ok(!G.buyTier(r, a, 7), "can't unlock a tier you've never reached");
  a.treasure = G.tierCost(4);
  ok(G.buyTier(r, a, 4), "unlock the 4-tier for ante × cost-mul, from your own wallet");
  eq(a.treasure, 0, "Treasure is deducted on purchase");
  ok(!G.buyTier(r, a, 4), "can't buy the same tier twice");
}

// ---- kit-space economy: buy slots with Treasure, capped at MAX_KIT ----------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  eq(a.kitSlots, G.KIT_SLOTS_BASE, "fresh player starts at the base kit-slot count");
  eq(G.kitSlotCost(G.KIT_SLOTS_BASE), G.KIT_SLOT_COST_MUL, "the first extra slot costs the base mul");
  ok(!G.buyKitSlot(r, a), "can't buy a slot with an empty purse");
  a.treasure = 100;
  ok(G.buyKitSlot(r, a), "buy a slot when funded");
  eq(a.kitSlots, G.KIT_SLOTS_BASE + 1, "kit space grew by one");
  eq(a.treasure, 100 - G.KIT_SLOT_COST_MUL, "Treasure deducted by the slot cost");
  let guard = 0; while (G.buyKitSlot(r, a) && guard++ < 50) {}   // buy up to the ceiling
  eq(a.kitSlots, G.MAX_KIT, "slots cap at MAX_KIT");
  eq(G.kitSlotCost(G.MAX_KIT), null, "no cost once maxed");
  ok(!G.buyKitSlot(r, a), "can't buy past the ceiling");
}

// ---- claim cap honors purchased kit slots ---------------------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");        // 3-item kit, base 5 slots
  r.enchant = {};
  stockFoe(r, "pixie", ["bow"]); stockFoe(r, "pixie", ["sword"]); stockFoe(r, "pixie", ["cold"]);
  r.anteRequired = 0; G.commitStock(r); G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r);              // won → loot = bow, sword, cold
  a.treasure = 100;                                        // fund the wallet (claiming now costs value)
  eq(a.draftPicks.length, 3, "a fresh draft kit is full at the base cap (3)");
  G.claimLoot(r, a, "bow");
  eq(a.draftPicks.length, 3, "can't claim while the kit is full");
  G.buyKitSlot(r, a);                                      // "level up" → 4 slots
  G.claimLoot(r, a, "bow");
  eq(a.draftPicks.length, 4, "leveling up (a kit slot) lets you claim one more");
  G.claimLoot(r, a, "sword");
  eq(a.draftPicks.length, 4, "full again at the new cap");
  G.buyKitSlot(r, a); G.claimLoot(r, a, "sword");
  eq(a.draftPicks.length, 5, "another slot, another claim");
}

// ---- shop node: buy chosen items, reroll the shelf, leave -------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.level.currentId = "n3"; G.enterRoom(r);              // n3 is the shop node
  eq(r.phase, "shop", "a shop node enters the shop phase");
  eq(r.shop.wares.length, G.SHOP_WARES, "the shelf is stocked");
  ok(G.snapshot(r).shop.wares.every((w) => w.cost > 0), "snapshot prices every ware");
  r.shop.wares = [{ key: "fire", cost: G.shopPrice("fire") }, { key: "bow", cost: G.shopPrice("bow") }];
  ok(!G.buyShopItem(r, a, "fire"), "can't buy with an empty purse");
  a.treasure = 100; a.kitSlots = 6;        // funded + free space (base kit is full at 3)
  const kitBefore = a.draftPicks.length;
  ok(G.buyShopItem(r, a, "fire"), "buy a ware when funded");
  eq(a.draftPicks.length, kitBefore + 1, "the bought item lands in the kit");
  ok(a.draftPicks.includes("fire"), "the specific ware was bought");
  eq(a.treasure, 100 - G.shopPrice("fire"), "Treasure deducted by the ware's price");
  eq(r.shop.wares.length, 1, "the bought ware leaves the shelf");
  ok(!G.buyShopItem(r, a, "fire"), "a sold ware can't be rebought");
  a.treasure = 50;
  ok(G.rerollShop(r, a), "reroll the shelf for a flat fee");
  eq(a.treasure, 50 - G.SHOP_REROLL_COST, "reroll fee deducted");
  eq(r.shop.wares.length, G.SHOP_WARES, "reroll refills the shelf");
  ok(G.leaveShop(r, "n4"), "leave the shop down a linked edge");
  eq(r.shop, null, "the shop is cleared on the way out");
}

// ---- shop purchases honor kit capacity ------------------------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");       // 3-item kit → full at base 3 slots
  r.level.currentId = "n3"; G.enterRoom(r);
  a.treasure = 999; a.kitSlots = 5;                        // give 2 free slots above the base kit
  r.shop.wares = [{ key: "bow", cost: 3 }, { key: "cold", cost: 3 }, { key: "sword", cost: 3 }];
  G.buyShopItem(r, a, "bow"); G.buyShopItem(r, a, "cold"); // 3 → 5 (full at 5 slots)
  eq(a.draftPicks.length, 5, "shop fills the kit up to its cap");
  ok(!G.buyShopItem(r, a, "sword"), "can't buy past kit capacity");
}

// ---- bodies & items are DECOUPLED reward tracks (no ante/Treasure cross-leak) ----
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.enchant = {}; r.draftedFoes = [];
  stockFoe(r, "killionaire", ["fire"]);             // body ante 7 + item Fire ante 3
  const f = r.draftedFoes[0];
  eq(G.bodyAnteOf(f), 7, "BODY track: bodyAnte is the body's ante only");
  eq(G.foeLootValue(f), 3, "ITEM track: lootValue is the gear's itemTreasure only");
  eq(G.itemTreasure("fire"), 3, "item Treasure is item-ante only");
  eq(G.tierCost(7), 7 * G.TIER_COST_MUL, "tier cost is body-ante only — no item leak");
  G.commitStock(r); G.beginCombat(r);
  G.damageEnemy(r, 0, r.lanes[0][0], 999);          // fell it
  G.simulateTick(r);                                 // → won
  eq(G.snapshot(r).roomValue, 3, "room value = item loot only here (a non-greedy body adds no body-value)");
  ok(G.tiersReached(r).includes(7), "the BODY shows up separately as a reachable tier (the mimic)");
}

// ---- formation: tanky to the front, squishy to the back --------------------
{
  const r = G.newRoom("AAAA");
  r.lanes = [[G.spawnEnemy("pixie"), G.spawnEnemy("behemoth"), G.spawnEnemy("rat")], [], []];
  G.formUp(r);
  const lane = r.lanes[0];
  eq(lane[0].bodyKey, "behemoth", "tankiest body (most HP) holds the front of the lane");
  eq(lane[lane.length - 1].bodyKey, "rat", "squishiest body hides at the back");
  // buildRoom forms up automatically: stock a wall + a glass cannon into one lane
  const r2 = G.newRoom("AAAA"); G.addPlayer(r2, "p1", "A");
  G.startDraft(r2); G.chooseClass(r2, r2.players.get("p1"), "warrior");
  r2.draftedFoes = [{ bodyKey: "atlas", gear: [] }, { bodyKey: "rat", gear: [] }]; // both → lane 0/1
  r2.lanes = [[G.spawnEnemy("rat"), G.spawnEnemy("atlas")], [], []]; G.formUp(r2);
  eq(r2.lanes[0][0].bodyKey, "atlas", "Atlas (11 HP) outranks the rat to the front");
}

// ---- summons (rats) are never adoptable -----------------------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.unlockedTiers = new Set([1]);                    // even with the rat's tier unlocked…
  ok(!G.canSwapTo(r, a, "rat"), "a rat (summon) can never be swapped into");
  // and killing a rat doesn't add it to the pool or reach a tier
  const rat = G.spawnEnemy("rat"); r.lanes = [[rat], [], []];
  G.damageEnemy(r, 0, rat, 99);
  ok(!r.unlockedBodies.has("rat"), "felling a summon doesn't unlock it as loot");
}

// ---- the unlocked-body pool ACCUMULATES across rooms (the mimic hook) --------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.enchant = {};
  r.draftedFoes = []; stockFoe(r, "behemoth", []);  // only the Behemoth, no baseline rank-and-file
  G.commitStock(r); G.beginCombat(r);
  G.damageEnemy(r, 0, r.lanes[0][0], 999);          // kill the foe → unlocks its body
  ok(r.unlockedBodies.has("behemoth"), "defeating a foe unlocks its body");
  G.simulateTick(r);                                 // lanes empty → room won
  ok(G.advanceLevel(r, "n1"), "advance to the next room");
  ok(r.unlockedBodies.has("behemoth"), "the adopted-body pool persists after advancing (not wiped per room)");
  // a brand-new run, though, wipes it back to the starter
  a.kitSlots = G.MAX_KIT;                            // pretend we bought every slot last run
  G.startDraft(r);
  ok(!r.unlockedBodies.has("behemoth") && r.unlockedBodies.has("rookie"), "a fresh run resets the pool to the starter");
  eq(a.kitSlots, G.KIT_SLOTS_BASE, "a fresh run also resets bought kit space");
}

// ---- self-timed passives: `every:N` runs on its own clock, not on triggers ---
{
  // the ramp families are decoupled from the body timer
  ok(G.BODIES.internImp.passive[0].every === 35, "Intern Imp's ramp is self-timed (every 35)");
  ok(!G.BODIES.internImp.passive.some((x) => x.on === "hourglass"), "no longer fires on the body hourglass");

  // it fires strictly on its own accumulator, independent of e.charge
  const { r } = playingRoom();
  const imp = G.spawnEnemy("internImp"); imp.charge = 999; // body clock maxed — must NOT matter
  r.lanes = [[imp], [], []];
  for (let t = 0; t < 34; t++) G.simulateTick(r);
  eq(imp.counters, 0, "no ramp before its own timer elapses");
  G.simulateTick(r);
  eq(imp.counters, 1, "ramps exactly when its own 35-tick timer completes");
  // a second, independent passive on the same body would tick on its own clock too
  G.runPassive(r, imp, "hourglass"); // hourglass trigger fires nothing now (it's all self-timed)
  eq(imp.counters, 1, "the hourglass trigger does not double-fire a self-timed ramp");
}

// ---- body tempo: cooldown identity (heavy caps big spells, spammer shortens) -
{
  // rookie: no tempo → base cooldowns
  eq(G.itemCd({ key: "fire" }, G.BODIES.rookie), 70, "rookie Fire keeps its base 70 cd");
  // mage (heavy, cap 45): big spells tamed, cheap ones untouched
  eq(G.itemCd({ key: "fire" }, G.BODIES.mage), 45, "Mage caps Fire's 70 cd at 45");
  eq(G.itemCd({ key: "sword" }, G.BODIES.mage), 25, "Mage leaves Sword's 25 cd alone (under the cap)");
  // rogue (spammer, ×0.7): everything shorter
  eq(G.itemCd({ key: "bow" }, G.BODIES.rogue), Math.round(30 * 0.7), "Rogue shortens Bow's cd ×0.7");
  eq(G.itemCd({ key: "gavel" }, G.BODIES.rogue), Math.round(80 * 0.7), "Rogue shortens Gavel's cd ×0.7");
}

// ===========================================================================
// BOSSES — the four designed bosses, wired into boss nodes (content.js BOSSES)
// ===========================================================================

// Drop into a boss room on a chosen floor (picks which boss), deterministically.
function bossRoom(floor = 1) {
  const r = G.newRoom("AAAA");
  G.addPlayer(r, "p1", "X");
  G.startLevel(r);
  r.floor = floor;
  r.enchant = {};                 // pin: no enchant HP/atk bonus so HP math is exact
  r.level.currentId = "n6";       // the boss node
  G.enterRoom(r);                 // boss path auto-fills + fires the boss `enter` passive
  return r;
}
const findFoe = (r, key) => r.lanes.flat().find((e) => e.bodyKey === key);

// ---- boss nodes spawn the DESIGNED boss, not generic foes -------------------
{
  eq(G.bossForFloor(1), "hydra", "floor 1 boss = Hydra");
  eq(G.bossForFloor(2), "litigationLich", "floor 2 boss = Litigation Lich");
  eq(G.bossForFloor(3), "djinn", "floor 3 boss = Djinn");
  eq(G.bossForFloor(4), "kingMimic", "floor 4 boss = King Mimic");
  eq(G.bossForFloor(5), "hydra", "boss roster loops after floor 4");

  const r = bossRoom(1);
  ok(findFoe(r, "hydra"), "entering a boss node spawns the actual designed boss");
  ok(r.lanes.flat().every((e) => e.bodyKey !== "killionaire" || G.BODIES[e.bodyKey].boss === undefined),
     "the boss room is not auto-filled with generic killionaires");
  ok(G.BODIES.hydra.boss && G.BODIES.kingMimic.boss, "bosses carry the boss flag");
}

// ---- Hydra: enters ramped (+1s = 3), spawns rats when struck, chips all lanes
{
  const r = bossRoom(1);
  const hydra = findFoe(r, "hydra");
  eq(hydra.counters, 3, "Hydra enters with three +1s");

  const ratsBefore = r.lanes[1].filter((e) => e.bodyKey === "rat").length;
  G.damageEnemy(r, 1, hydra, 1);
  ok(r.lanes[1].filter((e) => e.bodyKey === "rat").length > ratsBefore, "Hydra spawns a rat in its lane when struck");

  // hourglass: gain a +1, then chip EVERY lane for its counters. No player in lanes 0/2 → caravan.
  for (const p of r.players.values()) p.lane = 1; // park the only hero off lanes 0 & 2
  const cav = r.caravan.hp;
  hydra.counters = 2;                              // set a known ramp
  G.resolveOps(r, hydra, [{ do: "counter", amount: 1 }, { do: "dealEachLane", amount: 0 }]); // → 3, then 3/lane
  // lanes 0 and 2 are undefended → 3 + 3 = 6 to the caravan (lane 1 hits the parked hero)
  eq(r.caravan.hp, cav - 6, "Hydra's hourglass chips each undefended lane for its +1s");
}

// ---- Litigation Lich: parity armor softens every hit (1 always slips through) -
{
  const r = bossRoom(2);
  const lich = findFoe(r, "litigationLich");
  ok(lich, "floor 2 spawns the Litigation Lich");
  eq(G.BODIES.litigationLich.dmgReduce, 2, "Lich has 2 damage reduction");

  let hp = lich.hp;
  G.damageEnemy(r, 1, lich, 7);
  eq(lich.hp, hp - 5, "a 7 hit is reduced by 2 → 5 lands");
  hp = lich.hp;
  G.damageEnemy(r, 1, lich, 1);
  eq(lich.hp, hp - 1, "even a 1 hit always lands at least 1 (armor never fully blocks)");

  // hourglass summons a litigant into its lane
  const before = r.lanes[1].length;
  G.runPassive(r, lich, "hourglass");
  ok(r.lanes[1].length > before, "Lich summons a litigant on its timer");
  ok(r.lanes[1].some((e) => e.bodyKey === "accountant"), "the litigant is an armed Angry Accountant");
}

// ---- Djinn: scorches every lane on its timer, strikes back when hit ----------
{
  const r = bossRoom(3);
  const djinn = findFoe(r, "djinn");
  ok(djinn, "floor 3 spawns the Djinn");
  for (const p of r.players.values()) p.lane = 1; // leave lanes 0 & 2 undefended

  const cav = r.caravan.hp;
  G.runPassive(r, djinn, "hourglass");            // attack each lane for 3
  eq(r.caravan.hp, cav - 6, "Djinn scorches each undefended lane for 3");

  // strike-back when damaged: lane 1 has the hero, so the retaliation hits them
  const p = [...r.players.values()][0]; p.lane = 1; const php = p.hp;
  G.damageEnemy(r, 1, djinn, 1);                  // triggers its damaged passive (deal 3 to its lane)
  eq(p.hp, php - 3, "Djinn strikes back for 3 when struck");
}

// ---- King Mimic: arrives with a 3-nemesis court; warded until the court falls -
{
  const r = bossRoom(4);
  const km = findFoe(r, "kingMimic");
  ok(km, "floor 4 spawns the King Mimic");
  eq(G.foeCount(r), 4, "King Mimic enters flanked by exactly 3 nemeses");
  ok(["killionaire", "minotaur", "phoenix"].every((k) => findFoe(r, k)), "its three named nemeses are on the board");

  const kmHp = km.hp;
  G.damageEnemy(r, 1, km, 12);
  eq(km.hp, kmHp, "King Mimic cannot be damaged while any other foe lives");
  ok(G.snapshot(r).lanes[1].enemies.find((e) => e.bodyKey === "kingMimic").warded, "snapshot flags it as warded");

  // wipe the court, leaving only the king
  for (const lane of r.lanes) for (const e of [...lane]) if (e.bodyKey !== "kingMimic") lane.splice(lane.indexOf(e), 1);
  eq(G.foeCount(r), 1, "court cleared");
  G.damageEnemy(r, 1, km, 12);
  eq(km.hp, kmHp - 12, "once alone, the King Mimic takes full damage");

  // hourglass reinforces with a fresh nemesis
  const before = G.foeCount(r);
  G.runPassive(r, km, "hourglass");
  ok(G.foeCount(r) > before, "King Mimic summons a fresh nemesis on its timer");
}

// ---- a boss room is winnable and completes the floor (full integration) ------
{
  const r = bossRoom(3);                          // Djinn (no ward — clearable by emptying lanes)
  ok(findFoe(r, "djinn"), "boss present before the fight");
  G.beginCombat(r);
  r.lanes = [[], [], []];                          // simulate killing everything
  G.simulateTick(r);
  eq(r.phase, "won", "clearing the boss room → won");
  ok(r.levelComplete, "boss clear completes the floor");
}

// ---- summary ---------------------------------------------------------------
console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
