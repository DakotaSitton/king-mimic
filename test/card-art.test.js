import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KIT_POOL } from "../engine/kit.js";

let pass = 0, fail = 0;
const ok = (value, label) => { if (value) pass++; else { fail++; console.error("FAIL", label); } };
const root = join(import.meta.dir, "..");
const keys = [...new Set(KIT_POOL)].sort();
const retiredKeys = ["oAcid", "oPileOn"];
const visibleSvgOwners = new Map();

for (const key of [...keys, ...retiredKeys]) {
  let svg = "";
  try { svg = readFileSync(join(root, "public", "cards", key + ".svg"), "utf8"); }
  catch { ok(false, `${key} has its own SVG file`); continue; }
  ok(svg.includes("<svg") && svg.includes("<path"), `${key} has drawable vector art`);
  // The generator writes no key/title metadata, so equal normalized bytes mean equal visible art.
  const visible = svg.replace(/\s+/g, " ").trim();
  const prior = visibleSvgOwners.get(visible);
  ok(!prior, `${key} is visually unique${prior ? ` (duplicates ${prior})` : ""}`);
  if (!prior) visibleSvgOwners.set(visible, key);
}

const credits = readFileSync(join(root, "public", "cards", "CREDITS.md"), "utf8");
ok(credits.includes("Every enumerated card has an explicit CARD_ART entry."),
  "the generated artifact reports zero neutral/question-mark fallbacks");
ok(!credits.includes("Cards still on the neutral fallback glyph"),
  "no live card remains on the neutral fallback glyph");

const generator = readFileSync(join(root, "tools", "generate-card-art.js"), "utf8");
ok(!generator.includes("faithtoken/card-random"),
  "the retired question-card glyph is absent from the generator too");

const client = readFileSync(join(root, "public", "client.js"), "utf8");
ok(client.includes("const cardArtStem = (key) => key;") && !client.includes("CARD_ART_ALIAS"),
  "runtime card-art resolution is injective instead of aliasing cards together");
ok(client.includes("fx.cardKey ? cardSprite(fx.cardKey) : null") && client.includes("ctx.drawImage(art"),
  "the universal semantic cast animation carries each card's own unique token");

console.log(`CARD ART ${fail ? "FAIL" : "PASS"} — ${pass} passed, ${fail} failed; ${keys.length} live + ${retiredKeys.length} retired explicit unique animated cards`);
if (fail) process.exit(1);
