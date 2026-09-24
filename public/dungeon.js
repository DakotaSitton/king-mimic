import { createDungeonScene } from './dungeon-scene.js';
import { createDungeonJourney } from './dungeon-journey.js';

// A presentation of the real game. All outcomes and legal actions stay server-owned.
const km = window.KM;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const loadStyle = (href) => new Promise((resolve, reject) => {
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
  link.onload = resolve; link.onerror = reject; document.head.append(link);
});
await Promise.all(['/dungeon.css', '/dungeon-scene.css', '/dungeon-journey.css'].map(loadStyle));

const shell = document.createElement('div'); shell.id = 'dg-shell';
shell.innerHTML = `
  <div id="dg-stage" aria-label="Dungeon battlefield"></div>
  <header class="dg-top">
    <a class="dg-wordmark" href="?view=dungeon" aria-label="King Mimic home"><span class="dg-crown">♛</span><span>KING <b>MIMIC</b><small>WEAR WHAT YOU DEFEAT</small></span></a>
    <div class="dg-context"><span id="dg-floor">THE DUNGEON AWAITS</span><span id="dg-location"></span></div>
    <nav class="dg-top-actions"><button id="dg-share" type="button">Invite friends <span>↗</span></button><button id="dg-clock" type="button" title="Change the party's combat speed">1×</button><button id="dg-menu-btn" type="button" aria-expanded="false" aria-controls="dg-menu">Menu</button></nav>
  </header>
  <div id="dg-menu" class="dg-menu" hidden><button id="dg-knowledge">Knowledge book</button><button id="dg-classic">Switch to classic view</button><button id="dg-restart">Restart run</button><button id="dg-leave">Leave to lobby</button></div>
  <div class="dg-world-ui">
    <div id="dg-party" class="dg-party" aria-label="Party members"></div>
    <aside id="dg-inspect" class="dg-inspect" hidden></aside>
    <div id="dg-hint" class="dg-hint"></div>
    <div id="dg-setup" class="dg-setup"><div><span class="dg-eyebrow">BEFORE THE FIGHT</span><strong>Take your position.</strong><small>Choose a lane. Aim your ranged and support cards.</small></div><button id="dg-backrooms">Room options</button><button id="dg-loadout">Deck & body</button><button id="dg-fight" class="dg-primary">Begin combat <span>→</span></button></div>
    <footer id="dg-hand" class="dg-hand">
      <div class="dg-hand-meta"><div id="dg-pilot" class="dg-pilot"></div><div class="dg-moxie"><span id="dg-moxie-label">MOXIE</span><div id="dg-moxie-pips"></div></div><div class="dg-hand-tools"><button id="dg-cancel-pick" hidden>Cancel choice</button><button id="dg-clear-queue" hidden>Clear queue</button><button id="dg-details" aria-pressed="false">Card text</button><button id="dg-body-info" title="Read current body">Body</button></div></div>
      <div class="dg-hand-row"><div class="dg-position"><button id="dg-forward" title="Move ahead of allies">↑ <span>Front</span></button><button id="dg-back" title="Move behind allies">↓ <span>Back</span></button><button id="dg-summons" title="Choose where your summons appear">Summons: front</button></div><div id="dg-cards" class="dg-cards" aria-label="Your hand"></div></div>
      <div class="dg-hand-foot"><span id="dg-aim"></span><span id="dg-deck-count"></span></div>
    </footer>
  </div>
  <div id="dg-journey"></div>
  <button id="dg-close-management" type="button">← Back to dungeon</button>
  <div id="dg-toast" role="status" aria-live="polite"></div>`;
