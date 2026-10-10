import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('个人 Eva 文件夹和对话删除使用 Semi Popconfirm，取消不删除', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(process.platform === 'darwin' ? {channel: 'msedge'} : {});
  try {
    const page = await browser.newPage({viewport: {width: 1200, height: 800}});
    await page.goto(`http://127.0.0.1:${server.address().port}/#/guid`);
    const folderId = await page.locator('[data-eva-folder-menu]:not([data-eva-folder-menu=""])').first().getAttribute('data-eva-folder-menu');
    await page.locator(`[data-eva-folder-menu="${folderId}"]`).dispatchEvent('click');
    await page.locator(`[data-eva-delete-folder="${folderId}"]`).dispatchEvent('click');
    const confirm = page.locator('.semi-popconfirm');
    assert.match(await confirm.innerText(), /其中的对话会移回「最近」/);
    await confirm.getByRole('button', {name: '取消'}).click();
    assert.equal(await page.locator(`[data-eva-folder-menu="${folderId}"]`).count(), 1);
    const conversationId = await page.locator('[data-eva-personal-conversation-id]').first().getAttribute('data-eva-personal-conversation-id');
    await page.locator(`[data-eva-delete-conversation="${conversationId}"]`).dispatchEvent('click');
    assert.match(await confirm.innerText(), /删除后无法恢复/);
    await confirm.getByRole('button', {name: '删除'}).click();
    assert.equal(await page.locator(`[data-eva-personal-conversation-id="${conversationId}"]`).count(), 0);
    await page.reload();
    assert.equal(await page.locator(`[data-eva-personal-conversation-id="${conversationId}"]`).count(), 0);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
