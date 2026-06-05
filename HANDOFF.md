# King Mimic — Session Handoff

> Pick-up doc for a fresh Claude Code session. Read this first.

## What this is
A **web-based co-op multiplayer browser game**: soft-real-time **lane-defense roguelike**.
3 vertical lanes; foes have visible attack "charge bars" (telegraphs); players use
cooldown-gated equipment/abilities to defend a shared **Caravan** HP bar. Players have HP
from their worn **body** (the mimic mechanic) — defeating a unique foe unlocks its body for
the whole party to wear. Rooms are pre-filled with ALL foes (no waves). A Slay-the-Spire
style node map lets the party advance after clearing a room.

Reference class for upside: Skribbl / Jackbox (cheap to host, viral co-op).

## How to run
```
bun run server.js        # serves game on http://localhost:3000 (check port in server.js)
bun test                 # runs all tests (game logic + asset serving + WS smoke)
```
Requires **Bun** (installed via winget). Do NOT run the server with `--watch` in the
background and leave it — it reloads mid-edit and burns CPU. Start it foreground when
playtesting, stop it when done.

## Architecture (the key win)
- **`game.js`** — PURE game logic, no networking. Deterministic, millisecond unit tests.
  Constants: LANES=3, CARAVAN_MAX_HP=20, ROOM_SIZE=7, REVIVE_TICKS=100, GOD_CD=5.
  BODIES (rookie 8hp/2atk, pixie 5/1, auditAngel 8/2, killionaire 13/4), KIT (fire, fireII,
  lightning, towershield, wheelbarrow, light, fairyBottle). Key fns: newRoom, addPlayer,
  startLevel, beginCombat, enterRoom, advanceLevel, useItem, damageEnemy, damagePlayer,
  simulateTick, wearBody, snapshot.
- **`server.js`** — networking ONLY. `Bun.serve` + WebSocket; authoritative server, fixed
  100ms tick (TICK_MS), broadcasts full-state snapshot each tick. Imports game.js + content.js.
- **`content.js`** — 118-card library (36 FOES, 4 BOSSES, 66 EQUIPMENT, 12 TOKENS).
- **`public/client.js`** — canvas combat renderer + `window.KM` panel bridge.
- **`public/map.js` / `map.css`** — left-side node map; clicking advances.
- **`public/inventory.js` / `inventory.css`** — right-side body + equipment cooldown panel.
- **`public/foes/<key>.svg`** — generated foe badge art (37 files).
- **`tools/generate-foe-art.js`** — regenerates the SVG badges.
- **`test/game.test.js`** (61 checks), **`test/serve.test.js`** (20), **`test/smoke.js`** (WS).

## Game flow
`lobby → setup (position freely, cooldowns frozen) → playing → won/lost`, then advance
to next map node. Boss room clear sets `levelComplete`.

## DEMO god mode
Enter a room named **`DEMO`** → god mode: all items charged immediately, huge HP/caravan,
all bodies unlocked. For solo playtesting.

## Status (as of 2026-06-05)
- All 61 logic + 20 serve tests pass; WS smoke passes.
- Committed + pushed to PRIVATE repo: https://github.com/DakotaSitton/king-mimic (branch `main`).
- Autonomy/bypass mode set in global + project `.claude/settings.json`.

## Open threads / next up
- Multiplayer is functional (2-client smoke passes); friend only needs a browser + the URL
  once hosted. Hosting not yet set up.
- User hinted at a big playtest-driven balance/gameplay pass ("before we absolutely devastate me").
- Possible polish: better foe art, sound, lobby UX, win/loss screens, hosting/deploy.
