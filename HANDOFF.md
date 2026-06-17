# HANDOFF — King Mimic — 2026-06-17 (ON A BREAK — owner refocusing on lucrative work)

> Pick-up doc for a cold instance. King Mimic is a soft-real-time co-op browser roguelike:
> N lanes (= player count 1–4), defend the shared Caravan, wear the bodies of foes you defeat.
> BUILT & validated (a full 3-floor run + throne has been beaten). Owner took a deliberate
> break on 2026-06-17 to focus on the income bet (construction software w/ his brother) — King
> Mimic is the capped FUN budget. Everything below is committed to origin/main and green (379/379).

## State (this session, 2026-06-16/17 — all committed, tests green)
- **Tempo: whole game slowed in passes** — ×1.5, then summoner +1s, then +1s on everything.
  LITERAL tick numbers (no universal modifier — owner canon), 1:1 hero/foe symmetry preserved.
  Current anchors: crossbow 25 (2.5s), Sword 40 (4s), summoner clocks every 8s, bosses scaled to match.
- **AUTO fire = every button** — ⚡ AUTO now fires EVERY ready active item (damage, heals,
  shields, summons, buffs, AND the fragile one-shots Giga/TimeStop/Revive). Only worn passives
  (Slime Crown — no ops) are skipped. game.js ~2444. (Owner accepted that AUTO now spends panic buttons at fight start.)
- **Economy**:
  - Body unlock ladder = flat +15 per tier: gold 3 → 15, gold 5 → 30 (`unlockCost` = 15×rank).
  - Kit-slot upgrades = DOUBLING 4/8/16/32/64, capped at 64 (`kitSlotCost`; MAX_KIT 8 = exactly 5 steps).
- **Wandering Monster** = one foe PER LANE (was one random lane) — fair for bigger parties; solo unchanged.
- **Body screen** (public/inventory.js): lists EVERY felled body; ones above your tier show the
  marginal upgrade cost and clicking buys that threshold.
- **Mobile**: MANUAL/AUTO row moved above the summon toggle (it was falling below the fold).
- **Bug fixes (2026-06-17)**:
  - Triple-palette: above the content ceiling the palette returned the single biggest foe on
    EVERY call → all 3 slots identical. Now rotates the biggest DISTINCT options (`nextPaletteOption`).
  - Blizzard/Lightning (lane AoE) skipped the back-line boss (`room.boss` isn't in `room.lanes`)
    → did NOTHING to Hydra/Lich/Kraken/King. Now hit it (damage + clock-drain). game.js ~2227, ~2258.

## Analysis tools (added this session)
- `bun tools/bodypower.js` — 1v1 power curve: the max foe ante a given body+kit can solo.
- `bun tools/tierlist.js` — ranks all 36 bodies (currently set to the META kit; flip SWORD_KIT/
  STAFF_KIT back to neutral to isolate the body). **Findings:** body GOLD TIER dominates (gold 5
  beats ~9/12 foes vs gold 1 ~2/12); Power × press-rate (crossbow on a high-Power Senior) is THE
  lever; a weak body literally cannot kill a Senior foe (300s stalemate vs ~5s for a Senior body).
  Caveat: the 1v1 mash UNDERRATES echo bodies (Centaur/Mouse) and summoners — they need a
  multi-foe sim (parked).

## Parked / next (owner's design calls — NOT built)
- **The "drafted Senior elite" direction (owner loved it):** rooms where players draft a big
  Senior boss-foe (e.g. a Fat Cat wielding a staff of lightning) among otherwise-weak foes — this
  reframes the Senior power-gap as a FEATURE you author, not an unfair wall. The live design thread.
- **Power-step question UNDECIDED:** owner is unsure whether to shrink the per-tier +Power step
  (the root of the dominance). Leaning toward keeping Seniors strong but via HP/passive, not raw
  Power. No verdict yet.
- **Multi-foe tier-list sim** — to fairly rate summoners/auras/echo (1v1 underrates them).
- **Fragile summon items** (Bulwark/wall, Siege/AOE attacker) — proposed, not built (need owner prices).
- **Fly deploy** — for a PERMANENT link; the cloudflared quick-tunnels keep going stale (the URL
  had to be reissued ~4× this session). Strongly recommended before the next roommate playtest.

## Landmines
- **Scratch files in the tree (untracked, NOT committed):** `_blizcheck.mjs`, `_palcheck.mjs`
  (this session's repro sims), `probe_lanes.mjs`, `probe_latejoin.mjs`, `tools/tunnel.out`,
  `tools/tunnel.log`. Deleting trips the owner's rm guardrail — ASK before removing.
- **Tests pin exact cooldown tick counts** — every tempo nudge breaks ~17–20 timing assertions
  that must move with it. Recurring pain; a named-tier cooldown refactor would make tempo a
  one-line change, but the owner hasn't approved it (pitched twice).
- Restart the server for game.js/server.js edits (imported once at boot); KILL stale bun first. Bun only.
- The public tunnel was KILLED at this seam (owner went on break). New tunnel = new URL.
- `room.boss` is NOT in `room.lanes` — any new "all foes" sweep must add it explicitly (this was the Blizzard bug).

## Pointers
- Run (detached): `powershell -Command "Get-Process bun -EA SilentlyContinue | Stop-Process -Force; Start-Process bun -ArgumentList 'run','server.js' -WorkingDirectory 'C:\Users\dakot\king-mimic' -WindowStyle Hidden"` → http://localhost:3000
- Test: `bun test/game.test.js` (379 assertions, pure engine, no server).
- Key files: `game.js` (the whole engine — KIT cds ~270, BODIES/rarity tiers ~140, unlockCost/
  kitSlotCost ~360/770, nextPaletteOption ~539, AUTO fire ~2444, op resolver switch ~2216) ·
  `public/inventory.js` (body-swap modal) · `public/index.html` (controls + overlay CSS) ·
  `test/game.test.js` (every owner ruling pinned as a named assertion).
