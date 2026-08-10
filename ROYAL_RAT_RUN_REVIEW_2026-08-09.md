# Royal Rat production run review — 2026-08-09

## Scope and verdict

Reviewed the canonical Railway telemetry and combat log for the genuine-human win
`run-2026-08-08T23-49-12-572Z-WJK7` (`Booopppp`, solo Royal Rat, 19 combat wins,
King Mimic defeated). Raw production artifacts were not copied into the repository.

The player's feedback is correct as an impact/agency diagnosis, not as a literal count
of inputs. He did not play fewer cards on floor 2; his cards had become switches that
started much larger autonomous engines:

- 34 cards actually resolved across floor 2's six fights (5.7 per fight), from 43
  manual attempts; seven queued cards were cancelled.
- For 788 of 947 combat ticks (83.2%), none of his held cards was affordable.
- Rats and other summons dealt 142 of 150 actual HP damage (94.7%).
- The log contains 60 autonomous allied casts versus 34 successful manual casts.

Floor 1 had 32 successful manual casts and floor 2 had 34, so the deck did not literally
go unused. What changed sharply was contribution: autonomous damage rose from 79.4% to
94.7%, and floor 2 logged 60 autonomous allied casts against 34 manual casts.

## Floor breakdown

“Autonomous casts” counts Rat Bite, ordinary summon casts, and Animated Item casts.
“Autonomous damage” is actual foe HP removed by those sources after shields and lethal
overkill; Royal Rat-sourced poison and Pet Leech ticks remain in the direct column.
The telemetry field `handLockedTicks` does **not** measure an animation or UI lock. It
counts ticks where no held card can be paid for, so the table labels it accordingly.

| Floor | Fights | Manual casts | Autonomous casts | No card affordable | Direct damage | Rat damage | Other summon damage | Animated Item damage | Autonomous damage share | Deck edits |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 6 | 32 | 32 | 81.6% | 21 | 72 | 5 | 0 | 78.6% | 26 |
| 2 | 6 | 34 | 60 | 83.2% | 8 | 123 | 19 | 0 | 94.7% | 4 |
| 3 | 6 | 46 | 83 | 75.5% | 13 | 202 | 28 | 14 | 94.9% | 2 |
| 4 | 1 | 11 | 72 | 66.1% | 4 | 160 | 10 | 65 | 98.3% | 0 |

## What the player built

- He reached Royal Rat Mastery during floor 1. Every three moxie spent then summoned
  three rats instead of one.
- Floor 2 began at Mastery 1 / Specialty 1 and reached Specialty 4 before its last two
  fights. Specialty shield is applied to every summoned body, so Mastery also triples
  the shield delivered by each passive trigger.
- His first floor-2 fight opened with a 12-card deck and no conventional direct-damage
  package. It was summon, sustain, moxie, shield, and control: Fireling, Lightling, two
  Icelings, Pet Leech, Moxie Pool, Saw Shield, two Grits, Trollskin Tiara, and two
  Medium Red Vials.
  Every ordinary spend still advanced the same rat win condition.
- He edited aggressively before the engine was online: 26 successful edits before the
  first floor-2 fight (14 adds / 12 removes), then four during floor 2 and only two
  during floor 3. The deck-building curve was therefore front-loaded as well as the
  combat becoming autonomous. Three of those first 26 events carry telemetry `floor:2`
  because they occurred after the floor counter advanced but before the first fight.

Divine Treasure is not the floor-2 cause. It produced zero Animated Item casts there;
Royal Rat and ordinary summons already supplied 94.7% of floor-2 damage. Divine
Treasure amplified the late game, especially the final boss, but did not create the
reported inflection.

## Root cause

The strongest seam is multiplicative:

1. Any three moxie spent advances Royal Rat, regardless of the card's own purpose.
2. Mastery turns that trigger into three rats.
3. Each rat raises the merged stack's recurring three-moxie Bite by one.
4. Specialty adds shield per summoned rat into the same pooled stack.
5. While the player waits for enough moxie to fund another card, the spawned stacks keep
   gaining their own moxie and casting. More player moxie alone would compound the Royal
   Rat passive rather than restore meaningful card identity.

The final boss makes the defensive multiplication visible. A 30-rat stack still had
94 shield; King Mimic's six-damage lane beam reduced it to 88 without killing one rat.
The fight ended with all summons dealing 235 of 239 HP damage (rats and Animated Items
accounted for 225) while Royal Rat-sourced effects dealt four.

Across the full run, summons dealt 698 of 744 effective HP damage (93.8%), produced 247
logged actions, and landed the lethal hit in 18 of 19 fights. The player still supplied
all 123 Royal Rat card casts manually; “autonomous” here describes the resulting summon
actions and damage, not an autoplay system taking over the player's hand.

## Recommended balance order

No Royal Rat balance change is included with the unrelated Light/Cyclops rulings. This
is one unusually successful solo run, so it proves the reported experience and exposes
a design seam; it does not establish population win-rate balance. The owner question is:
**should Royal Rat deliberately turn most cards into swarm fuel once Mastery is online?**

If the answer is no, test one seam at a time in this order:

1. **Remove the Mastery × Specialty defense multiplier.** Grant Specialty shield once
   to the resulting rat stack per summon event, rather than once per rat. This preserves
   both upgrades' fantasies while stopping a three-rat passive from also tripling shield.
2. **Only then tune offense if needed.** The clean next knob is Mastery summoning two
   rats instead of three, or the passive threshold moving from three to four moxie.
   Do not nerf Divine Treasure to solve the floor-2 report; the evidence rules it out.
3. **Measure before shipping a numeric nerf.** Add a post-fight contribution split for
   direct cards, body passives, and summons. Add a true input-blocked/resolution metric
   if animation lock is suspected; `handLockedTicks` only reports affordability. If
   stronger deck agency is the goal, test a player-fired rat command or cash-out rather
   than simply increasing moxie, which creates more rats.

The build should remain capable of becoming a rat machine. The target is for the player
to keep steering that machine, and for its pooled defense not to erase counterplay.
