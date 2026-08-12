import * as G from "../game.js";

let pass = 0, fail = 0;
const ok = (value, label) => {
  if (value) pass++;
  else { fail++; console.error("FAIL", label); }
};
const eq = (actual, expected, label) =>
  ok(JSON.stringify(actual) === JSON.stringify(expected),
    `${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

G.setHpMult(1);
G.setCdMult(1);

function rig(keys = [], lanes = 1) {
  const room = G.newRoom("GRAPHICS");
  const player = G.addPlayer(room, "p", "Graphic Probe");
  G.wearBody(player, "rookie");
  player.lane = 0;
  player.depth = 0;
  player.maxHp = player.hp = 999;
  player.autoFire = false;
  player.cards = G.mintCards(keys);
  player.hand = [...player.cards];
  player.deck = [];
  player.moxie = 999;
  room.phase = "playing";
  room.laneCount = lanes;
  room.allies = Array.from({ length: lanes }, () => []);
  room.lanes = Array.from({ length: lanes }, () => []);
  room.caravan = { hp: 999, max: 999 };
  return { room, player };
}

function foe(room, lane, key = "rookie") {
  const enemy = G.spawnEnemy(key, []);
  enemy.id = `${key}-${lane}-${room.lanes[lane].length}`;
  enemy.hp = enemy.maxHp = 999;
  enemy.queue = [];
  enemy.lane = lane;
  room.lanes[lane].push(enemy);
  return enemy;
}

function play(room, player, key) {
  const card = player.hand.find((candidate) => candidate.key === key);
  ok(!!card && G.playCard(room, player, card.id), `${key} casts in graphics rig`);
  return (room.castFx ?? []).filter((event) => event.kind === "path" && event.cardKey === key);
}

{
  const { room, player } = rig(["oSword"]);
  const target = foe(room, 0);
  const paths = play(room, player, "oSword");
  const fx = paths.findLast((event) => event.op === "deal");
  ok(fx?.shape === "single" && fx.overlay === "sword"
    && fx.sourceId === player.id && fx.targetId === target.id,
    "single-target card carries its real source and target");
  ok(!room.castFx.some((event) => event.kind === "sword"),
    "authored overlay rides the path event without a second network event");
}

{
  const { room, player } = rig(["oSpear"]);
  const front = foe(room, 0, "rookie"), back = foe(room, 0, "ratKing");
  const fx = play(room, player, "oSpear").findLast((event) => event.op === "deal");
  eq(fx?.targets?.map((target) => target.id), [front.id, back.id],
    "Spear path preserves front-to-back hit order");
  eq(fx?.shape, "line", "Spear uses ordered line travel");
}

{
  const { room, player } = rig(["oLightning"], 2);
  const first = foe(room, 1, "rookie"), second = foe(room, 1, "ratKing");
  player.targetId = first.id;
  const fx = play(room, player, "oLightning").findLast((event) => event.kind === "path");
  ok(fx?.shape === "lane" && fx.lane === 1
    && fx.targets.some((target) => target.id === first.id)
    && fx.targets.some((target) => target.id === second.id),
  "lane card carries the aimed lane and every affected body");
}

{
  // OWNER 2026-07-26 ("Change black hole to just effect its lane"): Black Hole was the only live
  // `board` card, so the FX it produces is now a LANE path confined to the caster's own lane.
  // Updated expectation, not a masked regression: the board FX shape itself is still exercised by
  // `dealEachLane`/`sap` ops in the resolver — this assertion now guards the owner's nerf instead.
  const { room, player } = rig(["oBlackHole"], 2);
  const left = foe(room, 0, "rookie"), right = foe(room, 1, "ratKing");
  const fx = play(room, player, "oBlackHole").findLast((event) => event.op === "deal");
  ok(fx?.shape === "lane" && fx.targets.some((target) => target.id === left.id)
    && !fx.targets.some((target) => target.id === right.id)
    && new Set(fx.lanes).size === 1,
  "Black Hole branches to the caster's lane ONLY (owner 2026-07-26 lane nerf)");
}

{
  const { room, player } = rig(["dBuckler"]);
  const fx = play(room, player, "dBuckler").findLast((event) => event.kind === "path");
  ok(fx?.shape === "self" && fx.targetId === player.id,
    "self utility card visibly resolves back onto its caster");
}

{
  const { room, player } = rig(["dHeartGuard"]);
  const paths = play(room, player, "dHeartGuard").filter((event) => event.shape === "self");
  eq(paths.length, 1, "centlessCentaur shield + heal on one body shares one card flight");
}

{
  const { room, player } = rig();
  delete player.lane;
  G.resolveOps(room, player, [{ do: "shield", amount: 1 }], null, 0, null, "dBuckler");
  const fx = room.castFx.findLast((event) => event.kind === "path");
  ok(fx?.shape === "self" && fx.cardKey === "dBuckler" && fx.targetId === player.id,
    "self-only graphics tolerate legacy actors without an assigned lane");
}

{
  const { room, player } = rig();
  const target = foe(room, 0);
  G.resolveOps(room, player, [{ do: "attack" }]);
  const fx = room.castFx.findLast((event) => event.kind === "path");
  ok(fx?.bodyKey === player.bodyKey && !fx.cardKey && fx.targetId === target.id,
    "true body passive uses body art and its actual target");
}

{
  const { room, player } = rig();
  G.resolveOps(room, player, [{ do: "regen", kind: "heal", amount: 1, period: 1 }],
    null, 0, null, "dTrollskin");
  room.castFx = [];
  player.regens[0].charge = 0;
  G.tickRegens(player, room);
  const fx = room.castFx.findLast((event) => event.kind === "path");
  ok(fx?.cardKey === "dTrollskin" && fx.op === "regen:heal" && fx.targetId === player.id,
    "recurring card effect keeps the originating card graphic");
}

{
  const { room, player } = rig(["oSpear"]);
  player.cardQueue = [{ id: player.hand[0].id, planned: true }];
  const companion = G.addPlayer(room, "bot", "Companion");
  G.wearBody(companion, "rookie");
  companion.owner = player.id;
  companion.bot = true;
  companion.autoFire = true;
  companion.hand = G.mintCards(["oSword"]);
  companion.deck = [];
  companion.moxie = 0;
  const snap = G.snapshot(room), selfView = snap.players.find((p) => p.id === player.id);
  const botView = snap.players.find((p) => p.id === companion.id);
  ok(selfView.intentCard?.mode === "plan" && selfView.intentCard.key === "oSpear",
    "manual Party plan exposes its exact first queued card");
  ok(botView.intentCard?.mode === "auto" && botView.intentCard.key === "oSword"
    && botView.intentCard.shortfall > 0,
  "Party companion exposes the damage card AUTO is banking toward");
}

console.log(`COMBAT GRAPHICS ${fail ? "FAIL" : "PASS"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
