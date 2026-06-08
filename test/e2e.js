// End-to-end run over the REAL server (WebSocket): solo player drives a normal run
// through actual combat, the loot↔Treasure tradeoff, and a SHOP — asserting on the
// authoritative snapshots the server broadcasts. This exercises the whole stack
// (networking + phase machine + economy) the way a player does, not the pure layer.
//
// Run with the server up:  bun run server.js  &&  bun test/e2e.js
// (Real combat ticks at 100ms, so this takes a few seconds — it's not the fast loop.)

const URL = process.env.URL ?? "ws://localhost:3000/ws";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? "✅" : "❌"} ${label}`); if (!cond) failures++; };

function client() {
  const ws = new WebSocket(URL);
  const inbox = [];
  ws.addEventListener("message", (e) => inbox.push(JSON.parse(e.data)));
  const ready = new Promise((res) => ws.addEventListener("open", res));
  const next = async (type, tries = 80) => {
    for (let i = 0; i < tries; i++) { const m = inbox.find((x) => x.type === type); if (m) return m; await wait(20); }
    throw new Error(`timeout waiting for '${type}'`);
  };
  const send = (o) => ws.send(JSON.stringify(o));
  const latest = () => [...inbox].reverse().find((x) => x.type === "state");
  const wallet = (s) => (s?.players ?? []).find((p) => p.id === c.me)?.treasure ?? 0;
  const c = { ws, ready, next, send, latest, wallet, me: null };
  return c;
}

// Spam every ready item (sweeping targets across all lanes) until the room is won.
async function winCurrentRoom(c, label, timeoutMs = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = c.latest();
    if (s?.phase === "won") return true;
    if (s?.phase === "lost") { console.log(`   …${label}: caravan fell`); return false; }
    if (s?.phase === "playing") {
      const me = s.players.find((p) => p.id === c.me);
      (me?.inv ?? []).forEach((it, slot) => { if (it.ready) c.send({ type: "use", slot }); });
      c.send({ type: "cycleTarget", dir: 1 }); // sweep aim across lanes (bow/fire hit any lane)
    }
    await wait(80);
  }
  console.log(`   …${label}: timed out in combat`);
  return false;
}

// The room arrives pre-stocked with baseline foes (now armed with commons → they drop
// loot). Optionally add a GREEDY spicy pick for a juicier drop. Keep `greedy` small so the
// dumb spam-bot below can reliably win — the game's real threat is fine, this is just a test.
async function stockAndStart(c, greedy = 1) {
  for (let k = 0; k < greedy; k++) { c.send({ type: "stockAdd", idx: k % 3 }); await wait(40); }
  c.send({ type: "stockBegin" }); await wait(120);
  c.send({ type: "start" });      // setup -> playing
  await wait(120);
}

// (Re)start a fresh run and pick a class → lands in the foe-draft (stock) phase.
// `start` from lobby/won/lost kicks off a new draft, so this works for retries too.
async function freshRun(c) {
  c.send({ type: "start" });
  for (let i = 0; i < 50 && c.latest()?.phase !== "draft"; i++) await wait(25);
  c.send({ type: "chooseClass", key: "rogue" }); // rogue: fast cds + bow hits any lane
  for (let i = 0; i < 50 && c.latest()?.phase !== "stock"; i++) await wait(25);
  return c.latest()?.phase === "stock";
}

// --- drive it -------------------------------------------------------------
const c = client();
await c.ready;
c.send({ type: "create", name: "Solo" });
const joined = await c.next("joined");
c.me = joined.you;
ok(!!joined.code, `created room (${joined.code})`);

// A full run depends on winning two real fights (combat RNG). Retry the whole run a
// few times so the test is reliable; each attempt is a genuine end-to-end playthrough.
let R = null; // captured data from the first attempt that reaches the shop
for (let attempt = 1; attempt <= 10 && !R; attempt++) {
  if (!await freshRun(c)) continue;
  // fight 1 (n0): one greedy pick so there's spicy loot AND a greedy body-value feeding V
  await stockAndStart(c, 1);
  if (!await winCurrentRoom(c, "n0")) continue;
  const s1 = c.latest();
  if (!s1.loot) continue;          // should have dropped loot (greedy + baseline commons); retry if not
  const v0 = s1.roomValue, wallet0 = c.wallet(s1);
  // leave n0 WITHOUT claiming → unclaimed loot is forfeited, but V was already mirrored in
  c.send({ type: "advance", to: "n1" }); await wait(220);
  const walletAfterAdvance = c.wallet(c.latest());
  // fight 2 (n1): baseline only (no greedy) — we just need to win through to the shop
  await stockAndStart(c, 0);
  if (!await winCurrentRoom(c, "n1")) continue;
  c.send({ type: "advance", to: "n3" }); await wait(280);
  const sShop = c.latest();
  if (sShop?.phase !== "shop") continue;
  R = { attempt, s1, v0, wallet0, walletAfterAdvance, sShop };
}

ok(!!R, `reached the shop via a full real run (attempt ${R?.attempt})`);
if (R) {
  ok(typeof R.s1.roomValue === "number" && R.s1.roomValue > 0, "won snapshot carries the mirrored room value V");
  ok(R.s1.loot.cards.every((card) => card.value > 0), "every loot card is priced (value)");
  ok(R.wallet0 === R.v0, `mirrored income credited the full room value to the wallet (V=${R.v0} → wallet ${R.wallet0})`);
  ok(R.walletAfterAdvance === R.wallet0,
    `leaving forfeits unclaimed loot — wallet unchanged, no banking (${R.wallet0}→${R.walletAfterAdvance})`);
  ok(R.sShop.shop.wares.length > 0, `shop shelf is stocked (${R.sShop.shop.wares.length} wares)`);
  ok(R.sShop.shop.wares.every((w) => w.cost > 0), "every ware is priced");

  // a stray START in the shop must NOT reset the run to the class draft (regression guard)
  c.send({ type: "start" }); await wait(180);
  ok(c.latest()?.phase === "shop", `START during shop is ignored (still shop, not draft)`);

  // buy the cheapest affordable ware
  let s = R.sShop;
  const me = s.players.find((p) => p.id === c.me);
  const kitBefore = me.kit.length;
  const afford = [...s.shop.wares].sort((a, b) => a.cost - b.cost).find((w) => w.cost <= c.wallet(s));
  if (afford && kitBefore < me.kitSlots) {
    const trBefore = c.wallet(s);
    c.send({ type: "buyShopItem", key: afford.key }); await wait(220);
    s = c.latest();
    const meNow = s.players.find((p) => p.id === c.me);
    ok(meNow.kit.length === kitBefore + 1, `bought ${afford.key} → kit grew (${kitBefore}→${meNow.kit.length})`);
    ok(c.wallet(s) === trBefore - afford.cost, `Treasure spent at the shop (${trBefore}→${c.wallet(s)})`);
  } else {
    ok(true, `shop reachable; buy skipped (💰${c.wallet(s)}, cheapest ${afford?.cost}, kit ${kitBefore}/${me.kitSlots})`);
  }

  // leave the shop into the next room
  c.send({ type: "leaveShop", to: "n4" }); await wait(220);
  ok(c.latest()?.phase === "stock", `left the shop into the elite room (${c.latest()?.phase})`);
}

console.log(failures === 0 ? "\nE2E OK — economy + shop run works over the server." : `\n${failures} check(s) failed.`);
c.ws.close();
process.exit(failures === 0 ? 0 : 1);
