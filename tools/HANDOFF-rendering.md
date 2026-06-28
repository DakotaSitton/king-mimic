# HANDOFF — Rendering slice (honest render + overflow/hydra fixes) — 2026-06-25

> Owned files: `public/client.js` (render only) + `tools/realsnap.js` + `tools/realshot.js`.
> Did NOT touch `game.js` / `server.js` (parallel agent's). `public/style.css` was already modified
> before this slice started — none of it is mine.

## ⚠️ READ FIRST (CORRECTED 2026-06-27)
- **The canonical real-screenshot command is `node tools/shoot.mjs`** — a REAL solo, phone-landscape
  playthrough (boots a fresh server, drives the real client via window.KM, shoots the live canvas).
  That is the ONLY path that represents the game. Use it for any screenshot.
- **`tools/realshot.js` + `tools/realsnap.js` (described below) are a FIXTURE, not real gameplay.**
  They render a hand-configured 3-player floor-2 scene with a fixed long-named foe roster — a board
  that never happens in a real solo run. Real entities, fake scene. This is the trap that kept being
  passed off as "the game". Its files are now prefixed `FIXTURE-` and the client watermarks every
  such frame "FIXTURE — NOT A REAL GAME". Keep it ONLY as a text-overflow / hydra-bloom render-QA
  bench; never present its output as the game. Everything below this box documents that fixture bench.

## The real-render harness — EXACT commands
```
bun tools/realshot.js                 # ALL scenes × {mobile 844x390@3 touch, desktop 1120x820} → tools/shots/
bun tools/realshot.js hydra           # one scene (combat | hydra | hydra3)
bun tools/realshot.js combat hydra    # several scenes
TAG=before bun tools/realshot.js      # suffix filenames -before/-after for A/B
bun tools/realsnap.js hydra --summary # print the real engine board (no browser) — sanity check
RPORT=3188 bun tools/realshot.js      # override port (default 3177)
```
Output: `tools/shots/real-<scene>-<mobile|desktop>[-<TAG>].png`.

### How it works (3 pieces)
1. **`tools/realsnap.js`** — drives the ACTUAL engine: `newRoom → addPlayer("me") → buildLevel/enterRoom
   → buildRoom → beginCombat → simulateTick×N`, then `snapshot(room)`. Foes are real `spawnEnemy(...)`;
   the hydra is real `spawnBoss("hydra")` (force via `r.bossDraw=["hydra"]` + entering a boss node);
   extra heads bloom via the engine's own `spawnFoeInLane(room,"hydraHead",lane)` (the exact call
   `bossOnDamaged` makes). Scenes: `combat`(3-lane, longest-named roster), `combatsolo`, `hydra`(solo,
   worst-case 16-head stack), `hydra3`(3-lane bloom). Pilot id is **"me"** (the client sets `you="me"`).
2. **`tools/realshot.js`** — throwaway `Bun.serve` on port 3177 serving real `public/` + `/realsnap?scene=X`
   (built by realsnap.js), then headless Edge screenshots `?demo=realsnap&scene=X`. Never touches server.js.
3. **`public/client.js` hook (~line 643)** — `if (_demo === "realsnap")` fetches `/realsnap?scene=` and
   injects it, reusing existing demo plumbing. **Gated behind `?demo=realsnap` → inert in normal play.**

## Changes in `public/client.js`
- **`fitText()`** generalized: added `align` ("left"|"center"|"right") + `baseline` params (defaults keep
  every existing left/top caller byte-identical).
- **`drawFoeTokenCluster()`** (new, just above `drawBossBanner`) — the hydra fix (see below).
- Module vars: `_bossBannerBottom` (set in `drawBossBanner`, reset each frame next to `foeBoxes=[]`).
- Foe loop (~line 1235): splits `lanes[i].enemies` into `tokenFoes` (`bodies[bodyKey].summon`) vs
  `realFoes`; tokens → cluster, real foes render as before. `foeTopBound` computed once per frame.
- `fmToggle` label: short "✋ MANUAL"/"⚡ AUTO" on touch (the "— tap for…" hint overflowed the 118px rail).
- No CSS edits — the rail fix is the label change.

## Text-overflow cases found & fixed (all canvas, via fitText clamp unless noted)
| Site | Before | Fix |
|---|---|---|
| Hand-card name (`drawHotbar`) | centered, **no clamp** — long names spilled the slot | `fitText` center-clamp to slot width |
| Foe trigger-tag row | `tags.join("   ")` **no clamp** — ran past card edge | `fitText` clamp to inner width |
| Boss banner name | no clamp vs HP readout | clamp to gap before `❤hp/max` |
| `MANUAL` toggle (HUD) | overflowed phone rail | short label on touch |
| Foe name / passive / threat labels / buff chips / combat-log | already safe (`fitText`/`wrapLines`/slice/measured tooltip/CSS `pre-wrap`) | left as-is |

## The hydra head-clipping fix
Root cause: each `hydraHead` rendered as a full STACKING foe card; a real fight blooms 16–21 heads, so
they stacked upward, overran the boss banner, and clipped off the top (most heads invisible).
Fix: `drawFoeTokenCluster()` collapses a lane's **summon-token foes** (`bodies[bodyKey].summon` → covers
hydra heads, kraken tentacles, summoned rats) into a **capped coin grid** (foe-side mirror of the friendly
summon row). Bottom-anchored, grows upward in rows, **hard-capped to never cross `foeTopBound`** (boss-
banner bottom). Overflow folds into a "+N" chip; a "🐍×N" label gives the swarm identity; each coin stays
click-to-target (pushed to `foeBoxes`). Real foes stack above the cluster. Non-summon path is unchanged
(cluster only fires when summon tokens are present → desktop combat byte-identical before/after).

## Verified
- `bun test` → **554 game + 18 serve, 0 failed** (the +3 game tests are the parallel agent's).
- All 6 AFTER renders eyeballed at mobile + desktop: heads on-screen, no clip, no banner overlap, all
  text within its box. `client.js` transpiles clean.

## Open items (owner's call — none blocking)
- Foe cast-queue chip name is still a crude 8-char slice (`drawFoeQueue` ~line 2254). Bounded (doesn't
  escape), but could be upgraded to `fitText` if you want graceful shrink instead of hard truncation.
- Hero/ally name label under the token (~line 1478) is centered without clamp. Player names are short in
  practice; not routed through `fitText` to avoid bolding ally names on desktop. Revisit if names get long.
- Head coins show the swarm count only, not per-head bite timers. The hydra's clocks live on the boss
  banner; per-coin timers were deemed clutter. Flip if owner wants them.
- More roster coverage in scenes is easy to add (edit `FOE_ROSTER` in `tools/realsnap.js`).
```
```
