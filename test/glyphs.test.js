// Card glyph derivation tests (2026-08-04): every castable card must yield a compact, truthful,
// machine-derived shorthand (`cardGlyphs`, engine/cards.js — derived from KIT ops, never prose),
// and the combat snapshot must ship it as `glyphs` on the compact surfaces where a card name
// already shows: the foe cast-queue entries, the summon strip, the hero/companion intent badge,
// and the queued-card projections. Run: bun run test/glyphs.test.js
import * as G from "../game.js";

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log("❌ " + label); } };
const eq = (a, b, label) => ok(a === b, `${label} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

// ── 1) COVERAGE: every castable KIT key derives a non-empty glyph string, ≤6 tokens, and never
//       the loud unknown-op "?" marker (which means an op gained no vocabulary and no override).
{
  const castable = Object.keys(G.KIT).filter((k) => G.isCard(k));
  ok(castable.length > 100, `castable card universe is sane (${castable.length} keys)`);
  for (const k of castable) {
    const g = G.cardGlyphs(k);
    ok(typeof g === "string" && g.length > 0, `${k} yields a non-empty glyph string`);
    ok(!g.includes("?"), `${k} has no unknown-op "?" marker (got "${g}")`);
    ok(g.split(" ").length <= 6, `${k} stays ≤6 tokens (got "${g}")`);
  }
}

// ── 2) OVERRIDES: every hand-authored override names a real, castable KIT card (the table
//       doubles as the owner's "too complex to shorthand" audit list — keys must never rot).
{
  for (const k of Object.keys(G.GLYPH_OVERRIDES)) {
    ok(!!G.KIT[k], `override ${k} exists in KIT`);
    ok(G.isCard(k), `override ${k} is castable`);
    ok(G.cardGlyphs(k) === G.GLYPH_OVERRIDES[k], `override ${k} wins over derivation`);
  }
}

// ── 3) EXACT BASE STRINGS for representative cards, pinned against their CURRENT live ops.
//       (If an owner op edit changes one of these, the pin is doing its job — re-derive by hand.)
{
  const want = {
    oIce: "🎯3 ↓3",                 // aimed 3, then sap the dealt amount for 6s (the spec example)
    oSpear: "▮▮2",                  // front-2 melee
    oLightning: "≡3",               // aimed foe's whole lane
    oMeteors: "≡6",
    oHoly: "♥4",                    // heal 4 (owner 2026-08-06: 5→4; ranged bonus folds in live)
    oPetRats: "＋Rat×2",             // summon card
    oPetLeech: "🎯1 ♥=dmg ⟲6s",     // recurring drain attached to the aimed foe
    oAnimatedBlade: "▮2 ⟲6s",       // recurring front strike
    oDark: "🎯5 ♥=dmg",             // lifesteal (owner 2026-08-06: deal 4→5)
    dShield: "🛡3",                 // shield
    oWind: "🎯4 ↩",                 // push (owner 2026-08-06: deal 2→4)
    dTaunt: "↪",                    // pull
    oGravitySword: "↪ ▮5",          // pull then strike
    oBlackHole: "≡4 ≡↓4 ⟲6s",       // owner 2026-08-06: deal 4 lane + sap 4, now + every 6s collapses to one marker
    oGlacius: "▮15 ⏳6s",            // pure delayed strike
    oOmnislash: "▮2×4",             // multi-hit run collapses
    oFlameOrbs: "✦3×3",             // random-target multi-hit
    oEarth: "🎯3 🛡3⏳",             // temporary shield mirrors the dealt amount
    oMallet: "▮4 🛡4",              // ofDealt shield mirrors the dealt amount
    oJaw: "▮6 ♥=dmg 🛡=dmg",        // heal AND shield = damage dealt (owner 2026-08-06: deal 3→6)
    oWhip: "≡2 ▮+1",                // lane hit with the front-foe rider
    oEarthquake: "≡2 ⟲6s+1",        // ramping recurring lane hit (owner 2026-08-06: base 1→2)
    oLifedrain: "🎯4 ♥=dmg ⟲6s",    // drain now and every 6s merges into one group
    oWarsEternity: "▮3 🛡3 ⟲6s",    // now-and-every-6s pair collapses to one marker
    oStarblade: "▮2 ⚡+6 ⏳10s",      // owner 2026-08-06: delayed moxie 10→6; 10-tick-period timer prints 10s
    oTranscend: "♥full ↑HP÷5",      // base form of the max-HP-scaled modal buff
    oMastersArm: "▮6 ↓6",           // weaponChoice falls back to Rapier (matches foeOpsDmg)
    tKrakenTentacle1: "▮=HP",       // ofHp base form
  };
  for (const [k, w] of Object.entries(want)) eq(G.cardGlyphs(k), w, `${k} base glyphs`);
}

// ── 4) LIVE TRUTH: numbers fold the caster's real bonuses with the same math as every other
//       preview (liveDealBonus — shared with cardLiveDmg/cardLiveSummary), and the foe-queue
//       resolver override (opts.dealNow) wins with its mirrored riders following it.
{
  const caster = { bodyKey: "rat", hp: 10, maxHp: 10, shield: 0, counters: 2 };   // +2 melee AND ranged
  eq(G.cardGlyphs("oSword", caster), "▮4", "melee bonus lifts a front strike (2+2)");
  eq(G.cardGlyphs("oIce", caster), "🎯5 ↓5", "ranged bonus lifts the hit AND the mirrored sap");
  eq(G.cardGlyphs("oHoly", { bodyKey: "rat", hp: 10, maxHp: 10, rangedBonus: 3 }), "♥7",
    "plusRangedBonus heals fold the live ranged bonus (owner 2026-08-06: base 4 + ranged 3)");
  eq(G.cardGlyphs("oBile", { bodyKey: "rat", hp: 10, maxHp: 10, rangedBonus: 2 }), "☠3",
    "plusRangedBonus poison folds the live ranged bonus");
  eq(G.cardGlyphs("oSword", caster, 0, { dealNow: 7 }), "▮7",
    "a resolver-supplied per-hit override wins (foe-queue parity)");
  eq(G.cardGlyphs("oIce", caster, 0, { dealNow: 2 }), "🎯2 ↓2",
    "…and the mirrored ofDealt rider follows the override");
  eq(G.cardGlyphs("dShieldBash", { bodyKey: "rat", hp: 10, maxHp: 10, shield: 6 }), "🛡1 ▮6",
    "ofShield reads the caster's current shield");
  eq(G.cardGlyphs("tKrakenTentacle1", { bodyKey: "rat", hp: 7, maxHp: 10 }), "▮7",
    "ofHp reads the caster's current HP");
  eq(G.cardGlyphs("dBloodIron", { bodyKey: "rat", hp: 4, maxHp: 20 }), "🛡16 ⟲6s",
    "shieldMissing reads the caster's live missing HP");
  eq(G.cardGlyphs("oMoonGreat", { bodyKey: "rat", hp: 10, maxHp: 10, meleeBonus: 3, rangedBonus: 3 }), "▮17 ≡17",
    "Moonlight's conditional lane beam appears exactly when both live bonuses clear the bar (owner 2026-08-06 HEAVY: 5 + (3+3)×2 = 17)");
  eq(G.cardGlyphs("oMoonGreat", { bodyKey: "rat", hp: 10, maxHp: 10, meleeBonus: 3, rangedBonus: 2 }), "▮15",
    "…and stays hidden when they don't (HEAVY: 5 + (3+2)×2 = 15)");
  eq(G.cardGlyphs("oMastersArm", null, 0, { pick: "spear" }), "▮▮6",
    "a known weaponChoice pick reroutes the derived branch");
  eq(G.cardGlyphs("oMastersArm", null, 0, { pick: "staff" }), "▮6 ⏩",
    "…including the staff's haste rider");
}

// ── 5) SNAPSHOT PLUMBING: the real projection ships `glyphs` on the foe cast queue, the summon
//       strip, the intent badge, and both queued-card projections — always the LIVE caster string.
{
  const r = G.newRoom("GLY");
  const p = G.addPlayer(r, "p", "P");
  G.wearBody(p, "rookie"); p.lane = 0; p.depth = 0; p.maxHp = p.hp = 30;
  p.autoFire = false;
  p.cards = G.mintCards(["oSword", "oIce", "oPetRats"]);
  p.hand = [...p.cards]; p.deck = []; p.moxie = 99; p.moxieClock = 0;
  r.phase = "playing"; r.laneCount = 1; r.allies = [[]]; r.caravan = { hp: 1e9, max: 1e9 };
  const foe = G.spawnEnemy("cleric", []); foe.hp = foe.maxHp = 50; foe.lane = 0;
  foe.queue = G.mintCards(["oIce"]); foe.counters = 2; r.lanes = [[foe]];
  // summon a real rat through the live card path so the ally strip has a queue
  const rats = p.hand.find((c) => c.key === "oPetRats");
  G.playCard(r, p, rats.id);
  // queue a card so the intent/queued projections light up
  const sword = p.hand.find((c) => c.key === "oSword");
  p.cardQueue = [{ id: sword.id }]; p.moxie = 0;
  const snap = G.snapshot(r);
  const fq = snap.lanes[0].enemies[0].queue[0];
  ok((fq.glyphs ?? "").length > 0, "foe cast-queue entries carry a non-empty glyphs string");
  eq(fq.glyphs, G.cardGlyphs("oIce", foe, 0), "…the live foe-caster derivation (ramped foe folds its +2)");
  eq(fq.glyphs, "🎯5 ↓5", "…with the foe's live bonus actually folded in");
  const strip = snap.lanes[0].allies[0]?.queue?.[0];
  ok(!!strip, "the summon strip projects the token's front card");
  eq(strip.glyphs, G.cardGlyphs(strip ? r.allies[0][0].queue[0].key : "", r.allies[0][0], 0),
    "summon-strip entries carry the token's live glyphs");
  const sp = snap.players.find((x) => x.id === p.id);
  eq(sp.queuedCards[0]?.glyphs, G.cardGlyphs("oSword", p, 0), "queued cards carry glyphs");
  eq(sp.queuedCard?.glyphs, G.cardGlyphs("oSword", p, 0), "the legacy queuedCard projection carries glyphs");
  eq(sp.intentCard?.glyphs, G.cardGlyphs("oSword", p, 0), "the intent badge carries glyphs");
  eq(sp.intentCard?.mode, "queued", "…for the queued card itself");
}

console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
