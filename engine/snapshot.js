// King Mimic engine — client snapshot projection (extracted from game.js barrel).
// entityEffects/foeTelegraph/snapshot + publicBodies/cardDescriptor. Owns _publicBodies.
// No eval-time cross-module reads — externals import from the barrel, used at call time.
import {
  tradeable,
  ADOPT_COST,
  ATLAS_REFLECT_PER,
  BODIES,
  BOSS_BODIES,
  BOSS_DEFS,
  COMMON_SET,
  DJINN_ITEM_POOL,
  DRAFT_BODIES,
  DRAFT_PICKS,
  ECHO_CD,
  ECHO_DELAY,
  ELITE_BODY,
  ELITE_BODY_VALUE,
  ELITE_SET,
  FOE_ARCHETYPE,
  FOE_DMG_OPS,
  FOE_LEVEL_CAP,
  FOE_LEVEL_MIN,
  FOE_MAX_GEAR,
  FOE_MIN_CARDS,
  FOE_START_MAX,
  FOE_START_MIN,
  GOD_CD,
  HAND_SIZE,
  KIT,
  KIT_POOL,
  LANES,
  LANE_CHANGE_CD_TICKS,
  LANE_FLOOR,
  LEVEL_ANTE_PER,
  LEVEL_COMBAT_PER_ODD,
  LEVEL_FLOOR_BASE,
  LEVEL_HP_FLAT_PER,
  LEVEL_HP_PER_POINT,
  LEVEL_HP_PER_EVEN,
  LEVEL_MASTERY_COST,
  LEVEL_SPECIALTY_COST,
  LEVEL_UP_COST_PER,
  MAX_KIT,
  MIN_DECK,
  MOXIE_CAP,
  MOXIE_REGEN_TICKS,
  MOXIE_SET,
  PALETTE_OPTION_CAP,
  PALETTE_SLOTS,
  PLAYER_COLORS,
  PASSIVE_BAR_COLOR,
  PLAYER_POOL,
  POISON_PERIOD,
  RARE_ANTE,
  RARE_POOL,
  RAT_KEYS,
  ROOM_ANTE_BUDGET_PER,
  ROOM_FILL_STOP_CHANCE,
  ROOM_SIZE,
  SET_COMMONS,
  STALL_LIMIT,
  STARTER_BODY,
  STARTER_DECK,
  START_MOXIE,
  THRONE_FLOOR,
  WEARABLE_BODIES,
  absorbShield,
  accelClocks,
  acceptTrade,
  addBuff,
  addPlayer,
  adoptCost,
  advanceLevel,
  aimedFoe,
  anteOfFoe,
  applyBodyLevel,
  applyCombatStart,
  armEcho,
  atlasReflect,
  autoDraftBots,
  autoPlay,
  beginCombat,
  bodyAnteOf,
  bodyMaxHp,
  bodyTags,
  bodyValue,
  bossAlive,
  bossBudget,
  bossPartySize,
  bossCardIntent,
  bossForFloor,
  bossOnDamaged,
  buffAmt,
  buildFoePool,
  buildLevel,
  buildQueue,
  buildRoom,
  canSwapTo,
  cardCost,
  cardPayment,
  playCost,
  cardDealInfo,
  cardDmgLabel,
  cardEventPassives,
  cardGlyphs,
  cardKind,
  cardLiveDmg,
  cardLiveSummary,
  cardOutcomes,
  cardPick,
  cardScale,
  cardScaleGlyph,
  cardSummaryLabel,
  cardWeightTag,
  opsBothKinds,
  cdScale,
  claimLoot,
  clog,
  countKey,
  currentNode,
  cycleTarget,
  damageEnemy,
  damagePlayer,
  dealHand,
  dealtTriggerPassives,
  deckKeys,
  deckMaxFor,
  deckMinFor,
  declineTrade,
  defaultCardCost,
  deriveLaneCount,
  descend,
  draftComplete,
  draftPick,
  drainClocks,
  drawBossRotation,
  drawUp,
  dropItem,
  difficultyRewardValue,
  echoDelay,
  effAtk,
  effMag,
  effPhys,
  effectiveDamageTo,
  ensureCheapSlot,
  ensureTarget,
  enterRoom,
  fireBossClock,
  fireSchoolTrigger,
  fitsAnteWindow,
  foeArchetype,
  foeCardCost,
  foeCast,
  foeCombatStat,
  foeCount,
  foeDealHit,
  foeHitFront2,
  foeHitLane,
  foeHitLaneAll,
  foeHitRanged,
  foeItemDmg,
  foeLevel,
  foeLootValue,
  foeMaxHpFor,
  foeOpSnipes,
  foeOpsDmg,
  foeRangedTarget,
  foeThreat,
  foeThreatScope,
  foeThreats,
  formUp,
  freshKit,
  gainTriggerPassives,
  generateEliteFoes,
  generateRoomFoes,
  getCdMult,
  getHpMult,
  giftItem,
  giveOwnItem,
  growDraftWheel,
  hasBuff,
  heroesInLane,
  hitTriggerPassives,
  humanSeats,
  isCard,
  isPassiveItem,
  isRanged,
  itemCd,
  itemDmgReduce,
  bodyFlatDR,
  itemFitsArchetype,
  itemFlavor,
  itemStatBonus,
  itemThreatens,
  itemTreasure,
  itemsAnteOf,
  kindBonusOf,
  kindForOp,
  kitFromPicks,
  krakenSteal,
  laneAura,
  laneChangeCdLeft,
  laneChangeReady,
  laneHeroes,
  laneLine,
  levelAnte,
  levelPointBudget,
  allocationPoints,
  levelCombatBonus,
  levelDamageType,
  levelHpBonus,
  levelUp,
  partyLevelCost,
  partyMain,
  partyMembers,
  partySpareSummary,
  BODY_UPGRADES,
  ELITE_TIERS,
  eliteTierOf,
  leveledBody,
  leveledPassiveText,
  leveledPassives,
  masteryRank,
  lockRoom,
  logNm,
  lowestEHpPlayer,
  maybeFinishDraft,
  meleeBonusOf,
  minFoeAnte,
  mintCard,
  mintCards,
  moveDepth,
  moveToBackpack,
  moveToDeck,
  nearestDefendedLane,
  newRoom,
  normalizeDifficulty,
  normalizeClockDivisor,
  nextPaletteOption,
  nodeById,
  oligarchyStolenCost,
  opsHarm,
  ownerLaneOf,
  playCard,
  playTriggerPassives,
  powerFor,
  proposeTrade,
  rangedBonusOf,
  resetDjinnDuplicityTargets,
  regenMoxie,
  reopenDraftForJoin,
  resetRoomVotes,
  resolveOps,
  rnd,
  rollBossLoot,
  rollCheapOption,
  rollDecreeFoe,
  rollDraftWheel,
  rollEliteFoe,
  rollFoeGear,
  rollFoeKit,
  rollKit,
  rollLeveledFoe,
  roomAnteBudget,
  roomClockDivisor,
  roomValue,
  runLevelOf,
  runPassive,
  setAllyTarget,
  setCdMult,
  setHpMult,
  setTarget,
  shuffle,
  simulateTick,
  sphinxChoicesAvailable,
  spawnBoss,
  spawnEnemy,
  spawnFoeInLane,
  spawnItemEntity,
  spendTriggerPassives,
  startDraft,
  startLevel,
  stockLevelRooms,
  summonBodies,
  swapBody,
  swapOwnItems,
  syncLobbyLanes,
  syncRatStack,
  tankiness,
  targetedFoe,
  tenderValue,
  tentacleCount,
  tickBossClocks,
  tickBuffs,
  tickDjinnCounter,
  tickEchoBar,
  tickOwnTimers,
  tickPoison,
  tickRegens,
  tickTimers,
  tradeItems,
  triggerKind,
  unlockRoom,
  useItem,
  voteRoom,
  wearBody,
} from "../game.js";

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
  if (!_publicBodies || _publicBodiesMult !== getHpMult()) {
    _publicBodies = Object.fromEntries(Object.entries(BODIES).map(([k, b]) => [k, {
      ...publicBody(b), passiveText: leveledPassiveText({ bodyKey: k }), eliteTier: eliteTierOf(k), upgrades: BODY_UPGRADES[k] ?? null,
    }]));
    _publicBodiesMult = getHpMult();
  }
  return _publicBodies;
};

// opsBothKinds (the 🗡🎯 dual-kind marker for Moonlight/Rainblow) now lives in engine/kit.js as the
// single source (imported above), alongside cardScale/opsTouchFoes — it was a local copy here.

// THE CARD DESCRIPTOR (owner 2026-06-24) — the single shape the client renders for any card, used
// for the backpack, the deckList, the shop wares, and loot. `value` = itemTreasure (the only
// resource), `cost` = the moxie cost for THIS body (discount baked in), `dmg` = headline label,
// `ranged` = whether the reticle drives it. Pass the wearer's body so the cost is the live one.
export const cardDescriptor = (key, body = null) => ({
  key, name: KIT[key]?.name ?? key, text: KIT[key]?.text ?? "",
  value: itemTreasure(key), color: KIT[key]?.color ?? null,
  cost: cardCost(key, body), dmg: cardDmgLabel(key), ranged: isRanged(key), kind: cardKind(key),
  // READABILITY PASS (owner 2026-07-14): the compound first-glance number summary (Heart Guard →
  // "🛡2 ❤2") + the prominent MELEE/RANGED/BOTH/none scaling treatment — the SAME vocabulary every
  // card surface renders (backpack/deck builder, shop, loot). Out-of-combat = base numbers (no live
  // caster bonus in scope); the combat hand ships the live version below.
  sum: cardSummaryLabel(key), scale: cardScale(key), weightTag: cardWeightTag(key),
  bothKinds: opsBothKinds(KIT[key]?.ops),
  passive: isPassiveItem(key),   // worn passive (Cool Shoes) — the ♻ convert confirm warns these melt too
  // PICK CONTRACT (owner 2026-07-07 batch D): a choose-on-play card ships its `pick` descriptor —
  // { kind: "summonBody", options: [{key,label,icon}] } (Grand Spirit) / { kind: "deckCard" }
  // (Crystal Ball). Absent on every ordinary card. The client answers via the play message's `pick`.
  ...(cardPick(key) ? { pick: cardPick(key) } : {}),
});

