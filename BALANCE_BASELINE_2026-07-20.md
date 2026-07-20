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
| 1000 | 0 | 972 | 28 | 0.0% | 1.02 | 62.5s / 33.0s / 133.4s |

### Encounter outcomes

"Elite-body encounter" means an ordinary combat node containing at least one elite wearable body; elite room types are retired.

| Kind | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ordinary | 1844 | 1038 | 781 | 25 | 56.3% | 16.9s | 36.0s |
| Elite-body encounter | 316 | 212 | 101 | 3 | 67.1% | 16.0s | 33.9s |
| Boss | 106 | 16 | 90 | 0 | 15.1% | 32.0s | 49.5s |

### Boss outcomes

| Boss | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Djinn of Deals | 15 | 1 | 14 | 0 | 6.7% | 37.8s | 59.7s |
| Hyper-Inflation Hydra | 35 | 9 | 26 | 0 | 25.7% | 34.0s | 40.0s |
| King Mimic | 0 | 0 | 0 | 0 | n/a | 0.0s | 0.0s |
| Kleptomaniac Kraken | 30 | 1 | 29 | 0 | 3.3% | 22.0s | 30.0s |
| Litigation Lich | 26 | 5 | 21 | 0 | 19.2% | 39.0s | 52.5s |

### Starter-body attribution

Rows attribute each run to its originally drafted body even if the policy later swaps bodies.

| Starter body | Seat-runs | Thrones | Defeats | Stalls | Throne share | Mean deepest floor |
|---|---:|---:|---:|---:|---:|---:|
| Bond Behemoth | 36 | 0 | 36 | 0 | 0.0% | 1.06 |
| Bribed Bishop | 37 | 0 | 36 | 1 | 0.0% | 1.00 |
| Centless Centaur | 45 | 0 | 43 | 2 | 0.0% | 1.04 |
| Cheque Cherub | 24 | 0 | 23 | 1 | 0.0% | 1.04 |
| Crypto-Chimera | 51 | 0 | 49 | 2 | 0.0% | 1.00 |
| Economy Elemental | 36 | 0 | 36 | 0 | 0.0% | 1.00 |
| Fat Cat | 94 | 0 | 94 | 0 | 0.0% | 1.04 |
| Golden Golem | 44 | 0 | 43 | 1 | 0.0% | 1.02 |
| Interest Imp | 34 | 0 | 33 | 1 | 0.0% | 1.00 |
| Lizard Wizard | 43 | 0 | 42 | 1 | 0.0% | 1.00 |
| Malevolent Mouse | 34 | 0 | 33 | 1 | 0.0% | 1.00 |
| Market-Crash Minotaur | 47 | 0 | 44 | 3 | 0.0% | 1.00 |
| Moneymancer | 40 | 0 | 39 | 1 | 0.0% | 1.02 |
| Paid Piper | 61 | 0 | 61 | 0 | 0.0% | 1.00 |
| Penny-Pinching Pixie | 24 | 0 | 24 | 0 | 0.0% | 1.00 |
| Pyramid-Scheme Head | 39 | 0 | 38 | 1 | 0.0% | 1.00 |
| Rent-Seeking Runeblade | 50 | 0 | 46 | 4 | 0.0% | 1.02 |
| Royal Rat | 59 | 0 | 57 | 2 | 0.0% | 1.03 |
| Toll Troll | 78 | 0 | 73 | 5 | 0.0% | 1.00 |
| Vengeful Vampire | 33 | 0 | 32 | 1 | 0.0% | 1.03 |
| Warewolf | 49 | 0 | 48 | 1 | 0.0% | 1.02 |
| Weary Wageslave | 42 | 0 | 42 | 0 | 0.0% | 1.00 |

### Deepest floor

| Floor | Runs |
|---|---:|
| 1 | 984 |
| 2 | 16 |

### End reasons

| Reason | Runs |
|---|---:|
| loss:boss:djinn | 14 |
| loss:boss:hydra | 26 |
| loss:boss:kraken | 29 |
| loss:boss:litigationLich | 21 |
| loss:elite | 101 |
| loss:ordinary | 781 |
| stall:elite | 3 |
| stall:ordinary | 25 |

### Stall signatures

| Living opponent signature at cap | Stalls |
|---|---:|
| Lizard Wizard | 6 |
| Crypto-Chimera | 5 |
| Economy Elemental | 3 |
| Toll Troll | 3 |
| Wandering Castle | 2 |
| Market-Crash Minotaur | 1 |
| Centless Centaur | 1 |
| Malevolent Mouse | 1 |
| Killionaire | 1 |
| Royal Rat | 1 |
| Moneymancer | 1 |
| Penny-Pinching Pixie | 1 |

## Two-player

| Runs | Thrones | Defeats | Stalled runs | Throne rate | Mean deepest floor | Mean / median / p90 simulated run time |
|---:|---:|---:|---:|---:|---:|---:|
| 1000 | 0 | 969 | 31 | 0.0% | 1.04 | 83.7s / 60.0s / 143.9s |

### Encounter outcomes

"Elite-body encounter" means an ordinary combat node containing at least one elite wearable body; elite room types are retired.

