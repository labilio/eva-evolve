import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
import {settleMotion} from '../helpers/settle-motion.mjs';

test('Edge：甘特行排序支持鼠标、键盘和取消，保持任务日期',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks`);
  await page.locator('.eva-task-view-menu').click();
  await page.locator('.eva-task-enum-menu:visible').getByText('甘特图',{exact:true}).click();
  const view=page.locator('.eva-task-gantt'),rows=view.locator('[data-task-id]');
  const order=()=>rows.evaluateAll(nodes=>nodes.slice().sort((a,b)=>parseFloat(a.style.top)-parseFloat(b.style.top)).map(node=>node.dataset.taskId));
  const before=await order();assert.ok(before.length>=3);
  const first=view.locator(`[data-task-id="${before[0]}"]`),second=view.locator(`[data-task-id="${before[1]}"]`);
  const duration=await first.locator('.eva-task-gantt__duration').innerText();
  const handle=first.locator('.eva-task-gantt__reorder');
  await handle.focus();await page.keyboard.press('Space');
  await first.locator('.eva-task-gantt__reorder[aria-pressed="true"]').waitFor();
  await page.keyboard.press('ArrowDown');
  await settleMotion(page);await page.keyboard.press('Space');
  await page.waitForFunction(id=>document.querySelector(`[data-task-id="${id}"]`)?.style.top==='44px',before[0]);
  assert.deepEqual((await order()).slice(0,2),[before[1],before[0]]);
  assert.equal(await first.locator('.eva-task-gantt__duration').innerText(),duration);
  await settleMotion(page);
  assert.equal(await handle.evaluate(node=>document.activeElement===node),true,'排序保存后焦点留在同一任务手柄');
  await page.keyboard.press('Space');await first.locator('.eva-task-gantt__reorder[aria-pressed="true"]').waitFor();await page.keyboard.press('ArrowUp');await settleMotion(page);await page.keyboard.press('Escape');
  await settleMotion(page);assert.deepEqual((await order()).slice(0,2),[before[1],before[0]],'Escape不保存顺序');
  const a=await handle.boundingBox(),b=await second.locator('.eva-task-gantt__reorder').boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();
  await page.waitForFunction(id=>document.querySelector(`[data-task-id="${id}"]`)?.style.top==='0px',before[0]);
  assert.deepEqual((await order()).slice(0,3),before.slice(0,3));
  assert.equal(await first.locator('.eva-task-gantt__duration').innerText(),duration);
  const scrollStable=()=>view.locator('.eva-task-gantt__scroll').evaluate(node=>new Promise(resolve=>{
   let previous=node.scrollTop,stable=0;
   const tick=()=>{const current=node.scrollTop;stable=current===previous?stable+1:0;previous=current;if(stable>=6)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);
  }));
  await handle.focus();await page.keyboard.press('Space');
  await first.locator('.eva-task-gantt__reorder[aria-pressed="true"]').waitFor();
  // DndKit uses a key press to scroll when the target reaches the viewport edge.
  // Wait for native smooth scrolling before sending the next deliberate step.
  for(let index=0;index<45&&!(await page.getByText('移动到第 21 行',{exact:true}).count());index++){
   await page.keyboard.press('ArrowDown');await settleMotion(page);
   await scrollStable();
  }
  await page.keyboard.press('Space');await settleMotion(page);
  assert.equal(await first.evaluate(node=>node.style.top),'880px','键盘排序能够跨出初始可视区');
  assert.equal(await handle.evaluate(node=>document.activeElement===node),true,'跨屏排序仍保留同一任务焦点');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
