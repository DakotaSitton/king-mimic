// Hex tactics sim suite: bun run test/tac.test.js
// Drives the PURE turn-based sim (engine/tac/sim.js) through full runs with a simple bot, plus
// focused checks for the rules the owner stated (5 moxie a turn, carry to 10, movement bought with
// moxie by Speed, card ranges/radii, players first then foes, foes close to range and hit the
// easiest target, every foe shows its next card).
import {
  createWorld, addPlayer, snapshot, flushFx, playCard, draftPick, voteDoor, rewardPick, restartRun,
  moveHero, moveOptions, endTurn, foeStep, runFoeTurn, planFoe, canPlay, enterRoom, catalog, mulberry32,
  geometryOf, speedOf, occupant, setConnected, removePlayer, TURN_MOXIE, MOXIE_CAP, PORTED_PLAYER_CARDS,
} from "../engine/tac/sim.js";
import { distance, neighbors, key as hk } from "../engine/tac/hex.js";
import { HAND_SIZE, KIT } from "../game.js";

Math.random = mulberry32(20261028);
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("  ✗ " + msg); } };
const hx = (c) => ({ q: c.q, r: c.r });

// --- bot: play anything legal on the easiest target; else walk toward the nearest foe ----------
function botTryPlay(w, p) {
  for (let s = 0; s < HAND_SIZE; s++) {
    const card = p.hand[s]; if (!card) continue;
    const targets = [hx(p), ...w.foes.filter((f) => !f.dead).sort((a, b) => a.hp - b.hp).map(hx)];
    for (const at of targets) if (canPlay(w, p, s, at).ok) { playCard(w, p.id, s, at); return true; }
  }
  return false;
}
function botTurn(w, p) {
  for (let guard = 0; guard < 12 && w.phase === "fight" && !p.dead; guard++) {
    if (botTryPlay(w, p)) continue;
    const foes = w.foes.filter((f) => !f.dead);
    if (!foes.length) break;
    const opts = [...moveOptions(w, p).values()].filter((o) => o.cost <= 1);
    const near = (h) => Math.min(...foes.map((f) => distance(f, h)));
    const here = near(p);
    const best = opts.sort((a, b) => near(a.hex) - near(b.hex) || a.steps - b.steps)[0];
    if (!best || near(best.hex) >= here) break;
    moveHero(w, p.id, best.hex);
  }
  endTurn(w, p.id);
}
function runOnce(seed, players = 1, maxRooms = 4) {
  const w = createWorld({ rng: mulberry32(seed) });
  const ids = Array.from({ length: players }, (_, i) => "bot" + i);
  for (const id of ids) addPlayer(w, id, id);
  for (const id of ids) draftPick(w, id, 0);
  const seen = { hits: 0, casts: 0, foeCasts: 0, foeMoves: 0, rounds: 0, phases: new Set(), errors: 0 };
  for (let t = 0; t < 4000 && w.depth < maxRooms; t++) {
    seen.phases.add(w.phase);
    if (w.phase === "doors") for (const id of ids) voteDoor(w, id, 0);
    else if (w.phase === "reward") for (const id of ids) { rewardPick(w, id, "card", 0); rewardPick(w, id, "body", 0); rewardPick(w, id, "done", 0); }
    else if (w.phase === "over") break;
    else if (w.phase === "fight" && w.turn === "hero") for (const id of ids) { const p = w.players.get(id); if (!p.dead && !p.ended) botTurn(w, p); }
    else if (w.phase === "fight" && w.turn === "foe") foeStep(w);
    for (const e of w.fx) {
      if (e.k === "hit") seen.hits++;
      if (e.k === "cast") { seen.casts++; if (e.src.startsWith("f")) seen.foeCasts++; }
      if (e.k === "move" && e.id.startsWith("f")) seen.foeMoves++;
      if (e.k === "turn" && e.side === "hero") seen.rounds++;
    }
    try { JSON.stringify(snapshot(w, ids[0])); } catch { seen.errors++; }
    flushFx(w);
  }
  return { w, seen };
}

