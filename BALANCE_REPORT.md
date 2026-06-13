# KING MIMIC — BALANCE REPORT (2026-06-12)

Snapshot analysis from `bun test/balance.js` (pure engine, hpMult 1 / cdMult 1, the test-canonical pace).
Engine drifted mid-analysis (kit 24 → 31 items, Blizzard entered the foe pool, suite at 348/349) — numbers are from the post-drift engine.

## TOP FINDINGS

- **Hydra at floor 3 is unwinnable: 0% wins over 400 sims** while every other boss is ~100% at the same budget. Head waves starting at 5 and inflating +1, stacked on the per-hit re-wall, outscale any fixed-kit party. Breaks the budget = players × floor contract — start waves lower or stop scaling headStart with floor pressure.
- **Lich and Kraken deal ~zero damage** (median dmg taken: 0 at every party size and floor). They're stall puzzles, not threats — all the actual hurt in the boss roster comes from Hydra, Djinn, and the King. Same budget, wildly different threat spend.
- **Omnislash (5g) is strictly dominated everywhere.** 0.50 DPS at Power 1 — half a 1g Sword. Even on its best body (Senior Pixie, 3.0) it's beaten by Crossbow (6.0) at 1g less. Worst DPS-per-gold in the kit (0.10/g); it's an auto-skip.
- **Power Boost and Stone Skin are PERMANENT at canonical pace**: duration 80 ticks ≥ cd 70, so one press chains into 100% uptime. 3g buys a permanent +2 to BOTH Powers, or permanent −2 per hit — Stone Skin strictly outclasses the 4g Slime Crown (−1). Likely auto-picks; set dur < cd. (At live 2× pacing cds double but durations DON'T — buff dur isn't cdMult-scaled, a desync landmine.)
- **Foe-side Blizzard is the dud engine.** All 8 worst-value rolled foes in 10k are Blizzard carriers: 4g of ante for 0.36 gear DPS (0.03 DPS/g). ~15% of ALL rolled foes are duds (<0.6 DPS). The 1s clock-drain per 5.5s (~18% slow) doesn't buy back 4 gold.
- **Ante buys less threat the more it costs**: mean DPS per ante point falls 0.32 (ante 2) → ~0.20 (ante 6+). Senior body gold buys HP not offense, and utility second slots add ante with 0 DPS — so up-the-ante rooms pay the party MORE per threat faced, a mild free-money lean.
- **Summoner bodies are ~6× every other template**: Fat Cat 21.7 / Paid Piper 19.0 / Royal Rat 18.7 passive value per 10s vs ~3.3 for the whole tank/attacker row. Rat accumulation dominates any fight over ~20s. Vampire is dead last (1.67) — 1 heal per sword press doesn't register.
- **Senior Pixie is the DPS-per-gold king on both sides of the 1:1 mirror**: ×0.5 sword cds make amount-0 spam items the top damage in the game (Crossbow 6.0 DPS, Scary Knife 5.0), and all 8 best-value FOE rolls are Pixie-line + spam gear (up to 11 DPS for ante 11).

---

## A. Item DPS & gold efficiency

DPS = damage per press / (cd/10). Single-target; [ASSUMPTION] representative bodies are matching-school Power 1 and Power 3 with **no school CDR** (centaur/centaurR, mouse/mouseR), so the table shows the item, not the body. "Best body" sweeps all 36 spawnables (CDR included).

