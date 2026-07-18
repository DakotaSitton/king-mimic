// Batch-generates a clean, consistent SVG token for every foe / boss / class.
//
// WHY THIS EXISTS (owner 2026-06-20): the old tokens embedded an EMOJI as SVG <text>. Emoji
// inside an SVG loaded as an <img> render as monochrome tofu (□) on most MOBILE browsers — they
// have no color-emoji font in the SVG-img sandbox. We play landscape on a phone, so that was the
// foe art being broken in the exact place it matters. The fix: real VECTOR paths (game-icons.net,
// CC BY 3.0) tinted onto the same colored token. Paths need no font, so they render identically on
// every device. The /foes/<key>.svg → canvas pipeline (client.js foeSprite) is UNCHANGED; only the
// file contents change. Emoji stays as the client.js fallback if a sprite ever fails to load.
//
// Source icons: a shallow clone of github.com/game-icons/icons (set GAME_ICONS_DIR to override).
// Run: bun run tools/generate-foe-art.js
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const ICON_DIR = process.env.GAME_ICONS_DIR || join(homedir(), "game-icons-src");

// key -> { c: token color, i: "<author>/<name>" game-icon }. The color is the foe's existing
// theme hue (carried over from the old emoji badges); the icon is a hand-picked game-icons match.
// Rarity variants (fatCat/fatterCatter/…) intentionally share an icon, differing only by color.
const MAP = {
  // ── player classes ────────────────────────────────────────────────────────
  rookie:        { c: "#9aa7d6", i: "lorc/drama-masks" },   // matches the app icon 🎭
  warrior:       { c: "#b85c4a", i: "lorc/broadsword" },
  rogue:         { c: "#5a6470", i: "delapouite/dagger-rose" },
  mage:          { c: "#6f5fae", i: "lorc/crystal-ball" },
  cleric:        { c: "#d8c97a", i: "lorc/holy-symbol" },

  // ── foes: attack → heal self ──────────────────────────────────────────────
  babyfangs:     { c: "#c0556a", i: "skoll/fangs" },
  vampire:       { c: "#a23b57", i: "delapouite/vampire-cape" },
  greatsword:    { c: "#8a2f47", i: "delapouite/two-handed-sword" },
  // attack → gain a +1
  internImp:     { c: "#b5564f", i: "lorc/imp-laugh" },
  medusa:        { c: "#6f8f4f", i: "cathelineau/medusa-head" },
  sphinx:        { c: "#c8a060", i: "delapouite/greek-sphinx" },  // own art (owner 2026-07-10): was a placeholder alias to medusa; color = Stockbroking Sphinx body hue
  affluenceAnubis:{ c: "#c9a24a", i: "delapouite/anubis" },      // own art (owner 2026-07-10): Affluence Anubis elite; color = the body hue (FLAG #c9a24a)
  killionaire:   { c: "#e6c34a", i: "lorc/profit" },
  // hourglass → attack
  pixie:         { c: "#76c98a", i: "delapouite/fairy" },
  youngdead:     { c: "#7fae6b", i: "delapouite/shambling-zombie" },
  phoenix:       { c: "#e08a3c", i: "lorc/eagle-emblem" },
  // attack → deal N
  basilisk:      { c: "#5fa37e", i: "lorc/lizardman" },
  lizardWizard:  { c: "#4f8fae", i: "lorc/wizard-staff" },
  runeblade:     { c: "#6c79c0", i: "lorc/rune-sword" },
  // damaged → attack
  accountant:    { c: "#b08a4a", i: "delapouite/abacus" },
  minotaur:      { c: "#a05a3a", i: "lorc/minotaur" },
  pyramid:       { c: "#caa23c", i: "delapouite/great-pyramid" },
  // damaged → deal N to lane
  starfish:      { c: "#cf9bd0", i: "delapouite/sea-star" },
  efreeti:       { c: "#9b6fd0", i: "delapouite/djinn" },
  neptune:       { c: "#4f86c6", i: "lorc/trident" },
  // hourglass → heal self
  wageslave:     { c: "#8a8f99", i: "lorc/despair" },
  behemoth:      { c: "#7a8694", i: "delapouite/mammoth" },
  atlas:         { c: "#5f8f86", i: "delapouite/atlas" },
  // attacked → play rats
  fatCat:        { c: "#d0a24a", i: "lorc/cat" },
  fatterCatter:  { c: "#c08a3a", i: "lorc/cat" },
  fattestCattest:{ c: "#a8702a", i: "lorc/cat" },
  // hourglass → flat-damage lane tick
  mummy:         { c: "#caa56a", i: "delapouite/mummy-head" },
  cerberus:      { c: "#9a6a4a", i: "lorc/hound" },
  lilLich:       { c: "#7a6aa0", i: "lorc/skull-crack" },
  // hourglass → summon rats
  royalRat:      { c: "#9a8f7a", i: "delapouite/rat" },
  royalerRat:    { c: "#8a7f6a", i: "delapouite/rat" },
  royalestRat:   { c: "#7a6f5a", i: "delapouite/rat" },
  // hourglass → gain +1s
  dayTrader:     { c: "#c05a5a", i: "lorc/trade" },
  harpy:         { c: "#a0506a", i: "lorc/harpy" },
  balrog:        { c: "#902f2f", i: "lorc/horned-skull" },
  // hourglass → deal N, heal own flat
  auditAngel:    { c: "#d6a9e0", i: "lorc/angel-wings" },
  banshee:       { c: "#aab6d0", i: "lorc/spectre" },
  griffin:       { c: "#d6b24a", i: "delapouite/griffin-symbol" },

  // ── misc / V2 roster ──────────────────────────────────────────────────────
  rat:           { c: "#c9a98c", i: "lorc/mouse" },
  largeRat:      { c: "#a98c6a", i: "lorc/seated-mouse" },
  mouse:         { c: "#b0a89a", i: "delapouite/mouse" },
  magnate:       { c: "#d4af37", i: "delapouite/money-stack" },
  paidPiper:     { c: "#c98a4a", i: "delapouite/pan-flute" },
  centaur:       { c: "#9a6a4a", i: "delapouite/centaur" },
  totem:         { c: "#8a6a4a", i: "lorc/totem-head" },
  flag:          { c: "#c05a5a", i: "delapouite/flag-objective" },
  knight:        { c: "#8a94a4", i: "delapouite/cavalry" },

  // ── bosses ────────────────────────────────────────────────────────────────
  hydra:         { c: "#4f9e7e", i: "lorc/hydra" },
  litigationLich:{ c: "#8a7faa", i: "lorc/scales" },
  djinn:         { c: "#6f8fd0", i: "delapouite/djinn" },
  kraken:        { c: "#3f6f8e", i: "lorc/octopus" },
  kingMimic:     { c: "#caa23c", i: "delapouite/mimic-chest" },
  // boss summons
  hydraHead:     { c: "#5fa37e", i: "lorc/snake" },
  boneWizard:    { c: "#aab6c0", i: "skoll/skeleton" },
  tentacle:      { c: "#6f5f8e", i: "delapouite/kraken-tentacle" },
  itemEntity:    { c: "#c9a9e0", i: "delapouite/sparkles" },

  // ── summon tokens (board minions — players' summons + foe-spawned rats/heads) ──────────
  head:          { c: "#5fa37e", i: "lorc/snake" },
  fireling:      { c: "#e08a3c", i: "carl-olsen/flame" },
  lightling:     { c: "#e6d24a", i: "lorc/sunbeams" },
  earthling:     { c: "#7a8a5a", i: "lorc/stone-block" },
  fireElemental: { c: "#e0742c", i: "lorc/fire-ray" },
  earthElemental:{ c: "#6a7a5a", i: "delapouite/rock-golem" },
  aspectFlame:   { c: "#e08a3c", i: "lorc/flame-claws" },
  aspectEarth:   { c: "#7a8a5a", i: "lorc/stone-block" },
  aspectRats:    { c: "#9a8f7a", i: "delapouite/rat" },
  ratElemental:  { c: "#9a8f7a", i: "delapouite/rat" },
  animatedSword: { c: "#8a94a4", i: "lorc/relic-blade" },

  // ── batch-B bodies missing art (owner 2026-06-27) — colors are the owner's BODIES hues; game-icon
  //    is a best-fit silhouette (CC-BY, same source as the rest). ⚠ owner may want true bespoke art.
  fundjin:         { c: "#c06ad0", i: "delapouite/djinn" },       // Fundjin — a money genie (shares the djinn shape, own hue)
  depressionDemon: { c: "#6a5c8a", i: "lorc/gooey-daemon" },      // a drippy, melancholy demon
  bonelord:        { c: "#b0a890", i: "lorc/crowned-skull" },     // Bookie Bonelord — a crowned skeleton lord
  debtDragon:      { c: "#c0504a", i: "lorc/dragon-head" },      // Debt Dragon — classic dragon head (distinct from the hydra)
  // Golden Golem (bodyKey `juggernaut`) — split off atlas.svg 2026-07-01: it had NO entry here and
  // client ART_ALIAS pointed it at the Atlas elite's token, so both drew the same icon on the board.
  // Gold-tinted metal construct in the body's own hue. ⚠ best-fit placeholder, owner may want true art.
  juggernaut:      { c: "#e0c050", i: "delapouite/metal-golem-head" },
  // WAREWOLF (owner 2026-07-11) — a TWO-FORM body: the client swaps between these by live form.
  // ⚠ FLAG art direction: glyphs (lorc/werewolf, delapouite/person) and hues are my pick — owner may retune.
  warewolf:        { c: "#8f96a3", i: "lorc/werewolf" },       // WOLF form (moonlit steel — the body hue)
  warewolfHuman:   { c: "#b8bcc6", i: "delapouite/person" },   // HUMAN form (lighter grey so the token also reads the flip)
};