console.log("— lifecycle runs");
let totalFoeMoves = 0;
for (const [seed, players] of [[1, 1], [2, 1], [3, 2], [4, 3], [5, 1], [6, 2], [7, 1], [8, 4]]) {
  const { w, seen } = runOnce(seed, players);
  ok(seen.phases.has("fight"), `seed ${seed}: reached a fight`);
  ok(seen.foeCasts > 0, `seed ${seed}: foes cast cards`);
  totalFoeMoves += seen.foeMoves;
  ok(seen.hits > 0, `seed ${seed}: damage landed`);
  ok(w.depth >= 1 || w.phase === "over", `seed ${seed}: cleared a room or the run ended honestly (depth ${w.depth}, ${w.phase})`);
  ok(seen.errors === 0, `seed ${seed}: snapshots serialise`);
  console.log(`  seed ${seed} ×${players}: depth ${w.depth}, phase ${w.phase}, rounds ${seen.rounds}, casts ${seen.casts} (foe ${seen.foeCasts}), foe moves ${seen.foeMoves}`);
}
ok(totalFoeMoves > 0, "foes moved across the runs");

// A controlled room: one hero, chosen foes, chosen hand.
function room({ heroes = 1, foes = [{ bodyKey: "fatCat", kit: ["oSword"] }], seed = 11 } = {}) {
  const w = createWorld({ rng: mulberry32(seed) });
  const ps = [];
  for (let i = 0; i < heroes; i++) { const p = addPlayer(w, "h" + i, "H" + i); draftPick(w, p.id, 0); ps.push(p); }
  enterRoom(w, { id: "t", foes });
  return { w, ps, p: ps[0] };
}
const setHand = (p, keys) => { p.hand = keys.map((key, i) => ({ id: "x" + i, key })); };
const place = (c, q, r) => { c.q = q; c.r = r; };

console.log("— turn structure + moxie");
{
  const { w, p } = room();
  ok(w.phase === "fight" && w.turn === "hero", "players always go first");
  ok(p.moxie === TURN_MOXIE, `5 moxie on the first turn (got ${p.moxie})`);
  ok(p.hand.length === HAND_SIZE && p.hand.every(Boolean), "three cards in hand");
  const f = w.foes[0];
  ok(f.moxie === 0, "foes have not been paid yet while the players act");
  endTurn(w, p.id);
  ok(w.turn === "foe", "ending the only player's turn hands it to the foes");
  ok(f.moxie <= TURN_MOXIE, "foe gets its 5 at the start of its turn");
  runFoeTurn(w);
  ok(w.turn === "hero" && w.round === 2, "after the foes, round 2 starts with the players");
  ok(p.moxie === Math.min(MOXIE_CAP, 2 * TURN_MOXIE), `unspent moxie carries over (got ${p.moxie})`);
  endTurn(w, p.id); runFoeTurn(w);
  ok(p.moxie === MOXIE_CAP, `carry-over caps at 10 (got ${p.moxie})`);
}
{
  const { w, ps } = room({ heroes: 2 });
  endTurn(w, ps[0].id);
  ok(w.turn === "hero", "co-op: one player ending does not start the foe turn");
  ok(moveHero(w, ps[0].id, neighbors(ps[0]).find((h) => w.board.has(h) && !occupant(w, h))).ok === false, "an ended player can't act");
  endTurn(w, ps[1].id);
  ok(w.turn === "foe", "co-op: foes go once everyone has ended");
}
{
  const { w, ps } = room({ heroes: 2 });
  endTurn(w, ps[0].id);
  setConnected(w, ps[1].id, false);
  ok(w.turn === "foe", "a dropped phone doesn't stall the party's turn");
}

