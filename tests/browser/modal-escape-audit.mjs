import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

async function run(check){
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{}),page=await browser.newPage({viewport:{width:1280,height:860}}),errors=[];
 page.setDefaultTimeout(4000);page.on('pageerror',e=>errors.push(e.stack));
 try{await check(page,`http://127.0.0.1:${server.address().port}`);assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>server.close(r));}
}
const imeEscape=async page=>{await page.evaluate(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,isComposing:true,bubbles:true,cancelable:true})));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));};
const assertVisible=async locator=>assert.equal(await locator.isVisible(),true,'输入法 Escape 不得关闭当前编辑层');

test('设置 Modal：输入法 Escape 保持、普通 Escape 关闭并可重开',()=>run(async(p,url)=>{
 await p.goto(url+'/#/guid');
 const open=async()=>{await p.mouse.move(600,400);await p.locator('.eva-sider-account').hover();await p.locator('.eva-account-menu__item:visible',{hasText:'设置'}).press('Enter');};
 await open();const dialog=p.locator('.eva-settings-dialog .semi-modal-content');await dialog.waitFor();await dialog.evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));await dialog.focus();
 await imeEscape(p);await assertVisible(dialog);await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 await open();await dialog.waitFor();await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
}));
test('连接中心自定义表单：输入法 Escape 保持、普通 Escape 取消并清空草稿',()=>run(async(p,url)=>{
 await p.goto(url+'/#/eva-stub/技能');await p.locator('[data-center-create]').click();
 const dialog=p.locator('.eva-center-modal');await dialog.locator('input').first().fill('未保存的技能');
 await imeEscape(p);await assertVisible(dialog);await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 await p.locator('[data-center-create]').click();assert.equal(await dialog.locator('input').first().inputValue(),'');
 await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
}));
test('转发自定义 Modal：输入法 Escape 保持、普通 Escape 关闭',()=>run(async(p,url)=>{
 await p.goto(url+'/#/messages');await p.getByRole('button',{name:'01 日常聊天与连续消息',exact:true}).click();
 await p.locator('.eva-im-bubble-row').first().click({button:'right'});await p.locator('.wk-contextmenus-open').getByText('转发',{exact:true}).click();
 const dialog=p.locator('.eva-fp-modal');await dialog.waitFor();await p.locator('.eva-forward-search input').fill('未保存');
 await imeEscape(p);await assertVisible(dialog);await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
}));
test('角色内联子表单：输入法 Escape 不丢稿，两次 Escape 逐层关闭',()=>run(async(p,url)=>{
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=settings');await p.getByRole('tab',{name:'成员管理',exact:true}).click();await p.getByRole('button',{name:'角色设置',exact:true}).click();
 const d=p.getByRole('dialog',{name:'设置项目角色',exact:true});await d.getByRole('button',{name:'新建角色',exact:true}).click();const input=p.getByRole('textbox',{name:'新角色名称',exact:true});await input.fill('未保存角色');
 await imeEscape(p);await assertVisible(input);assert.equal(await input.inputValue(),'未保存角色');await p.keyboard.press('Escape');await input.waitFor({state:'hidden'});await assertVisible(d);
 await p.keyboard.press('Escape');await d.waitFor({state:'hidden'});
}));

test('原生 Semi 子确认框：Escape 只取消子层，设置父层仍保留',()=>run(async(p,url)=>{
 await p.goto(url+'/#/guid');await p.locator('.eva-sider-account').waitFor();
 // Capture the real runtime dependency, then exercise native Modal.confirm
 // nested over settings without modifying any product data.
 await p.evaluate(()=>{const render=window.EvaSettingsUI.render;window.EvaSettingsUI.render=(props,deps)=>{window.auditModal=deps.Modal;return render(props,deps);};});
 await p.locator('.eva-sider-account').hover();await p.locator('.eva-account-menu__item:visible',{hasText:'设置'}).press('Enter');
 const parent=p.locator('.eva-settings-dialog .semi-modal-content');await parent.waitFor();
 await p.evaluate(()=>window.auditModal.confirm({title:'测试取消确认',content:'只验证取消，不执行业务操作',cancelText:'取消',okText:'确认',onOk:()=>{throw new Error('Esc 不得确认')}}));
 const child=p.getByRole('dialog').filter({hasText:'测试取消确认'});await child.waitFor();await child.locator('button').last().focus();
 await p.keyboard.press('Escape');await child.waitFor({state:'hidden'});assert.equal(await parent.isVisible(),true,'关闭原生子确认框不得连带关闭父层');
 await p.keyboard.press('Escape');await parent.waitFor({state:'hidden'});
}));

for(const label of ['状态','优先级','执行负责人'])test(`任务 ${label}：收起下拉后第二次 Escape 必须关闭父弹窗`,()=>run(async(p,url)=>{
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=tasks');await p.getByRole('button',{name:'新建任务',exact:true}).click();const d=p.getByRole('dialog',{name:'新建任务',exact:true});
 await (label==='执行负责人'?d.locator('.eva-loop-task-create__assignee').getByText('未指派',{exact:true}):d.getByRole('button',{name:label,exact:true})).click();await p.getByRole('menu').waitFor();
 if(label==='执行负责人')await p.waitForFunction(()=>document.activeElement?.matches('.eva-task-assignee-search input'));
 await p.keyboard.press('Escape');await p.getByRole('menu').waitFor({state:'hidden'});assert.equal(await d.isVisible(),true);
 await p.keyboard.press('Escape');await d.waitFor({state:'hidden'});
}));

