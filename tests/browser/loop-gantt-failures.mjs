import {settleMotion} from '../helpers/settle-motion.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：甘特保存失败与并发修改不覆盖共享任务日期',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks`);
  // Fault injection at the existing dependency boundary; production data flow is unchanged.
  await page.evaluate(()=>{
   const original=window.EvaLoopGanttView.render;
   window.ganttFault={fail:true,allowed:true,calls:0};
   window.EvaLoopGanttView.render=(props,deps)=>{
    window.ganttFault.rows=props.issues;
    return original(props,{...deps,canEdit:id=>window.ganttFault.allowed&&deps.canEdit(id),updateIssue:(...args)=>{
     window.ganttFault.calls++;if(window.ganttFault.defer)return new Promise((resolve,reject)=>{window.ganttFault.reject=reject;});return window.ganttFault.fail?Promise.reject(Error('测试保存失败')):deps.updateIssue(...args);
    }});
   };
  });
  await page.locator('.eva-task-view-menu').click();
  await page.locator('.eva-task-enum-menu:visible').getByText('甘特图',{exact:true}).click();
  const view=page.locator('.eva-task-gantt'),row=view.locator('[data-task-id="supply-1"]'),bar=row.locator('.eva-task-gantt__bar-title');
  await view.getByRole('button',{name:'定位 SC-101',exact:true}).click();
  await view.getByRole('button',{name:'月',exact:true}).click();await settleMotion(page);
  const original=await bar.getAttribute('aria-label');
  const drag=async()=>{const b=await bar.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+20,b.y+b.height/2,{steps:4});};
  await drag();await page.mouse.up();await page.getByText('测试保存失败',{exact:true}).waitFor();
  assert.equal(await bar.getAttribute('aria-label'),original,'失败撤回日期预览');
  assert.equal(await page.evaluate(()=>window.ganttFault.calls),1);
  await page.evaluate(()=>{window.ganttFault.fail=false;});
  await drag();
  await page.evaluate(()=>{window.ganttFault.rows.find(row=>row.id==='supply-1').due_date='2026-09-19';});
  await page.mouse.up();await page.getByText('任务日期已更新，请重新调整',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.ganttFault.calls),1,'旧快照不调用写入接口');
  assert.ok((await bar.getAttribute('aria-label')).endsWith('2026-09-07 至 2026-09-19'));
  await drag();await page.evaluate(()=>{window.ganttFault.allowed=false;});
  await page.waitForFunction(()=>!document.querySelector('.eva-task-gantt__resize'));
  await page.mouse.up();assert.equal(await page.evaluate(()=>window.ganttFault.calls),1,'权限撤回取消写入');
  assert.ok((await bar.getAttribute('aria-label')).endsWith('2026-09-07 至 2026-09-19'));
  // Re-enter a fresh view with an outstanding request, then leave before it fails.
  await page.evaluate(()=>{window.ganttFault.allowed=true;window.ganttFault.defer=true;});
  await page.locator('.eva-task-view-menu').click();
  await page.locator('.eva-task-enum-menu:visible').getByText('表格',{exact:true}).click();
  await page.locator('.eva-task-table').waitFor();await settleMotion(page);
  await page.locator('.eva-task-view-menu').click();
  await page.locator('.eva-task-enum-menu:visible').getByText('甘特图',{exact:true}).click();await settleMotion(page);
  await drag();await page.mouse.up();
  await page.waitForFunction(()=>typeof window.ganttFault.reject==='function');
  await page.locator('.eva-task-view-menu').click();
  await page.locator('.eva-task-enum-menu:visible').getByText('表格',{exact:true}).click();
  await page.evaluate(()=>window.ganttFault.reject(Error('迟到的保存失败')));await settleMotion(page);
  assert.equal(await page.getByText('迟到的保存失败',{exact:true}).count(),0,'旧视图迟到错误不污染当前表格');
  assert.equal(await page.locator('.eva-task-table').count(),1);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
