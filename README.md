# King Mimic

*Wear the bodies of the foes you defeat.*

King Mimic is a browser co-op deckbuilder roguelike. You and up to three friends are mimics:
every foe you kill drops a body you can wear, and every body — yours or theirs — plays by the
same rules, driven by the same moxie + cards economy. Fight through three boss floors, then
take the throne from the King Mimic himself.

> README current as of **2026-07-19**. Live technical state lives in [`HANDOFF.md`](HANDOFF.md)
> (newest-first); if this file and HANDOFF disagree, HANDOFF wins.

---

## Run it locally

Requires [Bun](https://bun.sh). Runtime dependencies: **zero** (Playwright is a dev-only
dependency for the screenshot/playtest harnesses).

```sh
bun install          # dev deps only — needed for the tools/ harnesses, not the game
bun run server.js    # or: bun run dev (hot-reload on save)
```

Open **http://localhost:3000**. For co-op, one player creates a room and shares the 4-letter
room code; everyone else joins with it — same URL, any browser, phones included.

## How to play

Each run starts with a **draft**: pick a starting body bundled with cards. From the map you
**choose a room**, set up your lane, then fight in **real-time combat** — playing cards costs
moxie, and foes are playing the exact same game back at you (same bodies, same cards, same
economy). Winning pays out loot: claim defeated bodies to wear, take their cards, spend levels
on Mastery and Specialty upgrades. Clear the floor's boss and **descend**. Three floors, each
capped by one of four rotating bosses; past floor 3 sits the throne and the true final boss.

Content at time of writing: **~134 cards**, **37 wearable bodies**, **5 bosses**
(Hyper-Inflation Hydra, Litigation Lich, Djinn of Deals, Kleptomaniac Kraken, and King Mimic
on the throne).

## Development

- [`CLAUDE.md`](CLAUDE.md) — the verification bar every change must pass before commit.
- [`HANDOFF.md`](HANDOFF.md) — live technical state, newest entries first.

Main deterministic suites (all run under Bun):

```sh
bun run test/game.test.js            # core engine, data-driven
bun run test/body-passives.test.js   # per-body causal passive matrix (release gate)
bun run test/squad.test.js           # squad behavior
bun run test/telemetry.test.js       # telemetry events
bun run test/fuzz.js                 # full-run fuzzing
bun run test/serve.test.js           # served client — needs a running server (see CLAUDE.md)
```

End-to-end verification uses REAL runs, never fixtures: `node tools/shoot.mjs` (solo
screenshots) and `node tools/mp-playtest.mjs` (2-player co-op). See CLAUDE.md for the exact
release bar and harness traps.

## Architecture

Authoritative **Bun WebSocket server** on a fixed **100ms tick**; clients send intents and
render server snapshots on a vanilla-JS `<canvas>` — no client prediction, no framework,
no runtime dependencies.

| Module | Role |
|--------|------|
| `server.js` | WebSocket rooms + tick loop + static file serving |
| `game.js` | Thin barrel re-exporting the engine (edit the modules, not the barrel) |
| `engine/lobby.js` | Draft, rooms/map, foe generation, boss machinery |
| `engine/combat.js` | Combat resolver: targeting, passives, damage, `simulateTick` |
| `engine/snapshot.js` | Client-facing state projections |
| `engine/cards.js` | Deck/card logic + moxie constants (card definitions in `content-cards.js`) |
| `engine/bodies.js` | Body/boss content tables, lanes |
| `public/client.js` | Canvas client: renders snapshots, sends intents |
| `tools/` | Screenshot + playtest harnesses (`shoot.mjs`, `scenario-shot.mjs`, …) |

## Credits

Game design by **Dakota**. All design and content — cards, bodies, numbers, effects, art
direction — is owner-authored; agents build engine, rendering, and tests only.
