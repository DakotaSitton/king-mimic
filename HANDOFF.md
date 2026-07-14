# HANDOFF — King Mimic — 2026-07-14 18:10 CDT

> Browser co-op deckbuilder roguelike. Runtime = Bun. Working branch =
> `feat/room-draft-overhaul`. Read `CLAUDE.md` before editing: its verification bar and harness
> traps remain binding, though its suite-count lines are stale.

## Exact deployed state

- Runtime code commit `004d35b` (`feat: expose combat progress and terminal summon targets`) is
  pushed to origin and deployed. The following handoff-only commit changes no runtime file, so no
  restart is needed for it.
- Live Bun PID `14228` owns `:3000`. Fresh cloudflared PID `29664` was intentionally rotated at the
  owner's request and must now be preserved across Bun-only deploys.
- Public URL: **https://ross-occasion-week-retail.trycloudflare.com/**
- Local and tunnel return HTTP 200; their served roots and `client.js` are byte-identical. The live
  client contains the generalized body/passive tracker rail, readable phone foe/summon layouts,
  terminal ranged-to-summon targeting, correct Rainblow live scaling, three-private-offer opening
  draft, card-linked timers, atomic body-respec, and hold-only inspector.
- Canonical mobile target is the owner's iPhone 16 in landscape: **852×393 CSS px, DPR 3, touch**.
  Desktop emulation cannot prove Safari safe-area/notch behavior, so a physical-phone glance is
  still the last platform-specific check.

## Next Step — identify Dakota's actual play archetypes

Perform an evidence-backed, read-only analysis of how Dakota consistently tries to play King Mimic.
Do not begin by proposing new content or editing balance. First reconstruct the game as it is actually
played, then identify recurring player intentions and archetypes.

Required outputs:

1. Describe the actual minute-to-minute and run-level gameplay loop in plain language, including
   what decisions currently matter and what merely looks like a decision.
2. Rank the archetypes Dakota repeatedly attempts (for example summon swarm, sustain/shield,
   melee+ranged scaling, delayed/timed engines, body-possession adaptation), with direct evidence,
   confidence, representative bodies/cards, and failed as well as successful attempts.
3. Separate observed behavior from inferred preference. Call out when UI friction, survival pressure,
   random offers, or automation may be creating a false archetype signal.
4. Explain what Dakota appears to optimize for moment to moment, what makes him change bodies, and
   where the current game interrupts or fails to reward those intentions.
5. End with the three highest-leverage design/instrumentation implications. Do not recommend a large
   content expansion; focus on whether the core play patterns are legible, supported, and fun.

Evidence order and data hygiene:

- Start with `telemetry.jsonl`, `combatlog.txt`, and per-run files in `combatlogs/`. Current files run
  through roughly 2026-07-14 17:27 CDT. Treat `harness:true` and bot traffic as non-human. Historical
  `harness:false` before the provenance fix can still be automated, so use the time-window warnings
  in the telemetry section below and corroborate room/run IDs across event and combat logs.
- Read `scratchpad-playtest-findings.md` as owner testimony, but label it separately from behavioral
  telemetry.
- Inspect the owner's attached iPhone screenshots when useful:
  `C:\Users\dakot\.codex\codex-remote-attachments\019f5d76-2d8e-7942-8f35-444c3353e11a\2C40EAA2-B1F9-4A60-832A-F6A89BAC8C53\1-Photo-1.jpg`,
  `C:\Users\dakot\.codex\codex-remote-attachments\019f5d76-2d8e-7942-8f35-444c3353e11a\D7341E5E-B402-434F-B10E-DFC2D63D304C\1-Photo-1.jpg`,
  `C:\Users\dakot\.codex\codex-remote-attachments\019f5d76-2d8e-7942-8f35-444c3353e11a\D7341E5E-B402-434F-B10E-DFC2D63D304C\2-Photo-2.jpg`, and
  `C:\Users\dakot\.codex\codex-remote-attachments\019f5d76-2d8e-7942-8f35-444c3353e11a\D7341E5E-B402-434F-B10E-DFC2D63D304C\3-Photo-3.jpg`.
- Use `tools/telemetry-report.js` only after understanding its filters. Do not count scenario or
  `shoot.mjs` verification runs as Dakota's preferences.
