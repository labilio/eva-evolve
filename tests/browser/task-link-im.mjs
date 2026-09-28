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
    await page.getByText(/任务要求复核 A-2409 的隔离措施/).waitFor();
    assert.equal(await link.textContent(),'SC-103 · 处理关键供应商来料质量异常');
    await link.click();
    await page.locator('.loop-idp__title').waitFor();
    assert.equal(await page.locator('.loop-idp__title').inputValue(),'处理关键供应商来料质量异常');
    assert.match(page.url(),/evaProject=prod&evaTab=tasks&evaTask=SC-103/);

    await page.getByRole('button',{name:'更多操作'}).click();
    await page.getByText('复制任务链接').click();
    const copied=await page.evaluate(()=>navigator.clipboard.readText());
    assert.equal(copied,origin+'/#/collab?evaProject=prod&evaTab=tasks&evaTask=SC-103');

    await page.goBack();
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
    await page.getByText('你没有该项目的访问权限，无法查看任务').waitFor();
    assert.deepEqual(errors,[]);
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
