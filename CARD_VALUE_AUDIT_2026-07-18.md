# King Mimic collectible treasure-value audit

Audit date: 2026-07-18 (CDT)

Runtime/source baseline: `feat/room-draft-overhaul` at `704ee19`

Production evidence boundary: the first 4,480 lines of Railway
`/var/data/telemetry.jsonl`, identical to `PLAYTEST_AUDIT_2026-07-18.md`.
Events with `harness === true` and player rows with `bot === true` are excluded.

This is a structural and observational audit, not a tuning pass. It proposes no
card, effect, number, value reassignment, or balance change.

## Executive read

- The collectible treasure-value field is `KIT[key].ante`, exposed to economy
  code as `itemTreasure(key)` and to clients as card-descriptor `value`. The
  current `TEMP_CARD_VALUE_TIERS` overlay assigns every collectible exactly one
  integer value from **1 through 5**. This is separate from moxie `cost` and from
  a foe's total threat `anteOfFoe`.
- `PLAYER_POOL` contains **79** cards worth **◈203** in total: V1 **20 (25.3%)**,
  V2 **17 (21.5%)**, V3 **24 (30.4%)**, V4 **13 (16.5%)**, and V5 **5 (6.3%)**.
  There is no empty integer band in the full V1-V5 pool span.
- The value-axis gaps differ sharply from the prior cost-axis gaps. Summon has
  no V1, V2, or V5 member and only one V4 member. Resource/scaling has no V1
  member. Every other archetype covers all five bands, but V5 is thin for melee,
  defense, control, and resource; ranged is thin at V2.
- Value and raw moxie cost are related but not interchangeable. Mean raw cost
  rises from **3.50 at V1** to **6.60 at V5**, yet the ordinal Spearman
  correlation is only **0.395**. Current high-value cards span raw costs 2-10,
  while low-value cards span 1-10; function, timing, conditions, and combat
  potency are doing different work from collectible price.
- Frozen human-seat combat telemetry contains **2,882 draws / 1,826 casts** for
  current-pool cards. Weighted cast/draw conversion is 61.7% at V1 and 66.3-70.9%
  at V2-V5, while unaffordable held time rises to 84.8% at V5. These are
  exposure- and survival-selected observations, not evidence that a value band
  causes better conversion.
- Loot and melt telemetry mostly validates value flow, not card valuation. Solo
  auto-collected all 985 offered cards; co-op claimed 241/243 offered cards by
  the boundary; 186 melts minted **◈1,549**, but melt events record only the
  aggregate payout, not which cards were melted. The snapshot has one shop
  offer, zero buys, and no trade interactions, so those surfaces cannot rank
  values observationally.

## What treasure value is, and every surface it drives

### Exact source field and non-equivalent axes

For collectible cards, treasure value is the integer in `KIT[key].ante` after
`TEMP_CARD_VALUE_TIERS` is applied in `engine/kit.js`. The accessor is:

```js
export const itemTreasure = (key) => (KIT[key]?.ante ?? 1);
```

`TEMP_CARD_VALUE_TIERS` is exhaustive over the current normal `PLAYER_POOL` and
overwrites each listed card's earlier authored `ante`. Snapshot code renames the
same number to `value`, so `card.value` in the client is not a second source.

The three axes must not be collapsed:

| Axis | Source | Meaning |
|---|---|---|
| Collectible treasure value, ◈V | `KIT[key].ante` via `itemTreasure(key)` | Persistent acquisition, tender, loot, and generation weight; current range 1-5 |
| Raw moxie cost, ⚡C | `KIT[key].cost`; live cost via `cardCost(key, body)` | In-combat affordability; body discounts/adders can change it, current raw range 1-10 |
| Foe/room threat, ⚖ | `anteOfFoe(f)` / node `ante` | `4` foe base + carried-card values + level premium + elite-body premium; it is not a card's ◈V |

The foe's flat 4 is threat-only. `foeLootValue(f)` removes that base and returns
carried-card value plus level/elite surplus. Elite-body adoption prices and
level-up prices are separate costs denominated in the same ◈ tender unit; they
are not a card field.

### Runtime consumers

