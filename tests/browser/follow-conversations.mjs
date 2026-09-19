import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('关注会话：取消关注、重新添加到关注，项目取关即取消置顶', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch(process.platform === 'darwin' ? {channel: 'msedge'} : {});
  const page = await browser.newPage({viewport: {width: 1200, height: 800}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin + '/#/messages');
    await page.locator('.eva-follow-category').first().waitFor();
    const menu = page.locator('.eva-context-menu');
    const items = () => menu.getByRole('menuitem').allTextContents();
    const thread = page.locator('.eva-follow-channel > .wk-conv-compact-item--thread').filter({hasText: '近期体验反馈整理'});

    // 取关子区：菜单出现取消关注，点击后从关注消失，父群仍在
    await thread.click({button: 'right'});
    assert.ok((await items()).includes('取消关注'), '关注中的会话应提供取消关注');
    await menu.getByRole('menuitem', {name: '取消关注', exact: true}).click();
    await page.waitForFunction(() => ![...document.querySelectorAll('.eva-follow-channel .wk-conv-compact-item--thread')].some(el => el.textContent.includes('近期体验反馈整理')));

    // 最近重新添加到关注
    await page.getByRole('button', {name: '最近', exact: true}).click();
    const row = page.locator('.wk-conversationlist-item').filter({has: page.getByRole('heading', {name: '近期体验反馈整理', exact: true})});
    await row.click({button: 'right'});
    assert.ok((await items()).includes('添加到关注'), '未关注的会话应提供添加到关注');
    await menu.getByRole('menuitem', {name: '添加到关注', exact: true}).hover();
    await menu.getByRole('menuitem', {name: '其他会话', exact: true}).click();
    await page.getByRole('button', {name: '关注', exact: true}).click();
    await page.locator('.eva-follow-channel > .wk-conv-compact-item--thread').filter({hasText: '近期体验反馈整理'}).waitFor();

    // 项目会话取消关注等同取消置顶整个项目
    const project = page.locator('.eva-follow-channel > .wk-conv-compact-item').filter({hasText: '采购与招投标'}).first();
    await project.click({button: 'right'});
    assert.ok((await items()).includes('取消关注'));
    await menu.getByRole('menuitem', {name: '取消关注', exact: true}).click();
    await page.waitForFunction(() => ![...document.querySelectorAll('.eva-follow-channel > .wk-conv-compact-item')].some(el => el.textContent.includes('采购与招投标')));
    await page.goto(origin + '/#/collab');
    await page.locator('.eva-project-directory-list').waitFor();
    assert.equal(await page.getByRole('button', {name: /^关注 供应链运营协同$/}).count(), 1, '取关后项目页显示为可关注');

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(r => server.close(r));
  }
});
