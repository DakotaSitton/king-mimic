# HANDOFF — King Mimic — 2026-07-10 06:30 (mega-batch integrated + pushed; owner going to WEB PLAYTEST)

> 🟩 **The whole batch is built, merged, pushed, and green.** `feat/room-draft-overhaul` = **`3a5d207`**.
> It is **NOT deployed yet** — live `:3000` still runs the OLD engine in memory. The single next job is
> **deploy + open the web tunnel** so Dakota can solo-playtest (see **Next step**). Source-of-truth docs in
> repo root: `INTEGRATION_AND_DECISIONS.md` (branch ledger + every FLAG decision) and `DESIGN_BATCH_2.md`
> (the 16 owner-authored items verbatim). Browser co-op deckbuilder roguelike, moxie+cards, full
> player/foe symmetry. Owner **Dakota** authors ALL design by hand; agents do engine/rendering/tests and
> FLAG every number he didn't state. Runtime = **Bun**.

## State (VERIFIED at `3a5d207`, pushed to origin)
- Integrated + pushed green: **game 1354 ALL PASS · squad 22 · fuzz 60 · serve 18 · telemetry 21 · `node --check` client+server OK · `tools/shoot.mjs` JS errors 0**.
- Contents merged into `3a5d207`: **12 new cards**, **6 card/body reworks**, engine fixes **A/B/C/G/R1/R3/R4**, **foe-side pierce + pull**, client **R5/R6/card-icons**. `PLAYER_POOL = 81`.
- **NOT DEPLOYED**: live `:3000` (PID **14600**) runs OLD engine `8cc172a` in memory; disk = new. So `:3000` right now serves **new client + old engine (skew)** — a restart fixes it.

## Next step
**Deploy the new engine and open the web tunnel for Dakota's solo playtest:**
1. **Check for a live connection** on `:3000` — the Kentucky friend plays over the cloudflared tunnel, and a restart **wipes in-memory rooms + rotates the tunnel URL**. `Get-NetTCPConnection -LocalPort 3000 -State Established`; if the friend appears connected, confirm with Dakota before restarting.
2. **Restart `:3000`** to load engine `3a5d207`: find the listener PID (`Get-NetTCPConnection -LocalPort 3000 -State Listen`), `Stop-Process` it, `Start-Process bun -ArgumentList 'run','server.js' -WorkingDirectory C:\Users\dakot\king-mimic -WindowStyle Hidden`, then poll for the new listener + an HTTP 200 on `http://localhost:3000`.
3. **Start the web tunnel**: `cloudflared --url http://localhost:3000` (URL rotates every restart) → capture the URL → give it to Dakota for the solo web playtest.

## Active decisions (non-obvious why only)
- **Owner's 4 rulings this session** (applied on the merged tree, not the individual branches): **Sage Mode cost 4** (+1 TOTAL over pre-R2, not the +2 the branch built); **Demon Form typeless, caster takes 1 self-damage/6s** — self-damage (not foe-damage) is the whole point, it keeps the card untyped and avoids the 🎯 ranged reclass; **Giant's Belt NOT weakened further** (first cast still ~2× base — the nerf only killed compounding + buffed-HP scaling); **Black Hole damage 10** confirmed.
- **"Wire symmetry"** → foe-side pierce + foe-side pull now exist. Side effect: **foe Taunt now repositions too** (shared `pullFront` op) — accepted.
- **R3 cooldown left throttling Cool Shoes** — owner's "Don't protect?" read as *leave it unprotected*; it's EXPERIMENTAL + one-line reversible, he's feeling it out in the playtest. Do NOT "restore" Cool Shoes protection unprompted.
- **Wave-2 (new cards) was based on R2's branch** so they authored in the +1 cost regime and merged as a linear chain onto `kit.js` — that's why integration was ~clean despite 17 branches.
- **Every new-card cost + several durations are FLAGged proposals** (owner never stated them). They are his to retune FROM the playtest — that's the point of this session's next phase.

