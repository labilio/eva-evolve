import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Semi breadcrumb: complete path, automatic positioning, manual scroll and ancestor navigation',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks&evaTask=SC-114`);
  const path=page.getByRole('navigation',{name:'任务路径'}),scroll=page.locator('.eva-task-breadcrumb-scroll');
  await path.waitFor();
  assert.equal(await path.locator('.semi-breadcrumb-item').count(),6);
  assert.equal(await path.locator('.lucide-chevron-right').count(),5);
  assert.doesNotMatch(await path.innerText(),/…/);
  await page.waitForFunction(()=>{const e=document.querySelector('.eva-task-breadcrumb-scroll'),c=e.querySelector('[aria-current]');return e.scrollLeft>0&&c.getBoundingClientRect().right<=e.getBoundingClientRect().right+2});
  assert.ok(await path.locator('[aria-current]').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await scroll.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));
  await page.waitForTimeout(250);
  assert.equal(await scroll.evaluate(e=>e.scrollLeft),0);
  await path.getByRole('button',{name:/SC-101 /}).click();
  await page.waitForFunction(()=>document.querySelector('.eva-task-breadcrumb [aria-current]')?.textContent.includes('SC-101'));
  assert.equal(await path.locator('.semi-breadcrumb-item').count(),2);
  await page.getByRole('button',{name:/打开任务 SC-111 /}).click();
  await page.waitForFunction(()=>document.querySelector('.eva-task-breadcrumb [aria-current]')?.textContent.includes('SC-111'));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1000,height:800});
  await page.waitForFunction(()=>{const e=document.querySelector('.eva-task-breadcrumb-scroll'),c=e.querySelector('[aria-current]'),a=c.getBoundingClientRect(),b=e.getBoundingClientRect();return a.width>b.width?Math.abs(a.left-b.left)<2:a.right<=b.right+2});
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/eva-semi-breadcrumb-verified.png'});
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test('return to parent preserves outgoing width until native leftward scroll finishes',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge'});
 try {
  const page=await browser.newPage({viewport:{width:500,height:900}});
  await page.addInitScript(()=>{
   window.breadcrumbScrolls=[];
   const original=Element.prototype.scrollTo;
   Element.prototype.scrollTo=function(options,...rest){
    if(this.classList.contains('eva-task-breadcrumb-scroll'))window.breadcrumbScrolls.push({from:this.scrollLeft,to:options.left,behavior:options.behavior,count:this.querySelectorAll('.semi-breadcrumb-item').length});
    return original.call(this,options,...rest);
   };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks&evaTask=SC-114`);
  await page.locator('.eva-task-parent-section').waitFor();
  assert.ok((await page.evaluate(()=>window.breadcrumbScrolls)).every(x=>x.behavior==='instant'));
  const originalLeft=await page.locator('.eva-task-breadcrumb-scroll').evaluate(e=>e.scrollLeft);
  await page.evaluate(()=>window.breadcrumbScrolls=[]);
  await page.locator('.eva-task-parent-section .loop-idp__parent-link').click();
  await page.waitForFunction(()=>window.breadcrumbScrolls.some(x=>x.behavior==='smooth'));
  const animation=await page.evaluate(()=>window.breadcrumbScrolls.find(x=>x.behavior==='smooth'));
  assert.ok(Math.abs(animation.from-originalLeft)<2,'start at previous viewport');
  assert.ok(animation.to<animation.from,'animate left toward parent');
  assert.equal(animation.count,6,'outgoing descendant retained during motion');
  await page.waitForFunction(()=>document.querySelectorAll('.eva-task-breadcrumb .semi-breadcrumb-item').length===5);
  const finalLeft=await page.locator('.eva-task-breadcrumb-scroll').evaluate(e=>e.scrollLeft);
  assert.ok(Math.abs(finalLeft-animation.to)<2,'no extra jump after tail removal');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>window.breadcrumbScrolls=[]);
  await page.locator('.eva-task-parent-section .loop-idp__parent-link').click();
  await page.waitForFunction(()=>document.querySelectorAll('.eva-task-breadcrumb .semi-breadcrumb-item').length===4);
  assert.ok((await page.evaluate(()=>window.breadcrumbScrolls)).every(x=>x.behavior==='instant'));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
