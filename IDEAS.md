# King Mimic — Idea Bank (go-wild brainstorm)

> A pick-and-choose menu, not a plan. Cross out the duds, star the keepers, scribble
> numbers — hand it back and I'll wire the survivors into `game.js`. Voice to match the
> bestiary: **[finance/corporate/legal pun] + [fantasy creature]**, usually alliterative.
>
> **Buildability tags** (against the current engine):
> - ✅ = ships with existing verbs (`deal`/`attack`/`heal*`/`summon*`/`counter`/`move`/`delay`/`shield`/`dealEachLane`) and triggers (`hourglass`/`damaged`/`enter`/`every:N`).
> - 🔧 = needs one small new verb or flag.
> - 🏗️ = a new system (bigger lift).
>
> Everything is a Combatant = body + items + passives. No auto-swings. Keep that spine.

---

## 1. New keywords / status effects (the vocabulary to grow)

These are the reusable adjectives that make foes AND items feel distinct. Most are small verbs.

- **Bleed / Burn / "Audit"** 🔧 — a stack that deals N at the start of each of the target's timers (DoT). Thematic name: *Accrued Interest* (damage that compounds while you ignore it). Stacks add up; clearing requires a "Write-Off" item.
- **Shock / Stun / "Frozen Assets"** 🔧 — skip the next timer entirely (harder than `delay`, which only rewinds the bar).
- **Pierce** 🔧 — overkill damage carries to the foe behind in the lane (great vs stacked lanes).
- **Cleave / Trample** 🔧 — a front hit also splashes a fraction to the foe behind.
- **Chain / Arc** 🔧 — hits the target, then jumps to the nearest foe in an adjacent lane for less.
- **Execute / "Margin Call"** 🔧 — bonus damage (or instakill) if the foe is below X% HP.
- **Lifesteal / "Vampire Capital"** 🔧 — heal the source for a fraction of damage dealt (generalizes `healAttack`).
- **Thorns / "Liability"** ✅ — already expressible as `{on:"damaged", deal}`; promote to a named, stackable buff.
- **Taunt / "Subpoena"** 🔧 — force a foe (or all foes in a lane) to target a chosen hero/ally next.
- **Mark / "Flagged for Review"** 🔧 — target takes +N from all sources until its next timer (combo enabler).
- **Wither / "Devaluation"** 🔧 — reduce a foe's `phys`/`mag` (negative counter) — the inverse of ramp.
- **Slow / "Red Tape"** ✅-ish — `cdMul > 1` on a foe via an item (you already have `cdMul`; just need a verb to set it).
- **Shielded foe / "Diversified"** 🔧 — foe-side lane shield (foes can protect each other) — mirrors hero shields.
- **Ward variants** ✅ — you have boss `ward`; generalize to "warded while N+ foes alive" or "warded for first 3s".
- **Cleanse / "Bankruptcy"** 🔧 — wipe all stacks/marks/bleeds on a target (reset button).
- **Reflect / "Counter-Suit"** 🔧 — next incoming hit bounces back at the attacker.

---

## 2. New FOE families (extend the 12 — same tier-step pattern)

Each family = a mechanic across 3 tiers (t1/t2/t3 = stat steps). Names ready to drop in.

13. **On-death payload ("golden parachute")** 🔧 — when it dies, fires an effect (deal to lane / summon / heal allies).
    *Severance Specter (1) / Pension Phantom (2) / Estate Eidolon (3).* New trigger: `death`.
14. **Buffs its neighbors** 🔧 — grants +1 to other foes in its lane each timer (a support enemy you want dead first).
    *Synergy Sylph / Consultant Cherub / Boardroom Bodhisattva.*
15. **Shields its lane ("diversifies")** 🔧 — foe-side lane shield each timer.
    *Hedge Hog / Portfolio Python / Index Inevitability.*
16. **Splits when hit ("liquidity event")** 🔧 — on damage, spawns two weaker copies (like a slime).
    *Penny Stock Slime / Fractional Fungus / Tranche Tarrasque.*
17. **Steals an item ("acquisition")** 🏗️ — on hit, disables one of your hotbar items for the fight.
    *Hostile-Takeover Hobgoblin / Buyout Behemoth / Monopoly Manticore.*