| item | g | cd(s) | dmg@P1 | DPS@P1 | DPS/g@P1 | dmg@P3 | DPS@P3 | DPS/g@P3 | best body (DPS) | tgt |
|---|---|---|---|---|---|---|---|---|---|---|
| Sword | 1 | 2.0 | 2 | 1.00 | **1.00** | 4 | 2.00 | **2.00** | pixieR (4.00) | front |
| Hatchet | 1 | 5.0 | 5 | 1.00 | 1.00 | 7 | 1.40 | 1.40 | pixieR (2.80) | front |
| Fireball | 1 | 4.5 | 4 | 0.89 | 0.89 | 6 | 1.33 | 1.33 | lizWizR (2.61) | pick |
| Bow | 1 | 2.5 | 2 | 0.80 | 0.80 | 4 | 1.60 | 1.60 | pixieR (3.08) | pick |
| Gang Up | 1 | 3.0 | 2 | 0.67 | 0.67 | 4 | 1.33 | 1.33 | pixieR (2.67) | front |
| Wind | 1 | 3.0 | 2 | 0.67 | 0.67 | 4 | 1.33 | 1.33 | lizWizR (2.67) | pick |
| Lightning | 1 | 5.0 | 3 | 0.60 | 0.60 | 5 | 1.00 | 1.00 | lizWizR (2.00) | lane |
| Spear | 2 | 4.5 | 4 | 0.89 | 0.44 | 6 | 1.33 | 0.67 | pixieR (2.61) | front2 |
| Scary Knife | 2 | 1.2 | 1 | 0.83 | 0.42 | 3 | 2.50 | 1.25 | pixieR (5.00) | front |
| Darkness | 2 | 5.0 | 4 | 0.80 | 0.40 | 6 | 1.20 | 0.60 | lizWizR (2.40) | pick |
| Magic Missile | 2 | 1.5 | 1 | 0.67 | 0.33 | 3 | 2.00 | 1.00 | lizWizR (3.75) | pick |
| Crossbow | 4 | 1.0 | 1 | 1.00 | 0.25 | 3 | 3.00 | 0.75 | **pixieR (6.00)** | pick |
| Blizzard | 4 | 5.5 | 3 | 0.55 | 0.14 | 5 | 0.91 | 0.23 | lizWizR (1.79) | lane |
| Omnislash | 5 | 8.0 | 4 | 0.50 | **0.10** | 12 | 1.50 | 0.30 | pixieR (3.00) | front |

Outliers:
- **Sword is the efficiency ceiling** (1.00–2.00 DPS/g); every 2g+ damage item pays a "rarity tax" — fine if the gold is the balancing number, but Omnislash's tax is ~10–20×.
- **Amount-0 items (Knife/Missile/Crossbow/Omnislash) ride entirely on Power**: tripling Power triples them. Crossbow is the hardest scaler in the game (1.0 → 6.0 DPS across bodies); Omnislash, with the same scaling, still loses to it everywhere.
- Lane items (Lightning, Blizzard) and Spear are per-target numbers — multiply by foes hit. [ASSUMPTION] 1:1 hero/foe lanes rarely hold >2–3 foes outside Hydra floods.
- Non-deal damage: summonRat = 0.5 sustained DPS per standing rat for 1g (a rat that lives 10s ≈ a Sword press cycle — fair); summonBigRat 1.0; Knight 0.5 + double aura for 4g.
- Buffs: Haste ~62% uptime (+~62% kit tempo while up, 3g). Power Boost / Stone Skin: see TOP FINDINGS — permanent at cdMult 1.

## B. Foe-gear appearance rates (10,008 rolled foes, buildFoePool)

48.0% of foes roll a second item. First slot is always damaging (no-dud filter works: 0 toothless slot-1 rolls in 10k).

| item | slot1 % | slot2 % | overall % |
|---|---|---|---|
| Fireball / Darkness / Lightning / Blizzard / Gang Up / Spear | 11.8–13.1 each | ~2 | 13.9–15.3 |
| Magic Missile / Crossbow / Scary Knife / Omnislash | 6.1–6.8 each | ~1 | 7.1–8.0 |
| 13 second-slot-only items (shields, tokens, Crown, Sword/Bow/Hatchet, Spikes, rats) | 0 | 2.2–2.6 each | ~2.4 |

- The 6 "universal" spicy items (base dmg ≥ 1 → threaten any body) appear ~2× as often as the 4 amount-0 items (which only roll on matching-school bodies). Nothing in the pool dominates; the split is mechanical, not random luck.
- **Never on foes (8 items)**: Wind, Heal (documented player-only), and the whole new wave — Haste, Power Boost, Stone Skin, Giga Cast, Time Stop, Revive (documented "panic buttons" exclusion). All excluded by design, none statistically rare. **Note Blizzard is no longer excluded** (drain made symmetric 2026-06-12) — see TOP FINDINGS for why that hurts.
- Hatchet is slot-2-only in practice: its slot-1 path is a fallback that never fires for the 36-body set.
- Side pipelines: cheap-slot guarantee = even Sword/Bow/Hatchet thirds; King's DECREE skews to expensive gear (Blizzard 24.9% — a quarter of the King's court carries the worst item).

