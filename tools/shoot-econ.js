// DEPRECATED alias — superseded by tools/screenshot.js (Edge-native, no Playwright).
// Captures just the economy/between-rooms screen.  Prefer: bun tools/screenshot.js won
process.argv = [process.argv[0], process.argv[1], "won"];
await import("./screenshot.js");
