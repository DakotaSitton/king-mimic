# HANDOFF — King Mimic — 2026-07-11 ~17:45 (multi-agent batch mid-integration; usage-limit cutoff imminent)

> Browser co-op deckbuilder roguelike (moxie + cards, full player/foe symmetry). Owner **Dakota**
> authors ALL design by hand; agents do engine/rendering/tests only and **FLAG** any number he didn't
> state. Runtime = **Bun**. Working branch = `feat/room-draft-overhaul`, HEAD = **`c67b6d3`** (LIVE on `:3000`).
> Fresh web tunnel LIVE: **https://previous-tim-and-myth.trycloudflare.com** → `:3000` (cloudflared alive; don't rotate).

## State (what's LIVE vs staged)
- **feat HEAD `c67b6d3` is deployed on `:3000`** (client-only, hard-refresh). It contains, merged & verified:
  - **Mobile reconnect fix** (`ae44534`): phone background/freeze silently kills the socket while readyState
    still reads OPEN; now `visibilitychange`/`pageshow` force a fresh socket + rejoin, `onerror` routes to
    rejoin, 1.5s liveness net. Proven via a real zombie-socket probe (reclaims mid-run). CAVEAT: a freeze
    during the DRAFT/class-select still drops the room (server-side teardown, `server.js:686-697` — owner's
    call, NOT changed). Owner still needs to confirm on his actual phone.
  - **Foe summons render as full conjured bodies** (Option A, owner-blessed, `a3cf2a3`): foe summons ≤
    `FOE_SUMMON_CAP` (2 touch/4 desk) now use `drawSummonBody(isFoe=true)` — orange ring, ✦name, cast-feed,
    passive — instead of bare coins. Swarm (>cap) still coins (intentional). Client-only.
- **Warewolf body — committed `0d02bf1` on branch `feat/werewolf-body` (worktree `.claude/worktrees/agent-ab448e6a185ceb14e`), NOT merged/deployed.**
  Owner-designed. HUMAN form: −3 melee & ranged, +1 DR. WOLF form: +3 melee, ranged normal, no DR. Flips
  every 6s on the Economy-Elemental time-clock (moxie-independent, symmetric player/foe). ICON swaps
  human⇄wolf via new `formArt(e)` helper threaded into ~12 client render sites. New `public/foes/warewolf.svg`
  + `warewolfHuman.svg`. Also fixed a latent bug: `damagePlayer` never applied a worn body's `dmgReduce`.
  VERIFIED: game 1370 / squad 22 / fuzz 60 + REAL flip screenshots BOTH directions (person↔beast icon + stat
  line), 0 JS errors. **Engine change → needs a `:3000` RESTART to deploy** (not just hard-refresh).
- **Bug-fix + design batch — IN PROGRESS, worktree `.claude/worktrees/agent-aa6b19da67c029567` (branch off `ae44534`).**
  May be UNCOMMITTED or a WIP commit (told it to commit-and-stop at the cutoff). Scope:
  - BUG1 mobile draft card-name clipping (cause: `public/index.html:103` `.kit-card { white-space:nowrap }` — let it wrap on touch).
  - BUG2 mobile setup BACKPACK row occluded by pinned action bar (add bottom padding = bar height).
  - BUG3 foe telegraph chip name truncation (`drawFoeRow` canvas — grow/wrap or full name on pinned card; do NOT rename cards).
  - DESIGN A (owner-approved) mobile moxie: label it + ⚡X pill by the ❤ HP pill on the portrait.
  - DESIGN B mobile top-HUD contrast (reads as disabled/greyed).
  - DESIGN C loss screen "Defeat — Floor N" headline (currently titled "Combat Log").
  - DESIGN D mobile combat layout tighten (moxie+cards+incoming grouped) — biggest/riskiest, do conservatively.
  - Plus a crowded multi-foe mobile board capture (coverage gap — review only ever saw 1 foe).
  **On resume: inspect this worktree, commit any good uncommitted work, discard any half-written partial.**

