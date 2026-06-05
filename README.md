# King Mimic

A **soft-real-time co-op dungeon crawler** that runs entirely in the browser. Share a URL,
type a 4-letter room code, and crawl together. *Wear the bodies of the foes you defeat. Protect the caravan.*

> **For future Claude:** this is the canonical project doc. Read it before changing rules. The
> game pivoted from a turn-based card game to this real-time form (see "History" at the bottom).
> The owner's design intent right now: **calm, thinky, no time pressure.** Do not reintroduce
> clocks/countdowns without being asked.

---

## How to run

Requires [Bun](https://bun.sh) (installed at `%USERPROFILE%\AppData\Local\Microsoft\WinGet\Links\bun.exe`).

```sh
cd king-mimic
bun --watch run server.js      # --watch hot-reloads on file save
```

Open **http://localhost:3000**. To test co-op, open it in **two browser tabs**:
1. Tab 1 → **Create room** → note the 4-letter code.
2. Tab 2 → enter the code → **Join room**.
3. Either tab → **START**.

Multiple real people just visit the same URL on the same network (or a deployed host) and join with the code.

### Controls
| Key | Action |
|-----|--------|
| **WASD** / **Arrows** | Move (hold to keep moving) |
| **J** / **Space** | Attack the tile you're facing |
| **K** | **Swap** — wear the body of an adjacent corpse |

---

## The core idea (what makes it *King Mimic*)

You are a **mimic**. Your "body" is just a template you're wearing. When you defeat an enemy it
leaves a **corpse**, and you can press **K** to *become* it — adopting its HP, attack, and reach.
That's the signature decision: mid-crawl, do you stay in your current body or shed it for the
thing you just killed? Your wounds carry across the swap (you keep your HP %), so it's a real
trade, not a free heal.

The cast is corporate-hell money-monsters (Killionaire, Audit Angel, Penny Pixie…) — the same
identity from the original card game. The enemy bestiary and your wardrobe of bodies are the
**same list**.

A shared **Caravan** (a 20-HP wagon on the left) is the team's lifeline. Enemies march toward it.
**If the caravan hits 0, the run is over — that is the only way to lose.**

---

## Current rules (as of this version)

- **No clock. Nothing is timed against you.** Enemies only exist when a wave is active, and the
  next wave **only spawns when a player presses NEXT WAVE.** Between waves the world is frozen:
  no enemies, corpses don't rot, you can wander and reposition freely.
- **Waves:** 5 total. Wave _n_ spawns `1 + n` enemies on the right edge. Clear them all → the
  "cleared" calm phase → press **NEXT WAVE** when ready. Clear wave 5 → **VICTORY**.
- **Getting downed isn't death.** At 0 HP you're "downed," then **auto-revive after ~10s** at half
  HP — and *everyone* instantly revives when a wave is cleared. Downed players cost nothing.
- **Losing** happens only if the **caravan reaches 0 HP**. With slow enemies and player-summoned
  waves, that now takes real neglect.
- **Pacing:** players step ~every 0.3s; enemies crawl ~every 0.9s. Deliberately slow and readable.

---

## Architecture

```
Browser tab(s)  ──WebSocket──►  Bun server (authoritative)
   client.js                       server.js
   - renders snapshots             - holds the ONLY real game state
   - sends input intents           - fixed tick loop resolves everything
   - never simulates locally       - broadcasts full state to all tabs in the room
```

**The soft-real-time trick:** the server runs a fixed simulation tick (every `TICK_MS` = 100ms).
Clients send *intents* ("I'm holding left", "attack now") and render whatever state the server
last sent. They never predict or simulate. So a player's input simply lands on the next tick —
on a grid game that ~100ms delay is invisible, and we get real-time *feel* with **zero netcode
complexity**: no rollback, no lag compensation, no client prediction. This is why it's "soft"
real-time and why the codebase is small.

State is broadcast as a full snapshot every tick (it's tiny — a handful of entities on a grid),
so clients are always authoritative-consistent and reconnection is trivial.

### Files
| File | Role |
|------|------|
| `server.js` | Everything authoritative: rooms, the tick loop, game rules, WebSocket handling, static file serving. The whole game lives here. |
| `public/index.html` | Lobby + game shell (canvas, HUD). |
| `public/client.js` | Thin renderer: draws server snapshots to `<canvas>`, sends keyboard intents. |
| `public/style.css` | Styling. |
| `package.json` | Scripts (`bun run dev` / `start`). |
| `.claude/settings.json` | Permission allowlist so Claude can run Bun without prompts (scoped to this project). |

### Server concepts (glossary for future edits)
- **Room** — one game instance, keyed by a 4-letter code. Holds players, enemies, corpses,
  caravan, walls, `phase`, and its own `setInterval` tick handle (started on first join, stopped
  when empty).
- **Phase** — `lobby → playing → cleared → playing → … → won | lost`. `cleared` is the no-pressure
  between-waves state.
- **Body template (`BODIES`)** — `{ name, maxHp, atk, reach, color, enemy, fast }`. **The same
  templates are used for enemies AND for what a player can become.** This symmetry is the engine's
  backbone — add a monster and you've added a wearable body for free.
- **Intent** — a player's latest input (`intentDir`, plus one-shot `attack`/`swap` messages). The
  tick loop reads intents; it never acts on raw network timing.
- **Corpse** — `{ x, y, bodyKey, ttl }` dropped on enemy death; the **K**/swap target.

### WebSocket messages
- Client → server: `create`, `join {code}`, `start`, `move {dir}`, `attack`, `swap`.
- Server → client: `joined {code, you}`, `state {…full snapshot…}`, `error {message}`.

---

## Tunables (top of `server.js`)

Change the feel by editing these constants — `--watch` reloads on save:

| Constant | Now | Meaning |
|----------|-----|---------|
| `TICK_MS` | 100 | Simulation step (ms). |
| `MOVE_TICKS` | 3 | Ticks between player steps. Lower = faster player. |
| `ENEMY_MOVE_TICKS` | 9 | Ticks between enemy steps. Higher = slower, easier. |
| `ATTACK_COOLDOWN_TICKS` | 3 | Ticks between your attacks. |
| `REVIVE_TICKS` | 100 | Ticks until a downed player auto-revives (~10s). |
| `MAX_WAVE` | 5 | Run length. |
| `CARAVAN_MAX_HP` | 20 | Team lifeline; loss = this hits 0. |
| `CORPSE_TTL` | 200 | How long corpses linger during combat. |
| `GRID_W` / `GRID_H` | 21 / 13 | Arena size. |

Enemy roster + stats live in the `BODIES` object. Wave composition is in `spawnWave()`.

---

## Known limitations / where it's thin

- **Bodies differ only by stats** (HP / attack / reach). They have **no distinct abilities yet** —
  this is the #1 thing standing between "tech demo" and "game." The intended next step is giving
  each body a real *verb* (dash, ranged shot, AoE, shield) behind a frozen ability interface, then
  fanning that work out across the bestiary.
- No persistence, accounts, or matchmaking — pure ephemeral rooms.
- Not deployed yet (runs locally). Target was a cheap host like Fly so friends can join by link.
- Art is primitive (colored discs + emoji). Fine for prototyping feel.

## Roadmap (rough)
1. **Feel pass** — tune the constants above until movement/combat feel right. *(serial, taste-driven)*
2. **Distinct body abilities** behind a stable interface — turns the 100+ designed monsters into real content.
3. **Deploy to Fly** — share a link.
4. **Art + polish.**

---

## History
Originally a **paper-playtested co-op card roguelike** (hundreds of hours of testing). Pivoted
2026-06-04 to this real-time grid form because the owner wanted real-time's cognitive challenge.
The card game's *soul* carried over — mimic body-swap, money-monster cast, the shared caravan —
but its turn-based *balance* did **not** transfer, so balance here is greenfield and playtest-driven.
Then simplified (this version) to remove all time pressure per the owner's feedback after a frustrating
"I randomly lost": no countdowns, player-summoned waves, forgiving revives, slower enemies.
