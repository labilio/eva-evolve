import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
test('任务表单空提交聚焦、修正后创建',async()=>{
const browser=await chromium.launch({channel:'msedge'});
try{
 const dir=new URL('../../dist',import.meta.url).pathname;
 const server=createServer(dir);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const page=await browser.newPage({viewport:{width:1200,height:800}});page.setDefaultTimeout(10000);
 try{
 await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks`);
 await page.getByRole('button',{name:'新建任务',exact:true}).click();
 const modal=page.locator('.eva-loop-task-create .semi-modal-content');
 await modal.waitFor();
 await page.waitForTimeout(350);
 const save=modal.getByRole('button',{name:'创建',exact:true});
 await save.click();await modal.getByText('请填写任务标题',{exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelector('textarea[aria-label="任务标题"]')===document.activeElement);
 assert.equal(await modal.getByRole('textbox',{name:'任务标题',exact:true}).evaluate(el=>getComputedStyle(el).boxShadow),'none');
 await modal.getByRole('textbox',{name:'任务标题',exact:true}).fill('统一表单任务验收');
 await modal.getByRole('textbox',{name:'任务描述',exact:true}).fill('保留原有排版');
 const toolbar=modal.locator('.loop-ci__toolbar');
 assert.equal(await toolbar.getByRole('button',{name:'开始日期',exact:true}).count(),1);
 await toolbar.getByRole('button',{name:'开始日期',exact:true}).click();
 const panel=page.locator('.eva-loop-task-date-panel:visible');
 const start=panel.locator('.semi-datepicker-day[aria-label$="-20"]').first();
 const startDay=await start.getAttribute('aria-label');await start.click();
 await toolbar.getByRole('button',{name:'截止日期',exact:true}).click();
 await panel.locator('.semi-datepicker-day[aria-label$="-10"]').first().click();
 await save.click();
 await modal.getByText('开始日期不能晚于截止日期',{exact:true}).waitFor();
 assert.equal(await modal.isVisible(),true,'倒置排期不创建任务');
 await toolbar.getByRole('button',{name:'清除截止日期',exact:true}).click();
 await toolbar.getByRole('button',{name:'截止日期',exact:true}).click();
 await panel.locator(`.semi-datepicker-day[aria-label="${startDay}"]`).click();
 const geometry=await toolbar.evaluate(node=>{const p=node.getBoundingClientRect();return [...node.children].every(child=>{const r=child.getBoundingClientRect();return r.left>=p.left&&r.right<=p.right+1&&r.bottom<=p.bottom+1;});});
 assert.equal(geometry,true,'五个控件始终由工具栏容纳，不溢出');
 await save.click();await modal.waitFor({state:'hidden'});
 await page.getByText('统一表单任务验收',{exact:true}).first().waitFor();
 await page.locator('.eva-task-view-menu').click();
 await page.locator('.eva-task-enum-menu:visible').getByText('甘特图',{exact:true}).click();
 const scroll=page.locator('.eva-task-gantt__scroll');
 await scroll.evaluate(node=>{node.scrollTop=node.scrollHeight;});
 const newRow=page.locator('.eva-task-gantt__row').filter({has:page.getByRole('button',{name:/统一表单任务验收/})});
 await newRow.waitFor();
 assert.equal(await newRow.locator('.eva-task-gantt__duration').innerText(),'1 天','甘特图读取创建表单保存的起止日期');
 assert.ok((await newRow.locator('.eva-task-gantt__bar-title').getAttribute('aria-label')).endsWith(`${startDay} 至 ${startDay}`));
 await page.locator('.eva-task-gantt').getByRole('button',{name:'新建任务',exact:true}).click();
 await modal.waitFor();
 const defaults=await page.evaluate(()=>{const start=window.EvaTaskTime.todayDate();return [start,window.EvaTaskTime.addCalendarDays(start,1)];});
 assert.equal(await modal.getByRole('button',{name:'开始日期：'+defaults[0],exact:true}).count(),1);
 assert.equal(await modal.getByRole('button',{name:'截止日期：'+defaults[1],exact:true}).count(),1);
 await modal.getByRole('button',{name:'取消',exact:true}).click();
 }finally{await page.close();await new Promise(r=>server.close(r));}
}finally{await browser.close();}

});
