// King Mimic — pure game logic (no networking, no I/O).
// server.js wires this to WebSockets; tests import it and drive it deterministically.
// Every function takes a `room` (plain state object) and mutates/returns plainly.

// ---------------------------------------------------------------------------
// Tunables / data
// ---------------------------------------------------------------------------
// Lanes scale with the party: LANES is the legacy default (manually-built rooms / fallback);
// the LIVE count for a room is room.laneCount, derived from the player count at enterRoom.
export const LANES = 3;
// Solo = 1 lane (pure "player owns a lane"). The documented fallback if solo plays flat is a
// floor of 2 (keeps lateral movement in solo) — flip LANE_FLOOR to 2 and nothing else changes.
export const LANE_FLOOR = 1;
// Lanes = number of players, clamped [LANE_FLOOR, 4]. BOSS_SPEC_V1: the V2 bosses are
// lane-count-agnostic by construction, so boss rooms use the party-size board like any
// other room. God rooms keep the legacy ≥3-lane testing board.
export function deriveLaneCount(room, type) {
  const players = Math.max(1, room.players?.size ?? 1);
  const base = Math.max(LANE_FLOOR, Math.min(4, players));
  return room.god ? Math.max(3, base) : base;
}
// HP knob: every body's (and the caravan's) health is scaled by this so combats last
// longer without touching damage. LIVE DEFAULT IS 1 — the doubled-HP tuning was removed
// 2026-06-10 (owner call after playtest: V2 numbers stand on their own). The knob itself
// stays as a balance dial (tests exercise it; summon tokens are always exempt). It flows
// through every combatant-creation site (spawnEnemy, wearBody) + the caravan + the
// body-display projection, so nothing desyncs.
let _hpMult = 1;
export const getHpMult = () => _hpMult;
export const setHpMult = (n) => { _hpMult = n; };
// Summon TOKENS are exempt from the knob: their HP is tuned absolutely (a rat is 1 HP at
// any pacing — owner call 2026-06-10), and doubling disposable blockers warps combat math.
export const bodyMaxHp = (b) => Math.round((b?.maxHp ?? 0) * (b?.summon ? 1 : _hpMult));
export const caravanMaxHp = () => 20 * _hpMult;

// Global COOLDOWN slow-down. Default 2× (playtest pace — everything charges half as fast so the
// action is readable). A runtime knob mirroring HP_MULT: tests pin it to 1 for canonical timings.
// Applied at every cd threshold AND the matching bar so tick-advance and display never desync.
let _cdMult = 2;
export const getCdMult = () => _cdMult;
export const setCdMult = (n) => { _cdMult = n; };
export const cdScale = () => _cdMult;
export const ROOM_SIZE = 7;
export const GOD_CD = 5;       // god-mode item cooldown (~0.5s) — spam everything for testing
// Anti-stall safety net: if the fight makes NO progress toward either outcome (no new low in
// total foe HP AND no new low in caravan HP) for this many ticks (~150s), resolve it as a loss.
// This is NOT escalation (nothing ramps) — just a guarantee that combat always terminates, even
// against a perfect heal-vs-damage equilibrium the party can't break. Far beyond any real fight.
export const STALL_LIMIT = 1500;

// Bodies = HP/atk templates. A PLAYER wears one (its HP is your HP); a FOE uses one.
// Defeat a foe and its body unlocks for the WHOLE PARTY to wear — the mimic.
// A body carries: stats (maxHp/atk/cd) + an optional single `passive` (trigger → ops)
// + `ante` (its cost toward a room's required ante). Items add ante on top.
export const BODIES = {
  rookie:      { name: "Rookie Mimic", maxHp: 8, phys: 1, mag: 0, cd: 0, color: "#9ad", spawn: false },
  // ===== SUMMON TOKENS — never adoptable, never in any pool; they only enter via summon
  // effects. Rats are the EXCEPTION to "no innate swing": a built-in every-2s attack.
  // Aura tokens (V2 §4.2) carry `aura: { dmgBonus?, dmgReduce? }` — lane-scoped, live while
  // the token stands, fully symmetric (a foe Totem protects foes). =====
  rat:         { name: "Rat", maxHp: 1, phys: 1, mag: 0, cd: 0, color: "#c9a98c", spawn: false, summon: true, ante: 0,
                 passiveText: "Attacks for 1 every 2s.",
                 passive: [{ every: 20, ops: [{ do: "attack" }] }] },
  largeRat:    { name: "Large Rat", maxHp: 3, phys: 2, mag: 0, cd: 0, color: "#a98c6a", spawn: false, summon: true, ante: 0,
                 passiveText: "Attacks for 2 every 2s.",
                 passive: [{ every: 20, ops: [{ do: "attack" }] }] },
  totem:       { name: "Totem", maxHp: 3, phys: 0, mag: 0, cd: 0, color: "#7fb08a", spawn: false, summon: true, ante: 0,
                 aura: { dmgReduce: 1 },
                 passiveText: "Allies in its lane take 1 less damage while it stands." },
  flag:        { name: "Flag", maxHp: 3, phys: 0, mag: 0, cd: 0, color: "#e08a8a", spawn: false, summon: true, ante: 0,
                 aura: { dmgBonus: 1 },
                 passiveText: "Allies in its lane deal +1 damage while it stands." },
  knight:      { name: "Hedgefund Knight", maxHp: 6, phys: 1, mag: 0, cd: 0, color: "#d8c050", spawn: false, summon: true, ante: 0,
                 aura: { dmgBonus: 1, dmgReduce: 1 },
                 passiveText: "Attacks every 2s; allies in its lane deal +1 and take 1 less while it stands.",
                 passive: [{ every: 20, ops: [{ do: "attack" }] }] },

  // ===== BOSSES (BOSS_SPEC_V1, owner-dictated 2026-06-11) — the V2 floor-enders. =====
  // `maxHp` here is the PER-BUDGET-UNIT base: a live boss spawns with maxHp × players ×
  // floor (bossBudget). Mechanics do NOT live in `passive` op-trees — each boss gets
  // spawn-time `clocks` (see spawnBoss/fireBossClock) so every knob can ride the budget.
  // `backline:true` = the caravan-mirror: the boss spans ALL lanes behind the foe rows
  // (room.boss, not a lane entry); melee reaches it only when the attacker's lane is clear.
  hydra: {
    name: "Hyper-Inflation Hydra", maxHp: 20, atk: 0, cd: 0, color: "#5fd0a0", spawn: false, boss: true, backline: true, ante: 0,
    passiveText: "Hurt it and a head re-walls that lane. Its head clock spawns MORE heads every time — end this fast.",
  },
  litigationLich: {
    name: "Litigation Lich", maxHp: 14, atk: 0, cd: 0, color: "#9a7fc0", spawn: false, boss: true, backline: true, ante: 0,
    passiveText: "Alternates stances: OBJECTION caps every hit at 1; recess only softens by 1 — burst the weak window. Summons bone wizards.",
  },
  djinn: {
    name: "Djinn of Deals", maxHp: 18, atk: 0, cd: 0, color: "#d0904f", spawn: false, boss: true, ante: 0,
    passiveText: "Relocates between lanes and scorches every lane. Every 3rd item the party uses, it animates one of its own against you.",
  },
  kraken: {
    name: "Kleptomaniac Kraken", maxHp: 18, atk: 0, cd: 0, color: "#5f8fd0", spawn: false, boss: true, backline: true, ante: 0,
    passiveText: "Steals your items and turns them on you — kill the stolen item to take it back. Hides behind a wall of tentacles.",
  },
  // ===== BOSS SUMMON TOKENS — summon-class (HP-knob exempt, never adoptable). =====
  // Heads are "like rats — 1/1s" (owner ruling 2026-06-11): the rat's bite on the rat's clock.
  hydraHead:  { name: "Hydra Head", maxHp: 1, phys: 1, mag: 0, cd: 0, color: "#5fd0a0", spawn: false, summon: true, ante: 0,
                passiveText: "Bites for 1 every 2s. Re-walls its lane.",
                passive: [{ every: 20, ops: [{ do: "attack" }] }] },
  boneWizard: { name: "Bone Wizard", maxHp: 3, phys: 0, mag: 0, cd: 0, color: "#cfd0e8", spawn: false, summon: true, ante: 0,
                passiveText: "Blasts EVERYONE in its lane for 1 every 6s.",
                passive: [{ every: 60, ops: [{ do: "deal", amount: 1, target: "lane" }] }] },
  tentacle:   { name: "Tentacle", maxHp: 1, phys: 0, mag: 0, cd: 0, color: "#7f6fb0", spawn: false, summon: true, ante: 0,
                passiveText: "A wall of suckers — it only blocks." },
  // An ITEM-ENTITY chassis (Djinn summons / Kraken steals): spawnItemEntity overrides its
  // name + HP (= the item's gold cost) per instance; the wrapped item rides `equipment`
  // and fires through the ordinary foe item machinery (resolver, threat bars, the lot).
  itemEntity: { name: "Animated Item", maxHp: 1, phys: 0, mag: 0, cd: 0, color: "#d8b66a", spawn: false, summon: true, ante: 0,
                passiveText: "A possessed item — kill it to silence it." },
  kingMimic: {
    name: "King Mimic", maxHp: 50, atk: 0, cd: 60, color: "#e6c34a", spawn: false, boss: true, ante: 0,
    ward: true, // cannot be damaged while ANY other foe is on the board — clear the court first
    passiveText: "Enters flanked by three nemeses. Cannot be harmed while any other foe lives. Hourglass: summons a fresh nemesis.",
    passive: [
      { on: "enter",     ops: [{ do: "summonArmed", body: "killionaire", gear: ["fire"],  count: 1, lane: 0 },
                                { do: "summonArmed", body: "minotaur",    gear: ["gavel"], count: 1, lane: 1 },
                                { do: "summonArmed", body: "phoenix",     gear: ["bow"],   count: 1, lane: 2 }] },
      { on: "hourglass", ops: [{ do: "summonArmed", body: "vampire", gear: ["bow"], count: 1 }] },
    ],
  },

  // Player-class bodies (chosen at the start; never spawned as foes). The atk/cd
  // pair IS the archetype dial: warrior hits hard and steady, rogue fast, mage slow.
  warrior:     { name: "Warrior", maxHp: 12, phys: 2, mag: 0, cd: 40, color: "#e0885a", spawn: false, affinity: "physical" },
  rogue:       { name: "Rogue",   maxHp: 7,  phys: 1, mag: 0, cd: 18, color: "#6fcf97", spawn: false, affinity: "physical", itemCdMul: 0.7 },  // tempo: spammer — all cooldowns shorter
  mage:        { name: "Mage",    maxHp: 6,  phys: 0, mag: 2, cd: 60, color: "#8a9cff", spawn: false, affinity: "magical", itemCdCap: 45 },   // tempo: heavy — caps big spells (Fire/Lightning)
  cleric:      { name: "Cleric",  maxHp: 9,  phys: 0, mag: 1, cd: 45, color: "#f1d06a", spawn: false, affinity: "magical" },
};
export const STARTER_BODY = "rookie";

// ===========================================================================
// THE FIRST SET (SLICE_SPEC_V2 §1–2) — 36 bodies GENERATED at boot from 12 mechanic
// templates × the 3-row rarity table. ONE source of truth: edit a template (or a table
// row) and all three rarities follow — no hand-copied 36-entry list.
// Keys: common = the template key (royalRat); uncommon/rare add a U/R suffix (royalRatU,
// royalRatR). Naming uses the [PLACEHOLDER] corporate-seniority scheme (Junior X / X /
// Senior X) — owner decides the real scheme; swap `prefix` below and nothing else moves.
// ===========================================================================
export const RARITY_TABLE = [
  { suffix: "",  prefix: "Junior ", hpMul: 1,   step: 0, ante: 1, rarity: "common" },
  { suffix: "U", prefix: "",        hpMul: 1.6, step: 1, ante: 2, rarity: "uncommon" },
  { suffix: "R", prefix: "Senior ", hpMul: 2.4, step: 2, ante: 3, rarity: "rare" },
];
// Per-rarity passive magnitudes (spec §2). Binary passives (echo, cross-school) can't
// step — those bodies scale statline-only (HP × table, Power + step), flagged `stepless`
// where the spec overrides the step (Runeblade's growth lives in its PHYS, not its mag).
const SUMMON_N = [1, 2, 3], SCHOOL_CD = [0.75, 0.6, 0.5];
// Summoners run a VISIBLE summon clock (every 4s) that their signature trigger SPEEDS UP
// by 1s a pop (owner call 2026-06-10: "its own charge bar, reduced ~1s every trigger") —
// the generalized Atlas mechanic (`accel`), so the bar is the identity and the trigger is
// the tempo knob. Magnitude still scales per rarity (1/2/3 rats per fire).
const ratText = (n, when) =>
  `Summons ${n} rat${n > 1 ? "s" : ""} every 4s; ${when} shaves 1s off the clock.`;
export const BODY_TEMPLATES = [
  // --- Summoners (mag affinity, low HP): a rat clock their trigger accelerates ----------
  { key: "royalRat", name: "Royal Rat", hp: 5, school: "mag", color: "#b8a3c9",
    make: (i) => ({ passiveText: ratText(SUMMON_N[i], "each staff item it resolves"),
                    accel: { on: "staff", amount: 10 },
                    passive: [{ every: 40, ops: [{ do: "summon", body: "rat", count: SUMMON_N[i] }] }] }) },
  { key: "fatCat", name: "Fat Cat", hp: 5, school: "mag", color: "#f0b070",
    make: (i) => ({ passiveText: ratText(SUMMON_N[i], "every hit it takes"),
                    accel: { on: "damaged", amount: 10 },
                    passive: [{ every: 40, ops: [{ do: "summon", body: "rat", count: SUMMON_N[i] }] }] }) },
  { key: "paidPiper", name: "Paid Piper", hp: 5, school: "mag", color: "#c9b86a",
    make: (i) => ({ passiveText: ratText(SUMMON_N[i], "each sword item it resolves"),
                    accel: { on: "sword", amount: 10 },
                    passive: [{ every: 40, ops: [{ do: "summon", body: "rat", count: SUMMON_N[i] }] }] }) },
  // --- Attackers (phys affinity, mid HP) ------------------------------------------------
  { key: "centaur", name: "Centless Centaur", hp: 7, school: "phys", color: "#d8b46a",
    make: () => ({ echo: "physical", passiveText: "Echo: its sword items resolve twice." }) },
  { key: "pixie", name: "Penny-Pinching Pixie", hp: 7, school: "phys", color: "#7f7",
    make: (i) => ({ swordCdMul: SCHOOL_CD[i], passiveText: `Its sword items charge ${Math.round((1 - SCHOOL_CD[i]) * 100)}% faster.` }) },
  { key: "vampire", name: "Vengeful Vampire", hp: 7, school: "phys", basePow: 2, color: "#b85c6e",
    make: (i) => ({ passiveText: `Heals ${i + 1} after each sword item it resolves.`,
                    passive: [{ on: "sword", ops: [{ do: "healSelf", amount: i + 1 }] }] }) },
  // --- Casters (mag affinity, low HP) ----------------------------------------------------
  { key: "mouse", name: "Malovelant Mouse", hp: 5, school: "mag", color: "#9a8ca8",
    make: () => ({ echo: "magical", passiveText: "Echo: its staff items resolve twice." }) },
  { key: "lizardWizard", name: "Lizard Wizard", hp: 5, school: "mag", color: "#4f9f7f",
    make: (i) => ({ staffCdMul: SCHOOL_CD[i], passiveText: `Its staff items charge ${Math.round((1 - SCHOOL_CD[i]) * 100)}% faster.` }) },
  { key: "runeblade", name: "Rent-Seeking Runeblade", hp: 5, school: "mag", stepless: true, color: "#357f5f",
    make: (i) => ({ phys: i + 1, swordFeedsStaff: true,
                    passiveText: "Cross-school: its staff items also add its sword Power." }) },
  // --- Tanks (phys affinity, high HP) -----------------------------------------------------
  { key: "minotaur", name: "Market-Crash Minotaur", hp: 9, school: "phys", color: "#b09030",
    make: () => ({ passiveText: "Counter: swords the front enemy when it takes damage.",
                   passive: [{ on: "damaged", ops: [{ do: "schoolStrike", school: "physical", target: "front" }] }] }) },
  { key: "wageslave", name: "Weary Wageslave", hp: 9, school: "phys", color: "#a0a0b0",
    make: (i) => ({ passiveText: `Heals ${[2, 3, 5][i]} every ${[3, 2.5, 2][i]}s.`,
                    passive: [{ every: [30, 25, 20][i], ops: [{ do: "healSelf", amount: [2, 3, 5][i] }] }] }) },
  { key: "atlas", name: "Atlas, Shrugging", hp: 9, school: "phys", color: "#8a93a3",
    make: (i) => ({ accel: { on: "damaged", amount: 10 },
                    passiveText: `Every 4s: gains +${i + 1} attack. Taking a hit shaves 1s off the clock.`,
                    passive: [{ every: 40, ops: [{ do: "counter", amount: i + 1 }] }] }) },
];
for (const tpl of BODY_TEMPLATES) {
  RARITY_TABLE.forEach((r, i) => {
    const extra = tpl.make(i);
    const pow = (tpl.basePow ?? 1) + (tpl.stepless ? 0 : r.step);
    BODIES[tpl.key + r.suffix] = {
      name: r.prefix + tpl.name,
      maxHp: Math.round(tpl.hp * r.hpMul),
      phys: tpl.school === "phys" ? pow : 0,
      mag: tpl.school === "mag" ? pow : 0,
      cd: 0, color: tpl.color, spawn: true, ante: r.ante, rarity: r.rarity, family: tpl.key,
      ...extra, // template overrides (Runeblade's phys, echo/CDR flags, passives) win
    };
  });
}
export const SET_COMMONS = BODY_TEMPLATES.map((t) => t.key);

// THE DRAFT WHEEL — the live run entry. A shared wheel of COMMON bodies (spec §1: the
// wheel draws commons only), each pre-bundled with 3 random common items. Players lock one
// bundle EXCLUSIVELY (no two on the same one); the chosen body is the chassis (HP/affinity/
// tempo) and the 3 items are the starter kit. chooseClass remains the back-compat path.
export const DRAFT_BODIES = [...SET_COMMONS];
export const DRAFT_WHEEL_MIN = 6;          // ≥ this many bundles, and always ≥ players + 2

