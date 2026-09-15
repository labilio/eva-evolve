import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.platform === 'darwin' ? {channel: 'msedge'} : {});

try {
  const page = await browser.newPage({viewport: {width: 1200, height: 800}});
  await page.goto(`${origin}/#/messages`);
  await page.evaluate(() => localStorage.removeItem('eva:project-members:v1'));
  await page.reload();
  await page.getByRole('button', {name: '最近', exact: true}).click();

  const nonProjectThread = page.locator('.wk-conversationlist-item').filter({hasText: '近期体验反馈整理'});
  await nonProjectThread.waitFor();
  assert.match(await nonProjectThread.innerText(), /王宜林: 好，这里先保留原始反馈和复现路径/);

  const projectThread = page.locator('.wk-conversationlist-item').filter({hasText: '到期合同续签确认'});
  await projectThread.waitFor();
  assert.match(await projectThread.innerText(), /本子区集中讨论到期合同续签确认/);

  const legacyThread = page.locator('.wk-conversationlist-item').filter({hasText: '本周试讲准备'});
  await legacyThread.waitFor();
  assert.match(await legacyThread.innerText(), /秦漱: 演示时直接点开两个空间的群聊/);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
