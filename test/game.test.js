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
// CARD/MOXIE rewrite (2026-06-21): the rig stocks the player's CARD collection (not a cooldown
// inv) in the SAME ORDER as `inv`, so slot-based assertions still map. `p.hand` is the live hand
// (= the collection, in order, deterministic), `p.deck` empties, moxie is pinned high so cost is
// never the gate for an effect test. `p.invKeys` records the intended key per slot so `fire(r,p,
// slot)` can re-find the card by KEY after a play shuffles the hand. `p.inv` is KEPT (mirroring the
// collection keys) ONLY so worn-passive reads (itemStatBonus/itemDmgReduce) still see the gear.
// AUTO is forced OFF: these are deterministic single-cast effect tests, not the tick auto-player
// (the few AUTO tests opt back in explicitly).
function rig(pBody, { foeBody = "cleric", foeHp = 1000, inv = [], pHp = 100 } = {}) {
  const r = G.newRoom("T");
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, pBody); p.lane = 0; p.depth = 0; p.maxHp = p.hp = pHp;
  p.autoFire = false;                                   // manual: one cast per fire(), no tick auto-play
  p.cards = G.mintCards(inv);                           // the collection, in `inv` order (mintCards drops non-cards/passives)
  p.hand = [...p.cards]; p.deck = [];                   // deterministic opening hand = the full ordered collection
  p.moxie = 99; p.moxieClock = 0;                       // cost is never the gate for an effect assertion
  p.invKeys = inv.slice();                              // the intended key at each rig slot (cards may drop passives, so map slot→original key)
  p.inv = inv.map((k) => ({ key: k }));                 // worn-passive stat reads still see the gear (no charge/cd)
  r.phase = "playing"; r.laneCount = 1; r.allies = [[]]; r.caravan = { hp: 1e9, max: 1e9 };
  // The dummy foe is a pure damage sink / target. Pre-rewrite it was inert (foes had no base
  // swing); now spawnEnemy stocks an innate FOE_DECKS queue that would cast every tick and
  // muddy the deterministic player-side assertions. Empty its queue so it stays the inert wall
  // the effect tests assume (foe-casting is exercised in its own dedicated block + boss rigs).
  const foe = G.spawnEnemy(foeBody, []); foe.hp = foe.maxHp = foeHp; foe.queue = []; r.lanes = [[foe]];
  return { r, p, foe };
}
// Play the card that was rigged at `slot`: top up moxie, then re-find it in the LIVE hand BY KEY
// (a played non-fragile card shuffles back and the hand reorders, so a fixed index is wrong; a
// spent fragile is simply gone → no card found → a harmless no-op, which is correct).
const fire = (r, p, slot) => {
  p.moxie = 99;
  const key = (p.invKeys ?? [])[slot];
  const card = (p.hand ?? []).find((c) => c.key === key);
  return card ? G.playCard(r, p, card.id) : false;
};
// a hero-side summon token dropped straight into lane 0
const allyToken = (r, body, lane = 0) => { const t = G.spawnEnemy(body); t.side = "hero"; t.lane = lane; r.allies[lane].push(t); return t; };

// ---- content shape: the owner's 15-body roster + the item kit ----------------
{
  // The generated 12-template family system is DELETED (school-free rip 2026-06-23): the roster IS
  // the owner's 15 archetype bodies (MOXIE_SET), draftable AND foe-rostered, no `.family` tags.
  ok(Object.keys(BODIES).every((k) => BODIES[k].family === undefined), "no generated template families remain");
  eq(G.SET_COMMONS.length, 24, "SET_COMMONS is the owner's 24-body roster (15 + 9 batch-B)");
  ok(G.SET_COMMONS.every((k) => BODIES[k]?.gold === 1), "every roster body is one flat entry, gold 1");
  ok(G.SET_COMMONS.every((k) => !BODIES[k + "U"] && !BODIES[k + "R"]), "NO U/R variants exist — power comes from items, not tiers");
  ok(Object.values(KIT).every((i) => i.rarity === undefined), "items carry NO rarity class — only individual gold values");
  eq(G.PLAYER_POOL.length, 49, "the owner's set is 44 + 5 batch-B cards = 49");
  ok(G.PLAYER_POOL.every((k) => KIT[k] && (KIT[k].ante ?? 1) === 1), "every owner card exists in KIT and is value 1");
  ok(G.PLAYER_POOL.every((k) => KIT[k].type === undefined), "every owner card is school-free (no type)");
  ok(!BODIES.fatCat && !KIT.trustyBlade && !KIT.trustyStaff, "retired V1 bodies/items are gone");
}

// ---- HP knob ---------------------------------------------------------------
{
  G.setHpMult(2);
  eq(G.bodyMaxHp(BODIES.leverage), 12, "HP_MULT=2 doubles a body (Royal Rat 6→12)");
  eq(G.spawnEnemy("frugal").maxHp, 16, "a spawned foe is doubled (Fat Cat 8→16)");
  eq(G.spawnEnemy("rat").maxHp, 1, "summon tokens are EXEMPT from the knob (a rat is ALWAYS 1 HP)");
  eq(G.spawnEnemy("knight").maxHp, 6, "…every token is tuned absolutely (knight stays 6)");
  G.setHpMult(1);
}

// ---- per-body shields (unchanged spine) --------------------------------------
{
  const foe = G.spawnEnemy("rookie", []); foe.hp = foe.maxHp = 8;
  const r = { lanes: [[foe]], allies: [[]], laneCount: 1, caravan: { hp: 9, max: 9 }, players: new Map() };
  G.resolveOps(r, foe, [{ do: "shield", amount: 4 }]);
  eq(foe.shield, 4, "shield op buffers the caster's shield");
  G.damageEnemy(r, 0, foe, 3);
  ok(foe.shield === 1 && foe.hp === 8, "shield absorbs before HP (3 of 4)");
  G.damageEnemy(r, 0, foe, 3);
  ok(foe.shield === 0 && foe.hp === 6, "overflow past shield hits HP (2)");

  const { r: r2, p } = rig("rookie"); p.shield = 5; const hp0 = p.hp;
  G.damagePlayer(r2, p, 3);
  ok(p.shield === 2 && p.hp === hp0, "player shield is symmetric (absorbs before HP)");
}

// ---- damage-taken triggers count SHIELD-absorbed damage (owner 2026-06-24) -----------------
// Bug: a shielded Fat Cat ("every 3 damage taken → summon a rat") never ratted, because the hit
// trigger only fired on the post-shield HP loss. It must read the GROSS incoming hit.
{
  const foe = G.spawnEnemy("frugal"); foe.side = "foe"; foe.lane = 0;   // Fat Cat
  foe.shield = 99;                                                      // a wall of shield — nothing reaches HP
  const r = { lanes: [[foe]], allies: [[]], laneCount: 1, caravan: { hp: 9, max: 9 }, players: new Map() };
  const hp0 = foe.hp;
  G.damageEnemy(r, 0, foe, 3);
  ok(foe.hp === hp0 && foe.shield === 96, "the shield ate the whole 3-damage hit — no HP lost");
  ok(r.lanes[0].some((e) => e.bodyKey === "rat"), "…yet a shielded Fat Cat still summons its rat (shielded damage counts as damage taken)");

  // symmetric on the player side
  const { r: pr, p: pp } = rig("frugal"); pp.shield = 99; const php0 = pp.hp;
  G.damagePlayer(pr, pp, 3);
  ok(pp.hp === php0, "a shielded Fat-Cat PLAYER also keeps full HP");
  ok(pr.allies[pp.lane ?? 0].some((a) => a.bodyKey === "rat"), "…and still summons its rat (symmetric)");
}

// ---- fight-long PASSIVE cards stay IN PLAY, never reshuffle (owner 2026-06-24) --------------
// A "lasting" card (Thorns/Stoneskin/regen crowns) becomes a passive for the combat once played:
// it leaves the hand and does NOT cycle back into the deck — so it can't be redrawn/replayed — and
// is restored to the collection next combat by dealHand.
{
  const { r, p } = rig("rookie", { inv: ["dStoneskin", "oSword"] });
  fire(r, p, 0);   // play Stoneskin (lasting)
  ok(![...(p.hand ?? []), ...(p.deck ?? [])].some((c) => c.key === "dStoneskin"),
     "a fight-long passive leaves the hand and does NOT shuffle back into the deck");
  ok((p.inPlay ?? []).some((c) => c.key === "dStoneskin"), "…it sits in the in-play pile for the fight");
  fire(r, p, 1);   // play Sword (normal)
  ok([...(p.hand ?? []), ...(p.deck ?? [])].some((c) => c.key === "oSword") && !(p.inPlay ?? []).some((c) => c.key === "oSword"),
     "a normal card still cycles back into the deck/hand (never the in-play pile)");
  G.dealHand(p);   // next combat
  ok((p.inPlay ?? []).length === 0 && [...(p.hand ?? []), ...(p.deck ?? [])].some((c) => c.key === "dStoneskin"),
     "next combat: in-play clears and the lasting card returns to the collection");
}

// ---- OWNER BATCH (2026-06-25): meleeBonus/rangedBonus grants, the new regen kinds, Pile On, the
// Hedgefund Knight summon, and Cool Shoes' worn moxie-over-time. ----
{
  // Sharpened Edges: +1 meleeBonus → a melee card hits for +1. Anchor: Dagger deals 1, so +1 → 2.
  { const { r, p, foe } = rig("rookie", { inv: ["oSharpEdges", "oDagger"] });
    fire(r, p, 0); eq(p.meleeBonus, 1, "Sharpened Edges grants +1 meleeBonus");
    const h0 = foe.hp; fire(r, p, 1);
    eq(h0 - foe.hp, 2, "…the melee bonus raises Dagger's 1 to 2"); }
  // …and it does NOT lift a RANGED card (the 🗡-only grant is type-specific, unlike counters).
  { const { r, p, foe } = rig("rookie", { inv: ["oSharpEdges", "oArcane"] });
    fire(r, p, 0); const h0 = foe.hp; fire(r, p, 1);
    eq(h0 - foe.hp, 1, "Sharpened Edges does NOT lift a ranged card (Arcane stays 1)"); }
  // Wizard Hat: +1 rangedBonus → a ranged card hits for +1, and does NOT lift melee.
  { const { r, p, foe } = rig("rookie", { inv: ["oWizardHat", "oArcane"] });
    fire(r, p, 0); eq(p.rangedBonus, 1, "Wizard Hat grants +1 rangedBonus");
    const h0 = foe.hp; fire(r, p, 1);
    eq(h0 - foe.hp, 2, "…the ranged bonus raises Arcane's 1 to 2"); }
  { const { r, p, foe } = rig("rookie", { inv: ["oWizardHat", "oDagger"] });
    fire(r, p, 0); const h0 = foe.hp; fire(r, p, 1);
    eq(h0 - foe.hp, 1, "Wizard Hat does NOT lift a melee card (Dagger stays 1)"); }
  // Moxie Pool: regen kind "moxie" banks +1 every 60 ticks (capped). Play it, drain moxie, tick 6s.
  { const { r, p } = rig("rookie", { inv: ["oMoxiePool"] });
    p.autoFire = false; fire(r, p, 0); p.moxie = 0; p.moxieClock = 0;
    for (let t = 0; t < 60; t++) G.tickRegens(p);     // 6 seconds of regen-only ticks
    eq(p.moxie, 1, "Moxie Pool banks +1 moxie every 6s (regen kind moxie)"); }
  // Demon Form / Sage Mode: the bonus climbs +1 per 60-tick period.
  { const { r, p } = rig("rookie", { inv: ["oDemonForm"] });
    fire(r, p, 0); for (let t = 0; t < 60; t++) G.tickRegens(p);
    eq(p.meleeBonus, 1, "Demon Form ramps +1 meleeBonus every 6s");
    for (let t = 0; t < 60; t++) G.tickRegens(p);
    eq(p.meleeBonus, 2, "…and again the next period"); }
  { const { r, p } = rig("rookie", { inv: ["oSageMode"] });
    fire(r, p, 0); for (let t = 0; t < 60; t++) G.tickRegens(p);
    eq(p.rangedBonus, 1, "Sage Mode ramps +1 rangedBonus every 6s"); }
  // Berserker Armor: each period +1 meleeBonus AND +1 shield, then take 1 self-damage (the granted
  // shield eats it → net no HP loss, +1 melee, shield nets to 0 that period).
  { const { r, p } = rig("rookie", { inv: ["oBerserker"] });
    fire(r, p, 0); p.shield = 0; const hp0 = p.hp;
    for (let t = 0; t < 60; t++) G.tickRegens(p);
    eq(p.meleeBonus, 1, "Berserker Armor grants +1 meleeBonus per period");
    eq(p.shield, 0, "…the +1 shield exactly absorbs the 1 self-damage (nets to 0)");
    eq(p.hp, hp0, "…so no HP is lost when the shield covers the self-hit"); }
  // …but if the shield was already spent, the self-damage reaches HP.
  { const { r, p } = rig("rookie", { inv: ["oBerserker"] });
    fire(r, p, 0); const hp0 = p.hp;
    for (let t = 0; t < 60; t++) G.tickRegens(p);     // +1 shield granted, self-hit absorbed
    p.shield = 0;                                     // spend the granted shield
    for (let t = 0; t < 60; t++) G.tickRegens(p);     // next period: +1 shield, self-hit absorbed again
    eq(p.hp, hp0, "Berserker never bleeds HP while its own +1 shield keeps pace"); }
  // Pile On: damage == OTHER allies in your lane (perAlly, no base). Solo = 0; +teammate +rat = 2.
  { const { r, p, foe } = rig("rookie", { inv: ["oPileOn"] });
    r.level = { nodes: [], currentId: null };
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 0, "Pile On solo deals 0 (no other allies)");
    const p2 = G.addPlayer(r, "p2", "B"); p2.lane = 0; allyToken(r, "rat");
    const h1 = foe.hp; fire(r, p, 0);
    eq(h1 - foe.hp, 2, "Pile On deals 1 per other ally (teammate + rat = 2)"); }
  // Hedgefund Knight summon: spawns a hero-side token with hp 5 and +1 damage resist.
  { const { r, p } = rig("rookie", { inv: ["oHedgeKnight"] });
    fire(r, p, 0);
    const kn = r.allies[0][0];
    ok(kn && kn.bodyKey === "hedgeKnight", "Hedgefund Knight card summons a hedgeKnight token");
    eq(kn.maxHp, 5, "…with 5 HP (summon token, HP-knob exempt)");
    eq(BODIES.hedgeKnight.dmgReduce, 1, "…and +1 damage resist (body dmgReduce)");
    eq(G.effectiveDamageTo(r, kn, 3), 2, "…so a 3-damage hit is reduced to 2"); }
  // Cool Shoes (owner 2026-06-25, REWORKED): a WORN PASSIVE (no ops, never a card) — every card you
  // PLAY refunds +1 moxie. The old moxie-over-time regen (a Moxie-Pool clone) is CUT.
  { ok(G.isPassiveItem("coolShoes"), "Cool Shoes is a worn passive (no ops)");
    ok((KIT.coolShoes.passive?.moxieOnPlay ?? 0) >= 1, "…it grants moxie ON PLAY");
    ok(!KIT.coolShoes.passive?.moxieRegen, "…and the old moxie-over-time regen is gone");
    const { r, p } = rig("rookie", { inv: ["coolShoes"] });
    p.cards = G.mintCards(["fire", "blade"]); G.dealHand(p);
    const card = p.hand[0], cost = G.cardCost(card.key);
    p.moxie = 6;
    ok(G.playCard(r, p, card.id), "the card plays");
    eq(p.moxie, 6 - cost + 1, "Cool Shoes refunds +1 moxie on the play (net = cost − 1)"); }
}

// ---- (worn-passive school clocks, school-power scaling, and ECHO blocks DELETED in the school-free rip 2026-06-23) ----

