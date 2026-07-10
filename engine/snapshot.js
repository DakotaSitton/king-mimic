// King Mimic engine — client snapshot projection (extracted from game.js barrel).
// entityEffects/foeTelegraph/snapshot + publicBodies/cardDescriptor. Owns _publicBodies.
// No eval-time cross-module reads — externals import from the barrel, used at call time.
import {
  tradeable,
  ADOPT_COST,
  ANTE_CAP_BASE,
  ANTE_MIN,
  ANTE_STEP,
  ATLAS_REFLECT_PER,
  BODIES,
  BOSS_BODIES,
  BOSS_DEFS,
  CLASSES,
  COMMON_SET,
  DJINN_ITEM_POOL,
  DRAFT_BODIES,
  DRAFT_PICKS,
  DRAFT_WHEEL_MIN,
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
  SHOP_WARES,
  STALL_LIMIT,
  STARTER_BODY,
  STARTER_DECK,
  START_MOXIE,
  STOCK_MAX,
  THRONE_FLOOR,
  absorbShield,
  accelClocks,
  acceptTrade,
  addBuff,
  addFoe,
  addGreedy,
  addPlayer,
  adoptCost,
  advanceLevel,
  aimedFoe,
  anteCurrent,
  anteOfFoe,
  applyBodyLevel,
  applyCombatStart,
  armEcho,
  atlasReflect,
  autoDraftBots,
  autoPlay,
  autoStockBots,
  beginCombat,
  bodyAnteOf,
  bodyMaxHp,
  bodyTags,
  bodyValue,
  bossAlive,
  bossBudget,
  bossForFloor,
  bossOnDamaged,
  buffAmt,
  buildFoePool,
  buildLevel,
  buildQueue,
  buildRoom,
  buyWare,
  canSwapTo,
  cardCost,
  playCost,
  cardDealInfo,
  cardDmgLabel,
  cardEventPassives,
  cardKind,
  cardLiveDmg,
  cardPick,
  cardScaleGlyph,
  cdScale,
  chooseClass,
  claimLoot,
  clog,
  commitStock,
  countKey,
  currentNode,
  cycleTarget,
  damageEnemy,
  damagePlayer,
  dealHand,
  dealtTriggerPassives,
  deckKeys,
  declineTrade,
  defaultCardCost,
  deriveLaneCount,
  descend,
  draftComplete,
  draftPick,
  drainClocks,
  drawBossRotation,
  drawKingDeck,
  drawUp,
  dropItem,
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
  foeThreat,
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
  laneHeroes,
  laneLine,
  leaveShop,
  levelAnte,
  levelCombatBonus,
  levelHpBonus,
  levelUp,
  levelUpCost,
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
  nextKingCard,
  nextPaletteOption,
  nodeById,
  opsHarm,
  ownerLaneOf,
  picksRequiredFor,
  placedLanes,
  playCard,
  playTriggerPassives,
  playerPicks,
  powerFor,
  proposeTrade,
  rangedBonusOf,
  regenMoxie,
  removeFoe,
  removeGreedy,
  reopenDraftForJoin,
  rerollShop,
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
  rollShopWares,
  roomAnteBudget,
  roomValue,
  runLevelOf,
  runPassive,
  setAllyTarget,
  setCdMult,
  setHpMult,
  setTarget,
  shopPrice,
  shuffle,
  simulateTick,
  spawnBoss,
  spawnEnemy,
  spawnFoeInLane,
  spawnItemEntity,
  spendTriggerPassives,
  startDraft,
  startLevel,
  stockAnteRequired,
  stockLevelRooms,
  stockReady,
  summonBodies,
  swapBody,
  swapOwnItems,
  syncLobbyLanes,
  syncRatStack,
  tankiness,
  targetedFoe,
  tenderValue,
  tentacleCount,
  tickBloodToIron,
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
  upTheAnte,
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
    _publicBodies = Object.fromEntries(Object.entries(BODIES).map(([k, b]) => [k, publicBody(b)]));
    _publicBodiesMult = getHpMult();
  }
  return _publicBodies;
};

// DUAL-KIND marker (owner 2026-07-09): does any of a card's ops count as BOTH melee AND ranged
// (bothKinds:true)? Recurses into `timer` wrappers so Rainblow's delayed lane strike counts too.
// Pure data-surfacing so the client can badge Moonlight/Rainblow with a 🗡🎯 dual marker.
const opsBothKinds = (ops) => (ops ?? []).some((o) => o.do === "timer" ? opsBothKinds(o.ops) : o.bothKinds === true);