18. **Taxes the treasury ("the IRS family")** 🔧 — every timer, drains N shared Treasure (attacks your economy, not your HP).
    *Levy Leech / Tariff Troll / Garnishment Golem.*
19. **Grows with the board ("network effects")** 🔧 — `phys` scales with the number of foes alive (gets scary in packed rooms).
    *Viral Vulture / Platform Phoenix / Ecosystem Eldrazi.*
20. **Heals when an ally dies ("inheritance")** 🔧 — needs the `death` hook to ping lane-mates.
    *Probate Poltergeist / Trust-Fund Troll / Dynasty Dragon.*
21. **Immune to one school ("hedged")** 🔧 — takes 0 from physical OR magical (forces school-swapping).
    *Diversified Djinn / Balanced Basilisk / Hedged Hydra (mini).*
22. **Charges a big one ("the IPO")** ✅ — long timer, then a huge `dealEachLane`. Telegraphed payoff to race.
    *Startup Specter / Unicorn Umbra / IPO Imp.*
23. **Retaliates by moving ("regulatory arbitrage")** 🔧 — when hit, hops to a different lane (slippery).
    *Offshore Ophanim / Loophole Lamia / Arbitrage Aboleth.*
24. **Mimics YOU ("the copycat")** 🏗️ — copies the stats of the hero in its lane (your build becomes the threat).
    *Doppelgänger Director / Carbon-Copy Cambion / Reflection Revenant.* (Very on-theme for "King Mimic".)

---

## 3. New BOSSES (floor-enders; explicit numeric threat, no Power)

You have 4 (Hydra/Lich/Djinn/King Mimic). A floor-5+ rotation:

- **The Ledger Leviathan** 🔧 — two health bars ("assets" / "liabilities"); damage to one heals the other unless you alternate schools. Teaches school-swapping.
- **Quarterly the Devourer** ✅/🔧 — acts in "fiscal quarters": every 4th timer is an "earnings call" — a board-wide `dealEachLane` spike. Rest of the time it's calm. Rhythm boss.
- **The Subprime Specter** 🔧 — spawns "loan" tokens that look harmless but detonate (on-death payload) after N timers. Clock-management boss.
- **Auditor-General, Final Form** 🔧 — disables one random hotbar slot each timer (item lockout); you fight with a shrinking kit.
- **The Invisible Hand** 🔧 — `ward` flips: it's *only* damageable during its own timer windows (inverse King Mimic). 
- **Ponzi, the Pyramid Eternal** 🔧 — every timer summons a smaller copy of itself in a new lane; kill the apex to collapse the scheme (warded until the base is cleared — reuse `ward` logic inverted).
- **Black Swan** ✅ — random: each timer fires a *different* one of the other bosses' signature moves. Chaos capstone.
- **The Shareholder** 🏗️ — co-op finale: targets the player with the biggest kit/most bodies ("majority stake"); punishes the hoarder, rewards spreading power across the party.

---

## 4. New ITEMS / equipment (grow the KIT vocabulary)

Tagged by the verb they need. Prices/ante to taste.

**Buildable now ✅**
- **Dividend** — heal the whole party 2 (party-wide heal; you have heal, needs target=allies — small).
- **Short Sell** — deal big to the *back* foe of a lane (rewards positioning).
- **Margin Loan** — deal 8, but you take 2 (risk item; `bloodPrice` vibe).
- **Stonks** — deal = your current `counters` × 2 (pays off ramp builds).
- **Diversify** — shield all three lanes for 2.
- **Golden Handcuffs** — `delay` a foe hard (you have delay) + it can't move (flavor).

**Small new verb 🔧**
- **Layoffs (Cleave)** — front foe + splash behind.
- **Hostile Takeover (Steal)** — turn a low-HP foe into a temporary ally (convert).
- **Insider Tip (Mark)** — target takes +3 from the party's next hits.
- **Write-Off (Cleanse)** — clear bleeds/marks on a hero; heal 1 per stack removed.
- **Pump & Dump** — buff a foe's... no — buff an ALLY +2 phys this fight, then it expires.
- **Compound Interest (Bleed)** — apply a stack that grows each timer (the scary DoT).
- **Recession (Wither)** — lower a foe's Power by 2.
- **Bailout** — revive a downed ally at half HP (breaks "no mid-combat revive" — make it a rare fragile item; very co-op).

