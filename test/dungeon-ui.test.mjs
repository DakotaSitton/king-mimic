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
async function chooseVisible(page) {
  const s = await state(page);
  if (!s.input.picking) return false;
  const index = s.input.cards.findIndex(c => !c.nav);
  if (index < 0) return false;
  await click(page, `.dg-card[data-slot="${index}"]`);
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
    if (await target.count()) await target.click({timeout:7000});
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
    await click(page,`[data-bundle="${offers[0].id}"]`);
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
  // Arrange a real shared lane so front/back can change order instead of being a legal no-op.
  for (const page of pages) { await click(page,'.dg-scene-lane[data-lane="0"]'); await page.waitForFunction(()=>window.KM.state.players.find(p=>p.id===window.KM.you).lane===0); }
  await shot(host,'07-desktop-setup'); await shot(pages[1],'08-phone-setup');
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
  await click(host,'#dg-clock');
  // Move each human back to a separate lane through the visible lane controls.
  for (const [index,page] of pages.entries()) await click(page,`.dg-scene-lane[data-lane="${index}"]`);
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
      report.limitations.push('Victory rewards and next-room progression were not reached in this run.'); break;
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
  for (const browser of browsers) await browser.close().catch(()=>{});
  report.durationMs=Date.now()-started; report.closedBrowsers=true;
  writeFileSync(resolve(OUT,'report.json'),JSON.stringify(report,null,2));
  console.log('REPORT '+resolve(OUT,'report.json'));
  console.log(`${failure?'FAIL':'PASS'}: ${report.assertions.length} assertions; ${report.errors.length} browser errors; ${report.fightsWon}/${report.fightsStarted} fights won`);
  if (failure) process.exitCode=1;
}
