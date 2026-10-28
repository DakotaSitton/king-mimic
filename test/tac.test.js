// Hex tactics sim suite: bun run test/tac.test.js
// Drives the PURE turn-based sim (engine/tac/sim.js) through full floor runs with a simple bot, plus
// focused checks for the owner's rules: 5 moxie a turn (carry to 10), movement bought with moxie by
// Speed, card ranges/radii, players first then foes, foes hit the easiest target, every foe shows
// its next card; mystery-dungeon floors with fog, pillars (line of sight), hazards, stairs, gear;
// full deck each floor, limited uses (melee 3 / ranged 2 / spell 1), reshuffle for half your moxie.
import {
  createWorld, addPlayer, snapshot, flushFx, playCard, draftPick, restartRun, moveHero, moveOptions,
  endTurn, foeStep, runFoeTurn, planFoe, canPlay, startFloor, catalog, mulberry32, geometryOf, speedOf,
  occupant, setConnected, removePlayer, reshuffle, reshuffleCost, struggle, descend, wear, cardClass,
  usesOf, turnsText, LEVEL0_CARDS, TURN_MOXIE, MOXIE_CAP, HAZARD_DAMAGE,
} from "../engine/tac/sim.js";
import { distance, neighbors, key as hk, createBoard, fromOffset } from "../engine/tac/hex.js";
import { HAND_SIZE } from "../game.js";

Math.random = mulberry32(20261028);
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("  ✗ " + msg); } };
const hx = (c) => ({ q: c.q, r: c.r });

// A hand-built open map (everything walkable) with optional pillars / hazards, same interface as floor.js.
function openMap(cols = 11, rows = 7, { pillars = [], hazards = [], start = fromOffset(0, 3), stairs = fromOffset(cols - 1, 0) } = {}) {
  const board = createBoard(cols, rows);
  const pil = new Set(pillars.map(hk));
  const floor = new Set(board.cells.map(hk).filter((k) => !pil.has(k)));
  return {
    cols, rows, floor, pillars: pil, hazards: new Map(hazards.map((h) => [hk(h), { kind: "spikes" }])), rooms: [],
    start, stairs, foeSpawns: [], itemSpawns: [],
    has: (h) => board.has(h), walkable: (h) => floor.has(hk(h)), blocksSight: (h) => !board.has(h) || pil.has(hk(h)),
  };
}
// A controlled floor: heroes drafted, chosen foes (awake unless said otherwise), chosen items.
function floor({ heroes = 1, foes = [{ bodyKey: "fatCat", kit: ["oSword"], ...fromOffset(8, 3) }], items = [], map = openMap(), seed = 11, awake = true } = {}) {
  const w = createWorld({ rng: mulberry32(seed) });
  const ps = [];
  for (let i = 0; i < heroes; i++) ps.push(addPlayer(w, "h" + i, "H" + i));
  w.phase = "setup";   // keep the draft from auto-starting a generated floor
  for (const p of ps) draftPick(w, p.id, 0);
  startFloor(w, { map, foes: foes.map((f) => ({ awake, ...f })), items });
  return { w, ps, p: ps[0] };
}
const setHand = (p, keys) => { p.hand = keys.map((key, i) => (key ? { id: "x" + i, key, uses: usesOf(key) } : null)); };
const place = (c, q, r) => { c.q = q; c.r = r; };
const at = (col, row) => fromOffset(col, row);

