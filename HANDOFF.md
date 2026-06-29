# HANDOFF — King Mimic — 2026-06-29 02:40

> Browser co-op deckbuilder roguelike (**moxie + cards**). Players and foes play by the EXACT same rules with
> the same cards/bodies (the "symmetry pillar"). **Owner authors all DESIGN by hand** (bodies, cards, numbers);
> agents implement ENGINE/mechanics only and FLAG ambiguities — never invent design.
> Branch **`feat/room-draft-overhaul`** (HEAD pushed to origin this session). NOT merged to main.

## State (verified this session)
- **Tests:** `bun test test/game.test.js` → **766 pass, 0 fail**. `test/serve.test.js` → 18 pass.
  (`fuzz.js`/`squad.test.js` are PRE-EXISTING broken — removed `caravan`; not our work. `game.test.js` is canonical.)
- **FLOOR-1 BOSS VICTORY confirmed on the elite build:** `node tools/loop-to-win.mjs` won on **attempt 6**
  (bossClears=1, 0 JS errors). Fresh winning combat log: `combatlogs/run-2026-06-29T02-24-52-819Z-GRSA.log`
  (4 rooms + boss, fought a Depression Demon — an elite — on the way).
- **Deployed LIVE:** `bun run server.js` on **:3000** + cloudflared tunnel **https://cet-brothers-houston-transition.trycloudflare.com** (both 200), serving the full build below. Owner playtests on iPhone.
- **Room preview shows contents + DECKS** (verified via `tools/screens-shot.mjs` won-screen capture, 0 JS errors):
  each next room lists its real foes (name/Lv/❤) AND each foe's deck cards; rooms↔backpack toggle + "Boss in N"
  counter + trade composer all render.

## Next step
**Wait for the owner's playtest feedback; the one OPEN DESIGN DIAL is elite difficulty.** Making elites
**2-ante foes** made floor-1 ~2× harder (winnable in 6 loop-attempts vs ~3 pre-elite; the autopilot clears
rooms but reaches the boss depleted). Easiest softening lever, IF he asks: scale elite ante by floor (gold 1 on
floor 1 → 2 deeper) — set in the `for (const k of ELITE_SET) … BODIES[k].gold = 2` line (game.js ~289).
**Confirm before changing** — it may be intended ("out-build the boss or die"). Also: owner should eyeball the
WEAR adoption flow (⭐/◈5) + deck-list rendering on his phone (the WEAR menu UI was author-built, not autopilot-exercised).

## Active decisions (non-obvious why only)
- **ELITE TIER (owner 2026-06-28/29):** 10 elites = the 9 batch-B bodies + **Atlas** (key `atlas`, name
  **"Atlas, Shrugging"** — a defined-but-orphaned body wired into the spawn pool this session). "Elite" means
  exactly: `elite:true` + **gold 2** (2 base ante as a foe → rarer/richer) + costs **ADOPT_COST (5)** to *become*
  after felled + **excluded from the run-start draft** (`DRAFT_BODIES` = `COMMON_SET`). COMMONS are FREE to adopt.
  `ELITE_SET`/`COMMON_SET` (game.js ~269-290) are the SOURCE OF TRUTH; `elite`+`gold` are set PROGRAMMATICALLY
  (overriding the `gold:1` literals in the body defs). Elites STILL appear as foes in regular rooms.
- **Elite cost is on the BODY, not the fight** (owner reversed an earlier room-entry-cost design). Elite rooms
  are FREE to enter. The old room gate (`eliteLock`/`payEliteCost`/`ELITE_COST_SPARES`/`partySpareCards`) was
  **DELETED** — don't reintroduce it.
- **Rooms pre-generated at map build** (`stockLevelRooms`, called after `buildLevel` in `startLevel`/`descend`)
  so the map preview == the actual fight; `enterRoom` consumes the stored `node.foes`.
