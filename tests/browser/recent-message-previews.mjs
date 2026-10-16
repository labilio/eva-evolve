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
  assert.equal(await page.locator('.eva-reminder-toolbar').count(), 0, '团队消息中栏恢复为改动前，不显示全部、未读、@我筛选');

  const nonProjectThread = page.locator('.wk-conversationlist-item').filter({has: page.getByRole('heading', {name: '近期体验反馈整理', exact: true})});
  await nonProjectThread.waitFor();
  assert.match(await nonProjectThread.innerText(), /周远的 AI 分身: 这是周远另一个项目里的任务/);
  assert.equal(await page.getByRole('navigation', {name: '群聊子区'}).count(), 0, '最近不再使用群内横向子区导航');
  assert.equal(await page.getByRole('button', {name: '搜索会话'}).count(), 0, '最近不再保留专属列表搜索入口');
  await nonProjectThread.click();
  assert.match(await nonProjectThread.getAttribute('class'), /wk-conversationlist-item-selected/, '打开子区时只选中对应的独立会话行');
  assert.match(await page.locator('.wk-chat-conversation-header-channel-info').innerText(), /近期体验反馈整理/);
  await page.getByRole('textbox', {name: '群聊中可 @ AI 与它对话'}).fill('独立草稿验收');
  await page.getByRole('heading', {name: '产品共创交流群', exact: true}).click();
  assert.doesNotMatch(await page.getByRole('textbox', {name: '群聊中可 @ AI 与它对话'}).innerText(), /独立草稿验收/);
  await nonProjectThread.click();
  assert.match(await page.getByRole('textbox', {name: '群聊中可 @ AI 与它对话'}).innerText(), /独立草稿验收/, '群内切换恢复各自草稿');
  await page.getByRole('textbox', {name: '群聊中可 @ AI 与它对话'}).fill('');
  const editor = page.getByRole('textbox', {name: '群聊中可 @ AI 与它对话'});
  await editor.fill('最近扁平会话验收：子区新消息');
  await editor.press('Enter');
  await page.waitForFunction(() => document.querySelector('.wk-conversationlist-item h3')?.textContent === '近期体验反馈整理');
  assert.match(await nonProjectThread.locator('.wk-conversationlist-item-lastmsg').innerText(), /王宜林: 最近扁平会话验收：子区新消息/);
  const projectThread = page.locator('.wk-conversationlist-item').filter({has: page.getByRole('heading', {name: '到期合同续签确认', exact: true})});
  await projectThread.waitFor();
  assert.equal(await projectThread.locator('.wk-conv-breadcrumb').count(), 0, '恢复旧版最近行后不额外占一行显示项目路径');
  assert.match(await projectThread.innerText(), /本子区集中讨论到期合同续签确认/);
  const legacyThread = page.locator('.wk-conversationlist-item').filter({has: page.getByRole('heading', {name: '本周试讲准备', exact: true})});
  await legacyThread.waitFor();
  assert.match(await legacyThread.innerText(), /王宜林: 收到。这个子区保留过程记录/);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
