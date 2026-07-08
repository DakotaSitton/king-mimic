---
name: verify
description: Verify King Mimic end-to-end — test suites + real solo screenshots + co-op harness, 0 JS errors
---

# Verify King Mimic

Run before committing anything nontrivial. Tests run under **Bun**; the end-to-end harnesses run under
**Node + real Edge**. The bar: **all suites green AND `JS errors: 0` in the harness runs.**

## 1. Deterministic suites (fast, no browser)
```
bun run test/game.test.js    # ✅ ALL PASS — 1069 passed, 0 failed   (count drifts 1069–1071; ALL PASS is the signal)
bun run test/squad.test.js   # SQUAD: 22 passed, 0 failed
bun run test/fuzz.js         # ✅ FUZZ OK — 60 full runs, no invariant violations
```
The serve smoke needs a running server — start a FRESH one on a throwaway port (never touch the live
:3000, which holds live rooms in memory):
```
PORT=3999 bun run server.js &
BASE=http://localhost:3999 bun run test/serve.test.js   # ✅ ALL PASS — 18 passed, 0 failed
```

## 2. End-to-end — REAL runs, never fixtures
```
node tools/shoot.mjs         # real SOLO run: fresh server + real Edge client, screenshots every phase
node tools/mp-playtest.mjs   # 2-player co-op harness
```
Healthy = the run's report shows **`JS errors: 0`** and no asset 404s. Benign quirks that are NOT
failures: a "stuck in 'won'" stall after a descend, or losing floor 1 to elites.

## Screenshots rule
Screenshots MUST come from a REAL `shoot.mjs` run. NEVER present `realshot.js` / `realsnap.js` output —
that is a frozen hand-built snapshot that drifts from the actual game. When validating icons, open the
real `public/foes/*.svg`, never the `FOE_ICON` emoji fallback in `client.js`.

## Harness traps that bite during verification
- `playtest.mjs` is SUPERSEDED (2026-06-27) — use `shoot.mjs`.
- `realshot.js` = frozen fixture — don't modernize it.
- `screens-shot.mjs` (god mode) can STALL to 0 shots — `shoot.mjs` is the dependable default.
- `mp-playtest.mjs` / `tap-probe.mjs` / `tier-sim.mjs` are **untracked by design** — never git-add, never delete.
- Modern Standby resume can wipe `node_modules` → run `bun install` before the Playwright tools.
