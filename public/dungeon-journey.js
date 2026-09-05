// Presentation only: snapshots remain authoritative and every mutation uses the normal bridge.
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const count = (cards, key) => (cards || []).filter((card) => card.key === key).length;
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function createDungeonJourney({ container, km }) {
  const root = document.createElement('section');
  root.className = 'dg-journey';
  root.hidden = true;
  root.setAttribute('aria-label', 'Dungeon journey');
  container.append(root);
  let latest = null, active = null, signature = '', roomKey = '', knownBodies = null;
  let newBodies = new Set(), pending = '', pendingTimer = null, disposed = false;

  const icon = (key) => latest?.bodies?.[key] && km.bodyIconHtml
    ? km.bodyIconHtml(key) : '<span aria-hidden="true">◇</span>';
  const button = (action, label, { value = '', disabled = false, primary = false, focus = action + ':' + value } = {}) =>
    `<button type="button" class="dg-journey-button${primary ? ' dg-journey-primary' : ''}" data-dg-action="${esc(action)}" data-dg-value="${esc(value)}" data-dg-focus="${esc(focus)}"${disabled ? ' disabled' : ''}>${label}</button>`;
  const myPlayer = () => (latest?.players || []).find((p) => p.id === active && (p.owner ?? p.id) === km.you);
  const manage = (id = active) => {
    km.manageBody?.(id);
    km.openManagement?.('backpack');
  };

  function send(message, key) {
    if (pending || latest?.phase !== 'won' || latest.runWon) return;
    pending = key;
    km.send(message);
    // Re-enable after a missing/rejected acknowledgement; never retry a game action automatically.
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => { pending = ''; signature = ''; paint(); }, 1600);
    signature = '';
    paint();
  }

  function votes() {
    const rv = latest?.roomVotes;
    const seat = km.you;
    let choice = null, locked = false;
    for (const [id, voters] of Object.entries(rv?.byNode || {})) {
      const mine = voters.find((v) => v.seat === seat);
      if (mine) { choice = id; locked = !!mine.locked; }
    }
    return { rv, choice, locked, coop: number(rv?.seatCount) > 1 };
  }

  function routeHtml(node, index, vote) {
    const boss = node.type === 'boss';
    const foes = boss ? [latest.map.bossPreview].filter(Boolean) : (node.contents || []);
    const name = boss ? latest.map.bossName || 'Floor boss' : node.type === 'elite' ? 'Elite room' : `Room ${index + 1}`;
    const selected = vote.choice === String(node.id);
    const roster = foes.map((foe) => `<div class="dg-journey-foe">
      <span class="dg-journey-token">${icon(foe.bodyKey)}</span>
      <span><strong>${esc(foe.name || 'Foe')}</strong><small>${foe.level != null ? `Level ${esc(foe.level)} · ` : ''}${esc(foe.maxHp ?? '—')} HP</small></span>
    </div>`).join('');
    const details = foes.map((foe) => `<div class="dg-journey-detail-foe"><strong>${esc(foe.name || 'Foe')}</strong>
      <p>${foe.level != null ? `Level ${esc(foe.level)} · ` : ''}${esc(foe.maxHp ?? '—')} HP</p>
      ${foe.passive ? `<p>${esc(foe.passive)}</p>` : ''}
      ${(foe.deck || foe.cards || []).length ? `<ul>${(foe.deck || foe.cards).map((card) => `<li><strong>${esc(card.name || 'Card')}${number(card.count, 1) > 1 ? ` ×${esc(card.count)}` : ''}</strong>${card.text || card.intent ? ` — ${esc(card.text || card.intent)}` : ''}</li>`).join('')}</ul>` : ''}
    </div>`).join('');
    const voters = vote.rv?.byNode?.[node.id] || [];
    return `<article class="dg-journey-route${selected ? ' dg-journey-selected' : ''}${boss ? ' dg-journey-boss' : ''}">
      <div class="dg-journey-route-top"><span class="dg-journey-eyebrow">${boss ? 'The showdown' : 'Next passage'}</span>${selected ? '<span class="dg-journey-choice">Your vote</span>' : ''}</div>
      <h3>${esc(name)}</h3>
      <div class="dg-journey-route-stats">${node.ante != null ? `<span>⚖ ${esc(node.ante)} threat</span>` : ''}${node.loot != null ? `<span>◈ ${esc(node.loot)} possible loot</span>` : ''}${boss && latest.map.bossPreview?.rareLoot != null ? `<span>${esc(latest.map.bossPreview.rareLoot)} rare cards</span>` : ''}</div>
      ${button('route', pending === 'route' ? 'Sending…' : vote.coop ? selected ? 'Vote selected' : 'Vote for this room' : boss ? 'Enter boss room →' : 'Enter room →', { value: node.id, disabled: !!pending || !!node.locked || vote.locked || selected, primary: true })}
      <div class="dg-journey-roster">${roster || '<p class="dg-journey-muted">Open the full map for room details.</p>'}</div>
      ${details ? `<details class="dg-journey-details" data-dg-detail="${esc(node.id)}"><summary data-dg-focus="detail:${esc(node.id)}">Inspect ${foes.length} ${foes.length === 1 ? 'foe' : 'foes'} & cards</summary>${details}</details>` : ''}
      ${voters.length ? `<p class="dg-journey-voters">${voters.map((v) => `${esc(v.seat === km.you ? 'You' : v.name || 'Adventurer')}${v.locked ? ' · locked' : ' · voted'}`).join('<br>')}</p>` : ''}
      ${node.locked ? `<p class="dg-journey-muted">${esc(node.lockReason || 'Unavailable')}</p>` : ''}
    </article>`;
  }

  function suppliesHtml(me, trailhead) {
    const owned = (latest.players || []).filter((p) => (p.owner ?? p.id) === km.you);
    const unlocked = (latest.unlockedBodies || []).filter((key) => latest.bodies?.[key]);
    const fresh = trailhead ? [] : unlocked.filter((key) => newBodies.has(key));
    const shownBodies = (fresh.length ? fresh : unlocked).slice(0, 3);
    const deck = me?.deckList || [];
    const bag = me?.backpack || [];
    const spares = [...new Map(bag.map((card) => [card.key, card])).values()]
      .filter((card) => count(bag, card.key) > count(deck, card.key));
    const haul = trailhead ? [] : latest.lootTaken || [];
    spares.sort((a, b) => Number(haul.includes(b.key)) - Number(haul.includes(a.key)));
    const shared = trailhead ? [] : latest.loot?.cards || [];
    const fixed = me?.maxDeck != null && number(me.deckSize, deck.length) >= number(me.maxDeck);
    const bodyName = latest.bodies?.[me?.bodyKey]?.name || 'Your body';
    return `<aside class="dg-journey-supplies" aria-label="Bodies and equipment">
      <div class="dg-journey-panel">
        <div class="dg-journey-panel-heading"><span class="dg-journey-eyebrow">Your expedition</span><span class="dg-journey-muted">${owned.length > 1 ? `${owned.length} bodies` : '1 body'}</span></div>
        ${me ? `<div class="dg-journey-current-body"><span class="dg-journey-token">${icon(me.bodyKey)}</span><div><h3>${esc(bodyName)}</h3><p>Level ${esc(me.level ?? 1)} · ${esc(me.deckSize ?? deck.length)} cards · ◈ ${esc(me.treasure ?? 0)}</p></div></div>` : ''}
        <div class="dg-journey-actions">${button('manage', 'Deck & backpack', { disabled: !me })}${button('management', 'Level up', { value: 'level', disabled: !me })}</div>
        ${owned.length > 1 ? `<div class="dg-journey-party">${owned.map((p) => button('body', esc(latest.bodies?.[p.bodyKey]?.name || p.name || 'Body'), { value: p.id })).join('')}</div>` : ''}
      </div>
      <div class="dg-journey-panel">
        <div class="dg-journey-panel-heading"><h3>${fresh.length ? 'New bodies unlocked' : 'Wear another body'}</h3><span class="dg-journey-choice">${fresh.length ? `+${fresh.length}` : unlocked.length}</span></div>
        ${shownBodies.length ? `<div class="dg-journey-bodies">${shownBodies.map((key) => `<div><span class="dg-journey-token">${icon(key)}</span><span>${esc(latest.bodies[key].name || 'Body')}</span></div>`).join('')}</div>` : '<p class="dg-journey-muted">Defeat foes to unlock their bodies.</p>'}
        ${button('bodies', `Choose body${unlocked.length > shownBodies.length ? ` · ${unlocked.length} unlocked` : ''}`)}
      </div>
      <div class="dg-journey-panel">
        <div class="dg-journey-panel-heading"><h3>${trailhead ? 'Equipment' : 'Room rewards'}</h3>${!trailhead && haul.length ? `<span class="dg-journey-choice">${haul.length} collected</span>` : ''}</div>
        <p class="dg-journey-muted">${shared.length ? `${shared.length} cards in shared spoils. Claim and assign them in the full inventory.` : trailhead ? 'Prepare your deck before choosing a room.' : haul.length ? owned.length > 1 ? 'Collected into your party’s backpacks.' : 'Collected into your backpack.' : 'Review your spare cards before moving on.'}</p>
        ${shared.length ? button('management', 'Open shared spoils', { value: owned.length > 1 ? 'assign' : 'backpack' }) : ''}
        ${spares.length ? `<div class="dg-journey-loot">${spares.slice(0, 3).map((card) => `<article>
          <div><strong>${esc(card.name || 'Card')}</strong><small>${haul.includes(card.key) ? 'New · ' : ''}${esc(card.sum || card.dmg || card.kind || 'Card')} · ◈ ${esc(card.value ?? 0)}</small></div>
          ${button(fixed ? 'manage' : 'add', fixed ? 'Choose swap' : 'Add to deck', { value: card.key, disabled: !!pending })}
        </article>`).join('')}</div>` : '<p class="dg-journey-muted">No spare cards on this body.</p>'}
        ${owned.length > 1 ? button('management', 'Equip party', { value: 'assign' }) : spares.length > 3 ? button('manage', `View all ${spares.length} spare cards`) : ''}
      </div>
    </aside>`;
  }

  function paint() {
    if (disposed || !latest || root.hidden) return;
    const map = latest.map || {}, nodes = map.nodes || [];
    const current = nodes.find((node) => node.id === map.currentId);
    const trailhead = current?.type === 'start';
    const complete = !!map.levelComplete;
    // Match the native publicRoomNodes helper: shop routes are intentionally not offered.
    const next = complete ? [] : (current?.links || []).map((id) => nodes.find((node) => node.id === id))
      .filter((node) => node && node.type !== 'shop' && !node.cleared).sort((a, b) => number(a.x) - number(b.x));
    const vote = votes(), me = myPlayer();
    // Omit ticks/combat data so a quiet room retains its DOM and keyboard focus.
    const sig = JSON.stringify([latest.floor, map, latest.roomVotes, active, km.you, latest.players?.map((p) =>
      [p.id, p.owner, p.bodyKey, p.level, p.deckList, p.backpack, p.deckSize, p.maxDeck, p.treasure, p.levelPointsUnspent]),
    latest.unlockedBodies, latest.loot, latest.lootTaken, latest.roomValue, [...newBodies], pending]);
    if (sig === signature) return;
    signature = sig;
    const focus = root.contains(document.activeElement) ? document.activeElement?.dataset.dgFocus : null;
    const scroll = root.querySelector('.dg-journey-scroll')?.scrollTop || 0;
    const opened = new Set([...root.querySelectorAll('details[open]')].map((el) => el.dataset.dgDetail));
    const toBoss = number(map.roomsToBoss);
    const floorLabel = number(latest.floor, 1) >= 4 ? 'The throne' : `Floor ${number(latest.floor, 1)}`;
    const path = Array.from({ length: Math.max(1, Math.min(16, number(map.rowCount, 1))) }, (_, i) =>
      `<span class="${i < number(map.currentRow) ? 'dg-journey-step-past' : i === number(map.currentRow) ? 'dg-journey-step-now' : ''}"${i === number(map.currentRow) ? ' aria-current="step"' : ''}></span>`).join('');
    root.innerHTML = `<header class="dg-journey-header">
      <div><span class="dg-journey-eyebrow">${esc(floorLabel)} · ${complete ? 'Floor complete' : trailhead ? 'Trailhead' : 'Between rooms'}</span><h2>${complete ? 'The way below is open.' : trailhead ? 'Choose your first room.' : 'Room cleared.'}</h2></div>
      <div class="dg-journey-progress"><span>${complete ? 'Ready to descend' : toBoss <= 0 ? 'Boss room ahead' : `${toBoss} room${toBoss === 1 ? '' : 's'} to the boss`}</span><div class="dg-journey-path" aria-label="Floor path">${path}</div></div>
    </header>
    <div class="dg-journey-scroll"><div class="dg-journey-layout"><main class="dg-journey-main">
      <div class="dg-journey-section-heading"><div><span class="dg-journey-eyebrow">${complete ? 'Continue the descent' : 'Choose your path'}</span><p>${complete ? 'Finish equipping, then explore the next floor.' : vote.coop ? 'Vote for a room. Everyone locks in to continue.' : 'Inspect the foes, then enter when you are ready.'}</p></div>${button('map', 'Full map')}</div>
      ${complete ? `<div class="dg-journey-descent"><span aria-hidden="true">↓</span><h3>${number(latest.floor, 1) + 1 >= 4 ? 'The throne awaits' : `Floor ${number(latest.floor, 1) + 1}`}</h3><p>Your bodies, deck and progress travel with you.</p>${button('descend', pending === 'descend' ? 'Descending…' : 'Descend →', { primary: true, disabled: !!pending })}</div>` : next.length ? `<div class="dg-journey-routes">${next.map((node, i) => routeHtml(node, i, vote)).join('')}</div>` : `<div class="dg-journey-panel"><p>No available passage is shown.</p>${button('management', 'Open room management', { value: 'rooms' })}</div>`}
      ${vote.coop && !complete ? `<div class="dg-journey-vote-bar" aria-live="polite"><div><strong>${esc(vote.rv.lockedCount)}/${esc(vote.rv.seatCount)} players locked in</strong><span>${vote.locked ? 'Your vote is locked. Waiting for the party.' : vote.choice ? 'Your vote is selected. Lock in when ready.' : 'Choose a room above to cast your vote.'}</span></div>${button(vote.locked ? 'unlock' : 'lock', vote.locked ? 'Unlock my vote' : 'Lock in →', { primary: !vote.locked, disabled: !!pending || !vote.choice })}</div>` : ''}
    </main>${suppliesHtml(me, trailhead)}</div></div>`;
    for (const el of root.querySelectorAll('details')) el.open = opened.has(el.dataset.dgDetail);
    root.querySelector('.dg-journey-scroll').scrollTop = scroll;
    if (focus) [...root.querySelectorAll('[data-dg-focus]')].find((el) => el.dataset.dgFocus === focus)?.focus({ preventScroll: true });
  }

  function onClick(event) {
    const control = event.target.closest?.('[data-dg-action]');
    if (!control || !root.contains(control) || control.disabled || root.hidden) return;
    const action = control.dataset.dgAction, value = control.dataset.dgValue;
    if (action === 'manage') return manage();
    if (action === 'body') return manage(value);
    if (action === 'bodies') return km.openBodyModal?.();
    if (action === 'management') return km.openManagement?.(value);
    if (action === 'map') return km.openLevelMap ? km.openLevelMap() : km.openManagement?.('rooms');
    const vote = votes();
    if (action === 'route') {
      const map = latest.map, current = map?.nodes?.find((node) => node.id === map.currentId);
      const node = map?.nodes?.find((item) => String(item.id) === value);
      if (vote.locked || !node || node.locked || node.cleared || !current?.links?.includes(node.id) || map.levelComplete) return;
      return send({ type: 'advance', to: node.id }, 'route');
    }
    if (action === 'lock' && vote.coop && vote.choice && !vote.locked) return send({ type: 'lockRoom' }, 'lock');
    if (action === 'unlock' && vote.coop && vote.locked) return send({ type: 'unlockRoom' }, 'unlock');
    if (action === 'descend' && latest.map?.levelComplete) return send({ type: 'descend' }, 'descend');
    if (action === 'add') {
      const me = myPlayer();
      if (!me || (km.activeId ?? km.you) !== me.id) return manage();
      const size = number(me.deckSize, me.deckList?.length || 0);
      if ((me.maxDeck != null && size >= number(me.maxDeck)) || count(me.backpack, value) <= count(me.deckList, value)) return manage();
      return send({ type: 'moveToDeck', key: value }, 'add');
    }
  }
  root.addEventListener('click', onClick);

  return {
    update(state, activeId) {
      if (disposed) return;
      // Acknowledged vote/equipment changes release the buttons immediately, including lock-in.
      if (pending && latest) {
        const receipt = (s) => pending === 'add'
          ? (s?.players || []).find((p) => p.id === active)?.deckList
          : s?.roomVotes;
        if (JSON.stringify(receipt(state)) !== JSON.stringify(receipt(latest))) {
          pending = '';
          clearTimeout(pendingTimer);
        }
      }
      const nextRoom = `${state?.floor ?? ''}:${state?.map?.currentId ?? ''}`;
      if (nextRoom !== roomKey) { roomKey = nextRoom; newBodies = new Set(); }
      const unlocked = new Set(state?.unlockedBodies || []);
      if (state?.phase === 'draft' || state?.phase === 'lobby' || !state) knownBodies = null;
      if (knownBodies) for (const key of unlocked) if (!knownBodies.has(key)) newBodies.add(key);
      knownBodies = unlocked;
      latest = state;
      active = activeId ?? km.activeId ?? km.you;
      const visible = state?.phase === 'won' && !state.runWon;
      if (root.hidden === visible) signature = '';
      root.hidden = !visible;
      if (!visible) { pending = ''; clearTimeout(pendingTimer); }
      paint();
    },
    dispose() {
      disposed = true;
      clearTimeout(pendingTimer);
      root.removeEventListener('click', onClick);
      root.remove();
      latest = null;
    },
  };
}
