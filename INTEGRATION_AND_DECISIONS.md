# INTEGRATION + DECISIONS — King Mimic mega-batch (2026-07-10)

> Both waves built + individually verified (each: game.test ALL PASS, squad 22, fuzz 60). NOTHING merged/
> pushed/deployed. Integration = a multi-base merge onto `feat/room-draft-overhaul`, then ONE `:3000`
> restart (only when the Kentucky friend is disconnected). This file is the single source of truth for
> the merge. Live `:3000` is still engine `8cc172a`; feat HEAD = `e472896`.

## FULL BRANCH LEDGER (integration order top→bottom)
ENGINE (need restart to deploy):
| # | task | commit | base | branch | note |
|---|---|---|---|---|---|
| 1 | A melee-breach | `2aa56ce` | 8cc172a | worktree-agent-a4b2c5c74f8ad985c | |
| 2 | belt (C bugfix + nerf) | `096ff5b` | 3fe6c7f←8cc172a | worktree-agent-a2525bcb57de1e140 | **supersedes raw C `3fe6c7f`** |
| 3 | B foe-ranged | `acb8b25` | 8cc172a | worktree-agent-a55017aac4404eed0 | also edits test block B + snapshot.js |
| 4 | G summon/pin/backtick | `e86fd72` | b602fc0 | worktree-agent-acfdafe50fafa6b75 | |
| 5 | R1 Anubis + summon-fix | `82499c8` | 5456d57←e472896 | worktree-agent-ac3da8188210f534d | **supersedes raw Anubis `5456d57`** |
| 6 | Jaw card | `8e6e6a3` | e472896 | worktree-agent-a95b463df32c74798 | |
| 7 | R2 cost+1 / Black Hole | `9716e5b` | e472896 | worktree-agent-a2e4e4a4352d23372 | trunk for all W2 |
| 8 | W2-A pierce melee ×4 | `15b8ee9` | 9716e5b | worktree-agent-a16f82562f16ba808 | |
| 9 | W2-B special shields ×2 | `1dde672` | 9716e5b | worktree-agent-aaaf5afcd0f87f963 | |
| 10 | W2-C foe control ×2 | `7a63dce` | 9716e5b | worktree-agent-a3383328ee4cad4bf | |
| 11 | W2-D reposition/periodic/delayed ×3 | `d778ddb` | 9716e5b | worktree-agent-a5a13f82c8cd87415 | |
| 12 | W2-E existing-card edits ×5 | `cc6999b` | 9716e5b | worktree-agent-a1ad1e6975babb3e0 | |
| 13 | R3 universal cooldown (EXPERIMENTAL) | `a119dac` | e472896 | worktree-agent-a503c3a390c245634 | |
| 14 | R4 level-up type choice | `aef459c` | e472896 | worktree-agent-a76482995154ce7d0 | engine+client |

CLIENT (hard-refresh, no restart):
| card-icons | `3d40b27` | e472896 | worktree-agent-ae4e494dd2c3ce6d3 | **owner sign-off (glyphs)** |
| R5 always-show bonuses | `2306d56` | e472896 | worktree-agent-aebd6127129a251fc | **owner sign-off (look)** |
| R6 read-body ⓘ | `def651b` | e472896 | worktree-agent-a2c9b988964619108 | ready |

REPORT: R7 UI-dead-code audit — no branch; owner greenlights the HIGH-confidence set (~90 lines) → follow-up agent removes.

## MERGE MECHANICS
- Order above is base-oldest→newest; W2-A..E are R2-descended so they stack near-linearly once R2 is in.
- HOTSPOT files (expect 3-way conflicts, resolve KEEPING ALL): `engine/combat.js` (nearly every branch),
  `test/game.test.js` (all append + PLAYER_POOL count), `engine/kit.js` (R2 + W2-A..E), `engine/cards.js`
  (R2 + W2 pool regs), `engine/snapshot.js` (B, R2, W2-D, W2-E), `engine/lobby.js` (R1, R4, R3, belt, W2-B, W2-D, W2-E),
  `public/client.js` (R4, W2-E, + 3 client branches).
