# HANDOFF — King Mimic — 2026-07-14 22:42 CDT

## State

- Repo `C:\Users\dakot\king-mimic`, branch `feat/room-draft-overhaul`. This handoff accompanies the
  icon-first UI restoration over prior tip `f891cd5`; intended tree is clean after the listed public
  UI files + this handoff are committed and pushed.
- **Deployed and live.** Bun **PID `17792`** owns `:3000` (bounced this session to load the new
  engine); Cloudflared **PID `60348`** unchanged, same tunnel:
  **https://enhanced-philadelphia-refurbished-matters.trycloudflare.com**. Local + public HTTP 200,
  `client.js` byte-identical, clean boot log — all verified at handoff.
- **VERIFIED working:** icon-first card readability restoration. Every draft starter mini-card, setup /
  backpack / shop / loot tile, and combat hand card leads with its unique `/cards/*.svg` art. The
  regressed MELEE/RANGED/BOTH/UTILITY word pills are gone: one engine-derived `🗡` / `🎯` / `🗡🎯` /
  `◆` symbol is secondary, with the full mechanic name available on hover/hold. Compound outcome
  summaries remain intact. Solo draft/setup also shed redundant selectors/actions, locked minimum-deck
  cards remain full-contrast and inspectable, and room choices explain `⚖ threat · ◈ loot value`.
  Proven by game 2143 / squad 28 / telemetry 34 / fuzz 60 / serve 35 (all 0-fail) plus a fresh real
  `shoot.mjs` at 852×393 DPR3 touch through draft → room → setup → combat → defeat (0 JS errors, 0
  missing art; draft/setup/combat/room/end-state PNGs inspected).
- **NOT verified / the live question:** whether room LOOT is honest. Owner believes some rooms are not
  paying full rewards. Nothing has been investigated yet — this is the next job (below).

## Next step

Investigate **loot honesty**: does what a cleared room actually grants (cards into the backpack +
treasure/bid points) equal what it advertised? Owner reports some rooms feel like they underpay.

Start by tracing the two numbers and proving they reconcile:
1. **Advertised** — the map preview's `◈ loot` per combat node: `engine/snapshot.js` ~line 720,
   `loot: (n.foes ?? []).reduce((s,f)=>s+foeLootValue(f),0) + (effect pot)`. Note the ANTE-V4 comment
   right above it: `◈ loot = ⚖ − 4 per foe` (the flat +4/foe base is a threat-only "cover charge"
   excluded from loot). Confirm `foeLootValue` matches that intent.
2. **Awarded** — what `claimLoot` / the on-clear payout actually deposits (cards + `treasure` +
   co-op `bidPoints` split). Grep `foeLootValue`, `roomValue`, `rollBossLoot`, `claimLoot`, `bidPoints`,
   `room.loot`, `convertBag`, `treasure` across `engine/world.js` + `engine/lobby.js` + `engine/combat.js`.
3. Reconcile: build a room, clear it deterministically (the `rig`/scenario harness in `test/`), and
   assert awarded == advertised. A gap = the bug. Suspects worth checking: the +4/foe base being
   double-excluded, carried-card value vs. drop value, the co-op bid-points split rounding / "furthest
   behind" excess routing, and boss-shelf vs. normal-loot paths.

Then, secondary: **summarize how the most recent runs are going** — find the run/telemetry log the
server writes (human runs are tagged; harness runs send `?harness=1` and set `telemOff`; see
`test/telemetry.test.js` for the shape) and report floors reached / win-loss / death causes.

(Owner asked to hand this to a fresh **Codex `gpt-5.6-sol`** session in this repo; that launch was
deferred. Launch: `codex -m gpt-5.6-sol --dangerously-bypass-approvals-and-sandbox "<task>"` from
`C:\Users\dakot\king-mimic`, or use `C:\Users\dakot\new-codex-session.ps1 -Path C:\Users\dakot\king-mimic`
and paste the task. Codex shares this brain via `.codex/brain`.)

## Active decisions (non-obvious why only)

- This is an audit of EXISTING loot math, not a rebalance. Loot NUMBERS are Dakota's
  (`feedback_design_ownership`); engineering may only find/fix a discrepancy between advertised and
  awarded, and must FLAG any suspected imbalance for his ruling rather than "fix" it.
- Readability `scale` is `opsBothKinds ? "both" : triggerKind` — reuses the engine's own bucket so the
  symbol and progressive-disclosure wording can never disagree with bonus/trigger/pricing truth. The
  card's unique SVG is its primary identity; do not regress to repeated full-word type pills.
- Deploy: `public/*` is served fresh from disk (edits are live immediately), but the ENGINE
  (`game.js`/`engine/*`) is loaded into the Bun process at boot — snapshot/loot/logic changes require a
  Bun bounce to take effect.

## Landmines

- **Deploy safely:** push first, then bounce ONLY Bun (kill the single `:3000` PID, no `/T`); leave
  cloudflared alone or the tunnel URL rotates. Before killing, confirm no live player sockets (this
  session: the only ESTABLISHED `:3000` socket was the tunnel itself).
- **Desktop can't be screenshot-verified on this laptop** — the touchscreen makes both harnesses
  reject `VP=desktop` (`touch=true` mismatch). `HAND_SIZE=3`, so a touch-hand scenario holds ≤3 cards.
  (Saved to memory `reference_king_mimic_playtest`.)
- **Never `git add -A`** — stage intended files explicitly; the tree has many untracked owner/probe
  files (`nul`, design notes, scratchpad, `tools/*.mjs` probes, tier-sim, tunnel logs) that must stay
  untracked. Deletes need owner approval.
- **Three wording↔mechanics ambiguities await owner ruling** (flagged, deliberately NOT rewritten):
  Jaw's `capLanded` overkill wording; Crystal Ball tutoring from the discard too; Hedgefund Knight's
  "+1 damage" being baked into its token. Do not resolve unprompted.
- Pre-existing open rulings unchanged: King Mimic boss ward, RICH_ITEM_POOL leak, floor-1 difficulty,
  anti-stall valve, first-room elites, Acid Rain wording, provisional 1–5 card values.

## Pointers

- Loot code: `engine/world.js` + `engine/lobby.js` + `engine/combat.js` (`foeLootValue`, `roomValue`,
  `roomAnteBudget`, `claimLoot`, `rollBossLoot`, `bidPoints`, `convertBag`); `engine/snapshot.js`
  (map node `loot` preview ~720, `room.loot` payload ~760); `engine/kit.js::itemTreasure`.
- Readability code (shipped): `engine/kit.js` (`cardScale`), `engine/cards.js` (`cardOutcomes`/
  `cardSummaryLabel`/`cardLiveSummary`), `engine/snapshot.js`, `public/client.js`, `public/inventory.js`.
- Test: `bun run test/game.test.js` (2143/0); `test/squad.test.js`; `test/telemetry.test.js`;
  `test/fuzz.js`. Serve: throwaway Bun on a non-3000 port, then
  `BASE=http://localhost:<port> bun run test/serve.test.js`.
- Real mobile: `node tools/shoot.mjs`. Scenario capture: `node tools/scenario-shot.mjs tools/scenarios/<name>.json`.
- Read first: `CLAUDE.md` (verification bar, harness traps, design boundary).
