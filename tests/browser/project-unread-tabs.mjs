import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('project task and chat tabs use the shared inline unread badge', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.platform === 'darwin' ? {channel: 'msedge'} : {});
  try {
    const page = await browser.newPage({viewport: {width: 1200, height: 800}});
    await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod`);
    const tabs = page.locator('.collab-tab');
    await tabs.first().waitFor();
    const taskBadge = tabs.filter({hasText: '任务'}).first().locator('[data-eva-unread]');
    const chatBadge = tabs.filter({hasText: '群聊'}).first().locator('[data-eva-unread]');
    assert.match(await taskBadge.innerText(), /^\d+$/);
    assert.match(await taskBadge.getAttribute('aria-label'), /个未读任务/);
    assert.match(await chatBadge.innerText(), /^\d+$/);
    const appearances = await Promise.all([taskBadge, chatBadge].map(badge => badge.evaluate(element => {
      const style = getComputedStyle(element);
      return {className: element.className, position: style.position, color: style.color, height: style.height};
    })));
    for (const appearance of appearances) {
      assert.equal(appearance.className, 'wk-conv-compact-badge');
      assert.equal(appearance.position, 'static');
      assert.equal(appearance.height, '16px');
    }
    await page.setViewportSize({width: 900, height: 800});
    assert.equal(await tabs.first().evaluate(element => getComputedStyle(element).whiteSpace), 'nowrap');
    assert.equal(await page.locator('.collab-tabs__list').evaluate(element => getComputedStyle(element).overflowX), 'auto');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
