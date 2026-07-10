# Card art — architecture & upkeep

Every playable card is depicted by a small tinted vector token, mirroring the proven **foe-art**
pipeline. Foes had real art (`public/foes/*.svg`); cards only had text + a color strip. This gives
cards the same treatment so a card and its matching foe can share a look.

> ⚠ **ART DIRECTION IS THE OWNER'S.** Every glyph shipped here is a **best-fit placeholder** chosen by
> tooling (game-icons.net, CC BY 3.0). *Which* glyph depicts *which* card is Dakota's call — the seed
> map is his to override, exactly like the foe `ART_ALIAS` placeholders. The engineering (enumerate
> every card, tint to the card's hue, degrade gracefully, render on every surface) is what's owned here.

## Upkeep — the one-line story
To give a **new card** an icon:

1. Add one line to the `CARD_ART` map in `tools/generate-card-art.js`:
   ```js
   yourCardKey: { i: "<author>/<icon-name>" },   // e.g. lorc/broadsword
   ```
   (Browse `~/game-icons-src/<author>/<name>.svg` for a glyph. Color is automatic — it defaults to
   the card's own `color` field in `engine/kit.js`. Pass `c: "#hex"` only to override the tint.)
2. Run:
   ```
   bun run tools/generate-card-art.js
   ```
   It writes `public/cards/<key>.svg`. Client change only → **hard-refresh** to see it (no server restart).

That's it. The generator reads the **live KIT**, so it always covers every current card; new keys that
land on sibling branches are picked up on the next run.

## How a card with NO map entry degrades
Never a blank or `❔`. Two independent safety nets:

- **Generator:** a card with no `CARD_ART` entry still gets a real `public/cards/<key>.svg` — the
  neutral fallback glyph (`faithtoken/card-random`, a generic card) **tinted to that card's own hue**.
  The run prints a `⚠ … have NO CARD_ART entry` list (also written to `public/cards/CREDITS.md`) so the
  "still needs art" set stays visible.
- **Client:** if the `.svg` file is missing entirely (a brand-new card added since the last generate),
  the HTML `<img class="km-ico">` swaps to a `🃏` emoji `onerror`, and the canvas draw is guarded on the
  sprite being `complete` — so it simply draws nothing extra rather than a broken image.

## Pieces
| Piece | File | Role |
|---|---|---|
| `CARD_ART` map + generator | `tools/generate-card-art.js` | key → game-icon; enumerates `KIT ∪ PLAYER_POOL`; writes tokens + `CREDITS.md` |
| Card tokens | `public/cards/*.svg` | one 64×64 tinted token per card (75 today) — **git-tracked artifacts** |
| Attribution | `public/cards/CREDITS.md` | CC BY 3.0 authors + the "needs art" list (generated) |
| Canvas loader | `public/client.js` `cardSprite(key)` | lazy-loads `/cards/<key>.svg`; repaints on load (twin of `foeSprite`) |
| HTML icon | `public/client.js` `cardIconImg(key)` | `<img class="km-ico">` with `🃏` fallback (twin of `iconImg`) |

## Where the icon renders
- **Hand / hotbar cards** (`drawHotbar`): the token as a faint **emblem behind the text** — pure
  identity, adds no vertical space, so the name/effect/damage never reflow (readability was the hard
  constraint). Alpha is low (0.18 desktop / 0.24 touch), multiplied by the card's affordability dim.
- **Card-read popover** — in-combat canvas tooltip (`drawTooltip`) shows a crisp icon top-left; the
  HTML tile popover (`showCardTip`) reuses the tile's own icon.
- **Every HTML card list** — deck-builder (deck + backpack), shop wares, shop/level-up pay trays, and
  loot claim, via `cardTile` + the inline tiles. The **Crystal Ball tutor picker** (`openPickUI`) too.

## Why the token helpers are duplicated (not shared)
`iconInk` / `iconPaths` / `token` are copied from `tools/generate-foe-art.js` rather than imported from
a shared module. `generate-foe-art.js` is the **proven, live** pipeline; refactoring it to pull a shared
module would put a diff on working code for ~30 lines saved. Self-containment means this generator can't
break the foe one, and the foe pipeline stays byte-identical. If both ever need a frame change, *then*
factor out `tools/lib/icon-token.js`.

## Frame
Same 64×64 rounded-square token as foes (colored badge + sheen + centered glyph), so a card icon and a
foe icon read as one family. A card-specific frame (portrait, rarity border, …) can come later — this is
the "square token like foes, to start" baseline.

## Deploy
**Client-only.** No engine/server change — `public/*` is served per request, so a hard-refresh ships it.
The `public/cards/*.svg` are committed artifacts (like `public/foes/*.svg`); regenerate any time with the
command above.
