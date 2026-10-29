// FLICK mode — deterministic engine checks + full-floor bot runs for every starter body.
//   bun run test/flick.test.js            (RUNS=n per body, default 12)
import { CARDS, BODIES, TUNING } from "../engine/flick/content.js";
import { makeFloor, roomAt } from "../engine/flick/floor.js";
import {
  createRun, step, play, setMove, playerOf, shapeOf, hitsOf, cardCost, cardVals, bodyStats, takeCard, wear,
  closeReward, rngFrom, solidAt, DT, damage,
} from "../engine/flick/sim.js";
import { botThink } from "../engine/flick/bot.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("  ✗ " + m); } };

// ---------- floors ----------
for (let seed = 1; seed <= 300; seed++) {
  const f = makeFloor(rngFrom(seed));
  ok(f.rooms.length === 6 && f.rooms[0].kind === "start" && f.rooms[5].kind === "boss", `seed ${seed}: 6 rooms start…boss`);
  // every room reachable from the start
  const seen = new Uint8Array(f.w * f.h), q = [Math.floor(f.start.y) * f.w + Math.floor(f.start.x)]; seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const k = q[h], x = k % f.w, y = (k / f.w) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { const nk = ny * f.w + nx;
      if (nx >= 0 && ny >= 0 && nx < f.w && ny < f.h && f.tiles[nk] && !seen[nk]) { seen[nk] = 1; q.push(nk); } } }
  ok(f.rooms.every((r) => seen[Math.floor(r.cy) * f.w + Math.floor(r.cx)]), `seed ${seed}: all rooms connected`);
  ok(f.rooms.slice(1).every((r) => r.doors.length >= 2), `seed ${seed}: every fight/boss room has a door`);
  // no fight room can be bypassed: with its floor walled off, the boss room is out of reach
  for (const r of f.rooms.filter((x) => x.kind === "fight")) {
    const inRoom = (k) => { const x = k % f.w, y = (k / f.w) | 0; return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; };
    const s2 = new Uint8Array(f.w * f.h), q2 = [q[0]]; s2[q2[0]] = 1;
    for (let h = 0; h < q2.length; h++) { const k = q2[h], x = k % f.w, y = (k / f.w) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { const nk = ny * f.w + nx;
        if (nx >= 0 && ny >= 0 && nx < f.w && ny < f.h && f.tiles[nk] && !inRoom(nk) && !s2[nk]) { s2[nk] = 1; q2.push(nk); } } }
    const boss = f.rooms[5];
    ok(!s2[Math.floor(boss.cy) * f.w + Math.floor(boss.cx)], `seed ${seed}: room ${r.id} can't be walked around`);
  }
}

