import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('recent pins precede newer conversations; threads use their own preference',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  await page.goto(`http://127.0.0.1:${server.address().port}/#/messages`);
  await page.locator('.eva-follow-category').first().waitFor();
  await page.getByRole('button',{name:'最近',exact:true}).click();
  const names=()=>page.locator('.wk-conversationlist-item h3').allTextContents();
  assert.deepEqual((await names()).slice(0,3),['近期体验反馈整理','采购与招投标','本季度间接采购需求']);
  assert.equal(await page.locator('.eva-recent-conversation-pinned').count(),1,'only parent pin gets a background');
  await page.evaluate(()=>{const s=window.__evaGetFileContext().store;s.setChatPreferences('th-msg-architecture',s.snapshot().actorId,{top:false});});
  await page.waitForFunction(()=>document.querySelectorAll('.wk-conversationlist-item h3')[2]?.textContent==='EVA + OCTO 融合推进群');
  assert.deepEqual((await names()).slice(0,3),['近期体验反馈整理','采购与招投标','EVA + OCTO 融合推进群']);
  await page.reload();await page.locator('.eva-follow-category').first().waitFor();
  assert.equal(await page.locator('.eva-recent-conversation-pinned').count(),0,'follow does not gain recent styling');
  await page.getByRole('button',{name:'最近',exact:true}).click();
  assert.deepEqual((await names()).slice(0,3),['近期体验反馈整理','采购与招投标','EVA + OCTO 融合推进群']);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
