# King Mimic — operating rules for Claude

Browser co-op deckbuilder roguelike (moxie + cards, full player/foe symmetry). Owner: **Dakota**.
**`HANDOFF.md` (repo root) is the live tech truth — read it before trusting anything else, including
this file.** Runtime = **Bun**; engine lives in `engine/*.js` (`game.js` is a thin barrel — edit the
module, not the barrel). Working branch = `feat/room-draft-overhaul`.

## Verification bar — pass before any commit
Deterministic suites (all run under Bun):
- `bun run test/game.test.js`  → `✅ ALL PASS — 1069 passed` (count drifts 1069–1071, data-driven; ALL PASS is the signal)
- `bun run test/squad.test.js` → `SQUAD: 22 passed, 0 failed`
- `bun run test/fuzz.js`       → `✅ FUZZ OK — 60 full runs`
- `bun run test/serve.test.js` → `21 passed` — needs a running server first: `PORT=<p> bun run server.js &`
  then `BASE=http://localhost:<p> bun run test/serve.test.js` (use a throwaway port; never the live :3000)

End-to-end (REAL runs, never fixtures):
- `node tools/shoot.mjs`       = REAL solo screenshots (fresh server + real Edge client + boss-aware brain)
- `node tools/mp-playtest.mjs` = 2-player co-op harness

**Bar = suites green AND `JS errors: 0` in the harness runs.**

### Scenario harness (capture-only)
- `node tools/scenario-shot.mjs tools/scenarios/<name>.json` = screenshot a HARD-TO-REACH state in the
  REAL game: real server + real Edge client + real tick loop; only the STARTING CONDITIONS are injected.
- Gate: the `{type:"scenario"}` hook exists only when the server process runs with `KM_SCENARIO=1`
  (the harness sets it on its own throwaway child; the live server never does — a "SCENARIO MODE"
  banner makes it unmistakable). Specs validate every body/card/buff key against the real tables and
  fail loudly on unknowns (`applyScenario`, engine/lobby.js).
- ⚠ Capture/proof tool ONLY — it never replaces `shoot.mjs` random-run verification in the bar above.

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
- **RICH_ITEM_POOL leaks retired first-set cards** into foe gear/loot/boss shelf — a 1-line filter is
  pending his ruling.
- **Floor-1 difficulty** for new bodies-as-foes (they spawn as floor-1 foes immediately) — pending.

## Git rules
- Explicit stage only — **never `git add -A`**. Deletes need owner approval (rm guardrail).
- Commit + push verified work at seams; branch off `main` first for new work.
