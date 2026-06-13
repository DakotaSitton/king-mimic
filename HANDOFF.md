# HANDOFF — King Mimic — 2026-06-12 19:05 (KING MIMIC BUILT — the true final boss is in)

> Pick-up doc for a cold instance. King Mimic is a soft-real-time co-op browser roguelike:
> N lanes (= player count, 1–4), defend the shared Caravan, wear the bodies of foes you
> defeat. **MILESTONE: the owner played a COMPLETE 3-floor run start→finish (bosses beaten)
> and built an emergent theme (Royal Rat + Slime Crowns + Magic Missile spam) — "immensely
> satisfying". The core loop is validated.** This session was a long live-playtest dial
> loop: ~10 owner verdicts implemented, tested, and verified, but **NOTHING IS COMMITTED**
> (see Landmines — that's the first thing to resolve).

## State (all verified live this session unless marked)
- **KING MIMIC IS BUILT (owner-dictated from the train, 2026-06-12 ~18:40)** — see
  BOSS_SPEC_V1 §5 for canon + placeholder split. Throne floor (4) = single boss room past
  floor 3; back-line King plays a 4-card shuffle-bag deck, ONE card = ONE bar (decree /
  steal / stance / calamity — steal/stance/aoe reuse the floor bosses' clock cases
  verbatim; only `decree` is a new case). Effects persist past their card. Kill him →
  `runWon` → victory screen, descend dies, `start` from victory begins a fresh run
  (server guard loosened for exactly that). V1 ward/nemesis King deleted from BODIES
  (content.js's kingMimic is the PAPER game reference — left alone on purpose).
- **Train-playtest redials (owner 2026-06-12 ~19:08), both live**: (1) **bosses 1.5×
  harder** — every BOSS_DEFS clock cd ÷1.5 (summon tokens kept their own clocks —
  flagged to owner, no verdict yet); (2) **BOSS PAYDAY** — every boss clear drops a
  shelf of rares (de-tiered reading: ante ≥ RARE_ANTE 3; players + 2 distinct rolls)
  + BOSS_GOLD 10 **per player** ([PLACEHOLDER] per-player reading — a 4P split of 10
  can't buy one rare; flagged to owner).
- **⚡ AUTO fire mode (owner ~19:13)**: per-player ✋/⚡ toggle under the hotbar (fireMode
  row), manual default, sticky. AUTO fires ready DAMAGING non-fragile items via the real
  useItem path. **🔁 ECHO redesign (owner ~19:17)**: see Next step 1 (CLOSED). The two
  interact on purpose: AUTO presses keep the echo bar down — deliberate-play body
  punishes autopilot (flagged to owner, he hasn't objected).
- **AUTONOMOUS BLOCK (owner order 22:19 "go crazy", away from keyboard)**:
  1. **THE POST-FLOOR-3 WAVE IS IN** — 7 items, owner's spitball list verbatim: Haste
     (3g, 5s double charge-speed) · Power Boost (3g, +2 both schools 8s) · Stone Skin
     (3g, −2/hit 8s) · Omnislash (5g, 4 front strikes) · Giga Cast (5g, fragile+
     startCharged, next staff item ×4, stacks with echo) · Time Stop (6g, fragile+
     startCharged, foe clocks freeze 3s) · Revive (6g, fragile+startCharged, downed
     teammate to full). New engine verbs: buff/gigaArm/timeStop/revive + generic timed
     buffs (addBuff/buffAmt/tickBuffs — symmetric, foes can hold them) + room.freezeFoes/
     freezeHeroes. ALL prices/durations [PLACEHOLDER]. Buff items are PLAYER-pool only
     for now (parked owner verdict); omnislash+blizzard joined the foe pools.
  2. **"Never seen a Blizzard" SOLVED**: it was exiled from foe pools while its drain op
     was a no-op vs players (drain touched `equipment`, never `inv`, and the foe branch
     had no delay handler at all). `drainClocks` is now one symmetric function; foe
     Blizzard genuinely sets hotbars back; re-admitted to SPICY. Also added to foe
     second-slot pool: hatchet/spikes/summonBigRat/knightBanner. wind/heal stay exiled.
  3. **TELEMETRY**: server appends JSONL events to `telemetry.jsonl` — offers AND picks
     (run_start wheel, palette_offer, shop_offer, draft_pick, stock_pick, shop_buy,
     loot_claim, body_swap, unlock_buy, up_ante, room_result w/ per-item use counts +
     boss + ticks). Report: `bun tools/telemetry-report.js` (pick RATES + NEVER lists).
     Test harnesses create rooms with `nt:true` → telemOff (bots never pollute data);
     god/DEMO rooms skipped too.
  4. **BALANCE SIM + DESIGN REVIEW** (background agent + main): `test/balance.js`
     (pure-engine harness, `bun test/balance.js`, RUNS env scales) → **BALANCE_REPORT.md**
     (agent's numbers, pre-redial snapshot) + **DESIGN_REVIEW.md** (judgment layer, every
     item/body/boss verdicted, owner-decision list). Sim-driven SAME-DAY-placeholder
     redials APPLIED: buff durations now ride cdScale (uptime-desync bug), Power Boost/
     Stone Skin cd 70→140 (were PERMANENT buffs), Omnislash strikes +2 base each (was
     strictly dominated), Blizzard demoted to foe SECOND slot (first-slot rolls = worst
     dud-foes; dud rate 15%→8.9%). OWNER-CANON dials deliberately untouched & flagged:
     Hydra floor-3 0% winnable in sims, Lich/Kraken deal ~zero damage, summoner bodies
     ~6× other templates, Crossbow/spam DPS-per-gold dominance.
- **All suites green on the live rebuilt server**: `bun test/game.test.js` **373/373**
  (was 296 at session start) · smoke · smoke4 · reconnect · e2e · fuzz · balance harness
  exits clean · telemetry.jsonl confirmed NOT created by bot suites. **Tunnel KILLED at
  block end** (public god-mode rule) — server still up on localhost:3000.
  Server runs at http://localhost:3000; **tunnel LIVE for the owner's train playtest**
  (URL in tools/tunnel.log — KILL cloudflared when the session ends; new one = new URL;
  phone players must pull-to-refresh after client changes).
- **Economy DE-TIERED (owner canon)**: rarity classes (common/uncommon/rare) no longer
  exist. Every item/body carries ONE individual gold number used everywhere: stocking
  ante, loot value, shop price. Shops sell at FACE VALUE (no ×3 markup), uniform shelf.
- **Body adoption = the UNLOCK LADDER**: `unlockCost(g) = 5×⌈(g²−1)/5⌉` → 0/10/25 at gold
  1/3/5 (owner's exact prices; formula is a [PLACEHOLDER] fit). Buying a threshold opens
  every FELLED body of that gold and below; upgrades pay the difference (10 then 15 → 25).
  Wearing requires the SPECIFIC body felled ("ones I've seen" — owner bug report, fixed).
- **Room modifiers are PAID DEALS**: each carries `baseAnte` that joins V; map hover +
  advance buttons show the terms before entering. Owner canon set: Wandering Monster (x =
  pre-placed foe's ante, random lane, unremovable) · Acid Rain light/heavy (+2/+4) ·
  Armory (foes +1 shield, +2). [PLACEHOLDER fills: Rat Colony/Hasted/Toughened.]
  **First room of the run = King Mimic's Gift** (no tricks, antes +3); floor 1 never rolls
  the Wandering Monster; floor 2+ rolls the full wheel.
- **Ante window ratchet**: palette rolls confined to ⚖2–5 at run start; "♠ Up the ante"
  raises BOTH ends +3 (stock-phase button, run-scoped, never down), live-rerolls under-floor
  slots, and kills the cheap-slot guarantee once used.
- **Draft wheel kit fit**: 2 in-house items (body's school; untyped utility counts) + 1
  wild card; slot 1 in-house AND damaging. Mobile wheel = 2-across, one screen.
- **Summon placement**: per-player front/behind toggle (big buttons under the hotbar),
  shown for summon ITEMS and worn summoner BODIES; summons enter at ±0.5 depth around you.
- **Mechanics redials live**: Minotaur counter = 4s strike clock fed 1s per hit taken
  (accel pattern) · Echo = 4s charge arms a one-shot double on matching school (**owner
  dislikes the feel — redesign PENDING, see Next step**) · Hydra waves start at 5.
- **Per-fight state**: player shields AND thorns expire at beginCombat (foe spawn shields
  survive — Armory). Stolen-slot, boss machinery, etc. unchanged from BOSS_SPEC_V1.
- **Mobile pass**: two-tap + 600ms-grace drop guard (accidental selling fixed) · advance
  row wraps · palette stacks 1-col · bigger overlay fonts · deal-labeled room buttons +
  "♛ N rooms to <boss>" line (map kept as flavor — owner asked "do we even need a map";
  answer shipped: buttons carry the deal, map stays for the campaign feel).
- **REVERTED same-night**: a hero-only item-cd ease (10%). Owner: 1:1 symmetry is the
  game's identity — never bend tempo asymmetrically; ease difficulty through the economy.

## Next step
**0. King Mimic redials** — the owner is playtesting him from a train RIGHT NOW; every
   number is [PLACEHOLDER] (card cds 110/80/70/100, decree ante 7, calamity 3, HP base 15,
   THRONE_FLOOR weight 4). Apply his verdicts live; re-pin tests after.
**Two older owner decisions are still parked — get verdicts, implement in this order:**
1. ~~Echo redesign~~ **CLOSED (owner's own design, 2026-06-12 train, built+green)**: the
   echo bar charges 6s, EVERY item use pushes it back 2s (ECHO_CD/ECHO_DELAY dials in
   game.js); full bar → player taps the 🔁 ECHO button (echoRow under the hotbar) to arm
   the next-matching-item double; foes auto-arm. echoArm op + every-4s template clocks
   deleted; tests re-pinned (spam-never-echoes / slow-rhythm-pays pinned as properties).
2. **Ante ceiling** (content max = 13 = Senior body 5 + crossbow 4 + crown 4; the ratchet
   outruns content in 3 presses and palettes pin at 11–12. My rec = deep windows roll
   3-item gear, ceiling → 17; alternatives: clamp the button at 10–13, or floor-scaled
   body gold).
3. **The post-floor-3 item wave is UNBLOCKED** (owner beat floor 3): haste, revive/full
   heal, time stop, Omnislash, Giga cast (next spell ×4), power boost (timed dmg buff),
   stone skin (timed DR buff). Owner adds these himself or directs; each now just needs an
   individual gold price (de-tiered economy was built FOR this). Do NOT add unprompted.
   (Also parked: my [PLACEHOLDER] body/item brainstorm — recommended cut was Porcupine
   Pension / Loan Shark / Subpoena / Margin Call.)

## Active decisions (do NOT re-litigate)
- **THE UNIVERSAL cdMult IS DEAD (owner 2026-06-12 ~23:35: "turn off the doubled
  cooldowns flag; change numbers, not universal modifiers").** All cds/durations are
  LITERAL ticks (10 = 1s) and item texts tell the truth; the game runs 2× faster than
  the old live pace, symmetrically. setCdMult/cdScale remain as INERT STUBS (old
  harnesses call them); never resurrect the knob — pace changes edit numbers directly.
  hpMult (default 1) survives as a knob; owner hasn't ruled on it.
- **HYDRA REWORK (owner, same message)**: opens behind 5 pre-placed heads · breed clock
  starts at 1 and DOUBLES per wave (hyper-inflation) · a head per POINT of damage landed
  (rate limit dead) · low all-lane maul = floor number (1/2/3) on its own clock. cds
  [PLACEHOLDER] (headCd 80, maulCd 50).
- **Echo: 4s bar / 1s pushback** (ECHO_CD 40, ECHO_DELAY 10) — owner numbers, literal.
- **+1 maxHp to EVERYTHING except summon tokens** (heads/rats/tentacles stay 1/1 per the
  owner's own earlier ruling — flagged to him, no objection yet): 36 generated bodies
  (generator +1), rookie 9, classes 13/8/7/10, bosses 21/15/19/19/16.
- **Buffs are ally-targetable**: the `buff` op reads the ally-target slot (same as heals),
  falls back to self. Foe-side buffs stay self-cast.
- **Hydra heads = per INSTANCE of damage, not per point** (owner corrected 00:20) — one
  head per landed hit, any size, no rate limit. Multi-op items are multiple instances
  (melee ones chew their own bloom — unpinned emergent behavior, left alone).
- **50-game sweep fixes (owner order "find balance changes I've missed", tools/sim50.js)**:
  (1) **floor-boss + King clock cds HALVED** — when cds went literal, party DPS doubled
  but boss clocks didn't, so the Kraken's median fight ended BEFORE its first steal;
  halving restores the owner-approved mechanics-per-fight tempo (Lich 34/40, Djinn 24/30,
  Kraken 47 + wall 34→20, King cards 37/27/24/34; Hydra untouched — fresh post-flag
  numbers). (2) **caravan scales with party**: 20 × players (solo unchanged) — flat 20
  halved per-player slack at 2P (duos died ~2× solo in ordinary rooms pre-fix). Post-fix
  boss winrates (dumb bot): hydra 50 / djinn 60 / kraken 88 / lich 100. CAVEAT: sim50's
  absolute winrates are bot-quality-bound (random invites, no upgrades — 0% throne is the
  BOT, not the game); only relative spreads are signal.
- **1:1 SYMMETRY IS IDENTITY-LEVEL.** Heroes and foes share every multiplier and mechanic.
  Never add hero-only/foe-only tempo or damage dials (one was added and reverted within an
  hour — comment near the cdMult block in game.js marks the grave). Difficulty eases
  through the room/ante economy.
- **One gold number per entity** (`KIT[k].ante`, `BODIES[k].gold`) is the whole economy:
  ante weight, loot value, shop price, and (via unlockCost formula) adoption. New content
  gets a price, not a class.
- **Unlock ladder semantics**: threshold opens WEIGHTS; pool membership opens BODIES; both
  required to wear. Ladder pays differences, never refunds, resets per run (startDraft).
- **Modifiers are informed wagers**: terms (name/text incl. payout) visible on map hover
  AND on the advance buttons. baseAnte numbers + the last three modifiers are placeholders.
- **Wandering Monster** rolls its foe at MAP GEN (so "(x)" is in the hover/button name);
  seeded as a non-greedy, ownerless, lane-pinned draftedFoes entry (placedLanes honors
  `f.lane`). removeGreedy can't touch it.
- **Carousel remove = UNDO** (restores the consumed palette option to its slot) — kills the
  reroll-scry loop while plain adds still roll fresh options.
- **Ratchet kills the cheap guarantee deliberately** — expensive-only is what the party
  signed for; nextPaletteOption degrades to "biggest option ≤ cap" past the content ceiling.
- **Summon toggle is a sticky mode, not a per-press question** — frantic clicking is the
  core combat feel; never add per-press confirmation to combat actions. (Same reason the
  echo redesign should avoid press-timing decisions — see Next step 1.)
- **Drop guard** (two-tap + 600ms) exists because the won/shop overlay renders under the
  player's finishing taps. Don't "simplify" it away.
- **Owner canon discipline**: [PLACEHOLDER] tags = assistant gap-fills, owner overwrites
  without debate. Standing rules hold: tuning is the OWNER's · feel/juice deferred ·
  damage preview shares resolver math · melee never follows the reticle · weapon floor ≥1
  · summon tokens HP-knob exempt · cdMult baked at creation. **"No auto-attack bars" was
  SUPERSEDED by the owner himself (2026-06-12 train, "tired of clicking")**: per-player
  ✋/⚡ fire-mode toggle, manual default; AUTO fires ready DAMAGING non-fragile items via
  the real useItem path (echo/Djinn counter/school triggers all fire) — heals, shields,
  summons, utility and one-shots stay manual ([PLACEHOLDER] policy).
- **Fuzz bot economy**: the bot must stay solvent (≥20g guard before buying unlocks) — an
  impoverished bot chip-stalls vs regen foes and fails fuzz as a bot artifact, not a rule.

## Landmines
- **TWO FULL SESSIONS OF WORK ARE UNCOMMITTED** (the 6/12 playtest-dial session AND the
  King Mimic build: game.js, server.js, public/client.js, test/game.test.js,
  BOSS_SPEC_V1.md, HANDOFF.md). The owner hasn't said "commit" — ASK FIRST, then commit in
  logical chunks (the King build is its own clean commit). ~37+ commits ahead of origin.
- `room.boss` deck driver: `tickBossClocks` REPLACES `c.clocks` mid-loop when a deck card
  fires (then breaks) — don't refactor that loop to cache the array.
- Restart the server for game.js/server.js edits (imported once at boot); KILL STALE BUN
  FIRST or live tests pass misleadingly. `public/*` serves fresh — pull-to-refresh phones.
- **Bun only. No Node, no Playwright.** Background bun via Bash exits 127 — use the
  detached PowerShell form (Pointers). `tools/shoot.ps1` KILLS the server; screenshot.js
  doesn't.
- **The tunnel makes localhost PUBLIC (incl. god mode) — kill cloudflared when not
  playtesting** (killed at this seam). New tunnel = new URL.
- `room.boss` is NOT in room.lanes — new "all foes" sweeps must include it. `foeCount()`
  counts lanes only on purpose (King Mimic ward).
- Tests pin `setCdMult(1)`; live runs 2×. Boss/foe clocks bake cdScale at CREATION.
- The Djinn counter hooks the END of useItem (ops-bearing items only).
- **PowerShell 5.1 commit hygiene**: `git commit -m` with embedded quotes silently splits
  args → write the message to a file `-Encoding ascii` and use `git commit -F`.
  `Remove-Item`/`rm` trips the permission guardrail — ask the owner (`! rm <path>`).
- Demo fixtures are display-only and now slightly stale (stock demo shows the OLD Minotaur
  counter text; DEMO_BODIES still carry dead `rarity` fields; `content.js` blurbs may
  reference retired V1/rarity wording). Harmless, but don't "fix" engine code to match them.
- Scratch awaiting owner deletion: `probe_lanes.mjs`, `probe_latejoin.mjs`,
  `.git/COMMIT_MSG_TMP`, `tools/tunnel.out`, `tools/shots/_*.png`.
- Test-bot contracts: e2e's solo bot stocks the CHEAPEST palette slot; smoke counts
  foes > 0 (a rolled Wandering Monster can add one); the pure stocking-gate test pins
  modifiers off — keep that pin if you touch enchant rolling.

## Pointers
- Run (detached, survives turns):
  `powershell -Command "Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Process bun -ArgumentList 'run','server.js' -WorkingDirectory 'C:\Users\dakot\king-mimic' -WindowStyle Hidden"`
- Tunnel (PUBLIC URL in tools/tunnel.log; kill when done):
  `Start-Process "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe" -ArgumentList 'tunnel','--url','http://localhost:3000' -WindowStyle Hidden -RedirectStandardError tools\tunnel.log -RedirectStandardOutput tools\tunnel.out`
- Test: `bun test/game.test.js` (pure) · `bun run test/{smoke,smoke4,reconnect,e2e,fuzz}.js`
  (live server required) · screenshots: `bun tools/screenshot.js won stock combat draft …`
  with W/H/QS envs (phone: W=470 H=844 QS=touch=1) against a running server.
- Key files: `game.js` — the whole engine: BODY_TEMPLATES/variant table + per-body `gold`
  (~140–230) · KIT w/ per-item `ante` values (~250) · shop face-value + uniform shelf
  (~345) · ENCHANTS deals + GIFT_ENCHANT + pickEnchant({noWanderer}) (~370–430) · ante
  window ratchet (ANTE_MIN/CAP/STEP, nextPaletteOption, upTheAnte ~470) · unlock ladder
  (unlockCost/goldsReached/canSwapTo/buyUnlock ~745) · seedWanderer + stock undo-restore
  (~1100–1160) · echo armed-clock (echoArm op + useItem/foe-tick gates — the part pending
  redesign) · summonBodies relative placement (~1880) · `public/client.js` — advBtns deal
  labels + showdownLine · wireDropButtons · updateSummonSide · demo fixtures ·
  `public/inventory.js` — unlock-ladder body modal · `public/index.html` — all overlay
  CSS incl. phone media queries · `test/game.test.js` — every owner ruling is pinned as a
  named assertion (search "owner 2026-06-12") · `BOSS_SPEC_V1.md` — boss canon (unchanged
  tonight; one stale open question: should Hydra heads come from the CLOCK ONLY?).
