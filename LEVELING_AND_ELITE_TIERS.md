# Level-Up Balance Sheet

Owner rulings: 2026-07-17 through 2026-07-19. This is the owner-editable source of truth for the
implemented point-leveling system. Runtime definitions live in `engine/leveling.js`; update both
artifacts together when retuning.

## Verdict on the math

The old prices did not pass the opportunity-cost test. One health rank always bought +4 max HP and
one damage rank bought +1 damage for an entire card school, while most Specialty ranks cost 2–4
points for a narrower +1. At those prices, choosing a Specialty commonly meant giving up +8 to +16
HP or +2 to +4 school damage. The dependable stat rows were therefore the rational default.

The corrected rule is deliberately simple:

- **Health:** 1 point per rank, +4 max HP.
- **Melee / ranged:** 1 point per rank, +1 damage to that card school.
- **Mastery:** 2 points, once. It changes how the body plays or opens a new engine.
- **Specialty:** 1 point per rank. It scales one body-specific output linearly.

This does not guarantee every row has identical value in every deck; it makes the comparison fair
enough to be a real build choice. Mastery now competes with +8 HP or two damage ranks. Specialty
competes directly with one health or damage rank instead of two to four of them.

## Complete body sheet

Every Mastery below costs **2 points once**. Every Specialty costs **1 point per rank**.

| Body | Base identity | Mastery — 2 points once | Specialty — 1 point/rank |
|---|---|---|---|
| Fat Cat | Every 3 damage taken: summon 1 rat. | After that summon, deal damage to the front foe equal to the living rats in Fat Cat's lane. | Every summoned body gains +1 melee and ranged damage/rank. A merged rat stack receives it once. |
| Royal Rat | Every 3 moxie spent: summon 1 rat. | Every summon enters with shield equal to its per-body moxie cost. Rats count as cost 1. | The 3-moxie trigger summons +1 rat/rank. |
| Paid Piper | Every 3 cards: summon 2 rats. | Trigger every 2 cards. | Every summon effect creates +1 body/rank. |
| Toll Troll | Every 4 moxie spent: heal 2. | Passive heal becomes 3. | Passive overheal becomes shield; ranks after the first add +1 spill shield. |
| Centless Centaur | First card each combat resolves twice. | The doubled opener gains +1 flat output. | Start with 2 moxie at rank 1, then +1/rank. Cap 9. |
| Malevolent Mouse | Start combat with +1 damage. | Start with +2 damage instead. | First card costs 1 less/rank, minimum 1. Cap 9. |
| Rent-Seeking Runeblade | Ranged cards grant +1 melee; melee cards grant +1 ranged. | Cross-triggers grant +2 instead. | Completing a melee+ranged pair grants 2 shield at rank 1, then +1/rank. |
| Market-Crash Minotaur | Every 3 damage taken: melee the front foe for 1. | Counterattack becomes 2. | Start combat with 1 moxie. Cap 1. |
| Interest Imp | Every 4 moxie spent: gain +1 damage. | Trigger every 3 moxie. | Each trigger also grants 2 shield at rank 1, then +1/rank. |
| Vengeful Vampire | Every 2 damage dealt: heal 1. | Passive heal becomes 2. | Passive overheal becomes shield; ranks after the first add +1 spill shield. |
| Lizard Wizard | Ranged cards cost 1 less. | Ranged cards cost 2 less, minimum 1. | First ranged card each combat refunds 1 moxie/rank. Cap 10. |
| Bond Behemoth | Every 3 damage taken: gain +1 damage. | Passive gain becomes +2. | Start combat with +1 damage. Cap 1. |
| Golden Golem | Start with shield equal to max HP. | Starting shield becomes 150% of max HP. | First shield break each combat grants +1 damage/rank. |
| Crypto-Chimera | Every 3rd card: deal 1 ranged damage to the foe lane. | Trigger every 2 cards. | Passive lane damage gains +1/rank. |
| Weary Wageslave | Every 2nd card: melee the front foe for 1. | Passive hit becomes 2. | Every second passive trigger also hits the lane for 1/rank. |
| Bribed Bishop | Whenever healed: gain +1 damage. | Healing grants +2 damage instead. | Overhealing becomes shield; ranks after the first add +1 spill shield. |
| Cheque Cherub | Every 3rd card: heal the target for 6. | Passive heal becomes 8. | Passive heal also grants 3 shield at rank 1, then +1/rank. |
| Pyramid-Scheme Head | Every 3 cards: next card is free. | Trigger every 2 cards. | The free card gains +1 flat output/rank. |
| Penny-Pinching Pixie | Melee cards cost 1 less. | Melee cards cost 2 less, minimum 1. | Discounted melee cards deal +1 damage/rank. |
| Economy Elemental | Every 6 seconds alternates: gain 3 moxie, then lose 1. | Gain phase becomes 4 moxie. | Loss phase grants 2 shield at rank 1, then +1/rank. |
| Warewolf | Human: -3 damage, 1 damage reduction. Wolf: +3 melee. | Wolf melee becomes +4. | Human damage reduction gains +1/rank. |
| Atlas, Shrugging | Every 10 damage taken: SHRUG for base 5 plus bonuses to the opposing lane. | SHRUG triggers every 8 damage. | SHRUG base becomes 7 at rank 1, then +1/rank. |
| Killionaire | Start combat with 3 moxie. | Start with 5 moxie. | First card costs 2 less at rank 1, then the discount grows by 1/rank, minimum cost 1. Cap 8. |
| Bankrupt Basilisk | Every 3 moxie spent: poison the foe lane by 1. | Passive poison becomes 2. | Threshold drops by 1 moxie/rank, minimum 1. Cap 2. |
| Fundjin & Raising-Profitsjin | Both gods strike on independent 6-second clocks. | Spending 6 moxie also triggers both gods without replacing their clocks. | Every god strike gains +1 base damage/rank. |
| Audit Angel | Non-damaging cards grant 1 moxie. | They grant 2 moxie instead. | They also grant +1 shield/rank. |
| Mid-Management Medusa | Damage also applies 1 poison. | Damage applies 2 poison. | Poison defeats grant 2 moxie at rank 1, then +1/rank. Cap 9. |
| Depression Demon | Applied debuffs last twice as long. | They last three times as long. | Applying a debuff deals 1 ranged damage/rank to that target. |
| Bookie Bonelord | 14 HP. Every 12 seconds, summon 2 rats. Whenever one of your summons is defeated, gain +1 melee and ranged damage. | Each owned-summon defeat grants +2 melee and ranged damage instead. | Each 12-second wave summons +1 rat/rank. |
| Debt Dragon | Every 10 moxie gained: +3 melee and +3 ranged. | Trigger every 8 moxie gained. | Payoff gains +1 melee and ranged/rank. |
| Nepotistic Neptune | Cards cost +2; cards costing 6+ resolve twice. | Tax becomes +1 and replay threshold becomes 5+. | Each doubled card grants 2 shield at rank 1, then +1/rank. |
| Stockbroking Sphinx | Every 12 seconds, choose target damage, self shield, or ally-target healing for 12 plus ranged bonus. | Every used option makes the next choice 1 second faster, down to 6 seconds. | Every option gains +2 effect/rank. |
| Wandering Castle | Cards costing 5+ grant their cost as shield; every shield gain is +1. | Costly-shield threshold becomes 4. | Every shield gain gets +1 more/rank. |
| Affluence Anubis | Every 6 seconds, add +1 rat to all future waves, then summon the enlarged wave; first wave is 2 rats. | Each wave adds +2 rats to future waves instead of +1. | Each wave adds +1 further rat of growth/rank. |
| Timeshare Tyrant | 6 HP. Start with a 12-HP Clockwork Amalgamation; every 12 seconds revive it, or fully heal it and add +1 damage and +1 protection if alive. | All owned summons gain moxie twice as fast. | Amalgamation service is 1 second faster/rank, minimum 3 seconds. Cap 9. |
| Oligarchy Ooze | Steal the first damaging card used against you and repeatedly auto-cast it at double moxie cost, capped at 10. | The stolen card uses its normal moxie cost. | Every later damaging hit against you pays +1 moxie/rank toward the held card. |
| Moneymancer | Every 6 seconds, arm the next ranged card to cost 3 less. | The discount arms every 5 seconds. | The armed discount is +1 stronger/rank. |

