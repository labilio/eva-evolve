import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('群聊治理中的管理员、Bot 设置和 GROUP.md 可编辑保存（不验证 Bot 实际触发）',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:800}});
    page.setDefaultTimeout(10000);
    await page.goto(origin+'/#/messages');
    await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();
    await page.getByRole('textbox',{name:'发送给 采购与招投标'}).waitFor();
    await page.getByRole('button',{name:'打开聊天信息',exact:true}).last().click();
    const panel=page.locator('.eva-chat-settings');
    await panel.getByRole('heading',{name:/^聊天信息（\d+）$/}).waitFor();
    await panel.getByRole('button',{name:/^查看全部/}).click();

    // Project administrators start as ordinary group members; a grant is reversible in this row.
    const projectAdminRow=panel.locator('.eva-chat-member-list-row').filter({hasText:'周远'});
    assert.equal(await projectAdminRow.locator('.semi-tag').count(),0);
    await projectAdminRow.hover();
    await projectAdminRow.getByRole('button',{name:'设为群管理员 周远',exact:true}).click();
    await projectAdminRow.getByText('群管理员',{exact:true}).waitFor();
    const revoke=projectAdminRow.getByRole('button',{name:'取消群管理员 周远',exact:true});
    const remove=projectAdminRow.getByRole('button',{name:'移出群聊 周远',exact:true});
    assert.match(await revoke.locator('svg').getAttribute('class'),/lucide-user-minus/);
    assert.match(await remove.locator('svg').getAttribute('class'),/lucide-trash-2/);
    await revoke.click();
    assert.equal(await projectAdminRow.locator('.semi-tag').count(),0);
    const permissions=await page.evaluate(()=>{const store=window.__evaGetFileContext().store,state=store.snapshot(),g=Object.values(state.groups).find(g=>g.name==='采购与招投标'),person=state.people.find(p=>p.name==='周远');return {project:store.manager(g.projectId,person.id),group:store.manager(g.id,person.id)};});
    assert.deepEqual(permissions,{project:true,group:false});

    await panel.getByRole('button',{name:'返回聊天信息'}).click();
    await panel.getByText('群聊管理',{exact:true}).click();
    const rules=panel.locator('.eva-chat-setting-section').filter({hasText:'Bot 回复规则'});
    await rules.getByText('Bot 回复规则',{exact:true}).waitFor();
    await rules.getByText('允许 Bot 免 @ 回答',{exact:true}).waitFor();
    await rules.getByText('仅对已由主人开启免 @ 的 Bot 生效。关闭后，本群聊和子区中的所有 Bot 都必须被明确 @ 才会回答。',{exact:true}).waitFor();
    assert.equal(await panel.getByText('成员管理',{exact:true}).count(),0);
    assert.equal(await rules.getByText(/共 \d+ 名成员/).count(),0);
    const replySwitch=rules.getByRole('switch',{name:'允许 Bot 免 @ 回答'});
    assert.equal(await replySwitch.isEnabled(),true);
    assert.equal(await replySwitch.isChecked(),true);
    const switchGeometry=await replySwitch.evaluate(input=>{
      const track=input.closest('.semi-switch'),knob=track?.querySelector('.semi-switch-knob');
      const trackRect=track?.getBoundingClientRect(),knobRect=knob?.getBoundingClientRect();
      return trackRect&&knobRect?{
        trackWidth:trackRect.width,
        knobLeft:knobRect.left-trackRect.left,
        knobRight:knobRect.right-trackRect.left
      }:null;
    });
    assert.ok(switchGeometry,'Bot 回复规则应渲染完整的开关轨道和滑块');
    assert.ok(switchGeometry.trackWidth>=26,`开关轨道不应被说明文字压缩，当前宽度 ${switchGeometry.trackWidth}px`);
    assert.ok(switchGeometry.knobLeft>=0&&switchGeometry.knobRight<=switchGeometry.trackWidth,'开关滑块应完整位于轨道内');
    await replySwitch.click();
    assert.equal(await replySwitch.isChecked(),false);

    assert.equal(await panel.getByRole('button',{name:'添加管理员',exact:true}).count(),0,'任免只有成员行一个入口');
    await panel.getByRole('button',{name:'返回聊天信息'}).click();
    await panel.getByRole('button',{name:/^查看全部/}).click();
    const ownerRole=panel.locator('.eva-chat-member-list-row').filter({hasText:'王宜林'}).getByText('群主',{exact:true});
    await ownerRole.waitFor();
    assert.equal(await ownerRole.evaluate(label=>label.closest('.semi-tag')?.previousElementSibling?.textContent?.trim()),'王宜林','群主 Tag 紧跟姓名');
    const managerRow=panel.locator('.eva-chat-member-list-row').filter({hasText:'林晓'});
    await managerRow.hover();
    await managerRow.getByRole('button',{name:'设为群管理员 林晓'}).click();
    const managerRole=managerRow.getByText('群管理员',{exact:true});
    await managerRole.waitFor();
    assert.equal(await managerRole.evaluate(label=>label.closest('.semi-tag')?.previousElementSibling?.textContent?.trim()),'林晓','管理员 Tag 紧跟姓名');
    const removeManager=managerRow.getByRole('button',{name:'取消群管理员 林晓'});
    assert.match(await removeManager.locator('svg').getAttribute('class'),/lucide-user-minus/);
    assert.equal(await removeManager.textContent(),'');
    const botManagerRow=panel.locator('.eva-chat-member-list-row').filter({hasText:'项目管家'});
    const order=()=>panel.locator('.eva-chat-member-profile').allTextContents();
    const beforeBot=await order();
    await botManagerRow.hover();
    const grantBot=botManagerRow.getByRole('button',{name:/^设为 Bot 管理员 /});
    assert.match(await grantBot.locator('svg').getAttribute('class'),/lucide-user-cog/);
    await grantBot.click();
    await botManagerRow.getByText('Bot 管理员',{exact:true}).waitFor();
    assert.deepEqual((await order()).map(x=>x.replace('Bot 管理员','')),beforeBot,'Bot 任命不立即重排');
    const revokeBot=botManagerRow.getByRole('button',{name:/^取消 Bot 管理员 /});
    assert.match(await revokeBot.locator('svg').getAttribute('class'),/lucide-user-minus/);
    assert.equal(await botManagerRow.getByRole('button',{name:/^移出群聊 /}).count(),1,'AI 成员提供移除入口');
    await panel.getByRole('button',{name:'返回聊天信息'}).click();
    await panel.getByRole('button',{name:/^查看全部/}).click();
    assert.match((await order()).at(-1),/Bot 管理员/,'Bot 管理员不跨身份类别前置');
    await panel.getByRole('button',{name:'返回聊天信息'}).click();
    assert.deepEqual(await panel.locator('.eva-chat-member-grid .eva-chat-member-role').allTextContents(),[],'成员预览不显示角色标签');
    const captions=await panel.locator('.eva-chat-member-tile').evaluateAll(tiles=>tiles.map(tile=>{
      const caption=tile.querySelector('.eva-chat-tile-caption,.eva-members-human-copy,.eva-members-ai-identity>span:not(.eva-ai-avatar):not(.ai-badge)');
      const rect=caption.getBoundingClientRect(),box=tile.getBoundingClientRect();
      return {offset:rect.top-box.top,height:rect.height};
    }));
    assert.ok(captions.every(c=>Math.abs(c.offset-56)<0.5&&Math.abs(c.height-16)<0.5),'所有身份共用 48px 头像、8px 间距、16px 姓名行');
    const previewGeometry=await panel.locator('.eva-chat-member-grid').evaluate(el=>{
      const children=[...el.children],first=children[0],before=first.getBoundingClientRect().width;
      const displays=children.map(child=>child.style.display);
      children.slice(2).forEach(child=>child.style.display='none');
      const after=first.getBoundingClientRect().width;
      children.forEach((child,i)=>child.style.display=displays[i]);
      return {before,after};
    });
    assert.equal(previewGeometry.after,previewGeometry.before,'两名成员时格子宽度不变');
    await panel.getByRole('button',{name:/^查看全部/}).click();
    await botManagerRow.getByText('Bot 管理员',{exact:true}).waitFor();
    await managerRow.getByText('群管理员',{exact:true}).waitFor();
    for(const chip of await panel.locator('.eva-chat-member-chips .semi-button').all()){
      await page.mouse.move(10,10);
      const measure=()=>chip.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {width:r.width,height:r.height,padding:s.padding,border:s.borderWidth,font:s.font};});
      const normal=await measure();await chip.hover();
      assert.deepEqual(await measure(),normal,'Chip 悬停不能改变尺寸');
    }
    // Layout stress fixture only: three-digit counts must wrap whole chips without overflow.
    const chipLayout=await panel.locator('.eva-chat-member-chips').evaluate(el=>{
      const buttons=[...el.querySelectorAll('button')],original=buttons.map(b=>b.innerHTML);
      buttons.forEach((b,i)=>b.textContent=['全部 999','联系人 333','AI 分身 333','数字员工 333'][i]);
      const box=el.getBoundingClientRect();
      const result={overflow:el.scrollWidth-el.clientWidth,inside:buttons.every(b=>{const r=b.getBoundingClientRect();return r.left>=box.left-1&&r.right<=box.right+1;}),height:buttons[0].getBoundingClientRect().height};
      buttons.forEach((b,i)=>b.innerHTML=original[i]);return result;
    });
    assert.ok(chipLayout.overflow<=1&&chipLayout.inside,'三位数 Chip 不横向溢出');
    assert.equal(chipLayout.height,28);
    assert.equal(await panel.getByText('仅看管理员',{exact:true}).count(),0);
    assert.equal(await panel.getByText(/^找到 \d+ 名成员$/).count(),0);
    await panel.getByRole('button',{name:'数字员工 1',exact:true}).click();
    assert.equal((await order()).length,1);
    assert.equal((await order()).length,1);
    await panel.getByRole('textbox',{name:'搜索群聊成员'}).fill('不存在');
    assert.equal((await order()).length,0);
    assert.equal(await panel.getByRole('button',{name:'数字员工 1',exact:true}).count(),1,'数量不随搜索变化');
    await panel.getByRole('textbox',{name:'搜索群聊成员'}).fill('');
    await panel.getByRole('button',{name:'全部 5',exact:true}).click();
    await botManagerRow.hover();await revokeBot.click();
    assert.equal(await botManagerRow.getByText('Bot 管理员',{exact:true}).count(),0);
    assert.match((await order()).at(-1),/项目管家/,'撤销后当前行不跳动');
    await panel.getByRole('button',{name:'返回聊天信息'}).click();
    await panel.getByRole('button',{name:/^查看全部/}).click();
    assert.match((await order()).at(-1),/项目管家/,'重开后 Bot 回到普通成员原有顺序');
    assert.match((await order())[1],/林晓/,'联系人管理员仍在普通成员之前');
    await panel.getByRole('button',{name:'返回聊天信息'}).click();
    await panel.getByText('群聊管理',{exact:true}).click();
    assert.equal(await panel.getByRole('button',{name:'添加 Bot 管理员',exact:true}).count(),0);
    assert.equal(await panel.getByRole('switch',{name:'允许 Bot 免 @ 回答'}).isChecked(),false);

    await panel.getByRole('button',{name:'返回聊天信息'}).click();
    await panel.getByText('GROUP.md',{exact:true}).click();
    await panel.getByRole('button',{name:'编辑',exact:true}).click();
    const groupMd=panel.getByRole('textbox',{name:'GROUP.md 内容'});
    await groupMd.fill('# 采购协作约定');
    await panel.getByRole('button',{name:'保存',exact:true}).click();
    assert.equal(await groupMd.inputValue(),'# 采购协作约定');
    await panel.getByRole('button',{name:'返回聊天信息'}).click();
    await panel.getByRole('button',{name:/^查看全部/}).click();
    await botManagerRow.hover();
    await botManagerRow.getByRole('button',{name:/^移出群聊 /}).click();
    const removeDialog=page.getByRole('dialog').filter({hasText:'确认移除成员'});
    await removeDialog.getByRole('button',{name:'cancel',exact:true}).click();
    assert.equal(await botManagerRow.count(),1);
    await botManagerRow.hover();
    await botManagerRow.getByRole('button',{name:/^移出群聊 /}).click();
    await removeDialog.getByRole('button',{name:'confirm',exact:true}).click();
    await removeDialog.waitFor({state:'hidden'});
    assert.equal(await botManagerRow.count(),0);
    await page.reload();
    await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();
    await page.getByRole('button',{name:'打开聊天信息',exact:true}).last().click();
    await panel.getByRole('button',{name:/^查看全部/}).click();
    assert.equal(await botManagerRow.count(),0,'刷新后不重新补入已移除的 AI');

  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});