- Read `engine/bodies.js`, `engine/kit.js`, `engine/combat.js`, and `engine/lobby.js` only as needed to
  translate observed choices into mechanics. Authored intent is not behavioral evidence.
- Analysis only unless Dakota explicitly asks the new thread to implement something.

## 2026-07-14 combat progress, terminal targeting, and phone legibility

All measurable body state now uses the same fixed combat rail as continuing card effects. Recurring
body clocks, moxie/damage/card thresholds, paired attack-kind progress, Atlas Shrug, Echo charge,
and armed continuing states publish semantic current/max/outcome data from the engine. Royal Rat and
Market-Crash Minotaur therefore show truthful `2/3` progress, while God-Twins displays two independent
body-art clocks. God-Twins' authored mechanics were also corrected: Fundjin scales from melee and
Raising-Profitsjin scales from ranged.

Ranged foes still prioritize living player bodies exactly as before. Once every player is down,
however, they now target and damage surviving hero summons through the normal shield/aura/reaction/
removal path. The same target ID drives a red incoming outline on the summon, preventing the old
ranged-only deadlock.

Phone combat layout now spends landscape width before crushing vertical rows: crowded foes form a
readable capacity-based grid, and up to five summons retain tactical cards when dimensions permit.
Rainblow Blade's card headline now shows base + live melee + live ranged and labels the value with
both attack glyphs.

Verification:

- Game **1605/0**; squad **28/0**; telemetry **34/0**; fuzz **60 clean runs**; serve **35/0**.
- Clean real solo run at exact **852x393 CSS px, DPR 3, touch, landscape** cleared two nodes through
  draft, setup, combat, and win with zero JavaScript/page/HTTP/art errors; 15 frames:
  `tools/shots/real-mobile-2026-07-14T21-39-04`.
- General continuing-effect regression: eight clean frames, with Pet Leech, Animated Blade, and
  Trollskin clocks advancing/resetting: `tools/shots/scenario-timed-effect-progress-2026-07-14T21-37-37`.
- Focused exact-phone proofs: Royal Rat and Minotaur thresholds, God-Twins clocks, Rainblow live
  bonuses/card timer, five-foe grid, exact two-foe/three-rat layout, hostile summon detail, and
  ranged fallback all passed with zero JS errors. Output roots share timestamp `2026-07-14T21-28-05`
  through `2026-07-14T21-33-03` under `tools/shots/scenario-*`.
- Local/public roots and `client.js` are HTTP 200 and byte-identical. Only Bun was replaced;
  cloudflared PID `29664` and the public hostname were preserved.
- One longer random driver attempt reached a valid shop with three visible exits but the automation
  did not choose one and reported its synthetic `STALL` marker. It exposed no browser exception,
  missing asset, or blocked product control; the bounded clean run above is the release proof.

## 2026-07-14 three private opening offers per player

The opening draft no longer rolls a shared five-card wheel. Every draftable player/body receives
exactly three private body+deck offers. The common-body pool is shuffled once and partitioned, so
offer bodies cannot overlap between players or squad bodies. `offeredTo` travels through snapshots,
the client renders only the active body's triple, and `draftPick` enforces ownership server-side.

Late joiners and newly added squad bodies receive fresh non-overlapping triples without disturbing
existing offers or locks; departed bodies' offers are pruned. The legacy `chooseClass` WebSocket
message now resolves only to a body already assigned to its sender, closing its previous authority
bypass. With 21 common draft bodies, the mathematically honest ceiling is seven draftable bodies;
requests beyond it now return an explicit error instead of truncating a squad or overlapping offers.
Late-join triples emit `draft_offer` telemetry so offer-rate reports retain correct denominators.

Verification:

- Game **1564/0**; squad **28/0**; telemetry **34/0**; fuzz **60 clean runs**; serve **35/0**.
- Network smoke, four-body smoke, and reconnect suites pass against a fresh throwaway server,
  including forged legacy-class rejection, co-op hold/begin-run, delta snapshots, four distinct
  lanes, drop/reclaim/refresh, and leaver cleanup.
