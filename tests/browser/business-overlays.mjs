import {settleMotion} from '../helpers/settle-motion.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('业务浮层：父任务取消、对话删除焦点、文件永久删除事务',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
 const origin=`http://127.0.0.1:${server.address().port}`;page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks&evaTask=SC-103');
  await page.getByRole('button',{name:'更多操作',exact:true}).click();await page.getByRole('menuitem',{name:'关联父任务',exact:true}).click();
  const parent=page.getByRole('dialog',{name:'关联父任务',exact:true});await parent.waitFor();await settleMotion(page);
  assert.equal(await parent.locator('.semi-select').count(),0,'父任务使用单层搜索');
  await parent.getByRole('textbox',{name:'搜索任务编号或标题'}).press('Escape');
  await parent.waitFor({state:'hidden'});
  assert.equal(await page.getByRole('button',{name:'更多操作',exact:true}).evaluate(e=>e===document.activeElement),true);
  await page.goto(origin+'/#/conversation/personal-weekly-meeting-summary');
  await page.locator('[data-eva-personal-conversation-id="personal-weekly-meeting-summary"]').click();
  const remove=page.getByRole('button',{name:'删除对话：整理本周会议结论',exact:true});await remove.click();
  const confirm=page.getByRole('dialog',{name:'删除对话',exact:true});await confirm.waitFor();
  assert.equal(await confirm.getByRole('button',{name:'取消',exact:true}).evaluate(e=>e===document.activeElement),true);
  await confirm.getByRole('button',{name:'取消',exact:true}).click();await confirm.waitFor({state:'hidden'});
  assert.equal(await remove.evaluate(e=>e===document.activeElement),true);
  await remove.click();await confirm.getByRole('button',{name:'取消',exact:true}).press('Escape');await confirm.waitFor({state:'hidden'});
  assert.equal(await remove.evaluate(e=>e===document.activeElement),true);
  await page.goto(origin+'/#/drive');await page.getByRole('button',{name:'回收站',exact:true}).waitFor();
  const item=await page.evaluate(()=>{const c=window.__evaGetFileContext(),actor=c.store.actorId();const item=c.files.list('prod',actor).find(i=>i.type==='blob');c.files.trash(actor,item.id);return {id:item.id,name:item.name};});
  await page.getByRole('button',{name:'回收站',exact:true}).click();
  const more=page.getByRole('button',{name:'更多操作：'+item.name,exact:true});await more.click();await page.getByRole('menuitem',{name:'永久删除',exact:true}).click();
  const deletion=page.getByRole('dialog',{name:'永久删除“'+item.name+'”？',exact:true});await deletion.waitFor();
  await page.screenshot({path:'/tmp/eva-file-permanent-delete.png'});
  await deletion.getByRole('button',{name:'取消',exact:true}).click();await deletion.waitFor({state:'hidden'});assert.equal(await more.isVisible(),true);
  await more.click();await page.getByRole('menuitem',{name:'永久删除',exact:true}).click();await deletion.getByRole('button',{name:'永久删除',exact:true}).click();await deletion.waitFor({state:'hidden'});await more.waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