1. **Offer and foe-kit population.** `PLAYER_POOL` is the normal draft, loot,
   shop, and foe-gear universe. The current `STARTER_CARD_POOL` is exactly the 20
   V1 cards, although that starter list is explicit rather than dynamically
   filtered from `ante`. Base foe kits do directly select V1 cards. Budgeted rich
   upgrades select V2-V5 cards, charge the exact value difference, and preserve
   total foe ante. Passive-synergy replacement may substitute only a same-value
   card, preserving both count and threat.
2. **Room threat and drops.** A carried card adds its value to `anteOfFoe` and
   drops as itself on victory. Level, elite-body, and room-effect reward surplus
   is converted by `rollCompItems(value)` into collectible cards whose values
   sum exactly to that surplus. Room previews show ⚖ threat separately from ◈
   droppable value.
3. **Boss and special generation.** `RARE_POOL` is the V3-V5 subset used for the
   boss reward shelf. The Djinn item pool admits damage cards at value at most 2.
   `RICH_ITEM_POOL` supplies budgeted foe upgrades and compensatory drops.
4. **Combat entities.** A Djinn-conjured or Kraken-stolen item entity gets
   `maxHp = max(1, itemTreasure(itemKey))`. Treasure value therefore affects this
   special combat body's durability even though it does not pay the card's cast.
5. **Solo and co-op loot.** Solo automatically moves every drop into the
   backpack. In co-op, the total value of each new drop batch is divided into
   persistent per-seat bid points; a claim spends the claimed card's value.
   Unclaimed cards and already-funded claim budget carry forward.
6. **Shop tender.** A ware's price is its card value. The authoritative engine
   accepts selected owned cards whose total value covers the ware and consumes
   spares before deck copies. The current client presents exact-value payments
   only and hides an overshooting choice. Banked treasure is not accepted in the
   shop; rerolls are free.
7. **Player-to-player trade.** Cross-seat trades require one card each and equal
   card values, checked at proposal and acceptance. Same-seat squad moves/swaps
   do not enforce value because they do not cross the owning seat's economy.
8. **Level and body tender.** `tenderValue` consumes owned cards whose values
   cover a cost. `tenderWithTreasure` lets banked treasure pay only the shortfall;
   excess selected-card value is consumed, never returned. Level-ups and first
   elite-body adoptions use this mixed tender. The minimum deck is protected.
9. **Melt.** `convertBackpack` leaves every deck copy untouched, melts all spare
   backpack copies, and adds their exact summed values to the per-run treasure
   bank. The bank persists across rooms and resets on a new run.
10. **Presentation and telemetry.** Deck, backpack, hand, loot, shop, tender,
    melt, and trade surfaces render descriptor `value`. Telemetry records card
    keys for offers/claims/edits/casts and aggregate `value` for a melt; value-band
    analysis joins those keys back to the frozen source rather than trusting a
    second telemetry price.

## Complete collectible inventory and arithmetic

This is the sole complete inventory in this report. Each `PLAYER_POOL` key appears
once, grouped by value. `C` is raw moxie cost. Archetype tags use the mechanical
rules below and may overlap.

### V1 — 20 cards, ◈20

```text
oSword              Sword                         C3  melee
oHatchet            Hatchet                       C4  melee
oSpear              Spear                         C4  melee
oBow                Bow                           C4  melee
oDagger             Dagger                        C2  melee
oZweihander         Zweihänder                    C6  melee
oIce                Ice                           C5  ranged, control
oLightning          Lightning                     C5  ranged
oArcane             Arcane                        C2  ranged
oWind               Wind                          C3  ranged, control
dBuckler            Tiny Buckler                  C1  defense
dTaunt              Taunt                         C1  control
dShield             Shield                        C3  defense
dHeartGuard         Heart Guard                   C4  defense
dTowerShield        Tower Shield                  C5  defense
oRepeatXbow         Repeating Crossbow            C4  melee
oPileOn             Pile On                       C3  melee
oAnimatedBlade      Animated Blade                C4  melee
oRainblow           Rainblow Blade                C4  melee, ranged
oButterflyKnife     Butterfly Knife               C3  melee
```

### V2 — 17 cards, ◈34