// THE CARD DESCRIPTOR (owner 2026-06-24) — the single shape the client renders for any card, used
// for the backpack, the deckList, the shop wares, and loot. `value` = itemTreasure (the only
// resource), `cost` = the moxie cost for THIS body (discount baked in), `dmg` = headline label,
// `ranged` = whether the reticle drives it. Pass the wearer's body so the cost is the live one.
export const cardDescriptor = (key, body = null) => ({
  key, name: KIT[key]?.name ?? key, text: KIT[key]?.text ?? "",
  value: itemTreasure(key), color: KIT[key]?.color ?? null,
  cost: cardCost(key, body), dmg: cardDmgLabel(key), ranged: isRanged(key), kind: cardKind(key),
  passive: isPassiveItem(key),   // worn passive (Cool Shoes) — the ♻ convert confirm warns these melt too
  // PICK CONTRACT (owner 2026-07-07 batch D): a choose-on-play card ships its `pick` descriptor —
  // { kind: "summonBody", options: [{key,label,icon}] } (Grand Spirit) / { kind: "deckCard" }
  // (Crystal Ball). Absent on every ordinary card. The client answers via the play message's `pick`.
  ...(cardPick(key) ? { pick: cardPick(key) } : {}),
});

// ACTIVE-EFFECT chips (owner 2026-06-24): the timed/ongoing buffs a combatant is CARRYING, each as
// { icon, label, left, dur } — the client draws a small icon with a countdown ring (when timed) and a
// hover label. Innate body passives are NOT listed here (always-on; shown as the card's passive text).
const BUFF_META = {
  power:      { icon: "💪", label: "Power" },
  swordPower: { icon: "💪", label: "Power" },
  haste:      { icon: "⏩", label: "Haste — moxie 2× faster" },
  stoneskin:  { icon: "🪨", label: "Stoneskin — less damage taken" },
  slow:       { icon: "🐌", label: "Slow — moxie charges at half rate" },     // debuff (owner 2026-06-27)
  weakness:   { icon: "📉", label: "Weakness — deals half damage (round up)" }, // debuff (owner 2026-06-27)
  sap:        { icon: "⚫", label: "Sapped — deals less damage" },            // debuff (Gravity Greatshield / Black Hole — the spec's required chip on debuffed foes)
};
export function entityEffects(c) {
  const out = [];
  for (const b of (c.buffs ?? [])) {
    const m = BUFF_META[b.kind] ?? { icon: "✦", label: b.kind };
    out.push({ icon: m.icon, label: `${m.label}${b.amount ? ` +${b.amount}` : ""}`, left: b.left, dur: b.dur ?? b.left });
  }
  if (c.bloodToIron) out.push({ icon: "🩸", label: `Blood To Iron — ${c.bloodToIron.stored} hit(s) counted, repays 1 shield each`, left: c.bloodToIron.left, dur: c.bloodToIron.dur ?? c.bloodToIron.left });
  if ((c.poison ?? 0) > 0) out.push({ icon: "☠", label: `Poison ×${c.poison} — ${c.poison} dmg every ${Math.round(POISON_PERIOD / 10)}s`, left: POISON_PERIOD - (c.poisonClock ?? 0), dur: POISON_PERIOD });   // poison DoT chip (owner 2026-06-27)
  for (const g of (c.regens ?? [])) {
    const heal = (g.kind ?? "heal") === "heal";
    out.push({ icon: heal ? "💚" : "🛡", label: `Regen — +${g.amount} ${heal ? "heal" : "shield"} every ${Math.round((g.period ?? 30) / 10)}s`, left: null, dur: null });
  }
  // card-granted TIMERS (Pet Leech, Animated Blade) — lasting drains/strikes on the CASTER. These are
  // not foe debuffs (the effect lives on you), but they DID show no chip at all before (entityEffects
  // skipped c.timers); surface them like regens so the player can see the ongoing effect. (owner 2026-06-29)
  for (const tm of (c.timers ?? [])) {
    const op = (tm.ops ?? [])[0] ?? {};
    const secs = Math.round((tm.period ?? 60) / 10), amt = op.amount ?? 1;
    out.push(op.lifesteal
      ? { icon: "🩸", label: `Drain — ${amt} dmg + heal ${amt} every ${secs}s`, left: null, dur: null }
      : { icon: "⏱", label: `Strike — ${amt} dmg every ${secs}s`, left: null, dur: null });
  }
  // COOL SHOES' cast-installed refund (owner 2026-07-06: worn passives are DEAD — "they're just a
  // card"; the 7/5 worn-inventory chip loop went with them). The lasting buff shows like Stoneskin's.
  if ((c.moxieOnPlayBuff ?? 0) > 0)
    out.push({ icon: "👟", label: `Cool Shoes — +${c.moxieOnPlayBuff} moxie each card you play (this fight)`, left: null, dur: null });
  if ((c.thorns ?? 0) > 0) out.push({ icon: "🌵", label: `Thorns — attackers take ${c.thorns}`, left: null, dur: null });
  // MIRROR SHIELD (owner 2026-07-07 batch D): the armed one-shot reflect shows while it waits.
  if ((c.mirrorShield ?? 0) > 0)
    out.push({ icon: "🪞", label: `Mirror Shield — the next attack that hits reflects its damage back${c.mirrorShield > 1 ? ` (×${c.mirrorShield})` : ""}`, left: null, dur: null });
  return out;
}

