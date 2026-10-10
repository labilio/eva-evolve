import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('personal unread count stays below message time and uses the shared badge in wide and narrow layouts', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.platform === 'darwin' ? {channel: 'msedge'} : {});
  try {
    const page = await browser.newPage();
    for (const width of [1365, 900]) {
      await page.setViewportSize({width, height: 900});
      await page.goto(`http://127.0.0.1:${server.address().port}/#/guid`);
      await page.mouse.move(width - 20, 700);
      const unreadRow = page.locator('.eva-personal-thread:has([data-eva-unread])').first();
      await unreadRow.waitFor();
      const result = await unreadRow.evaluate(row => {
        const time = row.querySelector('time').getBoundingClientRect();
        const badge = row.querySelector('[data-eva-unread]').getBoundingClientRect();
        const preview = row.querySelector('.eva-personal-thread__preview');
        return {timeBottom: time.bottom, badgeTop: badge.top, rightDelta: Math.abs(time.right - badge.right), preview: preview.textContent.trim(), badgeHeight: badge.height};
      });
      assert.ok(result.badgeTop >= result.timeBottom, `${width}px: unread count sits below the latest-message time`);
      assert.ok(result.rightDelta <= 2, `${width}px: time and count share a right edge`);
      assert.ok(result.preview.length > 0, `${width}px: latest message preview is present`);
      assert.equal(result.badgeHeight, 16, `${width}px: badge retains the shared component geometry`);
      await unreadRow.hover();
      const hover = await unreadRow.evaluate(row => {
        const actions = row.querySelector('.eva-personal-thread__actions').getBoundingClientRect();
        const badge = row.querySelector('[data-eva-unread]').getBoundingClientRect();
        return {actionsBottom: actions.bottom, badgeTop: badge.top, rowBackground: getComputedStyle(row).backgroundColor, sharedHover: getComputedStyle(document.documentElement).getPropertyValue('--eva-conversation-row-hover').trim()};
      });
      assert.ok(hover.actionsBottom <= hover.badgeTop, `${width}px: hover actions do not cover the unread count`);
      assert.ok(hover.sharedHover, `${width}px: row uses the shared conversation hover token`);
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
