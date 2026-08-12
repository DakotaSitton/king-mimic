# Friend-Run Review — level-up bonus abuse — 2026-08-12

Scope: all genuine-human Railway runs 2026-08-09 → 2026-08-12 (post the reviewed Royal Rat win),
identified by combat-log names. `Booopppp` = the friend (rooms 9DKT / 6AV5 / F32J);
`Dak` = you (QWE8 / AVD6 / EFRV / 943S). Data: Railway `/var/data/telemetry.jsonl` +
`/var/data/combatlogs/`, pulled 2026-08-12 ~16:15 CDT. Companion artifact:
`ROYAL_RAT_RUN_REVIEW_2026-08-09.md` (his 8/8 win, same player).

Naming rule (owner 2026-08-12): display names only in this doc; engine keys appear solely
inside code pointers like `leveling.js:59 (quakeCap)` because `BODY_UPGRADES` rows are keyed
by them.

## TL;DR

The friend solved the game: **Crypto-Chimera + every point into Specialty**. Run
`run-2026-08-10T15-31-00-880Z-F32J`: 19/19 fights, full clear to the throne, level 11,
allocation `{hp:0, melee:0, ranged:0, mastery:0, specialty:10}`. **94.3% of all damage to foes
came from the Chimera passive** (968 of 1026); cards did ~2%. The passive landed 34 of his 68
killing blows and single hits grew 3 → 32 as ranks stacked mid-run. He took 118 total damage in
19 fights (the rotation's shield step, 3+2×rank, out-shields everything floor 3 throws). Fights
got FASTER as the game got harder: mean 16.0s on floor 1 → 9.9s on floor 3 (three 7-second
fights at rank 9). Difficulty scaling loses to specialty scaling.

This is not a one-off: **you did the same thing two days earlier** — `Dak`, 8/8 05:37 run
(S577), Penny-Pinching Pixie **specialty 11**, 19/0 full clear, single Dagger hits up to **78**.
Two different players independently converged on "stack an uncapped 1-point repeatable
Specialty, spam cheap cards." That's the strongest possible playtest signal: the dominant
strategy is found naturally and it deletes the game.

## The friend's runs, 8/9 → 8/10 (11 runs)

| run | body | result | note |
|---|---|---|---|
| 8/09 16:59 9DKT | Paid Piper | LOST floor 1, 0W | |
| 8/10 03:01 9DKT | Crypto-Chimera L3 (m1 s2) | LOST floor 1, 3W | Bond Behemoth's Tsunami 15 ended it; spec hits already 6-7 |
| 8/10 03:10 6AV5 | Centless Centaur | LOST floor 1, 0W | |
| 8/10 15:00 6AV5 | Lizard Wizard L2 | LOST floor 1, 1W | |
| 8/10 15:03 6AV5 | Vengeful Vampire | LOST floor 1, 0W | |
| 8/10 15:05 6AV5 | Vengeful Vampire L2 (s1) | LOST floor 1, 1W | |
| 8/10 15:20 F32J | Malevolent Mouse | LOST floor 1, 0W | |
| 8/10 15:20 F32J | Interest Imp | LOST floor 1, 0W | |
| 8/10 15:21 F32J | Crypto-Chimera L1 | LOST floor 1, 1W | no points yet — died like everything else |
| 8/10 15:22 F32J | Vengeful Vampire L4 (m1 s1) | LOST floor 1, 4W | Heart Guard ×19 heal-spam feeding the passive |
| 8/10 15:31 F32J | **Crypto-Chimera L11 (s10)** | **WON 19/19** | 94.3% passive damage; deck = trigger chaff |

Read the two Crypto-Chimera rows together: at level 1-3 it dies on floor 1 like everything
else; at spec 10 it never drops below ~full HP. The body isn't the problem — the **uncapped
1-point repeatable rank** is.

The winning deck is the tell: top casts were Study ×52, Tiny Buckler ×37, Red Vial ×27,
Taunt ×20, Thorns ×15, Moxie Pool ×13 — 1-cost chaff whose only job is advancing the
every-3-cards clock. ~3 moxie of chaff bought `(3+2S) melee + (2+2S) lane AoE + (3+2S) shield`;
at S=10 that's **68+ points of value per ~3 moxie** vs ~1.3-5.6 dmg/⚡ for real cards. Nothing
you hand-authored can compete with that exchange rate, so the "deckbuilder" collapses into a
button-mashing idle game.

Same pattern in both prior wins: Royal Rat 8/8 = 93.8% summon damage; Penny-Pinching Pixie
8/8 = melee-stack Daggers. **Every recorded human win is an engine that makes the
cards-as-played irrelevant.**

## The other half of the picture: floor 1 is a wall for everything else

8/9 → 8/12, 22 human runs total: **1 win (the exploit), 17 losses — 14 of them on floor 1 —
and 4 abandons.** Your own three runs last night (943S: Pyramid-Scheme Head, Rent-Seeking
Runeblade, Fat Cat) all died floor 1-2 on regular. The live game is bimodal: normal builds
lose to floor 1 variance; one stacked specialty full-clears without being touched. Tonight's
playtest sits in the gap between those two experiences.

## Root cause (mechanics, not one body)

- A level point is worth `+1 melee | +1 ranged | +3 max HP` baseline. A repeatable Specialty
  costs the SAME 1 point but many rows pay `+2 damage AND +2 AoE AND +2 shield`
  (Crypto-Chimera), `+2 stacking melee per card played` (Penny-Pinching Pixie), `+2 while
  shielded` (Golden Golem), etc. Any per-rank value >2× baseline becomes the only correct buy
  by rank ~4.
- Player level is deliberately uncapped (lobby.js:1225-1231 removed the L8 cap; level L costs
  5×(L-1) ◈ and loot easily funds ~275 ◈), so "repeatable, uncapped" means **rank 10-11 in
  practice** — the friend's L11/rank-10 is the empirical ceiling at current loot. Existing
  caps of 9-10 (Lizard Wizard, Centless Centaur, Mid-Management Medusa, Credit-Cursed Cyclops,
  Calling Caltist) barely bind; the caps that actually bind are 1-5.
- Per-CARD triggers multiply with chaff spam (1-cost cards, Moxie Pool regen, the sanctioned
  Cool Shoes loop) — any per-N-cards passive scales with cards-per-minute, which nothing
  prices.

## Full abuse audit (code, all 46 bodies)

Server-side validation is CLEAN — every mutation path (`allocateLevel` lobby.js:1861,
`levelUp` lobby.js:1203, scenario injection) routes through `validLevelAllocation`, and
specialty rank re-clamps at read. No client can over-buy. The hole is design-side pricing,
not enforcement.

Ranked findings (baseline for "1 point" = +1 melee / +1 ranged / +3 max HP):

| # | Body | The abuse | Math at realistic rank | Code row |
|---|---|---|---|---|
| 1 | **Crypto-Chimera** | S uncapped, +2 on ALL THREE rotation effects; M replays the whole rotation | +6 output/rotation per point (+12 with M) ≈ **+4 output per card played**; rank 10 live run = 94% of all damage. He didn't even buy Mastery — the ×2 version is stronger still | leveling.js:59 (quakeCap); combat.js:1662 |
| 2 | **Weary Wageslave** | S uncapped +2/rank on passive melee; M = fires EVERY card | with M, 1 pt = +2 dmg per card played, forever. Crypto-Chimera's equal, cheaper body | leveling.js:60 (mutualMend) |
| 3 | **Penny-Pinching Pixie** | S uncapped: +2 melee/rank per melee card, 6s independent stacks — its ranged twin Lizard Wizard IS capped 10; omission, not ruling | melee spam → ~6 live stacks → +12 melee sustained per rank. Dak's 8/8 rank-11 full-clear, 78-dmg Daggers | leveling.js:64 (pennyPixie); combat.js:3825 |
| 4 | **Golden Golem** | S uncapped: +2×rank on EVERY hit while shielded, and its passive starts shield = max HP | rank 5 = +10 on every hit, multi-hit cards ×N. **Also the #1 foe-side threat tonight** | leveling.js:58 (juggernaut); combat.js:3000 |
| 5 | **Sales Sage** | capped 5 but "minimum 0": M + rank 5 → `floor(cost/2)−5 = 0` → **every ranged card in the game is free** | infinite spam, moxie deleted as a bound; also fuels every per-card passive above | leveling.js:91 (salesSage) |
| 6 | **Toll Troll** | M: every passive heal also raises max HP for the fight, heal fires per 4 moxie spent | rank 3+M ≈ +125 max HP in one long fight; a leveled FOE Toll Troll is soft-unkillable | leveling.js:49 (ratTrader); combat.js:2612 |
| 7 | **Interest Imp** | S: permanent random stat per trigger, uncapped | ~+15 permanent stats per point per long fight | leveling.js:54 (heavyHand); combat.js:2457 |
| 8 | **Hedgefund Knight** | S+M: self-alternating shield→melee pulse ramp, uncapped | ~+8 melee/min per point, compounding | leveling.js:84 (hedgefundKnight); combat.js:2160 |
| 9 | **Bribed Bishop** | S: +2 dmg per 5 healing dealt, uncapped | +12 generic dmg per 6s at rank 3 with big-cost heals | leveling.js:61 (bribedBishop); combat.js:3812 |
| 10 | **Atlas, Shrugging** | S: SHRUG +3/rank uncapped; M: every 6 dmg taken | **foe-side trap: punishes exactly your chaff-spam decks** — S4+M foe AoEs 18 back every 6 damage you deal it | leveling.js:67 (atlas) |
| 11 | **Bookie Bonelord / Affluence Anubis** | rat waves +1/rank; Anubis growth is QUADRATIC (wave n = 1+n×(1+m+s)) | self-feeding board flood; Anubis rank 3+M ≈ 75 rats by 30s | leveling.js:74/79 (bonelord/affluenceAnubis); combat.js:2177 |
| 12 | **Depression Demon** | S: +1 magnitude on EVERY debuff application incl. per-hit poison | multi-hit poison cards multiply it; foe-side melts heroes | leveling.js:73 (depressionDemon); combat.js:2023 |

Bounded/deceptively-fine (audited, loop hypotheses falsified): Pyramid-Scheme Head (moxie cap
bounds the free-card refund), Vengeful Vampire (own drip heals 1 — never triggers its ≥5
clause solo; only ramps in co-op with a spam healer), Malevolent Mouse (cap 9 + kill-gated),
Nepotistic Neptune (start-moxie clamped), Stockbroking Sphinx / Fundjin & Raising-Profitsjin /
Cheque Cherub / Fat Cat / Royal Rat (~baseline value per point).
Properly capped and clean: Centless Centaur, Market-Crash Minotaur, Bond Behemoth, Bankrupt
Basilisk, Mid-Management Medusa, Debt Dragon, Timeshare Tyrant, Economy Elemental,
Killionaire, Credit-Cursed Cyclops, Bankrupt Barghest, Recession Revenant, Shortscerer,
Calling Caltist, Lizard Wizard, Moneymancer, GDP Giant, Veteran of the Psychic Wars, Warewolf,
Audit Angel, Oligarchy Ooze, Wandering Castle, Rent-Seeking Runeblade, Paid Piper.

Foe-level rolls spread points uniformly (foeLevelRoll, lobby.js:337) and foe level caps at
`min(8, 2+floor)`, so deep foe stacks are rare — but rank 4-5 tails DO appear by floor 4:
watch **Golden Golem, Atlas, Toll Troll** foes tonight.

Dead-code flag (confusing, not a bug): leveling.js:238-239 patches Crypto-Chimera's `steps`
amounts, but playTriggerPassives early-returns for that body and hardcodes its own
`2×specialtyRank` — the patch is never read on the live path.

## What I'd do for tonight (your call on every number)

**Zero-code (do these regardless):**
1. Host on **Challenge** (live since 8/11): halved loot value ≈ half the ◈ → specialty ranks
   arrive ~2 floors later; 150% ante on floors 2-3 pressures the mid-game where stacking spikes.
2. House rule for the session: **repeatable Specialty capped at 3 buys**. It's one sentence to
   the group, tests the "capped" feel live before you commit a single number to code.
3. Tell the friend his Chimera build is famous now — watch what he reaches for SECOND. What a
   player does after you take the dominant line is the best free playtest data you'll get.

**One-line-each engine fix, if you want it live before tonight** (~1 hr with tests + prod gate):
- `specialtyCap` values in `BODY_UPGRADES` (engine/leveling.js) — the cap VALUES are yours to
  pick; the wiring is proven safe: specialty rank already clamps at READ time
  (leveling.js:160), so a new cap instantly bounds live/saved runs. Each newly-capped body
  also needs one clamp line in `migrateSavedLevelAllocation` (leveling.js:108) or over-cap
  saves fail allocation validation — existing Bankrupt Basilisk / Debt Dragon pattern,
  mechanical.
- Cap-ready one-liners, worst first: **Crypto-Chimera, Weary Wageslave, Penny-Pinching Pixie
  (match Lizard Wizard's 10?), Golden Golem**, then Interest Imp, Hedgefund Knight, Bribed
  Bishop, Bookie Bonelord, Atlas, Depression Demon, Fundjin, Stockbroking Sphinx, Vengeful
  Vampire.
- NOT cap-shaped (design change): **Sales Sage** (the "minimum 0" is the degeneracy — floor at
  1, or cap 3), **Toll Troll** Mastery ratchet, **Affluence Anubis** quadratic growth.
- Say the word with your cap list and I stage the edits, run the full bar + prod gate, ship
  before the playtest.

**Design-level (post-tonight, the real fix):**
- Price the curve instead of whack-a-mole caps: repeatable Specialty cost = its RANK (1,2,3,4…
  points). Rank 10 then costs 55 points — self-balancing forever, one function change
  (`allocationPoints`, leveling.js:114), no per-body table sweep. My suggested default, flagged
  as assistant-suggested.
- Alternatively/additionally: price trigger rate — per-card passives fire at most once per N
  seconds — kills chaff-spam as a universal multiplier without touching any card.
- Duration/persistence pricing is the same unresolved ruling flagged in HANDOFF ("duration is
  unpriced"); this review is more evidence for it.

## Verification trail

- Telemetry: scratchpad pull of `/var/data/telemetry.jsonl` (70,623 events), runs filtered
  `harness=false, bots=0`. Combat logs: `/var/data/combatlogs/run-2026-08-{09..12}*`.
- Damage attribution parsed from combat-log damage lines (`(from … — Crypto-Chimera passive)`);
  win-run totals: passive 968 / summons 34 / cards 24.
- Allocation trail from `level_allocate` events (spec 1→10 bought at levels 2→11, one per level,
  nothing else ever bought).
