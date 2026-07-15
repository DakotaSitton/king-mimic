# HANDOFF — King Mimic — 2026-07-15 14:46 CDT

## State

- Remote working branch `feat/room-draft-overhaul` is at reviewed runtime commit **`65c3abd`**;
  this handoff is the following docs commit. The exact deployed checkout is
  `C:\Users\dakot\king-mimic`.
- **Deployed and live.** Bun **PID `28844`** owns `:3000`; the existing Cloudflared **PID `11488`** was
  deliberately preserved and still serves **https://pads-corn-refuse-relationship.trycloudflare.com**.
  Local + public root and `client.js` return HTTP 200. Disk/local/public `client.js` are byte-identical:
  365,726 bytes, SHA-256 `510c9f7e791d5b8d7d273624102143e7ff99467fd920bd55228ef512089bad8d`.
- **VERIFIED working — fewer Shops + no opening Shop:** later room options now roll Shop at **5%**
  (FLAG tuning choice: owner said reduce, not an exact rate), down from 14%; the first actionable trio
  on every normal floor is always three Fights. The old generator put at least one Shop somewhere on
  about 90% of floors and put one in an offered trio about 36% of the time; the new opening rate is 0%
  and a later-floor Shop appears on about 46% of floors. Every trio still keeps at least one Fight.
- **VERIFIED working — floor-one ante variety:** the range existed, but a legal foe costs ⚖7
  (⚖4 actor base + three mandatory ◈1 cards) while solo floor 1 rolled 4–12. Budgets 4–6 normalized
  upward to the same ⚖7/◈3 room; `swarm`/`bodies` also rolled when their defining second-foe/elite
  lever could not fit, and non-arsenal remainder often went unspent. The live range now clamps to
  **[7,12]**, ineligible skews are withheld until their lever fits, non-swarm dead remainder may enrich
  one card after its primary level/body spend, and swarms use common bodies so an elite premium cannot
  collapse their count. Seeded live-path regression now measures ◈3 at 27.0%, leveled foes at 10.3%,
  and richer-card setups at 53.4% (pre-patch diagnostic: 66.7%, 4.8%, and 10.8%).
- **VERIFIED working — real cast VFX:** Sword draws a brief sword on the resolver's actual target;
  Lightning briefly washes and bolts only its affected lane; Meteors fall and leave visible landing
  rings. Cards opt in through `KIT[key].vfx`; `engine/combat.js` records actual target/lane events only
  during a direct card resolve; snapshot/client consume the semantic payload without card-name or prose
  matching. Server and active-client lists are capped at 12; effects ride the normal 10 Hz state paints
  with no timer, input lock, or blocking loop. Meteor events also carry the resolver's actual affected
  targets so the impacts land on their rendered rows.
- **VERIFIED working — no global card cooldown:** the old 10-tick / one-second player, foe, and summon
  `cardCd` gate, arm, decrement, reset, and test knob are removed. Consecutive affordable cards can play
  in the same server tick; card costs, hand/queue rules, effects, numbers, and balance are otherwise unchanged.
- **VERIFIED working — card/deck UI cleanup:** out-of-combat card cost shares the compact metadata row;
  the duplicate deck-size sentence is gone; the minimum rule is one concise line; and backpack conversion
  stays aligned to its header. The inspected REAL setup frame remains readable at 852×393 DPR3 touch.
- **VERIFIED working — archived offer:** `dBloodIron` remains fully defined/castable but is listed in
  `ARCHIVED_PLAYER_CARDS` and filtered from the canonical normal player pool, so draft starter kits,
  loot, shop, and symmetric foe gear cannot roll it. Regression coverage proves definition retention,
  pool exclusion, draft exclusion, and shop exclusion.
- Verification: game 2146 / squad 28 / telemetry 34 / fuzz 60 / serve 35, all zero-fail. Real mobile
  scenario `tools/shots/scenario-cast-vfx-2026-07-15T18-00-42` captured all three effects and was visually
  inspected (`JS errors: 0`); the Sword frame keeps the reticle on Fat Cat while the strike lands on the
  actual front Golden Golem. Canonical unbiased solo `tools/shots/real-mobile-2026-07-15T18-07-56`
  naturally cast Lightning and captured `15-playing-vfx-lightning.png` (`JS errors: 0`, no missing art).
  Real two-client co-op `tools/shots/mp-2026-07-15T18-04-59` completed two won games (`JS errors: 0`).
  REAL setup proof is `tools/shots/scenario-setup-backpack-footer-2026-07-15T18-03-20/01-boot.png`.
  All harness child ports/processes were cleaned.
