# HANDOFF — King Mimic — 2026-07-13 17:30 CDT

> Browser co-op deckbuilder roguelike. Dakota owns all design/content/numbers; agents implement
> engine, rendering, and verification. Runtime = Bun. Working branch = `feat/room-draft-overhaul`.
> Read king-mimic/CLAUDE.md before editing anything — verification bar + harness traps live there.

## State (verified unless marked)

- Game HEAD `c51027c`, local == origin, pushed and live. Today's commits are `e7c928a` (canonical
  iPhone 16 QA profile), `3334a59` (player-name normalization + DOM escaping), `2a7fe1b`
  (short-landscape setup/loss/log polish), and `c51027c` (public WebSocket admission envelope).
- **LIVE**: bun PID `8708` on :3000. Same tunnel held throughout:
  **`https://choosing-lbs-font-hamburg.trycloudflare.com`** (cloudflared PID 50072, never bounced).
  Local + tunnel return identical HTTP 200 HTML; served `/client.js` contains the new loss/name
  fixes. Live same-origin WS upgrade = 101; foreign browser Origin = 403.
- **CANONICAL MOBILE TARGET** (`e7c928a`): owner's iPhone 16, landscape, **852×393 CSS px, DPR 3,
  touch**. `shoot.mjs`, `scenario-shot.mjs`, `mobile-verify.mjs`, and `play-smart.mjs` default/assert
  that exact profile (`iphone16` alias also exists). Desktop Edge emulation cannot prove iOS
  `safe-area-inset-*`; one physical-phone pass remains the final Safari/notch proof.
- **PUBLIC INPUT HARDENING** (`3334a59`, `c51027c`): names strip control chars, trim, and cap at 14
  grapheme clusters; every rendered name sink is escaped. Browser WS upgrades require same host,
  forwarded tunnel host, or `KM_ALLOWED_ORIGINS`; payload/rate/active-room/human-seat limits are
  finite and configurable. Reconnect token reclaim is checked before the four-human seat cap.
- **SHORT-LANDSCAPE POLISH** (`2a7fe1b`): setup keeps vertical backpack reachability but suppresses
  the stray horizontal scrollbar; a loss displays exactly one Play Again CTA (modal, then header
  after dismissal); pierce logs now read `⚔ pierces` in both directions.
- **COMBAT FRONTEND REWORK** (`80af290`): every ordinary foe now renders as an equal-priority
  tactical row on desktop + touch — portrait, HP/shield/armor, moxie, next card, cast progress,
  damage, effects, and target/threat rings. Passive prose + full queues moved to hold/hover inspect.
  Map, full inventory rail, duplicate body HUD copy, and the long help paragraph hide only during
  live combat; mobile Restart/Leave collapse to icons. Five foes fit in one lane and remain
  targetable; the 16-foe / four-lane crush also reads clean.
- **MULTIPLAYER DRAFT PRESENCE** (`80af290`): the draft now separates humans from squad bodies and
  shows PARTY count, room code, every human name, online dot, YOU marker, and per-human body readiness.
  Real two-browser proof showed Dakota + Wyatt as two distinct online humans before either picked.
- **DEVELOPER LAB** (`80af290`): `DEVTOOLS.md`, `public/devtools.js`, and the tracked
  `tools/scenarios/crowd-5-foes.json`. Start with `$env:KM_SCENARIO="1"; bun run server.js`, open
  `/?dev=1`, then use presets/JSON plus 999 HP, heal, full moxie, +treasure, unlock bodies,
  foes→1HP, pause/resume, and 100ms step. Two-key gated; normal server refusal is serve-tested.
  Existing `DEMO` remains the run-length boss god mode.
- **VERIFICATION**: game 1480 · squad 22 · fuzz 60 (one known sustain-wall abandonment, no invariant
  failure) · serve 35 · admission 13. Final real `shoot.mjs` on current HEAD asserted 852×393@3 touch,
  cleared one node, and produced 4/4 inspected PNGs with 0 JS/page/HTTP/art errors
  (`tools/shots/real-mobile-2026-07-13T22-25-50`). A preceding exact-profile real run covered
  draft→won→setup→playing→lost in 23 inspected PNGs, and the scoped setup/loss DOM pass rechecked the
  changed states at 852×393. Real `mp-playtest.mjs` passed all 12 co-op/vote gates (14 screenshots,
  0 errors). Exact-profile five-foe scenario passed with 0 errors.
