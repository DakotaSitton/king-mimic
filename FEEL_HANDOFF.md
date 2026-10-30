# HANDOFF — the twin-stick + charge-up feel → Dakota's monster raiser — 2026-10-29

This is a TRANSPLANT document. It describes exactly what makes King Mimic's FLICK mode feel great, so a
cold session can rebuild that feel inside a different game (Dakota's monster-raising idea). It is not a
changelog and not a design for the monster raiser — that design is Dakota's.

Owner, after playing it on his phone: "it actually is really fun… I like the charge up and such." Then:
"keep what is making this feel great… just specifically how well we have made the twin stick, charge up
a move then unleash it… I want to give these mechanics over to my monster raising game idea."

Source of truth for every pointer below: repo `DakotaSitton/king-mimic` (public), branch
`claude/flick-deckbuilder`, commit `3dc4c66` or later —
https://github.com/DakotaSitton/king-mimic/tree/claude/flick-deckbuilder — local worktree
`C:/Users/dakot/km-flick`. Playable reference: http://100.123.187.85:3214 (Tailscale).

## State

- VERIFIED on Dakota's own phone (the signal that matters): the stick + flick + charge-up loop "felt
  great", "really fun". Played solo; co-op was built afterwards and driven by real-browser runs only.
- VERIFIED by tests: `bun run test/flick.test.js` → 2483 checks pass (geometry, wind-up lifecycle,
  telegraph-and-dodge, gesture-independent rules, co-op wire). REAL runs: Edge at 852×393 with real
  CDP touch input — solo and 2–4 phones in one room, 0 errors, ~97–100% of flicks land.
- NOT verified: Safari / a physical iPhone in this exact build, latency off Tailscale, controllers.

## Next step

In the monster-raiser project, build ONE test room before any monster-raising system: a character on
the stick, three move buttons on the right with the flick gesture, two moves with clearly different
charge-ups (a 0.4 s jab and a 1.8 s wide sweep), one enemy that telegraphs its own charged move, and the
shared preview/hit geometry. Play it on the phone. If it doesn't feel like FLICK, fix that first —
everything below is the checklist for "feels like FLICK".

## The feel kernel — what to carry over (rule · numbers · why · where)

1. **Two thumbs, two jobs.** Left 45 % of the screen is a FLOATING stick: it appears wherever the left
   thumb lands, radius 54 px, 6 px dead zone, full speed at the rim, and the base slides along behind
   the thumb if it goes past the rim (no "ran off the stick"). The right side is the moves: three big
   buttons (82×100 px) in the bottom-right, plus a small "next up" peek. An idle ghost ring shows where
   the stick lives. *Why:* nobody has to look at their thumbs; it's the Brawl Stars / Wild Rift grammar.
   `public/flick/client.js` — `addEventListener("pointerdown"…)` :220, `pointermove` :241,
   `drawStick` :830; `STICK_R` :207.

2. **The flick (aim) gestures — three ways in, one result.**
   - *Press a move and drag:* a reticle grows from the character the instant the thumb lands
     (auto-aimed at the current target); the drag direction aims it; for PLACED moves (land at a
     point) the drag length sets distance — 12 px dead zone, 100 px = full range; release = unleash.
     Drag back onto the start point = cancel.
   - *Tap to ready:* a tap (< 380 ms, < 12 px) readies the move with its reticle auto-aimed; then a
     flick ANYWHERE on the right side aims and unleashes; tapping the readied move again unleashes at the
     auto-aim. (This is the "tap the card then flick the direction" Dakota asked for.)
   - *Hold to read:* holding 380 ms without moving shows the move's info; start dragging and the info
     closes and it becomes an aim.
   - *Visible aim assist:* a flick within 10° of an enemy in reach snaps onto it; a placed reticle within
     1 tile of an enemy snaps onto it. The PREVIEW shows the snapped result, so it's still honest.
   - *Queue:* flick while still charging and the next move queues, fires the moment the current one
     lands (re-runs the assist so it tracks its target), expires after 6 s; tap it to unqueue.
   `client.js` — `cardDown` :293, `endPointer` :261, `rawAim` :327, `assist` :339, `autoAim` :320,
   `currentAim`/`defaultAim` :360/:367, `castSlot` :371, `tickPending` :388; `DEAD`/`AIM_PX`/`HOLD_MS`
   :23–25.

3. **Charge up, then unleash — the heart of it.** Every move has a wind-up ("ramp-up") and its size and
   power scale with it. One move at a time. While winding up you can still drift at 45 % speed (you're
   committed, not frozen). Swings, thrusts and charges FOLLOW you with their direction locked at release;
   placed moves LOCK their spot at release. The reticle stays up while charging and FILLS from its origin
   outward (circle radius × p, arc radius × p, line length × p) — you watch it charge — then flashes for
   0.25 s when it lands. The move buttons dim with a fill while you're busy.
   Reference moves (`engine/flick/content.js`), wind-up → shape → damage:
   Dagger 0.4 s → 70° arc r1.25 → 2 · Sword 0.7 s → 110° arc r1.7 → 3 · Spear 0.8 s → thin line
   3.3×0.45 → 4 · Bow 0.9 s → arrow, first enemy, range 9 → 3 · Charge 1.0 s → dash 4.5 tiles at 22
   tiles/s, hits all passed → 4 · Fireball 1.1 s → placed blast r1.5 within 7 → 6 · Zweihänder 1.8 s →
   200° arc r2.6 → 8.
   `engine/flick/sim.js` — `beginCast` :332, `tickEnt` (wind-up timer, drift) :403, `resolveCard` :432,
   `windupOf` :204; reticle fill `client.js` `shapePath(sh, p)` :614 / `drawShape` :624.

4. **One geometry for the preview AND the hit (the honesty rule).** `shapeOf(state, caster, move, aim)`
   returns the world shape (arc / line / shot / placed circle / self ring / dash); `hitsOf` returns what
   overlaps it (counting target radius; shots hit only the FIRST target; walls cut lines, shots and
   placement). The client draws the reticle from `shapeOf` and labels every target it will hit
   ("−6" gold over each enemy, "+6" green over allies); the sim resolves with the SAME two functions.
   *Why:* "it shows exactly what you'll be hitting" — never compute the preview separately.
   `sim.js` `shapeOf` :235, `overlaps` :254, `hitsOf` :275; `client.js` `drawAimPreview` :651.

5. **Enemies charge up the same way (telegraph parity).** Enemies use the same move shapes. Their NEXT
   move floats above their head as an icon; when they start charging it grows, gets a coral ring that
   fills, and a coral reticle fills on the ground. Enemies stand still while charging (readable), charge
   longer than you (`wind-up × 1.25 + 0.35 s`, so even a jab is dodgeable on a phone), rest 1.0 s
   between moves, and take turns: at most 1 + party-size non-swarm enemies charge at once. They spread
   their attention over a party (a hero already targeted by N others counts as N × 2.5 tiles farther).
   Stepping out of a coral reticle = dodged. *Why:* the dodge is half the fun of a charge-up system.
   `sim.js` `thinkFoe` :624, `turnFree` :604, `pickTarget` :610, `foeNext` :582; `client.js`
   `drawIntent` :740.

6. **Readability defaults.** Gold = your reticle/charge, sky blue = allies', coral = enemies'; teal =
   you; white damage numbers, green heals. Camera ≈ 19 × 10.5 tiles on a landscape phone
   (`TS = clamp(min(H/10.5, W/19), 26, 54)` px per tile), follows with a 0.18 lerp, character 0.6 tile
   above centre (bottom corners belong to the thumbs). Body radius 0.38 tiles; move speed 3.0 tiles/s;
   enemies at 0.75×. Toasts sit at the top edge, never over the character.
   `client.js` `resize` :35, `render` :866, `drawEnt` :685.

7. **Movement that never snags.** Circle-vs-tile collision resolved axis by axis; a body inside a solid
   tile leaves through the nearest face that opens onto floor; friends pass through each other, bodies
   bump enemies, no shove moves anyone more than 0.25 tiles a frame. 2-tile-wide corridors.
   `sim.js` `moveEnt` :711, `resolveWalls` :716, `separate` :733.

8. **If the raiser is real-time co-op too:** the server runs the same sim; each phone moves its own
   character instantly and reports it (~20/s); the server accepts it within a walking allowance through
   no walls, else snaps the phone back (`forceSeq`); a phone shows its own charge-up immediately
   (optimistic) and sends its position with each move; others glide between ~20 snapshots/s.
   `sim.js` `netMove` :300, `walk` :426; `engine/flick/net.js` `snapFor` :39, `applySnap` :71,
   `advanceMirror` :98; `flick-server.js`.

## Active decisions (non-obvious why only)

- Power is paid in TIME (the wind-up), not only in a resource — that's what makes a big move feel big
  and what makes the dodge game work. FLICK round 3 added mana for spells on top, but weapons stayed
  free; the charge-up is the part Dakota said he likes.
- Foes telegraph LONGER than you on purpose (phones need reaction time); parity is in the rules, not the
  numbers.
- Aim assist only ever moves the reticle you can see — never a hidden correction after release.
- A new touch on either side ALWAYS takes over a stale gesture; OS cancels and blur drop touches without
  unleashing. (iOS edge swipes lose finger-ups; without this the hand froze.)
- The drag dead zone (12 px) separates "tap to ready" from "flick to aim" — keep it; it's why both
  gestures coexist on one button.
- Placed moves lock where they were aimed; melee moves follow you. Changing either makes the reticle lie.

## Landmines (learned the hard way)

- Never compute the preview and the hit separately — the reticle WILL drift from the truth.
- A zero aim vector made a line overlap everything on the map; always normalise with a fallback
  direction (`norm` in sim.js).
- The hold-to-read timer must cancel the moment a drag starts, or slow frames pop info mid-aim.
- Fast cheap summons dominate damage (rats did 3–5× any move) — cap their count, lifetime, bite rate.
- If moves cost a resource, an unaffordable move must still be able to cycle out (FLICK: it fizzles),
  or the hand jams.
- Landscape phones are short: any overlay's exit button must be pinned on screen (FLICK's reward sheet
  once pushed "Continue" off-screen).
