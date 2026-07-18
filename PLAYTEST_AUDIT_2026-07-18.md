# King Mimic production playtest and collectible-card audit

Audit date: 2026-07-18 (CDT)

Runtime/source baseline: `feat/room-draft-overhaul` at `5ddf81cc7e25cc2ccf5a484b4723111ef950d1cf`

Production snapshot: first 4,480 lines of Railway `/var/data/telemetry.jsonl`, frozen after the 2026-07-18T21:36:22.491Z run began. Per-run evidence came from `/var/data/combatlogs/<runId>.log`.

This is an audit, not a tuning pass. It contains no new card concepts, authored effects, numbers, names, or balance changes.

## Executive read

- The frozen production snapshot has **4,480 raw events / 162 run IDs**. The source-defined provenance filter (`harness !== true`) removes **95 events / 18 run IDs**, leaving **4,385 events / 144 telemetry-classified human runs**. Of those, **119 reached combat**, **116 produced at least one `room_result` and a per-run log**, and **25 stopped before combat**.
- The 323 completed, non-harness combats were **220 wins / 103 losses (68.1% combat win rate)**. Only **2 of 105 ended runs cleared the throne**; another 39 runs were open/abandoned at the snapshot boundary. This is not a clean 1.9% player-clear-rate estimate because `harness:false` proves only the telemetry flag, not the physical operator, and many short production verification sessions are mixed into the same population.
- Depth is highly concentrated: among 119 runs that started combat, **107 ended at deepest observed floor 1, 8 at floor 2, 2 at floor 3, and 2 at floor 4**. The two floor-4 runs were 19-0 clears. The most informative two-human run was `run-2026-07-18T18-18-07-046Z-D`: 15-1 through floor 3, Hydra and Lich wins, two body swaps, then a five-foe normal-room loss.
- Boss evidence is polarized: Hydra **3-3**, Litigation Lich **4-4**, Kraken **7-0**, King Mimic **2-0**. This is reach-conditioned evidence—only already-successful builds meet later bosses—so it does not establish boss ordering by intrinsic difficulty.
- Interaction telemetry shows substantial hand waiting: **33,847 hand-locked ticks / 77,208 human-seat combat ticks (43.8%)**. It also records **66 rejected command attempts** and **50 queue cancellations from 110 queued attempts**. `dTaunt` is the clearest low-cost conversion outlier (15 casts / 58 draws, 43 stranded, only 725/8,298 held ticks unaffordable), while high-cost damage cards can be mostly unaffordable yet still convert when a fight lasts (`oPowerWordGun` 3/4 casts at 96.0% unaffordable hold; `oContinentClub` 15/22 at 95.6%). Affordability alone is therefore not a trap label.
- The collectible player pool contains **79 cards** at every raw cost 1 through 10, but **53/79 (67.1%) sit at costs 3-5**. The structural coverage audit finds the largest empty bands in summon (five empty costs and only one member at every occupied cost), resource/scaling engine (empty at 1 and 6-10), and defense/sustain (empty at 8-10). These are coverage facts, not requests for cards.

## Method and provenance

### Production run classification

The canonical source is Railway, not the laptop-local telemetry file. I used the comments and emitted fields in `server.js` plus the default filter in `tools/telemetry-report.js`:

1. A run is excluded when any event for it has `harness === true`.
2. A remaining run is called **telemetry-classified human**. This matches the repository reporter's wording, but should not be read as independently verified operator identity; the schema stores no operator identity/origin beyond `harness`, `bots`, party, room, and seat fields.
3. Bot seats are not human choices or human-seat combat results. One usable run, `run-2026-07-16T03-42-25-047Z-CHUNGGA`, had party 4 / bots 3: its one human seat remains in human-seat tables, while its three bot-seat results are excluded. A second bot-bearing run stopped before combat.
4. `combat_start` counts attempts entering combat; `room_result` is a completed combat; `run_end` is an explicit loss or throne clear. A run may have a completed fight but no `run_end` if it was left/restarted. A run with `combat_start` but no `room_result` has usable setup/deck/body evidence but no outcome or combat log.

The volume was append-only during the audit (an early count was 4,427 and later grew). To make every count reproducible, all telemetry claims below use exactly `head -n 4480`; later appended events are outside this bounded snapshot.

### Evidence counts

| Evidence | Raw | After harness filter / human-seat filter |
|---|---:|---:|
| Telemetry events | 4,480 | 4,385 |
| Run IDs with `run_start` | 162 | 144 |
| Runs with `combat_start` | 135 | 119 non-harness |
| `combat_start` events | 342 | 326 non-harness |
| Runs with `room_result` / a completed log | 132 | 116 non-harness |
| `room_result` events / combat-log sections | 339 | 323 non-harness: 220 won, 103 lost |
| Human-seat result rows | — | 352 |
| Bot-seat result rows | — | 3, excluded from body/card human tables |
| Ended runs (`run_end`) | — | 105: 2 won, 103 lost |
| Open/abandoned runs at snapshot | — | 39 (11 after a result, 3 after combat start with no result, 25 pre-combat) |
| Collectible player cards (`PLAYER_POOL`) | 79 | 79 |

