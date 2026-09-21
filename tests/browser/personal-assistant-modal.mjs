import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const firstIcon = '🍌';
const secondIcon = '🚀';

test('个人助理在我的 Agent 内用共享弹窗新建，并通过图标选择器设置头像', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;

  try {
    const edge = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
    browser = await chromium.launch(process.platform === 'darwin' && fs.existsSync(edge) ? { channel: 'msedge' } : {});
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const name = '头像图标验收助理';
    await page.goto(`${origin}/#/messages?evaIM=my-ai`);
    const header = page.locator('.eva-ai-team__sidebar-header');
    await header.getByRole('button', { name: '新建', exact: true }).click();
    await page.getByText('新建个人助理', { exact: true }).click();

    const editor = page.locator('.eva-editor-dialog');
    await editor.locator('.eva-create-assistant-modal').waitFor();
    assert.equal(await page.evaluate(() => location.hash), '#/messages?evaIM=my-ai');
    assert.equal(await editor.getByLabel('头像图片地址').count(), 0);
    assert.equal(await editor.getByRole('tab', { name: '协作', exact: true }).count(), 0);
    await editor.getByLabel('助理名称').fill(name);
    await editor.getByRole('button', { name: '选择助理头像图标' }).click();
    const picker = editor.getByRole('listbox', { name: '助理头像图标' });
    await picker.waitFor();
    await picker.getByRole('option', { name: firstIcon }).click();
    await editor.getByRole('button', { name: '更换助理头像' }).waitFor();
    assert.equal((await editor.locator('.eva-editor-avatar-button .eva-identity-avatar__icon').textContent()).trim(), firstIcon);
    assert.equal(await editor.locator('.eva-editor-avatar-button .eva-identity-avatar__owner').count(), 0);

    if (process.env.EVA_ASSISTANT_SCREENSHOT) {
      await page.screenshot({ path: process.env.EVA_ASSISTANT_SCREENSHOT, animations: 'disabled' });
    }

    await editor.getByRole('button', { name: '创建', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    await page.getByText(name, { exact: true }).waitFor();
    let saved = await page.evaluate(value => window.EvaAITeam.getSnapshot().localAssistants.find(item => item.name === value), name);
    assert.equal(saved.configuration.avatar, firstIcon);
    saved = await page.evaluate(value => {
      const store = window.EvaAITeam;
      const assistant = store.getSnapshot().localAssistants.find(item => item.name === value);
      return store.saveLocalAssistant({ mode: 'edit', id: assistant.id, name: assistant.name, configuration: { ...assistant.configuration, collaboration: '历史协作配置' } });
    }, name);

    const createdIdentity = page.locator('.eva-ai-team__identity').filter({ hasText: name });
    const identityHeading = createdIdentity.locator('.eva-ai-team__identity-heading');
    await identityHeading.hover();
    const inlineActions = identityHeading.locator('.eva-ai-team__identity-action:visible');
    assert.equal(await inlineActions.count(), 1, '助理行 hover 只显示一个快捷操作');
    assert.equal(await inlineActions.getAttribute('aria-label'), '新建会话');
    assert.equal(await identityHeading.locator(':scope > .eva-ai-team__menu-anchor').count(), 0, '助理行不再显示更多或编辑图标');
    await createdIdentity.locator('.eva-ai-team__identity-button').click({ button: 'right' });
    const contextMenu = page.locator('.eva-context-menu');
    await contextMenu.getByRole('menuitem', { name: '新建会话', exact: true }).waitFor();
    await contextMenu.getByRole('menuitem', { name: '编辑配置', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await contextMenu.waitFor({ state: 'detached' });
    await createdIdentity.locator('.eva-ai-team__identity-button').click({ button: 'right' });
    await contextMenu.getByRole('menuitem', { name: '编辑配置', exact: true }).waitFor();
    await contextMenu.getByRole('menuitem', { name: '编辑配置', exact: true }).click();
    await editor.locator('.eva-create-assistant-modal').waitFor();
    assert.equal(await editor.getByRole('tab', { name: '协作', exact: true }).count(), 0);
    await editor.getByRole('button', { name: '更换助理头像' }).click();
    const editPicker = editor.getByRole('listbox', { name: '助理头像图标' });
    await editPicker.waitFor();
    await editPicker.getByRole('option', { name: secondIcon }).click();
    await editor.getByRole('button', { name: '保存', exact: true }).click();
    await editor.waitFor({ state: 'hidden' });
    saved = await page.evaluate(value => window.EvaAITeam.getSnapshot().localAssistants.find(item => item.name === value), name);
    assert.equal(saved.configuration.avatar, secondIcon);
    assert.equal(saved.configuration.collaboration, '历史协作配置');

    await page.locator('[data-eva-nav-id="messages"]').click();
    await page.waitForURL('**/#/messages');
    await page.locator('[data-eva-nav-id="my-ai"]').click();
    await page.waitForURL('**/#/messages?evaIM=my-ai');
    await page.getByText(name, { exact: true }).waitFor();
    assert.equal(await page.locator('.eva-editor-dialog').count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
