// tools/brain.mjs — shared combat / draft brain for King Mimic autopilot
// Imported by shoot.mjs AND loop-to-win.mjs. Edit here; both tools inherit the change.
// Do NOT duplicate this logic — import from here.

// ── CARD KNOWLEDGE (mirrors game.js KIT — total dmg = dmg*hits; flags drive the AI) ─────────
export const CARD = {
  oSword:{c:3,dmg:2,tgt:"front"}, oHatchet:{c:4,dmg:3,tgt:"front"}, oSpear:{c:4,dmg:2,tgt:"front2"},
  oDagger:{c:2,dmg:1,tgt:"front"}, oMallet:{c:5,dmg:4,tgt:"front",shield:4}, oZweihander:{c:6,dmg:5,tgt:"front"},
  oTwinUchis:{c:4,dmg:2,hits:2,tgt:"front",multi:1}, oPowerUp:{c:3,ramp:1}, oComboBlade:{c:1,dmg:1,tgt:"front"},
  oBow:{c:4,dmg:2,tgt:"pick",ranged:1}, oJavelin:{c:5,dmg:5,tgt:"pick",ranged:1}, oFire:{c:5,dmg:6,tgt:"pick",ranged:1},
  oIce:{c:5,dmg:3,tgt:"pick",ranged:1}, oArcane:{c:2,dmg:1,tgt:"pick",ranged:1}, oDark:{c:5,dmg:4,tgt:"pick",ranged:1,heal:4},
  oWind:{c:3,dmg:2,tgt:"pick",ranged:1}, oLightning:{c:5,dmg:3,tgt:"lane",multi:1}, oMeteors:{c:6,dmg:6,tgt:"lane",multi:1},
  oHoly:{c:4,heal:5}, oForce:{c:5,shield:6}, dBuckler:{c:1,shield:1}, dTaunt:{c:1,tgt:"pick",util:1},
  dShield:{c:3,shield:3}, dShieldBash:{c:3,shield:1,dmg:1,tgt:"front",bash:1}, dHeartGuard:{c:4,shield:2,heal:2},
  dThorns:{c:3,lasting:1,util:1}, dStoneskin:{c:4,lasting:1,dr:1}, dBloodIron:{c:5,lasting:1,util:1},
  dTowerShield:{c:5,shield:5}, dTrollskin:{c:2,lasting:1,regenHeal:1}, dLiquidMetal:{c:3,lasting:1,regenShield:1},
  oOmnislash:{c:6,dmg:2,hits:4,tgt:"front",multi:1}, oHaste:{c:3,lasting:1,economy:1}, oHedgeKnight:{c:6,summon:1},
  oMoxiePool:{c:3,lasting:1,economy:1}, oGlacius:{c:8,dmg:15,tgt:"front"}, oSharpEdges:{c:2,lasting:1,meleeBuff:1},
  oRepeatXbow:{c:4,dmg:1,tgt:"pick",ranged:1,lasting:1}, oDemonForm:{c:3,lasting:1,meleeRamp:1},
  oSageMode:{c:4,lasting:1,regenHeal:1,meleeRamp:1}, oBerserker:{c:2,lasting:1,selfHarm:1}, oPileOn:{c:3,dmg:1,tgt:"front",perAlly:1},
  oAnimatedBlade:{c:4,dmg:2,tgt:"front",lasting:1}, oRainblow:{c:4,dmg:1,tgt:"front",lasting:1},
  oButterflyKnife:{c:3,dmg:1,tgt:"front"}, coolShoes:{c:3,lasting:1,economy:1},
};

export const tot  = (k) => (CARD[k]?.dmg || 0) * (CARD[k]?.hits || 1);
export const shOf = (k) => CARD[k]?.shield || 0;
export const heOf = (k) => CARD[k]?.heal || 0;

// ── DRAFT SCORING (survival-weighted: a body whose deck can both live and kill) ──────────────
const BODY_PASSIVE = {
  goldenGolem:9, tollTroll:6, bondBehemoth:5, vengefulVampire:4, marketCrashMinotaur:4, wearyWageslave:3,
  centlessCentaur:2, cryptoChimera:2, interestImp:2, malevolentMouse:2, rentSeekingRuneblade:2, fatCat:1, paidPiper:1, royalRat:1, tollTroll2:0,
};

