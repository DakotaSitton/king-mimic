# HANDOFF — King Mimic — 2026-06-30 00:45 CST

> Browser co-op deckbuilder roguelike (**moxie + cards**). Players and foes play by the EXACT same rules with
> the same bodies/cards (the **symmetry pillar** — a level-3 foe == a level-3 player on the same body).
> **Owner authors all DESIGN by hand** (bodies, cards, numbers, gimmick set, level feel); agents do
> ENGINE/mechanics only and FLAG ambiguities — never invent design (he has bounced agent-designed content).
> Branch **`feat/room-draft-overhaul`**, committed & pushed to origin. Owner playtests live on his PC.

## State (verified)
- **Tests:** `bun run test/game.test.js` → **840 pass / 0 fail**. Self-reporting harness — read its
  "✅ ALL PASS — N passed" line; plain `bun test` prints "0 tests" (expected, not a failure).
- **Real run (`node tools/shoot.mjs`):** cleared a floor-1 boss → descended to floor 2, **0 JS errors / 0 404s**.
  (It can report `JS errors: 1` that is actually a **STALL** flag — see Landmines — not a real error.)
- **Server LIVE on `localhost:3000`** (`bun run server.js`, detached). Owner is on his **PC** now. A cloudflared
  quick-tunnel was also up this session for phone testing (new URL every respin; not needed on PC).
- **NOT verified — owner to eyeball live:** (1) the **elite gimmick FEEL** (acid every ~3s, scaling every ~4s,
  −1 foe cost are first-pass numbers); (2) the **summon-stack spacing** fix — `shoot.mjs` never summons, so the
  "HP plate covers the body behind it" fix was not seen on a real summon.

## Next step
Open with **"point me at HANDOFF.md"**. No code task is mid-flight. Await owner direction. Most likely pickup:
he enters an **Elite room**, judges whether the gimmick cadence/strength feels right, then tunes the `GIMMICKS`
table / its `cd` values / the `rollType` frequencies in `game.js`. Parked candidates: adoption-affordability bug
(no repro yet), symmetric level-curve redesign (offense-favoring; `LEVEL_HP_PER_EVEN`/`LEVEL_COMBAT_PER_ODD`).

## Active decisions (non-obvious why only)
- **Random 3-pick crawl REPLACED the STS map** (owner: "kill the map, too STS-oriented"), but the
  **floor→boss→throne arc is KEPT** (he explicitly chose this over endless / boss-as-an-option). Shape:
  trailhead → `FLOOR_ROOMS`(=5) steps of **exactly 3 random-typed rooms** (Fight common / Shop occasional /
  Elite occasional; ≥1 Fight per row, ≥1 Elite per floor) → forced floor boss → descend → throne. The on-screen
  "map" is now just a slim "♛ Boss in N rooms" line ("Room X/Y" + node-graph framing deliberately removed).
- **Elite = double-ante fight (richer foes/loot) PLUS a random GIMMICK.** The `GIMMICKS` table (game.js, just
  above `buildLevel`) is **THE OWNER'S** — rename/retune/extend freely. His three: `acidRain`, `cheapFoes`
  (−1 foe card cost), `foeScaling` (+1 foe dmg over time). Numbers/cadences are first-pass placeholders.
- **Acid Rain hits HEROES + their summons only, NOT foes** — it's the player's pressure (elite = harder).
  Reuses the existing `processRoomTimers` "acid" kind; `foeScaling` added a new "scale" kind there.
- **The trailhead reuses `phase="won"`** (the between-rooms chooser UI) instead of a new phase — `enterRoom` has
  a `type==="start"` branch (sets up lanes/bodies, spawns no foes, lands on "won"). This collides with
  phase-gated flows: `reopenDraftForJoin` was extended to also reopen from a trailhead-`won`. **Before adding
  any phase-gated logic, check the trailhead case.**
- **Leveling is RUN-WIDE:** one `player.runLevel` follows whatever body you wear within a run, **resets to 1 each
  new run** (`startDraft`). **Foe leveling is separate/per-spawn — do NOT touch it** (the symmetry test relies on it).
- **Two-bucket melee/ranged:** melee = TRUE weapons only; everything else (spells + utility) = ranged. Applies to
  BOTH `isRanged` (badge) AND `triggerKind` (combat). Deliberately NOT unified for draft archetype-fit — a 3rd
  "util" bucket (`cardKind`) keeps utility fitting any body. Don't collapse without owner say-so.
