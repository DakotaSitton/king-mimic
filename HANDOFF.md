# HANDOFF — King Mimic — 2026-06-20 ~14:20

> Soft-real-time co-op browser roguelike: N lanes (= squad/player count 1–4), defend the shared
> Caravan, wear the bodies of foes you defeat. Power = items (bodies are flat). One human pilots a
> squad of up to 4 bodies. **This session was a long UX/feel pass on King Mimic** (owner's drive
> vehicle): straight-into-draft flow, AUTO-by-default, a board that now **fills the screen**, a
> hero-readability + layout rebalance, several overflow/scroll fixes, and a **commit to landscape on
> mobile**. Game runs end-to-end. NOT balanced (sim50 still 0/50 — see Landmines). Next chunk is the
> mobile overlay landscape-rework.

## ⚠️ READ FIRST
- **Nothing is committed.** Owner commits when HE decides — never commit unprompted. The whole tree
  is dirty (this session + prior sessions). **Re-read any file right before editing it.**
- **Server is `bun`-only (no Node).** Client files (`public/*`) are served fresh — **no restart**
  needed after editing them. Only `game.js`/`server.js` edits need a restart (imported once at boot).
- **Do NOT blanket-kill bun** (`Get-Process bun | Stop-Process`) — that nukes the owner's `--watch`
  dev server. It's how I took the server down once this session. `shoot.ps1` was fixed to reuse a
  running server; keep it that way.

