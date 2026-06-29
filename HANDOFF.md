# HANDOFF — King Mimic — 2026-06-29 18:45

> Browser co-op deckbuilder roguelike (**moxie + cards**). Players and foes play by the EXACT same
> rules with the same bodies/cards (the **symmetry pillar** — a level-3 foe == a level-3 player on the
> same body). **Owner authors all DESIGN by hand** (bodies, cards, numbers, level feel); agents do
> ENGINE/mechanics only and FLAG ambiguities — never invent design.
> Branch **`feat/room-draft-overhaul`** @ `4203e0b`, **pushed to origin**. LIVE and being playtested.

## State (verified this session)
- **Tests:** `bun test test/game.test.js` → **840 pass / 0 fail**. (The file is a SELF-REPORTING harness —
  read its "✅ ALL PASS — N passed" line; `bun test` itself prints "0 tests", that's expected, not a failure.)
- **Multiplayer VERIFIED end-to-end** via `node tools/mp-playtest.mjs`: 2 players join one room by code →
  co-op combat resolves → won-screen VOTE gates on all-seats-locked → majority wins, ties random. **0 JS errors.**
- **Deployed LIVE:** `bun run server.js` on **:3000** + cloudflared tunnel
  **https://outline-thumb-personals-specified.trycloudflare.com** (both 200). Owner playtests on iPhone + with roommates.
- Solo real-run screenshots (`tools/shoot.mjs`) ran **0 JS errors / 0 404s** on the build. A final post-flip
  health-check was still running at handoff — confirm its summary shows `JS errors: 0`.

## Next step
Everything is committed, pushed, and LIVE — **no code task is mid-flight.** Await the owner's direction from
the fresh session. Known candidates if he picks one up:
- **Adoption affordability bug** ("couldn't buy a body I had spare cards for until later in the run") — owner
  has NO repro yet (watching for it). If it recurs, get the body + floor, then audit `adoptCost`/`tenderValue`
  spare-value accounting (does it count only SPARE value vs deck copies; is the gate ◈5 of spares).
- **Custom level-schema redesign** (owner-led DESIGN, parked): he wants a level to scale the body's OWN passive
  + a flat HP bump instead of a flat combat stat (current curve favors offensive bodies). Keep modest/linear —
  the curve is SYMMETRIC (foes scale identically). Tunables: `LEVEL_HP_PER_EVEN` / `LEVEL_COMBAT_PER_ODD`.

## Active decisions (non-obvious why only)
- **Leveling is RUN-WIDE** (owner reversed his 2026-06-27 per-body decision on 6/29): one `player.runLevel`
  applies to whatever body is worn and carries across bodies *within* a run, but **RESETS to 1 each new run**
  (in `startDraft`, game.js ~2309). **Foe leveling is separate/per-spawn — do NOT touch it** (the symmetry test
  depends on it).
- **Two-bucket melee/ranged:** melee = TRUE weapons only; everything else (spells + utility like Slow/shields/
  heals/buffs/summons) = ranged. Applies to BOTH the badge axis (`isRanged`, game.js ~456) AND the combat-TRIGGER
  axis (`triggerKind(key) = cardKind==="melee" ? "melee" : "ranged"`, ~480). **Deliberately NOT unified for draft
  archetype-fit** — `itemFlavor`/`cardKind` keep the 3rd "untyped"/"util" bucket so utility still **fits any body**
  in the draft. Don't collapse that without owner say-so.
- **Rent-Seeking Runeblade (`pyramidRogue`):** new passive = play a ranged card → +1 melee; play a melee card →
  +1 ranged (ramps over the fight, resets each fight). Replaced the old `pairMR`. **`pairMR` is now DEAD CODE** —
  no body uses it; kept in place for reuse, NOT deleted.
- **Medusa is intentionally stronger** now: utility counts as ranged, so shields/heals/Slow trigger her
  poison-on-ranged. Owner OK'd this power bump (2026-06-29).
- **Level-up payment = COVER (≥cost)** (5/10/15 aren't always exactly makeable). **Shop = EXACT** trade, and the
  shop now AUTO-COMMITS the buy the instant tendered value == price (the `✓ Buy` button was removed). Both confirmed.
- **Combat foe inspect on mobile:** a plain tap on a foe toggles an inspect overlay (passive + full deck);
  **aiming still requires the 🎯 Target toggle FIRST** (a plain tap no longer aims). `_inspectFoeId` (client.js).
- **Mobile foe layout:** compact one-row-per-foe (HP · shield · ⚡moxie + next-card cast bar); up to 4 fit without
  clipping. Tradeoff: the row drops the foe's passive *sentence* — read it via the tap-to-inspect above.
- **Room voting** replaced first-click-wins: each human SEAT votes (icon rides the room), every seat must Lock-in,
  majority wins / ties random; SOLO resolves instantly (so autopilot/`{type:"advance"}` tools still work).
- **Level curve is SYMMETRIC and PARKED:** owner finds it offense-favoring and wants a redesign later (idea: a level
  should scale the body's OWN passive + a flat HP bump, not a flat combat stat; keep it modest/linear since foes
  scale identically). Constants `LEVEL_HP_PER_EVEN=3` / `LEVEL_COMBAT_PER_ODD=1` are tunable. Current curve KEPT for now.

## Landmines
- **NEVER `git add -A`.** Untracked, MUST-NOT-COMMIT: `content-{tank,summon,misc}.js` (rejected agent-designed
  cards, NOT loaded), `_snapshot-sample.json`, `loop-report.json`, `tools/wear-shot.mjs`, `tools/mp-playtest.mjs`.
  **NEVER `rm`/`Remove-Item`** (owner guardrail).
- **WORKTREE BASE GOTCHA (burned us this session):** `isolation:"worktree"` agents branch from the repo's DEFAULT
  branch (`main`, which is ~23 commits STALE), NOT the checked-out `feat/room-draft-overhaul`. EVERY worktree-agent
  prompt MUST start with: `git merge --ff-only feat/room-draft-overhaul` then assert `bun test` shows the expected
  baseline (837) — if it shows ~551, the base is wrong, STOP. Two of four agents silently built on the stale base
  before this was caught.
- **Server is non-watch:** restart `bun run server.js` after ANY `game.js`/`server.js` edit. `public/*` is served
  fresh (hard-refresh). Quick-tunnels die on idle/laptop-sleep (S0 Modern Standby) → respin
  `"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000` (NEW URL each time).
- **Modern Standby wipes `node_modules` on resume** → playwright tools fail ("Cannot find package 'playwright'").
  Fix: `bun install` (playwright is a declared devDep). Server + `bun test` don't need node_modules.
- **Timer-based lasting cards now DO show a chip** (Pet Leech 🩸 / Animated Blade ⏱) — `entityEffects` (game.js
  ~4044) emits a chip per `c.timers`. These are CASTER effects, not foe debuffs — don't "fix" them onto the foe.
- **`pairMR` is dead code** (Runeblade no longer uses it) — don't assume it's live.
- **Worktrees on disk** under `.claude/worktrees/` (batch-1/2 agent worktrees + `integration`). Don't `rm`;
  `git worktree remove --force` if cleaning (one holds a node_modules junction — recursive delete is dangerous).
- **`tools/shoot.mjs` tends to LOSE on floor 1** (elite difficulty) — that's gameplay, not a bug; `JS errors: 0` = healthy.

## Pointers
- Run/deploy: `bun run server.js` → http://localhost:3000 · phone: cloudflared tunnel (see Landmines).
- Test: `bun test test/game.test.js` (837).
- **Multiplayer verify:** `node tools/mp-playtest.mjs` (`HEADED=1` watches both Edge windows; private port, never :3000).
- Solo screenshots: `node tools/shoot.mjs` (real run, `BUDGET=200`) → `tools/shots/real-<vp>-<ts>/`.
- Key files:
  - `game.js` — KIT card defs ~350-451; body passives ~200-260; `isRanged`/`cardKind`/`triggerKind` ~456-481;
    `runLevelOf`/`applyBodyLevel`/`levelUp`/`levelUpCost` ~1266-1416; new-run reset in `startDraft` ~2297-2312;
    `advanceLevel`+`voteRoom`/`lockRoom`/`unlockRoom`+tally ~2395-2500; `entityEffects` ~4036; `snapshot` ~4090-4320.
  - `public/client.js` — `roomCardsHtml`+vote badges ~2071 & `roomVoteBar`; `foeTipHtml` ~876 (room-preview tap/hover
    tooltip); `drawFoeRow` (mobile foe rows) + `drawFoeInspect` ~1889 + `_inspectFoeId` (combat tap-to-inspect);
    `buildLevelUp`/`wireLevelUp` (tender tray); shop auto-commit in the shop overlay.
  - `server.js` — routes: `advance`(=vote), `lockRoom`/`unlockRoom`, `levelUp`(w/ chosen `pay`), `buyWare`.
  - `tools/mp-playtest.mjs` — the 2-client multiplayer verification harness (untracked).
