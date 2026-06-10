// Deterministic unit tests for King Mimic — THE FIRST SET (SLICE_SPEC_V2.md).
// No server, no timing. Run: bun run test/game.test.js
import * as G from "../game.js";
const { KIT, BODIES } = G;

G.setHpMult(1); // canonical 1× HP for mechanic numbers (live/fuzz/e2e run the 2× tuning)
G.setCdMult(1); // canonical 1× cooldowns for timing assertions (live runs the 2× playtest slow-down)

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("❌ " + label); } };
const eq = (a, b, label) => ok(a === b, `${label} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

// A 1-lane "playing" room: a player wearing `pBody` (100 HP for headroom) vs a fat dummy foe.
function rig(pBody, { foeBody = "lizardWizard", foeHp = 1000, inv = [], pHp = 100 } = {}) {
  const r = G.newRoom("T");
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, pBody); p.lane = 0; p.depth = 0; p.maxHp = p.hp = pHp;
  p.inv = inv.map((k) => ({ key: k, charge: 0, cd: KIT[k].cd }));
  r.phase = "playing"; r.laneCount = 1; r.allies = [[]]; r.caravan = { hp: 1e9, max: 1e9 };
  const foe = G.spawnEnemy(foeBody, []); foe.hp = foe.maxHp = foeHp; r.lanes = [[foe]];
  return { r, p, foe };
}
const fire = (r, p, slot) => { p.inv[slot].charge = KIT[p.inv[slot].key].cd; G.useItem(r, p, slot); };
// a hero-side summon token dropped straight into lane 0
const allyToken = (r, body, lane = 0) => { const t = G.spawnEnemy(body); t.side = "hero"; t.lane = lane; r.allies[lane].push(t); return t; };

// ---- content shape: the generated 36-body set + the 24-item kit -------------
{
  const gen = Object.keys(BODIES).filter((k) => BODIES[k].rarity);
  eq(gen.length, 36, "12 templates × 3 rarities = 36 generated bodies");
  ok(G.SET_COMMONS.every((k) => BODIES[k]?.rarity === "common"), "every template's common exists under its bare key");
  ok(G.SET_COMMONS.every((k) => BODIES[k + "U"]?.rarity === "uncommon" && BODIES[k + "R"]?.rarity === "rare"),
    "every template has U/R variants");
  eq(Object.keys(KIT).length, 24, "the kit is exactly 24 items");
  const counts = Object.values(KIT).reduce((a, i) => { a[i.rarity] = (a[i.rarity] ?? 0) + 1; return a; }, {});
  ok(counts.common === 12 && counts.uncommon === 8 && counts.rare === 4, "item rarities split 12/8/4");
  ok(!BODIES.auditAngel && !KIT.trustyBlade && !KIT.trustyStaff, "retired V1 bodies/items are gone");
  // rarity table: HP ×1/×1.6/×2.4 (rounded), Power +0/+1/+2, ante 1/2/3
  eq(BODIES.pixie.maxHp, 7, "common attacker HP = base (7)");
  eq(BODIES.pixieU.maxHp, 11, "uncommon HP = ×1.6 rounded (7→11)");
  eq(BODIES.pixieR.maxHp, 17, "rare HP = ×2.4 rounded (7→17)");
  ok(BODIES.pixie.phys === 1 && BODIES.pixieU.phys === 2 && BODIES.pixieR.phys === 3, "Power steps +0/+1/+2");
  ok(BODIES.pixie.ante === 1 && BODIES.pixieU.ante === 2 && BODIES.pixieR.ante === 3, "ante tiers 1/2/3");
  // [PLACEHOLDER] seniority naming: Junior X / X / Senior X
  ok(BODIES.royalRat.name === "Junior Royal Rat" && BODIES.royalRatU.name === "Royal Rat"
    && BODIES.royalRatR.name === "Senior Royal Rat", "rarity naming = Junior/—/Senior prefixes");
  // Runeblade override: growth lives in its PHYS (1/2/3), mag stays 1 (binary cross-school)
  ok(BODIES.runeblade.phys === 1 && BODIES.runebladeU.phys === 2 && BODIES.runebladeR.phys === 3
    && BODIES.runebladeR.mag === 1, "Runeblade scales phys 1/2/3, mag fixed at 1");
}

// ---- HP knob ---------------------------------------------------------------
{
  G.setHpMult(2);
  eq(G.bodyMaxHp(BODIES.royalRat), 10, "HP_MULT=2 doubles a body (royalRat 5→10)");
  eq(G.caravanMaxHp(), 40, "HP_MULT=2 doubles the caravan (20→40)");
  eq(G.spawnEnemy("pixie").maxHp, 14, "a spawned foe is doubled (pixie 7→14)");
  eq(G.spawnEnemy("rat").maxHp, 1, "summon tokens are EXEMPT from the knob (a rat is ALWAYS 1 HP)");
  eq(G.spawnEnemy("knight").maxHp, 6, "…every token is tuned absolutely (knight stays 6)");
  G.setHpMult(1);
}

// ---- per-body shields (unchanged spine) --------------------------------------
{
  const foe = G.spawnEnemy("fatCat", []); foe.hp = foe.maxHp = 8;
  const r = { lanes: [[foe]], allies: [[]], laneCount: 1, caravan: { hp: 9, max: 9 }, players: new Map() };
  G.resolveOps(r, foe, [{ do: "shield", amount: 4 }]);
  eq(foe.shield, 4, "shield op buffers the caster's shield");
  G.damageEnemy(r, 0, foe, 3);
  ok(foe.shield === 1 && foe.hp === 8, "shield absorbs before HP (3 of 4)");
  G.damageEnemy(r, 0, foe, 3);
  ok(foe.shield === 0 && foe.hp === 6, "overflow past shield hits HP (2)");

  const { r: r2, p } = rig("pixie"); p.shield = 5; const hp0 = p.hp;
  G.damagePlayer(r2, p, 3);
  ok(p.shield === 2 && p.hp === hp0, "player shield is symmetric (absorbs before HP)");
}

// ---- SYMMETRY: worn body passives fire for the player ----------------------
{
  // Summoners run a VISIBLE 4s summon clock; their signature trigger SPEEDS IT UP by 1s.
  // Royal Rat (worn): each staff item feeds the clock — nothing summons instantly.
  { const { r, p } = rig("royalRat", { inv: ["fire"] }); fire(r, p, 0);
    eq(r.allies[0].length, 0, "a staff item alone summons nothing (it feeds the clock)");
    for (let t = 0; t < 29; t++) G.simulateTick(r);
    eq(r.allies[0].length, 0, "clock not yet full (10+29 < 40)");
    G.simulateTick(r);
    eq(r.allies[0].length, 1, "worn Royal Rat's rat arrives 1s early (fires at 10+30)"); }
  // …and the rare summons 3 per clock fire
  { const { r, p } = rig("royalRatR", { inv: ["fire"] }); fire(r, p, 0);
    for (let t = 0; t < 30; t++) G.simulateTick(r);
    eq(r.allies[0].length, 3, "Senior Royal Rat summons 3 rats per fire"); }
  // Paid Piper: the sword-side mirror
  { const { r, p } = rig("paidPiper", { inv: ["blade"] }); fire(r, p, 0);
    for (let t = 0; t < 30; t++) G.simulateTick(r);
    eq(r.allies[0].length, 1, "worn Paid Piper's clock is fed by sword items"); }
  // …and the base clock still fires on its own with no trigger at all
  { const { r } = rig("fatCat"); for (let t = 0; t < 40; t++) G.simulateTick(r);
    eq(r.allies[0].length, 1, "an untriggered summon clock fires at its base 4s"); }
  // Fat Cat (worn): taking a hit feeds the clock
  { const { r, p } = rig("fatCat"); G.damagePlayer(r, p, 1);
    for (let t = 0; t < 30; t++) G.simulateTick(r);
    eq(r.allies[0].length, 1, "worn Fat Cat's clock jumps 1s when the player is hit"); }
  // Wageslave (worn): heals every 3s (common: 2)
  { const { r, p } = rig("wageslave", { pHp: 100 }); p.hp = 50; for (let t = 0; t < 65; t++) G.simulateTick(r);
    eq(p.hp, 54, "worn Wageslave heals 2 every 3s (2 ticks in 6.5s)"); }
  // Minotaur (worn): counter-swords the front foe when the player takes damage
  { const { r, p, foe } = rig("minotaur"); const h0 = foe.hp; G.damagePlayer(r, p, 1);
    eq(h0 - foe.hp, 1, "worn Minotaur counters for sword Power (1) when hit"); }
}

// ---- school power + cross-school (V2 §4.5) ----------------------------------
{
  // Pixie(1 sword) + Sword(deal 1) → 2 to the front foe
  { const { r, p, foe } = rig("pixie", { inv: ["blade"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 2, "sword item scales with body sword Power (1+1)"); }
  // Runeblade(1 mag, 1 phys, cross-school) + Fireball(staff 3) → 3 + 1 + 1 = 5
  { const { r, p, foe } = rig("runeblade", { inv: ["fire"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 5, "cross-school: staff item adds sword Power on top (3+1+1)"); }
  // …and the uncommon's bigger phys feeds it too
  { const { r, p, foe } = rig("runebladeU", { inv: ["fire"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 6, "Runeblade U: 3 + mag 1 + phys 2"); }
  // Lizard Wizard(1 staff) + Fireball → 4
  { const { r, p, foe } = rig("lizardWizard", { inv: ["fire"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 4, "staff item scales with body staff Power (3+1)"); }
}

// ---- ECHO (V2 §4.3): matching-school items resolve twice ---------------------
{
  // Centaur (echo sword) + Sword → ops resolve twice: (1+1) × 2
  { const { r, p, foe } = rig("centaur", { inv: ["blade"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 4, "echo(sword) body doubles a sword item ((1+1)×2)"); }
  // …but NOT an off-school item
  { const { r, p, foe } = rig("centaur", { inv: ["fire"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 3, "echo(sword) body does NOT double a staff item (3+0)"); }
  // Mouse (echo staff) + Fireball → (3+1) × 2
  { const { r, p, foe } = rig("mouse", { inv: ["fire"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 8, "echo(staff) body doubles a staff item ((3+1)×2)"); }
  // echo doubles the ITEM, not the school trigger (Royal Rat would be 2 rats otherwise)
  { const { r, p } = rig("mouse", { inv: ["summonRat"] }); fire(r, p, 0);
    eq(r.allies[0].length, 2, "echo doubles a summon item's ops (2 rats)"); }
}

// ---- SCHOOL CDR (V2 §4.4) -----------------------------------------------------
{
  eq(G.itemCd({ key: "blade", cd: 20 }, BODIES.pixie), 15, "Pixie: sword cds ×0.75 (20→15)");
  eq(G.itemCd({ key: "fire", cd: 45 }, BODIES.pixie), 45, "Pixie: staff cds untouched");
  eq(G.itemCd({ key: "blade", cd: 20 }, BODIES.pixieR), 10, "Senior Pixie: sword cds ×0.5");
  eq(G.itemCd({ key: "fire", cd: 45 }, BODIES.lizardWizard), 34, "Lizard Wizard: staff cds ×0.75 (45→34)");
  // symmetric: a foe Pixie's sword gear charges faster at spawn
  eq(G.spawnEnemy("pixie", ["blade"]).equipment[0].cd, 15, "foe Pixie's sword item cd is school-shortened");
  eq(G.spawnEnemy("pixie", ["fire"]).equipment[0].cd, 45, "foe Pixie's staff item cd is not");
}

// ---- ALLY-TARGET SLOT (V2 §4.1) ----------------------------------------------
{
  const r = G.newRoom("AT");
  const p1 = G.addPlayer(r, "p1", "A"), p2 = G.addPlayer(r, "p2", "B");
  r.phase = "playing"; r.laneCount = 2; r.lanes = [[G.spawnEnemy("pixie")], []]; r.allies = [[], []];
  r.caravan = { hp: 1e9, max: 1e9 };
  p1.lane = 0; p2.lane = 1;
  p1.maxHp = p1.hp = 100; p2.maxHp = 100; p2.hp = 40;
  p1.inv = [{ key: "heal", charge: 0, cd: KIT.heal.cd }];
  G.setAllyTarget(r, p1, "p2");
  fire(r, p1, 0);
  eq(p2.hp, 42, "Heal reads the ally-target — cross-lane, exact ally (staff+2)");
  // fallback: no ally-target → most-hurt friendly in YOUR lane (self included)
  G.setAllyTarget(r, p1, null); p1.hp = 50;
  fire(r, p1, 0);
  ok(p1.hp === 52 && p2.hp === 42, "no ally-target → falls back to most-hurt in own lane (self)");
  // a dead ally-target also falls back
  G.setAllyTarget(r, p1, "p2"); p2.alive = false;
  fire(r, p1, 0);
  ok(p1.hp === 54 && p2.hp === 42, "dead ally-target → fallback, never a wasted heal");
}

// ---- AURA TOKENS (V2 §4.2) -----------------------------------------------------
{
  // Flag: +1 to the lane's outgoing hits
  { const { r, p, foe } = rig("pixie", { inv: ["blade", "flag"] });
    fire(r, p, 1);
    eq(r.allies[0][0]?.bodyKey, "flag", "Flag item summons the flag token");
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 3, "flag aura: lane ally deals +1 (1+1+1)");
    // same aura type does NOT stack — strongest applies
    allyToken(r, "flag");
    const h1 = foe.hp; fire(r, p, 0);
    eq(h1 - foe.hp, 3, "two flags don't stack (+1, not +2)"); }
  // Totem: −1 to the lane's incoming hits; the token is NOT covered by its own aura
  { const { r, p } = rig("pixie");
    const tot = allyToken(r, "totem");
    G.resolveOps(r, p === null ? null : { side: "foe", lane: 0 }, [], null); // noop guard
    const foe = r.lanes[0][0];
    G.resolveOps(r, foe, [{ do: "deal", amount: 2, target: "lane" }]); // lane AoE hits everyone
    eq(p.hp, 99, "totem aura: hero takes −1 from the AoE (2→1)");
    eq(tot.hp, 1, "the totem itself takes the FULL hit (no self-cover)"); }
  // symmetric: a FOE-side totem softens the player's hits on its lane-mates
  { const { r, p, foe } = rig("pixie", { inv: ["blade"] });
    const ftot = G.spawnEnemy("totem"); ftot.side = "foe"; ftot.lane = 0; r.lanes[0].push(ftot);
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 1, "foe totem aura: player's hit softened (1+1−1)"); }
  // Knight: summon item, attacks on its own clock, and buffs lane-mates' damage
  { const { r, p, foe } = rig("pixie", { inv: ["knightBanner"] });
    fire(r, p, 0);
    eq(r.allies[0][0]?.bodyKey, "knight", "Hedgefund Knight item summons the knight");
    for (let t = 0; t < 20; t++) G.simulateTick(r);
    eq(foe.maxHp - foe.hp, 1, "the knight attacks every 2s (phys 1)"); }
  // a rat under a flag hits harder (aura applies to summons' attacks too)
  { const { r, foe } = rig("pixie");
    allyToken(r, "rat"); allyToken(r, "flag");
    for (let t = 0; t < 20; t++) G.simulateTick(r);
    eq(foe.maxHp - foe.hp, 2, "flag aura boosts an ally rat's attack (1+1)"); }
}

// ---- THORNS (V2 §4.6, Spikes) ---------------------------------------------------
{
  const { r, p, foe } = rig("pixie", { inv: ["spikes"] });
  fire(r, p, 0);
  eq(p.thorns, 1, "Spikes grants a 1-point thorns buff");
  const h0 = foe.hp;
  G.resolveOps(r, foe, [{ do: "deal", amount: 2, target: "front" }]);
  ok(p.hp === 98 && h0 - foe.hp === 1, "a striker takes 1 back from a thorned defender");
  // AoE doesn't trigger thorns (no single striker contact)
  const h1 = foe.hp;
  G.resolveOps(r, foe, [{ do: "deal", amount: 1, target: "lane" }]);
  eq(h1 - foe.hp, 0, "lane AoE is NOT reflected");
  // per-fight: beginCombat wipes it
  G.beginCombat(r);
  eq(p.thorns, 0, "thorns expire at the next fight's start");
}

// ---- CHARGE DRAIN (V2 §4.7, Blizzard) --------------------------------------------
{
  const { r, p, foe } = rig("lizardWizard", { inv: ["blizzard"] });
  const armed = G.spawnEnemy("pixie", ["fire"]); armed.hp = armed.maxHp = 50; r.lanes[0].push(armed);
  armed.equipment[0].charge = 30; armed.charge = 15; foe.charge = 12;
  const h0 = foe.hp, a0 = armed.hp;
  fire(r, p, 0);
  ok(h0 - foe.hp === 3 && a0 - armed.hp === 3, "Blizzard hits EVERY foe in your lane (2+1 each)");
  eq(armed.equipment[0].charge, 20, "…and drains 10 from item clocks");
  ok(armed.charge === 5 && foe.charge === 2, "…and from body clocks (floor 0)");
}

// ---- DAMAGED-ACCELERATES-TIMER (V2 §4.8, Atlas) -----------------------------------
{
  const { r, p } = rig("atlas");
  G.damagePlayer(r, p, 1);                       // +10 charge into the every-40 clock
  for (let t = 0; t < 29; t++) G.simulateTick(r);
  eq(p.counters ?? 0, 0, "Atlas clock not yet full (10+29 < 40)");
  G.simulateTick(r);
  eq(p.counters, 1, "a hit shaved 1s off Atlas's ramp (fires at 10+30)");
}

// ---- FRONT-2 TARGETING (V2 §4.9, Spear) -------------------------------------------
{
  const { r, p, foe } = rig("pixie", { inv: ["spear"] });
  const f2 = G.spawnEnemy("vampire"); f2.hp = f2.maxHp = 50; r.lanes[0].push(f2);
  const f3 = G.spawnEnemy("vampire"); f3.hp = f3.maxHp = 50; r.lanes[0].push(f3);
  fire(r, p, 0);
  ok(foe.maxHp - foe.hp === 4 && f2.maxHp - f2.hp === 4, "Spear hits the front TWO foes (3+1 each)");
  eq(f3.maxHp - f3.hp, 0, "…and not the third");
}

// ---- PLAYER-CAST SUMMON ITEMS (V2 §4.10) ------------------------------------------
{
  const { r, p, foe } = rig("pixie", { inv: ["summonRat", "summonBigRat"] });
  fire(r, p, 0); fire(r, p, 1);
  ok(r.allies[0].some((a) => a.bodyKey === "rat") && r.allies[0].some((a) => a.bodyKey === "largeRat"),
    "Rat + Summon Large Rat put tokens in your lane");
  for (let t = 0; t < 20; t++) G.simulateTick(r);
  eq(foe.maxHp - foe.hp, 3, "rat (1) + large rat (2) both attack every 2s");
}

// ---- Darkness lifesteal -------------------------------------------------------------
{
  const { r, p, foe } = rig("lizardWizard", { inv: ["darkness"] });
  p.hp = 50;
  const h0 = foe.hp; fire(r, p, 0);
  ok(h0 - foe.hp === 4 && p.hp === 54, "Darkness deals staff+3 and heals the damage dealt");
}

// ---- Trusty Shield: starts fully charged each fight ----------------------------------
{
  const { r, p } = rig("pixie", { inv: ["trustyShield"] });
  eq(p.inv[0].charge, 0, "before the fight the bar is empty");
  G.beginCombat(r);
  eq(p.inv[0].charge, G.itemCd(p.inv[0], BODIES.pixie), "beginCombat pre-charges a startCharged item");
  G.useItem(r, p, 0);
  eq(p.shield, 2, "…so it can fire on the first tick (2 shield)");
}

// ---- Wind pushes the aimed foe to the BACK of its lane --------------------------------
{
  const { r, p, foe } = rig("pixie", { inv: ["wind"] });
  const f2 = G.spawnEnemy("vampire"); f2.hp = f2.maxHp = 50; r.lanes[0].push(f2);
  p.targetId = foe.id;
  fire(r, p, 0);
  ok(r.lanes[0][0] === f2 && r.lanes[0][1] === foe, "Wind reorders the lane (front foe sent to the back)");
  eq(foe.maxHp - foe.hp, 1, "…after dealing staff+1 (1+0)");
}

// ---- Gang Up: +1 per other ally in your lane -------------------------------------------
{
  const { r, p, foe } = rig("pixie", { inv: ["gangUp"] });
  r.level = { nodes: [], currentId: null };       // pin the rig's board (addPlayer won't resync lanes)
  const p2 = G.addPlayer(r, "p2", "B"); p2.lane = 0;
  allyToken(r, "rat");
  const h0 = foe.hp; fire(r, p, 0);
  eq(h0 - foe.hp, 4, "Gang Up: 1 + sword 1 + 2 other allies (teammate + rat)");
}

// ---- Lightning hits YOUR lane (not the aimed lane) --------------------------------------
{
  const { r, p, foe } = rig("lizardWizard", { inv: ["lightning"] });
  r.laneCount = 2; r.lanes.push([G.spawnEnemy("pixie")]); r.allies.push([]);
  const other = r.lanes[1][0]; other.hp = other.maxHp = 50;
  p.targetId = other.id;                          // aimed across the board
  fire(r, p, 0);
  ok(foe.maxHp - foe.hp === 3 && other.hp === other.maxHp,
    "lane deals hit the caster's OWN lane (2+1), never the aimed lane");
}

// ---- school triggers (onSword) ----------------------------------------------------------
{
  // Vampire heals 1 (common) whenever it swords
  { const { r, p, foe } = rig("vampire", { inv: ["blade"] }); p.hp = 50; const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 3, "Vampire Sword deals 1+2 sword"); eq(p.hp, 51, "Vampire heals 1 on sword (common)"); }
  // …rare heals 3
  { const { r, p } = rig("vampireR", { inv: ["blade"] }); p.hp = 50; fire(r, p, 0);
    eq(p.hp, 53, "Senior Vampire heals 3 on sword"); }
  // a neutral body's sword item fires NO school heal
  { const { r, p } = rig("pixie", { inv: ["blade"] }); p.hp = 50; fire(r, p, 0);
    eq(p.hp, 50, "no school trigger on a body without one"); }
}

// ---- rooms: per-foe modifiers + global timers --------------------------------------------
{
  const lz = G.spawnEnemy("lizardWizard", []); G.applyEnchantToFoe(lz, { foeHpMul: 1.2 });
  eq(lz.maxHp, 6, "Toughened: +20% foe HP (5→6)");
  const a = G.spawnEnemy("pixie", []); G.applyEnchantToFoe(a, { foeDmgMul: 1.2 });
  eq(a.dmgMul, 1.2, "Aggressive: foe carries a damage multiplier");
  const h = G.spawnEnemy("pixie", []); G.applyEnchantToFoe(h, { foeCdMul: 0.8 });
  eq(h.cdMul, 0.8, "Hasted: foe clocks shortened");
  eq(G.roomTimersFor({ roomTimer: { kind: "acid", cd: 60, amount: 1 } }).length, 1, "Acid Rain yields a room timer");
  eq(G.roomTimersFor({ foeHpMul: 1.2 }).length, 0, "per-foe rooms carry no global timer");

  // Acid Rain hits the hero on its clock
  { const { r, p } = rig("pixie"); r.roomTimers = G.roomTimersFor({ roomTimer: { kind: "acid", cd: 60, amount: 1 } });
    const h0 = p.hp; for (let t = 0; t < 130; t++) G.simulateTick(r);
    eq(h0 - p.hp, 2, "Acid Rain deals 1 to the hero every 6s (2 in 13s)"); }
  // Rat Colony spawns enemy rats on its clock
  { const { r } = rig("pixie"); r.roomTimers = G.roomTimersFor({ roomTimer: { kind: "ratSpawn", cd: 30 } });
    const f0 = r.lanes[0].length; for (let t = 0; t < 95; t++) G.simulateTick(r);
    ok(r.lanes[0].length - f0 === 3, "Rat Colony spawns an enemy rat every 3s (3 in 9.5s)"); }
}

// ---- economy / difficulty weights ---------------------------------------------------------
{
  eq(G.bodyAnteOf({ bodyKey: "runebladeU" }), 2, "uncommon body ante = 2 (its tier)");
  eq(G.anteOfFoe({ bodyKey: "pixie", gear: ["fire"] }), 2, "foe ante = body(1) + item(1)");
  eq(G.itemTreasure("scaryKnife"), 2, "an uncommon item's treasure = 2");
  eq(G.itemTreasure("blizzard"), 3, "a rare item's treasure = 3");
  eq(G.shopPrice("slimeCrown"), 9, "shop price = ante × 3 (rare crown = 9)");
}

// ---- draft wheel: COMMONS only (bodies AND bundled items) ---------------------------------
{
  const wheel = G.rollDraftWheel(4);
  ok(wheel.every((b) => BODIES[b.bodyKey]?.rarity === "common"), "the wheel draws common bodies only");
  ok(wheel.every((b) => b.items.every((k) => KIT[k]?.rarity === "common")), "draft bundles hold common items only");
  ok(wheel.every((b) => b.items.some((k) => (KIT[k].ops ?? []).some((o) => o.do === "deal"))),
    "every bundle still guarantees a damaging item");
}

// ---- shop shelf is rolled, distinct, priced -------------------------------------------------
{
  const wares = G.rollShopWares();
  eq(wares.length, 5, "the shelf holds 5 wares");
  eq(new Set(wares.map((w) => w.key)).size, 5, "…all distinct");
  ok(wares.every((w) => w.cost === G.shopPrice(w.key)), "…each priced at ante×3");
}

// ---- late join: a player joining mid-combat lands in a real lane (no tick crash) ----
{
  const r = G.newRoom("LJ");
  const p1 = G.addPlayer(r, "p1", "Host");
  G.startDraft(r); G.chooseClass(r, p1, "warrior");   // draft completes → enterRoom (solo: 1 lane)
  G.commitStock(r); G.beginCombat(r);
  eq(r.laneCount, 1, "solo run is 1 lane");
  const p2 = G.addPlayer(r, "p2", "Late");
  eq(p2.lane, 0, "late joiner is clamped into a live lane");
  let crashed = false;
  try { G.simulateTick(r); } catch { crashed = true; }
  ok(!crashed, "tick survives a mid-combat late join");
}

// ---- lobby/draft board preview tracks the party size (lanes = players) --------------
{
  const r = G.newRoom("LC");
  G.addPlayer(r, "p1", "A");
  eq(r.laneCount, 1, "lobby: 1 player → 1-lane preview");
  G.addPlayer(r, "p2", "B");
  eq(r.laneCount, 2, "lobby: 2 players → 2-lane preview");
  G.startDraft(r);
  eq(r.laneCount, 2, "draft keeps the party-size preview");
  for (const p of r.players.values()) G.chooseClass(r, p, "warrior"); // → startLevel/enterRoom
  eq(r.laneCount, 2, "the live run derives the same count (2 players = 2 lanes)");
  r.players.delete("p2"); G.syncLobbyLanes(r);
  eq(r.laneCount, 2, "mid-run, a leaver does NOT reshape the live board");
}

// ---- foe lane-AoE hits the WHOLE hero side, not just the blocker --------
{
  const { r, p, foe } = rig("pixie");
  allyToken(r, "rat");
  G.resolveOps(r, foe, [{ do: "deal", amount: 1, target: "lane" }], "magical"); // lizardWizard: staff 1 → 2 each
  eq(p.hp, 98, "foe lane deal hits the hero behind the summon (1+1 staff)");
  eq(r.allies[0].length, 0, "…and the summon too (rat dies to the same AoE)");
  // single-target foe deal still respects the blocker
  const { r: r2, p: p2, foe: f2 } = rig("pixie");
  allyToken(r2, "rat");
  G.resolveOps(r2, f2, [{ do: "deal", amount: 1, target: "front" }], "magical");
  eq(p2.hp, 100, "single-target foe deal is still eaten by the front summon");
}

// ---- summoning a deleted body spawns nothing (no 0-HP ghosts holding a ward) --------
{
  const { r, foe } = rig("pixie");
  G.resolveOps(r, foe, [{ do: "summonArmed", body: "killionaire", gear: ["fire"], count: 1 }]);
  eq(r.lanes[0].length, 1, "summon of an unknown body is a no-op");
  G.resolveOps(r, foe, [{ do: "summon", body: "rat", count: 1 }]);
  eq(r.lanes[0].length, 2, "summon of a known body still works");
}

// ---- publicBodies cache tracks the HP knob ------------------------------------------
{
  G.setHpMult(2);
  eq(G.publicBodies().royalRat.maxHp, 10, "publicBodies reflects HP_MULT=2");
  G.setHpMult(1);
  eq(G.publicBodies().royalRat.maxHp, 5, "publicBodies cache invalidates when the knob changes");
}

// ---- player-only items never roll onto foes ------------------------------------------
{
  let bad = false;
  for (let i = 0; i < 50; i++) for (const o of G.buildFoePool())
    if ((o.gear ?? []).some((k) => k === "wind" || k === "heal" || k === "blizzard")) bad = true;
  ok(!bad, "no rolled foe ever carries Wind / Heal / Blizzard");
}

console.log(fail ? `\n❌ FAILURES — ${pass} passed, ${fail} failed.` : `\n✅ ALL PASS — ${pass} passed, 0 failed.`);
if (fail) process.exit(1);