// --- bot: explore toward the stairs; in a fight play anything legal, else walk at the nearest foe ----
function botTryPlay(w, p) {
  for (let s = 0; s < HAND_SIZE; s++) {
    if (!p.hand[s]) continue;
    const targets = [hx(p), ...w.foes.filter((f) => !f.dead && w.visible.has(hk(f))).sort((a, b) => a.hp - b.hp).map(hx)];
    for (const t of targets) if (canPlay(w, p, s, t).ok) { playCard(w, p.id, s, t); return true; }
  }
  return false;
}
function botFight(w, p) {
  for (let guard = 0; guard < 12 && w.turn === "hero" && !p.dead && !p.ended; guard++) {
    if (botTryPlay(w, p)) continue;
    const foes = w.foes.filter((f) => !f.dead && f.awake);
    if (!p.hand.some(Boolean)) { const adj = foes.find((f) => distance(f, p) === 1); if (adj && struggle(w, p.id, hx(adj)).ok) continue; }
    if (!foes.length) break;
    const opts = [...moveOptions(w, p).values()].filter((o) => o.cost <= 1);
    const near = (h) => Math.min(...foes.map((f) => distance(f, h)));
    const best = opts.sort((a, b) => near(a.hex) - near(b.hex) || a.steps - b.steps)[0];
    if (!best || near(best.hex) >= near(p)) break;
    moveHero(w, p.id, best.hex);
  }
  if (w.turn === "hero" && !p.ended) endTurn(w, p.id);
}
function botExplore(w, p, memo) {
  if (same(p, w.map.stairs)) { descend(w, p.id); return; }
  const opts = [...moveOptions(w, p).values()];
  if (!opts.length) { endTurn(w, p.id); return; }
  const visits = memo.visits;
  const score = (o) => distance(o.hex, w.map.stairs) + 3 * (visits.get(hk(o.hex)) ?? 0) + (w.map.hazards.has(hk(o.hex)) ? 5 : 0);
  const best = opts.sort((a, b) => score(a) - score(b))[0];
  visits.set(hk(best.hex), (visits.get(hk(best.hex)) ?? 0) + 1);
  moveHero(w, p.id, best.hex);
}
const same = (a, b) => a.q === b.q && a.r === b.r;
function runOnce(seed, players = 1, maxFloors = 3) {
  const w = createWorld({ rng: mulberry32(seed) });
  const ids = Array.from({ length: players }, (_, i) => "bot" + i);
  for (const id of ids) addPlayer(w, id, id);
  for (const id of ids) draftPick(w, id, 0);
  const seen = { hits: 0, foeCasts: 0, fights: 0, floors: 1, pickups: 0, wakes: 0, errors: 0 };
  const memo = { visits: new Map() };
  let lastFloor = w.floorNo;
  for (let t = 0; t < 6000 && w.floorNo <= maxFloors; t++) {
    if (w.phase === "over") break;
    if (w.floorNo !== lastFloor) { lastFloor = w.floorNo; memo.visits = new Map(); seen.floors++; }
    if (w.turn === "foe") foeStep(w);
    else for (const id of ids) {
      const p = w.players.get(id);
      if (p.dead) continue;
      if (w.turn === "hero" && !p.ended) botFight(w, p);
      else if (w.turn === "explore") botExplore(w, p, memo);
    }
    for (const e of w.fx) {
      if (e.k === "hit") seen.hits++;
      if (e.k === "cast" && e.src.startsWith("f")) seen.foeCasts++;
      if (e.k === "combat") seen.fights++;
      if (e.k === "pickup") seen.pickups++;
      if (e.k === "wake") seen.wakes++;
    }
    try { JSON.stringify(snapshot(w, ids[0], { withMap: true })); } catch { seen.errors++; }
    flushFx(w);
  }
  return { w, seen };
}

console.log("— full floor runs (generated dungeons)");
const agg = { fights: 0, floors: 0, foeCasts: 0, pickups: 0 };
for (const [seed, players] of [[1, 1], [2, 1], [3, 2], [4, 3], [5, 1], [6, 2], [7, 1], [8, 2]]) {
  const { w, seen } = runOnce(seed, players);
  ok(seen.errors === 0, `seed ${seed}: snapshots serialise`);
  ok(seen.fights > 0, `seed ${seed}: exploring led into a fight`);
  ok(seen.hits > 0, `seed ${seed}: damage landed`);
  for (const k of Object.keys(agg)) agg[k] += seen[k];
  console.log(`  seed ${seed} ×${players}: floor ${w.floorNo}, phase ${w.phase}/${w.turn}, fights ${seen.fights}, foe casts ${seen.foeCasts}, pickups ${seen.pickups}`);
}
ok(agg.floors > 8, `the party descends stairs across runs (${agg.floors} floors entered)`);
ok(agg.foeCasts > 0, "foes cast cards across runs");
ok(agg.pickups > 0, "gear gets picked up across runs");

