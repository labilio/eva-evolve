import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
test('真实任务弹窗：标签及日期 Escape 只关闭当前浮层，第二次才关闭弹窗',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});page.setDefaultTimeout(3000);
 try{await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks`);
 for(const kind of ['tag','date']){await page.getByRole('button',{name:'新建任务',exact:true}).click();const d=page.getByRole('dialog',{name:'新建任务',exact:true});
 const trigger=kind==='tag'?d.getByRole('textbox',{name:'添加或编辑任务标签',exact:true}):d.getByRole('button',{name:'截止日期',exact:true});await trigger.click();
 const panel=page.locator(kind==='tag'?'.eva-loop-task-create__tag-menu':'.eva-loop-task-date-panel');await panel.waitFor();await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});assert.equal(await d.isVisible(),true);await page.keyboard.press('Escape');await d.waitFor({state:'hidden'});
 }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
