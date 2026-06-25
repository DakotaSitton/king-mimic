<!-- ⚠️ PARTLY STALE (2026-06-11) — flagged 2026-06-24. The V1 ward/nemesis King design is DEAD and
     several clock/Hydra notes were superseded (see CORE_LOGIC §4). Boss STRUCTURE is still useful
     reference, but live numbers/behaviour come from BOSS_DEFS in game.js. -->

# BOSS_SPEC_V1 — the four floor bosses (owner-dictated 2026-06-11, post first remote 3P playtest)

> CANON = the owner's words, restated faithfully. Anything tagged **[PLACEHOLDER]** is an
> implementer ruling filling a gap — the owner overwrites these freely; do not defend them.
> The V1 bosses in game.js (hydra/litigationLich/djinn/kingMimic) are DEAD designs: keep the
> keys where convenient but never resurrect a V1 number or mechanic from git.

## The scaling contract (CANON)

- Difficulty units: **xy = partySize (1–4) × floor (1–3)**. Solo on floor 1 fights 1 unit;
  4 players on floor 3 fight 12 units.
- Meaning: **per-player pressure scales with floor only** — party size scales the TOTAL
  encounter budget so each player feels the same floor's pressure at any party size.
- Every boss spends its budget on its own signature dial (Hydra → head economy, Lich →
  fight length, Djinn → item-entity output, Kraken → steals + tentacle wall).
- **[PLACEHOLDER]** concrete spend: boss HP = perBossBase × players × floor; summon
  counts/clock rates scale with players (lane coverage) and floor (rate). First-draft
  bases in each boss section. All numbers are redial-on-playtest.

## Architecture (CANON direction, owner: "bosses behind each lane, like the caravan")

- The boss is a **back-line entity spanning ALL lanes**, mirroring the caravan on the foe
  side. Stated by the owner for **Hydra and Kraken**; **[PLACEHOLDER]** Lich uses the same
  back-line placement for engine consistency. Djinn does NOT (see Djinn).
- Damage to the boss carries **lane attribution** — "the lane the damaging source comes
  from" is a first-class fact (Hydra consumes it).
- **[PLACEHOLDER]** reachability: the boss is the lane's back wall — melee (`target:"front"`)
  reaches it only when its lane has no foes in front; ranged/aimed items can target it
  per the existing `isRanged` rules. This makes lane-blocking summons (heads, tentacles)
  mechanically meaningful: they re-wall the lane.
- The legacy "boss & god rooms force ≥3 lanes" clamp in `lanesFor` DIES for boss rooms —
  the new bosses are lane-count-agnostic by construction (god rooms may keep it).

## Rotation (CANON)

- Roster: **Hydra, Litigation Lich, Djinn of Deals, Kleptomaniac Kraken**. Runs have
  **3 boss floors**; the floors rotate through the 4.
- **King Mimic is OUT of the rotation** — he is the TRUE final boss on the throne floor
  (§5, owner-dictated 2026-06-12 after the first complete 3-floor run unlocked him).