console.log("— turn structure + moxie");
{
  const { w, p } = floor();
  ok(w.phase === "floor" && w.turn === "hero", "an awake foe in sight starts combat — players go first");
  ok(p.moxie === TURN_MOXIE, `5 moxie on the first turn (got ${p.moxie})`);
  ok(p.hand.length === HAND_SIZE && p.hand.every(Boolean), "three cards in hand");
  const f = w.foes[0];
  ok(f.moxie === 0, "foes have not been paid yet while the players act");
  endTurn(w, p.id);
  ok(w.turn === "foe", "ending the only player's turn hands it to the foes");
  runFoeTurn(w);
  ok(w.turn === "hero" && w.round === 2, "after the foes, round 2 starts with the players");
  ok(p.moxie === Math.min(MOXIE_CAP, 2 * TURN_MOXIE), `unspent moxie carries over (got ${p.moxie})`);
  endTurn(w, p.id); runFoeTurn(w);
  ok(p.moxie === MOXIE_CAP, `carry-over caps at 10 (got ${p.moxie})`);
}
{
  const { w, ps } = floor({ heroes: 2 });
  endTurn(w, ps[0].id);
  ok(w.turn === "hero", "co-op: one player ending does not start the foe turn");
  ok(moveHero(w, ps[0].id, neighbors(ps[0]).find((h) => w.board.has(h) && !occupant(w, h))).ok === false, "an ended player can't act");
  endTurn(w, ps[1].id);
  ok(w.turn === "foe", "co-op: foes go once everyone has ended");
}
{
  const { w, ps } = floor({ heroes: 2 });
  endTurn(w, ps[0].id);
  setConnected(w, ps[1].id, false);
  ok(w.turn === "foe", "a dropped phone doesn't stall the party's turn");
}

console.log("— exploring: free roam, fog, waking foes");
{
  const map = openMap(30, 7, { start: at(0, 3) });
  const { w, p } = floor({ map, awake: false, foes: [{ bodyKey: "fatCat", kit: ["oSword"], ...at(20, 3) }] });
  ok(w.turn === "explore", "no foe in sight → exploring, not turns");
  const s = snapshot(w, p.id);
  ok(s.foes.length === 0, "a foe outside your sight is hidden by the fog");
  const opts = moveOptions(w, p);
  ok([...opts.values()].every((o) => o.cost === 0), "moving costs nothing out of combat");
  const far = [...opts.values()].sort((a, b) => b.steps - a.steps)[0];
  const m0 = p.moxie;
  moveHero(w, p.id, far.hex);
  ok(p.moxie === m0, "roaming spends no moxie");
  ok(w.explored.size > 0 && w.explored.has(hk(p)), "ground you've seen stays mapped");
  // keep walking east until the foe comes into view: the walk must stop there and combat begin
  for (let i = 0; i < 6 && w.turn === "explore"; i++) {
    const o = [...moveOptions(w, p).values()].sort((a, b) => b.hex.q - a.hex.q)[0];
    moveHero(w, p.id, o.hex);
  }
  ok(w.turn === "hero", "spotting a foe stops the walk and starts the players' turn");
  ok(distance(p, w.foes[0]) >= 4, `the walk stopped at first sight, not next to the foe (distance ${distance(p, w.foes[0])})`);
  ok(snapshot(w, p.id).foes.length === 1, "the spotted foe is visible");
}
{
  const { w, p } = floor();
  const f = w.foes[0];
  f.hp = 1; setHand(p, ["oSword", "oSword", "oSword"]);
  place(p, ...Object.values(at(4, 3))); place(f, ...Object.values(at(5, 3)));
  p.timers.push({ key: "oSword", ops: [], period: 1, clock: 0 });
  playCard(w, p.id, 0, hx(f));
  ok(w.turn === "explore", "killing the last awake foe ends the fight");
  ok(p.timers.length === 0, "'this fight' effects end with the fight");
}

console.log("— movement bought with moxie by Speed");
{
  const { w, p } = floor();
  place(p, ...Object.values(at(0, 3)));
  const sp = speedOf(p);
  ok(sp === 3, `default Speed 3 (got ${sp})`);
  const opts = moveOptions(w, p);
  ok([...opts.values()].every((o) => o.cost === Math.ceil(o.steps / sp)), "each move costs ceil(hexes / Speed)");
  const m0 = p.moxie;
  ok(moveHero(w, p.id, at(2, 3)).ok, "move 2 hexes");
  ok(p.moxie === m0 - 1 && p.steps === 1, `2 hexes cost 1 moxie and bank 1 step (moxie ${p.moxie}, steps ${p.steps})`);
  ok(moveHero(w, p.id, at(3, 3)).ok && p.moxie === m0 - 1 && p.steps === 0, "the banked step is free");
  ok(moveHero(w, p.id, at(7, 3)).ok && p.moxie === m0 - 3 && p.steps === 2, `4 more hexes cost 2 (moxie ${p.moxie}, steps ${p.steps})`);
  ok(!moveHero(w, p.id, at(8, 3)).ok, "can't end on an occupied hex");
}