**Bigger 🏗️**
- **The Printer** — generates 1 Treasure each timer during combat (econ engine you must protect).
- **Crypto Wallet** — random effect each use (gambling item; either deal big or fizzle).
- **Index Fund** — fires a weak copy of every *other* item in your kit (scales with kit size → synergy with kit-slot upgrades).

---

## 5. New BODIES / player options (the "wear what you kill" hook)

- **More class archetypes** ✅: 
  - **Broker** (support: buffs/marks, low damage) — affinity neutral, `itemCdMul` on utility.
  - **Raider** (glass cannon: huge phys, tiny HP, fast).
  - **Tank / "Bagholder"** (massive HP, slow, lane-shield passive).
  - **Quant** (scales with `counters`; a ramp class).
- **Body passives for players** 🔧 — right now player bodies are stat dials only. Let adopted FOE bodies keep a (weakened) version of their passive when *you* wear them — e.g., wearing Fat Cat lets YOU spawn a rat when hit. Massive for the mimic fantasy; makes body choice build-defining.
- **Hybrid affinities** ✅ — a body with both `phys` and `mag` (jack-of-all, master of none).
- **"Cursed" bodies** 🔧 — powerful stats but a downside passive (e.g., +4 phys but lose 1 HP/timer). High-risk adoptions.
- **Body XP / leveling** 🏗️ — a body you wear across rooms levels up (the kit-slot/treasure spectrum, extended to bodies).

---

## 6. New NODE TYPES / map events (you now have combat / elite / shop / boss)

- **Rest / "Off-Site"** ✅ — heal the party + caravan, OR upgrade one item. The classic campfire choice.
- **Event / "All-Hands"** 🏗️ — a text choice with a risk/reward fork (gain Treasure but take a curse; gamble an item; etc.). Lots of replay flavor.
- **Treasure / "Vault"** ✅ — a free chest: a pile of loot to claim (no fight), but claiming it all banks nothing (greed tension without combat).
- **Gauntlet / "Hostile Quarter"** ✅ — back-to-back fights, no shop between, but a fat payout.
- **Recruiter / "Headhunter"** 🔧 — a node that *gifts* a specific foe body into your pool (curated mimic pickup).
- **The Fence** 🔧 — sell items for Treasure (the inverse of the shop; offload your hoard).
- **Mystery node "?"** ✅ — Slay-the-Spire style: you don't know which of the above until you arrive.

---

## 7. New ENCHANTMENTS (room modifiers — harder fight, richer reward)

You have Hastened / Fortified / Savage / Cursed Hoard. More:

- **Leveraged** ✅ — foes deal double, but loot value is doubled too.
- **Volatile** ✅ — every foe has a random extra item.
- **Bear Market** ✅ — caravan starts at half HP, but Treasure banked is +50%.
- **Bull Market** ✅ — foes have +HP but drop an extra item.
- **Audited** 🔧 — your cooldowns are +20% this room (debuff), payout +1 item.
- **Insider Trading** ✅ — you can see the next room's enchant AND get a free reroll-equivalent.
- **Quiet Period** 🔧 — no passives fire for the first 3s (both sides) — a tense calm open.

---

## 8. CO-OP–specific mechanics (it's Skribbl/Jackbox-class — lean in)

- **Combo / "Merger" hits** 🔧 — two players hitting the same foe within 1s deal bonus ("synergy" damage). Rewards coordination, very satisfying on voice.
- **Hand-offs / "Wire Transfer"** 🔧 — pass an item or Treasure to a teammate.
- **Shared aggro lanes** ✅ — already lane-based; add callouts ("I've got mid!").
- **Revive-a-buddy** 🔧 — the **Bailout** item above; or a teammate can spend a timer to revive a downed ally.
- **Role drift** ✅ — because bodies are exclusive and tradeable, the party naturally specializes; surface "who should wear the tank" as UI nudges.
- **Voting nodes** 🏗️ — event/path choices the party votes on (Jackbox energy).
- **"Blame" / MVP screen** ✅ — post-run stats: most damage, most Treasure banked, most deaths (laugh fuel).

