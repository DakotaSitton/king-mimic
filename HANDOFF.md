# HANDOFF — King Mimic — 2026-07-18 22:40 CDT

## State

- **The level-up balance correction and distinct summoner identities shipped in `0bc9750` and are
  live on Railway.** Neptune Mastery now lowers both its tax (+2→+1) and replay threshold (6+→5+),
  so the effective-cost boundary moves coherently. Fundjin's hidden timer-to-moxie conversion is
  gone; its intentionally huge 5-point Mastery adds a separate six-moxie trigger for both gods while
  the original six-second clocks remain independent.
- The four summoners now own non-overlapping summon-wide Specialties through the shared summon seam:
  Fat Cat grants +1 melee/ranged damage per rank to every summoned entity (one grant for a merged rat
  stack), Royal Rat grants +1 innate shield per rank to every summon (each rat contributes shield to
  its merged stack), Paid Piper creates +1 body per rank, and Affluence Anubis grants +1 flat armor
  per summoned entity/rank. Armor now works on friendly summons for front and lane-wide hits with the
  same minimum-1 convention as foe bodies. Fat Cat's bonus reaches both summon cards and passive
  attacks on hero and foe teams.
- Reviewed overtuned rows were narrowed without changing base bodies or cards: Royal Rat/Paid Piper/
  Anubis Masteries cost 4; Interest Imp rows cost 3; Basilisk costs 3/4; Medusa and Castle Masteries
  cost 3; Minotaur and Behemoth's capped damage-trigger shield refund is 1 instead of 2. Saturating
  Specialties now stop at their last useful rank: Centaur 9, Mouse 9, Lizard Wizard 10, Killionaire
  8, Basilisk 2, and Medusa 9; combat-start moxie is also defensively clamped to 10.
- Independent read-only balance review found and closed two false-positive seams before release:
  Anubis armor had only been stored on friendly tokens, and Fat Cat fields did not affect passive
  attacks. Functional regressions now prove landed damage/mitigation, merged-rat semantics, exact
  first-legal Mastery levels, cap rejection, Neptune's boundary, and Fundjin's independent clocks.
  Verification: game **2485/0** plus BABER/summon and clock regressions, passive sandbox **340/0**,
  squad **28/0**, telemetry **86/0**, serve **64/0** locally and on Railway, and fuzz **60/60**.
  Railway deployment `5513cb47-55ba-4dd2-9c12-bcdce52c8ce9` passed health. A fresh two-player
  production lifecycle reached `draft → won → setup → playing → lost` with zero JS errors, 404s, or
  missing art; capture: `tools/shots/real-mobile-2026-07-19T03-38-47`. With zero established player
  sockets, the Cloudflare path's Bun owner of `:3000` was refreshed from PID `26132` to `40400`;
  Cloudflared remained untouched.

- **The one-action multiplayer boss rewrite and Dakota's authored Kraken/King designs shipped in
  `d3bb541` and are live on Railway.** Hydra, Lich, Djinn, Kraken, and King now expose exactly one
  authored deck card at a time; the card captures the number of present human seats when drawn and
  scales its effect by that count. A disconnect cannot mutate an already-telegraphed action. Boss
  core rules such as Hydra growth, Lich stance, and Kraken theft remain separate clocks rather than
  counterfeit extra deck cards.
- Kraken is a true four-lane backline body with one separate theft clock and one three-card deck.
  Theft splices an exact minted card from a living player's draw or used pile, prioritizing active
  damage/self-shield cards, then damaging passives, then anything available. The card is absent until
  its floor×5-HP animated foe dies or Kraken dies, then the exact ID returns to its original pile.
  Only one stolen card-foe can exist globally. Tentacles creates one 8-HP/current-HP attacker per
  present human in distinct lanes (floor costs 4/3/2/2); Lightning Storm deals floor×3 per lane;
  Barnacle Swarm applies a six-second party/summon damage penalty that ramps by one per play.
- King is one lane-bound body in a four-lane arena with literal **99 HP per present human**, no
  stance, and exactly four cards: Party creates P exact-ante-14 armed foes plus P 10-HP animated
  high-impact items; Dunk deals 10×P melee to the front target; Finger Beam locks the highest-value
  hero lane at draw and deals 6×P to everyone there; Gambit resolves distinct existing buff cards
  worth exactly 10 moxie. After every card, King moves to the literal back of the foe lane with the
  greatest HP+shield screen. On short phones King and a blocker share one split tactical row with
  distinct tap targets, keeping the full rule visible without overlapping the player.
- Verification for `d3bb541`: game **2441/0** plus BABER/summon and room-clock regressions, passive
  sandbox **340/0**, squad **28/0**, telemetry **86/0**, fresh-server serve **64/0**, fuzz **60/60**,
  and a fresh two-WebSocket multiplayer smoke pass. Exact Kraken/King 852×393@3 scenarios had zero
  JS errors and zero foe/hero or boss/hero overlaps:
  `tools/shots/scenario-boss-readability-kraken-2026-07-19T01-39-38` and
  `tools/shots/scenario-boss-readability-king-mimic-2026-07-19T01-51-35`. The final local real-phone
  lifecycle reached `draft → won → setup → playing → lost` with no JS/HTTP/art errors. Railway then
  served the new Kraken/King markers; a fresh production phone run reached
  `draft → won → setup → playing → won`, cleared two nodes, and had zero JS errors, 404s, or missing
  art. Production capture: `tools/shots/real-mobile-2026-07-19T02-17-32`. With zero established
  player sockets, the Cloudflare path's Bun owner of `:3000` was refreshed from PID `43720` to
  `26132`; Cloudflared remained PID `11488`. The tunnel serves the same new markers and passed serve
  **64/0**.

- **The shared player combat clock shipped in `450a223` and is live on Railway.** The live HUD cycles
  `1× → ½× → ¼×`; every human seat owns its request and the slowest present player wins,
  so one partner can create breathing room without another accidentally speeding the fight back up.
  Disconnected seats stop holding the clock slow and recover their saved request on reconnect.
  The server keeps networking, snapshots, and input at 10 Hz while gating deterministic simulation
  ticks, so cards, bosses, summons, hazards, moxie, passives, and countdowns all slow together without
  making taps or co-op synchronization sluggish. `combat/clock_cycle` and accepted `clock_change`
  telemetry expose interaction and effective speed without client-side duplication.
- Verification for `450a223`: game **2427/0**, passive sandbox **340/0**, squad **28/0**, telemetry
  **86/0**, serve **64/0** locally and on Railway, fuzz **60/60**, plus deterministic divisor,
  disconnect/reconnect, invalid-request, and real two-WebSocket negotiation coverage. Exact
  852×393@3 quarter-speed QA proved a 44×30 target, one HUD row, in-bounds canvas, and zero render/
  JS/HTTP errors; capture: `tools/shots/clock-quarter-852x393.png` (generated/ignored). A fresh local
  run reached `draft → won → setup → playing → won`; a fresh production phone run reached live
  Djinn combat and a normal defeat with zero JS errors, 404s, or missing art. Railway deployment
  `a967908f-0dda-4b74-a83b-7050505dc050` served the new client and passed the full live suite.
