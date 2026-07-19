// Batch-generates a clean, consistent SVG token for EVERY playable card (public/cards/<key>.svg).
//
// WHY THIS EXISTS (2026-07-10): foes already have real vector art (tools/generate-foe-art.js →
// public/foes/*.svg, drawn onto the board via client.js foeSprite). Cards had NO icon of their own —
// only the ⚡cost/name/effect text and a color strip. This mirrors the PROVEN foe pipeline for cards:
// a CARD_ART map (key → game-icon), the same tinted 64×64 token frame, written to public/cards/. The
// client draws /cards/<key>.svg on the hand cards + the card-read tooltip + every HTML card list.
//
// DESIGN OWNERSHIP: which glyph depicts which card is DAKOTA's art call. Every glyph below is a
// ⚠ BEST-FIT PLACEHOLDER (game-icons.net, CC BY 3.0) — his art pass overrides them. The ENGINE here
// (enumerate every card, tint to the card's own hue, degrade gracefully) is the maintainable part.
//
// UPKEEP — to give a NEW card an icon:
//   1. add one line to CARD_ART below:   yourCardKey: { i: "<author>/<icon-name>" },
//      (color is automatic — it defaults to the card's own KIT `color`; pass `c:"#hex"` to override.)
//   2. run:  bun run tools/generate-card-art.js
// A card with NO CARD_ART entry still gets a real token: it falls back to a neutral "card" glyph
// (FALLBACK below) tinted to the card's hue — never a blank / ❔. The generator PRINTS which cards are
// on that fallback so the "needs art" list stays visible. New cards on sibling branches are handled
// automatically: enumeration reads the live KIT, so any key that lands there gets a token on next run.
//
// Source icons: a shallow clone of github.com/game-icons/icons (set GAME_ICONS_DIR to override).
// Run: bun run tools/generate-card-art.js
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { KIT, KIT_POOL } from "../engine/kit.js";
// PLAYER_POOL is the owner's canonical draftable set. KIT_POOL (= Object.keys(KIT)) is a superset
// (it also holds the t* summon casts), so enumerating KIT already covers every PLAYER_POOL key — but
// we union both defensively so nothing is ever missed, per the task's "KIT + PLAYER_POOL" contract.
// Best-effort import: if the cards.js barrel chain ever fails to load standalone, fall back to KIT.
let PLAYER_POOL = [];
try { ({ PLAYER_POOL } = await import("../engine/cards.js")); } catch { PLAYER_POOL = []; }

const ICON_DIR = process.env.GAME_ICONS_DIR || join(homedir(), "game-icons-src");

