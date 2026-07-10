# FOE + ANTE + LEVEL — as implemented (2026-06-27, owner-corrected)

> **CHANGELOG 2026-06-27 (owner answers applied):** (1) combat grant now starts at **LEVEL 3**, not
> level 1 — `levelCombatBonus = floor((L-1)/2)`; (2) **PLAYER-SIDE leveling** built (1:1 symmetry —
> both sides level the same curve); (3) **ELITES + Atlas, Shrugging** built (replaces the placeholder
> doubled-budget room). Win-con shop premium still NOT built (owner hasn't given qualifying bodies/multiplier).

This is your foe-level / archetype-kit / no-ante-floor overhaul, written so you can read it
back and correct it in your own words. Everything below is LIVE in `game.js` with tests in
`test/game.test.js`. Every number called out as **(knob)** is a single named constant you can
re-tune without touching logic. **FLAGS** = places your spec was ambiguous; I picked the most
literal/conservative reading and named it — tell me if any is wrong.

---

## 1) FOE LEVELS

Every combatant carries an integer `level ≥ 1`. **Level 1 is the BASE (no bonus).** Reaching levels
grants, cumulatively (owner correction 2026-06-27 — combat starts at **L3**):

| level | grant | running HP bonus | running combat bonus |
|------:|-------|-----------------:|---------------------:|
| 1 | BASE (nothing) | +0 | +0 |
| 2 (even) | +4 HP     | +4 | +0 |
| 3 (odd)  | +1 combat | +4 | +1 |
| 4 (even) | +4 HP     | +8 | +1 |
| 5 (odd)  | +1 combat | +8 | +2 |
| …     | …         | … | … |

Closed form (all exported, all unit-tested):
- **HP bonus** = `LEVEL_HP_PER_EVEN` × floor(L/2) = `4 × floor(L/2)` **(knob: `LEVEL_HP_PER_EVEN=4`)** — owner 2026-07-09 (was 3)
- **combat bonus** = `LEVEL_COMBAT_PER_ODD` × floor((L-1)/2) = `1 × floor((L-1)/2)` **(knob: `LEVEL_COMBAT_PER_ODD=1`)** — CORRECTED (was `ceil(L/2)`)
- **ante** = `LEVEL_ANTE_PER` × L = `2 × L`, scales infinitely **(knob: `LEVEL_ANTE_PER=2`)** — UNCHANGED

**"+1 combat" lands on the foe's RELEVANT stat.** A melee-kit foe gets `+meleeBonus`; a
ranged-kit foe gets `+rangedBonus` (the existing `meleeBonus`/`rangedBonus` knobs that your
flat cards already read). The foe "picks the stat matching its damaging items": `foeCombatStat`
counts the melee vs ranged damaging cards in its kit and banks the level combat into the
majority kind (ties fall back to the body's archetype, then melee).

- **RESOLVED — even/odd reading.** Owner correction applied: **level 1 is the BASE (no bonus)** and
  the **first combat grant lands at LEVEL 3**. `levelCombatBonus` is now `floor((L-1)/2)` (was `ceil(L/2)`).
  A baseline level-1 foe carries **+0 combat**; an L2 foe is HP-only (+4 HP); L3 is the first +1 combat.
- **FLAG — summons & bosses are EXEMPT from leveling.** A rat stays 1 HP, a boss keeps its
  budgeted HP, regardless of any level passed in (same logic as the HP-knob exemption). Only
  normal foes take level grants. Confirm you want summons/bosses untouched.

---

## 2) ARCHETYPE-AWARE KITS

Every foe rolls **at least 3 cards** **(knob: `FOE_MIN_CARDS=3`)**, capped at `FOE_MAX_GEAR=6`,
and every card must FIT the body's archetype:

- A **ranged/caster** body (e.g. Lizard Wizard) takes ranged cards; melee cards AND melee-only
  buffs (Sharpened Edges, Demon Form, Berserker) are kept off it.
- A **melee** body takes melee cards; ranged cards AND ranged-only buffs (Wizard Hat, Sage Mode)
  are kept off it.
- **Pure utility** (shields, heals, summons, Taunt, generic +damage, worn passives) fits ANY body.
- A **flex** body (no innate melee/ranged identity) accepts both.

Slot 1 is always a card the body can actually deal damage with (no toothless openers, no
base-0 dud-damage like Pile On on a 0/0 chassis).

- **FLAG — archetype map.** The school-free bodies carry no phys/mag/affinity field, so I DERIVED
  each body's melee/ranged/flex identity from its own passive's flavor and froze it in one table,
  `FOE_ARCHETYPE` (game.js). My read:
  - **ranged/caster:** Fat Cat, Royal Rat, Paid Piper, Lizard Wizard, Crypto-Chimera
  - **melee:** Weary Wageslave, Vengeful Vampire, Market-Crash Minotaur
  - **flex (both):** Centless Centaur, Malevolent Mouse, Interest Imp, Rent-Seeking Runeblade,
    Toll Troll, Bond Behemoth, Golden Golem
  This is the one table to hand-correct if any body is mis-cast.

---

## 3) NO ANTE FLOOR — rooms are GENERATED to fill a BUDGET

The floor-raising ratchet is **gone**: `anteMin`, the "up the ante" button, and the "pad the
room to a minimum" gate are retired (`upTheAnte` is now an inert no-op, `stockAnteRequired`
returns 0, `stockReady` is always true). A combat room now **auto-generates** its foes to FILL
an ante **budget** (`anteCap`) with a mix of levels + fitting items, with **no minimum**:

- The budget = `roomAnteBudget` = `ROOM_ANTE_BUDGET_PER × (party × floor) × (elite ? 2 : 1)`
  **(knob: `ROOM_ANTE_BUDGET_PER=5`)**. Solo·floor1 = 5; 4P·floor3 = 60; an elite double-feature
  doubles it.
- `generateRoomFoes` adds leveled, fitting foes one at a time (each ≤ remaining budget) until the
  budget can't fit another, `STOCK_MAX` is hit, or a random early stop fires
  **(knob: `ROOM_FILL_STOP_CHANCE=0.2`)** — that early stop is the "mini opponent" variance:
  **sometimes one small low-level foe, sometimes a packed room.** A combat room is never empty
  (always ≥1 foe).
- The old greedy-add palette survives as **pure upside** (invite EXTRA foes for more loot), now
  offering leveled options. There is no floor to meet, so you can begin immediately.

- **FLAG — budget scale (`ROOM_ANTE_BUDGET_PER=5`).** This is the headline balance dial. At 5,
  solo·floor1 ≈ one minimal foe. Raise it for fuller rooms, lower it for sparser ones. This is
  your call — I picked 5 because the cheapest possible foe (3 cards + level-1) costs exactly 5
  ante, so solo·floor1 lands on "one small opponent."
- **FLAG — body base ante dropped.** Your formula was explicit: `ante = sum(item ante) + 2×level`.
  That means the body's old flat **+1** is gone (replaced by the level term; a level-1 foe antes 2,
  not 1+items). Body `gold` still drives adoption/unlock pricing, untouched.
