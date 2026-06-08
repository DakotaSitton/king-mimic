# USER STORY REWORK — King Mimic — vision spec for the next session

> **What this is.** A from-the-player's-seat rework of King Mimic's *meta loop* (draft →
> out-of-combat economy → combat → repeat), pitched and confirmed line-by-line in the
> 2026-06-08 session. The next session implements **this whole user story in totality**.
> It is a design spec, not a resume-where-I-left-off doc — read `HANDOFF.md` for current
> code state, then implement *this*.
>
> **Read order:** this file → `HANDOFF.md` (current state + landmines) → the code map at the
> bottom of this file. Then build.

---

## SCOPE — read this first, it's load-bearing

**IN scope (build all of it):**
- New **draft**: a shared wheel of lowest-power bodies, each pre-bundled with 3 random items; exclusive lock-in.
- The **out-of-combat / map screen** as the home base (loadout, treasure, trading, spending).
- The **mirrored-income economy** (the new spine — see §2). This replaces the old "income = loot you don't take" model.
- **Player-to-player trading** with money-settled value differences.
- **Two spend axes**: buy a defeated body (chassis swap), and "level up" (= +1 kit slot, a rename).
- The **greedy-add** popup at combat entry (one extra body per player, into that player's lane).
- **Lanes = player count** (1–4), with a documented fallback.

**OUT of scope (do NOT build this session):**
- **All bosses.** Leave the existing boss code (`bossForFloor`/`spawnBoss`/`effectiveDamageTo`) untouched.
  Boss rooms keep working as they do today. **The boss-reward question is an intentionally OPEN
  design decision** — do not invent a number or a drop. Floors still chain `nodes → boss`; you're
  just not touching what the boss *is* or *pays*.
- **Persistence / permadeath / cross-run characters / equal-treasure matchmaking.** This is the
  North Star (§7), explicitly NOT this session. Don't build storage, accounts, or identity.

**The run shape (context only — bosses are out of scope):** 3 floors. Each floor = a set of nodes,
then a boss. After 3 floors → King Mimic. You implement the per-room loop and the floor/node
chaining; the bosses themselves are left as-is.

---

## 1. THE SPINE THAT DOES NOT CHANGE

Combat resolution is **untouched**. This rework is the meta/economy/UX layer only. Specifically, all
of these stay exactly as they are (confirmed this session):

- **Everything is a Combatant: body + items + passives. Nobody has a base swing.** Damage flows only
  through items and passives, through `resolveOps`. Do not reintroduce auto-attacks.
- Real-time fixed-tick combat, the shared **Caravan** HP fail-state behind the lanes.
- Bodies (HP / affinity / tempo / one passive), items (active, cooldown, damage type), passives
  (`every:N` / triggers). Formation (`formUp`), AoE telegraphs, players-render-as-their-body.
- Win/loss as today: caravan at 0 = loss; clearing a room full-heals + revives the party; no
  mid-combat revive.

---

## 2. THE ECONOMY — the new spine (this is the heart; get it exactly right)

The old model ("income = the loot value you *don't* claim, banked to a shared pot on leave") is
**replaced wholesale**. The new model:

### The hard invariant
> **Every player's cumulative *earnings* are always identical.** At any point in a run, every player
> has been *credited* the same total treasure — whether that number is 10 or 50. Nobody can ever earn
> more than anybody else. Income is **mirrored, not split.**

(Equality is on *earnings*, not on *holdings*. After players spend differently, their cash + gear can
diverge — that's fine and intended. The invariant is purely on income credited.)

### How income works
- Each cleared combat room has a total value **`V`**:
  - `V = Σ itemTreasure(every loot item in the room — baseline foes' items + greedy-adds' items)`
    `+ Σ bodyValue(every greedy-added body)`.
  - (Baseline foes contribute their carried items' value; a greedy-add contributes **both** its
    body-value in treasure **and** its carried item as a claimable loot item.)
- On clearing the room, **credit `V` to *every* player's wallet** (the full `V` each — mirrored).
- Defeating a foe still unlocks its **body** for the whole party (the mimic roster), independent of
  who, if anyone, claims its gear.

### How spending works (per-player wallet)
- Treasure is now a **per-player wallet** (`player.treasure`), not a shared `room.treasure`.
  Mirrored income keeps the *earned* totals equal; wallets diverge only as players *spend*.
- **Claiming a loot item now COSTS its value** (`itemTreasure`, 1:1) out of the claiming player's
  wallet. (Today `claimLoot` is free — change it.) Loot is a **shared, scarce set**: one instance of
  each drop, first-come; whoever claims it pays and gets it, everyone else keeps their treasure.
- **You only ever own what's in your kit + your treasure. There is NO persistent stash.** Items you
  don't claim before leaving are gone ("use it or lose it") — but you were already credited their
  value as income, so skipping loot simply means you keep that value as cash. The player who grabs
  the shiny item and the player who grabs nothing *earned* the same; one converted income → gear.
- **Two spend axes, both from the player's own wallet:**
  1. **Buy a body** — pay a defeated body's tier-value to swap your character into that chassis
     (your kit/items carry over; body = chassis only). `tiersReached` still gates *which* bodies are
     purchasable (must have felled one of that weight).
  2. **Level up** — pay for +1 kit slot. This is a **pure rename** of today's `buyKitSlot`; same cost
     curve (`kitSlotCost`). Surface it to the player as "level up," internally it's a kit slot.

### Trading (player-to-player)
- Players trade equipped items with each other. A value difference is **settled in treasure between
  the two players** (giver of the lesser item pays the difference). This is allowed because the
  equality invariant is on *earnings*, not holdings.

### What this deletes / inverts in code
- `bankUnclaimedLoot` + `pendingTreasure` (the "convert unclaimed loot to a shared pot on leave"
  path) — **gone.** Replaced by "credit `V` to every wallet on room-clear."
- `room.treasure` (shared) → `player.treasure` (per-player). `buyTier`, `buyKitSlot`, shop purchases
  all spend from the acting player's wallet.
- `claimLoot` free → `claimLoot` costs `itemTreasure` from the player's wallet.

---

## 3. THE DRAFT (room join → locked loadout)

- Keep all of sign-in / create-room exactly as-is.
- On join, the party sees a **shared wheel** of the **lowest-power bodies**, each pre-bundled with
  **3 random items**. (This is a shift from today's *class*-based draft — warrior/rogue/mage/cleric.
  The draftable units are now low-tier **bodies + random item bundles**, not classes.)
- Players **pick and lock, exclusively** — no two players on the same bundle. Once everyone has
  locked, the party moves to the out-of-combat / map screen.
- Starting kit size = **3** (so `KIT_SLOTS_BASE` becomes 3, down from 5; "level up" grows it toward
  `MAX_KIT`).

---

## 4. THE OUT-OF-COMBAT / MAP SCREEN (home base between rooms)

This is the screen players sit on between combats. It shows:
- The **dungeon map** (nodes / current floor).
- **Each player's body** + the items/loot in their kit (each player rendered as their body).
- The **available loot** to claim from the just-cleared room (claim = pay its value, §2).
- Each player's **treasure**.
- **Trading** UI (§2): trade items between players, value difference auto-settled in treasure.
- **Spend** controls: buy a defeated body (chassis swap), and **level up** (+1 kit slot).
- When the party commits to a **combat node**, go to §5.

---

## 5. THE COMBAT NODE — pre-stock + greedy-add

- Entering a combat node, the room auto-populates with **baseline, lower-powered bodies + items**
  (today's `buildBaseline` → `formUp`).
- Then the **greedy-add popup** appears: it reuses the **same wheel UI as the initial body draft**.
  Each option on the wheel shows the **body**, its **item**, and the **treasure value it adds**.
- **Each player may add ONE extra body** (optional). The added body drops into **that player's lane**.
  It's an enemy you opt into: defeating it unlocks its body (mimic roster), its body-value and its
  carried item feed into `V` (so the greedy add raises *everyone's* mirrored income equally — greed
  never makes one player richer).
- Then combat goes live (unchanged resolution). Clearing the room → credit `V` → back to §4.

---

## 6. LANES = PLAYER COUNT

- **Lanes = number of players, 1–4** (1p → 1 lane, 2p → 2, 3p → 3, 4p → 4). Replace the hardcoded
  `LANES = 3` (game.js:8) — it's woven through formation, round-robin fill, `dealEachLane`/AoE,
  win/loss, allies/shields arrays, and the **canvas renderer** (which currently draws 3 fixed
  columns). The renderer must lay out `N` columns dynamically.
- Each player **owns their lane** (their greedy-add and their body sit there). This makes all-lanes
  effects fair by construction.
- **Documented fallback (do NOT build unless playtest calls for it):** if solo (1 lane = no lateral
  movement) feels flat, the escape hatch is `lanes = clamp(players, 2, 4)` — floor at 2 so movement
  survives solo, and re-tune the solo experience. The user chose pure player = lane first and will
  pivot to this only if it plays badly. **Build pure player = lane; just leave the clamp obvious
  enough that flipping to a floor-of-2 is a one-line change.**

---

## 7. OUT OF SCOPE — North Star (record, do NOT build)

The user's long-term dream, explicitly deferred. Captured so it isn't lost, NOT on this agenda:
- **Persistent characters across dungeons, with permadeath** — your character survives between runs;
  queueing risks losing it forever. Huge tension multiplier and the likely fat-tail differentiator.
- **Equal-treasure matchmaking** — players of similar treasure-rating queue together.
- **Known tensions to resolve *if/when* this is ever taken up** (so future-you decides with eyes open):
  1. It pulls against the Skribbl/Jackbox "send-a-link, no-commitment" thesis toward a Tarkov-style
     committed-stakes game (needs accounts, durable storage, identity, stronger anti-cheat).
  2. It breaks the equality invariant at the *meta* level (veterans ≠ fresh rerolls). Equality stays
     a strictly *intra-run* rule; the cross-run layer is unequal by design.
- **Boss reward** is also an open design decision (boss rooms currently pay nothing under the loot
  model) — but bosses are out of scope this session entirely, so don't touch it.

---

## 8. MINOR DEFAULTS I CHOSE (override if wrong — the user did not specify these)

These fill gaps the pitch left open. They're reasonable defaults; flagging them so they're visible:
- **Draft wheel size:** offer ~6 low-tier body+item bundles (at least `players + 2`) so locking is a
  real exclusive choice. Tunable.
- **Greedy-add source:** the wheel rolls from the floor-appropriate greedy foe pool (today's
  `buildFoePool` / spicy palette). Each option = a body + its carried item + its treasure value.
- **Body purchase / roster ownership:** unlocked (defeated) bodies are a **shared roster of
  *knowledge*** — any player may pay to swap their character into any unlocked, purchasable body.
  Post-draft, **overlap is allowed** (two players may wear the same body — it's their own money).
  The exclusive no-overlap rule applies to the **initial draft only.** (This replaces today's
  free exclusive-pool `swapBody`/`homeBody` trade.)
- **Loot claim timing:** loot is claimed on the out-of-combat / between-rooms screen, not mid-fight.
- **Run start:** players start a run with **0 treasure**; draft bodies are free (granted).

---

## 9. CODE MAP — where this lands (grounded against current source)

**`game.js`** (all pure logic + stats):
- `LANES = 3` (line 8) → derive from player count; thread through lanes/allies/laneShield arrays
  (274–276, 451, 509–511), round-robin fill (461–468), AoE `dealEachLane` (865), shove (891),
  tick loops (774, 973, 999), snapshot lane indices (1110).
- **Economy rewrite:** `bankUnclaimedLoot`/`pendingTreasure` (606–612) → delete; add "credit `V` to
  every wallet on room-clear." `room.treasure` → `player.treasure`. `claimLoot` (585) free → costs
  `itemTreasure` from the player's wallet (and stop gating purely on kit space — also gate on funds).
  `buyTier` (384) and `buyKitSlot` (595) spend the acting player's wallet, not shared. `swapBody`
  → body purchase from own wallet (chassis swap, kit carries over).
- `KIT_SLOTS_BASE = 5` (181) → **3**. `kitSlotCost` curve unchanged; "level up" is the UI name.
- **Draft:** `startDraft` (632) + the class draft → body+random-items wheel; lowest-tier bodies are
  the draftable chassis (the class concept may be subsumed — confirm against `CLASSES`).
- **Greedy-add:** `buildBaseline`/`formUp` pre-stock unchanged; add a per-player "add one body to my
  lane" action sourced from `buildFoePool`; ensure its body-value + item feed `V`.

**`server.js`** (networking only): routes already exist for `claimLoot` (135), `swapBody` (183),
`buyTier` (189), `buyKitSlot` (194), `advance`/`descend` (153/134), shop (200–207). Re-point them at
per-player wallets; add a route for the greedy-add action; add a draft-lock route if needed.

**`public/client.js`** (canvas + overlays): the **3-column renderer must become N-column.** The
between-rooms / map screen (`renderBetweenRooms`) grows the loadout + trading + spend UI. The
greedy-add popup **reuses the draft wheel component**. Update `?demo=` fixtures (`buildDemoState`) so
screenshots cover: new draft, map/home base, greedy-add popup, N-lane combat.

**`public/inventory.js` / `map.js`**: right-panel loadout + body-swap → body-*purchase* modal;
trading UI; map already has nodes.

---

## 10. DEFINITION OF DONE (the user's working style — non-negotiable)

- **The full per-run user story plays end-to-end**: join → draft+lock → map/home base → enter combat
  → greedy-add → fight → clear → income credited equally → spend/trade → next node → (floor chains to
  its boss, which is left as-is) → repeat.
- **Suite stays green after every change**, never left red: `bun test/game.test.js` (pure) + serve +
  smoke + the full economy E2E (`test/e2e.js`) + `test/fuzz.js`. **Add tests** for: the mirrored-income
  invariant (every player credited equal `V`), claim-costs-treasure, per-player wallets, N-lane
  layout for 1/2/3/4 players, greedy-add feeds `V`.
- **End-to-end + screenshots, not just unit tests** (the user loves this): regenerate
  `tools/shots/demo-*.png` for the new screens via `tools/shoot.ps1`. He playtests himself, often on
  phone — send screenshots.
- Restart the server for `game.js`/`server.js` changes (no `--watch`); kill stale `bun` first.
  **No Node — Bun only. No Playwright** (Edge-native screenshots).
- **Do not touch bosses. Do not build persistence.** If a boss room would pay nothing, leave it —
  that's the recorded open decision.
