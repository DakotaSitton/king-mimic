// Twin-stick sim suite: bun run test/rt.test.js
// Drives the PURE real-time sim (engine/rt/sim.js) through full runs with a simple bot, plus
// focused checks for the rules the owner stated (3-card hand, auto-target nearest unless tapped,
// foe reticles, moxie economy, mimic body swap).
import {
  createWorld, addPlayer, step, snapshot, flushFx, playCard, setTarget, draftPick, voteDoor,
  rewardPick, restartRun, reportMove, heroTarget, mulberry32, enterRoom, catalog, canPlay,
  PORTED_PLAYER_CARDS, DT, MELEE_REACH, FOE_WINDUP, speedOf,
} from "../engine/rt/sim.js";
import { HAND_SIZE, KIT } from "../game.js";

// The engine's kit/draft rollers use Math.random — seed it so every run of this suite is identical.
Math.random = mulberry32(20261027);
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("  ✗ " + msg); } };

// --- bot: walk toward the target (or away from reticles), play whatever is legal -----------
function botMove(w, p) {
  const t = heroTarget(w, p);
  let vx = 0, vy = 0;
  if (t) { const d = Math.hypot(t.x - p.x, t.y - p.y) || 1; vx = (t.x - p.x) / d; vy = (t.y - p.y) / d; }
  for (const f of w.foes) if (f.cast?.zone?.x != null) {          // dodge: step out of a live reticle
    const z = f.cast.zone, d = Math.hypot(p.x - z.x, p.y - z.y) || 1;
    if (d < (z.r ?? 2) + p.r) { vx = (p.x - z.x) / d; vy = (p.y - z.y) / d; }
  }
  const sp = speedOf(p) * DT;
  reportMove(w, p.id, p.x + vx * sp, p.y + vy * sp, p.forceSeq, DT);
}
function botPlay(w, p) { for (let s = 0; s < HAND_SIZE; s++) if (canPlay(w, p, s).ok) { playCard(w, p.id, s); break; } }

function runOnce(seed, players = 1, maxRooms = 4) {
  const w = createWorld({ rng: mulberry32(seed) });
  const ids = Array.from({ length: players }, (_, i) => "bot" + i);
  for (const id of ids) addPlayer(w, id, id);
  for (const id of ids) draftPick(w, id, 0);
  const seen = { telegraphs: 0, hits: 0, rooms: 0, phases: new Set(), zones: new Set(), errors: 0 };
  for (let t = 0; t < SIMSECONDS * 20 && w.depth < maxRooms; t++) {
    seen.phases.add(w.phase);
    if (w.phase === "doors") for (const id of ids) voteDoor(w, id, 0);
    else if (w.phase === "reward") for (const id of ids) { rewardPick(w, id, "card", 0); rewardPick(w, id, "body", 0); rewardPick(w, id, "done", 0); }
    else if (w.phase === "over") break;
    else if (w.phase === "fight") for (const id of ids) { const p = w.players.get(id); if (!p.dead) { botMove(w, p); botPlay(w, p); } }
    step(w);
    for (const f of w.foes) if (f.cast?.zone) seen.zones.add(f.cast.zone.shape);
    for (const e of w.fx) { if (e.k === "telegraph") seen.telegraphs++; if (e.k === "hit") seen.hits++; }
    const snap = snapshot(w, ids[0]);
    if (!JSON.stringify(snap)) seen.errors++;
    flushFx(w);
  }
  return { w, seen };
}
const SIMSECONDS = 600;

console.log("— lifecycle runs");
for (const [seed, players] of [[1, 1], [2, 1], [3, 2], [4, 3], [5, 1], [6, 2]]) {
  const { w, seen } = runOnce(seed, players);
  ok(seen.phases.has("fight"), `seed ${seed}: reached a fight`);
  ok(seen.telegraphs > 0, `seed ${seed}: foes telegraphed attacks`);
  ok(seen.hits > 0, `seed ${seed}: damage landed`);
  ok(w.depth >= 1 || w.phase === "over", `seed ${seed}: cleared a room or the run ended honestly (depth ${w.depth}, ${w.phase})`);
  ok(seen.errors === 0, `seed ${seed}: snapshots serialise`);
  console.log(`  seed ${seed} ×${players}: depth ${w.depth}, phase ${w.phase}, telegraphs ${seen.telegraphs}, zones ${[...seen.zones].join("/")}`);
}

