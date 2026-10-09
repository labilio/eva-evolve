import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
test('项目基本信息：空名称、周期联动校验、修正保存及刷新',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=settings`);
  const form=page.locator('.eva-project-settings-info'),name=form.getByRole('textbox',{name:'项目名称',exact:true}),save=form.getByRole('button',{name:'保存修改',exact:true});
  await name.fill('');assert.equal(await save.isEnabled(),true);await save.click();
  await form.getByText('请填写项目名称',{exact:true}).waitFor();
  await page.waitForFunction(()=>document.getElementById('eva-project-name')===document.activeElement);
  await name.fill('供应链运营协同表单验收');
  await form.getByText('请填写项目名称',{exact:true}).waitFor({state:'hidden'});
  const start=form.getByRole('textbox',{name:'项目开始时间',exact:true});await start.fill('');await save.click();
  await form.getByText('请填写项目开始时间',{exact:true}).waitFor();
  await start.fill('2026-09-01');
  await form.getByRole('textbox',{name:'项目目标 1',exact:true}).fill('修改后的项目目标');
  const goalCount=await form.getByRole('textbox',{name:/^项目目标 /}).count();
  await form.getByRole('button',{name:'添加目标',exact:true}).click();
  await form.getByRole('textbox',{name:'项目目标 '+(goalCount+1),exact:true}).fill('新增的项目目标');
  await form.getByRole('button',{name:'删除项目目标 2',exact:true}).click();
  const milestoneCount=await form.getByRole('textbox',{name:/^里程碑日期 /}).count();
  await form.getByRole('button',{name:'添加里程碑',exact:true}).click();
  await form.getByRole('textbox',{name:'里程碑日期 '+(milestoneCount+1),exact:true}).fill('2026-10-30');
  await form.getByRole('textbox',{name:'里程碑事项 '+(milestoneCount+1),exact:true}).fill('新增里程碑');
  await form.getByRole('combobox',{name:'里程碑状态 '+(milestoneCount+1),exact:true}).click();await page.locator('.semi-select-option').filter({hasText:/^进行中$/}).click();
  await save.click();await form.getByText('项目信息已保存',{exact:true}).waitFor();
  await page.reload();assert.equal(await name.inputValue(),'供应链运营协同表单验收');assert.equal(await start.inputValue(),'2026-09-01');
  assert.equal(await form.getByRole('textbox',{name:'项目目标 1',exact:true}).inputValue(),'修改后的项目目标');
  assert.equal(await form.getByRole('textbox',{name:'项目目标 '+goalCount,exact:true}).inputValue(),'新增的项目目标');
  assert.equal(await form.getByRole('textbox',{name:'里程碑事项 '+(milestoneCount+1),exact:true}).inputValue(),'新增里程碑');
  assert.equal(await form.getByRole('combobox',{name:'里程碑状态 '+(milestoneCount+1),exact:true}).innerText(),'进行中');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
