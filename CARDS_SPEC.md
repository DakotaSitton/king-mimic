# CARDS_SPEC v2 — King Mimic (moxie + cards + card-economy) — 2026-06-21

**THE FROZEN CONTRACT.** Engine, client, content, tests all bind to THIS. If reality and the doc
disagree, the doc wins until updated (orchestrator owns it). v2 supersedes v1: combat core is
unchanged; the ECONOMY becomes card-only (no gold), displays change, and the op-system hardens for
game-state effects. **Scope: SINGLE-PLAYER** for now (squad later — don't design around it).

## 0. Combat core (UNCHANGED from v1 — still true)
1s tick (TICK_MS=100 → 10 ticks = 1s). Every caster has **moxie** (0..`MOXIE_CAP`=10, +1/sec,
`START_MOXIE`=2). Cards (KIT entries with `ops`) cost moxie. `resolveOps` resolves a card's effect,
identically for players and foes. Body passives fire **per X moxie spent** (`spendTriggerPassives`,
X≈old-cd/10); summons act on time. Solo piloted body defaults to **MANUAL** (you play your cards).

### Player vs Foe (owner decision 2026-06-21 — NOT fully symmetric, by choice)
- **Player:** a **DECK** you draw a **HAND** from; play an affordable card → it shuffles back into the
  deck → draw a fresh one. Hand size 5 (= min(5, deck size)).
- **Foe:** a **visible, ordered, cycling QUEUE** — casts the FRONT card when it can afford it, then
  rotates it to the back. The order is always known (drives the telegraph). Same moxie/cost/`resolveOps`
  rules as the player; the only asymmetry is hidden-draw (you) vs known-cycle (them).

## 1. ECONOMY — cards only, NO currency (v2, replaces gold/treasure)
Gold / `treasure` / `earned` / mirrored-income / `kitSlots` / claim-costs are **DELETED**. The economy
is cards, valued by rarity.
- **`rarity`** (int ≥ 1, up to any reasonable number): a card's power tier AND its **value/currency**.
- **BACKPACK** — your full owned collection of cards not currently in your deck. **Unlimited.**
- **DECK** — the cards you draw in combat, built from the backpack. **Min size `MIN_DECK`=10, NO max**
  (owner 2026-06-22: starter kits go 10+; 10 is the smallest deck allowed). The old kit limit is gone.
  You move cards backpack↔deck out of combat (won/shop), **never dropping the deck below MIN_DECK**.
- **STARTER_DECK** — the 10 hand-designed cards every run opens with (no agent cards). `deckKeys(p)`
  floors any owned set to MIN_DECK by padding from STARTER_DECK; draft/loot ADD on top (no max).
- **DRAFT (run start)** — pick cards from the wheel → into your deck (overflow/extras → backpack).
- **LOOT (post-combat)** — a set of dropped cards; claim up to **`LOOT_PICKS`=2** of them into your
  backpack (scarcity by choice, not by cost — claiming is free, you just can't take them all). [tunable]
- **SHOP** — trade by value: acquire a shown card by trading in backpack card(s) whose **total rarity ≥
  its rarity** (trade-up; no change given). Also "scrap" unwanted backpack cards toward a buy. [v1 rule, tunable]
- Per-seat earnings-equality (a gold-era invariant) is **gone** — solo has no such constraint.

## 2. Card schema (KIT entry, game.js)
`{ name, text, type:'physical'|'magical'|null, color, ops, target, ranged?, fragile?, perAlly?,
lifesteal?, cost (moxie 1–6), rarity (int ≥1 = value/tier), archetype:'tank'|'attacker'|'caster'|'summoner'|null }`
- ⚠️ **`type` (physical/magical) is DEAD for the live pool (owner 2026-06-24).** Sword/staff school
  power-scaling is GONE; the live `o*`/`d*` cards carry no `type` and no `mult`, and all damage is FLAT.
  The only live combat axis is **melee vs ranged** (the `ranged` flag + default targeting). `type`
  still exists on the legacy first-set test-scaffold cards only; the `powerFor`/school machinery in
  `game.js` is dormant (never reached by live content). See CORE_LOGIC.md §3.1/§3.2/§5.
- ⚠️ `ante` is **NOT** retired in code — `ante` is alive everywhere (loot value, shop price, foe-gear
  weight); `rarity` is the proposed-but-unimplemented replacement. (CORE_LOGIC §4.)
- `cd` is dead (ignore). Passive (no-`ops`) cards = permanent worn effects, not drawn/played.

## 3. GAME-STATE ops — the airtight effect framework (v2)
Cards will change major shared state (e.g. **universal moxie ±**, freeze, draw, deck manipulation).
ALL such effects go through `resolveOps` as new `op.do` verbs so both sides obey ONE codepath. Rules:
- A verb is implemented ONCE and works for `source.side === 'hero'` and `'foe'` (symmetry by construction).
- Verbs must be **total** (never throw, clamp all bounds: moxie 0..CAP, hp ≥ 0, deck/hand never negative).
- New verbs to support (initial set; extend as cards need): `moxieAll` (±N moxie to every caster or one
  side), `moxieSelf`, `draw` (player draws N now), `discardFoeFront` / `stall` (already `delay`→drains moxie),
  `freezeFoes`/`timeStop` (exists). Each new verb: add to `resolveOps`, cover with a test, list it here.
- Cards that read/write deck/hand/queue do so via the engine helpers (`drawUp`, `shuffle`, queue rotate),
  never by hand — so invariants hold.

## 4. DISPLAYS (client, v2)
### Player deck-tracker — LEFT rail, ALWAYS visible (combat)
A persistent list of your **whole deck** (every card, grouped/sorted, count badges for duplicates).
**Undrawn (still in draw pile) = WHITE; in-hand or just-played/this-cycle = GREYED.** Updates live off
the snapshot (`deck` + `hand` ids). This is the Hearthstone-style tracker — you always see what's left
to draw. Replaces the old INVENTORY panel.
### Foe cast bars — VERTICAL, next card CLOSEST to the foe (combat)
Each foe shows a **vertical stack** of its next queue cards, the **front card (its next cast) nearest the
foe's body**, each card a chip with a **charging bar = moxie / cost** ("building moxie to cast this").
The front bar fills toward its cast; this is the telegraph that fixes "how did I take damage." Hover/tap
a foe still shows its full deck. (Restores the old vertical charging-bar feel, now moxie-driven.)

## 5. CONTENT — archetypes (owner designs, agent expands, I engineer)
Four archetypes, each a coherent identity for both player bodies and foe decks. (⚠️ "sword/physical"
and "staff/magical" below are HISTORICAL labels — school scaling is GONE 2026-06-24; read them as the
melee-damage and ranged/AoE flavors respectively, with all numbers flat.)
- **Tank** — soak/protect: shields, thorns, taunt, damage-reduction, lane auras. Slow, high HP.
- **Attacker** — direct ~~sword/physical~~ MELEE damage: jabs, big swings, multi-hit, front-line burst.
- **Caster** — ~~staff/magical~~ RANGED/AoE + game-state: AoE, moxie manipulation, stalls, draw, the "major state" cards.
- **Summoner** — board presence: spawn tokens that act on time, auras, swarm scaling.
Owner provides each archetype's identity + 2–3 signature build-around cards; the agent fills the roster
to that template; cards carry `archetype` + `rarity` + `cost`. Foe decks (`content-cards.js FOE_DECKS`)
are themed by archetype too.

## 6. Snapshot additions (client contract)
Player: `deck:[{id,key}]` (full draw pile, for the tracker — keys only ok), `hand:[…]`, `moxie`,
`moxieMax`, `backpack:[{key,rarity}]` (out of combat). Foe: `queue:[{key,name,cost,color,front}]`,
`moxie`, `moxieMax`, `castFrac`. Card objects carry `rarity` + `archetype`. (`treasure`/`kit`/`kitSlots`
fields are removed once the economy lands.)

## 7. Sequencing (best practice for a fast-moving codebase)
Build in dependency order, tests green at each step, one writer per file-domain:
**P1 Engine economy** (rip gold; backpack/deck/rarity; min-deck/no-max; draft/loot/shop in cards;
game-state op framework) → **P2 Displays** (left deck-tracker; vertical foe bars) → **P3 Content**
(archetype cards) → **P4 Foe scaling** (moxie-income tiers + deck quality). Don't author the roster
before P1 locks the schema. `bun test` is the ratchet — never red across a step.
