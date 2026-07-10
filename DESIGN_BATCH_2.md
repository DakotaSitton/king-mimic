# DESIGN BATCH 2 — owner-authored, 2026-07-10 (dropped mid wave-1/R1–R7)

> Owner authored these by hand (effects + numbers stated). Agents implement ENGINE/mechanics/tests only.
> COSTS were NOT stated for any new card → each new card gets a proposed cost as a `// FLAG` (his to tune).
> Other unstated numbers (durations, thresholds) also `// FLAG`. Verbatim owner text preserved per item.

## SEQUENCING (why not all-at-once)
Wave 1 = R1–R7 (running). Several items here EDIT cards/bodies wave-1 agents already touch:
- **Giant's Belt** ↔ C branch `3fe6c7f` (belt bugfix). → belt nerf fires **on C branch now** so it composes.
- **Every card cost** ↔ R2 (global +1, cap 10, 0-cost floor removed). New cards author costs as FLAGs; the
  R2 +1 reconciles at integration. Duel Wielding "≥6" and Neptune "6+" thresholds are relative to the
  POST-R2 cost regime → FLAG.
- **Sage Mode / Demon Form** ↔ R4 (level-up modal reuse). Sage "+1 moxie" stacks with R2's global +1 → FLAG net.
So new-card bundles (W2-A..D) fire as WAVE 2 the moment wave-1 frees up (they author in the final cost regime,
merge cleanly onto an already-R2'd kit.js). Existing-card edits (W2-E) fire last, after R2/C/R4 land.

---

## W2-A — Piercing + multi-hit melee cards  (base = post-R2 kit; new op flag `ignoreDefense`)
New damage flag that BYPASSES all defensive effects (shield / ward / damage-reduction / caps). Verify it
routes through the existing deal path but skips every defensive mod. Triblade is NOT piercing — it's plain
multi-hit (3 separate hits, matters for shields/procs).
- **Butterfly Knife** — "Deal 1 melee. This damage ignores all defensive effects."  [cost FLAG]
- **Mirror Mace** — "Deal 3 melee. This damage ignores all defensive effects."  [cost FLAG]
- **Meteor Maul** — "Deal 5 melee. This damage ignores all defensive effects."  [cost FLAG]
- **Triblade** — "Melee, deal 1 three times." (3 discrete hits, NOT pierce)  [cost FLAG]

## W2-B — Special shields  (base = e472896; shields carry per-source damage modifiers)
Shield objects need to carry a modifier so incoming damage against THAT shield is transformed.
- **Punishment Glutton** — "Gain 10 shield, this shield takes double damage." [shield mod: dmg×2] [cost FLAG]
- **Swords of Revealing Light** — "Gain 3 shield, this shield takes 1 damage max." [shield mod: cap incoming to 1/hit] [cost FLAG]

## W2-C — Foe control / debuff  (base = e472896; lane-scoped foe statuses)
- **Banshee Wail** — "Ranged. All foes in your lane deal -1 (+ranged)." [foe damage debuff; DURATION unstated → FLAG (this-fight? timed?)] [cost FLAG]
- **Za Warudo** — "All foes in a lane can't play cards or gain moxie, nothing positive triggers for them."
  [full lane suppression status; DURATION unstated → FLAG a timed value — permanent would be game-ending] [cost FLAG]

## W2-D — Reposition / periodic / delayed  (base = e472896; three distinct timed mechanics)
- **Gravity Greatsword** — "Melee. Pull your target to in front of you, then deal 5 damage to them."
  [new pull/reposition mechanic — move target into your lane front, then deal 5] [cost FLAG]
- **Crimson Crown** — "Every 6 seconds take 1 and summon 2 rats." [periodic self-damage + summon passive;
  CARD-vs-BODY unstated → default = card granting a this-fight passive (Big Wizard Hat pattern), FLAG] [cost FLAG]
- **Starblade** — "Melee, deal 2. In 10 seconds gain 10 moxie." [immediate 2 melee + delayed self-moxie] [cost FLAG]

## W2-E — Existing-card DESIGN edits  (fire LAST, after R2/C/R4; highest conflict)
- **Giant's Belt NERF** — "only increase by your base health, not double it each time." → maxHp += body BASE
  maxHp (additive, ONE-TIME, no compounding on repeat casts) instead of ×2. **Fires on C branch `3fe6c7f` NOW**
  (keeps C's fight-scoped teardown so it still doesn't leak across fights). [define "base health" + FLAG]
- **Crystal Ball** — "let it pick ANY card including used ones." (drop the used-card exclusion from its tutor)
- **Demon Form** — "deal 1 damage every 6 seconds." (add a periodic 1-dmg tick to its this-fight effect)
- **Sage Mode** — "heals 2 but costs 1 more moxie." [+1 over current; NOTE R2 also +1s globally → net +2 unless
  he wants +1 total → FLAG]
- **Duel Wielding (two-handers)** — REPLACE effect entirely: "melee cards that cost 6 or more you play are
  played an additional time." [threshold 6 is POST-R2 cost → FLAG]
- **Neptune** — "change to be 6 and above." (read current Neptune threshold first; retarget to ≥6) [FLAG vs R2 costs]

---

## OPEN COORDINATION NOTES (surfaced to owner, not blocking — building on FLAGged defaults)
1. Sage Mode +1 collides with R2's global +1 → net +2. Confirm if you want +1 total instead.
2. Za Warudo has no duration → building it timed (FLAG), not permanent.
3. Crimson Crown built as a CARD w/ this-fight passive unless you want it a body/wearable.
4. Duel Wielding "≥6" and Neptune "6+" read against the POST-R2 cost numbers.
