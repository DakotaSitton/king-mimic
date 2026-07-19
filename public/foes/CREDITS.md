# Foe icon attribution

The foe / boss / class tokens in `public/foes/*.svg` are built from icons by
**game-icons.net**, licensed under **CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/).

Icon authors used (game-icons.net):
- carl-olsen
- caro-asercion
- cathelineau
- delapouite
- lorc
- skoll

Each token recolors a single icon path onto King Mimic's themed badge; see
`tools/generate-foe-art.js` for the exact key → icon mapping. Regenerate with:

    git clone --depth 1 https://github.com/game-icons/icons.git ~/game-icons-src
    bun run tools/generate-foe-art.js
