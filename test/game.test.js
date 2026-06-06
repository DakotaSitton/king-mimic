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
  if (r.phase === "stock") stockAndBegin(r); // satisfy ante & skip into combat
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

// ---- foe draft + ante gate -------------------------------------------------
// palette: 0 rat(1) · 1 royalRat(2) · 2 fatCat(3) · 3 pixie+bow(3) · 4 audit+lightning(6)
//          5 killionaire(7) · 6 killionaire+fire(10) · 7 fatCat+ratNest(5)
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  eq(r.phase, "stock", "ordinary room opens the foe-draft, not setup");

  const s0 = G.snapshot(r).stock;
  eq(s0.anteCurrent, 0, "ante starts at 0");
  ok(s0.anteRequired >= 6, "room demands a minimum ante");
  ok(!s0.canBegin, "can't begin below the ante");
  eq(s0.palette.length, G.PALETTE_SLOTS, "you see 3 foe choices at a time");
  ok(s0.palette.every((o) => o.gear.length === 1), "every offered foe carries an item");
  ok(s0.palette.every((o) => o.ante >= 1), "each choice reports its ante (body + item)");

  // picking a slot stocks that foe and rolls a fresh choice into the slot
  G.addFoe(r, 0);
  eq(r.draftedFoes.length, 1, "stocking records the foe");
  ok(r.foePalette[0] && r.foePalette[0].bodyKey, "a new choice rolled into the slot");

  // ante gating via known foes (bodies + items both contribute)
  r.draftedFoes = [];
  stockFoe(r, "killionaire", ["fire"]);
  eq(G.anteCurrent(r), 10, "ante = body (killionaire 7) + item (fire 3)");
  ok(G.snapshot(r).stock.canBegin, "ante met → begin unlocks");
  G.commitStock(r);
  eq(r.phase, "setup", "committing → setup");
  eq(r.lanes[0].length, 1, "the stocked foe is placed in a lane");
  ok(r.lanes[0][0].equipment.length === 1, "it carries its item into combat");
}

// ---- round-robin fills lanes evenly, left→right→loop ----------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  for (let i = 0; i < 6; i++) stockFoe(r, "pixie", ["bow"]); // 6 foes
  G.commitStock(r);
  eq(r.lanes[0].length, 2, "lane 0 gets foes 0 & 3");
  eq(r.lanes[1].length, 2, "lane 1 gets foes 1 & 4");
  eq(r.lanes[2].length, 2, "lane 2 gets foes 2 & 5");
}

// ---- floors: ante scales, descend advances after a boss --------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  eq(G.snapshot(r).stock.anteRequired, 6, "floor 1 combat room requires ante 6");
  r.floor = 3; G.enterRoom(r);
  eq(G.snapshot(r).stock.anteRequired, 18, "ante scales +6 per floor (floor 3 = 18)");
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
  stockFoe(r, "pixie", ["bow"]); stockFoe(r, "killionaire", ["fire"]); // ante 3 + 10 = 13
  G.commitStock(r); G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r);
  eq(r.phase, "won", "room cleared");

  const loot = G.snapshot(r).loot;
  ok(loot && loot.cards.length === 2, "won snapshot offers the foes' usable items");
  G.claimLoot(r, a, "fire");
  eq(a.draftPicks.length, kitBefore + 1, "claimed item is added to your kit");
  ok(a.draftPicks.includes("fire"), "the specific item was claimed");
  G.advanceLevel(r, "n1");
  ok(a.inv.some((it) => it.key === "fire"), "claimed Fire carries into the next room");
}
{
  // greed is now a tradeoff: unclaimed loot converts to Treasure on leaving, and every
  // item you claim removes its value from that convertible pool (take gear OR bank value).
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "mage");
  r.enchant = {};                                         // no enchant bonus loot
  stockFoe(r, "pixie", ["bow"]); stockFoe(r, "auditAngel", ["lightning"]); stockFoe(r, "killionaire", ["fire"]);
  G.commitStock(r); G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r);
  eq(G.snapshot(r).loot.pending, 6, "unclaimed loot's value = sum of item antes (bow1+lightning2+fire3)");
  G.claimLoot(r, a, "fire");                              // snatch the 3-value drop
  eq(G.snapshot(r).loot.pending, 3, "claiming an item drops the convertible Treasure by its value");
  const before = r.treasure ?? 0;
  G.advanceLevel(r, "n1");
  eq(r.treasure, before + 3, "leaving banks the unclaimed loot (bow1+lightning2) as Treasure");
}
{
  // every item works for both sides now — a foe's Rat Nest is claimable loot too
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");
  r.enchant = {};
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
  stockFoe(r, "killionaire", []);                // unarmed, ante 7
  G.commitStock(r); G.beginCombat(r);
  r.lanes = [[], [], []]; G.simulateTick(r);     // win
  eq(G.snapshot(r).loot, null, "unarmed foes leave no loot to claim");
  G.claimLoot(r, a, "fire");
  eq(a.draftPicks.length, 3, "nothing claimable → kit unchanged");
}