// Player classes: a body (the key doubles as its bodyKey) + a 3-item starter kit.
export const CLASSES = {
  warrior: { name: "Warrior", blurb: "Sturdy front-liner — heavy melee and shields.",      kit: ["blade", "bigShield", "hatchet"] },
  rogue:   { name: "Rogue",   blurb: "Fragile and fast — pick targets and disrupt.",        kit: ["blade", "bow", "scaryKnife"] },
  mage:    { name: "Mage",    blurb: "Ranged control — big targeted fire and lane lightning.", kit: ["fire", "lightning", "wind"] },
  cleric:  { name: "Cleric",  blurb: "Resilient support — heal, shield, and chip damage.",   kit: ["heal", "bigShield", "lightning"] },
};

// ITEMS — the whole playable vocabulary. Self-contained: each is {name, cd, text, ops}.
// target: "front" = front foe in your lane · "pick" = your aimed foe (any lane; falls back
// to front of your lane) · "lane" = every foe in your lane. cd = ticks to recharge.
// `ante` = the item's contribution to a room's ante when a foe holds it.
// `fragile` = usable only ONCE per fight, then spent (resets each room).
// `type` = damage school. "physical" items scale with the wielder's Physical Power,
// "magical" with Magical Power. Utility items (heal/shield/wind/ratNest) are untyped.
// `color` is the item's identity hue — used everywhere it's shown (the foe threat bars and
// the player hotbar) so a given item reads as the SAME color on a foe and in your kit.
// `passive` (no `ops`) = a WORN item that's never pressed; its effect is always-on. Aegis
// grants `dr` (flat damage reduction) to whoever carries it — player or foe, symmetric.
export const KIT = {
  // ===== THE FIRST-SET KIT (SLICE_SPEC_V2 §3) — 12 common / 8 uncommon / 4 rare. cd in
  // TICKS (seconds×10). type:physical = sword icon, magical = staff icon. "+N" is the item's
  // base; the wielder's sword/staff Power adds on top. `ante` doubles as the rarity's value
  // weight (1/2/3) for loot, shop pricing, and foe-gear treasure. =====
  // --- COMMON (12) -----------------------------------------------------------------------
  blade:        { name: "Sword",        cd: 20, ante: 1, rarity: "common", type: "physical", color: "#cfd8e2", text: "Deal sword + 1 to the front foe in your lane.",      ops: [{ do: "deal", amount: 1, target: "front" }] },
  bow:          { name: "Bow",          cd: 25, ante: 1, rarity: "common", type: "physical", ranged: true, color: "#a8e06a", text: "Deal sword + 1 to your aimed foe.",      ops: [{ do: "deal", amount: 1, target: "pick" }] },
  hatchet:      { name: "Hatchet",      cd: 50, ante: 1, rarity: "common", type: "physical", color: "#d89060", text: "Deal sword + 4 to the front foe.",                   ops: [{ do: "deal", amount: 4, target: "front" }] },
  fire:         { name: "Fireball",     cd: 45, ante: 1, rarity: "common", type: "magical",  color: "#ff7a3c", text: "Deal staff + 3 to your aimed foe.",                  ops: [{ do: "deal", amount: 3, target: "pick" }] },
  lightning:    { name: "Lightning",    cd: 50, ante: 1, rarity: "common", type: "magical",  color: "#5fd0ff", text: "Deal staff + 2 to every foe in your lane.",          ops: [{ do: "deal", amount: 2, target: "lane" }] },
  wind:         { name: "Wind",         cd: 30, ante: 1, rarity: "common", type: "magical",  color: "#bcd8ff", text: "Deal staff + 1 to your aimed foe and push it to the back of its lane.", ops: [{ do: "deal", amount: 1, target: "pick" }, { do: "pushBack", target: "pick" }] },
  smallShield:  { name: "Small Shield", cd: 20, ante: 1, rarity: "common", color: "#6cd6ff", text: "Gain a 1-point shield buffer.",                                        ops: [{ do: "shield", amount: 1 }] },
  heal:         { name: "Heal",         cd: 30, ante: 1, rarity: "common", type: "magical",  color: "#74e69a", text: "Heal staff + 2 to your ally-target (or the most-hurt friendly in your lane).", ops: [{ do: "healAlly", amount: 2 }] },
  bigShield:    { name: "Big Shield",   cd: 45, ante: 1, rarity: "common", color: "#6cd6ff", text: "Gain a 3-point shield buffer.",                                        ops: [{ do: "shield", amount: 3 }] },
  summonRat:    { name: "Rat",          cd: 35, ante: 1, rarity: "common", type: "magical",  color: "#c9a98c", text: "Summon a rat in your lane.",                          ops: [{ do: "summon", body: "rat", count: 1 }] },
  gangUp:       { name: "Gang Up",      cd: 30, ante: 1, rarity: "common", type: "physical", color: "#e0c060", text: "Deal sword + 1, +1 per other ally in your lane, to the front foe.", ops: [{ do: "deal", amount: 1, target: "front", perAlly: 1 }] },
  summonBigRat: { name: "Summon Large Rat", cd: 55, ante: 1, rarity: "common", type: "magical", color: "#a98c6a", text: "Summon a large rat in your lane.",                 ops: [{ do: "summon", body: "largeRat", count: 1 }] },
  // --- UNCOMMON (8) ----------------------------------------------------------------------
  scaryKnife:   { name: "Scary Knife",  cd: 12, ante: 2, rarity: "uncommon", type: "physical", color: "#e7e0c0", text: "Deal sword to the front foe (very fast).",          ops: [{ do: "deal", amount: 0, target: "front" }] },
  spear:        { name: "Spear",        cd: 45, ante: 2, rarity: "uncommon", type: "physical", color: "#c0b8a0", text: "Deal sword + 3 to the front TWO foes in your lane.", ops: [{ do: "deal", amount: 3, target: "front2" }] },
  magicMissile: { name: "Magic Missile", cd: 15, ante: 2, rarity: "uncommon", type: "magical", color: "#9b8cff", text: "Deal staff to your aimed foe (very fast).",          ops: [{ do: "deal", amount: 0, target: "pick" }] },
  darkness:     { name: "Darkness",     cd: 50, ante: 2, rarity: "uncommon", type: "magical",  color: "#8060a8", text: "Deal staff + 3 to your aimed foe; heal yourself the damage dealt.", ops: [{ do: "deal", amount: 3, target: "pick", lifesteal: true }] },
  totem:        { name: "Totem",        cd: 50, ante: 2, rarity: "uncommon", type: "magical",  color: "#7fb08a", text: "Summon a totem: allies in its lane take 1 less damage while it stands.", ops: [{ do: "summon", body: "totem", count: 1 }] },
  flag:         { name: "Flag",         cd: 50, ante: 2, rarity: "uncommon", type: "physical", color: "#e08a8a", text: "Summon a flag: allies in its lane deal +1 damage while it stands.", ops: [{ do: "summon", body: "flag", count: 1 }] },
  trustyShield: { name: "Trusty Shield", cd: 35, ante: 2, rarity: "uncommon", color: "#6cd6ff", startCharged: true, text: "Gain a 2-point shield buffer. Starts fully charged each fight.", ops: [{ do: "shield", amount: 2 }] },
  spikes:       { name: "Spikes",       cd: 40, ante: 2, rarity: "uncommon", color: "#b0b8c0", text: "This fight: attackers that strike you take 1 (thorns).",              ops: [{ do: "thorns", amount: 1 }] },
  // --- RARE (4) --------------------------------------------------------------------------
  crossbow:     { name: "Repeating Crossbow", cd: 10, ante: 4, rarity: "rare", type: "physical", ranged: true, color: "#c8d870", text: "Deal sword to your aimed foe (relentless).", ops: [{ do: "deal", amount: 0, target: "pick" }] },
  blizzard:     { name: "Blizzard",     cd: 55, ante: 4, rarity: "rare", type: "magical", color: "#a8e0ff", text: "Deal staff + 2 to every foe in your lane and drain 10 charge from each of their clocks.", ops: [{ do: "deal", amount: 2, target: "lane" }, { do: "delay", amount: 10, target: "lane" }] },
  knightBanner: { name: "Hedgefund Knight", cd: 60, ante: 4, rarity: "rare", type: "physical", color: "#d8c050", text: "Summon a knight: attacks every 2s; allies in its lane deal +1 and take 1 less while it stands.", ops: [{ do: "summon", body: "knight", count: 1 }] },
  // Worn passive — never pressed, always on (no ops). The Aegis dr pattern.
  slimeCrown:   { name: "Liquid Metal King Slime Crown", cd: 0, ante: 4, rarity: "rare", color: "#b6a8ff", passive: { dr: 1 }, text: "Worn: take 1 less from every hit." },
};
// An item that's worn for an ongoing effect rather than pressed (no active ops). The kit/UI
// treats these as always-on badges, not cooldown buttons.
export const isPassiveItem = (key) => !!KIT[key]?.passive && !(KIT[key]?.ops?.length);
// RANGED vs MELEE (owner ruling 2026-06-10): staff items are ranged by default, sword items
// melee by default; an explicit `ranged` flag overrides either way (Bow / Repeating Crossbow
// are ranged physicals). The reticle only ever drives ranged items; melee always strikes the
// front of YOUR lane. New items inherit the right behavior from their school automatically.
export const isRanged = (key) => KIT[key]?.ranged ?? (KIT[key]?.type === "magical");
export const KIT_POOL = Object.keys(KIT);
export const DRAFT_PICKS = 3;   // how many items each player drafts at the start of a run
export const STOCK_MAX = 12;        // max foes you can stock into a room
// Each loot item is worth Treasure points = its ante (its weight). Under the mirrored-income
// model this value is both (a) part of the room value V credited to every wallet on clear and
// (b) the COST to claim that item (claimLoot) — so grabbing gear converts your own income into
// the item, while a player who skips it keeps the cash. Equal earnings, divergent holdings.
export const itemTreasure = (key) => (KIT[key]?.ante ?? 1);

// THE ANTE FORMULA (owner-set 2026-06-10) — a foe option's ante = its body + its items:
//   body:  tier 1 = 1 · tier 2 = 3 · tier 3 = 5      (keyed by the body's TIER, `BODIES.ante`)
//   items: common = 1 · uncommon = 2 · rare = 4      (an item's `ante`, doubling as its value)
// Up to two items each → the floor option is a T1 body + a usable T1 item (2); the ceiling
// is a T3 body with two rares (5+4+4 = 13). NOTE: a body's TIER (`BODIES.ante`, drives the
// tier-unlock economy) and its ANTE WEIGHT (this table, drives difficulty + income) are
// separate dials on purpose.
export const BODY_ANTE = { 1: 1, 2: 3, 3: 5 };
export const bodyAnteOf = (f) => BODY_ANTE[BODIES[f.bodyKey]?.ante ?? 0] ?? 0;
// Combined ante of a foe (body weight + its gear) — the stocking currency.
export const anteOfFoe = (f) => bodyAnteOf(f) + (f.gear ?? []).reduce((s, g) => s + (KIT[g]?.ante ?? 0), 0);
// What a foe DROPS = its full ante (owner 2026-06-11) — the same ⚖ number the palette
// shows, body weight included. It used to be its gear's value alone, which understated
// every foe's worth by its body weight on the "drops in loot" line.
export const foeLootValue = (f) => anteOfFoe(f);
export const anteCurrent = (room) => (room.draftedFoes ?? []).reduce((s, f) => s + anteOfFoe(f), 0);

// 1:1 SPLIT-INCOME economy (owner 2026-06-10): the foes PAY THEIR ANTE. A cleared room's
// value V = exactly the total ante that was stocked into it (bodies 1/3/5 + items 1/2/4 —
// the same big gold numbers from the stock screen, no separate bookkeeping). V is SPLIT
// across the party as fairly as possible (equal shares; remainder coins to the lowest
// TOTAL EARNINGS first — not the lightest wallet). Treasure then buys the rewards on offer — this room's loot, the shop, body
// tiers, kit slots — the same sinks as ever ("and future rewards, like the current system").
export const bodyValue = (f) => bodyAnteOf(f);                  // a body pays its ante weight
export function roomValue(room) {
  return (room.draftedFoes ?? []).reduce((s, f) => s + anteOfFoe(f), 0);
}

// Kit SPACE is a Treasure spectrum. Each player starts with KIT_SLOTS_BASE slots and can
// buy up to MAX_KIT with Treasure; each extra slot costs more than the last. This is the
// "kit upgrades for more space" sink — a second place the shared purse competes for spend.
export const MAX_KIT = 8;            // hard ceiling on a kit's size
export const KIT_SLOTS_BASE = 3;     // slots a fresh player carries (draft bundle is 3 → full; "level up" grows it)
export const KIT_SLOT_COST_MUL = 4;  // Treasure for the next slot = (slots bought so far + 1) × this
// Cost to grow FROM `slots` to `slots+1`. null once you've hit the ceiling.
export const kitSlotCost = (slots) =>
  slots >= MAX_KIT ? null : ((slots | 0) - KIT_SLOTS_BASE + 1) * KIT_SLOT_COST_MUL;

// SHOP nodes — spend Treasure on CHOSEN items (vs. random loot). A shelf of items at
// a markup over their loot value, so skipping loot to bank Treasure and buying what you
// actually want is a real loop. Reroll the shelf for a flat fee.
export const SHOP_COST_MUL = 3;     // a ware costs itemTreasure(key) × this
export const SHOP_WARES = 5;        // items on the shelf at once
export const SHOP_REROLL_COST = 3;  // Treasure to reroll the whole shelf
export const shopPrice = (key) => itemTreasure(key) * SHOP_COST_MUL;
// Roll a fresh shelf: SHOP_WARES distinct items, RARITY-WEIGHTED (commons frequent,
// rares scarce — the spec's "weighting/pricing knob"; pricing rides on ante×SHOP_COST_MUL).
// Determinism-friendly: tests can set room.shop.wares directly.
const SHOP_RARITY_WEIGHT = { common: 4, uncommon: 2, rare: 1 };
export function rollShopWares() {
  const pool = [...KIT_POOL];
  const wares = [];
  while (wares.length < SHOP_WARES && pool.length) {
    const total = pool.reduce((s, k) => s + (SHOP_RARITY_WEIGHT[KIT[k].rarity] ?? 1), 0);
    let roll = Math.random() * total, pick = pool[pool.length - 1];
    for (const k of pool) { roll -= SHOP_RARITY_WEIGHT[KIT[k].rarity] ?? 1; if (roll <= 0) { pick = k; break; } }
    pool.splice(pool.indexOf(pick), 1);
    wares.push({ key: pick, cost: shopPrice(pick) });
  }
  return wares;
}

// Room enchantments — every room carries one. It makes the fight nastier AND sweetens
// the reward (extra loot picks, sometimes a bonus item). Determinism-friendly: tests set
// room.enchant directly; live play picks at random.
// The 6 slice rooms (SLICE_SPEC.md). Per-foe modifiers apply at spawn; the two `roomTimer`
// rooms drive a GLOBAL room-level cooldown bar (Acid Rain / Rat Colony).
export const ENCHANTS = [
  { key: "hasted",     name: "Hasted",     text: "Foes act 20% faster.",                          foeCdMul: 0.8 },
  { key: "toughened",  name: "Toughened",  text: "Foes have 20% more HP.",                         foeHpMul: 1.2 },
  { key: "aggressive", name: "Aggressive", text: "Foes deal 20% more damage.",                     foeDmgMul: 1.2 },
  // "Extra Guys" (+20% rank-and-file) retired 2026-06-10 with the baseline itself — count
  // is per-player picks now, so a count multiplier had nothing left to multiply.
  { key: "acidRain",   name: "Acid Rain",  text: "Every 6s, acid hits each hero and summon for 1.", roomTimer: { kind: "acid", cd: 60, amount: 1 } },
  { key: "ratColony",  name: "Rat Colony", text: "Every 3s, a rat joins the enemy in a random lane.", roomTimer: { kind: "ratSpawn", cd: 30 } },
];
export const pickEnchant = () => ENCHANTS[Math.floor(Math.random() * ENCHANTS.length)];
export function applyEnchantToFoe(foe, en) {
  if (!en) return;
  if (en.foeHpMul) { foe.maxHp = Math.max(1, Math.round(foe.maxHp * en.foeHpMul)); foe.hp = foe.maxHp; }
  if (en.foeDmgMul) foe.dmgMul = en.foeDmgMul;     // Aggressive: scales the foe's outgoing damage
  if (en.foeCdMul) foe.cdMul = en.foeCdMul;        // Hasted: shortens its clocks
}
// A room's global cooldown bars (Acid Rain / Rat Colony). [] for the per-foe rooms.
export function roomTimersFor(en) {
  return en?.roomTimer ? [{ ...en.roomTimer, cd: Math.round(en.roomTimer.cd * cdScale()), charge: 0 }] : [];
}

