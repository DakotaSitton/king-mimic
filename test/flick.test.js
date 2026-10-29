// FLICK mode — deterministic engine checks + full-floor bot runs (solo per body, and co-op parties).
//   bun run test/flick.test.js            (RUNS=n per body, default 12)
import { CARDS, BODIES, TUNING, ENCOUNTERS, GEM_STATS } from "../engine/flick/content.js";
const SAP = GEM_STATS.sapphire, RUBY = GEM_STATS.ruby;
import { makeFloor } from "../engine/flick/floor.js";
import {
  createRun, step, play, setMove, playerOf, shapeOf, hitsOf, cardVals, bodyStats, takeCard, wear, cardCost,
  closeReward, rngFrom, DT, damage, joinRun, setAway, removePlayer, netMove, solidAt, nextCardOf,
} from "../engine/flick/sim.js";
import { botThink } from "../engine/flick/bot.js";
import { initFor, snapFor, mirrorFrom, applySnap } from "../engine/flick/net.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("  ✗ " + m); } };
const P = (id, body = "fatCat", deck = BODIES[body].suggested) => ({ id, body, deck });

// ---------- floors ----------
for (let seed = 1; seed <= 300; seed++) {
  const f = makeFloor(rngFrom(seed));
  ok(f.rooms.length === 6 && f.rooms[0].kind === "start" && f.rooms[5].kind === "boss", `seed ${seed}: 6 rooms start…boss`);
  ok(f.rooms.filter((r) => r.kind === "fight").every((r) => r.w >= 12 && r.h >= 9), `seed ${seed}: fight rooms are the bigger size`);
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
  const S = createRun({ seed: 7, players: [P("a", body, deck)] });
  const e = playerOf(S, "a");
  S.ents = S.ents.filter((x) => x.kind === "player");   // drop every foe; we place our own
  for (const rs of S.rooms) rs.status = "clear";         // no room logic in the way
  const r = S.floor.rooms.find((x) => x.kind === "boss");
  e.x = r.x + 3; e.y = r.cy;
  return { S, e, r };
}
function dummy(S, x, y, hp = 50) {
  const d = { id: S.nextId++, side: "foe", kind: "foe", body: "wearyWageslave", gem: "ruby", awake: true, x, y, r: TUNING.radius,
    hp, maxHp: hp, mana: 20, maxMana: 20, level: 1, shield: 0, speed: 0, mx: 0, my: 0, fx: 1, fy: 0, cast: null, dash: null,
    slowUntil: 0, slowPct: 0, dead: false, deck: ["dagger"], spent: [], qi: 0, rest: 99, hand: [], draw: [], discard: [], room: 99,
    strafe: 1, strafeT: 0 };
  S.ents.push(d); return d;
}
const run = (S, sec) => { for (let i = 0; i < Math.round(sec / DT); i++) step(S, DT); };
{
  const { S, e } = arena();
  const front = dummy(S, e.x + 1.2, e.y), behind = dummy(S, e.x - 1.2, e.y);
  e.hand = ["sword", "spear", "bow"];
  const h = hitsOf(S, e, shapeOf(S, e, "sword", { dx: 1, dy: 0 })).foes.map((f) => f.id);
  ok(h.includes(front.id) && !h.includes(behind.id), "sword arc hits in front, not behind");
  ok(cardVals(e, "sword").dmg === 4, "Ruby body: Sword +1 damage (3→4)");
  const m0 = e.mana;
  ok(play(S, "a", 0, { dx: 1, dy: 0 }).ok && e.mana === m0, "a weapon is free — just its ramp-up");
  ok(!play(S, "a", 1, { dx: 1, dy: 0 }).ok, "one card at a time: busy while it ramps up");
  run(S, CARDS.sword.windup + 0.05);
  ok(front.hp === 46 && behind.hp === 50, `sword landed for 4 after its ramp-up (front ${front.hp})`);
  ok(e.discard.includes("sword") && !e.spent.includes("sword"), "a weapon is reusable: back into the deck");
}
{
  // one use vs reusable, and Struggle when everything is spent
  const { S, e } = arena("lizardWizard", ["blizzard", "earthquake", "summonEfreeti"]);
  ok(e.hand.length === 3 && e.draw.length === 0, "three one-use cards: all in hand");
  for (let i = 0; i < 3; i++) { play(S, "a", i, { dx: 1, dy: 0, dist: 2 }); run(S, 2); }
  ok(e.spent.length === 3 && e.discard.length === 0, `one-use cards are spent, never reshuffled (${e.spent.join(",")})`);
  ok(e.hand.every((k) => k === "struggle"), `out of cards → Struggle (${e.hand.join(",")})`);
  ok(play(S, "a", 0, { dx: 1, dy: 0 }).ok, "Struggle can always be played");
  run(S, 1);
  ok(e.hand[0] === "struggle" && e.spent.length === 3, "Struggle never enters the deck or the spent pile");
  ok(!CARDS.holyLight.once && !CARDS.sunbeam.once && !CARDS.holyLance.once && CARDS.holyLight.cost > 0, "heals are reusable now, paid with mana");
  ok(["summonEfreeti", "blizzard", "earthquake", "manaVial"].every((k) => CARDS[k].once), "a few big cards stay one use");
  ok(Object.values(CARDS).filter((c) => c.type === "weapon").every((c) => !c.once && !c.cost), "weapons are free and reusable");
}
{
  // mana is a pool like health: spells spend it, nothing refills it over time, a Mana Vial does
  const { S, e } = arena("lizardWizard", ["lightningBolt", "lightningBolt", "manaVial", "dagger", "dagger", "dagger", "dagger", "dagger"]);
  e.hand = ["lightningBolt", "manaVial", "dagger"]; e.draw = ["dagger", "dagger"]; e.discard = [];
  const m0 = e.mana;
  play(S, "a", 0, { dx: 1, dy: 0 }); run(S, 3);
  ok(e.mana === m0 - cardCost(e, "lightningBolt") && cardCost(e, "lightningBolt") === CARDS.lightningBolt.cost - 1, `a spell spends mana (Lizard Wizard pays 1 less): ${m0} → ${e.mana}`);
  run(S, 10);
  ok(e.mana === m0 - 2, "mana does not come back on its own");
  e.mana = 0;
  e.hand = ["lightningBolt", "manaVial", "dagger"];
  const r = play(S, "a", 0, { dx: 1, dy: 0 });
  ok(r.ok && r.fizzled && e.discard.includes("lightningBolt") && e.mana === 0, "a spell flicked without the mana fizzles back into the deck");
  run(S, 1);
  play(S, "a", 1, { dx: 1, dy: 0 }); run(S, 1);
  ok(e.mana === CARDS.manaVial.mana + CARDS.manaVial.bonus.mana && e.spent.includes("manaVial"), `a Mana Vial refills (Sapphire +2) and is spent (${e.mana})`);
}
{
  // levels: everyone gains health + mana; Ruby gains more health, Sapphire more mana
  const fc1 = bodyStats("fatCat", false, 1), fc3 = bodyStats("fatCat", false, 3);
  const lw1 = bodyStats("lizardWizard", false, 1), lw3 = bodyStats("lizardWizard", false, 3), rr3 = bodyStats("royalRat", false, 3);
  ok(fc1.maxHp === 20 + RUBY.hp && fc3.maxHp === fc1.maxHp + 2 * (TUNING.hpPerLevel + RUBY.hpPerLevel), `Ruby: more health, and more again each level (L3 ${fc3.maxHp})`);
  ok(lw1.maxMana === TUNING.mana + SAP.mana && lw3.maxMana === lw1.maxMana + 2 * (TUNING.manaPerLevel + SAP.manaPerLevel), `Sapphire: more mana, and more again each level (L3 ${lw3.maxMana})`);
  ok(rr3.maxHp === 20 + 2 * TUNING.hpPerLevel && rr3.maxMana === TUNING.mana + 2 * TUNING.manaPerLevel, "everyone else gains the innate amounts");
  const S = createRun({ seed: 31, players: [P("a"), P("b", "lizardWizard")] });
  const a = playerOf(S, "a"), b = playerOf(S, "b"), hp0 = a.hp, mana0 = b.mana;
  const f = S.ents.find((o) => o.kind === "foe" && !BODIES[o.body].boss);
  f.level = TUNING.levelXp[1]; damage(S, f, 999, a);
  ok(S.level === 2 && a.level === 2 && b.level === 2, "felled foes give XP; the whole party levels together");
  ok(a.hp === hp0 + TUNING.hpPerLevel + RUBY.hpPerLevel && b.mana === mana0 + TUNING.manaPerLevel + SAP.manaPerLevel, "a level-up raises max and current health/mana");
  const c = joinRun(S, P("c", "royalRat"));
  ok(c.level === 2 && c.maxHp === bodyStats("royalRat", false, 2).maxHp, "a mid-run joiner arrives at the party's level");
  ok(S.ents.filter((o) => o.kind === "foe" && o.room === S.rooms.find((r) => r.kind === "boss").id)[0].level === TUNING.bossLevel, "the boss has its level");
}
{
  // foes pay mana too: they skip spells they can't afford, drink a vial when low, then struggle
  const { S, e } = arena("fatCat");
  const f = dummy(S, e.x + 3, e.y, 40); f.body = "interestImp"; f.deck = ["fireball", "manaVial"]; f.qi = 0; f.mana = 0; f.maxMana = 10; f.rest = 0;
  ok(nextCardOf(f) === "manaVial", "a foe with no mana skips its Fireball");
  run(S, 1.5);
  ok(f.spent.includes("manaVial") && f.mana > 0, `…and drinks its Mana Vial when low (mana ${f.mana})`);
  f.deck = ["fireball"]; f.mana = 0;
  ok(nextCardOf(f) === "struggle", "no mana and nothing free left → Struggle");
}
{
  const { S, e } = arena("royalRat");
  const onLine = dummy(S, e.x + 2.5, e.y), offLine = dummy(S, e.x + 2.5, e.y + 1.0);
  const h = hitsOf(S, e, shapeOf(S, e, "spear", { dx: 1, dy: 0 })).foes.map((f) => f.id);
  ok(h.includes(onLine.id) && !h.includes(offLine.id), "spear is a thin line");
}
{
  const { S, e } = arena("lizardWizard");
  const near = dummy(S, e.x + 2, e.y); dummy(S, e.x + 4, e.y);
  const h = hitsOf(S, e, shapeOf(S, e, "bow", { dx: 1, dy: 0 })).foes.map((f) => f.id);
  ok(h.length === 1 && h[0] === near.id, "bow hits only the first foe");
  ok(cardCost(e, "fireball") === CARDS.fireball.cost - 1 && cardCost(e, "arcaneOrb") === 1 && cardCost(e, "bow") === 0,
    "Lizard Wizard: spells cost 1 less (never below 1); weapons are free");
  const fb = shapeOf(S, e, "fireball", { dx: 1, dy: 0, dist: 4 });
  ok(Math.abs(fb.x - (e.x + 4)) < 0.01, "fireball lands where it's aimed");
  const fbFar = shapeOf(S, e, "fireball", { dx: 1, dy: 0, dist: 40 });
  ok(Math.hypot(fbFar.x - e.x, fbFar.y - e.y) <= CARDS.fireball.shape.range + 1e-6, "fireball clamps to its range");
}
{
  const r = bodyStats("fatCat", false), em = bodyStats("royalRat", false), di = bodyStats("auditAngel", false), sa = bodyStats("lizardWizard", false);
  ok(r.maxHp === 26 && em.maxHp === 20, "Ruby +6 HP");
  ok(em.speed > r.speed && Math.abs(em.speed / r.speed - 1.2) < 1e-9, "Emerald +20% speed");
  ok(sa.maxMana === TUNING.mana + SAP.mana && r.maxMana === TUNING.mana, "Sapphire +mana");
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
  const { S, e } = arena("fatCat");
  damage(S, e, 1, { side: "foe" }); damage(S, e, 1, { side: "foe" });
  ok(S.ents.filter((x) => x.unit === "rat").length === 1, "Fat Cat: hit → one rat (cooldown stops a second)");
  run(S, TUNING.fatCatCooldown + 0.1); damage(S, e, 1, { side: "foe" });
  ok(S.ents.filter((x) => x.unit === "rat" && !x.dead).length === 2, "Fat Cat: after the cooldown, another rat");
}
{
  // foe telegraph: standing still in the reticle gets hit, stepping out doesn't
  const mk = () => { const a = arena("auditAngel"); const f = dummy(a.S, a.e.x + 1.2, a.e.y); f.deck = ["sword"]; f.qi = 0; f.rest = 0; return { ...a, f }; };
  const A = mk(); run(A.S, 0.1);
  ok(!!A.f.cast, "foe winds up a card (reticle live)");
  const hp0 = A.e.hp; run(A.S, 1.3);
  ok(A.e.hp < hp0, "standing in the reticle → hit");
  const B = mk(); run(B.S, 0.1);
  setMove(B.S, "a", -1, 0); run(B.S, 1.3);
  ok(B.e.hp === B.e.maxHp, "walking out of the reticle → dodged");
}
{
  // a foe spends its one-use cards too (parity) and falls back to Struggle
  const { S, e } = arena("fatCat");
  const f = dummy(S, e.x + 3, e.y, 40); f.deck = ["blizzard", "sword"]; f.qi = 0; f.rest = 0; f.body = "interestImp";
  run(S, 3);
  ok(f.spent.includes("blizzard") && !f.deck.includes("blizzard"), `a foe's Blizzard is spent after one cast (deck ${f.deck})`);
  f.deck = []; f.rest = 0; f.cast = null;
  e.x = f.x - 1; run(S, 0.1);
  ok(f.cast?.key === "struggle", "a foe with nothing left struggles");
}
{
  // Sunbeam heals allies and hurts foes over time; Diamond adds +1 per tick
  const { S, e } = arena("auditAngel", ["sunbeam", "sunbeam", "sunbeam", "dagger", "dagger", "dagger", "dagger", "dagger"]);
  const f = dummy(S, e.x + 3, e.y, 40); e.hp = 6;
  e.hand = ["sunbeam", "dagger", "dagger"];
  play(S, "a", 0, { dx: 1, dy: 0, dist: 1.5 });
  run(S, 8);
  const lost = 40 - f.hp, got = e.hp - 6;
  ok(lost >= 12 && lost <= 18 && lost % 3 === 0 && got >= 8, `sunbeam ticks 3 dmg / 2 heal on a Diamond body (foe −${lost}, you +${got})`);
}
{
  const { S, e } = arena("fatCat");
  e.hp = e.maxHp - 5;
  S.rewards.a = { room: 1, cards: ["bow"], bodies: ["interestImp"], took: null, wore: null };
  ok(takeCard(S, "a", "bow") && e.deck.includes("bow"), "loot: take a card into the deck");
  ok(wear(S, "a", "interestImp") && e.body === "interestImp" && e.hp === e.maxHp - 5, "wear a felled body: wounds carry");
  closeReward(S, "a");
}
{
  // walls, sealed rooms, stacked foes
  const S = createRun({ seed: 11, players: [P("a")] });
  const e = playerOf(S, "a"), fr = S.floor.rooms.find((r) => r.kind === "fight");
  e.x = fr.x + e.r + 0.001; e.y = fr.y + e.r + 0.001;
  step(S, DT);
  ok(S.rooms[fr.id].status === "active", "a body pressed into a room's corner still enters it");
  const door = fr.doors[0]; e.x = (door % S.floor.w) + 0.5; e.y = Math.floor(door / S.floor.w) + 0.5;
  step(S, DT);
  ok(e.x > fr.x && e.x < fr.x + fr.w && e.y > fr.y && e.y < fr.y + fr.h, "a hero stuck in a sealed doorway is returned inside");
}
{
  const { S, e } = arena("fatCat");
  const f = dummy(S, e.x, e.y, 20); f.deck = ["spear"]; f.qi = 0; f.rest = 0; f.fx = 0; f.fy = 0;
  const far = dummy(S, e.x - 5, e.y + 3, 20); far.side = "hero"; far.kind = "unit"; far.unit = "rat"; far.life = 99; far.bornAt = 0; far.atkT = 99;
  run(S, 2);
  ok(far.hp === 20, `a stacked foe's Spear doesn't hit a summon across the room (it has ${far.hp})`);
}

