import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('成员操作 Tooltip 随真实 React 成员卸载消失',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{const page=await browser.newPage({viewport:{width:1200,height:800}});await page.goto((process.env.EVA_TEST_URL||`http://127.0.0.1:${server.address().port}`)+'/#/messages');await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();await page.getByRole('button',{name:'打开聊天信息',exact:true}).last().click();await page.getByRole('button',{name:/^查看全部/}).click();
 const row=page.locator('.eva-chat-member-list-row').filter({hasText:'林晓'});await row.hover();await row.getByRole('button',{name:'设为群管理员 林晓',exact:true}).hover();const tip=page.getByRole('tooltip').filter({hasText:'设为群管理员'});await tip.waitFor();await page.waitForTimeout(600);assert.equal(await tip.isVisible(),true,'提示必须持续可见，不能短暂闪现后消失');const box=await tip.boundingBox();assert.ok(box&&box.x>0&&box.y>0&&box.x+box.width<=1200,'提示必须在触发按钮附近的视口内');
 await page.mouse.move(10,10);await tip.waitFor({state:'hidden'});
 await row.hover();await row.getByRole('button',{name:'设为群管理员 林晓',exact:true}).hover();await tip.waitFor();
 await row.getByRole('button',{name:'设为群管理员 林晓',exact:true}).click();await tip.waitFor({state:'hidden'});
 const revoke=row.getByRole('button',{name:'取消群管理员 林晓',exact:true});await revoke.hover();const revokeTip=page.getByRole('tooltip').filter({hasText:'取消群管理员'});await revokeTip.waitFor();await revoke.click();await revokeTip.waitFor({state:'hidden'});
 await page.mouse.move(10,10);await row.hover();await row.getByRole('button',{name:'设为群管理员 林晓',exact:true}).hover();await tip.waitFor();
 await page.evaluate(()=>{const store=window.__evaGetFileContext().store,s=store.snapshot(),g=Object.values(s.groups).find(g=>g.name==='采购与招投标'),p=s.people.find(p=>p.name==='林晓');store.remove(g.id,s.actorId,p.id);});
 await row.waitFor({state:'detached'});await tip.waitFor({state:'hidden',timeout:2000});assert.equal(await page.getByRole('tooltip').count(),0);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('共享提示入口：持续悬停、内容更新、隐藏和卸载均由组件生命周期收尾',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{const page=await browser.newPage({viewport:{width:1200,height:800}});await page.goto(`http://127.0.0.1:${server.address().port}/#/messages`);
 await page.evaluate(()=>{const b=document.createElement('button');b.id='tooltip-fixture';b.textContent='触发';b.setAttribute('data-eva-tooltip','原生控件提示');Object.assign(b.style,{position:'fixed',left:'500px',top:'200px',zIndex:'1000'});document.body.append(b);});
 const target=page.locator('#tooltip-fixture');await target.hover();const tip=page.getByRole('tooltip').filter({hasText:'原生控件提示'});await tip.waitFor();await page.waitForTimeout(500);assert.equal(await tip.isVisible(),true);
 await target.click();await tip.waitFor({state:'hidden'});await page.mouse.move(10,10);await target.hover();await tip.waitFor();
 await target.evaluate(e=>e.setAttribute('data-eva-tooltip','已更新提示'));await tip.waitFor({state:'hidden',timeout:2000});
 await page.mouse.move(10,10);await target.hover();const updated=page.getByRole('tooltip').filter({hasText:'已更新提示'});await updated.waitFor();await page.waitForTimeout(300);assert.equal(await updated.isVisible(),true);
 await target.evaluate(e=>e.style.display='none');await updated.waitFor({state:'hidden',timeout:2000});
 await target.evaluate(e=>e.style.display='block');await page.mouse.move(10,10);await target.hover();await updated.waitFor();await target.evaluate(e=>e.remove());await updated.waitFor({state:'hidden',timeout:2000});
 await page.evaluate(()=>{const text=document.createElement('span');text.id='clipped-fixture';text.textContent='这是一段需要截断的文字';text.setAttribute('data-eva-tooltip',text.textContent);text.setAttribute('data-eva-tooltip-clamp','');Object.assign(text.style,{position:'fixed',left:'500px',top:'200px',width:'350px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',zIndex:'1000'});document.body.append(text);});
 const clipped=page.locator('#clipped-fixture');await clipped.hover();await page.waitForTimeout(300);assert.equal(await page.getByRole('tooltip').filter({hasText:'这是一段需要截断的文字'}).count(),0,'完整文字不出现提示');await clipped.evaluate(e=>e.style.width='40px');await page.mouse.move(10,10);await clipped.hover();await page.getByRole('tooltip').filter({hasText:'这是一段需要截断的文字'}).waitFor();await clipped.evaluate(e=>e.remove());await page.getByRole('tooltip').waitFor({state:'hidden'});

 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('我的 Agent 新建菜单与折叠导航只显示 Semi Tooltip',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{const page=await browser.newPage({viewport:{width:1200,height:800}});await page.goto(`http://127.0.0.1:${server.address().port}/#/messages?evaIM=my-ai`);
 const create=page.getByRole('button',{name:'新建',exact:true}).first();await create.hover();await page.getByRole('tooltip').filter({hasText:'新建'}).waitFor();await create.click();await page.getByRole('menu').waitFor();
 const visibleCreateTips=()=>page.locator('.semi-tooltip-wrapper-show').evaluateAll(nodes=>nodes.filter(node=>node.textContent?.trim()==='新建').length);
 assert.equal(await visibleCreateTips(),0);await page.keyboard.press('Escape');assert.equal(await visibleCreateTips(),0);
 const toggle=page.getByRole('button',{name:'收起',exact:true});if(await toggle.isVisible())await toggle.click();
 await page.locator('#eva-my-avatar-nav').hover();const siderTip=page.getByRole('tooltip').filter({hasText:'Agent'});await siderTip.waitFor();assert.match(await siderTip.getAttribute('class'),/semi-tooltip/);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('个人 Eva 原生控件提示随路由离开卸载，返回仍可用',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{const page=await browser.newPage({viewport:{width:1200,height:800}});const url=`http://127.0.0.1:${server.address().port}`;await page.goto(url+'/#/guid');const button=page.locator('[data-eva-create-folder]');await button.hover();const tip=page.getByRole('tooltip').filter({hasText:'新建分组'});await tip.waitFor();await page.waitForTimeout(500);assert.equal(await tip.isVisible(),true);
 await page.evaluate(()=>location.hash='/messages');await tip.waitFor({state:'hidden'});await page.evaluate(()=>location.hash='/guid');await button.hover();await tip.waitFor();await page.mouse.move(1190,790);await tip.waitFor({state:'hidden'});await button.focus();await tip.waitFor();await page.keyboard.press('Escape');await tip.waitFor({state:'hidden'});
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
