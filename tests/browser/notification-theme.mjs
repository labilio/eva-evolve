import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

// Component fixture only: no production demo route or fake task/forward action.
export async function createPreview(){
 const css=fs.readFileSync('dist/index.html','utf8').match(/<link[^>]+stylesheet[^>]*>/g).join('\n');
 const code=`import React from 'react';import * as ReactDOM from 'react-dom';import {createRoot} from 'react-dom/client';import {createForms} from './dist/vendor/eva-forms.module.js';
 const {Notification,Typography,Space}=createForms(React,{...ReactDOM,createRoot});window.notifications=Notification;
 document.querySelector('#show').onclick=()=>Notification.success({id:'preview',title:'已创建任务',position:'bottomRight',content:<Space vertical align="start" spacing={8}><div>SC-128 核对供应商报价</div><Space spacing={20}><Typography.Text link onClick={()=>document.querySelector('#result').textContent='查看操作回调已触发'}>查看任务</Typography.Text><Typography.Text link onClick={()=>{document.querySelector('#result').textContent='转发操作回调已触发';Notification.close('preview');}}>转发</Typography.Text></Space></Space>});
 document.querySelector('#theme').onclick=()=>document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
 document.querySelector('#show').click();`;
 const result=await build({stdin:{contents:code,loader:'jsx',resolveDir:process.cwd()},bundle:true,write:false,loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
 fs.writeFileSync('dist/notification-preview.js',result.outputFiles[0].text);
 fs.writeFileSync('dist/notification-preview.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}<body style="background:var(--eva-surface-primary)"><main style="padding:40px;font-family:var(--eva-font-sans);color:var(--eva-text-primary)"><h1>Notification 组件预览</h1><p>验证公共组件主题与操作回调；任务编号与标题为示例数据；此页不创建任务或发送消息。</p><button id="show">显示成功通知</button> <button id="theme">切换明暗主题</button><p id="result" role="status"></p></main><script src="prototype/050-lucide-dom.js"></script><script src="notification-preview.js"></script></body></html>`);
}

test('Notification：构建出口、Portal、token 联动、明暗、操作、更新及自动关闭',async()=>{
 await createPreview();
 const server=createServer(path.resolve('dist'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const card=page.locator('.eva-notification');
 try{
 await page.goto(`http://127.0.0.1:${server.address().port}/notification-preview.html`);
 await card.waitFor();
 // Eva typography/spacing follows the shared Form/Modal source, not native defaults.
 const actual=await card.evaluate(e=>{
  const title=getComputedStyle(e.querySelector('.semi-notification-notice-title'));
  const body=getComputedStyle(e.querySelector('.semi-notification-notice-content'));
  const link=getComputedStyle(e.querySelector('.semi-typography'));
  return {title:[title.fontSize,title.lineHeight,title.fontWeight,title.marginBottom],body:[body.fontSize,body.lineHeight,body.fontWeight],link:[link.fontSize,link.lineHeight,link.fontWeight]};
 });
 assert.deepEqual(actual,{title:['16px','25.144px','500','8px'],body:['14px','22px','400'],link:['14px','22px','400']});
 const spacing=await card.evaluate(e=>{e.style.setProperty('--eva-space-2','11px');const value=getComputedStyle(e.querySelector('.semi-notification-notice-title')).marginBottom;e.style.removeProperty('--eva-space-2');return value;});
 assert.equal(spacing,'11px');
 await page.getByRole('button',{name:'显示成功通知',exact:true}).click();
 await card.waitFor();
 await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
 const alignment=await card.evaluate(e=>{const title=e.querySelector('.semi-notification-notice-title').getBoundingClientRect(),buttons=[...e.querySelectorAll('.semi-typography-link')];return {left:buttons[0].getBoundingClientRect().left-title.left,tops:buttons.map(b=>b.getBoundingClientRect().top),forward:!!e.querySelector('.lucide-forward')};});
 assert.equal(alignment.left,0);assert.equal(alignment.tops[0],alignment.tops[1]);assert.equal(alignment.forward,false);
 await page.screenshot({path:'/tmp/eva-notification-actions.png'});
 await page.getByText('转发',{exact:true}).click();
 await card.waitFor({state:'hidden'});
 assert.match(await page.locator('#result').innerText(),/转发操作/);
 const palettes=[];
 for(const theme of ['light','dark']){
  await page.evaluate(t=>{document.documentElement.dataset.theme=t;window.notifications.success({id:'theme',title:'已创建任务',position:'bottomRight',duration:0});},theme);
  await card.waitFor();
  await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
  const values=await card.evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {bg:s.backgroundColor,radius:s.borderRadius,padding:s.paddingTop,title:getComputedStyle(e.querySelector('.semi-notification-notice-title')).fontSize,weight:getComputedStyle(e.querySelector('.semi-notification-notice-title')).fontWeight,right:innerWidth-r.right,bottom:innerHeight-r.bottom,icon:!!e.querySelector('.semi-icon-tick_circle'),portal:e.parentElement.getAttribute('placement')};});
  palettes.push(values.bg);assert.equal(values.radius,'16px');assert.equal(values.padding,'16px');assert.equal(values.title,'16px');assert.equal(values.icon,true);assert.equal(values.portal,'bottomRight');assert.equal(values.right,20);assert.equal(values.bottom,20);assert.equal(values.weight,'500');
  await page.screenshot({path:`/tmp/eva-notification-${theme}.png`});
  const linked=await card.evaluate(e=>{e.style.setProperty('--eva-radius-panel','22px');e.style.setProperty('--eva-surface-primary','rgb(31, 41, 51)');const s=getComputedStyle(e);return [s.borderRadius,s.paddingTop,s.backgroundColor];});
  assert.deepEqual(linked,['22px','16px','rgb(31, 41, 51)']);
  await card.locator('.semi-notification-notice-icon-close').click();await card.waitFor({state:'hidden'});
 }
 assert.notEqual(palettes[0],palettes[1]);
 await page.evaluate(()=>{notifications.info({id:'same',title:'更新前',duration:0});notifications.info({id:'same',title:'更新后',duration:0});});
 await page.getByText('更新后',{exact:true}).waitFor();assert.equal(await card.count(),1);
 await page.evaluate(()=>notifications.destroyAll());await card.waitFor({state:'hidden'});
 for(const kind of ['info','warning','error']){
  await page.evaluate(k=>notifications[k]({title:k,content:'状态说明',duration:0}),kind);await card.waitFor();
  assert.equal(await card.locator('svg.lucide').count(),1);
  assert.equal(await card.locator('.semi-notification-notice-icon-close .semi-icon-close').count(),1);
  await page.evaluate(()=>notifications.destroyAll());await card.waitFor({state:'hidden'});
 }
 await page.evaluate(()=>notifications.success({title:'短暂通知',duration:1.2,position:'bottomRight'}));await card.waitFor();await card.hover();await page.waitForTimeout(1500);assert.equal(await card.count(),1);await page.mouse.move(0,0);await card.waitFor({state:'hidden'});
 // Native geometry is not capped by the Eva wrapper. Verify keyboard close.
 await page.evaluate(()=>notifications.success({title:'已创建任务',content:'补充说明',duration:0,position:'bottomRight'}));await card.waitFor();
 await card.locator('.semi-notification-notice-icon-close').focus();await page.keyboard.press('Enter');await card.waitFor({state:'hidden'});
 await page.setViewportSize({width:1200,height:800});
 await page.route('**/eva-runtime.module*.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.__notificationForTest=evaForms.Notification;window.__notificationReact=reactExports;window.__notificationForms=evaForms;'});});
 await page.goto(`http://127.0.0.1:${server.address().port}/#/collab`);
 await page.waitForFunction(()=>!!window.__notificationForTest);
 await page.evaluate(()=>{const R=__notificationReact,{Space,Typography}=__notificationForms;__notificationForTest.success({title:'已创建任务',content:R.createElement(Space,{vertical:true,align:'start',spacing:8},R.createElement('div',null,'SC-128 核对供应商报价'),R.createElement(Space,{spacing:20},R.createElement(Typography.Text,{link:true},'查看任务'),R.createElement(Typography.Text,{link:true},'转发'))),position:'bottomRight',duration:0});});
 await card.waitFor();await page.locator('.app-titlebar:visible').waitFor();
 await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
 await page.screenshot({path:'/tmp/eva-notification-in-app.png'});assert.equal(await page.locator('.app-titlebar:visible').count(),1);
 await card.locator('.semi-notification-notice-icon-close').click();await card.waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
