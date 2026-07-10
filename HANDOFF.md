# HANDOFF — King Mimic — 2026-07-10 (post-mega-batch, owner switching to solo playtest)

> Browser co-op deckbuilder roguelike (**moxie + cards**, full player/foe symmetry). Owner **Dakota**
> authors all DESIGN by hand (bodies, cards, numbers, effects); agents do ENGINE/rendering/tests only
> and FLAG every number he didn't state. Branch **`feat/room-draft-overhaul`**. Working style this
> session: **fan out parallel worktree agents, integrate at the end, one restart to deploy** — he
> wants agents doing the work and the chat kept free for his rapid-fire notes ("don't lock up").

## ⚠️ SERVER STATE — read this first
- **Running `:3000` server = commit `0a1676f`** (deployed via restart during the owner's 3-player LAN run).
- **HEAD / disk = `9f5a0b3`** = `0a1676f` + the **Killionaire start-moxie 4→3 nerf**, which is **committed & pushed but NOT LIVE** (staged for the next restart).
- So the running game still has Killionaire at 4 moxie. **To deploy the nerf (and confirm the current build), restart `:3000`** — safe now that MP is done and he's going solo. `public/*` is served per-request (client changes need only a hard-refresh); **engine changes need a server restart, and NEVER restart while a game has live connections** (it wipes in-memory rooms).

## State (VERIFIED at `9f5a0b3` — game 1184 · squad 22 · fuzz 60 · telemetry 21 green; owner + 2 friends real-playtested `0a1676f` in a live 3-player LAN run)
The whole day's batch (9 agent branches + Big Wizard Hat) is merged, tested, pushed, and — except the Killionaire nerf — LIVE:
- **31 retired first-set cards DELETED from KIT** (blade/fire/darkness/blizzard/omnislash/gigaCast/slimeCrown/… — the leak is gone at the source). Kept the 6 `t*` token casts.
- **New Blizzard** `oBlizzard` (⚡6 ranged: deal 1 to your lane + drain moxie = damage dealt) · **Ice reworked** (⚡3: deal 1 + drain moxie = damage) — both use a new `delay {ofDealt}` op · **Big Wizard Hat** `oBigWizardHat` (⚡5: this fight all ranged cards +3). PLAYER_POOL = **69**.
- **Modal +melee/+ranged**: Sharpened Edges & Demon Form now PICK melee-or-ranged on play (foes auto-pick by body archetype via `modalKind`/`FOE_ARCHETYPE`); **Wizard Hat deleted** (merged in); **Sage Mode → lasting heal**; **Lion Lance → +1 both**; **Power Up → ⚡3**. Client pick-popover reused (`meleeRanged` branch).
- **Sphinx** = 14-HP **elite**, passive spend-6 → deal (1+ranged) to its lane + heal + **overheal→shield** (opt-in `overheal` op) · **Royal Rat** trigger @3 · **"you act only through items"** flavor line removed from body cards.
- **Shield damage counts as "damage taken" everywhere** (Jesterplate was already fine; the real fix was **Berserker's self-"take 1"** → new `selfDamage` helper) · **Crystal Ball** no longer grants a permanent 4th card (tutored card takes the played slot) · **Grand Spirit +50%** (attacker 6→9hp/4→6dmg, caster 4→6hp/2→3dmg, tank 12→18hp) · **level-up HP → 4** (on EVEN levels only — L2/L4/L6…).
- **Multiplayer leave-anytime + auto-drop departed seats** (`seatPresent`, `dropSeat`, `{type:"leave"}`) — a stuck co-op vote from a friend leaving can no longer trap the party. · **Mobile controls no longer overlap foe HP/cast bars** (style.css padding).
- **Telemetry HEALED & confirmed in real 3-player data**: every line carries `harness:false, bots:0, party:N`; `loot_offer` (what was shown) + attributed `loot_claim {key, by, bot}` now exist. Human runs are cleanly separable from bot/harness runs.

## Next step
**Restart `:3000` to deploy `9f5a0b3`** (gives his solo playtest the Killionaire-3 nerf + guarantees the current build), confirming no live connection first — then take his solo-playtest notes and fix them via **parallel worktree agents** (create a worktree per task off `feat/room-draft-overhaul`, dispatch background agents, integrate + one restart). Restart recipe: find the `:3000` listener PID (`Get-NetTCPConnection -LocalPort 3000 -State Listen`), `Stop-Process` it, `Start-Process bun run server.js -WorkingDirectory <repo> -WindowStyle Hidden`, poll for the new listener + HTTP 200.

## Active decisions (non-obvious why only)
- **Retired-card leak fixed by DELETING the 31 cards from KIT** (owner chose delete over a PLAYER_POOL filter). Consequence: since every current card is `ante 1`, **`RICH_ITEM_POOL` and `RARE_POOL` are now EMPTY** — the boss payday shelf / "rich" foe gear drop nothing until the owner authors value-≥2 cards. Intended end-state, but **the boss reward is now a hole** (his call).
- **Overheal (excess heal → shield) is OPT-IN on the Sphinx only**, not global — owner flagged global-vs-scoped and hasn't ruled.
- **Engine deploy = restart; client deploy = hard-refresh.** They play on **localhost / LAN `http://10.0.0.28:3000`** (host uses localhost); the cloudflared tunnel is secondary and its URL rotates on every restart.
- **King GAMBIT** (earlier today) makes King draw random strong cards (Power Word Gun / Continent Club / Black Hole / Meteors / Glacius) and logs each play — but his **stance still caps damage to 1**, so he's now *lethal AND hard to kill*. Owner hasn't ruled loosen-vs-leave.

## Landmines
- **THE #1 PLAYTEST PAIN — FLOOR-1 DIFFICULTY.** Owner + friends got wrecked on floor 1 by **two Killionaire ELITES carrying ⚡10 Continent-Club + ⚡10 Grand-Spirit + Omnislash + Sage-Mode**. Elite bodies + strong new cards spawn as floor-1 foes. **OPEN dial (his call); recommended: keep elites + rich gear off floor 1** so it stops out-scaling floors 2-4.
- **~15 worktrees** under `.claude/worktrees/` — ALL merged into `9f5a0b3`, safe to prune, but **rm/worktree-remove needs owner approval** (delete guardrail).
- **Process cruft**: many stale `bun` / `cloudflared` / `node` processes + leftover demo servers (ports 3777, 3989, 3199…) from the day's restarts + agent harness runs. The **newest `bun` owns `:3000`** — don't bulk-kill (process-kill safety); identify the specific PID.
- **Telemetry harness-tool edits DEFERRED**: `tools/shoot.mjs` / `mp-playtest.mjs` / `tap-probe.mjs` still need `?harness=1` added so their runs are tagged `harness:true` and excluded from human pick-analysis (exact one-line edits are in the `wt-telemetry` branch report). Until then, `shoot.mjs` runs (which write to the SAME `telemetry.jsonl`) pollute the human filter — distinguishable only by `party:1` + timing.
- **run_start telemetry doesn't fire on the FIRST draft of a fresh room** (telemetry agent flag) — 1-line fix: set `r._telePhase = r.phase` in the `create` handler before `startDraft`. So draft-offer pick-rate is missing for most solo runs' first draft.
- **`test/balance.js` and `test/reconnect.js` are broken at baseline** (pre-existing, reference removed bodies/legacy flows) — NOT in the verify bar, don't chase them.
- A cross-buff ramp test was made deterministic by pushing a synthetic `oArcane` (fragile "replay the same card" pattern exposed by the card migration; the hand-refill code is verified unchanged — not a game bug).

## Open owner decisions (queued, none blocking)
Floor-1 dial (top) · King stance-cap (loosen vs leave) · empty boss reward shelf · overheal global-vs-Sphinx · Sage Mode heal-2/⚡3 duplicates Trollskin Tiara · Rainblow cast-time double-ranged trigger · mp-leave grace-period before dropping a *disconnected* (vs left) seat · number tunings (Blizzard/Ice base 1, Sphinx spend/dmg, Demon Form/Sage costs).

## Pointers
- Run: `bun run server.js` → `:3000` (LAN `http://10.0.0.28:3000`). Tunnel (secondary): cloudflared `--url http://localhost:3000`.
- Test: `bun test/game.test.js` (~1184) · `bun test/squad.test.js` (22) · `bun test/fuzz.js` (60) · `bun test/telemetry.test.js` (21).
- Harnesses (untracked by design — never `git add`): `node tools/shoot.mjs` (real solo, boots its OWN random-port server) · `node tools/mp-playtest.mjs` (co-op).
- Owner deliverables (this session): session review `https://claude.ai/code/artifact/0517fd83-c6ef-48ac-8958-8fbc3d2b61d5` · card catalog `https://claude.ai/code/artifact/8c34ce32-5e92-4e38-87b9-5f03726aa646`.
- Key files: `engine/kit.js` (KIT — retired gone, Blizzard/Ice/Big-Wizard-Hat, modal buffs, `delay ofDealt`) · `engine/bodies.js` (Sphinx elite, Killionaire, Royal Rat, Grand-Spirit stats) · `engine/combat.js` (`modalKind`/`modalBonus`, `applyHeal` overheal, `selfDamage`, delay-ofDealt) · `engine/cards.js` (PLAYER_POOL 69) · `engine/lobby.js` (`seatPresent`/vote, now-empty RICH/RARE pools, FOE_ARCHETYPE) · `server.js` (`leave`/`dropSeat`, telemetry `harness`/`bots`/`loot_offer`) · `public/client.js` (modal pick popover, leave wiring, `HARNESS` url param) · `CLAUDE.md` (operating rules).
- Open with **"point me at HANDOFF.md"**.
