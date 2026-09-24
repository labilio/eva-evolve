import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';

let server, browser, page, origin;
before(async () => {
  server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  // These are local UI tests: never contact the shared review service or external accounts.
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());
  page = await context.newPage();
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
async function open(route, selector) {
  await page.goto(`${origin}/#${route}`);
  const field = page.locator(selector).first();
  await field.waitFor({ state: 'visible' });
  return field;
}
async function appearance(field) {
  return field.evaluate(el => {
    const input = el.querySelector('input'), icon = el.querySelector('svg');
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    const ir = icon.getBoundingClientRect(), tr = input.getBoundingClientRect();
    return { height: r.height, width: r.width, radius: s.borderRadius,
      padding: s.paddingLeft, border: s.borderTopWidth, color: s.borderTopColor,
      shadow: s.boxShadow, outline: s.outlineStyle, background: s.backgroundColor,
      iconWidth: ir.width, iconInset: ir.x - r.x, gap: tr.x - ir.right,
      fill: getComputedStyle(icon).fill, inputBorder: getComputedStyle(input).borderTopWidth };
  });
}
async function actionAppearance(toolbar) {
  return toolbar.locator('.eva-drive__action').evaluateAll(actions => actions.map(action => {
    const style = getComputedStyle(action), rect = action.getBoundingClientRect();
    const icon = action.querySelector('svg'), iconRect = icon?.getBoundingClientRect();
    return {
      label: action.textContent.trim(),
      height: rect.height,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      radius: style.borderRadius,
      fontSize: style.fontSize,
      gap: style.gap,
      borderWidth: style.borderTopWidth,
      iconCount: action.querySelectorAll('svg').length,
      iconWidth: iconRect?.width || 0,
      iconHeight: iconRect?.height || 0,
    };
  }));
}
for (const [name, route, selector, prepare] of [
  ['项目', '/collab', '.eva-project-directory-search'],
  ['通讯录', '/contacts', '.eva-contacts__search'],
  ['文件库', '/drive', '.eva-drive__toolbar .eva-drive__side-search'],
  ['连接中心', '/eva-stub/技能', '.eva-connection-search'],
  ['数字员工市场', '/eva-stub/数字员工', '.eva-digital-center__search'],
]) {
  test(`${name}搜索：单层边框、图标留白、悬停和聚焦不改变几何`, async () => {
    const field = await open(route, selector);
    const input = field.locator('input');
    await input.blur();
    const idle = await appearance(field);
    assert.equal(idle.height, 32);
    assert.equal(idle.radius, '8px');
    assert.equal(idle.padding, '12px');
    assert.equal(idle.border, '1px');
    assert.equal(idle.inputBorder, '0px', '不能出现第二层输入框边框');
    assert.equal(idle.color, 'rgb(219, 219, 219)');
    assert.equal(idle.background, 'rgb(255, 255, 255)');
    assert.equal(idle.iconWidth, 16);
    assert.equal(idle.iconInset, 13, '1px边框 + 12px留白，不能图标贴边');
    assert.equal(idle.gap, 8);
    assert.equal(idle.fill, 'none', '图标不能回归为实心圆点');
    await field.hover();
    const hover = await appearance(field);
    assert.equal(hover.height, idle.height);
    assert.equal(hover.width, idle.width);
    await input.focus();
    const focused = await appearance(field);
    assert.equal(focused.color, 'rgb(21, 99, 235)');
    assert.equal(focused.height, idle.height);
    assert.equal(focused.width, idle.width);
    assert.equal(focused.border, idle.border);
    assert.equal(focused.shadow, 'none');
    assert.equal(focused.outline, 'none', '只显示一层蓝色边框');
    await input.blur();
    assert.notEqual((await appearance(field)).color, focused.color);
  });
}
test('表格视图搜索：任务页第四视图的新增入口沿用公共搜索外观', async () => {
  await page.goto(`${origin}/#/collab?evaProject=prod`);
  await page.locator('.collab-frame').waitFor();
  await page.getByRole('tab', { name: '任务', exact: true }).click();
  await page.locator('.loop-board').waitFor();
  await page.locator('.eva-task-view-switcher button', { hasText: '表格' }).click();
  const field = page.locator('.eva-task-table__search');
  await field.waitFor({ state: 'visible' });
  const input = field.locator('input');
  await input.blur();
  const idle = await appearance(field);
  assert.equal(idle.height, 32);
  assert.equal(idle.radius, '8px');
  assert.equal(idle.padding, '12px');
  assert.equal(idle.border, '1px');
  assert.equal(idle.inputBorder, '0px', '不能出现第二层输入框边框');
  assert.equal(idle.color, 'rgb(219, 219, 219)');
  assert.equal(idle.background, 'rgb(255, 255, 255)');
  assert.equal(idle.iconWidth, 16);
  assert.equal(idle.iconInset, 13, '1px边框 + 12px留白，不能图标贴边');
  assert.equal(idle.gap, 8);
  assert.equal(idle.fill, 'none', '图标不能回归为实心圆点');
  await field.hover();
  const hover = await appearance(field);
  assert.equal(hover.height, idle.height);
  assert.equal(hover.width, idle.width);
  await input.focus();
  const focused = await appearance(field);
  assert.equal(focused.color, 'rgb(21, 99, 235)');
  assert.equal(focused.height, idle.height);
  assert.equal(focused.width, idle.width);
  assert.equal(focused.border, idle.border);
  assert.equal(focused.shadow, 'none');
  assert.equal(focused.outline, 'none', '只显示一层蓝色边框');
  await input.blur();
  // 保留搜索行为：输入过滤行，公共清空按钮恢复
  await input.fill('zzz-不存在-zzz');
  await page.locator('.eva-task-table__empty', { hasText: '当前视图没有匹配的任务。' }).waitFor();
  await field.locator('.eva-task-table__search-clear').click();
  await page.locator('.eva-task-table__row').first().waitFor();
  assert.equal(await input.inputValue(), '', '清空后查询应恢复为空');
});

test('转发面板搜索：沿用公共搜索外观，悬停和聚焦不改变几何', async () => {
  await page.goto(`${origin}/#/messages`);
  await page.locator('.eva-follow-channel > .wk-conv-compact-item').first().waitFor();
  await page.getByRole('button', { name: '01 日常聊天与连续消息', exact: true }).click();
  await page.locator('.eva-im-bubble-row').first().click({ button: 'right' });
  await page.locator('.wk-contextmenus-open').getByText('转发', { exact: true }).click();
  const field = page.locator('.eva-forward-search');
  await field.waitFor({ state: 'visible' });
  const input = field.locator('input');
  await input.blur();
  const idle = await appearance(field);
  assert.equal(idle.height, 32);
  assert.equal(idle.radius, '8px');
  assert.equal(idle.padding, '12px');
  assert.equal(idle.border, '1px');
  assert.equal(idle.inputBorder, '0px', '不能出现第二层输入框边框');
  assert.equal(idle.color, 'rgb(219, 219, 219)');
  assert.equal(idle.background, 'rgb(255, 255, 255)');
  assert.equal(idle.iconWidth, 16);
  assert.equal(idle.iconInset, 13, '1px边框 + 12px留白，不能图标贴边');
  assert.equal(idle.gap, 8);
  assert.equal(idle.fill, 'none', '图标不能回归为实心圆点');
  assert.equal(await input.getAttribute('placeholder'), '搜索联系人、Agent、群聊及其子区');
  // 搜索框右侧常显「新建群聊」：写出入口名称，但作为低频三级按钮与搜索框同行等高、不争主位
  const createGroup = page.locator('.eva-fp-create-group');
  assert.equal(await createGroup.count(), 1, '转发面板搜索框右侧未显示新建群聊入口');
  assert.equal((await createGroup.innerText()).trim(), '新建群聊', '新建群聊入口必须写出文字，不能只给一个加号');
  const createGroupGeometry = await page.evaluate(() => {
    const field = document.querySelector('.eva-forward-search').getBoundingClientRect();
    const node = document.querySelector('.eva-fp-create-group');
    const button = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return { gap: button.left - field.right, height: button.height, top: Math.abs(button.top + button.height / 2 - (field.top + field.height / 2)), background: style.backgroundColor, border: style.borderTopWidth, width: button.width, fieldWidth: field.width };
  });
  assert.ok(createGroupGeometry.gap >= 6 && createGroupGeometry.gap <= 10, '新建群聊按钮与搜索框间距应为 8px');
  assert.equal(Math.round(createGroupGeometry.height), 32, '新建群聊按钮应与搜索框等高');
  assert.ok(createGroupGeometry.top <= 1, '新建群聊按钮应与搜索框垂直居中');
  assert.equal(createGroupGeometry.background, 'rgba(0, 0, 0, 0)', '低频入口不得填充底色而与搜索框争主位');
  assert.equal(createGroupGeometry.border, '0px', '低频入口不得再叠一层边框');
  assert.ok(createGroupGeometry.width < createGroupGeometry.fieldWidth / 2, '低频入口不应挤压搜索框的可用宽度');
  await field.hover();
  const hover = await appearance(field);
  assert.equal(hover.height, idle.height);
  assert.equal(hover.width, idle.width);
  await input.focus();
  const focused = await appearance(field);
  assert.equal(focused.color, 'rgb(21, 99, 235)');
  assert.equal(focused.height, idle.height);
  assert.equal(focused.width, idle.width);
  assert.equal(focused.border, idle.border);
  assert.equal(focused.shadow, 'none');
  assert.equal(focused.outline, 'none', '只显示一层蓝色边框');
  await input.blur();
  assert.notEqual((await appearance(field)).color, focused.color);
  await page.keyboard.press('Escape');
  await page.locator('.eva-fp-modal').waitFor({ state: 'detached' });
});
test('文件库工具栏与项目文件按钮一致，项目回收站位于搜索框左侧', async () => {
  const search = await open('/drive', '.eva-drive__toolbar .eva-drive__side-search');
  const driveToolbar = page.locator('.eva-drive__toolbar');
  const driveActions = await actionAppearance(driveToolbar);
  assert.deepEqual(driveActions.map(action => action.label), ['新建文件夹', '添加外部资源', '上传本地文件']);
  assert.deepEqual(driveActions.map(action => action.iconCount), [0, 1, 0], '三个操作按钮不得显示前置图标，仅外部资源保留末尾下拉箭头');
  assert.equal(driveActions[1].iconWidth, 12, '外部资源下拉箭头保持既定 12px');
  assert.equal(driveActions[1].iconHeight, 12, '外部资源下拉箭头保持既定 12px');
  assert.equal(await page.locator('.eva-drive__section-head').count(), 0, '文件列表上方不应重复显示“个人文件”标题');
  const driveGeometry = await page.evaluate(() => {
    const toolbar = document.querySelector('.eva-drive__toolbar');
    const searchField = toolbar.querySelector('.eva-drive__side-search');
    const firstAction = toolbar.querySelector('.eva-drive__action');
    const table = document.querySelector('.eva-drive__table');
    const t = toolbar.getBoundingClientRect(), s = searchField.getBoundingClientRect();
    const a = firstAction.getBoundingClientRect(), l = table.getBoundingClientRect();
    return { toolbarCenter: t.y + t.height / 2, searchCenter: s.y + s.height / 2,
      actionCenter: a.y + a.height / 2, searchRight: s.right, tableRight: l.right };
  });
  assert.ok(Math.abs(driveGeometry.searchCenter - driveGeometry.actionCenter) <= 1, '按钮与搜索框应垂直居中在同一行');
  assert.ok(Math.abs(driveGeometry.searchRight - driveGeometry.tableRight) <= 1, '搜索框应与表格右边缘对齐');
  assert.equal(await search.locator('input').getAttribute('placeholder'), '搜索当前位置');

  await page.goto(`${origin}/#/collab?evaProject=prod`);
  await page.locator('.collab-frame').waitFor();
  await page.getByRole('tab', { name: '文件', exact: true }).click();
  const projectToolbar = page.locator('.eva-project-files__toolbar');
  await projectToolbar.waitFor();
  const projectActions = await actionAppearance(projectToolbar);
  assert.deepEqual(projectActions, driveActions, '两处同名操作应使用相同的高度、内距、圆角、字号、间距、边框和图标规则');
  assert.equal(await page.locator('.eva-project-files__header').count(), 0, '项目文件列表上方不应重复显示团队文件 head');
  assert.equal(await page.locator('.eva-file-role-badge').count(), 0, '删除 head 后不应残留孤立的角色徽标');
  const trashButton = projectToolbar.getByRole('button', { name: '回收站', exact: true });
  await trashButton.waitFor();
  const trashAppearance = await trashButton.evaluate(button => {
    const buttonRect = button.getBoundingClientRect();
    const iconRect = button.querySelector('.eva-drive-icon').getBoundingClientRect();
    const style = getComputedStyle(button);
    return {
      width: buttonRect.width,
      height: buttonRect.height,
      iconWidth: iconRect.width,
      iconHeight: iconRect.height,
      radius: style.borderRadius,
      text: button.textContent.trim(),
    };
  });
  assert.deepEqual(trashAppearance, { width: 32, height: 32, iconWidth: 16, iconHeight: 16, radius: '8px', text: '' }, '回收站使用 GDS 32px 图标按钮与 16px Lucide 图标');
  await trashButton.hover();
  assert.notEqual(await trashButton.evaluate(button => getComputedStyle(button).backgroundColor), 'rgba(0, 0, 0, 0)', '回收站悬停应显示公共低强调背景');
  await projectToolbar.getByRole('button', { name: '上传本地文件', exact: true }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await trashButton.evaluate(button => button === document.activeElement), true, 'Tab 应从上传操作进入回收站图标按钮');
  const trashFocus = await trashButton.evaluate(button => {
    const style = getComputedStyle(button);
    return { outlineWidth: style.outlineWidth, outlineColor: style.outlineColor, outlineOffset: style.outlineOffset };
  });
  assert.equal(trashFocus.outlineWidth, '2px');
  assert.equal(trashFocus.outlineColor, 'rgb(21, 99, 235)');
  assert.equal(trashFocus.outlineOffset, '2px');
  const projectGeometry = await projectToolbar.evaluate(toolbar => {
    const trash = toolbar.querySelector('.eva-project-files__trash-toggle').getBoundingClientRect();
    const searchField = toolbar.querySelector('.eva-drive__side-search').getBoundingClientRect();
    const table = document.querySelector('.eva-project-files__table').getBoundingClientRect();
    return { trashRight: trash.right, searchLeft: searchField.left, searchRight: searchField.right, tableRight: table.right };
  });
  assert.ok(projectGeometry.trashRight <= projectGeometry.searchLeft, '回收站应位于搜索框左侧');
  assert.ok(Math.abs(projectGeometry.searchRight - projectGeometry.tableRight) <= 1, '项目搜索框仍应与表格右边缘对齐');
  await trashButton.click();
  const backButton = projectToolbar.getByRole('button', { name: '返回团队文件', exact: true });
  await backButton.waitFor();
  await page.locator('.eva-project-files__table[aria-label="项目回收站"], .eva-project-files__empty').waitFor();
  assert.equal(await projectToolbar.locator('.eva-drive__action').count(), 0, '回收站态不显示创建和上传操作');
  await backButton.click();
  await page.locator('.eva-project-files__table[aria-label="团队文件列表"]').waitFor();
});
test('文件预览打开时两处搜索框缩短，关闭后恢复常规宽度', async () => {
  const searchGeometry = selector => page.locator(selector).evaluate(element => {
    const search = element.getBoundingClientRect();
    const toolbar = element.closest('.eva-drive__toolbar, .eva-project-files__toolbar');
    const toolbarRect = toolbar.getBoundingClientRect();
    const toolbarStyle = getComputedStyle(toolbar);
    return { width: search.width, right: search.right, toolbarContentRight: toolbarRect.right - parseFloat(toolbarStyle.paddingRight || '0') };
  });

  let search = await open('/drive', '.eva-drive__toolbar .eva-drive__side-search');
  const driveNormal = await searchGeometry('.eva-drive__toolbar .eva-drive__side-search');
  await page.locator('[data-drive-action="preview"]').first().click();
  await page.locator('.eva-drive-preview-sidebar').waitFor();
  const driveCompact = await searchGeometry('.eva-drive__toolbar .eva-drive__side-search');
  assert.ok(driveCompact.width <= 240 && driveCompact.width < driveNormal.width, '文件库预览态搜索框应缩短到 240px 以内');
  assert.ok(Math.abs(driveCompact.right - driveCompact.toolbarContentRight) <= 1, '文件库预览态搜索框仍应右对齐');
  await page.keyboard.press('Escape');
  await page.locator('.eva-drive-preview-sidebar').waitFor({ state: 'detached' });
  assert.equal(Math.round((await searchGeometry('.eva-drive__toolbar .eva-drive__side-search')).width), Math.round(driveNormal.width));

  await page.goto(`${origin}/#/collab?evaProject=prod`);
  await page.locator('.collab-frame').waitFor();
  await page.getByRole('tab', { name: '文件', exact: true }).click();
  search = page.locator('.eva-project-files__toolbar .eva-drive__side-search');
  await search.waitFor();
  const projectNormal = await searchGeometry('.eva-project-files__toolbar .eva-drive__side-search');
  const names = page.locator('.eva-project-files__table .eva-drive__name-cell');
  const labels = await names.allTextContents();
  const fileIndex = labels.findIndex(label => /\.(?:pdf|md|docx?|xlsx?|pptx?|zip)\b/i.test(label));
  assert.ok(fileIndex >= 0, '项目文件列表应有可预览样本');
  await names.nth(fileIndex).click();
  await page.locator('.eva-project-file-preview-sidebar').waitFor();
  const projectCompact = await searchGeometry('.eva-project-files__toolbar .eva-drive__side-search');
  assert.ok(projectCompact.width <= 240 && projectCompact.width < projectNormal.width, '项目文件预览态搜索框应缩短到 240px 以内');
  assert.ok(Math.abs(projectCompact.right - projectCompact.toolbarContentRight) <= 1, '项目文件预览态搜索框仍应右对齐');
  await page.locator('.eva-project-files__toolbar').click({ position: { x: 4, y: 4 } });
  await page.locator('.eva-project-file-preview-sidebar').waitFor({ state: 'detached' });
  assert.equal(Math.round((await searchGeometry('.eva-project-files__toolbar .eva-drive__side-search')).width), Math.round(projectNormal.width));
});
test('项目与文件库的外部资源弹窗统一为名称在前、链接在后', async () => {
  for (const surface of ['drive', 'project']) {
    for (const kind of ['外部链接', '外部文件夹']) {
      if (surface === 'drive') {
        await open('/drive', '.eva-drive__toolbar');
      } else {
        await page.goto(`${origin}/#/collab?evaProject=prod`);
        await page.locator('.collab-frame').waitFor();
        await page.getByRole('tab', { name: '文件', exact: true }).click();
        await page.locator('.eva-project-files__toolbar').waitFor();
      }
      const toolbar = page.locator(surface === 'drive' ? '.eva-drive__toolbar' : '.eva-project-files__toolbar');
      await toolbar.locator('.eva-drive__external-add > summary').click();
      await toolbar.locator('.eva-drive__external-add-menu button').filter({ hasText: kind }).click();
      const dialog = page.getByRole('dialog', { name: `添加${kind}` });
      await dialog.waitFor();
      const fields = dialog.locator('.eva-drive-dialog__body > .eva-drive-dialog__field');
      assert.deepEqual(await fields.locator(':scope > span').allTextContents(), kind === '外部文件夹'
        ? ['文件夹名称', '文件夹链接']
        : ['文件名称', '文件链接']);
      assert.equal(await fields.count(), 2, '弹窗正文只保留名称和链接两个字段');
      assert.equal(await fields.first().locator('input').evaluate(element => element === document.activeElement), true, '首次焦点应位于名称输入框');
      assert.equal(await dialog.locator('.eva-external-link-detection').count(), 0, '不得显示来源识别卡片');
      assert.equal(await dialog.locator('.eva-drive-dialog__hint').count(), 0, '不得显示额外提示');
      assert.doesNotMatch(await dialog.innerText(), /等待识别|粘贴链接后识别来源平台|仅保存访问入口/);
      await dialog.getByRole('button', { name: '取消', exact: true }).click();
      await dialog.waitFor({ state: 'detached' });
    }
  }
});
test('项目搜索：中文筛选、空结果和清空恢复原列表', async () => {
  const field = await open('/collab', '.eva-project-directory-search');
  const rows = page.locator('.eva-project-list-item');
  const count = await rows.count();
  assert.ok(count > 1);
  await field.locator('input').fill('供应链');
  await page.waitForFunction(() => document.querySelectorAll('.eva-project-list-item').length === 1);
  assert.match(await rows.innerText(), /供应链运营协同/);
  await field.locator('input').fill('不存在的项目_xyz');
  await page.locator('.eva-project-list-empty').waitFor();
  assert.equal(await rows.count(), 0);
  await field.locator('.semi-input-clearbtn').click();
  assert.equal(await field.locator('input').inputValue(), '');
  assert.equal(await rows.count(), count);
});
test('通讯录搜索：Escape 清空，路由往返不串入项目查询', async () => {
  let field = await open('/contacts', '.eva-contacts__search');
  const count = await page.locator('.eva-contacts__person').count();
  await field.locator('input').fill('王');
  assert.ok(await page.locator('.eva-contacts__person').count() < count);
  await field.locator('input').press('Escape');
  assert.equal(await field.locator('input').inputValue(), '');
  assert.equal(await page.locator('.eva-contacts__person').count(), count);
  field = await open('/collab', '.eva-project-directory-search');
  await field.locator('input').fill('供应链');
  field = await open('/contacts', '.eva-contacts__search');
  assert.equal(await field.locator('input').inputValue(), '');
});
test('搜索框键盘焦点遵循相同蓝色边框合同', async () => {
  const field = await open('/collab', '.eva-project-directory-search');
  await field.locator('input').fill('');
  await field.locator('input').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await field.locator('input').evaluate(el => el === document.activeElement), true);
  assert.equal((await appearance(field)).color, 'rgb(21, 99, 235)');
});
test('中文输入法组合与提交保持同一搜索输入节点', async () => {
  const field = await open('/contacts', '.eva-contacts__search');
  const input = field.locator('input');
  await input.focus();
  const node = await input.elementHandle();
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.imeSetComposition', { text: '王', selectionStart: 1, selectionEnd: 1 });
    assert.equal(await input.inputValue(), '王');
    assert.equal(await node.evaluate(el => el.isConnected && el === document.activeElement), true);
    await cdp.send('Input.insertText', { text: '王' });
    assert.equal(await input.inputValue(), '王');
    assert.equal(await node.evaluate(el => el.isConnected && el === document.activeElement), true);
    assert.equal(await page.locator('.eva-contacts__person').count(), 1);
  } finally {
    await cdp.detach();
  }
});
test('图标按钮样式夹具：保留按钮形态、悬停、键盘焦点和禁用行为', async () => {
  // The current personal search trigger is unavailable/hidden. Exercise the shared
  // appearance with real Lucide markup without adding a product search feature.
  await open('/collab', '.eva-project-directory-search');
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'search-button-fixture';
    host.style.cssText = 'position:fixed;left:200px;top:50px;z-index:10000;background:white';
    host.innerHTML = `<button aria-label="搜索样式测试">${window.__evaLucide('search', {size:16})}</button><button disabled aria-label="禁用搜索样式测试">${window.__evaLucide('search', {size:16})}</button>`;
    document.body.append(host);
  });
  const button = page.getByRole('button', {name:'搜索样式测试',exact:true});
  try {
    assert.equal(await button.locator('input').count(), 0);
    await button.hover();
    assert.equal(await button.evaluate(el=>getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0.06)');
    await button.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    const focus = await button.evaluate(el=>({color:getComputedStyle(el).outlineColor,width:getComputedStyle(el).outlineWidth}));
    assert.equal(focus.color,'rgb(21, 99, 235)');
    assert.equal(focus.width,'2px');
    const disabled = page.getByRole('button',{name:'禁用搜索样式测试',exact:true});
    assert.equal(await disabled.isDisabled(),true);
    await disabled.hover();
    assert.equal(await disabled.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  } finally {
    await page.locator('#search-button-fixture').evaluate(el=>el.remove());
  }
});