console.log("— pillars block sight; hazards bite");
{
  const map = openMap(11, 7, { pillars: [at(4, 3)] });
  const { w, p } = floor({ map });
  const f = w.foes[0];
  place(p, ...Object.values(at(2, 3))); place(f, ...Object.values(at(6, 3)));
  setHand(p, ["oBow", "oBow", "oBow"]);
  ok(canPlay(w, p, 0, hx(f)).why === "sight", "a pillar between you blocks a ranged card");
  place(f, ...Object.values(at(5, 1)));
  ok(canPlay(w, p, 0, hx(f)).ok, "with a clear line the same shot is fine");
  ok(!moveOptions(w, p).has(hk(at(4, 3))), "pillars can't be walked on");
}
{
  const map = openMap(11, 7, { hazards: [at(2, 3)] });
  const { w, p } = floor({ map });
  place(p, ...Object.values(at(1, 3)));
  const hp = p.hp;
  moveHero(w, p.id, at(3, 3));
  ok(p.hp === hp - HAZARD_DAMAGE.spikes || p.hp === hp, "walking over spikes may bite");
  place(p, ...Object.values(at(1, 3))); p.hp = hp;
  moveHero(w, p.id, at(2, 3));
  ok(p.hp === hp - HAZARD_DAMAGE.spikes, `stepping onto spikes deals ${HAZARD_DAMAGE.spikes}`);
  place(p, ...Object.values(at(1, 3))); p.hp = hp; p.moxie = 10; p.steps = 0;
  moveHero(w, p.id, at(3, 3));
  ok(p.hp === hp, "a route around the spikes is taken when it costs no more");
  const f = w.foes[0];
  place(f, ...Object.values(at(4, 3))); place(p, ...Object.values(at(0, 3)));
  f.moxie = 5;
  const plan = planFoe(w, f);
  ok(plan.act !== "move" || !pathHasHazard(w, plan), "foes never path over hazards");
}
function pathHasHazard(w, plan) { return [...plan.field.values()].some((v) => same(v.hex, plan.to) && w.map.hazards.has(hk(v.hex))); }

console.log("— card ranges, uses, reshuffle, struggle");
{
  const { w, p } = floor();
  const f = w.foes[0];
  ok(geometryOf("oSword").range === 1 && geometryOf("oSword").shape === "single", "Sword: single target, range 1");
  ok(cardClass("oSword") === "melee" && usesOf("oSword") === 3, "melee cards: 3 uses a floor");
  ok(cardClass("oBow") === "ranged" && usesOf("oBow") === 2, "ranged cards: 2 uses a floor");
  ok(cardClass("oIce") === "spell" && usesOf("oIce") === 1, "spells: 1 use a floor");
  setHand(p, ["oSword", "oBow", "dShield"]);
  place(p, ...Object.values(at(2, 3))); place(f, ...Object.values(at(4, 3)));
  ok(canPlay(w, p, 0, hx(f)).why === "range", "Sword can't reach 2 hexes away");
  ok(canPlay(w, p, 1, hx(f)).ok, "Bow reaches 2 hexes away");
}
{
  const { w, p } = floor({ foes: [{ bodyKey: "tollTroll", kit: ["dShield"], ...at(5, 3) }] });
  const f = w.foes[0]; f.hp = f.maxHp = 99;
  place(p, ...Object.values(at(4, 3)));
  p.deckList = ["oSword"]; p.hand = [{ id: "s", key: "oSword", uses: 3 }, null, null]; p.deck = []; p.disc = []; p.spent = [];
  for (let i = 0; i < 3; i++) { p.moxie = 10; const slot = p.hand.findIndex(Boolean); if (slot >= 0) playCard(w, p.id, slot, hx(f)); }
  ok(p.spent.length === 1 && p.spent[0].uses === 0, "a copy that's used up goes to the spent pile");
  ok(!p.hand.some(Boolean) && !p.deck.length && !p.disc.length, "spent copies never come back this floor");
  p.moxie = 5; f.shield = 0; const fhp = f.hp;
  ok(struggle(w, p.id, hx(f)).ok, "with an empty hand you can always Struggle");
  ok(p.moxie === 3 && f.hp === fhp - 1, "Struggle: 2 moxie, 1 damage (placeholder)");
}
{
  const { w, p } = floor();
  ok(struggle(w, p.id, hx(w.foes[0])).why === "hand", "Struggle only when your hand is empty");
  p.moxie = 5;
  ok(reshuffleCost(p) === 3, "reshuffle costs half your moxie, rounded up (5 → 3)");
  p.moxie = 10; ok(reshuffleCost(p) === 5, "10 → 5");
  p.moxie = 5;
  const before = p.hand.map((c) => c.id).join();
  ok(reshuffle(w, p.id).ok && p.moxie === 2, "reshuffle pays");
  ok(p.hand.every(Boolean) && p.hand.map((c) => c.id).join() !== before, "and draws a fresh hand");
}

