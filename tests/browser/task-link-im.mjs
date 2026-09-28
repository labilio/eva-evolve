import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：项目任务链接在 IM 显示标题并打开原任务',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});
    const page=await context.newPage(),errors=[];
    await page.addInitScript(()=>{
      let membership;
      Object.defineProperty(window,'EvaMembership',{configurable:true,get(){return membership},set(api){
        membership={...api,bootstrap(...args){
          const store=api.bootstrap(...args);
          window.__taskLinkTestStore=store;
          return store;
        }};
      }});
    });
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/#/messages');
    const link=page.locator('[data-eva-task-link]').first();
    await link.waitFor();
    await page.getByText(/采购问 A-2409 什么时候能给供应商答复/).waitFor();
    await page.getByText(/待复核：A-2409 的隔离措施/).waitFor();
    assert.equal(await link.textContent(),'SC-103 · 处理关键供应商来料质量异常');
    assert.equal(await link.evaluate(el=>el.parentElement?.textContent),'SC-103 · 处理关键供应商来料质量异常','任务链接独立成行');
    await link.click();
    await page.locator('.loop-idp__title').waitFor();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.loop-idp__title').inputValue(),'处理关键供应商来料质量异常');
    assert.equal(page.url(),origin+'/#/messages','点击后保留消息路由');
    const layout=await page.evaluate(()=>{
      const rect=selector=>document.querySelector(selector)?.getBoundingClientRect();
      const rail=rect('.eva-msg .ch-list'),project=rect('.eva-inline-project-panel'),drawer=rect('.eva-inline-project-panel .collab-route-right .panel');
      return {railVisible:!!rail&&rail.width>0,projectX:project?.x,projectWidth:project?.width,drawerX:drawer?.x,drawerWidth:drawer?.width,drawerRight:drawer?.right,projectRight:project?.right};
    });
    assert.equal(layout.railVisible,true,'左侧消息列表保持可见');
    assert.ok(layout.drawerX>layout.projectX&&layout.drawerWidth<layout.projectWidth-120,'任务以项目右侧的窄抽屉展示');
    assert.ok(Math.abs(layout.drawerRight-layout.projectRight)<1,'任务抽屉贴住项目面板右缘');

    await page.getByRole('button',{name:'更多操作'}).click();
    await page.getByText('复制任务链接').click();
    const copied=await page.evaluate(()=>navigator.clipboard.readText());
    assert.equal(copied,origin+'/#/collab?evaProject=prod&evaTab=tasks&evaTask=SC-103');

    await page.locator('.collab-route-right .loop-idp__closebtn').click();
    await page.locator('.collab-route-right').waitFor({state:'detached'});
    assert.equal(await page.locator('.eva-inline-project-panel').count(),1,'关闭任务后仍在右侧项目中');
    await page.locator('.ch-list').getByText('供应链运营协同',{exact:true}).last().click();
    await page.locator('.eva-inline-project-panel').waitFor({state:'detached'});
    await link.waitFor();
    const composer=page.locator('[contenteditable=true][role=textbox]');
    await composer.fill(copied);
    await composer.press('Enter');
    await page.locator('[data-eva-task-link]').nth(1).waitFor();
    assert.deepEqual(await page.locator('[data-eva-task-link]').allTextContents(),[
      'SC-103 · 处理关键供应商来料质量异常',
      'SC-103 · 处理关键供应商来料质量异常',
    ]);
    await page.evaluate(()=>{
      const store=window.__taskLinkTestStore,canRead=store.canRead;
      store.canRead=(id,actor)=>id==='prod'?false:canRead(id,actor);
    });
    await page.locator('[data-eva-task-link]').first().click();
    assert.equal(page.url(),origin+'/#/messages','无项目权限时留在当前会话');
    assert.equal(await page.locator('.eva-inline-project-panel').count(),0,'无权限不打开项目面板');
    await page.getByText('你没有该项目的访问权限，无法查看任务').waitFor();
    assert.deepEqual(errors,[]);
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
