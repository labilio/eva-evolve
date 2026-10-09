import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('子区 GROUP.md 保存刷新、取消和父群往返隔离',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch({channel:'msedge'});
 try{const page=await browser.newPage({viewport:{width:1200,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/#/messages');
 const open=async()=>{await page.locator('.ch-list').getByText('招投标文件评审',{exact:true}).first().click();await page.locator('.ch-head .ops .op').last().click();await page.locator('.eva-thread-settings').getByRole('button',{name:/^GROUP.md/}).click();};
 await open();let doc=page.getByRole('dialog',{name:'子区 GROUP.md',exact:true});await doc.getByRole('tab',{name:'编辑',exact:true}).click();await doc.getByRole('textbox',{name:'GROUP.md 内容'}).fill('子区独立约定');await doc.getByRole('button',{name:'保存',exact:true}).click();
 await doc.getByRole('tab',{name:'预览',exact:true}).click();await doc.locator('.eva-group-md-preview').getByText('子区独立约定',{exact:true}).waitFor();
 await doc.getByRole('tab',{name:'编辑',exact:true}).click();await doc.getByRole('textbox',{name:'GROUP.md 内容'}).fill('不应保存');await doc.getByRole('button',{name:'返回子区信息'}).click();await page.locator('.eva-thread-settings').getByRole('button',{name:/^GROUP.md/}).click();assert.equal(await doc.getByRole('textbox',{name:'GROUP.md 内容'}).inputValue(),'子区独立约定');
 await doc.getByRole('textbox',{name:'GROUP.md 内容'}).fill('汉'.repeat(3414));assert.equal(await doc.getByRole('button',{name:'保存',exact:true}).isDisabled(),true);
 await page.reload();await open();assert.equal(await doc.getByRole('textbox',{name:'GROUP.md 内容'}).inputValue(),'子区独立约定');await page.screenshot({path:'/tmp/eva-thread-group-md.png'});
 await doc.getByRole('button',{name:'返回子区信息'}).click();await page.getByRole('button',{name:'关闭子区信息'}).click();await page.locator('.ch-list').getByText('采购与招投标',{exact:true}).first().click();await page.getByRole('button',{name:'打开聊天信息',exact:true}).last().click();const panel=page.locator('.eva-chat-settings');await panel.getByRole('button',{name:/^GROUP.md/}).click();assert.notEqual(await panel.getByRole('textbox',{name:'GROUP.md 内容'}).inputValue(),'子区独立约定');assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
