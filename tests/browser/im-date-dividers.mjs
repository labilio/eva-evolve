import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('统一 IM 日期胶囊覆盖关注、最近、项目群与我的 AI，归档正文不拼时间',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{const p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const check=async()=>{await p.locator('.ch-stream .wk-message-time-box').first().waitFor();assert.equal(await p.locator('.ch-stream').first().evaluate(e=>e.firstElementChild.className),'wk-message-time-box');};
 await p.goto(origin+'/#/messages');await check();
 await p.getByRole('button',{name:'最近',exact:true}).click();await check();
 await p.getByRole('heading',{name:'采购与招投标',exact:true}).click();await check();
 await p.getByRole('navigation',{name:'群聊子区'}).getByRole('tab').nth(1).click();await check();
 await p.getByRole('tab',{name:/^主聊天/}).click();await check();
 await p.goto(origin+'/#/collab?evaProject=prod&evaTab=channels');await check();
 await p.evaluate(()=>{const s=window.__evaGetFileContext().store;s.setProjectArchived('prod',s.actorId(),true);s.setProjectArchived('prod',s.actorId(),false);});
 await p.goto(origin+'/#/collab?evaProject=prod&evaTab=channels');
 const record=p.locator('.wk-msg-system-tag-text').filter({hasText:'王宜林归档了项目'});await record.waitFor();assert.equal(await record.innerText(),'王宜林归档了项目');
 const today=await p.evaluate(()=>new Date().toLocaleDateString('zh-CN',{month:'short',day:'numeric'}));
 assert.equal(await p.locator('.ch-stream .wk-message-time').filter({hasText:today}).count(),1);
 for(const width of [1280,1000]){
  await p.setViewportSize({width,height:900});
  const centers=await p.evaluate(()=>{const center=e=>{const r=e.getBoundingClientRect();return r.x+r.width/2;};return {date:center([...document.querySelectorAll('.ch-stream .wk-message-time')].at(-1)),system:center([...document.querySelectorAll('.ch-stream .wk-msg-system-tag')].at(-1)),stream:center(document.querySelector('.ch-stream'))};});
  assert.ok(Math.abs(centers.date-centers.system)<1,JSON.stringify(centers));
  assert.ok(Math.abs(centers.date-centers.stream)<1,JSON.stringify(centers));
 }
 await record.scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/eva-im-date-dividers.png'});
 // Reproduce data saved by the older all-members-only preview, then reload.
 await p.evaluate(()=>{const s=window.__evaGetFileContext().store,state=s.snapshot();for(const event of state.projects.prod.archiveEvents)delete event.messageScopeIds;const groups=Object.values(state.groups).filter(g=>g.projectId==='prod').map(g=>g.id);for(const id of [...groups,...Object.keys(state.threads).filter(id=>groups.includes(state.threads[id])||state.threads[id]==='all:prod')])state.messages[id]=(state.messages[id]||[]).filter(m=>!['project-archived','project-restored'].includes(m.eventType));localStorage.setItem('eva:project-members:v1',JSON.stringify(state));});
 await p.reload();await p.locator('.ch-stream').waitFor();
 const missing=await p.evaluate(()=>{const s=window.__evaGetFileContext().store,state=s.snapshot(),groups=['all:prod',...Object.values(state.groups).filter(g=>g.projectId==='prod').map(g=>g.id)],scopes=[...groups,...Object.keys(state.threads).filter(id=>groups.includes(state.threads[id])&&!state.threadDetails[id]?.deleted)];return scopes.filter(id=>(state.messages[id]||[]).filter(m=>m.eventType==='project-archived').length!==1);});assert.deepEqual(missing,[]);
 await p.goto(origin+'/#/messages');await p.getByRole('button',{name:'最近',exact:true}).click();
 await p.getByRole('heading',{name:'采购与招投标',exact:true}).click();await record.waitFor();
 await p.getByRole('navigation',{name:'群聊子区'}).getByRole('tab').nth(1).click();await record.waitFor();
 await p.goto(origin+'/#/messages?evaIM=my-ai');await check();
 await p.goto(origin+'/#/messages');await check();assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