// Foe DRAFT POOL: a random foe body + a random (threatening) item — plug and play. Both
// the body and the item add to the foe's ante, so each floor's offers feel different.
// Summons (rats) are never offered; they only enter via summon effects. Heal is excluded
// (a baseline foe healing itself is a stall, not a threat); Wind is excluded because the
// shove has no foe-side meaning yet (foes don't move players) — it'd silently degrade to a
// weak deal. Shields are fine as a SECOND item (the first slot guarantees a threat).
export const PALETTE_SLOTS = 3; // how many foe choices you see at once
// The greedy pool spans ALL rarities (spec §1: uncommon/rare live in the foe pool —
// felling one reaches its tier). Summon tokens and bosses never appear.
const FOE_BODIES = Object.keys(BODIES).filter((k) => BODIES[k].spawn && !BODIES[k].summon && !BODIES[k].boss);
// Item rarity drives the loot loop:
//  • COMMON — basic standardized attacks (low ante → low Treasure). Baseline rank-and-file
//    carry these; you'll mostly SKIP them and let them convert to Treasure on the way out.
//  • SPICY — the worth-claiming items. Greedy picks carry these.
const COMMON_ITEMS = ["blade", "bow", "hatchet"];
// SPICY = the worth-claiming damaging items; a greedy foe's FIRST slot always comes from here
// so it always threatens (no toothless foe → no deadlock / live-threat break).
// Player-only items (never on foes): wind (push-back has no foe-side meaning), heal (a
// baseline self-healer is a stall, not a threat), blizzard (the charge-drain op is a no-op
// against players' click-to-fire items).
const SPICY_ITEMS = ["fire", "lightning", "scaryKnife", "magicMissile", "darkness", "spear", "crossbow", "gangUp"];
const FOE_SPICY_ITEMS = SPICY_ITEMS.filter((k) => !KIT[k].fragile); // (none fragile in the slice)
// A foe's SECOND slot grab-bag: another attack, a defensive, a worn passive (Crown), or a
// summon/aura token (a foe Totem protects foes — symmetric). First slot stays damaging.
const FOE_SECOND_ITEMS = [...FOE_SPICY_ITEMS, "smallShield", "bigShield", "trustyShield", "slimeCrown", "totem", "flag", "summonRat", "blade", "bow"];
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
// Can this body actually HURT someone with this item? A deal op with base amount 0 rides
// entirely on the matching school's Power — a 0-sword summoner wielding a Scary Knife is a
// DUD that pays out like a threat (owner exploit 2026-06-10: a room full of duds = free
// money). Every gear roll filters on this; no foe ever spawns unable to deal damage.
export function itemThreatens(bodyKey, itemKey) {
  const it = KIT[itemKey];
  if (!it?.ops) return false;
  const b = BODIES[bodyKey] ?? {};
  const pow = it.type === "physical" ? (b.phys ?? 0)
            : it.type === "magical" ? (b.mag ?? 0) + (b.swordFeedsStaff ? (b.phys ?? 0) : 0)
            : 0;
  return it.ops.some((o) => o.do === "deal" && (o.amount ?? 0) + pow > 0);
}
// Roll a foe's gear: ONE guaranteed item this BODY can deal damage with + an optional
// distinct second item (incl. worn passives/tokens). chanceSecond tunes how often.
export function rollFoeGear(bodyKey, primary, chanceSecond = 0.45) {
  const usable = primary.filter((k) => itemThreatens(bodyKey, k));
  // fall back to the flat-damage commons (amount ≥ 1 → never a dud on any body)
  const pool = usable.length ? usable : COMMON_ITEMS.filter((k) => itemThreatens(bodyKey, k));
  const gear = [pool.length ? rnd(pool) : "blade"];
  if (Math.random() < chanceSecond) {
    // the second slot is also school-checked: utility items (shields/tokens/worn) fit any
    // body, but a DAMAGE item must synergize — no knife-waving casters
    const pool2 = FOE_SECOND_ITEMS.filter((k) =>
      !(KIT[k].ops ?? []).some((o) => o.do === "deal") || itemThreatens(bodyKey, k));
    const second = rnd(pool2);
    if (second && second !== gear[0]) gear.push(second); // skip a duplicate (no redundant identical bar)
  }
  return gear;
}
export function buildFoePool() { // the stocking palette — random tiers, armed (often two items)
  return [...FOE_BODIES].sort(() => Math.random() - 0.5).map((b) => ({ bodyKey: b, gear: rollFoeGear(b, FOE_SPICY_ITEMS, 0.5) }));
}
// The palette must NEVER trap the party: at least one CHEAP option (ante ≤ 3 — a T1 body
// with a basic item) is always on offer, so a small required ante can be met without being
// forced to invite a monster. Rerolled into a random slot whenever the guarantee breaks.
export function rollCheapOption() {
  const bodyKey = rnd(SET_COMMONS);
  return { bodyKey, gear: rollFoeGear(bodyKey, COMMON_ITEMS, 0) };
}
export function ensureCheapSlot(room) {
  const pal = room.foePalette ?? [];
  if (!pal.length || pal.some((o) => anteOfFoe(o) <= 3)) return;
  pal[Math.floor(Math.random() * pal.length)] = rollCheapOption();
}

// THE STOCKING GATE (owner 2026-06-10, v2): every player invites exactly ONE foe into
// their own lane — TWO in a DOUBLE FEATURE room (the node type still keyed "elite"; the
// label changed). Per-player picks keep lanes evenly stocked (no funneling everything
// into the tank's lane) and make difficulty a personal stake: your lane, your invite.
export const picksRequiredFor = (type) => (type === "elite" ? 2 : 1);
export const playerPicks = (room, playerId) =>
  (room.draftedFoes ?? []).filter((f) => f.owner === playerId).length;
export const stockReady = (room) =>
  [...room.players.values()].every((p) => playerPicks(room, p.id) >= (room.picksRequired ?? 1));

// The boss roster (BOSS_SPEC_V1): Hydra / Litigation Lich / Djinn of Deals / Kleptomaniac
// Kraken rotate over a run's 3 boss floors. King Mimic is OUT on purpose — his body stays
// defined but he NEVER spawns until the owner adds him as the true final boss.
export const BOSS_BODIES = ["hydra", "litigationLich", "djinn", "kraken"];
// THE SCALING CONTRACT: encounter budget = partySize (1–4) × floor (1–3), xy ∈ 1..12.
// Per-player pressure scales with floor ONLY — party size scales the total. Every boss
// spends its budget on its own signature dial; thread THIS into every new knob.
export const bossBudget = (players, floor) =>
  Math.max(1, Math.min(4, players | 0 || 1)) * Math.max(1, floor | 0 || 1);
// [PLACEHOLDER] rotation: each run draws 3 DISTINCT bosses of the 4, seeded at run start
// (startDraft) so the map preview and the fight always agree within a run. A fixed
// floor→boss table would make the 4th boss unreachable.
export const drawBossRotation = () => [...BOSS_BODIES].sort(() => Math.random() - 0.5).slice(0, 3);
// Which boss guards a given floor (1-indexed) — run-seeded, deterministic within the run.
// Lazily seeds rooms that never ran startDraft (manually-built test rooms).
export function bossForFloor(room, floor = room?.floor ?? 1) {
  room.bossDraw ??= drawBossRotation();
  const n = room.bossDraw.length;
  return room.bossDraw[((floor | 0) - 1 + n * 100) % n];
}

// ---------------------------------------------------------------------------
// Rooms / level
// ---------------------------------------------------------------------------
export function newRoom(code) {
  return {
    code,
    god: (code || "").toUpperCase() === "DEMO", // playtest god mode
    players: new Map(),
    laneCount: LANES,                                 // live lane count (derived from players at enterRoom)
    lanes: Array.from({ length: LANES }, () => []),   // foes
    allies: Array.from({ length: LANES }, () => []),  // friendly summons (player side)
    unlockedBodies: new Set([STARTER_BODY]),
    // Treasure is a PER-PLAYER wallet now (player.treasure) — see the mirrored-income model
    // below. unlockedTiers is per-player too (each player buys their own bodies). The room
    // keeps no shared purse.
    lastRoomValue: 0,               // V credited to every wallet on the last room clear (display)
    shop: null,                     // at a shop node: { wares: [{key, cost}] }
    caravan: { hp: caravanMaxHp(), max: caravanMaxHp() },
    boss: null,                     // the BACK-LINE boss entity (spans all lanes); Djinn lives in a lane instead
    bossDraw: null,                 // this run's 3-of-4 boss rotation (seeded at startDraft)
    itemUses: 0,                    // party-wide item-use counter (Djinn's every-3rd trigger)
    phase: "lobby",                 // lobby | draft | stock | setup | playing | won | lost | shop
    level: null,
    levelComplete: false,
    floor: 1,                       // climbs each time you clear a boss (ante scales with it)
    enchant: null,                  // a room-wide modifier: harder fight, richer reward
    draftedFoes: [],                // the foes you stocked into this room
    foePool: [],                    // the full draft pool for this room
    foePalette: [],                 // the PALETTE_SLOTS choices currently shown
    foeNext: 0,                     // next pool index to roll into a slot
    anteRequired: 0,                // minimum ante you must stock before you can begin
    loot: [],                       // gear claimable after winning (= what the foes carried);
                                    // unclaimed drops convert to Treasure on leaving the room
    tick: 0,
    handle: null,
  };
}

// A PROCEDURAL Slay-the-Spire-style graph (owner ask 2026-06-10: real path choices, not
// one static fork). Top (y≈0) start, bottom (y≈1) boss. Rows: 1 start → two branching
// rows → an ALL-SHOP row (every path shops exactly once — the economy loop is
// load-bearing) → a late branching row → boss. Branching rows are 2–3 wide; links go to
// the proportional next-row column plus an occasional neighbor, so paths FORK and MERGE
// but never cross far. Elites are sprinkled (heavier after the shop); ≥1 guaranteed per
// floor. Regenerated fresh by descend(), so every floor's map is different.
let _nodeSeq = 0;
export function buildLevel() {
  const w23 = () => (Math.random() < 0.5 ? 2 : 3);
  const plan = [
    { type: "combat", w: 1 },
    { type: "combat", w: w23(), elite: 0.15 },
    { type: "combat", w: w23(), elite: 0.25 },
    { type: "shop",   w: 2 },
    { type: "combat", w: w23(), elite: 0.45 },
    { type: "boss",   w: 1 },
  ];
  const nodes = [];
  const rows = plan.map((spec, r) => {
    const y = 0.04 + (r / (plan.length - 1)) * 0.91;
    return Array.from({ length: spec.w }, (_, i) => {
      const type = spec.type === "combat" && Math.random() < (spec.elite ?? 0) ? "elite" : spec.type;
      const n = { id: "n" + _nodeSeq++, type, cleared: false, x: (i + 1) / (spec.w + 1), y, links: [] };
      nodes.push(n);
      return n;
    });
  });
  // ≥1 elite per floor — if none rolled, the post-shop row gets one
  if (!nodes.some((n) => n.type === "elite")) {
    const late = rows[4];
    late[Math.floor(Math.random() * late.length)].type = "elite";
  }
  // link each row to the next: the proportional column always, a neighbor column often
  // (the CHOICE), and an orphan sweep so every node is enterable from somewhere.
  const link = (from, to) => { if (!from.links.includes(to.id)) from.links.push(to.id); };
  for (let r = 0; r < rows.length - 1; r++) {
    const a = rows[r], b = rows[r + 1];
    for (let i = 0; i < a.length; i++) {
      const j = a.length === 1 ? Math.floor(b.length / 2)
        : Math.round(i * (b.length - 1) / (a.length - 1));
      link(a[i], b[j]);
      const k = j + (Math.random() < 0.5 ? 1 : -1);
      if (b[k] && Math.random() < 0.6) link(a[i], b[k]);
    }
    for (let j = 0; j < b.length; j++) {
      if (a.some((n) => n.links.includes(b[j].id))) continue;
      const i = a.length === 1 ? 0 : Math.round(j * (a.length - 1) / Math.max(1, b.length - 1));
      link(a[Math.min(i, a.length - 1)], b[j]);
    }
  }
  // links read LEFT→RIGHT (by target x) so every consumer — the won/shop advance
  // buttons above all — lists choices in the order the map draws them. The raw link
  // order (proportional, then neighbor, then orphan sweep) once sent an owner who
  // clicked the left button into the right room.
  const xOf = Object.fromEntries(nodes.map((n) => [n.id, n.x]));
  for (const n of nodes) n.links.sort((a, b) => xOf[a] - xOf[b]);
  // pre-roll enchants so the map can preview them on hover (combat/elite only; boss & shop have none)
  for (const n of nodes) if (n.type === "combat" || n.type === "elite") n.enchant = pickEnchant();
  return { nodes, currentId: rows[0][0].id };
}

export const nodeById = (room, id) => (room.level ? room.level.nodes.find((n) => n.id === id) : null);
export const currentNode = (room) => (room.level ? nodeById(room, room.level.currentId) : null);

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------
// Per-item cooldown (falls back to the KIT default if the item carries none).
// An item's effective cooldown for a given wielder. A body's TEMPO bends it:
//  • itemCdMul (< 1): "spammer" body — every cooldown shorter.
//  • itemCdCap: "heavy" body — caps the cooldown, taming big spells (Fire/Gavel) most.
export const itemCd = (inv, body) => {
  let cd = inv.cd != null ? inv.cd : KIT[inv.key].cd;
  const school = KIT[inv.key]?.type;
  // School CDR (V2 §4.4): Pixie's swords / Lizard Wizard's staves charge faster.
  if (school === "physical" && body?.swordCdMul) cd *= body.swordCdMul;
  if (school === "magical" && body?.staffCdMul) cd *= body.staffCdMul;
  if (body?.itemCdMul) cd *= body.itemCdMul;
  if (body?.itemCdCap) cd = Math.min(cd, body.itemCdCap);
  return Math.max(1, Math.round(cd * cdScale()));   // global playtest slow-down
};

export function freshKit(god = false) {
  // God mode: every item, tiny cooldown, ready to fire immediately.
  if (god) return KIT_POOL.map((key) => ({ key, charge: GOD_CD, cd: GOD_CD }));
  // The random STARTER kit is pressable actives only — worn passives (Aegis) come from the
  // draft/shop, not the fallback roll (a starter should always have things to press).
  const pool = KIT_POOL.filter((k) => !isPassiveItem(k));
  const out = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const key = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    out.push({ key, charge: 0, cd: KIT[key].cd });
  }
  return out;
}

// Build a live inventory from a player's drafted card keys.
export function kitFromPicks(picks) {
  return picks.filter((k) => KIT[k]).map((key) => ({ key, charge: 0, cd: KIT[key].cd }));
}

export function wearBody(player, bodyKey, keepWoundRatio = false) {
  const b = BODIES[bodyKey];
  const ratio = keepWoundRatio && player.maxHp ? player.hp / player.maxHp : 1;
  player.bodyKey = bodyKey;
  player.maxHp = bodyMaxHp(b);
  player.hp = Math.max(1, Math.round(player.maxHp * ratio));
  player.phys = b.phys ?? b.atk ?? 0;   // body affinity → Physical Power (sword); matches spawnEnemy
  player.mag = b.mag ?? 0;              // body affinity → Magical Power (staff)
}

// ---------------------------------------------------------------------------
// Body purchase — a TIERED unlock, now PER-PLAYER. A body's tier = its `ante`. Player/draft
// bodies have no ante → tier 0 (free, gated only by the pool). Foe tiers are bought from the
// player's OWN wallet: defeating a foe REACHES its tier for the party (makes it purchasable);
// a player then spends to unlock that whole tier for THEMSELVES (every body of that ante).
// ---------------------------------------------------------------------------
// Owner-set price points (2026-06-10): tier 1 is FREE once reached (commons are the
// playground — swap at will), tier 2 = 10g, tier 3 = 20g.
export const TIER_COSTS = { 1: 0, 2: 10, 3: 20 };
export const tierCost = (ante) => TIER_COSTS[ante] ?? ante * 10;
// Treasure comes from mirrored room income (creditRoomIncome) — every player credited V on
// clear. Tiers you've REACHED (the party felled ≥1 body of that ante) — these are purchasable.
export const tiersReached = (room) =>
  [...new Set([...room.unlockedBodies].map((k) => BODIES[k]?.ante ?? 0).filter((a) => a > 0))].sort((x, y) => x - y);

// Can this player swap INTO `key` right now? Body purchase is PER-PLAYER now: each player
// buys their own tiers from their own wallet (player.unlockedTiers). (Phase-3 will relax the
// exclusivity to allow post-draft overlap; for now a worn body stays off-limits.)
export function canSwapTo(room, player, key) {
  const b = BODIES[key];
  if (!b || b.boss || b.summon) return false;                       // bosses & summon tokens (rats) are never adoptable
  if ([...room.players.values()].some((q) => q !== player && q.bodyKey === key)) return false; // exclusive
  const ante = b.ante ?? 0;
  if (ante === 0) return room.unlockedBodies.has(key);              // tier-0 (rookie/draft bodies): must be in the pool
  if (tierCost(ante) === 0) return tiersReached(room).includes(ante); // FREE tier: reached = wearable, no purchase step
  return (player.unlockedTiers ?? new Set()).has(ante);            // paid tiers: this player must have bought in
}

// Spend the player's OWN wallet to unlock a whole ante tier (buying into that chassis weight).
// Requires the tier be reached (the party has felled one of that weight).
export function buyTier(room, player, ante) {
  if (!player || !ante) return false;
  const owned = (player.unlockedTiers ??= new Set());
  if (owned.has(ante)) return false;
  if (!tiersReached(room).includes(ante)) return false;            // must have felled one of that weight first
  const cost = tierCost(ante);
  if ((player.treasure ?? 0) < cost) return false;
  player.treasure -= cost;
  owned.add(ante);
  return true;
}

// EXCLUSIVE body swap — a literal trade through the shared pool. A body worn by another
// player is off-limits. Your current body is RELEASED back into the pool and the chosen
// one becomes you; the swap sticks across rooms (homeBody). `targetKey` null = quick-cycle
// to the next swappable body. Returns the adopted bodyKey, or null if not allowed.
export function swapBody(room, player, targetKey = null) {
  if (!player?.alive) return null;
  let target;
  if (targetKey) {
    if (!canSwapTo(room, player, targetKey)) return null;
    target = targetKey;
  } else {
    const avail = Object.keys(BODIES).filter((k) => k === player.bodyKey || canSwapTo(room, player, k));
    const idx = avail.indexOf(player.bodyKey);
    target = avail[(idx + 1) % avail.length];
  }
  if (!target || target === player.bodyKey) return null;
  room.unlockedBodies.add(player.bodyKey); // my old body goes up into the pool (and reveals its tier)
  wearBody(player, target, true);
  player.homeBody = target;                // "that body is me now" — persists into the next room
  return target;
}

// OUT of a run (lobby/draft — no level yet), the board preview tracks the party size live:
// lanes = players, resized on every join/leave. Once a run starts, the lane count is LOCKED
// at enterRoom per room (a joiner/leaver mid-run doesn't reshape a live board). Without this
// the lobby/draft board showed the stale newRoom default (3 lanes) regardless of party size.
export function syncLobbyLanes(room) {
  if (room.level) return;
  room.laneCount = deriveLaneCount(room, "combat");
  room.lanes = Array.from({ length: room.laneCount }, () => []);
  room.allies = Array.from({ length: room.laneCount }, () => []);
}

// Networking-free: caller (server) attaches `.ws` afterward.
export function addPlayer(room, id, name) {
  const player = {
    // lane is clamped to the LIVE lane count: a late joiner lands in a real lane (a solo
    // run has only lane 0 — an unclamped default of 1 crashed every subsequent tick).
    id, name: name || "Adventurer", side: "hero", lane: Math.min(1, (room.laneCount ?? LANES) - 1), depth: 0, counters: 0, shield: 0, targetId: null, allyTargetId: null,
    bodyKey: STARTER_BODY, homeBody: STARTER_BODY, classKey: null,
    hp: 0, maxHp: 0, alive: true, downTimer: 0, kitSlots: KIT_SLOTS_BASE,
    treasure: 0,                    // per-player wallet — mirrored income credits it equally
    earned: 0,                      // lifetime room income — the fairness invariant lives on EARNINGS, not holdings (remainder tiebreak)
    unlockedTiers: new Set(),       // ante tiers THIS player has bought into (per-wallet)
    lockedBundle: null, drafted: false, // draft-wheel lock state
    inv: freshKit(room.god), draftPicks: [], ws: null,
  };
  wearBody(player, STARTER_BODY);
  if (room.god) { player.maxHp = 999; player.hp = 999; }
  room.players.set(id, player);
  syncLobbyLanes(room);   // lobby/draft board preview matches the party size (no-op mid-run)
  return player;
}