console.log("— hand + targeting rules");
{
  const w = createWorld({ rng: mulberry32(9) });
  const p = addPlayer(w, "a", "A");
  draftPick(w, "a", 0);
  ok(w.phase === "doors", "solo draft opens the doors");
  ok(w.doors.length === 3 && w.doors.every((d) => d.foes.length >= 1), "three doors, each lists what's inside");
  voteDoor(w, "a", 1);
  ok(w.phase === "fight", "vote enters the room");
  ok(p.hand.length === HAND_SIZE && p.hand.every(Boolean), "three cards shown");
  ok(p.moxie === 0, "moxie opens at 0");
  for (let i = 0; i < 20; i++) step(w);
  ok(Math.floor(p.moxie) === 1, `moxie regenerates 1/sec (got ${p.moxie})`);
  // auto-target = nearest; tapping overrides; a dead tapped foe falls back to nearest
  const foes = w.foes;
  if (foes.length < 2) { const extra = { ...foes[0] }; }
  const near = [...foes].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  ok(heroTarget(w, p) === near, "auto-target is the nearest foe");
  const far = foes.find((f) => f !== near);
  if (far) {
    setTarget(w, "a", far.id);
    ok(heroTarget(w, p) === far, "tapping a foe targets it");
    far.dead = true;
    ok(heroTarget(w, p) === near, "a felled tapped foe falls back to nearest");
    far.dead = false;
  }
  setTarget(w, "a", null);
  // melee needs reach
  p.hand[0] = { id: "cx", key: "oSword" }; p.moxie = 10;
  p.x = 1; p.y = 1; for (const f of w.foes) { f.x = 14; f.y = 8; }
  ok(canPlay(w, p, 0).why === "reach", "melee card out of reach is refused");
  const t = heroTarget(w, p); p.x = t.x - (t.r + p.r + MELEE_REACH * 0.5); p.y = t.y;
  const hp0 = t.hp; const shield0 = t.shield;
  ok(playCard(w, "a", 0).ok, "melee card in reach plays");
  ok(t.hp + t.shield < hp0 + shield0 || t.dead, "Sword damaged the target");
  ok(p.hand[0] && p.hand[0].id !== "cx", "the slot refilled in place");
  ok(p.disc.some((c) => c.id === "cx"), "played card went to the discard");
}

console.log("— foe reticle is dodgeable");
{
  const w = createWorld({ rng: mulberry32(11) });
  const p = addPlayer(w, "a", "A"); draftPick(w, "a", 0);
  const door = { id: "dx", foes: [{ bodyKey: "fatCat", kit: ["oFire"] }] };
  enterRoom(w, door);
  const f = w.foes[0]; f.moxie = 10; p.x = 4; p.y = 4.5; f.x = 10; f.y = 4.5;
  step(w);
  ok(f.cast && f.cast.zone.shape === "circle", "ranged foe plants a circle reticle on the player");
  const hp0 = p.hp;
  // dodge: move out of the zone over the windup
  for (let i = 0; i < FOE_WINDUP * 20 + 2; i++) { reportMove(w, "a", p.x, p.y - speedOf(p) * DT, p.forceSeq, DT); step(w); }
  ok(p.hp === hp0, `dodged the reticle (hp ${p.hp}/${hp0})`);
  // stand still: get hit
  f.moxie = 10; step(w);
  for (let i = 0; i < FOE_WINDUP * 20 + 2; i++) step(w);
  ok(p.hp < hp0, "standing in the reticle gets hit");
}

console.log("— the mimic: wear a felled body");
{
  const w = createWorld({ rng: mulberry32(12) });
  const p = addPlayer(w, "a", "A"); draftPick(w, "a", 0);
  enterRoom(w, { id: "dx", foes: [{ bodyKey: "tollTroll", kit: ["oSword"] }] });
  w.foes[0].hp = 1;
  p.hand[0] = { id: "cz", key: "oFire" }; p.moxie = 10;
  ok(playCard(w, "a", 0).ok && w.phase === "reward", "felling the last foe opens the reward");
  ok(p.reward.bodies.includes("tollTroll"), "the felled body is offered");
  const deck0 = p.deckList.length;
  rewardPick(w, "a", "card", 0); rewardPick(w, "a", "body", 0); rewardPick(w, "a", "done", 0);
  ok(p.bodyKey === "tollTroll", "wearing the felled body");
  ok(p.deckList.length === deck0 + 1, "took one of its cards");
  ok(w.phase === "doors", "back to the doors");
}

console.log("— co-op door vote + late joiner + restart");
{
  const w = createWorld({ rng: mulberry32(13) });
  addPlayer(w, "a", "A"); addPlayer(w, "b", "B");
  draftPick(w, "a", 0);
  ok(w.phase === "draft", "draft waits for everyone");
  draftPick(w, "b", 1);
  ok(w.phase === "doors", "both drafted → doors");
  voteDoor(w, "a", 2);
  ok(w.phase === "doors", "one vote is not enough");
  voteDoor(w, "b", 2);
  ok(w.phase === "fight", "unanimous vote enters");
  const c = addPlayer(w, "c", "C"); draftPick(w, "c", 0);
  ok(c.waitNext && !snapshot(w, "a").heroes.some((h) => h.id === "c"), "late joiner sits out the current fight");
  for (const p of w.players.values()) { p.hp = 0; p.dead = true; }
  step(w);
  ok(w.phase === "over", "all heroes down → run over");
  restartRun(w);
  ok(w.phase === "draft" && [...w.players.values()].every((p) => !p.picked && p.offers.length === 3), "restart re-drafts");
}