The persistent volume held 132 combat-log files at the frozen boundary: 16 harness-log files and **116** completed non-harness run files containing the **323** sections used here.

### Card-pool classification

The source of truth is `engine/cards.js:PLAYER_POOL` joined to `engine/kit.js:KIT` and `cardKind`. Archived cards (`ARCHIVED_PLAYER_CARDS`) and summon-only token cards are not collectible and are excluded. The rules flatten nested timer ops, allow a card to belong to multiple archetypes, and are mechanical:

| Archetype | Evidence rule |
|---|---|
| Melee damage | Has `deal`/`schoolStrike`, and `cardKind` is `melee` or `both` |
| Ranged damage | Has `deal`/`schoolStrike`, and `cardKind` is `ranged` or `both` |
| Defense/sustain | Shield, heal, lifesteal, damage-reflect/cap/reduction, health expansion, or periodic heal/shield op; `leech` counts here because its current op explicitly heals |
| Control/position | `pullFront`, `repositionPick`, `slow`, `weakness`, `sap`, `stasis`, or `tkBlades` |
| Summon | `summon` or `summonPick`, including nested timer ops |
| Resource/scaling engine | Damage-bonus, moxie-generation, haste, replay, or modal scaling ops |

`Ø` below means an **actual empty gap** (zero cards in that archetype at that existing pool cost). `T1` means **thin coverage** (one current member), not an empty gap. `2+` is redundant coverage. This distinction avoids calling a lone specialized role “missing.”

## Production trajectory and game-health observations

### Outcomes over the frozen three-day window

| UTC start date | Human-classified runs | Runs reaching combat | Completed combats | Combat W-L | Explicit clears | Explicit run losses | Open/abandoned | Deepest floor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026-07-16 | 74 | 64 | 154 | 99-55 | 1 | 55 | 18 | 4 |
| 2026-07-17 | 29 | 24 | 54 | 33-21 | 0 | 21 | 8 | 2 |
| 2026-07-18 | 41 | 31 | 115 | 88-27 | 1 | 27 | 13 | 4 |
| **Total** | **144** | **119** | **323** | **220-103** | **2** | **103** | **39** | **4** |

The combat win share rises from 64.3% on July 16 and 61.1% on July 17 to 76.5% on July 18. That is a trajectory in the captured population, not proof of improved balance: production code changed during the window, later rows contain more deep/long sessions, and formal `harness:false` does not separate owner play from manually driven deployment QA.

### Depth, bosses, bodies, and swaps

- Deepest-floor distribution among the 119 runs that entered combat: floor 1 **107 (89.9%)**, floor 2 **8**, floor 3 **2**, floor 4 **2**. Three of the floor-1 rows started combat without a result; they are explicit in the inventory.
- Boss results from `room_result.boss`: Hydra **6 fights, 3-3, 38.2s mean**; Litigation Lich **8, 4-4, 29.9s**; Kraken **7, 7-0, 36.9s**; King Mimic **2, 2-0, 36.2s**.
- There were **13 `body_swap` events across six runs**. The two clears demonstrate different successful seams: the July 16 clear started `frugal`, moved through several bodies, and finished `fundjin`; the July 18 clear stayed `counterparty`. The two-human floor-3 run moved `pennyPixie -> heavyHand -> fundjin` for one seat while the other remained `frugal`.
- Higher-sample human-seat outcomes are not uniform: `fundjin` 29/30 combat wins, `counterparty` 43/48, `frugal` 35/47, `leverage` 42/57, and `bloodfund` 13/25. These are body-at-result associations, not randomized body treatment; stronger runs can swap into elite bodies, so especially `fundjin` is selection-biased.
- Friction differs even among viable bodies: `ratTrader` averaged **43.1s fight / 21.2s hand lock** across 15 fights; `leverage` **24.7s / 12.8s** across 57 and accounts for 40 of the 66 rejected taps. `frugal` averaged **23.8s / 6.3s** across 47. These fields support an interaction-cost difference, not a balance prescription.

### Noteworthy complete/deep runs