- Fresh solo real-client run at exact **852×393 CSS px, DPR 3, touch, landscape** rendered exactly
  three offers, cleared three nodes, and reported zero JavaScript/page/HTTP/art errors. Output:
  `tools/shots/real-mobile-2026-07-14T20-13-44`.
- Focused real 2P run used two independent exact-phone touch clients. P1 and P2 each received three
  offers; their sets were disjoint; a forged legacy pick was rejected; both valid picks reached the
  co-op hold; zero JS errors. Full-resolution frames were visually inspected with no clipping or
  overlap. Output: `tools/shots/mp-2026-07-14T20-23-57`.
- The public tunnel was verified after deployment: a fresh live room exposed exactly three offer
  buttons and zero browser warnings/errors. Local/public root and `client.js` are HTTP 200 and
  byte-identical; the served client contains the private-offer filter.
- Before deployment, the one open live socket was allowed to sit idle after a completed room rather
  than being interrupted mid-combat. Only Bun was replaced; cloudflared PID `29664` and the public
  hostname were preserved.

## 2026-07-14 genuine-run telemetry + balance review

The canonical real-client drivers had been opening the app without `?harness=1`, so automated
verification traffic was stamped `harness:false` and polluted the intended human-only analysis.
Every tracked room-creating browser driver now identifies itself, the local untracked multiplayer
and touch drivers were corrected too, and CI runs a static telemetry-provenance contract.

The live create path also lost its initial `run_start`: it entered draft before the first interval
tick, whose observer initialized to the already-current phase. `startTrackedDraft` now routes every
WebSocket-driven fresh/restart draft through the normal phase seam synchronously, records the full
wheel exactly once, and aligns the next tick so it cannot duplicate the event.

Verification:

- Game **1547/0**; squad **22/0**; fuzz **60 clean runs**; serve **35/0**; telemetry **30/0**.
- Canonical real solo at exact **852×393@3 touch** emitted a full `run_start` and `draft_pick`, both
  `harness:true`; four real frames, zero JavaScript/page/HTTP/art errors:
  `tools/shots/real-mobile-2026-07-14T17-17-57`.
- Real 2P Game A passed same-room creation, distinct seats, combat win, vote snapshot, both lock
  gates, advance, and unanimous-room resolution (8/12 total gates, zero JS errors). Game B lost
  floor one on all three bounded attempts, so split-vote/tie gates were not reached; no fourth retry.
  Output: `tools/shots/mp-2026-07-14T17-18-18`.
- Live Bun was bounced only after confirming no established `:3000` players. Cloudflared PID
  `29664` and the new hostname were preserved; local/public root and client are byte-identical and
  the public lobby reloaded in a real browser with zero warning/error logs.

Human-run audit (historical pre-fix telemetry required time-window filtering):

- `Z23P` is the strongest genuine sample: 16 wins / 17 combats, floor 3, level 7, Litigation Lich
  and Kleptomaniac Kraken beaten. Its repeated Ice + Arcane line is the clearest live power signal,
  but one build is not enough to retune either card alone.
- `6VN3` contains two short floor-one lifecycles (combined 2W/2L). Royal Rat belongs here, not to
  `Z23P`; the older handoff joined those identities incorrectly.
- `CMTW`, `VPC5`, `PDR7`, and the 16:39 verification cluster are automated traffic despite their
  historical `harness:false` stamp. Do not train a balance conclusion on them.
- The 16:39 canonical stall was **Atlas using Shrugging/Blood To Iron + Shield against a defensive
  Golden Golem**, not Litigation Lich. Atlas's shield rose 0→6→18→23 while both sides failed to
  close. This is the known sustain/termination design hole, still awaiting the owner's valve.

Paired card simulation (`POLICY=priority MODE=cards FIGHTS=1000 SEED=20260714`):

- 81 cards × 1,000 identical seeded floor-one fights; candidate and Shield control were forced into
  the opening hand and deliberately cast once before normal bot policy resumed. Results:
  `tools/tier-sim-results.json`; harness changes remain untracked by design.
- Tier mean fight win rates are monotonic: **1=43.3%, 2=50.6%, 3=58.1%, 4=63.2%, 5=63.5%**.
  The 1–5 system is directionally sound; the issue is within-tier spread, not the tier concept.
