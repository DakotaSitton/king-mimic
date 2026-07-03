# HANDOFF — King Mimic — 2026-07-03 00:15 CST

> Browser co-op deckbuilder roguelike (**moxie + cards**). Players and foes play by the EXACT same rules with
> the same bodies/cards (the **symmetry pillar** — a level-3 foe == a level-3 player on the same body).
> **Owner authors all DESIGN by hand** (bodies, cards, numbers, icons, effects, level feel); agents do
> ENGINE/mechanics only and FLAG ambiguities — never invent design (he has bounced agent-designed content).
> Branch **`feat/room-draft-overhaul`**, committed & pushed through `01040f4`. Owner playtests live on PC + phone.

## State (verified — everything below ran green on 2026-07-02 night)
- **THE ECONOMY, one screen (all owner-specced 2026-07-02, shipped + screenshot-proven):**
  · **Foe ante = Σ item values + 2×(level−1) + (elite body? +3).** Level 1 FREE. Base foe = 3 commons = ◈3;
    elite-bodied foe = ◈6 to start. (`levelAnte`/`eliteBodyAnte`/`ELITE_BODY_ANTE`, world.js.)
  · **Room budget rolls uniform in [P×F×1 … P×F×3]** per node at map build (`rollRoomAnte`, stockLevelRooms);
    `n.ante` stores the ACTUAL spent total, so the advertised ⚖ never lies. `roomAnteBudget` = back-compat PEAK.
  · **SKEWS** (`ROOM_SKEWS`: swarm/veteran/arsenal/bodies/mixed, equal odds) decide HOW a room spends its
    budget — foe count vs levels vs item quality vs elite bodies. Solo floor-1 (⚖1–3) = always one small foe
    (owner's own formula); variety blooms from floor 2 / bigger parties.
  · **ELITE ROOMS ARE DISSOLVED** (buildLevel mints combat/shop only). Elite *bodies* keep the +3 ante premium
    and still spawn anywhere. `generateEliteFoes`/`ELITE_MIN_CARDS` = retired back-compat shims.
  · **EFFECTS on any room** that can afford them (`ROOM_EFFECT_CHANCE` 0.25 [FLAG my knob]): a `GIMMICKS`
    effect carries `pot: 3` [FLAG placeholder] priced INTO the room's ⚖ and dropped as items on the win.
  · **⚖ = ◈ ALWAYS:** carried gear drops as itself; level ante + elite premiums + effect pots convert to
    random items of EXACT value (`rollCompItems`). A room's threat number IS its loot number.
  · **LOOT BID POINTS (co-op fairness):** on clear, the pool's value splits floor(V/seats) per human seat,
    excess 1-at-a-time to the LOWEST cumulative earner this run → seats never drift >◈1 apart. Claims spend
    the claiming SEAT's points (squad-bot claims spend their owner); points carry across rooms, reset on new
    run (startDraft); SOLO auto-collects as before. Won screen shows "you have ◈N to spend" + per-seat row;
    over-budget tiles grey to "need ◈N". Telemetry `loot_claim` is attributed ({by, seat, left}).
  · **TRADES ARE STRICT 1:1** ("nobody is able to gift"): proposeTrade requires an EQUAL-◈ want; tradeItems
    re-validates; acceptTrade drops want-less offers; `giftItem` retired in place. Compose UI has no gift
    button; the want shelf filters to equal-value spares. Same-seat squad moves stay free (one wallet).
  · **STARTER DECKS = 5 distinct value-1 cards ×2 copies** (rollKit; still MIN_DECK 10); draft UI groups
    pairs with a gold ×2 badge.
  · **MOBILE CARD READING:** draft kit chips tap/hover → floating tip (capture-phase click can't lock the
    bundle); combat hand cards HOLD ~360ms → pinned tooltip, release never casts; phase changes dismiss tips.
- **Verification (2026-07-02 night):** `game.test.js` **891** · `squad` **22** · fuzz **8/8 batches stable**
  (unwinnable stalls COUNTED not failed — see design hole) · `tools/feature-shots.mjs` **20/20** (⚖=◈ live,
  effect-pot card, bid points, 1:1 trades, hold-to-read) · mp-playtest **12/12** both games WON ·
  mobile-verify **5/5** · solo shoot clean — **0 JS errors everywhere**.
- **LIVE RIGHT NOW (this machine):** fresh v2 server on :3000 (logs → `server-tunnel.log`) + cloudflared
  tunnel **https://musicians-keeps-fragrance-prior.trycloudflare.com** (logs → `tunnel.log`). Tunnel dies on
  laptop sleep (S0 Modern Standby) and mints a NEW URL each restart.
- **`DESIGN_LISTS.md`** (untracked, repo root): the full body/card/boss inventory the owner is HAND-EDITING.
  Its "global dials" table predates ante v2 (room ante, level ante rows are stale) — trust the code/this file.
- **`tools/feature-shots.mjs`** (untracked, like mp-playtest): the screenshot-proof harness for everything
  above. Its effect-hunt uses FRESH CONTEXTS per attempt (same-context reload auto-rejoins the dead room).

## Next step
Open with **"point me at HANDOFF.md"**. Nothing mid-flight. The owner owes TWO design decisions — build
nothing on these until he speaks:
1. **"implement DESIGN_LISTS.md"** — he's hand-editing the inventory (new designs + rebalances). When it
   comes back: implement HIS numbers/text exactly, keys are the row IDs, never invent. Two systemic items
   wait on this pass: the **RICH_ITEM_POOL** (higher-value items = currently the retired ◈2–6 first-set
   rares [FLAG placeholder]) and **effect pots/table** (all pot:3 placeholders in `GIMMICKS`).
2. **The SUSTAIN-STALL VALVE (⚠ open design hole):** an out-of-reach sustain foe = an UNWINNABLE,
   UN-LEAVABLE fight — Golden Golem's shield-refill passive and the Kraken's self-shielding steal-entities
   can exceed a thin party's DPS forever; there is NO retreat and the anti-stall was owner-removed (6/24
   "not needed"). Measured ≈1 per 300 fights. Options offered: flee button / stalemate timer / shield cap /
   sustain telegraph. Engine untouched pending his pick.