- `run-2026-07-16T16-07-21-007Z-XLTA` — **19-0 clear**, floor 4; `frugal -> fundjin` with five swaps total; Kraken, Lich, King all won. Its leading casts were Shield 15, Heart Guard 11, Ice 7, Tower Shield 6, Dark 6, and Lion Lance 5. The log shows the final King fight combining repeated Fundjin passive hits with defense and scaling rather than pure direct-damage stuffing.
- `run-2026-07-18T20-49-45-446Z-EKZW` — **19-0 clear**, floor 4; `counterparty` throughout; Kraken, Lich, King all won. Leading casts were Butcher's Cleaver 25, Haste 23, Moonlight Greatsword 19, Heart Guard 17, and Jesterplate 11. The King log shows repeated shield/passive sustain while damage bonuses rose; this is a distinct engine/sustain clear from XLTA.
- `run-2026-07-18T18-18-07-046Z-D` — **15-1**, two humans, floor 3; Hydra and Lich won. Human bodies across the run were `frugal`, `pennyPixie`, `heavyHand`, and `fundjin`. Pet Leech led casts (14), followed by Buckler 13, Dagger 11, Butterfly Knife 10, Dark 9, Heart Guard 8, and Mirror Shield 8. The terminal normal room had five foes: Fundjin was downed by Medusa's Ice; Fat Cat was ultimately downed by Medusa's Power Word: Gun after multiple Fundjin passive, Omnislash, Wind/Cross-Blade, and small-hit sequences. This supports “multi-source attrition plus a 13-damage finisher,” not a single-card causality claim.
- `run-2026-07-18T20-37-36-994Z-EKZW` — **15-1**, floor 3; Hydra and Kraken won. The Royal Rat run used Ice 25, Buckler 18, Shield 16, Banshee Wail 11, Dark 9, and summon engines. Its terminal four-foe room ended after repeated low hits; Interest Imp's Arcane delivered the final 4 HP. This is evidence that a strong swarm line can still lose to accumulated ordinary-room pressure without a boss.

### Deck and card interaction

- Starter cuts at the first real opportunity are concentrated: Pile On was cut ASAP in **6/9** eligible histories, Taunt **7/14**, Bow **4/9**, and Rainblow **5/13**. Ice was **0/21**, Heart Guard **1/16**, Lightning **1/16**, and Wind **0/10**. These are multiset deck edits, not direct statements of card quality; offered bundles and body plans differ.
- Cheap availability does not guarantee use. `dTaunt` was held affordable for 91.3% of its measured hold time yet converted only **15/58 draws** and stranded **43/58**. Its 50% ASAP starter-cut rate independently points to role/use friction.
- Expensive cards separate “wait” from “non-use.” `oBlackHole` cast **7/22** and was unaffordable for **2,482/2,517 held ticks (98.6%)**; `oContinentClub` cast **15/22** despite **95.6%** unaffordable hold; `oPowerWordGun` cast **3/4** despite **96.0%**. `oZweihander` also generated **18 rejected taps**, the largest individual card count, while converting 48/86 draws. The telemetry supports hand-lock/expectation friction, not a universal high-cost failure.
- Sustain is materially used, but healing efficiency varies. Heart Guard delivered **161/218 effective heal (57 overheal)** plus 218 shield and 156 stopped damage. Dark delivered **153/250 effective (97 overheal)**. Butcher's Cleaver delivered **66/189 effective (123 overheal)**. Tower Shield stopped **491** from **595** granted shield. These totals show that defense and lifesteal contribute, while on-damage healing frequently fires at high HP in this population.
- Across measured human-seat result rows: 1,943 manual attempts, 3 auto attempts, 110 queued attempts, 56 queued casts, and 50 cancellations. Rejected/cancelled attempts are interaction evidence; they do not identify whether the player changed intent, mis-targeted, or hit an affordability rule.

### Death evidence and uncertainty

All 323 frozen non-harness `room_result` sections were represented in the joined per-run logs. Structured source/card/lethal text was added during this window, so only a subset of older losses exposes a machine-parseable final source. In the structured subset, repeated final cards included Fire (5), Rainblow Blade (3), Ice (3), Power Word: Gun (2), Bite (2), Animated Blade (2), and Twin Uchis (2). The frequency table is descriptive only and is biased toward newer logs; it must not be compared as if all 103 deaths had equal source instrumentation.

The logs support two broader observations without overreaching:

1. **Ordinary rooms are the dominant terminal context.** Ninety-plus losses occurred on floor 1, and both captured floor-3 non-clear runs died in normal combat rather than at a boss.
2. **Lethality is often cumulative.** The detailed D and EKZW losses show multiple foe cards/passives exhausting shields/HP before a final named hit. Labeling only the last card as “the cause” would erase the preceding pressure.

## Collectible card-pool coverage

### Raw cost distribution

| Cost | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Pool cards | 3 | 6 | 19 | 18 | 16 | 7 | 4 | 1 | 1 | 4 |

### Archetype × cost coverage/gap matrix

| Archetype | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Melee damage | T1 | T1 | 4 | 11 | 7 | 4 | T1 | T1 | **Ø** | T1 |
| Ranged damage | **Ø** | T1 | T1 | T1 | 4 | 2 | T1 | **Ø** | **Ø** | 2 |
| Defense / sustain | T1 | 3 | 4 | 5 | 8 | T1 | T1 | **Ø** | **Ø** | **Ø** |
| Control / position | T1 | **Ø** | 5 | **Ø** | T1 | 2 | T1 | **Ø** | T1 | **Ø** |
| Summon | **Ø** | **Ø** | T1 | **Ø** | T1 | T1 | T1 | **Ø** | **Ø** | T1 |
| Resource / scaling engine | **Ø** | 2 | 6 | 5 | T1 | **Ø** | **Ø** | **Ø** | **Ø** | **Ø** |

Defense cost 2 includes the current leech sustain op in addition to the explicit periodic/risk-defense cards. Counts overlap by design: a damage+sustain card appears in both rows, and hybrid `both` damage appears in melee and ranged.

