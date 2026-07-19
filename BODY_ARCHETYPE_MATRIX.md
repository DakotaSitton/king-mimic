# Body Archetype Matrix

This sheet covers all **37 wearable bodies**. The versioned source is
`engine/archetypes.js`; `test/game.test.js` requires a one-to-one match with
`BODY_UPGRADES`, so a new body cannot silently fall out of the audit.

`Role` is mutually exclusive: Attacker, Caster, Defender, Summoner, or Support.
`Primary pattern` is also mutually exclusive. Secondary tags overlap on purpose:
tempo changes time-to-action, scaling grows during combat, aggro rewards being
attacked, and team-support directly improves another allied body.

## Complete matrix

| Body | Tier | Role | Primary pattern | Secondary tags |
|---|---|---|---|---|
| Fat Cat | Common | Summoner | Summon / Board | summon, aggro, scaling |
| Royal Rat | Common | Summoner | Summon / Board | summon, tempo, scaling |
| Paid Piper | Common | Summoner | Summon / Board | summon, tempo, scaling |
| Bookie Bonelord | Elite III | Summoner | Summon / Board | summon, scaling |
| Affluence Anubis | Elite III | Summoner | Summon / Board | summon, scaling |
| Timeshare Tyrant | Elite III | Summoner | Summon / Board | summon, tempo, scaling, sustain, defense, team-support |
| Centless Centaur | Common | Caster | Economy / Tempo | tempo, burst |
| Lizard Wizard | Common | Caster | Economy / Tempo | tempo, cost |
| Killionaire | Elite I | Caster | Economy / Tempo | tempo, burst |
| Audit Angel | Elite I | Caster | Economy / Tempo | tempo |
| Pyramid-Scheme Head | Common | Caster | Economy / Tempo | tempo, cost, burst |
| Penny-Pinching Pixie | Common | Caster | Economy / Tempo | tempo, cost |
| Economy Elemental | Common | Caster | Economy / Tempo | tempo |
| Moneymancer | Common | Caster | Economy / Tempo | tempo, cost |
| Malevolent Mouse | Common | Attacker | Scaling / Carry | scaling, burst |
| Rent-Seeking Runeblade | Common | Attacker | Scaling / Carry | scaling |
| Interest Imp | Common | Attacker | Scaling / Carry | scaling, defense |
| Bribed Bishop | Common | Support | Scaling / Carry | scaling, sustain, defense |
| Debt Dragon | Elite II | Attacker | Scaling / Carry | tempo, scaling, burst |
| Nepotistic Neptune | Elite III | Caster | Scaling / Carry | cost, burst |
| Toll Troll | Common | Support | Sustain / Fortify | sustain |
| Vengeful Vampire | Common | Support | Sustain / Fortify | sustain |
| Golden Golem | Common | Defender | Sustain / Fortify | defense |
| Cheque Cherub | Common | Support | Sustain / Fortify | sustain, defense, team-support |
| Wandering Castle | Elite II | Defender | Sustain / Fortify | defense |
| Stockbroking Sphinx | Elite III | Support | Sustain / Fortify | sustain, defense, AoE |
| Crypto-Chimera | Common | Attacker | Pressure / Control | tempo, AoE |
| Weary Wageslave | Common | Attacker | Pressure / Control | tempo |
| Bankrupt Basilisk | Elite II | Caster | Pressure / Control | tempo, control, AoE |
| Fundjin & Raising-Profitsjin | Elite III | Attacker | Pressure / Control | tempo, burst, AoE |
| Mid-Management Medusa | Elite II | Caster | Pressure / Control | control, scaling |
| Depression Demon | Elite I | Caster | Pressure / Control | control |
| Market-Crash Minotaur | Common | Attacker | Reactive / Aggro | aggro |
| Bond Behemoth | Common | Attacker | Reactive / Aggro | aggro, scaling |
| Warewolf | Common | Attacker | Reactive / Aggro | tempo, burst, defense |
| Atlas, Shrugging | Elite III | Attacker | Reactive / Aggro | aggro, AoE |
| Oligarchy Ooze | Elite II | Attacker | Reactive / Aggro | aggro, control, burst |

## Exact counts

### Combat roles

| Role | Common | Elite | Total |
|---|---:|---:|---:|
| Attacker | 8 | 4 | **12** |
| Caster | 6 | 6 | **12** |
| Defender | 1 | 1 | **2** |
| Summoner | 3 | 3 | **6** |
| Support | 4 | 1 | **5** |
| **All bodies** | **22** | **15** | **37** |

### Primary play patterns

| Primary pattern | Common | Elite | Total |
|---|---:|---:|---:|
| Economy / Tempo | 6 | 2 | **8** |
| Pressure / Control | 2 | 4 | **6** |
| Reactive / Aggro | 3 | 2 | **5** |
| Scaling / Carry | 4 | 2 | **6** |
| Summon / Board | 3 | 3 | **6** |
| Sustain / Fortify | 4 | 2 | **6** |

### Overlapping secondary tags

| Tag | Common | Elite | Total |
|---|---:|---:|---:|
| Tempo | 11 | 6 | **17** |
| Scaling | 8 | 5 | **13** |
| Burst / replay | 4 | 5 | **9** |
| Defense | 5 | 3 | **8** |
| Summon | 3 | 3 | **6** |
| Sustain | 4 | 2 | **6** |
| Aggro / retaliation | 3 | 2 | **5** |
| AoE / lane pressure | 1 | 4 | **5** |
| Cost manipulation | 4 | 1 | **5** |
| Control / debuff / theft | 0 | 4 | **4** |
| Direct team support | 1 | 1 | **2** |

## Verdict and roster gaps

The offensive core is healthy: **12 attackers**, **12 casters**, **17 tempo
bodies**, and **13 scaling bodies**. Summoning is also well distributed at six
bodies, split exactly **3 common / 3 elite**, with damage-trigger, spend-trigger,
card-trigger, fixed-wave, growing-wave, and protected-single-summon variants.

The thin areas are clear:

- **Defender is the largest role gap:** only 2 of 37 bodies (5.4%), one common and one elite.
- **Control is inaccessible early:** all 4 control-tagged bodies are elite; commons have zero.
- **Common AoE is sparse:** only Crypto-Chimera is common; the other 4 AoE bodies are elite.
- **Direct team support is nearly absent:** only Cheque Cherub and Timeshare Tyrant qualify.
- Body passives have **zero** dedicated mobility/formation, cleanse/dispel,
  anti-summon, or draw/discard/deck-manipulation identities. Cards may cover
  pieces of those jobs, but no body currently asks a player to build around them.

The best next additions are therefore a common controller, a second common
lane/AoE body, and a defender or formation-support body. Tempo and generic
scaling should be deprioritized for the next body batch; they are already the
two densest secondary identities.
