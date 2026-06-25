<!-- ⚠️ STALE (pre-rewrite, 2026-06-09) — flagged 2026-06-24. Early vertical-slice plan, superseded
     by the moxie/card rewrite. Source of truth: CORE_LOGIC.md + game.js. -->

# King Mimic — Vertical Slice Spec (Act 1 test run)

> The owner is authoring a single complete run: ~9 bodies, ~12 items, 1 boss, a shop,
> and room/ante/reward formulas. Goal: a clean, intentional slice where every effect works
> as designed, played first solo, then 2-player. This doc is the source of truth as it lands.

## Core model (LOCKED 2026-06-09)
- **Body = HP + a school attack-modifier + (optional) one passive.** "Sword" value = +N to every
  **sword-icon** item the body holds; "staff" value = +N to every **staff-icon** item. No innate
  swing — all attacking flows through equipped kit items, scaled by the matching-icon modifier.
- **Sword items** are themed big/often (single-target burst, multi-hit). **Staff items** are AoE /
  effects. Pure flavor lever to make the phys/mag fantasy read.
- **Items = kit pieces**, the actual actives. Foes carry kits exactly like players. **Only
  asymmetry: players click their kit; foes fire theirs automatically.** Everything else —
  passives, school modifiers, on-damaged, body actives — resolves identically for both sides.
- **Item-less bodies exist only as summons** (rats, elementals spawned by items).
- **"when I sword / when I staff"** = a trigger that fires whenever a sword/staff-icon item resolves.

## Bodies (9) — as supplied
| body | ante | HP | sword | staff | effect |
|------|------|----|-------|-------|--------|
| body | ante | HP | sword | staff | effect | bar? |
|------|------|----|-------|-------|--------|------|
| Royal Rat              | 1 | 6 | 1 | 0 | **Timer passive:** summon a rat every **3s** | 1 body bar |
| Fat Cat                | 1 | 8 | 0 | 1 | **Trigger:** summon a rat when I **take damage** | none (⚡ tag) |
| Lizard Wizard          | 1 | 6 | 0 | 2 | — (pure staff stat body) | none |
| Penny-Pinching Pixie   | 1 | 6 | 2 | 0 | — (pure sword stat body) | none |
| Rent-Seeking Runeblade | 2 | 6 | 2 | 0 | **Static modifier:** my sword bonus also applies to my staff items | none |
| Vengeful Vampire       | 2 | 6 | 2 | 0 | **Trigger:** heal 2 when I **sword** | none (⚡ tag) |
| Market-Crash Minotaur  | 2 | 8 | 1 | 0 | **Counter (trigger):** when I take damage from any source, I **sword** the front enemy (deal my sword value; counts as a sword trigger) | none (⚡ tag) |
| Weary Wageslave        | 1 | 6 | 1 | 0 | **Body Active (timer):** Heal 2 every **2s**, auto-fires | 1 body bar |
| Audit Angel            | 1 | 5 | 0 | 1 | **Trigger:** heal 1 when I **staff** | none (⚡ tag) |

## New engine primitives these imply (to build once the slice is fully specced)
1. **On-item-fire trigger keyed by school** ("when I sword/staff") — fires after a sword/staff item resolves.
2. **Body Active** — an innate ability bolted to a body (not equipped/lootable). Player clicks it; foe auto-fires on a timer.
3. **"I sword / I staff" as an op** — deal damage equal to the body's school modifier, counting as a sword/staff trigger (so it can chain).

## Bar budget & the trigger-vs-timer principle (LOCKED)
- **A threat bar telegraphs a clock.** Timer/cooldown effects need a bar; **trigger effects
  (when I sword/staff, on-damaged, on-deal) need none** — they fire reactively and show as a ⚡ tag.
