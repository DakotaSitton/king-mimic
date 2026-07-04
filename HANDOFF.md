# HANDOFF — King Mimic — 2026-07-04

> Browser co-op deckbuilder roguelike (**moxie + cards**). Players and foes play by the EXACT same rules with
> the same bodies/cards (the **symmetry pillar** — a level-3 foe == a level-3 player on the same body).
> **Owner authors all DESIGN by hand** (bodies, cards, numbers, icons, effects, level feel); agents do
> ENGINE/mechanics only and FLAG ambiguities — never invent design (he has bounced agent-designed content).
> Branch **`feat/room-draft-overhaul`**, committed & pushed through **`1d99929`**. Owner playtests live on PC + phone.

## State (verified — game/squad/fuzz ran green this session unless noted)
- **ANTE V3 shipped this session (4 commits `55f88e9`→`6d6b133`→`e890394`→`1d99929`). This SUPERSEDES the
  "ante v2 / ⚖=◈" model that older docs + code comments still reference in places:**
  · **Foe ante (⚖ = THREAT) = 1 + Σ items + 2×(level−1) + (elite? +3).** Every foe carries a flat **+1 base**
    (`FOE_BASE_ANTE`, world.js). Base foe = 1+3 commons = **◈4**; elite = 1+3+3 = **◈7**. Verified via probe.
  · **Room budget = P×F×4×(1..3) = a uniform range [P×F×4 … P×F×12]** (`ROOM_ANTE_BASE_PER=4`,`PEAK_PER=12`,
    lobby.js). The ×4 couples budget to the ◈4 base foe (solo-f1 MIN roll = 4 = one starter foe). `n.ante`
    still stores the ACTUAL spent total so the advertised ⚖ never lies.
  · **LOOT (◈) ≠ THREAT (⚖) NOW.** The +1 base is a **threat-only cover charge that does NOT drop**. A foe's
    ◈loot = its carried cards (drop as themselves) + its "higher than base 1" surplus (`levelAnte +
    eliteBodyAnte`) dropped as THAT MANY random treasures (`rollCompItems` on win). So **◈ runs exactly
    1-per-foe BELOW ⚖** (owner 2026-07-03: "any foe higher than base 1 gives that many random treasures").
    `foeLootValue`=items+level+elite (world.js); node `◈loot` in snapshot.js = Σ foeLootValue + effect pot.
  · **Room foe cap = 4 PER LANE** (`FOES_PER_LANE=4` cards.js × laneCount → `roomFoeCap`, lobby.js), replacing
    the flat STOCK_MAX=12 in `generateRoomFoes`. Lanes = players (1–4) → cap 4 (solo) / 8 (2p) / 16 (4p);
    round-robin placement keeps every lane ≤4. This bounds SWARMS; a capped swarm leaves budget UNSPENT.
  · **Duplicate-tender bug FIXED** (client.js): level-up + shop pay-trays toggled by card KEY, so you could
    never tender a 2nd copy of the same card (→ "can't select duplicates" + "can't reach the cost"). Each
    tile now carries `data-paid`; tap an untendered copy → ADD, a tendered one → REMOVE. Server `tenderValue`
    already handled multi-copy pay arrays — this was client-only. **Shipped but NOT browser-tested and NOT yet
    owner-confirmed** (he was about to hard-refresh + retry; also unconfirmed: shop exact-value auto-buy with dupes).
- **STILL TRUE from before (unchanged this session):** SKEWS (swarm/veteran/arsenal/bodies/mixed) decide how a
  room spends budget; ELITE ROOMS dissolved (elite BODIES keep +3, spawn anywhere; `generateEliteFoes` = shim);
  room EFFECTS (`GIMMICKS`, `ROOM_EFFECT_CHANCE` 0.25, `pot:3` [placeholder]) price into ⚖ + drop as items;
  LOOT BID POINTS (co-op fairness, split floor(V/seats), excess→lowest earner, ≤◈1 drift; solo auto-collects);
  TRADES strict 1:1 (no gifts); STARTER DECKS 5 distinct ◈1 cards ×2 (MIN_DECK 10); mobile card reading
  (draft chips tap-to-tip, combat hand hold-~360ms). Leveling RUN-WIDE (`player.runLevel`); level-up = COVER, shop = EXACT.
- **Verification this session:** `game.test.js` **893** · `squad` **22** · `fuzz` **60 runs, 0 invariant
  violations** (1 sustain-stall abandoned = known design hole, counted not failed). Ante-v3 numbers + the
  4/lane cap confirmed by throwaway probes. **NOT re-run this session:** `tools/feature-shots.mjs` and
  `tools/mp-playtest.mjs` (untracked) — feature-shots asserts the OLD ⚖=◈ contract, so it will now FAIL
  until its loot assertions are updated to ⚖ = ◈ + foeCount.