// ---- THE POST-FLOOR-3 WAVE (owner spitball, built 2026-06-12): buffs + panic buttons --
{
  // Haste: MOXIE charges double-speed while it runs (the cooldown role is dead — Haste now
  // bends tempo through the regen step, CARDS_SPEC §1). Verify the +2/sec regen vs +1/sec.
  { const { r, p } = rig("rookie", { inv: ["haste"] });  // tempo-neutral body
    p.autoFire = false;   // manual: measure regen, don't let AUTO spend the moxie back down
    fire(r, p, 0);
    ok(G.hasBuff(p, "haste"), "Haste applies its timed buff");
    p.moxie = 0; p.moxieClock = 0;
    for (let t = 0; t < 10; t++) G.simulateTick(r);   // 1 second of ticks
    eq(p.moxie, 2, "under Haste moxie regens +2/sec (the +1/sec base, doubled)"); }
  // …and the same second WITHOUT Haste regens only +1 (the symmetric baseline)
  { const { r, p } = rig("rookie");
    p.autoFire = false; p.moxie = 0; p.moxieClock = 0;
    for (let t = 0; t < 10; t++) G.simulateTick(r);
    eq(p.moxie, 1, "no Haste → the baseline +1 moxie/sec"); }
  // Power Boost feeds BOTH schools through effPhys/effMag (previews inherit it)
  { const { r, p, foe } = rig("rookie", { inv: ["powerBoost", "blade"] });
    fire(r, p, 0);
    eq(G.effPhys(p), 3, "Power Boost: +2 sword Power on a 1-sword body");
    const h0 = foe.hp; fire(r, p, 1);
    eq(h0 - foe.hp, 4, "…and the hit lands with it (1 base + 1 phys + 2 boost)");
    for (let t = 0; t < 121; t++) G.simulateTick(r);
    eq(G.effPhys(p), 1, "the boost expires on schedule"); }
  // Stone Skin softens hits — for players AND foes (1:1 symmetry)
  { const { r, p } = rig("rookie");
    G.addBuff(p, "stoneskin", 2, 80);
    G.damagePlayer(r, p, 3);
    eq(100 - p.hp, 1, "Stone Skin: a 3-hit lands for 1 on a player"); }
  { const { r, p, foe } = rig("rookie", { inv: ["blade"] });
    G.addBuff(foe, "stoneskin", 2, 80);
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 0, "a Stone-Skinned FOE shrugs the same hit (2−2, no weapon-floor override of DR)"); }
  // Omnislash: four separate strikes (sim redial: +2 base each — amount-0 was dominated)
  { const { r, p, foe } = rig("cleric", { inv: ["omnislash"] });
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 8, "Omnislash on a 0-sword body: 4 strikes × (2+0)"); }
  { const { r, p, foe } = rig("warrior", { inv: ["omnislash"] });   // warrior = phys 2 (a surviving swordarm)
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 16, "…and 4 × (2 + sword 2) on a real swordarm"); }
  // Giga Cast: once per fight, the NEXT staff item ×4 (sword presses don't consume it)
  { const { r, p, foe } = rig("cleric", { inv: ["gigaCast", "fire", "blade"] });
    fire(r, p, 0);
    ok(p.gigaArmed && !p.cards.some((c) => c.key === "gigaCast"),
      "Giga Cast arms and is spent (fragile: gone from the collection for the fight)");
    eq(fire(r, p, 0), false, "…the spent giga card can't be played again");
    fire(r, p, 2);
    ok(p.gigaArmed, "a sword press does NOT consume the giga charge");
    const h1 = foe.hp; fire(r, p, 1);
    eq(h1 - foe.hp, 16, "the next staff item resolves ×4 ((3+1)×4)");
    ok(!p.gigaArmed, "…and the charge is consumed"); }
  // Time Stop: the whole foe machine stands still for 4.5s — its MOXIE never charges (the
  // cooldown role is dead; freezing now stalls the foe's moxie/cast loop, CARDS_SPEC §5). The
  // foe's queue is emptied so its regenerated moxie accumulates (it can't spend it casting),
  // making "the clock resumes" deterministic.
  { const { r, p } = rig("rookie", { inv: ["timeStop"] });
    const foe = G.spawnEnemy("rookie", ["blade"]); foe.hp = foe.maxHp = 1000; r.lanes[0] = [foe];
    foe.queue = []; foe.moxie = 0; foe.moxieClock = 0;
    fire(r, p, 0);
    eq(r.freezeFoes, 45, "Time Stop freezes the foe side for 4.5s");
    for (let t = 0; t < 44; t++) G.simulateTick(r);
    eq(foe.moxie, 0, "a frozen foe's moxie never charges");
    eq(r.freezeFoes, 1, "…the freeze counter is still winding down");
    for (let t = 0; t < 11; t++) G.simulateTick(r);
    eq(r.freezeFoes, 0, "the stop ends");
    ok(foe.moxie >= 1, "…and the moxie clock resumes when the stop ends"); }
  // Revive: a downed teammate stands back up at FULL
  { const { r, p } = rig("rookie", { inv: ["revive"] });
    const q = G.addPlayer(r, "q", "Q"); G.wearBody(q, "rookie");
    q.lane = 0; q.depth = 1; q.hp = 0; q.alive = false;
    fire(r, p, 0);
    ok(q.alive && q.hp === q.maxHp, "Revive stands a downed teammate back up at FULL HP");
    ok(!p.cards.some((c) => c.key === "revive"), "…once per fight (fragile: spent out of the collection)"); }
  ok(KIT.timeStop.fragile && KIT.revive.fragile && KIT.gigaCast.fragile,
    "the panic buttons are fragile one-shots (one cast per fight, gone after)");
}

// ---- foe-item audit (owner 2026-06-12: "never seen a blizzard") -----------------------
{
  // a foe Blizzard now drains the heroes' MOXIE (moxie world: the drain hits the tempo resource,
  // not the dead per-item charge — delay op amount is 3 now)
  { const { r, p } = rig("rookie", { inv: ["hatchet"] });
    p.moxie = 9;
    const foe = G.spawnEnemy("cleric", []); foe.hp = foe.maxHp = 1000; foe.side = "foe"; foe.lane = 0;
    r.lanes[0] = [foe];
    G.resolveOps(r, foe, KIT.blizzard.ops, "magical");
    eq(p.moxie, 6, "a foe Blizzard drains 3 moxie off the hero — symmetric tempo bite (9→6)"); }
  // pool membership (owner 2026-06-24): foe gear draws from the EXACT player pool — full symmetry.
  { const seen = new Set();
    for (let i = 0; i < 300; i++) for (const o of G.buildFoePool()) (o.gear ?? []).forEach((g) => seen.add(g));
    ok([...seen].every((k) => G.PLAYER_POOL.includes(k)), "every rolled foe gear key is a player-pool card (foe pool == player pool)");
    ok(seen.size >= 10, "foes roll a wide spread of the shared player pool, not one or two cards"); }
}

// ---- SCHOOL CDR is DEAD (was V2 §4.4) — tempo no longer varies by body --------------
// Cooldowns are gone (CARDS_SPEC §0): a card's MOXIE cost is the only gate, and cost is a flat
// property of the card — it does NOT change with the body wearing/casting it. So a Pixie's sword
// and a Lizard Wizard's staff cost the same as on any other body (1:1 symmetry, no per-body tempo
// dial). The legacy `itemCd` helper still computes its old ×0.75 math, but the COMBAT ENGINE never
// reads it — verify cost-parity, the property that actually drives play now.
{
  eq(G.cardCost("blade"), G.cardCost("blade"), "a card's cost is body-independent (no sword CDR)");
  eq(KIT.blade.cost, 1, "Sword costs 1 moxie regardless of who casts it");
  eq(KIT.fire.cost, 2, "Fireball costs 2 moxie regardless of who casts it");
  // a foe's stocked active gear joins its cast QUEUE (it no longer charges on an item cooldown).
  // PARITY (owner 2026-06-22): only OWNER-set gear surfaces in the queue — legacy keys are dropped.
  const fp = G.spawnEnemy("rookie", ["oSword"]);
  ok(fp.queue.some((c) => c.key === "oSword"), "a foe's stocked owner-set gear joins its moxie cast queue");
  ok(!G.spawnEnemy("rookie", ["blade"]).queue.some((c) => c.key === "blade"), "…but legacy off-set gear never does");
  ok(typeof fp.moxie === "number" && fp.moxieClock === 0, "…and the foe opens with moxie, not item charge");
}

// ---- ALLY-TARGET SLOT (V2 §4.1) ----------------------------------------------
{
  const r = G.newRoom("AT");
  const p1 = G.addPlayer(r, "p1", "A"), p2 = G.addPlayer(r, "p2", "B");
  r.phase = "playing"; r.laneCount = 2; r.lanes = [[G.spawnEnemy("rookie")], []]; r.allies = [[], []];
  r.caravan = { hp: 1e9, max: 1e9 };
  p1.lane = 0; p2.lane = 1;
  p1.maxHp = p1.hp = 100; p2.maxHp = 100; p2.hp = 40;
  p1.autoFire = false; p1.moxie = 99; p1.moxieClock = 0;
  p1.cards = G.mintCards(["heal"]); p1.hand = [...p1.cards]; p1.deck = []; p1.invKeys = ["heal"];
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
  { const { r, p, foe } = rig("rookie", { inv: ["blade", "flag"] });
    fire(r, p, 1);
    eq(r.allies[0][0]?.bodyKey, "flag", "Flag item summons the flag token");
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 3, "flag aura: lane ally deals +1 (1+1+1)");
    // same aura type does NOT stack — strongest applies
    allyToken(r, "flag");
    const h1 = foe.hp; fire(r, p, 0);
    eq(h1 - foe.hp, 3, "two flags don't stack (+1, not +2)"); }
  // Totem: −1 to the lane's incoming hits; the token is NOT covered by its own aura
  { const { r, p } = rig("rookie");
    const tot = allyToken(r, "totem");
    G.resolveOps(r, p === null ? null : { side: "foe", lane: 0 }, [], null); // noop guard
    const foe = r.lanes[0][0];
    foe.meleeBonus = 0; foe.rangedBonus = 0;   // isolate AURA math from any foe-LEVELING combat bonus — owner 2026-06-27
    G.resolveOps(r, foe, [{ do: "deal", amount: 2, target: "lane" }]); // lane AoE hits everyone
    eq(p.hp, 99, "totem aura: hero takes −1 from the AoE (2→1)");
    eq(tot.hp, 1, "the totem itself takes the FULL hit (no self-cover)"); }
  // symmetric: a FOE-side totem softens the player's hits on its lane-mates
  { const { r, p, foe } = rig("rookie", { inv: ["blade"] });
    const ftot = G.spawnEnemy("totem"); ftot.side = "foe"; ftot.lane = 0; r.lanes[0].push(ftot);
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 1, "foe totem aura: player's hit softened (1+1−1)"); }
  // Knight: summon item, attacks on its own clock, and buffs lane-mates' damage
  { const { r, p, foe } = rig("rookie", { inv: ["knightBanner"] });
    fire(r, p, 0);
    eq(r.allies[0][0]?.bodyKey, "knight", "Hedgefund Knight item summons the knight");
    for (let t = 0; t < 40; t++) G.simulateTick(r);
    eq(foe.maxHp - foe.hp, 1, "the knight attacks every 4s (phys 1)"); }
  // a rat under a flag BITES harder (the lane aura applies to a summon's CAST too — owner 2026-06-24:
  // a rat plays by the moxie/card rules now, casting its Bite instead of a time-clock attack)
  { const { r, foe } = rig("rookie");
    allyToken(r, "rat"); allyToken(r, "flag");
    for (let t = 0; t < 25; t++) G.simulateTick(r);   // the rat banks 2 moxie and casts Bite ONCE (1 + 1 flag aura)
    eq(foe.maxHp - foe.hp, 2, "flag aura boosts an ally rat's Bite (1 + 1)"); }
}

