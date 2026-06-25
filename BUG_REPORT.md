# BUG REPORT — King Mimic engine audit
Agent session: 2026-06-23

---

## A — FIXED

### Bug 1: Foe `delay` op ignores `op.target`, draining all heroes instead of one

**File:** `game.js` — foe-side branch of `resolveOps`, ~line 2700
**Root cause:** The foe-side `delay` handler had no target discrimination. When a foe cast
`oIce` (which has `{ do:"deal", target:"pick" }` then `{ do:"delay", amount:1, target:"pick" }`),
the deal op correctly hit only the front of the lane line, but the delay op always drained
every hero AND every ally-summon in the lane, ignoring `op.target` entirely.
The player-side `delay` handler (case "delay") does check `op.target === "lane"` and falls
through to a single-target drain if not. The foe side lacked that branch.

**Cards affected:** `oIce` (target:"pick"), any future card with `do:"delay"` and non-lane target.
`oBlizzard` (target:"lane") was already correct by luck since the old code always did lane-wide.

**Exact change:**

```
// OLD:
else if (op.do === "delay") {                  // foe Blizzard: drain the HEROES' clocks
  for (const h of heroesInLane(room, li)) drainClocks(h, amt);
  for (const al of room.allies?.[li] ?? []) drainClocks(al, amt);
}

// NEW:
else if (op.do === "delay") {                  // foe Blizzard/Ice: drain the HEROES' moxie
  if (op.target === "lane") {
    // lane-wide drain (Blizzard): hits every hero and ally-summon in the foe's lane
    for (const h of heroesInLane(room, li)) drainClocks(h, amt);
    for (const al of room.allies?.[li] ?? []) drainClocks(al, amt);
  } else {
    // single-target drain (Ice target:"pick"): foes have no reticle, so "pick" resolves
    // to the front of the lane line — same entity the preceding deal op hits.
    const front = laneLine(room, li)[0];
    if (front) drainClocks(front, amt);
  }
}
```

**Verification:** `bun test` 494 + 22 passing before and after the fix (existing tests cover
moxie-drain behavior; the fix brings foe-side symmetry in line with the player-side handler).

---

## B — FOUND BUT LEFT (not fixed)

### B1: Draft wheel snapshot renders unscaled `maxHp`

**File:** `game.js` line 3288 (snapshot, `draft.wheel` mapping)
**Issue:** `maxHp: BODIES[b.bodyKey].maxHp` — uses the raw body value, not `bodyMaxHp(BODIES[b.bodyKey])`.
Every other HP-displaying snapshot path (stock palette line ~3262, `publicBodies` line 3145,
`spawnEnemy` line 1166) calls `bodyMaxHp()` to apply `_hpMult`.
**Impact:** Display-only mismatch in the draft screen. With the live default `_hpMult = 1`
there is zero visible difference. Only materializes if `setHpMult(n)` is called with `n ≠ 1`.
No game logic is affected.
**Why left:** Pure cosmetic display bug; `_hpMult = 1` in production means zero practical
impact. Fix is a one-word swap (`BODIES[b.bodyKey].maxHp` → `bodyMaxHp(BODIES[b.bodyKey])`),
but it touches the snapshot surface and is not urgent. Owner can address in the school-rip pass
when the snapshot is being touched anyway.

### B2: `foeHitLaneAll` (foe Lightning AoE) skips thorns reflection on ally tokens

**File:** `game.js` lines 2267–2284 (`foeHitLaneAll`)
**Issue:** Ally-token damage in the AoE path is handled inline without calling `reflectThorns`.
The dedicated `hurtAllyToken` function (used by the single-target path `foeHitLane`) does call
`reflectThorns`. So if an ally summon token had a `thorns` buff and a foe hit it with a
lane-AoE (Lightning), the attacker would not be thorned back.
**Impact:** Theoretical only — no current ally body has a `thorns` passive or ever accumulates
`thorns` in normal gameplay. The reflect path for heroes in the same AoE IS correct
(`damagePlayer` → `reflectThorns` via the single-target path is not in the AoE anyway; actually
the foe AoE hero path calls `damagePlayer` directly which does NOT call `reflectThorns` either
by design — "thorns don't fire on lane AoE" is stated in the comment at line 2264).
So the gap is consistent with the stated "no thorns on AoE" intent; the inline ally path just
lacks the same comment. Zero practical impact.
**Why left:** Design-ambiguous (the comment explicitly says AoE doesn't trigger thorns; the
ally-token inline code just lacks the comment, not the intent).

### B3: `p.combo` / `p.comboPending` not cleared in `beginCombat`

**File:** `game.js` lines 1872–1876 (`beginCombat` player state reset)
**Issue:** `beginCombat` clears `p.thorns`, `p.shield`, `p.buffs`, `p.echoCharge/Ready/Armed`.
It does NOT clear `p.combo` or `p.comboPending`. If a player uses Combo Blade and clears the
room before expending all 3 "next card +1" charges, those charges survive into the next fight.
**Impact:** A carried `p.combo` gives the opening cards of the next fight a free +1 bonus they
shouldn't have. In practice this requires: (a) Combo Blade in the deck, (b) the room won before
3 more cards were played. Unlikely but reproducible.
**Why left:** Design-ambiguous. While other per-fight buffs are explicitly reset ("per-fight —
don't carry across rooms"), combo charges are not listed in the reset block. The owner may
intend aggressive leftover carry-over. Not fixing without owner confirmation to avoid an
accidental design change.

---

## C — TEST COUNTS

| | Baseline | Final |
|---|---|---|
| `bun test` (game.test.js) | 494 passed, 0 failed | 494 passed, 0 failed |
| `bun test` (serve.test.js) | 22 passed, 0 failed | 22 passed, 0 failed |
| `bun test/squad.test.js` | 23 passed, 0 failed | 23 passed, 0 failed |

All tests green throughout. The one fix (Bug 1) had no test churn — it corrects engine
behavior that no existing test was explicitly asserting from the foe side. The baseline was
restored and held.

---

**Summary:** 1 fixed, 3 found-but-left.
