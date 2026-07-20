# Wearable-Body Passive Trigger Audit — 2026-07-20

## Verdict

- At pinned source `96ffb76f4b945edcdbbdeed116a1a035f9d5adc9`, **14 of the 37 wearable bodies have 16 upgrade rows that directly lower, add, or accelerate a recurring passive gate**. Twelve rows change a literal threshold/period; four add or accelerate a second progress path.
- **Bankrupt Basilisk is the only row that reaches a one-moxie passive trigger.** Its legal level-5 Mastery + Specialty-rank-2 allocation produces exactly **2 poison to every foe in its lane per 1 moxie spent**. That is 6x the base poison-per-moxie rate before counting lane width or later poison ticks.
- I made **no balance edit**. A runtime floor of 2 alone would leave Specialty rank 2 purchasable but mechanically dead. Lowering the cap to 1 is mechanically clear, but saved rank-2 allocations need an owner-approved refund/migration rule, and `test/game.test.js` currently locks the cap at 2 outside this packet's owned test files.
- Required baseline passed: `bun run test/body-passives.test.js` -> **222/222 matrix cells + 148/148 same-level controls = 370 causal executions, 0 failed**.

## Scope and method

Included: a Mastery or Specialty that changes the counter, time period, affordability gate, or progress rate of a **recurring body-owned effect**, including an additional independent trigger path. Excluded: one-time combat openers and general card-cost modifiers that do not gate a recurring body effect.

This is a runtime trace, not a copy review. I compared all 37 rows in `BODY_UPGRADES` against:

- base body fields in `engine/bodies.js`;
- rank transforms in `leveledBody`, `leveledPassives`, and `applyCombatStart`;
- actual counter draining in `advancePassive` and the spend/play/gain/damage callers;
- actual clocks in `tickTimers`, `tickRegens`, and summon moxie generation;
- special paths in `atlasReflect`, `summonBodies`, `oligarchyOnDamage`, `oligarchyStolenCost`, `playCard`, and `foeCast`;
- causal tests in `test/body-passives.test.js` and adjacent structural/combined coverage in `test/game.test.js`.

Common runtime facts that matter to every row:

- Ten engine ticks equal one second.
- Spend/play/gain/damage counters retain remainder. `advancePassive` uses a `while`, so one large input can cross a threshold multiple times.
- Spend thresholds receive the **actual paid card cost**. A free card contributes zero spend.
- The same mechanics run for heroes and foes. The body-passive matrix covers both sides.
- Mastery costs 2 points and is capped at one. Specialty costs 1 point per rank and is repeatable unless its row declares a cap.
- Ranked matrix profiles isolate one row at a time. Unless called out below, they do not causally exercise Mastery and Specialty together or the final reachable Specialty rank.

## A. Literal threshold and period reducers

### 1. Paid Piper — Mastery

| Field | Runtime result |
|---|---|
| Base gate | Every 3 cards played |
| Ranked gate | Every 2 cards played |
| Effect | Summon 2 rats; Specialty independently adds 1 body per rank to every Piper summon effect |
| Reachable minimum | 2 cards (one-time Mastery) |
| Risk | Mastery is 1.5x trigger frequency. With Specialty 1, the passive moves from 2 rats / 3 cards to 3 rats / 2 cards: **2.25x rat throughput**. Higher Specialty is uncapped. Rat merging reduces entity count but still adds rat HP and Bite count. |
| Tests | `body-passives`: base/Mastery/Specialty, hero+foe, and same-level controls. `game.test`: combined transform checks the 2-card gate structurally. No combined causal or high-rank test. |

Trace: `BODIES.hedge.passive[0].play = 3`; `leveledPassives` changes it to 2; `playTriggerPassives` advances once per card; `summonBodies` adds Piper Specialty bodies.

### 2. Interest Imp — Mastery

