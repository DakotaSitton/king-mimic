# HANDOFF — King Mimic — 2026-07-15 17:06 CDT

## State

- Remote branch `feat/room-draft-overhaul` is at verified runtime commit **`d5d1dc3`**;
  this handoff is the following documentation commit. Checkout:
  `C:\Users\dakot\king-mimic`.
- **Deployed and live.** Bun **PID `7712`** owns `:3000`; Cloudflared **PID `11488`**
  was preserved and serves **https://pads-corn-refuse-relationship.trycloudflare.com**.
  Local and public roots both return HTTP 200 with the same byte count.
- The current owner direction supersedes the prior loot-honesty next step. Focus remains:
  1. **Simple, smooth mechanical play** — the actual feel of tapping cards, targeting,
     choosing, moving between setup/combat/results, and adjusting a deck. Use Balatro as
     the interaction benchmark: few taps, obvious state, immediate feedback, easy reversal,
     and no friction whose only purpose is ceremony.
  2. **Telemetry quality and use** — make the new measurements trustworthy and useful for
     diagnosing friction and later design balance, without treating metrics as design authority.
- **No card, body, boss, encounter, shop, or economy balance values were changed in the
  telemetry or tactile patches.** Dakota will provide balance notes later. Do not wait for them and do not
  infer them.
- The first instrumented mobile tactile pass is shipped. On touch, a quick tap anywhere on a room
  preview—including its large foe chip—chooses the room; holding the foe chip for roughly 360 ms
  opens details and suppresses the release click. Setup presents one Begin Combat action while its
  overlay is open. Draft, room, setup, and deck-move actions now acknowledge the tap immediately
  while the server remains authoritative.
- An unaffordable manual card tap is no longer discarded silently by the client. It reaches the
  normal server rejection path, flashes the card and moxie rail with the exact shortfall for 700 ms,
  and is counted by the existing bounded combat metrics. No card, moxie, or combat state is mutated.
- Audit comparison through draft → room choice → setup → combat: the critical transition fell from
  **4 taps / 1 intercepted tap / 2 ambiguous states** to **3 taps / 0 intercepted taps / 0 ambiguous
  states**. The rejected-card probe changed from invisible and unmeasured to one visible,
  attributable `unaffordable` rejection. Initial setup had no legal deck adjustment because the
  rolled combat deck was at the 10-card floor with no spare; post-win deck moves retain their tap
  count but now show immediate `moving…` feedback and remain reversible.
- Aggregate combat telemetry is implemented, committed, pushed, and live. It records exact
  rolled starter decks; deck snapshots after successful edits, shop buys, and level-ups;
  manual/AUTO casts; draw instances; opening draws; cards held through affordable and
  unaffordable ticks; whole-hand locks; rejected taps; cards stranded at combat end;
  replacement draws that arrived too late to judge; requested/effective/wasted healing;
  overheal converted to shield; shield granted; damage actually stopped; shield resource
  spent; and per-body combat outcomes.
- Starter-deck cut reporting is duplicate-aware and groups by stable run + seat. “Cut ASAP”
  means fewer copies at combat 2 than the exact rolled starter. Room-one deaths are excluded
  because no edit opportunity existed.
- The report deliberately calls end-held cards **stranded evidence**, not “traps.” An uncast
  card can reflect affordability, draw timing, targeting friction, encounter length, deck
  context, or taste. Preserve that distinction.
- Combat metrics are bounded in memory and emitted only at combat start/result; telemetry does
  not write per-tick JSONL. Harness and bot provenance remain separable from genuine human play.
- Verification at runtime commit `d5d1dc3`: game **2163/0**, squad **28/0**, telemetry
  **69/0**, fuzz **60** full runs with no invariant failures (one known sustain-wall abandonment),
  and serve **35/0**. The post-change real 852×393 touch run at
  `tools/shots/real-mobile-2026-07-15T22-04-09` traversed draft → won → setup → playing → lost
  in 20 frames with **0 JS errors**, 0 404s, and no missing art. The real two-client co-op run at
  `tools/shots/mp-2026-07-15T22-04-09` won both games, passed vote/lock progression checks, and had
  **0 JS errors**. Draft, room choice, setup, combat, result/loss, and co-op result frames were
  visually inspected.
- The real scenario `tools/scenarios/touch-rejected-feedback.json` captured the failed-tap feedback
  at `tools/shots/scenario-touch-rejected-feedback-2026-07-15T21-59-18`: before, active feedback,
  and cleared state, with **0 JS errors** and no authoritative state change. The measured MAR2 run
  emitted 4 manual attempts and exactly 1 `unaffordable` rejection on `oBlizzard`; the combined
  telemetry report renders that rejection under the card and the piloted body.
- `KEEP_HARNESS=1 bun run tools/telemetry-report.js` successfully renders the new starter-cut,
  card conversion/affordability, sustain, and body-outcome sections from fresh measured combats.
- Dakota reviewed the graphics positively. This is not a visual-redesign mandate; improve visual
  feedback only where it materially improves input confidence, selection state, target clarity,
  reversibility, or transition flow.
- Current content facts for later owner notes: 21 common wearable bodies, 13 elite wearable
  bodies, 80 normal player cards, 1 archived player card, and 6 summon-only cards. Starter offers
  are not body-specific: each rolls five distinct V1 cards ×2 from the same 22-card V1 pool.

