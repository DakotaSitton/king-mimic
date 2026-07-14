// Four-client "full party" smoke test â€” the roommate-playtest shape. Connects 4 clients,
// runs the real flow (draft â†’ stock â†’ setup â†’ playing), and asserts the board is a true
// 4-lane co-op state shared by all. Run with: bun run test/smoke4.js   (server must be running)

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

const NAMES = ["Alice", "Bob", "Cara", "Dee"];
const cs = NAMES.map(() => client());
await Promise.all(cs.map((c) => c.ready));
const [a, b, c, d] = cs;

a.send({ type: "create", nt: true, name: NAMES[0] });
const joinedA = await a.next("joined");
const joins = [joinedA];
for (let i = 1; i < 4; i++) {
  cs[i].send({ type: "join", code: joinedA.code, name: NAMES[i] });
  joins.push(await cs[i].next("joined"));
}
ok(joins.every((j) => j.code === joinedA.code), `all 4 joined room ${joinedA.code}`);

a.send({ type: "start" });
await wait(150);
ok(a.latest()?.phase === "draft", `draft opens for 4 (${a.latest()?.phase})`);
cs.forEach((cl, i) => {
  const offer = cl.latest().draft.wheel.find((w) => w.offeredTo === joins[i].you);
  cl.send({ type: "draftPick", bundle: offer.id });
});
await wait(200);
if (a.latest()?.draft?.hold) { a.send({ type: "beginRun" }); await wait(250); }
// Vote together from the trailhead into the first pre-built room.
{ const s = a.latest();
  const cur = s.map.nodes.find((n) => n.id === s.map.currentId);
  const to = cur.links[0];
  cs.forEach((cl) => cl.send({ type: "advance", to }));
  await wait(100);
  cs.forEach((cl) => cl.send({ type: "lockRoom" }));
  await wait(300);
}
// rooms are pre-built now (no foe-stock step) — unanimous room vote goes straight to setup
ok(a.latest()?.phase === "setup", `all 4 picked -> setup, pre-built room (${a.latest()?.phase})`);

a.send({ type: "start" });
await wait(200);
const states = cs.map((cl) => cl.latest());
ok(states.every((s) => s?.phase === "playing"), `combat live on all 4 clients`);
ok(states.every((s) => s?.players.length === 4), `all 4 see 4 players (${states.map((s) => s?.players.length)})`);
ok(states[0]?.laneCount === 4, `board is 4 lanes wide (${states[0]?.laneCount})`);
ok(states[0]?.lanes.length === 4, `snapshot carries 4 lane arrays (${states[0]?.lanes.length})`);
const foes = states[0] ? states[0].lanes.reduce((n, l) => n + l.enemies.length, 0) : 0;
ok(foes > 0, `foes spawned across the 4-lane board (${foes})`);

// every player can reach every lane: walk Dee from her lane to lane 0 and back to lane 3
const deeId = joins[3].you;
for (let i = 0; i < 4; i++) d.send({ type: "lane", dir: "up" });
await wait(200);
ok(a.latest().players.find((p) => p.id === deeId).lane === 0, "player can walk to lane 0");
for (let i = 0; i < 4; i++) d.send({ type: "lane", dir: "down" });
await wait(200);
ok(a.latest().players.find((p) => p.id === deeId).lane === 3, "player can walk to lane 3 (clamped)");

// everyone fires their first item â€” the shared sim must accept 4 concurrent actors
cs.forEach((cl) => cl.send({ type: "use", slot: 0 }));
await wait(300);
ok(cs.every((cl) => cl.latest()?.phase === "playing"), "sim survives 4 concurrent actors");

console.log(failures === 0 ? "\nALL GOOD â€” 4-player party works." : `\n${failures} check(s) failed.`);
cs.forEach((cl) => { try { cl.ws.close(); } catch {} });
process.exit(failures === 0 ? 0 : 1);
