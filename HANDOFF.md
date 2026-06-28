# HANDOFF — King Mimic — 2026-06-28 06:15

> Browser co-op deckbuilder roguelike (**moxie + cards**). Players and foes play by the EXACT same rules
> with the same cards/bodies (the "symmetry pillar"). **Owner authors all DESIGN by hand** (bodies, cards,
> numbers); agents implement ENGINE/mechanics only and FLAG ambiguities — never invent design.
> **All work is on branch `feat/room-draft-overhaul` (local HEAD `5e7aff6`, NOT pushed this session).** NOT merged to main.

## State (verified this session)
- **Tests:** `bun test test/game.test.js` → **749 pass, 0 fail**. `test/serve.test.js` → 18 pass.
  (`fuzz.js` / `squad.test.js` are PRE-EXISTING broken — they reference the removed `caravan`/`caravanMaxHp`;
  NOT from this work. `game.test.js` is the canonical suite.)
- **Real playthrough:** `node tools/shoot.mjs` (REAL solo run) — **0 JS errors / 0 404s / no missing art**.
- **FLOOR-1 BOSS VICTORY confirmed** on the merged+adoption build: `node tools/loop-to-win.mjs` (loops the
  autopilot until a win) — attempt 3 cleared the Hyper-Inflation Hydra, `bossClears=1`, 0 JS errors. Proof:
  `tools/shots/loop-win-A3-2026-06-28T06-12-57.png`. Use `BUDGET=200` (≥120s/attempt) — 90s starves
  slow-but-winning runs (one room can take ~50s).
