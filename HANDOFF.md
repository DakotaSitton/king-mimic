# HANDOFF — King Mimic — 2026-07-21 21:08 CDT

## State

- **Stockbroking Sphinx's three-choice cycle is live at runtime commit `20e3142`** (CI
  `29884949048`, success; Railway deployment `c0fb66a7-f4ca-47fa-a087-610393884037`, `SUCCESS`;
  production serve **105/0**). It remains a 14-HP Tier III elite. Every 12 seconds a human wearer
  chooses an available branch: heal the ally target for 12 plus ranged bonus, deal 12 plus ranged
  bonus to the aimed target, or bank up to 12 moxie—including two spendable moxie above the ordinary
  cap of 10. A chosen branch disappears until the other two have been used; completing all three
  refreshes the full set. Invalid, stale, and already-locked choices cannot consume the pending
  decision. Ordinary capped moxie gains preserve rather than erase this overflow, and card payments
  spend directly from the over-cap bank. Mastery still shortens the next clock by one second per
  used option, floor six seconds. Specialty adds +2/rank to every branch, including the moxie ceiling.
  Autonomous foe/squad copies prefer Deal whenever available, then use Heal and Moxie in remaining
  order (explicit **FLAG**: Dakota did not author the autonomous policy). Enemy threat bars now
  truthfully switch from damaging Deal to green Heal and gold Moxie as that cycle locks.

  Verification: core **3138/0**, onboarding **202/0**, expansion **354/0**, art **289/0**, animation
  **140 cards**, causal body matrix **462/0**, symmetry **34/0**, persistence **47/0**, public entry
  **23/0**, owner lab **13/0**, telemetry report **10/0**, local+production serve **105/0**, and fuzz
  **60/60** (three known sustain-wall stalls abandoned). A real local browser scenario visibly
  reduced the full Heal/Deal/Moxie hand picker from three options to two after Deal and then only
  Moxie after Heal; the Knowledge Book showed the exact new rule, with zero browser errors. CI's
  fresh-server serve and fuzz stages also passed. Per Dakota's durable rule, no combat report was
  generated or rerun; `public/combat-sim-results.json` is untouched. Existing three foe-SVG edits
  and all scratch/probe files remain untouched and uncommitted.
- **The five-body economy elite batch is live at runtime commit `87a4ac6`** (CI `29877085105`,
  success; Railway deployment `c97233c4-4c16-49c8-83af-d06c5a4ce1d3`, `SUCCESS`; production serve
  **104/0**). One-Percenter Cyclops is now displayed as **Credit-Cursed Cyclops** while retaining its
  internal key for save compatibility. New wearable foes are Tier I **Bankrupt Barghest** (its landed
  melee attacks permanently mark that target for +1 damage from that Barghest's later melee), Tier I
  **Recession Revenant** (its first lethal event leaves it active for six seconds; a kill revives it
  to full HP, once/combat), Tier I **Shortscerer** (DR 1 while queuing a live-cost-6+ ranged or summon
  card), Tier II **Calling Caltist** (ranged costs above 5 can use 5 moxie plus 2 nonlethal HP per
  missing moxie), and Tier III **Sales Sage** (ranged card costs are halved, rounded up). Oligarchy
  Ooze now visibly reports both its waiting-to-steal state and held stolen card in combat, and its
  full passive is visible in the Knowledge Book. The Book is now **46 bodies / 118 live cards**, with
  tier-then-alphabetical ordering intact and all five new portraits live. Because Dakota did not
  author HP, colors, Masteries, or Specialties, those choices are explicitly FLAGged review defaults;
  Caltist's nonlethal health rule and Sales Sage's rounding are also reviewable interpretations, not
  silent canon. Verification: core **3115/0**, onboarding **202/0**, expansion **354/0**, art
  **289/0**, animation **140 cards**, causal body matrix **462/0**, symmetry **34/0**, persistence
  **47/0**, public entry **23/0**, owner lab **13/0**, local+production serve **104/0**, and fuzz
  **60/60** (three known sustain-wall stalls abandoned). Local and deployed 852x393 touch lifecycles
  completed with zero JS/404/missing-art failures; deployed browser proof independently confirmed 46
  sorted bodies, exact new/Ooze copy, loaded art, and zero app errors.

  Dakota explicitly ruled that combat reports must **not** be generated or rerun unless he asks.
  `public/combat-sim-results.json` therefore remains the untouched 2026-07-21 57,400-fight historical
  artifact for the former 41-body roster. Its “One-Percenter Cyclops” row is the body now named
  Credit-Cursed Cyclops; these five new bodies correctly have no rows. The controlled matrix used one
  each of Sword, Hatchet, Spear, Bow, Dagger, Fire, Lightning, Wind, Arcane, and Holy. The authored
  starter matrix rerolled a body-compatible five-card kit for every trial and duplicated each card,
  but the artifact stores aggregates rather than the 16,400 individual deck lists. Do not claim those
  exact per-fight choices are recoverable from the JSON, and do not regenerate the report to obtain
  them. Existing three foe-SVG edits and all scratch/probe files remain untouched.
- **One-Percenter Cyclops is live at runtime commit `f455c3e`** (CI `29872637030`, success;
  Railway deployment `72a11fbf-e949-4f84-8b40-969ce4a91b5b`, `SUCCESS`; production serve **99/0**).
  This new Tier II melee elite has 9 HP, innate +3 melee/-3 ranged damage, and makes every card the
  wearer plays cost 1 more (capped at 10). Enemy Cyclops loadouts cannot contain ranged or dual-kind
  cards: the same eligibility predicate governs base gear, passive-support substitutions, richer
  upgrades, injected/scenario loadouts, and combat-queue fallback. Players can still own and play
  ranged cards while wearing it. The Knowledge Book now reports **41 bodies / 118 live cards**, with
  Cyclops correctly alphabetized inside Elite II. The generated one-eye portrait, 9 HP, tan color,
  Mastery (+4 innate melee instead of +3), and Specialty (+1 starting moxie/rank, cap 10) are
  deliberately FLAGged owner-review defaults because Dakota did not author those chassis/upgrades.
  Verification: core **3065/0**, onboarding **202/0**, expansion **354/0**, art **289/0**, animation
  **140 cards**, causal body matrix **412/0**, symmetry **34/0**, persistence **47/0**, squad **28/0**,
  telemetry **93/0**, public entry **23/0**, owner lab **13/0**, local+production serve **99/0**, and
  fuzz **60/60** (two known sustain-wall stalls abandoned). A fresh deployed 852x393 touch run reached
  `draft -> won -> setup -> playing -> lost`, cleared one node, and had zero JS/404/missing-art
  failures (`tools/shots/real-mobile-2026-07-21T22-08-46`); production browser proof independently
  confirmed the full book entry and zero app console errors. The refreshed 57,400-fight artifact puts
  Cyclops at **48.8% fixed / 62.0% authored starter** (0/3 stalls); no owner numbers were silently
  tuned. Existing three foe-SVG edits and all scratch/probe files remain untouched. Freeze runtime
  `f455c3e`; this new body resets ordinary Gate 1 alpha evidence to **0/8** pending fresh human runs.
- **Piercer + owner weapon corrections are live at runtime commit `6ef68a2`** (CI `29869476733`,
  success; Railway deployment `5ec79ab2-4b7a-47a9-b271-20a8eda9f1e0`, `SUCCESS`; production serve
  **98/0**). Masters Arm Spear now deals 6 to exactly the front foe and one foe behind it
  (`front2`, symmetric for heroes/foes), replacing its former three-foe sweep. Guillotwine Axe now
  deals **7 immediately and 7 again after six seconds**, preserving overflow on both strikes. New
  **Piercer is V3/M9 melee**: deal 9, ignore all defensive effects, trigger no reactions, and spill
  excess down the lane. Piercing overflow now truthfully treats an ignored shield as zero stopping
  power, and foe-held front-overflow cards now traverse the unified hero/summon line just like the
  player path; both corrections have direct hero/foe tests. The live pool/Knowledge Book is now
  **118 cards**, with Piercer explicit art (`lorc/piercing-sword`). Verification: core **3052/0**,
  onboarding **202/0**, expansion **354/0**, art **289/0**, animation **140 cards**, body-passive
  matrix **402/0**, symmetry **34/0**, persistence **47/0**, squad **28/0**, telemetry **93/0**,
  public entry **23/0**, serve **98/0**, and fuzz **60/60** (two known sustain-wall stalls abandoned).
  Current-head local 852×393 touch play reached `draft → won → setup → playing → lost` with non-empty
  hero/foe/hand/HUD frames and zero JS/404/missing-art errors
  (`tools/shots/real-mobile-2026-07-21T21-16-27`). Local browser proof independently confirmed the
  118-card count, Piercer V3/M9 text/art, two-body Spear copy, 7-damage Guillotwine copy, and zero
  console errors. The fresh deployed lifecycle then cleared two real rooms through
  `draft → won → setup → playing → won`, again with zero JS/404/missing-art failures
  (`tools/shots/real-mobile-2026-07-21T21-20-20`); production browser proof confirmed the same
  118-card catalog and weapon copy with zero console errors. Existing three foe-SVG edits and all
  scratch/probe files remain untouched.
- **Dakota's melee-body batch is live at runtime commit `8c25114`** (CI `29868662508`, success;
  Railway deployment `7ea882ec-361a-4a17-a1b4-270f709efc1d`, `SUCCESS`; production serve **98/0**).
  Killionaire remains a Tier III elite—not a cost-3 adoption—and now opens each combat with a
  six-second double-moxie rush; a kill during the window restarts it and grants +1 damage. Its
  Mastery makes the rush permanent and upgrades each successful six-second window to +3 damage;
  Specialty starts with 2 moxie/rank (cap 5). Economy Elemental no longer regenerates moxie
  normally: it gains 10 every six seconds; Mastery starts with 5 and Specialty advances only the
  first pulse by one second/rank (cap 6). New bodies: Tier II GDP Giant (12 HP; DR 2 while a live
  cost-6+ melee is queued), Tier I Hedgefund Knight (10 HP; six-second shield/melee conversion), and
  Tier III Veteran of the Psychic Wars (9 HP; melee can aim at any foe and gains +1 damage per two
  moxie cost). The retired Hedgefund Knight card stays loadable for old saves but is absent from all
  normal offers. The Knowledge Book now reports **40 bodies / 117 live cards**, puts Killionaire and
  Veteran in Elite III, and explains that moxie only *normally* charges each second.

  Dakota's new soft design law is durable: body Masteries and Specialties should be custom support
  for that body's own passive. Because he specified that law but not the three new bodies' exact
  upgrades, these are deliberately FLAGged owner-review defaults: GDP Mastery counts any held/queued
  qualifying melee and Specialty adds 1 DR/rank; Hedgefund Mastery shortens the pulse to five seconds
  and Specialty adds 1 extra output/rank; Veteran Mastery also adds ranged bonus to melee and
  Specialty adds 1 cross-lane melee damage/rank. Placeholder body HP/art choices are likewise
  reviewable. Causal coverage is green for base/Mastery/Specialty on hero and foe: **402/0** across
  all 40 bodies. Verification: core **3046/0**, onboarding **202/0**, expansion **340/0**, art
  **287/0**, animation **139 cards**, symmetry **34/0**, persistence **47/0**, current-head serve
  **98/0**, and real two-client multiplayer smoke green. The refreshed 56,000-fight artifact shows
  Hedgefund Knight as a likely high outlier (**80.2% fixed / 87.0% starter**) and GDP Giant as weak
  (**43.5% / 45.5%**); no owner numbers were silently tuned. Deployed browser proof independently
  confirmed the moxie Basics wording, all five requested body entries/upgrades, 40/117 totals, and
  removal of the old Hedgefund card from the live catalog. These mechanics reset ordinary Gate 1
  alpha evidence to **0/8** until this deployed build gets fresh human runs. Existing three foe-SVG
  edits and all scratch/probe files remain untouched and uncommitted.
