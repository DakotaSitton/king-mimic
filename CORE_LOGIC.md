# King Mimic — CORE LOGIC (authoritative 2026-06-23)

> **Ground-truth rule:** the running engine (`game.js`) is the single source of truth.
> When this document and any other doc disagree, this document reports the code truth
> and flags the other doc as stale. When this document and the code disagree,
> the CODE wins — file a correction here. All line references are approximate;
> search by function/constant name for the live position.

> ### ⚠️ STATUS CORRECTIONS — 2026-06-24 (read first; this doc is now self-stale below)
> Changes that landed AFTER the body of this doc was written. Where they conflict, these win:
> - **GOLD / TREASURE ECONOMY FULLY REMOVED.** `treasure`/`earned`/`buyShopItem`/`unlockGold`/
>   `goldsReached`/`creditRoomIncome` are GONE; the `◈` card **value** is the only resource now
>   (loot, shop, foe-gear weight all read it). → This **inverts §4 rows on gold (the "gold is
>   alive, CARDS_SPEC §1 is stale" verdicts) and §5's "live economy is gold/treasure-based" note.**
>   CARDS_SPEC's no-currency direction is now the live direction. Verified by tests
>   (`game.test.js` gold-removed invariants) and HANDOFF.md.
> - **`content-tank.js` / `content-summon.js` / `content-misc.js` (agent-designed cards) DELETED.**
>   (See §5 note below — they were never merged; now removed from disk too.)
> - **`FOE_DECKS` retired** (foes use `rollKit`/WYSIWYG). The map is KEPT in `content-cards.js`
>   marked retired (the file is untracked — no git backup — so the data is preserved, not cut).
> - **Pre-rewrite card gallery retired:** `content.js` + `public/cards.html` + `public/cards.js`
>   + the `/content` server route are gone (they rendered the deleted cooldown-bar model).
> - **SWORD/STAFF SCHOOL POWER-SCALING IS GONE FROM PLAY (owner-confirmed 2026-06-24).** The ONLY
>   live combat axis on cards is **MELEE vs RANGED**. No card scales with sword/staff (physical/
>   magical) Power anymore. The live card pool (`PLAYER_POOL` = the `o*`/`d*` keys) carries NO
>   `type` field and NO `mult`; every number is FLAT (`op.amount` + counters/perAlly/shield only).
>   The live body set (`MOXIE_SET`, the 15) is school-free `{name, maxHp, passive}` — passives key
>   off `melee`/`ranged`/generic triggers (`dealtMelee`/`dealtRanged`/`pairMR`/`hit`/`spend`/`play`),
>   never `on:"sword"/"staff"`. Verified against `game.js`: `playCard`/`foeCast` pass `item.type`
>   (now always `undefined` for live cards) into `resolveOps`, so `powerFor(...)` returns 0, every
>   `school &&` guard skips, the echo bar (`tickEchoBar` gated on `BODIES[..].echo`, absent on the
>   live 15) never charges, and `fireSchoolTrigger`/`costDiscount`/`effectBoost` are all inert.
>   → This **corrects §3.1's "MOXIE_SET still carry phys/mag" claim, §3.2's "all `o*` carry `type`
>   and scale via `powerFor`, `mult` active" claim, and reframes §5 below.**
> - **School-MACHINERY deletion still DEFERRED (≠ scaling).** Distinguish two things: (a) school
>   *scaling* is already GONE from gameplay (above — no live content invokes it); (b) the school
>   *machinery/identifiers* (`powerFor`/`effPhys`/`effMag`/`effAtk`/`schoolStrike`/`fireSchoolTrigger`/
>   echo bar/`swordFeedsStaff` + the legacy `blade`/`fire`/… first-set KIT keys + ~135 school-coupled
>   tests) still LINGER in `game.js` as dead-but-defined scaffolding. Deleting that machinery is the
>   owner-gated rip (§5). Do not delete it; it is dormant, not harmful.

---

## 1. Identity & Design Pillars

**What King Mimic IS (owner's stated vision):**
> A co-op, deckbuilding, real-time roguelike. The defining niche: **you and the foes play by
> the exact same rules with the same cards** — a Mega-Man / mimic-esque symmetry where you
> wear the bodies of foes you defeat. It should feel like a fantasy RPG you play with a fun
> card-game feel; co-op and FUN above all else.

### The three pillars

**1. Full 1:1 player/foe parity (verified)**
- Same body pool: `DRAFT_BODIES == FOE_BODIES == MOXIE_SET` (15 bodies each).
- Same body stats: a player wearing body X has identical HP, phys, mag to a foe spawned as X.
- Same card universe: foes build queues via `rollKit` drawing from `PLAYER_POOL` (the owner's
  20 `o*` cards). `buildQueue` no longer reads the retired `FOE_DECKS` map.
- Same `resolveOps` codepath: a Sword card resolves identically whether played by a player
  or cycled by a foe.
- Same moxie economy: both sides open at `START_MOXIE = 0` (owner 2026-06-23: earn the first
  cast), regen at 1/sec toward `MOXIE_CAP = 10`.

**2. Body swap / the mimic mechanic**
Defeating a foe body calls `room.unlockedBodies.add(enemy.bodyKey)` (`damageEnemy`, ~line 2980).
The mimic is a living wardrobe: every body the party has felled is pooled for adoption.
`swapBody` executes the EXCLUSIVE trade — your old body returns to the pool and the chosen
body becomes yours. Wounds carry (the `keepWoundRatio = true` flag in `wearBody`). Bosses
and summon tokens are never adoptable (`b.boss || b.summon`).

**3. The one deliberate asymmetry — the telegraph**
- **Player:** draws a hidden HAND of 3 (`HAND_SIZE = 3`, owner 2026-06-24) from a shuffled DECK.
  Plays from hand freely in any order; played cards shuffle back into the deck; the replacement
  refills the SAME hand slot via `drawUp`/in-place splice (owner 2026-06-24: hand holds position).
- **Foe:** cycles a VISIBLE ordered QUEUE — casts the front card when it can afford it, then
  rotates it to the back (`foeCast`). The entire queue is shown to the player at all times.
  The cast fraction `moxie / frontCardCost` is the urgency telegraph.
- **Owner confirmed (2026-06-22): keep the telegraph. Do NOT unify the foe draw.**
  Everything else is 1:1; the draw asymmetry is the game's unique information dynamic.

---

## 2. Architecture

### Client / server split
```
Browser tab(s) ──WebSocket──► Bun server (authoritative)
   public/client.js               server.js + game.js
   - renders snapshots            - holds ALL game state
   - sends input intents          - fixed tick loop (100ms)
   - never simulates locally      - broadcasts full state every tick
```

`server.js` is the networking layer only. `game.js` is pure logic (no I/O, no WebSockets).
Tests import `game.js` directly and drive it deterministically.

### Tick loop
`server.js` calls `setInterval(simulateTick + broadcastState, TICK_MS=100)` per room
(~line 84 in server.js). Each tick:
1. `simulateTick(room)` — advances all clocks, resolves moxie, fires casts, runs passives,
   processes room timers, checks win/loss conditions.
2. `broadcastState(room)` — sends a full `snapshot(room)` JSON to every connected player.

`TICK_MS = 100` is the authoritative server constant. 10 ticks = 1 second. Every cd/duration
in `game.js` is a LITERAL tick count (the old universal `_cdMult` knob is dead — it returns 1
unconditionally via `getCdMult`; all pacing is baked into the numbers).

### Room state model (`newRoom`, ~line 880)
Key fields on `room`:
- `phase`: `"lobby" | "draft" | "stock" | "setup" | "playing" | "won" | "lost" | "shop"`
- `players`: `Map<id, Player>` — the authoritative player table
- `lanes`: array of foe arrays (length = `room.laneCount`, derived from player count)
- `allies`: array of friendly-summon arrays (same length)
- `boss`: the back-line boss entity, or null
- `caravan`: `{ hp, max }` — the shared fail-state
- `level`: the procedural Slay-the-Spire-style node graph (`buildLevel`)
- `floor`: current floor (1 = start; 4 = Throne)
- `enchant`: current room modifier (Acid Rain, Armory, etc.)
- `foePalette`: the 3 foe options shown in stock phase
- `unlockedBodies`: Set of foe body keys the party has felled (the mimic pool)

---

## 3. Layer-by-Layer Mechanics

---

### 3.1 Bodies (HP + passive)

**What they are:** bodies are HP templates a player wears (or a foe uses). They provide
`maxHp` and an optional single `passive`. The live 15 (`MOXIE_SET`) all have `cd: 0` and are
**school-free** — they carry NO `phys`/`mag`/`echo`/`costDiscount`/`effectBoost`/`swordFeedsStaff`.
Their passives run on moxie-spend / cards-played / damage-taken / melee-or-ranged-dealt triggers,
not on a body timer and not on sword/staff school. Only the legacy `warrior`/`rogue`/`mage`/`cleric`
classes still carry `phys`/`mag`/`affinity` + a body `cd`, and they are `spawn:false` back-compat
scaffolding (not in any live pool).

**Schema (live MOXIE_SET, `BODIES` object ~lines 144–211):**
```
{ name, maxHp, cd:0, color, gold:1, passiveText, passive?|combatStart? }   // school-free
```
(Legacy classes additionally carry `phys`/`mag`/`affinity`/`cd>0`; summon tokens carry `phys`/`atk`.)

**The school-free transition state (DONE for gameplay; machinery deletion deferred):**
The owner's school-free rip has ALREADY landed for the 15 live bodies — they are
`{name, maxHp, passive?}` with no `phys/mag/echo/costDiscount/effectBoost/swordFeedsStaff`. The
engine deals typeless flat cards correctly (`powerFor` returns 0 for any card without `type`, so a
card with no `type` deals exactly its `amount`). What remains **deferred** is purely the destructive
*deletion* of the now-dormant school machinery + functions + ~135 school-coupled tests (see §5) —
gameplay no longer touches any of it.

**Body categories:**

| Category | Keys | Notes |
|---|---|---|
| Starter | `rookie` | Player's day-1 body; always in `unlockedBodies` |
| MOXIE_SET (15) | `frugal`…`mutualMend` | The live draftable/foe set; provisional names |
| BODY_TEMPLATES (12 × 1 = 12) | `royalRat`…`atlas` | Generated from RARITY_TABLE — now 1 flat rarity |
| Summon tokens | `rat`, `largeRat`, `totem`, `flag`, `knight` | Never adoptable; HP-knob exempt |
| Bosses | `hydra`, `litigationLich`, `djinn`, `kraken`, `kingMimic` | Never adoptable |
| Boss tokens | `hydraHead`, `boneWizard`, `tentacle`, `itemEntity` | Summon-class |
| Legacy player classes | `warrior`, `rogue`, `mage`, `cleric` | Still in BODIES; not in any draft pool |

**HP knob:** `bodyMaxHp(b) = round((b.maxHp + BODY_FLAT_HP_BONUS) * hpMult)` where `_hpMult = 1`
(live default) and `BODY_FLAT_HP_BONUS = 2` on WEARABLE bodies only — owner 2026-07-26 ("Give every
body 2 more health"), folded into the base before the knob exactly as if the 46 literals were edited.
Summon tokens and bosses get `+0` (absolutely tuned); summon tokens also bypass the knob (`b.summon ? 1 : _hpMult`). Caravan scales with party size:
`caravanMaxHp(players) = 20 * clamp(players, 1, 4) * _hpMult`.

**MOXIE_SET bodies (the live 15 — SCHOOL-FREE; passives verbatim from `game.js` ~lines 163–210):**

- Summoners/casters (low HP): `frugal`/Fat Cat (hp 8; every 3 dmg taken → summon rat),
  `leverage`/Royal Rat (hp 6; every 4 moxie spent → summon rat), `hedge`/Paid Piper (hp 6;
  every 3 cards played → summon rat), `ratBaron`/Lizard Wizard (hp 6; every 3 RANGED dmg dealt
  → gain a moxie)
- Bruisers/flex (mid HP): `compound`/Centaur (hp 7; first card each combat resolves twice —
  `combatStart.doubleNext`), `discountDuel`/Mouse (hp 7; start with +1 dmg — `combatStart.counters`),
  `heavyHand`/Imp (hp 7; every 4 moxie spent → +1 dmg), `mutualMend`/Wageslave (hp 7; every 2nd
  card → MELEE front for 1), `pyramidRogue`/Runeblade (hp 8; each time you've played BOTH a melee
  AND a ranged card → +1 dmg — `pairMR`), `rentier`/Vampire (hp 8; every 2 MELEE dmg dealt → heal 1),
  `quakeCap`/Chimera (hp 8; every 3rd card → 1 RANGED to the foe lane)
- Tanks (high HP): `ratTrader`/Toll Troll (hp 9; every 4 moxie spent → heal 2), `bloodfund`/Minotaur
  (hp 9; every 3 dmg taken → MELEE front for 1), `counterparty`/Behemoth (hp 10; every 3 dmg taken
  → +1 dmg), `juggernaut`/Golem (hp 10; combatStart shield 2; every 10 moxie spent → shield = max HP)

(Trigger DSL: `hit:N`/`spend:N`/`play:N`/`dealtMelee:N`/`dealtRanged:N`/`pairMR`/`combatStart`.
NONE key off sword/staff school. `+1 dmg` = the school-agnostic `counter` ramp, applies to any hit.)

**DRAFT_BODIES and FOE_BODIES** are both `[...MOXIE_SET]` (15 entries each). The old
BODY_TEMPLATES set (royalRat, etc.) is defined in `BODIES` and `SET_COMMONS` still
references it, but neither `DRAFT_BODIES` nor `FOE_BODIES` include it — those keys exist
only as test scaffolding. `rollCheapOption()` still draws from `SET_COMMONS` (a landmine
worth watching when content migrates).

---

### 3.2 Cards, KIT, and Moxie Economy

**Cards vs items:** Both live in `KIT`. A card (`isCard(k)`) has `ops` and a `cost`.
A worn passive item has `passive` but no `ops` (never drawn into a hand, never cast).
The `o*` keys are the owner's 20 canonical cards. The older first-set keys (blade, fire,
heal, etc.) are still in `KIT` as test scaffolding but excluded from all in-game pools.

**PLAYER_POOL** (the live card universe, ~line 444):
11 physical + 9 magical = 20 cards:
`oSword, oHatchet, oSpear, oBow, oDagger, oJavelin, oMallet, oZweihander, oTwinUchis, oPowerUp, oComboBlade`
+ `oFire, oIce, oLightning, oArcane, oDark, oWind, oHoly, oForce, oMeteors`

All are `ante: 1` (value 1, all base/common). They carry **NO `type` field and NO `mult`** —
they are SCHOOL-FREE and every number is FLAT (the `o*` set was flattened 2026-06-24; the live
pool now also includes the 11 `d*` defensive cards). `oZweihander` deals a flat 6 and `oTwinUchis`
a flat 4 (the old "×3 / ×2 Power" is gone — read lines 316–317 of `game.js`). Because these cards
have no `type`, `playCard` passes `school = undefined` into `resolveOps`, `powerFor(...)` returns 0,
and the card deals exactly its `op.amount` (+ the school-agnostic counter/perAlly/shield modifiers).
**The only combat axis is melee vs ranged** (the `ranged` flag + default targeting). No sword/staff
power-scaling reaches the live pool. (See §3.6 power calc — that machinery is dormant, not invoked.)

**Moxie economy constants:**
- `MOXIE_CAP = 10`
- `MOXIE_REGEN_TICKS = 10` (1 moxie/sec)
- `START_MOXIE = 0` (both sides open at 0 — earn the first cast; owner 2026-06-23)
- `HAND_SIZE = 3` (owner 2026-06-24: 3 feels better than 5)

**Card cost:** `cardCost(key, body)` = `KIT[key].cost`, optionally discounted by the body's
`costDiscount` (floor 1). A card without an authored `cost` uses `CARD_COST` from
`content-cards.js`, then falls back to `defaultCardCost` rubric. The `o*` cards all carry
their own explicit `cost` and are never overwritten.

**cardDmgLabel** (~line 493): derives the card's headline display from its primary op.
Icon: card's own `icon` field wins (school-free model); legacy typed cards fall back to
⚔/✨; a typeless card with no icon shows only its number. This is the forward-compatible
prep for school-free content.

**Playing a card (`playCard`, ~line 2827):**
1. Verify in hand, enough moxie.
2. Spend `cost` moxie.
3. Calculate `times` (1, ×2 if echo armed + matching school, ×4 if gigaArmed + magical,
   ×2 if doubleNext).
4. Calculate `boost` (effectBoost body passive + combo buff).
5. `resolveOps(room, player, item.ops, item.type, boost)` × `times`.
6. Fire school trigger (`fireSchoolTrigger`), spend-trigger passives.
7. Remove from hand; shuffle back into deck (or discard if `fragile`); `drawUp`.

**Auto-play (`autoPlay`, ~line 2875):** play the priciest affordable DAMAGING card; hold if
a pricier damage card is pending and moxie is below cap; else play the best utility.

---

### 3.3 Decks — MIN_DECK, rollKit, deckKeys

**MIN_DECK = 10** (owner 2026-06-22). A player's combat deck is always at least 10 cards.

**`deckKeys(p, god)` (~line 458):** returns the card keys for a player's deck this room.
God mode = whole `KIT_POOL`. Otherwise: the player's `draftPicks` (filtered to valid `isCard`
keys), padded from `STARTER_DECK` if below `MIN_DECK`. The STARTER_DECK is a hand-designed
balanced 10: 5 physical + 5 magical/support.

**`rollKit(bodyKey)` (~line 1908):** builds a 10-card school-fit deck for a body.
- Slot 1: in-house (body's school) AND damaging (no toothless opener).
- Slot 2: in-house.
- Slot 3: wild (any value-1 card from PLAYER_POOL).
- Slots 4–10: 75% in-house, 25% wild; duplicates allowed once the distinct pool is exhausted.
Only value-1 cards (from `CHEAP_KIT = PLAYER_POOL.filter(ante <= 1)`) — all 20 owner cards
qualify since all are `ante: 1`.

**Foe queue sizing:** `FOE_START_MIN = 1`, `FOE_START_MAX = 2`. A foe opens with only 1–2
cards (the first slots of its `rollKit` result). Deck SIZE is intentionally not 1:1 —
the ante/scaling system that grows a foe's deck is deferred to the owner.

**Kit slots:** `MAX_KIT = 200` (sanity ceiling, not a gameplay limit). `KIT_SLOTS_BASE = MAX_KIT`.
Every player starts at the ceiling; there are no slots to buy. `kitSlotCost` always returns
`null`; `buyKitSlot` is a no-op in practice.

---

### 3.4 Draft Wheel

**Phase: `"draft"`** — every draftable player/body receives exactly three private offers.

**`rollDraftWheel(players)`:** shuffles the common-body pool once and partitions three offers per player. Each bundle = `{ id, bodyKey, items: rollKit(bodyKey), offeredTo }`; body keys are distinct across the entire draft.

**`draftPick(room, player, bundleId)`:** accepts only bundles whose `offeredTo` matches that player. Applies the body and ten-card starter deck, marks `drafted: true`, then calls `maybeFinishDraft`.

**`growDraftWheel(room)`:** adds a fresh non-overlapping triple for late joiners/new squad bodies without disturbing existing offers or locks, and prunes departed bodies' triples.

**Draft completion:** `maybeFinishDraft` starts solo/one-human squads once all bodies are drafted. A fresh run with 2+ humans holds for explicit `beginRun` so late friends can still join.

**Squad mechanics:** A host may run 1–4 bodies (`spawnSquad` in server.js). The host pilots one body (MANUAL by default); the rest are `bot: true` and `autoFire: true`. In the current flow, squad bots do NOT auto-draft — the human must draft for every body in turn (`startDraft` comment: "every current bot is a human-owned squad body").

---

### 3.5 Player/Foe Parity — Verified

`DRAFT_BODIES`, `FOE_BODIES`, and `MOXIE_SET` all reference the same 15-body array (verified by reference equality in the code). Key symmetry points:

| Mechanic | Player | Foe |
|---|---|---|
| Body pool | `DRAFT_BODIES` (= MOXIE_SET) | `FOE_BODIES` (= MOXIE_SET) |
| Card universe | PLAYER_POOL (20 o* cards) | `rollKit` → PLAYER_POOL only; off-set gear filtered in `buildQueue` |
| Moxie | Same START_MOXIE, CAP, regen | Identical |
| Card cost | `cardCost(key, body)` | Same function call |
| resolveOps | Shared path | Same codepath; `source.side` branches only for damage direction |
| Body passives | Fire via `spendTriggerPassives` / `runPassive` | Same functions |
| Echo bar (DORMANT) | Player arms by choice (READY → ARMED button) | Foe auto-arms on full bar — *but no live body has an `echo` field, so the bar never charges in live play* |
| effectBoost / costDiscount (DORMANT) | Applies to player | Applies to foe via `foeCast` — *both were school-gated; no live body sets them, so neither fires in live play* |
| Draw mechanic | Hidden HAND from shuffled DECK | Visible ordered QUEUE (the telegraph) |
| Queue/hand size | Player: 10 cards, hand 5 | Foe: 1–2 cards opening, cycles queue |

The deliberate ONE asymmetry: player draws a hidden hand; foe cycles a visible queue. Owner confirmed: keep it.

**The foe telegraph in the snapshot (~line 3181):**
```js
queue: (e.queue ?? []).map((c, qi) => ({ key, name, cost, type, color, dmg, front: qi === 0 }))
castFrac: moxie / frontCardCost   // fills toward 1 as the foe builds moxie to cast
```

---

### 3.6 Combat Resolution (resolveOps, lanes, targeting)

**`resolveOps(room, source, ops, school, boost)` (~line 2670):**
The single place all card effects resolve for both sides. `source.side === "foe"` branches
to the foe damage path; `source.side === "hero"` goes to the hero damage path.

**Targeting verbs:**
| `op.target` | Hero-side meaning | Foe-side meaning |
|---|---|---|
| `"front"` | Front foe in source's lane (`aimedFoe(room, source, "front")`) | Front of the unified ally line (`foeHitLane`) |
| `"front2"` | Front TWO foes in source's lane | Front TWO of ally line (`foeHitFront2`) |
| `"front3"` | Front THREE foes in source's lane | Front THREE of ally line (`foeHitFront3`) |
| `"lane"` | Every foe in source's lane + back-line boss | Every hero + summon in source's lane (`foeHitLaneAll`) |
| `"pick"` | Source's `targetId` foe (any lane); falls back to front of own lane | (foes don't aim pick; treated as front) |

**Melee vs ranged:** `isRanged(key)` = `KIT[key].ranged ?? (type === "magical")`. Physical cards are melee by default (hit front of own lane); magical cards are ranged by default (respect the aim reticle). An explicit `ranged` flag overrides either way (Bow, Javelin = ranged physical).

> ⚠️ The `powerFor`/`school`/`mult` terms below are DORMANT for the live pool: live cards carry no
> `type`, so `school = undefined`, `powerFor(...) = 0`, and the floor-to-1 "school-tagged" branch
> never triggers. For live cards the damage is just `op.amount` + counters/perAlly/shield. The
> formulas are kept here because the machinery is still in `game.js` (school-free machinery deletion
> is the deferred §5 rip), and because the legacy first-set `blade`/`fire`/… keys (test-only) still
> exercise it.

**Damage pipeline for `deal` ops (hero side):**
1. `amt = (op.amount) + powerFor(source, school) * mult + perAlly bonus` — for live cards
   `powerFor(...) * mult = 0` (no `type`), so this reduces to `op.amount + perAlly`.
2. Floor to 1 if school-tagged and would be 0 (weapon always lands) — never fires for live cards.
3. `comboBoost` / counters added if active (school-agnostic; these DO apply to live cards).
4. `damageEnemy(room, lane, enemy, dmg, attacker)`:
   - `laneAura` bonuses (Flag: +dmgBonus from hero side; Totem: −dmgReduce from foe side).
   - `effectiveDamageTo`: ward check (King Mimic immune while court stands), Lich stance
     (objection → cap 1; recess → −1 floor 1), itemDmgReduce (worn Crown), stoneskin buff.
   - `absorbShield` (foe's shield buffer absorbs before HP).
   - HP reduction; if dead: remove from lane, unlock body for party.
   - If alive: `runPassive("damaged")`, `accelClocks`, `hitTriggerPassives`, `bossOnDamaged`.

**Damage pipeline for foe `deal` ops (foe → hero side):**
1. `foeDealHit(room, source, op, school)`:
   - `(op.amount + perAlly + powerFor(source,school) * mult) * source.dmgMul`
   - Floor to 1 if school-tagged.
2. `foeHitLane(room, li, hit, source)`:
   - `laneAura` (foe-side Flag/Knight: +dmgBonus on outgoing).
   - `laneLine(room, li)[0]` = front defender (heroes + summons by depth).
   - If front is a player: `damagePlayer` (laneAura reduce, itemDmgReduce + stoneskin, shield, HP).
   - If front is a summon token: `hurtAllyToken`.
   - If no defender: `room.caravan.hp -= dmg`.

**Power calculation (DORMANT — defined but not reached by any live card; see warning above):**
```js
effPhys(c) = c.phys + c.counters + itemStatBonus(c, "phys") + buffAmt(c,"power") + buffAmt(c,"swordPower")
effMag(c)  = c.mag + itemStatBonus(c, "mag") + buffAmt(c,"power")
powerFor(c, "physical") = effPhys(c)
powerFor(c, "magical")  = effMag(c) + (body.swordFeedsStaff ? effPhys(c) : 0)
powerFor(c, null/undefined) = 0   // typeless cards scale off nothing → THIS is the live branch
```
Every live card hits the last line (`school` is `undefined`), so Power never adds. The live 15
bodies also have no `phys`/`mag`, so even if a card were typed the Power would be 0 on them.

---

### 3.7 Bosses

**Four bosses + the Throne:** `BOSS_BODIES = ["hydra","litigationLich","djinn","kraken"]`.
King Mimic is excluded from the rotation — he occupies the Throne Floor (`THRONE_FLOOR = 4`).

**Scaling contract:** `bossBudget(players, floor) = clamp(players,1,4) * clamp(floor,1,∞)`.
Boss HP = `bodyMaxHp(BODIES[bossKey]) * budget`. Every boss's signature dial rides this budget.

**Boss rotation:** 3 of the 4 bosses, drawn randomly per run via `drawBossRotation()` and
stored in `room.bossDraw`. Deterministic within a run (map preview and fight always agree).

**Boss architecture:**
- **Back-line bosses** (Hydra, Lich, Kraken): `room.boss`, spanning all lanes behind the
  foe rows. Melee reaches them only when the attacker's lane is clear. Ranged can always aim
  at them via `targetId`.
- **Lane-bound boss** (Djinn): occupies a lane like an ordinary foe; teleports via `fireBossClock`.

**Boss mechanics (via `fireBossClock` + `tickBossClocks`, ~lines 1392–1446):**

| Boss | Clocks | Mechanic |
|---|---|---|
| Hydra | `heads` + `aoe` | Heads clock: doubles spawn count each fire (1→2→4→8…). Every hit to the Hydra spawns one head in that lane. Maul: hits every lane for the floor number. |
| Litigation Lich | `stance` + `wizards` | Stance toggles `objection` (cap 1 per hit) ↔ `recess` (−1 per hit, floor 1). Opens in objection. Summons one boneWizard per player on wizards clock. |
| Djinn | `teleport` + `aoe` | Teleports to a random other lane. AoE scorches every lane. Every 3rd party card cast, Djinn spawns a conjured item-entity. |
| Kraken | `steal` + `replenish` | Steal: animates one player item as a stolen-item-entity; kill the entity to take it back. Replenish: restores tentacles to cap (2 × players). Opens behind its wall. |
| King Mimic | deck: `decree/steal/stance/aoe` | Cycles one card at a time (shuffle-bag); each card = one clock. Decree: spawns one heavily-armed foe per player. Steal: same as Kraken's steal. Stance: same as Lich's stance. Calamity: AoE every lane for 3. Warded while any other foe is on the board. |

**Boss payday:** `BOSS_GOLD = 10` per player + a shelf of `players + 2` rares (ante ≥ 3)
via `rollBossLoot`.

---

### 3.8 Summons / Tokens

Tokens (rats, large rats, totem, flag, knight) enter via `summonBodies(room, source, op)`.
A hero summons allies (`room.allies[lane]`); a foe summons foes (`room.lanes[lane]`).
Tokens are fully symmetric — a foe Totem protects foes; a foe Flag boosts foe damage.

Hero summons enter at the source's depth ±0.5 (front by default = meat-shield; behind if
`player.summonSide = "back"`). `formUp` runs after each summon.

**Summon token bodies (exempt from HP knob):**
- `rat`: 1 HP, phys 1, attacks every 4s (40 ticks via `passive: [{every:40, ops:[{do:"attack"}]}]`)
- `largeRat`: 3 HP, phys 2, same clock
- `totem`: 3 HP, `aura: {dmgReduce: 1}` — lane allies take 1 less while it stands
- `flag`: 3 HP, `aura: {dmgBonus: 1}` — lane allies deal +1 while it stands
- `knight`: 6 HP, `aura: {dmgBonus:1, dmgReduce:1}`, attacks every 4s

**Aura stacking rule:** same aura type does NOT stack — the strongest standing token applies.
A token is NOT covered by its own aura (else a −1 totem would be unkillable by chip damage).

---

### 3.9 Waves / Ante / Scaling

**Floor layout (`buildLevel`, ~line 925):**
Procedural Slay-the-Spire graph: 1 start → 2–3 combat rows (elite probability 15–45%) →
1 all-shop row → 1 late combat row → 1 boss. ≥1 elite guaranteed per floor.
Floor 4 (Throne) = a single boss node, no crawl.

**Room entry flow:**
1. Shop node: open shop, phase = "shop".
2. Boss node: auto-build boss room, phase = "setup".
3. Combat/elite: seed Wandering Monster if enchant has one, build foe pool, populate palette,
   phase = "stock".

**Stock phase (collective draft):**
- Party drafts foes from `foePalette` (3 slots) until `anteCurrent >= anteRequired`.
- `anteRequired = max(2, bossBudget(players, floor) * (elite ? 2 : 1))`.
- `anteOfFoe(f) = 1 + sum(KIT[g].ante for g in f.gear)` — body is always 1; items carry the weight.
- NO take-backs: `removeGreedy` always returns false. Drafted foes are committed.
- Cheap-option guarantee: at the base window, at least one option with ante ≤ 3 is always available.

**Ante window:** `ANTE_MIN = 2, ANTE_CAP_BASE = 5, ANTE_STEP = 3`.
"Up the ante" (`upTheAnte`) ratchets BOTH ends permanently for the rest of the run.
Floor 1 rule: the first room gets `GIFT_ENCHANT` (no combat effect, +3 base ante). No
Wandering Monster on floor 1.

**Foe placement (`placedLanes`):** foes sort round-robin by HP (tankiest first), distributing
across lanes so each lane gets a wall before any lane gets a second foe. Wandering Monsters
are pinned to specific lanes.

**Formation (`formUp`):** within each lane, foes sort by maxHp descending (tankiest to front).

---

### 3.10 Win / Loss (Caravan)

**Win:** `enemiesLeft === 0` (all lanes empty, boss dead). Phase → `"won"`. Party is full-healed
and revived. Loot = gear the stocked foes carried. `creditRoomIncome` splits room value V equally.

**Loss:** `room.caravan.hp <= 0` → phase `"lost"`. Also: all heroes downed AND no allies left →
immediate loss (deadlock guard). Anti-stall: if neither total foe HP NOR caravan HP improve for
`STALL_LIMIT = 1500` ticks (~150s), the fight resolves as a loss.

**Run won:** defeating King Mimic on floor 4 sets `room.runWon = true`.

**Level progression:** `advanceLevel(room, toId)` moves to a linked node, calling `enterRoom`.
`descend(room)` advances to the next floor, rebuilding the map via `buildLevel(floor+1)`.

---

### 3.11 Revives

**Mid-combat:** players go down at 0 HP (`alive = false`). No mid-fight auto-revive. A Revive
item (`do:"revive"`) restores a downed player to full HP; it is `fragile + startCharged`
(one-shot, pre-charged at fight start).

**On room clear:** all players set `alive = true`, `hp = maxHp` (full heal + instant revive).
There is no 10-second auto-revive timer in the live engine — that was the README's old
description of the grid-body-swap version. `downTimer` is tracked but never fires a revive.

---

### 3.12 Room Modifiers (Enchants)

Defined in `ENCHANTS` (~line 626). Live canonical ones:
- **Wandering Monster**: a foe pre-placed on board; one per lane (not one total).
- **Acid Rain (light/heavy)**: periodic acid hits each hero and summon for 1.
- **Armory**: every foe enters with 1 shield.
Plus placeholder fills: Rat Colony, Hasted, Toughened.

Enchants apply to foes via `applyEnchantToFoe` (HP scale, dmgMul, cdMul, shield).
Room timers (Acid Rain, Rat Colony) run via `processRoomTimers`.

---

### 3.13 Economy

**Treasure** is per-player. On room clear, `creditRoomIncome` splits `roomValue(room)` (=
total ante stocked) equally across all players; remainder coins go to the player with the
lowest total earnings first.

**Loot:** gear the stocked foes carried. Shared, scarce (first-come). Claiming costs
`itemTreasure(key) = KIT[key].ante` from the claiming player's wallet (mirrored-income model:
you were credited the full V, so converting income → gear is a real spend).