document.body.append(shell);
const $ = (id) => document.getElementById(id);
// Native management is a sibling overlay at z-index 50. Its exit must be a sibling too.
document.body.append($('dg-close-management'));
let current = null, active = null, phase = null, selected = null;
let cardSignature = '', partySignature = '', lastBody = null, lastPilot = null, toastTimer = null;
let disposed = false, menuOpen = false;
let lastCombatInput = '';
const isOwned = (p) => (p.owner ?? p.id) === km.you;
const bodyName = (p, s = current) => s?.bodies?.[p?.bodyKey]?.name || p?.name || 'Creature';
const image = (src, alt = '') => `<img src="${esc(src)}" alt="${esc(alt)}" draggable="false">`;
const toast = (message) => { $('dg-toast').textContent = message; $('dg-toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('dg-toast').classList.remove('show'), 2600); };
const getPilot = () => current?.players?.find(p => p.id === active);
const findEntity = (id) => current?.players?.find(p => p.id === id) || (km.lanesView || []).flatMap(l => [...(l.enemies || []), ...(l.allies || [])]).find(e => e.id === id) || (km.bossView?.id === id ? km.bossView : null);

let scene;
try {
  scene = createDungeonScene({container: $('dg-stage'),
    onSelectEntity: (choice) => {
      if (!current || !['setup', 'playing'].includes(current.phase)) return;
      selected = choice;
      if (choice.side === 'foe') km.selectFoe(choice.id); else km.selectAlly(choice.id);
      renderInspect();
    },
    onSelectLane: (lane) => {
      km.selectLane(lane);
      if ((km.laneCd?.left ?? 0) > 0) toast('Lane move is recharging. You can still step forward or back.');
    },
  });
} catch (error) { shell.remove(); throw error; }
const journey = createDungeonJourney({container: $('dg-journey'), km});
document.body.classList.add('dungeon');
document.title = 'King Mimic — Into the Dungeon';

// Keep the original, fully featured entry/draft/management flows, with one visual language.
const lobby = $('lobby');
const eyebrow = document.createElement('div'); eyebrow.className = 'dg-eyebrow'; eyebrow.textContent = 'A CO-OP DUNGEON DECKBUILDER'; lobby.prepend(eyebrow);
const lobbyIntro = document.createElement('p'); lobbyIntro.className = 'dg-lobby-intro'; lobbyIntro.textContent = 'Their power. Your next form.';
lobby.querySelector('h1').after(lobbyIntro);

function setMenu(value) { menuOpen = value; $('dg-menu').hidden = !value; $('dg-menu-btn').setAttribute('aria-expanded', String(value)); }
$('dg-menu-btn').onclick = () => setMenu(!menuOpen);
$('dg-share').onclick = async () => { if (document.body.classList.contains('room-active')) { await $('inviteBtn').onclick(); const status = $('inviteStatus').textContent; if (status) toast(status); } else { $('friendsPanel').open = true; $('friendsPanel').scrollIntoView({block:'nearest'}); } };
$('dg-clock').onclick = () => $('clockBtn').click();
$('dg-knowledge').onclick = () => { setMenu(false); $('knowledgeBtn').click(); };
$('dg-classic').onclick = () => { const u = new URL(location.href); u.searchParams.delete('view'); location.href = u.href; };
$('dg-restart').onclick = () => { const b = $('restartBtn'); b.click(); toast(b.textContent.trim()); };
$('dg-leave').onclick = () => { setMenu(false); $('leaveBtn').click(); };
$('dg-loadout').onclick = () => km.openManagement('backpack');
$('dg-backrooms').onclick = () => km.send({type:'backToRooms'});
$('dg-fight').onclick = () => { km.send({type:'start'}); };
$('dg-close-management').onclick = () => km.closeManagement();
$('dg-forward').onclick = () => km.moveDepth('fwd');
$('dg-back').onclick = () => km.moveDepth('back');
$('dg-body-info').onclick = () => km.openBodyCard?.();
$('dg-cancel-pick').onclick = () => km.cancelPick();
$('dg-clear-queue').onclick = () => km.send({type:'clearCardQueue'});
$('dg-details').onclick = () => { const on = shell.classList.toggle('dg-expanded-cards'); $('dg-details').setAttribute('aria-pressed', String(on)); };
$('dg-summons').onclick = () => getPilot()?.summonSide === 'back' ? $('ssFront').click() : $('ssBack').click();
document.addEventListener('keydown', onKey);
function onKey(e) {
  if (e.key !== 'Escape') return;
  setMenu(false); selected = null; $('dg-inspect').hidden = true;
  if (document.body.classList.contains('dg-management')) km.closeManagement();
}

function renderInspect() {
  const el = $('dg-inspect');
  if (!selected || !['playing','setup'].includes(current?.phase)) { el.hidden = true; return; }
  const entity = findEntity(selected.id);
  if (!entity) { selected = null; el.hidden = true; return; }
  const name = bodyName(entity);
  const intent = entity.intentCard || entity.queuedCard || entity.queue?.[0];
  el.hidden = false;
  const sig = JSON.stringify([entity.id, entity.hp, entity.maxHp, entity.shield, intent?.name, entity.passive, entity.effects, entity.trackers]);
  if (el.dataset.sig === sig) return; el.dataset.sig = sig;
  el.innerHTML = `<button class="dg-inspect-close" aria-label="Close creature details">×</button><span class="dg-eyebrow">${selected.side === 'foe' ? 'RANGED AIM' : 'SUPPORT AIM'}</span><h3>${esc(name)}</h3><p class="dg-inspect-vitals">${esc(entity.hp)} / ${esc(entity.maxHp)} HP ${entity.shield ? ` · ${esc(entity.shield)} shield` : ''}</p><p>${esc(entity.passive || current.bodies?.[entity.bodyKey]?.passiveText || '')}</p>${intent ? `<div class="dg-intent"><small>${selected.side === 'foe' ? 'NEXT CARD' : 'PLANNED CARD'}</small><b>${esc(intent.name)}</b><span>${esc(intent.text || intent.glyphs || intent.dmgNow || '')}</span></div>` : ''}${(entity.effects || []).slice(0,5).map(e => `<small class="dg-effect">${esc(e.label || e.name || '')}</small>`).join('')}`;
  el.querySelector('button').onclick = () => { selected = null; el.hidden = true; };
}

function renderParty(state, input) {
  const players = state.players || [];
  const sig = JSON.stringify(players.map(p => [p.id,p.bodyKey,p.name,p.owner]));
  if (sig !== partySignature) {
    partySignature = sig;
    $('dg-party').innerHTML = players.map(p => `<button class="dg-party-member" data-player="${esc(p.id)}" type="button">${image(km.bodyArtUrl(p.bodyKey))}<span><b>${esc(isOwned(p) ? bodyName(p) : p.name || bodyName(p))}</b><small></small></span><em></em></button>`).join('');
    for (const b of $('dg-party').children) b.onclick = () => {
      const p = current.players.find(p => p.id === b.dataset.player); if (!p) return;
      if (isOwned(p)) { if (km.handView().picking) { toast('Finish your current choice first.'); return; } km.possess(p.id); }
      else { selected = {id:p.id,side:'hero'}; km.selectAlly(p.id); renderInspect(); }
    };
  }
  for (const b of $('dg-party').children) {
    const p = players.find(p => p.id === b.dataset.player); if (!p) continue;
    b.classList.toggle('active', p.id === active); b.classList.toggle('fallen', !p.alive);
    b.style.setProperty('--seat', p.color || '#70c8b5');
    const intent = p.intentCard || p.queuedCard;
    b.querySelector('small').textContent = !p.alive ? 'Fallen' : intent ? `${intent.mode === 'auto' ? 'Next' : 'Queued'}: ${intent.name}` : isOwned(p) ? (p.id === active ? 'You are commanding' : 'Tap to command') : 'Tap to aim support';
    b.querySelector('em').textContent = `${p.hp}/${p.maxHp}`;
    b.disabled = !!input.picking && isOwned(p) && p.id !== active;
    b.title = `${bodyName(p)} · ${p.hp}/${p.maxHp} HP${intent ? ` · ${intent.name}` : ''}`;
  }
}

function renderHand(state, me, input) {
  const cards = input.cards || [];
  const sig = JSON.stringify([active,input.picking,input.pickName,cards.map(c => [c.id,c.key,c.name,c.pickKey,c.nav])]);
  if (sig !== cardSignature) {
    cardSignature = sig;
    $('dg-cards').innerHTML = cards.map((c,i) => `<button class="dg-card" type="button" data-slot="${i}" data-card-id="${esc(c.id ?? '')}" style="--card-color:${esc(c.color || '#cca96b')}"><span class="dg-card-top"><b class="dg-card-cost"></b><kbd>${i+1}</kbd></span><span class="dg-card-art">${c.key || c.cardKey ? image(km.cardArtUrl(c.cardKey || c.key)) : `<span>${esc(c.glyph || '✦')}</span>`}</span><strong class="dg-card-name">${esc(c.name)}</strong><span class="dg-card-copy">${esc(c.text)}</span><span class="dg-card-bottom"><span class="dg-card-kind"></span><b class="dg-card-status"></b></span></button>`).join('');
    for (const button of $('dg-cards').children) {
      button.onclick = () => {
        const now = km.handView();
        const index = now.picking ? Number(button.dataset.slot) : now.cards.findIndex(c => String(c.id) === button.dataset.cardId);
        if (index >= 0) km.playHandSlot(index);
      };
    }
  }
  for (const [i,button] of [...$('dg-cards').children].entries()) {
    const card = cards[i]; if (!card) continue;
    const queued = input.queued?.id === card.id, pending = input.pending.includes(card.id);
    button.classList.toggle('ready', card.affordable !== false);
    button.classList.toggle('queued', queued); button.classList.toggle('pending', pending);
    button.disabled = state.phase !== 'playing' || !me.alive || pending;
    button.querySelector('.dg-card-cost').textContent = input.picking ? 'CHOOSE' : `${card.cost ?? 0} ⚡${card.healthCost ? ` + ${card.healthCost} HP` : ''}`;
    button.querySelector('.dg-card-copy').textContent = card.text || '';
    button.querySelector('.dg-card-kind').textContent = input.picking ? (card.nav ? 'More choices' : 'Confirm choice') : card.sumNow || card.dmgNow || (card.kind === 'untyped' ? 'Support' : card.kind || 'Card');
    button.querySelector('.dg-card-status').textContent = pending ? 'Playing…' : queued ? 'QUEUED' : input.picking ? 'Select' : card.affordable === false ? 'Tap to queue' : 'Play';
    button.title = `${card.name}\n${card.text || ''}${!input.picking ? `\n${card.cost ?? 0} moxie${card.healthCost ? ` + ${card.healthCost} health` : ''}` : ''}`;
  }
  if (!cards.length) $('dg-cards').innerHTML = '<div class="dg-empty-hand">Your next cards will appear here.</div>';
  $('dg-cancel-pick').hidden = !input.picking || input.mandatory;
  $('dg-clear-queue').hidden = !input.queued || input.picking;
  $('dg-moxie-label').textContent = input.picking ? `${input.pickName} · choose` : `MOXIE  ${Number(me.moxie ?? 0).toFixed(0)} / ${me.moxieMax ?? 10}`;
  $('dg-moxie-pips').innerHTML = Array.from({length:me.moxieMax || 10},(_,i) => `<i class="${i < (me.moxie ?? 0) ? 'filled' : ''}"></i>`).join('');
  $('dg-pilot').innerHTML = `${image(km.bodyArtUrl(me.bodyKey))}<span><small>YOUR CURRENT FORM · LEVEL ${me.level ?? 1}</small><b>${esc(bodyName(me))}</b><em>${me.hp}/${me.maxHp} HP${me.shield ? ` · ${me.shield} shield` : ''}</em></span>`;
  const target = findEntity(input.targetId), support = findEntity(input.allyTargetId);
  $('dg-aim').textContent = input.picking ? 'Choose an option to resolve your card.' : `Melee: front of lane ${Number(me.lane ?? 0)+1} · Ranged: ${target ? bodyName(target) : 'automatic'} · Support: ${support ? bodyName(support) : 'self'}`;
  $('dg-deck-count').textContent = `${me.deckCount ?? me.drawPile?.length ?? 0} draw · ${me.discPile?.length ?? 0} discard`;
  $('dg-summons').textContent = `Summons: ${me.summonSide === 'back' ? 'back' : 'front'}`;
}

function update(state, id) {
  if (disposed) return;
  // The classic canvas also calls observers on decorative frames. Repaint DOM only for a
  // new combat tick or changed local intent; the scene owns its own lightweight animation.
  const earlyInput = km.handView();
  const combatInput = JSON.stringify([state.tick,id,earlyInput.picking,earlyInput.pickName,
    earlyInput.cards.map(c => c.id ?? c.pickKey ?? c.nav ?? c.name),earlyInput.queued?.id,
    earlyInput.pending,earlyInput.targetId,earlyInput.allyTargetId,km.laneCd?.paintedLane]);
  if (state.phase === 'playing' && current?.phase === 'playing' && combatInput === lastCombatInput) return;
  lastCombatInput = combatInput;
  current = state; active = id;
  const inRoom = document.body.classList.contains('room-active');
  const isWorld = inRoom && ['setup','playing','won'].includes(state.phase) && !state.runWon;
  document.body.classList.toggle('dg-world', isWorld);
  shell.dataset.phase = inRoom ? state.phase : 'lobby';
  if (phase !== state.phase) {
    phase = state.phase; selected = null; document.body.classList.remove('dg-management');
    $('dg-inspect').hidden = true; cardSignature = ''; setMenu(false);
  }
  const me = getPilot();
  const view = earlyInput;
  $('dg-floor').textContent = inRoom ? `FLOOR ${state.floor ?? 1}${state.floor >= 4 ? ' · THE THRONE' : ''}` : 'THE DUNGEON AWAITS';
  const mapNode = state.map?.nodes?.find(n => n.id === state.map.currentId);
  $('dg-location').textContent = inRoom ? `${state.difficulty === 'easy' ? 'Easy' : state.difficulty === 'challenge' ? 'Challenge' : 'Regular'}${mapNode && mapNode.type !== 'start' ? ` · ${mapNode.type === 'boss' ? 'Boss chamber' : 'Room '+(state.map.currentRow ?? '')}` : ''}` : '';
  $('dg-share').innerHTML = inRoom ? `${esc(state.code || state.roomCode || $('inviteRoomCode').textContent.replace(/^.*ROOM /,''))} <span>Invite ↗</span>` : 'Invite friends ↗';
  $('dg-clock').hidden = !inRoom || state.phase !== 'playing';
  $('dg-clock').textContent = $('clockBtn').textContent.replace('◷','').trim();
  $('dg-backrooms').hidden = !state.canReturnToRooms;
  $('dg-hint').textContent = state.phase === 'setup' ? 'Tap a creature to inspect and aim. Tap a lane to move.' : '';
  $('dg-hand').hidden = state.phase !== 'playing';
  $('dg-setup').hidden = state.phase !== 'setup';
  $('dg-party').hidden = !['playing','setup'].includes(state.phase);
  if (me) {
    renderParty(state, view);
    if (state.phase === 'playing') renderHand(state, me, view);
    if (lastPilot === active && lastBody && lastBody !== me.bodyKey && ['won','setup'].includes(state.phase) && state.map?.currentRow > 0) toast(`Now wearing ${bodyName(me)}.`);
    lastPilot = active; lastBody = me.bodyKey;
  }
  const renderedState = {...state, lanes:km.lanesView || state.lanes, boss:km.bossView ?? state.boss, bossUi:km.bossView ?? state.bossUi};
  scene.update({state:renderedState,activeId:active,you:km.you,selectedId:selected?.id ?? view.targetId});
  journey.update(state, active);
  renderInspect();
}
km.onState((state,id) => {
  try { update(state,id); }
  catch (error) { console.error('Dungeon update failed:', error); toast('Dungeon view needs a refresh. Classic view is available in Menu.'); }
});

// Leave is a DOM transition before a new snapshot exists; never leave a ghost battlefield over entry.
const lifecycle = new MutationObserver(() => {
  if (!document.body.classList.contains('room-active')) {
    if (document.body.classList.contains('dg-world') || document.body.classList.contains('dg-management')) document.body.classList.remove('dg-world','dg-management');
    shell.dataset.phase = 'lobby'; $('dg-journey').hidden = true;
  }
  else $('dg-journey').hidden = false;
});
lifecycle.observe(document.body, {attributes:true,attributeFilter:['class']});
window.KMDungeon = {
  scene, update, getDiagnostics: () => ({phase:current?.phase,activeId:active,scene:scene.getDiagnostics(),cards:$('dg-cards').children.length}),
  dispose() { disposed = true; scene.dispose(); journey.dispose(); lifecycle.disconnect(); clearTimeout(toastTimer); document.removeEventListener('keydown',onKey); $('dg-close-management')?.remove(); shell.remove(); document.body.classList.remove('dungeon','dg-world','dg-management'); },
};