- **Dakota's four-card weapon batch is live at runtime commit `155a370`** (CI `29863910670`,
  success; Railway deployment `8514b517-4c21-4b85-91ca-52be99363b91`, `SUCCESS`; production serve
  **95/0**). The live pool now has **118** cards. Lightspeed Lashwhip is V5/M1 lane-wide melee;
  Guillotwine Axe is V4/M8 front overflow plus one six-second repeat; Wars Eternity is a V5/M9
  fight-long immediate/six-second melee-and-matching-shield engine; Masters Arm is V4/M7 with a real
  server-authoritative Rapier/Spear/Staff picker. The shared combat target grammar now supports
  `front3` for heroes and foes, and all damage summaries, enemy intent/scope, target telegraphs, the
  Knowledge Book, and four generated SVGs consume the same authored data. Exact local browser proof
  opened the three-option picker and chose Spear against four live foes: exactly the front three lost
  6 HP, the fourth stayed untouched, and the browser logged zero warnings/errors. Verification:
  core **3026/0**, onboarding **202/0**, expansion **339/0**, art **287/0**, animation **139 cards**,
  symmetry **34/0**, entry **23/0**, persistence **47/0**, local and production serve **95/0**; all
  four production SVGs return 200. Existing three foe-SVG edits and scratch/probe files remain
  untouched and uncommitted.
- **The landing-page Knowledge Book and Medusa poison-icon repair are live at runtime commit
  `89ad082`, with tier ordering live at `f12f57f`** (CI `29850346776` and `29854899952`, success;
  Railway deployments `0f400603-b645-40ce-b291-7a26c2f81d49` and
  `d81ffa57-5b77-4d03-bdd8-3d3d5bea88da`, success; production serve **95/0**). The initial landing
  page now opens an accessible, searchable four-tab book sourced from the same authoritative engine
  tables as live play: six compact gameplay steps, all **37** wearable bodies with base HP/passive/
  Mastery/Specialty, all **114** live player cards with cost/effect/value/targeting details, and all
  **5** bosses with HP scaling, cadence, rules, and action decks. The JSON catalog is exposed at
  `/knowledge.json` and has regression coverage proving that every live roster entry is present.
  Bodies are ordered Common → Elite I → Elite II → Elite III, alphabetically inside each tier;
  cards are ordered value tier 1 → 5, also alphabetically inside each tier.
  Medusa poison previously carried its source card key into status presentation, so Fire could win
  over the poison glyph; poison now carries explicit poison metadata and renders as a small green
  skull with its stack count. Exact 852×393 production interaction proved the full-screen dialog,
  six basics, 37-body catalog, 114-card catalog, five boss entries, internal vertical scrolling, no
  horizontal overflow, and zero browser warnings/errors. The deployed real lifecycle reached
  `draft → won → setup → playing → lost`, cleared one node, and had zero JS/404/art failures
  (`tools/shots/real-mobile-2026-07-21T16-51-31`). Verification: core **3001/0**, onboarding
  **202/0**, expansion **290/0**, art **279/0**, animation **3/0**, passives **372/0**, squad
  **28/0**, telemetry **93/0**, telemetry-report **10/0**, symmetry **34/0**, persistence **47/0**,
  entry **23/0**, owner lab **13/0**, itch package **11/0**, name-safety **10/0**, serve **95/0**
  local+production, and fuzz **60/60** (one known sustain-wall stall abandoned). Existing foe SVG
  edits and scratch/probe files were preserved untouched.
