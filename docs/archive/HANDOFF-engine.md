# HANDOFF — Engine slice (combat logging + deck-seeding) — 2026-06-25

> Covers the game.js/server.js work from the 2026-06-25 session: full-run combat logging (agent),
> and the deck-seeding elimination (coordinator). The rendering/UI slice is in `tools/HANDOFF-rendering.md`.
> Canonical `HANDOFF.md` is STALE (5:24 PM, pre-dates all of today) — consolidate via /handoff next.

## 1. Full-run combat logging — DONE (server.js + tests; game.js untouched)
- **What:** every combat of a run now flushes to disk — WIN or LOSS, every floor — not just the final loss.
- **Where:** `combatlogs/run-<ISO-ts>-<ROOMCODE>.log` is the canonical per-run record (one file = one run, every
  combat top-to-bottom). The legacy `combatlog.txt` is KEPT as a rolling global tail (appended, never deleted).
  `combatlogs/*.log` is covered by the existing `.gitignore` `*.log` rule — no git pollution.
- **How (server.js):** new `persistCombat(room, result)` builds a section (header + full `room.combatLog`) and
  appends it. `onPhaseChange` calls it on the `playing → won|lost` seam (the existing telemetry seam) and mints a
  fresh `room._runId` on `→ draft`. `serverTick(room)` was extracted + exported (behind an `import.meta.main`
  guard so importing the module doesn't bind :3000); the old loss-only file dump was removed.
- **Why lossless / exactly-once:** `beginCombat` (game.js:1878) is the sole `phase="playing"` entry and already
  clears `combatLog` + re-arms `_endLogged`/`_fileLogged` each fight, so the 1500-line cap only ever spans the
  CURRENT combat, and each section is complete on disk before the next clears the buffer. The seam fires
  `persistCombat` once per combat.
- **Client streaming intact:** `snapshot.combatLog` + the death-screen panel are untouched.
- **Proof:** a real WON/WON/LOST run wrote one 3-section file; harness in scratchpad `_combatlogproof.mjs`.
- **Tests:** `bun test` was 554 game / 18 serve / 23 squad after this (551 originals intact + 3 new).

## 2. Deck-seeding ELIMINATED — DONE (game.js `deckKeys`, ~line 472)
- **The bug:** `deckKeys` filters the deck through `isCard()`, which strips worn passives like `coolShoes`. A deck
  holding Cool Shoes therefore counted as < MIN_DECK *castable* cards, and the old code padded the gap from
  `STARTER_DECK` → injected `oSword`/`oHatchet`/etc. the player never chose. This forced Swords into a real run
  and cost the owner a game.
- **The fix:** removed the pad-to-MIN_DECK loop entirely. `deckKeys` now returns EXACTLY the player's chosen
  castable cards (`deckList.filter(isCard)`); never padded/topped-up/substituted. The 10-card minimum stays a
  DECK-BUILDER planning floor (the absolute floors in the builder ops, game.js ~1725/1761), NOT a combat-time
  auto-fill.
- **Regression test added** (test/game.test.js, "NO SEEDING" block): a deckList with `coolShoes` returns 9 castable
  cards, nothing outside `deckList` is injected, `coolShoes` is never drawable.

## 3. OPEN for owner — "eliminate ALL seeding?" scope
The owner said "eliminate all card seeding." I removed the only one that injected *unchosen* cards (the pad).
These remain, each a deliberate acquisition path — confirm if you want them gone too:
- **Empty-`deckList` → whole `STARTER_DECK` fallback** (deckKeys ~474). Removing it leaves a deckless player with
  ZERO combat cards (unplayable). Kept as the last safety net.
- **Per-body RANDOM starter deck** (game.js ~1929) — how a body gets a starting deck.
- **Class-bundle seed** (game.js ~2017) — how a drafted player gets backpack + deckList.
- **Deeper root cause (not yet fixed):** should `coolShoes` (a worn passive) be allowed into `deckList` at all? If
  worn passives lived in a separate slot, they'd never dilute the castable count. Bigger change — flagged.
- **Not done:** logging the deck composition per combat (was proposed; dropped to keep scope). Easy follow-up.

## Resume / verify
- `bun test` (game + serve) must be green. Live server on :3000 serves this tree; client changes need a browser refresh.
- Real combat logs: `combatlogs/`. Real-render screenshots + harness: see `tools/HANDOFF-rendering.md`.
- NEVER `rm`/`Remove-Item` (owner guardrail). The untracked `content-{tank,summon,misc}.js` stay unmerged.
