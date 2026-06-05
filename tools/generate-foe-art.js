// Batch-generates a simple, consistent SVG badge for every foe + the player body.
// "Most basic image that meaningfully represents each foe": a themed color badge with a
// representative emblem. Swap any public/foes/<id>.svg for hand/AI art later — nothing else changes.
// Run: bun run tools/generate-foe-art.js
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FOES } from "../content.js";

// id -> { e: emblem emoji, c: badge color }. Color leans corporate-hell / money-monster.
const ART = {
  rookie:        { e: "🎭", c: "#9aa7d6" },
  // attack: heal self for attack
  babyfangs:     { e: "🦷", c: "#c0556a" },
  vampire:       { e: "🧛", c: "#a23b57" },
  greatsword:    { e: "🗡️", c: "#8a2f47" },
  // attack: gain a +1
  internImp:     { e: "😈", c: "#b5564f" },
  medusa:        { e: "🐍", c: "#6f8f4f" },
  killionaire:   { e: "🤑", c: "#e6c34a" },
  // hourglass: attack
  pixie:         { e: "🧚", c: "#76c98a" },
  youngdead:     { e: "🧟", c: "#7fae6b" },
  phoenix:       { e: "🔥", c: "#e08a3c" },
  // attack: deal N
  basilisk:      { e: "🦎", c: "#5fa37e" },
  lizardWizard:  { e: "🧙", c: "#4f8fae" },
  runeblade:     { e: "⚔️", c: "#6c79c0" },
  // damaged: attack
  accountant:    { e: "🧮", c: "#b08a4a" },
  minotaur:      { e: "🐂", c: "#a05a3a" },
  pyramid:       { e: "🔺", c: "#caa23c" },
  // damaged: deal N to lane
  starfish:      { e: "⭐", c: "#cf9bd0" },
  efreeti:       { e: "🧞", c: "#9b6fd0" },
  neptune:       { e: "🔱", c: "#4f86c6" },
  // hourglass: heal self
  wageslave:     { e: "😩", c: "#8a8f99" },
  behemoth:      { e: "🐘", c: "#7a8694" },
  atlas:         { e: "🌍", c: "#5f8f86" },
  // attacked: play rats
  fatCat:        { e: "🐈", c: "#d0a24a" },
  fatterCatter:  { e: "🐈", c: "#c08a3a" },
  fattestCattest:{ e: "🐈", c: "#a8702a" },
  // hourglass: deal 0 to lane (+ flat damage)
  mummy:         { e: "🧟", c: "#caa56a" },
  cerberus:      { e: "🐕", c: "#9a6a4a" },
  lilLich:       { e: "💀", c: "#7a6aa0" },
  // hourglass: summon rats
  royalRat:      { e: "🐀", c: "#9a8f7a" },
  royalerRat:    { e: "🐀", c: "#8a7f6a" },
  royalestRat:   { e: "🐀", c: "#7a6f5a" },
  // hourglass: +1s
  dayTrader:     { e: "📈", c: "#c05a5a" },
  harpy:         { e: "🦅", c: "#a0506a" },
  balrog:        { e: "👹", c: "#902f2f" },
  // hourglass: deal N, heal own flat
  auditAngel:    { e: "👼", c: "#d6a9e0" },
  banshee:       { e: "👻", c: "#aab6d0" },
  griffin:       { e: "🦅", c: "#d6b24a" },
};

function badge(emoji, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect x="4" y="4" width="56" height="56" rx="13" fill="${color}" stroke="#00000088" stroke-width="2"/>
  <rect x="4" y="4" width="56" height="56" rx="13" fill="url(#g)"/>
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.22"/>
  </linearGradient></defs>
  <text x="32" y="36" font-size="32" text-anchor="middle" dominant-baseline="central">${emoji}</text>
</svg>`;
}

const dir = join(import.meta.dir, "..", "public", "foes");
mkdirSync(dir, { recursive: true });

const ids = new Set([...Object.keys(FOES), "rookie"]);
let written = 0, missing = [];
for (const id of ids) {
  const a = ART[id] || { e: "❔", c: "#555a66" };
  if (!ART[id]) missing.push(id);
  writeFileSync(join(dir, id + ".svg"), badge(a.e, a.c));
  written++;
}
console.log(`Wrote ${written} foe badges → public/foes/`);
if (missing.length) console.log("No art mapping (used fallback) for:", missing.join(", "));
