// King Mimic engine — the combat engine (extracted from game.js barrel).
// Biggest module: resolver, targeting, passives/triggers, buffs/regens, foe hits, damage, simulateTick.
// No eval-time cross-module reads — all externals are imported from the barrel and used at call time.
import {
  ADOPT_COST,
  ANTE_CAP_BASE,
  ANTE_MIN,
  ANTE_STEP,
  BODIES,
  BOSS_BODIES,
  BOSS_DEFS,
  CLASSES,
  COMMON_SET,
  DJINN_ITEM_POOL,
  DRAFT_BODIES,
  DRAFT_PICKS,
  DRAFT_WHEEL_MIN,
  ELITE_BODY,
  ELITE_BODY_VALUE,
  ELITE_SET,
  FOE_ARCHETYPE,
  FOE_LEVEL_CAP,
  FOE_LEVEL_MIN,
  FOE_MAX_GEAR,
  FOE_MIN_CARDS,
  FOE_START_MAX,
  FOE_START_MIN,
  GIMMICKS,
  GOD_CD,
  HAND_SIZE,
  KIT,
  KIT_POOL,
  LANES,
  LANE_FLOOR,
  LEVEL_ANTE_PER,
  LEVEL_COMBAT_PER_ODD,
  LEVEL_FLOOR_BASE,
  LEVEL_HP_PER_EVEN,
  LEVEL_UP_COST_PER,
  MAX_KIT,
  MIN_DECK,
  MOXIE_CAP,
  MOXIE_REGEN_TICKS,
  MOXIE_SET,
  PALETTE_OPTION_CAP,
  PALETTE_SLOTS,
  PLAYER_POOL,
  POISON_PERIOD,
  RARE_ANTE,
  RARE_POOL,
  ROOM_ANTE_BUDGET_PER,
  ROOM_FILL_STOP_CHANCE,
  ROOM_SIZE,
  SET_COMMONS,
  SHOP_WARES,
  STALL_LIMIT,
  STARTER_BODY,
  STARTER_DECK,
  START_MOXIE,
  STOCK_MAX,
  THRONE_FLOOR,
  acceptTrade,
  addFoe,
  addGreedy,
  addPlayer,
  adoptCost,
  advanceLevel,
  anteCurrent,
  anteOfFoe,
  applyBodyLevel,
  autoDraftBots,
  autoStockBots,
  beginCombat,
  bodyAnteOf,
  bodyMaxHp,
  bodyValue,
  bossAlive,
  bossBudget,
  bossForFloor,
  bossOnDamaged,
  buildFoePool,
  buildLevel,
  buildQueue,
  buildRoom,
  buyWare,
  canSwapTo,
  cardCost,
  playCost,
  cardDealInfo,
  cardDescriptor,
  cardDmgLabel,
  cardKind,
  cardLiveDmg,
  cardScaleGlyph,
  cdScale,
  chooseClass,
  claimLoot,
  clog,
  commitStock,
  countKey,
  currentNode,
  dealHand,
  recycleDeck,
  deckKeys,
  declineTrade,
  defaultCardCost,
  deriveLaneCount,
  descend,
  draftComplete,
  draftPick,
  drawBossRotation,
  drawKingDeck,
  drawUp,
  dropItem,
  ensureCheapSlot,
  enterRoom,
  entityEffects,
  fireBossClock,
  fitsAnteWindow,
  foeArchetype,
  foeCombatStat,
  foeLevel,
  foeLootValue,
  foeMaxHpFor,
  foeOpSnipes,
  foeTelegraph,
  formUp,
  freshKit,
  generateEliteFoes,
  generateRoomFoes,
  getCdMult,
  getHpMult,
  giftItem,
  giveOwnItem,
  growDraftWheel,
  humanSeats,
  isCard,
  isPassiveItem,
  isRanged,
  itemCd,
  itemFitsArchetype,
  itemFlavor,
  itemThreatens,
  itemTreasure,
  itemsAnteOf,
  kindBonusOf,
  kindForOp,
  kitFromPicks,
  krakenSteal,
  leaveShop,
  levelAnte,
  levelCombatBonus,
  levelHpBonus,
  levelUp,
  levelUpCost,
  lockRoom,
  logNm,
  maybeFinishDraft,
  meleeBonusOf,
  minFoeAnte,
  mintCard,
  mintCards,
  moveToBackpack,
  moveToDeck,
  newRoom,
  nextKingCard,
  nextPaletteOption,
  nodeById,
  ownerLaneOf,
  picksRequiredFor,
  placedLanes,
  playerPicks,
  proposeTrade,
  publicBodies,
  rangedBonusOf,
  regenMoxie,
  removeFoe,
  removeGreedy,
  reopenDraftForJoin,
  rerollShop,
  resetRoomVotes,
  rollBossLoot,
  grantBidPoints,
  eliteBodyAnte,
  rollCompItems,
  rollCheapOption,
  rollDecreeFoe,
  rollDraftWheel,
  rollEliteFoe,
  rollFoeGear,
  rollFoeKit,
  rollKit,
  rollLeveledFoe,
  rollShopWares,
  roomAnteBudget,
  roomValue,
  runLevelOf,
  setCdMult,
  setHpMult,
  shopPrice,
  shuffle,
  snapshot,
  spawnBoss,
  spawnEnemy,
  spawnFoeInLane,
  spawnItemEntity,
  startDraft,
  startLevel,
  stockAnteRequired,
  stockLevelRooms,
  stockReady,
  swapBody,
  swapOwnItems,
  syncLobbyLanes,
  tankiness,
  tenderValue,
  tentacleCount,
  tickBossClocks,
  tradeItems,
  triggerKind,
  unlockRoom,
  upTheAnte,
  voteRoom,
  wearBody,
  rnd,
} from "../game.js";

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
export const effPhys = (c) => (c.phys ?? c.atk ?? 0) + (c.counters ?? 0) + itemStatBonus(c, "phys") + buffAmt(c, "power") + buffAmt(c, "swordPower");
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
  // moxie world (owner 2026-06-21): for a card-CASTER, "shave time off the clock" becomes "add
  // progress toward the next cast" — the accel bumps the moxie-spent accumulator (flushed by the
  // next spendTriggerPassives). Summons/tokens keep the literal time-clock bump.
  if (isCaster(c)) {
    const bump = Math.max(1, Math.round((ac.amount ?? 10) / 10));
    c.pspend = c.pspend || {};
    pas.forEach((p, pi) => { if (p.every) c.pspend[pi] = (c.pspend[pi] ?? 0) + bump; });
  } else {
    c.pcharge = c.pcharge || {};
    pas.forEach((p, pi) => { if (p.every) c.pcharge[pi] = (c.pcharge[pi] ?? 0) + (ac.amount ?? 10) * (c.cdMul ?? 1); });
  }
}