- The prior requested no-tuning treasure-value report is now durable at
  `CARD_VALUE_AUDIT_2026-07-18.md` (`5eeb326`). It audits every collectible's ◈V1–V5 tier, value×cost
  structure, runtime economy consumers, and frozen production interaction evidence without proposing
  or changing cards or values.

- **Summoner-wide progression, BABER partner assist, and the Djinn/King phone repair shipped in
  `9e6134f`.** Fat Cat, Royal Rat, Paid Piper, and Affluence Anubis Masteries now add +1 damage to
  every body they summon while retaining their authored trigger improvements. Their Specialties now
  apply to every summon source, not only passive rats: Fat Cat grants summon HP, Royal Rat shields
  every third summon, and Paid Piper/Anubis add bodies to every summon effect. The shared summon
  constructor owns the rule for hero/foe symmetry, including merged rat stacks and non-rat cards.
- Exact room code `BABER` is an isolated partner-playtest assist. Each player gets **3× body base HP**
  (level HP remains ordinarily additive), and damage whose source is a foe is halved with upward
  rounding/minimum 1. Body swaps retain the assist; self/friendly damage and every other room code
  remain unchanged. Direct regression lives in `test/baber-summons.test.js`.
- Short-touch Djinn now uses one command surface plus a small medallion at its literal lane/depth;
  repeated `LANE/BACK/BEHIND` prose and the giant tornado placeholder are gone. King Mimic omits the
  redundant full five-mode rule catalog on short screens so his court gets a readable row. Exact
  852×393 scenarios passed strict hitbox-overlap proofs. iOS lobby now explains the only reliable
  chrome-free Safari path—Share → Add to Home Screen—and the board disables browser pan/overscroll.
- The frozen production audit is `PLAYTEST_AUDIT_2026-07-18.md`: first 4,480 Railway events / 162
  runs, excluding 95 harness events / 18 harness runs, leaves 144 telemetry-classified human runs.
  Of 323 resolved combats, 220 were wins and 103 losses; two runs cleared the throne. The card pool
  is verified at 79 cards (costs 1–10). The gap-only matrix records actual empty/thin cells without
  proposing cards; summon breadth is thinnest, high-cost resource/defense bands are empty, ranged
  has endpoint gaps, and 53/79 cards are concentrated at costs 3–5. `harness:false` is provenance,
  not proof of physical operator identity, and the report says so explicitly.
- Verification for `9e6134f`: game **2427/0** plus BABER/summon regression, passive sandbox
  **340/0**, squad **28/0**, telemetry **84/0**, serve **54/0**, fuzz **60/60**. Exact Djinn and King
  phone scenarios and a fresh two-node real local lifecycle completed with zero JS errors, 404s, or
  missing art.

- **Production run recovery, semantic UI telemetry, and the prominent melt flow shipped in runtime
  `9f4d6e1`.** Today's Fat Cat/Fundjin two-human run was never missing: Railway's persistent
  `/var/data/telemetry.jsonl` records room D, run `run-2026-07-18T18-18-07-046Z-D`, starting 13:18
  CDT. It reached floor 3, completed 16 combats (15 wins / 1 loss), beat Hydra and Litigation Lich,
  and converted Fundjin's bag for ◈25. The earlier audit searched only the laptop-local archive and
  incorrectly reported the production session absent. Production Railway data is canonical for real
  remote play; local telemetry is verification/harness history.
- `tools/telemetry-report.js` now accepts `--stdin`, `--file`, and `--run`, so the canonical exact-run
  production report is one command: `bunx @railway/cli ssh cat /var/data/telemetry.jsonl | bun
  tools/telemetry-report.js --stdin --run <runId>`. The recovered run's human-seat summary is 16
  measured fights / 32 seat-results; Fat Cat went 15/16 and Fundjin 11/12 while present. In the final
  fight, Fundjin's 8 HP was removed by Arcane 1 + Wind 2 + Basilisk Ice 3 + enemy Fundjin passive 1
  + the final point of Medusa Ice; Fat Cat later died to Medusa Power Word: Gun for 13 requested / 9
  effective damage.
- New privacy-safe `ui_interaction` rows measure semantic surfaces/actions, not coordinates, player
  names, DOM text, or arbitrary client strings. Server-authoritative command attempts cover combat,
  draft, rooms, stock, build, loot, shop, trade, and squad actions; local events cover screen views,
  tabs, panel disclosure, and melt arm/cancel. The report prints surface totals plus action share for
  genuine human seats. This starts collecting after this deployment and cannot reconstruct screen
  interactions from the pre-deployment Fat Cat/Fundjin run.
- **MELT EXCESS CARDS is now a full-width gold progression callout above both card grids**, with a
  large `+◈ payout`, backpack count, deck-safety copy, post-melt bank total, and large two-step
  confirmation/cancel targets. The economy value and irreversible confirmation rule are unchanged.
  Exact 852×393@3 touch captures:
  `tools/shots/scenario-melt-excess-cards-2026-07-18T20-07-45/02-large-melt-payout.png` and
  `03-large-melt-confirmation.png`; the live scenario produced zero JS/HTTP/layout errors.

- **Dakota's two-player combat-readability playtest fixes shipped in `15d50ea` and are live on
  Railway and the active Cloudflare-tunneled local server.** At 852×393 touch, Hydra/Lich command
  decks now collapse into a short command rail instead of covering the party; the Lich stance takes
  the redundant rule row's place, up to four concurrent actions fit one row, and active boss effects
  move into the identity line. The scenario harness now fails if a boss panel intersects any hero
  hitbox, closing the geometry hole that let the three screenshots pass older checks.
- Active foe effects are now laid out before optional duplicate moxie text, so Pet Leech cannot be
  squeezed off Nepotistic Neptune. Rat and Large Rat use distinct clean mouse silhouettes, and summon
  names paint after their portraits instead of being hidden by them. A downed co-op body keeps the
  structured lethal source/card visible during the continuing fight (`DOWN · Neptune/Dagger · 1 HP`).
  Rat-stack logs retain their live count, so a scaled 9-rat Bite is no longer reported as generic
  `foe Rat`.
- **No room-balance values changed.** The room generator already scales total ante from party size ×
  floor, then deliberately distributes that budget through equally weighted eligible skews
  (`swarm`, `veteran`, `arsenal`, `bodies`, `mixed`). The screenshot's two seven-body rooms beside one
  Atlas L4 room are the intended count-concentrated contrast: both competition scaling and high-count
  rolls happened. Treat reweighting/capping that diversity as an owner decision after more play, not
  an automatic correction.
