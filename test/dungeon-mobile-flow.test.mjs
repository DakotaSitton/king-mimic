// Real random solo run: touch continuity, safe reading, and phone control geometry.
// Start a private server first. This test never injects game state or starts a server.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bundleScore, nextNodeId } from '../tools/brain.mjs';

const BASE = (process.env.BASE || 'http://localhost:3221').replace(/\/$/, '');
const OUT = resolve('artifacts/mobile-flow', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(OUT, {recursive:true});
const report = {base:BASE, assertions:[], errors:[], events:[], screenshots:[]};
const browser = await chromium.launch({headless:true, channel:'msedge'});
const viewport={width:Number(process.env.PHONE_WIDTH || 852),height:Number(process.env.PHONE_HEIGHT || 393)};
const context = await browser.newContext({viewport,deviceScaleFactor:3,hasTouch:true,isMobile:true});
const page = await context.newPage();
const assert = (ok, label, details) => {
  if (!ok) throw new Error(`${label}: ${JSON.stringify(details)}`);
  report.assertions.push({label,details}); console.log('PASS '+label);
};
const phase = expected => page.waitForFunction(p => window.KM?.state?.phase === p, expected, {timeout:15000});
const tap = selector => page.locator(selector).tap({timeout:7000});
const shot = async label => { const path=resolve(OUT,label+'.png'); await page.screenshot({path}); report.screenshots.push(path); };
page.on('pageerror', e => report.errors.push(String(e)));
page.on('console', m => { if(m.type()==='error') report.errors.push(m.text()); });
page.on('response', r => { if(r.status()>=400 && !r.url().includes('favicon')) report.errors.push(`${r.status()} ${r.url()}`); });
page.on('websocket', ws => ws.on('framesent', e => { try { const m=JSON.parse(String(e.payload)); if(m.type==='playCard') report.events.push(m); } catch {} }));
try {
  await page.goto(BASE+'/?touch=1&harness=1');
  await page.waitForFunction(()=>!!window.KMDungeon);
  await page.locator('#name').fill('Mobile flow check');
  await tap('[data-difficulty="easy"]');
  await tap('#createBtn'); await phase('draft');
  const bundle=await page.evaluate(()=>window.KM.state.draft.wheel.filter(w=>!w.lockedBy));
  bundle.sort((a,b)=>bundleScore(b)-bundleScore(a));
  await tap(`[data-bundle="${bundle[0].id}"] .class-pick`); await phase('won');
  await shot('01-room-choice');
  const next=await page.evaluate(()=>window.KM.state.map);
  await tap(`[data-dg-action="route"][data-dg-value="${nextNodeId(next)}"]`); await phase('setup');
  await tap('#dg-fight'); await phase('playing');

  const controls = await page.evaluate(() => ['#dg-menu-btn','#dg-clock','#dg-details','#dg-body-info','#dg-forward','#dg-back','#dg-summons'].map(selector=>{
    const r=document.querySelector(selector).getBoundingClientRect(); return {selector,width:r.width,height:r.height,inside:r.x>=0 && r.y>=0 && r.right<=innerWidth && r.bottom<=innerHeight};
  }));
  assert(controls.every(r=>r.width>=44 && r.height>=44),'Frequent phone controls have at least 44px touch targets',controls);
  assert(controls.every(r=>r.inside),'Phone controls fit inside the viewport',controls);
  await shot('02-playing');

  const beforeRead=report.events.length;
  await tap('#dg-details');
  await page.waitForFunction(()=>document.querySelector('#dg-shell').classList.contains('dg-expanded-cards'));
  const readingBox=await page.locator('.dg-card:first-child').boundingBox();
  await page.touchscreen.tap(readingBox.x+readingBox.width/2,readingBox.y+readingBox.height/2);
  await page.keyboard.press('1');
  assert(report.events.length===beforeRead,'Reading a card or pressing its shortcut cannot play it');
  assert(await page.locator('#dg-details').textContent()==='Back to fight','Reading mode has an explicit return control');
  await shot('03-card-reading');
  await tap('#dg-details');

  // Await an ordinary affordable non-choice card; hold a different card through its resolution.
  await page.waitForFunction(()=>{
    const v=window.KM.handView();
    return window.KM.state.phase==='playing' && !v.picking && v.cards.length>=2 && v.cards.some(c=>!c.pick && c.affordable!==false && !v.pending.includes(c.id));
  },null,{timeout:25000});
  const pair=await page.evaluate(()=>{
    const v=window.KM.handView();
    const other=v.cards.filter(c=>!c.pick && c.affordable!==false && !v.pending.includes(c.id)).sort((a,b)=>(a.dmgNow||0)-(b.dmgNow||0))[0];
    const held=v.cards.find(c=>c.id!==other.id && !c.pick) || v.cards.find(c=>c.id!==other.id);
    window.__heldCard=document.querySelector(`.dg-card[data-card-id="${held.id}"]`);
    return {other:other.id,held:held.id,heldPick:!!held.pick};
  });
  const box=await page.locator(`.dg-card[data-card-id="${pair.held}"]`).boundingBox();
  const cdp=await context.newCDPSession(page);
  const point={x:box.x+box.width/2,y:box.y+box.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await page.evaluate(id=>{ const i=window.KM.handView().cards.findIndex(c=>c.id===id); window.KM.playHandSlot(i); },pair.other);
  await page.waitForFunction(id=>!window.KM.handView().cards.some(c=>c.id===id),pair.other,{timeout:6000});
  const stable=await page.evaluate(id=>({
    phase:window.KM.state.phase,
    same:window.__heldCard===document.querySelector(`.dg-card[data-card-id="${id}"]`) && window.__heldCard.isConnected,
    box:window.__heldCard.getBoundingClientRect().toJSON(),
  }),pair.held);
  assert(stable.phase==='playing','Random fight remains active for the held-touch regression',stable);
  assert(stable.same,'A sibling draw preserves the held card DOM node',stable);
  const releaseStart=report.events.length;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  if(pair.heldPick) {
    await page.waitForFunction(()=>window.KM.handView().picking);
    assert(report.events.length===releaseStart,'Held choice card opens its chooser without spending a different card');
  } else {
    await page.waitForTimeout(250);
    assert(report.events.slice(releaseStart).some(e=>e.id===pair.held),'Finger release plays the same held card after its sibling resolves',report.events.slice(releaseStart));
    assert(report.events.slice(releaseStart).every(e=>e.id===pair.held),'Finger release never plays the replacement card');
  }
  await shot('04-after-held-tap');
  assert(report.errors.length===0,'No browser or asset errors',report.errors);
} catch(error) {
  report.failure=String(error.stack || error); console.error(report.failure);
  await shot('failure').catch(()=>{}); process.exitCode=1;
} finally {
  // Explicit leave cleans up this test seat; never touch an owner's room.
  await page.evaluate(()=>window.KM?.send({type:'leave'})).catch(()=>{});
  await browser.close();
  writeFileSync(resolve(OUT,'report.json'),JSON.stringify(report,null,2));
  console.log('REPORT '+resolve(OUT,'report.json'));
}