```text
oJavelin            Javelin                       C5  melee
oTwinUchis          Twin Uchis                    C4  melee
oComboBlade         Combo Blade                   C1  melee
oFire               Fire                          C5  ranged
oHoly               Holy                          C4  defense
dShieldBash         Shield Bash                   C3  melee, defense
dThorns             Thorns                        C3  defense
oMoxiePool          Moxie Pool                    C3  resource
oSlow               Slow                          C3  control
oJesterplate        Jesterplate                   C3  resource
oWhip               Whip                          C4  melee
oContinentClub      Continent-Club                C10 melee
oTeleBlades         Telekinetic Blades            C3  control
oMirrorMace         Mirror Mace                   C4  melee
oPunishGlutton      Punishment Glutton            C4  defense
oBansheeWail        Banshee Wail                  C3  control
oGravitySword       Gravity Greatsword            C6  melee, control
```

### V3 — 24 cards, ◈72

```text
oMallet             Mallet                        C5  melee, defense
oPowerUp            Power Up                      C3  resource
oBigWizardHat       Big Wizard Hat                C4  resource
oDark               Dark                          C5  ranged, defense
oForce              Force                         C5  defense
oBlizzard           Blizzard                      C7  ranged, control
dTrollskin          Trollskin Tiara               C2  defense
oHaste              Haste                         C3  resource
oHedgeKnight        Hedgefund Knight              C6  summon
oGlacius            Glacius                       C8  melee
oSharpEdges         Sharpened Edges               C2  resource
oDemonForm          Demon Form                    C3  resource
oSageMode           Sage Mode                     C4  defense, resource
oButcherCleaver     Butcher's Cleaver             C5  melee, defense
oPetLeech           Pet Leech                     C2  defense
oWeakness           Weakness                      C3  control
oDualHand           Dual-Handing Two-Handers      C4  resource
oEarthElemental     Earth Elemental               C5  summon
oLavaElemental      Lava Elemental                C7  summon
oCrossBlade         Cross-Blade                   C5  melee
oMeteorMaul         Meteor Maul                   C7  melee
oTriblade           Triblade                      C5  melee
oCrimsonCrown       Crimson Crown                 C3  summon
oStarblade          Starblade                     C4  melee, resource
```

### V4 — 13 cards, ◈52

```text
oMeteors            Meteors                       C6  ranged
dStoneskin          Stoneskin                     C4  defense
dLiquidMetal        Liquid Metal Crown            C3  defense
oOmnislash          Omnislash                     C6  melee
oBerserker          Berserker Armor               C2  defense, resource
oPowerWordGun       Power Word: Gun               C10 ranged
oGravityShield      Gravity Greatshield           C6  defense, control
oTreasureBlade      Treasure Blade                C4  melee, resource
oLionLance          Lion Lance                    C5  melee, resource
oMirrorShield       Mirror Shield                 C5  defense
oGrandSpirit        Grand Spirit                  C10 summon
oJaw                Jaw                           C5  melee, defense
oRevealLight        Swords of Revealing Light     C7  defense
```

### V5 — 5 cards, ◈25

```text
coolShoes           Cool Shoes                    C3  resource
oMoonGreat          Moonlight Greatsword          C6  melee, ranged
oGiantsBelt         Giant's Belt                  C5  defense
oBlackHole          Black Hole                    C10 ranged
oZaWarudo           Za Warudo                     C9  control
```

### Distribution reconciliation

| Value | Cards | Pool share | Band value | Value-mass share |
|---:|---:|---:|---:|---:|
| 1 | 20 | 25.3% | 20 | 9.9% |
| 2 | 17 | 21.5% | 34 | 16.7% |
| 3 | 24 | 30.4% | 72 | 35.5% |
| 4 | 13 | 16.5% | 52 | 25.6% |
| 5 | 5 | 6.3% | 25 | 12.3% |
| **Total** | **79** | **100.0%** | **203** | **100.0%** |

Checks: `20+17+24+13+5 = 79`; `20×1+17×2+24×3+13×4+5×5 = 203`.
V1-V3 contain 61/79 cards (77.2%) and 126/203 value (62.1%). V4-V5
contain only 18/79 cards (22.8%) but 77/203 value (37.9%).

## Archetype × treasure-value coverage

