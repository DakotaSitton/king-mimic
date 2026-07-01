# HANDOFF — King Mimic — 2026-07-01 14:20 CST

> Browser co-op deckbuilder roguelike (**moxie + cards**). Players and foes play by the EXACT same rules with
> the same bodies/cards (the **symmetry pillar** — a level-3 foe == a level-3 player on the same body).
> **Owner authors all DESIGN by hand** (bodies, cards, numbers, icons, gimmick set, level feel); agents do
> ENGINE/mechanics only and FLAG ambiguities — never invent design (he has bounced agent-designed content).
> Branch **`feat/room-draft-overhaul`**, committed & pushed to origin. Owner playtests live on his PC.

## ⭐ TOP PRIORITY (this session's correction — a cold session WILL get this wrong otherwise)
- **THE REAL BODY ICONS ARE THE VECTOR SVGs in `public/foes/*.svg` — NOT the `FOE_ICON` emoji.** An icon
  audit this session validated the emoji table and was **entirely off-target** (owner: "those aren't the icons").
  - **Source of truth = the `MAP` object in `tools/generate-foe-art.js`**: each body key → `{ c: <theme color>,
    i: "<author>/<icon-name>" }`, where `i` is a hand-picked **game-icons.net** vector (CC BY 3.0, cloned to
    `~/game-icons-src`). Run `bun run tools/generate-foe-art.js` to regenerate the SVGs after editing `MAP`.
  - **`FOE_ICON` (client.js ~L1004) is ONLY a load-failure fallback.** Per the generator header: emoji-in-SVG
    renders as monochrome tofu (□) on mobile, which is the whole reason the SVGs exist. Users almost never see
    the emoji. **Do NOT audit or "fix" icons from `FOE_ICON`.**
  - Concrete truth (examples): Neptune = `lorc/trident`; **Atlas = `delapouite/atlas`** (a real world-bearing
    titan — the "Atlas is 🗿" claim from the emoji audit was WRONG). Every body key has a matching `MAP` entry +
    an SVG on disk (verified: all 24 money-monsters + atlas + classes + bosses/tokens have `public/foes/*.svg`).
  - **A CORRECT icon audit** reads `MAP` (`tools/generate-foe-art.js`) — the game-icon each body actually draws —
    and judges that vector vs the body's name/theme. Do it from there. **This is the next real icon task.**
  - Two real icon findings that survive the correction (both about the SVG layer, so still valid): (1) **Golden
    Golem draws `atlas.svg`** — `ART_ALIAS.juggernaut = "atlas"` (client.js:1035) → `artStem` loads `/foes/atlas.svg`,
    so Golden Golem and the Atlas elite are the SAME token on the board (an orphan `juggernaut.svg` exists but is
    never loaded). (2) Owner-flagged best-fit placeholders at client.js:1030 (Toll Troll→balrog, Golden Golem→atlas,
    Crypto-Chimera→cerberus) are real aliases in `MAP`/`ART_ALIAS`. **Owner's call whether to give each true art.**

## State (verified)
- **2-PLAYER CO-OP VERIFIED GREEN (2026-07-01):** `node tools/mp-playtest.mjs` ran two full create→join→draft→
  room-vote→setup→**live combat**→won games — **all 12 co-op/voting checks PASS, both games won, 0 JS errors,
  0 404s**. Screenshots at `tools/shots/mp-2026-07-01T18-52-44/` (lobby/draft/setup/combat/vote/advance). The
  co-op room-VOTE + lock-gate works (votes recorded, no advance until every seat locks, tie→one voted room).
- **Tests ALL green (2026-07-01):** `game.test.js` **840** · `squad` **22** · `fuzz` **60/0** · `serve` **18** ·
  `smoke` · `reconnect`. Self-reporting harnesses — read the "✅ ALL PASS" line; plain `bun test` prints "0 tests"
  (expected). WS ones need a live server: `PORT=3777 bun run server.js`, then `URL=ws://localhost:3777/ws bun run test/<x>`.
- **`game.js` is a 23-line BARREL** re-exporting `engine/*.js` (`bodies·kit·cards·world·lobby·combat·snapshot`).
  **Edit the engine MODULE, not game.js.** Server is non-watch — restart after any `engine/*`/`server.js` edit.
