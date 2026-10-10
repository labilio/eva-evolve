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
 await tip.hover();await page.waitForTimeout(400);assert.equal(await tip.isVisible(),true,'指针移入提示后仍可阅读');
 await page.keyboard.press('Escape');await tip.waitFor({state:'hidden'});
 await page.mouse.move(10,10);await target.focus();await tip.waitFor();await page.waitForTimeout(400);assert.equal(await tip.isVisible(),true);await page.keyboard.press('Escape');await tip.waitFor({state:'hidden'});
 await page.locator("body").click({position:{x:5,y:5}});await target.hover();await tip.waitFor();
 await target.click();await tip.waitFor({state:'hidden'});await page.mouse.move(10,10);await target.hover();await tip.waitFor();
 await target.evaluate(e=>e.setAttribute('data-eva-tooltip','已更新提示'));await tip.waitFor({state:'hidden',timeout:2000});
 await page.mouse.move(10,10);await target.hover();const updated=page.getByRole('tooltip').filter({hasText:'已更新提示'});await updated.waitFor();await page.waitForTimeout(300);assert.equal(await updated.isVisible(),true);
 await target.evaluate(e=>e.style.display='none');await updated.waitFor({state:'hidden',timeout:2000});
 await target.evaluate(e=>e.style.display='block');await page.mouse.move(10,10);await target.hover();await updated.waitFor();await target.evaluate(e=>e.remove());await updated.waitFor({state:'hidden',timeout:2000});
 await page.evaluate(()=>{const text=document.createElement('span');text.id='clipped-fixture';text.textContent='这是一段需要截断的文字';text.setAttribute('data-eva-tooltip',text.textContent);text.setAttribute('data-eva-tooltip-clamp','true');Object.assign(text.style,{position:'fixed',left:'500px',top:'200px',width:'350px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',zIndex:'1000'});document.body.append(text);});
 const clipped=page.locator('#clipped-fixture');await clipped.hover();await page.waitForTimeout(300);assert.equal(await page.getByRole('tooltip').filter({hasText:'这是一段需要截断的文字'}).count(),0,'完整文字不出现提示');await clipped.evaluate(e=>e.style.width='40px');await page.mouse.move(10,10);await clipped.hover();await page.getByRole('tooltip').filter({hasText:'这是一段需要截断的文字'}).waitFor();await clipped.evaluate(e=>e.remove());await page.getByRole('tooltip').waitFor({state:'hidden'});

 await page.evaluate(()=>{const b=document.createElement('button');b.id='nested-clamp-fixture';b.setAttribute('data-eva-tooltip','内层文字截断');b.setAttribute('data-eva-tooltip-clamp','span');b.innerHTML='<span style="display:block;width:40px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">内层文字截断</span>';Object.assign(b.style,{position:'fixed',left:'500px',top:'200px',width:'200px',zIndex:'1000'});document.body.append(b);});
 const nested=page.locator('#nested-clamp-fixture');await nested.hover();const nestedTip=page.getByRole('tooltip').filter({hasText:'内层文字截断'});await nestedTip.waitFor();await page.waitForTimeout(200);await nested.evaluate(e=>e.firstElementChild.style.width='190px');await nestedTip.hover();await page.waitForTimeout(300);assert.equal(await nestedTip.isVisible(),true,'移入提示时行内操作隐藏、文字变宽，不应关闭正在阅读的提示');await page.mouse.move(10,10);await nestedTip.waitFor({state:'detached'});await nested.hover();await page.waitForTimeout(200);assert.equal(await nestedTip.count(),0,'交互结束后重新测量，不再截断时不显示');await nested.evaluate(e=>e.remove());
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('我的 Agent 新建菜单关闭提示，左侧导航不新增提示',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{const page=await browser.newPage({viewport:{width:1200,height:800}});await page.goto(`http://127.0.0.1:${server.address().port}/#/messages?evaIM=my-ai`);
 const title=page.getByText('供应商催交期，这句话怎么回',{exact:true});await title.hover();const titleTip=page.getByRole('tooltip',{name:'供应商催交期，这句话怎么回',exact:true});await titleTip.waitFor();await page.waitForTimeout(300);await titleTip.hover();await page.waitForTimeout(400);assert.equal(await titleTip.isVisible(),true,'真实 Agent 标题提示可移入阅读');await page.keyboard.press('Escape');await titleTip.waitFor({state:'hidden'});
 const create=page.getByRole('button',{name:'新建',exact:true}).first();await create.hover();await page.getByRole('tooltip').filter({hasText:'新建'}).waitFor();await create.click();await page.getByRole('menu').waitFor();
 const visibleCreateTips=()=>page.locator('.semi-tooltip-wrapper-show').evaluateAll(nodes=>nodes.filter(node=>node.textContent?.trim()==='新建').length);
 await page.waitForFunction(()=>![...document.querySelectorAll('.semi-tooltip-wrapper-show')].some(node=>node.textContent?.trim()==='新建'));
 assert.equal(await visibleCreateTips(),0);await page.keyboard.press('Escape');assert.equal(await visibleCreateTips(),0);
 const toggle=page.getByRole('button',{name:'收起',exact:true});if(await toggle.isVisible())await toggle.click();
 await page.locator('#eva-my-avatar-nav').hover();await page.waitForTimeout(350);assert.equal(await page.getByRole('tooltip').filter({hasText:'Agent'}).count(),0);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('个人 Eva 原生控件提示随路由离开卸载，返回仍可用',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{const page=await browser.newPage({viewport:{width:1200,height:800}});const url=`http://127.0.0.1:${server.address().port}`;await page.goto(url+'/#/guid');const button=page.locator('[data-eva-create-folder]');await button.hover();const tip=page.getByRole('tooltip').filter({hasText:'新建分组'});await tip.waitFor();await page.waitForTimeout(500);assert.equal(await tip.isVisible(),true);
 await page.evaluate(()=>location.hash='/messages');await tip.waitFor({state:'hidden'});await page.evaluate(()=>location.hash='/guid');await button.hover();await tip.waitFor();await page.mouse.move(1190,790);await tip.waitFor({state:'hidden'});await button.focus();await tip.waitFor();await page.keyboard.press('Escape');await tip.waitFor({state:'hidden'});
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('新建分组弹窗退出后提示不因焦点返回而常亮',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{const page=await browser.newPage({viewport:{width:1200,height:800}});await page.goto(`http://127.0.0.1:${server.address().port}/#/guid`);
 const button=page.locator('[data-eva-create-folder]'),tip=page.getByRole('tooltip',{name:'新建分组',exact:true});
 for(const exit of ['取消','Escape','遮罩']){
  await page.mouse.move(1190,790);await button.hover();await tip.waitFor();await button.click();
  await page.locator('.eva-personal-folder-modal .semi-modal:visible').waitFor();
  if(exit==='取消')await page.getByRole('button',{name:'取消',exact:true}).last().click();
  if(exit==='Escape'){await page.mouse.move(600,400);await page.keyboard.press('Escape');}
  if(exit==='遮罩')await page.mouse.click(1100,600);
  await page.locator('.eva-personal-folder-modal .semi-modal:visible').waitFor({state:'hidden'});
  assert.equal(await button.evaluate(node=>document.activeElement===node),true,`${exit}：焦点应返回新建按钮`);
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.semi-tooltip-wrapper-show').filter({hasText:'新建分组'}).count(),0,`${exit}：鼠标已离开时提示不应常亮`);
 }
 await page.mouse.move(1190,790);await button.hover();await tip.waitFor();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('文件卡仅截断名提示；文件库图标支持键盘且权限说明直接可见',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(8000);await page.goto(`http://127.0.0.1:${server.address().port}/#/messages`);
  const card=page.getByRole('button',{name:'A-2409排产影响测算.html 12.5 KB HTML 存到文件库 下载',exact:true});
  assert.equal(await card.getAttribute('title'),null);assert.equal(await card.getAttribute('data-eva-tooltip'),null);
  await card.locator('.wk-message-file-name').hover();const nameTip=page.getByRole('tooltip',{name:'A-2409排产影响测算.html',exact:true});await nameTip.waitFor();
  assert.equal(await page.getByRole('tooltip').count(),1,'不能同时出现卡片和文件名两层提示');
  await page.getByText('文件库',{exact:true}).click();await page.getByRole('button',{name:'供应链运营协同',exact:true}).click();
  assert.equal(await page.getByText('你无权访问来源消息',{exact:true}).isVisible(),true);
  const pin=page.getByRole('button',{name:'置顶：会议纪要',exact:true});await page.mouse.move(10,10);await pin.focus();const pinTip=page.getByRole('tooltip',{name:'置顶',exact:true});await pinTip.waitFor();await page.waitForTimeout(500);assert.equal(await pinTip.isVisible(),true);
  await page.keyboard.press('Escape');await pinTip.waitFor({state:'hidden'});assert.equal(await pin.evaluate(el=>document.activeElement===el),true);
  await page.getByRole('button',{name:'上传本地文件',exact:true}).hover();await page.waitForTimeout(200);assert.equal(await page.getByRole('tooltip').count(),0,'有完整文字的上传按钮不重复提示');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