### Actual gaps versus thin roles

- **Melee damage:** cost 9 is the only actual empty cost. Costs 1, 2, 7, 8, and 10 are thin: respectively a front hit, a front hit, piercing, delayed burst, and overflow role. The archetype has broad redundancy at costs 3-6, especially cost 4.
- **Ranged damage:** costs 1, 8, and 9 are empty. Costs 2-4 and 7 are thin: aimed single-target, aimed plus position, hybrid delayed lane, and lane damage+sap respectively. Costs 5-6 and 10 carry the actual redundancy.
- **Defense/sustain:** costs 8-10 are empty. Costs 1, 6, and 7 are thin and each exposes one role family (small shield; shield+lane mitigation; hit cap). Costs 3-5 are the dense defensive band.
- **Control/position:** costs 2, 4, 8, and 10 are empty. Cost 3 contains five different control/position implementations; every other occupied cost is thin except cost 6. The missing structure is therefore discontinuous cost coverage, not lack of control vocabulary.
- **Summon:** costs 1, 2, 4, 8, and 9 are empty. Every occupied cost (3, 5, 6, 7, 10) has exactly one member, so the whole archetype is thin even where it is not empty. Current occupied roles span recurring swarm, durable self-healing unit, martial unit, lane-damage unit, and modal unit; there is no same-cost redundancy.
- **Resource/scaling engine:** costs 1 and 6-10 are empty. Costs 2-4 are dense; cost 5 is thin and tied to a damage card. Coverage stops entirely above 5 even though damage, defense, control, and summon cards continue higher.

### Prioritized structural gaps (no card proposals)

1. **Summon breadth:** five empty costs plus single-member coverage in every occupied band make this the least redundant evidence-based archetype.
2. **High-cost non-damage engines:** resource/scaling has no coverage from 6-10, and defense/sustain has none at 8-10. This creates a source-level high-cost function asymmetry; it does not say those costs need new content.
3. **Ranged endpoints:** no ranged-damage member exists at 1, 8, or 9, while melee has only one empty cost. The asymmetry is structural and reproducible from `PLAYER_POOL`/`KIT`.
4. **Control continuity:** control has useful vocabulary but empty costs 2, 4, 8, and 10, with five members concentrated at cost 3.
5. **Mid-cost congestion:** 53/79 cards occupy costs 3-5. Every archetype except summon is densest there, while costs 8 and 9 contain one total pool card each.
6. **Melee cost 9:** this is a real empty cell, but melee otherwise has the strongest cost continuity and redundancy, so it is lower structural priority than the multi-band gaps above.

## Complete run inventory

Legend: `cs/r` = `combat_start` count / `room_result` count; W-L is completed combat results; `F` is deepest telemetry floor; `end:open` means no `run_end` in the frozen snapshot; `P/B` is max party size / bot seats. Every row with at least one result has `/var/data/combatlogs/<runId>.log`. The three `cs/r 1/0` rows have combat-start evidence but no completed log section.

### Pre-combat runs (25)

These are genuine under the same provenance filter but have no combat evidence. They are included so the inventory covers all 144 non-harness run IDs.

```text
run-2026-07-16T03-33-11-336Z-LAUNCHCH | events:2 | P1/B0 | run_start:1,draft_pick:1
run-2026-07-16T03-43-18-931Z-CHUNGGA | events:2 | P4/B3 | run_start:1,draft_pick:1
run-2026-07-16T03-55-18-656Z-QT2E | events:1 | P1/B0 | run_start:1
run-2026-07-16T06-27-04-303Z-M3UP | events:1 | P1/B0 | run_start:1
run-2026-07-16T15-46-54-313Z-98H3 | events:2 | P1/B0 | run_start:1,draft_pick:1
run-2026-07-16T15-51-56-477Z-XN4E | events:1 | P1/B0 | run_start:1
run-2026-07-16T19-00-22-111Z-R6KL | events:1 | P1/B0 | run_start:1
run-2026-07-16T22-04-13-632Z-29HZ | events:1 | P1/B0 | run_start:1
run-2026-07-16T23-51-22-488Z-D | events:8 | P2/B0 | run_start:1,draft_offer:3,draft_pick:4
run-2026-07-16T23-56-01-850Z-D | events:1 | P2/B0 | run_start:1
run-2026-07-17T04-05-46-004Z-5J4J | events:2 | P1/B0 | run_start:1,draft_pick:1
run-2026-07-17T19-59-19-998Z-TJE9 | events:1 | P1/B0 | run_start:1
run-2026-07-17T20-26-38-670Z-PN27 | events:1 | P1/B0 | run_start:1
run-2026-07-17T20-55-51-714Z-VNPC | events:2 | P1/B0 | run_start:1,draft_pick:1
run-2026-07-17T22-50-49-988Z-T5J8 | events:1 | P1/B0 | run_start:1
run-2026-07-18T00-01-14-873Z-BOOP | events:1 | P1/B0 | run_start:1
run-2026-07-18T00-49-02-129Z-ZC7L | events:2 | P1/B0 | run_start:1,draft_pick:1
run-2026-07-18T01-10-58-062Z-28EF | events:2 | P1/B0 | run_start:1,draft_pick:1
run-2026-07-18T05-13-13-578Z-UT9M | events:1 | P1/B0 | run_start:1
run-2026-07-18T07-03-42-123Z-AHVL | events:1 | P1/B0 | run_start:1
run-2026-07-18T18-12-59-788Z-D | events:1 | P2/B0 | run_start:1
run-2026-07-18T18-15-29-753Z-RHGV | events:2 | P1/B0 | run_start:1,draft_pick:1
run-2026-07-18T18-50-19-591Z-D | events:1 | P2/B0 | run_start:1
run-2026-07-18T21-18-13-648Z-D | events:2 | P1/B0 | run_start:1,ui_interaction:1
run-2026-07-18T21-30-47-535Z-D | events:2 | P1/B0 | run_start:1,ui_interaction:1
```