console.log("— movement bought with moxie by Speed");
{
  const { w, p } = room();
  place(p, 0, 3); place(w.foes[0], 8, 3);
  const sp = speedOf(p);
  ok(sp === 3, `default Speed 3 (got ${sp})`);
  const opts = moveOptions(w, p);
  ok([...opts.values()].every((o) => o.cost === Math.ceil(o.steps / sp)), "each move costs ceil(hexes / Speed)");
  ok(Math.max(...[...opts.values()].map((o) => o.steps)) <= p.moxie * sp, "reach is limited by moxie × Speed");
  const m0 = p.moxie;
  ok(moveHero(w, p.id, { q: 2, r: 3 }).ok, "move 2 hexes");
  ok(p.moxie === m0 - 1 && p.steps === 1, `2 hexes cost 1 moxie and bank 1 step (moxie ${p.moxie}, steps ${p.steps})`);
  ok(moveHero(w, p.id, { q: 3, r: 3 }).ok && p.moxie === m0 - 1 && p.steps === 0, "the banked step is free");
  ok(moveHero(w, p.id, { q: 7, r: 3 }).ok && p.moxie === m0 - 3 && p.steps === 2, `4 more hexes cost 2 (moxie ${p.moxie}, steps ${p.steps})`);
  ok(!moveHero(w, p.id, { q: 8, r: 3 }).ok, "can't end on an occupied hex");
  endTurn(w, p.id); runFoeTurn(w);
  ok(p.steps === 0, "banked steps don't survive the turn");
}
{
  const { w, p } = room({ foes: [{ bodyKey: "fatCat", kit: ["dShield"] }, { bodyKey: "fatCat", kit: ["dShield"] }, { bodyKey: "fatCat", kit: ["dShield"] }] });
  // wall of foes in column 2 rows 2..4 around a hero at (0,3): can't walk through them
  place(p, 0, 3);
  const [a, b, c] = w.foes; place(a, 1, 3); place(b, 1, 2); place(c, 0, 4);
  const opts = moveOptions(w, p);
  ok(!opts.has(hk({ q: 1, r: 3 })), "can't stand on a foe");
  ok([...opts.values()].every((o) => o.steps >= distance(p, o.hex)), "paths never shortcut");
}

console.log("— card ranges + radii");
{
  const { w, p } = room();
  const f = w.foes[0];
  ok(geometryOf("oSword").range === 1 && geometryOf("oSword").shape === "single", "Sword: single target, range 1");
  ok(geometryOf("oBow").range === 4, "Bow: range 4");
  ok(geometryOf("oLightning").shape === "blast" && geometryOf("oLightning").radius === 1, "Lightning: blast radius 1");
  setHand(p, ["oSword", "oBow", "dShield"]);
  place(p, 2, 3); place(f, 4, 3);
  ok(canPlay(w, p, 0, hx(f)).why === "range", "Sword can't reach 2 hexes away");
  ok(canPlay(w, p, 1, hx(f)).ok, "Bow reaches 2 hexes away");
  ok(canPlay(w, p, 1, { q: 3, r: 3 }).why === "aim", "single-target cards need a foe on the aimed hex");
  place(f, 3, 3);
  const hp = f.hp;
  ok(playCard(w, p.id, 0, hx(f)).ok, "Sword hits an adjacent foe");
  ok(f.hp < hp || f.dead, "and deals damage");
  ok(p.hand[0] && p.hand[0].id !== "x0", "the played slot draws a new card");
}
{
  const { w, p } = room({ foes: [{ bodyKey: "fatCat", kit: ["dShield"] }, { bodyKey: "fatCat", kit: ["dShield"] }, { bodyKey: "fatCat", kit: ["dShield"] }] });
  const [a, b, c] = w.foes;
  setHand(p, ["oLightning", "dShield", "dShield"]);
  p.moxie = 10;
  place(p, 1, 3); place(a, 4, 3); place(b, 5, 3); place(c, 8, 3);
  const before = [a.hp, b.hp, c.hp];
  ok(playCard(w, p.id, 0, hx(a)).ok, "blast aimed at a foe within range");
  ok(a.hp < before[0] && b.hp < before[1] && c.hp === before[2], "blast hits the aimed hex + radius 1 only");
}