The rules are identical to the prior audit and flatten nested timer ops:

- **Melee damage:** `deal`/`schoolStrike` plus `cardKind` melee or both.
- **Ranged damage:** `deal`/`schoolStrike` plus `cardKind` ranged or both.
- **Defense/sustain:** shield, heal, lifesteal, reflect, hit cap/reduction,
  health expansion, leech, or periodic heal/shield.
- **Control/position:** pull, reposition, slow, weakness, sap, stasis, or
  telekinetic-blade control.
- **Summon:** `summon` or `summonPick`.
- **Resource/scaling engine:** damage bonus, moxie generation, haste, replay,
  or modal scaling.

`Ø` is empty, `T1` is exactly one member, and an integer 2 or greater is
redundant coverage with the exact count shown.

| Archetype | V1 | V2 | V3 | V4 | V5 | Memberships | Mean V |
|---|---:|---:|---:|---:|---:|---:|---:|
| Melee damage | 11 | 8 | 7 | 4 | T1 | 31 | 2.23 |
| Ranged damage | 5 | T1 | 2 | 2 | 2 | 12 | 2.58 |
| Defense / sustain | 4 | 4 | 7 | 7 | T1 | 23 | 2.87 |
| Control / position | 3 | 4 | 2 | T1 | T1 | 11 | 2.36 |
| Summon | **Ø** | **Ø** | 4 | T1 | **Ø** | 5 | 3.20 |
| Resource / scaling engine | **Ø** | 2 | 8 | 3 | T1 | 14 | 3.21 |

The 30 cells reconcile to row totals `31+12+23+11+5+14 = 96` mechanical
memberships. Memberships exceed 79 because 17 cards occupy two archetypes;
all 79 occupy at least one, so `79 + 17 = 96`.

### Actual gaps and thin roles

- **Melee:** no empty band. V5 is thin; V1-V4 are redundant.
- **Ranged:** no empty band. V2 is thin; all other bands are redundant.
- **Defense/sustain:** no empty band. V5 is thin.
- **Control/position:** no empty band. V4 and V5 are thin.
- **Summon:** V1, V2, and V5 are empty. V4 is thin. Four of five summon
  memberships sit at V3, making summon both the smallest archetype and the most
  value-concentrated.
- **Resource/scaling:** V1 is empty and V5 is thin. Eight of 14 memberships sit
  at V3.

### Prioritized concentration and asymmetry findings

1. **Summon is the dominant value-axis gap:** three empty bands, one thin band,
   and only five total memberships. This is a source fact, not a request to fill
   any band.
2. **Low-value function asymmetry:** V1 has 20 cards but no summon or
   resource/scaling member. Its memberships are dominated by melee (11) and
   ranged (5), with four defense and three control overlaps.
3. **V3 is the functional center:** it is the largest pool band (24/79) and
   contains 4/5 summons plus 8/14 resource/scaling memberships.
4. **V5 is intentionally sparse in coverage terms:** only ranged has redundant
   coverage; melee, defense, control, and resource are thin, and summon is empty.
5. **Melee breadth is much larger than ranged breadth:** 31 versus 12
   memberships. Both cover all values, but melee has redundant coverage through
   V4 while ranged is already thin at V2.
6. **Average membership value differs by function:** summon (3.20) and resource
   (3.21) sit above defense (2.87), ranged (2.58), control (2.36), and melee
   (2.23). Because categories overlap and values are provisional author bands,
   these are composition facts, not calibrated power comparisons.

## Value versus moxie cost and function

### Cross-tab and ordering

| V \\ raw C | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| V1 | 2 | 2 | 5 | 7 | 3 | 1 | 0 | 0 | 0 | 0 |
| V2 | 1 | 0 | 7 | 5 | 2 | 1 | 0 | 0 | 0 | 1 |
| V3 | 0 | 3 | 5 | 4 | 7 | 1 | 3 | 1 | 0 | 0 |
| V4 | 0 | 1 | 1 | 2 | 3 | 3 | 1 | 0 | 0 | 2 |
| V5 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 0 | 1 | 1 |

