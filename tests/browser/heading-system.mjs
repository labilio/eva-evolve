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
async function open(route, selector) {
  await page.goto(`${origin}/#${route}`);
  const field = page.locator(selector).first();
  await field.waitFor({ state: 'visible' });
  return field;
}

for (const width of [1200, 1000]) {
  test(`一级功能标题在 ${width}px 下遵循统一合同`, async () => {
    await page.setViewportSize({width, height:900});
    for (const [route, header, title] of [
      ['/guid','.eva-rail-header','.eva-personal-rail-title'],
      ['/messages?evaIM=my-ai','.eva-rail-header','h1'],
      ['/messages','.eva-rail-header','h1'],
      ['/drive','.eva-drive__side-head','strong'],
      ['/contacts','.eva-contacts__main-head','.eva-contacts__title strong'],
      ['/eva-stub/工作板','.eva-feature-head','h1'],
      ['/eva-stub/技能','.eva-connection-center__head','h1'],
    ]) {
      const head = await open(route, header);
      const actual = await head.evaluate((el, selector) => {
        const t=el.querySelector(selector), s=getComputedStyle(t), h=getComputedStyle(el);
        return {font:s.fontSize, line:s.lineHeight, weight:s.fontWeight,
          height:el.getBoundingClientRect().height, left:h.paddingLeft, right:h.paddingRight,
          decorations:[...el.querySelectorAll('svg')].filter(i=>!i.closest('button,label,.eva-contacts__search')).length};
      }, title);
      assert.deepEqual(actual,{font:'16px',line:'24px',weight:'500',height:48,left:'16px',right:'16px',decorations:0},route);
      if(header==='.eva-rail-header') {
        const button=head.locator('button').first();
        assert.equal((await button.boundingBox()).width,32);
        assert.equal(await button.locator('svg').evaluate(e=>e.getBoundingClientRect().width),16);
        await button.click();
        await page.keyboard.press('Escape');
      }
    }
    await page.locator('[data-eva-nav-id="projects"]').click();
    await page.getByRole('button',{name:'供应链运营协同 协同推进间接采购、供应商质量与合规风控工作',exact:true}).click();
    await page.getByRole('tab',{name:/群聊/}).click();
    const head=page.locator('.eva-rail-header:visible');
    await head.waitFor();
    assert.equal(await head.locator('h1').innerText(),'群聊');
    assert.equal(await head.locator('input').count(),0);
    assert.equal((await head.boundingBox()).height,48);
    assert.equal(await head.locator('h1').evaluate(e=>getComputedStyle(e).fontSize),'16px');
    const plus=head.locator('button').first();
    assert.equal((await plus.boundingBox()).width,32);
    await plus.click();
    await page.keyboard.press('Escape');
  });
}
