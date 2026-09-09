import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('历史子区提及保留 IM 样式与身份点击',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'msedge'});
 try{const page=await browser.newPage({viewport:{width:1200,height:800}});await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());await page.goto(origin+'/#/messages');
 await page.getByRole('button',{name:'本季度间接采购需求',exact:true}).click();
 const mention=page.locator('.mention-entity').filter({hasText:'王宜林'}).first();await mention.waitFor();
 assert.equal(await mention.innerText(),'@王宜林的 AI 分身');
 const style=await mention.evaluate(e=>({color:getComputedStyle(e).color,body:getComputedStyle(e.closest('.wk-msg-row-body')).color}));assert.notEqual(style.color,style.body);
 await mention.click();await page.getByRole('button',{name:'所属人：王宜林',exact:true}).waitFor();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
