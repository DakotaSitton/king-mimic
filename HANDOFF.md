# HANDOFF — King Mimic — 2026-07-11 00:25 (visual-QA seam; owner wants a fresh tunnel + a playtester cheat sheet)

> Browser co-op deckbuilder roguelike (moxie + cards, full player/foe symmetry). Owner **Dakota**
> authors ALL design by hand; agents do engine/rendering/tests only and **FLAG** any number he didn't
> state. Runtime = **Bun**. Working branch = `feat/room-draft-overhaul`, HEAD = **`278f162`** (pushed).
> `:3000` is deployed and running the current code.

## State (VERIFIED)
- **Live `:3000` runs current code (`278f162`)** — the mega-batch (12 cards, reworks, foe-side pierce/pull,
  token overhaul, `PLAYER_POOL 81`) + the 4 visual fixes below. Deployed by bouncing only the bun server.
- **4 visual defects fixed + VERIFIED on real screenshots** (drove the real game, looked at the live pixels):
  (1) piloted-summon HUD pile-up, (2) desktop inventory name truncation + panel overflow, (3) desktop
  room-pick overlay clipped by the LEVEL rail, (4) desktop top-HUD "CONTROLSROOM" collision. Proof shots:
  `tools/shots/real-desktop-2026-07-10T23-43-46/` and `tools/shots/repro-piloted-mobile-2026-07-10T23-43-53/`.
- Tiny Buckler cost 1 (owner-stated); level-up melee/ranged pick gated to odd (damage) levels — both live in
  code (but the level-up UI itself is UNVERIFIED — see landmines).
- Deterministic suites were green at last full run (game ALL PASS / squad 22 / fuzz 60) — but per the ruling
  below they are a **crash-net ONLY**, never proof anything LOOKS right.

## Next step
**Two concrete actions, in order (owner asked for both this session):**
1. **Rotate the web tunnel.** End ALL running cloudflared tunnels
   (`Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force`), then start a FRESH one:
   `Start-Process cloudflared -ArgumentList '--url','http://localhost:3000' -WindowStyle Hidden -RedirectStandardError <log>`,
   scrape the new `https://<...>.trycloudflare.com` URL from the log, verify it returns HTTP 200 end-to-end,
   and **give Dakota the new URL**. (First confirm `:3000` is listening; if not,
   `Start-Process bun -ArgumentList 'run','server.js' -WorkingDirectory C:\Users\dakot\king-mimic -WindowStyle Hidden`.)
2. **Write a new-player CHEAT SHEET** Dakota can send to playtesters. Author it FROM THE REAL GAME (open the
   tunnel / `node tools/shoot.mjs` and read the actual in-game help line + UI) — do NOT invent rules. Cover, in
   plain skimmable language: the goal (clear rooms → beat the floor boss), **moxie** (charges over time; spend it
   to play cards), cards/deck, **bodies** + their passive + swapping bodies, **targeting / lanes / front-back /
   summons**, the **incoming-attack telegraph coins** (red-ringed foes aiming at you), level-ups, and co-op.
   One page. Save as `CHEATSHEET.md` at repo root and show Dakota. It's player-facing INSTRUCTION describing
   mechanics as they ARE — still not design authorship, so don't invent numbers/rules.

## Active decisions (non-obvious why only)
- **Verification bar (owner ruling 2026-07-10, HARD):** prove ANY visual/gameplay work ONLY by running the REAL
  game, reaching the real state, screenshotting the live canvas, and LOOKING. Fixtures (`tools/realshot.js`),
  logic/fuzz suites, and "JS errors: 0" are NOT proof of a visual and must never be cited as such; and Dakota is
  not the one who screenshots. Deploy agents to run the real game + look; stay the final eye. (memory
  `feedback_real_game_verification`.)
- **Telegraph coins are bare BY DESIGN.** The red-ringed foe portraits beside YOU are the incoming-attack
  telegraph (which foes are aiming at you); the detail lives on the enriched foe rows. Do NOT "enrich" them —
  that was a misread of the owner's "info-poor summon" complaint, disproven via pixels this session.
- **Card-face art glyph** (faint full-card art + damage number on top) is the owner's own 2026-07-10 feature and
  his taste call — leave it unless he asks to dial back opacity/size.
- **Deploy WITHOUT rotating the URL** by bouncing ONLY the bun listener and leaving cloudflared alive (the
  trycloudflare URL is bound to the cloudflared process). Used repeatedly this session. NOTE: the Next step
  DELIBERATELY rotates it because the owner asked for a fresh tunnel. (memory `reference_km_deploy_tunnel`.)
- Every new-card cost + several durations are still FLAGged proposals — owner's to retune from playtest.

## Landmines
- **UNVERIFIED — boss room-TILE containment + the level-up melee/ranged pick UI.** The solo auto-brain in
  `shoot.mjs` dies on floor 1 EVERY run (known floor-1 difficulty), so no real run reaches a pre-boss room-pick
  (boss shown as a selectable TILE) or opens the level-up pay/pick modal. A CSS containment fix + the level-gate
  are in the code but NOT pixel-verified. To close it: harden the brain to survive deeper, a `BODIES=3` run
  (got 2 nodes deep, not far enough), or verify off Dakota's live session when he plays.
- **Untracked temp harnesses** from QA agents — `tools/repro-piloted.mjs`, `tools/measure-desktop.mjs`,
  `tools/demo-shots.mjs`, `tools/css-assert.mjs`, `tools/feature-shots.mjs` — throwaway; do NOT `git add`;
  deletes need owner approval. `tools/tap-probe.mjs`, `tools/tier-sim.mjs`, `tools/mp-playtest.mjs` are untracked
  BY DESIGN — never add or delete them.
- `tools/shots/` holds many real-run folders from this session (evidence) — safe to leave.
- Pre-existing (not this work): `test/balance.js` + `test/reconnect.js` broken at baseline (not in the bar);
  `RICH_ITEM_POOL`/`RARE_POOL` empty → boss reward shelf hole (owner's call); King Mimic boss toothless
  (await ruling); R3 universal 1s card cooldown is EXPERIMENTAL — don't "fix" its Cool Shoes interaction unprompted.

## Pointers
- Run: `bun run server.js` → `:3000` (LAN `http://10.0.0.28:3000`). Web tunnel: `cloudflared --url http://localhost:3000`.
- Real-game screenshots (THE verification, per the bar — boots its own random-port server, never touches :3000):
  `node tools/shoot.mjs` (solo mobile) · `VP=desktop node tools/shoot.mjs` · `FORCEBODY=leverage` (summoner →
  reproduces the piloted-summon state) · `FORCEFOE=frugal` (rat swarm) · `BODIES=3` (survives deeper).
- Suites (crash-net only, NOT visual proof): `bun test/game.test.js` · `bun test/squad.test.js` · `bun test/fuzz.js`.
- Key files this session: `public/client.js` (`drawSummonBody` bands + token draw), `public/inventory.css` /
  `public/style.css` / `public/index.html` (truncation / HUD / overlay-clip fixes), `engine/kit.js` (Tiny Buckler 1),
  `engine/snapshot.js` (`nextLevelPicksDmg` flag + summon effects). Source-of-truth docs: `INTEGRATION_AND_DECISIONS.md`,
  `DESIGN_BATCH_2.md`.

Open with **"point me at HANDOFF.md"**.
