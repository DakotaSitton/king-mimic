# UI friction audit — 2026-09-23

Source: real `tools/shoot.mjs` runs at 852×393 touch (7 runs, 0 JS errors) plus real-server
scenario captures for run win, defeat, body swap, level up and backpack. Branch `claude/ui-streamline`.
Ranked by how much each problem confuses a player. Balatro yardstick: one obvious action, big
readable numbers, satisfying feedback, minimal text, details on demand.

| # | Screen | Friction | Status |
|---|---|---|---|
| 1 | After every fight | A **wall of combat-log text** is the victory screen. There is no "you won, here's what you got" payout moment; the actual reward screen sits underneath until ▶ Continue. | **Fixed** — payout first (HP, foes, threat, cards); log one tap away |
| 2 | Between rooms (solo) | Loot was collected **silently**: "spoils collected into your backpack", with no cards shown. | **Fixed** — YOU GOT strip: card art, ×N, total ◈ |
| 3 | Run win | Killing the King titled itself "Victory — Floor 4", the same as any room. The crown screen was hidden behind it. | **Fixed** — "Run complete — the throne is yours" + run report on the log. The crown screen still waits behind Continue. |
| 4 | Draft | Each body's power is a paragraph squeezed into a narrow column. The only action is a small "CHOOSE" in the corner. The colour picker takes a full row before the real choice. The room code shows twice. | **Fixed** — fits one phone screen |
| 5 | Combat | Your own row has a **red** seat border, which reads as danger/incoming hit. "YOU · name" is tiny. About a quarter of the board is empty above the foe. Foe intent chips truncate ("0/5 E…"). The top "×" is Leave but reads as close. | Chip/name truncation **fixed**; red seat colour is his palette |
| 6 | Room choice | Five controls stand before the choice (swap body, Rooms/Backpack tabs, boss banner, map). Rooms at the same threat read identically. Drops are micro-text. | Numbers now big and self-labelled |
| 7 | Setup → Level Up | Unspent points were a grey "3pt free" suffix on a row identical to a no-op row. | **Fixed** — gold glow + "3 pts to spend" / "level up ready" badge |
| 8 | Body swap | Text-only cards with no art. The adoption line is dense ("🔒 ◈11 — need spare cards or 💎"). | **Fixed** portraits. Adoption copy still dense |
| 9 | Draft / room / setup | The room pill (code + Share Invite) overlaps the panel's top-right, even in solo. | Open (small) |
| 10 | Top bar | "Room cleared! 🎉" showed on the first room choice, before any fight. | **Fixed** — "Choose your first room" / "Run complete!" |

Harness gaps closed in the same branch: `shoot.mjs` now taps Continue and shoots the reward screen.
`scenario-shot` has `tapContinue`/`tapLevelPanel`. `run-complete-exit` passes again.
Known stale spec (not touched): `body-swap-level-respec.json` expects a melee/ranged pick modal that no
longer opens on swap.

3D view (merged 2026-09-23): nameplates hid the creatures on phone and there was no hit feedback. **Fixed**:
one-line plates, floating numbers, 🛡 glyph.
