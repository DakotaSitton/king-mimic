# King Mimic — Mechanics & Content Listing

> Editable working doc. Mark this up however you like (cross things out, rewrite text,
> change numbers, add a column) and hand it back — I'll reconcile it into `game.js` /
> `content.js`. Today's date: 2026-06-05.

Two layers below. **PLAYABLE** = wired and running in the engine right now.
**LIBRARY** = transcribed from the paper set, mostly data-only / stubbed.

---

# LAYER 1 — PLAYABLE (what actually runs today)

## Bodies (your HP + attack; the "mimic" — defeat a foe to unlock its body)
Source: `game.js` BODIES. `cd` = ticks between that body's auto-attacks (100ms/tick).

| key         | name          | HP  | atk | attack cd | enemy-spawns? |
|-------------|---------------|-----|-----|-----------|---------------|
| rookie      | Rookie Mimic  | 8   | 2   | 0         | no (starter)  |
| pixie       | Penny Pixie   | 5   | 1   | 30        | yes           |
| auditAngel  | Audit Angel   | 8   | 2   | 45        | yes           |
| killionaire | Killionaire   | 13  | 4   | 70        | yes           |

Starter body: `rookie`.

## Equipment (your cooldown-bar cards; only these 7 are playable)
Source: `game.js` KIT + the `useItem` switch. `cd` = recharge ticks.

| key         | name              | cd  | effect (as coded)                    |
|-------------|-------------------|-----|--------------------------------------|
| fire        | Fire              | 25  | Deal 2 to front foe in your lane     |
| fireII      | Fire II           | 55  | Deal 4 to front foe in your lane     |
| lightning   | Lightning         | 35  | Deal 1 to every foe in your lane     |
| towershield | Trusty Towershield| 60  | +1 shield to your lane               |
| wheelbarrow | Big Ol Wheelbarrow| 95  | +3 shield to your lane               |
| light       | Light             | 70  | Heal caravan 3                       |
| fairyBottle | Fairy Bottle      | 45  | Heal caravan 2                       |

New players get **3 random** of these (god mode gives all 7, ~0.5s cd).

## Enemy pools per room (which bodies foes wear)
Source: `game.js` buildRoom.

| room type | foe count   | pool of bodies used                              |
|-----------|-------------|--------------------------------------------------|
| combat    | 7           | pixie, auditAngel, killionaire                   |
| elite     | 10          | pixie, auditAngel, killionaire, killionaire      |
| boss      | 12          | auditAngel, killionaire, killionaire             |

## Core constants
LANES=3 · CARAVAN_MAX_HP=20 · ROOM_SIZE=7 · REVIVE_TICKS=100 (10s) · GOD_CD=5

## Combat loop (as coded)
- Each tick (100ms): player cards recharge; each foe's charge++; at its cd it attacks.
- Foe attack hits lane shield first, then the front living player in that lane, else the caravan.
- Player downed at 0 HP → revives at half HP after 100 ticks.
- Room won when all foes cleared; lost when caravan hits 0. Boss clear = level complete.

---

# LAYER 2 — LIBRARY (paper set, mostly NOT wired yet)

> 118 entries in `content.js`. Each has truthful `text`. Anything with `{do:"special"}`
> is a clearly-labeled stub. Listed here by mechanic family so you can prune/simplify.

## Foes — 36, in 12 mechanic families × 3 tiers (tier = stat step)
Format: tier1 / tier2 / tier3 — shared mechanic.

1. **On attack: heal self for attack** — Boss Babyfangs (1/3) / Vengeful Vampire (2/5) / Gutsy Greatswordsman (3/7)
2. **On attack: gain a +1** — Intern Imp / Middle-Management Medusa / Killionaire
3. **Hourglass: attack** — Penny-Pinching Pixie / Yuppie Youngdead / Fiscal Phoenix
4. **On attack: deal N** — Bubble-Burst Basilisk (1) / Lizard Wizard (2) / Rent-Seeking Runeblade (3)
5. **When damaged: attack** — Angry Accountant / Market-Crash Minotaur / Pyramid Scheme Head
6. **When damaged: deal N to lane** — Psychic Starfish (1) / E-Finance Efreeti (2) / Nepotistic Neptune (3)
7. **Hourglass: heal self N** — Weary Wageslave (1) / Bond Behemoth (2) / Atlas, Shrugging (3)
8. **When attacked: play rats** — Fat Cat / Fatter Catter / Fattest Cattest (2 rats)
9. **Hourglass: deal 0 to lane + Flat Damage N** — Money-Munching Mummy / Cashflow Cerberus / Lil Lich
10. **Hourglass: summon N rats** — Royal Rat / Royaler Rat / Royalest Rat
11. **Hourglass: gain N +1s** — Day-Trader Demon / Hedge-Fund Harpy / Bigwig Balrog
12. **Hourglass: deal N + heal own flat dmg** — Audit Angel / Bailout Banshee / Golden-Parachute Griffin

## Bosses — 4 (ATK/HP are formulas: P=party size, F=floor)
- **Hyper-Inflation Hydra** — enters with +1s = party; damaged → spawn rats in lane; hourglass → +1 then play heads per +1s. ATK=F, HP=P·F·4
- **Litigation Lich** — hourglass → summon an Ante's worth of bodies; parity armor (odd: take only 1; even: take 1 less). ATK=F, HP=P·F·4
- **Djinn of Deals** — damaged → move+attack; hourglass → attack each lane; toll: player loses 1 HP per card played. ATK=F, HP=P·F·4
- **King Mimic** — enters playing all 3 nemeses; hourglass → equip a black market; warded while any other foe is on board. ATK 4 / HP 99

