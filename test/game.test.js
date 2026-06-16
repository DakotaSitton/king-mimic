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
  const gen = Object.keys(BODIES).filter((k) => BODIES[k].family);
  eq(gen.length, 36, "12 templates × 3 variants = 36 generated bodies");
  ok(G.SET_COMMONS.every((k) => BODIES[k]?.gold === 1), "every template's base variant (gold 1) exists under its bare key");
  ok(G.SET_COMMONS.every((k) => BODIES[k + "U"]?.gold === 3 && BODIES[k + "R"]?.gold === 5),
    "every template has U (gold 3) / R (gold 5) variants — NO rarity classes, just prices");
  eq(Object.keys(KIT).length, 31, "the kit is 31 items (24 first-set + the 7-item post-floor-3 wave)");
  ok(Object.values(KIT).every((i) => i.rarity === undefined), "items carry NO rarity class — only individual gold values");
  const counts = Object.values(KIT).reduce((a, i) => { a[i.ante] = (a[i.ante] ?? 0) + 1; return a; }, {});
  ok(counts[1] === 12 && counts[2] === 8 && counts[3] === 3 && counts[4] === 4 && counts[5] === 2 && counts[6] === 2,
    "per-item values: 12×1g / 8×2g / 3×3g / 4×4g / 2×5g / 2×6g (wave prices are [PLACEHOLDER])");
  ok(!BODIES.auditAngel && !KIT.trustyBlade && !KIT.trustyStaff, "retired V1 bodies/items are gone");
  // variant table: HP ×1/×1.6/×2.4 (rounded) + 1 (owner 2026-06-12: "everything +1 hp"),
  // Power +0/+1/+2, gold 1/3/5
  eq(BODIES.pixie.maxHp, 8, "base attacker HP = base + 1 (7→8)");
  eq(BODIES.pixieU.maxHp, 12, "U variant HP = ×1.6 rounded + 1 (7→12)");
  eq(BODIES.pixieR.maxHp, 18, "R variant HP = ×2.4 rounded + 1 (7→18)");
  ok(BODIES.pixie.phys === 1 && BODIES.pixieU.phys === 2 && BODIES.pixieR.phys === 3, "Power steps +0/+1/+2");
  ok(BODIES.pixie.gold === 1 && BODIES.pixieU.gold === 3 && BODIES.pixieR.gold === 5, "per-body gold 1/3/5");
  // [PLACEHOLDER] seniority naming: Junior X / X / Senior X
  ok(BODIES.royalRat.name === "Junior Royal Rat" && BODIES.royalRatU.name === "Royal Rat"
    && BODIES.royalRatR.name === "Senior Royal Rat", "variant naming = Junior/—/Senior prefixes");
  // Runeblade override: growth lives in its PHYS (1/2/3), mag stays 1 (binary cross-school)
  ok(BODIES.runeblade.phys === 1 && BODIES.runebladeU.phys === 2 && BODIES.runebladeR.phys === 3
    && BODIES.runebladeR.mag === 1, "Runeblade scales phys 1/2/3, mag fixed at 1");
}

// ---- HP knob ---------------------------------------------------------------
{
  G.setHpMult(2);
  eq(G.bodyMaxHp(BODIES.royalRat), 12, "HP_MULT=2 doubles a body (royalRat 6→12; base is 5+1 — owner +1 HP)");
  eq(G.caravanMaxHp(), 40, "HP_MULT=2 doubles the caravan (20→40)");
  eq(G.spawnEnemy("pixie").maxHp, 16, "a spawned foe is doubled (pixie 8→16)");
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
    for (let t = 0; t < 64; t++) G.simulateTick(r);
    eq(r.allies[0].length, 0, "clock not yet full (15+64 < 80)");
    G.simulateTick(r);
    eq(r.allies[0].length, 1, "worn Royal Rat's rat arrives 1.5s early (fires at 15+65)"); }
  // …and the rare summons 3 per clock fire
  { const { r, p } = rig("royalRatR", { inv: ["fire"] }); fire(r, p, 0);
    for (let t = 0; t < 65; t++) G.simulateTick(r);
    eq(r.allies[0].length, 3, "Senior Royal Rat summons 3 rats per fire"); }
  // Paid Piper: the sword-side mirror
  { const { r, p } = rig("paidPiper", { inv: ["blade"] }); fire(r, p, 0);
    for (let t = 0; t < 65; t++) G.simulateTick(r);
    eq(r.allies[0].length, 1, "worn Paid Piper's clock is fed by sword items"); }
  // …and the base clock still fires on its own with no trigger at all
  { const { r } = rig("fatCat"); for (let t = 0; t < 80; t++) G.simulateTick(r);
    eq(r.allies[0].length, 1, "an untriggered summon clock fires at its base 8s"); }
  // Fat Cat (worn): taking a hit feeds the clock
  { const { r, p } = rig("fatCat"); G.damagePlayer(r, p, 1);
    for (let t = 0; t < 65; t++) G.simulateTick(r);
    eq(r.allies[0].length, 1, "worn Fat Cat's clock jumps 1.5s when the player is hit"); }
  // Wageslave (worn): heals every 3s (common: 2)
  { const { r, p } = rig("wageslave", { pHp: 100 }); p.hp = 50; for (let t = 0; t < 115; t++) G.simulateTick(r);
    eq(p.hp, 54, "worn Wageslave heals 2 every 5.5s (2 ticks in 11.5s)"); }
  // Minotaur (worn, redial 2026-06-12): counter is a 4s CLOCK that incoming hits feed 1s
  { const { r, p, foe } = rig("minotaur"); const h0 = foe.hp; G.damagePlayer(r, p, 1);
    eq(h0 - foe.hp, 0, "worn Minotaur no longer counters instantly on hit");
    for (let t = 0; t < 55; t++) G.simulateTick(r);
    eq(h0 - foe.hp, 1, "the counter clock fires sword Power (1) — hit fed 1.5s, 5.5s ticked"); }
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

// ---- ECHO (owner redesign 2026-06-12): the bar charges, every use PUSHES IT BACK; ----
// ---- full bar = foe auto-arms / player gets the ECHO button; armed = next double ----
{
  // unarmed: a matching item resolves ONCE
  { const { r, p, foe } = rig("centaur", { inv: ["blade"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 2, "unarmed echo body: sword item resolves once (1+1)"); }
  // an untouched bar fills in 6s → the PLAYER's button lights; arming is THEIR tap
  { const { r, p } = rig("centaur"); for (let t = 0; t < G.ECHO_CD; t++) G.simulateTick(r);
    ok(p.echoReady && !p.echoArmed, "a full bar lights the ECHO button — it never self-arms for a player");
    ok(G.armEcho(r, p) && p.echoArmed && !p.echoReady, "tapping the button arms the double");
    eq(G.armEcho(r, p), false, "…and the button is spent until the next full bar"); }
  // every use pushes the bar back — spam never reaches the double…
  { const { r, p } = rig("centaur", { inv: ["blade"] });
    for (let t = 1; t <= 200; t++) { G.simulateTick(r); if (t % 10 === 0) fire(r, p, 0); }
    ok(!p.echoReady && !p.echoArmed && (p.echoCharge ?? 0) < G.ECHO_CD,
      "pressing every 1s pushes the bar back faster than it fills — spam never echoes"); }
  // …while a slow heavy rhythm charges straight through the pushback
  { const { r, p } = rig("centaur", { inv: ["blade"] });
    for (let t = 1; t <= 200; t++) { G.simulateTick(r); if (t % 50 === 0 && !p.echoReady) fire(r, p, 0); }
    ok(p.echoReady, "a slow 5s rhythm reaches the double — big slow buttons get paid"); }
  // a FOE echo body arms itself on a full bar — no hands, no button
  { const { r } = rig("pixie", { foeBody: "centaur" });
    const foe = r.lanes[0][0];
    for (let t = 0; t < G.ECHO_CD; t++) G.simulateTick(r);
    ok(foe.echoArmed && !foe.echoReady, "a foe echo body auto-arms on a full bar (interface differs, mechanic doesn't)"); }
  // armed + matching school → ×2, charge consumed (the doubling machinery is unchanged)
  { const { r, p, foe } = rig("centaur", { inv: ["blade"] }); p.echoArmed = true;
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 4, "armed echo(sword) doubles a sword item ((1+1)×2)");
    eq(!!p.echoArmed, false, "the doubled press consumes the charge"); }
  // armed + WRONG school → ×1, charge kept
  { const { r, p, foe } = rig("centaur", { inv: ["fire"] }); p.echoArmed = true;
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 3, "armed echo(sword) does NOT double a staff item (3+0)");
    eq(p.echoArmed, true, "an off-school press leaves the charge lit"); }
  // Mouse (echo staff) + Fireball, armed → (3+1) × 2
  { const { r, p, foe } = rig("mouse", { inv: ["fire"] }); p.echoArmed = true;
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 8, "armed echo(staff) doubles a staff item ((3+1)×2)"); }
  // echo doubles the ITEM, not the school trigger (Royal Rat would be 2 rats otherwise)
  { const { r, p } = rig("mouse", { inv: ["summonRat"] }); p.echoArmed = true; fire(r, p, 0);
    eq(r.allies[0].length, 2, "echo doubles a summon item's ops (2 rats)"); }
  // the dead armed-clock is gone from the templates; the bar resets with the body
  ok(!(BODIES.centaur.passive ?? []).length && !(BODIES.mouse.passive ?? []).length,
    "the old every-4s echoArm clock is ripped out of centaur/mouse");
  { const { r, p } = rig("centaur"); p.echoReady = true;
    G.wearBody(p, "pixie");
    ok(!p.echoReady && !p.echoCharge, "swapping bodies drops the old body's echo state"); }
}