// ---- THORNS (V2 §4.6, Spikes) ---------------------------------------------------
{
  const { r, p, foe } = rig("rookie", { inv: ["spikes"] });
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

// ---- MOXIE DRAIN (V2 §4.7, Blizzard — moxie world 2026-06-21) ---------------------
// Blizzard's delay op now drains MOXIE (the tempo resource), not the dead per-item charge.
// Its amount is 3. It still hits EVERY foe in the lane (the deal) and drains EACH (the delay).
{
  const { r, p, foe } = rig("cleric", { inv: ["blizzard"] });
  const armed = G.spawnEnemy("rookie", ["fire"]); armed.hp = armed.maxHp = 50; r.lanes[0].push(armed);
  armed.moxie = 7; foe.moxie = 5;
  const h0 = foe.hp, a0 = armed.hp;
  fire(r, p, 0);
  ok(h0 - foe.hp === 3 && a0 - armed.hp === 3, "Blizzard hits EVERY foe in your lane (2+1 each)");
  ok(armed.moxie === 4 && foe.moxie === 2, "…and drains 3 moxie from each foe in the lane (7→4, 5→2)");
  // the drain floors at 0 — it can't push moxie negative
  const lowFoe = r.lanes[0].find((e) => e === foe); lowFoe.moxie = 1;
  fire(r, p, 0);
  eq(foe.moxie, 0, "the moxie drain floors at 0 (1−3 → 0, never negative)");
}

// ---- (DAMAGED-ACCELERATES-CLOCK / Atlas accel test DELETED in the school-free rip 2026-06-23: the
//       accel mechanic had only template bodies, all removed) ----

// ---- FRONT-2 TARGETING (V2 §4.9, Spear) -------------------------------------------
{
  const { r, p, foe } = rig("rookie", { inv: ["spear"] });
  const f2 = G.spawnEnemy("rookie"); f2.hp = f2.maxHp = 50; r.lanes[0].push(f2);
  const f3 = G.spawnEnemy("rookie"); f3.hp = f3.maxHp = 50; r.lanes[0].push(f3);
  fire(r, p, 0);
  ok(foe.maxHp - foe.hp === 4 && f2.maxHp - f2.hp === 4, "Spear hits the front TWO foes (3+1 each)");
  eq(f3.maxHp - f3.hp, 0, "…and not the third");
}

// ---- PLAYER-CAST SUMMON ITEMS (V2 §4.10) ------------------------------------------
{
  const { r, p, foe } = rig("rookie", { inv: ["summonRat", "summonBigRat"] });
  fire(r, p, 0); fire(r, p, 1);
  ok(r.allies[0].some((a) => a.bodyKey === "rat") && r.allies[0].some((a) => a.bodyKey === "largeRat"),
    "Rat + Summon Large Rat put tokens in your lane");
  for (let t = 0; t < 40; t++) G.simulateTick(r);
  // the rat casts Bite (1) at the 2s and 4s marks = 2; the large rat still attacks on its 4s clock (2)
  eq(foe.maxHp - foe.hp, 4, "the summoned rat (Bite, moxie) + large rat both damage the foe");
}

// ---- SUMMONS play by the moxie/card rules (owner 2026-06-24) ---------------------------------
// A rat is a 1-HP, passive-less body that casts a summon-only Bite card off moxie — like anyone else.
{
  ok(!BODIES.rat.passive && BODIES.rat.maxHp === 1, "a rat is a passive-less 1-HP body");
  ok((BODIES.rat.kit ?? []).includes("tBite") && !G.PLAYER_POOL.includes("tBite"),
     "a rat casts Bite — a summon-only card NEVER in the player pool (no draft/loot/shop/foe gear)");
  const { r, foe } = rig("rookie");
  const rat = allyToken(r, "rat");
  ok(rat.queue.some((c) => c.key === "tBite") && rat.moxie === 0, "the summoned rat opens with a Bite queue at 0 moxie");
  for (let t = 0; t < 25; t++) G.simulateTick(r);   // banks 2 moxie by ~2s → one Bite for 1
  eq(foe.maxHp - foe.hp, 1, "the rat casts Bite for 1 once it can afford it (cost 2 ≈ 2s)");
}

// ---- Darkness lifesteal -------------------------------------------------------------
{
  const { r, p, foe } = rig("cleric", { inv: ["darkness"] });
  p.hp = 50;
  const h0 = foe.hp; fire(r, p, 0);
  ok(h0 - foe.hp === 4 && p.hp === 54, "Darkness deals staff+3 and heals the damage dealt");
}

// ---- Trusty Shield: a playable shield card (startCharged is dead — moxie is the gate) -----
// The "pre-charge a startCharged item" mechanic is gone: a card is simply playable the moment
// you can afford it. beginCombat now DEALS the opening hand from the collection (CARDS_SPEC §5),
// so the card lands in hand and grants shield on its first cast.
{
  const { r, p } = rig("rookie", { inv: ["trustyShield"] });
  G.beginCombat(r);   // deals the opening hand + START_MOXIE
  ok(p.hand.some((c) => c.key === "trustyShield"), "beginCombat deals the collection into the opening hand");
  p.moxie = 99;
  fire(r, p, 0);
  eq(p.shield, 2, "Trusty Shield grants 2 shield when played");
}

// ---- Combat-log persistence contract (owner 2026-06-25): EVERY combat is flushed to disk ----
// The server flushes the combat log once per fight, guarded by `_fileLogged` (and clogs the
// CARAVAN-FALLS line once via `_endLogged`). beginCombat MUST re-arm both to false so the guards
// fire ONCE PER COMBAT, not once per run — otherwise a long run's later combats would never persist.
{
  const { r } = rig("rookie", { inv: ["oSword"] });
  r._endLogged = true; r._fileLogged = true;            // simulate a just-finished combat's flushed state
  r.phase = "setup";                                     // beginCombat enters "playing" from setup
  G.beginCombat(r);
  ok(r._fileLogged === false, "beginCombat re-arms _fileLogged → next combat is persisted (once per combat, not per run)");
  ok(r._endLogged === false, "beginCombat re-arms _endLogged → the CARAVAN-FALLS line logs once per combat");
  ok((r.combatLog ?? []).length === 1 && r.combatLog[0].includes("Combat begins"),
     "beginCombat starts a FRESH per-combat log (so the 1500-cap never spans two combats)");
}

// ---- Wind pushes the aimed foe to the BACK of its lane --------------------------------
{
  const { r, p, foe } = rig("rookie", { inv: ["wind"] });
  const f2 = G.spawnEnemy("rookie"); f2.hp = f2.maxHp = 50; r.lanes[0].push(f2);
  p.targetId = foe.id;
  fire(r, p, 0);
  ok(r.lanes[0][0] === f2 && r.lanes[0][1] === foe, "Wind reorders the lane (front foe sent to the back)");
  eq(foe.maxHp - foe.hp, 1, "…after dealing staff+1 (1+0)");
}

// ---- Gang Up: +1 per other ally in your lane -------------------------------------------
{
  const { r, p, foe } = rig("rookie", { inv: ["gangUp"] });
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
  const { r, p, foe } = rig("rookie", { inv: ["blade", "bow"] });
  r.laneCount = 2; r.lanes.push([G.spawnEnemy("rookie")]); r.allies.push([]);
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
  const { r, p, foe } = rig("cleric", { inv: ["lightning"] });
  r.laneCount = 2; r.lanes.push([G.spawnEnemy("rookie")]); r.allies.push([]);
  const other = r.lanes[1][0]; other.hp = other.maxHp = 50;
  p.targetId = other.id;                          // aimed across the board
  fire(r, p, 0);
  ok(foe.maxHp - foe.hp === 3 && other.hp === other.maxHp,
    "lane deals hit the caster's OWN lane (2+1), never the aimed lane");
}

// ---- (school-trigger onSword block DELETED in the school-free rip 2026-06-23) ----

// ---- (room effects — enchants/acid/armory/wandering — REMOVED by owner 2026-06-28; tests deleted) ----

// ---- economy / difficulty weights ---------------------------------------------------------
{
  eq(G.itemTreasure("scaryKnife"), 2, "a 2g item's treasure = 2");
  eq(G.itemTreasure("blizzard"), 4, "a 4g item's treasure = 4");
  eq(G.shopPrice("slimeCrown"), 4, "a ware's price = its face VALUE (itemTreasure) — no markup");
}

// ---- draft wheel: CHEAP entries only (gold-1 bodies AND value-1 bundled items) -------------
{
  const wheel = G.rollDraftWheel(4);
  ok(wheel.every((b) => BODIES[b.bodyKey]?.gold === 1), "the wheel draws gold-1 bodies only");
  ok(wheel.every((b) => b.items.every((k) => (KIT[k]?.ante ?? 9) <= 1)), "draft bundles hold value-1 items only");
  ok(wheel.every((b) => b.items.some((k) => (KIT[k].ops ?? []).some((o) => o.do === "deal"))),
    "every bundle still guarantees a damaging item");
}

// ---- shop shelf is rolled, distinct, value-tagged (value-for-value swap, owner 2026-06-24) ----
{
  const wares = G.rollShopWares();
  eq(wares.length, 5, "the shelf holds 5 wares");
  eq(new Set(wares.map((w) => w.key)).size, 5, "…all distinct");
  ok(wares.every((w) => w.value === G.shopPrice(w.key)), "…each carries its VALUE (no gold price)");
  ok(wares.every((w) => G.PLAYER_POOL.includes(w.key)), "…drawn from the live player card pool");
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

// ---- co-op join PRE-COMBAT: host solo-drafts & auto-starts, friend joins → reopen the draft so
//      the friend picks a loadout AND the lanes re-derive for the bigger party (no overlap). The
//      "multiplayer is bugged / we overlapped / couldn't pick my body" report, 2026-06-24. --------
{
  const r = G.newRoom("CJ");
  const host = G.addPlayer(r, "p1", "Host");
  G.startDraft(r); G.chooseClass(r, host, "warrior");   // host solo-drafts → run auto-starts (1 lane)
  eq(r.laneCount, 1, "host alone → solo run, 1 lane");
  eq(r.phase, "setup", "…and the run has already left the draft (rooms are pre-built → straight to setup)");
  // a friend's socket lands AFTER the host started (server: addPlayer + spawnSquad + reopenDraftForJoin)
  const guest = G.addPlayer(r, "p2", "Guest");
  const reopened = G.reopenDraftForJoin(r);
  ok(reopened, "a pre-combat join reopens the draft");
  eq(r.phase, "draft", "…the room is pulled back into the draft");
  ok(host.drafted, "host KEEPS the body/kit they already locked");
  ok(!guest.drafted, "guest still needs to pick a body/kit");
  // guest picks → draft completes → RE-ENTER the current node with the bigger party
  G.chooseClass(r, guest, "rogue");
  eq(r.phase, "setup", "draft completes → straight to setup (pre-built room, no foe-stock step)");
  eq(r.laneCount, 2, "lanes re-derive to the 2-player count");
  ok([...r.players.values()].every((p) => p.drafted), "both players are drafted");
  const lanesOwned = [...r.players.values()].map((p) => p.ownedLane).sort();
  eq(lanesOwned.join(","), "0,1", "each player owns a DISTINCT lane — no overlap");
}

// ---- a LIVE fight refuses the reopen (lanes are locked) — the joiner folds in next room ----------
{
  const r = G.newRoom("CJ2");
  const host = G.addPlayer(r, "p1", "Host");
  G.startDraft(r); G.chooseClass(r, host, "warrior");
  G.addGreedy(r, host, 0); G.commitStock(r); G.beginCombat(r);
  eq(r.phase, "playing", "fight is live");
  G.addPlayer(r, "p2", "Guest");
  ok(!G.reopenDraftForJoin(r), "no reopen mid-combat (lanes are locked)");
  eq(r.phase, "playing", "…the live fight is untouched");
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
  const { r, p, foe } = rig("rookie");
  foe.meleeBonus = 0; foe.rangedBonus = 0;   // isolate AoE-reach from any foe-LEVELING combat bonus — owner 2026-06-27
  allyToken(r, "rat");
  G.resolveOps(r, foe, [{ do: "deal", amount: 1, target: "lane" }], "magical"); // lizardWizard: staff 1 → 2 each
  eq(p.hp, 98, "foe lane deal hits the hero behind the summon (1+1 staff)");
  eq(r.allies[0].length, 0, "…and the summon too (rat dies to the same AoE)");
  // single-target foe deal still respects the blocker
  const { r: r2, p: p2, foe: f2 } = rig("rookie");
  allyToken(r2, "rat");
  G.resolveOps(r2, f2, [{ do: "deal", amount: 1, target: "front" }], "magical");
  eq(p2.hp, 100, "single-target foe deal is still eaten by the front summon");
}

// ---- summoning a deleted body spawns nothing (no 0-HP ghosts holding a ward) --------
{
  const { r, foe } = rig("rookie");
  G.resolveOps(r, foe, [{ do: "summonArmed", body: "zzzNope", gear: ["fire"], count: 1 }]);
  eq(r.lanes[0].length, 1, "summon of an unknown body is a no-op");
  G.resolveOps(r, foe, [{ do: "summon", body: "rat", count: 1 }]);
  eq(r.lanes[0].length, 2, "summon of a known body still works");
}

// ---- publicBodies cache tracks the HP knob ------------------------------------------
{
  G.setHpMult(2);
  eq(G.publicBodies().leverage.maxHp, 12, "publicBodies reflects HP_MULT=2");
  G.setHpMult(1);
  eq(G.publicBodies().leverage.maxHp, 6, "publicBodies cache invalidates when the knob changes");
}

// ---- UNIFIED FRIENDLY LINE: step in front of (and behind) your summons -----------------
{
  const { r, p, foe } = rig("rookie");
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
  const { r, p, foe } = rig("rookie");
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

// ---- FREE SWAP TO FELLED BODIES (owner 2026-06-24): the gold buy-in ladder is DEAD ------
{
  ok(BODIES.rentier.gold === 1 && BODIES.counterparty.gold === 1, "all bodies are flat gold 1");
  ok(typeof G.buyUnlock === "undefined" && typeof G.unlockCost === "undefined",
    "the gold-unlock API (buyUnlock/unlockCost) is GONE — no treasure, no thresholds");
  const r = G.newRoom("TI");
  const p = G.addPlayer(r, "p1", "A");
  // un-felled bodies are NOT swappable — you wear what you've beaten
  ok(!G.canSwapTo(r, p, "frugal"), "a body you haven't felled is not swappable");
  r.unlockedBodies.add("frugal");      // the party fells it
  ok(G.canSwapTo(r, p, "frugal"), "a FELLED body is free to wear immediately — no gold threshold");
  // felling another opens it too, for free; un-felled siblings stay locked
  ok(!G.canSwapTo(r, p, "leverage"), "an un-felled sibling stays locked (you wear what you've seen)");
  r.unlockedBodies.add("leverage");
  ok(G.canSwapTo(r, p, "leverage"), "…felling it opens it, also free");
  // exclusivity still holds: a body worn by another player is off-limits
  const q = G.addPlayer(r, "p2", "B"); G.wearBody(q, "frugal");
  ok(!G.canSwapTo(r, p, "frugal"), "a body worn by another player stays exclusive (off-limits)");
  // the starter Rookie and bosses/summons are never adoptable
  r.unlockedBodies.add("rookie"); r.unlockedBodies.add("hydra"); r.unlockedBodies.add("rat");
  ok(!G.canSwapTo(r, p, "rookie"), "the starter Rookie is never a swap target");
  ok(!G.canSwapTo(r, p, "hydra") && !G.canSwapTo(r, p, "rat"), "bosses and summon tokens are never adoptable");
  // swapBody actually wears a felled body, free, and releases the old one into the pool
  G.wearBody(p, "rookie"); p.alive = true;
  r.unlockedBodies.add("leverage");
  ok(G.swapBody(r, p, "leverage") === "leverage" && p.bodyKey === "leverage", "swapBody wears a felled body for FREE");
}

// ---- NO DUD FOES: every rolled foe can actually deal damage ---------------------------
{
  ok(!G.itemThreatens("cleric", "crossbow"), "a 0-sword summoner + Repeating Crossbow = dud (blocked)");
  ok(G.itemThreatens("rookie", "crossbow"), "a sword body + Repeating Crossbow threatens");
  ok(G.itemThreatens("cleric", "magicMissile"), "a staff body + Magic Missile threatens");
  ok(!G.itemThreatens("rookie", "magicMissile"), "a 0-staff body + Magic Missile = dud (blocked)");
  ok(G.itemThreatens("cleric", "blade"), "flat-damage items (Sword: 1+0) are never duds");
  ok(!G.itemThreatens("rookie", "totem"), "non-damaging items never count as a threat");
  ok(G.itemThreatens("rookie", "scaryKnife"), "cross-school phys feeds the check too");
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
  { const { r, p, foe } = rig("cleric", { inv: ["scaryKnife"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 1, "wrong-body Scary Knife still chips for 1"); }
  // Magic Missile (staff, base 0) on a 0-staff attacker: same floor
  { const { r, p, foe } = rig("rookie", { inv: ["magicMissile"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 1, "wrong-body Magic Missile still chips for 1"); }
  // …and the floor never inflates a synergized hit
  { const { r, p, foe } = rig("warrior", { inv: ["scaryKnife"] }); const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 2, "on a real swordarm the knife deals its full sword Power (0+2), above the floor"); }
}

// ---- ROOMS FILL to the ante: a random foe selection that EQUALS the budget (owner spec 2026-06-27) ----
{
  let empty = false, overBudget = false, minCardsBad = false, anteMismatch = false, sawUnfilled = false, sawMulti = false;
  for (let t = 0; t < 200; t++) {
    const r = G.newRoom("GEN" + t); r.floor = 2;
    const budget = 20;                                            // big enough to admit multi-foe rooms
    const foes = G.generateRoomFoes(r, budget, 2);
    const total = foes.reduce((s, f) => s + G.anteOfFoe(f), 0);
    if (!foes.length) empty = true;                              // a generated room always has ≥1 foe
    if (total > budget) overBudget = true;                       // …and never overshoots the budget
    // FILL to the ante: a room is left short only if it ran out of foe slots (STOCK_MAX), never on purpose
    if (total < budget - G.minFoeAnte() && foes.length < G.STOCK_MAX) sawUnfilled = true;
    if (foes.length >= 2) sawMulti = true;                       // a 20-budget room is several foes
    for (const f of foes) {
      if ((f.gear ?? []).length < G.FOE_MIN_CARDS) minCardsBad = true;   // every foe ≥ 3 cards
      if (G.anteOfFoe(f) !== f.gear.length + 2 * f.level) anteMismatch = true; // ante = items + 2×level
    }
  }
  ok(!empty, "a generated room always has at least one foe (combat room never empty)");
  ok(!overBudget, "generated foes never exceed the room's ante budget");
  ok(!sawUnfilled, "rooms FILL to the ante — a random selection of foes to EQUAL the budget (owner 2026-06-27)");
  ok(sawMulti, "…and a fuller room is several foes, not one mini");
  ok(!minCardsBad, "every generated foe carries at least FOE_MIN_CARDS (3) cards");
  ok(!anteMismatch, "every generated foe's ante = sum(item ante) + 2×level");
}

// ---- THE ANTE FORMULA = items + 2×level; NO-FLOOR begin gate (owner spec 2026-06-27) -------------
{
  eq(G.bodyAnteOf({ bodyKey: "frugal" }), 1, "body adoption price is still 1 (flat)");
  eq(G.bodyAnteOf({ bodyKey: "counterparty" }), 1, "…the heaviest chassis too");
  // anteOfFoe = sum(item ante) + 2×level (level defaults to 1); the body's old flat +1 is GONE.
  eq(G.anteOfFoe({ bodyKey: "rookie", gear: ["blade"] }), 3, "1 item (1) + level-1 (2) = 3");
  eq(G.anteOfFoe({ bodyKey: "counterparty", gear: ["blizzard", "crossbow"] }), 10, "two rares (4+4) + level-1 (2) = 10");
  eq(G.anteOfFoe({ bodyKey: "rookie", gear: ["blade"], level: 3 }), 7, "+2 ante per level: 1 item + 2×3 = 7");
  eq(G.anteOfFoe({ bodyKey: "rookie", gear: [], level: 5 }), 10, "no items + 2×5 = 10 (level ante scales infinitely)");
  // NO FLOOR (owner spec 2026-06-27): the room arrives PRE-GENERATED to its budget; the begin gate is
  // always open — the party may commit immediately, no minimum ante to stock.
  const r = G.newRoom("AN");
  const p1 = G.addPlayer(r, "p1", "A"), p2 = G.addPlayer(r, "p2", "B");
  G.startDraft(r);
  G.chooseClass(r, p1, "warrior"); G.chooseClass(r, p2, "cleric");   // → enterRoom (floor 1)
  ok(r.draftedFoes.length >= 1, "the room arrives PRE-GENERATED with at least one foe (never empty)");
  eq(r.anteRequired, 0, "there is NO ante floor to meet — the begin gate is 0");
  ok(G.stockReady(r), "stockReady is always true (no floor)");
  G.commitStock(r);
  eq(r.phase, "setup", "the party can begin immediately — no minimum to stock");
}

// ---- SUMMON PLACEMENT (owner 2026-06-12): in front of you or behind you, your call ----
{
  const { r, p } = rig("cleric", { inv: ["summonRat"] });
  fire(r, p, 0);
  let line = G.laneLine(r, p.lane);
  eq(line[0].bodyKey, "rat", "default: a fresh summon steps in FRONT of you");
  // a SECOND rat MERGES into the existing stack (owner 2026-06-27) — not a new token behind you,
  // so summonSide is moot once a rat-stack stands; the one entity just grows.
  p.summonSide = "back";
  fire(r, p, 0);
  line = G.laneLine(r, p.lane);
  const rats = line.filter((e) => e.bodyKey === "rat");
  eq(rats.length, 1, "summonSide is moot for a 2nd rat — it MERGES into the one stack");
  eq(rats[0].ratCount, 2, "…the stack is now '2 rats' (2 HP, bite 2)");

  // back-placement still applies to a FRESH seed (and to non-merging summons)
  const { r: r2, p: p2 } = rig("cleric", { inv: ["summonRat"] });
  p2.summonSide = "back";
  fire(r2, p2, 0);
  const l2 = G.laneLine(r2, p2.lane);
  eq(l2[l2.length - 1].bodyKey, "rat", "summonSide 'back': a fresh rat seeds BEHIND you");
  eq(l2[0].id, p2.id, "…with you in front of your own line");
}

// ---- DRAFT KIT FIT (school-free 2026-06-24: no in-house/off-school anymore — every card fits any
//      body; the only guarantee left is that slot 1 always threatens) --------------
{
  let dud = false;
  for (let n = 0; n < 60; n++) {
    for (const b of G.rollDraftWheel(4)) {
      if (!(KIT[b.items[0]].ops ?? []).some((o) => o.do === "deal")) dud = true;
    }
  }
  ok(!dud, "slot 1 is always a damaging item (no toothless loadout)");
}

// ---- NO ANTE FLOOR: the up-the-ante ratchet is RETIRED; anteCap is the room BUDGET (owner 2026-06-27)
{
  const r = G.newRoom("AW"); const p = G.addPlayer(r, "p", "A");
  G.startDraft(r); G.chooseClass(r, p, "rogue");                 // → enterRoom → stock (auto-generated)
  eq(r.anteMin, 0, "no floor: anteMin is 0");
  ok(r.anteCap > 0, "anteCap is the room's ante BUDGET (a cap, not a floor)");
  const cap0 = r.anteCap;
  ok(!G.upTheAnte(r), "upTheAnte is an inert no-op now (returns false)");
  ok(r.anteMin === 0 && r.anteCap === cap0, "…it never raises the floor/cap — the ratchet is gone");
  // the room budget scales with the contract (party × floor); an elite DOUBLES it
  const solo = G.newRoom("B1"); G.addPlayer(solo, "q", "Q"); solo.floor = 1;
  eq(G.roomAnteBudget(solo, "combat"), G.ROOM_ANTE_BUDGET_PER, "solo · floor 1 budget = ROOM_ANTE_BUDGET_PER");
  eq(G.roomAnteBudget(solo, "elite"), G.ROOM_ANTE_BUDGET_PER * 2, "…an elite double-feature doubles the budget");
  const duoF3 = G.newRoom("B2"); G.addPlayer(duoF3, "a", "A"); G.addPlayer(duoF3, "b", "B"); duoF3.floor = 3;
  eq(G.roomAnteBudget(duoF3, "combat"), G.ROOM_ANTE_BUDGET_PER * 2 * 3, "…and scales with party × floor (2×3)");
}

// ---- FOE LEVELS: HP / COMBAT / ANTE math (owner CORRECTION 2026-06-27 — combat starts at L3) -------
{
  // owner table: L1 BASE · L2 +3 HP · L3 +1 combat · L4 +6 HP +1 combat · L5 +6 HP +2 combat …
  eq(G.levelCombatBonus(1), 0, "L1 is the BASE: no combat");
  eq(G.levelHpBonus(1),     0, "L1: +0 HP");
  eq(G.levelCombatBonus(2), 0, "L2: still no combat (HP-only level)");
  eq(G.levelHpBonus(2),     3, "L2: +3 HP");
  eq(G.levelCombatBonus(3), 1, "L3: FIRST combat grant = +1");
  eq(G.levelHpBonus(3),     3, "L3: still +3 HP");
  eq(G.levelCombatBonus(4), 1, "L4: combat unchanged (+1)");
  eq(G.levelHpBonus(4),     6, "L4: +6 HP total");
  eq(G.levelCombatBonus(5), 2, "L5: +2 combat");
  eq(G.levelHpBonus(5),     6, "L5: still +6 HP");
  // general form: HP = 3×floor(L/2), combat = floor((L-1)/2), ante = 2×L
  for (let L = 1; L <= 12; L++) {
    eq(G.levelHpBonus(L), 3 * Math.floor(L / 2), "HP bonus = 3×floor(L/2) @L" + L);
    eq(G.levelCombatBonus(L), Math.floor((L - 1) / 2), "combat bonus = floor((L-1)/2) @L" + L);
    eq(G.levelAnte(L), 2 * L, "+2 ante per level @L" + L);
  }
}

// ---- FOE LEVELS: spawnEnemy applies HP + combat to the RIGHT stat; summons/bosses EXEMPT ----------
{
  // a melee-kit foe banks its level combat into MELEE; a ranged-kit foe into RANGED ("picks the
  // stat matching its damaging items"). counterparty is a FLEX body, so the KIT decides.
  const m = G.spawnEnemy("counterparty", ["oSword"], 5);   // melee kit, L5
  eq(m.level, 5, "foe carries its level");
  eq(m.maxHp, G.BODIES.counterparty.maxHp + 6, "L5 HP = base + 6");
  eq(m.meleeBonus, 2, "L5 melee-kit foe → +2 MELEE");
  eq(m.rangedBonus, 0, "…and nothing on ranged");
  const rg = G.spawnEnemy("counterparty", ["oFire"], 3);   // ranged kit, L3
  eq(rg.maxHp, G.BODIES.counterparty.maxHp + 3, "L3 HP = base + 3");
  eq(rg.rangedBonus, 1, "L3 ranged-kit foe → +1 RANGED (combat starts at L3)");
  eq(rg.meleeBonus, 0, "…and nothing on melee");
  const lo = G.spawnEnemy("bloodfund", ["oSword"], 1);     // baseline level-1 foe = the BASE
  eq(lo.meleeBonus, 0, "a baseline level-1 foe carries NO combat bonus (the BASE)");
  eq(lo.maxHp, G.BODIES.bloodfund.maxHp, "…and +0 HP at level 1");
  const l2 = G.spawnEnemy("bloodfund", ["oSword"], 2);     // L2 = HP-only
  eq(l2.meleeBonus, 0, "L2: still no combat (combat lands at L3)");
  eq(l2.maxHp, G.BODIES.bloodfund.maxHp + 3, "…but +3 HP");
  // SUMMON tokens + BOSSES are EXEMPT — their stats are absolute regardless of the passed level
  const rat = G.spawnEnemy("rat", [], 5);
  eq(rat.maxHp, 1, "a rat is 1 HP at any level (summon exempt)");
  ok(!rat.meleeBonus && !rat.rangedBonus, "…and gets no level combat bonus");
  const boss = G.spawnEnemy("hydra", [], 7);
  eq(boss.maxHp, G.bodyMaxHp(G.BODIES.hydra), "a boss keeps its budgeted HP (boss exempt)");
  ok(!boss.meleeBonus && !boss.rangedBonus, "…and no level combat bonus");
}

// ---- PLAYER-SIDE LEVELING: 1:1 symmetry — players level their OWN body on the foe curve -----------
{
  // cost to reach level L = 5×(L-1): 5 to hit L2, 10 for L3, 15 for L4 …
  eq(G.levelUpCost(2), 5,  "L2 costs 5 item-value");
  eq(G.levelUpCost(3), 10, "L3 costs 10");
  eq(G.levelUpCost(4), 15, "L4 costs 15");
  const r = G.newRoom("LVL"); r.phase = "stock";
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, "bloodfund");                  // Market-Crash Minotaur (melee body)
  p.deckList = Array(10).fill("oSword");       // a legal combat deck (≥ MIN_DECK), all melee damage
  p.backpack = Array(40).fill("oSword");       // 30 spares to tender
  const base = G.BODIES.bloodfund.maxHp;
  eq(p.level, 1, "starts at level 1 (the base)");
  eq(p.maxHp, base, "…base HP, no bonus");
  // pay 5 value → reach L2 (HP-only)
  ok(G.levelUp(r, p, Array(5).fill("oSword")), "spend 5 → level up to L2");
  eq(p.level, 2, "now level 2");
  eq(p.bodyLevels.bloodfund, 2, "…tracked per-body");
  eq(p.maxHp, base + 3, "L2 grants +3 HP (the foe curve)");
  eq(p.levelMelee, 0, "…no combat yet (combat lands at L3)");
  eq(p.backpack.length, 35, "5 cards spent from the backpack");
  eq(p.deckList.length, 10, "…the deck stayed whole (spares tendered first)");
  // pay 10 value → reach L3 (first combat grant)
  ok(G.levelUp(r, p, Array(10).fill("oSword")), "spend 10 → level up to L3");
  eq(p.level, 3, "now level 3");
  eq(p.maxHp, base + 3, "L3 still +3 HP");
  eq(p.levelMelee, 1, "L3 grants +1 MELEE (the kit's stat)");
  eq(p.levelRanged, 0, "…nothing on ranged");
  // SYMMETRY PILLAR: a level-3 foe wearing the same body+kit is identical
  const foe = G.spawnEnemy("bloodfund", ["oSword"], 3);
  eq(foe.maxHp, p.maxHp, "a level-3 foe-Minotaur has the SAME max HP as the player one");
  eq(foe.meleeBonus, p.levelMelee, "…and the SAME +melee — leveling is 1:1");
  // the level combat base is (re)applied each fight (mirrors a foe baking it at spawn)
  r.lanes = [[]]; r.allies = [[]]; r.caravan = { hp: 99, max: 99 }; r.laneCount = 1; r.phase = "setup";
  p.lane = 0; p.cards = []; p.deck = []; p.hand = [];
  G.beginCombat(r);
  eq(p.meleeBonus, 1, "beginCombat restores the level's +1 melee base");
  // a foe levels too — and underpay / no-payment are rejected
  const q = G.addPlayer(r, "q", "Q"); G.wearBody(q, "bloodfund");
  q.deckList = Array(10).fill("oSword"); q.backpack = Array(10).fill("oSword");
  ok(!G.levelUp(r, q, Array(4).fill("oSword")), "underpay (4 < 5) is rejected");
  ok(!G.levelUp(r, q, []), "no payment is rejected");
  eq(q.level, 1, "…q never leveled");
}

// ---- ELITE: ATLAS, SHRUGGING — the 1:1 symmetric damage-taken reflect (owner spec 2026-06-27) -----
{
  // foe-Atlas: every 10 CUMULATIVE damage TAKEN → deal 10 to the heroes in his lane (accumulator clock)
  const r = G.newRoom("ATL"); r.phase = "playing"; r.laneCount = 1;
  r.allies = [[]]; r.caravan = { hp: 100, max: 100 };
  const hero = G.addPlayer(r, "h", "H"); G.wearBody(hero, "rookie");
  hero.lane = 0; hero.depth = 0; hero.maxHp = hero.hp = 100;
  const atlas = G.spawnEnemy("atlas", [], 1); atlas.hp = atlas.maxHp = 100; atlas.lane = 0;
  r.lanes = [[atlas]];
  G.damageEnemy(r, 0, atlas, 6);   // clock 6 — under the threshold
  eq(hero.hp, 100, "under 10 taken: no shrug yet");
  G.damageEnemy(r, 0, atlas, 6);   // clock 12 → ONE shrug (10), remainder 2
  eq(hero.hp, 90, "10 cumulative taken → Atlas shrugs 10 onto the hero in his lane");
  G.damageEnemy(r, 0, atlas, 8);   // clock 2+8 = 10 → another shrug
  eq(hero.hp, 80, "the remainder carries: another 10 cumulative → another shrug");
  // a NON-Atlas foe never shrugs (rookie: no on-damaged passive at all)
  const plain = G.spawnEnemy("rookie", []); plain.hp = plain.maxHp = 100; plain.lane = 0; plain.queue = [];
  r.lanes = [[plain]];
  G.damageEnemy(r, 0, plain, 30);
  eq(hero.hp, 80, "a regular foe taking 30 reflects nothing");
  // player-Atlas: the SAME reflect, MIRRORED — hits the FOES in his lane
  const r2 = G.newRoom("ATL2"); r2.phase = "playing"; r2.laneCount = 1;
  r2.allies = [[]]; r2.caravan = { hp: 100, max: 100 };
  const pAtlas = G.addPlayer(r2, "pa", "PA"); G.wearBody(pAtlas, "atlas");
  pAtlas.lane = 0; pAtlas.depth = 0; pAtlas.maxHp = pAtlas.hp = 100;
  const dummy = G.spawnEnemy("rookie", []); dummy.hp = dummy.maxHp = 100; dummy.lane = 0; dummy.queue = [];
  r2.lanes = [[dummy]];
  G.damagePlayer(r2, pAtlas, 10);   // 10 taken → shrug 10 onto the foe in his lane
  eq(dummy.hp, 90, "player-Atlas shrugs 10 onto the foe in his lane — the mirror of foe-Atlas");
}

// ---- ELITE ROOM = a DOUBLE-ANTE room (owner spec 2026-06-27: "have elites just be included in rooms") --
{
  // generateEliteFoes is a normal room generated to DOUBLE the ante — no special centerpiece body.
  const solo = G.newRoom("EL1"); G.addPlayer(solo, "p", "P"); solo.floor = 2;
  const ef = G.generateEliteFoes(solo, 2);
  const eTotal = ef.reduce((s, f) => s + G.anteOfFoe(f), 0);
  ok(ef.length >= 1, "an elite room is a room full of foes (never empty)");
  ok(eTotal <= G.roomAnteBudget(solo, "elite") && eTotal > G.roomAnteBudget(solo, "elite") - G.minFoeAnte(),
     "…filled to the DOUBLED ante (floor × party × 2)");
  const rf = G.generateRoomFoes(solo, G.roomAnteBudget(solo, "combat"), 2);
  ok(eTotal > rf.reduce((s, f) => s + G.anteOfFoe(f), 0),
     "…and an elite room out-antes a regular room (the reward is inbuilt to the richer selection)");
  // enterRoom wires the elite branch: an elite node pre-builds a double-ante room → straight to setup
  const r = G.newRoom("EL3"); G.addPlayer(r, "p", "P"); r.floor = 2;
  r.level = { nodes: [{ id: "x", type: "elite", cleared: false, x: 0.5, y: 0.5, links: [] }], currentId: "x" };
  G.enterRoom(r);
  ok(r.draftedFoes.length >= 1, "the elite room is pre-generated WITH foes (no empty room)");
  eq(r.anteCap, G.roomAnteBudget(r, "elite"), "…to the doubled (elite) budget");
  eq(r.phase, "setup", "…and goes straight to setup — no foe-stock step");
  eq(r.anteRequired, 0, "…and still NO floor to meet (begin gate is 0)");
}

// ---- ARCHETYPE-AWARE KITS: ≥3 fitting cards, no off-archetype damage / off-archetype buffs --------
{
  // the fit predicate: ranged body rejects melee, melee body rejects ranged, utility fits any, flex both
  ok(!G.itemFitsArchetype("ratBaron", "oSword"),     "a caster/ranged body never takes a melee Sword");
  ok(!G.itemFitsArchetype("ratBaron", "oSharpEdges"),"…nor a melee-only buff it wouldn't use");
  ok( G.itemFitsArchetype("ratBaron", "oFire"),      "…but takes ranged cards");
  ok( G.itemFitsArchetype("ratBaron", "dShield"),    "…and pure utility fits any body");
  ok(!G.itemFitsArchetype("bloodfund", "oFire"),     "a melee body never takes a ranged Fire");
  ok(!G.itemFitsArchetype("bloodfund", "oWizardHat"),"…nor a ranged-only buff");
  ok( G.itemFitsArchetype("bloodfund", "oSword"),    "…but takes melee cards");
  ok( G.itemFitsArchetype("counterparty", "oSword") && G.itemFitsArchetype("counterparty", "oFire"),
      "a FLEX body accepts both melee and ranged");
  // every body rolls ≥3 cards, ALL fitting, ≥1 damaging — across all archetype bodies
  let under3 = false, offArch = false, noDamage = false;
  for (const body of G.MOXIE_SET) {
    for (let t = 0; t < 30; t++) {
      const kit = G.rollFoeKit(body, 3);
      if (kit.length < 3) under3 = true;
      if (!kit.some((k) => G.itemFitsArchetype(body, k))) noDamage = true;          // sanity
      if (kit.some((k) => !G.itemFitsArchetype(body, k))) offArch = true;
      if (!kit.some((k) => G.itemThreatens(body, k))) noDamage = true;              // ≥1 real threat
    }
  }
  ok(!under3,   "every foe kit has at least 3 cards");
  ok(!offArch,  "every kit card fits the body's archetype");
  ok(!noDamage, "every kit carries at least one card the body can deal damage with");
  // foeCombatStat reads the KIT's flavor, not the body
  eq(G.foeCombatStat("counterparty", ["oSword", "oHatchet"]), "melee", "a melee-heavy kit → melee stat");
  eq(G.foeCombatStat("counterparty", ["oFire", "oLightning"]), "ranged", "a ranged-heavy kit → ranged stat");
}

// ---- ROOM EFFECTS REMOVED (owner 2026-06-28): no gift, no modifiers, no wandering monster --------
{
  // buildLevel no longer attaches ANY enchant to a node (combat/elite/boss/shop all clean)
  for (let f = 1; f <= 2; f++) {
    const lv = G.buildLevel(f);
    ok(lv.nodes.every((n) => n.enchant == null), `floor ${f}: no node carries a room effect`);
  }
  // roomValue is JUST the stocked foe ante — no room base-ante term any more
  const r = G.newRoom("BA"); G.addPlayer(r, "p", "A");
  r.draftedFoes = [{ bodyKey: "rookie", gear: ["blade"], greedy: true, owner: "p" }]; // 1 item + level-1 2 = 3
  eq(G.roomValue(r), 3, "roomValue = stocked ante only (no enchant baseAnte)");
  // the enchant helpers are gone from the engine
  ok(typeof G.pickEnchant === "undefined" && typeof G.applyEnchantToFoe === "undefined"
     && typeof G.seedWanderer === "undefined" && typeof G.ENCHANTS === "undefined",
     "enchant API (pickEnchant/applyEnchantToFoe/seedWanderer/ENCHANTS) is removed");
}

// ---- ROOM VALUE is a DISPLAY number now (owner 2026-06-24): gold is GONE, no income is credited --
{
  const r = G.newRoom("SP");
  G.addPlayer(r, "p1", "A"); G.addPlayer(r, "p2", "B");
  r.draftedFoes = [
    { bodyKey: "rookie", gear: ["blade"], greedy: true, owner: "p1" },     // 1 item + level-1 2 = 3
    { bodyKey: "rookie", gear: ["blizzard", "blade"], greedy: true, owner: "p2" }, // 4+1 items + level-1 2 = 7
  ];
  eq(G.roomValue(r), 10, "roomValue still sums the stocked ante (items + 2×level, the display number)");
  ok(typeof G.creditRoomIncome === "undefined", "the mirrored-income API (creditRoomIncome) is GONE");
  ok([...r.players.values()].every((p) => p.treasure === undefined && p.earned === undefined),
    "players carry NO treasure/earned wallet anymore — card VALUE is the only resource");
}

// ---- DOUBLE FEATURE (elite) DOUBLES the ante BUDGET (owner spec 2026-06-27: a budget, not a floor) --
{
  const r = G.newRoom("DF"); const p = G.addPlayer(r, "p1", "A");
  r.floor = 2;   // so the doubling is visible: a combat room budgets 10, this elite budgets 20
  r.level = { nodes: [{ id: "x", type: "elite", cleared: false, x: 0.5, y: 0.5, links: [] }], currentId: "x" };
  G.enterRoom(r);
  eq(r.picksRequired, 2, "a double feature is still labelled TWO");
  eq(r.anteCap, G.roomAnteBudget(r, "elite"), "the elite room's anteCap is the elite (doubled) budget");
  eq(r.anteCap, G.ROOM_ANTE_BUDGET_PER * 2 * 2, "1 player × floor 2 → base 10, DOUBLED to 20 for the elite");
  eq(r.anteRequired, 0, "…but there is still NO floor to meet (begin gate is 0)");
  ok(r.draftedFoes.length >= 1, "the elite room is pre-generated with foes (no empty room)");
  G.commitStock(r);
  eq(r.phase, "setup", "no minimum — the elite begins immediately");
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

// ---- foe gear is drawn from the EXACT player pool (full symmetry, owner 2026-06-24) ----
{
  let offPool = false;
  for (let i = 0; i < 50; i++) for (const o of G.buildFoePool())
    if ((o.gear ?? []).some((k) => !G.PLAYER_POOL.includes(k))) offPool = true;
  ok(!offPool, "no rolled foe ever carries an off-pool (non-player) card — foe pool == player pool");
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
  ps.forEach((p, i) => { G.wearBody(p, "rookie"); p.maxHp = p.hp = 100; p.lane = i; p.ownedLane = i; p.depth = 0; p.inv = []; });
  r.floor = floor;
  r.laneCount = players;
  r.lanes = Array.from({ length: players }, () => []);
  r.allies = Array.from({ length: players }, () => []);
  r.caravan = { hp: 1e9, max: 1e9 };
  const boss = G.spawnBoss(r);
  r.phase = "playing";
  return { r, ps, boss };
}
// Stock a boss-rig player with a CARD collection (CARDS_SPEC §3): hand = the keys in order,
// deck empty, moxie pinned high, AUTO off (fire() drives single casts). Mirrors rig()'s setup so
// fire(r,p,slot) re-finds the slot's card by key. `inv` is kept for worn-passive stat reads.
const arm = (p, keys) => {
  p.autoFire = false;
  p.cards = G.mintCards(keys); p.hand = [...p.cards]; p.deck = [];
  p.moxie = 99; p.moxieClock = 0;
  p.invKeys = keys.slice(); p.inv = keys.map((k) => ({ key: k }));
};

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
  // heads bite on a rat-like 4s clock (a 1-HP head, owner ruling). NOTE: the RAT itself no longer has
  // this passive — it casts a Bite CARD via moxie now (owner 2026-06-24) — so we assert the head's OWN
  // attack clock rather than comparing to the (now passive-less) rat.
  ok(BODIES.hydraHead.passive?.[0]?.every === 40, "Hydra heads bite on a 4s attack clock");
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
  fe.moxie = G.MOXIE_CAP;   // moxie world: the entity casts via foeCast — fund the cast (START_MOXIE is 0 now)
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
  // The Kraken lock marks the victim's inv slot `stolen` while the entity lives; the engine never
  // re-mints a stolen item into the moxie hand, so it can't be played until rescued (the lock now
  // lives on the gear, surfaced field-by-field in the snapshot projection — the live UI contract).
  eq(victim.inv[slot].stolen, true, "the stolen gear slot is flagged locked while the entity lives");
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

// ---- BOSS PAYDAY (owner 2026-06-24): a shelf of rare CARDS on every boss clear — FREE, no gold --
{
  ok(G.RARE_POOL.length >= 3 && G.RARE_POOL.every((k) => KIT[k].ante >= G.RARE_ANTE),
    "the rare pool is the expensive end of the de-tiered kit (ante ≥ RARE_ANTE)");
  ok(typeof G.BOSS_GOLD === "undefined", "the boss gold bounty (BOSS_GOLD) is GONE — the payday is the card shelf");
  const { r, ps, boss } = bossRig("hydra", { players: 2 });
  r.level = G.buildLevel(1);
  r.level.currentId = r.level.nodes.find((n) => n.type === "boss").id;
  ps.forEach((p) => { p.backpack = []; p.deckList = []; });
  boss.hp = 0;
  r.lanes = r.lanes.map(() => []);
  G.simulateTick(r);
  eq(r.phase, "won", "boss down → won");
  eq(r.loot.length, 2 + 2, "the shelf holds players + 2 rares (2P → 4 cards)");
  ok(r.loot.every((k) => KIT[k].ante >= G.RARE_ANTE) && new Set(r.loot).size === r.loot.length,
    "…all rare, all distinct");
  const k = r.loot[0];
  G.claimLoot(r, ps[0], k);
  ok(ps[0].backpack.includes(k) && !ps[0].deckList.includes(k),
    "claiming is FREE (owner 2026-06-24) — the card joins the BACKPACK (not the combat deck)");
}

// ---- AUTO fire mode (CARDS_SPEC §5): the priciest affordable hand card plays itself -----
// The moxie rewrite changes WHAT auto-play does: instead of pressing every ready button, it plays
// the single most-EXPENSIVE affordable card in hand (best use of moxie), at most ONE per tick, so
// moxie paces the spend. Manual stays the default-off here.
{
  const { r, ps, boss } = bossRig("hydra", { players: 1 });
  const p = ps[0];
  arm(p, ["bow", "heal", "lightning"]);   // costs 2, 2, 4 — lightning is the priciest
  p.targetId = boss.id;
  p.moxie = 0;                            // no moxie → nothing is affordable yet
  const hp0 = boss.hp;
  p.autoFire = false;
  G.simulateTick(r);
  eq(boss.hp, hp0, "MANUAL (opt-in): nothing fires by itself");
  p.autoFire = true;
  G.simulateTick(r);
  eq(boss.hp, hp0, "AUTO with 0 moxie: still nothing — cost is the gate");
  p.moxie = 99;
  const handLen0 = p.hand.length;
  r.useCounts = {};                       // clear telemetry so the next play is unambiguous
  G.simulateTick(r);
  ok(boss.hp < hp0, "AUTO: an affordable card fires itself at your aim");
  ok(r.useCounts.lightning === 1 && !r.useCounts.bow && !r.useCounts.heal,
    "…and it played the PRICIEST affordable card (lightning, cost 4) — best use of moxie, one per tick");
  eq(p.hand.length, handLen0, "…drawing a fresh card keeps the hand full (one play per tick)");
  // AUTO fires fragile one-shots too — and the spent card leaves the collection for the fight
  const fragileKey = Object.keys(KIT).find((k) => KIT[k].fragile && G.isCard(k));
  if (fragileKey) {
    arm(p, [fragileKey]); p.moxie = 99; p.autoFire = true;
    G.simulateTick(r);
    ok(!p.cards.some((c) => c.key === fragileKey), "AUTO fires fragile one-shots too (spent out of the collection)");
  }
  // AUTO presses are REAL uses — the Djinn's party-wide counter ticks on them
  const { r: r2, ps: ps2 } = bossRig("djinn", { players: 1 });
  const p2 = ps2[0];
  arm(p2, ["bow"]); p2.autoFire = true; p2.moxie = 99;
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
  const { r, p } = rig("rookie", { inv: ["haste"] });
  const q = G.addPlayer(r, "q", "Q"); G.wearBody(q, "rookie"); q.lane = 0; q.depth = 1; q.alive = true;
  p.allyTargetId = q.id;
  fire(r, p, 0);
  ok(G.hasBuff(q, "haste") && !G.hasBuff(p, "haste"), "an ally-targeted Haste lands on the TEAMMATE, not the caster");
  p.allyTargetId = null;
  fire(r, p, 0);
  ok(G.hasBuff(p, "haste"), "…and falls back to self with no ally-target");
}

// ---- SQUAD loadout board primitives (owner 2026-06-24: backpacks have no cap; cards move freely)
{
  const r = G.newRoom("LOAD"); r.telemOff = true; r.phase = "won";
  const a = G.addPlayer(r, "s", "Seat");
  const b = G.addPlayer(r, "s-b1", "Seat #2", { bot: true, owner: "s" });
  const other = G.addPlayer(r, "z", "Other");                 // a DIFFERENT seat — must stay walled off
  const [k0, k1, k2, k3] = Object.keys(KIT);
  a.backpack = [k0, k1, k2];                                  // backpack = owned cards (no cap)
  b.backpack = [k3];
  other.backpack = [k0];

  // SWAP exchanges one card each (no gold, positions preserved)
  ok(G.swapOwnItems(r, a, b.id, k0, k3), "swapOwnItems: one-for-one card swap between your bodies");
  ok(a.backpack.includes(k3) && !a.backpack.includes(k0), "…the swapped-in card landed on body A");
  ok(b.backpack.includes(k0) && !b.backpack.includes(k3), "…and body B got A's card back");
  eq(a.backpack.length, 3, "swap preserves A's backpack size");
  eq(b.backpack.length, 1, "swap preserves B's backpack size");
  ok(a.treasure === undefined, "swap moves NO gold (gold is gone)");

  // a MOVE (giveOwnItem) hands a card across — no space gate now (backpacks are uncapped)
  ok(G.giveOwnItem(r, a, b.id, k3), "giveOwnItem: hand a card to your other body");
  eq(b.backpack.length, 2, "…body B grew by one");
  eq(a.backpack.length, 2, "…body A shrank by one");
  ok(!G.giveOwnItem(r, b, b.id, k0), "self-move is a no-op (to === from)");

  // cross-seat is walled off in BOTH primitives
  ok(!G.swapOwnItems(r, a, other.id, a.backpack[0], other.backpack[0]), "swapOwnItems: can't reach another seat's body");
  ok(!G.giveOwnItem(r, a, other.id, a.backpack[0]), "giveOwnItem: can't reach another seat's body");

  // out-of-combat only
  r.phase = "playing";
  ok(!G.swapOwnItems(r, a, b.id, a.backpack[0], b.backpack[0]), "swapOwnItems: blocked mid-combat");
}

// ---- party FORMATION persists across rooms (owner 2026-06-21: "if I throw 2 units in the first
// two lanes, that should happen" — the next room reopens with your arranged lanes, not a reset)
{
  const r = G.newRoom("FORM"); r.telemOff = true;
  G.addPlayer(r, "f", "Form");
  G.addPlayer(r, "f-b1", "Form #2", { bot: true, owner: "f" });
  G.startDraft(r);
  const w = [...r.draftWheel];
  G.draftPick(r, r.players.get("f"), w[0].id);
  G.draftPick(r, r.players.get("f-b1"), w[1].id);    // run starts → enterRoom; 2 bodies → 2 lanes
  const a = r.players.get("f"), b = r.players.get("f-b1");
  eq(r.laneCount, 2, "formation: 2-body squad → 2 lanes");
  ok(a.lane !== b.lane, "first room opens one-body-per-lane (no saved formation yet)");
  // arrange BOTH bodies into lane 0 during SETUP, then begin combat (snapshots the formation)
  a.lane = 0; a.depth = 0; b.lane = 0; b.depth = 1;
  r.phase = "setup"; G.beginCombat(r);
  eq(a.partyLane, 0, "beginCombat snapshots body A's chosen lane");
  eq(b.partyLane, 0, "beginCombat snapshots body B's chosen lane");
  G.enterRoom(r);                                     // the NEXT room
  eq(a.lane, 0, "formation persists: body A stays in lane 0");
  eq(b.lane, 0, "formation persists: body B stays stacked in lane 0");
  ok(a.depth !== b.depth, "stacked bodies get a clean, distinct depth line on reopen");
}

// ===========================================================================
// CARD / MOXIE MECHANICS (CARDS_SPEC.md, rewrite 2026-06-21) — the new combat spine:
// moxie regen + cap, dealHand, playCard (cost gate / deck cycle / fragile / draw refill),
// foeCast (affordability + queue rotation), AUTO picks the priciest affordable card.
// These exercise the engine functions DIRECTLY (no rig sugar) so the model is pinned at the seam.
// ===========================================================================

// ---- constants are the frozen contract numbers --------------------------------------------
{
  eq(G.MOXIE_CAP, 10, "MOXIE_CAP is 10");
  eq(G.MOXIE_REGEN_TICKS, 10, "MOXIE_REGEN_TICKS is 10 (+1 moxie per second)");
  eq(G.START_MOXIE, 0, "START_MOXIE is 0 (both sides open at 0, earn the first cast — owner 2026-06-23)");
  eq(G.HAND_SIZE, 3, "HAND_SIZE is 3 (owner 2026-06-24)");
  ok([1, 2, 3, 4, 5, 6].includes(G.cardCost("blade")) , "every card cost is 1..6");
  ok(Object.keys(KIT).every((k) => { const c = G.cardCost(k); return c >= 1 && c <= 6; }), "EVERY KIT key has a 1..6 cost");
  ok(G.isCard("fire") && !G.isCard("slimeCrown"), "isCard: an ops-bearing card is playable, a worn passive is not");
}

// ---- dealHand: collection → deck + hand of min(5, len), moxie reset to START_MOXIE --------
{
  // a 7-card collection → a 5-card hand, 2 left in the deck
  const big = G.mintCards(["blade", "bow", "fire", "heal", "spear", "hatchet", "darkness"]);
  const p = { bodyKey: "rookie", alive: true, cards: [...big] };
  G.dealHand(p);
  eq(p.hand.length, 3, "dealHand fills the hand to HAND_SIZE (3) from a 7-card collection");
  eq(p.deck.length, 4, "…the remaining 4 cards sit in the draw pile");
  eq(p.hand.length + p.deck.length, p.cards.length, "every card is either in hand or deck (none lost)");
  eq(p.moxie, G.START_MOXIE, "dealHand resets moxie to START_MOXIE");
  eq(p.moxieClock, 0, "…and zeroes the moxie clock");
  // a small collection deals a partial hand (min(5, len)) with an empty deck
  const small = { bodyKey: "rookie", alive: true, cards: G.mintCards(["blade", "bow"]) };
  G.dealHand(small);
  eq(small.hand.length, 2, "a 2-card collection deals a 2-card hand (min(5, len))");
  eq(small.deck.length, 0, "…and an empty draw pile");
  // the hand holds the real card instances, ids intact
  ok(p.hand.every((c) => c.id && KIT[c.key]), "dealt cards carry their {id,key} instance shape");
}

// ---- moxie regen via simulateTick: +1 per 10 ticks, caps at MOXIE_CAP ---------------------
{
  const r = G.newRoom("MX"); const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, "rookie"); p.lane = 0; p.maxHp = p.hp = 100; p.autoFire = false; // AUTO off: don't spend the regen
  p.cards = []; p.hand = []; p.deck = []; p.moxie = 0; p.moxieClock = 0;
  r.phase = "playing"; r.laneCount = 1; r.allies = [[]]; r.caravan = { hp: 1e9, max: 1e9 };
  // an inert foe (empty queue, fat HP) keeps the fight in "playing" without spending/casting
  const sink = G.spawnEnemy("rookie", []); sink.hp = sink.maxHp = 1e9; sink.queue = []; r.lanes = [[sink]];
  for (let t = 0; t < 9; t++) G.simulateTick(r);
  eq(p.moxie, 0, "9 ticks (<1s) → no moxie yet (the clock hasn't rolled over)");
  G.simulateTick(r);
  eq(p.moxie, 1, "the 10th tick = 1 second → +1 moxie");
  for (let t = 0; t < 40; t++) G.simulateTick(r);
  eq(p.moxie, 5, "+1/sec keeps accruing (1 + 4 more seconds = 5)");
  for (let t = 0; t < 100; t++) G.simulateTick(r);
  eq(p.moxie, G.MOXIE_CAP, "moxie caps at MOXIE_CAP (10) — it never overflows");
  // the direct regen helper agrees, and the cap holds
  const e = { moxie: 9, moxieClock: 0 };
  G.regenMoxie(e, 10); G.regenMoxie(e, 10);
  eq(e.moxie, G.MOXIE_CAP, "regenMoxie clamps at the cap too");
}

// ---- playCard: affordable play spends EXACT cost, lands the effect, refills the hand -------
{
  const { r, p, foe } = rig("rookie", { inv: ["fire", "blade", "bow", "heal", "spear"] });
  // a real deck cycle: put one card in the deck so we can see the draw refill
  p.cards = G.mintCards(["fire", "blade", "bow", "heal", "spear", "hatchet"]);
  G.dealHand(p);
  p.moxie = 6;
  const handCard = p.hand[0]; const cost = G.cardCost(handCard.key);
  const handLen0 = p.hand.length, deckLen0 = p.deck.length, h0 = foe.hp;
  ok(G.playCard(r, p, handCard.id), "playCard returns true for an affordable hand card");
  eq(p.moxie, 6 - cost, "…and spends EXACTLY the card's cost");
  eq(p.hand.length, handLen0, "the hand stays full — a fresh card was drawn to replace it");
  // a non-fragile played card shuffles back into the deck then drawUp refills — so the instance
  // is conserved (in hand OR deck), never destroyed, and the collection size is unchanged.
  ok(KIT[handCard.key].fragile
    ? !p.cards.some((c) => c.id === handCard.id)
    : (p.hand.some((c) => c.id === handCard.id) || p.deck.some((c) => c.id === handCard.id)),
    "…a non-fragile played card is conserved (reshuffled into the deck, possibly redrawn)");
  eq(p.hand.length + p.deck.length, p.cards.length, "hand + deck still accounts for the whole collection");
  // UNaffordable: moxie < cost refuses and changes NOTHING
  const dear = p.hand.find((c) => G.cardCost(c.key) > 0);
  p.moxie = 0;
  const snapHand = p.hand.map((c) => c.id).join(), h1 = foe.hp;
  eq(G.playCard(r, p, dear.id), false, "playCard refuses when moxie < cost");
  eq(p.moxie, 0, "…no moxie spent");
  eq(p.hand.map((c) => c.id).join(), snapHand, "…the hand is untouched");
  eq(foe.hp, h1, "…and no effect landed");
  // a card NOT in your hand can't be played (guard on hand membership)
  eq(G.playCard(r, p, "c-not-real"), false, "playCard refuses an id that isn't in the hand");
}

// ---- fragile card: played once, then removed from the collection for the fight -----------
{
  const { r, p } = rig("cleric", { inv: ["gigaCast", "fire"] });
  p.cards = G.mintCards(["gigaCast", "fire"]); G.dealHand(p); p.moxie = 99;
  const giga = p.hand.find((c) => c.key === "gigaCast");
  ok(KIT.gigaCast.fragile, "gigaCast is a fragile one-shot");
  ok(G.playCard(r, p, giga.id), "the fragile card plays once");
  ok(!p.cards.some((c) => c.key === "gigaCast"), "…then it's GONE from the collection (not reshuffled)");
  ok(!p.hand.some((c) => c.key === "gigaCast") && !p.deck.some((c) => c.key === "gigaCast"),
    "…and absent from both hand and deck — unplayable for the rest of the fight");
  eq(G.playCard(r, p, giga.id), false, "a second play of the spent fragile instance is a no-op");
}

// ---- foeCast: a foe with moxie ≥ front cost casts (effect lands) and rotates front→back ---
{
  const r = G.newRoom("FC");
  const p = G.addPlayer(r, "p", "P"); G.wearBody(p, "rookie"); p.lane = 0; p.maxHp = p.hp = 100;
  r.phase = "playing"; r.laneCount = 1; r.allies = [[]]; r.caravan = { hp: 1e9, max: 1e9 };
  const foe = G.spawnEnemy("rookie", []); foe.hp = foe.maxHp = 1000; r.lanes = [[foe]];
  // pin a deterministic 2-card queue: blade (cost 1) in front, hatchet (cost 3) behind
  foe.queue = G.mintCards(["blade", "hatchet"]);
  const frontKey = foe.queue[0].key;
  foe.moxie = 0;
  eq(G.foeCast(r, foe), false, "moxie 0 < cost → the foe does NOT cast");
  ok(foe.queue[0].key === frontKey, "…and the front card stays put");
  foe.moxie = 1;   // exactly the front (blade) cost
  const h0 = p.hp;
  ok(G.foeCast(r, foe), "moxie ≥ front cost → the foe casts");
  ok(p.hp < h0, "…the cast's effect lands on the hero side");
  eq(foe.moxie, 0, "…spending exactly the front card's cost");
  eq(foe.queue[foe.queue.length - 1].key, frontKey, "…and the cast card rotates to the BACK of the queue");
  eq(foe.queue[0].key, "hatchet", "…bringing the next card to the front");
  // an empty queue is a safe no-op
  foe.queue = [];
  eq(G.foeCast(r, foe), false, "an empty queue casts nothing");
}

// ---- AUTO via tick: picks the MOST EXPENSIVE affordable card; combat actually progresses --
{
  // autoPlay directly: hand of costs 1 / 2 / 4 — with moxie 4, the 4-cost is the pick
  const r = G.newRoom("AP");
  const p = G.addPlayer(r, "p", "P"); G.wearBody(p, "cleric"); p.lane = 0; p.maxHp = p.hp = 100;
  r.phase = "playing"; r.laneCount = 1; r.allies = [[]]; r.caravan = { hp: 1e9, max: 1e9 };
  const foe = G.spawnEnemy("rookie", []); foe.hp = foe.maxHp = 1000; foe.queue = []; r.lanes = [[foe]];
  p.cards = G.mintCards(["magicMissile", "fire", "lightning"]); // costs 1, 2, 4
  p.hand = [...p.cards]; p.deck = []; p.moxie = 4; r.useCounts = {};
  G.autoPlay(r, p);
  eq(r.useCounts.lightning, 1, "autoPlay plays the priciest AFFORDABLE card (lightning, cost 4)");
  ok(!r.useCounts.fire && !r.useCounts.magicMissile, "…and ONLY that one (one play per call)");
  // with too little moxie for the big one, it drops to the priciest it CAN afford
  p.cards = G.mintCards(["magicMissile", "fire", "lightning"]);
  p.hand = [...p.cards]; p.deck = []; p.moxie = 3; r.useCounts = {};
  G.autoPlay(r, p);
  eq(r.useCounts.fire, 1, "moxie 3 can't afford lightning(4) → it plays fire(2), the priciest affordable");
  // nothing affordable → autoPlay is a no-op
  p.cards = G.mintCards(["lightning"]); p.hand = [...p.cards]; p.deck = []; p.moxie = 0; r.useCounts = {};
  G.autoPlay(r, p);
  ok(!r.useCounts.lightning, "moxie 0 → autoPlay plays nothing");
  // end-to-end: autoFire ON, the fight PROGRESSES (foe hp falls) over ticks as moxie accrues
  const r2 = G.newRoom("AP2");
  const q = G.addPlayer(r2, "q", "Q"); G.wearBody(q, "rookie"); q.lane = 0; q.maxHp = q.hp = 100;
  r2.phase = "playing"; r2.laneCount = 1; r2.allies = [[]]; r2.caravan = { hp: 1e9, max: 1e9 };
  const dummy = G.spawnEnemy("rookie", []); dummy.hp = dummy.maxHp = 1000; dummy.queue = []; r2.lanes = [[dummy]];
  q.cards = G.mintCards(["blade", "bow", "hatchet"]); G.dealHand(q); // moxie = START_MOXIE
  q.autoFire = true; q.targetId = dummy.id;
  const hp0 = dummy.hp;
  for (let t = 0; t < 60; t++) G.simulateTick(r2);
  ok(dummy.hp < hp0, "AUTO over ticks: moxie accrues and the party chews the foe down (combat progresses)");
}

// ===========================================================================
// THE ARCHETYPE SET (owner spec 2026-06-23) — 15 SCHOOL-FREE bodies, each PROVEN to fire its
// passive. Trigger DSL: {hit:N}=per N damage taken · {spend:N}=per N moxie spent · {play:N}=per
// N cards played · {dealtMelee:N}/{dealtRanged:N}=per N melee/ranged damage dealt · {pairMR}=once
// a melee AND a ranged card have both been played · combatStart={counters,shield,doubleNext}. Keys
// are PROVISIONAL (handoff) → the human NAME is canonical; each block notes both. Cards used: blade
// (melee, deal 1), bow (ranged, deal 1), fire (magical/ranged, deal 3), lightning (deal 2 lane).
// ===========================================================================
{
  const MOXIE = ["frugal", "leverage", "hedge", "ratTrader", "compound",
    "discountDuel", "pyramidRogue", "bloodfund", "heavyHand", "rentier",
    "ratBaron", "counterparty", "juggernaut", "quakeCap", "mutualMend"];
  ok(MOXIE.every((k) => BODIES[k]), "all 15 archetype bodies exist in BODIES");
  ok(MOXIE.every((k) => G.DRAFT_BODIES.includes(k)), "all 15 are in the draft pool → roll on the wheel");
  ok(MOXIE.every((k) => BODIES[k].maxHp >= 6 && BODIES[k].maxHp <= 10), "every body sits in the 6–10 HP band");
  ok(MOXIE.every((k) => BODIES[k].phys === undefined && BODIES[k].mag === undefined), "school-free: no sword/staff Power on any body");
  ok(MOXIE.every((k) => BODIES[k].passive || BODIES[k].combatStart), "every body carries a passive and/or a combatStart grant");
  eq(BODIES.frugal.name, "Fat Cat", "provisional key `frugal` → canonical name Fat Cat");

  // --- frugal = Fat Cat: {hit:3} → summon a rat ------------------------------------------
  { const { r, p } = rig("frugal", { pHp: 100 });
    G.damagePlayer(r, p, 2); eq(r.allies[0].length, 0, "Fat Cat: 2 damage taken is under the 3-threshold");
    G.damagePlayer(r, p, 1); eq(r.allies[0].length, 1, "Fat Cat summons a rat every 3 damage taken"); }

  // --- leverage = Royal Rat: {spend:4} → summon a rat ------------------------------------
  { const { r, p } = rig("leverage", { inv: ["fire"] });     // fire costs 2
    fire(r, p, 0); eq(r.allies[0].length, 0, "Royal Rat: 2 moxie spent is under the 4-threshold");
    fire(r, p, 0); eq(r.allies[0].length, 1, "Royal Rat summons a rat every 4 moxie spent"); }

  // --- hedge = Paid Piper: {play:3} → summon a rat (per CARD, cost-independent) ----------
  { const { r, p } = rig("hedge", { inv: ["blade"] });
    fire(r, p, 0); fire(r, p, 0); eq(r.allies[0].length, 0, "Paid Piper: 2 cards is under the 3-threshold");
    fire(r, p, 0); eq(r.allies[0].length, 1, "Paid Piper summons a rat every 3 cards played"); }

  // --- ratTrader = Toll Troll: {spend:4} → heal 2 ---------------------------------------
  { const { r, p } = rig("ratTrader", { inv: ["fire"], pHp: 100 }); p.hp = 50;
    fire(r, p, 0); eq(p.hp, 50, "Toll Troll: 2 moxie spent hasn't reached the 4-moxie heal");
    fire(r, p, 0); eq(p.hp, 52, "Toll Troll heals 2 every 4 moxie spent"); }

  // --- compound = Centless Centaur: combatStart {doubleNext} → first card resolves twice -
  { const { r, p, foe } = rig("compound", { inv: ["fire"] });
    G.applyCombatStart(p);                                   // rig skips beginCombat; apply the opener
    ok(p.doubleNext, "Centless Centaur opens with its first card armed to double");
    const h0 = foe.hp; fire(r, p, 0); eq(h0 - foe.hp, 6, "…the first card resolves twice (fire 3 → 6)");
    ok(!p.doubleNext, "…the double is consumed by that first card");
    const h1 = foe.hp; fire(r, p, 0); eq(h1 - foe.hp, 3, "…the second card is single (fire 3)"); }

  // --- discountDuel = Malevolent Mouse: combatStart {counters:1} → +1 damage (ANY hit) ---
  { const { r, p, foe } = rig("discountDuel", { inv: ["blade", "bow", "fire"] });
    G.applyCombatStart(p); eq(p.counters, 1, "Malevolent Mouse opens at +1 damage");
    let h = foe.hp; fire(r, p, 0); eq(h - foe.hp, 2, "…a MELEE card deals +1 (blade 1 → 2)");
    h = foe.hp; fire(r, p, 1); eq(h - foe.hp, 2, "…a RANGED card deals +1 too (bow 1 → 2)");
    h = foe.hp; fire(r, p, 2); eq(h - foe.hp, 4, "…and a magical/ranged card deals +1 (fire 3 → 4)"); }

  // --- pyramidRogue = Rent-Seeking Runeblade: {pairMR} → +1 once melee+ranged both played -
  { const { r, p } = rig("pyramidRogue", { inv: ["blade", "bow"] });
    fire(r, p, 0); eq(p.counters ?? 0, 0, "Runeblade: a melee card alone doesn't complete the pair");
    fire(r, p, 1); eq(p.counters, 1, "Runeblade gains +1 once both a melee AND a ranged card are played");
    fire(r, p, 0); eq(p.counters, 1, "…a second melee alone doesn't re-trigger");
    fire(r, p, 1); eq(p.counters, 2, "…the next melee+ranged pair grants another +1"); }

  // --- bloodfund = Market-Crash Minotaur: {hit:3} → melee the front foe for 1 ------------
  { const { r, p, foe } = rig("bloodfund", { pHp: 100 }); const h0 = foe.hp;
    G.damagePlayer(r, p, 2); eq(h0 - foe.hp, 0, "Minotaur: 2 damage taken is under the 3-threshold");
    G.damagePlayer(r, p, 1); eq(h0 - foe.hp, 1, "Minotaur melees the front foe for 1 every 3 damage taken"); }

  // --- heavyHand = Interest Imp: {spend:4} → +1 damage ----------------------------------
  { const { r, p } = rig("heavyHand", { inv: ["fire"] });    // fire costs 2
    fire(r, p, 0); eq(p.counters ?? 0, 0, "Interest Imp: 2 moxie spent is under the 4-threshold");
    fire(r, p, 0); eq(p.counters, 1, "Interest Imp gains +1 damage every 4 moxie spent"); }

  // --- rentier = Vengeful Vampire: {dealtMelee:2} → heal 1 ------------------------------
  { const { r, p } = rig("rentier", { inv: ["blade"], pHp: 100 }); p.hp = 50;
    fire(r, p, 0); eq(p.hp, 50, "Vampire: 1 melee damage dealt hasn't reached the 2-threshold");
    fire(r, p, 0); eq(p.hp, 51, "Vengeful Vampire heals 1 every 2 melee damage dealt"); }

  // --- ratBaron = Lizard Wizard: {dealtRanged:3} → gain a moxie -------------------------
  { const { r, p } = rig("ratBaron", { inv: ["bow"] });      // bow is ranged, deals 1 each
    const c = G.cardCost("bow", BODIES.ratBaron);
    p.moxie = 3 * c;                                         // exact coverage; well under MOXIE_CAP
    const play = () => { const card = p.hand.find((x) => x.key === "bow"); return G.playCard(r, p, card.id); };
    play(); play(); eq(p.moxie, c, "Lizard Wizard: 2 ranged hits haven't banked a moxie yet");
    play(); eq(p.moxie, 1, "Lizard Wizard banks a moxie every 3 ranged damage dealt (0 left after the 3rd cast, +1)"); }

  // --- counterparty = Bond Behemoth: {hit:3} → +1 damage --------------------------------
  { const { r, p } = rig("counterparty", { pHp: 100 });
    G.damagePlayer(r, p, 2); eq(p.counters ?? 0, 0, "Bond Behemoth: 2 damage taken is under the 3-threshold");
    G.damagePlayer(r, p, 1); eq(p.counters, 1, "Bond Behemoth gains +1 damage every 3 damage taken"); }

  // --- juggernaut = Golden Golem: combatStart {shield:2} + {spend:10} → shield = MAX HP --
  { const { r, p } = rig("juggernaut", { inv: ["lightning"], pHp: 100 }); // lightning costs 4; rig maxHp = 100
    G.applyCombatStart(p); eq(p.shield, 2, "Golden Golem enters with a 2-point shield");
    p.hp = 60;                                               // wounded — the refill must read MAX, not current
    fire(r, p, 0); fire(r, p, 0); eq(p.shield, 2, "…8 moxie spent hasn't hit the 10-moxie shield refill");
    fire(r, p, 0); eq(p.shield, 102, "Golden Golem gains shield equal to MAX health every 10 moxie spent (2 + 100, not 60)"); }

  // --- quakeCap = Crypto-Chimera: {play:3} → deal 1 to the foe lane ----------------------
  { const { r, p, foe } = rig("quakeCap", { inv: ["blade"] }); const h0 = foe.hp;
    fire(r, p, 0); fire(r, p, 0);                            // 2 blades (2 dmg); lane chip hasn't fired
    fire(r, p, 0); eq(h0 - foe.hp, 4, "Crypto-Chimera deals 1 to the foe lane every 3rd card (3 blades + 1 lane)"); }

  // --- mutualMend = Weary Wageslave: {play:2} → melee the front foe for 1 ----------------
  { const { r, p, foe } = rig("mutualMend", { inv: ["blade"] }); const h0 = foe.hp;
    fire(r, p, 0); eq(h0 - foe.hp, 1, "Wageslave: one card is just the blade (1)");
    fire(r, p, 0); eq(h0 - foe.hp, 3, "Weary Wageslave melees the front foe for 1 every 2nd card (1 + 1 + 1)"); }
}

// ===========================================================================
// THE DEFENSIVE SET (owner submission 2026-06-24) — school-free shield/sustain cards.
// ===========================================================================
{
  const D = ["dBuckler", "dTaunt", "dShield", "dShieldBash", "dHeartGuard", "dThorns",
    "dStoneskin", "dBloodIron", "dTowerShield", "dTrollskin", "dLiquidMetal"];
  ok(D.every((k) => KIT[k]?.ops?.length && KIT[k].type === undefined), "all 11 defensive cards exist, castable, school-free");
  ok(D.every((k) => G.PLAYER_POOL.includes(k)), "all 11 are live in PLAYER_POOL (draft/loot/foe kits)");

  { const { r, p } = rig("rookie", { inv: ["dTowerShield"] }); fire(r, p, 0); eq(p.shield, 5, "Tower Shield grants 5 shield"); }
  { const { r, p } = rig("rookie", { inv: ["dBuckler"] }); fire(r, p, 0); eq(p.shield, 1, "Tiny Buckler grants 1 shield"); }
  { const { r, p } = rig("rookie", { inv: ["dHeartGuard"], pHp: 100 }); p.hp = 50; fire(r, p, 0);
    eq(p.shield, 2, "Heart Guard grants 2 shield"); eq(p.hp, 52, "…and heals 2"); }
  // Shield Bash: gain 1 shield, then deal = current shield (scales with banked shield)
  { const { r, p, foe } = rig("rookie", { inv: ["dShieldBash"] }); p.shield = 3; const h0 = foe.hp; fire(r, p, 0);
    eq(p.shield, 4, "Shield Bash adds 1 shield (3→4)"); eq(h0 - foe.hp, 4, "…then deals damage equal to current shield (4)"); }
  { const { r, p } = rig("rookie", { inv: ["dThorns"] }); fire(r, p, 0); eq(p.thorns, 1, "Thorns grants a 1-point reflect"); }
  { const { r, p } = rig("rookie", { inv: ["dStoneskin"], pHp: 100 }); fire(r, p, 0); G.damagePlayer(r, p, 3);
    eq(100 - p.hp, 2, "Stoneskin softens a 3-hit to 2"); }
  // Blood To Iron (owner 2026-06-27): count HITS, repay 1 shield PER INSTANCE when the 6s window closes
  { const { r, p } = rig("rookie", { inv: ["dBloodIron"], pHp: 100 }); fire(r, p, 0);
    G.damagePlayer(r, p, 4); G.damagePlayer(r, p, 3); eq(p.shield ?? 0, 0, "Blood To Iron: no shield yet (window open)");
    for (let t = 0; t < 60; t++) G.simulateTick(r); eq(p.shield, 2, "…window closes (6s) → 1 shield per hit (2 hits → 2 shield)"); }
  // Trollskin Tiara: heal 2 every 6s
  { const { r, p } = rig("rookie", { inv: ["dTrollskin"], pHp: 100 }); p.hp = 50; fire(r, p, 0);
    for (let t = 0; t < 59; t++) G.simulateTick(r); eq(p.hp, 50, "Trollskin: nothing before 6s");
    G.simulateTick(r); eq(p.hp, 52, "…heals 2 at 6s"); }
  // Liquid Metal Crown: 3 shield every 6s
  { const { r, p } = rig("rookie", { inv: ["dLiquidMetal"] }); fire(r, p, 0);
    for (let t = 0; t < 60; t++) G.simulateTick(r); eq(p.shield, 3, "Liquid Metal: 3 shield at 6s");
    for (let t = 0; t < 60; t++) G.simulateTick(r); eq(p.shield, 6, "…and again at 12s"); }
  // Taunt: pull the aimed (back) foe to the front of its lane
  { const { r, p } = rig("rookie", { inv: ["dTaunt"] });
    const back = G.spawnEnemy("rookie"); back.hp = back.maxHp = 50; r.lanes[0].push(back);
    p.targetId = back.id; const wasFront = r.lanes[0][0]; fire(r, p, 0);
    ok(r.lanes[0][0] === back && wasFront !== back, "Taunt pulls the aimed back foe to the front of its lane"); }
}

// ============================================================================================
// BACKPACK + DECK economy rework (owner 2026-06-24): backpack = ALL owned cards; deckList = the
// chosen combat deck (sub-multiset of backpack, ≥ MIN_DECK). Combat draws ONLY from deckList.
// ============================================================================================

// ---- a fresh DRAFTED player seeds BOTH backpack and deckList from the bundle (≥ MIN_DECK) ----
{
  const r = G.newRoom("BPK"); r.telemOff = true;
  const p = G.addPlayer(r, "p", "P");
  G.startDraft(r);
  const bundle = r.draftWheel[0];
  G.draftPick(r, p, bundle.id);
  eq(p.backpack.length, G.MIN_DECK, "draft seeds the backpack with the bundle's MIN_DECK cards");
  eq(p.deckList.length, G.MIN_DECK, "…and seeds the deckList identically (deck opens ≥ 10)");
  ok(p.deckList.every((k, i) => k === p.backpack[i]), "deckList starts as a copy of the bundle");
}

// ---- combat `cards` is built from deckList, NOT the backpack ---------------------------------
{
  const r = G.newRoom("BPK2"); r.telemOff = true;
  const p = G.addPlayer(r, "p", "P");
  // a big backpack, but a deck of exactly the 10 owner cards
  p.deckList = ["oSword","oHatchet","oSpear","oBow","oDagger","oFire","oLightning","oWind","oArcane","oHoly"];
  p.backpack = [...p.deckList, "oMeteors","oZweihander","oForce","dTowerShield"]; // 4 backpack-only extras
  const keys = G.deckKeys(p, false);
  eq(keys.length, 10, "deckKeys returns exactly the 10-card deck (not the 14-card backpack)");
  ok(!keys.includes("oMeteors") && !keys.includes("dTowerShield"), "backpack-only cards are NOT in the combat deck");
  p.cards = G.mintCards(G.deckKeys(p, false));
  eq(p.cards.length, 10, "minted combat collection = the deckList");
  ok(p.cards.every((c) => p.deckList.includes(c.key)), "every combat card comes from the deckList");
}

// ---- NO SEEDING: a worn passive in the deck must NOT trigger starter-card padding (owner 2026-06-25)
// Regression: coolShoes (a worn passive, isCard()=false) made the deck count < MIN_DECK *castable*,
// and the old deckKeys padded the gap with STARTER_DECK Swords — cards the player never chose, which
// forced Swords into a real run. The combat deck must now be EXACTLY the chosen castable cards.
{
  const r = G.newRoom("SEED"); r.telemOff = true;
  const p = G.addPlayer(r, "p", "P");
  p.deckList = ["oFire","oLightning","oWind","oArcane","oHoly","oMeteors","oZweihander","oForce","oSpear","coolShoes"];
  const keys = G.deckKeys(p, false);
  eq(keys.length, 9, "worn passive filtered out; deck is NOT padded back to MIN_DECK");
  ok(keys.every((k) => p.deckList.includes(k)), "no card outside the chosen deckList is ever injected");
  ok(!keys.includes("coolShoes"), "the worn passive itself is never a drawable combat card");
}

// ---- moveToDeck / moveToBackpack across the backpack/deck boundary ---------------------------
{
  const r = G.newRoom("MV"); r.telemOff = true; r.phase = "won";
  const p = G.addPlayer(r, "p", "P");
  const ten = ["oSword","oHatchet","oSpear","oBow","oDagger","oFire","oLightning","oWind","oArcane","oHoly"];
  p.deckList = [...ten];
  p.backpack = [...ten, "oMeteors", "oMeteors"];   // owns 2 Meteors, neither in the deck yet

  ok(G.moveToDeck(r, p, "oMeteors"), "moveToDeck: a backpack card not yet maxed in the deck moves in");
  eq(p.deckList.length, 11, "…deck grew to 11");
  ok(G.moveToDeck(r, p, "oMeteors"), "moveToDeck: the SECOND owned copy moves in too");
  eq(p.deckList.filter((k) => k === "oMeteors").length, 2, "…deck now holds both copies");
  ok(!G.moveToDeck(r, p, "oMeteors"), "moveToDeck: a THIRD copy is refused — count(deck) ≤ count(backpack)");
  ok(!G.moveToDeck(r, p, "oForce"), "moveToDeck: a card you don't own is refused");

  // move back down toward the floor
  ok(G.moveToBackpack(r, p, "oMeteors"), "moveToBackpack: pull a copy from the deck (12→11→ still > floor)");
  eq(p.deckList.length, 11, "…deck shrank to 11");
  ok(p.backpack.includes("oMeteors"), "…the card stays owned in the backpack");
  ok(G.moveToBackpack(r, p, "oMeteors"), "moveToBackpack: pull the other copy (11 → 10, the floor)");
  eq(p.deckList.length, G.MIN_DECK, "…deck is exactly at the MIN_DECK floor");
  ok(!G.moveToBackpack(r, p, "oSword"), "moveToBackpack: REFUSED at the floor — never drops below MIN_DECK");
  eq(p.deckList.length, G.MIN_DECK, "…deck held at the floor");
  // gated out of combat
  r.phase = "playing";
  ok(!G.moveToDeck(r, p, "oMeteors") && !G.moveToBackpack(r, p, "oSword"), "deck edits are blocked mid-combat");
}

// ---- buyWare: value-for-value swap (success, underpay, deck-floor rejection) -----------------
{
  // shop rig: a player with a backpack of known cards + a shop offering one ware
  const ten = ["oSword","oHatchet","oSpear","oBow","oDagger","oFire","oLightning","oWind","oArcane","oHoly"];
  // rig: a 10-card deck at the floor + N backpack-only spare pay-cards (all value 1, none in the deck)
  const mk = (spares = ["oMeteors","oZweihander","oForce","oTwinUchis"]) => {
    const r = G.newRoom("SHOP"); r.telemOff = true; r.phase = "shop";
    r.level = G.buildLevel(1); r.shop = { wares: [] };
    const p = G.addPlayer(r, "p", "P");
    p.deckList = [...ten];                                // 10-card deck (exactly at the floor)
    p.backpack = [...ten, ...spares];                    // deck cards + backpack-only spares
    return { r, p };
  };
  // SUCCESS: a value-1 ware paid with one backpack-only value-1 card
  { const { r, p } = mk();
    r.shop.wares = [{ key: "dBuckler", value: G.itemTreasure("dBuckler") }]; // value 1
    eq(G.itemTreasure("dBuckler"), 1, "dBuckler is value 1");
    const before = p.backpack.length;
    ok(G.buyWare(r, p, "dBuckler", ["oMeteors"]), "buyWare: pay value ≥ ware value → success");
    ok(p.backpack.includes("dBuckler"), "…the ware joined the backpack");
    ok(!p.backpack.includes("oMeteors"), "…the pay-card left the backpack");
    eq(p.backpack.length, before, "…backpack size unchanged (1 in, 1 out)");
    eq(r.shop.wares.length, 0, "…the ware left the shelf");
    eq(p.deckList.length, G.MIN_DECK, "…the deck is untouched (pay-card was backpack-only)");
  }
  // UNDERPAY: a value-4 ware can't be bought with a single value-1 card
  { const { r, p } = mk();
    const ware = "slimeCrown";                            // ante/value 4
    eq(G.itemTreasure(ware), 4, "slimeCrown is value 4");
    r.shop.wares = [{ key: ware, value: G.itemTreasure(ware) }];
    ok(!G.buyWare(r, p, ware, ["oMeteors"]), "buyWare: underpay (1 < 4) is REJECTED");
    ok(!p.backpack.includes(ware) && r.shop.wares.length === 1, "…nothing changed on an underpay");
    // …and four value-1 backpack-only cards DO cover it
    ok(G.buyWare(r, p, ware, ["oMeteors","oZweihander","oForce","oTwinUchis"]), "buyWare: 4×value-1 covers value-4 → success");
  }
  // DECK-FLOOR REJECTION: paying with a card that sits in the floored deck would break MIN_DECK
  { const { r, p } = mk(["oMeteors"]);                    // deck at the floor (10), one backpack-only spare
    r.shop.wares = [{ key: "dBuckler", value: 1 }];
    // oDagger is IN the 10-card deck → pulling it would drop the deck to 9 → REJECT
    ok(!G.buyWare(r, p, "dBuckler", ["oDagger"]), "buyWare: REJECTED — a pay-card in the floored deck would break MIN_DECK");
    ok(!p.backpack.includes("dBuckler"), "…nothing bought");
    eq(p.deckList.length, G.MIN_DECK, "…the deck stayed exactly at the floor");
    // paying with the backpack-only spare (not in the deck) is fine
    ok(G.buyWare(r, p, "dBuckler", ["oMeteors"]), "buyWare: paying with a backpack-only card succeeds at the floor");
  }
  // DUPLICATE/SPARE (owner 2026-06-24): tendering a card that's ALSO in the deck spends the SPARE
  // copy, not the deck's — so it never shrinks the deck or trips the floor.
  { const { r, p } = mk(["oDagger"]);                      // a SPARE oDagger on top of the one in the 10-card deck
    r.shop.wares = [{ key: "dBuckler", value: 1 }];
    eq(p.backpack.filter((k) => k === "oDagger").length, 2, "two oDagger owned (1 deck + 1 spare)");
    ok(G.buyWare(r, p, "dBuckler", ["oDagger"]), "buyWare: tendering a SPARE copy succeeds even though the key is in the deck");
    eq(p.deckList.length, G.MIN_DECK, "…the deck is untouched — the spare was spent, not the deck's copy");
    ok(p.deckList.includes("oDagger"), "…the deck still holds its oDagger");
    eq(p.backpack.filter((k) => k === "oDagger").length, 1, "…backpack now holds one oDagger (the deck's copy)");
  }
}

// ---- LOOT → BACKPACK: a cleared room's loot lands in the backpack, not the deck --------------
{
  // solo auto-collect: the win branch pushes loot into the backpack
  const r = G.newRoom("LT"); r.telemOff = true;
  const p = G.addPlayer(r, "p", "P");
  G.startDraft(r); G.draftPick(r, p, r.draftWheel[0].id);   // a real run: deck/backpack seeded
  r.phase = "playing"; r.laneCount = 1; r.lanes = [[]]; r.allies = [[]];
  r.caravan = { hp: 100, max: 100 };
  r.draftedFoes = [{ bodyKey: "rookie", gear: ["blade", "fire"], greedy: true, owner: "p" }];
  const deckBefore = [...p.deckList], bpBefore = p.backpack.length;
  G.simulateTick(r);                                       // no enemies on the board → win
  eq(r.phase, "won", "an empty board resolves to a win");
  ok(p.backpack.length > bpBefore, "solo loot auto-collected into the BACKPACK");
  ok(p.backpack.includes("blade") && p.backpack.includes("fire"), "…the foes' carried cards arrived");
  eq(p.deckList.join(), deckBefore.join(), "…the combat DECK is untouched (loot stays out of the deck)");
  eq(r.loot.length, 0, "…and the solo loot pile is consumed");

  // multiplayer: loot stays a shared pile, claimLoot pulls into the backpack only
  const r2 = G.newRoom("LT2"); r2.telemOff = true; r2.phase = "won";
  const a = G.addPlayer(r2, "a", "A"); G.addPlayer(r2, "b", "B");
  a.backpack = []; a.deckList = [];
  r2.loot = ["blade", "fire"];
  G.claimLoot(r2, a, "fire");
  ok(a.backpack.includes("fire") && !a.deckList.includes("fire"), "claimLoot: the card joins the backpack, not the deck");
  ok(!r2.loot.includes("fire") && r2.loot.includes("blade"), "…claimed loot is scarce (one instance, first-come)");
}

// ============================================================================
// CARAVAN-LESS OVERHAUL (owner spec 2026-06-27): no caravan; foe targeting redirect/snipe;
// rat-merge; the sole loss is "every body AND every summon defeated".
// ============================================================================

// ---- A) the caravan is GONE -------------------------------------------------
{
  const r = G.newRoom("NOCAR");
  ok(r.caravan === undefined, "a fresh room has NO caravan pool");
  ok(typeof G.caravanMaxHp !== "function", "caravanMaxHp is deleted from the export surface");
  const snap = G.snapshot(r);
  ok(!("caravan" in snap), "the snapshot ships NO caravan field");
}

// ---- A/E) the SOLE loss = every body AND every summon defeated --------------
{
  // a downed party with a LONE surviving summon stays in the run
  const r = G.newRoom("LOSS"); r.phase = "playing"; r.laneCount = 1;
  const p = G.addPlayer(r, "p", "P"); G.wearBody(p, "rookie"); p.lane = 0; p.alive = false; p.hp = 0;
  const foe = G.spawnEnemy("rookie"); foe.hp = foe.maxHp = 100; foe.queue = []; foe.side = "foe"; foe.lane = 0;
  r.lanes = [[foe]]; r.allies = [[]];
  const totem = G.spawnEnemy("totem"); totem.side = "hero"; totem.lane = 0; r.allies[0].push(totem); // a summon that doesn't attack
  G.simulateTick(r);
  eq(r.phase, "playing", "all bodies down but a summon alive → STILL in the run");
  // now the last summon falls
  r.allies[0].length = 0;
  G.simulateTick(r);
  eq(r.phase, "lost", "every body AND every summon defeated → the party falls (the sole loss)");
}
{
  // a lone summon can even WIN by clearing the board on its dying turn (win checked before loss)
  const r = G.newRoom("WINLOSS"); r.phase = "playing"; r.laneCount = 1;
  const p = G.addPlayer(r, "p", "P"); G.wearBody(p, "rookie"); p.lane = 0; p.alive = false; p.hp = 0;
  r.lanes = [[]]; r.allies = [[]];   // no enemies left
  G.simulateTick(r);
  eq(r.phase, "won", "an empty board still wins even with the whole party downed (win > loss)");
}

// ---- B) FOE MELEE breach-redirect: follow the bodies, never whiff -----------
{
  // (lanes/laneCount must be set AFTER addPlayer — addPlayer re-derives them from party size)
  const r = G.newRoom("BREACH"); r.phase = "playing";
  const p = G.addPlayer(r, "p", "P"); G.wearBody(p, "rookie");
  r.laneCount = 2; r.lanes = [[], []]; r.allies = [[], []];
  p.lane = 1; p.maxHp = p.hp = 100;
  const foe = G.spawnEnemy("rookie"); foe.side = "foe"; foe.lane = 0; foe.queue = []; r.lanes[0].push(foe);
  eq(G.nearestDefendedLane(r, 0), 1, "lane 0 empty → the nearest defended lane is 1");
  G.resolveOps(r, foe, [{ do: "deal", amount: 5, target: "front" }]);
  eq(p.hp, 95, "a foe whose own lane is empty BREACHES to the bodies (hits the hero in lane 1)");
  // a summon-only lane is DEFENDED — melee hits the summon there, no breach
  const r2 = G.newRoom("BLOCK"); r2.phase = "playing";
  const q = G.addPlayer(r2, "q", "Q");
  r2.laneCount = 2; r2.lanes = [[], []]; r2.allies = [[], []];
  q.lane = 1;                                                  // the player stands clear of lane 0
  const foe2 = G.spawnEnemy("rookie"); foe2.side = "foe"; foe2.lane = 0; r2.lanes[0].push(foe2);
  const rat = G.spawnEnemy("rat"); rat.side = "hero"; rat.lane = 0; rat.ratStack = true; G.syncRatStack(rat); r2.allies[0].push(rat);
  G.foeHitLane(r2, 0, 1, foe2);
  ok(!r2.allies[0].length, "a 1-HP rat blocking the foe's OWN lane takes the melee hit (no breach, summon is a valid blocker)");
  // a totally undefended board → the hit simply whiffs (no caravan, no crash)
  const r3 = G.newRoom("VOID"); r3.phase = "playing"; r3.laneCount = 2; r3.lanes = [[], []]; r3.allies = [[], []];
  eq(G.nearestDefendedLane(r3, 0), -1, "no bodies & no summons anywhere → no defended lane");
  eq(G.foeHitLane(r3, 0, 9, null), 0, "an undefended board absorbs nothing — the hit lands as 0 (party already lost)");
}

// ---- B) FOE RANGED snipe: the lowest effective-HP PLAYER, never a summon ----
{
  const r = G.newRoom("SNIPE"); r.phase = "playing";
  const p0 = G.addPlayer(r, "p0", "A");
  const p1 = G.addPlayer(r, "p1", "B");
  const p2 = G.addPlayer(r, "p2", "C");
  r.laneCount = 3; r.lanes = [[], [], []]; r.allies = [[], [], []];
  p0.lane = 0; p0.maxHp = 100; p0.hp = 80;
  p1.lane = 1; p1.maxHp = 100; p1.hp = 30;                     // lowest eHP
  p2.lane = 2; p2.maxHp = 100; p2.hp = 40; p2.shield = 50;     // eHP 90
  const foe = G.spawnEnemy("rookie"); foe.side = "foe"; foe.lane = 0; foe.queue = []; r.lanes[0].push(foe);
  eq(G.lowestEHpPlayer(r, 0).id, "p1", "lowest hp+shield across ALL lanes is p1 (30), not p2 (40+50)");
  G.resolveOps(r, foe, [{ do: "deal", amount: 7, target: "pick" }]);   // a ranged (pick) card
  eq(p1.hp, 23, "a ranged foe deal snipes the weakest player cross-lane (p1: 30→23)");
  ok(p0.hp === 80 && p2.hp === 40, "…and leaves the healthier players alone");
  // ranged NEVER targets a summon, even one blocking the foe's own lane
  const guard = G.spawnEnemy("largeRat"); guard.side = "hero"; guard.lane = 0; r.allies[0].push(guard);
  const gHp = guard.hp;
  G.foeHitRanged(r, 5, foe);
  ok(guard.hp === gHp, "ranged skips the summon blocking the foe's lane (snipes a player instead)");
  eq(p1.hp, 18, "…the weakest player still takes the ranged hit (23→18)");
}
{
  // tie among equal-lowest → the NEAREST player to the attacker's lane
  const r = G.newRoom("TIE"); r.phase = "playing";
  const a = G.addPlayer(r, "a", "A");
  const b = G.addPlayer(r, "b", "B");
  r.laneCount = 3; r.lanes = [[], [], []]; r.allies = [[], [], []];
  a.lane = 0; a.maxHp = 100; a.hp = 25;
  b.lane = 2; b.maxHp = 100; b.hp = 25;
  eq(G.lowestEHpPlayer(r, 2).id, "b", "equal-lowest eHP → the nearest player to the attacker wins the tie");
}

// ---- F) RAT-MERGE: one HP pool, HP = count = bite, downgrades on damage ------
{
  const { r, p } = rig("cleric", { inv: ["summonRat", "summonRat", "summonRat"] });
  fire(r, p, 0); fire(r, p, 1); fire(r, p, 2);
  const stack = r.allies[0].find((a) => a.ratStack);
  ok(r.allies[0].filter((a) => a.bodyKey === "rat").length === 1, "three rats summon into ONE stack token");
  ok(stack.ratCount === 3 && stack.hp === 3 && stack.maxHp === 3, "the stack is 3 rats / 3 HP");
  eq(stack.counters, 2, "bite scales via counters (tBite 1 + 2 = 3): HP = count = bite");
  eq(stack.name, "3 rats", "named '3 rats'");
  // a foe in the lane chips it for 1 → it DOWNGRADES to '2 rats' bite 2
  const foe = G.spawnEnemy("rookie"); foe.side = "foe"; foe.lane = 0; foe.queue = []; r.lanes[0].push(foe);
  G.foeHitLane(r, 0, 1, foe);
  ok(stack.hp === 2 && stack.ratCount === 2 && stack.counters === 1 && stack.name === "2 rats", "−1 → '2 rats' (2 HP, bite 2)");
  // chip it out — the whole pool dies as one
  G.foeHitLane(r, 0, 2, foe);
  ok(!r.allies[0].some((a) => a.ratStack), "the rat-stack dies as ONE pool at 0 HP");
}
{
  // large rats keep their OWN identity and a SEPARATE stack (3 HP / 2 bite per unit)
  const { r, p } = rig("cleric", { inv: ["summonBigRat", "summonBigRat", "summonRat"] });
  fire(r, p, 0); fire(r, p, 1); fire(r, p, 2);
  const big = r.allies[0].find((a) => a.bodyKey === "largeRat");
  const small = r.allies[0].find((a) => a.bodyKey === "rat");
  ok(big && small && big !== small, "a rat and a large rat form SEPARATE stacks (no cross-merge)");
  ok(big.ratCount === 2 && big.hp === 6 && big.name === "2 large rats", "large rats: 2 units = 6 HP, '2 large rats'");
  eq(big.counters, 2, "large-rat bite scales 2 per unit (effAtk 2 + 2 = 4 for the pair)");
}
{
  // SYMMETRIC: a foe-summoned rat-stack merges the same way (Fat Cat / Royal Rat)
  const r = G.newRoom("FOERATS"); r.phase = "playing"; r.laneCount = 1; r.lanes = [[]]; r.allies = [[]];
  G.addPlayer(r, "p", "P");
  const cat = G.spawnEnemy("rookie"); cat.side = "foe"; cat.lane = 0;
  G.summonBodies(r, cat, { do: "summon", body: "rat", count: 3 });
  const fstack = r.lanes[0].find((e) => e.ratStack);
  ok(fstack && fstack.ratCount === 3 && fstack.hp === 3, "a foe's 3 summoned rats merge into one foe '3 rats' stack");
  G.damageEnemy(r, 0, fstack, 1);
  ok(fstack.ratCount === 2 && fstack.counters === 1, "…and a foe rat-stack downgrades on damage too (symmetry)");
}

// ===== BATCH B (owner 2026-06-27) — new debuff mechanics + new-body passives ===================
{
  // POISON: a stacking DoT that deals `poison` damage every POISON_PERIOD ticks (stacks persist).
  const { r, foe } = rig("cleric", { foeHp: 100 });
  foe.poison = 2; foe.poisonClock = 0;
  const h0 = foe.hp;
  for (let t = 0; t < G.POISON_PERIOD - 1; t++) G.tickPoison(r, foe, 0);
  eq(foe.hp, h0, "poison holds (no damage) until its full period elapses");
  G.tickPoison(r, foe, 0);
  eq(foe.hp, h0 - 2, "poison deals stack-count damage (×2) on the period tick");
  for (let t = 0; t < G.POISON_PERIOD; t++) G.tickPoison(r, foe, 0);
  eq(foe.hp, h0 - 4, "poison keeps ticking each period — the stack persists");
}
{
  // WEAKNESS: the weakened attacker deals half damage, rounded up.
  const foe = G.spawnEnemy("rookie");
  const op = { do: "deal", amount: 6 };
  eq(G.foeDealHit({ lanes: [[foe]] }, foe, op), 6, "baseline: foe deals its full 6");
  G.addBuff(foe, "weakness", 0, 60);
  eq(G.foeDealHit({ lanes: [[foe]] }, foe, op), 3, "Weakness halves a foe's damage (6→3, round up)");
  eq(G.foeDealHit({ lanes: [[foe]] }, foe, { do: "deal", amount: 5 }), 3, "Weakness rounds UP on odd damage (5→3)");
}
{
  // SLOW: moxie charges at HALF rate while slowed (takes 2× as long to bank a moxie).
  const fast = { moxie: 0, moxieClock: 0 };
  const slow = { moxie: 0, moxieClock: 0 };
  G.addBuff(slow, "slow", 0, 60);
  for (let t = 0; t < G.MOXIE_REGEN_TICKS; t++) { G.regenMoxie(fast); G.regenMoxie(slow); }
  eq(fast.moxie, 1, "normal: +1 moxie after one full regen period");
  eq(slow.moxie, 0, "Slow: only half-charged after the same period — no moxie yet");
  for (let t = 0; t < G.MOXIE_REGEN_TICKS; t++) G.regenMoxie(slow);
  eq(slow.moxie, 1, "Slow: +1 moxie only after TWICE as long");
}
{
  // BANKRUPT BASILISK: weakenLane gives every foe in the lane a permanent -1 counter (deals 1 less).
  const { r, p, foe } = rig("basilisk", { foeHp: 100 });
  foe.counters = 0;
  G.resolveOps(r, p, [{ do: "weakenLane", amount: 1 }]);
  eq(foe.counters, -1, "Basilisk weakenLane: each foe in the lane gets a -1 counter");
}
{
  // DEPRESSION DEMON: every debuff the wearer applies lasts twice as long (debuffMult 2).
  const { r, p, foe } = rig("depressionDemon", { foeHp: 100 });
  G.resolveOps(r, p, [{ do: "slow", target: "pick", dur: 60 }]);
  const b = (foe.buffs ?? []).find((x) => x.kind === "slow");
  ok(b && b.dur === 120, "Depression Demon doubles an applied debuff's duration (60→120)");
}
{
  // KILLIONAIRE: starts each combat with 3 moxie (combatStart).
  const k = G.spawnEnemy("killionaire"); k.moxie = 0;
  G.applyCombatStart(k);
  eq(k.moxie, 3, "Killionaire starts combat with 3 moxie");
}
{
  // BOOKIE BONELORD: +1 melee whenever a foe dies in his lane (onKill).
  const r = G.newRoom("BONE"); r.phase = "playing"; r.laneCount = 1; r.allies = [[]];
  const p = G.addPlayer(r, "p", "P"); G.wearBody(p, "bonelord"); p.lane = 0;
  const victim = G.spawnEnemy("rookie"); victim.hp = victim.maxHp = 1; victim.lane = 0;
  r.lanes = [[victim]];
  const m0 = G.meleeBonusOf(p);
  G.damageEnemy(r, 0, victim, 5, p);
  eq(G.meleeBonusOf(p), m0 + 1, "Bonelord gains +1 melee when a foe dies in his lane (onKill)");
}
{
  // NEPOTISTIC NEPTUNE: every card costs 2 more (capped at costMax 10).
  const base = G.cardCost("oFire");
  eq(G.cardCost("oFire", BODIES.neptune), Math.min(10, base + 2), "Neptune: cards cost +2 (capped at 10)");
  eq(BODIES.neptune.doubleExpensive, 5, "Neptune echoes cards costing 5+ (doubleExpensive threshold)");
}

// ---- ELITE ENTRY COST: an elite costs SPARE cards to ENTER — a spend, not a have (owner 2026-06-27) ----
{
  const ten = ["oSword","oHatchet","oSpear","oBow","oDagger","oFire","oLightning","oWind","oArcane","oHoly"];
  const mk = () => {
    const r = G.newRoom("EGATE"); r.telemOff = true; r.floor = 1; r.phase = "won";
    const p = G.addPlayer(r, "p", "P");
    p.bodyKey = "frugal"; p.bodyLevels = {};               // body level 1 (no investment)
    p.deckList = [...ten]; p.backpack = [...ten];          // exactly MIN_DECK → 0 spare cards
    r.level = { nodes: [
      { id: "c", type: "combat", cleared: false, x: 0.5, y: 0.05, links: ["e", "k"] },
      { id: "e", type: "elite",  cleared: false, x: 0.3, y: 0.50, links: [] },
      { id: "k", type: "combat", cleared: false, x: 0.7, y: 0.50, links: [] },
    ], currentId: "c" };
    return { r, p };
  };
  // BASELINE: a fresh draft (0 spares) CAN'T AFFORD the floor-1 elite (costs 2) → locked
  { const { r } = mk();
    ok(G.eliteLock(r).locked, "elite is unaffordable from the get-go (0 spares, costs 2)");
    eq(G.eliteLock(r).cost, 2, "…a floor-1 elite costs 2 spare cards (floor+1)");
    ok(!G.advanceLevel(r, "e"), "advanceLevel into an unaffordable elite is REJECTED");
    eq(r.level.currentId, "c", "…the party did not move");
    ok(G.advanceLevel(r, "k"), "a normal combat node is ALWAYS advanceable (cost is elite-only)");
  }
  // SNAPSHOT exposes a SCALAR cost + lock on elite nodes ONLY
  { const { r } = mk();
    const nodes = G.snapshot(r).map.nodes;
    const e = nodes.find((n) => n.id === "e"), c = nodes.find((n) => n.id === "c");
    eq(e.locked, true, "snapshot marks the elite unaffordable");
    ok(typeof e.lockReason === "string" && e.cost === 2,
       "…with a reason + a SCALAR spare-card cost the client renders as ◈2");
    ok(!("locked" in c), "non-elite nodes carry no cost/lock fields");
  }
  // AFFORD → ENTER → SPEND: bank the cost (2 spares), walk in, the cards are BURNED
  { const { r, p } = mk();
    p.backpack = [...ten, "oMeteors", "oZweihander"];      // 2 cards beyond the deck floor
    eq(G.partySpareCards(r), 2, "party holds exactly the 2-spare cost");
    ok(!G.eliteLock(r).locked, "…cost is affordable → elite is open");
    ok(G.advanceLevel(r, "e"), "…advanceLevel into the elite succeeds");
    eq(r.level.currentId, "e", "…the party entered the elite");
    eq(G.partySpareCards(r), 0, "…and the 2 spares were SPENT on entry (a cost, not just possessed)");
    eq(p.deckList.length, G.MIN_DECK, "…the combat deck was never touched (true spares burned first)");
  }
  // PARTIAL: 1 spare against a 2 cost is still unaffordable — a cost can't be half-paid
  { const { r, p } = mk();
    p.backpack = [...ten, "oMeteors"];                     // only 1 spare
    ok(G.eliteLock(r).locked, "1 spare < 2 cost → still locked");
    ok(!G.advanceLevel(r, "e"), "…and entry is rejected (can't half-pay)");
    eq(G.partySpareCards(r), 1, "…no cards were spent on the rejected entry");
  }
  // A LEVELED body no longer opens an elite — a level can't be SPENT (the old have-path is retired)
  { const { r, p } = mk();
    p.bodyLevels = { frugal: 5 };
    eq(G.partySpareCards(r), 0, "still 0 spare cards");
    ok(G.eliteLock(r).locked, "…a high body level does NOT unlock an elite anymore (the cost is cards, spent)");
  }
  // leaveShop honors the SAME cost (post-shop rows can hold elites) — and spends on entry
  { const { r, p } = mk(); r.phase = "shop"; r.shop = { wares: [] };
    ok(!G.leaveShop(r, "e"), "leaveShop into an unaffordable elite is REJECTED");
    eq(r.level.currentId, "c", "…still parked at the shop node");
    p.backpack = [...ten, "oMeteors", "oZweihander"];      // now bank the cost
    ok(G.leaveShop(r, "e"), "…afford it and leaveShop into the elite succeeds");
    eq(G.partySpareCards(r), 0, "…the cost was spent leaving the shop too");
  }
}

// ---- ROOM OVERHAUL: rooms pre-build their roster (previewable), boss counter, softlock guard (2026-06-28) --
{
  const mkRoom = () => { const r = G.newRoom("ROOMS"); r.telemOff = true; r.floor = 1; G.addPlayer(r, "p", "P"); return r; };
  // SOFTLOCK GUARD: across many random maps, every row keeps ≥1 non-elite AND every non-boss node links to ≥1 non-elite
  { let okRow = true, okLink = true, sawElite = false;
    for (let t = 0; t < 200; t++) {
      const lvl = G.buildLevel(1);
      const byId = Object.fromEntries(lvl.nodes.map((n) => [n.id, n]));
      const rows = {};
      for (const n of lvl.nodes) (rows[n.row] ??= []).push(n);
      for (const row of Object.values(rows)) if (!row.some((n) => n.type !== "elite")) okRow = false;
      for (const n of lvl.nodes) { if (n.links.length && !n.links.some((id) => byId[id]?.type !== "elite")) okLink = false; }
      if (lvl.nodes.some((n) => n.type === "elite")) sawElite = true;
    }
    ok(okRow, "every row keeps ≥1 non-elite node (you can never be forced into an elite row)");
    ok(okLink, "every non-boss node links to ≥1 non-elite next node (no single-node elite funnel)");
    ok(sawElite, "…elites still appear (the ≥1-per-floor guarantee survives the guard)");
  }
  // PRE-BUILD: stockLevelRooms fills every combat/elite node with a roster; boss/shop carry none
  { const r = mkRoom(); r.level = G.buildLevel(1); G.stockLevelRooms(r);
    const rooms = r.level.nodes.filter((n) => n.type === "combat" || n.type === "elite");
    ok(rooms.length > 0 && rooms.every((n) => Array.isArray(n.foes) && n.foes.length > 0), "every combat/elite node is pre-stocked with foes");
    ok(r.level.nodes.filter((n) => n.type !== "combat" && n.type !== "elite").every((n) => !n.foes), "…boss/shop nodes carry no pre-built roster");
  }
  // SNAPSHOT: boss counter + row tags + a `contents` preview that MATCHES the node's real roster
  { const r = mkRoom(); G.startLevel(r);   // builds + stocks + enters the first room
    const map = G.snapshot(r).map;
    ok(typeof map.roomsToBoss === "number" && map.roomsToBoss >= 1, "snapshot exposes a boss counter (roomsToBoss)");
    ok(typeof map.rowCount === "number" && map.rowCount >= 2 && map.currentRow === 0, "…rowCount + currentRow tags");
    const prevNode = map.nodes.find((n) => (n.type === "combat" || n.type === "elite") && n.contents?.length);
    ok(prevNode && prevNode.contents.every((c) => c.bodyKey && c.name && c.maxHp > 0), "combat/elite nodes ship a `contents` foe preview (bodyKey/name/hp)");
    const real = r.level.nodes.find((n) => n.id === prevNode.id);
    eq(prevNode.contents.length, real.foes.length, "…the preview foe count equals the node's real roster");
  }
  // ENTER uses the PRE-BUILT roster (preview == fight), not a fresh reroll
  { const r = mkRoom(); G.startLevel(r);
    const curNode = r.level.nodes.find((n) => n.id === r.level.currentId);
    const draftedKeys = r.draftedFoes.map((f) => f.bodyKey).sort();
    const rosterKeys = (curNode.foes ?? []).map((f) => f.bodyKey).sort();
    eq(JSON.stringify(draftedKeys), JSON.stringify(rosterKeys), "the entered room's foes ARE its pre-built roster (preview matches the fight)");
  }
}

// ---- DECK EDITING allowed in ANY out-of-combat phase, incl. `setup` (owner 2026-06-27) --------------
{
  const ten = ["oSword","oHatchet","oSpear","oBow","oDagger","oFire","oLightning","oWind","oArcane","oHoly"];
  const mk = (phase) => {
    const r = G.newRoom("EDIT"); r.telemOff = true; r.phase = phase;
    const p = G.addPlayer(r, "p", "P");
    p.deckList = [...ten];
    p.backpack = [...ten, "oMeteors"];                     // one spare to shuttle in/out
    return { r, p };
  };
  for (const phase of ["setup", "stock", "draft", "lost"]) {
    const { r, p } = mk(phase);
    ok(G.moveToDeck(r, p, "oMeteors"), `moveToDeck works in '${phase}' (out of combat)`);
    eq(p.deckList.length, 11, `…deck grew in '${phase}'`);
    ok(G.moveToBackpack(r, p, "oMeteors"), `moveToBackpack works in '${phase}'`);
    eq(p.deckList.length, G.MIN_DECK, `…and back to the floor in '${phase}'`);
  }
  // STILL blocked mid-combat
  { const { r, p } = mk("playing");
    ok(!G.moveToDeck(r, p, "oMeteors"), "deck edits are STILL blocked mid-combat (phase 'playing')");
  }
  // MIN_DECK floor invariant still holds in setup
  { const { r, p } = mk("setup");
    ok(!G.moveToBackpack(r, p, "oSword"), "MIN_DECK floor still holds in setup (can't drop below 10)");
    eq(p.deckList.length, G.MIN_DECK, "…deck stayed at the floor");
  }
}

// ---- FUNDJIN = ONE fused two-god ELITE body, both god effects present (owner 2026-06-27) ------------
{
  const f = BODIES.fundjin;
  ok(f.elite === true, "fundjin is marked elite-tier");
  ok(/Fundjin/.test(f.name) && /Profit/i.test(f.name), "its name reads as the two fused gods (placeholder)");
  const timed = (f.passive ?? []).filter((q) => q.every === 60);
  eq(timed.length, 2, "two timed god-passives, each every 6s (60 ticks)");
  ok(timed.some((q) => q.ops.some((o) => o.do === "deal" && o.target === "lane")),
     "Fundjin god: melee the whole foe lane");
  ok(timed.some((q) => q.ops.filter((o) => o.do === "deal" && o.target === "front").length === 2),
     "Raising-Profitsjin god: strike the FRONT foe twice");
}

console.log(fail ? `\n❌ FAILURES — ${pass} passed, ${fail} failed.` : `\n✅ ALL PASS — ${pass} passed, 0 failed.`);
if (fail) process.exit(1);
