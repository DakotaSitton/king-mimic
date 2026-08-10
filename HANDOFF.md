# HANDOFF — King Mimic — 2026-08-09 20:16 CDT

## 2026-08-09 — LIGHT ROUND-UP + CYCLOPS RULE REMOVAL + ROYAL RAT FRIEND RUN REVIEW (LIVE at production tip `c7904f2`)

Owner resumed the Aug-6 balance thread with two final defaults and asked for a production review of
his friend's winning Royal Rat run. The implementation was based on the latest repo tip `250300a`,
not the older thread snapshot.

- **Light rounds up (`91be505` + UI `918647e`).** `scaleCardStatBonus` now uses
  `Math.ceil(amount / 2)` for Light cards, so an odd +1 typed melee/ranged stat contributes +1.
  Heavy remains double; generic +damage remains literal. The single shared helper covers every
  current/future card carrying the data-authored Light tag. The card legend now says “half
  melee/ranged stat scaling, rounded up,” with a served-client pin.
- **Credit-Cursed Cyclops's dedicated ranged ban is removed (`91be505`).** Base/ranked prose and
  `foeCardAllowed` no longer forbid ranged or dual-kind cards; direct/injected foe loadouts preserve
  both. Intentional boundary: Cyclops remains the ordinary **melee archetype**, so organic rolls can
  now include dual-kind cards but pure-ranged organic cards still follow the generic melee fit
  filter. It was not reclassified to flex, and its level-stat allocation did not change.
- **Friend run reviewed, no speculative nerf shipped (`c7904f2`, full artifact
  `ROYAL_RAT_RUN_REVIEW_2026-08-09.md`).** Canonical Railway run
  `run-2026-08-08T23-49-12-572Z-WJK7` was an unambiguous genuine-human `Booopppp` solo Royal Rat
  win, 19/19 fights. “Barely touched the deck by floor 2” is false as literal input volume
  (32 successful cards on F1, 34 on F2) but correct as damage agency: summons rose from 77/98
  effective HP damage (78.6%) on F1 to 142/150 (94.7%) on F2; the run ended at 698/744 (93.8%)
  summon damage and summons landed 18/19 lethals. Floor 2 logged 60 summon actions versus 34 manual
  card casts. `handLockedTicks` was audited before interpretation: it means **no held card
  affordable**, not animation/UI lock. Divine Treasure had zero F2 casts, so it did not cause the
  reported inflection. Open owner question, not silently answered: should Mastered Royal Rat
  intentionally turn most cards into swarm fuel? The report ranks experiments if the answer is no.
- **Verification:** core 4070/0; onboarding 202/0; expansion 326; art 289/0; animation 3/0;
  combat-graphics 19/0; passives 462/0; party 260/0; telemetry 128/0; fuzz 60/60; symmetry 34/0;
  public-entry 24/0; persistence 87/0; telemetry-report 15/0; owner-lab 13/0; admission 13/0;
  name-safety 10/0; serve 117/0; mobile-map clean. CI `31346576194` green. Fresh local
  `NODES=2 shoot.mjs` exit 0 / JS 0, combat frame inspected
  (`tools/shots/real-mobile-2026-08-10T01-13-12`). Railway marker-verified via the served rounded-up
  Light copy; production `NODES=2 BUDGET=90 shoot.mjs` cleared two nodes, exit 0 / JS 0 / no missing
  art or 404s, and the production combat frame was inspected for hero, foe, hand, and HUD
  (`tools/shots/real-mobile-2026-08-10T01-15-38`).

## 2026-08-08 — LAG ROOT-CAUSED + FIXED: ~10fps combat animation ceiling (LIVE at production tip `b764c80`)
Owner reported King Mimic lagging in real play (the parallel thread flagged in the 2026-08-07 entry).
PROFILED before blaming — real solo + party-4 runs on the owner's phone profile (852×393@3 touch) via
`tools/zz-perf-probe.mjs` (untracked, zz- by design; reusable before/after instrument):
- **NOT the FX_SLOW cap raise, NOT render cost.** Per-frame `render()` = 3ms solo / 6ms party-4 and FLAT
  vs active-fx count (8ms fx-high vs 9.6ms fx-low); fx peaked at 20, cap is 63. Delta apply ~0ms.
  Server: ZERO event-loop stalls even at a 200ms threshold (disk queue already async since 2026-07-24);
  the 250–580ms snapshot gaps were client-main-thread + prober churn, not the server.
- **ROOT CAUSE: the game rendered at ~8–10fps during combat.** `render()` is event-driven — it fired only
  on the 10Hz server snapshot (plus the self-terminating `_twNeed` glide rAF, which rarely engages
  because bodies are ~stationary in card-combat). Cast-fx flights, damage floaters, and edge flashes
  animate but NEVER requested a continuation frame, so they played back at the snapshot rate. The
  2026-08-07 readability pass did NOT cause it; its slower/larger/longer-lived fx made the pre-existing
  choppiness unmistakable (a 1.5s projectile at 10fps shows every step; the old 0.9s flash hid it).
- **FIX (`b764c80`, `public/client.js`, render-lane, no design number moved):** ① `_renderFrame`'s tail
  now sustains the rAF at display refresh while `_castFxActive || _floaters || _fxEdge` is non-empty
  (each pool pruned just above → reads live state, idles the instant the last fx expires; no rAF spin on
  a static board). ② floaters re-clocked from `state.tick` to `performance.now()` (`FCT_LIFE` ticks →
  `FCT_LIFE_MS = round(9*FX_SLOW)*100` ≈ 1.6s, identical duration) — they were tick-clocked, so even at
  60fps they'd have kept stepping at 10Hz.
- **MEASURED after:** combat fps median 8.4→60.8 (party-4), 9.7→39.2 (solo — lower ONLY because solo
  often has no fx, so the loop correctly idles at snapshot rate in the gaps); render cost unchanged
  (p90 11.7ms, under the 16ms budget); renderErrors 0; loop self-terminates in lulls (min fps 5–7 → no
  battery/thermal cost on a quiet board).
- **VERIFIED:** serve 116/0, combat-graphics 19/0, card-animation 3/0 (140 cast-probed); LOCAL solo +
  party-4 `shoot.mjs` exit 0 / JS 0. PRODUCTION GATE PASSED: served build carries `_fxAnimating` +
  `FCT_LIFE_MS`×3, `BASE=…railway.app NODES=2 BUDGET=90 node tools/shoot.mjs` exit 0 / JS 0 / no
  404s/missing art, combat frame visually inspected (hero + seat border + live −3 floater, foe card,
  hand, HUD all clean); artifacts `tools/shots/real-mobile-2026-08-08T18-55-35`.
- CAVEAT: a screenshot can't prove *smoothness* — the fps numbers are the quantitative proof; the visual
  gate proves correctness + zero errors on the served build.

