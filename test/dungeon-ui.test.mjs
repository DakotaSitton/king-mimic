// Real three-human acceptance: normal create/join/draft and visible dungeon controls only.
// Start a private server first; this test never starts or stops one.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bundleScore, decide, nextNodeId } from '../tools/brain.mjs';

const BASE = (process.env.BASE || 'http://localhost:3210').replace(/\/$/, '');
const OUT = resolve('artifacts/dungeon-e2e', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(OUT, { recursive: true });
const report = { base: BASE, assertions: [], events: [], errors: [], screenshots: [], phases: [], limitations: [], fightsStarted: 0, fightsWon: 0 };
const browsers = [], pages = [], started = Date.now();
let stage = 'launch', combatStarted = null, failure = null;
const log = (text) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${text}`);
const assert = (condition, label, details) => { if (!condition) throw new Error(label + (details ? ': ' + JSON.stringify(details) : '')); report.assertions.push({ label, details }); log('PASS ' + label); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const state = page => page.evaluate(() => ({state:window.KM?.state, you:window.KM?.you, input:window.KM?.handView?.()}));
const send = (page, message) => page.evaluate(message => window.KM.send(message), message);
const click = (page, selector) => page.locator(selector).click({timeout:5000});
const phase = (page, expected) => page.waitForFunction(expected => window.KM?.state?.phase === expected, expected, {timeout:12000});
const budget = () => { if (Date.now() - started > 570000) throw new Error('Total acceptance budget exceeded'); if (combatStarted && Date.now() - combatStarted > 120000) return false; return true; };
async function shot(page, label) {
  const path = resolve(OUT, label + '.png');
  await page.screenshot({path});
  report.screenshots.push(path);
  const proof = await page.evaluate(() => ({phase:window.KM?.state?.phase, touch:matchMedia('(pointer:coarse)').matches, maxTouchPoints:navigator.maxTouchPoints, viewport:{width:innerWidth,height:innerHeight}, diagnostics:window.KMDungeon?.getDiagnostics(), renderErrors:window.KM?.renderErrorCount || 0}));
  writeFileSync(resolve(OUT, label + '.json'), JSON.stringify(proof,null,2));
  assert(proof.renderErrors === 0, label + ' has no classic render errors');
  if (['setup','playing'].includes(proof.phase)) assert(proof.diagnostics?.scene?.webgl && proof.diagnostics.scene.entityCount >= 4, label + ' renders a populated WebGL scene', proof.diagnostics?.scene);
}
async function makePage(browser, phone, index) {
  const context = await browser.newContext({viewport:phone ? {width:852,height:393} : {width:1440,height:900},deviceScaleFactor:phone ? 3 : 1,hasTouch:phone,isMobile:phone});
  const page = await context.newPage(); pages.push(page);
  page.on('pageerror', error => report.errors.push({player:index,kind:'pageerror',message:String(error)}));
  page.on('console', message => { if (message.type() === 'error') report.errors.push({player:index,kind:'console',message:message.text()}); });
  page.on('response', response => { if (response.status() >= 400 && !response.url().includes('favicon')) report.errors.push({player:index,kind:'http',status:response.status(),url:response.url()}); });
  page.on('websocket', socket => socket.on('framesent', event => { try { const message=JSON.parse(String(event.payload)); if (!['ping','snapFull'].includes(message.type)) report.events.push({player:index,at:Date.now()-started,...message}); } catch {} }));
  page.setDefaultTimeout(7000);
  await page.goto(BASE + '/?view=dungeon&harness=1' + (phone ? '&touch=1' : ''), {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => !!window.KMDungeon);
  return page;
}
async function chooseRoute() {
  stage = 'route voting';
  const snapshot = (await state(pages[0])).state;
  const id = nextNodeId(snapshot.map);
  assert(id != null, 'A normal available next room exists');
  for (const [index,page] of pages.entries()) {
    await click(page, `[data-dg-action="route"][data-dg-value="${id}"]`);
    await page.waitForFunction(id => Object.entries(window.KM.state.roomVotes?.byNode || {}).some(([node,voters]) => String(node) === String(id) && voters.some(v => v.seat === window.KM.you)), id);
    await click(page, '[data-dg-action="lock"]');
    log(`Player ${index+1} voted and locked room`);
  }
  await Promise.all(pages.map(page => phase(page,'setup')));
  assert((await Promise.all(pages.map(state))).every(s => s.state.phase === 'setup'), 'Three clients reach the same setup phase through dungeon vote/lock');
  await checkSetupLanes(pages[1], {width:740,height:360});
  await checkSetupLanes(pages[1], {width:852,height:393});
}
async function checkSetupLanes(page, viewport, suffix = '') {
  await page.setViewportSize(viewport);
  await page.waitForFunction(({width,height}) => {
    const stage=document.querySelector('#dg-stage').getBoundingClientRect();
    const setup=document.querySelector('#dg-setup').getBoundingClientRect();
    const scene=window.KMDungeon?.getDiagnostics().scene;
    return innerWidth===width && innerHeight===height && stage.bottom<=setup.top+.5
      && Math.abs(stage.bottom-setup.top)<2 && scene
      && Math.abs(scene.width-stage.width)<.5 && Math.abs(scene.height-stage.height)<.5;
  },viewport);
  const layout = await page.evaluate(() => {
    const rect=el=>{const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
    const stage=rect(document.querySelector('#dg-stage'));
    const setup=rect(document.querySelector('#dg-setup'));
    const lanes=[...document.querySelectorAll('.dg-scene-lane')].map(el=>{
      const r=rect(el);
      const exposed=[2,r.width/2,r.width-2].every(x=>[2,r.height/2,r.height-2]
        .every(y=>el.contains(document.elementFromPoint(r.x+x,r.y+y))));
      return {lane:Number(el.dataset.lane),...r,exposed};
    });
    const actors=[...document.querySelectorAll('.dg-scene-actor')].map(el=>({side:el.dataset.side,...rect(el)}));
    const {width,height}=window.KMDungeon.getDiagnostics().scene;
    return {stage,setup,lanes,actors,scene:{width,height}};
  });
  const label=`${viewport.width}x${viewport.height} setup${suffix}, fight ${report.fightsStarted+1}`;
  assert(Math.abs(layout.scene.width-layout.stage.width)<.5 && Math.abs(layout.scene.height-layout.stage.height)<.5,
    label+' samples lane positions after scene reprojection',layout.scene);
  assert(layout.stage.bottom<=layout.setup.y+.5 && layout.lanes.length>0
    && layout.lanes.every(l=>l.exposed && l.y>=layout.stage.y && l.bottom<=layout.setup.y),
    label+' leaves every lane control fully exposed',layout);
  assert(layout.lanes.every(l=>l.width>=44 && l.height>=44),label+' has 44px touch targets');
  const laneTop=Math.min(...layout.lanes.map(l=>l.y));
  assert(layout.actors.every(a=>a.y>=layout.stage.y && a.bottom<=laneTop-4),
    label+' keeps actor labels above the lane controls',layout.actors);
  const overlap=(a,b)=>a.x<b.x+b.width && a.x+a.width>b.x && a.y<b.bottom && a.bottom>b.y;
  assert(layout.actors.filter(a=>a.side!=='foe').every(a=>layout.actors.filter(b=>b.side==='foe').every(b=>!overlap(a,b))),
    label+' keeps friendly and foe labels separate');
  const packet=await state(page), me=packet.state.players.find(p=>p.id===packet.you);
  const target=layout.lanes.find(l=>l.lane!==me.lane);
  assert(!!target,label+' offers another normal lane');
  // The enlarged upper edge was previously outside the button's hit area.
  await tapLaneEdge(page,target.lane,'upper');
  await page.waitForFunction(lane=>window.KM.state.players.find(p=>p.id===window.KM.you).lane===lane,target.lane);
  assert(true,label+' accepts an upper-edge touch and moves the controlled body');
  await tapLaneEdge(page,me.lane,'lower');
  await page.waitForFunction(lane=>window.KM.state.players.find(p=>p.id===window.KM.you).lane===lane,me.lane);
  assert(true,label+' accepts a lower-edge touch and restores formation');
  await shot(page,`setup-lanes-${viewport.width}${suffix}-fight-${report.fightsStarted+1}`);
}
async function tapLaneEdge(page, lane, edge) {
  // Coordinates from a previous viewport can fall outside the reprojected lane.
  // Sample the current button immediately before each real touchscreen action.
  const point=await page.locator(`.dg-scene-lane[data-lane="${lane}"]`).evaluate((el,edge)=>{
    const r=el.getBoundingClientRect(), x=r.x+r.width/2, y=edge==='upper' ? r.top+2 : r.bottom-2;
    return {x,y,exposed:el.contains(document.elementFromPoint(x,y))};
  },edge);
  assert(point.exposed,`${edge}-edge touch hits lane ${lane+1}`,point);
  await page.touchscreen.tap(point.x,point.y);
}
async function beginFight() {
  stage = 'begin combat';
  // The server intentionally starts the shared fight on the first human's start message.
  // There is no per-seat readiness barrier; later buttons disappear with that phase transition.
  await click(pages[report.fightsStarted % pages.length],'#dg-fight');
  await Promise.all(pages.map(page => phase(page,'playing')));
  report.fightsStarted++;
  if (!combatStarted) combatStarted = Date.now();
  assert(true, 'Dungeon Begin combat control enters shared playing on all three clients');
}
async function checkActiveBody(page, label) {
  const cue = await page.evaluate(() => {
    const active = document.querySelectorAll('.dg-scene-active');
    const el = active[0], style = el && getComputedStyle(el);
    const rect=el?.getBoundingClientRect();
    const exposed=rect && [.1,.5,.9].every(x=>el.contains(document.elementFromPoint(rect.x+rect.width*x,rect.y+rect.height/2)));
    return { count:active.length, id:el?.dataset.entityId, expected:window.KM.activeId,
      outline:style?.outlineStyle, width:parseFloat(style?.outlineWidth),
      color:style?.outlineColor, background:style?.backgroundColor, exposed };
  });
  assert(cue.count===1 && cue.id===cue.expected && cue.outline==='solid' && cue.width>=2,
    label+' keeps a visible marker on the controlled body',cue);
  assert(cue.exposed,label+' keeps the controlled body label above crossing allies',cue);
}
async function chooseVisible(page) {
  const s = await state(page);
  if (s.state?.phase !== 'playing' || !s.input.picking) return false;
  const index = s.input.cards.findIndex(c => !c.nav);
  if (index < 0) return false;
  try { await click(page, `.dg-card[data-slot="${index}"]`); }
  catch (error) {
    // An ended fight or a fallen body makes this choice unavailable, just like
    // the normal hand. Live actors and unreadable snapshots must still fail.
    const after = (await state(page).catch(() => null))?.state;
    const ended = ['won','lost'].includes(after?.phase);
    const actor = after?.players?.find(p => p.id === s.you);
    const fallen = after?.phase === 'playing' && actor?.alive === false && actor.hp <= 0;
    if (!ended && !fallen) throw error;
    report.events.push({kind:ended ? 'fight-ended-before-choice' : 'body-fell-before-choice',
      player:pages.indexOf(page),choice:s.input.cards[index].name});
    return false;
  }
  report.events.push({kind:'choice-click',name:s.input.pickName,choice:s.input.cards[index].name});
  return true;
}
async function pilotCombat(page) {
  const packet = await state(page), s = packet.state;
  if (s?.phase !== 'playing') return;
  const me = s.players.find(p => p.id === packet.you);
  if (!me?.alive) return;
  if (packet.input.picking) { await chooseVisible(page); return; }
  const action = decide(s,me);
  if (!action) return;
  if (action.target && me.targetId !== action.target) {
    const target = page.locator(`.dg-scene-actor[data-entity-id="${action.target}"]`);
    try { await target.click({timeout:7000}); }
    catch (error) {
      // A teammate can kill this exact foe while Playwright is aiming. Replan
      // only with a fresh authoritative snapshot; a missing label alone could
      // be a rendering bug. Never spend the stale action's card after recovery.
      const after = (await state(page).catch(() => null))?.state;
      const ended = ['won','lost'].includes(after?.phase);
      const completeRoster = after?.phase === 'playing' && Array.isArray(after.lanes)
        && after.lanes.length > 0 && after.lanes.every(lane => Array.isArray(lane.enemies));
      const foe = completeRoster && [...after.lanes.flatMap(lane => lane.enemies), after.boss]
        .find(foe => foe?.id === action.target);
      const gone = completeRoster && (!foe || foe.hp <= 0);
      if (!ended && !gone) throw error;
      report.events.push({kind:'stale-aim-skipped',player:pages.indexOf(page),target:action.target,
        cardId:action.cardId,reason:ended ? 'fight-ended' : 'foe-gone'});
      return;
    }
  }
  const card = page.locator(`.dg-card[data-card-id="${action.cardId}"]`);
  if (await card.count() && await card.isEnabled()) {
    const eventStart = report.events.length;
    try { await card.click({timeout:7000}); }
    catch (error) {
      // Three software-rendered browsers can outlast Playwright's post-click wait.
      // Accept only evidence that this exact click dispatched; never repeat a card play.
      const player = pages.indexOf(page);
      const delivered = report.events.slice(eventStart).some(e => e.player === player && e.type === 'playCard' && e.id === action.cardId);
      // The fight can end between choosing a card and clicking it; the hand then hides by design.
      const after = await state(page).catch(() => null);
      if (!delivered && ['won','lost'].includes(after?.state?.phase)) { report.events.push({kind:'fight-ended-before-click',player,cardId:action.cardId}); return; }
      // The controlled body can fall while Playwright is waiting for the card.
      // Only authoritative death permits abandoning this now-disabled action.
      const actor = after?.state?.players?.find(p => p.id === packet.you);
      if (!delivered && after?.state?.phase === 'playing' && actor?.alive === false && actor.hp <= 0) {
        report.events.push({kind:'body-fell-before-click',player,cardId:action.cardId}); return;
      }
      if (!delivered) throw error;
      report.events.push({kind:'click-receipt-after-timeout',player,cardId:action.cardId});
    }
  }
}

try {
  const desktop = await chromium.launch({headless:true,channel:'msedge',args:['--touch-events=disabled']}); browsers.push(desktop);
  const mobile = await chromium.launch({headless:true,channel:'msedge'}); browsers.push(mobile);
  const host = await makePage(desktop,false,0);
  await makePage(mobile,true,1); await makePage(mobile,true,2);
  stage='create/join';
  await host.locator('#name').fill('Dungeon Host');
  await click(host,'[data-difficulty="easy"]');
  await click(host,'#bodiesPick [data-bodies="1"]');
  await click(host,'#friendsPanel summary');
  await click(host,'#createFriendsBtn');
  await phase(host,'draft');
  const room = await host.evaluate(() => localStorage.getItem('km_room'));
  assert(!!room,'Host created normal friend room'); report.room=room;
  for (let index=1;index<pages.length;index++) {
    const page=pages[index];
    await page.locator('#name').fill('Dungeon '+(index+1));
    await click(page,'#friendsPanel summary');
    await page.locator('#code').fill(room);
    await click(page,'#joinBtn'); await phase(page,'draft');
  }
  await host.waitForFunction(() => window.KM.state.players.filter(p=>!p.bot).length === 3);
  const joined=(await state(host)).state;
  assert(joined.players.length===3 && joined.players.every(p=>!p.bot),'Three independent human seats joined');
  assert(joined.difficulty==='easy','Normal Easy difficulty selected');
  await shot(host,'01-desktop-draft'); await shot(pages[1],'02-phone-draft');
  stage='draft';
  for (const page of pages) {
    const packet=await state(page);
    const offers=packet.state.draft.wheel.filter(w=>!w.lockedBy && (w.offeredTo == null || w.offeredTo===packet.you)).sort((a,b)=>bundleScore(b)-bundleScore(a));
    assert(offers.length>0,'Normal draft offers available');
    await click(page,`[data-bundle="${offers[0].id}"] .class-pick`);
    await page.waitForFunction(() => window.KM.state.draft.picks.some(p=>p.id===window.KM.you && p.drafted));
    const free = await page.locator('[data-setcolor]:not(:disabled)').first().count();
    if (free) await page.locator('[data-setcolor]:not(:disabled)').first().click();
  }
  await click(host,'[data-beginrun]');
  await Promise.all(pages.map(page=>phase(page,'won')));
  await shot(host,'03-desktop-room-vote'); await shot(pages[1],'04-phone-room-vote');
  await chooseRoute();
  stage='management';
  await click(host,'#dg-loadout');
  await host.waitForFunction(()=>document.body.classList.contains('dg-management'));
  await shot(host,'05-desktop-management');
  await click(host,'#dg-close-management');
  await host.waitForFunction(()=>!document.body.classList.contains('dg-management'));
  await click(pages[1],'#dg-loadout');
  await shot(pages[1],'06-phone-management');
  await click(pages[1],'#dg-close-management');
  assert(true,'Desktop and phone native management can open and return through dungeon controls');
  stage='aim and formation';
  const actor=host.locator('.dg-scene-actor[data-side="foe"]').first();
  const foeId=await actor.getAttribute('data-entity-id'); await actor.click();
  await host.waitForFunction(id=>window.KM.state.players.find(p=>p.id===window.KM.you).targetId===id,foeId);
  const allyId=(await state(pages[1])).you;
  await click(host,`.dg-scene-actor[data-entity-id="${allyId}"]`);
  await host.waitForFunction(id=>window.KM.state.players.find(p=>p.id===window.KM.you).allyTargetId===id,allyId);
  assert(true,'Dungeon foe and ally actor clicks set authoritative aim IDs',{foeId,allyId});
  // A normal lane tap paints its intent before the WebSocket receipt, then moves
  // the existing standee over subsequent frames instead of teleporting it.
  const motion = await host.evaluate(() => {
    const km=window.KM, me=km.state.players.find(p=>p.id===km.activeId);
    const center=()=>{ const e=window.KMDungeon.scene.getDiagnostics().entityBounds.find(e=>e.id===me.id); return e.x+e.width/2; };
    const before=center(), from=me.lane, to=(from+1)%km.state.laneCount;
    km.selectLane(to);
    const scene=window.KMDungeon.scene.getDiagnostics().entityBounds.find(e=>e.id===me.id);
    return {id:me.id,from,to,before,immediate:center(),painted:scene.lane,authoritative:km.state.players.find(p=>p.id===me.id).lane};
  });
  assert(motion.painted===motion.to && motion.authoritative===motion.from,'Lane intent paints before its server receipt',motion);
  const center=()=>host.evaluate(id=>{ const e=window.KMDungeon.scene.getDiagnostics().entityBounds.find(e=>e.id===id); return e.x+e.width/2; },motion.id);
  await sleep(120); motion.during=await center();
  await sleep(900); motion.after=await center();
  assert(Math.abs(motion.immediate-motion.before)<2 && Math.abs(motion.during-motion.before)>2 && Math.abs(motion.after-motion.during)>2,'Lane movement interpolates across rendered frames',motion);
  // Arrange a real shared lane so front/back can change order instead of being a legal no-op.
  for (const page of pages) { await click(page,'.dg-scene-lane[data-lane="0"]'); await page.waitForFunction(()=>window.KM.state.players.find(p=>p.id===window.KM.you).lane===0); }
  await checkSetupLanes(pages[1], {width:740,height:360}, '-crowded');
  await checkSetupLanes(pages[1], {width:852,height:393}, '-crowded');
  await shot(host,'07-desktop-setup'); await shot(pages[1],'08-phone-setup');
  // Aim while setup holds the roster stable; live foes can die between sampling
  // a locator and clicking it. Keep that aim through the subsequent fight/move.
  const phone=pages[1];
  const aimedId=await phone.locator('.dg-scene-actor[data-side="foe"]').first().getAttribute('data-entity-id');
  await click(phone,`.dg-scene-actor[data-entity-id="${aimedId}"]`);
  await phone.waitForFunction(id=>window.KM.state.players.find(p=>p.id===window.KM.you).targetId===id,aimedId);
  await checkActiveBody(phone,'Aiming at an enemy');
  await click(phone,'.dg-inspect-close');
  await beginFight();
  stage='queue and depth';
  await click(host,'#dg-clock'); await click(host,'#dg-clock');
  const initial=await state(host), unaffordable=initial.input.cards.find(c=>c.affordable===false && !c.pick);
  if (unaffordable) {
    const card=host.locator(`.dg-card[data-card-id="${unaffordable.id}"]`);
    assert(await card.isEnabled(),'Unaffordable dungeon card remains clickable');
    await card.click();
    await host.waitForFunction(id=>window.KM.handView().queued?.id===id,unaffordable.id);
    await host.waitForFunction(id=>window.KM.state.players.find(p=>p.id===window.KM.you).queuedCard?.id===id,unaffordable.id);
    assert(true,'Dungeon card click queues the exact unaffordable card',{id:unaffordable.id,name:unaffordable.name});
    await shot(host,'09-desktop-queued');
    await card.click();
    await host.waitForFunction(()=>!window.KM.state.players.find(p=>p.id===window.KM.you).queuedCard);
    assert(true,'Second dungeon card click cancels its queue');
  } else report.limitations.push('No unaffordable non-choice card appeared at the opening sample.');
  await click(host,'#dg-back');
  await host.waitForFunction(()=>window.KM.state.players.find(p=>p.id===window.KM.you).depth>0);
  const back=(await state(host)).state.players.find(p=>p.id===initial.you).depth;
  await click(host,'#dg-forward');
  await host.waitForFunction(before=>window.KM.state.players.find(p=>p.id===window.KM.you).depth<before,back);
  assert(true,'Back then Front controls change authoritative formation depth');
  await shot(pages[1],'10-phone-playing');
  await shot(host,'11-desktop-playing');
  await checkActiveBody(pages[1],'Crowded phone combat');
  // Move each human back to a separate lane through the visible lane controls.
  for (const [index,page] of pages.entries()) await click(page,`.dg-scene-lane[data-lane="${index}"]`);
  await phone.waitForFunction(()=>window.KM.state.players.find(p=>p.id===window.KM.you).lane===1);
  await checkActiveBody(phone,'Moving and aiming at an enemy');
  await shot(phone,'11-phone-active-body-after-move');
  await click(host,'#dg-clock');
  stage='bounded real combat';
  while (budget()) {
    const packet=await state(host), s=packet.state;
    if (report.phases.at(-1)?.phase!==s.phase) report.phases.push({phase:s.phase,tick:s.tick,at:Date.now()-started});
    if (s.phase==='playing') { await Promise.all(pages.map(pilotCombat)); await sleep(100); continue; }
    if (s.phase==='lost') {
      await shot(host,'12-desktop-loss'); await shot(pages[1],'13-phone-loss');
      stage='restart after loss';
      if (await host.locator('#combatLog:not(.hidden) .clog-play').isVisible()) await click(host,'#combatLog .clog-play');
      else { await click(host,'#dg-menu-btn'); await click(host,'#dg-restart'); }
      await phase(host,'draft'); assert(true,'Loss can restart forward into a new normal draft');
      if (report.fightsWon === 0) report.limitations.push('Victory rewards and next-room progression were not reached in this run.');
      break;
    }
    if (s.phase==='won') {
      report.fightsWon++;
      await Promise.all(pages.map(page=>phase(page,'won')));
      await shot(host,`12-desktop-win-${report.fightsWon}`); await shot(pages[1],`13-phone-win-${report.fightsWon}`);
      for (const page of pages) if (await page.locator('#combatLog:not(.hidden) .clog-play').isVisible()) await click(page,'#combatLog .clog-play');
      assert(true,'Three clients reach shared victory and dungeon room rewards');
      if (report.fightsWon>=2) break;
      await chooseRoute(); await beginFight(); continue;
    }
    throw new Error('Unexpected combat phase '+s.phase);
  }
  if (!budget()) report.limitations.push('Stopped at the 120-second active-combat budget; a victory was not required.');
  if (!report.events.some(e=>e.kind==='choice-click')) report.limitations.push('No naturally offered special card choice was exercised.');
  assert(report.events.some(e=>e.type==='playCard'),'A dungeon hand click issued a real card intent');
  assert(report.errors.length===0,'All three browsers have zero console, page, and asset errors',report.errors);
} catch (error) {
  failure=String(error.stack || error); report.failure={stage,message:failure}; log('FAIL '+stage+': '+failure);
  for (const [index,page] of pages.entries()) { try { await shot(page,`failure-player-${index+1}`); writeFileSync(resolve(OUT,`failure-state-${index+1}.json`),JSON.stringify(await state(page),null,2)); } catch {} }
} finally {
  // These independent test seats never share the owner's room.
  for (const page of pages) await page.evaluate(()=>window.KM?.send({type:'leave'})).catch(()=>{});
  for (const browser of browsers) await browser.close().catch(()=>{});
  report.durationMs=Date.now()-started; report.closedBrowsers=true;
  writeFileSync(resolve(OUT,'report.json'),JSON.stringify(report,null,2));
  console.log('REPORT '+resolve(OUT,'report.json'));
  console.log(`${failure?'FAIL':'PASS'}: ${report.assertions.length} assertions; ${report.errors.length} browser errors; ${report.fightsWon}/${report.fightsStarted} fights won`);
  if (failure) process.exitCode=1;
}
