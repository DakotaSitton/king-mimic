# HANDOFF — King Mimic — 2026-06-10 (SET V2 GREEN + owner feedback round 1: summon clocks, 1-HP rats, card redesign)

> Pick-up doc for a cold instance. Supersedes older HANDOFFs. King Mimic is a soft-real-time
> co-op browser roguelike: N lanes (= player count, 1–4), defend the shared Caravan, wear the
> bodies of foes you defeat. **SLICE_SPEC_V2.md §4 is now fully IMPLEMENTED** — `SLICE_SPEC.md`
> (V1) is historical; the V2 set is what's in game.js.

## State (all verified this session — every suite run against a fresh server)
- **All 11 V2 engine systems built and tested**: ally-target slot, aura tokens (totem/flag/
  knight), echo, school CDR, cross-school, thorns (Spikes), charge drain (Blizzard),
  damaged-accelerates-timer (Atlas), front-2 (Spear), player-cast summon items, and the
  rarity generator (12 templates × 3 rarities → 36 BODIES at boot).
- **24-item KIT live** (12 common / 8 uncommon / 4 rare, spec §3 numbers): old V1 items
  replaced in place; keys kept stable where the item carried over (blade→"Sword",
  fire→"Fireball"). Worn DR item = `slimeCrown` ("Liquid Metal King Slime Crown").
- **Owner feedback round 1 SHIPPED & verified** (2026-06-10 evening):
  1. Summoners (Royal Rat / Fat Cat / Paid Piper) now run a VISIBLE 4s summon clock their
     trigger ACCELERATES by 1s (generalized Atlas `accel` mechanic — `body.accel {on, amount}`,
     fed by fireSchoolTrigger + the damage paths). Rarity still scales rats/fire 1/2/3.
  2. Summon tokens are EXEMPT from the HP knob (`bodyMaxHp`) — a rat is 1 HP live, totem 3,
     knight 6, at any pacing.
  3. Foe-card READABILITY REDESIGN: board 540→780px (CSS-capped 96vw for phones), cards carry
     rarity ribbons (grey/blue/gold), body-hue header bands, BOTH schools (⚔/✨), the passive
     text printed on-card (wrapped ≤2 lines), fat labeled threat bars with time-to-fire,
     named backline cards, capped 340px card width (solo). Demo `combat` fixture refreshed to
     V2 content; combat1–4/line fixtures un-broken (stale `_inv` keys crashed buildDemoState —
     pre-existing; fixture errors now PAINT ONTO the canvas instead of silently lobby-ing).
     Screenshots: `tools/shots/demo-{combat,combat4,solo,line}.png`.
- Unit suite REWRITTEN for V2: `bun test/game.test.js` **116/116** (pins setHpMult(1)/
  setCdMult(1)). Live suites all green vs the new content: smoke · smoke4 · reconnect 11/11 ·
  e2e · fuzz (60 runs). Client parses (`bun build`).
- `allyTarget` WS route verified live (probe round-tripped allyTargetId through snapshot).
- Client: click a FOE = offense target, click an ALLY = support target (dashed green ring);
  aura tokens render with a gold ring; rarity bodies (…U/…R) reuse the family icon/art via
  `iconFor`/`foeSprite` suffix-strip.
- EVERYTHING UNCOMMITTED (owner commits only when asked) — V2 build on top of the previous
  uncommitted reconnect/4P work.

## Next step
**Playtest the set** (LAN URL works for roommates; DEMO room = god mode with every item
charged). The numbers are all FIRST-DRAFT — the owner redials on sight. After play, the
spec's deferred work: boss + court designs (owner feeds manually after playing to the boss
node) and item rarity VARIANTS (the generator was built to carry items later).

