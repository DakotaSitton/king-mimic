# Card icon attribution

The card tokens in `public/cards/*.svg` are built from icons by **game-icons.net**, licensed under
**CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/).

⚠ Every glyph is a BEST-FIT PLACEHOLDER chosen by tooling; which icon depicts which card is the
owner's art call and may change. Each token recolors a single icon path onto King Mimic's themed
badge (tinted to the card's own hue); see `tools/generate-card-art.js` for the key → icon mapping.

Icon authors used (game-icons.net):
- badges
- carl-olsen
- delapouite
- faithtoken
- john-colburn
- lorc
- sbed
- skoll
- zeromancer

Cards still on the neutral fallback glyph (need bespoke art):
- oAcid
- oAstralFist
- oBansheeWail
- oButterflyKnife
- oCrimsonCrown
- oEarth
- oFlameOrbs
- oGravitySword
- oJaw
- oMeteorMaul
- oMirrorMace
- oPunishGlutton
- oRevealLight
- oStarblade
- oStudy
- oTriblade
- oZaWarudo

Regenerate with:

    git clone --depth 1 https://github.com/game-icons/icons.git ~/game-icons-src
    bun run tools/generate-card-art.js
