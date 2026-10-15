import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：转让并退出群聊完成闭环；转让失败保留选择，退出失败只重试退出群聊',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    for(const failure of ['none','transfer','leave']){
      const context=await browser.newContext({viewport:{width:1200,height:800}});
      await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
      // Fault injection wraps the real store; successful calls retain all actual side effects.
      await context.addInitScript(({failure})=>{
        let membership;
        Object.defineProperty(window,'EvaMembership',{configurable:true,get:()=>membership,set:api=>{
          membership={...api,bootstrap(...args){
            const store=api.bootstrap(...args),transfer=store.transfer,leave=store.leaveGroup;
            window.exitTest={store,transferCalls:0,leaveCalls:0,failure};
            store.transfer=async(...values)=>{
              window.exitTest.transferCalls++;
              await new Promise(resolve=>setTimeout(resolve,180));
              if(window.exitTest.failure==='transfer'){window.exitTest.failure='none';throw new Error('转让失败，请重试');}
              return transfer.apply(store,values);
            };
            store.leaveGroup=async(...values)=>{
              window.exitTest.leaveCalls++;
              if(window.exitTest.failure==='leave'){window.exitTest.failure='none';throw new Error('退出失败，请重试');}
              return leave.apply(store,values);
            };
            return store;
          }};
        }});
      },{failure});
      const page=await context.newPage();
      await page.goto(origin+'/#/messages');
      await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();
      await page.getByRole('button',{name:'打开聊天信息'}).first().click();
      const panel=page.locator('.eva-chat-settings');
      const before=await page.evaluate(()=>{const s=window.exitTest.store.snapshot(),g=Object.values(s.groups).find(g=>g.name==='采购与招投标');return {id:g.id,actor:s.actorId,clones:g.cloneIds.filter(id=>s.clones.some(c=>c.id===id&&c.ownerId===s.actorId))};});
      await panel.getByRole('button',{name:'退出群聊',exact:true}).click();
      await page.getByRole('button',{name:'选择新群主',exact:true}).click();
      const picker=page.locator('.semi-modal:visible').filter({has:page.getByRole('heading',{name:'选择新群主',exact:true})});
      await picker.getByText('确认后，所选成员将成为群主，你和你的 AI 分身将退出本群及全部子区。',{exact:true}).waitFor();
      await picker.getByRole('button',{name:'转让并退出群聊',exact:true}).click();
      await picker.getByText('请选择一位新群主',{exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>window.exitTest.transferCalls),0);
      await picker.locator('.eva-picker-row').first().click();
      await page.waitForTimeout(350); // Capture settled native Modal animation, not the entry frame.
      await page.screenshot({path:`/tmp/eva-transfer-exit-${failure}-selection.png`});
      await picker.getByRole('button',{name:'转让并退出群聊',exact:true}).dblclick();
      if(failure==='transfer'){
        await picker.getByRole('alert').filter({hasText:'转让失败，请重试'}).waitFor();
        assert.equal(await page.evaluate(()=>window.exitTest.leaveCalls),0);
        assert.equal(await page.evaluate(id=>window.exitTest.store.groupRecord(id).ownerId,before.id),before.actor);
        await picker.getByRole('button',{name:'转让并退出群聊',exact:true}).click();
      }
      if(failure==='leave'){
        const retry=page.locator('.semi-modal:visible').filter({has:page.getByRole('heading',{name:'退出未完成',exact:true})});
        await retry.getByText('群主已转让，你仍在群内。请重试退出群聊。',{exact:true}).waitFor();
        assert.equal(await page.evaluate(({id,actor})=>window.exitTest.store.canRead(id,actor),before),true);
        await page.waitForTimeout(350);
        await page.screenshot({path:'/tmp/eva-transfer-exit-retry.png'});
        await retry.getByRole('button',{name:'重试退出群聊',exact:true}).click();
      }
      await panel.waitFor({state:'detached',timeout:5000});
      await page.locator('.semi-toast').filter({hasText:'已转让群主并退出群聊'}).waitFor();
      await page.waitForTimeout(350);
      await page.screenshot({path:`/tmp/eva-transfer-exit-${failure}-success.png`});
      const after=await page.evaluate(({id,actor})=>{const t=window.exitTest,g=t.store.groupRecord(id);return {owner:g.ownerId,member:g.humans.some(m=>m.id===actor),clones:g.cloneIds,access:t.store.canRead(id,actor),transferCalls:t.transferCalls,leaveCalls:t.leaveCalls};},before);
      assert.notEqual(after.owner,before.actor);
      assert.equal(after.member,false);
      assert.equal(after.access,false);
      assert.ok(before.clones.every(id=>!after.clones.includes(id)));
      assert.equal(after.transferCalls,failure==='transfer'?2:1,'双击及退出重试均不重复转让');
      assert.equal(after.leaveCalls,failure==='leave'?2:1);
      assert.equal(await page.locator('.semi-toast').filter({hasText:'群主已转让'}).count(),0,'不重复弹转让成功');
      await context.close();
    }
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