### Runs reaching combat — 2026-07-16 UTC (64)

```text
run-2026-07-16T03-31-59-378Z-8LAR | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:pyramidRogue
run-2026-07-16T03-34-52-891Z-8LAR | cs/r 3/3 | 3-0 | F1 | end:open | P1/B0 | body:pyramidRogue | sw:pyramidRogue>quakeCap,quakeCap>pyramidRogue
run-2026-07-16T03-37-04-940Z-CHUNGGA | cs/r 1/1 | 1-0 | F1 | end:open | P1/B0 | body:rentier
run-2026-07-16T03-39-49-393Z-CHUNGGA | cs/r 3/3 | 2-1 | F1 | end:lost | P1/B0 | body:leverage
run-2026-07-16T03-41-27-795Z-QT2E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:warewolf
run-2026-07-16T03-42-03-274Z-CHUNGGA | cs/r 1/0 | 0-0 | F1 | end:open | P1/B0 | body:mutualMend
run-2026-07-16T03-42-19-688Z-QT2E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:ratBaron
run-2026-07-16T03-42-25-047Z-CHUNGGA | cs/r 1/1 | 0-1 | F1 | end:lost | P4/B3 | body:hedge
run-2026-07-16T03-43-06-442Z-QT2E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:quakeCap
run-2026-07-16T03-43-30-071Z-QT2E | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:bloodfund
run-2026-07-16T03-46-22-042Z-QT2E | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:mutualMend
run-2026-07-16T03-47-30-457Z-QT2E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:bloodfund
run-2026-07-16T03-48-19-586Z-QT2E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:frugal
run-2026-07-16T03-48-51-550Z-QT2E | cs/r 7/7 | 6-1 | F2 | end:lost | P1/B0 | body:counterparty | boss:hydra:w
run-2026-07-16T04-22-17-580Z-FZ98 | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:warewolf
run-2026-07-16T07-43-25-324Z-4YAL | cs/r 1/1 | 1-0 | F1 | end:open | P1/B0 | body:leverage
run-2026-07-16T14-52-51-519Z-BM3T | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:hedge
run-2026-07-16T14-53-13-236Z-BM3T | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:hedge
run-2026-07-16T14-53-45-528Z-BM3T | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:hedge
run-2026-07-16T14-54-17-676Z-BM3T | cs/r 1/1 | 1-0 | F1 | end:open | P1/B0 | body:hedge
run-2026-07-16T15-18-38-057Z-VQDF | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:pyramidRogue
run-2026-07-16T15-20-04-665Z-VQDF | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:bloodfund
run-2026-07-16T15-20-34-447Z-VQDF | cs/r 2/2 | 2-0 | F1 | end:open | P1/B0 | body:leverage
run-2026-07-16T15-47-37-377Z-XN4E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:compound
run-2026-07-16T15-48-17-370Z-QD2R | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:hedge
run-2026-07-16T15-49-09-205Z-QD2R | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:frugal
run-2026-07-16T15-50-22-586Z-XN4E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:compound
run-2026-07-16T15-50-43-527Z-QD2R | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:leverage
run-2026-07-16T15-50-54-804Z-XN4E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:rentier
run-2026-07-16T15-51-27-353Z-XN4E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:pyramidHead
run-2026-07-16T15-51-34-112Z-QD2R | cs/r 1/1 | 1-0 | F1 | end:open | P1/B0 | body:ratTrader
run-2026-07-16T16-04-56-867Z-XLTA | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:bloodfund
run-2026-07-16T16-05-41-572Z-XLTA | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:juggernaut
run-2026-07-16T16-07-21-007Z-XLTA | cs/r 19/19 | 19-0 | F4 | end:won | P1/B0 | body:frugal>fundjin | sw:frugal>fundjin,fundjin>compound,compound>fundjin,fundjin>bribedBishop,bribedBishop>fundjin | boss:kraken:w,litigationLich:w,kingMimic:w
run-2026-07-16T16-08-32-389Z-LTHD | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:discountDuel
run-2026-07-16T16-09-28-596Z-LTHD | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:counterparty
run-2026-07-16T16-14-52-387Z-LTHD | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:rentier
run-2026-07-16T16-41-48-994Z-9YTB | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:discountDuel
run-2026-07-16T16-42-36-989Z-9YTB | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:counterparty
run-2026-07-16T16-43-24-578Z-9YTB | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:frugal
run-2026-07-16T16-43-58-497Z-9YTB | cs/r 1/1 | 1-0 | F1 | end:open | P1/B0 | body:counterparty
run-2026-07-16T18-39-21-604Z-R6KL | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:leverage
run-2026-07-16T18-42-27-347Z-R6KL | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:juggernaut
run-2026-07-16T18-43-54-792Z-R6KL | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:leverage
run-2026-07-16T18-59-48-369Z-R6KL | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:pyramidHead
run-2026-07-16T19-33-20-350Z-FY6E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:pyramidRogue
run-2026-07-16T19-33-50-163Z-FY6E | cs/r 9/9 | 8-1 | F2 | end:lost | P1/B0 | body:bloodfund | boss:kraken:w
run-2026-07-16T19-39-56-070Z-FY6E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:leverage
run-2026-07-16T19-40-23-422Z-FY6E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:leverage
run-2026-07-16T19-40-49-174Z-FY6E | cs/r 4/4 | 3-1 | F1 | end:lost | P1/B0 | body:ratBaron
run-2026-07-16T19-43-23-285Z-FY6E | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:juggernaut
run-2026-07-16T19-44-15-992Z-FY6E | cs/r 3/3 | 2-1 | F1 | end:lost | P1/B0 | body:pyramidRogue
run-2026-07-16T19-46-05-655Z-FY6E | cs/r 11/11 | 10-1 | F2 | end:lost | P1/B0 | body:pyramidRogue
run-2026-07-16T19-52-16-765Z-FY6E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:frugal
run-2026-07-16T19-52-41-062Z-FY6E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:ratBaron
run-2026-07-16T19-53-04-590Z-FY6E | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:leverage
run-2026-07-16T19-54-34-599Z-FY6E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:leverage
run-2026-07-16T19-54-58-355Z-FY6E | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:bloodfund
run-2026-07-16T19-55-19-354Z-FY6E | cs/r 12/12 | 11-1 | F2 | end:lost | P1/B0 | body:ratTrader>mutualMend>atlas | sw:ratTrader>mutualMend,mutualMend>atlas | boss:kraken:w,hydra:l
run-2026-07-16T21-59-49-459Z-29HZ | cs/r 5/5 | 4-1 | F1 | end:lost | P1/B0 | body:ratTrader>sphinx | sw:ratTrader>sphinx
run-2026-07-16T22-03-45-567Z-6XLB | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:compound
run-2026-07-16T22-05-37-906Z-6XLB | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:leverage
run-2026-07-16T22-07-50-372Z-WAEW | cs/r 12/12 | 11-1 | F2 | end:lost | P1/B0 | body:leverage | boss:litigationLich:l
run-2026-07-16T22-45-47-996Z-GVJ9 | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:mutualMend
```