| Field | Runtime result |
|---|---|
| Base gate | Every 4 moxie spent |
| Ranked gate | Every 3 moxie spent |
| Effect | Gain +1 all damage; Specialty also grants `1 + rank` shield per trigger (2 at rank 1) |
| Reachable minimum | 3 moxie |
| Risk | 4/3 as many permanent-in-combat damage ramps per moxie. Specialty shield is delivered at the faster rate, so the cadence and payload compound. Large paid costs can trigger multiple times. |
| Tests | `body-passives` causally covers both sides and same-level controls, but tests Mastery and Specialty separately. `game.test` checks combined gate + shield ops structurally. |

Trace: base `{ spend: 4 }`; `leveledPassives` sets `spend = 3`; `spendTriggerPassives` drains actual cost through `advancePassive`.

### 3. Crypto-Chimera — Mastery

| Field | Runtime result |
|---|---|
| Base gate | Every 3rd card |
| Ranked gate | Every 2nd card |
| Effect | Deal `1 + Specialty rank` ranged damage to every foe in the lane |
| Reachable minimum | 2 cards |
| Risk | With Specialty 1, throughput moves from 1 / 3 cards to 2 / 2 cards: **3x damage per card per lane target**. Specialty is uncapped and lane width multiplies total output. |
| Tests | `body-passives` causal, both sides, same-level controls, rows isolated. `game.test` checks the combined 2-card/2-damage transform structurally. No combined lane-width causal test. |

Trace: base `{ play: 3 }`; Mastery sets 2; Specialty sets op amount `1 + s`; the lane op resolves symmetrically.

### 4. Pyramid-Scheme Head — Mastery

| Field | Runtime result |
|---|---|
| Base gate | Every 3 cards played |
| Ranked gate | Every 2 cards played |
| Effect | Arm the next card as free; Specialty adds +1 flat output per rank to that free card |
| Reachable minimum | 2 cards |
| Risk | The free card still advances the play counter, so after setup the Mastery can make roughly every other card free. The free card contributes zero to spend-trigger passives, while Specialty amplifies its full amount-bearing ops. |
| Tests | `body-passives` covers both rows separately on hero+foe with controls. `game.test` structurally checks the 2-card gate. No combined multi-cycle causal test. |

Trace: base `{ play: 3, ops: freeNext }`; Mastery sets 2; `playCost` consumes `freeNext` as cost 0; `playTriggerPassives` still counts the cast.

### 5. Atlas, Shrugging — Mastery

| Field | Runtime result |
|---|---|
| Base gate | Every 10 gross damage taken |
| Ranked gate | Every 8 gross damage taken |
| Effect | Deal `5 + melee bonus + ranged bonus` to every opponent in Atlas's lane; Specialty base becomes `6 + rank` (7 at rank 1) |
| Reachable minimum | 8 gross damage |
| Risk | Rank-1 combined base component moves from 5/10 to 7/8: **1.75x output per incoming damage**, before stat bonuses and lane multiplicity. Shield-absorbed damage counts. One large hit can cause multiple SHRUGs; a room guard prevents SHRUG-to-SHRUG cascades. |
| Tests | `body-passives` covers base/M/S, both sides, controls. `game.test` causally covers combined Mastery + Specialty 2 for a hero. No combined foe or multi-threshold-hit case in the body matrix. |

Trace: `atlasReflect` selects 10 or 8, accumulates landed damage, and drains it in a `while`.

### 6. Bankrupt Basilisk — Specialty

| Field | Runtime result at pinned source |
|---|---|
| Base gate | Every 3 moxie spent |
| Ranked gate | `max(1, 3 - Specialty rank)`: rank 1 = 2; rank 2 = 1 |
| Effect | Poison every foe in the lane by 1; Mastery changes each application to 2 |
| Reachable minimum | **1 moxie at Specialty 2** (current cap 2) |
| Risk | Base rate is 1/3 poison per moxie per target. Mastery + Specialty 1 is 2/2 = 3x base. Mastery + Specialty 2 is **2/1 = 6x base**. A large paid cost fires once per moxie at rank 2. Poison stacks persist and deal the full stack every 6 seconds; lane width multiplies the application. |
| Tests | `body-passives` covers Mastery alone (2 poison / 3) and Specialty 1 alone (1 / 2), both sides and controls. `game.test` structurally covers Mastery + Specialty 1 (2 / 2) and explicitly locks cap 2 as legal. **No test covers the exact legal Mastery + Specialty 2 state.** |