export function cardDraftScore(k) {
  const cd = CARD[k]; if (!cd) return 1;
  let s = 0;
  if (cd.shield) s += 2 + cd.shield * 0.8;
  if (cd.heal) s += 3 + cd.heal * 0.6;
  if (cd.dr) s += 6;
  if (cd.regenShield || cd.regenHeal) s += 5;
  if (cd.economy) s += 4;
  if (cd.ramp || cd.meleeBuff || cd.rangedBuff || cd.meleeRamp || cd.rangedRamp) s += 1.5;
  if (cd.dmg) s += Math.min(3, tot(k) / Math.max(1, cd.c));
  if (cd.heal && cd.dmg) s += 3;
  if (cd.selfHarm) s -= 4;
  if (cd.summon) s += 2;
  if (cd.worn && cd.economy) s += 4;
  if (cd.c <= 1) s += 0.5;
  return s;
}

export function deckDefenseBonus(keys) {
  let b = 0;
  const hasHeal = keys.some((k) => heOf(k) > 0);
  const hasBigShield = keys.some((k) => shOf(k) >= 4);
  const hasAnyShield = keys.some((k) => shOf(k) > 0);
  const hasDR = keys.some((k) => CARD[k]?.dr);
  const hasEco = keys.some((k) => CARD[k]?.economy);
  if (hasHeal) b += 6; if (hasBigShield) b += 5; if (hasAnyShield) b += 3;
  if (hasDR) b += 4; if (hasEco) b += 4;
  if (!hasAnyShield && !hasHeal) b -= 10;
  return b;
}

export function deckOffenseBonus(keys) {
  const dmgCards = keys.filter((k) => tot(k) > 0);
  const nuke = Math.max(0, ...keys.map((k) => tot(k)));
  let b = dmgCards.length * 1.5 + Math.min(nuke, 8);
  if (dmgCards.length < 3) b -= 8;
  if (nuke < 4) b -= 4;
  return b;
}

export function bundleScore(w) {
  const hp = w.maxHp ?? 6;
  const kit = (w.items ?? []).map((o) => o.key || o);
  return hp * 1.8 + (BODY_PASSIVE[w.bodyKey] ?? 0) * 2 + kit.reduce((a, k) => a + cardDraftScore(k), 0)
       + deckDefenseBonus(kit) + deckOffenseBonus(kit);
}

// ── NEXT-NODE CHOOSER — skips locked/unaffordable elite nodes ────────────────────────────────
// The engine guarantees a non-elite path always exists (post softlock-fix commit 52926509), so
// the "last resort" locked fallback should never trigger on a healthy build.
export function nextNodeId(map) {
  if (!map?.nodes) return null;
  const cur = map.nodes.find((n) => n.id === map.currentId);
  const links = (cur?.links ?? [])
    .map((id) => map.nodes.find((n) => n.id === id))
    .filter(Boolean)
    .filter((n) => !n.cleared);
  // Prefer unlocked + non-elite (guaranteed available post engine softlock-fix)
  const safe = links.filter((n) => !n.locked && n.type !== "elite");
  // Read the public room previews rather than always taking the leftmost door.
  // Our survival scoring already identifies durable bodies; avoid their shield/
  // sustain walls when another ordinary room offers a shorter acceptance path.
  const durability = n => (n.contents || []).reduce((sum, foe) => sum + (foe.maxHp || 0) + (BODY_PASSIVE[foe.bodyKey] || 0) * 3, 0);
  if (safe.length) return safe.sort((a,b) => durability(a) - durability(b))[0].id;
  // Fall back to any unlocked node
  const unlocked = links.filter((n) => !n.locked);
  if (unlocked.length) return unlocked[0].id;
  // Last resort: locked elite (engine guarantees this path is NEVER the only option)
  return links[0]?.id ?? null;
}