// ---- stock: ante-gated, capped at STOCK_MAX --------------------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "rogue");
  G.commitStock(r);
  eq(r.phase, "stock", "can't begin below the ante");
  for (let i = 0; i < G.STOCK_MAX + 3; i++) G.addFoe(r, 0, i % 3); // rats
  eq(r.draftedFoes.length, G.STOCK_MAX, "stocking is capped at STOCK_MAX");
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
  r.unlockedBodies.add("behemoth"); r.treasure = 999; // 4-ante foe felled → tier reached
  // gated: can't adopt the Behemoth until its tier is purchased
  eq(G.swapBody(r, a, "behemoth"), null, "can't adopt a body whose tier isn't unlocked yet");
  ok(G.buyTier(r, 4), "spend Treasure to unlock the whole 4-ante tier");
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
  stockFoe(r, "behemoth", ["fire"]); r.anteRequired = 0; G.commitStock(r); G.beginCombat(r);
  G.damageEnemy(r, 0, r.lanes[0][0], 999);          // fell the 4-ante Behemoth
  G.simulateTick(r);                                 // room won → its Fire drop is loot
  G.advanceLevel(r, "n1");                            // leave without claiming → loot banks
  ok(r.treasure > 0, "unclaimed loot converts to Treasure when the party leaves the room");
  ok(G.tiersReached(r).includes(4), "felling a 4-ante foe makes the 4-tier purchasable");
  ok(!G.buyTier(r, 7), "can't unlock a tier you've never reached");
  r.treasure = G.tierCost(4);
  ok(G.buyTier(r, 4), "unlock the 4-tier for ante × cost-mul Treasure");
  eq(r.treasure, 0, "Treasure is deducted on purchase");
  ok(!G.buyTier(r, 4), "can't buy the same tier twice");
}

// ---- kit-space economy: buy slots with Treasure, capped at MAX_KIT ----------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  eq(a.kitSlots, G.KIT_SLOTS_BASE, "fresh player starts at the base kit-slot count");
  eq(G.kitSlotCost(G.KIT_SLOTS_BASE), G.KIT_SLOT_COST_MUL, "the first extra slot costs the base mul");
  ok(!G.buyKitSlot(r, a), "can't buy a slot with an empty purse");
  r.treasure = 100;
  ok(G.buyKitSlot(r, a), "buy a slot when funded");
  eq(a.kitSlots, G.KIT_SLOTS_BASE + 1, "kit space grew by one");
  eq(r.treasure, 100 - G.KIT_SLOT_COST_MUL, "Treasure deducted by the slot cost");
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
  G.claimLoot(r, a, "bow"); G.claimLoot(r, a, "sword");   // 3 → 5 (now full at base)
  eq(a.draftPicks.length, 5, "claims fill up to the base kit cap");
  G.claimLoot(r, a, "cold");
  eq(a.draftPicks.length, 5, "can't claim past kit capacity");
  r.treasure = 100; G.buyKitSlot(r, a);                   // grow to 6 slots
  G.claimLoot(r, a, "cold");
  eq(a.draftPicks.length, 6, "buying a slot lets you claim one more");
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
  r.treasure = 100;
  const kitBefore = a.draftPicks.length;
  ok(G.buyShopItem(r, a, "fire"), "buy a ware when funded");
  eq(a.draftPicks.length, kitBefore + 1, "the bought item lands in the kit");
  ok(a.draftPicks.includes("fire"), "the specific ware was bought");
  eq(r.treasure, 100 - G.shopPrice("fire"), "Treasure deducted by the ware's price");
  eq(r.shop.wares.length, 1, "the bought ware leaves the shelf");
  ok(!G.buyShopItem(r, a, "fire"), "a sold ware can't be rebought");
  r.treasure = 50;
  ok(G.rerollShop(r), "reroll the shelf for a flat fee");
  eq(r.treasure, 50 - G.SHOP_REROLL_COST, "reroll fee deducted");
  eq(r.shop.wares.length, G.SHOP_WARES, "reroll refills the shelf");
  ok(G.leaveShop(r, "n4"), "leave the shop down a linked edge");
  eq(r.shop, null, "the shop is cleared on the way out");
}

// ---- shop purchases honor kit capacity ------------------------------------
{
  const r = G.newRoom("AAAA");
  const a = G.addPlayer(r, "p1", "A");
  G.startDraft(r); G.chooseClass(r, a, "warrior");       // 3-item kit, base 5 slots
  r.level.currentId = "n3"; G.enterRoom(r);
  r.treasure = 999;
  r.shop.wares = [{ key: "bow", cost: 3 }, { key: "cold", cost: 3 }, { key: "sword", cost: 3 }];
  G.buyShopItem(r, a, "bow"); G.buyShopItem(r, a, "cold"); // 3 → 5 (full)
  eq(a.draftPicks.length, 5, "shop fills the kit up to its cap");
  ok(!G.buyShopItem(r, a, "sword"), "can't buy past kit capacity");
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
  stockFoe(r, "behemoth", []); r.anteRequired = 0;  // bypass the ante gate for this test
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
