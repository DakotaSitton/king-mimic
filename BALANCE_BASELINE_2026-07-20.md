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
| 1000 | 0 | 986 | 14 | 0.0% | 1.04 | 79.5s / 58.0s / 148.9s |

### Encounter outcomes

"Elite-body encounter" means an ordinary combat node containing at least one elite wearable body; elite room types are retired.

| Kind | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ordinary | 2144 | 1525 | 609 | 10 | 71.1% | 18.0s | 33.0s |
| Elite-body encounter | 865 | 685 | 176 | 4 | 79.2% | 15.0s | 32.0s |
| Boss | 243 | 42 | 201 | 0 | 17.3% | 32.9s | 62.0s |

### Boss outcomes

| Boss | Fights | Wins | Losses | Stalls | Win rate | Median | p90 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Djinn of Deals | 40 | 3 | 37 | 0 | 7.5% | 29.3s | 41.0s |
| Hyper-Inflation Hydra | 71 | 29 | 42 | 0 | 40.8% | 46.0s | 66.0s |
| King Mimic | 0 | 0 | 0 | 0 | n/a | 0.0s | 0.0s |
| Kleptomaniac Kraken | 62 | 1 | 61 | 0 | 1.6% | 24.0s | 34.0s |
| Litigation Lich | 70 | 9 | 61 | 0 | 12.9% | 36.0s | 67.5s |

### Starter-body attribution

Rows are seat-run attribution: both starting bodies inherit the shared run outcome. They are correlations under this policy, not independent body win rates.

| Starter body | Seat-runs | Thrones | Defeats | Stalls | Throne share | Mean deepest floor |
|---|---:|---:|---:|---:|---:|---:|
| Bond Behemoth | 74 | 0 | 70 | 4 | 0.0% | 1.05 |
| Bribed Bishop | 97 | 0 | 97 | 0 | 0.0% | 1.05 |
| Centless Centaur | 71 | 0 | 70 | 1 | 0.0% | 1.04 |
| Cheque Cherub | 88 | 0 | 86 | 2 | 0.0% | 1.01 |
| Crypto-Chimera | 80 | 0 | 80 | 0 | 0.0% | 1.01 |
| Economy Elemental | 102 | 0 | 101 | 1 | 0.0% | 1.04 |
| Fat Cat | 139 | 0 | 139 | 0 | 0.0% | 1.06 |
| Golden Golem | 65 | 0 | 65 | 0 | 0.0% | 1.08 |
| Interest Imp | 65 | 0 | 64 | 1 | 0.0% | 1.02 |
| Lizard Wizard | 85 | 0 | 84 | 1 | 0.0% | 1.06 |
| Malevolent Mouse | 88 | 0 | 88 | 0 | 0.0% | 1.06 |
| Market-Crash Minotaur | 119 | 0 | 116 | 3 | 0.0% | 1.05 |
| Moneymancer | 89 | 0 | 88 | 1 | 0.0% | 1.08 |
| Paid Piper | 89 | 0 | 88 | 1 | 0.0% | 1.02 |
| Penny-Pinching Pixie | 96 | 0 | 95 | 1 | 0.0% | 1.02 |
| Pyramid-Scheme Head | 86 | 0 | 84 | 2 | 0.0% | 1.05 |
| Rent-Seeking Runeblade | 87 | 0 | 86 | 1 | 0.0% | 1.08 |
| Royal Rat | 116 | 0 | 114 | 2 | 0.0% | 1.03 |
| Toll Troll | 117 | 0 | 112 | 5 | 0.0% | 1.04 |
| Vengeful Vampire | 87 | 0 | 86 | 1 | 0.0% | 1.03 |
| Warewolf | 81 | 0 | 81 | 0 | 0.0% | 1.01 |
| Weary Wageslave | 79 | 0 | 78 | 1 | 0.0% | 1.01 |

### Deepest floor

| Floor | Runs |
|---|---:|
| 1 | 958 |
| 2 | 42 |

### End reasons

| Reason | Runs |
|---|---:|
| loss:boss:djinn | 37 |
| loss:boss:hydra | 42 |
| loss:boss:kraken | 61 |
| loss:boss:litigationLich | 61 |
| loss:elite | 176 |
| loss:ordinary | 609 |
| stall:elite | 4 |
| stall:ordinary | 10 |

### Stall signatures

| Living opponent signature at cap | Stalls |
|---|---:|
| Atlas, Shrugging | 1 |
| Market-Crash Minotaur + Economy Elemental | 1 |
| Bribed Bishop + Killionaire | 1 |
| Bribed Bishop + Toll Troll | 1 |
| Cheque Cherub + Pyramid-Scheme Head | 1 |
| Clockwork Amalgamation + Paid Piper + Timeshare Tyrant | 1 |
| Centless Centaur + Weary Wageslave | 1 |
| Centless Centaur + Rent-Seeking Runeblade | 1 |
| Malevolent Mouse + Fat Cat | 1 |
| Paid Piper + Moneymancer | 1 |
| Penny-Pinching Pixie | 1 |
| Penny-Pinching Pixie + Lizard Wizard | 1 |

## Limitations

- The policy does not plan card order, coordinate lanes, choose targets tactically beyond lowest HP, value loot, optimize level allocation, coordinate duo roles, or use human timing and judgment.
- It always chooses the first map link. Room contents are seeded and randomized, but route selection is not strategic.
- A stall is a fight still in `playing` after 5000 ticks. It is reported, not converted into a win or loss; this matches the fuzz harness's treatment of genuine sustain walls.
- Simulated durations count combat ticks only. CLI wall time is a separate performance property of this offline tool.