- Strongest retest/possible-over rows: Grand Spirit 82.9% (tier 4), Continent-Club 82.2% (4),
  Power Word: Gun 81.1% (4), Omnislash 80.4% (4), Hedgefund Knight 76.1% (3), Glacius 75.1% (3),
  and Zweihänder 65.0% despite tier 1.
- Weakest high-value retest rows: Za Warudo 29.9% (tier 5), Swords of Revealing Light 37.5% (4),
  Crystal Ball 42.9% (4), Berserker Armor 46.3% (4), and Big Wizard Hat 50.7% (5). Dual-Handing
  Two-Handers/Demon Form/Weakness also tested low, but the neutral deck misses their build contract.
- Caveats are load-bearing: one acting floor-one foe, Rookie body, candidate forced first, default
  picks, and no ally/build strata. Pile On, Blizzard/AoE, Crystal Ball, Dual-Handing, Ice timing, and
  other synergy cards cannot be retuned from this table alone. No card value/cost/effect changed.

Remaining objective analysis gaps:

- A combat abandoned while still `playing` is censored from telemetry and combat logs; final room
  reap only deletes it. Add an explicit `abandoned`/`stalled` terminal record after reconnect grace
  (and a harness finalization signal) without classifying a temporary phone disconnect as a loss.
- `tools/content-audit.mjs` reports `tEarthWard` unreachable because it ignores `BODIES[*].kit`;
  Earth Elemental and Grand Spirit Tank both use it. Fix the audit, not the live card table.
- Next balance sim should stratify one-foe vs crowd vs boss and neutral vs authored-fit decks before
  any tier moves. The current paired opening-cast table is a triage instrument, not final balance.

## 2026-07-14 card-linked effect identity + foe stat rail

Timed effects and other card-authored buffs/debuffs now preserve their originating card key from
combat resolution through the snapshot. Their countdown token uses that card's actual SVG inside
the ring—Animated Blade looks like Animated Blade, Pet Leech looks like Pet Leech, and so on—with
the old semantic glyph retained only as a fallback for effects that do not come from a card.

Effect chips now occupy one stable rail per entity instead of drifting with the number of active
effects: centered below round heroes/summons and in the lower stat/effect rail of full foe rows.
Mobile full-size foe rows permanently reserve a compact `🗡N 🎯N` seat beside the name, including
zeroes, so a boss effect, long name, or action chip cannot silently erase melee/ranged bonuses.
Crowded five-foe rows retain the same explicit readout.

Verification on exact **852×393 CSS px, DPR 3, touch, landscape**:

- Game **1547/0**; squad **22/0**; fuzz **60 clean runs**; serve **35/0**.
- Animated Blade, Trollskin, and Pet Leech identity/progress proof: eight frames, zero errors;
  `tools/shots/scenario-timed-effect-progress-2026-07-14T16-38-28`.
- Starblade card-token proof: six frames, zero errors;
  `tools/shots/scenario-starblade-timer-2026-07-14T16-37-00`.
- Explicit foe-bonus and five-foe crowd proofs both passed with zero errors:
  `tools/shots/scenario-foe-bonus-readout-2026-07-14T16-38-28` and
  `tools/shots/scenario-crowd-5-foes-2026-07-14T16-39-48`.
- Fresh canonical real run: 81 frames, one node cleared, zero JavaScript/page/HTTP/art errors. It
  remained visually stable but eventually stalled with Atlas repeatedly shielding against a
  defensive Golden Golem after 120 seconds; `tools/shots/real-mobile-2026-07-14T16-39-48`.
- The deployed tunnel loaded at 852×393 CSS px with touch layout active and zero browser warning or
  error logs. Local/live roots, client, and representative card SVGs return HTTP 200 and are
  byte-identical.

## 2026-07-14 universal timed-effect progress seam

Every effect governed by elapsed time now uses the same Starblade-style countdown ring. The engine
snapshot projects the real effective clock (`period * cdMul`) instead of inventing client timing, so
the arc remains truthful for haste/slow modifiers and visibly refills when a recurring effect fires.

- Recurring card timers now animate, including Animated Blade, Demon Form self-hit, Crimson Crown,
  and legacy recurring timers. Starblade, Rainblow, and Cross-Blade keep their one-shot ring and
  disappear after firing.