- **Mobile map touch lifecycle is repaired and live at runtime commit `21c6f7e`** (CI
  `29847822147`, success; Railway deployment `87410e55-8686-46f1-b974-535ff0f3276f`, success;
  production serve **85/0**). The prior implementation destroyed and recreated every map-node DOM
  button on each live render, so a normal finger could press one node and release after that element
  had already been detached. Map nodes now retain identity across unchanged snapshots and resolve
  inspection against the latest authoritative state. The underlying map is inert while room intel is
  open, **CLOSE ×** and **← MAP** are distinct 76×44 and 68×44 CSS-pixel targets, and the intel sheet
  begins below both controls. A new real-touch regression holds a press through twelve state callback
  refreshes, verifies one intel sheet, Back-to-same-map, one-touch Close from inside intel, a second
  open/back/close cycle, and successful room entry; it runs in CI on a fresh headless Chrome server.
  Exact 852×393 local and production browser proof found stable node identity, 17 map nodes, separate
  foe icons/levels, correctly blocked background input, zero render/browser errors, and forward
  progress into setup. Verification: core **3000/0**, onboarding **202/0**, expansion **290/0**, art
  **279/0**, animation **3/0**, passives **372/0**, squad **28/0**, telemetry **93/0**,
  telemetry-report **10/0**, symmetry **34/0**, persistence **47/0**, entry **23/0**, name-safety
  **10/0**, serve **85/0** local+production, mobile touch lifecycle local+production, and fuzz
  **60/60** (one known sustain-wall stall abandoned). Existing foe SVG edits and scratch/probe files
  were preserved untouched.
