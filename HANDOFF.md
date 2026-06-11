# HANDOFF — King Mimic — 2026-06-11 01:00 (MOBILE session: phone-playable + PWA, owner-verified)

> Pick-up doc for a cold instance. King Mimic is a soft-real-time co-op browser roguelike:
> N lanes (= player count, 1–4), defend the shared Caravan, wear the bodies of foes you
> defeat. SLICE_SPEC_V2 is implemented in full; this session made it PLAYABLE ON PHONES
> (owner played on his phone: "very playable") and fixed two play-found issues. Git has
> the what; this doc has the why and the traps.

## State (verified this session unless marked)
- Suites: `bun test/game.test.js` **172/172** · smoke · e2e — green against a fresh live
  server AFTER all changes. reconnect/smoke4/fuzz NOT re-run this session (last green
  2026-06-10; nothing touched their surface, but run them before deep server work).
- **Mobile is live and owner-verified on a real phone**: touch d-pad (lane ◀▶ / depth ▲▼)
  + 🎭 swap + 🎯 cycle-target float bottom corners during combat/setup only; tapping a
  hotbar card uses the item; tap foe = aim, tap ally = aim heals (already worked). PWA
  manifest + icons → Add to Home Screen gives a fullscreen app. Desktop is bit-identical.
- Threat bars now print their hit: "Sword −3 · 1.8s" — number comes from the SAME
  function the resolver uses (foeDealHit), so it cannot drift from landed damage.
- Map advance buttons are direction-honest (links sorted by x server-side, client
  re-sorts + arrows ◀/▶). Owner-reported bug "clicked left, got right room" — fixed.
- Server LIVE at http://localhost:3000 · LAN **http://10.0.0.30:3000** (DHCP moved it
  off .28 — re-check `Get-NetIPAddress` if phones can't reach it) · room DEMO = god mode.
- Everything committed through `ce7dc75` (mobile, dmg preview + map order, map z fix).

## Next step
**Owner group-playtests — now including phones on the LAN URL.** Every number is still
first-draft for redial; watch specifically: touch button size/placement (first-drafts),
and the open balance flag — 1:1 split income scales DOWN per player while per-lane
difficulty stays constant (lever if group runs feel poor: party-size multiplier on the
pot). After play: boss + court designs (owner feeds manually).

## Active decisions (do NOT re-litigate)
- **Mobile = browser + PWA, not a native wrapper.** Capacitor stays possible later;
  install prompt / full Android treatment arrives free with https when hosted (Fly).
- **Touch gating**: coarse primary pointer or `?touch=1` (screenshots/devtools). Touch
  HUD buttons send the SAME WS messages as keys — server can't tell. Desktop stays
  as-is BY DESIGN: hotbar click-to-use is touch-only (misclick risk near the caravan).
