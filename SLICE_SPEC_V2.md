# SLICE SPEC V2 — "The First Set" (36 bodies · 24 items)

> Supersedes the body/item lists in SLICE_SPEC.md once the owner approves. Map, caravan,
> economy, stock/draft/shop flow are UNCHANGED from V1. All numbers are FIRST-DRAFT
> (balance is greenfield — owner redials after play). Names marked **[PLACEHOLDER]** are
> mine and WILL be overwritten by the owner; everything else is owner canon.
>
> Boss + court are OUT of this set by owner decision: he plays up to the boss node on
> this content first, then feeds the boss designs manually.

## 1. Rarity system (the tripled-tier pattern, reborn)

Each of the 12 mechanics ships at three rarities — same passive identity, scaled
statline AND scaled passive magnitude. (Binary passives — echo, cross-school — can't
step, so they scale statline only; noted per-body.)

| Rarity   | HP        | Power step | Passive magnitude | Ante tier | Where it appears                |
|----------|-----------|------------|-------------------|-----------|---------------------------------|
| Common   | base      | base       | step 1            | 1         | draft wheel + foe pool          |
| Uncommon | ×1.6 (rnd)| +1         | step 2            | 2         | foe pool; swap via tier buy-in  |
| Rare     | ×2.4 (rnd)| +2         | step 3            | 3         | foe pool; swap via tier buy-in  |

- Draft wheel draws COMMONS only. Tier buy-in economy unchanged (fell one → reachable,
  buy the tier from your own wallet).
- Implementation: `BODIES` is GENERATED from 12 mechanic templates × this table —
  one source of truth, no 36-entry hand-copied list.
- **[PLACEHOLDER naming suggestion]** rarity = corporate seniority prefix
  (e.g. *Junior X / X / Senior X*), so 12 names produce all 36. Owner decides.

## 2. The 12 mechanics

Schools: `phys` = sword, `mag` = staff. Base statlines per archetype band:
Summoners 5HP/1mag · Attackers 7HP/1–2phys · Casters 5HP/1–2mag · Tanks 9HP/1phys.
(Power step from the rarity table stacks on top.)

### Summoners (mag affinity, low HP)
| # | Passive | C / U / R magnitude | Name |
|---|---------|---------------------|------|
| S1 | After you resolve a **staff** item → summon rat(s) in your lane | 1 / 2 / 3 rats | **Royal Rat** |
| S2 | When **damaged** → summon rat(s) | 1 / 2 / 3 rats | **Fat Cat** (carries over from V1) |
| S3 | After you resolve a **sword** item → summon rat(s) | 1 / 2 / 3 rats | **Paid Piper** |

### Attackers (phys affinity, mid HP)
| # | Passive | C / U / R magnitude | Name |
|---|---------|---------------------|------|
| A1 | **Echo (sword):** your sword items resolve **twice** when they fire | binary — statline-only scaling | **Centless Centaur** |
| A2 | Your sword items charge faster | cd ×0.75 / ×0.6 / ×0.5 | **Penny-Pinching Pixie** |
| A3 | After you resolve a sword item → heal self | 1 / 2 / 3 | **Vengeful Vampire** |

> **Design intent (owner, verbatim idea):** echo bodies reward drafting slow, huge items —
> "you are rewarded for taking the double-up bar body with the long cd Hatchet,
> offsetting the cost of such a slow item."

### Casters (mag affinity, low HP)
| # | Passive | C / U / R magnitude | Name |
|---|---------|---------------------|------|
| C1 | **Echo (staff):** your staff items resolve **twice** when they fire | binary — statline-only scaling | **Malovelant Mouse** |
| C2 | Your staff items charge faster | cd ×0.75 / ×0.6 / ×0.5 | **Lizard Wizard** |
| C3 | **Cross-school:** your staff items also add your **sword** Power | binary — give this body phys that grows with rarity (1/2/3) | **Rent-Seeking Runeblade** |

### Tanks (phys affinity, high HP)
| # | Passive | C / U / R magnitude | Name |
|---|---------|---------------------|------|
| T1 | When damaged → **counter** (schoolStrike: deal sword Power back) | auto-scales with Power step | **Market-Crash Minotaur** (carries over) |
| T2 | Every N: heal self | heal 2/3/5 · N 30/25/20 | **Weary Wageslave** (carries over) |
| T3 | Every 40: gain +counter(s) (damage bonus); being damaged adds +10 charge to this clock | +1 / +2 / +3 counters | **Atlas, Shrugging** |

> Tanking is POSITIONAL by design (owner confirmed): you physically run lane to lane and
> step to the front of the depth line to block. No taunt/redirect mechanic — keep bars
> readable so blocking is a real-time decision, not a stat check.

V1 bodies whose mechanic didn't survive (Royal Rat's every-N summon, Lizard Wizard,
Pixie, Runeblade, Vampire, Audit Angel) retire from the pool; their names go back on the
shelf for the owner to reuse.

