import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('身份资料贴近触发入口，无遮罩，外部点击和 Escape 关闭并恢复焦点',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${server.address().port}/#/contacts`);
  const trigger=page.getByRole('button',{name:'查看 王宜林的 AI 分身 的资料'}).first();
  const card=page.locator('.eva-person-card-popover');
  await trigger.click();await card.waitFor();
  assert.equal(await card.getByRole('button',{name:'关闭资料卡'}).count(),0);
  assert.equal(await card.getByText('身份资料',{exact:true}).count(),0,'根层资料卡不重复显示泛标题');
  assert.equal(await page.locator('.eva-person-card-modal').count(),0);
  assert.equal(await page.locator('.semi-modal-mask').count(),0);
  const geometry=await Promise.all([trigger.boundingBox(),card.boundingBox()]);
  assert.equal(geometry[1].width,360,'桌面资料卡使用紧凑宽度');
  assert.ok(geometry[1].x>=0&&geometry[1].x+geometry[1].width<=1200);
  assert.ok(Math.abs(geometry[1].x-(geometry[0].x+geometry[0].width))<30,'空间足够时资料卡应优先在身份入口右侧展开');
  assert.ok(Math.abs(geometry[1].y-geometry[0].y)<30,'资料卡顶部应贴近身份入口');
  await card.getByText('王宜林',{exact:true}).last().click();
  assert.equal(await card.getByRole('button',{name:'返回'}).count(),1,'所属人留在同一卡内');
  await card.getByRole('button',{name:'返回'}).click();
  assert.equal(await card.getByRole('button',{name:'所属人：王宜林'}).evaluate(el=>el===document.activeElement),true,'返回后焦点回到所属人入口');
  await page.keyboard.press('Escape');await card.waitFor({state:'detached'});
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true,'Escape 后焦点回到触发入口');
  await trigger.click();await card.waitFor();
  await page.locator('.eva-contacts__columns').click();
  await card.waitFor({state:'detached'});
  await page.getByRole('button',{name:'查看 白宇 的资料'}).first().click();
  await card.waitFor();
  const action=card.getByRole('button',{name:'发消息'});
  const [actionBox,cardBox]=await Promise.all([action.boundingBox(),card.boundingBox()]);
  assert.ok(actionBox.width>cardBox.width-60&&actionBox.height>=40,'资料卡底部行动使用 Eva 主色整宽 Semi 按钮');
  assert.equal(await action.evaluate(el=>getComputedStyle(el).borderRadius),'12px','资料卡按钮沿用现有 chip 圆角 token');
  assert.equal(await card.locator('.eva-person-card__actions').count(),1,'消息行动位于资料卡底部');
  await action.click();
  await card.waitFor({state:'detached'});
  assert.match(page.url(),/#\/messages\?evaDM=/,'发消息仍进入联系人私聊');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test('资料卡可再次点击原入口收起，键盘离开时不留下悬浮卡',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  await page.goto(`http://127.0.0.1:${server.address().port}/#/contacts`);
  const trigger=page.getByRole('button',{name:'查看 王宜林的 AI 分身 的资料'}).first();
  const card=page.locator('.eva-person-card-popover');
  await trigger.click();await card.waitFor();
  await trigger.click();await card.waitFor({state:'detached'});
  await trigger.click();await card.waitFor();
  await page.keyboard.press('Tab');
  for(let i=0;i<12&&await card.count();i++)await page.keyboard.press('Tab');
  await card.waitFor({state:'detached'});
  await trigger.click();await card.waitFor();
  await page.locator('.eva-contacts__groups').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await card.waitFor({state:'detached'});
  await trigger.click();await card.waitFor();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await card.waitFor({state:'detached'});
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test('窄屏触屏入口可打开并通过点外部关闭',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:390,height:700},hasTouch:true,isMobile:true});
  await page.goto(`http://127.0.0.1:${server.address().port}/#/contacts`);
  const card=page.locator('.eva-person-card-popover');
  await page.getByRole('button',{name:'查看 王宜林的 AI 分身 的资料'}).first().tap();
  await card.waitFor();
  const box=await card.boundingBox();
  assert.ok(box.width<=358,'窄屏资料卡宽度随视口收缩');
  assert.ok(box.x>=0&&box.x+box.width<=390,'窄屏资料卡不能横向越界');
  await page.locator('.eva-contacts__main-head').tap({position:{x:8,y:8}});
  await card.waitFor({state:'detached'});
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
