import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
test('项目使用帮助跟随页签；订阅用状态反馈并清理旧教学入口',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),origin=`http://127.0.0.1:${server.address().port}`,errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await context.route('https://eva-ai-docs.vercel.app/**',route=>route.fulfill({contentType:'text/html',body:'<h1>使用指南</h1>'}));
 const help=()=>page.locator('.collab-tabs .eva-project-help');
 try{
 await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks&evaTask=SC-126');
 const sub=page.locator('.loop-idp__topbar .eva-task-subscription');await sub.click();assert.equal(await sub.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.semi-toast-content').count(),0);
 await sub.click();assert.equal(await sub.getAttribute('aria-pressed'),'false');assert.equal(await page.locator('.semi-toast-content').count(),0);
 await page.getByRole('button',{name:'更多操作',exact:true}).click();await page.getByRole('menuitem',{name:'复制任务链接',exact:true}).waitFor();assert.equal(await page.getByRole('menuitem',{name:'订阅说明',exact:true}).count(),0);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'关闭任务详情',exact:true}).click();
 const cases=[['任务','team/projects#项目任务'],['群聊','team/messages'],['文件','resources/files'],['自动化','team/projects#project-automation'],['项目信息','team/projects#project-info'],['项目设置','team/projects#项目成员']];
 for(const [label,path] of cases){
  await page.locator('.collab-tabs__list').getByRole('tab',{name:new RegExp('^'+label)}).click();await help().waitFor();
  assert.equal(await help().count(),1);assert.equal(decodeURI(await help().getAttribute('href')),'https://eva-ai-docs.vercel.app/'+path);
  assert.equal(await help().getAttribute('target'),'_blank');assert.equal(await help().locator('.lucide-circle-question-mark').count(),1);
 }
 await page.locator('.collab-tabs__list').getByRole('tab',{name:/^任务/}).click();
 const opened=context.waitForEvent('page');await help().focus();await page.keyboard.press('Enter');const doc=await opened;await doc.waitForLoadState();assert.equal(decodeURI(doc.url()),'https://eva-ai-docs.vercel.app/team/projects#项目任务');await doc.close();
 await page.getByRole('button',{name:'我订阅的',exact:true}).click();assert.equal(await page.locator('.eva-task-subscription-help').count(),0);
 await page.mouse.move(0,0);await page.locator('.collab-tabs').screenshot({path:'/tmp/eva-context-help-light.png'});
 await page.setViewportSize({width:1000,height:740});await page.evaluate(()=>window.EvaTheme.apply('dark'));await help().click({trial:true});
 const hb=await help().boundingBox(),tabs=await page.locator('.collab-tabs__list').boundingBox();assert.ok(hb.x>=tabs.x+tabs.width-1);assert.ok(hb.x+hb.width<=1000);
 await page.locator('.collab-tabs').screenshot({path:'/tmp/eva-context-help-dark.png'});
 await page.reload();await help().waitFor();assert.equal(await help().count(),1);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
