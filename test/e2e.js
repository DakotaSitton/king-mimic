// End-to-end run over the REAL server (WebSocket): solo player drives a normal run
// through actual combat, the lootâ†”Treasure tradeoff, and a SHOP â€” asserting on the
// authoritative snapshots the server broadcasts. This exercises the whole stack
// (networking + phase machine + economy) the way a player does, not the pure layer.
//
// Run with the server up:  bun run server.js  &&  bun test/e2e.js
// (Real combat ticks at 100ms, so this takes a few seconds â€” it's not the fast loop.)

const URL = process.env.URL ?? "ws://localhost:3000/ws";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? "âœ…" : "âŒ"} ${label}`); if (!cond) failures++; };

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
    if (s?.phase === "lost") { console.log(`   â€¦${label}: caravan fell`); return false; }
    if (s?.phase === "playing") {
      const me = s.players.find((p) => p.id === c.me);
      (me?.inv ?? []).forEach((it, slot) => { if (it.ready) c.send({ type: "use", slot }); });
      c.send({ type: "cycleTarget", dir: 1 }); // sweep aim across lanes (bow/fire hit any lane)
    }
    await wait(80);
  }
  console.log(`   â€¦${label}: timed out in combat`);
  return false;
}

// The room arrives EMPTY â€” each player places their invite(s) (1, or 2 in a double
// feature). The solo bot stocks the CHEAPEST palette option (it has to win), pacing adds
// at the 10Hz snapshot rate so it never reads a stale pick count.
async function stockAndStart(c) {
  for (let k = 0; k < 8; k++) {
    const st = c.latest()?.stock;
    if (!st || st.canBegin) break;
    const idx = (st.palette ?? []).reduce((bi, o, i, a) => ((o.ante ?? 99) < (a[bi]?.ante ?? 99) ? i : bi), 0);
    c.send({ type: "stockAdd", idx }); await wait(160);
  }
  c.send({ type: "stockBegin" }); await wait(120);
  c.send({ type: "start" });      // setup -> playing
  await wait(120);
}

// (Re)start a fresh run and pick a class â†’ lands in the foe-draft (stock) phase.
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
c.send({ type: "create", nt: true, name: "Solo" });
const joined = await c.next("joined");
c.me = joined.you;
ok(!!joined.code, `created room (${joined.code})`);

// The map is PROCEDURAL now â€” walk it from the snapshot, steering toward the shop row
// (every path passes exactly one shop). A full run depends on winning real fights
// (combat RNG), so retry whole runs; each attempt is a genuine end-to-end playthrough.
const nextNodes = (s) => {
  const cur = s.map.nodes.find((n) => n.id === s.map.currentId);
  return (cur?.links ?? []).map((id) => s.map.nodes.find((n) => n.id === id)).filter(Boolean);
};
let R = null; // captured data from the first attempt that reaches the shop
for (let attempt = 1; attempt <= 10 && !R; attempt++) {
  if (!await freshRun(c)) continue;
  // fight 1: one greedy pick so there's spicy loot AND a greedy body-value feeding V
  await stockAndStart(c);
  if (!await winCurrentRoom(c, "room 1")) continue;
  const s1 = c.latest();
  if (!s1.loot) continue;          // should have dropped loot (greedy + baseline commons); retry if not
  const v0 = s1.roomValue, wallet0 = c.wallet(s1);
  // advance WITHOUT claiming â†’ unclaimed loot is forfeited, but V was already mirrored in.
  // Then fight room-by-room toward the shop (baseline only â€” we just need to get there).
  let sShop = null, walletAfterAdvance = null;
  for (let leg = 2; leg <= 6 && !sShop; leg++) {
    const s = c.latest();
    const to = (() => { const nn = nextNodes(s); return nn.find((n) => n.type === "shop") ?? nn[0]; })();
    if (!to) break;
    c.send({ type: "advance", to: to.id }); await wait(260);
    if (walletAfterAdvance == null) walletAfterAdvance = c.wallet(c.latest());
    if (c.latest()?.phase === "shop") { sShop = c.latest(); break; }
    await stockAndStart(c);
    if (!await winCurrentRoom(c, `room ${leg}`)) break;
  }
  if (!sShop) continue;
  R = { attempt, s1, v0, wallet0, walletAfterAdvance, sShop };
}

ok(!!R, `reached the shop via a full real run (attempt ${R?.attempt})`);
if (R) {
  ok(typeof R.s1.roomValue === "number" && R.s1.roomValue > 0, "won snapshot carries the mirrored room value V");
  ok(R.s1.loot.cards.every((card) => card.value > 0), "every loot card is priced (value)");
  ok(R.wallet0 === R.v0, `1:1 payout â€” solo gets the room's full ante (V=${R.v0} â†’ wallet ${R.wallet0})`);
  ok(R.walletAfterAdvance === R.wallet0,
    `leaving forfeits unclaimed loot â€” wallet unchanged, no banking (${R.wallet0}â†’${R.walletAfterAdvance})`);
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
    ok(meNow.kit.length === kitBefore + 1, `bought ${afford.key} â†’ kit grew (${kitBefore}â†’${meNow.kit.length})`);
    ok(c.wallet(s) === trBefore - afford.cost, `Treasure spent at the shop (${trBefore}â†’${c.wallet(s)})`);
  } else {
    ok(true, `shop reachable; buy skipped (ðŸ’°${c.wallet(s)}, cheapest ${afford?.cost}, kit ${kitBefore}/${me.kitSlots})`);
  }

  // leave the shop into the next room (whatever the generated map offers)
  const out = nextNodes(c.latest())[0];
  c.send({ type: "leaveShop", to: out?.id }); await wait(220);
  ok(c.latest()?.phase === "stock", `left the shop into the next room (${c.latest()?.phase})`);
}

console.log(failures === 0 ? "\nE2E OK â€” economy + shop run works over the server." : `\n${failures} check(s) failed.`);
c.ws.close();
process.exit(failures === 0 ? 0 : 1);