test('跨入口 Escape：个人分组、项目成员/转让/归档/技能、文件表单、我的 AI 助理',()=>run(async(p,url)=>{
 const close=async selector=>{const d=p.locator(selector);await d.waitFor();await p.keyboard.press('Escape');await d.waitFor({state:'hidden'});};
 await p.goto(url+'/#/guid');await p.getByRole('button',{name:'新建分组',exact:true}).click();await close('.eva-personal-folder-modal .semi-modal-content');
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=settings');await p.getByRole('tab',{name:'成员管理',exact:true}).click();
 await p.getByRole('button',{name:'添加成员',exact:true}).click();await close('.eva-member-picker-modal .semi-modal-content');
 await p.getByRole('button',{name:'转让',exact:true}).click();await close('.eva-members-modal--transfer .semi-modal-content');
 await p.getByRole('tab',{name:'技能',exact:true}).click();await p.getByRole('button',{name:'新建技能',exact:true}).click();await close('.eva-skill-create .semi-modal-content');
 for(const route of ['/collab?evaProject=prod&evaTab=files','/drive']){
  await p.goto(url+'/#'+route);if(route==='/drive')await p.locator('#eva-drive-root [data-drive-scope="workspace"][data-workspace-id="prod"]').click();
  await p.getByRole('button',{name:'新建文件夹',exact:true}).click();await close('.eva-file-dialog .semi-modal-content');
  await p.getByRole('button',{name:'更多操作：会议纪要',exact:true}).click();await p.getByRole('menuitem',{name:'移动',exact:true}).click();
  const d=p.getByRole('dialog',{name:'移动到',exact:true});await d.getByRole('combobox').click();await p.getByRole('option').first().waitFor();await p.keyboard.press('Escape');assert.equal(await d.isVisible(),true);await p.keyboard.press('Escape');await d.waitFor({state:'hidden'});
 }
 await p.goto(url+'/#/messages?evaIM=my-ai');await p.locator('.eva-ai-team__sidebar-header').getByRole('button',{name:'新建',exact:true}).click();await p.getByText('新建个人助理',{exact:true}).click();await close('.eva-editor-dialog .semi-modal-content');
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=settings');await p.getByRole('button',{name:'归档项目',exact:true}).waitFor();
 // Close the persistent demo update notice before testing the covered archive action.
 const notice=p.locator('.eva-update-notification');if(await notice.isVisible())await notice.getByRole('button',{name:'close',exact:true}).click();
 await p.getByRole('button',{name:'归档项目',exact:true}).click();await close('.eva-dialog .semi-modal-content');
 assert.equal(await p.locator('.app-titlebar').count(),1);
}));

test('原生入口：自动化周计划下拉、头像编辑器、数字员工详情都可逐层 Escape 关闭',()=>run(async(p,url)=>{
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=automation');await p.getByRole('button',{name:'创建自动化',exact:true}).click();
 let d=p.getByRole('dialog');await d.getByRole('tab',{name:'每周',exact:true}).click();await d.locator('.semi-select').click();await p.getByRole('option').first().waitFor();
 await p.keyboard.press('Escape');await p.getByRole('option').first().waitFor({state:'hidden'});assert.equal(await d.isVisible(),true);
 await p.keyboard.press('Escape');await d.waitFor({state:'hidden'});
 await p.locator('.eva-sider-account').hover();await p.locator('.eva-account-menu__item:visible',{hasText:'更换头像'}).press('Enter');
 d=p.locator('.eva-person-card-modal .semi-modal-content');await d.waitFor();await p.keyboard.press('Escape');await d.waitFor({state:'hidden'});
 await p.goto(url+'/#/eva-stub/数字员工');await p.locator('td.eva-digital-center__name-cell').first().click();
 d=p.locator('.eva-digital-dialog .semi-modal-content');await d.waitFor();await p.keyboard.press('Escape');await d.waitFor({state:'hidden'});
}));


test('任务保存中 Escape：旧请求完成不关闭重开的弹窗、不覆盖新草稿',()=>run(async(p,url)=>{
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=tasks');await p.getByRole('button',{name:'新建任务',exact:true}).waitFor();
 await p.evaluate(()=>{const render=window.EvaLoopTaskCreateUI.render;window.EvaLoopTaskCreateUI.render=(props,deps)=>render(props,{...deps,createIssue:async data=>{await new Promise(r=>{window.releaseAuditSave=r;});const result=await deps.createIssue(data);window.auditSaved=true;return result;}});});
 const open=()=>p.getByRole('button',{name:'新建任务',exact:true}).click();await open();const d=p.getByRole('dialog',{name:'新建任务',exact:true});
 await d.getByRole('textbox',{name:'任务标题',exact:true}).fill('Esc 提交隔离测试');await d.getByRole('button',{name:'创建',exact:true}).click();await p.waitForFunction(()=>!!window.releaseAuditSave);
 await p.keyboard.press('Escape');await d.waitFor({state:'hidden'});await open();await d.getByRole('textbox',{name:'任务标题',exact:true}).fill('重开的新草稿');
 await p.evaluate(()=>window.releaseAuditSave());await p.waitForFunction(()=>window.auditSaved);assert.equal(await d.getByRole('textbox',{name:'任务标题',exact:true}).inputValue(),'重开的新草稿');
 await p.keyboard.press('Escape');await d.waitFor({state:'hidden'});
}));