| Value | Mean raw cost | Median | Raw-cost range |
|---:|---:|---:|---:|
| 1 | 3.50 | 4 | 1-6 |
| 2 | 4.00 | 4 | 1-10 |
| 3 | 4.46 | 5 | 2-8 |
| 4 | 5.62 | 5 | 2-10 |
| 5 | 6.60 | 6 | 3-10 |

Spearman rank correlation is **0.395** (ties average-ranked). Higher treasure
value tends to coincide with higher raw moxie cost, but the spread is too large
to treat one as a proxy for the other. Live cost widens the distinction because
body pricing can reduce, set, or add to raw cost without changing treasure value.

Current source outliers make the separation concrete. V4 includes Berserker
Armor at C2 and Liquid Metal Crown at C3, while V5 includes Cool Shoes at C3.
Conversely, Zweihänder is V1/C6, Gravity Greatsword is V2/C6, and
Continent-Club is V2/C10. Within V5 alone, raw costs range from Cool Shoes C3
through Giant's Belt C5, Moonlight Greatsword C6, Za Warudo C9, and Black Hole
C10. These identify different acquisition-versus-cast valuations; they do not
establish that either number is wrong.

## Frozen production interaction by value

### Evidence boundary

The frozen population reproduces **4,480 events / 162 run IDs**. Removing 95
`harness:true` events / 18 harness run IDs leaves **4,385 events / 144
telemetry-classified human runs**. There are **323** non-harness `room_result`
events and **352 human-seat result rows** after excluding three bot-seat rows.
As in the prior audit, `harness:false` is provenance metadata, not proof of a
physical operator.

### Draw, cast, strand, and affordability observations

| Value | Current cards observed | Draws | Casts | Cast/draw | Stranded draws | Stranded rate | Unaffordable / held ticks | Rejected taps |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 20/20 | 2,303 | 1,422 | 61.7% | 875 | 38.0% | 114,357/184,706 (61.9%) | 56 |
| 2 | 12/17 | 147 | 103 | 70.1% | 43 | 29.3% | 6,713/9,069 (74.0%) | 2 |
| 3 | 20/24 | 265 | 188 | 70.9% | 75 | 28.3% | 11,967/17,076 (70.1%) | 3 |
| 4 | 10/13 | 84 | 58 | 69.0% | 25 | 29.8% | 3,940/5,111 (77.1%) | 2 |
| 5 | 4/5 | 83 | 55 | 66.3% | 28 | 33.7% | 5,250/6,191 (84.8%) | 1 |
| **Total** | **66/79 observed** | **2,882** | **1,826** | **63.4%** | **1,046** | **36.3%** | **142,227/222,153 (64.0%)** | **64** |

V1 dominates exposure because the current starter universe is V1 and later
values must be acquired. High-value cards are additionally selected by survival,
loot, deck editing, body, and player intent. The table therefore cannot support
a causal claim that V2-V5 convert better than V1, or that V5 unaffordability is
mispricing.

Card-level observations reinforce that limit. Taunt (V1/C1) cast 15/58 draws
despite being affordable for 91.3% of held time. Continent-Club (V2/C10) cast
15/22 despite 95.6% unaffordable hold; Power Word: Gun (V4/C10) cast 3/4 at
96.0%; Black Hole (V5/C10) cast 7/22 at 98.6%. Zweihänder (V1/C6) drew 86,
cast 48, and received 18 rejected taps. Those are observational valuation
outliers—use friction, waiting, and eventual conversion—not causal power ranks.

### Loot, deck edits, melt, shop, and trade

| Surface | Frozen evidence | What it can and cannot say |
|---|---|---|
| Loot offers | 1,228 cards worth ◈2,011: V1 820, V2 162, V3 157, V4 49, V5 40 | Generation strongly favors V1 occurrences; this follows base-foe and compensation rules, not player preference |
| Solo claims | 985/985 offered cards auto-collected: 654/142/119/43/27 by V1-V5 | No selection occurs, so solo claims cannot validate relative values |
| Co-op claims | 241/243 offered cards claimed: 166/20/38/5/12 by V1-V5; ◈400/409 claimed | One V4 and one V5 remained in shared spoils at the boundary; carry-forward and bid budgets prevent treating this as rejection |
| Deck edits | 620 human edits; adds by V1-V5: 169/42/68/17/17; removes: 280/11/11/2/3 | V1 removals dominate, but starters and availability dominate the denominator; there is no randomized cross-value offer set |
| Melt | 186 conversions, ◈1,549 total; mean 8.3, median 7, range 1-26 | Events omit melted card keys, so value bands and card-level sacrifice cannot be recovered |
| Shop | One five-card shelf: 3 V1, 1 V3, 1 V4; zero buys | Insufficient evidence for any value judgment |
| Trade | No frozen trade interaction | No observational evidence for the equal-value trade rule |