- Room-generation verification: game **2157** / squad **28** / telemetry **34** / fuzz **60** / serve
  **35**, all zero-fail. Canonical real solo `tools/shots/real-mobile-2026-07-15T19-42-06` opened on
  three Fights (including a ⚖12/◈8 level-3 Centless Centaur with richer cards), entered real combat,
  and ended with `JS errors: 0`; the reviewed opening frame is `02-won-enter.png`. A prior unbiased
  post-patch run at `tools/shots/real-mobile-2026-07-15T19-39-21` opened on three distinct-value Fights
  (◈7 / ◈6+effect / ◈4), also `JS errors: 0`. All child servers were cleaned.
- **NOT verified / the live question:** whether room LOOT is honest. Owner believes some rooms are not
  paying full rewards. Nothing has been investigated yet — this is the next job (below).

## Next step

Investigate **loot honesty**: does what a cleared room actually grants (cards into the backpack +
treasure/bid points) equal what it advertised? Owner reports some rooms feel like they underpay.

Room-generation task is complete. One explicit design boundary remains: solo floor one's peak is
still ⚖12, below the ⚖14 required for two minimum foes. This patch makes the *encounters* and their
cards/levels/bodies varied without silently raising the action-economy ceiling. If the owner meant
literal multi-foe floor-one rooms, the peak budget (or minimum foe cost) needs a separate ruling.

Start by tracing the two numbers and proving they reconcile:
1. **Advertised** — the map preview's `◈ loot` per combat node: `engine/snapshot.js` ~line 720,
   `loot: (n.foes ?? []).reduce((s,f)=>s+foeLootValue(f),0) + (effect pot)`. Note the ANTE-V4 comment
   right above it: `◈ loot = ⚖ − 4 per foe` (the flat +4/foe base is a threat-only "cover charge"
   excluded from loot). Confirm `foeLootValue` matches that intent.
2. **Awarded** — what `claimLoot` / the on-clear payout actually deposits (cards + `treasure` +
   co-op `bidPoints` split). Grep `foeLootValue`, `roomValue`, `rollBossLoot`, `claimLoot`, `bidPoints`,
   `room.loot`, `convertBag`, `treasure` across `engine/world.js` + `engine/lobby.js` + `engine/combat.js`.
3. Reconcile: build a room, clear it deterministically (the `rig`/scenario harness in `test/`), and
   assert awarded == advertised. A gap = the bug. Suspects worth checking: the +4/foe base being
   double-excluded, carried-card value vs. drop value, the co-op bid-points split rounding / "furthest
   behind" excess routing, and boss-shelf vs. normal-loot paths.

Then, secondary: **summarize how the most recent runs are going** — find the run/telemetry log the
server writes (human runs are tagged; harness runs send `?harness=1` and set `telemOff`; see
`test/telemetry.test.js` for the shape) and report floors reached / win-loss / death causes.

(Owner asked to hand this to a fresh **Codex `gpt-5.6-sol`** session in this repo; that launch was
deferred. Launch: `codex -m gpt-5.6-sol --dangerously-bypass-approvals-and-sandbox "<task>"` from
`C:\Users\dakot\king-mimic`, or use `C:\Users\dakot\new-codex-session.ps1 -Path C:\Users\dakot\king-mimic`
and paste the task. Codex shares this brain via `.codex/brain`.)

## Active decisions (non-obvious why only)

- This is an audit of EXISTING loot math, not a rebalance. Loot NUMBERS are Dakota's
  (`feedback_design_ownership`); engineering may only find/fix a discrepancy between advertised and
  awarded, and must FLAG any suspected imbalance for his ruling rather than "fix" it.
- Readability `scale` is `opsBothKinds ? "both" : triggerKind` — reuses the engine's own bucket so the
  symbol and progressive-disclosure wording can never disagree with bonus/trigger/pricing truth. The
  card's unique SVG is its primary identity; do not regress to repeated full-word type pills.
- Cast visuals are an authored data seam (`KIT.vfx`) plus resolver-produced spatial facts. Never infer
  VFX from card display names or rules text. Keep both 12-entry caps and the stale-event skip.
