import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('conversation menus: real actions, object boundaries, drafts, keyboard and submenu',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{}),page=await browser.newPage({viewport:{width:1200,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/#/messages`);await page.locator('.eva-follow-category').first().waitFor();
  const follow=page.locator('.eva-follow-channel > .wk-conv-compact-item').filter({hasText:'采购与招投标'}).first();await follow.click();
  const editor=page.getByRole('textbox',{name:'发送给 采购与招投标'});await editor.fill('菜单验收草稿');
  const menu=page.locator('.eva-context-menu');const texts=()=>menu.getByRole('menuitem').allTextContents();
  await follow.click({button:'right'});assert.ok(!(await texts()).includes('置顶会话'));assert.ok(!(await texts()).includes('移动到分组'));await menu.getByRole('menuitem',{name:'清除未读',exact:true}).click();
  await follow.click({button:'right'});assert.ok(!(await texts()).includes('清除未读'));await page.keyboard.press('Escape');assert.equal(await menu.count(),0);assert.equal(await editor.innerText(),'菜单验收草稿');
  await page.getByRole('button',{name:'最近',exact:true}).click();const row=page.locator('.wk-conversationlist-item').filter({has:page.getByRole('heading',{name:'近期体验反馈整理',exact:true})});await row.click({button:'right'});
  assert.ok((await texts()).includes('取消置顶'));assert.equal(await editor.innerText(),'菜单验收草稿');await menu.getByRole('menuitem',{name:'取消置顶',exact:true}).click();assert.doesNotMatch(await row.getAttribute('class'),/eva-recent-conversation-pinned/);
  await row.click({button:'right'});await menu.getByRole('menuitem',{name:'置顶会话',exact:true}).click();await row.click({button:'right'});await menu.getByRole('menuitem',{name:'设为免打扰',exact:true}).click();await row.click({button:'right'});assert.ok((await texts()).includes('取消免打扰'));await page.keyboard.press('Escape');
  await row.click({button:'right'});await menu.getByRole('menuitem',{name:'不显示该会话',exact:true}).click();assert.equal(await row.count(),0);assert.equal(await editor.innerText(),'菜单验收草稿');
  await page.getByRole('button',{name:'关注',exact:true}).click();assert.equal(await page.getByRole('button',{name:'近期体验反馈整理',exact:true}).count(),1);const thread=page.locator('.eva-follow-channel > .wk-conv-compact-item--thread').filter({hasText:'本季度间接采购需求'});await thread.click({button:'right'});assert.ok((await texts()).includes('隐藏子区'));assert.ok(!(await texts()).includes('移动到分组'));await menu.getByRole('menuitem',{name:'隐藏子区',exact:true}).click();assert.equal(await thread.count(),0);
  const personal=page.locator('.eva-follow-channel > .wk-conv-compact-item').filter({hasText:'产品共创交流群'}).first();await personal.click({button:'right'});await menu.getByRole('menuitem',{name:'移动到分组',exact:true}).hover();await menu.getByRole('menuitem',{name:'新建分组',exact:true}).click();await page.getByRole('textbox',{name:'分组名称'}).fill('菜单测试分组');await page.getByRole('dialog',{name:'创建分组'}).getByRole('button',{name:'confirm',exact:true}).click();await page.locator('.eva-follow-category').filter({hasText:'菜单测试分组'}).first().waitFor();
  await personal.click({button:'right'});await menu.getByRole('menuitem',{name:'移动到分组',exact:true}).hover();await menu.getByRole('menuitem',{name:'其他会话',exact:true}).click();
  const category=page.locator('.eva-follow-category').filter({has:page.getByRole('button',{name:'编辑分组 其他会话',exact:true})}).first();await category.locator('.eva-follow-category-title').click({button:'right'});await menu.getByRole('menuitem',{name:'编辑分组',exact:true}).click();await page.getByRole('dialog',{name:'编辑分组'}).waitFor();await page.getByRole('dialog',{name:'编辑分组'}).getByRole('button',{name:'cancel',exact:true}).click();
  await personal.focus();await page.keyboard.press('Shift+F10');await menu.waitFor();await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');assert.equal(await menu.count(),0);
  await page.reload();await page.locator('.eva-follow-category').first().waitFor();await follow.click({button:'right'});assert.ok(!(await texts()).includes('清除未读'));await page.keyboard.press('Escape');assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
