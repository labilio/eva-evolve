import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
for(const entry of ['project','drive'])test(entry+' 文件标签：选择已有、Enter创建、未确认草稿保存、大小写去重及取消重开',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/#/${entry==='project'?'collab?evaProject=prod&evaTab=files':'drive'}`);
  if(entry==='drive')await page.locator('#eva-drive-root [data-drive-scope="workspace"][data-workspace-id="prod"]').click();
  const host=page.locator(entry==='project'?'.eva-project-files':'#eva-drive-root');
  const item=await page.evaluate(()=>{const c=window.__evaGetFileContext();return c.files.list('prod',c.store.actorId()).find(i=>i.parent_id===0&&i.type!=='folder'&&i.type!=='shortcut');});
  const open=async()=>{await host.getByRole('button',{name:'更多操作：'+item.name,exact:true}).click();await page.getByRole('menuitem',{name:'编辑标签',exact:true}).click();};await open();
  const dialog=page.getByRole('dialog',{name:'编辑标签',exact:true}),input=dialog.getByRole('combobox',{name:'输入或选择标签',exact:true});
  while(await dialog.getByRole('button',{name:/^移除标签 /}).count())await dialog.getByRole('button',{name:/^移除标签 /}).first().click();
  const existing=dialog.getByRole('option').first();const existingName=await existing.innerText();await existing.click();
  await input.fill('FormTag');await input.press('Enter');await dialog.getByRole('button',{name:'移除标签 FormTag',exact:true}).waitFor();
  await input.fill('formtag');await input.press('Enter');await dialog.getByText('该标签已选择',{exact:true}).waitFor();
  await input.fill('保存待确认标签');await dialog.getByRole('button',{name:'保存',exact:true}).click();await dialog.waitFor({state:'hidden'});
  const read=()=>page.evaluate(id=>{const c=window.__evaGetFileContext();return c.files.snapshot(c.store.actorId()).find(i=>i.id===id).tags;},item.id);
  assert.deepEqual(await read(),[existingName,'FormTag','保存待确认标签']);await open();
  await dialog.getByRole('button',{name:'移除标签 FormTag',exact:true}).click();await dialog.getByRole('button',{name:'取消',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.ok((await read()).includes('FormTag'));
  await page.reload();await host.waitFor();assert.deepEqual(await read(),[existingName,'FormTag','保存待确认标签']);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
