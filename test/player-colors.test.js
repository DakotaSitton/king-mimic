// SEAT COLORS (owner 2026-08-07: "add a color border to the players that is obvious that the
// players choose at the start of the game"). Engine contract: a closed server-side palette,
// per-HUMAN-seat ownership, first-come uniqueness, and owner-resolved projection onto every
// body (companions wear their seat's color). Run: bun run test/player-colors.test.js
import assert from "node:assert/strict";
import * as G from "../game.js";

const room = G.newRoom("COLORS");
const alice = G.addPlayer(room, "alice", "Alice");
const bob = G.addPlayer(room, "bob", "Bob");
const aliceBot = G.addPlayer(room, "alice-b1", "Alice Body 2", { bot: true, owner: alice.id });

assert.ok(Object.isFrozen(G.PLAYER_COLORS) && G.PLAYER_COLORS.length === 8,
  "the palette is a frozen closed vocabulary of eight colors");
assert.ok(G.PLAYER_COLORS.every((c) => /^#[0-9a-f]{6}$/i.test(c)),
  "every palette entry is a plain hex color (safe to inline into client styles)");

const [red, orange] = G.PLAYER_COLORS;
assert.equal(G.setPlayerColor(room, alice, red), red, "a human seat can claim a palette color");
assert.equal(alice.color, red, "…and the seat records it");
assert.equal(G.setPlayerColor(room, bob, red), null, "first-come: a second human cannot take a claimed color");
assert.equal(bob.color, undefined, "…and the refused pick changes nothing");
assert.equal(G.setPlayerColor(room, bob, orange), orange, "a free color is claimable");
assert.equal(G.setPlayerColor(room, alice, orange), null, "switching onto a partner's color is refused");
assert.equal(G.setPlayerColor(room, alice, G.PLAYER_COLORS[2]), G.PLAYER_COLORS[2],
  "a seat can switch its own color to any free one");
assert.equal(G.setPlayerColor(room, bob, red), red, "a freed color is claimable again");

assert.equal(G.setPlayerColor(room, aliceBot, G.PLAYER_COLORS[3]), null,
  "a squad bot cannot own a color (the SEAT owns identity)");
assert.equal(G.setPlayerColor(room, alice, "#123456"), null, "colors outside the palette are refused");
assert.equal(G.setPlayerColor(room, alice, "red"), null, "non-hex strings are refused");
assert.equal(G.setPlayerColor(room, { id: "outsider", bot: false }, red), null,
  "an entity outside the room cannot set a color");

// Projection: every body carries its OWNING seat's color — companions inherit, and the draft
// screen receives the server's palette so the client never hardcodes a hex.
G.startDraft(room);
const snap = G.snapshot(room);
const by = Object.fromEntries(snap.players.map((p) => [p.id, p]));
assert.equal(by.alice.color, G.PLAYER_COLORS[2], "a seat's snapshot body carries its chosen color");
assert.equal(by["alice-b1"].color, G.PLAYER_COLORS[2], "a companion body wears its owner's color");
assert.equal(by.bob.color, red, "each seat keeps its own color");
assert.deepEqual(snap.draft.colors, [...G.PLAYER_COLORS], "the draft snapshot ships the closed palette");

// Persistence shape: color must be a plain serializable field (run-persistence stores players whole).
assert.equal(typeof alice.color, "string", "the color persists as a plain string field on the seat");

console.log("✅ PLAYER COLORS — all assertions passed");