**Shop:** 5 wares, priced at face value (no markup). Reroll for `SHOP_REROLL_COST = 3`.

**Body unlocks:** `unlockCost(g)` — gold tier 1 is free; tier 3 → 15g; tier 5 → 30g cumulative.
A body must be in `unlockedBodies` (felled) before it can be adopted.

**Squad item transfers:** `giveOwnItem` (instant, free, needs a free slot), `swapOwnItems`
(instant, no space gate, 1-for-1), `tradeItems` (cross-player, gold gap settled in treasure),
`giftItem` (cross-player, buyer pays face value), `proposeTrade`/`acceptTrade`/`declineTrade`
(offer/accept flow). All out-of-combat only (`won` or `shop` phase).

---

## 4. Live vs. Stale — Contradiction Table

| Claim in older docs | Where the doc says it | What the live code actually does | Verdict |
|---|---|---|---|
| Game is a real-time grid crawler with WASD movement and K to swap bodies | README.md (the whole file) | Lane-based co-op deckbuilder with moxie/cards. No WASD, no grid, no spatial movement. Bodies are swapped via the `swapBody` function after defeating a foe. | README.md is completely stale — describes a deleted version |
| Auto-revive after ~10 seconds at half HP | README.md | `downTimer` is tracked but never fires a revive. Revive only comes from the Revive item (fragile) or room clear (full heal). | Stale |
| Next wave only spawns when a player presses NEXT WAVE | README.md | Combat is entered via `beginCombat`/`commitStock`. No wave system — foes are drafted by the party then all present at once. | Stale |
| 5 waves; Wave n spawns 1+n enemies | README.md | No wave system at all in live code. | Stale |
| CARAVAN_MAX_HP = 20 (flat) | MECHANICS.md | `caravanMaxHp(players) = 20 * clamp(players,1,4)`. Solo = 20, 2P = 40, 3P = 60, 4P = 80. | MECHANICS.md stale |
| Bodies list: rookie/pixie/auditAngel/killionaire | MECHANICS.md | Live draftable/foe body pool is `MOXIE_SET` (15 archetype bodies). `pixie`, `auditAngel`, `killionaire` are not in DRAFT_BODIES or FOE_BODIES. | MECHANICS.md stale |
| Equipment: 7 cooldown-bar items (fire, fireII, lightning, etc.) | MECHANICS.md | KIT has 44+ entries; the live in-game card pool is PLAYER_POOL (20 owner `o*` cards). Cooldowns are replaced by moxie; cards are played from a HAND, not pressed on bars. | MECHANICS.md stale — describes a deleted combat model |
| Foe count: 7 for combat, 10 for elite | MECHANICS.md | No auto-fill for combat rooms unless the party doesn't draft. Foe count is determined by collective draft until ante is met. | Stale |
| REVIVE_TICKS = 100 (10s auto-revive) | MECHANICS.md | `downTimer` field exists but no auto-revive logic fires from it in `simulateTick`. | Stale — mechanic is dead |
| Rarity system: 3 tiers per body (Common/Uncommon/Rare), `RARITY_TABLE` with 3 rows | SLICE_SPEC_V2.md | `RARITY_TABLE` has been collapsed to 1 row (`suffix: ""`, no prefix, `hpMul: 1, step: 0`). The 36-body tripling is dead — each template generates exactly 1 body. | SLICE_SPEC_V2 stale on rarity |
| Draft wheel draws COMMONS only; uncommon/rare bodies via tier buy-in | SLICE_SPEC_V2.md | Live: `DRAFT_BODIES = [...MOXIE_SET]` — the 15 MOXIE_SET bodies, none from BODY_TEMPLATES. The RARITY_TABLE bodies do not appear on the draft wheel at all. | Stale |
| `content-cards.js` FOE_DECKS drives foe card selection | CARDS_SPEC.md, old `buildQueue` | `FOE_DECKS` is no longer read. `buildQueue` uses `rollKit` (owner's set). `FOE_DECKS` is effectively retired. | Stale reference |
| Cards scale with sword/staff (physical/magical) school Power via `effPhys`/`effMag`/`powerFor` | Earlier §3.1/§3.2/§5 of THIS doc; CARDS_SPEC, CARDS_OWNER | School power-scaling is GONE FROM PLAY (owner 2026-06-24). Live cards (`o*`/`d*`) have no `type`/`mult`; live bodies (`MOXIE_SET`) have no `phys`/`mag`. `playCard` passes `undefined` school → `powerFor` returns 0. The ONLY live combat axis is **melee vs ranged**. The functions still EXIST (dormant) but no live content invokes them. | This doc's own prior §3/§5 were stale; corrected in the top STATUS block + §3.1/§3.2/§3.6/§5 |
| Echo bar is a live school-typed mechanic (sword/staff echo) | §3.5, §5 | `tickEchoBar` is gated on `BODIES[c.bodyKey]?.echo`. NO live body (`MOXIE_SET`) has an `echo` field, so the echo bar never charges in live play. Code lingers, dormant. | The echo machinery is dead-but-present; cleanup is owner-gated (§5) |
| CARDS_SPEC §1 "ECONOMY — cards only, NO currency; `rarity` replaces `ante` everywhere; `treasure`/`earned`/`kitSlots`/claim-costs DELETED" | CARDS_SPEC.md | `treasure`, `earned`, `kitSlots`, `itemTreasure`, `claimLoot`, `creditRoomIncome` are all fully alive and active in the engine. Cards still use `ante` (not `rarity`) as their value weight. | CARDS_SPEC.md §1 is stale — an unimplemented proposed economy |
| CARDS_SPEC §1 "LOOT_PICKS = 2; claiming is free (no cost)" | CARDS_SPEC.md | `claimLoot` costs `itemTreasure(key)` from the player's wallet; there is no `LOOT_PICKS` constant. | Stale |
| CARDS_SPEC §1 "SHOP — trade by value: trade in cards, no gold" | CARDS_SPEC.md | Shop uses `buyShopItem` which deducts from `player.treasure` (gold). Card trading/scrapping is not implemented. | Stale |
| CARDS_SPEC §2 "`ante` is RETIRED — `rarity` replaces it" | CARDS_SPEC.md | `ante` field is alive on every KIT entry and used everywhere (loot value, shop price, foe gear weight). No `rarity` field exists on cards. | Stale |
| Hydra BOSS_SPEC: "per-hit rate-limited to 1 per lane per resolve-batch" | BOSS_SPEC_V1.md | `bossOnDamaged` spawns one head per INSTANCE of damage landed (per hit, not per batch, not per lane). A 4-hit Omnislash spawns 4 heads. Owner corrected this 2026-06-12. | BOSS_SPEC old note stale; code is authoritative |
| King Mimic V1: "enters playing all 3 nemeses; warded while any other foe is on board; ward + nemesis identity" | BOSS_SPEC_V1.md | Live: King Mimic uses a 4-card deck (decree/steal/stance/aoe). Ward check uses `body.ward` on the BODY record and `foeCount(room) > 1`. The "V1 ward/nemesis design is DEAD" (code comment). | BOSS_SPEC V1 king section stale |
| Djinn: "toll: player loses 1 HP per card played" | MECHANICS.md (boss list) | Live: Djinn spawns an item-entity every 3rd party card cast (`tickDjinnCounter`). No per-card HP toll. | Stale |

---

## 5. Open / In-Flight Items

### School removal rip — SCALING done; MACHINERY-DELETION deferred

**Status (owner-confirmed 2026-06-24):** sword/staff school power-SCALING is **GONE from gameplay**.
The live content has already been flattened: the live card pool (`o*`/`d*` keys) carries no `type`
and no `mult`, and the live 15 bodies (`MOXIE_SET`) carry no `phys/mag/echo/costDiscount/effectBoost/
swordFeedsStaff`. Cards are **melee vs ranged only** (the `ranged` flag + default targeting). So the
SCALING half of this rip is effectively complete — no live card or body invokes school Power.

**What is still deferred:** the destructive *deletion* of the now-dormant school MACHINERY/identifiers
that linger in `game.js` (defined but never reached by live content):
- `powerFor` / `effPhys` / `effMag` / `effAtk`  (`powerFor` always returns 0 in live play)
- `echo` bar (`tickEchoBar`, `echoDelay`, `armEcho`) — gated on `BODIES[..].echo`, which no live body has
- `costDiscount` / `effectBoost` / `swordFeedsStaff` body fields — no live body sets them
- School triggers: `fireSchoolTrigger`, `schoolStrike` op, `on:"sword"/"staff"` passives — never fire live
- the LEGACY first-set KIT keys (`blade`, `bow`, `fire`, `hatchet`, `spear`, … with `type`/"sword"/"staff"
  text) — kept in `KIT` ONLY as test scaffolding, excluded from every in-game pool
- ~135 school-coupled tests that exercise the above and will need rebaselining/removal

**Why the deletion is still deferred:** the dormant machinery + legacy keys still back ~135 tests; ripping
them now is a test-rebaseline chore with no gameplay payoff (the scaling is already inert). Leave it until
the owner wants the cleanup. **Do NOT delete it as part of a docs/correction pass — it is owner-gated.**

**Trigger condition:** owner says "do the cleanup." Then: delete the dormant functions + legacy keys,
rebaseline/remove the school-coupled tests, re-green `bun test`.

### TODOs / stubs in the live code

- **`rollCheapOption`** draws from `SET_COMMONS` (the BODY_TEMPLATES keys), but BODY_TEMPLATES
  bodies are not in FOE_BODIES/DRAFT_BODIES. If those bodies are used as cheap options and
  then defeated, they will enter `unlockedBodies` even though they aren't on the draft wheel.
  This is a latent inconsistency to resolve during the content migration.

- **`autoDraftBots`** is defined and callable but `startDraft` no longer calls it. Squad bots
  require the human to draft their bodies manually. The function is dead code unless wired back.

- **`removeGreedy`** always returns `false` (no take-backs, owner 2026-06-19). The `removeFoe`
  primitive still works for tests/legacy code only.

- **`autoStockBots`** is a no-op (collective draft — bots no longer auto-place).

- **`ENCHANTS` placeholder fills:** Rat Colony, Hasted, Toughened entries are tagged
  `[PLACEHOLDER]`; their `baseAnte` numbers are not owner-canonized.

- **`BOSS_DEFS` numbers:** every boss clock cd and all dmg values are tagged `[PLACEHOLDER]`
  dials. Owner redials after playtest.

- **`kingMimic.decreeAnte = 7`**: `[PLACEHOLDER]`.

- **Body names in `MOXIE_SET`**: all provisional. Code comment: "OWNER renames later."
  Canonical money-monster names live in `OneDrive\Desktop\Table\King Mimic\FoesListedOut.txt`.

- **Loot/shop on the school-free economy:** `CARDS_SPEC.md §1` proposed a card-rarity-based
  economy (no gold, `rarity` replaces `ante`, `LOOT_PICKS = 2`, trade-in shop). This is NOT
  implemented. The live economy is gold/treasure-based. The deferred §1 build is the loot/shop
  currency redesign.

- **`GIFT_ENCHANT.baseAnte = 3`**: `[PLACEHOLDER]`.

- **`content-*.js` agent files** (`content-tank.js`, `content-summon.js`, `content-misc.js` — 36
  agent-designed cards): NOT in the game. They must not be merged. Cards are owner-authored only.

- **Pre-existing flaky test (~1/30):** the elite-ante seed-dependent test occasionally fails.
  Known issue; ignore occasional red on `bun test`.

- **`CLASSES` dict** (warrior/rogue/mage/cleric): back-compat path for `chooseClass`. These
  bodies (`warrior`, `rogue`, `mage`, `cleric`) are still in `BODIES` but not in any live draft
  or foe pool. They are legacy test scaffolding.