// THORNS (V2 §4.6, Spikes): a struck defender spikes its attacker back for a flat N.
// Fires on DIRECT hits only (single-target strikes through the blocking line), never on
// lane AoE, and the reflection itself carries NO attacker — so chains can't recurse.
// Route `n` reflected damage back at the attacker — the shared tail of Thorns AND Mirror Shield.
// The reflection carries NO attacker of its own, so a mirrored/thorned counter can never chain.
function reflectHit(room, attacker, n) {
  if (!(n > 0) || !attacker) return;
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
// `landed` = the gross damage that just landed on the victim (into shield+HP, past DR/auras) — the
// callers that know their attacker pass it so MIRROR SHIELD can reflect the exact hit.
function reflectThorns(room, victim, attacker, landed = 0) {
  if (!attacker || attacker === victim) return;
  reflectHit(room, attacker, victim?.thorns ?? 0);
  // MIRROR SHIELD (owner 2026-07-07 batch D): a ONE-SHOT charge — the next foe attack that LANDS on
  // the wearer strikes the attacker back for the same damage, then the mirror is consumed. Rides the
  // thorns call sites, so it fires on DIRECT hits only (lane AoE has no single striker contact —
  // FLAG: same ruling as thorns; say if AoE should trip the mirror too). "Hits you" follows the
  // codebase convention that shield-absorbed damage still counts as a landed hit (owner 2026-06-24).
  if ((victim?.mirrorShield ?? 0) > 0 && landed > 0) {
    victim.mirrorShield--;
    clog(room, "  🪞 " + logNm(victim) + " MIRRORS " + landed + " back at " + logNm(attacker));
    reflectHit(room, attacker, landed);
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
    else { if (al.ratStack) syncRatStack(al); runPassive(room, al, "damaged"); accelClocks(al, "damaged"); }
  }
  reflectThorns(room, al, attacker, landed);
  return landed;
}

// BREACH (owner spec 2026-06-27, replaces the caravan damage-sink): the NEAREST lane to `from`
// that has ANY defender — a player body OR a summon token — in its unified line. A foe whose own
// lane is empty FOLLOWS THE BODIES instead of whiffing into a (now-deleted) caravan. Returns the
// lane index, or -1 when the WHOLE board is undefended (no bodies, no summons anywhere → the party
// has already lost). Equidistant lanes tie to the LOWER index (flag: left-bias on a tie).
export function nearestDefendedLane(room, from = 0) {
  const n = room.laneCount ?? room.lanes.length;
  for (let d = 0; d < n; d++) {
    for (const li of (d === 0 ? [from] : [from - d, from + d])) {
      if (li < 0 || li >= n) continue;
      if (laneLine(room, li).length) return li;
    }
  }
  return -1;
}

// A combatant's effective HP for the ranged-snipe pick = HP + shield.
const effHpOf = (c) => (c?.hp ?? 0) + (c?.shield ?? 0);
// RANGED foe targeting (owner spec 2026-06-27): the single LOWEST effective-HP (hp+shield) PLAYER
// across ALL lanes — a cross-lane snipe that NEVER targets a summon (summons only BLOCK melee).
// Ties among equal-lowest resolve to the NEAREST player (smaller lane-distance to `fromLane`, then
// lower lane index). Returns null when no player is alive anywhere (a lone summon survives the run).
export function lowestEHpPlayer(room, fromLane = 0) {
  let best = null;
  for (const p of room.players.values()) {
    if (!p.alive) continue;
    if (best === null) { best = p; continue; }
    const a = effHpOf(p), b = effHpOf(best);
    if (a < b) { best = p; continue; }
    if (a === b) {
      const da = Math.abs((p.lane ?? 0) - (fromLane ?? 0));
      const db = Math.abs((best.lane ?? 0) - (fromLane ?? 0));
      if (da < db || (da === db && (p.lane ?? 0) < (best.lane ?? 0))) best = p;
    }
  }
  return best;
}

// A foe's RANGED deal: snipe the weakest player anywhere (lowestEHpPlayer), never a summon. Returns
// the damage that LANDED (Darkness lifesteals off this). No player alive → whiffs (returns 0).
export function foeHitRanged(room, dmg, attacker = null) {
  if (dmg <= 0) return 0;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");
  const t = lowestEHpPlayer(room, attacker?.lane ?? 0);
  if (!t) return 0;
  const landed = damagePlayer(room, t, dmg);
  reflectThorns(room, t, attacker, landed);
  return landed;
}

// A foe's single-target MELEE hit on the hero side of a lane. The FRONT of the lane's UNIFIED
// line (heroes and summons interleaved by depth) blocks. An empty lane BREACHES to the nearest
// defended lane (`redirect`, the default) and hits the front there — never the old caravan; a
// per-lane chip (dealEachLane) passes `redirect=false` so it just hits its own lane's front or
// nobody. Returns the damage that LANDED (past auras/armor, into shield+HP — Darkness lifesteals).
export function foeHitLane(room, li, dmg, attacker = null, redirect = true) {
  if (dmg <= 0) return 0;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");   // foe-side Flag/Knight
  let front = laneLine(room, li)[0];
  if (!front) {
    if (!redirect) return 0;                                   // per-lane chip into an empty lane: hits nobody (no caravan)
    const rl = nearestDefendedLane(room, li);                  // BREACH: follow the bodies, never whiff
    if (rl < 0) return 0;                                      // whole board undefended → the party already lost
    li = rl; front = laneLine(room, li)[0];
  }
  if (room.players?.has?.(front.id)) {
    const landed = damagePlayer(room, front, dmg);
    reflectThorns(room, front, attacker, landed);
    return landed;
  }
  return hurtAllyToken(room, li, front, dmg, attacker);
}

// Spear, foe side (V2 §4.9): the front TWO of the unified line each take the full hit; an empty
// lane BREACHES to the nearest defended lane (follow the bodies; no caravan).
export function foeHitFront2(room, li, dmg, attacker = null) {
  if (dmg <= 0) return;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");
  let line = laneLine(room, li);
  if (!line.length) {
    const rl = nearestDefendedLane(room, li);
    if (rl < 0) return;
    li = rl; line = laneLine(room, li);
  }
  for (const v of line.slice(0, 2)) {
    if (room.players?.has?.(v.id)) { const landed = damagePlayer(room, v, dmg); reflectThorns(room, v, attacker, landed); }
    else hurtAllyToken(room, li, v, dmg, attacker);
  }
}

// A foe's lane-AoE (Lightning): hits EVERY hero and EVERY friendly summon in the lane — the mirror
// of a player's `target:"lane"` deal hitting every foe in a lane. Nobody blocks for anybody (that's
// the point of AoE) and thorns don't fire (no single "striker" contact). An empty lane simply hits
// NOBODY now (no caravan; an area with no occupants does no damage — this also keeps an Atlas shrug
// literal to "his whole lane"). Auras still apply per victim.
export function foeHitLaneAll(room, li, dmg, attacker = null) {
  if (dmg <= 0) return;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");
  const allies = [...(room.allies[li] ?? [])];
  const heroes = laneHeroes(room, li);
  for (const al of allies) {
    al.lane = li; al.side = "hero";
    const cut = dmg - laneAura(room, al, "dmgReduce");
    if (cut <= 0) continue;
    const left = absorbShield(al, cut);
    if (left <= 0) continue;
    al.hp -= left;
    if (al.hp <= 0) { const i = room.allies[li].indexOf(al); if (i >= 0) room.allies[li].splice(i, 1); }
    else { if (al.ratStack) syncRatStack(al); runPassive(room, al, "damaged"); accelClocks(al, "damaged"); }
  }
  for (const p of heroes) damagePlayer(room, p, dmg);
}

// ATLAS, SHRUGGING (owner spec 2026-06-27; hit reworked 2026-07-08) — the elite's 1:1 SYMMETRIC reflect.
// A damage-TAKEN accumulator (`atlasClock`): every ATLAS_REFLECT_PER CUMULATIVE damage Atlas TAKES, he
// SHRUGS, dealing ATLAS_REFLECT_BASE + his OWN melee bonus + ranged bonus to ALL OPPOSING combatants in his
// lane. Reading Atlas's own bonuses keeps the passive 1:1 symmetric: a foe-Atlas scales off its baked-in
// level combat, a worn-Atlas off whatever melee/ranged bonus YOU'VE stacked this fight. foe-Atlas → every
// hero + ally summon in his lane (empty lane → the caravan); player-Atlas → every foe (+ the back-line boss)
// in his lane. Fed the GROSS landed damage from damagePlayer/damageEnemy (shielded damage counts, like the
// other on-damaged clocks). A room-level re-entrancy guard stops a shrug's own AoE from cascading another.
export const ATLAS_REFLECT_PER  = 10;  // every N CUMULATIVE damage Atlas TAKES… (tunable)
export const ATLAS_REFLECT_BASE = 5;   // …he deals BASE + his melee bonus + ranged bonus to ALL OPPOSING combatants in his lane (owner 2026-07-08; base tunable)
export function atlasReflect(room, c, landed) {
  if (!room || !BODIES[c?.bodyKey]?.atlasReflect || !(landed > 0)) return;
  if (room._inShrug) return;                              // a shrug's AoE never re-triggers a shrug (anti-cascade)
  c.atlasClock = (c.atlasClock ?? 0) + landed;
  if (c.atlasClock < ATLAS_REFLECT_PER) return;
  room._inShrug = true;
  try {
    const hit = ATLAS_REFLECT_BASE + meleeBonusOf(c) + rangedBonusOf(c);  // his own bonuses — constant across this shrug (dealing damage never changes c's bonus)
    while (c.atlasClock >= ATLAS_REFLECT_PER) {
      c.atlasClock -= ATLAS_REFLECT_PER;
      const li = c.lane | 0;
      clog(room, "  ⚛ " + logNm(c) + " SHRUGS — " + hit + " to his whole lane");
      if (c.side === "foe") {
        foeHitLaneAll(room, li, hit, c);                  // → every hero + ally summon (empty → caravan)
      } else {
        for (const e of [...(room.lanes?.[li] ?? [])]) damageEnemy(room, li, e, hit, c);
        if (bossAlive(room)) damageEnemy(room, li, room.boss, hit, c);  // the back-line boss too
      }
    }
  } finally { room._inShrug = false; }
}

// Ops that actually damage the hero side of a foe's lane (vs. heal/summon/ramp/move).
export const FOE_DMG_OPS = new Set(["deal", "dealEachLane", "attack", "schoolStrike"]);
export const opsHarm = (ops) => (ops ?? []).some((o) => FOE_DMG_OPS.has(o.do));
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
export function foeDealHit(room, source, op, school, kind = null) {
  // Gang Up, foe side: +N per OTHER foe in its lane
  const pals = op.perAlly ? op.perAlly * Math.max(0, (room.lanes[source.lane]?.length ?? 1) - 1) : 0;
  const pwr = school ? powerFor(source, school) * (op.mult ?? 1) : 0;
  const ctr = school === "physical" ? 0
    : op.bothKinds ? meleeBonusOf(source) + rangedBonusOf(source)   // Moonlight/Rainblow (owner 2026-07-06): counts as melee AND ranged — takes BOTH bonuses
    : kindBonusOf(source, kindForOp(op, kind)); // melee→🗡 / ranged→🎯 bonus (generic counters lifts both)
  const shd = op.ofShield ? (source.shield ?? 0) : 0;             // Shield Bash: deal = current shield
  let hit = Math.round(((op.amount ?? 0) + pals + pwr + ctr + shd) * (source.dmgMul ?? 1));
  if (hasBuff(source, "weakness")) hit = Math.ceil(hit / 2);   // Weakness (owner 2026-06-27): the weakened attacker deals half, round up
  if (school && hit < 1) hit = 1; // a weapon always lands ≥1, even on the wrong body
  hit = Math.max(0, hit - buffAmt(source, "sap"));   // Gravity Greatshield (owner 2026-07-06): sapped attackers deal flat −N
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
  // CARD-CAST telegraph (owner 2026-06-24): foes attack by spending moxie on their FRONT queue card,
  // not on item cooldowns — so the next attack is that front card. Show it as a bar: the fill = moxie
  // progress toward affording it, the number = the hit it'll land, and the countdown = seconds of
  // moxie regen left (1/sec). Players have a HAND, not a queue, so this only fires for foes. (The
  // worn `equipment` list no longer cooldown-fires — it's kept only for passive-stat reads, so it
  // gets no bar; its DR still shows as the 🛡 badge.)
  const fq = (e.queue ?? [])[0];
  if (fq && KIT[fq.key]?.ops) {
    const item = KIT[fq.key];
    const cost = Math.max(1, cardCost(fq.key, body));
    const harm = opsHarm(item.ops);
    out.push({ kind: "cast", harm, key: fq.key, label: item.name ?? fq.key,
      dmg: harm ? foeOpsDmg(room, e, item.ops, item.type) : 0,
      color: item.color ?? "#ccd", frac: Math.min(1, (e.moxie ?? 0) / cost), cd: cost * 10 });
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
    // school-free trigger clocks (owner 2026-06-23) — event-driven, no time bar, so they ship as tags
    else if (p.hit != null) out.push(`⚡ per ${p.hit} hp lost`);
    else if (p.spend != null) out.push(`⚡ per ${p.spend} moxie`);
    else if (p.play != null) out.push(`⚡ per ${p.play} cards`);
    else if (p.dealtMelee != null) out.push(`⚡ per ${p.dealtMelee} melee dealt`);
    else if (p.dealtRanged != null) out.push(`⚡ per ${p.dealtRanged} ranged dealt`);
    else if (p.pairMR) out.push("⚡ melee + ranged");
  }
  const cs = BODIES[bodyKey]?.combatStart; // open-of-fight grants (Malevolent Mouse / Golden Golem / Centaur)
  if (cs?.counters) out.push(`✦ +${cs.counters} dmg at start`);
  if (cs?.shield) out.push(`🛡 +${cs.shield} at start`);
  if (cs?.doubleNext) out.push("🔁 first card doubled");
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

// CHOKEPOINT (owner 2026-07-09: "all lane casts always reach backline bosses"): every FOE a PLAYER's
// lane-target cast reaches — the whole lane PLUS the back-line boss, which sits BEHIND all lanes (in
// none) yet always eats a hero's lane cast, damage AND debuff. This supersedes the per-site boss
// exclusions. It only ever ADDS an enemy (the boss is a foe), so a FOE's lane cast — which hits
// heroes+summons and has no friendly backline — never routes through here. Fresh array: damageEnemy
// splices the lane on a kill, so callers must iterate a snapshot.
export const playerLaneFoes = (room, li) => [
  ...(room.lanes[li] ?? []),
  ...(bossAlive(room) ? [room.boss] : []),
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
  const isRat = RAT_KEYS.has(op.body);   // RATS ONLY merge (rat/largeRat) — knights/totems never do
  for (let k = 0; k < (op.count ?? 1); k++) {
    const li = op.lane != null ? Math.max(0, Math.min(room.laneCount - 1, op.lane | 0)) : baseLane;
    const into = source.side === "hero" ? room.allies[li] : room.lanes[li];
    // RAT-MERGE (owner spec 2026-06-27): a rat summoned into a lane that ALREADY holds a rat-stack of
    // the SAME body on this side folds into it — +1 rat (HP and bite), renamed "N rats", killed as
    // ONE HP pool. `rat` and `largeRat` keep separate stacks (see syncRatStack).
    if (isRat) {
      const stack = into.find((t) => t.ratStack && t.bodyKey === op.body && t.side === source.side && t.hp > 0);
      if (stack) { stack.hp += (RAT_UNIT[op.body]?.hp ?? 1); syncRatStack(stack); continue; }
      const seed = spawnEnemy(op.body);
      seed.side = source.side; seed.lane = li; seed.ratStack = true; syncRatStack(seed);
      if (source.side === "hero") {
        const d = source.depth ?? (laneLine(room, li)[0]?.depth ?? 0);
        seed.depth = d + (source.summonSide === "back" ? 0.5 : -0.5);
      }
      into.push(seed);
      continue;
    }
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
  clog(room, "  ✦ " + logNm(source) + " summons " + (op.count ?? 1) + "× " + (BODIES[op.body]?.name ?? op.body));
}

// RAT-STACK MODEL (owner spec 2026-06-27): a rat-stack is ONE entity holding N rats, killed as a
// single HP pool — HP = N×unitHP, bite = N×unitBite, named "N rats". `rat` and `largeRat` keep their
// OWN identity and form SEPARATE stacks (a rat never folds into a large-rat stack — different
// creature, different per-unit stats). Bite scales via `counters`: a `rat` casts tBite (deal 1 +
// counters); a `largeRat` swings its attack (effAtk = phys + counters). For the default `rat`
// (unitHP 1, unitBite 1) this is exactly the owner's law: HP = count = bite. Rats are HP-knob-exempt.
// FLAG: per-unit stats are these named tunables; cross-body merging is intentionally OFF.
export const RAT_KEYS = new Set(["rat", "largeRat"]);
const RAT_UNIT = { rat: { hp: 1, bite: 1 }, largeRat: { hp: 3, bite: 2 } };
// Re-derive a stack's count/HP-cap/bite/name from its live HP. Whole units only (ceil), so a stack
// downgrades a rat at a time as it bleeds (3 rats 3hp → take 1 → "2 rats" bite 2; dies at 0).
export function syncRatStack(s) {
  if (!s?.ratStack) return;
  const u = RAT_UNIT[s.bodyKey] ?? RAT_UNIT.rat;
  if (s.hp < 0) s.hp = 0;
  const n = Math.max(0, Math.ceil(s.hp / u.hp));
  s.ratCount = n;
  s.maxHp = Math.max(u.hp, n * u.hp);                 // ≥ one unit for HP-bar math; n=0 → splice removes it
  s.counters = Math.max(0, (n - 1) * u.bite);         // the other (n−1) units' bite, carried on the attack
  s.name = n > 1 ? n + " " + (s.bodyKey === "largeRat" ? "large rats" : "rats") : (BODIES[s.bodyKey]?.name ?? "Rat");
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

// A card-CASTER drives its `every:N` body passives off MOXIE SPENT (see spendTriggerPassives), not
// time — so those clocks pause here. A SUMMON/token (no hand, no queue) has no moxie, so it keeps
// the original time clock below (a summoned rat still attacks every 4s).
const isCaster = (c) => Array.isArray(c?.hand) || (c?.queue?.length > 0);

// TIME clocks for non-casters only: each `every:N` passive runs on its own tick clock (`pcharge`).
export function tickOwnTimers(room, c) {
  if (isCaster(c)) return;                 // casters use moxie-spent triggers instead (owner 2026-06-21)
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas) return;
  c.pcharge = c.pcharge || {};
  for (let pi = 0; pi < pas.length; pi++) {
    if (!pas[pi].every) continue;
    c.pcharge[pi] = (c.pcharge[pi] ?? 0) + 1;
    if (c.pcharge[pi] >= pas[pi].every * (c.cdMul ?? 1)) { c.pcharge[pi] = 0; resolveOps(room, c, pas[pi].ops); }
  }
}

// CARD/BODY TIMED EFFECTS (owner 2026-06-27): room-aware "every N ticks → ops" that ALSO works for casters
// (tickOwnTimers skips them). Runs `c.timers` (card-granted: Animated Blade, Pet Leech) for any combatant,
// plus body `every:N` passives for CASTERS (non-casters get those via tickOwnTimers — no double-fire).
export function tickTimers(room, c, lane) {
  if (lane != null) c.lane = lane;
  if (c.timers?.length) {
    for (const tm of c.timers) {
      if (++tm.charge >= tm.period * (c.cdMul ?? 1)) {
        tm.charge = 0;
        c._bothKindsPlay = false;                        // Rainblow (owner 2026-07-09): a bothKinds LANE strike sets this during resolve
        const dealt = resolveOps(room, c, tm.ops) || 0;  // the delayed strike lands here, OUTSIDE the playCard/foeCast path
        // owner 2026-07-09: Rainblow's delayed lane strike fires BOTH melee AND ranged play-triggers at STRIKE
        // resolution — feeds Rent-Seeking Runeblade's onPlayMelee AND Mid-Management Medusa's onPlayRanged.
        // Timers normally fire NO play-trigger; this is the one intended exception (symmetric player + foe).
        if (c._bothKindsPlay) { c._bothKindsPlay = false; cardEventPassives(room, c, dealt, "both", true); }
        if (tm.once) tm.done = true;
      }
    }
    c.timers = c.timers.filter((t) => !t.done);   // one-shot timers (Rainblow/Cross-Blade, owner 2026-07-06) expire after firing
  }
  if (!isCaster(c)) return;
  const pas = BODIES[c.bodyKey]?.passive; if (!pas) return;
  c.pcharge = c.pcharge || {};
  for (let pi = 0; pi < pas.length; pi++) {
    if (!pas[pi].every) continue;
    c.pcharge[pi] = (c.pcharge[pi] ?? 0) + 1;
    if (c.pcharge[pi] >= pas[pi].every * (c.cdMul ?? 1)) { c.pcharge[pi] = 0; resolveOps(room, c, pas[pi].ops); }
  }
}

// Advance clock-passive `pi` by `amt`; each time it crosses `need`, fire its ops (with the passive's
// own school, so a "deal staff" passive scales with staff Power). Shared by moxie-spend AND damage.
function advancePassive(room, c, pi, p, amt, need) {
  c.pspend = c.pspend || {};
  c.pspend[pi] = (c.pspend[pi] ?? 0) + amt;
  while (c.pspend[pi] >= need) { c.pspend[pi] -= need; resolveOps(room, c, p.ops, p.school || null); }
}
// MOXIE-SPENT body passives (owner 2026-06-21):
//   {spend:N, school?}  — fires per N moxie spent (optionally only on that school's cards)
//   {spendOrHit:N}      — same clock is ALSO fed by damage taken (hitTriggerPassives) = the tank ramp
//   {every:N}           — legacy tick→moxie clock (need = round(N/10))
// `school` is the cast card's type (physical/magical) so a {spend, school} clock only counts its school.
export function spendTriggerPassives(room, c, spent, school = null) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas || !(spent > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) {
    const p = pas[pi];
    if (p.spend != null)           { if (p.school && p.school !== school) continue; advancePassive(room, c, pi, p, spent, p.spend); }
    else if (p.spendOrHit != null) advancePassive(room, c, pi, p, spent, p.spendOrHit);
    else if (p.every)              advancePassive(room, c, pi, p, spent, Math.max(1, Math.round(p.every / 10)));
  }
}
// DAMAGE-TAKEN body clocks: {spendOrHit:N} (the legacy bruiser ramp, fed by spend OR hit) AND
// {hit:N} (owner 2026-06-23 school-free set — fed ONLY by damage taken: Fat Cat summon, Market-Crash
// Minotaur counter-strike, Bond Behemoth +1). Symmetric — players (damagePlayer) and foes (damageEnemy).
export function hitTriggerPassives(room, c, dmg) {
  // JESTERPLATE (owner 2026-07-06): a cast fight-buff — +N moxie every time you take damage
  // (per hit EVENT, not per point). Fires before the body-passive gate: it's card state, not a passive.
  if (dmg > 0 && (c.moxieOnHitBuff ?? 0) > 0) c.moxie = Math.min(MOXIE_CAP, (c.moxie ?? 0) + c.moxieOnHitBuff);
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas || !(dmg > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) {
    if (pas[pi].spendOrHit != null) advancePassive(room, c, pi, pas[pi], dmg, pas[pi].spendOrHit);
    else if (pas[pi].hit != null)   advancePassive(room, c, pi, pas[pi], dmg, pas[pi].hit);
  }
}

// PER-CARD-PLAYED body clocks (owner 2026-06-23 school-free set): {play:N} fires every N cards cast
// (Paid Piper summon, Crypto-Chimera lane chip, Weary Wageslave melee); {pairMR} fires once a melee
// AND a ranged card have both been played, then re-arms. Called once per card by playCard/foeCast with
// the card's triggerKind — "melee" / "ranged" / "none" (owner 2026-07-06: ranged = foe-affecting
// only; self/ally cards feed NEITHER half). Symmetric (players + foes). NOTE: no body wears pairMR
// after the 2026-06-28 Runeblade rework — the machinery stays for reuse (owner: flagged as unused).
export function playTriggerPassives(room, c, kind) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas) return;
  for (let pi = 0; pi < pas.length; pi++) {
    const p = pas[pi];
    if (p.play != null) advancePassive(room, c, pi, p, 1, p.play);
    else if (p.pairMR) {
      c.pair = c.pair || {};
      if (kind === "ranged" || kind === "both") c.pair.ranged = true; // "both" (Moonlight lane strike, owner 2026-07-09) sets BOTH halves at once
      if (kind === "melee"  || kind === "both") c.pair.melee  = true;
      if (c.pair.melee && c.pair.ranged) { c.pair.melee = c.pair.ranged = false; resolveOps(room, c, p.ops, p.school || null); }
    }
  }
}