// ── THE COMBAT BRAIN — pure: given snapshot + my body → {cardId, target} or null ────────────
//  Solo survival logic: one knockdown ends a solo run, so defense leads. Boss-aware (Hydra =
//  single hits only; Lich objection = chip while capped). Lifted from play-win.mjs (proven).
export function decide(s, me) {
  const lane = me.lane ?? 0;
  const laneArr = (s.lanes?.[lane]?.enemies ?? []).filter((e) => (e.hp ?? 0) > 0);
  const boss = s.boss && s.boss.hp > 0 ? s.boss : null;
  const bossKey = boss?.bodyKey;
  const hp = me.hp ?? 0, maxHp = me.maxHp ?? 1, shield = me.shield ?? 0, moxie = me.moxie ?? 0;
  const ehp = hp + shield;

  const hand = (me.hand ?? []).filter((c) => c.affordable).map((c) => ({ ...c, cd: CARD[c.key] || {} }));
  const shields = hand.filter((c) => shOf(c.key) > 0).sort((a, b) => shOf(a.key) - shOf(b.key));
  const heals = hand.filter((c) => heOf(c.key) > 0).sort((a, b) => heOf(b.key) - heOf(a.key));
  const dmgs = hand.filter((c) => tot(c.key) > 0);

  const hitOf = (f) => { const q = f.queue?.[0]; if (!q) return 0; return (q.hit || 0) * (CARD[q.key]?.hits || 1); };
  const willCast = (f, frac) => (f.castFrac ?? 0) >= frac && hitOf(f) > 0;
  const incomingNow = laneArr.filter((f) => willCast(f, 0.5)).reduce((a, f) => a + hitOf(f), 0);
  const incomingSoon = laneArr.filter((f) => willCast(f, 0.12)).reduce((a, f) => a + hitOf(f), 0);
  const biggestHit = Math.max(0, ...laneArr.map(hitOf));
  let bossAoe = 0;
  for (const t of (boss?.threats ?? [])) if ((t.frac ?? 0) >= 0.55 && (t.dmg || 0) > 0) bossAoe += (t.dmg || 0);
  const dangerNow = incomingNow + bossAoe;
  const opening = (s.tick ?? 9999) < 60 || moxie < 4;

  const front = laneArr[0] || null;
  const aimFront = () => (front ? front.id : (boss ? boss.id : null));
  const canHit = (k, foe, isFront) => {
    const t = CARD[k]?.tgt;
    if (t === "pick" || t === "lane") return true;
    if (t === "front2") return isFront || laneArr[1]?.id === foe.id;
    return isFront;
  };
  const play = (c, target) => (c ? { cardId: c.id, target } : null);

  // 1) DEFENSE FIRST
  const threat = Math.max(dangerNow, incomingSoon);
  if ((threat > 0 && ehp - threat <= maxHp * 0.3) || ehp <= maxHp * 0.5) {
    const scary = laneArr.filter((f) => hitOf(f) > 0).sort((a, b) => (hitOf(b) - hitOf(a)) || (b.castFrac - a.castFrac));
    for (const f of scary) {
      const eff = (f.hp ?? 0) + (f.shield ?? 0);
      const isFront = front?.id === f.id;
      const k = dmgs.filter((c) => tot(c.key) >= eff && canHit(c.key, f, isFront)).sort((a, b) => a.cost - b.cost)[0];
      if (k) return play(k, f.id);
    }
    const need = Math.max(threat - shield + 3, 0);
    let pick = shields.filter((c) => shOf(c.key) >= need).sort((a, b) => shOf(a.key) - shOf(b.key))[0]
            || shields.slice().sort((a, b) => shOf(b.key) - shOf(a.key))[0] || null;
    if (heals[0] && hp <= maxHp * 0.5 && (!pick || heOf(heals[0].key) >= shOf(pick.key))) pick = heals[0];
    if (pick) return play(pick, aimFront());
    const dr = hand.find((c) => c.cd.dr && (me.dr ?? 0) === 0);
    if (dr) return play(dr, aimFront());
  }
  // 2) KILL the most-imminent foe I can one-shot
  const threats = laneArr.filter((f) => hitOf(f) > 0).sort((a, b) => (b.castFrac - a.castFrac) || (hitOf(b) - hitOf(a)));
  for (const f of threats) {
    const eff = (f.hp ?? 0) + (f.shield ?? 0);
    const isFront = front?.id === f.id;
    const k = dmgs.filter((c) => tot(c.key) >= eff && canHit(c.key, f, isFront)).sort((a, b) => a.cost - b.cost)[0];
    if (k) return play(k, f.id);
  }
  // 3) Shield cushion sized to total imminent alpha
  const cushion = Math.min(Math.max(incomingSoon, biggestHit, 4), maxHp + 6);
  if ((incomingSoon > 0 || (opening && laneArr.some((f) => hitOf(f) > 0))) && shield < cushion) {
    const sh = shields.filter((c) => c.cost <= 4).sort((a, b) => shOf(b.key) - shOf(a.key))[0] || shields[0];
    if (sh && moxie >= sh.cost) return play(sh, aimFront());
  }
  // 3.5) Proactive lasting engines (defense first, then economy)
  if (incomingNow === 0) {
    const reserve = incomingSoon > 0 ? (shields[0]?.cost ?? 0) : 0;
    const engine = hand.filter((c) => { const d = c.cd; return !d.selfHarm && (d.dr || d.regenHeal || d.regenShield || d.economy); })
      .filter((c) => !(c.cd.dr && (me.dr ?? 0) > 0))
      .sort((a, b) => cardDraftScore(b.key) - cardDraftScore(a.key))[0];
    if (engine && moxie - engine.cost >= reserve) return play(engine, aimFront());
  }
  // 4) Heal when wounded and not under an imminent beat
  if (hp <= maxHp * 0.55 && heals[0] && dangerNow < ehp - 2) return play(heals[0], aimFront());
  // 5) DEAL DAMAGE — lane foes (clean kill first), else boss
  if (laneArr.length) {
    const byHp = laneArr.slice().sort((a, b) => (a.hp - b.hp));
    for (const f of byHp) {
      const eff = (f.hp ?? 0) + (f.shield ?? 0);
      const isFront = front?.id === f.id;
      const killer = dmgs.filter((c) => tot(c.key) >= eff && canHit(c.key, f, isFront)).sort((a, b) => a.cost - b.cost)[0];
      if (killer) return play(killer, f.id);
    }
    const best = dmgs.filter((c) => canHit(c.key, front, true)).sort((a, b) => tot(b.key) - tot(a.key))[0]
              || dmgs.sort((a, b) => tot(b.key) - tot(a.key))[0];
    if (best) return play(best, best.cd.tgt === "pick" ? (front?.id ?? aimFront()) : aimFront());
  } else if (boss) {
    const capped = boss.stance === "objection";
    let pool = dmgs.slice();
    if (bossKey === "hydra") pool = pool.filter((c) => !c.cd.multi);
    if (capped) pool = pool.filter((c) => c.cost <= 2);
    const best = pool.sort((a, b) => (tot(b.key) - tot(a.key)) || (a.cost - b.cost))[0];
    if (best) return play(best, boss.id);
  }
  // 6) RAMP when totally safe
  if (dangerNow === 0 && incomingSoon === 0) {
    const ramps = hand.filter((c) => {
      const d = c.cd; return !d.selfHarm && (d.economy || d.dr || d.ramp || d.meleeBuff || d.rangedBuff ||
        d.regenShield || d.regenHeal || d.meleeRamp || d.rangedRamp);
    }).sort((a, b) => cardDraftScore(b.key) - cardDraftScore(a.key));
    if (ramps[0]) return play(ramps[0], aimFront());
    if (moxie >= 8 && shields[0] && shield < maxHp) return play(shields[0], aimFront());
  }
  // This harness predates much of the live card catalog. A hand of newer summons
  // or vials must not deadlock the playthrough at full moxie just because CARD lacks
  // a scoring row. Cycle an affordable, non-choice card without spending health;
  // this changes only the test pilot, never the game's own autopilot or rules.
  if (moxie >= (me.moxieMax ?? 10)) {
    const cycle = hand.find(c => !CARD[c.key] && !c.pick && !(c.healthCost > 0));
    if (cycle) return play(cycle, aimFront());
  }
  return null; // bank moxie
}