// ---------- co-op ----------
{
  const S = createRun({ seed: 21, players: [P("a"), P("b", "lizardWizard")] });
  const a = playerOf(S, "a"), b = playerOf(S, "b");
  ok(a.color !== b.color && Math.hypot(a.x - b.x, a.y - b.y) < 3, "two players start side by side, different colours");
  a.x += 6; step(S, DT);
  const c = joinRun(S, P("c", "royalRat"));
  ok(c && Math.hypot(c.x - a.x, c.y - a.y) < 1.5, "a mid-run joiner appears beside a standing friend");
  ok(joinRun(S, P("d")) && !joinRun(S, P("e")), "four players max");
  // party scaling when a room wakes
  const fr = S.floor.rooms.find((r) => r.kind === "fight"), rs = S.rooms[fr.id];
  const base = rs.foes.length, hp0 = S.ents.find((o) => o.id === rs.foes[0]).maxHp;
  for (const p of S.ents.filter((o) => o.kind === "player")) { p.x = fr.cx; p.y = fr.cy; }
  step(S, DT);
  ok(rs.status === "active" && rs.foes.length === base + 3, `4 players: the room adds 3 extra foes (${base}→${rs.foes.length})`);
  ok(S.ents.find((o) => o.id === rs.foes[0]).maxHp === Math.round(hp0 * (1 + 3 * TUNING.coopFoeHp)), "4 players: room foes get tougher");
}
{
  // downed, revived by a friend; everyone down = lost
  const S = createRun({ seed: 22, players: [P("a"), P("b")] });
  for (const rs of S.rooms) rs.status = "clear";
  S.ents = S.ents.filter((o) => o.kind === "player");
  const a = playerOf(S, "a"), b = playerOf(S, "b");
  damage(S, a, 999, { side: "foe" });
  ok(a.dead && S.phase === "play", "one player down: the run goes on");
  ok(!play(S, "a", 0, { dx: 1, dy: 0 }).ok, "a downed player can't play cards");
  b.x = a.x + 0.8; b.y = a.y;
  run(S, TUNING.reviveTime + 0.2);
  ok(!a.dead && a.hp === Math.ceil(a.maxHp * TUNING.reviveHp), `standing beside them revives them (hp ${a.hp})`);
  damage(S, a, 999, { side: "foe" }); damage(S, b, 999, { side: "foe" });
  ok(S.phase === "lost", "everyone down at once = the run is lost");
}
{
  // a friend who just dropped (still standing) holds the run open through the grace period; once
  // they're removed for good, a party that's all down has lost
  const S = createRun({ seed: 23, players: [P("a"), P("b")] });
  const a = playerOf(S, "a");
  setAway(S, "b", true);
  damage(S, a, 999, { side: "foe" });
  ok(S.phase === "play", "a phone blip by the last one standing doesn't end the run");
  removePlayer(S, "b");
  ok(S.phase === "lost", "…but once they're dropped, everyone left is down → lost");
}
{
  // a wipe and a room clear in the same step: the wipe stands
  const S = createRun({ seed: 27, players: [P("a")] });
  const a = playerOf(S, "a"), fr = S.floor.rooms.find((r) => r.kind === "fight"), rs = S.rooms[fr.id];
  a.x = fr.cx; a.y = fr.cy; step(S, DT);
  for (const id of rs.foes) { const f = S.ents.find((o) => o.id === id); if (f) damage(S, f, 999, a); }
  damage(S, a, 999, { side: "foe" });
  step(S, DT);
  ok(S.phase === "lost" && rs.status === "active" && a.dead, "a same-step wipe isn't undone by the room clearing");
}
{
  // clearing a room stands the downed back up
  const S = createRun({ seed: 24, players: [P("a"), P("b")] });
  const a = playerOf(S, "a"), b = playerOf(S, "b");
  const fr = S.floor.rooms.find((r) => r.kind === "fight"), rs = S.rooms[fr.id];
  a.x = b.x = fr.cx; a.y = b.y = fr.cy; step(S, DT);
  damage(S, b, 999, { side: "foe" });
  for (const id of rs.foes) { const f = S.ents.find((o) => o.id === id); if (f) damage(S, f, 999, a); }
  step(S, DT);
  ok(rs.status === "clear" && !b.dead, "room cleared → downed friends get back up");
}
{
  // attack turns: a crowded room never has more than (tokens + party) non-swarm foes winding up
  const S = createRun({ seed: 25, players: [P("a", "fatCat")] });
  const fr = S.floor.rooms.find((r) => r.kind === "fight"), rs = S.rooms[fr.id];
  const a = playerOf(S, "a"); a.x = fr.cx; a.y = fr.cy; a.hp = a.maxHp = 9999;
  step(S, DT);
  let worst = 0;
  for (let i = 0; i < 60 * 15; i++) {
    step(S, DT);
    const n = S.ents.filter((o) => o.kind === "foe" && !o.dead && o.cast && !["swarm", "boss"].includes(BODIES[o.body].role)).length;
    worst = Math.max(worst, n);
  }
  ok(worst <= TUNING.foeTokens + 1 && worst >= 1, `solo: at most ${TUNING.foeTokens + 1} foes wind up at once (saw ${worst})`);
}
{
  // the co-op server's movement check: honest walking passes, teleports and walls don't
  const S = createRun({ seed: 26, players: [P("a")] });
  const a = playerOf(S, "a"), x0 = a.x, y0 = a.y;
  step(S, 0.05); netMove(S, "a", { x: x0 + 0.1, y: y0, mx: 1, my: 0 });
  ok(Math.abs(a.x - (x0 + 0.1)) < 1e-6 && a.forceSeq === 0, "an honest step is taken as-is");
  step(S, 0.05); netMove(S, "a", { x: a.x + 8, y: a.y, mx: 1, my: 0 });
  ok(a.x < x0 + 2.3 && a.forceSeq === 1, `a teleport is clamped and the phone is snapped back (x+${(a.x - x0).toFixed(2)})`);
  // a burst of reports in one tick can't add up to more than the walking allowance
  const bx = a.x;
  for (let i = 0; i < 50; i++) netMove(S, "a", { x: a.x + 0.2, y: a.y, mx: 1, my: 0, fs: a.forceSeq });
  ok(a.x - bx < 0.2, `fifty reports in one tick move almost nothing (+${(a.x - bx).toFixed(2)})`);
  // a report sent before a snap-back is ignored
  const sx0 = a.x; netMove(S, "a", { x: a.x - 0.1, y: a.y, fs: a.forceSeq - 1 });
  ok(a.x === sx0, "a stale report (old forceSeq) is ignored");
  for (let i = 0; i < 40; i++) { step(S, 0.05); netMove(S, "a", { x: a.x, y: a.y - 0.35, mx: 0, my: -1 }); }
  ok(!solidAt(S, Math.floor(a.x), Math.floor(a.y)), "walking into a wall never ends inside it");
  // junk never throws
  let threw = false;
  try { netMove(S, "a", { x: "1", y: {} }); netMove(S, "a", null); play(S, "a", 99, null); play(S, "a", 0, { dx: NaN, dy: Infinity }); } catch { threw = true; }
  ok(!threw, "junk moves and plays are ignored, never thrown on");
}