Also teed up: **(a)** the CORRECT icon audit — from `MAP` in `tools/generate-foe-art.js` (NEVER from the
`FOE_ICON` emoji fallback — that mistake was made on 7/01); Golden Golem now has its own token, but
Toll Troll→balrog and Crypto-Chimera→cerberus are owner-flagged placeholders. **(b)** roster design inputs
(Depression Demon amplifies nothing → re-key or retire; no ally-aura/support archetype among 25 bodies).
**(c)** dead-code cleanup: the `stock` phase is unreachable — trace + propose removal, owner approves deletes.

## Active decisions (non-obvious why only)
- **⚖ = ◈ by construction** — do NOT "fix" a room card showing equal threat/loot numbers; that's the contract.
- **Foe-side rich items are DAMAGING-ONLY** (`enrichFoeGear`): a sustain rare on a foe (Trollskin/Revive/
  Stoneskin) creates the unwinnable-stall hole; players still get the full variety as drops (`rollCompItems`).
- **Elite body ≠ elite room.** The room type is GONE; the body tier lives (ELITE_SET, +3 ante, ADOPT_COST 5,
  never in the run-start draft wheel, spawns as foes anywhere).
- **Bid points equalize VALUE, not cards** — first-click still decides WHICH card you get, never how much.
  Unclaimed cards vanish on advance but their value was banked as points, so skipping spoils costs nothing.
- **Fuzz counts sustain stalls instead of failing** — "combat always resolves" is a known-false balance
  property until the owner picks a valve; the count keeps it visible without flaking CI.
- **Trailhead reuses `phase="won"`** (`enterRoom` `type==="start"`). Check that case before phase-gating.
- **Leveling is RUN-WIDE** (`player.runLevel`, resets in startDraft); foe leveling is per-spawn — don't touch
  (symmetry test relies on it). Level-up payment = COVER (≥cost); shop = EXACT.
- **Room choice = VOTE in co-op** (all seats lock, tie→random voted); SOLO resolves instantly on tap.

