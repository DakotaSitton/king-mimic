# HANDOFF — King Mimic — 2026-07-16 15:58 CDT

## State

- Remote branch `feat/room-draft-overhaul` is at verified runtime/deployment commit **`67212ac`**;
  this handoff is the following documentation commit. Checkout:
  `C:\Users\dakot\king-mimic`.
- **Public production is deployed on Railway:**
  **https://king-mimic-production.up.railway.app**. Railway project `8498af62-f404-4661-ae04-6442e9921943`,
  service `4ddfd526-e710-429b-b7d1-0f61e2951a33`, environment
  `69ce51ab-225f-4c80-af2f-c7dda7f6445d`. The current rollout serves `67212ac`. It builds the
  repo `Dockerfile` with Bun 1.3.14,
  tracks `feat/room-draft-overhaul`, uses Railway's injected `PORT=8080`, and checks `/health`.
- Production telemetry and combat logs use `KM_DATA_DIR=/var/data`, backed by attached persistent
  volume `king-mimic-volume` mounted at `/var/data`. The server's data-path behavior also passed a
  local isolated persistence probe. Do not remove the volume or the variable during redeploys.
- Railway rolled out `67212ac` from the tracked branch. Hosted verification after rollout:
  `/health` returned HTTP 200 with `{"ok":true}`, the served client contained the player-sized summon
  layout, and the complete remote serve suite passed **41/0** across HTTP and WebSocket behavior.
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
- Production telemetry on 2026-07-16 contained **1,250 events**, of which **1,240** were non-harness
  and non-bot, spanning **64 run IDs**, **57** runs that reached combat, **50** completed runs, and
  **132 combats**. Production HTTP logs showed genuine Android Chrome, multiple iPhone Safari,
  Windows, and Linux/X11 browser signatures across different networks; preview bots were excluded.
  Unless Dakota personally used every one of those devices, **other people have played King Mimic**.
  Telemetry still lacks a privacy-safe anonymous install/session ID, so exact player ownership is an
  inference; never expose raw IP addresses.
- The likely Dakota sessions are the iPhone-heavy `p19`, `p28`, and `p34` clusters. The clearest full
  run was Fundjin: **19-0**, floor 4, Kraken/Lich/King Mimic all defeated in about 10.7 minutes.
  The latest deep Atlas run was **11-1**, with Kraken defeated and Hydra the loss. Across the likely
  clusters Dakota went about **57-19** in combat. The current shape is spiky room-one/two variance
  and frequent restarts, followed by a very strong snowball once a build stabilizes.
- The requested archetype/mechanics pass is live in `67212ac`:
  - Starter bundles now use the live melee/ranged archetype model instead of the retired
    physical/magical school test. Four of five starter pairs are guaranteed archetype-fit and one
    pair remains deliberately wild.
  - Moonlight Greatsword and Rainblow Blade are statically **melee + ranged** for bonuses, discounts,
    and trigger families while retaining their authored front/lane targeting instead of becoming
    reticle cards.
  - Pet Leech snapshots `1 + ranged bonus` at cast and uses that same amount for both periodic damage
    and healing, symmetrically for players and foes. Stacked chips report the true summed magnitude.
  - Small summon groups render on the same depth line and at the same information scale as players:
    up to two summons on mobile and four on desktop; genuine swarms/crowds still collapse to the
    compact token treatment.
  - Foes whose passives can otherwise roll blank receive at most one same-value synergy replacement:
    Lizard Wizard/ranged, Penny-Pinching Pixie/melee, Depression Demon/debuff, Neptune/5+ cost,
    Audit Angel/non-damage, Bribed Bishop/heal, Sphinx/ranged damage, Wandering Castle/5+ cost, and
    Rent-Seeking Runeblade/melee+ranged. Card count, ante, first damaging slot, rich upgrades, and
    Djinn Coercion's exact ante remain intact.
- Comparative simulation evidence, not autonomous tuning:
  - The isolated paired matrix used the same balanced ten-card deck and room seeds for every body:
    **34 bodies × 1,000 first combats = 34,000 fights**.
  - Clear high outliers were Affluence Anubis **98.4%** and Fundjin **90.0%**. The next cluster was
    Bond Behemoth **80.6%**, Debt Dragon **79.9%**, Royal Rat **78.0%**, Atlas **76.1%**, and Sphinx
    **75.8%**.
  - Clear low outliers were Warewolf **15.0%**, Neptune **22.0%**, Audit Angel **22.7%**, Bribed Bishop
    **28.4%**, Penny-Pinching Pixie **28.5%**, Centless Centaur **30.9%**, and Bookie Bonelord **32.9%**.
    Wandering Castle, Toll Troll, Sphinx, Atlas, Golden Golem, and Fat Cat also produced notable stalls.
  - The broader starter-bundle sim improved Lizard Wizard roughly **13%→26%**, Depression Demon
    **20%→27%**, Warewolf **29%→35%**, and Medusa **35%→40%**, but it also includes the stronger
    synergy-seeded foes. No body numbers were changed; these results are a candidate owner queue.