| Kind | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ordinary | 2081 | 1486 | 574 | 21 | 71.4% | 18.0s | 34.0s |
| Elite-body encounter | 854 | 651 | 193 | 10 | 76.2% | 15.0s | 32.0s |
| Boss | 241 | 39 | 202 | 0 | 16.2% | 31.3s | 49.0s |

### Boss outcomes

| Boss | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Djinn of Deals | 48 | 1 | 47 | 0 | 2.1% | 31.3s | 49.0s |
| Hyper-Inflation Hydra | 65 | 32 | 33 | 0 | 49.2% | 38.0s | 54.0s |
| King Mimic | 0 | 0 | 0 | 0 | n/a | 0.0s | 0.0s |
| Kleptomaniac Kraken | 59 | 0 | 59 | 0 | 0.0% | 20.0s | 28.0s |
| Litigation Lich | 69 | 6 | 63 | 0 | 8.7% | 32.5s | 50.9s |

### Starter-body attribution

Rows are seat-run attribution: both starting bodies inherit the shared run outcome. They are correlations under this policy, not independent body win rates.

| Starter body | Seat-runs | Thrones | Defeats | Stalls | Throne share | Mean deepest floor |
|---|---:|---:|---:|---:|---:|---:|
| Bond Behemoth | 88 | 0 | 83 | 5 | 0.0% | 1.06 |
| Bribed Bishop | 89 | 0 | 88 | 1 | 0.0% | 1.02 |
| Centless Centaur | 73 | 0 | 71 | 2 | 0.0% | 1.03 |
| Cheque Cherub | 92 | 0 | 89 | 3 | 0.0% | 1.02 |
| Crypto-Chimera | 72 | 0 | 70 | 2 | 0.0% | 1.01 |
| Economy Elemental | 88 | 0 | 85 | 3 | 0.0% | 1.02 |
| Fat Cat | 156 | 0 | 151 | 5 | 0.0% | 1.06 |
| Golden Golem | 74 | 0 | 68 | 6 | 0.0% | 1.05 |
| Interest Imp | 84 | 0 | 83 | 1 | 0.0% | 1.02 |
| Lizard Wizard | 81 | 0 | 79 | 2 | 0.0% | 1.05 |
| Malevolent Mouse | 85 | 0 | 83 | 2 | 0.0% | 1.04 |
| Market-Crash Minotaur | 107 | 0 | 103 | 4 | 0.0% | 1.05 |
| Moneymancer | 72 | 0 | 70 | 2 | 0.0% | 1.07 |
| Paid Piper | 76 | 0 | 76 | 0 | 0.0% | 1.05 |
| Penny-Pinching Pixie | 91 | 0 | 88 | 3 | 0.0% | 1.01 |
| Pyramid-Scheme Head | 103 | 0 | 101 | 2 | 0.0% | 1.02 |
| Rent-Seeking Runeblade | 88 | 0 | 84 | 4 | 0.0% | 1.03 |
| Royal Rat | 117 | 0 | 112 | 5 | 0.0% | 1.07 |
| Toll Troll | 109 | 0 | 105 | 4 | 0.0% | 1.06 |
| Vengeful Vampire | 83 | 0 | 80 | 3 | 0.0% | 1.05 |
| Warewolf | 82 | 0 | 80 | 2 | 0.0% | 1.00 |
| Weary Wageslave | 90 | 0 | 89 | 1 | 0.0% | 1.03 |

### Deepest floor

| Floor | Runs |
|---|---:|
| 1 | 961 |
| 2 | 39 |

### End reasons

| Reason | Runs |
|---|---:|
| loss:boss:djinn | 47 |
| loss:boss:hydra | 33 |
| loss:boss:kraken | 59 |
| loss:boss:litigationLich | 63 |
| loss:elite | 193 |
| loss:ordinary | 574 |
| stall:elite | 10 |
| stall:ordinary | 21 |

### Stall signatures

| Living opponent signature at cap | Stalls |
|---|---:|
| Clockwork Amalgamation + Timeshare Tyrant | 3 |
| Wandering Castle | 2 |
| Atlas, Shrugging | 1 |
| Market-Crash Minotaur + Golden Golem | 1 |
| Cheque Cherub + Weary Wageslave | 1 |
| Centless Centaur + Malevolent Mouse | 1 |
| Centless Centaur + Wandering Castle | 1 |
| Depression Demon + Weary Wageslave | 1 |
| Malevolent Mouse + Economy Elemental | 1 |
| Malevolent Mouse + Paid Piper | 1 |
| Malevolent Mouse + Toll Troll | 1 |
| Economy Elemental + Paid Piper | 1 |

## Limitations

- The policy does not plan card order, coordinate lanes, choose targets tactically beyond lowest HP, value loot, optimize level allocation, coordinate duo roles, or use human timing and judgment.
- It always chooses the first map link. Room contents are seeded and randomized, but route selection is not strategic.
- A stall is a fight still in `playing` after 5000 ticks. It is reported, not converted into a win or loss; this matches the fuzz harness's treatment of genuine sustain walls.
- Simulated durations count combat ticks only. CLI wall time is a separate performance property of this offline tool.
