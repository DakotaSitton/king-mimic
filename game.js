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
// The caravan scales with PARTY SIZE (sim sweep 2026-06-13: total foe output scales with
// players — lanes, invites, deaths-leak — but a flat shared pool halved per-player slack
// at 2P; the 50-run sweep showed duos dying in ordinary rooms ~2× solo. The scaling
// contract says party size scales the TOTAL budget — the defended pool follows it).
// Solo is unchanged at 20. [PLACEHOLDER] coefficient.
export const caravanMaxHp = (players = 1) => 20 * Math.max(1, Math.min(4, players | 0 || 1)) * _hpMult;

// THE UNIVERSAL COOLDOWN MULTIPLIER IS DEAD (owner 2026-06-12: "turn off the doubled
// cooldowns flag; change numbers, not universal modifiers"). Every cd/duration in this
// file is now a LITERAL tick count (10 ticks = 1 second, TICK_MS 100) and the item texts
// tell the truth. The knob caused two desync landmine classes (bake-at-creation, buff
// uptime) — pace changes now go through the numbers themselves. Inert stubs remain so
// older harnesses (test headers, balance.js) don't crash; they change nothing.
export const getCdMult = () => 1;
export const setCdMult = () => {};
export const cdScale = () => 1;
// (A hero-only cooldown ease lived here for ~an hour on 2026-06-12 and was REVERTED the
// same night: the owner's 1:1 SYMMETRY rule is identity-level — heroes and foes share
// every multiplier. Ease difficulty through the room/ante economy instead, never tempo.)
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
  rookie:      { name: "Rookie Mimic", maxHp: 9, phys: 1, mag: 0, cd: 0, color: "#9ad", spawn: false },  // +1 HP (owner 2026-06-12)
  // ===== SUMMON TOKENS — never adoptable, never in any pool; they only enter via summon
  // effects. Rats are the EXCEPTION to "no innate swing": a built-in every-2s attack.
  // Aura tokens (V2 §4.2) carry `aura: { dmgBonus?, dmgReduce? }` — lane-scoped, live while
  // the token stands, fully symmetric (a foe Totem protects foes). =====
  rat:         { name: "Rat", maxHp: 1, phys: 1, mag: 0, cd: 0, color: "#c9a98c", spawn: false, summon: true, gold: 0,
                 passiveText: "Attacks for 1 every 4s.",
                 passive: [{ every: 40, ops: [{ do: "attack" }] }] },
  largeRat:    { name: "Large Rat", maxHp: 3, phys: 2, mag: 0, cd: 0, color: "#a98c6a", spawn: false, summon: true, gold: 0,
                 passiveText: "Attacks for 2 every 4s.",
                 passive: [{ every: 40, ops: [{ do: "attack" }] }] },
  totem:       { name: "Totem", maxHp: 3, phys: 0, mag: 0, cd: 0, color: "#7fb08a", spawn: false, summon: true, gold: 0,
                 aura: { dmgReduce: 1 },
                 passiveText: "Allies in its lane take 1 less damage while it stands." },
  flag:        { name: "Flag", maxHp: 3, phys: 0, mag: 0, cd: 0, color: "#e08a8a", spawn: false, summon: true, gold: 0,
                 aura: { dmgBonus: 1 },
                 passiveText: "Allies in its lane deal +1 damage while it stands." },
  knight:      { name: "Hedgefund Knight", maxHp: 6, phys: 1, mag: 0, cd: 0, color: "#d8c050", spawn: false, summon: true, gold: 0,
                 aura: { dmgBonus: 1, dmgReduce: 1 },
                 passiveText: "Attacks every 4s; allies in its lane deal +1 and take 1 less while it stands.",
                 passive: [{ every: 40, ops: [{ do: "attack" }] }] },

  // ===== BOSSES (BOSS_SPEC_V1, owner-dictated 2026-06-11) — the V2 floor-enders. =====
  // `maxHp` here is the PER-BUDGET-UNIT base: a live boss spawns with maxHp × players ×
  // floor (bossBudget). Mechanics do NOT live in `passive` op-trees — each boss gets
  // spawn-time `clocks` (see spawnBoss/fireBossClock) so every knob can ride the budget.
  // `backline:true` = the caravan-mirror: the boss spans ALL lanes behind the foe rows
  // (room.boss, not a lane entry); melee reaches it only when the attacker's lane is clear.
  // HYDRA REWORK (owner 2026-06-12 ~23:35): opens behind FIVE heads · a very low 1/2/3
  // (floor) maul · EVERY point of damage it takes grows a head in that lane · the head
  // clock is HYPER-inflationary (waves double: 1, 2, 4, 8…). The whole fight is a DPS
  // race: hit hard enough to outrun the inflation your own hits feed.
  hydra: {
    name: "Hyper-Inflation Hydra", maxHp: 21, atk: 0, cd: 0, color: "#5fd0a0", spawn: false, boss: true, backline: true, gold: 0,
    passiveText: "Opens behind five heads. EVERY hit it takes grows a head in that lane, and its breed clock doubles each wave (1, 2, 4, 8…). Mauls every lane for the floor number. Few big hits beat many small ones — out-DPS the inflation or drown.",
  },
  litigationLich: {
    name: "Litigation Lich", maxHp: 15, atk: 0, cd: 0, color: "#9a7fc0", spawn: false, boss: true, backline: true, gold: 0,
    passiveText: "Alternates stances: OBJECTION caps every hit at 1; recess only softens by 1 — burst the weak window. Summons bone wizards.",
  },
  djinn: {
    name: "Djinn of Deals", maxHp: 19, atk: 0, cd: 0, color: "#d0904f", spawn: false, boss: true, gold: 0,
    passiveText: "Relocates between lanes and scorches every lane. Every 3rd item the party uses, it animates one of its own against you.",
  },
  kraken: {
    name: "Kleptomaniac Kraken", maxHp: 19, atk: 0, cd: 0, color: "#5f8fd0", spawn: false, boss: true, backline: true, gold: 0,
    passiveText: "Steals your items and turns them on you — kill the stolen item to take it back. Hides behind a wall of tentacles.",
  },
  // ===== BOSS SUMMON TOKENS — summon-class (HP-knob exempt, never adoptable). =====
  // Heads are "like rats — 1/1s" (owner ruling 2026-06-11): the rat's bite on the rat's clock.
  hydraHead:  { name: "Hydra Head", maxHp: 1, phys: 1, mag: 0, cd: 0, color: "#5fd0a0", spawn: false, summon: true, gold: 0,
                passiveText: "Bites for 1 every 4s. Re-walls its lane.",
                passive: [{ every: 40, ops: [{ do: "attack" }] }] },
  boneWizard: { name: "Bone Wizard", maxHp: 3, phys: 0, mag: 0, cd: 0, color: "#cfd0e8", spawn: false, summon: true, gold: 0,
                passiveText: "Blasts EVERYONE in its lane for 1 every 10s.",
                passive: [{ every: 100, ops: [{ do: "deal", amount: 1, target: "lane" }] }] },
  tentacle:   { name: "Tentacle", maxHp: 1, phys: 0, mag: 0, cd: 0, color: "#7f6fb0", spawn: false, summon: true, gold: 0,
                passiveText: "A wall of suckers — it only blocks." },
  // An ITEM-ENTITY chassis (Djinn summons / Kraken steals): spawnItemEntity overrides its
  // name + HP (= the item's gold cost) per instance; the wrapped item rides `equipment`
  // and fires through the ordinary foe item machinery (resolver, threat bars, the lot).
  itemEntity: { name: "Animated Item", maxHp: 1, phys: 0, mag: 0, cd: 0, color: "#d8b66a", spawn: false, summon: true, gold: 0,
                passiveText: "A possessed item — kill it to silence it." },
  // THE TRUE FINAL BOSS (owner 2026-06-12, unlocked by the first complete 3-floor run).
  // The V1 ward/nemesis design is DEAD (BOSS_SPEC rule). V2: he plays his OWN DECK — one
  // card up at a time, its own bar, shuffle-bag rotation (see BOSS_DEFS.kingMimic). His
  // cards ARE the game's mechanics: a court of heavy foes, the Kraken's steal, a guard
  // stance, the all-lanes scorch. The ultimate mimic mimics the bosses you already beat.
  kingMimic: {
    name: "King Mimic", maxHp: 16, atk: 0, cd: 0, color: "#e6c34a", spawn: false, boss: true, backline: true, gold: 0,
    passiveText: "Plays his own deck, one card at a time: DECREE summons a heavy court, STEAL turns your items on you, STANCE guards the crown, CALAMITY scorches every lane. Every card resolves before the deck reshuffles.",
  },

  // Player-class bodies (chosen at the start; never spawned as foes). The atk/cd
  // pair IS the archetype dial: warrior hits hard and steady, rogue fast, mage slow.
  warrior:     { name: "Warrior", maxHp: 13, phys: 2, mag: 0, cd: 70, color: "#e0885a", spawn: false, affinity: "physical" },
  rogue:       { name: "Rogue",   maxHp: 8,  phys: 1, mag: 0, cd: 35, color: "#6fcf97", spawn: false, affinity: "physical", itemCdMul: 0.7 },  // tempo: spammer — all cooldowns shorter
  mage:        { name: "Mage",    maxHp: 7,  phys: 0, mag: 2, cd: 100, color: "#8a9cff", spawn: false, affinity: "magical", itemCdCap: 80 },   // tempo: heavy — caps big spells (Fire/Lightning)
  cleric:      { name: "Cleric",  maxHp: 10, phys: 0, mag: 1, cd: 80, color: "#f1d06a", spawn: false, affinity: "magical" },
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
  // FLAT BODIES (owner 2026-06-18): the Junior/avg/Senior hierarchy is DEAD. Power now comes
  // ENTIRELY from items, never from body tiers — so every family is ONE flat, level-1 entry
  // (clean name, no prefix), balanced against the other 11. One gold value; ante leans on the
  // items a foe carries, not its body. (Per-body hand-tuned statlines are the next step; this
  // single-row collapse is the foundational 36-generated → 12-flat cut.)
  { suffix: "",  prefix: "", hpMul: 1, step: 0, gold: 1 },
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
  `Summons ${n} rat${n > 1 ? "s" : ""} every 8s; ${when} shaves 1.5s off the clock.`;
