import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { createServer } from '../../tools/serve.mjs';

test('AI 小队编辑器：双栏选择、搜索、创建与重新编辑', async () => {
  const server=createServer(new URL('../../dist',import.meta.url).pathname);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try {
    const context=await browser.newContext({viewport:{width:1200,height:800}});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/#/messages?evaIM=my-ai');
    await page.locator('.eva-ai-team__create').click();
    await page.getByRole('menuitem',{name:'新建 AI 小队',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'新建 AI 小队',exact:true});
    await dialog.waitFor();
    assert.equal(await dialog.locator('.eva-member-picker').count(),1,'AI 小队必须复用全局拉人模板 A');
    const create=dialog.getByRole('button',{name:'创建',exact:true});
    // 主按钮不再因名称或成员数未满足而禁用（2026-09-21）：保持可点，点击时校验并给出行内反馈。
    assert.equal(await create.isDisabled(),false,'主按钮保持可点，未满足条件时按提交校验给出反馈');
    await create.click();
    await dialog.locator('#eva-ai-team-name-error').waitFor({timeout:5000});
    assert.equal(await dialog.locator('#eva-ai-team-name').evaluate(node=>node===document.activeElement),true,'报错后焦点回到名称输入框');
    assert.equal(await dialog.count(),1,'校验失败不创建也不关闭弹窗');
    await dialog.getByLabel('AI 小队名称',{exact:true}).fill('双栏验收团队');
    assert.equal(await dialog.getByText('AI 小队头像',{exact:true}).count(),0);
    assert.equal(await dialog.getByRole('button',{name:'点击修改',exact:true}).count(),0);
    const search=dialog.getByRole('textbox',{name:'搜索我的 AI 成员'});
    await search.fill('通用助理');
    assert.equal(await dialog.locator('.eva-member-picker__candidate').count(),1);
    await dialog.locator('.eva-member-picker__candidate').click();
    assert.equal(await dialog.locator('.eva-member-picker__selected-item').count(),1);
    await search.fill('不存在的候选');
    assert.equal(await dialog.locator('.eva-member-picker__candidate').count(),0);
    assert.equal(await dialog.locator('.eva-member-picker__selected-item').count(),1);
    await search.fill('');
    await dialog.getByRole('button',{name:'移除 通用助理',exact:true}).click();
    await create.click();
    await dialog.locator('.eva-member-picker__members-error').waitFor({timeout:5000});
    assert.equal(await dialog.count(),1,'未选成员时不提交，错误紧贴成员面板');
    await dialog.locator('.eva-member-picker__candidate').filter({hasText:'通用助理'}).click();
    const geometry=await dialog.evaluate(node=>{
      const box=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
      return {modal:box(node),name:box(node.querySelector('#eva-ai-team-name').closest('.semi-input-wrapper')),picker:box(node.querySelector('.eva-member-picker__panel')),search:box(node.querySelector('.eva-member-picker__toolbar')),selected:box(node.querySelector('.eva-member-picker__selected'))};
    });
    assert.ok(Math.abs(geometry.name.x-geometry.picker.x)<1);
    assert.ok(geometry.search.right<=geometry.selected.x+1);
    assert.ok(geometry.modal.y>=40&&geometry.modal.bottom<=800);
    // 外壳几何由模板 A 拥有：AI 小队宿主（046-ai-team.css）不得再改标题外距或阴影（规范 §4）。
    const shell=await dialog.evaluate(node=>{
      const read=selector=>{const element=node.querySelector(selector),computed=getComputedStyle(element);return {margin:computed.margin,padding:computed.padding};};
      return {padding:getComputedStyle(node).padding,shadow:getComputedStyle(node).boxShadow,header:read('.semi-modal-header'),footer:read('.semi-modal-footer')};
    });
    assert.deepEqual({padding:shell.padding,header:shell.header,footer:shell.footer},{padding:'0px',header:{margin:'0px',padding:'20px 24px 16px'},footer:{margin:'0px',padding:'16px 24px 24px'}},'AI 小队弹窗外壳与模板 A 一致：标题外距 0、固定标题与页脚留白');
    assert.ok(!shell.shadow.includes('0px 0px 0px 0.5px'),'外壳阴影不含 AI 小队宿主的发丝边，与其它入口同一条 --eva-shadow-floating');
    await mkdir('artifacts/ai-team-editor',{recursive:true});
    await page.screenshot({path:'artifacts/ai-team-editor/selected.png',animations:'disabled'});
    await create.click();
    await dialog.waitFor({state:'hidden'});
    const createdAvatar=page.locator('.eva-ai-team__team-heading').filter({hasText:'双栏验收团队'}).locator('.eva-ai-team__team-avatar');
    assert.match(await createdAvatar.getAttribute('src'),/^data:image\/svg\+xml/);
    await page.getByRole('button',{name:'聊天信息',exact:true}).click();
    assert.equal(await page.getByText('AI 小队头像',{exact:true}).count(),0);
    // 回归：AI 小队父群没有 store 群记录，g 为空；此前 ChatSettings 直接读 g.ownerId 会抛错并让面板空白。
    assert.equal(await page.locator('.eva-chat-member-grid .eva-chat-member-tile').filter({hasText:'通用助理'}).count(),1,'聊天信息面板必须渲染 AI 小队成员网格（本人＋AI）');
    await page.getByRole('button',{name:'添加 AI 小队成员',exact:true}).click();
    // 成员区加号打开的是仅成员态（无名称字段），标题为「编辑 AI 小队成员」，不是「新建 AI 小队」。
    const membersDialog=page.getByRole('dialog',{name:'编辑 AI 小队成员',exact:true});
    await membersDialog.waitFor();
    assert.equal(await membersDialog.locator('#eva-ai-team-name').count(),0);
    assert.equal(await membersDialog.locator('.eva-member-picker__selected-item').count(),1);
    await membersDialog.locator('.eva-member-picker__candidate').filter({hasText:'Eva 研发助理'}).click();
    await membersDialog.getByRole('button',{name:'保存',exact:true}).click();
    await membersDialog.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'聊天信息',exact:true}).click();
    await page.getByRole('button',{name:'添加 AI 小队成员',exact:true}).click();
    await membersDialog.waitFor();
    assert.equal(await membersDialog.locator('.eva-member-picker__selected-item').count(),2);
    await page.screenshot({path:'artifacts/ai-team-editor/edit.png',animations:'disabled'});
    await membersDialog.getByRole('button',{name:'取消',exact:true}).click();
    await page.locator('[data-eva-nav-id="messages"]').click();
    await page.locator('[data-eva-nav-id="my-ai"]').click();
    await page.locator('.eva-ai-team__create').click();
    await page.getByRole('menuitem',{name:'新建 AI 小队',exact:true}).click();
    await dialog.waitFor();
    assert.equal(await dialog.getByLabel('AI 小队名称',{exact:true}).inputValue(),'');
    assert.equal(await dialog.locator('.eva-member-picker__selected-item').count(),0);
    await page.screenshot({path:'artifacts/ai-team-editor/empty.png',animations:'disabled'});
    assert.deepEqual(errors,[]);
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
});
