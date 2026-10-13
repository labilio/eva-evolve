import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
test('普通操作保持中性色，筛选仅选中时使用主题色',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,b=await chromium.launch({channel:'msedge'}),p=await b.newPage({viewport:{width:1440,height:1000}});p.setDefaultTimeout(10000);
 async function color(locator,active=false){await locator.waitFor();const r=await locator.evaluate(el=>{const q=document.createElement('span');q.style.color='var(--eva-action-primary)';document.body.append(q);const v=[getComputedStyle(el).color,getComputedStyle(q).color];q.remove();return v;});assert.equal(r[0]===r[1],active,`${await locator.getAttribute('aria-label')||await locator.innerText()}: ${r}`);}
 try{
 await p.goto(origin+'/#/guid');await p.locator('.eva-sider-account').click();await p.locator('.eva-account-menu__item:visible',{hasText:'设置'}).click();await p.locator('.eva-settings-dialog__side>nav .semi-button').filter({hasText:'用量看板'}).click();
 for(const theme of ['light','dark']){await p.evaluate(t=>window.EvaTheme.apply(t),theme);await color(p.getByRole('button',{name:'关闭设置'}));await color(p.locator('.eva-usage__filters [aria-pressed="false"]').first());await color(p.locator('.eva-usage__filters [aria-pressed="true"]').first(),true);}
 await p.getByRole('button',{name:'关闭设置'}).click();
 await p.goto(origin+'/#/collab?evaProject=prod');await p.evaluate(()=>window.EvaTheme.apply('light'));await p.getByRole('button',{name:'新建任务',exact:true}).first().click();await p.locator('input[type=file]').setInputFiles({name:'配色验证.txt',mimeType:'text/plain',buffer:Buffer.from('test')});const remove=p.getByRole('button',{name:'移除 配色验证.txt'});await color(remove);await remove.click();await remove.waitFor({state:'detached'});await p.getByRole('dialog').getByRole('button',{name:'取消',exact:true}).click();
 await p.getByRole('button',{name:'任务视图：看板'}).click();await p.getByRole('menuitem',{name:'表格',exact:true}).click();await p.locator('.eva-task-table tbody tr').filter({hasText:'SC-101'}).locator('.semi-checkbox').click();const cancel=p.getByRole('button',{name:'清除选择',exact:true});await color(cancel);await cancel.click();await p.locator('.eva-task-table__toolbar--batch').waitFor({state:'detached'});
 await p.goto(origin+'/#/messages');await p.locator('.ch-list').getByText('采购与招投标',{exact:true}).click();await p.getByRole('button',{name:'查看聊天任务'}).click();const close=p.getByRole('button',{name:'关闭聊天任务'});await color(close);await close.click();await close.waitFor({state:'detached'});await p.getByRole('button',{name:'子区',exact:true}).click();const more=p.getByRole('button',{name:/^子区操作 /}).first();await color(more);await more.click();await p.getByRole('menuitem',{name:'隐藏子区',exact:true}).waitFor();await p.keyboard.press('Escape');
 }finally{await b.close();await new Promise(r=>server.close(r));}
});