console.log("— foe brain");
{
  const { w, p } = floor();
  const f = w.foes[0];
  place(p, ...Object.values(at(1, 3))); place(f, ...Object.values(at(6, 3)));
  endTurn(w, p.id);
  const hp = p.hp + p.shield;
  runFoeTurn(w);
  ok(distance(f, p) === 1, `melee foe walks into range (distance ${distance(f, p)})`);
  ok(p.hp + p.shield < hp, "and attacks this turn when move + card fit in 5 moxie");
}
{
  const { w, ps } = floor({ heroes: 2 });
  const f = w.foes[0];
  const [near, far] = ps;
  place(near, ...Object.values(at(5, 1))); place(far, ...Object.values(at(5, 5))); place(f, ...Object.values(at(5, 2)));
  far.hp = 1;
  const plan = planFoe(w, Object.assign(f, { moxie: 5 }));
  ok(plan.act === "cast" && plan.aim.primary === near, "foe hits the hero it can reach most cheaply");
}
{
  const { w, p } = floor({ foes: [{ bodyKey: "fatCat", kit: ["oBow"], ...at(4, 3) }] });
  const f = w.foes[0];
  place(p, ...Object.values(at(1, 3)));
  endTurn(w, p.id);
  const hp = p.hp;
  runFoeTurn(w);
  ok(p.hp < hp, "ranged foe in range fires without walking");
}
{
  const map = openMap(11, 7, { pillars: [at(3, 3)] });
  const { w, p } = floor({ map, foes: [{ bodyKey: "fatCat", kit: ["oBow"], ...at(5, 3) }] });
  const f = w.foes[0];
  place(p, ...Object.values(at(1, 3)));
  const plan = planFoe(w, Object.assign(f, { moxie: 5 }));
  ok(plan.act === "move", "a ranged foe blocked by a pillar moves for a clear line first");
}

console.log("— gear, the mimic, stairs");
{
  const { w, p } = floor({ items: [{ key: "oBow", ...at(2, 3) }] });
  place(p, ...Object.values(at(1, 3)));
  const n = p.deckList.length;
  moveHero(w, p.id, at(2, 3));
  ok(p.deckList.length === n + 1 && p.deckList.at(-1) === "oBow", "walking onto gear adds it to your deck");
}
{
  const { w, p } = floor();
  const f = w.foes[0];
  f.hp = 1; setHand(p, ["oSword", "oSword", "oSword"]);
  place(p, ...Object.values(at(4, 3))); place(f, ...Object.values(at(5, 3)));
  playCard(w, p.id, 0, hx(f));
  ok(w.items.some((i) => i.husk === "fatCat"), "a felled foe leaves its body");
  ok(w.items.some((i) => i.key === "oSword"), "and drops a card it carried");
  moveHero(w, p.id, at(5, 3));
  ok(snapshot(w, p.id).you.husk === "fatCat", "standing on the body offers to wear it");
  ok(wear(w, p.id).ok && p.bodyKey === "fatCat", "wearing it changes your body");
}
{
  const { w, p } = floor({ awake: false, foes: [], map: openMap(11, 7, { start: at(0, 3), stairs: at(1, 3) }) });
  p.hp = 1; p.hand[0].uses = 0;
  ok(descend(w, p.id).why === "stairs", "you must stand on the stairs");
  moveHero(w, p.id, at(1, 3));
  const floorNo = w.floorNo;
  ok(descend(w, p.id).ok && w.floorNo === floorNo + 1, "the stairs take the party down");
  ok(p.hp === p.maxHp, "descending heals (placeholder)");
  ok(p.hand.every((c) => !c || c.uses === usesOf(c.key)) && !p.spent.length, "the full deck with fresh uses each floor");
  ok(w.map && w.map.floor.size > 20, "the new floor is a generated dungeon");
}

