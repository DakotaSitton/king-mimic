# HANDOFF — King Mimic — 2026-06-27 18:55

> **LATEST (this session):** ROOM-DRAFT flow shipped — rooms are now pre-built and OFFERED via the map
> after combat (no more per-foe "stock" step), each filled with a random foe selection EQUAL to the room
> ante (floor × party); elites = double-ante rooms (no Atlas centerpiece); shops unchanged. Deployed to
> :3000, 712 game tests green, real playthrough clean. Details + the one open balance flag → "Next step" below.

> Browser co-op deckbuilder roguelike (**moxie + cards**). Players and foes play by the EXACT same
> rules with the same cards/bodies (the "symmetry pillar"). **Owner authors all DESIGN by hand**
> (bodies, cards, numbers, passives); agents implement ENGINE/mechanics only and FLAG ambiguities —
> never invent design. Slice detail lives in `HANDOFF-engine.md` and `tools/HANDOFF-rendering.md`.
> This session: caravan REMOVED, foe targeting/breach + telegraph, the foe/player LEVEL+ANTE system,
> and three balance batches (A timing, C timing-cards, **B = poison/slow/weakness + 9 bodies + 5 cards**).

## State (verified this session)
- **Tests green:** `bun test test/game.test.js` → **716 passed, 0 failed** (includes 15 new batch-B
  assertions: poison tick, Weakness round-up, Slow half-rate, Basilisk weakenLane, Depression Demon
  2× duration, Killionaire opening moxie, Bonelord onKill, Neptune cost).
- **Real playthrough:** `node tools/shoot.mjs` (REAL solo run, not a fixture) — one run reached **floor 2**
  (cleared the Hydra boss, descended, fought the Djinn of Deals); a second run logged **0 JS errors / 0
  404s / no missing art**. Autopilot is random and sometimes dies on floor 1 — that's balance, not a bug.
- **Batch B deployed LIVE:** server restarted on **:3000**, cloudflared tunnel reachable (HTTP 200) at
  `https://radius-equipped-billy-informal.trycloudflare.com`. Owner is free to playtest batch B now.
- **9 new bodies** (Killionaire, Bankrupt Basilisk, Fundjin, Audit Angel, Mid-Management Medusa,
  Depression Demon, Bookie Bonelord, Debt Dragon, Nepotistic Neptune) — in MOXIE_SET (now 24) +
  FOE_ARCHETYPE. **5 new cards** (Butcher's Cleaver, Pet Leech, Slow, Animated Blade, Weakness) — in
  PLAYER_POOL (now 49). All 9 bodies have art (4 newly generated: fundjin/depressionDemon/bonelord/debtDragon).
- **New debuffs:** Poison (1/stack dmg every 6s, `c.poison` counter), Slow (½ moxie regen), Weakness
  (½ damage, round up) — all shown as chips in `entityEffects` (☠ / 🐌 / 📉).
- **Earlier this session (verified then):** caravan removed (loss = all bodies down); foe melee→front of
  own/breached lane, ranged→lowest effective-HP player, with on-portrait target telegraph; foe+player
  LEVEL system (even→+3HP, odd≥3→+1 combat, +2 ante/level, no ante floor); batch A (timed passives 3s→6s,
  −1 cost); batch C (Liquid Metal 3 shield/6s, Haste = moxie 2× for 6s, Blood-to-Iron 1 shield/instance/6s).

## Next step — DONE this session: ROOM-DRAFT flow (owner resolved the design 2026-06-27)
Owner's call (verbatim intent): "every room is offered after combat instead of foes being offered; the
room ante schema is floor × party; each room is a random selection of foes to equal that ante; some rooms
offer double ante, the reward inbuilt to the better selection of bodies and items; same rules otherwise."
**Implemented + deployed (:3000) + verified (712 game tests green, real `shoot.mjs` run = 0 errors):**
- **No more foe-offer (stock) step.** `enterRoom` now PRE-BUILDS the room (random foes filling the ante)
  and goes STRAIGHT to `setup`, like a boss does. The map branch IS the "room offered after combat." The
  old `stock` phase + greedy palette are retired from the live flow — their server handlers / snapshot
  block survive as harmless no-ops (all gated `phase==="stock"`, which never fires now). `renderStock` in
  the client is dead but left in place.
- **Rooms FILL to the ante** (`ROOM_FILL_STOP_CHANCE = 0`) — "a random selection of foes to EQUAL that ante."
  The old "mini-opponent" under-fill variance is gone.
- **Elite = a DOUBLE-ANTE room** (no Atlas centerpiece). `generateEliteFoes` is now just `generateRoomFoes`
  at `roomAnteBudget(room,"elite")` (×2). The richer/higher-level foes you fell + loot ARE the reward
  ("inbuilt"). Atlas/`rollEliteFoe`/`ELITE_BODY` kept as a DORMANT named-elite hook (nothing calls it).
- Shops unchanged (already an offered node type). Map already sprinkles ≥1 elite + 1 shop row per floor.

### ⚑ ONE open flag for the owner (a balance dial — his call)
The room budget is **floor × party** (the existing `roomAnteBudget = ROOM_ANTE_BUDGET_PER(5) × party × floor`,
×2 for elite), per the owner's written Q2 spec. This **supersedes his AskUserQuestion Q1 pick of "build-power
ante" (items+level)** — the two conflict and the written prose won. If he actually wants rooms to track the
party's loadout/build instead of floor×party, that's a one-function swap at `roomAnteBudget` (game.js ~974,
flagged in-comment). Surface this when he next looks at it.

## Active decisions (non-obvious why only)
- **`node tools/shoot.mjs` is the ONLY honest screenshot/playthrough tool.** It drives a REAL solo run via
  the client's `window.KM` bridge. `tools/realshot.js`+`realsnap.js` are now relabeled **FIXTURES** (hand-built
  3-player scene that never arises in solo play) — their output is watermarked "FIXTURE — NOT A REAL GAME".
  Never present fixture output as gameplay. `buildDemoSnap` (server) is likewise fake/superseded.