- **LIVE RIGHT NOW:** fresh server RESTARTED this session on :3000 (PID was 24824; logs `server-tunnel.log` +
  `server-tunnel.err.log`), serving all 4 commits — verified HTTP 200 on localhost AND through the tunnel
  **https://musicians-keeps-fragrance-prior.trycloudflare.com** (still the same URL; only the bun process was
  swapped behind it). Tunnel dies on laptop sleep (S0 Modern Standby) → mints a NEW URL; re-read from `tunnel.log`.
- **`DESIGN_LISTS.md`** (untracked, repo root): the body/card/boss inventory the owner is HAND-EDITING. Its
  "global dials" table is STALE (predates ante v2/v3) — trust the code/this file.

## Next step
Open with **"point me at HANDOFF.md"**. Nothing is mid-implementation — all 4 commits shipped, pushed, live.
The owner is **playtesting ante v3** (bigger rooms, the loot-vs-threat gap, 4-per-lane swarms, the dup-tender fix).
**Await his feedback.** Three ANTE-V3 design flags are open for HIS call (implement none until he speaks):
1. **Room budget shape:** implemented "×(1..3)" as a CONTINUOUS range [4PF,12PF]. If he meant DISCRETE tiers
   {4,8,12}×PF, it's a 1-line swap of `rollRoomAnte`/the two `ROOM_ANTE_*_PER` constants.
2. **Elite base number:** kept the existing +3 premium → elites start at ◈7 (1+3+3). He said "elites start
   higher" with no number; change `ELITE_BODY_ANTE` if he wants a different elite floor.
3. **Swarm leftover:** a capped swarm now leaves budget UNSPENT (design choice). If he'd rather the leftover
   pump into BIGGER foes instead of fewer, that's a change to `generateRoomFoes` (spend remainder on levels).
Carried-forward owner decisions (unchanged): **"implement DESIGN_LISTS.md"** (his numbers exactly, keys=row IDs;
RICH_ITEM_POOL + effect pots are placeholders pending this) and the **SUSTAIN-STALL VALVE** (see Landmines).

## Active decisions (non-obvious why only)
- **⚖ ≠ ◈ ON PURPOSE (NEW 2026-07-03 — reverses the old "⚖=◈ always" contract).** The +1-per-foe base is a
  loot-less cover charge, so a room's ◈loot is legitimately ~1-per-foe below its ⚖ante. Do NOT "fix" a room
  card showing threat > loot — that is now the intended design. (Old docs/comments saying ⚖=◈ are stale.)
- **The +1 base is THREAT-ONLY** — it does not drop. Only a foe's items + level/elite surplus become treasure.
  Keep this straight when touching `foeLootValue` (world.js) or the win-loot `comp` (combat.js).
- **Swarm cap is per-LANE (4×laneCount), not a flat number** — so it scales with party size and a capped
  swarm intentionally under-spends its budget at high floors. `n.ante` records ACTUAL spend, so ⚖ stays honest.
- **Foe-side rich items are DAMAGING-ONLY** (`enrichFoeGear`): a sustain rare on a foe (Trollskin/Revive/
  Stoneskin) creates the unwinnable-stall hole; players still get the full variety as drops (`rollCompItems`).
- **Elite body ≠ elite room.** Room type is GONE; the body tier lives (ELITE_SET, +3 ante, ADOPT_COST 5, never
  in the run-start draft wheel, spawns as foes anywhere).
- **Bid points equalize VALUE, not cards** — first-click decides WHICH card, never how much; skipping loot costs nothing.
- **Fuzz counts sustain stalls instead of failing** — "combat always resolves" is a known-false property until
  the owner picks a valve; the count keeps it visible without flaking CI.
- **Trailhead reuses `phase="won"`** (`enterRoom` `type==="start"`). Check that case before phase-gating.
- **Leveling is RUN-WIDE** (`player.runLevel`, resets in startDraft); foe leveling is per-spawn — don't touch (symmetry test relies on it).
- **Room choice = VOTE in co-op** (all seats lock, tie→random voted); SOLO resolves instantly on tap.

## Landmines
- **⚖=◈ IS DEAD — but the codebase still half-references it.** `tools/feature-shots.mjs` (untracked) asserts
  the old equal-threat/loot contract and will FAIL now; update its loot check to ⚖ = ◈ + foeCount before trusting it.
  Stray "⚖=◈" comments may still lurk; the LIVE truth is `foeLootValue` (world.js) + snapshot node `loot`.
- **`test/e2e.js` is DEAD (gold-era) — don't chase it.** It reads `p.treasure` (wallet removed), `roomValue`
  mirrored-income, "caravan fell" (caravan deleted) and needs a live :3000 server. It failed this session;
  that is PRE-EXISTING rot, unrelated to any current change. Not in the maintained suite (game/squad/fuzz).
