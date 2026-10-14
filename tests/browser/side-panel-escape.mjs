import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
async function run(check){
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{}),p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 p.setDefaultTimeout(5000);p.on('pageerror',e=>errors.push(e.stack));
 try{await check(p,`http://127.0.0.1:${server.address().port}`);assert.deepEqual(errors,[]);}finally{await browser.close();await new Promise(r=>server.close(r));}
}
const focused=locator=>locator.evaluate(el=>el===document.activeElement);
const ime=page=>page.evaluate(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',isComposing:true,bubbles:true,cancelable:true})));
test('聊天任务侧栏：Esc 关闭、返回入口、重开且保留聊天草稿',()=>run(async(p,url)=>{
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=channels');
 const entry=p.getByRole('button',{name:'查看聊天任务',exact:true}),panel=p.locator('.eva-chat-task-list'),composer=p.locator('[contenteditable=true][role=textbox]').first();
 await composer.fill('侧栏验收草稿');await entry.click();await panel.waitFor();await ime(p);assert.equal(await panel.isVisible(),true);
 await p.keyboard.press('Escape');await panel.waitFor({state:'hidden'});assert.equal(await focused(entry),true);assert.equal(await composer.innerText(),'侧栏验收草稿');
 await entry.click();await panel.waitFor();await panel.getByRole('button',{name:'关闭聊天任务',exact:true}).click();await panel.waitFor({state:'hidden'});assert.equal(await focused(entry),true);
}));
test('聊天任务叠层：创建表单先关闭，保留面板位置，再次 Esc 关闭面板',()=>run(async(p,url)=>{
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=channels');await p.getByRole('button',{name:'查看聊天任务',exact:true}).click();
 const panel=p.locator('.eva-chat-task-list'),create=panel.getByRole('button',{name:'新建任务',exact:true});await panel.waitFor();
 await panel.locator('.eva-chat-task-list-body').evaluate(el=>{el.scrollTop=40;});const scroll=await panel.locator('.eva-chat-task-list-body').evaluate(el=>el.scrollTop);
 await create.click();const d=p.getByRole('dialog',{name:'新建任务',exact:true});await d.waitFor();await p.keyboard.press('Escape');await d.waitFor({state:'hidden'});
 assert.equal(await panel.isVisible(),true);assert.equal(await focused(create),true);assert.equal(await panel.locator('.eva-chat-task-list-body').evaluate(el=>el.scrollTop),scroll);
 await p.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
}));
test('聊天信息/搜索/任务互斥，信息子页与搜索筛选逐层关闭',()=>run(async(p,url)=>{
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=channels');
 await p.getByRole('button',{name:'查看聊天任务',exact:true}).click();await p.getByRole('button',{name:'打开聊天信息',exact:true}).first().click();
 await p.locator('.eva-chat-settings').waitFor();assert.equal(await p.locator('.eva-chat-task-list').count(),0);
 await p.locator('.eva-chat-settings').getByRole('button',{name:/查看全部 .*名成员/}).click();
 await p.getByRole('button',{name:'返回聊天信息',exact:true}).waitFor();await ime(p);assert.equal(await p.getByRole('button',{name:'返回聊天信息',exact:true}).isVisible(),true);
 await p.keyboard.press('Escape');await p.getByRole('button',{name:'关闭聊天信息',exact:true}).waitFor();await p.keyboard.press('Escape');await p.locator('.eva-chat-settings').waitFor({state:'hidden'});
 await p.locator('.eva-chat-search-entry').click();const search=p.locator('#eva-conversation-search-panel');await search.waitFor();await ime(p);assert.equal(await search.isVisible(),true);
 await p.keyboard.press('Escape');await search.waitFor({state:'hidden'});assert.equal(await focused(p.locator('.eva-chat-search-entry')),true);
}));
test('子区信息：协作说明和全部成员先返回，下一次 Esc 才关闭侧栏',()=>run(async(p,url)=>{
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=channels');await p.locator('.ch-list').getByText('采购与招投标',{exact:true}).click();await p.locator('.ch-list').getByText('本季度间接采购需求',{exact:true}).click();
 const entry=p.getByRole('button',{name:'打开子区信息',exact:true}).last();
 for(const name of [/协作说明/,/查看全部 .*名成员/]){
  await entry.click();const info=p.locator('.eva-thread-settings');await info.waitFor();await info.getByRole('button',{name}).click();
  const sub=p.locator('.eva-thread-members-page');await sub.waitFor();await p.keyboard.press('Escape');await sub.waitFor({state:'hidden'});assert.equal(await info.isVisible(),true);
  await p.keyboard.press('Escape');await info.waitFor({state:'hidden'});assert.equal(await focused(entry),true);
 }
}));
test('搜索筛选：先收起筛选再关侧栏，返回搜索入口',()=>run(async(p,url)=>{
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=channels');await p.locator('.eva-chat-search-entry').click();
 const panel=p.locator('#eva-conversation-search-panel');await panel.getByRole('button',{name:'筛选',exact:true}).click();
 await p.locator('#eva-conversation-search-filters').waitFor();await p.getByRole('button',{name:'最近 7 天',exact:true}).click();
 await p.keyboard.press('Escape');await p.locator('#eva-conversation-search-filters').waitFor({state:'hidden'});assert.equal(await panel.isVisible(),true);
 await p.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
}));
test('消息/我的 AI/项目往返：共享侧栏关闭，不残留上一入口状态',()=>run(async(p,url)=>{
 for(const route of ['/#/messages','/#/messages?evaIM=my-ai','/#/collab?evaProject=prod&evaTab=channels']){
  await p.goto(url+route);
  if(route==='/#/messages')await p.locator('.ch-list').getByText('采购与招投标',{exact:true}).click();
  if(route.includes('my-ai'))await p.locator('.eva-ai-team__team:has(.eva-ai-team__team-default) .eva-ai-team__team-button').click();
  const entry=p.getByRole('button',{name:'打开聊天信息',exact:true}).last();await entry.click();await p.locator('.eva-chat-settings').waitFor();
  await p.keyboard.press('Escape');await p.locator('.eva-chat-settings').waitFor({state:'hidden'});assert.equal(await focused(entry),true);
  await p.locator('.eva-chat-search-entry').click();await p.locator('#eva-conversation-search-panel').waitFor();await p.keyboard.press('Escape');await p.locator('#eva-conversation-search-panel').waitFor({state:'hidden'});
  assert.equal(await p.locator('.app-titlebar').count(),1);
 }
}));
test('任务详情抽屉：入口焦点、输入法保护、子表单和下拉逐层 Esc',()=>run(async(p,url)=>{
 await p.goto(url+'/#/messages');
 const entry=p.locator('[data-eva-task-link="CLIENT-103"]').first(),drawer=p.locator('.eva-task-detail-host');
 await entry.click();await p.locator('.loop-idp__title:visible').waitFor();
 assert.equal(await drawer.evaluate(el=>el.contains(document.activeElement)),true,'打开任务后焦点应进入详情');
 await ime(p);assert.equal(await drawer.isVisible(),true);
 await p.getByRole('button',{name:'添加子任务',exact:true}).click();
 const modal=p.locator('.eva-loop-task-create .semi-modal-content');await modal.waitFor();
 await p.keyboard.press('Escape');await modal.waitFor({state:'hidden'});assert.equal(await drawer.isVisible(),true);
 assert.equal(await focused(p.getByRole('button',{name:'添加子任务',exact:true})),true);
 await p.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});assert.equal(await focused(entry),true);
 await entry.click();await p.locator('.loop-idp__title:visible').waitFor();
 await p.locator('.loop-idp__prop--labels:visible button').first().click();
 const menu=p.locator('.semi-dropdown-menu:visible');await menu.waitFor();await menu.getByRole('textbox',{name:'搜索或新建标签'}).focus();
 await p.keyboard.press('Escape');await menu.waitFor({state:'hidden'});assert.equal(await drawer.isVisible(),true);
 await p.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
}));
test('聊天任务详情关闭返回任务卡，下一次 Esc 才关闭聊天任务列表',()=>run(async(p,url)=>{
 await p.goto(url+'/#/collab?evaProject=prod&evaTab=channels');
 const entry=p.getByRole('button',{name:'查看聊天任务',exact:true});await entry.click();
 const list=p.locator('.eva-chat-task-list'),card=list.locator('.eva-chat-task-card').filter({hasText:'SC-103'});await card.click();
 await p.locator('.loop-idp__title:visible').waitFor();await p.keyboard.press('Escape');await p.locator('.eva-task-detail-host').waitFor({state:'hidden'});
 assert.equal(await list.isVisible(),true);assert.equal(await focused(card),true);
 await p.keyboard.press('Escape');await list.waitFor({state:'hidden'});assert.equal(await focused(entry),true);
}));
