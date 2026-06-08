# QUESTIONS — King Mimic USER_STORY_REWORK implementation (2026-06-08, overnight)

The whole rework shipped **green** (pure 420 · fuzz 200 runs · serve 20 · smoke · e2e). These are
the judgment calls I made where the spec left a gap, plus a few things I deferred. Mark them up and
I'll wire your answers next session. Nothing here blocks playtesting — go play `bun run server.js`
→ http://localhost:3000 first.

## Decisions I made (override any you don't like)

1. **Greedy body-value feeding V = the body's raw ante** (e.g. a greedy Killionaire adds 7 to V),
   mirroring how a loot item's value = its ante. But **buying** a body costs `ante × 5` (tierCost).
   So "what a greedy body is worth as income" (7) ≠ "what it costs to buy that chassis" (35).
   Intentional (income vs. purchase are different things) — but confirm the income number feels right.
   → **Want greedy body-value to be the full tier-value (×5) instead, or some other number?**

2. **Anti-stall safety net (NEW).** Fuzz found a real infinite-stall: a hastened healer whose
   self-heal rate exactly matches a hero's DPS → nobody ever wins/loses. You explicitly killed
   room escalation/enrage, so I did **not** re-add ramps. Instead: if a fight makes *zero* progress
   (no new low in total foe-HP **and** no new low in caravan-HP) for **150s**, it resolves as a
   **loss**. Never fires in normal play (fights resolve in seconds). → **OK as a loss? Or would you
   rather it be reinforcements (the pull grows), or a different resolution?**

3. **Baseline foe count now scales with party size.** Old code stocked a fixed absolute count
   regardless of players; with lanes = players that meant solo got hammered (1 lane, same foes).
   Now it's ~per-lane pressure × lanes, so solo faces ~1 lane's worth and a 4-player party faces 4×.
   → **Confirm per-lane scaling is what you want.** (It's the reason the solo e2e bot can win at all.)

4. **Solo = 1 lane** (your stated choice; `LANE_FLOOR = 1` in game.js). I left the floor-of-2
   fallback as a literal one-line change (`LANE_FLOOR = 2`) per your note. The dumb e2e bot can win
   solo now, but **you should playtest solo-1-lane yourself** — if it feels flat, flip the constant.

5. **Drafted bodies are pure chassis** — HP only, **neutral affinity, no passive, no tempo.** The
   wheel uses low foe bodies (pixie/basilisk/mummy/wageslave/youngdead/accountant/starfish/royalRat/
   babyfangs). Their passives don't fire for players (players act only through items), and they carry
   no phys/mag affinity, so a freshly-drafted player is weaker than an old class (warrior had phys2).
   → **Is "neutral, no affinity" for starting bodies intended, or should draft bodies grant affinity/
   tempo** (so the draft has the warrior/mage-style identity you build a kit around)?

6. **Body purchase kept the tier-unlock model, made per-player, kept exclusivity.** §8 says post-draft
   *overlap is allowed* (two players may wear the same body). I **deferred** relaxing that — right now
   a body another player wears is still off-limits. → **Relax to allow overlap post-draft?** (one-line:
   drop the exclusivity check in `canSwapTo`). The exclusive rule still correctly applies to the draft.

7. **Trading = propose → accept handshake** (the target must accept; value gap auto-settled, lesser-
   item giver pays). → **Good, or do you want instant/no-confirm trades?**

## Deferred / not literally as the spec drew it

8. **Greedy-add UI reuses the existing stock-palette component, not literally the draft-wheel
   component.** Behaviour is exactly per spec (one per player, into *your* lane, feeds V, removable).
   The spec said "reuse the same wheel UI as the body draft" — that's a cosmetic unification I skipped.
   → Want the literal wheel component there, or is the current stock panel fine?

9. **Home/map screen = the existing between-rooms + shop screens, now with trading.** The spec §4
   describes a richer home base showing *every* player's body + kit. I show **other** players' kits in
   the trade section (enough to trade), but there's no full party-loadout board. → Want a dedicated
   party-loadout view, or is the trade panel enough?

10. **Classes (warrior/rogue/mage/cleric) are now legacy** — kept as (a) the back-compat
    `chooseClass` path the whole test suite drives, and (b) still-wearable bodies with real affinity/
    tempo. The **live** draft is the wheel. → Fully delete the class concept, or keep classes as
    special/purchasable bodies (they're the only affinity-carrying non-foe bodies right now — see Q5)?

## Untouched on purpose (your scope calls — listed so you know I respected them)
- **Bosses**: code untouched; boss/god rooms keep a fixed ≥3-lane board so the designed encounters
  still work. **Boss reward is still the open decision** (boss rooms pay 0 under mirrored income).
- **Persistence / permadeath / matchmaking**: North Star, not built.
