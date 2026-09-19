import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';

/* 浮层失焦关闭（点击内容区空白处收起）验收
   覆盖：右键菜单、锚定下拉、浮出面板、选择器弹窗与遮罩弹窗。
   浮层清单与例外项见 docs/弹窗失焦关闭规范.md。 */
test('浮层：点击内容区空白处收起，未点击不自行关闭，Escape 不退化', async () => {
  const server = createServer(new URL('../../dist', import.meta.url).pathname);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  // 在内容区找一个真正的空白点：不落在浮层内，也不是可交互元素
  const blankPoint = (excludeSelector) => page.evaluate((selector) => {
    const popup = selector ? document.querySelector(selector) : null;
    const points = [];
    for (let y = 150; y < innerHeight - 60; y += 40) {
      for (let x = 300; x < innerWidth - 40; x += 50) {
        const node = document.elementFromPoint(x, y);
        if (!node || node.closest('.topbar')) continue;
        if (popup && (node === popup || popup.contains(node))) continue;
        if (node.closest('a,button,input,textarea,select,[role="menuitem"],[contenteditable="true"]')) continue;
        points.push({ x, y });
      }
    }
    return points[Math.floor(points.length / 2)] || null;
  }, excludeSelector);

  // 消息流内容区空白：右侧浮出面板必须点击消息内容区才收起（输入区除外）
  const streamPoint = () => page.evaluate(() => {
    const stream = document.querySelector('.ch-main__stream');
    const rect = stream.getBoundingClientRect();
    const points = [];
    for (let y = Math.round(rect.top + 60); y < rect.bottom - 120; y += 30) {
      for (let x = Math.round(rect.left + 40); x < rect.right - 40; x += 60) {
        const node = document.elementFromPoint(x, y);
        if (!node || !stream.contains(node)) continue;
        if (node.closest('.wk-messageinput-box, a, button, [role="menuitem"], [contenteditable="true"]')) continue;
        points.push({ x, y });
      }
    }
    return points[Math.floor(points.length / 2)] || null;
  });

  const closesOnBlank = async (label, { open, visible, blank }) => {
    await open();
    await page.waitForTimeout(420);
    assert.ok(await page.locator(visible).count(), `${label}：未按预期打开`);
    const point = blank ? await blank() : await blankPoint(visible);
    assert.ok(point, `${label}：找不到可点击的内容区空白点`);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(560);
    assert.equal(await page.locator(visible).count(), 0, `${label}：点击空白处后仍未收起`);
  };

  const staysOpen = async (label, { open, visible }) => {
    await open();
    await page.waitForTimeout(900);
    assert.ok(await page.locator(visible).count(), `${label}：未点击时被自动关闭`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  };

  try {
    // ---- 消息：右侧面板、菜单、选择器 ----
    await page.goto(`${origin}/#/messages`);
    await page.locator('.eva-follow-channel > .wk-conv-compact-item').first().waitFor();

    await staysOpen('消息·会话右键菜单', {
      open: () => page.locator('.eva-follow-channel > .wk-conv-compact-item').first().click({ button: 'right' }),
      visible: '.eva-context-menu'
    });
    await closesOnBlank('消息·会话右键菜单', {
      open: () => page.locator('.eva-follow-channel > .wk-conv-compact-item').first().click({ button: 'right' }),
      visible: '.eva-context-menu'
    });
    await page.locator('.eva-follow-channel > .wk-conv-compact-item').first().click({ button: 'right' });
    await page.locator('.eva-context-menu').waitFor();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.eva-context-menu').count(), 0, '消息·会话右键菜单：Escape 关闭能力退化');

    await staysOpen('消息·新建下拉', {
      open: () => page.locator('.eva-message-invite').first().click(),
      visible: '.semi-dropdown-wrapper-show'
    });
    await closesOnBlank('消息·新建下拉', {
      open: () => page.locator('.eva-message-invite').first().click(),
      visible: '.semi-dropdown-wrapper-show'
    });
    await closesOnBlank('消息·表情面板', {
      open: () => page.getByRole('button', { name: '表情' }).first().click(),
      visible: '.eva-im-emoji-picker'
    });
    await closesOnBlank('消息·提及候选', {
      open: async () => { await page.locator('[contenteditable="true"]').first().click(); await page.keyboard.type('@'); },
      visible: '.eva-im-mention-picker'
    });
    await closesOnBlank('消息·查找聊天内容面板', {
      open: () => page.getByRole('button', { name: '查找聊天内容' }).first().click(),
      visible: '#eva-conversation-search-panel',
      blank: streamPoint
    });
    await closesOnBlank('消息·聊天信息面板', {
      open: () => page.getByRole('button', { name: '聊天信息', exact: true }).first().click(),
      visible: '.ch-right-panel--overlay',
      blank: streamPoint
    });
    await closesOnBlank('消息·账户菜单', {
      open: () => page.locator('.eva-sider-account').first().click(),
      visible: '.eva-account-menu'
    });

    // ---- 遮罩弹窗：设置对话框 ----
    await page.locator('.eva-sider-account').first().click();
    await page.locator('.eva-account-menu__item').first().click();
    await page.locator('.eva-settings-dialog').waitFor({ timeout: 10000 });
    await page.mouse.click(600, 790);
    await page.waitForTimeout(650);
    assert.equal(await page.locator('.eva-settings-dialog').count(), 0, '消息·设置对话框：点击遮罩后未收起');

    // ---- 群聊：转让群主弹窗（遮罩） ----
    await page.locator('.wk-conv-compact-item').filter({ hasText: '采购与招投标' }).first().click();
    const chatInfo = page.getByRole('button', { name: '聊天信息', exact: true });
    await chatInfo.waitFor({ timeout: 10000 });
    await chatInfo.click();
    const settings = page.locator('.eva-chat-settings');
    await settings.getByRole('button', { name: '退出群聊', exact: true }).waitFor({ timeout: 10000 });
    await settings.getByRole('button', { name: '退出群聊', exact: true }).click();
    const leaveConfirm = page.locator('.semi-modal').filter({ has: page.getByRole('heading', { name: '退出群聊', exact: true }) });
    await leaveConfirm.waitFor({ timeout: 10000 });
    await leaveConfirm.getByRole('button', { name: '转让群主', exact: true }).click();
    const transferDialog = page.locator('.semi-modal:visible').filter({ has: page.getByRole('heading', { name: '转让群主', exact: true }) });
    await transferDialog.waitFor({ timeout: 8000 });
    await page.mouse.click(600, 792);
    await page.waitForTimeout(650);
    assert.equal(await transferDialog.count(), 0, '群聊·转让群主弹窗：点击遮罩后未收起');

    // ---- 个人 Eva：技能选择器与文件夹菜单 ----
    await page.goto(`${origin}/#/guid`);
    await page.locator('.eva-composer-prompt').first().waitFor();
    await staysOpen('个人 Eva·技能选择器', {
      open: async () => { await page.locator('.eva-composer-prompt').first().click(); await page.keyboard.type('@'); },
      visible: '.eva-picker'
    });
    await closesOnBlank('个人 Eva·技能选择器', {
      open: async () => { await page.locator('.eva-composer-prompt').first().click(); await page.keyboard.type('@'); },
      visible: '.eva-picker'
    });
    await closesOnBlank('个人 Eva·文件夹菜单', {
      open: async () => {
        const row = page.locator('.eva-personal-folder__row').first();
        await row.hover();
        await page.waitForTimeout(200);
        await row.locator('[data-eva-folder-menu]').click();
      },
      visible: '.eva-personal-folder-menu'
    });

    // ---- 云盘：行操作菜单 ----
    await page.goto(`${origin}/#/drive`);
    await page.locator('.eva-drive__row-more').first().waitFor();
    await closesOnBlank('云盘·行操作菜单', {
      open: async () => {
        await page.locator('.eva-drive__row').first().hover();
        await page.waitForTimeout(200);
        await page.locator('.eva-drive__row-more').first().click();
      },
      visible: '.eva-drive__row-menu',
      blank: () => page.evaluate(() => {
        const rect = document.querySelector('.eva-drive__table').getBoundingClientRect();
        return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.bottom - 12) };
      })
    });

    // ---- 项目设置：成员选择器弹窗（遮罩） ----
    await page.goto(`${origin}/?picker-preview=create#/collab?evaProject=prod&evaTab=settings`);
    await page.getByRole('dialog').filter({ hasText: '新建群聊' }).waitFor({ timeout: 15000 });
    assert.ok(await page.locator('.eva-member-picker').count(), '项目·成员选择器弹窗：未按预期打开');
    await page.mouse.click(600, 790);
    await page.waitForTimeout(650);
    assert.equal(await page.locator('.eva-member-picker').count(), 0, '项目·成员选择器弹窗：点击遮罩后未收起');

    assert.ok(await page.locator('.topbar, .app-titlebar').first().isVisible(), '系统标题栏被遮挡或隐藏');
    assert.deepEqual(errors, [], '浮层交互过程中出现运行错误');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});