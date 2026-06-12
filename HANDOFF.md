# HANDOFF — King Mimic — 2026-06-11 23:05 (BOSS_SPEC_V1 IMPLEMENTED + verified; next: owner playtest / redial placeholders)

> Pick-up doc for a cold instance. King Mimic is a soft-real-time co-op browser roguelike:
> N lanes (= player count, 1–4), defend the shared Caravan, wear the bodies of foes you
> defeat. SLICE_SPEC_V2 survived the first remote 3P playtest (2026-06-10). **BOSS_SPEC_V1
> (the four V2 floor bosses) is now FULLY IMPLEMENTED, test-pinned, and committed** —
> engine `c27bd4f`, client `fbaaec1`. Nothing in the spec checklist is outstanding.

## State (verified this session unless marked)
- **All six suites green against the live rebuilt server**: `bun test/game.test.js`
  **243/243** (was 174; +69 boss checks — one block per mechanic + the xy 1..12 scaling
  grid) · smoke · smoke4 · reconnect · e2e · fuzz (3×80 full runs through the NEW bosses,
  zero violations). The old fuzz flake (solo melee stranded in a ≥3-lane boss room) is
  structurally dead — boss rooms are lane-count-agnostic now.
- **The four bosses work end-to-end**: Hydra (on-damaged heads w/ lane attribution +
  escalating head clock), Litigation Lich (OBJECTION cap-1 / recess −1 stances on a 10s
  clock + bone-wizard lane-AoE summons), Djinn of Deals (lane-bound, teleports, all-lanes
  scorch, every-3rd-item conjures an item-entity), Kleptomaniac Kraken (steal→hotbar lock
  →kill-to-rescue + replenish-to-cap tentacle wall). King Mimic defined, NEVER spawns.
- **Back-line architecture live**: Hydra/Lich/Kraken are `room.boss` — span all lanes,
  caravan-mirror banner up top; melee reaches them only when the attacker's lane is clear;
  every hit carries the attacker's lane. Djinn is an ordinary lane foe that relocates.
- **Client verified by screenshot** (tools/shots/demo-boss.png, demo-boss2.png, incl. a
  470px touch shot): boss banner w/ HP + clock bars + stance telegraph band, kraken-pink
  STOLEN hotbar/inventory lock, "Stolen Bow" entity card, map tooltip names the floor's
  boss. `?demo=boss` (Kraken) and `?demo=boss2` (Lich) fixtures exist for future UI work.
- Server LIVE at http://localhost:3000, restarted on the new code. Working tree clean
  except known untracked scratch (see Landmines). 35 commits ahead of origin — push is
  the owner's call.
- NOT verified: a live HUMAN boss fight (only fuzz/e2e bots have fought them), and the
  Hydra/Djinn at 4P live pacing. That's exactly what the next playtest is for.

## Next step
**Owner playtest of the three boss floors, then redial the [PLACEHOLDER] numbers.** All
first-draft dials sit in ONE place: `BOSS_DEFS` in game.js (~line 800: head/stance/wizard/
teleport/aoe/steal/replenish clocks, djinn everyNthItem, kraken capPerPlayer) plus the
boss `maxHp` bases in BODIES (hydra 20 / lich 14 / djinn 18 / kraken 18 — per budget
unit). To drive a boss room by hand: start a run solo, fight to the floor's boss node —
or screenshot-iterate with `?demo=boss`/`boss2`. Tunnel command below for remote testers.

## Active decisions (do NOT re-litigate)
- **BOSS_SPEC_V1.md is owner canon; [PLACEHOLDER] tags = my gap-fills** — owner overwrites
  them without debate. Notable fills he should rule on: hydra heads BITE (rat-rate 1/3s —
  spec only said 1/1 walls; toothless heads made "punishes slow parties" a no-op),
  tentacles do NOT attack (pure wall; Kraken's pressure = steals), Kraken wall scales
  (cap = 2×players; if canon "8" means 8 even solo, delete one line in spawnBoss),
  Lich opens in OBJECTION, Djinn conjures damaging common/uncommons only.
- **Scaling contract**: bossBudget = players × floor multiplies boss maxHp base; summon
  counts ride players (wizards = party size, wall = 2×players); only the Kraken replenish
  clock rides floor (−2s/floor) — other clocks are flat per the spec's own first drafts.
- **Mechanics live in spawn-time `clocks`, NOT body `passive` op-trees** — every knob can
  read the budget, and the same tick path serves room.boss and the lane-bound Djinn.
  `fireBossClock` is the whole boss vocabulary; `BOSS_DEFS` is the only dial panel.
- **Lich stances reuse the engine's Math.max(1,…) convention** (recess −1 floors at 1 for
  ALL damage, not just school-tagged) — matches the V1 lich precedent and the spec's
  "a point always slips through".
- **Stolen-slot lock lives on the inv ENTRY (`iv.stolen`)**, restored on entity death via
  `enemy.restoreTo`; locks can't leak across rooms because enterRoom rebuilds inv.
