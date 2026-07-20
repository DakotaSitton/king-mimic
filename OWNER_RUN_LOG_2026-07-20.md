# King Mimic owner-run log — 2026-07-20

## Pre-freeze shakedown 1 — completed

- Deployed commit: `96ffb76f4b945edcdbbdeed116a1a035f9d5adc9`
- Production room: `S8FH`
- Run id: `run-2026-07-20T15-53-17-221Z-S8FH`
- Configuration: solo, manual, phone-landscape owner play
- Starting/current body: Bankrupt Basilisk
- Result: throne victory on floor 4 after 19 resolved combats
- Final recorded body state: level 10; HP 28; allocation `hp:5, mastery:1, specialty:2`
- Main line: Basilisk Mastery doubled the lane poison and Specialty rank 2 reduced its spend trigger
  from 3 moxie to 1. The final deck leaned on repeated low-cost Grit casts to trigger 2 lane poison
  per 1 moxie and became effectively unstoppable.
- Printed-rule/gameplay finding: a one-moxie trigger is too efficient for this poison payoff. Owner
  ruling: “1 moxie should never be that strong”; scrutinize every passive upgrade that reduces a
  trigger threshold or cadence before the public-alpha freeze.
- Presentation findings: King Mimic's command rail appeared but his battlefield body/art did not;
  the completed-run victory actions were visibly off-center.
- First unclear next action: not recorded.
- Immediate voluntary replay desire: not recorded; owner described breaking the game as a mixed
  feeling.

This is retained as a **pre-freeze shakedown**, not silently mixed into Gate 1's eight-run cohort.
The findings require gameplay and client changes, so the eight-run owner set starts after the repaired
candidate is deployed and frozen.

## Pre-freeze shakedown 2 — completed

- Deployed commit: `983c8a69068ee77d8c66b32c4a198cf67bb1720b`
- Production room: `GDZ4`
- Run id: `run-2026-07-20T18-08-43-338Z-GDZ4`
- Configuration: solo, manual, phone-landscape owner play
- Starting/final body: Market-Crash Minotaur (`bloodfund`)
- Result: defeated by Hyper-Inflation Hydra on floor 3 after 18 resolved combats
- Kraken finding: clear-lane melee searched another lane before the living backline boss, so a
  stolen animated Triblade intercepted attacks aimed at Kraken. Corrected order is own-lane blocker,
  then backline boss, then cross-lane breach when no boss exists.
- Hydra finding: the 106-second fight resolved only eight Hydra cards, but 109 separate 1-HP heads
  died and their independent clocks emitted 234 one-damage attacks. The scaling loss was fair; the
  entity/event explosion was not legible.
- Owner rulings implemented: Hydra spans four lanes; generic head summons roll lanes independently;
  Heads Up grows the lane that damaged Hydra; each lane holds one HP-backed head stack whose HP,
  displayed count, and combined four-second bite all equal its living heads.
- Playtest tooling request: a secret-gated OWNER LAB now offers all 37 wearable bodies with their
  real starter decks, follows the normal run/reconnect lifecycle, and is excluded from public-alpha
  balance telemetry by default.
- First unclear next action: Hydra's many independent head attacks and single-lane presentation made
  the fight chaotic and difficult to parse.
- Immediate voluntary replay desire: not recorded; the owner asked for a targeted-body playtest path.

This is also a **pre-freeze shakedown**. It forced combat and client changes, so it does not count as
Gate 1 run 1. The frozen eight-run owner cohort begins only after this repaired candidate is deployed.
