import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('switch motion: live controls, retargeting, resize, reduced motion and route return',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{}),page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 async function go(route){await page.goto(origin+'/#'+route);}
 async function check(container,buttons,pseudo=false,inset=0){
  await container.waitFor();assert.equal(await container.evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.effect?.pseudoElement==='::before').length),0,'initial display must not animate indicator');await page.waitForTimeout(260);
  const marker=pseudo?container:container.locator(':scope > .eva-tab-marker');
  const state=()=>marker.evaluate((n,p)=>{const s=getComputedStyle(n,p?'::before':null);return {transform:s.transform,duration:s.transitionDuration};},pseudo);
  const before=await state();assert.ok(before.duration.split(', ').includes('0.22s'));
  await buttons.nth(1).click();await page.waitForTimeout(35);const middle=await state();await page.waitForTimeout(250);const end=await state();assert.notEqual(before.transform,end.transform,'indicator must move');assert.notEqual(middle.transform,end.transform,'must have an intermediate position');
  if(!pseudo){const m=await marker.boundingBox(),b=await buttons.nth(1).boundingBox();assert.ok(Math.abs(m.x-b.x-inset)<1,JSON.stringify({m,b,inset}));assert.ok(Math.abs(m.width-(b.width-inset*2))<1);}
  await buttons.nth(0).click();await buttons.nth(1).click();await buttons.nth(0).click();await page.waitForTimeout(260);assert.equal((await state()).transform,before.transform,'last rapid click wins');
  await page.emulateMedia({reducedMotion:'reduce'});assert.ok((await state()).duration.split(', ').every(v=>v==='0s'));await buttons.nth(1).click();assert.equal((await state()).transform,end.transform);await buttons.nth(0).click();await page.emulateMedia({reducedMotion:'no-preference'});
  console.log('verified',await container.getAttribute('class'));
 }
 try{
  await go('/messages');const follow=page.locator('.wk-sidebar-tabbar__container');await check(follow,follow.locator('button'),true);
  await go('/collab');await page.getByRole('button',{name:'供应链运营协同 协同推进间接采购、供应商质量与合规风控工作',exact:true}).click();const project=page.locator('.collab-tabs__list');
  const tasks=page.locator('.eva-task-view-switcher');await check(tasks,tasks.getByRole('tab'),true);await tasks.getByRole('tab',{name:'层级',exact:true}).click();await page.waitForTimeout(260);assert.equal(await tasks.getByRole('tab',{name:'层级',exact:true}).getAttribute('aria-selected'),'true');
  await project.getByRole('tab',{name:'自动化',exact:true}).click();assert.equal(await page.locator('.eva-auto-segmented').count(),0,'project automation keeps its existing cards');
  await go('/scheduled');const auto=page.locator('.eva-auto-segmented');await check(auto,auto.getByRole('tab'),true);
  await go('/messages');await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();await page.locator('.ch-head .op[title="子区"]').click();await page.locator('.eva-thread-list-tabs').waitFor();assert.equal(await page.locator('.eva-tab-marker,.eva-animated-tabs').count(),0);
  await go('/messages');await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();await page.locator('.ch-head .op[title="查找聊天内容"]').click();await page.locator('.eva-conversation-search__tabs').waitFor();assert.equal(await page.locator('.eva-tab-marker,.eva-animated-tabs').count(),0);
  await go('/eva-stub/技能');await page.locator('.eva-connection-tabs').waitFor();assert.equal(await page.locator('.eva-tab-marker,.eva-animated-tabs').count(),0);
  await go('/messages');await follow.waitFor();await follow.locator('button').nth(1).click();await page.waitForTimeout(260);await page.setViewportSize({width:1000,height:800});await page.waitForTimeout(260);const geometry=await follow.evaluate(n=>{const s=getComputedStyle(n,'::before');return {x:new DOMMatrix(s.transform).m41,width:parseFloat(s.width)};});assert.ok(Math.abs(geometry.x-geometry.width)<1,'resize preserves selected half');await follow.locator('button').first().click();
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