// Landing-page knowledge book. This projection deliberately reads the same body, upgrade, card,
// and boss tables as the live snapshot so the public rules reference cannot drift into a second
// hand-maintained content catalog.
export function knowledgeCatalog() {
  const bodies = publicBodies();
  const bossKeys = [...new Set([...BOSS_BODIES, "kingMimic"])];
  return {
    mechanics: [
      { title: "Choose", text: "Pick a body and its 10-card starter deck." },
      { title: "Scout", text: "Inspect the three offered fights, then choose one room." },
      { title: "Fight", text: `Moxie normally charges by 1 each second, up to ${MOXIE_CAP}. Spend the cost on a card to play it. Foes use the same moxie, cards, and bodies.` },
      { title: "Aim", text: "Move between lanes and front/back positions. Melee usually hits the front; ranged cards use your aimed target." },
      { title: "Grow", text: "Defeated foes unlock their bodies. Take dropped cards, edit your deck, and spend level points between fights." },
      { title: "Win", text: `Clear five fights and a boss on floors 1–${THRONE_FLOOR - 1}, then defeat King Mimic on the Throne floor. A full party wipe ends the run.` },
    ],
    leveling: {
      summary: "Every level above 1 gives one point. Points follow you between bodies and can be reallocated when you swap.",
      choices: [
        { name: "Health", cost: 1, text: `+${LEVEL_HP_PER_POINT} max HP per point.` },
        { name: "Melee", cost: 1, text: "+1 melee damage per point." },
        { name: "Ranged", cost: 1, text: "+1 ranged damage per point." },
        { name: "Mastery", cost: LEVEL_MASTERY_COST, text: "A body-specific upgrade. Buy once." },
        { name: "Specialty", cost: LEVEL_SPECIALTY_COST, text: "A body-specific upgrade per rank; some bodies have a cap." },
      ],
    },
    bodies: WEARABLE_BODIES.map((key) => {
      const body = bodies[key];
      return {
        key, name: body.name, maxHp: body.maxHp, passive: body.passiveText,
        eliteTier: body.eliteTier ?? 0, upgrades: body.upgrades,
      };
    }).sort((a, b) => a.eliteTier - b.eliteTier || a.name.localeCompare(b.name)),
    cards: PLAYER_POOL.map((key) => cardDescriptor(key))
      .sort((a, b) => a.value - b.value || a.name.localeCompare(b.name)),
    bosses: bossKeys.map((key) => {
      const body = bodies[key], def = BOSS_DEFS[key] ?? {};
      return {
        key, name: body.name, passive: body.passiveText,
        hp: key === "kingMimic" ? "99 HP per player" : `${body.maxHp} base HP × party size × floor`,
        cadence: def.deckCd ? def.deckCd / 10 : null,
        cards: (def.cards ?? []).map((card) => ({ key: card.key, name: card.label })),
      };
    }),
  };
}

// ACTIVE-EFFECT chips (owner 2026-06-24): the timed/ongoing buffs a combatant is CARRYING, each as
// { icon, label, left, dur } — the client draws a small icon with a countdown ring (when timed) and a
// hover label. Innate body passives are NOT listed here (always-on; shown as the card's passive text).
// EXPORTED (2026-07-11, scenario tool): this table's keys double as the canonical addBuff-kind list —
// applyScenario (engine/lobby.js) validates a spec's pre-applied buffs against it, never inventing kinds.
export const BUFF_META = {
  power:      { icon: "💪", label: "Power" },
  swordPower: { icon: "💪", label: "Power" },
  haste:      { icon: "⏩", label: "Haste — moxie 2× faster" },
  stoneskin:  { icon: "🪨", label: "Stoneskin — less damage taken" },
  slow:       { icon: "🐌", label: "Slow — moxie charges at half rate" },     // debuff (owner 2026-06-27)
  weakness:   { icon: "📉", label: "Weakness — deals half damage (round up)" }, // debuff (owner 2026-06-27)
  // FLAG icon (owner 2026-07-11): sap's chip was "⚫" — a solid black disc that read as a BROKEN glyph on
  // the dark canvas (owner's 7/11 phone shots: "a black circle" next to the Runeblade's name). 🌀 rides
  // the Gravity Greatshield / Black Hole pull theme — owner to re-skin icon + wording.
  sap:        { icon: "🌀", label: "Sapped — deals less damage" },            // debuff (Gravity Greatshield / Black Hole — the spec's required chip on debuffed foes)
  // FLAG icon+wording (owner 2026-07-11): stasis had no chip meta at all — it fell through to the bare
  // "✦ stasis" fallback. Mechanical description of the Za Warudo lockout; owner to re-skin.
  stasis:     { icon: "⛔", label: "Stasis — can't cast, gain moxie, or benefit from effects" },
  vulnerable: { icon: "🔻", label: "Hexed — extra damage from all sources" },
};

// Project a real recurring engine clock into the same {left,dur} shape as a finite buff. Recurring
// effects do not expire when the ring empties; they fire and refill. `cdMul` belongs in this
// projection because tickTimers/tickRegens/tickLeeches all compare against period * cdMul.
const effectClock = (c, period, charge) => {
  const dur = Math.max(1, (period ?? 60) * (c?.cdMul ?? 1));
  return { left: Math.max(0, dur - (charge ?? 0)), dur };
};
export function entityEffects(c) {
  const out = [];
  for (const b of (c.buffs ?? [])) {
    const m = BUFF_META[b.kind] ?? { icon: "✦", label: b.kind };
    // a debuff's magnitude reads as a MINUS ("Sapped −3 dmg"), not the generic "+3" (owner 7/11 legibility)
    const amt = b.amount ? (b.kind === "sap" ? ` −${b.amount} dmg` : ` +${b.amount}`) : "";
    out.push({ icon: m.icon, label: `${m.label}${amt}`, left: b.left, dur: b.dur ?? b.left, n: b.amount || null,
      ...(b.sourceCard ? { cardKey: b.sourceCard } : {}) });   // n → the chip's corner stack/amount count
  }
  for (const seg of (c.shieldSegs ?? [])) if (seg.left != null && seg.amount > 0)
    out.push({ icon: "🛡", label: `Temporary shield — ${seg.amount} remaining`, left: seg.left, dur: seg.dur ?? seg.left, n: seg.amount,
      ...(seg.sourceCard ? { cardKey: seg.sourceCard } : {}) });
  // Poison owns its status identity. Reusing the source card as `cardKey` made Medusa poison wear
  // Fire/Lightning/etc. card art, which is visually false once the continuing damage is poison.
  if ((c.poison ?? 0) > 0) out.push({ kind: "poison", icon: "☠", label: `Poison ×${c.poison} — ${c.poison} dmg every ${Math.round(POISON_PERIOD / 10)}s`, left: POISON_PERIOD - (c.poisonClock ?? 0), dur: POISON_PERIOD, n: c.poison });   // poison DoT chip (owner 2026-06-27)
  // REGEN / RAMP chips — one icon per regen KIND (owner 2026-07-11 legibility): before, every non-heal
  // kind (moxie, melee/ranged ramps, berserk, the Economy Elemental cycle, the Warewolf form clock) drew
  // the 🛡 shield-regen chip with a wrong — or "+undefined" — label. Descriptions are mechanical readings
  // of tickRegens; FLAG icons + wording (owner to re-skin).
  for (const g of (c.regens ?? [])) {
    const secs = Math.round((g.period ?? 30) / 10), k = g.kind ?? "heal";
    const meta =
        k === "heal"        ? { icon: "💚", label: `Regen — +${g.amount} heal every ${secs}s` }
      : k === "shield"      ? { icon: "🛡", label: `Regen — +${g.amount} shield every ${secs}s` }
      : k === "moxie"       ? { icon: "⚡", label: `Regen — +${g.amount} moxie every ${secs}s` }
      : k === "meleeBonus"  ? { icon: "🗡", label: `Ramp — +${g.amount} melee damage every ${secs}s` }
      : k === "rangedBonus" ? { icon: "🎯", label: `Ramp — +${g.amount} ranged damage every ${secs}s` }
      : k === "berserk"     ? { icon: "🪓", label: `Berserk — every ${secs}s: +${g.melee ?? 1} melee, +${g.shield ?? 1} shield, take ${g.amount ?? 1}` }
      : k === "economyPulse" ? { icon: "⚡", label: `Economy pulse — +${g.amount ?? 10} moxie every ${secs}s` }
      : k === "hedgefundKnight" ? { icon: "⚔", label: `Hedge check — convert shield to melee, or melee to shield, every ${secs}s` }
      : k === "warewolf"    ? { icon: "🌗", label: `Form clock — next: ${c.wform === "wolf" ? "HUMAN" : "WAREWOLF"} in ${secs}s` }
      : k === "escalatingRats" ? { icon: "🐀", label: `Rat wave — summon ${1 + (g.waves ?? 0) + (g.growth ?? 1)} rats in ${secs}s` }
      : k === "bookieRats"  ? { icon: "🎲", label: `Bookie wave — summon ${g.count ?? 2} rats every ${secs}s` }
      : k === "timeshare"   ? { icon: "⏱", label: `Amalgamation service — revive, or fully heal and upgrade, every ${secs}s` }
      : k === "moneymancer" ? { icon: "🪙", label: `Ranged-or-summon discount — arm −${g.discount ?? 3} cost every ${secs}s` }
      : { icon: "✦", label: `${k} every ${secs}s` };
    out.push({ ...meta, ...effectClock(c, g.period ?? 30, g.charge), ...(g.sourceCard ? { cardKey: g.sourceCard } : {}) });
  }
  // card-granted TIMERS (Animated Blade; Pet Leech moved OFF timers to carrier-riding leeches, owner
  // 2026-07-11) — lasting drains/strikes on the CASTER. These are
  // not foe debuffs (the effect lives on you), but they DID show no chip at all before (entityEffects
  // skipped c.timers); surface them like regens so the player can see the ongoing effect. (owner 2026-06-29)
  for (const tm of (c.timers ?? [])) {
    const op = (tm.ops ?? [])[0] ?? {};
    const secs = Math.round((tm.period ?? 60) / 10), amt = op.amount ?? 1;
    const when = tm.once ? `in ${secs}s` : `every ${secs}s`;   // a once-timer (Cross-Blade / Starblade) fires ONCE then expires
    // Both one-shot and recurring timers expose the same live clock. A recurring ring refills after
    // firing; a one-shot disappears. Keeping that distinction in the label avoids implying expiry.
    const ring = effectClock(c, tm.period ?? 60, tm.charge);
    // FLAG wording (owner 2026-07-11): non-damage timers (Starblade's delayed moxie, Crimson Crown's tick)
    // used to LIE as "Strike — N dmg"; describe the real first op mechanically instead. Owner to re-skin.
    const card = tm.sourceCard ? { cardKey: tm.sourceCard } : {};
    out.push(op.lifesteal
      ? { icon: "🩸", label: `Drain — ${amt} dmg + heal ${amt} ${when}`, ...ring, ...card }
      : op.do === "deal" ? { icon: "⏱", label: `Strike — ${amt} dmg ${when}`, ...ring, ...card }
      : op.do === "gainMoxie" ? { icon: "⏳", label: `Charging — +${amt} moxie ${when}`, ...ring, ...card }
      : { icon: "⏱", label: `Timed effect — ${when}`, ...ring, ...card });
  }
  // COOL SHOES' cast-installed refund (owner 2026-07-06: worn passives are DEAD — "they're just a
  // card"; the 7/5 worn-inventory chip loop went with them). The lasting buff shows like Stoneskin's.
  if ((c.moxieOnPlayBuff ?? 0) > 0)
    out.push({ icon: "👟", label: `Cool Shoes — +${c.moxieOnPlayBuff} moxie each card you play (this fight)`, left: null, dur: null });
  if ((c.thorns ?? 0) > 0) out.push({ icon: "🌵", label: `Thorns — attackers take ${c.thorns}`, left: null, dur: null });
  // MIRROR SHIELD (owner 2026-07-07 batch D): the armed one-shot reflect shows while it waits.
  if ((c.mirrorShield ?? 0) > 0)
    out.push({ icon: "🪞", label: `Mirror Shield — the next attack that hits reflects its FULL damage back${c.mirrorShield > 1 ? ` (×${c.mirrorShield})` : ""}`, left: null, dur: null, n: c.mirrorShield > 1 ? c.mirrorShield : null });
  // SWORDS OF REVEALING LIGHT (owner 2026-07-11): the armed hit-conversion charges — icon + name +
  // REMAINING COUNT (3→2→1, the `n` corner count; no countdown ring — it's count-based, not timed).
  // FLAG icon 🌟 (placeholder, owner art).
  if ((c.revealLight ?? 0) > 0)
    out.push({ icon: "🌟", label: `Revealing Light — the next ${c.revealLight} hit${c.revealLight > 1 ? "s" : ""} against you each become 1`, left: null, dur: null, n: c.revealLight });
  // PET LEECH (owner 2026-07-11): the drain rides the CARRIER — icon + magnitude + STACK count.
  // Stacked leeches have independent clocks, so the combined chip shows the soonest next drain.
  if ((c.leeches ?? []).length) {
    const ln = c.leeches.length, total = c.leeches.reduce((n, l) => n + (l.amount ?? 1), 0), ls = Math.round((c.leeches[0]?.period ?? 60) / 10);
    const next = c.leeches.map((l) => effectClock(c, l.period ?? 60, l.charge))
      .reduce((soonest, clock) => clock.left < soonest.left ? clock : soonest);
    const sourceCard = c.leeches.find((l) => l.sourceCard)?.sourceCard;
    out.push({ icon: "🪱", label: `Leeched${ln > 1 ? ` ×${ln}` : ""} — takes ${total} & heals the leecher ${total} every ${ls}s`, ...next, n: ln > 1 ? ln : null,
      ...(sourceCard ? { cardKey: sourceCard } : {}) });
  }
  return out;
}

