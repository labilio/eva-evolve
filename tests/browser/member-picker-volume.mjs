import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('300 联系人：搜索、末尾勾选、分类往返和刷新保留',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(origin+'/#/messages');
  async function openContacts(){
   await page.getByRole('button',{name:'新建',exact:true}).click();
   await page.getByRole('menuitem',{name:'新建群聊',exact:true}).click();
   await page.getByRole('dialog').getByRole('button',{name:/^联系人/}).click();
  }
  await openContacts();
  const dialog=page.getByRole('dialog'),rows=dialog.locator('.eva-member-picker__candidate');
  assert.equal(await rows.count(),300);
  const bytes=await page.evaluate(()=>new TextEncoder().encode(JSON.stringify(window.__EVA_PEOPLE)).length);
  const last=rows.last();
  await last.scrollIntoViewIfNeeded();
  const name=await last.getByRole('checkbox').getAttribute('aria-label');
  await last.click();
  assert.equal(await dialog.locator('.eva-member-picker__selected-item').count(),2);
  const search=dialog.getByRole('textbox',{name:'搜索可选成员'});
  const start=performance.now();
  await search.fill(name.replace(/^选择/,''));
  assert.equal(await rows.count(),1);
  assert.equal(await rows.first().getByRole('checkbox').isChecked(),true);
  console.log(JSON.stringify({contacts:300,peopleJsonBytes:bytes,searchAutomationMs:Math.round(performance.now()-start)}));
  await search.fill('');
  assert.equal(await rows.count(),300);
  await dialog.getByRole('link',{name:'全部'}).click();
  assert.equal(await dialog.locator('.eva-member-picker__selected-item').count(),2);
  await dialog.getByRole('button',{name:/^联系人/}).click();
  await page.screenshot({path:'/tmp/eva-member-picker-300.png'});
  await dialog.getByRole('button',{name:'取消',exact:true}).click();
  await page.reload();
  await openContacts();
  assert.equal(await rows.count(),300,'刷新不重复灌入');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