## Next Step

Run the next evidence-backed mobile audit specifically across a **post-win result → Backpack deck
swap → next-room setup**. Capture one real add/remove reversal with its immediate pending state and
the resulting `deck_edit` event; do not infer that proof from the initial setup, where no spare card
exists. Then choose only the next smallest tactile fix supported by that audit or Dakota's incoming
design notes. Keep telemetry provenance explicit and do not change balance values.

## Active Decisions

- **Taste belongs to Dakota.** Telemetry supplies facts and candidate questions; it does not rank
  cards, declare traps, retier content, or override his experienced judgment.
- The balance sheet was delivered in chat for later phone editing. Unreturned lines mean no ruling,
  not approval for autonomous tuning.
- “Balatro-like” means interaction economy and legibility, not copying Balatro’s art, rules, layout,
  or turn structure. Optimize for obvious choices, low tap count, responsive feedback, easy deck
  adjustment, and short transitions within King Mimic’s own real-time combat.
- Keep mechanics symmetric. A UI improvement may expose or explain player/foe truth, but must not
  silently create player-only combat rules.
- There is intentionally no global card cooldown. Do not restore `CARD_GCD`/`cardCd`; affordability,
  hand state, stasis, target requirements, and card rules are the cast gates.
- Stranded draws require at least one eligible observation tick. A replacement card drawn by the
  combat-ending cast is `unexposedEndDraws`, not falsely counted as stranded.
- Shield telemetry keeps two distinct facts: incoming damage stopped and shield points consumed.
  Punishment Glutton can spend 10 shield to stop 5; piercing damage consumes and credits neither.
- Shops remain 5% after the opening trio and are impossible in the first actionable trio. Floor-one
  ante is [7,12] with budget-aware skew filtering. These are shipped owner-feedback changes, not part
  of the tactile pass.
- Enemy Medusa poison is fixed symmetrically at the already-authored values: one poison per ranged
  play, ticking every 6 seconds. Do not retune it without Dakota’s notes.

## Landmines

- **Do not perform a balance sweep.** Boss difficulty, direct-damage dominance, utility-card value,
  exact shop rate, starter-pool composition, and all body/card numbers remain owner-design questions.
- **Do not optimize taps by making consequential choices irreversible or invisible.** The desired
  simplicity is confidence and compression, not removal of agency.
- Telemetry is observational but touches central combat paths. Healing-trigger semantics must remain
  unchanged; shield provenance must never mutate authoritative shield state; combat-start/result
  events must remain exactly-once even in ultra-fast fights.
- `telemetry.jsonl` contains mixed historical schemas. The report must tolerate old events. Default
  provenance excludes harness events and bot seats; use `KEEP_HARNESS=1` only when deliberately
  inspecting automated verification data.
- Desktop screenshot verification is unavailable on this laptop because its touchscreen makes the
  harness report touch capability. The canonical visual proof is mobile 852×393 DPR3 touch.
- **Deploy safely:** push first, then bounce only the Bun PID owning `:3000`; leave Cloudflared PID
  `11488` alone or the public URL rotates. Check for real established player sockets before restart.
- **Never `git add -A`.** Numerous untracked owner/probe files must remain untracked: design notes,
  scratchpad, `nul`, live/tunnel logs, and `tools/*.mjs` probes/sim outputs. Stage exact files only.
- Preserve archived `KIT.dBloodIron` while keeping it outside normal `PLAYER_POOL` offers.
- Existing wording/mechanics ambiguities remain owner rulings: Jaw overkill wording, Crystal Ball
  tutoring from discard, and Hedgefund Knight’s baked-in “+1 damage.”

## Pointers

- Run: `bun run server.js`; live report: `bun run tools/telemetry-report.js`; combined verification
  report: `$env:KEEP_HARNESS='1'; bun run tools/telemetry-report.js`.
- Test: `bun run test/game.test.js`; `bun run test/squad.test.js`;
  `bun run test/telemetry.test.js`; `bun run test/fuzz.js`; `bun run test/serve.test.js`.
- Real mobile: `node tools/shoot.mjs`. Existing targeted input probes:
  `tools/tap-probe.mjs` and `tools/summon-layout-probe.mjs` are untracked owner/probe files—inspect
  before use and do not stage automatically. Rejected-card visual proof:
  `node tools/scenario-shot.mjs tools/scenarios/touch-rejected-feedback.json`.
- Input/UI: `public/client.js` (combat rendering/input), `public/inventory.js` (setup/deck editing),
  `engine/snapshot.js` (client state projection), `server.js` (messages + telemetry event seams).
- Telemetry: `engine/combat.js` (`beginCombatMetrics`, tick/play/heal/shield accounting,
  `combatMetricsSummary`), `engine/lobby.js` (starter/deck lifecycle), `server.js` (`combat_start`,
  `deck_edit`, `room_result`), `tools/telemetry-report.js`, `test/telemetry.test.js`.
- Content truth for later notes: `engine/bodies.js`, `engine/kit.js` (`TEMP_CARD_VALUE_TIERS`), and
  `engine/cards.js` (`PLAYER_POOL`, archive seam, deck rules).
- Read first: `CLAUDE.md`, this `HANDOFF.md`, and the home-level `AGENTS.md` load order.
