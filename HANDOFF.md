# HANDOFF — King Mimic — 2026-06-06

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
A **passive** = a body's recurring effect, on its own clock or a trigger.

## State (verified this session — all green)
- **319/319 logic tests** pass (`bun test/game.test.js`). **20/20 serve tests** pass against a
  freshly-booted server. **Multiplayer smoke passes** (`bun test/smoke.js`). Server boots clean.
- **EVERYTHING IS COMMITTED** now (3 commits on `main`): the prior session blob, a tech-debt
  healing pass, and the reworked Treasure economy. Working tree clean except dead `tools/bugdrive.js`
  (the delete guardrail blocks `rm`; user to remove with `! rm tools/bugdrive.js`).
- **Power/affinity system**: items carry `type: "physical"|"magical"` (utility items untyped);
  bodies carry `phys`/`mag`; a player's item damage = base + matching Power. Warrior phys 2,
  Rogue phys 1, Mage mag 2, Cleric mag 1; rookie neutral. Foe strike/heal passives scale with phys.
- **Cooldown tempo**: Mage `itemCdCap: 45` (tames big spells), Rogue `itemCdMul: 0.7` (spammer).
  Applied in `itemCd(inv, body)`. Player-tested + felt distinct (user confirmed).
- **Self-timed passives**: a passive with `every:N` runs on its own clock (`tickOwnTimers`),
  decoupled from the body timer and from player actions. The 6 ramp families were converted;
  ramp shows as yellow **▲N** pips on the foe card; the ⚔ number shows *live* Physical Power.
- **Four bosses wired** (Hydra / Litigation Lich / Djinn / King Mimic). Boss nodes spawn the
  floor's designed boss (`bossForFloor`, rotates then loops); new verbs `dealEachLane`,
  `summonArmed`, `enter` trigger, `ward`/`dmgReduce` via `effectiveDamageTo`. ~42 boss tests.
- **Exclusive body swap** via a full-screen popup (click your body card). A literal trade: your
  old body is released to the shared pool, the chosen one becomes you (persists via `homeBody`).
  A body worn by another player is greyed/off-limits. `Q` still quick-cycles.
- **Treasure economy (REWORKED this session — the "one resource across spectrums" model):**
  - **Income = loot you DON'T take.** Each foe-dropped item is worth Treasure = its `ante`
    (`itemTreasure`). After a win, loot is **free + first-come** (`claimLoot`, no more pick cap).
    Whatever nobody claims **converts to shared Treasure when the party leaves** the room
    (`bankUnclaimedLoot`, fired in `advanceLevel`/`descend`). Snatching gear directly trades
    against the purse — that's the greed tension. The old flat `treasureReward` payout is GONE.
  - **Spend sink 1 — body tiers** (unchanged): defeat a foe → its ante-tier is REACHED
    (purchasable); spend Treasure to unlock the WHOLE tier (`buyTier`/`tiersReached`).
  - **Spend sink 2 — kit space** (NEW): players start at `KIT_SLOTS_BASE` (5), buy up to
    `MAX_KIT` (8) with Treasure, each slot dearer than the last (`kitSlotCost`/`buyKitSlot`).
    `claimLoot` caps on the player's purchased `kitSlots`.
  - Client: the between-rooms screen shows 💰 balance, each drop's value + the pending
    conversion, free-claim (disabled when kit full), and a "+1 Kit Slot · 💰cost" button.
  - `TIER_COST_MUL` is no longer mirrored in the client — it's piped via snapshot `tierCostMul`.
- **Heal model**: clearing a room **full-heals + revives** the whole party. **No mid-combat
  revive** (down = out until the room is cleared).
- **Summons** (rat, flagged `summon: true`) are never adoptable and don't unlock on kill.
  Player-side rat allies render as 🐀 glyphs (written + parse-checked, NOT visually verified).
- Room-hover shows the enchant (pre-rolled per node). Server sends `Cache-Control: no-store`
  on assets (dev: kills stale-cache pain during iteration).

## Next step
**Playtest the new economy** and tune the blind-guess numbers — then make 3 design calls:
- **Economy feel / numbers**: `itemTreasure` (= item ante), `KIT_SLOTS_BASE`/`KIT_SLOT_COST_MUL`,
  `TIER_COST_MUL`. Does the claim-vs-bank tension bite? Is early-game Treasure too starved now
  that the flat payout is gone? Iterate in tight loops; user playtests and reports feel.
- **DECISION — boss/auto-fill room rewards.** Boss rooms (and god/auto-fill rooms) have no
  `draftedFoes`, so under the new model they drop **zero loot and zero Treasure** — a regression
  vs the old flat reward. Floor capstones paying nothing feels bad. Decide what a boss drops
  (a fixed Treasure purse? guaranteed gear? a tier unlock?). NOT guessed — left for the user.
- **DECISION — per-player Treasure split (multiplayer).** User wants unclaimed loot "evenly
  split between them." Currently it's a SHARED bank (identical in solo, which is all that's
  wired). When MP loot lands, split the bank into per-player wallets.
- **FUTURE — shop nodes.** User floated "shops we develop as later nodes" to spend Treasure on
  chosen items. Not built — needs a design pass (stock? prices? reroll?) before coding.
- Old boss-HP tuning still pending: boss `maxHp` in `BODIES` (40/30/34/50) predates Power scaling.

Also pending visual check (assistant could not drive a browser headlessly this session): eyeball
the new between-rooms screen (`?demo=won` or live) — value chips, pending-💰 line, kit-slot button.

## Active decisions (non-obvious why only)
- **`atk` was repurposed, not deleted.** `effPhys(c) = (c.phys ?? c.atk) + counters` — foe rows
  still carry legacy `atk:` as a fallback (intentionally NOT mass-renamed; low-churn). `effAtk`
  is now just an alias of `effPhys`. Counters ("+1") ramp Physical Power.
