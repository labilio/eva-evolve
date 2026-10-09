import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

async function withPage(run){
 const server=createServer(new URL('../../dist',import.meta.url).pathname);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
 page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
 try{await run(page,`http://127.0.0.1:${server.address().port}`);assert.deepEqual(errors,[]);}
 finally{await browser.close();await new Promise(r=>server.close(r));}
}

test('任务提交中可点遮罩关闭，旧请求完成不关闭新弹窗或覆盖新草稿',()=>withPage(async(page,origin)=>{
 await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks');
 await page.getByRole('button',{name:'新建任务',exact:true}).waitFor();
 // Delay only the business operation; render, native Semi modal and submission
 // lifecycle are production code, exercised through the real entry point.
 await page.evaluate(()=>{
  const original=window.EvaLoopTaskCreateUI.render;
  window.EvaLoopTaskCreateUI.render=(props,deps)=>original(props,{...deps,createIssue:async payload=>{
   await new Promise(resolve=>{window.releaseTaskSave=resolve;});
   const result=await deps.createIssue(payload);window.taskSaveFinished=true;return result;
  }});
 });
 const open=()=>page.getByRole('button',{name:'新建任务',exact:true}).click();
 await open();const dialog=page.locator('.eva-loop-task-create');
 await dialog.getByRole('textbox',{name:'任务标题',exact:true}).fill('关闭中的任务');
 await dialog.getByRole('button',{name:'创建',exact:true}).click();
 await page.waitForFunction(()=>typeof window.releaseTaskSave==='function');
 await page.mouse.click(40,100);await dialog.waitFor({state:'hidden'});
 await open();await dialog.getByRole('textbox',{name:'任务标题',exact:true}).fill('新弹窗草稿');
 await page.evaluate(()=>window.releaseTaskSave());await page.waitForFunction(()=>window.taskSaveFinished);
 assert.equal(await dialog.getByRole('textbox',{name:'任务标题',exact:true}).inputValue(),'新弹窗草稿');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
}));

test('云盘上传 change、表单外部关闭、重开清空以及下拉与父弹窗的关闭边界',()=>withPage(async(page,origin)=>{
 await page.goto(origin+'/#/drive');
 await page.locator('#eva-drive-root [data-drive-scope="workspace"][data-workspace-id="prod"]').click();
 const host=page.locator('#eva-drive-root');
 await host.locator('#eva-file-upload').setInputFiles({name:'上传监听验收.txt',mimeType:'text/plain',buffer:Buffer.from('upload change event')});
 await host.getByText('上传监听验收.txt',{exact:true}).first().waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('eva:file-store:v7')).records.find(r=>r.name==='上传监听验收.txt')?.spaceId),'prod');
 await page.keyboard.press('Escape');await page.locator('.eva-file-detail-dialog').waitFor({state:'hidden'});
 const open=()=>host.getByRole('button',{name:'新建文件夹',exact:true}).click();
 await open();let dialog=page.getByRole('dialog',{name:'新建文件夹',exact:true});
 const shell=await dialog.evaluate(node=>{
  const header=getComputedStyle(node.querySelector('.semi-modal-header')),body=getComputedStyle(node.querySelector('.semi-modal-body')),footer=getComputedStyle(node.querySelector('.semi-modal-footer'));
  return {header:header.paddingLeft,body:body.paddingLeft,footer:footer.paddingRight,gap:getComputedStyle(node.querySelector('.eva-dialog-actions')).gap,titlebar:!!document.elementFromPoint(100,15)?.closest('.eva-tb-brand')};
 });
 assert.deepEqual(shell,{header:'20px',body:'20px',footer:'20px',gap:'12px',titlebar:true});
 await dialog.getByRole('textbox').fill('不保存的草稿');
 await dialog.locator('.semi-modal-title').click();assert.equal(await dialog.isVisible(),true,'输入框失焦不能关闭弹窗');
 await page.waitForTimeout(30); // Semi clears its drag-out guard after mouseup.
 await page.mouse.click(40,100);await dialog.waitFor({state:'hidden'});
 await open();assert.equal(await dialog.getByRole('textbox').inputValue(),'');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 await host.getByRole('button',{name:'更多操作：上传监听验收.txt',exact:true}).click();
 await page.getByRole('menuitem',{name:'移动',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'移动到',exact:true});
 await dialog.getByRole('combobox',{name:'目标文件夹',exact:true}).click();
 await page.locator('.semi-select-option').filter({hasText:/^会议纪要$/}).click();
 assert.equal(await dialog.isVisible(),true,'选下拉选项不能关闭父弹窗');
 await dialog.getByRole('combobox',{name:'目标文件夹',exact:true}).click();
 await dialog.locator('.semi-modal-title').click();
 await page.locator('.semi-select-option').filter({hasText:/^会议纪要$/}).waitFor({state:'hidden'});
 assert.equal(await dialog.isVisible(),true,'父弹窗空白处只关闭下拉');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
}));

test('技能保存中可点遮罩关闭，重新打开后旧结果不切走新草稿',()=>withPage(async(page,origin)=>{
 await page.goto(origin+'/#/collab?evaProject=prod&evaTab=settings');
 await page.getByRole('tab',{name:'项目设置',exact:true}).click();
 await page.getByRole('tab',{name:'技能',exact:true}).click();
 await page.evaluate(()=>{
  const original=window.EvaProjectSkillCreate.render;
  window.EvaProjectSkillCreate.render=(props,api)=>original(props,{...api,createSkill:async payload=>{
   await new Promise(resolve=>{window.releaseSkillSave=resolve;});
   const result=await api.createSkill(payload);window.skillSaveFinished=true;return result;
  }});
 });
 const open=()=>page.getByRole('button',{name:'新建技能',exact:true}).click();
 await open();const dialog=page.locator('.eva-skill-create');
 await dialog.getByLabel('名称',{exact:true}).fill('dismiss-pending');
 await dialog.getByRole('button',{name:'创建',exact:true}).click();
 await page.waitForFunction(()=>typeof window.releaseSkillSave==='function');
 await page.mouse.click(40,100);await dialog.waitFor({state:'hidden'});
 await open();await dialog.getByLabel('名称',{exact:true}).fill('new-draft');
 await page.evaluate(()=>window.releaseSkillSave());await page.waitForFunction(()=>window.skillSaveFinished);
 assert.equal(await dialog.getByLabel('名称',{exact:true}).inputValue(),'new-draft');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
}));

test('助理编辑器点击内部切换焦点保持，点击遮罩关闭，重开不保留未保存内容',()=>withPage(async(page,origin)=>{
 await page.goto(origin+'/#/messages?evaIM=my-ai');
 const open=async()=>{
  await page.locator('.eva-ai-team__sidebar-header').getByRole('button',{name:'新建',exact:true}).click();
  await page.getByText('新建个人助理',{exact:true}).click();
 };
 await open();const dialog=page.locator('.eva-editor-dialog .semi-modal-content');
 await dialog.getByRole('textbox',{name:'助理名称',exact:true}).fill('不保存的助理');
 await dialog.getByRole('tab',{name:'助理性格',exact:true}).click();
 assert.equal(await dialog.isVisible(),true);
 await page.waitForTimeout(30);
 await page.mouse.click(40,100);await dialog.waitFor({state:'hidden'});
 await open();assert.equal(await dialog.getByRole('textbox',{name:'助理名称',exact:true}).inputValue(),'');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
}));