- The older local room M archive remains useful historical evidence (eight wins then a loss, including
  a 10-damage Economy Elemental Black Hole and a nine-rat Royal Rat), but it is not today's session.
  Do not use laptop-local absence to infer production absence again; query Railway's persistent volume.
- Verification for `15d50ea`: game **2426/0**, passive sandbox **340/0**, squad **28/0**, telemetry
  **69/0**, serve **51/0**, fuzz **60/60**. Exact two-client Hydra, Lich, and
  Neptune/leech/rat/death scenarios passed at 852×393@3 touch with zero JS errors and zero
  boss/hero or foe/hero overlaps. The real two-browser co-op harness completed two won games with zero
  JS errors; the current-commit local lifecycle and fresh deployed Railway lifecycle had zero JS
  errors, 404s, or missing art. Railway and the Cloudflare tunnel each passed serve **51/0** and both
  serve the new client markers. Cloudflared remains PID `11488`; the refreshed Bun owner of `:3000`
  is PID `4764`.

- **Run-persistent shared spoils shipped in `335ec58` and are live on Railway and the active
  Cloudflare-tunneled local server.** Co-op `room.loot` is now one shared pool for the whole run:
  unclaimed cards survive room entry, shops, and floor descent; new drops append; a successful claim
  removes exactly one copy. Only `startDraft` (a genuinely new run) clears the pool.
- The exact reported Lion Lance failure is regression-locked with two seats: the first split leaves
  both unable to afford it, a failed claim changes nothing, advancing into setup preserves it, and a
  later clear adds only its new drop value to bid points. Lion Lance then reappears in the won snapshot
  and can be claimed with accumulated points. Carried cards are not re-funded or re-counted as fresh
  `loot_offer` telemetry. The UI now labels this explicitly as shared spoils that carry forward.
- Verification for `335ec58`: game **2423/0**, passive sandbox **340/0**, squad **28/0**, telemetry
  **69/0**, serve **51/0**, fuzz **60/60**. The current-commit local real-phone run cleared two nodes
  with zero JS errors/404s/missing art. The real two-browser co-op harness completed two won games,
  passed every vote/lock gate, rendered the shared-pool message legibly, and left zero JS errors or
  processes. Railway served the new marker, passed serve **51/0**, and completed a fresh deployed
  852×393 touch lifecycle through real combat with zero client errors.

- **Dakota's pre-playtest combat patch shipped in `215ab0a` and is live on Railway and the active
  Cloudflare-tunneled local server.** Player effects now have a dedicated rail strictly below the
  HP/shield plate. The rear friendly anchor reserves the complete body → HP → effects footprint, so
  the rail never clamps over HP or retreats into the portrait at 852×393 touch.
- Market-Crash Minotaur and Bond Behemoth were the exact two bodies whose repeatable damage-trigger
  Specialty could reach 3 shield on a 3-damage clock and self-sustain through shield-absorbed hits.
  Both Specialties are now capped at rank 1 and always grant exactly 2 shield, including stale or
  injected higher-rank state. Rank 2 is rejected by allocation, while a repeated 3-damage hit through
  the 2 shield still triggers the passive and necessarily loses 1 HP.
- **Every main boss body has its original HP again:** body base × party size × floor/throne budget.
  All other `3202cad` difficulty reductions remain at 50% with upward rounding/minimum 1: direct
  output, healing, summon/wall/court counts, Hydra growth, Lich orbs, Djinn hazards, Kraken tentacles,
  and Kraken/King stolen-card entities. Boss cadence, movement, stance, concurrency, and the fixed
  readable command panels remain unchanged.
- Verification for `215ab0a`: game **2406/0**, passive sandbox **340/0**, squad **28/0**, telemetry
  **69/0**, serve **51/0**, fuzz **60/60**. The exact three-effect phone scenario visibly proved the
  body → HP → effects order at 852×393@3 touch with zero client errors. Fresh current-commit local and
  deployed real-phone lifecycles passed with zero JS errors, 404s, or missing art; Railway separately
  passed serve **51/0** and served the new layout marker.

- **The causal body-passive sandbox and Dakota's Minotaur/Lich playtest repair shipped in `83c53e3`
  and are live on Railway.** `bun run test:passives` now executes all 34 wearable bodies as hero and
  foe across base/Mastery/Specialty, plus a same-level no-rank control for every ranked cell: **340
  causal executions** through real public card, damage, summon, and tick resolvers. The suite is a CI
  gate and fails on missing roster entries. A guarded Developer Lab preset and two exact phone
  scenarios cover the ranked Minotaur and floor-one Litigation Lich in the live client.
- The Minotaur combat passive itself was correct when its allocation reached the server. The owner
  failure was an interaction trap: `+`/`−` edited only local state until a separate Apply button, so
  combat could silently start with the previous all-zero allocation. Free reallocations now save on
  every valid tap and clear their Saving state only after an authoritative snapshot. Combat telemetry
  records the exact allocation and aggregate shield granted. The real browser path showed
  `Market-Crash Minotaur … +2🛡 · 🗡1`, then exercised melee `1→0→1` with both acknowledgements clean.
- The new matrix immediately caught and repaired a real foe-symmetry bug: Centless Centaur Mastery,
  Penny-Pinching Pixie Specialty, and Pyramid-Scheme Head Specialty calculated flat output boosts but
  foe `deal` ops dropped them. A same-level negative control and a no-amount Shield Bash regression
  prevent level coupling and double-applied output from faking a pass.
- **Litigation Lich's Power Word: Annihilate now deals normal `floor × 5` damage.** Shields absorb it
  before HP; it also respects mitigation, reactions, ordinary damage logging, lethality, and telemetry
  instead of forcing HP to one. Bone Legjon summons one ordinary body per floor, so floor 1 summons
  exactly one body and the first floor-one
  Bone + Frost cycle is Lich plus two adds (**3 total**, down from 4). This is the narrow owner-requested
  wave-count correction; repeated deck cycles are still uncapped and remain a separate tuning choice.
- Verification for `83c53e3`: game **2369/0**, passive sandbox **340/0**, squad **28/0**, telemetry
  **69/0**, serve **51/0**, fuzz **60/60** (one known sustain-wall stall abandoned), exact Minotaur and
  Lich 852×393 scenarios clean, in-app allocation/passive play clean, and a local real two-node run
  cleared both nodes with zero JS errors/404s/missing art. Production served the new client markers,
  passed serve **51/0**, and completed two fresh 852×393 touch lifecycles through setup/combat/loss
  with zero JS errors/404s/missing art.

