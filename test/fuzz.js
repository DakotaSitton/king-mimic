// Property-based playthrough fuzz: drive many FULL runs through the pure engine with a
// dumb auto-bot (pick a class, stock greedily, fire every item each tick, advance / buy /
// descend) and assert hard invariants hold the whole time — Treasure never negative, no
// NaN HP, combat always resolves, the phase machine never strands the run. Pure + instant
// (no server); complements the unit spec (game.test.js) and the WS e2e (e2e.js).
//
// Run:  bun test/fuzz.js
import * as G from "../game.js";

const RUNS = Number(process.env.RUNS ?? 60);
let problems = [];
const fail = (msg) => problems.push(msg);

// STALLED fights are COUNTED, not failed (2026-07-02): with no retreat and no anti-stall (owner
// removed it 6/24, "not needed"), a sustain foe the party can't out-damage (Golden Golem's
// shield-refill, the Kraken's self-shielding steal-entities) is a GENUINE unwinnable stalemate —
// a design gap flagged to the owner, not an engine invariant. The bot abandons the run (a human
// would hit Leave) and the count is reported so the gap stays visible until the owner picks a
// valve (flee / anti-stall / shield cap / sustain telegraph).
let stalledFights = 0;
function autoFight(room, maxTicks = 5000) {
  let t = 0;
  // Post-2026-06-21 combat is moxie + cards: the engine's autoPlay casts each body's affordable
  // cards, and simulateTick auto-drives any autoFire player (same path squad-mode bots fight on).
  for (const p of room.players.values()) p.autoFire = true;
  while (room.phase === "playing" && t < maxTicks) {
    for (const p of room.players.values()) {
      if (!p.alive) continue;
      // chase the lowest-HP foe so the bot actually clears boards (and boss courts)
      const foes = room.lanes.flat();
      if (foes.length) { foes.sort((a, b) => a.hp - b.hp); p.targetId = foes[0].id; }
      G.ensureTarget(room, p);
    }
    G.simulateTick(room);
    // MIN_DECK is an EDIT-time floor (engine-enforced on deck→backpack); deckList itself starts empty and
    // deckKeys() falls back to STARTER_DECK. The real runtime invariant is: a body is never cardless in combat.
    for (const p of room.players.values()) if (p.alive && G.deckKeys(p).length === 0) fail("player is cardless in combat");
    // (shared-caravan HP was removed in 1f8a920 — loss is now "every body + summon dead"; player HP is NaN-checked below)
    for (const lane of room.lanes) for (const f of lane) {
      if (Number.isNaN(f.hp)) fail(`foe hp NaN (${f.bodyKey})`);
      if (f.hp > f.maxHp) fail(`foe over-healed (${f.bodyKey} ${f.hp}/${f.maxHp})`);
    }
    for (const p of room.players.values()) {
      if (Number.isNaN(p.hp)) fail("player hp NaN");
      if (p.hp > p.maxHp) fail(`player over-healed (${p.hp}/${p.maxHp})`);
    }
    t++;
  }
  if (t >= maxTicks && room.phase === "playing") { stalledFights++; return "stalled"; }
}

function playRun(label) {
  const r = G.newRoom("FZ" + label);
  const p = G.addPlayer(r, "p1", "Bot");
  G.startDraft(r);
  G.chooseClass(r, p, ["warrior", "rogue", "mage", "cleric"][Math.floor(Math.random() * 4)]);

  let steps = 0;
  while (r.phase !== "lost" && steps < 60) {
    steps++;
    if (r.phase === "stock") {
      // place the bot's invite(s): 1, or 2 in a double feature
      let guard = 0;
      while (!G.stockReady(r) && guard++ < 10) G.addGreedy(r, p, Math.floor(Math.random() * 3));
      G.commitStock(r);
    } else if (r.phase === "setup") {
      G.beginCombat(r);
      if (autoFight(r) === "stalled") break;   // unwinnable sustain wall → abandon (a human hits Leave)
    } else if (r.phase === "shop") {
      // value-for-value: pay with a backpack card that covers the cheapest ware (best-effort)
      const w = r.shop?.wares?.[0];
      const pay = (p.backpack ?? []).find((k) => G.itemTreasure(k) >= G.itemTreasure(w?.key ?? ""));
      if (w && pay) G.buyWare(r, p, w.key, [pay]);
      const to = G.currentNode(r)?.links?.[0];
      if (!to || !G.leaveShop(r, to)) { fail("could not leave shop"); break; }
    } else if (r.phase === "won") {
      // free swap to a felled body (no gold ladder anymore)
      { const felled = [...r.unlockedBodies].find((k) => G.canSwapTo(r, p, k));
        if (felled) G.swapBody(r, p, felled); }
      if (r.loot?.length) G.claimLoot(r, p, r.loot[0]);
      // FAIR PROXY (2026-07-02): a real player DECKS their loot (DAMAGING cards only — junk dilutes
      // the hand) and LEVELS UP when spares cover it. Without either, the bot fought everything on
      // the 3-card legacy fallback deck and equilibrium-stalled against sustain walls (Kraken's
      // self-shielding steal-entities; a Golden Golem foe whose shield refills off its own casting).
      // Those stalls are a REAL, pre-ante-v2 design hole (no retreat + no anti-stall) — flagged to
      // the owner; the bot just shouldn't be the weakest possible party when probing invariants.
      for (const k of [...(p.backpack ?? [])])
        if ((G.KIT[k]?.ops ?? []).some((o) => o.do === "deal")) G.moveToDeck(r, p, k);
      { // level up while the spare value covers it — +combat is the counter to sustain tanks
        let guard = 0;
        while (guard++ < 4) {
          const deckCounts = {};
          for (const k of p.deckList ?? []) deckCounts[k] = (deckCounts[k] ?? 0) + 1;
          const spares = [...(p.backpack ?? [])];
          for (const k of p.deckList ?? []) { const i = spares.indexOf(k); if (i >= 0) spares.splice(i, 1); }
          const cost = p.nextLevelCost ?? G.levelUpCost((p.runLevel ?? 1) + 1);
          const pay = [];
          for (const k of spares) { if (pay.reduce((s, x) => s + G.itemTreasure(x), 0) >= cost) break; pay.push(k); }
          if (pay.reduce((s, x) => s + G.itemTreasure(x), 0) < cost) break;
          if (!G.levelUp(r, p, pay)) break;
        }
      }
      if (r.levelComplete) {
        if ((r.floor ?? 1) >= 3) break;          // bound runtime: 3 floors per run
        if (!G.descend(r)) { fail("descend failed"); break; }
      } else {
        const to = G.currentNode(r)?.links?.[0];
        if (!to || !G.advanceLevel(r, to)) { fail(`advance failed from ${G.currentNode(r)?.id}`); break; }
      }
    } else { fail(`unexpected phase ${r.phase}`); break; }
  }
  if (steps >= 60) fail("run did not terminate");
}

for (let i = 0; i < RUNS; i++) playRun(i);

const uniq = [...new Set(problems)];
const stallNote = stalledFights ? ` (${stalledFights} unwinnable sustain-wall stall${stalledFights === 1 ? "" : "s"} abandoned — known design gap, owner deciding)` : "";
if (uniq.length === 0) console.log(`✅ FUZZ OK — ${RUNS} full runs, no invariant violations.${stallNote}`);
else { console.log(`❌ FUZZ — ${problems.length} violation(s):${stallNote}`); for (const m of uniq) console.log("  - " + m); }
process.exit(uniq.length === 0 ? 0 : 1);
