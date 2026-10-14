import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {test} from 'node:test';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('个人 Eva 与我的 Agent 的九条预置任务链接各自原地打开，关闭保留草稿',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/#/conversation/personal-task-quality-review');
  await page.locator('[data-eva-personal-task-link]').first().waitFor();
  const stories=await page.evaluate(()=>window.__EVA_PERSONAL_TASK_STORIES);
  for(const story of stories){
   await page.goto(origin+'/#/conversation/personal-'+story.id);
   const input=page.getByRole('textbox',{name:'向 Eva 同学提问',exact:true});await input.fill('个人会话草稿 '+story.id);
   for(const link of story.taskLinks){
    await page.locator('a[href="'+link.url+'"]').click();await page.locator('.loop-idp__title:visible').waitFor();
    assert.equal(await page.locator('.loop-idp__title:visible').inputValue(),link.label.split(' · ')[1]);
    assert.equal(new URL(page.url()).hash,'#/conversation/personal-'+story.id);
    assert.equal(await page.locator('.eva-task-detail-host').count(),1);
    await page.getByRole('button',{name:'关闭任务详情',exact:true}).click();
    assert.equal(await input.inputValue(),'个人会话草稿 '+story.id);
   }
  }
  await page.goto(origin+'/#/messages?evaIM=my-ai');
  await page.getByText('展开查看',{exact:true}).first().click();
  for(const story of stories){
   await page.getByRole('button',{name:story.name,exact:true}).click();
   const input=page.locator('[contenteditable=true][role=textbox]').first();await input.fill('Agent 会话草稿 '+story.id);
   for(const link of story.taskLinks){
    await page.locator('a[href="'+link.url+'"]').click();await page.locator('.loop-idp__title:visible').waitFor();
    assert.equal(await page.locator('.loop-idp__title:visible').inputValue(),link.label.split(' · ')[1]);
    assert.equal(new URL(page.url()).hash,'#/messages?evaIM=my-ai');
    await page.getByRole('button',{name:'关闭任务详情',exact:true}).click();
    assert.equal(await input.innerText(),'Agent 会话草稿 '+story.id);
   }
  }
  await page.screenshot({path:'/tmp/eva-agent-task-links.png',animations:'disabled'});
  await page.evaluate(()=>{
   const key='eva:my-ai-groups:v2',data=JSON.parse(localStorage.getItem(key)),group=data.groups.find(g=>g.system);
   group.threads=group.threads.filter(t=>!t.id.includes('____demo-task-'));
   delete group.taskReferenceStoriesV1;
   group.draft='旧版小队草稿保留';group.threads[0].name='我改过的子区名称';
   localStorage.setItem(key,JSON.stringify(data));
  });
  await page.reload();await page.locator('[contenteditable=true][role=textbox]').first().waitFor();
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('eva:my-ai-groups:v2')).groups.find(g=>g.system));
  assert.equal(restored.draft,'旧版小队草稿保留');assert.equal(restored.threads[0].name,'我改过的子区名称');
  assert.equal(restored.threads.filter(t=>t.id.includes('____demo-task-')).length,3);
  await page.evaluate(()=>{
   const key='eva:my-ai-groups:v2',data=JSON.parse(localStorage.getItem(key));
   data.groups.find(g=>g.system).threads.find(t=>t.id.includes('____demo-task-')).deleted=true;
   localStorage.setItem(key,JSON.stringify(data));
  });
  await page.reload();await page.locator('[contenteditable=true][role=textbox]').first().waitFor();
  const again=await page.evaluate(()=>JSON.parse(localStorage.getItem('eva:my-ai-groups:v2')).groups.find(g=>g.system));
  assert.equal(again.threads.filter(t=>t.id.includes('____demo-task-')).length,3);
  assert.equal(again.threads.filter(t=>t.id.includes('____demo-task-')&&!t.deleted).length,2);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