- **Depth-honest summon formation and the single full combat log shipped in `eb429d7` and are live
  on Railway.** Wide hero groups now follow their real server front-to-back order on a readable
  diagonal: a cyan depth rail points toward the foe and the actual first blocker is labeled
  `1 · FRONT`. Summons keep full body silhouettes instead of being flattened, and the summon body
  itself remains the only tap/click target. Exact fixture:
  `tools/scenarios/summon-depth-formation.json`.
- **Defeat now shows one accurate chronological combat log and no secondary recap.** `HOW YOU DIED`,
  `WHAT JUST HAPPENED`, and duplicate summary logic are gone. The modal gives the full bounded log
  nearly all available height, scrolls to the newest entry, preserves the individual cast/proc/heal/
  shield/damage/down events, and correctly color-classifies indented entries. Exact fixture:
  `tools/scenarios/defeat-full-combat-log.json`.
- Verification for `eb429d7`: game **2357/0**, squad **28/0**, telemetry **69/0**, serve **51/0**,
  fuzz **60/60**, plus 2-player/4-player smoke and reconnect green. Both exact 852×393 fixtures and
  the local real two-node lifecycle had zero JS errors, 404s, or missing art. Production served the
  commit marker, passed serve **51/0**, and completed a fresh real-phone lifecycle through a loss;
  its single 36-entry full log showed the lethal damage chain with zero client errors, 404s, or
  missing art.
- **Ranked body-upgrade repair and summon-body rendering shipped in `259b176` and are live on
  Railway.** HP progression is now regression-locked at base max HP plus exactly `4 × health rank`
  for ranks 1–3, and the level sheet states both the cumulative bonus and resulting max-HP preview.
  Combat snapshots, trackers, inspection, and the worn-body reader now all consume the leveled body
  and leveled passive text, so Fat Cat Mastery displays and tracks a 2-damage trigger instead of the
  base 3. Every one of the 34 wearable bodies has an automated non-base ranked-combat-text check.
- Three functional upgrade mismatches found during the roster-wide audit were repaired symmetrically
  for players and foes: Rat Baron/Lizard Wizard refund the first ranged card even after an earlier
  melee play; Pixie's specialty boosts only melee cards that actually received its body discount; and
  Weary Wageslave's specialty adds its lane hit without replacing the base front hit. Bribed Bishop,
  Atlas, Fundjin, and other transform/start-of-combat paths received focused regression coverage.
- **Summons now read as bodies on the board.** Friendly summons use the depth-honest diagonal
  formation described above; ordinary hostile summons use circular body portraits with cast rings
  plus attached HP/action text; only true overflow falls back to the compact tactical treatment. The
  body itself is the sole tap/click target. Golden Golem's hero chassis was enlarged and no longer
  gets vertically compressed by the friendly-summon budget. The original Golden Golem + Hedgefund
  Knight + three-rat phone fixture remains at `tools/scenarios/summon-body-regression.json`.
- Verification for `259b176`: game **2355/0**, squad **28/0**, telemetry **69/0**, serve **50/0**,
  fuzz **60/60**, multiplayer 2-player and 4-player smoke plus reconnect green. The exact summon
  fixture and local real 852×393 lifecycle had zero JS errors, 404s, or missing art. Production served
  the commit marker, passed serve **50/0**, completed a fresh 852×393 touch lifecycle through real
  combat with zero client errors, and was independently exercised in the in-app browser through
  Golden Golem draft → collapsed setup → Fat Cat combat.
- **Level-up and deck/backpack management are compact by default in `e889e71` and live on Railway.**
  Setup and between-room Backpack screens now show two independent 46px touch disclosures instead of
  rendering the five-row level sheet and full card collection immediately. Their summaries retain the
  current body/level/free points and deck/spare/banked-treasure counts; one tap expands the complete,
  unchanged editor, and the choice persists through authoritative snapshot repaints. Collapsing an
  active level-payment tray safely cancels its local tender. Shop deck/backpack editing uses the same
  disclosure. No engine, economy, body, card, or balance values changed.
- Verification for `e889e71`: game **2270/0**, squad **28/0**, telemetry **69/0**, serve **49/0**,
  fuzz **60/60**, multiplayer smoke green, and local + deployed real 852×393 runs reached
  `draft → won → setup → playing` with zero JS errors, 404s, or missing art. The in-app browser also
  exercised both open/close paths on mobile and desktop, visually inspected the compact setup, and
  entered production combat with zero warnings/errors. Production `test/serve.test.js` passed 49/0.
- **Dakota's summon/Blizzard/death-log playtest pass is shipped in `a132641` and live on Railway.**
  The duplicate summon strip above the hand is gone; the board body is now the sole targeting surface.
  Cramped groups retain one real ID-bearing card per summon and fan/overlap instead of collapsing into
  an untargetable synthetic representative. Blizzard is lane-wide Ice: every foe in the lane takes 3,
  then receives six seconds of damage reduction equal to its own post-mitigation hit; moxie is unchanged.
- **Defeat explanations no longer parse prose or privilege the last boss action.** Every damage instance
  writes a bounded structured event with source body, exact card/effect, requested/resolved damage,
  shield absorption, real HP loss, direct/piercing flags, and lethal status. The client follows the
  dead player's own event chain and labels it `HOW YOU DIED`. The reproduced Lich→Mouse case now says
  Annihilate set Paid Piper from 9→1, then Malevolent Mouse's Sword resolved for 4, removed the one
  remaining HP, and was lethal. Player and body names are shown together (`Paid Piper (Dako)`).
- Verification for `a132641`: game **2305/0**, squad **28/0**, telemetry **69/0**, serve **48/0**,
  fuzz **60/60**, multiplayer smoke green. Exact 852×393 touch fixtures visually verified board-only
  summon cards and the structured lethal recap with zero browser errors. The local real lifecycle and
  deployed Railway lifecycle both reached `draft → won → setup → playing → won` with two cleared nodes,
  zero JS errors, zero 404s, and no missing art. The randomized shop-seeking `test/e2e.js` remains stale:
  it failed twice after not finding the now-5%-rare shop and reports `attempt undefined`; this is a test
  harness problem, not a failure in the verified combat lifecycle.
- **Point leveling and the three shared elite tiers shipped in `f895fcf` and are live on Railway.**
  Every level above 1 grants one freely reallocatable point. Health (`+4 HP`), melee (`+1`), and ranged
  (`+1`) each cost one point; row four is a one-time body-specific Mastery and row five is a repeatable
  body-specific Specialty. All 34 wearable bodies have authored rows, and foes spend the same exact
  point budget randomly and expose that allocation in inspection. The five-row sheet, allocation
  persistence, atomic level-up/body-swap handling, and all authored combat effects are implemented.