// ---------- the co-op wire: what a phone rebuilds from the server's messages ----------
{
  const S = createRun({ seed: 41, players: [P("seatA"), P("seatB", "lizardWizard")] });
  run(S, 0.5);
  const init = initFor(S, "seatA"), cur = { fxN: 0, seen: new Uint8Array(S.seen) };
  const snap = JSON.parse(JSON.stringify(snapFor(S, "seatA", cur)));
  const M = mirrorFrom(JSON.parse(JSON.stringify(init)));
  applySnap(M, snap, init.you, 0);
  const meM = playerOf(M, init.you), real = playerOf(S, "seatA");
  ok(meM && ["body", "gem", "color", "level", "mana", "maxMana", "hp", "maxHp", "hand", "name"].every((k) => meM[k] !== undefined),
    `the phone's own player arrives with everything the HUD reads (${meM ? Object.keys(meM).length : 0} fields)`);
  ok(meM.body === real.body && meM.hand.join() === real.hand.join() && meM.level === real.level, "…and matches the server's copy");
  ok(!JSON.stringify(snap).includes("seatA") && !JSON.stringify(snap).includes("seatB") && init.you !== "seatA", "no seat id ever goes on the wire");
  ok(M.floor.tiles.length === S.floor.tiles.length && M.floor.tiles.every((t, i) => t === S.floor.tiles[i]), "the floor arrives intact");
  ok(M.ents.filter((e) => e.kind === "player").every((e) => e.body && e.color), "every friend arrives with a body and a colour");
}

