# King Mimic bot-policy balance baseline — 2026-07-20

This is **structural bot-policy evidence, not a prediction of human outcomes and not authority to change balance**. It exercises public engine APIs through the live run lifecycle without fixtures, god mode, direct state wins, retired class selection, stock, shops, or bespoke combat advantages.

## Configuration

- Seed: `public-alpha-2026-07-20` (FNV-1a string hash feeding Mulberry32; all engine `Math.random` calls use this stream)
- Runs: 1000 solo + 1000 two-player
- Fight cap: 5000 ticks (500.0 simulated seconds)
- Tick rate: 10/second
- Generator command: `RUNS=1000 SEED=public-alpha-2026-07-20 OUT=BALANCE_BASELINE_2026-07-20.md bun run tools/sim50.js`
- Policy: pick a random private live draft bundle; choose the first offered room link; enable normal `autoFire`; aim each living body at the lowest-HP lane foe; after wins, use the fuzz policy's first legal body swap, first shared-loot claim, damaging-card deck additions, and spare-funded level-ups; descend through floor 3 and fight the floor-4 throne.

## Solo

| Runs | Thrones | Defeats | Stalled runs | Throne rate | Mean deepest floor | Mean / median / p90 simulated run time |
|---:|---:|---:|---:|---:|---:|---:|
| 1000 | 0 | 972 | 28 | 0.0% | 1.02 | 60.9s / 33.0s / 121.7s |

### Encounter outcomes

"Elite-body encounter" means an ordinary combat node containing at least one elite wearable body; elite room types are retired.

| Kind | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ordinary | 1834 | 1023 | 783 | 28 | 55.8% | 16.0s | 35.9s |
| Elite-body encounter | 306 | 186 | 120 | 0 | 60.8% | 16.0s | 31.0s |
| Boss | 89 | 20 | 69 | 0 | 22.5% | 34.0s | 52.0s |

### Boss outcomes

| Boss | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Djinn of Deals | 14 | 2 | 12 | 0 | 14.3% | 31.3s | 47.6s |
| Hyper-Inflation Hydra | 20 | 8 | 12 | 0 | 40.0% | 38.0s | 52.0s |
| King Mimic | 0 | 0 | 0 | 0 | n/a | 0.0s | 0.0s |
| Kleptomaniac Kraken | 32 | 3 | 29 | 0 | 9.4% | 24.0s | 35.0s |
| Litigation Lich | 23 | 7 | 16 | 0 | 30.4% | 43.0s | 59.0s |

### Starter-body attribution

Rows attribute each run to its originally drafted body even if the policy later swaps bodies.

| Starter body | Seat-runs | Thrones | Defeats | Stalls | Throne share | Mean deepest floor |
|---|---:|---:|---:|---:|---:|---:|
| Bond Behemoth | 39 | 0 | 39 | 0 | 0.0% | 1.03 |
| Bribed Bishop | 36 | 0 | 36 | 0 | 0.0% | 1.00 |
| Centless Centaur | 40 | 0 | 39 | 1 | 0.0% | 1.02 |
| Cheque Cherub | 39 | 0 | 36 | 3 | 0.0% | 1.03 |
| Crypto-Chimera | 38 | 0 | 37 | 1 | 0.0% | 1.00 |
| Economy Elemental | 33 | 0 | 33 | 0 | 0.0% | 1.06 |
| Fat Cat | 87 | 0 | 84 | 3 | 0.0% | 1.05 |
| Golden Golem | 32 | 0 | 30 | 2 | 0.0% | 1.06 |
| Interest Imp | 33 | 0 | 33 | 0 | 0.0% | 1.03 |
| Lizard Wizard | 37 | 0 | 36 | 1 | 0.0% | 1.00 |
| Malevolent Mouse | 49 | 0 | 49 | 0 | 0.0% | 1.00 |
| Market-Crash Minotaur | 66 | 0 | 62 | 4 | 0.0% | 1.00 |
| Moneymancer | 37 | 0 | 37 | 0 | 0.0% | 1.03 |
| Paid Piper | 68 | 0 | 67 | 1 | 0.0% | 1.03 |
| Penny-Pinching Pixie | 36 | 0 | 36 | 0 | 0.0% | 1.00 |
| Pyramid-Scheme Head | 39 | 0 | 38 | 1 | 0.0% | 1.00 |
| Rent-Seeking Runeblade | 40 | 0 | 39 | 1 | 0.0% | 1.02 |
| Royal Rat | 60 | 0 | 60 | 0 | 0.0% | 1.02 |
| Toll Troll | 69 | 0 | 63 | 6 | 0.0% | 1.01 |
| Vengeful Vampire | 36 | 0 | 36 | 0 | 0.0% | 1.03 |
| Warewolf | 44 | 0 | 42 | 2 | 0.0% | 1.02 |
| Weary Wageslave | 42 | 0 | 40 | 2 | 0.0% | 1.00 |

### Deepest floor

| Floor | Runs |
|---|---:|
| 1 | 980 |
| 2 | 20 |

### End reasons

| Reason | Runs |
|---|---:|
| loss:boss:djinn | 12 |
| loss:boss:hydra | 12 |
| loss:boss:kraken | 29 |
| loss:boss:litigationLich | 16 |
| loss:elite | 120 |
| loss:ordinary | 783 |
| stall:ordinary | 28 |

### Stall signatures

| Living opponent signature at cap | Stalls |
|---|---:|
| Cheque Cherub | 4 |
| Penny-Pinching Pixie | 4 |
| Toll Troll | 4 |
| Vengeful Vampire | 4 |
| Lizard Wizard | 3 |
| Market-Crash Minotaur | 2 |
| Crypto-Chimera | 2 |
| Economy Elemental | 1 |
| Royal Rat | 1 |
| Moneymancer | 1 |
| Weary Wageslave | 1 |
| Pyramid-Scheme Head | 1 |

