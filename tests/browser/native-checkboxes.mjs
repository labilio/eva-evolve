import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
test('旧页面交互复选框使用 Semi，并在弹窗关闭和路由离开时卸载',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{}),page=await browser.newPage({viewport:{width:1440,height:1000}}),origin=`http://127.0.0.1:${server.address().port}`,errors=[];
 page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 try{
  for(let i=0;i<2;i++){
   await page.goto(origin+'/#/eva-stub/'+encodeURIComponent('工作板'));
   const archive=page.getByRole('checkbox',{name:'显示已归档'});await page.locator('.eva-board-check .semi-checkbox').click();assert.equal(await archive.isChecked(),true);
   assert.equal(await page.locator('.eva-board-check .semi-checkbox').count(),1);
   await page.evaluate(()=>location.hash='/eva-stub/'+encodeURIComponent('技能'));
   await page.locator('[data-center-toggle="folder"]').click();
   const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await dialog.locator('.semi-checkbox').count(),3);
   assert.equal(await dialog.getByRole('checkbox',{name:'读取基础资料'}).isChecked(),true);
   const write=dialog.getByRole('checkbox',{name:'允许写入或执行操作'});assert.equal(await write.isChecked(),false);await write.focus();await page.keyboard.press('Space');assert.equal(await write.isChecked(),true);
   await dialog.getByRole('button',{name:'取消',exact:true}).click();
   await page.locator('[data-center-toggle="folder"]').click();await dialog.waitFor();assert.equal(await write.isChecked(),false);
   await page.evaluate(()=>location.hash='/collab?evaProject=prod&evaTab=tasks');await page.locator('.loop-board').waitFor();
   assert.equal(await page.locator('.eva-center-modal-layer .semi-checkbox').count(),0);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
