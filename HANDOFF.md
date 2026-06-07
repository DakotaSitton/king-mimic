# HANDOFF — King Mimic — 2026-06-07 

> Pick-up doc for a fresh Claude Code session. Read this first. Supersedes any older HANDOFF.
> King Mimic is a web-based co-op multiplayer browser **roguelike**: 3 vertical lanes, defend a
> shared **Caravan** HP bar. Hook: loot the foes you defeat (their items AND bodies) and draft
> the rooms you fight (greed → richer reward). Reference class: Skribbl / Jackbox.

## THE CORE MODEL (the spine — do not break)
**Everything is a Combatant: a body + items + passives. NOBODY has a base "swing."** Players
AND foes deal damage *only* through items and passive triggers, run through one resolver
(`resolveOps`). Do **not** reintroduce auto-attacks.

A **body** = HP + an affinity (Physical/Magical Power) + a tempo (cooldown identity) + one
autonomous passive. An **item** = an active you press (hotbar 1–9, cooldown, a damage `type`).
A **passive** = a body's recurring effect, on its own clock (`every:N`) or a trigger
(`hourglass`/`damaged`/`enter`).

## State (verified this session — all green, all committed to `main`)
- **349/349 logic tests** pass (`bun test/game.test.js`, pure/instant). **20/20 serve tests**,
  **multiplayer smoke**, and a **full economy+shop E2E** all pass against a freshly-booted server.
- **Combat legibility overhaul shipped** (see `STRATEGY.md`): lane **formation** (`formUp` — tanky
  front, squishy back), **prestock + greed** (rooms arrive pre-stocked with rank-and-file scaled to
  floor; players *invite* greedy armed picks — no ante gate), **AoE telegraphs** (`aoe` flag →
  "⚠ ALL LANES" + board tint), and **players render AS the body they wear** (mimics, gold ring + 👑
  for you). Every screen is screenshot-verified in `tools/shots/demo-*.png`.
- **Room escalation/enrage was built then REMOVED** at the user's call (combat does NOT speed up
  over time). Reinforcements (the pull grows) is the likely future form if a room-pressure clock
  returns. Don't re-add per-foe or global tempo ramps without asking.
- Working tree is **clean** (8 commits this session, top = `f07bb21`). `tools/bugdrive.js` was
  deleted by the user.
- **Power/affinity**: items carry `type:"physical"|"magical"` (utility untyped); bodies carry
  `phys`/`mag`; player item damage = base + matching Power. Warrior phys2 / Rogue phys1 /
  Mage mag2 / Cleric mag1; rookie neutral. Foe strike/heal passives scale with phys.
- **Cooldown tempo**: Mage `itemCdCap:45`, Rogue `itemCdMul:0.7`. Applied in `itemCd(inv,body)`.
- **Self-timed passives** (`every:N`) run on their own clock (`tickOwnTimers`); ramp shows as ▲N pips.
- **Four bosses** (Hydra/Litigation Lich/Djinn/King Mimic) via `bossForFloor`; verbs `dealEachLane`/
  `summonArmed`/`enter`, defensive `ward`/`dmgReduce` through `effectiveDamageTo`.
- **Exclusive body swap** popup (click your body card); a literal trade through the shared pool,
  persists via `homeBody`. `Q` quick-cycles.
- **Treasure economy** (the "one resource across spectrums" model — built & E2E-verified):
  - **Income = loot you DON'T take.** Each drop is worth Treasure = its `ante` (`itemTreasure`).
    Loot is free + first-come (`claimLoot`, no pick cap). Unclaimed loot **banks to shared Treasure
    when you leave** (`bankUnclaimedLoot` in `advanceLevel`/`descend`/`leaveShop`). The old flat
    `treasureReward` is GONE.
  - **Sink 1 — body tiers**: `buyTier`/`tiersReached` (unchanged).
  - **Sink 2 — kit space**: start `KIT_SLOTS_BASE`(5) → `MAX_KIT`(8), each slot dearer
    (`kitSlotCost`/`buyKitSlot`); `claimLoot`/`buyShopItem` cap on the player's `kitSlots`.
  - **Sink 3 — SHOP nodes** (NEW this session): node `n3` on the map is a `shop`. Enters a `shop`
    phase with a rolled shelf (`rollShopWares` = `SHOP_WARES`(5) distinct items priced at
    `itemTreasure×SHOP_COST_MUL`(3)). `buyShopItem` (price+space gated), `rerollShop` (flat
    `SHOP_REROLL_COST`(3)), `leaveShop`. Screenshot-verified.