- There is intentionally **no global cooldown** between card plays. Do not restore `CARD_GCD`/`cardCd`;
  affordability, the hand/queue, stasis, and the existing card rules are the cast gates.
- Blood To Iron is archived, not deleted. Keep its `KIT.dBloodIron` definition and mechanic tests; normal
  offer generators should continue deriving from filtered `PLAYER_POOL`.
- Shop room rate is 5% after the owner-requested reduction; this exact unstated number is FLAGGED for
  retuning. Row 1 is a hard no-Shop invariant. The floor-one [7,12] legal-minimum clamp and budget-aware
  skew filter are what prevent the nominal ante range from collapsing back to ◈3 rooms.
- Deploy: `public/*` is served fresh from disk (edits are live immediately), but the ENGINE
  (`game.js`/`engine/*`) is loaded into the Bun process at boot — snapshot/loot/logic changes require a
  Bun bounce to take effect.

## Landmines

- **Deploy safely:** push first, then bounce ONLY Bun (kill the single `:3000` PID, no `/T`); leave
  cloudflared alone or the tunnel URL rotates. Before killing, confirm no live player sockets (this
  session: the only ESTABLISHED `:3000` socket was the tunnel itself).
- **Desktop can't be screenshot-verified on this laptop** — the touchscreen makes both harnesses
  reject `VP=desktop` (`touch=true` mismatch). `HAND_SIZE=3`, so a touch-hand scenario holds ≤3 cards.
  (Saved to memory `reference_king_mimic_playtest`.)
- **Never `git add -A`** — stage intended files explicitly; the tree has many untracked owner/probe
  files (`nul`, design notes, scratchpad, `tools/*.mjs` probes, tier-sim, tunnel logs) that must stay
  untracked. Deletes need owner approval.
- The concurrent VFX-only worktree was reconciled without force-push: `1b1ba01` + its premature
  `307a9d1` handoff remain in history; `d27cbeb` is the reviewed VFX superset and `65c3abd` is the
  deployed runtime truth.
  Do not redeploy the stale `king-mimic-cast-vfx-integration` checkout over this branch.
- **Three wording↔mechanics ambiguities await owner ruling** (flagged, deliberately NOT rewritten):
  Jaw's `capLanded` overkill wording; Crystal Ball tutoring from the discard too; Hedgefund Knight's
  "+1 damage" being baked into its token. Do not resolve unprompted.
- Pre-existing open rulings unchanged: King Mimic boss ward, RICH_ITEM_POOL leak, floor-1 difficulty,
  anti-stall valve, first-room elites, Acid Rain wording, provisional 1–5 card values.

## Pointers

- Loot code: `engine/world.js` + `engine/lobby.js` + `engine/combat.js` (`foeLootValue`, `roomValue`,
  `roomAnteBudget`, `claimLoot`, `rollBossLoot`, `bidPoints`, `convertBag`); `engine/snapshot.js`
  (map node `loot` preview ~720, `room.loot` payload ~760); `engine/kit.js::itemTreasure`.
- Room generation: `engine/world.js::buildLevel` / `stockLevelRooms` (`SHOP_ROOM_CHANCE`, opening row);
  `engine/lobby.js::roomAnteRange` / `roomSkewsForBudget` / `rollLeveledFoe` / `generateRoomFoes`.
- Readability code (shipped): `engine/kit.js` (`cardScale`), `engine/cards.js` (`cardOutcomes`/
  `cardSummaryLabel`/`cardLiveSummary`), `engine/snapshot.js`, `public/client.js`, `public/inventory.js`.
- Cast VFX: `engine/kit.js` (`vfx` metadata), `engine/combat.js` (`recordCastFx`),
  `engine/snapshot.js` (`castFx`), `public/client.js` (bounded transient renderer),
  `tools/scenarios/cast-vfx.json`. Archive seam: `engine/cards.js::ARCHIVED_PLAYER_CARDS`.
- Test: `bun run test/game.test.js` (2157/0); `test/squad.test.js`; `test/telemetry.test.js`;
  `test/fuzz.js`. Serve: throwaway Bun on a non-3000 port, then
  `BASE=http://localhost:<port> bun run test/serve.test.js`.
- Real mobile: `node tools/shoot.mjs`. Scenario capture: `node tools/scenario-shot.mjs tools/scenarios/<name>.json`.
- Read first: `CLAUDE.md` (verification bar, harness traps, design boundary).
