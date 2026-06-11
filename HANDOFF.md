# HANDOFF — King Mimic — 2026-06-10 23:55 (V2 set + 4 owner-feedback rounds SHIPPED, all green, committed)

> Pick-up doc for a cold instance. King Mimic is a soft-real-time co-op browser roguelike:
> N lanes (= player count, 1–4), defend the shared Caravan, wear the bodies of foes you
> defeat. SLICE_SPEC_V2.md is implemented IN FULL plus an evening of owner-driven redials —
> git history has the what; this doc has the why and the traps.

## State (all verified against a fresh live server this session)
- Suites: `bun test/game.test.js` **172/172** · smoke · smoke4 · reconnect 11/11 · e2e ·
  fuzz (60 runs, 3 floors each) — all green. Client + inventory build via `bun build`.
- The loop as it stands, end to end: draft wheel (common bodies + common items) →
  PROCEDURAL branching map (forks/merges, every path exactly one shop, ≥1 "double feature")
  → STOCK: each player invites EXACTLY 1 foe into their own lane (2 in a double-feature
  room) from a palette with big gold ante numbers; cheap option always offered → combat:
  unified hero+summon depth line, melee strikes own-lane front, reticle drives ranged only,
  every weapon lands ≥1, aura tokens, echo, accelerating summon clocks, ally-targeted
  heals, passive-clock rings → 1:1 SPLIT INCOME (foes pay their ante; remainder coins to
  the poorest) → spend on loot claims / shop / tiers (T1 free, T2 10g, T3 20g) / kit slots.
- Board: 780×606, fits viewport on BOTH axes (CSS), phone layout wraps panels under.
- Server LIVE at http://localhost:3000 · LAN http://10.0.0.30:3000 (DHCP moved it off .28
  — re-check `Get-NetIPAddress` if phones can't reach it) · room DEMO = god mode.
- Everything through the 1:1 economy is COMMITTED (see git log).

## Next step
**Owner playtests with the group.** Every number is first-draft for redial. The one open
balance question he's been flagged on: 1:1 split income scales DOWN per player with party
size while per-lane difficulty stays constant — if group runs feel poor, the lever is a
party-size multiplier on the pot. After play: boss + court designs (owner feeds manually).

## Active decisions (do NOT re-litigate)
- **No auto-attack bars, ever.** Echo = item OPS resolve twice; the school trigger fires
  ONCE (echo doubles the item, not the body's reaction).
- **Melee never follows the reticle** — `target:"front"` = own lane's front, full stop.
  `isRanged(key) = ranged-flag ?? (type==="magical")`; Bow/Crossbow are flagged ranged.
  A melee hero in an empty lane hits NOTHING — intended, the game is positional.
- **Weapon floor**: school-tagged item deals land ≥1 (wrong-body knives chip, never whiff).
  School-less passive ops (boss counter-scaled chips) are EXEMPT — don't floor them.
- **Body TIER (1/2/3, unlock economy) and ANTE WEIGHT (1/3/5, difficulty+income) are
  separate dials** — BODY_ANTE maps tier→weight. Items: C/U/R = 1/2/4 (value everywhere).
- **Tier 1 is FREE once reached** — no purchase step (canSwapTo + inventory.js both honor
  it); T2/T3 buy-ins are 10g/20g (TIER_COSTS, snapshot ships `tierCosts`).
- **Stocking**: no baseline, no ante gate — EXACTLY 1 invite per player (cap + gate), 2 in
  a double feature. "elite" stays the INTERNAL node key; labels say Double Feature.
  Invites land in the inviter's lane (kills lane-funneling). "Extra Guys" enchant retired.
- **1:1 split income**: roomValue = Σ anteOfFoe(stocked); equal shares, REMAINDER TO THE
  POOREST first. Sinks unchanged. Solo gets the full pot (e2e's V===wallet relies on it).
- **Aura tokens**: lane- and side-scoped, strongest-only (no stacking), NO self-cover
  (else chip damage can't kill a totem). Thorns reflect single-target hits only, never
  AoE, reflections carry no attacker (no recursion).
- **Unified friendly line**: summons spawn at the FRONT; ↑/↓ swaps one ENTITY at a time
  (heroes can pass their own rats). Renderer collapses consecutive tokens into one row.
- **Summon tokens are exempt from the HP knob** (a rat is ALWAYS 1 HP). hpMult live = 1
  (2× removed by owner); the 2× COOLDOWN slow-down (_cdMult) is separate and still live.
- **Summoner clocks**: every-4s summon bar that the signature trigger ACCELERATES by 1s
  (`body.accel {on, amount}` — Royal Rat/staff, Fat Cat/hit, Paid Piper/sword, Atlas/hit).
- **Boss + court are OUT of this set** — owner plays to the boss node, then designs them.
  Do not invent boss content. Rarity naming (Junior/—/Senior) is a PLACEHOLDER scheme.

## Landmines
- Restart the server for game.js/server.js edits (imported once at boot); KILL STALE BUN
  FIRST or it serves old code and live tests pass misleadingly. `public/*` serves fresh.
- **Bun only. No Node, no Playwright.** Background `bun` via the Bash tool exits 127 —
  use the detached PowerShell form below. `tools/shoot.ps1` KILLS the server when done.
- Tests pin `setCdMult(1)`/`setHpMult(1)`; live runs cdMult 2. Apply the multiplier at
  EVERY new clock you add (incl. accel amounts) or bars desync.
- `close()` guard in server.js (`p.ws !== ws` → return) is load-bearing for the refresh
  race — a stale socket's close must not evict a reclaimed seat.
- V2 reuses V1 body names with DIFFERENT mechanics — never resurrect a V1 number from git.
- Demo fixtures: `?demo=combat` and `?demo=stock` are V2-fresh; draft/won/shop/combat1–4/
  line are legacy (fixture errors now PAINT ONTO the canvas instead of silently lobby-ing).
- Test-bot contracts: smoke/smoke4/reconnect have EACH client place one invite (the gate
  demands it); e2e's solo bot stocks the CHEAPEST palette slot and paces adds at the 10Hz
  snapshot rate. A no-sustain spam-bot dies ~25% of rooms at 1× HP — e2e retries absorb it.
- `rm` is permission-guarded — ask the owner (`! rm <path>`). Scratch awaiting deletion:
  `probe_lanes.mjs`, `probe_latejoin.mjs` (untracked, uncommitted on purpose).
- KIT items in the snapshot are projected FIELD-BY-FIELD (inv/gear/loot/shop maps) — a new
  display field must be added there or the client never sees it. Bodies ship via
  `publicBodies()` (strips `passive`/`spawn`, everything else flows automatically).

## Pointers
- Run (detached, survives turns):
  `powershell -Command "Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Process bun -ArgumentList 'run','server.js' -WorkingDirectory 'C:\Users\dakot\king-mimic' -WindowStyle Hidden"`
- Test: `bun test/game.test.js` (pure) · `bun run test/{smoke,smoke4,reconnect,e2e,fuzz}.js`
  (live server required) · screenshots: `powershell -File tools/shoot.ps1 combat stock`
  (then RESTART the server).
- Key files: `game.js` (everything pure: BODY_TEMPLATES/RARITY_TABLE generator, KIT,
  resolver, laneLine, stocking, split economy, buildLevel) · `server.js` (WS routes only) ·
  `public/client.js` (renderer: cards, unified line, hotbar, stock overlay, demo fixtures) ·
  `public/inventory.js` (body-swap panel, tier buttons) · `public/map.js` (level map) ·
  `test/game.test.js` (the spec in 172 checks) · `SLICE_SPEC_V2.md` (the implemented spec).
