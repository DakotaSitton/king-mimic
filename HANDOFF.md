# HANDOFF — King Mimic — 2026-06-12 00:05 (BOSS_SPEC_V1 implemented + FIRST OWNER PLAYTEST FEEDBACK shipped)

> Pick-up doc for a cold instance. King Mimic is a soft-real-time co-op browser roguelike:
> N lanes (= player count, 1–4), defend the shared Caravan, wear the bodies of foes you
> defeat. SLICE_SPEC_V2 survived the first remote 3P playtest (2026-06-10). **BOSS_SPEC_V1
> (the four V2 floor bosses) is FULLY IMPLEMENTED, test-pinned, and committed** — engine
> `c27bd4f`, client `fbaaec1`, first owner-playtest feedback round `5e02c89`. The owner
> phone-played the Hydra tonight and redialed it live (see State).

## State (verified this session unless marked)
- **All six suites green against the live rebuilt server**: `bun test/game.test.js`
  **245/245** (was 174; +71 boss checks — one block per mechanic + the xy 1..12 scaling
  grid) · smoke · smoke4 · reconnect · e2e · fuzz (full runs through the NEW bosses,
  zero violations). The old fuzz flake (solo melee stranded in a ≥3-lane boss room) is
  structurally dead — boss rooms are lane-count-agnostic now.
- **Owner playtest round 1 (5e02c89, all owner CANON — placeholders retired)**: Hydra
  head waves START at 5 (+1 per trigger stays: 5,6,7…) and heads are exact rat-clones
  (1/1, bite 1 every 2s); stock palette cards show body ⚔/✨ Power; mobile body swap
  fixed — the won/shop overlays cover the inventory panel on phones, so both overlays
  now carry a "🎭 Swap body" button that opens the (z-9999) body modal via
  `KM.openBodyModal` (inventory.js). Verified by 470px screenshots (demo-stock/won).
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
- Server LIVE at http://localhost:3000, restarted on the new code. **Tunnel KILLED at
  session end** (2026-06-12 ~00:00, security rule) — a new one mints a DIFFERENT URL;
  phone players must also pull-to-refresh after client changes. Working tree clean
  except known untracked scratch (see Landmines). ~37 commits ahead of origin — push is
  the owner's call.
- Owner verdict so far: only the HYDRA has been human-fought (solo, phone). Lich/Djinn/
  Kraken and all multiplayer boss pacing are still bot-verified only.
- **Public-hosting ambition exists but is BUDGET-CAPPED** (owner floated a website +
  Patreon 2026-06-12; assistant's gap list: run ending/King Mimic, juice pass, solo
  tuning, onboarding, meta-progression, Fly deploy + god-room gating). Decision rule
  agreed: do it only as fun, never as an income bet — don't let it eat brother-co time.

## Next step
**Keep playtesting the remaining bosses (Lich/Djinn/Kraken) and redial on owner verdicts,
same as the Hydra round.** All dials sit in ONE place: `BOSS_DEFS` in game.js (~line 800:
head/stance/wizard/teleport/aoe/steal/replenish clocks + headStart, djinn everyNthItem,
kraken capPerPlayer) plus the boss `maxHp` bases in BODIES (hydra 20 / lich 14 / djinn 18
/ kraken 18 — per budget unit). One open Hydra question for the owner: the on-hit head
(one per damaged lane per batch) is still spec-canon alongside the 5-start clock — ask if
heads should come from the CLOCK ONLY. After a full 3-floor clear feels good: King Mimic
as the true final boss (his body is defined and waiting; never spawns today).

## Active decisions (do NOT re-litigate)
- **BOSS_SPEC_V1.md is owner canon; [PLACEHOLDER] tags = my gap-fills** — owner overwrites
  them without debate. ALREADY RULED (2026-06-11, now canon): hydra waves start at 5,
  heads are rat-clones (1/1, bite 1 every 2s). Still my fills, awaiting his verdict:
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
