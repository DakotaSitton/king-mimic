# HANDOFF — King Mimic — 2026-06-11 21:47 (playtest day: remote 3P SUCCEEDED, boss spec dictated — next session BUILDS IT)

> Pick-up doc for a cold instance. King Mimic is a soft-real-time co-op browser roguelike:
> N lanes (= player count, 1–4), defend the shared Caravan, wear the bodies of foes you
> defeat. SLICE_SPEC_V2 is implemented and survived its first REMOTE 3-player playtest
> tonight ("went really well"). The owner then dictated the four V2 bosses —
> **BOSS_SPEC_V1.md is the contract; implementing it is this handoff's whole point.**

## State (verified this session unless marked)
- Suites: `bun test/game.test.js` **174/174** (was 172; +2 earnings assertions) · smoke ·
  e2e — all green against a fresh live server AFTER the earnings change.
  **reconnect/smoke4/fuzz NOT re-run since 2026-06-10** — boss work is deep server work,
  so run all three BEFORE touching game.js.
- **First remote multiplayer playtest happened and went well** (owner + 2 friends over a
  cloudflared quick tunnel). Tunnel: `cloudflared` installed via winget; URL tonight was
  https://speaks-pursue-encourages-webmasters.trycloudflare.com — alive only while the
  hidden cloudflared process lives; a restart mints a DIFFERENT random URL. Logs:
  `tools/tunnel.log`. Client already speaks wss under https (client.js ~37) — verified.
- Overlay fit is FIXED and screenshot-verified: draft wheel spreads to auto-fit columns
  (`.draft-wide`, ≤1300px), every overlay card clamps to 100dvh with internal scroll,
  map z-bump gated to the won phase (`body.map-top`). Owner's reported cutoff is gone.
- Remainder coins now follow **lifetime EARNINGS** (`p.earned` ledger), not wallet —
  owner ruling, test-pinned with a wallet-vs-earnings divergence case.
- Server LIVE at http://localhost:3000 (restarted post-earnings-change). LAN IP was
  10.162.94.76 earlier today (moved networks again — always re-check `Get-NetIPAddress`).
- Everything committed through `ff7006a` (BOSS_SPEC_V1.md). Working tree clean except
  known untracked scratch (see Landmines).

## Next step
**Implement BOSS_SPEC_V1.md** — read it FIRST, top to bottom; it is owner canon with
my gap-fills tagged [PLACEHOLDER]. Then: (1) run `bun run test/{reconnect,smoke4,fuzz}.js`
to confirm the baseline, (2) build checklist item 1 — the back-line boss entity (spans
all lanes like a mirrored caravan, per-lane damage attribution, melee reaches it only
when its lane is clear) — test-first in test/game.test.js, then go down the checklist
(§"Engine primitives", items 1–12, in order; item order is dependency order).

## Active decisions (do NOT re-litigate)
- **Boss canon = BOSS_SPEC_V1.md.** The prior "bosses are OUT, don't invent" rule is
  SUPERSEDED by the spec. Roster: Hydra / Litigation Lich / Djinn of Deals / Kleptomaniac
  Kraken rotating over 3 floors; **King Mimic stays implemented but NEVER spawns** —
  owner adds him as true final boss after a full-clear playtest. [PLACEHOLDER] tags in
  the spec are implementer guesses — owner overwrites them without debate.
- **Scaling contract**: encounter budget = players × floor (xy 1–12); per-player pressure
  scales with floor ONLY. The ≥3-lane clamp for boss rooms in `lanesFor` dies with this.
- **The 4 bosses currently in game.js are V1 corpses** — out-of-scope leftovers with
  deleted courts. Never tune them; replace per spec. (Standing rule: V2 reuses V1 names
  with different mechanics — never resurrect a V1 number from git.)
- **Difficulty tuning is the OWNER'S** — he judged the run "slightly too hard" and is
  adjusting it himself, intentionally. Do not touch global difficulty dials unasked.
- **Feel/juice pass is DEFERRED** — owner said it felt good and he "has more plans."
  Known headroom (no per-hit feedback, no audio) is noted, not licensed.
- **Party-size pot multiplier stays PARKED** — the 3P playtest didn't confirm the
  income-scaling worry; the owner's actual issue was remainder semantics (fixed).
- **Remainder = lowest lifetime `earned`** (id tiebreak), credited share+remainder, wiped
  on run reset. The fairness invariant is on EARNINGS, not holdings — same invariant that
  justifies trading. e2e's solo V===wallet contract is unaffected.
- **Quick tunnel = playtest tool; Fly = the durable answer** if remote play becomes
  regular (stable URL, no PC dependency, full PWA install prompt).
- "Drops in loot" line is GONE from the stock palette (it duplicated the big ante number
  since foeLootValue === anteOfFoe); the explanation lives in the ante tooltip. The hover
  tip's 💰 dupe is gone too.
- **Mobile = browser + PWA, not native.** Touch HUD only in combat/setup (`.tactive`);
  touch buttons send the same WS messages as keys. Desktop hotbar stays keyboard-first.
- **Damage preview shares the resolver's math** (foeDealHit) — never fork the formula;
  extend foeOpsDmg op-by-op for new damaging ops (bosses WILL add ops — keep this).
- **Node links sorted left→right by x in buildLevel** — consumers rely on it.
- **No auto-attack bars, ever.** Echo = item OPS resolve twice; school trigger fires ONCE.
- **Melee never follows the reticle** — `target:"front"` = own lane's front, full stop.
  `isRanged(key) = ranged-flag ?? (type==="magical")`.