## Equipment — 66, by tier
Each line: key — effect text. (★ = wired in Layer 1 too.)

### Tier 1 (★ playable: fire, lightning, light, towershield, wheelbarrow, fairyBottle)
- fire ★ — Deal 2
- lightning ★ — Deal 1 to the lane
- ice — Deal 1, reduce foe dmg 1 this turn
- light ★ — Heal 3
- fireling — Summon Fireling (1HP, Deal 1)
- lightling — Summon Lightling (1HP, Heal 1)
- earthling — Summon Earthling (2HP wall)
- fluffySlippers — +1 Flat Dmg, take 1 more from all sources
- quickBrace — Next card is a sale
- magicMissile — Deal 1 (Sale)
- magicSurge — +1 Flat Dmg this turn (Sale)
- manaShield — Deal 1, Shield 1
- towershield ★ — Shield 1 (Sale)
- fairyBottle ★ — Heal 2 (Sale)
- pocketSand — Reduce foe dmg 2 this round (Sale)
- wheelbarrow ★ — Shield 3
- bigPecks — +1 HP
- bolster — Gain +1, Shield 1
- mendDefend — Heal 2, Shield 1
- taunt — Shield 2, Move a foe
- cripple — Reduce foe dmg 3 this round
- gust — Deal 1, move that foe
- waveOfSlugs — All foes in a lane deal 2 less this turn
- doubleStrike — Attack even after a deal; it deals double
- ratElemental — Summon Rat Elemental (1HP, hourglass: play a rat)
- momentum — +1 dmg with attacks this turn
- bountyStrike — Attack; on kill gain +1 and heal 2
- fishingPole — Move a foe, Attack
- buildUp — Attack, gain +1
- pierce — Attack +1; excess hits foe behind
- cripplingBlow — Attack; foe deals 1 less this turn
- nerdCrush — Attack; +2 if foe has less HP than you
- recycleStrike — Attack; return a card to hand
- gravebeam — Deal 2; return a card to hand
- animatedSword — Summon Animated Sword (1HP; atk = your atk)
- bloodPrice — Lose 2 HP, Attack (Sale)
- heavyBlade — +1 dmg with attacks (passive)

### Tier 2
- windCuffs — Hourglass: move a foe
- trample — +1 dmg with attacks; attacks trample
- returning — +1 dmg with attacks; attacks may target any foe
- swiftStrike — Attack (Sale)
- sharkbite — Take 2, Attack, heal for dmg dealt (Sale)
- flurry — Attack, Attack
- liquidMetalBlade — Attack; gain shield = dmg dealt
- flowState — Attack, then play top card of deck
- fireII ★ — Deal 4
- lightningII — Deal 2 to two different targets
- iceII — Deal 2, foe −2 atk this turn
- windII — Deal 1 to a lane, move all foes in it
- fireElemental — Summon Fire Elemental (3HP, Deal 1 to lane)
- earthElemental — Summon Earth Elemental (4HP wall)
- potOfGreed — Draw 2 (Sale)
- wizardHat — +1 Flat Dmg (passive)
- rewind — Activate all your hourglass effects now

### Tier 3
- aspectOfFlame — Summon Aspect of Flame (4HP, Deal 2 to lane)
- aspectOfEarth — Summon Aspect of Earth (6HP, Shield 1)
- equilibrium — Restore target to full OR deal its missing HP
- thornCrown — Deal 2 to foes that damage you
- unbreakable — Shield 10
- aspectOfRats — Summon Aspect of Rats (2HP, hourglass: double rats in lane +1)
- ironSkin — Hourglass: Shield 1
- duelistBlade — +1 dmg with attacks (+2 if target adjacent)
- undyingStrike — Attack; hourglass: replay from used pile as sale
- butterflyBlades — Attack, Attack (Sale)
- berserkerArmor — Hourglass: +counter; take dmg = counters; +1 atk per counter; can't discard
- everflowingRobes — When bag empties, shuffle used pile back in

## Tokens — 12 (summoned helpers)
rat (1/1) · head (1/1 hydra) · fireling (1HP Deal 1) · lightling (1HP Heal 1) ·
earthling (2HP wall) · fireElemental (3HP Deal 1/lane) · earthElemental (4HP wall) ·
aspectFlame (4HP Deal 2/lane) · aspectEarth (6HP Shield 1) · aspectRats (2HP double rats) ·
ratElemental (1HP play a rat) · animatedSword (1HP, atk = owner's atk)

---

## Vocabulary (recurring mechanic words)
- **Hourglass** — a periodic timer trigger (every N ticks / "turn" in paper terms).
- **+1 / counter** — permanent stat buff stacked on a unit.
- **Flat Damage** — bonus damage added on top of an attack from a passive source.
- **Sale** — a cheaper/free card category; some cards make your "next card a sale."
- **Deal vs Attack** — *Deal* = direct effect damage; *Attack* = your body's atk swing.
- **Lane** — one of 3 vertical columns; foes and shields are per-lane.
