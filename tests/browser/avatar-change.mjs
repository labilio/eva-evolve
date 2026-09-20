import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

// 1×1 PNG, enough to drive the crop/export path without external assets.
const ONE_PIXEL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const uploadFile = {name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from(ONE_PIXEL_PNG, 'base64')};

test('身份资料卡可更换头像：本人/分身主人/助理可编辑，写唯一数据源并持久化', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? {channel: 'msedge'} : {});
  const pageErrors = [];
  try {
    const context = await browser.newContext({viewport: {width: 1200, height: 800}});
    // Local UI acceptance only: never contact the shared review service or external accounts.
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => pageErrors.push(String(error)));

    const humanTrigger = name => page.locator(`button[aria-label="查看 ${name} 的资料"]`);
    const card = page.locator('.eva-person-card');
    const editor = page.locator('.eva-avatar-editor');
    const fileInput = editor.locator('input[type=file][aria-label="选择头像图片"]');
    const cardAvatarSrc = () => card.locator('.eva-person-card__avatar img').getAttribute('src');
    const closeCard = async () => { await page.locator('.eva-person-card-modal .semi-modal-close').click(); await card.waitFor({state: 'detached'}); };
    // 头像编辑器是终态：没有返回按钮，保存后直接关闭整个资料卡，不回资料视图。
    const openEditor = async () => {
      await card.locator('.eva-person-card__avatar-edit').click();
      await editor.waitFor();
      assert.equal(await editor.locator('.eva-avatar-editor__back').count(), 0, '编辑器不再提供返回按钮');
    };
    const saveEditor = async () => {
      await editor.getByRole('button', {name: '保存'}).click();
      await card.waitFor({state: 'detached'});
    };
    const upload = async () => {
      await openEditor();
      await fileInput.setInputFiles(uploadFile);
      await editor.locator('canvas.eva-avatar-editor__canvas').waitFor();
      await saveEditor();
    };
    const restoreDefault = async () => {
      await openEditor();
      await editor.getByRole('button', {name: '恢复默认头像'}).click();
      await saveEditor();
    };

    await page.goto(origin + '/#/contacts');
    const selfAvatar = page.locator('button[aria-label="查看 王宜林 的资料"] img.eva-contacts__avatar');
    await selfAvatar.waitFor();
    const humanDefault = await selfAvatar.getAttribute('src');

    // 本人资料卡：入口、仅上传（无预设区）、取消与保存都关闭整个资料卡。
    await humanTrigger('王宜林').click();
    await card.waitFor();
    assert.equal(await cardAvatarSrc(), humanDefault);
    await openEditor();
    assert.equal(await editor.locator('.eva-avatar-editor__presets').count(), 0, '不再提供预设头像');
    assert.equal(await fileInput.count(), 1);
    await editor.getByRole('button', {name: '取消'}).click();
    await card.waitFor({state: 'detached'});
    await humanTrigger('王宜林').click();
    await card.waitFor();
    await upload();
    const humanUploaded = await selfAvatar.getAttribute('src');
    assert.match(humanUploaded, /^data:image\/png;base64,/);
    assert.equal(await selfAvatar.getAttribute('src'), humanUploaded, '通讯录同步本人新头像');

    // 刷新后仍保留。
    await page.reload();
    await selfAvatar.waitFor();
    assert.equal(await selfAvatar.getAttribute('src'), humanUploaded, '刷新后本人头像持久化');

    // 本人分身：主人可改，通讯录与资料卡同源。
    const cloneTrigger = humanTrigger('王宜林的 AI 分身');
    const cloneDefault = await cloneTrigger.locator('img.eva-identity-avatar__logo').getAttribute('src');
    await cloneTrigger.click();
    await card.waitFor();
    assert.equal(await card.locator('img.eva-identity-avatar__logo').getAttribute('src'), cloneDefault);
    await upload();
    const cloneUploaded = await cloneTrigger.locator('img.eva-identity-avatar__logo').getAttribute('src');
    assert.notEqual(cloneUploaded, cloneDefault);
    assert.equal(await cloneTrigger.locator('img.eva-identity-avatar__logo').getAttribute('src'), cloneUploaded, '通讯录同步分身新头像');

    // 别人的资料卡不提供更换头像入口。
    await humanTrigger('林晓').click();
    await card.waitFor();
    assert.equal(await card.locator('.eva-person-card__avatar-edit').count(), 0, '不能更换别人的头像');
    await closeCard();

    // 恢复默认：人类回到系统头像，分身回到 Eva Logo。
    await humanTrigger('王宜林').click();
    await card.waitFor();
    await restoreDefault();
    assert.notEqual(await selfAvatar.getAttribute('src'), humanUploaded);
    await cloneTrigger.click();
    await card.waitFor();
    await restoreDefault();
    assert.equal(await cloneTrigger.locator('img.eva-identity-avatar__logo').getAttribute('src'), cloneDefault);

    await page.reload();
    await selfAvatar.waitFor();
    assert.notEqual(await selfAvatar.getAttribute('src'), humanUploaded, '恢复默认后不再使用自定义头像');
    assert.equal(await cloneTrigger.locator('img.eva-identity-avatar__logo').getAttribute('src'), cloneDefault, '分身恢复默认持久化');

    assert.deepEqual(pageErrors, [], '页面不应出现未捕获 JavaScript 错误');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('我的 AI 的个人助理经身份资料卡更换头像，身份行与会话消息同步', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? {channel: 'msedge'} : {});
  const pageErrors = [];
  try {
    const context = await browser.newContext({viewport: {width: 1200, height: 800}});
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => pageErrors.push(String(error)));

    const card = page.locator('.eva-person-card');
    const editor = page.locator('.eva-avatar-editor');
    const assistantAvatars = page.locator('.eva-ai-team__role-group[aria-label="个人助理"] .eva-ai-team__assistant-avatar img');
    const hasAssistantAvatar = value => assistantAvatars.evaluateAll((nodes, src) => nodes.some(node => node.getAttribute('src') === src), value);

    await page.goto(`${origin}/#/messages?evaIM=my-ai`);
    await page.locator('.eva-ai-team').waitFor();
    await page.locator('.eva-ai-team__role-group[aria-label="个人助理"] .eva-ai-team__identity-button').first().click();
    await page.locator('.eva-ai-team__team-thread-row').first().click();
    const inbound = page.locator('.ch-main__stream .wk-msg-row:not(.wk-msg-row--send)').first();
    await inbound.waitFor();
    const messageAvatar = inbound.locator('.wk-msg-row-avatar img');
    const messageDefault = await messageAvatar.getAttribute('src');

    // 个人助理身份行不提供卡片入口，经会话身份点击进入同一资料卡。
    await inbound.locator('.wk-msg-row-sender').first().click();
    await card.waitFor();
    const name = await card.locator('.eva-person-card__name-row h2').innerText();
    assert.equal(await card.locator('.eva-person-card__avatar-edit').count(), 1, `${name} 应可更换头像`);
    await card.locator('.eva-person-card__avatar-edit').click();
    await editor.waitFor();
    assert.equal(await editor.locator('.eva-avatar-editor__back').count(), 0, '编辑器不再提供返回按钮');
    assert.equal(await editor.locator('.eva-avatar-editor__presets').count(), 0, '不再提供预设头像');
    await editor.locator('input[type=file][aria-label="选择头像图片"]').setInputFiles(uploadFile);
    await editor.locator('canvas.eva-avatar-editor__canvas').waitFor();
    await editor.getByRole('button', {name: '保存'}).click();
    await card.waitFor({state: 'detached'});
    const uploaded = await messageAvatar.getAttribute('src');
    assert.match(uploaded, /^data:image\/png;base64,/);
    assert.equal(await hasAssistantAvatar(uploaded), true, '我的 AI 身份行同步');

    // 恢复默认回到 Eva Logo：重新经会话身份进入同一资料卡。
    await inbound.locator('.wk-msg-row-sender').first().click();
    await card.waitFor();
    await card.locator('.eva-person-card__avatar-edit').click();
    await editor.waitFor();
    await editor.getByRole('button', {name: '恢复默认头像'}).click();
    await editor.getByRole('button', {name: '保存'}).click();
    await card.waitFor({state: 'detached'});
    assert.equal(await messageAvatar.getAttribute('src'), messageDefault, '恢复默认回到原有头像');
    assert.equal(await hasAssistantAvatar(uploaded), false);

    assert.deepEqual(pageErrors, [], '页面不应出现未捕获 JavaScript 错误');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('资料卡上传图片经圆形裁切导出 PNG，缩放与拖拽可用', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? {channel: 'msedge'} : {});
  const pageErrors = [];
  try {
    const context = await browser.newContext({viewport: {width: 1200, height: 800}});
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => pageErrors.push(String(error)));

    const card = page.locator('.eva-person-card');
    const editor = page.locator('.eva-avatar-editor');
    const selfAvatar = page.locator('button[aria-label="查看 王宜林 的资料"] img.eva-contacts__avatar');

    await page.goto(origin + '/#/contacts');
    await selfAvatar.waitFor();
    await page.locator('button[aria-label="查看 王宜林 的资料"]').click();
    await card.waitFor();
    await card.locator('.eva-person-card__avatar-edit').click();
    await editor.waitFor();
    // 圆形头像区域本身可点击上传，无需先找到按钮。
    assert.equal(await editor.locator('.eva-avatar-editor__stage[role=button][aria-label="上传头像"]').count(), 1);
    assert.match(await editor.locator('.eva-avatar-editor__hint').innerText(), /小于 1 MB/);
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), editor.locator('.eva-avatar-editor__stage').click()]);
    await chooser.setFiles(uploadFile);

    const canvas = editor.locator('canvas.eva-avatar-editor__canvas');
    await canvas.waitFor();
    const zoom = editor.locator('.eva-avatar-editor__zoom input[type=range]');
    await zoom.waitFor();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2 + 12);
    await page.mouse.up();
    await zoom.fill('2');

    await editor.getByRole('button', {name: '保存'}).click();
    await card.waitFor({state: 'detached'});
    const uploaded = await selfAvatar.getAttribute('src');
    assert.match(uploaded, /^data:image\/png;base64,/, '上传导出为 PNG');

    await page.reload();
    await selfAvatar.waitFor();
    assert.equal(await selfAvatar.getAttribute('src'), uploaded, '上传头像刷新后保留');

    // 清理：恢复系统默认头像。
    await page.locator('button[aria-label="查看 王宜林 的资料"]').click();
    await card.waitFor();
    await card.locator('.eva-person-card__avatar-edit').click();
    await editor.waitFor();
    await editor.getByRole('button', {name: '恢复默认头像'}).click();
    await editor.getByRole('button', {name: '保存'}).click();
    await card.waitFor({state: 'detached'});

    assert.deepEqual(pageErrors, [], '页面不应出现未捕获 JavaScript 错误');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('左下角账号菜单的「更换头像」直接打开共用编辑器并写回账号头像', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? {channel: 'msedge'} : {});
  const pageErrors = [];
  try {
    const context = await browser.newContext({viewport: {width: 1200, height: 800}});
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => pageErrors.push(String(error)));

    const account = page.locator('.eva-sider-account');
    const accountAvatar = account.locator('img.eva-sider-account__avatar');
    const editor = page.locator('.eva-avatar-editor');
    const openAvatarEditorFromMenu = async () => {
      await account.click();
      await page.locator('.eva-account-menu__item').filter({hasText: '更换头像'}).click();
      await editor.waitFor();
      assert.equal(await editor.locator('.eva-avatar-editor__back').count(), 0, '账号菜单入口不提供返回按钮');
    };

    await page.goto(origin + '/');
    await account.waitFor();
    const before = await accountAvatar.getAttribute('src');

    await openAvatarEditorFromMenu();
    await editor.locator('input[type=file][aria-label="选择头像图片"]').setInputFiles(uploadFile);
    await editor.locator('canvas.eva-avatar-editor__canvas').waitFor();
    await editor.getByRole('button', {name: '保存'}).click();
    await page.locator('.eva-person-card').waitFor({state: 'detached'});
    const uploaded = await accountAvatar.getAttribute('src');
    assert.match(uploaded, /^data:image\/png;base64,/, '账号菜单入口保存为 PNG');
    assert.notEqual(uploaded, before, '账号菜单更换头像后账号头像更新');

    await page.reload();
    await account.waitFor();
    assert.equal(await accountAvatar.getAttribute('src'), uploaded, '刷新后账号菜单设置的头像持久化');

    // 清理：恢复系统默认头像。
    await openAvatarEditorFromMenu();
    await editor.getByRole('button', {name: '恢复默认头像'}).click();
    await editor.getByRole('button', {name: '保存'}).click();
    await page.locator('.eva-person-card').waitFor({state: 'detached'});

    assert.deepEqual(pageErrors, [], '页面不应出现未捕获 JavaScript 错误');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
