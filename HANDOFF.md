# HANDOFF — King Mimic — 2026-07-07 15:40

> Browser co-op deckbuilder roguelike (**moxie + cards**, full player/foe symmetry). **Owner authors
> all DESIGN by hand** (bodies, cards, numbers, effects); agents do ENGINE only and FLAG every number
> the owner didn't state — never invent design. Branch **`feat/room-draft-overhaul`**, committed &
> pushed through **`8c1f089`**. He playtests on PC + phone, and with roommates over LAN.

## State (VERIFIED at `8c1f089` — game 1069 · squad 22 · fuzz 60 · serve 18 green; real solo + 2P co-op harnesses 0 JS errors)
- **READABILITY PASS live (`74b7ad0`)**: board print scales UP into free space — mobile foe rows to
  64px/460w, chip text rides chip height, heroes 24/26px + 104×24 nameplate, telegraph circles 15px.
  Verified via 3 real solo runs + co-op harness.
- **CROWD MODE D live (`8c1f089`, owner picked D from mockup memo)**: past 3-per-lane-side, triage —
  front/casting-next/your-target foes keep full rows, rest = `drawFoeMini` one-liners in exact depth
  slots; teammates = `drawHeroCompact` rows, possessed body full. **Borrowed width**
  (`updateLaneWidths`: crowd lane ≤0.58 board, softcap 4) — inert in uncrowded fights (regression
  shots byte-identical). Fit-by-construction: friendly stack can no longer clip. `?demo=crush` =
  the worst-case probe fixture (4 heroes + 2 rats + 5 queued foes, one lane). Verified both viewports.
- **SUMMON CAST FEED universal**: every friendly summon shows its next card + fill (foe chip grammar);
  timer-casters (largeRat/knight) get the same chip instead of the old naked bar.
- **FIVE owner cards live (`e1fffdd`)**: Black Hole (8⚡ ranged, 8 lane dmg + −8-dealt/6s sap on that
  lane), Lion Lance (melee 3 + meleeBonus +1 ramp, ⚡4), Crystal Ball (⚡3, deck tutor + 1 ranged/fight,
  **RANGED BY OWNER FIAT** — 2nd oForce-style exception), Mirror Shield (shield 3 + one-shot full
  reflect, DIRECT hits only, ⚡4), Grand Spirit (10⚡ summon, on-play pick attacker/caster/tank; foe/bot
  default = attacker). All FLAG-commented, all foe-castable, ~60 new tests.
- **PICK POPOVER written, NOT live-verified**: hand cards with `pick` open a DOM chooser
  (client.js, after playHandSlot) → `{type:"playCard", id, pick}`. Engine validation + fallbacks ARE
  unit-tested (garbage pick safe); the popover itself has never been clicked in a live game — no demo
  fixture carries a pick card yet.
- **Batch C still live** (14 owner cards + 6 commons + Wandering Castle + LW rework; 21 commons /
  11 elites / PLAYER_POOL now 68). Ranged = foe-affecting (`opsTouchFoes`); worn passives dead;
  treasure bank; co-op draft hold; mobile tap grammar — all as before.