Exact screenshot explanation from code:

1. Basilisk base is `{ spend: 3, poison amount: 1, target: lane }`.
2. Mastery sets poison amount to 2.
3. Specialty rank 2 sets the spend threshold to `max(1, 3 - 2) = 1`.
4. The allocation costs 4 points total (Mastery 2 + two Specialty ranks), so it is legal at run level 5.
5. Each paid moxie advances the accumulator by one; the `while` drains every crossed threshold.
6. `target: lane` applies the poison amount to every opposing body in that lane.

This is the reported **2 poison per 1 moxie** state. It is not a display bug or test-fixture artifact.

### 7. Debt Dragon — Mastery

| Field | Runtime result |
|---|---|
| Base gate | Every 10 moxie actually gained |
| Ranked gate | Every 8 moxie gained |
| Effect | +3 melee and +3 ranged; Specialty makes each `3 + rank` |
| Reachable minimum | 8 gained moxie |
| Risk | With Specialty 1, each stat grows at 4/8 versus 3/10: **1.67x stat gain per credited moxie**. The bonuses stack for the combat. Haste and moxie-gain cards accelerate the clock; gain while already at the 10-moxie cap contributes zero. |
| Tests | `body-passives` causal, both sides, controls, rows isolated. `game.test` combined transform structural only. No combined repeated-trigger causal test. |

Trace: `gainTriggerPassives` receives the actual before/after gain delta and drains `{ gain: 10|8 }` through `advancePassive`.

### 8. Nepotistic Neptune — Mastery

| Field | Runtime result |
|---|---|
| Base gate | A post-body-cost card costing 6+ resolves twice; body tax is +2 (cap 10) |
| Ranked gate | Cost 5+ resolves twice; tax becomes +1 |
| Effect | Replay the entire card; Specialty grants `1 + rank` shield on each replay-qualified cast (2 at rank 1) |
| Reachable minimum | 5 paid moxie for a qualifying card |
| Risk | Both the tax and threshold fall by one, so the raw-card eligibility set stays effectively the same (raw cost 4+); qualifying cards simply cost one less. The full card ops double, not just damage, and Specialty shield arrives at the cheaper cadence. |
| Tests | `body-passives` uses a below-threshold Sword and threshold Hatchet on both sides, separately for M/S, with controls. `game.test` checks the combined body fields. No combined causal replay+shield test. |

Trace: `leveledBody` sets `costAdd = 1` and `doubleExpensive = 5`; `playCard`/`foeCast` compute actual cost, then multiply resolution count by 2.

### 9. Stockbroking Sphinx — Mastery

| Field | Runtime result |
|---|---|
| Base gate | Every 6 moxie spent |
| Ranked gate | Every 5 moxie spent |
| Effect | Deal `1 + Specialty rank + ranged bonus` to the foe lane and heal total damage dealt; overheal becomes shield |
| Reachable minimum | 5 moxie |
| Risk | At Specialty 1, the flat component moves from 1/6 to 2/5: **2.4x per-moxie output** before ranged bonus. Lane width multiplies both total damage and resulting healing/shield. Large spends can cross more than one threshold. |
| Tests | `body-passives` causal, both sides, controls, rows isolated. `game.test` checks combined threshold/amount structurally. No combined multi-target causal case. |

Trace: base `{ spend: 6, lifesteal, target: lane }`; Mastery sets 5; Specialty sets amount `1 + s`; shared resolver returns total lane damage to lifesteal.

### 10. Wandering Castle — Mastery

