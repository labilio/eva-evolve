import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';

const styleOf = locator => locator.evaluate(element => {
  const style = getComputedStyle(element);
  return {
    width: style.width,
    height: style.height,
    borderRadius: style.borderRadius,
    backgroundColor: style.backgroundColor,
    color: style.color,
  };
});

test('我的项目与我的消息使用相同的群聊展开按钮状态', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());
  const page = await context.newPage();

  try {
    await page.goto(`${origin}/#/messages`);
    const messageToggle = page.locator('.eva-follow-category[aria-label="供应链运营协同"] .wk-conv-compact-thread-toggle').first();
    await messageToggle.waitFor();
    const messageDefault = await styleOf(messageToggle);
    await messageToggle.hover();
    const messageHover = await styleOf(messageToggle);

    await page.goto(`${origin}/#/collab?evaProject=prod`);
    await page.getByRole('tab', { name: /群聊/ }).click();
    const projectToggle = page.locator('.collab-frame[data-eva-channel-surface="project"] .wk-conv-compact-thread-toggle').first();
    await projectToggle.waitFor();
    const projectDefault = await styleOf(projectToggle);
    await projectToggle.hover();
    const projectHover = await styleOf(projectToggle);

    assert.deepEqual(messageDefault, {
      width: '32px',
      height: '22px',
      borderRadius: '6px',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      color: 'rgb(124, 135, 144)',
    });
    assert.deepEqual(messageHover, {
      ...messageDefault,
      backgroundColor: 'rgb(228, 231, 234)',
      color: 'rgb(63, 72, 81)',
    });
    assert.deepEqual(projectDefault, messageDefault);
    assert.deepEqual(projectHover, messageHover);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