// ---------------------------------------------------------------------------
// Enemies / rooms
// ---------------------------------------------------------------------------
// A foe is just a Combatant with side:"foe". `loadout` arms it with items
// (item keys or {key,cd}) that fire through the same resolver players use.
let _foeSeq = 1;
export function spawnEnemy(bodyKey, loadout = []) {
  const b = BODIES[bodyKey] || {}; // tolerate unknown keys (e.g. a boss's deleted court — next slice)
  return {
    id: "f" + _foeSeq++, // stable id so the client can target a specific foe
    bodyKey, hp: bodyMaxHp(b), maxHp: bodyMaxHp(b), phys: b.phys ?? b.atk ?? 0, mag: b.mag ?? 0, charge: 0, side: "foe", lane: 0, counters: 0, shield: 0,
    equipment: loadout.map((l) => {
      const key = typeof l === "string" ? l : l.key;
      let baseCd = (typeof l === "object" && l.cd) || KIT[key]?.cd || 40;
      const school = KIT[key]?.type;
      // symmetric school CDR (V2 §4.4): a foe Pixie's sword items charge faster too
      if (school === "physical" && b.swordCdMul) baseCd *= b.swordCdMul;
      if (school === "magical" && b.staffCdMul) baseCd *= b.staffCdMul;
      return { key, charge: 0, cd: Math.max(1, Math.round(baseCd * cdScale())) }; // global slow-down baked in
    }),
  };
}

// The lane a greedy add's owner holds (clamped to the live lane count).
export function ownerLaneOf(room, ownerId) {
  const p = room.players?.get(ownerId);
  return Math.max(0, Math.min((room.laneCount ?? LANES) - 1, p?.ownedLane ?? 0));
}
// The lane each drafted foe will occupy: greedy → its owner's lane; baseline → round-robin.
// Shared by buildRoom (actual placement) and the snapshot (the stock-screen preview).
export function placedLanes(room) {
  let baseI = 0;
  return (room.draftedFoes ?? []).map((f) =>
    (f.greedy && f.owner != null && room.players?.has(f.owner))
      ? ownerLaneOf(room, f.owner)
      : (baseI++) % (room.laneCount ?? LANES));
}

// Lay out the room's foes. If the player stocked a composition (the foe-draft), use
// it verbatim; otherwise auto-fill (god mode, bosses, or a skipped draft).
export function buildRoom(room) {
  room.lanes = Array.from({ length: room.laneCount }, () => []);
  const type = currentNode(room)?.type ?? "combat";
  if (type === "boss") {
    // A boss node spawns the ONE designed boss for this floor — back-line (room.boss) or
    // lane-bound (Djinn). No generic auto-fill, no enchant: the boss's clocks ARE the room.
    spawnBoss(room);
    return;
  }
  if (room.draftedFoes?.length) {
    // Place each foe per placedLanes(): baseline round-robins; a greedy add goes to its owner's
    // lane (the player who invited it fights it). buildRoom + the snapshot share this layout.
    const ln = placedLanes(room);
    room.draftedFoes.forEach((f, i) => room.lanes[ln[i]].push(spawnEnemy(f.bodyKey, f.gear ?? [])));
  } else {
    let size, pool;
    if (type === "elite") { size = ROOM_SIZE + 3; pool = ["pixie", "centaur", "vampire", "minotaur"]; }
    else { size = ROOM_SIZE; pool = ["pixie", "mouse", "lizardWizard"]; }
    for (let i = 0; i < size; i++) {
      room.lanes[i % room.laneCount].push(spawnEnemy(pool[Math.floor(Math.random() * pool.length)]));
    }
  }
  // enchant augments every foe; every foe item starts at BASE (empty bar) so nothing reads as
  // pre-charged on spawn. (Earlier a random/staggered seed left bars partially filled.)
  for (const lane of room.lanes) for (const f of lane) {
    applyEnchantToFoe(f, room.enchant);
    for (const it of f.equipment ?? []) it.charge = 0;
  }
  formUp(room); // the wall forms: tanky bodies to the front, squishy/ranged hide at the back
}

// FORMATION — within each lane, the toughest body holds the FRONT (the "base", index 0,
// where it eats melee/`front` hits and shields the lane); squishier foes hide BEHIND it.
// Sort by HP (legible: "the big one's up front"); stable id tiebreak. Front foes die first,
// so the backline is naturally exposed as the wall crumbles. Re-callable after summons.
export const tankiness = (f) => (f.maxHp ?? 0);
export function formUp(room) {
  for (const lane of room.lanes) {
    lane.sort((a, b) => tankiness(b) - tankiness(a) || (a.id < b.id ? -1 : 1));
  }
}

// ===========================================================================
// BOSS_SPEC_V1 machinery — spawn, clocks, on-damaged triggers, item-entities.
// ===========================================================================
// First-draft per-boss numbers (ticks at cdMult 1; ALL [PLACEHOLDER] — redial on playtest).
// Boss maxHp base lives on the body; everything else lives here so tests can read it.
export const BOSS_DEFS = {
  hydra:          { headCd: 80, headStart: 5 },        // head clock 8s; waves START at 5 (owner 2026-06-11), +1 per trigger
  litigationLich: { stanceCd: 100, wizardCd: 120 },    // 10s stance windows; bone wizards every 12s
  djinn:          { teleportCd: 70, aoeCd: 90, aoeDmg: 2, everyNthItem: 3 },
  kraken:         { stealCd: 140, capPerPlayer: 2,     // tentacle cap = 2 × players (8 at 4P)
                    replenishCd: (floor) => Math.max(40, 100 - 20 * ((floor | 0) - 1)) }, // 10s, −2s/floor
};
// The items the Djinn conjures: normal table, common/uncommon, damaging only (a summoned
// shield that protects nobody is a dud, not a threat). The ≥1 weapon floor makes even the
// amount-0 school items (Scary Knife) land on the entity's 0-Power chassis.
export const DJINN_ITEM_POOL = Object.keys(KIT).filter((k) =>
  (KIT[k].rarity === "common" || KIT[k].rarity === "uncommon") &&
  (KIT[k].ops ?? []).some((o) => o.do === "deal"));

// A boss CLOCK: { kind, cd (ticks, cdMult baked in at creation — the landmine), charge,
// label/color/dmg/aoe → its threat bar }. Generic: the back-line boss and the lane-bound
// Djinn both run their mechanics on these.
const bossClock = (kind, cd, bar = {}) =>
  ({ kind, cd: Math.max(1, Math.round(cd * cdScale())), charge: 0, ...bar });

// Drop a foe-side body straight into a lane (boss summons: heads/wizards/tentacles).
export function spawnFoeInLane(room, bodyKey, lane, gear = []) {
  const li = Math.max(0, Math.min(room.laneCount - 1, lane | 0));
  const f = spawnEnemy(bodyKey, gear);
  f.side = "foe"; f.lane = li;
  room.lanes[li].push(f);
  return f;
}

// An ITEM-ENTITY (Djinn summon / Kraken steal): wraps an item key — HP = the item's gold
// cost (itemTreasure), attacks with the item's own op on its natural cooldown via the
// ordinary foe equipment machinery. `extra.restoreTo` links a stolen one back to its owner.
export function spawnItemEntity(room, itemKey, lane, extra = {}) {
  const f = spawnFoeInLane(room, "itemEntity", lane, [itemKey]);
  f.hp = f.maxHp = Math.max(1, itemTreasure(itemKey));
  f.itemKey = itemKey;
  f.name = (extra.restoreTo ? "Stolen " : "Conjured ") + (KIT[itemKey]?.name ?? itemKey);
  if (extra.restoreTo) f.passiveText = "STOLEN — kill it to take it back.";
  Object.assign(f, extra);
  formUp(room);
  return f;
}

// Spread `count` spawns across lanes, always topping up the EMPTIEST lane first (measured
// by `weigh`) — Hydra's round-robin waves and the Kraken's wall replenish both use this.
function spawnSpread(room, bodyKey, count, weigh = (lane) => lane.length) {
  for (let k = 0; k < count; k++) {
    let li = 0;
    for (let i = 1; i < room.laneCount; i++) if (weigh(room.lanes[i]) < weigh(room.lanes[li])) li = i;
    spawnFoeInLane(room, bodyKey, li);
  }
  formUp(room);
}
const tentaclesOf = (lane) => lane.filter((f) => f.bodyKey === "tentacle").length;
export const tentacleCount = (room) => room.lanes.reduce((n, l) => n + tentaclesOf(l), 0);

// Kraken steal: lock a random usable item on a random player and animate it against the
// party. Guards (spec): one stolen item per player at most, and never below 1 usable item.
export function krakenSteal(room) {
  const usable = (p) => p.inv.filter((iv) => !iv.stolen && !iv.spent && KIT[iv.key]?.ops?.length);
  const victims = [...room.players.values()].filter((p) =>
    p.alive && !p.inv.some((iv) => iv.stolen) && usable(p).length >= 2);
  if (!victims.length) return null;
  const v = victims[Math.floor(Math.random() * victims.length)];
  const pool = usable(v);
  const iv = pool[Math.floor(Math.random() * pool.length)];
  iv.stolen = true;                                  // hotbar lock — exactly as long as the entity lives
  return spawnItemEntity(room, iv.key, v.lane, { restoreTo: { playerId: v.id, key: iv.key } });
}

// One boss clock fired — the whole V2 boss vocabulary lives in this switch.
export function fireBossClock(room, boss, clock) {
  switch (clock.kind) {
    case "heads": {                                  // Hydra: 1, then 2, then 3… round-robin across lanes
      spawnSpread(room, "hydraHead", boss.headWave ?? 1);
      boss.headWave = (boss.headWave ?? 1) + 1;      // inflation — each trigger means MORE next time
      break;
    }
    case "stance":                                   // Lich: ⚖ OBJECTION (cap 1) ⇄ recess (−1)
      boss.stance = boss.stance === "objection" ? "recess" : "objection";
      break;
    case "wizards":                                  // Lich: bone wizards, `players`-at-a-time, spread
      spawnSpread(room, "boneWizard", Math.max(1, room.players.size || 1));
      break;
    case "teleport": {                               // Djinn: relocate to a random OTHER lane
      if (room.laneCount < 2) break;
      const from = boss.lane | 0;
      let to = Math.floor(Math.random() * (room.laneCount - 1));
      if (to >= from) to++;
      const arr = room.lanes[from], i = arr.indexOf(boss);
      if (i >= 0) { arr.splice(i, 1); boss.lane = to; room.lanes[to].push(boss); formUp(room); }
      break;
    }
    case "aoe":                                      // Djinn: hit EVERY lane (the all-lanes telegraph flash applies)
      for (let l = 0; l < room.laneCount; l++) foeHitLane(room, l, clock.dmg ?? 0, boss);
      break;
    case "steal": krakenSteal(room); break;
    case "replenish": {                              // Kraken: back UP TO CAP, regardless of how many fell
      const deficit = (boss.tentacleCap ?? 0) - tentacleCount(room);
      if (deficit > 0) spawnSpread(room, "tentacle", deficit, tentaclesOf);
      break;
    }
    default: break;
  }
}

// Advance a combatant's boss clocks one tick (charge → fire → reset).
export function tickBossClocks(room, c) {
  for (const k of c.clocks ?? []) {
    if (++k.charge < k.cd) continue;
    k.charge = 0;
    fireBossClock(room, c, k);
  }
}

// On-damaged boss triggers WITH lane attribution — the lane the damaging source came from
// is a first-class fact (BOSS_SPEC_V1 architecture). Hydra: a 1/1 head re-walls that lane,
// rate-limited to one per lane per tick (one resolve-batch ≈ one tick — AoE/multi-source
// hits in the same batch spawn at most one head per damaged lane).
export function bossOnDamaged(room, boss, laneIdx) {
  if (boss.bodyKey !== "hydra") return;
  const seen = (boss._headAt ??= {});
  if (seen[laneIdx] === room.tick) return;
  seen[laneIdx] = room.tick;
  spawnFoeInLane(room, "hydraHead", laneIdx);
  formUp(room);
}

// Is the back-line boss still standing?
export const bossAlive = (room) => !!(room.boss && room.boss.hp > 0);

// Spawn the floor's boss (BOSS_SPEC_V1). Back-line bosses (Hydra/Lich/Kraken) become
// room.boss — a caravan-mirror spanning every lane, NOT a lane entry. The Djinn occupies
// a lane like an ordinary foe and relocates. HP = body base × players × floor (the budget).
export function spawnBoss(room) {
  const bossKey = bossForFloor(room, room.floor ?? 1);
  const players = Math.max(1, room.players.size || 1);
  const floor = room.floor ?? 1;
  const budget = bossBudget(players, floor);
  const def = BOSS_DEFS[bossKey] ?? {};
  const boss = spawnEnemy(bossKey);
  boss.hp = boss.maxHp = Math.round(bodyMaxHp(BODIES[bossKey]) * budget);
  if (bossKey === "hydra") {
    boss.headWave = def.headStart ?? 1;
    boss.clocks = [bossClock("heads", def.headCd, { label: "🐍 heads", color: "#5fd0a0" })];
  } else if (bossKey === "litigationLich") {
    boss.stance = "objection";                       // opens in court — the party waits out the cap
    boss.clocks = [
      bossClock("stance", def.stanceCd, { label: "⚖ stance", color: "#9a7fc0" }),
      bossClock("wizards", def.wizardCd, { label: "💀 wizards", color: "#cfd0e8" }),
    ];
  } else if (bossKey === "djinn") {
    boss.clocks = [
      bossClock("teleport", def.teleportCd, { label: "🌀 move", color: "#d0904f" }),
      bossClock("aoe", def.aoeCd, { label: "✦all", color: PASSIVE_BAR_COLOR, dmg: def.aoeDmg, aoe: true }),
    ];
  } else if (bossKey === "kraken") {
    boss.tentacleCap = (def.capPerPlayer ?? 2) * players;
    boss.clocks = [
      bossClock("steal", def.stealCd, { label: "🦑 steal", color: "#d06fb0" }),
      bossClock("replenish", def.replenishCd(floor), { label: "🐙 wall", color: "#5f8fd0" }),
    ];
  }
  if (BODIES[bossKey]?.backline) {
    boss.lane = null; boss.depth = null;
    room.boss = boss;
    if (bossKey === "kraken")                        // it ENTERS behind its wall
      spawnSpread(room, "tentacle", boss.tentacleCap, tentaclesOf);
  } else {
    boss.lane = Math.floor((room.laneCount - 1) / 2);
    room.lanes[boss.lane].push(boss);
    formUp(room);
  }
  return boss;
}

export function enterRoom(room) {
  // Lanes = player count for this room (god keeps ≥3). Derive BEFORE building the arrays.
  room.laneCount = deriveLaneCount(room, currentNode(room)?.type ?? "combat");
  room.lanes = Array.from({ length: room.laneCount }, () => []);
  room.allies = Array.from({ length: room.laneCount }, () => []);
  room.boss = null;                       // a stale back-line boss never follows you into the next room
  room.itemUses = 0;                      // the Djinn's party-wide counter starts fresh per room
  room.caravan.max = room.god ? 999 : caravanMaxHp();
  room.caravan.hp = room.caravan.max;
  // Unlocked bodies ACCUMULATE across the whole run (the mimic hook) — NEVER wiped per
  // room. Just ensure the starter is present; god mode opens the whole roster for testing.
  if (!room.unlockedBodies) room.unlockedBodies = new Set([STARTER_BODY]);
  room.unlockedBodies.add(STARTER_BODY);
  if (room.god) for (const k of Object.keys(BODIES)) room.unlockedBodies.add(k);
  // Each player OWNS a distinct lane (their body + their greedy-add sit there). With lanes =
  // player count this is a bijection; in boss/god rooms (≥3 lanes) extra lanes are unowned.
  let _li = 0;
  for (const p of room.players.values()) {
    // God: full kit on the rookie body. Otherwise the drafted body + starter kit.
    p.inv = room.god ? freshKit(true)
          : kitFromPicks(p.draftPicks?.length ? p.draftPicks : KIT_POOL.slice(0, DRAFT_PICKS));
    p.ownedLane = Math.min(room.laneCount - 1, _li++);
    p.lane = p.ownedLane; p.depth = 0; p.alive = true; p.downTimer = 0;  // start at the front of your own lane
    wearBody(p, room.god ? STARTER_BODY : (p.homeBody ?? STARTER_BODY));
    if (room.god) { p.maxHp = 999; p.hp = 999; }
  }
  // Foe-draft: ordinary rooms let you stock the foes first. Bosses & god auto-fill.
  room.draftedFoes = [];
  room.loot = [];
  room.tradeOffers = [];        // stale trade offers don't carry between rooms
  const type = currentNode(room)?.type ?? "combat";
  // only combat/elite carry an enchant; shop & boss have none
  room.enchant = (!room.god && (type === "combat" || type === "elite"))
    ? (currentNode(room)?.enchant ?? pickEnchant()) : null;
  room.shop = null;
  if (!room.god && type === "shop") {
    room.shop = { wares: rollShopWares() };   // a fresh shelf of buyable items
    room.phase = "shop";
  } else if (room.god || type === "boss") {
    buildRoom(room);
    room.phase = "setup";
  } else {
    // Ordinary room: it ARRIVES pre-stocked with rank-and-file scaled to the floor (the
    // baseline difficulty). Players then ADD greedy armed picks from the palette — pure
    // upside-for-risk, and the way you invite a body you want to wear/loot.
    // NO pre-stocked baseline (owner 2026-06-10): the party stocks the WHOLE room from
    // the palette until the required ante is met — you choose exactly what you fight,
    // and what you invite lands in YOUR lane.
    room.draftedFoes = [];
    room.foePool = buildFoePool(type);
    room.foePalette = room.foePool.slice(0, PALETTE_SLOTS).map((o) => ({ ...o }));
    room.foeNext = PALETTE_SLOTS;
    ensureCheapSlot(room);          // a cheap option is always on offer
    room.picksRequired = picksRequiredFor(type);   // 1 each · DOUBLE FEATURE: 2 each
    room.phase = "stock";
  }
}

// ---------------------------------------------------------------------------
// Stock the room. The room arrives EMPTY; the party invites foes from the palette into
// their own lanes until the required ante is met (anteRequired ≤ anteCurrent gates
// commitStock). Every stocked foe's body-value AND its carried items feed the room value
// V — so a richer room raises EVERYONE's mirrored income equally.
// ---------------------------------------------------------------------------
// Low-level primitive: push a greedy foe from palette slot `idx` (no owner, no per-player cap).
// Used by tests/fuzz/utilities. Live play goes through addGreedy (per-player, owner-tagged).
export function addFoe(room, idx, owner = null) {
  if (room.phase !== "stock") return false;
  const opt = room.foePalette?.[idx];
  if (!opt || room.draftedFoes.length >= STOCK_MAX) return false;
  room.draftedFoes.push({ bodyKey: opt.bodyKey, gear: [...(opt.gear ?? [])], greedy: true, owner });
  // a fresh choice rolls into that slot so there's always something new to pick
  const pool = room.foePool ?? [];
  if (pool.length) { room.foePalette[idx] = { ...pool[room.foeNext % pool.length] }; room.foeNext++; }
  ensureCheapSlot(room);                       // the cheap-option guarantee survives rerolls
  return true;
}