| Field | Runtime result |
|---|---|
| Base gate | Any card with actual cost 5+ |
| Ranked gate | Actual cost 4+ |
| Effect | Gain shield equal to paid cost, plus the body's shield bonus; Specialty raises every shield gain from this body by +1 per rank (base bonus is already +1) |
| Reachable minimum | 4 paid moxie |
| Risk | A rank-1 combined minimum cast grants 4 + 2 = 6 shield, versus the base minimum 5 + 1 = 6, but does it for 20% less moxie. Specialty's shared `shieldPlus` also buffs other shield sources, not just the costly-cast trigger. |
| Tests | `body-passives` causally covers a cost-4 Mastery cast and cost-5 Specialty cast on both sides with controls. `game.test` checks the combined body fields, not a combined cast. |

Trace: `leveledBody` changes `costlyShield` 5 -> 4; `playCard`/`foeCast` compare the actual cost and grant `cost + shieldPlus`.

### 11. Timeshare Tyrant — Specialty

| Field | Runtime result |
|---|---|
| Base gate | Amalgamation service every 12 seconds |
| Ranked gate | `max(3, 12 - rank)` seconds |
| Effect | If alive: full-heal and add +1 damage/+1 protection; if dead: revive at the retained service tier |
| Reachable minimum | 3 seconds at Specialty 9 (declared cap 9) |
| Risk | At cap, heal/revive and permanent service growth happen **4x as often**. With Mastery, the Amalgamation's 6-moxie action also reaches its gate every 3 neutral seconds, aligning both clocks. |
| Tests | `body-passives` causally covers rank 1 only (11 seconds), heal, growth, defeat, and revive on both sides with controls. `game.test` checks combined M+S1 period and validates cap 9 allocation, but does not run the 3-second cap or combined clock lifecycle. |

Trace: `applyCombatStart` sets period `max(30, 120 - 10*s)`; `tickRegens` calls `serviceTimeshare` on the period.

### 12. Moneymancer — Mastery

| Field | Runtime result |
|---|---|
| Base gate | Arm the next ranged discount every 6 seconds |
| Ranked gate | Every 5 seconds |
| Effect | Discount is `3 + Specialty rank`; it floors the next ranged card at zero moxie |
| Reachable minimum | 5-second arm cadence |
| Risk | At most 20% more discount charges if each is consumed. Specialty 7 makes every currently live ranged card free (current max cost is 10). Specialty has no cap, so rank 8+ is currently purchasable with no further cost reduction. Unused charges overwrite rather than stack. |
| Tests | `body-passives` causal, both sides, controls, rows isolated, including arm/retain/consume. `game.test` checks combined 5-second/+4 state. No high-rank/free-card or combined repeated-cycle test. |

Trace: `applyCombatStart` sets period 50 or 60 and discount `3+s`; `tickRegens` arms `nextRangedDiscount`; `playCost` clamps the ranged cost at 0.

## B. Added or accelerated progress paths

These rows do not simply replace `N` with a smaller `N`, but they make a recurring passive resolve sooner or more often and therefore belong in the cadence ledger.

### 13. Fundjin & Raising-Profitsjin — Mastery

| Field | Runtime result |
|---|---|
| Base gate | Two independent 6-second timers |
| Ranked gate | Timers remain 6 seconds **and** each god gains an independent every-6-moxie-spent gate |
| Effect | Fundjin hits the lane once; Raising-Profitsjin hits front twice. Each hit is `1 + Specialty rank`. |
| Reachable minimum | 6 seconds or 6 spent moxie, whichever path fires; neither path consumes the other's progress |
| Risk | At natural 1 moxie/sec with continuous spending, Mastery can nearly double trigger frequency because time and spend clocks coexist and may land together. Specialty 1 doubles every hit, so one-target potential is 3 base damage/6s versus 6 timer + 6 spend damage/6s: up to **4x** under ideal spending. Haste can feed the spend path faster. |
| Tests | `body-passives` explicitly proves no spend path without Mastery, 3 spend damage with Mastery, no early timer fire, and timer fire at 60 ticks; both sides and controls. `game.test` checks combined M+S1 structure. No combined simultaneous-clock causal test. |

