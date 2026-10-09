import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
async function run(flow){
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{await flow(page,`http://127.0.0.1:${server.address().port}`);assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>server.close(r));}
}
test('子区创建公共表单空提交、Enter保存、重新读取',()=>run(async(page,origin)=>{
 await page.goto(origin+'/#/messages');await page.locator('.ch-list').getByText('采购与招投标',{exact:true}).click();
 await page.locator('.ch-head').getByRole('button',{name:'子区',exact:true}).click();await page.getByRole('button',{name:'新建子区',exact:true}).click();
 const dialog=page.locator('.eva-thread-create-dialog .semi-modal-content');
 await dialog.locator('button[type=submit]').click();await dialog.locator('[aria-invalid=true]').waitFor();
 await dialog.locator('input').fill('表单回归子区');await dialog.locator('input').press('Enter');await dialog.waitFor({state:'hidden'});
 await page.reload();await page.locator('.ch-list').getByText('表单回归子区',{exact:true}).waitFor();
}));
test('转发内新建子区用公共表单，提交不关闭父转发面板',()=>run(async(page,origin)=>{
 await page.goto(origin+'/#/messages');await page.locator('.ch-list').getByText('采购与招投标',{exact:true}).click();await page.locator('.eva-im-bubble-row').first().click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('转发',{exact:true}).click();
 await page.locator('.eva-fp-candidates .eva-fp-row-wrap').filter({hasText:'采购与招投标'}).locator('input[type=checkbox]').check();
 await page.locator('.eva-fp-selected--group .eva-fp-row-toggle').click();await page.locator('.eva-fp-picker-control').click();await page.locator('.eva-fp-picker-new-btn').click();
 const modal=page.locator('.eva-fp-modal');await modal.locator('.eva-fp-picker-new').getByRole('button',{name:'确定',exact:true}).click();await modal.getByText('请输入子区名称',{exact:true}).waitFor();
 const name=modal.getByRole('textbox',{name:'新子区名称',exact:true});await name.fill('转发内表单回归');await name.press('Enter');await modal.locator('.eva-fp-picker-new').waitFor({state:'hidden'});await modal.locator('.eva-fp-picker-option').filter({hasText:'转发内表单回归'}).waitFor();
}));
test('我的AI会话重命名空提交、Enter保存及刷新读取',()=>run(async(page,origin)=>{
 await page.goto(origin+'/#/messages?evaIM=my-ai');
 await page.locator('.eva-ai-team__team-thread-row,.eva-ai-team__session-row').filter({has:page.getByRole('button',{name:/^会话操作 /})}).first().hover();
 await page.getByRole('button',{name:/^会话操作 /}).first().click();await page.getByRole('menuitem',{name:'重命名',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'重命名会话',exact:true}),field=dialog.getByRole('textbox');
 assert.equal(await dialog.locator('.semi-form-field-label-required').count(),0,'单字段重命名不显示星号');
 await field.fill('');await dialog.getByRole('button',{name:'保存',exact:true}).click();await dialog.getByText('请输入会话名称',{exact:true}).waitFor();
 await field.fill('会话重命名回归');await field.press('Enter');await dialog.waitFor({state:'hidden'});
 await page.reload();await page.getByRole('button',{name:'会话操作 会话重命名回归',exact:true}).waitFor();
}));
