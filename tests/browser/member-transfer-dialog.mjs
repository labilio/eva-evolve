import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('项目负责人转让沿用单人表单，确认后不叠加二次弹窗',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=settings`);
  await page.getByRole('tab',{name:'成员管理',exact:true}).click();
  await page.getByRole('button',{name:'转让',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'转让项目负责人'});
  await dialog.waitFor();
  assert.equal(await dialog.locator('.eva-transfer-current').count(),0);
  assert.equal(await dialog.locator('.eva-picker-row .semi-radio').count()>0,true);
  assert.equal(await dialog.getByRole('textbox',{name:'搜索可选成员'}).count(),1);
  await dialog.screenshot({path:'/tmp/eva-transfer-project.png'});
  await dialog.getByRole('button',{name:'确认转让'}).click();
  await dialog.getByText('请选择 1 位接任者',{exact:true}).waitFor();
  const candidate=dialog.locator('.eva-picker-row').filter({hasText:'苏航'}).first();
  await candidate.click();
  await dialog.getByRole('button',{name:'确认转让'}).click();
  await dialog.waitFor({state:'hidden'});
  assert.equal(await page.locator('.semi-modal:visible').count(),0);
  assert.match(await page.getByRole('row').filter({has:page.getByText('苏航',{exact:true})}).innerText(),/负责人/);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
