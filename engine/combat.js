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
  bossCardDamage,
  bossCardIntent,
  bossCardTargets,
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
  leveledBody,
  leveledPassives,
  masteryRank,
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
  specialtyRank,
  swapBody,
  swapOwnItems,
  syncLobbyLanes,
  tankiness,
  tenderValue,
  tentacleCount,
  tickBossClocks,
  tickTornadoes,
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
//
// SPECIAL SHIELDS (W2-B, owner 2026-07-10): most shields are a plain scalar in `c.shield`. Two cards
// grant shield that carries a per-shield DAMAGE MODIFIER, tracked in a PARALLEL list `c.shieldSegs`
// = [{ amount, mod }] (chosen over converting `c.shield` into segments so every existing shield
// read/write — effHpOf, Shield Bash's `ofShield`, snapshot, overheal spill, all gain sites — stays
// untouched; `c.shield` remains the grand TOTAL and the "normal" pool = total − Σ(segment amounts)).
// FLAG (structural): parallel-field model chosen as the minimal change; owner may prefer full segments.
// FLAG (ordering): special segments absorb BEFORE the normal pool, in the order gained (FIFO). Owner
// to confirm vs normal-first / gain-order-across-both.
//   "double" — Punishment Glutton: this shield takes double damage (2 shield spent per 1 point of hit
//              neutralized; a lone odd shield point still stops a full 1 so none is stranded — FLAG).
//   "cap1"   — RETIRED as a live card mechanic (owner 2026-07-11: Swords of Revealing Light was
//              redesigned into the `revealLight` incoming-hit cap buff — see revealLightCap). The
//              segment machinery stays: chips at most 1 off ITSELF per hit, the rest passes through.
export function absorbShield(c, dmg) {
  if (!c || dmg <= 0 || !(c.shield > 0)) return dmg;
  const hadShield = c.shield > 0;
  let remaining = dmg;
  const segs = c.shieldSegs;
  if (segs && segs.length) {
    for (const seg of segs) {
      if (remaining <= 0) break;
      if (!(seg.amount > 0)) continue;
      let hitAbsorbed, drained;
      if (seg.mod === "double") {
        const maxHit = Math.ceil(seg.amount / 2);         // 2 shield per point; a lone odd point stops 1 (FLAG)
        hitAbsorbed = Math.min(remaining, maxHit);
        drained = Math.min(seg.amount, hitAbsorbed * 2);
      } else if (seg.mod === "cap1") {
        hitAbsorbed = Math.min(remaining, 1, seg.amount); // at most 1 chipped per hit; overflow passes through (FLAG)
        drained = hitAbsorbed;
      } else {
        drained = Math.min(seg.amount, remaining);        // unknown mod → behaves like a normal shield (1:1)
        hitAbsorbed = drained;
      }
      seg.amount -= drained;
      c.shield -= drained;
      remaining -= hitAbsorbed;
    }
    c.shieldSegs = segs.filter((s) => s.amount > 0);       // drop spent segments
  }
  if (remaining > 0 && c.shield > 0) {                     // then the plain scalar pool, 1:1 as always
    const segTotal = (c.shieldSegs || []).reduce((a, s) => a + s.amount, 0);
    const normal = c.shield - segTotal;
    const used = Math.min(normal, remaining);
    if (used > 0) { c.shield -= used; remaining -= used; }
  }
  if (hadShield && c.shield <= 0 && !c._shieldBreakRewarded && (c.shieldBreakDamage ?? 0) > 0) {
    c._shieldBreakRewarded = true;
    c.counters = (c.counters ?? 0) + c.shieldBreakDamage;
  }
  return remaining;
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
  const pas = leveledPassives(c);
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
function reflectHit(room, attacker, n, source = null, cause = "Reflection") {
  if (!(n > 0) || !attacker) return;
  if (attacker.side === "foe") {
    damageEnemy(room, attacker.lane | 0, attacker, n, null, { source, cause });
  } else if (attacker.id != null && room.players?.has?.(attacker.id)) {
    damagePlayer(room, attacker, n, { source, cause });
  } else {
    const li = attacker.lane | 0;
    hurtAllyToken(room, li, attacker, n, null, { source, cause, noReact: true });
  }
}
// `landed` = the gross damage that just landed on the victim (into shield+HP, past DR/auras).
// `raw` = the FULL damage of the triggering hit — the attacker's swing (incl. its own aura/bonus
// adds) BEFORE the victim's DR/auras softened it. OWNER RULING 2026-07-11: Mirror Shield reflects
// the RAW hit ("if they hit with a 10 damage card it should reflect 10 damage"), not the
// post-mitigation landed amount. `landed > 0` stays the TRIGGER gate (a fully-warded/absorbed-to-0
// hit never landed, so it consumes nothing — trigger semantics unchanged).
// FLAG (mechanical read of "full damage"): raw INCLUDES the attacker's own lane-aura/bonus adds
// (the swing that was actually aimed at you) — say if it should be the card's printed base instead.
function reflectThorns(room, victim, attacker, landed = 0, raw = landed) {
  if (!attacker || attacker === victim) return;
  reflectHit(room, attacker, victim?.thorns ?? 0, victim, "Thorns");
  // MIRROR SHIELD (owner 2026-07-07 batch D): a ONE-SHOT charge — the next foe attack that LANDS on
  // the wearer strikes the attacker back, then the mirror is consumed. Rides the thorns call sites,
  // so it fires on DIRECT hits only (lane AoE has no single striker contact — FLAG: same ruling as
  // thorns; say if AoE should trip the mirror too). "Hits you" follows the codebase convention that
  // shield-absorbed damage still counts as a landed hit (owner 2026-06-24).
  if ((victim?.mirrorShield ?? 0) > 0 && landed > 0) {
    victim.mirrorShield--;
    const back = Math.max(raw, landed);   // full raw hit (never less than what landed)
    clog(room, "  🪞 " + logNm(victim) + " MIRRORS " + back + " back at " + logNm(attacker));
    reflectHit(room, attacker, back, victim, "Mirror Shield");
  }
}

// Damage one ally summon token (shield → aura reduce → HP), with on-damaged symmetry.
// Returns the amount that got past the aura (what "landed" for lifesteal purposes).
// `opts.noReact` (Butterfly Knife, owner 2026-07-11): the hit fires NO reactive hook on the victim.
function hurtAllyToken(room, li, al, dmg, attacker = null, opts = {}) {
  const noReact = opts?.noReact === true;
  al.lane = li; al.side = "hero";
  const raw = dmg;                                       // the full swing — Mirror Shield's reflect magnitude (owner 2026-07-11)
  dmg -= laneAura(room, al, "dmgReduce");
  dmg = revealLightCap(al, dmg);                         // Swords of Revealing Light: next-3-hits-become-1 charges (owner 2026-07-11)
  if (dmg <= 0) return 0;
  const landed = dmg;
  const hpBefore = Math.max(0, al.hp ?? 0), shieldBefore = Math.max(0, al.shield ?? 0);
  let died = false;
  dmg = absorbShield(al, dmg);
  if (dmg > 0) {
    al.hp -= dmg;
    if (al.hp <= 0) { died = true; const i = room.allies[li].indexOf(al); if (i >= 0) room.allies[li].splice(i, 1); (room.defeated ??= { hero: 0, foe: 0 }).hero++; }
    else { if (al.ratStack) syncRatStack(al); if (!noReact) { runPassive(room, al, "damaged"); accelClocks(al, "damaged"); } }
  }
  const event = recordDamageEvent(room, al, landed, hpBefore, shieldBefore, {
    ...opts, source: opts?.source ?? attacker, requested: raw, pierce: false,
  });
  logDamageEvent(room, event, "✖");
  genericDealtTrigger(room, attacker, landed);
  poisonDamageTarget(room, attacker, al, landed);
  if (died) defeatTriggerPassives(room, li);
  if (!noReact) reflectThorns(room, al, attacker, landed, raw);
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

// BREACH, HERO SIDE (owner symmetry directive 2026-07-10): the exact mirror of
// nearestDefendedLane — the NEAREST lane to `from` that holds a LIVING foe, so a hero/rat whose
// own lane is empty FOLLOWS THE FOES instead of whiffing (foes already breach via foeHitLane).
// Returns the lane index, or -1 when NO lane holds a foe anywhere. Equidistant lanes tie to the
// LOWER index (flag: left-bias on a tie, same as the foe side).
export function nearestFoeLane(room, from = 0) {
  const n = room.laneCount ?? room.lanes.length;
  for (let d = 0; d < n; d++) {
    for (const li of (d === 0 ? [from] : [from - d, from + d])) {
      if (li < 0 || li >= n) continue;
      if ((room.lanes[li] ?? []).some((f) => (f?.hp ?? 0) > 0)) return li;
    }
  }
  return -1;
}

// A combatant's effective HP for the ranged-snipe pick = HP + shield.
const effHpOf = (c) => (c?.hp ?? 0) + (c?.shield ?? 0);
// RANGED foe targeting (owner spec 2026-06-27): the single LOWEST effective-HP (hp+shield) PLAYER
// across ALL lanes — a cross-lane snipe that skips summons while ANY player body remains alive.
// Ties among equal-lowest resolve to the NEAREST player (smaller lane-distance to `fromLane`, then
// lower lane index). Returns null when no player is alive anywhere; foeRangedTarget then falls
// through to surviving hero summons so a ranged-only foe cannot deadlock the fight.
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

// Terminal ranged fallback: once EVERY player body is down, use the same lane-local-first shape
// against living hero summons. Within a lane (and on the global fallback), finish the lowest
// effective-HP summon; global ties prefer the lane nearest the attacker, then the lower lane.
// This helper is deliberately unreachable while a live player exists, preserving the ranged
// contract that summons do not intercept shots meant for player bodies.
function lowestEHpHeroSummon(room, fromLane = 0) {
  const own = (room.allies?.[fromLane] ?? []).filter((t) => (t?.hp ?? 0) > 0);
  if (own.length) return own.reduce((best, t) => effHpOf(t) < effHpOf(best) ? t : best);
  let best = null, bestLane = -1;
  for (let li = 0; li < (room.laneCount ?? room.allies?.length ?? 0); li++) {
    for (const t of room.allies?.[li] ?? []) {
      if (!(t?.hp > 0)) continue;
      if (best === null || effHpOf(t) < effHpOf(best)) { best = t; bestLane = li; continue; }
      if (effHpOf(t) === effHpOf(best)) {
        const d = Math.abs(li - fromLane), bd = Math.abs(bestLane - fromLane);
        if (d < bd || (d === bd && li < bestLane)) { best = t; bestLane = li; }
      }
    }
  }
  return best;
}

// RANGED foe targeting — LANE-LOCAL preference (owner-approved DESIGN 2026-07-10): a foe's ranged
// attack targets a live PLAYER in the foe's OWN lane when one exists, and only falls back to the
// global cross-lane lowest-eHP PLAYER when the foe's own lane has no live player. Only after every
// player is down does it repeat that lane-local/global selection over surviving hero summons.
// Single foe-ranged target picker; both the resolver (foeHitRanged) and the client telegraph
// (foeTelegraph) route through this so the selected entity always matches the hit that lands.
// FLAG (owner did NOT specify multi-hero-in-lane): among MULTIPLE players in the foe's lane we pick
//   the LOWEST effective-HP (hp+shield) one — keeps the snipe's "finish the weak" flavor but locks
//   it to the lane. Alternative = the FRONT hero (lowest depth). Owner's to re-tune.
// FLAG (fallback, matches owner spec): empty own lane → global lowest-eHP snipe (lowestEHpPlayer),
//   the prior cross-lane behavior. In-lane ties resolve to first-in-iteration (mirrors
//   lowestEHpPlayer, whose lane-distance tiebreak collapses to iteration order within one lane).
export function foeRangedTarget(room, fromLane = 0) {
  const inLane = heroesInLane(room, fromLane);                   // live PLAYERS in the foe's lane
  if (!inLane.length) return lowestEHpPlayer(room, fromLane)     // FLAG fallback: no player home → global player snipe
    ?? lowestEHpHeroSummon(room, fromLane);                      // every player down → finish surviving summons
  let best = null;
  for (const p of inLane) if (best === null || effHpOf(p) < effHpOf(best)) best = p;   // FLAG: lowest-eHP in lane
  return best;
}

// A foe's RANGED deal: hit a player in the foe's own lane (foeRangedTarget), else snipe the weakest
// player anywhere. With every player down, hit a surviving hero summon instead. Returns the damage
// that LANDED (Darkness lifesteals off this). No valid hero-side combatant → whiffs (returns 0).
export function foeHitRanged(room, dmg, attacker = null, opts = {}) {
  if (dmg <= 0) return 0;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");
  const t = foeRangedTarget(room, attacker?.lane ?? 0);
  if (!t) return 0;
  if (room.players?.has?.(t.id)) {
    const landed = damagePlayer(room, t, dmg, { ...opts, source: attacker });
    opts.onHit?.(t, landed);
    reflectThorns(room, t, attacker, landed, dmg);   // raw = the full swing (Mirror Shield, owner 2026-07-11)
    return landed;
  }
  const li = (room.allies ?? []).findIndex((lane) => lane.includes(t));
  const landed = hurtAllyToken(room, li >= 0 ? li : (t.lane ?? 0), t, dmg, attacker, opts);
  opts.onHit?.(t, landed);
  return landed;
}

// A foe's single-target MELEE hit on the hero side of a lane. The FRONT of the lane's UNIFIED
// line (heroes and summons interleaved by depth) blocks. An empty lane BREACHES to the nearest
// defended lane (`redirect`, the default) and hits the front there — never the old caravan; a
// per-lane chip (dealEachLane) passes `redirect=false` so it just hits its own lane's front or
// nobody. Returns the damage that LANDED (past auras/armor, into shield+HP — Darkness lifesteals).
// 6th param `opts`: `true` (legacy boolean) or `{ pierce }` = ignore-all-defence (MOD-3);
// `{ noReact }` = the hit fires no reactive hook on the victim (Butterfly Knife, owner 2026-07-11).
export function foeHitLane(room, li, dmg, attacker = null, redirect = true, opts = undefined) {
  const o = opts === true ? { pierce: true } : (opts ?? {});
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
    const landed = damagePlayer(room, front, dmg, { ...o, source: attacker }); // PIERCE (MOD-3): a foe's Butterfly/Mirror/Meteor bypasses the hero's shield + DR
    o.onHit?.(front, landed);
    if (!o.noReact) reflectThorns(room, front, attacker, landed, dmg);   // raw = the full swing (Mirror Shield, owner 2026-07-11)
    return landed;
  }
  const landed = hurtAllyToken(room, li, front, dmg, attacker, o);
  o.onHit?.(front, landed);
  return landed;
}

// Spear, foe side (V2 §4.9): the front TWO of the unified line each take the full hit; an empty
// lane BREACHES to the nearest defended lane (follow the bodies; no caravan).
export function foeHitFront2(room, li, dmg, attacker = null, opts = {}) {
  if (dmg <= 0) return;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");
  let line = laneLine(room, li);
  if (!line.length) {
    const rl = nearestDefendedLane(room, li);
    if (rl < 0) return;
    li = rl; line = laneLine(room, li);
  }
  for (const v of line.slice(0, 2)) {
    if (room.players?.has?.(v.id)) { const landed = damagePlayer(room, v, dmg, { ...opts, source: attacker }); opts.onHit?.(v, landed); reflectThorns(room, v, attacker, landed, dmg); }   // raw = the full swing (Mirror Shield, owner 2026-07-11)
    else { const landed = hurtAllyToken(room, li, v, dmg, attacker, opts); opts.onHit?.(v, landed); }
  }
}

// A foe's lane-AoE (Lightning): hits EVERY hero and EVERY friendly summon in the lane — the mirror
// of a player's `target:"lane"` deal hitting every foe in a lane. Nobody blocks for anybody (that's
// the point of AoE) and thorns don't fire (no single "striker" contact). An empty lane simply hits
// NOBODY now (no caravan; an area with no occupants does no damage — this also keeps an Atlas shrug
// literal to "his whole lane"). Auras still apply per victim.
// Returns the TOTAL damage that LANDED across the lane's heroes + ally-summons (gross past reduction,
// counting shielded damage — mirrors damageEnemy/damagePlayer). This is the lifesteal feed for a
// foe-owned lane-drainer (Stockbroking Sphinx); pre-existing callers ignore the return.
// `frontExtra` (Whip, owner 2026-07-11): the FRONT of the lane's unified line takes +N on top of
// the lane hit — the foe-side mirror of the player Whip's front rider.
export function foeHitLaneAll(room, li, dmg, attacker = null, frontExtra = 0, opts = {}) {
  if (dmg <= 0) return 0;
  if (attacker) dmg += laneAura(room, attacker, "dmgBonus");
  const front = frontExtra ? laneLine(room, li)[0] : null;
  const allies = [...(room.allies[li] ?? [])];
  const heroes = laneHeroes(room, li);
  let landed = 0;
  for (const al of allies) {
    al.lane = li; al.side = "hero";
    let cut = (dmg + (al === front ? frontExtra : 0)) - laneAura(room, al, "dmgReduce");
    cut = revealLightCap(al, cut);                // Swords of Revealing Light: next-3-hits-become-1 charges (owner 2026-07-11)
    if (cut <= 0) continue;
    opts.onHit?.(al, cut);
    landed += cut;                                // gross into shield+HP (shielded damage counts)
    const hpBefore = Math.max(0, al.hp ?? 0), shieldBefore = Math.max(0, al.shield ?? 0);
    const left = absorbShield(al, cut);
    genericDealtTrigger(room, attacker, cut);
    if (left > 0) al.hp -= left;
    const event = recordDamageEvent(room, al, cut, hpBefore, shieldBefore, {
      ...opts, source: attacker, requested: dmg + (al === front ? frontExtra : 0), pierce: false,
    });
    logDamageEvent(room, event, "✖");
    if (left <= 0) { poisonDamageTarget(room, attacker, al, cut); continue; }
    if (al.hp <= 0) { const i = room.allies[li].indexOf(al); if (i >= 0) room.allies[li].splice(i, 1); (room.defeated ??= { hero: 0, foe: 0 }).hero++; defeatTriggerPassives(room, li); }
      else { poisonDamageTarget(room, attacker, al, cut); if (al.ratStack) syncRatStack(al); runPassive(room, al, "damaged"); accelClocks(al, "damaged"); }
  }
  for (const p of heroes) {
    const hit = damagePlayer(room, p, dmg + (p === front ? frontExtra : 0), { ...opts, source: attacker });
    opts.onHit?.(p, hit);
    landed += hit;
  }
  return landed;
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
  const reflectPer = masteryRank(c) ? 8 : ATLAS_REFLECT_PER;
  const sr = specialtyRank(c);
  const reflectBase = ATLAS_REFLECT_BASE + (sr ? 1 + sr : 0);
  if (room._inShrug) return;                              // a shrug's AoE never re-triggers a shrug (anti-cascade)
  c.atlasClock = (c.atlasClock ?? 0) + landed;
  if (c.atlasClock < reflectPer) return;
  room._inShrug = true;
  try {
    const hit = reflectBase + meleeBonusOf(c) + rangedBonusOf(c);  // his own bonuses — constant across this shrug
    while (c.atlasClock >= reflectPer) {
      c.atlasClock -= reflectPer;
      const li = c.lane | 0;
      clog(room, "  ⚛ " + logNm(c) + " SHRUGS — " + hit + " to his whole lane");
      if (c.side === "foe") {
        foeHitLaneAll(room, li, hit, c, 0, { cause: "Shrug" }); // → every hero + ally summon (empty → caravan)
      } else {
        for (const e of [...(room.lanes?.[li] ?? [])]) damageEnemy(room, li, e, hit, c, { cause: "Shrug" });
        if (bossAlive(room)) damageEnemy(room, li, room.boss, hit, c, { cause: "Shrug" });  // the back-line boss too
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

// Compact intent scope for the client tactical rows/tokens. The authored op is the source of truth;
// shipping this beside each threat keeps a Bone Wizard's "lane" blast (and board/all-lane attacks)
// readable without asking the renderer to reverse-engineer prose.
export const foeThreatScope = (ops = []) => {
  const op = ops.find((o) => FOE_DMG_OPS.has(o.do));
  if (!op) return null;
  if (op.do === "dealEachLane" || op.target === "board") return "all-lanes";
  if (op.target === "lane" || op.target === "pickLane") return "lane";
  if (op.target === "pick") return "aimed";
  if (op.target === "front2") return "front2";
  return "front";
};

export function foeThreats(room, e) {
  const body = BODIES[e.bodyKey] || {};
  const cdMul = e.cdMul ?? 1;
  const out = [];
  const frac = (charge, cd) => Math.min(1, (charge ?? 0) / cd);
  const pas = leveledPassives(e);
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
    out.push({ kind: "passive", harm, label: timerLabel(e, p.ops), scope: harm ? foeThreatScope(p.ops) : null,
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
    const cost = Math.max(1, cardCost(fq.key, leveledBody(e)));
    const harm = opsHarm(item.ops);
    out.push({ kind: "cast", harm, key: fq.key, label: item.name ?? fq.key, scope: harm ? foeThreatScope(item.ops) : null,
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
    const harm = (k.dmg ?? 0) > 0;
    out.push({ kind: "clock", harm, label: k.label ?? k.kind, dmg: k.dmg ?? 0,
      scope: harm ? (k.scope ?? (k.aoe ? "all-lanes" : "front")) : null,
      color: k.color ?? "#8a93a3", frac: frac(k.charge, k.cd), cd: k.cd });
  }
  for (const k of e.coreClocks ?? []) {
    out.push({ kind: "clock", harm: false, label: k.label ?? k.kind, dmg: 0,
      scope: null, color: k.color ?? "#8a93a3", frac: frac(k.charge, k.cd), cd: k.cd });
  }
  for (const k of Object.values(e.bossEffects ?? {})) {
    const label = k.kind === "swarm" ? "Swarm — heads" : k.kind === "regenerate" ? "Regenerate — heal" : k.kind;
    out.push({ kind: "clock", persistent: true, harm: false, label, dmg: 0,
      scope: null, color: k.kind === "regenerate" ? "#7fb08a" : "#5fd0a0",
      frac: frac(k.charge, k.cd), cd: k.cd });
  }
  for (const k of e.castBars ?? []) {
    const dmg = bossCardDamage(room, e, k);
    const targetIds = bossCardTargets(room, e, k).map((target) => target.id);
    const harm = dmg > 0 || k.cardKey === "annihilate";
    out.push({ kind: "cast", castBar: true, cardKey: k.cardKey, lane: k.lane,
      harm, label: k.label ?? k.cardKey, intent: bossCardIntent(room, e, k), targetIds, dmg,
      scope: harm ? (k.scope ?? (k.aoe ? "all-lanes" : "front")) : null,
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
    else if (p.dealt != null) out.push(`⚡ per ${p.dealt} damage dealt`);
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
  // BREACH (owner symmetry directive 2026-07-10): the own lane has no front foe → follow the foes
  // to the nearest foe-occupied lane and hit its front, mirroring the foe side's foeHitLane /
  // nearestDefendedLane. This makes hero/rat single-target melee stop whiffing into empty lanes.
  // FLAG (owner to retune): the ordering is own-lane front → nearest foe lane → back-line boss →
  // null. Only when NO lane holds any foe does melee fall through to the boss (the lane's back wall).
  const rl = nearestFoeLane(room, player.lane);
  if (rl >= 0) { const f = room.lanes[rl].find((e) => (e?.hp ?? 0) > 0); if (f) return { foe: f, lane: rl }; }
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
  // AFFLUENCE ANUBIS (owner 2026-07-10): a DYNAMIC-count summon. `countPerKill` adds one extra summon
  // per enemy of the CASTER defeated so far THIS COMBAT — read off room.defeated (the OPPOSING side's
  // counter), fully symmetric: a FOE caster reads heroes + ally-tokens downed (room.defeated.hero); a
  // PLAYER caster reads foes + enemy-tokens felled (room.defeated.foe). `countPerKill` absent/0 = the
  // legacy fixed count, so every other summon is unaffected. Enemy SUMMON TOKENS now COUNT on both sides
  // (owner ruling 2026-07-10: "punishing enemy rats adding to his summon pool"). Remaining FLAGs (scope
  // this-combat vs whole-run; caster's-enemies vs foe-team) live on the affluenceAnubis body def.
  const enemiesDefeated = source.side === "hero" ? (room.defeated?.foe ?? 0) : (room.defeated?.hero ?? 0);
  const count = Math.max(0, (op.count ?? 1) + (op.countPerKill ?? 0) * enemiesDefeated);
  const metricOwnerId = room.players?.has?.(source.id) ? source.id : (source._metricOwnerId ?? null);
  const metricSourceCard = source._metricCardKey ?? source._metricSourceCard ?? null;
  for (let k = 0; k < count; k++) {
    const li = op.lane != null ? Math.max(0, Math.min(room.laneCount - 1, op.lane | 0)) : baseLane;
    const into = source.side === "hero" ? room.allies[li] : room.lanes[li];
    // FRONT-BLOCK PLACEMENT (owner ruling 2026-07-12, full melee-block symmetry): a hero summon
    // rides depth into the friendly laneLine and blocks foe melee; a FOE summon must sit at
    // room.lanes[li][0] — the lane FRONT that aimedFoe reads for a player's single-target melee —
    // so it body-blocks YOUR sword exactly as your front summon blocks theirs. Foes have no
    // depth-walk, so front = unshift. FLAG: front is the meat-shield default; a "foe summons
    // behind" knob would mirror the player summonSide toggle if the owner ever wants it.
    const place = (t) => (source.side === "hero" ? into.push(t) : into.unshift(t));
    // RAT-MERGE (owner spec 2026-06-27): a rat summoned into a lane that ALREADY holds a rat-stack of
    // the SAME body on this side folds into it — +1 rat (HP and bite), renamed "N rats", killed as
    // ONE HP pool. `rat` and `largeRat` keep separate stacks (see syncRatStack).
    if (isRat) {
      const ratHpBonus = source.bodyKey === "frugal" ? specialtyRank(source) : 0;
      let ratShield = 0;
      if (source.bodyKey === "leverage" && specialtyRank(source) > 0) {
        source._summonedRatSeq = (source._summonedRatSeq ?? 0) + 1;
        if (source._summonedRatSeq % 3 === 0) ratShield = specialtyRank(source);
      }
      const stack = into.find((t) => t.ratStack && t.bodyKey === op.body && t.side === source.side && t.hp > 0);
      if (stack) {
        stack.ratUnitHp = Math.max(stack.ratUnitHp ?? 0, (RAT_UNIT[op.body]?.hp ?? 1) + ratHpBonus);
        stack.hp += stack.ratUnitHp;
        if (ratShield) stack.shield = (stack.shield ?? 0) + ratShield;
        syncRatStack(stack);
        continue;
      }
      const seed = spawnEnemy(op.body);
      seed.side = source.side; seed.lane = li; seed.ratStack = true;
      seed.ratUnitHp = (RAT_UNIT[op.body]?.hp ?? 1) + ratHpBonus;
      seed.hp = seed.maxHp = seed.ratUnitHp;
      seed.shield = ratShield;
      syncRatStack(seed);
      seed._metricOwnerId = metricOwnerId; seed._metricSourceCard = metricSourceCard;
      if (source.side === "hero") {
        const d = source.depth ?? (laneLine(room, li)[0]?.depth ?? 0);
        seed.depth = d + (source.summonSide === "back" ? 0.5 : -0.5);
      }
      place(seed);
      continue;
    }
    const tok = spawnEnemy(op.body, op.gear ?? []); // `summonArmed` passes gear → a real threatening court
    tok.side = source.side; tok.lane = li;
    tok._metricOwnerId = metricOwnerId; tok._metricSourceCard = metricSourceCard;
    if (source.side === "hero") {
      // RELATIVE placement (owner 2026-06-12): your summons enter just in FRONT of you
      // (meat-shield, the default) or just BEHIND you (player toggle `summonSide`).
      // Fractional depth slots the token between neighbors; the next moveDepth
      // normalization cleans the line back to integers.
      const d = source.depth ?? (laneLine(room, li)[0]?.depth ?? 0);
      tok.depth = d + (source.summonSide === "back" ? 0.5 : -0.5);
    }
    place(tok);
  }
  clog(room, "  ✦ " + logNm(source) + " summons " + count + "× " + (BODIES[op.body]?.name ?? op.body));
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
  const base = RAT_UNIT[s.bodyKey] ?? RAT_UNIT.rat;
  const u = { ...base, hp: s.ratUnitHp ?? base.hp };
  if (s.hp < 0) s.hp = 0;
  const n = Math.max(0, Math.ceil(s.hp / u.hp));
  s.ratCount = n;
  s.maxHp = Math.max(u.hp, n * u.hp);                 // ≥ one unit for HP-bar math; n=0 → splice removes it
  s.counters = Math.max(0, (n - 1) * u.bite);         // the other (n−1) units' bite, carried on the attack
  s.name = n > 1 ? n + " " + (s.bodyKey === "largeRat" ? "large rats" : "rats") : (BODIES[s.bodyKey]?.name ?? "Rat");
}

// Fire a body's passive for a given trigger ("hourglass" = its timer, "damaged" = on hit).
export function runPassive(room, combatant, trigger) {
  const passive = leveledPassives(combatant);
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
  const pas = leveledPassives(c);
  if (!pas) return;
  c.pcharge = c.pcharge || {};
  for (let pi = 0; pi < pas.length; pi++) {
    if (!pas[pi].every) continue;
    c.pcharge[pi] = (c.pcharge[pi] ?? 0) + 1;
    if (c.pcharge[pi] >= pas[pi].every * (c.cdMul ?? 1)) { c.pcharge[pi] = 0; resolveOps(room, c, pas[pi].ops, pas[pi].school || null, 0, pas[pi].kind || null); }
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
        const dealt = resolveOps(room, c, tm.ops, null, 0, tm.kind ?? null, tm.sourceCard ?? null) || 0;
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
  const pas = leveledPassives(c); if (!pas.length) return;
  c.pcharge = c.pcharge || {};
  for (let pi = 0; pi < pas.length; pi++) {
    if (!pas[pi].every) continue;
    c.pcharge[pi] = (c.pcharge[pi] ?? 0) + 1;
    if (c.pcharge[pi] >= pas[pi].every * (c.cdMul ?? 1)) { c.pcharge[pi] = 0; resolveOps(room, c, pas[pi].ops, pas[pi].school || null, 0, pas[pi].kind || null); }
  }
}

// Advance clock-passive `pi` by `amt`; each time it crosses `need`, fire its ops (with the passive's
// own school, so a "deal staff" passive scales with staff Power). Shared by moxie-spend AND damage.
function advancePassive(room, c, pi, p, amt, need) {
  c.pspend = c.pspend || {};
  c.pspend[pi] = (c.pspend[pi] ?? 0) + amt;
  while (c.pspend[pi] >= need) {
    c.pspend[pi] -= need;
    const ordinal = ((c._passiveTriggers ??= {})[pi] = ((c._passiveTriggers ?? {})[pi] ?? 0) + 1);
    // Weary Wageslave Specialty says the second trigger ALSO hits the lane.  The first implementation
    // replaced its normal front hit with the lane hit, silently deleting part of the base passive.
    const ops = ordinal % 2 === 0 && p.ops?.some((op) => op.alternateLane)
      ? p.ops.flatMap((op) => op.alternateLane
        ? [{ ...op, alternateLane: undefined }, { ...op, target: "lane", amount: op.alternateLane, alternateLane: undefined }]
        : [op])
      : p.ops;
    resolveOps(room, c, ops, p.school || null, 0, p.kind || null);
  }
}
// MOXIE-SPENT body passives (owner 2026-06-21):
//   {spend:N, school?}  — fires per N moxie spent (optionally only on that school's cards)
//   {spendOrHit:N}      — same clock is ALSO fed by damage taken (hitTriggerPassives) = the tank ramp
//   {every:N}           — legacy tick→moxie clock (need = round(N/10))
// `school` is the cast card's type (physical/magical) so a {spend, school} clock only counts its school.
export function spendTriggerPassives(room, c, spent, school = null) {
  const pas = leveledPassives(c);
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
  const pas = leveledPassives(c);
  if (!pas || !(dmg > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) {
    if (pas[pi].spendOrHit != null) advancePassive(room, c, pi, pas[pi], dmg, pas[pi].spendOrHit);
    else if (pas[pi].hit != null)   advancePassive(room, c, pi, pas[pi], dmg, pas[pi].hit);
  }
}

// PER-CARD-PLAYED body clocks (owner 2026-06-23 school-free set): {play:N} fires every N cards cast
// (Paid Piper summon, Crypto-Chimera lane chip, Weary Wageslave melee); {pairMR} fires once a melee
// AND a ranged card have both been played, then re-arms. Called once per card by playCard/foeCast with
// the card's triggerKind — "melee" / "ranged" / "both" / "none" (owner 2026-07-06: ranged =
// foe-affecting only; self/ally cards feed NEITHER half). Symmetric (players + foes). NOTE: no body wears pairMR
// after the 2026-06-28 Runeblade rework — the machinery stays for reuse (owner: flagged as unused).
export function playTriggerPassives(room, c, kind) {
  const pas = leveledPassives(c);
  if (!pas) return;
  for (let pi = 0; pi < pas.length; pi++) {
    const p = pas[pi];
    if (p.play != null) advancePassive(room, c, pi, p, 1, p.play);
    else if (p.pairMR) {
      c.pair = c.pair || {};
      if (kind === "ranged" || kind === "both") c.pair.ranged = true; // a dual-kind card sets BOTH halves at once
      if (kind === "melee"  || kind === "both") c.pair.melee  = true;
      if (c.pair.melee && c.pair.ranged) { c.pair.melee = c.pair.ranged = false; resolveOps(room, c, p.ops, p.school || null); }
    }
  }
}

// SCHOOL-SPECIFIC PER-DAMAGE-DEALT body clocks: {dealtMelee:N}/{dealtRanged:N} accumulate the
// damage a wearer's melee/ranged cards land and fire every N. Fed by playCard/foeCast with the
// card's ranged-ness + total landed. Symmetric; retained for bodies that need school-specific clocks.
export function dealtTriggerPassives(room, c, dmg, ranged, both = false) {
  const pas = leveledPassives(c);
  if (!pas || !(dmg > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) {
    const p = pas[pi];
    // `both`: the damage counts as melee AND ranged → feeds BOTH clocks
    if ((both || ranged)  && p.dealtRanged != null) advancePassive(room, c, pi, p, dmg, p.dealtRanged);
    if ((both || !ranged) && p.dealtMelee  != null) advancePassive(room, c, pi, p, dmg, p.dealtMelee);
  }
}

// Generic per-damage clock (Vengeful Vampire): each landed hit counts, including delayed effects,
// summon attacks, and body passives.
function genericDealtTrigger(room, c, dmg) {
  const pas = leveledPassives(c);
  if (!pas || !(dmg > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) {
    const p = pas[pi];
    if (p.dealt != null) advancePassive(room, c, pi, p, dmg, p.dealt);
  }
}

// Mid-Management Medusa poisons the exact surviving target of every landed damage instance.
function poisonDamageTarget(room, source, target, landed) {
  const n = leveledBody(source)?.poisonOnDamage ?? 0;
  if (!target || !(landed > 0) || !(target.hp > 0) || !(n > 0)) return;
  target.poison = (target.poison ?? 0) + n;
  const sourceCard = source?._metricCardKey ?? source?._vfxCastKey;
  if (sourceCard) target.poisonSourceCard = sourceCard;
  target.poisonSource = source;
  clog(room, "  ☠ " + logNm(source) + " poisons " + logNm(target) + " by " + n);
}

// Bookie Bonelord listens to any defeat in its lane, regardless of which side fell.
export function defeatTriggerPassives(room, laneIdx) {
  if (!room || laneIdx == null) return;
  const living = [
    ...laneHeroes(room, laneIdx),
    ...(room.allies?.[laneIdx] ?? []).filter((c) => (c?.hp ?? 0) > 0),
    ...(room.lanes?.[laneIdx] ?? []).filter((c) => (c?.hp ?? 0) > 0),
  ];
  if (bossAlive(room) && (room.boss.lane | 0) === (laneIdx | 0)) living.push(room.boss);
  for (const c of living) {
    const pas = leveledPassives(c);
    if (pas) for (const p of pas) if (p.onDefeat) resolveOps(room, c, p.ops, p.school || null);
  }
}

// PER-MOXIE-GAINED body clocks: {gain:N} fires every N moxie the wearer gains
// (Debt Dragon → +3 melee & ranged). Fed from the moxie-gain sites with the delta.
export function gainTriggerPassives(room, c, gained) {
  const pas = leveledPassives(c);
  if (!pas || !(gained > 0)) return;
  for (let pi = 0; pi < pas.length; pi++) if (pas[pi].gain != null) advancePassive(room, c, pi, pas[pi], gained, pas[pi].gain);
}

// PER-CARD EVENT triggers: onDeal, onPlayNonDmg (Audit Angel), onPlayRanged, and onPlayMelee
// (Rent-Seeking Runeblade). Once per card, symmetric (players + foes). dealt = damage this
// card LANDED; isDmg = the card carries a damaging op. `kind` is the card's triggerKind — "melee" /
// "ranged" / "both" / "none": ranged = FOE-AFFECTING cards only (owner 2026-07-06 — "a projectile, a spell,
// not armor"); self/ally cards (shields, heals, buffs, ramps, summons) fire NEITHER onPlayRanged
// nor onPlayMelee. onPlayNonDmg keys off isDmg, so they still feed Audit Angel.
export function cardEventPassives(room, c, dealt, kind, isDmg) {
  const pas = leveledPassives(c);
  if (!pas) return;
  for (const p of pas) {
    if (p.onDeal && dealt > 0) resolveOps(room, c, p.ops, p.school || null);
    if (p.onPlayNonDmg && !isDmg)  resolveOps(room, c, p.ops, p.school || null);
    if (p.onPlayRanged && (kind === "ranged" || kind === "both")) resolveOps(room, c, p.ops, p.school || null); // dual-kind cards fire melee AND ranged
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
  const base = BODIES[c.bodyKey] ?? {};
  const m = masteryRank(c), s = specialtyRank(c);
  const cs = base.combatStart ? { ...base.combatStart } : {};
  c._firstCardPlayed = false;
  c._firstRangedPlayed = false;
  c.firstCardDiscount = 0;
  c.firstRangedRefund = 0;
  c.freeCardOutput = 0;
  c.discountedMeleeDamage = 0;
  c.doubleNextOutput = 0;
  c.expensiveCardShield = 0;
  c.shieldBreakDamage = 0;
  c._shieldBreakRewarded = false;
  c.cycleLossShield = 0;
  if (c.bodyKey === "compound") { c.doubleNextOutput = m ? 1 : 0; if (s) cs.moxie = 1 + s; }
  if (c.bodyKey === "discountDuel") { cs.counters = m ? 2 : 1; c.firstCardDiscount = s; }
  if (c.bodyKey === "ratBaron") c.firstRangedRefund = s;
  if (c.bodyKey === "juggernaut") { cs.shieldMaxHpMult = m ? 1.5 : 1; c.shieldBreakDamage = s; }
  if (c.bodyKey === "pyramidHead") c.freeCardOutput = s;
  if (c.bodyKey === "pennyPixie") c.discountedMeleeDamage = s;
  if (c.bodyKey === "econElemental") {
    cs.cycle = { ...(base.combatStart?.cycle ?? {}), seq: [m ? 4 : 3, -1] };
    c.cycleLossShield = s ? 1 + s : 0;
  }
  if (c.bodyKey === "warewolf") { c.warewolfHumanDR = 1 + s; c.warewolfMelee = m ? 4 : 3; }
  if (c.bodyKey === "killionaire") { cs.moxie = m ? 5 : 3; c.firstCardDiscount = s ? 1 + s : 0; }
  if (c.bodyKey === "bonelord" && s) cs.counters = (cs.counters ?? 0) + s;
  if (c.bodyKey === "neptune") c.expensiveCardShield = s ? 1 + s : 0;
  if (c.bodyKey === "affluenceAnubis" && cs.escalatingRats) cs.escalatingRats = {
    ...cs.escalatingRats, period: m ? 50 : (cs.escalatingRats.period ?? 60), extra: s,
  };
  if (cs.counters)  c.counters = (c.counters ?? 0) + cs.counters;
  if (cs.shield)    c.shield = (c.shield ?? 0) + cs.shield + shieldPlus(c);
  if (cs.shieldMaxHp) c.shield = (c.shield ?? 0) + Math.round((c.maxHp ?? 0) * (cs.shieldMaxHpMult ?? 1)) + shieldPlus(c);
  if (cs.doubleNext) c.doubleNext = true;
  if (cs.moxie != null) c.moxie = cs.moxie;   // Killionaire (owner 2026-06-27): start each combat with N moxie
  if (cs.cycle) (c.regens ??= []).push({ kind: "cycle", seq: cs.cycle.seq, period: cs.cycle.period ?? 60, charge: 0, idx: 0 }); // Economy Elemental (owner 2026-07-06): alternating moxie
  if (cs.escalatingRats) (c.regens ??= []).push({ kind: "escalatingRats", period: cs.escalatingRats.period ?? 60, charge: 0, waves: 0, extra: cs.escalatingRats.extra ?? 0 });
  // WAREWOLF (owner 2026-07-11): open in HUMAN form — −3 melee AND ranged, +1 DR — then install the 6s
  // flip clock as a `regens` record (the Economy Elemental machinery; ticked by tickRegens, pure time).
  if (cs.warewolf) {
    c.wform = "human";
    c.meleeBonus  = (c.meleeBonus  ?? 0) - 3;   // human: −3 melee (owner-stated)
    c.rangedBonus = (c.rangedBonus ?? 0) - 3;   // human: −3 ranged (owner-stated 2026-07-11)
    c.dmgReduce   = c.warewolfHumanDR ?? 1;
    (c.regens ??= []).push({ kind: "warewolf", period: cs.warewolf.period ?? 60, charge: 0 });
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
export function addBuff(c, kind, amount, dur, sourceCard = null) {
  const d = Math.max(1, dur | 0);
  (c.buffs ??= []).push({ kind, amount: amount ?? 0, left: d, dur: d, ...(sourceCard ? { sourceCard } : {}) });
}
function depressionSting(room, source, target, laneIdx = source?.lane ?? 0) {
  const sting = source?.bodyKey === "depressionDemon" ? specialtyRank(source) : 0;
  if (!(sting > 0) || !(target?.hp > 0)) return;
  if (source.side === "hero") damageEnemy(room, target.lane ?? laneIdx, target, sting, source,
    { cause: "Depression Demon specialty" });
  else if (room.players?.has?.(target.id)) damagePlayer(room, target, sting,
    { source, cause: "Depression Demon specialty" });
  else hurtAllyToken(room, target.lane ?? laneIdx, target, sting, source,
    { cause: "Depression Demon specialty" });
}
function addDebuff(room, source, target, kind, amount, dur, sourceCard = null, laneIdx = source?.lane ?? 0) {
  if (!target) return;
  addBuff(target, kind, amount, dur, sourceCard);
  depressionSting(room, source, target, laneIdx);
}
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
  const metricHpBefore = c.hp ?? 0, metricShieldBefore = c.shield ?? 0;
  const left = absorbShield(c, amount);              // its own shield eats first, exactly like any hit
  const recordMetrics = () => { const pm = _metricPlayer(room, c); if (pm) {
    pm.incomingDamage += landed;
    pm.hpDamage += Math.max(0, metricHpBefore - (c.hp ?? 0));
    recordShieldAbsorbMetric(room, c, landed, left, metricShieldBefore, c.shield ?? 0);
  } };
  if (left > 0) {
    c.hp = (c.hp ?? 0) - left;
    if (c.hp <= 0) {                                 // a self-hit that KILLS: clean up like the normal death paths, fire NO on-damaged trigger
      c.hp = 0;
      const li = c.lane | 0;
      if (room?.players?.has?.(c.id)) { c.alive = false; if (room) { clog(room, "  ☠ " + logNm(c) + " goes DOWN (self-damage)"); (room.defeated ??= { hero: 0, foe: 0 }).hero++; } }
      else if (room) {                               // a foe or ally token: splice from its lane
        const arr = c.side === "foe" ? room.lanes?.[li] : room.allies?.[li];
        const i = arr ? arr.indexOf(c) : -1; if (i >= 0) arr.splice(i, 1);
        if (c === room.boss) room.boss = null;
        (room.defeated ??= { hero: 0, foe: 0 })[c.side === "foe" ? "foe" : "hero"]++;
      }
      if (room) defeatTriggerPassives(room, li);
      recordMetrics();
      return landed;
    }
  }
  recordMetrics();
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
  if (hasBuff(c, "stasis")) return;   // ZA WARUDO (W2-C): nothing POSITIVE triggers — the regen engine (heals/shields/buffs/bonus-ramps/moxie-over-time) is the beneficial-passive path; damaging passives are unaffected (suppression point 3/3)
  for (const g of c.regens) {
    if (++g.charge < g.period * (c.cdMul ?? 1)) continue;
    g.charge = 0;
    if (g.kind === "heal") { applyHeal(c, g.amount, false, room, c, g.sourceCard); healedTrigger(null, c, g.amount); }
    else if (g.kind === "shield") { const gain = g.amount + shieldPlus(c); c.shield = (c.shield ?? 0) + gain; recordShieldGrantMetric(room, c, c, gain, g.sourceCard); }
    // ECONOMY ELEMENTAL (owner 2026-07-06): alternating moxie cycle — +4, then −2, every period
    else if (g.kind === "cycle") {
      const d = (g.seq ?? [0])[(g.idx ?? 0) % (g.seq?.length || 1)];
      g.idx = (g.idx ?? 0) + 1;
      c.moxie = Math.max(0, Math.min(MOXIE_CAP, (c.moxie ?? 0) + d));
      if (d < 0 && (c.cycleLossShield ?? 0) > 0) {
        const gain = c.cycleLossShield + shieldPlus(c);
        c.shield = (c.shield ?? 0) + gain;
        recordShieldGrantMetric(room, c, c, gain, null);
      }
    }
    // MOXIE-OVER-TIME (Moxie Pool / Cool Shoes, owner 2026-06-25): bank moxie on a clock, capped.
    else if (g.kind === "moxie") c.moxie = Math.min(MOXIE_CAP, (c.moxie ?? 0) + g.amount);
    // RAMP-OVER-TIME (Demon Form / Sage Mode): the 🗡/🎯 type-specific bonus climbs each period.
    else if (g.kind === "meleeBonus") c.meleeBonus = (c.meleeBonus ?? 0) + g.amount;
    else if (g.kind === "rangedBonus") c.rangedBonus = (c.rangedBonus ?? 0) + g.amount;
    else if (g.kind === "escalatingRats") {
      g.waves = (g.waves ?? 0) + 1;
      if (room) summonBodies(room, c, { do: "summon", body: "rat", count: 1 + g.waves + (g.extra ?? 0) });
    }
    // BERSERKER ARMOR (owner 2026-06-25): each period grant +1 melee bonus AND +1 shield, then take
    // `amount` self-damage (its own +shield typically eats it — a self-stoking ramp). Symmetric:
    // tickRegens runs on any combatant. The self-hit routes through selfDamage (owner 2026-07-09) so it
    // fires the on-damaged triggers (Jesterplate/Blood To Iron/Fat Cat/bruiser ramps/Atlas) like any hit
    // — shield-absorbed still counts. Its own +1 shield usually eats it, so it's a trigger with no HP cost.
    else if (g.kind === "berserk") {
      c.meleeBonus = (c.meleeBonus ?? 0) + (g.melee ?? 1);
      const gain = (g.shield ?? 1) + shieldPlus(c);
      c.shield = (c.shield ?? 0) + gain;
      recordShieldGrantMetric(room, c, c, gain, g.sourceCard);
      selfDamage(room, c, g.amount ?? 1);
    }
    // WAREWOLF (owner 2026-07-11): flip HUMAN <-> WAREWOLF on the clock (installed by applyCombatStart).
    else if (g.kind === "warewolf") warewolfFlip(room, c);
  }
}
// WAREWOLF FORM FLIP (owner 2026-07-11): toggle HUMAN <-> WAREWOLF. HUMAN = −3 melee & ranged, +1 DR;
// WAREWOLF = +3 melee (a +6 swing), ranged back to NORMAL (a +3 swing off the −3), NO DR. Applied as
// DELTAS to meleeBonus/rangedBonus so it composes with any other bonus source; dmgReduce is set
// absolutely (the Warewolf is the only per-combatant DR user). Symmetric — runs on players AND foes.
function warewolfFlip(room, c) {
  const toWolf = c.wform !== "wolf";
  c.wform = toWolf ? "wolf" : "human";
  const wolfMelee = c.warewolfMelee ?? 3;
  c.meleeBonus  = (c.meleeBonus  ?? 0) + (toWolf ? wolfMelee + 3 : -(wolfMelee + 3));
  c.rangedBonus = (c.rangedBonus ?? 0) + (toWolf ? 3 : -3);   // −3 <-> 0 (normal)
  c.dmgReduce   = toWolf ? 0 : (c.warewolfHumanDR ?? 1);
  if (room) clog(room, "  🌕 " + logNm(c) + " → " + (toWolf
    ? `WAREWOLF (+${wolfMelee} melee, no DR)`
    : `HUMAN (−3 melee/ranged, ${c.warewolfHumanDR ?? 1} DR)`));
}
// BLOOD TO IRON (owner card 2026-06-24): for `left` ticks, damage the wearer takes is STORED (it still
// lands); when the window closes, that stored total becomes shield. The store hook lives in
// damagePlayer/damageEnemy; this runs the countdown + payout. Per-fight, symmetric.
export function tickBloodToIron(c, room = null) {
  const b = c?.bloodToIron;
  if (!b) return;
  if (--b.left > 0) return;
  const gain = b.stored + (b.stored > 0 ? shieldPlus(c) : 0);
  c.shield = (c.shield ?? 0) + gain;
  recordShieldGrantMetric(room, c, c, gain, b.sourceCard);
  c.bloodToIron = null;
}
// PET LEECH (owner 2026-07-11): drain records living ON the carrier — every `period` ticks the
// carrier takes `amount` (through the normal damage path, so death + lane-removal are handled) and
// the leech's CASTER heals `amount` (while it's still up). Same-carrier leeches STACK (owner-stated:
// two leeches = 2 dmg / 2 heal per tick), each on its own clock; a record dies with its carrier
// (it lives on the spliced entity) and players' clear at beginCombat (fight end). Symmetric — a
// foe-cast leech rides a HERO the same way. FLAG: the heal is flat `amount` (owner's "you heal 1"),
// not landed-damage lifesteal — a fully-absorbed drain tick still heals the caster.
export function tickLeeches(room, c, laneIdx) {
  if (!room || !c?.leeches?.length) return;
  for (const L of [...c.leeches]) {
    if (++L.charge < L.period * (c.cdMul ?? 1)) continue;
    L.charge = 0;
    const wasBoss = c === room.boss;
    const s = L.src;
    const cause = KIT[L.sourceCard]?.name ?? "Pet Leech";
    if (room.players?.has?.(c.id)) damagePlayer(room, c, L.amount, { source: s, cause });
    else if (c.side === "hero") hurtAllyToken(room, laneIdx ?? c.lane ?? 0, c, L.amount, null, { source: s, cause });          // a friendly summon carrier
    else damageEnemy(room, (c === room.boss ? (c.lane | 0) : (laneIdx ?? c.lane ?? 0)), c, L.amount, null, { source: s, cause }); // a foe (or the back-line boss)
    if (s && s.alive !== false && (s.hp ?? 0) > 0) { applyHeal(s, L.amount, false, room, s, L.sourceCard); healedTrigger(room, s, L.amount); }
    // A lethal drain removes the carrier. Remaining simultaneously-due records die WITH it; do not
    // damage/count the corpse again or grant extra heals from leeches that never got another tick.
    if ((c.hp ?? 0) <= 0 || c.alive === false || (wasBoss && room.boss !== c)) break;
  }
}
// POISON (owner 2026-06-27): a stacking DoT — `c.poison` damage every POISON_PERIOD ticks, routed through
// the normal damage path so death + lane-removal are handled. Per-fight, symmetric. laneIdx = the entity's lane.
export function tickPoison(room, c, laneIdx) {
  if (!room || !(c?.poison > 0)) return;
  if ((c.poisonClock = (c.poisonClock ?? 0) + 1) < POISON_PERIOD) return;
  c.poisonClock = 0;
  const dmg = c.poison;
  const source = c.poisonSource ?? null, wasAlive = (c.hp ?? 0) > 0;
  if (room.players?.has?.(c.id)) damagePlayer(room, c, dmg, { source, cause: "Poison" });
  else if (c.side === "hero") hurtAllyToken(room, laneIdx ?? c.lane ?? 0, c, dmg, source, { cause: "Poison" });
  else damageEnemy(room, (c === room.boss ? (c.lane | 0) : (laneIdx ?? c.lane ?? 0)), c, dmg, source, { cause: "Poison" });
  if (wasAlive && !(c.hp > 0) && source?.bodyKey === "medusa" && specialtyRank(source) > 0) {
    const want = 1 + specialtyRank(source), before = source.moxie ?? 0;
    source.moxie = Math.min(MOXIE_CAP, before + want);
    gainTriggerPassives(room, source, source.moxie - before);
  }
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
      for (const p of room.players.values()) damagePlayer(room, p, t.amount ?? 1, { cause: "Acid Rain" });
      for (let li = 0; li < room.allies.length; li++) for (const al of [...room.allies[li]]) {
        const lane = room.allies[li];
        const hit = t.amount ?? 1;
        const hpBefore = Math.max(0, al.hp ?? 0), shieldBefore = Math.max(0, al.shield ?? 0);
        const left = absorbShield(al, hit);
        if (left > 0) { if ((al.hp -= left) <= 0) { const i = lane.indexOf(al); if (i >= 0) lane.splice(i, 1); (room.defeated ??= { hero: 0, foe: 0 }).hero++; defeatTriggerPassives(room, li); } else if (al.ratStack) syncRatStack(al); }
        const event = recordDamageEvent(room, al, hit, hpBefore, shieldBefore,
          { cause: "Acid Rain", requested: hit });
        logDamageEvent(room, event, "✖");
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

// Resolve a source's ALLY-TARGET id to the live friendly it names: a seated PLAYER (room.players) OR a
// friendly SUMMON token (owner 2026-07-10 ruling "summons should be targetable" — heal-aimable like a
// teammate). Side-aware for full player/foe symmetry — a hero resolves a hero-side ally (room.allies), a
// foe a foe-side one (room.lanes). Returns null if the id names nobody live → the caller falls back to
// lowestHpFriendly (the "dead/gone → fallback" contract setAllyTarget documents). Summon ids are "f"+seq,
// distinct from player ids, so the lookup is unambiguous; a dead summon (spliced out) simply misses.
function allyTargetOf(room, source) {
  const id = source.allyTargetId;
  if (id == null) return null;
  const p = room.players?.get(id);
  if (p) return p;
  const pool = source.side === "foe" ? room.lanes : room.allies;
  for (const lane of pool ?? []) { const t = lane?.find((x) => x && x.id === id); if (t) return t; }
  return null;
}
// A friendly is "up" (a valid heal/buff recipient) when it's a live player (players carry `.alive`) or a
// living summon token (tokens carry only `.hp`; dead ones are spliced out). Reads BOTH uniformly, so the
// ally-slot ops treat a pinned summon exactly like a pinned teammate.
const allyUp = (c) => !!c && c.alive !== false && (c.hp ?? 0) > 0;

// WANDERING CASTLE (owner 2026-07-06): every shield he gains is +1 bigger — applied at the main
// shield-gain sites (shield op, regen shield, berserk, Blood To Iron payout, combatStart, costly-cast, wards).
const shieldPlus = (c) => leveledBody(c)?.shieldGainBonus ?? 0;
// OVERHEAL (owner 2026-07-09): apply a heal, capping HP at maxHp; with OPT-IN `overheal`, the EXCESS
// past max converts to shield (honoring shieldPlus so a warded body's spill still grows). Stockbroking
// Sphinx's self-heal is the only caller (via its lane-deal `lifesteal`+`overheal` op). NOT global —
// plain heals never spill. FLAG (owner): he defined overheal generally; ask GLOBAL vs this-card only.
// Symmetric (player- or foe-owned). Returns the amount that filled HP (0 if fully overhealed).
function applyHeal(c, amt, overheal = false, room = null, source = c, sourceCardKey = null, spillBonus = 0) {
  if (!c || !(amt > 0)) return 0;
  const before = c.hp ?? 0, max = c.maxHp ?? before;
  const filled = Math.min(max, before + amt) - before;      // what actually went into HP
  c.hp = before + filled;
  const bishopRank = c.bodyKey === "bribedBishop" ? specialtyRank(c) : 0;
  const spill = (overheal || bishopRank) ? Math.max(0, amt - filled) : 0;
  if (spill > 0) {
    const gain = spill + shieldPlus(c) + Math.max(spillBonus, bishopRank ? bishopRank - 1 : 0);
    c.shield = (c.shield ?? 0) + gain;
    recordShieldGrantMetric(room, source, c, gain, sourceCardKey);
  }
  recordHealMetric(room, source, c, amt, filled, spill, sourceCardKey);
  return filled;
}
// BRIBED BISHOP: healing landing on the body grants generic damage, once per heal event.
function healedTrigger(room, t, n) {
  let b = (n > 0 ? BODIES[t?.bodyKey]?.onHealedDamage : 0) ?? 0;
  if (b && masteryRank(t)) b++;
  if (b) { t.counters = (t.counters ?? 0) + b; if (room) clog(room, "  ✦ " + logNm(t) + " damage +" + b + " (healed)"); }
}
// GIANT'S BELT (owner nerf 2026-07-10: "only increase by your base health, not double it each time").
// One-time, NON-compounding +base-health for THIS FIGHT, then heal the gained amount. "Base health" =
// the body's max HP the instant the belt first lands. The belt is the ONLY temporary maxHp buff in the
// engine, so that snapshot IS the base/unbuffed max HP (and it tracks a boss/elite/god body, which a
// BODIES-table lookup would get wrong). `_giantBase` doubles as the applied-flag: a SECOND belt cast in
// the same fight is a no-op (guard) so it can NEVER stack/compound ("not double it EACH time"). The
// bonus is UNDONE at ROOM CLEAR (the won-block restore below) so the snapshot never outlives its fight
// into a between-room level-up/body-swap (the 2026-07-10 C-fix). Sole implementation for BOTH the hero
// (`case`) and foe (`else-if`) giantBelt handlers — one function keeps the pair symmetric by construction.
// FLAG (owner): "base health" read as the PRE-belt maxHp snapshot (before the belt and before any future
//   temporary maxHp buff) — his to redefine.
// FLAG (owner): additive magnitude = 1× base health (an unbuffed body still lands at 2× base — the same
//   total as the old first-cast double — but it can no longer compound); `add` is his to re-tune.
function applyGiantBelt(room, source) {
  if (!source || source._giantBase) return;          // already belted this fight → NO stack ("not double it each time")
  const base = source.maxHp ?? 0;                     // base health = the current (pre-belt) max HP
  const add = base;                                   // FLAG (owner): +1× base health per belt; his to re-tune
  source._giantBase = base;                           // snapshot to restore at room-clear + serves as the applied-flag
  source.maxHp = base + add;                          // additive by base health (NOT a running double)
  applyHeal(source, add, false, room, source, source._metricCardKey); // heal the gained amount
  clog(room, "  ✦ " + logNm(source) + " GROWS +" + add + " max HP (base health, once)");
}
// MODAL PICK (owner 2026-07-09): a card whose +bonus can be melee OR ranged is decided AT PLAY.
// A PLAYER sends the choice as the play's `pick` ("melee"/"ranged" → source._pick). A FOE/bot has no
// reticle → it picks INTELLIGENTLY (owner 2026-07-11 Sharpened Edges ruling).
// FLAG HEURISTIC (mechanical — owner named no formula, his to re-tune): score each kind as
//   (# cards of that kind in its own kit: a foe's queue, a bot's hand+deck) + its CURRENT kind-specific
//   bonus (meleeBonus/rangedBonus — a stacked ramp keeps feeding the same kind); higher score wins.
//   Tie (incl. an empty/unknown kit) → its BODY archetype (ranged archetype → ranged, else melee —
//   the prior affinity default, so flex/unknown still lands melee). Never crashes on a bad/absent pick.
const modalKind = (source) => {
  const p = source?._pick;
  if (p === "melee" || p === "ranged") return p;                 // player choice (or an explicit set)
  const cards = source?.queue ?? [...(source?.hand ?? []), ...(source?.deck ?? [])];
  let m = source?.meleeBonus ?? 0, g = source?.rangedBonus ?? 0;
  for (const c of cards) {
    const k = cardKind(c?.key);
    if (k === "melee" || k === "both") m++;
    if (k === "ranged" || k === "both") g++;
  }
  if (m !== g) return m > g ? "melee" : "ranged";                // the kind its own kit/bonuses favor
  return foeArchetype(source?.bodyKey) === "ranged" ? "ranged" : "melee"; // tie → body affinity; flex/unknown → melee (FLAG)
};
// `boost` (owner 2026-06-21): a body's effectBoost adds N to a qualifying card's effect — applied to
// every amount-bearing op of that card. `op.power` lets a passive's deal/heal scale with a named
// school's Power even when the call has no school (e.g. a tank's "deal my staff to the lane" clock).
export function resolveOps(room, source, ops, school = null, boost = 0, kind = null, sourceCardKey = null) {
  const priorDamageContext = room._damageContext;
  const sourceBodyName = BODIES[source?.bodyKey]?.name ?? source?.bodyKey ?? source?.name ?? "Unknown body";
  room._damageContext = { source, type: sourceCardKey ? "card" : "passive", key: sourceCardKey,
    name: sourceCardKey ? (KIT[sourceCardKey]?.name ?? sourceCardKey) : `${sourceBodyName} passive` };
  let dealt = 0;                          // damage THIS card has dealt so far (shield {ofDealt} reads it)
  let lastHit = 0;                        // per-hit damage of the most recent deal op — legacy delay {ofDealt} reads it
  let lastHitTargets = [];                // exact target + post-mitigation damage for a following per-target sap (Blizzard)
  for (const op of ops) {
    const amt = (op.amount ?? 0) + (op.amount != null ? boost : 0);
    const li = source.lane, lane = room.lanes[li];

    // Opposing-side debuffs are genuinely symmetric. Keep this before the foe-only resolver below:
    // that branch deliberately `continue`s after each op, which previously made an enemy-worn Medusa's
    // onPlayRanged poison (and any foe poison/slow/weakness op) a silent no-op.
    if (op.do === "poison" || op.do === "slow" || op.do === "weakness" || op.do === "weakenLane") {
      const opp = source.side === "foe" ? laneLine(room, li) : playerLaneFoes(room, li);
      const dmul = leveledBody(source)?.debuffMult ?? 1;
      const apply = (t) => { if (!t) return;
        if (op.do === "poison") {
          const gain = amt || 1;
          t.poison = (t.poison ?? 0) + gain;
          if (sourceCardKey) t.poisonSourceCard = sourceCardKey;
          t.poisonSource = source;
          clog(room, "  ☠ " + logNm(source) + " applies " + gain + " poison to " + logNm(t) + " (" + t.poison + " total)");
        }
        else if (op.do === "slow")     addDebuff(room, source, t, "slow", 0, (op.dur ?? 60) * dmul, sourceCardKey, li);
        else if (op.do === "weakness") addDebuff(room, source, t, "weakness", 0, (op.dur ?? 60) * dmul, sourceCardKey, li);
        else                            t.counters = (t.counters ?? 0) - (amt || 1);
        if (op.do === "poison" || op.do === "weakenLane") depressionSting(room, source, t, li);
      };
      if (op.target === "lane" || op.do === "weakenLane") opp.forEach(apply);
      else apply(source.side === "foe" ? opp[0] : aimedFoe(room, source, op.target ?? "pick")?.foe);
      continue;
    }

    // Foes are simpler: damage lands on the hero side of their lane; summon adds to it.
    if (source.side === "foe") {
      const dm = (x) => Math.round(x * (source.dmgMul ?? 1));                     // Aggressive room: ×1.2 outgoing
      // school-tagged items scale with the foe's sword/staff Power (symmetry); school-less passives
      // keep their flat amount (+ counters, for ramping bosses). `target:"lane"` AoE hits the whole
      // hero side of the lane (mirrors a player's lane deal hitting every foe in a lane).
      if (op.do === "deal") {
        lastHitTargets = [];
        const collectHit = (target, landed) => { if (target && landed > 0) lastHitTargets.push({ target, landed }); };
        const hit = foeDealHit(room, source, op, op.power || school, kind); // Gang Up + Power×mult + melee/ranged bonus + the ≥1 floor
        lastHit = hit;                     // legacy delay {ofDealt} drains this many moxie per target
        // Legacy lane-upgrade support plus Moonlight's front hit + additional lane beam.
        const laneUp = op.laneWhenDual && meleeBonusOf(source) >= op.laneWhenDual && rangedBonusOf(source) >= op.laneWhenDual;
        const beamUp = op.beamWhenDual && meleeBonusOf(source) >= op.beamWhenDual && rangedBonusOf(source) >= op.beamWhenDual;
        const tgt = laneUp ? "lane" : op.target;
        // owner 2026-07-09: ANY bothKinds LANE strike (Moonlight's lane form, Rainblow's delayed timer strike)
        // is a melee AND ranged attack → flag it so the play-trigger site fires BOTH kinds (symmetric w/ heroes)
        if (op.bothKinds && tgt === "lane") source._bothKindsPlay = true;
        let landedNow = 0;
        // "pickLane" (Black Hole, owner 2026-07-07): a foe has no reticle, so its picked lane is its
        // OWN lane — the same fallback every foe "pick" takes — and the strike is the lane-AoE mirror.
        // op.frontExtra (Whip, owner 2026-07-11): the lane front takes +N on top — threaded symmetric.
        if (tgt === "lane" || tgt === "pickLane") { recordCastFx(room, source, sourceCardKey, li, [...heroesInLane(room, li), ...(room.allies?.[li] ?? [])]); const laneLanded = foeHitLaneAll(room, li, hit, source, op.frontExtra ?? 0, { onHit: collectHit }); landedNow = hit;
          if (op.lifesteal && laneLanded > 0) { applyHeal(source, laneLanded, op.overheal, room, source, sourceCardKey); healedTrigger(room, source, laneLanded); } } // foe-owned Sphinx: steal the TOTAL lane damage (overheal → shield)
        else if (tgt === "board") {                                              // BLACK HOLE (foe cast, owner 2026-07-10): every hero + ally summon in EVERY lane
          let boardLanded = 0;
          for (let l = 0; l < room.laneCount; l++) boardLanded += foeHitLaneAll(room, l, hit, source, 0, { onHit: collectHit });
          landedNow = hit;
          if (op.lifesteal && boardLanded > 0) { applyHeal(source, boardLanded, op.overheal, room, source, sourceCardKey); healedTrigger(room, source, boardLanded); } }
        else if (tgt === "front2") { foeHitFront2(room, li, hit, source, { onHit: collectHit }); landedNow = hit; }
        else if (foeOpSnipes(op)) {                                             // RANGED: snipe the weakest player cross-lane; after the party falls, finish surviving hero summons
          const visualTarget = foeRangedTarget(room, li);
          recordCastFx(room, source, sourceCardKey, visualTarget?.lane ?? li, visualTarget);
          landedNow = foeHitRanged(room, hit, source, { onHit: collectHit });
          if (op.lifesteal && landedNow > 0) { applyHeal(source, landedNow, false, room, source, sourceCardKey); healedTrigger(room, source, landedNow); } // Darkness
        }
        else {                                                                  // MELEE front (breach-redirect to the nearest defended lane)
          let visualLane = li, visualLine = laneLine(room, visualLane);
          if (!visualLine.length) { const redirected = nearestDefendedLane(room, visualLane); if (redirected >= 0) { visualLane = redirected; visualLine = laneLine(room, visualLane); } }
          recordCastFx(room, source, sourceCardKey, visualLane, visualLine[0] ?? null);
          landedNow = foeHitLane(room, li, hit, source, true, { pierce: op.pierce === true, noReact: op.noReact === true, onHit: collectHit }); // PIERCE (MOD-3) + NO-REACT (Butterfly Knife, owner 2026-07-11): a foe's copy bypasses defenses AND fires no victim reaction, symmetric with the player side
          if (op.lifesteal && landedNow > 0) { applyHeal(source, landedNow, false, room, source, sourceCardKey); healedTrigger(room, source, landedNow); } // Darkness
        }
        if (beamUp) {
          source._bothKindsPlay = true;
          landedNow += foeHitLaneAll(room, li, hit, source, 0, { onHit: collectHit });
        }
        dealt += landedNow;
        if (op.moxieFromDealt && landedNow > 0) source.moxie = Math.min(MOXIE_CAP, (source.moxie ?? 0) + landedNow); // Treasure Blade (symmetric)
        if (op.shieldFromDealt && landedNow > 0) { const sg = landedNow + shieldPlus(source); source.shield = (source.shield ?? 0) + sg; clog(room, "  ✦ " + logNm(source) + " +" + sg + " shield"); } // JAW (foe-owned), symmetric with the player side. NOTE: foe credits the gross landedNow (like foe-side lifesteal); `capLanded` is applied on the PLAYER side only — Jaw is PLAYER_POOL-only, so a foe never holds it.
      }
      else if (op.do === "schoolStrike") { foeHitLane(room, li, dm(powerFor(source, op.school)), source); fireSchoolTrigger(room, source, op.school); }
      else if (op.do === "dealEachLane") {                                       // boss: chip every lane at once (no breach — an empty lane just hits nobody)
        const each = dm(amt + (source.counters ?? 0));                          // amount 0 → pure counter-scaled (Hydra)
        if (each > 0) for (let l = 0; l < room.laneCount; l++) foeHitLane(room, l, each, source, false);
      }
      else if (op.do === "attack") foeHitLane(room, li, dm(effAtk(source)), source); // strike for its attack
      else if (op.do === "healAttack") applyHeal(source, effAtk(source), false, room, source, sourceCardKey);
      else if (op.do === "summon" || op.do === "summonArmed") summonBodies(room, source, op);
      else if (op.do === "delay") {                  // legacy foe stall: drain the HEROES' moxie
        const d = op.ofDealt ? lastHit : amt;        // ofDealt = drain equal to the preceding resolved hit
        if (op.target === "lane") {
          // lane-wide legacy drain: hits every hero and ally-summon in the foe's lane
          for (const h of heroesInLane(room, li)) drainClocks(h, d);
          for (const al of room.allies?.[li] ?? []) drainClocks(al, d);
        } else {
          // single-target drain (Ice target:"pick"): foes have no reticle, so "pick" resolves
          // to the front of the lane line — same entity the preceding deal op hits.
          const front = laneLine(room, li)[0];
          if (front) drainClocks(front, d);
        }
      }
      else if (op.do === "buff") addBuff(source, op.buff, op.amount, op.dur, sourceCardKey);   // a foe buffs itself, same rules
      else if (op.do === "timeStop") room.freezeHeroes = Math.max(room.freezeHeroes ?? 0, op.dur ?? 30);
      else if (op.do === "healSelf" || op.do === "heal") { const h = amt + (op.power ? powerFor(source, op.power) : 0); applyHeal(source, h, !!op.overheal, room, source, sourceCardKey, op.spillBonus ?? 0); healedTrigger(room, source, amt); clog(room, "  ✦ " + logNm(source) + " heals " + amt); }
      else if (op.do === "armDouble") source.doubleNext = true;                 // next card resolves twice
      else if (op.do === "comboBuff") source.comboPending = { left: op.n ?? 1, amount: op.amount ?? 1 }; // your NEXT N cards +amount
      else if (op.do === "healAlly") { const t = lowestHpFriendly(room, source); if (t) { const h = amt + powerFor(source, school) + (op.plusRangedBonus ? rangedBonusOf(source) : 0); applyHeal(t, h, !!op.overheal, room, source, sourceCardKey, op.spillBonus ?? 0); healedTrigger(room, t, h); if (op.shield) { const gain = op.shield + shieldPlus(t); t.shield = (t.shield ?? 0) + gain; recordShieldGrantMetric(room, source, t, gain, sourceCardKey); } } }
      else if (op.do === "shield") { let sg = amt + (op.ofMaxHp ? source.maxHp : 0) + (op.plusRangedBonus ? rangedBonusOf(source) : 0) + (op.ofDealt ? dealt : (op.power ? powerFor(source, op.power) * (op.mult ?? 1) : 0)); if (sg > 0) sg += shieldPlus(source); source.shield = (source.shield ?? 0) + sg; if (op.shieldMod && sg > 0) (source.shieldSegs ??= []).push({ amount: sg, mod: op.shieldMod }); if (sg > 0) clog(room, "  ✦ " + logNm(source) + " +" + sg + " shield"); }  // flat + max HP (Golden Golem) / +ranged bonus (Force, owner 2026-07-06) / dealt / power×mult; Wandering Castle's +1; shieldMod = W2-B special segment (double / cap1)
      else if (op.do === "thorns") source.thorns = (source.thorns ?? 0) + amt;  // per-fight spikes (symmetric)
      else if (op.do === "moxieOnPlay") { source.moxieOnPlayBuff = (source.moxieOnPlayBuff ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " +"+ amt + " moxie per card (this fight)"); } // Cool Shoes (owner 2026-07-06: a cast card, not a worn passive)
      // === OWNER BATCH C ops (2026-07-06), foe side — symmetric with the player cases below ===
      else if (op.do === "sap") { const dmul = leveledBody(source)?.debuffMult ?? 1;   // sap: opponents deal −N for the duration
        if (op.ofLastHit) {
          for (const { target, landed } of lastHitTargets)
            if (target?.hp > 0 || target?.alive) addDebuff(room, source, target, "sap", landed, (op.dur ?? 60) * dmul, sourceCardKey, li);
          continue;
        }
        const sAmt = op.ofDealt ? dealt : amt + (op.plusRanged ? rangedBonusOf(source) : 0);
        if (!(sAmt > 0)) continue;
        if (op.target === "selfLane" || op.target === "pickLane") { // Gravity Greatshield (owner 2026-07-09, caster's OWN lane) / Banshee Wail / legacy Black Hole: a reticle-less foe saps its OWN lane's heroes+summons either way
          for (const h of heroesInLane(room, li)) addDebuff(room, source, h, "sap", sAmt, (op.dur ?? 60) * dmul, sourceCardKey, li);
          for (const al of room.allies?.[li] ?? []) addDebuff(room, source, al, "sap", sAmt, (op.dur ?? 60) * dmul, sourceCardKey, li);
        } else if (op.target === "pick") {
          const t = foeRangedTarget(room, li);
          if (t) addDebuff(room, source, t, "sap", sAmt, (op.dur ?? 60) * dmul, sourceCardKey, li);
        } else {                                             // "board" — sap EVERY hero + ally summon on the board
          for (const h of [...room.players.values()].filter((q) => q.alive)) addDebuff(room, source, h, "sap", sAmt, (op.dur ?? 60) * dmul, sourceCardKey, h.lane ?? li);
          for (const arr of room.allies ?? []) for (const al of arr) addDebuff(room, source, al, "sap", sAmt, (op.dur ?? 60) * dmul, sourceCardKey, al.lane ?? li);
        } }
      // ZA WARUDO (owner 2026-07-10, W2-C), foe side: lock the foe's OWN lane's heroes+summons in stasis (symmetric with the hero case below)
      else if (op.do === "stasis") { const dmul = leveledBody(source)?.debuffMult ?? 1;
        for (const h of heroesInLane(room, li)) addBuff(h, "stasis", 0, (op.dur ?? 50) * dmul, sourceCardKey);   // FLAG: dur 50 (=5s) proposed — timed, NOT permanent (owner to tune); a permanent lockout would be game-ending
        for (const al of room.allies?.[li] ?? []) addBuff(al, "stasis", 0, (op.dur ?? 50) * dmul, sourceCardKey);
        for (const h of heroesInLane(room, li)) depressionSting(room, source, h, li);
        for (const al of room.allies?.[li] ?? []) depressionSting(room, source, al, li); }
      else if (op.do === "dualWield") source.dualWield = true;                  // Dual-Handing Two-Handers (W2-E rename of twoHand): melee cards costing ≥6 play an extra time this fight
      else if (op.do === "tkBlades") source.tkBlades = true;                    // Telekinetic Blades
      else if (op.do === "freeNext") source.freeNext = true;                    // Pyramid-Scheme Head
      else if (op.do === "moxieOnHit") source.moxieOnHitBuff = (source.moxieOnHitBuff ?? 0) + amt;  // Jesterplate
      else if (op.do === "giantBelt") applyGiantBelt(room, source);  // Giant's Belt (foe twin): +base health ONCE this fight, non-compounding; see applyGiantBelt
      else if (op.do === "chequeHeal") { const t = lowestHpFriendly(room, source) ?? source;  // Cheque Cherub (foes have no ally reticle)
        if ((t.hp ?? 0) >= (t.maxHp ?? 1)) t.shield = (t.shield ?? 0) + amt + shieldPlus(t);
        else { applyHeal(t, amt, false, room, source, sourceCardKey); healedTrigger(room, t, amt); } }
      else if (op.do === "shieldFront") { const line = room.lanes[li] ?? []; const t = line[0] ?? source; const g = amt + shieldPlus(t); t.shield = (t.shield ?? 0) + g; } // Earth Elemental's ward
      else if (op.do === "counter") { source.counters = (source.counters ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " +" + amt + " dmg"); } // ramps its attack
      else if (op.do === "selfHit") selfDamage(room, source, amt); // CRIMSON CROWN (owner 2026-07-10): a periodic "take N" — routes through selfDamage so a foe's crown fires the on-damaged triggers too (symmetry)
      else if (op.do === "gainMoxie") { const _g0 = source.moxie ?? 0; source.moxie = Math.min(MOXIE_CAP, _g0 + amt); gainTriggerPassives(room, source, (source.moxie ?? 0) - _g0); } // Lizard Wizard: bank moxie; feeds {gain:N} clocks
      else if (op.do === "regen") { const rk = op.kind === "modalBonus" ? (modalKind(source) === "ranged" ? "rangedBonus" : "meleeBonus") : (op.kind ?? "heal"); (source.regens ??= []).push({ kind: rk, amount: op.amount ?? 1, period: op.period ?? 30, melee: op.melee, shield: op.shield, charge: 0, ...(sourceCardKey ? { sourceCard: sourceCardKey } : {}) }); } // Demon Form (modalBonus): resolve the picked kind AT CAST → a concrete melee/ranged regen record
      else if (op.do === "meleeBonus") { source.meleeBonus = (source.meleeBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " melee +" + amt); } // legacy 🗡-only ramp (no live card since Sharpened Edges went modal — kept for back-compat)
      else if (op.do === "rangedBonus") { source.rangedBonus = (source.rangedBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " ranged +" + amt); } // 🎯-only ramp (Crystal Ball's rider)
      else if (op.do === "modalBonus") { if (modalKind(source) === "ranged") { source.rangedBonus = (source.rangedBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " ranged +" + amt); } else { source.meleeBonus = (source.meleeBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " melee +" + amt); } } // Sharpened Edges: +amt to the PICKED kind (player pick / foe affinity)
      else if (op.do === "bloodToIron") source.bloodToIron = { stored: 0, left: op.dur ?? 50, dur: op.dur ?? 50, ...(sourceCardKey ? { sourceCard: sourceCardKey } : {}) };
      else if (op.do === "timer") (source.timers ??= []).push({ ops: op.ops ?? [], period: op.period ?? 60, charge: 0, once: !!op.once, kind: op.kind ?? kind, ...(sourceCardKey ? { sourceCard: sourceCardKey } : {}) });
      // === OWNER BATCH D ops (2026-07-07), foe side — symmetric with the player cases below ===
      else if (op.do === "mirror") source.mirrorShield = (source.mirrorShield ?? 0) + 1; // Mirror Shield: arm a one-shot reflect (consumed in reflectThorns)
      else if (op.do === "leech") {   // PET LEECH (foe cast): snapshot base + ranged bonus onto the attached drain; damage and heal use that same magnitude
        const lt = foeRangedTarget(room, li);
        const leechAmount = (amt || 1) + (op.plusRangedBonus ? rangedBonusOf(source) : 0);
        if (lt) { (lt.leeches ??= []).push({ amount: leechAmount, period: op.period ?? 60, charge: 0, src: source, ...(sourceCardKey ? { sourceCard: sourceCardKey } : {}) }); clog(room, "  🪱 " + logNm(lt) + " is leeched by " + logNm(source)); } }
      else if (op.do === "revealLight") { // SWORDS OF REVEALING LIGHT (foe cast, owner 2026-07-11): a foe has no ally reticle → arms ITSELF; same once-per-fight guard (foes spawn fresh each room)
        if (!source._revealLightApplied) { source._revealLightApplied = true; source.revealLight = (source.revealLight ?? 0) + (op.count ?? 3); clog(room, "  🌟 " + logNm(source) + " — the next " + source.revealLight + " hits become 1"); } }
      else if (op.do === "pullFront") {  // GRAVITY GREATSWORD (foe side, MOD-4 owner 2026-07-10): mirror of the
        // hero Taunt/pull — drag the aimed HERO across into the foe's OWN lane and to its FRONT, so the
        // follow-up melee `deal 5` (target:"front") lands on it. Heroes order by `depth` (they live in
        // room.players, not a lane array), so "front" = set the hero below every occupant of the foe's
        // lane. Shared op → a foe's Taunt now repositions a hero too (acceptable symmetry gain, owner-noted).
        const th = foeRangedTarget(room, li);   // a hero in the foe's lane, else the weakest hero anywhere (cross-lane reach)
        if (th && room.players?.has?.(th.id)) {
          th.lane = li;
          const occ = [...heroesInLane(room, li), ...(room.allies?.[li] ?? [])].filter((c) => c !== th);
          th.depth = Math.min(0, ...occ.map((c) => c.depth ?? 0)) - 1;   // bring to the FRONT of the foe's lane
        }
      }
      else if (op.do === "repositionPick") {
        const th = foeRangedTarget(room, li);
        if (th) {
          const pos = source._pick === "front" || source._pick === "back" ? source._pick : (op.fallback ?? "back");
          const tl = th.lane | 0;
          const occ = [...heroesInLane(room, tl), ...(room.allies?.[tl] ?? [])].filter((c) => c !== th);
          th.depth = pos === "front"
            ? Math.min(0, ...occ.map((c) => c.depth ?? 0)) - 1
            : Math.max(0, ...occ.map((c) => c.depth ?? 0)) + 1;
        }
      }
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
        lastHitTargets = [];
        // TELEKINETIC BLADES (owner 2026-07-06): fight-long — melee strikes AIM at your reticle
        // instead of the front, and take the RANGED bonus (play-triggers stay melee — flagged).
        const tk = source.tkBlades && (kind === "melee" || kind === "both");
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
        lastHit = dmg;                                    // legacy delay {ofDealt} drains this many moxie per target
        // MOONLIGHT (owner 2026-07-06): with BOTH bonuses ≥ N the strike upgrades front → whole lane
        let target = op.target;
        if (op.laneWhenDual && meleeBonusOf(source) >= op.laneWhenDual && rangedBonusOf(source) >= op.laneWhenDual) target = "lane";
        const beamUp = op.beamWhenDual && meleeBonusOf(source) >= op.beamWhenDual && rangedBonusOf(source) >= op.beamWhenDual;
        // Any bothKinds lane/beam strike marks the resolve as dual-kind. Static dual-kind cards already
        // fire both trigger families at cast; this flag also carries that truth through delayed timers.
        if (op.bothKinds && target === "lane") source._bothKindsPlay = true;
        if (tk && (target === "front" || target === "front2")) target = "pick";
        // `strike` deals to one foe and tallies BOTH the gross swing (localDealt — what every existing
        // lifesteal/refund credit reads) AND the damage that actually LANDED INTO that foe's pool
        // (landedCap = min(swing, its HP+shield BEFORE the hit)) so a `capLanded` op (Jaw, owner
        // 2026-07-10) can credit "only what landed" — heal/shield 2, not 3, on a low-HP foe.
        // PIERCE (W2-A): op.pierce threads an ignore-all-defence flag through `strike` to every
        // damageEnemy call (undefined → damageEnemy's default {} → no pierce).
        let localDealt = 0, landedCap = 0;
        const pOpts = (op.pierce || op.noReact) ? { pierce: op.pierce === true, noReact: op.noReact === true } : undefined;   // pierce (W2-A) + noReact (Butterfly Knife, owner 2026-07-11)
        const strike = (lane, e, d) => { const pool = Math.max(0, (e?.hp ?? 0) + (e?.shield ?? 0)); const g = damageEnemy(room, lane, e, d, source, pOpts); localDealt += g; landedCap += Math.min(g, pool); if (g > 0) lastHitTargets.push({ target: e, landed: g }); return g; };
        if (target === "lane") {                          // V2: every foe in YOUR lane + the back-line boss (owner 2026-07-09)
          recordCastFx(room, source, sourceCardKey, source.lane, playerLaneFoes(room, source.lane));
          // NOTE (owner 2026-07-10): a lane cast is left UNbreached on purpose — it already reaches
          // the back-line boss via playerLaneFoes, so an empty own lane still lands on the boss; a
          // hero AoE that follows the foes sideways is a bigger design change (owner's call, not done).
          // op.frontExtra (Whip, owner 2026-07-11): the lane's FRONT foe takes +N on top of the lane
          // hit (front = lanes[li][0], never the back-line boss); the rest of the lane takes dmg.
          const laneFront = op.frontExtra ? (room.lanes[source.lane] ?? [])[0] : null;
          for (const e of playerLaneFoes(room, source.lane)) strike(source.lane, e, dmg + (e === laneFront ? op.frontExtra : 0));
        }
        else if (target === "board") {                    // BLACK HOLE (owner 2026-07-10): the ENTIRE board — every foe in EVERY lane + the back-line boss
          room.lanes.forEach((laneArr, l) => { for (const e of [...laneArr]) strike(l, e, dmg); });
          if (bossAlive(room)) strike(room.boss.lane | 0, room.boss, dmg);
        }
        else if (target === "front2") {                   // Spear: the front TWO foes in your lane (NOT a lane cast — no boss reach)
          // BREACH (owner symmetry EXTENSION 2026-07-10 — FLAG, owner-confirmable): an empty own
          // lane follows the foes to the nearest foe-occupied lane's front two, mirroring the foe
          // side's foeHitFront2. Like that mirror (and unlike single-target front) it never falls
          // back to the boss — an all-empty front hits nobody.
          let f2Lane = source.lane;
          if (!(room.lanes[f2Lane] ?? []).some((e) => (e?.hp ?? 0) > 0)) {
            const rl = nearestFoeLane(room, f2Lane);
            if (rl >= 0) f2Lane = rl;
          }
          for (const e of [...room.lanes[f2Lane].slice(0, 2)]) strike(f2Lane, e, dmg);
        }
        else if (target === "pickLane") {                 // BLACK HOLE (owner 2026-07-07): every foe in your AIMED foe's lane + the back-line boss (owner 2026-07-09)
          const t = aimedFoe(room, source, "pick");       // the reticle picks the LANE (falls back to your lane's front)
          if (t) for (const e of playerLaneFoes(room, t.lane)) strike(t.lane, e, dmg);
        }
        else {
          const t = aimedFoe(room, source, target);       // 'front' or 'pick'
          if (t) {
            recordCastFx(room, source, sourceCardKey, t.lane, t.foe);
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
                strike(t.lane, e, rem);
                rem -= absorb;
              }
            } else {
              strike(t.lane, t.foe, dmg);   // the front/pick single-target strike — the path W2-A's piercing melee cards take

            }
          }
        }
        if (beamUp) {
          source._bothKindsPlay = true;
          for (const e of playerLaneFoes(room, source.lane)) strike(source.lane, e, dmg);
        }
        // JAW (owner 2026-07-10): credit only the damage that LANDED into the foe (cap the overkill on a
        // low-HP foe). OPT-IN — plain lifesteal/refund cards leave localDealt = the full swing (UNCHANGED).
        if (op.capLanded) localDealt = landedCap;
        // lifesteal heals the TOTAL landed — uniformly, so lane/AoE steals too (Sphinx's lane drain;
        // it only covered the single-target path before batch C)
        if (op.lifesteal && localDealt > 0) { applyHeal(source, localDealt, op.overheal, room, source, sourceCardKey); healedTrigger(room, source, localDealt); } // player-owned Sphinx: overheal (op.overheal) spills the excess to shield
        dealt += localDealt;
        if (op.moxieFromDealt && localDealt > 0) source.moxie = Math.min(MOXIE_CAP, (source.moxie ?? 0) + localDealt); // Treasure Blade (owner 2026-07-06)
        if (op.shieldFromDealt && localDealt > 0) { const sg = localDealt + shieldPlus(source); source.shield = (source.shield ?? 0) + sg; recordShieldGrantMetric(room, source, source, sg, sourceCardKey); clog(room, "  ✦ " + logNm(source) + " +" + sg + " shield"); } // JAW (owner 2026-07-10): gain shield = damage dealt (honors Wandering Castle's +1 via shieldPlus); symmetric
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
        const d = op.ofDealt ? lastHit : amt;             // ofDealt = drain equal to the preceding resolved hit
        if (op.target === "lane") {                       // lane-wide legacy drain reaches the back-line boss too
          for (const e of playerLaneFoes(room, source.lane)) drainClocks(e, d);
          break;
        }
        const t = aimedFoe(room, source, op.target);
        if (t) drainClocks(t.foe, d);
        break;
      }
      case "buff": {   // Haste / Power Boost / Stone Skin — castable on a TEAMMATE via the
        // ally-target slot (owner 2026-06-12), same slot heals read; falls back to self.
        const at = allyTargetOf(room, source);   // player OR friendly summon (owner 2026-07-10)
        addBuff(allyUp(at) ? at : source, op.buff, op.amount, op.dur, sourceCardKey);
        break;
      }
      case "gigaArm":  source.gigaArmed = true; break;    // Giga Cast: the NEXT staff item resolves ×4
      case "timeStop": room.freezeFoes = Math.max(room.freezeFoes ?? 0, op.dur ?? 30); break; // ⏳ freeze the foe side
      case "revive": {  // once-per-fight rescue: a downed teammate to FULL (ally-target first), else a full heal
        // A summon never "downs" (it dies and is spliced out), so a pinned live summon is NOT a revive
        // target — `at.alive === false` (players only) keeps revive's rescue semantics; a summon still
        // qualifies for the full-heal fallback via allyUp, symmetric with a pinned live teammate.
        const at = allyTargetOf(room, source);
        const t = (at && at.alive === false) ? at
              : [...room.players.values()].find((q) => !q.alive)
              ?? (allyUp(at) ? at : lowestHpFriendly(room, source));
        if (t) { t.alive = true; t.downTimer = 0; t.hp = t.maxHp; }
        break;
      }
      case "summon":   summonBodies(room, source, op); break; // hero summons an ally (V2 §4.10: items do this now)
      case "attack": { // SYMMETRY: a worn body's "attack/I-sword" passive strikes a foe for its effective Power
        const t = aimedFoe(room, source, op.target ?? "front");
        if (t) damageEnemy(room, t.lane, t.foe, effAtk(source), source);
        break;
      }
      case "healAttack": applyHeal(source, effAtk(source), false, room, source, sourceCardKey); break; // lifesteal-style body passive
      case "healAlly": {
        // SMART TANK HEALING (owner 2026-06-21): your ALLY-target slot (🎯 → tap an ally) is the
        // priority — pin the tank and heals land on the tank WHILE IT NEEDS THEM. But a foe wouldn't
        // waste a hit, and neither should a healer: if the pinned target is already topped off we DON'T
        // overheal it, we slide to the most-hurt friendly in the lane instead. No pin set → just heal
        // the most-hurt friendly. Offense never reads this slot.
        const at = allyTargetOf(room, source);   // player OR friendly summon (owner 2026-07-10)
        const needsHeal = (q) => allyUp(q) && q.hp < q.maxHp;
        const t = needsHeal(at) ? at : (lowestHpFriendly(room, source) ?? (allyUp(at) ? at : null));
        if (t) {
          const h = amt + powerFor(source, school) + (op.plusRangedBonus ? rangedBonusOf(source) : 0);
          applyHeal(t, h, !!op.overheal, room, source, sourceCardKey, op.spillBonus ?? 0);
          healedTrigger(room, t, h);
          if (op.shield) { const gain = op.shield + shieldPlus(t); t.shield = (t.shield ?? 0) + gain; recordShieldGrantMetric(room, source, t, gain, sourceCardKey); }
        }
        break;
      }
      case "schoolStrike": { // "I sword/staff": deal my school Power to a foe, then emit that school's trigger
        const ts = aimedFoe(room, source, op.target ?? "front");
        if (ts) damageEnemy(room, ts.lane, ts.foe, powerFor(source, op.school), source);
        fireSchoolTrigger(room, source, op.school);
        break;
      }
      case "shield": { let sg = amt + (op.ofMaxHp ? source.maxHp : 0) + (op.plusRangedBonus ? rangedBonusOf(source) : 0) + (op.ofDealt ? dealt : (op.power ? powerFor(source, op.power) * (op.mult ?? 1) : 0)); if (sg > 0) sg += shieldPlus(source); source.shield = (source.shield ?? 0) + sg; if (op.shieldMod && sg > 0) (source.shieldSegs ??= []).push({ amount: sg, mod: op.shieldMod }); if (sg > 0) { recordShieldGrantMetric(room, source, source, sg, sourceCardKey, op.shieldMod ?? null); clog(room, "  ✦ " + logNm(source) + " +" + sg + " shield"); } break; } // flat + max HP (Golden Golem) / +ranged bonus (Force) / dealt / power×mult; Wandering Castle's +1; shieldMod = W2-B special segment (double / cap1)
      case "comboBuff": source.comboPending = { left: op.n ?? 1, amount: op.amount ?? 1 }; break; // your NEXT N cards deal +amount
      case "thorns":   source.thorns = (source.thorns ?? 0) + amt; break; // Spikes: per-fight reflect buff
      case "moxieOnPlay": { source.moxieOnPlayBuff = (source.moxieOnPlayBuff ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " +" + amt + " moxie per card (this fight)"); break; } // Cool Shoes (owner 2026-07-06: a cast card, not a worn passive)
      case "healSelf": { const h = amt + (op.power ? powerFor(source, op.power) : 0); applyHeal(source, h, !!op.overheal, room, source, sourceCardKey, op.spillBonus ?? 0); healedTrigger(room, source, amt); clog(room, "  ✦ " + logNm(source) + " heals " + amt); break; }
      // === OWNER BATCH C ops (2026-07-06), hero side ===
      case "sap": { const dmul = leveledBody(source)?.debuffMult ?? 1;   // sap: foes deal −N for the duration
        if (op.ofLastHit) {
          for (const { target, landed } of lastHitTargets)
            if (target?.hp > 0) addDebuff(room, source, target, "sap", landed, (op.dur ?? 60) * dmul, sourceCardKey, target.lane ?? source.lane);
          break;
        }
        const sAmt = op.ofDealt ? dealt : amt + (op.plusRanged ? rangedBonusOf(source) : 0);
        if (!(sAmt > 0)) break;
        if (op.target === "selfLane") {                     // GRAVITY GREATSHIELD (owner 2026-07-09) / BANSHEE WAIL: self-cast → sap the CASTER'S OWN lane + the back-line boss (owner 2026-07-09: all lane casts reach the boss)
          for (const e of playerLaneFoes(room, source.lane)) addDebuff(room, source, e, "sap", sAmt, (op.dur ?? 60) * dmul, sourceCardKey, source.lane);
        } else if (op.target === "pickLane") {              // (legacy) the AIMED foe's lane + the back-line boss
          const t = aimedFoe(room, source, "pick");
          if (t) for (const e of playerLaneFoes(room, t.lane)) addDebuff(room, source, e, "sap", sAmt, (op.dur ?? 60) * dmul, sourceCardKey, t.lane);
        } else if (op.target === "pick") {
          const t = aimedFoe(room, source, "pick");
          if (t) addDebuff(room, source, t.foe, "sap", sAmt, (op.dur ?? 60) * dmul, sourceCardKey, t.lane);
        } else {                                            // "board" — BLACK HOLE (owner 2026-07-10): the WHOLE board, every foe in every lane + the back-line boss
          for (let li2 = 0; li2 < room.lanes.length; li2++) for (const e of room.lanes[li2]) addDebuff(room, source, e, "sap", sAmt, (op.dur ?? 60) * dmul, sourceCardKey, li2);
          if (bossAlive(room)) addDebuff(room, source, room.boss, "sap", sAmt, (op.dur ?? 60) * dmul, sourceCardKey, source.lane);
        }
        break; }
      // ZA WARUDO (owner 2026-07-10, W2-C), hero side: lock every foe in the CASTER'S OWN lane (+ back-line boss) in stasis — can't cast, can't gain moxie, no positive triggers (suppression checked in foeCast/playCard, regenMoxie, tickRegens)
      case "stasis": { const dmul = leveledBody(source)?.debuffMult ?? 1;
        for (const e of playerLaneFoes(room, source.lane)) addBuff(e, "stasis", 0, (op.dur ?? 50) * dmul, sourceCardKey);   // FLAG: dur 50 (=5s) proposed — TIMED, not permanent (owner to tune); permanent would be game-ending
        for (const e of playerLaneFoes(room, source.lane)) depressionSting(room, source, e, source.lane);
        break; }
      case "dualWield": source.dualWield = true; break;   // Dual-Handing Two-Handers (W2-E rename of twoHand): melee cards costing ≥6 play an extra time this fight
      case "tkBlades": source.tkBlades = true; break;     // Telekinetic Blades: melee aims + scales ranged this fight
      case "freeNext": source.freeNext = true; break;     // Pyramid-Scheme Head: the next card is FREE
      case "moxieOnHit": source.moxieOnHitBuff = (source.moxieOnHitBuff ?? 0) + amt; break; // Jesterplate: +moxie per hit taken
      case "giantBelt": applyGiantBelt(room, source); break; // Giant's Belt: +base health ONCE this fight, non-compounding; UNDONE at room-clear (won-block) so it can't outlive the fight into a level-up/swap. See applyGiantBelt.
      case "chequeHeal": {  // Cheque Cherub: heal your ALLY-TARGET 1 (or +1 shield at full HP); falls back to the most-hurt friendly
        const at = allyTargetOf(room, source);   // player OR friendly summon (owner 2026-07-10)
        const t = allyUp(at) ? at : (lowestHpFriendly(room, source) ?? source);
        if ((t.hp ?? 0) >= (t.maxHp ?? 1)) { const gain = amt + shieldPlus(t); t.shield = (t.shield ?? 0) + gain; recordShieldGrantMetric(room, source, t, gain, sourceCardKey); }
        else { applyHeal(t, amt, false, room, source, sourceCardKey); healedTrigger(room, t, amt); }
        break; }
      case "shieldFront": { const line = heroesInLane(room, source.lane); const t = line[0] ?? source; const g = amt + shieldPlus(t); t.shield = (t.shield ?? 0) + g; recordShieldGrantMetric(room, source, t, g, sourceCardKey); break; } // Earth Elemental's ward: the front of its own line (or itself)
      case "timer": (source.timers ??= []).push({ ops: op.ops ?? [], period: op.period ?? 60, charge: 0, once: !!op.once, kind: op.kind ?? kind, ...(sourceCardKey ? { sourceCard: sourceCardKey } : {}) }); break;
      case "armDouble": source.doubleNext = true; break;  // body passive: my NEXT card resolves twice
      case "counter":  source.counters = (source.counters ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " +" + amt + " dmg"); break;
      case "selfHit":  selfDamage(room, source, amt); break; // CRIMSON CROWN (owner 2026-07-10): a periodic "take N" self-hit — reuses the Berserker selfDamage helper (shield eats first, fires on-damaged triggers)
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
      case "repositionPick": {
        const tp = aimedFoe(room, source, "pick");
        if (tp) {
          const arr = room.lanes[tp.lane], idx = arr.indexOf(tp.foe);
          const pos = source._pick === "front" || source._pick === "back" ? source._pick : (op.fallback ?? "back");
          if (idx >= 0) { arr.splice(idx, 1); pos === "front" ? arr.unshift(tp.foe) : arr.push(tp.foe); }
        }
        break;
      }
      case "regen": { const rk = op.kind === "modalBonus" ? (modalKind(source) === "ranged" ? "rangedBonus" : "meleeBonus") : (op.kind ?? "heal"); (source.regens ??= []).push({ kind: rk, amount: op.amount ?? 1, period: op.period ?? 30, melee: op.melee, shield: op.shield, charge: 0, ...(sourceCardKey ? { sourceCard: sourceCardKey } : {}) }); break; } // Trollskin / Liquid Metal / Moxie Pool / Sage Mode(heal) / Berserker / Demon Form (modalBonus → the picked kind, resolved at cast)
      case "meleeBonus": source.meleeBonus = (source.meleeBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " melee +" + amt); break; // legacy 🗡-only ramp (no live card since Sharpened Edges went modal — kept for back-compat)
      case "rangedBonus": source.rangedBonus = (source.rangedBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " ranged +" + amt); break; // 🎯-only ramp (Crystal Ball's rider; counters lifts both, this lifts only ranged)
      case "modalBonus": { // SHARPENED EDGES (owner 2026-07-09): +amt to the PICKED kind — player pick (source._pick) or foe affinity
        if (modalKind(source) === "ranged") { source.rangedBonus = (source.rangedBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " ranged +" + amt); }
        else { source.meleeBonus = (source.meleeBonus ?? 0) + amt; clog(room, "  ✦ " + logNm(source) + " melee +" + amt); }
        break; }
      case "bloodToIron": source.bloodToIron = { stored: 0, left: op.dur ?? 50, dur: op.dur ?? 50, ...(sourceCardKey ? { sourceCard: sourceCardKey } : {}) }; break; // store damage → shield when the window closes
      // === OWNER BATCH D ops (2026-07-07), hero side ===
      case "mirror": {   // MIRROR SHIELD: arm a one-shot reflect — the next attack that lands on you strikes the attacker back for the same damage (consumed in reflectThorns)
        source.mirrorShield = (source.mirrorShield ?? 0) + 1;
        clog(room, "  🪞 " + logNm(source) + " raises a mirror");
        break; }
      case "leech": {   // PET LEECH: attach a drain DEBUFF to the aimed foe — every `period` ticks the
        // CARRIER takes base + the caster's ranged bonus and the CASTER heals the same (tickLeeches). Lives
        // on the carrier (dies with it), reusable — same-foe recasts STACK (owner-stated design).
        const lt = aimedFoe(room, source, op.target ?? "pick");
        const leechAmount = (amt || 1) + (op.plusRangedBonus ? rangedBonusOf(source) : 0);
        if (lt) { (lt.foe.leeches ??= []).push({ amount: leechAmount, period: op.period ?? 60, charge: 0, src: source, ...(sourceCardKey ? { sourceCard: sourceCardKey } : {}) }); clog(room, "  🪱 " + logNm(lt.foe) + " is leeched by " + logNm(source)); }
        break; }
      case "revealLight": {   // SWORDS OF REVEALING LIGHT (owner 2026-07-11): arm next-3-hits-become-1
        // charges on your ally-target (else self) — the defensive-cast targeting grammar (buff/healAlly).
        // ONCE PER FIGHT: the Giant's Belt applied-flag guard — a second cast on the same unit is a
        // no-op (can never re-arm/stack); flag + charges reset per fight in beginCombat.
        const at = allyTargetOf(room, source);
        const t = allyUp(at) ? at : source;
        if (t._revealLightApplied) { clog(room, "  🌟 " + logNm(t) + " is already sworn (once per fight)"); break; }
        t._revealLightApplied = true;
        t.revealLight = (t.revealLight ?? 0) + (op.count ?? 3);
        clog(room, "  🌟 " + logNm(t) + " — the next " + t.revealLight + " hits become 1");
        break; }
      case "tutor": {    // CRYSTAL BALL: move the play's PICKED card (source._pick, a card KEY) into the hand
        // owner 2026-07-10 "let it pick ANY card including used ones": the pool is the WHOLE deck —
        // draw pile (source.deck) PLUS discard (source.disc, already-played cards) — no longer just the
        // draw pile. No recycle needed: we fetch straight from whichever pile holds the pick.
        const piles = [(source.deck ??= []), (source.disc ??= [])];
        const pool = piles.flatMap((pile, pi) => pile.map((c, ci) => ({ pi, ci, key: c.key })));
        if (!pool.length) break;                                     // deckless token / everything in hand — nothing to fetch, never a crash
        let hit = pool.find((e) => e.key === source._pick);
        if (!hit) hit = pool[Math.floor(Math.random() * pool.length)]; // FLAG: invalid/missing pick → a RANDOM card from the combined pool (per the pick contract)
        const fetched = piles[hit.pi].splice(hit.ci, 1)[0];
        (source.hand ??= []).push(fetched);                          // owner 2026-07-09: the tutored card is a ONE-SHOT, NOT a permanent bonus slot — it lands as a transient over-HAND_SIZE card that drains back to normal on the next play (see playCard's OVER-SIZE DRAIN); earlier "hand permanently grows" call REVERSED
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
  room._damageContext = priorDamageContext;
  return dealt;   // total damage this op-list LANDED — feeds {dealtMelee}/{dealtRanged} body clocks
}

// WORN-PASSIVE moxie refund (Cool Shoes, owner 2026-06-25): +N moxie each time the wearer plays/casts
// a card. Reads worn gear (player.inv / foe.equipment) — symmetric across both sides; callers cap at
// MOXIE_CAP.
// Cool Shoes' refund is a CAST-INSTALLED lasting buff now (owner 2026-07-06: "there's no such thing
// as a passive — they're just a card"), not a worn-inventory scan. Reset per fight in beginCombat.
const moxieOnPlayBonus = (c) => c?.moxieOnPlayBuff ?? 0;

// BOUNDED COMBAT TELEMETRY (owner 2026-07-15): keep high-frequency observations in memory and
// serialize one compact summary when the fight ends. These are facts, not balance verdicts:
// `strandedDraws` are draw instances still in hand at combat end; affordability is measured from
// live card cost; `handLockedTicks` counts live ticks where no held card can be paid for.
const _metricCount = (list = []) => {
  const out = {};
  for (const key of list) out[key] = (out[key] ?? 0) + 1;
  return out;
};
const _metricPlayer = (room, p) => room?._combatMetrics?.players?.[p?.id] ?? null;
const _metricCard = (pm, key) => {
  if (!pm || !key) return null;
  return (pm.cards[key] ??= {
    deckCopies: 0, draws: 0, openingDraws: 0, casts: 0, manualCasts: 0, autoCasts: 0,
    queued: 0, queuedCasts: 0, queueCancelled: 0,
    heldTicks: 0, affordableTicks: 0, unaffordableTicks: 0, presentDuringHandLockTicks: 0,
    strandedDraws: 0, unexposedEndDraws: 0, attempts: 0, rejected: {}, moxieSpent: 0,
    healAttempted: 0, healEffective: 0, overhealWasted: 0, overhealToShield: 0,
    shieldGranted: 0, shieldDamageAbsorbed: 0, shieldResourceSpent: 0,
  });
};
const _metricSyncHand = (room, p, opening = false) => {
  const pm = _metricPlayer(room, p);
  if (!pm) return;
  for (const card of p.hand ?? []) {
    if (pm.holding[card.id]) continue;
    pm.holding[card.id] = { key: card.key, entered: room.tick ?? 0, observedTicks: 0 };
    const cm = _metricCard(pm, card.key);
    cm.draws++;
    if (opening) cm.openingDraws++;
  }
};
const _metricReject = (room, p, card, reason, auto = false) => {
  const pm = _metricPlayer(room, p);
  if (!pm) return;
  pm.attempts++;
  pm.rejected[reason] = (pm.rejected[reason] ?? 0) + 1;
  if (auto) pm.autoAttempts++; else pm.manualAttempts++;
  if (card?.key) {
    const cm = _metricCard(pm, card.key);
    cm.attempts++;
    cm.rejected[reason] = (cm.rejected[reason] ?? 0) + 1;
  }
};
const _metricQueue = (room, p, card) => {
  const pm = _metricPlayer(room, p);
  if (!pm || !card?.key) return;
  pm.attempts++; pm.manualAttempts++; pm.queued++;
  const cm = _metricCard(pm, card.key);
  cm.attempts++; cm.queued++;
};
const _metricQueueCancel = (room, p, card) => {
  const pm = _metricPlayer(room, p);
  if (!pm) return;
  pm.queueCancelled++;
  if (card?.key) _metricCard(pm, card.key).queueCancelled++;
};
const _metricCast = (room, p, card, cost, auto, queued = false) => {
  const pm = _metricPlayer(room, p);
  if (!pm) return;
  // A queued tap was already counted when the intent was accepted.  Firing it later is one cast,
  // not a second attempt, and it remains a manual action rather than AUTO.
  if (!queued) {
    pm.attempts++;
    if (auto) pm.autoAttempts++; else pm.manualAttempts++;
  } else pm.queuedCasts++;
  const cm = _metricCard(pm, card.key);
  if (!queued) cm.attempts++;
  cm.casts++; cm.moxieSpent += cost;
  if (queued) cm.queuedCasts++;
  if (auto) cm.autoCasts++; else cm.manualCasts++;
  delete pm.holding[card.id];
};

export function beginCombatMetrics(room) {
  const node = currentNode(room);
  const combat = (room._combatSeq = (room._combatSeq ?? 0) + 1);
  room._combatMetrics = {
    version: 1, combat, startedTick: room.tick ?? 0, result: null, finalized: false,
    node: { id: node?.id ?? null, type: node?.type ?? null, boss: room.boss?.bodyKey ?? (node?.boss ?? null) },
    players: {},
  };
  for (const p of room.players.values()) {
    const deck = [...(p.deckList ?? [])];
    const pm = room._combatMetrics.players[p.id] = {
      seat: p.id, owner: p.owner ?? null, bot: !!p.bot, homeBody: p.homeBody ?? null,
      body: p.bodyKey, level: p.level ?? p.runLevel ?? 1,
      starterDeck: [...(p.runStarterDeck ?? [])], deck, backpack: [...(p.backpack ?? [])],
      openingHand: (p.hand ?? []).map((c) => c.key), endHand: [],
      hpStart: p.hp ?? 0, maxHpStart: p.maxHp ?? 0, hpEnd: null, maxHpEnd: null,
      cards: {}, holding: {}, shieldLedger: [], handLockedTicks: 0, disabledTicks: 0,
      attempts: 0, manualAttempts: 0, autoAttempts: 0, queued: 0, queuedCasts: 0, queueCancelled: 0, rejected: {},
      incomingDamage: 0, hpDamage: 0, shieldDamageAbsorbed: 0, shieldResourceSpent: 0,
      healAttempted: 0, healEffective: 0, overhealWasted: 0, overhealToShield: 0,
    };
    for (const [key, copies] of Object.entries(_metricCount(deck))) _metricCard(pm, key).deckCopies = copies;
    const segs = p.shieldSegs ?? [];
    for (const seg of segs) if ((seg.amount ?? 0) > 0) pm.shieldLedger.push({ sourceSeat: null, key: null, remaining: seg.amount, mod: seg.mod ?? null });
    const normalShield = Math.max(0, (p.shield ?? 0) - segs.reduce((n, seg) => n + Math.max(0, seg.amount ?? 0), 0));
    if (normalShield > 0) pm.shieldLedger.push({ sourceSeat: null, key: null, remaining: normalShield, mod: null });
    _metricSyncHand(room, p, true);
  }
  return combatMetricsStart(room);
}

export function combatMetricsStart(room) {
  const m = room?._combatMetrics;
  if (!m) return null;
  return {
    version: m.version, combat: m.combat, node: m.node,
    players: Object.values(m.players).map((p) => ({
      seat: p.seat, owner: p.owner, bot: p.bot, homeBody: p.homeBody, body: p.body, level: p.level,
      starterDeck: p.starterDeck, deck: p.deck, backpack: p.backpack, openingHand: p.openingHand,
    })),
  };
}

export function tickCombatMetrics(room, p) {
  const pm = _metricPlayer(room, p);
  if (!pm) return;
  _metricSyncHand(room, p);
  const hand = p.hand ?? [];
  const disabled = (room.freezeHeroes ?? 0) > 0 || hasBuff(p, "stasis");
  if (disabled) { pm.disabledTicks++; return; }
  let anyAffordable = false;
  for (const card of hand) {
    const cm = _metricCard(pm, card.key);
    if (pm.holding[card.id]) pm.holding[card.id].observedTicks++;
    const affordable = (p.moxie ?? 0) >= playCost(card.key, BODIES[p.bodyKey], p);
    cm.heldTicks++;
    if (affordable) { cm.affordableTicks++; anyAffordable = true; }
    else cm.unaffordableTicks++;
  }
  if (hand.length && !anyAffordable) {
    pm.handLockedTicks++;
    for (const card of hand) _metricCard(pm, card.key).presentDuringHandLockTicks++;
  }
}

function recordHealMetric(room, source, target, attempted, effective, overhealToShield = 0, sourceCardKey = null) {
  const pm = _metricPlayer(room, source);
  if (!pm || !(attempted > 0)) return;
  const eff = Math.max(0, effective ?? 0);
  const spill = Math.max(0, overhealToShield ?? 0);
  const wasted = Math.max(0, attempted - eff - spill);
  pm.healAttempted += attempted; pm.healEffective += eff;
  pm.overhealWasted += wasted; pm.overhealToShield += spill;
  const key = sourceCardKey ?? source?._metricCardKey;
  if (key) {
    const cm = _metricCard(pm, key);
    cm.healAttempted += attempted; cm.healEffective += eff;
    cm.overhealWasted += wasted; cm.overhealToShield += spill;
  }
}

function recordShieldGrantMetric(room, source, target, amount, sourceCardKey = null, mod = null) {
  if (!(amount > 0)) return;
  const targetPm = _metricPlayer(room, target);
  if (!targetPm) return;                              // token shields stay outside player-deck telemetry
  const directSourcePm = _metricPlayer(room, source);
  const sourcePm = directSourcePm ?? room?._combatMetrics?.players?.[source?._metricOwnerId] ?? null;
  const key = directSourcePm
    ? (sourceCardKey ?? source?._metricCardKey ?? null)
    : (source?._metricSourceCard ?? sourceCardKey ?? null);
  targetPm.shieldLedger.push({ sourceSeat: sourcePm?.seat ?? null, key, remaining: amount, mod });
  if (sourcePm && key) _metricCard(sourcePm, key).shieldGranted += amount;
}

// Mirror the engine's shield ordering on a telemetry-only provenance ledger: special segments first
// (FIFO), then ordinary shield. The authoritative player totals still use the real before/after values;
// this ledger only attributes the stopped damage/resource spend back to a granting card when known.
function recordShieldAbsorbMetric(room, target, incoming, remaining, shieldBefore, shieldAfter) {
  const pm = _metricPlayer(room, target);
  if (!pm || !(incoming > 0)) return;
  const actualAbsorbed = Math.max(0, incoming - remaining);
  const actualSpent = Math.max(0, shieldBefore - shieldAfter);
  pm.shieldDamageAbsorbed += actualAbsorbed;
  pm.shieldResourceSpent += actualSpent;
  if (!(actualAbsorbed > 0) || !(actualSpent > 0)) return; // pierce/empty shield: never touch provenance

  const known = pm.shieldLedger.reduce((n, e) => n + Math.max(0, e.remaining ?? 0), 0);
  if (shieldBefore > known) pm.shieldLedger.push({ sourceSeat: null, key: null, remaining: shieldBefore - known, mod: null });
  const ordered = [
    ...pm.shieldLedger.filter((e) => e.mod),
    ...pm.shieldLedger.filter((e) => !e.mod),
  ];
  let hit = actualAbsorbed, spendLeft = actualSpent;
  for (const entry of ordered) {
    if (!(hit > 0) || !(spendLeft > 0) || !(entry.remaining > 0)) continue;
    let stopped = 0, spent = 0;
    if (entry.mod === "double") {
      stopped = Math.min(hit, Math.ceil(entry.remaining / 2));
      spent = Math.min(entry.remaining, stopped * 2);
    } else if (entry.mod === "cap1") {
      stopped = Math.min(hit, 1, entry.remaining);
      spent = stopped;
    } else {
      stopped = Math.min(hit, entry.remaining);
      spent = stopped;
    }
    stopped = Math.min(stopped, hit);
    spent = Math.min(spent, spendLeft, entry.remaining);
    entry.remaining -= spent; hit -= stopped; spendLeft -= spent;
    if (entry.sourceSeat && entry.key) {
      const sourcePm = room._combatMetrics?.players?.[entry.sourceSeat];
      if (sourcePm) {
        const cm = _metricCard(sourcePm, entry.key);
        cm.shieldDamageAbsorbed += stopped;
        cm.shieldResourceSpent += spent;
      }
    }
  }
  pm.shieldLedger = pm.shieldLedger.filter((e) => e.remaining > 0);
}

export function finishCombatMetrics(room, result = room?.phase ?? null) {
  const m = room?._combatMetrics;
  if (!m || m.finalized) return combatMetricsSummary(room);
  m.finalized = true; m.result = result; m.endedTick = room.tick ?? m.startedTick;
  for (const p of room.players.values()) {
    const pm = _metricPlayer(room, p);
    if (!pm) continue;
    _metricSyncHand(room, p);
    pm.endHand = (p.hand ?? []).map((c) => c.key);
    pm.hpEnd = p.hp ?? 0; pm.maxHpEnd = p.maxHp ?? 0;
    for (const held of Object.values(pm.holding)) {
      const cm = _metricCard(pm, held.key);
      if ((held.observedTicks ?? 0) > 0) cm.strandedDraws++;
      else cm.unexposedEndDraws++;                 // e.g. replacement drawn by the killing cast
    }
    pm.holding = {};
  }
  return combatMetricsSummary(room);
}

export function combatMetricsSummary(room) {
  const m = room?._combatMetrics;
  if (!m) return null;
  return {
    version: m.version, combat: m.combat, node: m.node, result: m.result,
    ticks: (m.endedTick ?? room.tick ?? m.startedTick) - m.startedTick,
    players: Object.values(m.players).map((p) => ({
      seat: p.seat, owner: p.owner, bot: p.bot, homeBody: p.homeBody, body: p.body, level: p.level,
      starterDeck: p.starterDeck, deck: p.deck, backpack: p.backpack,
      openingHand: p.openingHand, endHand: p.endHand,
      hpStart: p.hpStart, maxHpStart: p.maxHpStart, hpEnd: p.hpEnd, maxHpEnd: p.maxHpEnd,
      handLockedTicks: p.handLockedTicks, disabledTicks: p.disabledTicks,
      attempts: p.attempts, manualAttempts: p.manualAttempts, autoAttempts: p.autoAttempts,
      queued: p.queued, queuedCasts: p.queuedCasts, queueCancelled: p.queueCancelled, rejected: p.rejected,
      incomingDamage: p.incomingDamage, hpDamage: p.hpDamage,
      shieldDamageAbsorbed: p.shieldDamageAbsorbed, shieldResourceSpent: p.shieldResourceSpent,
      healAttempted: p.healAttempted, healEffective: p.healEffective,
      overhealWasted: p.overhealWasted, overhealToShield: p.overhealToShield,
      cards: Object.fromEntries(Object.entries(p.cards).sort(([a], [b]) => a.localeCompare(b))),
    })),
  };
}
// CAST VFX EVENT SEAM — successful card casts publish a tiny, bounded semantic event for the
// renderer. The card definition chooses the visual (`KIT[key].vfx`); the resolver supplies the
// ACTUAL target/lane it selected. No prose or card-name matching crosses the wire. Events are
// gameplay-inert, and the fixed ring prevents AUTO/echo/rapid casts from growing room state forever.
export const CAST_FX_MAX = 12;
export function recordCastFx(room, source, cardKey, lane, target = null) {
  const spec = KIT[cardKey]?.vfx;
  if (!spec || source?._vfxCastKey !== cardKey) return;
  const targets = (Array.isArray(target) ? target : target ? [target] : []).filter((t) => t?.id != null);
  const visualTargets = targets.map((t) => ({ id: t.id,
    side: room.players?.has?.(t.id) || t.side === "hero" ? "hero" : "foe",
    lane: Number.isInteger(t.lane) ? t.lane : (lane | 0) }));
  const id = (room.castFxSeq = (room.castFxSeq ?? 0) + 1);
  (room.castFx ??= []).push({ id, tick: room.tick ?? 0, kind: spec.kind, anchor: spec.anchor, lane: lane | 0,
    sourceSide: source.side === "foe" ? "foe" : "hero",
    ...(visualTargets.length ? { targets: visualTargets, targetId: visualTargets[0].id, targetSide: visualTargets[0].side } : {}) });
  if (room.castFx.length > CAST_FX_MAX) room.castFx.splice(0, room.castFx.length - CAST_FX_MAX);
}
// PLAY A CARD (CARDS_SPEC §5) — replaces the old cooldown `useItem`. Spend moxie, resolve the card's
// ops (ECHO / Giga / school-trigger / Djinn all UNCHANGED), then the card leaves the hand: a fragile
// one-shot is gone for the fight; everything else goes to the DISCARD (exhaust-before-repeat,
// owner 2026-07-01). Draw to refill the hand; a dry deck recycles the discard.
// `pick` (owner 2026-07-07 batch D, PICK CONTRACT): the play message's optional choice string —
// a summon-body option key (Grand Spirit) or a draw-pile card key (Crystal Ball). Validated at the
// op (bad/missing pick falls back — summonBody → the op's default, deckCard → a random draw); a
// pick on a pickless card is simply ignored. Never crashes, never softlocks.
export function playCard(room, player, id, pick = null, opts = {}) {
  if (room.phase !== "playing" || !player.alive) return false;
  const metricAuto = opts?.auto === true;
  const metricQueued = opts?.queued === true;
  _metricSyncHand(room, player);
  if (hasBuff(player, "stasis")) { _metricReject(room, player, null, "stasis", metricAuto); return false; }         // ZA WARUDO (W2-C): a stasis'd hero can't play cards either (symmetric — a foe can cast it at the hero lane; suppression point 1/3)
  const body = leveledBody(player);
  const hi = (player.hand ?? []).findIndex((c) => c.id === id);
  if (hi < 0) { _metricReject(room, player, null, "notInHand", metricAuto); return false; } // stale/double tap or forged id
  const card = player.hand[hi];
  const item = KIT[card.key];
  if (!item?.ops) { _metricReject(room, player, card, "notCastable", metricAuto); return false; } // worn passive — nothing to cast
  const wasFree = !!player.freeNext;
  const doubledByBody = !!player.doubleNext;
  const cost = playCost(card.key, body, player);
  if ((player.moxie ?? 0) < cost) { _metricReject(room, player, card, "unaffordable", metricAuto); return false; }
  player.moxie -= cost;
  player._firstCardPlayed = true;
  if (player.freeNext) player.freeNext = false;      // Pyramid-Scheme Head: the free card is spent on THIS play
  // WANDERING CASTLE (owner 2026-07-06): casting a 5+-cost card grants that much shield (+ his bonus)
  { const th = body?.costlyShield; if (th && cost >= th) { const g = cost + shieldPlus(player); player.shield = (player.shield ?? 0) + g; recordShieldGrantMetric(room, player, player, g, card.key); clog(room, "  ✦ " + logNm(player) + " +" + g + " shield (costly cast)"); } }
  clog(room, "▶ " + logNm(player) + " plays " + (KIT[card.key]?.name ?? card.key));
  // ECHO arms a double; Giga ×4 on staff; armDouble body passive doubles the NEXT card (any school).
  let times = item.type && body?.echo === item.type && player.echoArmed ? 2 : 1;
  const doubledExpensive = body?.doubleExpensive != null && cost >= body.doubleExpensive;
  if (doubledExpensive) times *= 2;
  if (times === 2) player.echoArmed = false;
  if (player.gigaArmed && item.type === "magical") { times *= 4; player.gigaArmed = false; }
  if (player.doubleNext) { times *= 2; player.doubleNext = false; }
  if (player.dualWield && ["melee", "both"].includes(cardKind(card.key)) && cost >= 6) times += 1;   // Dual-Handing Two-Handers: dual-kind cards qualify through their melee half
  // effectBoost: "my <school> cards costing ≥ minCost gain +N"; combo: "your next N cards deal +amount"
  const eb = body?.effectBoost;
  let boost = (eb && item.type === eb.school && cost >= (eb.minCost ?? 0)) ? (eb.amount ?? 1) : 0;
  if (wasFree) boost += player.freeCardOutput ?? 0;
  if (doubledByBody) boost += player.doubleNextOutput ?? 0;
  const discountedMelee = ["melee", "both"].includes(cardKind(card.key))
    && cardCost(card.key, body) < cardCost(card.key);
  if (player.discountedMeleeDamage > 0 && discountedMelee) boost += player.discountedMeleeDamage;
  const usedCombo = (player.combo?.left ?? 0) > 0;
  if (usedCombo) boost += player.combo.amount || 0;
  let dealtTot = 0;
  player._pick = typeof pick === "string" ? pick : null;   // the play's choice, visible to tutor/summonPick ops during THIS resolve only
  player._bothKindsPlay = false;                           // set during resolve when a dual-scaling lane/beam strike fires
  player._vfxCastKey = card.key;                            // only this direct card resolve may publish its authored VFX
  player._metricCardKey = card.key;                         // direct heal/shield telemetry attribution; never leaves this resolve
  try {
    for (let n = 0; n < times; n++) dealtTot += (resolveOps(room, player, item.ops, item.type, boost, cardKind(card.key), card.key) || 0);
  } finally { player._vfxCastKey = null; player._metricCardKey = null; }
  const staticKind = cardKind(card.key);
  const bothKinds = staticKind === "both" || player._bothKindsPlay; player._bothKindsPlay = false; // static dual-kind cards and lane-form strikes both feed both trigger families
  player._pick = null;                                     // never leaks into a later play (a doubled tutor re-picks randomly — the card's already in hand)
  if (item.type) fireSchoolTrigger(room, player, item.type);
  spendTriggerPassives(room, player, cost, item.type); // school-tagged so {spend,school} clocks count right
  const trigKind = bothKinds ? "both" : triggerKind(card.key);
  playTriggerPassives(room, player, trigKind);                                   // {play}/{pairMR} body clocks
  dealtTriggerPassives(room, player, dealtTot, staticKind === "ranged", bothKinds); // {dealtMelee}/{dealtRanged} — dual-kind cards feed BOTH
  cardEventPassives(room, player, dealtTot, trigKind, _isDamageCard(card.key));  // onDeal / onPlayNonDmg / onPlayRanged / onPlayMelee — by triggerKind
  if (doubledExpensive && (player.expensiveCardShield ?? 0) > 0) {
    const gain = player.expensiveCardShield + shieldPlus(player);
    player.shield = (player.shield ?? 0) + gain;
    recordShieldGrantMetric(room, player, player, gain, card.key);
  }
  const firstRanged = !player._firstRangedPlayed && (trigKind === "ranged" || trigKind === "both");
  if (firstRanged) player._firstRangedPlayed = true;
  if (firstRanged && player.firstRangedRefund > 0) {
    const before = player.moxie;
    player.moxie = Math.min(MOXIE_CAP, player.moxie + player.firstRangedRefund);
    gainTriggerPassives(room, player, player.moxie - before);
  }
  if (usedCombo && player.combo) { if (--player.combo.left <= 0) player.combo = null; } // spend one combo charge
  if (player.comboPending) { player.combo = player.comboPending; player.comboPending = null; } // a comboBuff just set the next run
  echoDelay(player);                                 // every play pushes the wearer's own echo bar back
  { const mr = moxieOnPlayBonus(player); if (mr) player.moxie = Math.min(MOXIE_CAP, (player.moxie ?? 0) + mr); } // Cool Shoes: +moxie on every play
  (room.useCounts ??= {})[card.key] = ((room.useCounts ?? {})[card.key] ?? 0) + 1; // telemetry: per-room casts
  _metricCast(room, player, card, cost, metricAuto, metricQueued);
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
  // OVER-SIZE DRAIN (owner 2026-07-09): an OVER-HAND_SIZE hand — a tutor (Crystal Ball) pushed an
  // EXTRA card past the normal size — does NOT get a replacement draw. The played card just leaves,
  // so the hand drains back toward HAND_SIZE instead of locking the extra slot in forever. This makes
  // the tutored card a ONE-SHOT (owner REVERSED the earlier "hand permanently grows" call): once it's
  // played/discarded the hand returns to its normal size, never a standing bonus slot every draw.
  if (player.hand.length > HAND_SIZE) {
    player.hand.splice(hi, 1);                       // drain: remove the played card, no replacement (hand shrinks toward HAND_SIZE)
  } else {
    if ((player.deck?.length ?? 0) === 0) recycleDeck(player);
    if ((player.deck?.length ?? 0) > 0) player.hand.splice(hi, 1, player.deck.shift());
    else player.hand.splice(hi, 1);
  }
  drawUp(player);                                    // top up any still-empty slots (no-op in the common case)
  _metricSyncHand(room, player);                     // replacement/tutor draws are counted once by instance id
  return true;
}

// One-slot manual intent queue.  The client may tap a card before it can be paid for; the server
// owns that intent, recomputes its live cost every tick, and fires it at the first legal moment.
// A second tap on the same still-unaffordable card toggles it off; another card replaces it.
export function requestCardPlay(room, player, id, pick = null) {
  if (room?.phase !== "playing" || !player?.alive) return false;
  _metricSyncHand(room, player);
  const card = (player.hand ?? []).find((c) => c.id === id);
  if (!card) { _metricReject(room, player, null, "notInHand", false); return false; }
  if (!KIT[card.key]?.ops) { _metricReject(room, player, card, "notCastable", false); return false; }
  const cleanPick = typeof pick === "string" ? pick : null;
  const cost = playCost(card.key, leveledBody(player), player);
  if ((player.moxie ?? 0) >= cost && !hasBuff(player, "stasis") && !(room.freezeHeroes > 0)) {
    cancelQueuedCard(room, player, "replacement", false);
    return playCard(room, player, id, cleanPick);
  }
  const old = player.queuedCard;
  if (old?.id === id && old.pick === cleanPick) {
    cancelQueuedCard(room, player, "toggle");
    return true;
  }
  cancelQueuedCard(room, player, "replacement");
  player.queuedCard = { id, pick: cleanPick, queuedTick: room.tick ?? 0 };
  _metricQueue(room, player, card);
  return true;
}

export function cancelQueuedCard(room, player, reason = "input", countMetric = true) {
  if (!player?.queuedCard) return false;
  const queued = player.queuedCard;
  player.queuedCard = null;
  if (countMetric) _metricQueueCancel(room, player, (player.hand ?? []).find((c) => c.id === queued.id));
  return true;
}

export function tryQueuedCard(room, player) {
  const queued = player?.queuedCard;
  if (!queued || room?.phase !== "playing" || !player.alive) return false;
  const card = (player.hand ?? []).find((c) => c.id === queued.id);
  if (!card || !KIT[card.key]?.ops) { cancelQueuedCard(room, player, "invalid"); return false; }
  if (hasBuff(player, "stasis") || room.freezeHeroes > 0) return false;
  const cost = playCost(card.key, leveledBody(player), player);
  if ((player.moxie ?? 0) < cost) return false;
  player.queuedCard = null;
  const fired = playCard(room, player, card.id, queued.pick, { queued: true });
  if (!fired) player.queuedCard = queued;
  return fired;
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
const _opsCanDamage = (ops) => (ops ?? []).some((o) => _DMG_OPS.has(o.do) || (o.do === "timer" && _opsCanDamage(o.ops)));
const _isDamageCard = (key) => _opsCanDamage(KIT[key]?.ops);
export function autoPlay(room, p) {
  const hand = p.hand ?? [], bd = leveledBody(p);
  const cost = (c) => cardCost(c.key, bd);
  const aff = hand.filter((c) => cost(c) <= (p.moxie ?? 0));
  if (!aff.length) return;                                              // nothing affordable — bank
  const priciest = (list) => list.reduce((a, b) => (cost(b) > cost(a) ? b : a));
  const dmgAff = aff.filter((c) => _isDamageCard(c.key));
  if (dmgAff.length) return void playCard(room, p, priciest(dmgAff).id, null, { auto: true }); // hit something now
  const pendingDmg = hand.some((c) => _isDamageCard(c.key) && cost(c) > (p.moxie ?? 0));
  if (pendingDmg && (p.moxie ?? 0) < MOXIE_CAP) return;                 // bank toward the real hit
  playCard(room, p, priciest(aff).id, null, { auto: true });             // else best utility/heal/buff
}

// FOE CAST (symmetric with playCard): spend moxie on the FRONT queue card if affordable, resolve its
// ops (echo/school-trigger included), then rotate it to the back. One cast per tick. Returns bool.
// a foe's EFFECTIVE card cost: the same body discount you get, minus any elite-room gimmick cut (Cut-Rate Foes).
export const foeCardCost = (key, bd, room) => Math.max(0, cardCost(key, bd) - (room?.gimmick?.foeCostCut ?? 0));

export function foeCast(room, e) {
  const q = e.queue;
  if (!q || !q.length) return false;
  const card = q[0], item = KIT[card.key], bd = leveledBody(e);
  if (!item?.ops) { q.push(q.shift()); return false; }   // dud guard (passives shouldn't be queued)
  if (hasBuff(e, "stasis")) return false;                // ZA WARUDO (W2-C): can't play cards — hold the queue, don't cycle it (suppression point 1/3)
  const wasFree = !!e.freeNext;
  const doubledByBody = !!e.doubleNext;
  const cost = Math.max(0, playCost(card.key, bd, e) - (room?.gimmick?.foeCostCut ?? 0));
  if ((e.moxie ?? 0) < cost) return false;               // not enough moxie yet
  e.moxie -= cost;
  e._firstCardPlayed = true;
  if (e.freeNext) e.freeNext = false;                    // Pyramid-Scheme Head (symmetric)
  { const th = bd?.costlyShield; if (th && cost >= th) { const g = cost + shieldPlus(e); e.shield = (e.shield ?? 0) + g; clog(room, "  ✦ " + logNm(e) + " +" + g + " shield (costly cast)"); } } // Wandering Castle
  clog(room, "↳ " + logNm(e) + " casts " + (KIT[card.key]?.name ?? card.key));
  let times = item.type && bd?.echo === item.type && e.echoArmed ? 2 : 1;
  const doubledExpensive = bd?.doubleExpensive != null && cost >= bd.doubleExpensive;
  if (doubledExpensive) times *= 2;
  if (times === 2) e.echoArmed = false;
  if (e.doubleNext) { times *= 2; e.doubleNext = false; }
  if (e.dualWield && ["melee", "both"].includes(cardKind(card.key)) && cost >= 6) times += 1;   // Dual-Handing Two-Handers (symmetric): dual-kind cards qualify through melee
  const eb = bd?.effectBoost;
  let boost = (eb && item.type === eb.school && cost >= (eb.minCost ?? 0)) ? (eb.amount ?? 1) : 0;
  if (wasFree) boost += e.freeCardOutput ?? 0;
  if (doubledByBody) boost += e.doubleNextOutput ?? 0;
  const discountedMelee = ["melee", "both"].includes(cardKind(card.key))
    && cardCost(card.key, bd) < cardCost(card.key);
  if (e.discountedMeleeDamage > 0 && discountedMelee) boost += e.discountedMeleeDamage;
  const usedCombo = (e.combo?.left ?? 0) > 0;
  if (usedCombo) boost += e.combo.amount || 0;
  let dealtTot = 0;
  e._bothKindsPlay = false;                              // set during resolve when a dual-scaling lane/beam strike fires (symmetric)
  e._vfxCastKey = card.key;                                 // symmetric: foe/summon casts use the same semantic seam
  try {
    for (let n = 0; n < times; n++) dealtTot += (resolveOps(room, e, item.ops, item.type, boost, cardKind(card.key), card.key) || 0);
  } finally { e._vfxCastKey = null; }
  const staticKind = cardKind(card.key);
  const bothKinds = staticKind === "both" || e._bothKindsPlay; e._bothKindsPlay = false; // static dual-kind cards and lane-form strikes both feed both trigger families
  if (item.type) fireSchoolTrigger(room, e, item.type);  // foe "when I sword/staff" fires too
  spendTriggerPassives(room, e, cost, item.type);        // school-tagged spend → body clocks
  const trigKind = bothKinds ? "both" : triggerKind(card.key);
  playTriggerPassives(room, e, trigKind);                                     // {play}/{pairMR} body clocks
  dealtTriggerPassives(room, e, dealtTot, staticKind === "ranged", bothKinds); // {dealtMelee}/{dealtRanged} — dual-kind cards feed BOTH
  cardEventPassives(room, e, dealtTot, trigKind, _isDamageCard(card.key));    // onDeal / onPlayNonDmg / onPlayRanged / onPlayMelee — by triggerKind
  if (doubledExpensive && (e.expensiveCardShield ?? 0) > 0) {
    const gain = e.expensiveCardShield + shieldPlus(e);
    e.shield = (e.shield ?? 0) + gain;
  }
  const firstRanged = !e._firstRangedPlayed && (trigKind === "ranged" || trigKind === "both");
  if (firstRanged) e._firstRangedPlayed = true;
  if (firstRanged && e.firstRangedRefund > 0) {
    const before = e.moxie;
    e.moxie = Math.min(MOXIE_CAP, e.moxie + e.firstRangedRefund);
    gainTriggerPassives(room, e, e.moxie - before);
  }
  if (usedCombo && e.combo) { if (--e.combo.left <= 0) e.combo = null; }
  if (e.comboPending) { e.combo = e.comboPending; e.comboPending = null; }
  echoDelay(e);
  { const mr = moxieOnPlayBonus(e); if (mr) e.moxie = Math.min(MOXIE_CAP, (e.moxie ?? 0) + mr); } // Cool Shoes (symmetric): +moxie on every cast
  if (item.lasting) q.shift();   // a fight-long PASSIVE leaves the queue, never cycles back (symmetric w/ players' inPlay)
  else q.push(q.shift());                                 // front → back
  return true;
}

export function tickDjinnCounter(room, player) {
  return false; // Djinn's retired every-third-party-card trigger is absent from the authored deck
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

// FLAT body damage-reduction — the existing DR primitive (Litigation Lich / hedgeKnight body.dmgReduce)
// generalised to a PER-COMBATANT override so the Warewolf's form can toggle it live: read the combatant's
// own `dmgReduce` when set (0 in wolf form is a real 0, so `??` keeps it — never falls back to the body),
// else the static BODIES value. Symmetric — used by the foe AND player damage paths + the snapshot readout.
export const bodyFlatDR = (c) => c?.dmgReduce ?? BODIES[c?.bodyKey]?.dmgReduce ?? 0;

// SWORDS OF REVEALING LIGHT (OWNER RULINGS 2026-07-11: "it turns every hit against it into 1…
// its own buff, cost 7"; addendum: COUNT-based — the NEXT 3 instances of incoming damage each
// become exactly 1, no time limit): `c.revealLight` is a charge counter (the Mirror Shield
// count-charge grammar — a defensive charge consumed per qualifying hit, chip shows the count).
// Each incoming damage instance that WOULD deal >0 consumes one charge and lands as exactly 1;
// the counter hits 0 → the buff is spent (4th hit takes full damage). A cap, not a subtraction —
// applied at every damage-application site.
// FLAG ordering (mechanical, owner to confirm): the cap runs LAST among mitigations (after body DR /
//   stance caps / worn DR / Stoneskin / auras — a hit those already zeroed stays 0, consumes NO
//   charge) and BEFORE the shield buffer, so the converted 1 then feeds shields/HP as one point.
// FLAG: a hit of exactly 1 still consumes a charge (it IS an instance of incoming damage).
// FLAG: pierce hits (Butterfly Knife / Mirror Mace / Meteor Maul) bypass it like every defensive
//   effect and consume NO charge; authored/raw self-hits (Berserker/Crimson Crown) stay uncapped.
function revealLightCap(c, amount) {
  if (!(amount > 0) || !((c?.revealLight ?? 0) > 0)) return amount;
  c.revealLight--;                                   // one conversion spent (3 → 2 → 1 → 0)
  return Math.min(amount, 1);                        // the hit becomes exactly 1 (owner's number)
}

export function effectiveDamageTo(room, enemy, amount) {
  const body = BODIES[enemy.bodyKey] ?? {};
  if (body.ward && foeCount(room) > 1) return 0;       // protected while its court stands
  const bdr = enemy.dmgReduce ?? body.dmgReduce;       // Warewolf form DR overrides the static body DR (wolf=0 preserved)
  if (bdr && amount > 0) amount = Math.max(1, amount - bdr);  // FLAG DR floor: min 1 (a point always slips), matching the existing body.dmgReduce convention
  // Litigation Lich stances (BOSS_SPEC_V1): ⚖ OBJECTION caps every hit it takes at 1;
  // recess softens every hit by 1, but a point always slips through (the engine's existing
  // ≥1 convention — so school-tagged deals keep their weapon floor unless the CAP is up).
  if (enemy.stance === "objection" && amount > 0) amount = Math.min(amount, 1);
  else if (enemy.stance === "recess" && amount > 0) amount = Math.max(1, amount - 1);
  const dr = itemDmgReduce(enemy) + buffAmt(enemy, "stoneskin"); // worn Aegis + Stone Skin soften every hit (floor 0)
  if (dr && amount > 0) amount = Math.max(0, amount - dr);
  return revealLightCap(enemy, amount);                // Swords of Revealing Light: next-3-hits-become-1 charges (owner 2026-07-11)
}

// Bounded, structured damage history. The prose combat log remains useful for reading the whole
// fight, but defeat explanations must not reverse-engineer mechanics from that prose: every resolved
// hit records its source/card, mitigation, shield movement, real HP loss, and whether it was lethal.
const DAMAGE_EVENT_MAX = 96;
function damageEntityRef(room, entity) {
  if (!entity) return null;
  const side = entity.side === "foe" ? "foe" : "hero";
  const bodyName = BODIES[entity.bodyKey]?.name ?? entity.bodyKey ?? entity.name ?? "Unknown body";
  const isPlayer = !!room?.players?.has?.(entity.id);
  const playerName = isPlayer ? (entity.name ?? null) : null;
  const label = side === "foe" ? `foe ${bodyName}`
    : (playerName && playerName !== bodyName ? `${bodyName} (${playerName})` : bodyName);
  return { id: entity.id ?? null, side, bodyKey: entity.bodyKey ?? null, bodyName,
    playerName, label, summon: side === "hero" && !isPlayer };
}

function resolvedDamageCause(room, source, opts = {}) {
  const ctx = room?._damageContext;
  // A nested reaction (Atlas, thorns, poison, etc.) can fire while another card's context is live.
  // Only inherit that card when it belongs to this exact damage source.
  if (ctx && ctx.source === source)
    return { type: ctx.type ?? "effect", key: ctx.key ?? null, name: ctx.name ?? "Unknown effect" };
  if (opts.cause)
    return { type: opts.direct ? "direct" : "effect", key: opts.causeKey ?? null, name: String(opts.cause) };
  if (source) return { type: "body", key: null, name: BODIES[source.bodyKey]?.name ?? source.name ?? "Attack" };
  return { type: "effect", key: null, name: "Unattributed damage" };
}

function recordDamageEvent(room, target, afterDefense, hpBefore, shieldBefore, opts = {}) {
  const source = opts.source ?? null;
  const hpAfter = Math.max(0, target?.hp ?? 0), shieldAfter = Math.max(0, target?.shield ?? 0);
  const event = {
    id: room.damageEventSeq = (room.damageEventSeq ?? 0) + 1,
    tick: room.tick ?? 0,
    direct: opts.direct === true,
    pierce: opts.pierce === true,
    lethal: hpBefore > 0 && hpAfter <= 0,
    source: damageEntityRef(room, source),
    target: damageEntityRef(room, target),
    cause: resolvedDamageCause(room, source, opts),
    requested: Math.max(0, opts.requested ?? afterDefense ?? 0),
    afterDefense: Math.max(0, afterDefense ?? 0),
    shieldBefore: Math.max(0, shieldBefore ?? 0),
    shieldAfter,
    shieldAbsorbed: Math.max(0, (shieldBefore ?? 0) - shieldAfter),
    hpBefore: Math.max(0, hpBefore ?? 0),
    hpAfter,
    hpLost: Math.max(0, (hpBefore ?? 0) - hpAfter),
  };
  (room.damageEvents ??= []).push(event);
  if (room.damageEvents.length > DAMAGE_EVENT_MAX)
    room.damageEvents.splice(0, room.damageEvents.length - DAMAGE_EVENT_MAX);
  return event;
}

function damageCauseLabel(event) {
  const source = event?.source?.label, cause = event?.cause?.name;
  if (event?.cause?.type === "body") return source ?? cause ?? "Unattributed damage";
  if (source && cause) return `${source} — ${cause}`;
  return cause ?? source ?? "Unattributed damage";
}

function logDamageEvent(room, event, glyph) {
  if (!event) return;
  const cause = damageCauseLabel(event);
  const shield = event.shieldAbsorbed > 0
    ? ` · shield ${event.shieldBefore}→${event.shieldAfter} (${event.shieldAbsorbed} absorbed)` : "";
  const hp = ` · HP ${event.hpBefore}→${event.hpAfter} (${event.hpLost} lost)`;
  const lethal = event.lethal ? " · LETHAL" : "";
  if (event.direct) {
    clog(room, `  ${glyph} ${event.hpLost} direct HP loss to ${event.target?.label ?? "target"} (from ${cause})${hp}${lethal}`);
    return;
  }
  clog(room, `  ${glyph} ${event.afterDefense}${event.pierce ? " ⚔ pierces " : " to "}${event.target?.label ?? "target"} (from ${cause})${shield}${hp}${lethal}`);
}

// Hero-side damage to a foe. `attacker` (the hero/summon dealing it) feeds the lane auras
// (Flag: +1 out) and thorns reflection; pass nothing for source-less damage (acid, thorns).
// Returns the damage that LANDED (past ward/armor/auras, into shield+HP) — lifesteal's feed.
export function damageEnemy(room, laneIdx, enemy, amount, attacker = null, opts = {}) {
  // PIERCE (owner 2026-07-10, W2-A): a `pierce` deal IGNORES EVERY defensive effect on the foe — the
  // foe-side Totem dmgReduce aura, ward, body dmgReduce, the Litigation-Lich stance caps, worn DR +
  // stoneskin (all of effectiveDamageTo), AND the shield buffer — landing full damage straight on HP.
  // Offensive lane bonuses (the attacker's own Flag/Knight dmgBonus) STILL apply: pierce skips the
  // foe's DEFENCE, not the striker's buff. On-damaged triggers, Blood To Iron, and thorns/mirror still
  // fire on the gross hit (pierce beats mitigation, not the foe's reactions). FOE-SIDE SYMMETRY WIRED
  // (owner 2026-07-10, MOD-3): a FOE that rolls a piercing card (they're pooled, target:"front") now
  // pierces too — the front-melee path threads op.pierce → foeHitLane → damagePlayer (see below).
  const pierce = opts?.pierce === true;
  // NO-REACT (Butterfly Knife, OWNER RULING 2026-07-11 "should not trigger any defensive actions"):
  // an `opts.noReact` hit fires NO reactive hook on the victim — no on:"damaged" body passives (Fat
  // Cat rat / Market-Crash Minotaur counter), no accel/hit-clock ramps, no Atlas shrug, no Blood-To-
  // Iron count, no boss on-damaged, no thorns/mirror reflect. Damage/death handling is unchanged.
  // FLAG property name `noReact` (mechanical; symmetric with damagePlayer below).
  const noReact = opts?.noReact === true;
  enemy.lane = laneIdx; enemy.side = "foe";
  if (attacker) amount += laneAura(room, attacker, "dmgBonus");  // hero-side Flag/Knight (OFFENSIVE — pierce keeps it)
  const rawHit = amount;                                // the FULL swing — Mirror Shield's reflect magnitude (owner 2026-07-11)
  if (!pierce) {
    amount -= laneAura(room, enemy, "dmgReduce");                // a foe-side Totem softens the hit
    amount = effectiveDamageTo(room, enemy, amount);            // ward / body dmgReduce / stance caps / worn DR + stoneskin + revealLight cap
  }
  if (amount <= 0) return 0;                            // warded/fully-absorbed: no hit, no on-damaged trigger
  const landed = amount;
  const hpBefore = Math.max(0, enemy.hp ?? 0), shieldBefore = Math.max(0, enemy.shield ?? 0);
  if (enemy.bloodToIron && !noReact) enemy.bloodToIron.stored += 1;   // Blood To Iron (foe side): count the HIT — 1 shield per instance (owner 2026-06-27); a noReact hit is never counted
  amount = pierce ? amount : absorbShield(enemy, amount); // pierce skips the shield buffer — straight to HP; else the shield eats the hit first
  if (amount > 0) enemy.hp -= amount;
  const event = recordDamageEvent(room, enemy, landed, hpBefore, shieldBefore, {
    ...opts, source: opts?.source ?? attacker, requested: rawHit, pierce,
  });
  logDamageEvent(room, event, "→");
  if (amount > 0 && enemy.hp <= 0) {
      clog(room, "  ☠ " + logNm(enemy) + " falls");
      const lane = room.lanes[laneIdx];
      const i = lane.indexOf(enemy);
      if (i >= 0) lane.splice(i, 1);
      // Legacy onKill passives fire for the hero defenders in this lane. Generic onDefeat passives
      // are handled symmetrically by defeatTriggerPassives below.
      for (const h of laneHeroes(room, laneIdx)) { const ap = leveledPassives(h); for (const pk of ap) if (pk.onKill) resolveOps(room, h, pk.ops, pk.school || null); }
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
      // KILL TRACKING (owner 2026-07-10, Affluence Anubis): count EVERY foe-side body felled this combat on
      // the foe-side counter — real foes, the boss, AND summon TOKENS (rats/tentacles/animated items). Owner
      // RULED (2026-07-10) enemy summon tokens MUST count ("punishing enemy rats adding to his summon pool");
      // the hero side mirrors this by counting ally tokens in hurtAllyToken/foeHitLaneAll (room.defeated.hero).
      (room.defeated ??= { hero: 0, foe: 0 }).foe++;
      defeatTriggerPassives(room, laneIdx);
  }
  genericDealtTrigger(room, attacker, landed);
  poisonDamageTarget(room, attacker, enemy, landed);
  if (enemy.ratStack && enemy.hp > 0) syncRatStack(enemy);   // a surviving rat-stack drops to "N rats", bite N
  // ON-DAMAGED triggers fire on the GROSS hit whenever the foe SURVIVES — even if its shield ate the
  // whole blow (owner 2026-06-24: "damage taken" counts shielded damage; a shielded Fat Cat still rats).
  if (enemy.hp > 0 && !noReact) {               // Butterfly Knife (owner 2026-07-11): a noReact hit fires NONE of these
    runPassive(room, enemy, "damaged"); // e.g. Fat Cat spawns a rat when hit
    accelClocks(enemy, "damaged");              // a hit speeds bruiser ramp clocks
    hitTriggerPassives(room, enemy, landed);    // {hit}/{spendOrHit} clocks ramp on damage taken (gross)
    atlasReflect(room, enemy, landed);          // Atlas, Shrugging: every 10 taken → 10 to his whole lane
    if (BODIES[enemy.bodyKey]?.boss) bossOnDamaged(room, enemy, laneIdx, landed); // Hydra: a head per POINT landed
  }
  if (!noReact) reflectThorns(room, enemy, attacker, landed, rawHit);   // a thorned/mirrored foe spikes its striker back (symmetric); mirror reflects the RAW hit (owner 2026-07-11)
  return landed;
}

// Returns the damage that LANDED (past auras/armor, into shield+HP).
// PIERCE (owner 2026-07-10, MOD-3 foe-side symmetry): an `opts.pierce` hit IGNORES every player
// DEFENCE — the lane dmgReduce aura, worn Crown DR + Stone Skin, AND the shield buffer — landing
// full damage straight on HP. The player's REACTIONS still fire (on-damaged passives, bruiser ramp,
// Atlas shrug, Blood To Iron count): pierce beats mitigation, not the target's reactions. Mirrors
// damageEnemy's pierce exactly, so a FOE casting Butterfly/Mirror/Meteor bypasses player defenses.
export function damagePlayer(room, p, amount, opts = {}) {
  if (!p.alive) return 0;
  const requested = amount;
  const pierce = opts?.pierce === true;
  const noReact = opts?.noReact === true;         // Butterfly Knife (owner 2026-07-11): the hit fires NO reactive hook on the victim (mirror of damageEnemy)
  if (!pierce) {
    amount -= laneAura(room, p, "dmgReduce");       // Totem/Knight: lane allies take −1
    const bdr = bodyFlatDR(p);                       // WAREWOLF form DR / static body DR — the player mirror of effectiveDamageTo (was foe-only before; a player-worn body-DR body had NO reduction until now)
    if (bdr && amount > 0) amount = Math.max(1, amount - bdr);  // min-1 floor, matching effectiveDamageTo's body-DR convention
    const dr = itemDmgReduce(p) + buffAmt(p, "stoneskin");  // worn Crown + Stone Skin soften every hit (floor 0)
    if (dr && amount > 0) amount = Math.max(0, amount - dr);
    amount = revealLightCap(p, amount);             // Swords of Revealing Light: next-3-hits-become-1 charges (owner 2026-07-11; last mitigation, before shields)
  }
  if (amount <= 0) return 0;
  const landed = amount;
  if (p.bloodToIron && !noReact) p.bloodToIron.stored += 1;   // Blood To Iron: count the HIT — 1 shield per instance (owner 2026-06-27), repaid as shield later; a noReact hit is never counted
  const metricHpBefore = p.hp ?? 0, metricShieldBefore = p.shield ?? 0;
  amount = pierce ? amount : absorbShield(p, amount); // pierce skips the shield buffer — straight to HP; else the per-body shield eats the hit before HP
  p.hp -= amount;                                 // amount is 0 when the shield ate the whole hit
  const died = p.hp <= 0;
  if (died) p.hp = 0;
  const event = recordDamageEvent(room, p, landed, metricHpBefore, metricShieldBefore, {
    ...opts, source: opts?.source ?? null, requested, pierce,
  });
  logDamageEvent(room, event, "✖");
  if (died) { p.alive = false; cancelQueuedCard(room, p, "down"); clog(room, "  ☠ " + logNm(p) + " goes DOWN"); (room.defeated ??= { hero: 0, foe: 0 }).hero++; defeatTriggerPassives(room, p.lane); }
  // ON-DAMAGED triggers fire on the GROSS hit even when a shield fully absorbs it (owner 2026-06-24:
  // "damage taken" counts shielded damage — a shielded Fat Cat still earns its rat).
  else if (!noReact) { runPassive(room, p, "damaged"); accelClocks(p, "damaged"); hitTriggerPassives(room, p, landed); atlasReflect(room, p, landed); } // worn on-damaged + bruiser ramp + Atlas shrug — ALL skipped on a noReact hit
  { const pm = _metricPlayer(room, p); if (pm) {
    pm.incomingDamage += landed;
    pm.hpDamage += Math.max(0, metricHpBefore - (p.hp ?? 0));
    recordShieldAbsorbMetric(room, p, landed, amount, metricShieldBefore, p.shield ?? 0);
  } }
  genericDealtTrigger(room, opts?.source, landed);
  poisonDamageTarget(room, opts?.source, p, landed);
  return landed;
}

// Some authored boss effects set HP directly instead of dealing a normal hit.  Keep that mechanic
// exact (no shields, mitigation, reactions, or on-hit triggers) while still making the causal loss
// visible in the combat log and incoming-damage telemetry.  Litigation Lich's Annihilate uses this.
export function forcePlayerHp(room, p, hp, opts = {}) {
  if (!p?.alive) return 0;
  const before = p.hp ?? 0;
  const after = Math.max(0, Math.min(before, hp ?? before));
  const lost = before - after;
  if (!(lost > 0)) return 0;
  p.hp = after;
  const event = recordDamageEvent(room, p, lost, before, p.shield ?? 0, {
    ...opts, source: opts?.source ?? null, requested: lost, direct: true, pierce: true,
  });
  logDamageEvent(room, event, "✖");
  const pm = _metricPlayer(room, p);
  if (pm) { pm.incomingDamage += lost; pm.hpDamage += lost; }
  return lost;
}

// One simulation step. Pure: never broadcasts. The server calls this then broadcasts.
export function simulateTick(room) {
  room.tick++;
  if (room.phase !== "playing") return;
  // ⏳ Time Stop counters (one per side — a foe-held Time Stop freezes the heroes)
  if (room.freezeFoes > 0) room.freezeFoes--;
  if (room.freezeHeroes > 0) room.freezeHeroes--;

  for (const p of room.players.values()) {
    if (!p.alive) { cancelQueuedCard(room, p, "down"); continue; } // downed heroes stay out unless a Revive item brings them back
    ensureTarget(room, p); // always keep a valid aim
    tickBuffs(p);
    if (room.freezeHeroes > 0) { tickCombatMetrics(room, p); continue; } // frozen heroes: every clock stands still; telemetry records disabled time, not false unaffordability
    tickRegens(p, room); tickBloodToIron(p, room); tickPoison(room, p, p.lane); tickLeeches(room, p, p.lane);  // ongoing card effects (Trollskin / Liquid Metal / Blood To Iron / Poison / Pet Leech); room threaded for Berserker self-hit triggers
    const body = BODIES[p.bodyKey];
    const step = 1 + (hasBuff(p, "haste") ? 1 : 0); // Haste: moxie charges double-speed
    { const _pm0 = p.moxie ?? 0; regenMoxie(p, step); gainTriggerPassives(room, p, (p.moxie ?? 0) - _pm0); }   // +1 moxie/sec + {gain:N} body clocks (owner 2026-06-27)
    tickCombatMetrics(room, p);                     // aggregate hand exposure after regen, before AUTO can spend/draw
    // A queued manual card gets first claim on this tick's freshly-earned moxie.  If it fires,
    // AUTO must not also spend/draw in the same tick; if it is still waiting, AUTO stays parked so
    // it cannot steal the banked moxie out from under the explicit manual intent.
    const queuedIntent = !!p.queuedCard;
    const queuedFired = queuedIntent && tryQueuedCard(room, p);
    // AUTO play (owner 2026-06-12: "tired of clicking"): play the most-expensive AFFORDABLE card in
    // hand — best use of the moxie on the board — one per tick. Manual stays the default.
    if (p.autoFire && !queuedIntent && !queuedFired) autoPlay(room, p);
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
      tickRegens(e, room); tickBloodToIron(e, room); tickPoison(room, e, i); tickLeeches(room, e, i);  // ongoing card effects, foe side (symmetry; Pet Leech drains ride the carrier)
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
      if (e.clocks || e.coreClocks || e.castBars) tickBossClocks(room, e);
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
      tickRegens(al, room); tickBloodToIron(al, room); tickPoison(room, al, i); tickLeeches(room, al, i);
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
    const boss = room.boss;                         // poison/leech can kill it and clear room.boss mid-tick
    boss.side = "foe"; tickBuffs(boss);
    if (!(room.freezeFoes > 0)) {                   // ⏳ Time Stop freezes bosses too
      tickPoison(room, boss, boss.lane | 0);
      if (room.boss === boss && boss.hp > 0) tickLeeches(room, boss, boss.lane | 0);
      if (room.boss === boss && boss.hp > 0) tickBossClocks(room, boss);
    }
  }

  if (!(room.freezeFoes > 0)) tickTornadoes(room);

  if (!(room.freezeFoes > 0)) processRoomTimers(room); // Acid Rain / Rat Colony freeze with the foes

  const enemiesLeft = room.lanes.reduce((n, l) => n + l.length, 0) + (bossAlive(room) ? 1 : 0);
  const heroesAlive = [...room.players.values()].some((p) => p.alive);
  const alliesLeft = room.allies.reduce((n, l) => n + l.length, 0);
  if (enemiesLeft === 0) {
    room.phase = "won";
    finishCombatMetrics(room, "won");              // capture HP/hand BEFORE room-clear heal and loot mutations
    // Clearing a room patches the party back up — full heal + revive any downed heroes,
    // so you head into the loot/next-room screen whole.
    for (const p of room.players.values()) {
      // GIANT'S BELT (owner playtest 2026-07-10): the belt's "+maxHp for THIS fight" (giantBelt op) is
      // undone HERE, at fight END, BEFORE the full heal — no longer deferred to the next beginCombat.
      // Deferring let the stale _giantBase snapshot survive a between-room LEVEL-UP or BODY-SWAP (both
      // recompute maxHp from scratch, ignoring _giantBase) and then clobber that correct maxHp at the next
      // beginCombat — a L2 Minotaur entered 7/7 instead of 13/13. Reverting at room-clear means the snapshot
      // never outlives the fight it was cast in. `_giantBase` = the snapshotted base health (see
      // applyGiantBelt); restoring it drops the belt's +base-health bonus at fight end.
      if (p._giantBase) { p.maxHp = p._giantBase; p._giantBase = null; }
      p.alive = true; p.downTimer = 0; p.hp = p.maxHp;
    }
    // Loot — ANTE V2 (owner 2026-07-02): EVERY ante point drops, so a room's ⚖ IS its ◈. The felled
    // foes' carried cards drop as themselves; their LEVELS, their ELITE-BODY premiums, and the room
    // EFFECT's pot all "take the form of random items" (rollCompItems — exact value, no overshoot).
    const gear = (room.draftedFoes ?? []).flatMap((f) => f.gear ?? []).filter((k) => KIT[k]);
    // the surplus above every foe's base-4 body/action tax — its LEVELS (2 each) and its ELITE-BODY
    // premium — plus the room EFFECT's pot, all drop as THAT MANY random treasures (owner
    // 2026-07-03). Each foe's flat +4 base is a threat-only cover charge and does NOT drop.
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
    // TELEMETRY (owner 2026-07-09): stash the FULL offered set + (solo) what was auto-taken BEFORE the
    // solo collect wipes room.loot. Solo has no claim screen, so without this the offered loot — and in
    // solo the picked loot too — was invisible to telemetry, making pick-RATE uncomputable. Pure data.
    room.lootRoll = [...room.loot];
    room.lootTaken = null;
    if (room.players.size === 1) {
      const solo = [...room.players.values()][0];
      room.lootTaken = room.loot.filter((k) => KIT[k]);
      for (const k of room.lootTaken) (solo.backpack ??= []).push(k);
      room.loot = [];
    }
  }
  // THE SOLE LOSS (owner 2026-06-27, caravan deleted): you are in the run as long as ANY of your
  // combatants — a player body OR a summon — is alive. A lone surviving rat-stack keeps you in. The
  // party loses only when EVERY player body AND EVERY summon is defeated. (Checked AFTER the win
  // above, so an ally that clears the board on its dying tick still scores the win.)
  else if (!heroesAlive && alliesLeft === 0) { room.phase = "lost"; finishCombatMetrics(room, "lost"); if (!room._endLogged) { room._endLogged = true; clog(room, "═══ YOUR PARTY FALLS ═══"); } }

  // (Anti-stall auto-LOSS removed 2026-06-24 — owner: "not needed." A slow fight no longer times out
  // into a surprise loss; the deadlock guard above still ends a genuinely wiped party. STALL_LIMIT is
  // kept exported only for the QA driver's stuck-detection.)
}