console.log("— review regressions (2026-10-27)");
{
  // a player who joins mid-fight is offered a draft at once and enters at the next door
  const w = createWorld({ rng: mulberry32(21) });
  addPlayer(w, "a", "A"); draftPick(w, "a", 0); voteDoor(w, "a", 0);
  addPlayer(w, "late", "L");
  const snap = snapshot(w, "late");
  ok(snap.offers?.length === 3, "late joiner sees draft offers during a fight");
  ok(draftPick(w, "late", 0) && w.players.get("late").waitNext, "late joiner drafts and waits");
  for (const f of w.foes) { f.hp = 0; f.dead = true; }
  step(w);
  ok(w.phase === "reward", "room cleared");
  rewardPick(w, "a", "done", 0);
  ok(w.phase === "doors", "a benched late joiner (no reward) does not block the party");
  voteDoor(w, "a", 0); voteDoor(w, "late", 0);
  ok(w.phase === "fight" && w.foes.length && snapshot(w, "a").heroes.some((h) => h.id === "late"), "late joiner fights in the next room");
}
{
  // a player whose phone dropped while down is revived/rewarded with the party and never deadlocks it
  const w = createWorld({ rng: mulberry32(22) });
  addPlayer(w, "a", "A"); addPlayer(w, "b", "B"); draftPick(w, "a", 0); draftPick(w, "b", 0);
  voteDoor(w, "a", 0); voteDoor(w, "b", 0);
  const b = w.players.get("b"); b.hp = 0; b.dead = true; b.connected = false;
  for (const f of w.foes) { f.hp = 0; f.dead = true; }
  step(w);
  ok(w.phase === "reward" && b.reward && !b.dead && b.hp > 0, "disconnected downed player revived and given a reward");
  b.connected = true;
  rewardPick(w, "a", "done", 0); rewardPick(w, "b", "done", 0);
  ok(w.phase === "doors", "reconnected player can finish the reward");
}
{
  // overflow: excess damage spills into the nearest foe behind
  const w = createWorld({ rng: mulberry32(23) });
  const p = addPlayer(w, "a", "A"); draftPick(w, "a", 0);
  enterRoom(w, { id: "dx", foes: [{ bodyKey: "fatCat", kit: ["oSword"] }, { bodyKey: "fatCat", kit: ["oSword"] }] });
  const [f1, f2] = w.foes; f1.x = 8; f1.y = 4; f2.x = 9.1; f2.y = 4; f1.hp = 1; p.x = 3; p.y = 4;
  setTarget(w, "a", f1.id);
  p.hand[0] = { id: "cq", key: "oAstralFist" }; p.moxie = 10;
  const hp2 = f2.hp;
  playCard(w, "a", 0);
  ok(f1.dead && f2.hp < hp2, `Astral Fist overflow spills (${hp2} → ${f2.hp})`);
}
{
  // a burst of move messages cannot outrun the speed stat
  const w = createWorld({ rng: mulberry32(24) });
  const p = addPlayer(w, "a", "A"); draftPick(w, "a", 0); voteDoor(w, "a", 0);
  step(w); const x0 = p.x;
  for (let i = 0; i < 30; i++) reportMove(w, "a", p.x + 1, p.y, p.forceSeq);
  ok(p.x - x0 <= speedOf(p) * 0.5 + 0.1, `burst movement capped (${(p.x - x0).toFixed(2)})`);
}

console.log("— catalog");
{
  const cat = catalog();
  ok(Object.keys(cat.cards).length === PORTED_PLAYER_CARDS.length && PORTED_PLAYER_CARDS.length > 40, `ported card slice (${PORTED_PLAYER_CARDS.length})`);
  ok(Object.values(cat.cards).every((c) => c.name && !/^[od][A-Z]/.test(c.name)), "catalog carries display names");
  ok(cat.bodies.rookie?.name === "Rookie Mimic", "starter body named");
  ok(PORTED_PLAYER_CARDS.every((k) => KIT[k]), "every ported card exists in the kit");
}

console.log(fail ? `❌ ${fail} failed, ${pass} passed` : `✅ RT ALL PASS — ${pass} passed`);
process.exit(fail ? 1 : 0);