// The deal op that governs a foe's NEXT attack: the front queued card's deal, else its first
// damaging body passive (attack/deal/schoolStrike/dealEachLane). Drives the target telegraph.
function foeFrontDealOp(e) {
  const fc = (e.queue ?? [])[0];
  if (fc) { const d = (KIT[fc.key]?.ops ?? []).find((o) => o.do === "deal"); if (d) return d; }
  for (const p of BODIES[e.bodyKey]?.passive ?? []) {
    const d = (p.ops ?? []).find((o) => FOE_DMG_OPS.has(o.do));
    if (d) return d;
  }
  return null;
}
// TARGET TELEGRAPH (owner spec 2026-06-27): the PLAYER id(s) a foe's next/primary attack lands on
// RIGHT NOW — the client draws a small portrait circle on each. Mirrors the resolver's routing:
// ranged (pick) snipes the weakest player; melee front/front2 hits the front PLAYER of its own
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
  if (op.target === "lane" || op.target === "pickLane") return heroesInLane(room, li).map((p) => p.id);   // pickLane (Black Hole): a reticle-less foe strikes its own lane
  if (foeOpSnipes(op)) { const t = lowestEHpPlayer(room, li); return t ? [t.id] : []; }
  let line = laneLine(room, li);
  if (!line.length) { const rl = nearestDefendedLane(room, li); if (rl < 0) return []; line = laneLine(room, rl); }
  return line.slice(0, op.target === "front2" ? 2 : 1).filter(isPlayer).map((c) => c.id);
}

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
    lanes: room.lanes.map((arr, i) => ({
      enemies: arr.map((e) => ({
        id: e.id, bodyKey: e.bodyKey, name: e.name ?? BODIES[e.bodyKey]?.name ?? e.bodyKey, level: e.level ?? 1, hp: e.hp, maxHp: e.maxHp, shield: e.shield ?? 0, charge: e.charge,
        cd: Math.round((BODIES[e.bodyKey]?.cd ?? 0) * (e.cdMul ?? 1)),
        threat: foeThreat(room, e),     // {frac, cd} soonest INCOMING damage — drives border heat + AoE alarm
        threats: foeThreats(room, e),   // ALL damaging clocks (one labeled, color-coded bar each)
        tgtPids: foeTelegraph(room, e), // TARGET TELEGRAPH: which PLAYER(s) this foe's next attack hits → on-player portrait circle
        portrait: e.bodyKey,            // the sprite the telegraph circle shows (this foe's face)
        reactive: (BODIES[e.bodyKey]?.passive ?? []).some((p) => p.on === "damaged" && opsHarm(p.ops)), // hits back when struck (no clock)
        tags: bodyTags(e.bodyKey),      // ⚡ trigger labels (on sword/staff/when hit) — no clock, shown as tags
        dr: itemDmgReduce(e) + buffAmt(e, "stoneskin"),  // worn DR + Stone Skin → 🛡 badge
        passive: e.passiveText ?? BODIES[e.bodyKey]?.passiveText ?? null,
        boss: !!BODIES[e.bodyKey]?.boss,
        aoe: (BODIES[e.bodyKey]?.passive ?? []).some((p) => (p.ops ?? []).some((o) => o.do === "dealEachLane"))
          || (e.clocks ?? []).some((k) => k.aoe), // telegraph: hits EVERY lane (Djinn's scorch clock too)
        warded: !!BODIES[e.bodyKey]?.ward && foeCount(room) > 1, // King Mimic: untouchable until its court falls
        atk: effPhys(e), phys: effPhys(e), mag: effMag(e), counters: e.counters ?? 0, meleeBonus: meleeBonusOf(e), rangedBonus: rangedBonusOf(e),
        thorns: e.thorns ?? 0,                              // spikes buff → 🌵 badge
        effects: entityEffects(e),                          // active timed/ongoing buffs → icon+ring chips
        aura: BODIES[e.bodyKey]?.aura ?? null,              // foe-side Totem/Flag token badge
        // CARD CAST (CARDS_SPEC §6): moxie + the ordered queue (front casts first) + a "casts soon"
        // fraction = moxie / front-card cost. Replaces the cooldown charge for card casting.
        moxie: e.moxie ?? 0, moxieMax: MOXIE_CAP,
        queue: (e.queue ?? []).map((c, qi) => {
          const dop = (KIT[c.key]?.ops ?? []).find((o) => o.do === "deal" && (o.amount ?? 0) > 0);
          // LIVE: a queued hit reads boosted off the FOE's OWN bonus (a ramped foe's queued cards read
          // gold too). allies = OTHER foes in this lane (mirror of the perAlly foe-side resolver).
          const foeAllies = Math.max(0, (arr?.length ?? 1) - 1);
          const live = cardLiveDmg(c.key, e, foeAllies);
          const hits = live.count ?? 1;
          return {
            key: c.key, name: KIT[c.key]?.name ?? c.key, cost: foeCardCost(c.key, BODIES[e.bodyKey], room),
            type: KIT[c.key]?.type ?? null, color: KIT[c.key]?.color ?? null, dmg: cardDmgLabel(c.key),
            dmgNow: live.label, boosted: live.boosted, dmgGlyph: live.glyph, front: qi === 0,
            hit: dop ? live.now * hits : null,  // TOTAL live damage (per-hit × hit count) — owner 2026-06-27: a 4-hit Omnislash now reads its real total (−8), not one hit (−2)
            hits,                               // hit count, so the UI can show the ×N multiplier
            tgt: dop?.target ?? null,           // where it lands (front / front2 / lane / pick) → the foe-target icon
          };
        }),
        castFrac: (() => { const f = (e.queue ?? [])[0]; return f ? Math.min(1, (e.moxie ?? 0) / Math.max(1, foeCardCost(f.key, BODIES[e.bodyKey], room))) : 0; })(),
        gear: (e.equipment ?? []).map((it) => ({
          key: it.key, name: KIT[it.key]?.name ?? it.key, text: KIT[it.key]?.text ?? "", spent: !!it.spent,
          color: KIT[it.key]?.color ?? null, passive: isPassiveItem(it.key),
        })),
      })),
      // SUMMONS render PLAYER-SIZED now (owner 2026-06-27) — the client draws a full circle +
      // nameplate + passive/stat line like a hero/foe, so a Hedgefund Knight shows its card, passive
      // and stats. Carry the full display payload (a rat-stack reports its live "N rats" name + count).
      allies: (room.allies?.[i] ?? []).map((a) => ({
        id: a.id,                                 // stable token id → the client can heal-aim a summon (owner 2026-07-10)
        bodyKey: a.bodyKey, hp: a.hp, maxHp: a.maxHp,
        name: a.name ?? BODIES[a.bodyKey]?.name ?? a.bodyKey,
        color: BODIES[a.bodyKey]?.color ?? "#3ec98a",
        depth: a.depth ?? 0,                      // tokens sit IN the lane's unified line now
        aura: BODIES[a.bodyKey]?.aura ?? null,    // aura tokens get a distinct ring client-side
        ratCount: a.ratStack ? (a.ratCount ?? 1) : null, // a merged rat-stack: how many rats
        shield: a.shield ?? 0,
        phys: effPhys(a), mag: effMag(a),         // its stats (rat-stack bite rides phys/counters)
        passive: a.passiveText ?? BODIES[a.bodyKey]?.passiveText ?? null,
        threats: foeThreats(room, a),             // its own clock bars (largeRat/knight attack timers)
        // CARD CAST (owner 2026-06-29): summons read like foes now — moxie + the front card it's banking
        // toward + a "casts soon" fraction = moxie / front-card cost, so you see WHAT it plays and WHEN.
        moxie: a.moxie ?? 0,
        castFrac: (() => { const f = (a.queue ?? [])[0]; return f ? Math.min(1, (a.moxie ?? 0) / Math.max(1, cardCost(f.key, BODIES[a.bodyKey]))) : 0; })(),
        // the card it casts (Hedgefund Knight / rat Bite) — front-of-queue name + ⚡cost + live damage
        queue: (a.queue ?? []).slice(0, 1).map((c) => ({
          name: KIT[c.key]?.name ?? c.key, dmg: cardDmgLabel(c.key), color: KIT[c.key]?.color ?? null,
          dmgNow: cardLiveDmg(c.key, a, 0).label, cost: cardCost(c.key, BODIES[a.bodyKey]),
          text: KIT[c.key]?.text ?? null,     // owner 2026-07-09: the summon strip shows the FULL effect prose ("what their card does"), same descriptor foe gear already exposes
        })),
      })),
    })),
    // THE BACK-LINE BOSS — the wide foe-side banner the renderer draws behind the foe rows.
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
            level: foeLevel(f), maxHp: foeMaxHpFor(f.bodyKey, foeLevel(f)), ante: anteOfFoe(f),
            passive: f.passiveText ?? BODIES[f.bodyKey]?.passiveText ?? null, deck: _foeDeck(f) });
          const _rowOf = (n) => n.row ?? 0;
          const _rowCount = Math.max(0, ...room.level.nodes.map(_rowOf)) + 1;
          const _cur = room.level.nodes.find((n) => n.id === room.level.currentId);
          const _currentRow = _cur ? _rowOf(_cur) : 0;
          const _boss = room.level.nodes.find((n) => n.type === "boss");
          const _bossRow = _boss ? _rowOf(_boss) : _rowCount - 1;
          return { // each combat/elite node previews its ROOM ANTE (floor × party, ×2 elite) AND the ACTUAL
            // pre-built roster INSIDE it, so you can SEE the next room before choosing it. Room effects gone.
            // Elite rooms are FREE to enter now (owner 2026-06-28) — the elite cost moved to body adoption.
            nodes: room.level.nodes.map((n) => ({
              id: n.id, type: n.type, x: n.x, y: n.y, links: n.links, cleared: !!n.cleared, row: _rowOf(n),
              // ANTE V3 (owner 2026-07-03): ⚖ = the node's ROLLED-AND-SPENT threat (foes + effect pot).
              // ◈ loot = everything ABOVE the flat +1-per-foe base that actually drops on the win:
              // carried cards + each foe's level/elite surplus (→ random treasures) + the effect pot.
              // So ◈ = ⚖ − 1 per foe — the base is a threat-only cover charge (foeLootValue excludes it).
              ante: n.type === "combat" ? (n.ante ?? null) : null,
              ...(n.type === "combat" ? { loot: (n.foes ?? []).reduce((s, f) => s + foeLootValue(f), 0)
                    + (n.effect ? (GIMMICKS[n.effect]?.pot ?? 0) : 0) } : {}),
              ...(n.type === "combat" ? { contents: (n.foes ?? []).map(_foePrev) } : {}),
              ...(n.effect && GIMMICKS[n.effect] ? {
                gimmick: GIMMICKS[n.effect].name, gimmickBlurb: GIMMICKS[n.effect].blurb,
                gimmickPot: GIMMICKS[n.effect].pot ?? 0,
              } : {}),
            })),
            currentId: room.level.currentId, levelComplete: !!room.levelComplete,
            // BOSS COUNTER (owner 2026-06-28): rooms remaining until this floor's boss.
            rowCount: _rowCount, currentRow: _currentRow,
            // the trailhead "start" row isn't a room, so don't count it toward the boss (owner 2026-06-29).
            roomsToBoss: Math.max(0, _bossRow - _currentRow - (room.level.nodes.some((n) => n.type === "start") ? 1 : 0)),
            bossName: BODIES[bossForFloor(room, room.floor ?? 1)]?.name ?? null }; })() // run-seeded preview: the floor's boss by name
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
    adopt: { cost: ADOPT_COST, adopted: [...(room.adoptedBodies ?? [])] },
    roomValue: room.lastRoomValue ?? 0,   // the last room's ante sum (display only — no gold)
    loot: room.phase === "won" && room.loot?.length ? {
      cards: room.loot.map((k) => cardDescriptor(k)),   // claimable cards (free into the backpack)
    } : null,
    // pending player-to-player trade offers (out of combat only) — a straight card-for-card swap
    trade: tradeable(room) ? {
      offers: (room.tradeOffers ?? []).map((o) => ({
        id: o.id, from: o.from, to: o.to,
        fromName: room.players.get(o.from)?.name ?? "?", toName: room.players.get(o.to)?.name ?? "?",
        give: o.give, giveName: KIT[o.give]?.name ?? o.give, giveVal: itemTreasure(o.give),
        want: o.want, wantName: KIT[o.want]?.name ?? o.want, wantVal: itemTreasure(o.want),
      })),
    } : null,
    // ELITE GIMMICK (owner 2026-06-29): the active room's modifier, surfaced so the client can banner it
    // during the fight (the room PREVIEW reads node.gimmick instead). Null in every non-elite room.
    gimmick: room.gimmick ? { name: room.gimmick.name, blurb: room.gimmick.blurb, key: room.gimmick.key } : null,
    // the gimmick's live room-wide clock (Acid Rain / Runaway Scaling) → the HUD shows a countdown chip.
    roomTimers: (room.roomTimers ?? []).map((t) => ({ kind: t.kind, cd: t.cd, frac: Math.min(1, (t.charge ?? 0) / Math.max(1, t.cd)) })),
    // SHOP — value-for-value (owner 2026-06-24): each ware is a card descriptor carrying its `value`;
    // the client pays by selecting owned cards whose summed value ≥ the ware's value. No gold/reroll fee.
    shop: room.phase === "shop" && room.shop ? {
      wares: (room.shop.wares ?? []).map((w) => cardDescriptor(w.key)),
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
        bodyKey: o.bodyKey, name: BODIES[o.bodyKey].name, level: foeLevel(o), maxHp: foeMaxHpFor(o.bodyKey, foeLevel(o)),
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
          bodyKey: f.bodyKey, name: b.name ?? f.bodyKey, lane: ln[i], level: foeLevel(f),
          // full inspect payload — the stock screen's hover card reads these
          maxHp: foeMaxHpFor(f.bodyKey, foeLevel(f)), phys: b.phys ?? 0, mag: b.mag ?? 0,
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
        items: b.items.map((k) => ({ key: k, name: KIT[k].name, text: KIT[k].text, cd: KIT[k].cd, cost: KIT[k].cost ?? null })),
      })),
      picks: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, drafted: !!p.drafted, bundle: p.lockedBundle ?? null })),
      // CO-OP HOLD (owner 2026-07-06): every seat has drafted a FRESH run with 2+ humans — the run
      // waits for an explicit {beginRun} (▶ Start run) so late friends can still join and draft.
      hold: !room.level && draftComplete(room) && [...room.players.values()].filter((p) => !p.bot && !p.gone).length >= 2,
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
      effects: entityEffects(p),                           // active timed/ongoing buffs → icon+ring chips
      offline: !p.ws && !p.bot,                          // seat held, socket gone (bots are never "offline")
      owner: p.owner ?? p.id,                            // SQUAD: the seat that owns this body (itself for a lone player)
      bot: !!p.bot,                                      // a squad body the human isn't piloting right now (on AUTO)
      bidPoints: p.bidPoints ?? 0,                       // co-op loot claim budget (owner 2026-07-02); bots always 0 (their SEAT holds the points)
      bodyKey: p.bodyKey, hp: p.hp, maxHp: p.maxHp, shield: p.shield ?? 0, counters: p.counters ?? 0, meleeBonus: meleeBonusOf(p), rangedBonus: rangedBonusOf(p), alive: p.alive,
      level: runLevelOf(p), nextLevelCost: levelUpCost(runLevelOf(p) + 1),   // PLAYER LEVELING (owner 2026-06-29): the player's RUN-WIDE level + cost to level once more (drives the pay-picker)
      treasure: p.treasure ?? 0,                         // banked ◈ (owner 2026-07-06): convertBag mints it; level-ups/adoptions spend it
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
      // BACKPACK + DECK (owner 2026-06-24): the full owned repo and the chosen combat deck, each a
      // list of card descriptors. The client wave builds the deckbuilder against THESE two fields.
      backpack: (p.backpack ?? []).map((k) => cardDescriptor(k, BODIES[p.bodyKey])),
      deckList: (p.deckList ?? []).map((k) => cardDescriptor(k, BODIES[p.bodyKey])),
      deckSize: (p.deckList ?? []).length, minDeck: MIN_DECK,   // floor display for the editor
      // CARD/MOXIE (CARDS_SPEC §6): moxie + the face-up HAND (client plays by id) + draw-pile size.
      moxie: p.moxie ?? 0, moxieMax: MOXIE_CAP,
      hand: (p.hand ?? []).map((c) => {
        const cc = playCost(c.key, BODIES[p.bodyKey], p);   // body pricing + live cast-buff state (Two-Handers / free-next, owner 2026-07-06) — matches what playCard will charge
        // LIVE damage (owner 2026-06-25): the snapshot sends the value THIS caster deals RIGHT NOW, so the
        // client paints gold without recomputing. allies = OTHER heroes + ally-summons in the player's lane
        // (mirrors the perAlly resolver count); ofShield reads the player's current shield.
        const allies = Math.max(0, heroesInLane(room, p.lane).length - 1) + (room.allies?.[p.lane]?.length ?? 0);
        const live = cardLiveDmg(c.key, p, allies);
        return { id: c.id, key: c.key, name: KIT[c.key]?.name ?? c.key, text: KIT[c.key]?.text ?? "",
          cost: cc, value: itemTreasure(c.key), type: KIT[c.key]?.type ?? null, color: KIT[c.key]?.color ?? null,
          dmg: cardDmgLabel(c.key), dmgNow: live.label, boosted: live.boosted, dmgBase: live.base, dmgGlyph: live.glyph,
          ranged: isRanged(c.key), kind: cardKind(c.key), bothKinds: opsBothKinds(KIT[c.key]?.ops), summons: (KIT[c.key]?.ops ?? []).some((o) => o.do === "summon" || o.do === "summonPick"),
          // PICK CONTRACT (owner 2026-07-07): a choose-on-play hand card carries its `pick` descriptor
          // (summonBody options / deckCard) — the client sends the choice back on the play message.
          ...(cardPick(c.key) ? { pick: cardPick(c.key) } : {}),
          affordable: (p.moxie ?? 0) >= cc };
      }),
      deckCount: (p.deck ?? []).length,
      discCount: (p.disc ?? []).length,   // DISCARD (owner 2026-07-01): played cards waiting for the dry-deck recycle
      // DECK PANEL (owner 2026-06-25): the live draw-pile + lasting-in-play cards, so the side panel
      // can show the whole deck with drawable cards BRIGHT and not-currently-drawable ones (in hand /
      // in play) greyed. Light descriptors (key/name/cost/color/kind) — enough to render a tile.
      drawPile: (p.deck ?? []).map((c) => ({ key: c.key, name: KIT[c.key]?.name ?? c.key, cost: cardCost(c.key, BODIES[p.bodyKey]), color: KIT[c.key]?.color ?? null, kind: cardKind(c.key), dmg: cardDmgLabel(c.key) })),
      discPile: (p.disc ?? []).map((c) => ({ key: c.key, name: KIT[c.key]?.name ?? c.key, cost: cardCost(c.key, BODIES[p.bodyKey]), color: KIT[c.key]?.color ?? null, kind: cardKind(c.key), dmg: cardDmgLabel(c.key) })),
      inPlayCards: (p.inPlay ?? []).map((c) => ({ key: c.key, name: KIT[c.key]?.name ?? c.key, cost: cardCost(c.key, BODIES[p.bodyKey]), color: KIT[c.key]?.color ?? null, kind: cardKind(c.key), dmg: cardDmgLabel(c.key) })),
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
    // COMBAT LOG — only shipped when the fight is OVER (never streamed every tick).
    combatLog: (room.phase === "lost" || room.phase === "won") ? (room.combatLog ?? []) : undefined,
  };
}