## State (verified this session unless marked)
- **Mobile overlay landscape-rework DONE** (this session 2026-06-20). New branch in `public/index.html`
  `<style>`: `@media (orientation: landscape) and (max-height: 600px)` — re-spreads the palette/wheel
  into columns (wins source-order over the portrait `(pointer:coarse)…` stack rule), shrinks card
  padding + fonts, and **pins the path-forward bar to the card bottom** (`.stock-begin` / `.advance-row`
  `position:sticky; bottom:0` with a solid `#11151d` backing). Now "Begin combat" (stock), the bundle
  grid (draft), and ◀/▶ advance (won) all sit on-screen, no fold-hunting. Screenshot-verified at
  `W=850 H=390` AND `W=670 H=375` (`QS=touch=1`). Gate uses orientation+height (NOT `pointer:coarse`),
  so it's fully reproducible in the screenshotter and desktop 1080p/768p + portrait never match it.
  **NOT verified on a physical device yet** (the screenshotter can't fake a coarse pointer; the rule
  doesn't depend on one, but real-phone feel/touch-target sizing is unconfirmed).
- **Rooms open STRAIGHT into the draft** — no lobby. `server.js` create calls `startDraft(r)` for
  non-god rooms; `join` calls `spawnSquad` + `growDraftWheel` so a mid-draft arrival always has an
  open bundle. Solo creator who finishes their pick auto-starts the run; latecomers join the running
  game and draft on arrival. Verified: squad probe 7/7, a logic check (wheel 6→7 preserving locks),
  `bun test` 363+22 green.
- **AUTO is the default for EVERY body** (piloted primary included). `addPlayer`: `autoFire:true,
  manualPref:false`. AUTO fires every active item. Updated the 3 tests that encoded manual-default.
- **Foe palette no longer rolls duplicates** — `nextPaletteOption(room, avoid)` prefers a body not
  already on the palette (2-pass). Verified: at a raised ante window it returns 3 distinct bodies
  (was 3 identical Pixies).
- **Foes show EVERY active item bar** — `foeThreats` emits a bar per active item (neutral hue when
  non-damaging); pure passives (no ops) stay out → hover. Verified a Sword+Shield+Heal foe → 3 bars.
- **Hero tokens redesigned** — bigger (R_HERO 16→22), clean HP nameplate (`❤ hp/max`, gold border =
  YOU); removed the passive-clock RING + stacked mini-bars. Screenshot-verified (setup + combat).
- **Board FILLS the screen (crisp).** Canvas backing store = displayed size × DPR; one
  `ctx.setTransform` maps the fixed logical W×H onto it. CSS scales the element to fit both axes via
  `aspect-ratio` + `width:min(width-budget, height-budget×ratio)`, driven by `--bw`/`--bh` set from
  JS. Verified 1920×1080 (fills, ~2.3× area), 1366×768, 1024×720 (no regression).
- **Layout rebalanced** — +28 logical px (H 606→634), ALL to the friendly zone (foes keep their
  room; caravan+hotbar moved down; `foeBottom` −42→−60, `REAR_Y` −58→−62). Three distinct bands now
  (foes / your line / caravan). Verified at 1080p.
- **Overflow fixes:** won-screen loot/kit grids are auto-fit 2-up (`.overlay-cols .ov-col
  .draft-grid`) → no scrollbar even with 6 loot at 720px height. Stock "Draft the room" `.stock-lanes`
  is auto-fit → 4-player lanes stay one row, "Begin combat" on-screen. Both screenshot-verified.
- **Tap-anywhere-to-draft** — the whole `.foe-opt` card is the draft button (`data-add` on the card).
  Stock reminder text condensed (Begin combat back on-screen in portrait). Verified.
- **Landscape committed (mobile):** `manifest.json` `"orientation":"landscape"` + a `#rotateNudge`
  that covers a touch device in PORTRAIT and auto-hides in landscape (pure CSS orientation query).
  Verified both states; desktop never sees it.
- **Screenshot harness fixed:** `shoot.ps1` reuses a server already on :3000 (only stops one it
  started — no more blanket bun-kill); `screenshot.js` uses a FRESH Edge profile per run + disabled
  disk cache (was serving STALE client.js → I misread "no change" 3×). Run via
  `bun tools/screenshot.js <state>` from Bash (the PowerShell wrapper had silent write failures).
- **NOT verified live-on-device:** the rotate nudge and all mobile feel — owner is about to test on
  his phone. LAN URL `http://10.0.0.29:3000` (same Wi-Fi; firewall may need an inbound rule for 3000)
  or `cloudflared tunnel --url http://localhost:3000` (installed; public HTTPS).

## Next step
**BALANCE — the open problem.** `sim50` is ~0/50 thrones: only the FOE side got item/ante scaling;
the PLAYER squad still drafts the flat 3-item bundle wheel (`renderDraft` / the player wheel in
`game.js`'s `rollDraftWheel`/`growDraftWheel`). Give the player draft the same scaling so party power
tracks foe power as floors/ante climb, then re-sim with `bun tools/sim50.js` until thrones are won at
a non-trivial rate. THE work — see the Landmines balance bullet for the surface area.
(Owner may instead want a live-on-phone pass of the landscape rework above first — quick to wire via
`http://10.0.0.29:3000` on the same Wi-Fi, or `cloudflared tunnel --url http://localhost:3000`.)

## Active decisions (non-obvious why only)
- **Straight-into-draft is the "simplest" option, by owner choice.** No lobby gate. A solo creator
  finishing their pick STARTS the run (latecomers draft on arrival via the existing late-join path).
  Do NOT reintroduce a lobby or a "wait for everyone" gate.
- **AUTO default = combat plays itself by default** (every item auto-fires; the only inputs are
  positioning + aim). Owner chose this twice ("tired of clicking"). I flagged the passivity; he
  accepts it. If he ever wants agency back, the split is "auto fires damage, leaves heals/one-shots
  manual" — not a revert to manual-default.
- **The logical W×H coordinate system is SACRED.** The board scales by changing the canvas TRANSFORM,
  never the draw code's coordinates. `H` is the single source of truth — it's published to CSS via
  `--bw`/`--bh`, so retuning vertical bands is a one-line change in `client.js:12-16`, no CSS edits.
  `toCanvas()` maps clicks to LOGICAL coords (don't revert to `cv.width`-based — that's device px now).
- **`foeThreats`: every ACTIVE item gets a bar** (neutral if it deals no damage); PURE passives stay
  out of bars (→ hover). Players have no `equipment`, so they get NO item bars — intentional; owner
  explicitly DECLINED hero item-bars ("just want them prettier"). The hero answer was size + nameplate.
- **Landscape nudge is CSS-only.** Do NOT add `screen.orientation.lock()` JS — it throws in a normal
  browser tab. The `@media (orientation: portrait)` + `body.touch` gate is the robust path.
- **Bodies flat; power = items.** Do NOT reintroduce body-power tiers or the gold unlock ladder.

## Landmines
- **If a screenshot looks unchanged after an edit, SUSPECT THE HARNESS, not your edit.** Check the
  PNG's timestamp and `curl -s http://localhost:3000/client.js | grep <a-marker-from-your-edit>`.
  This burned ~3 rounds this session (stale Edge profile + PowerShell silently not overwriting).
- **Demo states are CLIENT-side fixtures** (`buildDemoState`, `?demo=…`). Server-side changes (e.g.
  `foeThreats`) do NOT show in demo screenshots — verify those with a unit test or real play.
- **AUTO-default broke 3 tests** that assumed manual-default (they now opt into manual). If you touch
  `autoFire` defaults again, those tests (`test/game.test.js`, around the AUTO-fire + Haste-charge
  blocks) need the same opt-in.
- **Overlay mobile breakpoints are a patchwork** (some `820px`, some `980px`) — the next-step rework
  must unify the landscape-short case, not just add another one-off.
- **Parked: hero passive readout.** The body-passive clock is currently a slim line under the
  nameplate. Recommended home for the PILOTED body's clock is BESIDE THE HOTBAR (not a global
  under-caravan strip, which divorces per-hero clocks from their owner). Not built.
- **Still UNBUILT — balance.** `sim50` is ~0/50 thrones: only the FOE side got item/ante scaling; the
  PLAYER squad still drafts the flat 3-item bundle wheel (`renderDraft` / the player wheel). Give the
  player draft the same scaling so party power tracks foe power, then re-sim. THE open problem.
- **Still UNBUILT — trade simplification** (owner: trading feels awkward even solo). Plan: click a kit
  item → popover with ✕ Drop + → Give-to-your-other-bodies (instant, no gold; needs same-seat-owner
  validation) + ⇄ Offer-to-other-humans (existing gold flow). Deletes the always-on trade panel.
- **rm guardrail:** scratch artifacts pile up — temp shots (`tools/shots/demo-*-{portrait,landscape,
  1366,1024,720,nudge}.png`), leaked `%TEMP%\km-shot-*-<ts>` profiles, `probe_*.mjs`. Deleting trips
  the owner's rm guardrail. ASK before removing.
- **server.js `actorId` routing:** player-action handlers route to `actorId` (possessed body);
  `close()` MUST stay on `ws.data.id` (the seat) — routing close through actorId once crashed every
  disconnect.

## Pointers
- Run: server may already be up. If not: `bun --watch run server.js` (background) → http://localhost:3000.
  Squad playtest: `?bodies=4`. Force touch HUD: `?touch=1`.
- Mobile test: same Wi-Fi → `http://10.0.0.29:3000`; or `cloudflared tunnel --url http://localhost:3000`.
- Test: `bun test` (363 + 22). Live probes (server up): `bun probe_fullrun.mjs` (15), `probe_squad.mjs`
  (7), `probe_latejoin.mjs`. Balance: `bun tools/sim50.js` (≈0/50 — the work).
- Screenshots: `bun tools/screenshot.js <state…>` (Bash, server up) or `powershell -File
  tools/shoot.ps1 <state…>`. States: draft stock setup combat won shop. Size/mobile via env:
  `W=1920 H=1080 …`; portrait `W=470 H=900 QS=touch=1`; landscape `W=850 H=390 QS=touch=1`. Output:
  `tools/shots/demo-<state>.png`.
- Key files:
  - `public/client.js` — board geometry/CSS-vars `~10-16`; **`sizeCanvas`/`applyTransform`/`toCanvas`
    ~600** (responsive board); `render()` ~860 (calls `sizeCanvas` each frame); hero render + nameplate
    ~1150-1185 (`R_HERO`, `REAR_Y`, `foeBottom`); `foeThreats` is in **`game.js`** not here;
    `renderStock` (collective draft + tap-to-draft) ~1606; `renderBetweenRooms` (won) ~1499;
    `renderDraft` (player wheel — BALANCE target, still flat) ~1644; `buildDemoState` ~288.
  - `game.js` — `addPlayer` (autoFire/manualPref defaults) ~872; `nextPaletteOption(room,avoid)` ~558;
    `foeThreats` (all-active-bars) ~2008; `startDraft`/`growDraftWheel` ~1574; `rollDraftWheel` ~1568.
  - `server.js` — `create` (→startDraft) / `join` (→spawnSquad+growDraftWheel) ~179-232; `spawnSquad` ~121.
  - `public/style.css` — `#cv` responsive rule (aspect-ratio + `--bw/--bh`) ~66; `#rotateNudge` ~140;
    touch/orientation media queries ~126-150.
  - `public/index.html` `<style>` — `.foe-opt[data-add]` (tap-to-draft) ~92; `.overlay-cols`/
    `.stock-lanes` (2-up grids) ~46/123; `#rotateNudge` element ~334.
  - `tools/screenshot.js` (fresh profile per run) · `tools/shoot.ps1` (reuses running server).
