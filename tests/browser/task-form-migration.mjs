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
 await save.click();await modal.waitFor({state:'hidden'});
 await page.getByText('统一表单任务验收',{exact:true}).first().waitFor();
 }finally{await page.close();await new Promise(r=>server.close(r));}
}finally{await browser.close();}

});
