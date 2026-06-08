# HANDOFF — King Mimic — 2026-06-08 (USER_STORY_REWORK shipped, all green)

> Pick-up doc for a fresh Claude Code session. Read this first. Supersedes any older HANDOFF.
> King Mimic is a web-based co-op multiplayer browser **roguelike**: N vertical lanes (= player
> count), defend a shared **Caravan** HP bar. Loot the foes you defeat (items AND bodies), draft
> the rooms you fight, and every player earns the same. Reference class: Skribbl / Jackbox.

## ⏭️ START HERE — the rework is DONE; read `QUESTIONS.md`
The whole `USER_STORY_REWORK.md` (economy + lanes + draft + greedy-add + trading) is **implemented
and green**. The single most useful next action is to **read `QUESTIONS.md`** — it lists the ~10
design calls I made where the spec had gaps (greedy body-value number, anti-stall resolution, solo
lane count, whether drafted bodies get affinity, post-draft body overlap, etc.). The user is
reviewing those. After that, the open codeable gaps are the **boss reward** (bosses pay 0 under
mirrored income — intentionally deferred) and any UI polish flagged in QUESTIONS §8–10.

**Working tree is DIRTY and UNCOMMITTED** (the user hadn't asked to commit). `git add -A && git
commit` to seal it. `probe_tmp.mjs` at repo root is a throwaway — delete it (`! rm probe_tmp.mjs`;
rm is permission-guarded).

## ✅ THIS SESSION — the rework, in 5 green increments (suite never left red)
1. **Mirrored-income economy** (the heart). Shared `room.treasure` → **per-player `player.treasure`**.
   On room clear, the FULL room value `V` is credited to **every** wallet (mirrored, not split) —
   every player's cumulative *earnings* are always identical. `V = Σ itemTreasure(loot items) +
   Σ bodyValue(greedy bodies)`. **Claiming loot now COSTS its value** (`claimLoot`). `buyTier`/
   `buyKitSlot`/shop all spend the acting player's wallet; `unlockedTiers` is per-player. Deleted
   `bankUnclaimedLoot`/`pendingTreasure`/`room.treasure` (no banking — unclaimed loot is forfeited,
   its value was already credited). `creditRoomIncome`/`roomValue` are the new spine.
2. **Lanes = player count (1–4).** `LANES=3` const is now the legacy default; live count is
   `room.laneCount = deriveLaneCount(room, type)` = `clamp(players, LANE_FLOOR, 4)`. **Boss & god
   rooms floor at 3 lanes** (bosses are designed around 3, untouched). `LANE_FLOOR=1` (solo=1 lane);
   flip to 2 for the documented fallback. Threaded through every lane loop in game.js + the
   **N-column canvas renderer** in client.js. Baseline foe count now **scales with party size**.
3. **Draft = body+items wheel.** `startDraft` rolls `room.draftWheel` (low bodies + 3 random items
   each, ≥1 damaging); `draftPick` locks one EXCLUSIVELY. `KIT_SLOTS_BASE 5→3` (a draft kit is full;
   "level up" = buy a slot). `chooseClass` is **back-compat** (a class = a body+kit pick; drives the
   whole test suite + smoke/e2e). Live UI shows the wheel; snapshot keeps `.classes` for compat.
4. **Per-player greedy-add into your own lane.** Each player owns a lane (`p.ownedLane`, set at
   enterRoom, bijective with lanes). `addGreedy(room, player, idx)` invites **ONE** body (re-add
   replaces) into the owner's lane; `removeGreedy`. `placedLanes()` (shared by buildRoom + snapshot)
   puts greedy in the owner's lane, baseline round-robin. Greedy body-value + item feed `V` (so
   greed raises EVERYONE's income equally). `addFoe`/`removeFoe` kept as no-owner primitives (tests).
5. **Player-to-player trading + home screen.** `tradeItems` swaps one item each, settling the value
   gap in treasure (lesser-item giver pays). `proposeTrade`/`acceptTrade`/`declineTrade` handshake
   (`room.tradeOffers`, reset per room). Trading UI lives on the between-rooms (won) + shop screens.
6. **Anti-stall safety net** (`STALL_LIMIT=1500`). Fuzz found a real heal-vs-DPS equilibrium that
   never resolved; combat now resolves as a loss after ~150s of zero progress. NOT escalation
   (nothing ramps). See QUESTIONS §2.

## ➕ FOLLOW-UP (same session, separate commit): in-lane DEPTH LINE
Players now stack as a **line within a lane** (like the foes do), with a controllable depth:
- **↑/W = step forward** (toward foes, to block); **↓/S = step back** (behind teammates).
  **←/→ still = change lane.** New `player.depth` (0 = front); `moveDepth` swaps one slot.
- **The front hero in a lane is the blocker** — `foeHitLane` hits `laneHeroes(room, li)[0]`
  (depth-ordered); teammates behind are shielded until it falls or you reshuffle.
- **Summons hold the front row** (still block before any hero — disposable meat shields), given
  their own row so a growing rat stack has space.
- Renderer draws the vertical depth line per lane; front blocker gets a cyan shield arc + a 🛡
  lane marker. New `?demo=line` fixture + `demo-line.png` showcase it. Snapshot ships `depth`.
- **Two design defaults (QUESTIONS-style, easy to flip):** summons always block before heroes
  (can't step in front of your own rats); ↑ moves one slot at a time (not jump-to-front).

## State (ALL GREEN — the rework is committed; the depth line is the only thing to commit)
- **428/428 pure** (`bun test/game.test.js`), **fuzz 200+ runs clean** (`bun test/fuzz.js`),
  **20/20 serve**, **smoke** (2-client MP), **e2e** (full economy+shop over WS) — all pass vs a
  fresh server. The rework is committed at **`57b29a8`**; the depth-line follow-up is its own
  commit. Screenshots in `tools/shots/demo-*.png`: draft(wheel), stock(per-player greedy),
  combat2/3/4 + solo (N lanes), won(trading), shop, **line (the depth stack)**.

## THE CORE MODEL (the spine — do not break)
**Everything is a Combatant: a body + items + passives. NOBODY has a base "swing."** Players AND
foes deal damage *only* through items and passive triggers, through one resolver (`resolveOps`).
Real-time fixed-tick combat; the shared **Caravan** HP behind the lanes is the fail-state. A **body**
= HP + affinity (Phys/Mag Power) + tempo + one passive (passives fire for foes/allies, NOT players).
An **item** = an active you press (hotbar 1–9, cooldown, damage `type`). Within a lane, heroes form
a **depth line** (`player.depth`); the **front hero blocks** for the lane (summons block before all
heroes). Win = clear the room (full-heal + revive); loss = caravan at 0 (or the anti-stall). Do
**not** reintroduce auto-attacks.

## THE ECONOMY (the new spine — get it exactly right)
- **Earnings are always equal.** Every player is credited the same `V` per cleared room. Holdings
  diverge only as players *spend* (claim loot, buy bodies/slots, trade). The invariant is on income.
- **Loot** is a shared scarce set; **claiming costs `itemTreasure`** from your wallet. No stash —
  unclaimed loot is forfeited on leave (its value was already mirrored to everyone).
- **Two spend axes** from your own wallet: **buy a body** (per-player tier unlock, `buyTier`, gated
  by `tiersReached`) and **"level up"** (= +1 kit slot, `buyKitSlot`, a pure rename). Shop too.
- **Trading**: swap items, value gap settled in treasure (allowed because equality is on earnings).

## Active decisions (non-obvious why only) — see QUESTIONS.md for the open ones
- **bodyValue(greedy) = raw ante** (mirrors itemTreasure); body PURCHASE cost = ante×5. Different on
  purpose (income vs. purchase). [QUESTIONS §1]
- **Boss/god rooms keep ≥3 lanes**; everything else = player count. Player `ownedLane` is bijective
  with lanes in ordinary rooms.
- **Drafted bodies are pure chassis** (HP only, neutral affinity, passive doesn't fire for players).
  Classes remain the only affinity-carrying non-foe bodies (back-compat). [QUESTIONS §5, §10]
- **Anti-stall = loss after 150s of no progress** (not escalation). [QUESTIONS §2]
- **Bosses untouched; boss reward still the open decision** (boss rooms pay 0 under mirrored income).
- **Persistence/permadeath/matchmaking = North Star, not built.**

## Landmines
- **Restart the server for game.js / server.js changes** — no `--watch`, game.js imported once at
  boot. `public/*` IS served fresh (no-store). Kill stale first: `Get-Process bun | Stop-Process
  -Force` (a stale server serves old code and passes tests misleadingly).
- **No Node, Bun only. No Playwright** (hangs under Bun). Screenshots via Edge native:
  `powershell -File tools/shoot.ps1 [draft stock combat won shop]`.
- **Snapshot `bodies` is a trimmed projection** (`publicBodies`); add new body fields there or they
  won't ship. Treasure/tiers are **per-player** in `snapshot.players[]` now (NOT top-level). Top-
  level `roomValue` = the V mirrored this clear; `laneCount` = N columns.
- **`?demo=` fixtures in client.js (`buildDemoState`) are hand-built** — update them if you add
  snapshot fields the renderer reads, or screenshots go stale. They cover draft(wheel)/stock(greedy)/
  combat/won(trading)/shop.
- **`chooseClass` is back-compat glue** — the pure tests, smoke, e2e all drive the draft through it.
  The live client uses `draftPick` (the wheel). Don't delete chooseClass without rewriting ~30 tests.
- **Friendly band geometry is tight** — heroes stack in ~80px between the foe formation and the
  caravan (`HERO_STEP`/`REAR_Y` in client.js `render`). 3–4 deep is legible but cramped; the
  cleanest lever for more room is a taller board. Foe `stackBottom` is now per-lane
  (`laneStacks[i].foeBottom`), derived from that lane's friendly stack height.
- **Sub-agent worktrees branch from `origin/main` (STALE).** Push or work inline; don't trust a
  worktree agent's diff against months-old code.
- **Server-dependent suites need a running server** (`bun run server.js` on :3000): serve/smoke/e2e.
  `test/game.test.js` + `test/fuzz.js` are pure/instant.

## Pointers
- Run: `bun run server.js` → http://localhost:3000 (hard-reload once: Ctrl+Shift+R).
- Test: `bun test/game.test.js` (pure) · `bun test/fuzz.js` (property) · with server up:
  `bun test/serve.test.js` · `bun test/smoke.js` · `bun test/e2e.js`.
- DEMO god mode: room code `DEMO` skips the draft, charges all items, huge HP, unlocks all bodies.
- Key files:
  - `game.js` — ALL pure logic. Economy: `roomValue`/`bodyValue`/`creditRoomIncome`/`claimLoot`/
    `buyTier`/`buyKitSlot`/`tradeItems`/`proposeTrade`/`acceptTrade`. Lanes: `deriveLaneCount`/
    `LANE_FLOOR`/`room.laneCount`/`ownerLaneOf`/`placedLanes`. Depth line: `player.depth`/
    `laneHeroes`/`moveDepth` (front blocks in `foeHitLane`). Draft: `rollDraftWheel`/`draftPick`/
    `chooseClass`(compat)/`DRAFT_BODIES`. Greedy: `addGreedy`/`removeGreedy`. Combat: `simulateTick`/
    `resolveOps` + `STALL_LIMIT` guard. Bosses (untouched): `bossForFloor`/`spawnBoss`.
  - `server.js` — networking only. Routes incl. `draftPick`/`stockAdd`(→addGreedy)/`move`(→moveDepth)/
    `proposeTrade`/`acceptTrade`/`declineTrade`/`claimLoot`/`buyTier`/`buyKitSlot`/`buyShopItem`/
    `lane`/`advance`/`descend`.
  - `public/client.js` — N-column canvas renderer (depth-line hero stacks, `laneStacks`) + overlays:
    `renderDraft` (wheel), `renderStock` (per-player greedy), `renderBetweenRooms` + `renderShop`
    (loot/spend/**trading**), `buildTradeSection`. Keys: ←/→ lane, ↑/↓ depth, Tab aim, 1–9 items, Q swap.
  - `public/inventory.js` (+`.css`) — body-swap modal (reads per-player wallet/tiers now).
  - `public/index.html` — styles (incl. `.trade-*`). `public/map.js` — left node map.
  - `test/game.test.js` — the spec (420 checks). `test/fuzz.js` — property playthroughs.
    `test/e2e.js` — server-driven full run (mirrored income asserts). `test/smoke.js` — 2-client MP.
  - `QUESTIONS.md` — the open design calls for the user. `USER_STORY_REWORK.md` — the spec (done).

## Working style (from the user)
Blunt pushback over agreement. Ship artifacts, not planning docs. Run the suite after every change,
never leave it red. LOVES end-to-end testing (real run + screenshots). Playtests himself (often on
phone — send screenshots). Delete guardrail: `rm`/`Remove-Item` blocked at the permission layer — ask
him to run `! rm <path>`. Commit only when asked. Iterate in tight loops.