- **Cap: 3 bars per foe = ≤2 item bars + ≤1 body bar.** The kit roller must keep total foe bars ≤ 3.
- **Default to triggers; reserve timers for bodies whose fantasy IS a cadence** (Royal Rat amassing,
  Wageslave's periodic heal). Of the 9, only those two carry a body bar.

## Resolved decisions
1. **Royal Rat → timer summon, 1 rat / 3s** (30 ticks). The amasser; no longer tied to dealing
   damage. **Fat Cat → on-damaged summon** (reactive, no bar). Rats are summon tokens (item-less).
2. **Minotaur → counter trigger:** on taking damage from ANY source, deal sword value to the front
   enemy in its lane; counts as a sword trigger (chains). Reactive, no bar.
3. **Runeblade:** staff-icon items get (staff + sword) bonus; sword items unchanged. Static, no bar.
4. **Wageslave Body Active → Heal 2 / 2s** (20 ticks), auto-fires like a permanently-equipped item;
   1 body bar. (First *active* bolted to a body, vs. the others being passives.)

## Items (12) — as supplied
> Cooldowns are in **seconds** (×10 = ticks), matching the body timers. "sword"/"staff" in an
> effect = the wearer's effective school modifier (body value + worn +sword/+staff + Runeblade).
> Actives take a damaging-clock bar on foes; **worn passives take a kit slot but no bar.**

| item | ante | icon | effect | cd (s) | target | bar? |
|------|------|------|--------|--------|--------|------|
| Blade               | 1 | sword | deal **sword + 1** | 2 | front (melee) | yes |
| Bow                 | 1 | sword | deal **sword + 2** | 3 | aimed foe | yes |
| Fire                | 1 | staff | deal **staff + 3** | 4 | aimed foe | yes |
| Lightning           | 1 | staff | deal **staff + 1** to lane | 3 | AoE (aimed lane) | yes |
| Wind                | 1 | staff | deal **staff + 1**, move that foe a lane | 3 | aimed foe | yes |
| Heal                | 1 | staff | heal **staff + 2** to a friendly | 3 | lowest-HP ally in lane (incl self) — *proposed* | no (non-threat) |
| Big Shield          | 1 | — | shield 3 (lane) | 3 | own lane | no (non-threat) |
| Trusty Shield       | 2 | — | **Worn:** start combat with 2 lane shield | — | — | no |
| Trusty Blade        | 2 | — | **Worn:** +1 sword | — | — | no |
| Trusty Staff        | 2 | — | **Worn:** +1 staff | — | — | no |
| Scary Knife         | 2 | sword | deal **sword + 1** | 1 | *fork: front or aimed?* | yes |
| Magic Missile Cannon| 2 | staff | deal **staff + 1** | 1 | aimed foe | yes |

### Targeting convention (LOCKED)
Default = **aimed/picked foe**. Keyword overrides: **"melee"** → front foe of the aimed lane;
**"to lane"** → AoE all foes in the aimed lane. So sword isn't always melee (Bow is ranged).

### Worn-passive notes
- **Trusty Blade / Trusty Staff** add additively to the body's school number, scaling every matching
  item — the build-around enablers (e.g. Runeblade + Trusty Staff + staff items).
- **Trusty Shield** fires once at combat start (a new on-combat-start worn hook).

### Items — resolved
- **Heal** → auto-heals the lowest-HP friendly in the caster's lane (self included). No target UI; symmetric.
- **Scary Knife** → **melee (front)**. cd 1s sword poke.

## Rooms (6 enchantments) — as supplied
| room | effect |
|------|--------|
| Hasted     | foes act 20% faster (timer/item cdMul ×0.8) |
| Toughened  | foes have 20% more HP (×1.2) |
| Aggressive | foes deal 20% more damage (×1.2) |
| Extra Guys | ~20% more baseline foes in the opening room |
| **Acid Rain** | NEW — a **global room bar**; when it hits 0, every hero **and every hero-summon** takes 1; bar resets to **6s** |
| **Rat Colony** | NEW — global room bar like Acid Rain, but at 0 it **spawns a rat** (enemy side); resets to **3s** |

> Acid Rain / Rat Colony introduce a **room-level cooldown bar** (new UI, not per-foe).

## Ante (floor 1 / playtest)
- **Default room ante = 2.** Baseline auto-stock for a 2-ante room = **1 foe (1-ante body) + 1
  damaging active item (1-ante)** = 2. Ante of a composition = Σ(body antes) + Σ(item antes).

## Greedy picks
- A greedy add = **pick any foe body; it's auto-assigned 1–2 random items**; it joins your lane.
  Raises the room's ante/difficulty and feeds reward V. (Same as today's greedy flow, new content.)

