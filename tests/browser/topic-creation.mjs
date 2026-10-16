import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});

try{
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{let api;Object.defineProperty(window,'EvaMembership',{configurable:true,get:()=>api,set:value=>{api={...value,bootstrap(...args){const store=value.bootstrap(...args);window.__topicStore=store;return store;}};}});});
 const url=`http://127.0.0.1:${server.address().port}/#/messages`;
 await page.goto(url);
 await page.getByRole('button',{name:'最近',exact:true}).click();
 await page.getByRole('heading',{name:'合规与合同',exact:true}).click();
 assert.equal(await page.getByRole('navigation',{name:'群聊子区'}).count(),0,'最近不再渲染横向子区导航');

 await page.getByRole('button',{name:'子区',exact:true}).click();
 const panel=page.locator('.eva-thread-list');await panel.waitFor();
 assert.equal(await panel.locator('.eva-thread-list-card').count(),3,'子区仍由统一管理面板承载');
 await panel.getByRole('button',{name:'新建子区',exact:true}).click();
 const modal=page.locator('.eva-topic-create .semi-modal-content'),input=modal.getByRole('textbox');
 await input.fill('新供应商准入复核');
 await modal.getByRole('button',{name:'创建并进入',exact:true}).click();
 await modal.locator('.semi-form-field-error-message').waitFor();
 assert.match(await modal.innerText(),/同名/,'重名提交保留表单并提示');
 await input.fill('主聊天');
 await modal.getByRole('button',{name:'创建并进入',exact:true}).click();
 assert.match(await modal.innerText(),/保留名称/);
 await input.fill('新增独立讨论');
 await modal.getByRole('button',{name:'创建并进入',exact:true}).click();
 await modal.waitFor({state:'hidden'});
 await panel.waitFor({state:'hidden'});
 assert.match(await page.locator('.wk-chat-conversation-header-channel-info').innerText(),/合规与合同/);
 assert.match(await page.locator('.wk-chat-conversation-header-channel-info').innerText(),/新增独立讨论/);

 const row=page.locator('.wk-conversationlist-item').filter({has:page.getByRole('heading',{name:'新增独立讨论',exact:true})});
 await row.waitFor();
 assert.equal(await row.locator('.wk-conv-breadcrumb').count(),0,'新子区作为独立最近会话，不额外显示项目路径行');
 assert.match(await row.getAttribute('class'),/wk-conversationlist-item-selected/);
 const createdId=await page.evaluate(()=>Object.values(window.__topicStore.snapshot().threadDetails).find(thread=>thread.name==='新增独立讨论')?.id);
 assert.ok(createdId);
 await page.reload();
 await page.getByRole('button',{name:'最近',exact:true}).click();
 await page.locator('.wk-conversationlist-item').filter({has:page.getByRole('heading',{name:'新增独立讨论',exact:true})}).waitFor();
 assert.equal(await page.evaluate(id=>window.__topicStore.snapshot().threadDetails[id].status,createdId),1,'新建子区刷新后保留');
 assert.deepEqual(errors,[]);
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
