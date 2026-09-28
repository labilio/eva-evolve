import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('群聊管理任免管理员与成员行移除确认，角色保存且不展示项目分工',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(5000);
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(origin+'/#/messages');
  const openMembers=async()=>{
   await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();
   await page.getByRole('button',{name:'打开聊天信息',exact:true}).last().click();
   await page.locator('.eva-chat-settings').getByRole('button',{name:/^查看全部/}).click();
  };
  await openMembers();
  const panel=page.locator('.eva-chat-settings');
  const row=panel.locator('.eva-chat-member-list-row').filter({hasText:'林晓'});
  await page.mouse.move(10,10);
  assert.equal(await row.locator('.eva-chat-member-actions').evaluate(el=>getComputedStyle(el).opacity),'0');
  const names=()=>panel.locator('.eva-chat-member-profile').allTextContents();
  const originalOrder=await names();
  const before=await row.boundingBox();await row.hover();
  assert.equal(await row.locator('.eva-chat-member-actions').evaluate(el=>getComputedStyle(el).opacity),'1');
  assert.deepEqual(await row.boundingBox(),before,'悬停不改变行几何');
  assert.equal(await row.locator('.eva-members-human-role').count(),0,'成员行不展示项目分工');
  assert.equal(await row.locator('.eva-chat-member-actions').getByRole('button').count(),1,'成员行任免统一收口到群聊管理，行内只保留移出群聊');
  // 任免入口在群聊管理：添加管理员走拉人模板。
  await panel.getByRole('button',{name:'返回聊天信息'}).click();
  await panel.getByText('群聊管理',{exact:true}).click();
  await panel.getByRole('button',{name:'添加管理员',exact:true}).click();
  const picker=page.locator('.eva-member-picker-modal');
  await picker.getByText('林晓',{exact:true}).click();
  await picker.getByRole('button',{name:'确认添加',exact:true}).click();
  await panel.locator('.eva-chat-management-member-main').filter({hasText:'林晓'}).getByText('群管理员',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'返回聊天信息'}).click();
  await panel.getByRole('button',{name:/^查看全部/}).click();
  const promotedOrder=await names();
  assert.match(promotedOrder[0],/群主/);
  assert.ok(promotedOrder.some(t=>t==='林晓群管理员'),'新任管理员行紧跟身份显示群管理员');
  const firstPlain=promotedOrder.findIndex(t=>!t.includes('群主')&&!t.includes('群管理员'));
  assert.ok(firstPlain>0,'存在普通成员行');
  assert.ok(promotedOrder.slice(0,firstPlain).every(t=>t.includes('群主')||t.includes('群管理员')),'群主与群管理员整体排在普通成员之前');
  await panel.locator('.eva-chat-member-list-row').filter({hasText:'林晓'}).locator('.semi-tag').getByText('群管理员',{exact:true}).waitFor();
  // 键盘撤销：群聊管理里的移除按钮可聚焦、回车生效。
  await panel.getByRole('button',{name:'返回聊天信息'}).click();
  await panel.getByText('群聊管理',{exact:true}).click();
  const revoke=panel.getByRole('button',{name:'移除管理员 林晓',exact:true});
  await page.mouse.move(10,10);
  await revoke.focus();
  assert.equal(await revoke.evaluate(el=>document.activeElement===el),true);
  await page.keyboard.press('Enter');
  await revoke.waitFor({state:'detached'});
  await panel.getByRole('button',{name:'返回聊天信息'}).click();
  await panel.getByRole('button',{name:/^查看全部/}).click();
  assert.deepEqual(await names(),originalOrder,'取消管理员后恢复普通成员的原有顺序');
  await panel.getByRole('textbox',{name:'搜索群聊成员'}).fill('林晓');
  assert.equal(await panel.locator('.eva-chat-member-list-row').filter({hasText:'林晓'}).count(),1);
  await panel.getByRole('textbox',{name:'搜索群聊成员'}).fill('');
  assert.equal(await panel.locator('.eva-chat-member-list-row').count(),originalOrder.length,'清空搜索后列表完整');
  // 移除确认：取消不变更，确认后刷新仍生效。
  await row.hover();await row.getByRole('button',{name:'移出群聊 林晓',exact:true}).click();
  const modal=page.getByRole('dialog').filter({hasText:'确认移除成员'});
  await modal.getByRole('button',{name:'cancel',exact:true}).click();
  assert.equal(await row.count(),1);
  await row.hover();await row.getByRole('button',{name:'移出群聊 林晓',exact:true}).click();
  await modal.getByRole('button',{name:'confirm',exact:true}).click();
  await row.waitFor({state:'detached'});
  await page.reload();await openMembers();assert.equal(await row.count(),0);
  // Opening settings must preserve the underlying composer and its draft.
  await panel.getByRole('button',{name:'返回聊天信息'}).click();
  await panel.getByRole('button',{name:'关闭聊天信息'}).click();
  const composer=page.getByRole('textbox',{name:'发送给 采购与招投标'});
  await composer.fill('保留草稿');
  await page.getByRole('button',{name:'打开聊天信息',exact:true}).last().click();
  await panel.getByRole('button',{name:/^查看全部/}).click();
  await panel.getByRole('button',{name:'返回聊天信息'}).click();
  await panel.getByRole('button',{name:'关闭聊天信息'}).click();
  assert.equal(await composer.innerText(),'保留草稿');
  await page.locator('.wk-conv-compact-item').filter({hasText:'质量与排产'}).first().click();
  await openMembers();assert.equal(await row.count(),0,'往返会话仍读取真实成员状态');
  await page.evaluate(()=>window.EvaTheme.apply('dark'));
  const remaining=panel.locator('.eva-chat-member-list-row').filter({hasText:'严博'});
  await remaining.hover();
  const geom=await remaining.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return {left:r.left-p.left,right:p.right-r.right,overflow:el.scrollWidth-el.clientWidth};});
  assert.ok(Math.abs(geom.left-geom.right)<=1);assert.ok(geom.overflow<=1);
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  assert.notEqual(await remaining.evaluate(el=>getComputedStyle(el).color),'rgb(0, 0, 0)');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
