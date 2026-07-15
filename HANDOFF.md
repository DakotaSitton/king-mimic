# HANDOFF — King Mimic — 2026-07-14 22:10 CDT

## State

- Repo: `C:\Users\dakot\king-mimic`; branch `feat/room-draft-overhaul`.
- `HEAD` is pushed at `b6af07f` (`feat: compound card summaries + prominent melee/ranged scale
  treatment`) and is **deployed** (runtime = this commit).
- Live Bun **PID `17792`** owns `:3000` (bounced from the old `14228` to load the new engine).
  Cloudflared **PID `60348`** is unchanged and still owns the quick tunnel:
  **https://enhanced-philadelphia-refurbished-matters.trycloudflare.com**. At this handoff local and
  public roots were HTTP 200 and `client.js` was byte-identical across local, public, and disk.
- Preserve all existing untracked owner/tooling files. Nothing is partially edited or staged.

## What shipped — exhaustive card readability & wording pass

The owner's defect ("cards don't communicate scaling / numeric outcomes at a glance, esp. the iPhone
combat hand") is addressed. All implementation is derived from `KIT[*].ops` — no second table.

- **Engine (`engine/kit.js`, `engine/cards.js`):**
  - `cardScale(key)` → `"melee" | "ranged" | "both" | "none"` — the prominent scaling treatment,
    defined as `opsBothKinds ? "both" : triggerKind(key)`, so it can NEVER disagree with the bonus /
    play-trigger / kind-pricing truth. Bow/Javelin/Repeating Crossbow read **MELEE** (aimed but
    melee-scaled — fixes the old marker that wrongly read them ranged); Force + Crystal Ball read
    **RANGED**; Moonlight/Rainblow read **BOTH**; pure self/ally utility reads **UTILITY** (no false
    melee/ranged tag).
  - `cardOutcomes(key)` walks the ops IN ORDER and emits one part per PRIMARY outcome
    (attack / multi-hit / shield / heal / summon). `cardSummaryLabel` (base) and `cardLiveSummary`
    (live, folds the caster's melee/ranged/shield/ally bonus per part) render the compound line.
    Heart Guard now reads **`🛡2 ❤2`** (was shield-only); Mallet `4🗡 🛡4`; Omnislash `2🗡×4`.
  - `opsBothKinds` moved here from `snapshot.js` as the single source.
- **Snapshot (`engine/snapshot.js`):** ships `sum` / `sumNow` / `sumBoosted` / `scale` on every
  player-facing card surface (hand, cardDescriptor = backpack/deck/shop/loot, draw/disc/in-play piles,
  draft wheel items).
- **Client (`public/client.js`, `public/inventory.js`):** a prominent, color-coded **scale pill**
  (top-center) + the compound number line on the combat hand (touch AND desktop), the hover/hold
  tooltip header (`◆ UTILITY · 🛡2 ❤2`), `cardTile` (deck builder / shop / loot), the draft chips,
  the canvas deck-peek, and the side deck panel. The tiny corner glyph is retired.
- **Wording (`engine/kit.js`) — copy only, exact agreement with mechanics (4 edits):** Shield Bash &
  Force shield grammar → "Gain a N-point shield…"; Berserker cadence comma; Demon Form states its
  "every 6 seconds" cadence once. A full 81-card audit found the rest already clean.

## Verification (all green this session)

- `bun run test/game.test.js` → **2143 passed, 0 failed** (+538 new data-driven readability
  assertions: every collectible card has a valid scale + a summary that agrees with its ops; focused
  contracts for Heart Guard, aimed-melee, melee, ranged, both-kind, ranged Force, multi-hit, typeless).
- `bun run test/squad.test.js` 28/0 · `bun run test/telemetry.test.js` 34/0 · `bun run test/fuzz.js`
  60 runs OK · `BASE=… bun run test/serve.test.js` 35/0.
- **Rendered proof (real game, real Edge, canonical 852×393 DPR3 touch):**
  `tools/scenarios/card-readability.json` (UTILITY-compound / aimed-MELEE / BOTH + hold tooltips) and
  `card-readability-2.json` (RANGED / ranged-shield Force / MELEE-compound Mallet) — PNGs inspected,
  0 JS errors. Fresh `node tools/shoot.mjs` real run inspected (draft chips + live combat hand),
  0 JS/HTTP/art errors. Adversarial diff review: clean, no defects survived refutation.

## Not visually captured this session (implemented + reviewer-vetted + unit-tested, but flagged)

Honest gaps — none block the owner's phone target, all share the proven shared helpers:
- **Desktop hand card** (`!IS_TOUCH` branch): this machine has a touchscreen, so both screenshot
  harnesses reject the desktop profile (`touch=true` mismatch). The reviewer traced the concrete
  desktop geometry (`W=780`, `bh=120`) and confirmed every band has positive gaps.
- **`cardTile` DOM surfaces** (deck builder / loot / shop) and the **desktop side deck panel**
  (`inventory.js`): the `shoot.mjs` run lost on room 1, so no won-combat / shop state was reached;
  the side panel is desktop-only. The **canvas deck-peek** needs a raw-coordinate tap the scenario
  schema doesn't expose. All use the same `scaleChip` / `sum` data already proven on the hand + draft.

## Open items — AWAIT OWNER RULING (added this session; do not resolve unprompted)

Three wording↔mechanics ambiguities the audit surfaced — flagged, deliberately NOT rewritten:
- **Jaw** — text "heal AND gain shield each equal to the damage dealt" is identical to Mallet/Dark/
  Butcher's, but Jaw alone carries `capLanded` (credits only damage that LANDS on overkill). Keep the
  shared phrasing, or signal the cap?
- **Crystal Ball** — "Put a card of your choice from your deck" but the tutor pool was widened
  (2026-07-10) to include the DISCARD (already-played cards). Make "including used cards" explicit?
- **Hedgefund Knight** — "(hp 5, +1 damage, +1 damage resist)": the "+1 damage" is baked into its
  token's `tKnightStrike` (deals 2), not a live stat. Reads fine; owner call whether to reword.

Pre-existing open rulings still stand: King Mimic boss ward, RICH_ITEM_POOL leak, floor-1 difficulty,
anti-stall valve, first-room elites, Acid Rain wording/mechanics, provisional 1–5 card values.

## Next Step

Owner review on his real phone: confirm the scale pills + compound summaries read right in live play,
then rule on the three flagged wording ambiguities above. No further engineering is queued for the
readability pass — it is complete, tested, and deployed.

## Landmines

- Never deploy server and client independently. `public/*` is served fresh from disk (already live on
  edit); the **engine** (`game.js`/`engine/*`) is loaded into the Bun process at boot — snapshot/logic
  changes need a Bun bounce. Push first, then replace ONLY Bun. Restarting/killing cloudflared rotates
  the playtest URL.
- Do not kill a process on a frozen UI / stale transcript / inferred liveness. Before the bounce this
  session verified: PID 14228 = bun, 60348 = cloudflared, and the ONLY ESTABLISHED `:3000` socket was
  the tunnel itself (no players). Kill the single bun PID (no `/T`); leave cloudflared alone.
- `HAND_SIZE` is 3 — the scenario harness rejects a hand > 3, so a "real touch hand" proof uses ≤3
  cards (two scenarios cover all four badge types).
- Do not stage/delete/rewrite unrelated untracked owner files (`nul`, design notes, scratchpad, probe
  scripts, tier-sim output, tunnel logs). Never `git add -A` — stage the intended files explicitly.

## Pointers

- Read first: `CLAUDE.md` (verification bar, harness traps, design boundary).
- Scale + summary engine: `engine/kit.js` (`cardScale`, `opsBothKinds`), `engine/cards.js`
  (`cardOutcomes`, `cardSummaryLabel`, `cardLiveSummary`; older `cardDealInfo`/`cardLiveDmg` still
  feed the single-number foe/summon threat chips).
- Snapshot contract: `engine/snapshot.js` (`cardDescriptor`, hand map, drawPile/discPile/inPlay,
  draft wheel).
- Render: `public/client.js` (`SCALE_BADGE`/`scaleOf`/`drawScalePill`, `drawHotbar`, `drawTooltip`,
  `SCALE_DOM`/`scaleChip`/`cardTile`, `renderDraft` chips, the deck-peek `group()`); `public/inventory.js`
  (`SCALE_ICON`, `renderDeck`).
- Proof scenarios: `tools/scenarios/card-readability.json`, `tools/scenarios/card-readability-2.json`
  (run `node tools/scenario-shot.mjs tools/scenarios/<name>.json`).
- Core verification: `bun run test/game.test.js`; `test/squad.test.js`; `test/telemetry.test.js`;
  `test/fuzz.js`. Serve: throwaway Bun on a non-3000 port, then `BASE=http://localhost:<port> bun run
  test/serve.test.js`. Real mobile: `node tools/shoot.mjs`.
