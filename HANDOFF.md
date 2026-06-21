# HANDOFF — King Mimic — 2026-06-21 ~17:30

> Soft-real-time co-op browser roguelike: N lanes (= squad/player count 1–4), defend the shared
> Caravan, wear the bodies of foes you defeat. Power = items (bodies are flat). One human pilots a
> squad of up to 4 bodies. **This session = a MOBILE real-device pass** (owner testing live on an
> iPhone 16 Plus, landscape) + several mechanics fixes + the **solo squad LOADOUT BOARD** (the trade
> redesign's missing half) + three owner UI/engine asks (rail no-shift, shield-in-HP-bar, party
> formation persists). Game runs end-to-end. Still NOT balanced (sim50 ~0/50 — parked, the open Next step).

## ⚠️ READ FIRST
- **Commit status:** the whole mobile + loadout-board session is **committed and pushed** to
  `origin/main` (one commit on top of `bfc7485`). Owner commits when HE decides — **never commit
  unprompted**; this one was explicitly requested. Re-read any file right before editing it.
- **Server is `bun --watch run server.js`** (no Node). It **auto-reloads** on `game.js`/`server.js`
  edits — no manual restart. Client files (`public/*`) are served fresh (`Cache-Control: no-store`),
  so a browser **reload** picks them up. **Do NOT blanket-kill bun** (`Get-Process bun|Stop-Process`)
  — it nukes the owner's watch server.
- **Owner tests on a real iPhone via a Cloudflare quick-tunnel.** The one this session
  (`https://camera-reading-vacuum-precious.trycloudflare.com`) was a background process that **will
  be dead** for a cold session. Respin: `cloudflared tunnel --url http://localhost:3000`
  (`"C:\Program Files (x86)\cloudflared\cloudflared.exe"`), read the printed `*.trycloudflare.com`
  URL, hand it over. These quick-tunnels die after gaps — just respin.
- **I cannot see the real iOS safe-area insets / Safari toolbar.** The screenshotter (headless Edge)
  can't reproduce them. Safe-area padding is applied per-spec but visually UNVERIFIED on-device — the
  owner is the only oracle for "does it hug the Dynamic Island / home indicator."

## State (verified this session unless marked)
- **TRADE = TWO systems, both DONE.** (1) Multiplayer = the per-item popover (`openKitAction` /
  `.km-kit-modal`): ✕ Drop · ⇄ Offer-to-human (they pay its value). The broken give-to-own-body
  buttons are GONE from it. (2) Solo squad = the **LOADOUT BOARD** (`buildLoadoutBoard` /
  `wireLoadoutBoard`, shown on won + shop whenever your seat owns ≥2 bodies): every body's full kit
  side by side — tap an item, then a free slot to MOVE or another item to SWAP, instant & free. Drop +
  Offer-to-human ride a selected item's action bar. New server primitive `swapOwnItems` (game.js,
  1-out-1-in so a FULL 3/3 kit can still swap — the thing the give popover couldn't do); new
  `moveItem`/`swapItem` messages + `dropItem`/`proposeTrade` now take an explicit seat-owned `from`
  (server.js `seatBody`). Slim `buildOffersStrip` (incoming gifts + pending) stays. Screenshot-verified
  desktop + iPhone-landscape via `?demo=squadwon`; `bun test` 383+22 green; squad 23 green.
- **Three owner asks this session (all built, screenshot-verified where canvas):**
  - **Rail no longer SHIFTS when you switch bodies** — `updateSummonSide` keeps the Front/Back row in
    the rail always (during playing/setup with a live pilot), going inert (dim, `.inert`) for a body
    that can't summon, instead of collapsing. (Echo row still toggles — rarer; flag if it bugs you.)
  - **Shield rides the HP bar** — the hero nameplate paints a cyan cap + `🛡N` on the RIGHT (HP shifts
    left) when `p.shield>0`; squad rail chips show `🛡N` too. (`client.js` nameplate + `updateSquadBar`.)
  - **Party FORMATION persists between rooms** — `beginCombat` snapshots each body's `partyLane`/
    `partyDepth` at the setup→combat seam; `enterRoom` reopens with it (clamped, depths renormalized
    per lane) instead of resetting to one-body-per-lane. So "2 units in the first two lanes" sticks.
