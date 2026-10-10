import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('truncated personal conversation opens a Semi Popover with current conversation details', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.platform === 'darwin' ? {channel: 'msedge'} : {});
  try {
    const page = await browser.newPage({viewport: {width: 900, height: 800}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/#/guid`);
    const row = page.locator('.eva-personal-thread').first();
    await row.waitFor();
    await row.hover();
    const card = page.locator('.eva-conversation-hover-card:visible');
    await card.waitFor();
    assert.match(await card.getAttribute('class'), /semi-popover/);
    assert.match(await card.innerText(), /UI设计师发展前景的PPT/);
    assert.match(await card.innerText(), /分组\s*最近/);
    assert.match(await card.innerText(), /已调整结论页/);
    assert.match(await card.innerText(), /3 小时/);
    assert.equal(await page.locator('.eva-passive-tooltip:visible').count(), 0, 'conversation uses Popover, not the short-text Tooltip');
    await row.locator('[data-eva-personal-conversation-id]').click();
    await card.waitFor({state: 'hidden'});
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