- **Weapon floor**: school-tagged deals land ≥1; school-less passive ops EXEMPT. (Lich's
  capped/−1 stances must respect this — see spec.)
- **Body TIER (1/2/3) and ANTE WEIGHT (1/3/5) are separate dials**; items C/U/R = 1/2/4.
  T2/T3 cost 10g/20g (TIER_COSTS, snapshot ships `tierCosts`).
- **Stocking**: EXACTLY 1 invite per player (2 in a double feature); "elite" = internal
  key, label says Double Feature. **1:1 split income**: equal shares (see earnings rule).
- **Aura tokens**: lane- and side-scoped, strongest-only, no self-cover; thorns reflect
  single-target only. **Unified friendly line**: summons spawn at the FRONT; ↑/↓ swaps
  one entity at a time. **Summon tokens exempt from the HP knob** (1/1 stays 1/1 —
  applies to Hydra heads and Kraken tentacles per spec). **Summoner clocks** accelerate
  via `body.accel {on, amount}`.

## Landmines
- Restart the server for game.js/server.js edits (imported once at boot); KILL STALE BUN
  FIRST or live tests pass misleadingly. `public/*` serves fresh, no restart.
- **Bun only. No Node, no Playwright.** Background `bun` via the Bash tool exits 127 —
  use the detached PowerShell form below. `tools/shoot.ps1` KILLS the server when done.
- **The tunnel makes localhost PUBLIC while it runs** — including room DEMO (god mode).
  Kill cloudflared when not playtesting. Killing it does NOT touch the game server.
- Headless Edge clamps windows to ≥470 logical px wide while --screenshot crops to the
  requested size → right-anchored fixed elements vanish from narrower shots.
  tools/screenshot.js floors W at 470. `QS=touch=1` threads query params into demo shots.
- **PowerShell 5.1 commit hygiene**: `git commit -m` with embedded quotes silently splits
  args → use `git commit -F <file>`, AND write that file with `-Encoding ascii` —
  utf8 Set-Content adds a BOM that polluted one commit subject already (d630fbd).
- Tests pin `setCdMult(1)`/`setHpMult(1)`; live runs cdMult 2. Apply the multiplier at
  EVERY new clock (boss stances, head/tentacle/steal clocks, item-entities) or bars desync.
- `close()` guard in server.js (`p.ws !== ws` → return) is load-bearing for the refresh
  race — a stale socket's close must not evict a reclaimed seat.
- KIT items in the snapshot are projected FIELD-BY-FIELD — the Kraken steal-lock field
  must be added there or the client never sees it (spec checklist #7 calls this out).
  Bodies ship via `publicBodies()`.
- Demo fixtures: `?demo=combat`/`?demo=stock` are V2-fresh; fixture itemBars carry a fake
  display `dmg` — live bars get the resolver's number. A boss demo fixture (`?demo=boss`)
  does not exist yet — worth adding for screenshot-driven boss UI work.
- Test-bot contracts: smoke/smoke4/reconnect each place one invite; e2e's solo bot stocks
  the CHEAPEST slot; e2e retries absorb spam-bot deaths.
- `rm` is permission-guarded — ask the owner (`! rm <path>`). Scratch awaiting deletion:
  `probe_lanes.mjs`, `probe_latejoin.mjs`, `tools/shots/_*.png`, `.git/COMMIT_MSG_TMP`,
  `tools/tunnel.out`, `tools/tunnel.log` (recreated on next tunnel).
- Phones cache the client — after shipping client changes, tell players to pull-to-refresh.

## Pointers
- Run (detached, survives turns):
  `powershell -Command "Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Process bun -ArgumentList 'run','server.js' -WorkingDirectory 'C:\Users\dakot\king-mimic' -WindowStyle Hidden"`
- Tunnel (new random URL each start; URL appears in the log):
  `Start-Process "$env:ProgramFiles (x86)\cloudflared\cloudflared.exe" -ArgumentList 'tunnel','--url','http://localhost:3000' -WindowStyle Hidden -RedirectStandardError tools\tunnel.log -RedirectStandardOutput tools\tunnel.out`
- Test: `bun test/game.test.js` (pure) · `bun run test/{smoke,smoke4,reconnect,e2e,fuzz}.js`
  (live server required) · screenshots: `bun tools/screenshot.js <states>` with W/H/QS
  envs against a running server (phone: W=470 H=844 QS=touch=1); `tools/shoot.ps1` variant
  kills the server when done.
- Key files: **`BOSS_SPEC_V1.md` (THE next-session contract)** · `game.js` (everything
  pure: bodies/KIT, resolver, foeDealHit/foeOpsDmg, foeThreats, stocking, split economy
  incl. `creditRoomIncome`/`earned`, buildLevel, `lanesFor`, spawnBoss + V1 boss corpses
  ~lines 77–110) · `server.js` (WS routes only) · `public/client.js` (renderer; touch
  block after keydown handler; overlays renderDraft/renderStock/renderBattleReport;
  demo fixtures) · `public/index.html` (overlay styles incl. `.draft-wide`/`body.map-top`,
  PWA meta) · `public/style.css` (touch HUD) · `test/game.test.js` (the spec in 174
  checks) · `SLICE_SPEC_V2.md` (implemented spec).
