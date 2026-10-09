// Current contract: the compact popup was reverted; management lives in the header.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge'});
try {
 const page=await browser.newPage({viewport:{width:1200,height:800}});
 await page.goto(`http://127.0.0.1:${server.address().port}/#/messages?evaDM=supply-many-topics-demo`);
 const nav=page.locator('.eva-recent-topic-tabs');await nav.getByRole('tab',{name:'主聊天',exact:true}).waitFor();
 assert.equal(await nav.getByRole('tab').count(),13);
 assert.equal(await nav.getByRole('button',{name:'子区列表',exact:true}).count(),0);
 await nav.getByRole('tab',{name:/关键件交期跟踪/}).click();
 await page.waitForTimeout(600);
 const geometry=await page.locator('.eva-topic-scroll').evaluate(el=>{const v=el.getBoundingClientRect(),m=el.querySelector('[role=tab]').getBoundingClientRect(),t=el.querySelector('[aria-selected=true]').getBoundingClientRect();return {left:m.left,edge:v.left,center:t.left+t.width/2,expected:m.right+(v.right-m.right)/2};});
 assert.ok(Math.abs(geometry.left-geometry.edge)<2);assert.ok(Math.abs(geometry.center-geometry.expected)<3);
 await page.setViewportSize({width:850,height:800});await page.waitForTimeout(200);
 assert.equal(await nav.getByRole('tab').count(),13,'滚动不卸载子区');
 await nav.getByRole('tab',{name:'主聊天',exact:true}).click();await page.getByRole('button',{name:'关注',exact:true}).click();assert.equal(await nav.count(),0);
 console.log('PASS header picker, smooth centering, fixed main, narrow scroll, Following boundary');
} finally {await browser.close();await new Promise(r=>server.close(r));}