- All recurring regens now animate: Trollskin, Liquid Metal, Moxie Pool, Demon Form ramp, Sage Mode,
  Berserker, Economy Elemental's cycle, and Warewolf's form flip.
- Pet Leech now animates on its carrier. Stacked leeches retain one legible `×N` chip and show the
  soonest independently pending drain.
- Timed effects applied to a back-line boss now render in the boss banner. Compact teammate rows keep
  the nearest timed chip instead of silently discarding all effect state.
- Event/count state such as Revealing Light remains intentionally untimed. Body/action timers already
  use labeled threat/cast bars and were not duplicated as effect rings.

Verification on exact **852×393 CSS px, DPR 3, touch, landscape**:

- Game **1540/0**; squad **22/0**; fuzz **60 clean runs**; serve **35/0**.
- Staggered Pet Leech, Animated Blade, and Trollskin proof: eight frames, zero errors; every arc drains
  independently and recurring clocks refill. Output:
  `tools/shots/scenario-timed-effect-progress-2026-07-14T15-16-29`.
- Stacked Pet Leech and existing Starblade regressions passed with zero errors:
  `tools/shots/scenario-pet-leech-stack-2026-07-14T15-16-29` and
  `tools/shots/scenario-starblade-timer-2026-07-14T15-16-29`.
- Fresh canonical real run: 24 frames through draft → win → setup → combat → win, two nodes cleared,
  zero JavaScript/page/HTTP/art errors. Output:
  `tools/shots/real-mobile-2026-07-14T15-17-39`.
- An independent agent inspected focused and representative random frames and found no collisions,
  clipping, short-landscape regression, or specific visual defect. The deployed tunnel also loaded
  at 852×393 CSS px with touch layout active and zero browser error logs.

## 2026-07-13 crown/bonus collision + setup footer seam

The player's standalone crown and always-on melee/ranged bonus were painted into the same canvas
pixels, making the crown appear to consume the melee stat. The crown is now part of one fitted
`👑 YOU  🗡N 🎯N` label, so the ownership marker and both combat bonuses remain distinct even when a
lane narrows.

The same exact-phone audit exposed a separate setup defect: a ten-card deck with long names could
wrap tall enough to hide the Backpack row behind the action footer. Setup inventory names now use
single-line ellipsis and tighter vertical spacing only in the 393px-tall landscape breakpoint. Full
rules remain in each card's title, and larger inventories still scroll.

Verification on exact **852×393 CSS px, DPR 3, touch, landscape**:

- Game **1529/0**; squad **22/0**; fuzz **60 clean runs**; serve **35/0**.
- Crown scenario: three frames, zero errors; `👑 YOU  🗡2 🎯0` is fully separated. Output:
  `tools/shots/scenario-hero-crown-bonus-2026-07-14T04-11-14`.
- Worst-case long-name setup scenario: three frames, zero errors; Backpack row, Bag control, and both
  footer actions remain fully visible. Output:
  `tools/shots/scenario-setup-backpack-footer-2026-07-14T04-11-14`.
- Fresh canonical real run: 24 frames through draft → win → setup → combat → loss, one node cleared,
  zero JavaScript/page/HTTP/art errors. Output:
  `tools/shots/real-mobile-2026-07-14T04-11-39`.
- The deployed tunnel was also loaded at 852×393 CSS px with touch layout active and zero browser
  error logs. Local/live roots and assets return HTTP 200; served `client.js` and `index.html` hashes
  match exactly.

## 2026-07-13 tactical enemy + body-swap respec seam

The owner's live iPhone runs exposed two product-level gaps: hostile summon tokens were anonymous
decoration at the exact Lich layout height, and a run-wide level allocation stayed locked to its old
melee/ranged choice after wearing a very different body.

### Hostile tokens are tactical objects now

- A one/two-token row fits a 24 px phone-height budget while showing identity, current/max HP, and
  the most important live action. Timer attacks read like `HIT LANE −1 · 7.9s`; card casters show
  canonical target scope plus truthful moxie progress/READY rather than a guessed seconds ETA.
- The engine authors canonical `front`, `front2`, `lane`, `aimed`, and `all-lanes` scope for body
  timers, queued cards, and boss clocks. Ranged, board-wide, utility, and AoE boss cases have explicit
  regressions, so the client never reverse-engineers targets from prose.