Royal Rat's per-body shield uses the actual moxie spent on a summon card, divided across the bodies
authored on that card and rounded down. Pet Rats therefore gives each rat 1 shield; a 5-moxie Earth
Elemental gets 5. Royal Rat's passive rats always count as cost 1. A free summon card grants 0 shield.

## Other leveling rules

- Level 1 is base. Every level above 1 grants one freely reallocatable point.
- Reallocation is free outside combat and follows the player across body swaps.
- Foes receive and spend the same exact `level - 1` budget in a random legal allocation.
- Reaching level `L` costs `5 × (L - 1)` treasure. Each foe level above 1 adds 2 ante.
- Existing saved allocations remain legal. Lower prices can leave newly unspent points, visible for
  free reallocation outside combat.

## Elite tiers

| Tier | Foe ante | Adoption | Bodies |
|---|---:|---:|---|
| I — elite | +2 | ◈4 | Killionaire, Audit Angel, Depression Demon |
| II — major monster | +4 | ◈7 | Bankrupt Basilisk, Mid-Management Medusa, Debt Dragon, Wandering Castle, Oligarchy Ooze |
| III — mythic | +6 | ◈11 | Fundjin & Raising-Profitsjin, Nepotistic Neptune, Atlas, Stockbroking Sphinx, Bookie Bonelord, Affluence Anubis, Timeshare Tyrant |

Adoption is paid once per body per run and remains party-global. Commons are free once felled;
re-wearing an adopted elite is free. This pass moves Bookie Bonelord to Tier III after the full
first-combat simulation placed it beside the mythics, adds Oligarchy Ooze to Tier II and Timeshare
Tyrant to Tier III, and leaves adoption prices and the run-level cost curve intact.