// PER-DAMAGE-DEALT body clocks (owner 2026-06-23 school-free set): {dealtMelee:N}/{dealtRanged:N}
// accumulate the damage a wearer's melee/ranged cards LAND and fire every N (Vengeful Vampire heal,
// Lizard Wizard moxie). Fed by playCard/foeCast with the card's ranged-ness + total landed. Symmetric.
export function dealtTriggerPassives(room, c, dmg, ranged, both = false) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas || !(dmg > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) {
    const p = pas[pi];
    // `both` (Moonlight lane strike, owner 2026-07-09): the damage counts as melee AND ranged → feeds BOTH clocks
    if ((both || ranged)  && p.dealtRanged != null) advancePassive(room, c, pi, p, dmg, p.dealtRanged);
    if ((both || !ranged) && p.dealtMelee  != null) advancePassive(room, c, pi, p, dmg, p.dealtMelee);
  }
}

// PER-MOXIE-GAINED body clocks (owner 2026-06-27): {gain:N} fires every N moxie the wearer GAINS (Bookie
// Bonelord → summon a rat; Debt Dragon → +3 melee & ranged). Fed from the moxie-gain sites with the delta.
export function gainTriggerPassives(room, c, gained) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas || !(gained > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) if (pas[pi].gain != null) advancePassive(room, c, pi, pas[pi], gained, pas[pi].gain);
}

// PER-CARD EVENT triggers (owner 2026-06-27): onDeal (Killionaire — a damaging card landed), onPlayNonDmg
// (Audit Angel — a non-damaging card), onPlayRanged (Mid-Management Medusa — a ranged card), onPlayMelee
// (Rent-Seeking Runeblade — a melee card). Once per card, symmetric (players + foes). dealt = damage this
// card LANDED; isDmg = the card carries a damaging op. `kind` is the card's triggerKind — "melee" /
// "ranged" / "none": ranged = FOE-AFFECTING cards only (owner 2026-07-06 — "a projectile, a spell,
// not armor"); self/ally cards (shields, heals, buffs, ramps, summons) fire NEITHER onPlayRanged
// nor onPlayMelee. onPlayNonDmg keys off isDmg, so they still feed Audit Angel.
export function cardEventPassives(room, c, dealt, kind, isDmg) {
  const pas = BODIES[c.bodyKey]?.passive;
  if (!pas) return;
  for (const p of pas) {
    if (p.onDeal && dealt > 0) resolveOps(room, c, p.ops, p.school || null);
    if (p.onPlayNonDmg && !isDmg)  resolveOps(room, c, p.ops, p.school || null);
    if (p.onPlayRanged && (kind === "ranged" || kind === "both")) resolveOps(room, c, p.ops, p.school || null); // "both" = Moonlight lane strike (owner 2026-07-09): fires melee AND ranged
    if (p.onPlayMelee  && (kind === "melee"  || kind === "both")) resolveOps(room, c, p.ops, p.school || null);
  }
}

