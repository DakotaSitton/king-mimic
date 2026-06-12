# HANDOFF — King Mimic — 2026-06-12 17:55 (FIRST COMPLETE 3-FLOOR RUN + economy de-tiered)

> Pick-up doc for a cold instance. King Mimic is a soft-real-time co-op browser roguelike:
> N lanes (= player count, 1–4), defend the shared Caravan, wear the bodies of foes you
> defeat. **MILESTONE: the owner played a COMPLETE 3-floor run start→finish (bosses beaten)
> and built an emergent theme (Royal Rat + Slime Crowns + Magic Missile spam) — "immensely
> satisfying". The core loop is validated.** This session was a long live-playtest dial
> loop: ~10 owner verdicts implemented, tested, and verified, but **NOTHING IS COMMITTED**
> (see Landmines — that's the first thing to resolve).

## State (all verified live this session unless marked)
- **All suites green on the live rebuilt server**: `bun test/game.test.js` **296/296**
  (was 245) · smoke · smoke4 · reconnect · e2e · fuzz (multiple full passes). Server runs
  at http://localhost:3000; **tunnel KILLED at seam** (new one = new URL; phone players
  must pull-to-refresh after client changes).
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
**Three owner decisions are parked — get verdicts, implement in this order:**
1. **Echo redesign** (owner: armed-charge echo "feels clunky… bad feeling"; my recommended
   fix he's "tempted" by: **heavy-echo** — matching-school items with cd ≥ 3s ALWAYS
   resolve twice; no charge, decision moves to kit-building. ~One line at useItem + foe
   tick + previews, remove the echoArm clock from centaur/mouse templates, re-pin tests).
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
  damage preview shares resolver math · no auto-attack bars · melee never follows the
  reticle · weapon floor ≥1 · summon tokens HP-knob exempt · cdMult baked at creation.
- **Fuzz bot economy**: the bot must stay solvent (≥20g guard before buying unlocks) — an
  impoverished bot chip-stalls vs regen foes and fails fuzz as a bot artifact, not a rule.

## Landmines
- **A FULL SESSION OF WORK IS UNCOMMITTED** (~10 files: game.js, server.js, public/*,
  test/*, HANDOFF.md). The owner hasn't said "commit" — ASK FIRST, then commit in logical
  chunks or one playtest-session commit. ~37+ commits ahead of origin; push = owner's call.
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