- **[PLACEHOLDER]** rotation mechanics: each run draws 3 DISTINCT bosses from the 4,
  seeded at run start (deterministic within the run so the map preview can name the
  floor's boss). A fixed floor→boss table would make the 4th boss unreachable.

## 1 · Hyper-Inflation Hydra (CANON)

- Identity: **punishes parties that don't close the fight fast.**
- **On taking damage**: spawns a **1/1 head in the lane the damage came from**, in front
  of the Hydra (the head re-walls that lane).
- **Head clock**: separately spawns heads on a cooldown, and **each trigger means MORE
  heads next time** (1, then 2, then 3, …) — inflation. The longer the fight, the faster
  the board drowns.
- **[PLACEHOLDER]** numbers: HP 20 × players × floor. On-damaged head spawn is rate-limited
  to 1 per lane per resolve-batch (or AoE multi-lane hits spawn one per damaged lane —
  AoE bars already show per-target hits). Clock starts at 8s, spawn count starts at 1,
  +1 per trigger, count split round-robin across lanes. Heads are summon-token-class
  (ALWAYS 1/1, exempt from HP knobs, like rats).

## 2 · Litigation Lich (CANON)

- Identity: **forces a long fight.**
- **Timed stances** (owner ruling), telegraphed, alternating on its clock:
  - **Objection stance**: every hit it takes is capped at **1 damage max**.
  - **Recess stance** **[PLACEHOLDER name]**: every hit it takes deals **1 less** than
    rolled. Party plays around the calendar — burst into the weak window.
- **Summons undead AoE creatures** — working name **"Bone Wizard" [PLACEHOLDER NAME,
  owner: "bone wizards or something"]** — that hit **area, not single targets**.
- **[PLACEHOLDER]** numbers: HP 14 × players × floor (mitigation stretches it; raw HP
  stays low so the math doesn't double-dip). Stance windows 10s each, telegraph on the
  threat bar ("⚖ OBJECTION — capped" / "recess — bleed it"). Bone Wizards: 3 HP, lane-AoE
  hit for 1 on a 6s clock, summoned `players`-at-a-time every 12s, spread across lanes.
  Weapon floor note: the −1 stance respects the existing school-tagged ≥1 floor — deals
  land ≥1 unless the cap stance is what's active.

## 3 · Djinn of Deals (CANON)

- Identity: **moves around; AoE attacker; turns your own item economy against you.**
- **Moves around**: NOT back-line — the Djinn occupies a lane and relocates.
  **[PLACEHOLDER]**: teleports to a random OTHER lane on a 7s clock.
- **AoE attack**: **[PLACEHOLDER]**: hits every lane for 2 on a 9s clock (the existing
  all-lanes telegraph flash applies).
- **Every 3rd item the party uses** (party-wide counter): the Djinn **summons one of its
  own items** — an **item-entity** that ATTACKS the party and has **HP equal to the
  item's usual gold cost**.
- **[PLACEHOLDER]**: the summoned item is rolled from the normal item table
  (common/uncommon), lands in the lane of the player whose use tripped the counter, and
  fires its own op on that item's natural cooldown, targeting per the item's semantics
  (front/aimed → front hero of its lane).
- **[PLACEHOLDER]** numbers: HP 18 × players × floor.

## 4 · Kleptomaniac Kraken (CANON)

- Identity: **steals your items and hides behind a tentacle wall.**
- **Steal**: randomly puts a party item on lock and **uses it against the party** — the
  stolen item becomes an **item-entity with HP = its gold cost, same mechanic as the
  Djinn's** (owner: "same mechanic as Djinn of Deals").
- **Rescue** (owner ruling): **killing the stolen-item entity returns the item to its
  owner's hotbar mid-fight.** The lock is exactly as long as the entity lives.
- **Tentacles**: summons **1/1 tentacles**, and on its clock **replenishes the line back
  up to 8 total, regardless of how many were destroyed** (owner's number: 8).
- Back-line boss (CANON — owner named the Kraken for the caravan-mirror treatment).
- **[PLACEHOLDER]** scaling tension, flagged for the owner: the canon "8" reads as the
  full-party number, but the scaling contract says everything scales. Implemented as
  cap = 2 × players (8 at 4P), replenish clock 10s, faster per floor (−2s per floor).
  If 8 should be 8 even solo, delete the scaling — one constant.
- **[PLACEHOLDER]** numbers: HP 18 × players × floor. Steal clock 14s, one item at a
  time per player at most (no player ever fully disarmed below 1 usable item).
  Stolen-entity spawns in the victim's lane. UX: the stolen hotbar slot renders locked
  with "STOLEN — kill it to take it back" and the entity is visibly that item.

## 5 · King Mimic — the TRUE final boss (CANON, owner-dictated 2026-06-12)

- **Unlock condition met**: the owner played a complete 3-floor run (2026-06-12) — King
  Mimic now exists. He comes **after floor 3** as the final boss and should **use every
  mechanic in the game well**.
- **His own custom deck**: he pulls from it, **each ability its own bar before rotating
  out for the next, in a random rotation that has each one covered before it loops back**
  (owner's words — a shuffle bag). His moves are **genuinely big and scary every step of
  the fight**.
- Canon abilities: **deploys powerful heavily-anted foes on the board** · **steals items**
  · **a damage-reduction stance he switches between**.
- **[PLACEHOLDER]** implementer rulings (owner overwrites freely):
  - **Effects persist past their card** — the court stays, steals stay stolen, the stance
    holds until the stance card returns. One-bar-at-a-time would otherwise read CALMER
    than the floor bosses' parallel clocks; persistence is what makes the chaos stack.
  - The deck is four cards reusing the floor bosses' own clock cases (the ultimate mimic
    plays THEIR moves): **DECREE** (new: one armed foe per player, rolled to ante ≥ 7,
    emptiest lanes first) · **STEAL** (= Kraken's, rescue and all) · **STANCE** (= the
    Lich pair: objection cap-1 ⇄ recess −1; opens with no stance up) · **CALAMITY**
    (= the Djinn's all-lanes scorch, dmg 3). Card cds 110/80/70/100 ticks.
  - The reshuffle never repeats the just-fired card back-to-back.
  - **Back-line boss** (caravan mirror), V1 ward/nemesis design fully dead.
  - **Throne floor = 4**: a single boss room, no crawl/shop. HP = 15 × players × 4
    (bossBudget with floor 4 — one past the last real floor).
  - **Beating him completes the run**: `runWon` → victory screen, descend dies, `start`
    from the victory screen begins a fresh run.

## Engine primitives this implies (implementation checklist)

1. Back-line boss entity: spans lanes, per-lane hit attribution, melee-reachable when
   the lane is clear; renderer draws it wide behind the foe rows (caravan mirror).
2. `on-damaged` boss triggers (Hydra heads) with lane context.
3. Escalating clocks (Hydra: +1 head per trigger).
4. Stance phases with telegraphs (Lich) — surfaced on threat bars/snapshot.
5. Party-wide item-use counter (Djinn) — server-side, ticks on EVERY player's use.
6. **Item-entities**: an entity wrapping an item key — HP = gold cost (itemTreasure),
   attacks with the item's op on its cooldown. Shared by Djinn and Kraken.
7. Steal/restore: hotbar lock state in the snapshot (KIT projection is FIELD-BY-FIELD —
   the lock field must be added there or the client never sees it), restore on entity
   death.
8. Replenish-to-cap summons (Kraken tentacles).
9. Boss budget: `bossBudget(players, floor)` = players × floor, threaded into every knob.
10. Per-run 3-of-4 boss draw, deterministic within the run; `bossForFloor` becomes
    run-seeded; map preview keeps working.
11. Remove the ≥3-lane clamp for boss rooms in `lanesFor`.
12. Tests: one block per mechanic + a scaling-grid sanity check (xy ∈ {1..12}); respect
    the cdMult/hpMult pins (`setCdMult(1)`), and summon-token exemptions for heads and
    tentacles.