- **HUD exists only in combat/setup** (`.tactive`, toggled in render) so it never steals
  taps from map/shop/stock panels. Stacking: HUD z 70 > map z 60 > overlays z 50; on
  ≤980px the map drops to z auto (overlays must cover it — its poke-through-the-overlay
  trick is desktop-only; phones choose paths via the overlay's ◀/▶ buttons).
- **Damage preview shares the resolver's math.** foeDealHit is called BY resolveOps and
  by foeThreats' `dmg` field. Never fork the formula; extend foeOpsDmg op-by-op if new
  damaging ops appear. AoE bars show the PER-TARGET hit; echo bodies show ×2 total.
- **Node links are sorted left→right by x in buildLevel** — consumers may rely on it
  (advance buttons; fuzz walks links[0]). Keep the sort if you touch map generation.
- **A foe's "drops in loot" = its FULL ante** (owner 2026-06-11): foeLootValue ===
  anteOfFoe, the same ⚖ number on the palette. It was gear-value-only before, which
  understated every foe by its body weight. itemTreasure still prices claims/shop/
  trades per-item — only the foe's drop figure changed.
- **No auto-attack bars, ever.** Echo = item OPS resolve twice; school trigger fires ONCE.
- **Melee never follows the reticle** — `target:"front"` = own lane's front, full stop.
  `isRanged(key) = ranged-flag ?? (type==="magical")`; Bow/Crossbow flagged ranged.
- **Weapon floor**: school-tagged deals land ≥1; school-less passive ops are EXEMPT.
- **Body TIER (1/2/3) and ANTE WEIGHT (1/3/5) are separate dials**; items C/U/R = 1/2/4.
  Tier 1 is FREE once reached; T2/T3 = 10g/20g (TIER_COSTS, snapshot ships `tierCosts`).
- **Stocking**: EXACTLY 1 invite per player (2 in a double feature), lands in inviter's
  lane; "elite" stays the INTERNAL key, labels say Double Feature. Cheap option always.
- **1:1 split income**: equal shares, remainder to the POOREST; solo gets the full pot
  (e2e's V===wallet relies on it).
- **Aura tokens**: lane- and side-scoped, strongest-only, NO self-cover. Thorns reflect
  single-target hits only, never AoE; reflections carry no attacker.
- **Unified friendly line**: summons spawn at the FRONT; ↑/↓ swaps one ENTITY at a time.
- **Summon tokens exempt from the HP knob** (a rat is ALWAYS 1 HP). hpMult live = 1;
  the 2× cooldown slow-down (_cdMult) is separate and still live.
- **Summoner clocks**: every-4s bar accelerated by `body.accel {on, amount}`.
- **Boss + court are OUT** — owner plays to the boss node, then designs them. Do not
  invent boss content. Rarity naming (Junior/—/Senior) is a placeholder scheme.

## Landmines
- Restart the server for game.js/server.js edits (imported once at boot); KILL STALE BUN
  FIRST or live tests pass misleadingly. `public/*` serves fresh, no restart.
- **Bun only. No Node, no Playwright.** Background `bun` via the Bash tool exits 127 —
  use the detached PowerShell form below. `tools/shoot.ps1` KILLS the server when done.
- **Headless Edge on Windows clamps windows to ≥470 logical px wide** while --screenshot
  crops to the requested size → right-anchored fixed elements silently vanish from
  narrower shots (cost a midnight). tools/screenshot.js now floors W at 470 and
  documents it; truly-narrow phone layouts need a real phone. `QS=touch=1` env threads
  query params into demo shots; `?tprobe=1` dumps HUD rects/overflow into document.title
  (read via --dump-dom).
- **PowerShell 5.1 + `git commit -m` with embedded double quotes silently splits args**
  even inside a here-string (native-exe quoting). Use `git commit -F <file>`.
- Tests pin `setCdMult(1)`/`setHpMult(1)`; live runs cdMult 2. Apply the multiplier at
  EVERY new clock you add (incl. accel amounts) or bars desync.
- `close()` guard in server.js (`p.ws !== ws` → return) is load-bearing for the refresh
  race — a stale socket's close must not evict a reclaimed seat.
- V2 reuses V1 body names with DIFFERENT mechanics — never resurrect a V1 number from git.
- Demo fixtures: `?demo=combat` / `?demo=stock` are V2-fresh; fixture itemBars carry a
  fake display `dmg` — live bars get the resolver's number. Fixture errors paint onto
  the canvas instead of silently lobby-ing.
- Test-bot contracts: smoke/smoke4/reconnect each place one invite (the gate demands
  it); e2e's solo bot stocks the CHEAPEST slot; e2e retries absorb spam-bot deaths.
- `rm` is permission-guarded — ask the owner (`! rm <path>`). Scratch awaiting deletion:
  `probe_lanes.mjs`, `probe_latejoin.mjs` (untracked, on purpose), `tools/shots/_*.png`
  (mobile-debug crops), `.git/COMMIT_MSG_TMP` (inert).
- KIT items in the snapshot are projected FIELD-BY-FIELD — a new display field must be
  added there or the client never sees it. Bodies ship via `publicBodies()`.
- Phones cache the client — after shipping client changes, tell players to pull-to-refresh.

## Pointers
- Run (detached, survives turns):
  `powershell -Command "Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Process bun -ArgumentList 'run','server.js' -WorkingDirectory 'C:\Users\dakot\king-mimic' -WindowStyle Hidden"`
- Test: `bun test/game.test.js` (pure) · `bun run test/{smoke,smoke4,reconnect,e2e,fuzz}.js`
  (live server required) · screenshots: `powershell -File tools/shoot.ps1 combat stock`
  (kills the server — restart after) or `bun tools/screenshot.js` with W/H/QS envs
  against a running one. Phone shots: W=470 H=844 QS=touch=1.
- Key files: `game.js` (everything pure: bodies/KIT, resolver, foeDealHit/foeOpsDmg/
  foeItemDmg, foeThreats, stocking, split economy, buildLevel) · `server.js` (WS routes
  only) · `public/client.js` (renderer + touch block after the keydown handler; advBtns;
  threatBar; demo fixtures) · `public/style.css` (touch HUD styles at the bottom) ·
  `public/index.html` (touch HUD markup, PWA meta, #map z rules) · `public/manifest.json`
  + icons (regenerate via tools/icon.html if the art changes) · `public/inventory.js`
  (body-swap panel) · `public/map.js` (level map) · `test/game.test.js` (the spec in
  172 checks) · `SLICE_SPEC_V2.md` (the implemented spec).