test('群成员移除确认保留默认页脚，取消不变更，确认后刷新仍生效',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:800}});
    page.setDefaultTimeout(10000);
    await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const openMembers=async()=>{
      await page.goto(origin+'/#/messages');
      await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();
      await page.getByRole('button',{name:'打开聊天信息',exact:true}).last().click();
      const panel=page.locator('.eva-chat-settings');
      await panel.getByRole('button',{name:/^查看全部/}).click();
      await panel.getByRole('textbox',{name:'搜索群聊成员'}).fill('林晓');
      return panel;
    };
    let panel=await openMembers();
    await panel.locator('.eva-chat-member-list-row').hover();
    await panel.getByRole('button',{name:'移出群聊 林晓',exact:true}).click();
    const dialog=page.getByRole('dialog').filter({hasText:'确认移除成员'});
    await dialog.getByRole('button',{name:'cancel',exact:true}).click();
    assert.equal(await panel.locator('.eva-chat-member-list-row').count(),1);
    await panel.locator('.eva-chat-member-list-row').hover();
    await panel.getByRole('button',{name:'移出群聊 林晓',exact:true}).click();
    await dialog.getByRole('button',{name:'confirm',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    assert.equal(await panel.locator('.eva-chat-member-list-row').count(),0);
    await page.reload();panel=await openMembers();
    assert.equal(await panel.locator('.eva-chat-member-list-row').count(),0);
    assert.deepEqual(errors,[]);
  }finally{
    await browser.close();await new Promise(resolve=>server.close(resolve));
  }
});