// ---- THE POST-FLOOR-3 WAVE (owner spitball, built 2026-06-12): buffs + panic buttons --
{
  // Haste: items charge double-speed while it runs
  { const { r, p } = rig("minotaur", { inv: ["haste", "hatchet"] });  // tempo-neutral body (pixie's sword-CDR would bend the cap)
    fire(r, p, 0);
    ok(G.hasBuff(p, "haste"), "Haste applies its timed buff");
    for (let t = 0; t < 43; t++) G.simulateTick(r);
    eq(p.inv[1].charge, KIT.hatchet.cd, "an 8.5s hatchet is FULL after ~4.3s under Haste"); }
  // Power Boost feeds BOTH schools through effPhys/effMag (previews inherit it)
  { const { r, p, foe } = rig("pixie", { inv: ["powerBoost", "blade"] });
    fire(r, p, 0);
    eq(G.effPhys(p), 3, "Power Boost: +2 sword Power on a 1-sword body");
    const h0 = foe.hp; fire(r, p, 1);
    eq(h0 - foe.hp, 4, "…and the hit lands with it (1 base + 1 phys + 2 boost)");
    for (let t = 0; t < 121; t++) G.simulateTick(r);
    eq(G.effPhys(p), 1, "the boost expires on schedule"); }
  // Stone Skin softens hits — for players AND foes (1:1 symmetry)
  { const { r, p } = rig("pixie");
    G.addBuff(p, "stoneskin", 2, 80);
    G.damagePlayer(r, p, 3);
    eq(100 - p.hp, 1, "Stone Skin: a 3-hit lands for 1 on a player"); }
  { const { r, p, foe } = rig("pixie", { inv: ["blade"] });
    G.addBuff(foe, "stoneskin", 2, 80);
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 0, "a Stone-Skinned FOE shrugs the same hit (2−2, no weapon-floor override of DR)"); }
  // Omnislash: four separate strikes (sim redial: +2 base each — amount-0 was dominated)
  { const { r, p, foe } = rig("mouse", { inv: ["omnislash"] });
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 8, "Omnislash on a 0-sword body: 4 strikes × (2+0)"); }
  { const { r, p, foe } = rig("vampire", { inv: ["omnislash"] });
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 16, "…and 4 × (2 + sword 2) on a real swordarm"); }
  // Giga Cast: once per fight, the NEXT staff item ×4 (sword presses don't consume it)
  { const { r, p, foe } = rig("lizardWizard", { inv: ["gigaCast", "fire", "blade"] });
    fire(r, p, 0);
    ok(p.gigaArmed && p.inv[0].spent, "Giga Cast arms and is spent (fragile)");
    fire(r, p, 2);
    ok(p.gigaArmed, "a sword press does NOT consume the giga charge");
    const h1 = foe.hp; fire(r, p, 1);
    eq(h1 - foe.hp, 16, "the next staff item resolves ×4 ((3+1)×4)");
    ok(!p.gigaArmed, "…and the charge is consumed"); }
  // Time Stop: the whole foe machine stands still for 3s
  { const { r, p } = rig("pixie", { inv: ["timeStop"] });
    const foe = G.spawnEnemy("centaur", ["blade"]); foe.hp = foe.maxHp = 1000; r.lanes[0] = [foe];
    fire(r, p, 0);
    eq(r.freezeFoes, 45, "Time Stop freezes the foe side for 4.5s");
    for (let t = 0; t < 44; t++) G.simulateTick(r);
    eq(foe.equipment[0].charge, 0, "a frozen foe's item never charges");
    for (let t = 0; t < 10; t++) G.simulateTick(r);
    ok(foe.equipment[0].charge >= 9, "…and time resumes when the stop ends"); }
  // Revive: a downed teammate stands back up at FULL
  { const { r, p } = rig("pixie", { inv: ["revive"] });
    const q = G.addPlayer(r, "q", "Q"); G.wearBody(q, "pixie");
    q.lane = 0; q.depth = 1; q.hp = 0; q.alive = false;
    fire(r, p, 0);
    ok(q.alive && q.hp === q.maxHp, "Revive stands a downed teammate back up at FULL HP");
    ok(p.inv[0].spent, "…once per fight"); }
  ok(KIT.timeStop.startCharged && KIT.revive.startCharged && KIT.gigaCast.startCharged,
    "the panic buttons open every fight ready to press");
}

// ---- foe-item audit (owner 2026-06-12: "never seen a blizzard") -----------------------
{
  // a foe Blizzard now drains the heroes' hotbars (it was a documented no-op vs inv)
  { const { r, p } = rig("pixie", { inv: ["hatchet"] });
    p.inv[0].charge = 15;
    const foe = G.spawnEnemy("mouse", []); foe.hp = foe.maxHp = 1000; foe.side = "foe"; foe.lane = 0;
    r.lanes[0] = [foe];
    G.resolveOps(r, foe, KIT.blizzard.ops, "magical");
    eq(p.inv[0].charge, 5, "a foe Blizzard drains 10 charge off the hero's items — symmetric at last"); }
  // pool membership: blizzard/omnislash roll onto foes now; wind/heal and the panic buttons never
  { const seen = new Set();
    for (let i = 0; i < 300; i++) for (const o of G.buildFoePool()) (o.gear ?? []).forEach((g) => seen.add(g));
    ok(seen.has("blizzard"), "Blizzard rolls onto foes now");
    ok(seen.has("omnislash"), "Omnislash rolls onto foes (premium melee)");
    ok(!seen.has("wind") && !seen.has("heal"), "wind/heal stay player-only — their exile reasons still stand");
    ok(["timeStop", "revive", "gigaCast", "haste", "powerBoost", "stoneSkin"].every((k) => !seen.has(k)),
      "the wave's buffs/panic buttons never roll onto foes (parked for an owner verdict)"); }
}