// ---------- a hand-built arena for geometry checks ----------
function arena(body = "fatCat", deck = ["sword", "spear", "bow", "fireball", "zweihander", "shield", "holyLight", "dagger"]) {
  const S = createRun({ seed: 7, players: [{ id: "a", body, deck }] });
  const e = playerOf(S, "a");
  // drop every foe; we place our own
  S.ents = S.ents.filter((x) => x.kind === "player");
  for (const rs of S.rooms) rs.status = "clear";   // no room logic in the way
  const r = S.floor.rooms.find((x) => x.kind === "boss");
  e.x = r.x + 3; e.y = r.cy; e.mana = 99;
  return { S, e, r };
}
function dummy(S, x, y, hp = 50) {
  const d = { id: S.nextId++, side: "foe", kind: "foe", body: "wearyWageslave", gem: "ruby", awake: true, x, y, r: TUNING.radius,
    hp, maxHp: hp, shield: 0, mana: 0, maxMana: 8, regen: 0, speed: 0, mx: 0, my: 0, fx: 1, fy: 0, cast: null, dash: null,
    slowUntil: 0, slowPct: 0, dead: false, deck: ["dagger"], qi: 0, rest: 99, hand: [], draw: [], discard: [], room: 99 };
  S.ents.push(d); return d;
}
const run = (S, sec) => { for (let i = 0; i < sec / DT; i++) step(S, DT); };
{
  const { S, e } = arena();
  const front = dummy(S, e.x + 1.2, e.y), behind = dummy(S, e.x - 1.2, e.y);
  e.hand = ["sword", "spear", "bow"];
  const sh = shapeOf(S, e, "sword", { dx: 1, dy: 0 });
  const h = hitsOf(S, e, sh).foes.map((f) => f.id);
  ok(h.includes(front.id) && !h.includes(behind.id), "sword arc hits in front, not behind");
  const v = cardVals(e, "sword");
  ok(v.dmg === 4 && v.gemOn, "Ruby body: Sword +1 damage (3→4)");
  play(S, "a", 0, { dx: 1, dy: 0 }); run(S, 0.6);
  ok(front.hp === 46 && behind.hp === 50, `sword landed for 4 after its windup (front ${front.hp})`);
}
{
  const { S, e } = arena("royalRat");
  const onLine = dummy(S, e.x + 2.5, e.y), offLine = dummy(S, e.x + 2.5, e.y + 1.0);
  const h = hitsOf(S, e, shapeOf(S, e, "spear", { dx: 1, dy: 0 })).foes.map((f) => f.id);
  ok(h.includes(onLine.id) && !h.includes(offLine.id), "spear is a thin line");
}
{
  const { S, e } = arena("lizardWizard");
  const near = dummy(S, e.x + 2, e.y), far = dummy(S, e.x + 4, e.y);
  const h = hitsOf(S, e, shapeOf(S, e, "bow", { dx: 1, dy: 0 })).foes.map((f) => f.id);
  ok(h.length === 1 && h[0] === near.id, "bow hits only the first foe");
  ok(cardCost(e, "fireball") === CARDS.fireball.cost - 1 && cardCost(e, "bow") === CARDS.bow.cost, "Lizard Wizard: spells cost 1 less, weapons don't");
  const fb = shapeOf(S, e, "fireball", { dx: 1, dy: 0, dist: 4 });
  ok(Math.abs(fb.x - (e.x + 4)) < 0.01, "fireball lands where it's aimed");
  const fbFar = shapeOf(S, e, "fireball", { dx: 1, dy: 0, dist: 40 });
  ok(Math.hypot(fbFar.x - e.x, fbFar.y - e.y) <= CARDS.fireball.shape.range + 1e-6, "fireball clamps to its range");
}
{
  // gem stats
  const r = bodyStats("fatCat", false), em = bodyStats("royalRat", false), sa = bodyStats("lizardWizard", false), di = bodyStats("auditAngel", false);
  ok(r.maxHp === 26 && em.maxHp === 20, "Ruby +6 HP");
  ok(em.speed > r.speed && Math.abs(em.speed / r.speed - 1.2) < 1e-9, "Emerald +20% speed");
  ok(sa.maxMana === TUNING.mana + 3 && sa.regen > r.regen, "Sapphire +mana");
  ok(di.maxHp === 20 && di.speed === r.speed && di.maxMana === TUNING.mana, "Diamond: no stat");
}
{
  // Royal Rat: every card played summons a rat; rats bite
  const { S, e } = arena("royalRat");
  const f = dummy(S, e.x + 3, e.y, 30);
  e.hand = ["dagger", "dagger", "dagger"];
  play(S, "a", 0, { dx: 1, dy: 0 });
  ok(S.ents.filter((x) => x.kind === "unit" && x.unit === "rat").length === 1, "Royal Rat: a card played summons a rat");
  run(S, 3);
  ok(f.hp < 30, `rats bite (dummy at ${f.hp})`);
}
{
  // Fat Cat: being hit summons a rat (with a short cooldown)
  const { S, e } = arena("fatCat");
  damage(S, e, 1, { side: "foe" }); damage(S, e, 1, { side: "foe" });
  ok(S.ents.filter((x) => x.unit === "rat").length === 1, "Fat Cat: hit → one rat (cooldown stops a second)");
  run(S, TUNING.fatCatCooldown + 0.1); damage(S, e, 1, { side: "foe" });
  ok(S.ents.filter((x) => x.unit === "rat" && !x.dead).length === 2, "Fat Cat: after the cooldown, another rat");
}
{
  // foe telegraph: standing still in the reticle gets hit, stepping out doesn't
  const mk = () => { const a = arena("auditAngel"); const f = dummy(a.S, a.e.x + 1.2, a.e.y); f.deck = ["sword"]; f.qi = 0; f.rest = 0; f.mana = 8; f.regen = 1; f.speed = 0; return { ...a, f }; };
  const A = mk(); run(A.S, 0.1);
  ok(!!A.f.cast, "foe winds up a card (reticle live)");
  const hp0 = A.e.hp; run(A.S, 1.2);
  ok(A.e.hp < hp0, "standing in the reticle → hit");
  const B = mk(); run(B.S, 0.1);
  setMove(B.S, "a", -1, 0); run(B.S, 1.2);
  ok(B.e.hp === B.e.maxHp, "walking out of the reticle → dodged");
}
{
  // Sunbeam heals allies and hurts foes over time; Diamond adds +1 per tick
  const { S, e } = arena("auditAngel", ["sunbeam", "sunbeam", "sunbeam", "dagger", "dagger", "dagger", "dagger", "dagger"]);
  const f = dummy(S, e.x + 3, e.y, 40); e.hp = 10;
  e.hand = ["sunbeam", "dagger", "dagger"];
  play(S, "a", 0, { dx: 1, dy: 0, dist: 1.5 });
  run(S, 6.5);
  ok(f.hp === 40 - 10 && e.hp === Math.min(e.maxHp, 10 + 10), `sunbeam 5 ticks × 2 on a Diamond body (foe ${f.hp}, you ${e.hp})`);
}
{
  // hugging a fight room's wall still sets the room off (no sneaking past along the edge)
  const S = createRun({ seed: 11, players: [{ id: "a", body: "fatCat", deck: BODIES.fatCat.suggested }] });
  const e = playerOf(S, "a"), fr = S.floor.rooms.find((r) => r.kind === "fight");
  e.x = fr.x + e.r + 0.001; e.y = fr.y + e.r + 0.001;   // tucked into the corner, as close as walls allow
  step(S, DT);
  ok(S.rooms[fr.id].status === "active", "a body pressed into a room's corner still enters it");
  // and whoever ends up outside a sealed room (a shove, a charge) is put back inside it
  const door = fr.doors[0]; e.x = (door % S.floor.w) + 0.5; e.y = Math.floor(door / S.floor.w) + 0.5;
  step(S, DT);
  ok(e.x > fr.x && e.x < fr.x + fr.w && e.y > fr.y && e.y < fr.y + fr.h, `a hero stuck in a sealed doorway is returned inside (${e.x.toFixed(2)},${e.y.toFixed(2)})`);
}
{
  // a foe standing exactly on its target never casts a zero-direction line that hits the whole map
  const { S, e } = arena("fatCat");
  const f = dummy(S, e.x, e.y, 20); f.deck = ["spear"]; f.qi = 0; f.rest = 0; f.mana = 8; f.regen = 1; f.fx = 0; f.fy = 0;
  const far = dummy(S, e.x - 5, e.y + 3, 20); far.side = "hero"; far.kind = "unit"; far.unit = "rat"; far.life = 99; far.bornAt = 0; far.atkT = 99;
  run(S, 2);
  ok(far.hp === 20, `a stacked foe's Spear doesn't hit a summon across the room (it has ${far.hp})`);
}
{
  // wearing a felled body keeps your wounds
  const { S, e } = arena("fatCat");
  e.hp = e.maxHp - 5;
  S.rewards.a = { room: 1, cards: ["bow"], bodies: ["interestImp"], took: null, wore: null };
  ok(takeCard(S, "a", "bow") && e.deck.includes("bow"), "loot: take a card into the deck");
  ok(wear(S, "a", "interestImp") && e.body === "interestImp" && e.hp === e.maxHp - 5, "wear a felled body: wounds carry");
  closeReward(S, "a");
}

