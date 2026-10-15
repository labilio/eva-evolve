import {settleMotion} from '../helpers/settle-motion.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：单日期任务补齐边界与清空共享排期',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks`);
  await page.locator('.eva-task-view-menu').click();
  await page.locator('.eva-task-enum-menu:visible').getByText('甘特图',{exact:true}).click();
  const view=page.locator('.eva-task-gantt'),row=view.locator('[data-task-id="supply-1"]');
  await view.getByRole('button',{name:'定位 SC-101',exact:true}).click();
  const clear=async label=>{
   await row.locator('.eva-task-gantt__duration').click();
   const editor=page.getByRole('dialog',{name:'任务日期'});
   await editor.getByRole('button',{name:label,exact:true}).click();
   await page.getByRole('button',{name:'无'+label,exact:true}).click();
   await page.keyboard.press('Escape');await editor.waitFor({state:'hidden'});await settleMotion(page);
  };
  const resize=async(edge,dx)=>{
   const box=await row.locator(edge).boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2,{steps:5});await page.mouse.up();await settleMotion(page);
  };
  await clear('开始日期');
  // Keep resize checks away from the edge auto-scroll zone (tested separately).
  const halfBox=await row.locator('.eva-task-gantt__bar').boundingBox();
  const viewport=await view.locator('.eva-task-gantt__scroll').boundingBox();
  await view.locator('.eva-task-gantt__scroll').evaluate((node,delta)=>{node.scrollLeft+=delta;},halfBox.x+halfBox.width/2-(viewport.x+360+(viewport.width-360)/2));await settleMotion(page);
  assert.equal(await row.locator('.is-missing-start').count(),1);
  assert.equal(await row.locator('.eva-task-gantt__duration').innerText(),'未设置');
  assert.ok((await row.locator('.eva-task-gantt__bar-title').getAttribute('aria-label')).endsWith('未设置开始日期 至 2026-09-18'));
  await resize('.is-left',-60);
  assert.equal(await row.locator('.is-missing-start').count(),0);
  assert.ok((await row.locator('.eva-task-gantt__bar-title').getAttribute('aria-label')).endsWith('2026-09-17 至 2026-09-18'));
  await clear('截止日期');
  assert.equal(await row.locator('.is-missing-due').count(),1);
  await resize('.is-right',60);
  assert.ok((await row.locator('.eva-task-gantt__bar-title').getAttribute('aria-label')).endsWith('2026-09-17 至 2026-09-18'));
  await clear('开始日期');await clear('截止日期');
  assert.equal(await row.locator('.eva-task-gantt__bar').count(),0);
  assert.equal(await row.locator('.eva-task-gantt__duration').innerText(),'未设置');
  for(const [label,days] of [['周',1],['月',1],['季度',7]]){
   await view.getByRole('button',{name:label,exact:true}).click();await settleMotion(page);
   const scrollBox=await view.locator('.eva-task-gantt__scroll').boundingBox();
   const rowBox=await row.boundingBox();
   await page.mouse.move(scrollBox.x+600,rowBox.y+rowBox.height/2);await settleMotion(page);
   const plus=row.locator('.eva-task-gantt__schedule');
   const start=(await plus.getAttribute('aria-label')).match(/\d{4}-\d{2}-\d{2}/)[0];
   const due=new Date(Date.parse(start)+days*86400000).toISOString().slice(0,10);
   await plus.click();await settleMotion(page);
   assert.ok((await row.locator('.eva-task-gantt__bar-title').getAttribute('aria-label')).endsWith(`${start} 至 ${due}`),label+'鼠标排期使用选中日期和原版默认跨度');
   await clear('开始日期');await clear('截止日期');
  }
  await row.locator('.eva-task-gantt__task').click();
  const detail=page.locator('.eva-task-outlet [role="dialog"]');await detail.waitFor();
  await detail.getByRole('button',{name:'开始日期',exact:true}).click();
  const day=page.locator('.eva-loop-task-date-panel:visible .semi-datepicker-day[aria-label$="-15"]').first();
  const selected=await day.getAttribute('aria-label');await day.click();
  await detail.getByRole('button',{name:'关闭任务详情',exact:true}).click();await detail.waitFor({state:'hidden'});
  assert.ok((await row.locator('.eva-task-gantt__bar-title').getAttribute('aria-label')).endsWith(`${selected} 至 未设置截止日期`),'详情开始日期写回同一甘特任务');
  for(const label of ['看板','层级','表格']){
   await page.locator('.eva-task-view-menu').click();
   await page.locator('.eva-task-enum-menu:visible').getByText(label,{exact:true}).click();await settleMotion(page);
   if(label==='看板')await page.locator('.loop-board .loop-card',{hasText:'SC-101'}).click();
   else if(label==='层级')await page.getByRole('button',{name:'SC-101 完成本季度间接采购需求归集',exact:true}).click();
   else await page.locator('.eva-task-table__row',{hasText:'SC-101'}).locator('.eva-task-table__title-btn').click();
   await detail.waitFor();
   assert.equal((await detail.getByRole('button',{name:'开始日期',exact:true}).innerText()).trim(),selected.slice(5),label+'详情读取同一开始日期');
   assert.equal((await detail.getByRole('button',{name:'截止日期',exact:true}).innerText()).trim(),'截止日期',label+'详情保留清空的截止日期');
   await detail.getByRole('button',{name:'关闭任务详情',exact:true}).click();await detail.waitFor({state:'hidden'});
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