## Landmines
- **Client/engine SKEW on `:3000` until the restart** — resolve ASAP (Next step). An active browser keeps its old client until refresh, so a mid-game friend isn't instantly broken, but a fresh load gets new-client/old-engine.
- **R3 universal 1s cooldown is EXPERIMENTAL** (`CARD_GCD=10`, self-contained block, heavily FLAGged). It aligns with the moxie-regen period so it mainly throttles bonus-moxie bursts incl. the protected Cool Shoes loop. Revert = delete the feature block. Don't "fix" its interaction unprompted.
- **Placeholder card art** shipped for the 12 new cards (neutral fallback glyph tinted per card via `generate-card-art.js`; bespoke glyph choice is still Dakota's; the 76 signed-off tokens are byte-identical/untouched). Reverting the art means reverting the whole `3a5d207`.
- **17 source worktree branches** are all merged into `3a5d207` — safe to prune WITH owner approval (rm/worktree-remove is behind the delete guardrail).
- **Foe-side pierce reaches players via `foeHitLane`** (the front-melee path the pierce cards use); foe ranged/AoE paths don't pierce — matches how those cards target, but note it if extending.
- **Za Warudo stasis does NOT freeze enemy MIXED passives** (a summon/heal bundled with an attack via `runPassive`) — blocking wholesale would also block the attack. **Open owner call.**
- **FLAGged numbers to feel out in playtest**: 11 new-card costs; Black Hole dmg 10; Za Warudo 5s / Banshee 6s; Crimson Crown card-vs-body (built as a card); Starblade "+10 moxie" = a full refill (MOXIE_CAP 10); Crimson Crown's timer chip cosmetically mislabels as "Strike".
- **R7 dead-UI removal NOT done** — the ranked audit (HIGH set ≈90 lines: `roomVoteHtml`/`advBtns`/`roomAnteLabel` + `.km-kit-*`/`.km-loadout` blocks + orphan CSS + `#banner`) is in `INTEGRATION_AND_DECISIONS.md` §R7. Greenlight → follow-up agent removes + re-verifies (files aren't covered by the deterministic suites, so re-run shoot.mjs after).
- **Pre-existing (not this batch)**: `test/balance.js` + `test/reconnect.js` broken at baseline (NOT in the bar, don't chase); `RICH_ITEM_POOL`/`RARE_POOL` empty → boss reward shelf is a hole (owner's call); King Mimic boss toothless (await ruling).

## Pointers
- Run: `bun run server.js` → `:3000` (LAN `http://10.0.0.28:3000`). Web tunnel: `cloudflared --url http://localhost:3000`.
- Test: `bun test/game.test.js` (ALL PASS ~1354) · `bun test/squad.test.js` (22) · `bun test/fuzz.js` (60) · `bun test/serve.test.js` (18, needs a server on a THROWAWAY port — never `:3000`) · `bun test/telemetry.test.js` (21).
- Real playtest harnesses (untracked BY DESIGN — never `git add`): `node tools/shoot.mjs` (solo, boots its own random-port server) · `node tools/mp-playtest.mjs` (co-op).
- Source of truth: `INTEGRATION_AND_DECISIONS.md` (full branch ledger + every FLAG decision + merge plan) · `DESIGN_BATCH_2.md` (the 16 owner-authored items verbatim).
- Key files: `engine/kit.js` (12 new cards, all costs +1, Black Hole board/10, Sage 4, Demon Form `selfHit`, Duel Wielding replay-≥6, Crystal Ball deck+discard) · `engine/combat.js` (pierce hero+foe, `pullFront` hero+foe, `stasis`, `sap plusRanged`, `CARD_GCD`, `applyGiantBelt`, `selfHit`, `defeated` counters, `nearestFoeLane`, `foeRangedTarget`) · `engine/cards.js` (PLAYER_POOL 81, cost floor now 0/free) · `engine/bodies.js` (Neptune 6+, Affluence Anubis, Sphinx) · `engine/lobby.js` (R4 level-up melee/ranged choice, R3 per-fight reset) · `public/client.js` (R4 pick, R5 always-on bonuses, R6 ⓘ read-body, card-icons) · `engine/snapshot.js` (Black Hole `board` target, foe telegraph).
- Open with **"point me at HANDOFF.md"**.
