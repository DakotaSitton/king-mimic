# HANDOFF — King Mimic — 2026-07-12 10:00 CDT

> Browser co-op deckbuilder roguelike. Dakota owns all design/content/numbers; agents implement
> engine, rendering, and verification. Runtime = Bun. Working branch = `feat/room-draft-overhaul`.
> Read king-mimic/CLAUDE.md before editing anything — verification bar + harness traps live there.

## State (all verified unless marked)

- Game HEAD `e033418` (+ doc commits to `347ec9f` + this handoff), local == origin, everything pushed.
- **LIVE**: bun PID `8396` on :3000 (started 2026-07-11 21:11, post-final-merge — it runs the final
  delta-protocol server). **FRESH tunnel (rotated 2026-07-12 ~09:58): `https://choosing-lbs-font-hamburg.trycloudflare.com`**
  — the old `ultimate-declare-news-vast` link is DEAD; Dakota's friend needs the new one.
  cloudflared log: `tunnel-0712.log` (untracked).
- **Wire protocol = keyframe + delta** (`public/net-delta.js`): full snapshot every 30 ticks, seq-tagged
  JSON-patch deltas between, automatic `snapFull` recovery on gap/apply failure. `KM_KEYFRAME=1`
  restores legacy full snapshots. Measured ~779 B/tick vs 34.5 KB before (~18×). Verified at
  180–200 ms RTT + jitter + forced/25% drops (all recoveries clean) and `mp-playtest` 12/12.
- Client latency hiding: optimistic input echo (pending dashed rings / "casting…" dim, `PEND_MS`
  1.5 s FLAG) + 120 ms render interpolation (`LERP_MS` FLAG). Intent only — no predicted outcomes.
- **Scenario harness**: `node tools/scenario-shot.mjs tools/scenarios/<name>.json` — real
  server/client/tick loop, only starting conditions injected; the server route exists only under
  `KM_SCENARIO=1` (live server never sets it). 7 scenarios checked in. Capture/proof tool ONLY —
  never a substitute for `shoot.mjs` random-run verification.
- **Owner balance rulings (2026-07-11), all live + suite-covered**: Rainblow base 1 on both hits ·
  PW:Gun 15 · Swords of Revealing Light ⚡7 = next 3 hits against the target become 1, once per
  fight, 3→2→1 count chip · Starblade unchanged + ⏳ payoff chip · Butterfly Knife / Mirror Mace /
  Meteor Maul carry `noReact` (no on-damaged passives, clocks, Atlas, Blood-To-Iron, thorns/mirror,
  boss reactions — symmetric) · Whip front foe +1 · Shield 3 · Power Up ⚡3 · Sharpened Edges ⚡2,
  buffs ONE kind (player popover picks; foes pick by kit heuristic) · Lion Lance ⚡6, Spear's
  first-two-targets + a +2 both-kinds buff · Pet Leech ⚡2 stacking foe-riding drain, rest-of-combat.
- Visual pass live: effect chips as disc+ring with hold-to-read (names + seconds left); armor = purple
  hex badge ⬡N everywhere (🛡 = absorb pool ONLY); landscape board fills ~94.5% of viewport width
  (was ~62–77%); Sol's expressive summon mini-cards (1–2 summons; swarms → coins) + one red pulsing
  ring for incoming-threat (no attacker portrait stacks).
- Suites at final merge: game 1470 ALL PASS · squad 22 · fuzz 60 · serve 32 (counts drift; ALL PASS
  is the signal). Representative real-run proof dirs: `tools/shots/real-mobile-2026-07-12T02-11-10/`
  (post-latency-merge, new protocol, 0 JS errors), `tools/shots/scenario-*/` (chip/chooser/crowd
  proofs), Sol's `real-summon-layout-2026-07-12T00-09-29/`.
- Adoption at ◈5 is scenario-proven in the real client; the NATURALLY-earned-treasure path still
  wants Dakota's phone confirmation.

## Next step

Dakota hard-refreshes the NEW tunnel URL on his real phone (mandatory — the wire protocol changed;
a stale cached client cannot parse deltas) and plays a run watching for: Swords/Pet-Leech/Sharpened-
Edges/Starblade chips behaving in real play, and one naturally-earned ◈5 body adoption. Anything off:
screenshot it; most states can now be reproduced instantly via the scenario harness for the fix.