## 3. The 24 items

cd in ticks (×10 = seconds at base; global `_cdMult` 2 still applies at runtime).
"aimed" = your **foe-target** · support items read your **ally-target** (see §4).

### Common (12)
| Item | School | cd | Effect (first-draft) |
|------|--------|----|----------------------|
| Sword | phys | 20 | Deal sword+1 to the front foe in your lane |
| Bow | phys | 25 | Deal sword+1 to your aimed foe (ranged) |
| Hatchet | phys | 50 | Deal sword+4 to the front foe |
| Fireball | mag | 45 | Deal staff+3 to your aimed foe |
| Lightning | mag | 50 | Deal staff+2 to every foe in your lane |
| Wind | mag | 30 | Deal staff+1 to your aimed foe and push it back |
| Small Shield | — | 20 | Gain 1 shield |
| Heal | mag | 30 | Heal staff+2 to your ally-target (fallback: most-hurt, incl. you) |
| Big Shield | — | 45 | Gain 3 shield |
| Rat | mag | 35 | Summon a rat in your lane |
| Gang Up | phys | 30 | Deal sword+1, +1 per other ally in your lane, to the front foe |
| Summon Large Rat | mag | 55 | Summon a large rat in your lane |

### Uncommon (8)
| Item | School | cd | Effect |
|------|--------|----|--------|
| Scary Knife | phys | 12 | Deal sword to the front foe |
| Spear | phys | 45 | Deal sword+3 to the front TWO foes in your lane |
| Magic Missile | mag | 15 | Deal staff to your aimed foe |
| Darkness | mag | 50 | Deal staff+3 to your aimed foe; heal yourself the damage dealt |
| Totem | mag | 50 | Summon a totem (3 HP, no attack): allies in its lane take **−1 damage** while it stands |
| Flag | phys | 50 | Summon a flag (3 HP, no attack): allies in its lane deal **+1 damage** while it stands |
| Trusty Shield | — | 35 | Gain 2 shield; **starts fully charged** each fight |
| Spikes | — | 40 | This fight: attackers that strike you take 1 (thorns) |

### Rare (4)
| Item | School | cd | Effect |
|------|--------|----|--------|
| Repeating Crossbow | phys | 10 | Deal sword to your aimed foe |
| Blizzard | mag | 55 | Deal staff+2 to every foe in your lane AND drain 10 charge from each of their clocks (the in-engine "slow" — owner approved drain) |
| Hedgefund Knight | phys | 60 | Summon a knight (6 HP, attacks every 2s): allies in its lane deal +1 AND take −1 while it stands |
| **Liquid Metal King Slime Crown** DR passive | — | worn | Worn: take −1 from every hit (existing Aegis/dr pattern) |

Rarity → shop: weighting/pricing knob (commons cheap & frequent, rares expensive & rare).
**Deferred by owner:** rarity VARIANTS of items (uncommon Bow, rare Sword…) — the body
template×rarity generator is built to carry items later for free.

## 4. New engine systems (build order)

1. **Ally-target slot** — `player.allyTargetId` beside the existing foe `targetId`.
   Click a foe → sets foe-target; click an ally → sets ally-target. Offensive items read
   ONLY foe-target; support items read ONLY ally-target. Invalid states unrepresentable —
   no "smart" per-card validation needed. Fallbacks: front-of-lane / most-hurt-incl-self.
2. **Aura tokens** — summons carrying `aura: {dmgBonus?|dmgReduce?}`, lane-scoped, live
   while the token stands, fully symmetric (a foe Totem protects foes). Same aura type
   does NOT stack; strongest applies. Tokens: totem, flag, knight (+ large rat, no aura).
3. **Echo** — body flag `echo: "phys"|"mag"`: matching items resolve their ops twice.
4. **School CDR** — body `swordCdMul` / `staffCdMul` (school-filtered cousin of itemCdMul).
5. **Cross-school** — body flag: staff items add phys Power on top of mag.
6. **Thorns** — per-fight self buff: melee attackers take flat N back.
7. **Charge drain op** — expose the existing charge-reduction as an item op (Blizzard).
8. **Damaged-accelerates-timer** — onDamaged adds charge to a body's `every:N` clock (T3).
9. **Front-2 targeting** — Spear's two-deep hit.
10. **Player-cast summon items** — summon op fired from the player side into `allies`
    (infra exists); new tokens defined in §3.
11. **Rarity generator** — 12 templates × §1 table → 36 BODIES entries at boot.

## 5. Owner to-do (blocks content entry, not engine work)
- Overwrite every **[PLACEHOLDER]** name (9 bodies + 1 item); decide the rarity-naming scheme.
- Redial any first-draft number on sight — nothing here is sacred.
- Boss + court designs (after playing this set to the boss node).
