# PENDING BUILD — owner design batch (2026-06-27)

> Queued behind the caravan/summons/rats agent (it's rewriting game.js — can't touch KIT/BODIES until it lands).
> Owner-authored DESIGN; implement the engine faithfully, FLAG ambiguities, do NOT invent. Build all in one pass.

## A) Timed passives 3s → 6s, and −1 moxie cost each
(`period: 30` → `60`; text "3 seconds" → "6 seconds"; `cost` −1)
- Moxie Pool   3 → **2**
- Demon Form   4 → **3**
- Sage Mode    4 → **3**
- Berserker Armor 4 → **3**
- Trollskin Tiara 4 → **3**

## C) Timing-card normalizations (no −1 unless noted — these keep their power)
- **Liquid Metal Crown** → "gain **3 shield every 6 seconds**" (period 20→60, amount 1→3). Rate-preserving; cost stays 5.
- **Haste** (oHaste) → "moxie doubled for **6 seconds**" (dur 50→60).
- **Blood to Iron** (dBloodIron) → lasts **6 seconds** (dur 50→60) AND pays **1 shield per INSTANCE of damage** at the end (count of hits taken, NOT summed damage). Flip `bloodToIron.stored += landed` → `+= 1` per damage event.

## Poison (new mechanic)
- Poison = **1 damage every 6 seconds** per stack (a timed DoT debuff on a foe; stacks add).

## B) New BODIES (owner design — implement passives; FLAG the 5 below)
- **Killionaire** — start with 3 moxie; on dealing damage → +1 moxie.
- **Bankrupt Basilisk** — every 3 moxie spent → each foe in the lane −1.  ⚑ −1 to WHAT (damage/weaken?), stacking?
- **Fundjin / RaisingProfitsjin** — Fundjin: every 6s melee-attack the lane; RaisingProfitsjin: every 6s ranged-attack the front twice.  ⚑ ONE body or TWO?
- **Audit Angel** — every non-damaging card I play → +1 moxie.
- **Mid-Management Medusa** — every ranged card → apply 1 poison to the lane.
- **Depression Demon** — every debuff I apply lasts 2× as long.
- **Bookie Bonelord** — every 3 moxie gained → summon a rat; every defeat in my lane → +1.  ⚑ +1 to WHAT?
- **Debt Dragon** — every 10 moxie gained → +3 melee AND +3 ranged.
- **Nepotistic Neptune** — play a card costing ≥5 → play it twice (echo); all my cards cost +2 (max 10).

## B) New CARDS
- **Butcher's Cleaver** — melee: deal 4, heal the damage dealt.
- **Pet Leech** — drain 1 from the foe every 6s (ranged).  ⚑ drain HP or MOXIE? summon or lasting?
- **Slow** — halve a foe's moxie gain for 6s.
- **Animated Blade** — attack for 1 melee every 6s.  ⚑ a summon token, or a self-buff?
- **Weakness** — foe deals half damage (round up) for 6s.

## FLAGS RESOLVED (owner 2026-06-27)
1. Fundjin/RaisingProfitsjin = **ONE body**, both effects (every 6s melee-attack the lane + every 6s ranged-attack the front twice).
2. Bankrupt Basilisk: the −1 is a **NEGATIVE counter** (mirror of a +1 counter → that foe deals 1 LESS). Trigger is **every 5 moxie spent** (NOT 3). The −1s are **PERMANENT for the combat** (stack down).
3. Bookie Bonelord "+1" = **+1 MELEE** (per defeat in his lane).
4. Pet Leech = drain 1 **HP** from the foe every 6s (ranged).
5. Animated Blade = **SELF-BUFF** (you auto-melee the front for 1 every 6s), NOT a summon.

## Assumed defaults (unless owner corrects)
Killionaire start = 3 moxie. Neptune "play twice" = re-resolve ops ×2. Depression Demon 2× applies to poison/slow/weakness. Audit Angel / Medusa / Debt Dragon / Butcher's Cleaver / Slow / Weakness as written.