// OPEN-OF-FIGHT grants (owner 2026-06-23): a body's combatStart fires once at the start of each combat
// — Malevolent Mouse (+1 damage = a counter), Golden Golem (+2 shield), Centless Centaur (first card
// doubled). Applied AFTER the per-fight reset, so it's fresh each fight (players: beginCombat; foes:
// spawnEnemy, which already mints a fresh instance per room).
export function applyCombatStart(c) {
  // (Cool Shoes' moxie-over-time seeding was removed 2026-06-25 — it's now an ON-PLAY refund; see
  // moxieOnPlayBonus in playCard/foeCast. Nothing worn needs seeding at the open of a fight now.)
  const cs = BODIES[c.bodyKey]?.combatStart;
  if (!cs) return;
  if (cs.counters)  c.counters = (c.counters ?? 0) + cs.counters;
  if (cs.shield)    c.shield = (c.shield ?? 0) + cs.shield + shieldPlus(c);
  if (cs.doubleNext) c.doubleNext = true;
  if (cs.moxie != null) c.moxie = cs.moxie;   // Killionaire (owner 2026-06-27): start each combat with N moxie
  if (cs.cycle) (c.regens ??= []).push({ kind: "cycle", seq: cs.cycle.seq, period: cs.cycle.period ?? 60, charge: 0, idx: 0 }); // Economy Elemental (owner 2026-07-06): alternating moxie
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
export function addBuff(c, kind, amount, dur) { const d = Math.max(1, dur | 0); (c.buffs ??= []).push({ kind, amount: amount ?? 0, left: d, dur: d }); }
export const buffAmt = (c, kind) => (c?.buffs ?? []).reduce((s, b) => s + (b.kind === kind ? b.amount : 0), 0);
export const hasBuff = (c, kind) => (c?.buffs ?? []).some((b) => b.kind === kind);
export function tickBuffs(c) { if (c?.buffs?.length) c.buffs = c.buffs.filter((b) => --b.left > 0); }

// SELF-INFLICTED damage (Berserker Armor's "take 1"; any future self-hit). Owner 2026-07-09: a hit of
// >0 damage a combatant deals to ITSELF counts as "taking damage" for EVERY on-damaged trigger —
// Jesterplate moxie, Blood To Iron, Fat Cat & other on:"damaged" body passives, bruiser {hit}/
// {spendOrHit} ramps, accel clocks, Atlas — exactly like a foe hit, and a shield-absorbed self-hit STILL
// counts (a hit LANDED; keyed on damage>0, not on HP dropping). No external attacker, so NO thorns/mirror
// reflect (there is nothing to hit back). The self-hit MAGNITUDE stays authored/raw — it is NOT softened
// by the wearer's own DR/auras (Berserker is a flat "take 1"; FLAG: say if self-damage should instead
// pass through Stoneskin/Crown/Totem). Fires the triggers only when the combatant SURVIVES, mirroring
// damagePlayer/damageEnemy. Symmetric: players, foes, and ally summon tokens (whoever wears the regen).
export function selfDamage(room, c, amount) {
  if (!c || !(amount > 0)) return 0;                 // a self-hit reduced to 0 does not count (FLAG a: NO — only damage>0)
  const landed = amount;                             // gross, pre-shield — what the on-damaged triggers see
  if (c.bloodToIron) c.bloodToIron.stored += 1;      // Blood To Iron counts the self-hit (owner: self-damage counts)
  const left = absorbShield(c, amount);              // its own shield eats first, exactly like any hit
  if (left > 0) {
    c.hp = (c.hp ?? 0) - left;
    if (c.hp <= 0) {                                 // a self-hit that KILLS: clean up like the normal death paths, fire NO on-damaged trigger
      c.hp = 0;
      if (room?.players?.has?.(c.id)) { c.alive = false; if (room) clog(room, "  ☠ " + logNm(c) + " goes DOWN (self-damage)"); }
      else if (room) {                               // a foe or ally token: splice from its lane
        const arr = c.side === "foe" ? room.lanes?.[c.lane | 0] : room.allies?.[c.lane | 0];
        const i = arr ? arr.indexOf(c) : -1; if (i >= 0) arr.splice(i, 1);
        if (c === room.boss) room.boss = null;
      }
      return landed;
    }
  }
  // survived → fire every on-damaged trigger on the GROSS self-hit (shield-absorbed still counts)
  if (c.ratStack && c.hp > 0) syncRatStack(c);
  runPassive(room, c, "damaged");                    // Fat Cat rats itself, other on:"damaged" body passives
  accelClocks(c, "damaged");                         // bruiser ramp clocks
  hitTriggerPassives(room, c, landed);               // Jesterplate moxie + {hit}/{spendOrHit} clocks
  atlasReflect(room, c, landed);                     // Atlas, Shrugging
  return landed;
}
// RECURRING REGENS (owner cards 2026-06-24): a cast that grants an ongoing per-fight tick — Trollskin
// Tiara (heal N every P) / Liquid Metal Crown (shield N every P). Stored on the combatant, cleared
// per-fight like buffs. `period` is in ticks (10/sec). Symmetric (players + foes). `room` is threaded
// through only for the Berserker self-hit's on-damaged triggers (owner 2026-07-09); it stays optional
// so room-less unit ticks (e.g. G.tickRegens(p) in tests) keep working — a null room just means the
// self-hit can't fire room-scoped body passives, which those tests don't exercise anyway.
export function tickRegens(c, room = null) {
  if (!c?.regens?.length) return;
  for (const g of c.regens) {
    if (++g.charge < g.period * (c.cdMul ?? 1)) continue;
    g.charge = 0;
    if (g.kind === "heal") { c.hp = Math.min(c.maxHp, (c.hp ?? 0) + g.amount); healedTrigger(null, c, g.amount); }
    else if (g.kind === "shield") c.shield = (c.shield ?? 0) + g.amount + shieldPlus(c);
    // ECONOMY ELEMENTAL (owner 2026-07-06): alternating moxie cycle — +4, then −2, every period
    else if (g.kind === "cycle") { const d = (g.seq ?? [0])[(g.idx ?? 0) % (g.seq?.length || 1)]; g.idx = (g.idx ?? 0) + 1; c.moxie = Math.max(0, Math.min(MOXIE_CAP, (c.moxie ?? 0) + d)); }
    // MOXIE-OVER-TIME (Moxie Pool / Cool Shoes, owner 2026-06-25): bank moxie on a clock, capped.
    else if (g.kind === "moxie") c.moxie = Math.min(MOXIE_CAP, (c.moxie ?? 0) + g.amount);
    // RAMP-OVER-TIME (Demon Form / Sage Mode): the 🗡/🎯 type-specific bonus climbs each period.
    else if (g.kind === "meleeBonus") c.meleeBonus = (c.meleeBonus ?? 0) + g.amount;
    else if (g.kind === "rangedBonus") c.rangedBonus = (c.rangedBonus ?? 0) + g.amount;
    // BERSERKER ARMOR (owner 2026-06-25): each period grant +1 melee bonus AND +1 shield, then take
    // `amount` self-damage (its own +shield typically eats it — a self-stoking ramp). Symmetric:
    // tickRegens runs on any combatant. The self-hit routes through selfDamage (owner 2026-07-09) so it
    // fires the on-damaged triggers (Jesterplate/Blood To Iron/Fat Cat/bruiser ramps/Atlas) like any hit
    // — shield-absorbed still counts. Its own +1 shield usually eats it, so it's a trigger with no HP cost.
    else if (g.kind === "berserk") {
      c.meleeBonus = (c.meleeBonus ?? 0) + (g.melee ?? 1);
      c.shield = (c.shield ?? 0) + (g.shield ?? 1) + shieldPlus(c);
      selfDamage(room, c, g.amount ?? 1);
    }
  }
}
// BLOOD TO IRON (owner card 2026-06-24): for `left` ticks, damage the wearer takes is STORED (it still
// lands); when the window closes, that stored total becomes shield. The store hook lives in
// damagePlayer/damageEnemy; this runs the countdown + payout. Per-fight, symmetric.
export function tickBloodToIron(c) {
  const b = c?.bloodToIron;
  if (!b) return;
  if (--b.left > 0) return;
  c.shield = (c.shield ?? 0) + b.stored + (b.stored > 0 ? shieldPlus(c) : 0);
  c.bloodToIron = null;
}
// POISON (owner 2026-06-27): a stacking DoT — `c.poison` damage every POISON_PERIOD ticks, routed through
// the normal damage path so death + lane-removal are handled. Per-fight, symmetric. laneIdx = the entity's lane.
export function tickPoison(room, c, laneIdx) {
  if (!room || !(c?.poison > 0)) return;
  if ((c.poisonClock = (c.poisonClock ?? 0) + 1) < POISON_PERIOD) return;
  c.poisonClock = 0;
  const dmg = c.poison;
  if (room.players?.has?.(c.id)) damagePlayer(room, c, dmg);
  else if (c.side === "hero") hurtAllyToken(room, laneIdx ?? c.lane ?? 0, c, dmg);          // a friendly summon
  else damageEnemy(room, (c === room.boss ? (c.lane | 0) : (laneIdx ?? c.lane ?? 0)), c, dmg); // a foe (or the back-line boss)
}

// Drain every clock a combatant owns (Blizzard's bite) — SYMMETRIC: foe equipment and
// player inv are the same concept, so one drain serves both sides (the old foe-only
// drain was why a foe Blizzard was a no-op vs players — the reason it was exiled from
// the foe pools; fixed 2026-06-12, owner bug report "I've never seen a blizzard").
// STALL (moxie world): a "delay" effect now sets a target's MOXIE back — the meaningful tempo
// resource — instead of the dead per-item charge. The echo bar and boss clocks are still
// time-based, so they're still pushed back too (Blizzard/Time-Stop-adjacent stalls stay honest).
export function drainClocks(c, amt) {
  c.moxie = Math.max(0, (c.moxie ?? 0) - amt);
  c.echoCharge = Math.max(0, (c.echoCharge ?? 0) - amt);
  if (c.clocks) for (const k of c.clocks) k.charge = Math.max(0, k.charge - amt);
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
        if (left > 0) { if ((al.hp -= left) <= 0) { const i = lane.indexOf(al); if (i >= 0) lane.splice(i, 1); } else if (al.ratStack) syncRatStack(al); }
      }
    } else if (t.kind === "ratSpawn") {                        // a rat joins the enemy in a random lane (merges into the lane's stack)
      const li = Math.floor(Math.random() * room.laneCount);
      const colony = { side: "foe", lane: li };
      summonBodies(room, colony, { do: "summon", body: "rat", count: 1, lane: li });
    } else if (t.kind === "scale") {                           // Runaway Scaling (elite gimmick): every foe ramps +N damage
      for (const lane of room.lanes) for (const e of lane) e.counters = (e.counters ?? 0) + (t.amount ?? 1);
      if (bossAlive(room)) room.boss.counters = (room.boss.counters ?? 0) + (t.amount ?? 1);
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

// WANDERING CASTLE (owner 2026-07-06): every shield he gains is +1 bigger — applied at the main
// shield-gain sites (shield op, regen shield, berserk, Blood To Iron payout, combatStart, costly-cast, wards).
const shieldPlus = (c) => BODIES[c?.bodyKey]?.shieldGainBonus ?? 0;
// BRIBED BISHOP (owner 2026-07-06): healing LANDING on a body with onHealedMelee ramps its melee,
// +N per heal EVENT (not per point). Called from every heal site; room may be null (regen tick).
function healedTrigger(room, t, n) {
  const b = (n > 0 ? BODIES[t?.bodyKey]?.onHealedMelee : 0) ?? 0;
  if (b) { t.meleeBonus = (t.meleeBonus ?? 0) + b; if (room) clog(room, "  ✦ " + logNm(t) + " melee +" + b + " (healed)"); }
}
// `boost` (owner 2026-06-21): a body's effectBoost adds N to a qualifying card's effect — applied to
// every amount-bearing op of that card. `op.power` lets a passive's deal/heal scale with a named
// school's Power even when the call has no school (e.g. a tank's "deal my staff to the lane" clock).
export function resolveOps(room, source, ops, school = null, boost = 0, kind = null) {
  let dealt = 0;                          // damage THIS card has dealt so far (shield {ofDealt} reads it)
  for (const op of ops) {
    const amt = (op.amount ?? 0) + (op.amount != null ? boost : 0);
    const li = source.lane, lane = room.lanes[li];

    // Foes are simpler: damage lands on the hero side of their lane; summon adds to it.
    if (source.side === "foe") {
      const dm = (x) => Math.round(x * (source.dmgMul ?? 1));                     // Aggressive room: ×1.2 outgoing
      // school-tagged items scale with the foe's sword/staff Power (symmetry); school-less passives
      // keep their flat amount (+ counters, for ramping bosses). `target:"lane"` AoE hits the whole
      // hero side of the lane (mirrors a player's lane deal hitting every foe in a lane).
      if (op.do === "deal") {
        const hit = foeDealHit(room, source, op, op.power || school, kind); // Gang Up + Power×mult + melee/ranged bonus + the ≥1 floor
        // MOONLIGHT (owner 2026-07-06): both bonuses ≥ N → the strike upgrades to the whole lane (symmetric)
        const laneUp = op.laneWhenDual && meleeBonusOf(source) >= op.laneWhenDual && rangedBonusOf(source) >= op.laneWhenDual;
        const tgt = laneUp ? "lane" : op.target;
        // owner 2026-07-09: ANY bothKinds LANE strike (Moonlight's lane form, Rainblow's delayed timer strike)
        // is a melee AND ranged attack → flag it so the play-trigger site fires BOTH kinds (symmetric w/ heroes)
        if (op.bothKinds && tgt === "lane") source._bothKindsPlay = true;
        let landedNow = 0;
        // "pickLane" (Black Hole, owner 2026-07-07): a foe has no reticle, so its picked lane is its
        // OWN lane — the same fallback every foe "pick" takes — and the strike is the lane-AoE mirror.
        if (tgt === "lane" || tgt === "pickLane") { foeHitLaneAll(room, li, hit, source); landedNow = hit; }
        else if (tgt === "front2") { foeHitFront2(room, li, hit, source); landedNow = hit; }
        else if (foeOpSnipes(op)) {                                             // RANGED (owner 2026-06-27): snipe the weakest PLAYER, cross-lane, never a summon
          landedNow = foeHitRanged(room, hit, source);
          if (op.lifesteal && landedNow > 0) { source.hp = Math.min(source.maxHp, source.hp + landedNow); healedTrigger(room, source, landedNow); } // Darkness
        }
        else {                                                                  // MELEE front (breach-redirect to the nearest defended lane)
          landedNow = foeHitLane(room, li, hit, source);
          if (op.lifesteal && landedNow > 0) { source.hp = Math.min(source.maxHp, source.hp + landedNow); healedTrigger(room, source, landedNow); } // Darkness
        }
        dealt += landedNow;
        if (op.moxieFromDealt && landedNow > 0) source.moxie = Math.min(MOXIE_CAP, (source.moxie ?? 0) + landedNow); // Treasure Blade (symmetric)
      }
      else if (op.do === "schoolStrike") { foeHitLane(room, li, dm(powerFor(source, op.school)), source); fireSchoolTrigger(room, source, op.school); }
      else if (op.do === "dealEachLane") {                                       // boss: chip every lane at once (no breach — an empty lane just hits nobody)
        const each = dm(amt + (source.counters ?? 0));                          // amount 0 → pure counter-scaled (Hydra)
        if (each > 0) for (let l = 0; l < room.laneCount; l++) foeHitLane(room, l, each, source, false);
      }
      else if (op.do === "attack") foeHitLane(room, li, dm(effAtk(source)), source); // strike for its attack
      else if (op.do === "healAttack") source.hp = Math.min(source.maxHp, source.hp + effAtk(source));
      else if (op.do === "summon" || op.do === "summonArmed") summonBodies(room, source, op);
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
      else if (op.do === "buff") addBuff(source, op.buff, op.amount, op.dur);   // a foe buffs itself, same rules
      else if (op.do === "timeStop") room.freezeHeroes = Math.max(room.freezeHeroes ?? 0, op.dur ?? 30);
      else if (op.do === "healSelf" || op.do === "heal") { source.hp = Math.min(source.maxHp, source.hp + amt + (op.power ? powerFor(source, op.power) : 0)); healedTrigger(room, source, amt); clog(room, "  ✦ " + logNm(source) + " heals " + amt); }
      else if (op.do === "armDouble") source.doubleNext = true;                 // next card resolves twice
      else if (op.do === "comboBuff") source.comboPending = { left: op.n ?? 1, amount: op.amount ?? 1 }; // your NEXT N cards +amount
      else if (op.do === "healAlly") { const t = lowestHpFriendly(room, source); if (t) { t.hp = Math.min(t.maxHp, t.hp + amt + powerFor(source, school)); healedTrigger(room, t, amt); } }
      else if (op.do === "shield") { let sg = amt + (op.ofMaxHp ? source.maxHp : 0) + (op.plusRangedBonus ? rangedBonusOf(source) : 0) + (op.ofDealt ? dealt : (op.power ? powerFor(source, op.power) * (op.mult ?? 1) : 0)); if (sg > 0) sg += shieldPlus(source); source.shield = (source.shield ?? 0) + sg; if (sg > 0) clog(room, "  ✦ " + logNm(source) + " +" + sg + " shield"); }  // flat + max HP (Golden Golem) / +ranged bonus (Force, owner 2026-07-06) / dealt / power×mult; Wandering Castle's +1
      else if (op.do === "thorns") source.thorns = (source.thorns ?? 0) + amt;  // per-fight spikes (symmetric)
      else if (op.do === "moxieOnPlay") { source.moxieOnPlayBuff = (source.moxieOnPlayBuff ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " +"+ amt + " moxie per card (this fight)"); } // Cool Shoes (owner 2026-07-06: a cast card, not a worn passive)
      // === OWNER BATCH C ops (2026-07-06), foe side — symmetric with the player cases below ===
      else if (op.do === "sap") { const dmul = BODIES[source.bodyKey]?.debuffMult ?? 1;   // sap: opponents deal −N for the duration
        if (op.target === "selfLane" || op.target === "pickLane") { // Gravity Greatshield (owner 2026-07-09, caster's OWN lane) / Black Hole (pickLane): a reticle-less foe saps its OWN lane's heroes+summons either way
          for (const h of heroesInLane(room, li)) addBuff(h, "sap", amt, (op.dur ?? 60) * dmul);
          for (const al of room.allies?.[li] ?? []) addBuff(al, "sap", amt, (op.dur ?? 60) * dmul);
        } else {
          for (const h of [...room.players.values()].filter((q) => q.alive)) addBuff(h, "sap", amt, (op.dur ?? 60) * dmul);
          for (const arr of room.allies ?? []) for (const al of arr) addBuff(al, "sap", amt, (op.dur ?? 60) * dmul);
        } }
      else if (op.do === "twoHand") source.twoHand = true;                      // Dual-Handing Two-Handers
      else if (op.do === "tkBlades") source.tkBlades = true;                    // Telekinetic Blades
      else if (op.do === "freeNext") source.freeNext = true;                    // Pyramid-Scheme Head
      else if (op.do === "moxieOnHit") source.moxieOnHitBuff = (source.moxieOnHitBuff ?? 0) + amt;  // Jesterplate
      else if (op.do === "giantBelt") { if (!source._giantBase) { source._giantBase = source.maxHp; source.maxHp += source._giantBase; source.hp = Math.min(source.maxHp, (source.hp ?? 0) + source._giantBase); clog(room, "  ✦ " + logNm(source) + " GROWS — max HP doubled"); } }
      else if (op.do === "chequeHeal") { const t = lowestHpFriendly(room, source) ?? source;  // Cheque Cherub (foes have no ally reticle)
        if ((t.hp ?? 0) >= (t.maxHp ?? 1)) t.shield = (t.shield ?? 0) + amt + shieldPlus(t);
        else { t.hp = Math.min(t.maxHp, t.hp + amt); healedTrigger(room, t, amt); } }
      else if (op.do === "shieldFront") { const line = room.lanes[li] ?? []; const t = line[0] ?? source; const g = amt + shieldPlus(t); t.shield = (t.shield ?? 0) + g; } // Earth Elemental's ward
      else if (op.do === "counter") { source.counters = (source.counters ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " +" + amt + " dmg"); } // ramps its attack
      else if (op.do === "gainMoxie") { const _g0 = source.moxie ?? 0; source.moxie = Math.min(MOXIE_CAP, _g0 + amt); gainTriggerPassives(room, source, (source.moxie ?? 0) - _g0); } // Lizard Wizard: bank moxie; feeds {gain:N} clocks
      else if (op.do === "regen") (source.regens ??= []).push({ kind: op.kind ?? "heal", amount: op.amount ?? 1, period: op.period ?? 30, melee: op.melee, shield: op.shield, charge: 0 });
      else if (op.do === "meleeBonus") { source.meleeBonus = (source.meleeBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " melee +" + amt); } // Sharpened Edges: 🗡-only ramp
      else if (op.do === "rangedBonus") { source.rangedBonus = (source.rangedBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " ranged +" + amt); } // Wizard Hat: 🎯-only ramp
      else if (op.do === "bloodToIron") source.bloodToIron = { stored: 0, left: op.dur ?? 50, dur: op.dur ?? 50 };
      else if (op.do === "timer") (source.timers ??= []).push({ ops: op.ops ?? [], period: op.period ?? 60, charge: 0, once: !!op.once }); // owner 2026-06-27: card-granted "every N ticks → ops"; `once` = fire once then expire (Rainblow/Cross-Blade, owner 2026-07-06)
      // === OWNER BATCH D ops (2026-07-07), foe side — symmetric with the player cases below ===
      else if (op.do === "mirror") source.mirrorShield = (source.mirrorShield ?? 0) + 1; // Mirror Shield: arm a one-shot reflect (consumed in reflectThorns)
      else if (op.do === "tutor") {                          // Crystal Ball, foe side: no hand/deck — pull a random queue card up to cast NEXT
        // FLAG: the foe mirror of "pick a card from your deck" — a random non-front queue card is
        // moved to slot 1 (right behind the card mid-cast, which foeCast rotates to the back after
        // this resolve). No queue to reorder → a clean no-op, never a crash.
        const q = source.queue;
        if (q?.length > 2) { const i = 1 + Math.floor(Math.random() * (q.length - 1)); const [c] = q.splice(i, 1); q.splice(1, 0, c); }
      }
      else if (op.do === "summonPick") {                     // Grand Spirit: foes have no interactive pick → the FLAGged default (attacker)
        const body = op.options?.[source._pick] ?? op.options?.[op.fallback ?? "attacker"];
        if (body) summonBodies(room, source, { do: "summon", body, count: op.count ?? 1 });
      }
      continue;
    }

    switch (op.do) {
      case "deal": {
        // TELEKINETIC BLADES (owner 2026-07-06): fight-long — melee strikes AIM at your reticle
        // instead of the front, and take the RANGED bonus (play-triggers stay melee — flagged).
        const tk = source.tkBlades && kind === "melee";
        let bonus = powerFor(source, op.power || school) * (op.mult ?? 1); // Power×mult scales the card
        if ((op.power || school) !== "physical") bonus += op.bothKinds
          ? meleeBonusOf(source) + rangedBonusOf(source)  // Moonlight/Rainblow (owner 2026-07-06): counts as melee AND ranged
          : kindBonusOf(source, tk ? "ranged" : kindForOp(op, kind)); // melee→🗡 bonus, ranged→🎯 bonus; a generic +1 (counters) lifts both, untyped gets none
        if (op.perAlly) {                                 // Gang Up: +N per OTHER ally (heroes + summons) in your lane
          const others = heroesInLane(room, source.lane).length - 1 + (room.allies?.[source.lane]?.length ?? 0);
          bonus += op.perAlly * Math.max(0, others);
        }
        // a weapon always lands AT LEAST 1 (owner 2026-06-10): a zero-base school item on
        // a wrong-school body (Scary Knife on a summoner) must still deal damage
        let dmg = amt + bonus + (op.ofShield ? (source.shield ?? 0) : 0); // Shield Bash: deal = current shield
        if (hasBuff(source, "weakness")) dmg = Math.ceil(dmg / 2);   // Weakness (owner 2026-06-27): half damage, round up
        if (school && dmg < 1) dmg = 1;
        dmg = Math.max(0, dmg - buffAmt(source, "sap"));  // Gravity Greatshield (owner 2026-07-06): sapped attackers deal flat −N
        // MOONLIGHT (owner 2026-07-06): with BOTH bonuses ≥ N the strike upgrades front → whole lane
        let target = op.target;
        if (op.laneWhenDual && meleeBonusOf(source) >= op.laneWhenDual && rangedBonusOf(source) >= op.laneWhenDual) target = "lane";
        // owner 2026-07-09: ANY bothKinds LANE strike (Moonlight's lane FORM, Rainblow's delayed timer strike)
        // is a melee AND ranged attack → fires BOTH play-triggers; Moonlight's FRONT form stays melee-only (target !== "lane")
        if (op.bothKinds && target === "lane") source._bothKindsPlay = true;
        if (tk && (target === "front" || target === "front2")) target = "pick";
        let localDealt = 0;
        if (target === "lane") {                          // V2: every foe in YOUR lane + the back-line boss (owner 2026-07-09)
          for (const e of playerLaneFoes(room, source.lane)) localDealt += damageEnemy(room, source.lane, e, dmg, source);
        }
        else if (target === "front2") {                   // Spear: the front TWO foes in your lane (NOT a lane cast — no boss reach)
          for (const e of [...room.lanes[source.lane].slice(0, 2)]) localDealt += damageEnemy(room, source.lane, e, dmg, source);
        }
        else if (target === "pickLane") {                 // BLACK HOLE (owner 2026-07-07): every foe in your AIMED foe's lane + the back-line boss (owner 2026-07-09)
          const t = aimedFoe(room, source, "pick");       // the reticle picks the LANE (falls back to your lane's front)
          if (t) for (const e of playerLaneFoes(room, t.lane)) localDealt += damageEnemy(room, t.lane, e, dmg, source);
        }
        else {
          const t = aimedFoe(room, source, target);       // 'front' or 'pick'
          if (t) {
            if (op.overflow) {                            // CONTINENT-CLUB (owner 2026-07-06): excess damage rolls down the lane
              // FLAG (owner 2026-07-09): Continent-Club is a target:"front" MELEE strike whose excess
              // "rolls down the lane" — I read the back-line boss as the lane's back WALL, so overflow
              // that clears the whole lane finally spills onto it (and a lone boss now eats the full
              // hit instead of 0). Per "all lane casts reach the boss"; say if overflow should stop
              // at the lane and never touch the boss.
              let rem = dmg;
              for (const e of playerLaneFoes(room, t.lane)) {
                if (rem <= 0 || !e || (e.hp ?? 0) <= 0) continue;
                const absorb = Math.max(1, (e.hp ?? 0) + (e.shield ?? 0));  // what this foe can soak (pre-reduction estimate)
                localDealt += damageEnemy(room, t.lane, e, rem, source);
                rem -= absorb;
              }
            } else {
              localDealt += damageEnemy(room, t.lane, t.foe, dmg, source);
            }
          }
        }
        // lifesteal heals the TOTAL landed — uniformly, so lane/AoE steals too (Sphinx's lane drain;
        // it only covered the single-target path before batch C)
        if (op.lifesteal && localDealt > 0) { source.hp = Math.min(source.maxHp, source.hp + localDealt); healedTrigger(room, source, localDealt); }
        dealt += localDealt;
        if (op.moxieFromDealt && localDealt > 0) source.moxie = Math.min(MOXIE_CAP, (source.moxie ?? 0) + localDealt); // Treasure Blade (owner 2026-07-06)
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
        if (op.target === "lane") {                       // Blizzard: every foe in your lane + the back-line boss (owner 2026-07-09)
          for (const e of playerLaneFoes(room, source.lane)) drainClocks(e, amt);
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
      case "poison": case "slow": case "weakness": case "weakenLane": {
        // DEBUFFS (owner 2026-06-27) on the OPPOSING side, side-aware (hero→foes, foe→heroes+summons).
        const li = source.lane | 0;
        // hero lane-debuff reaches the back-line boss too (owner 2026-07-09: all lane casts reach the boss)
        const opp = source.side === "foe" ? laneLine(room, li) : playerLaneFoes(room, li);
        const dmul = BODIES[source.bodyKey]?.debuffMult ?? 1;   // Depression Demon (owner 2026-06-27): your debuffs last 2×
        const apply = (t) => { if (!t) return;
          if (op.do === "poison")        t.poison = (t.poison ?? 0) + (amt || 1);
          else if (op.do === "slow")     addBuff(t, "slow", 0, (op.dur ?? 60) * dmul);
          else if (op.do === "weakness") addBuff(t, "weakness", 0, (op.dur ?? 60) * dmul);
          else /* weakenLane */          t.counters = (t.counters ?? 0) - (amt || 1); }; // a NEGATIVE counter — permanent for the fight
        if (op.target === "lane" || op.do === "weakenLane") opp.forEach(apply);
        else apply(source.side === "foe" ? opp[0] : aimedFoe(room, source, op.target ?? "pick")?.foe);
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
        if (t) { t.hp = Math.min(t.maxHp, t.hp + amt + powerFor(source, school)); healedTrigger(room, t, amt); }
        break;
      }
      case "schoolStrike": { // "I sword/staff": deal my school Power to a foe, then emit that school's trigger
        const ts = aimedFoe(room, source, op.target ?? "front");
        if (ts) damageEnemy(room, ts.lane, ts.foe, powerFor(source, op.school), source);
        fireSchoolTrigger(room, source, op.school);
        break;
      }
      case "shield": { let sg = amt + (op.ofMaxHp ? source.maxHp : 0) + (op.plusRangedBonus ? rangedBonusOf(source) : 0) + (op.ofDealt ? dealt : (op.power ? powerFor(source, op.power) * (op.mult ?? 1) : 0)); if (sg > 0) sg += shieldPlus(source); source.shield = (source.shield ?? 0) + sg; if (sg > 0) clog(room, "  ✦ " + logNm(source) + " +" + sg + " shield"); break; } // flat + max HP (Golden Golem) / +ranged bonus (Force) / dealt / power×mult; Wandering Castle's +1
      case "comboBuff": source.comboPending = { left: op.n ?? 1, amount: op.amount ?? 1 }; break; // your NEXT N cards deal +amount
      case "thorns":   source.thorns = (source.thorns ?? 0) + amt; break; // Spikes: per-fight reflect buff
      case "moxieOnPlay": { source.moxieOnPlayBuff = (source.moxieOnPlayBuff ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " +" + amt + " moxie per card (this fight)"); break; } // Cool Shoes (owner 2026-07-06: a cast card, not a worn passive)
      case "healSelf": source.hp = Math.min(source.maxHp, source.hp + amt + (op.power ? powerFor(source, op.power) : 0)); healedTrigger(room, source, amt); clog(room, "  ✦ " + logNm(source) + " heals " + amt); break;
      // === OWNER BATCH C ops (2026-07-06), hero side ===
      case "sap": { const dmul = BODIES[source.bodyKey]?.debuffMult ?? 1;   // sap: foes deal −N for the duration
        if (op.target === "selfLane") {                     // GRAVITY GREATSHIELD (owner 2026-07-09): self-cast shield → sap the CASTER'S OWN lane + the back-line boss (owner 2026-07-09: all lane casts reach the boss)
          for (const e of playerLaneFoes(room, source.lane)) addBuff(e, "sap", amt, (op.dur ?? 60) * dmul);
        } else if (op.target === "pickLane") {              // BLACK HOLE (owner 2026-07-07): the AIMED foe's lane + the back-line boss (owner 2026-07-09: all lane casts reach the boss)
          const t = aimedFoe(room, source, "pick");
          if (t) for (const e of playerLaneFoes(room, t.lane)) addBuff(e, "sap", amt, (op.dur ?? 60) * dmul);
        } else {
          for (const lane2 of room.lanes) for (const e of lane2) addBuff(e, "sap", amt, (op.dur ?? 60) * dmul);
          if (bossAlive(room)) addBuff(room.boss, "sap", amt, (op.dur ?? 60) * dmul);
        }
        break; }
      case "twoHand": source.twoHand = true; break;       // Dual-Handing Two-Handers: melee 5+ costs −3 this fight
      case "tkBlades": source.tkBlades = true; break;     // Telekinetic Blades: melee aims + scales ranged this fight
      case "freeNext": source.freeNext = true; break;     // Pyramid-Scheme Head: the next card is FREE
      case "moxieOnHit": source.moxieOnHitBuff = (source.moxieOnHitBuff ?? 0) + amt; break; // Jesterplate: +moxie per hit taken
      case "giantBelt": { if (!source._giantBase) { source._giantBase = source.maxHp; source.maxHp += source._giantBase; source.hp = Math.min(source.maxHp, (source.hp ?? 0) + source._giantBase); clog(room, "  ✦ " + logNm(source) + " GROWS — max HP doubled"); } break; } // Giant's Belt (this fight; restored in beginCombat)
      case "chequeHeal": {  // Cheque Cherub: heal your ALLY-TARGET 1 (or +1 shield at full HP); falls back to the most-hurt friendly
        const at = source.allyTargetId != null ? room.players?.get(source.allyTargetId) : null;
        const t = (at && at.alive) ? at : (lowestHpFriendly(room, source) ?? source);
        if ((t.hp ?? 0) >= (t.maxHp ?? 1)) t.shield = (t.shield ?? 0) + amt + shieldPlus(t);
        else { t.hp = Math.min(t.maxHp, t.hp + amt); healedTrigger(room, t, amt); }
        break; }
      case "shieldFront": { const line = heroesInLane(room, source.lane); const t = line[0] ?? source; const g = amt + shieldPlus(t); t.shield = (t.shield ?? 0) + g; break; } // Earth Elemental's ward: the front of its own line (or itself)
      case "timer": (source.timers ??= []).push({ ops: op.ops ?? [], period: op.period ?? 60, charge: 0, once: !!op.once }); break; // hero-side card timers (Rainblow/Cross-Blade `once`; also un-breaks player-cast Pet Leech/Animated Blade, which only installed on the FOE branch before)
      case "armDouble": source.doubleNext = true; break;  // body passive: my NEXT card resolves twice
      case "counter":  source.counters = (source.counters ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " +" + amt + " dmg"); break;
      case "gainMoxie": source.moxie = Math.min(MOXIE_CAP, (source.moxie ?? 0) + amt); break; // Lizard Wizard: bank moxie
      case "pullFront": {  // Taunt (owner 2026-06-25): DRAG the aimed foe into YOUR lane and to its
        // front — pull it across lanes to face you, not just to the head of its own lane.
        const tp = aimedFoe(room, source, op.target ?? "pick");
        if (tp) {
          const from = room.lanes[tp.lane], idx = from.indexOf(tp.foe);
          if (idx >= 0) { from.splice(idx, 1); tp.foe.lane = source.lane; room.lanes[source.lane].unshift(tp.foe); }
        }
        break;
      }
      case "regen":    (source.regens ??= []).push({ kind: op.kind ?? "heal", amount: op.amount ?? 1, period: op.period ?? 30, melee: op.melee, shield: op.shield, charge: 0 }); break; // Trollskin / Liquid Metal / Moxie Pool / Demon Form / Sage Mode / Berserker
      case "meleeBonus": source.meleeBonus = (source.meleeBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " melee +" + amt); break; // Sharpened Edges: 🗡-only ramp (counters lifts both, this lifts only melee)
      case "rangedBonus": source.rangedBonus = (source.rangedBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " ranged +" + amt); break; // Wizard Hat: 🎯-only ramp
      case "bloodToIron": source.bloodToIron = { stored: 0, left: op.dur ?? 50, dur: op.dur ?? 50 }; break; // store damage → shield when the window closes
      // === OWNER BATCH D ops (2026-07-07), hero side ===
      case "mirror": {   // MIRROR SHIELD: arm a one-shot reflect — the next attack that lands on you strikes the attacker back for the same damage (consumed in reflectThorns)
        source.mirrorShield = (source.mirrorShield ?? 0) + 1;
        clog(room, "  🪞 " + logNm(source) + " raises a mirror");
        break; }
      case "tutor": {    // CRYSTAL BALL: move the play's PICKED draw-pile card (source._pick, a card KEY) into the hand
        if ((source.deck?.length ?? 0) === 0) recycleDeck(source);   // a dry draw pile recycles the discard first — the pile the client showed
        const dk = source.deck ?? [];
        if (!dk.length) break;                                       // BOTH piles dry (or a deckless token) — nothing to fetch, never a crash
        let i = dk.findIndex((c) => c.key === source._pick);
        if (i < 0) i = Math.floor(Math.random() * dk.length);        // FLAG: invalid/missing pick → a RANDOM draw-pile card (per the pick contract)
        const fetched = dk.splice(i, 1)[0];
        (source.hand ??= []).push(fetched);                          // FLAG: the tutored card is EXTRA — the hand grows past HAND_SIZE for real card advantage (the played slot still refills normally)
        clog(room, "  ✦ " + logNm(source) + " scries " + (KIT[fetched.key]?.name ?? fetched.key) + " into hand");
        break; }
      case "summonPick": {   // GRAND SPIRIT: the play's pick chooses the token body; bots/no-pick take the FLAGged default (attacker)
        const body = op.options?.[source._pick] ?? op.options?.[op.fallback ?? "attacker"];
        if (body) summonBodies(room, source, { do: "summon", body, count: op.count ?? 1 });
        break; }
      default: break; // verb not implemented yet — intentional, never silently wrong
      // (the "echoArm" op died with the armed-clock echo — the bar lives in tickEchoBar now)
    }
  }
  return dealt;   // total damage this op-list LANDED — feeds {dealtMelee}/{dealtRanged} body clocks
}

// WORN-PASSIVE moxie refund (Cool Shoes, owner 2026-06-25): +N moxie each time the wearer plays/casts
// a card. Reads worn gear (player.inv / foe.equipment) — symmetric across both sides; callers cap at
// MOXIE_CAP.
// Cool Shoes' refund is a CAST-INSTALLED lasting buff now (owner 2026-07-06: "there's no such thing
// as a passive — they're just a card"), not a worn-inventory scan. Reset per fight in beginCombat.
const moxieOnPlayBonus = (c) => c?.moxieOnPlayBuff ?? 0;
// PLAY A CARD (CARDS_SPEC §5) — replaces the old cooldown `useItem`. Spend moxie, resolve the card's
// ops (ECHO / Giga / school-trigger / Djinn all UNCHANGED), then the card leaves the hand: a fragile
// one-shot is gone for the fight; everything else goes to the DISCARD (exhaust-before-repeat,
// owner 2026-07-01). Draw to refill the hand; a dry deck recycles the discard.
// `pick` (owner 2026-07-07 batch D, PICK CONTRACT): the play message's optional choice string —
// a summon-body option key (Grand Spirit) or a draw-pile card key (Crystal Ball). Validated at the
// op (bad/missing pick falls back — summonBody → the op's default, deckCard → a random draw); a
// pick on a pickless card is simply ignored. Never crashes, never softlocks.
export function playCard(room, player, id, pick = null) {
  if (room.phase !== "playing" || !player.alive) return false;
  const body = BODIES[player.bodyKey];
  const hi = (player.hand ?? []).findIndex((c) => c.id === id);
  if (hi < 0) return false;                          // not a card in your hand
  const card = player.hand[hi];
  const item = KIT[card.key];
  if (!item?.ops) return false;                      // worn passive — nothing to cast
  const cost = playCost(card.key, body, player);     // body pricing + Two-Handers discount + a FREE next card (owner 2026-07-06)
  if ((player.moxie ?? 0) < cost) return false;      // can't afford it yet
  player.moxie -= cost;
  if (player.freeNext) player.freeNext = false;      // Pyramid-Scheme Head: the free card is spent on THIS play
  // WANDERING CASTLE (owner 2026-07-06): casting a 5+-cost card grants that much shield (+ his bonus)
  { const th = body?.costlyShield; if (th && cost >= th) { const g = cost + shieldPlus(player); player.shield = (player.shield ?? 0) + g; clog(room, "  ✦ " + logNm(player) + " +" + g + " shield (costly cast)"); } }
  clog(room, "▶ " + logNm(player) + " plays " + (KIT[card.key]?.name ?? card.key));
  // ECHO arms a double; Giga ×4 on staff; armDouble body passive doubles the NEXT card (any school).
  let times = item.type && body?.echo === item.type && player.echoArmed ? 2 : 1;
  if (body?.doubleExpensive != null && cost >= body.doubleExpensive) times *= 2;   // Nepotistic Neptune (owner 2026-06-27): a ≥N-cost card resolves twice
  if (times === 2) player.echoArmed = false;
  if (player.gigaArmed && item.type === "magical") { times *= 4; player.gigaArmed = false; }
  if (player.doubleNext) { times *= 2; player.doubleNext = false; }
  // effectBoost: "my <school> cards costing ≥ minCost gain +N"; combo: "your next N cards deal +amount"
  const eb = body?.effectBoost;
  let boost = (eb && item.type === eb.school && cost >= (eb.minCost ?? 0)) ? (eb.amount ?? 1) : 0;
  const usedCombo = (player.combo?.left ?? 0) > 0;
  if (usedCombo) boost += player.combo.amount || 0;
  let dealtTot = 0;
  player._pick = typeof pick === "string" ? pick : null;   // the play's choice, visible to tutor/summonPick ops during THIS resolve only
  player._bothKindsPlay = false;                           // set during resolve iff a Moonlight lane-FORM strike fired (owner 2026-07-09)
  for (let n = 0; n < times; n++) dealtTot += (resolveOps(room, player, item.ops, item.type, boost, cardKind(card.key)) || 0);
  const bothKinds = player._bothKindsPlay; player._bothKindsPlay = false; // read + clear BEFORE any passive-triggered resolveOps runs
  player._pick = null;                                     // never leaks into a later play (a doubled tutor re-picks randomly — the card's already in hand)
  if (item.type) fireSchoolTrigger(room, player, item.type);
  spendTriggerPassives(room, player, cost, item.type); // school-tagged so {spend,school} clocks count right
  const trigKind = bothKinds ? "both" : triggerKind(card.key);                   // Moonlight lane form = melee AND ranged (owner 2026-07-09); else the card's static kind ("melee"/"ranged"/"none")
  playTriggerPassives(room, player, trigKind);                                   // {play}/{pairMR} body clocks
  dealtTriggerPassives(room, player, dealtTot, cardKind(card.key) === "ranged", bothKinds); // {dealtMelee}/{dealtRanged} — by DAMAGE kind; lane form counts as BOTH
  cardEventPassives(room, player, dealtTot, trigKind, _isDamageCard(card.key));  // onDeal / onPlayNonDmg / onPlayRanged / onPlayMelee — by triggerKind
  if (usedCombo && player.combo) { if (--player.combo.left <= 0) player.combo = null; } // spend one combo charge
  if (player.comboPending) { player.combo = player.comboPending; player.comboPending = null; } // a comboBuff just set the next run
  echoDelay(player);                                 // every play pushes the wearer's own echo bar back
  { const mr = moxieOnPlayBonus(player); if (mr) player.moxie = Math.min(MOXIE_CAP, (player.moxie ?? 0) + mr); } // Cool Shoes: +moxie on every play
  (room.useCounts ??= {})[card.key] = ((room.useCounts ?? {})[card.key] ?? 0) + 1; // telemetry: per-room casts
  if (item.ops?.length) tickDjinnCounter(room, player); // Djinn: every 3rd party card bites back
  // route the played card OUT of hand: fragile → gone this fight · lasting → stays in play ·
  // else → the DISCARD pile (owner 2026-07-01, exhaust-before-repeat): it can't be drawn again
  // until the draw pile runs dry and recycleDeck shuffles the discard back in.
  if (item.fragile) player.cards = (player.cards ?? []).filter((c) => c.id !== card.id);
  else if (item.lasting) (player.inPlay ??= []).push(card); // fight-long PASSIVE (owner 2026-06-24): stays IN PLAY, restored next combat via dealHand
  else (player.disc ??= []).push(card);                     // discarded — recycles only when the deck is dry
  // REFILL IN PLACE (owner 2026-06-24): the replacement draws into the SAME slot the played card
  // left, so the hand stays positionally stable instead of collapsing left + appending at the end —
  // every other card keeps its spot; only the played slot's card changes. A dry draw pile recycles
  // the discard first; if BOTH are dry the card is just removed (the hand naturally shrinks).
  if ((player.deck?.length ?? 0) === 0) recycleDeck(player);
  if ((player.deck?.length ?? 0) > 0) player.hand.splice(hi, 1, player.deck.shift());
  else player.hand.splice(hi, 1);
  drawUp(player);                                    // top up any still-empty slots (no-op in the common case)
  return true;
}

// Back-compat shim: a few tools/tests still fire by slot index → play that hand card by id.
export function useItem(room, player, slot) {
  const card = (player.hand ?? [])[slot | 0];
  return card ? playCard(room, player, card.id) : false;
}

// AUTO targets DAMAGE first: play the priciest affordable DAMAGING card. If none is affordable yet
// but a pricier damaging card is pending in hand, HOLD to bank moxie toward it (unless moxie is
// capped — then don't waste regen). This kills the starvation where a lone cheap utility (Small
// Shield⚡1) gets replayed forever at moxie 1 and the real damage never fires (QA finding 2026-06-21).
const _DMG_OPS = new Set(["deal", "schoolStrike", "attack", "summon", "summonArmed", "summonPick", "dealEachLane"]);   // summonPick = Grand Spirit (owner 2026-07-07)
const _isDamageCard = (key) => (KIT[key]?.ops ?? []).some((o) => _DMG_OPS.has(o.do));
export function autoPlay(room, p) {
  const hand = p.hand ?? [], bd = BODIES[p.bodyKey];
  const cost = (c) => cardCost(c.key, bd);
  const aff = hand.filter((c) => cost(c) <= (p.moxie ?? 0));
  if (!aff.length) return;                                              // nothing affordable — bank
  const priciest = (list) => list.reduce((a, b) => (cost(b) > cost(a) ? b : a));
  const dmgAff = aff.filter((c) => _isDamageCard(c.key));
  if (dmgAff.length) return void playCard(room, p, priciest(dmgAff).id); // hit something now
  const pendingDmg = hand.some((c) => _isDamageCard(c.key) && cost(c) > (p.moxie ?? 0));
  if (pendingDmg && (p.moxie ?? 0) < MOXIE_CAP) return;                 // bank toward the real hit
  playCard(room, p, priciest(aff).id);                                  // else best utility/heal/buff
}

// FOE CAST (symmetric with playCard): spend moxie on the FRONT queue card if affordable, resolve its
// ops (echo/school-trigger included), then rotate it to the back. One cast per tick. Returns bool.
// a foe's EFFECTIVE card cost: the same body discount you get, minus any elite-room gimmick cut (Cut-Rate Foes).
export const foeCardCost = (key, bd, room) => Math.max(0, cardCost(key, bd) - (room?.gimmick?.foeCostCut ?? 0));

export function foeCast(room, e) {
  const q = e.queue;
  if (!q || !q.length) return false;
  const card = q[0], item = KIT[card.key], bd = BODIES[e.bodyKey];
  if (!item?.ops) { q.push(q.shift()); return false; }   // dud guard (passives shouldn't be queued)
  const cost = Math.max(0, playCost(card.key, bd, e) - (room?.gimmick?.foeCostCut ?? 0)); // body pricing + Two-Handers/free-next state + any elite gimmick cut (symmetric)
  if ((e.moxie ?? 0) < cost) return false;               // not enough moxie yet
  e.moxie -= cost;
  if (e.freeNext) e.freeNext = false;                    // Pyramid-Scheme Head (symmetric)
  { const th = bd?.costlyShield; if (th && cost >= th) { const g = cost + shieldPlus(e); e.shield = (e.shield ?? 0) + g; clog(room, "  ✦ " + logNm(e) + " +" + g + " shield (costly cast)"); } } // Wandering Castle
  clog(room, "↳ " + logNm(e) + " casts " + (KIT[card.key]?.name ?? card.key));
  let times = item.type && bd?.echo === item.type && e.echoArmed ? 2 : 1;
  if (bd?.doubleExpensive != null && cost >= bd.doubleExpensive) times *= 2;   // Nepotistic Neptune (symmetric)
  if (times === 2) e.echoArmed = false;
  if (e.doubleNext) { times *= 2; e.doubleNext = false; }
  const eb = bd?.effectBoost;
  let boost = (eb && item.type === eb.school && cost >= (eb.minCost ?? 0)) ? (eb.amount ?? 1) : 0;
  const usedCombo = (e.combo?.left ?? 0) > 0;
  if (usedCombo) boost += e.combo.amount || 0;
  let dealtTot = 0;
  e._bothKindsPlay = false;                              // set during resolve iff a Moonlight lane-FORM strike fired (owner 2026-07-09, symmetric)
  for (let n = 0; n < times; n++) dealtTot += (resolveOps(room, e, item.ops, item.type, boost, cardKind(card.key)) || 0);
  const bothKinds = e._bothKindsPlay; e._bothKindsPlay = false; // read + clear before any passive-triggered resolveOps runs
  if (item.type) fireSchoolTrigger(room, e, item.type);  // foe "when I sword/staff" fires too
  spendTriggerPassives(room, e, cost, item.type);        // school-tagged spend → body clocks
  const trigKind = bothKinds ? "both" : triggerKind(card.key);                // Moonlight lane form = melee AND ranged (owner 2026-07-09); else the card's static kind
  playTriggerPassives(room, e, trigKind);                                     // {play}/{pairMR} body clocks
  dealtTriggerPassives(room, e, dealtTot, cardKind(card.key) === "ranged", bothKinds); // {dealtMelee}/{dealtRanged} — by DAMAGE kind; lane form counts as BOTH
  cardEventPassives(room, e, dealtTot, trigKind, _isDamageCard(card.key));    // onDeal / onPlayNonDmg / onPlayRanged / onPlayMelee — by triggerKind
  if (usedCombo && e.combo) { if (--e.combo.left <= 0) e.combo = null; }
  if (e.comboPending) { e.combo = e.comboPending; e.comboPending = null; }
  echoDelay(e);
  { const mr = moxieOnPlayBonus(e); if (mr) e.moxie = Math.min(MOXIE_CAP, (e.moxie ?? 0) + mr); } // Cool Shoes (symmetric): +moxie on every cast
  if (item.lasting) q.shift();   // a fight-long PASSIVE leaves the queue, never cycles back (symmetric w/ players' inPlay)
  else q.push(q.shift());                                 // front → back
  return true;
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
  clog(room, "  → " + landed + " to " + logNm(enemy) + (attacker ? " (from " + logNm(attacker) + ")" : ""));
  if (enemy.bloodToIron) enemy.bloodToIron.stored += 1;   // Blood To Iron (foe side): count the HIT — 1 shield per instance (owner 2026-06-27)
  amount = absorbShield(enemy, amount);                 // its shield buffer eats the hit before HP
  if (amount > 0) {
    enemy.hp -= amount;
    if (enemy.hp <= 0) {
      clog(room, "  ☠ " + logNm(enemy) + " falls");
      const lane = room.lanes[laneIdx];
      const i = lane.indexOf(enemy);
      if (i >= 0) lane.splice(i, 1);
      // onKill (owner 2026-06-27): a foe defeated in a lane fires that lane's HERO defenders' onKill passives (Bookie Bonelord → +1 melee)
      for (const h of laneHeroes(room, laneIdx)) { const ap = BODIES[h.bodyKey]?.passive; if (ap) for (const pk of ap) if (pk.onKill) resolveOps(room, h, pk.ops, pk.school || null); }
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
    }
  }
  if (enemy.ratStack && enemy.hp > 0) syncRatStack(enemy);   // a surviving rat-stack drops to "N rats", bite N
  // ON-DAMAGED triggers fire on the GROSS hit whenever the foe SURVIVES — even if its shield ate the
  // whole blow (owner 2026-06-24: "damage taken" counts shielded damage; a shielded Fat Cat still rats).
  if (enemy.hp > 0) {
    runPassive(room, enemy, "damaged"); // e.g. Fat Cat spawns a rat when hit
    accelClocks(enemy, "damaged");              // a hit speeds bruiser ramp clocks
    hitTriggerPassives(room, enemy, landed);    // {hit}/{spendOrHit} clocks ramp on damage taken (gross)
    atlasReflect(room, enemy, landed);          // Atlas, Shrugging: every 10 taken → 10 to his whole lane
    if (BODIES[enemy.bodyKey]?.boss) bossOnDamaged(room, enemy, laneIdx, landed); // Hydra: a head per POINT landed
  }
  reflectThorns(room, enemy, attacker, landed);   // a thorned/mirrored foe spikes its striker back (symmetric)
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
  clog(room, "  ✖ " + landed + " to " + logNm(p));
  if (p.bloodToIron) p.bloodToIron.stored += 1;   // Blood To Iron: count the HIT — 1 shield per instance (owner 2026-06-27), repaid as shield later
  amount = absorbShield(p, amount);               // per-body shield buffer eats the hit before HP
  p.hp -= amount;                                 // amount is 0 when the shield ate the whole hit
  if (p.hp <= 0) { p.hp = 0; p.alive = false; clog(room, "  ☠ " + logNm(p) + " goes DOWN"); } // out for the rest of the fight; revived on room clear
  // ON-DAMAGED triggers fire on the GROSS hit even when a shield fully absorbs it (owner 2026-06-24:
  // "damage taken" counts shielded damage — a shielded Fat Cat still earns its rat).
  else { runPassive(room, p, "damaged"); accelClocks(p, "damaged"); hitTriggerPassives(room, p, landed); atlasReflect(room, p, landed); } // worn on-damaged + bruiser ramp + Atlas shrug
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
    tickRegens(p, room); tickBloodToIron(p); tickPoison(room, p, p.lane);  // ongoing card effects (Trollskin / Liquid Metal / Blood To Iron / Poison); room threaded for Berserker self-hit triggers
    const body = BODIES[p.bodyKey];
    const step = 1 + (hasBuff(p, "haste") ? 1 : 0); // Haste: moxie charges double-speed
    { const _pm0 = p.moxie ?? 0; regenMoxie(p, step); gainTriggerPassives(room, p, (p.moxie ?? 0) - _pm0); }   // +1 moxie/sec + {gain:N} body clocks (owner 2026-06-27)
    // AUTO play (owner 2026-06-12: "tired of clicking"): play the most-expensive AFFORDABLE card in
    // hand — best use of the moxie on the board — one per tick. Manual stays the default.
    if (p.autoFire) autoPlay(room, p);
    // SYMMETRY: a worn body's passives fire for the player exactly as they do for a foe. Self-timed
    // `every:N` clocks (Royal Rat summon, Wageslave heal) run via tickOwnTimers; the hourglass timer
    // fires the body's on-hourglass passive. Only the kit items stay manual (click-to-fire).
    tickOwnTimers(room, p); tickTimers(room, p, p.lane);
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
      tickRegens(e, room); tickBloodToIron(e); tickPoison(room, e, i);  // ongoing card effects, foe side (symmetry)
      // CARD CAST (symmetric, CARDS_SPEC §5): charge moxie, then cast the FRONT queue card if
      // affordable — one per tick — and cycle it to the back. (Body passives still run below.)
      { const _em0 = e.moxie ?? 0; regenMoxie(e, 1 + (hasBuff(e, "haste") ? 1 : 0)); gainTriggerPassives(room, e, (e.moxie ?? 0) - _em0); }
      foeCast(room, e);
      // per-passive independent timers: a passive carrying `every:N` runs on its OWN
      // clock, decoupled from the body timer and from anything the players do — so a
      // body can ramp every 3.5s AND heal every 5s at their own cadences (visible ramps).
      tickOwnTimers(room, e); tickTimers(room, e, i);
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
      tickBuffs(al);
      if (room.freezeHeroes > 0) continue;        // a foe Time Stop freezes the hero side — summons too
      tickRegens(al, room); tickBloodToIron(al); tickPoison(room, al, i);
      // SUMMON CASTING (owner 2026-06-24): a token with a queue (e.g. a rat's Bite) earns moxie and
      // casts at the FRONT FOE in its lane — exactly as a foe casts at the front hero (foeCast is
      // side-agnostic; resolveOps branches on side). Tokens with no queue (auras) just stand.
      if (al.queue?.length) { regenMoxie(al, 1); foeCast(room, al); }
      tickOwnTimers(room, al); tickTimers(room, al, i); // self-timed passives (largeRat/knight) + card timers (owner 2026-06-27)
      if (BODIES[al.bodyKey]?.cd > 0) {           // summoner allies fire on their body clock
        al.charge = (al.charge ?? 0) + 1;
        if (al.charge >= BODIES[al.bodyKey].cd) { al.charge = 0; runPassive(room, al, "hourglass"); }
      }
    }
  }

  // the BACK-LINE boss (Hydra/Lich/Kraken) ticks its clocks from behind the lanes
  if (bossAlive(room)) {
    room.boss.side = "foe"; tickBuffs(room.boss);
    if (!(room.freezeFoes > 0)) { tickPoison(room, room.boss, room.boss.lane | 0); tickBossClocks(room, room.boss); }  // ⏳ Time Stop freezes bosses too
  }

  if (!(room.freezeFoes > 0)) processRoomTimers(room); // Acid Rain / Rat Colony freeze with the foes

  const enemiesLeft = room.lanes.reduce((n, l) => n + l.length, 0) + (bossAlive(room) ? 1 : 0);
  const heroesAlive = [...room.players.values()].some((p) => p.alive);
  const alliesLeft = room.allies.reduce((n, l) => n + l.length, 0);
  if (enemiesLeft === 0) {
    room.phase = "won";
    // Clearing a room patches the party back up — full heal + revive any downed heroes,
    // so you head into the loot/next-room screen whole.
    for (const p of room.players.values()) { p.alive = true; p.downTimer = 0; p.hp = p.maxHp; }
    // Loot — ANTE V2 (owner 2026-07-02): EVERY ante point drops, so a room's ⚖ IS its ◈. The felled
    // foes' carried cards drop as themselves; their LEVELS, their ELITE-BODY premiums, and the room
    // EFFECT's pot all "take the form of random items" (rollCompItems — exact value, no overshoot).
    const gear = (room.draftedFoes ?? []).flatMap((f) => f.gear ?? []).filter((k) => KIT[k]);
    // the "higher than base 1" surplus of every foe — its LEVELS (2 each) and its ELITE-BODY
    // premium — plus the room EFFECT's pot, all drop as THAT MANY random treasures (owner
    // 2026-07-03). Each foe's flat +1 base is a threat-only cover charge and does NOT drop.
    const comp = (room.draftedFoes ?? []).reduce((s, f) => s + levelAnte(foeLevel(f)) + eliteBodyAnte(f.bodyKey), 0)
               + (room.gimmick?.pot ?? 0);
    room.loot = [...gear, ...rollCompItems(comp)];
    room.lastRoomValue = roomValue(room);   // display only (the ante sum) — no gold is credited
    const cur = currentNode(room);
    if (cur && cur.type === "boss") {
      cur.cleared = true; room.levelComplete = true;
      if ((room.floor ?? 1) >= THRONE_FLOOR) room.runWon = true;  // the King fell — RUN COMPLETE
      // BOSS PAYDAY: a guaranteed shelf of rare cards (free to claim into the backpack — no gold)
      room.loot = [...room.loot, ...rollBossLoot(room)];
    }
    // LOOT BID POINTS (owner 2026-07-02): in CO-OP the pool's total value is granted as claim
    // budget, split across the human seats (excess → lowest cumulative earner — see grantBidPoints).
    // Granted AFTER the boss payday extends the pool, so the party can always afford ALL of it.
    if (room.players.size > 1) grantBidPoints(room, room.loot.reduce((s, k) => s + itemTreasure(k), 0));
    // owner 2026-06-24: a SINGLE player just COLLECTS the room's loot straight into the backpack
    // (no claim screen) — cards arrive innately into the backpack (NOT the deck; the deck is chosen).
    // (Multiplayer keeps the shared-claim model.)
    if (room.players.size === 1) {
      const solo = [...room.players.values()][0];
      for (const k of room.loot) if (KIT[k]) (solo.backpack ??= []).push(k);
      room.loot = [];
    }
  }
  // THE SOLE LOSS (owner 2026-06-27, caravan deleted): you are in the run as long as ANY of your
  // combatants — a player body OR a summon — is alive. A lone surviving rat-stack keeps you in. The
  // party loses only when EVERY player body AND EVERY summon is defeated. (Checked AFTER the win
  // above, so an ally that clears the board on its dying tick still scores the win.)
  else if (!heroesAlive && alliesLeft === 0) { room.phase = "lost"; if (!room._endLogged) { room._endLogged = true; clog(room, "═══ YOUR PARTY FALLS ═══"); } }

  // (Anti-stall auto-LOSS removed 2026-06-24 — owner: "not needed." A slow fight no longer times out
  // into a surprise loss; the deadlock guard above still ends a genuinely wiped party. STALL_LIMIT is
  // kept exported only for the QA driver's stuck-detection.)
}