- Utility and aura bodies remain meaningful: `Power Up · ⚡1/3` and
  `AURA ALLIES −1 TAKEN`. Holding an enemy shows the front card's complete authored effect text.
- Mixed/large swarms use a neutral `N SUMMONS` label and prioritize the hottest harmful intent over
  permanent aura/utility state. Each fallback coin uses its own body art and HP digit.
- Target highlight, progress underline, and harmful imminent styling remain separate: an always-on
  aura is visibly active but never falsely glows as an incoming attack.

### Body swaps can adapt the run-level package

- Wearing another body at a level with combat bonus now opens the existing mobile-safe
  `Melee +N` / `Ranged +N` picker. It marks both the effective automatic choice and any explicit
  current choice truthfully.
- Cancelling returns to the body list without changing the body, cards, treasure, HP, or allocation.
  Confirming sends body, adoption tender, and choice as one server action; validation/payment occur
  before the whole fixed bonus package moves. It never duplicates points.
- The setup summary persistently confirms the result, e.g. `Royal Rat · Lv 5 (run-wide) · Ranged +2`.
  Old/keyboard clients that omit the new field preserve their existing allocation; invalid values
  are ignored. The current model deliberately moves the full package, not a split allocation.

Verification on exact **852×393 CSS px, DPR 3, touch, landscape**:

- Game **1529/0**; squad **22/0**; fuzz **60 clean runs**; serve **35/0**.
- Body respec: six real-client frames, including cancel atomicity, automatic/current labels, and
  persistent explicit result; zero errors. `tools/shots/scenario-body-swap-level-respec-2026-07-14T03-32-09`.
- Single summon, mixed four-summon swarm, and utility/aura hold proofs all passed with zero errors:
  `scenario-foe-summon-intent-2026-07-14T03-24-13`,
  `scenario-foe-swarm-summary-2026-07-14T03-36-51`, and
  `scenario-foe-utility-aura-2026-07-14T03-36-04`.
- Final canonical real run: 38 frames, one node cleared, zero JS/page/HTTP/art errors; an agent
  inspected every frame and found no clipping, overlap, corruption, or layout regression. Output:
  `tools/shots/real-mobile-2026-07-14T03-38-11`.
- Live human telemetry is directionally encouraging: run `Z23P` reached floor 3, level 7, and beat
  two bosses before losing as Lizard Wizard after several body swaps. The earlier Royal Rat claim
  was a join error with room `6VN3`; this run supports improved reach but does not independently
  prove the respec seam or declare the curve balanced.

## 2026-07-13 mobile card-reading seam

The owner's iPhone screenshot exposed two connected touch problems. A quick canvas tap produced a
compatibility `mousemove`, activating the desktop hover inspector and leaving its black/gold bar
over the hero information. Meanwhile, the short mobile cards reserved so much height for separate
damage and affordability rows that complete effect text had almost no room.

- Canvas mouse hover tracking and hover inspectors are now desktop-only.
- A quick card tap never opens or pins an inspector. It retains normal play/select behavior.
- A 360 ms hold opens the full inspector only while the finger remains down. Releasing or cancelling
  closes it, and the held card is not cast by the compatibility click.
- Touch card faces now show cost, value/type/target markers, a name plus live numeric headline, and
  the complete authored effect text. Redundant `play`/`need moxie` and separate damage rows were
  removed from touch cards; desktop layout is unchanged.
- `window.KM.ui.handInspect` and tracked scenario `tools/scenarios/card-hold-info.json` provide a
  semantic regression seam for tap, hold, and release behavior using real CDP touch events.

Verification on the exact **852×393 CSS px, DPR 3, touch, landscape** profile:

- Focused card-hold scenario: six screenshots, zero JavaScript errors; quick tap left the inspector
  closed, hold opened it after 360 ms, and release closed it without moving/casting the hand card.
- Existing Swords count-chip scenario: six screenshots, zero errors, with long authored card text
  contained on the card faces.
- Canonical `shoot.mjs`: draft → win → setup → combat → loss; 38 screenshots and zero
  JavaScript/page/HTTP/art errors. Output: `tools/shots/real-mobile-2026-07-14T02-50-52`.
