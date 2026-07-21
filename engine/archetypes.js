// Balance-facing taxonomy for every wearable body.
//
// `role` is mutually exclusive and answers how the body contributes in combat.
// `archetype` is mutually exclusive and answers what kind of play pattern it asks for.
// `tags` are intentionally overlapping secondary identities used for roster-gap audits.
const profile = (role, archetype, ...tags) => Object.freeze({
  role,
  archetype,
  tags: Object.freeze(tags),
});

export const BODY_ARCHETYPES = Object.freeze({
  frugal:            profile("Summoner", "Summon / Board", "summon", "aggro", "scaling"),
  leverage:          profile("Summoner", "Summon / Board", "summon", "tempo", "scaling"),
  hedge:             profile("Summoner", "Summon / Board", "summon", "tempo", "scaling"),
  bonelord:          profile("Summoner", "Summon / Board", "summon", "scaling"),
  affluenceAnubis:   profile("Summoner", "Summon / Board", "summon", "scaling"),
  timeshareTyrant:   profile("Summoner", "Summon / Board", "summon", "tempo", "scaling", "sustain", "defense", "team-support"),

  compound:          profile("Caster", "Economy / Tempo", "tempo", "burst"),
  ratBaron:          profile("Caster", "Economy / Tempo", "tempo", "cost"),
  killionaire:       profile("Caster", "Economy / Tempo", "tempo", "burst"),
  auditAngel:        profile("Caster", "Economy / Tempo", "tempo"),
  pyramidHead:       profile("Caster", "Economy / Tempo", "tempo", "cost", "burst"),
  pennyPixie:        profile("Caster", "Economy / Tempo", "tempo", "cost"),
  econElemental:     profile("Caster", "Economy / Tempo", "tempo"),
  moneymancer:       profile("Caster", "Economy / Tempo", "tempo", "cost"),
  callingCaltist:    profile("Caster", "Economy / Tempo", "cost", "burst", "sustain"),
  salesSage:         profile("Caster", "Economy / Tempo", "cost", "tempo"),

  discountDuel:      profile("Attacker", "Scaling / Carry", "scaling", "burst"),
  pyramidRogue:      profile("Attacker", "Scaling / Carry", "scaling"),
  heavyHand:         profile("Attacker", "Scaling / Carry", "scaling", "defense"),
  bribedBishop:      profile("Support", "Scaling / Carry", "scaling", "sustain", "defense"),
  debtDragon:        profile("Attacker", "Scaling / Carry", "tempo", "scaling", "burst"),
  neptune:           profile("Caster", "Scaling / Carry", "cost", "burst"),

  ratTrader:         profile("Support", "Sustain / Fortify", "sustain"),
  rentier:           profile("Support", "Sustain / Fortify", "sustain"),
  juggernaut:        profile("Defender", "Sustain / Fortify", "defense"),
  chequeCherub:      profile("Support", "Sustain / Fortify", "sustain", "defense", "team-support"),
  wanderCastle:      profile("Defender", "Sustain / Fortify", "defense"),
  gdpGiant:           profile("Defender", "Sustain / Fortify", "defense", "cost", "tempo"),
  hedgefundKnight:    profile("Defender", "Sustain / Fortify", "defense", "scaling"),
  sphinx:            profile("Support", "Sustain / Fortify", "sustain", "defense", "aoe"),
  shortscerer:       profile("Defender", "Sustain / Fortify", "defense", "cost"),

  quakeCap:          profile("Attacker", "Pressure / Control", "tempo", "aoe"),
  mutualMend:        profile("Attacker", "Pressure / Control", "tempo"),
  basilisk:          profile("Caster", "Pressure / Control", "tempo", "control", "aoe"),
  fundjin:           profile("Attacker", "Pressure / Control", "tempo", "burst", "aoe"),
  medusa:            profile("Caster", "Pressure / Control", "control", "scaling"),
  depressionDemon:   profile("Caster", "Pressure / Control", "control"),

  bloodfund:         profile("Attacker", "Reactive / Aggro", "aggro"),
  counterparty:      profile("Attacker", "Reactive / Aggro", "aggro", "scaling"),
  warewolf:          profile("Attacker", "Reactive / Aggro", "tempo", "burst", "defense"),
  psychicVeteran:    profile("Attacker", "Scaling / Carry", "scaling", "burst", "control"),
  onePercenterCyclops: profile("Attacker", "Economy / Tempo", "cost", "burst"),
  bankruptBarghest:  profile("Attacker", "Scaling / Carry", "scaling", "aggro"),
  recessionRevenant: profile("Attacker", "Reactive / Aggro", "aggro", "sustain", "tempo"),
  atlas:             profile("Attacker", "Reactive / Aggro", "aggro", "aoe"),
  oligarchyOoze:     profile("Attacker", "Reactive / Aggro", "aggro", "control", "burst"),
});

const countBy = (values) => Object.freeze(Object.fromEntries(
  [...new Set(values)].sort().map((value) => [value, values.filter((v) => v === value).length]),
));

export function bodyArchetypeCounts() {
  const rows = Object.values(BODY_ARCHETYPES);
  return Object.freeze({
    roles: countBy(rows.map((row) => row.role)),
    archetypes: countBy(rows.map((row) => row.archetype)),
    tags: countBy(rows.flatMap((row) => row.tags)),
  });
}
