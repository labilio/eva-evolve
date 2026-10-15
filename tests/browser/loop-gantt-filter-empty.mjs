import {settleMotion} from '../helpers/settle-motion.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：甘特真实筛选无结果，清除后恢复任务与原视图位置',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks`);
  await page.locator('.eva-task-view-menu').click();await page.getByRole('menuitem',{name:'甘特图',exact:true}).click();
  const view=page.locator('.eva-task-gantt');await view.waitFor();
  await view.getByRole('button',{name:'月',exact:true}).click();await settleMotion(page);
  const position=()=>view.locator('[data-task-id="supply-1"] .eva-task-gantt__bar').evaluate(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y};});
  const before=await position();
  await page.locator('.loop-toolbtn').filter({hasText:'筛选'}).click();
  const panel=page.locator('.loop-filter-panel');
  for(const [name,option] of [['状态','已取消'],['优先级','紧急']]){
   await panel.locator('.loop-fields__row').filter({has:page.locator('.loop-fields__label',{hasText:new RegExp('^'+name+'$')})}).locator('.semi-select').click();
   await page.locator('.semi-select-option-list:visible').getByRole('option',{name:option,exact:true}).click();
   await panel.locator('.loop-filter-panel__head').click();
  }
  await page.locator('.loop-empty').getByText('没有匹配的任务',{exact:true}).waitFor();
  assert.equal(await page.getByText('创建第一个任务，开始跟踪你的工作。',{exact:true}).count(),0);
  assert.equal(await view.locator('.eva-task-gantt__row').count(),0);
  assert.match(await page.locator('.eva-task-filter-chips').innerText(),/已取消/);
  await panel.locator('.loop-filter-panel__clear').click();
  await view.locator('[data-task-id="supply-1"]').waitFor();await settleMotion(page);
  assert.equal(await view.getByRole('button',{name:'月',exact:true}).getAttribute('aria-pressed'),'true');
  assert.deepEqual(await position(),before,'恢复可视日期与任务位置，允许时间轴重建改变内部滚动像素');
  assert.equal(await page.locator('.eva-task-filter-chip').count(),0);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
