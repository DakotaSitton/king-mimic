import assert from "node:assert/strict";
import * as G from "../game.js";
import { serverTick } from "../server.js";

const room = G.newRoom("CLOCK");
const alice = G.addPlayer(room, "alice", "Alice");
const bob = G.addPlayer(room, "bob", "Bob");
const squadBot = G.addPlayer(room, "alice-bot", "Alice Bot", { bot: true, owner: alice.id });

assert.deepEqual(G.CLOCK_DIVISORS, [1, 2, 4], "the public clock has exactly normal, half, and quarter divisors");
assert.equal(G.roomClockDivisor(room), 1, "a new room begins at normal speed");
assert.equal(G.setPlayerClockDivisor(room, alice, 2), 2, "one human can request half speed");
assert.equal(G.setPlayerClockDivisor(room, bob, 4), 4, "the slowest human request controls the room");
assert.equal(G.setPlayerClockDivisor(room, alice, 1), 4, "one player cannot speed past a partner's slower request");

squadBot.clockDivisor = 4;
assert.equal(G.setPlayerClockDivisor(room, squadBot, 2), null, "a squad bot cannot own a room-clock request");
assert.equal(G.roomClockDivisor(room), 4, "bot state never changes the human room clock");
assert.equal(G.setPlayerClockDivisor(room, alice, 3), null, "forged intermediate divisors are rejected");
assert.equal(alice.clockDivisor, 1, "a rejected request leaves the prior human preference intact");
assert.equal(G.setPlayerClockDivisor(room, { id: "outsider", bot: false }, 2), null,
  "an entity outside the room cannot set its clock");

bob.gone = true;
assert.equal(G.roomClockDivisor(room), 1, "a disconnected partner cannot hold the room slow");
bob.gone = false;
assert.equal(G.roomClockDivisor(room), 4, "reconnecting restores that seat's persistent request");

room.phase = "playing";
assert.deepEqual(Array.from({ length: 8 }, () => G.clockAllowsSimulation(room)),
  [false, false, false, true, false, false, false, true],
  "quarter speed advances exactly one deterministic simulation tick per four scheduler pulses");
assert.equal(G.setPlayerClockDivisor(room, bob, 2), 2, "the same clock can relax to half speed");
assert.deepEqual(Array.from({ length: 4 }, () => G.clockAllowsSimulation(room)),
  [false, true, false, true], "half speed advances exactly every second scheduler pulse");
assert.equal(G.setPlayerClockDivisor(room, bob, 1), 1, "all-normal requests restore normal speed");
assert.deepEqual(Array.from({ length: 3 }, () => G.clockAllowsSimulation(room)), [true, true, true],
  "normal speed advances every scheduler pulse");

room.phase = "setup";
room._clockPulse = 3;
assert.equal(G.clockAllowsSimulation(room), true, "non-combat room phases are never slowed");
assert.equal(room._clockPulse, 0, "leaving combat clears fractional scheduler progress");

G.setPlayerClockDivisor(room, alice, 2);
G.setPlayerClockDivisor(room, bob, 4);
const snap = G.snapshot(room);
assert.deepEqual(snap.clock, { divisor: 4, requests: { alice: 2, bob: 4 } },
  "snapshots expose the effective room speed and each human seat's request without squad bots");

{
  const live = G.newRoom("CLOCK-LIVE");
  const player = G.addPlayer(live, "p", "P");
  player.lane = 0; player.depth = 0; player.autoFire = false;
  live.laneCount = 1; live.allies = [[]]; live.phase = "playing"; live.telemOff = true;
  const foe = G.spawnEnemy("cleric", []); foe.lane = 0; foe.queue = []; foe.hp = foe.maxHp = 100;
  live.lanes = [[foe]];
  G.setPlayerClockDivisor(live, player, 4);
  const before = live.tick;
  serverTick(live); serverTick(live); serverTick(live);
  assert.equal(live.tick, before, "the real server scheduler broadcasts three quarter-speed frames without advancing simulation");
  serverTick(live);
  assert.equal(live.tick, before + 1, "the fourth real server frame advances exactly one simulation tick");
  assert.equal(live._snapSeq, 4, "network snapshots stay responsive at the ordinary 10 Hz while combat is slowed");
}

console.log("ROOM CLOCK PASS");