- **`pairMR` is DEAD CODE** (Rent-Seeking Runeblade `pyramidRogue` replaced it: play ranged→+1 melee, play
  melee→+1 ranged, ramps per fight). Kept for reuse, not deleted — don't assume it's live.
- **Medusa intentionally stronger** (utility counts as ranged → shields/heals/Slow trigger her poison; owner OK'd).
- **Level-up payment = COVER (≥cost); Shop = EXACT** trade, auto-commits the instant tendered value == price.
- **Combat foe inspect on mobile:** plain tap toggles inspect; **aiming needs the 🎯 Target toggle FIRST**.
- **Room choice = VOTE in co-op** (each seat votes, all must Lock-in, majority/ties-random); **SOLO resolves
  instantly** so autopilot/`{type:"advance"}` still works.

## Landmines
- **NEVER `git add -A`.** Untracked MUST-NOT-COMMIT: `content-{tank,summon,misc}.js` (rejected agent-designed
  cards, not loaded), `_snapshot-sample.json`, `loop-report.json`, `tools/mp-playtest.mjs`, `tools/wear-shot.mjs`.
  **NEVER `rm`/`Remove-Item`** (owner guardrail — delete is the one thing he wants to approve).
- **Server is non-watch:** restart `bun run server.js` after ANY `game.js`/`server.js` edit. `public/*` serves
  fresh on hard-refresh (no restart). Quick-tunnel: `"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000` (new URL each time; dies on laptop sleep / S0 Modern Standby).
- **`tools/shoot.mjs` quirks (both BENIGN, not bugs):** (1) after a **DESCEND** it flags a STALL ("stuck in
  'won'") because the autopilot doesn't auto-pick at the *next* floor's trailhead — the screen is fully playable;
  (2) it tends to **LOSE on floor 1** (elite difficulty). `JS errors: 0` (ignore a lone STALL) = healthy.
- **Modern Standby wipes `node_modules` on resume** → playwright tools fail ("Cannot find package 'playwright'").
  Fix: `bun install` (playwright is a devDep). Server + `bun test` don't need node_modules.
- **Worktree-agent base gotcha:** `isolation:"worktree"` agents branch from the repo DEFAULT (`main`, stale),
  NOT `feat/room-draft-overhaul`. Start any worktree-agent prompt with `git merge --ff-only feat/room-draft-overhaul`
  and assert `bun run test/game.test.js` shows the expected baseline (840).

## Pointers
- Run/deploy: `bun run server.js` → http://localhost:3000 (phone: cloudflared tunnel, see Landmines).
- Test: `bun run test/game.test.js` (840 pass). Solo screenshots: `node tools/shoot.mjs` (`BUDGET=200`) →
  `tools/shots/real-<vp>-<ts>/`. Multiplayer: `node tools/mp-playtest.mjs` (`HEADED=1` watches both windows).
- Key files:
  - `game.js` — `GIMMICKS` table + `pickGimmick` (just above `buildLevel`); `buildLevel` (random 3-pick crawl +
    elite gimmick assignment); `enterRoom` (`type==="start"` trailhead branch + elite `room.gimmick`/`roomTimers`
    wiring); `foeCardCost` + `foeCast` (−1 cost gimmick); `processRoomTimers` (acid / scale / ratSpawn kinds);
    snapshot ~4090+ (ships `gimmick`, `roomTimers`, node `gimmick`/`gimmickBlurb`, foe `castFrac`); KIT card defs.
  - `public/client.js` — `roomCardsHtml` (room cards: `★ <gimmick>` tag, `.room-gimmick` blurb, `▶ Enter` bar);
    `bossCounterHtml` (slimmed); `renderBetweenRooms` (trailhead "Choose your first room" copy); playing-header
    gimmick banner via `ench`/`rt`; `drawSummonBody` ~1804 (dashed ring + ✦ name + cast feed); `slotGap` ~1305
    (stack spacing); long-press card tooltip (near the foe-tip handlers); `foeTipHtml` (room-preview foe tip).
  - `public/index.html` — `#setupReopen`, `.room-enter`, `.room-gimmick` styles.
  - `server.js` — `TICK_MS=100` (10 ticks/sec); routes: `advance`(=vote), `lockRoom`/`unlockRoom`, `levelUp`, `buyWare`.