// ---- SCHOOL CDR (V2 §4.4) -----------------------------------------------------
{
  eq(G.itemCd({ key: "blade", cd: 20 }, BODIES.pixie), 15, "Pixie: sword cds ×0.75 (20→15)");
  eq(G.itemCd({ key: "fire", cd: 45 }, BODIES.pixie), 45, "Pixie: staff cds untouched");
  eq(G.itemCd({ key: "blade", cd: 20 }, BODIES.pixieR), 10, "Senior Pixie: sword cds ×0.5");
  eq(G.itemCd({ key: "fire", cd: 45 }, BODIES.lizardWizard), 34, "Lizard Wizard: staff cds ×0.75 (45→34)");
  // symmetric: a foe Pixie's sword gear charges faster at spawn
  eq(G.spawnEnemy("pixie", ["blade"]).equipment[0].cd, 30, "foe Pixie's sword item cd is school-shortened");
  eq(G.spawnEnemy("pixie", ["fire"]).equipment[0].cd, 80, "foe Pixie's staff item cd is not");
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
    for (let t = 0; t < 40; t++) G.simulateTick(r);
    eq(foe.maxHp - foe.hp, 1, "the knight attacks every 4s (phys 1)"); }
  // a rat under a flag hits harder (aura applies to summons' attacks too)
  { const { r, foe } = rig("pixie");
    allyToken(r, "rat"); allyToken(r, "flag");
    for (let t = 0; t < 40; t++) G.simulateTick(r);
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
  G.damagePlayer(r, p, 1);                       // +15 charge into the every-70 clock
  for (let t = 0; t < 54; t++) G.simulateTick(r);
  eq(p.counters ?? 0, 0, "Atlas clock not yet full (15+54 < 70)");
  G.simulateTick(r);
  eq(p.counters, 1, "a hit shaved 1.5s off Atlas's ramp (fires at 15+55)");
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
  for (let t = 0; t < 40; t++) G.simulateTick(r);
  eq(foe.maxHp - foe.hp, 3, "rat (1) + large rat (2) both attack every 4s");
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

// ---- MELEE strikes YOUR lane's front, no matter the reticle; RANGED follows it ----------
{
  ok(!G.isRanged("blade") && !G.isRanged("scaryKnife") && !G.isRanged("hatchet"), "sword items default MELEE");
  ok(G.isRanged("fire") && G.isRanged("magicMissile") && G.isRanged("darkness"), "staff items default RANGED");
  ok(G.isRanged("bow") && G.isRanged("crossbow"), "Bow/Crossbow: explicitly ranged physicals");
  const { r, p, foe } = rig("pixie", { inv: ["blade", "bow"] });
  r.laneCount = 2; r.lanes.push([G.spawnEnemy("vampire")]); r.allies.push([]);
  const far = r.lanes[1][0]; far.hp = far.maxHp = 50;
  p.targetId = far.id;                            // reticle aimed TWO lanes over
  fire(r, p, 0);                                  // Sword (melee)
  ok(foe.maxHp - foe.hp === 2 && far.hp === far.maxHp,
    "melee ignores the reticle — it strikes YOUR lane's front (no sideways sword lunges)");
  fire(r, p, 1);                                  // Bow (ranged)
  eq(far.maxHp - far.hp, 2, "ranged follows the reticle cross-lane");
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
  eq(lz.maxHp, 7, "Toughened: +20% foe HP (6→7; base is 5+1 — owner +1 HP)");
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
  eq(G.itemTreasure("scaryKnife"), 2, "a 2g item's treasure = 2");
  eq(G.itemTreasure("blizzard"), 4, "a 4g item's treasure = 4");
  eq(G.shopPrice("slimeCrown"), 4, "shops sell at FACE VALUE — no markup (owner 2026-06-12)");
}

// ---- draft wheel: CHEAP entries only (gold-1 bodies AND value-1 bundled items) -------------
{
  const wheel = G.rollDraftWheel(4);
  ok(wheel.every((b) => BODIES[b.bodyKey]?.gold === 1), "the wheel draws gold-1 bodies only");
  ok(wheel.every((b) => b.items.every((k) => (KIT[k]?.ante ?? 9) <= 1)), "draft bundles hold value-1 items only");
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
  G.addGreedy(r, p1, 0);                              // place the one required invite
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
  eq(G.publicBodies().royalRat.maxHp, 12, "publicBodies reflects HP_MULT=2");
  G.setHpMult(1);
  eq(G.publicBodies().royalRat.maxHp, 6, "publicBodies cache invalidates when the knob changes");
}

// ---- UNIFIED FRIENDLY LINE: step in front of (and behind) your summons -----------------
{
  const { r, p, foe } = rig("pixie");
  G.resolveOps(r, p, [{ do: "summon", body: "rat", count: 1 }]);
  const rat = r.allies[0][0];
  ok((rat.depth ?? 0) < (p.depth ?? 0), "a fresh summon spawns at the FRONT of the line");
  G.resolveOps(r, foe, [{ do: "deal", amount: 1, target: "front" }]);
  ok(p.hp === 100 && r.allies[0].length === 0, "by default the rat blocks the hit (and dies for it)");
  G.resolveOps(r, p, [{ do: "summon", body: "rat", count: 1 }]);
  G.moveDepth(r, p, "fwd");                                        // step PAST the rat
  G.resolveOps(r, foe, [{ do: "deal", amount: 2, target: "front" }]);
  ok(p.hp === 98 && r.allies[0][0].hp === 1, "after ↑ YOU block — the rat is safe behind you");
  G.moveDepth(r, p, "back");                                       // drop back behind it again
  G.resolveOps(r, foe, [{ do: "deal", amount: 1, target: "front" }]);
  ok(p.hp === 98 && r.allies[0].length === 0, "after ↓ the rat blocks again");
}
// …and front-2 hits walk the unified order
{
  const { r, p, foe } = rig("pixie");
  G.resolveOps(r, p, [{ do: "summon", body: "largeRat", count: 1 }]);
  G.moveDepth(r, p, "fwd");                                        // line: [YOU, large rat]
  G.resolveOps(r, foe, [{ do: "deal", amount: 2, target: "front2" }]);
  ok(p.hp === 98, "Spear hits the front of the unified line (you)");
  eq(r.allies[0][0].hp, 1, "…and the large rat standing second");
}

// ---- SHIELDS ARE PER-FIGHT (owner bug 2026-06-12: a buffer was banking across rooms) ----
{
  const { r, p, foe } = rig("rookie");
  p.shield = 5; foe.shield = 1;          // a leftover player buffer + an Armory-style foe shield
  G.beginCombat(r);
  eq(p.shield, 0, "a player's shield expires at the start of the next fight");
  eq(foe.shield, 1, "…but spawn-granted FOE shields (Armory) survive beginCombat");
}

// ---- THE UNLOCK LADDER (owner 2026-06-12): threshold model, diff-priced upgrades --------
{
  // the formula hits the owner's exact points: gold 1 free, gold 3 = 10, gold 5 = 25
  eq(G.unlockCost(1), 0, "gold-1 threshold is free");
  eq(G.unlockCost(3), 10, "gold-3 threshold costs 10");
  eq(G.unlockCost(5), 25, "gold-5 threshold costs 25");
  const r = G.newRoom("TI");
  const p = G.addPlayer(r, "p1", "A");
  r.unlockedBodies.add("vampire");      // the party fells a gold-1 body
  ok(G.canSwapTo(r, p, "vampire"), "gold-1 bodies are free to wear the moment one is felled");
  ok(!G.canSwapTo(r, p, "vampireU"), "gold-3 needs the threshold buy-in");
  r.unlockedBodies.add("vampireU");     // fell a gold-3
  p.treasure = 9;
  ok(!G.buyUnlock(r, p, 3), "9g can't buy the 10g threshold");
  p.treasure = 10;
  ok(G.buyUnlock(r, p, 3) && G.canSwapTo(r, p, "vampireU"), "10g buys threshold 3 → ALL felled gold-3s open");
  eq(p.treasure, 0, "the 10g was spent");
  ok(!G.canSwapTo(r, p, "pixieU"), "…but ONLY ones the party has seen — un-felled siblings stay locked (owner bug 2026-06-12)");
  // the ladder credits what you paid: 25 − 10 = 15 to climb to gold 5
  ok(!G.canSwapTo(r, p, "minotaurR"), "gold-5 still locked (and not yet felled)");
  ok(!G.buyUnlock(r, p, 5), "…and can't be bought before the party fells one");
  r.unlockedBodies.add("minotaurR");
  p.treasure = 14;
  ok(!G.buyUnlock(r, p, 5), "14g can't cover the discounted 15");
  p.treasure = 15;
  ok(G.buyUnlock(r, p, 5) && G.canSwapTo(r, p, "minotaurR"), "buying the 10 discounts the 25 to 15 (owner's exact example)");
  eq(p.treasure, 0, "exactly 15 was spent");
  ok(G.canSwapTo(r, p, "vampireU"), "lower weights stay free under the raised threshold");
  ok(!G.buyUnlock(r, p, 3), "the ladder never goes down / no rebuys");
}

// ---- NO DUD FOES: every rolled foe can actually deal damage ---------------------------
{
  ok(!G.itemThreatens("royalRat", "crossbow"), "a 0-sword summoner + Repeating Crossbow = dud (blocked)");
  ok(G.itemThreatens("pixie", "crossbow"), "a sword body + Repeating Crossbow threatens");
  ok(G.itemThreatens("royalRat", "magicMissile"), "a staff body + Magic Missile threatens");
  ok(!G.itemThreatens("pixie", "magicMissile"), "a 0-staff body + Magic Missile = dud (blocked)");
  ok(G.itemThreatens("royalRat", "blade"), "flat-damage items (Sword: 1+0) are never duds");
  ok(!G.itemThreatens("pixie", "totem"), "non-damaging items never count as a threat");
  ok(G.itemThreatens("runeblade", "scaryKnife"), "cross-school phys feeds the check too");
  let dud = false;
  for (let t = 0; t < 60; t++) {
    for (const o of G.buildFoePool()) if (!G.itemThreatens(o.bodyKey, o.gear[0])) dud = true;
  }
  ok(!dud, "no palette foe ever rolls a first item it can't deal damage with");
  // the SECOND slot is school-checked too: utility fits anyone, damage must synergize
  let dud2 = false;
  for (let t = 0; t < 60; t++) {
    for (const o of G.buildFoePool()) {
      const k2 = o.gear[1];
      if (k2 && (G.KIT[k2].ops ?? []).some((x) => x.do === "deal") && !G.itemThreatens(o.bodyKey, k2)) dud2 = true;
    }
  }
  ok(!dud2, "…nor a second damage item it can't use (utility second items are fine)");
}

// ---- a weapon always lands at least 1, even on the wrong body ---------------------------
{
  // Scary Knife (sword, base 0) on a 0-sword summoner: floored to 1, not 0
  { const { r, p, foe } = rig("royalRat", { inv: ["scaryKnife"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 1, "wrong-body Scary Knife still chips for 1"); }
  // Magic Missile (staff, base 0) on a 0-staff attacker: same floor
  { const { r, p, foe } = rig("pixie", { inv: ["magicMissile"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 1, "wrong-body Magic Missile still chips for 1"); }
  // …and the floor never inflates a synergized hit
  { const { r, p, foe } = rig("pixieR", { inv: ["scaryKnife"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 3, "on the right body the knife deals its full sword Power (3)"); }
}

// ---- the palette never traps the party (a cheap option is always on offer) -------------
{
  let trapped = false;
  for (let t = 0; t < 40; t++) {
    const r = G.newRoom("CH" + t); const p = G.addPlayer(r, "p", "A");
    G.startDraft(r); G.chooseClass(r, p, "rogue");                // → enterRoom → stock
    if (!r.foePalette.some((o) => G.anteOfFoe(o) <= 3)) trapped = true;
    for (let k = 0; k < 5; k++) {                                  // …and after every reroll
      G.addFoe(r, Math.floor(Math.random() * r.foePalette.length)); // ownerless primitive (uncapped)
      if (r.phase === "stock" && !r.foePalette.some((o) => G.anteOfFoe(o) <= 3)) trapped = true;
    }
  }
  ok(!trapped, "every palette (fresh or rerolled) offers at least one ante ≤ 3 option");
}

// ---- THE ANTE FORMULA + the stocking gate (no more default enemies) ---------------------
{
  // body: T1=1 T2=3 T3=5 · items: common=1 uncommon=2 rare=4
  eq(G.bodyAnteOf({ bodyKey: "pixie" }), 1, "tier-1 body ante = 1");
  eq(G.bodyAnteOf({ bodyKey: "pixieU" }), 3, "tier-2 body ante = 3");
  eq(G.bodyAnteOf({ bodyKey: "pixieR" }), 5, "tier-3 body ante = 5");
  eq(G.anteOfFoe({ bodyKey: "pixie", gear: ["blade"] }), 2, "the floor option: T1 body + T1 item = 2");
  eq(G.anteOfFoe({ bodyKey: "atlasR", gear: ["blizzard", "crossbow"] }), 13, "the ceiling: T3 body + two rares = 13");
  // rooms arrive EMPTY; every player places EXACTLY ONE invite before combat can begin
  const r = G.newRoom("AN");
  const p1 = G.addPlayer(r, "p1", "A"), p2 = G.addPlayer(r, "p2", "B");
  G.startDraft(r);
  G.chooseClass(r, p1, "warrior"); G.chooseClass(r, p2, "cleric");   // → enterRoom (floor 1)
  // this block tests the STOCKING GATE — pin the random room modifier off so a rolled
  // Wandering Monster (which legitimately pre-stocks a foe) can't flake the assertions
  r.enchant = null; r.roomTimers = []; r.draftedFoes = r.draftedFoes.filter((f) => f.greedy);
  eq(r.draftedFoes.length, 0, "no pre-stocked baseline — the room arrives empty");
  eq(r.picksRequired, 1, "an ordinary room asks one invite per player");
  G.commitStock(r);
  eq(r.phase, "stock", "Begin is gated until EVERY player has placed theirs");
  ok(G.addGreedy(r, p1, 0), "p1 places an invite");
  ok(!G.addGreedy(r, p1, 0), "…and is CAPPED at one (no second add)");
  // removal is an UNDO (redial 2026-06-12): the original option returns to its slot, so
  // remove/re-add cycling can never fish the palette for weaker foes
  { const before = JSON.stringify(r.draftedFoes[0].opt);
    ok(G.removeGreedy(r, p1), "p1 can take the invite back");
    eq(JSON.stringify(r.foePalette[0]), before,
       "…and the SAME option is back in the slot it came from (no fresh reroll kept)");
    ok(G.addGreedy(r, p1, 0), "re-adding lands the identical pick again"); }
  G.commitStock(r);
  eq(r.phase, "stock", "one player alone can't open the gate");
  ok(G.addGreedy(r, p2, 1), "p2 places theirs");
  G.commitStock(r);
  eq(r.phase, "setup", "…and the gate opens");
  ok(r.draftedFoes.every((f) => f.greedy && f.owner), "every stocked foe is an owner-tagged invite");
}

// ---- SUMMON PLACEMENT (owner 2026-06-12): in front of you or behind you, your call ----
{
  const { r, p } = rig("mouse", { inv: ["summonRat"] });
  fire(r, p, 0);
  let line = G.laneLine(r, p.lane);
  eq(line[0].bodyKey, "rat", "default: a fresh summon steps in FRONT of you");
  p.summonSide = "back";
  fire(r, p, 0);
  line = G.laneLine(r, p.lane);
  eq(line[line.length - 1].bodyKey, "rat", "summonSide 'back': the next one tucks in BEHIND you");
  eq(line[1].id, p.id, "…with you holding the middle of your own line");
}

// ---- DRAFT KIT FIT (owner 2026-06-12): 2 in-house items + 1 wild card --------------
{
  let fit = true, dud = false, sawOffSchoolWild = false;
  for (let n = 0; n < 60; n++) {
    for (const b of G.rollDraftWheel(4)) {
      const school = (BODIES[b.bodyKey].mag ?? 0) > 0 ? "magical" : "physical";
      const inHouse = (k) => !KIT[k].type || KIT[k].type === school;
      if (!inHouse(b.items[0]) || !inHouse(b.items[1])) fit = false;
      if (!(KIT[b.items[0]].ops ?? []).some((o) => o.do === "deal")) dud = true;
      if (!inHouse(b.items[2])) sawOffSchoolWild = true;
    }
  }
  ok(fit, "every bundle's first two items are in-house (no Lizard Wizard with a Bow)");
  ok(!dud, "…slot 1 is always a damaging item (no toothless loadout)");
  ok(sawOffSchoolWild, "…and the wild card still roams off-school (the Minotaur-with-Lightning play)");
}

// ---- THE ANTE WINDOW (owner 2026-06-12, redial same night): the ratchet raises BOTH ----
// ---- ends — late-game junk drops vanish; it never goes back down -----------------------
{
  const r = G.newRoom("AW"); r.phase = "stock";
  ok(r.anteMin === 2 && r.anteCap === 5, "a fresh room starts at the base window (2–5)");
  r.foePool = [
    { bodyKey: "minotaurR", gear: ["crossbow", "blizzard"] }, // 5+4+4 = 13 — far over cap
    { bodyKey: "pixie", gear: ["blade"] },                    // 1+1 = 2 — in window
  ];
  r.foeNext = 0;
  eq(G.nextPaletteOption(r).bodyKey, "pixie", "an over-cap option is skipped by the roll");
  G.upTheAnte(r);
  ok(r.anteMin === 5 && r.anteCap === 8, "up the ante raises BOTH ends (+3 → 5–8)");
  G.upTheAnte(r); G.upTheAnte(r);                             // → 11–14
  ok(r.anteMin === 11 && r.anteCap === 14, "…and only ever climbs");
  eq(G.nextPaletteOption(r).bodyKey, "minotaurR",
     "a raised window admits the big option AND shuts out the small one");
  r.phase = "playing";
  ok(!G.upTheAnte(r), "the ratchet is a stock-phase action only");
  // the cheap guarantee dies with the ratchet — expensive-only is what you signed for
  r.phase = "stock";
  r.foePalette = [{ bodyKey: "minotaurR", gear: ["crossbow", "blizzard"] }];
  G.ensureCheapSlot(r);
  eq(r.foePalette[0].bodyKey, "minotaurR", "no cheap-slot injection once the ante is upped");
  // upping REROLLS displayed junk into the new window immediately
  { const r2 = G.newRoom("AW2"); r2.phase = "stock";
    r2.foePool = [{ bodyKey: "minotaurR", gear: ["crossbow"] }];   // 5+4 = 9
    r2.foeNext = 0;
    r2.foePalette = [{ bodyKey: "pixie", gear: ["blade"] }];        // 2 — junk after the raise
    G.upTheAnte(r2);                                                // window 5–8… 9 over cap → fallback
    G.upTheAnte(r2);                                                // window 8–11: 9 fits
    eq(r2.foePalette[0].bodyKey, "minotaurR", "the low slot rerolled into the raised window"); }
}

// ---- THE FIRST ROOM IS A GIFT (owner canon 2026-06-12): entry room only, +3 ante; ----
// ---- the rest of floor 1 rolls real modifiers but NEVER the Wandering Monster --------
{
  const lv1 = G.buildLevel(1);
  const entry = lv1.nodes.find((n) => n.id === lv1.currentId);
  ok(entry?.enchant?.key === "gift" && entry.enchant.baseAnte === 3,
     "the run's FIRST room carries King Mimic's Gift (no tricks, antes +3)");
  ok(lv1.nodes.filter((n) => (n.type === "combat" || n.type === "elite") && n.id !== lv1.currentId)
       .every((n) => n.enchant && n.enchant.key !== "gift"),
     "…and ONLY that room — the rest of floor 1 rolls real modifiers");
  let w1 = false, w2 = false;
  for (let i = 0; i < 40; i++) {
    if (G.buildLevel(1).nodes.some((n) => n.enchant?.wanderer)) w1 = true;
    if (G.buildLevel(2).nodes.some((n) => n.enchant?.wanderer)) w2 = true;
  }
  ok(!w1, "floor 1 never rolls a Wandering Monster (too brutal)");
  ok(w2, "floor 2+ still can");
  // the gift is mechanically inert on foes and runs no room clock
  { const f = G.spawnEnemy("pixie", []); const hp = f.maxHp;
    G.applyEnchantToFoe(f, G.GIFT_ENCHANT);
    ok(f.maxHp === hp && !f.shield && !f.cdMul && !f.dmgMul, "the Gift touches no foe stats");
    eq(G.roomTimersFor(G.GIFT_ENCHANT).length, 0, "…and carries no room timer"); }
  // …but it pays: V includes the King's +3
  { const r = G.newRoom("KG"); r.enchant = { ...G.GIFT_ENCHANT };
    r.draftedFoes = [{ bodyKey: "pixie", gear: ["blade"], greedy: true, owner: "p" }]; // ante 2
    eq(G.roomValue(r), 5, "V = stocked 2 + the King's 3"); }
}

// ---- ROOM MODIFIERS v2 (owner 2026-06-12): every modifier is a PAID DEAL ----------
{
  // the room's own base ante joins V on clear
  { const r = G.newRoom("BA"); G.addPlayer(r, "p", "A");
    r.draftedFoes = [{ bodyKey: "pixie", gear: ["blade"], greedy: true, owner: "p" }]; // ante 1+1
    r.enchant = { key: "acidLight", baseAnte: 2 };
    eq(G.roomValue(r), 4, "V = stocked ante + the room's base ante (2+2)"); }
  // Armory: foes enter shielded
  { const f = G.spawnEnemy("pixie", []);
    G.applyEnchantToFoe(f, G.ENCHANTS.find((e) => e.key === "armory"));
    eq(f.shield, 1, "Armory: a foe enters with 1 shield"); }
  // both acid intensities ride the global clock machinery
  { const light = G.ENCHANTS.find((e) => e.key === "acidLight"), heavy = G.ENCHANTS.find((e) => e.key === "acidHeavy");
    eq(G.roomTimersFor(light)[0].cd, 160, "Acid Rain (light) ticks every 16s at cdMult 1");
    eq(G.roomTimersFor(heavy)[0].cd, 85, "Acid Rain (heavy) ticks every 8.5s at cdMult 1"); }
  // Wandering Monster: pickEnchant rolls the foe AT MAP GEN so the hover names the deal
  { let en; for (let i = 0; i < 500 && !(en = G.pickEnchant()).wanderer; i++);
    ok(en.wanderer && en.foe, "the wheel can roll a Wandering Monster with its foe attached");
    eq(en.name, `Wandering Monster (${G.anteOfFoe(en.foe)})`, "…and the (x) in the name is the foe's ante"); }
  // seedWanderer: pre-placed, ownerless, unremovable — ONE PER LANE (owner 2026-06-15, fair
  // for bigger parties: every player meets one, payout scales with the party)
  { const r = G.newRoom("WM"); const p = G.addPlayer(r, "p", "A");
    r.laneCount = 3; r.phase = "stock";
    r.enchant = { wanderer: true, foe: { bodyKey: "centaur", gear: ["blade"] } };
    G.seedWanderer(r);
    eq(r.draftedFoes.length, 3, "one wandering foe per lane");
    ok(r.draftedFoes.every((f) => !f.greedy && f.owner == null), "…each a non-greedy, ownerless entry");
    ok(!G.removeGreedy(r, p), "…that removeGreedy cannot take back");
    eq([...r.draftedFoes].map((f) => f.lane).sort().join(""), "012", "…one pinned in every lane");
    eq([...G.placedLanes(r)].sort().join(""), "012", "placedLanes honors each pin");
    // solo stays a single foe
    const r1 = G.newRoom("WM1"); G.addPlayer(r1, "q", "B"); r1.laneCount = 1; r1.phase = "stock";
    r1.enchant = { wanderer: true, foe: { bodyKey: "centaur", gear: ["blade"] } };
    G.seedWanderer(r1);
    eq(r1.draftedFoes.length, 1, "solo run: exactly one wandering foe"); }
}

// ---- 1:1 SPLIT INCOME: the foes pay their ante, divided fairly --------------------------
{
  const r = G.newRoom("SP");
  const p1 = G.addPlayer(r, "p1", "A"), p2 = G.addPlayer(r, "p2", "B");
  r.draftedFoes = [
    { bodyKey: "pixie", gear: ["blade"], greedy: true, owner: "p1" },     // ante 1+1 = 2
    { bodyKey: "vampireU", gear: ["spear", "blade"], greedy: true, owner: "p2" }, // 3+2+1 = 6
  ];
  eq(G.roomValue(r), 8, "the room pays EXACTLY the ante stocked into it (1:1)");
  p1.treasure = 0; p2.treasure = 0;
  G.creditRoomIncome(r);
  ok(p1.treasure === 4 && p2.treasure === 4, "an even pot splits evenly (8 → 4/4)");
  ok(p1.earned === 4 && p2.earned === 4, "income is tracked as lifetime EARNINGS too");
  // odd pot: the remainder coin lands on the LOWEST TOTAL EARNINGS — not the lightest
  // wallet (owner 2026-06-11). p1 has earned more but spent it all; p2 sits on a fat
  // wallet but has been paid less: the coin is p2's.
  r.draftedFoes.push({ bodyKey: "pixie", gear: [], greedy: true, owner: "p1" }); // +1 → V=9
  p1.earned = 10; p1.treasure = 0;                        // big earner, spent down
  p2.treasure = 10;                                       // rich wallet, earned only 4
  G.creditRoomIncome(r);
  ok(p1.treasure === 0 + 4 && p2.treasure === 10 + 5, `remainder goes to the lowest earnings, not the lightest wallet (p1 ${p1.treasure}, p2 ${p2.treasure})`);
  ok(p1.earned === 14 && p2.earned === 9, `earnings ledger stays exact (p1 ${p1.earned}, p2 ${p2.earned})`);
  // solo: the whole pot
  const rs = G.newRoom("SP2"); const ps = G.addPlayer(rs, "p", "S");
  rs.draftedFoes = [{ bodyKey: "atlasR", gear: ["blizzard", "crossbow"], greedy: true, owner: "p" }];
  G.creditRoomIncome(rs);
  eq(ps.treasure, 13, "solo keeps the full ante (13)");
}

// ---- DOUBLE FEATURE rooms (the elite slot): two invites per player -----------------------
{
  const r = G.newRoom("DF"); const p = G.addPlayer(r, "p1", "A");
  r.level = { nodes: [{ id: "x", type: "elite", cleared: false, x: 0.5, y: 0.5, links: [] }], currentId: "x" };
  G.enterRoom(r);
  eq(r.picksRequired, 2, "a double feature asks TWO invites per player");
  ok(G.addGreedy(r, p, 0), "first invite lands");
  G.commitStock(r);
  eq(r.phase, "stock", "one of two isn't enough");
  ok(G.addGreedy(r, p, 0), "second invite lands");
  ok(!G.addGreedy(r, p, 0), "…and the cap holds at two");
  G.commitStock(r);
  eq(r.phase, "setup", "two placed → the double feature begins");
}

// ---- procedural branching map -----------------------------------------------------------
{
  let okShape = true, sawChoice = false, reasons = new Set();
  for (let t = 0; t < 40; t++) {
    const lvl = G.buildLevel();
    const byId = Object.fromEntries(lvl.nodes.map((n) => [n.id, n]));
    const start = byId[lvl.currentId];
    const bosses = lvl.nodes.filter((n) => n.type === "boss");
    if (bosses.length !== 1 || bosses[0].links.length !== 0) { okShape = false; reasons.add("boss"); }
    if (!lvl.nodes.some((n) => n.type === "elite")) { okShape = false; reasons.add("no-elite"); }
    // links only point DOWN the map (forward-only DAG — fuzz walks links[0] to the boss)
    for (const n of lvl.nodes) for (const id of n.links) {
      if (!byId[id] || byId[id].y <= n.y) { okShape = false; reasons.add("backlink"); }
    }
    // every node except the start is enterable; every non-boss node has a way out
    for (const n of lvl.nodes) {
      if (n !== start && !lvl.nodes.some((m) => m.links.includes(n.id))) { okShape = false; reasons.add("orphan"); }
      if (n.type !== "boss" && n.links.length === 0) { okShape = false; reasons.add("dead-end"); }
    }
    // EVERY path start→boss passes EXACTLY ONE shop (walk all paths — the DAG is small)
    const paths = [];
    (function walk(n, shops) {
      if (n.type === "boss") { paths.push(shops); return; }
      for (const id of n.links) walk(byId[id], shops + (byId[id].type === "shop" ? 1 : 0));
    })(start, 0);
    if (!paths.length || paths.some((s) => s !== 1)) { okShape = false; reasons.add("shop-path"); }
    if (lvl.nodes.some((n) => n.links.length >= 2)) sawChoice = true;
  }
  ok(okShape, `40 generated maps are sound (${[...reasons].join(",") || "all good"})`);
  ok(sawChoice, "maps actually branch (some node offers ≥2 exits)");
}

// ---- player-only items never roll onto foes ------------------------------------------
{
  let bad = false;
  for (let i = 0; i < 50; i++) for (const o of G.buildFoePool())
    if ((o.gear ?? []).some((k) => k === "wind" || k === "heal")) bad = true;
  ok(!bad, "no rolled foe ever carries Wind / Heal (Blizzard was re-admitted 2026-06-12 — drain is symmetric now)");
}

// ===========================================================================
// BOSS_SPEC_V1 — the four V2 floor bosses (one block per mechanic + scaling grid)
// ===========================================================================
// A boss-room rig: N players (one per lane, 100 HP, empty kit), the named boss spawned
// per spec, combat live. Rotation pinned so spawnBoss is deterministic.
function bossRig(bossKey, { players = 1, floor = 1 } = {}) {
  const r = G.newRoom("B");
  r.bossDraw = [bossKey, bossKey, bossKey];
  const ps = [];
  for (let i = 0; i < players; i++) ps.push(G.addPlayer(r, "p" + i, "P" + i));
  ps.forEach((p, i) => { G.wearBody(p, "pixie"); p.maxHp = p.hp = 100; p.lane = i; p.ownedLane = i; p.depth = 0; p.inv = []; });
  r.floor = floor;
  r.laneCount = players;
  r.lanes = Array.from({ length: players }, () => []);
  r.allies = Array.from({ length: players }, () => []);
  r.caravan = { hp: 1e9, max: 1e9 };
  const boss = G.spawnBoss(r);
  r.phase = "playing";
  return { r, ps, boss };
}
const arm = (p, keys) => { p.inv = keys.map((k) => ({ key: k, charge: 0, cd: KIT[k].cd })); };

// ---- the scaling contract: budget = players × floor, threaded into every knob --------
{
  eq(G.bossBudget(1, 1), 1, "budget floor: solo floor 1 = 1 unit");
  eq(G.bossBudget(4, 3), 12, "budget ceiling: 4P floor 3 = 12 units");
  let okGrid = true;
  for (const key of G.BOSS_BODIES) for (let n = 1; n <= 4; n++) for (let f = 1; f <= 3; f++) {
    const { r, boss } = bossRig(key, { players: n, floor: f });
    if (boss.maxHp !== BODIES[key].maxHp * n * f) okGrid = false;
    if (key === "kraken" && (boss.tentacleCap !== 2 * n || G.tentacleCount(r) !== 2 * n)) okGrid = false;
    if (BODIES[key].backline ? !r.boss : r.lanes.flat()[r.lanes.flat().length - 1]?.bodyKey !== key) okGrid = false;
  }
  ok(okGrid, "scaling grid xy∈{1..12}: every boss HP = base × players × floor; Kraken wall = 2 × players");
}

// ---- back-line architecture: spans lanes, lane attribution, melee = back wall --------
// (uses the Lich — the reworked Hydra opens behind five pre-placed heads, so its lanes
// are never empty at spawn)
{
  const { r, ps, boss } = bossRig("litigationLich", { players: 2 });
  ok(r.boss === boss && r.lanes.flat().length === 0, "back-line boss lives behind the lanes, not in one");
  eq(G.aimedFoe(r, ps[0], "front")?.foe, boss, "melee reaches the boss when its lane is clear (the back wall)");
  const blocker = G.spawnFoeInLane(r, "rat", 0);
  eq(G.aimedFoe(r, ps[0], "front")?.foe, blocker, "a lane foe re-walls the lane — melee hits IT, not the boss");
  ps[1].targetId = boss.id;
  const t = G.targetedFoe(r, ps[1]);
  ok(t?.foe === boss && t?.lane === 1, "aiming the boss attributes the hit to the ATTACKER's lane");
  G.ensureTarget(r, ps[1]);
  eq(ps[1].targetId, boss.id, "ensureTarget keeps a valid boss aim");
  G.simulateTick(r);
  eq(r.phase, "playing", "boss alive + empty lanes = the fight is still on");
  boss.hp = 0; r.boss = null; r.lanes = [[], []];
  G.simulateTick(r);
  eq(r.phase, "won", "boss down + lanes clear = won");
}

// ---- Hydra REWORK (owner 2026-06-12): opens behind 5 heads, a head per POINT landed --
{
  const { r, ps, boss } = bossRig("hydra", { players: 2 });
  const heads = () => r.lanes.flat().filter((f) => f.bodyKey === "hydraHead").length;
  eq(heads(), 5, "the Hydra OPENS behind five pre-placed heads");
  ok(Math.abs(r.lanes[0].length - r.lanes[1].length) <= 1, "…spread across the lanes");
  const inLane = (i) => r.lanes[i].filter((f) => f.bodyKey === "hydraHead").length;
  const h0 = heads(), l0 = inLane(0), l1 = inLane(1);
  G.damageEnemy(r, 0, boss, 6, ps[0]);
  eq(heads(), h0 + 1, "every INSTANCE of damage grows ONE head — a 6-hit blooms 1, not 6 (owner corrected 00:20)");
  eq(inLane(0), l0 + 1, "…in the lane the damage came from");
  G.damageEnemy(r, 0, boss, 1, ps[0]);
  eq(inLane(0), l0 + 2, "no rate limit: a second hit in the same lane and batch blooms its own head");
  G.damageEnemy(r, 1, boss, 1, ps[1]);
  eq(inLane(1), l1 + 1, "a chip from the other lane blooms in ITS lane");
  // (multi-op items like Omnislash are multiple INSTANCES — but as melee, each bloom
  // re-walls the lane and eats the next strike; the emergent chew is left unpinned)
  ok(r.lanes.flat().every((f) => f.maxHp === 1), "heads stay 1/1 tokens");
  G.setHpMult(2);
  ok(G.spawnEnemy("hydraHead").maxHp === 1 && G.spawnEnemy("tentacle").maxHp === 1,
    "heads and tentacles are EXEMPT from the HP knob (always 1/1)");
  G.setHpMult(1);
}

// ---- Hydra: hyper-inflation head clock (waves DOUBLE) + the low floor-scaled maul ----
{
  const { r, boss } = bossRig("hydra", { players: 2, floor: 2 });
  eq(boss.clocks[0].cd, G.BOSS_DEFS.hydra.headCd, "head clock cd is the literal BOSS_DEFS number");
  eq(boss.headWave, 1, "the breed clock STARTS at 1 (the board already opened with 5)");
  const heads = () => r.lanes.flat().filter((f) => f.bodyKey === "hydraHead").length;
  const start = heads();
  G.fireBossClock(r, boss, boss.clocks[0]);
  eq(heads(), start + 1, "first trigger: 1 head");
  G.fireBossClock(r, boss, boss.clocks[0]);
  eq(heads(), start + 3, "second trigger: +2 — hyper-inflation doubles each wave");
  G.fireBossClock(r, boss, boss.clocks[0]);
  eq(heads(), start + 7, "third trigger: +4 (1, 2, 4, 8… the board drowns on a clock)");
  const maul = boss.clocks[1];
  ok(maul && maul.kind === "aoe" && maul.dmg === 2 && maul.aoe,
    "the maul clock hits every lane for the FLOOR number (very low 1/2/3 base attack)");
  // heads are rat-like 1/1s (owner ruling): the rat's bite on the rat's clock
  ok(BODIES.hydraHead.passive[0].every === BODIES.rat.passive[0].every
    && BODIES.hydraHead.phys === BODIES.rat.phys, "heads bite like rats (1 every 2s)");
}

// ---- Litigation Lich: stances cap/soften, toggle on the clock, telegraphed -----------
{
  const { r, boss } = bossRig("litigationLich", { players: 1 });
  eq(boss.stance, "objection", "the Lich opens in OBJECTION");
  const hp0 = boss.hp;
  G.damageEnemy(r, 0, boss, 7);
  eq(hp0 - boss.hp, 1, "OBJECTION: every hit it takes is capped at 1");
  G.fireBossClock(r, boss, boss.clocks[0]);
  eq(boss.stance, "recess", "the stance clock flips to recess");
  G.damageEnemy(r, 0, boss, 7);
  eq(hp0 - boss.hp, 1 + 6, "recess: hits deal 1 less than rolled");
  G.damageEnemy(r, 0, boss, 1);
  eq(hp0 - boss.hp, 1 + 6 + 1, "recess: a point always slips through (the ≥1 floor survives)");
  G.fireBossClock(r, boss, boss.clocks[0]);
  eq(boss.stance, "objection", "stances alternate");
  const snap = G.snapshot(r);
  ok(snap.boss && snap.boss.stance === "objection" && /OBJECTION/.test(snap.boss.stanceLabel),
    "the stance is telegraphed in the snapshot");
  ok(snap.boss.threats.length === 2, "both Lich clocks ship as labeled bars");
}

// ---- Litigation Lich: bone wizards — players-at-a-time, lane-AoE hitters -------------
{
  const { r, ps, boss } = bossRig("litigationLich", { players: 2 });
  G.fireBossClock(r, boss, boss.clocks[1]);
  const wiz = r.lanes.flat().filter((f) => f.bodyKey === "boneWizard");
  eq(wiz.length, 2, "one wizard per player, spread across lanes");
  ps[1].lane = 0; ps[1].depth = 1;                 // two heroes share lane 0
  const w0 = r.lanes[0].find((f) => f.bodyKey === "boneWizard");
  const a0 = ps[0].hp, a1 = ps[1].hp;
  G.resolveOps(r, w0, BODIES.boneWizard.passive[0].ops);
  ok(ps[0].hp === a0 - 1 && ps[1].hp === a1 - 1, "a wizard's blast hits AREA — every hero in its lane");
}

// ---- item-entities: HP = gold cost, attack with the item's own op on its cd ----------
{
  const { r, ps } = bossRig("djinn", { players: 1 });
  const fe = G.spawnItemEntity(r, "fire", 0);
  eq(fe.hp, G.itemTreasure("fire"), "entity HP = the item's gold cost (Fireball → 1)");
  eq(G.spawnItemEntity(r, "spear", 0).hp, 2, "uncommon → 2");
  eq(fe.equipment[0].key, "fire", "the entity wields the item itself");
  const hp0 = ps[0].hp;
  fe.equipment[0].charge = fe.equipment[0].cd;
  G.simulateTick(r);
  eq(ps[0].hp, hp0 - 3, "its op fires through the ordinary resolver (Fireball: 3 to the lane front)");
  const snap = G.snapshot(r);
  const card = snap.lanes[0].enemies.find((e) => e.id === fe.id);
  ok(/Conjured/.test(card.name), "the conjured entity is visibly the item");
}

// ---- Djinn of Deals: lane-bound mover, all-lanes AoE, every-3rd-item summon ----------
{
  const { r, ps, boss } = bossRig("djinn", { players: 2 });
  ok(!r.boss && r.lanes.flat().includes(boss), "the Djinn is NOT back-line — it occupies a lane");
  const from = boss.lane;
  G.fireBossClock(r, boss, boss.clocks[0]);
  ok(boss.lane !== from && r.lanes[boss.lane].includes(boss), "teleport relocates it to another lane");
  const a0 = ps[0].hp, a1 = ps[1].hp;
  G.fireBossClock(r, boss, boss.clocks[1]);
  ok(ps[0].hp === a0 - G.BOSS_DEFS.djinn.aoeDmg && ps[1].hp === a1 - G.BOSS_DEFS.djinn.aoeDmg,
    "its scorch hits EVERY lane for 2");
  const snap = G.snapshot(r);
  const card = snap.lanes[boss.lane].enemies.find((e) => e.id === boss.id);
  ok(card.aoe && card.threats.some((t) => t.kind === "clock" && t.harm && t.dmg === 2),
    "the scorch clock telegraphs as an all-lanes threat bar");
  // the party-wide counter: 2 uses by p0 + 1 by p1 → the 3rd use (p1's) trips it
  arm(ps[0], ["blade", "bow"]); arm(ps[1], ["blade"]);
  const entities = () => r.lanes.flat().filter((f) => f.bodyKey === "itemEntity").length;
  fire(r, ps[0], 0); fire(r, ps[0], 1);
  eq(entities(), 0, "two items in: nothing yet");
  fire(r, ps[1], 0);
  eq(entities(), 1, "the 3rd item the PARTY uses conjures one of the Djinn's own");
  ok(r.lanes[ps[1].lane].some((f) => f.bodyKey === "itemEntity"),
    "…into the lane of the player whose use tripped the counter");
  // no Djinn on the board → the counter is inert
  const { r: r2, ps: ps2 } = bossRig("hydra", { players: 1 });
  arm(ps2[0], ["blade"]);
  fire(r2, ps2[0], 0); fire(r2, ps2[0], 0); fire(r2, ps2[0], 0);
  eq(r2.lanes.flat().filter((f) => f.bodyKey === "itemEntity").length, 0, "no Djinn, no conjured items");
}

// ---- Kleptomaniac Kraken: steal/lock/rescue + the tentacle wall ----------------------
{
  const { r, ps, boss } = bossRig("kraken", { players: 2 });
  ps.forEach((p) => arm(p, ["blade", "bow", "fire"]));
  eq(G.tentacleCount(r), 4, "it ENTERS behind its wall (cap = 2 × players)");
  const ent1 = G.krakenSteal(r);
  ok(ent1 && /Stolen/.test(ent1.name), "steal animates the item against the party");
  const victim = ps.find((p) => p.inv.some((iv) => iv.stolen));
  ok(victim && r.lanes[victim.lane].includes(ent1), "the stolen entity spawns in the victim's lane");
  eq(ent1.hp, G.itemTreasure(ent1.itemKey), "stolen entity HP = the item's gold cost (same mechanic as the Djinn's)");
  const slot = victim.inv.findIndex((iv) => iv.stolen);
  const foeHp = ent1.hp;
  victim.inv[slot].charge = KIT[victim.inv[slot].key].cd;
  victim.targetId = ent1.id;
  G.useItem(r, victim, slot);
  eq(ent1.hp, foeHp, "a STOLEN slot is locked — pressing it does nothing");
  const snap = G.snapshot(r);
  const sp = snap.players.find((q) => q.id === victim.id);
  ok(sp.inv[slot].stolen && !sp.inv[slot].ready, "the lock ships in the KIT projection (field-by-field)");
  const ent2 = G.krakenSteal(r);
  const other = ps.find((p) => p !== victim);
  ok(ent2 && other.inv.some((iv) => iv.stolen), "one stolen item per player AT MOST — the second steal hits the other player");
  eq(G.krakenSteal(r), null, "with every player locked, the steal clock idles");
  G.damageEnemy(r, victim.lane, ent1, 99, ps[0]);
  ok(!victim.inv.some((iv) => iv.stolen), "RESCUE: killing the stolen entity returns the item mid-fight");
  ok(G.krakenSteal(r), "…and the freed player is stealable again");
  // never below 1 usable item
  const { r: r3 } = bossRig("kraken", { players: 1 });
  const solo = [...r3.players.values()][0];
  arm(solo, ["blade"]);
  eq(G.krakenSteal(r3), null, "a player is never disarmed below 1 usable item");
  // replenish: back UP TO CAP regardless of how many fell
  r.lanes.forEach((l, i) => { r.lanes[i] = l.filter((f) => f.bodyKey !== "tentacle"); });
  G.spawnFoeInLane(r, "tentacle", 0);
  G.fireBossClock(r, boss, boss.clocks[1]);
  eq(G.tentacleCount(r), 4, "replenish tops the wall back up to cap, not by a fixed count");
  G.fireBossClock(r, boss, boss.clocks[1]);
  eq(G.tentacleCount(r), 4, "at cap, replenish adds nothing");
  eq(G.BOSS_DEFS.kraken.replenishCd(1), 60, "wall clock 6s on floor 1 (×1.5 + 1s tempo passes)");
  eq(G.BOSS_DEFS.kraken.replenishCd(3), 40, "…1s faster per floor");
}

// ---- rotation: 3 distinct of 4 per run, run-seeded, King Mimic NEVER spawns ----------
{
  ok(!G.BOSS_BODIES.includes("kingMimic") && BODIES.kingMimic && BODIES.kingMimic.boss,
    "King Mimic is OUT of the rotation but his body stays defined");
  let okDraw = true;
  for (let i = 0; i < 30; i++) {
    const d = G.drawBossRotation();
    if (d.length !== 3 || new Set(d).size !== 3 || d.some((k) => !G.BOSS_BODIES.includes(k))) okDraw = false;
  }
  ok(okDraw, "every run draws 3 DISTINCT bosses from the 4");
  const r = G.newRoom("ROT");
  G.addPlayer(r, "a", "A");
  G.startDraft(r);
  ok(Array.isArray(r.bossDraw) && r.bossDraw.length === 3, "startDraft seeds the run's draw");
  const seen = [1, 2, 3].map((f) => G.bossForFloor(r, f));
  ok(seen.every((k, i) => k === r.bossDraw[i]), "bossForFloor reads the seeded draw (floor order)");
  eq(G.bossForFloor(r, 1), seen[0], "…deterministic within the run (map preview agrees with the fight)");
  G.chooseClass(r, [...r.players.values()][0], "warrior");
  ok(G.snapshot(r).map.bossName === BODIES[G.bossForFloor(r, 1)].name, "the map preview names the floor's boss");
}

// ---- boss rooms are lane-count-agnostic (the ≥3 clamp is dead) -----------------------
{
  const solo = { players: new Map([["a", {}]]) };
  eq(G.deriveLaneCount(solo, "boss"), 1, "a solo boss room is 1 lane — no legacy ≥3 clamp");
  eq(G.deriveLaneCount({ players: new Map([["a", {}], ["b", {}]]) }, "boss"), 2, "2P boss room = 2 lanes");
  eq(G.deriveLaneCount({ god: true, players: new Map([["a", {}]]) }, "combat"), 3, "god rooms keep the ≥3 testing board");
}

// ---- KING MIMIC — the TRUE final boss: throne floor + his own deck (owner 2026-06-12) -
{
  // the throne sits past floor 3, outside the 3-of-4 rotation
  const r0 = G.newRoom("KM0");
  r0.bossDraw = ["hydra", "djinn", "kraken"];
  eq(G.bossForFloor(r0, 4), "kingMimic", "floor 4 is the THRONE — King Mimic, whatever the draw");
  eq(G.bossForFloor(r0, 2), "djinn", "floors 1–3 still read the seeded rotation");
  const lvl = G.buildLevel(4);
  ok(lvl.nodes.length === 1 && lvl.nodes[0].type === "boss" && lvl.currentId === lvl.nodes[0].id,
    "the throne floor is a single boss room — no crawl before the King");
  ok(!BODIES.kingMimic.ward && !BODIES.kingMimic.passive,
    "the V1 ward/nemesis King is DEAD — the V2 King is the deck");

  const { r, ps, boss } = bossRig("kingMimic", { players: 2, floor: 4 });
  ok(r.boss === boss && BODIES.kingMimic.backline, "the King is a back-line boss (caravan mirror)");
  eq(boss.maxHp, BODIES.kingMimic.maxHp * 2 * 4, "throne budget: HP = base × players × THRONE_FLOOR");
  ok(boss.stance == null, "he opens with no stance up — the first STANCE card raises the guard");

  // the deck driver: ONE card up at a time, its own bar; every card fires once per pass
  eq(boss.clocks.length, 1, "one card at a time — the active card is the only bar");
  ok(boss.clocks[0].deck, "…and it's flagged as a deck card (fires rotate it out)");
  arm(ps[0], ["blade", "bow"]); arm(ps[1], ["fire", "blade"]);  // give the steal card real victims
  const kinds = G.BOSS_DEFS.kingMimic.cards.map((c) => c.kind).sort().join();
  const seen = [];
  for (let i = 0; i < 4; i++) {
    seen.push(boss.clocks[0].kind);
    boss.clocks[0].charge = boss.clocks[0].cd - 1;
    G.tickBossClocks(r, boss);
  }
  eq([...seen].sort().join(), kinds, "shuffle bag: all four cards fire once before the deck loops");
  ok(boss.clocks[0].deck && boss.clocks[0].kind !== seen[3],
    "the reshuffled deck is up — and never repeats the just-fired card across the seam");

  // DECREE: a heavy armed foe per player, rolled to clear the ante bar
  for (let i = 0; i < 10; i++) {
    const o = G.rollDecreeFoe();
    ok(G.anteOfFoe(o) >= G.BOSS_DEFS.kingMimic.decreeAnte && (o.gear ?? []).length >= 1,
      "decree rolls are heavily-anted AND armed");
  }
  const before = r.lanes.flat().length;
  G.fireBossClock(r, boss, { kind: "decree" });
  eq(r.lanes.flat().length, before + 2, "decree deploys one foe per player (emptiest lanes first)");

  // STANCE: the generic stance rules guard the King exactly as they guard the Lich
  boss.stance = null;
  G.fireBossClock(r, boss, { kind: "stance" });
  eq(boss.stance, "objection", "the first stance card raises OBJECTION (cap 1)");
  let hp = boss.hp;
  G.damageEnemy(r, 0, boss, 5, ps[0]);
  eq(hp - boss.hp, 1, "under the guard stance every hit is capped at 1");
  G.fireBossClock(r, boss, { kind: "stance" });
  eq(boss.stance, "recess", "the next stance card drops to recess (−1)");
  hp = boss.hp;
  G.damageEnemy(r, 0, boss, 5, ps[0]);
  eq(hp - boss.hp, 4, "…where hits land softened by 1 — the burst window");

  // the throne ends the run: King down → runWon, and there is no floor 5
  r.level = G.buildLevel(4);
  r.lanes = r.lanes.map(() => []);
  boss.hp = 0;
  G.simulateTick(r);
  ok(r.phase === "won" && r.levelComplete && r.runWon, "the King falls → won + levelComplete + RUN WON");
  eq(G.descend(r), false, "the throne is the LAST floor — descend is dead");
  ok(G.snapshot(r).runWon === true && G.snapshot(r).map.bossName === "King Mimic",
    "runWon ships in the snapshot; the map preview names the King");
  G.startDraft(r);
  ok(!r.runWon, "a fresh run resets the claim on the throne");
}

// ---- the descend seam: floor 3 cleared → the throne arrives fully wired --------------
{
  const r = G.newRoom("KM2");
  const p = G.addPlayer(r, "a", "A");
  G.startDraft(r);
  r.phase = "won"; r.floor = 3; r.level = G.buildLevel(3); r.levelComplete = true;
  ok(G.descend(r), "descending off a cleared floor 3 works");
  eq(r.floor, G.THRONE_FLOOR, "…and lands on the throne floor");
  ok(r.phase === "setup" && r.boss?.bodyKey === "kingMimic" && r.boss.clocks?.[0]?.deck,
    "the throne room auto-builds: setup phase, the King back-line, his first card up");
  eq(G.snapshot(r).map.bossName, "King Mimic", "the descend button knew where it was going");
}

// ---- BOSS PAYDAY (owner 2026-06-12): a shelf of rares + 10g each on every boss clear --
{
  ok(G.RARE_POOL.length >= 3 && G.RARE_POOL.every((k) => KIT[k].ante >= G.RARE_ANTE),
    "the rare pool is the expensive end of the de-tiered kit (ante ≥ RARE_ANTE)");
  const { r, ps, boss } = bossRig("hydra", { players: 2 });
  r.level = G.buildLevel(1);
  r.level.currentId = r.level.nodes.find((n) => n.type === "boss").id;
  ps.forEach((p) => { p.draftPicks = []; p.treasure = 0; p.earned = 0; });
  boss.hp = 0;
  r.lanes = r.lanes.map(() => []);
  G.simulateTick(r);
  eq(r.phase, "won", "boss down → won");
  ok(ps.every((p) => p.treasure === G.BOSS_GOLD), "every player banks the 10g boss bounty");
  eq(r.loot.length, 2 + 2, "the shelf holds players + 2 rares");
  ok(r.loot.every((k) => KIT[k].ante >= G.RARE_ANTE) && new Set(r.loot).size === r.loot.length,
    "…all rare, all distinct");
  const affordable = r.loot.find((k) => G.itemTreasure(k) <= G.BOSS_GOLD);
  ok(affordable, "the bounty can actually buy a rare off the shelf");
  G.claimLoot(r, ps[0], affordable);
  ok(ps[0].draftPicks.includes(affordable) && ps[0].treasure === G.BOSS_GOLD - G.itemTreasure(affordable),
    "claiming spends the bounty — 10g to spend on them, exactly as ordered");
}

// ---- AUTO fire mode (owner 2026-06-12): ready damaging items fire themselves ---------
{
  const { r, ps, boss } = bossRig("hydra", { players: 1 });
  const p = ps[0];
  arm(p, ["bow", "heal", "fire"]);
  p.targetId = boss.id;
  p.inv.forEach((iv) => { iv.charge = 999; });
  const hp0 = boss.hp;
  G.simulateTick(r);
  eq(boss.hp, hp0, "MANUAL is the default — nothing fires by itself");
  p.autoFire = true;
  G.simulateTick(r);
  ok(boss.hp < hp0, "AUTO: ready damaging items fire themselves at your aim");
  ok(p.inv.filter((iv) => iv.key !== "heal").every((iv) => iv.charge === 0),
    "…the fired items went back on cooldown");
  eq(p.inv.find((iv) => iv.key === "heal").charge, KIT.heal.cd,
    "…but Heal stayed FULL — non-damaging items remain the player's call");
  // a held one-shot is a decision, not a spam — AUTO never spends a fragile
  const fragileKey = Object.keys(KIT).find((k) => KIT[k].fragile && (KIT[k].ops ?? []).some((o) => o.do === "deal"));
  if (fragileKey) {
    arm(p, [fragileKey]);
    p.inv[0].charge = 999;
    G.simulateTick(r);
    ok(!p.inv[0].spent, "AUTO never fires a fragile one-shot");
  }
  // AUTO presses are REAL uses — the Djinn's party-wide counter ticks on them
  const { r: r2, ps: ps2 } = bossRig("djinn", { players: 1 });
  const p2 = ps2[0];
  arm(p2, ["bow"]);
  p2.autoFire = true; p2.inv[0].charge = 999;
  const uses0 = r2.itemUses ?? 0;
  G.simulateTick(r2);
  eq(r2.itemUses, uses0 + 1, "an AUTO press feeds the Djinn's every-3rd counter (symmetry: real use is real)");
}

// ---- the universal cooldown multiplier is DEAD (owner 2026-06-12) --------------------
{
  G.setCdMult(2);   // the stub must be inert — numbers are literal now
  const { boss } = bossRig("hydra", { players: 1 });
  eq(boss.clocks[0].cd, G.BOSS_DEFS.hydra.headCd, "boss clock cds are LITERAL ticks — setCdMult is an inert stub");
  eq(G.cdScale(), 1, "cdScale is permanently 1");
  G.setCdMult(1);
}

// ---- buffs are ally-targetable (owner 2026-06-12: "haste and any buff on another player")
{
  const { r, p } = rig("pixie", { inv: ["haste"] });
  const q = G.addPlayer(r, "q", "Q"); G.wearBody(q, "pixie"); q.lane = 0; q.depth = 1; q.alive = true;
  p.allyTargetId = q.id;
  fire(r, p, 0);
  ok(G.hasBuff(q, "haste") && !G.hasBuff(p, "haste"), "an ally-targeted Haste lands on the TEAMMATE, not the caster");
  p.allyTargetId = null;
  p.inv[0].charge = KIT.haste.cd;
  G.useItem(r, p, 0);
  ok(G.hasBuff(p, "haste"), "…and falls back to self with no ally-target");
}

console.log(fail ? `\n❌ FAILURES — ${pass} passed, ${fail} failed.` : `\n✅ ALL PASS — ${pass} passed, 0 failed.`);
if (fail) process.exit(1);