- **DON'T audit icons from `FOE_ICON` emoji** (client.js — load-failure fallback only). Truth = `MAP` in
  `tools/generate-foe-art.js`; `bun run tools/generate-foe-art.js` regenerates `public/foes/*.svg`. Toll
  Troll→balrog and Crypto-Chimera→cerberus are owner-flagged placeholder icons.
- **NEVER `git add -A`.** MUST-NOT-COMMIT (gitignored — stage explicitly): `content-*.js`, `_snapshot-sample.json`,
  `loop-report.json`, `tools/mp-playtest.mjs`, `tools/wear-shot.mjs`, `tools/feature-shots.mjs`, `DESIGN_LISTS.md`,
  `server-tunnel.log`, `server-tunnel.err.log`, `tunnel.log`. **NEVER `rm`/`Remove-Item`** (owner guardrail).
- **Server is non-watch** for engine edits: restart `bun run server.js` after ANY `engine/*.js`/`server.js`
  change (check `Get-NetTCPConnection -LocalPort 3000`; stop only that PID). BUT `public/*` (client.js/css/html)
  is served `readFileSync` PER REQUEST (server.js ~198) → a browser **hard-refresh** picks up client changes,
  NO restart needed. No service worker caches assets, so hard-refresh is enough on phone too.
- **SUSTAIN-STALL VALVE (⚠ open design hole):** an out-of-reach sustain foe (Golden Golem shield-refill, Kraken
  self-shield steal) = an UNWINNABLE, UN-LEAVABLE fight; anti-stall was owner-removed 6/24. ≈1/300 fights.
  Options offered: flee button / stalemate timer / shield cap / sustain telegraph. Engine untouched pending his pick.
- **`tools/shoot.mjs` quirks (BENIGN):** flags a STALL after DESCEND; tends to LOSE on floor 1. `JS errors: 0`
  = healthy. Plain `bun test` prints "0 tests" (harnesses self-report; read "✅ ALL PASS").
- **Modern Standby wipes `node_modules` on resume** → playwright tools fail; fix with `bun install`.
- **Worktree-agent base gotcha:** `isolation:"worktree"` agents branch from `main` (stale). Start such prompts
  with `git merge --ff-only feat/room-draft-overhaul` and assert `bun run test/game.test.js` shows **893**.

## Pointers
- Run: `bun run server.js` → http://localhost:3000. Phone tunnel: `"C:\Program Files (x86)\cloudflared\cloudflared.exe"
  tunnel --url http://localhost:3000` (URL in `tunnel.log`; new each restart; dies on sleep).
- Test: `bun run test/game.test.js` (**893**) · `test/squad.test.js` (**22**) · `test/fuzz.js` (stall count in
  the OK line is expected). WS suites need a live server: `PORT=3777 bun run server.js` then `URL=ws://localhost:3777/ws`.
- Proof harnesses (untracked): `node tools/mp-playtest.mjs` (2P co-op, `HEADED=1`) · `node tools/shoot.mjs`
  (solo real playthrough) · `node tools/feature-shots.mjs` (⚠ stale ⚖=◈ assertions — fix before trusting).
- Key engine files (`game.js` is a 23-line BARREL — edit the MODULE):
  - `engine/world.js` — ante math (`FOE_BASE_ANTE`/`levelAnte`/`eliteBodyAnte`/`anteOfFoe`/`foeLootValue`),
    `GIMMICKS`+pots, `buildLevel`, `stockLevelRooms` (budget roll + effect + skew), `enterRoom`, `descend`.
  - `engine/lobby.js` — `ROOM_ANTE_*_PER`/`roomAnteRange`/`rollRoomAnte`; `FOES_PER_LANE`/`roomFoeCap`;
    `rollLeveledFoe`/`generateRoomFoes`/`enrichFoeGear`/`rollCompItems`/`RICH_ITEM_POOL`; `minFoeAnte`;
    bid points (`grantBidPoints`/`claimLoot`); 1:1 trades; draft (`rollKit`); `levelUp`/`tenderValue`.
  - `engine/cards.js` — `STOCK_MAX` (12, back-compat), `FOES_PER_LANE` (4).
  - `engine/combat.js` — `simulateTick` (win branch: loot realization `comp` + bid-point grant), `resolveOps`.
  - `engine/snapshot.js` — map nodes (`ante`=⚖, `loot`=◈=Σ foeLootValue+pot), `players[].bidPoints`.
  - `public/client.js` — `roomCardsHtml` (⚖/◈), `buildLevelUp`/`wireLevelUp` + shop `[data-pay]` tender
    (the `data-paid` dup-tender fix lives in both), `renderBetweenRooms`, canvas hand hold-to-read.
  - `server.js` — `TICK_MS=100`; serves `public/*` per-request; routes `advance`(=vote), `levelUp`, `claimLoot`.
