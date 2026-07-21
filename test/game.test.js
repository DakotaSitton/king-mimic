// Deterministic unit tests for King Mimic — THE FIRST SET (SLICE_SPEC_V2.md).
// No server, no timing. Run: bun run test/game.test.js
import * as G from "../game.js";
const { KIT, BODIES } = G;

G.setHpMult(1); // canonical 1× HP for mechanic numbers (live/fuzz/e2e run the 2× tuning)
G.setCdMult(1); // canonical 1× cooldowns for timing assertions (live runs the 2× playtest slow-down)

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("❌ " + label); } };
const eq = (a, b, label) => ok(a === b, `${label} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const draftOffers = (room, player) => (room.draftWheel ?? []).filter((b) => b.offeredTo === (typeof player === "string" ? player : player.id));
// Live-path draft: lock the first wheel bundle offered to this player — the exact draftPick server
// route. Replaces the deleted legacy chooseClass scaffolding (owner-approved 2026-07-19).
const draftBody = (room, player) => {
  const b = draftOffers(room, player)[0];
  if (b) G.draftPick(room, player, b.id);
  return b;
};

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
  eq(G.SET_COMMONS.length, 22, "SET_COMMONS includes the new common Moneymancer while elites stay out of the draft wheel");
  ok(G.SET_COMMONS.every((k) => BODIES[k]?.gold === 1), "every common body is one flat entry, gold 1 (elites are gold 2)");
  ok(G.SET_COMMONS.every((k) => !BODIES[k + "U"] && !BODIES[k + "R"]), "NO U/R variants exist — power comes from items, not tiers");
  ok(Object.values(KIT).every((i) => i.rarity === undefined), "items carry NO rarity class — only individual gold values");
  eq(G.PLAYER_POOL.length, 114, "114 cards are live after the owner expansion");
  ok(!KIT.oWizardHat && !G.PLAYER_POOL.includes("oWizardHat"), "Wizard Hat is gone (merged into modal Sharpened Edges, owner 2026-07-09)");
  ok(KIT.oBlizzard && G.PLAYER_POOL.includes("oBlizzard"), "Blizzard is in KIT and the pool (owner 2026-07-09)");
  ok(KIT.dBloodIron && !G.ARCHIVED_PLAYER_CARDS.includes("dBloodIron") && G.PLAYER_POOL.includes("dBloodIron"),
    "Blood To Iron is restored to the canonical normal-offer pool");
  ok(KIT.oCrystalBall && G.ARCHIVED_PLAYER_CARDS.includes("oCrystalBall") && !G.PLAYER_POOL.includes("oCrystalBall"),
    "Crystal Ball remains defined at V4/C4 but is archived from normal offers");
  const random = Math.random;
  try {
    Math.random = () => 0;
    ok(G.DRAFT_BODIES.every((bodyKey) => G.rollKit(bodyKey).every((key) => G.PLAYER_POOL.includes(key))),
      "ordinary draft starter offers stay inside the live player pool");
    ok(G.rollShopWares().every(({ key }) => G.PLAYER_POOL.includes(key)),
      "ordinary shop offers stay inside the live player pool");
  } finally { Math.random = random; }
  const tierEntries = Object.entries(G.TEMP_CARD_VALUE_TIERS).flatMap(([value, keys]) =>
    keys.map((key) => ({ key, value: Number(value) })));
  eq(tierEntries.length, G.PLAYER_POOL.length, "temporary value tiers list every owner card exactly once");
  eq(new Set(tierEntries.map(({ key }) => key)).size, G.PLAYER_POOL.length, "temporary value tiers contain no duplicate cards");
  ok(G.PLAYER_POOL.every((k) => KIT[k] && Number.isInteger(G.itemTreasure(k)) && G.itemTreasure(k) >= 1 && G.itemTreasure(k) <= 5), "every owner card exists in KIT and has an integer value from 1 through 5");
  ok(G.PLAYER_POOL.every((k) => tierEntries.some((t) => t.key === k && t.value === G.itemTreasure(k))), "temporary tiers cover PLAYER_POOL with matching live values");
  eq(G.TEMP_CARD_VALUE_TIERS[1].length, 35, "value tier 1 has 35 active cards");
  eq(G.TEMP_CARD_VALUE_TIERS[2].length, 29, "temporary tier 2 has 29 cards");
  eq(G.TEMP_CARD_VALUE_TIERS[3].length, 29, "temporary tier 3 has 29 cards");
  eq(G.TEMP_CARD_VALUE_TIERS[4].length, 15, "temporary tier 4 has 15 cards");
  eq(G.TEMP_CARD_VALUE_TIERS[5].length, 6, "temporary best tier has 6 value-5 cards");
  eq(G.STARTER_CARD_POOL.length, 35, "starter pool contains exactly the 35 V1 cards");
  eq(new Set(G.STARTER_CARD_POOL).size, G.STARTER_CARD_POOL.length, "starter pool has no duplicate cards");
  ok(G.TEMP_CARD_VALUE_TIERS[1].every((key) => G.STARTER_CARD_POOL.includes(key)), "starter pool exactly covers every V1 card");
  ok(G.STARTER_CARD_POOL.every((k) => KIT[k].ante === 1), "no V2+ card leaks into the starter pool");
  ok(!G.STARTER_CARD_POOL.includes("dShieldBash") && !G.STARTER_CARD_POOL.includes("oBlizzard"),
    "V2 Shield Bash and V3 Blizzard stay out of the V1 starter pool");
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

// ---- W2-B special shields: per-shield DAMAGE MODIFIERS (owner 2026-07-10) -------------------
// A shield segment carries a modifier so incoming damage against THAT shield is transformed:
// Punishment Glutton drains 2× as fast.
{
  // Punishment Glutton — "Gain 10 shield, this shield takes double damage." A 3-hit drains 6 shield.
  const { r, p } = rig("rookie", { inv: ["oPunishGlutton"] });
  fire(r, p, 0);
  eq(p.shield, 10, "Punishment Glutton grants a 10-point shield");
  const hp0 = p.hp;
  G.damagePlayer(r, p, 3);
  eq(p.shield, 4, "…a 3-damage hit removes 6 from the double-damage shield (10→4)");
  eq(p.hp, hp0, "…and no damage reaches HP (the shield covered the whole hit)");
}

// ---- SWORDS OF REVEALING LIGHT — REDESIGN (OWNER RULINGS 2026-07-11) --------------------------
// "It turns every hit against it into 1… its own buff, cost 7." + addendum: COUNT-based — the NEXT
// 3 instances of incoming damage each become exactly 1 (no time limit), then it's spent; castable
// ONCE PER FIGHT like every other permanent buff (lasting + the Giant's-Belt applied-flag guard).
{
  eq(KIT.oRevealLight.cost, 7, "Swords of Revealing Light costs 7 (owner 2026-07-11)");
  ok(KIT.oRevealLight.ops.every((o) => o.do !== "shield"), "…it grants NO shield anymore (the cap1 segment design is retired)");
  ok(KIT.oRevealLight.lasting === true, "…and is a LASTING cast — the permanent-buff once-per-fight grammar (leaves the deck for the fight)");
  const { r, p, foe } = rig("rookie", { inv: ["oRevealLight"], pHp: 100 });
  fire(r, p, 0);
  eq(p.revealLight, 3, "casting it arms 3 hit-conversion charges on the caster");
  ok((p.inPlay ?? []).some((c) => c.key === "oRevealLight"), "…the card sits IN PLAY for the fight (can't be recast — once per fight)");
  { const chip = G.entityEffects(p).find((e) => e.icon === "🌟");
    ok(chip && /Revealing Light/.test(chip.label) && chip.n === 3 && chip.left == null,
       "…the chip shows icon + name + REMAINING COUNT (n=3), no countdown ring"); }
  G.damagePlayer(r, p, 10);
  eq(p.hp, 99, "…hit 1: a 10-damage hit lands as EXACTLY 1");
  eq(p.revealLight, 2, "…one charge spent (3→2), and the chip count follows");
  G.damagePlayer(r, p, 3);
  eq(p.hp, 98, "…hit 2: a 3-damage hit lands as exactly 1 too");
  for (let t = 0; t < 500; t++) G.tickBuffs(p);
  eq(p.revealLight, 1, "…charges do NOT time out (count-based, no time limit — 50s pass, 1 charge left)");
  p.shield = 2;
  G.damagePlayer(r, p, 10);
  ok(p.shield === 1 && p.hp === 98 && p.revealLight === 0, "…hit 3: the converted 1 hits the SHIELD first (cap before absorption — FLAG ordering), last charge spent");
  G.damagePlayer(r, p, 5);
  ok(p.hp === 94 && p.shield === 0, "…hit 4: the charges are SPENT — the full 5 lands (1 shield + 4 HP)");
  // ONCE PER FIGHT: a second application this fight is a no-op (the Giant's Belt guard grammar)
  G.resolveOps(r, p, KIT.oRevealLight.ops);
  eq(p.revealLight, 0, "…a second cast the same fight is a NO-OP (once per fight — can't re-arm spent charges)");
  G.beginCombat(r);
  eq(p.revealLight ?? 0, 0, "…and beginCombat resets the state cleanly for the NEXT fight (guard + charges are per-fight)");
  // PIERCE bypasses the cap AND consumes no charge
  { const { r: r2, p: p2 } = rig("rookie", { inv: ["oRevealLight"], pHp: 100 });
    fire(r2, p2, 0);
    G.damagePlayer(r2, p2, 6, { pierce: true });
    eq(p2.hp, 94, "PIERCE bypasses the cap like every defensive effect (full 6 lands)");
    eq(p2.revealLight, 3, "…and consumes NO charge");
    G.addBuff(p2, "stoneskin", 5, 80);
    G.damagePlayer(r2, p2, 4);
    ok(p2.hp === 94 && p2.revealLight === 3, "…a hit other mitigation already ZEROES stays 0 and consumes no charge");
    G.damagePlayer(r2, p2, 9);
    ok(p2.hp === 93 && p2.revealLight === 2, "…a hit that survives stoneskin (9−5=4) is converted to 1 (cap runs LAST)"); }
  // foe-side symmetry: a foe casting Swords arms ITS OWN charges
  { const { r: r4, p: p4, foe: f4 } = rig("rookie", { foeHp: 1000 });
    f4.side = "foe"; f4.lane = 0;
    G.resolveOps(r4, f4, KIT.oRevealLight.ops);
    eq(f4.revealLight, 3, "foe symmetry: a foe-cast Swords arms the FOE's 3 charges");
    const fh = f4.hp;
    G.damageEnemy(r4, 0, f4, 12, p4);
    eq(fh - f4.hp, 1, "…and the player's 12-damage hit lands on it as exactly 1");
    eq(f4.revealLight, 2, "…spending one of ITS charges");
    G.resolveOps(r4, f4, KIT.oRevealLight.ops);
    eq(f4.revealLight, 2, "…a foe's second cast is a no-op too (same once-per-fight guard)"); }
  // ally-target grammar (the defensive-cast grammar): a pinned teammate receives the charges
  { const { r: r3, p: p3 } = rig("rookie", { inv: ["oRevealLight"] });
    const mate = G.addPlayer(r3, "m", "M"); G.wearBody(mate, "rookie"); mate.lane = 0; mate.maxHp = mate.hp = 50; mate.alive = true;
    p3.allyTargetId = "m";
    fire(r3, p3, 0);
    ok(mate.revealLight === 3 && !(p3.revealLight > 0),
       "cast with an ally-target the charges land on the TEAMMATE (same grammar as Stone Skin/Haste)");
    G.damagePlayer(r3, mate, 8);
    eq(mate.hp, 49, "…and the teammate's incoming 8 becomes 1"); }
}

// ---- PET LEECH — REWORK (OWNER RULINGS 2026-07-11) --------------------------------------------
// ⚡2; a DEBUFF attached to the aimed foe (NOT a caster buff): every 6s the carrier takes
// 1 + the caster's ranged bonus and the caster heals the same; dies with the carrier / at fight end;
// REUSABLE — and same-foe casts STACK
// (owner-stated: two leeches = 2 dmg / 2 heal per tick). Chip renders on the CARRIER with the count.
{
  eq(KIT.oPetLeech.cost, 2, "Pet Leech costs 2 (owner 2026-07-11)");
  ok(!KIT.oPetLeech.lasting, "…and is NOT a lasting caster buff anymore (a reusable foe debuff)");
  const { r, p, foe } = rig("rookie", { inv: ["oPetLeech"], foeHp: 100, pHp: 100 });
  p.hp = 50;
  fire(r, p, 0);
  eq((foe.leeches ?? []).length, 1, "casting attaches ONE leech to the aimed foe");
  eq(foe.leeches[0].sourceCard, "oPetLeech", "…the clock retains Pet Leech's card identity for its effect token");
  eq((p.timers ?? []).length, 0, "…and installs NOTHING on the caster (the drain lives on the foe)");
  { const chip = G.entityEffects(foe).find((e) => e.icon === "🪱");
    ok(chip && chip.cardKey === "oPetLeech" && /Leeched/.test(chip.label) && /1/.test(chip.label), "…the FOE shows the leech chip with Pet Leech's card token + magnitude"); }
  for (let t = 0; t < 59; t++) G.tickLeeches(r, foe, 0);
  ok(foe.hp === 100 && p.hp === 50, "…nothing before 6s");
  G.tickLeeches(r, foe, 0);
  eq(foe.hp, 99, "…at 6s the CARRIER takes 1");
  eq(p.hp, 51, "…and the CASTER heals 1");
  // REUSABLE + STACKING (owner-stated): a recast attaches ANOTHER leech; two leeches = 2/2 per tick
  const c2 = p.hand.find((c) => c.key === "oPetLeech"); p.moxie = 99;
  ok(G.playCard(r, p, c2.id), "…the card RECYCLES and recasts the same fight (no once-per-fight grammar)");
  eq((foe.leeches ?? []).length, 2, "…the recast attaches a SECOND leech to the same foe (stacks — owner design)");
  eq(G.entityEffects(foe).find((e) => e.icon === "🪱")?.n, 2, "…and the carrier's chip shows the stack count (×2)");
  for (let t = 0; t < 60; t++) G.tickLeeches(r, foe, 0);
  eq(foe.hp, 97, "…two stacked leeches drain 2 per 6s window");
  eq(p.hp, 53, "…and heal the caster 2");
  // OWNER 2026-07-16: snapshot the ranged bonus into BOTH sides of the drain.
  { const { r: rr, p: pr, foe: fr } = rig("rookie", { inv: ["oPetLeech"], foeHp: 100, pHp: 100 });
    pr.hp = 50; pr.rangedBonus = 3; fire(rr, pr, 0);
    eq(fr.leeches[0].amount, 4, "Pet Leech snapshots base 1 + ranged bonus 3 onto the foe");
    for (let t = 0; t < 60; t++) G.tickLeeches(rr, fr, 0);
    eq(fr.hp, 96, "…the ranged bonus lifts the periodic damage to 4");
    eq(pr.hp, 54, "…and lifts the paired heal to the same 4");
    ok(/takes 4 .* leecher 4/.test(G.entityEffects(fr).find((e) => e.icon === "🪱")?.label ?? ""),
      "…the carrier chip reports the scaled damage/heal truth"); }
  // If the first simultaneously-due leech kills its carrier, later records die with that carrier.
  { const { r: rk, p: pk, foe: fk } = rig("rookie", { foeHp: 1, pHp: 100 });
    pk.hp = 50;
    fk.leeches = [
      { src: pk, amount: 1, period: 1, charge: 0 },
      { src: pk, amount: 1, period: 1, charge: 0 },
    ];
    G.tickLeeches(rk, fk, 0);
    ok(fk.hp === 0 && pk.hp === 51 && rk.defeated.foe === 1,
      "a lethal first leech ends the carrier's stack: one death, one heal, no corpse re-tick"); }
  // foe symmetry: a foe's Pet Leech rides the HERO and heals the foe caster on the clock
  { const { r: r2, p: p2 } = rig("rookie", { pHp: 100 });
    const gf = G.spawnEnemy("rookie", ["oPetLeech"]); gf.lane = 0; gf.hp = 5; gf.maxHp = 20; r2.lanes[0].push(gf); gf.moxie = 99;
    ok(G.foeCast(r2, gf), "foe symmetry: a foe casts Pet Leech");
    eq((p2.leeches ?? []).length, 1, "…the HERO carries the leech (a debuff on the foe's aim)");
    for (let t = 0; t < 60; t++) G.tickLeeches(r2, p2, 0);
    eq(p2.hp, 99, "…the hero takes 1 at 6s");
    eq(gf.hp, 6, "…and the foe caster heals 1");
    G.beginCombat(r2);
    eq((p2.leeches ?? []).length, 0, "…a hero-riding leech dies at fight end (per-fight reset)"); }
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

// ---- OWNER BATCH (2026-06-25): meleeBonus/rangedBonus grants, the new regen kinds, the
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
  // OWNER RULING 2026-07-11: Sharpened Edges ⚡2, sitting UNDER Power Up ⚡3
  eq(KIT.oSharpEdges.cost, 2, "Sharpened Edges costs 2 (owner 2026-07-11)");
  eq(KIT.oPowerUp.cost, 3, "Power Up costs 3 (owner 2026-07-11) — above Sharpened Edges");
  // NO pick (a bot / garbage pick) on a flex body → the melee default (safety net, never a crash)
  { const { r, p } = rig("rookie", { inv: ["oSharpEdges"] });
    fire(r, p, 0);   // fire() sends NO pick
    eq(p.meleeBonus, 1, "Sharpened Edges with NO pick defaults to melee (flex/bot safety net)");
    eq(p.rangedBonus ?? 0, 0, "…nothing on ranged"); }
  // FOE auto-pick (owner 2026-07-11 "the foe chooses intelligently"): by its own KIT/BONUSES first
  // (whichever kind its queue cards + current melee/ranged bonuses favor), tie → body archetype.
  { const modalFoe = (body, keys) => { const r = G.newRoom("T"); r.phase = "playing"; r.laneCount = 1; r.allies = [[]];
      const f = G.spawnEnemy(body, []); f.lane = 0; f.side = "foe"; f.queue = G.mintCards(keys); f.moxie = 99; r.lanes = [[f]];
      G.foeCast(r, f); return f; };
    // bare kit (the SE alone is untyped) → tie → BODY-archetype fallback, the pre-ruling behavior
    const mel = modalFoe("bloodfund", ["oSharpEdges"]);
    eq(mel.meleeBonus ?? 0, 1, "foe Sharpened Edges: a bare-kit MELEE-archetype body auto-picks melee (tie → affinity)");
    eq(mel.rangedBonus ?? 0, 0, "…and not ranged");
    const rng = modalFoe("ratBaron", ["oSharpEdges"]);
    eq(rng.rangedBonus ?? 0, 1, "foe Sharpened Edges: a bare-kit RANGED-archetype body auto-picks ranged");
    eq(rng.meleeBonus ?? 0, 0, "…and not melee");
    const flx = modalFoe("counterparty", ["oSharpEdges"]);
    eq(flx.meleeBonus ?? 0, 1, "foe Sharpened Edges: a bare-kit FLEX body takes the melee default (FLAG)");
    // KIT-DRIVEN pick (FLAG heuristic): a ranged-archetype body holding a MELEE-heavy kit buffs MELEE
    const kitMel = modalFoe("ratBaron", ["oSharpEdges", "oSword", "oZweihander"]);
    eq(kitMel.meleeBonus ?? 0, 1, "foe SE picks by its KIT: melee-heavy queue → melee, even on a ranged-archetype body");
    // …and a melee-archetype body holding a RANGED-heavy kit buffs RANGED
    const kitRng = modalFoe("bloodfund", ["oSharpEdges", "oFire", "oArcane"]);
    eq(kitRng.rangedBonus ?? 0, 1, "foe SE picks by its KIT: ranged-heavy queue → ranged, even on a melee-archetype body");
    // …and a stacked BONUS outweighs a balanced kit (keep feeding the kind that's already ramped)
    { const r = G.newRoom("T"); r.phase = "playing"; r.laneCount = 1; r.allies = [[]];
      const f = G.spawnEnemy("bloodfund", []); f.lane = 0; f.side = "foe"; f.queue = G.mintCards(["oSharpEdges"]); f.moxie = 99; f.rangedBonus = 3; r.lanes = [[f]];
      G.foeCast(r, f);
      eq(f.rangedBonus, 4, "foe SE picks by its BONUSES: an already-ramped ranged bonus attracts the buff (3→4)"); } }
  // Moxie Pool: regen kind "moxie" banks +2 every 60 ticks (capped).
  { const { r, p } = rig("rookie", { inv: ["oMoxiePool"] });
    p.autoFire = false; fire(r, p, 0); p.moxie = 0; p.moxieClock = 0;
    for (let t = 0; t < 60; t++) G.tickRegens(p);     // 6 seconds of regen-only ticks
    eq(p.moxie, 2, "Moxie Pool banks +2 moxie every 6s (regen kind moxie)"); }
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
  // Demon Form SELF-DAMAGE TICK (owner ruling 2026-07-10): the every-6s tick hits the CASTER (selfHit →
  // selfDamage), touching NO foe — so the card stays TYPELESS. tickTimers drives it; 60 ticks = one 6s period.
  { const { r, p, foe } = rig("rookie", { inv: ["oDemonForm"], foeHp: 50 });
    const c = p.hand.find((x) => x.key === "oDemonForm"); G.playCard(r, p, c.id, "melee");
    p.shield = 0; const ph0 = p.hp, fh0 = foe.hp;
    eq(p.hp, ph0, "Demon Form's self-damage tick does NOT fire on cast (it's periodic)");
    for (let t = 0; t < 60; t++) G.tickTimers(r, p, 0);
    eq(p.hp, ph0 - 1, "Demon Form: the CASTER takes 1 every 6 seconds (self-damage)");
    eq(foe.hp, fh0, "…and NO foe is touched (typeless self-damage, not a foe hit)");
    for (let t = 0; t < 60; t++) G.tickTimers(r, p, 0);
    eq(p.hp, ph0 - 2, "…and 1 more the next 6s period"); }
  // …and because the tick touches no foe, Demon Form STAYS typeless (owner ruling 2026-07-10): triggerKind
  // 'none', isRanged false — no 🎯, no ranged play-triggers, no Lizard-Wizard ranged pricing.
  { eq(G.triggerKind("oDemonForm"), "none", "Demon Form stays triggerKind 'none' (typeless — self-damage tick touches no foe)");
    ok(!G.isRanged("oDemonForm"), "…and isRanged false (it touches no foe)");
    ok(G.itemFitsArchetype("bloodfund", "oDemonForm"), "…and a MELEE body still fits it (untyped util)"); }
  // Sage Mode: every 6s heal 1 and gain +1 to the chosen damage kind.
  { eq(G.KIT.oSageMode.cost, 4, "Sage Mode costs 4 (owner ruling 2026-07-10: +1 TOTAL over pre-R2 = just R2's global +1)");
    const { r, p } = rig("rookie", { inv: ["oSageMode"], pHp: 20 });
    p.hp = 10; fire(r, p, 0);
    for (let t = 0; t < 60; t++) G.tickRegens(p);
    eq(p.hp, 11, "Sage Mode heals 1 every 6s");
    eq(p.meleeBonus ?? 0, 1, "…and defaults to +1 melee when no explicit pick is supplied"); }
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
  { const { r, p } = rig("rookie", { inv: ["oBerserker", "oJesterplate"], pHp: 100 });
    fire(r, p, 0); fire(r, p, 1); p.moxie = 0; const hp0 = p.hp;
    for (let t = 0; t < 60; t++) G.tickRegens(p, r);  // one berserk period: +1 shield, then the self-hit (shield eats it)
    eq(p.hp, hp0, "Berserker's self-hit is absorbed by its own +1 shield (no HP lost)");
    eq(p.moxie, 1, "…yet the self-hit fires Jesterplate (+1 moxie)"); }
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
  // A foe Blizzard is lane-wide Ice: each target is sapped by its own post-mitigation hit.
  { const { r, p } = rig("rookie", { inv: ["oHatchet"] });
    p.moxie = 9;
    G.addBuff(p, "stoneskin", 1, 80);
    const guard = allyToken(r, "knight", 0); guard.hp = guard.maxHp = 20;
    const foe = G.spawnEnemy("cleric", []); foe.hp = foe.maxHp = 1000; foe.side = "foe"; foe.lane = 0;
    r.lanes[0] = [foe];
    G.resolveOps(r, foe, KIT.oBlizzard.ops);
    eq(p.moxie, 9, "a foe Blizzard no longer drains moxie");
    eq(G.buffAmt(p, "sap"), 1, "the doubly protected hero is sapped by its own 1-damage hit");
    eq(G.buffAmt(guard, "sap"), 3, "the unprotected summon is sapped by its own 3-damage hit"); }
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
  eq(KIT.oDagger.cost, 2, "Dagger costs 2 moxie regardless of who casts it (cost +1 sweep, owner 2026-07-10)");
  eq(KIT.oSword.cost, 3, "Sword costs 3 moxie regardless of who casts it (cost +1 sweep, owner 2026-07-10)");
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

// ---- HEAL-AIM A SUMMON (owner 2026-07-10 ruling: "summons should be targetable") ----------------
{
  const r = G.newRoom("ATS");
  const p1 = G.addPlayer(r, "p1", "A");
  r.phase = "playing"; r.laneCount = 1; r.lanes = [[G.spawnEnemy("rookie")]]; r.allies = [[]];
  r.caravan = { hp: 1e9, max: 1e9 };
  p1.lane = 0; p1.autoFire = false; p1.moxie = 99; p1.moxieClock = 0;
  p1.cards = G.mintCards(["oHoly"]); p1.hand = [...p1.cards]; p1.deck = []; p1.invKeys = ["oHoly"];
  const tok = allyToken(r, "knight", 0); tok.maxHp = 20; tok.hp = 15;   // a friendly summon in p1's lane
  p1.maxHp = 100; p1.hp = 10;                                            // p1 is the more-hurt friendly (0.10 vs 0.75)
  // DIRECTED: pinning the summon lands the heal on the SUMMON even though p1 is the most-hurt friendly —
  // the whole point of the ruling. Proves allyTargetOf resolves a summon id (not just room.players).
  G.setAllyTarget(r, p1, tok.id);
  fire(r, p1, 0);
  ok(tok.hp === 20 && p1.hp === 10, "heal-aim lands on the PINNED summon, not the more-hurt caster");
  // NO-REGRESS: clear the pin, make the summon the most-hurt → the auto-heal (lowestHpFriendly) still reaches it.
  G.setAllyTarget(r, p1, null); p1.hp = 100; tok.hp = 4;
  fire(r, p1, 0);
  eq(tok.hp, 9, "no pin → most-hurt-friendly auto-heal still includes summons (4→9)");
  // DEAD/GONE: a stale summon id (token was killed & spliced out) falls back to the most-hurt, never wasted.
  G.setAllyTarget(r, p1, "fZZZ-gone"); p1.hp = 50; tok.hp = 20;
  fire(r, p1, 0);
  ok(p1.hp === 55 && tok.hp === 20, "a vanished summon ally-target → fallback to the most-hurt (self), no wasted heal");
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
    eq(h0 - foe.hp, 1, "foe totem aura: player's hit softened (Sword 2 − 1)"); }
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
    for (let t = 0; t < 35; t++) G.simulateTick(r);   // the rat banks 3 moxie (Bite is ⚡3 since the +1 sweep) and casts Bite ONCE (1 + 1 flag aura)
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

// ---- BLIZZARD = LANE-WIDE ICE ------------------------------------------------
// oBlizzard hits EVERY foe in your lane, then applies Ice's six-second damage reduction to
// each exact survivor using that target's own post-mitigation damage.
{
  const { r, p, foe } = rig("cleric", { inv: ["oBlizzard"] });
  const armed = G.spawnEnemy("rookie", []); armed.hp = armed.maxHp = 50; r.lanes[0].push(armed);
  armed.moxie = 7; foe.moxie = 5;
  G.addBuff(armed, "stoneskin", 1, 80);
  const h0 = foe.hp, a0 = armed.hp;
  fire(r, p, 0);
  ok(h0 - foe.hp === 3 && a0 - armed.hp === 2, "Blizzard hits every foe using each target's defenses");
  eq(G.buffAmt(foe, "sap"), 3, "the plain target gets −3 damage");
  eq(G.buffAmt(armed, "sap"), 2, "the protected target gets −2, not the lane's aggregate damage");
  ok(armed.moxie === 7 && foe.moxie === 5, "Blizzard leaves every target's moxie unchanged");
  for (let i = 0; i < 59; i++) G.tickBuffs(foe);
  eq(G.buffAmt(foe, "sap"), 3, "Blizzard's Ice reduction lasts through tick 59");
  G.tickBuffs(foe);
  eq(G.buffAmt(foe, "sap"), 0, "Blizzard's Ice reduction expires at six seconds");
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

// ---- MELEE BREACH SYMMETRY (owner 2026-07-10) -------------------------------------
// A hero/rat single-target melee whose OWN lane is empty must FOLLOW THE FOES to the nearest
// occupied lane instead of whiffing — the mirror of the foe side's foeHitLane / nearestDefendedLane.
{
  // A 3-lane "playing" room with a real player in lane 0 (lanes/allies set AFTER addPlayer).
  const mk = () => {
    const r = G.newRoom("BRCH");
    const p = G.addPlayer(r, "p", "P");
    G.wearBody(p, "rookie"); p.lane = 0; p.depth = 0; p.maxHp = p.hp = 100; p.alive = true;
    r.phase = "playing"; r.laneCount = 3; r.lanes = [[], [], []]; r.allies = [[], [], []];
    return { r, p };
  };
  const foeIn = (r, lane, hp = 50) => { const f = G.spawnEnemy("rookie"); f.hp = f.maxHp = hp; f.lane = lane; f.side = "foe"; r.lanes[lane].push(f); return f; };

  // (1) hero in an EMPTY lane, one foe two lanes over → aimedFoe breaches to it (no whiff)
  { const { r, p } = mk(); const f = foeIn(r, 2);
    eq(G.nearestFoeLane(r, 0), 2, "nearestFoeLane finds the only foe-occupied lane");
    const t = G.aimedFoe(r, p, "front");
    ok(t && t.foe === f && t.lane === 2, "hero melee in an empty lane BREACHES to the foe-occupied lane");
    G.resolveOps(r, p, [{ do: "deal", amount: 2, target: "front" }]);
    eq(f.maxHp - f.hp, 2, "…and the breached strike actually LANDS (was a whiff before)"); }

  // (2) equidistant lanes tie to the LOWER index (foe in lanes 0 and 2, hero in lane 1 → picks 0)
  { const { r, p } = mk(); p.lane = 1; const f0 = foeIn(r, 0); foeIn(r, 2);
    eq(G.nearestFoeLane(r, 1), 0, "a tie breaks to the LOWER lane index (left-bias, matches the foe side)");
    const t = G.aimedFoe(r, p, "front");
    ok(t && t.foe === f0 && t.lane === 0, "hero breaches to the lower-index lane on a tie"); }

  // (3) a foe in the OWN lane → UNCHANGED: own-lane front, never the other lane
  { const { r, p } = mk(); const own = foeIn(r, 0); const other = foeIn(r, 2);
    const t = G.aimedFoe(r, p, "front");
    ok(t && t.foe === own && t.lane === 0, "with a foe in the OWN lane, aim is unchanged (own-lane front)");
    G.resolveOps(r, p, [{ do: "deal", amount: 2, target: "front" }]);
    ok(own.maxHp - own.hp === 2 && other.maxHp - other.hp === 0, "…own-lane foe hit, the other lane untouched"); }

  // (4) a RAT likewise: largeRat's {do:"attack"} passive AND the small rat's Bite both breach
  { const { r } = mk(); const f = foeIn(r, 1);
    const big = G.spawnEnemy("largeRat"); big.side = "hero"; big.lane = 0; big.depth = 0; r.allies[0].push(big);
    G.resolveOps(r, big, [{ do: "attack" }]);                         // largeRat passive → aimedFoe("front")
    eq(f.maxHp - f.hp, 2, "a large rat in an empty lane BREACHES its attack to the foe lane");
    const small = G.spawnEnemy("rat"); small.side = "hero"; small.lane = 0; small.depth = 0; r.allies[0].push(small);
    const before = f.hp;
    G.resolveOps(r, small, [{ do: "deal", amount: 1, target: "front" }]);  // small rat's Bite (tBite)
    eq(before - f.hp, 1, "a small rat's Bite breaches to the foe lane too"); }

  // (5) NO lane foes but a back-line boss stands → order preserved: melee still reaches the boss
  { const { r, p } = mk(); r.boss = G.spawnEnemy("rookie"); r.boss.hp = r.boss.maxHp = 40;
    eq(G.nearestFoeLane(r, 0), -1, "no lane foes anywhere → nearestFoeLane returns -1");
    const t = G.aimedFoe(r, p, "front");
    ok(t && t.foe === r.boss, "with no lane foes, melee falls through to the back-line boss (unchanged order)"); }

  // (6) Spear front2 breach (FLAG: owner-confirmable extension) → nearest foe lane's front two
  { const { r, p } = mk(); const a = foeIn(r, 2); const b = foeIn(r, 2);
    G.resolveOps(r, p, [{ do: "deal", amount: 2, target: "front2" }]);
    ok(a.maxHp - a.hp === 2 && b.maxHp - b.hp === 2, "Spear front2 breaches to the nearest foe lane's front two"); }

  // (7) FOE SUMMON BLOCKS YOUR MELEE (owner ruling 2026-07-12, full symmetry): a foe that summons
  // into your lane drops the token at the lane FRONT, so your single-target melee hits the SUMMON,
  // not the summoner behind it — the mirror of your front summon blocking foe melee.
  { const { r, p } = mk(); const boss = foeIn(r, 0, 30);
    G.resolveOps(r, boss, [{ do: "summon", body: "rookie", count: 1 }]);
    const front = r.lanes[0][0];
    ok(front !== boss && r.lanes[0][1] === boss, "a foe summon lands at the lane FRONT, ahead of its summoner");
    const t = G.aimedFoe(r, p, "front");
    ok(t && t.foe === front && t.foe !== boss, "your melee aims at the summon blocker, not the foe behind it");
    const sBefore = front.hp, bBefore = boss.hp;
    G.resolveOps(r, p, [{ do: "deal", amount: 2, target: "front" }]);
    ok(sBefore - front.hp === 2 && boss.hp === bBefore, "…the strike lands on the summon; the summoner is untouched"); }

  // (7b) the rat branch places a foe rat-stack at the front too (Bonelord / Royal Rat summon a blocker)
  { const { r, p } = mk(); const boss = foeIn(r, 0, 30);
    G.resolveOps(r, boss, [{ do: "summon", body: "rat", count: 1 }]);
    const t = G.aimedFoe(r, p, "front");
    ok(t && t.foe.ratStack && t.foe !== boss && r.lanes[0][1] === boss, "a summoned foe rat-stack blocks your melee at the lane front"); }
}

// ---- PLAYER-CAST SUMMON ITEMS (V2 §4.10) ------------------------------------------
{
  // The summonRat/summonBigRat CARDS are retired; summon the rat + large-rat TOKENS directly (the
  // token bodies + their moxie casts are what's under test).
  const { r, p, foe } = rig("rookie", { inv: [] });
  G.resolveOps(r, p, [{ do: "summon", body: "rat", count: 1 }, { do: "summon", body: "largeRat", count: 1 }]);
  ok(r.allies[0].some((a) => a.bodyKey === "rat") && r.allies[0].some((a) => a.bodyKey === "largeRat"),
    "rat + large-rat tokens stand in your lane");
  for (let t = 0; t < 65; t++) G.simulateTick(r);
  // Bite is ⚡3 since the +1 sweep: the rat casts it (1) at the 3s and 6s marks = 2; the large rat attacks once on its 4s clock (2)
  eq(foe.maxHp - foe.hp, 4, "the summoned rat (Bite, moxie) + large rat both damage the foe");
}

// ---- AFFLUENCE ANUBIS (owner 2026-07-16): every 6s summon one rat plus another for each
// six-second interval elapsed. First wave = 2, second wave = 3, and so on. -----------------
{
  const totalRats = (arr) => arr.filter((e) => e.bodyKey === "rat").reduce((n, e) => n + (e.ratCount ?? 1), 0);
  eq(BODIES.affluenceAnubis.combatStart.escalatingRats.period, 60, "Affluence Anubis uses a pure 6s elapsed-time clock");
  { const foe = G.spawnEnemy("affluenceAnubis", []); foe.side = "foe"; foe.lane = 0; foe.queue = [];
    const r = { lanes: [[foe]], allies: [[]], laneCount: 1, caravan: { hp: 9, max: 9 }, players: new Map() };
    for (let t = 0; t < 60; t++) G.tickRegens(foe, r);
    eq(totalRats(r.lanes[0]), 2, "Anubis first 6s wave summons 2 rats (one base + one elapsed interval)");
    for (let t = 0; t < 60; t++) G.tickRegens(foe, r);
    eq(totalRats(r.lanes[0]), 5, "Anubis second wave adds 3 rats (5 total)"); }
  { const { r, p } = rig("affluenceAnubis");
    G.applyCombatStart(p);
    for (let t = 0; t < 60; t++) G.tickRegens(p, r);
    eq(totalRats(r.allies[0]), 2, "player-worn Anubis uses the same elapsed-time rat wave"); }
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
  for (let t = 0; t < 35; t++) G.simulateTick(r);   // banks 3 moxie by ~3s → one Bite for 1 (Bite is ⚡3 since the +1 sweep)
  eq(foe.maxHp - foe.hp, 1, "the rat casts Bite for 1 once it can afford it (cost 3 ≈ 3s)");
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
  eq(ally.moxieMax, 10, "…and its combat row gets the same explicit moxie ceiling as other bodies");
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

// ---- Jaw (owner 2026-07-10, batch E): melee ⚡5 — deal 3 to the front foe; HEAL and gain SHIELD each
// equal to the damage that ACTUALLY landed. On a low-HP foe the swing overkills, so the SELF credit
// caps at what landed ("only 2 lands → heal 2 + shield 2", owner's words) — the foe still TAKES 3. ----
{
  // Full-HP foe: the whole 3 lands → deal 3, heal 3, shield 3.
  const { r, p, foe } = rig("rookie", { inv: ["oJaw"] });
  p.hp = 50; p.shield = 0;
  const h0 = foe.hp; fire(r, p, 0);
  ok(h0 - foe.hp === 3, "Jaw deals 3 to the front foe");
  ok(p.hp === 53, "Jaw heals the caster by the damage dealt (3)");
  ok(p.shield === 3, "Jaw grants shield equal to the damage dealt (3)");
  ok(G.cardKind("oJaw") === "melee" && !G.isRanged("oJaw"), "Jaw is a MELEE card (front strike → melee triggers, not ranged)");
}
{
  // Low-HP foe (2 HP, no shield): the swing OVERKILLS, so only 2 lands → heal 2 + shield 2 (capLanded).
  const { r, p, foe } = rig("rookie", { inv: ["oJaw"] });
  p.hp = 50; p.shield = 0; foe.hp = foe.maxHp = 2;
  fire(r, p, 0);
  ok(p.hp === 52, "Jaw on a 2-HP foe heals only the 2 that landed (not 3)");
  ok(p.shield === 2, "Jaw on a 2-HP foe shields only the 2 that landed (not 3)");
}
{
  // A 2-HP foe holding 1 shield → absorbable pool 3, so the full 3 lands (shielded damage counts) → heal 3 + shield 3.
  const { r, p, foe } = rig("rookie", { inv: ["oJaw"] });
  p.hp = 50; p.shield = 0; foe.hp = foe.maxHp = 2; foe.shield = 1;
  fire(r, p, 0);
  ok(p.hp === 53 && p.shield === 3, "Jaw counts shielded damage too (2 HP + 1 shield = 3 landed → heal 3 + shield 3)");
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
  eq(p.shield, 3, "Shield grants 3 shield when played (owner 2026-07-11: 2→3)");
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
  eq(foe.maxHp - foe.hp, 2, "…after dealing 2 (Wind) to the aimed foe");
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
  ok(foe.maxHp - foe.hp === 2 && far.hp === far.maxHp,
    "melee ignores the reticle — it strikes YOUR lane's front (no sideways sword lunges)");
  fire(r, p, 1);                                  // Bow (ranged)
  eq(far.maxHp - far.hp, 2, "ranged follows the reticle cross-lane");
}

// ---- Ranged lane cards hit the AIMED foe's lane, not the caster's lane -------------------
{
  const { r, p, foe } = rig("cleric", { inv: ["oLightning", "oMeteors", "oBlizzard"] });
  r.laneCount = 2; r.lanes.push([G.spawnEnemy("rookie")]); r.allies.push([]);
  const other = r.lanes[1][0]; other.hp = other.maxHp = 100;
  p.targetId = other.id;                          // aimed across the board
  fire(r, p, 0);
  ok(foe.hp === foe.maxHp && other.maxHp - other.hp === 3,
    "Lightning follows the reticle's lane and leaves the caster's lane alone");
  fire(r, p, 1);
  eq(other.maxHp - other.hp, 9, "Meteors follows that same aimed-lane targeting rule");
  fire(r, p, 2);
  eq(other.maxHp - other.hp, 12, "Blizzard follows the aimed lane too");
  eq(G.buffAmt(other, "sap"), 3, "Blizzard saps the exact foe it hit in the aimed lane");
  ok(["oLightning", "oMeteors", "oBlizzard"].every((key) => KIT[key].ops.find((op) => op.do === "deal")?.target === "pickLane"),
    "all three ranged lane-scaling cards share the pickLane resolver seam");
}

// ---- owner card drop: Earth / Bile / Astral Fist / Flame Orbs / Study -------------------
{
  const exact = {
    oEarth: ["Earth", 5], oBile: ["Bile", 3], oAstralFist: ["Astral Fist", 8],
    oFlameOrbs: ["Flame Orbs", 9], oStudy: ["Study", 1],
  };
  for (const [key, [name, cost]] of Object.entries(exact)) {
    eq(KIT[key]?.name, name, `${name} is registered under its canonical key`);
    eq(KIT[key]?.cost, cost, `${name} has the owner-authored moxie cost`);
    eq(G.itemTreasure(key), 1, `${name} is value 1`);
    ok(G.PLAYER_POOL.includes(key) && G.STARTER_CARD_POOL.includes(key), `${name} is live in the V1 player/starter pools`);
  }
  eq(G.cardSummaryLabel("oEarth"), "3🎯  🛡3", "Earth's card face exposes both damage and equal shield at a glance");
  eq(G.cardDmgLabel("oFlameOrbs"), "3🎯×3", "Flame Orbs' card face exposes all three ranged hits");

  { const { r, p, foe } = rig("rookie", { inv: ["oEarth"], foeHp: 50 });
    p.rangedBonus = 2;
    fire(r, p, 0);
    eq(foe.maxHp - foe.hp, 5, "Earth's ranged hit scales 3 + ranged bonus");
    eq(p.shield, 5, "Earth gives its caster temporary shield equal to that damage");
    ok(p.shieldSegs?.some((seg) => seg.left === 60 && seg.amount === 5), "Earth records the six-second temporary shield segment");
    for (let i = 0; i < 60; i++) G.tickBuffs(p);
    eq(p.shield, 0, "Earth's unspent temporary shield expires after six seconds"); }

  { const { r, p, foe } = rig("rookie", { inv: ["oBile"] });
    p.rangedBonus = 2; fire(r, p, 0);
    eq(foe.poison, 3, "Bile applies exactly 1 + ranged bonus poison to its aimed foe"); }

  { const { r, p, foe: front } = rig("rookie", { inv: ["oAstralFist"], foeHp: 50 });
    const aimed = G.spawnEnemy("rookie", []), behind = G.spawnEnemy("rookie", []);
    aimed.hp = aimed.maxHp = 3; behind.hp = behind.maxHp = 50; aimed.queue = behind.queue = [];
    r.lanes[0].push(aimed, behind); p.targetId = aimed.id;
    fire(r, p, 0);
    eq(front.hp, front.maxHp, "Astral Fist starts at the aimed body instead of the lane front");
    ok(aimed.hp <= 0, "Astral Fist defeats the 3-HP aimed body");
    eq(behind.maxHp - behind.hp, 5, "Astral Fist spills the five excess damage into the body behind it"); }

  { const { r, p, foe: a } = rig("rookie", { inv: ["oFlameOrbs"], foeHp: 50 });
    const b = G.spawnEnemy("rookie", []), c = G.spawnEnemy("rookie", []);
    b.hp = b.maxHp = c.hp = c.maxHp = 50; b.queue = c.queue = []; r.lanes[0].push(b, c);
    const random = Math.random, rolls = [0, 0.4, 0.9];
    try { Math.random = () => rolls.shift() ?? 0; fire(r, p, 0); }
    finally { Math.random = random; }
    ok([a, b, c].every((foe) => foe.maxHp - foe.hp === 3), "Flame Orbs resolves three independent random 3-damage hits"); }

  { const { r, p } = rig("rookie", { inv: ["oStudy"] });
    const card = p.hand.find((c) => c.key === "oStudy");
    ok(G.cardPick("oStudy")?.kind === "meleeRanged", "Study exposes the melee/ranged choice before casting");
    G.playCard(r, p, card.id, "ranged");
    ok((p.meleeBonus ?? 0) === 0 && (p.rangedBonus ?? 0) === 0, "Study grants no immediate bonus");
    eq(p.timers?.[0]?.pickKind, "ranged", "Study snapshots the cast-time choice on its timer");
    for (let i = 0; i < 59; i++) G.tickTimers(r, p, 0);
    eq(p.rangedBonus ?? 0, 0, "Study still waits through tick 59");
    G.tickTimers(r, p, 0);
    eq(p.rangedBonus, 1, "Study grants +1 to the chosen kind at six seconds");
    eq(p.timers.length, 0, "Study's delayed bonus is one-shot");
    for (let i = 0; i < 60; i++) G.tickTimers(r, p, 0);
    eq(p.rangedBonus, 1, "Study never repeats after resolving"); }

  // Foes receive the same verbs: Earth self-shields without an ally reticle, Bile scales poison,
  // aimed overflow starts at the chosen hero, random orbs can hit every hero-side body, and Study
  // snapshots the foe's automatic kind choice.
  { const { r, p, foe } = rig("rookie");
    foe.queue = G.mintCards(["oEarth"]); foe.moxie = 99; foe.rangedBonus = 2; foe.shield = 0;
    const hp0 = p.hp; G.foeCast(r, foe);
    eq(hp0 - p.hp, 5, "a foe's Earth deals the same ranged-scaled hit");
    eq(foe.shield, 5, "a reticle-less foe's Earth grants its own equal shield"); }

  { const { r, p, foe } = rig("rookie");
    foe.queue = G.mintCards(["oBile"]); foe.moxie = 99; foe.rangedBonus = 2;
    G.foeCast(r, foe);
    eq(p.poison, 3, "a foe's Bile applies the same 1 + ranged poison"); }

  { const { r, p, foe } = rig("rookie");
    const front = allyToken(r, "rat"), behind = allyToken(r, "rat");
    front.depth = -1; behind.depth = 1; front.hp = front.maxHp = behind.hp = behind.maxHp = 50;
    p.depth = 0; p.hp = 3; p.maxHp = 50;
    foe.queue = G.mintCards(["oAstralFist"]); foe.moxie = 99;
    G.foeCast(r, foe);
    eq(front.hp, front.maxHp, "a foe's Astral Fist starts at its ranged target, not the lane front");
    ok(!p.alive, "the aimed 3-HP hero is defeated by foe Astral Fist");
    eq(behind.maxHp - behind.hp, 5, "the foe's excess spills into the hero-side body behind"); }

  { const { r, p: a, foe } = rig("rookie");
    const b = G.addPlayer(r, "b", "B"); G.wearBody(b, "rookie"); b.alive = true; b.lane = 0; b.hp = b.maxHp = 50;
    const c = allyToken(r, "rat"); a.hp = a.maxHp = c.hp = c.maxHp = 50;
    foe.queue = G.mintCards(["oFlameOrbs"]); foe.moxie = 99;
    eq(G.foeOpsDmg(r, foe, KIT.oFlameOrbs.ops), 9, "the foe preview totals all three Flame Orb hits");
    eq(G.foeThreatScope(KIT.oFlameOrbs.ops), "random", "the foe preview labels Flame Orbs as random rather than front-targeted");
    ok(G.foeTelegraph(r, foe).includes(a.id) && G.foeTelegraph(r, foe).includes(b.id), "every live player is visibly at risk before random Flame Orbs resolves");
    const random = Math.random, rolls = [0, 0.4, 0.9];
    try { Math.random = () => rolls.shift() ?? 0; G.foeCast(r, foe); }
    finally { Math.random = random; }
    ok([a, b, c].every((target) => target.maxHp - target.hp === 3), "foe Flame Orbs makes the same three random hero-side hits"); }

  { const { r, foe } = rig("rookie");
    foe.bodyKey = "cleric"; foe.queue = G.mintCards(["oStudy"]); foe.moxie = 99;
    const before = foe.rangedBonus ?? 0; G.foeCast(r, foe);
    eq(foe.timers?.[0]?.pickKind, "ranged", "a ranged foe's Study snapshots its automatic ranged choice");
    for (let i = 0; i < 60; i++) G.tickTimers(r, foe, 0);
    eq(foe.rangedBonus, before + 1, "foe Study grants the delayed bonus symmetrically"); }
}

// ---- (school-trigger onSword block DELETED in the school-free rip 2026-06-23) ----

// ---- (room effects — enchants/acid/armory/wandering — REMOVED by owner 2026-06-28; tests deleted) ----

// ---- economy / difficulty weights ---------------------------------------------------------
{
  // Temporary owner-ruling (2026-07-13): cards cost every integer from 1 through 5. A summon
  // token remains ◈0. Treasure = ante; a ware's price = its face value.
  eq(G.itemTreasure("oSword"), 1, "a weakest card's treasure = its ante (1)");
  eq(G.itemTreasure("oFire"), 2, "a better card's treasure = its ante (2)");
  eq(G.itemTreasure("oMeteors"), 4, "a tier-4 card's treasure = its ante (4)");
  eq(G.itemTreasure("oBlackHole"), 5, "a best card's treasure = its ante (5)");
  eq(G.itemTreasure("tBite"), 0, "a summon-only token cast is value 0 (never economically claimed)");
  eq(G.shopPrice("oMeteors"), G.itemTreasure("oMeteors"), "a ware's price = its face VALUE (itemTreasure) — no markup");
}

// ---- draft wheel: CHEAP entries only (gold-1 bodies AND value-1 bundled items) -------------
{
  const wheel = G.rollDraftWheel(4);
  eq(wheel.length, 12, "four players receive exactly three offers each");
  eq(new Set(wheel.map((b) => b.bodyKey)).size, 12, "offer bodies never overlap between players");
  for (const id of new Set(wheel.map((b) => b.offeredTo)))
    eq(wheel.filter((b) => b.offeredTo === id).length, 3, `${id} owns exactly three offers`);
  ok(wheel.every((b) => BODIES[b.bodyKey]?.gold === 1), "the wheel draws gold-1 bodies only");
  ok(wheel.every((b) => b.items.every((k) => (KIT[k]?.ante ?? 9) <= 1)), "draft bundles hold value-1 items only");
  ok(wheel.every((b) => b.items.some((k) => (KIT[k].ops ?? []).some((o) => o.do === "deal"))),
    "every bundle still guarantees a damaging item");
  let overCapacity = false;
  try { G.rollDraftWheel(G.DRAFT_MAX_PLAYERS + 1); } catch (e) { overCapacity = e instanceof RangeError; }
  ok(overCapacity, "draft capacity fails explicitly instead of silently overlapping offers");
}
{
  const r = G.newRoom("D3"); r.telemOff = true;
  const a = G.addPlayer(r, "a", "A"), b = G.addPlayer(r, "b", "B");
  G.startDraft(r);
  const ao = draftOffers(r, a), bo = draftOffers(r, b);
  eq(ao.length, 3, "player A sees exactly three assigned offers");
  eq(bo.length, 3, "player B sees exactly three assigned offers");
  ok(!ao.some((x) => bo.some((y) => y.bodyKey === x.bodyKey)), "A and B's assigned bodies do not overlap");
  G.draftPick(r, a, bo[0].id);
  ok(!a.drafted && a.lockedBundle == null, "a forged cross-player pick is rejected server-side");
  G.draftPick(r, a, ao[0].id);
  ok(a.drafted && a.lockedBundle === ao[0].id, "a player can lock one of their own three offers");
  const snap = G.snapshot(r);
  eq(snap.draft.wheel.filter((x) => x.offeredTo === "a").length, 3, "snapshot preserves A's private triple");
  eq(snap.draft.wheel.filter((x) => x.offeredTo === "b").length, 3, "snapshot preserves B's private triple");
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
  G.startDraft(r); draftBody(r, p1);                  // draft completes → trailhead chooser (solo: 1 lane)
  enterFirstRoom(r); G.beginCombat(r);                // step into the pre-built first room and start the fight
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
  G.startDraft(r); draftBody(r, host);                  // host solo-drafts → run auto-starts (1 lane)
  const hostOfferIds = draftOffers(r, host).map((b) => b.id);
  eq(r.laneCount, 1, "host alone → solo run, 1 lane");
  eq(r.phase, "won", "…and the run has already left the draft (opens on the first-room CHOOSER / trailhead)");
  // a friend's socket lands AFTER the host started (server: addPlayer + spawnSquad + reopenDraftForJoin)
  const guest = G.addPlayer(r, "p2", "Guest");
  const reopened = G.reopenDraftForJoin(r);
  ok(reopened, "a pre-combat join reopens the draft");
  eq(r.phase, "draft", "…the room is pulled back into the draft");
  ok(host.drafted, "host KEEPS the body/kit they already locked");
  ok(!guest.drafted, "guest still needs to pick a body/kit");
  eq(draftOffers(r, guest).length, 3, "late joiner receives exactly three private offers");
  eq(draftOffers(r, host).map((b) => b.id).join(","), hostOfferIds.join(","), "late join preserves the host's original triple");
  ok(!draftOffers(r, guest).some((x) => draftOffers(r, host).some((y) => y.bodyKey === x.bodyKey)), "late joiner's offers do not overlap the host's");
  // guest picks → draft completes → RE-ENTER the current node with the bigger party
  draftBody(r, guest);
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
  G.startDraft(r); draftBody(r, host);
  enterFirstRoom(r);                                   // step off the trailhead into the first room
  G.beginCombat(r);
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
  for (const p of r.players.values()) draftBody(r, p);
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
      // ANTE V4: ante = 4 base + Σ item values + 2×(level−1) + elite-body premium
      const want = G.FOE_BASE_ANTE + f.gear.reduce((s, g) => s + G.itemTreasure(g), 0) + 2 * (f.level - 1) + G.eliteBodyAnte(f.bodyKey);
      if (G.anteOfFoe(f) !== want) anteMismatch = true;
    }
  }
  ok(!empty, "a generated room always has at least one foe (combat room never empty)");
  ok(!overBudget, "generated foes never exceed the room's ante budget");
  ok(!sawUnfilled, "rooms FILL to the ante — a random selection of foes to EQUAL the budget (owner 2026-06-27)");
  ok(sawMulti, "…and a fuller room is several foes, not one mini");
  ok(!minCardsBad, "every generated foe carries at least FOE_MIN_CARDS (3) cards");
  ok(!anteMismatch, "every generated foe's ante = 4 base + Σ item values + 2×(level−1) + elite premium (ante v4)");
}

// ---- FIVE-TIER ECONOMY GENERATION INVARIANTS (owner 2026-07-13) -----------------------------
{
  let soloCountBad = false, soloBudgetBad = false, conservationBad = false;
  const seenArsenalValues = new Set();
  const solo = G.newRoom("F1-MATRIX"); G.addPlayer(solo, "p", "P"); solo.floor = 1;
  // The low-level helper stays safe even when directly given a now-non-live 4–6 budget: it
  // normalizes to the legal ⚖7 minimum. Budgets 7–12 never overshoot. The repeated matrix catches
  // stochastic tier/enrichment leaks across every explicit skew, including skews the live budget
  // filter correctly withholds when their defining lever cannot yet appear.
  for (const skew of G.ROOM_SKEWS) for (let budget = 4; budget <= 12; budget++) for (let t = 0; t < 500; t++) {
    const foes = G.generateRoomFoes(solo, budget, 1, skew);
    const ante = foes.reduce((s, f) => s + G.anteOfFoe(f), 0);
    const loot = foes.reduce((s, f) => s + G.foeLootValue(f), 0);
    if (foes.length !== 1) soloCountBad = true;
    if (ante < 7 || ante > Math.max(7, budget)) soloBudgetBad = true;
    if (ante - loot !== (G.FOE_BASE_ANTE - G.FOE_BASE_LOOT) * foes.length) conservationBad = true;
    if (skew === "arsenal") for (const f of foes) for (const k of f.gear) seenArsenalValues.add(G.itemTreasure(k));
  }
  ok(!soloCountBad, "direct 4–12 solo floor-1 generation contains exactly one acting foe (two cost at least ⚖14)");
  ok(!soloBudgetBad, "solo floor-1 generation honors budget, except intentional 4–6 → legal ⚖7 normalization");
  ok(!conservationBad, "generated threat minus loot equals the remaining ⚖2 threat tax per foe after its two-common base drop");
  ok([1, 2, 3, 4, 5].every((v) => seenArsenalValues.has(v)), "arsenal generation exercises all five card-value tiers");

  // The opening trio is intentionally fixed to the weakest possible setup now. Later floor-one rows
  // must still express the live ante range. Use a seeded PRNG so these distribution assertions are
  // deterministic; the thresholds leave generous room around the intended shape.
  const realRandom = Math.random;
  let seed = 0x5eed1234;
  Math.random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 0x100000000;
  };
  try {
    let cheap = 0, leveled = 0, rich = 0;
    const runs = 12000;
    solo.level = { nodes: [{ id: "f1-live", type: "combat", row: 2, links: [] }], currentId: "f1-live" };
    for (let t = 0; t < runs; t++) {
      G.stockLevelRooms(solo);   // exact later-room path: budget roll → skew → foes
      const node = solo.level.nodes[0];
      const foes = node.foes;
      const loot = foes.reduce((s, f) => s + G.foeLootValue(f), 0);
      if (loot === 5) cheap++;
      if (foes.some((f) => f.level > 1)) leveled++;
      if (foes.some((f) => f.gear.some((k) => G.itemTreasure(k) > 1))) rich++;
    }
    ok(cheap / runs < 0.35, `later floor-1 ◈5 rooms stay below 35% (${(100 * cheap / runs).toFixed(1)}%)`);
    ok(leveled / runs > 0.08, `later floor-1 rooms expose leveled foes above 8% (${(100 * leveled / runs).toFixed(1)}%)`);
    ok(rich / runs > 0.40, `later floor-1 rooms expose richer-card setups above 40% (${(100 * rich / runs).toFixed(1)}%)`);
  } finally { Math.random = realRandom; }

  let leveledOver = false;
  for (let maxAnte = 7; maxAnte <= 12; maxAnte++) for (let t = 0; t < 500; t++) {
    const f = G.rollLeveledFoe("counterparty", maxAnte, 1, "arsenal");
    const ante = G.anteOfFoe(f);
    if (ante < 7 || ante > maxAnte) leveledOver = true;
  }
  ok(!leveledOver, "3,000 arsenal rolls across max ante 7–12 stay inside their exact allocation");

  const dormantElite = G.rollEliteFoe("atlas", G.ELITE_BODY_VALUE, 1);
  ok(G.anteOfFoe(dormantElite) <= G.ELITE_BODY_VALUE,
    "the dormant marquee-elite helper also charges the new base and never exceeds its target ante");
}

// ---- THE ANTE FORMULA — ANTE V4 (owner 2026-07-13): 4 base + items + 2×(level−1) + elite premium ----
{
  eq(G.bodyAnteOf({ bodyKey: "frugal" }), 1, "body adoption price is still 1 (flat)");
  eq(G.bodyAnteOf({ bodyKey: "counterparty" }), 1, "…the heaviest chassis too");
  // anteOfFoe = 4 flat base + Σ item values + 2×(level−1) + elite-body premium. Level 1 is FREE;
  // an ELITE body adds its +3 premium on top. Card examples intentionally use live face values.
  eq(G.anteOfFoe({ bodyKey: "rookie", gear: ["oDagger"] }), 4 + G.itemTreasure("oDagger"), "4 base + one card + level-1 (FREE)");
  eq(G.anteOfFoe({ bodyKey: "rookie", gear: ["oDagger", "oDagger", "oDagger"] }), 7, "a base foe: 4 base + 3 value-1 cards = ⚖7");
  eq(G.anteOfFoe({ bodyKey: "counterparty", gear: ["oMeteors", "oForce"] }), 4 + G.itemTreasure("oMeteors") + G.itemTreasure("oForce"), "4 base + the exact values of two cards + level-1 (free)");
  eq(G.anteOfFoe({ bodyKey: "rookie", gear: ["oDagger"], level: 3 }), 9, "+2 per level ABOVE 1: 4 base + 1 item + 2×2 = 9");
  eq(G.anteOfFoe({ bodyKey: "rookie", gear: [], level: 5 }), 12, "4 base + no items + 2×4 = 12 (levels above 1 scale infinitely)");
  eq(G.eliteBodyAnte("neptune"), 6, "a mythic Tier-III body carries the +6 premium");
  eq(G.eliteBodyAnte("frugal"), 0, "…a common carries none");
  eq(G.anteOfFoe({ bodyKey: "atlas", gear: ["oDagger", "oDagger", "oDagger"] }), 13, "a mythic with 3 value-1 cards = ⚖13 (4 base + 6 premium + 3 items)");
  // NO FLOOR (owner spec 2026-06-27): the room arrives PRE-GENERATED to its budget; the begin gate is
  // always open — the party may commit immediately, no minimum ante to stock.
  const r = G.newRoom("AN");
  const p1 = G.addPlayer(r, "p1", "A"), p2 = G.addPlayer(r, "p2", "B");
  G.startDraft(r);
  draftBody(r, p1); draftBody(r, p2);
  G.beginRun(r);                                                      // co-op fresh draft holds → ▶ (owner 2026-07-06)
  enterFirstRoom(r);                                                  // step into the first room (pre-built)
  ok(r.draftedFoes.length >= 1, "the room arrives PRE-GENERATED with at least one foe (never empty)");
  eq(r.anteRequired, 0, "there is NO ante floor to meet — the begin gate is 0");
  eq(r.phase, "setup", "the room enters formation (setup) directly — no stock gate exists");
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
  // Non-merging summons preserve both sides at once. This is the exact Hedgefund Knight sequence
  // from the mobile regression: cast one in front, toggle, then cast one behind.
  const { r: r3, p: p3 } = rig("cleric", { inv: [] });
  G.resolveOps(r3, p3, [{ do: "summon", body: "hedgeKnight", count: 1 }]);
  p3.summonSide = "back";
  G.resolveOps(r3, p3, [{ do: "summon", body: "hedgeKnight", count: 1 }]);
  const l3 = G.laneLine(r3, p3.lane);
  eq(l3.length, 3, "front + hero + back Hedgefund Knights remain three depth slots");
  eq(l3[0].bodyKey, "hedgeKnight", "first Hedgefund Knight remains in FRONT");
  eq(l3[1].id, p3.id, "the hero remains between the two Hedgefund Knights");
  eq(l3[2].bodyKey, "hedgeKnight", "second Hedgefund Knight remains in BACK");
  eq(l2[0].id, p2.id, "…with you in front of your own line");
}

// ---- DRAFT KIT FIT: four synergistic pairs + one deliberate wild pair ----------------
{
  let dud = false, underEightFit = false;
  for (let n = 0; n < 60; n++) {
    for (const b of G.rollDraftWheel(4)) {
      if (!(KIT[b.items[0]].ops ?? []).some((o) => o.do === "deal")) dud = true;
      if (b.items.filter((k) => G.itemFitsArchetype(b.bodyKey, k)).length < 8) underEightFit = true;
    }
  }
  ok(!dud, "slot 1 is always a damaging item (no toothless loadout)");
  ok(!underEightFit, "every starter bundle guarantees at least four archetype-fit pairs (8/10 cards)");
}

// ---- NO ANTE FLOOR: the up-the-ante ratchet is RETIRED; anteCap is the room BUDGET (owner 2026-06-27)
{
  const r = G.newRoom("AW"); const p = G.addPlayer(r, "p", "A");
  G.startDraft(r); draftBody(r, p);                              // solo auto-start → trailhead chooser
  eq(r.anteMin, 0, "no floor: anteMin is 0");
  ok(r.anteCap > 0, "anteCap is the room's ante BUDGET (a cap, not a floor)");
  // ANTE V4.1 (owner 2026-07-15): preserve P×F×[4,12] but clamp its low end to one legal foe.
  const solo = G.newRoom("B1"); G.addPlayer(solo, "q", "Q"); solo.floor = 1;
  eq(G.roomAnteRange(solo).join(","), "7,12", "solo · floor 1 live range = [7, 12] (never below one legal foe)");
  eq(G.roomAnteBudget(solo, "combat"), 12, "roomAnteBudget (back-compat) = the PEAK of the range");
  eq(G.minFoeAnte(), 7, "minimum foe = 4 action/body base + three value-1 cards = ⚖7");
  ok(!G.roomSkewsForBudget(9).includes("swarm") && G.roomSkewsForBudget(9).includes("bodies"),
    "a ⚖9 budget can express Tier I but cannot yet express a two-foe swarm");
  ok(G.roomSkewsForBudget(9).includes("bodies") && G.roomSkewsForBudget(14).includes("swarm"),
    "body/swarm skews enter when Tier I/a second foe can fit");
  const thresholdSwarm = G.generateRoomFoes(solo, 14, 1, "swarm");
  ok(thresholdSwarm.length === 2 && thresholdSwarm.every((f) => !G.ELITE_SET.includes(f.bodyKey)),
    "a threshold ⚖14 swarm expresses two minimum common foes (elite premium cannot collapse it)");
  const duoF3 = G.newRoom("B2"); G.addPlayer(duoF3, "a", "A"); G.addPlayer(duoF3, "b", "B"); duoF3.floor = 3;
  eq(G.roomAnteRange(duoF3).join(","), "24,72", "…and the range scales with party × floor (2×3×4 → [24, 72])");
  let inRange = true;
  for (let t = 0; t < 60; t++) { const roll = G.rollRoomAnte(duoF3); if (roll < 24 || roll > 72) inRange = false; }
  ok(inRange, "rollRoomAnte stays inside the range (60 rolls)");
}

// Retained below as an executable historical record, but superseded by the point allocator.
if (false) {
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
  const r = G.newRoom("LVL"); r.phase = "setup";
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

// ---- GIANT'S BELT × LEVEL-UP: a per-fight maxHp double must NOT clobber a later level-up (bug 2026-07-10) --
// Owner solo playtest: a L2 Minotaur entered combat at 7/7 instead of 13/13. Cause = Giant's Belt stashed a
// `_giantBase` snapshot + doubled maxHp "for this fight", and the double was reverted only at the NEXT
// beginCombat. A level-up (or body-swap) BETWEEN the belt fight and the next fight recomputes maxHp correctly
// but leaves `_giantBase` set — so the next beginCombat reverted maxHp back down to the stale snapshot. FIX:
// undo the belt at ROOM CLEAR (fight end) so the snapshot can never outlive the fight it was cast in.
{
  const r = G.newRoom("BELT"); r.telemOff = true;
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, "bloodfund");                    // Market-Crash Minotaur (melee body)
  p.deckList = Array(10).fill("oSword");         // a legal combat deck (≥ MIN_DECK)
  p.backpack = Array(40).fill("oSword");         // spares to tender for the level-up
  const base = G.BODIES.bloodfund.maxHp;
  // --- fight 1: cast Giant's Belt — it must STILL add base health within this fight (requirement #1) ---
  r.phase = "playing"; r.laneCount = 1; r.lanes = [[]]; r.allies = [[]]; r.caravan = { hp: 100, max: 100 };
  r.draftedFoes = []; p.lane = 0; p.hp = p.maxHp = base;
  G.resolveOps(r, p, G.KIT.oGiantsBelt.ops);
  eq(p.maxHp, base * 2, "Giant's Belt adds base health (unbuffed body: base+base = 2× base) for the fight it's cast in");
  eq(p._giantBase, base, "…and snapshots the pre-belt (base health) maxHp");
  // NERF (owner 2026-07-10): "not double it each time" — a SECOND belt this fight must NOT stack/compound.
  G.resolveOps(r, p, G.KIT.oGiantsBelt.ops);
  eq(p.maxHp, base * 2, "Giant's Belt does NOT stack — a second cast this fight adds nothing (still base+base)");
  eq(p._giantBase, base, "…and the base-health snapshot is untouched by the re-cast");
  // --- win the room (empty board) → room-clear undoes the belt (it was 'this fight' only) ---
  G.simulateTick(r);
  eq(r.phase, "won", "empty board resolves to a win");
  eq(p.maxHp, base, "room clear UNDOES the belt double — the fight is over");
  ok(!p._giantBase, "…and drops the stale snapshot at fight end (so it can't survive to the next fight)");
  eq(p.hp, base, "…and heals to the un-doubled full maxHp");
  // --- level to L2 between rooms → maxHp recomputes to base+4 (the foe curve) ---
  r.phase = "setup";
  ok(G.levelUp(r, p, Array(5).fill("oSword")), "spend 5 → level up to L2");
  eq(p.level, 2, "now level 2");
  eq(p.maxHp, base + 4, "L2 grants +4 HP");
  // --- fight 2 begins → the LEVELED maxHp must survive (pre-fix this clobbered back to the snapshot: 7/7) ---
  r.lanes = [[]]; r.allies = [[]]; r.caravan = { hp: 99, max: 99 }; r.laneCount = 1; r.phase = "setup";
  p.lane = 0; p.cards = []; p.deck = []; p.hand = [];
  G.beginCombat(r);
  eq(p.maxHp, base + 4, "REGRESSION: the next fight keeps the L2 maxHp (13) — no stale Giant's Belt clobber (was 7/7)");
}

// ---- LEVELCAP BUG (owner live-playtest 2026-07-09: "couldn't level up past 8 despite enough cards") ----
// The player path used to gate on FOE_LEVEL_CAP (=8) — a foe-GENERATION sanity ceiling that leaked in and
// hard-capped the PLAYER at level 8 with tender to spare. There is NO owner-stated player-level cap; leveling
// is bounded ONLY by the escalating value-for-value tender (levelUpCost = 5×(L-1)). This proves L8→L9 succeeds.
{
  const r = G.newRoom("LVLCAP"); r.phase = "setup";
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
  const r = G.newRoom("LVLSWAP"); r.phase = "setup";
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
  const r = G.newRoom("LVLFEED"); r.phase = "setup";
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

// ---- R4: LEVEL-UP DAMAGE-TYPE CHOICE — player CHOOSES melee/ranged; foe AUTO-picks by archetype (owner 2026-07-10) --
{
  const r = G.newRoom("R4-auto");
  const p = G.addPlayer(r, "auto", "Auto");
  p.runLevel = 3; p.deckList = Array(10).fill("oSword"); p.levelPick = null;
  G.wearBody(p, "bloodfund");
  const s = G.snapshot(r).players.find((x) => x.id === p.id);
  eq(s.levelPick, null, "a fresh leveled build preserves its explicit auto-allocation state");
  eq(s.levelEffectivePick, "melee", "snapshot also exposes the real auto-applied allocation for truthful UI copy");
}
{
  const r = G.newRoom("R4"); r.phase = "setup";
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, "bloodfund");                    // a MELEE-archetype body …
  p.deckList = Array(10).fill("oSword");         // … with an all-MELEE deck → the pre-R4 auto would pick MELEE
  p.backpack = Array(60).fill("oSword");         // plenty of spares for the escalating tender
  // (a) PLAYER CHOICE is HONORED: climb to L3 choosing RANGED — it must OVERRIDE the melee deck-auto
  ok(G.levelUp(r, p, Array(5).fill("oSword"),  "ranged"), "L2 chosen ranged (combat lands at L3)");
  ok(G.levelUp(r, p, Array(10).fill("oSword"), "ranged"), "L3 chosen ranged");
  eq(p.levelPick, "ranged", "the player's CHOICE is stored run-wide");
  eq(p.levelRanged, G.levelCombatBonus(3), "L3 +combat landed on RANGED (the chosen type), not the melee deck-auto");
  eq(p.levelMelee, 0, "…and nothing on melee despite an all-melee deck");
  // the LATEST choice governs the whole (non-cumulative) grant: re-choose MELEE on the next step
  ok(G.levelUp(r, p, Array(15).fill("oSword"), "melee"), "L4 re-chosen melee");
  eq(p.levelMelee, G.levelCombatBonus(4), "the latest choice moves the WHOLE +combat to melee");
  eq(p.levelRanged, 0, "…ranged cleared");
  // BODY-SWAP REASSIGNMENT (owner 2026-07-13): choose where the fixed run-wide package lands for
  // the NEW body. It moves the whole grant; it never duplicates or resets the player's level/HP curve.
  r.unlockedBodies.add("leverage");
  const woundRatio = (p.hp = Math.max(1, p.maxHp - 2)) / p.maxHp;
  ok(G.swapBody(r, p, "leverage", [], "ranged") === "leverage", "swap into a ranged body while explicitly reassigning the level grant");
  eq(p.levelPick, "ranged", "…the atomic swap stored the new allocation");
  eq(p.levelRanged, G.levelCombatBonus(4), "…the WHOLE +combat package moved to ranged");
  eq(p.levelMelee, 0, "…and the former melee allocation cleared (no duplicate grant)");
  eq(p.levelMelee + p.levelRanged, G.levelCombatBonus(p.runLevel), "…the allocation still conserves the fixed run-level grant");
  eq(p.hp, Math.max(1, Math.round(p.maxHp * woundRatio)), "…the body swap preserved wound ratio while recomputing max HP");
  const levelSnap = G.snapshot(r).players.find((x) => x.id === p.id);
  eq(levelSnap.levelPick, "ranged", "snapshot exposes the current level allocation for the body picker");
  eq(levelSnap.levelBonus, G.levelCombatBonus(4), "snapshot exposes the fixed amount the picker moves");
  // OWNER 2026-07-15: a body swap may retain or rebuild ANY integer split of the SAME fixed grant.
  // This is combat-stat allocation, never a deck rewrite: cards, values and the floor are untouched.
  p.runLevel = 5; G.applyBodyLevel(p); // two-point grant makes a nontrivial 1/1 regression possible
  const splitBonus = G.levelCombatBonus(p.runLevel);
  const deckBeforeSplit = [...p.deckList], bagBeforeSplit = [...p.backpack];
  r.unlockedBodies.add("bloodfund");
  ok(G.swapBody(r, p, "bloodfund", [], { melee: 1, ranged: splitBonus - 1 }) === "bloodfund",
    "body swap accepts an arbitrary conserved melee/ranged split");
  eq(p.levelMelee, 1, "the requested melee share is applied");
  eq(p.levelRanged, splitBonus - 1, "the requested ranged share is applied");
  eq(p.levelMelee + p.levelRanged, G.levelCombatBonus(p.runLevel), "the split cannot add combat power");
  eq(p.deckList.join(), deckBeforeSplit.join(), "body split does not rewrite the combat deck");
  eq(p.backpack.join(), bagBeforeSplit.join(), "body split does not change owned cards or values");
  r.unlockedBodies.add("leverage");
  ok(G.swapBody(r, p, "leverage") === "leverage", "a later body swap may retain the existing split");
  eq(`${p.levelMelee}:${p.levelRanged}`, `1:${splitBonus - 1}`, "omitting a rebuild preserves the split across bodies");
  const beforeInvalid = { body: p.bodyKey, melee: p.levelMelee, ranged: p.levelRanged, bag: p.backpack.join(",") };
  ok(!G.swapBody(r, p, "bloodfund", [], { melee: 99, ranged: 0 }), "server rejects a split whose sum exceeds the fixed grant");
  eq(JSON.stringify({ body: p.bodyKey, melee: p.levelMelee, ranged: p.levelRanged, bag: p.backpack.join(",") }), JSON.stringify(beforeInvalid),
    "invalid split is atomic: no body, allocation, or economy mutation");
  // Omitted/invalid picks preserve the allocation for keyboard quick-cycle and older clients.
  r.unlockedBodies.add("bloodfund");
  ok(G.swapBody(r, p, "bloodfund") === "bloodfund", "a legacy swap with no dmgType still succeeds");
  eq(p.levelPick, null, "…and preserves the existing mixed allocation");
  ok(G.swapBody(r, p, "leverage", [], "bogus") === "leverage", "a swap ignores an invalid dmgType");
  eq(p.levelPick, null, "…invalid input cannot mutate the mixed allocation");
  // A failed paid adoption is atomic: no body, allocation, wallet, cards, or HP mutation.
  r.unlockedBodies.add("fundjin");
  const beforeFail = { body: p.bodyKey, pick: p.levelPick, bag: p.backpack.join(","), treasure: p.treasure, hp: p.hp, maxHp: p.maxHp };
  ok(!G.swapBody(r, p, "fundjin", [], "melee"), "an underpaid elite adoption is rejected before the requested respec commits");
  eq(JSON.stringify({ body: p.bodyKey, pick: p.levelPick, bag: p.backpack.join(","), treasure: p.treasure, hp: p.hp, maxHp: p.maxHp }), JSON.stringify(beforeFail), "…failed adoption changes no build or economy state");
  // (b) FOE AUTO-PICK by ARCHETYPE (passive), which BEATS the gear flavor (foes carry no choice):
  const rangedFoe = G.spawnEnemy("frugal", ["oSword"], 3);    // frugal = RANGED archetype, but MELEE gear
  eq(rangedFoe.rangedBonus, G.levelCombatBonus(3), "a ranged-archetype foe ramps RANGED (passive-first, beats melee gear)");
  eq(rangedFoe.meleeBonus, 0, "…and nothing on melee");
  const meleeFoe = G.spawnEnemy("bloodfund", ["oFire"], 3);   // bloodfund = MELEE archetype, but RANGED gear
  eq(meleeFoe.meleeBonus, G.levelCombatBonus(3), "a melee-archetype foe ramps MELEE (passive-first, beats ranged gear)");
  eq(meleeFoe.rangedBonus, 0, "…and nothing on ranged");
  // a FLEX foe has no innate identity → it decides by its KIT (unchanged pre-R4 behavior)
  const flexFoe = G.spawnEnemy("counterparty", ["oFire"], 3); // counterparty = FLEX → kit decides
  eq(flexFoe.rangedBonus, G.levelCombatBonus(3), "a flex foe falls to its ranged kit → RANGED");
  // levelDamageType directly: an explicit pick wins; else archetype; a flex body → kit
  eq(G.levelDamageType("bloodfund", [], "ranged"), "ranged", "an explicit pick overrides archetype");
  eq(G.levelDamageType("frugal", ["oSword"]),      "ranged", "no pick → ranged archetype beats melee gear");
  eq(G.levelDamageType("counterparty", ["oSword"]), "melee", "no pick, flex → decided by the melee kit");
}

}

// ---- POINT LEVELING + THREE ELITE TIERS (owner 2026-07-17) ------------------------------
{
  eq(G.levelPointBudget(1), 0, "level 1 has no upgrade points");
  eq(G.levelPointBudget(9), 8, "every level above 1 grants exactly one point");
  eq(G.LEVEL_HP_PER_POINT, 4, "one health rank grants +4 max HP");
  eq(Object.keys(G.BODY_UPGRADES).length, 37, "all 37 wearable bodies have Mastery + Specialty rows");
  ok(Object.values(G.BODY_UPGRADES).every((u) => u.mastery.cap === 1 && u.specialty.repeatable),
    "Mastery is one-time and every Specialty uses the shared repeatable row shape");
  eq(G.BODY_UPGRADES.bloodfund.specialty.cap, 1,
    "Market-Crash Minotaur's opening-moxie Specialty is capped at one rank");
  eq(G.BODY_UPGRADES.counterparty.specialty.cap, 1,
    "Bond Behemoth's opening-damage Specialty is capped at one rank");
  eq(G.BODY_UPGRADES.basilisk.specialty.cap, 1,
    "Bankrupt Basilisk cannot buy the retired one-moxie cadence rank");
  eq(G.BODY_UPGRADES.basilisk.specialty.text,
    "Passive threshold drops by 1 moxie (minimum 2).",
    "Bankrupt Basilisk upgrade prose states the guarded two-moxie floor");
  eq(G.LEVEL_MASTERY_COST, 2, "every identity-changing Mastery has the shared two-point price");
  eq(G.LEVEL_SPECIALTY_COST, 1, "every linear Specialty rank has the shared one-point price");
  eq(Object.keys(G.BODY_ARCHETYPES).length, 37, "the archetype matrix covers every wearable body");
  ok(Object.keys(G.BODY_UPGRADES).every((key) => G.BODY_ARCHETYPES[key]),
    "the archetype matrix has no missing wearable body");
  ok(Object.keys(G.BODY_ARCHETYPES).every((key) => G.BODY_UPGRADES[key]),
    "the archetype matrix has no non-wearable extras");
  const matrixCounts = G.bodyArchetypeCounts();
  eq(JSON.stringify(matrixCounts.roles), JSON.stringify({ Attacker: 12, Caster: 12, Defender: 2, Summoner: 6, Support: 5 }),
    "body role counts are exact and versioned");
  eq(JSON.stringify(matrixCounts.archetypes), JSON.stringify({ "Economy / Tempo": 8, "Pressure / Control": 6, "Reactive / Aggro": 5, "Scaling / Carry": 6, "Summon / Board": 6, "Sustain / Fortify": 6 }),
    "primary play-pattern counts are exact and versioned");
  for (const [bodyKey, upgrades] of Object.entries(G.BODY_UPGRADES)) {
    const cost = 2;
    eq(upgrades.mastery.cost, cost, `${bodyKey} Mastery costs two points`);
    eq(upgrades.specialty.cost, 1, `${bodyKey} Specialty costs one point per rank`);
    const masteryOnly = { hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 0 };
    ok(!G.validLevelAllocation(bodyKey, cost, masteryOnly), `${bodyKey} Mastery is unavailable one level early`);
    ok(G.validLevelAllocation(bodyKey, cost + 1, masteryOnly, true), `${bodyKey} Mastery first fits at level ${cost + 1}`);
  }
  const specialtyCaps = {
    compound: 9, discountDuel: 9, ratBaron: 10, killionaire: 8, basilisk: 1, medusa: 9,
    timeshareTyrant: 9,
  };
  for (const [bodyKey, cap] of Object.entries(specialtyCaps)) {
    eq(G.BODY_UPGRADES[bodyKey].specialty.cap, cap, `${bodyKey} Specialty stops at its last useful rank`);
    const atCap = { hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: cap };
    const pastCap = { ...atCap, specialty: cap + 1 };
    ok(G.validLevelAllocation(bodyKey, cap * G.BODY_UPGRADES[bodyKey].specialty.cost + 1, atCap, true),
      `${bodyKey} final useful Specialty rank remains legal`);
    ok(!G.validLevelAllocation(bodyKey, 99, pastCap), `${bodyKey} dead rank above the cap is rejected`);
  }
  const savedBasilisk = { hp: 1, melee: 1, ranged: 0, mastery: 1, specialty: 2 };
  const migratedBasilisk = G.migrateSavedLevelAllocation("basilisk", savedBasilisk);
  ok(migratedBasilisk === savedBasilisk, "Basilisk saved-allocation migration preserves graph identity");
  eq(JSON.stringify(migratedBasilisk), JSON.stringify({ hp: 1, melee: 1, ranged: 0, mastery: 1, specialty: 1 }),
    "Basilisk saved-allocation migration returns only its retired Specialty point");
  const unrelatedAllocation = { hp: 0, melee: 1, ranged: 0, mastery: 0, specialty: 2 };
  ok(G.migrateSavedLevelAllocation("heavyHand", unrelatedAllocation) === unrelatedAllocation
      && unrelatedAllocation.specialty === 2,
    "saved-allocation migration leaves unrelated bodies and ranks untouched");
  const basiliskRoom = G.newRoom("BASILISK-RANK-GUARD"); basiliskRoom.phase = "setup";
  const basiliskPlayer = G.addPlayer(basiliskRoom, "basilisk-rank", "Basilisk Rank Guard");
  G.wearBody(basiliskPlayer, "basilisk"); basiliskPlayer.runLevel = 10;
  ok(G.allocateLevel(basiliskRoom, basiliskPlayer,
    { hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 1 }),
  "Bankrupt Basilisk can buy its one legal Specialty rank");
  const basiliskAllocationAtCap = JSON.stringify(basiliskPlayer.levelAllocation);
  ok(!G.allocateLevel(basiliskRoom, basiliskPlayer,
    { hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 2 }),
  "Bankrupt Basilisk rejects a second Specialty rank even with ample unspent points");
  eq(JSON.stringify(basiliskPlayer.levelAllocation), basiliskAllocationAtCap,
    "rejected Bankrupt Basilisk Specialty rank leaves the legal allocation atomic");
  eq(Object.values(G.ELITE_TIERS).flatMap((t) => t.bodies).length, 15, "all 15 elites belong to one shared tier");
  eq(new Set(Object.values(G.ELITE_TIERS).flatMap((t) => t.bodies)).size, 15, "elite tier membership has no duplicates");
  eq(G.eliteTierOf("killionaire"), 1, "Killionaire is fantasy Tier I");
  eq(G.eliteTierOf("basilisk"), 2, "Basilisk is fantasy Tier II");
  eq(G.eliteTierOf("atlas"), 3, "Atlas is fantasy Tier III");
  eq(G.eliteTierOf("bonelord"), 3, "Bookie Bonelord scales into fantasy Tier III");
  eq(G.eliteTierOf("oligarchyOoze"), 2, "Oligarchy Ooze is fantasy Tier II");
  eq(G.eliteTierOf("timeshareTyrant"), 3, "Timeshare Tyrant is fantasy Tier III");
  eq(G.eliteBodyAnte("killionaire"), 2, "Tier I foe premium is +2 ante");
  eq(G.eliteBodyAnte("basilisk"), 4, "Tier II foe premium is +4 ante");
  eq(G.eliteBodyAnte("atlas"), 6, "Tier III foe premium is +6 ante");

  const ranked = (bodyKey, mastery = 1, specialty = 1) => ({
    bodyKey, levelAllocation: { hp: 0, melee: 0, ranged: 0, mastery, specialty },
  });
  const passiveCases = [
    ["frugal", (x) => x[0].hit === 3 && x[0].ops.some((op) => op.do === "dealRatsInLane")],
    ["leverage", (x) => x[0].spend === 3 && x[0].ops[0].count === 2],
    ["hedge", (x) => x[0].play === 2 && x[0].ops[0].count === 2],
    ["ratTrader", (x) => x[0].ops[0].amount === 3 && x[0].ops[0].overheal],
    ["pyramidRogue", (x) => x.some((p2) => p2.pairMR && p2.ops[0].amount === 2)],
    ["bloodfund", (x) => x[0].ops[0].amount === 2 && x[0].ops.length === 1],
    ["heavyHand", (x) => x[0].spend === 3 && x[0].ops[1].amount === 2],
    ["rentier", (x) => x[0].ops[0].amount === 2 && x[0].ops[0].overheal],
    ["counterparty", (x) => x[0].ops[0].amount === 2 && x[0].ops.length === 1],
    ["quakeCap", (x) => x[0].play === 2 && x[0].ops[0].amount === 2],
    ["mutualMend", (x) => x[0].ops[0].amount === 2 && x[0].ops[0].alternateLane === 1],
    ["chequeCherub", (x) => x[0].ops[0].amount === 8 && x[0].ops[0].shield === 3],
    ["pyramidHead", (x) => x[0].play === 2],
    ["fundjin", (x) => x.every((p2) => p2.every === 60 && p2.spend === 6
      && p2.ops.filter((op) => op.do === "deal").every((op) => op.amount === 2))],
    ["auditAngel", (x) => x[0].ops[0].amount === 2 && x[0].ops[1].amount === 1],
    ["debtDragon", (x) => x[0].gain === 8 && x[0].ops.every((op) => op.amount === 4)],
    ["basilisk", (x) => x[0].spend === 2 && x[0].ops[0].amount === 2],
    ["sphinx", (x) => x[0].spend === 5 && x[0].ops[0].amount === 2],
  ];
  for (const [bodyKey, check] of passiveCases)
    ok(check(G.leveledPassives(ranked(bodyKey))), `${bodyKey} applies its authored Mastery and Specialty transform`);
  eq(G.leveledPassives(ranked("basilisk", 1, 99))[0].spend, 2,
    "Bankrupt Basilisk runtime cadence cannot fall below two even for stale ranks");
  eq(G.leveledPassiveText(ranked("basilisk", 1, 99)),
    "Every 2 moxie spent: poison the foe lane by 2.",
    "Bankrupt Basilisk runtime prose cannot advertise a cadence below two");
  for (const bodyKey of Object.keys(G.BODY_UPGRADES)) {
    const text = G.leveledPassiveText(ranked(bodyKey, 1, 2));
    ok(typeof text === "string" && text.length > 20, `${bodyKey} exposes readable ranked combat text`);
    ok(text !== G.BODIES[bodyKey].passiveText, `${bodyKey} ranked text does not fall back to rank-zero prose`);
  }
  ok(G.leveledPassiveText(ranked("frugal", 1, 0)).includes("living rats in this lane"),
    "Fat Cat Mastery combat prose reports its rat-count burst");
  eq(G.leveledBody(ranked("ratBaron")).costKind.amount, 2, "Rat Baron Mastery deepens its ranged discount");
  eq(G.leveledBody(ranked("neptune")).costAdd, 1, "Neptune Mastery reduces its card tax");
  eq(G.leveledBody(ranked("neptune")).doubleExpensive, 5, "Neptune Mastery lowers its replay threshold with the tax");
  eq(G.leveledBody(ranked("depressionDemon")).debuffMult, 2, "Depression Demon Mastery doubles debuff duration");
  eq(G.leveledBody(ranked("depressionDemon")).debuffMagnitude, 3, "Depression Demon Specialty adds 1 debuff magnitude per rank");
  eq(G.BODY_UPGRADES.depressionDemon.mastery.text, "Every debuff you apply lasts twice as long.",
    "Depression Demon Mastery registry text is exact");
  eq(G.BODY_UPGRADES.depressionDemon.specialty.text, "Every debuff you apply gains +1 magnitude per rank.",
    "Depression Demon Specialty registry text is exact");
  eq(G.leveledPassiveText({ bodyKey: "depressionDemon", levelAllocation: G.emptyLevelAllocation() }),
    "Every debuff you apply gains +2 magnitude.", "Depression Demon base runtime passive text is exact");
  eq(G.leveledPassiveText(ranked("depressionDemon", 1, 2)),
    "Every debuff you apply gains +4 magnitude. Every debuff you apply lasts twice as long.",
    "Depression Demon ranked runtime passive text is exact");
  eq(G.leveledPassiveText({ bodyKey: "killionaire", levelAllocation: G.emptyLevelAllocation() }),
    "Start each combat with 3 moxie. Whenever you defeat something, gain 1 moxie.",
    "Killionaire base runtime passive text includes its defeat reward");
  eq(G.leveledBody(ranked("medusa")).poisonOnDamage, 2, "Medusa Mastery doubles poison application");
  eq(G.leveledBody(ranked("wanderCastle")).shieldGainBonus, 2, "Castle Mastery lowers its threshold and Specialty grows shields");
  const started = (bodyKey, mastery = 1, specialty = 1) => {
    const c = { ...ranked(bodyKey, mastery, specialty), maxHp: 10, hp: 10, shield: 0, moxie: 0,
      counters: 0, meleeBonus: 0, rangedBonus: 0, regens: [] };
    G.applyCombatStart(c); return c;
  };
  const centaur = started("compound");
  ok(centaur.doubleNextOutput === 1 && centaur.moxie === 2, "Centaur rows modify its doubled opener and starting moxie");
  eq(started("compound", 0, 99).moxie, 10, "stale Centaur ranks cannot breach the global opening-moxie cap");
  const mouse = started("discountDuel");
  ok(mouse.counters === 2 && mouse.firstCardDiscount === 1, "Mouse rows modify opening damage and first-card cost");
  eq(started("bloodfund", 0, 1).moxie, 1, "Minotaur Specialty grants opening moxie instead of reactive shield");
  eq(started("counterparty", 0, 1).counters, 1, "Behemoth Specialty grants opening damage instead of reactive shield");
  const golem = started("juggernaut");
  ok(golem.shield === 15 && golem.shieldBreakDamage === 1, "Golem rows grant 150% starting shield and arm its break reward");
  const econ = started("econElemental");
  ok(econ.regens[0].seq[0] === 4 && econ.cycleLossShield === 2, "Economy rows upgrade both phases of its cycle");
  const wolf = started("warewolf");
  ok(wolf.warewolfMelee === 4 && wolf.dmgReduce === 2, "Warewolf rows strengthen wolf melee and human reduction");
  const killer = started("killionaire");
  ok(killer.moxie === 5 && killer.firstCardDiscount === 2, "Killionaire rows strengthen its opener and first discount");
  const anubis = started("affluenceAnubis");
  ok(anubis.regens[0].period === 60 && anubis.regens[0].growth === 3,
    "Anubis Mastery and Specialty grow each six-second rat wave instead of changing cadence or armor");
  const bookie = started("bonelord");
  ok(bookie.maxHp === 10 && bookie.regens[0].period === 120 && bookie.regens[0].count === 3,
    "Bookie Specialty expands its fixed twelve-second rat wave");
  const timeshare = started("timeshareTyrant");
  eq(timeshare.regens.find((g) => g.kind === "timeshare")?.period, 110,
    "Timeshare Specialty shortens Amalgamation service by one second per rank");
  const money = started("moneymancer");
  ok(money.regens[0].period === 50 && money.regens[0].discount === 4,
    "Moneymancer rows improve both discount cadence and strength");
  eq(started("oligarchyOoze").oozeStolenKey, null, "Oligarchy Ooze starts each combat with no held card");

  const r = G.newRoom("POINTS"); r.phase = "setup";
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, "bloodfund");
  p.deckList = Array(10).fill("oSword"); p.backpack = Array(260).fill("oSword");
  const base = G.BODIES.bloodfund.maxHp;
  ok(G.levelUp(r, p, Array(5).fill("oSword"), { hp: 1, melee: 0, ranged: 0, mastery: 0, specialty: 0 }),
    "L2 purchase can assign its new point to health atomically");
  eq(p.maxHp, base + 4, "one assigned health rank applies +4 HP");
  ok(G.levelUp(r, p, Array(10).fill("oSword"), { hp: 1, melee: 1, ranged: 0, mastery: 0, specialty: 0 }),
    "L3 purchase can assign the second point to melee");
  eq(`${p.levelMelee}:${p.levelRanged}`, "1:0", "melee/ranged derive directly from ranks");
  const hpBeforeRespec = p.hp / p.maxHp;
  ok(G.allocateLevel(r, p, { hp: 0, melee: 0, ranged: 2, mastery: 0, specialty: 0 }),
    "all earned points can be reallocated freely outside combat");
  eq(`${p.levelMelee}:${p.levelRanged}`, "0:2", "free reallocation takes effect immediately");
  ok(Math.abs(p.hp / p.maxHp - hpBeforeRespec) < 0.06, "reallocation preserves wound ratio when max HP changes");
  const frozen = JSON.stringify(p.levelAllocation);
  ok(!G.allocateLevel(r, p, { hp: 0, melee: 0, ranged: 3, mastery: 0, specialty: 0 }),
    "allocation cannot spend more points than the level earned");
  eq(JSON.stringify(p.levelAllocation), frozen, "an invalid reallocation is atomic");

  ok(G.allocateLevel(r, p, { hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 0 }),
    "a two-point one-time Mastery can consume the L3 budget");
  eq(G.allocationPoints("bloodfund", p.levelAllocation), 2, "Mastery charges its authored body-specific cost");
  ok(!G.validLevelAllocation("bloodfund", 9, { hp: 0, melee: 0, ranged: 0, mastery: 2, specialty: 0 }),
    "Mastery cannot be bought twice even at high level");
  ok(!G.validLevelAllocation("bloodfund", 5, { hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 2 }, true),
    "the capped Minotaur Specialty cannot buy a second rank");
  ok(G.validLevelAllocation("heavyHand", 3,
      { hp: 0, melee: 0, ranged: 0, mastery: 0, specialty: 2 }, true),
    "uncapped Specialties can still be bought repeatedly at their per-rank cost");

  const exact = { hp: 1, melee: 1, ranged: 0, mastery: 0, specialty: 1 };
  const foe = G.spawnEnemy("bloodfund", ["oSword"], 4, exact);
  eq(JSON.stringify(foe.levelAllocation), JSON.stringify(exact), "foes carry the same five-row allocation shape");
  eq(foe.maxHp, base + 4, "foe health derives from its assigned HP rank");
  eq(`${foe.meleeBonus}:${foe.rangedBonus}`, "1:0", "foe damage derives from its assigned stat ranks");
  for (let n = 0; n < 80; n++) {
    const a = G.randomLevelAllocation("atlas", 9);
    ok(G.validLevelAllocation("atlas", 9, a, true), "random foe allocation spends the exact legal budget");
  }

  r.unlockedBodies.add("frugal");
  ok(G.swapBody(r, p, "frugal", [], { hp: 0, melee: 1, ranged: 1, mastery: 0, specialty: 0 }) === "frugal",
    "body swap can atomically reinterpret the same run-wide points on the target body");
  eq(`${p.levelMelee}:${p.levelRanged}`, "1:1", "the target body's requested point split applies");

  const hr = G.newRoom("HP-RANKS"); hr.phase = "setup";
  const hp = G.addPlayer(hr, "hp", "HP"); G.wearBody(hp, "frugal"); hp.runLevel = 4;
  for (let rank = 1; rank <= 3; rank++) {
    ok(G.allocateLevel(hr, hp, { hp: rank, melee: 0, ranged: 0, mastery: 0, specialty: 0 }),
      `health rank ${rank} can be applied outside combat`);
    eq(hp.maxHp, G.bodyMaxHp(G.BODIES.frugal) + rank * 4,
      `health rank ${rank} grants exactly ${rank * 4} max HP total`);
  }

  const tr = G.newRoom("RANKED-TEXT"); tr.phase = "playing"; tr.laneCount = 1; tr.lanes = [[]]; tr.allies = [[]];
  const tp = G.addPlayer(tr, "tp", "TP"); G.wearBody(tp, "frugal"); tp.runLevel = 3;
  tp.levelAllocation = { hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 0 };
  G.applyBodyLevel(tp); tp.pspend = { 0: 1 };
  const ts = G.snapshot(tr), tsp = ts.players.find((x) => x.id === tp.id);
  ok(tsp.passive.includes("living rats in this lane"), "combat snapshot ships Fat Cat's ranked passive prose");
  eq(tsp.trackers.find((x) => x.id === "body:frugal:0")?.progress?.max, 3,
    "Fat Cat Mastery retains the three-damage summon threshold");
}

// Body-row functional regressions found in the all-body leveling audit.
{
  const { r, p } = rig("ratBaron", { inv: ["oComboBlade", "oArcane"] });
  p.levelAllocation = { hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 1 }; G.applyCombatStart(p);
  p.moxie = 5;
  G.playCard(r, p, p.hand.find((c) => c.key === "oComboBlade").id); // melee first
  G.playCard(r, p, p.hand.find((c) => c.key === "oArcane").id);     // first ranged second
  eq(p.moxie, 4, "Lizard Wizard refunds its first ranged card even after a melee opener");
}
{
  const { r, p, foe } = rig("pennyPixie", { inv: ["oComboBlade", "oSword"] });
  p.levelAllocation = { hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 1 }; G.applyCombatStart(p);
  let before = foe.hp; G.playCard(r, p, p.hand.find((c) => c.key === "oComboBlade").id);
  eq(before - foe.hp, 1, "Pixie Specialty does not boost a cost-1 melee card that received no discount");
  before = foe.hp; G.playCard(r, p, p.hand.find((c) => c.key === "oSword").id);
  eq(before - foe.hp, 3, "Pixie Specialty boosts a melee card that its body actually discounted");
}
{
  const { r, p, foe } = rig("mutualMend", { inv: [] });
  p.levelAllocation = { hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 1 };
  for (let i = 0; i < 4; i++) G.playTriggerPassives(r, p, "none");
  eq(1000 - foe.hp, 5, "Wageslave's second trigger keeps its front hit and also adds the Specialty lane hit");
}
{
  const { r, p } = rig("bribedBishop", { inv: [] });
  p.levelAllocation = { hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 2 };
  p.hp = 90; p.maxHp = 100;
  G.resolveOps(r, p, [{ do: "healSelf", amount: 20 }]);
  eq(p.counters, 2, "Bribed Bishop Mastery grants +2 damage on a heal");
  eq(p.shield, 11, "Bribed Bishop Specialty rank 2 converts 10 overheal into 11 shield");
}
{
  const { r, p, foe } = rig("atlas", { inv: [], pHp: 100 });
  p.levelAllocation = { hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 2 };
  G.damagePlayer(r, p, 8);
  eq(1000 - foe.hp, 8, "Atlas Mastery triggers at 8 damage and Specialty rank 2 raises SHRUG base damage to 8");
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
  ok(swarm.length >= 3, `swarm: several low-ante foes (${swarm.length}, minimum ⚖7 each)`);
  ok(swarm.length <= cap, `…and never more than the ${cap}-foe cap (4 per lane)`);
  ok(swarm.every((f) => f.level === 1 && (f.gear ?? []).length === G.FOE_MIN_CARDS),
     "…each level 1 with exactly the 3-card floor");
  ok(swarm.every((f) => !G.ELITE_SET.includes(f.bodyKey)),
     "…and every body is common so an elite premium cannot eat the swarm's count budget");
  // VETERAN concentrates into few high-LEVEL foes
  const vets = G.generateRoomFoes(party, budget, 3, "veteran");
  ok(vets.some((f) => f.level >= 3), "veteran: the budget went into LEVELS (a level-3+ foe appears)");
  ok(vets.length < swarm.length, "…and fewer bodies than a swarm");
  // ARSENAL — card COUNT stays retired; the 1–5 value bands activate its intended QUALITY lever.
  const ars = G.generateRoomFoes(party, budget, 3, "arsenal");
  ok(ars.every((f) => f.level === 1), "arsenal: levels stay 1 (never the LEVEL lever)");
  ok(ars.every((f) => (f.gear ?? []).length === G.FOE_MIN_CARDS),
     "arsenal: exactly the 3-card floor — COUNT remains retired (owner 2026-07-12)");
  ok(ars.some((f) => f.gear.some((k) => G.itemTreasure(k) > 1)),
     "arsenal: surplus ante becomes higher-quality cards from the active value-2–5 pool");
  eq(G.RICH_ITEM_POOL.length, 79, "RICH_ITEM_POOL contains every active value-2–5 card");
  ok(G.RICH_ITEM_POOL.every((k) => G.itemTreasure(k) >= 2),
     "RICH_ITEM_POOL contains only value-2–5 cards");
  // RETIRED-CARD GUARD (owner ruling 2026-07-19): no retired/archived card key may ever appear in
  // the pools that feed foe gear (enrichFoeGear), comp-item loot (rollCompItems), or the boss
  // shelf (RARE_POOL). ARCHIVED_PLAYER_CARDS is the authoritative retired marker (cards.js).
  ok(G.RICH_ITEM_POOL.every((k) => G.PLAYER_POOL.includes(k) && !G.ARCHIVED_PLAYER_CARDS.includes(k)),
     "RICH_ITEM_POOL never contains a retired/archived card key");
  ok(G.RARE_POOL.every((k) => G.PLAYER_POOL.includes(k) && !G.ARCHIVED_PLAYER_CARDS.includes(k)),
     "…nor does the boss-shelf RARE_POOL");
  ok(!G.RICH_ITEM_POOL.includes("oCrystalBall") && !G.RARE_POOL.includes("oCrystalBall"),
     "the archived Crystal Ball (castable, value 4 — would qualify without the guard) stays out");
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
  let under3 = false, offArch = false, noDamage = false, nonBaseValue = false;
  for (const body of G.MOXIE_SET) {
    for (let t = 0; t < 30; t++) {
      const kit = G.rollFoeKit(body, 3);
      if (kit.length < 3) under3 = true;
      if (kit.some((k) => G.itemTreasure(k) !== 1)) nonBaseValue = true;
      if (!kit.some((k) => G.itemFitsArchetype(body, k))) noDamage = true;          // sanity
      if (kit.some((k) => !G.itemFitsArchetype(body, k))) offArch = true;
      if (!kit.some((k) => G.itemThreatens(body, k))) noDamage = true;              // ≥1 real threat
    }
  }
  ok(!under3,   "every foe kit has at least 3 cards");
  ok(!nonBaseValue, "every BASE foe kit uses only value-1 cards; upgrades are budgeted separately");
  ok(!offArch,  "every kit card fits the body's archetype");
  ok(!noDamage, "every kit carries at least one card the body can deal damage with");
  // foeCombatStat reads the KIT's flavor, not the body
  eq(G.foeCombatStat("counterparty", ["oSword", "oHatchet"]), "melee", "a melee-heavy kit → melee stat");
  eq(G.foeCombatStat("counterparty", ["oFire", "oLightning"]), "ranged", "a ranged-heavy kit → ranged stat");
  // OWNER 2026-07-16: exactly one same-value replacement turns on passives that otherwise roll blank.
  ok(G.FOE_PASSIVE_SEED_BODIES.includes("depressionDemon") && G.FOE_PASSIVE_SEED_BODIES.includes("neptune"),
    "the targeted passive-seed roster is explicit and inspectable");
  let blankPassive = false, countDrift = false, anteDrift = false;
  for (const body of G.FOE_PASSIVE_SEED_BODIES) for (let t = 0; t < 100; t++) {
    const kit = G.rollFoeKit(body, 3);
    if (!G.foePassiveKitSatisfied(body, kit)) blankPassive = true;
    if (kit.length !== 3) countDrift = true;
    if (kit.reduce((n, k) => n + G.itemTreasure(k), 0) !== 3) anteDrift = true;
  }
  ok(!blankPassive, "every targeted foe receives one card that makes its passive relevant");
  ok(!countDrift && !anteDrift, "passive seeding preserves exactly 3 cards and the original 3 ante");
  ok(G.rollFoeKit("depressionDemon", 3).some((k) => k === "oIce"),
    "Depression Demon receives the value-1 debuff card that its duration passive can double");
  ok(G.rollFoeKit("neptune", 3).some((k) => (KIT[k]?.cost ?? 0) >= 5),
    "Neptune receives at least one base 5+ cost card for its expensive-card payoff");
  let exactBlank = false;
  for (const floor of [1, 2, 3]) for (let t = 0; t < 300; t++) {
    const foe = G.rollExactAnteFoe(floor * 9, floor);
    if (foe && !G.foePassiveKitSatisfied(foe.bodyKey, foe.gear)) exactBlank = true;
  }
  ok(!exactBlank, "Djinn Coercion's exact-ante foes never bypass the targeted passive seed");
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
  r.draftedFoes = [{ bodyKey: "rookie", gear: ["oDagger"], greedy: true, owner: "p" }]; // 4 base + 1 item, level-1 free = 5
  eq(G.roomValue(r), 5, "roomValue = stocked ante only (4 base + 1 item)");
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
    { bodyKey: "rookie", gear: ["oDagger"], greedy: true, owner: "p1" },     // 4 base + 1 item = 5
    { bodyKey: "rookie", gear: ["oMeteors", "oDagger"], greedy: true, owner: "p2" }, // 4 base + 4+1 items = 9
  ];
  eq(G.roomValue(r), 14, "roomValue still sums the stocked ante (base + card values + levels above 1)");
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
  eq(r.phase, "setup", "no minimum — the room begins immediately");
}

// ---- procedural branching map -----------------------------------------------------------
{
  eq(G.SHOP_ROOM_CHANCE, 0, "shops are retired from live map generation");
  let okShape = true, sawChoice = false, reasons = new Set();
  for (let t = 0; t < 40; t++) {
    const lvl = G.buildLevel();
    const byId = Object.fromEntries(lvl.nodes.map((n) => [n.id, n]));
    const start = byId[lvl.currentId];
    const bosses = lvl.nodes.filter((n) => n.type === "boss");
    if (bosses.length !== 1 || bosses[0].links.length !== 0) { okShape = false; reasons.add("boss"); }
    // ELITE ROOMS DISSOLVED (ante v2, owner 2026-07-02): buildLevel never mints the type anymore
    if (lvl.nodes.some((n) => n.type === "elite")) { okShape = false; reasons.add("elite-exists"); }
    const first = lvl.nodes.filter((n) => n.row === 1);
    if (first.length !== 3 || first.some((n) => n.type !== "combat")) { okShape = false; reasons.add("opening-shop"); }
    // links only point DOWN the map (forward-only DAG — fuzz walks links[0] to the boss)
    for (const n of lvl.nodes) for (const id of n.links) {
      if (!byId[id] || byId[id].y <= n.y) { okShape = false; reasons.add("backlink"); }
    }
    // every node except the start is enterable; every non-boss node has a way out
    for (const n of lvl.nodes) {
      if (n !== start && !lvl.nodes.some((m) => m.links.includes(n.id))) { okShape = false; reasons.add("orphan"); }
      if (n.type !== "boss" && n.links.length === 0) { okShape = false; reasons.add("dead-end"); }
    }
    if (lvl.nodes.some((n) => n.type === "shop")) { okShape = false; reasons.add("shop-exists"); }
    if (lvl.nodes.some((n) => n.links.length >= 2)) sawChoice = true;
  }
  ok(okShape, `40 generated maps are sound (${[...reasons].join(",") || "all good"})`);
  ok(sawChoice, "maps actually branch (some node offers ≥2 exits)");

  // Worst-case RNG cannot reintroduce the retired shop type: all route nodes stay fights.
  const realRandom = Math.random;
  try {
    Math.random = () => 0;
    const lvl = G.buildLevel(1);
    ok(lvl.nodes.filter((n) => n.row === 1).every((n) => n.type === "combat"),
      "the first visible set is three Fights even under all-Shop RNG");
    ok(lvl.nodes.every((n) => n.type !== "shop"), "later rows cannot roll a retired Shop");
    const rows = Object.groupBy(lvl.nodes.filter((n) => n.row > 0 && n.row < 6), (n) => n.row);
    ok(Object.values(rows).every((row) => row.some((n) => n.type === "combat")),
      "every later offer still keeps at least one Fight");
  } finally { Math.random = realRandom; }
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

// ---- back-line damage-over-time death is atomic: no null boss clock later in the same tick ------
{
  const poison = bossRig("hydra", { players: 1 });
  poison.boss.castBars[0].charge = poison.boss.castBars[0].cd - 1;
  const poisonHeads = poison.r.lanes.flat().length;
  poison.boss.hp = 1; poison.boss.poison = 1; poison.boss.poisonClock = G.POISON_PERIOD - 1;
  let poisonCrash = false;
  try { G.simulateTick(poison.r); } catch { poisonCrash = true; }
  ok(!poisonCrash && poison.r.boss === null && poison.r.lanes.flat().length === poisonHeads,
    "poison may kill/remove a back-line boss before its due clock without a null dereference or post-death action");

  const leech = bossRig("hydra", { players: 1 });
  leech.boss.castBars[0].charge = leech.boss.castBars[0].cd - 1;
  const leechHeads = leech.r.lanes.flat().length;
  leech.boss.hp = 1;
  leech.boss.leeches = [{ src: leech.ps[0], amount: 1, period: 1, charge: 0 }];
  let leechCrash = false;
  try { G.simulateTick(leech.r); } catch { leechCrash = true; }
  ok(!leechCrash && leech.r.boss === null && leech.r.lanes.flat().length === leechHeads,
    "a leech may kill/remove a back-line boss before its due clock without a null dereference or post-death action");
}

// ---- the scaling contract: budget = players × floor, threaded into every knob --------
{
  eq(G.BOSS_DIFFICULTY, 0.5, "boss difficulty contract is exactly one-half");
  eq(G.bossDifficultyValue(1), 1, "positive boss values retain a one-point minimum");
  eq(G.bossDifficultyValue(2), 1, "even boss potency halves exactly");
  eq(G.bossDifficultyValue(3), 2, "odd boss potency halves and rounds up");
  eq(G.bossDifficultyValue(9, G.minFoeAnte()), G.minFoeAnte(),
    "boss values may preserve a higher authored/legal minimum");
  eq(G.bossBudget(1, 1), 1, "budget floor: solo floor 1 = 1 unit");
  eq(G.bossBudget(4, 3), 12, "budget ceiling: 4P floor 3 = 12 units");
  let okGrid = true;
  for (const key of G.BOSS_BODIES) for (let n = 1; n <= 4; n++) for (let f = 1; f <= 3; f++) {
    const { r, boss } = bossRig(key, { players: n, floor: f });
    if (boss.maxHp !== Math.round(G.bodyMaxHp(BODIES[key]) * n * f)) okGrid = false;
    if (["hydra", "kraken"].includes(key) && r.laneCount !== 4) okGrid = false;
    if (key === "kraken" && G.tentacleCount(r) !== 0) okGrid = false;
    if (BODIES[key].backline ? !r.boss : r.lanes.flat()[r.lanes.flat().length - 1]?.bodyKey !== key) okGrid = false;
  }
  ok(okGrid, "scaling grid xy∈{1..12}: boss HP scales by present humans × floor; Hydra/Kraken open across four lanes without a free wall");
}

// ---- back-line architecture: spans lanes, lane attribution, melee = back wall --------
// (uses the Lich so the generic back-line contract stays independent of Hydra's authored four-lane exception)
{
  const { r, ps, boss } = bossRig("litigationLich", { players: 2 });
  ok(r.boss === boss && r.lanes.flat().length === 0, "back-line boss lives behind the lanes, not in one");
  eq(G.aimedFoe(r, ps[0], "front")?.foe, boss, "melee reaches the boss when its lane is clear (the back wall)");
  const blocker = G.spawnFoeInLane(r, "rat", 0);
  eq(G.aimedFoe(r, ps[1], "front")?.foe, boss,
    "a clear lane reaches its back-line boss before breaching sideways into another lane");
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

// ---- shared authored boss deck: one scaled action + draw/discard exhaustion ----------
{
  const authored = ["hydra", "djinn", "litigationLich", "kraken", "kingMimic"];
  for (const key of authored) for (const players of [1, 2, 4]) {
    const { boss } = bossRig(key, { players });
    eq(boss.castBars.length, 1, `${key}: exactly one authored action is active with ${players} players`);
    eq(boss.castBars[0].playerScale, players, `${key}: the one action captures its ${players}-player scale`);
    eq(boss.bossDeck.length + boss.castBars.length, G.BOSS_DEFS[key].cards.length,
      `${key}: opening bars are drawn from its authored deck`);
    eq(boss.bossDiscard.length, 0, `${key}: discard opens empty`);
  }
  const { r, boss } = bossRig("hydra", { players: 1 });
  const hp = boss.hp = boss.maxHp - 7;
  G.initBossDeck(r, boss, 1);
  eq(boss.hp, hp, "initializing/rebuilding boss action bars preserves current HP");
  const seen = [];
  for (let i = 0; i < G.BOSS_DEFS.hydra.cards.length; i++) {
    seen.push(boss.castBars[0].cardKey);
    boss.castBars[0].charge = boss.castBars[0].cd - 1;
    G.tickBossDeck(r, boss);
    if (i < G.BOSS_DEFS.hydra.cards.length - 1) ok(boss.bossDiscard.length > 0, "played boss cards rest in discard while draw remains");
  }
  eq([...seen].sort().join(), G.BOSS_DEFS.hydra.cards.map((c) => c.key).sort().join(),
    "boss exhausts every authored card before recycling");
  eq(boss.bossDiscard.length, 0, "dry draw pile reshuffles discard only at the exhaustion seam");
  for (let floor = 1; floor <= 3; floor++) {
    const foe = G.rollExactAnteFoe(floor * 9, floor);
    eq(foe && G.anteOfFoe(foe), floor * 9,
      `Coercion can construct one exact floor × 9 ante foe on floor ${floor}`);
  }
  { const scaled = bossRig("litigationLich", { players: 2, floor: 2 });
    const bar = { cardKey: "annihilate", playerScale: 2 };
    const before = G.bossCardDamage(scaled.r, scaled.boss, bar);
    scaled.ps[1].gone = true;
    eq(G.bossCardDamage(scaled.r, scaled.boss, bar), before,
      "an already-telegraphed action keeps its captured scale through a disconnect"); }
}

// ---- Hyper-Inflation Hydra: 6s core and exact authored card effects -------------
{
  const { r, ps, boss } = bossRig("hydra", { players: 2, floor: 2 });
  const heads = (lane = null) => (lane == null ? r.lanes.flat() : r.lanes[lane])
    .filter((f) => f.bodyKey === "hydraHead" && f.hp > 0)
    .reduce((count, stack) => count + (stack.ratCount ?? stack.hp ?? 1), 0);
  eq(r.laneCount, 4, "Hydra expands every party size into one true four-lane fight");
  eq(heads(), 0, "Hydra has no retired five-head opening — core/deck are exact");
  eq(boss.coreClocks[0].cd, 60, "Hydra core is exactly 6 seconds");
  G.fireBossClock(r, boss, boss.coreClocks[0]);
  ok(boss.counters === 1 && heads() === 1, "first core: gain +1, summon heads equal current +1s");
  G.fireBossClock(r, boss, boss.coreClocks[0]);
  ok(boss.counters === 2 && heads() === 2, "second core: half-strength current +1s summon one more head");

  G.resolveBossCard(r, boss, { cardKey: "swarm" });
  boss.bossEffects.swarm.charge = 59; const hs = heads(); G.tickBossClocks(r, boss);
  eq(heads(), hs + 2, "one Swarm card scales its recurring head count to two players");
  boss.hp = boss.maxHp - 10;
  G.resolveBossCard(r, boss, { cardKey: "regenerate" });
  boss.bossEffects.regenerate.charge = 59; G.tickBossClocks(r, boss);
  eq(boss.hp, boss.maxHp - 6, "one Regenerate card scales its healing to two players");
  const ongoing = G.snapshot(r).boss.threats.filter((t) => t.persistent);
  ok(ongoing.some((t) => /^Swarm/.test(t.label) && t.cd === 60)
      && ongoing.some((t) => /^Regenerate/.test(t.label) && t.cd === 60),
    "Hydra's active recurring card effects remain visible as labeled 6-second bars");
  ok(ongoing.some((t) => t.intent === "Summon 2 heads into random lanes")
      && ongoing.some((t) => t.intent === "Heal 4"),
    "Hydra recurring bars explicitly name their captured multiplayer outcome");
  eq(G.bossCardIntent(r, boss, { cardKey: "swarm", playerScale: 2 }),
    "Arm a 6s clock that summons 2 heads into random lanes",
    "Swarm's card intent states its independently-random lane placement");

  const laneHeads = heads(0);
  G.damageEnemy(r, 0, boss, 1, ps[0]);
  eq(heads(0), laneHeads, "before Heads Up, damage creates no retired implicit head");
  G.resolveBossCard(r, boss, { cardKey: "headsUp" });
  G.damageEnemy(r, 0, boss, 1, ps[0]);
  eq(heads(0), laneHeads + 2, "Heads Up scales its per-hit summons to two players");

  const c0 = boss.counters, h0 = heads();
  G.resolveBossCard(r, boss, { cardKey: "inflation" });
  ok(boss.counters === c0 + 2 && heads() === h0 + G.bossDifficultyValue(c0 + 1) * 2,
    "one Inflation card gains and summons once per captured player");
  const biteLane = 1, biteHeads = heads(biteLane), hp0 = ps[1].hp;
  G.resolveBossCard(r, boss, { cardKey: "bite", lane: biteLane });
  eq(hp0 - ps[1].hp, G.bossCardDamage(r, boss, { cardKey: "bite", lane: biteLane }),
    "one Bite scales its melee/head damage to the two-player action");
  eq(G.bossCardIntent(r, boss, { cardKey: "bite", lane: biteLane }),
    `Lane ${biteLane + 1} front takes ${G.bossCardDamage(r, boss, { cardKey: "bite", lane: biteLane })}`,
    "Hydra Bite intent reads the same half-strength resolver value");
  const snap = G.snapshot(r).boss;
  eq(snap.castBars.length, 1, "Hydra snapshot ships one server-authoritative cast bar");
  ok(snap.threats.filter((t) => t.castBar).length === 1, "renderer receives one scaled authored action");
  { const n = G.bossDifficultyValue(boss.counters + 1);
    ok(snap.threats.some((t) => t.intent === `Gain +1 melee; summon ${n} head${n === 1 ? "" : "s"} into random lanes`),
      "Hydra core clock tells the command panel exactly what its next resolution does"); }
}

// ---- Hydra four-lane targeting, random head placement, and rat-style head stacks ----
{
  const { r, ps, boss } = bossRig("hydra", { players: 1, floor: 1 });
  const p = ps[0];
  for (let lane = 0; lane < 4; lane++) {
    p.lane = lane;
    p.targetId = boss.id;
    const aimed = G.aimedFoe(r, p, "pick");
    eq(aimed?.foe, boss, `Hydra is targetable from lane ${lane + 1}`);
    eq(aimed?.lane, lane, `a Hydra hit from lane ${lane + 1} keeps that lane attribution`);
    const before = boss.hp;
    G.resolveOps(r, p, [{ do: "attack" }]);
    ok(boss.hp < before, `Hydra is attackable from lane ${lane + 1}`);
  }
}

{
  const { r, boss } = bossRig("hydra", { players: 1, floor: 1 });
  boss.counters = 9; // existing Inflation formula now summons 5 heads; no balance value changes
  const realRandom = Math.random;
  const rolls = [0.01, 0.10, 0.26, 0.51, 0.99];
  try {
    Math.random = () => rolls.shift() ?? 0;
    G.resolveBossCard(r, boss, { cardKey: "inflation", playerScale: 1 });
  } finally { Math.random = realRandom; }
  const laneHeadCounts = r.lanes.map((lane) => lane
    .filter((foe) => foe.bodyKey === "hydraHead")
    .reduce((count, stack) => count + (stack.ratCount ?? 1), 0));
  eq(laneHeadCounts.join(","), "2,1,1,1",
    "each generic Hydra head independently consumes one RNG roll and lands in that valid lane");
  ok(r.lanes.every((lane) => lane.filter((foe) => foe.bodyKey === "hydraHead").length <= 1),
    "random heads in the same lane merge into one stack instead of adding extra actions");
}

{
  const { r, ps, boss } = bossRig("hydra", { players: 1, floor: 1 });
  G.resolveBossCard(r, boss, { cardKey: "headsUp", playerScale: 1 });
  ps[0].lane = 3;
  G.damageEnemy(r, 3, boss, 1, ps[0]);
  G.damageEnemy(r, 3, boss, 1, ps[0]);
  const stacks = r.lanes.map((lane) => lane.filter((foe) => foe.bodyKey === "hydraHead"));
  ok(stacks.slice(0, 3).every((lane) => lane.length === 0)
      && stacks[3].length === 1 && stacks[3][0].ratCount === 2,
    "Heads Up keeps both grown heads in the attacking lane and merges them there");
}

{
  const { r, ps } = bossRig("hydra", { players: 1, floor: 1 });
  ps[0].lane = 2;
  const first = G.spawnFoeInLane(r, "hydraHead", 2);
  const second = G.spawnFoeInLane(r, "hydraHead", 2);
  const stack = G.spawnFoeInLane(r, "hydraHead", 2);
  ok(first === second && second === stack && r.lanes[2].length === 1,
    "three same-lane heads are one target with one timer");
  ok(stack.hp === 3 && stack.maxHp === 3 && stack.ratCount === 3 && G.effAtk(stack) === 3,
    "head-stack HP, living count, and combined bite all equal three");

  const hp0 = ps[0].hp, events0 = (r.damageEvents ?? []).length;
  for (let tick = 0; tick < 40; tick++) G.tickOwnTimers(r, stack);
  eq(hp0 - ps[0].hp, 3, "all three living heads bite simultaneously for three damage");
  eq(r.damageEvents.length - events0, 1, "the combined bite resolves as one damage action, not three noisy hits");
  eq(r.damageEvents.at(-1)?.source?.bodyName, "3 Hydra Heads",
    "structured damage history names the live head count that attacked");

  G.damageEnemy(r, 2, stack, 1, ps[0]);
  ok(stack.hp === 2 && stack.maxHp === 2 && stack.ratCount === 2 && G.effAtk(stack) === 2,
    "partial damage removes one head and immediately lowers the combined bite");
  const snapHead = G.snapshot(r).lanes[2].enemies.find((foe) => foe.id === stack.id);
  ok(snapHead?.stackCount === 2 && snapHead.name === "2 Hydra Heads"
      && snapHead.atk === 2 && /2 living heads bite together for 2/.test(snapHead.passive),
    "snapshot name/count/HP-scaled attack text all describe the surviving stack truthfully");

  const defeats = r.defeated?.foe ?? 0;
  G.damageEnemy(r, 2, stack, 99, ps[0]);
  ok(!r.lanes[2].includes(stack) && r.defeated.foe === defeats + 1,
    "overkill removes the one merged head pool and records one rat-style stack defeat");
}

// ---- Litigation Lich: stances cap/soften, toggle on the clock, telegraphed -----------
{
  const { r, boss } = bossRig("litigationLich", { players: 1 });
  boss.hp = boss.maxHp = 100; // isolate stance mitigation semantics from the separately-tested main-body HP contract
  eq(boss.stance, "objection", "the Lich opens in OBJECTION");
  const hp0 = boss.hp;
  G.damageEnemy(r, 0, boss, 7);
  eq(hp0 - boss.hp, 1, "OBJECTION: every hit it takes is capped at 1");
  G.fireBossClock(r, boss, boss.coreClocks[0]);
  eq(boss.stance, "recess", "the stance clock flips to recess");
  G.damageEnemy(r, 0, boss, 7);
  eq(hp0 - boss.hp, 1 + 6, "recess: hits deal 1 less than rolled");
  G.damageEnemy(r, 0, boss, 1);
  eq(hp0 - boss.hp, 1 + 6 + 1, "recess: a point always slips through (the ≥1 floor survives)");
  G.fireBossClock(r, boss, boss.coreClocks[0]);
  eq(boss.stance, "objection", "stances alternate");
  boss.timers = [{ ops: [{ do: "deal", amount: 1, target: "front" }], period: 60, charge: 17 }];
  const snap = G.snapshot(r);
  ok(snap.boss && snap.boss.stance === "objection" && /OBJECTION/.test(snap.boss.stanceLabel),
    "the stance is telegraphed in the snapshot");
  ok(snap.boss.threats.length === 2, "both Lich clocks ship as labeled bars");
  ok(snap.boss.threats.some((t) => /Switch to RECESS/.test(t.intent)),
    "Lich stance clock names the next defensive state instead of exposing an unlabeled timer");
  eq(snap.boss.effects[0]?.left, 43, "player-applied timed effects ship on the back-line boss too");
}

// ---- Litigation Lich: exact updated deck, while 1-max / 1-less stance stays independent ----
{
  { const { r: solo, boss: soloBoss } = bossRig("litigationLich", { players: 1, floor: 1 });
    eq(soloBoss.castBars.length, 1, "solo floor-1 Lich has exactly one 4.5s action bar");
    eq(soloBoss.castBars[0].cd, 45, "solo Lich keeps the authored 45-tick deck cadence");
    G.resolveBossCard(solo, soloBoss, { cardKey: "boneLegjon" });
    eq(solo.lanes.flat().length, 1, "floor-1 Bone Legjon adds one ordinary body, not two");
    G.resolveBossCard(solo, soloBoss, { cardKey: "frostOrb", lane: 0 });
    const ss = G.snapshot(solo);
    eq(ss.lanes.flatMap((lane) => lane.enemies).length + (ss.boss ? 1 : 0), 3,
      "first-cycle solo crowd is Lich + one Legjon body + one Frost Orb");
    const soloOrb = solo.lanes.flat().find((foe) => foe.bodyKey === "frostOrb");
    ok(soloOrb?.maxHp === 3 && soloOrb.dmgMul === G.BOSS_DIFFICULTY,
      "floor-1 Frost Orb keeps one body but halves both its HP and outgoing potency"); }

  const { r, ps, boss } = bossRig("litigationLich", { players: 2, floor: 2 });
  eq(G.BOSS_DEFS.litigationLich.cards.map((c) => c.label).join("|"),
    "Bone Legjon|Power Word: Annihilate|Eye Beam|Frost Orb|Life Drain",
    "Lich authored deck is exact, including Bone Legjon spelling");

  G.resolveBossCard(r, boss, { cardKey: "boneLegjon" });
  const legion = r.lanes.flat();
  eq(legion.length, 2, "one Bone Legjon card scales its floor count to two players");
  ok(legion.every((f) => G.anteOfFoe({ bodyKey: f.bodyKey, level: f.level, gear: f.equipment.map((x) => x.key) }) === G.minFoeAnte()),
    "every Bone Legjon summon is a minimum-ante ordinary foe");
  r.lanes = r.lanes.map(() => []);
  for (let floor = 1; floor <= 3; floor++) {
    const coerced = G.rollExactAnteFoe(floor * 9, floor);
    eq(G.anteOfFoe(coerced), floor * 9, `Coercion construction is exact at floor ${floor}`);
  }

  G.beginCombatMetrics(r);
  ps[0].hp = 40; ps[1].hp = 70;
  ps[1].shield = 2;
  const annihilateBar = { cardKey: "annihilate", label: "Power Word: Annihilate" };
  eq(G.bossCardIntent(r, boss, annihilateBar), "Highest-HP hero takes 10 damage",
    "Annihilate exposes its actual targeting/effect rule before it fires");
  eq(G.bossCardDamage(r, boss, annihilateBar), 10, "Annihilate publishes one scaled two-player hit");
  eq(G.bossCardTargets(r, boss, annihilateBar)[0]?.id, ps[1].id,
    "Annihilate visibly points at the current highest-HP hero");
  G.resolveBossCard(r, boss, annihilateBar);
  ok(ps[0].hp === 40 && ps[1].hp === 62 && ps[1].shield === 0,
    "Power Word: Annihilate preserves two bars of pressure in one scaled hit");
  ok(r.combatLog.some((line) => /10 to .*Annihilate.*shield 2→0/.test(line)),
    "Annihilate logs the normal resolved-damage and shield chain");
  const annihilateEvent = r.bossEvents.at(-1);
  ok(annihilateEvent.cardKey === "annihilate" && annihilateEvent.targets[0].hpLost === 8
      && annihilateEvent.targets[0].hpAfter === 62,
    "the bounded boss event records Annihilate's actual target and HP delta for defeat telemetry");
  const annihilateDamage = r.damageEvents.at(-1);
  ok(!annihilateDamage.direct && !annihilateDamage.pierce && annihilateDamage.cause.key === "annihilate"
      && annihilateDamage.requested === 10 && annihilateDamage.hpBefore === 70 && annihilateDamage.hpAfter === 62
      && annihilateDamage.hpLost === 8 && !annihilateDamage.lethal,
    "the structured damage ledger records Annihilate as ordinary sourced damage");
  { const pm = G.combatMetricsSummary(r).players.find((player) => player.seat === ps[1].id);
    ok(pm.hpDamage >= 8 && pm.shieldDamageAbsorbed >= 2,
      "Annihilate's HP loss and shield absorption are included in combat telemetry"); }
  ps[0].hp = ps[1].hp = 100; ps[0].lane = ps[1].lane = 1; ps[0].depth = 0; ps[1].depth = 1;
  G.resolveBossCard(r, boss, { cardKey: "eyeBeam", lane: 1 });
  ok(ps[0].hp === 94 && ps[1].hp === 94, "one Eye Beam scales its lane hit to two players");

  G.resolveBossCard(r, boss, { cardKey: "frostOrb", lane: 0 });
  const orb = r.lanes.flat().find((f) => f.bodyKey === "frostOrb");
  ok(orb && orb.hp === 10 && orb.maxHp === 10, "one Frost Orb scales its body HP to two players");
  ok(orb.rangedBonus === 2 && orb.dmgMul === G.BOSS_DIFFICULTY && orb.queue[0]?.key === "oBlizzard",
    "Frost Orb keeps its authored Blizzard/ranged bonus and halves only the spawned instance's output");
  { const orbQueue = G.snapshot(r).lanes.flatMap((lane) => lane.enemies)
      .find((foe) => foe.id === orb.id)?.queue?.[0];
    eq(orbQueue?.hit, G.foeItemDmg(r, orb, "oBlizzard"),
      "Frost Orb queue preview uses the same half-strength total as the resolver");
    eq(orbQueue?.hit, 3, "floor-2 Frost Orb's actual Blizzard hit is exactly 3");
    eq(orbQueue?.dmgNow, "3🎯", "Frost Orb's visible damage label is the exact reduced ranged hit");
    eq(orbQueue?.boosted, false, "a reduced hit equal to card base is not falsely highlighted as boosted");
    eq(G.foeThreats(r, orb).find((threat) => threat.kind === "cast")?.dmg, 3,
      "Frost Orb's cast threat advertises the same exact reduced hit");
    ps[0].lane = ps[1].lane = 0; ps[0].depth = 0; ps[1].depth = 1;
    ps[0].hp = ps[1].hp = 100; orb.moxie = G.MOXIE_CAP;
    ok(G.foeCast(r, orb), "a funded Frost Orb resolves its authored Blizzard through the real foe-cast path");
    ok(ps[0].hp === 97 && ps[1].hp === 97,
      "Frost Orb actually deals the same 3 damage to every hero that its queue and threat advertise"); }

  boss.hp = boss.maxHp - 20; ps[0].hp = 100; ps[0].lane = 0; ps[1].lane = 1;
  G.resolveBossCard(r, boss, { cardKey: "lifeDrain", lane: 0 });
  ok(ps[0].hp === 94 && boss.hp === boss.maxHp - 14,
    "one Life Drain scales its damage and healing to two players");
  const snap = G.snapshot(r).boss;
  ok(snap.stance === "objection" && snap.castBars.length === 1,
    "snapshot keeps exact stance truth beside one scaled authored action");
}

// ---- exact death chain: half-strength Annihilate deals 3, then Mouse's Sword is lethal --------
{
  const { r, ps, boss } = bossRig("litigationLich", { players: 1, floor: 1 });
  const p = ps[0]; p.name = "Dako"; G.wearBody(p, "hedge"); p.maxHp = p.hp = 7;
  G.resolveBossCard(r, boss, { cardKey: "annihilate", label: "Power Word: Annihilate" });
  const mouse = G.spawnEnemy("discountDuel", []); mouse.side = "foe"; mouse.lane = 0; mouse.counters = 2;
  r.lanes[0] = [mouse];
  G.resolveOps(r, mouse, KIT.oSword.ops, KIT.oSword.type, 0, "melee", "oSword");
  const [annihilate, lethal] = r.damageEvents.slice(-2);
  ok(annihilate.cause.key === "annihilate" && annihilate.requested === 3
      && annihilate.hpBefore === 7 && annihilate.hpAfter === 4,
    "death ledger keeps the earlier half-strength Lich floor-×5 hit in the target's chain");
  ok(lethal.cause.key === "oSword" && lethal.source.bodyKey === "discountDuel"
      && lethal.afterDefense === 4 && lethal.hpBefore === 4 && lethal.hpAfter === 0
      && lethal.hpLost === 4 && lethal.lethal,
    "death ledger identifies Mouse's 4-damage Sword as the lethal follow-up");
  const liveSnap = G.snapshot(r);
  const downCause = liveSnap.players.find((player) => player.id === p.id)?.downCause;
  ok(liveSnap.damageEvents == null && downCause?.eventId === lethal.id
      && /Malevolent Mouse.*Sword/.test(downCause.label) && downCause.hpLost === 4,
    "a downed co-op body exposes its exact lethal cause while combat is still playing without streaming the full damage ledger");
  eq(downCause.sourceBodyName, "Malevolent Mouse",
    "the compact death callout receives a structured source body name");
  r.phase = "lost";
  const snap = G.snapshot(r);
  ok(snap.damageEvents.at(-1).cause.name === "Sword" && snap.damageEvents.at(-1).target.label === "Paid Piper (Dako)",
    "defeat snapshot ships the exact lethal card and an unambiguous body/player target label");
}

// ---- item-entities: HP = gold cost, attack with the item's own op on its cd ----------
{
  const { r, ps } = bossRig("djinn", { players: 1 });
  const fe = G.spawnItemEntity(r, "oSword", 0);
  eq(fe.hp, G.itemTreasure("oSword"), "entity HP = the item's value (owner Sword → 1)");
  eq(G.spawnItemEntity(r, "oDagger", 0).hp, 1, "…a tier-1 card entity has 1 HP");
  eq(G.spawnItemEntity(r, "oBlackHole", 0).hp, 5, "…a tier-5 card entity has 5 HP");
  eq(fe.equipment[0].key, "oSword", "the entity wields the item itself");
  const hp0 = ps[0].hp;
  fe.equipment[0].charge = fe.equipment[0].cd;
  fe.moxie = G.MOXIE_CAP;   // moxie world: the entity casts via foeCast — fund the cast (START_MOXIE is 0 now)
  G.simulateTick(r);
  eq(ps[0].hp, hp0 - 2, "its op fires through the ordinary resolver (Sword: 2 to the lane front)");
  const snap = G.snapshot(r);
  const card = snap.lanes[0].enemies.find((e) => e.id === fe.id);
  ok(/Conjured/.test(card.name), "the conjured entity is visibly the item");
  const bow = G.spawnItemEntity(r, "oBow", 0);
  const blackHole = G.spawnItemEntity(r, "oBlackHole", 0);
  const powerUp = G.spawnItemEntity(r, "oPowerUp", 0);
  const intents = G.snapshot(r).lanes[0].enemies;
  const bowIntent = intents.find((e) => e.id === bow.id).queue[0];
  const boardIntent = intents.find((e) => e.id === blackHole.id).queue[0];
  const utilityIntent = intents.find((e) => e.id === powerUp.id).queue[0];
  ok(bowIntent.harm && bowIntent.scope === "aimed", "Animated Bow ships AIM intent instead of lying FRONT");
  ok(boardIntent.harm && boardIntent.scope === "all-lanes", "Animated Black Hole ships ALL intent instead of lying FRONT");
  ok(!utilityIntent.harm && utilityIntent.scope == null, "a utility Animated Item ships no fake attack scope");
  eq(utilityIntent.text, G.KIT.oPowerUp.text, "utility intent ships its authored effect prose for hold inspection");
  const totem = G.spawnFoeInLane(r, "totem", 0);
  const auraIntent = G.snapshot(r).lanes[0].enemies.find((e) => e.id === totem.id);
  eq(auraIntent.aura.dmgReduce, 1, "hostile aura tokens ship their live lane-protection effect");
}

// ---- Djinn of Deals: four lanes, authored cards, post-card movement, copies/hazard ----
{
  const solo = bossRig("djinn", { players: 1, floor: 1 });
  ok(solo.r.laneCount === 4 && solo.r.lanes.length === 4 && solo.r.allies.length === 4,
    "Djinn always forces four live lanes, including solo");
  eq(G.BOSS_DEFS.djinn.cards.map((c) => c.label).join("|"),
    "Coercion|Duplicity|Scorch|Tornado|Animate Kitchen", "Djinn authored deck is exact");

  const { r, ps, boss } = bossRig("djinn", { players: 2, floor: 2 });
  ok(!r.boss && r.lanes.flat().includes(boss), "the real Djinn is lane-bound");
  { const snap = G.snapshot(r);
    ok(!snap.boss && snap.bossUi?.id === boss.id && snap.bossUi.laneBound
        && snap.bossUi.lane === boss.lane && snap.bossUi.threats.length === boss.castBars.length,
      "lane-bound Djinn ships the same boss command-panel contract without duplicating back-line semantics");
    eq(snap.lanes.flatMap((lane) => lane.enemies).filter((foe) => foe.id === boss.id).length, 1,
      "the real Djinn remains exactly one authoritative lane entity beside its presentation-only bossUi"); }
  G.spawnFoeInLane(r, "rat", 2); G.spawnFoeInLane(r, "largeRat", 2); G.spawnFoeInLane(r, "rat", 3);
  const hpBeforeScorch = ps.map((p) => p.hp);
  G.resolveBossCard(r, boss, { cardKey: "scorch" });
  ok(ps.every((p, i) => p.hp === hpBeforeScorch[i] - 6),
    "one Scorch preserves two players of pressure in one all-lane action");
  ok(boss.lane === 2 && r.lanes[2][r.lanes[2].length - 1] === boss,
    "after the actual card, Djinn moves to the BACK of the other lane with the most bodies");

  const ordinaryBefore = r.lanes.flat().filter((f) => !BODIES[f.bodyKey]?.boss).length;
  const ordinaryIdsBefore = new Set(r.lanes.flat().map((foe) => foe.id));
  G.resolveBossCard(r, boss, { cardKey: "coercion" });
  const ordinary = r.lanes.flat().filter((f) => !BODIES[f.bodyKey]?.boss);
  eq(ordinary.length, ordinaryBefore + 2, "one Coercion summons one exact-ante foe per player");
  const coerced = ordinary.filter((f) => !ordinaryIdsBefore.has(f.id));
  ok(coerced.every((foe) => G.anteOfFoe({ bodyKey: foe.bodyKey, level: foe.level,
      gear: foe.equipment.map((x) => x.key) }) === 9),
    "every Coercion foe keeps the solo exact-ante value");
  eq(G.bossCardIntent(r, boss, { cardKey: "coercion" }), "Summon 2 foes worth ⚖9 each",
    "Coercion intent reads the same exact reduced ante used by its resolver");

  const copiesBefore = r.lanes.flat().filter((f) => f.falseDjinn).length;
  for (const p of ps) p.targetId = boss.id;
  G.resolveBossCard(r, boss, { cardKey: "duplicity" });
  const copies = r.lanes.flat().filter((f) => f.falseDjinn);
  eq(copies.length, copiesBefore + 6, "one Duplicity scales false-copy count to two players");
  ok(copies.every((f) => f.bodyKey === "djinn" && f.name === BODIES.djinn.name && f.hp === 1 && f.maxHp === 1
      && f.castBars.length === boss.castBars.length
      && f.castBars.every((bar, i) => bar.cardKey === boss.castBars[i].cardKey && bar.fake)),
    "false copies look like Djinn, die in one hit, and mirror every real cast bar");
  const fake = copies[0], fakeLane = fake.lane, fakeHp = ps.map((p) => p.hp);
  Object.assign(fake.castBars[0], { cardKey: "scorch", label: "Scorch", charge: fake.castBars[0].cd - 1 });
  G.tickBossClocks(r, fake);
  ok(ps.every((p, i) => p.hp === fakeHp[i]) && fake.lane === fakeLane, "false-copy casts are complete no-ops, including no movement");
  ok(fake.castBars.every((bar, i) => bar.cardKey === boss.castBars[i].cardKey && bar.charge === boss.castBars[i].charge),
    "a false copy immediately resynchronizes to the real Djinn instead of drawing its own deck");

  boss.shield = 7; boss.moxie = 6; boss.counters = 2; boss.poison = 3; boss.poisonClock = 17;
  G.addBuff(boss, "power", 2, 45); G.addBuff(boss, "weakness", 0, 50);
  boss.castBars[0].charge = Math.max(1, boss.castBars[0].cd - 3);
  const illusion = G.snapshot(r);
  ok(ps.every((p) => p.targetId !== boss.id && copies.some((copy) => copy.id === p.targetId)),
    "Duplicity immediately resets every player whose target still marked the known real Djinn");
  const visible = illusion.lanes.flatMap((lane) => lane.enemies);
  const realView = visible.find((foe) => foe.id === boss.id);
  const withoutId = ({ id, ...rest }) => rest;
  ok(copies.every((copy) => JSON.stringify(withoutId(visible.find((foe) => foe.id === copy.id))) === JSON.stringify(withoutId(realView))),
    "client snapshots expose identical HP, shield, buffs, statuses, trackers, cast timers, and combat truth for real and false Djinns");
  G.damageEnemy(r, fake.lane, fake, 1, ps[0]);
  ok(!r.lanes.flat().includes(fake) && boss.hp > 0, "one hit still defeats only the internally-1-HP false copy");

  G.resolveBossCard(r, boss, { cardKey: "tornado" });
  const tornado = r.tornadoes[0];
  ok(tornado && G.snapshot(r).tornadoes[0].damage === 1, "Tornado snapshots its half-strength current-floor damage");
  tornado.lane = 0; tornado.originLane = 0; tornado.returning = false; tornado.moveCharge = 0;
  tornado.lastPlayerLane[ps[0].id] = 1; ps[0].lane = 0;
  const enterHp = ps[0].hp;
  G.tickTornadoes(r);
  ok(tornado.exposures[ps[0].id].strikes === 1 && tornado.exposures[ps[0].id].lastReason === "enter" && ps[0].hp === enterHp - 1,
    "Tornado deals half-strength current-floor damage when a player enters its lane");
  tornado.lastPlayerLane[ps[0].id] = 0; tornado.exposures[ps[0].id].ticks = 0; tornado.moveCharge = 0;
  const stayHp = ps[0].hp;
  for (let i = 0; i < 60; i++) G.tickTornadoes(r);
  ok(tornado.exposures[ps[0].id].strikes === 2 && tornado.exposures[ps[0].id].lastReason === "stay" && ps[0].hp === stayHp - 1,
    "Tornado deals half-strength current-floor damage after a continuous 6-second stay");
  ok(tornado.lane === 1 && tornado.returning, "Tornado moves one random legal step left/right after the stay window");
  tornado.moveCharge = 59; G.tickTornadoes(r);
  ok(tornado.lane === 0 && !tornado.returning, "Tornado moves back to its prior lane on the next movement");

  const kitchenBefore = r.lanes.flat().filter((f) => /^kitchen/.test(f.bodyKey)).length;
  G.resolveBossCard(r, boss, { cardKey: "animateKitchen" });
  const kitchen = r.lanes.flat().filter((f) => /^kitchen/.test(f.bodyKey));
  eq(kitchen.length, kitchenBefore + 8,
    "one Animate Kitchen scales its attacker count to two players");
  ok(BODIES.kitchenSlow5.maxHp === 5 && BODIES.kitchenSlow5.phys === 1 && BODIES.kitchenSlow5.passive[0].every === 60,
    "Kitchen archetype 1 is 5 HP / very slow / 1 damage");
  ok(BODIES.kitchenMedium.maxHp === 2 && BODIES.kitchenMedium.phys === 2 && BODIES.kitchenMedium.passive[0].every === 40,
    "Kitchen archetype 2 is exact 2 HP / medium-paced / 2 damage");
  ok(BODIES.kitchenSlow3.maxHp === 3 && BODIES.kitchenSlow3.phys === 2 && BODIES.kitchenSlow3.passive[0].every === 60,
    "Kitchen archetype 3 is 3 HP / 2 damage / very slow");

  arm(ps[0], ["oDagger", "oBow", "oFire"]);
  fire(r, ps[0], 0); fire(r, ps[0], 1); fire(r, ps[0], 2);
  eq(r.lanes.flat().filter((f) => f.bodyKey === "itemEntity").length, 0,
    "retired every-third-party-card item animation is absent from Djinn's exact deck");

  const ticking = bossRig("djinn", { players: 1, floor: 1 });
  const played = ticking.boss.castBars[0].cardKey;
  ticking.boss.castBars[0].charge = ticking.boss.castBars[0].cd - 1;
  G.simulateTick(ticking.r);
  ok(ticking.boss.castBars[0].cardKey !== played && ticking.boss.bossDiscard.includes(played),
    "lane-bound Djinn cast bars advance and play through the real simulation tick path");
}

// ---- Kleptomaniac Kraken: exact deck, true card theft, rescue, and ramp --------------
{
  // OWNER RUN REPRO (2026-07-20): Kraken is the four-lane back wall. A front/melee
  // card played from a clear lane must hit Kraken in that lane, not breach sideways
  // into a stolen-card body occupying a different lane. Keep this on the real
  // playCard -> resolveOps -> aimedFoe path; a direct damage call would miss the bug.
  {
    const repro = bossRig("kraken", { players: 1, floor: 2 });
    const player = repro.ps[0];
    player.lane = player.ownedLane = 3;
    arm(player, ["oSword"]);
    player.deck = [G.mintCard("oTriblade")];
    const random = Math.random;
    let stolen;
    try { Math.random = () => 0; stolen = G.krakenSteal(repro.r); }
    finally { Math.random = random; }
    ok(stolen?.lane === 0 && repro.r.lanes[3].length === 0,
      "Kraken repro has a stolen-card body in another lane and a clear melee lane");
    player.targetId = repro.boss.id; // proves a valid boss reticle cannot cause the cross-lane hit
    const bossHp = repro.boss.hp, stolenHp = stolen.hp;
    const sword = player.hand.find((card) => card.key === "oSword");
    ok(G.playCard(repro.r, player, sword.id),
      "Kraken repro plays the melee card through the authoritative card resolver");
    ok(repro.boss.hp === bossHp - 2 && stolen.hp === stolenHp,
      "EXPECTED: clear-lane melee hits four-lane Kraken before considering sideways breach");
  }

  const { r, ps, boss } = bossRig("kraken", { players: 2, floor: 2 });
  ok(r.boss === boss && r.laneCount === 4 && r.lanes.length === 4,
    "Kraken is one authoritative back-line body behind four lanes");
  eq(G.BOSS_DEFS.kraken.cards.map((card) => card.label).join("|"),
    "Tentacles|Lightning Storm|Barnacle Swarm", "Kraken's authored deck is exact");
  eq(boss.castBars.length, 1, "Kraken plays one scaled deck card at a time");
  eq(boss.clocks.filter((clock) => clock.kind === "steal").length, 1,
    "the one-card theft remains a separate unique mechanic");

  ps[0].hand = [G.mintCard("oBlackHole")]; ps[0].inPlay = [G.mintCard("dThorns")];
  ps[0].deck = [G.mintCard("dShield"), G.mintCard("dTrollskin")];
  ps[0].disc = [G.mintCard("oDagger")];
  ps[1].deck = [G.mintCard("oPowerUp")]; ps[1].disc = [G.mintCard("dStoneskin")];
  const candidates = G.krakenStealCandidates(r);
  ok(candidates.length === 2 && candidates.every((entry) => ["dShield", "oDagger"].includes(entry.card.key)),
    "theft globally prioritizes active damage/self-shield cards over passives and fallback cards");
  const beforeIds = new Set([...ps[0].deck, ...ps[0].disc, ...ps[1].deck, ...ps[1].disc].map((card) => card.id));
  const stolen = G.krakenSteal(r);
  ok(stolen && stolen.hp === 10 && stolen.maxHp === 10 && stolen.restoreTo?.card,
    "a floor-2 stolen card becomes one 10-HP foe");
  ok(![...ps[0].deck, ...ps[0].disc, ...ps[1].deck, ...ps[1].disc].some((card) => card.id === stolen.restoreTo.card.id)
      && beforeIds.has(stolen.restoreTo.card.id),
    "the exact minted card ID is physically absent from draw/used piles while stolen");
  ok(ps[0].hand[0].key === "oBlackHole" && ps[0].inPlay[0].key === "dThorns",
    "Kraken never steals from hand or in-play cards");
  eq(G.krakenStealCandidates(r).length, 0, "only one stolen card-foe may exist globally");
  eq(G.krakenSteal(r), null, "a second theft waits until the first stolen body is defeated");
  ok(/stolen card is active/i.test(G.bossClockIntent(r, boss, boss.clocks[0])),
    "the theft bar explains why it is waiting");
  { const snap = G.snapshot(r), owner = snap.players.find((player) => player.id === stolen.restoreTo.playerId);
    const projected = snap.lanes.flatMap((lane) => lane.enemies).find((foe) => foe.id === stolen.id);
    ok(projected.stolenCard?.returnsOnDefeat && owner.stolenCards[0]?.entityId === stolen.id,
      "snapshot links the animated card, its owner, and its return-on-defeat contract"); }
  const restore = { ...stolen.restoreTo, card: stolen.restoreTo.card };
  G.damageEnemy(r, stolen.lane, stolen, 99, ps[0]);
  ok(ps.find((player) => player.id === restore.playerId)[restore.pile]
      .some((card) => card.id === restore.card.id),
    "defeating the animated foe restores the exact card to its source pile");
  ok(r.cardReturnEvents.at(-1)?.cardId === restore.card.id,
    "card restoration emits a bounded semantic return event");

  const stolenAgain = G.krakenSteal(r);
  const secondRestore = stolenAgain.restoreTo;
  G.damageEnemy(r, 0, boss, 999, ps[0]);
  ok(!r.lanes.flat().includes(stolenAgain)
      && ps.find((player) => player.id === secondRestore.playerId)[secondRestore.pile]
        .some((card) => card.id === secondRestore.card.id),
    "defeating Kraken despawns its active stolen foe and returns the card without duplication");

  const mechanics = bossRig("kraken", { players: 2, floor: 2 });
  const mr = mechanics.r, mb = mechanics.boss, mps = mechanics.ps;
  G.resolveBossCard(mr, mb, { cardKey: "tentacles", playerScale: 2 });
  const tentacles = mr.lanes.flat().filter((foe) => foe.bodyKey === "tentacle");
  ok(tentacles.length === 2 && new Set(tentacles.map((foe) => foe.lane)).size === 2
      && tentacles.every((foe) => foe.hp === 8 && G.foeCardCost(foe.queue[0].key, G.leveledBody(foe), mr) === 3),
    "Tentacles summons one 8-HP body per player in distinct lanes with floor-2 cost 3");
  const tentacle = tentacles[0];
  eq(G.foeOpsDmg(mr, tentacle, G.KIT[tentacle.queue[0].key].ops), 8,
    "an unwounded tentacle attacks for its full current health");
  tentacle.hp = 5;
  eq(G.foeOpsDmg(mr, tentacle, G.KIT[tentacle.queue[0].key].ops), 5,
    "wounding a tentacle immediately lowers its advertised and resolved attack");

  const hp = mps.map((player) => player.hp);
  G.resolveBossCard(mr, mb, { cardKey: "lightningStorm", playerScale: 2 });
  ok(mps.every((player, i) => player.hp === hp[i] - 6),
    "Lightning Storm deals literal floor × 3 to every occupied lane without multiplying per player again");
  const ally = G.spawnEnemy("rat"); ally.side = "hero"; ally.lane = 0; ally.hp = ally.maxHp = 20;
  mr.allies[0].push(ally);
  G.resolveBossCard(mr, mb, { cardKey: "barnacleSwarm", playerScale: 2 });
  ok(mps.every((player) => G.buffAmt(player, "sap") === 1) && G.buffAmt(ally, "sap") === 1,
    "first Barnacle Swarm gives every player and summon -1 damage for 6 seconds");
  G.resolveBossCard(mr, mb, { cardKey: "barnacleSwarm", playerScale: 2 });
  ok(mps.every((player) => G.buffAmt(player, "sap") === 3) && G.buffAmt(ally, "sap") === 3,
    "Barnacle Swarm ramps to -2 on its second play and stacks with active barnacles");
  for (let i = 0; i < 60; i++) { mps.forEach(G.tickBuffs); G.tickBuffs(ally); }
  ok(mps.every((player) => G.buffAmt(player, "sap") === 0) && G.buffAmt(ally, "sap") === 0,
    "all Barnacle penalties expire after their literal 6-second duration");
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
  draftBody(r, [...r.players.values()][0]);
  const map = G.snapshot(r).map, bossKey = G.bossForFloor(r, 1);
  ok(map.bossName === BODIES[bossKey].name, "the map preview names the floor's boss");
  ok(map.bossPreview?.bodyKey === bossKey
      && map.bossPreview.maxHp === G.bodyMaxHp(BODIES[bossKey]) * G.bossBudget(1, 1),
    "the map's boss inspector previews the seeded boss and exact solo/floor HP");
  eq(map.bossPreview.cards.length, G.BOSS_DEFS[bossKey].cards.length,
    "the map's boss inspector exposes every authored boss action");
  const unrolledLaneKeys = new Set(G.BOSS_DEFS[bossKey].cards
    .filter((card) => card.lane || card.key === "kingFingerBeam").map((card) => card.key));
  ok(map.bossPreview.cards.every((card) => card.name && card.intent
      && (!unrolledLaneKeys.has(card.key) || !/^Lane 1/i.test(card.intent))),
    "every previewed boss action has resolver-derived intent without inventing a lane for random/best-lane actions");
  eq(map.bossPreview.rareLoot, 3, "the solo boss preview promises the exact players + 2 rare-card shelf");
}

// ---- ordinary boss rooms follow party count; authored multi-lane bosses expand live combat to four --
{
  const solo = { players: new Map([["a", {}]]) };
  eq(G.deriveLaneCount(solo, "boss"), 1, "ordinary solo boss derivation remains 1 lane");
  eq(G.deriveLaneCount({ players: new Map([["a", {}], ["b", {}]]) }, "boss"), 2, "2P boss room = 2 lanes");
  eq(G.deriveLaneCount({ god: true, players: new Map([["a", {}]]) }, "combat"), 3, "god rooms keep the ≥3 testing board");
  eq(bossRig("djinn", { players: 1 }).r.laneCount, 4, "Djinn's authored solo exception expands the live room to four lanes");
  eq(bossRig("hydra", { players: 1 }).r.laneCount, 4, "Hydra's authored solo exception expands the live room to four lanes");
}

// ---- KING MIMIC — 99 HP/player, four lanes, no stance, four vicious cards -----------
{
  const r0 = G.newRoom("KM0");
  r0.bossDraw = ["hydra", "djinn", "kraken"];
  eq(G.bossForFloor(r0, 4), "kingMimic", "floor 4 is the THRONE — King Mimic, whatever the draw");
  eq(G.bossForFloor(r0, 2), "djinn", "floors 1–3 still read the seeded rotation");
  const lvl = G.buildLevel(4);
  ok(lvl.nodes.length === 1 && lvl.nodes[0].type === "boss" && lvl.currentId === lvl.nodes[0].id,
    "the throne floor is a single boss room — no crawl before the King");

  const { r, ps, boss } = bossRig("kingMimic", { players: 2, floor: 4 });
  ok(!r.boss && r.laneCount === 4 && r.lanes.flat().filter((foe) => foe.id === boss.id).length === 1,
    "King is one authoritative lane body moving across four lanes");
  eq(boss.maxHp, 198, "King has literal 99 HP per present human, with no floor multiplier");
  ok(boss.stance == null && !(boss.coreClocks ?? []).some((clock) => clock.kind === "stance"),
    "King has no stance state or stance clock");
  eq(G.BOSS_DEFS.kingMimic.cards.map((card) => card.label).join("|"),
    "King Mimic Has a Party|King Mimic Dunks On You|King Mimic Fires a Finger Beam|King Mimic Runs the Gambit",
    "King's authored four-card deck is exact");
  eq(boss.castBars.length, 1, "King has one active authored card at a time");
  { const snap = G.snapshot(r);
    ok(!snap.boss && snap.bossUi?.id === boss.id && snap.bossUi.laneBound && snap.bossUi.stance == null,
      "snapshot projects the one physical King lane and no stale stance UI"); }

  const seen = [];
  for (let i = 0; i < G.BOSS_DEFS.kingMimic.cards.length; i++) {
    seen.push(boss.castBars[0].cardKey);
    boss.castBars[0].charge = boss.castBars[0].cd - 1;
    G.tickBossDeck(r, boss);
  }
  eq([...seen].sort().join(), G.BOSS_DEFS.kingMimic.cards.map((card) => card.key).sort().join(),
    "King exhausts all four cards before the common boss deck reshuffles");

  const party = bossRig("kingMimic", { players: 2, floor: 4 });
  G.resolveBossCard(party.r, party.boss, { cardKey: "kingParty", playerScale: 2 });
  const partyAdds = party.r.lanes.flat().filter((foe) => foe !== party.boss);
  const animated = partyAdds.filter((foe) => foe.bodyKey === "itemEntity");
  const armed = partyAdds.filter((foe) => foe.bodyKey !== "itemEntity");
  ok(animated.length === 2 && animated.every((foe) => foe.hp === 10 && foe.maxHp === 10),
    "Has a Party creates one 10-HP animated card per player");
  ok(armed.length === 2 && armed.every((foe) => G.anteOfFoe({ bodyKey: foe.bodyKey, level: foe.level,
      gear: foe.equipment.map((item) => item.key) }) >= G.BOSS_DEFS.kingMimic.partyAnte),
    "Has a Party creates one difficult armed foe per player");
  eq(party.boss.lane, G.kingDefendedLane(party.r, party.boss),
    "after Party resolves, King retreats to the most defended lane");
  ok(party.r.lanes[party.boss.lane].at(-1) === party.boss,
    "King is literally last/back behind that lane's defenders");

  const dunk = bossRig("kingMimic", { players: 2, floor: 4 });
  dunk.ps.forEach((player) => { player.hp = player.maxHp = 100; });
  const dunkTarget = G.laneLine(dunk.r, dunk.boss.lane)[0];
  const dunkHp = dunkTarget.hp;
  G.resolveBossCard(dunk.r, dunk.boss, { cardKey: "kingDunk", playerScale: 2 });
  eq(dunkHp - dunkTarget.hp, 20, "Dunks On You deals huge 10 × players melee damage to one front target");

  const beam = bossRig("kingMimic", { players: 2, floor: 4 });
  beam.ps.forEach((player) => { player.hp = player.maxHp = 100; player.lane = 0; });
  const beamHp = beam.ps.map((player) => player.hp);
  G.resolveBossCard(beam.r, beam.boss, { cardKey: "kingFingerBeam", lane: 0, playerScale: 2 });
  ok(beam.ps.every((player, i) => player.hp === beamHp[i] - 12),
    "Finger Beam deals huge 6 × players AoE to everyone in its locked lane");
  { const telegraph = bossRig("kingMimic", { players: 2, floor: 4 });
    telegraph.ps[0].lane = telegraph.ps[1].lane = 3;
    G.initBossDeck(telegraph.r, telegraph.boss, 1);
    const bar = telegraph.boss.castBars[0];
    if (bar.cardKey === "kingFingerBeam") eq(bar.lane, 3, "Finger Beam locks the best lane when drawn"); }

  const gambit = bossRig("kingMimic", { players: 2, floor: 4 });
  G.resolveBossCard(gambit.r, gambit.boss, { cardKey: "kingGambit", playerScale: 2 });
  const gambitCards = gambit.boss.lastGambitCards;
  eq(gambitCards.reduce((sum, key) => sum + G.cardCost(key), 0), 10,
    "Runs the Gambit applies random existing card buffs worth exactly 10 moxie");
  eq(new Set(gambitCards).size, gambitCards.length,
    "Gambit selects its exact-cost buff cards without replacement");

  const throne = bossRig("kingMimic", { players: 1, floor: 4 });
  throne.r.level = G.buildLevel(4);
  throne.r.lanes = throne.r.lanes.map((lane) => lane.filter((foe) => foe === throne.boss));
  G.damageEnemy(throne.r, throne.boss.lane, throne.boss, 999, throne.ps[0]);
  G.simulateTick(throne.r);
  ok(throne.r.phase === "won" && throne.r.levelComplete && throne.r.runWon,
    "the lane-bound King falls → won + levelComplete + RUN WON");
  eq(G.descend(throne.r), false, "the throne is the LAST floor — descend is dead");
  ok(G.snapshot(throne.r).runWon === true && G.snapshot(throne.r).map.bossName === "King Mimic",
    "runWon ships in the snapshot; the map preview names the King");
  G.startDraft(throne.r);
  ok(!throne.r.runWon, "a fresh run resets the claim on the throne");
}

// ---- the descend seam: floor 3 cleared → the throne arrives fully wired --------------
{
  const r = G.newRoom("KM2");
  const p = G.addPlayer(r, "a", "A");
  G.startDraft(r);
  r.phase = "won"; r.floor = 3; r.level = G.buildLevel(3); r.levelComplete = true;
  ok(G.descend(r), "descending off a cleared floor 3 works");
  eq(r.floor, G.THRONE_FLOOR, "…and lands on the throne floor");
  { const king = r.lanes.flat().find((foe) => foe.bodyKey === "kingMimic");
    ok(r.phase === "setup" && king?.castBars?.length === 1,
      "the throne room auto-builds: setup phase, one lane-bound King, one authored card up"); }
  eq(G.snapshot(r).map.bossName, "King Mimic", "the descend button knew where it was going");
}

// ---- BOSS PAYDAY — the rare CARD shelf. The temporary five-band economy activates the existing
// RARE_ANTE=3 rule: boss rewards are distinct cards from tiers 3, 4, and 5. --
{
  eq(G.RARE_POOL.length, 50, "RARE_POOL contains every active value-3, value-4, and value-5 card");
  ok(G.RARE_POOL.every((k) => KIT[k].ante >= G.RARE_ANTE && KIT[k].ante <= 5),
    "RARE_POOL contains only live cards valued 3–5");
  ok(typeof G.BOSS_GOLD === "undefined", "the boss gold bounty (BOSS_GOLD) is GONE — the payday is the card shelf");
  const { r, ps, boss } = bossRig("hydra", { players: 2 });
  r.level = G.buildLevel(1);
  r.level.currentId = r.level.nodes.find((n) => n.type === "boss").id;
  ps.forEach((p) => { p.backpack = []; p.deckList = []; });
  boss.hp = 0;
  r.lanes = r.lanes.map(() => []);
  G.simulateTick(r);
  eq(r.phase, "won", "boss down → won");
  eq(r.loot.length, 4, "a two-player boss drops players + 2 rare cards");
  eq(new Set(r.loot).size, 4, "the boss rare shelf is distinct");
  ok(r.loot.every((k) => G.itemTreasure(k) >= 3), "every boss reward is tier 3–5");
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
  eq(r2.itemUses, uses0, "AUTO does not feed the retired Djinn every-third-card counter");
}

// ---- the universal cooldown multiplier is DEAD (owner 2026-06-12) --------------------
{
  G.setCdMult(2);   // the stub must be inert — numbers are literal now
  const { boss } = bossRig("hydra", { players: 1 });
  eq(boss.coreClocks[0].cd, G.BOSS_DEFS.hydra.coreCd, "boss core/deck clock cds are LITERAL ticks — setCdMult is an inert stub");
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
  a.backpack = ["oSword", "oHatchet"];          // both ◈1
  b.backpack = ["oDagger", "oMeteors", "oWind"]; // ◈1, ◈4, ◈1
  ok(!G.proposeTrade(r, a, "b", "oSword", null), "GIFTS are dead: a want-less offer is rejected");
  ok(!G.proposeTrade(r, a, "b", "oHatchet", "oMeteors"), "an unequal-tier trade is rejected (◈1 for ◈4)");
  ok(G.proposeTrade(r, a, "b", "oHatchet", "oWind"), "an equal-tier offer stands (◈1 for ◈1)");
  const offer = r.tradeOffers[r.tradeOffers.length - 1];
  ok(G.acceptTrade(r, b, offer.id), "…and executes on accept");
  ok(a.backpack.includes("oWind") && b.backpack.includes("oHatchet"), "…the cards crossed 1:1");
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
  G.draftPick(r, r.players.get("f"), draftOffers(r, "f")[0].id);
  G.draftPick(r, r.players.get("f-b1"), draftOffers(r, "f-b1")[0].id);    // run starts → enterRoom; 2 bodies → 2 lanes
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

// ---- semantic cast-VFX seam: authored kind + resolver-selected target/lane, bounded --------
// ---- manual card queue: one authoritative intent waits for live moxie ---------------------
{
  const { r, p, foe } = rig("rookie", { inv: ["oFire", "oDagger"], foeHp: 1000 });
  const fireCard = p.hand.find((c) => c.key === "oFire");
  const dagger = p.hand.find((c) => c.key === "oDagger");
  p.moxie = 0; p.moxieClock = 0; p.autoFire = true;
  const hp0 = foe.hp;
  ok(G.requestCardPlay(r, p, fireCard.id), "unaffordable manual play is accepted as intent");
  eq(p.queuedCard?.id, fireCard.id, "the one-slot queue stores the exact hand instance");
  eq(G.snapshot(r).players.find((q) => q.id === p.id).queuedCard?.id, fireCard.id,
    "the authoritative queue is visible in snapshots");
  for (let t = 0; t < 49; t++) G.simulateTick(r);
  eq(p.queuedCard?.id, fireCard.id, "the queued card waits while live moxie is short");
  eq(foe.hp, hp0, "AUTO does not steal banked moxie or cast around the queued manual intent");
  G.simulateTick(r);
  eq(p.queuedCard, null, "the queue clears on the first tick its live cost is affordable");
  ok(foe.hp < hp0, "the queued card resolves automatically at that first legal moment");

  // Same-card tap toggles off; a different card replaces; any later combat intent cancels.
  p.moxie = 0;
  const fireAgain = p.hand.find((c) => c.key === "oFire");
  ok(G.requestCardPlay(r, p, fireAgain.id), "the recycled Fire can be queued again");
  ok(G.requestCardPlay(r, p, fireAgain.id), "tapping the same queued card is an accepted cancel");
  eq(p.queuedCard, null, "same-card tap toggles the queue off");
  G.requestCardPlay(r, p, fireAgain.id);
  G.requestCardPlay(r, p, dagger.id);
  eq(p.queuedCard?.id, dagger.id, "a different unaffordable card replaces the prior queue");
  ok(G.cancelQueuedCard(r, p, "movement"), "a later combat input cancels an armed queue");
  eq(p.queuedCard, null, "the canceled queue cannot fire later");
}

// ---- squad command queue: ordered per-body plan, strict head priority ----------------------
{
  const { r, p } = rig("rookie", { inv: ["oFire", "oDagger"], foeHp: 1000 });
  const fireCard = p.hand.find((c) => c.key === "oFire");
  const dagger = p.hand.find((c) => c.key === "oDagger");
  p.moxie = 99;
  ok(G.enqueueCardPlay(r, p, fireCard.id), "command mode appends its first exact hand card");
  ok(G.enqueueCardPlay(r, p, dagger.id), "command mode appends a second card without replacing the first");
  eq(p.cardQueue.map((q) => q.id).join(), [fireCard.id, dagger.id].join(), "the engine preserves tap order as cast priority");
  eq(p.queuedCard.id, fireCard.id, "the legacy queuedCard alias remains the plan head");
  const projected = G.snapshot(r).players.find((q) => q.id === p.id).queuedCards;
  eq(projected.map((q) => q.id).join(), [fireCard.id, dagger.id].join(), "snapshot exposes the complete ordered plan");
  eq(projected.map((q) => q.priority).join(), "1,2", "snapshot numbers the plan priorities explicitly");
  ok(G.tryQueuedCard(r, p), "the affordable head fires");
  eq(p.queuedCard?.id, dagger.id, "the second card becomes head; nothing jumps the line");
  p.moxie = 99;
  ok(G.tryQueuedCard(r, p), "the second card fires only after the first leaves");
  eq(p.queuedCard, null, "the compatibility head clears when the plan is empty");
  eq(p.cardQueue.length, 0, "the full plan clears after its final cast");

  // Tapping a planned card toggles only that entry; a body can edit priority without destroying
  // the rest of its plan (remove, then append again to move it to the end).
  const a = p.hand.find((c) => c.key === "oFire");
  const b = p.hand.find((c) => c.key === "oDagger");
  G.enqueueCardPlay(r, p, a.id); G.enqueueCardPlay(r, p, b.id);
  G.enqueueCardPlay(r, p, a.id);
  eq(p.cardQueue.length, 1, "tapping a numbered planned card removes only that card");
  eq(p.cardQueue[0].id, b.id, "the other planned card keeps its place");
}

// ---- semantic cast-VFX seam: authored kind + resolver-selected target/lane, bounded --------
{
  eq(KIT.oSword.vfx?.kind, "sword", "Sword opts into the sword VFX through card data");
  eq(KIT.oLightning.vfx?.anchor, "lane", "Lightning declares a lane-anchored VFX (no prose matching)");
  eq(KIT.oMeteors.vfx?.kind, "meteors", "Meteors declares its own semantic VFX kind");

  { const { r, p, foe } = rig("rookie", { inv: ["oSword"], foeHp: 1000 });
    const back = G.spawnEnemy("cleric", []); back.hp = back.maxHp = 1000; back.queue = []; back.lane = 0; r.lanes[0].push(back);
    p.targetId = back.id; fire(r, p, 0);                    // the reticle is behind the actual melee front
    const fx = r.castFx.at(-1);
    ok(fx.kind === "sword" && fx.targetId === foe.id,
      "Sword VFX anchors to the actual front target, not the aimed reticle"); }

  // Telekinetic Blades turns Sword into an aimed strike. The event must follow the ACTUAL cross-lane
  // target chosen by the resolver, not assume the caster's lane/front from the card's printed default.
  { const { r, p, foe } = rig("rookie", { inv: ["oSword"] });
    r.laneCount = 2; r.allies = [[], []]; r.lanes = [[foe], []];
    const aimed = G.spawnEnemy("rookie", []); aimed.hp = aimed.maxHp = 100; aimed.queue = []; aimed.lane = 1; r.lanes[1].push(aimed);
    p.tkBlades = true; p.targetId = aimed.id;
    fire(r, p, 0);
    const fx = r.castFx.at(-1);
    ok(fx.kind === "sword" && fx.anchor === "target" && fx.targetId === aimed.id && fx.lane === 1,
      "Sword VFX strikes the resolver's actual aimed target in its actual lane");
    eq(G.snapshot(r).castFx.at(-1).targetId, aimed.id, "snapshot carries the semantic target id to the real client"); }

  { const { r, p, foe } = rig("rookie", { inv: ["oLightning", "oMeteors"] });
    fire(r, p, 0); fire(r, p, 1);
    const tail = r.castFx.filter((fx) => fx.kind === "lightning" || fx.kind === "meteors").slice(-2);
    ok(tail[0].kind === "lightning" && tail[0].anchor === "lane" && tail[0].lane === p.lane && tail[0].targets.some((t) => t.id === foe.id),
      "Lightning VFX fills the affected lane and carries its affected targets");
    ok(tail[1].kind === "meteors" && tail[1].anchor === "lane" && tail[1].lane === p.lane && tail[1].targets.some((t) => t.id === foe.id),
      "Meteors VFX lands on targets in the affected lane"); }

  // Foe symmetry + breach: a foe Sword in an empty lane follows the hero to lane 1. The VFX event
  // uses that same resolved defender, proving it does not merely echo the caster's source lane.
  { const r = G.newRoom("FXF"); const p = G.addPlayer(r, "p", "P"); G.wearBody(p, "rookie");
    p.lane = 1; p.maxHp = p.hp = 100; r.phase = "playing"; r.laneCount = 2; r.allies = [[], []];
    const foe = G.spawnEnemy("rookie", []); foe.lane = 0; foe.queue = G.mintCards(["oSword"]); foe.moxie = 99;
    r.lanes = [[foe], []]; G.foeCast(r, foe);
    const fx = r.castFx.at(-1);
    ok(fx.kind === "sword" && fx.targetSide === "hero" && fx.targetId === p.id && fx.lane === 1,
      "foe Sword VFX follows breach routing to the actual hero target"); }

  { const { r, p } = rig("rookie", { foeHp: 1e9, inv: ["oSword"] });
    for (let i = 0; i < G.CAST_FX_MAX + 4; i++) fire(r, p, 0);
    eq(r.castFx.length, G.CAST_FX_MAX, "rapid casts keep a fixed-size server VFX ring");
    ok(r.castFx.every((fx, i, a) => i === 0 || fx.id > a[i - 1].id), "VFX ids remain monotonic after ring trimming"); }

  { const { r, p } = rig("rookie", { foeHp: 1e9, inv: ["dBuckler"] });
    p.moxie = 99; const card = p.hand.find((c) => c.key === "dBuckler");
    ok(G.playCard(r, p, card.id), "a utility card with no authored target effect still casts");
    const fx = r.castFx.findLast((event) => event.kind === "cast");
    ok(fx?.sourceId === p.id && fx.cardName === KIT.dBuckler.name && fx.cardKey === "dBuckler",
      "every successful card publishes a source pulse + authoritative card identity");
    ok(G.snapshot(r).castFx.some((event) => event.id === fx.id && event.cardName === KIT.dBuckler.name),
      "the universal cast event reaches the real client snapshot"); }
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
  // pin a deterministic 2-card queue: oDagger (cost 2) in front, oHatchet (cost 4) behind  (+1 sweep)
  foe.queue = G.mintCards(["oDagger", "oHatchet"]);
  const frontKey = foe.queue[0].key;
  foe.moxie = 0;
  eq(G.foeCast(r, foe), false, "moxie 0 < cost → the foe does NOT cast");
  ok(foe.queue[0].key === frontKey, "…and the front card stays put");
  foe.moxie = 2;   // exactly the front (Dagger) cost
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
  p.cards = G.mintCards(["oArcane", "oBow", "oJavelin"]); // costs 2, 3, 5 (+1 sweep)
  p.hand = [...p.cards]; p.deck = []; p.moxie = 5; r.useCounts = {};
  G.autoPlay(r, p);
  eq(r.useCounts.oJavelin, 1, "autoPlay plays the priciest AFFORDABLE card (Javelin, cost 5)");
  ok(!r.useCounts.oBow && !r.useCounts.oArcane, "…and ONLY that one (one play per call)");
  // with too little moxie for the big one, it drops to the priciest it CAN afford
  p.cards = G.mintCards(["oArcane", "oBow", "oJavelin"]);
  p.hand = [...p.cards]; p.deck = []; p.moxie = 3; r.useCounts = {};
  G.autoPlay(r, p);
  eq(r.useCounts.oArcane, 1, "moxie 3 can't afford Bow(4) or Javelin(5) → it plays Arcane(2), the priciest affordable");
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
// N cards played · {dealt:N}=per N damage dealt · {dealtMelee:N}/{dealtRanged:N}=school-specific
// damage dealt · {pairMR}=once
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
  { const { r, p } = rig("leverage", { inv: ["oDagger"] });   // Dagger costs 2 (+1 sweep)
    fire(r, p, 0); eq(r.allies[0].length, 0, "Royal Rat: 2 moxie spent is under the 3-threshold");
    fire(r, p, 0); eq(r.allies[0].length, 1, "Royal Rat summons a rat once 3 moxie is spent (4 total crosses it)"); }

  // --- hedge = Paid Piper: {play:3} → summon 2 rats (per CARD, cost-independent) ---------
  { const { r, p } = rig("hedge", { inv: ["oDagger"] });
    fire(r, p, 0); fire(r, p, 0); eq(r.allies[0].length, 0, "Paid Piper: 2 cards is under the 3-threshold");
    fire(r, p, 0);
    eq(r.allies[0].length, 1, "Paid Piper's 2 rats merge into one rat-stack token");
    eq(r.allies[0][0].ratCount, 2, "Paid Piper summons exactly 2 rats every 3 cards played"); }

  // --- ratTrader = Toll Troll: {spend:4} → heal 2 ---------------------------------------
  { const { r, p } = rig("ratTrader", { inv: ["oSword"], pHp: 100 }); p.hp = 50;   // Sword costs 3
    fire(r, p, 0); eq(p.hp, 50, "Toll Troll: 3 moxie spent hasn't reached the 4-moxie heal");
    fire(r, p, 0); eq(p.hp, 52, "Toll Troll heals 2 every 4 moxie spent"); }

  // --- compound = Centless Centaur: combatStart {doubleNext} → first card resolves twice -
  { const { r, p, foe } = rig("compound", { inv: ["oSword"] });   // Sword deals 2
    G.applyCombatStart(p);                                   // rig skips beginCombat; apply the opener
    ok(p.doubleNext, "Centless Centaur opens with its first card armed to double");
    const h0 = foe.hp; fire(r, p, 0); eq(h0 - foe.hp, 4, "…the first card resolves twice (Sword 2 → 4)");
    ok(!p.doubleNext, "…the double is consumed by that first card");
    const h1 = foe.hp; fire(r, p, 0); eq(h1 - foe.hp, 2, "…the second card is single (Sword 2)"); }

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
  { const { r, p } = rig("heavyHand", { inv: ["oSword"] });    // Sword costs 3 (+1 sweep)
    fire(r, p, 0); eq(p.counters ?? 0, 0, "Interest Imp: 3 moxie spent is under the 4-threshold");
    fire(r, p, 0); eq(p.counters, 1, "Interest Imp gains +1 damage every 4 moxie spent (6 total crosses it)"); }

  // --- rentier = Vengeful Vampire: {dealt:2} → heal 1 from damage of any kind -----------
  { const { r, p } = rig("rentier", { inv: ["oDagger", "oArcane"], pHp: 100 }); p.hp = 50;
    fire(r, p, 0); eq(p.hp, 50, "Vampire: 1 melee damage dealt hasn't reached the 2-threshold");
    fire(r, p, 1); eq(p.hp, 51, "Vengeful Vampire heals after 2 total damage, including ranged damage"); }

  // --- ratBaron = Lizard Wizard: ranged cards cost 1 less -------------------------------
  { const { r, p } = rig("ratBaron", { inv: ["oArcane"] });      // Arcane is ranged (base cost 2), deals 1
    // CHANGED (owner 2026-07-06, corrected 07-07: "1 LESS not 1 total") — a −1 ranged discount
    eq(G.cardCost("oFire", BODIES.ratBaron), 4, "Lizard Wizard: a ⚡5 ranged spell costs 4 (−1)");
    eq(G.cardCost("oMeteors", BODIES.ratBaron), 5, "…a ⚡6 lane nuke costs 5 (discount, NOT flat 1)"); // +1 sweep: Meteors 5→6
    eq(G.cardCost("oSlow", BODIES.ratBaron), 2, "…a ⚡3 aimed debuff costs 2 (−1)");                   // +1 sweep: Slow 2→3, −1 = 2
    eq(G.cardCost("oSword", BODIES.ratBaron), G.cardCost("oSword"), "…melee cards are untouched");
    const c = G.cardCost("oArcane", BODIES.ratBaron);
    eq(c, 1, "…the ⚡2 Arcane costs 1 on Lizard Wizard (2−1; arithmetic lands at 1, not a floor)");
    p.moxie = 3;
    const play = () => { const card = p.hand.find((x) => x.key === "oArcane"); return G.playCard(r, p, card.id); };
    play(); play(); play(); eq(p.moxie, 3 - 3 * c, "…and no moxie is banked anymore (the old clock is gone)"); }

  // --- counterparty = Bond Behemoth: {hit:3} → +1 damage --------------------------------
  { const { r, p } = rig("counterparty", { pHp: 100 });
    G.damagePlayer(r, p, 2); eq(p.counters ?? 0, 0, "Bond Behemoth: 2 damage taken is under the 3-threshold");
    G.damagePlayer(r, p, 1); eq(p.counters, 1, "Bond Behemoth gains +1 damage every 3 damage taken"); }

  // --- juggernaut = Golden Golem: enters with shield equal to max health ------------------
  { const { r, p } = rig("juggernaut", { inv: ["oHatchet"], pHp: 100 });
    G.applyCombatStart(p); eq(p.shield, 100, "Golden Golem enters with shield equal to max health");
    p.hp = 60;
    fire(r, p, 0); fire(r, p, 0); fire(r, p, 0);
    eq(p.shield, 100, "…and spending moxie does not refill or add more shield"); }

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
  ok(D.filter((k) => k !== "dBloodIron").every((k) => G.PLAYER_POOL.includes(k)), "the other 10 defensive cards remain live in PLAYER_POOL");
  ok(G.PLAYER_POOL.includes("dBloodIron"), "Blood To Iron is live in the defensive pool");

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
  // Blood To Iron (owner 2026-07-19): missing health becomes shield now and every six seconds.
  { const { r, p } = rig("rookie", { inv: ["dBloodIron"], pHp: 100 }); p.hp = 40; fire(r, p, 0);
    eq(p.shield, 60, "Blood To Iron immediately shields for the caster's 60 missing health");
    for (let t = 0; t < 59; t++) G.tickTimers(r, p, 0); eq(p.shield, 60, "Blood To Iron does not pay again before six seconds");
    G.tickTimers(r, p, 0); eq(p.shield, 120, "Blood To Iron grants the same missing-health shield again at six seconds"); }
  // Trollskin Tiara: heal 2 every 6s
  { const { r, p } = rig("rookie", { inv: ["dTrollskin"], pHp: 100 }); p.hp = 50; fire(r, p, 0);
    eq(p.regens[0]?.sourceCard, "dTrollskin", "Trollskin's recurring regen retains its card identity");
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
// OWNER BATCH W2-D (owner 2026-07-10): reposition / periodic / delayed — three timed mechanics,
// each reusing an existing engine pattern (pullFront / timer periodic / timer once). Numbers FLAGGED.
// ============================================================================================
{
  const W = ["oGravitySword", "oCrimsonCrown", "oStarblade"];
  ok(W.every((k) => KIT[k]?.ops?.length && KIT[k].type === undefined), "all 3 W2-D cards exist, castable, school-free");
  ok(W.every((k) => G.PLAYER_POOL.includes(k)), "all 3 W2-D cards are live in PLAYER_POOL (draft/loot/foe kits — symmetry)");
  eq(G.cardKind("oGravitySword"), "melee", "Gravity Greatsword is melee-typed (front strike)");
  eq(G.cardKind("oStarblade"), "melee", "Starblade is melee-typed (front strike)");
  ok(!G.isRanged("oCrimsonCrown"), "Crimson Crown is typeless (self/summon — reaches no foe)");

  // GRAVITY GREATSWORD (owner 2026-07-10): pull the aimed BACK foe to the caster's front, THEN deal 5 to it.
  { const { r, p } = rig("rookie", { inv: ["oGravitySword"] });
    const back = G.spawnEnemy("rookie"); back.hp = back.maxHp = 50; r.lanes[0].push(back);   // lane 0 = [dummy, back]
    p.targetId = back.id; const wasFront = r.lanes[0][0], h0 = back.hp; fire(r, p, 0);
    ok(r.lanes[0][0] === back && wasFront !== back, "Gravity Greatsword pulls the aimed back foe to the caster's front");
    eq(h0 - back.hp, 5, "…then deals 5 to the pulled target"); }

  // CRIMSON CROWN (owner 2026-07-10): this-fight periodic — every 6s take 1 and summon 2 rats; persists across windows.
  { const { r, p } = rig("rookie", { inv: ["oCrimsonCrown"], pHp: 100 });
    fire(r, p, 0);
    for (let t = 0; t < 59; t++) G.simulateTick(r);
    eq(p.hp, 100, "Crimson Crown: nothing before 6s");
    G.simulateTick(r);                                              // tick 60 → first period
    eq(p.hp, 99, "…at 6s the caster takes 1");
    const rats1 = G.laneLine(r, p.lane).filter((e) => e.bodyKey === "rat" && e.side === "hero");
    ok(rats1.length === 1 && rats1[0].ratCount === 2, "…and 2 rats stand on its side");
    for (let t = 0; t < 60; t++) G.simulateTick(r);                 // next window (persists)
    eq(p.hp, 98, "…persists: another 1 at 12s");
    const rats2 = G.laneLine(r, p.lane).filter((e) => e.bodyKey === "rat" && e.side === "hero");
    eq(rats2[0].ratCount, 4, "…and 2 more rats (the stack is now 4)"); }

  // STARBLADE (owner 2026-07-10): deal 2 now; the delayed +10 moxie fires ONCE at 10s (100 ticks), never repeats.
  // Drive the delayed timer with tickTimers (not simulateTick) so passive moxie regen can't mask the grant.
  { const { r, p, foe } = rig("rookie", { inv: ["oStarblade"] });
    const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 2, "Starblade deals 2 to the front immediately");
    eq((p.timers ?? []).length, 1, "…and installs a one-shot delayed timer");
    eq(p.timers[0].sourceCard, "oStarblade", "…the delayed timer retains Starblade's card identity");
    p.moxie = 0;                                                    // isolate: only the timer changes moxie now
    for (let t = 0; t < 99; t++) G.tickTimers(r, p, 0);
    eq(p.moxie, 0, "…moxie unchanged before 10s");
    G.tickTimers(r, p, 0);                                          // tick 100 = 10s
    eq(p.moxie, 10, "…+10 moxie fires at 10s (capped at MOXIE_CAP 10)");
    eq((p.timers ?? []).length, 0, "…the one-shot timer EXPIRES (fired once)");
    p.moxie = 0; for (let t = 0; t < 200; t++) G.tickTimers(r, p, 0);
    eq(p.moxie, 0, "…and never fires again (no repeat)"); }
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
  G.draftPick(r, A, draftOffers(r, A)[0].id);
  eq(r.phase, "draft", "co-op: one seat picked → still drafting");
  G.draftPick(r, B, draftOffers(r, B)[0].id);
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
  G.draftPick(r, r.players.get("h"), draftOffers(r, "h")[0].id);
  G.draftPick(r, r.players.get("h-b1"), draftOffers(r, "h-b1")[0].id);
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
  p.backpack = [...ten, "oZweihander","dTowerShield","oRepeatXbow","oBile","oAnimatedBlade"];  // 5 value-1 spares
  eq(G.convertBackpack(r, p), 5, "convertBag melts the 5 SPARES for ◈5");
  eq(p.treasure, 5, "…banked as treasure");
  eq(p.deckList.length, 10, "…the deck is untouched");
  eq(p.backpack.length, 10, "…the backpack keeps exactly the deck copies");
  ok(!p.backpack.includes("oAnimatedBlade"), "…every spare melts, including the final value-1 card");
  eq(G.convertBackpack(r, p), 0, "a second convert finds nothing to melt");
  // spend: a level-up paid ENTIRELY from the bank (L2 costs 5) — no cards tendered
  ok(G.levelUp(r, p, []), "levelUp: an empty tender is covered by the banked ◈");
  eq(G.runLevelOf(p), 2, "…level ticked to 2");
  eq(p.treasure, 0, "…the bank paid exactly the cost (5 − 5)");
  ok(!G.levelUp(r, p, []), "empty bank + empty tender → refused");
  // mixed tender: cards cover what they cover, the bank pays ONLY the shortfall
  p.treasure = 3; p.backpack.push("oRainblow", "oButterflyKnife"); // 2 value-1 spares
  ok(G.tenderWithTreasure(p, ["oRainblow", "oButterflyKnife"], 4), "mixed: ◈2 in cards + ◈2 from the bank covers 4");
  eq(p.treasure, 1, "…the bank paid only the ◈2 shortfall");
  ok(!p.backpack.includes("oRainblow") && !p.backpack.includes("oButterflyKnife"), "…the tendered spares were spent");
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
  // rig: a 10-card deck at the floor + backpack-only spare pay-cards spanning the value tiers
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
    ok(G.buyWare(r, p, "dBuckler", ["oZweihander"]), "buyWare: exact value-1 payment → success");
    ok(p.backpack.includes("dBuckler"), "…the ware joined the backpack");
    ok(!p.backpack.includes("oZweihander"), "…the pay-card left the backpack");
    eq(p.backpack.length, before, "…backpack size unchanged (1 in, 1 out)");
    eq(r.shop.wares.length, 0, "…the ware left the shelf");
    eq(p.deckList.length, G.MIN_DECK, "…the deck is untouched (pay-card was backpack-only)");
  }
  // UNDERPAY / EXACT PAY across tiers.
  { const { r, p } = mk();
    const ware = "oGlacius";
    eq(G.itemTreasure(ware), 3, "Glacius is a tier-3 ware");
    r.shop.wares = [{ key: ware, value: G.itemTreasure(ware) }];
    ok(!G.buyWare(r, p, ware, ["oZweihander"]), "buyWare: a value-1 tender underpays tier 3 and is REJECTED");
    ok(!p.backpack.includes(ware) && r.shop.wares.length === 1, "…nothing changed on an underpay");
    ok(G.buyWare(r, p, ware, ["oForce"]), "buyWare: one exact value-3 card covers the tier-3 ware");
  }
  // DECK-FLOOR REJECTION: paying with a card that sits in the floored deck would break MIN_DECK
  { const { r, p } = mk(["oMeteors"]);                    // deck at the floor (10), one backpack-only spare
    r.shop.wares = [{ key: "dBuckler", value: 1 }];
    // oDagger is IN the 10-card deck → pulling it would drop the deck to 9 → REJECT
    ok(!G.buyWare(r, p, "dBuckler", ["oDagger"]), "buyWare: REJECTED — a pay-card in the floored deck would break MIN_DECK");
    ok(!p.backpack.includes("dBuckler"), "…nothing bought");
    eq(p.deckList.length, G.MIN_DECK, "…the deck stayed exactly at the floor");
    // paying with the backpack-only spare (not in the deck) is fine
    ok(G.buyWare(r, p, "dBuckler", ["oMeteors"]), "buyWare: an explicit overpay with a backpack-only card succeeds at the floor");
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
  const V = G.itemTreasure("oDagger") + G.itemTreasure("oFire") + G.FOE_BASE_LOOT;
  eq(p1.bidPoints + p2.bidPoints, V, "co-op clear grants the loot pool's exact value as bid points");
  ok(r2.loot.length === 2 + G.FOE_BASE_LOOT,
    "…and the pile stays up for claiming (carried gear plus two random commons; no solo auto-collect in co-op)");

  // PERSISTENT SHARED POOL: a 2-seat party cannot afford Lion Lance after its first clear.
  // Advancing into setup must preserve it; a later clear appends another drop
  // and grants only that NEW value, finally funding one claim from the accumulated budget.
  const r3 = G.newRoom("BID3"); r3.telemOff = true;
  const q1 = G.addPlayer(r3, "q1", "Q1"), q2 = G.addPlayer(r3, "q2", "Q2");
  const lionLanceValue = G.itemTreasure("oLionLance");
  r3.level = { currentId: "c0", nodes: [
    { id: "c0", type: "combat", cleared: false, links: ["c1"] },
    { id: "c1", type: "combat", cleared: false, links: [], foes: [
      { bodyKey: "rookie", gear: ["oLionLance"], level: 1 },
    ], ante: G.FOE_BASE_ANTE + lionLanceValue },
  ] };
  r3.phase = "playing"; r3.laneCount = 2; r3.lanes = [[], []]; r3.allies = [[], []];
  r3.draftedFoes = [{ bodyKey: "rookie", gear: ["oLionLance"], level: 1 }];
  G.simulateTick(r3);
  eq(r3.phase, "won", "persistent spoils: the first combat reaches the shared spoils screen");
  const oneBodyDropValue = lionLanceValue + G.FOE_BASE_LOOT;
  eq(q1.bidPoints + q2.bidPoints, oneBodyDropValue, "…only the first body drop's value is granted");
  ok(q1.bidPoints < lionLanceValue && q2.bidPoints < lionLanceValue,
    "…neither player can afford Lion Lance after the first split");
  G.claimLoot(r3, q1, "oLionLance");
  ok(r3.loot.includes("oLionLance") && !q1.backpack.includes("oLionLance"),
    "…the unaffordable claim bounces without removing the shared card");

  ok(G.advanceLevel(r3, "c1"), "persistent spoils: the party advances to the next room");
  eq(r3.phase, "setup", "…the next room opens in setup");
  eq(r3.loot.filter((k) => k === "oLionLance").length, 1,
    "…leaving the spoils screen does not discard the unclaimed card");
  G.beginCombat(r3);
  r3.lanes = [[], []]; r3.boss = null;
  G.simulateTick(r3);
  eq(r3.phase, "won", "persistent spoils: the later combat also clears");
  eq(r3.loot.filter((k) => k === "oLionLance").length, 2,
    "…its drop appends to the same shared pool instead of replacing the carried card");
  ok(r3.lootRoll.length === 1 + G.FOE_BASE_LOOT
      && r3.lootRoll.filter((k) => k === "oLionLance").length === 1
      && r3.lootRoll.filter((k) => k !== "oLionLance").every((k) => G.itemTreasure(k) === 1),
    "…telemetry offers only this clear's carried card and two new commons, not the old shared pool again");
  eq((G.snapshot(r3).loot?.cards ?? []).filter((c) => c.key === "oLionLance").length, 2,
    "…the won snapshot exposes both carried and newly dropped copies to the spoils screen");
  eq(q1.bidPoints + q2.bidPoints, oneBodyDropValue * 2,
    "…bid points grant only the later drop, never the carried card again");
  const q1Before = q1.bidPoints, q2Before = q2.bidPoints;
  G.claimLoot(r3, q1, "oLionLance");
  eq(r3.loot.filter((k) => k === "oLionLance").length, 1,
    "…an eventual claim removes exactly one matching shared-pool entry");
  eq(q1.backpack.filter((k) => k === "oLionLance").length, 1,
    "…exactly one claimed card joins the claimant's backpack");
  eq(q1.bidPoints, q1Before - lionLanceValue, "…only the claimant pays the card's value");
  eq(q2.bidPoints, q2Before, "…the other seat's budget is untouched");

  // NEW RUN resets the budget and the catch-up ledger
  G.startDraft(r2);
  ok(p1.bidPoints === 0 && p1.lootEarned === 0 && p2.bidPoints === 0 && p2.lootEarned === 0,
    "a new run resets bid points AND the cumulative-earned ledger");
  r3.loot = ["oLionLance"];
  G.startDraft(r3);
  eq(r3.loot.length, 0, "a new run resets the shared spoils pool");
}

// ---- BODY LOOT: carried cards + two random commons + level/elite premium; effects add nothing -----
{
  const r = G.newRoom("CONS"); r.telemOff = true;
  const a = G.addPlayer(r, "a", "A"), b = G.addPlayer(r, "b", "B");
  r.phase = "playing"; r.laneCount = 2; r.lanes = [[], []]; r.allies = [[], []];
  r.draftedFoes = [
    { bodyKey: "rookie", gear: ["oDagger", "oDagger", "oDagger"], level: 3, greedy: false, owner: null }, // ⚖11 = 4 base + 3 items + 2×2 levels; drops ◈7
    { bodyKey: "atlas",  gear: ["oDagger", "oDagger", "oDagger"], level: 1, greedy: false, owner: null }, // ⚖10 = 4 base + 3 items + 3 elite; drops ◈6
  ];
  r.gimmick = { key: "acidRain", name: "Acid Rain", pot: 3 };   // stale state must not affect rewards
  eq(G.roomValue(r), 24, "the stocked ANTE (threat): 11 (leveled) + 13 (mythic-bodied)");
  const wantDrop = r.draftedFoes.reduce((s, f) => s + G.foeLootValue(f), 0);
  eq(wantDrop, 20, "droppable ◈ = ⚖24 − the remaining ⚖2 threat tax for each of two foes = 20");
  G.simulateTick(r);                                            // empty board → won → loot realizes
  eq(r.phase, "won", "empty board resolves to a win");
  eq(r.loot.reduce((s, k) => s + G.itemTreasure(k), 0), wantDrop,
     "carried cards + two base commons + level value + elite premium drop; a stale effect pot does not");
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

// ---- B) FOE RANGED snipe FALLBACK: own lane empty → the lowest effective-HP PLAYER anywhere,
//         never a summon (lane-local rule 2026-07-10 falls back to the global cross-lane snipe) ----
{
  const r = G.newRoom("SNIPE"); r.phase = "playing";
  const p0 = G.addPlayer(r, "p0", "A");
  const p1 = G.addPlayer(r, "p1", "B");
  const p2 = G.addPlayer(r, "p2", "C");
  r.laneCount = 3; r.lanes = [[], [], []]; r.allies = [[], [], []];
  p0.lane = 2; p0.maxHp = 100; p0.hp = 80;                     // NOTE: NOT in the foe's lane (0) → fallback path
  p1.lane = 1; p1.maxHp = 100; p1.hp = 30;                     // lowest eHP, cross-lane from the foe
  p2.lane = 2; p2.maxHp = 100; p2.hp = 40; p2.shield = 50;     // eHP 90
  const foe = G.spawnEnemy("rookie"); foe.side = "foe"; foe.lane = 0; foe.queue = []; r.lanes[0].push(foe);   // lane 0 has NO player
  eq(G.lowestEHpPlayer(r, 0).id, "p1", "lowest hp+shield across ALL lanes is p1 (30), not p2 (40+50)");
  G.resolveOps(r, foe, [{ do: "deal", amount: 7, target: "pick" }]);   // a ranged (pick) card
  eq(p1.hp, 23, "own lane empty → a ranged foe deal falls back to the cross-lane weakest (p1: 30→23)");
  ok(p0.hp === 80 && p2.hp === 40, "…and leaves the healthier players alone");
  // ranged NEVER targets a summon, even one blocking the foe's own lane (which still has no PLAYER)
  const guard = G.spawnEnemy("largeRat"); guard.side = "hero"; guard.lane = 0; r.allies[0].push(guard);
  const gHp = guard.hp;
  G.foeHitRanged(r, 5, foe);
  ok(guard.hp === gHp, "ranged skips the summon blocking the foe's lane (snipes a player instead)");
  eq(p1.hp, 18, "…the weakest player still takes the ranged hit (23→18)");

  // Once every player body is down, ranged-only foes must finish the surviving hero summons
  // instead of whiffing forever while the summon keeps the run alive.
  p0.alive = false; p1.alive = false; p2.alive = false;
  guard.hp = guard.maxHp = 20;
  const sniper = G.spawnEnemy("rookie", []); sniper.side = "foe"; sniper.lane = 0;
  sniper.queue = G.mintCards(["oBow"]); sniper.moxie = 99; sniper.meleeBonus = 0; sniper.rangedBonus = 0;
  r.lanes[0] = [sniper];
  eq(G.foeRangedTarget(r, 0)?.id, guard.id, "all player bodies down → ranged targeting falls through to a surviving hero summon");
  ok(G.foeCast(r, sniper), "a ranged-only foe can still cast after every player body is down");
  eq(guard.hp, 18, "…and its ranged card damages the surviving summon (20→18)");
}
// ---- B2) FOE RANGED lane-local preference (owner DESIGN 2026-07-10): a foe hits a live player in
//          its OWN lane over a lower-HP player in another lane; empty own lane still snipes global ----
{
  const r = G.newRoom("LANELOCAL"); r.phase = "playing";
  const near = G.addPlayer(r, "near", "A");   // in the foe's lane, HEALTHIER
  const far  = G.addPlayer(r, "far", "B");    // another lane, LOWER hp (would be the old cross-lane snipe)
  r.laneCount = 3; r.lanes = [[], [], []]; r.allies = [[], [], []];
  near.lane = 1; near.maxHp = 100; near.hp = 80;
  far.lane  = 2; far.maxHp = 100; far.hp = 10;                  // globally weakest
  const foe = G.spawnEnemy("rookie"); foe.side = "foe"; foe.lane = 1; foe.queue = []; r.lanes[1].push(foe);
  eq(G.lowestEHpPlayer(r, 1).id, "far", "global snipe would pick the far low-HP player (10)");
  eq(G.foeRangedTarget(r, 1).id, "near", "…but lane-local targeting picks the player in the foe's OWN lane");
  G.resolveOps(r, foe, [{ do: "deal", amount: 7, target: "pick" }]);   // ranged (pick)
  eq(near.hp, 73, "a ranged foe hits the same-lane player (near: 80→73), not the cross-lane weakest");
  eq(far.hp, 10, "…the lower-HP player in another lane is untouched by the lane-local snipe");
  // among MULTIPLE players in the foe's lane, the LOWEST-eHP one is picked (FLAGGED design)
  const near2 = G.addPlayer(r, "near2", "C"); near2.lane = 1; near2.maxHp = 100; near2.hp = 40;
  eq(G.foeRangedTarget(r, 1).id, "near2", "multi-hero lane → the lowest effective-HP player in that lane (near2: 40 < near: 73)");
  // and when the foe's own lane empties of players, it falls back to the global weakest
  near.alive = false; near2.alive = false;
  eq(G.foeRangedTarget(r, 1).id, "far", "empty own lane → fall back to the global lowest-HP snipe (far)");
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
  eq(G.logNm(fstack), "foe 3 rats", "combat logs preserve the live rat-stack count instead of hiding a scaled Bite behind generic 'foe Rat'");
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
  // DEPRESSION DEMON: +2 magnitude at base; Specialty adds magnitude; Mastery doubles duration.
  const { r, p, foe } = rig("depressionDemon", { foeHp: 100 });
  G.resolveOps(r, p, [{ do: "slow", target: "pick", dur: 60 }]);
  const b = (foe.buffs ?? []).find((x) => x.kind === "slow");
  ok(b && b.amount === 2 && b.dur === 60, "Depression Demon adds +2 magnitude without changing base duration");
  p.levelAllocation = { hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 2 };
  foe.buffs = [];
  G.resolveOps(r, p, [{ do: "sap", target: "pick", amount: 1, dur: 60 }]);
  const sap = foe.buffs.find((x) => x.kind === "sap");
  ok(sap && sap.amount === 5 && sap.dur === 120,
    "Specialty rank 2 adds +4 magnitude total and Mastery doubles the applied duration");
}
{
  // KILLIONAIRE: starts with 3 and now gains exactly 1 moxie per legitimate defeat.
  const k = G.spawnEnemy("killionaire"); k.moxie = 0;
  G.applyCombatStart(k);
  eq(k.moxie, 3, "Killionaire starts combat with 3 moxie");
}
{
  // BOOKIE BONELORD: only its OWN defeated summons feed its generic damage ramp.
  const r = G.newRoom("BONE"); r.phase = "playing"; r.laneCount = 1; r.allies = [[]];
  const p = G.addPlayer(r, "p", "P"); G.wearBody(p, "bonelord"); p.lane = 0;
  const victim = G.spawnEnemy("rookie"); victim.hp = victim.maxHp = 1; victim.lane = 0;
  r.lanes = [[victim]];
  const m0 = G.meleeBonusOf(p), r0 = G.rangedBonusOf(p);
  G.summonBodies(r, p, { do: "summon", body: "rat", count: 2 });
  const rat = r.allies[0][0];
  G.hurtAllyToken(r, 0, rat, 1, victim);
  eq(G.meleeBonusOf(p), m0 + 1, "Bonelord gains +1 melee when one of its summoned rats is defeated");
  eq(G.rangedBonusOf(p), r0 + 1, "the owned-summon reward also grants +1 ranged");
  G.damageEnemy(r, 0, victim, 5, p);
  eq(G.meleeBonusOf(p), m0 + 1, "Bonelord does not ramp from an ordinary foe defeat");
  eq(BODIES.bonelord.maxHp, 14, "Bookie Bonelord has 14 base HP");
}
{
  // NEPOTISTIC NEPTUNE: every card costs 2 more (capped at costMax 10). doubleExpensive retargeted
  // 5→6 (owner 2026-07-10 "change to be 6 and above"; 6 is a POST-R2 cost).
  const base = G.cardCost("oFire");
  eq(G.cardCost("oFire", BODIES.neptune), Math.min(10, base + 2), "Neptune: cards cost +2 (capped at 10)");
  eq(BODIES.neptune.doubleExpensive, 6, "Neptune echoes cards costing 6+ (doubleExpensive threshold, retargeted 5→6)");
  // FUNCTIONAL BOUNDARY: a card whose (Neptune-adjusted) cost is 6 resolves TWICE; a 5-cost one does NOT.
  { const { r, p, foe } = rig("neptune");
    p.cards = G.mintCards(["oSword", "oHatchet"]); p.hand = [...p.cards]; p.deck = []; p.moxie = 99;
    eq(G.cardCost("oSword", BODIES.neptune), 5, "…oSword's Neptune cost is 5 (base 3 +2) — below the threshold");
    eq(G.cardCost("oHatchet", BODIES.neptune), 6, "…oHatchet's Neptune cost is 6 (base 4 +2) — at the threshold");
    let h0 = foe.hp; const sw = p.hand.find((c) => c.key === "oSword"); G.playCard(r, p, sw.id);
    eq(h0 - foe.hp, 2, "Neptune: a 5-cost card resolves ONCE (Sword 2 → 2, below 6)");
    h0 = foe.hp; const ha = p.hand.find((c) => c.key === "oHatchet"); G.playCard(r, p, ha.id);
    eq(h0 - foe.hp, 6, "Neptune: a 6-cost card resolves TWICE (Hatchet 3 → 6, at 6)"); }
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
  // self/ally cards are TYPELESS — shields, armor, heals, buffs, ramps, summons all feed neither.
  // (oDemonForm is TYPELESS again 2026-07-10: its every-6s tick is SELF-damage (selfHit → the caster),
  // touching no foe, so opsTouchFoes stays false. Sharpened Edges likewise — a pure modal buff, no foe.)
  for (const k of ["dBuckler", "dShield", "dHeartGuard", "dTowerShield", "dBloodIron", "dLiquidMetal",
                   "dThorns", "dStoneskin", "dTrollskin", "oBerserker", "oHaste", "oHoly", "oPowerUp",
                   "oSharpEdges", "oSageMode", "oDemonForm", "oMoxiePool", "oHedgeKnight"])   // oWizardHat DELETED 2026-07-09; the MODAL buffs stay typeless (touch no foe)
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
  // MID-MANAGEMENT MEDUSA: each landed damage instance poisons that exact surviving target by 1.
  const { r, p, foe } = rig("medusa", { inv: ["dShield", "oDagger", "oFire"] });
  fire(r, p, 0); eq(foe.poison ?? 0, 0, "Medusa: a non-damaging Shield applies no poison");
  fire(r, p, 2); eq(foe.poison ?? 0, 1, "…Fire damages and poisons its target by 1");
  fire(r, p, 1); eq(foe.poison ?? 0, 2, "…melee damage also poisons its exact target");
}
{
  // FOE MEDUSA uses the same per-damage poison path.
  const { r, p } = rig("rookie");
  const medusa = G.spawnEnemy("medusa", []); medusa.side = "foe"; medusa.lane = 0;
  medusa.queue = G.mintCards(["oFire"]); medusa.moxie = 99; r.lanes = [[medusa]];
  ok(G.foeCast(r, medusa), "foe Medusa casts her ranged card");
  eq(p.poison ?? 0, 1, "foe Medusa: ranged card applies 1 poison to the hero lane");
  ok(r.combatLog.some((line) => line.includes("Medusa applies 1 poison to Rookie Mimic")),
    "…the combat log names Medusa's poison application");
  const hpAfterCast = p.hp;
  for (let i = 0; i < 60; i++) G.tickPoison(r, p, 0);
  eq(p.hp, hpAfterCast - 1, "…the applied poison ticks for 1 damage after 6 seconds");
  ok(r.combatLog.some((line) => line.includes("Poison")), "…the poison tick is identified in the combat log");
}
{
  // Passive/timer attacks must name their source in the post-mortem. This is what made five Hydra
  // Head bites appear as anonymous damage immediately below the player's own card in ROOM M.
  const { r } = rig("rookie");
  const head = G.spawnEnemy("hydraHead", []); head.side = "foe"; head.lane = 0; r.lanes = [[head]];
  G.resolveOps(r, head, [{ do: "attack" }]);
  ok(r.combatLog.some((line) => line.includes("to Rookie Mimic") && line.includes("from foe Hydra Head")),
    "Hydra Head passive attack names its source in the combat log");
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
  p.shield = 0; fire(r, p, 1); eq(p.shield, 3, "a typeless shield (Shield) stays FLAT — no ranged scaling (3, owner 2026-07-11)");
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

// ---- ELITE BODY ADOPTION: one shared first-wear price per fantasy tier (owner 2026-07-17) --
{
  const ten = ["oSword","oHatchet","oSpear","oBow","oDagger","oFire","oLightning","oWind","oArcane","oHoly"];
  const ELITE = "fundjin", ELITE2 = "debtDragon", COMMON = "frugal";
  const C = G.ELITE_TIERS[G.eliteTierOf(ELITE)].adopt;
  const C2 = G.ELITE_TIERS[G.eliteTierOf(ELITE2)].adopt;
  const mk = () => {
    const r = G.newRoom("ADOPT"); r.telemOff = true; r.floor = 1; r.phase = "won";
    const p = G.addPlayer(r, "p", "P");
    p.bodyKey = "rookie"; p.homeBody = "rookie";
    p.deckList = [...ten]; p.backpack = [...ten];           // 0 spares
    r.unlockedBodies.add(ELITE); r.unlockedBodies.add(COMMON);
    return { r, p };
  };
  ok(typeof G.ADOPT_COST === "number" && G.ADOPT_COST > 0, "ADOPT_COST remains the positive Tier-I compatibility alias");
  ok(G.BODIES?.[ELITE]?.elite === true, "the test ELITE body is actually tagged elite");
  // a COMMON felled body is FREE to wear (no payment)
  { const { r, p } = mk();
    eq(G.adoptCost(r, COMMON), 0, "a COMMON body is free to become (cost 0)");
    ok(G.swapBody(r, p, COMMON) === COMMON, "…and swaps with no pay-cards");
  }
  // an ELITE with NO pay-cards → rejected (the price must be tendered)
  { const { r, p } = mk();
    eq(G.adoptCost(r, ELITE), C, "an un-adopted mythic costs its Tier-III adoption price");
    ok(!G.swapBody(r, p, ELITE), "swapBody to an elite with no pay-cards is REJECTED");
    eq(p.bodyKey, "rookie", "…still wearing the starter");
  }
  // PAY enough card VALUE → adopted, worn, cards spent, deck untouched, then FREE
  { const { r, p } = mk();
    p.backpack = [...ten, ...Array(C).fill("oSword")];    // C value-1 spare copies beyond the deck
    ok(G.swapBody(r, p, ELITE, Array(C).fill("oSword")), "adopt succeeds when tendered value covers the price");
    eq(p.bodyKey, ELITE, "…now wearing the adopted elite");
    eq(p.backpack.length, 10, "…the spare pay-cards were spent");
    eq(p.deckList.length, G.MIN_DECK, "…the combat deck was untouched (spares tendered first)");
    ok(r.adoptedBodies.has(ELITE), "…the elite is marked adopted for the run");
    eq(G.adoptCost(r, ELITE), 0, "…and is now FREE to re-wear");
  }
  // UNDER-PAY is rejected (value must COVER the price)
  { const { r, p } = mk();
    const few = Array(Math.max(0, C - 1)).fill("oSword");
    p.backpack = [...ten, ...few];
    ok(!G.swapBody(r, p, ELITE, few), "under-paying the adoption price is REJECTED");
    eq(p.bodyKey, "rookie", "…no swap happened, no cards lost");
    eq(p.backpack.length, 10 + few.length, "…the would-be payment was not spent");
  }
  // RE-WEAR an already-adopted elite is FREE (adopt two elites, swap back to the first with no pay)
  { const { r, p } = mk();
    r.unlockedBodies.add(ELITE2);
    p.backpack = [...ten, ...Array(C + C2).fill("oSword")];
    ok(G.swapBody(r, p, ELITE, Array(C).fill("oSword")), "adopt elite #1");
    ok(G.swapBody(r, p, ELITE2, Array(C2).fill("oSword")), "adopt elite #2 at its own tier price");
    ok(G.swapBody(r, p, ELITE), "re-wear the already-adopted elite #1 with NO pay-cards");
    eq(p.bodyKey, ELITE, "…wearing elite #1 again, free");
  }
  // SNAPSHOT exposes every tier price + the adopted set
  { const { r } = mk();
    const s = G.snapshot(r);
    eq(s.adopt.tiers[1].cost, 4, "snapshot ships Tier-I adoption price");
    eq(s.adopt.tiers[2].cost, 7, "snapshot ships Tier-II adoption price");
    eq(s.adopt.tiers[3].cost, 11, "snapshot ships Tier-III adoption price");
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
    fire(r, p, 0); eq(h0 - (foe.hp + extra.hp), 9, "Moonlight: 5 base + melee 2 + ranged 2 = 9, FRONT only under the 3+ gate");
    p.meleeBonus = 3; p.rangedBonus = 3;
    h0 = foe.hp + extra.hp;
    fire(r, p, 0); eq(h0 - (foe.hp + extra.hp), 33, "…at 3+/3+ it hits the front for 11, then beams the whole lane for 11 more"); }
  // Dual-Handing Two-Handers (owner 2026-07-10): EFFECT REPLACED — melee cards you play that cost ≥6
  // are played an ADDITIONAL time this fight (was: melee 5+ cost −3). No cost change now.
  { const { r, p, foe } = rig("rookie", { inv: ["oDualHand", "oZweihander", "oButcherCleaver"], foeHp: 1000 });
    eq(G.playCost("oZweihander", BODIES.rookie, p), 6, "Zweihänder still costs 6 — Dual-Handing no longer discounts");
    fire(r, p, 0);                                            // cast Dual-Handing Two-Handers
    ok(p.dualWield, "…casting it sets the per-fight dualWield flag");
    let h0 = foe.hp; const zw = p.hand.find((c) => c.key === "oZweihander"); p.moxie = 99; G.playCard(r, p, zw.id);
    eq(h0 - foe.hp, 10, "…a ≥6-cost melee card (Zweihänder ⚡6, deal 5) is played TWICE → 10");
    h0 = foe.hp; const bc = p.hand.find((c) => c.key === "oButcherCleaver"); p.moxie = 99; G.playCard(r, p, bc.id);
    eq(h0 - foe.hp, 4, "…a 5-cost melee card (Butcher's Cleaver ⚡5, deal 4) is NOT replayed → 4");
    G.beginCombat(r); ok(!p.dualWield, "…the replay buff is per-fight (cleared on beginCombat)"); }
  // Power Word: Gun — ⚡10, 13 aimed
  { eq(G.KIT.oPowerWordGun.cost, 10, "PW:Gun costs the full moxie bar");
    const { r, p, foe } = rig("rookie", { inv: ["oPowerWordGun"], foeHp: 1000 });
    const h0 = foe.hp; fire(r, p, 0); eq(h0 - foe.hp, 13, "…and deals 13"); }
  // MIN-1 COST FLOOR REMOVED (owner 2026-07-10): cost-reduction can now reach 0, and a 0-cost card PLAYS FREE.
  { // (a) the cost function no longer clamps a reduction up to 1 — a big enough discount lands at 0
    eq(G.cardCost("oArcane", { costKind: { kind: "ranged", amount: 9 } }), 0,
       "cost floor removed: a ranged discount past the base lands at 0, not 1");
    eq(G.playCost("oArcane", { costKind: { kind: "ranged", amount: 9 } }, null), 0,
       "…and playCost carries that 0 through");
    // (b) a 0-cost card PLAYS FREE end-to-end: the play-gate lets it through at 0 moxie, nothing spent
    const { r, p, foe } = rig("rookie", { inv: ["oArcane", "oFire"], foeHp: 1000 });
    p.freeNext = true; p.moxie = 0;                          // freeNext → live cost 0 (any 0-cost source exercises the same gate)
    eq(G.playCost("oArcane", G.BODIES.rookie, p), 0, "…a freed card's live cost is 0");
    const c = p.hand.find((x) => x.key === "oArcane"); const h0 = foe.hp;
    ok(G.playCard(r, p, c.id), "…and playCard SUCCEEDS with 0 moxie (0-cost plays free)");
    eq(p.moxie, 0, "…no moxie was spent (still 0)");
    eq(h0 - foe.hp, 1, "…and the card's effect resolved (Arcane dealt 1)"); }
  // Gravity Greatshield: +6 shield; sap ONLY the caster's own lane (owner 2026-07-09, lane-scoped)
  { const { r, p, foe } = rig("rookie", { inv: ["oGravityShield"] });
    r.laneCount = 2; r.allies.push([]);
    const f1 = G.spawnEnemy("cleric", []); f1.hp = f1.maxHp = 1000; f1.queue = [];
    r.lanes.push([f1]);                                    // a foe in a DIFFERENT lane than the caster (lane 0)
    fire(r, p, 0); eq(p.shield, 6, "Gravity Greatshield: +6 shield");
    ok(G.hasBuff(foe, "sap"), "…a foe in the CASTER'S OWN lane is SAPPED");
    ok(!G.hasBuff(f1, "sap"), "…a foe in ANOTHER lane is NOT sapped (lane-scoped, owner 2026-07-09)");
    eq(G.foeDealHit(r, foe, { amount: 5 }, null), 2, "…a sapped 5-hit lands 2 (flat −3)"); }
  // BANSHEE WAIL (owner 2026-07-10, W2-C): RANGED lane debuff = base −1 + the caster's ranged bonus;
  // ONLY the caster's own lane is hit — a foe in another lane is untouched. Reuses the `sap` machinery.
  { const { r, p, foe } = rig("rookie", { inv: ["oBansheeWail"] });
    r.laneCount = 2; r.allies.push([]);
    const f1 = G.spawnEnemy("cleric", []); f1.hp = f1.maxHp = 1000; f1.queue = [];
    r.lanes.push([f1]);                                   // a foe in a DIFFERENT lane than the caster (lane 0)
    p.rangedBonus = 2;                                    // the debuff scales: 1 + 2 = 3
    fire(r, p, 0);
    eq(G.buffAmt(foe, "sap"), 3, "Banshee Wail: a same-lane foe is sapped 1 + ranged bonus (=3)");
    ok(!G.hasBuff(f1, "sap"), "…a foe in ANOTHER lane is NOT sapped (lane-scoped)");
    eq(G.foeDealHit(r, foe, { amount: 5 }, null), 2, "…that foe's outgoing 5-hit lands 2 (flat −3, the debuff)"); }
  // ZA WARUDO (owner 2026-07-10, W2-C): lane STASIS — a foe in the caster's lane can't cast, can't
  // gain moxie, and NO positive trigger fires for it (timed). Three suppression points: foeCast/
  // playCard, regenMoxie, tickRegens.
  { const { r, p, foe } = rig("rookie", { inv: ["oZaWarudo"], foeHp: 1000 });
    foe.side = "foe"; foe.lane = 0;
    foe.queue = G.mintCards(["oSword"]); foe.moxie = 99; foe.moxieClock = 0;
    ok(G.foeCast(r, foe) === true, "control: an un-stasis'd foe casts normally");
    // hero casts Za Warudo → the same-lane foe enters stasis
    foe.queue = G.mintCards(["oSword"]); foe.moxie = 99; foe.moxieClock = 0;
    fire(r, p, 0);
    ok(G.hasBuff(foe, "stasis"), "Za Warudo: the same-lane foe is put in STASIS");
    const mox0 = foe.moxie, qlen0 = foe.queue.length;
    ok(G.foeCast(r, foe) === false, "…a stasis'd foe CANNOT cast (attempt blocked)");   // (1) casts
    eq(foe.moxie, mox0, "…no moxie was spent on the blocked cast");
    eq(foe.queue.length, qlen0, "…and its queue did not cycle");
    foe.moxie = 0; foe.moxieClock = 0;                                                   // (2) moxie gain
    for (let t = 0; t < 20; t++) G.regenMoxie(foe, 1);
    eq(foe.moxie, 0, "…a stasis'd foe gains NO moxie over ticks");
    foe.hp = 500; foe.regens = [{ kind: "heal", amount: 10, period: 1, charge: 0 }];     // (3) positive trigger
    G.tickRegens(foe, r);
    eq(foe.hp, 500, "…a positive (heal) regen does NOT fire while in stasis");
    foe.buffs = [];                                                                      // clear stasis → the gate lifts
    G.tickRegens(foe, r);
    eq(foe.hp, 510, "…once stasis clears, the SAME heal fires (+10) — proving stasis was the gate");
    foe.moxie = 0; foe.moxieClock = 0;
    for (let t = 0; t < 20; t++) G.regenMoxie(foe, 1);
    ok(foe.moxie > 0, "…and moxie regens again once stasis is gone (+2 over 20 ticks)"); }
  // SYMMETRY: a FOE casting Za Warudo locks the HERO lane too (playCard blocked) — the engine mirrors.
  { const { r, p, foe } = rig("rookie", { inv: ["oSword"] });
    foe.side = "foe"; foe.lane = 0;
    G.resolveOps(r, foe, KIT.oZaWarudo.ops);             // foe-side stasis → heroes in the foe's lane
    ok(G.hasBuff(p, "stasis"), "a foe-cast Za Warudo puts the HERO in stasis (symmetry)");
    const card = p.hand.find((x) => x.key === "oSword");
    ok(G.playCard(r, p, card.id) === false, "…and a stasis'd HERO cannot play a card"); }
  // Treasure Blade: refund = damage dealt
  { const { r, p } = rig("rookie", { inv: ["oTreasureBlade"], foeHp: 1000 });
    p.moxie = 5; const card = p.hand.find((x) => x.key === "oTreasureBlade"); ok(G.playCard(r, p, card.id), "Treasure Blade plays");
    eq(p.moxie, 4, "…cost 4 (+1 sweep), dealt 3, refunded 3 (net −1)"); }
  // Rainblow Blade (owner 2026-07-09; base 1 = OWNER RULING 2026-07-11 "give 1 base damage" — applied
  // to BOTH strikes, FLAGged in kit.js): immediate FRONT strike for 1+melee+ranged, THEN a 6s delayed lane strike
  { const { r, p, foe } = rig("rookie", { inv: ["oRainblow"], foeHp: 1000 });
    p.meleeBonus = 2; p.rangedBonus = 3;
    const live = G.cardLiveDmg("oRainblow", p);
    eq(live.now, 6, "Rainblow card headline includes base + current melee + current ranged bonuses");
    eq(live.label, "6🗡🎯", "Rainblow card headline identifies both scaling bonuses");
    const hStart = foe.hp;
    fire(r, p, 0);
    eq(hStart - foe.hp, 6, "Rainblow hits the FRONT foe immediately for base(1)+melee(2)+ranged(3)");
    eq((p.timers ?? []).length, 1, "…and installs a one-shot timer for the lane strike");
    eq(p.timers[0].sourceCard, "oRainblow", "…the delayed strike retains Rainblow's card identity");
    const h0 = foe.hp; for (let i = 0; i < 60; i++) G.tickTimers(r, p, 0);
    eq(h0 - foe.hp, 6, "…after 6s it hits the whole lane for base(1)+melee(2)+ranged(3)");
    eq((p.timers ?? []).length, 0, "…and the timer EXPIRES (once, not every 6s)");
    // base 1 with NO bonuses: both strikes land 1 (was 0/pure-scaling before the 7/11 ruling)
    const { r: rb, p: pb, foe: fb } = rig("rookie", { inv: ["oRainblow"], foeHp: 1000 });
    const hb = fb.hp; fire(rb, pb, 0);
    eq(hb - fb.hp, 1, "…a bonus-less Rainblow still lands its 1 base on the front strike (owner 2026-07-11)");
    const hb2 = fb.hp; for (let i = 0; i < 60; i++) G.tickTimers(rb, pb, 0);
    eq(hb2 - fb.hp, 1, "…and 1 base on the delayed lane strike too (FLAG: owner said '1 base' without naming a hit)"); }
  // OWNER 2026-07-16: Rainblow is statically MELEE + RANGED. The front cast and delayed lane strike each
  // fire both Runeblade trigger halves.
  { const { r, p } = rig("pyramidRogue", { inv: ["oRainblow"], foeHp: 1000 });
    fire(r, p, 0);
    eq(p.rangedBonus, 1, "Rainblow CAST fires Runeblade's melee half (+1 ranged)");
    eq(p.meleeBonus ?? 0, 1, "…and its ranged half (+1 melee)");
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
  // Whip (melee-tagged lane; front +1 = OWNER RULING 2026-07-11) + Cross-Blade (lane now + once-echo in 6s)
  { const { r, p, foe } = rig("rookie", { inv: ["oWhip", "oCrossBlade"], foeHp: 1000 });
    p.meleeBonus = 1; const h0 = foe.hp; fire(r, p, 0);
    eq(h0 - foe.hp, 4, "Whip: lane damage takes the MELEE bonus and the lane FRONT takes +1 more (2+1+1)");
    const h1 = foe.hp; fire(r, p, 1); eq(h1 - foe.hp, 3, "Cross-Blade: first lane strike lands now (2+1) — no front rider");
    const h2 = foe.hp; for (let i = 0; i < 60; i++) G.tickTimers(r, p, 0);
    eq(h2 - foe.hp, 3, "…and echoes once after 6s with the same melee scaling (2+1)"); }
  // Whip FRONT +1 in a crowded lane: the front foe takes 3, the rest of the lane 2 (owner 2026-07-11)
  { const { r, p, foe } = rig("rookie", { inv: ["oWhip"], foeHp: 1000 });
    const back = G.spawnEnemy("cleric", []); back.hp = back.maxHp = 1000; back.queue = []; r.lanes[0].push(back);
    fire(r, p, 0);
    eq(1000 - foe.hp, 3, "Whip: the FRONT foe takes 3 (2 lane + 1 front rider)");
    eq(1000 - back.hp, 2, "…while the foe BEHIND it takes the plain lane 2");
    // foe symmetry: a foe's Whip whips the hero lane — the front of the unified line takes +1
    const { r: r2, p: p2 } = rig("rookie", { pHp: 100 });
    const mate2 = G.addPlayer(r2, "m2", "M2"); G.wearBody(mate2, "rookie"); mate2.lane = 0; mate2.maxHp = mate2.hp = 100; mate2.depth = 5; // behind p2
    const gf = G.spawnEnemy("rookie", ["oWhip"]); gf.lane = 0; r2.lanes[0].push(gf); gf.moxie = 99;
    p2.depth = 0;
    ok(G.foeCast(r2, gf), "foe symmetry: a foe casts Whip");
    eq(100 - p2.hp, 3, "…the hero-side FRONT (unified line) takes 3 (2+1 front rider)");
    eq(100 - mate2.hp, 2, "…and the hero behind takes the plain 2"); }
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
    eq(h0 - foe.hp, 4, "TK Blades: Sword (2) scales with the RANGED bonus (+2) and aims at the reticle"); }
  // Giant's Belt: max HP += base health + heals the gain WITHIN the fight; the bonus is undone when the
  // fight ENDS (at ROOM CLEAR now, not deferred to the next beginCombat — else a between-room level-up/swap
  // that recomputes maxHp gets clobbered back to the stale snapshot; see the dedicated regression block above).
  { const { r, p } = rig("rookie", { inv: ["oGiantsBelt"], pHp: 10 });
    p.hp = 4; fire(r, p, 0);
    eq(p.maxHp, 20, "Giant's Belt: max HP += base health (10 → 20)");
    eq(p.hp, 14, "…healing the gained amount (+10)");
    G.resolveOps(r, p, G.KIT.oGiantsBelt.ops);                                   // NERF: a 2nd belt this fight must not stack
    eq(p.maxHp, 20, "Giant's Belt does NOT compound — a second cast adds nothing (still 20, not 30/40)");
    eq(p.hp, 14, "…and the re-cast heals nothing either");
    r.lanes = [[]]; r.draftedFoes = []; r.telemOff = true; G.simulateTick(r);   // clear the room → the fight ends
    eq(r.phase, "won", "…the room clears");
    eq(p.maxHp, 10, "…and the belt bonus is UNDONE at fight end (this-fight duration)"); }
  // Bribed Bishop: healed → +1 generic damage
  { const { r, p } = rig("bribedBishop", { inv: ["dHeartGuard"] });
    p.hp = 3; fire(r, p, 0);
    eq(p.counters, 1, "Bribed Bishop: being healed grants +1 generic damage");
    eq(G.meleeBonusOf(p), 1, "…which raises melee damage");
    eq(G.rangedBonusOf(p), 1, "…and ranged damage"); }
  // Cheque Cherub: every 3rd card heals the most-hurt friendly target for 6
  { const { r, p } = rig("chequeCherub", { inv: ["oArcane"] }); p.hp = 50;
    fire(r, p, 0); fire(r, p, 0);
    eq(p.hp, 50, "Cheque Cherub: the first two cards do not heal");
    fire(r, p, 0);
    eq(p.hp, 56, "…the 3rd card heals the most-hurt friendly target for 6"); }
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
  // Economy Elemental: +3 / −1 alternating every 6s
  { const { p } = rig("econElemental");
    G.applyCombatStart(p); p.moxie = 0;
    for (let i = 0; i < 60; i++) G.tickRegens(p);
    eq(p.moxie, 3, "Economy Elemental: first cycle +3");
    for (let i = 0; i < 60; i++) G.tickRegens(p);
    eq(p.moxie, 2, "…second cycle −1 (alternating)"); }
  // WAREWOLF (owner 2026-07-11): flips HUMAN <-> WAREWOLF every 6s (60 ticks). HUMAN start = −3 melee &
  // ranged + 1 DR; WAREWOLF = +3 melee, ranged normal, 0 DR. Applied as deltas off the level base (0 here).
  { const { r, p } = rig("warewolf");
    G.applyCombatStart(p);
    eq(p.wform, "human", "Warewolf opens in HUMAN form");
    eq(p.meleeBonus, -3, "…HUMAN: −3 melee");
    eq(p.rangedBonus, -3, "…HUMAN: −3 ranged");
    eq(p.dmgReduce, 1, "…HUMAN: +1 DR");
    eq(G.bodyFlatDR(p), 1, "…bodyFlatDR reads the 1 DR (feeds effectiveDamageTo / damagePlayer / snapshot)");
    for (let i = 0; i < 60; i++) G.tickRegens(p, r);          // 6s → first flip
    eq(p.wform, "wolf", "after 6s → WAREWOLF form");
    eq(p.meleeBonus, 3, "…WAREWOLF: +3 melee (a +6 swing)");
    eq(p.rangedBonus, 0, "…WAREWOLF: ranged back to normal (0)");
    eq(p.dmgReduce, 0, "…WAREWOLF: no DR");
    eq(G.bodyFlatDR(p), 0, "…bodyFlatDR reads 0 in wolf form (nullish keeps the real 0)");
    for (let i = 0; i < 60; i++) G.tickRegens(p, r);          // 12s → flips back
    eq(p.wform, "human", "after another 6s → back to HUMAN");
    eq(p.meleeBonus, -3, "…HUMAN again: −3 melee");
    eq(p.rangedBonus, -3, "…HUMAN again: −3 ranged");
    eq(p.dmgReduce, 1, "…HUMAN again: +1 DR"); }
  // WAREWOLF DR actually softens incoming damage in HUMAN form, and NOT in WAREWOLF form (min-1 floor).
  { const { r, p } = rig("warewolf", { foeHp: 1000 });
    p.alive = true;                                           // damagePlayer early-returns on a downed player
    G.applyCombatStart(p);                                    // HUMAN: 1 DR
    const before = p.hp; G.damagePlayer(r, p, 5); eq(before - p.hp, 4, "HUMAN Warewolf takes 5→4 (1 DR)");
    for (let i = 0; i < 60; i++) G.tickRegens(p, r);          // → WAREWOLF: 0 DR
    const before2 = p.hp; G.damagePlayer(r, p, 5); eq(before2 - p.hp, 5, "WAREWOLF Warewolf takes the full 5 (no DR)"); }
  // Wandering Castle: 5+-cost casts grant that much shield; ALL shield gains +1
  { const { r, p } = rig("wanderCastle", { inv: ["oZweihander", "dShield"], foeHp: 1000 });
    fire(r, p, 0); eq(p.shield, 7, "Wandering Castle: a ⚡6 cast grants 6 shield + his +1 (+1 sweep: Zweihänder 5→6)");
    fire(r, p, 1); eq(p.shield, 11, "…and card shields gain +1 too (Shield 3 → 4; 7 + 4 = 11 — dShield 3, owner 2026-07-11)"); }
  // Earth + Lava Elemental summons arrive with their kits
  { const { r, p } = rig("rookie", { inv: ["oEarthElemental", "oLavaElemental"] });
    fire(r, p, 0); fire(r, p, 1);
    eq(r.allies[0].length, 2, "Earth + Lava Elementals summon into the lane");
    ok(r.allies[0].some((t) => t.bodyKey === "earthElemental") && r.allies[0].some((t) => t.bodyKey === "lavaElemental"), "…the right tokens"); }
}

// ---- OWNER BATCH D (2026-07-07): Black Hole, Lion Lance, Crystal Ball, Mirror Shield, Grand Spirit —
// each mechanic proven, incl. the PICK CONTRACT (play `pick` + snapshot descriptor) and foe symmetry.
{
  // BLACK HOLE: ⚡10, hit every foe and boss for 8 immediately, then repeat every 6 seconds.
  { eq(KIT.oBlackHole.cost, 10, "Black Hole costs 10 (owner 2026-07-10 rework)");
    const { r, p, foe } = rig("rookie", { inv: ["oBlackHole"], foeHp: 1000 });
    r.laneCount = 2; r.allies.push([]);
    const f1a = G.spawnEnemy("cleric", []); f1a.hp = f1a.maxHp = 1000; f1a.queue = [];
    const f1b = G.spawnEnemy("cleric", []); f1b.hp = f1b.maxHp = 1000; f1b.queue = [];
    r.lanes.push([f1a, f1b]);
    const boss = G.spawnEnemy("cleric", []); boss.hp = boss.maxHp = 1000; boss.queue = []; boss.lane = 0; r.boss = boss; // a back-line boss too
    p.targetId = f1a.id;
    fire(r, p, 0);
    ok(foe.hp === 992 && f1a.hp === 992 && f1b.hp === 992, "Black Hole: 8 to EVERY foe in EVERY lane (whole board)");
    eq(boss.hp, 992, "…and 8 to the back-line boss");
    ok(!G.hasBuff(foe, "sap") && !G.hasBuff(f1a, "sap") && !G.hasBuff(f1b, "sap") && !G.hasBuff(boss, "sap"),
      "…Black Hole applies no damage-reduction debuff");
    eq(G.foeDealHit(r, f1a, { amount: 10 }, null), 10, "…foe damage remains unchanged");
    for (let i = 0; i < 60; i++) G.tickTimers(r, p, 0);
    ok(foe.hp === 984 && f1a.hp === 984 && f1b.hp === 984, "…after 6 seconds it deals another 8 to every foe");
    eq(boss.hp, 984, "…and retriggers against the boss too");
    ok(G.isRanged("oBlackHole") && G.triggerKind("oBlackHole") === "ranged", "…Black Hole derives RANGED (it touches foes)"); }
  // LION LANCE: ⚡5; Spear's exact two-target
  // shape (2 to the front foe AND the foe behind it) + a "+2 across the board" rider (counter: both kinds).
  { const { r, p, foe } = rig("rookie", { inv: ["oLionLance"], foeHp: 1000 });
    eq(KIT.oLionLance.cost, 5, "Lion Lance costs 5");
    eq(G.cardKind("oLionLance"), "melee", "…MELEE-typed (front2 strike)");
    eq(G.triggerKind("oLionLance"), "melee", "…and feeds melee play-triggers");
    eq(JSON.stringify(KIT.oLionLance.ops[0]), JSON.stringify(KIT.oSpear.ops[0]), "…its strike op IS Spear's exact two-target op (owner 2026-07-11)");
    const back = G.spawnEnemy("cleric", []); back.hp = back.maxHp = 1000; back.queue = []; r.lanes[0].push(back);
    fire(r, p, 0);
    eq(1000 - foe.hp, 2, "Lion Lance: 2 to the front foe (the ramp lands AFTER the strike)");
    eq(1000 - back.hp, 2, "…AND 2 to the foe behind it (the Spear shape)");
    eq(G.meleeBonusOf(p), 2, "…and grants +2 melee (the across-the-board rider, owner's number)");
    eq(G.rangedBonusOf(p), 2, "…AND +2 ranged (generic counter lifts both)");
    for (let i = 0; i < 200; i++) G.tickBuffs(p);          // 20s — a timed buff would be long gone
    eq(G.meleeBonusOf(p), 2, "…which PERSISTS for the rest of the fight (not a timed buff)");
    const h1 = foe.hp, b1 = back.hp; fire(r, p, 0);
    eq(h1 - foe.hp, 4, "…so the second Lance hits the front for 4 (2 + its own +2 ramp)");
    eq(b1 - back.hp, 4, "…and the foe behind for 4 too"); }
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
    // USED-CARD TUTOR (owner 2026-07-10 "let it pick ANY card including used ones"): the pool now
    // includes the DISCARD, so an already-played card can be scried up — not just draw-pile cards.
    const { r: r6, p: p6 } = rig("rookie", { inv: ["oCrystalBall"] });
    p6.deck = G.mintCards(["oSword", "oSword"]);   // draw pile (a couple, so drawUp never has to recycle)
    p6.disc = G.mintCards(["oMeteors"]);           // a USED card resting in the discard
    const cb6 = p6.hand.find((c) => c.key === "oCrystalBall");
    ok(G.playCard(r6, p6, cb6.id, "oMeteors"), "Crystal Ball plays, picking a USED (discarded) card");
    ok(p6.hand.some((c) => c.key === "oMeteors"), "…the used card is tutored into hand (discard is in the pool now)");
    ok(!(p6.disc ?? []).some((c) => c.key === "oMeteors"), "…and pulled OUT of the discard");
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
  // MIRROR SHIELD: +4 shield, the NEXT attack that lands reflects its damage — exactly once
  { const { r, p, foe } = rig("rookie", { inv: ["oMirrorShield"], pHp: 100 });
    fire(r, p, 0);
    eq(p.shield, 4, "Mirror Shield: +4 shield");
    eq(p.mirrorShield, 1, "…and one armed mirror charge");
    ok(G.entityEffects(p).some((e) => e.icon === "🪞"), "…shown as a 🪞 effect chip while armed");
    const fh0 = foe.hp;
    G.foeHitLane(r, 0, 5, foe);                            // the foe swings 5 (4 eaten by shield, 1 to HP)
    eq(p.hp, 99, "…the hit still lands on the wearer (shield first)");
    eq(fh0 - foe.hp, 5, "…and the attacker takes the SAME 5 back");
    eq(p.mirrorShield, 0, "…the mirror is CONSUMED");
    const fh1 = foe.hp;
    G.foeHitLane(r, 0, 5, foe);
    eq(fh1 - foe.hp, 0, "…the SECOND attack reflects nothing (exactly once)");
    G.beginCombat(r);
    eq(p.mirrorShield ?? 0, 0, "…an unspent charge dies with the fight (per-fight reset)"); }
  // MIRROR SHIELD FULL REFLECT (OWNER RULING 2026-07-11 "if they hit with a 10 damage card it should
  // reflect 10 damage"): the reflect = the RAW hit, NOT the post-mitigation landed amount.
  { const { r, p, foe } = rig("rookie", { inv: ["oMirrorShield"], foeHp: 1000, pHp: 100 });
    fire(r, p, 0);                                         // +4 shield, arm the mirror
    G.addBuff(p, "stoneskin", 4, 200);                     // the wearer SOFTENS the hit — the reflect must not
    const fh0 = foe.hp;
    G.foeHitLane(r, 0, 10, foe);                           // a 10-damage swing: stoneskin −4 → 6 lands (4 shield + 2 HP)
    eq(p.hp, 98, "full reflect: the softened hit lands 6 on the wearer (4 shield + 2 HP)");
    eq(fh0 - foe.hp, 10, "…but the mirror reflects the FULL RAW 10 (owner 2026-07-11), not the landed 6");
    eq(p.mirrorShield, 0, "…and the charge is consumed");
    // foe-armed mirror, player attacker: same raw-hit rule through damageEnemy
    const { r: r2, p: p2, foe: f2 } = rig("rookie", { foeHp: 1000, pHp: 100 });
    f2.mirrorShield = 1; G.addBuff(f2, "stoneskin", 4, 200);
    const ph0 = p2.hp, fh2 = f2.hp;
    G.damageEnemy(r2, 0, f2, 10, p2);
    eq(fh2 - f2.hp, 6, "foe symmetry: the foe's stoneskin softens the player's 10 to 6");
    eq(ph0 - p2.hp, 10, "…yet its mirror reflects the player's FULL RAW 10 back (owner 2026-07-11)"); }
  // GRAND SPIRIT: exact body HP and authored action cards.
  { eq(BODIES.grandAttacker.maxHp, 18, "Grand Spirit Attacker has 18 HP");
    eq(BODIES.grandCaster.maxHp, 16, "…Caster has 16 HP");
    eq(BODIES.grandTank.maxHp, 20, "…Tank has 20 HP");
    eq(KIT.tSpiritStrike.cost, 3, "…Attacker spends 3 moxie");
    eq(KIT.tSpiritStrike.ops[0].amount, 5, "…to deal 5 to the front foe");
    eq(KIT.tSpiritBolt.cost, 6, "…Caster spends 6 moxie");
    eq(KIT.tSpiritBolt.ops[0].amount, 5, "…to deal 5 to its foe lane");
    eq(KIT.tSpiritGuard.cost, 6, "…Tank spends 6 moxie");
    eq(KIT.tSpiritGuard.ops[0].amount, 3, "…to deal 3");
    eq(KIT.tSpiritGuard.ops[1].amount, 3, "…heal itself 3");
    eq(KIT.tSpiritGuard.ops[2].amount, 3, "…and gain 3 shield"); }
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
    eq(G.cardDescriptor("oSageMode").pick?.kind, "meleeRanged", "…Sage Mode carries its melee/ranged choice");
    eq(JSON.stringify(G.cardDescriptor("oSageMode").pick?.options?.map((o) => o.key)), JSON.stringify(["melee", "ranged"]),
      "…with the two bonus choices in order"); }
  // FOE SYMMETRY: every batch-D card is castable BY A FOE without crashing (the symmetry pillar)
  { for (const key of ["oBlackHole", "oLionLance", "oCrystalBall", "oMirrorShield", "oGrandSpirit", "oGravityShield"]) {
      const { r, p } = rig("rookie");
      const gf = G.spawnEnemy("rookie", [key]); gf.lane = 0; r.lanes[0].push(gf);
      gf.moxie = 99;
      ok(G.foeCast(r, gf), `foe symmetry: a foe casts ${key} (no crash)`);
      if (key === "oBlackHole") { ok(!G.hasBuff(p, "sap"), "…a foe Black Hole applies no sap"); eq(p.hp, 92, "…and its board strike lands 8 on the hero"); }
      if (key === "oGravityShield") { ok(gf.shield >= 6, "…a foe Gravity Greatshield shields itself (+6)"); ok(G.hasBuff(p, "sap"), "…and saps ITS OWN lane's heroes (owner 2026-07-09 lane-scope)"); }
      if (key === "oLionLance") eq(G.meleeBonusOf(gf), 2, "…a foe Lion Lance ramps ITS melee (+2, owner 2026-07-11)");
      if (key === "oMirrorShield") ok(gf.shield >= 4 && gf.mirrorShield === 1, "…a foe Mirror Shield arms ITS mirror");
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
    p.meleeBonus = 1;                                    // Whip = 2 + melee 1 (+1 more on the lane FRONT, owner 2026-07-11)
    const fh = foe.hp, bh = boss.hp;
    fire(r, p, 0);
    eq(fh - foe.hp, 4, "lane damage hits the front lane foe (2+1 melee, +1 front rider — owner 2026-07-11)");
    eq(bh - boss.hp, 3, "…AND the back-line boss eats the plain lane strike (never the front rider)"); }
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
  // Black Hole board damage reaches the back-line boss.
  { const { r, p, foe, boss } = laneBossRig(["oBlackHole"]);
    const bh = boss.hp;
    fire(r, p, 0);
    eq(bh - boss.hp, 8, "Black Hole: the back-line boss eats the board-wide 8 too");
    ok(!G.hasBuff(boss, "sap"), "…and Black Hole applies no sap"); }
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

// ---- OWNER 2026-07-16: Moonlight is statically BOTH melee AND ranged -------------------
// Rent-Seeking Runeblade (pyramidRogue) wears BOTH: onPlayRanged → +1 melee, onPlayMelee → +1 ranged.
// So one play's trigger-kind is legible in the bonus deltas it leaves behind (bonuses read BEFORE the
// passive fires, so the +1s never retro-trip the 3+ lane gate).
{
  // FRONT form (bonuses < 3): still fires both kind triggers; the 3+ gate changes only the target shape.
  { const { r, p } = rig("pyramidRogue", { inv: ["oMoonGreat"], foeHp: 1000 });
    p.meleeBonus = 2; p.rangedBonus = 2;
    fire(r, p, 0);
    eq(p.meleeBonus, 3, "Moonlight FRONT form fires onPlayRanged (+1 melee)");
    eq(p.rangedBonus, 3, "…and onPlayMelee (+1 ranged)"); }
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
  // FOE front form is dual-kind too (symmetric with the hero side)
  { const { r } = rig("rookie", { foeHp: 1000 });
    const gf = G.spawnEnemy("pyramidRogue", ["oMoonGreat"]); gf.lane = 0; r.lanes[0].push(gf);
    gf.moxie = 99; gf.meleeBonus = 2; gf.rangedBonus = 2;
    ok(G.foeCast(r, gf), "foe front form casts");
    eq(gf.meleeBonus, 3, "…foe front form fires onPlayRanged (+1 melee)");
    eq(gf.rangedBonus, 3, "…and onPlayMelee (+1 ranged)"); }
}

// ---- DUAL-KIND snapshot truth: `bothKinds` drives the client 🗡🎯 badge ----------------
{
  for (const key of ["oMoonGreat", "oRainblow"]) {
    eq(G.cardKind(key), "both", `${KIT[key].name}: cardKind is statically both`);
    eq(G.triggerKind(key), "both", `${KIT[key].name}: triggerKind is statically both`);
    ok(!G.isRanged(key), `${KIT[key].name}: dual typing does not change its front/lane targeting into a reticle card`);
    eq(G.cardCost(key, BODIES.ratBaron), G.cardCost(key) - 1, `${KIT[key].name}: Lizard Wizard's ranged discount applies`);
    eq(G.cardCost(key, BODIES.pennyPixie), G.cardCost(key) - 1, `${KIT[key].name}: Penny Pixie's melee discount applies`);
  }
  const { r } = rig("rookie", { inv: ["oMoonGreat", "oRainblow", "oSword"] });
  const hand = G.snapshot(r).players[0].hand;
  const byKey = (k) => hand.find((c) => c.key === k);
  eq(byKey("oMoonGreat")?.bothKinds, true, "snapshot: Moonlight ships bothKinds:true (melee AND ranged)");
  eq(byKey("oRainblow")?.bothKinds, true, "…Rainblow too — its bothKinds op is nested inside a timer (recursed)");
  eq(byKey("oSword")?.bothKinds, false, "…an ordinary card ships bothKinds:false");
}