### Runs reaching combat — 2026-07-17 UTC (24)

```text
run-2026-07-17T03-57-38-360Z-LUG3 | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:hedge
run-2026-07-17T03-59-30-985Z-LUG3 | cs/r 1/0 | 0-0 | F1 | end:open | P1/B0 | body:quakeCap
run-2026-07-17T04-01-20-204Z-5J4J | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:frugal
run-2026-07-17T04-01-59-634Z-5J4J | cs/r 6/6 | 5-1 | F1 | end:lost | P1/B0 | body:leverage | boss:hydra:l
run-2026-07-17T04-03-39-356Z-N7CT | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:pyramidRogue
run-2026-07-17T20-01-11-910Z-W4ME | cs/r 1/0 | 0-0 | F1 | end:open | P1/B0 | body:quakeCap
run-2026-07-17T20-01-52-514Z-F9W9 | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:leverage
run-2026-07-17T20-30-55-585Z-VNPC | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:discountDuel
run-2026-07-17T20-31-19-750Z-VNPC | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:ratBaron
run-2026-07-17T20-32-44-204Z-VNPC | cs/r 6/6 | 5-1 | F1 | end:lost | P1/B0 | body:hedge | boss:litigationLich:l
run-2026-07-17T20-38-58-884Z-VNPC | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:pyramidHead
run-2026-07-17T20-39-21-010Z-VNPC | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:pyramidRogue
run-2026-07-17T20-39-49-190Z-VNPC | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:bloodfund
run-2026-07-17T20-40-29-837Z-VNPC | cs/r 6/6 | 5-1 | F1 | end:lost | P1/B0 | body:counterparty | boss:litigationLich:l
run-2026-07-17T20-43-49-443Z-VNPC | cs/r 7/7 | 6-1 | F2 | end:lost | P1/B0 | body:juggernaut | boss:kraken:w
run-2026-07-17T20-48-51-125Z-VNPC | cs/r 3/3 | 2-1 | F1 | end:lost | P1/B0 | body:frugal>neptune | sw:frugal>neptune
run-2026-07-17T20-52-09-397Z-VNPC | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:rentier
run-2026-07-17T20-52-47-000Z-VNPC | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:econElemental
run-2026-07-17T20-53-12-489Z-VNPC | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:frugal
run-2026-07-17T22-50-56-056Z-37TN | cs/r 1/1 | 1-0 | F1 | end:open | P1/B0 | body:discountDuel
run-2026-07-17T23-39-43-903Z-R3WB | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:leverage
run-2026-07-17T23-40-22-526Z-R3WB | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:pyramidRogue
run-2026-07-17T23-41-41-846Z-R3WB | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:juggernaut
run-2026-07-17T23-42-13-667Z-R3WB | cs/r 5/5 | 4-1 | F1 | end:lost | P1/B0 | body:frugal
```

