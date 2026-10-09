import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('会话文件保存：选择目标项目、保存成功、打开位置与刷新读取',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/#/messages`);
  // Forward an existing accessible supply attachment within this isolated local prototype.
  await page.locator('.wk-message-file-name').filter({hasText:'A-2409现场复核清单.md'}).click({button:'right'});
  await page.getByText('转发',{exact:true}).click();await page.locator('.eva-fp-modal').waitFor();
  await page.locator('.eva-forward-search input').fill('高志远');
  await page.locator('.eva-fp-row').filter({hasText:'高志远'}).first().locator('input[type=checkbox]').check();
  await page.locator('.eva-fp-modal').getByRole('button',{name:'发送',exact:true}).click();await page.locator('.eva-fp-modal').waitFor({state:'detached'});
  await page.getByText('高志远',{exact:true}).first().click();
  await page.locator('.wk-message-file-name').filter({hasText:'A-2409现场复核清单.md'}).click({button:'right'});
  await page.getByText('存到文件库',{exact:true}).click();
  const modal=page.locator('.eva-file-save-modal .semi-modal-content');
  await modal.getByLabel('目标文件库',{exact:true}).click();
  await page.getByRole('option').filter({hasText:/^供应链运营协同$/}).click();
  await modal.getByText('保存后，目标文件库成员可访问该文件',{exact:true}).waitFor();
  await modal.getByRole('button',{name:'确认保存',exact:true}).click();
  await modal.getByText('保存成功',{exact:true}).waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('eva:file-store:v7')).records.filter(item=>item.spaceId==='prod'&&item.source?.type==='chat-copy'&&item.sourceFileName==='A-2409现场复核清单.md'));
  assert.equal(saved.length,1,'同一次提交只保存一份来源明确的独立文件');
  await modal.getByRole('button',{name:'打开所在位置',exact:true}).click();await modal.waitFor({state:'hidden'});
  await page.locator('#eva-drive-root').getByText(saved[0].name,{exact:true}).first().waitFor();
  await page.reload();await page.locator('#eva-drive-root [data-drive-scope=workspace][data-workspace-id=prod]').first().click();await page.locator('#eva-drive-root').getByText(saved[0].name,{exact:true}).first().waitFor();
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
