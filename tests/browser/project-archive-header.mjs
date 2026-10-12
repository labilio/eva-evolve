import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('归档状态独立置于顶部右侧，创建入口隐藏，恢复后重新出现',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const tasks=origin+'/#/collab?evaProject=prod&evaTab=tasks';await p.goto(tasks);await p.locator('.eva-board-create').first().waitFor();
 await p.evaluate(()=>{const s=window.__evaGetFileContext().store;s.setProjectArchived('prod',s.actorId(),true)});
 for(const tab of ['tasks','channels','files','tasks']){
  await p.goto(origin+'/#/collab?evaProject=prod&evaTab='+tab);
  await p.locator('.eva-project-archive-status').waitFor();
  assert.equal(await p.locator('.eva-project-switcher').innerText(),'供应链运营协同');
  assert.equal(await p.locator('.eva-project-switcher .lucide-layout-grid').count(),1);
  const geometry=await p.locator('.collab-tabs').evaluate(e=>{const r=e.getBoundingClientRect(),s=e.querySelector('.eva-project-archive-status').getBoundingClientRect(),n=e.querySelector('.collab-tabs__list').getBoundingClientRect();return {right:r.right-s.right,overlap:n.right>s.left+1};});
  assert.ok(geometry.right<40&&!geometry.overlap,JSON.stringify(geometry));
  if(tab==='tasks'){assert.equal(await p.locator('.eva-board-create').count(),0);assert.equal(await p.getByRole('button',{name:'新建任务',exact:true}).count(),0);}
 }
 await p.screenshot({path:'/tmp/eva-archive-header.png'});
 await p.evaluate(()=>{const s=window.__evaGetFileContext().store;s.setProjectArchived('prod',s.actorId(),false)});
 await p.goto(tasks);await p.locator('.eva-board-create').first().waitFor();assert.equal(await p.locator('.eva-project-archive-status').count(),0);assert.equal(await p.getByRole('button',{name:'新建任务',exact:true}).count(),1);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