- **Mobile LANDSCAPE game layout — board IS the screen, every feature kept.** `public/style.css`
  `@media (orientation: landscape) and (max-height: 600px)` + `body.touch`: page locked
  (`overflow:hidden`), desktop LEVEL+INVENTORY panels hidden (their info lives on the canvas hotbar +
  HUD), **CONTROLS repositioned as a fixed compact RAIL in the right margin** (fire-mode, 🎯 Target,
  summon Front/Back, echo, squad bar — toggles ordered FIRST so they never clip), **cycle/swap
  (#tActs) moved to the LEFT above the d-pad**, Leave stays top-right. Items fire by **tapping the
  on-canvas hotbar** (`type:"use"`). The rail hides under any overlay via
  `body.touch:has(#draftOverlay:not(.hidden)) #controls{display:none}`. Screenshot-verified at
  932×430. **Safe-area insets applied but NOT device-verified.**
- **Landscape OVERLAYS (draft/stock/won) fit with no scrollbar** at 932×430. Overlay `overflow:hidden`
  + card `max-height:calc(100dvh-8px)` + 4px overlay padding (the page-scroll math fix). Draft wheel
  compacted (instruction line dropped, selector chip shrunk via `!important`) so 5 bundles fit.
  Verified scrollbars-visible.
- **Draft wheel = 5 bundles** (was 6). `DRAFT_WHEEL_MIN=5` + buffer `players+1` (was `+2`) →
  1–4-body squads get exactly 5 (one clean phone row); 5+ real players scale up. Verified
  `rollDraftWheel(1..4)===5`.
- **Smart heals.** `game.js` `healAlly`: your 🎯 ally-target (the "tank" you pin) gets the heal WHILE
  it needs it; if it's topped off the heal SLIDES to the most-hurt friendly (no overheal waste); no
  pin → most-hurt. Probe-verified both cases. (The 🎯 pin is set by arming Target then tapping an
  ally — `allyTargetId`. This already existed; only the don't-overheal smarts are new.)
- **Foe palette never shows duplicates** — `nextPaletteOption` REWRITTEN with a strict priority:
  in-window-&-distinct → distinct-≤cap (relax the ante FLOOR) → in-window-repeat → ≤cap-repeat. The
  old code returned an in-window DUPLICATE before trying a distinct out-of-window body, so a narrow /
  DOUBLE-FEATURE window showed the same body ×3 (owner hit "3 identical Minotaurs"). Stress-tested
  0/40 dups across random narrow windows; `bun test` green.
- **Foe icons = real vector art** (game-icons.net, CC BY 3.0) — committed in `bfc7485`. Tokens in
  `public/foes/*.svg` from `tools/generate-foe-art.js` (MAP key→{color,"author/name"}, pulls paths
  from `~/game-icons-src`, a shallow clone outside the repo). `iconImg(k)` helper renders them in
  menus; `foeSprite()` on the canvas. Attribution: `public/foes/CREDITS.md`.
- **Carried-over still-true:** AUTO fires every body's items by default; board fills the screen via
  canvas-transform; rooms open straight into the draft; landscape rotate-nudge.

## Next step
**BALANCE — the deep, still-parked open problem.** `sim50` ~0/50 thrones. Only the FOE side got
item/ante scaling; the player wheel is still flat 3-item bundles, so the party out-scales nothing and
the run isn't winnable on the dial. Everything UX is now in place (mobile, trade, loadout, rail,
shield, formation) — balance is what's left between "plays" and "is a game." Start at
`bun tools/sim50.js` + `game.js` ante/loot/wheel scaling. Owner is the dial oracle (he plays it).
**Also pending owner confirmation on-device** for this session's three asks (rail no-shift, shield-in-
bar, formation persists) — they're built + screenshot-checked, but the iPhone is the only oracle.

## Active decisions (non-obvious why only)
- **Trade is TWO systems by owner decree (2026-06-21).** Multiplayer = snappy one-off OFFERS (a
  human pays the item's value). Solo squad = a unified LOADOUT board (move/swap items across your own
  bodies freely on one screen). Do NOT try to serve both with the same per-item popover — that's what
  was just rejected.
- **Mobile keeps EVERY mechanic — never cut a feature to fix layout (owner, emphatic).** The fix for
  a cramped phone screen is to USE the wasted side margins (rail), not to hide functionality. Items,
  targeting (🎯 in the rail), fire-mode, summon side, body-switch all have a home. The canvas hotbar
  IS the inventory on touch (tap to fire) — that's why the desktop INVENTORY panel is hidden, not lost.
- **`giftItem` makes the recipient PAY the value** (one-way sale, not a free gift) so the per-SEAT
  earnings-equality invariant holds (value moves as gold). Same reason a solo same-seat give moves NO
  gold — it's all one seat, holdings move freely.
- **The logical W×H board coordinate system is SACRED** — board scales via the canvas TRANSFORM, never
  the draw coords. `toCanvas()` maps clicks to LOGICAL coords. Don't revert to `cv.width`-based px.
