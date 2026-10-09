import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
test('真实新建项目：混合字段原生星号、空提交拦截、选填留空提交',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});
 try{
 await page.goto(`http://127.0.0.1:${server.address().port}/#/collab`);
 await page.getByRole('button',{name:'新建项目',exact:true}).click();
 const dialog=page.getByRole('dialog').filter({hasText:'新建项目'});
 assert.deepEqual(await dialog.locator('.semi-form-field-label-required').allTextContents(),['项目名称','项目成员']);
 const save=dialog.getByRole('button',{name:'创建并进入项目',exact:true});await save.click();
 await dialog.getByText('请输入项目名称',{exact:true}).waitFor();
 await dialog.getByText('请至少选择 1 位项目成员',{exact:true}).waitFor();
 assert.notEqual(await dialog.getByRole('textbox',{name:'共同目标',exact:true}).getAttribute('aria-invalid'),'true');
 await dialog.locator('#eva-project-name').fill('必填标记验收');
 await dialog.locator('.eva-member-picker__candidate').first().click();
 await page.screenshot({path:'.local/dialog-review/report/project-required-after.png'});
 await save.click();await dialog.waitFor({state:'hidden'});
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