test('数字员工市场：统一搜索二合一结果与「更多」限高面板', async () => {
  await open('/eva-stub/数字员工', '.eva-digital-center__filter-card');
  const chips = page.locator('.eva-digital-center__domain-filters .semi-button');
  const rows = page.locator('.semi-table-tbody tr');
  assert.equal(await page.getByRole('button', { name: '搜索业务域' }).count(), 0, '旧的图标业务域搜索入口已移除');
  assert.equal(await page.locator('.eva-digital-center__domain-search, .eva-digital-center__market-search').count(), 0, '旧搜索类名不得复用');
  assert.equal(await page.getByPlaceholder('搜索数字员工').count(), 0, '不重复保留独立的员工搜索框');
  // 统一搜索复用任务身份选择面板那套 Semi Dropdown 菜单：外层统一搜索框（Semi Input）直接输入，
  // 菜单只出结果（分组标题/分隔线/行项/「展开其余」沿用 .eva-task-assignee-*）；
  // 弹层父容器复用页面 popup(host) 配置，点到组件外即收起并清空。
  const searchRoot = page.locator('.eva-digital-center__search');
  const search = searchRoot.locator('input');
  const menu = page.locator('.eva-digital-center__search-menu');
  const typeSearch = async text => {
    await searchRoot.click();
    await menu.waitFor();
    await search.fill(text);
    await menu.locator('.semi-dropdown-item').first().waitFor();
  };
  await search.waitFor();
  assert.equal(await search.getAttribute('placeholder'), '搜索业务域或数字员工');
  assert.equal(await searchRoot.locator('.semi-input-prefix .lucide-search').count(), 1, '触发区使用公共 Lucide Search');
  const inlineCount = await chips.count();
  assert.ok(inlineCount >= 3 && (await rows.count()) > 2);
  // 点开即展示全部分组候选（业务域／数字员工）；菜单内不再出现第二个搜索框
  await searchRoot.click();
  await menu.waitFor();
  assert.equal(await menu.locator('.eva-task-assignee-search, input').count(), 0, '菜单内不再出现第二个搜索框');
  assert.deepEqual(await menu.locator('.semi-dropdown-title').allTextContents(), ['业务域', '数字员工'], '两类结果各自带分组标题');
  assert.equal(await menu.locator('.semi-dropdown-divider').count(), 1, '两个分组之间一条分隔线');
  assert.deepEqual(await menu.locator('.eva-task-assignee-expand').allTextContents(), ['展开其余 13 个', '展开其余 340 个'], '每组默认 5 条、其余折叠');
  await menu.locator('.eva-task-assignee-expand').first().click();
  assert.ok((await menu.locator('.semi-dropdown-item').count()) > 10, '「展开其余」补全该组且不收起弹层');
  // 在外层搜索框直接输入即筛选；业务域结果点击应用筛选、低频域回显筛选行并清空
  await search.fill('供应链');
  await page.waitForTimeout(150);
  await menu.locator('.semi-dropdown-item:has(.eva-digital-center__search-domain)', { hasText: '供应链' }).first().click();
  await menu.waitFor({ state: 'hidden' });
  assert.equal(await search.inputValue(), '', '选中结果后清空查询');
  assert.match(await page.locator('.eva-digital-center__domain-filters .semi-button[aria-pressed="true"]').innerText(), /^供应链 /, '低频选中域回显到筛选行');
  const filtered = await page.locator('.semi-table-tbody tr td:nth-child(3)').allTextContents();
  assert.ok(filtered.length > 0 && filtered.every(d => d === '供应链'), '搜索结果应用业务域筛选');
  await page.getByRole('button', { name: /^全部业务域 / }).click();
  // 数字员工结果：公共头像与 AI 标，点击打开详情；单一结果类型不放分组标签
  await typeSearch('AI Coding');
  assert.equal(await menu.locator('.semi-dropdown-title').count(), 0, '只有单一结果类型时不放分组标签');
  const singleBlank = await menu.evaluate(el => {
    const scroll = el.querySelector('.eva-task-assignee-scroll').getBoundingClientRect();
    const item = el.querySelector('.semi-dropdown-item').getBoundingClientRect();
    return scroll.height - item.height;
  });
  assert.ok(singleBlank <= 16, '单个结果不残留任务面板的最小高度留白');
  const hit = menu.locator('.semi-dropdown-item').filter({ has: page.locator('.eva-digital-center__search-who') }).first();
  assert.ok(await hit.locator('.eva-identity-avatar').count() === 1, '员工结果必须使用公共身份头像');
  assert.ok(await hit.locator('.ai-badge').count() === 1, '员工结果必须显示公共 AI 标');
  await hit.click();
  const dialog = page.locator('.semi-modal-content[aria-modal="true"]');
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /AI Coding专家/);
  await page.locator('.semi-modal-close').first().click();
  await dialog.waitFor({ state: 'hidden' });
  await menu.waitFor({ state: 'hidden' });
  // 无匹配 + Escape 清空收起
  await searchRoot.click();
  await menu.waitFor();
  await search.fill('不存在的名字xyz');
  await menu.locator('.eva-task-assignee-empty').waitFor();
  assert.match(await menu.locator('.eva-task-assignee-empty').innerText(), /没有匹配的业务域或数字员工/);
  await search.press('Escape');
  await menu.waitFor({ state: 'hidden' });
  assert.equal(await search.inputValue(), '', 'Escape 清空统一搜索');
  // 「更多」面板：限高网格一次铺开全部业务域，不盖住下方表格
  await page.getByRole('button', { name: /^更多 \d+$/ }).click();
  const panel = page.locator('.eva-digital-center__domain-panel');
  await panel.waitFor();
  assert.ok((await panel.locator('.eva-digital-center__domain-panel-item').count()) > inlineCount, '面板铺开全部业务域');
  const geo = await panel.evaluate(el => {
    const grid = el.querySelector('.eva-digital-center__domain-panel-grid');
    return { panelHeight: el.getBoundingClientRect().height, panelBottom: el.getBoundingClientRect().bottom,
      gridMax: getComputedStyle(grid).maxHeight, innerScroll: grid.scrollHeight > grid.clientHeight + 1 };
  });
  assert.ok(geo.panelHeight <= 300, '面板总高受限，不能盖住下方全部内容');
  assert.equal(geo.innerScroll, false, '当前业务域数量下网格一次铺开、零内部滚动');
  const tableBottom = await page.locator('.eva-digital-center__table').evaluate(el => el.getBoundingClientRect().bottom);
  assert.ok(geo.panelBottom < tableBottom, '面板下方仍露出表格');
  await panel.locator('.eva-digital-center__domain-panel-item', { hasText: '研发域' }).click();
  await panel.waitFor({ state: 'detached' });
  assert.match(await page.locator('.eva-digital-center__domain-filters .semi-button[aria-pressed="true"]').innerText(), /^研发域 /, '面板点击应用业务域筛选');
});

