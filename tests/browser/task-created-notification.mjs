import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import path from 'node:path';

test('真实任务创建：唯一通知、查看详情、转发及取消',async()=>{
 const server=createServer(path.resolve('dist'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1440,height:900}});
 page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=`http://127.0.0.1:${server.address().port}`,project=base+'/#/collab?evaProject=prod&evaTab=tasks',notice=page.locator('.eva-notification');
 const create=async title=>{
  await page.getByRole('button',{name:'新建任务',exact:true}).click();
  const modal=page.locator('.eva-loop-task-create .semi-modal-content');await modal.waitFor();
  await modal.getByRole('textbox',{name:'任务标题',exact:true}).fill(title);
  await modal.getByRole('button',{name:'创建',exact:true}).click();await modal.waitFor({state:'hidden'});
  await notice.waitFor();await notice.hover();assert.equal(await notice.count(),1);
  assert.match(await notice.innerText(),new RegExp('SC-\\d+ '+title));
  assert.equal(await notice.locator('.semi-icon-tick_circle').count(),1);
  assert.equal(await notice.locator('.semi-icon-close').count(),1);
 };
 try{
 await page.goto(project);await create('核对通知查看链路');
 const gaps=await notice.evaluate(e=>{const title=e.querySelector('.semi-notification-notice-title'),content=e.querySelector('.semi-notification-notice-content'),links=[...e.querySelectorAll('a')];return [parseFloat(getComputedStyle(title).marginBottom),parseFloat(getComputedStyle(content.lastElementChild).marginTop),links[1].getBoundingClientRect().left-links[0].getBoundingClientRect().right];});
 assert.deepEqual(gaps,[8,8,20]);
 await page.screenshot({path:'/tmp/eva-task-created-real.png'});
 const href=await notice.getByRole('link',{name:'查看任务'}).getAttribute('href');
 assert.match(href,/evaTask=issue-prod-/);
 await notice.getByRole('link',{name:'查看任务'}).click();await notice.waitFor({state:'hidden'});
 await page.locator('.loop-idp').waitFor();assert.match(await page.locator('.loop-idp').innerText(),/核对通知查看链路/);
 await page.goto(project);await create('核对通知转发链路');
 const taskUrl=await notice.getByRole('link',{name:'查看任务'}).getAttribute('href');
 await notice.getByRole('link',{name:'转发'}).click();
 const dialog=page.getByRole('dialog',{name:'转发任务',exact:true});await dialog.waitFor();await notice.waitFor({state:'hidden'});
 await dialog.getByRole('textbox',{name:'搜索转发目标'}).fill('林晓');
 await dialog.locator('.eva-fp-row').filter({hasText:'林晓'}).first().click();
 await page.screenshot({path:'/tmp/eva-task-forward-real.png'});
 await dialog.getByRole('button',{name:'发送',exact:true}).click();await dialog.waitFor({state:'hidden'});
 const sent=await page.evaluate(()=>{const s=window.__evaGetFileContext().store;return s.directMessages(s.actorId());});
 assert.ok(Object.values(sent).some(rows=>rows.some(m=>m.text===taskUrl)),'转发真实任务稳定链接');
 await create('核对通知转发取消');await notice.getByRole('link',{name:'转发'}).click();await dialog.waitFor();
 const before=await page.evaluate(()=>JSON.stringify(window.__evaGetFileContext().store.directMessages(window.__evaGetFileContext().store.actorId())));
 await dialog.getByRole('button',{name:'取消',exact:true}).click();await dialog.waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__evaGetFileContext().store.directMessages(window.__evaGetFileContext().store.actorId()))),before);
 const target=Object.entries(sent).find(([,rows])=>rows.some(m=>m.text===taskUrl))[0];
 await page.goto(base+'/#/messages?evaDM='+encodeURIComponent(target));
 const taskId=new URLSearchParams(taskUrl.split('?')[1]).get('evaTask');
 const sharedLink=page.locator('[data-eva-task-link="'+taskId+'"]');await sharedLink.waitFor();
 await sharedLink.click();await page.locator('.eva-inline-project-panel .loop-idp__title').waitFor();
 assert.match(await page.locator('.eva-inline-project-panel .loop-idp__title').inputValue(),/核对通知转发链路/);
 assert.match(page.url(),/#\/messages/);
 assert.deepEqual(errors,[]);
 }catch(error){console.error(await page.locator('body').innerText());throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('看板列、子任务、聊天创建均使用同一通知；空提交和取消不通知',async()=>{
 const server=createServer(path.resolve('dist'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1440,height:900}});
 page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=`http://127.0.0.1:${server.address().port}`,project=base+'/#/collab?evaProject=prod&evaTab=tasks';
 const notice=page.locator('.eva-notification'),modal=page.locator('.eva-loop-task-create .semi-modal-content');
 const save=async title=>{await modal.waitFor();await modal.getByRole('textbox',{name:'任务标题',exact:true}).fill(title);await modal.getByRole('button',{name:'创建',exact:true}).click();await modal.waitFor({state:'hidden'});await notice.waitFor();await notice.hover();assert.equal(await notice.count(),1);assert.match(await notice.innerText(),new RegExp('SC-\\d+ '+title));assert.equal(await page.locator('.semi-toast').count(),0);};
 try{
 await page.goto(project);await page.getByRole('button',{name:'新建任务',exact:true}).click();await modal.waitFor();
 await modal.getByRole('button',{name:'创建',exact:true}).click();await modal.getByText('请填写任务标题',{exact:true}).waitFor();assert.equal(await notice.count(),0);
 await page.keyboard.press('Escape');await modal.waitFor({state:'hidden'});assert.equal(await notice.count(),0);
 await page.getByRole('button',{name:'在进行中新建任务',exact:true}).click();await save('看板状态通知验收');
 await notice.getByRole('link',{name:'查看任务'}).click();await page.locator('.loop-idp').waitFor();assert.match(await page.locator('.loop-idp').innerText(),/进行中/);
 await page.getByRole('button',{name:'添加子任务',exact:true}).click();await save('子任务通知验收');
 await notice.getByRole('link',{name:'查看任务'}).click();await page.waitForFunction(()=>document.querySelector('.loop-idp__title')?.value==='子任务通知验收');
 await page.goto(base+'/#/collab?evaProject=prod&evaTab=channels');await page.getByRole('button',{name:'查看聊天任务',exact:true}).click();
 const composer=page.locator('[contenteditable=true][role=textbox]').first();await composer.fill('保留当前会话草稿');
 await page.locator('.eva-chat-task-list').getByRole('button',{name:'新建任务',exact:true}).click();await save('聊天创建通知验收');
 assert.equal(page.url(),base+'/#/collab?evaProject=prod&evaTab=channels');assert.equal(await composer.innerText(),'保留当前会话草稿');
 await notice.getByRole('link',{name:'转发'}).click();await page.getByRole('dialog',{name:'转发任务',exact:true}).waitFor();await page.getByRole('button',{name:'取消',exact:true}).click();
 assert.equal(await composer.innerText(),'保留当前会话草稿');assert.deepEqual(errors,[]);
 }catch(error){console.error(await page.locator('body').innerText());throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
});
