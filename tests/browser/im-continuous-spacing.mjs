import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('左右连续消息间距一致，多选不改变几何',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const b=await chromium.launch({channel:'msedge'});
 try{const p=await b.newPage({viewport:{width:1200,height:800}});await p.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());await p.goto(origin+'/#/messages');await p.getByRole('button',{name:'01 日常聊天与连续消息',exact:true}).click();
 const rows=p.locator('.eva-im-bubble-row');await rows.first().waitFor();
 const measure=()=>rows.evaluateAll(es=>[es.slice(0,4),es.slice(4,8)].map(group=>group.slice(1).map((row,i)=>row.querySelector('.wk-msg-row-body').getBoundingClientRect().top-group[i].querySelector('.wk-msg-row-body').getBoundingClientRect().bottom)));
 const before=await measure();for(const gaps of before){assert.ok(gaps.every(g=>Math.abs(g-12)<1),JSON.stringify(gaps));}
 await rows.first().click({button:'right'});await p.locator('.wk-contextmenus-open').getByText('多选',{exact:true}).click();await rows.nth(1).click();assert.deepEqual(await measure(),before);
 await p.keyboard.press('Escape');await p.screenshot({path:'/tmp/eva-continuous-spacing-fixed.png'});
 await p.reload();await p.getByRole('button',{name:'01 日常聊天与连续消息',exact:true}).click();await rows.first().waitFor();assert.equal(await rows.count(),14,'演示数据刷新不重复');
 }finally{await b.close();await new Promise(r=>server.close(r));}
});