// Live player action: invite ONE greedy body into your own lane. Adding again REPLACES your
// previous pick (you only ever have one). Returns true if the pick changed.
export function addGreedy(room, player, idx) {
  if (room.phase !== "stock" || !player) return false;
  // each player invites EXACTLY their share (1, or 2 in a double feature) — your lane,
  // your stake; remove a pick to change your mind
  if (playerPicks(room, player.id) >= (room.picksRequired ?? 1)) return false;
  return addFoe(room, idx, player.id);
}

// Remove YOUR greedy pick (baseline rank-and-file can't be removed).
export function removeGreedy(room, player) {
  if (room.phase !== "stock" || !player) return false;
  const i = (room.draftedFoes ?? []).findIndex((f) => f.greedy && f.owner === player.id);
  if (i < 0) return false;
  room.draftedFoes.splice(i, 1);
  return true;
}

// Index-based removal primitive (only removes greedy foes). Used by tests/legacy.
export function removeFoe(room, i) {
  if (room.phase !== "stock") return;
  const f = room.draftedFoes[i];
  if (f && f.greedy) room.draftedFoes.splice(i, 1); // baseline rank-and-file can't be removed
}

export function commitStock(room) {
  if (room.phase !== "stock") return;
  if (!stockReady(room)) return;        // everyone places their pick(s) first
  buildRoom(room);
  room.phase = "setup";
}

// Claim a piece of the room's loot into your kit. Loot is a SHARED, SCARCE set — one
// instance of each drop, first-come. Claiming now COSTS its value (itemTreasure) out of the
// claiming player's wallet: you were already credited the full V as income, so converting
// income → gear is a real spend, while a player who grabs nothing keeps that value as cash.
// Gated on BOTH kit space and funds. There is NO stash — unclaimed loot is gone on leave,
// but its value was already mirrored into every wallet.
export function claimLoot(room, player, key) {
  if (room.phase !== "won") return;
  const i = room.loot.indexOf(key);
  if (i < 0 || !KIT[key]) return;
  if (player.draftPicks.length >= (player.kitSlots ?? KIT_SLOTS_BASE)) return; // out of kit space
  const cost = itemTreasure(key);
  if ((player.treasure ?? 0) < cost) return;                                   // can't afford it
  player.treasure -= cost;
  room.loot.splice(i, 1);
  player.draftPicks.push(key);           // carried into future rooms via kitFromPicks
}

// Spend the player's OWN wallet to buy ONE more kit slot (up to MAX_KIT). Surfaced to the
// player as "level up"; internally it's a kit-slot purchase on the same cost curve.
export function buyKitSlot(room, player) {
  if (!player) return false;
  const slots = player.kitSlots ?? KIT_SLOTS_BASE;
  const cost = kitSlotCost(slots);
  if (cost == null || (player.treasure ?? 0) < cost) return false;
  player.treasure -= cost;
  player.kitSlots = slots + 1;
  return true;
}

// Split income 1:1: on clearing a room, the stocked ante V is divided across the party —
// equal shares, with the remainder coins handed to the LOWEST TOTAL EARNINGS first
// (owner 2026-06-11; stable id tiebreak). Earnings, NOT wallet: spending your gold on
// tiers/loot/slots must not attract remainder coins — the fairness invariant is on
// what each player has been PAID, the same invariant that already justifies trading.
export function creditRoomIncome(room) {
  const v = roomValue(room);
  room.lastRoomValue = v;
  const players = [...room.players.values()];
  if (!players.length) return;
  const share = Math.floor(v / players.length);
  let extra = v % players.length;
  for (const p of players) { p.treasure = (p.treasure ?? 0) + share; p.earned = (p.earned ?? 0) + share; }
  for (const p of [...players].sort((a, b) => (a.earned ?? 0) - (b.earned ?? 0) || (a.id < b.id ? -1 : 1))) {
    if (extra-- <= 0) break;
    p.treasure += 1; p.earned += 1;
  }
}

// Between rooms (won screen) or at a shop: drop an item from your kit (e.g. to free
// space under the kit cap so you can claim/buy something better).
export function dropItem(room, player, key) {
  if (room.phase !== "won" && room.phase !== "shop") return;
  const i = (player.draftPicks ?? []).indexOf(key);
  if (i >= 0) player.draftPicks.splice(i, 1);
}

// ---------------------------------------------------------------------------
// Player-to-player TRADING — swap one equipped item each; the value DIFFERENCE is settled
// in treasure (the giver of the LESSER item pays the difference). This is allowed because
// the equality invariant is on EARNINGS, not holdings. Out-of-combat only (won/shop).
// ---------------------------------------------------------------------------
const tradeable = (room) => room.phase === "won" || room.phase === "shop";

// Execute an AGREED 1-for-1 trade: `a` gives `aKey`, `b` gives `bKey`; each receives the
// other's item; the lesser-item giver pays the value gap. Validates ownership + affordability.
export function tradeItems(room, a, b, aKey, bKey) {
  if (!tradeable(room) || !a || !b || a === b) return false;
  const ai = (a.draftPicks ?? []).indexOf(aKey);
  const bi = (b.draftPicks ?? []).indexOf(bKey);
  if (ai < 0 || bi < 0 || !KIT[aKey] || !KIT[bKey]) return false;
  const aVal = itemTreasure(aKey), bVal = itemTreasure(bKey);
  // the one who GAVE the cheaper item compensates the other in treasure
  let payer = null, gap = Math.abs(aVal - bVal);
  if (gap > 0) {
    payer = aVal < bVal ? a : b;                 // a gave the lesser → a pays (and vice-versa)
    if ((payer.treasure ?? 0) < gap) return false; // can't afford the settlement
  }
  a.draftPicks.splice(ai, 1); b.draftPicks.splice(bi, 1);
  a.draftPicks.push(bKey); b.draftPicks.push(aKey); // size unchanged (1 out, 1 in) — no space gate
  if (payer) { payer.treasure -= gap; (payer === a ? b : a).treasure = ((payer === a ? b : a).treasure ?? 0) + gap; }
  return true;
}

let _offerSeq = 1;
// Propose a trade: `from` offers their `give` for `to`'s `want`. Stored until accepted/declined.
export function proposeTrade(room, from, toId, give, want) {
  if (!tradeable(room) || !from) return false;
  const to = room.players.get(toId);
  if (!to || to === from) return false;
  if (!(from.draftPicks ?? []).includes(give) || !(to.draftPicks ?? []).includes(want)) return false;
  (room.tradeOffers ??= []).push({ id: "of" + _offerSeq++, from: from.id, to: toId, give, want });
  return true;
}

// The target accepts: re-validate and execute, then clear the offer.
export function acceptTrade(room, accepter, offerId) {
  const offers = room.tradeOffers ?? [];
  const i = offers.findIndex((o) => o.id === offerId);
  if (i < 0) return false;
  const o = offers[i];
  if (!accepter || accepter.id !== o.to) return false;       // only the target can accept
  const from = room.players.get(o.from);
  if (!from) { offers.splice(i, 1); return false; }
  const okTrade = tradeItems(room, from, accepter, o.give, o.want);
  if (okTrade) offers.splice(i, 1);
  return okTrade;
}

// Withdraw/decline an offer (either party, or a cleanup).
export function declineTrade(room, player, offerId) {
  const offers = room.tradeOffers ?? [];
  const i = offers.findIndex((o) => o.id === offerId && (o.from === player?.id || o.to === player?.id));
  if (i < 0) return false;
  offers.splice(i, 1);
  return true;
}

export function beginCombat(room) {
  if (room.phase === "setup") room.phase = "playing";
  room._bestFoeHp = undefined; room._bestCav = undefined; room._stallTicks = 0; // reset anti-stall
  // Per-fight state, symmetric for players (inv) and foes (equipment):
  //  • thorns buffs (Spikes) expire — "this fight" only;
  //  • `startCharged` items (Trusty Shield) open the fight ready to fire.
  for (const p of room.players.values()) {
    p.thorns = 0;
    for (const inv of p.inv) if (KIT[inv.key]?.startCharged) inv.charge = itemCd(inv, BODIES[p.bodyKey]);
  }
  for (const lane of room.lanes) for (const f of lane) {
    f.thorns = 0;
    for (const it of f.equipment ?? []) if (KIT[it.key]?.startCharged) it.charge = it.cd;
  }
  room.roomTimers = roomTimersFor(room.enchant);   // Acid Rain / Rat Colony global cooldown bars
}

// ---------------------------------------------------------------------------
// THE DRAFT — each player locks one bundle off the shared wheel (a lowest-power body +
// 3 random items), EXCLUSIVELY. When everyone has locked, the level auto-starts.
// ---------------------------------------------------------------------------
// Draft bundles roll COMMON items only (rarity climbs through loot/shop, not the wheel).
// Every starter kit is guaranteed at least one damaging item so no drafted loadout is a
// dud (all-utility) and combat can't deadlock from a toothless party.
const COMMON_KIT = KIT_POOL.filter((k) => KIT[k].rarity === "common");
const DAMAGING_ITEMS = COMMON_KIT.filter((k) => (KIT[k].ops ?? []).some((o) => o.do === "deal"));
function rollKit() {
  const first = rnd(DAMAGING_ITEMS);                                       // ≥1 damage option
  const rest = COMMON_KIT.filter((k) => k !== first).sort(() => Math.random() - 0.5).slice(0, DRAFT_PICKS - 1);
  return [first, ...rest];
}
let _bundleSeq = 1;
// Roll the shared wheel: distinct low bodies, each with a fresh 3-item bundle. At least
// DRAFT_WHEEL_MIN and always ≥ players + 2 so locking is a real exclusive choice.
export function rollDraftWheel(playerCount = 1) {
  const size = Math.min(DRAFT_BODIES.length, Math.max(DRAFT_WHEEL_MIN, playerCount + 2));
  const bodies = [...DRAFT_BODIES].sort(() => Math.random() - 0.5).slice(0, size);
  return bodies.map((bodyKey) => ({ id: "bndl" + _bundleSeq++, bodyKey, items: rollKit() }));
}

export function startDraft(room) {
  room.phase = "draft";
  room.level = null;
  room.levelComplete = false;
  room.floor = 1;                 // a fresh run starts on floor 1
  room.bossDraw = drawBossRotation();  // this run's 3-of-4 boss rotation, seeded once (map preview agrees)
  room.unlockedBodies = new Set([STARTER_BODY]); // a NEW run resets the adopted-body pool
  room.draftWheel = rollDraftWheel(room.players.size); // the shared body+items wheel
  syncLobbyLanes(room);   // board preview = party size (covers a re-draft after a lost run)
  // …and every player's wallet, bought tiers, kit space, and draft lock (fresh run wipes them)
  for (const p of room.players.values()) {
    p.classKey = null; p.draftPicks = []; p.kitSlots = KIT_SLOTS_BASE;
    p.treasure = 0; p.earned = 0; p.unlockedTiers = new Set();
    p.lockedBundle = null; p.drafted = false;
  }
}

// Apply a chosen body + items as a player's locked loadout, then maybe finish the draft.
function applyDraftPick(room, player, bodyKey, items, bundleId = null) {
  player.bodyKey = bodyKey;
  player.homeBody = bodyKey;
  player.draftPicks = [...items];
  player.lockedBundle = bundleId;
  player.drafted = true;
  wearBody(player, bodyKey);              // show the chosen body immediately while others pick
  maybeFinishDraft(room);
}

// Live draft: lock a wheel bundle EXCLUSIVELY (no two players on the same one).
export function draftPick(room, player, bundleId) {
  if (room.phase !== "draft" || !player) return;
  const b = (room.draftWheel ?? []).find((x) => x.id === bundleId);
  if (!b) return;
  if ([...room.players.values()].some((q) => q !== player && q.lockedBundle === bundleId)) return; // exclusive
  applyDraftPick(room, player, b.bodyKey, b.items, bundleId);
}

// Back-compat: a class is just a body + a fixed 3-item kit applied as a draft pick (no
// exclusivity — multiple players may share a class). Used by tests / the legacy class UI.
export function chooseClass(room, player, classKey) {
  if (room.phase !== "draft" || !CLASSES[classKey]) return;
  player.classKey = classKey;
  applyDraftPick(room, player, classKey, CLASSES[classKey].kit, null);
}

export function draftComplete(room) {
  return room.players.size > 0 &&
    [...room.players.values()].every((p) => p.drafted);
}

export function maybeFinishDraft(room) {
  if (room.phase === "draft" && draftComplete(room)) startLevel(room);
}

export function startLevel(room) {
  room.level = buildLevel();
  room.levelComplete = false;
  enterRoom(room);
}

// After clearing a boss, descend to the next floor: a fresh map, higher ante. Your
// kit and claimed items carry on; only death (the caravan falling) ends the run.
export function descend(room) {
  if (room.phase !== "won" || !room.levelComplete) return false;
  // No banking: the room's value was already mirrored into every wallet on clear; unclaimed
  // loot is simply gone ("use it or lose it"). enterRoom resets room.loot for the next room.
  room.floor = (room.floor ?? 1) + 1;
  room.level = buildLevel();
  room.levelComplete = false;
  enterRoom(room);
  return true;
}

export function advanceLevel(room, toId) {
  if (room.phase !== "won" || !room.level || room.levelComplete) return false;
  const cur = currentNode(room);
  if (!cur || !cur.links.includes(toId)) return false;
  const target = nodeById(room, toId);
  if (!target) return false;
  // No banking — value was mirrored to every wallet on clear; unclaimed loot is forfeited.
  cur.cleared = true;
  room.level.currentId = toId;
  enterRoom(room);
  return true;
}

// ---------------------------------------------------------------------------
// Shop node — spend shared Treasure on chosen items (and kit space, via buyKitSlot).
// ---------------------------------------------------------------------------
// Buy a ware off the shelf into the player's kit (respects kit space). Removes it
// from the shelf so it can't be bought twice.
export function buyShopItem(room, player, key) {
  if (room.phase !== "shop" || !player || !room.shop) return false;
  const i = (room.shop.wares ?? []).findIndex((w) => w.key === key);
  if (i < 0 || !KIT[key]) return false;
  const ware = room.shop.wares[i];
  if (player.draftPicks.length >= (player.kitSlots ?? KIT_SLOTS_BASE)) return false; // no kit space
  if ((player.treasure ?? 0) < ware.cost) return false;                              // can't afford
  player.treasure -= ware.cost;
  room.shop.wares.splice(i, 1);
  player.draftPicks.push(key);      // carried into future rooms via kitFromPicks
  return true;
}

// Reroll the whole shelf for a flat fee from the acting player's wallet.
export function rerollShop(room, player) {
  if (room.phase !== "shop" || !room.shop || !player) return false;
  if ((player.treasure ?? 0) < SHOP_REROLL_COST) return false;
  player.treasure -= SHOP_REROLL_COST;
  room.shop.wares = rollShopWares();
  return true;
}

// Leave the shop for a linked node — same graph move as advanceLevel, from the shop phase.
export function leaveShop(room, toId) {
  if (room.phase !== "shop" || !room.level) return false;
  const cur = currentNode(room);
  if (!cur || !cur.links.includes(toId) || !nodeById(room, toId)) return false;
  cur.cleared = true;
  room.level.currentId = toId;
  enterRoom(room);
  return true;
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Effect resolver — the SINGLE place card effects resolve, identically for heroes
// and foes. `source` is any Combatant (has .side 'hero'|'foe' and .lane). Targets
// are RELATIVE to the source: 'foe'/'target' = its front enemy, 'lane' = its lane,
// 'ally'/'self'/'caravan' = its own side. Verbs not wired yet no-op (safe by design).
// ---------------------------------------------------------------------------
export const heroesInLane = (room, lane) =>
  [...room.players.values()].filter((p) => p.alive && p.lane === lane);

// The DEPTH LINE within a lane: living heroes ordered front→back (lower `depth` = closer to
// the foes). Stable tiebreak by id so the order never jitters.
export const laneHeroes = (room, lane) =>
  heroesInLane(room, lane).sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || (a.id < b.id ? -1 : 1));

// The UNIFIED friendly line: heroes AND summon tokens together, front→back by depth
// (owner ask 2026-06-10: "I should be able to get in front of my rat — and behind it").
// New summons spawn at the FRONT (the meat-shield default); ↑/↓ walks a hero past them
// one entity at a time. THIS is the blocking order single-target foe hits resolve down.
export const laneLine = (room, lane) => [
  ...heroesInLane(room, lane),
  ...(room.allies?.[lane] ?? []).filter((t) => t.hp > 0),
].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || (String(a.id) < String(b.id) ? -1 : 1));

// Step forward (toward the foes, to block) or back one slot in the lane's UNIFIED line —
// a literal swap with the neighbor, hero or summon. Solo / front / rear edges no-op.
// Depths are renormalized to 0..n-1 first so the line is always a clean ordered stack.
export function moveDepth(room, player, dir) {
  if (!player?.alive) return;
  const line = laneLine(room, player.lane);
  line.forEach((c, i) => { c.depth = i; });           // normalize to a clean 0..n-1 line
  const i = line.indexOf(player);
  const j = dir === "fwd" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= line.length) return;     // already at the front / back
  [line[i].depth, line[j].depth] = [line[j].depth, line[i].depth];
}

// A combatant's effective attack = base + accumulated +1 counters (the ramp lever).
// Power stats. A combatant deals item/strike damage = base + matching Power.
// Physical Power is ramped by `counters` (the "gains +1 attack" passives).
// Stat bonus from WORN passive items (Trusty Blade=+phys, Trusty Staff=+mag). Symmetric: a player
// reads `inv`, a foe reads `equipment` — same shape as itemDmgReduce.
export function itemStatBonus(c, stat) {
  const gear = c?.inv ?? c?.equipment ?? [];
  return gear.reduce((s, it) => s + (it?.spent ? 0 : (KIT[it.key]?.passive?.[stat] ?? 0)), 0);
}
export const effPhys = (c) => (c.phys ?? c.atk ?? 0) + (c.counters ?? 0) + itemStatBonus(c, "phys");
export const effMag  = (c) => (c.mag ?? 0) + itemStatBonus(c, "mag");
// Magical (staff) Power; a body with `swordFeedsStaff` (Runeblade) adds its sword Power to staff too.
export const powerFor = (c, school) => {
  if (school === "magical") return effMag(c) + (BODIES[c.bodyKey]?.swordFeedsStaff ? effPhys(c) : 0);
  if (school === "physical") return effPhys(c);
  return 0;
};
export const effAtk = effPhys; // legacy alias (snapshot label / older callers)

