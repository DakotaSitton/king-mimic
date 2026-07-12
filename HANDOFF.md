# HANDOFF — King Mimic — 2026-07-11 21:05 CDT

> Browser co-op deckbuilder roguelike. Dakota owns all design/content/numbers; agents implement engine, rendering, and verification. Runtime = Bun. Working branch = `feat/room-draft-overhaul`.

## State

- Game-code HEAD: `a7f76c8` (`fix(client): clamp lowest-row hero effect-chip row above the caravan seam`).
- **Scenario proof tooling (`bcbc0b3`, merged):** `node tools/scenario-shot.mjs
  tools/scenarios/<name>.json` boots a throwaway real server/client/tick loop and injects only validated
  starting conditions. The message route exists only under `KM_SCENARIO=1`; the live server never
  enables it. Seven checked-in scenarios cover the previously hard-to-reach adoption, 16-foe crowd,
  stacked-effect, timer, armor, and chooser surfaces. The follow-up `a7f76c8` clamps the lowest hero's
  effect chips above the caravan seam after that harness exposed the clipping.
- **Space-free incoming targeting (`0841968`, pushed and live):** foes no longer stack attacker
  portrait circles beside the player they threaten. Each threatened full-size hero gets one tight,
  pulsing red ring; the existing cyan front-blocker arc paints over its foe-facing segment, so both
  states remain legible in the same footprint. Crowd-mode teammate rows use one red row outline.
  Removing the portrait strip also returns that width to compact names and HP bars.
- **Expressive summon pass (`5b174d6`, pushed and live):** ordinary 1–2 friendly AND foe summons
  now render as compact animated mini-cards with real art, authored body color, name, HP, current
  cast, live moxie/cost, damage, and a progress/ready treatment. FRONT cards fan left/up and BACK
  cards right/down so formation reads spatially and the hero remains clear. The whole friendly card
  is heal-targetable; foe cards remain attack/inspect targets. Only actual swarms collapse to coins.
- **Latest mobile summon fix (`7f8cbc5`, pushed and live):** mobile token rows merge only
  contiguous summons, so FRONT and BACK Hedgefund Knights render on opposite sides of the hero.
  The friendly-line planner now reserves the combined foe-summon + real-foe footprint, and the
  foe-token cluster preserves that reserve, so a summon cannot push the real foe above the board.
- Earlier completed branches are integrated on this branch:
  - Warewolf timed form/body: merge `e3b5b74` (source `0d02bf1`).
  - Mobile readability/visual fixes: merge `660e6d1` (source `5dea3d8`).
  - Foe full-summon rendering landed earlier in `c67b6d3`, but Dakota's 7/11 ruling below intentionally supersedes its visual footprint: summons are compact again.
- LIVE on `:3000`, Bun PID `38748`. The latest change is client-only and served directly from disk,
  so Bun was deliberately NOT bounced: an active Tailscale phone connection was preserved. Live
  `/client.js` hash matches disk; hard-refresh loads the fix without wiping the room.
- Existing Cloudflare process was NOT restarted. Public URL is live and HTTP 200:
  `https://ultimate-declare-news-vast.trycloudflare.com/`

## What changed from Dakota's 7/11 screenshots

1. **Body adoption affordability bug fixed** (`public/inventory.js`).
   - Root cause: the body-menu cache signature ignored `treasure`, backpack/deck, and adopted-body changes. A body could remain disabled after the player gained enough banked value.
   - The signature now includes all four inputs, so affordability rebuilds immediately.
   - Server tender/adoption path was already correct and remains covered by engine tests.

2. **Combat chrome removed/reclaimed** (`public/client.js`, `public/style.css`, `public/index.html`).
   - No player-facing manual/auto control or label.
   - No target button; direct foe/ally/body taps are the grammar.
   - Tapping the currently piloted body now heal-aims self; tapping another owned body pilots it.
   - No mobile info / cycle / mimic-swap button stack. No squad-cycle button.
   - Stale desktop help copy for removed controls is gone.
   - The 118px right rail + 62px left reservation are gone; canvas/cards use the width.
   - Summon placement remains as ONE small contextual `SUMMONS: FRONT/BACK` toggle only when relevant. Echo remains contextual.
   - Internal `autoFire` still exists for bots/harness-driven extra bodies. Dakota's ruling is PLAYER-FACING: never expose it as a choice or label again.

3. **Summons compacted on both sides.**
   - Friendly and foe summons always use compact token/coin grammar instead of full body cards.
   - Removed the persistent summon strip above the hand (the random rat chip at bottom-left).
   - Summons remain tap-targetable and retain compact HP/cast information.

4. **Incoming foe targeting no longer consumes board space.**
   - Removed all attacker portrait-circle stacks from threatened players.
   - A single red outline now marks a threatened player, independent of attacker count.
   - The cyan front-targeting arc remains on top of the red ring, so formation and danger read together.
   - Compact teammate rows reclaim the old portrait reservation for their name and HP bar.

