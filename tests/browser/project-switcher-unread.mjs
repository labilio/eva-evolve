import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('project switcher shows task counts and only reading distinct task details decrements them', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.platform === 'darwin' ? {channel: 'msedge'} : {});
  try {
    const page = await browser.newPage({viewport: {width: 1200, height: 800}});
    const base = `http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod`;
    await page.goto(base);
    const switcher = page.locator('.eva-project-switcher');
    await switcher.click();
    const prod = page.locator('.eva-project-switcher-menu [data-eva-project-id="prod"]');
    const badge = prod.locator('[data-eva-unread]');
    await badge.waitFor();
    const initial = Number((await badge.innerText()).match(/未读任务\s+(\d+)$/)?.[1]);
    assert.ok(initial >= 2);
    assert.equal(await badge.getAttribute('class'), 'wk-conv-compact-badge');
    await page.keyboard.press('Escape');
    await page.goto(`${base}&evaTab=tasks`);
    assert.equal(await page.evaluate(() => window.EvaProjectReminderDemo.count('prod')), initial);
    const records = await page.evaluate(() => window.EvaProjectReminderDemo.items('prod').slice(0, 2));
    for (let index = 0; index < records.length; index++) {
      await page.goto(`${base}&evaTab=tasks&evaTask=${encodeURIComponent(records[index].identifier)}`);
      await page.locator('.loop-idp__main').waitFor();
      await page.waitForFunction(expected => window.EvaProjectReminderDemo.count('prod') === expected, initial - index - 1);
    }
    await page.goto(`${base}&evaTab=tasks&evaTask=${encodeURIComponent(records[0].identifier)}`);
    await page.locator('.loop-idp__main').waitFor();
    assert.equal(await page.evaluate(() => window.EvaProjectReminderDemo.count('prod')), initial - 2);
    await page.goto(base);
    await switcher.click();
    assert.equal(Number((await badge.innerText()).match(/未读任务\s+(\d+)$/)?.[1]), initial - 2);
    assert.equal(await page.locator('.eva-project-switcher-menu [data-eva-project-id="lab"] [data-eva-unread]').count(), 1);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