console.log("— foe info is public; text in turns");
{
  const { w, p } = floor({ foes: [{ bodyKey: "fatCat", kit: ["oSword", "dShield", "oBow"], ...at(5, 3) }] });
  const s = snapshot(w, p.id, { withMap: true });
  const f = s.foes[0];
  ok(f.next === "oSword" && f.queue.length === 3, "next card + whole queue are public");
  ok(f.speed === 3 && f.mhp > 0 && f.mx != null, "stats (speed, hp, moxie) are public");
  ok(s.map && s.map.floor.length > 0, "the floor layout is sent with the map");
  const cat = catalog();
  ok(cat.cards.oSword.uses === 3 && cat.cards.oSword.range === 1, "catalog carries uses + range");
  ok(!Object.values(cat.cards).some((c) => /second/i.test(c.text)), "no card text says seconds");
  ok(turnsText("Every 6 seconds, heal 1. In 6 seconds, do it again.") === "Every turn, heal 1. Next turn, do it again.", "seconds → turns reads naturally");
}

console.log("— statuses last through the other side's turn");
{
  const { w, p } = floor();
  setHand(p, ["dStoneskin", "dShield", "dShield"]);
  ok(playCard(w, p.id, 0, null).ok, "Stoneskin cast");
  endTurn(w, p.id);
  ok(p.buffs.some((b) => b.kind === "stoneskin"), "Stoneskin still up during the foe turn");
}

console.log("— review regressions");
{
  const { w, p } = floor();
  removePlayer(w, p.id);
  ok(w.phase === "draft", `solo player leaving mid-floor resets the room (phase ${w.phase})`);
  const q = addPlayer(w, "late", "Late");
  ok(q.offers.length === 3, "a newcomer still gets offers");
}
{
  const { w, ps } = floor({ heroes: 2 });
  const [a, b] = ps;
  setConnected(w, b.id, false);
  a.hp = 0; a.dead = true;
  removePlayer(w, b.id);
  ok(w.phase !== "floor", `dead player + departed partner doesn't freeze (phase ${w.phase})`);
}
{
  const w = createWorld({ rng: mulberry32(5) });
  for (let i = 0; i < 12; i++) addPlayer(w, "j" + i, "J" + i);
  ok([...w.players.values()].every((p) => p.offers.length === 3), "offers never run dry with many joiners");
}
{
  const { w, ps } = floor({ heroes: 2 });
  const [a, b] = ps;
  const f = w.foes[0];
  place(a, ...Object.values(at(3, 3))); place(f, ...Object.values(at(4, 3)));
  f.thorns = 99; setHand(a, ["oSword", "oSword", "oSword"]);
  endTurn(w, b.id);
  playCard(w, a.id, 0, hx(f));
  ok(a.dead, "attacker died to thorns");
  ok(w.turn === "foe" || w.phase !== "floor", "a hero dying on their own turn hands the turn on");
}
{
  const { w, p } = floor({ foes: [1, 2, 3].map((i) => ({ bodyKey: "fatCat", kit: ["oSword"], ...at(i === 3 ? 9 : i - 1, i === 1 ? 0 : 1) })) });
  place(p, ...Object.values(at(0, 0)));
  const [a, b, c] = w.foes;
  place(a, ...Object.values(at(1, 0))); place(b, ...Object.values(at(0, 1)));
  place(c, ...Object.values(at(9, 5)));
  const plan = planFoe(w, Object.assign(c, { moxie: 5 }));
  ok(plan.act === "move", `boxed-out foe still advances (${plan.act})`);
}
{
  const w = createWorld({ rng: mulberry32(3) });
  addPlayer(w, "solo", "Solo"); draftPick(w, "solo", 0);
  ok(w.phase === "floor" && w.map && w.floorNo === 1, "drafting starts floor 1");
  restartRun(w);
  ok(w.phase === "draft" && w.floorNo === 0, "restart returns to the draft");
}

console.log("— level 0 foes on the first floors");
{
  const w = createWorld({ rng: mulberry32(21) });
  addPlayer(w, "a", "A"); draftPick(w, "a", 0);
  ok(w.foes.length >= 1 && w.foes.every((f) => f.level === 0), "floor 1 spawns only level-0 foes");
  ok(w.foes.every((f) => f.kitList.every((k) => LEVEL0_CARDS.includes(k))), "level-0 foes carry only basic cards");
  ok(w.foes.every((f) => f.maxHp < 10), `level-0 foes are frail (max HP ${w.foes.map((f) => f.maxHp).join("/")})`);
}

console.log(`\n${fail ? "❌" : "✅"} TAC ${fail ? "FAILURES" : "ALL PASS"} — ${pass} passed${fail ? `, ${fail} failed` : ""}`);
process.exit(fail ? 1 : 0);