- **Boss kills do NOT feed unlockedBodies** (bosses are never adoptable); boss rooms still
  pay V=0 income (pre-existing behavior, untouched — owner may want boss bounties later).
- **Rotation = 3 distinct of 4, seeded in startDraft** (`room.bossDraw`), lazily seeded
  for hand-built rooms; snapshot map.bossName lets the preview name the floor.
- Standing rules that still hold: V2 reuses V1 names w/ different mechanics — never
  resurrect V1 numbers from git · difficulty tuning is the OWNER's · feel/juice deferred ·
  damage preview shares resolver math (boss clock bars carry `dmg` from the same constant
  the resolver uses) · no auto-attack bars · melee never follows the reticle · weapon
  floor ≥1 for school-tagged deals · summon tokens (heads/tentacles/wizards/item-entities)
  HP-knob EXEMPT · cdMult baked into every clock at creation.

## Landmines
- Restart the server for game.js/server.js edits (imported once at boot); KILL STALE BUN
  FIRST or live tests pass misleadingly. `public/*` serves fresh, no restart.
- **Bun only. No Node, no Playwright.** Background `bun` via the Bash tool exits 127 —
  use the detached PowerShell form below. `tools/shoot.ps1` KILLS the server when done.
- **The tunnel makes localhost PUBLIC while it runs** — including room DEMO (god mode).
  Kill cloudflared when not playtesting. Killing it does NOT touch the game server.
- `room.boss` is NOT in room.lanes — anything iterating lanes for "all foes" misses it.
  Win check, stall tracker, allFoes/ensureTarget, foesLeft HUD already account for it;
  NEW code that sweeps foes must too. `foeCount()` deliberately counts lanes only
  (King Mimic ward semantics).
- The Djinn counter hooks the END of useItem and only counts ops-bearing items; if items
  ever gain server-side use paths outside useItem, the counter misses them.
- **PowerShell 5.1 commit hygiene**: `git commit -m` with embedded quotes silently splits
  args → use `git commit -F <file>` written `-Encoding ascii` (BOM polluted d630fbd).
  Also: `Remove-Item` (even on `env:` vars) trips the permission guardrail — ask the owner.
- Tests pin `setCdMult(1)`/`setHpMult(1)`; live runs cdMult 2. Boss clocks bake cdScale at
  CREATION — a clock built before a cdMult change keeps the old pace (fine live: bosses
  spawn per room; matters if a test flips the knob mid-fight).
- Demo fixtures carry display-only numbers; `?demo=boss/boss2` are V2-fresh. Live bars get
  resolver math. Phones cache the client — tell players to pull-to-refresh after shipping.
- `rm` is permission-guarded — ask the owner (`! rm <path>`). Scratch awaiting deletion:
  `probe_lanes.mjs`, `probe_latejoin.mjs`, `.git/COMMIT_MSG_TMP`, `tools/tunnel.out`,
  `tools/shots/_*.png` (tunnel.log recreated on next tunnel).
- Test-bot contracts: smoke/smoke4/reconnect each place one invite; e2e's solo bot stocks
  the CHEAPEST slot; e2e retries absorb spam-bot deaths.

## Pointers
- Run (detached, survives turns):
  `powershell -Command "Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Process bun -ArgumentList 'run','server.js' -WorkingDirectory 'C:\Users\dakot\king-mimic' -WindowStyle Hidden"`
- Tunnel (new random URL each start; URL appears in the log):
  `Start-Process "$env:ProgramFiles (x86)\cloudflared\cloudflared.exe" -ArgumentList 'tunnel','--url','http://localhost:3000' -WindowStyle Hidden -RedirectStandardError tools\tunnel.log -RedirectStandardOutput tools\tunnel.out`
- Test: `bun test/game.test.js` (pure) · `bun run test/{smoke,smoke4,reconnect,e2e,fuzz}.js`
  (live server required) · screenshots: `bun tools/screenshot.js boss boss2 …` with W/H/QS
  envs against a running server (phone: W=470 H=844 QS=touch=1).
- Key files: `BOSS_SPEC_V1.md` (owner canon + checklist, all 12 items done) · `game.js`
  (BOSS_DEFS + spawnBoss/fireBossClock/tickBossClocks/bossOnDamaged/spawnItemEntity/
  krakenSteal ~lines 790–960; boss bodies in BODIES ~77–110; stances in effectiveDamageTo;
  djinn counter at useItem; boss block in snapshot) · `test/game.test.js` (§BOSS_SPEC_V1
  at the bottom — bossRig helper + per-mechanic blocks) · `public/client.js`
  (drawBossBanner above drawFoeInspect; stolen hotbar in drawHotbar; `?demo=boss/boss2`
  fixtures) · `public/inventory.js` (STOLEN status) · `public/map.js` (boss-name tooltip).
