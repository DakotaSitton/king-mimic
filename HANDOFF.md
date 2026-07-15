# HANDOFF — King Mimic — 2026-07-14 21:25 CDT

## State

- Repo: `C:\Users\dakot\king-mimic`; branch `feat/room-draft-overhaul`.
- `HEAD` is pushed at `577d13a` (`docs: hand off player archetype analysis`). Runtime code remains
  `004d35b` (`feat: expose combat progress and terminal summon targets`) and is deployed.
- Live Bun PID `14228` owns `:3000`. Cloudflared PID `60348` owns the current quick tunnel:
  **https://enhanced-philadelphia-refurbished-matters.trycloudflare.com**.
  Local and public roots were rechecked HTTP 200 and byte-identical at this handoff.
- Preserve all existing untracked owner/tooling files. Nothing is partially edited or staged.
- The previous read-only archetype analysis is complete. Strongest observed human patterns are
  cheap ranged tempo/control and Royal Rat summon swarm, with body swaps used as chassis upgrades
  for an already-coherent engine. No balance or runtime files changed during that analysis.
- The owner has now identified the next product defect: cards still do not communicate their
  scaling and numeric outcomes clearly enough at first glance, especially on the iPhone combat hand.
- A partial semantic foundation already exists:
  - `engine/cards.js` derives `cardDealInfo`, `cardDmgLabel`, and `cardLiveDmg` from card ops.
  - `engine/snapshot.js` sends damage/kind fields to the client.
  - `public/client.js::drawHotbar` paints a small top-right sword/target glyph and one live headline.
  - This is insufficient. The kind glyph is too easy to miss, several non-damage/compound effects
    are reduced to only their first op, and most DOM card surfaces still show only prose.
- Concrete failure: Heart Guard is mechanically `shield 2` plus `heal 2`, but `cardDealInfo` returns
  the first shield op and stops. Its initial-glance summary must show both outcomes, e.g.
  **`🛡 2  ♥ 2`**, not merely a prose sentence or one shield headline.

## Next Step — exhaustive card readability and wording pass

Implement and deploy one coherent player-facing card-language pass across all 81 collectible cards.
Do the implementation, verification, commit, push, and Bun-only deployment; do not stop at an audit.

Acceptance criteria:

1. **Scaling is unmistakable at first glance.** Every card whose effect is melee-scaled,
   ranged-scaled, or scales from both must carry a prominent, consistently placed `MELEE`, `RANGED`,
   or `BOTH` treatment on the card face. Do not rely on the current tiny corner glyph, color alone,
   hover, or press-and-hold. Preserve engine truth:
   - Bow, Javelin, and Repeating Crossbow are aimed but scale from **melee**.
   - Moonlight Greatsword and Rainblow Blade use **both** bonuses where authored.
   - Force is the intentional ranged-scaling shield.
   - Crystal Ball is ranged by owner fiat.
   - Pure self/ally utility cards must not be falsely presented as melee/ranged merely to fill space.
     If a neutral label is needed to prevent ambiguity, use a truthful consistent treatment.

2. **Immediate numeric outcomes are visual, not buried in prose.** Generalize the op-derived summary
   so compound cards can show every important immediate number. Heart Guard must visibly show
   `🛡 2  ♥ 2`. Apply the same grammar to attacks, multi-hit attacks, heals, shields, summons, and
   other safely derivable primary outcomes. Live damage must remain truthful under melee/ranged
   bonuses. Do not hand-maintain a second table that can drift from `KIT[*].ops`.

3. **Clean up all player-facing card wording.** Audit every collectible card in `engine/kit.js` for
   concise, consistent grammar and exact agreement with its existing mechanics. Make melee/ranged
   scaling, target scope, cadence, duration, and multi-hit behavior explicit where applicable.
   This is a copy/legibility pass, not permission to redesign effects, costs, values, targets, or
   balance. Preserve owner-authored oddities and flag true ambiguity instead of inventing mechanics.

4. **One vocabulary across every card surface.** The same semantic summary and kind treatment must
   appear in the combat hotbar, desktop card/tooltip, draft offers, deck/backpack builder, shop,
   rewards/loot, and deck peek. Avoid separate ad-hoc render rules that disagree.

