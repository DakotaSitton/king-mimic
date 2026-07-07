# HANDOFF — King Mimic — 2026-07-07 01:00

> Browser co-op deckbuilder roguelike (**moxie + cards**, full player/foe symmetry). **Owner authors
> all DESIGN by hand** (bodies, cards, numbers, effects); agents do ENGINE only and FLAG every number
> the owner didn't state — never invent design. Branch **`feat/room-draft-overhaul`**, committed &
> pushed through **`2599ab7`**. He playtests on PC + phone, and with roommates over LAN.

## State (all VERIFIED this session — game 1009 · squad 22 · fuzz 60 green at `2599ab7`)
- **BATCH C content live**: 14 owner cards (Moonlight Greatsword, Dual-Handing Two-Handers, Power
  Word: Gun, Gravity Greatshield, Treasure Blade, Rainblow Blade, Earth/Lava Elemental summons,
  Jesterplate, Whip, Cross-Blade, Continent-Club, Telekinetic Blades, Giant's Belt) + 6 commons
  (Bribed Bishop, Cheque Cherub, Pyramid-Scheme Head, Stockbroking Sphinx, Penny-Pinching Pixie,
  Economy Elemental) + **Wandering Castle elite** + **Lizard Wizard rework** ("all ranged cards cost
  1 LESS" — owner corrected from flat-1 on 07-07). Roster: 21 commons / 11 elites / PLAYER_POOL 63.
  Each mechanic has a dedicated test.
- **Worn passives are DEAD** (owner: "there's no such thing as a passive") — Cool Shoes is a castable
  LASTING card (⚡3 → fight-long +1 moxie/play buff, re-cast each combat). Only retired slimeCrown
  still matches isPassiveItem.
- **RANGED = FOE-AFFECTING** (owner: "a projectile. A spell. Not armor") — derived via `opsTouchFoes`
  (kit.js); self/ally cards are typeless (feed neither Runeblade trigger, no 🎯). **oForce = the one
  ranged shield, scales 6 + rangedBonus.**
- **💎 TREASURE BANK**: ♻ convert-bag button (deck-builder, inline are-you-sure) melts all spares →
  `player.treasure`; level-ups + body adoptions auto-draw the shortfall (`tenderWithTreasure`).
  Per-run; shop stays cards-only BY OWNER SCOPE.
- **CO-OP DRAFT HOLD**: fresh-run drafts with 2+ humans wait for the ▶ Start-run button ({beginRun});
  **↺ Restart** HUD button ({restartRun} → startDraft) hard-resets any room, all seats kept. Verified
  end-to-end via tap-probe (2 real clients).
- **MOBILE TAP GRAMMAR**: tap foe = target, tap teammate = heal-aim, tap own body = possess, tap lane
  floor = walk ({lane:N}), HOLD foe ≈360ms = inspect; ◀▶ dpad deleted (▲▼ depth only). Desktop unchanged.
- **Server LIVE on :3000 at `2599ab7`** (deployed at a 0-connection window). Tier sim + full tier
  lists delivered (tools/tier-sim.mjs + tier-sim-results.json): Atlas 40% throne vs ≤8% all others.

## Next step
**Await the owner's rulings — implement nothing on this list unbidden.** The open design queue he has
in hand: (1) floor-1 difficulty dial (his 3P rooms rolled ⚖21–24 double-elite/6-card-arsenal openers:
options = clamp floor-1 budget roll low / cost-gate ⚡5+ cards out of early foe kits / cap elites per
floor-1 room); (2) **RICH_ITEM_POOL retired-card leak** — one-line filter to PLAYER_POOL (blizzard
etc. still reach foes/loot/boss shelf); (3) **King Mimic boss goes INERT after his court dies**
(XMJ9 log: 60 hits in, zero actions out — deck-driver exists in BOSS_DEFS.kingMimic, cause
undiagnosed); (4) batch-C FLAG numbers + interpretation vetoes (Moonlight triggers melee-only;
Bishop = heals RECEIVED; Giant's Belt = this-fight; LW/Pixie pricing uses the triggerKind axis so
Slow/Weakness/Taunt/Force get the −1 on LW too); (5) sustain-stall valve (old, still open). Open with
"point me at HANDOFF.md".

## Active decisions (non-obvious why only)
- **NEVER swap the :3000 server while it has established connections** — a mid-game deploy wiped his
  roommates' live run tonight (rooms live in memory). Check
  `Get-NetTCPConnection -LocalPort 3000 -State Established` (cloudflared holds ~1); deploys wait for
  the seam or his word. Also in shared-brain memory.
- **Roommate LAN play uses `http://10.0.0.28:3000`**, never the trycloudflare URL — the tunnel
  round-trips every input through Cloudflare (the earlier "lag"). bun binds 0.0.0.0 + firewall allows.
- **Cool Shoes machine-gun loop is OWNER-SANCTIONED** ("Let it happen. It's part of the game") —
  refund makes cost-1 cards free → perpetual casting once rolling. Do NOT "fix".
- Treasure spends on level-ups + adoptions ONLY (his words: "for level ups and bodies") — shop
  deliberately untouched.
- Co-op hold gates FRESH runs only; a mid-run drop-in reopen (room.level staged) still auto-resumes —
  don't gate it or drop-ins stall.
- Kind-pricing (LW/Pixie) keys off **triggerKind** (his tag model), not cardKind — so Force and the
  aimed debuffs count ranged. Flagged to him; his call to narrow.
- Wandering Castle's +1 applies at ENUMERATED shield sites (op/regen/berserk/BloodToIron/combatStart/
  ward/costly-cast) — no global shield func exists; if you add a new shield source, add his bonus.
- The tier-sim's Cool Shoes row (96%) predates the castable conversion — re-run before quoting it.

## Landmines
- **The retired-card leak is STILL ACTIVE** (owner hasn't ruled): RICH_ITEM_POOL/boss shelf =
  Object.keys(KIT) — blizzard/darkness/omnislash/gigaCast/slimeCrown reach real games.
- **Batch-C bodies/cards spawn as FOES immediately** — a foe can draw Power Word: Gun (13 dmg);
  LW foes get −1 on all ranged casts; Wandering Castle spawns as an elite foe. Expect difficulty
  noise on top of the un-ruled floor-1 heat.
- Batch-C art = **placeholder ART_ALIAS entries** (client.js) onto existing silhouettes; owner art
  pass pending (generate-foe-art MAP untouched).
- Two latent-bug fixes ship with batch C and shift balance quietly: player-cast timer cards
  (Pet Leech/Animated Blade) actually install now; lane/AoE lifesteal actually heals now.
- Telemetry rooms with party:2 at ~21:4x on 7/06 are MY harness bots (UBY5/UND7/8WDW/5CPZ/KJY9/44CQ +
  MQ59), not humans — don't count them in playtest reads. Solo runs are economy-blind (no loot_claim
  events; lootOffered logs empty).
- `tools/mp-playtest.mjs` + `tools/tap-probe.mjs` (untracked) were EDITED in place to press the co-op
  ▶ — they hang on the draft screen if that line is removed. `tools/feature-shots.mjs` still asserts
  the dead ⚖=◈ contract; `test/e2e.js` is gold-era dead — don't chase either.
- **NEVER `git add -A`** (untracked musts: DESIGN_LISTS.md, tools/mp-playtest|tap-probe|tier-sim|
  feature-shots|wear-shot.mjs, tunnel/server logs, tier-sim-results.json, tunnel.out). **NEVER rm**
  (owner guardrail). Engine edits need a server restart (subject to the live-connection rule);
  `public/*` is served per-request — hard refresh only.
- Tunnel URL (trycloudflare) dies on laptop sleep and mints anew — re-read `tunnel.log`; LAN is
  primary for roommates anyway. Modern Standby can wipe `node_modules` → `bun install`.
- Worktree agents branch from `main` (stale): start with `git merge --ff-only feat/room-draft-overhaul`,
  assert game.test shows **1009**.

## Pointers
- Run: `bun run server.js` → :3000 (LAN 10.0.0.28). Tunnel: `"C:\Program Files (x86)\cloudflared\
  cloudflared.exe" tunnel --url http://localhost:3000` (URL → tunnel.log).
- Test: `bun run test/game.test.js` (**1009**) · `test/squad.test.js` (**22**) · `test/fuzz.js` (60 runs).
- Harnesses (untracked): `node tools/shoot.mjs` (solo real run) · `node tools/mp-playtest.mjs` (2P
  co-op) · `node tools/tap-probe.mjs` (touch grammar) · `bun tools/tier-sim.mjs` (MODE=bodies|cards,
  RUNS=, FIGHTS= → tier-sim-results.json).
- Key files: `engine/kit.js` (cards + opsTouchFoes/triggerKind/isRanged; batch-C FLAG comments) ·
  `engine/cards.js` (PLAYER_POOL, cardCost/playCost pipeline) · `engine/bodies.js` (roster,
  MOXIE_SET/ELITE_SET, batch-C bodies + FLAG HP) · `engine/combat.js` (resolveOps both branches;
  batch-C ops; playCard/foeCast cost+costlyShield; healedTrigger/shieldPlus) · `engine/lobby.js`
  (beginCombat per-fight resets; tenderWithTreasure/convertBackpack; maybeFinishDraft hold +
  beginRun) · `server.js` (routes: convertBag/beginRun/restartRun) · `public/client.js` (tap grammar
  ~line 1050; ART_ALIAS; convert button; draft hold UI) · combat logs `combatlogs/` + `telemetry.jsonl`.