- **AUTO default = combat plays itself** (owner chose twice, "tired of clicking"). Heals being smart
  (don't waste on a full target) is the refinement, NOT a revert to manual.
- **Bodies flat; power = items.** Do NOT reintroduce body tiers or the gold unlock ladder.

## Landmines
- **Demo states are CLIENT-side fixtures** (`buildDemoState`, `?demo=…`) — server changes (wheel size,
  palette dedup, heals, trade) do NOT show in demo screenshots. Verify with a `bun -e` probe against
  `game.js` or real play. (Plain `?demo=won` is solo-with-one-ally; **`?demo=squadwon`** is the new
  3-body-squad fixture that DOES render the loadout board — use it to eyeball the board, not `won`.)
- **Flaky test (pre-existing, NOT from any change this session):** `test/game.test.js` "one ⚖2 foe
  isn't enough for a ⚖4 elite" fails ~1 run in 3 on random foe-ante rolls. The clean tree flakes too.
  Worth seeding the RNG; ignore the occasional red.
- **Screenshot reproducibility limits:** headless Edge can't fake a coarse pointer, iOS safe-areas,
  or Safari's dynamic toolbar. `--hide-scrollbars` HIDES scrollbars in shots — to check for a scroll,
  shoot a one-off WITHOUT that flag (see the `bunfix`/`popover` probe commands in chat history) or
  reason about overflow. If a shot looks unchanged after an edit, suspect a stale Edge cache, not your
  edit (fresh profile per run mitigates this).
- **`:has()` is used for the rail-hide gate** (`body.touch:has(#draftOverlay:not(.hidden))`). Fine on
  iOS 18 / modern Safari; don't target ancient browsers.
- **Loadout board uses explicit `from`:** `moveItem`/`swapItem`/`dropItem`/`proposeTrade` resolve the
  source body from `msg.from` via `seatBody` (server.js) — it MUST stay seat-gated (`(b.owner??b.id)===
  ws.data.id`) or one seat could move another's items. The board operates on ANY of your bodies, not
  just the piloted one (that's the whole point — one menu for the squad).
- **Still UNBUILT — balance.** `sim50` ~0/50 thrones: only the FOE side got item/ante scaling; the
  player wheel is still flat 3-item bundles. The deeper open problem — now the Next step.
- **rm guardrail:** scratch piles up — `tools/shots/*.png` (gitignored), `~/game-icons-src` (big
  clone, outside repo), leaked `%TEMP%\km-*` Edge profiles, `probe_*.mjs`. Deleting trips the owner's
  rm guardrail — ASK first.
- **server.js `actorId` routing:** player actions route to `actorId` (possessed body); `close()` MUST
  stay on `ws.data.id` (the seat) or every disconnect crashes.

## Pointers
- Run: server is usually already up (`--watch`). If not: `bun --watch run server.js` → :3000.
  Squad playtest `?bodies=4`; force touch HUD `?touch=1`.
- Mobile: respin a tunnel (see READ FIRST) or LAN `http://10.0.0.29:3000`.
- Test: `bun test` (363 + 22). Quick logic probes: `bun -e "import('./game.js').then(g=>{…})"`.
  Balance: `bun tools/sim50.js` (≈0/50).
- Screenshots: `bun tools/screenshot.js <state…>` (Bash, server up). States: draft stock setup combat
  won shop. Env: `W=…H=…`; iPhone-landscape `W=932 H=430 QS=touch=1`. Out: `tools/shots/demo-<s>.png`.
- Key files (line numbers SHIFTED a lot this session — search by name, don't trust old line refs):
  - `public/client.js` — `openKitAction` + `kitModalEl` (the kit popover); `buildOffersStrip` (slim
    offers); `wireKitItems`/`wireTrade`; `renderBetweenRooms` (won) + `renderShop` `kitSection`;
    `isMine` (squad test: `p.owner===you||p.id===you`); `iconImg`/`foeSprite`; `buildDemoState`.
  - `game.js` — `giveOwnItem` + `giftItem` + `proposeTrade`/`acceptTrade` (trade primitives);
    `nextPaletteOption` (rewritten dedup); `healAlly` (smart heal) + `lowestHpFriendly`;
    `rollDraftWheel`/`growDraftWheel` + `DRAFT_WHEEL_MIN`; `addPlayer` (`owner`, `kitSlots`).
  - `server.js` — message handlers `giveItem`/`proposeTrade`/`acceptTrade`/`declineTrade` (~314).
  - `public/style.css` — the `@media (orientation: landscape) and (max-height: 600px)` block (rail,
    page-lock, #tActs reposition, lobby compaction) is the mobile heart.
  - `public/index.html` `<style>` — landscape-short overlay block; `.km-kit-*` popover CSS; `.km-ico`.
  - `tools/generate-foe-art.js` (icon MAP) · `tools/screenshot.js` (fresh profile per run).