- Previous session commits remain live: `0c10b8b` (summon-block + target-ring) and `451dafd`
  (card-count cap).
- **Foe summons block your melee** (`0c10b8b`, owner-ruled full symmetry): `summonBodies` now
  `unshift`es foe summons to the lane FRONT (`room.lanes[li][0]`, what `aimedFoe("front")` reads),
  both general + rat branches. Engine-proven (new regression case 7/7b in the `aimedFoe` block) AND
  real-run clean (`shoot.mjs` drew a tentacle-summoning Kraken, 0 JS errors).
- **Target ring no longer hides attack-charge heat** (`0c10b8b`): the cyan target rides as a SEPARATE
  inset ring in all three foe renderers (`drawFoeCard`/`drawFoeMini`/`drawFoeRow`). Deployed —
  **Dakota still owes the phone eyeball** (he chose "I'll eyeball on my phone" over a scenario proof).
- **Card COUNT retired as a difficulty lever** (`451dafd`, owner-ruled): every foe now holds EXACTLY
  `FOE_MIN_CARDS` (3). Both live count sites capped (`rollFoeGear`, `rollLeveledFoe`). Verified: game
  1476 · squad 22 · fuzz 60 · serve 32 · `shoot.mjs` JS errors 0.
- Carried-forward-and-still-true from 10:00: keyframe+delta wire protocol (`public/net-delta.js`,
  ~18×, `KM_KEYFRAME=1` legacy fallback); client latency hiding (optimistic echo + 120 ms interp,
  intent-only); scenario harness (`KM_SCENARIO=1`, 7 scenarios); the 2026-07-11 balance rulings
  (Swords/Pet-Leech/Sharpened-Edges/Lion-Lance/noReact club, etc.); the visual pass (effect chips,
  purple hex armor badge, ~94.5% board, Sol's summon mini-cards).

## The economic model (THIS is the frame for all balance work — internalize before touching numbers)

- **⚖ = threat = Σ `anteOfFoe`** where `anteOfFoe = 1 base + Σ item antes + 2×(level−1) + 3 if elite`.
- **◈ = reward = ⚖ − 1 per foe** (`foeLootValue`; the flat +1/foe is the only pure-threat, no-payout
  "cover charge"). The economy is 1:1 — a room's ante IS its difficulty AND its loot.
- Solo floor-1 room budget rolls **⚖ uniform in [4, 12]** (`roomAnteRange` = [4×PF, 12×PF], PF =
  party×floor). Cheapest foe = ⚖4 (base 1 + 3 commons, level 1).
- **Why count was retired**: a foe casts only its FRONT queue card, moxie-gated (+1/s) under a GCD
  (`foeCast`). Extra cards rotate to the back and never fire → card COUNT is ~1:1 REWARD but ~0
  marginal THREAT. The honest levers are LEVELS (HP/attack always apply) and item QUALITY (damage per
  cast). Dakota's invariant: **every lever priced into ⚖ must deliver that ante in BOTH threat and
  reward** — no *unintentional* asymmetry (the +1 base is the one deliberate, bounded exception).

## Pending content (Dakota's explicit ask — computed, not guessed; re-run `bun tools/content-audit.mjs`)

- **The entire value-2+ item tier does not exist.** All 87 cards are ante 0 or 1 (`{0:6, 1:81}`).
  `RICH_ITEM_POOL` (val≥2) and `RARE_POOL` (ante≥3) are both **0 members**. Consequences, all live:
  `enrichFoeGear` no-ops (foe item-QUALITY lever dead) · `rollBossLoot` drops nothing (bosses pay
  NOTHING) · the `arsenal` room-skew has no lever left and **degenerates to plain 3-card foes (≈
  swarm)** — the skew test now asserts+documents that degeneration. Authoring a few value-2 cards
  lights up all three at once. **Dakota's to author.**
- **Orphan bodies** (defined, not in any live roster): `warrior`/`rogue`/`mage`/`cleric` = the legacy
  player-CLASSES system (`bodies.js:403` `CLASSES` + client select table `client.js:469`), kept for a
  "legacy chooseClass path" but NOT in the mimic draft (`DRAFT_BODIES`). `knight` "Hedgefund Knight"
  looks like a dead dup of the live `hedgeKnight`. (`rookie` = `STARTER_BODY`, in the game.)
- 6 ante-0 `t*` cards (Bite/Earth Ward/Lava Surge/Knight Strike/Spirit Strike/Spirit Bolt) are
  summon-INNATE attacks — in the game via their summons, not pending.

## Next step

Do not add breadth. Highest leverage is an owner ruling for the **first combat contract**: may room
one contain multiple foes, leveled foes, and/or elites? Instrument and test those axes separately,
then make floor 1 trustworthy without silently inventing balance. Next is making the mimic revelation
happen in the opening minutes (fight one readable foe → defeat it → visibly wear it), then the combat
feel stack (owner sets taste; agents build sound/haptic/impact/card-travel systems). A physical iPhone
16 landscape pass should also confirm Safari safe areas. The value-2+ tier remains a major progression
unlock, but it is behind first-run trust and hook salience in the current priority order.

## Open owner rulings (surfaced this session — AWAIT his call, do not resolve unprompted)

- **Arsenal skew is now vestigial** (no lever until value-2 content exists): cut it from `ROOM_SKEWS`,
  or leave it degenerate, or fill the pool? His call.
- **Boss court flattened to 3 cards** — the `rollFoeGear` cap also hit the King Mimic's court
  (`lobby.js:1207`, was "heavily armed"), nudging the already-toothless-King further toothless. Exempt
  the court from the 3-cap (one-line) or keep it?
- **Acid Rain hits PLAYERS ONLY** (`processRoomTimers`, combat.js:1330 — heroes + hero-summons, never
  foes/boss) despite its blurb "every body in the room." Both live room effects are anti-player (acid
  hurts you, `foeScaling` pumps foes). Make acid symmetric or fix the blurb? Also: fix the stale
  `lobby.js:183` "ROOM EFFECTS REMOVED" comment — effects are LIVE again (world.js:163-237).
- **Boss-deck-as-loot idea** — Dakota's interested design-wise; worried it's a balance nightmare. It's
  actually two systems he already has (foe cast-queue + `rollBossLoot`/`claimLoot` shelf), and it
  RESOLVES the empty-boss-loot gap + houses the value-2 tier. The trap is the same count-vs-threat
  decoupling: a big deck the boss can't fully cast, dropped whole, over-rewards. Honest fixes: (a)
  drop only what it cast, (b) tight ≈4-6 deck it fully cycles, (c) draft-a-subset (already how
  bid-points/`claimLoot` work). Lean (c)+(b). Awaiting his go to wire.
- **Floor-1 contract** (highest leverage; prior handoff claim was overstated): the audited last-24h
  sample ended at **34 fights, 23 losses, 0 completed run wins**. Among 23 ended human runs, first
  combat was 6 wins / 17 losses (~74% loss), not “every death in the first fight.” Solo two-foe
  openers were 0/3; every observed L2/L3 first combat lost. Two `uses:{}` losses do NOT prove burst
  before acting; they could be reading/input/opening-hand/inactivity failures. Bow appeared in two
  first-combat wins; Javelin was 1 win/1 no-play loss, so neither is convicted. Owner must rule the
  opening policy (multi-foe? leveled? elite?) before agents change generation/numbers. First add
  telemetry for room skew/effect, foe levels, opening hand, first attempted/successful input, final
  bundle, viewport/orientation, and player ID on `draft_pick`.
- **Five-foe touch targeting**: exact iPhone captures fit, but rows compress to roughly 18–24 CSS px;
  blindly expanding to 44 px would overlap. Owner must choose dense overview, more board/scroll, or a
  separate target selector/cycle. Do not bump a hitbox constant without that UX ruling.

## Active decisions (non-obvious why only)

- Server authoritative; latency HIDDEN not eliminated — echo shows intent only, never predicted
  damage/HP (anti-lie grammar: numbers never tween, chips never fake).
- Foe summons enter at the ABSOLUTE lane front (`unshift`), not a depth slot — foes have no
  depth-walk, so front = meat-shield mirror of the player's front summon. FLAG: a "foe summons behind"
  knob would mirror the player `summonSide` toggle if ever wanted.
- Card cap leaves `left` budget intact in `rollLeveledFoe` → arsenal's surplus flows to
  `enrichFoeGear` (currently inert, empty pool) and the fill loop mints MORE foes; the room's ⚖ still
  spends in full (conservation holds).
- Swords: a 1-dmg hit still consumes a charge; cap after armor before shields; pierce bypasses cap +
  consumes no charge (FLAGged). Mirror Shield reflects the RAW swing. Pet Leech heals even through a
  full shield absorb (FLAG). Triblade deliberately NOT in the pierce/noReact club.
- Client-side-solo mode + VPS host = deliberately DEFERRED (VPS needs his money go). KM is recreation
  by standing rule — no money lens.

## Landmines

- **Never deploy server or client alone** — delta protocol pairs them. Deploy = push + bounce the bun
  process ONLY. Bouncing cloudflared rotates the friend's URL (only do it deliberately).
- **RICH_ITEM_POOL / RARE_POOL are EMPTY** (see Pending content) — do not fill unprompted; his ruling.
- `nul` stray untracked file in repo root (Windows reserved name, harmless); deleting needs owner
  approval + the `\\?\` path trick.
- Stale git debris: `km/latency-hiding-stale-0711`, LOCAL `km/scenario-devtools` stub (real work is
  `origin/km/scenario-devtools` `e824b3f`, merged); ~70 `.claude/worktrees/` — cleanup needs approval.
- CLAUDE.md suite-count lines stale (game now 1480, serve 35, admission 13). Owner-managed doc.
- Old `fireMode`/`targetRow`/dead touch markup suppressed in client — do not revive until Dakota
  confirms the phone build.
- **Untracked BY DESIGN** (never stage, never delete): `tools/mp-playtest.mjs`, `tap-probe.mjs`,
  `tier-sim.mjs`, `tools/content-audit.mjs` (new this session — re-runnable content audit),
  `CHEATSHEET.md`, `DESIGN_LISTS.md`, `RESUME_PLAN.md`, `scratchpad*`, tunnel/server logs.
- Standing: Cool Shoes loop stays; no player-facing AUTO language ever (`autoFire` powers bots —
  keep it); King Mimic toothless ward ruling still open.

## Pointers

- Run (live): `bun run server.js` from repo root (:3000); tunnel: `cloudflared tunnel --url http://localhost:3000`.
- Test bar: `bun run test/game.test.js` · `test/squad.test.js` · `test/fuzz.js` · serve needs its own
  throwaway server (`PORT=<p> bun run server.js` then `BASE=http://localhost:<p> bun run test/serve.test.js`)
  · `node tools/shoot.mjs` (real run, 0 JS errors, READ the shots) · co-op: `node tools/mp-playtest.mjs`.
- Analysis: `bun tools/content-audit.mjs` (code-vs-game diff) · `bun tools/telemetry-report.js 1`
  (real human runs, last day) · scenario capture `node tools/scenario-shot.mjs tools/scenarios/<name>.json`.
- Key files: `engine/lobby.js` (foe generation, ante/skews, pools, `rollFoeKit`) · `engine/world.js`
  (ante formula `anteOfFoe`/`foeLootValue`, room effects/GIMMICKS) · `engine/combat.js` (`foeCast`,
  `summonBodies`, `aimedFoe`, `processRoomTimers`) · `engine/kit.js` (cards + antes + FLAGs) ·
  `public/client.js` (foe renderers, ⚖ display) · `public/net-delta.js` (wire codec).
