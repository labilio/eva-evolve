import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：群主可直接退出并由系统自动转让，单人群退出时解散全部子区',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const context=await browser.newContext({viewport:{width:1200,height:800}});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(10000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/#/messages');

    const groupRow=page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first();
    await groupRow.click();
    await page.getByRole('textbox',{name:'发送给 采购与招投标'}).waitFor();
    await page.getByRole('button',{name:'打开聊天信息'}).first().click();
    let panel=page.locator('.eva-chat-settings');
    await panel.getByRole('heading',{name:/^聊天信息（\d+）$/}).waitFor();
    await panel.getByRole('button',{name:'群聊管理',exact:true}).click();
    assert.equal(await panel.getByRole('button',{name:'转让群主',exact:true}).count(),1,'有可接任联系人时保留转让群主入口');
    await panel.getByRole('button',{name:'返回聊天信息'}).click();
    await panel.getByRole('button',{name:'退出群聊',exact:true}).click();
    assert.equal(await panel.getByRole('button',{name:'删除并退出',exact:true}).count(),0);

    let modal=page.locator('.semi-modal').filter({has:page.getByRole('heading',{name:'退出群聊',exact:true})});
    await modal.getByText('群主将自动转让给群内其他可接任成员',{exact:false}).waitFor();
    assert.equal(await modal.getByRole('button',{name:'退出群聊',exact:true}).count(),1);
    assert.equal(await modal.getByRole('button',{name:'转让群主',exact:true}).count(),1);
    await page.waitForTimeout(350);
    const positions=await modal.evaluate(node=>{
      const button=text=>Array.from(node.querySelectorAll('button')).find(item=>item.textContent.trim()===text).getBoundingClientRect();
      const exit=button('退出群聊'),cancel=button('取消'),transfer=button('转让群主');
      return {exit:{left:exit.left,right:exit.right},cancel:{left:cancel.left},transfer:{left:transfer.left}};
    });
    assert.ok(positions.exit.left<positions.cancel.left,'退出群聊应单独放在左侧');
    assert.ok(positions.cancel.left-positions.exit.right>100,'退出按钮与右侧操作组之间应有明显空白');
    assert.ok(positions.cancel.left<positions.transfer.left,'取消与转让群主保持右侧顺序');
    await page.screenshot({path:'/tmp/eva-group-owner-leave-confirm.png'});
    await modal.getByRole('button',{name:'转让群主',exact:true}).click();
    let transfer=page.locator('.semi-modal:visible');
    await transfer.getByText('转让群主',{exact:true}).waitFor();
    assert.ok(await transfer.locator('.eva-picker-row').count()>0,'手动转让只提供可接任的联系人');
    await transfer.getByRole('button',{name:'取消',exact:true}).click();
    await panel.getByRole('button',{name:'退出群聊',exact:true}).click();
    modal=page.locator('.semi-modal').filter({has:page.getByRole('heading',{name:'退出群聊',exact:true})});
    const before=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('eva:project-members:v1')),g=Object.values(s.groups).find(item=>item.name==='采购与招投标');return {id:g.id,ownerId:g.ownerId};});
    await modal.getByRole('button',{name:'退出群聊',exact:true}).click();
    await panel.waitFor({state:'detached'});
    const after=await page.evaluate(id=>{const s=JSON.parse(localStorage.getItem('eva:project-members:v1')),g=s.groups[id];return {actor:s.actorId,ownerId:g?.ownerId,isMember:g?.humans.some(item=>item.id===s.actorId)};},before.id);
    assert.notEqual(after.ownerId,before.ownerId,'直接退出后群主自动转让');
    assert.equal(after.isMember,false,'原群主退出父群');

    await page.evaluate(()=>{
      const key='eva:project-members:v1',state=JSON.parse(localStorage.getItem(key)),actor=state.actorId;
      state.groups['e2e-solo-group']={id:'e2e-solo-group',name:'单人退出测试群',projectId:null,ownerId:actor,humans:[{id:actor,role:'member'}],cloneIds:[]};
      state.threads['e2e-solo-thread']='e2e-solo-group';
      state.threadDetails['e2e-solo-thread']={id:'e2e-solo-thread',name:'单人群子区',status:1,created_at:'2026-09-15T10:00:00+08:00'};
      state.followedConversations=state.followedConversations||{};
      state.followedConversations[actor]=state.followedConversations[actor]||{};
      state.followedConversations[actor]['e2e-solo-group']=true;
      localStorage.setItem(key,JSON.stringify(state));
    });
    await page.reload();
    const soloRow=page.locator('.wk-conv-compact-item').filter({hasText:'单人退出测试群'}).first();
    await soloRow.click();
    await page.getByRole('textbox',{name:'发送给 单人退出测试群'}).waitFor();
    await page.getByRole('button',{name:'打开聊天信息'}).first().click();
    panel=page.locator('.eva-chat-settings');
    await panel.getByRole('button',{name:'群聊管理',exact:true}).click();
    assert.equal(await panel.getByRole('button',{name:'转让群主',exact:true}).count(),0,'无其他联系人时不显示转让群主死入口');
    await panel.getByRole('button',{name:'返回聊天信息'}).click();
    await panel.getByRole('button',{name:'退出群聊',exact:true}).click();
    modal=page.locator('.semi-modal').filter({has:page.getByRole('heading',{name:'退出群聊',exact:true})});
    await modal.getByText('退出群聊将解散本群及全部子区',{exact:false}).waitFor();
    await page.waitForTimeout(350);
    await page.screenshot({path:'/tmp/eva-group-owner-leave-dissolve-confirm.png'});
    await modal.getByRole('button',{name:'退出并解散',exact:true}).click();
    await panel.waitFor({state:'detached'});
    const dissolved=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('eva:project-members:v1'));return {group:s.groups['e2e-solo-group'],thread:s.threads['e2e-solo-thread']};});
    assert.deepEqual(dissolved,{group:undefined,thread:undefined});
    assert.equal(await page.locator('.app-titlebar:visible').count(),1);
    assert.equal(await page.locator('[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay').count(),0);
    assert.deepEqual(errors,[]);
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
