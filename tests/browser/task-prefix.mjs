import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：前缀变更同步编号，旧编号链接与稳定 ID 链接仍打开原任务',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/#/collab?evaProject=prod&evaTab=settings');
  const input=page.getByRole('textbox',{name:'任务前缀'});
  await input.waitFor();
  assert.equal(await input.inputValue(),'SC');
  await input.fill('TEST1');
  assert.equal(await input.inputValue(),'TEST','数字不进入前缀输入框');
  await page.getByRole('button',{name:'保存修改'}).click();
  await page.getByText('确认修改任务前缀？').waitFor();
  await page.locator('button').filter({hasText:'确认修改'}).click();
  await page.getByText('项目信息已保存').waitFor();
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('eva-collab-spaces')).find(item=>item.id==='prod'));
  assert.equal(persisted.issue_prefix,'TEST');
  assert.ok(persisted.issue_prefix_history.includes('SC'));
  await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks&evaTask=SC-103');
  await page.locator('.loop-idp__title').waitFor();
  assert.equal(await page.locator('.loop-idp__crumb-cur .loop-idp__crumb-id').textContent(),'TEST-103');
  await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks&evaTask=supply-3');
  await page.locator('.loop-idp__title').waitFor();
  assert.equal(await page.locator('.loop-idp__crumb-cur .loop-idp__crumb-id').textContent(),'TEST-103');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test('Edge：新项目默认拼音前缀，撞名延长且输入拒绝数字与连字符',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/#/collab');
  for(const expected of ['GYLY','GYLYY']){
   await page.getByRole('button',{name:'新建项目'}).click();
   const dialog=page.getByRole('dialog').filter({hasText:'新建项目'});
   await dialog.getByRole('textbox',{name:'项目名称'}).fill('供应链运营协同');
   const input=dialog.getByRole('textbox',{name:'任务前缀'});
   assert.equal(await input.inputValue(),expected);
   await input.fill(expected+'-9');
   assert.equal(await input.inputValue(),expected);
   await dialog.locator('.eva-member-picker__candidate').first().click();
   await dialog.getByRole('button',{name:'创建并进入项目'}).click();
   const current=await page.evaluate(()=>JSON.parse(localStorage.getItem('eva-collab-spaces')).at(-1));
   assert.equal(current.issue_prefix,expected);
   await page.goto(origin+'/#/collab');
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
