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
    const cardAvatarSrc = () => card.locator('.eva-person-card__avatar img').first().getAttribute('src');
    const closeCard = async () => { await page.locator('.eva-person-card-modal .semi-modal-close').click(); await card.waitFor({state: 'detached'}); };
    // 资料卡入口（本人／分身／个人助理）：点击头像选图后一律进入同一个圆形裁剪，
    // 「取消 / 保存」确认后写回，资料卡保留并回到身份页。
    const uploadFromCardWithCrop = async () => {
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), card.locator('.eva-person-card__avatar-edit').click()]);
      await chooser.setFiles(uploadFile);
      const editor = page.locator('.eva-avatar-editor');
      await editor.locator('canvas.eva-avatar-editor__canvas').waitFor();
      assert.equal(await editor.getByRole('button', {name: '取消'}).count(), 1);
      assert.equal(await editor.getByRole('button', {name: '保存'}).count(), 1);
      await editor.getByRole('button', {name: '保存'}).click();
      await editor.waitFor({state: 'detached'});
    };

    await page.goto(origin + '/#/contacts');
    const selfAvatar = page.locator('button[aria-label="查看 王宜林 的资料"] img.eva-contacts__avatar');
    await selfAvatar.waitFor();
    const humanDefault = await selfAvatar.getAttribute('src');

    // 本人资料卡：入口常态不可见，悬停/键盘聚焦才出现整圆灰蒙版与居中相机。
    await humanTrigger('王宜林').click();
    await card.waitFor();
    assert.equal(await cardAvatarSrc(), humanDefault);
    const editEntry = card.locator('.eva-person-card__avatar-edit');
    await page.waitForTimeout(300);
    assert.equal(await editEntry.evaluate(el => getComputedStyle(el).opacity), '0', '入口常态不显示（弹窗自动聚焦也不显示）');
    await card.locator('.eva-person-card__avatar').hover();
    await page.waitForFunction(() => {
      const el = document.querySelector('.eva-person-card__avatar-edit');
      return el && getComputedStyle(el).opacity === '1';
    });
    const avatarBox = await card.locator('.eva-person-card__avatar').boundingBox();
    const editBox = await editEntry.boundingBox();
    assert.equal(Math.round(editBox.width), Math.round(avatarBox.width), '蒙版裁在头像圆内');
    await page.mouse.move(10, 10);
    await page.waitForTimeout(250);
    assert.equal(await editEntry.evaluate(el => getComputedStyle(el).opacity), '0', '移开鼠标后蒙版收起');
    // 点击入口选图后进入圆形裁剪，保存后资料卡仍保留并就地更新。
    await uploadFromCardWithCrop();
    const humanUploaded = await selfAvatar.getAttribute('src');
    assert.match(humanUploaded, /^data:image\/png;base64,/);
    assert.equal(await cardAvatarSrc(), humanUploaded, '资料卡就地更新新头像');
    await closeCard();

    // 刷新后仍保留。
    await page.reload();
    await selfAvatar.waitFor();
    assert.equal(await selfAvatar.getAttribute('src'), humanUploaded, '刷新后本人头像持久化');

    // 本人分身：默认主人主图 + Eva 角标，主人可更换主图，通讯录与资料卡同源。
    const cloneTrigger = humanTrigger('王宜林的 AI 分身');
    const cloneMain = () => cloneTrigger.locator('img.eva-identity-avatar__logo').getAttribute('src');
    const cloneCorner = cloneTrigger.locator('img.eva-identity-avatar__owner');
    const evaLogo = await page.evaluate(() => window.__EVA_COLLEAGUE_PORTRAIT);
    const cloneOwnerPortrait = await cloneMain();
    assert.equal(cloneOwnerPortrait, humanUploaded, '分身默认主图沿用主人头像');
    assert.equal(await cloneCorner.getAttribute('src'), evaLogo, '分身右下角恒为 Eva Logo');
    await cloneTrigger.click();
    await card.waitFor();
    assert.equal(await card.locator('img.eva-identity-avatar__logo').getAttribute('src'), cloneOwnerPortrait);
    // 蒙版显示时，右下角 Eva 角标仍在蒙版之上可见。
    await card.locator('.eva-person-card__avatar').hover();
    await page.waitForFunction(() => {
      const el = document.querySelector('.eva-person-card__avatar-edit');
      return el && getComputedStyle(el).opacity === '1';
    });
    assert.equal(await card.evaluate(cardEl => {
      const corner = cardEl.querySelector('.eva-identity-avatar__owner');
      if (!corner) return false;
      const r = corner.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return Boolean(top) && (top === corner || corner.contains(top));
    }), true, '蒙版显示时 Eva 角标仍在最上层');
    await uploadFromCardWithCrop();
    const cloneUploaded = await cloneMain();
    assert.match(cloneUploaded, /^data:image\/png;base64,/, '分身主图可更换');
    assert.equal(await cloneCorner.getAttribute('src'), evaLogo, '更换主图后角标仍为 Eva Logo');
    await closeCard();

    // 别人的资料卡不提供更换头像入口。
    await humanTrigger('林晓').click();
    await card.waitFor();
    assert.equal(await card.locator('.eva-person-card__avatar-edit').count(), 0, '不能更换别人的头像');
    await closeCard();

    // 刷新后分身主图保持。
    await page.reload();
    await selfAvatar.waitFor();
    assert.equal(await cloneMain(), cloneUploaded, '刷新后分身主图持久化');

    // 旧数据把 Eva Logo 存成分身主图：仍显示主人主图 + Eva 角标，不把 Logo 当主图。
    await page.evaluate(() => {
      const key = 'eva:project-members:v1';
      const state = JSON.parse(localStorage.getItem(key));
      const clone = state.clones.find(item => item.ownerId === 'u-wangyilin');
      clone.avatar = window.__EVA_COLLEAGUE_PORTRAIT;
      localStorage.setItem(key, JSON.stringify(state));
    });
    await page.reload();
    await selfAvatar.waitFor();
    assert.equal(await cloneMain(), humanUploaded, '旧 Logo 数据不能成为分身主图');
    assert.equal(await cloneCorner.getAttribute('src'), evaLogo, '旧 Logo 数据下 Eva 角标仍在');

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
    const messageAvatar = inbound.locator('.wk-msg-row-avatar img.eva-identity-avatar__logo');

    // 个人助理身份行不提供卡片入口，经会话身份点击进入同一资料卡；卡片入口直接上传。
    await inbound.locator('.wk-msg-row-sender').first().click();
    await card.waitFor();
    const name = await card.locator('.eva-person-card__name-row h2').innerText();
    assert.equal(await card.locator('.eva-person-card__avatar-edit').count(), 1, `${name} 应可更换头像`);
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), card.locator('.eva-person-card__avatar-edit').click()]);
    await chooser.setFiles(uploadFile);
    // AI 资料卡进入圆形裁剪，确认后写回。
    await editor.locator('canvas.eva-avatar-editor__canvas').waitFor();
    await editor.getByRole('button', {name: '保存'}).click();
    await editor.waitFor({state: 'detached'});
    await page.waitForFunction(() => {
      const img = document.querySelector('.eva-person-card__avatar img');
      return Boolean(img) && /^data:image\/png;base64,/.test(img.getAttribute('src') || '');
    });
    const uploaded = await messageAvatar.getAttribute('src');
    assert.match(uploaded, /^data:image\/png;base64,/);
    assert.equal(await hasAssistantAvatar(uploaded), true, '我的 AI 身份行同步');

    assert.deepEqual(pageErrors, [], '页面不应出现未捕获 JavaScript 错误');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('账号菜单编辑器：圆形舞台点击上传，缩放与拖拽可用并导出 PNG', async () => {
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
    const openEditor = async () => {
      await account.hover();
      await page.locator('.eva-account-menu__item').filter({hasText: '更换头像'}).click();
      await editor.waitFor();
    };

    await page.goto(origin + '/');
    await account.waitFor();
    await openEditor();
    // 常态（未选图）没有页脚按钮，选图后才出现 取消 / 保存。
    assert.equal(await editor.locator('.eva-avatar-editor__footer').count(), 0);
    // 圆形头像区域本身可点击上传，无需先找到按钮。
    assert.equal(await editor.locator('.eva-avatar-editor__stage[role=button][aria-label="上传头像"]').count(), 1);
    assert.match(await editor.locator('.eva-avatar-editor__hint').innerText(), /不超过 5 MB/);
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

    // 裁剪页提供 取消 / 保存；点保存才写回并关闭资料卡。
    assert.equal(await editor.getByRole('button', {name: '取消'}).count(), 1);
    assert.equal(await editor.getByRole('button', {name: '保存'}).count(), 1);
    await editor.getByRole('button', {name: '保存'}).click();
    await page.locator('.eva-person-card').waitFor({state: 'detached'});
    const uploaded = await accountAvatar.getAttribute('src');
    assert.match(uploaded, /^data:image\/png;base64,/, '上传导出为 PNG');

    await page.reload();
    await account.waitFor();
    assert.equal(await accountAvatar.getAttribute('src'), uploaded, '上传头像刷新后保留');

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
      // 账号菜单为悬浮触发：入口按钮与菜单都应可见可用。
      await account.hover();
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

    assert.deepEqual(pageErrors, [], '页面不应出现未捕获 JavaScript 错误');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