## Landmines
- **DON'T audit icons from `FOE_ICON` emoji** (client.js ~1004 — load-failure fallback only). Truth =
  `MAP` in `tools/generate-foe-art.js`; `bun run tools/generate-foe-art.js` regenerates `public/foes/*.svg`.
- **NEVER `git add -A`.** MUST-NOT-COMMIT (gitignored but stage explicitly anyway): `content-*.js`,
  `_snapshot-sample.json`, `loop-report.json`, `tools/mp-playtest.mjs`, `tools/wear-shot.mjs`,
  `tools/feature-shots.mjs`, `DESIGN_LISTS.md`, `server-tunnel.log`, `tunnel.log`. **NEVER `rm`/`Remove-Item`**
  (owner guardrail — deletes are his to approve).
- **Server is non-watch:** restart `bun run server.js` after ANY `engine/*.js`/`server.js` edit. A STALE
  detached server may hold :3000 (one was killed this session — check `Get-NetTCPConnection -LocalPort 3000`).
- **Solo floor-1 rooms can never host an effect** (pot 3 + min foe 3 > peak 3) — not a bug, the formula.
- **`tools/shoot.mjs` quirks (BENIGN):** flags a STALL after DESCEND; tends to LOSE on floor 1. `JS errors: 0`
  = healthy. Plain `bun test` prints "0 tests" (expected — harnesses are self-reporting; read "✅ ALL PASS").
- **Modern Standby wipes `node_modules` on resume** → playwright tools fail; fix with `bun install`.
- **Worktree-agent base gotcha:** `isolation:"worktree"` agents branch from `main` (stale). Start such prompts
  with `git merge --ff-only feat/room-draft-overhaul` and assert `bun run test/game.test.js` shows **891**.

## Pointers
- Run: `bun run server.js` → http://localhost:3000. Phone: `"C:\Program Files (x86)\cloudflared\cloudflared.exe"
  tunnel --url http://localhost:3000` (URL in its log; new each time; dies on sleep).
- Test: `bun run test/game.test.js` (**891**) · `test/squad.test.js` · `test/fuzz.js` (stall count in the OK
  line is expected). WS suites need a live server: `PORT=3777 bun run server.js` then `URL=ws://localhost:3777/ws`.
- Proof harnesses: `node tools/feature-shots.mjs` (mobile-profile feature proofs) · `node tools/mp-playtest.mjs`
  (2P co-op, `HEADED=1` to watch) · `node tools/shoot.mjs` (solo real playthrough) · `node tools/mobile-verify.mjs`.
- Key engine files (`game.js` is a 23-line BARREL — edit the MODULE):
  - `engine/world.js` — ante math (`levelAnte`/`eliteBodyAnte`), `GIMMICKS`+pots, `buildLevel`, `stockLevelRooms`
    (budget roll + effect + skew), `enterRoom`, `descend`.
  - `engine/lobby.js` — `ROOM_SKEWS`/`rollLeveledFoe`/`generateRoomFoes`/`enrichFoeGear`/`rollCompItems`/
    `RICH_ITEM_POOL`; `roomAnteRange`/`rollRoomAnte`; bid points (`grantBidPoints`/`seatOf`/`claimLoot`);
    1:1 trades (`proposeTrade`/`tradeItems`); draft (`rollKit` 5-pairs, `rollDraftWheel`); `levelUp`.
  - `engine/combat.js` — `simulateTick` (win branch: loot realization + bid-point grant), `resolveOps`,
    `playCard`/`autoPlay`, `atlasReflect` (~478).
  - `engine/snapshot.js` — map nodes (`ante`/`loot`/`gimmick`+`gimmickPot`), `players[].bidPoints`.
  - `public/client.js` — `roomCardsHtml` (⚖/◈/💰 pot line), `renderBetweenRooms` (spoils + bid points +
    1:1 trade compose), draft ×2 chips + `showDataTip`, canvas hand hold-to-read (`_handTip`).
  - `server.js` — `TICK_MS=100`; routes `advance`(=vote), `claimLoot` (attributed telemetry), `proposeTrade`.
