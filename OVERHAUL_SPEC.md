# ROOM OVERHAUL SPEC — "see what's inside + toggle rooms/backpack" (owner 2026-06-27)

> Owner had a great run, got **frozen out at an elite room selection** (an unaffordable elite was the only
> forward path → softlock), and rooms are **opaque** (a node shows only a `⚖ante` number, never the foes
> inside). This overhaul makes rooms TRANSPARENT and navigation CLEAR, and proves the floor is winnable.

This is the SHARED CONTRACT for three disjoint workstreams. **Nobody edits another stream's files.**
- **ENGINE** (orchestrator) — `game.js`, `server.js`, `test/game.test.js`. PRODUCES the snapshot below.
- **CLIENT** (agent) — `public/*` only. CONSUMES the snapshot below. Graceful fallback if a field is absent.
- **AUTOPILOT** (agent) — `tools/*` only. Drives the real client headless; loops to a floor-1 boss victory.

---

## THE SNAPSHOT CONTRACT (additive — never remove/rename existing fields)

### `snapshot(room).map` gains (top level):
```
map: {
  nodes: [ … ],            // existing, see below
  currentId, levelComplete, bossName,   // existing
  rowCount:    <int>,      // total rows in this floor's graph (boss row = rowCount-1)
  currentRow:  <int>,      // row index of the current node
  roomsToBoss: <int>,      // bossRow - currentRow  ←  THE BOSS COUNTER ("Boss in N")
}
```

### each `map.nodes[i]` gains:
```
{
  id, type, x, y, links, cleared, ante,     // ALL existing — unchanged
  row: <int>,                               // NEW: this node's row index (0 = start)
  // NEW — only on type "combat" | "elite": the ACTUAL pre-built roster inside the room:
  contents: [ { bodyKey, name, level, maxHp, ante } , … ],   // one entry per foe, left as generated
  // elite nodes still also carry (unchanged from the elite-COST work):
  locked, lockReason, cost                  // cost = SCALAR spare-card price
}
```
`contents` is the *real* roster the room will spawn (pre-generated at map build — see ENGINE). The preview
and the fight MATCH. Boss/shop nodes carry no `contents`.

### trade (already shipped — CLIENT just needs to use it):
- `snapshot.trade.offers[]` exists when out of combat (won/shop): `{id,from,to,fromName,toName, give,giveName,giveVal, want,wantName,wantVal}` (want=null ⇒ a one-way gift).
- EVERY player in `snapshot.players[]` already exposes `backpack` + `deckList` (card descriptors) — so the
  trade UI can see everyone's items. No engine change needed for trade data.
- Server message routes already exist: `proposeTrade {to,give,want}`, `acceptTrade {offer}`, `declineTrade {offer}`,
  and same-seat squad moves `giveItem`/`moveItem`/`swapItem`. CLIENT wires buttons to these.

---

## ENGINE responsibilities (orchestrator — game.js / server.js / tests)
1. **Pre-generate each room's roster at map build** so contents are previewable AND stable. After
   `buildLevel(...)` (in `descend` and the run-start caller), for every combat/elite node set
   `node.foes = generateRoomFoes(room, roomAnteBudget(room, node.type), room.floor)`. `enterRoom` consumes
   `currentNode(room).foes` (clone) instead of regenerating; falls back to generate if absent.
2. **Row tagging + boss counter**: tag each node with `row` in `buildLevel`; expose `rowCount`/`currentRow`/`roomsToBoss` in the snapshot map.
3. **`contents` in the snapshot** for combat/elite nodes, derived from `node.foes`.
4. **SOFTLOCK FIX** (the frozen-out bug): in `buildLevel`, guarantee (a) every row keeps ≥1 NON-elite node,
   and (b) every non-boss node links to ≥1 non-elite next node (add a link to the nearest non-elite in the
   next row if all its links are elite). The ≥1-elite-per-floor guarantee still holds. Net: a player is NEVER
   forced into an unaffordable elite — there is always a non-elite path forward.
5. Tests for 1–4; keep `bun test test/game.test.js` green.

## CLIENT responsibilities (agent — public/* ONLY)
1. **A TOGGLE** (segmented control / tabs) in the between-rooms / won / shop screens, switching between:
   - **ROOMS view**: the available next rooms, each showing **what's inside** (`contents`: foe name ×level, hp)
     and its `⚖ante`; an elite shows its `◈cost` (🔒 if unaffordable). A prominent **BOSS COUNTER** —
     "Boss in `roomsToBoss`" — sits in this view.
   - **BACKPACK view**: the party's items, with **EASY TRADE between players** — propose gift/swap, and
     accept/decline incoming `trade.offers`. (Solo: still shows the backpack/deck editor.)
2. Render `contents` legibly on map nodes and/or the advance buttons (don't just show the ante number).
3. Build against the contract with **graceful fallback** (older snapshots lack `contents`/`roomsToBoss` —
   degrade to the current ante-only display; never crash).
4. Verify via the project's real-client screenshot path (mobile viewport). No engine/tools edits.

## AUTOPILOT responsibilities (agent — tools/* ONLY)
1. **Don't pick a locked node**: the autopilot's next-node chooser must SKIP locked/unaffordable elite nodes
   and prefer an affordable non-elite (this is what froze the run). Reuse the engine's `locked` flag.
2. **A loop-to-win harness** `tools/loop-to-win.mjs`: run the real autopilot headless across many
   attempts/seeds until at least one run records a **floor-1 boss victory** (`bossClears >= 1`), then report
   the winning attempt (seed/run, phases, screenshot if available). Make it FAST (skip per-tick screenshots;
   short budget per attempt; cap attempts). Refactor the combat brain out of `shoot.mjs` into a shared
   module if needed so both reuse it — keep `shoot.mjs` working.
3. Validate the harness runs and detects `bossClears` against the current build; the ORCHESTRATOR runs the
   final loop post-merge.

## SUCCESS CRITERION (the whole task)
Merged build: rooms show their contents, the rooms↔backpack toggle + boss counter work, trade works, the
softlock is gone, tests green, AND `tools/loop-to-win.mjs` produces **≥1 floor-1 boss victory**.