- **Softlock guard** in `buildLevel`: every row keeps ≥1 non-elite AND every node links to ≥1 non-elite — so a
  player is never funneled into an elite (fixes the owner's "frozen out of an elite selection").
- **Adoption mechanic:** `swapBody(room, p, to, payKeys)`; `adoptCost(room,key)` charges ELITES only (commons/
  starter/already-adopted = 0); `tenderValue()` is the shared pay-by-card-VALUE helper (spares first, deck never
  < MIN_DECK). Snapshot ships `adopt:{cost,adopted}`. Adopted bodies are free to re-wear for the run.
- **Room contents carry a per-foe `deck`** (gear cards grouped to `{key,name,count}`). Client groups foes by
  `body|level|hp|DECKSIG` so foes with different decks DON'T merge into one row.

## Landmines
- **NEVER `git add -A`.** `content-{tank,summon,misc}.js`, `_snapshot-sample.json`, `loop-report.json` are
  untracked and MUST NOT be committed. Add files explicitly. **NEVER `rm`/`Remove-Item`** anything (owner guardrail).
- **Modern Standby wipes `node_modules` on resume** (the laptop's S0 sleep). Symptom: playwright tools fail with
  "Cannot find package 'playwright'". Fix: `bun install` (playwright is now a declared devDep, so it restores).
  Server + `bun test` don't need node_modules, so they keep working — only the screenshot tools break.
- **Server is non-watch:** restart `bun run server.js` after ANY `game.js`/`server.js` edit. `public/*` is served
  fresh (hard-refresh). The tunnel reconnects to :3000 on restart; quick-tunnels die on idle/sleep — respin
  `"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000` (NEW URL each time).
- **Autopilot stalls/dies on hard floor-1 rooms** (more so now with 2-ante elites). `loop-to-win` retries — use
  `BUDGET≥200` (90 starves slow-but-winning runs; one room can take ~50s). `tools/shoot.mjs` can get STUCK on a
  hard room 0 (0 won frames) — use **`tools/screens-shot.mjs`** (DEMO/god mode = unbeatable) for reliable
  won-screen + WEAR-menu screenshots.
- **`tools/screens-shot.mjs` WEAR capture** unhides `.km-body-modal`, which only exists when `#inventory` (side
  panel) is mounted — it grabs WEAR at the SETUP phase, not the god won-overlay.
- **`tools/wear-shot.mjs`** is a redundant scratch file (superseded by `screens-shot.mjs`); untracked — fine to remove.
- **Two merged agent worktrees on disk** (`.claude/worktrees/agent-a03a0156…` autopilot, `agent-ae39f5c5…` client).
  Clean with `git worktree remove --force` (do NOT `rm`; one holds a `node_modules` junction — forcing a recursive
  delete through it is dangerous, which is why they were left).

## Pointers
- Run/deploy: `bun run server.js` → http://localhost:3000 · phone: cloudflared tunnel (see Landmines).
- Test: `bun test test/game.test.js` (766) · `bun test test/serve.test.js` (18).
- Win loop: `node tools/loop-to-win.mjs` (env `ATTEMPTS`/`BUDGET`; use `BUDGET=200`). Writes `loop-report.json`.
- Screenshots: `node tools/shoot.mjs` (real autopilot run, may stall) · `node tools/screens-shot.mjs` (god mode,
  RELIABLE won + WEAR screens → `tools/shots/new-screens/`).
- Combat logs: `combatlogs/<runId>.log` (per-run, EVERY combat WON/LOST in floor order) + `combatlog.txt` (tail).
- Key files: `game.js` — `ELITE_SET`/`COMMON_SET`/`DRAFT_BODIES`/`FOE_BODIES` (~269-290), `buildLevel`+softlock+
  `stockLevelRooms` (~1160-1230), `canSwapTo`/`adoptCost`/`tenderValue`/`swapBody`/`ADOPT_COST` (~1283-1365),
  snapshot map `_foePrev`+`deck`/`roomsToBoss` + `adopt:{cost,adopted}` (~4078-4115). `public/client.js` —
  `groupRoomFoes`/`roomFoesHtml`/`roomCardsHtml`/`bossCounterHtml` (~1990-2050). `public/map.js` — `groupFoes`/
  `foeLine` (deck + full-name chip). `public/inventory.js` — WEAR adoption ⭐/◈5 (~195-265). `public/index.html`
  — `.room-foe`/`.rf-deck` CSS (~192). `server.js` — `persistCombat` combat-log writer (~76-97), `swapBody` route (~545).
