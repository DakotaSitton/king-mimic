# HANDOFF — King Mimic — 2026-07-13 18:39 CDT

> Browser co-op deckbuilder roguelike. Runtime = Bun. Working branch =
> `feat/room-draft-overhaul`. Read `CLAUDE.md` before editing: its verification bar and harness
> traps remain binding, though its suite-count lines are stale.

## Exact deployed state

- Runtime code commit `e8dece4` (`feat: rebalance card values and foe action ante`) is pushed to
  origin and deployed. The following handoff-only commit changes no runtime file, so no restart is
  needed for it.
- Live Bun PID `28536` owns `:3000`. The existing cloudflared PID `50072` was never bounced.
- Public URL: **https://choosing-lbs-font-hamburg.trycloudflare.com/**
- Local and tunnel return HTTP 200; their served `client.js` content is identical and contains the
  ante-v4 base-4 UI copy.
- Canonical mobile target is the owner's iPhone 16 in landscape: **852×393 CSS px, DPR 3, touch**.
  Desktop emulation cannot prove Safari safe-area/notch behavior, so a physical-phone glance is
  still the last platform-specific check.

## 2026-07-13 balance seam

The owner requested temporary card ratings using **every integer from 1 through 5** and a higher
flat foe ante to price the foe's independent action economy.

### Five card-value tiers

`engine/kit.js` exports one auditable `TEMP_CARD_VALUE_TIERS` overlay. It exhaustively classifies all
81 player cards exactly once; six summon-only `t*` attacks remain value 0.

| Value | Count | Representative cards |
|---:|---:|---|
| 1 | 23 | Sword, Bow, Buckler, Tower Shield, Butterfly Knife |
| 2 | 17 | Javelin, Fire, Thorns, Mirror Mace, Gravity Greatsword |
| 3 | 20 | Mallet, Glacius, Demon Form, Pet Leech, Starblade |
| 4 | 13 | Meteors, Stoneskin, Omnislash, Mirror Shield, Reveal Light |
| 5 | 8 | Big Wizard Hat, Black Hole, Lion Lance, Za Warudo, Crimson Crown |

Mean player-card value is 2.5802. These are temporary judgment tiers, intentionally centralized so
owner retuning is a one-line move between lists. Tests fail on omissions, duplicates, extra keys, or
values outside 1–5.

The tiers activate previously dormant systems:

- `RICH_ITEM_POOL`: 58 castable cards valued 2–5. Arsenal foes can now buy exact-value upgrades.
- `RARE_POOL`: 41 cards valued 3–5. Boss reward shelves now contain four distinct real rares.
- Shops/trades/adoption use the actual card values. Adoption auto-pay now solves a bounded subset
  sum, minimizing overpay and then card count; a cost-4 purchase with `[1,1,5]` correctly spends the
  5 rather than burning all three cards.

### Foe action-economy ante

The canonical formula is now:

`anteOfFoe = 4 base + Σ card values + 2×(level−1) + 3 if elite`

`foeLootValue = anteOfFoe − 4` for each foe. The flat four is a threat-only action/body tax; carried
cards and level/elite premiums remain reward. A level-1 common with three value-1 cards therefore
costs **⚖7** and drops **◈3**.

The floor-one solo budget still rolls 4–12. Rolls 4–6 normalize to one legal ⚖7 common. Rolls 7–12
buy one progressively richer foe. Base foe kits are always three archetype-fitting value-1 cards;
enrichment then pays the exact `(new value − 1)` delta, preventing accidental budget overruns.

Exhaustive generation proof over 22,500 floor-one solo rooms found exactly one acting foe in every
room, no budget overrun for budgets 7–12, and exact ante/loot conservation. A larger 450,000-room
Monte Carlo likewise found zero invalid rooms and exercised all five arsenal tiers.

Important: budgets 10–12 can still buy **one elite body**. An exact mobile real run drew one Debt
Dragon and lost on floor one. Do not silently remove first-room elites; that is the next owner ruling.

### Combat safety found while activating the tiers

- Back-line boss poison/leech ticks can kill and clear the boss mid-tick. The simulation now captures
  the boss reference and checks liveness before leeches and clocks, preventing a null dereference and
  any post-death boss action.
- Multiple simultaneously due leeches stop after a lethal drain, preventing repeat corpse damage,
  duplicate defeat counts, and extra healing.

## Verification on `e8dece4`

- Game: **1506 passed, 0 failed**
- Squad: **22 passed, 0 failed**
- Fuzz: **60 full runs, no invariant violations**
- Serve: **35 passed**
- Admission: **13 passed**
- Real multiplayer: two browser clients joined distinct human seats, won combat, and passed all 12
  same-room/split-vote/all-lock gates; 13 screenshots, zero JavaScript errors.