- **Elite access is fantasy-power-first and deliberately conservative:** Tier I is Killionaire, Audit
  Angel, Depression Demon, and Bookie Bonelord (`+2` foe ante / `◈4` adoption); Tier II is Basilisk,
  Medusa, Debt Dragon, and Wandering Castle (`+4` / `◈7`); Tier III mythic is Fundjin, Neptune, Atlas,
  Sphinx, and Affluence Anubis (`+6` / `◈11`). Base bodies and cards were not broadly rebalanced.
  `LEVELING_AND_ELITE_TIERS.md` is the canonical owner-editable artifact; `engine/leveling.js` is the
  runtime table. Verification: game **2270/0**, squad **28/0**, telemetry **69/0**, serve **48/0**,
  fuzz **60/60**, and multiplayer smoke green. Local and deployed lifecycles reached
  `draft → won → setup → playing → won`; production showed the five-row level sheet and tier prices
  with no browser warnings or errors.
- **2026-07-17 production incident fixed and verified at runtime commit `97b99d3`.** The summon-card
  refactor in `bab360c` deleted the `crowdH` declaration but left its use in `_renderFrame`, causing
  every setup/playing snapshot to throw after clearing the canvas. The hotfix restores the crowd
  calculation and exposes render-error diagnostics. Full local bar: game **2296/0**, squad **28/0**,
  telemetry **69/0**, fuzz **60/60**, serve **48/0**. The real local phone run reached
  `draft → won → setup → playing → won` with zero JS errors.
- **Production was verified through the exact lifecycle, not just `/health`:** a fresh normal room at
  the phone-landscape/touch profile reached setup and playing with zero JS/render errors, one hero
  hitbox, one foe hitbox, a real board, and a visibly populated hero/foe/hand/HUD frame. The canonical
  `tools/shoot.mjs` now supports `BASE=https://…`, hard-fails on errors/blank render health, and exits
  nonzero instead of printing a warning and returning success. `CLAUDE.md` plus the repo verify skill
  now make the current-HEAD local gate and post-deploy production lifecycle mandatory.
- Checkout: `C:\Users\dakot\king-mimic` on `feat/room-draft-overhaul`.
- **Public production is deployed on Railway:**
  **https://king-mimic-production.up.railway.app**. Railway project `8498af62-f404-4661-ae04-6442e9921943`,
  service `4ddfd526-e710-429b-b7d1-0f61e2951a33`, environment
  `69ce51ab-225f-4c80-af2f-c7dda7f6445d`. The automatic rollout served `bab360c` by
  00:01 CDT on 2026-07-17. Railway builds the repo `Dockerfile` with Bun 1.3.14, tracks
  `feat/room-draft-overhaul`, uses Railway's injected `PORT=8080`, and checks `/health`.
- Production telemetry and combat logs use `KM_DATA_DIR=/var/data`, backed by attached persistent
  volume `king-mimic-volume` mounted at `/var/data`. The server's data-path behavior also passed a
  local isolated persistence probe. Do not remove the volume or the variable during redeploys.
- Hosted verification after rollout: `/health` returned HTTP 200; the new sim page, raw JSON, and
  summon client markers are served; the complete Railway suite passed **48/0**. The report was also
  visually inspected at 852×393 and 393×852 from the production URL with zero fresh browser errors.
- The complete mobile-first combat-simulation report is live at
  **https://king-mimic-production.up.railway.app/sim-results.html** with raw data at
  `/combat-sim-results.json`. It publishes every row for all 34 bodies: **34,000** paired
  fixed-deck fights plus **13,600** authored-starter fights (**47,600 total**), along with the seed,
  policy, timeout, filtering, sorting, and caveats. Regenerate it with
  `bun run tools/generate-combat-report.mjs` before publishing engine-affecting balance changes.
- The Railway account is currently on the trial allowance (30 days or $5, whichever is exhausted
  first). Dakota must upgrade the Railway plan before the allowance expires to keep production
  continuously available.
- The local fallback was refreshed after confirming zero established sockets: Bun **PID `36944`**
  owns `:3000`; Cloudflared **PID `11488`** remains untouched and serves
  **https://pads-corn-refuse-relationship.trycloudflare.com**. The Railway URL is the stable address
  to share. Local and tunnel endpoints both pass the same **48/0** served-build suite.
- The current owner direction supersedes the prior loot-honesty next step. Focus remains:
  1. **Simple, smooth mechanical play** — the actual feel of tapping cards, targeting,
     choosing, moving between setup/combat/results, and adjusting a deck. Use Balatro as
     the interaction benchmark: few taps, obvious state, immediate feedback, easy reversal,
     and no friction whose only purpose is ceremony.
  2. **Telemetry quality and use** — make the new measurements trustworthy and useful for
     diagnosing friction and later design balance, without treating metrics as design authority.
- Production telemetry on 2026-07-16 contained **1,250 events**, of which **1,240** were non-harness
  and non-bot, spanning **64 run IDs**, **57** runs that reached combat, **50** completed runs, and
  **132 combats**. Production HTTP logs showed genuine Android Chrome, multiple iPhone Safari,
  Windows, and Linux/X11 browser signatures across different networks; preview bots were excluded.
  Unless Dakota personally used every one of those devices, **other people have played King Mimic**.
  Telemetry still lacks a privacy-safe anonymous install/session ID, so exact player ownership is an
  inference; never expose raw IP addresses.
- The likely Dakota sessions are the iPhone-heavy `p19`, `p28`, and `p34` clusters. The clearest full
  run was Fundjin: **19-0**, floor 4, Kraken/Lich/King Mimic all defeated in about 10.7 minutes.
  The latest deep Atlas run was **11-1**, with Kraken defeated and Hydra the loss. Across the likely
  clusters Dakota went about **57-19** in combat. The current shape is spiky room-one/two variance
  and frequent restarts, followed by a very strong snowball once a build stabilizes.
- The requested archetype/mechanics pass is live in `67212ac`:
  - Starter bundles now use the live melee/ranged archetype model instead of the retired
    physical/magical school test. Four of five starter pairs are guaranteed archetype-fit and one
    pair remains deliberately wild.
  - Moonlight Greatsword and Rainblow Blade are statically **melee + ranged** for bonuses, discounts,
    and trigger families while retaining their authored front/lane targeting instead of becoming
    reticle cards.
  - Pet Leech snapshots `1 + ranged bonus` at cast and uses that same amount for both periodic damage
    and healing, symmetrically for players and foes. Stacked chips report the true summed magnitude.
  - Friendly summons now render as named rectangular tactical cards instead of player-sized circles.
    Touch layouts provide 46px-high targets and a stationary strip above the hand; cramped groups
    collapse to one named group card. Hostile summons are rectangular too, with at least a 44px
    logical touch target and named group targeting for swarms. Overlapping hitboxes resolve to the
    nearest center, and the selected ally is outlined in both the board card and pinned strip.
  - Foes whose passives can otherwise roll blank receive at most one same-value synergy replacement:
    Lizard Wizard/ranged, Penny-Pinching Pixie/melee, Depression Demon/debuff, Neptune/5+ cost,
    Audit Angel/non-damage, Bribed Bishop/heal, Sphinx/ranged damage, Wandering Castle/5+ cost, and
    Rent-Seeking Runeblade/melee+ranged. Card count, ante, first damaging slot, rich upgrades, and
    Djinn Coercion's exact ante remain intact.