Trace: Mastery leaves `every: 60` intact and adds `spend: 6` to both passives; timer and spend code keep separate accumulator stores.

### 14. Timeshare Tyrant — Mastery

| Field | Runtime result |
|---|---|
| Base progress | Owned summons gain moxie at 1x |
| Ranked progress | Owned summons gain moxie at 2x |
| Effect | Every body summoned by Timeshare, including the Clockwork Amalgamation and merged rat stacks, reaches its own card-cost gate twice as fast |
| Reachable minimum | Amalgamation's 6-moxie action moves from 6 to 3 neutral seconds |
| Risk | Broad source-wide multiplier, not Amalgamation-only. It compounds with Specialty 9's 3-second service clock; Slow halves the doubled rate back to the normal rate. |
| Tests | `body-passives` directly checks Amalgamation moxie progress on both sides with controls. It does not causally combine Mastery with high Specialty or test non-Amalgamation summons. |

Trace: `summonBodies` stamps `moxieGainMul = 2` on every Timeshare-owned summon; `regenMoxie` multiplies progress by it.

### 15. Oligarchy Ooze — Mastery

| Field | Runtime result |
|---|---|
| Base gate | Auto-cast held stolen card at `min(10, 2 x base card cost)` moxie |
| Ranked gate | `min(10, base card cost)` moxie |
| Effect | Resolve the entire stolen card; the card stays held and can replay repeatedly |
| Reachable minimum | 1 moxie for a cost-1 stolen card (base minimum is 2) |
| Risk | Exact 2x cadence improvement for costs 1-5, smaller for costs 6-9 because base caps at 10, and no Mastery advantage for cost 10. Full summon/control/damage ops replay, not merely a flat hit. Specialty hit-payments can satisfy the lowered threshold immediately. |
| Tests | `body-passives` uses a cost-3 Sword to prove 6 -> 3, executes the replay, and proves the card remains held; both sides and controls. Mastery and Specialty are tested separately, not combined. |

Trace: `oligarchyStolenCost` chooses multiplier 2 or 1; `tryOligarchyCast` gets first claim on banked moxie every simulation tick and retains `oozeStolenKey`.

### 16. Oligarchy Ooze — Specialty

| Field | Runtime result |
|---|---|
| Base progress | Later damaging hits add 0 moxie toward the held card |
| Ranked progress | Every later damaging hit adds Specialty rank moxie, capped by the global 10-moxie bank |
| Effect | Advances the recurring stolen-card replay gate |
| Reachable minimum | From zero natural moxie, `ceil(replay cost / rank)` later hits; rank 10 pays any capped replay in one later hit |
| Risk | Multi-hit cards can steal on their first landed hit and immediately pay on later hits of the same card. Shield-absorbed landed damage still pays. With Mastery, lower replay costs further reduce hits-to-cast. Specialty has no cap; rank 11+ is presently a purchasable no-op versus the 10-moxie cap. |
| Tests | `body-passives` proves one later hit pays 1 moxie at Specialty 1 and covers replay/retention separately on both sides with controls. No combined M+S, multi-hit-first-card, or rank-10 test. |

Trace: `oligarchyOnDamage` runs for every positive landed hit, before the ordinary `noReact` gate, and adds `specialtyRank` moxie; `tryOligarchyCast` runs on the next combat tick.

## Exhaustiveness cross-check: rows deliberately excluded

The following look tempo-adjacent in upgrade copy but do **not** shorten a recurring body trigger in current code:

