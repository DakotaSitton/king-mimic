# HANDOFF — King Mimic — 2026-07-15 23:25 CDT

## State

- Remote branch `feat/room-draft-overhaul` is at deployment commit **`0f4774f`**;
  this handoff is the following documentation commit. The tactile runtime beneath the deployment
  changes remains verified at **`d5d1dc3`**. Checkout:
  `C:\Users\dakot\king-mimic`.
- **Public production is deployed on Railway:**
  **https://king-mimic-production.up.railway.app**. Railway project `8498af62-f404-4661-ae04-6442e9921943`,
  service `4ddfd526-e710-429b-b7d1-0f61e2951a33`, environment
  `69ce51ab-225f-4c80-af2f-c7dda7f6445d`, active deployment
  `c06674c5-91f6-4639-b800-d38c7fcf4795`. It builds the repo `Dockerfile` with Bun 1.3.14,
  tracks `feat/room-draft-overhaul`, uses Railway's injected `PORT=8080`, and checks `/health`.
- Production telemetry and combat logs use `KM_DATA_DIR=/var/data`, backed by attached persistent
  volume `king-mimic-volume` mounted at `/var/data`. The server's data-path behavior also passed a
  local isolated persistence probe. Do not remove the volume or the variable during redeploys.
- Hosted verification: `/health` returned HTTP 200 with `{"ok":true}`, `/` returned HTTP 200 and
  the King Mimic page, and a rerun of the complete remote serve suite passed **36/0** across HTTP and
  WebSocket behavior. A real Chrome client created a public room, received the body draft, chose a
  body, and reached first-room selection. The existing tactile verification remains **0 JS errors**
  in the real mobile and two-client harness runs documented below.
- The Railway account is currently on the trial allowance (30 days or $5, whichever is exhausted
  first). Dakota must upgrade the Railway plan before the allowance expires to keep production
  continuously available.
- The prior local fallback remains running: Bun **PID `7712`** owns `:3000`; Cloudflared
  **PID `11488`** serves **https://pads-corn-refuse-relationship.trycloudflare.com**. The Railway URL
  is now the stable address to share; do not treat the rotating tunnel as production.
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
- **A new owner-authored body/boss design pass is queued but not implemented or verified yet.**
  Body changes must let the player retain or rebuild any melee/ranged split they want instead of
  imposing a body-driven split; some bodies deliberately prefer unusual ratios. Boss health must
  keep its existing party/floor scaling, while boss actions move to real decks with one concurrent
  cast bar per player. No unrelated balance values are authorized by this ruling.

## Next Step

Trace the current body-swap deck rewrite from `public/inventory.js` through `engine/lobby.js`, add a
failing regression proving a player can choose any legal melee/ranged split after changing bodies,
then implement the smallest server-authoritative fix. Preserve the deck minimum and all existing card
values. Once that seam is green, use it as the stable base for the owner-authored boss deck engine.

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
- **Boss deck/action-economy ruling (Dakota, 2026-07-15):** keep the existing boss health scaling
  with party size and floor. Each boss draws and plays from its authored deck, with concurrent cast
  bars equal to the number of players (`1 player = 1 cast bar`). Reuse existing draw/discard/cast
  conventions where they already answer an engine question; do not invent extra card copies,
  content numbers, or player-only exceptions.
- **Hyper-Inflation Hydra:** its core mechanic is: every 6 seconds, gain `+1` and summon heads equal
  to its current `+1`s. Deck cards (one authored entry each):
  - `Swarm` — summon `floor` heads every 6 seconds.
  - `Regenerate` — heal `floor × 2` every 6 seconds.
  - `Heads Up` — every time Hydra is damaged, summon `floor` heads.
  - `Inflation` — gain `+1` melee, then summon heads equal to Hydra's current `+1`s.
  - `Bite` — deal melee damage equal to `1 + heads in this lane`.
- **Djinn of Deals:** always use four lanes, including solo. Every card Djinn plays also moves Djinn
  to the back of whichever other lane places it behind the most bodies. Deck cards:
  - `Coercion` — summon a `floor × 9` ante foe.
  - `Duplicity` — summon `floor × 3` false Djinn copies. They look like the real body, are defeated
    by one hit, and visually act as though they cast the real Djinn's spells, but their casts have no
    effects.
  - `Scorch` — deal `floor × 3` to each lane.
  - `Tornado` — summon a tornado in the players' lane area. It moves randomly left/right and back
    again, damaging players who enter its lane or remain there for 6 seconds.
  - `Animate Kitchen` — summon `floor × 4` random attackers drawn from the authored assortment:
    5 HP / very slow / 1 damage; medium-paced / 2 damage; and 3 HP / 2 damage / very slow.
- **Kleptomaniac Kraken:** leave its current behavior untouched; Dakota will design it later.
- **Litigation Lich:** retain its stance mechanic, including `1 less from all` and `1 max from all`.
  Replace/update its deck with:
  - `Bone Legjon` — summon `floor × 2` minimum-ante foes.
  - `Power Word: Annihilate` — reduce the highest-HP target to 1 HP.
  - `Eye Beam` — deal `floor × 3` damage to a lane.
  - `Frost Orb` — summon an orb with `floor × 5` HP; it casts Blizzard and has ranged bonus equal
    to the floor.
  - `Life Drain` — deal `floor × 3`; Lich heals that much.

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
- Do not silently fill boss-design gaps. `Bone Legjon` is preserved with Dakota's authored spelling.
  If implementing Tornado movement, false-copy presentation, kitchen attacker pacing, deck cycling,
  or a cast-bar seam requires a gameplay value not specified above and not already defined by an
  existing shared convention, add a `FLAG` at the definition and report it instead of tuning by feel.

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