- **Snapshot trims `bodies`** to display fields via `publicBodies()` (strips `passive` op-trees +
  `spawn`); `TIER_COST_MUL` piped as `tierCostMul` (no client mirror).
- **Heal model**: clearing a room full-heals + revives the party; **no mid-combat revive**.
- **E2E is fixed** (see Landmines for the why): visuals via Edge's native `--screenshot`
  (`tools/screenshot.js` + `shoot.ps1`); a real WS playthrough in `test/e2e.js`.

## Next step
**Close the boss/elite reward regression** — it's the one decided-needed, codeable-now gap.
Boss rooms (and god/auto-fill rooms) have no `draftedFoes`, so under the loot→Treasure model they
now drop **zero loot and zero Treasure** — a floor capstone that pays nothing. Pick a flavor from
`IDEAS.md` §9 (a fixed Treasure purse scaled by floor? guaranteed gear drop? a free tier unlock?)
and wire it into the `won` branch of `simulateTick` in `game.js`. Add a logic test + an `?demo`/E2E
check. (Parallel track: the user is reviewing `IDEAS.md` and will mark picks to wire next.)

## Active decisions (non-obvious why only)
- **Treasure is a SHARED bank** (bodies are party-wide tiers; kit slots are per-player; shop spend
  is shared). The user wants unclaimed loot "evenly split into per-player wallets" — DEFERRED until
  multiplayer loot exists (no-op in solo, which is all that's wired). The split is the only thing
  that changes when MP lands; the tradeoff/conversion logic transfers unchanged.
- **`bankUnclaimedLoot` fires on LEAVING a won room, not on win** — so you can keep claiming until
  you commit to the exit (claim-vs-bank is a deliberate choice point).
- **Shop is node `n3`** (was combat); enchants only roll on combat/elite (not shop/boss). Shop
  prices are `ante×3` (a markup over loot value) so "skip loot → bank → buy what you want" is a real
  loop. God mode still auto-fills (skips the shop) by design.
- **Screenshots use Edge's native `--headless --screenshot`, NOT Playwright.** There is **no Node
  on this box (Bun only)** and Playwright's CDP client hangs under Bun — so the old Playwright path
  was dead. The `?demo=` states render deterministically on load, so a one-shot Edge capture is
  exact. Playwright was removed from deps (zero deps now; no lockfile).
- **`test/e2e.js` retries the whole run up to 6×** and asserts only on a successful playthrough —
  because combat is real (foe-item RNG) and fight 2 wins ~⅔ of the time. This keeps it reliable
  ("never red") while staying a genuine end-to-end run. It takes a few seconds — not the fast loop.
- **`atk` repurposed, not deleted**: `effPhys = (c.phys ?? c.atk) + counters`; `effAtk` is an alias.
- **Power scaling is hero-only on items** (foe held-items don't scale with foe Power; only `counters`).
- **Tier purchase opens the WHOLE ante roster**; defeating only gates *purchasability* (`tiersReached`).
- **`unlockedBodies` accumulates all run**; only `startDraft` resets it (+ treasure + tiers + each
  player's bought `kitSlots`). `enterRoom` must NOT wipe it.
- **Bosses keep their bundled `hourglass` passive** (not converted to `every:N`).
- Cache-Control `no-store` on assets is a **dev** choice; revisit before production.

## Landmines
- **Boss & auto-fill rooms drop nothing** (loot/Treasure derive from `draftedFoes` gear). This is
  the open regression in Next step — don't "fix" it silently with a guessed number; it's a design call.
- **Sub-agent worktrees branch from `origin/main` (STALE), not local HEAD.** This session's work is
  committed locally but never pushed, so a worktree agent built against months-old code and its diff
  was unusable. Before spawning a worktree agent: `git push` (or have it branch from local HEAD), or
  just do the work inline. The agent's *report* is still useful as a blueprint.
- **Players now render via `foeSprite(bodyKey)`/`FOE_ICON`** in the canvas — class bodies were added
  to `FOE_ICON` (warrior/rogue/mage/cleric). A new playable body needs a FOE_ICON entry or it shows ❔.
- **Restart the server for game.js / server.js changes** — no `--watch`, game.js imported once at
  boot. `public/*` IS served fresh (no-store) → no restart. Kill stale servers first:
  `Get-Process bun | Stop-Process -Force` (a stale server serves old code and passes tests misleadingly).
- **No Node, Bun only. Playwright is gone.** Don't reintroduce a Playwright/CDP screenshot path —
  it hangs under Bun. Use `tools/shoot.ps1` (Edge native).
- **Snapshot `bodies` is a trimmed projection** (`publicBodies()`). If the client needs a NEW body
  field, add it to the projection or it won't ship.
- **Server-dependent suites need a running server.** The `test` script is now pure-only
  (`game.test.js`); `test:serve`/`test:smoke`/`test:e2e` assume `bun run server.js` is up on :3000.
- `DEMO_*` states in `public/client.js` are stale vs new fields (tempo/affinity), but the
  `?demo=won` and `?demo=shop` blocks ARE current. Only affects `?demo=` screenshots, not live play.
- The new between-rooms + shop UIs are screenshot-verified (`tools/shots/demo-won.png`,
  `demo-shop.png`) but not click-tested by a human — user should still eyeball live play.

## Pointers
- Run: `bun run server.js` → http://localhost:3000 (hard-reload once: Ctrl+Shift+R).
- Test: `bun test/game.test.js` (pure, instant) · with server up: `bun test/serve.test.js` ·
  `bun test/smoke.js` (2-client MP) · `bun test/e2e.js` (full economy+shop run over WS).
- Screenshots: `powershell -File tools/shoot.ps1 [state…]` (boots server, captures `?demo=` states
  to `tools/shots/demo-*.png`, cleans up). States: draft/stock/setup/combat/won/shop.
- DEMO god mode: room code `DEMO` skips draft, charges all items, huge HP, unlocks all bodies.
- Key files:
  - `game.js` — ALL pure logic + stats. `BODIES` (~42 incl. 4 bosses), `KIT`, `CLASSES`.
    Economy: `buyTier`/`tiersReached`/`tierCost`/`TIER_COST_MUL` · loot↔Treasure: `itemTreasure`/
    `pendingTreasure`/`bankUnclaimedLoot`/`claimLoot` · kit space: `kitSlotCost`/`buyKitSlot` ·
    shop: `rollShopWares`/`shopPrice`/`buyShopItem`/`rerollShop`/`leaveShop`/`SHOP_*`.
    Snapshot: `publicBodies` (trimmed). Power: `effPhys`/`effMag`/`itemCd`. Passives:
    `tickOwnTimers`/`runPassive`. Bosses: `bossForFloor`/`spawnBoss`/`effectiveDamageTo`. Map: `buildLevel`.
  - `server.js` — networking only (`Bun.serve` + WS, 100ms tick). Routes incl. `swapBody`/`buyTier`/
    `buyKitSlot`/`buyShopItem`/`rerollShop`/`leaveShop`/`claimLoot`/`dropItem`/`advance`/`descend`.
  - `public/client.js` — canvas renderer + overlays: `renderBetweenRooms` (won/loot) and
    `renderShop`; `?demo=` injected states for screenshots.
  - `public/inventory.js` (+`.css`) — right panel + body-swap modal + tier buttons.
  - `public/map.js` (+`map.css`) — left node map (🛒 shop node = `n3`).
  - `test/game.test.js` — the spec (337 checks); `test/e2e.js` — server-driven full run.
  - `IDEAS.md` — go-wild idea bank, tagged by buildability; awaiting the user's marked-up picks.
  - `tools/screenshot.js` — Edge-native screenshotter (Bun); `shoot.ps1` — boot+capture+cleanup.
  - `content.js` — original 118-card library (source for the wired bosses; not the live data).

## Working style (from the user)
Blunt pushback over agreement. Ship artifacts, not planning docs. Run the suite after every change,
never leave it red. He LOVES end-to-end testing (real run + screenshots, not just unit tests). He
playtests himself (sometimes on phone/remote — can't always see the browser; send screenshots).
Delete guardrail: `rm`/`Remove-Item` are blocked at the permission layer — ask the user to run
`! rm <path>` for deletions. Iterate in tight loops.