- **Authored `cost:` wins.** `KIT[k].cost = KIT[k].cost ?? CARD_COST[k] ?? defaultCardCost(k)` (game.js ~507).
  CARD_COST only holds legacy cd-era keys, NOT the o*/d* cards — those carry their own `cost:`.
- **Timed effects for CASTERS** needed a separate path: `tickOwnTimers` runs `every:N` for non-casters only,
  so `tickTimers` + a `timer` op were added to run `c.timers` and body `every:N` for casters. Poison/Slow/
  Weakness/weakenLane are side-aware in `resolveOps` (hero→foes, foe→heroes+summons).
- **gain-trigger room availability:** `{gain:N}` body passives fire via `gainTriggerPassives` from the
  per-tick loops (player/foe regenMoxie + the gainMoxie op) where `room` is in scope — NOT inside `addBuff`/grant.
- **Sprite art = best-fit CC-BY game-icons, flagged for owner.** The 4 new sprites use `delapouite/djinn`,
  `lorc/gooey-daemon`, `lorc/crowned-skull`, `lorc/dragon-head`. Owner may want bespoke art (see ⚠ in
  `tools/generate-foe-art.js` MAP). Regenerate with `bun run tools/generate-foe-art.js` (needs `~/game-icons-src`).

## Landmines
- **Server runs NON-watch and is STALE until restarted.** It's `bun run server.js` (no `--watch`) — chosen so a
  stray edit can't reload and wipe the owner's live playtest room. It imports `game.js` once at boot. After ANY
  `game.js`/`server.js` edit you MUST restart it to deploy. `public/*` changes are live on a browser hard-refresh.
- **`bun --watch run server.js` WIPES in-memory rooms on every file save.** Fine for solo dev, bad mid-playtest.
- **The 9 new bodies' `maxHp` values are MY defaults (6–9), flagged for owner tuning.** Same for the best-fit
  sprite icon choices. These are the most likely things the owner will want to adjust after playing.
- **Symmetry assumptions to confirm:** the new bodies/cards are draftable by the player AND rosterable as foes.
  A couple (e.g. Fundjin's double `every:60`, Neptune's `doubleExpensive`) have only been UNIT-tested for the
  cost/shape, not seen firing live in a full run — watch them in real play.
- **All work is UNCOMMITTED on `main`** (game.js, public/client.js, all regenerated `public/foes/*.svg`,
  test/game.test.js, BALANCE_BATCH.md). Owner hasn't asked to commit. Branch before committing (don't commit to main).
- **NEVER `rm`/`Remove-Item`** — hard owner delete guardrail. Overwrite via redirect/Write instead.
- Untracked `content-{tank,summon,misc}.js` on disk are EXCLUDED from commits — must not be merged.

## Pointers
- Run (deploy): `bun run server.js` → http://localhost:3000 · Phone: `cloudflared tunnel --url http://localhost:3000`.
- Test: `bun test test/game.test.js` (716) · also `test/serve.test.js`, `test/squad.test.js`.
- Real screenshots / playthrough: `node tools/shoot.mjs` (BUDGET=, NODES=, VP=desktop, HEADED=1 envs). NOT realshot.
- Spec for this batch: `BALANCE_BATCH.md` (every flag the owner resolved). Slice detail: `HANDOFF-engine.md`,
  `tools/HANDOFF-rendering.md`.
- Key files: `game.js` (engine — BODIES ~140-256 incl. the 9 new at ~226; KIT incl. 5 new cards ~408-420;
  PLAYER_POOL/MOXIE_SET; poison `tickPoison` ~3250, `timer`/`tickTimers`, debuff ops in `resolveOps` ~3435,
  trigger hooks gain/onDeal/onKill, `entityEffects` ~3902 chips, `foeTelegraph` ~3933, leveling ~686-701);
  `public/client.js` (render: `foeSprite`/`ART_ALIAS`/`iconFor` ~905-941); `tools/generate-foe-art.js` (MAP).
