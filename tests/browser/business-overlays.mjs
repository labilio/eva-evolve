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
  const parent=page.getByRole('dialog',{name:'关联父任务',exact:true});await parent.waitFor();
  assert.equal(await parent.locator('.semi-modal').count(),0);
  await parent.getByRole('combobox').press('Escape');assert.equal(await parent.isVisible(),true);
  const spacing=await parent.evaluate(e=>{const field=e.querySelector('.semi-select').getBoundingClientRect(),button=Array.from(e.querySelectorAll('button')).find(b=>b.textContent==='取消').getBoundingClientRect();return button.top-field.bottom;});
  const titleGap=await parent.evaluate(e=>{const title=document.getElementById(e.getAttribute('aria-labelledby')),label=e.querySelector('.semi-form-field-label');return label.getBoundingClientRect().top-title.getBoundingClientRect().bottom;});
  assert.equal(titleGap,4,'标题到首字段标签仅保留公共标题间距，不叠加字段顶部padding');
  assert.equal(spacing,20,'Arco 默认表单项目间距20px，由操作区独占');
  const metrics=await parent.evaluate(e=>{const l=e.querySelector('.semi-form-field-label'),s=e.querySelector('.semi-select'),b=Array.from(e.querySelectorAll('button')).find(n=>n.textContent==='保存');return {labelWeight:getComputedStyle(l).fontWeight,labelGap:s.getBoundingClientRect().top-l.getBoundingClientRect().bottom,buttonHeight:b.getBoundingClientRect().height,buttonFont:getComputedStyle(b).fontSize};});
  assert.deepEqual(metrics,{labelWeight:'400',labelGap:8,buttonHeight:32,buttonFont:'14px'});
  await parent.getByRole('button',{name:'取消',exact:true}).click();await parent.waitFor({state:'hidden'});
  assert.equal(await page.getByRole('button',{name:'更多操作',exact:true}).evaluate(e=>e===document.activeElement),true);
  await page.goto(origin+'/#/conversation/personal-weekly-meeting-summary');
  await page.getByRole('button',{name:'整理本周会议结论',exact:true}).click();
  const remove=page.getByRole('button',{name:'删除对话：整理本周会议结论',exact:true});await remove.click();
  const confirm=page.getByRole('dialog',{name:'删除“整理本周会议结论”？',exact:true});await confirm.waitFor();
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
