import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

function assertInsets({left,right,label}){assert.ok(Math.abs(left-right)<=1,`${label}: left ${left}px / right ${right}px`);}
async function geometry(scroll){
 return scroll.evaluate(container=>{
  const box=container.getBoundingClientRect(),left=box.left+container.clientLeft,right=left+container.clientWidth;
  return [...container.querySelectorAll('.eva-follow-category-title,.eva-follow-channel > .wk-conv-compact-item,.wk-conversationlist-item')].map(row=>{const r=row.getBoundingClientRect();return {label:row.textContent.trim().slice(0,30),left:r.left-left,right:right-r.right};});
 });
}
test('list insets: scrollbar-independent symmetry, controls and interaction across rail widths',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{}),page=await browser.newPage({viewport:{width:1200,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 try{
  await page.goto(origin+'/#/messages');const scroll=page.locator('.ch-list__scroll');await page.locator('.eva-follow-category').first().waitFor();
  const group=page.locator('.eva-follow-category').filter({hasText:'供应链运营协同'}).first(),row=group.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first(),toggle=row.locator('.wk-conv-compact-thread-toggle'),jump=group.locator('.eva-space-task-button');
  async function controlGeometry(){return toggle.evaluate(n=>{const r=n.getBoundingClientRect(),i=n.querySelector('svg').getBoundingClientRect();return {x:r.x+r.width/2,dx:r.x+r.width/2-i.x-i.width/2,dy:r.y+r.height/2-i.y-i.height/2,transform:getComputedStyle(n).transform};});}
  for(const width of [220,260,480]){
   await page.evaluate(w=>document.documentElement.style.setProperty('--eva-conversation-rail-current',w+'px'),width);
   for(const mode of ['hidden','scroll']){
    await page.locator('.eva-list-scroll-content').evaluate((n,m)=>{n.style.maxHeight=m==='hidden'?'80px':'';n.style.overflow=m==='hidden'?'hidden':'';},mode);await page.waitForTimeout(100);
    const fullRail=await scroll.evaluate(n=>{const rail=n.closest('.ch-list'),r=rail.getBoundingClientRect(),s=n.getBoundingClientRect();return Math.abs(s.x-r.x-rail.clientLeft)<=1&&Math.abs(s.width-rail.clientWidth)<=1;});assert.ok(fullRail,'scroll content spans entire visible rail');
    const gutter=await scroll.evaluate(n=>n.offsetWidth-n.clientWidth);assert.equal(gutter,0,`${mode} fixture must exercise scrollbar presence: ${gutter}`);
    const rows=await geometry(scroll);assert.ok(rows.length>20,'real preset hierarchy must be covered');rows.forEach(assertInsets);
    if(mode==='hidden'){assert.equal(await page.locator('.eva-list-scroll-thumb').count(),0);continue;}
    assert.equal(await page.locator('.eva-list-scroll-thumb').count(),1);
    await row.scrollIntoViewIfNeeded();const before=await row.boundingBox(),control=await controlGeometry();assert.ok(Math.abs(control.dx)<=1&&Math.abs(control.dy)<=1,'glyph centered');
    const j=await jump.boundingBox();assert.ok(Math.abs(control.x-j.x-j.width/2)<=1,'project and expansion controls share right center');
    for(const action of [()=>row.hover(),()=>toggle.hover(),()=>row.click(),()=>toggle.click(),()=>toggle.click()]){
     await action();const after=await row.boundingBox();assert.ok(Math.abs(before.x-after.x)<=1&&Math.abs(before.width-after.width)<=1,'states preserve row bounds');const c=await controlGeometry();assert.ok(Math.abs(c.x-control.x)<=1,'states preserve control alignment');assert.equal(c.transform,'none','no rotation');(await geometry(scroll)).forEach(assertInsets);
    }
    console.log(`verified ${width}px, scrollbar ${mode}, ${rows.length} hierarchy rows`);
   }
  }
  await page.locator('.wk-sidebar-tabbar__btn').filter({hasText:'最近'}).click();await page.locator('.wk-conversationlist-item').first().waitFor();
  for(const width of [220,260,480]){await page.evaluate(w=>document.documentElement.style.setProperty('--eva-conversation-rail-current',w+'px'),width);const recentRows=await geometry(scroll);assert.ok(recentRows.length>0);recentRows.forEach(assertInsets);console.log(`verified recent ${width}px, ${recentRows.length} rows`);}
  await scroll.hover();await page.waitForTimeout(1500);assert.equal(await page.locator('.eva-list-scroll-track').evaluate(n=>getComputedStyle(n).opacity),'0','idle scrollbar hides');await scroll.evaluate(n=>n.scrollTop=150);await page.waitForTimeout(180);assert.equal(await page.locator('.eva-list-scroll-track').evaluate(n=>getComputedStyle(n).opacity),'1','scroll reveals scrollbar');
  await scroll.evaluate(n=>n.scrollTop=0);await page.waitForTimeout(50);const thumb=page.locator('.eva-list-scroll-thumb');const box=await thumb.boundingBox();await page.mouse.move(box.x+3,box.y+5);await page.mouse.down();await page.waitForTimeout(1500);assert.equal(await page.locator('.eva-list-scroll-track').evaluate(n=>getComputedStyle(n).opacity),'1','drag stays visible');await page.mouse.move(box.x+3,box.y+80);await page.mouse.up();assert.ok(await scroll.evaluate(n=>n.scrollTop)>0,'thumb dragging scrolls real list');
  // Prove the checker detects a real browser-layout regression rather than always passing.
  await scroll.evaluate(n=>n.style.paddingRight='14px');const broken=await geometry(scroll);assert.throws(()=>broken.forEach(assertInsets),/left .*right/);await scroll.evaluate(n=>n.style.paddingRight='');
  await page.locator('[data-eva-nav-id="projects"]').click();await page.locator('[data-eva-nav-id="messages"]').click();await page.locator('.eva-follow-category').first().waitFor();(await geometry(page.locator('.ch-list__scroll'))).forEach(assertInsets);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