console.log("— foe brain");
{
  const { w, p } = room({ foes: [{ bodyKey: "fatCat", kit: ["oSword"] }] });
  const f = w.foes[0];
  place(p, 1, 3); place(f, 6, 3);
  endTurn(w, p.id);
  const hp = p.hp + p.shield;
  runFoeTurn(w);
  ok(distance(f, p) === 1, `melee foe walks into range (distance ${distance(f, p)})`);
  ok(p.hp + p.shield < hp, "and attacks this turn when move + card fit in 5 moxie");
}
{
  const { w, ps } = room({ heroes: 2, foes: [{ bodyKey: "fatCat", kit: ["oSword"] }] });
  const f = w.foes[0];
  const [near, far] = ps;
  place(near, 5, 1); place(far, 5, 5); place(f, 5, 2);   // near is adjacent, far needs walking
  far.hp = 1;                                            // even a 1-HP hero far away loses to "no walking"
  const plan = planFoe(w, Object.assign(f, { moxie: 5 }));
  ok(plan.act === "cast" && plan.aim.primary === near, "foe hits the hero it can reach most cheaply");
}
{
  const { w, ps } = room({ heroes: 2, foes: [{ bodyKey: "fatCat", kit: ["oSword"] }] });
  const f = w.foes[0];
  const [a, b] = ps;
  place(f, 5, 3); place(a, 6, 3); place(b, 4, 3);       // both adjacent
  a.hp = 9; b.hp = 3;
  const plan = planFoe(w, Object.assign(f, { moxie: 5 }));
  ok(plan.act === "cast" && plan.aim.primary === b, "tie on cost → the lower-HP hero");
}
{
  const { w, p } = room({ foes: [{ bodyKey: "fatCat", kit: ["oZweihander"] }] });   // cost 6 > 5
  const f = w.foes[0];
  place(p, 1, 3); place(f, 9, 3);
  endTurn(w, p.id); runFoeTurn(w);
  const d1 = distance(f, p), m1 = f.moxie;
  ok(d1 < 8, `expensive-card foe still closes in (distance ${d1})`);
  ok(m1 >= 1, `but banks moxie toward the cast (moxie ${m1})`);
  endTurn(w, p.id); runFoeTurn(w);
  endTurn(w, p.id); runFoeTurn(w);
  ok(p.hp < p.maxHp || p.shield < 0 || w.phase !== "fight" || p.dead, "and eventually lands it");
}
{
  const { w, p } = room({ foes: [{ bodyKey: "fatCat", kit: ["oBow"] }] });
  const f = w.foes[0];
  place(p, 1, 3); place(f, 4, 3);
  endTurn(w, p.id);
  const hp = p.hp;
  runFoeTurn(w);
  ok(p.hp < hp, "ranged foe in range fires without walking");
  ok(f.q === 4 && f.r === 3, "ranged foe in range doesn't need to move");
}

console.log("— foe info is public");
{
  const { w, p } = room({ foes: [{ bodyKey: "fatCat", kit: ["oSword", "dShield", "oBow"] }] });
  const s = snapshot(w, p.id);
  const f = s.foes[0];
  ok(f.next === "oSword", "next card is in the snapshot");
  ok(Array.isArray(f.queue) && f.queue.length === 3, "the whole queue is public");
  ok(f.speed === 3 && f.mhp > 0 && f.mx != null, "stats (speed, hp, moxie) are public");
  const cat = catalog();
  ok(cat.cards.oSword.range === 1 && cat.cards.oSword.shape === "single", "catalog carries card range/shape");
  ok(cat.bodies.fatCat.passive.length > 0, "catalog carries passive text for the inspector");
  ok(!JSON.stringify(cat).includes('"name":"oSword"'), "catalog names are display names");
}

