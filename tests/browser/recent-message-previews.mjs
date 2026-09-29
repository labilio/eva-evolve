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
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/#/messages`);
  await page.evaluate(() => localStorage.removeItem('eva:project-members:v1'));
  await page.reload();
  await page.getByRole('button', {name: '最近', exact: true}).click();

  const group = page.locator('.wk-conversationlist-item').filter({has: page.getByRole('heading', {name: '产品共创交流群', exact: true})});
  await group.waitFor();
  assert.equal(await page.locator('.wk-conversationlist-item h3').filter({hasText: '近期体验反馈整理'}).count(), 0, '子区没有独立会话行');
  const purchasing = page.locator('.wk-conversationlist-item').filter({has: page.getByRole('heading', {name: '采购与招投标', exact: true})});
  assert.match(await purchasing.locator('.wk-conversationlist-item-indicators').innerText(), /16/, '群行汇总父群和子区未读');
  assert.match(await group.locator('.wk-conversationlist-item-lastmsg').innerText(), /近期体验反馈整理 · 周远的 AI 分身: 这是周远另一个项目里的任务/);
  await group.click();
  const tabs = page.getByRole('navigation', {name: '群聊子区'});
  await tabs.getByRole('button', {name: '全部'}).waitFor();
  await tabs.getByRole('button', {name: '近期体验反馈整理'}).click();
  assert.match(await page.locator('.wk-chat-conversation-header-channel-info').innerText(), /近期体验反馈整理/);
  assert.match(await group.getAttribute('class'), /wk-conversationlist-item-selected/, '进入子区仍选中所属大群');
  await tabs.getByRole('button', {name: '全部'}).click();
  assert.equal(await tabs.getByRole('button', {name: '全部'}).getAttribute('aria-current'), 'page');
  await page.getByRole('button', {name: '搜索会话'}).click();
  await page.getByRole('textbox', {name: '搜索群聊或子区'}).fill('近期体验反馈整理');
  const topicResult = page.locator('.wk-conversationlist-item').filter({has: page.getByRole('heading', {name: '产品共创交流群 / 近期体验反馈整理', exact: true})});
  await topicResult.waitFor();
  await topicResult.click();
  assert.match(await page.locator('.wk-chat-conversation-header-channel-info').innerText(), /近期体验反馈整理/);
  await page.getByRole('button', {name: '搜索会话'}).click();
  const editor = page.getByRole('textbox', {name: '发送给 近期体验反馈整理'});
  await editor.fill('最近聚合验收：子区新消息');
  await editor.press('Enter');
  await page.waitForFunction(() => document.querySelector('.wk-conversationlist-item h3')?.textContent === '采购与招投标' && document.querySelectorAll('.wk-conversationlist-item h3')[1]?.textContent === '产品共创交流群');
  assert.match(await group.locator('.wk-conversationlist-item-lastmsg').innerText(), /近期体验反馈整理 · 王宜林: 最近聚合验收：子区新消息/);
  assert.equal(await page.locator('.wk-conversationlist-item h3').filter({hasText: '近期体验反馈整理'}).count(), 0);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