### Runs reaching combat — 2026-07-18 UTC (31)

```text
run-2026-07-18T00-22-18-995Z-FNCZ | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:juggernaut
run-2026-07-18T00-47-09-305Z-ZC7L | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:frugal
run-2026-07-18T01-53-36-358Z-RFSB | cs/r 1/1 | 1-0 | F1 | end:open | P1/B0 | body:pennyPixie
run-2026-07-18T03-44-02-111Z-XKNE | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:ratTrader
run-2026-07-18T03-45-26-677Z-XKNE | cs/r 6/6 | 5-1 | F1 | end:lost | P1/B0 | body:juggernaut | boss:litigationLich:l
run-2026-07-18T03-51-13-738Z-XKNE | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:bloodfund
run-2026-07-18T03-52-43-906Z-XKNE | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:compound
run-2026-07-18T03-53-23-893Z-XKNE | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:mutualMend
run-2026-07-18T03-54-33-423Z-XKNE | cs/r 4/4 | 3-1 | F1 | end:lost | P1/B0 | body:bloodfund
run-2026-07-18T05-06-57-673Z-UT9M | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:discountDuel
run-2026-07-18T05-07-28-633Z-UT9M | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:ratTrader
run-2026-07-18T05-08-25-839Z-UT9M | cs/r 6/6 | 5-1 | F1 | end:lost | P1/B0 | body:frugal | boss:hydra:l
run-2026-07-18T06-48-20-971Z-AHVL | cs/r 11/11 | 10-1 | F2 | end:lost | P1/B0 | body:counterparty | boss:litigationLich:w
run-2026-07-18T07-02-43-079Z-AHVL | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:hedge
run-2026-07-18T07-03-04-137Z-AHVL | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:frugal
run-2026-07-18T17-21-19-408Z-FD32 | cs/r 1/1 | 1-0 | F1 | end:open | P1/B0 | body:rentier
run-2026-07-18T17-45-55-216Z-D | cs/r 2/2 | 1-1 | F1 | end:lost | P2/B0 | body:ratTrader>discountDuel
run-2026-07-18T17-51-30-461Z-D | cs/r 3/3 | 2-1 | F1 | end:lost | P2/B0 | body:leverage>rentier
run-2026-07-18T17-56-47-778Z-D | cs/r 8/8 | 7-1 | F2 | end:lost | P2/B0 | body:frugal>pennyPixie | boss:kraken:w
run-2026-07-18T18-18-07-046Z-D | cs/r 16/16 | 15-1 | F3 | end:lost | P2/B0 | body:frugal>pennyPixie>heavyHand>fundjin | sw:pennyPixie>heavyHand,heavyHand>fundjin | boss:hydra:w,litigationLich:w
run-2026-07-18T20-36-49-473Z-EKZW | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:ratBaron
run-2026-07-18T20-37-18-900Z-EKZW | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:bloodfund
run-2026-07-18T20-37-36-994Z-EKZW | cs/r 16/16 | 15-1 | F3 | end:lost | P1/B0 | body:leverage | boss:hydra:w,kraken:w
run-2026-07-18T20-48-50-688Z-EKZW | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:bloodfund
run-2026-07-18T20-49-45-446Z-EKZW | cs/r 19/19 | 19-0 | F4 | end:won | P1/B0 | body:counterparty | boss:kraken:w,litigationLich:w,kingMimic:w
run-2026-07-18T21-21-44-110Z-D | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:discountDuel
run-2026-07-18T21-22-59-128Z-D | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:discountDuel
run-2026-07-18T21-23-49-661Z-D | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:bribedBishop
run-2026-07-18T21-25-20-894Z-D | cs/r 2/2 | 1-1 | F1 | end:lost | P1/B0 | body:ratTrader
run-2026-07-18T21-34-48-640Z-D | cs/r 1/1 | 0-1 | F1 | end:lost | P1/B0 | body:bloodfund
run-2026-07-18T21-36-22-491Z-D | cs/r 1/1 | 1-0 | F1 | end:open | P1/B0 | body:counterparty
```

## Exact commands and queries

Run from `C:\Users\dakot\king-mimic` in PowerShell. The fixed `head` is intentional; using `cat` now will include later append-only production activity and produce different counts.