// BODY / PASSIVE TRACKERS: the engine has always retained event-threshold progress in `pspend`
// and recurring body clocks in `pcharge`; this is the single public projection for that state.
// Trackers intentionally share the effect-chip clock shape (`left`/`dur`) so every combat surface
// can render one consistent ring, while `progress` preserves the semantic current/max/unit values
// for labels, tests, and future non-canvas clients.
const PASSIVE_THRESHOLDS = [
  ["spend", "moxie spent"], ["hit", "damage taken"], ["play", "cards played"],
  ["dealt", "damage dealt"],
  ["dealtMelee", "melee damage dealt"], ["dealtRanged", "ranged damage dealt"],
  ["gain", "moxie gained"], ["spendOrHit", "moxie spent or damage taken"],
];
const passiveOutcome = (p, room = null) => {
  const ops = p?.ops ?? [];
  if (ops.some((o) => o.do === "sphinxChoice")) return "choose an unlocked heal, deal, or moxie option";
  const summon = ops.find((o) => o.do === "summon");
  if (summon) {
    const extra = summon.countPerKill ? (room?.defeated?.foe ?? 0) * summon.countPerKill : 0;
    const n = (summon.count ?? 1) + extra;
    return `summon ${n} ${BODIES[summon.body]?.name ?? summon.body}${n === 1 ? "" : "s"}`;
  }
  const deals = ops.filter((o) => o.do === "deal");
  if (deals.length) {
    const n = deals.reduce((sum, o) => sum + (o.amount ?? 0), 0);
    const scope = deals[0].target === "lane" ? "the lane"
      : deals[0].target === "front3" ? "the front three"
      : deals[0].target === "front2" ? "the front two" : "the front";
    const kind = p.kind ?? kindForOp(deals[0]);
    return `${kind === "ranged" ? "ranged" : kind === "melee" ? "melee" : "deal"} ${n} to ${scope}`;
  }
  const counter = ops.find((o) => o.do === "counter");
  if (counter) return `gain +${counter.amount ?? 1} damage`;
  const heal = ops.find((o) => o.do === "healSelf");
  if (heal) return `heal ${heal.amount ?? 1}`;
  const shield = ops.find((o) => o.do === "shield");
  if (shield) return shield.ofMaxHp ? "gain max-HP shield" : `gain ${shield.amount ?? 1} shield`;
  const weaken = ops.find((o) => o.do === "weakenLane");
  if (weaken) return `weaken the foe lane by ${weaken.amount ?? 1}`;
  if (ops.some((o) => o.do === "freeNext")) return "make the next card free";
  if (ops.some((o) => o.do === "chequeHeal")) return "heal or shield the ally-target";
  return "trigger the passive";
};
const progressTracker = (c, { id, label, current, max, unit, mode = "threshold", bodyKey = c.bodyKey, icon = "✦", outcome = null }) => {
  const cur = Math.max(0, Math.min(max, current ?? 0));
  const suffix = outcome ? ` · next: ${outcome}` : "";
  return { id, icon, bodyKey, label: `${label} — ${cur}/${max} ${unit}${suffix}`,
    left: Math.max(0, max - cur), dur: max, progress: { mode, current: cur, max, unit, outcome } };
};
export function entityTrackers(room, c) {
  if (!c) return [];
  const out = [], body = leveledBody(c), passives = leveledPassives(c);
  passives.forEach((p, pi) => {
    if (p.every) {
      if (c.sphinxChoiceReady && p.ops?.some((op) => op.do === "sphinxChoice")) {
        out.push({ id: `body:${c.bodyKey}:${pi}`, icon: "✦", bodyKey: c.bodyKey,
          label: `${body.name} — choice ready: ${passiveOutcome(p, room)}`,
          left: null, dur: null, progress: { mode: "ready", current: 1, max: 1, unit: "choice", outcome: passiveOutcome(p, room) } });
        return;
      }
      const max = Math.max(1, Math.round(p.every * (c.cdMul ?? 1)));
      const cur = Math.max(0, Math.min(max, c.pcharge?.[pi] ?? 0));
      const secs = Math.max(0, (max - cur) / 10).toFixed(1);
      out.push({ id: `body:${c.bodyKey}:${pi}`, icon: "⏱", bodyKey: c.bodyKey,
        label: `${body.name} — ${secs}s until ${passiveOutcome(p, room)}`,
        left: max - cur, dur: max, progress: { mode: "time", current: cur, max, unit: "ticks", outcome: passiveOutcome(p, room) } });
      return;
    }
    const found = PASSIVE_THRESHOLDS.find(([key]) => p[key] != null);
    if (found) {
      const [key, unit] = found, max = p[key];
      out.push(progressTracker(c, { id: `body:${c.bodyKey}:${pi}`, label: body.name, current: c.pspend?.[pi] ?? 0,
        max, unit, outcome: passiveOutcome(p, room) }));
    } else if (p.pairMR) {
      const cur = Number(!!c.pair?.melee) + Number(!!c.pair?.ranged);
      out.push(progressTracker(c, { id: `body:${c.bodyKey}:${pi}`, label: body.name, current: cur, max: 2,
        unit: "attack kinds played", outcome: passiveOutcome(p, room) }));
    }
  });
  if (body.atlasReflect) out.push(progressTracker(c, { id: "body:atlas:shrug", label: body.name,
    current: c.atlasClock ?? 0, max: body.atlasReflectConfig?.threshold ?? ATLAS_REFLECT_PER,
    unit: "damage taken", outcome: "SHRUG across the lane" }));
  if (body.echo) {
    const max = Math.max(1, Math.round(ECHO_CD * (c.cdMul ?? 1))), cur = c.echoArmed || c.echoReady ? max : (c.echoCharge ?? 0);
    out.push(progressTracker(c, { id: `body:${c.bodyKey}:echo`, label: body.name, current: cur, max,
      unit: "echo charge", mode: "time", outcome: c.echoArmed ? "next matching card doubles" : c.echoReady ? "echo ready to arm" : "echo becomes ready" }));
  }
  const armed = (id, cardKey, icon, label, n = null) => out.push({ id, cardKey, icon, label, left: null, dur: null,
    ...(n != null ? { n, progress: { mode: "charges", current: n, max: n, unit: "charges" } } : {}) });
  if (c.doubleNext) {
    const resolves = c.bodyKey === "centlessCentaur" && masteryRank(c) ? 3 : 2;
    armed("armed:double", null, "↻", `Repeat armed — your next card resolves ${resolves === 3 ? "three" : "twice"}${resolves === 3 ? " times" : ""}`);
  }
  if (c.freeNext) armed("armed:free", null, "0", "Free card armed — your next card costs 0");
  if ((c.nextRangedDiscount ?? 0) > 0) armed("armed:moneymancer", null, "🪙", `Moneymancer — next ranged or summon card costs ${c.nextRangedDiscount} less`);
  if (c.bodyKey === "oligarchyOoze" && !c.oozeStolenKey)
    armed("body:oligarchyOoze:waiting", null, "🦠", "Oligarchy Ooze — waiting to steal the first damaging card used against it");
  if (c.oozeStolenKey) {
    const cost = oligarchyStolenCost(c);
    armed("body:oligarchyOoze:held", c.oozeStolenKey, "🦠", `Stolen ${KIT[c.oozeStolenKey]?.name ?? c.oozeStolenKey} — auto-casts for ${cost} moxie`);
  }
  if ((c.revenantAfterlifeTicks ?? 0) > 0) {
    const cur = c.revenantAfterlifeTicks;
    const dur = Math.max(cur, body.revenantAfterlife?.duration ?? 60);
    out.push({ id: "body:recessionRevenant:afterlife", icon: "☠", bodyKey: c.bodyKey,
      label: `Recession Revenant — ${(cur / 10).toFixed(1)}s to earn a defeat and revive`,
      left: cur, dur, progress: { mode: "time", current: dur - cur, max: dur, unit: "ticks", outcome: "revive on a defeat" } });
  }
  for (const [sourceId, marks] of Object.entries(c.barghestMarks ?? {})) if (marks > 0) {
    const source = [...(room?.players?.values?.() ?? []), ...(room?.allies ?? []).flat(), ...(room?.lanes ?? []).flat(), room?.boss]
      .find((entity) => String(entity?.id) === sourceId);
    const perMark = source ? (leveledBody(source)?.barghestMarks?.value ?? 1) : 1;
    armed(`body:bankruptBarghest:${sourceId}`, null, "🐺",
      `Bankrupt Barghest — ${marks} mark${marks === 1 ? "" : "s"}; its future damage deals +${marks * perMark}`);
  }
  if ((c.combo?.left ?? 0) > 0) armed("card:oComboBlade", "oComboBlade", "⚔", `Combo Blade — next ${c.combo.left} card(s) deal +${c.combo.amount ?? 1}`, c.combo.left);
  if (c.dualWield) armed("card:oDualHand", "oDualHand", "🙌", "Dual-Handing — melee cards costing 6+ resolve again");
  if (c.tkBlades) armed("card:oTeleBlades", "oTeleBlades", "🔮", "Telekinetic Blades — melee aims and scales with ranged");
  if ((c.moxieOnHitBuff ?? 0) > 0) armed("card:oJesterplate", "oJesterplate", "🃏", `Jesterplate — gain ${c.moxieOnHitBuff} moxie when hit`, c.moxieOnHitBuff);
  if (c._giantBase) armed("card:oGiantsBelt", "oGiantsBelt", "🥋", `Giant's Belt — +${c._giantBase} max HP this fight`);
  return out;
}