The current starter pool itself is all V1, so the prior audit's “cut ASAP” method
cannot provide a clean cross-value comparison even where it identifies individual
starter-card friction. Level-up and adoption telemetry also mixes card tender with
banked treasure and survivor-selected opportunity. Neither is a defensible
independent validation of the five value bands.

## Reproducible commands and checks

Run from `C:\Users\dakot\king-mimic` in PowerShell. The fixed `head` is
intentional; production is append-only and already contains later rows.

```powershell
git branch --show-current
git rev-parse --short HEAD
bunx @railway/cli status
bunx @railway/cli ssh wc -l /var/data/telemetry.jsonl
bunx @railway/cli ssh head -n 4480 /var/data/telemetry.jsonl | bun tools/telemetry-report.js --stdin
```

Exact pool/value and cost cross-tab:

```powershell
@'
import * as G from "./game.js";
const bands = [1, 2, 3, 4, 5];
const costs = [1,2,3,4,5,6,7,8,9,10];
const rows = G.PLAYER_POOL.map(key => ({
  key, name: G.KIT[key].name, value: G.itemTreasure(key), cost: G.KIT[key].cost,
}));
console.log({
  count: rows.length,
  byValue: Object.fromEntries(bands.map(v => [v, rows.filter(r => r.value === v).length])),
  totalValue: rows.reduce((s, r) => s + r.value, 0),
  valueCost: Object.fromEntries(bands.map(v => [v,
    Object.fromEntries(costs.map(c => [c, rows.filter(r => r.value === v && r.cost === c).length]))
  ])),
  uniqueKeys: new Set(rows.map(r => r.key)).size,
});
'@ | bun -
```

Exact matrix classifier and reconciliation:

```powershell
@'
import * as G from "./game.js";
const flat = (ops = []) => ops.flatMap(o => [o, ...flat(o.ops ?? [])]);
const classify = key => {
  const c = G.KIT[key], ops = flat(c.ops), kind = G.cardKind(key);
  const has = (...ds) => ops.some(o => ds.includes(o.do));
  return {
    melee: (kind === "melee" || kind === "both") && has("deal", "schoolStrike"),
    ranged: (kind === "ranged" || kind === "both") && has("deal", "schoolStrike"),
    defense: has("shield", "heal", "healSelf", "healAlly", "chequeHeal", "mirror",
      "revealLight", "giantBelt", "thorns", "leech")
      || ops.some(o => o.do === "deal" && o.lifesteal)
      || ops.some(o => o.do === "buff" && o.buff === "stoneskin")
      || ops.some(o => o.do === "regen" && ["heal", "shield", "berserk"].includes(o.kind)),
    control: has("pullFront", "repositionPick", "slow", "weakness", "sap", "stasis", "tkBlades"),
    summon: has("summon", "summonPick"),
    resource: has("counter", "rangedBonus", "modalBonus", "gainMoxie", "dualWield",
      "moxieOnHit", "moxieOnPlay") || ops.some(o => o.moxieFromDealt)
      || ops.some(o => o.do === "buff" && o.buff === "haste")
      || ops.some(o => o.do === "regen" && ["moxie", "modalBonus", "berserk"].includes(o.kind)),
  };
};
const rows = G.PLAYER_POOL.map(key => ({ key, value: G.itemTreasure(key), a: classify(key) }));
const labels = Object.keys(rows[0].a), bands = [1,2,3,4,5];
const matrix = Object.fromEntries(labels.map(a => [a,
  bands.map(v => rows.filter(r => r.value === v && r.a[a]).length)
]));
const memberships = rows.reduce((s, r) => s + Object.values(r.a).filter(Boolean).length, 0);
console.log({ cards: rows.length, unique: new Set(rows.map(r => r.key)).size,
  unclassified: rows.filter(r => !Object.values(r.a).some(Boolean)).map(r => r.key),
  matrix, memberships });
'@ | bun -
```