- Historical comparative simulation evidence from the earlier isolated harness, not autonomous
  tuning (do not confuse these numbers with the current published report):
  - The isolated paired matrix used the same balanced ten-card deck and room seeds for every body:
    **34 bodies × 1,000 first combats = 34,000 fights**.
  - Clear high outliers were Affluence Anubis **98.4%** and Fundjin **90.0%**. The next cluster was
    Bond Behemoth **80.6%**, Debt Dragon **79.9%**, Royal Rat **78.0%**, Atlas **76.1%**, and Sphinx
    **75.8%**.
  - Clear low outliers were Warewolf **15.0%**, Neptune **22.0%**, Audit Angel **22.7%**, Bribed Bishop
    **28.4%**, Penny-Pinching Pixie **28.5%**, Centless Centaur **30.9%**, and Bookie Bonelord **32.9%**.
    Wandering Castle, Toll Troll, Sphinx, Atlas, Golden Golem, and Fat Cat also produced notable stalls.
  - The broader starter-bundle sim improved Lizard Wizard roughly **13%→26%**, Depression Demon
    **20%→27%**, Warewolf **29%→35%**, and Medusa **35%→40%**, but it also includes the stronger
    synergy-seeded foes. No body numbers were changed; these results are a candidate owner queue.
- Do **not** blindly retune Litigation Lich or Djinn of Deals from the automated boss policy. Dakota
  already defeated Lich manually in the full Fundjin win, while the naive/tactical bots still scored
  0%, proving the result is highly policy-sensitive. There is almost no genuine Djinn telemetry yet.
  Hydra is the current observed wall in Dakota's latest run and deserves the next manual scenario
  review before Lich/Djinn number changes.
- **No card, body, boss, encounter, shop, or economy balance values were changed in the
  telemetry or tactile patches.** Dakota will provide balance notes later. Do not wait for them and do not
  infer them.
- The first instrumented mobile tactile pass is shipped. On touch, a quick tap anywhere on a room
  preview—including its large foe chip—chooses the room; holding the foe chip for roughly 360 ms
  opens details and suppresses the release click. Setup presents one Begin Combat action while its
  overlay is open. Draft, room, setup, and deck-move actions now acknowledge the tap immediately
  while the server remains authoritative.
- An unaffordable manual card tap now arms one server-authoritative queued intent. It fires on the
  first tick its live cost is affordable; the same card toggles it off, another card replaces it,
  and any later combat input cancels it. AUTO stays parked while a manual intent is armed. The card
  and moxie rail show a persistent gold `QUEUED` treatment, and queue/cast/cancel telemetry is bounded.
- `ROOM OPTIONS` from setup now returns to the room chooser on the first click. The engine rollback
  was already correct; the client overlay signature had incorrectly treated the restored won state
  as already painted. The earlier handoff was wrong to call this complete: it verified only the
  trailhead path while both owner-facing servers still served the stale client. Corrected proof drove
  the real lifecycle `win combat → choose later room → ROOM OPTIONS once → three choices visible →
  choose another room → begin combat`, then verified the public, local, and tunnel artifacts.
- Boss snapshots now expose resolver-derived intents, actual target IDs, exact Lich stance seconds,
  and bounded structured resolution events. Every authored Hydra/Lich/Djinn deck action names what
  it will do; Lich Annihilate logs the exact direct HP loss and appears in damage telemetry. Defeat
  adds a concise `WHAT JUST HAPPENED` recap before the full log. Four touch clocks use a readable 2×2
  grid; foe tweening cannot cover the banner; four-player friendly summons use compact tactical chips.
- Audit comparison through draft → room choice → setup → combat remains **3 taps / 0 intercepted
  taps / 0 ambiguous states**. The former rejected-card probe is now the queued-card scenario; it
  proves persistent intent and first-affordable-tick resolution rather than a transient rejection.
- Aggregate combat telemetry is implemented, committed, pushed, and live. It records exact
  rolled starter decks; deck snapshots after successful edits, shop buys, and level-ups;
  manual/AUTO casts; draw instances; opening draws; cards held through affordable and
  unaffordable ticks; whole-hand locks; rejected taps; cards stranded at combat end;
  replacement draws that arrived too late to judge; requested/effective/wasted healing;
  overheal converted to shield; shield granted; damage actually stopped; shield resource
  spent; and per-body combat outcomes.
- Starter-deck cut reporting is duplicate-aware and groups by stable run + seat. “Cut ASAP”
  means fewer copies at combat 2 than the exact rolled starter. Room-one deaths are excluded
  because no edit opportunity existed.
- The report deliberately calls end-held cards **stranded evidence**, not “traps.” An uncast
  card can reflect affordability, draw timing, targeting friction, encounter length, deck
  context, or taste. Preserve that distinction.
- Combat metrics are bounded in memory and emitted only at combat start/result; telemetry does
  not write per-tick JSONL. Harness and bot provenance remain separable from genuine human play.
- Verification at `94354cc`: game **2296/0**, squad **28/0**, telemetry **69/0**, fuzz **60/60**,
  and local/public/tunnel serve **43/0 each**. The in-app browser verified the exact post-combat
  later-room rollback, immediate re-selection, and forward progress into combat with zero JS errors.
  Four independent browser clients drove both final 852×393 DPR3 touch captures with **0 JS errors**:
  `tools/shots/scenario-four-player-big-room-2026-07-16T23-01-26` (16 opening foes plus a hectic
  follow-through) and `tools/shots/scenario-four-player-lich-stress-2026-07-16T23-01-40` (four live
  Lich intents plus adds). Queued-card proof is
  `tools/shots/scenario-touch-queued-card-feedback-2026-07-16T23-00-13`.
  The canonical non-injected solo run `tools/shots/real-mobile-2026-07-16T22-56-20` had 0 JS errors,
  0 404s, and no missing art, but exhausted its 180s budget in the known Economy Elemental sustain
  wall (foe stayed 7/7 while shield grew to +40); inspection confirmed ongoing casts, not a queue stall.