- Test drivers: in Chrome/Edge CDP, lifting ONE of several fingers is a `touchEnd` listing just that
  finger — a `touchMove` with fewer points lifts nothing (`tools/flick-shoot.mjs` relies on it).
- Co-op: keep a test that round-trips a snapshot through the wire and checks every field the HUD reads
  (a stray comment once silently dropped body/colour from every player).

## Not part of the feel (King Mimic / dungeon-crawler specifics — leave behind unless wanted)

Cards, the drawn 3-card hand and deck cycling, mimics and body-swapping, gems, mana and levels,
floors/rooms that seal, room rewards, encounters, the corporate-hell cast. The transplantable unit is a
MOVE = `{ wind-up, shape, effect }` plus the gesture and telegraph systems above — a move schema looks
like `{ name, windup: 0.7, shape: { kind: "arc", r: 1.7, deg: 110 }, dmg: 3 }` (see `content.js`).

## Decisions that are Dakota's before porting (questions, not answers)

- Who is on the stick — the trainer, the monster, or switching between them?
- Where moves come from — a monster's fixed move set (always available), a drawn hand, or something else?
- What power costs — the charge-up alone, a resource, cooldowns?
- Does raising a monster change its charge-ups (faster wind-up, bigger shapes, new shapes)?
- Solo, co-op, or versus?

## Pointers

- Run the reference: `bun run flick-server.js` → http://localhost:3214 (solo) or `/?room=CODE` (co-op).
- Test: `bun run test/flick.test.js` · real-touch driver: `node tools/flick-shoot.mjs` (`PLAYERS=3` for
  co-op) · balance bots: `bun run tools/flick-balance.mjs 16`.
- Key files: `engine/flick/sim.js` (rules: moves, wind-up, geometry, enemy brain) · `public/flick/client.js`
  (stick, flick gestures, reticles, telegraph drawing) · `engine/flick/content.js` (every number) ·
  `engine/flick/net.js` + `flick-server.js` (co-op) · `engine/flick/bot.js` (test pilot).
- The dungeon crawler itself continues in this repo — its state is in `HANDOFF.md`.