- **Dedicated mobile map + immediate-room intel is live at runtime commit `c41ffd9`** (CI
  `29841011199`, success; Railway deployment `88bf698c-0c39-4ddc-8226-ebbc4caa9e3a`, success;
  production serve **85/0**). On touch screens the level map no longer occupies a permanent 38%-wide
  rail beside the three actionable rooms. A compact **Open map** button now opens a full-screen,
  connector-free floor surface; Close returns to the chooser, and a room tap opens full-width perfect
  information with a distinct Back-to-map action. Every seeded foe is rendered separately as body art
  plus its own `LvN` label, so multi-foe rooms cannot collapse into one icon/count. The three immediate
  room cards use the recovered width for body, level/HP, every named carried-card drop, and the random-
  common count while retaining threat and total possible-loot value. Exact 852×393 fresh local and
  deployed runs both reached the first-room chooser; production measured 15 combat nodes, 15 rosters,
  15 portraits/levels in that seeded floor, the Hydra boss, stable far-future and boss inspection,
  and zero browser warnings/errors. Verification: core **3000/0**, onboarding **202/0**, expansion
  **290/0**, art **279/0**, animation **3/0**, passives **372/0**, squad **28/0**, telemetry **93/0**,
  telemetry-report **10/0**, symmetry **34/0**, persistence **47/0**, entry **23/0**, name-safety
  **10/0** (Node invocation; Bun's Edge transport hit its 20s launch watchdog twice), serve **85/0**
  local+production, and fuzz **60/60** (two known sustain-wall stalls abandoned). Existing foe SVG
  edits and all scratch/probe files were preserved untouched.
- **Dynamic room-composition generation is live at runtime commit `5a8f234`** (CI
  `29800308481`, success; Railway deployment `cedb2be5-aef9-43be-b723-063fa7ec4c0b`, success;
  production serve **85/0**). The five room skews are now statistical biases, never hard exclusions.
  Every non-opening room first rolls enemy concentration, divides its actual threat budget unevenly,
  then independently spends each share across level points, better three-card gear, and affordable
  elite-body premiums. Swarm tends numerous, veteran tends fewer/higher-level, arsenal tends richer
  gear, bodies strongly favors elites, and mixed stays central—but every bias can combine every axis.
  The first floor-1 choice remains the intentional common/L1/basic trio. Seeded solo populations now
  produce level-2+ foes in **45.4% / 71.0% / 84.1%** of later floor 1/2/3 rooms, rich gear in
  **66.6% / 87.8% / 94.3%**, and elites in **16.4% / 26.1% / 36.3%**. Floor 2/3 both retain
  crowded weaker rooms and compact brutal rooms; no generated room overspends or hides a whole legal
  foe of unreported ante. `room_result` telemetry now records exact foe level/allocation and room
  skew; the report audits level distribution plus actual count/level/rich/elite outcomes by bias.
  Historical telemetry did not include foe level, so old-run level frequency cannot be reconstructed.
  The production 852×393 real lifecycle reached `draft → won → setup → playing → lost` with zero
  JS/404/art failures (`tools/shots/real-mobile-2026-07-21T04-07-18`); click-to-inspect production-
  shaped proof showed basic, leveled+geared, and elite+geared future rooms with no browser warnings.
  Verification: core **3000/0**, onboarding **202/0**, expansion **290/0**, art **279/0**,
  animation **3/0**, passives **372/0**, squad **28/0**, telemetry **93/0**, telemetry-report
  **10/0**, symmetry **34/0**, persistence **47/0**, entry **23/0**, name-safety **10/0**,
  serve **85/0** local+production, fuzz **60/60** (one known sustain-wall stall abandoned).
  Latest owner-run read: Moneymancer went 14/15 fights with a 4/4 Arcane Storm conversion but too
  many stranded expensive draws; Royal Rat went 12/13 and cleared Lich+Kraken, but all six points in
  Specialty left 6 HP while Power Word Gun cast 0/8; three Runeblade 1–1 starts are too little data
  for a body verdict. Next honest action is fresh ordinary play on this deployed generator.
- **Perfect-information map pass is live at runtime commit `ee26f8d`** (final code head `49c23c8`;
  CI `29795914384`, success; Railway deployment `fbbffd03-1d29-4df9-8681-11fb8f3ce756`, success;
  production serve **85/0**). The mobile map is now
  a connector-free icon grid: all 15 combat rooms plus the boss portrait are visible at rest, and
  every node is inspection-only so curiosity taps cannot commit a path. Tapping any past/current/
  future room opens its exact threat, possible-loot value/model, bodies, levels/HP, passives, carried
  cards, and authored card text. The boss node exposes seeded identity, party/floor-scaled HP,
  persistent rule, full action deck with resolver-derived outcomes/cadence, and guaranteed rare-card
  count. The three actionable room cards again show `◈N loot` while mobile still hides their inline
  deck/stat clutter. Exact 852×393 browser proof measured **17 inspectable nodes, 15 body rosters,
  0 connectors, 3/3 visible loot values, 0 visible room decks/stats**, inspected a far-future room
  and Litigation Lich, and logged no warnings/errors. The production real lifecycle reached
  `draft → won → setup → playing → lost` with zero JS/404/art failures
  (`tools/shots/real-mobile-2026-07-21T02-29-20`). Verification: core **2979/0**, onboarding
  **202/0**, expansion **290/0**, art **279/0**, animation **3/0**, passives **372/0**, squad
  **28/0**, telemetry **90/0**, symmetry **34/0**, persistence **47/0**, entry **23/0**,
  name-safety **10/0**, serve **85/0**, fuzz **60/60** (one known sustain-wall stall abandoned).
- **Keyboard/mobile-map interaction batch is live at runtime commit `cb960e0`** (handoff head
  `b6b94ee`; CI `29787034565`, success; Railway deployment
  `88e6a9c0-c0ec-42d5-8077-d1df0e28f844`, success; production serve **84/0**). Desktop
  combat hand slots visibly advertise and accept `1`, `2`, and `3` (top-row, numpad, and key-value
  fallback). The lane-arrangement picker is spatially ordered Left / Reverse / Right while preserving
  the existing lane semantics. On touch/mobile, the complete between-room floor map is visible beside
  the room choices, labels every combat room with body art only, names the boss, and suppresses
  item/deck/stat/loot clutter. Exact 852×393 browser proof exercised all three number keys and found
  15/15 combat-room body rosters, the boss label, zero item labels, and no JS errors. The canonical
  production lifecycle cleared two rooms in 20 frames with zero JS/404/art failures
  (`tools/shots/real-mobile-2026-07-20T23-24-06`). Production DOM proof at exact 852×393 found
  15 body rosters, zero item labels, the Hydra boss label, and no visible room deck/stat/loot/legend
  clutter. Verification: core **2974/0**, onboarding
  **202/0**, expansion **290/0**, art **279/0**, animation **3/0**, passives **372/0**, squad
  **28/0**, telemetry **90/0**, symmetry **34/0**, persistence **47/0**, entry **23/0**,
  name-safety **10/0**, serve **84/0**, fuzz **60/60** (three known sustain-wall stalls abandoned).
- **Owner shakedown-two repair is live at `66034e4`** (CI `29769506152`, success; Railway
  deployment `86a3ae39-190b-40ac-91b7-3c3bef3dce78`, success; production serve **82/0**). Kraken clear-
  lane melee now resolves own-lane blocker → living backline boss → ordinary cross-lane breach,
  with a production-shaped stolen-Triblade regression. Hydra is a four-lane backline fight: generic
  Core/Swarm/Inflation heads roll independently random lanes, Heads Up grows the attacking lane, and
  each lane merges heads into one HP-backed four-second combined bite. The failed owner fight was
  reconstructed at 852×393 from its real level-10 Minotaur/deck state; eight heads rendered as four
  explicit 3/2/1/2 stacks with zero JS/render errors. The old fight's 109 head deaths and 234 separate
  attacks are preserved in `OWNER_RUN_LOG_2026-07-20.md` as pre-freeze evidence, not Gate 1.
- A secret-gated owner lab is integrated: the fragment link `#ownerLab=<KM_OWNER_LAB_KEY>` is scrubbed
  immediately, authenticates only room creation, opens deterministic `OWNERLAB`/`LAB00001` rooms,
  visibly offers all 37 wearable bodies with real starter decks, and then uses normal run persistence.
  Missing/wrong/weak credentials remain ordinary three-offer rooms and join cannot promote a room.
  Lab events are tagged `source=owner_lab` and excluded from public telemetry reports by default.
  Local real-network/restart auth is 13/0; in-app 852×393 proof selected Atlas and reached the normal
  first-room chooser with no browser warnings/errors. Generate/set a >=24-character production
  `KM_OWNER_LAB_KEY`; never commit it. Production has a generated 64-hex key configured, and a real
  WSS trust-boundary probe created `OWNERLAB` with 37 choices and then explicitly left.
- The current candidate's same-seed automated baseline has been regenerated at 1,000 solo + 1,000
  duo in `BALANCE_BASELINE_2026-07-20.md`. It remains bot-policy structural evidence, not authority to
  tune. Both July 20 owner runs forced code changes and remain pre-freeze shakedowns; after final
  production verification, the next honest public-alpha action is ordinary Gate 1 run 1 of 8.
- Integrated verification: core **2974/0**, owner lab **13/0**, persistence **47/0**, passives
  **372/0**, symmetry **34/0**, onboarding **202/0**, expansion **289/0**, art **279/0**, telemetry
  **90/0**, entry **23/0**, serve **82/0**, fuzz **60/60**. Independent adversarial review returned
  **SHIP**. Low residual: a fight persisted mid-Hydra from the pre-stack build retains its independent
  old head entities until that fight ends; every newly entered fight uses stacks.
- **The owner-run-one repair batch is pushed and production-verified at `15b3588`** (Railway
  deployment `4c5b6831-f55c-4f36-b72c-75ec36a4449f`, `SUCCESS`; CI run `29760375134`, success).
  Live foe support casts now choose the highest current-ante living
  friendly target (including self, stable lane/front tie order, never dead/opposing bodies), with a
  live Haste regression and **34/0** focused symmetry assertions. This closes the prior compensation-
  campaign blocker where the resolver supported ally buffs but `foeCast` always self-cast them.
- Bankrupt Basilisk Specialty is capped at one rank and cannot reduce its passive below two moxie.
  Mastery + maximum Specialty now gives 2 lane poison per 2 moxie, causally proven for heroes and
  foes. Restored v1 active runs normalize the retired rank 2 to rank 1 in place, preserve cyclic/
  shared graph identity and unrelated allocations, and expose exactly one finite unspent point;
  persistence is **47/0** and body-passive coverage is **372/0**.
- King Mimic now has a visible 84×48 battlefield body beside two throne adds before and after
  retreat. Completed-run NEW RUN and Leave to lobby are equal centered full-width actions; NEW RUN
  reaches a fresh draft and Leave explicitly clears the fixed victory overlay before exposing the
  lobby. Exact 852×393 scenarios are JS-clean at `tools/shots/scenario-boss-readability-king-mimic-
  2026-07-20T16-23-38` and `tools/shots/scenario-run-complete-exit-2026-07-20T16-23-51`.
- Active production runs now snapshot to `KM_DATA_DIR/active-runs.v8` at a bounded cadence and restore
  exact Map/Set/cyclic/shared state, reconnect tokens, combat state, and monotonically advancing IDs
  across graceful restarts. Railway has a READY 500 MB volume at `/var/data`; local exact
  restart/reconnect/forward-progress verification is **43/0**, including IDs above 50,000. The first
  actual Railway deploy-survival proof remains owner run 8; this rollout cannot retroactively save
  rooms created by the previous server. Incompatible future snapshot versions currently fail closed
  but are not quarantined before a later flush, so schema v2 must add migration/quarantine.
- The public-alpha protocol is locked in `PUBLIC_ALPHA_PROTOCOL.md`: automated baseline already ran
  1,000 solo + 1,000 duo on the repaired mechanics. The July 20 Basilisk throne victory is retained
  in `OWNER_RUN_LOG_2026-07-20.md` as a valuable **pre-freeze shakedown**, not Gate 1 run 1, because
  it forced gameplay/client changes. After the repaired commit is deployed and frozen, next are
  exactly 8 owner runs, then 15 fresh-stranger sessions in three five-session cohorts (22 strangers
  total), then 50 qualified itch storefront visitors.
  One genuine stranger payment through the live payment surface achieves the first compensation
  goal; friend/survey payments do not count. The current simulator produced 0 throne clears and is
  structural bot-policy evidence only—not a human difficulty estimate. The old “89.9% floor-one
  death rate” statement was false and must not be repeated.
- `PASSIVE_TRIGGER_AUDIT_2026-07-20.md` traces all 14 bodies / 16 upgrade rows that affect recurring
  passive cadence. No other balance was changed without Dakota's authorship. Highest-risk follow-ups
  are Timeshare's reachable 3-second service/attack alignment, Ooze's dead ranks above its 10-moxie
  ceiling, and Moneymancer rank 7 making every current ranged card free with later ranks dead.
- `distribution/itch/index.html` + `tools/build-itch.mjs` produce a deterministic donation launcher
  (`artifacts/itch/king-mimic-itch.zip`, **11/0**) with `source=itch`; the telemetry report can filter
  starts/first combats/ends/replays via `bun tools/telemetry-report.js --stdin --source itch` (**6/0**).
  Dakota still owns itch page copy/images, suggested donation, payment provider, revenue share,
  visibility, and desktop/phone restricted preview. HTML5 donation is the viable initial payment
  surface; fixed paid access would require a downloadable product.
- Final-head local verification: core **2943/0**, onboarding **202/0**, expansion **289/0**, art
  **279/0**, animation **135 live cards**, passives **372/0**, squad **28/0**, telemetry **90/0**,
  fuzz **60/60** (one known sustain-wall stall), symmetry **34/0**, entry **22/0**, persistence
  **47/0**, report **6/0**, itch **11/0**, admission **13/0**, name-safety **10/0**, serve **81/0**.
  The final-head 852×393 solo lifecycle had no JS/404/art failures (`tools/shots/real-mobile-
  2026-07-20T16-28-32`); multiplayer completed two co-op wins with zero JS errors (`tools/shots/
  mp-2026-07-20T16-30-16`). Its printed warning remains the known unevaluated `both private picks
  accepted` marker (`—`), not a failed assertion. Independent merged-diff review returned **SHIP**
  with no blocker or medium-severity finding. Production serve is **81/0** and the deployed
  lifecycle reached draft → won → setup → playing → lost with no JS/404/art failure (`tools/shots/
  real-mobile-2026-07-20T16-38-15`). The only low review residual is that Leave to lobby has manual
  causal browser proof plus a committed source regression, while NEW RUN additionally has a
  committed causal scenario.

- **The dead-code purge / resolver-unification / render-backstop batch shipped in `07f9840` (+ docs
  `29a3f77`) and is live + production-verified on Railway.** The stock/greedy foe-offer phase and the
  legacy chooseClass path are DELETED end-to-end (lobby, server WS cases/aliases, snapshot projection,
  client screen/driver/demo fixture, tests — no stubs remain; draftPick is the one draft route; the
  warrior/rogue/mage/cleric class bodies survive only as inert game.test fixtures). `test/fuzz.js` now
  fuzzes the LIVE lifecycle (random wheel-bundle draftPick → rooms → combat → loot/level → descend,
  per-run reached-playing guard) instead of the retired classes and dead stock/shop branches.
  RICH_ITEM_POOL and RARE_POOL carry an ARCHIVED_PLAYER_CARDS guard plus 3 regression tests (owner
  ruled 2026-07-19). resolveOps: ~28 duplicated verb bodies unified to single dispatch sites; every
  pre-existing hero/foe divergence is preserved verbatim and marked `ASYMMETRY (pre-existing,
  preserved 2026-07-19)` — **12 items, an OWNER LEDGER (grep engine/combat.js); do not resolve
  unprompted** — and an unhandled op now clogs loudly instead of silently no-opping on one side
  (proven non-spurious across all 249 cards × 37 bodies × both sides). Client: a mid-draw render
  exception can no longer blank the board — clearRect is gated, the last good frame freezes under a
  small banner with once-per-distinct-error logging, and recovery repaints clean (proven empirically
  with an injected throw, 12/12 pixel probes); `artStem()` follows alias chains, killing the
  iceling→frostOrb.svg 404 (file never existed); the unreachable 217-line legacy foe block,
  renderStock, and drawTornadoHazardsLegacy are gone (client.js −292 lines). snapshot.js computes
  foeThreats once per entity per tick. Docs: truthful README (the stale-lie banner era is over),
  accurate package.json description, .gitignore swallows *.out/*.err/playtest-shot dirs/artifacts and
  the untracked-by-design harnesses, five self-declared-stale docs → docs/archive/. Net −800 lines.
- Verification for `07f9840`: core **2932/0**, passives **370/0** (37 bodies), squad **28/0**,
  telemetry **86/0**, fuzz **60/60** live-lifecycle (plus a 120-run shakeout), onboarding **202/0**,
  expansion **289/0**, card-art **279/0**, animation green, baber/clock green, name-safety **10/0**
  (run it under node — Playwright launch fails under Bun on this machine), admission **13/0**, serve
  **71/0**. Real solo 852×393 lifecycles ×2 with **JS errors: 0** (`tools/shots/
  real-mobile-2026-07-19T23-54-35`); mp co-op both games won, **JS errors: 0**
  (`tools/shots/mp-2026-07-19T23-56-15`; the harness's ⚠ banner traces to its
  `draftBothPicksAccepted: null` check — unevaluated, not failed). Production lifecycle on the
  deployed build: `draft → won → setup → playing`, exit 0, **JS errors: 0**, hero/foe/hand/HUD
  visually verified (`tools/shots/real-mobile-2026-07-20T03-58-55`).
- ⚠ **Local :3000/tunnel NOT bounced** (Bun PID 44292 still serves the pre-batch engine; Cloudflared
  PID 11488 preserved): the working tree holds ANOTHER AGENT'S uncommitted in-flight slice
  (engine/leveling.js, LEVELING_AND_ELITE_TIERS.md, public/style.css, test/baber-summons.test.js,
  test/serve.test.js — Fat Cat merged-stack wording + tests, plus 3 modified public/foes/*.svg), and a
  bounce would boot that unverified engine edit into the live server. Bounce at that slice's own
  commit seam.
- Leftovers from this batch, in priority order: `tools/sim50.js` is dead (drove runs via the deleted
  chooseClass/stock API — supersede or archive); `test/e2e.js` still scripts the deleted stock/shop
  lifecycle (stale by standing note); index.html retains stock-era CSS shared with live
  `.stock-begin` buttons plus 3 comment mentions; `bonusLabel`/`wrapLines` in client.js are newly
  orphaned; `reopenDraftForJoin` still whitelists the unreachable "stock" phase (harmless).

- **The opening-room/economy/passive/clarity batch shipped in `3c91eb6` and is live on Railway plus
  the preserved Cloudflare tunnel.** Every floor-one opening choice is now combat against one level-1
  common/base body per party body, carrying exactly three value-1 common cards. Every defeated body
  drops its carried cards plus two random commons; level and elite-body value still materialize as
  treasure. The solo opening therefore previews and pays exactly ◈5, and the real clear immediately
  funds level 2. Shops are absent from map generation, snapshots, client UI, and server commands.
  Room effects are not generated, rendered, rewarded, timed, or allowed to change foe card costs.
- Killionaire now gains exactly 1 moxie for each legitimate defeat it causes. Depression Demon adds
  +2 magnitude to every debuff, Specialty adds +1 magnitude per rank, and Mastery doubles finite
  debuff duration; poison, slow, weakness, vulnerability, lane weaken, sap, stasis, and Pet Leech
  share the same symmetric hero/foe seam. Djinn Duplicity resets stale targeting of the known real
  body, and public snapshots/projected lane entities expose identical HP, shield, buffs, statuses,
  trackers, and cast timers for real and false Djinns. The client no longer paints a unique real-body
  lane marker or lets the command deck reveal the authoritative target id.
- Completed throne runs now have two unobstructed exits: NEW RUN uses explicit `restartRun`, and
  Leave to lobby uses the existing seat-drop path; `map-top` no longer sits above the victory modal.
  A live throne scenario clicked NEW RUN from `won` and reached a fresh `draft`. Summon cards now state
  placement, HP, moxie cadence/cost, damage/targets, special rules, lifetime, and circulation; Tornado
  and the screenshot-reported Leechstorm define their full continuing effects. The hold inspector
  adaptively fits the complete text without ellipsis.
- Verification: core **2933/0**, onboarding/effect/shop **202/0**, expansion/copy **289/0**, card art
  **279/0**, animation **135/135**, passive causal matrix **370/0**, squad **28/0**, telemetry **86/0**,
  fuzz **60/60**, BABER/summon and room-clock green, and local/Cloudflare/Railway serve **71/0** each.
  Fresh local and production 852×393 real lifecycles both reached live first combat with zero JS,
  HTTP, or art failures. Exact proofs are
  `tools/shots/scenario-run-complete-exit-2026-07-19T22-51-28`,
  `tools/shots/scenario-summon-card-explicit-2026-07-19T22-52-01`, and
  `tools/shots/scenario-boss-readability-djinn-2026-07-19T22-52-59`. Railway deployment
  `bc773fea-3d3a-49c7-892e-3506ce1bc268` is `SUCCESS`; the deployed `client.js` normalized hash exactly
  matches local. Local Bun is PID `44292`; Cloudflared remains PID `11488`.

- **The 37-body economy/summon release shipped in `a34c41f` and is live on Railway.** Bookie
  Bonelord is now a 14-HP Tier-III mythic: every 12 seconds it summons two rats and every defeated
  owned summon grants +1 melee/ranged damage; Mastery doubles that defeat reward and Specialty adds
  one rat per wave/rank. Affluence Anubis grows every future six-second rat wave before releasing it;
  Mastery adds another growth step and Specialty adds one further step/rank. Timeshare Tyrant (6 HP,
  Tier III), its 12-HP Clockwork Amalgamation, Oligarchy Ooze (Tier II), and common Moneymancer are
  implemented symmetrically for hero/foe use with complete trackers, upgrade rows, art, and tests.
- Timeshare starts with its Amalgamation, whose six-moxie ranged attack deals one lane-wide damage
  and whose protection excludes itself. Each 12-second service revives it or full-heals it and adds
  +1 damage/protection; Mastery doubles owned-summon moxie and Specialty reduces service by one
  second/rank to a three-second floor. Ooze steals the first damaging card used against it, auto-casts
  it at double cost, uses normal cost with Mastery, and receives Specialty-rank moxie from every later
  damaging hit. Moneymancer arms a -3 ranged cost every six seconds; its Mastery uses five seconds and
  its Specialty adds one discount/rank.
- `BODY_ARCHETYPE_MATRIX.md` and `engine/archetypes.js` lock the exact taxonomy: 12 attackers,
  12 casters, 2 defenders, 6 summoners, and 5 supports; primary patterns are 8 economy/tempo,
  6 pressure/control, 5 reactive/aggro, 6 scaling/carry, 6 summon/board, and 6 sustain/fortify.
  The explicit gaps are defenders, common control/AoE, direct team support, formation/mobility,
  cleanse/dispel, anti-summon, and deck-manipulation body identities. The refreshed public combat
  report covers all 37 bodies over 51,800 paired first-room fights; Bookie's 83.3% controlled and
  90.5% starter result is the evidence for its Tier-III promotion.
- Verification: core **2925/0**, expansion **174/0**, card art **279/0**, exhaustive animation
  **135/135**, passive causal matrix **370/0**, squad **28/0**, telemetry **86/0**, fuzz **60/60**,
  BABER/summon and room-clock green, local and production serve **70/0**, and both local/production
  four-client multiplayer smoke green. The exact paused four-player/one-boss/four-foe/three-summon
  scenario was inspected at 1280x720 and 844x390 with zero browser errors or overlap; screenshots are
  `artifacts/four-player-boss-four-foes-three-summons-{desktop,phone}.png`. Railway deployment
  `045693c1-d522-412c-975b-386aec66e620` is `SUCCESS` on `a34c41f`. Normal local Bun is PID `46492`;
  Cloudflared remains PID `11488`.

- **The level-up opportunity-cost correction shipped in `48ca921` and is live on Railway plus the
  preserved Cloudflare tunnel.** The previous 2-4 point Specialty prices routinely competed with
  +8 to +16 HP or +2 to +4 damage, so dependable stats were the rational default. All 34 bodies now
  use one legible contract: Mastery costs 2 once and Specialty costs 1 per rank. Existing allocations
  remain valid and may expose newly unspent points for free reallocation outside combat. The complete
  owner-facing matrix and math verdict live in `LEVELING_AND_ELITE_TIERS.md`.
- Royal Rat now keeps its base every-3-moxie rat: its 2-point Mastery shields each summon by actual
  per-body moxie cost (passive rats count as 1; multi-body cards divide their paid cost), while its
  1-point Specialty adds one rat per rank to that trigger. Fat Cat keeps its every-3-damage summon:
  its Mastery also hits the front foe for the living-rat count after the new rat arrives, and its
  Specialty grants +1 melee/ranged per summoned body per rank, including every living rat represented
  by a merged stack. Both mechanics are symmetric for player and foe copies and respect no-shield
  bodies such as Jar Slime.
- Verification: core **2891/0**, expansion **174/0**, card art **277/0**, exhaustive animation
  **134/134**, passive causal matrix **340/0**, squad **28/0**, telemetry **86/0**, fuzz **60/60**,
  BABER/summon and room-clock green, local serve **70/0**, multiplayer smoke green, and Railway plus
  Cloudflare serve **70/0** each. A live production WebSocket snapshot returned all **34** upgrade
  definitions with cost sets exactly `{2}` / `{1}` and the new Royal Rat/Fat Cat text. The real
  852x393 picker had zero row overflow or browser warnings; clicking proved Mastery spends 2 and
  Specialty spends 1. Local Bun is PID `39268` without scenario mode; Cloudflared remains PID `11488`.

- **The unique-card-art + four-player combat-density release shipped in `edc311e` and is live on
  Railway plus the preserved Cloudflare tunnel.** Every one of the 134 live cards now resolves to
  its own SVG; the two retired replay artifacts are unique too, and the last inactive question-card
  glyph is gone. Missing expansion/token art uses explicit name-matched best guesses, duplicate art
  aliases were removed, and the universal cast pulse now lifts that card's own token so every card
  has a distinct animated source signal. `test/card-art.test.js` and
  `test/card-animation.test.js` lock all 136 art artifacts and exhaustive 134-card cast coverage.
- Four-player touch lanes now pack one player plus three distinct summons into a stable 2×2 combat
  grid with separate 44px target cells. Summons retain HP, moxie/cost, next action, depth rank, and
  body art; the player becomes a compact HP/shield row in this one density case. The exact
  `four-player-boss-four-foes-three-summons.json` scenario uses four independent browser clients,
  a 60-HP Litigation Lich, four ordinary foes, three summons, and a live Meteors cast. Its 24 frames
  recorded zero JS/render/HTTP errors and zero friendly, foe/hero, boss/hero, or viewport violations
  (`tools/shots/scenario-four-player-boss-four-foes-three-summons-2026-07-19T17-23-13`).
- Verification: core **2777/0**, expansion **174/0**, card art **277/0**, exhaustive animation
  **134/134**, BABER/summon and clock green, server **70/0**, multiplayer smoke green, exact
  four-client scenario green, production server **70/0**, and all **136/136** deployed SVGs byte-match
  locally with no duplicates. Fresh Railway playthrough traversed
  `draft → won → setup → playing → won`, cleared two nodes, and reported zero JS errors, 404s, or
  missing art (`tools/shots/real-mobile-2026-07-19T17-29-32`). Railway deployment
  `42cb6b36-f59b-4be4-9a2f-c382ebaca5cf` is `SUCCESS`. Local Bun is PID `18004`; Cloudflared remains
  PID `11488`.

- **The boss + four foes + three distinct summons stress correction shipped in `4abea3b` and is
  live on Railway plus the preserved Cloudflare tunnel.** The first exact 852×393 run honestly failed
  with five intersecting friendly touchbox pairs: the crowd fallback vertically squeezed a hero,
  Hedgefund Knight, Large Rat, and Totem into one lane. Solo lanes now laterally pack the entities by
  their real 37px hero and 44px summon touch widths instead of a magic center step; visible rows stay
  unchanged. `boss-four-foes-three-summons.json` locks one Lich, four normal foes, and the three
  independently targetable summon action types with zero friendly, foe/hero, or boss/hero overlaps.
- Verification: core **2776/0**, expansion **174/0**, passive **340/0**, squad **28/0**, telemetry
  **86/0**, fuzz **60/60**, served client **70/0** locally/Cloudflare/Railway, the new stress fixture
  plus the one-/two-summon and Hydra exact regressions clean, and a fresh real mobile two-node run
  clean (`tools/shots/real-mobile-2026-07-19T16-39-08`). Railway deployment
  `f7e6c3f6-51e2-483d-888a-e03eb12cafba` is `SUCCESS`/`RUNNING`. With zero connected players local
  Bun moved from PID `36464` to `28056`; Cloudflared stayed PID `11488`.

- **The compact combat handoff shipped in runtime `480bfbe` and is live on Railway plus the existing
  Cloudflare tunnel.** Touch player portraits are now radius 24 (20 on crowded boards; 30 desktop)
  instead of 36/28/38, while their 37px target radius remains unchanged. Names sit above the art and
  the HP/shield/moxie rails keep the numeric truth, so identity no longer competes with combat data.
- Friendly and hostile summons now share one crisp 38px combat-row grammar: small identity art,
  FRONT/depth rank, HP/max HP, cyan shield cap, and what happens next. Queue-driven bodies show live
  moxie/cost plus the queued card; timer-driven attacks show their real scope, damage, seconds, fill,
  and imminent glow without a fake moxie meter; aura/guard states remain explicit. The visible row
  retains a separate 44px touch surface, and one kind-aware footprint now drives placement and hitbox
  reservation. A new exact Litigation Lich handoff fixture and pairwise friendly-hitbox assertion
  lock the no-overlap contract.
- Verification: core **2776/0**, expansion **174/0**, BABER/summon and room-clock suites green,
  passive causal sandbox **340/0**, squad **28/0**, telemetry **86/0**, fuzz **60/60**, and served
  client **70/0** locally, through Cloudflare, and on Railway. Exact 852×393@3 Edge scenarios for the
  Hydra swarm, shielded Lich handoff, summon-body regression, and front/hero/back depth all recorded
  zero JS/render errors and zero friendly-target overlaps. Fresh current-HEAD local and production
  mobile lifecycles both traversed `draft → won → setup → playing → lost` with zero JS errors, 404s,
  or missing art (`tools/shots/real-mobile-2026-07-19T15-54-02` and `15-57-47`). Railway deployment
  `26021e81-fb02-42e9-a278-343ef07bca7f` is `SUCCESS`/`RUNNING` on `480bfbe`. With zero established
  player sockets, local Bun moved from PID `41096` to `36464`; Cloudflared stayed on PID `11488`.

- **Dakota's 36-card ranged/sustain/summon expansion shipped in `58e419e` and is live on Railway.**
  All ranged lane cards now resolve in the aimed target's lane; Flame Steps is the sole deliberate
  exception because its authored text explicitly says the caster's lane. Bile replaces Acid, Pile On
  is removed, and the normal pool is now 114 cards (35 V1 starters). The full authored cost/value
  matrix is regression-locked in `test/card-expansion.test.js`.
- The expansion includes aimed poison/leech and overflow attacks; delayed/periodic lane spells that
  snapshot their cast lane or exact target; Tsunami's left/right/reverse choice; temporary shields,
  vials, missing-health Blood To Iron, Transcend, Hex, and the authored summon suite. Player and foe
  copies share the same resolver. Summon cards leave combat circulation after play while summon-body
  innate actions remain reusable. Divine Treasure builds an exact 10-moxie animated-weapon partition,
  with each body's HP equal to that weapon's cost.
- Summon bodies enforce their authored edge rules: Jar Slime caps each hit at 1 and cannot heal or
  shield (including Royal Rat's summon specialty); Rat King attacks for current HP and summons two
  rats; Splitter carries overflow and grows each cast; Blood-Moon Oni schedules its six-second return
  while its summoner lives. **Resolved ambiguity:** Rat King's innate action costs 3 moxie and the
  Oni's costs 6 moxie, matching the explicit costs used elsewhere in their descriptions. Flame Orbs
  makes three independent random living-target rolls, so the same survivor can be hit more than once;
  foe-controlled Tsunami defaults to reversing the lane order.
- Verification: core **2775/0**, expansion **174/0**, BABER/summon and room-clock suites green,
  passive causal sandbox **340/0**, serve **70/0** locally and on Railway, fuzz **30/30**, and a fresh
  two-WebSocket multiplayer smoke pass. Local 852×393 body-selection QA showed the new cards with no
  browser warnings/errors. Railway deployment `685156e7-8ab4-4659-a151-0d38b6b920ca` is `SUCCESS`,
  `/health` is green, live SSH confirms Divine Treasure/Miasmic Wave in the runtime, and the deployed
  client exposes Tsunami lane ordering plus the summon art aliases. The stale randomized shop E2E
  remains excluded for its already-documented retired direct-to-stock/cooldown assumptions.

- **Dakota's five-card ranged drop shipped in `34d6d82` and is live on both owner-facing runtimes.**
  Lightning, Meteors, and Blizzard now resolve across the aimed foe's lane instead of the caster's
  current lane. Earth (5m/V1), Acid (3m/V1), Astral Fist (8m/V1), Flame Orbs (9m/V1), and Study
  (1m/V1) are in the normal player pool, V1 starter pool, foe kits, readable card summaries, and the
  symmetric player/foe resolver. The pool is now 84 cards, including 25 V1 cards.
- Earth deals ranged-scaled 3 and gives equal shield to the live ally-target (or the caster); Acid
  applies `1 + ranged` poison; Astral Fist begins at the aimed body and spills excess behind it;
  Study snapshots melee/ranged at cast and grants +1 once after six seconds. **FLAG:** Flame Orbs'
  "three random targets" currently means three independent living-target rolls, so a surviving body
  can be selected more than once. The five temporary neutral SVGs are deliberately listed in
  `public/cards/CREDITS.md` as awaiting Dakota's bespoke art.
- Integration verification: game **2586/0**, passive causal sandbox **340/0**, squad **28/0**,
  telemetry **86/0**, fuzz **60/60**, and fresh local/Railway/Cloudflare serve **70/0**. A real
  852x393@3 touch production lifecycle cleared two nodes (`draft -> won -> setup -> playing -> won`),
  naturally exposed Acid on a foe, and had zero JS errors, 404s, or missing art. Railway deployment
  `0e109fff-5fab-49c2-8003-175120d24db9` is SUCCESS and `/health` is green. Local Bun is PID `41096`;
  the existing Cloudflare tunnel was not restarted.

- **Opt-in one-person squad command shipped in runtime `a581afa` and is live on Railway.** A seat
  choosing 2–4 bodies now gets a visible COMMAND BODIES strip through draft/setup/won/shop; selecting
  a body retargets that body's own deck, backpack, level, loadout, and combat hand. One-body play has
  no Plan button and retains the original direct-cast/one-slot unaffordable queue behavior.
- In live squad combat, `☷ Plan` appends exact current-hand instances in tap order. The numbered
  sequence is strict: only priority 1 may fire, at its first legal/affordable simulation tick; later
  cards never jump it. Tap a numbered card to remove it and re-add it at the end. Plans are stored per
  body, survive aim/move/possession inputs, clear at the room boundary, keep AUTO parked behind their
  head, and continue to expose the legacy `queuedCard` alias for old tools. Quarter speed is the intended
  high-control surface; there is deliberately no new solo complexity or invented card content.
- Every successful hero or foe card now publishes one bounded, source-anchored semantic cast event.
  Cards without authored art get a color-matched pulse; Sword/Lightning/Meteors retain their richer
  resolver-targeted effects. A card played by another friendly body also gets a small authoritative
  card-name pill above its caster, so partners and one-person squads can read what just happened.
- Release verification: game **2503/0** plus BABER/summon and clock checks, passive causal sandbox
  **340/0**, squad **28/0**, telemetry **86/0**, fuzz **60/60**, multiplayer smoke green, and local plus
  Railway serve **70/0**. Real 852×393 production interaction traversed two-body draft → first-room
  chooser → per-body setup/deck retarget → quarter-speed combat with Plan enabled, with zero browser
  errors. Railway deployment `54ddb89c-33a3-499f-b5d5-b6dd36e73a71` is SUCCESS and `/health` is green.
  Local Bun is PID `46692`; Cloudflared PID `11488` was not touched. The separate QA server was removed.
- `test/e2e.js` remains outside the canonical release bar: it still models the retired direct-to-stock
  and cooldown-inventory lifecycle, so its randomized shop run is stale. A bounded diagnostic confirmed
  that gap; no unverified harness rewrite was shipped.

- **The held playtest release is shipped at `1ef1667` and live on Railway.** A touch-held foe
  inspector now explains its close gesture and consumes the next deliberate tap anywhere before
  dismissing, so the overlay cannot stick or leak a card play/target change underneath. Mobile hero
  portraits shrink from radius 36 to 28 when five or more bodies are visible, while their 37px touch
  radius remains intact. The body picker no longer repeats “N upgrade points follow” on every option.
  Market-Crash Minotaur and Bond Behemoth's damage-trigger shield Specialties are gone: their capped
  two-point rows now start combat with 1 moxie / +1 generic damage respectively, and an exact registry
  regression requires the reactive-shield roster to stay empty.
- Release verification: game **2488/0**, passive causal sandbox **340/0**, squad **28/0**, telemetry
  **86/0**, fuzz **60/60**, and local plus Railway serve **67/0**. The current-HEAD local and production
  852×393 real runs both traversed `draft → won → setup → playing → lost` with zero JS errors, 404s,
  or missing art (`tools/shots/real-mobile-2026-07-19T04-49-33` and `04-54-10`). The bounded two-player
  harness verified join/draft/vote/lock/tie flow with zero JS errors; one known sustain-wall attempt
  stalled, then its fresh-room attempt won. Railway deployment `4620cacc-2967-46c1-b382-a0f43a7e4f4c`
  is `SUCCESS`/`RUNNING` on commit `1ef1667`. With zero established player sockets, local Bun moved
  from PID `40400` to `40092`; Cloudflared stayed on PID `11488`.
- **Latest genuine-session evidence:** production run `run-2026-07-19T03-50-00-905Z-D` recorded 10
  fights (9 wins / 1 loss): Royal Rat + Golden Golem, with Royal Rat swapping to Interest Imp before
  defeating floor-one Djinn; the party then lost in floor two. Golden Golem stopped 138 shield damage
  versus 42 HP damage, starter pairs were heavily rebuilt by combat two, expensive Gun/Glacius/Fire
  draws were mostly stranded/98% unaffordable, and sustain frequently overshot. The earlier same-day
  Fat Cat/Fundjin run `run-2026-07-18T18-18-07-046Z-D` is captured too: 16 fights, 15 wins, floor 3,
  with Hydra and Litigation Lich defeated. Known telemetry/log gaps: Djinn's boss key was absent from
  its room-result fields, false copies misleadingly log “Djinn of Deals falls,” and `harness:false`
  means non-harness provenance rather than cryptographic human identity.

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
  cost 3; Minotaur and Behemoth's damage-trigger shield rows were later replaced entirely. Saturating
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
- Current content facts for later owner notes: 22 common wearable bodies, 15 elite wearable
  bodies, 114 normal player cards, 1 archived player card, and 6 summon-only cards. Starter offers
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

Freeze runtime `e423f9c` and begin ordinary public Gate 1 run 1 of exactly 8.
Local/harness/owner-lab runs do not count. Continue collecting genuine
human outcomes before tuning authored numbers; deterministic tests establish mechanics, not fun or
final balance. Production telemetry is canonical for remote play; use simulations as evidence for
questions, never as authority to change values.
Treat the present interaction identity as a **soft-real-time tactical deckbuilder / party battler**
rather than a dexterity game: preserve quick decisions and queued intent, but continue removing
small moving targets and any advantage gained mainly by frantic input mashing.

## Active Decisions

- **Four-card batch interpretation (Dakota-authored values/costs/numbers, 2026-07-21):** Lightspeed
  Lashwhip hits every foe in the caster's current lane and scales as melee. Guillotwine Axe deals 7;
  its six-second repeat reuses the caster's then-current front/lane and the same overflow rule. Wars
  Eternity remains in play for the fight; each immediate/periodic strike grants shield from the
  resolver's damage-dealt value. Masters Arm branches exactly once per cast; Staff uses the existing
  six-second Haste/double-moxie primitive, Spear uses symmetric `front2`, and autonomous foe/bot or
  invalid choices take Rapier as the explicitly flagged safe fallback. Do not retune these placements
  or numbers without Dakota's play notes.
- **Piercer (owner-authored, 2026-07-21):** V3/M9 melee, deal 9 with the established `pierce +
  noReact` contract, then overflow down the line. Because pierce ignores shield, that untouched
  shield cannot stop excess from reaching the next body. The rule is symmetric for hero/foe copies.
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
  to its current `+1`s. It spans all four lanes. Generic Core/Swarm/Inflation heads independently
  choose a random lane; heads in one lane are a single rat-style pool whose HP, count, and combined
  four-second bite equal the living heads. Deck cards (one authored entry each):
  - `Swarm` — summon `floor` heads into random lanes every 6 seconds.
  - `Regenerate` — heal `floor × 2` every 6 seconds.
  - `Heads Up` — every time Hydra is damaged, summon `floor` heads in the lane that hit it.
  - `Inflation` — gain `+1` melee, then summon heads equal to Hydra's current `+1`s into random lanes.
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
  provenance excludes harness events, owner-lab events, and bot seats; use `KEEP_HARNESS=1` or
  `KEEP_OWNER_LAB=1` only when deliberately inspecting those separate verification cohorts.
- Desktop screenshot verification is unavailable on this laptop because its touchscreen makes the
  harness report touch capability. The canonical visual proof is mobile 852×393 DPR3 touch.
- **Deploy safely:** push first, then bounce only the Bun PID owning `:3000`; leave Cloudflared PID
  `11488` alone or the public URL rotates. Check for real established player sockets before restart.
- **Never `git add -A`.** Numerous untracked owner/probe files must remain untracked: design notes,
  scratchpad, `nul`, live/tunnel logs, and `tools/*.mjs` probes/sim outputs. Stage exact files only.
- Preserve archived `KIT.oCrystalBall` outside normal offers; `dBloodIron` is restored and active in
  `PLAYER_POOL`.
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
- Test: `bun run test/game.test.js`; `bun run test/owner-lab.test.js`; `bun run test/squad.test.js`;
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