- Game: **1506 passed**; squad: **22 passed**; fuzz: **60 clean runs**; serve: **35 passed**.

## 2026-07-13 balance seam

The owner requested temporary card ratings using **every integer from 1 through 5** and a higher
flat foe ante to price the foe's independent action economy.

### Five card-value tiers

`engine/kit.js` exports one auditable `TEMP_CARD_VALUE_TIERS` overlay. It exhaustively classifies all
81 player cards exactly once; six summon-only `t*` attacks remain value 0.

| Value | Count | Representative cards |
|---:|---:|---|
| 1 | 23 | Sword, Bow, Buckler, Tower Shield, Butterfly Knife |
| 2 | 17 | Javelin, Fire, Thorns, Mirror Mace, Gravity Greatsword |
| 3 | 20 | Mallet, Glacius, Demon Form, Pet Leech, Starblade |
| 4 | 13 | Meteors, Stoneskin, Omnislash, Mirror Shield, Reveal Light |
| 5 | 8 | Big Wizard Hat, Black Hole, Lion Lance, Za Warudo, Crimson Crown |

Mean player-card value is 2.5802. These are temporary judgment tiers, intentionally centralized so
owner retuning is a one-line move between lists. Tests fail on omissions, duplicates, extra keys, or
values outside 1–5.

The tiers activate previously dormant systems:

- `RICH_ITEM_POOL`: 58 castable cards valued 2–5. Arsenal foes can now buy exact-value upgrades.
- `RARE_POOL`: 41 cards valued 3–5. Boss reward shelves now contain four distinct real rares.
- Shops/trades/adoption use the actual card values. Adoption auto-pay now solves a bounded subset
  sum, minimizing overpay and then card count; a cost-4 purchase with `[1,1,5]` correctly spends the
  5 rather than burning all three cards.

### Foe action-economy ante

The canonical formula is now:

`anteOfFoe = 4 base + Σ card values + 2×(level−1) + 3 if elite`

`foeLootValue = anteOfFoe − 4` for each foe. The flat four is a threat-only action/body tax; carried
cards and level/elite premiums remain reward. A level-1 common with three value-1 cards therefore
costs **⚖7** and drops **◈3**.

The floor-one solo budget still rolls 4–12. Rolls 4–6 normalize to one legal ⚖7 common. Rolls 7–12
buy one progressively richer foe. Base foe kits are always three archetype-fitting value-1 cards;
enrichment then pays the exact `(new value − 1)` delta, preventing accidental budget overruns.

Exhaustive generation proof over 22,500 floor-one solo rooms found exactly one acting foe in every
room, no budget overrun for budgets 7–12, and exact ante/loot conservation. A larger 450,000-room
Monte Carlo likewise found zero invalid rooms and exercised all five arsenal tiers.

Important: budgets 10–12 can still buy **one elite body**. An exact mobile real run drew one Debt
Dragon and lost on floor one. Do not silently remove first-room elites; that is the next owner ruling.

### Combat safety found while activating the tiers

- Back-line boss poison/leech ticks can kill and clear the boss mid-tick. The simulation now captures
  the boss reference and checks liveness before leeches and clocks, preventing a null dereference and
  any post-death boss action.
- Multiple simultaneously due leeches stop after a lethal drain, preventing repeat corpse damage,
  duplicate defeat counts, and extra healing.

## Verification on `e8dece4`

- Game: **1506 passed, 0 failed**
- Squad: **22 passed, 0 failed**
- Fuzz: **60 full runs, no invariant violations**
- Serve: **35 passed**
- Admission: **13 passed**
- Real multiplayer: two browser clients joined distinct human seats, won combat, and passed all 12
  same-room/split-vote/all-lock gates; 13 screenshots, zero JavaScript errors.
- Canonical `shoot.mjs`: exact **852×393@3 touch, landscape**; draft → win → room → setup → combat →
  loss; 18 screenshots, zero JS/page/HTTP/art errors. Output:
  `tools/shots/real-mobile-2026-07-13T23-32-37`.
- Tracked five-tier scenario: exact same mobile profile; Sword ◈1, Fire ◈2, Glacius ◈3, Meteors ◈4,
  and Black Hole ◈5 are simultaneously visible without overflow; four screenshots, zero errors.
  Output: `tools/shots/scenario-economy-five-tiers-2026-07-13T23-35-42`.
