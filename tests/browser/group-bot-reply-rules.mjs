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
    await page.getByRole('button',{name:'聊天信息',exact:true}).click();
    const panel=page.locator('.eva-chat-settings');
    await panel.getByRole('heading',{name:/^聊天信息（\d+）$/}).waitFor();
    await panel.getByText('群聊管理',{exact:true}).click();
    await panel.getByRole('heading',{name:'群聊管理',exact:true}).waitFor();

    const inherited=await page.evaluate(()=>{
      const store=window.__evaGetFileContext().store,state=store.snapshot();
      const group=Object.values(state.groups).find(item=>item.name==='采购与招投标');
      const governance=store.groupGovernance(group.id);
      const uid=governance.inheritedManagerIds.find(id=>id!==group.ownerId&&!governance.manualManagerIds.includes(id));
      return {groupId:group.id,projectId:group.projectId,uid,name:store.person(uid)?.name,actor:state.actorId};
    });
    assert.ok(inherited.uid,'预置项目群应包含已入群的项目管理员');
    const inheritedRow=panel.locator('.eva-chat-management-member-main').filter({hasText:inherited.name});
    await inheritedRow.getByText('管理员',{exact:true}).waitFor();
    assert.equal(await panel.getByRole('button',{name:'移除管理员 '+inherited.name,exact:true}).count(),0,'项目继承权限不能在群内撤销');
    await page.evaluate(({projectId,actor,uid})=>window.__evaGetFileContext().store.setAdmin(projectId,actor,uid,false),inherited);
    await inheritedRow.waitFor({state:'detached'});
    await page.evaluate(({projectId,actor,uid})=>window.__evaGetFileContext().store.setAdmin(projectId,actor,uid,true),inherited);
    await inheritedRow.getByText('管理员',{exact:true}).waitFor();

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

    const addManager=panel.getByRole('button',{name:'添加管理员',exact:true});
    assert.equal(await addManager.isEnabled(),true);
    const ownerRole=panel.locator('.eva-chat-management-member-main').filter({hasText:'王宜林'}).getByText('群主',{exact:true});
    await ownerRole.waitFor();
    assert.equal(await ownerRole.evaluate(label=>label.closest('.semi-tag')?.previousElementSibling?.textContent?.trim()),'王宜林','群主角色 Tag 应紧跟在人名后面');
    await addManager.click();
    const picker=page.locator('.eva-member-picker-modal');
    await picker.getByText('林晓',{exact:true}).click();
    await picker.getByRole('button',{name:'确认添加'}).click();
    await panel.getByText('林晓',{exact:true}).waitFor();
    const managerRole=panel.locator('.eva-chat-management-member-main').filter({hasText:'林晓'}).getByText('管理员',{exact:true});
    await managerRole.waitFor();
    assert.equal(await managerRole.evaluate(label=>label.closest('.semi-tag')?.previousElementSibling?.textContent?.trim()),'林晓','管理员角色 Tag 应紧跟在人名后面');
    const removeManager=panel.getByRole('button',{name:'移除管理员 林晓'});
    const removeManagerGeometry=await removeManager.evaluate(button=>({
      width:button.getBoundingClientRect().width,
      height:button.getBoundingClientRect().height,
      hasSvg:!!button.querySelector('svg'),
      iconClass:button.querySelector('svg')?.getAttribute('class')||'',
      text:button.textContent?.trim(),
      borderStyle:getComputedStyle(button).borderStyle
    }));
    assert.equal(removeManagerGeometry.width,24);
    assert.equal(removeManagerGeometry.height,24);
    assert.equal(removeManagerGeometry.hasSvg,true);
    assert.match(removeManagerGeometry.iconClass,/lucide-circle-minus/,'移除管理员应使用 Lucide CircleMinus');
    assert.equal(removeManagerGeometry.text,'');
    assert.equal(removeManagerGeometry.borderStyle,'none');

    const addBotManager=panel.getByRole('button',{name:'添加 Bot 管理员',exact:true});
    assert.equal(await addBotManager.isEnabled(),true);
    await addBotManager.click();
    await picker.locator('.eva-member-picker__candidate').first().click();
    await picker.getByRole('button',{name:'确认添加'}).click();
    const removeBotManager=panel.getByRole('button',{name:/^移除 Bot 管理员 /});
    await removeBotManager.waitFor();
    const botManagerRow=removeBotManager.locator('xpath=..');
    const botManagerRole=botManagerRow.getByText('Bot 管理员',{exact:true});
    assert.ok(await botManagerRole.count(),'Bot 管理员角色应作为姓名后的 Tag 展示');
    assert.ok(await botManagerRole.evaluate(label=>label.closest('.semi-tag')?.previousElementSibling?.textContent?.trim()),'Bot 管理员 Tag 前应紧邻身份名称');

    await panel.getByRole('button',{name:'返回聊天信息'}).click();
    await panel.getByText('GROUP.md',{exact:true}).click();
    await panel.getByRole('button',{name:'编辑',exact:true}).click();
    const groupMd=panel.getByRole('textbox',{name:'GROUP.md 内容'});
    await groupMd.fill('# 采购协作约定');
    await panel.getByRole('button',{name:'保存',exact:true}).click();
    assert.equal(await groupMd.inputValue(),'# 采购协作约定');
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
      await page.getByRole('button',{name:'聊天信息',exact:true}).click();
      const panel=page.locator('.eva-chat-settings');
      await panel.getByRole('button',{name:/^查看全部/}).click();
      await panel.getByRole('textbox',{name:'搜索群聊成员'}).fill('林晓');
      return panel;
    };
    let panel=await openMembers();
    await panel.getByRole('button',{name:'移除',exact:true}).click();
    const dialog=page.getByRole('dialog').filter({hasText:'确认移除成员'});
    await dialog.getByRole('button',{name:'cancel',exact:true}).click();
    assert.equal(await panel.locator('.eva-chat-member-list-row').count(),1);
    await panel.getByRole('button',{name:'移除',exact:true}).click();
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
