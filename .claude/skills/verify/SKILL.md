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
NODES=2 node tools/shoot.mjs # minimum release gate: must reach setup + playing on current HEAD
node tools/shoot.mjs         # full real SOLO run: fresh server + real Edge client, screenshots every phase
node tools/mp-playtest.mjs   # 2-player co-op harness
```
Healthy = the command exits 0, the report shows **`JS errors: 0`**, and `renderChecks.setup` plus
`renderChecks.playing` each report `renderErrors: 0`, at least one hero hitbox, at least one foe
hitbox, and a real board size. The harness now exits nonzero for console/render failures; never treat
a printed warning as a pass. Benign quirks that are NOT failures: losing floor 1 to elites.

The proof is valid only for the exact working tree/HEAD that produced it. Run the real gate after the
final code edit, merge, rebase, or conflict resolution. A later runtime change voids the proof.

## 3. Production lifecycle — mandatory for client/render releases
After the deployment is actually serving the new commit:
1. Run `BASE=https://king-mimic-production.up.railway.app NODES=2 BUDGET=90 node tools/shoot.mjs`.
   The harness must exit 0 after a fresh normal `draft → choose room → setup → playing` lifecycle,
   with zero console/render errors and non-empty hero/foe hitboxes in setup and playing.
2. Visually verify the production frame contains the hero, foe, hand, and HUD; then take the next
   forward-progress action. `/health`, static serve tests, source inspection, and a prior local run do
   not substitute for this lifecycle.
3. Record the deployed commit and the exact production lifecycle result in `HANDOFF.md` before
   declaring completion.

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