## C. Boss TTK / threat sims (200 runs/cell)

[ASSUMPTION] Scripted party: pixies, 100 HP, blade+bow+fire each, pressing everything the moment it's ready, ranged aimed at the boss, melee chewing the lane; never rescues Kraken-stolen items; arms no echo. 1P/2P at floors 1 and 3 (King at 4).

| boss | P | floor | budget | win% | TTK boss (s) | clear (s) | dmg/player | timeouts |
|---|---|---|---|---|---|---|---|---|
| Hydra | 1 | 1 | 1 | 100 | 11.5 | 21.0 | 51 | 0 |
| Hydra | 2 | 1 | 2 | 100 | 11.5 | 18.1 | 25 | 0 |
| **Hydra** | **1** | **3** | **3** | **0** | — | — | 100 (dead) | 0 |
| **Hydra** | **2** | **3** | **6** | **0** | — | — | 100 (dead) | 0 |
| Lich | 1 | 1 | 1 | 100 | 11.5 | 11.5 | **0** | 0 |
| Lich | 2 | 1 | 2 | 100 | 11.5 | 11.5 | **0** | 0 |
| Lich | 1 | 3 | 3 | 100 | 34.3 | 34.6 | **0** | 0 |
| Lich | 2 | 3 | 6 | 100 | 34.3 | 34.6 | **0** | 0 |
| Djinn | 1 | 1 | 1 | 100 | 7.6 | 9.1 | 5 | 0 |
| Djinn | 2 | 1 | 2 | 100 | 9.1 | 9.6 | 4 | 0 |
| Djinn | 1 | 3 | 3 | 99 | 18.1 | 24.1 | 57 | 0 |
| Djinn | 2 | 3 | 6 | 100 | 22.9 | 27.1 | 31 | 0 |
| Kraken | 1 | 1 | 1 | 100 | 9.1 | 9.1 | 0 | 0 |
| Kraken | 2 | 1 | 2 | 100 | 9.1 | 9.1 | 0 | 0 |
| Kraken | 1 | 3 | 3 | 100 | 31.6 | 34.4 | 8 | 0 |
| Kraken | 2 | 3 | 6 | 100 | 30.5 | 31.7 | 3 | 0 |
| King Mimic | 1 | 4 | 4 | 48 | 34.3 | 37.6 | 100 | 0 |
| King Mimic | 2 | 4 | 8 | 61 | 31.6 | 36.2 | 56 | 22 |