- **PLAYER_POOL count**: base 69 + 11 new cards (A:4, B:2, C:2, D:3, E:0) = **80**. Each W2 agent set its own
  interim count (71/71/72/73) — reconcile the single assertion in test/game.test.js to 80.
- After merge: full bar (game ALL PASS, squad 22, fuzz 60, serve/telemetry on a THROWAWAY port), then `node
  tools/shoot.mjs` (JS errors 0). THEN commit+push. THEN one `:3000` restart (friend disconnected).
- 11 new cards + Demon Form/Sage/etc. edited → after restart, do a real shoot.mjs / playtest pass.

## DECISIONS FOR OWNER (nothing blocks — all built on FLAGged defaults; rulings just retune before merge)

### A. New-card costs (proposed — confirm or retune)
Butterfly 3 · Mirror 5 · Meteor 7 · Triblade 4 · Punishment Glutton 4 · Swords of Revealing Light 3 ·
Banshee Wail 4 · Za Warudo 6 · Gravity Greatsword 6 · Crimson Crown 6 · Starblade 4. (All post-R2 regime.)
Also: **Black Hole damage = proposed 10** (was 8; now board-wide at cost 10).

### B. Design forks (change gameplay feel)
1. **Sage Mode** — built cost **5** (net +2: R2's global +1 + your explicit +1). Want +1 TOTAL (cost 4) instead?
2. **Demon Form** — adding the 1-dmg/6s tick reclassifies it to **ranged-typed** (🎯 badge, ranged play-triggers,
   Lizard-Wizard pricing) per the engine's "touches a foe ⇒ typed" rule. Keep typed, or keep it typeless
   (needs a different damage mechanism)?
3. **Giant's Belt** — nerf = no compounding + no longer scales off buffed HP, but **first cast on an unbuffed
   body is still ~2× base** (10→20). Want the first cast itself weaker (e.g. +½ base)?
4. **Crimson Crown** — built as a CARD w/ this-fight passive. Want it a worn body/crown instead?
5. **Za Warudo** duration **5s**, **Banshee** **6s** (timed, matches Slow/Weakness). OK?
6. **Swords of Revealing Light** overflow = pass-through-to-HP (shield loses 1/hit, rest continues). vs block?

### C. Player/foe symmetry gaps (rule: wire foe-side or leave)
- **Pierce** (Butterfly/Mirror/Meteor) is hero→foe only — a FOE casting one deals NORMAL damage (no crash).
  Foe-side wiring = ~5 more functions.
- **Gravity Greatsword pull** is hero-side only (Taunt shares this gap) — a FOE deals 5 but doesn't reposition.

### D. Experimental
- **R3 cooldown (1s)** aligns with moxie-regen period, so it mainly throttles **bonus-moxie bursts** — which
  bites the **Cool Shoes machine-gun loop** (your protected "let it happen"). Keep / exempt Cool Shoes / revert?

### E. Client sign-offs
- **R5** always-show bonuses: currently shows `🗡🎯0` at zero on every player token. Keep / local-player-only / hide-at-zero?
- **card-icons**: the 75 placeholder glyphs + watermark alpha are your art pass.

### F. Cleanup
- **R7** dead-UI removal: greenlight the HIGH-confidence set (~90 lines: `roomVoteHtml`/`advBtns`/`roomAnteLabel` +
  `.km-kit-*`/`.km-loadout` blocks + orphan CSS + `#banner`)? Follow-up agent removes + re-verifies.

### G. Low-stakes (fine on default unless you object)
- R1 Anubis also counts AoE-killed ally rats (`foeHitLaneAll`) — kept for symmetry.
- Za Warudo doesn't freeze enemy *mixed* passives (hourglass summon/heal bundled with an attack).
- Starblade "+10 moxie" = a full refill (MOXIE_CAP 10).
- Crimson Crown timer chip cosmetically mislabels as "Strike".
- Duel Wielding reuses Neptune's replay path; both now key on ≥6 melee (they stack if you run both).