console.log("— statuses last through the other side's turn");
{
  const { w, p } = room({ foes: [{ bodyKey: "fatCat", kit: ["oSword"] }] });
  const f = w.foes[0];
  setHand(p, ["dStoneskin", "dShield", "dShield"]);
  place(p, 3, 3); place(f, 4, 3);
  ok(playCard(w, p.id, 0, null).ok, "Stoneskin cast");
  ok(p.buffs.some((b) => b.kind === "stoneskin"), "buff applied");
  endTurn(w, p.id);
  ok(p.buffs.some((b) => b.kind === "stoneskin"), "Stoneskin still up during the foe turn");
}

console.log("— reward + restart");
{
  const { w, p } = room({ foes: [{ bodyKey: "fatCat", kit: ["oSword"] }] });
  const f = w.foes[0];
  f.hp = 1; setHand(p, ["oSword", "oSword", "oSword"]);
  place(p, 3, 3); place(f, 4, 3);
  playCard(w, p.id, 0, hx(f));
  ok(w.phase === "reward", "killing the last foe clears the room");
  ok(p.reward.bodies.includes("fatCat"), "you may wear the body you felled");
  rewardPick(w, p.id, "body", 0); rewardPick(w, p.id, "done", 0);
  ok(p.bodyKey === "fatCat" && w.phase === "doors", "wearing it + next doors");
  restartRun(w);
  ok(w.phase === "draft" && !p.picked, "restart returns to the draft");
}

console.log("— review regressions (stalls, offers, boxed-in foes)");
{
  const { w, p } = room();
  removePlayer(w, p.id);
  ok(w.phase !== "fight", `solo player dropping out mid-fight doesn't freeze the room (phase ${w.phase})`);
  const q = addPlayer(w, "late", "Late");
  ok(q.offers.length === 3, "a newcomer still gets offers");
  draftPick(w, "late", 0);
  ok(w.phase === "doors" && !q.waitNext, `the newcomer can play right away (phase ${w.phase})`);
}
{
  const { w, ps } = room({ heroes: 2 });
  const [a, b] = ps;
  setConnected(w, b.id, false);
  a.hp = 0; a.dead = true;
  removePlayer(w, b.id);
  ok(w.phase !== "fight", `dead player + departed partner ends the fight (phase ${w.phase})`);
}
{
  const w = createWorld({ rng: mulberry32(5) });
  for (let i = 0; i < 12; i++) addPlayer(w, "j" + i, "J" + i);
  ok([...w.players.values()].every((p) => p.offers.length === 3), "offers never run dry with many joiners");
}
{
  const { w, ps } = room({ heroes: 2, foes: [{ bodyKey: "fatCat", kit: ["oSword"] }] });
  const [a, b] = ps;
  const f = w.foes[0];
  place(a, 3, 3); place(b, 0, 0); place(f, 4, 3);
  f.thorns = 99; setHand(a, ["oSword", "oSword", "oSword"]);
  endTurn(w, b.id);
  playCard(w, a.id, 0, hx(f));
  ok(a.dead, "attacker died to thorns");
  ok(w.turn === "foe" || w.phase !== "fight", "a hero dying on their own turn hands the turn on");
}
{
  // a hero boxed into a corner by foes: the others still close in instead of freezing at spawn
  const { w, p } = room({ foes: [1, 2, 3].map(() => ({ bodyKey: "fatCat", kit: ["oSword"] })) });
  const [a, b, c] = w.foes;
  place(p, 0, 0); place(a, 1, 0); place(b, 0, 1);
  place(c, 9, 5);
  const plan = planFoe(w, Object.assign(c, { moxie: 5 }));
  ok(plan.act === "move", `boxed-out foe still advances (${plan.act})`);
}

console.log(`\n${fail ? "❌" : "✅"} TAC ${fail ? "FAILURES" : "ALL PASS"} — ${pass} passed${fail ? `, ${fail} failed` : ""}`);
process.exit(fail ? 1 : 0);