## RESOLVED — final build decisions (2026-06-09)
1. **Rat token** (the summon exception to "no innate swing"): **1 HP, symmetric** (players AND foes
   summon the same token onto their own side). Spawns at the **back** of the lane it's made in.
   Built-in auto-ability: **deal 1 to the opposing front, every 2s, with its own bar.**
2. **SHIELDS ARE PER-BODY, not per-lane.** Remove `laneShield` entirely. A `shield` value sits on
   each combatant as a temporary HP buffer; incoming damage spends shield before HP. Symmetric.
   - **Big Shield** → grant the caster shield 3. **Trusty Shield (worn)** → caster starts combat with shield 2.
3. **Acid Rain** — 1 to each living hero and each hero-summon individually (spends their shield
   first, then HP), does NOT hit the caravan; room bar = 6s.
4. **Rat Colony** — spawns a rat into a random enemy lane every 3s.

## Build model (how the primitives unify)
- **Auto-abilities (own clock + bar):** foe items (already), **body timers** (Royal Rat summon 3s,
  Wageslave heal 2s), **rat attack** (2s). One mechanism: a timed effect with a cd, ops, label, color.
  Auto-fires for BOTH sides (only *player kit items* are click-to-fire; body timers are automatic).
- **Triggers (reactive, no bar, ⚡ tag):** `onSword` / `onStaff` (fire after a matching-icon item
  or schoolStrike resolves on the source), `onDamaged`. Cover Vampire, Audit Angel, Fat Cat, Minotaur.
- **Static modifiers (no bar):** Runeblade (sword bonus also feeds staff items), Trusty Blade/Staff
  (+1 school), Trusty Shield (on-combat-start shield).
- **New op `schoolStrike`** ("I sword/staff"): deal the source's effective school value to a target,
  and emit that school's trigger (so Minotaur's counter can chain).