## Active decisions (non-obvious why)

- Server stays authoritative; latency is HIDDEN, not eliminated — echo shows intent only, never
  predicted damage/HP (Dakota's anti-lie grammar: numbers never tween, chips never fake).
- Swords semantics (FLAGged, owner may re-rule): a 1-damage hit still consumes a charge; cap applies
  after armor, before shields; pierce bypasses the cap AND consumes no charge.
- Mirror Shield reflects the RAW swing (attacker's aura adds included).
- Pet Leech heal fires even when the foe's shield fully absorbs the drain tick (FLAG).
- Triblade is deliberately NOT pierce/noReact — three discrete bonus-scaling hits; owner has not
  called it into the club.
- Client-side-solo mode and a VPS host were discussed and deliberately DEFERRED — VPS costs money
  (needs Dakota's explicit go); solo-in-browser is queued as the next big lag-proofing win.
- KM is recreation by Dakota's standing rule — no money lens; Steam/store talk is future-tense only.

## Landmines

- **Never deploy server or client alone** — the delta protocol pairs them. Deploy = push + bounce the
  bun process ONLY. Bouncing cloudflared rotates the friend's URL (only do it deliberately).
- **Boss loot pools are EMPTY**: `RARE_POOL` (ante ≥ 3) and `RICH_ITEM_POOL` (ante ≥ 2) match zero
  cards since the 7/09 retirement — bosses drop nothing, `enrichFoeGear` no-ops. AWAITING DAKOTA'S
  ruling on ante-2/3 content; do not fill unprompted.
- Sage Mode ≡ Trollskin Tiara (exact duplicate, self-flagged in kit); seven kit comments name a cost
  one below the actual field (old +1-sweep drift) — owner's to reconcile, don't "fix" silently.
- Stray untracked file `nul` in repo root (Windows reserved name, accidental `/dev/null` redirect
  artifact). Harmless; deleting needs owner approval and the `\\?\` path trick.
- Stale git debris: `km/latency-hiding-stale-0711` (empty stub branch), LOCAL `km/scenario-devtools`
  is an empty stub at `df70258` — the real work is `origin/km/scenario-devtools` (`e824b3f`, merged).
  ~70 accumulated `.claude/worktrees/` — cleanup wants owner approval (deletes).
- CLAUDE.md's suite-count lines are stale (serve now 32, game ~1470). Owner-managed doc.
- Old `fireMode`/`targetRow`/dead touch markup remain suppressed in source — do not revive; cleanup
  only after Dakota confirms the phone build.
- Untracked BY DESIGN (never stage, never delete): `tools/mp-playtest.mjs`, `tap-probe.mjs`,
  `tier-sim.mjs`, `CHEATSHEET.md`, `DESIGN_LISTS.md`, `RESUME_PLAN.md`, `scratchpad*`, tunnel logs.
- Standing owner rulings: Cool Shoes loop stays; floor-1 difficulty ruling still open; no
  player-facing AUTO language ever (internal `autoFire` powers bots/harness — keep it).

## Pointers

- Run (live): `bun run server.js` from repo root (:3000); tunnel: `cloudflared tunnel --url http://localhost:3000`.
- Test bar: `bun run test/game.test.js` · `test/squad.test.js` · `test/fuzz.js` · serve needs its own
  throwaway server (`PORT=<p> bun run server.js` then `BASE=http://localhost:<p> bun run test/serve.test.js`)
  · `node tools/shoot.mjs` (real run, 0 JS errors, READ the shots) · co-op: `node tools/mp-playtest.mjs`.
- Scenario capture: `node tools/scenario-shot.mjs tools/scenarios/<name>.json` (verbs: wait/play/tapFoe/tapAlly/shot).
- Key files: `engine/kit.js` (cards + FLAGs) · `engine/combat.js` (noReact plumbing, `revealLightCap`,
  `tickLeeches`, reflect) · `public/net-delta.js` (wire codec) · `public/client.js` (render, echo,
  interpolation) · `engine/snapshot.js` (`entityEffects` chip meta) · `tools/scenarios/*.json`.
- Cross-agent: agent-bus entry 2026-07-11 21:12 (Claude → Codex/Sol/Dakota) = the protocol/tooling
  notice; shared brain shard `project_king_mimic.md` for classification/history.
