# Leveling and Elite Tiers

Owner ruling: 2026-07-17. This is the owner-editable balance artifact for the
implemented system. Runtime definitions live in `engine/leveling.js`; change both
files together when retuning.

## Rules

- Level 1 is base. Every level above 1 grants one freely reallocatable point.
- Health: 1pt/rank, +4 max HP. Melee/ranged: 1pt/rank, +1 damage.
- Mastery is a body-specific one-time row. Specialty is a body-specific repeatable row.
- Reallocation is free outside combat and follows the player across body swaps.
- Foes receive and spend the same exact `level - 1` budget in a random legal allocation.
- The step reaching level `L` still costs `5 × (L - 1)`. Each foe level above 1 adds 2 ante.

## Elite tiers

Fantasy power is primary; current performance is secondary. No base stats or cards
were rebalanced as part of tiering.

| Tier | Foe ante | Adoption | Bodies |
|---|---:|---:|---|
| I — elite | +2 | ◈4 | Killionaire, Audit Angel, Depression Demon, Bookie Bonelord |
| II — major monster | +4 | ◈7 | Bankrupt Basilisk, Mid-Management Medusa, Debt Dragon, Wandering Castle |
| III — mythic | +6 | ◈11 | Fundjin & Raising-Profitsjin, Nepotistic Neptune, Atlas, Stockbroking Sphinx, Affluence Anubis |

Adoption is paid once per body per run and remains party-global. Commons are free
once felled; re-wearing an adopted elite is free.

## Body rows

Specialty text is per rank. Rank 1 matches the balance-review artifact; later ranks
extend it conservatively.

| Body | Mastery (once) | Specialty (repeatable) |
|---|---|---|
| Fat Cat | 2pt: trigger every 2 damage | 2pt/rank: passive rats gain +1 max HP/rank |
| Royal Rat | 3pt: trigger every 2 moxie | 2pt/rank: every third rat gains +1 shield/rank |
| Paid Piper | 3pt: trigger every 2 cards | 2pt/rank: +1 rat/trigger/rank |
| Toll Troll | 1pt: passive heal 3 | 2pt/rank: passive overheal→shield; +1 extra after rank 1 |
| Centless Centaur | 2pt: doubled first card +1 output | 2pt/rank: start 2 moxie, then +1/rank |
| Malevolent Mouse | 2pt: start +2 damage | 2pt/rank: first card −1 cost/rank, minimum 1 |
| Rent-Seeking Runeblade | 3pt: cross-trigger +2 | 2pt/rank: completed pair grants 2 shield, then +1/rank |
| Market-Crash Minotaur | 2pt: counterattack 2 | 2pt/rank: trigger grants 2 shield, then +1/rank |
| Interest Imp | 2pt: trigger every 3 moxie | 2pt/rank: damage trigger grants 2 shield, then +1/rank |
| Vengeful Vampire | 2pt: passive heal 2 | 2pt/rank: passive overheal→shield; +1 extra after rank 1 |
| Lizard Wizard | 3pt: ranged cost −2, minimum 1 | 2pt/rank: first ranged card refunds 1/rank |
| Bond Behemoth | 3pt: passive damage +2 | 2pt/rank: trigger grants 2 shield, then +1/rank |
| Golden Golem | 2pt: starting shield 150% max HP | 2pt/rank: first shield break grants +1 damage/rank |
| Crypto-Chimera | 2pt: trigger every 2 cards | 2pt/rank: passive lane damage +1/rank |
| Weary Wageslave | 2pt: passive damage 2 | 2pt/rank: every second trigger hits lane for 1/rank |
| Bribed Bishop | 2pt: healing grants +2 damage | 2pt/rank: overheal→shield; +1 extra after rank 1 |
| Cheque Cherub | 1pt: passive heal 8 | 2pt/rank: passive heal shields 3, then +1/rank |
| Pyramid-Scheme Head | 3pt: trigger every 2 cards | 2pt/rank: free card +1 output/rank |
| Penny-Pinching Pixie | 3pt: melee cost −2, minimum 1 | 2pt/rank: discounted melee damage +1/rank |
| Economy Elemental | 2pt: gain phase +4 moxie | 2pt/rank: loss phase shields 2, then +1/rank |
| Warewolf | 2pt: wolf melee +4 | 2pt/rank: human DR +1/rank |
| Atlas, Shrugging | 2pt: Shrug threshold 8 | 3pt/rank: Shrug base 7, then +1/rank |
| Killionaire | 2pt: start 5 moxie | 2pt/rank: first card −2 cost, then −1/rank, minimum 1 |
| Bankrupt Basilisk | 2pt: passive poison 2 | 3pt/rank: threshold −1/rank, minimum 1; effective cap 2 |
| Fundjin & Raising-Profitsjin | 3pt: both timers 5 seconds | 3pt/rank: each god strike +1 base/rank |
| Audit Angel | 2pt: non-damage card +2 moxie | 2pt/rank: non-damage card +1 shield/rank |
| Mid-Management Medusa | 2pt: damage applies 2 poison | 2pt/rank: poison defeat grants 2 moxie, then +1/rank |
| Depression Demon | 2pt: debuffs last 3× | 2pt/rank: applied debuff deals 1 ranged/rank |
| Bookie Bonelord | 2pt: defeat grants +2 damage | 2pt/rank: start +1 passive damage stack/rank |
| Debt Dragon | 2pt: trigger every 8 moxie gained | 3pt/rank: payoff +1 melee and ranged/rank |
| Nepotistic Neptune | 2pt: cost penalty +1 | 2pt/rank: doubled expensive card shields 2, then +1/rank |
| Stockbroking Sphinx | 2pt: trigger every 5 moxie | 3pt/rank: lane-lifesteal base +1/rank |
| Wandering Castle | 2pt: costly-shield threshold 4 | 2pt/rank: shield-gain bonus +1/rank |
| Affluence Anubis | 3pt: rat waves every 5 seconds | 3pt/rank: every wave +1 rat/rank |

## Deliberate non-changes

- No base HP, passive, card, or deck rebalance is included.
- Tier premium is intrinsic chassis power, not a fake native level.
- Random foe kits remain random; upgrades do not create fixed body decks.