- **BOSS DIAGNOSIS DONE (read-only, evidence XMJ9 log + code)**: King Mimic is **NOT code-inert — his
  deck provably fires** (court spawned, steal fired, stance capped hits to 1). He's TOOTHLESS: no
  `ward` on his body so the court gates nothing (documented V2 decision; the ward wiring in
  combat.js:1548-50 + snapshot.js:424 is orphaned dead code), STANCE = zero-offense turn, single
  serial clock (½–¼ other bosses' action rate), CALAMITY flat 3 eaten by any shield build.

## Next step
**Await the owner's rulings — implement nothing on this list unbidden.** Open queue: (1) **throne
fix path A vs B** — A: set `ward: true` on the King body (activates the built court-phase fight;
update test/game.test.js:1526-27 which asserts no-ward) vs B: keep no-ward, give the deck teeth
(stance rider / floor-scaled CALAMITY / second parallel clock / shorter cds). Recommended A, his
call. (2) **RICH_ITEM_POOL retired-card leak** — one-line filter pending. (3) **Floor-1 difficulty
dial** (new bodies/cards spawn as floor-1 foes; PW:Gun 13dmg openers). (4) New-card FLAG numbers +
two interpretation vetoes: Crystal Ball tutored card is EXTRA (hand grows), Mirror Shield reflects
DIRECT hits only. (5) First live Grand Spirit/Crystal Ball play = the popover's real test.
(6) sustain-stall valve (old, still open). Open with "point me at HANDOFF.md".

## Active decisions (non-obvious why only)
- **NEVER swap the :3000 server while it has established connections** — a mid-game deploy wiped a
  live roommate run (rooms live in memory). `Get-NetTCPConnection -LocalPort 3000 -State Established`
  (cloudflared holds ~1); deploys wait for the seam or his word.
- **Roommate LAN play uses `http://10.0.0.28:3000`**, never the trycloudflare URL (tunnel round-trip
  = the "lag"). bun binds 0.0.0.0 + firewall allows.
- **Crowd mode is default-ON, no feature flag** (owner picked D outright). Its dials are FLAG
  constants at the top of client.js: `CROWD_SLOTS=3`, `LANE_MAX_FRAC=0.58`, `LANE_W_SOFTCAP=4`,
  `FOE_FULL_H/FOE_MINI_H/HERO_COMPACT_H` — owner-tunable, don't invent new thresholds elsewhere.
- **Crystal Ball is ranged by owner fiat** ("crystal ball is ranged") despite touching no foes —
  the SECOND explicit exception after oForce. Don't "fix" it back to typeless; the exception is
  owner-dated in kit.js.
- **Cool Shoes machine-gun loop is OWNER-SANCTIONED** — do NOT "fix".
- Treasure spends on level-ups + adoptions ONLY; shop deliberately untouched.
- Co-op hold gates FRESH runs only; mid-run drop-in reopen still auto-resumes — don't gate it.
- Kind-pricing keys off **triggerKind**, not cardKind (Force + aimed debuffs get LW's −1). His call
  to narrow.
- Wandering Castle's +1 applies at ENUMERATED shield sites — a new shield source must add his bonus.
- Movement is core design (owner: "the movement is part of the game") — any future layout work must
  keep depth order spatial; that constraint drove D over abstract-sidebar designs.

## Landmines
- **The retired-card leak is STILL ACTIVE** (unruled): RICH_ITEM_POOL/boss shelf = Object.keys(KIT).
- **New cards spawn as FOE gear immediately** (all five, incl. foe-cast Grand Spirit → attacker) on
  top of the un-ruled floor-1 heat.
- **Popover untested live** (see State). Fails safe to engine fallback (random tutor / attacker).
- **Ward wiring is orphaned**: combat.js + snapshot.js branch on `?.ward` but NOTHING sets it. If
  path A is chosen it lights up; if B, it stays a landmine for anyone adding a warded body.
- Art: batch C AND Grand Spirit bodies (grandAttacker/Caster/Tank → minotaur/lizardWizard/atlas
  silhouettes) are ART_ALIAS placeholders; owner art pass pending.
- **Worktree agents can mint from a STALE base** (one landed on pre-engine-split 34fe146 today):
  first act in any worktree = `git log --oneline -3`, expect `8c1f089`; else
  `git reset --hard feat/room-draft-overhaul`. Assert game.test shows **1069**.
- Leftover integration branches `worktree-agent-a53833f793f68afff` / `worktree-agent-ae40ff3168706156e`
  (+ their .claude/worktrees dirs) are merged into `8c1f089` — safe to delete, not yet deleted
  (rm guardrail).
- Test count is mildly nondeterministic (1069–1071) — data-driven loops, not flakiness; ALL PASS is
  the signal.
- `tools/mp-playtest.mjs` + `tap-probe.mjs` (untracked) were edited to press the co-op ▶ — they hang
  on draft if that's removed. `tools/feature-shots.mjs` asserts the dead ⚖=◈ contract; `test/e2e.js`
  is gold-era dead — don't chase either.
- **NEVER `git add -A`** (untracked musts: DESIGN_LISTS.md, tools/mp-playtest|tap-probe|tier-sim|
  feature-shots|wear-shot.mjs, logs, tier-sim-results.json, tunnel.out). **NEVER rm** (owner
  guardrail). Engine edits need a server restart (live-connection rule!); `public/*` is served
  per-request — hard refresh only.
- Tunnel URL dies on laptop sleep and mints anew — re-read tunnel.log; LAN is primary. Modern
  Standby can wipe node_modules → `bun install`.
- Telemetry party:2 rooms at ~21:4x on 7/06 + today's harness runs are BOT games, not humans.

## Pointers
- Run: `bun run server.js` → :3000 (LAN 10.0.0.28). Tunnel: `"C:\Program Files (x86)\cloudflared\
  cloudflared.exe" tunnel --url http://localhost:3000` (URL → tunnel.log).
- Test: `bun test/game.test.js` (**~1069**) · `bun test/squad.test.js` (22) · `bun test/fuzz.js`
  (60 runs) · `bun test/serve.test.js` (18).
- Harnesses (untracked): `node tools/shoot.mjs` (solo real run, mobile) · `node tools/mp-playtest.mjs`
  (2P co-op) · `node tools/tap-probe.mjs` (touch grammar) · `bun tools/screenshot.js <state>` w/ env
  W/H/QS/URL (demo shots; `crush`/`cardcombat`/`combat3`) · `bun tools/tier-sim.mjs`.
- Key files: `engine/kit.js` (cards, opsTouchFoes/isRanged + Crystal Ball fiat, new-card FLAGs) ·
  `engine/cards.js` (PLAYER_POOL 68, playCost) · `engine/bodies.js` (roster + Grand Spirit bodies) ·
  `engine/combat.js` (resolveOps, mirror reflect, sap, playCard pick validation, effectiveDamageTo
  ward+stance at 1548-56) · `engine/lobby.js` (BOSS_DEFS ~1055, king deck driver ~1128, spawnBoss
  ~1242) · `engine/snapshot.js` (cardDescriptor + pick, allies queue/castFrac, warded flag 424) ·
  `server.js` (playCard + pick) · `public/client.js` (crowd constants ~line 45, updateLaneWidths,
  drawFoeMini/drawHeroCompact ~2255-2375, summon feed in drawSummonBody ~2215, pick popover after
  playHandSlot ~866, ART_ALIAS, `?demo=crush`) · `combatlogs/` + `telemetry.jsonl`.