- **FLAG — level distribution algorithm (mine to choose).** Per-foe level is capped three ways —
  what the budget affords, a sanity cap `FOE_LEVEL_CAP=8`, and a **floor-scaled cap**
  `LEVEL_FLOOR_BASE + floor` **(knob: `LEVEL_FLOOR_BASE=2`** → floor1 caps at level 3, floor2 at 4,
  floor3 at 5) — and the roll is **biased toward low** (`1 + min(two draws)`). Net: early rooms
  stay low-level, high-level foes are the rare top of a range, and room 1 can't open on a level-8
  mini-boss. Reshape the curve by tuning `LEVEL_FLOOR_BASE` / `FOE_LEVEL_CAP` / the bias.

---

## 4) PLAYER-SIDE LEVELING — 1:1 symmetry (owner spec 2026-06-27, BUILT)

Players level their OWN body on the **exact same curve** foes use (`levelHpBonus`/`levelCombatBonus`),
so **a level-3 Market-Crash Minotaur is identical as a player or a foe** — the symmetry pillar is restored.

- **Leveling is PER-BODY.** `player.bodyLevels` maps `bodyKey → level`; `player.level` tracks the worn
  body's level. A leveled Minotaur stays leveled when you swap away and back; an unleveled body is level 1.
- **Cost = `levelUpCost(L) = LEVEL_UP_COST_PER × (L-1)`** **(knob: `LEVEL_UP_COST_PER=5`)** → 5 to hit L2,
  10 for L3, 15 for L4 … (the single step that LANDS on level L; from level `cur` the next step costs `5×cur`).
- **Tender = owned cards (value-for-value), exactly like the shop's `buyWare`:** the pay-cards' summed
  `itemTreasure` must cover the cost; copies spend from **spares first**, deck copies only when forced, never
  dropping the deck below `MIN_DECK`. Out-of-combat only (a prep action). Server route: `levelUp` (`msg.pay`).
- **Grants** apply via `applyBodyLevel`: `maxHp = base + levelHpBonus(L)`, and the level's **combat** lands
  on the body's stat (melee/ranged, via `foeCombatStat` over the player's DECK — same "picks the stat matching
  its damaging items" rule). The combat base is stashed on `levelMelee`/`levelRanged` and **re-applied each
  fight at `beginCombat`** (mirroring how a foe bakes its level combat in at spawn; in-fight ramps add on top).
- **FLAG — cost reading.** "cost-to-reach-level-L = 5×(L-1)" read as the SINGLE step landing on L (5/10/15…),
  matching all three of your examples literally. (NOT a cumulative-to-reach total.)
