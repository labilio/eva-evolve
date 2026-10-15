import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：看板标签自适应、完整提示、视图返回与亮暗模式',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge'});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks');
  const card=id=>page.locator('.loop-board .loop-card',{hasText:id});
  const row=id=>card(id).locator('.eva-task-label-fit');
  await row('SC-104').waitFor();
  await page.waitForFunction(()=>document.querySelector('.eva-task-label-fit > .eva-task-label-chip'));
  const check=async()=>{
   const violations=await page.locator('.eva-task-label-fit').evaluateAll(rows=>rows.flatMap(row=>{
    const box=row.getBoundingClientRect(),chips=[...row.children].filter(n=>n.classList.contains('eva-task-label-chip'));
    const assignee=row.closest('.loop-card__foot').querySelector('.eva-issue-assignee').getBoundingClientRect();
    return chips.filter(chip=>chip.getBoundingClientRect().right>box.right+1||chip.getBoundingClientRect().right>assignee.left).map(chip=>chip.textContent);
   }));assert.deepEqual(violations,[],'标签和数量标记均完整位于标签区域，未挤占负责人');
  };
  await check();
  const complete=row('SC-116').locator(':scope > .eva-task-label-chip').filter({hasText:'供应商'});
  await complete.hover();
  await page.waitForTimeout(600);
  assert.equal(await page.getByRole('tooltip').count(),0,'完整标签不重复提示');
  await page.mouse.move(10,10);
  const long=row('SC-105').locator(':scope > .eva-task-label-chip').first();
  assert.equal(await long.textContent(),'跨工厂产能与物料齐套联合评审');
  assert.ok(await long.evaluate(el=>el.scrollWidth>el.clientWidth),'长标签实际省略');
  assert.ok(await row('SC-105').evaluate(el=>{const more=el.querySelector(':scope > .eva-task-label-chip--overflow');return Math.abs(more.getBoundingClientRect().right-(el.getBoundingClientRect().right-16))<2;}),'长标签用满可用区域，数量提示右侧对齐标签区域边界');
  await long.hover();
  await page.locator('.semi-tooltip-wrapper-show',{hasText:'跨工厂产能与物料齐套联合评审'}).waitFor();
  await page.keyboard.press('Escape');
  const more=row('SC-105').locator(':scope > .eva-task-label-chip--overflow');
  await page.mouse.move(10,10);
  await more.focus();
  const hiddenNames=(await more.getAttribute('aria-label')).split('：')[1];
  await page.getByRole('tooltip').filter({hasText:hiddenNames}).waitFor();
  await page.keyboard.press('Escape');
  // Change available width, not task data: fitting count must recompute in both directions.
  await row('SC-104').evaluate(el=>el.parentElement.style.maxWidth='90px');
  await page.waitForFunction(()=>[...document.querySelectorAll('.loop-card')].find(n=>n.textContent.includes('SC-104')).querySelector('.eva-task-label-fit > .eva-task-label-chip--overflow')?.textContent==='+2');
  await check();
  await row('SC-104').evaluate(el=>el.parentElement.style.maxWidth='');
  await page.waitForFunction(()=>!([...document.querySelectorAll('.loop-card')].find(n=>n.textContent.includes('SC-104')).querySelector('.eva-task-label-fit > .eva-task-label-chip--overflow')));
  await page.screenshot({path:'/tmp/eva-label-overflow-light.png'});
  await page.evaluate(()=>window.EvaTheme.apply('dark'));
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await check();await page.screenshot({path:'/tmp/eva-label-overflow-dark.png'});
  await page.evaluate(()=>window.EvaTheme.apply('light'));
  await page.setViewportSize({width:1000,height:800});await check();
  await card('SC-105').locator('.loop-card__title').click();
  await page.locator('.loop-idp').waitFor();
  assert.ok(await page.locator('.loop-idp').getByText('跨工厂产能与物料齐套联合评审',{exact:true}).count());
  await page.keyboard.press('Escape');
  await page.locator('.loop-idp').waitFor({state:'hidden'});
  await page.locator('[data-eva-nav-id="contacts"]').click();
  await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks');
  await row('SC-105').waitFor();await check();
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
