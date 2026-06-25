# HANDOFF — King Mimic — 2026-06-25

> Browser co-op deckbuilder roguelike (**moxie + cards**). You and the foes play by the EXACT same
> rules with the same cards. Owner authors all card/body DESIGN by hand — agents do engine/mechanics.
> This was a long build session: the melee/ranged bonus system, a combat log, 13 new cards, a damage-
> display redesign, multiplayer verification, and a live-demo endpoint all landed.

## ⚠️ READ FIRST
- **Source of truth: live code > `CORE_LOGIC.md` > everything else.** CORE_LOGIC has a dated
  "STATUS CORRECTIONS — 2026-06-24" block at the top that's current; the pre-rewrite specs
  (README/MECHANICS/SLICE_SPEC*/BOSS_SPEC_V1) carry ⚠️ STALE banners.
- **Server**: `bun --watch run server.js` on :3000 (usually already running, hot-reloads on save).
  Client changes need a browser HARD-REFRESH. `bun test` → **551 (game) + 18 (serve)**, green.
- **The school/sword-staff power-scaling is GONE.** The only live card axis is **MELEE vs RANGED**
  (a third "untyped" for shields/heals/buffs). Per-type bonuses are stored as `meleeBonus`/`rangedBonus`
  (a generic `counter` lifts both); shown as 🗡/🎯 on the hero, foe plates, and HUD.

## What landed this session (all verified, tests green)
- **Type bonus system** — `cardKind` (melee/ranged/untyped), `meleeBonusOf`/`rangedBonusOf`/`kindBonusOf`,
  bonus ops `{do:"meleeBonus"|"rangedBonus"}`. Bow/Javelin are melee-kind that AIM; Lightning/Meteors ranged.
- **Combat log** — `clog()` recorder (~20 instrumented sites), capped 1500, streamed to the client
  ONLY on lost/won, a scrollable color-coded death-screen panel, and a server-side `combatlog.txt`
  dumped on a loss (so a debugging agent can read the fight). `_endLogged`/`_fileLogged` guard once-only.
- **13 new owner cards** (`oOmnislash, oHaste, oHedgeKnight, oMoxiePool, coolShoes, oGlacius,
  oSharpEdges, oWizardHat, oRepeatXbow, oDemonForm, oSageMode, oBerserker, oPileOn`) + new ops:
  type-bonus grants, `regen` kinds `moxie`/`meleeBonus`/`rangedBonus`/`berserk`, the `hedgeKnight`
  summon body + `tKnightStrike`, Haste reuses the existing `haste` buff, Cool Shoes is a WORN passive
  seeded in `applyCombatStart`. All symmetric (foes cast them too — verified at runtime by review).
- **Damage display** — `cardLiveDmg`/`cardScaleGlyph`: the printed number is the LIVE value (base +
  your current bonus), with the scaling glyph (🗡/🎯/🛡 shield-scaled/👥 ally-scaled, none = flat),
  rendered GOLD when boosted above base. Snapshot carries `dmgNow/boosted/dmgGlyph` for hand AND foe
  queue; the corner kind-icon was removed (glyph rides the number).
- **Multiplayer verified e2e (16/16)** — `_mptest.mjs`: both-join-during-draft, host-drafts-first→
  guest-joins (the original bug: draft reopens, lanes re-derive, no overlap), and mid-run reconnect.
- **`/demosnap`** live-demo endpoint (`buildDemoSnap` in server.js) → `?demo=cardcombat` renders a REAL
  game.js snapshot so the screenshot tool can never go stale. `?scene=lost` shows the log panel.
- **Mobile/visual**: hotbar grown (bigger cards), d-pad shrunk, summon Front/Back stacked (was clipping),
  rats adaptive-spaced, a DECK panel in the right column during combat (drawable bright / grey otherwise),
  a night-readability contrast pass, a soft dungeon vignette.

## Next step (pending — owner's call)
1. **Apply the body buffs** (simmed, NOT yet applied): Lizard Wizard `dealtRanged 3→2`, Royal Rat
   `spend 4→2`, Interest Imp `spend 4→2`, Paid Piper `play 3→2`, Vampire heal `1→2`. Runeblade resists
   numbers (its pairMR fires too rarely — needs a mechanic look, not a bigger number).
2. **Re-sim** the body tournament + item tier list against the now-44-card pool (`bun _strengthsim.mjs`;
   the synergy/buff variant lives in a worktree — regenerate). The 13 new cards shift the math.
3. **Owner to confirm flagged card numbers**: Omnislash = 2 dmg/hit ×4; Cool Shoes worn-tick approach;
   Berserker's per-period self-damage (absorbed by its own +1 shield in the common case).
4. **Review fix-next (low):** add a victory log line on the WON path (only LOST appends "CARAVAN FALLS");
   delete the legacy `omnislash`/`haste`/`powerBoost`/`stoneSkin`/`gigaCast`/`timeStop`/`revive`
   scaffolding KIT keys now that `o*` versions are canonical; drop the unused `dmg` field on deck tiles.

## Landmines
- `coolShoes` IS in `PLAYER_POOL` ON PURPOSE (draftable as a worn passive); `isCard()` filters it from
  decks/queues so it's never drawn/cast. Comment at game.js ~453 says so — do NOT remove it.
- Foe-queue `−N` now reads `live.now` (matches the threat bar). Any new bonus op must keep `cardLiveDmg`
  and `foeDealHit` in sync or the two foe-side numbers desync again.
- `rm`/`Remove-Item` trips the owner's delete guardrail — never auto-delete. Agent-card files
  `content-{tank,summon,misc}.js` are still on disk (untracked, EXCLUDED from the commit, "must not be merged").
- A leftover agent git worktree sits at `.claude/worktrees/agent-a9f05bf4a0df2c4d7` (harmless cruft).

## Pointers
- Run: `bun --watch run server.js` → http://localhost:3000 · Phone: `cloudflared tunnel --url http://localhost:3000`.
- Test: `bun test` (551+18) · `bun _mptest.mjs` (multiplayer e2e, server must be on :3000) ·
  `bun _balancesheet.mjs` (editable bodies+cards dump — owner edits numbers, resend, I apply) ·
  `bun _strengthsim.mjs` (body tournament + card tier list).
- Screenshot: `bun tools/screenshot.js cardcombat` (live via /demosnap) · `lostlog` (the combat-log panel).
- Key files: `game.js` (engine: KIT ~254, PLAYER_POOL ~388, cardKind/bonus ~361, clog ~221,
  resolveOps ~2723, snapshot ~3500); `public/client.js` (render: drawHotbar, drawFoeQueue, the bonus
  labels); `public/inventory.js` (deck panel); `server.js` (rooms, /demosnap, combatlog persist).