## Verification

Deterministic, post-final-edit:

- `bun run test/serve.test.js` — 21 passed (includes refusal of scenario injection without the env gate)
- `bun run test/game.test.js` — 1447 passed
- `bun run test/squad.test.js` — 22 passed
- `bun run test/fuzz.js` — 60 full runs
- `bun build public/client.js --target=browser` — clean
- `git diff --check` — clean before commit

Latest incoming-target real proof (normal run, mobile 844×390@3 touch):

- `tools/shots/real-mobile-2026-07-12T00-30-18/07-playing-tick.png` shows a threatened full hero
  with one red ring and the cyan front arc overlaid; no attacker portraits consume adjacent space.
- The 12-frame run covered draft → won → setup → playing → lost with 0 JS errors / missing assets.

Latest summon-layout real proof (normal run, mobile 844×390@3 touch):

- `tools/shots/real-summon-layout-2026-07-12T00-09-29/02-front-and-back-knights.png`
  is the final expressive-card build: actual front/back Knights cleanly flank the hero; depths remain
  `-0.5 / hero 0 / +0.5`, with 0 JS errors.
- `tools/shots/real-summon-layout-2026-07-12T00-07-05/01-one-knight.png` shows the mixed grammar in
  one real combat: enemy Knight + friendly Rat + friendly Knight mini-cards, all readable and on-board.
- `tools/shots/real-summon-layout-2026-07-11T23-39-24/02-front-and-back-knights.png`
  shows two actual Hedgefund Knights bracketing the hero; depths are `-0.5 / hero 0 / +0.5`.
- `tools/shots/real-summon-layout-2026-07-11T23-31-53/01-one-knight.png` reproduces the mixed
  friendly summon + foe summon + real foe case; the real foe remains fully visible.
- Both focused runs reported 0 JS errors. Canonical `node tools/shoot.mjs` produced 20 fresh real
  mobile frames at `tools/shots/real-mobile-2026-07-11T23-40-55/`, 0 JS errors / 0 missing assets.
- Latest canonical rerun: `tools/shots/real-mobile-2026-07-12T00-05-41/`, 16 real mobile frames,
  0 JS errors / 0 missing assets.

REAL game, personally inspected (not fixtures):

- Mobile 4-body run, 844×390@3 touch, 0 JS errors / 0 missing assets:
  `tools/shots/real-mobile-2026-07-11T20-02-59/`
  - Representative clean frame: `10-playing-tick.png`.
  - Full three-card hand visible; no control rail; no AUTO label; compact summons; four bodies + five foes fit cleanly.
- Desktop 4-body run, 1120×820, 0 JS errors / 0 missing assets:
  `tools/shots/real-desktop-2026-07-11T20-04-57/`
  - Representative clean frame: `10-playing-tick.png`.
  - Board/cards/panels fit; no controls column; stale help copy fixed immediately afterward and syntax rechecked.
- Prior long mobile run also clean (23 real frames):
  `tools/shots/real-mobile-2026-07-11T19-55-17/`.

Natural random-run proof reached 4 bodies + 5 foes with summons, not 15+ foes. The gated real-game
scenario harness now separately proves a 16-foe crowd surface; keep that distinction honest.

Adoption is now real-client scenario-proven at ◈5 with treasure covering the shortfall. Dakota should
still confirm the naturally earned-treasure path during the next phone run.

## Landmines / preserve

- Old `fireMode`, `targetRow`, touch action-button markup and some dead helper code remain in the source but are suppressed by the new player-facing path. Do not revive them. A later cleanup may delete the dead markup/functions after Dakota confirms the phone build.
- Do not remove internal bot/harness autonomy while removing player-facing AUTO language; 1-player/4-body harness runs depend on unpiloted bodies acting.
- `CHEATSHEET.md`, `DESIGN_LISTS.md`, `RESUME_PLAN.md`, scratchpad/harness files, and tunnel logs remain untracked; preserve them.
- Live Bun PID is `38748`; the summon and incoming-target work was client-only, so it was deliberately
  not bounced and the active phone room was preserved. Cloudflare was not restarted.
- Existing owner rulings still stand: Cool Shoes loop stays; boss-toothlessness / retired-card pool / floor-1 difficulty await Dakota.

## Next step

Begin the fresh Sol session with: `point me at HANDOFF.md`. Then hard-refresh the public URL on the
actual phone and verify two exact real-device actions: (1) earn/bank at least ◈5 and adopt a priced
body, and (2) play a summon-heavy 4-player room while confirming the red incoming outline. If either
differs from the verified frames, capture the screen and continue from game commit `a7f76c8` without
reopening the removed control model.
