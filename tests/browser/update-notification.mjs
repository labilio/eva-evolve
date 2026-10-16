import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
const output='/tmp/eva-restored-update';fs.mkdirSync(output,{recursive:true});
async function setup(){
 const server=createServer(path.resolve('dist'));await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));return {page,origin:`http://127.0.0.1:${server.address().port}`,errors,close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
const card=page=>page.locator('.eva-update-notification');
const state=(page,s)=>card(page).locator(`[data-update-state="${s}"]`).waitFor();
async function settings(page){await page.locator('.eva-sider-account').click();await page.locator('.eva-account-menu__item:visible',{hasText:'设置'}).click();await page.locator('.eva-settings-dialog__side>nav .semi-button:has-text("关于")').click();await page.locator('.eva-settings-dialog').getByRole('button',{name:/^(检查更新|查看可用更新|查看下载进度|查看更新进度|待重启|查看更新失败)$/}).click();await page.keyboard.press('Escape');await page.locator('.eva-settings-dialog .semi-modal').waitFor({state:'hidden'});}
async function capture(page,name){await card(page).screenshot({path:`${output}/${name}-card.png`});await page.screenshot({path:`${output}/${name}.png`});}
test('恢复单通知完整流程：日志、进度、持续下载、跨路由、准备、关闭/重开和模拟重启',async()=>{
 const t=await setup(),{page,origin}=t;
 try{
  await page.goto(origin+'/?updateDemo=available#/collab?evaProject=prod&evaTab=tasks');await state(page,'available');await capture(page,'available');
  assert.deepEqual(await card(page).locator('[data-update-actions] button').allTextContents(),['新版变化','下载']);
  await card(page).getByRole('button',{name:'新版变化'}).click();await page.getByRole('dialog').filter({hasText:'此版本仅用于原型演示'}).waitFor();await page.keyboard.press('Escape');
  const node=await card(page).elementHandle();await card(page).getByRole('button',{name:'下载',exact:true}).focus();await page.keyboard.press('Space');await state(page,'downloading');
  await page.waitForFunction(()=>Number(document.querySelector('.eva-update-notification [role=progressbar]').getAttribute('aria-valuenow'))>=24);await capture(page,'downloading');
  for(const route of ['/messages','/guid','/collab?evaProject=prod&evaTab=tasks']){await page.evaluate(r=>location.hash=r,route);assert.equal(await card(page).count(),1);}
  await state(page,'preparing');assert.equal(await card(page).getByRole('button',{name:'立即重启'}).count(),0);assert.equal(await card(page).locator('[data-update-actions]').count(),0);await capture(page,'preparing');
  await state(page,'ready');assert.equal(await node.evaluate(e=>e===document.querySelector('.eva-update-notification')),true);await capture(page,'ready');
  await card(page).locator('.semi-notification-notice-icon-close').click();await card(page).waitFor({state:'hidden'});await settings(page);await state(page,'ready');
  await card(page).getByRole('button',{name:'立即重启'}).click();await state(page,'installing');await state(page,'demo-complete');assert.match(await card(page).innerText(),/未执行实际安装或重启/);assert.deepEqual(t.errors,[]);
 }finally{await t.close();}
});
test('明暗与原按钮几何、未知进度、窄屏、关闭后继续下载；错误在原卡恢复',async()=>{
 const t=await setup(),{page,origin}=t;
 try{
  await page.addInitScript(()=>{let value={status:'available',version:'2.0.28'},listener;window.updateTest={emit(v){value={version:'2.0.28',...v};listener?.(value);}};window.EvaDesktopUpdates={getSnapshot:()=>value,subscribe:fn=>{listener=fn;return()=>listener=null;},check:async()=>{},download:async()=>{},install:async()=>{},openChangelog:async()=>{}};});
  await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks');await state(page,'available');
  for(const theme of ['light','dark']){
   await page.evaluate(v=>window.EvaTheme.apply(v),theme);
   for(const status of ['available','downloading','preparing','ready','error']){
    await page.evaluate(s=>updateTest.emit({status:s,percent:48,transferred:24*1024*1024,total:50*1024*1024}),status);await state(page,status);await capture(page,`${status}-${theme}`);
    const g=await card(page).evaluate(el=>{const a=el.querySelector('[data-update-actions]'),s=a&&getComputedStyle(a);return {overflow:el.scrollWidth>el.clientWidth,gap:s?.gap,margin:s?.marginTop,justify:s?.justifyContent,buttonXs:a?[...a.querySelectorAll('button')].map(b=>b.getBoundingClientRect().x):[],contentX:el.querySelector('[data-update-state]').getBoundingClientRect().x};});assert.equal(g.overflow,false);
    if(status==='downloading'){assert.equal(await card(page).locator('[data-update-actions]').count(),0);assert.equal(await card(page).getByRole('button',{name:/取消/}).count(),0);}
    else if(status==='preparing'){assert.equal(await card(page).locator('[data-update-actions]').count(),0);assert.equal(await card(page).locator('.semi-progress-track-inner-indeterminate').evaluate(e=>getComputedStyle(e).animationName),'semi-progress-indeterminate-slide');}
    else{assert.equal(g.gap,'8px');assert.equal(g.margin,'16px');assert.ok(Math.abs(g.buttonXs[0]-g.contentX)<0.5);}
   }
  }
  await page.evaluate(()=>updateTest.emit({status:'downloading'}));assert.match(await card(page).getByRole('progressbar').getAttribute('aria-valuetext'),/未知/);
  await card(page).locator('.semi-notification-notice-icon-close').click();await card(page).waitFor({state:'hidden'});await page.evaluate(()=>updateTest.emit({status:'downloading',percent:80}));assert.equal(await card(page).count(),0);await page.evaluate(()=>updateTest.emit({status:'ready'}));await state(page,'ready');await card(page).locator('.semi-notification-notice-icon-close').click();await card(page).waitFor({state:'hidden'});await page.evaluate(()=>updateTest.emit({status:'ready'}));assert.equal(await card(page).count(),0);await settings(page);await state(page,'ready');
  await page.setViewportSize({width:360,height:640});await capture(page,'narrow');const r=await card(page).boundingBox();assert.ok(r.x>=0&&r.x+r.width<=360);assert.deepEqual(t.errors,[]);
 }finally{await t.close();}
});
test('下载失败和安装失败可重试，无额外弹窗',async()=>{
 const t=await setup(),{page,origin}=t;
 try{await page.goto(origin+'/?updateDemo=download-error#/collab');await settings(page);await state(page,'available');await card(page).getByRole('button',{name:'下载',exact:true}).click();await state(page,'error');await card(page).getByRole('button',{name:'重新下载'}).click();await state(page,'ready');
 await page.goto(origin+'/?updateDemo=install-error#/collab');await settings(page);await card(page).getByRole('button',{name:'下载',exact:true}).click();await state(page,'ready');await card(page).getByRole('button',{name:'立即重启'}).click();await card(page).getByRole('alert').waitFor();await card(page).getByRole('button',{name:'立即重启'}).click();await state(page,'demo-complete');assert.deepEqual(t.errors,[]);
 }finally{await t.close();}
});
test('设置检查更新下方的失败演示入口：失败、重试、下载锁与重新演示',async()=>{
 const t=await setup(),{page,origin}=t;
 try{
  await page.goto(origin+'/#/collab');await state(page,'available');
  await page.locator('.eva-sider-account').click();await page.locator('.eva-account-menu__item:visible',{hasText:'设置'}).click();await page.locator('.eva-settings-dialog__side>nav .semi-button:has-text("关于")').click();
  const demo=page.getByRole('button',{name:'演示更新失败',exact:true}),check=page.getByRole('button',{name:/^(检查更新|查看可用更新|查看下载进度|查看更新进度|待重启|查看更新失败)$/});
  assert.ok((await demo.boundingBox()).y>(await check.boundingBox()).y);await demo.click();await page.getByRole('button',{name:'一般下载失败',exact:true}).click();await state(page,'error');
  await page.keyboard.press('Escape');await page.locator('.eva-settings-dialog .semi-modal').waitFor({state:'hidden'});
  assert.match(await card(page).innerText(),/更新未能下载完成/);assert.deepEqual(await card(page).locator('[data-update-actions] button').allTextContents(),['稍后再试','重新下载']);await capture(page,'failure-demo');
  await card(page).getByRole('button',{name:'重新下载'}).click();await state(page,'downloading');
  await page.locator('.eva-sider-account').click();await page.locator('.eva-account-menu__item:visible',{hasText:'设置'}).click();await page.locator('.eva-settings-dialog__side>nav .semi-button:has-text("关于")').click();assert.equal(await demo.isDisabled(),true);
  await card(page).locator('.semi-notification-notice-icon-close').click();await card(page).waitFor({state:'hidden'});await page.waitForFunction(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='演示更新失败');return b&&!b.disabled;});await demo.click();await page.getByRole('button',{name:'一般下载失败',exact:true}).click();await state(page,'error');assert.deepEqual(t.errors,[]);
 }finally{await t.close();}
});
test('断网演示经过部分下载后中断，明确原因并从零重新下载',async()=>{
 const t=await setup(),{page,origin}=t;
 try{
  await page.goto(origin+'/#/collab');await state(page,'available');await page.locator('.eva-sider-account').click();await page.locator('.eva-account-menu__item:visible',{hasText:'设置'}).click();await page.locator('.eva-settings-dialog__side>nav .semi-button:has-text("关于")').click();await page.getByRole('button',{name:'演示更新失败',exact:true}).click();await page.getByRole('button',{name:'下载中途断网',exact:true}).click();await page.getByText('以下均为模拟故障', {exact:false}).waitFor({state:'hidden'});await page.keyboard.press('Escape');await page.locator('.eva-settings-dialog .semi-modal').waitFor({state:'hidden'});await state(page,'downloading');await page.waitForFunction(()=>Number(document.querySelector('.eva-update-notification [role=progressbar]')?.getAttribute('aria-valuenow'))>=16);await state(page,'error');assert.match(await card(page).innerText(),/网络连接已断开/);assert.equal(await card(page).getByRole('button',{name:'立即重启'}).count(),0);await capture(page,'offline-failure');await card(page).getByRole('button',{name:'重新下载'}).click();await state(page,'downloading');assert.ok(Number(await card(page).getByRole('progressbar').getAttribute('aria-valuenow'))<48);await state(page,'ready');assert.deepEqual(t.errors,[]);
 }finally{await t.close();}
});