- Fat Cat and Royal Rat keep their base 3-damage / 3-spend gates; ranks change payloads.
- Toll Troll, Vengeful Vampire, Market-Crash Minotaur, Bond Behemoth, Weary Wageslave, Bribed Bishop, Cheque Cherub, Audit Angel, Medusa, Depression Demon, Bookie Bonelord, Affluence Anubis, Economy Elemental, and Warewolf keep their trigger conditions/periods; ranks change output, duration, or secondary effects.
- Malevolent Mouse Specialty, Lizard Wizard Mastery/Specialty, Penny-Pinching Pixie Mastery, and Killionaire Specialty reduce or refund card costs, but they do not gate a recurring body-owned passive. Killionaire/Centaur/Minotaur/Behemoth opening grants are one-time combat starts, not cadence changes.
- Affluence Anubis is specifically fixed at 6 seconds in current runtime; Mastery and Specialty increase wave growth. Bookie Bonelord is fixed at 12 seconds; Specialty increases wave size. Older copy/history that describes faster clocks is not current behavior.

## Basilisk decision required — no edit made

Dakota's boundary, “1 moxie should never be that strong,” is consistent with a 2-moxie floor. The remaining decision is what happens to the currently legal second Specialty rank and any saved allocation that already owns it.

### Option A — retire rank 2 and refund it as unspent (recommended mechanical guard)

- Set Specialty cap to 1.
- Change both runtime and combat text to a minimum threshold of 2.
- Normalize existing Basilisk Specialty 2 to Specialty 1 and leave one level point unspent for the owner to reallocate.
- Resulting maximum combination: Mastery + Specialty 1 = 2 poison per 2 moxie. No new purchase can be a no-op.

This is the smallest rule that exactly enforces the boundary without inventing a new Basilisk effect. It still needs explicit saved-run normalization: `validLevelAllocation` would reject a saved rank-2 allocation, but `applyBodyLevel` then calls `legacyLevelAllocation`, whose complete-integer-shape fast path returns that allocation unchanged. `specialtyRank` would keep reading 2 while `allocationPoints` reports infinity; with a runtime floor of 2 the extra rank would be mechanically dead and the spent/unspent-point projection would be invalid rather than refunded.

### Option B — retire rank 2 for new purchases and grandfather saved rank 2 until reallocation

- New allocations cap at Specialty 1 and runtime/text floor at 2.
- A compatibility validator accepts a saved Specialty-2 Basilisk only long enough to expose one refundable/unspent point; the extra legacy rank has no mechanical benefit and cannot be bought again.
- Resulting combat maximum is still 2 poison per 2 moxie.

This preserves active-run continuity but adds a legacy state path. It is less mechanically minimal than Option A and temporarily displays a grandfathered dead rank.

### Option C — keep two purchasable ranks, but Dakota authors rank 2's replacement effect

- Runtime/text threshold floor becomes 2.
- Specialty cap remains 2 only if rank 2 receives a real, non-cadence effect authored by Dakota.
- No engine change should guess that effect or its number.

This preserves the two-rank progression shape but is a balance/design decision, so this audit stops before it.

## Test gaps worth closing with the chosen guard

The current 370-case matrix is strong on symmetry and same-level negative controls, but its three profiles are isolated. A Basilisk patch should add, at minimum, without weakening that matrix:

1. hero and foe causal cases for Mastery + maximum legal Specialty;
2. a same-level control spending the same point budget without those rows;
3. an assertion that the next Specialty rank is rejected, so the floor cannot create a purchasable no-op;
4. a saved-rank-2 normalization test matching the selected Option A or B;
5. exact runtime prose matching the enforced minimum.

Adjacent audit gaps, not authorization to rebalance: Timeshare's 3-second cap, Ooze's rank-10 hit payment, and Moneymancer's all-ranged-free rank are not causally covered at their reachable maxima.

## Reproduction commands

```powershell
git rev-parse HEAD
git merge-base --is-ancestor 96ffb76f4b945edcdbbdeed116a1a035f9d5adc9 HEAD
bun run test/body-passives.test.js
rg -n "Trigger every|threshold|clock|twice as fast|normal moxie cost|pays .*moxie|first\.spend|first\.play|period: Math\.max|moxieGainMul|oligarchyStolenCost" engine/leveling.js engine/combat.js
```
