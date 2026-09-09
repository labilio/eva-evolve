import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';

let server, browser, page, origin;
before(async () => {
  server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  // These are local UI tests: never contact the shared review service or external accounts.
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());
  page = await context.newPage();
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

const color = el => el.evaluate(e => getComputedStyle(e).backgroundColor);
for (const scope of ['', 'collab-frame', 'collab-list-page', 'collab-empty']) {
  test(`主按钮状态在 ${scope || 'body/Portal'} 内保持蓝色语义`, async () => {
    await page.goto(`${origin}/#/messages`);
    await page.locator('.ch-layout').waitFor();
    await page.evaluate(scope => {
      document.querySelector('#button-contract')?.remove();
      const host = document.createElement('div'); host.id = 'button-contract'; host.className = scope;
      host.style.cssText='position:fixed;inset:80px 0 auto 200px;z-index:99999;background:white;padding:20px';
      host.innerHTML='<button id="solid" class="semi-button semi-button-primary semi-button-solid">主操作</button><button id="loop" class="loop-btn loop-btn--primary">任务操作</button><button id="disabled" disabled class="semi-button semi-button-primary semi-button-solid semi-button-disabled">禁用</button>';
      document.body.append(host);
    }, scope);
    for (const id of ['solid','loop']) {
      const button=page.locator('#'+id);
      await page.mouse.move(0,0);
      assert.equal(await color(button),'rgb(21, 99, 235)',`${id} default`);
      await button.hover(); await page.waitForTimeout(250);
      assert.equal(await color(button),'rgb(18, 85, 202)',`${id} hover`);
      await page.mouse.down(); await page.waitForTimeout(250);
      assert.equal(await color(button),'rgb(18, 85, 202)',`${id} active`);
      await page.mouse.up();
    }
    const disabled=page.locator('#disabled'), idle=await color(disabled);
    await disabled.hover({force:true}); await page.waitForTimeout(250); assert.equal(await color(disabled),idle,'禁用按钮悬停不得变为可用蓝色');
  });
}
test('真实新建项目入口 hover 保持蓝色',async()=>{
  await page.goto(`${origin}/#/collab`);
  const button=page.getByRole('button',{name:'新建项目',exact:true});
  await button.hover(); await page.waitForTimeout(250); assert.equal(await color(button),'rgb(18, 85, 202)');
});