// The deal op that governs a foe's NEXT attack: the front queued card's deal, else its first
// damaging body passive (attack/deal/schoolStrike/dealEachLane). Drives the target telegraph.
function foeFrontDealOp(e) {
  const stolenCost = oligarchyStolenCost(e);
  if (e.oozeStolenKey && (stolenCost == null || (e.moxie ?? 0) >= stolenCost || !(e.queue ?? []).length)) {
    const d = (KIT[e.oozeStolenKey]?.ops ?? []).find((o) => o.do === "deal");
    if (d) return d;
  }
  const fc = (e.queue ?? [])[0];
  if (fc) { const d = (KIT[fc.key]?.ops ?? []).find((o) => o.do === "deal"); if (d) return d; }
  for (const p of leveledPassives(e)) {
    const d = (p.ops ?? []).find((o) => FOE_DMG_OPS.has(o.do));
    if (d) return d;
  }
  return null;
}
// TARGET TELEGRAPH (owner spec 2026-06-27): the PLAYER id(s) a foe's next/primary attack lands on
// RIGHT NOW — the client draws a small portrait circle on each. Mirrors the resolver's routing:
// ranged (pick) snipes the weakest player; melee front/front2/front3 hits the front PLAYER(S) of its own
// (breach-resolved) lane IF that front is a player (a summon blocker shows no circle — not a player);
// lane/eachLane AoE marks every player it would hit. Returns an array of player ids (often 0 or 1).
export function foeTelegraph(room, e) {
  const op = foeFrontDealOp(e);
  if (!op) return [];
  const li = e.lane | 0;
  const isPlayer = (c) => !!(c && room.players?.has?.(c.id));
  if (op.do === "dealEachLane") {
    const out = [];
    for (let l = 0; l < (room.laneCount ?? room.lanes.length); l++) { const f = laneLine(room, l)[0]; if (isPlayer(f)) out.push(f.id); }
    return out;
  }
  if (op.target === "board") {   // BLACK HOLE (owner 2026-07-10): a foe strikes EVERY hero in EVERY lane
    const out = [];
    for (let l = 0; l < (room.laneCount ?? room.lanes.length); l++) for (const h of heroesInLane(room, l)) out.push(h.id);
    return out;
  }
  if (op.target === "random") return [...room.players.values()].filter((p) => p.alive).map((p) => p.id);
  if (op.target === "lane" || op.target === "pickLane") return heroesInLane(room, li).map((p) => p.id);   // lane / legacy pickLane: a reticle-less foe strikes its own lane
  if (foeOpSnipes(op)) { const t = foeRangedTarget(room, li); return t ? [t.id] : []; }   // lane-local first, else global snipe — matches foeHitRanged (B foe-ranged)
  let line = laneLine(room, li);
  if (!line.length) { const rl = nearestDefendedLane(room, li); if (rl < 0) return []; line = laneLine(room, rl); }
  const count = op.target === "front3" ? 3 : op.target === "front2" ? 2 : 1;
  return line.slice(0, count).filter(isPlayer).map((c) => c.id);
}

// One presentation contract for every boss, regardless of where the mechanic seats it. Back-line
// bosses live in `room.boss`; Djinn and King Mimic are lane-bound. Keep `boss`'s established
// back-line semantics and expose either lane-bound exception through `bossUi` below.
function bossDisplay(room, boss, laneBound = false) {
  if (!boss || boss.hp <= 0) return null;
  return {
    id: boss.id, bodyKey: boss.bodyKey,
    name: BODIES[boss.bodyKey]?.name ?? boss.bodyKey,
    hp: boss.hp, maxHp: boss.maxHp, shield: boss.shield ?? 0,
    color: BODIES[boss.bodyKey]?.color ?? "#ffd24a",
    passive: BODIES[boss.bodyKey]?.passiveText ?? null,
    laneBound, lane: laneBound ? (boss.lane ?? 0) : null,
    stance: boss.stance ?? null,
    stanceLabel: boss.stance === "objection" ? "OBJECTION — every hit capped at 1"
               : boss.stance === "recess" ? "RECESS — every hit softened by 1" : null,
    stanceClock: (() => {
      const clock = (boss.coreClocks ?? []).find((entry) => entry.kind === "stance");
      return clock ? { frac: Math.min(1, (clock.charge ?? 0) / Math.max(1, clock.cd)), cd: clock.cd } : null;
    })(),
    headWave: boss.headWave ?? null,
    counters: boss.counters ?? 0, meleeBonus: meleeBonusOf(boss), rangedBonus: rangedBonusOf(boss),
    bossDeckCount: boss.bossDeck?.length ?? null,
    bossDiscardCount: boss.bossDiscard?.length ?? null,
    castBars: (boss.castBars ?? []).map((b) => ({ cardKey: b.cardKey, label: b.label,
      lane: b.lane, charge: b.charge, cd: b.cd, playerScale: b.playerScale ?? 1 })),
    effects: entityEffects(boss),
    trackers: [...entityTrackers(room, boss)],
    threats: foeThreats(room, boss),
  };
}

// A co-op body can go down while the fight continues, so the final defeat log may be minutes away
// (or may never appear if the surviving player wins). Keep one exact, already-resolved lethal cause
// attached to the downed player's ordinary combat snapshot instead of asking the client to parse prose.
function playerDownCause(room, player) {
  if (player?.alive !== false) return null;
  const events = room?.damageEvents ?? [];
  let event = null;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]?.lethal && events[i]?.target?.id === player.id) { event = events[i]; break; }
  }
  if (!event) return null;
  const source = event.source?.label ?? null;
  const cause = event.cause?.name ?? null;
  const label = event.cause?.type === "body" ? (source ?? cause ?? "Unattributed damage")
    : source && cause ? `${source} - ${cause}` : (cause ?? source ?? "Unattributed damage");
  return {
    eventId: event.id,
    tick: event.tick,
    label,
    sourceBodyName: event.source?.bodyName ?? null,
    cause,
    hpLost: event.hpLost ?? 0,
    shieldAbsorbed: event.shieldAbsorbed ?? 0,
    hpBefore: event.hpBefore ?? 0,
  };
}

function sphinxChoiceDescriptor(room, player) {
  if (room?.phase !== "playing" || player?.bodyKey !== "sphinx" || !player.sphinxChoiceReady
    || player.alive === false || (player.hp ?? 0) <= 0) return null;
  const op = leveledPassives(player).flatMap((passive) => passive.ops ?? []).find((candidate) => candidate.do === "sphinxChoice");
  if (!op) return null;
  const amount = op.amount ?? 12, total = amount + rangedBonusOf(player);
  const available = new Set(sphinxChoicesAvailable(player));
  const options = [
    { key: "heal", label: `Heal ${total}`, icon: "♥", text: `Heal your ally target for ${total}.` },
    { key: "deal", label: `Deal ${total}`, icon: "🎯", text: `Deal ${total} ranged damage to your target.` },
    { key: "moxie", label: `Gain ${amount} Moxie`, icon: "⚡", text: `Gain up to ${amount} moxie, including ${Math.max(0, amount - 10)} spendable overflow above the normal cap.` },
  ].filter((option) => available.has(option.key));
  return {
    id: `passive:sphinx:${player.id}:${player.sphinxPassiveUses ?? 0}`,
    passiveChoice: true,
    name: BODIES.sphinx.name,
    color: BODIES.sphinx.color,
    pick: {
      kind: "sphinxChoice",
      prompt: "choose one · used options stay locked",
      options,
    },
  };
}

const snapshotDamageCardCache = new Map();
const snapshotCardDamages = (key) => {
  if (snapshotDamageCardCache.has(key)) return snapshotDamageCardCache.get(key);
  const visit = (ops) => (ops ?? []).some((op) => FOE_DMG_OPS.has(op.do) || visit(op.ops));
  const result = visit(KIT[key]?.ops);
  snapshotDamageCardCache.set(key, result);
  return result;
};

// Public combat intent for spatial teammate awareness. Manual plans are exact. AUTO mirrors the
// server policy closely enough to expose the card it is banking toward or would cast next; this is
// projection-only and never drives gameplay.
function playerCombatIntent(room, p) {
  // Same ally count the live hand uses (perAlly scaling), so the badge glyph matches the hand.
  const allies = Math.max(0, heroesInLane(room, p.lane).length - 1) + (room.allies?.[p.lane]?.length ?? 0);
  const queued = (Array.isArray(p.cardQueue) ? p.cardQueue[0] : p.queuedCard) ?? null;
  const queuedCard = queued && (p.hand ?? []).find((card) => card.id === queued.id);
  const describe = (card, mode, extra = {}, pick = null) => {
    if (!card || !KIT[card.key]?.ops) return null;
    const payment = cardPayment(card.key, leveledBody(p), p);
    return { id: card.id, key: card.key, name: KIT[card.key]?.name ?? card.key,
      glyphs: cardGlyphs(card.key, p, allies, pick ? { pick } : {}),   // GLYPHS (2026-08-04): compact live shorthand
      cost: payment.moxieCost, healthCost: payment.healthCost, printedCost: payment.totalCost,
      shortfall: Math.max(0, payment.moxieCost - (p.moxie ?? 0)), mode, ...extra };
  };
  if (queuedCard) return describe(queuedCard, queued.planned ? "plan" : "queued",
    { priority: 1, pick: queued.pick ?? null }, queued.pick ?? null);
  if (!p.autoFire) return null;
  const hand = (p.hand ?? []).filter((card) => KIT[card.key]?.ops);
  const paid = (card) => cardPayment(card.key, leveledBody(p), p);
  const healthLegal = (card) => paid(card).healthCost === 0 || paid(card).healthCost < (p.hp ?? 0);
  const affordable = hand.filter((card) => healthLegal(card) && paid(card).moxieCost <= (p.moxie ?? 0));
  const priciest = (cards) => cards.reduce((best, card) =>
    !best || paid(card).totalCost > paid(best).totalCost ? card : best, null);
  const affordableDamage = affordable.filter((card) => snapshotCardDamages(card.key));
  let card = priciest(affordableDamage);
  if (!card) {
    const pendingDamage = hand.filter((candidate) => healthLegal(candidate)
      && snapshotCardDamages(candidate.key) && paid(candidate).moxieCost > (p.moxie ?? 0));
    if (pendingDamage.length && (p.moxie ?? 0) < MOXIE_CAP)
      card = pendingDamage.reduce((best, candidate) => !best
        || paid(candidate).moxieCost < paid(best).moxieCost
        || (paid(candidate).moxieCost === paid(best).moxieCost
          && paid(candidate).totalCost > paid(best).totalCost) ? candidate : best, null);
    else card = priciest(affordable);
  }
  return describe(card, "auto");
}

