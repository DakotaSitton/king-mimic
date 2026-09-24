# King Mimic dungeon preview

Open `/?view=dungeon` on the game server. This opt-in view uses a Three.js stone
dungeon with illustrated creature standees from the existing SVG artwork. The
server still owns all combat, cards, body progression, multiplayer and saves.

The new controls include clickable creatures and lanes, public enemy intents,
teammate queued cards, an interactive hand with queue/choice handling, formation
controls, room voting and a between-room equipment/reward view. Full deck, body,
level and inventory tools remain available through the existing management UI.
Audio and balance/content changes are outside this preview.

## Run locally

```powershell
bun install
$env:PORT='3210'
$env:KM_DATA_DIR="$PWD/artifacts/dungeon-runtime"
bun run server.js
```

Visit `http://localhost:3210/?view=dungeon`. To play with friends on the same
network, open the server computer's LAN address with port 3210 first, then use
Invite. A localhost invitation only works on the server computer. The Menu can
switch back to the classic view while retaining the room's reconnect token.

`public/vendor/three.js` is the self-contained, minified browser bundle of the
pinned Three.js 0.185.1 dependency. It is served locally, without a CDN. Rebuild
with `bun run build:dungeon`; retain the adjacent MIT license.

## Verify the served view

Start the isolated server above, then in another PowerShell terminal:

```powershell
$env:BASE='http://localhost:3210'
$env:VIEW='dungeon'
$env:BODIES='3'
$env:NODES='2'
$env:BUDGET='90'
node tools/shoot.mjs
node test/dungeon-ui.test.mjs
```

For a real post-victory body change, reward equip and next-room check, set
`DIFFICULTY=easy`, `VERIFY_JOURNEY=1`, `NODES=3` and `BODIES=1` before running
`tools/shoot.mjs`. This mode fails if the random run never reaches that path.

The screenshot harness uses a real random run at phone landscape dimensions and
requires loaded WebGL entities alongside the original render assertions.
`VP=desktop-touch` selects the 1440×900 touchscreen laptop profile. The separate
dungeon acceptance test creates three independent human seats and drives visible
controls through voting, setup, targeting, queueing, movement and normal combat.
It records any naturally unreached choices or rewards instead of injecting them.
Screenshots and reports are under ignored `tools/shots/` and `artifacts/`.

This is a local preview branch. Railway deployment requires a separate release
and the repository's real production playthrough gate.
