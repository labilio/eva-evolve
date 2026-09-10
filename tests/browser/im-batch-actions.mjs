import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('多选栏：合并记录、删除确认、刷新保留',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const b=await chromium.launch({channel:'msedge'});
 try{const p=await b.newPage({viewport:{width:1200,height:800}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());await p.goto(origin+'/#/messages');await p.getByRole('button',{name:'05 文件样式展示',exact:true}).click();const rows=p.locator('.eva-im-bubble-row');await rows.first().click({button:'right'});await p.locator('.wk-contextmenus-open').getByText('多选',{exact:true}).click();await rows.nth(1).getByRole('checkbox').click();
 await p.screenshot({path:'/tmp/eva-batch-three-actions.png'});
 await p.getByRole('button',{name:'合并转发',exact:true}).click();await p.getByRole('radio',{name:'IM 气泡验证 / 01 普通对话与连续消息',exact:true}).check();await p.getByRole('button',{name:'确认转发',exact:true}).click();await p.getByRole('region',{name:'消息多选'}).waitFor({state:'detached'});
 await p.getByRole('button',{name:'01 普通对话与连续消息',exact:true}).click();const card=p.locator('.eva-im-merged-history').last();await card.locator('summary').click();assert.equal(await card.locator('.eva-im-merged-items section').count(),2);assert.match(await card.innerText(),/A-2409现场复核清单.md/);
 await p.getByRole('button',{name:'05 文件样式展示',exact:true}).click();const count=await rows.count();await rows.first().click({button:'right'});await p.locator('.wk-contextmenus-open').getByText('多选',{exact:true}).click();await p.getByRole('button',{name:'删除',exact:true}).click();await p.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await rows.count(),count);await p.getByRole('button',{name:'删除',exact:true}).click();await p.getByRole('button',{name:'确认删除',exact:true}).click();assert.equal(await rows.count(),count-1);await p.reload();await p.getByRole('button',{name:'05 文件样式展示',exact:true}).click();assert.equal(await rows.count(),count-1);assert.deepEqual(errors,[]);
 }finally{await b.close();await new Promise(r=>server.close(r));}
});
