import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
const scenarios=[
 ['project','新建项目','settings',async p=>{await p.goto(new URL('/#/collab',p.url()).href);await p.getByRole('button',{name:'新建项目',exact:true}).click();}],
 ['group','新建群聊','messages',async p=>{await p.locator('.eva-message-invite').click();await p.getByRole('menuitem',{name:'新建群聊',exact:true}).click();}],
 ['personal-folder','个人 Eva · 新建分组','settings',async p=>{await p.goto(new URL('/#/guid',p.url()).href);await p.getByRole('button',{name:'新建分组',exact:true}).click();}],
 ['folder','新建文件夹','files',async p=>p.getByRole('button',{name:'新建文件夹',exact:true}).click()],
 ['folder-error','新建文件夹 · 空提交','files',async p=>{await p.getByRole('button',{name:'新建文件夹',exact:true}).click();await p.getByRole('dialog').getByRole('button',{name:'创建',exact:true}).click();}],
 ['rename','重命名 · 原名称选中','files',async p=>{await p.getByRole('button',{name:'更多操作：会议纪要',exact:true}).click();await p.getByRole('menuitem',{name:'重命名',exact:true}).click();}],
 ['move','移动文件夹','files',async p=>{await p.getByRole('button',{name:'更多操作：会议纪要',exact:true}).click();await p.getByRole('menuitem',{name:'移动',exact:true}).click();}],
 ['shortcut','创建快捷方式','files',async p=>{await p.getByRole('button',{name:/更多操作：.*来料异常分析报告/}).click();await p.getByRole('menuitem',{name:'创建快捷方式',exact:true}).click();}],
 ['member','添加项目成员','settings',async p=>{await p.getByRole('tab',{name:'成员管理',exact:true}).click();await p.getByRole('button',{name:'添加成员',exact:true}).click();}],
 ['role','设置项目角色','settings',async p=>{await p.getByRole('tab',{name:'成员管理',exact:true}).click();await p.getByRole('button',{name:'角色设置',exact:true}).click();}],
 ['role-new','设置项目角色 · 新建角色','settings',async p=>{await p.getByRole('tab',{name:'成员管理',exact:true}).click();await p.getByRole('button',{name:'角色设置',exact:true}).click();await p.getByRole('button',{name:'新建角色',exact:true}).click();}],
 ['skill','新建技能 · 空白起草','settings',async p=>{await p.getByRole('tab',{name:'技能',exact:true}).click();await p.getByRole('button',{name:'新建技能',exact:true}).click();}],
 ['skill-zip','新建技能 · ZIP 导入','settings',async p=>{await p.getByRole('tab',{name:'技能',exact:true}).click();await p.getByRole('button',{name:'新建技能',exact:true}).click();await p.getByRole('tab',{name:'从 ZIP 导入',exact:true}).click();}],
 ['thread','新建子区','messages',async p=>{await p.locator('.ch-list').getByText('采购与招投标',{exact:true}).click();await p.locator('.ch-head').getByRole('button',{name:'子区',exact:true}).click();await p.getByRole('button',{name:'新建子区',exact:true}).click();}],
];
test('标准弹窗结构矩阵：正文留白与字段内距不重复',async t=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'});
 try{for(const [key,label,tab,flow] of scenarios)await t.test(label,async()=>{
 const page=await browser.newPage({viewport:{width:1200,height:800}});page.setDefaultTimeout(10000);
 try{
 await page.goto(`http://127.0.0.1:${server.address().port}/#/`+(tab==='messages'?'messages':`collab?evaProject=prod&evaTab=${tab}`));
 await flow(page);const dialog=page.getByRole('dialog').last();await dialog.waitFor();
 const geometry=await dialog.evaluate(el=>{
 const body=el.querySelector('.semi-modal-body'),style=getComputedStyle(body);
 return {top:style.paddingTop,bottom:style.paddingBottom,fields:[...el.querySelectorAll('.semi-form-field')].map(n=>({top:getComputedStyle(n).paddingTop,bottom:getComputedStyle(n).paddingBottom}))};
 });
 assert.equal(geometry.top,'24px');assert.equal(geometry.bottom,'24px');
 // These fixtures have a single field or a layout container owning field gaps.
 // This is not a global prohibition on Semi padding in arbitrary forms.
 for(const field of geometry.fields){assert.equal(field.top,'0px',label+' 字段顶部重复留白');assert.equal(field.bottom,'0px',label+' 字段底部重复留白');}
 }finally{await page.close();}
 });}finally{await browser.close();await new Promise(r=>server.close(r));}
});
