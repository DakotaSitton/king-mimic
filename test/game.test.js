// Deterministic unit tests for King Mimic — THE FIRST SET (SLICE_SPEC_V2.md).
// No server, no timing. Run: bun run test/game.test.js
import * as G from "../game.js";
const { KIT, BODIES } = G;

G.setHpMult(1); // canonical 1× HP for mechanic numbers (live/fuzz/e2e run the 2× tuning)
G.setCdMult(1); // canonical 1× cooldowns for timing assertions (live runs the 2× playtest slow-down)
G.setCardGcd(0); // [CARD_GCD] R3: neutralize the per-actor global card cooldown for the EFFECT suite (it isolates card effects, not timing — same spirit as the HP/cd knobs); live play + fuzz run the real CARD_GCD, and the dedicated gate tests at the bottom set it back locally

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("❌ " + label); } };
const eq = (a, b, label) => ok(a === b, `${label} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

// The run now OPENS on a trailhead chooser (owner 2026-06-29): phase "won" at a "start" node, with the
// first combat row as the choices. Step into the first real room from it (mirrors a tap on a room card).
const enterFirstRoom = (r) => {
  const c = G.currentNode(r);
  if (c?.type !== "start") return;
  const opts = c.links.map((id) => r.level.nodes.find((n) => n.id === id));
  G.advanceLevel(r, (opts.find((n) => n.type === "combat") || opts[0]).id);   // a FIGHT (rooms are random-typed now)
};

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
  eq(G.SET_COMMONS.length, 20, "SET_COMMONS = the original 15 + 5 batch-C commons (Sphinx promoted to elite, owner 2026-07-09)");
  ok(G.SET_COMMONS.every((k) => BODIES[k]?.gold === 1), "every common body is one flat entry, gold 1 (elites are gold 2)");
  ok(G.SET_COMMONS.every((k) => !BODIES[k + "U"] && !BODIES[k + "R"]), "NO U/R variants exist — power comes from items, not tiers");
  ok(Object.values(KIT).every((i) => i.rarity === undefined), "items carry NO rarity class — only individual gold values");
  eq(G.PLAYER_POOL.length, 69, "68 − Wizard Hat + Blizzard + Big Wizard Hat = 69 (Wizard Hat→modal Sharpened Edges; Blizzard & Big Wizard Hat added — owner 2026-07-09)");
  ok(!KIT.oWizardHat && !G.PLAYER_POOL.includes("oWizardHat"), "Wizard Hat is gone (merged into modal Sharpened Edges, owner 2026-07-09)");
  ok(KIT.oBlizzard && G.PLAYER_POOL.includes("oBlizzard"), "Blizzard is in KIT and the pool (owner 2026-07-09)");
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
  // Sharpened Edges — MODAL (owner 2026-07-09): the play's pick chooses melee OR ranged; +1 to that
  // kind this fight. Wizard Hat (the old ranged-only twin) is DELETED and merged in. A tiny local
  // player-with-a-pick play (fire() sends no pick). Anchors: Dagger 1 (melee), Arcane 1 (ranged).
  const playPick = (r, p, key, pick) => { p.moxie = 99; const c = (p.hand ?? []).find((x) => x.key === key); return c ? G.playCard(r, p, c.id, pick) : false; };
  // pick "melee" → +1 meleeBonus, lifts the melee card, NOT the ranged one
  { const { r, p, foe } = rig("rookie", { inv: ["oSharpEdges", "oDagger", "oArcane"] });
    playPick(r, p, "oSharpEdges", "melee");
    eq(p.meleeBonus, 1, "Sharpened Edges pick 'melee' → +1 meleeBonus");
    eq(p.rangedBonus ?? 0, 0, "…and nothing on ranged");
    const hd = foe.hp; fire(r, p, 1); eq(hd - foe.hp, 2, "…raises Dagger's 1 to 2");
    const ha = foe.hp; fire(r, p, 2); eq(ha - foe.hp, 1, "…but does NOT lift Arcane (ranged stays 1)"); }
  // pick "ranged" → +1 rangedBonus (the OLD Wizard Hat behavior, now folded into the same card)
  { const { r, p, foe } = rig("rookie", { inv: ["oSharpEdges", "oDagger", "oArcane"] });
    playPick(r, p, "oSharpEdges", "ranged");
    eq(p.rangedBonus, 1, "Sharpened Edges pick 'ranged' → +1 rangedBonus (Wizard Hat merged in)");
    eq(p.meleeBonus ?? 0, 0, "…and nothing on melee");
    const ha = foe.hp; fire(r, p, 2); eq(ha - foe.hp, 2, "…raises Arcane's 1 to 2");
    const hd = foe.hp; fire(r, p, 1); eq(hd - foe.hp, 1, "…but does NOT lift Dagger (melee stays 1)"); }
  // NO pick (a bot / garbage pick) on a flex body → the melee default (safety net, never a crash)
  { const { r, p } = rig("rookie", { inv: ["oSharpEdges"] });
    fire(r, p, 0);   // fire() sends NO pick
    eq(p.meleeBonus, 1, "Sharpened Edges with NO pick defaults to melee (flex/bot safety net)");
    eq(p.rangedBonus ?? 0, 0, "…nothing on ranged"); }
  // FOE auto-pick by BODY AFFINITY (no reticle): melee body → melee, ranged body → ranged, flex → melee
  { const modalFoe = (body, key) => { const r = G.newRoom("T"); r.phase = "playing"; r.laneCount = 1; r.allies = [[]];
      const f = G.spawnEnemy(body, []); f.lane = 0; f.side = "foe"; f.queue = G.mintCards([key]); f.moxie = 99; r.lanes = [[f]];
      G.foeCast(r, f); return f; };
    const mel = modalFoe("bloodfund", "oSharpEdges");
    eq(mel.meleeBonus ?? 0, 1, "foe Sharpened Edges: a MELEE-archetype body auto-picks melee");
    eq(mel.rangedBonus ?? 0, 0, "…and not ranged");
    const rng = modalFoe("ratBaron", "oSharpEdges");
    eq(rng.rangedBonus ?? 0, 1, "foe Sharpened Edges: a RANGED-archetype body auto-picks ranged");
    eq(rng.meleeBonus ?? 0, 0, "…and not melee");
    const flx = modalFoe("counterparty", "oSharpEdges");
    eq(flx.meleeBonus ?? 0, 1, "foe Sharpened Edges: a FLEX body takes the melee default (FLAG)"); }
  // Moxie Pool: regen kind "moxie" banks +1 every 60 ticks (capped). Play it, drain moxie, tick 6s.
  { const { r, p } = rig("rookie", { inv: ["oMoxiePool"] });
    p.autoFire = false; fire(r, p, 0); p.moxie = 0; p.moxieClock = 0;
    for (let t = 0; t < 60; t++) G.tickRegens(p);     // 6 seconds of regen-only ticks
    eq(p.moxie, 1, "Moxie Pool banks +1 moxie every 6s (regen kind moxie)"); }
  // Demon Form — MODAL, per-tick (owner 2026-07-09): the pick chooses melee OR ranged; +1 to THAT
  // kind climbs every 60-tick period (lasting). The pick is baked into the regen record AT CAST.
  { const { r, p } = rig("rookie", { inv: ["oDemonForm"] });
    const c = p.hand.find((x) => x.key === "oDemonForm"); G.playCard(r, p, c.id, "melee");
    for (let t = 0; t < 60; t++) G.tickRegens(p);
    eq(p.meleeBonus, 1, "Demon Form pick 'melee' ramps +1 meleeBonus every 6s");
    for (let t = 0; t < 60; t++) G.tickRegens(p);
    eq(p.meleeBonus, 2, "…and again the next period");
    eq(p.rangedBonus ?? 0, 0, "…ranged stays 0 (the pick was melee)"); }
  { const { r, p } = rig("rookie", { inv: ["oDemonForm"] });
    const c = p.hand.find((x) => x.key === "oDemonForm"); G.playCard(r, p, c.id, "ranged");
    for (let t = 0; t < 60; t++) G.tickRegens(p);
    eq(p.rangedBonus, 1, "Demon Form pick 'ranged' ramps +1 rangedBonus (the old Sage-Mode niche moved here)");
    eq(p.meleeBonus ?? 0, 0, "…melee stays 0"); }
  // a FOE Demon Form auto-picks by affinity, then ramps THAT kind per tick
  { const r = G.newRoom("T"); r.phase = "playing"; r.laneCount = 1; r.allies = [[]];
    const f = G.spawnEnemy("ratBaron", []); f.lane = 0; f.side = "foe"; f.queue = G.mintCards(["oDemonForm"]); f.moxie = 99;
    r.lanes = [[f]]; G.foeCast(r, f);
    for (let t = 0; t < 60; t++) G.tickRegens(f);
    eq(f.rangedBonus ?? 0, 1, "foe Demon Form: a ranged body ramps RANGED per tick (auto-pick)");
    eq(f.meleeBonus ?? 0, 0, "…and not melee"); }
  // Sage Mode — REPURPOSED (owner 2026-07-09): a lasting HEAL (Trollskin pattern), no longer a ranged ramp.
  { const { r, p } = rig("rookie", { inv: ["oSageMode"], pHp: 20 });
    p.hp = 10; fire(r, p, 0);
    for (let t = 0; t < 60; t++) G.tickRegens(p);
    eq(p.hp, 12, "Sage Mode heals 2 every 6s (repurposed to healing)");
    eq(p.rangedBonus ?? 0, 0, "…and grants NO ranged bonus anymore"); }
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
  // Berserker's self-"take 1" is a hit of >0 damage → it fires the on-damaged triggers, even though its own
  // +1 shield absorbs it whole (owner 2026-07-09: self-inflicted damage counts as taking damage).
  { const { r, p } = rig("rookie", { inv: ["oBerserker", "oJesterplate", "dBloodIron"], pHp: 100 });
    fire(r, p, 0); fire(r, p, 1); fire(r, p, 2); p.moxie = 0; const hp0 = p.hp;
    for (let t = 0; t < 60; t++) G.tickRegens(p, r);  // one berserk period: +1 shield, then the self-hit (shield eats it)
    eq(p.hp, hp0, "Berserker's self-hit is absorbed by its own +1 shield (no HP lost)");
    eq(p.moxie, 1, "…yet the self-hit fires Jesterplate (+1 moxie)");
    eq(p.bloodToIron.stored, 1, "…and Blood To Iron counts the self-hit"); }
  // Pile On: base 1 (you count YOURSELF) + 1 per OTHER ally in your lane. Solo = 1; +teammate +rat = 3.
  { const { r, p, foe } = rig("rookie", { inv: ["oPileOn"] });
    r.level = { nodes: [], currentId: null };
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 1, "Pile On solo deals 1 — you count yourself (floor of 1, owner 2026-07-08)");
    const p2 = G.addPlayer(r, "p2", "B"); p2.lane = 0; allyToken(r, "rat");
    const h1 = foe.hp; fire(r, p, 0);
    eq(h1 - foe.hp, 3, "Pile On: 1 (self) + 1 per other ally (teammate + rat) = 3"); }
  // Hedgefund Knight summon: spawns a hero-side token with hp 5 and +1 damage resist.
  { const { r, p } = rig("rookie", { inv: ["oHedgeKnight"] });
    fire(r, p, 0);
    const kn = r.allies[0][0];
    ok(kn && kn.bodyKey === "hedgeKnight", "Hedgefund Knight card summons a hedgeKnight token");
    eq(kn.maxHp, 5, "…with 5 HP (summon token, HP-knob exempt)");
    eq(BODIES.hedgeKnight.dmgReduce, 1, "…and +1 damage resist (body dmgReduce)");
    eq(G.effectiveDamageTo(r, kn, 3), 2, "…so a 3-damage hit is reduced to 2"); }
  // Cool Shoes (owner 2026-07-06, RE-REWORKED — "There's no such thing as a passive… They're just a
  // card. They have a castable moxie cost! They're a passive like Stoneskin is a passive."): a
  // CASTABLE LASTING card. Drawn like any card, cast for its real ⚡ cost, installs a fight-long
  // +1-moxie-per-play buff. The worn-from-the-backpack behavior (owner 6/25) is DEAD.
  { ok(!G.isPassiveItem("coolShoes"), "Cool Shoes is NOT a worn passive anymore");
    ok(G.isCard("coolShoes"), "…it's a castable card (has ops) — it draws into hands and foe queues");
    ok(KIT.coolShoes.lasting, "…LASTING: once cast it stays in play for the fight");
    eq(G.triggerKind("coolShoes"), "none", "…and typeless (self card — feeds neither play trigger)");
    const { r, p } = rig("rookie", { inv: ["coolShoes", "oDagger", "oFire"] });
    // BEFORE casting: merely owning the shoes refunds nothing (the invisible worn behavior is gone)
    p.moxie = 6;
    { const c = p.hand.find((x) => x.key === "oDagger"); ok(G.playCard(r, p, c.id), "Dagger plays pre-shoes"); }
    eq(p.moxie, 6 - G.cardCost("oDagger"), "no refund before Cool Shoes is CAST");
    // CAST the shoes: real cost paid; the buff installs before the play-refund step, so the cast
    // refunds its own play ("gain 1 each time you play a card" — casting the shoes IS a play)
    p.moxie = 6;
    { const c = p.hand.find((x) => x.key === "coolShoes"); ok(G.playCard(r, p, c.id), "Cool Shoes CASTS like any card"); }
    eq(p.moxie, 6 - G.cardCost("coolShoes") + 1, "…real ⚡ cost paid (its own play refunds 1)");
    eq(p.moxieOnPlayBuff, 1, "…the fight-long refund buff is installed");
    ok((p.inPlay ?? []).some((x) => x.key === "coolShoes"), "…and the card sits IN PLAY (lasting)");
    // AFTER casting: every play refunds
    p.moxie = 6;
    { const c = p.hand.find((x) => x.key === "oFire"); ok(G.playCard(r, p, c.id), "Fire plays post-shoes"); }
    eq(p.moxie, 6 - G.cardCost("oFire") + 1, "each later play refunds +1 (net = cost − 1)");
    // PER-FIGHT: a fresh combat wipes the buff — re-cast the shoes each room
    G.beginCombat(r);
    eq(p.moxieOnPlayBuff ?? 0, 0, "a NEW fight wipes the refund buff (re-cast each combat)"); }
}

// ---- (worn-passive school clocks, school-power scaling, and ECHO blocks DELETED in the school-free rip 2026-06-23) ----

// ---- POST-FLOOR-3 WAVE cards DELETED (owner 2026-07-09 "remove all the old ones"). Still-live
// mechanics keep coverage via owner carriers / direct engine calls: Haste→oHaste, the stoneskin buff
// (addBuff), Omnislash→oOmnislash. Power Boost (school-Power buff on a TYPED card) / Giga Cast / Time
// Stop / Revive had no owner card and no live pathway (their engine ops remain but nothing casts
// them) — their card-driven tests are gone with the cards. --
{
  // Haste: MOXIE charges double-speed while it runs (oHaste, owner card — same "haste" buff).
  { const { r, p } = rig("rookie", { inv: ["oHaste"] });  // tempo-neutral body
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
  // Stone Skin softens hits — for players AND foes (1:1 symmetry). The stoneskin BUFF survives
  // (dStoneskin casts it); tested here via addBuff directly, as before.
  { const { r, p } = rig("rookie");
    G.addBuff(p, "stoneskin", 2, 80);
    G.damagePlayer(r, p, 3);
    eq(100 - p.hp, 1, "Stone Skin: a 3-hit lands for 1 on a player"); }
  { const { r, p, foe } = rig("rookie", { inv: ["oDagger"] });
    G.addBuff(foe, "stoneskin", 2, 80);
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 0, "a Stone-Skinned FOE shrugs the same hit (owner Dagger 1 − 2 DR → 0)"); }
  // Omnislash → oOmnislash: four separate melee strikes of 2 each (owner card; flat, scales off the
  // MELEE BONUS, not body Power — owner cards are school-free).
  { const { r, p, foe } = rig("cleric", { inv: ["oOmnislash"] });
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 8, "oOmnislash: 4 strikes × 2 = 8 at base (no melee bonus)"); }
  { const { r, p, foe } = rig("cleric", { inv: ["oOmnislash"] });
    p.meleeBonus = 2;                                    // a melee ramp lifts every one of the 4 hits
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 16, "…and 4 × (2 + melee bonus 2) = 16 with a ramp up"); }
}

// ---- foe-item audit (owner 2026-06-12: "never seen a blizzard") -----------------------
{
  // a foe Blizzard drains the heroes' MOXIE equal to the damage it deals (owner 2026-07-09 lane-Ice):
  // oBlizzard deals 1 to every hero in its lane, then drains each by that 1 (delay {ofDealt}).
  { const { r, p } = rig("rookie", { inv: ["oHatchet"] });
    p.moxie = 9;
    const foe = G.spawnEnemy("cleric", []); foe.hp = foe.maxHp = 1000; foe.side = "foe"; foe.lane = 0;
    r.lanes[0] = [foe];
    G.resolveOps(r, foe, KIT.oBlizzard.ops);
    eq(p.moxie, 8, "a foe Blizzard drains moxie = the 1 damage dealt off the hero — symmetric bite (9→8)"); }
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
  eq(G.cardCost("oDagger"), G.cardCost("oDagger"), "a card's cost is body-independent (no sword CDR)");
  eq(KIT.oDagger.cost, 1, "Dagger costs 1 moxie regardless of who casts it");
  eq(KIT.oSword.cost, 2, "Sword costs 2 moxie regardless of who casts it");
  // a foe's stocked active gear joins its cast QUEUE (it no longer charges on an item cooldown).
  // PARITY (owner 2026-06-22): only OWNER-set gear surfaces in the queue — legacy keys are dropped.
  const fp = G.spawnEnemy("rookie", ["oSword"]);
  ok(fp.queue.some((c) => c.key === "oSword"), "a foe's stocked owner-set gear joins its moxie cast queue");
  ok(!G.spawnEnemy("rookie", ["blade"]).queue.some((c) => c.key === "blade"), "…but legacy off-set gear never does");
  ok(typeof fp.moxie === "number" && fp.moxieClock === 0, "…and the foe opens with moxie, not item charge");
}

// SNAPSHOT contract for the mobile foe HUD (owner 2026-06-29): each lane foe ships its CURRENT moxie,
// the cap, a 0–1 cast fraction, and the queued cards' costs — the compact phone foe rows read exactly
// these to show "HP · moxie · next card" for up to 4 foes without clipping off the top of the board.
{
  const r = G.newRoom("FX");
  r.phase = "playing"; r.laneCount = 1;
  const fe = G.spawnEnemy("rookie", ["oSword"]);
  fe.moxie = 2; fe.moxieClock = 0;
  r.lanes = [[fe]]; r.allies = [[]]; r.caravan = { hp: 1e9, max: 1e9 };
  const card = G.snapshot(r).lanes[0].enemies.find((e) => e.id === fe.id);
  eq(card.moxie, 2, "a lane foe ships its CURRENT moxie");
  eq(card.moxieMax, G.MOXIE_CAP, "…and the moxie cap, so the row can show ⚡moxie/max");
  ok(typeof card.castFrac === "number" && card.castFrac > 0 && card.castFrac <= 1,
    "…and a 0–1 cast fraction toward the front card (the chip's fill = how soon)");
  ok(card.queue.length && typeof card.queue[0].cost === "number",
    "…and the front queued card carries its moxie cost (the chip's ⚡moxie/cost)");
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
  p1.cards = G.mintCards(["oHoly"]); p1.hand = [...p1.cards]; p1.deck = []; p1.invKeys = ["oHoly"];
  G.setAllyTarget(r, p1, "p2");
  fire(r, p1, 0);
  eq(p2.hp, 45, "Holy reads the ally-target — cross-lane, exact ally (heal 5)");
  // fallback: no ally-target → most-hurt friendly in YOUR lane (self included)
  G.setAllyTarget(r, p1, null); p1.hp = 50;
  fire(r, p1, 0);
  ok(p1.hp === 55 && p2.hp === 45, "no ally-target → falls back to most-hurt in own lane (self)");
  // a dead ally-target also falls back
  G.setAllyTarget(r, p1, "p2"); p2.alive = false;
  fire(r, p1, 0);
  ok(p1.hp === 60 && p2.hp === 45, "dead ally-target → fallback, never a wasted heal");
}

// ---- AURA TOKENS (V2 §4.2) -----------------------------------------------------
{
  // Flag: +1 to the lane's outgoing hits. (The flag SUMMON card is retired; spawn the flag TOKEN
  // directly — the aura engine is what's under test.)
  { const { r, p, foe } = rig("rookie", { inv: ["oDagger"] });
    allyToken(r, "flag");
    eq(r.allies[0][0]?.bodyKey, "flag", "the flag token stands in the lane");
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 2, "flag aura: lane ally deals +1 (Dagger 1 + 1)");
    // same aura type does NOT stack — strongest applies
    allyToken(r, "flag");
    const h1 = foe.hp; fire(r, p, 0);
    eq(h1 - foe.hp, 2, "two flags don't stack (+1, not +2)"); }
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
  { const { r, p, foe } = rig("rookie", { inv: ["oSword"] });
    const ftot = G.spawnEnemy("totem"); ftot.side = "foe"; ftot.lane = 0; r.lanes[0].push(ftot);
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 2, "foe totem aura: player's hit softened (Sword 3 − 1)"); }
  // Knight: a summon that attacks on its own clock and buffs lane-mates. (The knightBanner CARD is
  // retired; summon the knight TOKEN directly — the token's clock/aura is what's under test.)
  { const { r, p, foe } = rig("rookie", { inv: [] });
    G.resolveOps(r, p, [{ do: "summon", body: "knight", count: 1 }]);
    eq(r.allies[0][0]?.bodyKey, "knight", "the knight token stands in the lane");
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
  const { r, p, foe } = rig("rookie", { inv: ["dThorns"] });
  fire(r, p, 0);
  eq(p.thorns, 1, "Thorns grants a 1-point thorns buff");
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

// ---- MOXIE DRAIN (owner 2026-07-09 lane-Ice, oBlizzard) ---------------------
// oBlizzard hits EVERY foe in your lane for 1 (the deal) and drains EACH by the damage dealt (the
// delay {ofDealt}) — the lane mirror of the new Ice.
{
  const { r, p, foe } = rig("cleric", { inv: ["oBlizzard"] });
  const armed = G.spawnEnemy("rookie", []); armed.hp = armed.maxHp = 50; r.lanes[0].push(armed);
  armed.moxie = 7; foe.moxie = 5;
  const h0 = foe.hp, a0 = armed.hp;
  fire(r, p, 0);
  ok(h0 - foe.hp === 1 && a0 - armed.hp === 1, "Blizzard hits EVERY foe in your lane (1 each)");
  ok(armed.moxie === 6 && foe.moxie === 4, "…and drains 1 moxie (= the damage dealt) from each foe (7→6, 5→4)");
  // the drain floors at 0 — it can't push moxie negative
  const lowFoe = r.lanes[0].find((e) => e === foe); lowFoe.moxie = 0;
  fire(r, p, 0);
  eq(foe.moxie, 0, "the moxie drain floors at 0 (0−1 → 0, never negative)");
}

// ---- (DAMAGED-ACCELERATES-CLOCK / Atlas accel test DELETED in the school-free rip 2026-06-23: the
//       accel mechanic had only template bodies, all removed) ----

// ---- FRONT-2 TARGETING (V2 §4.9, Spear) -------------------------------------------
{
  const { r, p, foe } = rig("rookie", { inv: ["oSpear"] });
  const f2 = G.spawnEnemy("rookie"); f2.hp = f2.maxHp = 50; r.lanes[0].push(f2);
  const f3 = G.spawnEnemy("rookie"); f3.hp = f3.maxHp = 50; r.lanes[0].push(f3);
  fire(r, p, 0);
  ok(foe.maxHp - foe.hp === 2 && f2.maxHp - f2.hp === 2, "Spear hits the front TWO foes (2 each)");
  eq(f3.maxHp - f3.hp, 0, "…and not the third");
}

// ---- PLAYER-CAST SUMMON ITEMS (V2 §4.10) ------------------------------------------
{
  // The summonRat/summonBigRat CARDS are retired; summon the rat + large-rat TOKENS directly (the
  // token bodies + their moxie casts are what's under test).
  const { r, p, foe } = rig("rookie", { inv: [] });
  G.resolveOps(r, p, [{ do: "summon", body: "rat", count: 1 }, { do: "summon", body: "largeRat", count: 1 }]);
  ok(r.allies[0].some((a) => a.bodyKey === "rat") && r.allies[0].some((a) => a.bodyKey === "largeRat"),
    "rat + large-rat tokens stand in your lane");
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

// ---- OWNER 2026-07-09: the snapshot ships a summon's FULL card text (what its card does) ----------
// The friendly-summon strip should show the effect prose of the card each summon is banking toward,
// not just name/cost/dmg — same descriptor foe gear already exposes.
{
  const { r } = rig("rookie");
  const rat = allyToken(r, "rat");
  const shown0 = rat.queue?.[0];
  const snap = G.snapshot(r);
  const ally = snap.lanes[0].allies.find((a) => a.bodyKey === "rat");
  ok(ally, "the summoned rat appears in the player-lane allies strip");
  const shown = ally.queue?.[0];
  ok(shown && shown.text != null, "…and its shown card object now carries a non-null effect text (owner 2026-07-09)");
  eq(shown.text, KIT[shown0.key]?.text, "…= the rat's Bite KIT prose ('Deal 1 to the front foe.')");
}

// ---- Darkness lifesteal -------------------------------------------------------------
{
  const { r, p, foe } = rig("cleric", { inv: ["oDark"] });
  p.hp = 50;
  const h0 = foe.hp; fire(r, p, 0);
  ok(h0 - foe.hp === 4 && p.hp === 54, "Dark deals 4 and heals the damage dealt (lifesteal)");
}

// ---- Trusty Shield: a playable shield card (startCharged is dead — moxie is the gate) -----
// The "pre-charge a startCharged item" mechanic is gone: a card is simply playable the moment
// you can afford it. beginCombat now DEALS the opening hand from the collection (CARDS_SPEC §5),
// so the card lands in hand and grants shield on its first cast.
{
  const { r, p } = rig("rookie", { inv: ["dShield"] });
  G.beginCombat(r);   // deals the opening hand + START_MOXIE
  ok(p.hand.some((c) => c.key === "dShield"), "beginCombat deals the collection into the opening hand");
  p.moxie = 99;
  fire(r, p, 0);
  eq(p.shield, 2, "Shield grants 2 shield when played");
}

// ---- Combat-log persistence contract (owner 2026-06-25): EVERY combat is flushed to disk ----
// The server flushes the combat log once per fight, guarded by `_fileLogged` (and clogs the
// CARAVAN-FALLS line once via `_endLogged`). beginCombat MUST re-arm both to false so the guards
// fire ONCE PER COMBAT, not once per run — otherwise a long run's later combats would never persist.
{
  const { r } = rig("rookie", { inv: ["oSword"] });
  r._endLogged = true; r._fileLogged = true;            // simulate a just-finished combat's flushed state
  r.combatLog = ["…stale line from the PRIOR combat…"];  // must be WIPED, not carried across the 1500-cap
  r.phase = "setup";                                     // beginCombat enters "playing" from setup
  G.beginCombat(r);
  ok(r._fileLogged === false, "beginCombat re-arms _fileLogged → next combat is persisted (once per combat, not per run)");
  ok(r._endLogged === false, "beginCombat re-arms _endLogged → the CARAVAN-FALLS line logs once per combat");
  ok((r.combatLog ?? [])[0]?.includes("Combat begins") && !r.combatLog.some((l) => l.includes("stale line")),
     "beginCombat starts a FRESH per-combat log — header first, foe loadouts after; the prior combat's lines are wiped (never spans two combats)");
}

// ---- Wind pushes the aimed foe to the BACK of its lane --------------------------------
{
  const { r, p, foe } = rig("rookie", { inv: ["oWind"] });
  const f2 = G.spawnEnemy("rookie"); f2.hp = f2.maxHp = 50; r.lanes[0].push(f2);
  p.targetId = foe.id;
  fire(r, p, 0);
  ok(r.lanes[0][0] === f2 && r.lanes[0][1] === foe, "Wind reorders the lane (front foe sent to the back)");
  eq(foe.maxHp - foe.hp, 3, "…after dealing 3 (Wind) to the aimed foe");
}

// ---- Gang Up: +1 per other ally in your lane -------------------------------------------
{
  const { r, p, foe } = rig("rookie", { inv: ["oPileOn"] });
  r.level = { nodes: [], currentId: null };       // pin the rig's board (addPlayer won't resync lanes)
  const p2 = G.addPlayer(r, "p2", "B"); p2.lane = 0;
  allyToken(r, "rat");
  const h0 = foe.hp; fire(r, p, 0);
  eq(h0 - foe.hp, 3, "Pile On: base 1 + 1 per OTHER ally in lane (teammate + rat = +2) = 3");
}

// ---- MELEE strikes YOUR lane's front, no matter the reticle; RANGED follows it ----------
{
  ok(!G.isRanged("oDagger") && !G.isRanged("oSword") && !G.isRanged("oHatchet"), "melee weapons default MELEE");
  ok(G.isRanged("oFire") && G.isRanged("oArcane") && G.isRanged("oDark"), "ranged spells default RANGED");
  ok(G.isRanged("oBow") && G.isRanged("oRepeatXbow"), "Bow/Crossbow: explicitly ranged (melee-typed aimed weapons)");
  const { r, p, foe } = rig("rookie", { inv: ["oSword", "oBow"] });
  r.laneCount = 2; r.lanes.push([G.spawnEnemy("rookie")]); r.allies.push([]);
  const far = r.lanes[1][0]; far.hp = far.maxHp = 50;
  p.targetId = far.id;                            // reticle aimed TWO lanes over
  fire(r, p, 0);                                  // Sword (melee)
  ok(foe.maxHp - foe.hp === 3 && far.hp === far.maxHp,
    "melee ignores the reticle — it strikes YOUR lane's front (no sideways sword lunges)");
  fire(r, p, 1);                                  // Bow (ranged)
  eq(far.maxHp - far.hp, 2, "ranged follows the reticle cross-lane");
}

// ---- Lightning hits YOUR lane (not the aimed lane) --------------------------------------
{
  const { r, p, foe } = rig("cleric", { inv: ["oLightning"] });
  r.laneCount = 2; r.lanes.push([G.spawnEnemy("rookie")]); r.allies.push([]);
  const other = r.lanes[1][0]; other.hp = other.maxHp = 50;
  p.targetId = other.id;                          // aimed across the board
  fire(r, p, 0);
  ok(foe.maxHp - foe.hp === 3 && other.hp === other.maxHp,
    "lane deals hit the caster's OWN lane (3), never the aimed lane");
}

// ---- (school-trigger onSword block DELETED in the school-free rip 2026-06-23) ----

// ---- (room effects — enchants/acid/armory/wandering — REMOVED by owner 2026-06-28; tests deleted) ----

// ---- economy / difficulty weights ---------------------------------------------------------
{
  // Every owner card is value 1 (the higher-value first-set items were retired 2026-07-09), so the
  // value system now reads a flat ◈1; a token cast is ◈0. Treasure = ante; a ware's price = its face value.
  eq(G.itemTreasure("oSword"), 1, "an owner card's treasure = its ante (1)");
  eq(G.itemTreasure("tBite"), 0, "a summon-only token cast is value 0 (never economically claimed)");
  eq(G.shopPrice("oMeteors"), G.itemTreasure("oMeteors"), "a ware's price = its face VALUE (itemTreasure) — no markup");
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
  eq(r.phase, "won", "…and the run has already left the draft (opens on the first-room CHOOSER / trailhead)");
  // a friend's socket lands AFTER the host started (server: addPlayer + spawnSquad + reopenDraftForJoin)
  const guest = G.addPlayer(r, "p2", "Guest");
  const reopened = G.reopenDraftForJoin(r);
  ok(reopened, "a pre-combat join reopens the draft");
  eq(r.phase, "draft", "…the room is pulled back into the draft");
  ok(host.drafted, "host KEEPS the body/kit they already locked");
  ok(!guest.drafted, "guest still needs to pick a body/kit");
  // guest picks → draft completes → RE-ENTER the current node with the bigger party
  G.chooseClass(r, guest, "rogue");
  eq(r.phase, "won", "draft completes → back at the first-room chooser, now with the bigger party");
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
  enterFirstRoom(r);                                   // step off the trailhead into the first room
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
  for (const p of r.players.values()) G.chooseClass(r, p, "warrior");
  G.beginRun(r);   // 2 humans → the fresh-run draft HOLDS (owner 2026-07-06); ▶ starts it
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
  G.resolveOps(r, foe, [{ do: "summonArmed", body: "zzzNope", gear: ["oFire"], count: 1 }]);
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
  // swapBody (owner 2026-06-28): a COMMON felled body is FREE to wear; an ELITE costs ADOPT_COST to become.
  G.wearBody(p, "rookie"); p.alive = true;
  ok(G.swapBody(r, p, "leverage") === "leverage" && p.bodyKey === "leverage", "a COMMON felled body is free to wear");
  ok(r.unlockedBodies.has("rookie"), "…the old body was released back into the pool");
  r.unlockedBodies.add("fundjin");                          // an ELITE
  const tenS = ["oSword","oHatchet","oSpear","oBow","oDagger","oFire","oLightning","oWind","oArcane","oHoly"];
  p.deckList = [...tenS]; p.backpack = [...tenS, ...Array(G.ADOPT_COST).fill("oMeteors")];
  ok(!G.swapBody(r, p, "fundjin"), "an ELITE is NOT free — without tendering the price it's rejected");
  ok(G.swapBody(r, p, "fundjin", Array(G.ADOPT_COST).fill("oMeteors")) === "fundjin" && p.bodyKey === "fundjin",
     "…tender the flat ADOPT_COST and you become the elite");
}

// ---- NO DUD FOES: every rolled foe can actually deal damage ---------------------------
{
  // The old school-Power "dud" (an amount-0 typed card on a 0-Power body) is retired with the typed
  // first-set; every owner card is typeless + flat, so a damaging one threatens on ANY body and a
  // non-damaging one never does. itemThreatens stays the live gate on foe gear (loops below).
  ok(G.itemThreatens("rookie", "oDagger"), "a damaging owner card threatens (flat 1 > 0)");
  ok(G.itemThreatens("cleric", "oDagger"), "…on ANY body — owner cards are typeless/flat (no school-Power duds)");
  ok(G.itemThreatens("rookie", "oArcane"), "a ranged owner card threatens too");
  ok(!G.itemThreatens("rookie", "dShield"), "non-damaging items never count as a threat");
  ok(!G.itemThreatens("cleric", "dTowerShield"), "…a pure shield is never a threat, on any body");
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

// ---- (the ≥1 weapon-floor test is RETIRED with the school-scaled first-set: it only ever fired for
//      TYPED, amount-0 cards (Scary Knife / Magic Missile) on a wrong-school body. Owner cards are
//      typeless + flat, so no card triggers the `if (school && dmg < 1) dmg = 1` path — the code
//      remains for foe schoolStrike passives, but there is no card fixture to drive it.) ----

// ---- ROOMS FILL to the ante: a random foe selection that EQUALS the budget (owner spec 2026-06-27) ----
{
  let empty = false, overBudget = false, minCardsBad = false, anteMismatch = false, sawUnfilled = false, sawMulti = false;
  for (let t = 0; t < 200; t++) {
    const r = G.newRoom("GEN" + t); r.floor = 2;
    for (const id of ["a", "b", "c", "d"]) G.addPlayer(r, id, id.toUpperCase());  // 4 lanes → 16-foe cap: no cap interference at budget 20
    const budget = 20;                                            // big enough to admit multi-foe rooms
    const foes = G.generateRoomFoes(r, budget, 2);
    const total = foes.reduce((s, f) => s + G.anteOfFoe(f), 0);
    if (!foes.length) empty = true;                              // a generated room always has ≥1 foe
    if (total > budget) overBudget = true;                       // …and never overshoots the budget
    // FILL to the ante: a room is left short only if it ran out of foe slots (the per-lane cap), never on purpose
    if (total < budget - G.minFoeAnte() && foes.length < G.roomFoeCap(r)) sawUnfilled = true;
    if (foes.length >= 2) sawMulti = true;                       // a 20-budget room is several foes
    for (const f of foes) {
      if ((f.gear ?? []).length < G.FOE_MIN_CARDS) minCardsBad = true;   // every foe ≥ 3 cards
      // ANTE V3: ante = 1 base + Σ item values + 2×(level−1) + elite-body premium
      const want = 1 + f.gear.reduce((s, g) => s + G.itemTreasure(g), 0) + 2 * (f.level - 1) + G.eliteBodyAnte(f.bodyKey);
      if (G.anteOfFoe(f) !== want) anteMismatch = true;
    }
  }
  ok(!empty, "a generated room always has at least one foe (combat room never empty)");
  ok(!overBudget, "generated foes never exceed the room's ante budget");
  ok(!sawUnfilled, "rooms FILL to the ante — a random selection of foes to EQUAL the budget (owner 2026-06-27)");
  ok(sawMulti, "…and a fuller room is several foes, not one mini");
  ok(!minCardsBad, "every generated foe carries at least FOE_MIN_CARDS (3) cards");
  ok(!anteMismatch, "every generated foe's ante = 1 base + Σ item values + 2×(level−1) + elite premium (ante v3)");
}

// ---- THE ANTE FORMULA — ANTE V3 (owner 2026-07-03): 1 base + items + 2×(level−1) + elite premium ----
{
  eq(G.bodyAnteOf({ bodyKey: "frugal" }), 1, "body adoption price is still 1 (flat)");
  eq(G.bodyAnteOf({ bodyKey: "counterparty" }), 1, "…the heaviest chassis too");
  // anteOfFoe = 1 flat base + Σ item values + 2×(level−1) + elite-body premium. Level 1 is FREE
  // ("1+3=4 to start"); an ELITE body adds its +3 premium on top ("Elites start higher" → 1+3+3=7).
  // (every owner card is value 1 now — the retired first-set's ◈2/◈4 items are gone, so item sums use ◈1 cards)
  eq(G.anteOfFoe({ bodyKey: "rookie", gear: ["oDagger"] }), 2, "1 base + 1 item (1) + level-1 (FREE) = 2");
  eq(G.anteOfFoe({ bodyKey: "rookie", gear: ["oDagger", "oDagger", "oDagger"] }), 4, "a base foe: 1 base + 3 commons = ◈4 ('1+3=4')");
  eq(G.anteOfFoe({ bodyKey: "counterparty", gear: ["oMeteors", "oForce"] }), 3, "1 base + two items (1+1) + level-1 (free) = 3");
  eq(G.anteOfFoe({ bodyKey: "rookie", gear: ["oDagger"], level: 3 }), 6, "+2 per level ABOVE 1: 1 base + 1 item + 2×2 = 6");
  eq(G.anteOfFoe({ bodyKey: "rookie", gear: [], level: 5 }), 9, "1 base + no items + 2×4 = 9 (levels above 1 scale infinitely)");
  eq(G.eliteBodyAnte("neptune"), 3, "an ELITE body carries the +3 premium");
  eq(G.eliteBodyAnte("frugal"), 0, "…a common carries none");
  eq(G.anteOfFoe({ bodyKey: "atlas", gear: ["oDagger", "oDagger", "oDagger"] }), 7, "an elite with 3 commons = ◈7 (1 base + 3 premium + 3 items)");
  // NO FLOOR (owner spec 2026-06-27): the room arrives PRE-GENERATED to its budget; the begin gate is
  // always open — the party may commit immediately, no minimum ante to stock.
  const r = G.newRoom("AN");
  const p1 = G.addPlayer(r, "p1", "A"), p2 = G.addPlayer(r, "p2", "B");
  G.startDraft(r);
  G.chooseClass(r, p1, "warrior"); G.chooseClass(r, p2, "cleric");
  G.beginRun(r);                                                      // co-op fresh draft holds → ▶ (owner 2026-07-06)
  enterFirstRoom(r);                                                  // step into the first room (pre-built)
  ok(r.draftedFoes.length >= 1, "the room arrives PRE-GENERATED with at least one foe (never empty)");
  eq(r.anteRequired, 0, "there is NO ante floor to meet — the begin gate is 0");
  ok(G.stockReady(r), "stockReady is always true (no floor)");
  G.commitStock(r);
  eq(r.phase, "setup", "the party can begin immediately — no minimum to stock");
}

// ---- SUMMON PLACEMENT (owner 2026-06-12): in front of you or behind you, your call ----
// The summonRat CARD is retired; summon the rat TOKEN directly — placement (summonSide) + rat-merge
// are the engine behaviors under test.
{
  const summonRat = (rm, pl) => G.resolveOps(rm, pl, [{ do: "summon", body: "rat", count: 1 }]);
  const { r, p } = rig("cleric", { inv: [] });
  summonRat(r, p);
  let line = G.laneLine(r, p.lane);
  eq(line[0].bodyKey, "rat", "default: a fresh summon steps in FRONT of you");
  // a SECOND rat MERGES into the existing stack (owner 2026-06-27) — not a new token behind you,
  // so summonSide is moot once a rat-stack stands; the one entity just grows.
  p.summonSide = "back";
  summonRat(r, p);
  line = G.laneLine(r, p.lane);
  const rats = line.filter((e) => e.bodyKey === "rat");
  eq(rats.length, 1, "summonSide is moot for a 2nd rat — it MERGES into the one stack");
  eq(rats[0].ratCount, 2, "…the stack is now '2 rats' (2 HP, bite 2)");

  // back-placement still applies to a FRESH seed (and to non-merging summons)
  const { r: r2, p: p2 } = rig("cleric", { inv: [] });
  p2.summonSide = "back";
  summonRat(r2, p2);
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
  // ANTE V3 (owner 2026-07-03): budget = P×F×4×(1..3), i.e. a ROLLED RANGE base = P×F×4, peak = P×F×12.
  const solo = G.newRoom("B1"); G.addPlayer(solo, "q", "Q"); solo.floor = 1;
  eq(G.roomAnteRange(solo).join(","), "4,12", "solo · floor 1 range = [4, 12] (base P×F×4, peak P×F×12)");
  eq(G.roomAnteBudget(solo, "combat"), 12, "roomAnteBudget (back-compat) = the PEAK of the range");
  const duoF3 = G.newRoom("B2"); G.addPlayer(duoF3, "a", "A"); G.addPlayer(duoF3, "b", "B"); duoF3.floor = 3;
  eq(G.roomAnteRange(duoF3).join(","), "24,72", "…and the range scales with party × floor (2×3×4 → [24, 72])");
  let inRange = true;
  for (let t = 0; t < 60; t++) { const roll = G.rollRoomAnte(duoF3); if (roll < 24 || roll > 72) inRange = false; }
  ok(inRange, "rollRoomAnte stays inside the range (60 rolls)");
}

// ---- FOE LEVELS: HP / COMBAT / ANTE math (owner CORRECTION 2026-06-27 — combat starts at L3) -------
{
  // owner table (HP grant 3→4 per owner 2026-07-09): L1 BASE · L2 +4 HP · L3 +1 combat · L4 +8 HP +1 combat · L5 +8 HP +2 combat …
  eq(G.levelCombatBonus(1), 0, "L1 is the BASE: no combat");
  eq(G.levelHpBonus(1),     0, "L1: +0 HP");
  eq(G.levelCombatBonus(2), 0, "L2: still no combat (HP-only level)");
  eq(G.levelHpBonus(2),     4, "L2: +4 HP");
  eq(G.levelCombatBonus(3), 1, "L3: FIRST combat grant = +1");
  eq(G.levelHpBonus(3),     4, "L3: still +4 HP");
  eq(G.levelCombatBonus(4), 1, "L4: combat unchanged (+1)");
  eq(G.levelHpBonus(4),     8, "L4: +8 HP total");
  eq(G.levelCombatBonus(5), 2, "L5: +2 combat");
  eq(G.levelHpBonus(5),     8, "L5: still +8 HP");
  // general form: HP = 4×floor(L/2), combat = floor((L-1)/2), ante = 2×(L−1) (ante v2: level 1 free)
  for (let L = 1; L <= 12; L++) {
    eq(G.levelHpBonus(L), 4 * Math.floor(L / 2), "HP bonus = 4×floor(L/2) @L" + L);
    eq(G.levelCombatBonus(L), Math.floor((L - 1) / 2), "combat bonus = floor((L-1)/2) @L" + L);
    eq(G.levelAnte(L), 2 * (L - 1), "+2 ante per level ABOVE 1 @L" + L + " (ante v2)");
  }
  // owner 2026-07-09: every HP-increasing level-up grants EXACTLY +4 (the per-even-level increment)
  for (let L = 2; L <= 12; L += 2) {
    eq(G.levelHpBonus(L) - G.levelHpBonus(L - 1), 4, "even-level HP increment = +4 @L" + L);
  }
}

// ---- FOE LEVELS: spawnEnemy applies HP + combat to the RIGHT stat; summons/bosses EXEMPT ----------
{
  // a melee-kit foe banks its level combat into MELEE; a ranged-kit foe into RANGED ("picks the
  // stat matching its damaging items"). counterparty is a FLEX body, so the KIT decides.
  const m = G.spawnEnemy("counterparty", ["oSword"], 5);   // melee kit, L5
  eq(m.level, 5, "foe carries its level");
  eq(m.maxHp, G.BODIES.counterparty.maxHp + 8, "L5 HP = base + 8");
  eq(m.meleeBonus, 2, "L5 melee-kit foe → +2 MELEE");
  eq(m.rangedBonus, 0, "…and nothing on ranged");
  const rg = G.spawnEnemy("counterparty", ["oFire"], 3);   // ranged kit, L3
  eq(rg.maxHp, G.BODIES.counterparty.maxHp + 4, "L3 HP = base + 4");
  eq(rg.rangedBonus, 1, "L3 ranged-kit foe → +1 RANGED (combat starts at L3)");
  eq(rg.meleeBonus, 0, "…and nothing on melee");
  const lo = G.spawnEnemy("bloodfund", ["oSword"], 1);     // baseline level-1 foe = the BASE
  eq(lo.meleeBonus, 0, "a baseline level-1 foe carries NO combat bonus (the BASE)");
  eq(lo.maxHp, G.BODIES.bloodfund.maxHp, "…and +0 HP at level 1");
  const l2 = G.spawnEnemy("bloodfund", ["oSword"], 2);     // L2 = HP-only
  eq(l2.meleeBonus, 0, "L2: still no combat (combat lands at L3)");
  eq(l2.maxHp, G.BODIES.bloodfund.maxHp + 4, "…but +4 HP");
  // SUMMON tokens + BOSSES are EXEMPT — their stats are absolute regardless of the passed level
  const rat = G.spawnEnemy("rat", [], 5);
  eq(rat.maxHp, 1, "a rat is 1 HP at any level (summon exempt)");
  ok(!rat.meleeBonus && !rat.rangedBonus, "…and gets no level combat bonus");
  const boss = G.spawnEnemy("hydra", [], 7);
  eq(boss.maxHp, G.bodyMaxHp(G.BODIES.hydra), "a boss keeps its budgeted HP (boss exempt)");
  ok(!boss.meleeBonus && !boss.rangedBonus, "…and no level combat bonus");
}

// ---- PLAYER-SIDE LEVELING: 1:1 symmetry — players level on the foe curve (RUN-WIDE since 2026-06-29) --
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
  eq(p.runLevel, 2, "…the player's RUN-WIDE level ticked up (one level per player, not per-body)");
  eq(p.maxHp, base + 4, "L2 grants +4 HP (the foe curve)");
  eq(p.levelMelee, 0, "…no combat yet (combat lands at L3)");
  eq(p.backpack.length, 35, "5 cards spent from the backpack");
  eq(p.deckList.length, 10, "…the deck stayed whole (spares tendered first)");
  // pay 10 value → reach L3 (first combat grant)
  ok(G.levelUp(r, p, Array(10).fill("oSword")), "spend 10 → level up to L3");
  eq(p.level, 3, "now level 3");
  eq(p.maxHp, base + 4, "L3 still +4 HP");
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

// ---- LEVELCAP BUG (owner live-playtest 2026-07-09: "couldn't level up past 8 despite enough cards") ----
// The player path used to gate on FOE_LEVEL_CAP (=8) — a foe-GENERATION sanity ceiling that leaked in and
// hard-capped the PLAYER at level 8 with tender to spare. There is NO owner-stated player-level cap; leveling
// is bounded ONLY by the escalating value-for-value tender (levelUpCost = 5×(L-1)). This proves L8→L9 succeeds.
{
  const r = G.newRoom("LVLCAP"); r.phase = "stock";
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, "bloodfund");                    // melee body — leveling is 1:1 with foes
  p.deckList = Array(10).fill("oSword");         // a legal combat deck (≥ MIN_DECK)
  p.backpack = Array(300).fill("oSword");        // deck 10 + ~290 ◈1 spares — plenty for the escalating curve
  // climb L2..L9, one step at a time; the L8→L9 step is the OLD cap boundary and MUST now succeed
  for (let L = 2; L <= 9; L++) {
    ok(G.levelUp(r, p, Array(G.levelUpCost(L)).fill("oSword")), `spend ${G.levelUpCost(L)} → reach level ${L}`);
    eq(G.runLevelOf(p), L, `…run-wide level ticked to ${L}`);
  }
  ok(G.runLevelOf(p) > 8, "the player leveled PAST 8 — FOE_LEVEL_CAP no longer leaks into the player path");
  eq(p.level, 9, "the worn body is at level 9");
  eq(p.maxHp, G.foeMaxHpFor("bloodfund", 9), "…the L9 +HP grant applied (the level curve is unbounded past 8)");
  eq(p.levelMelee, G.levelCombatBonus(9), "…and the L9 +combat grant applied on the melee stat");
}

// ---- RUN-WIDE LEVEL CARRIES ACROSS A BODY SWAP (owner 2026-06-29: reversed per-body → global) -------
{
  const r = G.newRoom("LVLSWAP"); r.phase = "stock";
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, "bloodfund");                  // a melee body
  p.deckList = Array(10).fill("oSword");
  p.backpack = Array(40).fill("oSword");        // 30 spares
  ok(G.levelUp(r, p, Array(5).fill("oSword")),  "level to L2");
  ok(G.levelUp(r, p, Array(10).fill("oSword")), "level to L3");
  eq(p.runLevel, 3, "the player's run-wide level is 3");
  // swap into a DIFFERENT felled COMMON body — the level must FOLLOW (not reset, not look up a per-body level)
  r.unlockedBodies.add("leverage");
  ok(G.swapBody(r, p, "leverage") === "leverage" && p.bodyKey === "leverage", "swapped into a fresh body");
  eq(p.runLevel, 3, "…the run-wide level is unchanged by the swap");
  eq(p.level, 3, "…and the freshly worn body is IMMEDIATELY at level 3 (not reset to 1)");
  eq(p.maxHp, G.foeMaxHpFor("leverage", 3), "…the L3 +HP re-applies to the NEW body's base (foe-symmetric)");
  eq(p.levelMelee + p.levelRanged, G.levelCombatBonus(3), "…the L3 +combat grant re-applies on the new body");
  // and back again — still level 3 (no per-body memory needed; the level is the PLAYER's)
  r.unlockedBodies.add("bloodfund");
  ok(G.swapBody(r, p, "bloodfund") === "bloodfund", "swap back to the first body");
  eq(p.level, 3, "…still level 3 — the level lives on the player, not the body");
}

// ---- LEVEL-UP CHOSEN FEED: consumes EXACTLY the picked spares; respects MIN_DECK (owner 2026-06-29) --
{
  const r = G.newRoom("LVLFEED"); r.phase = "stock";
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, "bloodfund");
  // deck at the MIN_DECK floor; a MIXED spare stash so the CHOICE is observable (not auto-cheapest)
  p.deckList = Array(G.MIN_DECK).fill("oSword");
  // backpack = the 10 deck-spoken oSwords + SPARES: 5×oMeteors(◈1) to feed + 1×oArcane(◈1) to leave.
  // (Every owner card is value 1 now — the retired ◈2/◈3 spares are gone; the CHOICE is still observable.)
  p.backpack = [...Array(G.MIN_DECK).fill("oSword"), "oMeteors", "oMeteors", "oMeteors", "oMeteors", "oMeteors", "oArcane"];
  // L2 costs ◈5. The player CHOOSES 5×oMeteors = ◈5 exactly — leaving the oArcane spare untouched.
  ok(G.levelUp(r, p, ["oMeteors", "oMeteors", "oMeteors", "oMeteors", "oMeteors"]), "feed the CHOSEN spares (5×◈1 = ◈5) → L2");
  eq(p.runLevel, 2, "leveled to L2 on the chosen feed");
  eq(p.backpack.filter((k) => k === "oMeteors").length, 0, "…all five chosen oMeteors were consumed");
  eq(p.backpack.filter((k) => k === "oArcane").length, 1, "…the UN-picked oArcane was NOT touched (no auto-cheapest)");
  eq(p.deckList.length, G.MIN_DECK, "…the deck stayed at the floor (a SPARE oSword paid, not a deck copy)");
  // MIN_DECK guard: at the floor, a feed that would have to pull DECK copies is rejected wholesale
  const before = p.deckList.length;
  ok(!G.levelUp(r, p, Array(10).fill("oSword")), "a feed that would pull the deck below MIN_DECK is rejected");
  eq(p.deckList.length, before, "…the deck is untouched by the rejected feed");
  eq(p.runLevel, 2, "…and the level did not change");
}

// ---- ELITE: ATLAS, SHRUGGING — the 1:1 symmetric damage-taken reflect (owner spec 2026-06-27) -----
{
  // foe-Atlas: every 10 CUMULATIVE damage TAKEN → shrug (5 + his melee + ranged bonus) onto the heroes in
  // his lane (owner 2026-07-08 — base 5, scales off Atlas's OWN combat bonus). A L1/no-gear Atlas = base 5.
  const r = G.newRoom("ATL"); r.phase = "playing"; r.laneCount = 1;
  r.allies = [[]]; r.caravan = { hp: 100, max: 100 };
  const hero = G.addPlayer(r, "h", "H"); G.wearBody(hero, "rookie");
  hero.lane = 0; hero.depth = 0; hero.maxHp = hero.hp = 100;
  const atlas = G.spawnEnemy("atlas", [], 1); atlas.hp = atlas.maxHp = 100; atlas.lane = 0;
  r.lanes = [[atlas]];
  G.damageEnemy(r, 0, atlas, 6);   // clock 6 — under the threshold
  eq(hero.hp, 100, "under 10 taken: no shrug yet");
  G.damageEnemy(r, 0, atlas, 6);   // clock 12 → ONE shrug (base 5), remainder 2
  eq(hero.hp, 95, "10 cumulative taken → base-5 Atlas (L1, no bonus) shrugs 5 onto the hero in his lane");
  G.damageEnemy(r, 0, atlas, 8);   // clock 2+8 = 10 → another shrug (base 5)
  eq(hero.hp, 90, "the remainder carries: another 10 cumulative → another 5 shrug");
  // the shrug SCALES off Atlas's OWN melee + ranged bonus: 5 + 3 + 2 = 10
  atlas.meleeBonus = 3; atlas.rangedBonus = 2;
  G.damageEnemy(r, 0, atlas, 10);  // clock 10 → one shrug at 5 + 3 + 2 = 10
  eq(hero.hp, 80, "the shrug takes his own melee+ranged bonus: 5 + 3 + 2 = 10");
  // a NON-Atlas foe never shrugs (rookie: no on-damaged passive at all)
  const plain = G.spawnEnemy("rookie", []); plain.hp = plain.maxHp = 100; plain.lane = 0; plain.queue = [];
  r.lanes = [[plain]];
  G.damageEnemy(r, 0, plain, 30);
  eq(hero.hp, 80, "a regular foe taking 30 reflects nothing");
  // player-Atlas: the SAME reflect, MIRRORED — hits the FOES in his lane, scaling off YOUR bonus
  const r2 = G.newRoom("ATL2"); r2.phase = "playing"; r2.laneCount = 1;
  r2.allies = [[]]; r2.caravan = { hp: 100, max: 100 };
  const pAtlas = G.addPlayer(r2, "pa", "PA"); G.wearBody(pAtlas, "atlas");
  pAtlas.lane = 0; pAtlas.depth = 0; pAtlas.maxHp = pAtlas.hp = 100;
  const dummy = G.spawnEnemy("rookie", []); dummy.hp = dummy.maxHp = 100; dummy.lane = 0; dummy.queue = [];
  r2.lanes = [[dummy]];
  G.damagePlayer(r2, pAtlas, 10);   // 10 taken → shrug base 5 onto the foe in his lane
  eq(dummy.hp, 95, "player-Atlas shrugs base 5 onto the foe in his lane — the mirror of foe-Atlas");
  pAtlas.meleeBonus = 5;            // worn-Atlas scales off the melee bonus YOU stacked this fight: 5 + 5 = 10
  G.damagePlayer(r2, pAtlas, 10);   // 10 taken → shrug 5 + 5 = 10
  eq(dummy.hp, 85, "worn-Atlas scales off your stacked melee bonus: 5 + 5 = 10");
}

// ---- ROOM SKEWS (owner 2026-07-02): the budget is SPENT differently per skew; foes cap at 4/lane --
{
  const party = G.newRoom("SK1"); G.addPlayer(party, "p", "P"); G.addPlayer(party, "q", "Q"); party.floor = 3;
  const cap = G.roomFoeCap(party);   // 2 lanes → 8-foe cap (owner 2026-07-03: 4 foes to a lane)
  const budget = 32;   // 2-player floor-3: enough for every skew to express itself under the 8-foe cap
  // SWARM fragments into many minimal foes — up to the per-lane cap
  const swarm = G.generateRoomFoes(party, budget, 3, "swarm");
  ok(swarm.length >= 4, `swarm: many minimal foes (${swarm.length} of ◈4-ish)`);
  ok(swarm.length <= cap, `…and never more than the ${cap}-foe cap (4 per lane)`);
  ok(swarm.every((f) => f.level === 1 && (f.gear ?? []).length === G.FOE_MIN_CARDS),
     "…each level 1 with exactly the 3-card floor");
  // VETERAN concentrates into few high-LEVEL foes
  const vets = G.generateRoomFoes(party, budget, 3, "veteran");
  ok(vets.some((f) => f.level >= 3), "veteran: the budget went into LEVELS (a level-3+ foe appears)");
  ok(vets.length < swarm.length, "…and fewer bodies than a swarm");
  // ARSENAL concentrates into few loaded foes (more cards / higher-value items)
  const ars = G.generateRoomFoes(party, budget, 3, "arsenal");
  ok(ars.every((f) => f.level === 1), "arsenal: levels stay 1 — the budget went into ITEMS");
  ok(ars.some((f) => (f.gear ?? []).length > G.FOE_MIN_CARDS
       || f.gear.some((g) => G.itemTreasure(g) >= 2)),
     "…somebody carries extra or higher-value cards");
  // BODIES shops the elite roster (each carrying the +3 premium)
  const bods = G.generateRoomFoes(party, budget, 3, "bodies");
  ok(bods.some((f) => G.eliteBodyAnte(f.bodyKey) > 0), "bodies: elite bodies appear (the +3 premium spent)");
  // every skew respects the budget (≤ budget) and either FILLS it or is stopped by the per-lane cap
  for (const [name, foes] of [["swarm", swarm], ["veteran", vets], ["arsenal", ars], ["bodies", bods]]) {
    const total = foes.reduce((s, f) => s + G.anteOfFoe(f), 0);
    ok(total <= budget && (total > budget - G.minFoeAnte() || foes.length >= cap),
       `${name} room fills to the ante or hits the cap (◈${total}/${budget}, ${foes.length}/${cap} foes)`);
  }
  // the retired generateEliteFoes shim still returns a peak-budget room (back-compat)
  const ef = G.generateEliteFoes(party, 3);
  ok(ef.length >= 1 && ef.reduce((s, f) => s + G.anteOfFoe(f), 0) <= G.roomAnteRange(party)[1],
     "generateEliteFoes (retired shim) = a peak-range room");
}

// ---- ARCHETYPE-AWARE KITS: ≥3 fitting cards, no off-archetype damage / off-archetype buffs --------
{
  // the fit predicate: ranged body rejects melee, melee body rejects ranged, utility fits any, flex both
  ok(!G.itemFitsArchetype("ratBaron", "oSword"),     "a caster/ranged body never takes a melee Sword");
  ok(!G.itemFitsArchetype("ratBaron", "oBerserker"), "…nor a melee-only buff (Berserker's 🗡 ramp) it wouldn't use");
  ok( G.itemFitsArchetype("ratBaron", "oFire"),      "…but takes ranged cards");
  ok( G.itemFitsArchetype("ratBaron", "dShield"),    "…and pure utility fits any body");
  ok( G.itemFitsArchetype("ratBaron", "oSharpEdges") && G.itemFitsArchetype("ratBaron", "oDemonForm"),
      "…and a MODAL buff fits it too (it auto-picks ranged for a ranged body)");   // owner 2026-07-09
  ok(!G.itemFitsArchetype("bloodfund", "oFire"),     "a melee body never takes a ranged Fire");
  ok(!G.itemFitsArchetype("bloodfund", "oCrystalBall"),"…nor a ranged-flavored card (Crystal Ball's 🎯 rider)");
  ok( G.itemFitsArchetype("bloodfund", "oSword") && G.itemFitsArchetype("bloodfund", "oSharpEdges"),
      "…but takes melee cards + the modal buff (auto-picks melee for a melee body)");   // owner 2026-07-09
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
  r.draftedFoes = [{ bodyKey: "rookie", gear: ["oDagger"], greedy: true, owner: "p" }]; // 1 base + 1 item, level-1 free = 2
  eq(G.roomValue(r), 2, "roomValue = stocked ante only (1 base + 1 item)");
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
    { bodyKey: "rookie", gear: ["oDagger"], greedy: true, owner: "p1" },     // 1 base + 1 item, level-1 free = 2
    { bodyKey: "rookie", gear: ["oMeteors", "oDagger"], greedy: true, owner: "p2" }, // 1 base + 1+1 items, level-1 free = 3
  ];
  eq(G.roomValue(r), 5, "roomValue still sums the stocked ante (base + items + levels above 1, the display number)");
  ok(typeof G.creditRoomIncome === "undefined", "the mirrored-income API (creditRoomIncome) is GONE");
  // owner 2026-07-06: `treasure` RETURNED as the convert-bag bank (starts 0, minted only by
  // convertBackpack) — but no mirrored per-room income: nothing credits it on a room clear.
  ok([...r.players.values()].every((p) => p.treasure === 0 && p.earned === undefined),
    "no mirrored income: the ◈ bank opens at 0 and only convertBag mints it");
}

// ---- LEGACY ELITE NODE (ante v2, elites dissolved): behaves as a plain combat room -------------
{
  const r = G.newRoom("DF"); const p = G.addPlayer(r, "p1", "A");
  r.floor = 2;
  r.level = { nodes: [{ id: "x", type: "elite", cleared: false, x: 0.5, y: 0.5, links: [] }], currentId: "x" };
  G.enterRoom(r);
  const [lo, hi] = G.roomAnteRange(r);
  ok(r.anteCap >= lo && r.anteCap <= hi, "a legacy elite node just rolls the normal [P×F×4, P×F×12] range");
  eq(r.anteRequired, 0, "…and there is still NO floor to meet (begin gate is 0)");
  ok(r.draftedFoes.length >= 1, "…and is pre-generated with foes (no empty room)");
  G.commitStock(r);
  eq(r.phase, "setup", "no minimum — the room begins immediately");
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
    // ELITE ROOMS DISSOLVED (ante v2, owner 2026-07-02): buildLevel never mints the type anymore
    if (lvl.nodes.some((n) => n.type === "elite")) { okShape = false; reasons.add("elite-exists"); }
    // links only point DOWN the map (forward-only DAG — fuzz walks links[0] to the boss)
    for (const n of lvl.nodes) for (const id of n.links) {
      if (!byId[id] || byId[id].y <= n.y) { okShape = false; reasons.add("backlink"); }
    }
    // every node except the start is enterable; every non-boss node has a way out
    for (const n of lvl.nodes) {
      if (n !== start && !lvl.nodes.some((m) => m.links.includes(n.id))) { okShape = false; reasons.add("orphan"); }
      if (n.type !== "boss" && n.links.length === 0) { okShape = false; reasons.add("dead-end"); }
    }
    // (rooms are random-typed now — no fixed "exactly one shop per path" rule; shops appear at random.)
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
  const fe = G.spawnItemEntity(r, "oSword", 0);
  eq(fe.hp, G.itemTreasure("oSword"), "entity HP = the item's value (owner Sword → 1)");
  eq(G.spawnItemEntity(r, "oDagger", 0).hp, 1, "…another owner card → 1 (all owner cards are value 1)");
  eq(fe.equipment[0].key, "oSword", "the entity wields the item itself");
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
  arm(ps[0], ["oDagger", "oBow"]); arm(ps[1], ["oDagger"]);
  const entities = () => r.lanes.flat().filter((f) => f.bodyKey === "itemEntity").length;
  fire(r, ps[0], 0); fire(r, ps[0], 1);
  eq(entities(), 0, "two items in: nothing yet");
  fire(r, ps[1], 0);
  eq(entities(), 1, "the 3rd item the PARTY uses conjures one of the Djinn's own");
  ok(r.lanes[ps[1].lane].some((f) => f.bodyKey === "itemEntity"),
    "…into the lane of the player whose use tripped the counter");
  // no Djinn on the board → the counter is inert
  const { r: r2, ps: ps2 } = bossRig("hydra", { players: 1 });
  arm(ps2[0], ["oDagger"]);
  fire(r2, ps2[0], 0); fire(r2, ps2[0], 0); fire(r2, ps2[0], 0);
  eq(r2.lanes.flat().filter((f) => f.bodyKey === "itemEntity").length, 0, "no Djinn, no conjured items");
}

// ---- Kleptomaniac Kraken: steal/lock/rescue + the tentacle wall ----------------------
{
  const { r, ps, boss } = bossRig("kraken", { players: 2 });
  ps.forEach((p) => arm(p, ["oDagger", "oBow", "oFire"]));
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
  arm(solo, ["oDagger"]);
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
  arm(ps[0], ["oDagger", "oBow"]); arm(ps[1], ["oFire", "oDagger"]);  // give the steal card real victims
  const deckLen = G.BOSS_DEFS.kingMimic.cards.length;   // deck-length-agnostic: cards.length, not a hard 4 (GAMBIT added 2026-07-09)
  const kinds = G.BOSS_DEFS.kingMimic.cards.map((c) => c.kind).sort().join();
  const seen = [];
  for (let i = 0; i < deckLen; i++) {
    seen.push(boss.clocks[0].kind);
    boss.clocks[0].charge = boss.clocks[0].cd - 1;
    G.tickBossClocks(r, boss);
  }
  eq([...seen].sort().join(), kinds, "shuffle bag: every card fires once before the deck loops");
  ok(boss.clocks[0].deck && boss.clocks[0].kind !== seen[deckLen - 1],
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

  // GAMBIT (owner 2026-07-09): the King's OFFENSE — draw a RANDOM card from KING_ARSENAL and PLAY it
  // at the party. Before this his deck did NO direct damage but CALAMITY's flat 3, so the owner read
  // it as "no deck." Assert the arsenal is a real damaging card set, the deck carries a "cast" bar,
  // and firing it actually damages the party AND logs a King play line (legibility, coordinator).
  ok(Array.isArray(G.KING_ARSENAL) && G.KING_ARSENAL.length > 0, "KING_ARSENAL is a non-empty card set");
  ok(G.KING_ARSENAL.every((k) => (KIT[k]?.ops ?? []).some((o) => o.do === "deal")),
    "every KING_ARSENAL card DEALS DAMAGE (a toothless card can't be in his arsenal)");
  ok(G.BOSS_DEFS.kingMimic.cards.some((c) => c.kind === "cast"), "the King's deck carries a GAMBIT (cast) bar");
  {
    const kg = bossRig("kingMimic", { players: 1, floor: 4 });   // 1 lane so every target (front/lane/pickLane/snipe) lands on the lone hero
    const hp = kg.ps[0]; hp.hp = hp.maxHp = 500;                  // beefy: no single arsenal card can down him
    let dealt = 0, logs = 0;
    for (let i = 0; i < 40; i++) {
      kg.r.combatLog = [];                                       // isolate this cast's log lines
      const h0 = hp.hp; G.fireBossClock(kg.r, kg.boss, { kind: "cast" });
      dealt += (h0 - hp.hp); hp.hp = hp.maxHp;
      if ((kg.r.combatLog ?? []).some((l) => /draws /.test(l))) logs++;
    }
    ok(dealt > 0, "GAMBIT plays arsenal cards that DEAL DAMAGE to the party (the King now threatens)");
    eq(logs, 40, "every GAMBIT logs the card the King drew (fight reads as active plays, not dead air)");
  }

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

// ---- BOSS PAYDAY — the rare CARD shelf. FLAG (owner 2026-07-09): after "remove all the old ones",
// every remaining card is ante 1 and RARE_ANTE is 3, so RARE_POOL is now EMPTY — the boss rare shelf
// draws nothing. This is the natural END of the "RARE_POOL leaked retired rares into the boss shelf"
// landmine (HANDOFF): the leak is gone because the source is gone. The boss payday now needs an
// owner-authored reward (author a rare tier, or lower RARE_ANTE to seed it from the owner pool) — his
// design call; the shelf is intentionally empty until then, not a bug. --
{
  ok(G.RARE_POOL.length === 0 && G.RARE_POOL.every((k) => KIT[k].ante >= G.RARE_ANTE),
    "RARE_POOL is EMPTY — no card is ante ≥ RARE_ANTE (3) after the first-set purge (owner to re-seed the boss shelf)");
  ok(typeof G.BOSS_GOLD === "undefined", "the boss gold bounty (BOSS_GOLD) is GONE — the payday is the card shelf");
  const { r, ps, boss } = bossRig("hydra", { players: 2 });
  r.level = G.buildLevel(1);
  r.level.currentId = r.level.nodes.find((n) => n.type === "boss").id;
  ps.forEach((p) => { p.backpack = []; p.deckList = []; });
  boss.hp = 0;
  r.lanes = r.lanes.map(() => []);
  G.simulateTick(r);
  eq(r.phase, "won", "boss down → won");
  eq(r.loot.length, 0, "the rare shelf is EMPTY (no rare-ante cards to draw) — FLAG: boss payday pending owner re-seed");
}

// ---- AUTO fire mode (CARDS_SPEC §5): the priciest affordable hand card plays itself -----
// The moxie rewrite changes WHAT auto-play does: instead of pressing every ready button, it plays
// the single most-EXPENSIVE affordable card in hand (best use of moxie), at most ONE per tick, so
// moxie paces the spend. Manual stays the default-off here.
{
  const { r, ps, boss } = bossRig("hydra", { players: 1 });
  const p = ps[0];
  arm(p, ["oArcane", "oBow", "oJavelin"]);   // costs 1, 2, 4 — Javelin is the priciest (all reach the boss)
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
  ok(r.useCounts.oJavelin === 1 && !r.useCounts.oArcane && !r.useCounts.oBow,
    "…and it played the PRICIEST affordable card (Javelin, cost 4) — best use of moxie, one per tick");
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
  arm(p2, ["oArcane"]); p2.autoFire = true; p2.moxie = 99;
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
  const { r, p } = rig("rookie", { inv: ["oHaste"] });
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
  ok(!a.treasure, "swap moves NO banked ◈ (cards trade one-for-one, the bank stays put)");

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

// ---- 1:1 TRADES ONLY (owner 2026-07-02: "nobody is able to gift" — cross-seat exchanges must move
// equal ◈ value both ways, so seat resource totals stay identical over the run) ----
{
  const r = G.newRoom("TR11"); r.telemOff = true; r.phase = "won";
  const a = G.addPlayer(r, "a", "A"), b = G.addPlayer(r, "b", "B");
  a.backpack = ["oSword", "oHatchet"];          // both ◈1 (every owner card is value 1 now)
  b.backpack = ["oDagger", "oFire", "oWind"];   // all ◈1
  ok(!G.proposeTrade(r, a, "b", "oSword", null), "GIFTS are dead: a want-less offer is rejected");
  // (Unequal-◈ rejection can no longer be CONSTRUCTED: with the higher-value first-set retired the whole
  // pool is ◈1, so every give/want pair is equal by value. The equal-◈ path is exercised below.)
  ok(G.proposeTrade(r, a, "b", "oHatchet", "oFire"), "an equal-◈ offer stands (◈1 for ◈1)");
  const offer = r.tradeOffers[r.tradeOffers.length - 1];
  ok(G.acceptTrade(r, b, offer.id), "…and executes on accept");
  ok(a.backpack.includes("oFire") && b.backpack.includes("oHatchet"), "…the cards crossed 1:1");
  // a stale/forged want-less offer dies at ACCEPT too — defense in depth, nothing executes
  (r.tradeOffers ??= []).push({ id: "ofX", from: "a", to: "b", give: "oSword", want: null });
  ok(!G.acceptTrade(r, b, "ofX"), "a want-less offer at accept is DROPPED, never executed");
  ok(a.backpack.includes("oSword"), "…the would-be gift never left the giver");
  ok(!(r.tradeOffers ?? []).some((o) => o.id === "ofX"), "…and the stale offer is cleared");
  ok(G.tradeItems(r, a, b, "oSword", "oDagger"), "tradeItems executes an equal-◈ swap directly");
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
  ok([1, 2, 3, 4, 5, 6].includes(G.cardCost("oDagger")) , "every card cost is 1..6");
  ok(Object.keys(KIT).every((k) => { const c = G.cardCost(k); return c >= 1 && c <= G.MOXIE_CAP; }), "EVERY KIT key costs 1..MOXIE_CAP (batch C added ⚡10 haymakers — PW:Gun, Continent-Club)");
  ok(G.isCard("oFire") && !G.isCard("zzNotACard"), "isCard: an ops-bearing card is playable, a missing/ops-less key is not");
}

// ---- dealHand: collection → deck + hand of min(5, len), moxie reset to START_MOXIE --------
{
  // a 7-card collection → a 5-card hand, 2 left in the deck
  const big = G.mintCards(["oDagger", "oBow", "oFire", "oHoly", "oSpear", "oHatchet", "oDark"]);
  const p = { bodyKey: "rookie", alive: true, cards: [...big] };
  G.dealHand(p);
  eq(p.hand.length, 3, "dealHand fills the hand to HAND_SIZE (3) from a 7-card collection");
  eq(p.deck.length, 4, "…the remaining 4 cards sit in the draw pile");
  eq(p.hand.length + p.deck.length, p.cards.length, "every card is either in hand or deck (none lost)");
  eq(p.moxie, G.START_MOXIE, "dealHand resets moxie to START_MOXIE");
  eq(p.moxieClock, 0, "…and zeroes the moxie clock");
  // a small collection deals a partial hand (min(5, len)) with an empty deck
  const small = { bodyKey: "rookie", alive: true, cards: G.mintCards(["oDagger", "oBow"]) };
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
  const { r, p, foe } = rig("rookie", { inv: ["oFire", "oDagger", "oBow", "oHoly", "oSpear"] });
  // a real deck cycle: put one card in the deck so we can see the draw refill
  p.cards = G.mintCards(["oFire", "oDagger", "oBow", "oHoly", "oSpear", "oHatchet"]);
  G.dealHand(p);
  p.moxie = 6;
  const handCard = p.hand[0]; const cost = G.cardCost(handCard.key);
  const handLen0 = p.hand.length, deckLen0 = p.deck.length, h0 = foe.hp;
  ok(G.playCard(r, p, handCard.id), "playCard returns true for an affordable hand card");
  eq(p.moxie, 6 - cost, "…and spends EXACTLY the card's cost");
  eq(p.hand.length, handLen0, "the hand stays full — a fresh card was drawn to replace it");
  // a non-fragile played card goes to the DISCARD (exhaust-before-repeat, owner 2026-07-01) — the
  // instance is conserved (hand/deck/discard), never destroyed, and the collection size is unchanged.
  ok(KIT[handCard.key].fragile
    ? !p.cards.some((c) => c.id === handCard.id)
    : (p.hand.some((c) => c.id === handCard.id) || p.deck.some((c) => c.id === handCard.id) || (p.disc ?? []).some((c) => c.id === handCard.id)),
    "…a non-fragile played card is conserved (discarded, recycled when the deck runs dry)");
  eq(p.hand.length + p.deck.length + (p.disc?.length ?? 0), p.cards.length, "hand + deck + discard still accounts for the whole collection");
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
  // The fragile ONE-SHOTS (gigaCast/timeStop/revive) were retired with the first-set — no owner card
  // carries `fragile`, so there's no fixture to drive the "played once, spent out of the collection"
  // path here. The engine still honors `fragile` (playCard/isCard read it); it's simply dormant until
  // an owner authors a fragile card. This block is intentionally a no-op placeholder.
  ok(!Object.keys(KIT).some((k) => KIT[k]?.fragile), "no live card is fragile after the first-set purge (2026-07-09)");
}

// ---- EXHAUST-BEFORE-REPEAT (owner 2026-07-01): the whole deck cycles before any repeat ------
{
  const { r, p } = rig("rookie", { inv: ["oDagger"] });
  p.cards = G.mintCards(["oDagger", "oFire", "oBow", "oHoly", "oSpear", "oHatchet"]);   // 6 cards: hand 3 + draw 3
  G.dealHand(p);
  eq(p.disc.length, 0, "dealHand opens with an empty discard");
  const playedIds = [];
  // round-robin the hand slots (the refill lands IN PLACE, so replaying one slot would just chase
  // fresh draws while the other hand cards sit parked — cards HELD in hand can't cycle, correctly)
  const playSlot = (i) => { p.moxie = 99; const c = p.hand[i]; const okd = G.playCard(r, p, c.id); if (okd) playedIds.push(c.id); return okd; };
  // 6 plays = one full pass of the collection: every instance must appear EXACTLY once
  for (let i = 0; i < 6; i++) ok(playSlot(i % 3), `cycle play ${i + 1} fires`);
  eq(new Set(playedIds).size, 6, "one full pass plays all 6 instances with ZERO repeats");
  // the recycle happened along the way (deck went dry mid-pass) — the piles still hold everything
  eq(p.hand.length + p.deck.length + p.disc.length, 6, "hand+deck+discard = the whole collection after a full cycle");
  // played cards sit in the DISCARD, not the draw pile — never redrawn while the deck has cards
  { const { r: r2, p: p2 } = rig("rookie", { inv: ["oDagger"] });
    p2.cards = G.mintCards(["oDagger", "oFire", "oBow", "oHoly", "oSpear", "oHatchet"]);
    G.dealHand(p2); p2.moxie = 99;
    const first = p2.hand[0];
    ok(G.playCard(r2, p2, first.id), "a card plays");
    ok(p2.disc.some((c) => c.id === first.id), "…and lands in the DISCARD");
    ok(!p2.deck.some((c) => c.id === first.id) && !p2.hand.some((c) => c.id === first.id),
      "…NOT back in the draw pile or hand — it can't repeat until the deck runs dry"); }
  // recycleDeck: a dry deck shuffles the discard back in; both piles empty stays a no-op
  { const q = { hand: [], deck: [], disc: G.mintCards(["oDagger", "oFire"]) };
    G.recycleDeck(q);
    eq(q.deck.length, 2, "recycleDeck turns the discard into the new draw pile");
    eq(q.disc.length, 0, "…and empties the discard");
    G.recycleDeck(q);                 // deck non-empty → untouched
    eq(q.deck.length, 2, "a non-dry deck is never recycled"); }
}

// ---- foeCast: a foe with moxie ≥ front cost casts (effect lands) and rotates front→back ---
{
  const r = G.newRoom("FC");
  const p = G.addPlayer(r, "p", "P"); G.wearBody(p, "rookie"); p.lane = 0; p.maxHp = p.hp = 100;
  r.phase = "playing"; r.laneCount = 1; r.allies = [[]]; r.caravan = { hp: 1e9, max: 1e9 };
  const foe = G.spawnEnemy("rookie", []); foe.hp = foe.maxHp = 1000; r.lanes = [[foe]];
  // pin a deterministic 2-card queue: oDagger (cost 1) in front, oHatchet (cost 3) behind
  foe.queue = G.mintCards(["oDagger", "oHatchet"]);
  const frontKey = foe.queue[0].key;
  foe.moxie = 0;
  eq(G.foeCast(r, foe), false, "moxie 0 < cost → the foe does NOT cast");
  ok(foe.queue[0].key === frontKey, "…and the front card stays put");
  foe.moxie = 1;   // exactly the front (Dagger) cost
  const h0 = p.hp;
  ok(G.foeCast(r, foe), "moxie ≥ front cost → the foe casts");
  ok(p.hp < h0, "…the cast's effect lands on the hero side");
  eq(foe.moxie, 0, "…spending exactly the front card's cost");
  eq(foe.queue[foe.queue.length - 1].key, frontKey, "…and the cast card rotates to the BACK of the queue");
  eq(foe.queue[0].key, "oHatchet", "…bringing the next card to the front");
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
  p.cards = G.mintCards(["oArcane", "oBow", "oJavelin"]); // costs 1, 2, 4
  p.hand = [...p.cards]; p.deck = []; p.moxie = 4; r.useCounts = {};
  G.autoPlay(r, p);
  eq(r.useCounts.oJavelin, 1, "autoPlay plays the priciest AFFORDABLE card (Javelin, cost 4)");
  ok(!r.useCounts.oBow && !r.useCounts.oArcane, "…and ONLY that one (one play per call)");
  // with too little moxie for the big one, it drops to the priciest it CAN afford
  p.cards = G.mintCards(["oArcane", "oBow", "oJavelin"]);
  p.hand = [...p.cards]; p.deck = []; p.moxie = 3; r.useCounts = {};
  G.autoPlay(r, p);
  eq(r.useCounts.oBow, 1, "moxie 3 can't afford Javelin(4) → it plays Bow(2), the priciest affordable");
  // nothing affordable → autoPlay is a no-op
  p.cards = G.mintCards(["oJavelin"]); p.hand = [...p.cards]; p.deck = []; p.moxie = 0; r.useCounts = {};
  G.autoPlay(r, p);
  ok(!r.useCounts.oJavelin, "moxie 0 → autoPlay plays nothing");
  // end-to-end: autoFire ON, the fight PROGRESSES (foe hp falls) over ticks as moxie accrues
  const r2 = G.newRoom("AP2");
  const q = G.addPlayer(r2, "q", "Q"); G.wearBody(q, "rookie"); q.lane = 0; q.maxHp = q.hp = 100;
  r2.phase = "playing"; r2.laneCount = 1; r2.allies = [[]]; r2.caravan = { hp: 1e9, max: 1e9 };
  const dummy = G.spawnEnemy("rookie", []); dummy.hp = dummy.maxHp = 1000; dummy.queue = []; r2.lanes = [[dummy]];
  q.cards = G.mintCards(["oDagger", "oBow", "oHatchet"]); G.dealHand(q); // moxie = START_MOXIE
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
  ok(MOXIE.every((k) => BODIES[k].passive || BODIES[k].combatStart || BODIES[k].costKind),
     "every body carries a passive / combatStart / cost rule (Lizard Wizard is KIND-PRICING since 2026-07-06)");
  eq(BODIES.frugal.name, "Fat Cat", "provisional key `frugal` → canonical name Fat Cat");

  // --- frugal = Fat Cat: {hit:3} → summon a rat ------------------------------------------
  { const { r, p } = rig("frugal", { pHp: 100 });
    G.damagePlayer(r, p, 2); eq(r.allies[0].length, 0, "Fat Cat: 2 damage taken is under the 3-threshold");
    G.damagePlayer(r, p, 1); eq(r.allies[0].length, 1, "Fat Cat summons a rat every 3 damage taken"); }

  // --- leverage = Royal Rat: {spend:3} → summon a rat (trigger 4 → 3, owner 2026-07-09) ---
  { const { r, p } = rig("leverage", { inv: ["oSword"] });   // Sword costs 2
    fire(r, p, 0); eq(r.allies[0].length, 0, "Royal Rat: 2 moxie spent is under the 3-threshold");
    fire(r, p, 0); eq(r.allies[0].length, 1, "Royal Rat summons a rat once 3 moxie is spent (4 total crosses it)"); }

  // --- hedge = Paid Piper: {play:3} → summon a rat (per CARD, cost-independent) ----------
  { const { r, p } = rig("hedge", { inv: ["oDagger"] });
    fire(r, p, 0); fire(r, p, 0); eq(r.allies[0].length, 0, "Paid Piper: 2 cards is under the 3-threshold");
    fire(r, p, 0); eq(r.allies[0].length, 1, "Paid Piper summons a rat every 3 cards played"); }

  // --- ratTrader = Toll Troll: {spend:4} → heal 2 ---------------------------------------
  { const { r, p } = rig("ratTrader", { inv: ["oSword"], pHp: 100 }); p.hp = 50;   // Sword costs 2
    fire(r, p, 0); eq(p.hp, 50, "Toll Troll: 2 moxie spent hasn't reached the 4-moxie heal");
    fire(r, p, 0); eq(p.hp, 52, "Toll Troll heals 2 every 4 moxie spent"); }

  // --- compound = Centless Centaur: combatStart {doubleNext} → first card resolves twice -
  { const { r, p, foe } = rig("compound", { inv: ["oSword"] });   // Sword deals 3
    G.applyCombatStart(p);                                   // rig skips beginCombat; apply the opener
    ok(p.doubleNext, "Centless Centaur opens with its first card armed to double");
    const h0 = foe.hp; fire(r, p, 0); eq(h0 - foe.hp, 6, "…the first card resolves twice (Sword 3 → 6)");
    ok(!p.doubleNext, "…the double is consumed by that first card");
    const h1 = foe.hp; fire(r, p, 0); eq(h1 - foe.hp, 3, "…the second card is single (Sword 3)"); }

  // --- discountDuel = Malevolent Mouse: combatStart {counters:1} → +1 damage (ANY hit) ---
  { const { r, p, foe } = rig("discountDuel", { inv: ["oDagger", "oArcane", "oLightning"] });
    G.applyCombatStart(p); eq(p.counters, 1, "Malevolent Mouse opens at +1 damage");
    let h = foe.hp; fire(r, p, 0); eq(h - foe.hp, 2, "…a MELEE card deals +1 (Dagger 1 → 2)");
    h = foe.hp; fire(r, p, 1); eq(h - foe.hp, 2, "…a RANGED card deals +1 too (Arcane 1 → 2)");
    h = foe.hp; fire(r, p, 2); eq(h - foe.hp, 4, "…and a lane spell deals +1 (Lightning 3 → 4)"); }

  // --- pyramidRogue = Rent-Seeking Runeblade: CROSS-BUFF (owner 2026-06-28, replaces {pairMR}) — play a
  //     RANGED card → +1 MELEE damage; play a MELEE card → +1 RANGED damage. Bonuses ramp over the fight.
  { const { r, p } = rig("pyramidRogue", { inv: ["oDagger", "oArcane", "dShield", "oForce"] });
    fire(r, p, 1); eq(p.meleeBonus ?? 0, 1, "Runeblade: a RANGED card (Arcane) grants +1 MELEE");
    eq(p.rangedBonus ?? 0, 0, "…the ranged play does NOT bump ranged (it's a cross-buff)");
    fire(r, p, 0); eq(p.rangedBonus ?? 0, 1, "Runeblade: a MELEE card (Dagger) grants +1 RANGED");
    eq(p.meleeBonus ?? 0, 1, "…the melee play leaves melee bonus where it was");
    if (!p.hand.some((c) => c.key === "oArcane")) p.hand.push({ key: "oArcane", id: "oArcane#ramp" }); // refill draw is deck-order-dependent; ensure a ranged card is in hand so the ramp check is deterministic
    fire(r, p, 1); eq(p.meleeBonus ?? 0, 2, "…bonuses RAMP — a second ranged card → +2 melee");
    // TYPELESS SHIELDS (owner 2026-07-06, supersedes the 6/28 "utility counts ranged" case here):
    // a shield (`ranged:false`) feeds NEITHER side of the cross-buff…
    fire(r, p, 2); eq(p.meleeBonus ?? 0, 2, "…a SHIELD (typeless) no longer feeds the cross-buff: melee stays");
    eq(p.rangedBonus ?? 0, 1, "…and ranged stays too (Shield fires neither trigger)");
    // …while FORCE (the one ranged-typed shield) still counts as a ranged play → +1 melee.
    fire(r, p, 3); eq(p.meleeBonus ?? 0, 3, "…FORCE is the exception: the ranged-typed shield → +1 melee"); }

  // --- bloodfund = Market-Crash Minotaur: {hit:3} → melee the front foe for 1 ------------
  { const { r, p, foe } = rig("bloodfund", { pHp: 100 }); const h0 = foe.hp;
    G.damagePlayer(r, p, 2); eq(h0 - foe.hp, 0, "Minotaur: 2 damage taken is under the 3-threshold");
    G.damagePlayer(r, p, 1); eq(h0 - foe.hp, 1, "Minotaur melees the front foe for 1 every 3 damage taken"); }

  // --- heavyHand = Interest Imp: {spend:4} → +1 damage ----------------------------------
  { const { r, p } = rig("heavyHand", { inv: ["oSword"] });    // Sword costs 2
    fire(r, p, 0); eq(p.counters ?? 0, 0, "Interest Imp: 2 moxie spent is under the 4-threshold");
    fire(r, p, 0); eq(p.counters, 1, "Interest Imp gains +1 damage every 4 moxie spent"); }

  // --- rentier = Vengeful Vampire: {dealtMelee:2} → heal 1 ------------------------------
  { const { r, p } = rig("rentier", { inv: ["oDagger"], pHp: 100 }); p.hp = 50;
    fire(r, p, 0); eq(p.hp, 50, "Vampire: 1 melee damage dealt hasn't reached the 2-threshold");
    fire(r, p, 0); eq(p.hp, 51, "Vengeful Vampire heals 1 every 2 melee damage dealt"); }

  // --- ratBaron = Lizard Wizard: {dealtRanged:3} → gain a moxie -------------------------
  { const { r, p } = rig("ratBaron", { inv: ["oArcane"] });      // Arcane is ranged (⚡1), deals 1 each
    // CHANGED (owner 2026-07-06, corrected 07-07: "1 LESS not 1 total") — a −1 ranged discount
    eq(G.cardCost("oFire", BODIES.ratBaron), 2, "Lizard Wizard: a ⚡3 ranged spell costs 2 (−1)");
    eq(G.cardCost("oMeteors", BODIES.ratBaron), 4, "…a ⚡5 lane nuke costs 4 (discount, NOT flat 1)");
    eq(G.cardCost("oSlow", BODIES.ratBaron), 1, "…a ⚡2 aimed debuff hits the 1-cost floor");
    eq(G.cardCost("oSword", BODIES.ratBaron), G.cardCost("oSword"), "…melee cards are untouched");
    const c = G.cardCost("oArcane", BODIES.ratBaron);
    eq(c, 1, "…the ⚡1 Arcane floors at 1 — never free");
    p.moxie = 3;
    const play = () => { const card = p.hand.find((x) => x.key === "oArcane"); return G.playCard(r, p, card.id); };
    play(); play(); play(); eq(p.moxie, 3 - 3 * c, "…and no moxie is banked anymore (the old clock is gone)"); }

  // --- counterparty = Bond Behemoth: {hit:3} → +1 damage --------------------------------
  { const { r, p } = rig("counterparty", { pHp: 100 });
    G.damagePlayer(r, p, 2); eq(p.counters ?? 0, 0, "Bond Behemoth: 2 damage taken is under the 3-threshold");
    G.damagePlayer(r, p, 1); eq(p.counters, 1, "Bond Behemoth gains +1 damage every 3 damage taken"); }

  // --- juggernaut = Golden Golem: combatStart {shield:2} + {spend:10} → shield = MAX HP --
  { const { r, p } = rig("juggernaut", { inv: ["oJavelin"], pHp: 100 }); // Javelin costs 4; rig maxHp = 100
    G.applyCombatStart(p); eq(p.shield, 2, "Golden Golem enters with a 2-point shield");
    p.hp = 60;                                               // wounded — the refill must read MAX, not current
    fire(r, p, 0); fire(r, p, 0); eq(p.shield, 2, "…8 moxie spent hasn't hit the 10-moxie shield refill");
    fire(r, p, 0); eq(p.shield, 102, "Golden Golem gains shield equal to MAX health every 10 moxie spent (2 + 100, not 60)"); }

  // --- quakeCap = Crypto-Chimera: {play:3} → deal 1 to the foe lane ----------------------
  { const { r, p, foe } = rig("quakeCap", { inv: ["oDagger"] }); const h0 = foe.hp;
    fire(r, p, 0); fire(r, p, 0);                            // 2 daggers (2 dmg); lane chip hasn't fired
    fire(r, p, 0); eq(h0 - foe.hp, 4, "Crypto-Chimera deals 1 to the foe lane every 3rd card (3 daggers + 1 lane)"); }

  // --- mutualMend = Weary Wageslave: {play:2} → melee the front foe for 1 ----------------
  { const { r, p, foe } = rig("mutualMend", { inv: ["oDagger"] }); const h0 = foe.hp;
    fire(r, p, 0); eq(h0 - foe.hp, 1, "Wageslave: one card is just the Dagger (1)");
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
  // Blood To Iron counts a hit even when a shield eats it whole (owner 2026-07-09: shield damage IS damage)
  { const { r, p } = rig("rookie", { inv: ["dBloodIron"], pHp: 100 }); fire(r, p, 0); p.shield = 10;
    G.damagePlayer(r, p, 4); eq(p.shield, 6, "…the shield absorbs the whole 4-hit (10→6)");
    eq(p.bloodToIron.stored, 1, "Blood To Iron counts a SHIELD-ONLY hit"); }
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

// ---- CO-OP DRAFT HOLD + RESTART (owner 2026-07-06, roommate playtest lock-up) -----------------
// "It force started us before everyone had joined": a completed FRESH-run draft with 2+ humans now
// WAITS for an explicit {beginRun}; and any room can hard-reset to a fresh draft (restartRun →
// startDraft) with every seat kept. Solo + 1-human squads keep the instant start.
{
  const r = G.newRoom("HOLD"); r.telemOff = true;
  const A = G.addPlayer(r, "a", "A"), B = G.addPlayer(r, "b", "B");
  G.startDraft(r);
  G.draftPick(r, A, r.draftWheel[0].id);
  eq(r.phase, "draft", "co-op: one seat picked → still drafting");
  G.draftPick(r, B, r.draftWheel[1].id);
  eq(r.phase, "draft", "co-op HOLD: every seat picked but the run does NOT auto-start (friends may still be joining)");
  ok(!G.beginRun(null), "beginRun without a room is refused");
  ok(G.beginRun(r), "the explicit ▶ (beginRun) starts the held run");
  ok(r.phase !== "draft", "…and the run is live");
  ok(!G.beginRun(r), "beginRun outside a held draft is a no-op");
  // the RESTART path: from a live run, straight back to a fresh draft — all seats kept
  G.startDraft(r);   // (the server's {restartRun} route calls exactly this)
  eq(r.phase, "draft", "restart: a stuck/live room hard-resets to a fresh draft");
  eq(r.players.size, 2, "…with every seat kept");
  ok(!r.level && !r.runWon, "…and no stale level/victory state survives");
}
{
  const r = G.newRoom("SOLO0"); r.telemOff = true;
  const p = G.addPlayer(r, "p", "P");
  G.startDraft(r);
  G.draftPick(r, p, r.draftWheel[0].id);
  ok(r.phase !== "draft", "SOLO: a completed draft still auto-starts (no hold)");
}
{
  const r = G.newRoom("SQH"); r.telemOff = true;
  const h = G.addPlayer(r, "h", "H");
  G.addPlayer(r, "h-b1", "H2", { bot: true, owner: "h" });
  G.startDraft(r);
  G.draftPick(r, r.players.get("h"), r.draftWheel[0].id);
  G.draftPick(r, r.players.get("h-b1"), r.draftWheel[1].id);
  ok(r.phase !== "draft", "1-human SQUAD: bots don't count as humans — still auto-starts");
}

// ---- NO SEEDING: an ops-less entry in the deck must NOT trigger starter-card padding (owner 2026-06-25)
// Regression: an ops-less item (isCard()=false — exemplar is now the RETIRED slimeCrown, since Cool
// Shoes became a castable card on 2026-07-06) made the deck count < MIN_DECK *castable*, and the old
// deckKeys padded the gap with STARTER_DECK Swords — cards the player never chose, which forced
// Swords into a real run. The combat deck must be EXACTLY the chosen castable cards.
{
  const r = G.newRoom("SEED"); r.telemOff = true;
  const p = G.addPlayer(r, "p", "P");
  // (the retired slimeCrown was the old ops-less exemplar; it's DELETED now, so a bogus non-KIT key
  // stands in as the non-castable entry — deckKeys must filter it and NOT pad back to MIN_DECK)
  p.deckList = ["oFire","oLightning","oWind","oArcane","oHoly","oMeteors","oZweihander","oForce","oSpear","zzRetired"];
  const keys = G.deckKeys(p, false);
  eq(keys.length, 9, "non-castable/unknown key filtered out; deck is NOT padded back to MIN_DECK");
  ok(keys.every((k) => p.deckList.includes(k)), "no card outside the chosen deckList is ever injected");
  ok(!keys.includes("zzRetired"), "an unknown/ops-less key is never a drawable combat card");
  ok(G.deckKeys({ deckList: ["oFire","coolShoes"] }, false).includes("coolShoes"),
     "…while Cool Shoes (a real card since 2026-07-06) DOES draw");
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

// ---- CONVERT BAG → 💎 TREASURE (owner 2026-07-06) + tenderWithTreasure spending ---------------
// "Converts all my current bagged items into pure treasure amount for level ups and bodies":
// convertBackpack melts every SPARE (backpack beyond the deck) into banked ◈; levelUp and
// swapBody-adoption pay through tenderWithTreasure (cards first, bank covers only the shortfall).
{
  const r = G.newRoom("CONV"); r.telemOff = true; r.phase = "won";
  const p = G.addPlayer(r, "p", "P");
  const ten = ["oSword","oHatchet","oSpear","oBow","oDagger","oFire","oLightning","oWind","oArcane","oHoly"];
  p.deckList = [...ten];
  p.backpack = [...ten, "oMeteors","oMeteors","oZweihander","dTowerShield","coolShoes"];  // 5 spares, ◈1 each
  eq(G.convertBackpack(r, p), 5, "convertBag melts the 5 SPARES for ◈5");
  eq(p.treasure, 5, "…banked as treasure");
  eq(p.deckList.length, 10, "…the deck is untouched");
  eq(p.backpack.length, 10, "…the backpack keeps exactly the deck copies");
  ok(!p.backpack.includes("coolShoes"), "…every spare melts, Cool Shoes included (a normal card since 7/06)");
  eq(G.convertBackpack(r, p), 0, "a second convert finds nothing to melt");
  // spend: a level-up paid ENTIRELY from the bank (L2 costs 5) — no cards tendered
  ok(G.levelUp(r, p, []), "levelUp: an empty tender is covered by the banked ◈");
  eq(G.runLevelOf(p), 2, "…level ticked to 2");
  eq(p.treasure, 0, "…the bank paid exactly the cost (5 − 5)");
  ok(!G.levelUp(r, p, []), "empty bank + empty tender → refused");
  // mixed tender: cards cover what they cover, the bank pays ONLY the shortfall
  p.treasure = 3; p.backpack.push("oMeteors", "oMeteors");         // 2 spares, ◈1 each
  ok(G.tenderWithTreasure(p, ["oMeteors", "oMeteors"], 4), "mixed: ◈2 in cards + ◈2 from the bank covers 4");
  eq(p.treasure, 1, "…the bank paid only the ◈2 shortfall");
  ok(!p.backpack.includes("oMeteors"), "…the tendered spares were spent");
  ok(!G.tenderWithTreasure(p, [], 2), "a ◈1 bank can't cover 2 → refused");
  eq(p.treasure, 1, "…and nothing was spent on the refusal");
  // conversion is a PREP action (same gate as levelUp/deck edits)
  r.phase = "playing"; p.backpack.push("oMeteors");
  eq(G.convertBackpack(r, p), 0, "convert is REFUSED mid-combat");
  eq(p.treasure, 1, "…bank unchanged");
  r.phase = "won";
  // the bank is per-RUN state — a fresh run wipes it with the rest of the economy
  G.startDraft(r);
  eq(p.treasure, 0, "startDraft (new run) resets the bank to 0");
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
  // UNDERPAY: with every owner card at value 1, a ware costs ◈1 (the ◈4 first-set wares are retired).
  // Underpay = tender nothing; a single ◈1 card covers it. (A >◈1 ware / multi-card overpay is unconstructible.)
  { const { r, p } = mk();
    const ware = "oGlacius";                              // value 1 (owner card, not in the deck)
    eq(G.itemTreasure(ware), 1, "an owner-card ware is value 1");
    r.shop.wares = [{ key: ware, value: G.itemTreasure(ware) }];
    ok(!G.buyWare(r, p, ware, []), "buyWare: tendering nothing (0 < 1) is REJECTED");
    ok(!p.backpack.includes(ware) && r.shop.wares.length === 1, "…nothing changed on an underpay");
    // …and one value-1 backpack-only card covers it
    ok(G.buyWare(r, p, ware, ["oMeteors"]), "buyWare: 1×value-1 covers value-1 → success");
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
  r.draftedFoes = [{ bodyKey: "rookie", gear: ["oDagger", "oFire"], greedy: true, owner: "p" }];
  const deckBefore = [...p.deckList], bpBefore = p.backpack.length;
  G.simulateTick(r);                                       // no enemies on the board → win
  eq(r.phase, "won", "an empty board resolves to a win");
  ok(p.backpack.length > bpBefore, "solo loot auto-collected into the BACKPACK");
  ok(p.backpack.includes("oDagger") && p.backpack.includes("oFire"), "…the foes' carried cards arrived");
  eq(p.deckList.join(), deckBefore.join(), "…the combat DECK is untouched (loot stays out of the deck)");
  eq(r.loot.length, 0, "…and the solo loot pile is consumed");
  // TELEMETRY (owner 2026-07-09): the offered set survives the solo auto-collect so loot_offer/loot_claim
  // can see solo loot at all (room.loot itself is wiped above → was invisible to pick-rate analysis).
  ok(r.lootRoll?.includes("oDagger") && r.lootRoll?.includes("oFire"),
    "TELEMETRY: room.lootRoll preserves the OFFERED loot after the solo auto-collect wipes room.loot");
  ok(r.lootTaken?.includes("oDagger") && r.lootTaken?.includes("oFire"),
    "…room.lootTaken records what solo auto-collected (the loot_claim source in onPhaseChange)");

  // multiplayer: loot stays a shared pile, claimLoot pulls into the backpack only — and since
  // 2026-07-02 a co-op claim SPENDS the seat's bid points (granted on clear; set by hand here)
  const r2 = G.newRoom("LT2"); r2.telemOff = true; r2.phase = "won";
  const a = G.addPlayer(r2, "a", "A"); G.addPlayer(r2, "b", "B");
  a.backpack = []; a.deckList = []; a.bidPoints = 9;
  r2.loot = ["oDagger", "oFire"];
  G.claimLoot(r2, a, "oFire");
  ok(a.backpack.includes("oFire") && !a.deckList.includes("oFire"), "claimLoot: the card joins the backpack, not the deck");
  ok(!r2.loot.includes("oFire") && r2.loot.includes("oDagger"), "…claimed loot is scarce (one instance, first-come)");
  eq(a.bidPoints, 9 - G.itemTreasure("oFire"), "…and the claim SPENT the card's value from the seat's bid points");
}

// ---- LOOT BID POINTS (owner 2026-07-02): "if the room was 10, give each player points divided by
// the number of players; give the excess to players so everyone's loot stays equivalent over the run"
{
  // GRANT SPLIT + remainder catch-up: V=10 over 3 seats → 4/3/3 with the extra to the first-joined;
  // the NEXT remainder goes to a DIFFERENT seat (lowest cumulative), so totals equalize over the run.
  const r = G.newRoom("BID"); r.telemOff = true;
  const a = G.addPlayer(r, "a", "A"), b = G.addPlayer(r, "b", "B"), c = G.addPlayer(r, "c", "C");
  G.grantBidPoints(r, 10);
  eq(a.bidPoints + b.bidPoints + c.bidPoints, 10, "the whole pool value is granted — nothing evaporates");
  ok([a, b, c].every((p) => p.bidPoints >= 3), "…each seat gets at least floor(V/seats)");
  eq(a.bidPoints, 4, "…the excess point goes to the lowest cumulative earner (first-joined on the tie)");
  G.grantBidPoints(r, 10);
  eq(b.bidPoints, 7, "…the NEXT excess catches up a different seat (b: 3 → 7)");
  eq(a.bidPoints + b.bidPoints + c.bidPoints, 20, "…cumulative grants stay exactly the pool total");
  ok(Math.max(a.lootEarned, b.lootEarned, c.lootEarned) - Math.min(a.lootEarned, b.lootEarned, c.lootEarned) <= 1,
    "…seats never drift more than 1 point apart — loot stays equivalent over the run");

  // CLAIM GATE: an over-budget claim bounces (pile + backpack untouched), an affordable one spends
  r.phase = "won"; r.loot = ["oFire"];                      // oFire ◈1 — the broke seat holds ◈0 below
  const broke = G.addPlayer(r, "d", "D"); broke.bidPoints = G.itemTreasure("oFire") - 1;
  G.claimLoot(r, broke, "oFire");
  ok(!broke.backpack.includes("oFire") && r.loot.includes("oFire") && broke.bidPoints === G.itemTreasure("oFire") - 1,
    "an over-budget claim BOUNCES — pile, backpack, and points all untouched");

  // SQUAD: a bot body's claim spends its OWNING seat's points; the card lands on the bot body
  const bot = G.addPlayer(r, "a2", "A-bot", { bot: true, owner: "a" });
  const aPts = a.bidPoints;
  G.claimLoot(r, bot, "oFire");
  ok(bot.backpack.includes("oFire"), "a squad-bot claim lands in the BOT body's backpack");
  eq(a.bidPoints, aPts - G.itemTreasure("oFire"), "…but the OWNING seat paid the points (bots hold none)");

  // WIN BRANCH grants automatically in co-op: pool value → split (2 seats here)
  const r2 = G.newRoom("BID2"); r2.telemOff = true;
  const p1 = G.addPlayer(r2, "p1", "P1"), p2 = G.addPlayer(r2, "p2", "P2");
  r2.phase = "playing"; r2.laneCount = 2; r2.lanes = [[], []]; r2.allies = [[], []];
  r2.draftedFoes = [{ bodyKey: "rookie", gear: ["oDagger", "oFire"], greedy: true, owner: "p1" }];
  G.simulateTick(r2);                                       // empty board → won → grant fires
  eq(r2.phase, "won", "empty board resolves to a win");
  const V = G.itemTreasure("oDagger") + G.itemTreasure("oFire");  // level-1 non-elite: only its items drop (base is threat-only)
  eq(p1.bidPoints + p2.bidPoints, V, "co-op clear grants the loot pool's exact value as bid points");
  ok(r2.loot.length === 2, "…and the pile stays up for claiming (just the 2 gear cards; no solo auto-collect in co-op)");

  // NEW RUN resets the budget and the catch-up ledger
  G.startDraft(r2);
  ok(p1.bidPoints === 0 && p1.lootEarned === 0 && p2.bidPoints === 0 && p2.lootEarned === 0,
    "a new run resets bid points AND the cumulative-earned ledger");
}

// ---- ANTE V3 LOOT (owner 2026-07-03): everything ABOVE the +1-per-foe base drops — ◈ = ⚖ − foeCount --
{
  const r = G.newRoom("CONS"); r.telemOff = true;
  const a = G.addPlayer(r, "a", "A"), b = G.addPlayer(r, "b", "B");
  r.phase = "playing"; r.laneCount = 2; r.lanes = [[], []]; r.allies = [[], []];
  r.draftedFoes = [
    { bodyKey: "rookie", gear: ["oDagger", "oDagger", "oDagger"], level: 3, greedy: false, owner: null }, // ⚖8 = 1 base + 3 items + 2×2 levels; drops 3 items + 4 level = ◈7
    { bodyKey: "atlas",  gear: ["oDagger", "oDagger", "oDagger"], level: 1, greedy: false, owner: null }, // ⚖7 = 1 base + 3 items + 3 elite;  drops 3 items + 3 elite = ◈6
  ];
  r.gimmick = { key: "acidRain", name: "Acid Rain", pot: 3 };   // the room effect's pot drops too
  eq(G.roomValue(r), 15, "the stocked ANTE (threat): 8 (leveled) + 7 (elite-bodied)");
  // loot = each foe's surplus above its base 1 (foeLootValue) + the effect pot — the 2 bases don't drop
  const wantDrop = r.draftedFoes.reduce((s, f) => s + G.foeLootValue(f), 0) + 3;   // (7 + 6) + 3 = 16
  eq(wantDrop, 16, "droppable ◈ = ⚖15 − 2 bases + ◈3 pot = 16");
  G.simulateTick(r);                                            // empty board → won → loot realizes
  eq(r.phase, "won", "empty board resolves to a win");
  eq(r.loot.reduce((s, k) => s + G.itemTreasure(k), 0), wantDrop,
     "carried cards + level value + elite premium + effect pot drop as treasures (the +1 bases don't)");
  eq(a.bidPoints + b.bidPoints, wantDrop, "…and the bid-points grant covers exactly the dropped value");
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
  const { r, p } = rig("cleric", { inv: [] });   // summonRat card retired — summon the rat token directly
  for (let i = 0; i < 3; i++) G.resolveOps(r, p, [{ do: "summon", body: "rat", count: 1 }]);
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
  const { r, p } = rig("cleric", { inv: [] });   // summon cards retired — summon the tokens directly
  G.resolveOps(r, p, [{ do: "summon", body: "largeRat", count: 1 }]);
  G.resolveOps(r, p, [{ do: "summon", body: "largeRat", count: 1 }]);
  G.resolveOps(r, p, [{ do: "summon", body: "rat", count: 1 }]);
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
  // KILLIONAIRE: starts each combat with 4 moxie (combatStart), no on-deal gain (owner 2026-07-09).
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
{
  // TRIGGER KIND (owner 2026-07-06 ruling, supersedes the 6/28 two-bucket): RANGED means
  // FOE-AFFECTING — "a projectile. A spell. Not armor." melee = true melee weapon; ranged =
  // any card whose ops reach a foe (damage, drag, drain, hex — opsTouchFoes); everything
  // self/ally-facing (shields, armor, heals, buffs, ramps, summons) = "none", feeding NEITHER
  // play trigger. Force is the one ranged-typed shield (explicit flag, scales off ranged).
  // cardKind stays THREE-bucket (damage clocks + draft-fit).
  eq(G.triggerKind("oDagger"), "melee", "triggerKind: a melee weapon is melee");
  eq(G.triggerKind("oArcane"), "ranged", "triggerKind: a ranged spell is ranged");
  eq(G.triggerKind("oFire"), "ranged", "triggerKind: a spell is ranged");
  // foe-affecting NON-damage cards stay ranged: debuffs are "projectiles" in the owner's sense
  for (const k of ["oSlow", "oWeakness", "dTaunt", "oPetLeech", "oLightning"])
    eq(G.triggerKind(k), "ranged", "triggerKind: foe-affecting " + k + " is RANGED");
  // self/ally cards are TYPELESS — shields, armor, heals, buffs, ramps, summons all feed neither
  for (const k of ["dBuckler", "dShield", "dHeartGuard", "dTowerShield", "dBloodIron", "dLiquidMetal",
                   "dThorns", "dStoneskin", "dTrollskin", "oBerserker", "oHaste", "oHoly", "oPowerUp",
                   "oSharpEdges", "oDemonForm", "oSageMode", "oMoxiePool", "oHedgeKnight"])   // oWizardHat DELETED 2026-07-09; the MODAL buffs stay typeless (touch no foe)
    eq(G.triggerKind(k), "none", "triggerKind: self/ally card " + k + " is TYPELESS (feeds neither trigger)");
  eq(G.triggerKind("oForce"), "ranged", "triggerKind: FORCE is the one ranged-typed shield");
  eq(G.triggerKind("dShieldBash"), "melee", "triggerKind: Shield Bash stays MELEE (it strikes the front)");
  ok(!G.isRanged("dShield") && !G.isRanged("dBuckler") && !G.isRanged("oHaste") && !G.isRanged("oHoly"),
     "…the 🎯 badge follows: self/ally cards aren't ranged");
  ok(G.isRanged("oForce") && G.isRanged("oSlow") && G.isRanged("oFire"), "…Force + foe-affecting cards keep the ranged badge");
  eq(G.cardKind("dShield"), "untyped", "…while cardKind keeps utility UNTYPED (damage/draft axis unchanged)");
  // DRAFT-FIT IS UNCHANGED by the trigger rework: a utility card still fits EVERY body (melee + ranged).
  ok(G.itemFitsArchetype("bloodfund", "dShield") && G.itemFitsArchetype("ratBaron", "dShield"),
     "draft-fit unchanged: utility (Shield) still fits a melee body AND a ranged body");
  eq(G.itemFlavor("dShield"), "util", "…and itemFlavor keeps utility as `util` (fits any), not ranged");
}
{
  // MID-MANAGEMENT MEDUSA: {onPlayRanged} → poison the lane. A typeless SHIELD no longer fires it
  // (owner 2026-07-06 shield ruling — supersedes the 6/28 "utility counts ranged" case); a true
  // ranged card still does, and non-shield utility still counts ranged (asserted via triggerKind above).
  const { r, p, foe } = rig("medusa", { inv: ["dShield", "oDagger", "oFire"] });
  fire(r, p, 0); eq(foe.poison ?? 0, 0, "Medusa: a SHIELD (typeless) no longer fires onPlayRanged — 0 poison");
  fire(r, p, 2); eq(foe.poison ?? 0, 1, "…a real RANGED card (Fire) fires it → 1 poison");
  fire(r, p, 1); eq(foe.poison ?? 0, 1, "…a MELEE card does NOT fire it (no extra poison)");
}
{
  // FORCE SCALES OFF RANGED (owner 2026-07-06): the one ranged-typed shield — its gain is
  // 6 + the wearer's ranged bonus (rangedBonusOf = counters + rangedBonus, exactly the term a
  // ranged deal card gets). Every other shield stays FLAT.
  const { r, p } = rig("rookie", { inv: ["oForce", "dShield"] });
  fire(r, p, 0); eq(p.shield, 6, "Force with no bonus: flat 6 shield");
  p.shield = 0; p.rangedBonus = 2;
  fire(r, p, 0); eq(p.shield, 8, "Force + ranged bonus 2 → 8 shield (scales off ranged)");
  p.shield = 0; p.counters = 1;                      // generic +damage counters lift ranged too
  fire(r, p, 0); eq(p.shield, 9, "…generic counters lift it too (6 + 2 ranged + 1 counter)");
  p.shield = 0; fire(r, p, 1); eq(p.shield, 2, "a typeless shield (Shield) stays FLAT — no ranged scaling");
}

// ---- ELITE ROOMS ARE FREE TO ENTER (owner 2026-06-28: the elite cost is on the BODY, not the fight) -----
{
  const ten = ["oSword","oHatchet","oSpear","oBow","oDagger","oFire","oLightning","oWind","oArcane","oHoly"];
  // ZERO resources can still walk straight into an elite room (the old spare-card entry gate is retired)
  { const r = G.newRoom("EFREE"); r.telemOff = true; r.floor = 1; r.phase = "won";
    const p = G.addPlayer(r, "p", "P");
    p.bodyKey = "frugal"; p.deckList = [...ten]; p.backpack = [...ten];   // 0 spares — would have been "locked" before
    r.level = { nodes: [
      { id: "c", type: "combat", cleared: false, x: 0.5, y: 0.05, links: ["e", "k"], row: 0 },
      { id: "e", type: "elite",  cleared: false, x: 0.3, y: 0.50, links: [], row: 1,
        foes: G.generateRoomFoes(r, G.roomAnteBudget(r, "elite"), 1) },
      { id: "k", type: "combat", cleared: false, x: 0.7, y: 0.50, links: [], row: 1 },
    ], currentId: "c" };
    ok(G.advanceLevel(r, "e"), "advanceLevel into an elite room succeeds with ZERO resources (free to enter)");
    eq(r.level.currentId, "e", "…the party entered the elite room, no toll paid");
  }
  // SNAPSHOT: elite nodes no longer carry a room-entry lock/cost
  { const r = G.newRoom("EFREE2"); r.telemOff = true; r.floor = 1; G.addPlayer(r, "p", "P"); G.startLevel(r);
    const eNode = G.snapshot(r).map.nodes.find((n) => n.type === "elite");
    if (eNode) ok(!("locked" in eNode) && !("cost" in eNode), "elite nodes ship no room-entry lock/cost anymore");
    else ok(true, "no elite on this random map (fine — ≥1 per floor, position varies)");
  }
  // The retired room-entry-cost API is gone
  ok(G.eliteLock === undefined && G.payEliteCost === undefined && G.ELITE_COST_SPARES === undefined,
     "the retired elite room-entry cost API (eliteLock/payEliteCost/ELITE_COST_SPARES) is removed");
}

// ---- ELITE BODY ADOPTION: becoming a felled ELITE costs a FLAT price; commons are free (owner 2026-06-28) --
{
  const ten = ["oSword","oHatchet","oSpear","oBow","oDagger","oFire","oLightning","oWind","oArcane","oHoly"];
  const C = G.ADOPT_COST;
  const ELITE = "fundjin", ELITE2 = "debtDragon", COMMON = "frugal";
  const mk = () => {
    const r = G.newRoom("ADOPT"); r.telemOff = true; r.floor = 1; r.phase = "won";
    const p = G.addPlayer(r, "p", "P");
    p.bodyKey = "rookie"; p.homeBody = "rookie";
    p.deckList = [...ten]; p.backpack = [...ten];           // 0 spares
    r.unlockedBodies.add(ELITE); r.unlockedBodies.add(COMMON);
    return { r, p };
  };
  ok(typeof C === "number" && C > 0, "ADOPT_COST is a positive flat price");
  ok(G.BODIES?.[ELITE]?.elite === true, "the test ELITE body is actually tagged elite");
  // a COMMON felled body is FREE to wear (no payment)
  { const { r, p } = mk();
    eq(G.adoptCost(r, COMMON), 0, "a COMMON body is free to become (cost 0)");
    ok(G.swapBody(r, p, COMMON) === COMMON, "…and swaps with no pay-cards");
  }
  // an ELITE with NO pay-cards → rejected (the price must be tendered)
  { const { r, p } = mk();
    eq(G.adoptCost(r, ELITE), C, "an un-adopted ELITE costs the flat ADOPT_COST");
    ok(!G.swapBody(r, p, ELITE), "swapBody to an elite with no pay-cards is REJECTED");
    eq(p.bodyKey, "rookie", "…still wearing the starter");
  }
  // PAY enough card VALUE → adopted, worn, cards spent, deck untouched, then FREE
  { const { r, p } = mk();
    p.backpack = [...ten, ...Array(C).fill("oMeteors")];    // C value-1 spare cards
    ok(G.swapBody(r, p, ELITE, Array(C).fill("oMeteors")), "adopt succeeds when tendered value covers the price");
    eq(p.bodyKey, ELITE, "…now wearing the adopted elite");
    eq(p.backpack.length, 10, "…the spare pay-cards were spent");
    eq(p.deckList.length, G.MIN_DECK, "…the combat deck was untouched (spares tendered first)");
    ok(r.adoptedBodies.has(ELITE), "…the elite is marked adopted for the run");
    eq(G.adoptCost(r, ELITE), 0, "…and is now FREE to re-wear");
  }
  // UNDER-PAY is rejected (value must COVER the price)
  { const { r, p } = mk();
    const few = Array(Math.max(0, C - 1)).fill("oMeteors");
    p.backpack = [...ten, ...few];
    ok(!G.swapBody(r, p, ELITE, few), "under-paying the adoption price is REJECTED");
    eq(p.bodyKey, "rookie", "…no swap happened, no cards lost");
    eq(p.backpack.length, 10 + few.length, "…the would-be payment was not spent");
  }
  // RE-WEAR an already-adopted elite is FREE (adopt two elites, swap back to the first with no pay)
  { const { r, p } = mk();
    r.unlockedBodies.add(ELITE2);
    p.backpack = [...ten, ...Array(2 * C).fill("oMeteors")];
    ok(G.swapBody(r, p, ELITE, Array(C).fill("oMeteors")), "adopt elite #1");
    ok(G.swapBody(r, p, ELITE2, Array(C).fill("oMeteors")), "adopt elite #2");
    ok(G.swapBody(r, p, ELITE), "re-wear the already-adopted elite #1 with NO pay-cards");
    eq(p.bodyKey, ELITE, "…wearing elite #1 again, free");
  }
  // SNAPSHOT exposes the flat price + the adopted set
  { const { r } = mk();
    const s = G.snapshot(r);
    eq(s.adopt.cost, C, "snapshot ships the flat adoption price");
    ok(Array.isArray(s.adopt.adopted), "…and the adopted-bodies list");
  }
}

// ---- OWNER BATCH C (2026-07-06): 14 cards + 6 commons + the Wandering Castle elite — each mechanic proven
{
  // Moonlight Greatsword: takes BOTH bonuses; upgrades front → lane at 3+/3+
  { const { r, p, foe } = rig("rookie", { inv: ["oMoonGreat"], foeHp: 1000 });
    const extra = G.spawnEnemy("cleric", []); extra.hp = extra.maxHp = 1000; extra.queue = []; r.lanes[0].push(extra);
    p.meleeBonus = 2; p.rangedBonus = 2;
    let h0 = foe.hp + extra.hp;
    fire(r, p, 0); eq(h0 - (foe.hp + extra.hp), 8, "Moonlight: 4 base + melee 2 + ranged 2 = 8, FRONT only under the 3+ gate");
    p.meleeBonus = 3; p.rangedBonus = 3;
    h0 = foe.hp + extra.hp;
    fire(r, p, 0); eq(h0 - (foe.hp + extra.hp), 20, "…at 3+/3+ it strikes the WHOLE lane (10 each to both foes)"); }
  // Dual-Handing Two-Handers: melee 5+ costs −3, per fight; the UI cost matches
  { const { r, p } = rig("rookie", { inv: ["oDualHand", "oZweihander"] });
    eq(G.playCost("oZweihander", BODIES.rookie, p), 5, "Zweihänder costs 5 before Two-Handers");
    fire(r, p, 0);
    eq(G.playCost("oZweihander", BODIES.rookie, p), 2, "…and 2 after the cast (melee 5+ −3)");
    G.beginCombat(r); ok(!p.twoHand, "…the discount is per-fight"); }
  // Power Word: Gun — ⚡10, 13 aimed
  { eq(G.KIT.oPowerWordGun.cost, 10, "PW:Gun costs the full moxie bar");
    const { r, p, foe } = rig("rookie", { inv: ["oPowerWordGun"], foeHp: 1000 });
    const h0 = foe.hp; fire(r, p, 0); eq(h0 - foe.hp, 13, "…and deals 13"); }
  // Gravity Greatshield: +6 shield; sap ONLY the caster's own lane (owner 2026-07-09, lane-scoped)
  { const { r, p, foe } = rig("rookie", { inv: ["oGravityShield"] });
    r.laneCount = 2; r.allies.push([]);
    const f1 = G.spawnEnemy("cleric", []); f1.hp = f1.maxHp = 1000; f1.queue = [];
    r.lanes.push([f1]);                                    // a foe in a DIFFERENT lane than the caster (lane 0)
    fire(r, p, 0); eq(p.shield, 6, "Gravity Greatshield: +6 shield");
    ok(G.hasBuff(foe, "sap"), "…a foe in the CASTER'S OWN lane is SAPPED");
    ok(!G.hasBuff(f1, "sap"), "…a foe in ANOTHER lane is NOT sapped (lane-scoped, owner 2026-07-09)");
    eq(G.foeDealHit(r, foe, { amount: 5 }, null), 2, "…a sapped 5-hit lands 2 (flat −3)"); }
  // Treasure Blade: refund = damage dealt
  { const { r, p } = rig("rookie", { inv: ["oTreasureBlade"], foeHp: 1000 });
    p.moxie = 5; const card = p.hand.find((x) => x.key === "oTreasureBlade"); ok(G.playCard(r, p, card.id), "Treasure Blade plays");
    eq(p.moxie, 5, "…cost 3, dealt 3, refunded 3 (net 0)"); }
  // Rainblow Blade (owner 2026-07-09): immediate FRONT strike for melee+ranged, THEN a 6s delayed lane strike
  { const { r, p, foe } = rig("rookie", { inv: ["oRainblow"], foeHp: 1000 });
    p.meleeBonus = 2; p.rangedBonus = 3;
    const hStart = foe.hp;
    fire(r, p, 0);
    eq(hStart - foe.hp, 5, "Rainblow hits the FRONT foe immediately for melee(2)+ranged(3)");
    eq((p.timers ?? []).length, 1, "…and installs a one-shot timer for the lane strike");
    const h0 = foe.hp; for (let i = 0; i < 60; i++) G.tickTimers(r, p, 0);
    eq(h0 - foe.hp, 5, "…after 6s it hits the whole lane for melee(2)+ranged(3)");
    eq((p.timers ?? []).length, 0, "…and the timer EXPIRES (once, not every 6s)"); }
  // OWNER 2026-07-09: Rainblow now has a direct FRONT deal (melee-typed) → it classifies MELEE at CAST, so
  // Rent-Seeking Runeblade's onPlayMelee fires once at cast (+1 ranged); the delayed lane STRIKE then fires
  // BOTH play-triggers (onPlayRanged → +1 melee, onPlayMelee → +1 ranged). We read deltas ACROSS the strike.
  // FLAG (owner's call): the immediate front strike itself does NOT force both triggers — say if you want it to.
  { const { r, p } = rig("pyramidRogue", { inv: ["oRainblow"], foeHp: 1000 });
    fire(r, p, 0);                                          // cast: front strike + installs the timer; onPlayMelee fires once (+1 ranged)
    eq(p.rangedBonus, 1, "Rainblow CAST classifies melee → Runeblade onPlayMelee fires once (+1 ranged)");
    eq(p.meleeBonus ?? 0, 0, "…and onPlayRanged does NOT fire at cast (+0 melee)");
    const mCast = p.meleeBonus ?? 0, rCast = p.rangedBonus;
    for (let i = 0; i < 60; i++) G.tickTimers(r, p, 0);     // the delayed lane strike resolves
    eq((p.meleeBonus ?? 0) - mCast, 1, "Rainblow STRIKE fires onPlayRanged → +1 melee (owner 2026-07-09)");
    eq(p.rangedBonus - rCast, 1, "…AND onPlayMelee → +1 ranged: one resolved strike fires BOTH play-triggers"); }
  // FOE SYMMETRY: a foe wearing the Runeblade casts Rainblow → its delayed strike fires both play-triggers
  { const { r } = rig("rookie", { foeHp: 1000 });
    const gf = G.spawnEnemy("pyramidRogue", ["oRainblow"]); gf.lane = 0; r.lanes[0].push(gf); gf.moxie = 99;
    ok(G.foeCast(r, gf), "foe symmetry: a foe casts Rainblow (installs its one-shot timer)");
    const mCast = gf.meleeBonus ?? 0, rCast = gf.rangedBonus ?? 0;
    for (let i = 0; i < 60; i++) G.tickTimers(r, gf, gf.lane);
    eq((gf.meleeBonus ?? 0) - mCast, 1, "foe Rainblow STRIKE fires onPlayRanged → +1 melee");
    eq((gf.rangedBonus ?? 0) - rCast, 1, "…AND onPlayMelee → +1 ranged (both triggers, foe-owned timer)"); }
  // Jesterplate: +1 moxie per hit taken
  { const { r, p } = rig("rookie", { inv: ["oJesterplate"], pHp: 100 });
    fire(r, p, 0); p.moxie = 0; G.damagePlayer(r, p, 4);
    eq(p.moxie, 1, "Jesterplate: +1 moxie per hit EVENT (not per point)"); }
  // Jesterplate STILL fires when the hit is FULLY ABSORBED BY SHIELD (owner 2026-07-09: shield damage IS damage)
  { const { r, p } = rig("rookie", { inv: ["oJesterplate"], pHp: 100 });
    fire(r, p, 0); p.moxie = 0; p.shield = 10; const hp0 = p.hp; G.damagePlayer(r, p, 4);
    eq(p.shield, 6, "…the 4-hit is fully absorbed by shield (10→6)"); eq(p.hp, hp0, "…HP is untouched");
    eq(p.moxie, 1, "Jesterplate gains moxie on a SHIELD-ONLY hit (a hit of >0 damage landed)"); }
  // Whip (melee-tagged lane) + Cross-Blade (lane now + once-echo in 6s)
  { const { r, p, foe } = rig("rookie", { inv: ["oWhip", "oCrossBlade"], foeHp: 1000 });
    p.meleeBonus = 1; const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 3, "Whip: lane damage that takes the MELEE bonus (2+1)");
    const h1 = foe.hp; fire(r, p, 1); eq(h1 - foe.hp, 3, "Cross-Blade: first lane strike lands now (2+1)");
    const h2 = foe.hp; for (let i = 0; i < 60; i++) G.tickTimers(r, p, 0);
    eq(h2 - foe.hp, 2, "…and echoes once after 6s (the timer strike is kind-less → base 2)"); }
  // Continent-Club: overflow rolls down the lane
  { const { r, p, foe } = rig("rookie", { inv: ["oContinentClub"], foeHp: 5 });
    const back = G.spawnEnemy("cleric", []); back.hp = back.maxHp = 20; back.queue = []; r.lanes[0].push(back);
    fire(r, p, 0);
    ok(foe.hp <= 0 || !r.lanes[0].includes(foe), "Continent-Club: 12 kills the 5-HP front foe");
    eq(r.lanes[0][0]?.hp, 13, "…and the 7 excess overflows into the next foe (20 → 13)"); }
  // Telekinetic Blades: melee aims + takes the ranged bonus
  { const { r, p, foe } = rig("rookie", { inv: ["oTeleBlades", "oSword"], foeHp: 1000 });
    p.rangedBonus = 2; fire(r, p, 0);
    const h0 = foe.hp; fire(r, p, 1);
    eq(h0 - foe.hp, 5, "TK Blades: Sword (3) scales with the RANGED bonus (+2) and aims at the reticle"); }
  // Giant's Belt: max HP doubles + heals the gain, per fight
  { const { r, p } = rig("rookie", { inv: ["oGiantsBelt"], pHp: 10 });
    p.hp = 4; fire(r, p, 0);
    eq(p.maxHp, 20, "Giant's Belt: max HP doubled");
    eq(p.hp, 14, "…healing the gained amount (+10)");
    G.beginCombat(r); eq(p.maxHp, 10, "…restored next combat (this-fight duration)"); }
  // Bribed Bishop: healed → +1 melee
  { const { r, p } = rig("bribedBishop", { inv: ["dHeartGuard"] });
    p.hp = 3; fire(r, p, 0);
    eq(p.meleeBonus, 1, "Bribed Bishop: being healed grants +1 melee"); }
  // Cheque Cherub: every play heals the target 1 / shields 1 at full HP
  { const { r, p } = rig("chequeCherub", { inv: ["oArcane"] });
    fire(r, p, 0);
    eq(p.shield ?? 0, 1, "Cheque Cherub at full HP: a play grants +1 shield (self fallback, no ally)"); }
  // Pyramid-Scheme Head: every 3 plays → the next card is FREE
  { const { r, p } = rig("pyramidHead", { inv: ["oArcane", "oArcane", "oArcane", "oZweihander"] });
    fire(r, p, 0); fire(r, p, 1); fire(r, p, 2);
    ok(p.freeNext, "Pyramid-Scheme Head: 3 plays arm a FREE card");
    eq(G.playCost("oZweihander", G.BODIES.pyramidHead, p), 0, "…the next card costs 0");
    p.moxie = 0; const card = p.hand.find((x) => x.key === "oZweihander");
    ok(G.playCard(r, p, card.id), "…castable at 0 moxie");
    ok(!p.freeNext, "…and the freebie is consumed by that play"); }
  // Stockbroking Sphinx (OVERHAUL, owner 2026-07-09): ELITE, 14 HP; every 6 moxie SPENT →
  // deal (1 + ranged bonus) to the foe lane, heal the damage dealt, overheal → shield.
  eq(BODIES.sphinx.maxHp, 14, "Sphinx: HP doubled to 14");
  ok(BODIES.sphinx.elite === true && G.ELITE_SET.includes("sphinx"), "Sphinx is an ELITE (elite:true + in ELITE_SET)");
  // base strike = 1 (no ranged bonus): 6 moxie spent → 1 to the lane, heal 1
  { const { r, p, foe } = rig("sphinx", { foeHp: 1000, pHp: 20 });
    p.hp = 5; G.spendTriggerPassives(r, p, 6);
    eq(1000 - foe.hp, 1, "Sphinx: 6 moxie spent → 1 (base) to the foe lane");
    eq(p.hp, 6, "…and heals the 1 damage dealt"); }
  // sub-threshold: 5 spent does NOT fire (spend:6 clock)
  { const { r, p, foe } = rig("sphinx", { foeHp: 1000, pHp: 20 });
    G.spendTriggerPassives(r, p, 5);
    eq(foe.hp, 1000, "Sphinx: 5 moxie spent is under the 6-threshold"); }
  // ranged bonus scales the strike: +2 ranged → deal 3, heal 3
  { const { r, p, foe } = rig("sphinx", { foeHp: 1000, pHp: 20 });
    p.rangedBonus = 2; p.hp = 5; G.spendTriggerPassives(r, p, 6);
    eq(1000 - foe.hp, 3, "Sphinx: strike = 1 + ranged bonus (1 + 2 = 3)");
    eq(p.hp, 8, "…heals the damage dealt (3)"); }
  // OVERHEAL: healing past maxHp spills the excess into shield
  { const { r, p, foe } = rig("sphinx", { foeHp: 1000, pHp: 14 });
    p.rangedBonus = 4; p.hp = 13; p.shield = 0; G.spendTriggerPassives(r, p, 6);
    eq(1000 - foe.hp, 5, "Sphinx: 1 + 4 ranged = 5 to the lane");
    eq(p.hp, 14, "…heal caps HP at max (13 → 14)");
    eq(p.shield, 4, "…the 4 excess healing overheals into shield"); }
  // OVERHEAL is opt-in via the op flag (a plain heal never spills — see the global-vs-scoped FLAG in combat.js).
  ok(!!BODIES.sphinx.passive[0].ops[0].overheal, "Sphinx's lane-deal op carries overheal:true (opt-in)");
  // SYMMETRY: a FOE-owned Sphinx drains its lane's heroes for 1 + ranged, heals itself, overheals to shield
  { const r = G.newRoom("SPHINXFOE"); r.phase = "playing"; r.laneCount = 1; r.allies = [[]]; r.caravan = { hp: 1e9, max: 1e9 };
    const p = G.addPlayer(r, "p", "P"); G.wearBody(p, "rookie"); p.lane = 0; p.maxHp = p.hp = 100;
    const foe = G.spawnEnemy("sphinx", []); foe.side = "foe"; foe.lane = 0; foe.queue = [];
    foe.hp = 13; foe.maxHp = 14; foe.shield = 0; foe.counters = 0; foe.meleeBonus = 0; foe.rangedBonus = 4; // 1 + 4 = 5
    r.lanes = [[foe]];
    G.spendTriggerPassives(r, foe, 6);
    eq(100 - p.hp, 5, "foe Sphinx: 1 + ranged bonus (5) strikes the hero lane");
    eq(foe.hp, 14, "…foe Sphinx heals the damage dealt, capped at max (13 → 14)");
    eq(foe.shield, 4, "…and the excess overheals into shield (symmetric)"); }
  // Penny-Pinching Pixie: melee −1
  { eq(G.cardCost("oSword", G.BODIES.pennyPixie), G.cardCost("oSword") - 1, "Penny-Pinching Pixie: melee cards cost 1 less");
    eq(G.cardCost("oFire", G.BODIES.pennyPixie), G.cardCost("oFire"), "…ranged cards untouched"); }
  // Economy Elemental: +4 / −2 alternating every 6s
  { const { p } = rig("econElemental");
    G.applyCombatStart(p); p.moxie = 0;
    for (let i = 0; i < 60; i++) G.tickRegens(p);
    eq(p.moxie, 4, "Economy Elemental: first cycle +4");
    for (let i = 0; i < 60; i++) G.tickRegens(p);
    eq(p.moxie, 2, "…second cycle −2 (alternating)"); }
  // Wandering Castle: 5+-cost casts grant that much shield; ALL shield gains +1
  { const { r, p } = rig("wanderCastle", { inv: ["oZweihander", "dShield"], foeHp: 1000 });
    fire(r, p, 0); eq(p.shield, 6, "Wandering Castle: a ⚡5 cast grants 5 shield + his +1");
    fire(r, p, 1); eq(p.shield, 9, "…and card shields gain +1 too (Shield 2 → 3)"); }
  // Earth + Lava Elemental summons arrive with their kits
  { const { r, p } = rig("rookie", { inv: ["oEarthElemental", "oLavaElemental"] });
    fire(r, p, 0); fire(r, p, 1);
    eq(r.allies[0].length, 2, "Earth + Lava Elementals summon into the lane");
    ok(r.allies[0].some((t) => t.bodyKey === "earthElemental") && r.allies[0].some((t) => t.bodyKey === "lavaElemental"), "…the right tokens"); }
}

// ---- OWNER BATCH D (2026-07-07): Black Hole, Lion Lance, Crystal Ball, Mirror Shield, Grand Spirit —
// each mechanic proven, incl. the PICK CONTRACT (play `pick` + snapshot descriptor) and foe symmetry.
{
  // BLACK HOLE: 8 to every foe in the AIMED lane (not the caster's), −8 sap for 6s, expires on time
  { eq(KIT.oBlackHole.cost, 8, "Black Hole costs 8 (owner's number)");
    const { r, p, foe } = rig("rookie", { inv: ["oBlackHole"], foeHp: 1000 });
    r.laneCount = 2; r.allies.push([]);
    const f1a = G.spawnEnemy("cleric", []); f1a.hp = f1a.maxHp = 1000; f1a.queue = [];
    const f1b = G.spawnEnemy("cleric", []); f1b.hp = f1b.maxHp = 1000; f1b.queue = [];
    r.lanes.push([f1a, f1b]);
    p.targetId = f1a.id;                                   // aim across lanes — the reticle picks the LANE
    fire(r, p, 0);
    ok(f1a.hp === 992 && f1b.hp === 992, "Black Hole: 8 to EVERY foe in the aimed foe's lane");
    eq(foe.hp, 1000, "…the caster's own (un-aimed) lane is untouched");
    ok(G.hasBuff(f1a, "sap") && G.hasBuff(f1b, "sap"), "…both struck foes are SAPPED");
    ok(!G.hasBuff(foe, "sap"), "…the caster's own-lane foe is NOT sapped (Black Hole hits the AIMED lane)");
    eq(G.foeDealHit(r, f1a, { amount: 10 }, null), 2, "…a sapped 10-hit lands 2 (flat −8)");
    for (let i = 0; i < 60; i++) G.tickBuffs(f1a);         // 6 seconds pass
    ok(!G.hasBuff(f1a, "sap"), "…the sap EXPIRES after 6s (60 ticks)");
    eq(G.foeDealHit(r, f1a, { amount: 10 }, null), 10, "…and its damage is whole again");
    ok(G.isRanged("oBlackHole") && G.triggerKind("oBlackHole") === "ranged", "…Black Hole derives RANGED (it touches foes)"); }
  // LION LANCE: melee strike + a permanent-for-the-fight melee ramp (owner ruling 2026-07-07: melee-typed)
  { const { r, p, foe } = rig("rookie", { inv: ["oLionLance"], foeHp: 1000 });
    eq(G.cardKind("oLionLance"), "melee", "Lion Lance is MELEE-typed (owner ruling 2026-07-07)");
    eq(G.triggerKind("oLionLance"), "melee", "…and feeds melee play-triggers");
    fire(r, p, 0);
    eq(1000 - foe.hp, 3, "Lion Lance: 3 to the front foe (the ramp lands AFTER the strike)");
    eq(G.meleeBonusOf(p), 1, "…and grants +1 melee");
    for (let i = 0; i < 200; i++) G.tickBuffs(p);          // 20s — a timed buff would be long gone
    eq(G.meleeBonusOf(p), 1, "…which PERSISTS for the rest of the fight (not a timed buff)");
    const h1 = foe.hp; fire(r, p, 0);
    eq(h1 - foe.hp, 4, "…so the second Lance hits 4 (3 + its own ramp)"); }
  // CRYSTAL BALL: tutor the PICKED draw-pile card to hand + +1 ranged; RANGED BY OWNER FIAT (2026-07-07)
  { ok(G.isRanged("oCrystalBall"), "Crystal Ball is RANGED by owner fiat (2026-07-07) — the oForce-style explicit exception");
    eq(G.triggerKind("oCrystalBall"), "ranged", "…it feeds ranged play-triggers");
    eq(G.cardCost("oCrystalBall", BODIES.ratBaron), G.cardCost("oCrystalBall") - 1, "…and takes Lizard Wizard's −1 ranged kind-pricing");
    const { r, p } = rig("rookie", { inv: ["oCrystalBall"] });
    p.deck = G.mintCards(["oZweihander", "oSword", "oFire"]);          // a known draw pile
    const card = p.hand.find((c) => c.key === "oCrystalBall");
    ok(G.playCard(r, p, card.id, "oFire"), "Crystal Ball plays with a pick");
    ok(p.hand.some((c) => c.key === "oFire"), "…the PICKED card is now in hand");
    ok(!p.deck.some((c) => c.key === "oFire"), "…and out of the draw pile");
    eq(G.rangedBonusOf(p), 1, "…and grants +1 ranged for the fight");
    // Runeblade cross-trigger: a ranged PLAY grants +1 melee (proves the fiat typing feeds triggers)
    const { r: r2, p: p2 } = rig("pyramidRogue", { inv: ["oCrystalBall"] });
    p2.deck = G.mintCards(["oSword"]);
    fire(r2, p2, 0);
    eq(p2.meleeBonus ?? 0, 1, "…a Runeblade playing Crystal Ball ramps melee (onPlayRanged fired)");
    // fallback: NO pick → a random draw-pile card comes up (never a crash, never a softlock)
    const { r: r3, p: p3 } = rig("rookie", { inv: ["oCrystalBall"] });
    p3.deck = G.mintCards(["oHatchet"]);
    const c3 = p3.hand.find((c) => c.key === "oCrystalBall");
    ok(G.playCard(r3, p3, c3.id), "Crystal Ball plays with NO pick");
    ok(p3.hand.some((c) => c.key === "oHatchet"), "…and falls back to a RANDOM draw-pile card");
    // both piles dry → the tutor just fizzles (still grants the ranged bonus)
    const { r: r4, p: p4 } = rig("rookie", { inv: ["oCrystalBall"] });
    ok(G.playCard(r4, p4, p4.hand[0].id, "oSword"), "…an empty-deck Crystal Ball still plays (tutor fizzles, no crash)");
    eq(G.rangedBonusOf(p4), 1, "…and still grants its +1 ranged");
    // HAND SIZE: the tutored card is a ONE-SHOT — it does NOT permanently grow the hand (owner
    // REVERSED the earlier "hand grows" call, 2026-07-09). A full HAND_SIZE hand with a Crystal Ball
    // must return to HAND_SIZE once the ball resolves, and STAY there across further plays.
    const { r: r5, p: p5 } = rig("rookie");
    p5.cards = G.mintCards(["oCrystalBall", "oSword", "oHatchet", "oZweihander", "oFire", "oShield"]);
    p5.hand = G.mintCards(["oCrystalBall", "oSword", "oHatchet"]);      // a full HAND_SIZE=3 opening hand
    p5.deck = G.mintCards(["oZweihander", "oFire", "oShield"]); p5.disc = []; p5.inPlay = [];
    eq(p5.hand.length, G.HAND_SIZE, "Crystal Ball hand-size: opens at HAND_SIZE (3)");
    const cb5 = p5.hand.find((c) => c.key === "oCrystalBall"); p5.moxie = 99;
    G.playCard(r5, p5, cb5.id, "oFire");
    eq(p5.hand.length, G.HAND_SIZE, "…after playing Crystal Ball the hand is STILL HAND_SIZE — no permanent 4th card");
    ok(p5.hand.some((c) => c.key === "oFire"), "…and the tutored card is in hand (it TOOK the ball's slot, not an extra one)");
    for (let n = 0; n < 5; n++) { p5.moxie = 99; G.playCard(r5, p5, p5.hand[0].id); } // includes replaying a recycled Crystal Ball
    eq(p5.hand.length, G.HAND_SIZE, "…and repeated plays (incl. a recycled Crystal Ball) never accumulate extra slots"); }
  // MIRROR SHIELD: +3 shield, the NEXT attack that lands reflects its damage — exactly once
  { const { r, p, foe } = rig("rookie", { inv: ["oMirrorShield"], pHp: 100 });
    fire(r, p, 0);
    eq(p.shield, 3, "Mirror Shield: +3 shield");
    eq(p.mirrorShield, 1, "…and one armed mirror charge");
    ok(G.entityEffects(p).some((e) => e.icon === "🪞"), "…shown as a 🪞 effect chip while armed");
    const fh0 = foe.hp;
    G.foeHitLane(r, 0, 5, foe);                            // the foe swings 5 (3 eaten by shield, 2 to HP)
    eq(p.hp, 98, "…the hit still lands on the wearer (shield first)");
    eq(fh0 - foe.hp, 5, "…and the attacker takes the SAME 5 back");
    eq(p.mirrorShield, 0, "…the mirror is CONSUMED");
    const fh1 = foe.hp;
    G.foeHitLane(r, 0, 5, foe);
    eq(fh1 - foe.hp, 0, "…the SECOND attack reflects nothing (exactly once)");
    G.beginCombat(r);
    eq(p.mirrorShield ?? 0, 0, "…an unspent charge dies with the fight (per-fight reset)"); }
  // GRAND SPIRIT +50% (owner "buff grand spirit by 50%" 2026-07-09): HP ×1.5 on all three bodies,
  // Attacker/Caster damage ×1.5 on their EXCLUSIVE t* kits; the Tank's ward is the SHARED tEarthWard → unchanged.
  { eq(BODIES.grandAttacker.maxHp, 9, "Grand Spirit +50%: Attacker HP 6→9");
    eq(BODIES.grandCaster.maxHp, 6, "…Caster HP 4→6");
    eq(BODIES.grandTank.maxHp, 18, "…Tank HP 12→18");
    eq(KIT.tSpiritStrike.ops[0].amount, 6, "…Attacker damage (tSpiritStrike) 4→6");
    eq(KIT.tSpiritBolt.ops[0].amount, 3, "…Caster lane damage (tSpiritBolt) 2→3");
    eq(KIT.tEarthWard.ops[0].amount, 2, "…Tank ward (SHARED tEarthWard) UNCHANGED at 2 (would also buff earthElemental)"); }
  // GRAND SPIRIT: ⚡10, the play's pick chooses the body; no/invalid pick → the attacker default
  { eq(KIT.oGrandSpirit.cost, 10, "Grand Spirit costs 10 (owner's number)");
    const { r, p } = rig("rookie", { inv: ["oGrandSpirit", "oGrandSpirit", "oGrandSpirit", "oGrandSpirit"] });
    const next = () => p.hand.find((c) => c.key === "oGrandSpirit");
    p.moxie = 99; G.playCard(r, p, next().id, "tank");
    ok(r.allies[0].some((t) => t.bodyKey === "grandTank"), "Grand Spirit: pick 'tank' summons the Tank body");
    p.moxie = 99; G.playCard(r, p, next().id, "caster");
    ok(r.allies[0].some((t) => t.bodyKey === "grandCaster"), "…pick 'caster' summons the Caster");
    p.moxie = 99; G.playCard(r, p, next().id);
    ok(r.allies[0].some((t) => t.bodyKey === "grandAttacker"), "…NO pick defaults to the Attacker (flagged default)");
    p.moxie = 99; G.playCard(r, p, next().id, "banana");
    eq(r.allies[0].filter((t) => t.bodyKey === "grandAttacker").length, 2, "…an INVALID pick also falls back to the Attacker");
    ok(r.allies[0].every((t) => BODIES[t.bodyKey]?.summon), "…all Grand Spirit bodies are summon-class tokens (never adoptable)"); }
  // PICK CONTRACT: the snapshot descriptors carry `pick` exactly per the renderer spec
  { const d = G.cardDescriptor("oGrandSpirit");
    eq(d.pick?.kind, "summonBody", "descriptor: Grand Spirit ships pick.kind 'summonBody'");
    eq(d.pick?.options?.length, 3, "…with its three body options");
    ok(d.pick.options.every((o) => o.key && o.label && o.icon && BODIES[o.icon]), "…each option carries key + label + a real token bodyKey icon");
    eq(JSON.stringify(d.pick.options.map((o) => o.key)), JSON.stringify(["attacker", "caster", "tank"]), "…in the owner's order");
    eq(G.cardDescriptor("oCrystalBall").pick?.kind, "deckCard", "descriptor: Crystal Ball ships pick.kind 'deckCard'");
    ok(!("pick" in G.cardDescriptor("oSword")), "…ordinary cards carry NO pick field");
    const { r, p } = rig("rookie", { inv: ["oGrandSpirit"] });
    const hand = G.snapshot(r).players[0].hand;
    eq(hand.find((c) => c.key === "oGrandSpirit")?.pick?.kind, "summonBody", "…and the live HAND card carries the same pick descriptor");
    // MODAL buffs (owner 2026-07-09): Sharpened Edges + Demon Form ship pick.kind "meleeRanged"
    for (const key of ["oSharpEdges", "oDemonForm"]) {
      const md = G.cardDescriptor(key);
      eq(md.pick?.kind, "meleeRanged", `descriptor: ${key} ships pick.kind 'meleeRanged'`);
      eq(JSON.stringify(md.pick?.options?.map((o) => o.key)), JSON.stringify(["melee", "ranged"]), `…with the two options in order (${key})`);
    }
    const mh = G.snapshot(rig("rookie", { inv: ["oSharpEdges"] }).r).players[0].hand;
    eq(mh.find((c) => c.key === "oSharpEdges")?.pick?.kind, "meleeRanged", "…and the live HAND card carries the meleeRanged pick descriptor");
    ok(!("pick" in G.cardDescriptor("oSageMode")), "…repurposed Sage Mode (a plain heal now) carries NO pick"); }
  // FOE SYMMETRY: every batch-D card is castable BY A FOE without crashing (the symmetry pillar)
  { for (const key of ["oBlackHole", "oLionLance", "oCrystalBall", "oMirrorShield", "oGrandSpirit", "oGravityShield"]) {
      const { r, p } = rig("rookie");
      const gf = G.spawnEnemy("rookie", [key]); gf.lane = 0; r.lanes[0].push(gf);
      gf.moxie = 99;
      ok(G.foeCast(r, gf), `foe symmetry: a foe casts ${key} (no crash)`);
      if (key === "oBlackHole") { ok(G.hasBuff(p, "sap"), "…a foe Black Hole saps ITS lane's heroes"); eq(p.hp, 92, "…and its lane strike lands 8 on the lane's hero"); }
      if (key === "oGravityShield") { ok(gf.shield >= 6, "…a foe Gravity Greatshield shields itself (+6)"); ok(G.hasBuff(p, "sap"), "…and saps ITS OWN lane's heroes (owner 2026-07-09 lane-scope)"); }
      if (key === "oLionLance") eq(G.meleeBonusOf(gf), 1, "…a foe Lion Lance ramps ITS melee");
      if (key === "oMirrorShield") ok(gf.shield >= 3 && gf.mirrorShield === 1, "…a foe Mirror Shield arms ITS mirror");
      if (key === "oGrandSpirit") ok(r.lanes[0].some((t) => t.bodyKey === "grandAttacker"), "…a foe Grand Spirit summons the default Attacker on ITS side");
    }
    // a foe-armed mirror strikes the PLAYER back (full symmetry of the reflect)
    { const { r, p, foe } = rig("rookie", { foeHp: 1000, pHp: 100 });
      foe.mirrorShield = 1;
      const php0 = p.hp;
      G.damageEnemy(r, 0, foe, 6, p);
      eq(php0 - p.hp, 6, "foe symmetry: a mirrored foe reflects the player's own 6 back");
      eq(foe.mirrorShield, 0, "…and its mirror is consumed too"); } }
}

// ---- OWNER 2026-07-09: every PLAYER lane cast (damage AND debuff) reaches the back-line boss ----
// The boss sits BEHIND all lanes (in no lane array), so lane-target ops used to whiff past it.
// A 1-lane rig with a fat front foe AND a back-line boss (a plain body used purely as the boss wall —
// bossAlive keys only off room.boss.hp > 0, so no ward/stance/dmgReduce muddies the numbers).
{
  const laneBossRig = (inv) => {
    const { r, p, foe } = rig("rookie", { inv, foeHp: 1000 });
    const boss = G.spawnEnemy("cleric", []); boss.hp = boss.maxHp = 1000; boss.queue = [];
    r.boss = boss;                                       // behind the lane, in no lane array
    return { r, p, foe, boss };
  };
  // lane DAMAGE (Whip target:"lane") lands on the front lane foe AND the back-line boss
  { const { r, p, foe, boss } = laneBossRig(["oWhip"]);
    p.meleeBonus = 1;                                    // Whip = 2 + melee 1 = 3
    const fh = foe.hp, bh = boss.hp;
    fire(r, p, 0);
    eq(fh - foe.hp, 3, "lane damage hits the front lane foe (2+1)");
    eq(bh - boss.hp, 3, "…AND the back-line boss eats the same lane strike (owner 2026-07-09)"); }
  // lane DEBUFF (Gravity's selfLane sap) reaches the boss too — supersedes the 9e2a472 boss-exclusion
  { const { r, p, foe, boss } = laneBossRig(["oGravityShield"]);
    fire(r, p, 0);
    eq(p.shield, 6, "Gravity: +6 shield (unchanged)");
    ok(G.hasBuff(foe, "sap"), "…the caster's own-lane foe is sapped");
    ok(G.hasBuff(boss, "sap"), "…AND the back-line boss is sapped (owner 2026-07-09 supersedes the boss-exclusion)"); }
  // weakenLane — a PERMANENT lane debuff (negative counter) — reaches the boss
  { const { r, p, foe, boss } = laneBossRig([]);
    G.resolveOps(r, p, [{ do: "weakenLane", amount: 1 }]);
    eq(foe.counters, -1, "weakenLane: the lane foe gets a −1 counter");
    eq(boss.counters, -1, "…AND the back-line boss gets it too (lane debuff reaches the boss)"); }
  // Black Hole (pickLane) — damage AND sap — reach the boss when the aimed lane is the boss's
  { const { r, p, foe, boss } = laneBossRig(["oBlackHole"]);
    p.targetId = foe.id;                                 // aim the caster's own lane
    const bh = boss.hp;
    fire(r, p, 0);
    eq(bh - boss.hp, 8, "Black Hole: the aimed lane's back-line boss eats the 8 too");
    ok(G.hasBuff(boss, "sap"), "…and the boss is sapped with the rest of the lane"); }
  // NON-lane ops do NOT newly touch the boss: a FRONT strike stops at the lane's front foe
  { const { r, p, foe, boss } = laneBossRig(["oSword"]);
    const bh = boss.hp;
    fire(r, p, 0);
    ok(foe.hp < 1000, "front strike hits the front lane foe");
    eq(boss.hp, bh, "…and the back-line boss is UNTOUCHED by a FRONT (non-lane) strike"); }
  // NON-lane ops do NOT newly touch the boss: a single-target PICK aimed at a lane foe
  { const { r, p, foe, boss } = laneBossRig(["oFire"]);
    p.targetId = foe.id;
    const bh = boss.hp;
    fire(r, p, 0);
    ok(foe.hp < 1000, "pick strike hits the aimed lane foe");
    eq(boss.hp, bh, "…and a single-target PICK does not splash the boss"); }
}

// ---- OWNER 2026-07-09: Moonlight's LANE form fires BOTH melee AND ranged play-triggers ----
// Rent-Seeking Runeblade (pyramidRogue) wears BOTH: onPlayRanged → +1 melee, onPlayMelee → +1 ranged.
// So one play's trigger-kind is legible in the bonus deltas it leaves behind (bonuses read BEFORE the
// passive fires, so the +1s never retro-trip the 3+ lane gate).
{
  // FRONT form (bonuses < 3): melee-only → fires onPlayMelee (+1 ranged), NOT onPlayRanged (+0 melee)
  { const { r, p } = rig("pyramidRogue", { inv: ["oMoonGreat"], foeHp: 1000 });
    p.meleeBonus = 2; p.rangedBonus = 2;
    fire(r, p, 0);
    eq(p.meleeBonus, 2, "Moonlight FRONT form is melee-only: onPlayRanged does NOT fire (+0 melee)");
    eq(p.rangedBonus, 3, "…but onPlayMelee DOES fire (+1 ranged)"); }
  // LANE form (both bonuses ≥ 3): fires onPlayMelee AND onPlayRanged → BOTH bonuses tick +1
  { const { r, p } = rig("pyramidRogue", { inv: ["oMoonGreat"], foeHp: 1000 });
    p.meleeBonus = 3; p.rangedBonus = 3;
    fire(r, p, 0);
    eq(p.meleeBonus, 4, "Moonlight LANE form: onPlayRanged fires → +1 melee (owner 2026-07-09)");
    eq(p.rangedBonus, 4, "…AND onPlayMelee fires → +1 ranged (BOTH triggers from one lane strike)"); }
  // FOE SYMMETRY: a foe wearing the Runeblade casts Moonlight in lane form → both bonuses tick
  { const { r } = rig("rookie", { foeHp: 1000 });
    const gf = G.spawnEnemy("pyramidRogue", ["oMoonGreat"]); gf.lane = 0; r.lanes[0].push(gf);
    gf.moxie = 99; gf.meleeBonus = 3; gf.rangedBonus = 3;
    ok(G.foeCast(r, gf), "foe symmetry: a foe casts Moonlight (lane form)");
    eq(gf.meleeBonus, 4, "…onPlayRanged fires → +1 melee");
    eq(gf.rangedBonus, 4, "…AND onPlayMelee fires → +1 ranged (both triggers)"); }
  // FOE front form stays melee-only (symmetric with the hero side)
  { const { r } = rig("rookie", { foeHp: 1000 });
    const gf = G.spawnEnemy("pyramidRogue", ["oMoonGreat"]); gf.lane = 0; r.lanes[0].push(gf);
    gf.moxie = 99; gf.meleeBonus = 2; gf.rangedBonus = 2;
    ok(G.foeCast(r, gf), "foe front form casts");
    eq(gf.meleeBonus, 2, "…foe front form is melee-only: onPlayRanged does NOT fire");
    eq(gf.rangedBonus, 3, "…onPlayMelee fires (+1 ranged)"); }
}

// ---- OWNER 2026-07-09: the snapshot hand descriptor surfaces `bothKinds` (drives the client 🗡🎯 badge) ----
{
  const { r } = rig("rookie", { inv: ["oMoonGreat", "oRainblow", "oSword"] });
  const hand = G.snapshot(r).players[0].hand;
  const byKey = (k) => hand.find((c) => c.key === k);
  eq(byKey("oMoonGreat")?.bothKinds, true, "snapshot: Moonlight ships bothKinds:true (melee AND ranged)");
  eq(byKey("oRainblow")?.bothKinds, true, "…Rainblow too — its bothKinds op is nested inside a timer (recursed)");
  eq(byKey("oSword")?.bothKinds, false, "…an ordinary card ships bothKinds:false");
}

// ---- ELITE TIER: the named elites are tagged + 2 base ante; commons stay 1; draft excludes elites (2026-06-28)
{
  ok(Array.isArray(G.ELITE_SET) && G.ELITE_SET.length === 12, "12 elites (9 batch-B + Atlas + Wandering Castle + Stockbroking Sphinx, owner 2026-07-09)");
  ok(["killionaire","basilisk","fundjin","auditAngel","medusa","depressionDemon","bonelord","debtDragon","neptune","atlas","wanderCastle","sphinx"]
     .every((k) => G.ELITE_SET.includes(k)), "…the owner's named elite set");
  ok(G.ELITE_SET.every((k) => G.BODIES[k]?.elite === true), "every elite body is flagged elite:true");
  ok(G.ELITE_SET.every((k) => (G.BODIES[k]?.gold ?? 0) === 2), "every elite carries 2 base ante (gold 2)");
  ok(G.COMMON_SET.every((k) => (G.BODIES[k]?.gold ?? 0) === 1), "commons keep 1 base ante (gold 1)");
  ok(G.COMMON_SET.every((k) => !G.BODIES[k]?.elite), "no common is tagged elite");
  // the run-start DRAFT wheel is commons-only; foes include elites (incl. Atlas)
  ok(G.DRAFT_BODIES.every((k) => !G.BODIES[k]?.elite), "the draft wheel offers NO elites (you don't start as one)");
  ok(G.ELITE_SET.every((k) => !G.DRAFT_BODIES.includes(k)), "…not a single elite in the draft pool");
  // Atlas is no longer an orphan: spawnable, elite, and adoptable once felled
  ok(G.BODIES.atlas?.spawn === true && G.BODIES.atlas?.elite === true, "Atlas is now spawnable + elite (was an orphan)");
  // a big room rolls elites among its foes (probabilistic but a 40-budget room should surface ≥1 across tries)
  { const r = G.newRoom("ETIER"); r.telemOff = true; r.floor = 3; G.addPlayer(r, "p", "P");
    let sawElite = false;
    for (let t = 0; t < 60 && !sawElite; t++) {
      const foes = G.generateRoomFoes(r, 40, 3);
      if (foes.some((f) => G.BODIES[f.bodyKey]?.elite)) sawElite = true;
    }
    ok(sawElite, "elites DO appear among room foes (just heavier at 2 ante)");
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
    ok(!sawElite, "…and NO elite nodes are minted at all (elite rooms dissolved, ante v2 2026-07-02)");
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
    // each previewed foe ships its DECK (grouped gear cards) — total count == the foe's real gear length
    ok(prevNode.contents.every((c) => Array.isArray(c.deck)), "every previewed foe carries a `deck` array");
    prevNode.contents.forEach((c, i) => {
      const deckTotal = c.deck.reduce((s, d) => s + (d.count || 0), 0);
      eq(deckTotal, (real.foes[i].gear ?? []).length, "…the foe's deck totals its real gear count");
      ok(c.deck.every((d) => d.key && d.name && d.count > 0), "…each deck entry has key+name+count");
    });
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

// ---- ROOM PREVIEW CONTENTS carry item TEXT + foe PASSIVE (Feature A: hover/tap room tooltips) -----
{
  // The snapshot's per-room `contents` must ship each gear card's KIT description `text` and the
  // foe's readable `passive`, so the won/shop room cards (and map tooltips) can show the FULL detail
  // on hover (desktop) / tap (mobile) by reusing foeTipHtml — no invented copy, straight from KIT/BODIES.
  const r = G.newRoom("PV"); r.telemOff = true;
  r.level = G.buildLevel(1);
  const node = r.level.nodes.find((n) => n.type === "combat" || n.type === "elite");
  ok(node, "the floor has a combat/elite node to preview");
  // pin a known roster: knight carries an authored passive; blade×2 + fire exercise grouping + text
  node.foes = [{ bodyKey: "knight", gear: ["oDagger", "oDagger", "oFire"], level: 1 }];
  const snap = G.snapshot(r);
  const sn = (snap.map?.nodes || []).find((n) => n.id === node.id);
  ok(sn && Array.isArray(sn.contents) && sn.contents.length === 1, "the node previews its single pinned foe");
  const c = sn.contents[0];
  eq(c.passive, G.BODIES.knight.passiveText, "foe preview carries the body's readable passive string (from BODIES.passiveText)");
  const dagger = (c.deck || []).find((d) => d.key === "oDagger");
  const fire  = (c.deck || []).find((d) => d.key === "oFire");
  ok(dagger && fire, "the preview deck lists every distinct gear card");
  eq(dagger.count, 2, "duplicate gear is grouped with a count");
  eq(dagger.text, G.KIT.oDagger.text, "each preview deck item carries its KIT description text");
  eq(fire.text, G.KIT.oFire.text, "…for every distinct gear card (full descriptions, from KIT.text)");
}

// ---- CO-OP ROOM VOTE (owner 2026-06-28): the won-screen next-room choice is a per-SEAT vote ----
// Replaces first-click-wins: each HUMAN SEAT casts a changeable vote; when every seat locks in
// the most-voted room wins (ties random). SOLO (1 seat) resolves instantly so the owner's solo
// playtest + the screenshot/loop tools (send {advance}) behave exactly as before.
{
  // a deterministic won-screen board: start node v0 forks LEFT→v1, RIGHT→v2 (both leaves).
  function voteRig(seats, bots = []) {
    const r = G.newRoom("RV"); r.telemOff = true; r.floor = 1;
    const ps = seats.map((id) => G.addPlayer(r, id, id.toUpperCase()));
    for (const b of bots) G.addPlayer(r, b.id, b.id, { bot: true, owner: b.owner });
    r.phase = "won"; r.levelComplete = false;
    r.level = { currentId: "v0", nodes: [
      { id: "v0", type: "combat", cleared: false, x: 0.5, y: 0,   links: ["v1", "v2"] },
      { id: "v1", type: "combat", cleared: false, x: 0.3, y: 0.5, links: [] },
      { id: "v2", type: "combat", cleared: false, x: 0.7, y: 0.5, links: [] },
    ] };
    G.resetRoomVotes(r);
    return { r, ps };
  }

  // (a) SOLO — one vote/tap enters immediately (first-click-wins preserved for the solo playtest)
  { const { r } = voteRig(["s0"]);
    eq(G.humanSeats(r).length, 1, "vote: one human → one seat");
    ok(G.voteRoom(r, "s0", "v1"), "vote: solo vote resolves immediately (returns entered=true)");
    eq(r.level.currentId, "v1", "vote: …and the party is IN the voted room");
    ok(r.phase !== "won", "vote: …the won screen is gone (entered the next room)"); }

  // (a2) SOLO with a SQUAD — one human piloting a bot body is still ONE seat → instant resolve
  { const { r } = voteRig(["s0"], [{ id: "s0-b1", owner: "s0" }]);
    eq(G.humanSeats(r).length, 1, "vote: a human + its bot squad body = ONE seat (bodies aren't votes)");
    ok(G.voteRoom(r, "s0", "v2"), "vote: …so a solo squad vote still resolves instantly");
    eq(r.level.currentId, "v2", "vote: …into the room the human picked");
    ok(!G.voteRoom(r, "s0-b1", "v1"), "vote: a bot body is no seat — its vote is rejected"); }

  // (b) 2+ SEATS — votes DON'T enter until every seat locks in
  { const { r } = voteRig(["a", "b"]);
    ok(!G.voteRoom(r, "a", "v1"), "vote: 2 seats — a vote alone does NOT enter");
    eq(r.phase, "won", "vote: …still on the won screen");
    ok(!G.voteRoom(r, "b", "v1"), "vote: …a second seat's vote still doesn't enter");
    ok(!G.lockRoom(r, "a"), "vote: …one lock isn't enough");
    eq(r.phase, "won", "vote: …still waiting on the last seat");
    ok(G.lockRoom(r, "b"), "vote: …the LAST lock fires the tally + enter");
    eq(r.level.currentId, "v1", "vote: …both voted v1 → v1 wins"); }

  // (b2) a seat can't lock without a vote; an unlock un-commits before the last lock
  { const { r } = voteRig(["a", "b"]);
    ok(!G.lockRoom(r, "a"), "vote: no vote → can't lock");
    G.voteRoom(r, "a", "v1"); G.voteRoom(r, "b", "v2");
    G.lockRoom(r, "a"); G.unlockRoom(r, "a");
    ok(!G.lockRoom(r, "b"), "vote: b's lock after a UNLOCKED does not resolve (a no longer locked)");
    eq(r.phase, "won", "vote: …unlock kept the party on the won screen"); }

  // (c) MAJORITY wins: 3 seats, 2 for v2 → v2 enters when the third locks
  { const { r } = voteRig(["a", "b", "c"]);
    G.voteRoom(r, "a", "v1"); G.voteRoom(r, "b", "v2"); G.voteRoom(r, "c", "v2");
    G.lockRoom(r, "a"); G.lockRoom(r, "b");
    eq(r.phase, "won", "vote: 3-seat tally waits for all three locks");
    ok(G.lockRoom(r, "c"), "vote: …the last lock resolves");
    eq(r.level.currentId, "v2", "vote: …majority (2 of 3) for v2 wins"); }

  // (c2) changing a vote moves the tally: a flips v1→v2 → v2 is now unanimous
  { const { r } = voteRig(["a", "b"]);
    G.voteRoom(r, "a", "v1"); G.voteRoom(r, "b", "v2");
    G.voteRoom(r, "a", "v2");                          // a changes its mind (icon moves)
    G.lockRoom(r, "a"); ok(G.lockRoom(r, "b"), "vote: both locked");
    eq(r.level.currentId, "v2", "vote: …a's changed vote made v2 the winner"); }

  // (d) TIE → enters ONE of the tied rooms (random). 300 runs: every result is a tied room, and
  // BOTH tied rooms get chosen across runs (proves a random tie-break, not a fixed pick).
  { let allValid = true; const seen = new Set();
    for (let i = 0; i < 300; i++) {
      const { r } = voteRig(["a", "b"]);
      G.voteRoom(r, "a", "v1"); G.voteRoom(r, "b", "v2");
      G.lockRoom(r, "a"); G.lockRoom(r, "b");
      if (r.level.currentId !== "v1" && r.level.currentId !== "v2") allValid = false;
      seen.add(r.level.currentId);
    }
    ok(allValid, "vote: tie ALWAYS enters one of the two tied rooms (300 runs)");
    ok(seen.has("v1") && seen.has("v2"), "vote: …and the tie-break is RANDOM — both tied rooms chosen"); }

  // (e) the snapshot ships per-node voter badges + lock progress for the client to render
  { const { r } = voteRig(["a", "b"]);
    G.voteRoom(r, "a", "v1"); G.lockRoom(r, "a"); G.voteRoom(r, "b", "v2");
    const rv = G.snapshot(r).roomVotes;
    ok(rv && rv.seatCount === 2 && rv.lockedCount === 1, "vote: snapshot.roomVotes — 2 seats, 1 locked");
    ok(rv.byNode.v1?.[0]?.seat === "a" && rv.byNode.v1[0].locked, "vote: …v1 badge is seat a, locked");
    ok(rv.byNode.v2?.[0]?.seat === "b" && !rv.byNode.v2[0].locked, "vote: …v2 badge is seat b, unlocked"); }

  // (f) entering a fresh room wipes the votes (no stale carry into the next won screen)
  { const { r } = voteRig(["a", "b"]);
    G.voteRoom(r, "a", "v1"); G.voteRoom(r, "b", "v1");
    G.lockRoom(r, "a"); G.lockRoom(r, "b");            // resolves → enterRoom(v1) → resetRoomVotes
    eq(Object.keys(r.roomVotes).length, 0, "vote: entering the next room wipes roomVotes");
    eq(Object.keys(r.roomLocks).length, 0, "vote: …and the locks too"); }

  // (g) DEPARTED SEATS don't block the party (owner 2026-07-09, "dead lobby my friend left"): a
  // HUMAN seat flagged `gone` (socket dropped / held for reconnect) — or deleted outright (LEAVE) —
  // is dropped from every all-seats gate. BOTS always count; only absent HUMANS drop.

  // (g0) the presence predicate: a gone human drops; a connected human and ANY bot stay
  ok(!G.seatPresent({ bot: false, gone: true }), "leave: a gone HUMAN is not present (drops from gates)");
  ok(G.seatPresent({ bot: false }), "leave: a connected human is present");
  ok(G.seatPresent({ bot: true, gone: true }), "leave: a BOT is always present (never dropped, even if flagged)");
  ok(!G.seatPresent(undefined), "leave: a deleted (left) seat is not present");

  // (g1) won-screen vote: two seats, one locks, the OTHER departs → the remaining seat advances
  { const { r } = voteRig(["a", "b"]);
    G.voteRoom(r, "a", "v1"); G.voteRoom(r, "b", "v2"); G.lockRoom(r, "a");
    eq(r.phase, "won", "leave: two present seats — a's lone lock doesn't advance");
    r.players.get("b").gone = true;                   // Bob's socket dropped mid-vote (seat held, gone)
    eq(G.humanSeats(r).length, 1, "leave: a departed human is dropped from the vote seats");
    ok(G.lockRoom(r, "a"), "leave: …so the PRESENT seat's lock now resolves the vote");
    eq(r.level.currentId, "v1", "leave: …into the room the present seat chose (departed vote ignored)"); }

  // (g2) if the departed seat was the LAST holdout, a gate reflow advances immediately (server calls
  // maybeResolveRoomVote on disconnect) — the present, already-locked seat no longer waits on a ghost
  { const { r } = voteRig(["a", "b"]);
    G.voteRoom(r, "a", "v1"); G.lockRoom(r, "a");      // a locked, waiting on b
    eq(r.phase, "won", "leave: still waiting while both seats are present");
    r.players.get("b").gone = true;                   // b departs without ever voting/locking
    ok(G.maybeResolveRoomVote(r), "leave: reflow after departure resolves with the present seat alone");
    ok(r.phase !== "won", "leave: …the party left the won screen"); }

  // (g3) a fully-LEFT seat (deleted) unblocks too — and its stale vote can't decide the room
  { const { r } = voteRig(["a", "b"]);
    G.voteRoom(r, "a", "v1"); G.voteRoom(r, "b", "v2"); G.lockRoom(r, "b");  // b prefers v2 and locked
    r.players.delete("b");                             // b LEFT — the seat is erased
    eq(G.humanSeats(r).length, 1, "leave: the left seat is gone from the vote");
    ok(G.lockRoom(r, "a"), "leave: the last present seat locks → resolves");
    eq(r.level.currentId, "v1", "leave: …a's vote wins — the departed seat's v2 is not tallied"); }

  // (g4) DRAFT: a departed human doesn't stall draftComplete; an undrafted BOT still gates it
  { const r = G.newRoom("LVD"); r.telemOff = true;
    const h = G.addPlayer(r, "h", "Host"); h.drafted = true;
    const bot = G.addPlayer(r, "h-b1", "Host #2", { bot: true, owner: "h" }); bot.drafted = false;
    const ghost = G.addPlayer(r, "g", "Ghost"); ghost.drafted = false; ghost.gone = true;  // departed mid-draft
    ok(!G.draftComplete(r), "leave: an undrafted BOT keeps the draft gate closed (bots still count)…");
    bot.drafted = true;
    ok(G.draftComplete(r), "leave: …and the departed human never blocked it — the drafted party proceeds"); }
}

// ---- TIMER effect chip (owner 2026-06-29): Pet Leech / Animated Blade are lasting drains/strikes on the
// CASTER; entityEffects must surface them as a chip (it skipped c.timers before, so they showed nothing).
{
  const leech = G.entityEffects({ timers: [{ ops: [{ do: "deal", amount: 1, target: "pick", lifesteal: true }], period: 60, charge: 0 }] });
  ok(leech.some((e) => e.icon === "🩸" && /Drain — 1 dmg \+ heal 1 every 6s/.test(e.label)), "timer chip: Pet Leech (lifesteal) shows a 🩸 drain chip");
  const blade = G.entityEffects({ timers: [{ ops: [{ do: "deal", amount: 1, target: "front" }], period: 60, charge: 0 }] });
  ok(blade.some((e) => e.icon === "⏱" && /Strike — 1 dmg every 6s/.test(e.label)), "timer chip: Animated Blade (no lifesteal) shows a ⏱ strike chip");
  eq(G.entityEffects({}).length, 0, "timer chip: an entity with no timers/buffs has no chips");
}

// ===========================================================================
// [CARD_GCD] R3 (EXPERIMENTAL, owner-tunable) — a per-actor GLOBAL COOLDOWN between card plays: after a
// successful play the actor is gated for CARD_GCD ticks (= 1s), applied to players, foes, AND summons.
// This block re-enables the LIVE cooldown (the rest of the suite runs it neutralized) to prove the gate.
// Each test freezes BOTH sides during the tick window so the ONLY thing that moves is the top-of-tick
// cooldown decrement (no auto-recast muddies the recovery assertion — freeze doesn't gate the manual
// play/cast calls, which never check freeze).
// ===========================================================================
G.setCardGcd(G.CARD_GCD);   // run these three tests with the REAL global cooldown
{
  // PLAYER: a successful play arms the cooldown, blocks an immediate replay, then clears after CARD_GCD ticks.
  const { r, p } = rig("rookie", { inv: ["oSharpEdges"] });   // a self-buff card (no target needed), non-lasting → recycles back into hand
  const id = () => p.hand.find((c) => c.key === "oSharpEdges").id;
  ok(G.playCard(r, p, id()), "[CARD_GCD] player's first play succeeds");
  ok((p.cardCd ?? 0) > 0, "[CARD_GCD] …which arms the player's global cooldown (cardCd > 0)");
  ok(!G.playCard(r, p, id()), "[CARD_GCD] …so the player CANNOT immediately play again (gated)");
  r.freezeFoes = G.CARD_GCD + 1; r.freezeHeroes = G.CARD_GCD + 1;   // isolate the decrement from any auto-play
  for (let t = 0; t < G.CARD_GCD; t++) G.simulateTick(r);
  eq(p.cardCd ?? 0, 0, "[CARD_GCD] …cardCd decrements to 0 over exactly CARD_GCD ticks");
  ok(G.playCard(r, p, id()), "[CARD_GCD] …and now the player can play again");
}
{
  // FOE: symmetric gate on foeCast.
  const { r, foe } = rig("rookie");   // rig's live player keeps the room in "playing" the whole window
  foe.queue = G.mintCards(["oSharpEdges", "oSharpEdges"]); foe.moxie = 99;
  ok(G.foeCast(r, foe), "[CARD_GCD] foe's first cast succeeds");
  ok((foe.cardCd ?? 0) > 0, "[CARD_GCD] …which arms the foe's global cooldown");
  ok(!G.foeCast(r, foe), "[CARD_GCD] …so the foe CANNOT immediately cast again (gated)");
  r.freezeFoes = G.CARD_GCD + 1; r.freezeHeroes = G.CARD_GCD + 1;
  for (let t = 0; t < G.CARD_GCD; t++) G.simulateTick(r);
  eq(foe.cardCd ?? 0, 0, "[CARD_GCD] …cardCd decrements to 0 over exactly CARD_GCD ticks");
  ok(G.foeCast(r, foe), "[CARD_GCD] …and now the foe can cast again");
}
{
  // SUMMON: an ally token casts through foeCast too, so the same gate applies.
  const { r, foe } = rig("rookie", { foeHp: 1000 });
  const rat = allyToken(r, "rat");   // a rat token: its innate queue holds Bite
  rat.moxie = 99;                    // fund the cast (Bite costs moxie)
  ok(G.foeCast(r, rat), "[CARD_GCD] summon's first cast succeeds");
  ok((rat.cardCd ?? 0) > 0, "[CARD_GCD] …which arms the summon's global cooldown");
  ok(!G.foeCast(r, rat), "[CARD_GCD] …so the summon CANNOT immediately cast again (gated)");
  r.freezeFoes = G.CARD_GCD + 1; r.freezeHeroes = G.CARD_GCD + 1;
  for (let t = 0; t < G.CARD_GCD; t++) G.simulateTick(r);
  eq(rat.cardCd ?? 0, 0, "[CARD_GCD] …cardCd decrements to 0 over exactly CARD_GCD ticks");
  ok(G.foeCast(r, rat), "[CARD_GCD] …and now the summon can cast again");
}
G.setCardGcd(0);   // restore the suite-wide neutralized state (defensive — nothing runs after)

console.log(fail ? `\n❌ FAILURES — ${pass} passed, ${fail} failed.` : `\n✅ ALL PASS — ${pass} passed, 0 failed.`);
if (fail) process.exit(1);