export const BODY_TEMPLATES = [
  // --- Summoners (mag affinity, low HP): a rat clock their trigger accelerates ----------
  { key: "royalRat", name: "Royal Rat", hp: 5, school: "mag", color: "#b8a3c9",
    make: (i) => ({ passiveText: ratText(SUMMON_N[i], "each staff item it resolves"),
                    accel: { on: "staff", amount: 15 },
                    passive: [{ every: 80, ops: [{ do: "summon", body: "rat", count: SUMMON_N[i] }] }] }) },
  { key: "fatCat", name: "Fat Cat", hp: 5, school: "mag", color: "#f0b070",
    make: (i) => ({ passiveText: ratText(SUMMON_N[i], "every hit it takes"),
                    accel: { on: "damaged", amount: 15 },
                    passive: [{ every: 80, ops: [{ do: "summon", body: "rat", count: SUMMON_N[i] }] }] }) },
  { key: "paidPiper", name: "Paid Piper", hp: 5, school: "mag", color: "#c9b86a",
    make: (i) => ({ passiveText: ratText(SUMMON_N[i], "each sword item it resolves"),
                    accel: { on: "sword", amount: 15 },
                    passive: [{ every: 80, ops: [{ do: "summon", body: "rat", count: SUMMON_N[i] }] }] }) },
  // --- Attackers (phys affinity, mid HP) ------------------------------------------------
  // ECHO bodies (owner redesign 2026-06-12): the bar charges on its own, every item use
  // pushes it back — heavy slow kits reach the double, spam never does. Players arm the
  // full bar by BUTTON; foes auto-arm. No more every-4s armed clock.
  { key: "centaur", name: "Centless Centaur", hp: 7, school: "phys", color: "#d8b46a",
    make: () => ({ echo: "physical", passiveText: "Echo: the bar charges 7s, but every item it uses pushes it back 1.5s. Full: its next sword item resolves twice." }) },
  { key: "pixie", name: "Penny-Pinching Pixie", hp: 7, school: "phys", color: "#7f7",
    make: (i) => ({ swordCdMul: SCHOOL_CD[i], passiveText: `Its sword items charge ${Math.round((1 - SCHOOL_CD[i]) * 100)}% faster.` }) },
  { key: "vampire", name: "Vengeful Vampire", hp: 7, school: "phys", basePow: 2, color: "#b85c6e",
    make: (i) => ({ passiveText: `Heals ${i + 1} after each sword item it resolves.`,
                    passive: [{ on: "sword", ops: [{ do: "healSelf", amount: i + 1 }] }] }) },
  // --- Casters (mag affinity, low HP) ----------------------------------------------------
  { key: "mouse", name: "Malovelant Mouse", hp: 5, school: "mag", color: "#9a8ca8",
    make: () => ({ echo: "magical", passiveText: "Echo: the bar charges 7s, but every item it uses pushes it back 1.5s. Full: its next staff item resolves twice." }) },
  { key: "lizardWizard", name: "Lizard Wizard", hp: 5, school: "mag", color: "#4f9f7f",
    make: (i) => ({ staffCdMul: SCHOOL_CD[i], passiveText: `Its staff items charge ${Math.round((1 - SCHOOL_CD[i]) * 100)}% faster.` }) },
  { key: "runeblade", name: "Rent-Seeking Runeblade", hp: 5, school: "mag", stepless: true, color: "#357f5f",
    make: (i) => ({ phys: i + 1, swordFeedsStaff: true,
                    passiveText: "Cross-school: its staff items also add its sword Power." }) },
  // --- Tanks (phys affinity, high HP) -----------------------------------------------------
  // Counter on a CLOCK (owner redial 2026-06-12: per-hit counters had no cooldown) — the
  // generalized Atlas mechanic: a 4s strike bar that incoming hits accelerate by 1s.
  { key: "minotaur", name: "Market-Crash Minotaur", hp: 9, school: "phys", color: "#b09030",
    make: () => ({ accel: { on: "damaged", amount: 15 },
                   passiveText: "Every 7s: swords the front enemy. Taking a hit shaves 1.5s off the clock.",
                   passive: [{ every: 70, ops: [{ do: "schoolStrike", school: "physical", target: "front" }] }] }) },
  { key: "wageslave", name: "Weary Wageslave", hp: 9, school: "phys", color: "#a0a0b0",
    make: (i) => ({ passiveText: `Heals ${[2, 3, 5][i]} every ${[5.5, 5, 4][i]}s.`,
                    passive: [{ every: [55, 50, 40][i], ops: [{ do: "healSelf", amount: [2, 3, 5][i] }] }] }) },
  { key: "atlas", name: "Atlas, Shrugging", hp: 9, school: "phys", color: "#8a93a3",
    make: (i) => ({ accel: { on: "damaged", amount: 15 },
                    passiveText: `Every 7s: gains +${i + 1} attack. Taking a hit shaves 1.5s off the clock.`,
                    passive: [{ every: 70, ops: [{ do: "counter", amount: i + 1 }] }] }) },
];
for (const tpl of BODY_TEMPLATES) {
  RARITY_TABLE.forEach((r, i) => {
    const extra = tpl.make(i);
    const pow = (tpl.basePow ?? 1) + (tpl.stepless ? 0 : r.step);
    BODIES[tpl.key + r.suffix] = {
      name: r.prefix + tpl.name,
      maxHp: Math.round(tpl.hp * r.hpMul) + 1,  // owner 2026-06-12: "give everything 1 more hp" (summon tokens exempt — heads/rats are ALWAYS 1/1 by owner ruling)
      phys: tpl.school === "phys" ? pow : 0,
      mag: tpl.school === "mag" ? pow : 0,
      cd: 0, color: tpl.color, spawn: true, gold: r.gold, family: tpl.key,
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
export const DRAFT_WHEEL_MIN = 5;          // ≥ this many bundles, and always ≥ players + 1
                                           // (5 = one clean row on a landscape phone — owner 2026-06-21)

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
  blade:        { name: "Sword",        cd: 40, ante: 1, type: "physical", color: "#cfd8e2", text: "Deal sword + 1 to the front foe in your lane.",      ops: [{ do: "deal", amount: 1, target: "front" }] },
  bow:          { name: "Bow",          cd: 50, ante: 1, type: "physical", ranged: true, color: "#a8e06a", text: "Deal sword + 1 to your aimed foe.",      ops: [{ do: "deal", amount: 1, target: "pick" }] },
  hatchet:      { name: "Hatchet",      cd: 85, ante: 1, type: "physical", color: "#d89060", text: "Deal sword + 4 to the front foe.",                   ops: [{ do: "deal", amount: 4, target: "front" }] },
  fire:         { name: "Fireball",     cd: 80, ante: 1, type: "magical",  color: "#ff7a3c", text: "Deal staff + 3 to your aimed foe.",                  ops: [{ do: "deal", amount: 3, target: "pick" }] },
  lightning:    { name: "Lightning",    cd: 85, ante: 1, type: "magical",  color: "#5fd0ff", text: "Deal staff + 2 to every foe in your lane.",          ops: [{ do: "deal", amount: 2, target: "lane" }] },
  wind:         { name: "Wind",         cd: 55, ante: 1, type: "magical",  color: "#bcd8ff", text: "Deal staff + 1 to your aimed foe and push it to the back of its lane.", ops: [{ do: "deal", amount: 1, target: "pick" }, { do: "pushBack", target: "pick" }] },
  smallShield:  { name: "Small Shield", cd: 40, ante: 1, color: "#6cd6ff", text: "Gain a 1-point shield buffer.",                                        ops: [{ do: "shield", amount: 1 }] },
  heal:         { name: "Heal",         cd: 55, ante: 1, type: "magical",  color: "#74e69a", text: "Heal staff + 2 to your ally-target (or the most-hurt friendly in your lane).", ops: [{ do: "healAlly", amount: 2 }] },
  bigShield:    { name: "Big Shield",   cd: 80, ante: 1, color: "#6cd6ff", text: "Gain a 3-point shield buffer.",                                        ops: [{ do: "shield", amount: 3 }] },
  summonRat:    { name: "Rat",          cd: 65, ante: 1, type: "magical",  color: "#c9a98c", text: "Summon a rat in your lane.",                          ops: [{ do: "summon", body: "rat", count: 1 }] },
  gangUp:       { name: "Gang Up",      cd: 55, ante: 1, type: "physical", color: "#e0c060", text: "Deal sword + 1, +1 per other ally in your lane, to the front foe.", ops: [{ do: "deal", amount: 1, target: "front", perAlly: 1 }] },
  summonBigRat: { name: "Summon Large Rat", cd: 95, ante: 1, type: "magical", color: "#a98c6a", text: "Summon a large rat in your lane.",                 ops: [{ do: "summon", body: "largeRat", count: 1 }] },
  // --- UNCOMMON (8) ----------------------------------------------------------------------
  scaryKnife:   { name: "Scary Knife",  cd: 30, ante: 2, type: "physical", color: "#e7e0c0", text: "Deal sword to the front foe (very fast).",          ops: [{ do: "deal", amount: 0, target: "front" }] },
  spear:        { name: "Spear",        cd: 80, ante: 2, type: "physical", color: "#c0b8a0", text: "Deal sword + 3 to the front TWO foes in your lane.", ops: [{ do: "deal", amount: 3, target: "front2" }] },
  magicMissile: { name: "Magic Missile", cd: 35, ante: 2, type: "magical", color: "#9b8cff", text: "Deal staff to your aimed foe (very fast).",          ops: [{ do: "deal", amount: 0, target: "pick" }] },
  darkness:     { name: "Darkness",     cd: 85, ante: 2, type: "magical",  color: "#8060a8", text: "Deal staff + 3 to your aimed foe; heal yourself the damage dealt.", ops: [{ do: "deal", amount: 3, target: "pick", lifesteal: true }] },
  totem:        { name: "Totem",        cd: 85, ante: 2, type: "magical",  color: "#7fb08a", text: "Summon a totem: allies in its lane take 1 less damage while it stands.", ops: [{ do: "summon", body: "totem", count: 1 }] },
  flag:         { name: "Flag",         cd: 85, ante: 2, type: "physical", color: "#e08a8a", text: "Summon a flag: allies in its lane deal +1 damage while it stands.", ops: [{ do: "summon", body: "flag", count: 1 }] },
  trustyShield: { name: "Trusty Shield", cd: 65, ante: 2, color: "#6cd6ff", startCharged: true, text: "Gain a 2-point shield buffer. Starts fully charged each fight.", ops: [{ do: "shield", amount: 2 }] },
  spikes:       { name: "Spikes",       cd: 70, ante: 2, color: "#b0b8c0", text: "This fight: attackers that strike you take 1 (thorns).",              ops: [{ do: "thorns", amount: 1 }] },
  // --- RARE (4) --------------------------------------------------------------------------
  crossbow:     { name: "Repeating Crossbow", cd: 25, ante: 4, type: "physical", ranged: true, color: "#c8d870", text: "Deal sword to your aimed foe (relentless).", ops: [{ do: "deal", amount: 0, target: "pick" }] },
  blizzard:     { name: "Blizzard",     cd: 95, ante: 4, type: "magical", color: "#a8e0ff", text: "Deal staff + 2 to every foe in your lane and drain 10 charge from each of their clocks.", ops: [{ do: "deal", amount: 2, target: "lane" }, { do: "delay", amount: 10, target: "lane" }] },
  knightBanner: { name: "Hedgefund Knight", cd: 100, ante: 4, type: "physical", color: "#d8c050", text: "Summon a knight: attacks every 4s; allies in its lane deal +1 and take 1 less while it stands.", ops: [{ do: "summon", body: "knight", count: 1 }] },
  // Worn passive — never pressed, always on (no ops). The Aegis dr pattern.
  slimeCrown:   { name: "Liquid Metal King Slime Crown", cd: 0, ante: 4, color: "#b6a8ff", passive: { dr: 1 }, text: "Worn: take 1 less from every hit." },
  // ===== THE POST-FLOOR-3 WAVE (owner's spitball list, build-ordered 2026-06-12 22:19).
  // De-tiered: each carries ONE gold number; every value here is a [PLACEHOLDER] dial.
  // Buffs are timed and symmetric (a foe holding one buffs itself the same way). The
  // once-per-fight panic buttons are fragile + startCharged: ready the moment the fight
  // opens, one press, gone till the next room. =====
  // (sim audit, same night: buff cds raised so uptime < 100% — dur 80 over cd 70 was a
  // PERMANENT buff; Omnislash strikes got a +2 base — amount-0 ×4 was strictly worse
  // than a 1g Sword. Still all [PLACEHOLDER].)
  haste:      { name: "Haste",       cd: 160, ante: 3, color: "#ffe06a", text: "For 7.5s: you (or your ally-target) charge items twice as fast.",  ops: [{ do: "buff", buff: "haste", amount: 1, dur: 75 }] },
  powerBoost: { name: "Power Boost", cd: 220, ante: 3, color: "#ff9a5a", text: "For 12s: +2 sword AND staff Power — yours, or your ally-target's.", ops: [{ do: "buff", buff: "power", amount: 2, dur: 120 }] },
  stoneSkin:  { name: "Stone Skin",  cd: 220, ante: 3, color: "#b8c0a8", text: "For 12s: you (or your ally-target) take 2 less from every hit.",  ops: [{ do: "buff", buff: "stoneskin", amount: 2, dur: 120 }] },
  omnislash:  { name: "Omnislash",   cd: 130, ante: 5, type: "physical", color: "#ffd24a", text: "Strike the front foe FOUR times (sword + 2 each).",
                ops: [{ do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }, { do: "deal", amount: 2, target: "front" }] },
  gigaCast:   { name: "Giga Cast",   cd: 55, ante: 5, fragile: true, startCharged: true, color: "#c06aff", text: "Once per fight: your NEXT staff item resolves FOUR times.", ops: [{ do: "gigaArm" }] },
  timeStop:   { name: "Time Stop",   cd: 55, ante: 6, fragile: true, startCharged: true, color: "#8ad0ff", text: "Once per fight: every foe clock FREEZES for 4.5s.",           ops: [{ do: "timeStop", dur: 45 }] },
  revive:     { name: "Revive",      cd: 55, ante: 6, fragile: true, startCharged: true, color: "#7fe6c0", text: "Once per fight: restore a downed teammate to full HP (ally-target first; full-heals if nobody is down).", ops: [{ do: "revive" }] },
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

// THE ANTE FORMULA (owner 2026-06-12, de-tiered) — a foe option's ante = its body + items,
// where EVERY body and item carries its own individual `gold`/`ante` value (the old class
// ladders 1/3/5 and 1/2/4 survive as the current per-entity numbers — "all current values
// fine" — but they're dials now, not classes). One number per entity, used everywhere:
// stocking ante, loot value, shop price, adoption price.
export const bodyAnteOf = (f) => BODIES[f.bodyKey]?.gold ?? 0;
// Foe ante = the stocking + draft currency. The body is now a STATIC 1 and ITEMS carry all the
// weight (owner 2026-06-19: "each body is just 1, scale everything out from items"). The tiered
// per-body gold (`bodyAnteOf`) lives on only for body ADOPTION/unlock pricing — not foe ante.
export const anteOfFoe = (f) => 1 + (f.gear ?? []).reduce((s, g) => s + (KIT[g]?.ante ?? 0), 0);
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
// V = stocked ante + the room's OWN base ante (modifier deal, owner 2026-06-12): a nastier
// room antes up gold of its own, so walking into Acid Rain is a paid wager, not a tax.
export function roomValue(room) {
  return (room.draftedFoes ?? []).reduce((s, f) => s + anteOfFoe(f), 0)
       + (room.enchant?.baseAnte ?? 0);
}

// Kit SPACE is a Treasure spectrum. Each player starts with KIT_SLOTS_BASE slots and can
// buy up to MAX_KIT with Treasure; each extra slot costs more than the last. This is the
// "kit upgrades for more space" sink — a second place the shared purse competes for spend.
export const MAX_KIT = 8;            // hard ceiling on a kit's size
export const KIT_SLOTS_BASE = 3;     // slots a fresh player carries (draft bundle is 3 → full; "level up" grows it)
export const KIT_SLOT_COST_MUL = 4;  // base cost; each further slot DOUBLES it (owner 2026-06-16)
// Cost to grow FROM `slots` to `slots+1`: doubles each step — 4, 8, 16, 32, 64 — capped at 64.
// null once you've hit the ceiling (MAX_KIT 8 = exactly the five doubling steps).
export const kitSlotCost = (slots) =>
  slots >= MAX_KIT ? null : Math.min(64, KIT_SLOT_COST_MUL * 2 ** ((slots | 0) - KIT_SLOTS_BASE));

// SHOP nodes — spend Treasure on CHOSEN items (vs. random loot). NO MARKUP (owner
// 2026-06-12: "shops should not inflate their prices — they're shops and you're already
// spending gold"): a ware costs exactly its gold value, the same one number it's worth
// everywhere else. Reroll the shelf for a flat fee.
export const SHOP_WARES = 5;        // items on the shelf at once
export const SHOP_REROLL_COST = 3;  // Treasure to reroll the whole shelf
export const shopPrice = (key) => itemTreasure(key);
// Roll a fresh shelf: SHOP_WARES distinct items, drawn UNIFORMLY (rarity classes are gone
// — no weighting knob). Determinism-friendly: tests can set room.shop.wares directly.
export function rollShopWares() {
  return [...KIT_POOL].sort(() => Math.random() - 0.5).slice(0, SHOP_WARES)
    .map((key) => ({ key, cost: shopPrice(key) }));
}

// Room modifiers, v2 (owner canon 2026-06-12): every modifier is a DEAL — the room gets
// nastier AND antes up gold of its own. `baseAnte` joins V on clear (roomValue), and the
// map hover shows the terms BEFORE you walk in, so picking a nasty room is an informed
// wager. Wandering Monster's payout is its foe's own ante (the foe is pre-placed,
// non-removable, and pays into V like any stocked foe). Determinism-friendly: tests set
// room.enchant directly; live play pre-rolls per map node.
// Owner canon: Wandering Monster · Acid Rain light/heavy · Armory. The last three entries
// and ALL baseAnte numbers are [PLACEHOLDER] gap-fills — owner overwrites without debate.
export const ENCHANTS = [
  { key: "wanderer",  name: "Wandering Monster", wanderer: true, baseAnte: 0,
    text: "A foe is already in the room (random lane). Its ante pays out with the rest." },
  { key: "acidLight", name: "Acid Rain (light)", baseAnte: 2, roomTimer: { kind: "acid", cd: 160, amount: 1 },
    text: "Every 16s, acid hits each hero and summon for 1. The room antes +2." },
  { key: "acidHeavy", name: "Acid Rain (heavy)", baseAnte: 4, roomTimer: { kind: "acid", cd: 85, amount: 1 },
    text: "Every 8.5s, acid hits each hero and summon for 1. The room antes +4." },
  { key: "armory",    name: "Armory", baseAnte: 2, foeShield: 1,
    text: "Every foe enters with 1 shield. The room antes +2." },
  // ---- [PLACEHOLDER] fills "along these lines" ----
  { key: "ratColony", name: "Rat Colony", baseAnte: 3, roomTimer: { kind: "ratSpawn", cd: 55 },
    text: "Every 5.5s, a rat joins the enemy in a random lane. The room antes +3." },
  { key: "hasted",    name: "Hasted",    baseAnte: 3, foeCdMul: 0.8, text: "Foes act 20% faster. The room antes +3." },
  { key: "toughened", name: "Toughened", baseAnte: 2, foeHpMul: 1.2, text: "Foes have 20% more HP. The room antes +2." },
];
// THE FIRST ROOM IS A GIFT (owner canon 2026-06-12, scoped same night: "only the first
// room"): the run's ENTRY room carries this instead of a rolled modifier. No combat effect
// at all; the King antes +3 himself. The REST of floor 1 rolls real modifiers but never
// the Wandering Monster ("floor 1 can't have a wandering monster — too brutal").
export const GIFT_ENCHANT = { key: "gift", name: "King Mimic's Gift", baseAnte: 3,
  text: "The King's opening gift: no tricks in this room, and he antes +3 himself." };

// Live roll: returns an INSTANCE (a copy). The Wandering Monster rolls its foe right here —
// at map generation — so the hover preview can name the exact deal ("(x)" = the foe's ante).
// `noWanderer` is the floor-1 mercy rule.
export function pickEnchant({ noWanderer = false, floor = 1 } = {}) {
  const pool = noWanderer ? ENCHANTS.filter((e) => !e.wanderer) : ENCHANTS;
  const en = { ...pool[Math.floor(Math.random() * pool.length)] };
  if (en.wanderer) {
    const bodyKey = rnd(FOE_BODIES);
    en.foe = { bodyKey, gear: rollFoeGear(bodyKey, FOE_SPICY_ITEMS, floor) };
    const x = anteOfFoe(en.foe);
    en.name = `Wandering Monster (${x})`;
    en.text = `${BODIES[bodyKey].name} is already in the room (random lane). Its ⚖${x} pays out with the rest.`;
  }
  return en;
}
export function applyEnchantToFoe(foe, en) {
  if (!en) return;
  if (en.foeHpMul) { foe.maxHp = Math.max(1, Math.round(foe.maxHp * en.foeHpMul)); foe.hp = foe.maxHp; }
  if (en.foeDmgMul) foe.dmgMul = en.foeDmgMul;     // scales the foe's outgoing damage
  if (en.foeCdMul) foe.cdMul = en.foeCdMul;        // Hasted: shortens its clocks
  if (en.foeShield) foe.shield = (foe.shield ?? 0) + en.foeShield; // Armory: enters shielded
}
// A room's global cooldown bars (Acid Rain / Rat Colony). [] for the per-foe rooms.
export function roomTimersFor(en) {
  return en?.roomTimer ? [{ ...en.roomTimer, cd: Math.round(en.roomTimer.cd), charge: 0 }] : [];
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
// baseline self-healer is a stall, not a threat), and the panic buttons (haste/giga/
// timeStop/revive/buffs — foe-side semantics exist but un-telegraphed buffs read as
// nothing happening; parked for an owner verdict).
// BLIZZARD RE-ADMITTED (owner bug report 2026-06-12 "never seen a blizzard"): it was
// exiled while its drain was a no-op vs players; drainClocks is symmetric now, so a foe
// Blizzard genuinely sets your hotbar back. SECOND slot only — the sim audit showed
// first-slot Blizzards made the worst dud-foes in the game (4g of ante, ~0.4 DPS):
// it's a rider threat on a real attacker, never a foe's only weapon. Omnislash joins
// the first-slot pool as the premium melee. [PLACEHOLDER] memberships, owner trims.
const SPICY_ITEMS = ["fire", "lightning", "scaryKnife", "magicMissile", "darkness", "spear", "crossbow", "gangUp", "omnislash"];
const FOE_SPICY_ITEMS = SPICY_ITEMS.filter((k) => !KIT[k].fragile); // (none fragile in the slice)
// A foe's SECOND slot grab-bag: another attack, a defensive, a worn passive (Crown), or a
// summon/aura token (a foe Totem protects foes — symmetric). First slot stays damaging.
// 2026-06-12 audit additions: hatchet (was COMMON-fallback-only ≈ never), spikes (thorns
// are symmetric), summonBigRat, knightBanner (a foe knight walls + buffs its lane), blizzard.
const FOE_SECOND_ITEMS = [...FOE_SPICY_ITEMS, "smallShield", "bigShield", "trustyShield", "slimeCrown", "totem", "flag", "summonRat", "blade", "bow", "hatchet", "spikes", "summonBigRat", "knightBanner", "blizzard"];
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
// Roll a foe's gear: ONE guaranteed item this BODY can deal damage with, then a TAILED number of
// extra distinct items. ITEM COUNT is the difficulty lever (owner 2026-06-19: "items decide
// difficulty… foes should have upwards of 5-6 sometimes"). The count varies so the board mixes lone
// attackers with the occasional LOADED 4-6-item monster — a pricey draft you choose to take on:
//   • most foes roll LIGHT — 1..(floor+1) items (the floor raises the baseline);
//   • a minority (≈12% on f1 → 24% on f3) are MONSTERS — 4-6 items, regardless of floor.
// `floor` is the heaviness knob (buildFoePool/wanderer pass the real floor; the King's decree court
// passes a big number for a heavy court; the cheap-slot guarantee passes 0 = exactly one item).
// Extra DAMAGE items stay school-checked (no knife-waving casters); utility/shields/worn/tokens fit
// any body. Hard-capped at FOE_MAX_GEAR so even a monster stays a readable wall of bars.
export const FOE_MAX_GEAR = 6;
export function rollFoeGear(bodyKey, primary, floor = 1) {
  const usable = primary.filter((k) => itemThreatens(bodyKey, k));
  // fall back to the flat-damage commons (amount ≥ 1 → never a dud on any body)
  const pool = usable.length ? usable : COMMON_ITEMS.filter((k) => itemThreatens(bodyKey, k));
  const gear = [pool.length ? rnd(pool) : "blade"];
  let target = 1;                                          // floor 0 = the guaranteed cheap option
  if (floor > 0) {
    const monster = Math.random() < (0.12 + 0.06 * (floor - 1));  // loaded-foe odds climb with depth
    target = monster ? 4 + Math.floor(Math.random() * 3)          // 4..6 items: a monster
                     : 1 + Math.floor(Math.random() * (floor + 1)); // 1..(floor+1): the norm
    target = Math.min(FOE_MAX_GEAR, target);
  }
  while (gear.length < target) {
    const pool2 = FOE_SECOND_ITEMS.filter((k) =>
      !gear.includes(k) &&                                  // no duplicate bars
      (!(KIT[k].ops ?? []).some((o) => o.do === "deal") || itemThreatens(bodyKey, k)));
    const pick = rnd(pool2);
    if (!pick) break;                                       // pool exhausted → stop short
    gear.push(pick);
  }
  return gear;
}
// the stocking palette — armed; per-foe gear count follows rollFoeGear's tail (light, w/ monsters)
export function buildFoePool(floor = 1) {
  return [...FOE_BODIES].sort(() => Math.random() - 0.5).map((b) => ({ bodyKey: b, gear: rollFoeGear(b, FOE_SPICY_ITEMS, floor) }));
}
// The palette must NEVER trap the party: at least one CHEAP option (ante ≤ 3 — a T1 body
// with a basic item) is always on offer, so a small required ante can be met without being
// forced to invite a monster. Rerolled into a random slot whenever the guarantee breaks.
export function rollCheapOption() {
  const bodyKey = rnd(SET_COMMONS);
  return { bodyKey, gear: rollFoeGear(bodyKey, COMMON_ITEMS, 0) };
}
export function ensureCheapSlot(room) {
  // the guarantee only holds at the BASE window — once the party ups the ante, low drops
  // are exactly what they paid to stop seeing (owner 2026-06-12: "perma raise both ends")
  if ((room.anteMin ?? ANTE_MIN) > ANTE_MIN) return;
  const pal = room.foePalette ?? [];
  if (!pal.length || pal.some((o) => anteOfFoe(o) <= 3)) return;
  pal[Math.floor(Math.random() * pal.length)] = rollCheapOption();
}

// THE ANTE WINDOW (owner 2026-06-12): every palette roll is guaranteed within
// [room.anteMin, room.anteCap]. A run STARTS at 2–5 — junior bodies with modest gear, the
// "3 commons" feel. "Up the ante" RATCHETS BOTH ENDS (owner, same night: late-game junk
// drops must vanish) for every future roll of the run; it never comes back down. The step
// is a [PLACEHOLDER] dial.
export const ANTE_MIN = 2, ANTE_CAP_BASE = 5, ANTE_STEP = 3;
export const fitsAnteWindow = (room, o) => {
  const a = anteOfFoe(o);
  return a >= (room.anteMin ?? ANTE_MIN) && a <= (room.anteCap ?? ANTE_CAP_BASE);
};
// Draw the next pool option that fits the CURRENT window. The pool itself still spans all
// rarities — the window is the gate, so a raised window admits the big bodies on future
// draws without rebuilding anything. Wraps. If a deep ratchet outgrows the pool's ceiling
// (max possible ante is ~13), offer the BIGGEST option that still respects the cap.
// `avoid` = bodyKeys already on the palette: prefer a body NOT already shown so the three
// slots stay DISTINCT (owner 2026-06-19: a narrow/double-feature ante window admitted only ONE
// body, so the window loop returned the same Pixie for all three slots — the 2026-06-17 distinct
// rotation only covered the ABOVE-CEILING path, not a window with exactly one fit).
export function nextPaletteOption(room, avoid = null) {
  const pool = room.foePool ?? [];
  if (!pool.length) return rollCheapOption();
  const skip = avoid instanceof Set ? avoid : (avoid?.length ? new Set(avoid) : null);
  const cap = room.anteCap ?? ANTE_CAP_BASE;
  const fresh = (o) => !skip || !skip.has(o.bodyKey);          // a body not already on the palette
  // rotate from foeNext, return the first pool option matching `ok` (and advance the cursor)
  const pick = (ok) => {
    for (let t = 0; t < pool.length; t++) {
      const i = ((room.foeNext ?? 0) + t) % pool.length;
      if (ok(pool[i])) { room.foeNext = i + 1; return { ...pool[i] }; }
    }
    return null;
  };
  // the BIGGEST option ≤ cap matching `ok` (preserves the above-ceiling "offer strength" intent)
  const pickBig = (ok) => {
    const list = pool.filter((o) => anteOfFoe(o) <= cap && ok(o)).sort((a, b) => anteOfFoe(b) - anteOfFoe(a));
    if (!list.length) return null;
    const i = (room.foeNext ?? 0) % list.length; room.foeNext = i + 1; return { ...list[i] };
  };
  // PRIORITY (owner bug 2026-06-21 — a narrow / DOUBLE-FEATURE window showed the SAME body ×3):
  // DISTINCTNESS outranks the exact ante window. Three different foes is the whole point of the
  // palette, so when the window admits only repeats we relax the ante FLOOR (keep the cap) to keep
  // the three slots distinct, and only repeat a body as the genuine last resort.
  return pick((o) => fitsAnteWindow(room, o) && fresh(o))   // 1) in-window AND not already shown
      ?? pickBig(fresh)                                      // 2) distinct & ≤ cap (floor relaxed)
      ?? pick((o) => fitsAnteWindow(room, o))                // 3) in-window (allow a repeat)
      ?? pickBig(() => true)                                 // 4) ≤ cap (allow a repeat)
      ?? rollCheapOption();                                  // 5) nothing ≤ cap exists at all
}
export function upTheAnte(room) {
  if (room.phase !== "stock") return false;
  room.anteMin = (room.anteMin ?? ANTE_MIN) + ANTE_STEP;
  room.anteCap = (room.anteCap ?? ANTE_CAP_BASE) + ANTE_STEP;
  // junk leaves the table immediately — slots under the new floor reroll into the window
  (room.foePalette ?? []).forEach((o, i) => {
    if (!fitsAnteWindow(room, o)) {
      const avoid = new Set(room.foePalette.filter((_, j) => j !== i).map((x) => x?.bodyKey).filter(Boolean));
      room.foePalette[i] = nextPaletteOption(room, avoid);
    }
  });
  return true;
}

// THE STOCKING GATE (owner 2026-06-19, COLLECTIVE DRAFT): the party drafts foes FREE-FOR-ALL into
// a shared pool — anyone adds any foe, any time, NO take-backs — until the room's ANTE requirement
// is met. Overshoot is allowed (it's a floor, not a cap). Budget = party × floor (the scaling
// contract, `bossBudget`); a DOUBLE FEATURE (elite) doubles it. Floored at 2 so the requirement is
// always meetable by the guaranteed cheap option (a body-1 + 1-ante item = ⚖2).
export const picksRequiredFor = (type) => (type === "elite" ? 2 : 1);   // kept for the DOUBLE FEATURE label
export const stockAnteRequired = (room, type = currentNode(room)?.type) =>
  Math.max(2, bossBudget(room.players?.size ?? 1, room.floor ?? 1) * (type === "elite" ? 2 : 1));
export const playerPicks = (room, playerId) =>
  (room.draftedFoes ?? []).filter((f) => f.owner === playerId).length;   // display only now
export const stockReady = (room) => anteCurrent(room) >= (room.anteRequired ?? 0);

// The boss roster (BOSS_SPEC_V1): Hydra / Litigation Lich / Djinn of Deals / Kleptomaniac
// Kraken rotate over a run's 3 boss floors. King Mimic stays OUT of the rotation — he IS
// the throne floor (owner 2026-06-12, unlocked by the first complete 3-floor run).
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
// THE THRONE (owner 2026-06-12): past floor 3 sits King Mimic — the TRUE final boss,
// outside the 3-of-4 rotation. Beating him completes the run.
export const THRONE_FLOOR = 4;
// Which boss guards a given floor (1-indexed) — run-seeded, deterministic within the run.
// Lazily seeds rooms that never ran startDraft (manually-built test rooms).
export function bossForFloor(room, floor = room?.floor ?? 1) {
  if ((floor | 0) >= THRONE_FLOOR) return "kingMimic";
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
    runWon: false,                  // the King fell on the throne floor — the run is COMPLETE
    floor: 1,                       // climbs each time you clear a boss (ante scales with it)
    enchant: null,                  // a room-wide modifier: harder fight, richer reward
    draftedFoes: [],                // the foes you stocked into this room
    foePool: [],                    // the full draft pool for this room
    foePalette: [],                 // the PALETTE_SLOTS choices currently shown
    foeNext: 0,                     // next pool index to roll into a slot
    anteRequired: 0,                // minimum ante you must stock before you can begin
    anteMin: 2, anteCap: 5,         // "up the ante" ratchet (run-scoped) — BOTH ends only ever climb
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
export function buildLevel(floor = 1) {
  // The THRONE floor is a single boss room — no crawl, no shop, just the King. The map
  // still renders (one ♛ node) so the advance/preview plumbing needs no special cases.
  if (floor >= THRONE_FLOOR) {
    const n = { id: "n" + _nodeSeq++, type: "boss", cleared: false, x: 0.5, y: 0.5, links: [] };
    return { nodes: [n], currentId: n.id };
  }
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
  // pre-roll enchants so the map can preview them on hover (combat/elite only; boss & shop
  // have none). The run's ENTRY room gets the King's Gift; the rest of floor 1 rolls
  // without the Wandering Monster; floors 2+ roll the full wheel.
  for (const n of nodes) if (n.type === "combat" || n.type === "elite")
    n.enchant = (floor === 1 && n === rows[0][0]) ? { ...GIFT_ENCHANT }
              : pickEnchant({ noWanderer: floor === 1, floor });
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
  return Math.max(1, Math.round(cd));   // global playtest slow-down
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
  player.echoCharge = 0; player.echoReady = false; player.echoArmed = false; // a new body = a fresh echo bar
}

// ---------------------------------------------------------------------------
// Body purchase — a TIERED unlock, now PER-PLAYER. A body's tier = its `ante`. Player/draft
// bodies have no ante → tier 0 (free, gated only by the pool). Foe tiers are bought from the
// player's OWN wallet: defeating a foe REACHES its tier for the party (makes it purchasable);
// a player then spends to unlock that whole tier for THEMSELVES (every body of that ante).
// ---------------------------------------------------------------------------
// THE BODY UNLOCK LADDER (owner 2026-06-16: "bodies should be 15 and 30"). Each body TIER
// above your start adds +15 (gold 3 → 15, gold 5 → 30 total); unlockCost(g) is the CUMULATIVE
// total, and buyUnlock's difference-pricing makes every upgrade step cost 15. Tiers = the
// sorted distinct adoptable body golds (currently 1/3/5); the lowest gold is your free
// starting tier. (NOT to be confused with KIT-SLOT upgrades — those are the doubling
// 4/8/16/32/64 ladder in kitSlotCost.)
const UNLOCK_TIERS = [...new Set(
  Object.values(BODIES).filter((b) => b.spawn && !b.boss && !b.summon && (b.gold | 0) > 0).map((b) => b.gold)
)].sort((a, b) => a - b);
export const unlockCost = (g) => {
  const rank = UNLOCK_TIERS.indexOf(g | 0);
  return rank <= 0 ? 0 : 15 * rank;     // gold 1 free, gold 3 → 15, gold 5 → 30
};
// The distinct gold weights the party has FELLED (a threshold must be reached to be bought,
// and a body must be reached for its weight to be wearable — you wear what you've beaten).
export const goldsReached = (room) =>
  [...new Set([...room.unlockedBodies].map((k) => BODIES[k]?.gold ?? 0).filter((g) => g > 0))].sort((x, y) => x - y);

export function canSwapTo(room, player, key) {
  const b = BODIES[key];
  if (!b || b.boss || b.summon) return false;                       // bosses & summon tokens (rats) are never adoptable
  if ([...room.players.values()].some((q) => q !== player && q.bodyKey === key)) return false; // exclusive
  // "ones I've SEEN only" (owner 2026-06-12): a body must itself have been felled/released
  // into the pool — the threshold opens weights, never bodies the party hasn't beaten.
  if (!room.unlockedBodies.has(key)) return false;
  return (b.gold ?? 0) <= (player.unlockGold ?? 1);                 // …and sit under YOUR threshold
}

// Raise YOUR unlock threshold to gold `g` (a reached weight), paying the formula price
// minus what your current threshold already cost — the ladder credits prior purchases.
export function buyUnlock(room, player, g) {
  if (!player || !(g > 0)) return false;
  const cur = player.unlockGold ?? 1;
  if (g <= cur) return false;                                       // never goes down, no rebuys
  if (!goldsReached(room).includes(g)) return false;                // fell one of that weight first
  const cost = unlockCost(g) - unlockCost(cur);
  if ((player.treasure ?? 0) < cost) return false;
  player.treasure -= cost;
  player.unlockGold = g;
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
  room.unlockedBodies.add(player.bodyKey); // my old body goes up into the pool, buyable at its gold
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
// opts.bot — a squad body the host owns but isn't personally piloting: it auto-drafts a
// bundle and fights on AUTO (fires its kit on cooldown, exactly like a foe). The human
// "remotes into" one body at a time; the rest run as bots. opts.owner — the connection/seat
// that owns this slot (so one human can hold several player entities at once).
export function addPlayer(room, id, name, opts = {}) {
  const player = {
    // lane is clamped to the LIVE lane count: a late joiner lands in a real lane (a solo
    // run has only lane 0 — an unclamped default of 1 crashed every subsequent tick).
    id, name: name || "Adventurer", side: "hero", lane: Math.min(1, (room.laneCount ?? LANES) - 1), depth: 0, counters: 0, shield: 0, targetId: null, allyTargetId: null,
    bodyKey: STARTER_BODY, homeBody: STARTER_BODY, classKey: null,
    hp: 0, maxHp: 0, alive: true, downTimer: 0, kitSlots: KIT_SLOTS_BASE,
    treasure: 0,                    // per-player wallet — mirrored income credits it equally
    earned: 0,                      // lifetime room income — the fairness invariant lives on EARNINGS, not holdings (remainder tiebreak)
    unlockGold: 1,                  // YOUR unlock threshold — bodies of gold ≤ this (and reached) are free to wear
    lockedBundle: null, drafted: false, // draft-wheel lock state
    bot: !!opts.bot,                // a squad body on autopilot (auto-drafts, fights on AUTO)
    autoFire: true,                 // owner 2026-06-19: ⚡ AUTO is the default for EVERY body — piloted primary included (toggle still drops to manual)
    manualPref: false,              // remembered mode now defaults to AUTO for all; the toggle updates it, possess restores it
    owner: opts.owner ?? id,        // the seat/connection that controls this entity (self by default)
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
      return { key, charge: 0, cd: Math.max(1, Math.round(baseCd)) }; // global slow-down baked in
    }),
  };
}

// The lane a greedy add's owner holds (clamped to the live lane count).
export function ownerLaneOf(room, ownerId) {
  const p = room.players?.get(ownerId);
  return Math.max(0, Math.min((room.laneCount ?? LANES) - 1, p?.ownedLane ?? 0));
}
// The lane each drafted foe will occupy. COLLECTIVE DRAFT (owner 2026-06-19): foes are no longer
// pinned to the drafter's lane — the party drafts ONE shared pool, then the foes "sort themselves
// out" across the lanes tankiest-first (dealt round-robin in HP order, so each lane gets a wall
// before any lane gets a second — no single lane drowns). formUp then fronts each lane's tankiest.
// Pinned foes (the Wandering Monster) keep their lane. Deterministic (stable HP+index sort) so
// buildRoom's placement and the snapshot preview always agree.
export function placedLanes(room) {
  const laneN = room.laneCount ?? LANES;
  const foes = room.draftedFoes ?? [];
  const out = new Array(foes.length);
  const free = [];
  foes.forEach((f, i) => {
    if (f.lane != null) out[i] = Math.max(0, Math.min(f.lane, laneN - 1)); // pinned (Wandering Monster)
    else free.push(i);
  });
  const hp = (i) => bodyMaxHp(BODIES[foes[i].bodyKey] ?? {});
  free.sort((a, b) => hp(b) - hp(a) || (a - b));   // tankiest first, stable index tiebreak
  free.forEach((idx, k) => { out[idx] = k % laneN; });
  return out;
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
// PACE REDIAL (owner 2026-06-12, live from the train playtest): "all their cooldowns are
// too long — 1.5× harder". Every boss clock cd ÷ 1.5 from the 06-11 first draft. Summon
// TOKENS (head bite, bone wizard blast) keep their own clocks — a rat's clock is a rat's
// clock; the BOSS acts 1.5× as often. Still [PLACEHOLDER] dials.
export const BOSS_DEFS = {
  // Hydra rework (owner 2026-06-12): 5 heads pre-placed, waves now start at 1 and DOUBLE
  // (hyper-inflation), low 1/2/3 floor-scaled maul on its own clock. [PLACEHOLDER] cds.
  hydra:          { startHeads: 5, headCd: 130, headStart: 1, inflate: 2, maulCd: 85 },
  // Boss clocks HALVED at the flag-off seam (sim sweep 2026-06-13): party DPS doubled
  // when cds went literal, so fights end ~2× faster — at the old tick counts the Kraken's
  // median fight ENDED before its first steal fired. These restore the boss tempo the
  // owner tuned on 2026-06-12 ("1.5× harder"), in mechanics-per-fight terms.
  litigationLich: { stanceCd: 45, wizardCd: 70 },      // 4.5s stance windows (owner 6/14: harder to KILL — stance is its real lever, faster wizards did nothing in sim); bone wizards every 7s
  djinn:          { teleportCd: 45, aoeCd: 55, aoeDmg: 2, everyNthItem: 3 },
  kraken:         { stealCd: 65, capPerPlayer: 2,      // steal every 6.5s (owner 6/14: eased from 47; 28 was an unkillable stall in sim); tentacle cap = 2 × players (8 at 4P)
                    replenishCd: (floor) => Math.max(30, 60 - 10 * ((floor | 0) - 1)) }, // 6s, −1s/floor
  // KING MIMIC'S DECK (owner 2026-06-12): each card is its OWN bar — the active card
  // charges, fires its big move, then rotates out for the next. Random rotation, every
  // card covered before the deck reshuffles (a shuffle bag — no repeats inside a pass).
  // Effects PERSIST past their card: the court stays, steals stay stolen, the stance
  // holds until the stance card comes back around. steal/stance/aoe reuse the other
  // bosses' clock cases verbatim — the ultimate mimic plays THEIR moves; only decree is his.
  // All cds/dmg/ante are [PLACEHOLDER] dials.
  kingMimic: {
    cards: [
      { kind: "decree",  cd: 65, label: "♛ DECREE — the court assembles", color: "#e6c34a" },
      { kind: "steal",   cd: 50, label: "👑 STEAL — hands off the crown", color: "#d06fb0" },
      { kind: "stance",  cd: 45, label: "🛡 STANCE — the guard shifts",   color: "#9a7fc0" },
      { kind: "aoe",     cd: 60, label: "☄ CALAMITY — every lane",       color: "#ff9ed2", dmg: 3, aoe: true }, // (= PASSIVE_BAR_COLOR; declared later — TDZ)
    ],
    decreeAnte: 7,                 // "powerful, heavily-anted foes" — each rolled to clear this bar
  },
};
// The items the Djinn conjures: normal table, common/uncommon, damaging only (a summoned
// shield that protects nobody is a dud, not a threat). The ≥1 weapon floor makes even the
// amount-0 school items (Scary Knife) land on the entity's 0-Power chassis.
export const DJINN_ITEM_POOL = Object.keys(KIT).filter((k) =>
  (KIT[k].ante ?? 1) <= 2 &&                       // modest values only (was common/uncommon)
  (KIT[k].ops ?? []).some((o) => o.do === "deal"));

// BOSS PAYDAY (owner 2026-06-12, live from the train): "each boss gives a guaranteed
// selection of rares, and 10g to spend on them." De-tiered reading of "rares": the
// EXPENSIVE end of the kit (ante ≥ RARE_ANTE). [PLACEHOLDER] fills: the 10g is PER
// PLAYER (any party size can afford a rare — party size scales the total, per the
// scaling contract) and the shelf is players + 2 distinct rolls.
export const BOSS_GOLD = 10, RARE_ANTE = 3;
export const RARE_POOL = Object.keys(KIT).filter((k) => (KIT[k].ante ?? 0) >= RARE_ANTE);
export const rollBossLoot = (room) =>
  [...RARE_POOL].sort(() => Math.random() - 0.5).slice(0, Math.max(1, room.players.size || 1) + 2);

// A boss CLOCK: { kind, cd (ticks, cdMult baked in at creation — the landmine), charge,
// label/color/dmg/aoe → its threat bar }. Generic: the back-line boss and the lane-bound
// Djinn both run their mechanics on these.
const bossClock = (kind, cd, bar = {}) =>
  ({ kind, cd: Math.max(1, Math.round(cd)), charge: 0, ...bar });

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

// ---------------------------------------------------------------------------
// King Mimic's deck driver. One card up at a time (one clock, flagged `deck:true`);
// when it fires, the NEXT card replaces it. The bag refills with all four, shuffled,
// never repeating the just-fired card across the reshuffle seam.
// ---------------------------------------------------------------------------
export const drawKingDeck = () => [...BOSS_DEFS.kingMimic.cards].sort(() => Math.random() - 0.5);
export function nextKingCard(boss) {
  if (!boss.deck?.length) {
    boss.deck = drawKingDeck();
    if (boss.deck.length > 1 && boss.deck[0].kind === boss.lastCard)
      boss.deck.push(boss.deck.shift());
  }
  const card = boss.deck.shift();
  boss.lastCard = card.kind;
  boss.clocks = [bossClock(card.kind, card.cd,
    { label: card.label, color: card.color, dmg: card.dmg ?? 0, aoe: !!card.aoe, deck: true })];
}
// DECREE: deploy powerful, heavily-anted foes (owner's words) — armed rolls until the
// ante clears the bar (best-of-30 fallback under it, so a cold streak still lands a court).
export function rollDecreeFoe(minAnte = BOSS_DEFS.kingMimic.decreeAnte) {
  let best = null;
  for (let t = 0; t < 30; t++) {
    const bodyKey = rnd(FOE_BODIES);
    const o = { bodyKey, gear: rollFoeGear(bodyKey, FOE_SPICY_ITEMS, 5) }; // boss court: heavily armed
    if (anteOfFoe(o) >= minAnte) return o;
    if (!best || anteOfFoe(o) > anteOfFoe(best)) best = o;
  }
  return best;
}

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
    case "heads": {                                  // Hydra: HYPER-inflation — each wave DOUBLES (1, 2, 4, 8…)
      spawnSpread(room, "hydraHead", boss.headWave ?? 1);
      boss.headWave = Math.max(2, (boss.headWave ?? 1) * (BOSS_DEFS.hydra.inflate ?? 2));
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
    case "decree": {                                 // King: a heavy armed foe PER PLAYER, emptiest lanes first
      const n = Math.max(1, room.players.size || 1);
      for (let k = 0; k < n; k++) {
        let li = 0;
        for (let i = 1; i < room.laneCount; i++) if (room.lanes[i].length < room.lanes[li].length) li = i;
        const o = rollDecreeFoe();
        if (o) spawnFoeInLane(room, o.bodyKey, li, o.gear);
      }
      formUp(room);
      break;
    }
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
    if (k.deck) { nextKingCard(c); break; }   // the fired card rotates out — c.clocks was just replaced
  }
}

// On-damaged boss triggers WITH lane attribution — the lane the damaging source came from
// is a first-class fact (BOSS_SPEC_V1 architecture). Hydra rework (owner 2026-06-12,
// corrected 00:20): a head pops up for every INSTANCE of damage that lands — one head
// per hit, any size (the owner's first wording said "point"; he meant instance). No
// per-lane rate limit: a 4-strike Omnislash is 4 instances and blooms 4 heads. Big slow
// hits are the efficient way to hurt it; spam feeds the garden.
export function bossOnDamaged(room, boss, laneIdx, landed = 1) {
  if (boss.bodyKey !== "hydra" || !(landed > 0)) return;
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
    boss.clocks = [
      bossClock("heads", def.headCd, { label: "🐍 heads", color: "#5fd0a0" }),
      // the "very low 1, 2, 3 base attack" (owner): a floor-scaled maul on every lane
      bossClock("aoe", def.maulCd ?? 50, { label: "🐉 maul", color: "#ff9ed2", dmg: floor, aoe: true }),
    ];
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
  } else if (bossKey === "kingMimic") {
    boss.deck = [];          // the deck driver: one card = one bar; budget rides room.floor (= THRONE_FLOOR)
    nextKingCard(boss);      // opens with no stance up — the first STANCE card raises the guard
  }
  if (BODIES[bossKey]?.backline) {
    boss.lane = null; boss.depth = null;
    room.boss = boss;
    if (bossKey === "kraken")                        // it ENTERS behind its wall
      spawnSpread(room, "tentacle", boss.tentacleCap, tentaclesOf);
    if (bossKey === "hydra")                         // it OPENS behind five heads (owner 2026-06-12)
      spawnSpread(room, "hydraHead", def.startHeads ?? 5);
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
  room.useCounts = {};                    // telemetry: per-room item-use tally
  room.freezeFoes = 0; room.freezeHeroes = 0;   // ⏳ a Time Stop never outlives its room
  room.caravan.max = room.god ? 999 : caravanMaxHp(room.players.size);
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
    // owner 2026-06-21: REOPEN with the party formation you arranged last setup (snapshotted in
    // beginCombat) — clamped to this room's lane count — instead of resetting to one-body-per-lane.
    // First room (no save yet) falls back to your owned lane at the front.
    const savedLane = p.partyLane;
    p.lane = Number.isInteger(savedLane) ? Math.max(0, Math.min(room.laneCount - 1, savedLane)) : p.ownedLane;
    p.depth = Number.isInteger(p.partyDepth) ? p.partyDepth : 0;
    p.alive = true; p.downTimer = 0;
    wearBody(p, room.god ? STARTER_BODY : (p.homeBody ?? STARTER_BODY));
    if (room.god) { p.maxHp = 999; p.hp = 999; }
  }
  // a saved formation can stack several bodies in one lane — normalize each lane's depths to a
  // clean 0..n-1 front→back line so the blocking order stays unambiguous (mirrors moveDepth).
  for (let ln = 0; ln < room.laneCount; ln++) {
    [...room.players.values()].filter((p) => p.lane === ln)
      .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || (a.id < b.id ? -1 : 1))
      .forEach((p, i) => { p.depth = i; });
  }
  // Foe-draft: ordinary rooms let you stock the foes first. Bosses & god auto-fill.
  room.draftedFoes = [];
  room.loot = [];
  room.tradeOffers = [];        // stale trade offers don't carry between rooms
  const type = currentNode(room)?.type ?? "combat";
  // only combat/elite carry an enchant; shop & boss have none
  room.enchant = (!room.god && (type === "combat" || type === "elite"))
    ? (currentNode(room)?.enchant ?? pickEnchant({ noWanderer: (room.floor ?? 1) === 1, floor: room.floor ?? 1 })) : null;
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
    seedWanderer(room);             // Wandering Monster: its foe is already on the board
    room.foePool = buildFoePool(room.floor ?? 1);
    room.foeNext = 0;
    room.foePalette = [];   // build slot-by-slot, avoiding bodies already chosen → distinct slots
    for (let s = 0; s < PALETTE_SLOTS; s++)
      room.foePalette.push(nextPaletteOption(room, new Set(room.foePalette.map((o) => o.bodyKey))));
    ensureCheapSlot(room);          // a cheap option is always on offer
    room.picksRequired = picksRequiredFor(type);   // 1 each · DOUBLE FEATURE: 2 each (label only)
    room.anteRequired = stockAnteRequired(room, type); // the collective gate: party × floor (×2 elite)
    room.phase = "stock";
  }
}

// Wandering Monster (owner 2026-06-12): the modifier's pre-rolled foe is ALREADY in the
// room when the party arrives — a non-greedy entry (no owner, so removeGreedy can't touch
// it) pinned to a random lane via placedLanes. It pays into V like anything else stocked.
export function seedWanderer(room) {
  const f = room.enchant?.foe;
  if (!f) return;
  // ONE WANDERING FOE PER LANE (owner 2026-06-15). The old single-random-lane spawn got
  // CHEAPER for bigger parties: one foe split across N lanes meant 3 of 4 players coasted
  // while the payout was shared by all — unfair to the unlucky lane and a free ride for the
  // rest. Per-lane keeps the burden symmetric (everyone meets one) and each foe pays its
  // ante into V, so the payout scales with the party like the rest of the economy. Solo
  // (laneCount 1) is unchanged: exactly one foe.
  const lanes = room.laneCount ?? LANES;
  for (let lane = 0; lane < lanes; lane++)
    room.draftedFoes.push({ bodyKey: f.bodyKey, gear: [...(f.gear ?? [])], greedy: false, owner: null, lane });
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
  // remember the slot + option so removal is a true UNDO (see restorePaletteSlot)
  room.draftedFoes.push({ bodyKey: opt.bodyKey, gear: [...(opt.gear ?? [])], greedy: true, owner, slot: idx, opt: { ...opt } });
  // a fresh choice rolls into that slot so there's always something new to pick — avoiding the
  // OTHER slots' bodies so the palette never shows the same foe twice
  if ((room.foePool ?? []).length) {
    const avoid = new Set(room.foePalette.filter((_, j) => j !== idx).map((o) => o?.bodyKey).filter(Boolean));
    room.foePalette[idx] = nextPaletteOption(room, avoid);
  }
  ensureCheapSlot(room);                       // the cheap-option guarantee survives rerolls
  return true;
}

// Live player action (COLLECTIVE DRAFT, owner 2026-06-19): draft a foe from the palette into the
// shared pool. FREE-FOR-ALL — no per-player cap; anyone adds as many as they like until the room's
// ante is met (the only ceiling is STOCK_MAX, enforced in addFoe). The owner tag is kept for
// telemetry/credit only — it no longer pins the foe to a lane (placedLanes sorts by tankiness).
export function addGreedy(room, player, idx) {
  if (room.phase !== "stock" || !player) return false;
  return addFoe(room, idx, player.id);
}

// Removal is an UNDO: the pick's original option goes BACK into the palette slot it came
// from, overwriting whatever rolled in. Remove/re-add cycles therefore reveal nothing new —
// the reroll-scry loop (fishing the wheel for the weakest foes, owner 2026-06-12) is dead,
// while plain adds still roll fresh options for everyone else.
function restorePaletteSlot(room, f) {
  if (f?.slot == null || !f.opt || !room.foePalette?.[f.slot]) return;
  room.foePalette[f.slot] = { ...f.opt };
  ensureCheapSlot(room);   // the restored option may displace the cheap guarantee
}

// NO TAKE-BACKS (owner 2026-06-19: "once you draft a foe it's there, your regret be damned").
// The live remove action is now a no-op; a drafted foe is committed. (`removeFoe` survives as a
// test/utility primitive.) Kept exported so the server's stockRemove route + imports stay valid.
export function removeGreedy(room, player) {
  return false;
}

// Index-based removal primitive (only removes greedy foes). Used by tests/legacy.
export function removeFoe(room, i) {
  if (room.phase !== "stock") return;
  const f = room.draftedFoes[i];
  if (f && f.greedy) { restorePaletteSlot(room, f); room.draftedFoes.splice(i, 1); } // baseline rank-and-file can't be removed
}

// COLLECTIVE DRAFT (owner 2026-06-19): there's no per-body quota anymore — the party fills ONE
// shared ante, so squad bots no longer auto-place (the piloting human drafts the whole room, free-
// for-all). No-op kept so commitStock's call + existing imports stay valid; the begin gate can't
// soft-lock now because the human can always add another foe until the ante is met.
export function autoStockBots(room) {}

export function commitStock(room) {
  if (room.phase !== "stock") return;
  autoStockBots(room);                  // squad bots fill their own lanes before the gate is checked
  if (!stockReady(room)) return;        // everyone (the human included) places their pick(s) first
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

// SQUAD GIVE (owner 2026-06-21): hand an item to ANOTHER OF YOUR OWN bodies — INSTANT, no offer, no
// gold (it's all you; the seat's holdings move freely, earnings-equality is per-SEAT so untouched).
// Same-seat only; the receiving body needs a free kit slot. Out-of-combat (won/shop), like trades.
export function giveOwnItem(room, from, toId, key) {
  if (!tradeable(room) || !from) return false;
  const to = room.players.get(toId);
  if (!to || to === from) return false;
  const seat = (p) => p.owner ?? p.id;
  if (seat(to) !== seat(from)) return false;                         // your own squad only
  const i = (from.draftPicks ?? []).indexOf(key);
  if (i < 0 || !KIT[key]) return false;
  if ((to.draftPicks ?? []).length >= (to.kitSlots ?? KIT_SLOTS_BASE)) return false; // no room
  from.draftPicks.splice(i, 1);
  (to.draftPicks ??= []).push(key);
  return true;
}

// SQUAD SWAP (owner 2026-06-21): exchange ONE item between two of YOUR OWN bodies — instant, no
// offer, no gold, and NO space gate (one out, one in on each side, so a full kit can still swap).
// This is the loadout board's primitive for rearranging FULL squads, where a one-way give can't
// land (no free slot). Same-seat only, out-of-combat (won/shop). Positions are preserved.
export function swapOwnItems(room, from, toId, fromKey, toKey) {
  if (!tradeable(room) || !from) return false;
  const to = room.players.get(toId);
  if (!to || to === from) return false;
  const seat = (p) => p.owner ?? p.id;
  if (seat(to) !== seat(from)) return false;                         // your own squad only
  const fi = (from.draftPicks ?? []).indexOf(fromKey);
  const ti = (to.draftPicks ?? []).indexOf(toKey);
  if (fi < 0 || ti < 0 || !KIT[fromKey] || !KIT[toKey]) return false;
  from.draftPicks.splice(fi, 1, toKey);   // replace in place — size unchanged, no space gate
  to.draftPicks.splice(ti, 1, fromKey);
  return true;
}

// Execute an agreed one-way GIFT/sale (cross-human): `from` hands `key` to `to`, who pays its value
// in treasure (value moves as gold → the per-seat earnings invariant holds). Needs space + funds.
export function giftItem(room, from, to, key) {
  if (!tradeable(room) || !from || !to || from === to) return false;
  const i = (from.draftPicks ?? []).indexOf(key);
  if (i < 0 || !KIT[key]) return false;
  if ((to.draftPicks ?? []).length >= (to.kitSlots ?? KIT_SLOTS_BASE)) return false; // no room
  const cost = itemTreasure(key);
  if ((to.treasure ?? 0) < cost) return false;                       // can't afford
  from.draftPicks.splice(i, 1);
  (to.draftPicks ??= []).push(key);
  to.treasure -= cost; from.treasure = (from.treasure ?? 0) + cost;
  return true;
}

let _offerSeq = 1;
// Propose a trade: `from` offers their `give` to `to`. `want` = a swap (their item, gap settled in
// gold) OR null = a one-way GIFT (the recipient pays `give`'s value). Stored until accepted/declined.
export function proposeTrade(room, from, toId, give, want = null) {
  if (!tradeable(room) || !from) return false;
  const to = room.players.get(toId);
  if (!to || to === from) return false;
  if (!(from.draftPicks ?? []).includes(give)) return false;
  if (want != null && !(to.draftPicks ?? []).includes(want)) return false;   // swap must name a held item
  (room.tradeOffers ??= []).push({ id: "of" + _offerSeq++, from: from.id, to: toId, give, want: want ?? null });
  return true;
}

// The target accepts: re-validate and execute (gift when want is null, else a swap), then clear it.
export function acceptTrade(room, accepter, offerId) {
  const offers = room.tradeOffers ?? [];
  const i = offers.findIndex((o) => o.id === offerId);
  if (i < 0) return false;
  const o = offers[i];
  if (!accepter || accepter.id !== o.to) return false;       // only the target can accept
  const from = room.players.get(o.from);
  if (!from) { offers.splice(i, 1); return false; }
  const okTrade = o.want == null ? giftItem(room, from, accepter, o.give)
                                 : tradeItems(room, from, accepter, o.give, o.want);
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
  if (room.phase === "setup") {
    room.phase = "playing";
    // owner 2026-06-21: remember the lanes/depths you arranged in SETUP so the NEXT room reopens
    // with the SAME formation (no reset to one-body-per-lane). Snapshot NOW — before combat moves
    // scramble depth — so it captures your deliberate placement, not the post-fight scramble.
    for (const p of room.players.values()) { p.partyLane = p.lane; p.partyDepth = p.depth ?? 0; }
  }
  room._bestFoeHp = undefined; room._bestCav = undefined; room._stallTicks = 0; // reset anti-stall
  // Per-fight state, symmetric for players (inv) and foes (equipment):
  //  • thorns buffs (Spikes) expire — "this fight" only;
  //  • shields expire too (owner bug report 2026-06-12: a banked buffer was carrying
  //    across rooms). PLAYERS only — foe shields are spawn-granted (Armory) and fresh
  //    per room anyway, so zeroing them here would erase the modifier;
  //  • `startCharged` items (Trusty Shield) open the fight ready to fire.
  for (const p of room.players.values()) {
    p.thorns = 0; p.shield = 0;
    p.echoCharge = 0; p.echoReady = false; p.echoArmed = false;  // the echo bar is per-fight state
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
// Draft bundles roll CHEAP (value-1) items only — value climbs through loot/shop, not the wheel.
// KIT FIT (owner 2026-06-12): 2 of the 3 items are IN-HOUSE — the body's own school, with
// untyped utility (shields) fitting anyone — so no bundle is a trap (a Lizard Wizard never
// opens on a Bow). The third is a WILD CARD from the whole common pool ON PURPOSE: the odd
// cross-school find (a Minotaur holding Lightning that answers a rat flood) is strategy,
// not noise. Slot 1 is in-house AND damaging so no loadout is a dud and combat can't
// deadlock from a toothless party.
const CHEAP_KIT = KIT_POOL.filter((k) => (KIT[k].ante ?? 1) <= 1); // value-1 items (was "commons")
const DAMAGING_ITEMS = CHEAP_KIT.filter((k) => (KIT[k].ops ?? []).some((o) => o.do === "deal"));
const inHouseFor = (bodyKey, k) => {
  const school = ((BODIES[bodyKey]?.mag ?? 0) > 0) ? "magical" : "physical";
  return !KIT[k].type || KIT[k].type === school;   // untyped utility fits any body
};
function rollKit(bodyKey) {
  const house = CHEAP_KIT.filter((k) => inHouseFor(bodyKey, k));
  const first = rnd(house.filter((k) => DAMAGING_ITEMS.includes(k)));      // in-house + damaging
  const second = rnd(house.filter((k) => k !== first));                    // in-house
  const wild = rnd(CHEAP_KIT.filter((k) => k !== first && k !== second)); // any value-1 item
  return [first, second, wild];
}
let _bundleSeq = 1;
// Roll the shared wheel: distinct low bodies, each with a fresh 3-item bundle. At least
// DRAFT_WHEEL_MIN and always ≥ players + 1 so locking stays a real exclusive choice (the last
// locker still sees two options) while the common solo/squad case fits one phone row (5).
export function rollDraftWheel(playerCount = 1) {
  const size = Math.min(DRAFT_BODIES.length, Math.max(DRAFT_WHEEL_MIN, playerCount + 1));
  const bodies = [...DRAFT_BODIES].sort(() => Math.random() - 0.5).slice(0, size);
  return bodies.map((bodyKey) => ({ id: "bndl" + _bundleSeq++, bodyKey, items: rollKit(bodyKey) }));
}

// Late-join grow (owner 2026-06-19: rooms open straight into the draft, so players now ARRIVE
// mid-draft instead of waiting in a lobby). Append fresh bundles — bodies not already on the
// wheel — up to the same target rollDraftWheel uses, WITHOUT disturbing existing bundles, so
// anyone who already locked a pick keeps it. Caps at the body pool, like the initial roll.
export function growDraftWheel(room) {
  if (room.phase !== "draft") return;
  const wheel = room.draftWheel ?? (room.draftWheel = []);
  const target = Math.min(DRAFT_BODIES.length, Math.max(DRAFT_WHEEL_MIN, room.players.size + 1));
  if (wheel.length >= target) return;
  const used = new Set(wheel.map((w) => w.bodyKey));
  const fresh = DRAFT_BODIES.filter((b) => !used.has(b)).sort(() => Math.random() - 0.5);
  while (wheel.length < target && fresh.length) {
    const bodyKey = fresh.shift();
    wheel.push({ id: "bndl" + _bundleSeq++, bodyKey, items: rollKit(bodyKey) });
  }
}

export function startDraft(room) {
  room.phase = "draft";
  room.level = null;
  room.levelComplete = false;
  room.runWon = false;            // a fresh run, a fresh claim on the throne
  room.floor = 1;                 // a fresh run starts on floor 1
  room.anteMin = ANTE_MIN; room.anteCap = ANTE_CAP_BASE; // fresh run, fresh roll window (the ratchet resets here only)
  room.bossDraw = drawBossRotation();  // this run's 3-of-4 boss rotation, seeded once (map preview agrees)
  room.unlockedBodies = new Set([STARTER_BODY]); // a NEW run resets the adopted-body pool
  room.draftWheel = rollDraftWheel(room.players.size); // the shared body+items wheel
  syncLobbyLanes(room);   // board preview = party size (covers a re-draft after a lost run)
  // …and every player's wallet, bought tiers, kit space, and draft lock (fresh run wipes them)
  for (const p of room.players.values()) {
    p.classKey = null; p.draftPicks = []; p.kitSlots = KIT_SLOTS_BASE;
    p.treasure = 0; p.earned = 0; p.unlockGold = 1;
    p.lockedBundle = null; p.drafted = false;
  }
  // SQUAD (owner 2026-06-18): the human drafts a body + kit for EACH of their bodies — so squad
  // bodies are NOT auto-drafted anymore. The client cycles through them (possess + draftPick per
  // body); the run starts once every body is picked. (autoDraftBots is kept for any future true-AI
  // bot, but no longer fired here — every current bot is a human-owned squad body.)
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

// Squad bots don't sit at the draft wheel — each undrafted bot grabs a distinct still-open
// bundle the instant the wheel exists, so the human only ever picks for the body they're
// piloting and the draft never stalls waiting on autopilots. The wheel is always sized
// ≥ players + 2, so a bundle is guaranteed free for every seat.
export function autoDraftBots(room) {
  if (room.phase !== "draft") return;
  for (const p of room.players.values()) {
    if (!p.bot || p.drafted) continue;
    const taken = new Set([...room.players.values()].map((q) => q.lockedBundle).filter(Boolean));
    const b = (room.draftWheel ?? []).find((x) => !taken.has(x.id));
    if (b) applyDraftPick(room, p, b.bodyKey, b.items, b.id);  // also maybeFinishDraft()s
  }
}

export function startLevel(room) {
  room.level = buildLevel(room.floor ?? 1);
  room.levelComplete = false;
  enterRoom(room);
}

// After clearing a boss, descend to the next floor: a fresh map, higher ante. Your
// kit and claimed items carry on; only death (the caravan falling) ends the run.
export function descend(room) {
  if (room.phase !== "won" || !room.levelComplete || room.runWon) return false; // the throne is the LAST floor
  // No banking: the room's value was already mirrored into every wallet on clear; unclaimed
  // loot is simply gone ("use it or lose it"). enterRoom resets room.loot for the next room.
  room.floor = (room.floor ?? 1) + 1;
  room.level = buildLevel(room.floor);
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
export const effPhys = (c) => (c.phys ?? c.atk ?? 0) + (c.counters ?? 0) + itemStatBonus(c, "phys") + buffAmt(c, "power");
export const effMag  = (c) => (c.mag ?? 0) + itemStatBonus(c, "mag") + buffAmt(c, "power");
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
  pas.forEach((p, pi) => { if (p.every) c.pcharge[pi] = (c.pcharge[pi] ?? 0) + (ac.amount ?? 10) * (c.cdMul ?? 1); });
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
// Item version: an ARMED echo body resolves a matching-school item's ops TWICE — the
// preview doubles only while the charge is lit, so the bar number can never lie.
export const foeItemDmg = (room, e, key) => {
  const item = KIT[key];
  if (!item?.ops) return 0;
  const times = item.type && BODIES[e.bodyKey]?.echo === item.type && e.echoArmed ? 2 : 1;
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
    const cd = (p.every ? p.every : body.cd) * cdMul;
    if (!cd) return;                                       // cd:0 bodies have no hourglass clock
    const charge = p.every ? pc[pi] : e.charge;
    const harm = opsHarm(p.ops);
    out.push({ kind: "passive", harm, label: timerLabel(e, p.ops),
      dmg: harm ? foeOpsDmg(room, e, p.ops) : 0,           // the bar says how hard it hits
      color: harm ? PASSIVE_BAR_COLOR : nonHarmColor(p.ops), frac: frac(charge, cd), cd: Math.round(cd) });
  });
  // EVERY active item gets a bar now (owner 2026-06-19: "if they have multiple items, see EVERY
  // bar"). Damaging items read as threats (harm:true, pink-ish heat); shields/heals/summons/buffs
  // ride a neutral hue (harm:false) so they're visible without faking incoming damage. A pure
  // passive item (no active ops) shows NO bar — those live in the scroll-over inspect.
  for (const it of e.equipment ?? []) {
    if (it.spent) continue;
    const item = KIT[it.key];
    if (!item?.ops) continue;
    const harm = opsHarm(item.ops);
    out.push({ kind: "item", harm, key: it.key, label: item.name ?? it.key,
      dmg: harm ? foeItemDmg(room, e, it.key) : 0,
      color: item.color ?? "#ccd", frac: frac(it.charge, it.cd), cd: it.cd });
  }
  // the ECHO bar (echo bodies, owner redesign 2026-06-12): charges toward the double,
  // pushed back by the wearer's own uses. Shows for foes AND for the player's own body line.
  if (body.echo) {
    const ecd = Math.round(ECHO_CD * cdMul);
    out.push({ kind: "echo", harm: false, dmg: 0, color: "#9ad0e6", cd: ecd,
      label: e.echoArmed ? "🔁 echo ARMED" : e.echoReady ? "🔁 echo READY" : "🔁 echo",
      frac: e.echoArmed || e.echoReady ? 1 : frac(e.echoCharge ?? 0, ecd) });
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
      // RELATIVE placement (owner 2026-06-12): your summons enter just in FRONT of you
      // (meat-shield, the default) or just BEHIND you (player toggle `summonSide`).
      // Fractional depth slots the token between neighbors; the next moveDepth
      // normalization cleans the line back to integers.
      const d = source.depth ?? (laneLine(room, li)[0]?.depth ?? 0);
      tok.depth = d + (source.summonSide === "back" ? 0.5 : -0.5);
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
    if (c.pcharge[pi] >= pas[pi].every * (c.cdMul ?? 1)) { c.pcharge[pi] = 0; resolveOps(room, c, pas[pi].ops); }
  }
}

// THE ECHO BAR (owner redesign 2026-06-12, supersedes the armed-clock — the clunky-feel
// fix): an echo body's bar charges on its own, and EVERY item its wearer uses PUSHES IT
// BACK — heavy slow kits charge through the pushback, spam never does. The body "wants
// big slow buttons" is now enforced in-fight, not at kit-build. Full bar: a FOE arms
// instantly (no hands); a PLAYER gets a lit ECHO button and arms it by CHOICE — a
// consume decision, never a press-timing one (sticky-mode contract). Armed → the next
// matching-school item resolves twice (the doubling machinery is unchanged).
// NOTE the AUTO-mode anti-synergy is deliberate: constant auto-presses keep the bar
// down — the deliberate-play body punishes autopilot. [PLACEHOLDER] dials.
export const ECHO_CD = 70, ECHO_DELAY = 15;  // 7s bar, 1.5s pushback per use (owner 2026-06-15: ×1.5 then +1s tempo passes; was 40/10)
export function tickEchoBar(c, isFoe) {
  if (!BODIES[c.bodyKey]?.echo || c.echoArmed || c.echoReady) return;
  c.echoCharge = (c.echoCharge ?? 0) + 1;
  if (c.echoCharge >= ECHO_CD * (c.cdMul ?? 1)) {
    c.echoCharge = 0;
    if (isFoe) c.echoArmed = true; else c.echoReady = true;
  }
}
export function echoDelay(c) {   // an item use pushes the wearer's OWN echo bar back
  if (BODIES[c.bodyKey]?.echo) c.echoCharge = Math.max(0, (c.echoCharge ?? 0) - ECHO_DELAY);
}
export function armEcho(room, player) {  // the player's button: READY → ARMED, their call
  if (room.phase !== "playing" || !player?.echoReady) return false;
  player.echoReady = false; player.echoArmed = true;
  return true;
}

// TIMED BUFFS (the post-floor-3 wave, owner-ordered 2026-06-12): generic {kind, amount,
// left} entries on ANY combatant, ticked down once per room tick. Symmetric by
// construction — a foe holding a buff item buffs itself the same way.
//  • haste — items charge double-speed · power — +N to BOTH schools (feeds effPhys/effMag,
//    so previews and snapshots inherit it) · stoneskin — −N off every incoming hit.
// Durations are literal ticks like every other number (the cdMult knob that once made
// buff uptime differ between test and live pacing is dead — owner 2026-06-12).
export function addBuff(c, kind, amount, dur) { (c.buffs ??= []).push({ kind, amount: amount ?? 0, left: Math.max(1, dur | 0) }); }
export const buffAmt = (c, kind) => (c?.buffs ?? []).reduce((s, b) => s + (b.kind === kind ? b.amount : 0), 0);
export const hasBuff = (c, kind) => (c?.buffs ?? []).some((b) => b.kind === kind);
export function tickBuffs(c) { if (c?.buffs?.length) c.buffs = c.buffs.filter((b) => --b.left > 0); }

// Drain every clock a combatant owns (Blizzard's bite) — SYMMETRIC: foe equipment and
// player inv are the same concept, so one drain serves both sides (the old foe-only
// drain was why a foe Blizzard was a no-op vs players — the reason it was exiled from
// the foe pools; fixed 2026-06-12, owner bug report "I've never seen a blizzard").
export function drainClocks(c, amt) {
  c.charge = Math.max(0, (c.charge ?? 0) - amt);
  for (const it of c.equipment ?? []) it.charge = Math.max(0, it.charge - amt);
  for (const iv of c.inv ?? []) iv.charge = Math.max(0, iv.charge - amt);
  if (c.pcharge) for (const k in c.pcharge) c.pcharge[k] = Math.max(0, c.pcharge[k] - amt);
  if (c.clocks) for (const k of c.clocks) k.charge = Math.max(0, k.charge - amt);
  c.echoCharge = Math.max(0, (c.echoCharge ?? 0) - amt);
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
      else if (op.do === "delay") {                  // foe Blizzard: drain the HEROES' clocks (symmetry fix 2026-06-12)
        for (const h of heroesInLane(room, li)) drainClocks(h, amt);
        for (const al of room.allies?.[li] ?? []) drainClocks(al, amt);
      }
      else if (op.do === "buff") addBuff(source, op.buff, op.amount, op.dur);   // a foe buffs itself, same rules
      else if (op.do === "timeStop") room.freezeHeroes = Math.max(room.freezeHeroes ?? 0, op.dur ?? 30);
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
          if (source.side === "hero" && bossAlive(room))  // the back-line boss sits behind every lane —
            damageEnemy(room, source.lane, room.boss, dmg, source); // lane AoE used to miss it (owner bug 2026-06-17)
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
        if (op.target === "lane") {                       // Blizzard: every foe in your lane…
          for (const e of room.lanes[source.lane]) drainClocks(e, amt);
          if (source.side === "hero" && bossAlive(room)) drainClocks(room.boss, amt); // …AND the back-line boss (owner bug 2026-06-17)
          break;
        }
        const t = aimedFoe(room, source, op.target);
        if (t) drainClocks(t.foe, amt);
        break;
      }
      case "buff": {   // Haste / Power Boost / Stone Skin — castable on a TEAMMATE via the
        // ally-target slot (owner 2026-06-12), same slot heals read; falls back to self.
        const at = source.allyTargetId != null ? room.players?.get(source.allyTargetId) : null;
        addBuff((at && at.alive) ? at : source, op.buff, op.amount, op.dur);
        break;
      }
      case "gigaArm":  source.gigaArmed = true; break;    // Giga Cast: the NEXT staff item resolves ×4
      case "timeStop": room.freezeFoes = Math.max(room.freezeFoes ?? 0, op.dur ?? 30); break; // ⏳ freeze the foe side
      case "revive": {  // once-per-fight rescue: a downed teammate to FULL (ally-target first), else a full heal
        const at = source.allyTargetId != null ? room.players?.get(source.allyTargetId) : null;
        const t = (at && !at.alive) ? at
              : [...room.players.values()].find((q) => !q.alive)
              ?? ((at && at.alive) ? at : lowestHpFriendly(room, source));
        if (t) { t.alive = true; t.downTimer = 0; t.hp = t.maxHp; }
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
        // SMART TANK HEALING (owner 2026-06-21): your ALLY-target slot (🎯 → tap an ally) is the
        // priority — pin the tank and heals land on the tank WHILE IT NEEDS THEM. But a foe wouldn't
        // waste a hit, and neither should a healer: if the pinned target is already topped off we DON'T
        // overheal it, we slide to the most-hurt friendly in the lane instead. No pin set → just heal
        // the most-hurt friendly. Offense never reads this slot.
        const at = source.allyTargetId != null ? room.players?.get(source.allyTargetId) : null;
        const needsHeal = (q) => q && q.alive && q.hp < q.maxHp;
        const t = needsHeal(at) ? at : (lowestHpFriendly(room, source) ?? (at && at.alive ? at : null));
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
      // (the "echoArm" op died with the armed-clock echo — the bar lives in tickEchoBar now)
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
  // ECHO (V2 §4.3, redial 2026-06-12): the body's echo clock ARMS the double; a matching-
  // school press while lit resolves the item's OPS twice and consumes the charge. The
  // school trigger still fires once — echo doubles the item, not the body's reaction.
  let times = item?.type && body?.echo === item.type && player.echoArmed ? 2 : 1;
  if (times === 2) player.echoArmed = false;
  if (player.gigaArmed && item?.type === "magical") { times *= 4; player.gigaArmed = false; } // Giga Cast: ×4 (stacks with echo)
  if (item?.ops) for (let n = 0; n < times; n++) resolveOps(room, player, item.ops, item.type);
  if (item?.type) fireSchoolTrigger(room, player, item.type); // "when I sword/staff" fires after the item
  inv.charge = 0;
  if (item?.fragile) inv.spent = true;
  echoDelay(player);                    // every use pushes the wearer's own echo bar back
  (room.useCounts ??= {})[inv.key] = ((room.useCounts ?? {})[inv.key] ?? 0) + 1; // telemetry: per-room use counts (AUTO included)
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
  const dr = itemDmgReduce(enemy) + buffAmt(enemy, "stoneskin"); // worn Aegis + Stone Skin soften every hit (floor 0)
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
      if (BODIES[enemy.bodyKey]?.boss) bossOnDamaged(room, enemy, laneIdx, landed); // Hydra: a head per POINT landed
    }
  }
  reflectThorns(room, enemy, attacker);   // a thorned foe spikes its striker back
  return landed;
}

// Returns the damage that LANDED (past auras/armor, into shield+HP).
export function damagePlayer(room, p, amount) {
  if (!p.alive) return 0;
  amount -= laneAura(room, p, "dmgReduce");       // Totem/Knight: lane allies take −1
  const dr = itemDmgReduce(p) + buffAmt(p, "stoneskin");  // worn Crown + Stone Skin soften every hit (floor 0)
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
  // ⏳ Time Stop counters (one per side — a foe-held Time Stop freezes the heroes)
  if (room.freezeFoes > 0) room.freezeFoes--;
  if (room.freezeHeroes > 0) room.freezeHeroes--;

  for (const p of room.players.values()) {
    if (!p.alive) continue; // downed heroes stay out unless a Revive item brings them back
    ensureTarget(room, p); // always keep a valid aim
    tickBuffs(p);
    if (room.freezeHeroes > 0) continue;            // frozen heroes: every clock stands still
    const body = BODIES[p.bodyKey];
    const step = 1 + (hasBuff(p, "haste") ? 1 : 0); // Haste: items charge double-speed
    for (const inv of p.inv) {
      const max = itemCd(inv, body);
      inv.charge = Math.min(max, inv.charge + step);
    }
    // AUTO fire mode (owner 2026-06-12: "officially tired of clicking" — supersedes the
    // earlier no-auto-bars ruling, manual stays the default). A READY item fires itself
    // through the ordinary useItem path (echo, Djinn counter, school triggers — all real
    // uses). Owner 2026-06-16: "AUTO should press EVERY button" — EVERY active item fires
    // now (damage, heals, shields, summons, buffs, AND the fragile one-shots). Only worn
    // passives (no ops, e.g. Slime Crown) have nothing to press.
    if (p.autoFire) for (let s = 0; s < p.inv.length; s++) {
      const inv = p.inv[s];
      if (inv.spent || inv.stolen || inv.charge < itemCd(inv, body)) continue;
      const it = KIT[inv.key];
      if (!it?.ops) continue;               // worn passive — no button to press
      useItem(room, p, s);
    }
    // SYMMETRY: a worn body's passives fire for the player exactly as they do for a foe. Self-timed
    // `every:N` clocks (Royal Rat summon, Wageslave heal) run via tickOwnTimers; the hourglass timer
    // fires the body's on-hourglass passive. Only the kit items stay manual (click-to-fire).
    tickOwnTimers(room, p);
    tickEchoBar(p, false);  // a full bar lights the ECHO button — arming is the player's call
    if (body?.cd > 0) {
      p.charge = (p.charge ?? 0) + 1;
      if (p.charge >= body.cd) { p.charge = 0; runPassive(room, p, "hourglass"); }
    }
  }

  for (let i = 0; i < room.laneCount; i++) {
    for (const e of [...room.lanes[i]]) { // copy: passives/summons may grow the lane mid-tick
      e.side = "foe"; e.lane = i;
      tickBuffs(e);
      if (room.freezeFoes > 0) continue;  // ⏳ Time Stop: the whole foe machine stands still
      // items: each charges and fires through the shared resolver (fragile fires once)
      if (e.equipment) for (const it of e.equipment) {
        if (it.spent) continue;
        if (it.charge < it.cd) { it.charge++; continue; }
        it.charge = 0;
        const item = KIT[it.key];
        // symmetric ECHO: an ARMED matching-school foe body resolves its item's ops twice
        const times = item?.type && BODIES[e.bodyKey]?.echo === item.type && e.echoArmed ? 2 : 1;
        if (times === 2) e.echoArmed = false;
        if (item?.ops) for (let n = 0; n < times; n++) resolveOps(room, e, item.ops, item.type);
        if (item?.type) fireSchoolTrigger(room, e, item.type); // foe "when I sword/staff" fires too (symmetry)
        echoDelay(e);    // symmetric: a foe's use pushes ITS echo bar back too
        if (item?.fragile) it.spent = true;
      }
      // per-passive independent timers: a passive carrying `every:N` runs on its OWN
      // clock, decoupled from the body timer and from anything the players do — so a
      // body can ramp every 3.5s AND heal every 5s at their own cadences (visible ramps).
      tickOwnTimers(room, e);
      tickEchoBar(e, true);   // a foe echo body auto-arms on a full bar — no hands, no button
      // a lane-bound boss (the Djinn) runs its mechanics on boss clocks, not passives
      if (e.clocks) tickBossClocks(room, e);
      // body timer: on completion, fire its (non-self-timed) hourglass passives. Foes
      // have NO base swing — damage comes from items and passives, like players.
      e.charge++;
      if (e.charge < BODIES[e.bodyKey].cd * (e.cdMul ?? 1)) continue; // enchant may hasten
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
        if (al.charge >= BODIES[al.bodyKey].cd) { al.charge = 0; runPassive(room, al, "hourglass"); }
      }
    }
  }

  // the BACK-LINE boss (Hydra/Lich/Kraken) ticks its clocks from behind the lanes
  if (bossAlive(room)) {
    room.boss.side = "foe"; tickBuffs(room.boss);
    if (!(room.freezeFoes > 0)) tickBossClocks(room, room.boss);  // ⏳ Time Stop freezes bosses too
  }

  if (!(room.freezeFoes > 0)) processRoomTimers(room); // Acid Rain / Rat Colony freeze with the foes

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
    if (cur && cur.type === "boss") {
      cur.cleared = true; room.levelComplete = true;
      if ((room.floor ?? 1) >= THRONE_FLOOR) room.runWon = true;  // the King fell — RUN COMPLETE
      // BOSS PAYDAY: a guaranteed shelf of rares + 10g each to spend on them
      room.loot = [...room.loot, ...rollBossLoot(room)];
      for (const p of room.players.values()) { p.treasure = (p.treasure ?? 0) + BOSS_GOLD; p.earned = (p.earned ?? 0) + BOSS_GOLD; }
    }
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
    runWon: !!room.runWon,                // King Mimic fell — the run is complete (victory screen)
    freeze: room.freezeFoes ?? 0,         // ⏳ Time Stop ticks left on the foe side (HUD badge)
    laneCount: room.laneCount ?? LANES,   // N columns for the renderer (= player count, 1–4)
    enchant: room.enchant ? { name: room.enchant.name, text: room.enchant.text } : null,
    roomTimers: (room.roomTimers ?? []).map((t) => ({ kind: t.kind, frac: Math.min(1, (t.charge ?? 0) / t.cd), cd: t.cd })),
    lanes: room.lanes.map((arr, i) => ({
      enemies: arr.map((e) => ({
        id: e.id, bodyKey: e.bodyKey, name: e.name ?? BODIES[e.bodyKey]?.name ?? e.bodyKey, hp: e.hp, maxHp: e.maxHp, shield: e.shield ?? 0, charge: e.charge,
        cd: Math.round((BODIES[e.bodyKey]?.cd ?? 0) * (e.cdMul ?? 1)),
        threat: foeThreat(room, e),     // {frac, cd} soonest INCOMING damage — drives border heat + AoE alarm
        threats: foeThreats(room, e),   // ALL damaging clocks (one labeled, color-coded bar each)
        reactive: (BODIES[e.bodyKey]?.passive ?? []).some((p) => p.on === "damaged" && opsHarm(p.ops)), // hits back when struck (no clock)
        tags: bodyTags(e.bodyKey),      // ⚡ trigger labels (on sword/staff/when hit) — no clock, shown as tags
        dr: itemDmgReduce(e) + buffAmt(e, "stoneskin"),  // worn DR + Stone Skin → 🛡 badge
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
    goldsReached: goldsReached(room),     // distinct felled body weights (the buyable thresholds)
    unlockCosts: Object.fromEntries(goldsReached(room).map((g) => [g, unlockCost(g)])), // ladder totals; client shows total − your unlockPaid
    roomValue: room.lastRoomValue ?? 0,   // V mirrored to every wallet on the last clear (display)
    bossGold: BOSS_GOLD,                  // the per-player boss bounty (won-screen display)
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
      picksRequired: room.picksRequired ?? 1,         // DOUBLE FEATURE label only (gate is ante now)
      picks: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, picks: playerPicks(room, p.id) })),
      // COLLECTIVE DRAFT: the begin gate is the SHARED ante — once the drafted pool meets the room's
      // requirement (party × floor, ×2 elite), anyone can begin. Overshoot is allowed.
      anteRequired: room.anteRequired ?? 0,           // ⚖ the party must reach to begin
      canBegin: anteCurrent(room) >= (room.anteRequired ?? 0),
      anteStocked: anteCurrent(room),                 // total drafted weight (display)
      anteMin: room.anteMin ?? ANTE_MIN, anteCap: room.anteCap ?? ANTE_CAP_BASE, anteStep: ANTE_STEP, // the roll window + ratchet preview
      greedTreasure: room.draftedFoes.reduce((s, f) => s + foeLootValue(f), 0), // ITEM loot only
      palette: room.foePalette.map((o) => ({
        bodyKey: o.bodyKey, name: BODIES[o.bodyKey].name, maxHp: bodyMaxHp(BODIES[o.bodyKey]),
        phys: BODIES[o.bodyKey]?.phys ?? 0, mag: BODIES[o.bodyKey]?.mag ?? 0, // body Power — what its gear scales with
        ante: anteOfFoe(o),                 // ← THE BIG NUMBER (body gold + items)
        bodyAnte: bodyAnteOf(o),            // the body's own gold alone (also its adoption price)
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
          ante: anteOfFoe(f),
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
      offline: !p.ws && !p.bot,                          // seat held, socket gone (bots are never "offline")
      owner: p.owner ?? p.id,                            // SQUAD: the seat that owns this body (itself for a lone player)
      bot: !!p.bot,                                      // a squad body the human isn't piloting right now (on AUTO)
      bodyKey: p.bodyKey, hp: p.hp, maxHp: p.maxHp, shield: p.shield ?? 0, alive: p.alive,
      phys: p.phys ?? 0, mag: p.mag ?? 0, dr: itemDmgReduce(p) + buffAmt(p, "stoneskin"),  // worn DR + Stone Skin
      passive: BODIES[p.bodyKey]?.passiveText ?? null, tags: bodyTags(p.bodyKey), // your worn body's effect + ⚡ triggers
      bodyThreats: foeThreats(room, p),                          // your body's own timer bars (Royal Rat/Wageslave)
      classKey: p.classKey ?? null,
      summonSide: p.summonSide ?? "front",               // where YOUR summons enter the line
      autoFire: !!p.autoFire,                            // ⚡ AUTO: ready damaging items fire themselves
      echo: BODIES[p.bodyKey]?.echo ?? null,             // worn echo body's school (drives the ECHO button)
      echoReady: !!p.echoReady, echoArmed: !!p.echoArmed,
      bodySummons: [].concat(BODIES[p.bodyKey]?.passive ?? [])  // a worn summoner body shows the toggle too
        .some((ps) => (ps.ops ?? []).some((o) => o.do === "summon")),
      treasure: p.treasure ?? 0,                         // this player's wallet (mirrored income)
      unlockGold: p.unlockGold ?? 1,                      // your wear threshold (bodies ≤ this are free)
      unlockPaid: unlockCost(p.unlockGold ?? 1),          // credit already sunk into the ladder
      kitSlots: p.kitSlots ?? KIT_SLOTS_BASE,            // current kit capacity (buyable)
      kitSlotCost: kitSlotCost(p.kitSlots ?? KIT_SLOTS_BASE), // Treasure for the next slot (null = maxed)
      kit: (p.draftPicks ?? []).map((k) => ({ key: k, name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "", value: itemTreasure(k) })),
      inv: p.inv.map((inv) => ({
        key: inv.key, name: KIT[inv.key].name, text: KIT[inv.key].text, type: KIT[inv.key].type ?? null,
        ranged: isRanged(inv.key),             // 🎯 badge: the reticle drives this item
        color: KIT[inv.key].color ?? null, passive: isPassiveItem(inv.key), dr: KIT[inv.key]?.passive?.dr ?? 0,
        fragile: !!KIT[inv.key].fragile, spent: !!inv.spent,
        summons: (KIT[inv.key].ops ?? []).some((o) => o.do === "summon"), // shows the front/behind toggle

        stolen: !!inv.stolen,                  // Kraken lock — the slot renders STOLEN until its entity dies
        charge: inv.charge, cd: itemCd(inv, BODIES[p.bodyKey]), ready: !inv.spent && !inv.stolen && inv.charge >= itemCd(inv, BODIES[p.bodyKey]),
      })),
    })),
  };
}