- Canonical `shoot.mjs`: exact **852×393@3 touch, landscape**; draft → win → room → setup → combat →
  loss; 18 screenshots, zero JS/page/HTTP/art errors. Output:
  `tools/shots/real-mobile-2026-07-13T23-32-37`.
- Tracked five-tier scenario: exact same mobile profile; Sword ◈1, Fire ◈2, Glacius ◈3, Meteors ◈4,
  and Black Hole ◈5 are simultaneously visible without overflow; four screenshots, zero errors.
  Output: `tools/shots/scenario-economy-five-tiers-2026-07-13T23-35-42`.
- Tier simulation: 3,400 body runs completed after the boss fix. Common-body fight win rate was
  51.1%, elite 58.3%, overall 53.9%; throne completion remained extremely rare. This balance seam
  reduces actor pressure and activates rewards, but does **not** solve the full progression curve.

## Product assessment and next gains

The premise remains genuinely differentiated: body possession makes defeated enemies into future
identity/build choices, and co-op voting creates social friction that Balatro or Slay the Spire do
not have. The gap is execution consistency, not a missing content mountain.

Highest-value next work:

1. **First-run contract:** decide whether the first room may contain elite bodies. Multi-foe openers
   are gone under the current economy, but elite openers remain possible at ⚖10–12.
2. **Make the hook unavoidable:** readable first foe → defeat → visibly possess/wear it within the
   opening minutes. The mimic revelation should be the tutorial's payoff, not background machinery.
3. **Combat feel:** coherent card travel, hit-stop/impact, sound, haptics, and clearer cause/effect.
   This will create more freshness than another large card batch.
4. **Physical iPhone pass:** confirm Safari safe areas, notch edges, touch targets, and landscape
   browser chrome on the actual device.

## Carried-forward systems that remain live

- Server-authoritative keyframe+delta protocol; optimistic input echo never predicts damage/HP.
- Short-landscape combat/setup/loss polish and exactly one Play Again CTA.
- Equal-priority tactical foe rows with target/threat rings; foe summons enter the absolute lane
  front and block melee.
- Multiplayer draft presence, room voting, and all-seat lock gate.
- Developer lab and tracked scenarios behind `KM_SCENARIO=1`; normal servers reject scenario APIs.
- Every ordinary foe carries exactly three cards. Card count is not a difficulty lever because only
  the front moxie-gated queue card casts.

## Open owner rulings

- Are elite bodies allowed in the first room? This is now the single clearest progression lever.
- Boss court remains capped to three cards; exempt it or keep it intentionally compact?
- Acid Rain currently hits players and hero summons only despite “every body in the room” copy.
- Boss-deck-as-loot remains promising, but should be a tight cycling deck plus draft-a-subset rather
  than dropping a huge queue the boss never cast.
- Five-foe phone rows fit but compress below comfortable touch size; choose dense overview, scroll,
  or a separate target selector before enlarging hitboxes.
- The 1–5 tier placements are provisional. Retune specific cards from play evidence; do not collapse
  the system back to sparse 1/2/5 values.

## Landmines

- Never deploy server or client alone. Push, then bounce **only Bun**. Restarting cloudflared rotates
  the friend's URL.
- Do not stage/delete unrelated untracked owner files. In particular preserve `nul`, design notes,
  probe scripts, tier simulation output, and tunnel logs.
- `CLAUDE.md` suite counts are stale; it is owner-managed.
- Desktop mobile emulation proves layout dimensions, not iOS safe-area behavior.
- Cool Shoes loop stays. Never expose player-facing “AUTO” language (`autoFire` is bot machinery).

## Pointers

- Run: `bun run server.js` from repo root (`:3000`).
- Core tests: `bun run test/game.test.js`, `bun run test/squad.test.js`, `bun run test/fuzz.js`.
- Mobile: `node tools/shoot.mjs`; scenario:
  `node tools/scenario-shot.mjs tools/scenarios/economy-five-tiers.json`.
- Multiplayer: `node tools/mp-playtest.mjs`.
- Analysis: `bun tools/content-audit.mjs`; `MODE=bodies RUNS=100 bun tools/tier-sim.mjs`.
- Key files: `engine/kit.js` (tiers), `engine/world.js` (ante/loot), `engine/lobby.js` (generation),
  `public/inventory.js` (value tender), `engine/combat.js` (ticks), `test/game.test.js` (contracts).
