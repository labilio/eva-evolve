import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('授权身份卡保留现有几何，取消不授权，确认后可撤销',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge'});
 try {
  const page=await browser.newPage({viewport:{width:1200,height:900}});
  page.setDefaultTimeout(10000);
  await page.goto(`http://127.0.0.1:${server.address().port}/#/messages`);
  await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();
  await page.getByRole('button',{name:'打开聊天信息',exact:true}).last().click();
  const panel=page.locator('.eva-chat-settings');
  await panel.getByRole('button',{name:/^查看全部/}).click();
  const grant=panel.getByRole('button',{name:/^设为 AI 管理员 /}).first();
  const identityName=(await grant.getAttribute('aria-label')).replace(/^设为 AI 管理员 /,'');
  const row=panel.locator('.eva-chat-member-list-row').filter({hasText:identityName});
  await row.hover();await grant.click();
  const dialog=page.getByRole('dialog',{name:'设为 AI 管理员',exact:true});
  const card=dialog.locator('.eva-ai-admin-grant-identity');
  await card.waitFor();
  await page.evaluate(()=>Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
  assert.equal(await card.evaluate(e=>e.classList.contains("semi-card")),true,"使用公共 Semi Card");
  const metrics=await card.evaluate(e=>{
   const body=e.querySelector('.semi-card-body'),host=e.parentElement;
   const s=getComputedStyle(e),b=getComputedStyle(body),r=e.getBoundingClientRect(),h=host.getBoundingClientRect();
   return {radius:s.borderRadius,border:s.borderTopWidth,padding:[b.paddingTop,b.paddingRight,b.paddingBottom,b.paddingLeft],left:r.left-h.left,right:h.right-r.right};
  });
  assert.deepEqual(metrics,{radius:'8px',border:'0px',padding:['16px','16px','16px','16px'],left:0,right:0});
  assert.equal(await dialog.getByRole('listitem').count(),3);
  const list=dialog.locator('.eva-info-list.semi-list');
  const composition=await dialog.evaluate(e=>{
   const card=e.querySelector('.eva-ai-admin-grant-identity'),list=e.querySelector('.eva-info-list'),caption=e.querySelector('.eva-content-section-description');
   if(!caption)return null;
   const c=card.getBoundingClientRect(),l=list.getBoundingClientRect(),d=caption.getBoundingClientRect();
   return {cardToDescription:d.top-c.bottom,descriptionToList:l.top-d.bottom,left:d.left-c.left,listLeft:l.left-c.left,right:c.right-l.right,captionMargin:getComputedStyle(caption).margin,footerMargin:getComputedStyle(e.querySelector('.semi-modal-footer')).marginTop};
  });
  assert.deepEqual(composition,{cardToDescription:20,descriptionToList:12,left:0,listLeft:0,right:0,captionMargin:'0px',footerMargin:'0px'});
  const compositionTokens=await dialog.locator('.eva-content-stack').evaluate(e=>{
   e.style.setProperty('--eva-space-5','28px');e.style.setProperty('--eva-space-3','16px');
   const card=e.querySelector('.eva-card'),caption=e.querySelector('.eva-content-section-description'),list=e.querySelector('.eva-info-list');
   const result={outer:caption.getBoundingClientRect().top-card.getBoundingClientRect().bottom,inner:list.getBoundingClientRect().top-caption.getBoundingClientRect().bottom};
   e.style.removeProperty('--eva-space-5');e.style.removeProperty('--eva-space-3');return result;
  });
  assert.deepEqual(compositionTokens,{outer:28,inner:16});


  assert.equal(await list.locator('ul > li').count(),3,'原生 Semi 列表语义');
  const listMetrics=await list.evaluate(e=>{
   const items=[...e.querySelectorAll('li')],icon=e.querySelector('.eva-info-list-icon'),title=e.querySelector('.eva-info-list-title');
   return {padding:getComputedStyle(items[0]).padding,gap:items[1].getBoundingClientRect().top-items[0].getBoundingClientRect().bottom,
    radius:getComputedStyle(icon).borderRadius,weight:getComputedStyle(title).fontWeight,focusable:e.querySelectorAll('button,a,input,[tabindex]').length};
  });
  assert.deepEqual(listMetrics,{padding:'0px',gap:20,radius:'8px',weight:'500',focusable:0});
  const tokenMetrics=await list.evaluate(e=>{
   e.style.setProperty('--eva-space-5','28px');e.style.setProperty('--eva-radius-control','12px');
   const value={gap:getComputedStyle(e.querySelector('ul')).gap,radius:getComputedStyle(e.querySelector('.eva-info-list-icon')).borderRadius};
   e.style.removeProperty('--eva-space-5');e.style.removeProperty('--eva-radius-control');return value;
  });
  assert.deepEqual(tokenMetrics,{gap:'28px',radius:'12px'});

  await page.screenshot({path:process.env.EVA_CARD_SCREENSHOT||'/tmp/eva-card-composition.png'});
  const linked=await card.evaluate(e=>{
   e.style.setProperty('--eva-radius-control','12px');e.style.setProperty('--eva-space-4','24px');e.style.setProperty('--eva-surface-subtle','rgb(30, 40, 50)');
   const result={radius:getComputedStyle(e).borderRadius,padding:getComputedStyle(e.querySelector('.semi-card-body')).paddingTop,background:getComputedStyle(e).backgroundColor};
   for(const name of ['--eva-radius-control','--eva-space-4','--eva-surface-subtle'])e.style.removeProperty(name);
   return result;
  });
  assert.deepEqual(linked,{radius:'12px',padding:'24px',background:'rgb(30, 40, 50)'},'公共 token 改变后卡片跟随，不被业务写死值截断');

  await dialog.getByRole('button',{name:'取消',exact:true}).click();
  await dialog.waitFor({state:'hidden'});assert.equal(await grant.count(),1);
  await row.hover();await grant.click();await dialog.getByRole('button',{name:'确认授权',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  const revoke=row.getByRole('button',{name:/^取消 AI 管理员 /});await row.hover();await revoke.click();
  assert.equal(await grant.count(),1);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