// the full 512×512 background square every game-icon ships (we strip it and supply our own token)
const BG_PATH = "M0 0h512v512H0z";

// relative luminance (0–255) → pick a dark icon on light tokens, light icon on dark ones, so the
// silhouette always reads. Keeps the set legible without per-foe tuning.
function iconInk(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 150 ? "#191b20" : "#f4f1ea";
}

// pull the icon's drawing paths out of a game-icons SVG: every <path d="…">, minus the bg square.
// (compare whitespace-stripped on BOTH sides — the file's d has a space the constant must ignore.)
function iconPaths(svg) {
  const bg = BG_PATH.replace(/\s+/g, "");
  const ds = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((m) => m[1]);
  return ds.filter((d) => d.replace(/\s+/g, "") !== bg);
}

// token: colored rounded square + top-light/bottom-dark sheen + the icon, scaled into a padded box
function token(key, color, paths) {
  const ink = iconInk(color);
  const P = 9, INNER = 64 - 2 * P, S = (INNER / 512).toFixed(5);   // 512 → padded 46px box
  const body = paths.map((d) => `<path d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.26"/>
  </linearGradient></defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="${color}" stroke="#00000088" stroke-width="2"/>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#s)"/>
  <g transform="translate(${P} ${P}) scale(${S})" fill="${ink}">${body}</g>
</svg>`;
}

if (!existsSync(ICON_DIR)) {
  console.error(`game-icons source not found at ${ICON_DIR}.
Clone it:  git clone --depth 1 https://github.com/game-icons/icons.git "${ICON_DIR}"
or set GAME_ICONS_DIR.`);
  process.exit(1);
}

const outDir = join(import.meta.dir, "..", "public", "foes");
mkdirSync(outDir, { recursive: true });

let written = 0;
const missingIcon = [];
const authors = new Set();
for (const [key, { c, i }] of Object.entries(MAP)) {
  const src = join(ICON_DIR, i + ".svg");
  if (!existsSync(src)) { missingIcon.push(`${key} → ${i}`); continue; }
  const paths = iconPaths(readFileSync(src, "utf8"));
  if (!paths.length) { missingIcon.push(`${key} → ${i} (no paths)`); continue; }
  writeFileSync(join(outDir, key + ".svg"), token(key, c, paths));
  authors.add(i.split("/")[0]);
  written++;
}

console.log(`Wrote ${written}/${Object.keys(MAP).length} foe tokens → public/foes/`);
if (missingIcon.length) console.log("MISSING source icons:\n  " + missingIcon.join("\n  "));

// CC BY 3.0 requires attribution — emit a credits file listing the authors whose icons we used.
const credits = `# Foe icon attribution

The foe / boss / class tokens in \`public/foes/*.svg\` are built from icons by
**game-icons.net**, licensed under **CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/).

Icon authors used (game-icons.net):
${[...authors].sort().map((a) => `- ${a}`).join("\n")}

Each token recolors a single icon path onto King Mimic's themed badge; see
\`tools/generate-foe-art.js\` for the exact key → icon mapping. Regenerate with:

    git clone --depth 1 https://github.com/game-icons/icons.git ~/game-icons-src
    bun run tools/generate-foe-art.js
`;
writeFileSync(join(import.meta.dir, "..", "public", "foes", "CREDITS.md"), credits);
console.log("Wrote public/foes/CREDITS.md (CC BY 3.0 attribution)");
