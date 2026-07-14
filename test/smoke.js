// Two-client multiplayer smoke test. Connects two WebSocket clients to the running server,
// creates a room, joins it, starts a game, moves a player, and asserts both clients see a
// shared 2-player state. Run with: bun run test/smoke.js   (server must be running)

import netDelta from "../public/net-delta.js";
const { applyOps } = netDelta;
const URL = process.env.URL ?? "ws://localhost:3000/ws";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
  const ws = new WebSocket(URL);
  const inbox = [];
  let state = null, seq = 0;
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data); inbox.push(m);
    if (m.type === "state") { state = m; seq = m.seq ?? 0; }
    else if (m.type === "delta" && state && m.base === seq) { applyOps(state, m.ops); seq = m.seq; }
  });
  const ready = new Promise((res) => ws.addEventListener("open", res));
  const next = async (type, tries = 50) => {
    for (let i = 0; i < tries; i++) {
      const m = inbox.find((x) => x.type === type);
      if (m) return m;
      await wait(20);
    }
    throw new Error(`timeout waiting for '${type}'`);
  };
  const send = (o) => ws.send(JSON.stringify(o));
  return { ws, ready, next, send, latest: () => state };
}

let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? "âœ…" : "âŒ"} ${label}`); if (!cond) failures++; };

const a = client(), b = client();
await Promise.all([a.ready, b.ready]);

a.send({ type: "create", nt: true, name: "Alice" });
const joinedA = await a.next("joined");
ok(!!joinedA.code && joinedA.code.length === 4, `host created room (${joinedA.code})`);

b.send({ type: "join", code: joinedA.code, name: "Bob" });
const joinedB = await b.next("joined");
ok(joinedB.code === joinedA.code, "friend joined same room by code");

a.send({ type: "start" });          // lobby -> class select
await wait(120);
ok(a.latest()?.phase === "draft", `class select opens for the run (${a.latest()?.phase})`);

// both players pick a class; the level auto-starts into the foe-draft
a.send({ type: "chooseClass", key: "__forged__" });
await wait(100);
ok(!a.latest()?.draft?.picks?.find((p) => p.id === joinedA.you)?.drafted, "forged legacy class pick is rejected");
const offerA = a.latest().draft.wheel.find((w) => w.offeredTo === joinedA.you);
const offerB = b.latest().draft.wheel.find((w) => w.offeredTo === joinedB.you);
a.send({ type: "draftPick", bundle: offerA.id });
b.send({ type: "draftPick", bundle: offerB.id });
await wait(300);
if (a.latest()?.draft?.hold) { a.send({ type: "beginRun" }); await wait(300); }
ok(a.latest()?.phase === "won", `classes chosen -> trailhead room-vote (${a.latest()?.phase})`);
// room-draft-overhaul: pick the first room; co-op needs EVERY seat to vote (advance) + lock.
{ const s = a.latest();
  const cur = s.map.nodes.find((n) => n.id === s.map.currentId);
  const links = cur.links.map((id) => s.map.nodes.find((n) => n.id === id));
  const to = (links.find((n) => n.type === "combat") ?? links[0]).id;
  a.send({ type: "advance", to }); b.send({ type: "advance", to });
  a.send({ type: "lockRoom" });    b.send({ type: "lockRoom" }); }
await wait(250);
// voted rooms are pre-stocked → straight to setup; the old "stock" foe-offer is gone (stockAdd below is a vestigial no-op)
ok(a.latest()?.phase === "setup", `classes chosen â†’ foe-draft (${a.latest()?.phase})`);

// EVERY player places their one invite (per-player picks gate the Begin)
a.send({ type: "stockAdd", idx: 0 });
b.send({ type: "stockAdd", idx: 1 });
await wait(150);
a.send({ type: "stockBegin" });
await wait(150);
ok(a.latest()?.phase === "setup", `room stocked â†’ setup (${a.latest()?.phase})`);

a.send({ type: "start" });          // setup -> playing (combat begins)
await wait(150);
const sA = a.latest(), sB = b.latest();
ok(sA && sA.players.length === 2, `host sees 2 players (${sA?.players.length})`);
ok(sB && sB.players.length === 2, `friend sees 2 players (${sB?.players.length})`);
ok(sA?.phase === "playing", `combat is playing (${sA?.phase})`);
const foes = sA ? sA.lanes.reduce((n, l) => n + l.enemies.length, 0) : 0;
ok(foes > 0, `room is pre-filled with foes (${foes})`);

// move Bob and confirm BOTH clients observe the change (shared authoritative state). Lanes now
// = player count (2 here), so movement clamps to [0, laneCount-1]; move UP so it's observable.
const bobBefore = sB.players.find((p) => p.id === joinedB.you).lane;
b.send({ type: "lane", dir: "up" });
await wait(150);
const bobAfterOnHost = a.latest().players.find((p) => p.id === joinedB.you).lane;
ok(bobAfterOnHost === Math.max(0, bobBefore - 1), `host sees friend's lane move (${bobBefore} â†’ ${bobAfterOnHost})`);

console.log(failures === 0 ? "\nALL GOOD â€” multiplayer is functional." : `\n${failures} check(s) failed.`);
a.ws.close(); b.ws.close();
process.exit(failures === 0 ? 0 : 1);
