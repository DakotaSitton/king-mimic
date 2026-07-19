// King Mimic — pure game logic (no networking, no I/O).
// server.js wires this to WebSockets; tests import it and drive it deterministically.
// Every function takes a `room` (plain state object) and mutates/returns plainly.
//
// This file is now a BARREL: the engine was split into cohesive engine/*.js modules
// (bodies → kit → cards → world → lobby → combat → snapshot). server.js and every test
// still import from "./game.js" unchanged — every name is re-exported below. Nothing but
// re-exports lives here; open the matching engine/*.js to edit a subsystem.
//
// CARD/MOXIE COMBAT (rewrite 2026-06-21, see CARDS_SPEC.md): cooldowns are DEAD. Every card-casting
// entity has MOXIE (0..MOXIE_CAP, +1/sec). Cards (KIT entries with `ops`) cost moxie. resolveOps is
// unchanged — playing a card spends moxie then resolves its ops. Players hold a HAND drawn from a
// shuffled DECK; a played card goes to the DISCARD and only recycles when the deck runs dry
// (exhaust-before-repeat, owner 2026-07-01 — symmetric with foes' front→back QUEUE rotation).
// Body passives / summons / boss clocks stay.

// Leaf data first, combat/snapshot last — the eval order the engine modules rely on.
export * from "./engine/bodies.js";    // BODIES/CLASSES, rosters, HP-mult state, lane constants, clog
export * from "./engine/leveling.js";  // point allocation, body upgrades, elite tier catalog
export * from "./engine/archetypes.js"; // balance-facing body role/archetype/tag matrix
export * from "./engine/kit.js";       // KIT item table + item/card classification
export * from "./engine/cards.js";     // deck/card logic + moxie constants
export * from "./engine/world.js";     // level/room building, value/level math, enterRoom, descend
export * from "./engine/lobby.js";     // session & room runtime: foe-gen, boss, room-building, lifecycle
export * from "./engine/combat.js";    // the combat engine (resolver, passives, damage, simulateTick)
export * from "./engine/snapshot.js";  // client snapshot projection
