import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

for(const entry of ['project','drive'])test(entry+' 文件表单：空提交、危险链接、改域确认、移动与快捷方式',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/#/${entry==='project'?'collab?evaProject=prod&evaTab=files':'drive'}`);
  if(entry==='drive')await page.locator('#eva-drive-root [data-drive-scope="workspace"][data-workspace-id="prod"]').click();
  const host=page.locator(entry==='project'?'.eva-project-files':'#eva-drive-root');
  await host.getByText('添加外部资源',{exact:true}).click();await host.getByRole('menuitem').filter({hasText:'外部链接'}).click();
  let dialog=page.getByRole('dialog',{name:'添加外部链接',exact:true});
  await dialog.getByRole('button',{name:'添加链接',exact:true}).click();await dialog.getByText('请输入文件名称',{exact:true}).waitFor();
  await dialog.getByRole('textbox',{name:'文件名称',exact:true}).fill('链接表单验收');
  const url=dialog.getByRole('textbox',{name:'文件链接',exact:true});await url.fill('javascript:alert(1)');await dialog.getByRole('button',{name:'添加链接',exact:true}).click();
  assert.equal(await url.getAttribute('aria-invalid'),'true');
  await url.fill('https://example.com/form-source');await dialog.getByRole('button',{name:'添加链接',exact:true}).click();await dialog.waitFor({state:'hidden'});
  const detail=page.getByRole('dialog').filter({hasText:'外部链接详情'});if(await detail.count())await detail.locator('header').getByRole('button',{name:/关闭/}).click();
  const records=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('eva:file-store:v7')).records);
  let item=(await records()).find(i=>i.name==='链接表单验收');assert.equal(item.spaceId,'prod');const id=item.id;
  await host.getByRole('button',{name:'更多操作：链接表单验收',exact:true}).click();await page.getByRole('menuitem',{name:'编辑链接',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'编辑外部链接',exact:true});await dialog.getByRole('textbox',{name:'文件链接',exact:true}).fill('https://example.org/form-new');await dialog.getByRole('button',{name:'保存',exact:true}).click();
  await dialog.getByText('链接域名发生变化。请确认新地址可信后再保存。',{exact:true}).waitFor();assert.equal((await records()).find(i=>i.id===id).external.host,'example.com');
  await dialog.getByRole('textbox',{name:'文件链接',exact:true}).fill('https://example.net/changed-again');
  await dialog.getByRole('button',{name:'保存',exact:true}).click();
  await dialog.getByText('链接域名发生变化。请确认新地址可信后再保存。',{exact:true}).waitFor();
  assert.equal((await records()).find(i=>i.id===id).external.host,'example.com');
  await dialog.getByRole('button',{name:'确认更换并保存',exact:true}).click();await dialog.waitFor({state:'hidden'});
  if(await detail.count())await detail.locator('header').getByRole('button',{name:/关闭/}).click();assert.equal((await records()).find(i=>i.id===id).external.host,'example.net');
  await host.getByRole('button',{name:'更多操作：链接表单验收',exact:true}).click();await page.getByRole('menuitem',{name:'创建快捷方式',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'创建快捷方式',exact:true});await dialog.getByRole('button',{name:'创建快捷方式',exact:true}).click();await dialog.waitFor({state:'hidden'});
  assert.equal((await records()).filter(i=>i.type==='shortcut'&&i.sourceFileId===id).length,1);
  await host.getByRole('button',{name:'更多操作：链接表单验收',exact:true}).click();await page.getByRole('menuitem',{name:'移动',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'移动到',exact:true});await dialog.getByRole('combobox',{name:'目标文件夹',exact:true}).click();await page.locator('.semi-select-option').filter({hasText:/^会议纪要$/}).click();await dialog.getByRole('button',{name:entry==='project'?'移动':'确认',exact:true}).click();await dialog.waitFor({state:'hidden'});
  assert.equal((await records()).find(i=>i.id===id).parent_id,(await records()).find(i=>i.spaceId==='prod'&&i.name==='会议纪要').id);
  await page.reload();assert.equal((await records()).find(i=>i.id===id).external.host,'example.net');assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