// ---- ELITE TIER: the named elites are tagged + 2 base ante; commons stay 1; draft excludes elites (2026-06-28)
{
  ok(Array.isArray(G.ELITE_SET) && G.ELITE_SET.length === 15, "15 elites after adding Timeshare Tyrant and Oligarchy Ooze");
  ok(["killionaire","basilisk","fundjin","auditAngel","medusa","depressionDemon","bonelord","debtDragon","neptune","atlas","wanderCastle","sphinx","affluenceAnubis","timeshareTyrant","oligarchyOoze"]
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
    eq(prevNode.randomCommonLoot, real.foes.length * G.FOE_BASE_LOOT,
      "…the preview exposes the exact random-common portion of possible loot");
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
  for (const phase of ["setup", "won", "draft", "lost"]) {
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

  // (a3) SOLO setup keeps one reversible checkpoint. It restores the exact room-options surface,
  // but the checkpoint is burned as soon as combat begins.
  { const { r } = voteRig(["s0"]);
    r.lastRoomValue = 17;
    r.loot = ["oDagger"];
    r.tradeOffers = [{ id: "keep", from: "s0", to: "nobody", give: "oDagger", want: "oSword" }];
    const wonLanes = r.lanes;
    ok(G.voteRoom(r, "s0", "v1"), "room-back: solo tap enters setup immediately");
    eq(r.phase, "setup", "room-back: the chosen combat room opens in setup");
    ok(G.snapshot(r).canReturnToRooms, "room-back: setup snapshot exposes the return affordance");
    ok(G.returnToRoomOptions(r), "room-back: setup may return to the room options");
    eq(r.phase, "won", "room-back: returning restores the won/room-picker phase");
    eq(r.level.currentId, "v0", "room-back: returning restores the prior map node");
    ok(r.lanes === wonLanes, "room-back: returning restores the prior between-room board surface");
    eq(r.lastRoomValue, 17, "room-back: returning preserves the cleared room summary");
    eq(r.loot[0], "oDagger", "room-back: returning preserves unclaimed loot");
    eq(r.tradeOffers[0]?.id, "keep", "room-back: returning preserves pending between-room trades");
    ok(!G.snapshot(r).canReturnToRooms, "room-back: the picker itself has no stale return affordance");
    ok(G.voteRoom(r, "s0", "v2"), "room-back: another room can be chosen immediately");
    G.beginCombat(r);
    ok(!G.returnToRoomOptions(r), "room-back: combat start permanently commits the room choice"); }

  // (a4) REAL POST-WIN LIFECYCLE — the trailhead is not enough proof. Win an actual combat,
  // choose a room from the resulting "Room cleared" screen, back out, choose again, and start.
  // This is the exact lifecycle that previously soft-locked in the served client.
  { const r = G.newRoom("RWL"); r.telemOff = true; r.floor = 1;
    G.addPlayer(r, "s0", "SOLO");
    G.startLevel(r);
    const trail = G.currentNode(r);
    const first = trail.links.map((id) => G.nodeById(r, id)).find((n) => n?.type === "combat");
    ok(!!first && G.advanceLevel(r, first.id), "room-back real: enter the first actual combat room");
    G.beginCombat(r);
    r.lanes = Array.from({ length: r.laneCount }, () => []); r.boss = null;
    G.simulateTick(r);
    eq(r.phase, "won", "room-back real: clearing combat reaches the later Room cleared screen");
    const wonId = r.level.currentId;
    const choices = G.currentNode(r).links.map((id) => G.nodeById(r, id));
    const chosen = choices.find((n) => n?.type === "combat") ?? choices[0];
    ok(!!chosen && G.advanceLevel(r, chosen.id), "room-back real: choose a room after the win");
    eq(r.phase, "setup", "room-back real: the later room opens in setup");
    ok(G.returnToRoomOptions(r), "room-back real: Room options returns on that later-room checkpoint");
    eq(r.level.currentId, wonId, "room-back real: return restores the combat room that was actually cleared");
    eq(r.phase, "won", "room-back real: return restores the later Room cleared phase");
    const rechoices = G.currentNode(r).links.map((id) => G.nodeById(r, id));
    ok(rechoices.length > 0, "room-back real: the restored screen still has valid exits");
    const reselected = rechoices.find((n) => n?.type === "combat") ?? rechoices[0];
    ok(G.advanceLevel(r, reselected.id), "room-back real: a room can be selected again immediately");
    G.beginCombat(r);
    eq(r.phase, "playing", "room-back real: the reselected room starts combat without a soft lock"); }

  // (b) 2+ SEATS — votes DON'T enter until every seat locks in
  { const { r } = voteRig(["a", "b"]);
    ok(!G.voteRoom(r, "a", "v1"), "vote: 2 seats — a vote alone does NOT enter");
    eq(r.phase, "won", "vote: …still on the won screen");
    ok(!G.voteRoom(r, "b", "v1"), "vote: …a second seat's vote still doesn't enter");
    ok(!G.lockRoom(r, "a"), "vote: …one lock isn't enough");
    eq(r.phase, "won", "vote: …still waiting on the last seat");
    ok(G.lockRoom(r, "b"), "vote: …the LAST lock fires the tally + enter");
    eq(r.level.currentId, "v1", "vote: …both voted v1 → v1 wins");
    ok(!r.roomReturn && !G.snapshot(r).canReturnToRooms, "vote: co-op lock-in has no party-wide setup rollback"); }

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
  const blade = G.entityEffects({ cdMul: 0.5, timers: [{ ops: [{ do: "deal", amount: 1, target: "front" }], period: 60, charge: 17, sourceCard: "oAnimatedBlade" }] });
  const bladeChip = blade.find((e) => e.icon === "⏱");
  ok(bladeChip && /Strike — 1 dmg every 6s/.test(bladeChip.label), "timer chip: Animated Blade (no lifesteal) shows a ⏱ strike chip");
  eq(bladeChip.cardKey, "oAnimatedBlade", "timer chip: the client receives Animated Blade's exact card token key");
  eq(bladeChip.dur, 30, "timer chip: recurring timer duration respects the carrier's effective cdMul");
  eq(bladeChip.left, 13, "timer chip: recurring timer ships truthful time until its next tick");
  const star = G.entityEffects({ cdMul: 2, timers: [{ ops: [{ do: "gainMoxie", amount: 10 }], period: 100, charge: 25, once: true, sourceCard: "oStarblade" }] })[0];
  eq(star.cardKey, "oStarblade", "timer chip: one-shot clocks receive their card token too");
  eq(star.dur, 200, "timer chip: one-shot duration respects effective cdMul too");
  eq(star.left, 175, "timer chip: one-shot progress uses the same shared clock projection");

  const regen = G.entityEffects({ cdMul: 0.5, regens: [{ kind: "heal", amount: 2, period: 60, charge: 15, sourceCard: "dTrollskin" }] })[0];
  eq(regen.cardKey, "dTrollskin", "regen chip: recurring card effects receive their card token");
  eq(regen.dur, 30, "regen chip: recurring regen duration respects effective cdMul");
  eq(regen.left, 15, "regen chip: recurring regen ships truthful next-tick progress");

  const stacked = G.entityEffects({ cdMul: 1.5, leeches: [
    { amount: 1, period: 60, charge: 5 }, { amount: 1, period: 60, charge: 40 },
  ] })[0];
  eq(stacked.n, 2, "leech chip: independent leeches stay combined with their stack count");
  eq(stacked.dur, 90, "leech chip: duration respects the carrier's effective cdMul");
  eq(stacked.left, 50, "leech chip: combined stack shows the soonest pending drain");

  const eventChip = G.entityEffects({ revealLight: 3 })[0];
  ok(eventChip.n === 3 && eventChip.left == null && eventChip.dur == null,
     "effect chip: count/event-based effects remain untimed");
  eq(G.entityEffects({}).length, 0, "timer chip: an entity with no timers/buffs has no chips");
}

// ---- BODY/PASSIVE tracker projection -----------------------------------------------------------
// Event thresholds and recurring innate clocks are real combat state, not prose. Every measurable
// passive must publish its current/max progress through the same chip grammar as continuing cards.
{
  { const { r, p } = rig("leverage");
    G.spendTriggerPassives(r, p, 2);
    const t = G.entityTrackers(r, p).find((x) => x.id === "body:leverage:0");
    ok(!!t, "Royal Rat publishes a body tracker");
    eq(t.progress.current, 2, "Royal Rat tracker carries the live 2/3 moxie-spent remainder");
    eq(t.progress.max, 3, "Royal Rat tracker carries its authored threshold");
    ok(/next: summon 1 Rat/.test(t.label), "Royal Rat tracker explains the payoff, not just the meter");
    ok(G.snapshot(r).players[0].trackers.some((x) => x.id === "body:leverage:0"), "snapshot ships the Royal Rat tracker to the client"); }

  { const { r, p } = rig("bloodfund");
    G.hitTriggerPassives(r, p, 2);
    const t = G.entityTrackers(r, p).find((x) => x.id === "body:bloodfund:0");
    eq(t.progress.current, 2, "Market-Crash Minotaur tracker carries 2/3 damage taken");
    ok(/next: melee 1 to the front/.test(t.label), "Minotaur tracker names the pending counter-swing"); }

  { const { r, p } = rig("rentier");
    G.resolveOps(r, p, [{ do: "deal", amount: 1, target: "front" }]);
    const t = G.entityTrackers(r, p).find((x) => x.id === "body:rentier:0");
    eq(t.progress.current, 1, "Vengeful Vampire tracker carries 1/2 generic damage dealt");
    eq(t.progress.max, 2, "Vengeful Vampire tracker carries its authored threshold");
    ok(/damage dealt/.test(t.label), "Vengeful Vampire tracker describes school-agnostic damage"); }

  { const { r, p, foe } = rig("fundjin", { foeHp: 1000 });
    p.meleeBonus = 2; p.rangedBonus = 5; p.pcharge = { 0: 59, 1: 0 };
    const h0 = foe.hp; G.tickTimers(r, p, 0);
    eq(h0 - foe.hp, 3, "God-Twins Fundjin clock is explicitly MELEE: base 1 + melee 2 to the lane");
    p.pcharge = { 0: 0, 1: 59 }; const h1 = foe.hp; G.tickTimers(r, p, 0);
    eq(h1 - foe.hp, 12, "God-Twins Raising-Profitsjin clock is explicitly RANGED: two × (base 1 + ranged 5)");
    p.pcharge = { 0: 18, 1: 42 };
    const ts = G.entityTrackers(r, p).filter((x) => x.id.startsWith("body:fundjin:"));
    eq(ts.length, 2, "God-Twins exposes both independent 6-second clocks");
    eq(ts[0].progress.current, 18, "God-Twins first clock keeps its independent live charge");
    eq(ts[1].progress.current, 42, "God-Twins second clock keeps its independent live charge"); }

  for (const [bodyKey, body] of Object.entries(BODIES)) {
    (body.passive ?? []).forEach((p, pi) => {
      const measurable = p.every || p.pairMR || ["spend", "hit", "play", "dealt", "dealtMelee", "dealtRanged", "gain", "spendOrHit"].some((k) => p[k] != null);
      if (!measurable) return;
      const c = { bodyKey, cdMul: 1, pcharge: {}, pspend: {}, pair: {} };
      ok(G.entityTrackers(null, c).some((x) => x.id === `body:${bodyKey}:${pi}`),
        `tracker coverage: measurable ${bodyKey} passive ${pi} has a descriptor`);
    });
  }
}

// ---- W2-A: PIERCING + MULTI-HIT MELEE (owner 2026-07-10) --------------------------------------
// A `{ do:"deal", …, pierce:true }` op must bypass EVERY defensive effect on the foe — the shield
// buffer, worn/stoneskin damage-reduction, ward, stance caps — and land full damage on HP. Triblade
// is NOT pierce: three DISCRETE deal ops, so a thorned foe reflects once PER hit (proving 3 hits, not one).
{
  const bareRoom = (foe) => ({ lanes: [[foe]], allies: [[]], laneCount: 1, caravan: { hp: 9, max: 9 }, players: new Map() });

  // (1) pierce vs a SHIELD — direct on the sink. Full damage straight to HP, shield UNTOUCHED.
  { const foe = G.spawnEnemy("rookie", []); foe.side = "foe"; foe.lane = 0; foe.hp = foe.maxHp = 20; foe.shield = 10;
    const r = bareRoom(foe);
    G.damageEnemy(r, 0, foe, 5, null, { pierce: true });
    ok(foe.hp === 15 && foe.shield === 10, "pierce skips the shield buffer — full 5 straight to HP, shield intact");
    ok((r.combatLog ?? []).some((line) => line.includes(" ⚔ pierces ")) &&
      !(r.combatLog ?? []).some((line) => line.includes("⚔pierces")),
    "hero→foe pierce combat log spaces the sword glyph from 'pierces'");
    G.damageEnemy(r, 0, foe, 5);                               // control: a NORMAL hit is eaten by the shield
    ok(foe.shield === 5 && foe.hp === 15, "…a NORMAL 5 (no pierce) is absorbed by the shield"); }

  // (2) pierce vs DAMAGE-REDUCTION (stoneskin −5): a normal 5 is fully soaked; pierce ignores it.
  { const foe = G.spawnEnemy("rookie", []); foe.side = "foe"; foe.lane = 0; foe.hp = foe.maxHp = 20;
    foe.buffs = [{ kind: "stoneskin", amount: 5 }];            // −5 to every incoming hit (effectiveDamageTo)
    const r = bareRoom(foe);
    G.damageEnemy(r, 0, foe, 5);
    ok(foe.hp === 20, "stoneskin −5 fully soaks a normal 5-damage hit");
    G.damageEnemy(r, 0, foe, 5, null, { pierce: true });
    ok(foe.hp === 15, "pierce ignores damage-reduction — the full 5 lands past stoneskin"); }

  // (3) the CARD wiring: Meteor Maul (deal 5, pierce) pierces a shielded foe through playCard → the deal op.
  { const { r, p, foe } = rig("rookie", { foeBody: "rookie", inv: ["oMeteorMaul"] }); foe.hp = foe.maxHp = 30; foe.shield = 10;
    fire(r, p, 0);
    ok(foe.hp === 25 && foe.shield === 10, "Meteor Maul (card) pierces the shield — 5 to HP, shield untouched"); }

  // (4) TRIBLADE = 3 DISCRETE 2-damage hits (NOT pierce). vs 2 shield + 1 thorns: the first hit
  //     empties the shield, then two hits land 4 total on HP; thorns reflects once PER hit.
  { const { r, p, foe } = rig("rookie", { foeBody: "rookie", inv: ["oTriblade"] });
    foe.hp = foe.maxHp = 20; foe.shield = 2; foe.thorns = 1; const php0 = p.hp;
    fire(r, p, 0);
    ok(foe.shield === 0 && foe.hp === 16, "Triblade's 3 discrete hits: shield eats the first 2, then 4 lands on HP");
    ok(p.hp === php0 - 3, "…and a thorned foe reflects once PER hit — 3 back, proving 3 separate hits");
    // control: Sword = one deal-2 → shield absorbs it, but thorns still reflects ONCE.
    const { r: r2, p: p2, foe: f2 } = rig("rookie", { foeBody: "rookie", inv: ["oSword"] });
    f2.hp = f2.maxHp = 20; f2.shield = 2; f2.thorns = 1; const php2 = p2.hp;
    fire(r2, p2, 0);
    ok(f2.shield === 0 && f2.hp === 20 && p2.hp === php2 - 1, "Sword's single 2-hit reflects only ONCE — the contrast proving Triblade's hits are discrete"); }

  // (5) classification / registration sanity.
  ok(["oButterflyKnife", "oMirrorMace", "oMeteorMaul", "oTriblade"].every((k) => G.cardKind(k) === "melee"), "all four W2-A cards classify MELEE");
  ok(["oButterflyKnife", "oMirrorMace", "oMeteorMaul"].every((k) => KIT[k].ops.every((o) => o.pierce === true)), "the three piercing cards carry pierce:true on their deal op");
  ok(KIT.oTriblade.ops.length === 3 && KIT.oTriblade.ops.every((o) => !o.pierce), "Triblade is three deal ops, NONE piercing");
  ok(["oButterflyKnife", "oMirrorMace", "oMeteorMaul", "oTriblade"].every((k) => G.PLAYER_POOL.includes(k)), "all four W2-A cards are registered in PLAYER_POOL");
}

// ---- BUTTERFLY KNIFE noReact (OWNER RULING 2026-07-11: "should not trigger any defensive actions
// either like fat cat or Minotaur") — its damage fires NO on-damaged/reactive hook on the victim:
// no on:"damaged" body passives, no hit-clock/accel ramps, no Atlas shrug, no Blood-To-Iron count,
// no thorns/mirror reflect. Symmetric for player- and foe-played copies. FLAG property name `noReact`.
{
  ok(KIT.oButterflyKnife.ops.every((o) => o.noReact === true), "Butterfly Knife carries noReact:true on its deal op (FLAG name)");
  // (a) player Butterfly vs a Fat Cat foe (rats every 3 damage TAKEN): three knife hits = 3 gross
  //     damage that would trip its clock — but the knife feeds NO reaction, so no rat.
  { const { r, p, foe } = rig("rookie", { foeBody: "frugal", inv: ["oButterflyKnife", "oHatchet"] });
    foe.hp = foe.maxHp = 50;
    fire(r, p, 0); fire(r, p, 0); fire(r, p, 0);
    eq(50 - foe.hp, 3, "Butterfly Knife lands its 1 (pierce) three times on the Fat Cat");
    ok(!r.lanes[0].some((e) => e.bodyKey === "rat"), "…but 3 knife-damage feeds NO hit clock — the Fat Cat does NOT rat");
    fire(r, p, 1);   // control: an ordinary 3-damage Hatchet DOES trip the every-3-taken clock
    ok(r.lanes[0].some((e) => e.bodyKey === "rat"), "…control: a plain Hatchet hit (3) still triggers the rat (noReact is the difference)"); }
  // (b) thorns + an armed mirror do NOT strike back at a Butterfly hit (reactions are defensive actions too).
  { const { r, p, foe } = rig("rookie", { inv: ["oButterflyKnife"], foeHp: 50 });
    foe.thorns = 2; foe.mirrorShield = 1; const php = p.hp;
    fire(r, p, 0);
    eq(p.hp, php, "a thorned + mirrored foe reflects NOTHING at a Butterfly hit");
    eq(foe.mirrorShield, 1, "…and its mirror charge is NOT consumed (the knife never 'hit' it reactively)");
    eq(foe.hp, 49, "…while the 1 damage itself still landed"); }
  // (c) FOE-side symmetry: a foe's Butterfly Knife on a Fat-Cat PLAYER (rats every 3 taken) — three
  //     casts land 3 gross damage that would trip the clock, but no rat and no Jesterplate moxie.
  { const { r, p } = rig("frugal", { pHp: 100 });
    p.moxieOnHitBuff = 1; p.moxie = 0;                     // Jesterplate's reactive refund, pre-armed
    const gf = G.spawnEnemy("rookie", ["oButterflyKnife"]); gf.lane = 0; r.lanes[0].push(gf); gf.moxie = 99;
    ok(G.foeCast(r, gf) && G.foeCast(r, gf) && G.foeCast(r, gf), "foe symmetry: a foe casts Butterfly Knife three times");
    eq(100 - p.hp, 3, "…each 1 pierces the hero (3 total)");
    ok(!(r.allies[0] ?? []).some((a) => a.bodyKey === "rat"), "…a Fat-Cat PLAYER does NOT rat off 3 knife-damage (hit clock suppressed, symmetric)");
    eq(p.moxie, 0, "…and Jesterplate's on-hit moxie does NOT fire (hit-trigger suppressed, symmetric)"); }
}

// ---- MOD-3: FOE-SIDE PIERCE (owner 2026-07-10) --------------------------------------------------
// W2-A wired pierce on hero→foe only; MOD-3 mirrors it on foe→player (damagePlayer's new pierce,
// threaded through the front-melee path foeHitLane) so a FOE casting a piercing card bypasses the
// target hero's shield AND damage-reduction. A foe's Meteor Maul (deal 5, pierce) lands the full 5 on HP.
{ const { r, p, foe } = rig("rookie", { foeBody: "rookie" });
  foe.side = "foe"; foe.lane = 0;
  foe.queue = G.mintCards(["oMeteorMaul"]); foe.moxie = 99;
  p.shield = 10; G.addBuff(p, "stoneskin", 5, 80);       // a shield AND stoneskin −5 — pierce IGNORES both
  const ph0 = p.hp;
  G.foeCast(r, foe);
  eq(p.hp, ph0 - 5, "foe Meteor Maul pierces: the full 5 lands on HP, past the shield AND stoneskin −5");
  eq(p.shield, 10, "…the hero's shield is UNTOUCHED (foe pierce skips the buffer, mirroring damageEnemy)");
  ok((r.combatLog ?? []).some((line) => line.includes(" ⚔ pierces ")) &&
    !(r.combatLog ?? []).some((line) => line.includes("⚔pierces")),
  "foe→hero pierce combat log spaces the sword glyph from 'pierces'");
  // control: a foe's NON-pierce Sword (deal 2) is fully soaked by the same stoneskin −5 — proves pierce is the cause
  const { r: r2, p: p2, foe: f2 } = rig("rookie", { foeBody: "rookie" });
  f2.side = "foe"; f2.lane = 0; f2.queue = G.mintCards(["oSword"]); f2.moxie = 99;
  p2.shield = 10; G.addBuff(p2, "stoneskin", 5, 80); const ph2 = p2.hp;
  G.foeCast(r2, f2);
  eq(p2.hp, ph2, "control: a foe's NON-pierce Sword is fully soaked by stoneskin −5 (isolates pierce as the bypass)"); }

// ---- MOD-4: FOE-SIDE PULL — Gravity Greatsword (owner 2026-07-10) -------------------------------
// W2-D's pullFront lived only in the hero switch; MOD-4 mirrors it in the foe branch so a foe's Gravity
// Greatsword drags a cross-lane hero into the foe's lane + front, THEN its melee deal 5 lands on it.
{ const { r, p, foe } = rig("rookie", { foeBody: "rookie" });
  r.laneCount = 2; r.lanes = [[foe], []]; r.allies = [[], []];
  foe.side = "foe"; foe.lane = 0;
  p.lane = 1; p.depth = 0; p.shield = 0;                 // the hero starts in a DIFFERENT (back) lane
  foe.queue = G.mintCards(["oGravitySword"]); foe.moxie = 99;
  const ph0 = p.hp;
  G.foeCast(r, foe);
  eq(p.lane, 0, "foe Gravity Greatsword PULLS the cross-lane hero into the foe's own lane");
  eq(p.hp, ph0 - 5, "…then its melee deal 5 lands on the pulled hero (now the foe's front)"); }

// ===========================================================================
// NO GLOBAL CARD COOLDOWN (owner 2026-07-15): affordability/hand/queue state are the only cast gates.
// Consecutive calls in the SAME server tick must work for heroes, foes, and summons.
// ===========================================================================
{
  const { r, p } = rig("rookie", { inv: ["oSharpEdges", "oSharpEdges"] });
  p.moxie = 99;
  ok(G.playCard(r, p, p.hand[0].id), "[NO_GCD] player's first play succeeds");
  ok(G.playCard(r, p, p.hand[0].id), "[NO_GCD] player can immediately play again in the same tick");
  ok(p.cardCd == null, "[NO_GCD] player carries no hidden cooldown state");
}
{
  const { r, foe } = rig("rookie");
  foe.queue = G.mintCards(["oSharpEdges", "oSharpEdges"]); foe.moxie = 99;
  ok(G.foeCast(r, foe), "[NO_GCD] foe's first cast succeeds");
  ok(G.foeCast(r, foe), "[NO_GCD] foe can immediately cast again in the same tick");
  ok(foe.cardCd == null, "[NO_GCD] foe carries no hidden cooldown state");
}
{
  const { r } = rig("rookie", { foeHp: 1000 });
  const rat = allyToken(r, "rat"); rat.moxie = 99;
  ok(G.foeCast(r, rat), "[NO_GCD] summon's first cast succeeds");
  ok(G.foeCast(r, rat), "[NO_GCD] summon can immediately cast again in the same tick");
  ok(rat.cardCd == null, "[NO_GCD] summon carries no hidden cooldown state");
}

// ═══ SCENARIO INJECTION (dev capture tool, 2026-07-11) — applyScenario builds a REAL room from a
// JSON spec (tools/scenario-shot.mjs drives it through the KM_SCENARIO=1 server gate). The engine
// contract under test: exact composition lands, the real tick loop runs on it, and any unknown
// content key fails LOUDLY without mutating the room. ═══
{
  const r = G.newRoom("SC");
  const p = G.addPlayer(r, "p1", "Hero");
  G.startDraft(r);                                     // the create path a live room takes
  p.runLevel = 4; p.levelAllocation = { hp: 1, melee: 0, ranged: 0, mastery: 0, specialty: 1 };
  G.applyScenario(r, { name: "t-basic", players: [{ body: "bloodfund", level: 4,
    levelAllocation: { hp: 1, melee: 1, ranged: 0, mastery: 0, specialty: 1 }, maxHp: 30, hp: 22, moxie: 7,
    deck: ["oSword", "oSword", "oFire", "oFire", "dShield", "dShield", "oSpear", "oSpear", "oDagger", "oDagger"],
    spares: ["oBlackHole", "oForce"],
    hand: ["oSword", "oFire", "dShield"], buffs: [{ kind: "haste", amount: 1, dur: 100 }],
    treasure: 5, unlocked: ["debtDragon"] }],
    foes: [{ body: "juggernaut", gear: ["oSword", "dShield"], level: 3,
      levelAllocation: { hp: 0, melee: 1, ranged: 1, mastery: 0, specialty: 0 }, dmgReduce: 2 },
      { body: "frugal", count: 2 }],
    summons: [{ side: "hero", body: "rat", count: 3 },
      { side: "hero", body: "hedgeKnight", position: "front", maxHp: 60 },
      { side: "hero", body: "totem", position: "back" }] });
  eq(r.phase, "playing", "[SCENARIO] boots into live combat");
  eq(r.scenario, "t-basic", "[SCENARIO] room carries the scenario tag");
  eq(G.snapshot(r).scenario, "t-basic", "[SCENARIO] …and the snapshot exposes it to the harness");
  const foes = r.lanes.flat();
  eq(foes.length, 3, "[SCENARIO] exact foe count (count expansion)");
  const jug = foes.find((f) => f.bodyKey === "juggernaut");
  ok(jug && jug.level === 3 && jug.dmgReduce === 2, "[SCENARIO] foe level + dmgReduce overrides land");
  eq(`${jug.levelAllocation.melee}:${jug.levelAllocation.ranged}`, "1:1",
    "[SCENARIO] exact foe allocation survives spawn instead of being randomized");
  eq(p.bodyKey, "bloodfund", "[SCENARIO] player wears the spec body");
  eq(G.allocationPoints(p.bodyKey, p.levelAllocation), 3,
    "[SCENARIO] exact player HP/melee/Specialty allocation survives the real room lifecycle");
  eq(p.meleeBonus, 1, "[SCENARIO] player melee rank is live after beginCombat");
  eq(`${p.hp}/${p.maxHp}`, "22/30", "[SCENARIO] player hp/maxHp overrides land");
  eq(p.moxie, 7, "[SCENARIO] player moxie override survives the combat-start reset");
  eq(p.hand.map((c) => c.key).join(","), "oSword,oFire,dShield", "[SCENARIO] exact opening hand, in order");
  ok(G.hasBuff(p, "haste"), "[SCENARIO] pre-applied player buff survives combat start");
  eq(p.treasure, 5, "[SCENARIO] banked ◈ lands");
  eq(p.backpack.length - p.deckList.length, 2, "[SCENARIO] spare backpack cards stay outside the exact combat deck");
  ok(r.unlockedBodies.has("debtDragon"), "[SCENARIO] unlocked-body grants land");
  ok(r.allies.flat().some((a) => a.ratStack && a.ratCount === 3), "[SCENARIO] pre-placed summons enter via the real summon verb (rat-merge)");
  const knight = r.allies.flat().find((a) => a.bodyKey === "hedgeKnight");
  const totem = r.allies.flat().find((a) => a.bodyKey === "totem");
  ok(knight.depth < p.depth && totem.depth > p.depth,
    "[SCENARIO] capture fixture can exercise real front and back summon depth around the hero");
  eq(`${knight.hp}/${knight.maxHp}`, "60/60",
    "[SCENARIO] capture fixture can keep a summon alive for a long graphical proof");
  ok(r.telemOff, "[SCENARIO] scenario rooms never pollute pick-rate telemetry");
  { jug.dmgReduce = 0; jug.shield = 0; // isolate the passive's melee rank after proving scenario overrides above
    const front = r.lanes[0][0], hp0 = front.hp;
    G.damagePlayer(r, p, 4); // friendly Totem softens this to the exact 3-point Minotaur threshold
    ok(hp0 - front.hp === 2 && p.shield === 0,
      `[SCENARIO] ranked Minotaur counter scales with melee without reactive shield (dmg ${hp0 - front.hp}, shield ${p.shield})`);
    const pm = G.combatMetricsSummary(r).players.find((x) => x.seat === p.id);
    ok(pm.shieldGranted === 0 && pm.levelAllocation.melee === 1 && pm.levelAllocation.specialty === 1,
      `[SCENARIO] telemetry proves the live allocation has no body-passive shield grant (${JSON.stringify({ shieldGranted: pm.shieldGranted, allocation: pm.levelAllocation })})`); }
  for (let t = 0; t < 20; t++) G.simulateTick(r);       // the REAL loop ticks the injected state
  eq(r.phase, "playing", "[SCENARIO] real ticks run on the injected room");
}
{
  const r = G.newRoom("SCB");
  for (let i = 0; i < 4; i++) G.addPlayer(r, `p${i + 1}`, `Hero ${i + 1}`);
  G.startDraft(r);
  G.applyScenario(r, { name: "four-player-lich", boss: "litigationLich", floor: 1,
    players: Array.from({ length: 4 }, (_, i) => ({ body: ["rookie", "cleric", "frugal", "juggernaut"][i] })) });
  ok(G.currentNode(r)?.type === "boss" && r.phase === "playing",
    "[SCENARIO] a boss spec enters a real boss node and starts real combat");
  ok(r.boss?.bodyKey === "litigationLich"
      && r.boss.maxHp === Math.round(G.bodyMaxHp(G.BODIES.litigationLich) * 4),
    "[SCENARIO] four-player Lich keeps the original full party-scaled main-body HP path");
  ok(r.boss.castBars.length === 1 && r.boss.castBars[0].playerScale === 4,
    "[SCENARIO] real four-player boss opens one action captured at four-player scale");
}
{
  const r = G.newRoom("SCH");
  G.addPlayer(r, "p1", "Hero");
  G.startDraft(r);
  G.applyScenario(r, { name: "hydra-head-stacks", boss: "hydra", floor: 3,
    players: [{ body: "bloodfund" }],
    summons: [
      { side: "foe", body: "hydraHead", count: 3, lane: 0 },
      { side: "foe", body: "hydraHead", count: 2, lane: 1 },
      { side: "foe", body: "hydraHead", count: 1, lane: 2 },
      { side: "foe", body: "hydraHead", count: 2, lane: 3 },
    ] });
  const stacks = r.lanes.map((lane) => lane.filter((foe) => foe.bodyKey === "hydraHead"));
  ok(r.laneCount === 4 && stacks.every((lane) => lane.length === 1),
    "[SCENARIO] Hydra visual fixtures exercise one real head stack in each of four lanes");
  eq(stacks.map(([stack]) => stack.ratCount).join(","), "3,2,1,2",
    "[SCENARIO] authored head counts survive as the live HP-backed lane pools");
}
{ // unknown content keys fail LOUDLY — validation precedes every mutation
  const r = G.newRoom("SC2"); G.addPlayer(r, "p1", "Hero"); G.startDraft(r);
  const rejects = (spec) => { try { G.applyScenario(r, spec); return ""; } catch (e) { return String(e.message ?? e); } };
  ok(/unknown foe body/.test(rejects({ foes: [{ body: "notABody" }] })), "[SCENARIO] unknown foe body rejected");
  ok(/unknown card/.test(rejects({ foes: [{ body: "frugal", gear: ["notACard"] }] })), "[SCENARIO] unknown gear card rejected");
  ok(/unknown buff kind/.test(rejects({ foes: [{ body: "frugal", buffs: [{ kind: "notABuff" }] }] })), "[SCENARIO] unknown buff kind rejected");
  ok(/unknown card/.test(rejects({ players: [{ deck: ["oSword", "bogus"] }], foes: [{ body: "frugal" }] })), "[SCENARIO] unknown deck card rejected");
  ok(/at least one foe/.test(rejects({ foes: [] })), "[SCENARIO] an empty roster is rejected");
  ok(/exceeds its deck copies/.test(rejects({ players: [{ deck: ["oSword", "oFire"], hand: ["oSword", "oSword"] }], foes: [{ body: "frugal" }] })), "[SCENARIO] hand beyond deck copies rejected");
  ok(/summon position/.test(rejects({ foes: [{ body: "frugal" }], summons: [{ side: "hero", body: "rat", position: "beside" }] })),
    "[SCENARIO] ambiguous summon positions are rejected");
  ok(/levelAllocation/.test(rejects({ players: [{ body: "bloodfund", level: 2,
      levelAllocation: { hp: 0, melee: 0, ranged: 0, mastery: 1, specialty: 0 } }], foes: [{ body: "frugal" }] })),
    "[SCENARIO] unaffordable player passive allocation is rejected");
  ok(/exact budget/.test(rejects({ foes: [{ body: "bloodfund", level: 3,
      levelAllocation: { hp: 1, melee: 0, ranged: 0, mastery: 0, specialty: 0 } }] })),
    "[SCENARIO] under-spent foe allocations are rejected instead of randomized");
  ok(/level-exempt/.test(rejects({ foes: [{ body: "frostOrb", level: 3,
      levelAllocation: { hp: 2, melee: 0, ranged: 0, mastery: 0, specialty: 0 } }] })),
    "[SCENARIO] summon/boss allocations are rejected instead of silently discarded");
  eq(r.phase, "draft", "[SCENARIO] every rejected spec left the room untouched (still drafting)");
  eq(r.scenario ?? null, null, "[SCENARIO] …and untagged");
}

// ============================================================================
// CARD READABILITY — first-glance scale treatment + compound number summary (owner 2026-07-14).
// Every collectible card must carry a valid MELEE/RANGED/BOTH/UTILITY scale and a numeric summary that
// AGREES with its ops (never a hand-maintained second table). Live numbers stay truthful under bonuses.
// ============================================================================
{
  const KINDS = ["melee", "ranged", "both", "none"];
  const caster = (c = {}) => ({ counters: 0, meleeBonus: 0, rangedBonus: 0, shield: 0, ...c });
  // 1) EXHAUSTIVE — every PLAYER_POOL card: valid scale, string summary, and scale is a PURE function of
  //    the engine's own classification (opsBothKinds/triggerKind), so the badge can never disagree with
  //    the bonus/trigger/pricing truth. Pure self/ally utility is NEVER falsely tagged melee/ranged.
  for (const k of G.PLAYER_POOL) {
    const sc = G.cardScale(k);
    ok(KINDS.includes(sc), `[READ] ${k} scale ∈ {melee,ranged,both,none} (got ${sc})`);
    ok(typeof G.cardSummaryLabel(k) === "string", `[READ] ${k} summary is a string`);
    const want = G.opsBothKinds(G.KIT[k].ops) ? "both" : G.triggerKind(k);
    eq(sc, want, `[READ] ${k} scale == opsBothKinds?both:triggerKind (single source)`);
    if (!G.opsBothKinds(G.KIT[k].ops) && G.triggerKind(k) === "none")
      eq(sc, "none", `[READ] ${k} typeless utility carries no melee/ranged badge`);
  }
  // 2) OUTCOMES agree with ops, and a ZERO-BONUS caster's LIVE summary equals the BASE summary (nothing
  //    invented above base; no phantom boost). This is the descriptor-agrees-with-ops contract.
  for (const k of G.PLAYER_POOL) {
    const ops = G.KIT[k].ops ?? [];
    const opHas = (pred, list = ops) => list.some((o) => pred(o) || (o.do === "timer" && opHas(pred, o.ops ?? [])));
    for (const p of G.cardOutcomes(k)) {
      if (p.effect === "deal") ok(opHas((o) => o.do === "deal" || o.do === "schoolStrike" || o.do === "tornado"), `[READ] ${k} deal part maps to a damage op`);
      if (p.effect === "shield") ok(opHas((o) => o.do === "shield" || o.do === "shieldAlly" || o.do === "tempShield"), `[READ] ${k} shield part maps to a shield op`);
      if (p.effect === "heal") ok(opHas((o) => o.do === "healSelf" || o.do === "healAlly"), `[READ] ${k} heal part maps to a heal op`);
      if (p.effect === "summon") ok(opHas((o) => o.do === "summon" || o.do === "summonPick" || o.do === "animateWeapons"), `[READ] ${k} summon part maps to a summon op`);
    }
    const live0 = G.cardLiveSummary(k, caster(), 0);
    eq(live0.label, G.cardSummaryLabel(k), `[READ] ${k} live@0-bonus == base summary`);
    ok(live0.boosted === false, `[READ] ${k} not boosted at zero bonus`);
  }
  // 3) FOCUSED CONTRACTS ------------------------------------------------------
  // Heart Guard — the compound case: shield 2 + heal 2, typeless. The old cardDealInfo stopped at the shield.
  eq(G.cardScale("dHeartGuard"), "none", "[READ] Heart Guard is typeless utility (no false badge)");
  eq(G.cardSummaryLabel("dHeartGuard"), "🛡2  ❤2", "[READ] Heart Guard summary shows BOTH outcomes 🛡2 ❤2");
  { const o = G.cardOutcomes("dHeartGuard"); eq(o.length, 2, "[READ] Heart Guard has two outcome parts");
    eq(o[0].effect, "shield", "[READ] Heart Guard part0 shield"); eq(o[1].effect, "heal", "[READ] Heart Guard part1 heal"); }
  // Aimed-melee weapons — aimed (ranged reticle) but MELEE-scaled: badge MELEE, live rises with MELEE only.
  for (const k of ["oBow", "oJavelin", "oRepeatXbow"]) {
    eq(G.cardScale(k), "melee", `[READ] ${k} is aimed but MELEE-scaled`);
    ok(G.isRanged(k), `[READ] ${k} is still reticle-aimed (ranged flag true)`);
    ok(G.cardLiveSummary(k, caster({ meleeBonus: 2 }), 0).boosted, `[READ] ${k} live rises with the MELEE bonus`);
    ok(!G.cardLiveSummary(k, caster({ rangedBonus: 2 }), 0).boosted, `[READ] ${k} live ignores the ranged bonus`);
  }
  // Ordinary melee / ordinary ranged.
  eq(G.cardScale("oSword"), "melee", "[READ] Sword melee"); eq(G.cardSummaryLabel("oSword"), "2🗡", "[READ] Sword 2🗡");
  eq(G.cardLiveSummary("oSword", caster({ meleeBonus: 2 }), 0).label, "4🗡", "[READ] Sword → 4🗡 at melee+2");
  eq(G.cardScale("oFire"), "ranged", "[READ] Fire ranged"); eq(G.cardSummaryLabel("oFire"), "6🎯", "[READ] Fire 6🎯");
  eq(G.cardLiveSummary("oFire", caster({ rangedBonus: 3 }), 0).label, "9🎯", "[READ] Fire → 9🎯 at ranged+3");
  ok(!G.cardLiveSummary("oFire", caster({ meleeBonus: 3 }), 0).boosted, "[READ] Fire ignores the melee bonus");
  // Both-kind (Moonlight / Rainblow) — folds BOTH bonuses.
  eq(G.cardScale("oMoonGreat"), "both", "[READ] Moonlight scales BOTH");
  eq(G.cardScale("oRainblow"), "both", "[READ] Rainblow scales BOTH");
  eq(G.cardLiveSummary("oMoonGreat", caster({ meleeBonus: 2, rangedBonus: 3 }), 0).label, "10🗡🎯", "[READ] Moonlight folds both (5+2+3=10)");
  // Ranged Force — the one ranged-scaling shield.
  eq(G.cardScale("oForce"), "ranged", "[READ] Force is the ranged-scaling shield");
  eq(G.cardSummaryLabel("oForce"), "🛡6", "[READ] Force base 🛡6");
  eq(G.cardLiveSummary("oForce", caster({ rangedBonus: 3 }), 0).label, "🛡9", "[READ] Force shield scales ranged → 🛡9");
  // Multi-hit — one part, count 4, per-hit scales.
  { const o = G.cardOutcomes("oOmnislash"); eq(o.length, 1, "[READ] Omnislash collapses to one multi-hit part"); eq(o[0].count, 4, "[READ] Omnislash count 4"); }
  eq(G.cardSummaryLabel("oOmnislash"), "2🗡×4", "[READ] Omnislash 2🗡×4");
  eq(G.cardLiveSummary("oOmnislash", caster({ meleeBonus: 2 }), 0).label, "4🗡×4", "[READ] Omnislash per-hit rises with melee → 4🗡×4");
  // Typeless utility with no numeric outcome.
  eq(G.cardScale("oHaste"), "none", "[READ] Haste typeless"); eq(G.cardSummaryLabel("oHaste"), "", "[READ] Haste has no numeric summary");
  // Mallet — ofDealt shield mirrors the boosted deal; Pile On has been removed.
  eq(G.cardSummaryLabel("oMallet"), "4🗡  🛡4", "[READ] Mallet base 4🗡 🛡4");
  eq(G.cardLiveSummary("oMallet", caster({ meleeBonus: 2 }), 0).label, "6🗡  🛡6", "[READ] Mallet shield mirrors the boosted deal (6🗡 🛡6)");
  ok(!G.KIT.oPileOn && !G.PLAYER_POOL.includes("oPileOn"), "[READ] Pile On is removed from content and offers");
  // Wording pass — 4 consistency edits agree with mechanics (owner 2026-07-14).
  ok(/Gain a 1-point shield/.test(G.KIT.dShieldBash.text), "[READ] Shield Bash wording matches sibling shield grammar");
  ok(/Gain a 6-point shield plus your ranged bonus/.test(G.KIT.oForce.text), "[READ] Force wording matches sibling shield grammar");
  ok(/This fight, every 6 seconds/.test(G.KIT.oBerserker.text), "[READ] Berserker cadence comma matches twins");
  ok(!/every 6 seconds, and take 1 damage every 6 seconds/.test(G.KIT.oDemonForm.text), "[READ] Demon Form states its cadence once");
}

console.log(fail ? `\n❌ FAILURES — ${pass} passed, ${fail} failed.` : `\n✅ ALL PASS — ${pass} passed, 0 failed.`);
if (fail) process.exit(1);