5. **Exhaustive regression coverage.** Add data-driven tests proving every collectible card has a
   valid first-glance descriptor and that the descriptor agrees with its ops/kind. Include focused
   contracts for Heart Guard, aimed-melee cards, ordinary melee, ordinary ranged, both-kind cards,
   ranged Force, multi-hit, and typeless utility.

6. **Rendered proof is mandatory.** Add or update a tracked scenario that places representative
   melee, ranged, both-kind, and compound utility cards in the real touch hand at the canonical
   **852×393 CSS px, DPR 3, landscape** profile. Inspect the actual PNGs. Then run a fresh canonical
   `node tools/shoot.mjs` real game and inspect real frames; fixtures or tests alone are not proof.
   Require zero JS/page/HTTP/art errors and no clipped or unreadable labels.

7. **Release seam.** Run the deterministic suites, explicitly stage only intended tracked files,
   commit, and push. Before deployment check live sockets/players. Bounce **only Bun** so the current
   Cloudflare hostname survives; verify local/public HTTP 200 and byte-identical served assets.

## Active Decisions

- This task improves communication of existing mechanics. It must not rebalance or invent content.
- A card's targeting shape and its scaling source are different facts. An aimed card can still be
  melee-scaled; derive the displayed claim from combat semantics, not from visual intuition.
- The compact first-glance summary supplements cleaned prose; it does not remove access to complete
  rules text via normal desktop/touch reading.
- Card design/content remains Dakota's. Engineering may standardize representation and wording only
  to the extent needed to state the already-authored effect faithfully.
- Cool Shoes' machine-gun loop remains intentional. Crystal Ball and Force keep their owner-defined
  ranged exceptions.

## Landmines

- Never deploy server and client independently. Push first, then replace only Bun. Restarting or
  killing cloudflared rotates the playtest URL.
- Do not kill a process based on a frozen UI, stale transcript, or inferred liveness. Inspect child
  processes, listening ports, and live sockets before touching it.
- Do not stage, delete, or rewrite unrelated untracked owner files, including `nul`, design notes,
  scratchpad, probe scripts, tier-sim output, or tunnel logs. Never use `git add -A`.
- `public/client.js` already claims its small glyph is “always at a glance”; the owner's fresh report
  overrides that comment. Validate what is actually visible on the rendered phone card.
- `cardDealInfo` currently chooses only the first matching primary op. Expanding it must retain live
  values for shield-derived, ally-derived, multi-hit, nested-timer, and both-kind damage without
  changing combat resolution.
- Desktop emulation does not prove Safari safe-area/notch behavior, but it is still the required
  repeatable regression profile before the owner's physical-phone glance.
- Open balance/product rulings remain out of scope: anti-stall valve, first-room elites, boss court
  size, Acid Rain wording/mechanics mismatch, and provisional 1–5 card values.

## Pointers

- Read first: `CLAUDE.md` (verification bar, harness traps, design boundary).
- Card truth/copy: `engine/kit.js`.
- Semantic summaries/live numbers: `engine/cards.js` (`cardDealInfo`, `cardDmgLabel`, `cardLiveDmg`).
- Snapshot contract: `engine/snapshot.js` (hand around lines 873–896; generic descriptor near 329).
- Canvas combat cards and shared DOM tiles: `public/client.js` (`cardTile`, `drawCardText`,
  `drawHotbar`, card tips).
- Deck peek: `public/inventory.js` (`KIND_ICON`, `renderDeck`).
- Focused starting scenario: `tools/scenarios/card-hold-info.json` already places Heart Guard, Bow,
  and Ice in the touch hand; extend or replace it with an exhaustive representative proof.
- Tests: `test/game.test.js`; add data-driven semantic and snapshot contracts there or in the
  narrowest existing suite.
- Core verification: `bun run test/game.test.js`; `bun run test/squad.test.js`;
  `bun run test/telemetry.test.js`; `bun run test/fuzz.js`.
- Serve verification: start a throwaway Bun server on a non-3000 port, then run
  `BASE=http://localhost:<port> bun run test/serve.test.js`.
- Real mobile: `node tools/shoot.mjs`.
- Scenario: `node tools/scenario-shot.mjs tools/scenarios/<card-readability>.json`.