- Tier simulation: 3,400 body runs completed after the boss fix. Common-body fight win rate was
  51.1%, elite 58.3%, overall 53.9%; throne completion remained extremely rare. This balance seam
  reduces actor pressure and activates rewards, but does **not** solve the full progression curve.

## Product assessment and next gains

The premise remains genuinely differentiated: body possession makes defeated enemies into future
identity/build choices, and co-op voting creates social friction that Balatro or Slay the Spire do
not have. The gap is execution consistency, not a missing content mountain.

Highest-value next work:

1. **First-run contract:** decide whether the first room may contain elite bodies. Multi-foe openers
   are gone under the current economy, but elite openers remain possible at ⚖10–12.
2. **Make the hook unavoidable:** readable first foe → defeat → visibly possess/wear it within the
   opening minutes. The mimic revelation should be the tutorial's payoff, not background machinery.
3. **Combat feel:** coherent card travel, hit-stop/impact, sound, haptics, and clearer cause/effect.
   This will create more freshness than another large card batch.
4. **Physical iPhone pass:** confirm Safari safe areas, notch edges, touch targets, and landscape
   browser chrome on the actual device.

## Carried-forward systems that remain live

- Server-authoritative keyframe+delta protocol; optimistic input echo never predicts damage/HP.
- Short-landscape combat/setup/loss polish and exactly one Play Again CTA.
- Equal-priority tactical foe rows with target/threat rings; foe summons enter the absolute lane
  front and block melee.
- Multiplayer draft presence, room voting, and all-seat lock gate.
- Developer lab and tracked scenarios behind `KM_SCENARIO=1`; normal servers reject scenario APIs.
- Every ordinary foe carries exactly three cards. Card count is not a difficulty lever because only
  the front moxie-gated queue card casts.

## Open owner rulings

- Pick the sustain/termination valve for no-close fights like Atlas vs defensive Golden Golem:
  flee, anti-stall escalation, shield/sustain cap, or intentional stalemate behavior.
- Are elite bodies allowed in the first room? This is now the single clearest progression lever.
- Boss court remains capped to three cards; exempt it or keep it intentionally compact?
- Acid Rain currently hits players and hero summons only despite “every body in the room” copy.
- Boss-deck-as-loot remains promising, but should be a tight cycling deck plus draft-a-subset rather
  than dropping a huge queue the boss never cast.
- Five-foe phone rows fit but compress below comfortable touch size; choose dense overview, scroll,
  or a separate target selector before enlarging hitboxes.
- The 1–5 tier placements are provisional. Retune specific cards from play evidence; do not collapse
  the system back to sparse 1/2/5 values.

## Landmines

- Never deploy server or client alone. Push, then bounce **only Bun**. Restarting cloudflared rotates
  the friend's URL.
- Do not stage/delete unrelated untracked owner files. In particular preserve `nul`, design notes,
  probe scripts, tier simulation output, and tunnel logs.
- `CLAUDE.md` suite counts are stale; it is owner-managed.
- Desktop mobile emulation proves layout dimensions, not iOS safe-area behavior.
- Cool Shoes loop stays. Never expose player-facing “AUTO” language (`autoFire` is bot machinery).

## Pointers

- Run: `bun run server.js` from repo root (`:3000`).
- Core tests: `bun run test/game.test.js`, `bun run test/squad.test.js`, `bun run test/fuzz.js`.
- Mobile: `node tools/shoot.mjs`; scenario:
  `node tools/scenario-shot.mjs tools/scenarios/economy-five-tiers.json`.
- Multiplayer: `node tools/mp-playtest.mjs`.
- Analysis: `bun tools/content-audit.mjs`; `$env:POLICY='priority'; $env:MODE='cards';
  $env:FIGHTS='1000'; $env:SEED='20260714'; bun tools/tier-sim.mjs` (PowerShell).
- Key files: `engine/kit.js` (tiers), `engine/world.js` (ante/loot), `engine/lobby.js` (generation),
  `public/inventory.js` (value tender), `engine/combat.js` (ticks), `test/game.test.js` (contracts).
