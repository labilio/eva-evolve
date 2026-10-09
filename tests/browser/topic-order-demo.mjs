import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 await page.goto(`http://127.0.0.1:${server.address().port}/#/messages?evaDM=supply-many-topics-demo`);
 const nav=page.locator('.eva-recent-topic-tabs');await nav.getByRole('tab',{name:'主聊天',exact:true}).waitFor();
 const ids=await nav.locator('[data-eva-topic-id]').evaluateAll(ns=>ns.map(n=>n.dataset.evaTopicId));
 assert.deepEqual(ids.slice(1,7),['supply-many-topic-01','supply-many-topic-03','supply-many-topic-18','supply-many-topic-06','supply-many-topic-08','supply-many-topic-04']);
 const muted=nav.locator('[data-eva-topic-id="supply-many-topic-06"]');assert.equal(await muted.locator('.is-muted').innerText(),'5');
 assert.equal(await nav.locator('[data-eva-topic-id="supply-many-topic-01"] .eva-topic-pin').count(),1);
 await muted.click();await page.getByText('第一批运单已生成，预计明天 10 点到厂。后续物流节点继续在本子区更新。',{exact:true}).waitFor();
 assert.equal(await muted.locator('.is-muted').innerText(),'5');
 await page.screenshot({path:'/tmp/eva-topic-order-demo.png'});
 await page.reload();await nav.getByRole('tab',{name:/关键件交期跟踪/}).click();await page.getByText('第一批运单已生成，预计明天 10 点到厂。后续物流节点继续在本子区更新。',{exact:true}).waitFor();assert.equal(await page.getByText('第一批运单已生成，预计明天 10 点到厂。后续物流节点继续在本子区更新。',{exact:true}).count(),1);
 console.log('PASS demo order, pinned icon, muted unread, messages, reload without duplicates');
}finally{await browser.close();await new Promise(r=>server.close(r));}