// ---------- full floors, bot pilot ----------
const RUNS = +(process.env.RUNS || 12);
const report = [];
for (const body of Object.keys(BODIES).filter((k) => BODIES[k].starter)) {
  let won = 0, lost = 0, stuck = 0, tSum = 0; const diedIn = {}; let plays = 0;
  for (let i = 0; i < RUNS; i++) {
    const S = createRun({ seed: 1000 + i * 17, players: [{ id: "a", body, deck: BODIES[body].suggested }] });
    const mem = {}; let think = 0, intent = { move: [0, 0], cast: null };
    try {
      while (S.phase === "play" && S.t < 420) {
        if ((think -= DT) <= 0) {
          think = 0.12;     // a human-ish reaction time
          if (S.rewards.a) { const rw = S.rewards.a; if (rw.cards[0]) takeCard(S, "a", rw.cards[0]); closeReward(S, "a"); }
          intent = botThink(S, "a", mem);
          setMove(S, "a", intent.move[0], intent.move[1]);
          if (intent.cast) play(S, "a", intent.cast.slot, intent.cast.aim);
        }
        step(S, DT);
      }
    } catch (err) { fail++; console.log(`  ✗ ${body} seed ${i}: ${err.stack}`); continue; }
    plays += S.stats.plays;
    if (S.phase === "won") { won++; tSum += S.t; }
    else if (S.phase === "lost") { lost++; const at = S.rooms.findIndex((r) => r.status !== "clear"); diedIn[at] = (diedIn[at] ?? 0) + 1; }
    else stuck++;
  }
  ok(stuck === 0, `${body}: no run stalls (${stuck} stalled)`);
  report.push(`${BODIES[body].name.padEnd(14)} won ${won}/${RUNS}  avg clear ${won ? (tSum / won).toFixed(0) : "-"}s  plays/run ${(plays / RUNS).toFixed(0)}  deaths by room ${JSON.stringify(diedIn)}`);
}
console.log(report.join("\n"));
console.log(fail ? `❌ FLICK FAIL — ${fail} failed, ${pass} passed` : `✅ FLICK ALL PASS — ${pass} passed`);
process.exit(fail ? 1 : 0);