// key -> { i: "<author>/<name>" game-icon, c?: token color override }. The tint DEFAULTS to the
// card's own KIT `color` (so the icon matches the exact hue the card already shows in the hotbar);
// only pass `c` to override. ⚠ EVERY glyph here is a BEST-FIT PLACEHOLDER — owner's art pass wins.
const CARD_ART = {
  // ── BOSS / SUMMON ATTACKS ────────────────────────────────────────────────
  tKrakenTentacle1:{ i: "delapouite/kraken-tentacle" },
  tKrakenTentacle2:{ i: "lorc/curled-tentacle" },
  tKrakenTentacle3:{ i: "lorc/spiked-tentacle" },
  tKrakenTentacle4:{ i: "lorc/tentacle-strike" },

  // ── MELEE ─────────────────────────────────────────────────────────────────
  oSword:        { i: "lorc/broadsword" },
  oHatchet:      { i: "delapouite/hatchet" },
  oSpear:        { i: "lorc/spear-hook" },
  oDagger:       { i: "lorc/plain-dagger" },
  oJavelin:      { i: "lorc/thrown-spear" },
  oMallet:       { i: "delapouite/warhammer" },
  oZweihander:   { i: "delapouite/two-handed-sword" },
  oTwinUchis:    { i: "lorc/crossed-swords" },
  oPowerUp:      { i: "lorc/muscle-up" },
  oBigWizardHat: { i: "lorc/pointy-hat" },
  oComboBlade:   { i: "lorc/sword-clash" },
  oOmnislash:    { i: "lorc/sword-array" },
  oGlacius:      { i: "lorc/frostfire" },
  oSharpEdges:   { i: "lorc/saber-slash" },
  oRepeatXbow:   { i: "carl-olsen/crossbow" },
  oPileOn:       { i: "lorc/high-five" },
  // Retired prototype kept on disk for old replays/screenshots. It must not regress to the old
  // question-card glyph even though it no longer appears in KIT.
  oAcid:         { i: "sbed/acid" },
  oButcherCleaver:{ i: "lorc/meat-cleaver" },
  oAnimatedBlade:{ i: "lorc/spinning-sword" },
  oMoonGreat:    { i: "lorc/crescent-blade" },
  oDualHand:     { i: "delapouite/switch-weapon" },
  oTreasureBlade:{ i: "lorc/relic-blade" },
  oWhip:         { i: "lorc/whip" },
  oCrossBlade:   { i: "lorc/cross-flare" },
  oContinentClub:{ i: "lorc/spiked-mace" },
  oTeleBlades:   { i: "lorc/psychic-waves" },
  oGiantsBelt:   { i: "delapouite/belt-armor" },
  oLionLance:    { i: "lorc/lion" },
  oPowerWordGun: { i: "john-colburn/pistol-gun" },

  // ── RANGED / UTILITY spells ────────────────────────────────────────────────
  oBow:          { i: "lorc/energy-arrow" },
  oFire:         { i: "carl-olsen/flame" },
  oIce:          { i: "lorc/ice-bolt" },
  oLightning:    { i: "lorc/lightning-arc" },
  oArcane:       { i: "lorc/magic-swirl" },
  oDark:         { i: "lorc/evil-moon" },
  oWind:         { i: "lorc/wind-slap" },
  oHoly:         { i: "lorc/holy-symbol" },
  oForce:        { i: "lorc/energy-shield" },
  oMeteors:      { i: "delapouite/falling-star" },
  oBlizzard:     { i: "lorc/snowing" },
  oEarth:        { i: "lorc/earth-crack" },
  oBile:         { i: "sbed/poison" },
  oAstralFist:   { i: "skoll/fist" },
  oFlameOrbs:    { i: "lorc/fireball" },
  oLeechstorm:   { i: "lorc/marrow-drain" },
  oMiasmicWave:  { i: "sbed/poison-cloud" },
  oTornado:      { i: "lorc/tornado" },
  oTsunami:      { i: "lorc/big-wave" },
  oLightningLance:{ i: "lorc/lightning-saber" },
  oHolyLance:    { i: "lorc/justice-star" },
  oLifedrain:    { i: "lorc/life-in-the-balance" },
  oHex:          { i: "skoll/hexes" },
  oFlameSteps:   { i: "lorc/fire-dash" },
  oFlameStrike:  { i: "lorc/fire-punch" },
  oArcaneStorm:  { i: "lorc/orbital-rays" },
  oEarthquake:   { i: "lorc/quake-stomp" },
  oDoomWhisper:  { i: "lorc/evil-book" },

  // ── DEFENSIVE set ─────────────────────────────────────────────────────────
  dBuckler:      { i: "lorc/checked-shield" },
  dTaunt:        { i: "delapouite/flag-objective" },
  dShield:       { i: "lorc/edged-shield" },
  dShieldBash:   { i: "delapouite/shield-bash" },
  dHeartGuard:   { i: "zeromancer/heart-plus" },
  dThorns:       { i: "lorc/thorny-vine" },
  dStoneskin:    { i: "delapouite/stone-pile" },
  dBloodIron:    { i: "lorc/dripping-blade" },
  dTowerShield:  { i: "lorc/crenulated-shield" },
  dTrollskin:    { i: "badges/crown" },
  dLiquidMetal:  { i: "lorc/crown-coin" },
  dGrit:         { i: "lorc/mailed-fist" },
  oRedVial:      { i: "sbed/vial" },
  oMediumRedVial:{ i: "caro-asercion/round-potion" },
  oMassiveRedVial:{ i: "delapouite/health-potion" },
  oTranscend:    { i: "lorc/enlightenment" },
  dSawShield:    { i: "lorc/circular-sawblade" },
  dPatience:     { i: "delapouite/duration" },

  // ── OWNER BATCHES (utility / summons / ramps / debuffs) ────────────────────
  oHaste:        { i: "lorc/wingfoot" },
  oHedgeKnight:  { i: "delapouite/cavalry" },
  oMoxiePool:    { i: "sbed/water-drop" },
  oDemonForm:    { i: "lorc/daemon-skull" },
  oSageMode:     { i: "lorc/meditation" },
  oBerserker:    { i: "delapouite/enrage" },
  oPetLeech:     { i: "lorc/leeching-worm" },
  oSlow:         { i: "lorc/snail" },
  oWeakness:     { i: "lorc/despair" },
  oJesterplate:  { i: "delapouite/jester-hat" },
  oEarthElemental:{ i: "delapouite/rock-golem" },
  oLavaElemental:{ i: "lorc/volcano" },
  oGravityShield:{ i: "lorc/orbital" },
  oRainblow:     { i: "lorc/rainbow-star" },
  oMirrorShield: { i: "lorc/mirror-mirror" },
  oBlackHole:    { i: "lorc/black-hole-bolas" },
  oCrystalBall:  { i: "lorc/crystal-ball" },
  oGrandSpirit:  { i: "lorc/ghost" },
  coolShoes:     { i: "delapouite/running-shoe" },
  oStudy:        { i: "lorc/open-book" },
  oJaw:          { i: "lorc/jawbone" },
  oButterflyKnife:{ i: "skoll/butterfly-knife" },
  oMirrorMace:   { i: "delapouite/flanged-mace" },
  oMeteorMaul:   { i: "lorc/meteor-impact" },
  oTriblade:     { i: "lorc/trident" },
  oPunishGlutton:{ i: "lorc/gluttony" },
  oRevealLight:  { i: "delapouite/light-projector" },
  oBansheeWail:  { i: "lorc/sonic-shout" },
  oZaWarudo:     { i: "caro-asercion/tarot-21-the-world" },
  oGravitySword: { i: "lorc/energy-sword" },
  oCrimsonCrown: { i: "delapouite/deshret-red-crown" },
  oStarblade:    { i: "lorc/shining-sword" },

  // ── SUMMON CARDS ──────────────────────────────────────────────────────────
  oPetRats:      { i: "delapouite/rat" },
  oIceling:      { i: "delapouite/ice-golem" },
  oFireling:     { i: "delapouite/fire-gem" },
  oEarthling:    { i: "lorc/stone-sphere" },
  oLightling:    { i: "lorc/light-bulb" },
  oRatKing:      { i: "skoll/chess-king" },
  oJarSlime:     { i: "caro-asercion/mason-jar" },
  oSplitter:     { i: "lorc/split-body" },
  oBloodMoonOni: { i: "delapouite/oni" },
  oDivineTreasure:{ i: "skoll/open-treasure-chest" },

  // ── SUMMON-TOKEN casts (t*) — the cards a summoned minion presses ──────────
  tBite:         { i: "skoll/fangs" },
  tEarthWard:    { i: "lorc/stone-block" },
  tLavaSurge:    { i: "sbed/lava" },
  tKnightStrike: { i: "delapouite/knight-banner" },
  tSpiritStrike: { i: "lorc/pointy-sword" },
  tSpiritBolt:   { i: "lorc/plasma-bolt" },
  tSpiritGuard:  { i: "sbed/shield" },
  tIceling:      { i: "lorc/frozen-orb" },
  tFireling:     { i: "lorc/fire-bomb" },
  tEarthling:    { i: "lorc/earth-spit" },
  tLightling:    { i: "lorc/candle-light" },
  tRatKing:      { i: "lorc/needle-jaws" },
  tJarSlime:     { i: "lorc/droplet-splash" },
  tSplitter:     { i: "delapouite/split-arrows" },
  tBloodMoonOni: { i: "lorc/bloody-sword" },
};