// A hit aimed at the hero side of a lane: lane shield absorbs first, then the front
// defender, else the caravan. Shared by foe body-attacks AND foe 'deal' effects.
// Spend a combatant's shield buffer first; returns the leftover damage that reaches real HP.
// Per-body shields (Big Shield / Trusty Shield) replaced the old per-lane shield entirely.
export function absorbShield(c, dmg) {
  if (!c || dmg <= 0 || !(c.shield > 0)) return dmg;
  const used = Math.min(c.shield, dmg);
  c.shield -= used;
  return dmg - used;
}
// AURA TOKENS (V2 §4.2): a standing summon can carry `aura: { dmgBonus?, dmgReduce? }`,
// lane-scoped and SIDE-scoped (a foe Totem protects foes — fully symmetric). The same aura
// type does NOT stack: the strongest standing token applies. A token is NOT covered by its
// OWN aura (else a −1 totem is unkillable by chip damage); other tokens' auras do cover it.
export function laneAura(room, c, kind) {
  if (!c || c.lane == null) return 0;
  const arr = c.side === "foe" ? (room.lanes?.[c.lane] ?? []) : (room.allies?.[c.lane] ?? []);
  let best = 0;
  for (const t of arr) {
    if (t === c || !(t.hp > 0)) continue;
    const a = BODIES[t.bodyKey]?.aura?.[kind] ?? 0;
    if (a > best) best = a;
  }
  return best;
}

// V2 §4.8, GENERALIZED: a body with `accel: { on, amount }` ADDS charge to its own
// `every:N` clock(s) whenever its trigger fires — `on:"damaged"` (Atlas, Fat Cat) or
// `on:"sword"/"staff"` (Paid Piper / Royal Rat speed their summon bar by resolving items).
// The boost is scaled by the same multipliers as the clock thresholds so it's
// proportionally identical at any global speed (the landmine: clocks must ride _cdMult).
export function accelClocks(c, trigger) {
  const ac = BODIES[c.bodyKey]?.accel;
  if (!ac || ac.on !== trigger) return;
  const pas = BODIES[c.bodyKey]?.passive ?? [];
  c.pcharge = c.pcharge || {};
  pas.forEach((p, pi) => { if (p.every) c.pcharge[pi] = (c.pcharge[pi] ?? 0) + (ac.amount ?? 10) * (c.cdMul ?? 1) * cdScale(); });
}

// THORNS (V2 §4.6, Spikes): a struck defender spikes its attacker back for a flat N.
// Fires on DIRECT hits only (single-target strikes through the blocking line), never on
// lane AoE, and the reflection itself carries NO attacker — so chains can't recurse.
function reflectThorns(room, victim, attacker) {
  const n = victim?.thorns ?? 0;
  if (!(n > 0) || !attacker || attacker === victim) return;
  if (attacker.side === "foe") {
    damageEnemy(room, attacker.lane | 0, attacker, n);
  } else if (attacker.id != null && room.players?.has?.(attacker.id)) {
    damagePlayer(room, attacker, n);
  } else {
    // an ally summon token: direct chip, removed when it falls
    attacker.hp -= n;
    const lane = room.allies?.[attacker.lane | 0];
    const i = lane ? lane.indexOf(attacker) : -1;
    if (attacker.hp <= 0 && i >= 0) lane.splice(i, 1);
  }
}

// Damage one ally summon token (shield → aura reduce → HP), with on-damaged symmetry.
// Returns the amount that got past the aura (what "landed" for lifesteal purposes).
function hurtAllyToken(room, li, al, dmg, attacker = null) {
  al.lane = li; al.side = "hero";
  dmg -= laneAura(room, al, "dmgReduce");
  if (dmg <= 0) return 0;
  const landed = dmg;
  dmg = absorbShield(al, dmg);
  if (dmg > 0) {
    al.hp -= dmg;
    if (al.hp <= 0) { const i = room.allies[li].indexOf(al); if (i >= 0) room.allies[li].splice(i, 1); }
    else { runPassive(room, al, "damaged"); accelClocks(al, "damaged"); }
  }
  reflectThorns(room, al, attacker);
  return landed;
}

// A foe's single-target hit on the hero side of a lane. The FRONT of the lane's UNIFIED
// line (heroes and summons interleaved by depth) blocks. Returns the damage that LANDED
// (past auras/armor, into shield+HP — Darkness lifesteals off this).
export function foeHitLane(room, li, dmg, attacker = null) {
  if (dmg <= 0) return 0;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");   // foe-side Flag/Knight
  const front = laneLine(room, li)[0];
  if (!front) { room.caravan.hp = Math.max(0, room.caravan.hp - dmg); return dmg; }
  if (room.players?.has?.(front.id)) {
    const landed = damagePlayer(room, front, dmg);
    reflectThorns(room, front, attacker);
    return landed;
  }
  return hurtAllyToken(room, li, front, dmg, attacker);
}

// Spear, foe side (V2 §4.9): the front TWO of the unified line each take the full hit;
// an empty lane sends ONE hit through to the caravan.
export function foeHitFront2(room, li, dmg, attacker = null) {
  if (dmg <= 0) return;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");
  const line = laneLine(room, li);
  if (!line.length) { room.caravan.hp = Math.max(0, room.caravan.hp - dmg); return; }
  for (const v of line.slice(0, 2)) {
    if (room.players?.has?.(v.id)) { damagePlayer(room, v, dmg); reflectThorns(room, v, attacker); }
    else hurtAllyToken(room, li, v, dmg, attacker);
  }
}

// A foe's lane-AoE (Lightning): hits EVERY hero and EVERY friendly summon in the lane —
// the mirror of a player's `target:"lane"` deal hitting every foe in a lane. Nobody blocks
// for anybody (that's the point of AoE) and thorns don't fire (no single "striker" contact);
// an empty lane sends the hit through to the caravan. Auras still apply per victim.
export function foeHitLaneAll(room, li, dmg, attacker = null) {
  if (dmg <= 0) return;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");
  const allies = [...(room.allies[li] ?? [])];
  const heroes = laneHeroes(room, li);
  if (!allies.length && !heroes.length) { room.caravan.hp = Math.max(0, room.caravan.hp - dmg); return; }
  for (const al of allies) {
    al.lane = li; al.side = "hero";
    const cut = dmg - laneAura(room, al, "dmgReduce");
    if (cut <= 0) continue;
    const left = absorbShield(al, cut);
    if (left <= 0) continue;
    al.hp -= left;
    if (al.hp <= 0) { const i = room.allies[li].indexOf(al); if (i >= 0) room.allies[li].splice(i, 1); }
    else { runPassive(room, al, "damaged"); accelClocks(al, "damaged"); }
  }
  for (const p of heroes) damagePlayer(room, p, dmg);
}

// Ops that actually damage the hero side of a foe's lane (vs. heal/summon/ramp/move).
const FOE_DMG_OPS = new Set(["deal", "dealEachLane", "attack", "schoolStrike"]);
const opsHarm = (ops) => (ops ?? []).some((o) => FOE_DMG_OPS.has(o.do));
export const PASSIVE_BAR_COLOR = "#ff9ed2"; // the hue for a body's innate DAMAGING clock
// A short label for a body-timer bar. Damaging clocks read "✦N"; non-damaging timers (summon/heal)
// read with their own icon so a Royal Rat / Wageslave bar is legible at a glance.
function timerLabel(e, ops) {
  const harm = (ops ?? []).find((x) => FOE_DMG_OPS.has(x.do));
  if (harm) {
    if (harm.do === "dealEachLane") return "✦all";
    if (harm.do === "attack") return "✦" + effAtk(e);
    if (harm.do === "schoolStrike") return "✦" + powerFor(e, harm.school);
    return "✦" + ((harm.amount ?? 0) + (e.counters ?? 0));
  }
  const o = (ops ?? [])[0] ?? {};
  if (o.do === "summon") return "🐀" + (o.count ?? 1);
  if (o.do === "healSelf" || o.do === "heal") return "♥" + (o.amount ?? 0);
  if (o.do === "counter") return "▲" + (o.amount ?? 0);
  return "✦";
}
// Hue for a non-damaging timer bar (so it doesn't read as incoming damage).
function nonHarmColor(ops) {
  const o = (ops ?? [])[0] ?? {};
  if (o.do === "summon") return "#b8a3c9";                 // rat-purple
  if (o.do === "healSelf" || o.do === "heal") return "#74e69a"; // heal-green
  return "#8a93a3";                                        // neutral grey
}

// EVERY incoming-damage clock a foe runs, as an array of bars (one per source) — so a foe
// carrying two items, or an item PLUS a damaging passive, shows two color-coded bars. Each:
//   { kind:"item"|"passive", key?, label, color, frac (0..1), cd (ticks) }
// A foe attacks on three kinds of independent clock — its body timer (hourglass passives),
// each gear item, and any self-timed (`every:N`) passive — and only the DAMAGING ones go in
// here (a worn Aegis has no clock, so no bar; it shows as a 🛡 badge instead). Order is stable
// (passives, then gear in slot order) so bars don't jump around frame to frame.
// The hit a foe 'deal' op lands RIGHT NOW — the resolver AND the snapshot's threat-bar
// damage preview both call this, so the number printed on the bar can never lie.
export function foeDealHit(room, source, op, school) {
  // Gang Up, foe side: +N per OTHER foe in its lane
  const pals = op.perAlly ? op.perAlly * Math.max(0, (room.lanes[source.lane]?.length ?? 1) - 1) : 0;
  let hit = Math.round(((op.amount ?? 0) + pals + (school ? powerFor(source, school) : (source.counters ?? 0))) * (source.dmgMul ?? 1));
  if (school && hit < 1) hit = 1; // a weapon always lands ≥1, even on the wrong body
  return hit;
}
// What a foe clock will deal to the hero side when its bar fills — the sum of its ops'
// hits by the resolver's own math. AoE ops report the PER-TARGET hit (the label/text
// already says it's a lane/board hit). 0 = the clock doesn't damage (heal/summon bars).
export function foeOpsDmg(room, e, ops, school = null) {
  const dm = (x) => Math.round(x * (e.dmgMul ?? 1));
  let total = 0;
  for (const op of ops ?? []) {
    if (op.do === "deal") total += foeDealHit(room, e, op, school);
    else if (op.do === "schoolStrike") total += dm(powerFor(e, op.school));
    else if (op.do === "dealEachLane") total += dm((op.amount ?? 0) + (e.counters ?? 0));
    else if (op.do === "attack") total += dm(effAtk(e));
  }
  return total;
}
// Item version: echo bodies resolve a matching-school item's ops TWICE — show the total.
export const foeItemDmg = (room, e, key) => {
  const item = KIT[key];
  if (!item?.ops) return 0;
  const times = item.type && BODIES[e.bodyKey]?.echo === item.type ? 2 : 1;
  return foeOpsDmg(room, e, item.ops, item.type) * times;
};

export function foeThreats(room, e) {
  const body = BODIES[e.bodyKey] || {};
  const cdMul = e.cdMul ?? 1;
  const out = [];
  const frac = (charge, cd) => Math.min(1, (charge ?? 0) / cd);
  const pas = body.passive ?? [];
  const pc = e.pcharge || {};
  // EVERY body TIMER (damaging or not) gets a bar — damaging ones are pink/threat-colored, summon/
  // heal timers a neutral hue (`harm:false`) so a Royal Rat / Wageslave clock is visible but doesn't
  // read as incoming damage. Triggers (on sword/staff/damaged) are NOT bars — they ship as `tags`.
  pas.forEach((p, pi) => {
    const isTimer = p.every || p.on === "hourglass";
    if (!isTimer) return;
    const cd = (p.every ? p.every : body.cd) * cdMul * cdScale();
    if (!cd) return;                                       // cd:0 bodies have no hourglass clock
    const charge = p.every ? pc[pi] : e.charge;
    const harm = opsHarm(p.ops);
    out.push({ kind: "passive", harm, label: timerLabel(e, p.ops),
      dmg: harm ? foeOpsDmg(room, e, p.ops) : 0,           // the bar says how hard it hits
      color: harm ? PASSIVE_BAR_COLOR : nonHarmColor(p.ops), frac: frac(charge, cd), cd: Math.round(cd) });
  });
  for (const it of e.equipment ?? []) {
    if (it.spent || !opsHarm(KIT[it.key]?.ops)) continue;
    out.push({ kind: "item", harm: true, key: it.key, label: KIT[it.key]?.name ?? it.key, dmg: foeItemDmg(room, e, it.key),
      color: KIT[it.key]?.color ?? "#ccd", frac: frac(it.charge, it.cd), cd: it.cd });
  }
  // BOSS CLOCKS (V2 bosses): every mechanic clock gets a labeled bar; the damaging ones
  // (the Djinn's all-lanes scorch) carry the resolver's own number via `dmg`.
  for (const k of e.clocks ?? []) {
    out.push({ kind: "clock", harm: (k.dmg ?? 0) > 0, label: k.label ?? k.kind, dmg: k.dmg ?? 0,
      color: k.color ?? "#8a93a3", frac: frac(k.charge, k.cd), cd: k.cd });
  }
  return out;
}

// The SOONEST INCOMING DAMAGE from a foe, as { frac, cd } — drives the card's border heat + AoE
// alarm, so it only considers DAMAGING clocks (a healer/summoner shouldn't glow red). Null = none.
export function foeThreat(room, e) {
  const bars = foeThreats(room, e).filter((b) => b.harm);
  if (!bars.length) return null;
  const soonest = bars.reduce((a, b) => (b.frac > a.frac ? b : a));
  return { frac: soonest.frac, cd: soonest.cd };
}

// A foe's TRIGGER passives, as short ⚡ tags (no clock → no bar). Surfaces "when I sword/staff/take
// damage" effects that were previously invisible. Symmetric — used for the player's body line too.
export function bodyTags(bodyKey) {
  const out = [];
  for (const p of BODIES[bodyKey]?.passive ?? []) {
    if (p.on === "sword") out.push("⚡ on sword");
    else if (p.on === "staff") out.push("⚡ on staff");
    else if (p.on === "damaged") out.push(opsHarm(p.ops) ? "⚡ counter" : "⚡ when hit");
  }
  const ac = BODIES[bodyKey]?.accel; // the clock speed-up (Royal Rat / Fat Cat / Atlas)
  if (ac) out.push(`⏩ −${(ac.amount ?? 10) / 10}s ${ac.on === "damaged" ? "when hit" : "on " + ac.on}`);
  return out;
}

// The foe a player is currently aiming at, if it still exists. { foe, lane } or null.
// Aiming at the BACK-LINE boss attributes the hit to the ATTACKER's lane — "the lane the
// damaging source comes from" is a first-class fact (Hydra consumes it).
export function targetedFoe(room, player) {
  if (!player.targetId) return null;
  if (bossAlive(room) && player.targetId === room.boss.id)
    return { foe: room.boss, lane: player.lane };
  for (let i = 0; i < room.laneCount; i++) {
    const f = room.lanes[i].find((e) => e.id === player.targetId);
    if (f) return { foe: f, lane: i };
  }
  return null;
}

// Resolve an item's foe target (owner ruling 2026-06-10: melee NEVER reaches sideways).
//  'pick'  = RANGED: your aimed foe anywhere on the board (falls back to your lane's front).
//  'front' = MELEE: the front foe of YOUR OWN lane, no matter where the reticle points —
//            hitting something two lanes away with a sword is silly.
// The BACK-LINE boss is the lane's back wall: melee reaches it only when the lane has no
// foes in front (lane-blocking summons — heads, tentacles — re-wall the lane); ranged can
// always aim at it via 'pick'.
export function aimedFoe(room, player, kind) {
  if (kind === "pick") {
    const t = targetedFoe(room, player);
    if (t) return t;
  }
  const arr = room.lanes[player.lane];
  if (arr[0]) return { foe: arr[0], lane: player.lane };
  return bossAlive(room) ? { foe: room.boss, lane: player.lane } : null;
}

export function setTarget(room, player, foeId) {
  player.targetId = foeId; // validity is checked at resolve time
}

// V2 §4.1 — the ALLY-target slot, beside the foe slot. Click a foe → foe-target; click an
// ally → ally-target. Support items (Heal) read ONLY this; offense reads ONLY targetId.
export function setAllyTarget(room, player, allyId) {
  player.allyTargetId = allyId; // validity checked at resolve time (dead/gone → fallback)
}

// Flat list of all foes (lane order, front-first; the back-line boss last) — Tab cycling
// and the aim fallback both walk this, so the boss is always targetable.
const allFoes = (room) => [
  ...room.lanes.flatMap((arr, i) => arr.map((e) => ({ foe: e, lane: i }))),
  ...(bossAlive(room) ? [{ foe: room.boss, lane: 0 }] : []),
];

// Tab through targets in order (dir +1/-1).
export function cycleTarget(room, player, dir = 1) {
  const foes = allFoes(room);
  if (!foes.length) { player.targetId = null; return; }
  const idx = foes.findIndex((x) => x.foe.id === player.targetId);
  const next = idx < 0 ? 0 : (idx + dir + foes.length) % foes.length;
  player.targetId = foes[next].foe.id;
}

// Every player always has a valid aim during combat (default = a foe in their lane).
export function ensureTarget(room, player) {
  if (targetedFoe(room, player)) return;
  const own = room.lanes[player.lane];
  if (own[0]) { player.targetId = own[0].id; return; }
  const foes = allFoes(room);
  player.targetId = foes.length ? foes[0].foe.id : null;
}

// Summon `count` bodies into the source's lane — on the SOURCE's side. A foe summons
// foes; a hero (or friendly summon) summons allies. The symmetric reinforcement verb.
export function summonBodies(room, source, op) {
  // A summon of a DELETED body (e.g. King Mimic's old court, pre-boss-slice) must spawn
  // nothing — an unknown key would enter as a 0-HP ghost that still counts for foeCount,
  // holding the King's ward up off an invisible court.
  if (!BODIES[op.body]) return;
  const baseLane = Math.max(0, Math.min(room.laneCount - 1, source.lane | 0));
  for (let k = 0; k < (op.count ?? 1); k++) {
    const li = op.lane != null ? Math.max(0, Math.min(room.laneCount - 1, op.lane | 0)) : baseLane;
    const into = source.side === "hero" ? room.allies[li] : room.lanes[li];
    const tok = spawnEnemy(op.body, op.gear ?? []); // `summonArmed` passes gear → a real threatening court
    tok.side = source.side; tok.lane = li;
    if (source.side === "hero") {
      // tokens join the unified line at the FRONT (meat-shield default; heroes ↑ past them)
      const line = laneLine(room, li);
      tok.depth = line.length ? (line[0].depth ?? 0) - 1 : 0;
    }
    into.push(tok);
  }
}

