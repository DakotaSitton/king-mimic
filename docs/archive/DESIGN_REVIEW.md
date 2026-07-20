# DESIGN_REVIEW — every current design, deeply considered (2026-06-12, autonomous block)

> Companion to **BALANCE_REPORT.md** (simulation numbers; written by a parallel agent
> against the pre-redial snapshot) and **telemetry.jsonl** (your live pick-rate data —
> `bun tools/telemetry-report.js` once you've played a few runs). This doc is the
> judgment layer: what each design is FOR, whether it's earning its slot, and what only
> you can decide. Verdicts: ✅ sound · ⚠️ watch · ❌ broken (fix applied or needed).
> Where I already acted, it's marked APPLIED — all such changes were to MY OWN same-day
> [PLACEHOLDER] numbers, never to your canon dials.

## The one systemic finding (read this even if you skip the rest)

**Power × press-rate is the game's hidden exchange rate.** Body Power adds per PRESS, so
fast items convert Power to DPS several times better than slow ones: Crossbow (cd 1s)
turns 3 Power into 6.0 DPS while Hatchet (cd 5s) turns the same body into 1.4. Three
consequences compound: (1) spam items + high-Power bodies are the dominant DPS strategy
(Senior Pixie + Crossbow tops BOTH sides of the 1:1 mirror); (2) every slow "big button"
needs a per-press base big enough to pay the Power-tax — Omnislash failed exactly this
test (APPLIED: +2/strike); (3) your own counterweights are already in the engine — the
echo redesign pays slow play, AUTO feeds the Djinn, Blizzard drains spam hotbars — but
nothing taxes spam *in general*. If telemetry shows everyone converging on spam kits,
the lever I'd reach for is per-press base scaling DOWN slightly with cd (or echo-style
pushback baked into more bodies), not nerfing individual items one at a time.

## Items — first set (24)

| Item | Verdict | Note |
|---|---|---|
| Sword/Bow | ✅ | Honest 1g baselines; melee-vs-ranged tension works. |
| Hatchet | ⚠️ | The Power-tax case study: at Power 3 it's half a Sword. Fine as a 1g echo-body tool; don't expect anyone else to keep it. |
| Fireball/Lightning | ✅ | Single vs lane AoE at the same price — real choice. |
| Wind | ⚠️ | Pushback re-walls melee reach (front-sort undoes it next formUp). Niche vs Hydra heads; telemetry will tell if it's ever picked. Stays player-only (correct). |
| Heal/Shields | ✅ | smallShield 0.5/s vs bigShield 0.67/s sustain — big wins per press but small smooths spikes. Trusty's startCharged is the best design of the three. |
| Rat/Large Rat | ✅ | Summons are the strongest archetype in the game (see Bodies) — these are the budget entry. |
| Gang Up | ⚠️ | Great with summon kits, a dud on lone wolves; that swing is the design. The 0-sword-caster dud version on foes is most of the remaining 8.9% dud tail — consider school-gating `itemThreatens` for amount-bearing items too (your call: it would also remove fun jank). |
| Scary Knife / Magic Missile / Crossbow | ❌→your call | The spam trio IS the balance problem (Crossbow: best DPS-per-gold in the kit at 6.0 on Senior Pixie). I didn't touch them — they're first-set canon. Options if telemetry confirms auto-pick: raise cd, or per-press base scaling as above. |
| Spear | ✅ | front2 is a real niche (Hydra heads, tentacle walls). |
| Darkness | ✅ | Lifesteal sustain at 2g; priced about right per sim. |
| Totem/Flag/Knight | ✅ | Lane auras make positioning matter; Knight at 4g is the premium and earns it. |
| Spikes | ✅ | Now reaches foes too (audit addition) — thorns vs spam parties is exactly the counterweight the systemic finding wants. |
| Blizzard | ❌→APPLIED | Was a documented no-op on foes (drain never touched `inv`) and pool-exiled — your "never seen one" was both. Fixed symmetric, re-admitted SECOND-slot only (first-slot rolls made the worst dud-foes in the 10k sim). |
| Slime Crown | ⚠️ | 4g for permanent −1 was outclassed by my original Stone Skin numbers — fixed on the Stone Skin side (uptime now <60%), Crown's permanence is its identity. Watch the pair. |

## Items — the new wave (7, your spitball list)