- **Floor 1 is comparable** (7.6–11.5s TTK across the four) — the budget contract holds there.
- **Floor 3 splits into tiers**: Djinn ~18–23s, Kraken/Lich ~31–34s, Hydra ∞. TTK should scale with floor (per-player pressure), but a ~2× spread between Djinn and Lich at the same budget says the HP-per-budget bases (18 vs 14 + OBJECTION's effective doubling) aren't equivalent.
- **Threat is binary**: Hydra/Djinn/King hurt; Lich/Kraken literally don't (bone wizards & stolen-item entities die or fire too slowly to land a median point of damage). If "comparable per budget unit" includes danger, two bosses spend zero budget on it.
- King Mimic: ~half the solo parties die, and 22/200 2P runs hit the 10-minute cap (DECREE court + OBJECTION can out-sustain a chip party). He's the final wall, so hot is defensible — the stall-outs are the part worth a look.

## D. Body template comparison (base variants, 30s skirmish)

[ASSUMPTION] One heavy item pressed on cooldown (fire 4.5s for casters, hatchet 5s for fighters — accel bodies get their trigger school's item), echo armed when lit, 2 incoming damage every 2s, 30s window. Passive value/10s = measured output − a passive-less same-Power chassis, + healing. ×20 averaged.

| body | HP | value /10s | what it is |
|---|---|---|---|
| Fat Cat | 5 | **21.7** | rat clock + on-hit accel |
| Paid Piper | 5 | **19.0** | rat clock + sword accel |
| Royal Rat | 5 | **18.7** | rat clock + staff accel |
| Atlas | 9 | 7.7 | ramping +1 atk/4s, hit-accelerated |
| Mouse (echo staff) | 5 | 4.0 | double a fire ≈ every 10s |
| Centaur (echo sword) | 7 | 3.3 | double a hatchet ≈ every 10s |
| Pixie (sword CDR) | 7 | 3.3 | ~2 extra hatchet presses |
| Minotaur (counter clock) | 9 | 3.3 | 1 dmg ~every 2.7s under fire |
| Wageslave (self-heal) | 9 | 3.3 | 2 HP / 3s |
| Lizard Wizard (staff CDR) | 5 | 2.7 | ~2 extra fire presses |
| Runeblade (cross-school) | 5 | 2.0 | +phys on staff items |
| Vampire (heal on sword) | 7 | **1.7** | 1 HP per sword press |

- **The whole non-summoner field sits in a healthy 2–4 band** — that part of the set is genuinely flat. The summoners sit at 19–22 because rats *accumulate* (each 3.5s rat adds 0.5 DPS for the rest of the fight) — value grows superlinearly with fight length, and nothing else in the set compounds.
- **Vampire and Runeblade are the dead templates** — their magnitudes (1 heal/press, +1 dmg/staff press) are sub-noise. Vampire is also outheal-ed by Wageslave on a 9-HP chassis.
- Caveat: Pixie/Lizard CDR and echo scale with kit quality (×0.5 cds on a Senior body with a Crossbow is the real payoff — see A's best-body column); this table prices the *base* variant on one mid item.

## E. Ante vs actual threat (10k rolled foes, gear DPS on the rolled body)

[ASSUMPTION] Threat = analytic single-target gear DPS (school Power, body CDR, ≥1 floor); body passives, auras, drains and shields not priced in. Dud threshold 0.6 DPS.

| ante | n | mean DPS | min | max | DPS per ante pt |
|---|---|---|---|---|---|
| 2 | 641 | 0.64 | 0.33 | 1.18 | **0.32** |
| 3 | 933 | 0.87 | 0.33 | 2.50 | 0.29 |
| 4 | 1135 | 0.96 | 0.33 | 2.61 | 0.24 |
| 5 | 1421 | 1.10 | 0.33 | 4.17 | 0.22 |
| 6 | 1468 | 1.20 | 0.33 | 4.86 | 0.20 |
| 7 | 1666 | 1.45 | 0.33 | 6.67 | 0.21 |
| 8–14 | 2744 | 1.8–3.2 | 0.33 | 11.00 | **0.18–0.23** |

- **The trend line bends the wrong way**: per ante point, a cheap foe threatens ~50% more than an expensive one. Drivers: Senior body gold buys HP (which the metric doesn't price — but HP stalls, it doesn't threaten), and ~25% of second slots are 2–4g utility items adding zero offense.
- **Duds: 1,497 / 10,008 (15.0%)** under 0.6 DPS. Anatomy: off-school "universal" items (a Gang Up on a 0-sword mage = 0.33 DPS — `itemThreatens` passes any base-damage ≥ 1 item onto any body) plus foe Blizzard (0.36 on everything). The old dud exploit ("a room full of duds = free money") is back in statistical form.
- Best-value foes are all Senior Pixie + spam gear (8–11 DPS, ~1.0 DPS/g — 3–5× the price-class mean): the one rolled foe that genuinely out-threatens its price.
- Cheapest fix with the existing dial: `itemThreatens` could require school match (not just nonzero damage) for the first slot, and Blizzard/utility seconds could price their ante at foe-side value rather than hero-side value.

---
*Harness: `test/balance.js` (bun, pure engine). 10k+ rolls per distribution, 200 runs per boss cell, 20 per skirmish. Re-run any time; RUNS env var scales the boss sims.*