// ---------- full floors, bot pilots ----------
const RUNS = +(process.env.RUNS || 12);
const report = [];
function floorRun(seed, party) {
  const S = createRun({ seed, players: party.map((b, i) => P("p" + i, b)) });
  const mems = party.map(() => ({})); let think = 0;
  while (S.phase === "play" && S.t < 600) {
    if ((think -= DT) <= 0) {
      think = 0.12;
      party.forEach((_, i) => {
        const pid = "p" + i;
        if (S.rewards[pid]) { const rw = S.rewards[pid]; if (rw.cards[0]) takeCard(S, pid, rw.cards[0]); closeReward(S, pid); }
        const it = botThink(S, pid, mems[i]);
        setMove(S, pid, it.move[0], it.move[1]);
        if (it.cast) play(S, pid, it.cast.slot, it.cast.aim);
      });
    }
    step(S, DT);
  }
  return S;
}
for (const body of Object.keys(BODIES).filter((k) => BODIES[k].starter)) {
  let won = 0, stuck = 0, tSum = 0; const diedIn = {};
  for (let i = 0; i < RUNS; i++) {
    let S;
    try { S = floorRun(1000 + i * 17, [body]); } catch (err) { fail++; console.log(`  ✗ ${body} seed ${i}: ${err.stack}`); continue; }
    if (S.phase === "won") { won++; tSum += S.t; }
    else if (S.phase === "lost") { const at = S.rooms.findIndex((r) => r.status !== "clear"); diedIn[at] = (diedIn[at] ?? 0) + 1; }
    else stuck++;
  }
  ok(stuck === 0, `${body}: no run stalls (${stuck} stalled)`);
  report.push(`${BODIES[body].name.padEnd(14)} won ${won}/${RUNS}  avg clear ${won ? (tSum / won).toFixed(0) : "-"}s  died in room ${JSON.stringify(diedIn)}`);
}
for (const party of [["fatCat", "lizardWizard"], ["fatCat", "royalRat", "lizardWizard", "auditAngel"]]) {
  let won = 0, stuck = 0, revives = 0, tSum = 0;
  const n = Math.max(4, RUNS / 2);
  for (let i = 0; i < n; i++) {
    let S;
    try { S = floorRun(3000 + i * 13, party); } catch (err) { fail++; console.log(`  ✗ party ${party.length} seed ${i}: ${err.stack}`); continue; }
    if (S.phase === "won") { won++; tSum += S.t; } else if (S.phase !== "lost") stuck++;
    revives += S.stats.revives;
  }
  ok(stuck === 0, `${party.length} players: no run stalls (${stuck} stalled)`);
  report.push(`party of ${party.length}      won ${won}/${n}  avg clear ${won ? (tSum / won).toFixed(0) : "-"}s  revives/run ${(revives / n).toFixed(1)}`);
}
console.log(report.join("\n"));
console.log(fail ? `❌ FLICK FAIL — ${fail} failed, ${pass} passed` : `✅ FLICK ALL PASS — ${pass} passed`);
process.exit(fail ? 1 : 0);
