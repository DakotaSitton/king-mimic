// Reconnect smoke test. Proves a mid-run socket drop HOLDS the seat (phone lock / refresh)
// and a token rejoin reclaims it — same player id, no duplicate seat. Also proves the
// pre-run behavior is unchanged (a lobby leaver is removed) and that the newest socket
// wins a seat (refresh race). Run with: bun run test/reconnect.js   (server must be running)

const URL = process.env.URL ?? "ws://localhost:3000/ws";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
  const ws = new WebSocket(URL);
  const inbox = [];
  ws.addEventListener("message", (e) => inbox.push(JSON.parse(e.data)));
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
  return { ws, ready, next, send, latest: () => [...inbox].reverse().find((x) => x.type === "state") };
}

let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? "✅" : "❌"} ${label}`); if (!cond) failures++; };

// --- setup: 2 players, walk into combat (same path as smoke.js) -----------
const a = client(), b = client();
await Promise.all([a.ready, b.ready]);
a.send({ type: "create", name: "Alice", token: "tok-A" });
const joinedA = await a.next("joined");
b.send({ type: "join", code: joinedA.code, name: "Bob", token: "tok-B" });
const joinedB = await b.next("joined");
const bobId = joinedB.you;

a.send({ type: "start" });
await wait(120);
a.send({ type: "chooseClass", key: "warrior" });
b.send({ type: "chooseClass", key: "cleric" });
await wait(150);
for (let k = 0; k < 6; k++) a.send({ type: "stockAdd", idx: k % 3 });
await wait(80);
a.send({ type: "stockBegin" });
await wait(150);
a.send({ type: "start" });
await wait(150);
ok(a.latest()?.phase === "playing", `run is live (${a.latest()?.phase})`);

// --- 1. mid-run drop holds the seat ----------------------------------------
b.ws.close();
await wait(250);
let s = a.latest();
ok(s.players.length === 2, `dropped player keeps their seat (${s.players.length} seated)`);
ok(s.players.find((p) => p.id === bobId)?.offline === true, "host sees the seat marked OFFLINE");

// --- 2. token rejoin reclaims the SAME seat ---------------------------------
const b2 = client();
await b2.ready;
b2.send({ type: "join", code: joinedA.code, name: "Bob", token: "tok-B" });
const rejoined = await b2.next("joined");
ok(rejoined.you === bobId, `rejoin reclaims the same player id (${rejoined.you})`);
await wait(250);
s = a.latest();
ok(s.players.length === 2, `no duplicate seat after rejoin (${s.players.length})`);
ok(s.players.find((p) => p.id === bobId)?.offline === false, "seat back ONLINE after rejoin");
const s2 = b2.latest();
ok(!!s2 && s2.phase === "playing", `rejoiner receives live state (${s2?.phase})`);

// --- 3. refresh race: the newest socket wins the seat ------------------------
const b3 = client();
await b3.ready;
b3.send({ type: "join", code: joinedA.code, name: "Bob", token: "tok-B" });
const stolen = await b3.next("joined");
ok(stolen.you === bobId, `newest socket reclaims the seat (${stolen.you})`);
await wait(250);
s = a.latest();
ok(s.players.length === 2, `still no duplicate after a refresh race (${s.players.length})`);
ok(s.players.find((p) => p.id === bobId)?.offline === false, "seat ONLINE on the newest socket");

// --- 4. pre-run (lobby) drop still removes the player ------------------------
const c = client(), d = client();
await Promise.all([c.ready, d.ready]);
c.send({ type: "create", name: "Cara", token: "tok-C" });
const joinedC = await c.next("joined");
d.send({ type: "join", code: joinedC.code, name: "Dee", token: "tok-D" });
await d.next("joined");
await wait(150);
d.ws.close();
await wait(250);
const sc = c.latest();
ok(sc.players.length === 1, `lobby leaver is removed, not held (${sc.players.length} seated)`);

console.log(failures === 0 ? "\nALL GOOD — reconnect holds and reclaims seats." : `\n${failures} check(s) failed.`);
for (const x of [a, b2, b3, c]) try { x.ws.close(); } catch {}
process.exit(failures === 0 ? 0 : 1);
