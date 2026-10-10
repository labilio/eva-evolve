import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
try {
 const page=await browser.newPage({viewport:{width:1200,height:800}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.__evaMessageReads=[];window.__evaSwitchFrames=[];window.__evaSnapshotReads=0;
  let membership;
  Object.defineProperty(window,'EvaMembership',{configurable:true,get:()=>membership,set:api=>{membership={...api,bootstrap(...args){const store=api.bootstrap(...args),read=store.messagesFor;const snapshot=store.snapshot;store.snapshot=function(...args){window.__evaSnapshotReads++;return snapshot.apply(store,args);};store.messagesFor=function(id,...rest){window.__evaMessageReads.push(id);return read.call(store,id,...rest);};return store;}};}});
  document.addEventListener('click',()=>{const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>window.__evaSwitchFrames.push(performance.now()-start)));},true);
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/#/messages`);
 await page.getByRole('button',{name:'打开聊天信息',exact:true}).last().click();
 await page.waitForTimeout(100);
 assert.deepEqual(errors,[],'聊天信息不得产生运行时错误');
 await page.locator('.eva-chat-settings').waitFor();
 await page.getByRole('button',{name:'关闭聊天信息',exact:true}).click();
 await page.getByRole('button',{name:'最近',exact:true}).click();
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const measure=async(locator,allowed)=>{
  await settle();await page.evaluate(()=>{window.__evaMessageReads=[];window.__evaSwitchFrames=[];window.__evaSnapshotReads=0;});
  await locator.click();await settle();
  const result=await page.evaluate(()=>({reads:window.__evaMessageReads,frameMs:window.__evaSwitchFrames,snapshotReads:window.__evaSnapshotReads}));
  assert.deepEqual([...new Set(result.reads)].filter(id=>!allowed.includes(id)),[],'切换选中项不得重算无关群及子区的消息摘要');
  assert.equal(result.snapshotReads,0,'切换会话不得深拷贝全量业务状态');
  console.log(JSON.stringify({allowed,...result}));
 };
 for(const mode of ['关注','最近','关注','最近'])await measure(page.getByRole('button',{name:mode,exact:true}),['all:prod']);
 await measure(page.getByRole('heading',{name:'采购与招投标',exact:true}),['all:prod','c-eva']);
 await measure(page.getByRole('heading',{name:'质量与排产',exact:true}),['c-eva','c-review']);
 await measure(page.getByRole('heading',{name:'采购与招投标',exact:true}),['c-review','c-eva']);
 const topic=page.getByRole('navigation',{name:'群聊子区'}).getByRole('tab').nth(1);
 const topicName=await topic.innerText();
 // Select the topic once to discover its existing business ID from the actual read.
 await settle();await page.evaluate(()=>window.__evaMessageReads=[]);await topic.click();await settle();
 const topicIds=await page.evaluate(()=>[...new Set(window.__evaMessageReads)]);
 assert.ok(topicIds.length<=2,'子区切换只读取当前/目标会话');
 await measure(page.getByRole('tab',{name:/^主聊天/}),['c-eva',...topicIds]);
 await measure(topic,['c-eva',...topicIds]);
 await page.getByRole('button',{name:'打开子区信息',exact:true}).last().click();
 await page.getByText('查看全部', {exact:false}).filter({hasNot:page.locator('svg')}).first().waitFor();
 assert.deepEqual(errors,[],'子区信息不得产生运行时错误');
 await page.getByRole('button',{name:'关注',exact:true}).click();await settle();
 await measure(page.getByRole('button',{name:'拖动排序：质量与排产 质量与排产 99+ 收起子区',exact:true}),['all:prod','c-review']);
 await page.getByRole('button',{name:'最近',exact:true}).click();
 await page.getByRole('heading',{name:'采购与招投标',exact:true}).click();
 await page.getByRole('textbox',{name:'发送给 采购与招投标',exact:true}).fill('性能回归：发送后摘要必须更新');
 await settle();await page.evaluate(()=>window.__evaMessageReads=[]);
 await page.getByRole('textbox',{name:'发送给 采购与招投标',exact:true}).press('Enter');
 await page.locator('.wk-conversationlist-item').filter({has:page.getByRole('heading',{name:'采购与招投标',exact:true})}).getByText(/性能回归：发送后摘要必须更新/).waitFor();
 await settle();assert.deepEqual(await page.evaluate(()=>[...new Set(window.__evaMessageReads)].filter(id=>id!=='c-eva')),[],'新消息只重新读取所属会话，不扫描其他群历史');
 assert.deepEqual(errors,[]);
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
