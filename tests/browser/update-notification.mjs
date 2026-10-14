import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('更新通知：真实应用宿主、跨路由常驻、明暗主题、日志、关闭及演示重启',async()=>{
 const server=createServer(path.resolve('dist'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1200,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const url=origin+'/?updateDemo=ready#/collab?evaProject=prod&evaTab=tasks';
 const card=page.locator('.eva-notification').filter({hasText:'更新已就绪'});
 try{
  await page.goto(origin+'/#/collab');await page.locator('.app-titlebar:visible').waitFor();
  assert.equal(await card.count(),0,'普通访问不伪造新版本');
  await page.goto(url);await card.waitFor();
  assert.match(await page.title(),/Eva/);assert.equal(await page.locator('.app-titlebar:visible').count(),1);
  assert.match(await card.innerText(),/v0\.1\.1-demo 将在下次启动时生效。/);
  assert.equal(await card.locator('svg.lucide-refresh-cw').count(),1);
  await page.mouse.move(0,0);await page.waitForTimeout(3500);assert.equal(await card.count(),1,'不自动消失');
  for(const route of ['/messages','/guid','/collab?evaProject=prod&evaTab=tasks']){
   await page.evaluate(r=>{location.hash=r;},route);
   await page.waitForFunction(r=>location.hash==='#'+r,route);
   assert.equal(await card.count(),1);assert.equal(await page.locator('.app-titlebar:visible').count(),1);
  }
  const backgrounds=[];
  for(const theme of ['light','dark']){
   await page.evaluate(t=>window.EvaTheme.apply(t),theme);
   await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
   const style=await card.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {right:innerWidth-r.right,bottom:innerHeight-r.bottom,bg:s.backgroundColor,radius:s.borderRadius,icon:getComputedStyle(e.querySelector('.semi-icon')).color,title:getComputedStyle(e.querySelector('.semi-notification-notice-title')).fontSize,buttons:[...e.querySelectorAll('button.semi-button:not(.semi-notification-notice-icon-close)')].map(a=>({bg:getComputedStyle(a).backgroundColor,border:getComputedStyle(a).borderTopWidth,color:getComputedStyle(a).color}))};});
   assert.equal(style.right,20);assert.equal(style.bottom,20);assert.equal(style.radius,'16px');assert.equal(style.title,'16px');
   backgrounds.push(style.bg);
   assert.equal(style.buttons.length,2);
   assert.ok(style.buttons.every(a=>a.bg!=='rgba(0, 0, 0, 0)'),'两个按钮都有背景');
   assert.equal(style.buttons[0].border,'1px');
   assert.notEqual(style.buttons[0].bg,style.buttons[1].bg,'主次按钮背景不同');
   assert.notEqual(style.buttons[0].color,style.buttons[1].color,'主次按钮文字有层级');
   console.log(theme,style);
   await page.screenshot({path:`/tmp/eva-update-${theme}.png`});
  }
  assert.notEqual(backgrounds[0],backgrounds[1],'公共主题切换必须改变卡片背景');
  await card.getByRole('button',{name:'查看更新日志'}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();assert.match(await dialog.innerText(),/此版本仅用于原型演示/);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await card.count(),1);
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'查看更新日志');
  await page.setViewportSize({width:680,height:700});
  const bounds=await card.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=680);
  await card.locator('.semi-notification-notice-icon-close').click();await card.waitFor({state:'hidden'});
  await page.evaluate(()=>{location.hash='/messages';});await page.waitForTimeout(200);assert.equal(await card.count(),0,'关闭后切页不重现');
  await page.goto(url);await page.reload();await card.waitFor();
  await card.getByRole('button',{name:'立即重启'}).focus();await page.keyboard.press('Space');
  await page.getByText('已演示重启操作，未执行实际安装或重启。').waitFor();await card.waitFor({state:'hidden'});
  assert.equal(page.url(),url,'演示不刷新页面或改变路由');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('更新器边界：下载过程静默、重复事件去重、关闭与新版本、重启失败重试',async()=>{
 const server=createServer(path.resolve('dist'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});
 try{
  await page.addInitScript(()=>{
   let state={status:'downloading',version:'2.0.0'},listener;
   window.updateTest={installs:0,emit(value){state=value;listener?.(state);}};
   window.EvaDesktopUpdates={getSnapshot:()=>state,subscribe(fn){listener=fn;return()=>{listener=null;};},openChangelog:async()=>{},install:async()=>{window.updateTest.installs++;throw new Error('test failure');}};
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab`);await page.locator('.app-titlebar:visible').waitFor();
  const card=page.locator('.eva-notification').filter({hasText:'更新已就绪'});assert.equal(await card.count(),0);
  await page.evaluate(()=>updateTest.emit({status:'ready',version:'2.0.0'}));await card.waitFor();
  await page.evaluate(()=>updateTest.emit({status:'ready',version:'2.0.0'}));assert.equal(await card.count(),1);
  await card.locator('.semi-notification-notice-icon-close').focus();await page.keyboard.press('Enter');await card.waitFor({state:'hidden'});
  await page.evaluate(()=>updateTest.emit({status:'ready',version:'2.0.0'}));assert.equal(await card.count(),0);
  await page.evaluate(()=>updateTest.emit({status:'ready',version:'2.1.0'}));await card.waitFor();
  await card.getByRole('button',{name:'立即重启'}).click();await card.getByRole('alert').waitFor();assert.match(await card.innerText(),/重启失败，请重试/);
  await card.getByRole('button',{name:'立即重启'}).click();assert.equal(await page.evaluate(()=>updateTest.installs),2);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('设置中的检查更新打开同一通知，关闭后允许主动重新检查',async()=>{
 const server=createServer(path.resolve('dist'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/#/guid`);
  await page.locator('.eva-sider-account').click();
  await page.locator('.eva-account-menu__item:visible',{hasText:'设置'}).click();
  await page.locator('.eva-settings-dialog__side>nav .semi-button:has-text("关于")').click();
  const check=page.locator('.eva-settings-dialog').getByRole('button',{name:'检查',exact:true});
  const card=page.locator('.eva-notification').filter({hasText:'更新已就绪'});
  assert.equal(await card.count(),0);
  await check.click();await card.waitFor();assert.equal(await card.count(),1);
  await card.locator('.semi-notification-notice-icon-close').focus();await page.keyboard.press('Enter');await card.waitFor({state:'hidden'});
  await check.click();await card.waitFor();assert.equal(await card.count(),1);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('关闭设置后，旧检查请求失败不再弹出错误通知',async()=>{
 const server=createServer(path.resolve('dist'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage();
 try{
  await page.addInitScript(()=>{window.EvaDesktopUpdates={getSnapshot:()=>({status:'idle'}),subscribe:()=>()=>{},check:()=>new Promise((_,reject)=>{window.rejectUpdateCheck=reject;})};});
  await page.goto(`http://127.0.0.1:${server.address().port}/#/guid`);
  await page.locator('.eva-sider-account').click();
  await page.locator('.eva-account-menu__item:visible',{hasText:'设置'}).click();
  await page.locator('.eva-settings-dialog__side>nav .semi-button:has-text("关于")').click();
  await page.locator('.eva-settings-dialog').getByRole('button',{name:'检查',exact:true}).click();
  await page.keyboard.press('Escape');
  await page.locator('.eva-settings-dialog .semi-modal').waitFor({state:'hidden'});
  await page.evaluate(async()=>{window.rejectUpdateCheck(new Error('offline'));await new Promise(r=>setTimeout(r,0));});
  assert.equal(await page.locator('.eva-notification').filter({hasText:'检查更新失败'}).count(),0);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