// END-OF-RUN SUMMARY (owner 2026-07-28): turn the raw run stats into sorted top-lists the client just
// renders. Kept out of mid-run snapshots (only built when the run has ended) so it never bloats deltas.
function summarizeRunStats(room) {
  const s = room.runStats; if (!s) return null;
  const byDmg = (obj) => Object.entries(obj).map(([name, dmg]) => ({ name, dmg })).sort((a, b) => b.dmg - a.dmg);
  return {
    won: !!room.runWon, floor: room.floor ?? 1, fights: s.fights || 0,
    dealt: s.dealt || 0, taken: s.taken || 0, summonDmg: s.summonDmg || 0,
    cards: Object.entries(s.dmgByCard).map(([name, v]) => ({ name, dmg: v.dmg, hits: v.hits }))
      .sort((a, b) => b.dmg - a.dmg).slice(0, 12),
    bodies: byDmg(s.dmgByBody),
    takenBy: byDmg(s.takenByBody),
    threats: byDmg(s.foeThreat).slice(0, 5),
    dead: Object.entries(s.playsByCard).filter(([name]) => !s.dmgByCard[name])
      .map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, 8),
    biggest: s.biggest || null,
  };
}
export function snapshot(room) {
  resetDjinnDuplicityTargets(room);
  const laneBoss = room.lanes.flat().find((e) =>
    e.hp > 0 && BODIES[e.bodyKey]?.boss && !e.falseDjinn) ?? null;
  return {
    type: "state",
    phase: room.phase,
    difficulty: normalizeDifficulty(room.difficulty),
    // Authenticated production playtest rooms are visibly distinct but expose no credential.
    ...(room.ownerLab ? { ownerLab: true } : {}),
    // SCENARIO TAG (2026-07-11, dev capture tool): set only by applyScenario in a KM_SCENARIO=1 room —
    // the harness waits on it to know the injection landed. Absent (spread of {}) on every normal room,
    // so ordinary snapshots stay byte-identical.
    ...(room.scenario ? { scenario: room.scenario } : {}),
    ...(room.dev ? { dev: { paused: !!room.devPaused } } : {}),
    god: !!room.god,
    tick: room.tick,
    clock: {
      divisor: roomClockDivisor(room),
      requests: Object.fromEntries([...room.players.values()]
        .filter((p) => !p.bot)
        .map((p) => [p.id, normalizeClockDivisor(p.clockDivisor)])),
    },
    floor: room.floor ?? 1,
    runWon: !!room.runWon,                // King Mimic fell — the run is complete (victory screen)
    runSummary: (room.runWon || room.phase === "lost") ? summarizeRunStats(room) : null,   // end-of-run stats (owner 2026-07-28)
    canReturnToRooms: room.phase === "setup" && !!room.roomReturn && humanSeats(room).length <= 1,
    freeze: room.freezeFoes ?? 0,         // ⏳ Time Stop ticks left on the foe side (HUD badge)
    // Semantic, bounded cast events for transient client VFX. Mechanics stay in combat.js; this is
    // only the render payload, keyed by monotonic id so keyframes/deltas/reconnects cannot double-play.
    castFx: (room.castFx ?? []).map((fx) => ({ ...fx })),
    // Bounded, structured boss resolutions power the defeat recap without parsing prose logs.
    bossEvents: (room.bossEvents ?? []).map((event) => ({ ...event,
      targets: (event.targets ?? []).map((target) => ({ ...target })) })),
    // Structured damage events make defeat explanations exact: source/card, defense, shield, HP,
    // and the lethal hit are already resolved by the engine instead of inferred from prose.
    damageEvents: (room.phase === "lost" || room.phase === "won")
      ? (room.damageEvents ?? []).map((event) => ({ ...event,
          source: event.source ? { ...event.source } : null,
          target: event.target ? { ...event.target } : null,
          cause: event.cause ? { ...event.cause } : null }))
      : undefined,
    cardReturnEvents: (room.cardReturnEvents ?? []).map((event) => ({ ...event })),
    tornadoes: (room.tornadoes ?? []).map((t) => ({
      id: t.id, lane: t.lane, returning: !!t.returning, side: t.side ?? "foe",
      moveCd: t.period ?? BOSS_DEFS.djinn.tornadoMoveCd, stayCd: t.period ?? 60, damage: t.damage ?? BOSS_DEFS.djinn.tornadoDamage(room.floor),
      exposures: Object.fromEntries(Object.entries(t.exposures ?? {}).map(([id, e]) =>
        [id, { ticks: e.ticks ?? 0, strikes: e.strikes ?? 0, lastReason: e.lastReason ?? null }])),
    })),
    laneCount: room.laneCount ?? LANES,   // N columns for the renderer (= player count, 1–4)
    // The lane-change cooldown MAX, in ticks — sent once per frame at room level so the client
    // renders a fraction without hardcoding 60 (owner 2026-07-24: six seconds).
    laneChangeCd: LANE_CHANGE_CD_TICKS,
    // LEVEL-UP MATH, sent at room level so the level sheet can never print a stale number.
    // The client hardcoded "+4 max HP" in two places; when the owner moved the point value to 3
    // and added a flat per-level grant (2026-07-26), both labels silently lied. The client reads
    // these instead of literals — see LEVEL_ROWS / the level sheet in public/client.js.
    levelHpPerPoint: LEVEL_HP_PER_POINT,
    levelHpFlatPer: LEVEL_HP_FLAT_PER,
    lanes: room.lanes.map((arr, i) => ({
      enemies: arr.map((rawEnemy) => {
        const realDjinn = rawEnemy.falseDjinn
          ? room.lanes.flat().find((foe) => foe.id === rawEnemy.fakeOf && !foe.falseDjinn && foe.hp > 0)
          : null;
        // False copies retain their own server id and board position, but every other
        // client-visible fact is projected from the live Djinn. Their internal 1 HP and
        // no-op resolver remain authoritative without leaking which body is real.
        const e = realDjinn ? { ...realDjinn, id: rawEnemy.id } : rawEnemy;
        // foeThreats walks passives/queue/clocks — compute it ONCE per entity per 10 Hz snapshot
        // and reuse it below (threats + tgtPids). foeThreat stays its own call (different shape).
        const threats = foeThreats(room, e);
        return ({
        id: e.id, bodyKey: e.bodyKey, name: e.name ?? BODIES[e.bodyKey]?.name ?? e.bodyKey, level: e.level ?? 1,
        stackCount: e.ratStack ? (e.ratCount ?? 1) : null, // one target may represent N living rats/heads
        levelAllocation: e.levelAllocation ?? null, eliteTier: eliteTierOf(e.bodyKey), hp: e.hp, maxHp: e.maxHp, shield: e.shield ?? 0, charge: e.charge,
        cd: Math.round((BODIES[e.bodyKey]?.cd ?? 0) * (e.cdMul ?? 1)),
        threat: foeThreat(room, e),     // {frac, cd} soonest INCOMING damage — drives border heat + AoE alarm
        threats,                        // ALL damaging clocks (one labeled, color-coded bar each)
        tgtPids: [...new Set([...foeTelegraph(room, e),
          ...threats.flatMap((threat) => threat.targetIds ?? [])])], // ordinary queue + lane-bound boss casts
        portrait: e.bodyKey,            // the sprite the telegraph circle shows (this foe's face)
        reactive: (BODIES[e.bodyKey]?.passive ?? []).some((p) => p.on === "damaged" && opsHarm(p.ops)), // hits back when struck (no clock)
        tags: bodyTags(e.bodyKey),      // ⚡ trigger labels (on sword/staff/when hit) — no clock, shown as tags
        dr: itemDmgReduce(e) + buffAmt(e, "stoneskin") + bodyFlatDR(e),  // worn DR + Stone Skin + body/form DR (Warewolf human +1) → 🛡 badge
        form: e.wform ?? null,  // WAREWOLF (owner 2026-07-11): "human"|"wolf" → client picks the form's icon
        passive: e.passiveText ?? leveledPassiveText(e),
        stolenCard: e.restoreTo?.kind === "krakenCard" ? {
          cardId: e.restoreTo.card?.id ?? null, cardKey: e.restoreTo.card?.key ?? e.itemKey ?? null,
          cardName: KIT[e.restoreTo.card?.key ?? e.itemKey]?.name ?? e.itemKey ?? "Card",
          ownerId: e.restoreTo.playerId, returnsOnDefeat: true,
        } : null,
        boss: !!BODIES[e.bodyKey]?.boss,
        aoe: (BODIES[e.bodyKey]?.passive ?? []).some((p) => (p.ops ?? []).some((o) => o.do === "dealEachLane"))
          || (e.clocks ?? []).some((k) => k.aoe) || (e.castBars ?? []).some((k) => k.aoe),
        warded: !!BODIES[e.bodyKey]?.ward && foeCount(room) > 1, // King Mimic: untouchable until its court falls
        atk: effPhys(e), phys: effPhys(e), mag: effMag(e), counters: e.counters ?? 0, meleeBonus: meleeBonusOf(e), rangedBonus: rangedBonusOf(e),
        thorns: e.thorns ?? 0,                              // spikes buff → 🌵 badge
        effects: entityEffects(e),                          // active timed/ongoing buffs → icon+ring chips
        trackers: entityTrackers(room, e),                  // body thresholds / clocks / armed continuing states
        aura: e.dynamicAura ?? BODIES[e.bodyKey]?.aura ?? null, // foe-side Totem/Flag/Amalgamation badge
        // CARD CAST (CARDS_SPEC §6): moxie + the ordered queue (front casts first) + a "casts soon"
        // fraction = moxie / front-card cost. Replaces the cooldown charge for card casting.
        moxie: e.moxie ?? 0, moxieMax: MOXIE_CAP,
        bossDeckCount: e.bossDeck?.length ?? null, bossDiscardCount: e.bossDiscard?.length ?? null,
        castBars: (e.castBars ?? []).map((b) => ({ cardKey: b.cardKey, label: b.label, lane: b.lane, charge: b.charge, cd: b.cd, playerScale: b.playerScale ?? 1 })),
        queue: (e.queue ?? []).map((c, qi) => {
          const ops = KIT[c.key]?.ops ?? [];
          const dop = ops.find((o) => o.do === "deal" && (o.amount ?? 0) > 0);
          const harm = opsHarm(ops);
          // LIVE: a queued hit reads boosted off the FOE's OWN bonus (a ramped foe's queued cards read
          // gold too). allies = OTHER foes in this lane (mirror of the perAlly foe-side resolver).
          const foeAllies = Math.max(0, (arr?.length ?? 1) - 1);
          const live = cardLiveDmg(c.key, e, foeAllies);
          const hits = live.count ?? 1;
          // A boss-created body may carry a source multiplier (the half-strength Lich orb is the
          // authored example). `cardLiveDmg` intentionally describes card/body scaling only, while
          // the resolver applies source modifiers in `foeItemDmg`; use that resolver-owned total for
          // the preview whenever it differs so the board never advertises 5 and then deals 3.
          const resolvedHit = dop ? foeItemDmg(room, e, c.key) : 0;
          const resolvedPerHit = hits > 1 && resolvedHit % hits === 0 ? resolvedHit / hits : resolvedHit;
          const resolvedLabel = dop && resolvedHit !== live.now * hits
            ? `${resolvedPerHit}${live.glyph}${hits > 1 && resolvedHit % hits === 0 ? `×${hits}` : ""}`
            : live.label;
          const resolvedBoosted = dop && resolvedHit !== live.now * hits
            ? resolvedHit > live.base * hits
            : live.boosted;
          const payment = cardPayment(c.key, leveledBody(e), e);
          return {
            key: c.key, name: KIT[c.key]?.name ?? c.key,
            cost: payment.moxieCost, healthCost: payment.healthCost, printedCost: payment.totalCost,
            type: KIT[c.key]?.type ?? null, color: KIT[c.key]?.color ?? null,
            weightTag: cardWeightTag(c.key), text: KIT[c.key]?.text ?? "", dmg: cardDmgLabel(c.key),
            dmgNow: resolvedLabel, boosted: resolvedBoosted, dmgGlyph: live.glyph, front: qi === 0,
            harm, scope: harm ? foeThreatScope(ops) : null,
            hit: dop ? resolvedHit : null,       // TOTAL resolver damage; includes source multipliers such as Frost Orb's 0.5
            hits,                               // hit count, so the UI can show the ×N multiplier
            tgt: dop?.target ?? null,           // where it lands (front / front2 / front3 / lane / pick) → the foe-target icon
            // GLYPHS (2026-08-04): the compact machine shorthand of the whole card. Its damage
            // number is the SAME resolved per-hit as dmgNow above (foeItemDmg override), so the
            // telegraph chip and its cast bar can never disagree.
            glyphs: cardGlyphs(c.key, e, foeAllies,
              dop && resolvedHit !== live.now * hits ? { dealNow: resolvedPerHit } : {}),
          };
        }),
        castFrac: (() => { const f = (e.queue ?? [])[0]; if (!f) return 0;
          const payment = cardPayment(f.key, leveledBody(e), e);
          return Math.min(1, (e.moxie ?? 0) / Math.max(1, payment.moxieCost)); })(),
        gear: (e.equipment ?? []).map((it) => ({
          key: it.key, name: KIT[it.key]?.name ?? it.key, text: KIT[it.key]?.text ?? "", spent: !!it.spent,
          color: KIT[it.key]?.color ?? null, weightTag: cardWeightTag(it.key), passive: isPassiveItem(it.key),
        })),
        });
      }),
      // SUMMONS render PLAYER-SIZED now (owner 2026-06-27) — the client draws a full circle +
      // nameplate + passive/stat line like a hero/foe, so a Hedgefund Knight shows its card, passive
      // and stats. Carry the full display payload (a rat-stack reports its live "N rats" name + count).
      allies: (room.allies?.[i] ?? []).map((a) => ({
        id: a.id,                                 // stable token id → the client can heal-aim a summon (owner 2026-07-10)
        bodyKey: a.bodyKey, hp: a.hp, maxHp: a.maxHp,
        name: a.name ?? BODIES[a.bodyKey]?.name ?? a.bodyKey,
        color: BODIES[a.bodyKey]?.color ?? "#3ec98a",
        depth: a.depth ?? 0,                      // tokens sit IN the lane's unified line now
        aura: a.dynamicAura ?? BODIES[a.bodyKey]?.aura ?? null, // aura tokens get a distinct ring client-side
        ratCount: a.ratStack ? (a.ratCount ?? 1) : null, // a merged rat-stack: how many rats
        shield: a.shield ?? 0,
        thorns: a.thorns ?? 0,                    // 🌵 badge (owner 2026-07-10: summons read like a body)
        effects: entityEffects(a),                // active timed/ongoing buffs → icon+ring chips (same as foes/players)
        trackers: entityTrackers(room, a),        // body thresholds / clocks / armed continuing states
        phys: effPhys(a), mag: effMag(a),         // its stats (rat-stack bite rides phys/counters)
        passive: a.passiveText ?? BODIES[a.bodyKey]?.passiveText ?? null,
        threats: foeThreats(room, a),             // its own clock bars (largeRat/knight attack timers)
        // CARD CAST (owner 2026-06-29): summons read like foes now — moxie + the front card it's banking
        // toward + a "casts soon" fraction = moxie / front-card cost, so you see WHAT it plays and WHEN.
        moxie: a.moxie ?? 0, moxieMax: MOXIE_CAP,
        castFrac: (() => { const f = (a.queue ?? [])[0]; return f ? Math.min(1, (a.moxie ?? 0) / Math.max(1, cardCost(f.key, BODIES[a.bodyKey]))) : 0; })(),
        // the card it casts (Hedgefund Knight / rat Bite) — front-of-queue name + ⚡cost + live damage
        queue: (a.queue ?? []).slice(0, 1).map((c) => ({
          name: KIT[c.key]?.name ?? c.key, dmg: cardDmgLabel(c.key), color: KIT[c.key]?.color ?? null,
          weightTag: cardWeightTag(c.key),
          dmgNow: cardLiveDmg(c.key, a, 0).label, cost: cardCost(c.key, BODIES[a.bodyKey]),
          text: KIT[c.key]?.text ?? null,     // owner 2026-07-09: the summon strip shows the FULL effect prose ("what their card does"), same descriptor foe gear already exposes
          glyphs: cardGlyphs(c.key, a, 0),    // GLYPHS (2026-08-04): compact live shorthand for the strip
        })),
      })),
    })),
    // Back-line boss contract plus the lane-bound Djinn's matching command-panel projection.
    boss: bossAlive(room) ? bossDisplay(room, room.boss, false) : null,
    bossUi: bossAlive(room) ? undefined : bossDisplay(room, laneBoss, true),
    map: room.level
      ? (() => {
          // foe → a light PREVIEW descriptor (owner 2026-06-28: "show what is actually inside" the rooms),
          // now incl. the foe's DECK — its gear cards, GROUPED to {key,name,count} (owner 2026-06-29).
          // each grouped deck card also carries its KIT description `text` so the room-preview chips
          // can show the full card text on hover/tap (owner 2026-06-29) — reuses the authored KIT copy.
          const _foeDeck = (f) => {
            const out = [], seen = new Map();
            for (const k of (f.gear ?? [])) {
              let g = seen.get(k);
              if (!g) { g = { key: k, name: KIT[k]?.name ?? k, text: KIT[k]?.text ?? "", cost: KIT[k]?.cost ?? null, count: 0 }; seen.set(k, g); out.push(g); }
              g.count++;
            }
            return out;
          };
          // `passive` = the SAME readable string the live foe-state serializer ships (see enemies[].passive
          // below): the body's authored passiveText, so the preview tooltip matches the in-fight tooltip.
          const _foePrev = (f) => ({ bodyKey: f.bodyKey, name: BODIES[f.bodyKey]?.name ?? f.bodyKey,
            level: foeLevel(f), levelAllocation: f.levelAllocation ?? null,
            eliteTier: eliteTierOf(f.bodyKey), maxHp: foeMaxHpFor(f.bodyKey, foeLevel(f), f.levelAllocation), ante: anteOfFoe(f),
            passive: f.passiveText ?? leveledPassiveText(f), deck: _foeDeck(f) });
          const _rowOf = (n) => n.row ?? 0;
          const _rowCount = Math.max(0, ...room.level.nodes.map(_rowOf)) + 1;
          const _cur = room.level.nodes.find((n) => n.id === room.level.currentId);
          const _currentRow = _cur ? _rowOf(_cur) : 0;
          const _boss = room.level.nodes.find((n) => n.type === "boss");
          const _bossRow = _boss ? _rowOf(_boss) : _rowCount - 1;
          // Full-map inspection is perfect information over everything already fixed for this run.
          // Boss identity is seeded at draft time; values below reuse the same spawn/intent helpers as
          // combat so the preview cannot drift from the fight. A lane is not chosen until a card is
          // drawn, so lane-specific copy says RANDOM / BOSS / BEST instead of inventing Lane 1.
          const _bossKey = bossForFloor(room, room.floor ?? 1);
          const _bossBody = BODIES[_bossKey] ?? {};
          const _bossDef = BOSS_DEFS[_bossKey] ?? {};
          const _bossPlayers = bossPartySize(room);
          const _bossMaxHp = _bossKey === "kingMimic"
            ? 99 * _bossPlayers
            : Math.round(bodyMaxHp(_bossBody) * bossBudget(_bossPlayers, room.floor ?? 1));
          const _previewBoss = { bodyKey: _bossKey, lane: 0, counters: 0 };
          const _bossCards = (_bossDef.cards ?? []).map((card) => {
            const bar = { ...card, cardKey: card.key, playerScale: _bossPlayers,
              lane: (card.lane || card.key === "kingFingerBeam") ? 0 : null };
            let intent = bossCardIntent(room, _previewBoss, bar);
            if (card.lane) intent = intent.replace(/^Lane 1/i, "Random lane");
            else if (card.key === "kingDunk") intent = intent.replace(/^Lane 1/i, "King's lane");
            else if (card.key === "kingFingerBeam") intent = intent.replace(/^Lane 1/i, "Best hero lane");
            return { key: card.key, name: card.label, intent };
          });
          return { // each combat/elite node previews its ROOM ANTE (floor × party, ×2 elite) AND the ACTUAL
            // pre-built roster INSIDE it, so you can SEE the next room before choosing it. Room effects gone.
            // Elite rooms are FREE to enter now (owner 2026-06-28) — the elite cost moved to body adoption.
            nodes: room.level.nodes.map((n) => ({
              id: n.id, type: n.type, x: n.x, y: n.y, links: n.links, cleared: !!n.cleared, row: _rowOf(n),
              // ⚖ is the node's rolled-and-spent threat. Regular/Easy preserve the owner-ruled
              // 1:1 ◈ payout; Challenge previews its halved total. `compLoot` is the normal-mode
              // NON-CARRIED share — actor base + levels + elite premiums.
              ante: n.type === "combat" ? (n.ante ?? null) : null,
              ...(n.type === "combat" ? { loot: difficultyRewardValue(room,
                (n.foes ?? []).reduce((s, f) => s + foeLootValue(f), 0)) } : {}),
              ...(n.type === "combat" ? { compLoot: (n.foes ?? []).reduce((s, f) => s + anteOfFoe(f) - itemsAnteOf(f), 0) } : {}),
              ...(n.type === "combat" ? { contents: (n.foes ?? []).map(_foePrev) } : {}),
            })),
            currentId: room.level.currentId, levelComplete: !!room.levelComplete,
            // BOSS COUNTER (owner 2026-06-28): rooms remaining until this floor's boss.
            rowCount: _rowCount, currentRow: _currentRow,
            // the trailhead "start" row isn't a room, so don't count it toward the boss (owner 2026-06-29).
            roomsToBoss: Math.max(0, _bossRow - _currentRow - (room.level.nodes.some((n) => n.type === "start") ? 1 : 0)),
            bossName: _bossBody.name ?? null,
            bossPreview: { bodyKey: _bossKey, name: _bossBody.name ?? _bossKey, maxHp: _bossMaxHp,
              passive: _bossBody.passiveText ?? null, deckCadence: (_bossDef.deckCd ?? 0) / 10,
              cards: _bossCards, rareLoot: _bossPlayers + 2 } }; })() // run-seeded, resolver-derived boss preview
      : null,
    // CO-OP ROOM VOTE (owner 2026-06-28): on the won screen, who voted for which next-room node
    // (each voter's seat id + name + body icon/color + lock state), grouped by node id, plus the
    // lock progress. Null off the won screen and in solo (1 seat resolves instantly — no vote UI).
    roomVotes: (room.phase === "won" && room.level && !room.levelComplete) ? (() => {
      const seats = humanSeats(room);
      if (seats.length < 2) return null;                 // solo: instant-resolve, no badges/locks
      const votes = room.roomVotes ?? {}, locks = room.roomLocks ?? {};
      const byNode = {};
      for (const s of seats) {
        const to = votes[s.id];
        if (to == null) continue;
        (byNode[to] ??= []).push({ seat: s.id, name: s.name, bodyKey: s.bodyKey,
          color: BODIES[s.bodyKey]?.color ?? "#9ad", locked: !!locks[s.id] });
      }
      return { byNode, seatCount: seats.length, lockedCount: seats.filter((s) => locks[s.id]).length };
    })() : null,
    unlockedBodies: [...room.unlockedBodies].filter((k) => k !== STARTER_BODY), // never offer the Rookie Mimic as a swap (owner 2026-06-24)
    bodies: publicBodies(),
    // ELITE BODY ADOPTION (owner 2026-06-28): the flat card-VALUE price to ADOPT a non-starter body the
    // first time you wear it; once adopted it's in `adopted` and free. The WEAR screen shows the price and
    // tenders cards (send `swapBody {to, pay:[keys]}`); the server re-validates the value covers `cost`.
    adopt: { cost: ADOPT_COST, tiers: Object.fromEntries(Object.entries(ELITE_TIERS).map(([tier, d]) => [tier, {
      name: d.name, cost: d.adopt, ante: d.ante,
    }])), adopted: [...(room.adoptedBodies ?? [])] },
    roomValue: room.lastRoomValue ?? 0,   // the last room's ante sum (display only — no gold)
    loot: room.phase === "won" && room.loot?.length ? {
      cards: room.loot.map((k) => cardDescriptor(k)),   // claimable cards (free into the backpack)
    } : null,
    // AUTO-ACQUIRED THIS ROOM (solo since 2026-06-24, party mode since 2026-07-26): the keys the
    // room's clear dropped straight into the seat's own backpack with no tap. The party assign board
    // reads it purely to BADGE those cards as this room's haul among the seat's other spares — the
    // ownership itself is already in `players[].backpack`, so this is display/telemetry only.
    // A "start" node is EXCLUDED: `room.lootTaken` is only reset by the next combat win or a new run
    // (startDraft), so after a `descend` the floor-2/3 TRAILHEAD — a room chooser that dropped
    // nothing — still carries the boss room's haul, and would badge already-distributed cards
    // "✨ NEW" and hijack the tab away from the room picker. A trailhead has no spoils by
    // construction, so it reports none. (The root clear belongs in enterRoom/descend, engine/world.js
    // — another agent holds that file today, so the projection is gated instead.)
    lootTaken: room.phase === "won" && currentNode(room)?.type !== "start"
      ? [...(room.lootTaken ?? [])] : null,
    // PARTY LOOT ASSIGN (owner 2026-07-24) reads this `loot.cards` list plus the EXISTING per-body
    // fields in `players[]` below — no second projection exists or is needed. Everything the assign
    // screen needs is already there: `id`/`name`/`bodyKey` (identity), `owner` (the seat that owns
    // the body — match it against the socket's `joined.you` to get "my bodies"), `partyRole`
    // ("main" | "companion" | "solo"), `deckList` (full card descriptors of the exact slots a
    // Party swap must name), `deckSize`/`minDeck`/`maxDeck` (every Party body projects the same exact
    // ten-card size), `backpack` (the ownership ledger), and `bidPoints` (the
    // seat's claim budget; `loot.cards[].value` is the price). Do NOT duplicate these into `loot`.
    // pending player-to-player trade offers (out of combat only) — a straight card-for-card swap
    trade: tradeable(room) ? {
      offers: (room.tradeOffers ?? []).map((o) => ({
        id: o.id, from: o.from, to: o.to,
        fromName: room.players.get(o.from)?.name ?? "?", toName: room.players.get(o.to)?.name ?? "?",
        give: o.give, giveName: KIT[o.give]?.name ?? o.give, giveVal: itemTreasure(o.give),
        want: o.want, wantName: KIT[o.want]?.name ?? o.want, wantVal: itemTreasure(o.want),
      })),
    } : null,
    // (The `stock:` projection is DELETED, owner-approved 2026-07-19 — no live path ever set
    // phase "stock"; rooms arrive pre-generated and go straight to setup. See world.js enterRoom.)
    draft: room.phase === "draft" ? {
      // THE WHEEL — exactly three private body+deck offers per draftable body. `offeredTo` lets the
      // client show only the active body's triple; draftPick enforces the same ownership server-side.
      wheel: (room.draftWheel ?? []).map((b) => ({
        // maxHp goes through bodyMaxHp, NOT the raw authored literal: the draft screen must print the
        // HP the body will actually have. Fixed 2026-07-26 alongside BODY_FLAT_HP_BONUS — before that
        // the raw read only desynced under the HP knob (the long-standing BUG_REPORT item); with the
        // owner's flat +2 it would have understated EVERY drafted body by 2 on the wheel.
        id: b.id, bodyKey: b.bodyKey, name: BODIES[b.bodyKey].name, maxHp: bodyMaxHp(BODIES[b.bodyKey]),
        color: BODIES[b.bodyKey].color, passive: leveledPassiveText({ bodyKey: b.bodyKey }),
        offeredTo: b.offeredTo,
        role: room.players.get(b.offeredTo)?.partyRole ?? "solo",
        deckSize: b.items.length,
        lockedBy: [...room.players.values()].find((p) => p.lockedBundle === b.id)?.id ?? null,
        items: b.items.map((k) => ({ key: k, name: KIT[k].name, text: KIT[k].text, cd: KIT[k].cd, cost: KIT[k].cost ?? null, sum: cardSummaryLabel(k), scale: cardScale(k), weightTag: cardWeightTag(k), kind: cardKind(k), ranged: isRanged(k), bothKinds: opsBothKinds(KIT[k]?.ops) })),
      })),
      picks: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, drafted: !!p.drafted, bundle: p.lockedBundle ?? null })),
      // SEAT COLORS (owner 2026-08-07): the closed palette the draft screen renders as swatches —
      // the server stays the vocabulary authority, the client never hardcodes a hex.
      colors: PLAYER_COLORS,
      // CO-OP HOLD (owner 2026-07-06): every seat has drafted a FRESH run with 2+ humans — the run
      // waits for an explicit {beginRun} (▶ Start run) so late friends can still join and draft.
      hold: !room.level && draftComplete(room) && [...room.players.values()].filter((p) => !p.bot && !p.gone).length >= 2,
      // (the legacy `classes` projection is DELETED with the chooseClass path, owner-approved 2026-07-19)
    } : null,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, lane: p.lane, depth: p.depth ?? 0, targetId: p.targetId ?? null,
      // LANE-CHANGE COOLDOWN (owner 2026-07-24). UNITS = TICKS (100ms each), same unit as every
      // other cd/charge field in this projection. `laneCd` counts DOWN to 0 = ready; pair it with
      // the room-level `laneChangeCd` (the 60-tick max) to draw a ring. `laneBlockedTick` is the
      // room tick of the last REFUSED lane change so the client can flash "locked" instead of
      // letting a rejected input look like a dropped packet. Depth (↑/↓ in lane) is never gated.
      // Gate-aware on purpose: off-phase (setup / won) the cooldown is NOT enforced, so a stale
      // deadline must project as 0 — otherwise a client greying the button off `laneCd` would
      // block exactly the formation arranging the ruling deliberately left free.
      laneCd: laneChangeReady(room, p) ? 0 : laneChangeCdLeft(room, p),
      laneBlockedTick: p.laneCdBlockedTick ?? null,
      allyTargetId: p.allyTargetId ?? null,                // support-slot aim (click an ally)
      thorns: p.thorns ?? 0,                               // Spikes buff badge
      effects: entityEffects(p),                           // active timed/ongoing buffs → icon+ring chips
      trackers: entityTrackers(room, p),                   // body thresholds / clocks / armed continuing states
      offline: !p.ws && !p.bot,                          // seat held, socket gone (bots are never "offline")
      owner: p.owner ?? p.id,                            // SQUAD: the seat that owns this body (itself for a lone player)
      // SEAT COLOR (owner 2026-08-07): the owning HUMAN seat's chosen identity color — companions
      // resolve to their owner's pick, so every body a player holds wears one obvious border.
      color: (room.players.get(p.owner ?? p.id) ?? p).color ?? null,
      bot: !!p.bot,                                      // a squad body the human isn't piloting right now (on AUTO)
      partyRole: p.partyRole ?? "solo",
      partySize: partyMembers(room, p).length,
      bidPoints: p.bidPoints ?? 0,                       // co-op loot claim budget (owner 2026-07-02); bots always 0 (their SEAT holds the points)
      bodyKey: p.bodyKey, hp: p.hp, maxHp: p.maxHp, shield: p.shield ?? 0, counters: p.counters ?? 0, meleeBonus: meleeBonusOf(p), rangedBonus: rangedBonusOf(p), alive: p.alive,
      downCause: playerDownCause(room, p),                // exact lethal source stays visible while co-op combat continues
      level: runLevelOf(p),
      nextLevelCost: partyLevelCost(room, p,
        Math.max(...partyMembers(room, p).map(runLevelOf), runLevelOf(p)) + 1),
      levelPick: p.levelPick ?? null,
      levelEffectivePick: p.levelPick ?? null,
      levelBonus: (p.levelAllocation?.melee ?? 0) + (p.levelAllocation?.ranged ?? 0),
      levelAllocation: { ...(p.levelAllocation ?? {}) },
      levelPoints: levelPointBudget(runLevelOf(p)),
      levelPointsSpent: allocationPoints(p.bodyKey, p.levelAllocation),
      levelPointsUnspent: Math.max(0, levelPointBudget(runLevelOf(p)) - allocationPoints(p.bodyKey, p.levelAllocation)),
      levelUpgrades: BODY_UPGRADES[p.bodyKey] ?? null,
      eliteTier: eliteTierOf(p.bodyKey),
      nextLevelPicksDmg: false,
      treasure: partyMain(room, p)?.treasure ?? 0,       // one shared seat bank, visible from every owned body
      // PARTY MELT (owner 2026-07-24: "melt all the cards without having to click each one
      // individually in party mode"). The honest pre-tap readout for the ONE-action seat-wide melt
      // — send {type:"convertPartyBags"} to execute it. Totals across EVERY body this seat owns:
      //   count      spare cards that would melt (backpack copies beyond the deck)
      //   value      ◈ those spares would bank, in total
      //   bodies     how many owned bodies actually contribute a spare
      //   hasPassive at least one spare is a WORN PASSIVE whose effect dies with it — the single-body
      //              confirm warns about this, so the party confirm can warn identically
      // Projected on EVERY row (each body reports its whole seat's totals, like `treasure`), and in
      // every phase — the melt itself is refused during "playing", which the client already knows
      // from `phase`, and a nullable field would only add a special case for no gain.
      partyBag: partySpareSummary(room, p),
      phys: p.phys ?? 0, mag: p.mag ?? 0, dr: itemDmgReduce(p) + buffAmt(p, "stoneskin") + bodyFlatDR(p),  // worn DR + Stone Skin + body/form DR (Warewolf human +1)
      form: p.wform ?? null,  // WAREWOLF (owner 2026-07-11): "human"|"wolf" → client picks the form's icon
      passive: leveledPassiveText(p), tags: bodyTags(p.bodyKey), // this instance's real ranked effect + ⚡ triggers
      passiveChoice: sphinxChoiceDescriptor(room, p),            // Stockbroking Sphinx's armed three-way decision
      bodyThreats: foeThreats(room, p),                          // your body's own timer bars (Royal Rat/Wageslave)
      classKey: p.classKey ?? null,
      summonSide: p.summonSide ?? "front",               // where YOUR summons enter the line
      autoFire: !!p.autoFire,                            // ⚡ AUTO: ready damaging items fire themselves
      echo: BODIES[p.bodyKey]?.echo ?? null,             // worn echo body's school (drives the ECHO button)
      echoReady: !!p.echoReady, echoArmed: !!p.echoArmed,
      bodySummons: [].concat(BODIES[p.bodyKey]?.passive ?? [])  // a worn summoner body shows the toggle too
        .some((ps) => (ps.ops ?? []).some((o) => o.do === "summon")),
      // BACKPACK + DECK (owner 2026-06-24): the full owned repo and the chosen combat deck, each a
      // list of card descriptors. The client wave builds the deckbuilder against THESE two fields.
      backpack: (p.backpack ?? []).map((k) => cardDescriptor(k, leveledBody(p))),
      deckList: (p.deckList ?? []).map((k) => cardDescriptor(k, leveledBody(p))),
      deckSize: (p.deckList ?? []).length, minDeck: deckMinFor(p),
      maxDeck: Number.isFinite(deckMaxFor(p)) ? deckMaxFor(p) : null,
      // CARD/MOXIE (CARDS_SPEC §6): moxie + the face-up HAND (client plays by id) + draw-pile size.
      moxie: p.moxie ?? 0, moxieMax: MOXIE_CAP,
      stolenCards: (room.lanes ?? []).flat().filter((foe) => foe.hp > 0
        && foe.restoreTo?.kind === "krakenCard" && foe.restoreTo.playerId === p.id).map((foe) => ({
          cardId: foe.restoreTo.card?.id ?? null, cardKey: foe.restoreTo.card?.key ?? foe.itemKey ?? null,
          cardName: KIT[foe.restoreTo.card?.key ?? foe.itemKey]?.name ?? foe.itemKey ?? "Card",
          entityId: foe.id, state: "stolen",
        })),
      intentCard: playerCombatIntent(room, p),           // teammate/Party spatial "queued next" badge
      queuedCards: (() => {
        const queue = Array.isArray(p.cardQueue) ? p.cardQueue : (p.queuedCard ? [p.queuedCard] : []);
        const glyphAllies = Math.max(0, heroesInLane(room, p.lane).length - 1) + (room.allies?.[p.lane]?.length ?? 0);
        return queue.map((intent, index) => {
          const card = (p.hand ?? []).find((c) => c.id === intent.id);
          if (!card || !KIT[card.key]?.ops) return null;
          const payment = cardPayment(card.key, leveledBody(p), p), cost = payment.moxieCost;
          return { id: card.id, key: card.key, name: KIT[card.key]?.name ?? card.key,
            glyphs: cardGlyphs(card.key, p, glyphAllies, intent.pick ? { pick: intent.pick } : {}),   // GLYPHS (2026-08-04)
            cost, healthCost: payment.healthCost, printedCost: payment.totalCost,
            shortfall: Math.max(0, cost - (p.moxie ?? 0)), pick: intent.pick ?? null,
            priority: index + 1, planned: !!intent.planned };
        }).filter(Boolean);
      })(),
      // Legacy one-slot projection: old clients/tools keep reading queuedCard while new clients use
      // queuedCards for the complete ordered plan.
      queuedCard: (() => {
        const intent = (Array.isArray(p.cardQueue) ? p.cardQueue[0] : p.queuedCard) ?? null;
        const card = intent && (p.hand ?? []).find((c) => c.id === intent.id);
        if (!card || !KIT[card.key]?.ops) return null;
        const payment = cardPayment(card.key, leveledBody(p), p), cost = payment.moxieCost;
        const glyphAllies = Math.max(0, heroesInLane(room, p.lane).length - 1) + (room.allies?.[p.lane]?.length ?? 0);
        return { id: card.id, key: card.key, name: KIT[card.key]?.name ?? card.key,
          glyphs: cardGlyphs(card.key, p, glyphAllies, intent.pick ? { pick: intent.pick } : {}),   // GLYPHS (2026-08-04)
          cost, healthCost: payment.healthCost, printedCost: payment.totalCost,
          shortfall: Math.max(0, cost - (p.moxie ?? 0)), pick: intent.pick ?? null,
          priority: 1, planned: !!intent.planned };
      })(),
      hand: (p.hand ?? []).map((c) => {
        const payment = cardPayment(c.key, leveledBody(p), p), cc = payment.moxieCost;
        // LIVE damage (owner 2026-06-25): the snapshot sends the value THIS caster deals RIGHT NOW, so the
        // client paints gold without recomputing. allies = OTHER heroes + ally-summons in the player's lane
        // (mirrors the perAlly resolver count); ofShield reads the player's current shield.
        const allies = Math.max(0, heroesInLane(room, p.lane).length - 1) + (room.allies?.[p.lane]?.length ?? 0);
        const live = cardLiveDmg(c.key, p, allies);
        // COMPOUND SUMMARY (owner 2026-07-14 readability pass): the full first-glance number line —
        // every immediate outcome, not just the headline op. Heart Guard ships "🛡2 ❤2" here where the
        // old dmgNow shipped only the shield. `scale` is the prominent MELEE/RANGED/BOTH/none treatment.
        const liveSum = cardLiveSummary(c.key, p, allies);
        return { id: c.id, key: c.key, name: KIT[c.key]?.name ?? c.key, text: KIT[c.key]?.text ?? "",
          cost: cc, healthCost: payment.healthCost, printedCost: payment.totalCost,
          value: itemTreasure(c.key), type: KIT[c.key]?.type ?? null, color: KIT[c.key]?.color ?? null,
          dmg: cardDmgLabel(c.key), dmgNow: live.label, boosted: live.boosted, dmgBase: live.base, dmgGlyph: live.glyph,
          sum: cardSummaryLabel(c.key), sumNow: liveSum.label, sumBoosted: liveSum.boosted,
          scale: cardScale(c.key), weightTag: cardWeightTag(c.key),
          ranged: isRanged(c.key), kind: cardKind(c.key), bothKinds: opsBothKinds(KIT[c.key]?.ops), summons: (KIT[c.key]?.ops ?? []).some((o) => o.do === "summon" || o.do === "summonPick"),
          // PICK CONTRACT (owner 2026-07-07): a choose-on-play hand card carries its `pick` descriptor
          // (summonBody options / deckCard) — the client sends the choice back on the play message.
          ...(cardPick(c.key) ? { pick: cardPick(c.key) } : {}),
          affordable: (p.moxie ?? 0) >= cc
            && (payment.healthCost === 0 || (p.hp ?? 0) > payment.healthCost) };
      }),
      deckCount: (p.deck ?? []).length,
      discCount: (p.disc ?? []).length,   // DISCARD (owner 2026-07-01): played cards waiting for the dry-deck recycle
      // DECK PANEL (owner 2026-06-25): the live draw-pile + lasting-in-play cards, so the side panel
      // can show the whole deck with drawable cards BRIGHT and not-currently-drawable ones (in hand /
      // in play) greyed. Light descriptors (key/name/cost/color/kind) — enough to render a tile.
      drawPile: (p.deck ?? []).map((c) => ({ id: c.id, key: c.key, name: KIT[c.key]?.name ?? c.key, cost: cardCost(c.key, leveledBody(p)), color: KIT[c.key]?.color ?? null, kind: cardKind(c.key), dmg: cardDmgLabel(c.key), sum: cardSummaryLabel(c.key), scale: cardScale(c.key), weightTag: cardWeightTag(c.key) })),
      discPile: (p.disc ?? []).map((c) => ({ id: c.id, key: c.key, name: KIT[c.key]?.name ?? c.key, cost: cardCost(c.key, leveledBody(p)), color: KIT[c.key]?.color ?? null, kind: cardKind(c.key), dmg: cardDmgLabel(c.key), sum: cardSummaryLabel(c.key), scale: cardScale(c.key), weightTag: cardWeightTag(c.key) })),
      inPlayCards: (p.inPlay ?? []).map((c) => ({ key: c.key, name: KIT[c.key]?.name ?? c.key, cost: cardCost(c.key, leveledBody(p)), color: KIT[c.key]?.color ?? null, kind: cardKind(c.key), dmg: cardDmgLabel(c.key), sum: cardSummaryLabel(c.key), scale: cardScale(c.key), weightTag: cardWeightTag(c.key) })),
      inv: p.inv.map((inv) => ({
        key: inv.key, name: KIT[inv.key].name, text: KIT[inv.key].text, type: KIT[inv.key].type ?? null,
        ranged: isRanged(inv.key),             // 🎯 badge: the reticle drives this item
        color: KIT[inv.key].color ?? null, passive: isPassiveItem(inv.key), dr: KIT[inv.key]?.passive?.dr ?? 0,
        fragile: !!KIT[inv.key].fragile, spent: !!inv.spent,
        summons: (KIT[inv.key].ops ?? []).some((o) => o.do === "summon"), // shows the front/behind toggle

        charge: inv.charge, cd: itemCd(inv, BODIES[p.bodyKey]), ready: !inv.spent && inv.charge >= itemCd(inv, BODIES[p.bodyKey]),
      })),
    })),
    // COMBAT LOG — only shipped when the fight is OVER (never streamed every tick).
    combatLog: (room.phase === "lost" || room.phase === "won") ? (room.combatLog ?? []) : undefined,
  };
}