## Next step (INTEGRATION — do when back / limit resets)
1. **Recover the bug-fix/design worktree**: `git -C <that worktree> status`; commit good work (explicit stage), discard partials.
2. **Merge into `feat/room-draft-overhaul` (currently `c67b6d3`), one at a time, verify between:**
   `feat/werewolf-body` (`0d02bf1`) and the bug-fix/design branch. **EXPECT `public/client.js` conflicts** —
   all three (foe-summon already in feat, Warewolf `formArt` icon threading, bug-fix HUD/telegraph/moxie)
   touch the combat-render region. Resolve carefully (they're logically independent: icon-selection vs
   ring/hitbox vs HUD layout).
3. **Re-verify** the whole batch: `bun run test/game.test.js` (ALL PASS) / `test/squad.test.js` (22) /
   `test/fuzz.js` (60) + REAL `node tools/shoot.mjs` runs proving: Warewolf flip (`FORCEBODY=warewolf`),
   foe-summon bodies, mobile moxie pill, un-clipped mobile draft, loss headline — all with `JS errors: 0`.
   Owner's hard bar: prove visual work by REAL screenshots I take + look at (memory `feedback_real_game_verification`).
4. **Deploy**: engine changed (Warewolf) → **bounce ONLY the bun `:3000` server, keep cloudflared alive**
   so the tunnel URL holds (memory `reference_km_deploy_tunnel`). Nobody's playing → safe to restart.

## Active decisions (owner's — pending)
- **Warewolf pool**: added as a **common** (draftable + foe-rosterable, shifts odds by 1). Owner may want it
  **defined-but-gated** instead — one-line removal from `MOXIE_SET` (`engine/bodies.js:365`).
- **Warewolf FLAGS**: HP 8 (he said don't care), art glyphs (`lorc/werewolf` + `delapouite/person`), hues,
  DR badge renders as "🛡−1" (reads a bit like "−1 shield" — offered to clarify), menu shows wolf icon.
- **Design D** (mobile layout tighten) is the riskiest of the approved changes — review its pixels closely.
- **Boss / level-up-modal / win screens** never captured — floor 1 is an UNBEATABLE wall (even god-mode 999HP
  STALLS and loses; smells like a softlock, matches telemetry stall-outliers). Offered a **surgical
  state-capture** (force each screen directly) if he wants them design-reviewed; not yet greenlit.

## Landmines / housekeeping
- **~17 stray harness bun/node servers** from today's agent runs are still listening — REAP them once no
  agents are running, KEEPING `:3000` (PID 9304 = live server). Per memory `feedback_process_kill_safety`,
  check ports before killing; leave Tailscale `:36011` + watchdog bun services alone.
- Untracked in main repo (safe, none staged): `CHEATSHEET.md` (DONE — the playtester cheat sheet, could be
  committed), `DESIGN_LISTS.md`, `tunnel.out`/`tunnel-new.out` logs, `tools/zz-*.mjs` god harnesses (throwaway),
  a stray `nul` file in the reconnect worktree (junk from `bun build --outfile /dev/null`; rm guardrail).
- The runaway lesson (memory `agent-delegation-budgets`): a "play until you beat floor 1" capture agent
  burned ~290k for nothing. All agents now get hard budgets + stop conditions; don't aim one at a known wall.

## Pointers
- Run: `bun run server.js` → `:3000`. Real screenshots (THE bar): `node tools/shoot.mjs` (mobile),
  `VP=desktop node tools/shoot.mjs`, `FORCEBODY=warewolf` (the flip), `FORCEFOE=frugal` (rat swarm).
- Suites (crash-net only): `bun test/game.test.js` · `bun test/squad.test.js` · `bun test/fuzz.js`.
- Worktrees this batch: `agent-ab448e6a185ceb14e` (Warewolf, committed) · `agent-aa6b19da67c029567` (bug/design, WIP).

Open with **"point me at HANDOFF.md"**.
