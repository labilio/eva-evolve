import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('聊天信息全部设置行居中，头像不撑高，悬停不改变几何',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge'});
 try{const p=await browser.newPage({viewport:{width:1200,height:1000}});await p.goto(`http://127.0.0.1:${server.address().port}/#/messages`);await p.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();await p.getByRole('button',{name:'打开聊天信息',exact:true}).last().click();
 const measure=()=>p.locator('.eva-chat-setting-row').evaluateAll(rows=>rows.map(r=>{const center=e=>{const b=e.getBoundingClientRect();return b.y+b.height/2};const label=r.firstElementChild;return {name:label.textContent,height:r.getBoundingClientRect().height,deltas:[...r.querySelectorAll('.eva-chat-setting-value,.eva-chat-setting-value img,.eva-chat-setting-value svg,.semi-switch')].map(e=>center(e)-center(label))};}));
 const before=await measure();for(const row of before){assert.equal(row.height,56,row.name);assert.ok(row.deltas.every(d=>Math.abs(d)<0.6),JSON.stringify(row));}
 await p.getByRole('button',{name:'群头像',exact:true}).hover();assert.deepEqual(await measure(),before);
 const announcement=p.locator('.eva-chat-setting-row').filter({hasText:'群公告'}).locator('.eva-chat-setting-value');await announcement.evaluate(e=>{e.textContent='这是一段用于检查多行公告对齐和自动换行的长文字。'.repeat(5);});assert.ok(await announcement.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 await p.getByRole('button',{name:'关闭聊天信息',exact:true}).click();await p.getByRole('button',{name:'打开聊天信息',exact:true}).last().click();assert.deepEqual(await measure(),before);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
