# King Mimic developer testing

The developer surface has two independent modes. Both run the real server, client, renderer, and combat loop.

## In-browser Developer Lab

Start a local server with the mutation gate enabled:

```powershell
$env:KM_SCENARIO = "1"
bun run server.js
```

Open `http://localhost:3000/?dev=1`, create a room, then press the red `DEV` button. The panel provides:

- 999 HP, heal, full moxie, treasure, unlock-all-bodies, and “foes to 1 HP” controls;
- pause/resume and one-tick stepping;
- one-click 5-foe, 16-foe, and mixed-summon starting states;
- a JSON editor for exact player, foe, hand, buff, summon, level, lane, HP, armor, treasure, and body states.

The two-key gate is intentional. `?dev=1` alone does nothing on a normal server, and `KM_SCENARIO=1` alone does not expose the panel. Dev/scenario rooms disable telemetry.

Use room code `DEMO` when you want the older run-length god mode: 999 HP on room entry, the complete kit, every body unlocked, and direct progression through real bosses. Use the Developer Lab scenarios when you need a precise board state.

## Repeatable scenario files

For a state worth keeping as a regression target, save it under `tools/scenarios/` and capture it with:

```powershell
node tools/scenario-shot.mjs tools/scenarios/<name>.json
$env:VP = "desktop"
node tools/scenario-shot.mjs tools/scenarios/<name>.json
```

The scenario schema is validated against the real `BODIES`, `KIT`, and buff tables. Unknown content fails before the room is mutated. Its main shape is:

```json
{
  "name": "my-case",
  "phase": "playing",
  "floor": 2,
  "players": [{
    "body": "rookie",
    "level": 3,
    "deck": ["oSword", "oSword", "oBow", "oBow", "dShield"],
    "hand": ["oSword", "dShield"],
    "moxie": 10,
    "hp": 20,
    "maxHp": 20,
    "shield": 5,
    "treasure": 20,
    "lane": 0,
    "buffs": [{ "kind": "stoneskin", "amount": 2, "dur": 9999 }]
  }],
  "foes": [{
    "body": "frugal",
    "gear": ["oDagger", "oSword", "oSpear"],
    "level": 2,
    "count": 5,
    "lane": 0,
    "hp": 12,
    "maxHp": 12,
    "dmgReduce": 2
  }],
  "summons": [{ "side": "hero", "body": "rat", "count": 2, "lane": 0, "player": 0 }]
}
```

`tools/scenario-shot.mjs` is for hard-to-reach visual/mechanical states. `node tools/shoot.mjs` remains the honest random-run check, and `node tools/mp-playtest.mjs` remains the real two-client multiplayer check.