test('收起下载后可从设置查看实时进度，完成自动再提醒，收起就绪后不重复提醒',async()=>{
 const t=await setup(),{page,origin}=t;
 try{
  await page.goto(origin+'/?updateDemo=available#/collab?evaProject=prod&evaTab=tasks');await state(page,'available');
  await card(page).locator('.semi-notification-notice-icon-close').click();await card(page).waitFor({state:'hidden'});
  await settings(page);await state(page,'available');
  await card(page).getByRole('button',{name:'下载',exact:true}).click();await state(page,'downloading');
  assert.match(await card(page).innerText(),/关闭后仍会在后台下载/);
  await card(page).locator('.semi-notification-notice-icon-close').focus();await page.keyboard.press('Enter');await card(page).waitFor({state:'hidden'});
  await page.waitForTimeout(1000);assert.equal(await card(page).count(),0);
  await settings(page);await state(page,'downloading');assert.ok(Number(await card(page).getByRole('progressbar').getAttribute('aria-valuenow'))>0);
  await card(page).locator('.semi-notification-notice-icon-close').click();await card(page).waitFor({state:'hidden'});
  await page.evaluate(()=>location.hash='/messages');await state(page,'ready');
  assert.deepEqual(await card(page).locator('[data-update-actions] button').allTextContents(),['查看更新日志','立即重启']);
  await card(page).getByRole('button',{name:'查看更新日志'}).click();await page.getByRole('dialog').filter({hasText:'此版本仅用于原型演示'}).waitFor();await page.keyboard.press('Escape');
  await card(page).locator('.semi-notification-notice-icon-close').click();await card(page).waitFor({state:'hidden'});
  await page.evaluate(()=>location.hash='/collab?evaProject=prod&evaTab=tasks');await page.waitForTimeout(700);assert.equal(await card(page).count(),0);
  await settings(page);await state(page,'ready');assert.deepEqual(t.errors,[]);
 }finally{await t.close();}
});