## Two-player

| Runs | Thrones | Defeats | Stalled runs | Throne rate | Mean deepest floor | Mean / median / p90 simulated run time |
|---:|---:|---:|---:|---:|---:|---:|
| 1000 | 0 | 980 | 20 | 0.0% | 1.04 | 80.3s / 58.9s / 144.5s |

### Encounter outcomes

"Elite-body encounter" means an ordinary combat node containing at least one elite wearable body; elite room types are retired.

| Kind | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ordinary | 2105 | 1502 | 586 | 17 | 71.4% | 18.0s | 35.0s |
| Elite-body encounter | 864 | 675 | 186 | 3 | 78.1% | 14.9s | 32.0s |
| Boss | 247 | 39 | 208 | 0 | 15.8% | 33.5s | 56.0s |

### Boss outcomes

| Boss | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Djinn of Deals | 47 | 1 | 46 | 0 | 2.1% | 29.3s | 41.8s |
| Hyper-Inflation Hydra | 72 | 32 | 40 | 0 | 44.4% | 46.0s | 65.0s |
| King Mimic | 0 | 0 | 0 | 0 | n/a | 0.0s | 0.0s |
| Kleptomaniac Kraken | 53 | 1 | 52 | 0 | 1.9% | 22.0s | 39.0s |
| Litigation Lich | 75 | 5 | 70 | 0 | 6.7% | 35.0s | 59.9s |

### Starter-body attribution

Rows are seat-run attribution: both starting bodies inherit the shared run outcome. They are correlations under this policy, not independent body win rates.

| Starter body | Seat-runs | Thrones | Defeats | Stalls | Throne share | Mean deepest floor |
|---|---:|---:|---:|---:|---:|---:|
| Bond Behemoth | 104 | 0 | 102 | 2 | 0.0% | 1.04 |
| Bribed Bishop | 107 | 0 | 106 | 1 | 0.0% | 1.03 |
| Centless Centaur | 82 | 0 | 81 | 1 | 0.0% | 1.01 |
| Cheque Cherub | 80 | 0 | 78 | 2 | 0.0% | 1.05 |
| Crypto-Chimera | 75 | 0 | 74 | 1 | 0.0% | 1.01 |
| Economy Elemental | 84 | 0 | 83 | 1 | 0.0% | 1.02 |
| Fat Cat | 129 | 0 | 126 | 3 | 0.0% | 1.04 |
| Golden Golem | 69 | 0 | 68 | 1 | 0.0% | 1.09 |
| Interest Imp | 75 | 0 | 72 | 3 | 0.0% | 1.04 |
| Lizard Wizard | 95 | 0 | 93 | 2 | 0.0% | 1.02 |
| Malevolent Mouse | 92 | 0 | 90 | 2 | 0.0% | 1.08 |
| Market-Crash Minotaur | 103 | 0 | 99 | 4 | 0.0% | 1.02 |
| Moneymancer | 74 | 0 | 73 | 1 | 0.0% | 1.08 |
| Paid Piper | 104 | 0 | 103 | 1 | 0.0% | 1.03 |
| Penny-Pinching Pixie | 89 | 0 | 87 | 2 | 0.0% | 1.02 |
| Pyramid-Scheme Head | 89 | 0 | 88 | 1 | 0.0% | 1.04 |
| Rent-Seeking Runeblade | 91 | 0 | 90 | 1 | 0.0% | 1.04 |
| Royal Rat | 107 | 0 | 107 | 0 | 0.0% | 1.06 |
| Toll Troll | 128 | 0 | 123 | 5 | 0.0% | 1.08 |
| Vengeful Vampire | 66 | 0 | 65 | 1 | 0.0% | 1.00 |
| Warewolf | 81 | 0 | 78 | 3 | 0.0% | 1.02 |
| Weary Wageslave | 76 | 0 | 74 | 2 | 0.0% | 1.01 |

### Deepest floor

| Floor | Runs |
|---|---:|
| 1 | 961 |
| 2 | 39 |

### End reasons

| Reason | Runs |
|---|---:|
| loss:boss:djinn | 46 |
| loss:boss:hydra | 40 |
| loss:boss:kraken | 52 |
| loss:boss:litigationLich | 70 |
| loss:elite | 186 |
| loss:ordinary | 586 |
| stall:elite | 3 |
| stall:ordinary | 17 |

### Stall signatures

| Living opponent signature at cap | Stalls |
|---|---:|
| Malevolent Mouse + Fat Cat | 2 |
| Market-Crash Minotaur | 1 |
| Market-Crash Minotaur + Golden Golem | 1 |
| Cheque Cherub + Golden Golem | 1 |
| Clockwork Amalgamation + Timeshare Tyrant | 1 |
| Centless Centaur + Royal Rat | 1 |
| Malevolent Mouse + Malevolent Mouse | 1 |
| Fat Cat + Interest Imp | 1 |
| Fat Cat + Pyramid-Scheme Head | 1 |
| Fat Cat + Warewolf | 1 |
| Interest Imp + Penny-Pinching Pixie | 1 |
| Interest Imp + Wandering Castle | 1 |

## Limitations

- The policy does not plan card order, coordinate lanes, choose targets tactically beyond lowest HP, value loot, optimize level allocation, coordinate duo roles, or use human timing and judgment.
- It always chooses the first map link. Room contents are seeded and randomized, but route selection is not strategic.
- A stall is a fight still in `playing` after 5000 ticks. It is reported, not converted into a win or loss; this matches the fuzz harness's treatment of genuine sustain walls.
- Simulated durations count combat ticks only. CLI wall time is a separate performance property of this offline tool.
