import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildItchZip, ITCH_OUTPUT, ITCH_SOURCE } from "../tools/build-itch.mjs";

let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) {
    passed++;
    console.log(`  PASS ${message}`);
  } else {
    failed++;
    console.error(`  FAIL ${message}`);
  }
}

function hash(data) {
  return createHash("sha256").update(data).digest("hex");
}

function readSingleStoredEntry(zip) {
  if (zip.readUInt32LE(0) !== 0x04034b50) throw new Error("missing local ZIP header");
  const method = zip.readUInt16LE(8);
  const size = zip.readUInt32LE(18);
  const nameLength = zip.readUInt16LE(26);
  const extraLength = zip.readUInt16LE(28);
  const nameStart = 30;
  const dataStart = nameStart + nameLength + extraLength;
  const dataEnd = dataStart + size;
  const name = zip.subarray(nameStart, nameStart + nameLength).toString("utf8");
  const centralOffset = dataEnd;
  if (zip.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error("unexpected extra ZIP entry");
  const centralNameLength = zip.readUInt16LE(centralOffset + 28);
  const centralExtraLength = zip.readUInt16LE(centralOffset + 30);
  const centralCommentLength = zip.readUInt16LE(centralOffset + 32);
  const endOffset = centralOffset + 46 + centralNameLength + centralExtraLength + centralCommentLength;
  if (zip.readUInt32LE(endOffset) !== 0x06054b50) throw new Error("missing ZIP end record");
  return {
    name,
    method,
    data: zip.subarray(dataStart, dataEnd),
    entries: zip.readUInt16LE(endOffset + 10),
  };
}

console.log("\nITCH PACKAGE");

buildItchZip();
const first = readFileSync(ITCH_OUTPUT);
buildItchZip();
const second = readFileSync(ITCH_OUTPUT);
ok(hash(first) === hash(second), "two builds are byte-identical");

const entry = readSingleStoredEntry(second);
const source = readFileSync(ITCH_SOURCE);
const html = source.toString("utf8");
ok(entry.entries === 1 && entry.name === "index.html", "ZIP has exactly index.html at its root");
ok(entry.method === 0 && entry.data.equals(source), "ZIP entry exactly matches the tracked launcher");

const target = "https://king-mimic-production.up.railway.app/?source=itch";
const iframeTarget = html.match(/<iframe[\s\S]*?\bsrc="([^"]+)"/)?.[1];
const fallbackTarget = html.match(/<a class="direct"[\s\S]*?\bhref="([^"]+)"/)?.[1];
ok(iframeTarget === target, "iframe targets the HTTPS production game with source=itch");
ok(fallbackTarget === target && /target="_blank"/.test(html) && /rel="noopener noreferrer"/.test(html),
  "visible direct-launch fallback uses the same safe target");
ok(/allow="autoplay; fullscreen; clipboard-write; web-share"/.test(html),
  "embedded game requests the permissions needed by its invite-share fallbacks");
ok(!/http:\/\//i.test(html), "launcher contains no insecure HTTP target");
ok(!/<script\b/i.test(html), "launcher contains no scripts, external or inline");
ok(!/(api[_-]?key|access[_-]?token|authorization\s*:|password\s*=|bearer\s+)/i.test(html),
  "launcher contains no credential-shaped values");
ok(/name="viewport"[^>]+viewport-fit=cover/.test(html) &&
  /iframe\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%/s.test(html),
  "launcher declares a responsive full-viewport frame");
ok(/Content-Security-Policy/.test(html) &&
  /frame-src https:\/\/king-mimic-production\.up\.railway\.app/.test(html),
  "content policy limits framing to the production host");

console.log(`\nITCH PACKAGE: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