## Active decisions (do NOT re-litigate)
- **No auto-attack bars, ever** — echo = matching-school items RESOLVE OPS TWICE on fire;
  the school trigger still fires ONCE (echo doubles the item, not the body's reaction).
- **Dual target slots over smart validation**: offense reads only `targetId`, support only
  `allyTargetId` — wrong-target states unrepresentable. Dead/missing ally-target falls back
  to most-hurt-in-lane (self included). No per-item validation anywhere.
- **Aura tokens don't self-cover**: a totem's −1 protects lane-mates, NOT itself (else chip
  damage can never kill it). Same type doesn't stack; strongest applies. Fully symmetric.
- **Thorns reflect on single-target hits only** (incl. boss dealEachLane chips), never lane
  AoE; reflections carry no attacker → no recursion.
- **Lane deals hit the CASTER's lane now** (V2 canon: "every foe in your lane") — V1
  aimed-lane Lightning is gone. Wind = push to BACK of its lane (interpretation of "push it
  back"; old lane-shove kept as the unused `move` op) — owner may re-read this one.
- **Rarity keys**: common = bare template key, uncommon/rare = +U/+R suffix. Boss summons
  referencing "vampire"/"minotaur" now resolve to the new commons (fine). Naming prefix
  (Junior/—/Senior) is the [PLACEHOLDER] scheme — owner decides the real one.
- **damagedCharge (Atlas) scales by cdMult** like every clock (landmine compliance).
- **Tanking is positional by design** — no taunt/redirect. Boss + court deliberately NOT in
  this set; do not invent a boss fight.
- Owner cap context: King Mimic is fun-budget, not an income bet. Brother-co sync 2026-06-14
  needs his attention first.

## Landmines
- **Old V1 mechanics are GONE** — Royal Rat is now staff-trigger (was every-N), Pixie is
  sword-CDR (was 2-phys vanilla), Vampire heal scales 1/2/3, auditAngel/trustyBlade/
  trustyStaff deleted. Never resurrect a V1 number from git history.
- `?demo=combat` fixture is V2-fresh; the OTHER fixtures (draft/stock/won/shop/combat1–4/line)
  still carry legacy names/texts — they render (errors paint on-canvas now) but don't showcase
  V2. `tools/shoot.ps1` KILLS the live server when it finishes — restart bun after screenshots.
- `close()` guard in server.js (`p.ws !== ws` → return) is load-bearing for the refresh race.
- Restart the server for game.js/server.js changes (imported once at boot); kill stale bun
  first or it serves old code and tests pass misleadingly. `public/*` is served fresh.
- **Bun only. No Node, no Playwright.** Background `bun` via the Bash tool exits 127 — use
  the detached PowerShell form below.
- `rm` is permission-guarded — ask the owner to run `! rm <path>`. Scratch files awaiting
  deletion: `probe_lanes.mjs`, `probe_latejoin.mjs`.
- Tests pin `setCdMult(1)`; live runs 2×. Apply the multiplier at every NEW clock you add.
- Reconnect/smoke4/smoke/e2e/fuzz all need the LIVE server running first.

## Pointers
- Run (detached, survives turns):
  `powershell -Command "Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Process bun -ArgumentList 'run','server.js' -WorkingDirectory 'C:\Users\dakot\king-mimic' -WindowStyle Hidden"`
  → http://localhost:3000 · LAN (roommates/phones): http://10.0.0.28:3000 · room code DEMO = god mode.
- Test: `bun test/game.test.js` (unit, no server) · `bun run test/{smoke,smoke4,reconnect,e2e,fuzz}.js` (live server).
- Key files: `SLICE_SPEC_V2.md` (the implemented spec) · `game.js` (BODY_TEMPLATES/
  RARITY_TABLE generator at the top; KIT; resolver with all V2 ops; laneAura/accelOnDamaged/
  reflectThorns helpers) · `server.js` (allyTarget route at the `target` case) ·
  `public/client.js` (heroBoxes click-to-ally-target, iconFor) · `test/game.test.js` (the
  V2 spec in 111 checks).
