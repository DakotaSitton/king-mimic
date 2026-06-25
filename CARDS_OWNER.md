# NEW DIRECTION (owner 2026-06-22): NO sword / NO staff — school-free

The two-school Power model is being removed. **Cards carry their own flat numbers; bodies are just
HP + a passive; nothing scales off a body.** You're authoring all-new cards and bodies to this; feed
them and they drop in. The engine **already** computes flat, body-independent damage for any card
without `type` (verified: a 5-damage card deals 5 on a Power-9 body). So the path is open NOW.

### New CARD schema (author to this)
```
{ name, cost, icon, color, ranged?, rarity, text, ops }
```
- **NO `type`** (no physical/magical). **NO `mult`** — bake the final number into `amount` (flat).
- `icon` — the card's own emoji (replaces the forced ⚔/✨; a card with no icon just shows its number).
- `ranged: true` → the card aims a foe (`target:"pick"`); omit → it hits the front of your lane.
- `ops` use flat `amount`: `deal`/`shield`/`healAlly`/`pushBack`/`delay`(moxie drain)/`comboBuff`/
  `summon`/`thorns`/`buff` all work unchanged — they just no longer add any body Power.
- `rarity` (int, =value). Targets: `front` / `front2` / `lane` / `pick`.

### New BODY schema (author to this)
```
{ name, maxHp, color, passive? }
```
- **Drop** `phys` / `mag` / `atk` / `echo` / `costDiscount` / `effectBoost` / `swordFeedsStaff`.
- `passive` — one trait. Available engine hooks: `{ dr: N }` (take N less), `{ aura: {dmgBonus?,
  dmgReduce?} }` (lane token), `{ spend: N, ops:[…] }` (every N moxie spent → fire ops),
  `{ spendOrHit: N, ops:[…] }`, `{ on:"hit"/"spend", … }`. Pick ONE per body, or none.
- A token that auto-swings (rat-style) keeps a small `atk` + an innate-attack passive — that's a
  number, not a school, so it's fine.

### What I did to PREPARE (2026-06-22)
- Verified flat/body-independent damage for typeless cards; made `cardDmgLabel` use each card's own
  `icon` (no forced sword). New typeless/flat cards + HP-only bodies work today.
### What's DEFERRED to when your content lands (so tests rebaseline against real values, not blind)
- Deleting the now-dormant school machinery (`powerFor`/`effPhys`/`effMag`, echo, cost-discount,
  effect-boost, school-triggers, `mult`) and rebaselining the ~135 school-coupled tests. Doing it
  before your new cards/bodies arrive would mean re-pinning 135 tests to numbers you're about to throw
  away. **Feed the new bodies (and cards); I'll swap content + rip the dead machinery + re-green in one
  coordinated pass.**

---

# Owner's Canonical Base Set — King Mimic (20 cards) — SUPERSEDED by the school-free redesign above

**Hand-designed by the owner, submitted 2026-06-22.** These 20 are THE in-game cards. The draft
wheel, starter decks, loot, and shop all draw from this set (`PLAYER_POOL` in `game.js`). The old
"first-set" cards (Blade/Fireball/Magic Missile/etc.) are **retired from every in-game pool** and
kept in `KIT` only as test scaffolding. Keyed `o*` so they sit alongside the retired set without
colliding (e.g. `oFire` vs the retired `fire`).

> Persisted here on purpose: the handoff lamented these lived "only in chat." This file is the
> source of truth. The implementation is in `game.js` (KIT section "OWNER'S CANONICAL BASE SET").

> ⚠️ **STALE IMPLEMENTATION COLUMNS — corrected 2026-06-24.** The sword/staff Power-scaling and the
> `×N` multipliers described in the tables below are NO LONGER how these cards work in code. The `o*`
> cards were FLATTENED to school-free: they carry no `type` and no `mult`, and every number is now
> flat. So `Zweihänder` deals a flat **6** (not "sword × 3"), `Twin Uchis` a flat **4**, `Meteors` a
> flat **6 lane**, `Force` a flat **6 shield**, `Power Up` grants a school-agnostic **+1 damage**
> (the `counter` ramp, applies to any melee/ranged hit), `Holy` heals a flat **5**, etc. The ONLY
> live combat axis is **melee vs ranged**; no card scales with a body's Power. The owner's design
> intent (effects/targets/costs) below still stands — only the "scales with sword/staff Power" /
> "Power×N" mechanic is gone. (Verbatim submission preserved as the design record.)

## The submission (verbatim values — Power-scaling now FLATTENED; see banner above)
Format: **rarity** (all 1 = base/common) · **name** · **cost** (moxie) · effect. ~~"sword"/"staff" =
your body's Physical/Magical Power; the card's number adds on top. `×N` multiplies that Power.~~
(Historical: as flattened 2026-06-24, the listed number IS the whole flat damage — no Power, no `×N`.)

