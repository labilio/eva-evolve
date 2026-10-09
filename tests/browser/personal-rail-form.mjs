import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('个人分组重命名与对话移动：原位置 Form、空提交、重名、保存、重开及草稿保留',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/#/guid`);
  const composer=page.locator('.eva-composer-prompt');await composer.fill('迁移表单不影响草稿');
  const folder=page.locator('[data-eva-folder-menu]:not([data-eva-folder-menu=""])').first(),folderId=await folder.getAttribute('data-eva-folder-menu');
  await folder.locator('..').hover();await folder.click();await page.getByRole('menuitem',{name:'重命名',exact:true}).click();
  const form=page.locator('.eva-personal-rail-form'),name=form.locator('#eva-rail-name');
  await name.fill('  ');await name.press('Enter');await form.getByText('请输入文件夹名称',{exact:true}).waitFor();
  assert.equal(await name.getAttribute('aria-invalid'),'true');
  await name.fill('最近');await form.getByText('已有同名文件夹',{exact:true}).waitFor();
  await name.fill('表单分组验收');await name.press('Enter');await form.waitFor({state:'hidden'});
  assert.equal(await composer.inputValue(),'迁移表单不影响草稿');
  assert.equal(await page.evaluate(id=>window.EvaPersonal.getSnapshot().folders.find(f=>f.id===id).name,folderId),'表单分组验收');
  const row=page.locator('[data-eva-personal-conversation-id]').first(),id=await row.getAttribute('data-eva-personal-conversation-id');
  await row.click({button:'right'});await name.fill('');await form.getByRole('button',{name:'保存'}).click();await form.getByText('请输入对话名称',{exact:true}).waitFor();
  await name.fill('会话表单验收');await form.getByRole('combobox',{name:'移至文件夹'}).click();await page.locator('.semi-select-option').filter({hasText:/^表单分组验收$/}).click();
  await form.getByRole('button',{name:'保存'}).click();await form.waitFor({state:'hidden'});
  let saved=await page.evaluate(id=>window.EvaPersonal.getSnapshot().conversations.find(c=>c.id===id),id);assert.equal(saved.title,'会话表单验收');assert.equal(saved.folderId,folderId);
  await page.locator(`[data-eva-personal-conversation-id="${id}"]`).click({button:'right'});assert.equal(await name.inputValue(),'会话表单验收');
  await name.fill('未保存');await name.press('Escape');await form.waitFor({state:'hidden'});
  await page.reload();await page.locator('[data-eva-create-folder]').waitFor();saved=await page.evaluate(id=>window.EvaPersonal.getSnapshot().conversations.find(c=>c.id===id),id);assert.equal(saved.title,'会话表单验收');
  await page.locator('[data-eva-nav-id="messages"]').click();await page.locator('.ch-list').waitFor();await page.locator('[data-eva-nav-id="new-chat"]').click();await page.locator('[data-eva-create-folder]').waitFor();assert.equal(await form.count(),0);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