---

## 9. ECONOMY / META extensions (build on the Treasure spectrum you just shipped)

- **Per-player wallets** 🏗️ — the "even split" you wanted; turn the shared bank into individual purses (MP).
- **Interest** 🔧 — unspent Treasure earns a little each room (hoarding has upside → tension with spending).
- **Item upgrades at the shop** 🔧 — pay Treasure to level an item (Fire → Fire II: +damage / -cd). The "spend on item levels" spectrum.
- **Body tiers buyable at shops too** ✅ — surface `buyTier` in the shop UI (one-stop spend).
- **Insurance** 🔧 — pay Treasure pre-fight; refunded + bonus if you take no caravan damage.
- **Loans / debt** 🏗️ — borrow Treasure now, owe more later (Ponzi-flavored risk meta).
- **Boss/elite rewards** 🔧 — **(open decision from HANDOFF)** bosses currently drop nothing; give them a guaranteed purse or a rare ware.
- **Treasure-scaling items** ✅ — "Stonks"-style cards whose power reads your current balance.

---

## 10. Pure NAME BANK (no mechanic attached — just steal these)

**Foes**
Foreclosure Fiend · Escrow Wraith · Liquidation Lich · Dividend Dryad · Capital Gargoyle ·
Recession Wraith · Inflation Imp · Deficit Demon · Surcharge Sphinx · Overdraft Ogre ·
Collateral Kraken · Amortization Aatxe · Equity Wraith · Stipend Sprite · Dividend Drake ·
Quarterly Quasit · Fiduciary Fiend · Insolvency Incubus · Arrears Aspect · Usury Undine ·
Goblin of Goodwill (accounting pun) · Bearish Banshee · Bullish Basilisk · Ledger Lich ·
Compliance Cockatrice · Synergy Specter · Quota Quetzal · Margin Mummy · Bonus Bugbear ·
Severance Siren · Vesting Vampire · Annuity Angel · Treasury Treant · Liability Lamia ·
Solvency Salamander · Yield Yeti · Default Dullahan · Garnish Gremlin · Stakeholder Stalker.

**Bosses**
The Conglomerate · Mother of Markets · The Quarterly Dragon · Sovereign Default ·
The Liquidator · Chairman of the Board · The Bubble Itself · Too-Big-To-Fail ·
The Audit Eternal · Receivership Rex · The Bottom Line · Diminishing Returns.

**Items**
Briefcase of Holding · Ergonomic Greatsword · Stapler of Smiting · Quarterly Report (scroll) ·
Stress Ball (heal) · Standing Desk (shield) · Noise-Cancelling Helm · Corner-Office Crown ·
Severance Package · Synergy Serum · The Golden Stapler · Performance Improvement Plan (curse) ·
Out-of-Office Aegis · Expense-Account Elixir · Non-Compete Net · Pink Slip (execute).

**Allies / tokens**
Intern (the new Rat) · Temp · Contractor · Mascot · Brand Ambassador · Loss-Leader Lemming ·
Focus-Group Familiar · Compliance Drone · Mailroom Imp · Junior Analyst.

**Statuses**
Accrued Interest (bleed) · Frozen Assets (stun) · Flagged for Review (mark) · Devaluation (wither) ·
Red Tape (slow) · Liability (thorns) · Goodwill (regen buff) · Underwater (low-HP debuff).

---

## Suggested first cut (my pick of the highest fun-per-effort)

1. **`death` trigger** 🔧 — unlocks family 13 (on-death payloads) + 20 (inheritance) + Bailout/Ponzi. One verb, huge surface.
2. **Player bodies keep a weakened passive** 🔧 — makes the mimic hook finally *matter* for builds.
3. **Bleed / "Accrued Interest"** 🔧 — the missing status archetype; pairs with the audit/finance theme perfectly.
4. **Rest + Event nodes** ✅/🏗️ — you just proved the node-type pattern with shops; Rest is trivial, Event is the replay-juice.
5. **Boss reward** 🔧 — close the open regression (bosses drop nothing) — pick a flavor from §9.
6. **Combo/"Merger" hits** 🔧 — the one mechanic that makes *co-op* feel special on voice chat.

Mark up freely — I'll wire the winners.