Exact frozen value-band interaction query (the repository reporter above
reproduces its underlying per-card rows):

```powershell
bunx @railway/cli ssh head -n 4480 /var/data/telemetry.jsonl | bun -e 'const G=await import(`./game.js`);const es=(await Bun.stdin.text()).trim().split(/\n/).map(JSON.parse).filter(e=>e.harness!==true),B=[1,2,3,4,5],V=k=>G.PLAYER_POOL.includes(k)?G.itemTreasure(k):null,A=Object.fromEntries(B.map(v=>[v,{cards:new Set(),draws:0,casts:0,stranded:0,held:0,unaff:0,rejected:0}]));for(const e of es.filter(e=>e.type===`room_result`))for(const p of e.players??[]){if(p.bot===true)continue;for(const[k,c]of Object.entries(p.cards??{})){const v=V(k);if(v==null)continue;const a=A[v];a.cards.add(k);a.draws+=c.draws??0;a.casts+=c.casts??0;a.stranded+=c.strandedDraws??0;a.held+=c.heldTicks??0;a.unaff+=c.unaffordableTicks??0;a.rejected+=Object.values(c.rejected??{}).reduce((s,n)=>s+(n??0),0)}}for(const v of B)A[v].cards=A[v].cards.size;const keys=(type,field,pred=()=>true)=>es.filter(e=>e.type===type&&pred(e)).flatMap(e=>field(e)),group=ks=>Object.fromEntries(B.map(v=>[v,ks.filter(k=>V(k)===v).length]));const melt=es.filter(e=>e.type===`convert_bag`&&e.bot!==true).map(e=>e.value).filter(Number.isFinite).sort((a,b)=>a-b);console.log(JSON.stringify({combat:A,lootOffers:group(keys(`loot_offer`,e=>e.cards??[])),soloClaims:group(keys(`loot_claim`,e=>[e.key],e=>e.bot!==true&&e.auto===true)),coopClaims:group(keys(`loot_claim`,e=>[e.key],e=>e.bot!==true&&e.auto!==true)),deckAdds:group(keys(`deck_edit`,e=>[e.key],e=>e.bot!==true&&e.action===`add`)),deckRemoves:group(keys(`deck_edit`,e=>[e.key],e=>e.bot!==true&&e.action===`remove`)),melt:{n:melt.length,total:melt.reduce((s,n)=>s+n,0),median:melt[Math.floor(melt.length/2)],min:melt[0],max:melt.at(-1)}},null,2))'
```

Final artifact checks:

```powershell
$out = git diff --no-index --check -- /dev/null CARD_VALUE_AUDIT_2026-07-18.md 2>&1
$issues = @($out | Where-Object { $_ -match 'trailing whitespace|space before tab|new blank line at EOF|^fatal:' })
if ($issues.Count) { $issues; throw "whitespace check failed" } else { "whitespace: PASS" }
git status --short
```

The wrapper is necessary because `git diff --no-index` returns 1 when the new
file differs from `/dev/null`, even when `--check` reports no whitespace defect.
On Windows, `/dev/null` is Git's portable null path and must not be replaced with
a redirection to `nul`, which would create a repository file.

## Limitations

- The five treasure bands are explicitly temporary owner-authored tiers. This
  audit measures their current structure; it does not validate their design.
- The frozen window mixes runtime versions and manually driven production QA.
  `harness:false` does not independently prove player identity.
- Draw/cast results are conditional on acquisition, deck inclusion, draw timing,
  body, target state, combat length, survival, and player intent. Value bands are
  not randomized treatments.
- Old metrics schemas omit some card fields. Thirteen current cards had no
  human-seat draw exposure in the frozen summaries; absence is not zero utility.
- Loot claim completion is shaped by solo auto-collection and persistent co-op
  spoils/bid points. It is not a preference experiment.
- Melt telemetry has aggregate payout but no card keys. Shop and trade samples
  are effectively absent. Those surfaces are structurally verified only.