```powershell
git branch --show-current
git rev-parse --short HEAD
bunx @railway/cli status
bunx @railway/cli ssh wc -l /var/data/telemetry.jsonl
bunx @railway/cli ssh head -n 4480 /var/data/telemetry.jsonl | bun tools/telemetry-report.js --stdin
bunx @railway/cli ssh find /var/data/combatlogs -maxdepth 1 -type f -print
bunx @railway/cli ssh find /var/data/combatlogs -maxdepth 1 -type f -exec cat '{}' + | bun -e 'const s=await Bun.stdin.text();const n=r=>(s.match(r)||[]).length;console.log({bytes:s.length,won:n(/COMBAT WON/g),lost:n(/COMBAT LOST/g),begins:n(/Combat begins/g),downs:n(/goes DOWN/g)})'
bunx @railway/cli ssh cat /var/data/combatlogs/run-2026-07-18T18-18-07-046Z-D.log
bunx @railway/cli ssh tail -n 120 /var/data/combatlogs/run-2026-07-18T20-37-36-994Z-EKZW.log
bunx @railway/cli ssh tail -n 100 /var/data/combatlogs/run-2026-07-16T16-07-21-007Z-XLTA.log
bunx @railway/cli ssh tail -n 80 /var/data/combatlogs/run-2026-07-18T20-49-45-446Z-EKZW.log
```

The exact final population query was:

```powershell
bunx @railway/cli ssh head -n 4480 /var/data/telemetry.jsonl | bun -e 'const es=(await Bun.stdin.text()).trim().split(/\n/).map(JSON.parse);const set=x=>new Set(es.filter(x).map(e=>e.runId).filter(Boolean));const n=set(e=>e.type===`run_start`&&e.harness!==true),h=set(e=>e.type===`run_start`&&e.harness===true),cs=set(e=>e.type===`combat_start`&&e.harness!==true),rr=set(e=>e.type===`room_result`&&e.harness!==true),ends=set(e=>e.type===`run_end`&&e.harness!==true),results=es.filter(e=>e.harness!==true&&e.type===`room_result`),runEnds=es.filter(e=>e.harness!==true&&e.type===`run_end`);console.log(JSON.stringify({rawEvents:es.length,allRuns:set(e=>e.type===`run_start`).size,harnessEvents:es.filter(e=>e.harness===true).length,harnessRuns:h.size,filteredEvents:es.filter(e=>e.harness!==true).length,humanClassifiedRuns:n.size,combatStartEvents:es.filter(e=>e.harness!==true&&e.type===`combat_start`).length,combatStartRuns:cs.size,resultEvents:results.length,resultRuns:rr.size,wins:results.filter(e=>e.result===`won`).length,losses:results.filter(e=>e.result===`lost`).length,endedRuns:ends.size,runWins:runEnds.filter(e=>e.result===`won`).length,runLosses:runEnds.filter(e=>e.result===`lost`).length,noCombatRuns:[...n].filter(id=>!cs.has(id)).length,startedNoResult:[...cs].filter(id=>!rr.has(id))},null,2))'
```

The exact pool/count query was:

```powershell
bun -e 'import * as G from `./game.js`;const rows=G.PLAYER_POOL.map(k=>({key:k,name:G.KIT[k].name,cost:G.KIT[k].cost,kind:G.cardKind(k),text:G.KIT[k].text,ops:G.KIT[k].ops}));console.log(JSON.stringify({count:rows.length,costs:[...new Set(rows.map(r=>r.cost))].sort((a,b)=>a-b),byCost:Object.fromEntries([...new Set(rows.map(r=>r.cost))].sort((a,b)=>a-b).map(c=>[c,rows.filter(r=>r.cost===c).length])),rows},null,2))'
```

The archetype matrix used the rule table in “Card-pool classification” against flattened nested `KIT[*].ops`. Source review also checked `PLAYER_CARD_CATALOG`, `ARCHIVED_PLAYER_CARDS`, `PLAYER_POOL`, `STARTER_CARD_POOL`, and `STARTER_DECK` in `engine/cards.js`; only `PLAYER_POOL` counts as the collectible audit population.

## Limits and reproducibility notes

- **Identity limit:** `harness:false` is the repository's formal human provenance class, but it is not cryptographic proof of a physically human operator. The report therefore says “telemetry-classified human” whenever that distinction matters.
- **Version mixing:** the three-day production window spans code changes. Aggregate trajectory is observational and cannot isolate player learning from build changes.
- **Open runs:** lack of `run_end` is not a win or loss. The inventory keeps those rows explicit rather than coercing them into outcomes.
- **Schema evolution:** detailed card facts and structured lethal sources appear only where `metricsVersion`/logging supported them. Missing old fields are not zero-effect evidence.
- **Selection:** body and boss rates are not randomized. Deep builds both reach later bosses and may swap into elite bodies.
- **Append-only boundary:** this report is complete through line 4,480. Production events appended afterward require a new snapshot; they are not silently mixed into these denominators.

Final verification command:

```powershell
git diff --check -- PLAYTEST_AUDIT_2026-07-18.md
```