// Fire a body's passive for a given trigger ("hourglass" = its timer, "damaged" = on hit).
export function runPassive(room, combatant, trigger) {
  const passive = BODIES[combatant.bodyKey]?.passive;
  if (!passive) return;
  // `every:N` passives run on their OWN clock (see simulateTick), never on triggers.
  const ops = passive.filter((x) => x.on === trigger && !x.every).flatMap((x) => x.ops);
  if (ops.length) resolveOps(room, combatant, ops);
}

// Fire a combatant's school-keyed triggers ("when I sword / when I staff") after a matching-icon
// item OR a schoolStrike resolves. physical→"sword", magical→"staff". Symmetric (players + foes).
// Also feeds school-keyed `accel` clocks (Royal Rat / Paid Piper summon-bar speed-ups).
export function fireSchoolTrigger(room, source, type) {
  const trig = type === "physical" ? "sword" : type === "magical" ? "staff" : null;
  if (!trig) return;
  runPassive(room, source, trig);
  accelClocks(source, trig);
}

// Tick a combatant's self-timed (`every:N`) passives, each on its own independent clock
// (stored in `pcharge`). Decoupled from the body timer and from any player action.
export function tickOwnTimers(room, c) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas) return;
  c.pcharge = c.pcharge || {};
  for (let pi = 0; pi < pas.length; pi++) {
    if (!pas[pi].every) continue;
    c.pcharge[pi] = (c.pcharge[pi] ?? 0) + 1;
    if (c.pcharge[pi] >= pas[pi].every * (c.cdMul ?? 1) * cdScale()) { c.pcharge[pi] = 0; resolveOps(room, c, pas[pi].ops); }
  }
}

// Acid Rain / Rat Colony: advance the room's global cooldown bars; fire each on completion.
function processRoomTimers(room) {
  for (const t of room.roomTimers ?? []) {
    if (++t.charge < t.cd) continue;
    t.charge = 0;
    if (t.kind === "acid") {                                   // 1 to each hero AND each hero-summon
      for (const p of room.players.values()) damagePlayer(room, p, t.amount ?? 1);
      for (const lane of room.allies) for (const al of [...lane]) {
        const left = absorbShield(al, t.amount ?? 1);
        if (left > 0 && (al.hp -= left) <= 0) { const i = lane.indexOf(al); if (i >= 0) lane.splice(i, 1); }
      }
    } else if (t.kind === "ratSpawn") {                        // a rat joins the enemy in a random lane
      const li = Math.floor(Math.random() * room.laneCount);
      const rat = spawnEnemy("rat"); rat.side = "foe"; rat.lane = li; room.lanes[li].push(rat);
    }
  }
}

// The most-wounded friendly in the source's lane (self included) — Heal's auto-target. A hero
// heals heroes+allies; a foe heals foes. Returns null if nobody's hurt to pick.
function lowestHpFriendly(room, source) {
  const li = source.lane;
  const pool = source.side === "foe"
    ? room.lanes[li]
    : [...laneHeroes(room, li), ...(room.allies?.[li] ?? [])];
  let best = null;
  for (const c of pool) if (c && c.hp > 0 && (best === null || c.hp / c.maxHp < best.hp / best.maxHp)) best = c;
  return best;
}

export function resolveOps(room, source, ops, school = null) {
  for (const op of ops) {
    const amt = op.amount ?? 0;
    const li = source.lane, lane = room.lanes[li];

    // Foes are simpler: damage lands on the hero side of their lane; summon adds to it.
    if (source.side === "foe") {
      const dm = (x) => Math.round(x * (source.dmgMul ?? 1));                     // Aggressive room: ×1.2 outgoing
      // school-tagged items scale with the foe's sword/staff Power (symmetry); school-less passives
      // keep their flat amount (+ counters, for ramping bosses). `target:"lane"` AoE hits the whole
      // hero side of the lane (mirrors a player's lane deal hitting every foe in a lane).
      if (op.do === "deal") {
        const hit = foeDealHit(room, source, op, school); // Gang Up + Power + the ≥1 weapon floor
        if (op.target === "lane") foeHitLaneAll(room, li, hit, source);
        else if (op.target === "front2") foeHitFront2(room, li, hit, source);
        else {
          const landed = foeHitLane(room, li, hit, source);
          if (op.lifesteal && landed > 0) source.hp = Math.min(source.maxHp, source.hp + landed); // Darkness
        }
      }
      else if (op.do === "schoolStrike") { foeHitLane(room, li, dm(powerFor(source, op.school)), source); fireSchoolTrigger(room, source, op.school); }
      else if (op.do === "dealEachLane") {                                       // boss: chip every lane at once
        const each = dm(amt + (source.counters ?? 0));                          // amount 0 → pure counter-scaled (Hydra)
        if (each > 0) for (let l = 0; l < room.laneCount; l++) foeHitLane(room, l, each, source);
      }
      else if (op.do === "attack") foeHitLane(room, li, dm(effAtk(source)), source); // strike for its attack
      else if (op.do === "healAttack") source.hp = Math.min(source.maxHp, source.hp + effAtk(source));
      else if (op.do === "summon" || op.do === "summonArmed") summonBodies(room, source, op);
      else if (op.do === "healSelf" || op.do === "heal") source.hp = Math.min(source.maxHp, source.hp + amt);
      else if (op.do === "healAlly") { const t = lowestHpFriendly(room, source); if (t) t.hp = Math.min(t.maxHp, t.hp + amt + powerFor(source, school)); }
      else if (op.do === "shield") source.shield = (source.shield ?? 0) + amt;  // per-body buffer (self)
      else if (op.do === "thorns") source.thorns = (source.thorns ?? 0) + amt;  // per-fight spikes (symmetric)
      else if (op.do === "counter") source.counters = (source.counters ?? 0) + amt; // ramps its attack
      continue;
    }

    switch (op.do) {
      case "deal": {
        let bonus = powerFor(source, school);             // Physical/Magical Power scales the item
        if (op.perAlly) {                                 // Gang Up: +N per OTHER ally (heroes + summons) in your lane
          const others = heroesInLane(room, source.lane).length - 1 + (room.allies?.[source.lane]?.length ?? 0);
          bonus += op.perAlly * Math.max(0, others);
        }
        // a weapon always lands AT LEAST 1 (owner 2026-06-10): a zero-base school item on
        // a wrong-school body (Scary Knife on a summoner) must still deal damage
        let dmg = amt + bonus;
        if (school && dmg < 1) dmg = 1;
        if (op.target === "lane") {                       // V2: every foe in YOUR lane (Lightning/Blizzard)
          for (const e of [...room.lanes[source.lane]]) damageEnemy(room, source.lane, e, dmg, source);
          break;
        }
        if (op.target === "front2") {                     // Spear: the front TWO foes in your lane
          for (const e of [...room.lanes[source.lane].slice(0, 2)]) damageEnemy(room, source.lane, e, dmg, source);
          break;
        }
        const t = aimedFoe(room, source, op.target);     // 'front' or 'pick'
        if (t) {
          const landed = damageEnemy(room, t.lane, t.foe, dmg, source);
          if (op.lifesteal && landed > 0) source.hp = Math.min(source.maxHp, source.hp + landed); // Darkness
        }
        break;
      }
      case "move": {                                      // legacy: shove the aimed foe over a lane
        const t = aimedFoe(room, source, op.target);
        if (t) {
          const from = room.lanes[t.lane], idx = from.indexOf(t.foe);
          if (idx >= 0) { from.splice(idx, 1); room.lanes[(t.lane + 1) % room.laneCount].push(t.foe); }
        }
        break;
      }
      case "pushBack": {                                  // Wind: send the aimed foe to the BACK of its lane
        const t = aimedFoe(room, source, op.target ?? "pick");
        if (t) {
          const arr = room.lanes[t.lane], idx = arr.indexOf(t.foe);
          if (idx >= 0 && arr.length > 1) { arr.splice(idx, 1); arr.push(t.foe); }
        }
        break;
      }
      case "delay": {                                     // charge drain (V2 §4.7): push EVERY clock back
        const drain = (f) => {
          f.charge = Math.max(0, (f.charge ?? 0) - amt);
          if (f.equipment) for (const it of f.equipment) it.charge = Math.max(0, it.charge - amt);
          if (f.pcharge) for (const k in f.pcharge) f.pcharge[k] = Math.max(0, f.pcharge[k] - amt); // every:N clocks too
          if (f.clocks) for (const k of f.clocks) k.charge = Math.max(0, k.charge - amt);           // boss clocks too
        };
        if (op.target === "lane") { for (const e of room.lanes[source.lane]) drain(e); break; } // Blizzard
        const t = aimedFoe(room, source, op.target);
        if (t) drain(t.foe);
        break;
      }
      case "summon":   summonBodies(room, source, op); break; // hero summons an ally (V2 §4.10: items do this now)
      case "attack": { // SYMMETRY: a worn body's "attack/I-sword" passive strikes a foe for its effective Power
        const t = aimedFoe(room, source, op.target ?? "front");
        if (t) damageEnemy(room, t.lane, t.foe, effAtk(source), source);
        break;
      }
      case "healAttack": source.hp = Math.min(source.maxHp, source.hp + effAtk(source)); break; // lifesteal-style body passive
      case "healAlly": {
        // V2 §4.1: support reads your ALLY-target slot (click an ally), falling back to the
        // most-hurt friendly in your lane (self included). Offense never reads this slot —
        // wrong-target states are unrepresentable, so no per-item validation exists anywhere.
        const at = source.allyTargetId != null ? room.players?.get(source.allyTargetId) : null;
        const t = (at && at.alive) ? at : lowestHpFriendly(room, source);
        if (t) t.hp = Math.min(t.maxHp, t.hp + amt + powerFor(source, school));
        break;
      }
      case "schoolStrike": { // "I sword/staff": deal my school Power to a foe, then emit that school's trigger
        const ts = aimedFoe(room, source, op.target ?? "front");
        if (ts) damageEnemy(room, ts.lane, ts.foe, powerFor(source, op.school), source);
        fireSchoolTrigger(room, source, op.school);
        break;
      }
      case "shield":   source.shield = (source.shield ?? 0) + amt; break; // per-body buffer (self)
      case "thorns":   source.thorns = (source.thorns ?? 0) + amt; break; // Spikes: per-fight reflect buff
      case "healSelf": source.hp = Math.min(source.maxHp, source.hp + amt); break;
      case "counter":  source.counters = (source.counters ?? 0) + amt; break;
      default: break; // verb not implemented yet — intentional, never silently wrong
    }
  }
}

export function useItem(room, player, slot) {
  if (room.phase !== "playing" || !player.alive) return;
  const body = BODIES[player.bodyKey];
  const inv = player.inv[slot];
  if (!inv || inv.spent) return;        // a spent fragile item is done for the fight
  if (inv.stolen) return;               // the Kraken has it — kill the stolen entity to take it back
  if (inv.charge < itemCd(inv, body)) return; // not ready (body tempo bends cd)
  const item = KIT[inv.key];
  // ECHO (V2 §4.3): a matching-school body resolves the item's OPS twice on one press.
  // The school trigger still fires once — echo doubles the item, not the body's reaction.
  const times = item?.type && body?.echo === item.type ? 2 : 1;
  if (item?.ops) for (let n = 0; n < times; n++) resolveOps(room, player, item.ops, item.type);
  if (item?.type) fireSchoolTrigger(room, player, item.type); // "when I sword/staff" fires after the item
  inv.charge = 0;
  if (item?.fragile) inv.spent = true;
  if (item?.ops?.length) tickDjinnCounter(room, player); // Djinn: every 3rd item the PARTY uses bites back (worn passives don't count)
}

// Djinn of Deals (BOSS_SPEC_V1): a PARTY-WIDE item-use counter — every player's use ticks
// it; every 3rd use, the Djinn conjures an item-entity of its own into the lane of the
// player whose use tripped the counter. One press = one tick (echo doubles ops, not uses).
export function tickDjinnCounter(room, player) {
  const djinn = room.lanes.flat().find((f) => f.bodyKey === "djinn" && f.hp > 0);
  if (!djinn) return;
  room.itemUses = (room.itemUses ?? 0) + 1;
  if (room.itemUses % (BOSS_DEFS.djinn.everyNthItem ?? 3) !== 0) return;
  spawnItemEntity(room, rnd(DJINN_ITEM_POOL), player.lane);
}

// Total foes on the board (used by the King Mimic ward).
export const foeCount = (room) => room.lanes.reduce((n, l) => n + l.length, 0);

// Boss defensive flags fold incoming damage into what actually lands:
//  • ward (King Mimic): immune while any OTHER foe is on the board — clear the court first.
//  • dmgReduce (Litigation Lich): every hit is softened, but at least 1 always slips through.
// Ordinary foes have no flags, so this is a no-op for them (pure foe/hero symmetry preserved).
// Flat damage reduction a combatant carries from WORN passive items (Aegis). Symmetric: a
// player reads `inv`, a foe reads `equipment` — same gear, same softening of every incoming hit.
export function itemDmgReduce(combatant) {
  const gear = combatant?.inv ?? combatant?.equipment ?? [];
  return gear.reduce((s, it) => s + (it?.spent ? 0 : (KIT[it.key]?.passive?.dr ?? 0)), 0);
}

export function effectiveDamageTo(room, enemy, amount) {
  const body = BODIES[enemy.bodyKey] ?? {};
  if (body.ward && foeCount(room) > 1) return 0;       // protected while its court stands
  if (body.dmgReduce && amount > 0) amount = Math.max(1, amount - body.dmgReduce);
  // Litigation Lich stances (BOSS_SPEC_V1): ⚖ OBJECTION caps every hit it takes at 1;
  // recess softens every hit by 1, but a point always slips through (the engine's existing
  // ≥1 convention — so school-tagged deals keep their weapon floor unless the CAP is up).
  if (enemy.stance === "objection" && amount > 0) amount = Math.min(amount, 1);
  else if (enemy.stance === "recess" && amount > 0) amount = Math.max(1, amount - 1);
  const dr = itemDmgReduce(enemy);                      // worn Aegis softens every hit (floor 0)
  if (dr && amount > 0) amount = Math.max(0, amount - dr);
  return amount;
}

// Hero-side damage to a foe. `attacker` (the hero/summon dealing it) feeds the lane auras
// (Flag: +1 out) and thorns reflection; pass nothing for source-less damage (acid, thorns).
// Returns the damage that LANDED (past ward/armor/auras, into shield+HP) — lifesteal's feed.
export function damageEnemy(room, laneIdx, enemy, amount, attacker = null) {
  enemy.lane = laneIdx; enemy.side = "foe";
  if (attacker) amount += laneAura(room, attacker, "dmgBonus");  // hero-side Flag/Knight
  amount -= laneAura(room, enemy, "dmgReduce");                  // a foe-side Totem softens the hit
  amount = effectiveDamageTo(room, enemy, amount);
  if (amount <= 0) return 0;                            // warded/fully-absorbed: no hit, no on-damaged trigger
  const landed = amount;
  amount = absorbShield(enemy, amount);                 // its shield buffer eats the hit before HP
  if (amount > 0) {
    enemy.hp -= amount;
    if (enemy.hp <= 0) {
      const lane = room.lanes[laneIdx];
      const i = lane.indexOf(enemy);
      if (i >= 0) lane.splice(i, 1);
      if (enemy === room.boss) room.boss = null;        // the back-line boss falls (never in a lane array)
      // Kraken rescue: killing a stolen-item entity returns the item to its owner's hotbar
      // mid-fight — the lock is exactly as long as the entity lives.
      if (enemy.restoreTo) {
        const owner = room.players?.get?.(enemy.restoreTo.playerId);
        const iv = owner?.inv?.find((x) => x.stolen && x.key === enemy.restoreTo.key);
        if (iv) iv.stolen = false;
      }
      const b = BODIES[enemy.bodyKey] ?? {};
      if (!b.summon && !b.boss) room.unlockedBodies.add(enemy.bodyKey); // the mimic (summons/bosses aren't adoptable loot)
    } else {
      runPassive(room, enemy, "damaged"); // e.g. Fat Cat spawns a rat when hit
      accelClocks(enemy, "damaged");              // Atlas: a hit speeds its ramp clock
      if (BODIES[enemy.bodyKey]?.boss) bossOnDamaged(room, enemy, laneIdx); // Hydra: a head re-walls the damaged lane
    }
  }
  reflectThorns(room, enemy, attacker);   // a thorned foe spikes its striker back
  return landed;
}

// Returns the damage that LANDED (past auras/armor, into shield+HP).
export function damagePlayer(room, p, amount) {
  if (!p.alive) return 0;
  amount -= laneAura(room, p, "dmgReduce");       // Totem/Knight: lane allies take −1
  const dr = itemDmgReduce(p);                    // worn Crown softens every incoming hit (floor 0)
  if (dr && amount > 0) amount = Math.max(0, amount - dr);
  if (amount <= 0) return 0;
  const landed = amount;
  amount = absorbShield(p, amount);               // per-body shield buffer eats the hit before HP
  if (amount <= 0) return landed;
  p.hp -= amount;
  if (p.hp <= 0) { p.hp = 0; p.alive = false; } // out for the rest of the fight; revived on room clear
  else { runPassive(room, p, "damaged"); accelClocks(p, "damaged"); } // SYMMETRY: worn on-damaged passives + Atlas clock
  return landed;
}