- **Deployed LIVE:** `bun run server.js` on **:3000** + cloudflared tunnel **https://hydraulic-logos-induced-identity.trycloudflare.com** (both HTTP 200, serving the **room-overhaul + elite-body-adoption** build). Owner can playtest on his iPhone now. (Quick-tunnels die on idle — respin per Landmines.)
- **Shipped this session (all on the branch):**
  - **Room-draft flow** — rooms are OFFERED via the map after combat (the map branch IS the offer); each is
    PRE-BUILT as a random foe selection EQUAL to its ante (floor × party). No per-foe "stock" step — `enterRoom`
    goes straight to `setup`. Elite = a DOUBLE-ANTE room (×2, no special centerpiece body).
  - **ALL room effects REMOVED** — the enchant layer is gone (Wandering Monster, Acid Rain, Armory, Hasted,
    Toughened, Rat Colony, King's Gift, room base-ante, room-timer bars). `roomValue` = stocked foe ante only.
  - **Elites gated behind a resource** — an elite map node is LOCKED until the party has banked a resource:
    a body leveled to ≥ floor+1, OR ≥ floor+1 spare cards (beyond the MIN_DECK floor). Fresh draft = 0 spares
    → elites locked from the start. Nodes carry `locked`/`lockReason`/`cost` in the snapshot.
  - **Fundjin = one fused two-god elite** — renamed "Fundjin & Raising-Profitsjin" (placeholder), both god
    effects (6s lane-melee + 6s front-double), `elite:true`.
  - **Deck editing in any non-combat phase** — `moveToDeck`/`moveToBackpack` now allowed in `setup` etc.
  - **Mobile UI overhaul** (sub-agent, screenshot-verified PRE-merge): next-room **ante preview** on advance
    buttons + map nodes; a **level-up control** (won + setup screens); **deck editor surfaced in setup**;
    a better **body-select / PILOT menu**; a better **mobile shop**; and the **summon-clipping fix**.
- **NOT independently re-verified by me on a summon-heavy mobile screen:** the summon-clip merge (I hand-merged
  it — see Landmines). `drawSummonBody` exists + playthrough is clean, but the OWNER's eyes are the oracle here.

## Next step
**Wait for the owner's mobile playtest feedback on the live build.** Specifically eyeball: (1) the WEAR-screen
adoption price/tender (built post-merge, not autopilot-exercised), and (2) whether `ADOPT_COST=5` feels right.

## SHIPPED this session (room overhaul + elite cost relocation) — 2026-06-28
- **Rooms SHOW what's inside** (owner: "rooms need to be overhauled to show what is actually inside them").
  `stockLevelRooms()` pre-builds every combat/elite node's foe roster at map build, so the map preview MATCHES
  the fight; `enterRoom` consumes the stored roster. Snapshot map.nodes gain `row`+`contents` (foe preview);
  map gains `rowCount`/`currentRow`/**`roomsToBoss`** (the boss counter).
- **Rooms↔Backpack TOGGLE + boss counter + trade** (CLIENT agent): a segmented control on the won/shop screens
  — ROOMS view (each next room's contents + "Boss in N") vs BACKPACK view (deck editor + player↔player trade
  composer wired to `proposeTrade`/`acceptTrade`/`declineTrade`). `public/client.js`/`map.js`/`index.html`.
- **SOFTLOCK FIXED** (owner "got frozen out of an elite room selection"): `buildLevel` guarantees every row
  keeps ≥1 non-elite AND every node links to ≥1 non-elite next node → never forced into an elite. Autopilot
  (`tools/brain.mjs` `nextNodeId`) also skips locked nodes.
- **Elite cost MOVED off the fight onto the BODY** (owner: "elites cost money in the body selection screen not
  their fight"). The old elite ROOM-entry spend is **retired** (`eliteLock`/`payEliteCost`/`ELITE_COST_SPARES`/
  `partySpareCards` removed; elite rooms are FREE to enter). NEW: wearing a felled body the FIRST time costs a
  **FLAT** card-VALUE price `ADOPT_COST` (=5), tendered value-for-value (spares first, deck never below MIN_DECK);
  once adopted it's the party's for the run (free to re-wear). `swapBody(room,p,to,payKeys)`; `adoptCost()`/
  `tenderValue()`; snapshot `adopt:{cost,adopted}`; server passes `msg.pay`. WEAR menu (`public/inventory.js`)
  shows `◈5 to adopt`, greys unaffordable, auto-tenders cheapest spares. (Owner picked FLAT because per-body
  `gold`/bodyAnte is a useless flat 1.)
- **Autopilot loop-to-win** (`tools/loop-to-win.mjs` + shared `tools/brain.mjs`): loops the real autopilot
  headless until a floor-1 boss win; `ATTEMPTS`/`BUDGET` env. Confirmed a win (see State).
- **Agents:** built in parallel worktrees (CLIENT=public/*, AUTOPILOT=tools/*), merged clean (disjoint files).

## FLAGS — owner's design dials, UNRESOLVED (do not silently change; confirm)
1. **`ADOPT_COST` = 5** flat card-value to adopt any non-starter body (game.js). My pick — owner retunes after playtest.
2. **`elite:true` is cosmetic** — it does NOT yet change a body's ante/HP/draft-weight or pull it from the
   common foe pool. If elite bodies should weigh/cost more or be rare, that's a follow-up.
3. **Fused Fundjin name** "Fundjin & Raising-Profitsjin" is a placeholder to overwrite.
4. **Deck-edit scope** — only deck↔backpack *moves* opened to `setup`; `dropItem` (destroy) and player
   *trades* are still `won`/`shop`-only.
5. **Room budget = floor × party** (existing `roomAnteBudget`). This SUPERSEDED the owner's AskUserQuestion
   pick of "build-power ante (items+level)" because his written spec said floor×party. One-function swap if
   he actually wants build-power (game.js `roomAnteBudget`, flagged in-comment).

## Active decisions (non-obvious why only)
- **The map branch IS the "room offer."** "Rooms offered after combat" = the existing branching map; the change
  was removing the per-foe stock screen, not adding a new picker. `stock` phase + greedy palette are retired but
  their server handlers / snapshot block survive as no-ops (all gated `phase==="stock"`, which never fires).
- **Room effects removed via deletion, not neutering** — `ENCHANTS`/`pickEnchant`/`applyEnchantToFoe`/
  `roomTimersFor`/`seedWanderer`/`GIFT_ENCHANT` are GONE (a test asserts they're `undefined`). Client guards
  on falsy `enchant` already handled the absence.
- **`generateEliteFoes` = `generateRoomFoes` at the doubled budget** — elite is just a bigger room; the richer
  foes you loot ARE the reward ("inbuilt"). `rollEliteFoe`/`ELITE_BODY` kept DORMANT as an opt-in named-elite hook.
- **Rooms FILL to the ante** (`ROOM_FILL_STOP_CHANCE=0`) — the old "mini-opponent" under-fill variance is gone.

## Landmines
- **Agent worktrees spawn at a STALE base.** The Agent tool's `isolation:"worktree"` created worktrees at the
  old commit `34fe146` (last real commit), NOT the current branch HEAD. The engine agent caught it and rebased;
  the MOBILE agent did NOT — it built on stale `client.js`, forcing a 3-way merge. If you spawn worktree agents,
  tell them to verify/rebase onto the intended commit FIRST, or expect to merge.
- **The summon-layout merge was hand-resolved.** I combined HEAD's player-sized summons (`SUMMON_PLAYER_CAP`)
  with the agent's kind-aware `slotGap`/`ys` clipping fix in `client.js` (the `friendly line` block ~line 1244
  + the draw loop ~1480). Logic is sound (`drawSummonBody` at 1730 still called) but eyeball it on a summon-heavy
  mobile board.
- **`content-{tank,summon,misc}.js` + `_snapshot-sample.json` are untracked & MUST NOT be committed.**
  `git add -A` keeps sweeping them in — exclude them every commit (`git reset -- …` / `git rm --cached`).
  `content-cards.js` IS legitimately tracked. NEVER `rm`/`Remove-Item` anything (owner guardrail).
- **Server is non-watch.** `bun run server.js` imports game.js once at boot — restart after ANY game.js/server.js
  edit to deploy. `public/*` is served fresh (browser hard-refresh). The tunnel reconnects to :3000 on restart;
  quick-tunnels die after idle — respin `"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000`.
- **Two agent worktrees still on disk** (`.claude/worktrees/agent-adc5603…` engine, `agent-a37406c…` mobile),
  both merged. `git worktree remove` to clean (do NOT `rm`).
- **Mobile fixtures:** the sub-agent verified mobile via Chrome `--headless=old` (the bundled `tools/screenshot.js`
  uses Edge `--headless=new`, which exits 13 / writes 0 bytes on this box). `tools/shoot.mjs` (Chromium/playwright) works.

## Pointers
- Run (deploy): `bun run server.js` → http://localhost:3000 · Phone: cloudflared tunnel (see Landmines).
- Test: `bun test test/game.test.js` (729) · `test/serve.test.js` (18).
- Real playthrough/screenshots: `node tools/shoot.mjs` (boots its own server; `NODES=`/`BUDGET=`/`VP=desktop`/`HEADED=1`).
- Key files: `game.js` (engine — room-draft `enterRoom` ~1789; `roomAnteBudget`/`generateRoomFoes`/`generateEliteFoes`
  ~970-1045; `eliteLock`/`partySpareCards` + `ELITE_UNLOCK_*`; `levelUp`/`bodyLevelOf`; `moveToDeck`/`moveToBackpack`
  gate; `snapshot` map-node `ante`/`locked`); `server.js` (`case "levelUp"` ~581; advance/leaveShop reject locked elite);
  `public/client.js` (`renderBetweenRooms`/`advBtns` next-room ante + level-up; `renderSetup` deck editor; the friendly-line
  summon layout ~1244/1480); `public/inventory.js` (PILOT/WEAR body menu); `public/map.js` (node ante badges).