## 2026-08-07 — READABILITY PASS + SEAT-DROP TELEMETRY (LIVE at production tip `80b4cc2`)
Pushed + Railway-deployed 2026-08-07 ~19:40 CDT; production gate GREEN on the SERVED build
(`BASE=…railway.app NODES=2 BUDGET=90 node tools/shoot.mjs` exit 0, JS errors 0, full lifecycle
draft→won→setup→playing, hitboxes non-empty; combat frame visually inspected — hero row with seat
border AND a live floating −3, foe card, hand, HUD; artifacts
`tools/shots/real-mobile-2026-08-08T00-39-22`). CI `31230664116` green.
- **`80b4cc2` client readability pass** (owner asks 2026-08-07, all four): ① floating damage numbers
  now cover shield-ABSORBED hits (blue −N 🛡) and KILLING blows (red −N ☠ at the victim's last
  anchor) — the two cases that previously printed nothing — sizes 14–34px, life ~1.6s; ② the combat
  log panel opens after EVERY fight (win = "Victory — Floor N" + ▶ Continue, client-local dismiss —
  no server gate, co-op can't strand; permanent scenario `victory-log-screen.json`); ③ `FX_SLOW=1.75`
  (client.js, FLAGged) scales every cast/path/overlay/edge-flash/floater duration; ④ seat colors:
  `PLAYER_COLORS` closed palette + `setPlayerColor` (engine/lobby.js, first-come unique per human
  seat), snapshot ships palette + owner-resolved `color` per body, draft "YOUR COLOR" picker,
  2.5px identity border in `drawHeroCompact`; companions inherit; persists via run-persistence.
  `shoot.mjs` picks a color each run. Tests: `test/player-colors.test.js` (in CI).
  FLAG for owner: palette hexes are placeholder-mine; palette red ≈ incoming-attack red flash.
- **`f571e3d` seat-drop telemetry** (from the Railway 4p run review): `seat_hold`/`seat_reconnect`
  (awayMs)/`seat_leave` events at the server hold/reclaim/leave seams; `offline` flag on
  `combat_start`+`room_result` players; SEAT AVAILABILITY section + REAL in-game names (keys like
  `juggernaut` no longer printed) in `telemetry-report.js`. Review deliverable:
  `RAILWAY_RUN_REVIEW_2026-08-07.md` (loss mechanism: foe budget reads raw `players.size`,
  lobby.js:490 — rescale is HIS call, options ranked in the doc).
- **LIVE PARALLEL THREAD — RESOLVED 2026-08-08 (see the top entry).** The lag was the ~10fps combat
  animation ceiling, NOT the FX_SLOW cap raise (measured: render cost flat vs fx count, fx never near
  the 63 cap). Fixed in `b764c80` by sustaining the render rAF while fx are live + re-clocking floaters
  to wall-clock. The measured suspect (`CAST_FX_ACTIVE_MAX` 36→63) was exonerated on CPU but did make
  the pre-existing choppiness visible via slower/longer fx.
- **OPEN — owner design calls (do NOT resolve unprompted):** foe-budget rescale on seat-drop
  (lobby.js:490); KO cost; `PLAYER_COLORS` palette hexes (placeholder-mine; palette red ≈
  incoming-attack flash red).

<!-- ──────────────────────────────────────────────────────────────────────────────
     COLD-START BLOCK (2026-07-26). Read this, then the dated entries below
     (newest-first) down through the 2026-07-01 CURRENT STATE banner; entries below
     that banner are superseded. This block holds only what does NOT survive in git.
     ────────────────────────────────────────────────────────────────────────────── -->

## COLD START — read first

**Verified working** (CARD balance pass + owner flag rulings live at production tip `317376f`, pushed +
Railway-deployed 2026-08-06; rollout marker-verified [live Piercer "Deal 11", archived cards absent] AND
production `shoot.mjs` gate GREEN [draft→setup→playing→won, JS errors 0, no 404s/missing art]. The
body-balance runtime `89fcd14` below is folded into this same tip; CI `31129271138`):
- CARD pass (owner `BALANCE_PASS_cards.csv`, 2026-08-06): all 61 owner notes implemented + his 4 flag
  rulings. Commits `b9ff6de`/`0b90f31` (edits+tests), then `ced2724`/`317376f` (flag rulings+tests).
  6 cards ARCHIVED (`oMassiveRedVial`, `dBloodIron`, `oTeleBlades`, `oHaste`, `oBigWizardHat`,
  `oDualHand` → `ARCHIVED_PLAYER_CARDS`, save-compat kept, pulled from offers). Light/Heavy now scales
  card-text "+ melee/ranged bonus" through `scaleCardStatBonus` (was inert on that path) — blast radius
  is EXACTLY ONE live card: `oMiasmicWave` (Heavy) → poison `3 + 2×ranged`; the 8 other "+bonus" users
  (Bile/Tornado/Lifedrain/Hex/Holy/Force/PetLeech/Banshee) are untagged = unchanged. Treasure Blade now
  summons an `animatedWeapon` whose HP AND attack both = the damage it dealt (4s cadence). Lightning
  Lance: +2 in-lane splash renders via the lightning telegraph, and its FOE-cast splashes off the foe's
  OWN ranged target (symmetric with the player's aim). Owner rulings 4 (Za Warudo multi-copy OK) and 5
  (Cool Shoes stays value 5) needed no code.
- Owner-ACCEPTED symmetric consequence: `oBlizzard` Heavy also lifts Litigation Lich's Frost Orb — intended, keep.
- Verify at ship: game 4067/0, party 260/0, telemetry 111/0, fuzz 60/60, serve 116/0, plus
  card-art/expansion/glyphs/symmetry green; production run artifacts in
  `tools/shots/real-mobile-2026-08-07T03-51-02`. KNOWN NON-REGRESSIONS (do not chase): `name-safety`
  fails on a pristine tree (pre-existing); `admission` needs `KM_ALLOWED_ORIGINS` + hits a WS
  rate-policy timeout in this env — both server/transport, untouched by the card diff.
- Every populated `BALANCE_PASS_bodies.csv` row is implemented and causal-tested hero/foe at
  base/Mastery/Specialty. Light/Heavy are data-authored card keywords: Dagger Light, Zweihänder
  Heavy; tagged card UI and typed-stat scaling are live. See the newest State entry for decisions,
  safety migrations, exact gates, and the two owner defaults still awaiting confirmation.
- Touch combat layout (owner 2026-08-05): ▲▼ depth pad lives in the hand band's bottom-left
  (left-edge reserve returned to the board — lanes +6.1% wider), party chips right-anchored for
  thumb reach, Auto Queue button REMOVED (never opened in real play; single-tap queueing, badges,
  and auto-advance untouched — `_planMode` machinery intact but unreachable).
- Telemetry provenance is playtest-ready: owned Party bodies classify as HUMAN in every report
  surface (gameplay `p.bot` untouched; `?harness=1` exclusion unweakened), and code-initiated
  possess sends carry `auto:true` so reports split deliberate switching from queue auto-advance.
- Combat renders ONE template grammar everywhere (owner ruling 2026-08-04): stacked foe cards,
  compact hero rows / 2-col grid, same-kind summons grouped into counted stack chips ("2 rats").
  The free-form portrait path and the foe-pressure compaction gate are DELETED; roomy lanes SCALE
  the template up instead of switching grammar. Permanent 48px proofs still green, plus a new
  friendlies-only crowded-lane proof (`summon-stack-messy-lane.json`).
- Every castable card shows a derived glyph shorthand on telegraphs/intent (e.g. Ice `🎯3 ↓3`) —
  derived from resolver OPS, truthful to live caster bonuses, name ellipsizes before glyphs do.
- Setup previews are combat-chrome-free; the room pill reserves layout space (`--pillw`); the
  defeat modal is one opaque scroll stack. All five 2026-08-04 owner defect screenshots re-render clean.
- Browser-away runs are durable saves: close/background immediately pauses the last-connected
  browser's run, a matching local token resumes the exact draft/combat state, and elapsed time no
  longer deletes it. Explicit Leave / terminal run result remains destructive.
- 6s lane-change cooldown; depth movement free; forced moves exempt; inert at 1 lane (solo).
- 4-lane board readability: full foe names + cast telegraphs at 3–4 lanes.
- Boss rooms draw **4 foes/lane** (was one `+N ADDS` row hiding 22 of 26 foes).
- Party direct-loot assign: every Party body has one fixed ten-card deck and swaps loot 1-for-1.
- Party loot **auto-acquires** — acquire 0 taps, route 2 (was 46 taps for one room).
- Cast FX never occlude state (z-order flipped); floating damage numbers scale with the hit.
- Owner rulings applied: Black Hole → lane; +2 HP/level flat; HP-per-point 4→3; +2 HP/body.
- `game.test.js` de-flaked from ~1-in-7 failures to reliably green.

**Not done:** `main` is 400+ commits stale. Gate 1 of `PUBLIC_ALPHA_PROTOCOL.md` stands at **0 of 8**
owner runs.

## Next step

Run the encounter-density measurement Dakota was offered and never declined: sweep the
quality-vs-quantity split in `generateRoomFoes` (`engine/lobby.js`) across ~4 candidate settings and
produce ONE table of measured outcomes — mean foes/lane per floor at party 1/2/4, mean fight
duration, win rate by kind — via `RUNS=200 SEED=… bun run tools/sim50.js`. **Change no number.** He
picks from the table; the split is his design call. Highest-value lever open: the board now fits 4
foes/lane and the generator ships **0.55**.

## Active decisions (non-obvious why only)

- **Duration is unpriced, and the HP buffs made it worse.** Longer fights (solo ordinary
  30.1s→37.8s) are worth **+17% lifetime damage to all ten recurring cards and 0% to every burst
  card**. Black Hole is still 5.60 dmg/⚡ vs Power Word: Gun's 1.30. His Black Hole nerf hit one
  card's board scope while the HP changes buffed the whole class's duration. He is aware and owes a
  ruling; if he prices it, it's a rule (cost scales with persistence), not 11 card edits.
- **The Black Hole lane nerf is inert in solo** — one lane already equals every foe (measured mean
  target count 1.00 over 1099 fights). It only bites at party 2+.
- **`backpack` is the ownership ledger, NOT a stash.** `convertBackpack` melts *spares* into ◈, the
  only currency for level-ups and body adoptions. "Remove the stash" meant the stash *detour*;
  killing the ledger kills the level economy.
- **One-seat party loot is now FREE.** The old scheme granted the room's value then charged it back —
  pure friction. Flip `priced` (`engine/combat.js:4419`) and `lootPriced` (`engine/lobby.js:2243`)
  TOGETHER to restore charging. Ordinary 2-human co-op still charges.
- **The auto-collect gate counts SEATS, not bodies.** `room.players.size` counts bodies and
  companions are real player entities, so the old check made one human race himself for loot.
- **Cost bands (small ⚡1–3 / mid ⚡4–6 / big ⚡7+) are the ASSISTANT's cut, not owner-stated.** His
  archetype axes are cost-band × melee/ranged, NOT resource archetypes (poison/thorns/lifesteal) —
  an audit used the wrong taxonomy and he corrected it. Ask for his cut before re-running.
- **Melee has no cost curve.** 20 of 34 melee cards sit at ⚡4–6; small melee 7, big melee 7, while
  ranged spreads 10/12/11 — and bodies exist demanding both thin cells.

## Landmines

- **DO NOT REGRESS THE CLOSED `restartRun` SECURITY SEAM:** runtime `9078435` requires a real seated
  non-bot sender and rate-limits wrong-code joins. The older release-audit entries below describe the
  pre-fix state; the current code and the 2026-07-27 fixed entry are authoritative.
- **Railway AUTO-DEPLOYS from `feat/room-draft-overhaul`.** A push goes straight to his live game.
  CLAUDE.md's production gate for client/render changes is mandatory.
- **`game.test.js` has a residual statistical flake cluster** (~1 run in 30, ~4 assertions at once) in
  the `leveled/rich/elite/multiAxis` bounds (`~:1581-1593`) — same unseeded-sampling class as the one
  fixed at `:1706` (trials 400→4000, measured 0.530%/roll). Assertion count jitters 3212↔3213;
  `0 failed` is the signal.
- **Tests can PIN a lie.** `serve.test.js` asserted the served client *contained* `"+4 max HP per
  point"` — the stale literal. CI failed only once the lie was removed. Suspect similar
  string-literal assertions. **Re-run `serve.test.js` after ANY `public/client.js` edit.**
- **`content-summon.js` / `-tank` / `-misc` are a TRAP.** Imported by nothing, untracked, written in
  the deleted school schema — these are the agent-designed cards Dakota **rejected as generic on
  2026-06-22**. `content-summon.js:49-59` holds `perAlly` payoffs; wiring them hands back rejected
  content.
- **`engine/archetypes.js` is DEAD** (test-only). The LIVE table is `FOE_ARCHETYPE`
  (`engine/lobby.js:240`), gating foe gear + level allocation for 41/46 bodies, and it **self-flags
  as a guess**. Unaudited.
- **Defense has no growth term.** No `shieldBonus`/`healBonus`/`defBonus`/`healMul` exists anywhere,
  while damage has three. 32 cards and 12 bodies sit on an axis that cannot scale — an engine gap,
  the one archetype gap cards alone can't fix.
- **Five live scaling hooks with ZERO cards:** `perAlly`, `ofHp`, `ofMaxHp`, `ofMissing`,
  `ofShieldMissing`, wired into the damage formula (`engine/combat.js:2766-2773` hero / `:897` foe).
  Cheapest archetype payoffs — but the cards are Dakota's to author.
- **Co-op support barely exists:** 1 body of 46 and 2 cards of 118 touch an ally, in a 4-player game.
- **The 0-wins-in-2000 baseline measures a deliberately bad bot.** `autoPlay`
  (`engine/combat.js:3750`) casts the **priciest** affordable damage card; cheap multi-hit cards are
  up to 10× better. Real humans post 68.1% combat win rate. Fixing that function makes companions
  competent AND turns the simulator into a real balance instrument.
- **4 of 8 balance harnesses are dead code** — `test/balance.js` crashes on `b.phys`, plus
  `tools/tierlist.js`, `tools/bodypower.js`, `_deckfit-sim.mjs`. None are in CI.
- **DO NOT `git add`:** Dakota's 3 uncommitted `public/foes/*.svg` edits, and `mp-playtest.mjs` /
  `tap-probe.mjs` / `tier-sim.mjs` / `zz-*.mjs` (untracked BY DESIGN — never add, never delete).
- **Doc rot:** 14 of 31 root docs marked stale. `CORE_LOGIC.md` claims 15 bodies; the engine has 46;
  `README.md` says 37. Trust this file and the code.

## Pointers

- Run: `bun run server.js` → http://localhost:3000 — **a live server of his is usually already on
  :3000. Use a throwaway high port for anything you start; never kill his.**
- Test: `bun run test/game.test.js` · `test/squad.test.js` · `test/body-passives.test.js` (release
  gate for level/passive changes) · `test/fuzz.js`
- Serve test needs a server: `PORT=39xxx bun run server.js &` then
  `BASE=http://localhost:39xxx bun run test/serve.test.js`
- Real gate: `BODIES=4 NODES=3 node tools/shoot.mjs` and `BODIES=1 NODES=2 node tools/shoot.mjs` —
  exit 0 with `JS errors: 0`. Production: prefix
  `BASE=https://king-mimic-production.up.railway.app`
- Crowd repros: `node tools/scenario-shot.mjs tools/scenarios/crowd-boss-4lanes-4foes.json` (also
  `crowd-4lanes-4foes`, `crowd-boss-4lanes-5foes`)
- His real telemetry: `bunx @railway/cli ssh "cat /var/data/telemetry.jsonl"` — the winning run is
  `run-2026-07-25T20-26-47-384Z-TTBM` (party-4 throne, 39 min, 1221 interactions, 62% loot claims)
- Full design/code review: `REVIEW_2026-07-24.md` (untracked, repo root)
- Key files: `engine/combat.js` resolver · `engine/lobby.js` draft/rooms/loot · `engine/kit.js` cards
  · `engine/bodies.js` + `engine/leveling.js` bodies & upgrades · `public/client.js` canvas client ·
  `CLAUDE.md` the verification bar

<!-- ─────────────────────── end cold-start block ─────────────────────── -->

## State

- **BODY BALANCE PASS — LIVE (runtime `89fcd14`, CI `31129271138` green on branch tip `4483947`,
  Railway deployment `424f4cd4-23b7-4f77-8553-132b03a8737b`, 2026-08-06).** Implemented every
  populated row in `BALANCE_PASS_bodies.csv`: 40 changed bodies across base/Mastery/Specialty,
  symmetric hero/foe
  runtime paths, ranked UI prose/trackers, save migration, and fight-local cleanup. The six blank
  mythic rows and Killionaire remain unchanged. Owner rulings applied: Debt Dragon and Wandering
  Castle authored at base 14 HP (the universal +2 still applies to display); Toll Troll max-HP gain
  lasts only for the current fight; Malevolent Mouse Specialty grants both melee and ranged; Cyclops
  scales from max HP. Light/Heavy are explicit card data keywords, not inferred by cost/name: Dagger
  is Light and Zweihänder is Heavy; only typed melee/ranged stats are halved/doubled, while generic
  damage remains literal. Tags render on DOM cards, the canvas hand/Party rows, tooltips, deck peek,
  and the deck legend. The card worksheet still contains no additional keyword assignments.
  Adversarial review gaps closed: over-cap Debt saves migrate to rank 5; lethal Caltist health casts
  fall back to affordable moxie without consuming Mastery; Barghest marks attributed recurring
  damage; Medusa tracks poison by source; expiring temporary shield can trigger Golden Golem once.
  VERIFIED: body matrix 462/0; game 4088/0; persistence 87/0; squad 260/0; telemetry 111/0 + report
  15/0; symmetry 34/0; public-entry 24/0; onboarding 202/0; expansion 354; art 289/0; animation 3/0;
  combat graphics 19/0; BABER/summon + clock green; itch 11/0; fuzz 60/60; admission 13/0;
  local+production serve 116/0 and mobile-map clean. Local and production Party-4 + solo mobile
  playthroughs exit 0 with JS errors 0; production screenshots:
  `tools/shots/real-mobile-2026-08-06T22-48-57` and `...T22-49-29`.
  OWNER DEFAULTS RESOLVED 2026-08-09: odd positive Light stat bonuses round up; the legacy
  foe-Cyclops no-ranged-loadout rule was removed (see top entry). Calling Caltist automatically
  prefers its legal health route, with the safe moxie fallback above; there is no new choice prompt.

- **TOUCH LAYOUT BATCH — PROD GATE PASSED (runtime `c22ffac`, CI `31069714478`, rollout
  marker-verified `HAND_DPAD_CSS_W`, 2026-08-05 night).** Four owner asks off two phone screenshots:
  • **▲▼ depth pad** moved from the fixed mid-left column into a horizontal 44px pair docked
  bottom-left of the hand band (`#tDpad` landscape rule; `HAND_DPAD_CSS_W = 100` FLAG); the
  `#center` 46px left padding is 0 and `handBandX0()` shifts moxie meter/hand slots/tap-tests past
  the reserve. Board content measurably wider: canvas 805.9→852 CSS px, per-lane 230→244 (+6.1%),
  foe rows still ≥48px. Desktop byte-identical.
  • **Party chips right-anchored** (`#squadBar.combat` → `right: 12px + safe-inset`, FLAG) for
  thumb reach; queued-card text + deck/trash counters verified clear in a real party-4 frame.
  • **Auto Queue button removed** (owner ruling; 2026-08-01 telemetry showed zero opens ever).
  Button/`updatePlanBtn`/`#planBtn` CSS deleted; `_planMode` stays permanently-false so the plan
  machinery (queueCard wire, projections, AUTO # badges, plan hue) remains intact and regression-
  covered. One serve pin rebaselined to assert ABSENCE + machinery presence (116/0 unchanged).
  `server.js` telemetry whitelist still names plan_on/plan_off — harmless dead names.
  • **Stray mid-left shield ROOT-CAUSED:** `drawHeroCompact` printed the front-blocker 🛡 at the
  lane's absolute left edge while rows are centered — stranded over empty board on any lane wider
  than `HERO_ROW_W_MAX`. Now anchored to the row's own top-left (summon-chip grammar) with explicit
  fill.
  VERIFIED: all five scenario proofs green; game 4092/0; serve 116/0; local solo + party-4 shoot
  exit 0 / JS 0; merged to `c22ffac`, PRODUCTION party-4 `tools/shots/real-mobile-2026-08-06T03-54-44`
  exit 0 / JS 0 with the live frame visually confirming all four asks. Sol's BALANCE_PASS rebalance
  had NOT landed at push time; when it lands it merges on top.

- **TEMPLATE-ALWAYS RENDER + GLYPH TELEGRAPHS + UI SEAMS — PROD GATE PASSED (runtime `04ed0d8`,
  CI `30975100403`, rollout marker-verified, 2026-08-05).** One owner-approved batch off Dakota's
  2026-08-04 phone screenshots plus his rulings "fix this entirely with the templating" and "I want
  to know what a queued card does without hovering." Three commits merged at `04ed0d8`: `b7bf5a3`
  glyph engine, `aaaccbd` template painter, `8c560e3` UI seams.
  • **Glyph engine** (`engine/cards.js` `cardGlyphs`/`GLYPH_OVERRIDES`/`liveDealBonus`,
  `engine/snapshot.js` `glyphs` on foe queue / ally queue / intentCard / queuedCards): every
  castable card derives shorthand from its resolver OPS — never card text, so it cannot go stale —
  with numbers truthful to live caster bonuses through the SAME extracted math the `dmgNow` preview
  uses (cannot drift). 9 hand-authored overrides + the whole vocabulary FLAGged owner-retunable.
  `test/glyphs.test.js` 498/0; adversarially reviewed clean. Boss action cards (kingFingerBeam
  etc.) are not KIT keys and carry no glyphs yet (`castBars`/`bossCardIntent` path).
  • **Template-always painter** (`public/client.js`, net −332 lines): free-form hero portrait path,
  floating intent badge, detached depth pill, and the foe-pressure compaction gate DELETED. Every
  body renders through the compact template row / 2-column grid; same-kind summons group into ONE
  counted stack chip (tap = aimed-else-lowest-HP member; engine blocking stays per-member); rows
  scale UP only with space beyond the foe side's IDEAL bid (`foeIdealNeed` — fixed an inherited
  scale-up bug that starved foe rows to 45px). Glyphs render in cast strips / intent rows / hotbar
  meter; the NAME ellipsizes first ("effect beats name", owner-approved). New permanent scenario
  `summon-stack-messy-lane.json` = the IMG_7701 friendlies-only mess, zero overlaps. FLAGs:
  `HERO_ROW_MAX` 56/48, `HERO_ROW_W_MAX` 300/320, glyph name floors. 3 serve pins rebaselined
  (they pinned deleted literals).
  • **UI seams**: setup previews render calm (`maskSetupLanePresentation` masks the PAINTED view
  only — no telegraphs/status chips pre-combat; raw state untouched; mask provably lifts at combat
  start), the Edit-deck float is docked into the hud row so it RESERVES space, the room pill
  publishes `--pillw` (exact `--squadw` pattern) reserved by setup-head/hud/controls/km-tabs, and
  the defeat modal is ONE `.clog-scroll` opaque stack (report → log, anchored Play Again; opens at
  top when a report exists — FLAG). Additive engine support: behavior-neutral `soloRoomCheckpoint`
  extraction + KM_SCENARIO-only `soloRoomReturn` spec flag (engine/lobby.js). New permanent
  scenario `setup-clean-preview.json`; narrow-viewport profile added to scenario-shot.mjs.
  • **Taste FLAGs for the owner:** foe cast strips show BOTH the glyph number and the legacy `−N`
  resolved suffix (`▮2 −2` — redundant on plain damage cards; his call which survives). The extreme
  4-bodies+4-foes-one-lane grid can still drop foes below 48px (pre-existing physics).
  VERIFIED at `04ed0d8`: FULL battery green — game 4092/0 · glyphs 498/0 · squad 260/0 · telemetry
  93/0 · passives 462/0 · symmetry 34/0 · persistence 85/0 · public-entry 24/0 · telemetry-report
  10/0 · fuzz 60/60 · onboarding 202/0 · expansion 354 · art 289/0 · animation 3/0 · combat-graphics
  19/0 · baber-summons · clock · owner-lab 13/0 · itch 11/0 · admission 13/0 · name-safety 10/0 ·
  mobile-map OK · serve 116/0; all five scenario proofs clean; local party-4 + solo shoot exit 0 /
  JS 0. PRODUCTION: marker-verified rollout, party-4 `tools/shots/real-mobile-2026-08-05T04-26-36`
  and solo `...T04-27-18` exit 0 / JS 0, live combat frame visually inspected (template grammar +
  real glyphs). **Harness lore:** `admission` needs its documented env
  (`KM_ALLOWED_ORIGINS=https://allowed.example KM_MAX_MESSAGE_BYTES=128 KM_MESSAGE_LIMIT=10
  KM_MESSAGE_WINDOW_MS=10000 KM_MAX_ACTIVE_ROOMS=1 KM_MAX_HUMAN_SEATS=2 PORT=3997`) + node;
  `mobile-map-interaction` needs node + a real BASE server (bun Playwright launch hangs on this
  machine, same class as name-safety) — bare-bun "failures" of these suites are invocation errors,
  not regressions.
  Balance-pass state: `BALANCE_PASS_2026-08-06.md` (untracked, owner's hand-edit worksheet)
  regenerated from live tables — 46 bodies / 118 cards, complexity column, six-rulings block;
  DESIGN_LISTS.md is historical. Telemetry provenance fix SHIPPED same night (runtime `09df211`,
  CI `30976142654`, prod solo gate exit 0 / JS 0, rollout marker-verified): `telemAutoPiloted(p)` =
  `bot && !isPartyCompanion(p)` applied at the room `bots` count, all 8 per-event stamps, and
  `beginCombatMetrics`; gameplay `p.bot` and the `?harness=1` exclusion untouched; historical
  events NOT reclassified (they lack the fields — documented, not faked). Client stamps `auto:true`
  on code-initiated possess (queue auto-advance, snap-backs, draft hops); the report splits
  `squad/possess` vs `squad/possess (auto)`. telemetry 111/0 · report 15/0 · fuzz 60/60 · real
  party-4 + solo gates clean. FLAGs for owner: room-level `bots` now means machine-piloted only
  (genuine-human "solo" filter = `bots===0 && party===1`); four possess sends beyond auto-advance
  were tagged auto (each a one-line revert if he wants any counted deliberate). Pre-`partyRole`
  dormant saves classify restored companions as bots until their next draft re-derives roles.

- **LANE-PRESSURE FOE READABILITY — PROD GATE PASSED (runtime `463a239`, CI `30840369333`,
  Railway deployment `18cc846b-60a3-4403-96a7-c25e5ea73675`, 2026-08-03).** Dakota reported that
  foes still became jarringly tiny. Independent and primary real-client audits reproduced two missed
  shapes on the canonical 852×393@3 touch board: a 3-lane lane with one hero + one summon + two foes
  rendered both foes at **25px**, and four lanes with four ordinary foes each rendered **26px** rows
  (then as low as **15px** after live additions). The old foe-first branch only recognized 2+ player
  bodies, plus one hard-coded 1-hero/3-summon case. A lone hero or 1–2 summons kept the full portrait
  reserve; the foe painter then divided the leftover height and, below 48px, fell out of its stacked
  card grammar into a compressed strip.

  The client now computes real foe pressure per lane. On touch boards with 3–4 lanes, 2+ heroes,
  2+ friendly summons, or 2+ real foes compact the friendly side only when a real foe is present.
  Mixed 2–4-body formations share one 2-column grid with separate 44px targets; a lone pressured hero
  uses the seam anchor instead of leaving a dead middle band. Compact-hero clearance now reserves its
  actual 21px touch radius plus an 8px gutter. Grid topology changes snap as one coordinated formation,
  preventing the prior 120ms independent tween from crossing a newly summoned body's live hitbox.

  Permanent regressions: `foe-size-3lane-mixed.json` covers two stacked player bodies + two foes,
  an empty lane + one foe, and one player + two summons + two foes; measured rows are **76 / 104 /
  51px**. `foe-size-4lane-four-foes.json` uses four independent browser clients and four foes/lane;
  every row is **49px**, including a live Fat Cat rat arriving with zero friendly overlaps. The
  scenario harness now supports `minFoeRowH` and both specs fail below 48px. Both reports have zero
  JS/render/HTTP/art errors and zero foe/friendly hitbox overlaps.

  Full local bar: game 4092/0, onboarding 202/0, expansion 354/0, art 289/0, animation 3/0 (140
  cast-probed), combat graphics 19/0, squad 260/0, passives 462/0, telemetry 93/0, persistence 85/0,
  symmetry 34/0, public entry 24/0, fuzz 60/60, admission 13/0, serve 116/0, name safety 10/0,
  owner lab 13/0, telemetry report 10/0, itch 11/0, and mobile map clean. Final local ordinary gates:
  Party 3 and Party 4 both completed draft → setup → playing with zero errors. Production served both
  new bundle markers; uncontested production Party 4 `tools/shots/real-mobile-2026-08-03T18-17-56`
  and Party 3 `tools/shots/real-mobile-2026-08-03T18-19-35` both exited 0 with zero JS/render/404/art
  errors. The Party 4 run stayed live for the full 90-second budget; Party 3 reached terminal loss.

- **BROWSER-AWAY RUN SAVES — PROD GATE PASSED (runtime `2dc0da0`, CI `30687890485`, Railway
  `5b5c1ee4-0e6d-4625-a2ad-0801700c2b77`, 2026-08-01).** Root cause of Dakota's report was explicit
  server policy, not missing disk persistence: when every socket disappeared, combat kept ticking
  and a five-minute `KM_REAP_MS` timer then deleted the room. The browser now sends one authoritative
  `suspend` on `visibilitychange`/`pagehide`, stops background reconnect churn, and force-reconnects
  when foregrounded. The server accepts suspend only from the socket currently owning that seat,
  marks it absent, closes the zombie socket, and—when it was the last connected human—stops the room
  scheduler immediately while leaving the whole run in `active-runs.v8`. A raw socket close takes the
  same path in every active phase, including the initial body draft. One absent co-op seat still does
  not pause partners who remain online; existing gate reflow is preserved. Token reconnect sends the
  exact dormant checkpoint before restarting the scheduler. Explicit Leave, loss, throne victory, and
  non-production harness rooms still clean up normally. There is no elapsed-time reap now.

  Permanent regressions: persistence **85/0** now drives a real draft close/reopen, live-combat
  background suspend, frozen tick, exact token resume, forward tick, restart/deploy round-trip, and
  explicit-Leave deletion. Serve **116/0** pins the deployed lifecycle hooks. Name safety **10/0** was
  re-greened by correcting its stale pre-`74a1b04` `Companion 1` expectation to the live `Body 2`
  label; no production logic changed for that follow-up. Full local bar: game 4092/0, onboarding
  202/0, expansion 354/0, art 289/0, animation 3/0 (140 cards), combat graphics 19/0, squad 260/0,
  passives 462/0, telemetry 93/0, symmetry 34/0, public entry 24/0, fuzz 60/60, admission 13/0,
  owner lab 13/0, telemetry report 10/0, itch 11/0, mobile map + name safety clean.

  Exact local 852×393 browser proof: room `UKGL` was closed mid-combat, persisted at tick 911 / 7 HP
  for the whole away interval, reopened into the same room/body/fight, and advanced past tick 958;
  explicit Leave then reduced saved rooms to zero. Canonical real gates were also clean: Party 4
  `tools/shots/real-mobile-2026-08-01T06-27-56` and solo
  `tools/shots/real-mobile-2026-08-01T06-29-03`, both exit 0 / JS-art-404 errors 0 and visually
  inspected. Production served all 116 markers and real solo
  `tools/shots/real-mobile-2026-08-01T06-31-59` exited 0 / errors 0 with its combat frame inspected.
  Production room `6Q45` then closed during its fresh draft, reopened with the identical room, seat,
  and three exact body/deck offers, and accepted the next body pick before explicit-Leave cleanup.

  **Operational FLAG:** dormant saves still occupy one of `MAX_ACTIVE_ROOMS` (default 256) until
  Leave/terminal result. That is the honest no-destruction contract Dakota asked for and is safe at
  current alpha scale; before broad traffic, move dormant saves behind a separate quota/archive
  policy instead of quietly restoring a time-based deletion.

- **PARTY BODY PARITY + READABILITY — PROD GATE PASSED (runtime `74a1b04`, CI `30654903643`,
  Railway deployment `11eeb3a7-d823-48ef-bb71-f7910536ae8c`, 2026-07-31).** Owner
  feedback covered five coupled seams. Combat now packs 2–4 clustered Party bodies into a readable
  two-column grid (`HERO_COMPACT_H` 20→34 touch) so their shared foe retains a full-height card.
  The opaque `Plan` control is now **Auto Queue → Tap Cards → Queued · N**, with visible queued-card
  copy explaining cast order / first legal affordable moment. Party loot shows every body as
  `BODY N`, removes the first-body `＋ add` exception, and uses two rows of five 154px chips rather
  than ten truncated one-line chips. Engine parity backs that UI: `isPartyBody` gives the internal
  seat owner and its additional bodies the same exact 10-card min/max and `assignLoot` requires a
  one-for-one slot swap on all of them; ordinary solo/co-op stays flexible (explicit regression).
  Entry `Off` now has zero inherited padding and grid centering inside its 38×36 box.
  VERIFIED locally: game 4093/0 · onboarding 202/0 · expansion 354/0 · art 289/0 · animation 3/0
  (140 cast-probed) · combat graphics 19/0 · squad 260/0 · telemetry 93/0 · body-passives 462/0 ·
  fuzz 60/60 · persistence 75/0 · symmetry 34/0 · public entry 24/0 · serve 115/0. Exact 852×393
  browser proofs: `Off` 38×36 / padding 0 / no text overflow; clustered Party combat and full foes,
  JS 0; four-body loot modal 40 chips / 5 columns per row / 154px each / scroll 361=361 / no append
  or main-class control / JS 0. LOCAL real gates exit 0 / JS 0: party-4
  `tools/shots/real-mobile-2026-07-31T18-15-57` and solo
  `tools/shots/real-mobile-2026-07-31T18-16-57`. PRODUCTION served-bundle markers and serve 115/0
  passed; real Party 4 `tools/shots/real-mobile-2026-07-31T18-24-19` and solo
  `tools/shots/real-mobile-2026-07-31T18-25-02` both exited 0 / JS 0 and were visually reviewed.

- **PARTY-WIDE FOE AIM — PROD GATE PASSED (deployed HEAD `3a4e733`, 2026-07-30).** Owner ruling:
  "when I target a foe in party mode all my bodies should be targeting that foe; ally targets stay
  unique." Message-layer implementation (`server.js`): `target` and `cycleTarget` propagate the
  resolved foe to every `partyMembers` body the seat owns; `allyTarget` stays per-body. `msg.bodyId`
  still accepted but no longer narrows the effect; solo unchanged (squad of one); divergence returns
  naturally when the shared target dies (`ensureTarget` refills per body from its own lane). Engine
  `setTarget`/`cycleTarget` untouched — scenario/AI/internal paths keep per-body semantics. Wire
  regression added to `serve.test.js` party-ws (foe-target propagates to all owned bodies /
  ally-target stays on the actor — asserted in draft phase, valid because foe-id validity is
  resolve-time) — **serve is 114 now, CLAUDE.md tally updated 112→114**. VERIFIED at `3a4e733`:
  full bar green (game 4092/0 · squad 259/0 · telemetry 93/0 · body-passives 462/0 · fuzz 60/60 ·
  serve 114/0), allhands probe green, LOCAL + PRODUCTION party-4 + solo shoot exit 0 / JS 0,
  deployed server code verified via `railway ssh` grep (client marker can't prove a server-only
  rollout).

- **PARTY COMBAT READABILITY BATCH — PROD GATE PASSED (deployed HEAD `04681a3`, 2026-07-30).**
  Owner's IMG_7601 ("stuff is still covering other stuff up… more readability on the enemies and in
  general"), six rendering seams in `public/client.js` + `style.css`, no engine/design changes:
  • **Foe cast chips size to their MEASURED label** (`castChipNeed` mirrors `drawFoeQueue`'s exact
  layout math) instead of the flat `154·s` cap — wide-lane cards now render full ability names
  ("5/6 Moonlight Greatsword" instead of "5/6 Moonlig…"); minis may grow to 55% of the row;
  `FOE_STACK_MIN_H` 54→48 so near-miss rows adopt the stacked full-width-bar layout. KNOWN RESIDUAL:
  4-lane dense minis (~200px lanes, identity+telegraph on one 21px line) still ellipsize — physics,
  not a bug; fixing it means a taller-row redesign, owner's call.
  • **Packed-board damage floaters dock ABOVE the telegraph** — foe cards publish `fxDockBottom`
  (cast strip top) and `fctPlace`'s docked fallback centers over the art/name band; blocker extents
  untouched.
  • **Hero intent badge** (queued/auto/plan card over a companion) sizes to its name, capped to
  lane/150px, instead of fixed 78px ("Flame …" → full name).
  • **Piloted ⚡moxie pill** falls back right → left-of-plate (clearing the armor hex) → under it —
  the rightmost lane no longer slides it onto the HP plate / screen edge.
  • **Lateral lane packing reserves the hero's PRINT width** (HP plate + piloted pill), not the 74px
  touch circle — full-width summon chips no longer crowd the avatar/target ring. Tradeoff: the
  summon chip's name budget shrinks in that lane (FLAG).
  • **HUD right inset `--ctrlw`** (live width of the floating summon/echo toggles, synced like
  `--squadw`) — the combat × can no longer slide under "SUMMONS: FRONT".
  Verified vs the `KM_SCENARIO` repro `tools/scenarios/zz-readability-repro.json` (+ probe
  `zz-allhands`/`zz-assign` green, both UNTRACKED by design): full cast names on wide lanes, docked
  −N above the bar, clean pilot readout, summon clearance. Full bar green at `04681a3` (game 4092/0
  · squad 259/0 · telemetry 93/0 · body-passives 462/0 · fuzz 60/60 · serve 112/0); LOCAL +
  **PRODUCTION party-4 + solo shoot exit 0 / JS 0, rollout marker-verified (`castChipNeed` served),
  live combat frame visually inspected.** All new constants FLAGged for owner re-tune.

- **PARTY HAND SWITCHER SHIPPED — PROD GATE PASSED (deployed HEAD `967a00b`, 2026-07-30).** All four
  owner asks live in `02d7db3` + `967a00b` on `feat/room-draft-overhaul`:
  • **One hand at a time** — the combat render dispatch always draws the piloted body's FULL-SIZE
  `drawHotbar`; `computeBands(nHands, chipUnits)` keeps the solo band byte-identical
  (`computeBands(1,0)`) and in touch party reserves `CHIP_BAND` (50 units, FLAG) between the caravan
  seam and the hand for the chip strip. `drawPartyHands`/`drawPartyHandRow` are KEPT but unwired
  (`_partyHandBoxes` always empty → taps fall through to the plain hand-slot path; no tap-router
  changes). Desktop unchanged (chips stay in the side panel, base band).
  • **Chips above the cards** — `#squadBar` gains `.combat` in touch playing: pinned by `--chipy`
  (synced in `updateSquadBar` off the live #cv rect), centered above the hand; thumb-plus 40px
  chips (owner live feedback same night: "make the party icons bigger" — 28px v1 was re-tuned to
  40px, `967a00b`). Setup keeps the top-left header pin, so the `--squadw` HUD inset STAYS (scope
  narrowed to setup; combat syncs it 0). The 14px party `foeTopBound` inset now applies only outside
  "playing" (chips no longer hang top-left in combat). Per-chip queued badge: gold `●`/`#N` (FLAG
  owner taste).
  • **Auto-advance on queue** — `possessNextUnqueued()` (next to `cyclePossess`, same squad order):
  fired ONLY from `sendCardIntent`'s `affordable === false` non-toggle branch — not on affordable
  plays, toggle-offs, or plan mode; wraps, stays put when every other body is armed; sends the same
  `{type:"possess"}` the chips send.
  • **SEAM FIX the probe caught: `possess` removed from `QUEUE_CANCEL_INPUTS` (server.js) and
  `CLIENT_QUEUE_CANCEL_INPUTS` (client).** The pre-existing rule cancelled the LEFT body's unplanned
  queue on possess, so the auto-advance (and any manual chip switch) wiped the queue one message
  after arming it — the owner's stated loop requires the queue to survive the switch and fire on
  that body's own moxie. Un-queueing stays possible via the same-card toggle tap. Plan-mode
  (`planned:true`) queues were never affected.
  • `window.KM.board` now exports `handY`/`handH` for slot-math tap harnesses.
  `tools/zz-allhands-probe.mjs` REBASELINED (untracked by design): §0 switcher layout (chips above
  hand, geometry), §1 affordable tap (no advance), §2 queue → auto-advance → gold badge → auto-fire
  on own moxie, §3 toggle-off clears + NO advance — all green, JS 0.
  VERIFIED at `967a00b`: game 4093/0 · squad 259/0 · telemetry 93/0 · body-passives 462/0 · fuzz
  60/60 · serve 112/0; LOCAL party-4 + solo shoot exit 0 / JS 0; **PRODUCTION rollout
  marker-verified (`CHIP_BAND = 50` + `--chipy` in served assets), party-4 + solo shoot vs Railway
  exit 0 / JS 0, live combat frame visually inspected (4 readable lanes, full-size hand, 4 chips
  above the cards, piloted chip highlighted).** One harness note: a back-to-back solo shoot once hit
  "server would not boot after retries" (port not yet released from the party run) — infra flake,
  clean solo pass on retry.

- **SIX-SEAM PARTY/READABILITY BATCH LIVE — PROD GATE PASSED (deployed HEAD `b4798f0`, 2026-07-29).**
  One orchestrated session, five owner asks, committed `9803325..b4798f0` on `feat/room-draft-overhaul`:
  • **Companion card taps QUEUE like the piloted hotbar** (owner: unaffordable companion taps read as
  silently dropped). Ground truth: the ENGINE already queued them — `playCard{bodyId}` →
  `requestCardPlay` queues, the tick fires `tryQueuedCard` for EVERY room player on its OWN moxie, and
  a repeat tap TOGGLES the invisible queue off (why it felt random). Real fix was client paint/echo:
  `playPartyCard` mirrors `sendCardIntent`'s affordable-vs-queue split (incl. the cleared `{id:null}`
  echo on affordable plays — adversarial-review find, `b4798f0`), `drawPartyHandRow` paints each row's
  queue from snapshot `queuedCards` (gold dashed ARMED ring, plan `#N` badge). `queueCard` now takes
  optional `bodyId` through the `partyMembers` fence like `playCard`/`allocateLevel`.
  `tools/zz-allhands-probe.mjs` is the permanent 3-section tap harness (affordable / queue-fire / toggle).
  • **Companion decks = 10 (owner ruling 2026-07-29, supersedes 5)** — `PARTY_KIT_CARDS=10`; 46/46
  bodies roll 10 distinct cards. **Main-body deck SLOT SWAP** in `assignLoot`: `outgoingKey` naming a
  main-deck card = exact-slot swap, displaced card stays a main SPARE (ownership never shrinks, no pool
  return, no credit); absent/unknown/same-key still appends byte-compatibly. Both serve.test party-ws
  fails at old HEAD were the never-rebaselined `deckSize===3` pins from the 7/28 kit bump — no real
  resize bug; serve is 112/0 again.
  • **Lane effects land in the TARGET lane (owner ruling 2026-07-29)** — new `laneScopedLane` at 12
  resolveOps sites, hero/foe symmetric, own-lane fallback when no living target. Rainbow Blade was
  bugged as reported; Flame Strike's FOE copy was the bugged half; Fireling is summon placement
  (excluded). AWAITING OWNER (FLAGged in combat.js): melee lane sweeps (Whip/Cross-Blade/Lightspeed
  Lashwhip) now follow the reticle; uncaptured timers re-resolve at fire time; Flame Steps' first hit
  can split from its echo; Moonlight beam included though unnamed; card TEXT still says "your lane" on
  oFlameSteps/oWhip/oCrossBlade/oBlackHole/oLightspeedLashwhip (kit.js untouched — owner's surface).
  • **Loot popup shows EVERY deck (owner: "show me each deck… including my main body")** —
  `buildLootAssign` rewrite: one `assign-deck-row` per body, 10 compact `assign-chip` slots each, main
  included as live swap targets + dashed ＋ append chip; same board renders inline for browsing;
  one-open-companion machinery retired. Zero-scroll measured exact (310=310px) at 852×393; chip names
  truncate ~4-6 chars (tradeoff surfaced to owner). Entry-screen `#bodiesPick` recentered (was
  space-between pinning label/options to the card edges). `tools/zz-assign-probe.mjs` rebaselined (27
  checks).
  • **Combat readability batch (owner, 4 phone screenshots)** — (1) foe in the party's lane collapsed
  to a **1px strip** (full-hero rear reserve under compact rows + summon-vs-heroC clearance mismatch +
  squeeze never asking for a readable card) → all-compact lanes now yield a 72px stacked foe card, 58px
  floor at 4 hand rows; (2) cast chip no longer paints over the foe name (sits below an 18px name
  band); (3) body-swap chips 21→34px tall and the HUD pads by live `--squadw` so chips never overlap
  "Floor N"; (4) defeat screen is ONE opaque stack (`:not(.hidden)` on the squadBar CSS,
  `body.defeat-log` hides roomActions/bodyInfo/roomCode while the log is up, opaque log panel +
  backdrop dim).
  VERIFIED at `b4798f0`: game 4092/0 · squad 259/0 · telemetry 93/0 · body-passives 462/0 · fuzz 60/60
  · serve 112/0 (CLAUDE.md's old 71/28/2932/86/370 tallies updated); both probes green; LOCAL party-3 +
  solo shoot exit 0 / JS 0; **PRODUCTION party-4 + solo shoot vs Railway exit 0 / JS 0, rollout
  marker-verified, live combat frame visually inspected (readable foes, clean chips/hand rows).**
  Hygiene flag for owner: ~30 leaked `bun run server.js` processes on the dev box dating to 7/19 —
  only the 2 from a killed gate run were culled; the rest (incl. :3000 pid 35212 and any
  tunnel-backing server) left for an owner-approved sweep.

- **PARTY IS A REAL-TIME MULTI-BODY RPG NOW — every body's hand on screen, no auto (owner 2026-07-28/29).**
  Telemetry of a real 3-body run showed it played itself: 87% of damage from an auto-summon (rat) snowball,
  3% from the piloted body. Owner's fix: "all their hands in front of me? Then no auto." Two halves:
  • ENGINE (`engine/cards.js`, `engine/lobby.js`, `server.js`): companions are player-controlled bodies —
  `handSizeFor` → HAND_SIZE for every hero body (they drew ONE foe-style card before), companions default
  MANUAL (`autoFire:false`), and possessing a body no longer forces the seat's OTHER bodies onto AUTO.
  `playCard`/`target` take an optional `bodyId` so the human plays/aims ANY owned body without possessing
  (ownership-fenced via `partyMembers`, like `assignLoot`/`allocateLevel`). Body PASSIVES (timers) still tick
  — same as the piloted body — so a Royal Rat you play still summons rats (a card-balance lever, his to tune).
  • CLIENT (`public/client.js`): `computeBands(nHands)` grows the hand band with the party during "playing"
  (board shrinks into its existing compression tiers; SOLO is byte-identical); `drawPartyHands` stacks one
  compact hand row per owned body (avatar · own moxie · its hand, piloted row highlighted, ⚡AUTO badge on a
  body flipped to auto); a card tap routes through `playPartyCard(bodyId,cardId)` → `playCard{bodyId}`
  (piloted body keeps its full pick/queue/plan flow, companions play directly). v1 targeting = each body's
  lane-front (owner's pick); per-body AUTO toggle kept, default off. Built on branch `feat/party-all-hands`,
  merged here. VERIFIED: game 4056/0, squad 229/0, telemetry 93/0, body-passives 462/0, fuzz 60/60; real
  party-3 `shoot.mjs` (stacked hands render, 0 JS errors); tap probe `tools/zz-allhands-probe.mjs` (companion
  card plays from THAT companion, its own moxie spent, piloted body untouched); solo `shoot.mjs` byte-identical.
  **Prod gate PASSED (deployed HEAD `7bc8e76`, 2026-07-29): party-3 lifecycle exit 0 / JS errors 0, the
  stacked all-hands board renders live on the real production combat frame.** V1 polish deferred for owner
  taste: per-body pick-card choosers (companions fall back to engine default), a per-body AUTO toggle button,
  tap-to-target aiming.

- **Give-to loot assign is now a POP-UP MODAL — zero scrolling (owner 2026-07-28: "such a pain … I need
  it to require zero scrolling").** With a big spoils grid (18 cards) the compact body roster still sat
  BELOW every card, so handing one off meant scrolling the whole grid to reach the companions. Now
  tapping any spoils card floats a FIXED, centred overlay (`.assign-modal-backdrop`/`.assign-modal`) with
  the party targets right where your eyes are: main body = one-tap append, tap a companion → its 5 slots
  appear IN the modal → tap one to swap. While a companion is open the OTHER collapsed companions are
  hidden (and the redundant DECK header line dropped) so the expanded slots fit a phone screen without an
  internal scroll. Tap the ✕ or the dimmed backdrop to cancel. `public/client.js` `buildLootAssign`
  (modal wrapper around the same compact-roster body markup; card-tap resets `_assignBody`; hide-others
  guard) + `wireLootAssign` (`data-assign-close` + backdrop-only close) + `public/index.html` `.assign-
  modal*` CSS. VERIFIED via `tools/zz-assign-probe.mjs`: targets hidden until a card is tapped, tapping
  pops the modal, 4 bodies shown, swap commits in-modal (deck stays 5, exact slot, ledger conserved),
  main append 10→11, 0 JS errors. Prod gate PASSED (43cbf80 — party-4 lifecycle exit 0 / JS errors 0,
  assign board renders live on the real production won screen).

- **PRODUCTION RENDER GATE PASSED — deployed HEAD `43cbf80` (2026-07-28).** All four 2026-07-28 features
  below (run report, companion kit 3→5, compact assign roster, party-points grid) are LIVE and gate-green
  on Railway. Verified against `https://king-mimic-production.up.railway.app` with the served bundle
  confirmed carrying `buildPartyLevelGrid`/`data-assign-expand`/`renderRunSummaryHtml`:
  • `BODIES=4 NODES=3 BUDGET=90 shoot.mjs` — party-4 lifecycle `draft→won→setup→playing→won→setup→
  playing→lost`, **2 nodes cleared**, exit 0, **JS errors 0**, non-empty hitboxes. The real production
  party WON screen renders the compact assign roster (companions show 🃏5 — kit bump live) and the
  setup screen renders the party-points grid, both clean.
  • `NODES=2 BUDGET=90 shoot.mjs` — solo lifecycle `draft→won→setup→playing→lost`, exit 0, JS errors 0.
  (Interactive party swap + party-points allocation were verified end-to-end pre-deploy via the
  `KM_SCENARIO`-seeded `tools/zz-assign-probe.mjs`, since the auto-brain can't be relied on to reach a
  party loot screen.)

- **PARTY POINTS grid — level every body's points in one place, no switching (owner 2026-07-28: "I get
  tired of scrolling up and down" leveling party members).** Leveling was already party-wide (one Level
  Up raises all bodies); the friction was that per-body point ALLOCATION could only be edited on the
  possessed body, so you switched + scrolled per companion. New: server `allocateLevel` accepts an
  optional `msg.bodyId` and routes to that owned body (ownership-fenced through `partyMembers`, exactly
  like `assignLoot`; defaults to the actor). Client `buildPartyLevelGrid()` renders a compact row per
  owned body (avatar · role · Lv · free pts + inline ❤/🗡/🎯 and ★/◆ steppers), injected into the
  Backpack tab of BOTH the won and setup screens; `wirePartyLevel` sends `allocateLevel{bodyId}`
  optimistically via `_partyAlloc`. Both won + setup sigs now include every owned body's level/points/
  allocation + `_partyAlloc` so a non-active body's edit repaints. `public/index.html` `.plvl-*` CSS.
  VERIFIED (same scenario probe, FEATURE 3): a companion's HP allocates 0→1 from the grid with the seat
  never leaving its own body, 0 JS errors. Prod gate PASSED (36b7586, see top entry).

- **Party loot assign is a COMPACT roster now (owner 2026-07-28: "too tedious … too much scrolling").**
  The won-screen "Loot → Party" board no longer renders every body's full deck at once (4 bodies × 5
  slots = a long scroll, worse after the kit bump). Each body is a short row; tapping a companion
  EXPANDS just that one to show its 5 slots (one open at a time), the MAIN body never expands and
  offers a one-tap append. Flow now matches the owner's ask exactly: tap a spoils card → tap a
  companion (opens) → tap the slot to swap. `public/client.js` `buildLootAssign` rewrite (compact
  `is-compact`/`is-open` rows, `data-assign-expand` toggle independent of card selection so you can
  browse a deck too) + `public/index.html` CSS (`.party-loadout-body.is-compact/.is-open`,
  `.party-row-chev`, `.assign-incoming`). VERIFIED end-to-end via `tools/zz-assign-probe.mjs` (rewritten
  to SEED a trivial win through the `KM_SCENARIO=1` dev hook — the auto-brain reliably wipes floor 1, so
  a real fight can't be counted on to reach a loot-bearing won screen): real party-4, slots stay
  collapsed until opened, opening lights all 5 swap targets, swap commits (deck stays 5, exact slot,
  ledger conserved, outgoing returns), main append 10→11, **0 JS errors**. Prod gate PASSED (36b7586, see top entry).

- **Companion kit size raised 3 → 5 (owner ruling 2026-07-28, supersedes 2026-07-24 "exactly 3").**
  "It's too easy to break companions with just 3 items." New `PARTY_KIT_CARDS = 5` constant in
  `engine/lobby.js`, DECOUPLED from `FOE_MIN_CARDS` (foes stay 3 — this only governs companions).
  `deckMinFor`/`deckMaxFor` for companions → `PARTY_KIT_CARDS`; `rollPartyKit` now mints exactly 5
  (`rollFoeKit(body, 5, 5)` — passes minCards=5 so a body with <5 distinct fitting cards still pads to
  5, keeping the swap's len==min==max invariant). Companion assign stays a strict 1-for-1 swap, just
  over 5 slots. Client is snapshot-driven (`companionCap = p.maxDeck`) so it shows 5 automatically.
  Verified: game 4055/0, squad 230/0 (7 stale "exactly 3" assertions rebaselined to 5), fuzz 60/60,
  telemetry 93/0. Legacy non-5 persisted companion decks are preserved (not reshaped). Prod gate PASSED (36b7586, see top entry).

- **End-of-run telemetry "Run report" is BUILT + LOCAL-VERIFIED (prod gate pending).** Owner 2026-07-26
  ("at the end of the throne run I'd love to see some telemetric results important to me as a player and
  dev"). New engine accrual: `engine/combat.js` `accrueRunStats(room, ev)` runs inside `recordDamageEvent`
  and `recordRunPlay` inside `playCard`, tallying per-run `dealt/taken`, dmg-by-card, dmg-by-body (hero
  side) + summon dmg, taken-by-body, foe threats, plays-by-card, biggest hit. `freshRunStats/resetRunStats`
  exported; `server.js` resets on entering `draft` and bumps `fights` on win/lose before persistCombat.
  `engine/snapshot.js` `summarizeRunStats(room)` → `state.runSummary` (exposed only on `runWon` or
  `phase==="lost"`): top-12 cards by dmg, bodies by dmg, top-5 threats, "cast for 0 dmg" list, biggest hit.
  `public/client.js` `renderRunSummaryHtml(rs)` renders a compact stat card (bars, %; 🎮·YOU flags the
  piloted body, ✦ marks summons) injected into BOTH the throne victory overlay (`renderBetweenRooms`) and
  the defeat modal (`#combatLog`, above the log via new `.clog-summary` class so the log keeps its
  scroll-to-death). Verified: game 4056/0, telemetry 93/0, fuzz 60/60, real `NODES=2 shoot.mjs` exit 0 /
  JS errors 0 with the report rendering on the real death screen. Prod gate PASSED (36b7586, see top entry).

- **Body-switching on landscape phones is FIXED and LIVE at runtime commit `79be0c8`** (prod party-4 gate exit 0 / JS errors 0). Owner 2026-07-27 "I still can't change bodies" (after the touch-HUD button wiring didn't
  resolve it). Root cause was a CSS bug, confirmed via the harness layout proof (`#controls` rect
  `width:0`): `public/style.css` line ~560, inside `@media (orientation: landscape) and (max-height:
  600px)` — i.e. EVERY landscape phone — set `#squadBar { display: none !important }`. The squad bar
  (`updateSquadBar`, `client.js:2892` — a chip per owned body, tap to pilot, its handler was live the
  whole time) IS the intended "always on screen so you never hunt the board" switcher, but its own
  comment assumed you'd also switch "via the board / 🔁" — the board tap became tap-to-aim (2026-07-27)
  and the 🔁 button was never wired until `544ca58`. So all three switch paths were dead on a phone.
  Fix: un-hide the squad bar and pin it as a compact `position:fixed` strip in the empty top-left space
  before the "Floor …" title (`z-index:66`, small icon+HP chips, shows only at 2+ bodies). Verified in a
  real party-4 combat frame (4 body chips, active marked 🎮), serve 112/0, real BODIES=4 exit 0 / JS
  errors 0. Minor: the chips clip the "Fl" of the Floor label — cosmetic, can nudge if it bugs him.
  NOTE for future: the touch-HUD `#tActs` (🔁🎭ⓘ) landscape positioning still conflicts with the mid-left
  `#tDpad` and may not render cleanly — the squad bar is now the primary switcher, so it's non-blocking.

- **Two security blockers closed + all-at-once companion picker are LIVE at runtime commit `9078435`** (prod party-4 gate exit 0 / JS errors 0).
  Owner 2026-07-27 ("make all changes … don't touch balance or defense"), addressing the release audit's
  two BLOCKERS plus the companion-select UX:
  (1) **`restartRun` seat gate** (`server.js`): the case now requires the sender to be a real SEATED
  non-bot player of the room (`room.players.get(ws.data.id)`), not any socket holding a stale/foreign
  roomCode. Kept phase-agnostic so the ↺ button still unsticks a locked-up fight. (2) **Failed-join
  throttle** (`server.js`, `takeJoinFailToken` + per-socket `joinFails`): a wrong room code used to cost
  nothing (≈1M 4-char codes brute-forceable). A global token bucket (5/sec, burst 30) rate-caps failed
  joins across all sockets and closes a socket that keeps missing; valid joins/reconnects never reach it.
  Together these close the "brute-force a code → join → wipe the run" vector. (autoPlay/defense/balance
  left untouched per owner.) (3) **All-at-once party builder** (`public/client.js` renderDraft): was one
  option grid for the ACTIVE slot only (tab per body); now one labeled section per slot (Main/Comp 1–3),
  each showing that body's own offers, so the whole team is comparable on one scroll. `optionButton(w,
  forId)` renders a bundle for a specific body; each `[data-bundle]` carries `data-forid` so a pick lands
  on its section's body then hops possession to the next un-picked slot. Tab bar + `[data-slot]` handler
  retired. Verified: serve 112/0 (WS join/start), real BODIES=4 draft→…→won JS errors 0, new builder
  visually confirmed. FLAG (owner may want): a seat VOTE on restartRun for public alpha (a hostile party
  member can still reset — a social issue for friends co-op, not closed here).

- **Party body-switch buttons wired + summon buffs shown are LIVE at runtime commit `544ca58`** (prod party-4 gate exit 0 / JS errors 0). Two
  owner reports 2026-07-27:
  (1) **CRITICAL: "in party mode mobile there's no switch bodies button."** The touch HUD's 🔁/🎭/ⓘ
  buttons (`public/index.html` #tActs, `data-tk` cycle/swap/bodycard) were ALL `send(undefined)` — never
  wired; `cyclePossess` was only reachable from the desktop backtick key. Tap-to-possess was the only
  mobile body-switch, and the 2026-07-27 tap→aim change removed it, so party-mobile lost body-switching
  entirely. Fixed the `#touchHud` pointerdown handler (`public/client.js` ~2081): 🔁 → `cyclePossess(1)`
  (next body), 🎭 → `window.KM.openBodyModal()` (direct picker — "tap to command," shows only with ≥2
  bodies, `inventory.js:215` buildPilot), ⓘ → `window.KM.openBodyCard()`. (2) **"I can't see buffs and
  debuffs on summons."** `drawCompactSummonChip` (the compact summon renderer used in the lane stack)
  drew name/HP/action but no effect chips, though foes and full `drawSummonBody` cards both do. Added up
  to two `entityStatus` chips at the action line's right (tap/hold for detail via `drawEffectChipAt`).
  Verified serve 112/0, real BODIES=4 exit 0 / JS errors 0.
  STILL OPEN from the same message: **companion-select UX** ("let me see all their options at once" —
  the party builder is one-slot-at-a-time, `public/client.js` renderSetup/draft; not started) and a
  read-only **release audit** (agent-produced 2026-07-27 — see below).

- **RELEASE AUDIT (agent, 2026-07-27) — what's still needed.** BLOCKERS (public release): `restartRun`
  (`server.js:834-839`) has no phase/seat gate — any socket wipes the party's run (sibling `start`
  `:816-827` is guarded); and `join` with a bad code (`server.js:752-753`) costs the socket nothing →
  4-letter codes brute-forceable. Gate 1 of `PUBLIC_ALPHA_PROTOCOL.md` at 0/8. Highest-leverage
  non-security fix: `autoPlay` (`engine/combat.js:3814-3829`) casts the PRICIEST affordable damage card
  — fixing it makes companions competent AND the balance sim trustworthy at once. Structural gaps:
  defense has NO growth term (0 `shieldBonus`/`healBonus`/`defBonus` anywhere; damage has 3); 4 of 5
  scaling hooks have 0 player cards; co-op support = 1 body / 2 cards of 46/118. Dead/trap: `content-*.js`
  (rejected generic cards, imported by nothing), `engine/archetypes.js` (test-only), 4 dead balance
  harnesses. ~187 FLAG constants await owner tuning. Full report was relayed to the owner in chat.

- **Deck-sync bug fix + bigger wide-lane foes are LIVE at runtime commit `3e4966f`** (production
  gate passed party-4 + solo exit 0 / JS errors 0). Two owner reports 2026-07-27:
  (1) **Deck desync (BUG):** "I took Lightning out for Black Hole but the fight kept dealing Lightning,
  I even saw it after the fight." Root cause: `p.cards` — the minted instances `dealHand` shuffles into
  hand+deck — was minted from `deckList` ONLY at room entry (`enterRoom`, `world.js:213`). `beginCombat`
  just `dealHand`'d the already-minted `p.cards`, never re-syncing. So a deck edit made AFTER entry
  (claiming/assigning loot, removing a card during setup) updated `deckList` (the deck panel showed the
  new card) but the fight kept dealing the STALE pre-edit deck until the NEXT room re-minted. Fix:
  `beginCombat` re-mints `p.cards = mintCards(deckKeys(p, room.god))` before `dealHand`, **guarded on a
  real `deckList`** (`if (p.deckList?.length)`) so low-level effect fixtures that seed `p.cards` directly
  without a deckList keep their staged collection (that guard is why 2 tests flipped then passed).
  Regression added (`test/game.test.js` "DECK SYNC"). Verified game **4055/0 stable 3 runs**, fuzz 60/60,
  squad 230/0, body-passives 462/0, telemetry 93/0.
  (2) **Bigger wide-lane foes (owner "the foes could be bigger, look how much space there is"):** the
  wide-lane (solo / 2-lane) foe-row cap was 70px — the LOWEST, despite those lanes having the MOST room,
  so a few-foe fight floated small in dead space. Raised the wide-lane `idealMax` (`public/client.js`
  drawFoeTacticalLane) 70→104 touch / 68→92 desktop to match the narrow-lane ideal; the
  `min(idealMax, avail/rows)` divide still stops a single foe ballooning to the whole board. FLAG (owner
  to tune). Repro `tools/scenarios/foe-size-solo.json`. NOTE: helps most when the CAP is binding (1–2
  foes); a 3+-foe wide band is limited by `avail` (friendly stack + summon eat it), so more space there
  needs a separate friendly-footprint change if he wants it. Serve **112/0**, real BODIES=1 + BODIES=4
  exit 0 / JS errors 0.

- **Party support-aim fix (tap = aim, not possess) is LIVE at runtime commit `953e91a`** (prod serves
  the `command your next body` help string; production party-4 gate cleared 3 nodes exit 0 / JS errors 0).
  Owner 2026-07-27: "in party mode I'm having a difficult time having any of my bodies select other
  bodies for support cards." **Root cause:** a board tap on one of your OWN bodies
  POSSESSED it (switched pilot) instead of aiming — so in party mode, tapping the companion you wanted
  to heal hijacked control out from under the caster; the only way to aim support at a companion was the
  buried 🎯 arm. Support uses a PERSISTENT `allyTargetId` (set-target-then-cast), and the engine already
  accepts any `room.players` entry incl. an owned companion (`allyTargetOf`, combat.js:2129) — so this
  was purely a client tap-routing bug. **Fix (owner picked "tap a body = aim at it"):** in the direct-aim
  tap grammar (`public/client.js` cv click), a tap on ANY body (foe = attack-aim, any body incl. own
  companion/self = support-aim via `sendAllyTarget`) now AIMS; switching which body you hand-drive is the
  existing 🔁 cycle button (`index.html` touchHud `data-tk="cycle"`), no longer a tap. Help text (touch +
  desktop) updated. Verified: serve **112/0**, real BODIES=4 exit 0 / JS errors 0. FEEL is owner's to
  confirm in play (taste-iteration). NOTE: this removes tap-to-possess in combat — pilot-switching is
  🔁-only now; if he misses direct-tap-to-drive, revisit (e.g., hold-to-possess).

- **Pure-variance room-composition split is LIVE at runtime commit `791109b`** (Railway deployment
  `c6bf1af3` SUCCESS; production party-4 gate cleared 3 nodes exit 0 / JS errors 0
  `tools/shots/real-mobile-2026-07-27T15-28-30`, and a live combat frame visually confirmed the
  variance + foe-first readability TOGETHER: lane 0 seated a big+little pair, Centless Centaur ⚖ +
  Blood-Moon Oni, BOTH full readable cards over compacted friendly rows). Owner 2026-07-27: "some rooms
  are high ante because a high-level powerful foe
  is in them, some because there are 3 foes … big+little … two mediums … pure variance for feel without
  having room boxes." **Root cause of the old sameness:** `generateRoomFoes` handed EACH foe the whole
  `remaining` ante, so the first foe drank most of it and every room clustered at ~2 big foes (⚖15.8/foe,
  measured). **Fix (NOT a per-foe cap — that would delete the single-powerful-foe room he likes):** a
  RANDOM PARTITION — `pickFoeCount` rolls how many foes the room splits into (uniform 1..maxAffordable),
  `splitBudget` cuts the ante into that many random shares (lopsided cuts → big+little, even → equal
  mediums), one foe per share. A greedy tail seats extra foes ONLY when a small split physically can't
  hold a big ante (you can't cram ⚖90 into one foe). Measured spread at the shipped ceiling: solo-F1
  100% one foe (clean duel), party4-F2 spreads 0/5/15/20/**61%** across 1/2/3/4/5+ (up to 12), party4-F3
  up to 16. **FLAG (owner to tune the FEEL): `pickFoeCount` uniform is the assistant's default** — his to
  reweight (favor middle, scale with floor); the count tops out at what the ante buys, so bigger rooms
  naturally allow bigger swarms. Owner's meta-ruling this session: **iterate the game by taste/play, not
  by sim** — measurement is a sanity check only.
  Two owner-approved side-effects handled in `test/game.test.js`: (1) leveled-foe frequency at floor 3
  fell >55%→~53% (more small level-1 foes) — the `leveled` organic-pin bound was re-baselined to the
  blessed distribution (NOT a masked regression); (2) the split shifts upstream Math.random consumption,
  which flaked the unseeded exact-count party-loot-persistence regression ~1/3 — that test is now locally
  seeded (its foes are pinned, so the loot outcome is deterministic under a fixed stream). Verification:
  game **4052/0 stable across 5 runs**, fuzz 60/60 (1 known stall), body-passives 462/0, squad 230/0,
  telemetry 93/0, symmetry 34/0, local real BODIES=1 + BODIES=4 exit 0 / JS errors 0. Probe:
  `tools/zz-density-probe.mjs` (untracked) prints the composition histogram at any ceiling.

- **Foe smart-leveling fix is LIVE at runtime commit `88d1105`** (Railway deployment `2e1b2816`
  SUCCESS, task-1 deploy `6ff74dfc` now REMOVED; production real run exit 0 / JS errors 0 confirming
  the live server generates foes on the new build — the allocation logic itself is proven by the
  deterministic suites). Owner 2026-07-27: "foes should only have level-up points in stuff their items
  can actually use — I fought a +2-melee foe with an all-ranged deck." **It was a comment-vs-code bug:** `spawnEnemy`'s own comment
  (`engine/lobby.js`) said a foe levels "the stat its KIT deals with … via foeCombatStat", but the code
  called `randomLevelAllocation` (`engine/leveling.js:150`), which splits hp/melee/ranged **uniformly
  at random, ignoring the gear** — so a foe could bank melee points it can't use. The "smart" function
  (`levelDamageType`/`foeCombatStat`) already existed and is even named in the comment; it was just
  never called on the spawn path. **Fix:** new `foeLevelRoll(bodyKey, gearKeys, level)` (`lobby.js`,
  beside `levelDamageType`) rolls the SAME hp/mastery/specialty and the SAME combat TOTAL, then collapses
  both combat ranks onto the gear-matched kind (archetype-first; a FLEX body falls to its damaging kit).
  Applied at every AUTO foe-roll site (`rollLeveledFoe`, `spendRemainder`, `generateOpeningRoomFoes`,
  `rollEliteFoe`, the coercion roller, and `spawnEnemy`'s random fallback). An **EXPLICIT/scenario
  allocation is preserved verbatim** — the fix touches only random rolls, which is why the "exact foe
  allocation survives spawn" test still passes (a first cut that post-processed in `spawnEnemy`
  clobbered it — don't reintroduce that).
  **FLAG (owner to rule):** a FLEX foe carrying BOTH melee and ranged gear routes ALL combat to its
  DOMINANT kind — keep, or split proportionally? Verification: game **4052/0** (new regression:
  auto-roll all-ranged→0 melee, all-melee→0 ranged, flex→kit, budget-legal, + spawn-path), fuzz
  **60/60**, telemetry **93/0**, body-passives **462/0**, symmetry **34/0**, local real BODIES=1 +
  BODIES=4 exit 0 / JS errors 0. Note: this shifts foe damage-type distribution (a previously
  mis-allocated ranged foe now does more RANGED damage) — an intended balance nudge, owner-visible.

- **Foe-first combat readability is LIVE at runtime commit `77090cf`** (branch
  `feat/room-draft-overhaul`; Railway deployment `6ff74dfc` serving — `foeFirstLanes` confirmed in the
  production `/client.js`; production gate passed party-4 `tools/shots/real-mobile-2026-07-27T12-43-41`
  and solo `…T12-45-01`, both exit 0 / JS errors 0, foe-first visually confirmed in the production
  party-4 combat frame). Owner 2026-07-26: "enemy readability is everything" (two screenshots — a
  crushed shared-lane foe vs a roomy lone-lane foe).

  **Root cause:** the combat board budgets vertical space friendly-first — the friendly stack anchors
  to the caravan and grows UPWARD, so a foe SHARING a lane with your bodies got the leftover and fell
  below `FOE_STACK_MIN_H` (54px) → truncated wide-strip (name clipped to "Stoc…", cast to "Sh…"),
  while a foe ALONE in a lane kept a full stacked card. Worst in party mode (one human drives up to 4
  big body-cards). **Fix (owner picked "foe-first", then "compact piloted body too"):** at
  `COLS>=BOSS_RAIL_COLS` on touch, in any lane STACKING 2+ of your bodies, ALL of them — piloted
  included — drop to compact rows (`public/client.js` `foeFirstLanes`/`laneFoeFirst`, the `heroC`
  demotion), freeing the shared foe a legible stacked card. Scoped so **solo and 2-lane co-op are
  byte-identical**, and a lane with a LONE body keeps its exact prior layout (which is why the
  many-foe crowd scenarios, one body per lane, are untouched).

  **Latent bug surfaced + fixed on the way:** a compact hero's touch hitbox is a fixed radius-16
  circle (`drawHeroCompact`), but its slot reserved only `ceil(compactH/2)+2 ≈ 12px`; two adjacent
  compact bodies (a new case this change creates) overlapped their tap targets. `slotTop`/`slotBottom`
  now reserve the real 16px half-extent. (First cut over-reached — compacting a LONE hero collided it
  with foe-summon rows in `crowd-4lanes-4foes` / `four-player-big-room`; the `heroesHere.length >= 2`
  scope fixed it. Re-verify any future change here against ALL `crowd-*`/`four-player-*` scenarios —
  the harness's zero-overlap check is strict.)

  **FLAG (owner re-tune):** the `COLS>=BOSS_RAIL_COLS` (=3) lane-count threshold is the assistant's.
  Repro: `tools/scenarios/foe-first-readability.json` (party-4, 2 bodies stacked in lanes 0/1, one foe
  each in lanes 0/1/2 — the many-friendly stress the existing crowd scenarios don't cover).
  Verification: core **3212/0**, serve **112/0**, `crowd-4lanes-4foes` / `crowd-boss-4lanes-4foes` /
  `four-player-lich-stress` / `four-player-big-room` all 0-overlap clean, local real BODIES=4 + BODIES=1
  exit 0 / JS errors 0.

- **Owner balance rulings + party loot auto-acquire are LIVE at runtime commit `efb6d7c`**
  (branch `feat/room-draft-overhaul`; CI `30194950486` success; Railway auto-deployed and confirmed
  serving; production gate passed party-4 `tools/shots/real-mobile-2026-07-26T08-38-36` and solo
  `…T08-39-31`, both exit 0 / JS errors 0).

  **Party loot now auto-acquires like solo — 46 taps → 0.** Driven off the owner's real production
  run `run-2026-07-25T20-26-47-384Z-TTBM` (39-min party-4 throne victory): of **1221 UI
  interactions, 757 (62%) were `loot claim`** — 710 claims across 19 combats against **62 cards
  played**, i.e. 12 taps per card cast, escalating 134/242/334 by floor. Root cause: the
  auto-collect gate read `room.players.size === 1`, which counts **bodies**; companions are real
  player entities, so one human driving four bodies ran the co-op claim race against himself. Gate
  now reads human SEATS (`engine/combat.js:4416-4450`). One seat → the room's spoils land in that
  seat's backpack, pool empties, credits clear. `assignLoot` (`engine/lobby.js:2410-2464`) now
  resolves three sources (explicit spare / shared pool / owned body), so the 🎁 board is about
  ROUTING not acquiring; wire gains `from` (`server.js:952`), routing emits `loot_route` so it
  no longer double-counts as `loot_claim`. Measured in a real browser: **acquire 0 taps, route 2**,
  reproduced across 4 independent party-4 runs. Ordinary 2-human co-op keeps pool/grant/charge and
  cross-seat equity, tested.

  **Owner rulings applied:** Black Hole → its lane, both the immediate op and the 6s retrigger,
  text updated (`engine/kit.js:194`). `LEVEL_HP_FLAT_PER = 2` granted by every level above 1
  regardless of allocation (`engine/world.js:41`). `LEVEL_HP_PER_POINT` 4 → 3
  (`engine/leveling.js:13`). `BODY_FLAT_HP_BONUS = 2` on every wearable body inside `bodyMaxHp`
  (`engine/bodies.js:51`) so hero and foe stay symmetric by construction — summon tokens and bosses
  excluded.

  **Three bugs found on the way:** `snapshot.js` shipped the draft wheel's `maxHp` from the raw
  literal instead of `bodyMaxHp` (every drafted body would have shown 2 HP light); the client
  hardcoded `+4 max HP` in two places, which lied the instant the constant moved; and
  `test/serve.test.js` was **asserting that stale literal was present**, i.e. the test pinned the
  lie in place and CI failed only after the literal was removed. The snapshot now ships
  `levelHpPerPoint`/`levelHpFlatPer` (`engine/snapshot.js:847`), the client reads them, and the
  serve assertion now checks the MECHANISM plus `/\+\d+ max HP per point/` absence, so the sheet
  cannot desync again.

  **MEASURED SIDE EFFECT — owner's to rule.** The HP changes lengthen fights 20–35% (solo ordinary
  30.1s → 37.8s). A longer fight is worth **nothing** to a burst card and **+17% lifetime damage to
  all ten recurring cards** — every 6s timer gains a trigger. At the new length Black Hole is
  **5.60 dmg/⚡** vs Power Word: Gun's **1.30**. The Black Hole nerf is additionally **inert in
  solo** (one lane already equals every foe — mean target count 1.00 over 1099 real fights) and
  only bites at party 2+ (−48% duo, ~−75% party 4). Net: the engine-over-burst gap WIDENED;
  **duration is still unpriced**. 200-run sim: solo ordinary win 61.0% → 54.0%, boss win 16.7% →
  25.0%, mean deepest floor unmoved at 1.02.

  **bidPoints FLAG:** a one-seat party is now FREE (no grant, no charge) — the old scheme granted
  the seat the room's whole value then charged it back, pure friction. Flip `priced`
  (`engine/combat.js:4419`) and `lootPriced` (`engine/lobby.js:2243`) together to restore charging.

  Verification: game **3212/0**, squad **230/0**, body-passives 462/0, fuzz 60/60, symmetry 34/0,
  run-persistence 75/0, telemetry 93/0, onboarding 202/0, card-expansion 354, card-art 289/0,
  combat-graphics 19/0, public-entry 24/0, owner-lab 13/0, admission 13/0, clock PASS,
  **serve 112/0** + mobile-map OK against a fresh headless server.

- **Boss-room foe visibility, free intra-seat loot moves, party melt, and the cast-FX rework are
  LIVE at runtime commit `b6d2588`** (branch `feat/room-draft-overhaul`; CI `30137796631` success;
  Railway auto-deployed, production `/client.js` confirmed serving the new build; production
  lifecycle gate passed solo `tools/shots/real-mobile-2026-07-25T01-07-20` and party-4
  `…T01-07-36`, both exit 0 / JS errors 0).

  **Foes were never off-screen — they were never DRAWN.** Owner reported foes disappearing in play.
  Root cause: with a boss present `foeTopBound` dropped below a 92px command deck, and the
  `+N ADDS` collapse gate fired on `laneW < 260` — which is *every* lane at 4 players — so each lane
  rendered ONE summary row. A 4-lane Hydra fight showed 4 of 26 foes. Fix: the deck folds to a 27px
  rail at 3+ lanes on a phone (identity, HP, defense stance, one countdown chip per live action);
  the RULE paragraph and per-action prose defer to the existing hold-to-inspect, which already
  publishes the same `foeBoxes` entry. `+N ADDS` is now a genuine last resort. Banner 92px → 27px,
  foe band 37px → 105px. **Owner's bar met: 4 foes/lane at 24px in a boss room**; 6 bodies/lane fit
  at 15px minis. Honest ceiling: 5+ FULL rows is impossible — the board is 268px and the hero column
  claims 147px, so even a zero-height banner could not seat them. Deterministic repros committed:
  `tools/scenarios/crowd-4lanes-4foes.json`, `crowd-boss-4lanes-4foes.json`,
  `crowd-boss-4lanes-5foes.json`; `window.KM.board.foeBands` makes foes-per-lane assertable.

  **Loot bidPoints leak FIXED** (owner ruling). `assignLoot` charged every time a card left
  `room.loot`, so reshuffling among your OWN bodies was taxed repeatedly. New per-seat credit ledger
  `room.lootCredit`: a credit mints only where an owned card leaves that seat into the pool, and is
  spent by the next pool→ownership move of the same key by that seat. Both intake routes honour it.
  Credits only ever buy back the same key, so cross-seat equity is untouched; cleared on pool reset;
  survives persistence.

  **Lane cooldown no longer carries between fights** (owner ruling) — cleared in `beginCombat`'s
  per-player loop, so every owned body starts each fight free, not just the pilot.

  **Party melt** — `convertPartyBags` melts spares across every body the seat owns in one action,
  reusing `convertBackpack` per body so totals match exactly. Snapshot exposes
  `players[].partyBag {count,value,bodies,hasPassive}`. Single-body `convertBag` unchanged.

  **Cast FX no longer occlude state** (owner-approved; closes the old ruling item #3). `drawCastFx`
  split into an UNDER pass (paths, glows, traveling token, authored overlays — painted on the empty
  floor) and an OVER pass; units paint last, so decoration is structurally incapable of hiding a
  number. Traveling token at 0.4 scale. Impact rings replaced by an edge-flash on the target's own
  hit box plus **floating damage numbers — the game had none before**, read from real snapshot HP
  deltas (no engine change). **Owner ruling: the number scales with the hit** —
  `px = 12 + 18*((dmg-1)/17)^0.7` (1→12px, 10→24px, 18+→30px), clamped into a free band computed by
  subtracting every drawn body from the target's own lane column. Two hit boxes that were lying
  (hero circles omitting name chip/HP plate; intent badge and lane-shield having no box) are now
  honest. Probe: 1286 real frames of the boss-crowd scenario, 1575 floaters, **zero** intersecting
  any body rect.

  Verification: game **3198/0**, squad **179/0**, run-persistence **75/0**, onboarding 202/0,
  combat-graphics 19/0, card-animation 140 probed, card-art 289/0, card-expansion 354, telemetry
  93/0 + report 10/0, symmetry 34/0, body-passives 462/0, admission 13/0, owner-lab 13/0,
  public-entry 24/0, clock PASS, serve 111/0, fuzz 60/60.

  **MEASURED DESIGN FINDING — owner's to rule, not an agent's.** The board now fits 4 foes/lane, but
  the generator never produces that. Sampled 1200 real rooms at party-4: mean foes/lane **0.55 (F1)
  / 1.02 (F2) / 1.42 (F3)**, and **0.0% of rooms at any floor ever seat 4/lane**. Mechanism: mean
  room budget ⚖32.8 is fully spent but at **⚖15.8 per foe against a ⚖7 cheapest legal foe** — the
  ante buys foe QUALITY (levels + gear), not quantity, so a budget that could seat 4 seats 2.2. This
  is why the board reads empty at 4 players regardless of layout. The quality/quantity split inside
  `generateRoomFoes` is the lever; those numbers are Dakota's.

  **FLAGs owed:** `client.js:2212` `FCT_DOCK_WHEN_PACKED` — when a lane is completely packed (~6% of
  floaters in the worst boss-crowd probe, 0% in lighter scenarios) the number docks onto its own
  target's row behind a 55%-alpha pill; set false to print nothing instead. Plus the boss-rail
  measurements (`client.js:112`, `:121`, `:4624`), the FX/number constants (`:1475-1483`,
  `:2196-2225`), and the `assignLoot` free-acquisition credit note (`lobby.js:2277`).

- **Lane cooldown + 4-lane readability + party direct-loot assign are LIVE at runtime commit
  `a20dda5`** (branch `feat/room-draft-overhaul`; CI `30133014417` success; Railway auto-deployed and
  production `/client.js` serves the new build). Three owner-directed changes from 2026-07-24.

  **Lane cooldown** — `LANE_CHANGE_CD_TICKS = 60` (`engine/bodies.js:25`), gate + `changeLane` at
  `engine/combat.js:294-330`. Lanes are COLUMNS, so only lateral moves are gated; depth
  (`moveDepth`, front/back) stays free, as does every forced move (`pullFront`, boss steps, tornado,
  spawn/room-entry) — every `.lane` writer was audited. Snapshot exposes `laneCd` / `laneBlockedTick`
  (ticks) and room `laneChangeCd`. Also removed `"lane"` from `QUEUE_CANCEL_INPUTS`: a REFUSED lane
  press was destroying the player's banked card. Client no longer predicts a refused move (no ghost
  hero) and draws a cooldown/locked readout in the existing seam strip. **Inert at `COLS === 1`, so
  solo never sees it — this rule only bites in co-op and Party mode.** Foes never voluntarily change
  lanes, so there is nothing to mirror for symmetry.

  **4-lane readability** — width-driven density tier in `public/client.js` (constants `:88-101`).
  Narrow lanes re-flow the foe card into stacked bands instead of truncating: name block 38px → ~152px,
  telegraph 95px → 202px. Fixed two real collisions — `drawHeroIntentBadge`'s bottom edge was
  mathematically identical to the name chip's top edge, and lateral lanes never reserved
  `HERO_INTENT_BAND`. Depth badge relocated out of the summon/companion strip. Wide/solo tier byte-identical.

  **Party direct-loot assign** — `assignLoot` (`engine/lobby.js:2264`), server `case "assignLoot"`
  (`server.js:928`), wire format `{type:"assignLoot", key, to:<playerId>, out:<companion deck key|null>}`.
  Companion decks stay exactly 3 and swap 1-for-1 (owner ruling 2026-07-24); the outgoing card returns
  to the shared pool. Main body appends. **`backpack` is deliberately retained as the ownership ledger** —
  it is what `convertBackpack` melts into the level-up/adoption economy — so this removes the stash
  DETOUR, not the ledger. New won-screen tab leads only when spoils exist. `claimLoot`, the stash, and
  the deck builder are unchanged for solo and ordinary co-op.

  **Test gate de-flaked.** `test/game.test.js` was failing ~1 run in 7 on one unseeded existence
  assertion (`an organic ⚖14 roll can seat two minimum common foes`). Measured rate 106/20000 =
  0.530%/roll → 400 trials missed 11.9% of the time; raised to 4000 (miss 5.9e-8), arithmetic recorded
  in-place. 25/25 clean after. A rarer residual statistical cluster remains in the `leveled/rich/elite/
  multiAxis` percentage bounds (~1 event in 35 runs, 4 assertions at once) — same unseeded-sampling
  class, not yet sized.

  Verification: game **3186/0**, squad **137/0**, onboarding 202/0, card-expansion 354, card-art 289/0,
  card-animation 140 probed, combat-graphics 19/0, telemetry 93/0, symmetry 34/0, run-persistence 65/0,
  body-passives 462/0, public-entry 24/0, owner-lab 13/0, serve 111/0, fuzz 60/60. Local real runs
  `BODIES=4` and `BODIES=1` exit 0 / JS errors 0. **Production gate passed on the deployed build**:
  `BASE=…railway.app NODES=2` solo (`tools/shots/real-mobile-2026-07-24T23-10-39`) and `BODIES=4`
  (`…T23-11-12`), both exit 0 with JS errors 0; 4-lane production frame visually confirmed with full
  foe names and telegraphs. A real-browser probe (`tools/zz-assign-probe.mjs`, untracked) drives an
  actual companion swap and asserts deck stays 3, card lands in the tapped slot, outgoing returns to
  the pool, and no card duplicates or vanishes.

  **OWNER RULINGS OWED** (do not resolve unprompted): (1) **bidPoints leak** — re-assigning a
  swapped-out card charges again, so reshuffling among your own bodies is taxed; this contradicts the
  existing "same-seat squad moves stay free" rule (`engine/lobby.js:2285`) and is FLAGged at the
  `assignLoot` definition. (2) Lane-cooldown FLAGs at `engine/combat.js:299/307/309/326` — phase scope
  (playing only), free no-op steps, one-cooldown-per-change regardless of distance, and absolute
  deadline carry-over between fights. (3) **Cast-FX overlay** is now the dominant remaining board-clutter
  source — flying card graphics paint over foe stats and labels at all party sizes; separate from the
  lane-density work, not addressed here.

- **Production shared-freeze fix is LIVE at runtime commit `cf50c1e`** (CI `30109673413` success;
  Railway deployment `21482e5f-f3f0-47d0-a27f-dde981f6c1e5` SUCCESS; production lifecycle gate
  exit 0 / JS errors 0 `tools/shots/real-mobile-2026-07-24T16-36-21`). Owner-reported 10–50s
  freezes that hit every connected player at once (solo included) were diagnosed from production
  telemetry forensics: server-stamped same-millisecond input drains (worst: 68 queued taps in one
  ms at 02:27:13Z on 7/24) after 9–53s server silences, in solo and co-op runs, onset matching run
  persistence landing 7/20 and escalating with Party-mode state size through 7/23. Root cause
  class: the single Bun event loop blocked on synchronous disk I/O to the network-attached
  /var/data volume — the ~5s run-persistence flush (`v8.serialize` + `writeFileSync` +
  `fsyncSync` + `renameSync`) plus `appendFileSync` telemetry/combat-log writes at phase seams.
  The volume benchmarked fast when idle (median 6ms/512KB fsync), so the latency is episodic;
  the fix removes the entire class. IMPORTANT context: Codex's 7/23 "no multi-second synchronized
  freeze" measurement was correct but LOCAL — mp-playtest boots its own local server; nothing
  heavy had ever been measured against production, where every real freeze lived. The 7/23
  keyframe-stagger fix addressed a real but different (3s/109KB) sync spike.

  The change: `engine/run-persistence.js` schedule() now drives an async write pipeline
  (`v8.serialize` stays on the caller's stack for graph consistency; write/fsync/rename are
  awaited `fs.promises` calls; in-flight guard; flushSeq/committedSeq supersession guard so an
  older slow write never replaces a newer committed snapshot; failed-write retry; slow-flush
  warning; init-hoisted mkdir/exists so no sync metadata syscalls remain on the hot path;
  `flushFinal()` = bounded in-flight wait + final sync snapshot for graceful shutdown).
  New `engine/disk-queue.js`: strict-FIFO bounded async append queue for telemetry.jsonl +
  combatlogs (a stalled disk drops NEW diagnostic lines loudly instead of blocking gameplay).
  `server.js`: both wired in; COMBAT_LOGDIR mkdir at boot; stopGracefully awaits flushFinal +
  bounded drain; **permanent event-loop stall probe** — 250ms heartbeat, drift ≥1s (KM_STALL_WARN_MS)
  → `[stall]` stdout line + `server_stall` telemetry event (drift ≥120s labeled suspend/clock-jump,
  not recorded). Production freezes are now self-measuring: if lag recurs, grep telemetry for
  `server_stall` and Railway logs for `[stall]` / `[run-persistence] slow flush`.

  Verification: run-persistence **58/0** (11 new checks: slow-disk non-blocking, supersession,
  failed-write retry, disk-queue FIFO/bound/error), core **3133/0**, telemetry **93/0**, Party
  **60/0**, fuzz **60/60**, owner-lab **13/0**, serve **111/0** local+production; real solo
  lifecycle clean (`...T16-24-06`), mp-playtest both games won all checks worst gap 177ms
  (`tools/shots/mp-2026-07-24T16-25-09`); adversarial review applied (3 findings fixed: residual
  per-flush mkdirSync, unbounded flushFinal wait, stall-probe suspend false-positives). Post-deploy
  production telemetry confirms the async queue writes land and zero `server_stall` events.
  **Acceptance still owed: Dakota's next real session (solo + two-device Party) freeze-free** —
  that session doubles as the pending physical Party graphics/felt-lag gate.

- **Universal combat-card paths + teammate intent are LIVE at runtime commit `fb33e65`**
  (feature commit `c037279`; branch `feat/room-draft-overhaul`; CI `30048580413` success; Railway
  deployment `c78558e9-88b2-4932-ac45-77b1c5998123`, `SUCCESS`; production health OK and WebSocket
  serve **111/0**). Every successful card still publishes a source wind-up, then the resolver emits
  one bounded semantic path using the real card graphic, actual source, actual ordered target IDs,
  and affected lanes. Single-target cards fly source→target; ordered multi-hit/overflow cards such
  as Spear travel through bodies in hit order; lane effects flow through their lane; board effects
  branch by lane; self/support/summon effects orbit or travel to their real destination. Authored
  Sword/Lightning/Meteors presentation is merged into that same path event instead of adding another
  network event. Recurring regen/leech/poison, thorns, Mirror Shield, Atlas, Sphinx, and resolver
  body passives retain their originating card graphic or use the body portrait for a true passive.
  Compound same-target effects deduplicate within one resolve.

  Co-op humans and unpiloted Party companions now carry a spatial card badge over their body:
  exact `QUEUED`/`PLAN 1` for manual intent and server-projected `AUTO NEXT` for the damage card AUTO
  would cast or is banking toward. Compact/crowded rows keep a smaller card icon and intent prefix.
  The piloted body is excluded because its hotbar already shows the plan. The intent projection is
  presentation-only and never drives combat.

  Performance remains explicitly bounded: server event ring **32**, client active list **36**, merged
  authored overlays, and same-resolve path dedupe. Current-code real two-client run
  `tools/shots/mp-2026-07-23T22-00-00` passed both co-op games and every draft/vote/lock check with
  zero JS errors. Worst observed update gap was 245ms, parse max 0.6ms, render max 56.6ms, and worst
  long task 79ms—no multi-second synchronized freeze. Real scenario/browser proof showed Spear
  moving through two bodies in order, Lightning carrying its real graphic through two lane targets,
  and a Party companion badge reading `AUTO NEXT · Dagger`, with zero browser warnings/errors.

  Verification: core **3134/0**, combat graphics **19/0**, all **140** active cards animation-probed,
  onboarding **202/0**, expansion **354/0**, art **289/0**, body-passive matrix **462/0**, telemetry
  **93/0** + report **10/0**, symmetry **34/0**, persistence **47/0**, public entry **24/0**, local
  and production serve **111/0**, and full CI including fuzz/admission/mobile-map passed. The first CI
  run exposed and the follow-up fixed a lane-less legacy fixture; CI now runs the new graphics suite
  permanently. No combat report was generated or rerun. Dakota's three pre-existing foe-SVG edits
  and every scratch/probe file remain untouched and uncommitted.

- **Party Mode + synchronized-lag mitigation are LIVE at runtime commit `420971c`**
  (branch `feat/room-draft-overhaul`; CI `30046930106` success; Railway auto-deployed and production
  `/client.js` serves the capability-handshaked Party build). The old visible Multiple Bodies/Squad
  mode is now **Party Mode**, off for ordinary solo and selectable at 2–4. One human owns one
  full-player main body (normal 10-card starter / 3-card hand) plus 1–3 companions. Each companion is
  still a real player entity for lanes, encounter budget, caravan pressure, boss HP/actions/summons,
  and reward generation, but drafts an exact body-compatible three-card foe-style deck and exposes
  one card at a time in a fixed exhaust-before-repeat cycle. Existing `bodies`/`setBodies` inputs
  remain compatibility aliases; canonical clients use `partySize`/`setPartySize`. Old persisted
  active runs retain their loaded shape and acquire explicit main/companion roles on the next fresh
  draft.

  **Parity math:** reward bid points are split by bodies owned, not merely human seats (a three-body
  seat beside one solo seat receives approximately 3/4 of value). A shared party level costs N
  ordinary level-ups, raises all N owned bodies, and gives each body its own point budget; the body
  being edited spends its new point immediately and the others retain theirs for later allocation.
  Treasure is one seat-wide wallet even when a companion melts spares or initiates a purchase.
  Boss scaling now counts the full simulated roster (the former `humanSeats` read under-scaled
  companions). Setup/won screens include a collapsible **Party Equipment** board. Same-body editing
  is now direct: tap one companion deck card and one card in that companion's stash (either order);
  the valid replacement lights green, the second tap replaces that exact slot, and the outgoing card
  becomes a stash card while ownership and the fixed three-card deck size remain unchanged. The old
  implementation only completed cross-body taps, so the owner-reported same-companion action was
  genuinely impossible. Cross-body exact-zone swaps and one-way stash moves remain available.
  Combat keeps direct body taps plus the visible cycle-body button; possession still makes the
  entered body manual and leaves the others on AUTO.

  **Lag work and measured result:** four-body full snapshots were ~109KB and both players previously
  parsed/rendered the same scheduled full frame every three seconds. Safety keyframes are now every
  10 seconds, staggered across sockets (two humans offset by ~5 seconds); the immutable body catalog
  is cached after the first frame; new clients explicitly advertise compact-keyframe support while
  old tabs keep complete legacy frames; network-driven paints coalesce to one animation frame.
  Bounded client timing records parse/apply/render maxima, long tasks, and keyframe times. Final real
  two-client run `tools/shots/mp-2026-07-23T20-18-16` passed both co-op games and every vote/lock
  check with JS errors 0 and recovery requests 0. Screenshot-free game B measured P1 keyframes at
  0.37/11.21s and P2 at 0.36/5.69/16.51s, max message gaps 141/175ms, parse max 0.4ms each,
  demonstrating the scheduled spikes are no longer synchronized.

  Verification: core **3133/0**, onboarding **202/0**, body matrix **462/0**, Party Mode **60/0**,
  telemetry **93/0**, expansion **354/0**, art **289/0**, animation **140**, symmetry **34/0**,
  persistence **47/0**, public entry **24/0**, owner lab **13/0**, admission **13/0**, itch **11/0**,
  name-safety **10/0**, mobile-map clean, fuzz **60/60**, local+production serve **111/0**. Final
  local Party 4 won with 4 hero/4 foe hitboxes and a live 4-body/19-card/4-destination equipment
  board (`tools/shots/real-mobile-2026-07-23T20-16-34`); final local solo won
  (`...T20-17-17`). Deployed 852×393 touch gates both won with JS/render/art errors 0: ordinary solo
  `tools/shots/real-mobile-2026-07-23T20-21-23` and Party 4
  `tools/shots/real-mobile-2026-07-23T20-22-06`; production Party Equipment and combat frames were
  visually inspected. The exact same-companion deck↔stash touch path passed in the live
  server/client/tick-loop scenario at
  `tools/shots/scenario-party-companion-deck-swap-2026-07-23T21-34-56`: selected deck card gold,
  replacement stash card green with “tap to replace,” then Holy in the 3/3 deck and Hatchet in the
  stash, with zero JS/HTTP/render errors. The deployed client contains that interaction and the
  production serve gate passed 111/0. No combat report was generated or rerun. Dakota's three
  pre-existing foe-SVG edits and every scratch/probe file remain untouched and uncommitted.

- **Organic room generation + exact 1:1 threat-reward ledger are LIVE at runtime commit `ced050d`**
  (branch `feat/room-draft-overhaul`; CI `29955023228` success; Railway auto-deployed on push —
  production `/client.js` serves the new build, and the deployed production gate passed: real
  `NODES=2 BUDGET=90` run exit 0 / JS errors 0, `tools/shots/real-mobile-2026-07-22T20-26-20`,
  combat frame visually confirmed — the deployed foe even wields a shield card, proving the new
  eligibility live). Owner rulings 2026-07-22, all live in engine:
  (1) **Skews retired** — the five composition profiles are deleted; rooms fill organically
  ("generate body, see if it could conceivably fit in the budget, continue until perfectly paid").
  Bodies draw uniformly from every foe body whose minimum kit fits the remainder; each rolls a free
  shape — level uniform to the floor cap, **exactly 3 cards** (owner reaffirmed 2026-07-12's fixed
  count: value lands undiluted in a 3-card rotation) with 1 guaranteed non-fragile damaging card and
  2 uniform picks from the whole eligible pool. (2) **Damaging-only foe richness retired** — foes may
  organically hold heals/shields/summons/utility at any value; fuzz is the stall tripwire (60/60,
  same 3 known sustain stalls as baseline, no new class). (3) **Exact pay** — remainders are spent
  as random card upgrades/levels on the rolled roster; ~99.5%+ of rooms equal their budget to the
  point (honest actual always recorded in `n.ante`). (4) **⚖ = ◈ exactly** — `foeLootValue =
  anteOfFoe`; the 2-point per-foe cover charge + two-guaranteed-commons pair is retired; comp
  treasure covers base/levels/premiums exactly; node previews ship `compLoot` and the client says
  "+ ◈N in random cards". `RICH_ITEM_POOL`/`enrichFoeGear` are deleted (→ `foeItemEligible` +
  `COMP_ITEM_POOL`); `ROOM_SKEWS`/`rollSkew`/`roomSkewsForBudget` are gone (old saves' stale
  `n.skew` is ignored; telemetry passes it through when present, so the report's composition table
  has no rows for new runs). Emergent shifts to OBSERVE in play, not silently retune: elites now
  reach ~22% of seats at solo floor 1 → ~50% at scale (rarity = affordability, roster-composition
  driven); ~35-45% of foes carry sustain; opening-room win pays ◈7 (was ◈5); a probe of 18,000
  rooms showed 0 invariant violations. FLAGged assistant defaults for owner re-tune: uniform level
  roll, 12 rejection tries, COMP_RICH_CHANCE 0.25 (comp-drop quality kept behavior-identical).
  Verification: core **3133/0**, onboarding **202/0**, body matrix **462/0**, squad **28/0**,
  telemetry **93/0** + report **10/0**, expansion **354/0**, art **289/0**, animation **140**,
  symmetry **34/0**, persistence **47/0**, public entry **23/0**, owner lab **13/0**, admission
  **13/0**, itch **11/0**, name-safety **10/0**, mobile-map OK, local serve **105/0**, fuzz
  **60/60**. Real `NODES=2` run exit 0 / JS errors 0 (`tools/shots/real-mobile-2026-07-22T20-09-56`);
  the chooser visibly renders ⚖7/◈7 + "+ ◈4 in random cards". Combat-sim artifact untouched per
  standing rule; existing three foe-SVG edits and scratch files untouched.
- **Lane-bound boss back rows are live at runtime commit `e0758f0`** (CI `29947967279`, success;
  Railway direct deployment `d2660c9c-2c5b-4a27-b595-6476d0d75176`, `SUCCESS`; production serve
  **105/0**). The engine was already correct: real Djinn and King Mimic are pushed to the final/back index
  of their chosen lane after each card. The canvas was not. Short-touch combat could aggregate Djinn
  into an add summary, while King was removed from the ordinary lane rows and replaced by a detached
  side marker that shared paint space with blockers. Both bosses now remain distinct ordered
  tactical rows; lane-bound command rails are information-only rather than duplicate target surfaces.
  Every real/false Djinn uses the same visible row contract, preserving Duplicity. Passive copy now
  says **back row** rather than implying literal visual concealment.

  Verification: core **3140/0**, onboarding **202/0**, expansion **354/0**, art **289/0**, animation
  **140 cards**, causal body matrix **462/0**, squad **28/0**, telemetry **93/0**, telemetry report
  **10/0**, symmetry **34/0**, persistence **47/0**, public entry **23/0**, itch **11/0**, local serve
  **105/0**, mobile-map lifecycle clean, and fuzz **60/60** (four known sustain-wall stalls
  abandoned). Real Djinn and King scenarios at 852×393 DPR3 each proved exactly one authoritative
  boss-row hitbox per frame, zero boss/foe, Djinn/Djinn, foe/hero, or friendly overlaps, and zero JS
  errors. No combat report was generated or rerun; `public/combat-sim-results.json` is untouched.
  Existing three foe-SVG edits and every owner scratch/probe file remain untouched and uncommitted.
- **Newest genuine-human telemetry (2026-07-22 12:54:57–13:29:29 CDT):** eight run IDs produced
  1,443 events and 42 solo fights, but seven runs were one rapid `HAKJ` replay sequence and one was
  `NQQM`; this is repeated-friction evidence, not eight independent players. One run was draft-only.
  Of seven completed runs, one cleared and six died; five deaths were on floor 1 and three in room 1.
  Fight-level results were 36W/6L only because two deep runs supplied 32/42 fights—strong survivor
  bias, not an 86% ordinary fight win-rate claim. Death fights spent **655/900 ticks (72.8%)** with
  no affordable held card, stopped **0** incoming damage with shields, and only one received any
  effective healing (2). High-exposure lock/stranding signals were Lightning (23 draws / 6 casts;
  79% held ticks unaffordable), Earth (16/7; 83%), Flame Orbs (5/2; 99%), Splitter (5/1; 99%),
  Continent Club (8/5; 99%), and Sword (22/14; 58%). This suggests early moxie/hand shape is the
  first release question, not that those cards are individually weak.

  The only clear aggressively replaced its starter (6/10 gone by combat 3; 9/10 by combat 7), then
  went 17/17 on QuakeCap; the other deep run went 9/10 on Recession Revenant. Those body records are
  run-clustered and must not be treated as balance rankings. Pet Leech delivered 47/134 requested
  healing (64.9% overheal); Force + Earth converted 40/124 granted shield into stopped damage. This
  may be timing/expiry mismatch, but telemetry cannot yet distinguish expired/end-state shield from
  true waste. Loot's 100% claim rate is automatic solo collection, not preference. Zero rejected
  card taps were recorded. These runs predate the new frozen boss-row build and triggered another
  code change, so they are shakedown evidence rather than a completed Gate 1 cohort.
- **Stockbroking Sphinx's three-choice cycle is live at runtime commit `20e3142`** (CI
  `29884949048`, success; Railway deployment `c0fb66a7-f4ca-47fa-a087-610393884037`, `SUCCESS`;
  production serve **105/0**). It remains a 14-HP Tier III elite. Every 12 seconds a human wearer
  chooses an available branch: heal the ally target for 12 plus ranged bonus, deal 12 plus ranged
  bonus to the aimed target, or bank up to 12 moxie—including two spendable moxie above the ordinary
  cap of 10. A chosen branch disappears until the other two have been used; completing all three
  refreshes the full set. Invalid, stale, and already-locked choices cannot consume the pending
  decision. Ordinary capped moxie gains preserve rather than erase this overflow, and card payments
  spend directly from the over-cap bank. Mastery still shortens the next clock by one second per
  used option, floor six seconds. Specialty adds +2/rank to every branch, including the moxie ceiling.
  Autonomous foe/squad copies prefer Deal whenever available, then use Heal and Moxie in remaining
  order (explicit **FLAG**: Dakota did not author the autonomous policy). Enemy threat bars now
  truthfully switch from damaging Deal to green Heal and gold Moxie as that cycle locks.

  Verification: core **3138/0**, onboarding **202/0**, expansion **354/0**, art **289/0**, animation
  **140 cards**, causal body matrix **462/0**, symmetry **34/0**, persistence **47/0**, public entry
  **23/0**, owner lab **13/0**, telemetry report **10/0**, local+production serve **105/0**, and fuzz
  **60/60** (three known sustain-wall stalls abandoned). A real local browser scenario visibly
  reduced the full Heal/Deal/Moxie hand picker from three options to two after Deal and then only
  Moxie after Heal; the Knowledge Book showed the exact new rule, with zero browser errors. CI's
  fresh-server serve and fuzz stages also passed. Per Dakota's durable rule, no combat report was
  generated or rerun; `public/combat-sim-results.json` is untouched. Existing three foe-SVG edits
  and all scratch/probe files remain untouched and uncommitted.
- **The five-body economy elite batch is live at runtime commit `87a4ac6`** (CI `29877085105`,
  success; Railway deployment `c97233c4-4c16-49c8-83af-d06c5a4ce1d3`, `SUCCESS`; production serve
  **104/0**). One-Percenter Cyclops is now displayed as **Credit-Cursed Cyclops** while retaining its
  internal key for save compatibility. New wearable foes are Tier I **Bankrupt Barghest** (its landed
  melee attacks permanently mark that target for +1 damage from that Barghest's later melee), Tier I
  **Recession Revenant** (its first lethal event leaves it active for six seconds; a kill revives it
  to full HP, once/combat), Tier I **Shortscerer** (DR 1 while queuing a live-cost-6+ ranged or summon
  card), Tier II **Calling Caltist** (ranged costs above 5 can use 5 moxie plus 2 nonlethal HP per
  missing moxie), and Tier III **Sales Sage** (ranged card costs are halved, rounded up). Oligarchy
  Ooze now visibly reports both its waiting-to-steal state and held stolen card in combat, and its
  full passive is visible in the Knowledge Book. The Book is now **46 bodies / 118 live cards**, with
  tier-then-alphabetical ordering intact and all five new portraits live. Because Dakota did not
  author HP, colors, Masteries, or Specialties, those choices are explicitly FLAGged review defaults;
  Caltist's nonlethal health rule and Sales Sage's rounding are also reviewable interpretations, not
  silent canon. Verification: core **3115/0**, onboarding **202/0**, expansion **354/0**, art
  **289/0**, animation **140 cards**, causal body matrix **462/0**, symmetry **34/0**, persistence
  **47/0**, public entry **23/0**, owner lab **13/0**, local+production serve **104/0**, and fuzz
  **60/60** (three known sustain-wall stalls abandoned). Local and deployed 852x393 touch lifecycles
  completed with zero JS/404/missing-art failures; deployed browser proof independently confirmed 46
  sorted bodies, exact new/Ooze copy, loaded art, and zero app errors.

  Dakota explicitly ruled that combat reports must **not** be generated or rerun unless he asks.
  `public/combat-sim-results.json` therefore remains the untouched 2026-07-21 57,400-fight historical
  artifact for the former 41-body roster. Its “One-Percenter Cyclops” row is the body now named
  Credit-Cursed Cyclops; these five new bodies correctly have no rows. The controlled matrix used one
  each of Sword, Hatchet, Spear, Bow, Dagger, Fire, Lightning, Wind, Arcane, and Holy. The authored
  starter matrix rerolled a body-compatible five-card kit for every trial and duplicated each card,
  but the artifact stores aggregates rather than the 16,400 individual deck lists. Do not claim those
  exact per-fight choices are recoverable from the JSON, and do not regenerate the report to obtain
  them. Existing three foe-SVG edits and all scratch/probe files remain untouched.
- **One-Percenter Cyclops is live at runtime commit `f455c3e`** (CI `29872637030`, success;
  Railway deployment `72a11fbf-e949-4f84-8b40-969ce4a91b5b`, `SUCCESS`; production serve **99/0**).
  This new Tier II melee elite has 9 HP, innate +3 melee/-3 ranged damage, and makes every card the
  wearer plays cost 1 more (capped at 10). Enemy Cyclops loadouts cannot contain ranged or dual-kind
  cards: the same eligibility predicate governs base gear, passive-support substitutions, richer
  upgrades, injected/scenario loadouts, and combat-queue fallback. Players can still own and play
  ranged cards while wearing it. The Knowledge Book now reports **41 bodies / 118 live cards**, with
  Cyclops correctly alphabetized inside Elite II. The generated one-eye portrait, 9 HP, tan color,
  Mastery (+4 innate melee instead of +3), and Specialty (+1 starting moxie/rank, cap 10) are
  deliberately FLAGged owner-review defaults because Dakota did not author those chassis/upgrades.
  Verification: core **3065/0**, onboarding **202/0**, expansion **354/0**, art **289/0**, animation
  **140 cards**, causal body matrix **412/0**, symmetry **34/0**, persistence **47/0**, squad **28/0**,
  telemetry **93/0**, public entry **23/0**, owner lab **13/0**, local+production serve **99/0**, and
  fuzz **60/60** (two known sustain-wall stalls abandoned). A fresh deployed 852x393 touch run reached
  `draft -> won -> setup -> playing -> lost`, cleared one node, and had zero JS/404/missing-art
  failures (`tools/shots/real-mobile-2026-07-21T22-08-46`); production browser proof independently
  confirmed the full book entry and zero app console errors. The refreshed 57,400-fight artifact puts
  Cyclops at **48.8% fixed / 62.0% authored starter** (0/3 stalls); no owner numbers were silently
  tuned. Existing three foe-SVG edits and all scratch/probe files remain untouched. Freeze runtime
  `f455c3e`; this new body resets ordinary Gate 1 alpha evidence to **0/8** pending fresh human runs.
- **Piercer + owner weapon corrections are live at runtime commit `6ef68a2`** (CI `29869476733`,
  success; Railway deployment `5ec79ab2-4b7a-47a9-b271-20a8eda9f1e0`, `SUCCESS`; production serve
  **98/0**). Masters Arm Spear now deals 6 to exactly the front foe and one foe behind it
  (`front2`, symmetric for heroes/foes), replacing its former three-foe sweep. Guillotwine Axe now
  deals **7 immediately and 7 again after six seconds**, preserving overflow on both strikes. New
  **Piercer is V3/M9 melee**: deal 9, ignore all defensive effects, trigger no reactions, and spill
  excess down the lane. Piercing overflow now truthfully treats an ignored shield as zero stopping
  power, and foe-held front-overflow cards now traverse the unified hero/summon line just like the
  player path; both corrections have direct hero/foe tests. The live pool/Knowledge Book is now
  **118 cards**, with Piercer explicit art (`lorc/piercing-sword`). Verification: core **3052/0**,
  onboarding **202/0**, expansion **354/0**, art **289/0**, animation **140 cards**, body-passive
  matrix **402/0**, symmetry **34/0**, persistence **47/0**, squad **28/0**, telemetry **93/0**,
  public entry **23/0**, serve **98/0**, and fuzz **60/60** (two known sustain-wall stalls abandoned).
  Current-head local 852×393 touch play reached `draft → won → setup → playing → lost` with non-empty
  hero/foe/hand/HUD frames and zero JS/404/missing-art errors
  (`tools/shots/real-mobile-2026-07-21T21-16-27`). Local browser proof independently confirmed the
  118-card count, Piercer V3/M9 text/art, two-body Spear copy, 7-damage Guillotwine copy, and zero
  console errors. The fresh deployed lifecycle then cleared two real rooms through
  `draft → won → setup → playing → won`, again with zero JS/404/missing-art failures
  (`tools/shots/real-mobile-2026-07-21T21-20-20`); production browser proof confirmed the same
  118-card catalog and weapon copy with zero console errors. Existing three foe-SVG edits and all
  scratch/probe files remain untouched.
- **Dakota's melee-body batch is live at runtime commit `8c25114`** (CI `29868662508`, success;
  Railway deployment `7ea882ec-361a-4a17-a1b4-270f709efc1d`, `SUCCESS`; production serve **98/0**).
  Killionaire remains a Tier III elite—not a cost-3 adoption—and now opens each combat with a
  six-second double-moxie rush; a kill during the window restarts it and grants +1 damage. Its
  Mastery makes the rush permanent and upgrades each successful six-second window to +3 damage;
  Specialty starts with 2 moxie/rank (cap 5). Economy Elemental no longer regenerates moxie
  normally: it gains 10 every six seconds; Mastery starts with 5 and Specialty advances only the
  first pulse by one second/rank (cap 6). New bodies: Tier II GDP Giant (12 HP; DR 2 while a live
  cost-6+ melee is queued), Tier I Hedgefund Knight (10 HP; six-second shield/melee conversion), and
  Tier III Veteran of the Psychic Wars (9 HP; melee can aim at any foe and gains +1 damage per two
  moxie cost). The retired Hedgefund Knight card stays loadable for old saves but is absent from all
  normal offers. The Knowledge Book now reports **40 bodies / 117 live cards**, puts Killionaire and
  Veteran in Elite III, and explains that moxie only *normally* charges each second.

  Dakota's new soft design law is durable: body Masteries and Specialties should be custom support
  for that body's own passive. Because he specified that law but not the three new bodies' exact
  upgrades, these are deliberately FLAGged owner-review defaults: GDP Mastery counts any held/queued
  qualifying melee and Specialty adds 1 DR/rank; Hedgefund Mastery shortens the pulse to five seconds
  and Specialty adds 1 extra output/rank; Veteran Mastery also adds ranged bonus to melee and
  Specialty adds 1 cross-lane melee damage/rank. Placeholder body HP/art choices are likewise
  reviewable. Causal coverage is green for base/Mastery/Specialty on hero and foe: **402/0** across
  all 40 bodies. Verification: core **3046/0**, onboarding **202/0**, expansion **340/0**, art
  **287/0**, animation **139 cards**, symmetry **34/0**, persistence **47/0**, current-head serve
  **98/0**, and real two-client multiplayer smoke green. The refreshed 56,000-fight artifact shows
  Hedgefund Knight as a likely high outlier (**80.2% fixed / 87.0% starter**) and GDP Giant as weak
  (**43.5% / 45.5%**); no owner numbers were silently tuned. Deployed browser proof independently
  confirmed the moxie Basics wording, all five requested body entries/upgrades, 40/117 totals, and
  removal of the old Hedgefund card from the live catalog. These mechanics reset ordinary Gate 1
  alpha evidence to **0/8** until this deployed build gets fresh human runs. Existing three foe-SVG
  edits and all scratch/probe files remain untouched and uncommitted.
- **Dakota's four-card weapon batch is live at runtime commit `155a370`** (CI `29863910670`,
  success; Railway deployment `8514b517-4c21-4b85-91ca-52be99363b91`, `SUCCESS`; production serve
  **95/0**). The live pool now has **118** cards. Lightspeed Lashwhip is V5/M1 lane-wide melee;
  Guillotwine Axe is V4/M8 front overflow plus one six-second repeat; Wars Eternity is a V5/M9
  fight-long immediate/six-second melee-and-matching-shield engine; Masters Arm is V4/M7 with a real
  server-authoritative Rapier/Spear/Staff picker. The shared combat target grammar now supports
  `front3` for heroes and foes, and all damage summaries, enemy intent/scope, target telegraphs, the
  Knowledge Book, and four generated SVGs consume the same authored data. Exact local browser proof
  opened the three-option picker and chose Spear against four live foes: exactly the front three lost
  6 HP, the fourth stayed untouched, and the browser logged zero warnings/errors. Verification:
  core **3026/0**, onboarding **202/0**, expansion **339/0**, art **287/0**, animation **139 cards**,
  symmetry **34/0**, entry **23/0**, persistence **47/0**, local and production serve **95/0**; all
  four production SVGs return 200. Existing three foe-SVG edits and scratch/probe files remain
  untouched and uncommitted.
- **The landing-page Knowledge Book and Medusa poison-icon repair are live at runtime commit
  `89ad082`, with tier ordering live at `f12f57f`** (CI `29850346776` and `29854899952`, success;
  Railway deployments `0f400603-b645-40ce-b291-7a26c2f81d49` and
  `d81ffa57-5b77-4d03-bdd8-3d3d5bea88da`, success; production serve **95/0**). The initial landing
  page now opens an accessible, searchable four-tab book sourced from the same authoritative engine
  tables as live play: six compact gameplay steps, all **37** wearable bodies with base HP/passive/
  Mastery/Specialty, all **114** live player cards with cost/effect/value/targeting details, and all
  **5** bosses with HP scaling, cadence, rules, and action decks. The JSON catalog is exposed at
  `/knowledge.json` and has regression coverage proving that every live roster entry is present.
  Bodies are ordered Common → Elite I → Elite II → Elite III, alphabetically inside each tier;
  cards are ordered value tier 1 → 5, also alphabetically inside each tier.
  Medusa poison previously carried its source card key into status presentation, so Fire could win
  over the poison glyph; poison now carries explicit poison metadata and renders as a small green
  skull with its stack count. Exact 852×393 production interaction proved the full-screen dialog,
  six basics, 37-body catalog, 114-card catalog, five boss entries, internal vertical scrolling, no
  horizontal overflow, and zero browser warnings/errors. The deployed real lifecycle reached
  `draft → won → setup → playing → lost`, cleared one node, and had zero JS/404/art failures
  (`tools/shots/real-mobile-2026-07-21T16-51-31`). Verification: core **3001/0**, onboarding
  **202/0**, expansion **290/0**, art **279/0**, animation **3/0**, passives **372/0**, squad
  **28/0**, telemetry **93/0**, telemetry-report **10/0**, symmetry **34/0**, persistence **47/0**,
  entry **23/0**, owner lab **13/0**, itch package **11/0**, name-safety **10/0**, serve **95/0**
  local+production, and fuzz **60/60** (one known sustain-wall stall abandoned). Existing foe SVG
  edits and scratch/probe files were preserved untouched.
- **Mobile map touch lifecycle is repaired and live at runtime commit `21c6f7e`** (CI
  `29847822147`, success; Railway deployment `87410e55-8686-46f1-b974-535ff0f3276f`, success;
  production serve **85/0**). The prior implementation destroyed and recreated every map-node DOM
  button on each live render, so a normal finger could press one node and release after that element
  had already been detached. Map nodes now retain identity across unchanged snapshots and resolve
  inspection against the latest authoritative state. The underlying map is inert while room intel is
  open, **CLOSE ×** and **← MAP** are distinct 76×44 and 68×44 CSS-pixel targets, and the intel sheet
  begins below both controls. A new real-touch regression holds a press through twelve state callback
  refreshes, verifies one intel sheet, Back-to-same-map, one-touch Close from inside intel, a second
  open/back/close cycle, and successful room entry; it runs in CI on a fresh headless Chrome server.
  Exact 852×393 local and production browser proof found stable node identity, 17 map nodes, separate
  foe icons/levels, correctly blocked background input, zero render/browser errors, and forward
  progress into setup. Verification: core **3000/0**, onboarding **202/0**, expansion **290/0**, art
  **279/0**, animation **3/0**, passives **372/0**, squad **28/0**, telemetry **93/0**,
  telemetry-report **10/0**, symmetry **34/0**, persistence **47/0**, entry **23/0**, name-safety
  **10/0**, serve **85/0** local+production, mobile touch lifecycle local+production, and fuzz
  **60/60** (one known sustain-wall stall abandoned). Existing foe SVG edits and scratch/probe files
  were preserved untouched.
- **Dedicated mobile map + immediate-room intel is live at runtime commit `c41ffd9`** (CI
  `29841011199`, success; Railway deployment `88bf698c-0c39-4ddc-8226-ebbc4caa9e3a`, success;
  production serve **85/0**). On touch screens the level map no longer occupies a permanent 38%-wide
  rail beside the three actionable rooms. A compact **Open map** button now opens a full-screen,
  connector-free floor surface; Close returns to the chooser, and a room tap opens full-width perfect
  information with a distinct Back-to-map action. Every seeded foe is rendered separately as body art
  plus its own `LvN` label, so multi-foe rooms cannot collapse into one icon/count. The three immediate
  room cards use the recovered width for body, level/HP, every named carried-card drop, and the random-
  common count while retaining threat and total possible-loot value. Exact 852×393 fresh local and
  deployed runs both reached the first-room chooser; production measured 15 combat nodes, 15 rosters,
  15 portraits/levels in that seeded floor, the Hydra boss, stable far-future and boss inspection,
  and zero browser warnings/errors. Verification: core **3000/0**, onboarding **202/0**, expansion
  **290/0**, art **279/0**, animation **3/0**, passives **372/0**, squad **28/0**, telemetry **93/0**,
  telemetry-report **10/0**, symmetry **34/0**, persistence **47/0**, entry **23/0**, name-safety
  **10/0** (Node invocation; Bun's Edge transport hit its 20s launch watchdog twice), serve **85/0**
  local+production, and fuzz **60/60** (two known sustain-wall stalls abandoned). Existing foe SVG
  edits and all scratch/probe files were preserved untouched.
- **Dynamic room-composition generation is live at runtime commit `5a8f234`** (CI
  `29800308481`, success; Railway deployment `cedb2be5-aef9-43be-b723-063fa7ec4c0b`, success;
  production serve **85/0**). The five room skews are now statistical biases, never hard exclusions.
  Every non-opening room first rolls enemy concentration, divides its actual threat budget unevenly,
  then independently spends each share across level points, better three-card gear, and affordable
  elite-body premiums. Swarm tends numerous, veteran tends fewer/higher-level, arsenal tends richer
  gear, bodies strongly favors elites, and mixed stays central—but every bias can combine every axis.
  The first floor-1 choice remains the intentional common/L1/basic trio. Seeded solo populations now
  produce level-2+ foes in **45.4% / 71.0% / 84.1%** of later floor 1/2/3 rooms, rich gear in
  **66.6% / 87.8% / 94.3%**, and elites in **16.4% / 26.1% / 36.3%**. Floor 2/3 both retain
  crowded weaker rooms and compact brutal rooms; no generated room overspends or hides a whole legal
  foe of unreported ante. `room_result` telemetry now records exact foe level/allocation and room
  skew; the report audits level distribution plus actual count/level/rich/elite outcomes by bias.
  Historical telemetry did not include foe level, so old-run level frequency cannot be reconstructed.
  The production 852×393 real lifecycle reached `draft → won → setup → playing → lost` with zero
  JS/404/art failures (`tools/shots/real-mobile-2026-07-21T04-07-18`); click-to-inspect production-
  shaped proof showed basic, leveled+geared, and elite+geared future rooms with no browser warnings.
  Verification: core **3000/0**, onboarding **202/0**, expansion **290/0**, art **279/0**,
  animation **3/0**, passives **372/0**, squad **28/0**, telemetry **93/0**, telemetry-report
  **10/0**, symmetry **34/0**, persistence **47/0**, entry **23/0**, name-safety **10/0**,
  serve **85/0** local+production, fuzz **60/60** (one known sustain-wall stall abandoned).
  Latest owner-run read: Moneymancer went 14/15 fights with a 4/4 Arcane Storm conversion but too
  many stranded expensive draws; Royal Rat went 12/13 and cleared Lich+Kraken, but all six points in
  Specialty left 6 HP while Power Word Gun cast 0/8; three Runeblade 1–1 starts are too little data
  for a body verdict. Next honest action is fresh ordinary play on this deployed generator.
- **Perfect-information map pass is live at runtime commit `ee26f8d`** (final code head `49c23c8`;
  CI `29795914384`, success; Railway deployment `fbbffd03-1d29-4df9-8681-11fb8f3ce756`, success;
  production serve **85/0**). The mobile map is now
  a connector-free icon grid: all 15 combat rooms plus the boss portrait are visible at rest, and
  every node is inspection-only so curiosity taps cannot commit a path. Tapping any past/current/
  future room opens its exact threat, possible-loot value/model, bodies, levels/HP, passives, carried
  cards, and authored card text. The boss node exposes seeded identity, party/floor-scaled HP,
  persistent rule, full action deck with resolver-derived outcomes/cadence, and guaranteed rare-card
  count. The three actionable room cards again show `◈N loot` while mobile still hides their inline
  deck/stat clutter. Exact 852×393 browser proof measured **17 inspectable nodes, 15 body rosters,
  0 connectors, 3/3 visible loot values, 0 visible room decks/stats**, inspected a far-future room
  and Litigation Lich, and logged no warnings/errors. The production real lifecycle reached
  `draft → won → setup → playing → lost` with zero JS/404/art failures
  (`tools/shots/real-mobile-2026-07-21T02-29-20`). Verification: core **2979/0**, onboarding
  **202/0**, expansion **290/0**, art **279/0**, animation **3/0**, passives **372/0**, squad
  **28/0**, telemetry **90/0**, symmetry **34/0**, persistence **47/0**, entry **23/0**,
  name-safety **10/0**, serve **85/0**, fuzz **60/60** (one known sustain-wall stall abandoned).
- **Keyboard/mobile-map interaction batch is live at runtime commit `cb960e0`** (handoff head
  `b6b94ee`; CI `29787034565`, success; Railway deployment
  `88e6a9c0-c0ec-42d5-8077-d1df0e28f844`, success; production serve **84/0**). Desktop
  combat hand slots visibly advertise and accept `1`, `2`, and `3` (top-row, numpad, and key-value
  fallback). The lane-arrangement picker is spatially ordered Left / Reverse / Right while preserving
  the existing lane semantics. On touch/mobile, the complete between-room floor map is visible beside
  the room choices, labels every combat room with body art only, names the boss, and suppresses
  item/deck/stat/loot clutter. Exact 852×393 browser proof exercised all three number keys and found
  15/15 combat-room body rosters, the boss label, zero item labels, and no JS errors. The canonical
  production lifecycle cleared two rooms in 20 frames with zero JS/404/art failures
  (`tools/shots/real-mobile-2026-07-20T23-24-06`). Production DOM proof at exact 852×393 found
  15 body rosters, zero item labels, the Hydra boss label, and no visible room deck/stat/loot/legend
  clutter. Verification: core **2974/0**, onboarding
  **202/0**, expansion **290/0**, art **279/0**, animation **3/0**, passives **372/0**, squad
  **28/0**, telemetry **90/0**, symmetry **34/0**, persistence **47/0**, entry **23/0**,
  name-safety **10/0**, serve **84/0**, fuzz **60/60** (three known sustain-wall stalls abandoned).
- **Owner shakedown-two repair is live at `66034e4`** (CI `29769506152`, success; Railway
  deployment `86a3ae39-190b-40ac-91b7-3c3bef3dce78`, success; production serve **82/0**). Kraken clear-
  lane melee now resolves own-lane blocker → living backline boss → ordinary cross-lane breach,
  with a production-shaped stolen-Triblade regression. Hydra is a four-lane backline fight: generic
  Core/Swarm/Inflation heads roll independently random lanes, Heads Up grows the attacking lane, and
  each lane merges heads into one HP-backed four-second combined bite. The failed owner fight was
  reconstructed at 852×393 from its real level-10 Minotaur/deck state; eight heads rendered as four
  explicit 3/2/1/2 stacks with zero JS/render errors. The old fight's 109 head deaths and 234 separate
  attacks are preserved in `OWNER_RUN_LOG_2026-07-20.md` as pre-freeze evidence, not Gate 1.
- A secret-gated owner lab is integrated: the fragment link `#ownerLab=<KM_OWNER_LAB_KEY>` is scrubbed
  immediately, authenticates only room creation, opens deterministic `OWNERLAB`/`LAB00001` rooms,
  visibly offers all 37 wearable bodies with real starter decks, and then uses normal run persistence.
  Missing/wrong/weak credentials remain ordinary three-offer rooms and join cannot promote a room.
  Lab events are tagged `source=owner_lab` and excluded from public telemetry reports by default.
  Local real-network/restart auth is 13/0; in-app 852×393 proof selected Atlas and reached the normal
  first-room chooser with no browser warnings/errors. Generate/set a >=24-character production
  `KM_OWNER_LAB_KEY`; never commit it. Production has a generated 64-hex key configured, and a real
  WSS trust-boundary probe created `OWNERLAB` with 37 choices and then explicitly left.
- The current candidate's same-seed automated baseline has been regenerated at 1,000 solo + 1,000
  duo in `BALANCE_BASELINE_2026-07-20.md`. It remains bot-policy structural evidence, not authority to
  tune. Both July 20 owner runs forced code changes and remain pre-freeze shakedowns; after final
  production verification, the next honest public-alpha action is ordinary Gate 1 run 1 of 8.
- Integrated verification: core **2974/0**, owner lab **13/0**, persistence **47/0**, passives
  **372/0**, symmetry **34/0**, onboarding **202/0**, expansion **289/0**, art **279/0**, telemetry
  **90/0**, entry **23/0**, serve **82/0**, fuzz **60/60**. Independent adversarial review returned
  **SHIP**. Low residual: a fight persisted mid-Hydra from the pre-stack build retains its independent
  old head entities until that fight ends; every newly entered fight uses stacks.
- **The owner-run-one repair batch is pushed and production-verified at `15b3588`** (Railway
  deployment `4c5b6831-f55c-4f36-b72c-75ec36a4449f`, `SUCCESS`; CI run `29760375134`, success).
  Live foe support casts now choose the highest current-ante living
  friendly target (including self, stable lane/front tie order, never dead/opposing bodies), with a
  live Haste regression and **34/0** focused symmetry assertions. This closes the prior compensation-
  campaign blocker where the resolver supported ally buffs but `foeCast` always self-cast them.
- Bankrupt Basilisk Specialty is capped at one rank and cannot reduce its passive below two moxie.
  Mastery + maximum Specialty now gives 2 lane poison per 2 moxie, causally proven for heroes and
  foes. Restored v1 active runs normalize the retired rank 2 to rank 1 in place, preserve cyclic/
  shared graph identity and unrelated allocations, and expose exactly one finite unspent point;
  persistence is **47/0** and body-passive coverage is **372/0**.
- King Mimic now has a visible 84×48 battlefield body beside two throne adds before and after
  retreat. Completed-run NEW RUN and Leave to lobby are equal centered full-width actions; NEW RUN
  reaches a fresh draft and Leave explicitly clears the fixed victory overlay before exposing the
  lobby. Exact 852×393 scenarios are JS-clean at `tools/shots/scenario-boss-readability-king-mimic-
  2026-07-20T16-23-38` and `tools/shots/scenario-run-complete-exit-2026-07-20T16-23-51`.
- Active production runs now snapshot to `KM_DATA_DIR/active-runs.v8` at a bounded cadence and restore
  exact Map/Set/cyclic/shared state, reconnect tokens, combat state, and monotonically advancing IDs
  across graceful restarts. Railway has a READY 500 MB volume at `/var/data`; local exact
  restart/reconnect/forward-progress verification is **43/0**, including IDs above 50,000. The first
  actual Railway deploy-survival proof remains owner run 8; this rollout cannot retroactively save
  rooms created by the previous server. Incompatible future snapshot versions currently fail closed
  but are not quarantined before a later flush, so schema v2 must add migration/quarantine.
- The public-alpha protocol is locked in `PUBLIC_ALPHA_PROTOCOL.md`: automated baseline already ran
  1,000 solo + 1,000 duo on the repaired mechanics. The July 20 Basilisk throne victory is retained
  in `OWNER_RUN_LOG_2026-07-20.md` as a valuable **pre-freeze shakedown**, not Gate 1 run 1, because
  it forced gameplay/client changes. After the repaired commit is deployed and frozen, next are
  exactly 8 owner runs, then 15 fresh-stranger sessions in three five-session cohorts (22 strangers
  total), then 50 qualified itch storefront visitors.
  One genuine stranger payment through the live payment surface achieves the first compensation
  goal; friend/survey payments do not count. The current simulator produced 0 throne clears and is
  structural bot-policy evidence only—not a human difficulty estimate. The old “89.9% floor-one
  death rate” statement was false and must not be repeated.
- `PASSIVE_TRIGGER_AUDIT_2026-07-20.md` traces all 14 bodies / 16 upgrade rows that affect recurring
  passive cadence. No other balance was changed without Dakota's authorship. Highest-risk follow-ups
  are Timeshare's reachable 3-second service/attack alignment, Ooze's dead ranks above its 10-moxie
  ceiling, and Moneymancer rank 7 making every current ranged card free with later ranks dead.
- `distribution/itch/index.html` + `tools/build-itch.mjs` produce a deterministic donation launcher
  (`artifacts/itch/king-mimic-itch.zip`, **11/0**) with `source=itch`; the telemetry report can filter
  starts/first combats/ends/replays via `bun tools/telemetry-report.js --stdin --source itch` (**6/0**).
  Dakota still owns itch page copy/images, suggested donation, payment provider, revenue share,
  visibility, and desktop/phone restricted preview. HTML5 donation is the viable initial payment
  surface; fixed paid access would require a downloadable product.
- Final-head local verification: core **2943/0**, onboarding **202/0**, expansion **289/0**, art
  **279/0**, animation **135 live cards**, passives **372/0**, squad **28/0**, telemetry **90/0**,
  fuzz **60/60** (one known sustain-wall stall), symmetry **34/0**, entry **22/0**, persistence
  **47/0**, report **6/0**, itch **11/0**, admission **13/0**, name-safety **10/0**, serve **81/0**.
  The final-head 852×393 solo lifecycle had no JS/404/art failures (`tools/shots/real-mobile-
  2026-07-20T16-28-32`); multiplayer completed two co-op wins with zero JS errors (`tools/shots/
  mp-2026-07-20T16-30-16`). Its printed warning remains the known unevaluated `both private picks
  accepted` marker (`—`), not a failed assertion. Independent merged-diff review returned **SHIP**
  with no blocker or medium-severity finding. Production serve is **81/0** and the deployed
  lifecycle reached draft → won → setup → playing → lost with no JS/404/art failure (`tools/shots/
  real-mobile-2026-07-20T16-38-15`). The only low review residual is that Leave to lobby has manual
  causal browser proof plus a committed source regression, while NEW RUN additionally has a
  committed causal scenario.

- **The dead-code purge / resolver-unification / render-backstop batch shipped in `07f9840` (+ docs
  `29a3f77`) and is live + production-verified on Railway.** The stock/greedy foe-offer phase and the
  legacy chooseClass path are DELETED end-to-end (lobby, server WS cases/aliases, snapshot projection,
  client screen/driver/demo fixture, tests — no stubs remain; draftPick is the one draft route; the
  warrior/rogue/mage/cleric class bodies survive only as inert game.test fixtures). `test/fuzz.js` now
  fuzzes the LIVE lifecycle (random wheel-bundle draftPick → rooms → combat → loot/level → descend,
  per-run reached-playing guard) instead of the retired classes and dead stock/shop branches.
  RICH_ITEM_POOL and RARE_POOL carry an ARCHIVED_PLAYER_CARDS guard plus 3 regression tests (owner
  ruled 2026-07-19). resolveOps: ~28 duplicated verb bodies unified to single dispatch sites; every
  pre-existing hero/foe divergence is preserved verbatim and marked `ASYMMETRY (pre-existing,
  preserved 2026-07-19)` — **12 items, an OWNER LEDGER (grep engine/combat.js); do not resolve
  unprompted** — and an unhandled op now clogs loudly instead of silently no-opping on one side
  (proven non-spurious across all 249 cards × 37 bodies × both sides). Client: a mid-draw render
  exception can no longer blank the board — clearRect is gated, the last good frame freezes under a
  small banner with once-per-distinct-error logging, and recovery repaints clean (proven empirically
  with an injected throw, 12/12 pixel probes); `artStem()` follows alias chains, killing the
  iceling→frostOrb.svg 404 (file never existed); the unreachable 217-line legacy foe block,
  renderStock, and drawTornadoHazardsLegacy are gone (client.js −292 lines). snapshot.js computes
  foeThreats once per entity per tick. Docs: truthful README (the stale-lie banner era is over),
  accurate package.json description, .gitignore swallows *.out/*.err/playtest-shot dirs/artifacts and
  the untracked-by-design harnesses, five self-declared-stale docs → docs/archive/. Net −800 lines.
- Verification for `07f9840`: core **2932/0**, passives **370/0** (37 bodies), squad **28/0**,
  telemetry **86/0**, fuzz **60/60** live-lifecycle (plus a 120-run shakeout), onboarding **202/0**,
  expansion **289/0**, card-art **279/0**, animation green, baber/clock green, name-safety **10/0**
  (run it under node — Playwright launch fails under Bun on this machine), admission **13/0**, serve
  **71/0**. Real solo 852×393 lifecycles ×2 with **JS errors: 0** (`tools/shots/
  real-mobile-2026-07-19T23-54-35`); mp co-op both games won, **JS errors: 0**
  (`tools/shots/mp-2026-07-19T23-56-15`; the harness's ⚠ banner traces to its
  `draftBothPicksAccepted: null` check — unevaluated, not failed). Production lifecycle on the
  deployed build: `draft → won → setup → playing`, exit 0, **JS errors: 0**, hero/foe/hand/HUD
  visually verified (`tools/shots/real-mobile-2026-07-20T03-58-55`).
- ⚠ **Local :3000/tunnel NOT bounced** (Bun PID 44292 still serves the pre-batch engine; Cloudflared
  PID 11488 preserved): the working tree holds ANOTHER AGENT'S uncommitted in-flight slice
  (engine/leveling.js, LEVELING_AND_ELITE_TIERS.md, public/style.css, test/baber-summons.test.js,
  test/serve.test.js — Fat Cat merged-stack wording + tests, plus 3 modified public/foes/*.svg), and a
  bounce would boot that unverified engine edit into the live server. Bounce at that slice's own
  commit seam.
- Leftovers from this batch, in priority order: `tools/sim50.js` is dead (drove runs via the deleted
  chooseClass/stock API — supersede or archive); `test/e2e.js` still scripts the deleted stock/shop
  lifecycle (stale by standing note); index.html retains stock-era CSS shared with live
  `.stock-begin` buttons plus 3 comment mentions; `bonusLabel`/`wrapLines` in client.js are newly
  orphaned; `reopenDraftForJoin` still whitelists the unreachable "stock" phase (harmless).

- **The opening-room/economy/passive/clarity batch shipped in `3c91eb6` and is live on Railway plus
  the preserved Cloudflare tunnel.** Every floor-one opening choice is now combat against one level-1
  common/base body per party body, carrying exactly three value-1 common cards. Every defeated body
  drops its carried cards plus two random commons; level and elite-body value still materialize as
  treasure. The solo opening therefore previews and pays exactly ◈5, and the real clear immediately
  funds level 2. Shops are absent from map generation, snapshots, client UI, and server commands.
  Room effects are not generated, rendered, rewarded, timed, or allowed to change foe card costs.
- Killionaire now gains exactly 1 moxie for each legitimate defeat it causes. Depression Demon adds
  +2 magnitude to every debuff, Specialty adds +1 magnitude per rank, and Mastery doubles finite
  debuff duration; poison, slow, weakness, vulnerability, lane weaken, sap, stasis, and Pet Leech
  share the same symmetric hero/foe seam. Djinn Duplicity resets stale targeting of the known real
  body, and public snapshots/projected lane entities expose identical HP, shield, buffs, statuses,
  trackers, and cast timers for real and false Djinns. The client no longer paints a unique real-body
  lane marker or lets the command deck reveal the authoritative target id.
- Completed throne runs now have two unobstructed exits: NEW RUN uses explicit `restartRun`, and
  Leave to lobby uses the existing seat-drop path; `map-top` no longer sits above the victory modal.
  A live throne scenario clicked NEW RUN from `won` and reached a fresh `draft`. Summon cards now state
  placement, HP, moxie cadence/cost, damage/targets, special rules, lifetime, and circulation; Tornado
  and the screenshot-reported Leechstorm define their full continuing effects. The hold inspector
  adaptively fits the complete text without ellipsis.
- Verification: core **2933/0**, onboarding/effect/shop **202/0**, expansion/copy **289/0**, card art
  **279/0**, animation **135/135**, passive causal matrix **370/0**, squad **28/0**, telemetry **86/0**,
  fuzz **60/60**, BABER/summon and room-clock green, and local/Cloudflare/Railway serve **71/0** each.
  Fresh local and production 852×393 real lifecycles both reached live first combat with zero JS,
  HTTP, or art failures. Exact proofs are
  `tools/shots/scenario-run-complete-exit-2026-07-19T22-51-28`,
  `tools/shots/scenario-summon-card-explicit-2026-07-19T22-52-01`, and
  `tools/shots/scenario-boss-readability-djinn-2026-07-19T22-52-59`. Railway deployment
  `bc773fea-3d3a-49c7-892e-3506ce1bc268` is `SUCCESS`; the deployed `client.js` normalized hash exactly
  matches local. Local Bun is PID `44292`; Cloudflared remains PID `11488`.

- **The 37-body economy/summon release shipped in `a34c41f` and is live on Railway.** Bookie
  Bonelord is now a 14-HP Tier-III mythic: every 12 seconds it summons two rats and every defeated
  owned summon grants +1 melee/ranged damage; Mastery doubles that defeat reward and Specialty adds
  one rat per wave/rank. Affluence Anubis grows every future six-second rat wave before releasing it;
  Mastery adds another growth step and Specialty adds one further step/rank. Timeshare Tyrant (6 HP,
  Tier III), its 12-HP Clockwork Amalgamation, Oligarchy Ooze (Tier II), and common Moneymancer are
  implemented symmetrically for hero/foe use with complete trackers, upgrade rows, art, and tests.
- Timeshare starts with its Amalgamation, whose six-moxie ranged attack deals one lane-wide damage
  and whose protection excludes itself. Each 12-second service revives it or full-heals it and adds
  +1 damage/protection; Mastery doubles owned-summon moxie and Specialty reduces service by one
  second/rank to a three-second floor. Ooze steals the first damaging card used against it, auto-casts
  it at double cost, uses normal cost with Mastery, and receives Specialty-rank moxie from every later
  damaging hit. Moneymancer arms a -3 ranged cost every six seconds; its Mastery uses five seconds and
  its Specialty adds one discount/rank.
- `BODY_ARCHETYPE_MATRIX.md` and `engine/archetypes.js` lock the exact taxonomy: 12 attackers,
  12 casters, 2 defenders, 6 summoners, and 5 supports; primary patterns are 8 economy/tempo,
  6 pressure/control, 5 reactive/aggro, 6 scaling/carry, 6 summon/board, and 6 sustain/fortify.
  The explicit gaps are defenders, common control/AoE, direct team support, formation/mobility,
  cleanse/dispel, anti-summon, and deck-manipulation body identities. The refreshed public combat
  report covers all 37 bodies over 51,800 paired first-room fights; Bookie's 83.3% controlled and
  90.5% starter result is the evidence for its Tier-III promotion.
- Verification: core **2925/0**, expansion **174/0**, card art **279/0**, exhaustive animation
  **135/135**, passive causal matrix **370/0**, squad **28/0**, telemetry **86/0**, fuzz **60/60**,
  BABER/summon and room-clock green, local and production serve **70/0**, and both local/production
  four-client multiplayer smoke green. The exact paused four-player/one-boss/four-foe/three-summon
  scenario was inspected at 1280x720 and 844x390 with zero browser errors or overlap; screenshots are
  `artifacts/four-player-boss-four-foes-three-summons-{desktop,phone}.png`. Railway deployment
  `045693c1-d522-412c-975b-386aec66e620` is `SUCCESS` on `a34c41f`. Normal local Bun is PID `46492`;
  Cloudflared remains PID `11488`.

- **The level-up opportunity-cost correction shipped in `48ca921` and is live on Railway plus the
  preserved Cloudflare tunnel.** The previous 2-4 point Specialty prices routinely competed with
  +8 to +16 HP or +2 to +4 damage, so dependable stats were the rational default. All 34 bodies now
  use one legible contract: Mastery costs 2 once and Specialty costs 1 per rank. Existing allocations
  remain valid and may expose newly unspent points for free reallocation outside combat. The complete
  owner-facing matrix and math verdict live in `LEVELING_AND_ELITE_TIERS.md`.
- Royal Rat now keeps its base every-3-moxie rat: its 2-point Mastery shields each summon by actual
  per-body moxie cost (passive rats count as 1; multi-body cards divide their paid cost), while its
  1-point Specialty adds one rat per rank to that trigger. Fat Cat keeps its every-3-damage summon:
  its Mastery also hits the front foe for the living-rat count after the new rat arrives, and its
  Specialty grants +1 melee/ranged per summoned body per rank, including every living rat represented
  by a merged stack. Both mechanics are symmetric for player and foe copies and respect no-shield
  bodies such as Jar Slime.
- Verification: core **2891/0**, expansion **174/0**, card art **277/0**, exhaustive animation
  **134/134**, passive causal matrix **340/0**, squad **28/0**, telemetry **86/0**, fuzz **60/60**,
  BABER/summon and room-clock green, local serve **70/0**, multiplayer smoke green, and Railway plus
  Cloudflare serve **70/0** each. A live production WebSocket snapshot returned all **34** upgrade
  definitions with cost sets exactly `{2}` / `{1}` and the new Royal Rat/Fat Cat text. The real
  852x393 picker had zero row overflow or browser warnings; clicking proved Mastery spends 2 and
  Specialty spends 1. Local Bun is PID `39268` without scenario mode; Cloudflared remains PID `11488`.

- **The unique-card-art + four-player combat-density release shipped in `edc311e` and is live on
  Railway plus the preserved Cloudflare tunnel.** Every one of the 134 live cards now resolves to
  its own SVG; the two retired replay artifacts are unique too, and the last inactive question-card
  glyph is gone. Missing expansion/token art uses explicit name-matched best guesses, duplicate art
  aliases were removed, and the universal cast pulse now lifts that card's own token so every card
  has a distinct animated source signal. `test/card-art.test.js` and
  `test/card-animation.test.js` lock all 136 art artifacts and exhaustive 134-card cast coverage.
- Four-player touch lanes now pack one player plus three distinct summons into a stable 2×2 combat
  grid with separate 44px target cells. Summons retain HP, moxie/cost, next action, depth rank, and
  body art; the player becomes a compact HP/shield row in this one density case. The exact
  `four-player-boss-four-foes-three-summons.json` scenario uses four independent browser clients,
  a 60-HP Litigation Lich, four ordinary foes, three summons, and a live Meteors cast. Its 24 frames
  recorded zero JS/render/HTTP errors and zero friendly, foe/hero, boss/hero, or viewport violations
  (`tools/shots/scenario-four-player-boss-four-foes-three-summons-2026-07-19T17-23-13`).
- Verification: core **2777/0**, expansion **174/0**, card art **277/0**, exhaustive animation
  **134/134**, BABER/summon and clock green, server **70/0**, multiplayer smoke green, exact
  four-client scenario green, production server **70/0**, and all **136/136** deployed SVGs byte-match
  locally with no duplicates. Fresh Railway playthrough traversed
  `draft → won → setup → playing → won`, cleared two nodes, and reported zero JS errors, 404s, or
  missing art (`tools/shots/real-mobile-2026-07-19T17-29-32`). Railway deployment
  `42cb6b36-f59b-4be4-9a2f-c382ebaca5cf` is `SUCCESS`. Local Bun is PID `18004`; Cloudflared remains
  PID `11488`.

- **The boss + four foes + three distinct summons stress correction shipped in `4abea3b` and is
  live on Railway plus the preserved Cloudflare tunnel.** The first exact 852×393 run honestly failed
  with five intersecting friendly touchbox pairs: the crowd fallback vertically squeezed a hero,
  Hedgefund Knight, Large Rat, and Totem into one lane. Solo lanes now laterally pack the entities by
  their real 37px hero and 44px summon touch widths instead of a magic center step; visible rows stay
  unchanged. `boss-four-foes-three-summons.json` locks one Lich, four normal foes, and the three
  independently targetable summon action types with zero friendly, foe/hero, or boss/hero overlaps.
- Verification: core **2776/0**, expansion **174/0**, passive **340/0**, squad **28/0**, telemetry
  **86/0**, fuzz **60/60**, served client **70/0** locally/Cloudflare/Railway, the new stress fixture
  plus the one-/two-summon and Hydra exact regressions clean, and a fresh real mobile two-node run
  clean (`tools/shots/real-mobile-2026-07-19T16-39-08`). Railway deployment
  `f7e6c3f6-51e2-483d-888a-e03eb12cafba` is `SUCCESS`/`RUNNING`. With zero connected players local
  Bun moved from PID `36464` to `28056`; Cloudflared stayed PID `11488`.

- **The compact combat handoff shipped in runtime `480bfbe` and is live on Railway plus the existing
  Cloudflare tunnel.** Touch player portraits are now radius 24 (20 on crowded boards; 30 desktop)
  instead of 36/28/38, while their 37px target radius remains unchanged. Names sit above the art and
  the HP/shield/moxie rails keep the numeric truth, so identity no longer competes with combat data.
- Friendly and hostile summons now share one crisp 38px combat-row grammar: small identity art,
  FRONT/depth rank, HP/max HP, cyan shield cap, and what happens next. Queue-driven bodies show live
  moxie/cost plus the queued card; timer-driven attacks show their real scope, damage, seconds, fill,
  and imminent glow without a fake moxie meter; aura/guard states remain explicit. The visible row
  retains a separate 44px touch surface, and one kind-aware footprint now drives placement and hitbox
  reservation. A new exact Litigation Lich handoff fixture and pairwise friendly-hitbox assertion
  lock the no-overlap contract.
- Verification: core **2776/0**, expansion **174/0**, BABER/summon and room-clock suites green,
  passive causal sandbox **340/0**, squad **28/0**, telemetry **86/0**, fuzz **60/60**, and served
  client **70/0** locally, through Cloudflare, and on Railway. Exact 852×393@3 Edge scenarios for the
  Hydra swarm, shielded Lich handoff, summon-body regression, and front/hero/back depth all recorded
  zero JS/render errors and zero friendly-target overlaps. Fresh current-HEAD local and production
  mobile lifecycles both traversed `draft → won → setup → playing → lost` with zero JS errors, 404s,
  or missing art (`tools/shots/real-mobile-2026-07-19T15-54-02` and `15-57-47`). Railway deployment
  `26021e81-fb02-42e9-a278-343ef07bca7f` is `SUCCESS`/`RUNNING` on `480bfbe`. With zero established
  player sockets, local Bun moved from PID `41096` to `36464`; Cloudflared stayed on PID `11488`.

- **Dakota's 36-card ranged/sustain/summon expansion shipped in `58e419e` and is live on Railway.**
  All ranged lane cards now resolve in the aimed target's lane; Flame Steps is the sole deliberate
  exception because its authored text explicitly says the caster's lane. Bile replaces Acid, Pile On
  is removed, and the normal pool is now 114 cards (35 V1 starters). The full authored cost/value
  matrix is regression-locked in `test/card-expansion.test.js`.
- The expansion includes aimed poison/leech and overflow attacks; delayed/periodic lane spells that
  snapshot their cast lane or exact target; Tsunami's left/right/reverse choice; temporary shields,
  vials, missing-health Blood To Iron, Transcend, Hex, and the authored summon suite. Player and foe
  copies share the same resolver. Summon cards leave combat circulation after play while summon-body
  innate actions remain reusable. Divine Treasure builds an exact 10-moxie animated-weapon partition,
  with each body's HP equal to that weapon's cost.
- Summon bodies enforce their authored edge rules: Jar Slime caps each hit at 1 and cannot heal or
  shield (including Royal Rat's summon specialty); Rat King attacks for current HP and summons two
  rats; Splitter carries overflow and grows each cast; Blood-Moon Oni schedules its six-second return
  while its summoner lives. **Resolved ambiguity:** Rat King's innate action costs 3 moxie and the
  Oni's costs 6 moxie, matching the explicit costs used elsewhere in their descriptions. Flame Orbs
  makes three independent random living-target rolls, so the same survivor can be hit more than once;
  foe-controlled Tsunami defaults to reversing the lane order.
- Verification: core **2775/0**, expansion **174/0**, BABER/summon and room-clock suites green,
  passive causal sandbox **340/0**, serve **70/0** locally and on Railway, fuzz **30/30**, and a fresh
  two-WebSocket multiplayer smoke pass. Local 852×393 body-selection QA showed the new cards with no
  browser warnings/errors. Railway deployment `685156e7-8ab4-4659-a151-0d38b6b920ca` is `SUCCESS`,
  `/health` is green, live SSH confirms Divine Treasure/Miasmic Wave in the runtime, and the deployed
  client exposes Tsunami lane ordering plus the summon art aliases. The stale randomized shop E2E
  remains excluded for its already-documented retired direct-to-stock/cooldown assumptions.

- **Dakota's five-card ranged drop shipped in `34d6d82` and is live on both owner-facing runtimes.**
  Lightning, Meteors, and Blizzard now resolve across the aimed foe's lane instead of the caster's
  current lane. Earth (5m/V1), Acid (3m/V1), Astral Fist (8m/V1), Flame Orbs (9m/V1), and Study
  (1m/V1) are in the normal player pool, V1 starter pool, foe kits, readable card summaries, and the
  symmetric player/foe resolver. The pool is now 84 cards, including 25 V1 cards.
- Earth deals ranged-scaled 3 and gives equal shield to the live ally-target (or the caster); Acid
  applies `1 + ranged` poison; Astral Fist begins at the aimed body and spills excess behind it;
  Study snapshots melee/ranged at cast and grants +1 once after six seconds. **FLAG:** Flame Orbs'
  "three random targets" currently means three independent living-target rolls, so a surviving body
  can be selected more than once. The five temporary neutral SVGs are deliberately listed in
  `public/cards/CREDITS.md` as awaiting Dakota's bespoke art.
- Integration verification: game **2586/0**, passive causal sandbox **340/0**, squad **28/0**,
  telemetry **86/0**, fuzz **60/60**, and fresh local/Railway/Cloudflare serve **70/0**. A real
  852x393@3 touch production lifecycle cleared two nodes (`draft -> won -> setup -> playing -> won`),
  naturally exposed Acid on a foe, and had zero JS errors, 404s, or missing art. Railway deployment
  `0e109fff-5fab-49c2-8003-175120d24db9` is SUCCESS and `/health` is green. Local Bun is PID `41096`;
  the existing Cloudflare tunnel was not restarted.

- **Opt-in one-person squad command shipped in runtime `a581afa` and is live on Railway.** A seat
  choosing 2–4 bodies now gets a visible COMMAND BODIES strip through draft/setup/won/shop; selecting
  a body retargets that body's own deck, backpack, level, loadout, and combat hand. One-body play has
  no Plan button and retains the original direct-cast/one-slot unaffordable queue behavior.
- In live squad combat, `☷ Plan` appends exact current-hand instances in tap order. The numbered
  sequence is strict: only priority 1 may fire, at its first legal/affordable simulation tick; later
  cards never jump it. Tap a numbered card to remove it and re-add it at the end. Plans are stored per
  body, survive aim/move/possession inputs, clear at the room boundary, keep AUTO parked behind their
  head, and continue to expose the legacy `queuedCard` alias for old tools. Quarter speed is the intended
  high-control surface; there is deliberately no new solo complexity or invented card content.
- Every successful hero or foe card now publishes one bounded, source-anchored semantic cast event.
  Cards without authored art get a color-matched pulse; Sword/Lightning/Meteors retain their richer
  resolver-targeted effects. A card played by another friendly body also gets a small authoritative
  card-name pill above its caster, so partners and one-person squads can read what just happened.
- Release verification: game **2503/0** plus BABER/summon and clock checks, passive causal sandbox
  **340/0**, squad **28/0**, telemetry **86/0**, fuzz **60/60**, multiplayer smoke green, and local plus
  Railway serve **70/0**. Real 852×393 production interaction traversed two-body draft → first-room
  chooser → per-body setup/deck retarget → quarter-speed combat with Plan enabled, with zero browser
  errors. Railway deployment `54ddb89c-33a3-499f-b5d5-b6dd36e73a71` is SUCCESS and `/health` is green.
  Local Bun is PID `46692`; Cloudflared PID `11488` was not touched. The separate QA server was removed.
- `test/e2e.js` remains outside the canonical release bar: it still models the retired direct-to-stock
  and cooldown-inventory lifecycle, so its randomized shop run is stale. A bounded diagnostic confirmed
  that gap; no unverified harness rewrite was shipped.

- **The held playtest release is shipped at `1ef1667` and live on Railway.** A touch-held foe
  inspector now explains its close gesture and consumes the next deliberate tap anywhere before
  dismissing, so the overlay cannot stick or leak a card play/target change underneath. Mobile hero
  portraits shrink from radius 36 to 28 when five or more bodies are visible, while their 37px touch
  radius remains intact. The body picker no longer repeats “N upgrade points follow” on every option.
  Market-Crash Minotaur and Bond Behemoth's damage-trigger shield Specialties are gone: their capped
  two-point rows now start combat with 1 moxie / +1 generic damage respectively, and an exact registry
  regression requires the reactive-shield roster to stay empty.
- Release verification: game **2488/0**, passive causal sandbox **340/0**, squad **28/0**, telemetry
  **86/0**, fuzz **60/60**, and local plus Railway serve **67/0**. The current-HEAD local and production
  852×393 real runs both traversed `draft → won → setup → playing → lost` with zero JS errors, 404s,
  or missing art (`tools/shots/real-mobile-2026-07-19T04-49-33` and `04-54-10`). The bounded two-player
  harness verified join/draft/vote/lock/tie flow with zero JS errors; one known sustain-wall attempt
  stalled, then its fresh-room attempt won. Railway deployment `4620cacc-2967-46c1-b382-a0f43a7e4f4c`
  is `SUCCESS`/`RUNNING` on commit `1ef1667`. With zero established player sockets, local Bun moved
  from PID `40400` to `40092`; Cloudflared stayed on PID `11488`.
- **Latest genuine-session evidence:** production run `run-2026-07-19T03-50-00-905Z-D` recorded 10
  fights (9 wins / 1 loss): Royal Rat + Golden Golem, with Royal Rat swapping to Interest Imp before
  defeating floor-one Djinn; the party then lost in floor two. Golden Golem stopped 138 shield damage
  versus 42 HP damage, starter pairs were heavily rebuilt by combat two, expensive Gun/Glacius/Fire
  draws were mostly stranded/98% unaffordable, and sustain frequently overshot. The earlier same-day
  Fat Cat/Fundjin run `run-2026-07-18T18-18-07-046Z-D` is captured too: 16 fights, 15 wins, floor 3,
  with Hydra and Litigation Lich defeated. Known telemetry/log gaps: Djinn's boss key was absent from
  its room-result fields, false copies misleadingly log “Djinn of Deals falls,” and `harness:false`
  means non-harness provenance rather than cryptographic human identity.

- **The level-up balance correction and distinct summoner identities shipped in `0bc9750` and are
  live on Railway.** Neptune Mastery now lowers both its tax (+2→+1) and replay threshold (6+→5+),
  so the effective-cost boundary moves coherently. Fundjin's hidden timer-to-moxie conversion is
  gone; its intentionally huge 5-point Mastery adds a separate six-moxie trigger for both gods while
  the original six-second clocks remain independent.
- The four summoners now own non-overlapping summon-wide Specialties through the shared summon seam:
  Fat Cat grants +1 melee/ranged damage per rank to every summoned entity (one grant for a merged rat
  stack), Royal Rat grants +1 innate shield per rank to every summon (each rat contributes shield to
  its merged stack), Paid Piper creates +1 body per rank, and Affluence Anubis grants +1 flat armor
  per summoned entity/rank. Armor now works on friendly summons for front and lane-wide hits with the
  same minimum-1 convention as foe bodies. Fat Cat's bonus reaches both summon cards and passive
  attacks on hero and foe teams.
- Reviewed overtuned rows were narrowed without changing base bodies or cards: Royal Rat/Paid Piper/
  Anubis Masteries cost 4; Interest Imp rows cost 3; Basilisk costs 3/4; Medusa and Castle Masteries
  cost 3; Minotaur and Behemoth's damage-trigger shield rows were later replaced entirely. Saturating
  Specialties now stop at their last useful rank: Centaur 9, Mouse 9, Lizard Wizard 10, Killionaire
  8, Basilisk 2, and Medusa 9; combat-start moxie is also defensively clamped to 10.
- Independent read-only balance review found and closed two false-positive seams before release:
  Anubis armor had only been stored on friendly tokens, and Fat Cat fields did not affect passive
  attacks. Functional regressions now prove landed damage/mitigation, merged-rat semantics, exact
  first-legal Mastery levels, cap rejection, Neptune's boundary, and Fundjin's independent clocks.
  Verification: game **2485/0** plus BABER/summon and clock regressions, passive sandbox **340/0**,
  squad **28/0**, telemetry **86/0**, serve **64/0** locally and on Railway, and fuzz **60/60**.
  Railway deployment `5513cb47-55ba-4dd2-9c12-bcdce52c8ce9` passed health. A fresh two-player
  production lifecycle reached `draft → won → setup → playing → lost` with zero JS errors, 404s, or
  missing art; capture: `tools/shots/real-mobile-2026-07-19T03-38-47`. With zero established player
  sockets, the Cloudflare path's Bun owner of `:3000` was refreshed from PID `26132` to `40400`;
  Cloudflared remained untouched.

- **The one-action multiplayer boss rewrite and Dakota's authored Kraken/King designs shipped in
  `d3bb541` and are live on Railway.** Hydra, Lich, Djinn, Kraken, and King now expose exactly one
  authored deck card at a time; the card captures the number of present human seats when drawn and
  scales its effect by that count. A disconnect cannot mutate an already-telegraphed action. Boss
  core rules such as Hydra growth, Lich stance, and Kraken theft remain separate clocks rather than
  counterfeit extra deck cards.
- Kraken is a true four-lane backline body with one separate theft clock and one three-card deck.
  Theft splices an exact minted card from a living player's draw or used pile, prioritizing active
  damage/self-shield cards, then damaging passives, then anything available. The card is absent until
  its floor×5-HP animated foe dies or Kraken dies, then the exact ID returns to its original pile.
  Only one stolen card-foe can exist globally. Tentacles creates one 8-HP/current-HP attacker per
  present human in distinct lanes (floor costs 4/3/2/2); Lightning Storm deals floor×3 per lane;
  Barnacle Swarm applies a six-second party/summon damage penalty that ramps by one per play.
- King is one lane-bound body in a four-lane arena with literal **99 HP per present human**, no
  stance, and exactly four cards: Party creates P exact-ante-14 armed foes plus P 10-HP animated
  high-impact items; Dunk deals 10×P melee to the front target; Finger Beam locks the highest-value
  hero lane at draw and deals 6×P to everyone there; Gambit resolves distinct existing buff cards
  worth exactly 10 moxie. After every card, King moves to the literal back of the foe lane with the
  greatest HP+shield screen. On short phones King and a blocker share one split tactical row with
  distinct tap targets, keeping the full rule visible without overlapping the player.
- Verification for `d3bb541`: game **2441/0** plus BABER/summon and room-clock regressions, passive
  sandbox **340/0**, squad **28/0**, telemetry **86/0**, fresh-server serve **64/0**, fuzz **60/60**,
  and a fresh two-WebSocket multiplayer smoke pass. Exact Kraken/King 852×393@3 scenarios had zero
  JS errors and zero foe/hero or boss/hero overlaps:
  `tools/shots/scenario-boss-readability-kraken-2026-07-19T01-39-38` and
  `tools/shots/scenario-boss-readability-king-mimic-2026-07-19T01-51-35`. The final local real-phone
  lifecycle reached `draft → won → setup → playing → lost` with no JS/HTTP/art errors. Railway then
  served the new Kraken/King markers; a fresh production phone run reached
  `draft → won → setup → playing → won`, cleared two nodes, and had zero JS errors, 404s, or missing
  art. Production capture: `tools/shots/real-mobile-2026-07-19T02-17-32`. With zero established
  player sockets, the Cloudflare path's Bun owner of `:3000` was refreshed from PID `43720` to
  `26132`; Cloudflared remained PID `11488`. The tunnel serves the same new markers and passed serve
  **64/0**.

- **The shared player combat clock shipped in `450a223` and is live on Railway.** The live HUD cycles
  `1× → ½× → ¼×`; every human seat owns its request and the slowest present player wins,
  so one partner can create breathing room without another accidentally speeding the fight back up.
  Disconnected seats stop holding the clock slow and recover their saved request on reconnect.
  The server keeps networking, snapshots, and input at 10 Hz while gating deterministic simulation
  ticks, so cards, bosses, summons, hazards, moxie, passives, and countdowns all slow together without
  making taps or co-op synchronization sluggish. `combat/clock_cycle` and accepted `clock_change`
  telemetry expose interaction and effective speed without client-side duplication.
- Verification for `450a223`: game **2427/0**, passive sandbox **340/0**, squad **28/0**, telemetry
  **86/0**, serve **64/0** locally and on Railway, fuzz **60/60**, plus deterministic divisor,
  disconnect/reconnect, invalid-request, and real two-WebSocket negotiation coverage. Exact
  852×393@3 quarter-speed QA proved a 44×30 target, one HUD row, in-bounds canvas, and zero render/
  JS/HTTP errors; capture: `tools/shots/clock-quarter-852x393.png` (generated/ignored). A fresh local
  run reached `draft → won → setup → playing → won`; a fresh production phone run reached live
  Djinn combat and a normal defeat with zero JS errors, 404s, or missing art. Railway deployment
  `a967908f-0dda-4b74-a83b-7050505dc050` served the new client and passed the full live suite.
- The prior requested no-tuning treasure-value report is now durable at
  `CARD_VALUE_AUDIT_2026-07-18.md` (`5eeb326`). It audits every collectible's ◈V1–V5 tier, value×cost
  structure, runtime economy consumers, and frozen production interaction evidence without proposing
  or changing cards or values.

- **Summoner-wide progression, BABER partner assist, and the Djinn/King phone repair shipped in
  `9e6134f`.** Fat Cat, Royal Rat, Paid Piper, and Affluence Anubis Masteries now add +1 damage to
  every body they summon while retaining their authored trigger improvements. Their Specialties now
  apply to every summon source, not only passive rats: Fat Cat grants summon HP, Royal Rat shields
  every third summon, and Paid Piper/Anubis add bodies to every summon effect. The shared summon
  constructor owns the rule for hero/foe symmetry, including merged rat stacks and non-rat cards.
- Exact room code `BABER` is an isolated partner-playtest assist. Each player gets **3× body base HP**
  (level HP remains ordinarily additive), and damage whose source is a foe is halved with upward
  rounding/minimum 1. Body swaps retain the assist; self/friendly damage and every other room code
  remain unchanged. Direct regression lives in `test/baber-summons.test.js`.
- Short-touch Djinn now uses one command surface plus a small medallion at its literal lane/depth;
  repeated `LANE/BACK/BEHIND` prose and the giant tornado placeholder are gone. King Mimic omits the
  redundant full five-mode rule catalog on short screens so his court gets a readable row. Exact
  852×393 scenarios passed strict hitbox-overlap proofs. iOS lobby now explains the only reliable
  chrome-free Safari path—Share → Add to Home Screen—and the board disables browser pan/overscroll.
- The frozen production audit is `PLAYTEST_AUDIT_2026-07-18.md`: first 4,480 Railway events / 162
  runs, excluding 95 harness events / 18 harness runs, leaves 144 telemetry-classified human runs.
  Of 323 resolved combats, 220 were wins and 103 losses; two runs cleared the throne. The card pool
  is verified at 79 cards (costs 1–10). The gap-only matrix records actual empty/thin cells without
  proposing cards; summon breadth is thinnest, high-cost resource/defense bands are empty, ranged
  has endpoint gaps, and 53/79 cards are concentrated at costs 3–5. `harness:false` is provenance,
  not proof of physical operator identity, and the report says so explicitly.
- Verification for `9e6134f`: game **2427/0** plus BABER/summon regression, passive sandbox
  **340/0**, squad **28/0**, telemetry **84/0**, serve **54/0**, fuzz **60/60**. Exact Djinn and King
  phone scenarios and a fresh two-node real local lifecycle completed with zero JS errors, 404s, or
  missing art.

- **Production run recovery, semantic UI telemetry, and the prominent melt flow shipped in runtime
  `9f4d6e1`.** Today's Fat Cat/Fundjin two-human run was never missing: Railway's persistent
  `/var/data/telemetry.jsonl` records room D, run `run-2026-07-18T18-18-07-046Z-D`, starting 13:18
  CDT. It reached floor 3, completed 16 combats (15 wins / 1 loss), beat Hydra and Litigation Lich,
  and converted Fundjin's bag for ◈25. The earlier audit searched only the laptop-local archive and
  incorrectly reported the production session absent. Production Railway data is canonical for real
  remote play; local telemetry is verification/harness history.
- `tools/telemetry-report.js` now accepts `--stdin`, `--file`, and `--run`, so the canonical exact-run
  production report is one command: `bunx @railway/cli ssh cat /var/data/telemetry.jsonl | bun
  tools/telemetry-report.js --stdin --run <runId>`. The recovered run's human-seat summary is 16
  measured fights / 32 seat-results; Fat Cat went 15/16 and Fundjin 11/12 while present. In the final
  fight, Fundjin's 8 HP was removed by Arcane 1 + Wind 2 + Basilisk Ice 3 + enemy Fundjin passive 1
  + the final point of Medusa Ice; Fat Cat later died to Medusa Power Word: Gun for 13 requested / 9
  effective damage.
- New privacy-safe `ui_interaction` rows measure semantic surfaces/actions, not coordinates, player
  names, DOM text, or arbitrary client strings. Server-authoritative command attempts cover combat,
  draft, rooms, stock, build, loot, shop, trade, and squad actions; local events cover screen views,
  tabs, panel disclosure, and melt arm/cancel. The report prints surface totals plus action share for
  genuine human seats. This starts collecting after this deployment and cannot reconstruct screen
  interactions from the pre-deployment Fat Cat/Fundjin run.
- **MELT EXCESS CARDS is now a full-width gold progression callout above both card grids**, with a
  large `+◈ payout`, backpack count, deck-safety copy, post-melt bank total, and large two-step
  confirmation/cancel targets. The economy value and irreversible confirmation rule are unchanged.
  Exact 852×393@3 touch captures:
  `tools/shots/scenario-melt-excess-cards-2026-07-18T20-07-45/02-large-melt-payout.png` and
  `03-large-melt-confirmation.png`; the live scenario produced zero JS/HTTP/layout errors.

- **Dakota's two-player combat-readability playtest fixes shipped in `15d50ea` and are live on
  Railway and the active Cloudflare-tunneled local server.** At 852×393 touch, Hydra/Lich command
  decks now collapse into a short command rail instead of covering the party; the Lich stance takes
  the redundant rule row's place, up to four concurrent actions fit one row, and active boss effects
  move into the identity line. The scenario harness now fails if a boss panel intersects any hero
  hitbox, closing the geometry hole that let the three screenshots pass older checks.
- Active foe effects are now laid out before optional duplicate moxie text, so Pet Leech cannot be
  squeezed off Nepotistic Neptune. Rat and Large Rat use distinct clean mouse silhouettes, and summon
  names paint after their portraits instead of being hidden by them. A downed co-op body keeps the
  structured lethal source/card visible during the continuing fight (`DOWN · Neptune/Dagger · 1 HP`).
  Rat-stack logs retain their live count, so a scaled 9-rat Bite is no longer reported as generic
  `foe Rat`.
- **No room-balance values changed.** The room generator already scales total ante from party size ×
  floor, then deliberately distributes that budget through equally weighted eligible skews
  (`swarm`, `veteran`, `arsenal`, `bodies`, `mixed`). The screenshot's two seven-body rooms beside one
  Atlas L4 room are the intended count-concentrated contrast: both competition scaling and high-count
  rolls happened. Treat reweighting/capping that diversity as an owner decision after more play, not
  an automatic correction.
- The older local room M archive remains useful historical evidence (eight wins then a loss, including
  a 10-damage Economy Elemental Black Hole and a nine-rat Royal Rat), but it is not today's session.
  Do not use laptop-local absence to infer production absence again; query Railway's persistent volume.
- Verification for `15d50ea`: game **2426/0**, passive sandbox **340/0**, squad **28/0**, telemetry
  **69/0**, serve **51/0**, fuzz **60/60**. Exact two-client Hydra, Lich, and
  Neptune/leech/rat/death scenarios passed at 852×393@3 touch with zero JS errors and zero
  boss/hero or foe/hero overlaps. The real two-browser co-op harness completed two won games with zero
  JS errors; the current-commit local lifecycle and fresh deployed Railway lifecycle had zero JS
  errors, 404s, or missing art. Railway and the Cloudflare tunnel each passed serve **51/0** and both
  serve the new client markers. Cloudflared remains PID `11488`; the refreshed Bun owner of `:3000`
  is PID `4764`.

- **Run-persistent shared spoils shipped in `335ec58` and are live on Railway and the active
  Cloudflare-tunneled local server.** Co-op `room.loot` is now one shared pool for the whole run:
  unclaimed cards survive room entry, shops, and floor descent; new drops append; a successful claim
  removes exactly one copy. Only `startDraft` (a genuinely new run) clears the pool.
- The exact reported Lion Lance failure is regression-locked with two seats: the first split leaves
  both unable to afford it, a failed claim changes nothing, advancing into setup preserves it, and a
  later clear adds only its new drop value to bid points. Lion Lance then reappears in the won snapshot
  and can be claimed with accumulated points. Carried cards are not re-funded or re-counted as fresh
  `loot_offer` telemetry. The UI now labels this explicitly as shared spoils that carry forward.
- Verification for `335ec58`: game **2423/0**, passive sandbox **340/0**, squad **28/0**, telemetry
  **69/0**, serve **51/0**, fuzz **60/60**. The current-commit local real-phone run cleared two nodes
  with zero JS errors/404s/missing art. The real two-browser co-op harness completed two won games,
  passed every vote/lock gate, rendered the shared-pool message legibly, and left zero JS errors or
  processes. Railway served the new marker, passed serve **51/0**, and completed a fresh deployed
  852×393 touch lifecycle through real combat with zero client errors.

- **Dakota's pre-playtest combat patch shipped in `215ab0a` and is live on Railway and the active
  Cloudflare-tunneled local server.** Player effects now have a dedicated rail strictly below the
  HP/shield plate. The rear friendly anchor reserves the complete body → HP → effects footprint, so
  the rail never clamps over HP or retreats into the portrait at 852×393 touch.
- Market-Crash Minotaur and Bond Behemoth were the exact two bodies whose repeatable damage-trigger
  Specialty could reach 3 shield on a 3-damage clock and self-sustain through shield-absorbed hits.
  Both Specialties are now capped at rank 1 and always grant exactly 2 shield, including stale or
  injected higher-rank state. Rank 2 is rejected by allocation, while a repeated 3-damage hit through
  the 2 shield still triggers the passive and necessarily loses 1 HP.
- **Every main boss body has its original HP again:** body base × party size × floor/throne budget.
  All other `3202cad` difficulty reductions remain at 50% with upward rounding/minimum 1: direct
  output, healing, summon/wall/court counts, Hydra growth, Lich orbs, Djinn hazards, Kraken tentacles,
  and Kraken/King stolen-card entities. Boss cadence, movement, stance, concurrency, and the fixed
  readable command panels remain unchanged.
- Verification for `215ab0a`: game **2406/0**, passive sandbox **340/0**, squad **28/0**, telemetry
  **69/0**, serve **51/0**, fuzz **60/60**. The exact three-effect phone scenario visibly proved the
  body → HP → effects order at 852×393@3 touch with zero client errors. Fresh current-commit local and
  deployed real-phone lifecycles passed with zero JS errors, 404s, or missing art; Railway separately
  passed serve **51/0** and served the new layout marker.

- **The causal body-passive sandbox and Dakota's Minotaur/Lich playtest repair shipped in `83c53e3`
  and are live on Railway.** `bun run test:passives` now executes all 34 wearable bodies as hero and
  foe across base/Mastery/Specialty, plus a same-level no-rank control for every ranked cell: **340
  causal executions** through real public card, damage, summon, and tick resolvers. The suite is a CI
  gate and fails on missing roster entries. A guarded Developer Lab preset and two exact phone
  scenarios cover the ranked Minotaur and floor-one Litigation Lich in the live client.
- The Minotaur combat passive itself was correct when its allocation reached the server. The owner
  failure was an interaction trap: `+`/`−` edited only local state until a separate Apply button, so
  combat could silently start with the previous all-zero allocation. Free reallocations now save on
  every valid tap and clear their Saving state only after an authoritative snapshot. Combat telemetry
  records the exact allocation and aggregate shield granted. The real browser path showed
  `Market-Crash Minotaur … +2🛡 · 🗡1`, then exercised melee `1→0→1` with both acknowledgements clean.
- The new matrix immediately caught and repaired a real foe-symmetry bug: Centless Centaur Mastery,
  Penny-Pinching Pixie Specialty, and Pyramid-Scheme Head Specialty calculated flat output boosts but
  foe `deal` ops dropped them. A same-level negative control and a no-amount Shield Bash regression
  prevent level coupling and double-applied output from faking a pass.
- **Litigation Lich's Power Word: Annihilate now deals normal `floor × 5` damage.** Shields absorb it
  before HP; it also respects mitigation, reactions, ordinary damage logging, lethality, and telemetry
  instead of forcing HP to one. Bone Legjon summons one ordinary body per floor, so floor 1 summons
  exactly one body and the first floor-one
  Bone + Frost cycle is Lich plus two adds (**3 total**, down from 4). This is the narrow owner-requested
  wave-count correction; repeated deck cycles are still uncapped and remain a separate tuning choice.
- Verification for `83c53e3`: game **2369/0**, passive sandbox **340/0**, squad **28/0**, telemetry
  **69/0**, serve **51/0**, fuzz **60/60** (one known sustain-wall stall abandoned), exact Minotaur and
  Lich 852×393 scenarios clean, in-app allocation/passive play clean, and a local real two-node run
  cleared both nodes with zero JS errors/404s/missing art. Production served the new client markers,
  passed serve **51/0**, and completed two fresh 852×393 touch lifecycles through setup/combat/loss
  with zero JS errors/404s/missing art.

- **Depth-honest summon formation and the single full combat log shipped in `eb429d7` and are live
  on Railway.** Wide hero groups now follow their real server front-to-back order on a readable
  diagonal: a cyan depth rail points toward the foe and the actual first blocker is labeled
  `1 · FRONT`. Summons keep full body silhouettes instead of being flattened, and the summon body
  itself remains the only tap/click target. Exact fixture:
  `tools/scenarios/summon-depth-formation.json`.
- **Defeat now shows one accurate chronological combat log and no secondary recap.** `HOW YOU DIED`,
  `WHAT JUST HAPPENED`, and duplicate summary logic are gone. The modal gives the full bounded log
  nearly all available height, scrolls to the newest entry, preserves the individual cast/proc/heal/
  shield/damage/down events, and correctly color-classifies indented entries. Exact fixture:
  `tools/scenarios/defeat-full-combat-log.json`.
- Verification for `eb429d7`: game **2357/0**, squad **28/0**, telemetry **69/0**, serve **51/0**,
  fuzz **60/60**, plus 2-player/4-player smoke and reconnect green. Both exact 852×393 fixtures and
  the local real two-node lifecycle had zero JS errors, 404s, or missing art. Production served the
  commit marker, passed serve **51/0**, and completed a fresh real-phone lifecycle through a loss;
  its single 36-entry full log showed the lethal damage chain with zero client errors, 404s, or
  missing art.
- **Ranked body-upgrade repair and summon-body rendering shipped in `259b176` and are live on
  Railway.** HP progression is now regression-locked at base max HP plus exactly `4 × health rank`
  for ranks 1–3, and the level sheet states both the cumulative bonus and resulting max-HP preview.
  Combat snapshots, trackers, inspection, and the worn-body reader now all consume the leveled body
  and leveled passive text, so Fat Cat Mastery displays and tracks a 2-damage trigger instead of the
  base 3. Every one of the 34 wearable bodies has an automated non-base ranked-combat-text check.
- Three functional upgrade mismatches found during the roster-wide audit were repaired symmetrically
  for players and foes: Rat Baron/Lizard Wizard refund the first ranged card even after an earlier
  melee play; Pixie's specialty boosts only melee cards that actually received its body discount; and
  Weary Wageslave's specialty adds its lane hit without replacing the base front hit. Bribed Bishop,
  Atlas, Fundjin, and other transform/start-of-combat paths received focused regression coverage.
- **Summons now read as bodies on the board.** Friendly summons use the depth-honest diagonal
  formation described above; ordinary hostile summons use circular body portraits with cast rings
  plus attached HP/action text; only true overflow falls back to the compact tactical treatment. The
  body itself is the sole tap/click target. Golden Golem's hero chassis was enlarged and no longer
  gets vertically compressed by the friendly-summon budget. The original Golden Golem + Hedgefund
  Knight + three-rat phone fixture remains at `tools/scenarios/summon-body-regression.json`.
- Verification for `259b176`: game **2355/0**, squad **28/0**, telemetry **69/0**, serve **50/0**,
  fuzz **60/60**, multiplayer 2-player and 4-player smoke plus reconnect green. The exact summon
  fixture and local real 852×393 lifecycle had zero JS errors, 404s, or missing art. Production served
  the commit marker, passed serve **50/0**, completed a fresh 852×393 touch lifecycle through real
  combat with zero client errors, and was independently exercised in the in-app browser through
  Golden Golem draft → collapsed setup → Fat Cat combat.
- **Level-up and deck/backpack management are compact by default in `e889e71` and live on Railway.**
  Setup and between-room Backpack screens now show two independent 46px touch disclosures instead of
  rendering the five-row level sheet and full card collection immediately. Their summaries retain the
  current body/level/free points and deck/spare/banked-treasure counts; one tap expands the complete,
  unchanged editor, and the choice persists through authoritative snapshot repaints. Collapsing an
  active level-payment tray safely cancels its local tender. Shop deck/backpack editing uses the same
  disclosure. No engine, economy, body, card, or balance values changed.
- Verification for `e889e71`: game **2270/0**, squad **28/0**, telemetry **69/0**, serve **49/0**,
  fuzz **60/60**, multiplayer smoke green, and local + deployed real 852×393 runs reached
  `draft → won → setup → playing` with zero JS errors, 404s, or missing art. The in-app browser also
  exercised both open/close paths on mobile and desktop, visually inspected the compact setup, and
  entered production combat with zero warnings/errors. Production `test/serve.test.js` passed 49/0.
- **Dakota's summon/Blizzard/death-log playtest pass is shipped in `a132641` and live on Railway.**
  The duplicate summon strip above the hand is gone; the board body is now the sole targeting surface.
  Cramped groups retain one real ID-bearing card per summon and fan/overlap instead of collapsing into
  an untargetable synthetic representative. Blizzard is lane-wide Ice: every foe in the lane takes 3,
  then receives six seconds of damage reduction equal to its own post-mitigation hit; moxie is unchanged.
- **Defeat explanations no longer parse prose or privilege the last boss action.** Every damage instance
  writes a bounded structured event with source body, exact card/effect, requested/resolved damage,
  shield absorption, real HP loss, direct/piercing flags, and lethal status. The client follows the
  dead player's own event chain and labels it `HOW YOU DIED`. The reproduced Lich→Mouse case now says
  Annihilate set Paid Piper from 9→1, then Malevolent Mouse's Sword resolved for 4, removed the one
  remaining HP, and was lethal. Player and body names are shown together (`Paid Piper (Dako)`).
- Verification for `a132641`: game **2305/0**, squad **28/0**, telemetry **69/0**, serve **48/0**,
  fuzz **60/60**, multiplayer smoke green. Exact 852×393 touch fixtures visually verified board-only
  summon cards and the structured lethal recap with zero browser errors. The local real lifecycle and
  deployed Railway lifecycle both reached `draft → won → setup → playing → won` with two cleared nodes,
  zero JS errors, zero 404s, and no missing art. The randomized shop-seeking `test/e2e.js` remains stale:
  it failed twice after not finding the now-5%-rare shop and reports `attempt undefined`; this is a test
  harness problem, not a failure in the verified combat lifecycle.
- **Point leveling and the three shared elite tiers shipped in `f895fcf` and are live on Railway.**
  Every level above 1 grants one freely reallocatable point. Health (`+4 HP`), melee (`+1`), and ranged
  (`+1`) each cost one point; row four is a one-time body-specific Mastery and row five is a repeatable
  body-specific Specialty. All 34 wearable bodies have authored rows, and foes spend the same exact
  point budget randomly and expose that allocation in inspection. The five-row sheet, allocation
  persistence, atomic level-up/body-swap handling, and all authored combat effects are implemented.
- **Elite access is fantasy-power-first and deliberately conservative:** Tier I is Killionaire, Audit
  Angel, Depression Demon, and Bookie Bonelord (`+2` foe ante / `◈4` adoption); Tier II is Basilisk,
  Medusa, Debt Dragon, and Wandering Castle (`+4` / `◈7`); Tier III mythic is Fundjin, Neptune, Atlas,
  Sphinx, and Affluence Anubis (`+6` / `◈11`). Base bodies and cards were not broadly rebalanced.
  `LEVELING_AND_ELITE_TIERS.md` is the canonical owner-editable artifact; `engine/leveling.js` is the
  runtime table. Verification: game **2270/0**, squad **28/0**, telemetry **69/0**, serve **48/0**,
  fuzz **60/60**, and multiplayer smoke green. Local and deployed lifecycles reached
  `draft → won → setup → playing → won`; production showed the five-row level sheet and tier prices
  with no browser warnings or errors.
- **2026-07-17 production incident fixed and verified at runtime commit `97b99d3`.** The summon-card
  refactor in `bab360c` deleted the `crowdH` declaration but left its use in `_renderFrame`, causing
  every setup/playing snapshot to throw after clearing the canvas. The hotfix restores the crowd
  calculation and exposes render-error diagnostics. Full local bar: game **2296/0**, squad **28/0**,
  telemetry **69/0**, fuzz **60/60**, serve **48/0**. The real local phone run reached
  `draft → won → setup → playing → won` with zero JS errors.
- **Production was verified through the exact lifecycle, not just `/health`:** a fresh normal room at
  the phone-landscape/touch profile reached setup and playing with zero JS/render errors, one hero
  hitbox, one foe hitbox, a real board, and a visibly populated hero/foe/hand/HUD frame. The canonical
  `tools/shoot.mjs` now supports `BASE=https://…`, hard-fails on errors/blank render health, and exits
  nonzero instead of printing a warning and returning success. `CLAUDE.md` plus the repo verify skill
  now make the current-HEAD local gate and post-deploy production lifecycle mandatory.
- Checkout: `C:\Users\dakot\king-mimic` on `feat/room-draft-overhaul`.
- **Public production is deployed on Railway:**
  **https://king-mimic-production.up.railway.app**. Railway project `8498af62-f404-4661-ae04-6442e9921943`,
  service `4ddfd526-e710-429b-b7d1-0f61e2951a33`, environment
  `69ce51ab-225f-4c80-af2f-c7dda7f6445d`. The automatic rollout served `bab360c` by
  00:01 CDT on 2026-07-17. Railway builds the repo `Dockerfile` with Bun 1.3.14, tracks
  `feat/room-draft-overhaul`, uses Railway's injected `PORT=8080`, and checks `/health`.
- Production telemetry and combat logs use `KM_DATA_DIR=/var/data`, backed by attached persistent
  volume `king-mimic-volume` mounted at `/var/data`. The server's data-path behavior also passed a
  local isolated persistence probe. Do not remove the volume or the variable during redeploys.
- Hosted verification after rollout: `/health` returned HTTP 200; the new sim page, raw JSON, and
  summon client markers are served; the complete Railway suite passed **48/0**. The report was also
  visually inspected at 852×393 and 393×852 from the production URL with zero fresh browser errors.
- The complete mobile-first combat-simulation report is live at
  **https://king-mimic-production.up.railway.app/sim-results.html** with raw data at
  `/combat-sim-results.json`. It publishes every row for all 34 bodies: **34,000** paired
  fixed-deck fights plus **13,600** authored-starter fights (**47,600 total**), along with the seed,
  policy, timeout, filtering, sorting, and caveats. Regenerate it with
  `bun run tools/generate-combat-report.mjs` before publishing engine-affecting balance changes.
- The Railway account is currently on the trial allowance (30 days or $5, whichever is exhausted
  first). Dakota must upgrade the Railway plan before the allowance expires to keep production
  continuously available.
- The local fallback was refreshed after confirming zero established sockets: Bun **PID `36944`**
  owns `:3000`; Cloudflared **PID `11488`** remains untouched and serves
  **https://pads-corn-refuse-relationship.trycloudflare.com**. The Railway URL is the stable address
  to share. Local and tunnel endpoints both pass the same **48/0** served-build suite.
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
  - Friendly summons now render as named rectangular tactical cards instead of player-sized circles.
    Touch layouts provide 46px-high targets and a stationary strip above the hand; cramped groups
    collapse to one named group card. Hostile summons are rectangular too, with at least a 44px
    logical touch target and named group targeting for swarms. Overlapping hitboxes resolve to the
    nearest center, and the selected ally is outlined in both the board card and pinned strip.
  - Foes whose passives can otherwise roll blank receive at most one same-value synergy replacement:
    Lizard Wizard/ranged, Penny-Pinching Pixie/melee, Depression Demon/debuff, Neptune/5+ cost,
    Audit Angel/non-damage, Bribed Bishop/heal, Sphinx/ranged damage, Wandering Castle/5+ cost, and
    Rent-Seeking Runeblade/melee+ranged. Card count, ante, first damaging slot, rich upgrades, and
    Djinn Coercion's exact ante remain intact.
- Historical comparative simulation evidence from the earlier isolated harness, not autonomous
  tuning (do not confuse these numbers with the current published report):
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
- An unaffordable manual card tap now arms one server-authoritative queued intent. It fires on the
  first tick its live cost is affordable; the same card toggles it off, another card replaces it,
  and any later combat input cancels it. AUTO stays parked while a manual intent is armed. The card
  and moxie rail show a persistent gold `QUEUED` treatment, and queue/cast/cancel telemetry is bounded.
- `ROOM OPTIONS` from setup now returns to the room chooser on the first click. The engine rollback
  was already correct; the client overlay signature had incorrectly treated the restored won state
  as already painted. The earlier handoff was wrong to call this complete: it verified only the
  trailhead path while both owner-facing servers still served the stale client. Corrected proof drove
  the real lifecycle `win combat → choose later room → ROOM OPTIONS once → three choices visible →
  choose another room → begin combat`, then verified the public, local, and tunnel artifacts.
- Boss snapshots now expose resolver-derived intents, actual target IDs, exact Lich stance seconds,
  and bounded structured resolution events. Every authored Hydra/Lich/Djinn deck action names what
  it will do; Lich Annihilate logs the exact direct HP loss and appears in damage telemetry. Defeat
  adds a concise `WHAT JUST HAPPENED` recap before the full log. Four touch clocks use a readable 2×2
  grid; foe tweening cannot cover the banner; four-player friendly summons use compact tactical chips.
- Audit comparison through draft → room choice → setup → combat remains **3 taps / 0 intercepted
  taps / 0 ambiguous states**. The former rejected-card probe is now the queued-card scenario; it
  proves persistent intent and first-affordable-tick resolution rather than a transient rejection.
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
- Verification at `94354cc`: game **2296/0**, squad **28/0**, telemetry **69/0**, fuzz **60/60**,
  and local/public/tunnel serve **43/0 each**. The in-app browser verified the exact post-combat
  later-room rollback, immediate re-selection, and forward progress into combat with zero JS errors.
  Four independent browser clients drove both final 852×393 DPR3 touch captures with **0 JS errors**:
  `tools/shots/scenario-four-player-big-room-2026-07-16T23-01-26` (16 opening foes plus a hectic
  follow-through) and `tools/shots/scenario-four-player-lich-stress-2026-07-16T23-01-40` (four live
  Lich intents plus adds). Queued-card proof is
  `tools/shots/scenario-touch-queued-card-feedback-2026-07-16T23-00-13`.
  The canonical non-injected solo run `tools/shots/real-mobile-2026-07-16T22-56-20` had 0 JS errors,
  0 404s, and no missing art, but exhausted its 180s budget in the known Economy Elemental sustain
  wall (foe stayed 7/7 while shield grew to +40); inspection confirmed ongoing casts, not a queue stall.
- Verification at runtime commit `bab360c`: game **2296/0**, squad **28/0**, telemetry **69/0**,
  fuzz **60/60** full runs, and local/tunnel/Railway serve **48/0 each**. The real 852×393 touch
  scenario used four friendly summons and seven hostile entities: taps on the pinned Earth Elemental,
  the board rat card, and a collapsed hostile group all changed the intended live target. A fresh
  reload produced zero browser errors. Production report rows and the lobby link were inspected at
  852×393 and the report was also inspected at 393×852. This real interaction pass caught and
  fixed an undefined render variable; the report pass caught and replaced misleading post-cleanup HP
  with tracked lowest HP reached. Do not hand off future interaction work without equivalent served,
  owner-path verification.
- Historical verification at runtime commit `8fff3b3`: game **2231/0**, squad **28/0**, telemetry **69/0**,
  fuzz **60/60** full runs with no invariant failures, and local serve **36/0**. The corrected-state
  real 852×393 touch run at `tools/shots/real-mobile-2026-07-16T05-46-39` traversed draft through
  three real combats and a loss in 65 frames with **0 JS errors**, 0 404s, and no missing art. The
  two-client run at `tools/shots/mp-2026-07-16T05-48-33` won both games, passed all room vote/lock
  progression checks, and had **0 JS errors**. Representative combat and co-op result frames were
  visually inspected. The post-rollout public serve suite also passed **36/0**.
- `tools/scenarios/touch-rejected-feedback.json` retains its historical filename but now carries the
  scenario name `touch-queued-card-feedback` and proves immediate queue, persistence while banking,
  and automatic resolution. Do not restore the retired 700ms rejection flash.
- `KEEP_HARNESS=1 bun run tools/telemetry-report.js` successfully renders the new starter-cut,
  card conversion/affordability, sustain, and body-outcome sections from fresh measured combats.
- Dakota reviewed the graphics positively. This is not a visual-redesign mandate; improve visual
  feedback only where it materially improves input confidence, selection state, target clarity,
  reversibility, or transition flow.
- Current content facts for later owner notes: 22 common wearable bodies, 15 elite wearable
  bodies, 114 normal player cards, 1 archived player card, and 6 summon-only cards. Starter offers
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

Before resuming the balance cohort, run one focused **real two-device Party Mode graphics acceptance
session** on production runtime `fb33e65`. Keep both devices connected in combat for at least 30
seconds (long enough to cross multiple staggered keyframes), queue different cards on both devices,
cycle into a companion, and deliberately play one single-target, one Spear/multi-hit, one lane card,
one support card, and one passive/recurring effect. Record whether both devices can tell who cast,
who was hit, and in what order; whether teammate `QUEUED`/`PLAN` and companion `AUTO NEXT` badges are
readable without obscuring bodies; and whether either device freezes or both pause together. The
automated two-client/visual evidence is clean, but this physical-device legibility + felt-lag check
is the remaining authority.

If that session is clean, freeze `fb33e65` and begin **Gate 1 run 1 of exactly 8** using the
configuration table in `PUBLIC_ALPHA_PROTOCOL.md`; the recent all-solo retry cluster does not satisfy
that protocol. Do not tune cards between the eight. Deliberately cover low-cost, high-cost/resource,
sustain/control, summon, AUTO/plan, desktop, two-human mixed-device, role-swapped, and one reconnect
line when offered. Record the deployed commit, device/party, run ID, deepest floor/result, main line,
first rules betrayal, first unclear next action, and whether an immediate replay was voluntary.

The main observation question is now: **does an expensive opening hand cause the floor-one deaths,
or does the player fail to recognize/use available moxie lines?** Watch the first two manual-phone
runs without coaching. Do not preemptively buff the six flagged cards from one player's repeated
sample. If the pattern survives Gate 1, add shield expiry/end-state attribution before deciding that
Force/Earth are oversized and inspect Pet Leech timing before reducing its value. After Gate 1,
proceed to five uncoached fresh-stranger solo sessions; public payment testing remains Gate 5, not
the next step. Production telemetry is canonical for remote play; simulations are evidence for
questions, never authority to change authored values.
Treat the present interaction identity as a **soft-real-time tactical deckbuilder / party battler**
rather than a dexterity game: preserve quick decisions and queued intent, but continue removing
small moving targets and any advantage gained mainly by frantic input mashing.

## Active Decisions

- **Combat-graphics seam (2026-07-23):** mechanics author the source, ordered targets, lanes, and
  semantic path shape; the client draws from entity anchors and real card/body art. Do not infer
  targeting from card names or prose, and do not add per-card client branches for ordinary cards.
  Preserve the 32-event server ring, 36-active client cap, overlay merging, and same-resolve dedupe
  unless replacement performance evidence justifies a new budget.
- **Party parity contract (2026-07-23):** Party Mode 2-4 means one normal main body plus 1-3 real
  companion entities with fixed three-card exhaust-before-repeat decks. Real entities supply normal
  lane threat and room rewards; shared level-up costs one ordinary step per owned body, reward points
  are weighted by bodies owned, point allocation remains per body, and treasure is shared through the
  main body. Boss scaling uses the full body roster. Do not independently retune one side of this
  package and break the intended equivalence to the same-size human party.
- **Snapshot rollout contract (2026-07-23):** capable clients receive 10-second, per-socket-staggered
  compact keyframes and cache the static body catalog; legacy clients continue receiving complete
  frames. Network renders are animation-frame coalesced. Keep the explicit capability handshake and
  legacy fallback until old-tab compatibility is deliberately retired.
- **Four-card batch interpretation (Dakota-authored values/costs/numbers, 2026-07-21):** Lightspeed
  Lashwhip hits every foe in the caster's current lane and scales as melee. Guillotwine Axe deals 7;
  its six-second repeat reuses the caster's then-current front/lane and the same overflow rule. Wars
  Eternity remains in play for the fight; each immediate/periodic strike grants shield from the
  resolver's damage-dealt value. Masters Arm branches exactly once per cast; Staff uses the existing
  six-second Haste/double-moxie primitive, Spear uses symmetric `front2`, and autonomous foe/bot or
  invalid choices take Rapier as the explicitly flagged safe fallback. Do not retune these placements
  or numbers without Dakota's play notes.
- **Piercer (owner-authored, 2026-07-21):** V3/M9 melee, deal 9 with the established `pierce +
  noReact` contract, then overflow down the line. Because pierce ignores shield, that untouched
  shield cannot stop excess from reaching the next body. The rule is symmetric for hero/foe copies.
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
- **Boss deck/action-economy ruling (Dakota, 2026-07-18, superseding 2026-07-15 concurrency):** every
  boss has one authored deck card active at a time. That action captures present-human count when
  drawn and scales its effect, rather than creating one card/bar per player. Existing independent
  core/stance/theft clocks remain separate mechanics. Existing boss HP scaling remains except King's
  explicit 99×players rule. Reuse the shared draw/discard/cast conventions and preserve symmetry.
- **Hyper-Inflation Hydra:** its core mechanic is: every 6 seconds, gain `+1` and summon heads equal
  to its current `+1`s. It spans all four lanes. Generic Core/Swarm/Inflation heads independently
  choose a random lane; heads in one lane are a single rat-style pool whose HP, count, and combined
  four-second bite equal the living heads. Deck cards (one authored entry each):
  - `Swarm` — summon `floor` heads into random lanes every 6 seconds.
  - `Regenerate` — heal `floor × 2` every 6 seconds.
  - `Heads Up` — every time Hydra is damaged, summon `floor` heads in the lane that hit it.
  - `Inflation` — gain `+1` melee, then summon heads equal to Hydra's current `+1`s into random lanes.
  - `Bite` — deal melee damage equal to `1 + heads in this lane`.
- **Djinn of Deals:** always use four lanes, including solo. Every card Djinn plays also moves Djinn
  to the distinct back row of whichever other lane contains the most bodies. Deck cards:
  - `Coercion` — summon a `floor × 9` ante foe.
  - `Duplicity` — summon `floor × 3` false Djinn copies. They look like the real body, are defeated
    by one hit, and visually act as though they cast the real Djinn's spells, but their casts have no
    effects.
  - `Scorch` — deal `floor × 3` to each lane.
  - `Tornado` — summon a tornado in the players' lane area. It moves randomly left/right and back
    again, dealing `floor` damage to players who enter its lane or remain there for 6 seconds.
  - `Animate Kitchen` — summon `floor × 4` random attackers drawn from the authored assortment:
    5 HP / very slow / 1 damage; 2 HP / medium-paced / 2 damage; and 3 HP / 2 damage / very slow.
- **Kleptomaniac Kraken:** four-lane backline; one real draw/used-pile card stolen globally until its
  animated floor×5-HP body dies. Deck: P 8-HP/current-HP tentacles in distinct lanes; floor×3
  Lightning Storm per lane; six-second Barnacle Swarm −damage that ramps +1 each play.
- **King Mimic:** one lane-bound body in four lanes, 99 HP per player, no stance. Deck: Party (P
  exact-ante-14 foes + P 10-HP animated items), Dunk (10×P front melee), Finger Beam (6×P on the
  best hero lane), and Gambit (distinct existing buffs totaling exactly 10 moxie). After every card,
  move to the distinct back row of the greatest foe HP+shield screen.
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
  provenance excludes harness events, owner-lab events, and bot seats; use `KEEP_HARNESS=1` or
  `KEEP_OWNER_LAB=1` only when deliberately inspecting those separate verification cohorts.
- Desktop screenshot verification is unavailable on this laptop because its touchscreen makes the
  harness report touch capability. The canonical visual proof is mobile 852×393 DPR3 touch.
- **Deploy safely:** push first, then bounce only the Bun PID owning `:3000`; leave Cloudflared PID
  `11488` alone or the public URL rotates. Check for real established player sockets before restart.
- **Never `git add -A`.** Numerous untracked owner/probe files must remain untracked: design notes,
  scratchpad, `nul`, live/tunnel logs, and `tools/*.mjs` probes/sim outputs. Stage exact files only.
- Preserve archived `KIT.oCrystalBall` outside normal offers; `dBloodIron` is restored and active in
  `PLAYER_POOL`.
- Existing wording/mechanics ambiguities remain owner rulings: Jaw overkill wording, Crystal Ball
  tutoring from discard, and Hedgefund Knight’s baked-in “+1 damage.”
- Do not silently fill boss-design gaps. `Bone Legjon` is preserved with Dakota's authored spelling.
  If implementing Tornado movement, false-copy presentation, kitchen attacker pacing, deck cycling,
  or a cast-bar seam requires a gameplay value not specified above and not already defined by an
  existing shared convention, add a `FLAG` at the definition and report it instead of tuning by feel.

## Pointers

- Run: `bun run server.js`; live report: `bun run tools/telemetry-report.js`; combined verification
  report: `$env:KEEP_HARNESS='1'; bun run tools/telemetry-report.js`.
- Public sim report: `/sim-results.html`; raw matrix: `/combat-sim-results.json`; regenerate both
  matrices with `bun run tools/generate-combat-report.mjs`.
- Test: `bun run test/game.test.js`; `bun run test/owner-lab.test.js`; `bun run test/squad.test.js`;
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
