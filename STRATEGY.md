# Session strategy — combat legibility & the "build-it-as-you-go" feel

> What I built this session, why, and how I split the work. High-level — the commits and
> `tools/shots/demo-*.png` have the detail. Date: 2026-06-07.

## The feeling we're chasing (the north star)
**Dragon Quest legibility × WoW Mythic+ self-authored escalation × Jackbox party energy.**
You should always be able to *read* the board and *plan* the next few seconds (DQ), the threat
should be one you *built* and that *ramps* on a clock you can see (M+), and the catharsis is
shared — "oh god, here it comes" → "WE DID IT." Everything below serves that.

## The core tension we resolved
You asked whether the problem was "too many timers" / a missing universal timer, and whether
foes needing "one action" was the issue. The resolution we landed on:
- **Keep per-foe rhythms** (a Pixie jabs fast, an AoE foe charges slow) — that variety *is* the
  legibility, not the enemy. Don't homogenize onto one beat.
- **Escalation belongs on ONE visible layer** (a room-level clock), not N hidden per-foe ramps.
  (We tried a "heat" enrage clock and removed it — reinforcements is the likely future form.)
- **Threat = aggregate + a few telegraphed heavy beats**, not every-foe-a-miniboss.

## What shipped (each tied to the goal)
1. **Lane formation** (`formUp`) — tanky bodies hold the FRONT of each lane (the wall, nearest
   you); squishy/ranged hide behind, smaller & dimmer. Front dies first → the backline gets
   exposed as the wall crumbles. → *DQ formation-reading; "break the wall vs snipe the backliner."*
2. ~~**Room escalation / "heat"**~~ — *removed at your call.* I'd shipped an enrage clock (foes
   speed up over time) as the escalation layer; you pulled it. **Reinforcements** (the pull grows)
   is the alternative we may revisit later. Per-foe rhythms + the telegraphs carry the pressure for now.
3. **Prestock + greed** — rooms ARRIVE pre-stocked with rank-and-file scaled to the floor (the
   balancing mechanism). You *invite* greedy armed picks on top for richer loot — and to grab a
   body you want to wear. No more ante busywork; greed is pure upside-for-risk.
   → *"the dungeon you build as it goes."*
4. **Telegraphs** — every foe card is a charge bar + heat border; an `aoe` foe about to fire
   flashes a pulsing **⚠ ALL LANES** banner and tints the whole board red. → *the shared dread beat.*
5. **Players are mimics** — each player now renders AS the body it wears (same art as a foe),
   ringed as a hero (team color; gold ring + 👑 for you). → *sells "I AM the mimic."*
6. **Bigger, legible cards** + the inventory body-card now shows your worn body's combat identity
   (⚔phys ✦mag · affinity · tempo · 🎒 kit slots).

## How I split the work
- **I kept the game-logic spine myself** (formation, prestock economy, the `aoe`
  flag, snapshot contract). It's the riskiest, subtlest part and I had the full design context;
  committed in four green milestones.
- **I delegated the big client-render overhaul to a background sub-agent** in an isolated git
  worktree, against a frozen snapshot contract, while I did the right-panel/map polish on
  disjoint files in parallel.
- **The agent misfired** — its worktree branched off the stale `origin/main` (this session's work
  was never pushed), so it built against a months-old version and its diff was unmergeable. Main
  was untouched, so nothing was lost. I **kept its report as a blueprint** and implemented the
  canvas overhaul myself against the real code. (Lesson logged: push or branch from local HEAD
  before spawning worktree agents.)

## Testing — end to end, the way you like it
- **349 logic tests** (`bun test/game.test.js`, pure/instant) + **serve** + **multiplayer smoke**
  + a **full economy+shop E2E over the real WebSocket server** (`test/e2e.js`).
- **Visual E2E is fixed**: Edge's native `--headless --screenshot` (no Playwright — it hangs
  under Bun and there's no Node). `tools/shoot.ps1` boots the server, captures every `?demo=`
  screen, cleans up. See `tools/shots/demo-{combat,stock,setup,shop,won,draft}.png`.

## Still open (your calls — not guessed)
- **Boss / elite rewards** — bosses still drop nothing under the loot→Treasure model (no
  `draftedFoes`). Pick a flavor (floor-scaled purse? guaranteed gear?) — see `IDEAS.md` §9.
- **Escalation, take two** — enrage was removed; **reinforcements** (the pull grows mid-fight) is
  the candidate to try when you want a room-level pressure clock back.
- **Dynamic re-formation on summon** — formation sets at room build + promotes on death; live
  re-sort when a foe is summoned mid-fight is deferred (avoids target-jump jank).
- **Per-player Treasure wallets** (multiplayer) — still a shared bank.
- **Tuning** — the new numbers (`baselineSize`, greed pricing, shop costs) are blind first
  guesses. Playtest and tell me the feel.

## Where to look
- Run: `bun run server.js` → http://localhost:3000 (Ctrl+Shift+R once). `?demo=combat` shows the
  new board offline.
- Screens: `tools/shots/demo-*.png`. Logic: `game.js`. Render: `public/client.js`.
- Idea bank: `IDEAS.md`. Resume doc: `HANDOFF.md`.