test('消息中栏使用标题与创建按钮，不再显示列表搜索框', async () => {
  const header = await open('/messages', '.eva-rail-header');
  assert.equal(await header.locator('h1').innerText(), '我的消息');
  assert.equal(await header.locator('input').count(), 0);
  const button = header.locator('.eva-message-invite');
  assert.equal(await button.isVisible(), true);
  assert.equal((await button.boundingBox()).width, 32);
  await button.click();
  await page.getByText('新建群聊', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
});

test('任务指派：列表、批量、详情与新建弹窗均可输入即筛选负责人', async () => {
  await page.goto(`${origin}/#/collab?evaProject=prod`);
  await page.locator('.collab-frame').waitFor();
  await page.getByRole('tab', { name: '任务', exact: true }).click();
  await page.getByText('列表', { exact: true }).click();
  await page.locator('.loop-list').waitFor();
  await page.waitForTimeout(400);

  // 2026-09-21 指派选择统一为 AssigneePicker：semi-dropdown 面板内含搜索框、
  // 「联系人」分组与限高滚动，空态为「未找到匹配的联系人或 AI」；
  // 列表内联新建行已随选人重构移除，创建入口统一为「新建任务」弹窗。
  const verifyAssigneeSearch = async trigger => {
    await trigger.click();
    const menu = page.locator('.semi-dropdown-menu:visible:has(.eva-task-assignee-search)');
    const input = menu.locator('.eva-task-assignee-search input');
    await input.waitFor();
    assert.equal(await input.inputValue(), '', '每次打开任务指派选择器应重置查询');
    await menu.getByText('联系人', { exact: true }).waitFor();
    // 列表收尾挂载可能重挂选择器并清空已填查询，过滤生效前允许重填。
    let filtered = false;
    for (let attempt = 0; attempt < 4 && !filtered; attempt += 1) {
      await input.fill('何静');
      try {
        await menu.getByText('周远', { exact: true }).waitFor({ state: 'hidden', timeout: 1500 });
        filtered = true;
      } catch {}
    }
    assert.ok(filtered, '输入时应立即过滤无关候选（列表收尾重挂会清空搜索，重试后仍未生效）');
    // 与上方同一期望；但批量栏收尾重挂可能在过滤生效后把列表重置回全量，
    // 按本断言上下两处的同档重试容忍重挂，不接受重读后仍含无关候选。
    let cleanPanel = false;
    for (let attempt = 0; attempt < 4 && !cleanPanel; attempt += 1) {
      await input.fill('何静');
      try { await menu.getByText('周远', { exact: true }).waitFor({ state: 'hidden', timeout: 1500 }); } catch {}
      cleanPanel = !(await menu.innerText()).includes('周远');
    }
    assert.ok(cleanPanel, '过滤后面板不得仍可见无关候选（面板隐藏而非卸载候选，需按可见性断言）');
    let emptyShown = false;
    for (let attempt = 0; attempt < 4 && !emptyShown; attempt += 1) {
      await input.fill('不存在的指派人');
      try {
        await menu.getByText('未找到匹配的联系人或 AI').waitFor({ timeout: 1500 });
        emptyShown = true;
      } catch {}
    }
    assert.ok(emptyShown, '检索无结果应显示空提示（批量栏等收尾重挂会清空已填查询，重试后仍未生效）');
    await page.keyboard.press('Escape');
    await menu.waitFor({ state: 'hidden' });
  };

  await verifyAssigneeSearch(page.locator('.loop-list__assignee .loop-assignee-trigger').first());

  await page.locator('.loop-list__row').first().hover();
  await page.locator('.loop-list__check').first().click();
  await page.locator('.loop-batchbar').waitFor();
  await verifyAssigneeSearch(page.locator('.loop-batchbar .loop-assignee-trigger'));
  await page.locator('.loop-batchbar').getByRole('button', { name: '取消', exact: true }).click();

  await page.locator('.loop-list__title').first().click();
  const detail = page.locator('.loop-idp').last();
  await detail.waitFor();
  await verifyAssigneeSearch(detail.locator('.loop-idp__prop:has-text("负责人") .loop-assignee-trigger'));
  await page.locator('.collab-route-right .loop-idp__closebtn').click();
  await page.locator('.collab-route-right').waitFor({ state: 'detached' });

  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  const modal = page.locator('.eva-loop-task-create');
  await modal.waitFor();
  await verifyAssigneeSearch(modal.locator('.eva-loop-task-create__assignee .loop-assignee-trigger'));
  // 辅助流程以 Escape 收尾，Semi 弹窗会连同面板一起关闭；若弹窗仍在则点「取消」收尾。
  if (await modal.isVisible()) {
    await modal.getByRole('button', { name: '取消', exact: true }).click();
  }
  await modal.waitFor({ state: 'hidden' });
});