| Item | Verdict | Note |
|---|---|---|
| Haste (3g) | ✅ | 5s double-speed per 10s cd. Multiplies spam kits hardest (systemic finding) — if spam needs a nerf later, Haste is part of the bill. |
| Power Boost (3g) | ❌→APPLIED | My dur 80 ≥ cd 70 made it a PERMANENT +2/+2 for 3g. cd → 14s (≈57% uptime). Also fixed the real bug underneath: buff durations now ride cdScale like every other clock, so uptime is identical at test and live pacing. |
| Stone Skin (3g) | ❌→APPLIED | Same permanence bug, same fix. |
| Omnislash (5g) | ❌→APPLIED | Amount-0 ×4 was strictly worse than a 1g Sword. Now 4 × (sword+2): premium burst, 4 on-damaged procs (do NOT press it at the Hydra — that's a feature). |
| Giga Cast (5g) | ✅ | Once-per-fight ×4 staff burst; stacks with echo (×8 on Mouse) — that ceiling is the reason to draft a mage. Watch vs the Lich's recess window: probably the intended counter, possibly too clean. |
| Time Stop (6g) | ✅ | 3s full freeze, once per fight, ready at the bell. The panic-button trio (w/ Revive) starting charged is the right feel — no fight where your emergency tool isn't loaded. Symmetric engine exists (a foe one would freeze YOU) but it's not in foe pools — un-telegraphed freezes would read as lag, parked for your verdict. |
| Revive (6g) | ✅ | The caravan already paid the death HP — Revive doesn't refund it, so deaths still sting. All-downed is still a loss (nobody alive to press it): the deadlock guard holds. |

## Bodies (12 templates)

Sim passive-value per 10s puts **summoners at ~6× everything else** (Fat Cat 21.7,
Paid Piper 19.0, Royal Rat 18.7 — vs ~3.3 for the tank row, Vampire dead last at 1.67).
Two readings: (a) rats stack and the sim over-credits long fights — your real fights are
shorter; (b) your own "immensely satisfying" Royal Rat run is the same signal from the
other direction. I believe it's real but smaller than 6×. **This is the #1 thing
telemetry will settle** — body_swap events will show if everyone funnels into summoners.
Don't pre-nerf; let the data land. Vampire needs love either way (heal scaling with
sword Power instead of flat is the obvious dial). Echo bodies post-redesign are the
most interesting deckbuilding decision in the template set — the bar/pushback/button
loop is your best mechanic; protect it from AUTO-mode creep.

## Bosses (5)

The budget contract (players × floor) holds for HP everywhere, but **threat spend is
wildly uneven** (sim): Hydra at floor 3 was 0% winnable for the reference bot while
Lich/Kraken dealt literally zero median damage at every size — they're stall puzzles,
all the roster's hurt lives in Hydra/Djinn/King. Three owner calls, untouched by me:
1. **Hydra**: wave-start 5 is your canon; with the 1.5× pace redial the inflation now
   outruns any fixed kit at floor 3. If real parties (better kits than the bot) also
   bounce, the dial is the head CLOCK at high floors, not the start count.
2. **Lich/Kraken**: zero damage may be fine (the caravan clock and the steal ARE the
   pressure) — but at the same budget as Hydra, "feel" diverges hard. Worth a deliberate
   verdict: are stall bosses paying out the same as burn bosses?
3. **King Mimic**: the deck rotation means his threat is the AVERAGE of his cards —
   serially calmer than Hydra's compounding board even at budget ×4. Persistence
   (court stays, stance holds) is doing the heavy lifting. After your first real throne
   kill, the dial to watch is card cds, not HP.

## Economy

The de-tiered single-number economy is the best structural decision in the project —
every audit above turned into "compare DPS to gold" because one number rules everything.
Two leans the sim found: **ante buys less threat as it grows** (0.32 DPS/ante at 2 → 0.20
at 6+, because senior gold buys HP and utility second slots add ante with no DPS) — so
up-the-ante rooms pay slightly free money; and the **content ceiling** moved (max foe
ante ~14 with Omnislash) which feeds your parked ante-ceiling decision. Boss payday
(10g/player + rares shelf) now gives the wave items a natural acquisition path — watch
whether 10g feels like a real choice against 5-6g panic buttons (I think it does:
two-of-three, pick your insurance).
