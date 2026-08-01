# King Mimic — operating rules for Claude

Browser co-op deckbuilder roguelike (moxie + cards, full player/foe symmetry). Owner: **Dakota**.
**`HANDOFF.md` (repo root) is the live tech truth — read it before trusting anything else, including
this file.** Runtime = **Bun**; engine lives in `engine/*.js` (`game.js` is a thin barrel — edit the
module, not the barrel). Working branch = `feat/room-draft-overhaul`.

## Verification bar — pass before any commit
Deterministic suites (all run under Bun):
- `bun run test/game.test.js`  → `✅ ALL PASS — ~4092 passed` (data-driven; count jitters ±1; ALL PASS is the signal)
- `bun run test/body-passives.test.js` → 46 bodies × hero/foe × base/Mastery/Specialty plus same-level
  no-rank controls: `462 causal executions, 0 failed`. This is a release gate for passive/level changes.
- `bun run test/squad.test.js` → `PARTY MODE: 259 passed, 0 failed`
- `bun run test/telemetry.test.js` → `✅ ALL PASS — 93 passed`
- `bun run test/fuzz.js`       → `✅ FUZZ OK — 60 full runs` (fuzzes the LIVE lifecycle: draftPick on a
  random wheel bundle → rooms → combat → loot/level → descend; rewritten 2026-07-19)
- `bun run test/serve.test.js` → `116 passed` — needs a running server first: `PORT=<p> bun run server.js &`
  then `BASE=http://localhost:<p> bun run test/serve.test.js` (use a throwaway port; never the live :3000)
- The fuller battery (onboarding, card-expansion, card-art, card-animation, admission, baber-summons,
  clock, name-safety) must also be green for release. Quirk: `name-safety` launches Playwright, which
  fails under Bun on this machine — run it as `node test/name-safety.test.js`.

End-to-end (REAL runs, never fixtures):
- `NODES=2 node tools/shoot.mjs` = minimum REAL solo release gate: draft → room → setup → playing
- `node tools/shoot.mjs`       = full REAL solo screenshots (fresh server + real Edge client + boss-aware brain)
- `node tools/mp-playtest.mjs` = 2-player co-op harness

**Bar = suites green AND the current-HEAD real run exits 0 with `JS errors: 0`.** The harness also
requires non-empty hero/foe hitboxes in both setup and playing; a blank or throwing canvas is a hard
failure. Run it after the final code edit/merge, not before. Any later runtime edit invalidates it.

### Production release gate for client/render changes
- Local green is necessary, not sufficient. After Railway serves the new build, start a fresh normal
  production room at the owner's phone-landscape/touch layout and drive the exact lifecycle
  `draft → choose room → setup → playing`.
- Run `BASE=https://king-mimic-production.up.railway.app NODES=2 BUDGET=90 node tools/shoot.mjs`.
  It must exit 0 with zero JS/render errors and non-empty hero/foe hitboxes in setup and playing.
  Visually inspect its production combat frame for hero, foe, hand, and HUD.
- Do not call a rollout complete from `/health`, deterministic suites, static asset checks, or an old
  screenshot. Record the verified deployed commit and lifecycle in `HANDOFF.md`.

### Scenario harness (capture-only)
- `node tools/scenario-shot.mjs tools/scenarios/<name>.json` = screenshot a HARD-TO-REACH state in the
  REAL game: real server + real Edge client + real tick loop; only the STARTING CONDITIONS are injected.
- Gate: the `{type:"scenario"}` hook exists only when the server process runs with `KM_SCENARIO=1`
  (the harness sets it on its own throwaway child; the live server never does — a "SCENARIO MODE"
  banner makes it unmistakable). Specs validate every body/card/buff key against the real tables and
  fail loudly on unknowns (`applyScenario`, engine/lobby.js).
- ⚠ Capture/proof tool ONLY — it never replaces `shoot.mjs` random-run verification in the bar above.

### Body-passive sandbox
- `bun run test:passives` runs the deterministic combat sandbox in `test/support/body-passive-sandbox.js`.
  It drives real public card, damage, summon, and tick resolvers for every wearable body on both sides;
  each ranked cell also has a same-level no-rank control so level alone cannot fake an upgrade pass.
- For a live client check, start a throwaway server with `KM_SCENARIO=1`, open `?dev=1`, and use
  Developer Lab → `ranked Minotaur passive`. Production must never enable this gate.

## Harness traps — don't get bitten
- `tools/playtest.mjs` is SUPERSEDED (2026-06-27) — use `shoot.mjs`; don't revive it.
- `tools/realshot.js` (+ `realsnap.js`) = FROZEN fixture snapshot — don't modernize; it drifts by design.
- `tools/screens-shot.mjs` (god mode) can STALL to 0 shots — `shoot.mjs` is the dependable default.
- `tools/mp-playtest.mjs`, `tools/tap-probe.mjs`, `tools/tier-sim.mjs` are **untracked BY DESIGN** —
  never `git add` them, never delete them.

## Icons
Real foe icons = `public/foes/*.svg`, generated from the `MAP` in `tools/generate-foe-art.js`.
The `FOE_ICON` emoji table in `public/client.js` is a load-failure FALLBACK — never audit or validate
off it. Always validate the RENDERED artifact (open the actual SVG / take a real screenshot).

## Design ownership — hard boundary
Game DESIGN/content — cards, bodies, numbers, effects, art direction — is **Dakota's to author by
hand**. Agents build ENGINE / mechanics / rendering / tests only, and never invent design. Any
gameplay number the owner did NOT state gets a `FLAG` comment at its definition — his to re-tune.

## Owner-sanctioned oddities — do NOT "fix"
- **Cool Shoes machine-gun loop** ("Let it happen. It's part of the game" — 2026-07-06).
- Crystal Ball is ranged by owner fiat; oForce is the one ranged-typed shield — both intentional.

## Open items — AWAIT OWNER RULING, do not resolve unprompted
- **King Mimic boss is toothless** — path A: set `ward` on the King body (lights up the court/throne
  phase) vs path B: keep no-ward and give the deck teeth. His call, not yours.
- **Floor-1 difficulty** for new bodies-as-foes (they spawn as floor-1 foes immediately) — pending.
- **resolveOps ASYMMETRY ledger** — 2026-07-19 unification preserved every pre-existing hero/foe
  divergence verbatim (grep `ASYMMETRY (pre-existing` in engine/combat.js); each is his to rule
  keep-or-fix. Do not resolve them unprompted.
- (RICH_ITEM_POOL retired-card leak: RULED + FIXED 2026-07-19 — retired-card guard on
  RICH_ITEM_POOL and RARE_POOL with regression tests.)

## Git rules
- Explicit stage only — **never `git add -A`**. Deletes need owner approval (rm guardrail).
- Commit + push verified work at seams; branch off `main` first for new work.
