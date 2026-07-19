import * as G from "../game.js";

const { KIT } = G;
let pass = 0, fail = 0;
const ok = (value, label) => {
  if (value) pass++;
  else { fail++; console.error("FAIL", label); }
};

G.setHpMult(1);
G.setCdMult(1);

function rig(body, { inv = [], foeHp = 1e9 } = {}) {
  const room = G.newRoom("FX");
  const player = G.addPlayer(room, "p", "Animation Probe");
  G.wearBody(player, body);
  player.lane = 0;
  player.depth = 0;
  player.maxHp = player.hp = 1e9;
  player.autoFire = false;
  player.cards = G.mintCards(inv);
  player.hand = [...player.cards];
  player.deck = [];
  player.moxie = 999;
  room.phase = "playing";
  room.laneCount = 1;
  room.allies = [[]];
  room.caravan = { hp: 1e9, max: 1e9 };
  const foe = G.spawnEnemy("rookie", []);
  foe.hp = foe.maxHp = foeHp;
  foe.queue = [];
  foe.lane = 0;
  room.lanes = [[foe]];
  return { room, player };
}

const playerKeys = [...G.PLAYER_POOL, ...G.ARCHIVED_PLAYER_CARDS];
const tokenKeys = Object.keys(KIT).filter((key) => key.startsWith("t"));
const partition = [...playerKeys, ...tokenKeys];

ok(partition.length === Object.keys(KIT).length,
  "player/archive/token partition covers every KIT entry");
ok(new Set(partition).size === Object.keys(KIT).length,
  "KIT animation partition contains every key exactly once");

const failures = [];
for (const key of playerKeys) {
  try {
    const { room, player } = rig("rookie", { inv: [key] });
    const card = player.hand.find((candidate) => candidate.key === key);
    const cast = card && G.playCard(room, player, card.id);
    const pulses = (room.castFx ?? []).filter(
      (event) => event.kind === "cast" && event.cardKey === key);
    const projected = G.snapshot(room).castFx ?? [];
    if (!cast || pulses.length !== 1
        || !projected.some((event) => event.id === pulses[0]?.id)) {
      failures.push({ key, path: "player", cast: !!cast, pulses: pulses.length });
    }
  } catch (error) {
    failures.push({ key, path: "player", error: String(error) });
  }
}

for (const key of tokenKeys) {
  try {
    const { room } = rig("rookie");
    const token = G.spawnEnemy("rat", []);
    token.id = `token-${key}`;
    token.side = "hero";
    token.lane = 0;
    token.hp = token.maxHp = 100;
    token.queue = G.mintCards([key]);
    token.moxie = 999;
    room.allies[0].push(token);
    const cast = G.foeCast(room, token);
    const pulses = (room.castFx ?? []).filter(
      (event) => event.kind === "cast" && event.cardKey === key);
    const projected = G.snapshot(room).castFx ?? [];
    if (!cast || pulses.length !== 1
        || !projected.some((event) => event.id === pulses[0]?.id)) {
      failures.push({ key, path: "token", cast: !!cast, pulses: pulses.length });
    }
  } catch (error) {
    failures.push({ key, path: "token", error: String(error) });
  }
}

ok(failures.length === 0,
  `all ${Object.keys(KIT).length} KIT cards emit snapshot-visible cast pulses: ${JSON.stringify(failures)}`);
console.log(`CARD ANIMATION ${fail ? "FAIL" : "PASS"} — ${pass} passed, ${fail} failed; ${partition.length} cards cast-probed`);
if (fail) process.exit(1);