- **FLAG — combat stat source.** A player's "kit" = its `deckList`; `foeCombatStat` reads that for melee/ranged.
- **FLAG — client UI is a STUB.** Server mechanic + `levelUp` action + snapshot data (`player.level`,
  `player.nextLevelCost`) are LIVE. The actual pay-card-picker UI is NOT built — the client can post `levelUp`
  with the pay keys, but there is no button/affordance yet. Build it when you want it surfaced.

## 5) ELITES — "Atlas, Shrugging" (owner spec 2026-06-27, BUILT)

The placeholder doubled-budget elite room is **REPLACED**. An elite room now spawns **ONE ~15-value elite
body (Atlas) + MP-only backup regular foes** (solo faces Atlas alone). `enterRoom`'s elite branch calls
`generateEliteFoes` instead of `generateRoomFoes`. (The doubled `anteCap` survives only as the "double
feature" label / back-compat number.)

- **Atlas, Shrugging** = a new BODY (`atlas` in `BODIES`), one tier below a boss, **adoptable once felled**
  (you can WEAR what you beat — symmetry). It is a LEVELED foe (takes the curve), not a boss.
- **The 15-value** is realized AS a high-LEVEL loaded foe: `rollEliteFoe` picks the level so
  `anteOfFoe = items + 2×level ≈ ELITE_BODY_VALUE` **(knob: `ELITE_BODY_VALUE=15`)** → ~L6 + 3 cards = 15.
  It drops its weight through the normal loot math, and a player could level a body to the same elite tier.
- **The 1:1 SYMMETRIC passive (`atlasReflect`):** every `ATLAS_REFLECT_PER` **cumulative damage Atlas TAKES**,
  he SHRUGS, dealing `ATLAS_REFLECT_BASE + his own melee bonus + ranged bonus` to **ALL OPPOSING combatants in
  his lane** **(knobs: `ATLAS_REFLECT_PER=10`, `ATLAS_REFLECT_BASE=5`)** (owner 2026-07-08 — reading his OWN
  bonuses keeps it symmetric: foe-Atlas scales off baked-in level combat, worn-Atlas off your stacked
  melee/ranged bonus). foe-Atlas → every hero + ally summon in his lane (empty
  lane → the caravan); player-Atlas → every foe (+ the back-line boss) in his lane. A damage-TAKEN accumulator
  (`atlasClock`), fed the GROSS landed damage (shielded damage counts, like the other on-damaged clocks); a
  room-level re-entrancy guard (`_inShrug`) stops a shrug's own AoE from cascading.
- **Base HP 14** (boss bases are 15–21; the level curve stacks on top → a 15-value Atlas ≈ 23 HP). Tunable.
- **MP backup** = `generateRoomFoes` over a budget of `ELITE_BACKUP_PER × (extra players) × floor`
  **(knob: `ELITE_BACKUP_PER=4`)**. Solo = none.
- **FLAG — Atlas is the ONLY elite specified.** The framework (`atlasReflect`, `rollEliteFoe`,
  `generateEliteFoes`, `ELITE_BODY`) is generic, but only Atlas exists. **More elite bodies need owner design.**
- **FLAG — base HP 14 / backup budget** are my picks (tunable knobs). Confirm or re-dial.

## 6) WIN-CON PREMIUM bodies in the shop — STILL OPEN (NOT built)

Unchanged from before — need from you: **what qualifies** as a "big win-con passive" (which bodies) and **the
multiplier** on its shop price. Left clean rather than half-built.

---

## What to read in code
- Level math + ante formula: `game.js` — `LEVEL_*`, `levelHpBonus/levelCombatBonus/levelAnte`,
  `anteOfFoe`, `foeMaxHpFor`.
- Player leveling: `bodyLevelOf`, `applyBodyLevel`, `wearBody`, `beginCombat` (combat-base restore),
  `LEVEL_UP_COST_PER`/`levelUpCost`/`levelUp`; server route `levelUp` in `server.js`.
- Elites + Atlas: `BODIES.atlas`, `atlasReflect` (called from `damageEnemy`/`damagePlayer`),
  `ELITE_BODY`/`ELITE_BODY_VALUE`/`ELITE_BACKUP_PER`, `rollEliteFoe`, `generateEliteFoes`, `enterRoom` (elite branch).
- Archetype fit: `FOE_ARCHETYPE`, `itemFlavor`, `itemFitsArchetype`, `foeCombatStat`, `rollFoeKit`.
- No-floor generation: `roomAnteBudget`, `rollLeveledFoe`, `generateRoomFoes`, `enterRoom`, `spawnEnemy`.
- Tests: `test/game.test.js` — search "FOE LEVELS", "PLAYER-SIDE LEVELING", "ATLAS", "ELITE ROOM",
  "ARCHETYPE-AWARE KITS", "NO ANTE FLOOR".