// The NEUTRAL fallback glyph any card with no CARD_ART entry degrades to (still tinted to the card's
// hue) — a generic playing card, so a new/unmapped card is never blank/❔. ⚠ placeholder like the rest.
const FALLBACK = "faithtoken/card-pick";
// Fallback tint when a card carries no `color` of its own (matches client.js's default card hue).
const NEUTRAL_COLOR = "#6a7384";

// the full 512×512 background square every game-icon ships (we strip it and supply our own token).
const BG_PATH = "M0 0h512v512H0z";

// NOTE ON DUPLICATION (deliberate, low-risk): the three helpers below (iconInk / iconPaths / token)
// are copied from tools/generate-foe-art.js rather than shared via an import. generate-foe-art.js is
// the PROVEN, LIVE pipeline; refactoring it to pull a shared module would put a diff on working code
// for ~30 lines of savings. Keeping this generator self-contained means the foe pipeline stays byte-
// identical and this one can't break it. If BOTH ever need a frame change, factor tools/lib/icon-token.js then.

// relative luminance (0–255) → dark icon on light tokens, light icon on dark ones, so the silhouette
// always reads without per-card tuning.
function iconInk(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 150 ? "#191b20" : "#f4f1ea";
}
// pull the icon's drawing paths out of a game-icons SVG: every <path d="…">, minus the bg square.
function iconPaths(svg) {
  const bg = BG_PATH.replace(/\s+/g, "");
  const ds = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((m) => m[1]);
  return ds.filter((d) => d.replace(/\s+/g, "") !== bg);
}
// token: colored rounded square + top-light/bottom-dark sheen + the icon, scaled into a padded box.
function token(color, paths) {
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

// Load an icon's paths from the library; returns null if the file is missing or path-less.
function loadPaths(iconRef) {
  const src = join(ICON_DIR, iconRef + ".svg");
  if (!existsSync(src)) return null;
  const paths = iconPaths(readFileSync(src, "utf8"));
  return paths.length ? paths : null;
}

if (!existsSync(ICON_DIR)) {
  console.error(`game-icons source not found at ${ICON_DIR}.
Clone it:  git clone --depth 1 https://github.com/game-icons/icons.git "${ICON_DIR}"
or set GAME_ICONS_DIR.`);
  process.exit(1);
}

const outDir = join(import.meta.dir, "..", "public", "cards");
mkdirSync(outDir, { recursive: true });

// Enumerate EVERY card key: KIT (the master table) ∪ PLAYER_POOL (defensive). A card is anything with
// a KIT entry; keys with no KIT entry (shouldn't happen) still enumerate and take the neutral fallback.
const RETIRED_CARD_KEYS = ["oPileOn", "oAcid"];
const allKeys = [...new Set([...KIT_POOL, ...PLAYER_POOL, ...RETIRED_CARD_KEYS])].sort();

let written = 0;
const usedFallback = [];   // cards with no CARD_ART entry (owner: these still need bespoke art)
const badIcon = [];        // CARD_ART entries whose icon file is missing/path-less (fell back)
const renderedOwners = new Map(); // exact visible SVG → card key; metadata cannot fake uniqueness
const duplicateRendered = [];
const authors = new Set();
for (const key of allKeys) {
  const entry = CARD_ART[key];
  const color = entry?.c ?? KIT[key]?.color ?? NEUTRAL_COLOR;
  const iconRef = entry?.i ?? FALLBACK;
  let paths = loadPaths(iconRef);
  if (!paths) {
    // a mapped-but-broken icon still gets a token via the neutral fallback (never blank on disk)
    if (entry?.i) badIcon.push(`${key} → ${iconRef}`);
    paths = loadPaths(FALLBACK);
    if (!paths) { console.error(`FALLBACK icon ${FALLBACK} is missing — cannot write ${key}`); continue; }
  }
  if (!entry) usedFallback.push(key);
  const svg = token(color, paths);
  const prior = renderedOwners.get(svg);
  if (prior) duplicateRendered.push(`${prior} = ${key}`);
  else renderedOwners.set(svg, key);
  writeFileSync(join(outDir, key + ".svg"), svg);
  authors.add((entry?.i ?? FALLBACK).split("/")[0]);
  written++;
}

console.log(`Wrote ${written}/${allKeys.length} card tokens → public/cards/`);
if (usedFallback.length) console.log(`\n⚠ ${usedFallback.length} card(s) have NO CARD_ART entry (neutral fallback glyph — need art):\n  ` + usedFallback.join(", "));
if (badIcon.length) console.log(`\n⚠ CARD_ART icons NOT FOUND in the library (used fallback):\n  ` + badIcon.join("\n  "));
if (duplicateRendered.length) console.log(`\n⚠ VISUALLY DUPLICATE generated card tokens:\n  ` + duplicateRendered.join("\n  "));
if (usedFallback.length || badIcon.length || duplicateRendered.length) process.exitCode = 1;
else console.log(`Verified ${renderedOwners.size}/${allKeys.length} explicit, visually unique card tokens; zero neutral fallbacks.`);

// CC BY 3.0 requires attribution — emit a credits file listing the icon authors we used.
const credits = `# Card icon attribution

The card tokens in \`public/cards/*.svg\` are built from icons by **game-icons.net**, licensed under
**CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/).

⚠ Every glyph is a BEST-FIT PLACEHOLDER chosen by tooling; which icon depicts which card is the
owner's art call and may change. Each token recolors a single icon path onto King Mimic's themed
badge (tinted to the card's own hue); see \`tools/generate-card-art.js\` for the key → icon mapping.

Icon authors used (game-icons.net):
${[...authors].sort().map((a) => `- ${a}`).join("\n")}

${usedFallback.length ? `Cards still on the neutral fallback glyph (need bespoke art):\n${usedFallback.map((k) => `- ${k}`).join("\n")}\n` : "Every enumerated card has an explicit CARD_ART entry.\n"}
Regenerate with:

    git clone --depth 1 https://github.com/game-icons/icons.git ~/game-icons-src
    bun run tools/generate-card-art.js
`;
writeFileSync(join(outDir, "CREDITS.md"), credits);
console.log("Wrote public/cards/CREDITS.md (CC BY 3.0 attribution)");