### Physical (sword)
| Card | Cost | Effect | Implemented as |
|------|:----:|--------|----------------|
| Sword | 2 | deal sword + 1, melee | `deal +1 front` |
| Hatchet | 3 | deal sword + 2, melee | `deal +2 front` |
| Spear | 2 | deal sword to foe and the foe behind it, melee | `deal +0 front2` |
| Bow | 2 | deal sword, ranged | `deal +0 pick` (ranged) |
| Dagger | 1 | deal sword, melee | `deal +0 front` |
| Javelin | 4 | deal sword + 3, ranged | `deal +3 pick` (ranged) |
| Mallet | 4 | deal sword + 2, gain damage in shield | `deal +2 front` → `shield = damage dealt` |
| Zweihänder | 5 | deal sword × 3, melee | `deal ×3 front` (Power×3) |
| Twin Uchis | 3 | deal sword × 2, melee | `deal ×2 front` (Power×2) |
| Power Up | 2 | Gain +1 to sword | `+1 sword Power buff` — **rest of fight** ⚠️ |
| Combo Blade | 3 | Deal sword, your next 3 cards deal +1 | `deal +0 front` → `comboBuff n3 +1` |

### Magical (staff)
| Card | Cost | Effect | Implemented as |
|------|:----:|--------|----------------|
| Fire | 3 | deal staff + 3 | `deal +3 pick` |
| Ice | 3 | deal staff + 1, reduce their moxie by 1 | `deal +1 pick` → `drain 1 moxie (pick)` |
| Lightning | 3 | deal staff + 1 to entire lane | `deal +1 lane` |
| Arcane | 1 | deal staff | `deal +0 pick` |
| Dark | 4 | deal staff + 2, heal the damage | `deal +2 pick, lifesteal` |
| Wind | 2 | deal staff + 1, push foe to back | `deal +1 pick` → `pushBack` |
| Holy | 3 | Heal staff + 3 | `healAlly +3` (scales with staff Power) |
| Force | 4 | shield staff × 2 + 2 | `shield = staff Power×2 + 2` |
| Meteors | 5 | Deal staff × 2 + 2 to lane | `deal (Power×2 + 2) lane` |

## Judgment calls (mine — correct any and I'll adjust)
1. **The leading "1"** read as **rarity = 1** (all base/common). The second number = **moxie cost**.
2. **`×N`** scales the **Power**, with any flat "+M" added on top (e.g. Meteors = staff×2 **+2**;
   Zweihänder = sword×3 with no flat add). It is *one* hit of multiplied damage, not N separate hits.
3. **Power Up** = a **sword-only** Power buff (+1), lasting **the rest of the fight** (cleared at the
   start of the next combat). Duration wasn't specified — this was my read of "Gain +1 to sword."
4. **Mallet** shields you for the **actual damage dealt** (after Power), not the base.
5. **Holy** scales its heal with staff Power (like all staff cards); raw text just said "+3".

## Verified (2026-06-22)
`bun _ownerprobe.mjs` with sword/staff Power 2 — every card hit its expected number (Zweihänder 6,
Meteors 6, Force shield 6, Mallet dmg 4/shield 4, Dark lifesteal, Ice drain 1, Power Up +1, Combo +1).
Full suite green (`bun test` 493 + 22).

## 1:1 PLAYER/FOE PARITY (owner 2026-06-22)
Foes ARE players now. Audited:
1. **Body pool identical** — `DRAFT_BODIES` == `FOE_BODIES` == `MOXIE_SET` (15 bodies; both draftable
   and foe-rostered).
2. **Body stats identical** — a player wearing body X has the same HP/phys/mag as a foe spawned as X.
3. **Same card universe** — foes draw from `rollKit` (your 20, school-fit), the same builder a drafting
   player uses. `buildQueue` no longer uses `FOE_DECKS`; legacy off-set gear is dropped, so every foe
   queue is **100% your cards**. Summon tokens (rats/flags/knights) and the Djinn's animated-item
   entities are exempt (they have no deck — tokens swing innately, the entity casts its embodied item).
4. **Same draw pool** — the set of cards a player can draw == the set a foe can draw (all 20).

**Deck SIZE is intentionally NOT 1:1 (owner 2026-06-22):** a foe OPENS with only `FOE_START_MIN..MAX`
(1–2) cards — the in-house first slots of `rollKit` — while a player opens with `MIN_DECK` (10). The
card vocabulary stays identical; only the count differs. The owner is reworking the **ante/scaling**
system that grows a foe's deck from there — leave the ante system to him.

**The ONE intentional asymmetry — the DRAW (DECIDED, keep it):** you draw a hidden HAND of 5 from a
shuffled deck; a foe cycles its deck as a VISIBLE ordered QUEUE — the telegraph. Same cards, same
costs, same `resolveOps`; only the reveal differs. Owner confirmed 2026-06-22: **keep the telegraph**
(do NOT unify the foe draw — being able to read what a foe will cast is the point). Everything else
is 1:1; this difference is by design, not a gap. Don't re-raise it.

## Still on the old set (deferred)
- **Loot/shop** pools: draft + starter + foe decks are all on your set; the loot/shop currency economy
  is the deferred §1 build (still gold-based in code).
