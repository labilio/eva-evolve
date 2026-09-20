import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';

test('个人 Eva 中栏从右上角新建分组，新分组置于最上并保留草稿', async () => {
  const server = createServer(new URL('../../dist', import.meta.url).pathname);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto(`${origin}/#/guid`);
    const header = page.locator('.eva-personal-rail-top');
    const trigger = header.getByRole('button', { name: '新建分组', exact: true });
    await trigger.waitFor();
    assert.equal((await trigger.boundingBox()).width, 32);
    assert.ok((await trigger.locator('svg').getAttribute('class')).includes('lucide-plus'));
    assert.equal(await header.getByRole('button', { name: '新对话', exact: true }).count(), 0);

    const composer = page.locator('.eva-composer-prompt');
    await composer.fill('浏览器验收草稿');
    await trigger.click();
    const form = page.locator('[data-eva-rail-form]');
    await form.waitFor();
    assert.equal(await form.locator('label').innerText(), '新建分组');
    assert.equal(await composer.inputValue(), '浏览器验收草稿');

    await form.getByPlaceholder('分组名称').fill('浏览器验收分组');
    await form.getByRole('button', { name: '新建', exact: true }).click();
    const firstGroup = page.locator('.eva-personal-folder__main span').first();
    assert.equal(await firstGroup.innerText(), '浏览器验收分组');
    assert.equal(await composer.inputValue(), '浏览器验收草稿');

    await page.reload();
    await firstGroup.waitFor();
    assert.equal(await firstGroup.innerText(), '浏览器验收分组');
    await page.locator('[data-eva-nav-id="messages"]').click();
    await page.locator('.ch-list').waitFor();
    await page.locator('[data-eva-nav-id="new-chat"]').click();
    await page.locator('.eva-personal-sider-panel').waitFor();
    assert.equal(await firstGroup.innerText(), '浏览器验收分组');
    assert.ok(await page.locator('.app-titlebar').isVisible());
    await page.screenshot({ path: '/tmp/eva-personal-new-group.png', fullPage: true });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