- Verification at runtime commit `bab360c`: game **2296/0**, squad **28/0**, telemetry **69/0**,
  fuzz **60/60** full runs, and local/tunnel/Railway serve **48/0 each**. The real 852×393 touch
  scenario used four friendly summons and seven hostile entities: taps on the pinned Earth Elemental,
  the board rat card, and a collapsed hostile group all changed the intended live target. A fresh
  reload produced zero browser errors. Production report rows and the lobby link were inspected at
  852×393 and the report was also inspected at 393×852. This real interaction pass caught and
  fixed an undefined render variable; the report pass caught and replaced misleading post-cleanup HP
  with tracked lowest HP reached. Do not hand off future interaction work without equivalent served,
  owner-path verification.
- Historical verification at runtime commit `8fff3b3`: game **2231/0**, squad **28/0**, telemetry **69/0**,
  fuzz **60/60** full runs with no invariant failures, and local serve **36/0**. The corrected-state
  real 852×393 touch run at `tools/shots/real-mobile-2026-07-16T05-46-39` traversed draft through
  three real combats and a loss in 65 frames with **0 JS errors**, 0 404s, and no missing art. The
  two-client run at `tools/shots/mp-2026-07-16T05-48-33` won both games, passed all room vote/lock
  progression checks, and had **0 JS errors**. Representative combat and co-op result frames were
  visually inspected. The post-rollout public serve suite also passed **36/0**.
- `tools/scenarios/touch-rejected-feedback.json` retains its historical filename but now carries the
  scenario name `touch-queued-card-feedback` and proves immediate queue, persistence while banking,
  and automatic resolution. Do not restore the retired 700ms rejection flash.
- `KEEP_HARNESS=1 bun run tools/telemetry-report.js` successfully renders the new starter-cut,
  card conversion/affordability, sustain, and body-outcome sections from fresh measured combats.
- Dakota reviewed the graphics positively. This is not a visual-redesign mandate; improve visual
  feedback only where it materially improves input confidence, selection state, target clarity,
  reversibility, or transition flow.
- Current content facts for later owner notes: 21 common wearable bodies, 13 elite wearable
  bodies, 80 normal player cards, 1 archived player card, and 6 summon-only cards. Starter offers
  each roll five distinct V1 cards ×2 from the same 20-card V1 pool, now with four archetype-fit
  pairs and one deliberate wild pair.
- **The owner-authored body/boss pass is implemented, verified, pushed, and live in `8fff3b3`.**
  Body changes offer every legal nonnegative integer melee/ranged split whose sum is the unchanged
  `levelCombatBonus(runLevel)`; the server validates it atomically and body changes never rewrite the
  deck or backpack. Hydra, Djinn, and Litigation Lich now draw/discard their exact authored decks with
  one concurrent cast bar per player while retaining existing boss HP scaling. Djinn always uses four
  lanes; false copies mirror real cast bars but resolve no effects; Tornado deals current-floor damage;
  the medium Kitchen attacker is exact 2 HP / 2 damage. Kraken is unchanged.
- Exact owner-card regressions cover Hydra core and recurring effects, Djinn Coercion at ante 9/18/27,
  Duplicity synchronization/no-op casts, Scorch, Tornado entry/stay damage, all Kitchen bodies, both
  Lich stances, and all five updated Lich cards. Snapshot/client state exposes boss draw/discard counts,
  every active cast bar, Hydra's persistent six-second effects, and Tornado lane/damage truth.
- Remaining explicit `FLAG`s: Hydra/Lich/Djinn deck cadence reuses their prior primary clock values;
  Tornado movement reuses the shared six-second interval; Kitchen `very slow`/`medium` map to the
  existing 6s/4s token conventions. These are implementation mappings, not telemetry-derived tuning.
- Verification at runtime commit `67212ac`: game **2265/0**, squad **28/0**, telemetry **69/0**,
  fuzz **60/60**, local serve **41/0**, public serve **41/0**, and **15,000** exact-ante Coercion
  generation probes with no ante/synergy failure. The real 852×393 DPR3 touch run at
  `tools/shots/real-mobile-2026-07-16T20-53-25` traversed draft and two real combats in 48 frames with
  **0 JS errors**, 0 404s, and no missing art. The targeted live scenario at
  `tools/shots/real-summon-layout-2026-07-16T20-53-05` proved front/hero/back depths
  `-0.5 / 0 / +0.5`, full summon information panels, and **0** browser/HTTP errors.

## Next Step

Use `d3bb541` as the verified runtime base. Next, collect genuine two-human production outcomes for
the new Kraken and King before tuning their authored numbers; deterministic tests establish exact
mechanics, not fun or final balance. Continue the owner-led room-count/Hydra review and the isolated
body outliers starting with the Anubis/Fundjin ceiling and Warewolf/Neptune/Audit floor. Production
telemetry is canonical for remote play; use simulations as evidence for questions, never as authority
to change values.
Treat the present interaction identity as a **soft-real-time tactical deckbuilder / party battler**
rather than a dexterity game: preserve quick decisions and queued intent, but continue removing
small moving targets and any advantage gained mainly by frantic input mashing.

## Active Decisions

- **Taste belongs to Dakota.** Telemetry supplies facts and candidate questions; it does not rank
  cards, declare traps, retier content, or override his experienced judgment.
- The balance sheet was delivered in chat for later phone editing. Unreturned lines mean no ruling,
  not approval for autonomous tuning.
- “Balatro-like” means interaction economy and legibility, not copying Balatro’s art, rules, layout,
  or turn structure. Optimize for obvious choices, low tap count, responsive feedback, easy deck
  adjustment, and short transitions within King Mimic’s own real-time combat.
- Keep mechanics symmetric. A UI improvement may expose or explain player/foe truth, but must not
  silently create player-only combat rules.
- There is intentionally no global card cooldown. Do not restore `CARD_GCD`/`cardCd`; affordability,
  hand state, stasis, target requirements, and card rules are the cast gates.
- Stranded draws require at least one eligible observation tick. A replacement card drawn by the
  combat-ending cast is `unexposedEndDraws`, not falsely counted as stranded.
- Shield telemetry keeps two distinct facts: incoming damage stopped and shield points consumed.
  Punishment Glutton can spend 10 shield to stop 5; piercing damage consumes and credits neither.
- Shops remain 5% after the opening trio and are impossible in the first actionable trio. Floor-one
  ante is [7,12] with budget-aware skew filtering. These are shipped owner-feedback changes, not part
  of the tactile pass.
- Enemy Medusa poison is fixed symmetrically at the already-authored values: one poison per ranged
  play, ticking every 6 seconds. Do not retune it without Dakota’s notes.
- **Body-change allocation ruling (Dakota, 2026-07-15):** `levelCombatBonus(runLevel)` remains the
  fixed total grant. On body swap the player may allocate that total between `levelMelee` and
  `levelRanged` in any nonnegative integer split. The server validates the sum; changing bodies never
  creates extra power and does not rewrite the player's cards.