// One simulation step. Pure: never broadcasts. The server calls this then broadcasts.
export function simulateTick(room) {
  room.tick++;
  if (room.phase !== "playing") return;

  for (const p of room.players.values()) {
    if (!p.alive) continue; // downed heroes stay out until the room is cleared — no mid-combat revive
    ensureTarget(room, p); // always keep a valid aim
    const body = BODIES[p.bodyKey];
    for (const inv of p.inv) {
      const max = itemCd(inv, body);
      if (inv.charge < max) inv.charge++;
    }
    // SYMMETRY: a worn body's passives fire for the player exactly as they do for a foe. Self-timed
    // `every:N` clocks (Royal Rat summon, Wageslave heal) run via tickOwnTimers; the hourglass timer
    // fires the body's on-hourglass passive. Only the kit items stay manual (click-to-fire).
    tickOwnTimers(room, p);
    if (body?.cd > 0) {
      p.charge = (p.charge ?? 0) + 1;
      if (p.charge >= body.cd * cdScale()) { p.charge = 0; runPassive(room, p, "hourglass"); }
    }
  }

  for (let i = 0; i < room.laneCount; i++) {
    for (const e of [...room.lanes[i]]) { // copy: passives/summons may grow the lane mid-tick
      e.side = "foe"; e.lane = i;
      // items: each charges and fires through the shared resolver (fragile fires once)
      if (e.equipment) for (const it of e.equipment) {
        if (it.spent) continue;
        if (it.charge < it.cd) { it.charge++; continue; }
        it.charge = 0;
        const item = KIT[it.key];
        // symmetric ECHO: a matching-school foe body resolves its item's ops twice
        const times = item?.type && BODIES[e.bodyKey]?.echo === item.type ? 2 : 1;
        if (item?.ops) for (let n = 0; n < times; n++) resolveOps(room, e, item.ops, item.type);
        if (item?.type) fireSchoolTrigger(room, e, item.type); // foe "when I sword/staff" fires too (symmetry)
        if (item?.fragile) it.spent = true;
      }
      // per-passive independent timers: a passive carrying `every:N` runs on its OWN
      // clock, decoupled from the body timer and from anything the players do — so a
      // body can ramp every 3.5s AND heal every 5s at their own cadences (visible ramps).
      tickOwnTimers(room, e);
      // a lane-bound boss (the Djinn) runs its mechanics on boss clocks, not passives
      if (e.clocks) tickBossClocks(room, e);
      // body timer: on completion, fire its (non-self-timed) hourglass passives. Foes
      // have NO base swing — damage comes from items and passives, like players.
      e.charge++;
      if (e.charge < BODIES[e.bodyKey].cd * (e.cdMul ?? 1) * cdScale()) continue; // enchant may hasten
      e.charge = 0;
      runPassive(room, e, "hourglass"); // e.g. Royal Rat summons; an attacker strikes
    }
  }

  // friendly summons: same timing rules, but they attack the front FOE in their lane
  for (let i = 0; i < room.laneCount; i++) {
    for (const al of [...room.allies[i]]) {
      al.side = "hero"; al.lane = i;
      tickOwnTimers(room, al); // self-timed passives act here (e.g. the rat's every-2s attack)
      if (BODIES[al.bodyKey]?.cd > 0) {           // summoner allies fire on their body clock
        al.charge = (al.charge ?? 0) + 1;
        if (al.charge >= BODIES[al.bodyKey].cd * cdScale()) { al.charge = 0; runPassive(room, al, "hourglass"); }
      }
    }
  }

  // the BACK-LINE boss (Hydra/Lich/Kraken) ticks its clocks from behind the lanes
  if (bossAlive(room)) { room.boss.side = "foe"; tickBossClocks(room, room.boss); }

  processRoomTimers(room); // Acid Rain / Rat Colony global bars

  const enemiesLeft = room.lanes.reduce((n, l) => n + l.length, 0) + (bossAlive(room) ? 1 : 0);
  const heroesAlive = [...room.players.values()].some((p) => p.alive);
  const alliesLeft = room.allies.reduce((n, l) => n + l.length, 0);
  if (room.caravan.hp <= 0) room.phase = "lost";
  else if (enemiesLeft === 0) {
    room.phase = "won";
    // Clearing a room patches the party back up — full heal + revive any downed heroes,
    // so you head into the loot/next-room screen whole.
    for (const p of room.players.values()) { p.alive = true; p.downTimer = 0; p.hp = p.maxHp; }
    // Loot = the items the stocked foes carried (+ any bonus the enchantment grants). It's a
    // shared scarce set; claiming COSTS its value. The room's ante V is split across the
    // party right now (1:1 — the foes pay what they were worth to invite).
    const gear = (room.draftedFoes ?? []).flatMap((f) => f.gear ?? []).filter((k) => KIT[k]);
    if (room.enchant?.bonusLoot) gear.push(...room.enchant.bonusLoot.filter((k) => KIT[k]));
    room.loot = gear;
    creditRoomIncome(room);                 // split V across the party (after loot is set)
    const cur = currentNode(room);
    if (cur && cur.type === "boss") { cur.cleared = true; room.levelComplete = true; }
  }
  // Deadlock guard — combat must always terminate. A fully-downed party can never clear
  // the room (no mid-combat revive), and a surviving foe may have no way to damage the
  // caravan (e.g. a spent fragile item + only a reactive passive), so the caravan would
  // never fall either → an infinite stall. With no living hero AND no summons left to
  // carry the fight, resolve it as the loss it already is. (Checked AFTER the win above,
  // so an ally that clears the board on its dying tick still scores the win.)
  else if (!heroesAlive && alliesLeft === 0) room.phase = "lost";

  // Anti-stall termination guarantee: track the best progress toward EITHER outcome (lowest
  // total foe HP and lowest caravan HP ever seen this fight). If neither improves for
  // STALL_LIMIT ticks, the party has stalled out (e.g. a healer it can't out-damage) → loss.
  if (room.phase === "playing") {
    const totalFoeHp = room.lanes.reduce((s, l) => s + l.reduce((a, f) => a + Math.max(0, f.hp), 0), 0)
      + (bossAlive(room) ? Math.max(0, room.boss.hp) : 0); // chipping the back-line boss IS progress

    const improved = totalFoeHp < (room._bestFoeHp ?? Infinity) || room.caravan.hp < (room._bestCav ?? Infinity);
    room._bestFoeHp = Math.min(room._bestFoeHp ?? Infinity, totalFoeHp);
    room._bestCav = Math.min(room._bestCav ?? Infinity, room.caravan.hp);
    if (improved) room._stallTicks = 0;
    else if ((room._stallTicks = (room._stallTicks ?? 0) + 1) >= STALL_LIMIT) room.phase = "lost";
  }
}

// ---------------------------------------------------------------------------
// Snapshot (client state)
// ---------------------------------------------------------------------------
// The client only needs each body's DISPLAY fields (name/color/stats/passiveText/
// tempo). Strip the internal `passive` op-trees and the `spawn` flag so we don't ship
// (or leak) the whole mechanic definition ~10×/sec — the bulk of the per-tick payload.
const publicBody = ({ passive, spawn, ...rest }) => ({ ...rest, maxHp: bodyMaxHp(rest) });
// BODIES is static, so build the public projection ONCE and reuse it every snapshot
// (it was rebuilt 10×/sec/room). The only live input is the HP knob — rebuild on change.
let _publicBodies = null, _publicBodiesMult = null;
export const publicBodies = () => {
  if (!_publicBodies || _publicBodiesMult !== _hpMult) {
    _publicBodies = Object.fromEntries(Object.entries(BODIES).map(([k, b]) => [k, publicBody(b)]));
    _publicBodiesMult = _hpMult;
  }
  return _publicBodies;
};

export function snapshot(room) {
  return {
    type: "state",
    phase: room.phase,
    god: !!room.god,
    tick: room.tick,
    floor: room.floor ?? 1,
    laneCount: room.laneCount ?? LANES,   // N columns for the renderer (= player count, 1–4)
    enchant: room.enchant ? { name: room.enchant.name, text: room.enchant.text } : null,
    roomTimers: (room.roomTimers ?? []).map((t) => ({ kind: t.kind, frac: Math.min(1, (t.charge ?? 0) / t.cd), cd: t.cd })),
    lanes: room.lanes.map((arr, i) => ({
      enemies: arr.map((e) => ({
        id: e.id, bodyKey: e.bodyKey, name: e.name ?? BODIES[e.bodyKey]?.name ?? e.bodyKey, hp: e.hp, maxHp: e.maxHp, shield: e.shield ?? 0, charge: e.charge,
        cd: Math.round((BODIES[e.bodyKey]?.cd ?? 0) * (e.cdMul ?? 1) * cdScale()),
        threat: foeThreat(room, e),     // {frac, cd} soonest INCOMING damage — drives border heat + AoE alarm
        threats: foeThreats(room, e),   // ALL damaging clocks (one labeled, color-coded bar each)
        reactive: (BODIES[e.bodyKey]?.passive ?? []).some((p) => p.on === "damaged" && opsHarm(p.ops)), // hits back when struck (no clock)
        tags: bodyTags(e.bodyKey),      // ⚡ trigger labels (on sword/staff/when hit) — no clock, shown as tags
        dr: itemDmgReduce(e),           // worn damage reduction (Aegis) → 🛡 badge
        passive: e.passiveText ?? BODIES[e.bodyKey]?.passiveText ?? null,
        boss: !!BODIES[e.bodyKey]?.boss,
        aoe: (BODIES[e.bodyKey]?.passive ?? []).some((p) => (p.ops ?? []).some((o) => o.do === "dealEachLane"))
          || (e.clocks ?? []).some((k) => k.aoe), // telegraph: hits EVERY lane (Djinn's scorch clock too)
        warded: !!BODIES[e.bodyKey]?.ward && foeCount(room) > 1, // King Mimic: untouchable until its court falls
        atk: effPhys(e), phys: effPhys(e), mag: effMag(e), counters: e.counters ?? 0,
        thorns: e.thorns ?? 0,                              // spikes buff → 🌵 badge
        aura: BODIES[e.bodyKey]?.aura ?? null,              // foe-side Totem/Flag token badge
        gear: (e.equipment ?? []).map((it) => ({
          key: it.key, name: KIT[it.key]?.name ?? it.key, text: KIT[it.key]?.text ?? "", charge: it.charge, cd: it.cd, spent: !!it.spent,
          color: KIT[it.key]?.color ?? null, passive: isPassiveItem(it.key),
        })),
      })),
      allies: (room.allies?.[i] ?? []).map((a) => ({
        bodyKey: a.bodyKey, hp: a.hp, maxHp: a.maxHp,
        depth: a.depth ?? 0,                      // tokens sit IN the lane's unified line now
        aura: BODIES[a.bodyKey]?.aura ?? null,    // aura tokens get a distinct ring client-side
      })),
    })),
    caravan: room.caravan,
    // THE BACK-LINE BOSS — the caravan-mirror on the foe side: the renderer draws it wide
    // behind the foe rows. Stance telegraphs + every mechanic clock ride along as bars.
    boss: bossAlive(room) ? {
      id: room.boss.id, bodyKey: room.boss.bodyKey,
      name: BODIES[room.boss.bodyKey]?.name ?? room.boss.bodyKey,
      hp: room.boss.hp, maxHp: room.boss.maxHp,
      color: BODIES[room.boss.bodyKey]?.color ?? "#ffd24a",
      passive: BODIES[room.boss.bodyKey]?.passiveText ?? null,
      stance: room.boss.stance ?? null,
      stanceLabel: room.boss.stance === "objection" ? "⚖ OBJECTION — capped at 1"
                 : room.boss.stance === "recess" ? "recess — bleed it" : null,
      headWave: room.boss.headWave ?? null,         // Hydra: how many heads the NEXT clock brings
      tentacleCap: room.boss.tentacleCap ?? null,   // Kraken: the wall it replenishes to
      threats: foeThreats(room, room.boss),         // its clocks as labeled, color-coded bars
    } : null,
    map: room.level
      ? { nodes: room.level.nodes, currentId: room.level.currentId, levelComplete: !!room.levelComplete,
          bossName: BODIES[bossForFloor(room, room.floor ?? 1)]?.name ?? null } // run-seeded preview: the floor's boss by name
      : null,
    unlockedBodies: [...room.unlockedBodies],
    bodies: publicBodies(),
    tiersReached: tiersReached(room),
    tierCosts: TIER_COSTS,          // client labels tier buttons from this (no hardcoded mirror)
    roomValue: room.lastRoomValue ?? 0,   // V mirrored to every wallet on the last clear (display)
    loot: room.phase === "won" && room.loot?.length ? {
      cards: room.loot.map((k) => ({ key: k, name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "", cd: KIT[k]?.cd ?? null, value: itemTreasure(k) })),
    } : null,
    // pending player-to-player trade offers (out of combat only) — value gap settled in treasure
    trade: tradeable(room) ? {
      offers: (room.tradeOffers ?? []).map((o) => ({
        id: o.id, from: o.from, to: o.to,
        fromName: room.players.get(o.from)?.name ?? "?", toName: room.players.get(o.to)?.name ?? "?",
        give: o.give, giveName: KIT[o.give]?.name ?? o.give, giveVal: itemTreasure(o.give),
        want: o.want, wantName: KIT[o.want]?.name ?? o.want, wantVal: itemTreasure(o.want),
      })),
    } : null,
    shop: room.phase === "shop" && room.shop ? {
      rerollCost: SHOP_REROLL_COST,
      wares: (room.shop.wares ?? []).map((w) => ({
        key: w.key, name: KIT[w.key]?.name ?? w.key, text: KIT[w.key]?.text ?? "",
        cd: KIT[w.key]?.cd ?? null, type: KIT[w.key]?.type ?? null, cost: w.cost,
      })),
    } : null,
    stock: room.phase === "stock" ? {
      max: STOCK_MAX,
      picksRequired: room.picksRequired ?? 1,         // 1 each · DOUBLE FEATURE: 2 each
      picks: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, picks: playerPicks(room, p.id) })),
      canBegin: stockReady(room),
      anteStocked: anteCurrent(room),                 // total invited weight (display)
      greedTreasure: room.draftedFoes.reduce((s, f) => s + foeLootValue(f), 0), // ITEM loot only
      palette: room.foePalette.map((o) => ({
        bodyKey: o.bodyKey, name: BODIES[o.bodyKey].name, maxHp: bodyMaxHp(BODIES[o.bodyKey]),
        phys: BODIES[o.bodyKey]?.phys ?? 0, mag: BODIES[o.bodyKey]?.mag ?? 0, // body Power — what its gear scales with
        ante: anteOfFoe(o),                 // ← THE BIG NUMBER (body weight + items)
        tier: BODIES[o.bodyKey]?.ante ?? 0, // body tier (mimic / tier-unlock economy)
        bodyAnte: bodyAnteOf(o),            // the body's ante weight alone
        lootValue: foeLootValue(o),         // gear → Treasure if you don't claim it
        passive: BODIES[o.bodyKey]?.passiveText ?? null,
        gear: (o.gear ?? []).map((k) => ({ name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "" })),
      })),
      placed: (() => { const ln = placedLanes(room); return room.draftedFoes.map((f, i) => {
        const b = BODIES[f.bodyKey] ?? {};
        return {
          bodyKey: f.bodyKey, name: b.name ?? f.bodyKey, lane: ln[i],
          // full inspect payload — the stock screen's hover card reads these
          maxHp: bodyMaxHp(b), phys: b.phys ?? 0, mag: b.mag ?? 0,
          passive: b.passiveText ?? null,
          ante: anteOfFoe(f), tier: b.ante ?? 0,
          bodyAnte: bodyAnteOf(f), lootValue: foeLootValue(f),
          gear: (f.gear ?? []).map((k) => ({ name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "" })),
          greedy: !!f.greedy, owner: f.owner ?? null,
        };
      }); })(),
    } : null,
    draft: room.phase === "draft" ? {
      // THE WHEEL — the live draft: lowest-power bodies, each with a 3-item bundle; lock one
      // exclusively. `lockedBy` is the player id holding it (off-limits to everyone else).
      wheel: (room.draftWheel ?? []).map((b) => ({
        id: b.id, bodyKey: b.bodyKey, name: BODIES[b.bodyKey].name, maxHp: BODIES[b.bodyKey].maxHp,
        color: BODIES[b.bodyKey].color, passive: BODIES[b.bodyKey]?.passiveText ?? null,
        lockedBy: [...room.players.values()].find((p) => p.lockedBundle === b.id)?.id ?? null,
        items: b.items.map((k) => ({ key: k, name: KIT[k].name, text: KIT[k].text, cd: KIT[k].cd })),
      })),
      picks: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, drafted: !!p.drafted, bundle: p.lockedBundle ?? null })),
      // legacy class options (back-compat: chooseClass / older UIs still work)
      classes: Object.entries(CLASSES).map(([key, c]) => ({
        key, name: c.name, blurb: c.blurb,
        body: { name: BODIES[key].name, maxHp: BODIES[key].maxHp, atk: BODIES[key].phys ?? 0, phys: BODIES[key].phys ?? 0, mag: BODIES[key].mag ?? 0, affinity: BODIES[key].affinity ?? null, cd: BODIES[key].cd, color: BODIES[key].color },
        kit: c.kit.map((k) => ({ key: k, name: KIT[k].name, text: KIT[k].text, cd: KIT[k].cd })),
      })),
    } : null,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, lane: p.lane, depth: p.depth ?? 0, targetId: p.targetId ?? null,
      allyTargetId: p.allyTargetId ?? null,                // support-slot aim (click an ally)
      thorns: p.thorns ?? 0,                               // Spikes buff badge
      offline: !p.ws,                                    // seat held, socket gone (mid-run reconnect window)
      bodyKey: p.bodyKey, hp: p.hp, maxHp: p.maxHp, shield: p.shield ?? 0, alive: p.alive,
      phys: p.phys ?? 0, mag: p.mag ?? 0, dr: itemDmgReduce(p),  // worn damage reduction (Aegis)
      passive: BODIES[p.bodyKey]?.passiveText ?? null, tags: bodyTags(p.bodyKey), // your worn body's effect + ⚡ triggers
      bodyThreats: foeThreats(room, p),                          // your body's own timer bars (Royal Rat/Wageslave)
      classKey: p.classKey ?? null,
      treasure: p.treasure ?? 0,                         // this player's wallet (mirrored income)
      unlockedTiers: [...(p.unlockedTiers ?? [])],        // tiers THIS player has bought into
      kitSlots: p.kitSlots ?? KIT_SLOTS_BASE,            // current kit capacity (buyable)
      kitSlotCost: kitSlotCost(p.kitSlots ?? KIT_SLOTS_BASE), // Treasure for the next slot (null = maxed)
      kit: (p.draftPicks ?? []).map((k) => ({ key: k, name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "", value: itemTreasure(k) })),
      inv: p.inv.map((inv) => ({
        key: inv.key, name: KIT[inv.key].name, text: KIT[inv.key].text, type: KIT[inv.key].type ?? null,
        ranged: isRanged(inv.key),             // 🎯 badge: the reticle drives this item
        color: KIT[inv.key].color ?? null, passive: isPassiveItem(inv.key), dr: KIT[inv.key]?.passive?.dr ?? 0,
        fragile: !!KIT[inv.key].fragile, spent: !!inv.spent,
        stolen: !!inv.stolen,                  // Kraken lock — the slot renders STOLEN until its entity dies
        charge: inv.charge, cd: itemCd(inv, BODIES[p.bodyKey]), ready: !inv.spent && !inv.stolen && inv.charge >= itemCd(inv, BODIES[p.bodyKey]),
      })),
    })),
  };
}
