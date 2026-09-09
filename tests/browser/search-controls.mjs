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
for (const [name, route, selector] of [
  ['项目', '/collab', '.eva-project-directory-search'],
  ['通讯录', '/contacts', '.eva-contacts__search'],
  ['消息', '/messages', '.ch-list-search'],
  ['文件库', '/drive', '.eva-drive__section-head .eva-drive__side-search'],
  ['连接中心', '/eva-stub/技能', '.eva-connection-search'],
  ['数字员工', '/eva-stub/数字员工', '.semi-input-wrapper:has(input[placeholder="搜索数字员工"])'],
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