- **Boss deck/action-economy ruling (Dakota, 2026-07-18, superseding 2026-07-15 concurrency):** every
  boss has one authored deck card active at a time. That action captures present-human count when
  drawn and scales its effect, rather than creating one card/bar per player. Existing independent
  core/stance/theft clocks remain separate mechanics. Existing boss HP scaling remains except King's
  explicit 99×players rule. Reuse the shared draw/discard/cast conventions and preserve symmetry.
- **Hyper-Inflation Hydra:** its core mechanic is: every 6 seconds, gain `+1` and summon heads equal
  to its current `+1`s. Deck cards (one authored entry each):
  - `Swarm` — summon `floor` heads every 6 seconds.
  - `Regenerate` — heal `floor × 2` every 6 seconds.
  - `Heads Up` — every time Hydra is damaged, summon `floor` heads.
  - `Inflation` — gain `+1` melee, then summon heads equal to Hydra's current `+1`s.
  - `Bite` — deal melee damage equal to `1 + heads in this lane`.
- **Djinn of Deals:** always use four lanes, including solo. Every card Djinn plays also moves Djinn
  to the back of whichever other lane places it behind the most bodies. Deck cards:
  - `Coercion` — summon a `floor × 9` ante foe.
  - `Duplicity` — summon `floor × 3` false Djinn copies. They look like the real body, are defeated
    by one hit, and visually act as though they cast the real Djinn's spells, but their casts have no
    effects.
  - `Scorch` — deal `floor × 3` to each lane.
  - `Tornado` — summon a tornado in the players' lane area. It moves randomly left/right and back
    again, dealing `floor` damage to players who enter its lane or remain there for 6 seconds.
  - `Animate Kitchen` — summon `floor × 4` random attackers drawn from the authored assortment:
    5 HP / very slow / 1 damage; 2 HP / medium-paced / 2 damage; and 3 HP / 2 damage / very slow.
- **Kleptomaniac Kraken:** four-lane backline; one real draw/used-pile card stolen globally until its
  animated floor×5-HP body dies. Deck: P 8-HP/current-HP tentacles in distinct lanes; floor×3
  Lightning Storm per lane; six-second Barnacle Swarm −damage that ramps +1 each play.
- **King Mimic:** one lane-bound body in four lanes, 99 HP per player, no stance. Deck: Party (P
  exact-ante-14 foes + P 10-HP animated items), Dunk (10×P front melee), Finger Beam (6×P on the
  best hero lane), and Gambit (distinct existing buffs totaling exactly 10 moxie). After every card,
  retreat behind the greatest foe HP+shield screen.
- **Litigation Lich:** retain its stance mechanic, including `1 less from all` and `1 max from all`.
  Replace/update its deck with:
  - `Bone Legjon` — summon `floor × 2` minimum-ante foes.
  - `Power Word: Annihilate` — reduce the highest-HP target to 1 HP.
  - `Eye Beam` — deal `floor × 3` damage to a lane.
  - `Frost Orb` — summon an orb with `floor × 5` HP; it casts Blizzard and has ranged bonus equal
    to the floor.
  - `Life Drain` — deal `floor × 3`; Lich heals that much.

## Landmines

- **Do not perform a balance sweep.** Boss difficulty, direct-damage dominance, utility-card value,
  exact shop rate, starter-pool composition, and all body/card numbers remain owner-design questions.
- **Do not optimize taps by making consequential choices irreversible or invisible.** The desired
  simplicity is confidence and compression, not removal of agency.
- Telemetry is observational but touches central combat paths. Healing-trigger semantics must remain
  unchanged; shield provenance must never mutate authoritative shield state; combat-start/result
  events must remain exactly-once even in ultra-fast fights.
- `telemetry.jsonl` contains mixed historical schemas. The report must tolerate old events. Default
  provenance excludes harness events and bot seats; use `KEEP_HARNESS=1` only when deliberately
  inspecting automated verification data.
- Desktop screenshot verification is unavailable on this laptop because its touchscreen makes the
  harness report touch capability. The canonical visual proof is mobile 852×393 DPR3 touch.
- **Deploy safely:** push first, then bounce only the Bun PID owning `:3000`; leave Cloudflared PID
  `11488` alone or the public URL rotates. Check for real established player sockets before restart.
- **Never `git add -A`.** Numerous untracked owner/probe files must remain untracked: design notes,
  scratchpad, `nul`, live/tunnel logs, and `tools/*.mjs` probes/sim outputs. Stage exact files only.
- Preserve archived `KIT.dBloodIron` while keeping it outside normal `PLAYER_POOL` offers.
- Existing wording/mechanics ambiguities remain owner rulings: Jaw overkill wording, Crystal Ball
  tutoring from discard, and Hedgefund Knight’s baked-in “+1 damage.”
- Do not silently fill boss-design gaps. `Bone Legjon` is preserved with Dakota's authored spelling.
  If implementing Tornado movement, false-copy presentation, kitchen attacker pacing, deck cycling,
  or a cast-bar seam requires a gameplay value not specified above and not already defined by an
  existing shared convention, add a `FLAG` at the definition and report it instead of tuning by feel.

## Pointers

- Run: `bun run server.js`; live report: `bun run tools/telemetry-report.js`; combined verification
  report: `$env:KEEP_HARNESS='1'; bun run tools/telemetry-report.js`.
- Public sim report: `/sim-results.html`; raw matrix: `/combat-sim-results.json`; regenerate both
  matrices with `bun run tools/generate-combat-report.mjs`.
- Test: `bun run test/game.test.js`; `bun run test/squad.test.js`;
  `bun run test/telemetry.test.js`; `bun run test/fuzz.js`; `bun run test/serve.test.js`.
- Real mobile: `node tools/shoot.mjs`. Existing targeted input probes:
  `tools/tap-probe.mjs` and `tools/summon-layout-probe.mjs` are untracked owner/probe files—inspect
  before use and do not stage automatically. Rejected-card visual proof:
  `node tools/scenario-shot.mjs tools/scenarios/touch-rejected-feedback.json`.
- Input/UI: `public/client.js` (combat rendering/input), `public/inventory.js` (setup/deck editing),
  `engine/snapshot.js` (client state projection), `server.js` (messages + telemetry event seams).
- Telemetry: `engine/combat.js` (`beginCombatMetrics`, tick/play/heal/shield accounting,
  `combatMetricsSummary`), `engine/lobby.js` (starter/deck lifecycle), `server.js` (`combat_start`,
  `deck_edit`, `room_result`), `tools/telemetry-report.js`, `test/telemetry.test.js`.
- Content truth for later notes: `engine/bodies.js`, `engine/kit.js` (`TEMP_CARD_VALUE_TIERS`), and
  `engine/cards.js` (`PLAYER_POOL`, archive seam, deck rules).
- Read first: `CLAUDE.md`, this `HANDOFF.md`, and the home-level `AGENTS.md` load order.
