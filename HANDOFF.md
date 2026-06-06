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
- **305/305 logic tests** pass (`bun test/game.test.js`). **20/20 serve tests** pass against a
  freshly-booted server. Server boots clean. (Multiplayer smoke passed earlier in the session.)
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
- **Tiered Treasure economy**: clearing a room banks **Treasure** (shared); defeating a foe
  REACHES its ante-tier (purchasable); spending Treasure unlocks the WHOLE tier (every body of
  that ante, even undefeated). Popup shows 💰 balance + "Unlock Tier N · 💰cost" buttons.
- **Heal model**: clearing a room **full-heals + revives** the whole party. **No mid-combat
  revive** (down = out until the room is cleared).
- **Summons** (rat, flagged `summon: true`) are never adoptable and don't unlock on kill.
  Player-side rat allies render as 🐀 glyphs (written + parse-checked, NOT visually verified).
- Room-hover shows the enchant (pre-rolled per node). Server sends `Cache-Control: no-store`
  on assets (dev: kills stale-cache pain during iteration).

## Next step
Playtest and **tune the blind-guess balance numbers**: Treasure pacing (`TIER_COST_MUL`,
`treasureReward()` in game.js) and boss HP (boss `maxHp` in `BODIES` — 40/30/34/50, set before
Power scaling existed, almost certainly off). Iterate in tight loops; user playtests and reports feel.

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
  (+ treasure + tiers). `enterRoom` must NOT wipe it — that was the "defeated foes not stored" bug.
- **Bosses keep their bundled `hourglass` passive** (gain +1 AND chip lanes together); they were
  deliberately NOT converted to `every:N` timers.
- Cache-Control no-store is a **dev** choice; revisit before production.

## Landmines
- **NOTHING is committed this session.** All work is uncommitted in the working tree (and green).
  Commit before any risky git op. (Commit only when the user asks.)
- **Restart the server for game.js / server.js changes** — no `--watch`, and game.js is imported
  once at boot. Client assets (`public/*`) ARE served fresh (no-store) → no restart for those.
  Kill stale servers first: PowerShell `Get-Process bun | Stop-Process -Force` (EADDRINUSE = a
  stale server is still up; a stale one will silently serve old code and pass tests misleadingly).
- **Treasure economy is PARTIAL.** Treasure currently buys ONLY body tiers. Items still use the
  old `LOOT_PICKS` claim system; the "spend on items / slots-levels" spectrums from the design
  conversation are NOT built. The "one resource across multiple spectrums" vision is half-realized.
- `TIER_COST_MUL = 5` is duplicated in `public/inventory.js` (for button labels) and `game.js`.
  Keep in sync, or pipe the cost through the snapshot.
- Redundant agent worktree at `.claude/worktrees/agent-ab92e5a7acdcda5a1` (boss work already
  merged into the main tree). Safe to `git worktree remove`; left in place due to a delete guardrail.
- `DEMO_*` hardcoded states in `public/client.js` are stale vs new fields (tempo, treasure,
  affinity, etc.). Only affects `?demo=` screenshots, not live play.
- Screenshots: Playwright hangs under Bun. Working approach = render an injected `?demo=` state
  and screenshot via Edge headless (`tools/shoot.ps1`). `tools/bugdrive.js` is dead — safe to delete.
- The rat-ally glyph render and the latest Treasure popup are written + parse-checked but the
  *visual* of the newest changes isn't click-verified by the assistant — user should eyeball.

## Pointers
- Run: `bun run server.js` → http://localhost:3000 (then hard-reload once: Ctrl+Shift+R).
- Test: `bun test/game.test.js` (pure, instant) · `bun test/serve.test.js` (server must be up)
  · `bun test/smoke.js` (server up, 2-client multiplayer).
- DEMO god mode: a room code `DEMO` skips draft, charges all items, huge HP, unlocks all bodies.
- Key files:
  - `game.js` — ALL pure logic + stats. `BODIES` (~42, incl. 4 bosses), `KIT` (items, `type`-tagged),
    `CLASSES`. Economy: `swapBody`/`canSwapTo`/`buyTier`/`tiersReached`/`treasureReward`/`tierCost`/
    `TIER_COST_MUL`. Power: `effPhys`/`effMag`/`powerFor`/`itemCd`. Passives: `tickOwnTimers`/`runPassive`.
    Bosses: `bossForFloor`/`spawnBoss`/`effectiveDamageTo`/`foeCount`.
  - `server.js` — networking only (`Bun.serve` + WS, 100ms tick). Routes incl. `swapBody`, `buyTier`.
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