- **Neptune / "starting option" mystery RESOLVED (2026-07-01):** Neptune is **already an elite** (`ELITE_SET`,
  bodies.js:278). It is NOT draftable (`rollDraftWheel`→`DRAFT_BODIES`→`COMMON_SET`, elites filtered). What the
  owner saw as a "starting option" was Neptune (and Debt Dragon / Fundjin) as the **FOE** on the "Choose your
  first room" trailhead cards — elite BODIES spawn as foes on ANY floor incl. floor 1 (`FOE_BODIES` = commons +
  elites, lobby.js:196). **No bug; working as designed.** Open DESIGN lever (owner's call): should elites be gated
  off floor 1? In the verified run, 2 of 3 opening rooms were Elite rooms.
- **Archetype analysis done (mechanics-based, STILL VALID — it read passives, not icons):** 9 archetypes; over-
  supported = Damage-Ramp (6) & Rat-Summoner (4); thinnest = Tank/Mitigation (1, Golden Golem). ~9 bodies collapse
  into "incidental recurring chip." See Next step (b) for the design inputs it surfaced.

## Next step
Open with **"point me at HANDOFF.md"**. Nothing mid-flight — this session VERIFIED the 2-player flow, resolved the
Neptune question, and **corrected the icon-source mistake (see ⭐ TOP PRIORITY)**. Await owner direction. Teed up:
- **(a) CORRECT icon audit + fixes (design-adjacent):** audit from `MAP` in `tools/generate-foe-art.js` (the real
  game-icons each body draws), flag mismatches, propose swaps; owner approves; edit `MAP` + re-run the generator.
  First concrete fix candidate: split Golden Golem off `atlas.svg` so it stops sharing the Atlas elite's token.
- **(b) Roster design inputs (owner authors — do NOT invent):** the analysis flagged (1) **Depression Demon is
  effectively a dead body** — `debuffMult:2` reads off the APPLIER's own body (combat.js ~1226-1237) and only
  extends `slow`/`weakness` DURATION, not `poison`/`weakenLane` (the only body-applied debuffs, Medusa/Basilisk),
  so it can amplify nothing in the roster → **engine-fixable** (re-key it) OR retire; (2) the **elite tier is
  cosmetic** (line 282 only sets gold 2 + a flag — no mechanical signature); (3) **MISSING archetype = ally-aura/
  support** — all 25 player bodies are self-targeted; the `aura:{dmgBonus,dmgReduce}` primitive exists on
  Totem/Flag/Knight summon tokens but NO player body uses it (the co-op gap). Also unused-but-available:
  `costDiscount` slot (cards.js:83-89), and hard control/disable.
- **(c) Dead-code cleanup (technical, ready):** the **`stock` phase is unreachable** (voted rooms → `setup`
  directly). `stockAdd`/`stockBegin`/`stockRemove` routes + `addGreedy`/`removeGreedy`/`commitStock`/`stockReady`
  are orphaned. TRACE callers, propose a precise removal. **Owner must approve the delete.**
- **(d) Elite gimmick FEEL:** enter an Elite room, judge cadence/strength, tune `GIMMICKS` in `engine/world.js`.

## Active decisions (non-obvious why only)
- **Icons: the SVG is truth, emoji is fallback** (see ⭐ TOP PRIORITY). Never confuse the two again.
- **Neptune (and the batch-B 9 + Atlas) are ELITES, not commons** (bodies.js:278). Elites: cost `ADOPT_COST` (5)
  to WEAR after felled, carry 2 base ante (gold 2), kept OUT of the run-start draft wheel, but STILL spawn as
  foes in ANY room/floor. Elite *body* ≠ elite *room* (double-ante + gimmick) — two separate concepts.
- **Random 3-pick crawl REPLACED the STS map** (owner: "kill the map, too STS-oriented"); the floor→boss→throne
  arc is KEPT. trailhead → FLOOR_ROOMS(=5) rows of exactly 3 random-typed rooms (Fight/Shop/Elite; ≥1 Fight per
  row, ≥1 Elite per floor) → forced boss → descend → throne. On-screen "map" is a slim "♛ Boss in N rooms" line.
- **Elite room = double-ante fight + random GIMMICK** (`GIMMICKS` in `engine/world.js` is THE OWNER'S — retune
  freely). Acid Rain hits HEROES + their summons only, not foes.
- **Trailhead reuses `phase="won"`** (`enterRoom` `type==="start"` branch). Before adding phase-gated logic, check
  the trailhead case (`reopenDraftForJoin` was extended for it).
- **Leveling is RUN-WIDE** (`player.runLevel`, resets each new run in `startDraft`). Foe leveling is separate/
  per-spawn — do NOT touch it (symmetry test relies on it).
- **Two-bucket melee/ranged:** melee = TRUE weapons only; spells + utility = ranged. Applies to `isRanged` AND
  `triggerKind`. A 3rd "util" bucket (`cardKind`) keeps utility fitting any body. Don't collapse without owner say-so.
- **Room choice = VOTE in co-op** (each seat votes, all must Lock-in, majority/ties-random); **SOLO resolves
  instantly** so autopilot/`{type:"advance"}` still works.
- **Level-up payment = COVER (≥cost); Shop = EXACT.** `pairMR` is DEAD CODE (Runeblade `pyramidRogue` replaced it).

## Landmines
- **DON'T audit icons from `FOE_ICON` emoji** (client.js) — that mistake was made this session. Use the SVG/`MAP`.
  The emoji-audit claims ("Neptune 🔱", "Atlas 🗿", "4 bodies render ❔") describe a fallback users rarely see —
  the SVGs for all four (`fundjin`/`depressionDemon`/`bonelord`/`debtDragon`) exist and render fine.
- **NEVER `git add -A`.** MUST-NOT-COMMIT: `content-{tank,summon,misc}.js`, `_snapshot-sample.json`,
  `loop-report.json`, `tools/mp-playtest.mjs`, `tools/wear-shot.mjs` (also in `.gitignore`, but stage explicitly).
  `tools/mp-playtest.mjs` is the working 2-player harness but stays untracked. **NEVER `rm`/`Remove-Item`** (owner
  guardrail — delete is his to approve). Screenshot dirs under `tools/shots/` are gitignored.
- **Server is non-watch:** restart `bun run server.js` after ANY `engine/*.js`/`server.js` edit. `public/*` serves
  fresh on hard-refresh. `localhost:3000` may be a STALE detached process — restart before live-testing.
- **`tools/shoot.mjs` quirks (BENIGN):** after a DESCEND it flags a STALL ("stuck in 'won'"); it tends to LOSE on
  floor 1 (elite difficulty). `JS errors: 0` (ignore a lone STALL) = healthy.
- **Modern Standby wipes `node_modules` on resume** → playwright tools fail. Fix: `bun install` (playwright is a
  devDep). Server + `bun test` don't need node_modules. (Present & working as of this session.)
- **Worktree-agent base gotcha:** `isolation:"worktree"` agents branch from `main` (stale), NOT
  `feat/room-draft-overhaul`. Start such prompts with `git merge --ff-only feat/room-draft-overhaul` and assert
  `bun run test/game.test.js` shows 840.

## Pointers
- Run/deploy: `bun run server.js` → http://localhost:3000 (phone: `"C:\Program Files (x86)\cloudflared\cloudflared.exe"
  tunnel --url http://localhost:3000` — new URL each time; dies on laptop sleep / S0 Modern Standby).
- Test: `bun run test/game.test.js` (840 pass). Solo screenshots: `node tools/shoot.mjs`. **2-player co-op:
  `node tools/mp-playtest.mjs`** (`HEADED=1` watches both windows) → `tools/shots/mp-<ts>/` + `report.json`.
- **Icons (READ THIS BEFORE ANY ICON WORK):** `tools/generate-foe-art.js` — the `MAP` (key → color + game-icons.net
  icon) is truth; `bun run tools/generate-foe-art.js` regenerates `public/foes/*.svg`. `public/client.js`:
  `foeSprite`/`iconImg` load `/foes/<artStem(key)>.svg`; `ART_ALIAS` (~1031) remaps some keys; `FOE_ICON` (~1004)
  is the emoji **fallback only**.
- Key engine files (game.js is a BARREL — edit the MODULE):
  - `engine/bodies.js` — `BODIES` table (name/hp/passive), `MOXIE_SET`/`COMMON_SET`/`ELITE_SET`/`DRAFT_BODIES`.
  - `engine/world.js` — `GIMMICKS`, `buildLevel` (3-pick crawl), `enterRoom` (`type==="start"` trailhead), `descend`.
  - `engine/combat.js` — combat engine: `resolveOps`, `simulateTick`, `playCard`, `autoPlay`, `processRoomTimers`,
    debuff keying (~1226-1237), cost/double-cast (~1327), `atlasReflect` (~478).
  - `engine/lobby.js` — session/room lifecycle: draft (`rollDraftWheel`/`draftPick`), `wearBody`/`adoptCost`,
    shop, `levelUp`, foe-gen (`generateRoomFoes`/`generateEliteFoes`), `voteRoom`/`lockRoom`.
  - `engine/snapshot.js` — `snapshot` (ships `map`, `gimmick`, `roomTimers`, foe `castFrac`).
  - `public/client.js` — `roomCardsHtml`, `renderBetweenRooms` (trailhead), `FOE_ICON`/`ART_ALIAS`/`foeSprite` (icons).
  - `server.js` — `TICK_MS=100`; routes: `advance`(=vote), `lockRoom`/`unlockRoom`, `levelUp`, `buyWare`.