- Do **not** blindly retune Litigation Lich or Djinn of Deals from the automated boss policy. Dakota
  already defeated Lich manually in the full Fundjin win, while the naive/tactical bots still scored
  0%, proving the result is highly policy-sensitive. There is almost no genuine Djinn telemetry yet.
  Hydra is the current observed wall in Dakota's latest run and deserves the next manual scenario
  review before Lich/Djinn number changes.
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
- Verification at runtime commit `8fff3b3`: game **2231/0**, squad **28/0**, telemetry **69/0**,
  fuzz **60/60** full runs with no invariant failures, and local serve **36/0**. The corrected-state
  real 852×393 touch run at `tools/shots/real-mobile-2026-07-16T05-46-39` traversed draft through
  three real combats and a loss in 65 frames with **0 JS errors**, 0 404s, and no missing art. The
  two-client run at `tools/shots/mp-2026-07-16T05-48-33` won both games, passed all room vote/lock
  progression checks, and had **0 JS errors**. Representative combat and co-op result frames were
  visually inspected. The post-rollout public serve suite also passed **36/0**.
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
  each roll five distinct V1 cards ×2 from the same 20-card V1 pool, now with four archetype-fit
  pairs and one deliberate wild pair.
- **The owner-authored body/boss pass is implemented, verified, pushed, and live in `8fff3b3`.**
  Body changes offer every legal nonnegative integer melee/ranged split whose sum is the unchanged
  `levelCombatBonus(runLevel)`; the server validates it atomically and body changes never rewrite the
  deck or backpack. Hydra, Djinn, and Litigation Lich now draw/discard their exact authored decks with
  one concurrent cast bar per player while retaining existing boss HP scaling. Djinn always uses four
  lanes; false copies mirror real cast bars but resolve no effects; Tornado deals current-floor damage;
  the medium Kitchen attacker is exact 2 HP / 2 damage. Kraken is unchanged.
- Exact owner-card regressions cover Hydra core and recurring effects, Djinn Coercion at ante 9/18/27,
  Duplicity synchronization/no-op casts, Scorch, Tornado entry/stay damage, all Kitchen bodies, both
  Lich stances, and all five updated Lich cards. Snapshot/client state exposes boss draw/discard counts,
  every active cast bar, Hydra's persistent six-second effects, and Tornado lane/damage truth.
- Remaining explicit `FLAG`s: Hydra/Lich/Djinn deck cadence reuses their prior primary clock values;
  Tornado movement reuses the shared six-second interval; Kitchen `very slow`/`medium` map to the
  existing 6s/4s token conventions. These are implementation mappings, not telemetry-derived tuning.
- Verification at runtime commit `67212ac`: game **2265/0**, squad **28/0**, telemetry **69/0**,
  fuzz **60/60**, local serve **41/0**, public serve **41/0**, and **15,000** exact-ante Coercion
  generation probes with no ante/synergy failure. The real 852×393 DPR3 touch run at
  `tools/shots/real-mobile-2026-07-16T20-53-25` traversed draft and two real combats in 48 frames with
  **0 JS errors**, 0 404s, and no missing art. The targeted live scenario at
  `tools/shots/real-summon-layout-2026-07-16T20-53-05` proved front/hero/back depths
  `-0.5 / 0 / +0.5`, full summon information panels, and **0** browser/HTTP errors.

## Next Step

Use `67212ac` as the verified base. The next balance decision should be owner-led manual play around
Hydra and the isolated body outliers, starting with the Anubis/Fundjin ceiling and the
Warewolf/Neptune/Audit floor. Collect real Djinn outcomes before changing it; Lich is already proven
manually beatable. Leave Kleptomaniac Kraken unchanged until Dakota authors it. Continue using
telemetry and simulations as evidence for questions, never as authority to change values.

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
- **Body-change allocation ruling (Dakota, 2026-07-15):** `levelCombatBonus(runLevel)` remains the
  fixed total grant. On body swap the player may allocate that total between `levelMelee` and
  `levelRanged` in any nonnegative integer split. The server validates the sum; changing bodies never
  creates extra power and does not rewrite the player's cards.
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
    again, dealing `floor` damage to players who enter its lane or remain there for 6 seconds.
  - `Animate Kitchen` — summon `floor × 4` random attackers drawn from the authored assortment:
    5 HP / very slow / 1 damage; 2 HP / medium-paced / 2 damage; and 3 HP / 2 damage / very slow.
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