## BUILD ORDER (this session → handoff when "playable up to the boss")
**Verify each stage with a probe (the old test suite can't guard a semantics rewrite — see Stage 5).**

- [x] **1a. Per-body shields** — `laneShield` no longer absorbs; combatants carry a `shield` buffer
  spent before HP (`absorbShield`), symmetric foe/player/ally; `shield` op buffs the caster (both
  resolver branches); fully-shielded hit fires no on-damaged. Snapshot ships `shield` per combatant.
  *Note:* `room.laneShield` array still exists but is dead (always 0) so the snapshot/client don't
  crash — **client still renders a lane-shield (always empty); remove in Stage 4.** Verified: `probe_shield.mjs`.
- [x] **1b. Symmetry spine** — worn body passives fire for players: player loop runs `tickOwnTimers`
  + hourglass (`body.cd>0`); `damagePlayer` fires on-damaged; resolver player branch gained `attack`
  + `healAttack`; `wearBody` now uses `b.phys ?? b.atk ?? 0` (matches `spawnEnemy`, so worn bodies
  grant their attack Power). Verified: `probe_symmetry.mjs` (basilisk/royalRat/wageslave/vampire/
  accountant/internImp/mummy all act for the wearer).
- [x] **1c. New triggers + op** — `fireSchoolTrigger` runs `on:"sword"`/`on:"staff"` body passives
  after a matching-icon item OR `schoolStrike` resolves (in `useItem` AND the foe item loop); foe
  `deal` now scales with school Power too (symmetry); `schoolStrike` op in both resolver branches
  (deal school Power → emit trigger). item `type:physical`=sword, `type:magical`=staff.
  Verified: `probe_school.mjs`.
- [ ] **2. Content swap** — replace BODIES with the 9 (sword→phys, staff→mag; triggers/timers/static
  per SLICE) + the rat token (1 HP, `every:20` attack-1, spawns at lane BACK, both sides); replace
  KIT with the 12 items (targets per the convention; Trusty Blade/Staff = worn +phys/+mag; Trusty
  Shield = on-combat-start shield 2; Big Shield = shield 3). Update draft pools (FOE_BODIES/
  BASELINE_POOL) + `tiers`/ante to the 9. Make non-damaging `every:N`/timer bars render (Royal Rat
  summon, Wageslave heal) with a neutral (non-threat) color.
- [ ] **3. Rooms** — 6 enchants (Hasted ×0.8 cd / Toughened ×1.2 hp / Aggressive ×1.2 dmg / Extra
  Guys ×1.2 count / **Acid Rain** room-bar 6s → 1 to each hero+summon / **Rat Colony** room-bar 3s →
  rat to a random enemy lane). New room-level cooldown bar. Ante default 2; greedy adds a foe + 1–2
  random items.
- [ ] **4. Client** — per-body shield pip; body-timer bars; school-trigger ⚡ tags; room-level bar;
  REMOVE the lane-shield render (left over from 1a).
- [ ] **5. Tests** — rewrite `game.test.js` to the symmetric/per-body-shield/new-content spec; fuzz/
  serve/smoke green. **Boss code left untouched** (its reward + the boss fight are the NEXT slice).

- [x] **2. Content swap** — DONE. 9 bodies + rat token in BODIES (sword=phys/staff=mag, cd:0);
  12 items in KIT (cd in ticks); new mechanics: `itemStatBonus` (Trusty Blade/Staff worn +phys/+mag),
  `swordFeedsStaff` in `powerFor` (Runeblade), `healAlly`+`lowestHpFriendly` (Heal), `combatStartShield`
  in `beginCombat` (Trusty Shield), ally-loop de-swing (rats attack via `every:20`). Draft/baseline/foe
  pools + classes repointed. `spawnEnemy` guards unknown keys (boss court). Verified: `probe_full/mech.mjs`.
- [x] **3. Rooms** — DONE. 6 ENCHANTS (Hasted/Toughened/Aggressive/Extra Guys + `roomTimer` Acid Rain/
  Rat Colony); `applyEnchantToFoe` (foeHpMul/foeDmgMul/foeCdMul), `baselineSize` foeCountMul,
  `roomTimersFor` + `processRoomTimers` in simulateTick. Ante=2 baseline & greedy 1–2 items already conform.
- [x] **4. Client** — DONE (essentials). Snapshot ships per-combatant `shield`, foe `name`, `roomTimers`;
  lane-shield field removed (render no-ops). Player HUD + foe card show shield buffer; HUD shows room-timer
  countdown. `bodies` map is server-sent (all 10) so the renderer is crash-safe. Parses clean.
  *Remaining polish (non-blocking):* ⚡ on/sword-staff trigger tags, neutral bars for non-damaging body
  timers (Royal Rat summon / Wageslave heal), and the `?demo=` fixtures still show old content.
- [x] **5. Tests** — DONE. `game.test.js` rewritten to the symmetric spec (39/39). e2e (full run) ·
  smoke (2-client MP) · fuzz (60 full runs) all green against the live server. Boss untouched (next slice).

### Resume notes (in-progress build, 2026-06-09)
- **Stages 1a+1b done & probe-verified.** Old suite = **432/450**, the 18 reds are all expected drift
  (per-lane→per-body shields; starter `atk` now counts as sword Power). No crashes. Don't "fix" them
  piecemeal — they're rewritten in Stage 5.
- Scratch probes in repo root: `probe_shield.mjs`, `probe_symmetry.mjs`, `probe_passives.mjs`,
  `probe_one.mjs`, `probe_tmp.mjs` (all throwaway — `! rm` when done).
- **Do NOT write the playtest HANDOFF until Stage 4 lands and a live run reaches the boss node.**