- **Power scaling is hero-only on items.** Players' items scale with their Power; foe held-items
  do NOT scale with the foe's body Power (only `counters` boost them). Deliberate v1 simplification
  — Power is a thing *players buy*; wiring foe-item scaling would churn every foe's threat math.
- **Tier purchase opens the WHOLE ante roster** (even bodies you never defeated). This is the
  literal reading of the user's spec ("unlock a 4-ante body → all 4-ante bodies free"). Defeating
  only gates *purchasability* (`tiersReached`). Trades some per-body mimic flavor for a clean tiered economy — user's explicit call.
- **Tier-0 bodies** (rookie + class bodies, no `ante`) are gated by pool membership, not tier
  purchase. So you can only become another class if it's been released into the pool.
- **`unlockedBodies` accumulates across the whole run**; only `startDraft` (a NEW run) resets it
  (+ treasure + tiers + each player's bought `kitSlots`). `enterRoom` must NOT wipe it — that was
  the "defeated foes not stored" bug.
- **Treasure is a SHARED bank** spent on per-player kit slots and party-wide body tiers. The
  user's "even split into per-player wallets" is deferred until multiplayer loot exists (no-op in
  solo, which is all that's wired). `bankUnclaimedLoot` fires on LEAVING a won room, not on win —
  so you can keep claiming until you commit to the exit.
- **Bosses keep their bundled `hourglass` passive** (gain +1 AND chip lanes together); they were
  deliberately NOT converted to `every:N` timers.
- Cache-Control no-store is a **dev** choice; revisit before production.

## Landmines
- **Boss & auto-fill rooms drop nothing now.** Loot/Treasure derive from `draftedFoes` gear;
  boss rooms (and god/auto-fill rooms) have none → zero reward. See the boss-reward DECISION in
  Next step. Don't treat the empty boss payout as a bug to "fix" silently — it's a design call.
- **Restart the server for game.js / server.js changes** — no `--watch`, and game.js is imported
  once at boot. Client assets (`public/*`) ARE served fresh (no-store) → no restart for those.
  Kill stale servers first: PowerShell `Get-Process bun | Stop-Process -Force` (EADDRINUSE = a
  stale server is still up; a stale one will silently serve old code and pass tests misleadingly).
- **Snapshot `bodies` is now a trimmed projection** (`publicBodies()` — strips `passive` op-trees
  and `spawn`). If the client ever needs a NEW body field, add it to the projection or it won't
  ship. Display fields (name/color/maxHp/ante/phys/mag/affinity/passiveText/tempo) are all kept.
- `tools/bugdrive.js` is dead but STILL ON DISK — the delete guardrail blocked `rm`. Remove with
  `! rm tools/bugdrive.js`. The redundant agent worktree + its branch were removed this session.
- `DEMO_*` hardcoded states in `public/client.js` are stale vs new fields (tempo, affinity, etc.)
  but the `?demo=won` loot block WAS updated to the new shape. Only affects `?demo=` screenshots.
- Screenshots: Playwright hangs under Bun. Working approach = render an injected `?demo=` state
  and screenshot via Edge headless (`tools/shoot.ps1`, drives live draft→combat only).
- The new between-rooms economy UI is written + contract-verified (snapshot fields all present and
  correct end-to-end) but NOT visually click-verified by the assistant — user should eyeball.

## Pointers
- Run: `bun run server.js` → http://localhost:3000 (then hard-reload once: Ctrl+Shift+R).
- Test: `bun test/game.test.js` (pure, instant) · `bun test/serve.test.js` (server must be up)
  · `bun test/smoke.js` (server up, 2-client multiplayer).
- DEMO god mode: a room code `DEMO` skips draft, charges all items, huge HP, unlocks all bodies.
- Key files:
  - `game.js` — ALL pure logic + stats. `BODIES` (~42, incl. 4 bosses), `KIT` (items, `type`-tagged),
    `CLASSES`. Economy: `swapBody`/`canSwapTo`/`buyTier`/`tiersReached`/`tierCost`/`TIER_COST_MUL` ·
    loot↔Treasure: `itemTreasure`/`pendingTreasure`/`bankUnclaimedLoot`/`claimLoot` ·
    kit space: `kitSlotCost`/`buyKitSlot`/`KIT_SLOTS_BASE`/`MAX_KIT`. Snapshot: `publicBodies` (trimmed).
    Power: `effPhys`/`effMag`/`powerFor`/`itemCd`. Passives: `tickOwnTimers`/`runPassive`.
    Bosses: `bossForFloor`/`spawnBoss`/`effectiveDamageTo`/`foeCount`.
  - `server.js` — networking only (`Bun.serve` + WS, 100ms tick). Routes incl. `swapBody`, `buyTier`,
    `buyKitSlot`, `claimLoot`, `dropItem`, `advance`, `descend`.
  - `public/inventory.js` (+`.css`) — right panel + body-swap POPUP (modal at document.body,
    `.km-body-modal` styles are global, not `#inventory`-scoped). Treasure header + tier buttons.
  - `public/client.js` — canvas renderer (ally 🐀 glyphs, boss crown/ward, ramp ▲, live ⚔ Power).
  - `public/map.js` — left node map; room-hover shows the enchant.
  - `content.js` — original 118-card library; `BOSSES` here were the source for the wired bosses.
  - `test/game.test.js` — 305 checks (the spec; read it to understand intended behavior).

## Working style (from the user)
Blunt pushback over agreement. Ship artifacts, not planning docs. Run the suite after every
change, never leave it red. He playtests himself (sometimes on phone/remote — he can't always see
the browser; send screenshots when needed). Iterate in tight loops.
