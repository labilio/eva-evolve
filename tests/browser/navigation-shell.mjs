import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';

let server, browser, page, origin;

before(async () => {
  server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());
  page = await context.newPage();
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function open(route, railSelector) {
  await page.goto(`${origin}/#${route}`);
  const rail = page.locator(railSelector).first();
  await rail.waitFor({ state: 'visible' });
  return rail;
}

test('共享渐变外壳覆盖 180px 一级栏和 260px 二级栏且不改图标', async () => {
  let iconMarkup;
  for (const [route, railSelector, surfaceSelector] of [
    ['/guid', '.eva-personal-sider-panel', '#eva-personal-workspace'],
    ['/messages', '.eva-msg .ch-list', '.eva-msg'],
    ['/messages?evaIM=my-ai', '.eva-ai-team__sidebar', '.eva-ai-team'],
    ['/drive', '.eva-drive__side', '.eva-drive'],
  ]) {
    await open(route, railSelector);
    const actual = await page.evaluate(({ railSelector, surfaceSelector }) => {
      const sider = document.querySelector('.layout > .layout-sider');
      const rail = document.querySelector(railSelector);
      const surface = document.querySelector(surfaceSelector);
      const siderRect = sider.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      const frame = getComputedStyle(sider, '::before');
      const gradient = getComputedStyle(sider, '::after');
      const railStyle = getComputedStyle(rail);
      return {
        sider: {
          x: siderRect.x,
          y: siderRect.y,
          width: siderRect.width,
          rightBorder: getComputedStyle(sider).borderRightWidth,
        },
        rail: {
          x: railRect.x,
          y: railRect.y,
          width: railRect.width,
          background: railStyle.backgroundColor,
          border: railStyle.borderTopColor,
          radius: railStyle.borderRadius,
        },
        surfaceBackground: getComputedStyle(surface).backgroundColor,
        frame: {
          width: Number.parseFloat(frame.width),
          border: frame.borderTopColor,
          boxSizing: frame.boxSizing,
        },
        gradient: {
          width: Number.parseFloat(gradient.width),
          image: gradient.backgroundImage,
          boxSizing: gradient.boxSizing,
        },
        icons: [...document.querySelectorAll('.layout-sider .eva-nav-entry svg, .layout-sider .eva-nav-entry img')]
          .map(icon => icon.outerHTML),
      };
    }, { railSelector, surfaceSelector });

    assert.deepEqual(actual.sider, { x: 6, y: 43, width: 180, rightBorder: '0px' }, route);
    assert.deepEqual(actual.rail, {
      x: 186,
      y: 49,
      width: 260,
      background: 'rgb(246, 247, 248)',
      border: 'rgb(223, 227, 232)',
      radius: '16px',
    }, route);
    assert.equal(actual.surfaceBackground, 'rgba(0, 0, 0, 0)', route);
    assert.deepEqual(actual.frame, { width: 446, border: 'rgb(234, 235, 236)', boxSizing: 'border-box' }, route);
    assert.equal(actual.gradient.width, 446, route);
    assert.equal(actual.gradient.boxSizing, 'border-box', route);
    assert.match(actual.gradient.image, /linear-gradient\(212\.729deg/, route);
    if (iconMarkup) assert.deepEqual(actual.icons, iconMarkup, route);
    else iconMarkup = actual.icons;
  }
});

test('手动折叠继续使用 80px 一级栏并同步收窄共享外壳', async () => {
  const rail = await open('/guid', '.eva-personal-sider-panel');
  await page.locator('.app-titlebar__button').click();
  await page.waitForFunction(() => document.querySelector('.layout-sider').getBoundingClientRect().width === 80);
  const actual = await page.evaluate(() => {
    const sider = document.querySelector('.layout > .layout-sider');
    const gradient = getComputedStyle(sider, '::after');
    return {
      siderWidth: sider.getBoundingClientRect().width,
      railWidth: document.querySelector('.eva-personal-sider-panel').getBoundingClientRect().width,
      gradientWidth: Number.parseFloat(gradient.width),
    };
  });
  assert.deepEqual(actual, { siderWidth: 80, railWidth: 260, gradientWidth: 346 });
  await page.locator('.app-titlebar__button').click();
  await page.waitForFunction(() => document.querySelector('.layout-sider').getBoundingClientRect().width === 180);
  assert.equal((await rail.boundingBox()).width, 260);
});

test('导航往返、文件夹折叠和二级栏拖拽行为保持不变', async () => {
  await open('/guid', '.eva-personal-sider-panel');

  const folder = page.locator('.eva-personal-folder__main').first();
  const initialFolderState = await folder.getAttribute('aria-expanded');
  await folder.click();
  assert.notEqual(await folder.getAttribute('aria-expanded'), initialFolderState);
  await folder.click();
  assert.equal(await folder.getAttribute('aria-expanded'), initialFolderState);

  const resizer = page.locator('.eva-personal-sider-panel > .eva-conversation-rail-resizer');
  const start = await resizer.boundingBox();
  await page.mouse.move(start.x + 2, start.y + 120);
  await page.mouse.down();
  await page.mouse.move(start.x + 22, start.y + 120, { steps: 4 });
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('.eva-personal-sider-panel').getBoundingClientRect().width === 280);
  const grown = await page.evaluate(() => ({
    rail: document.querySelector('.eva-personal-sider-panel').getBoundingClientRect().width,
    gradient: Number.parseFloat(getComputedStyle(document.querySelector('.layout-sider'), '::after').width),
  }));
  assert.equal(grown.gradient, 180 + grown.rail + 6);
  const moved = await resizer.boundingBox();
  await page.mouse.move(moved.x + 2, moved.y + 120);
  await page.mouse.down();
  await page.mouse.move(moved.x - 18, moved.y + 120, { steps: 4 });
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('.eva-personal-sider-panel').getBoundingClientRect().width === 260);

  for (const [navId, route] of [
    ['messages', '#/messages'],
    ['my-ai', '#/messages?evaIM=my-ai'],
    ['new-chat', '#/guid'],
  ]) {
    await page.locator(`[data-eva-nav-id="${navId}"]`).click();
    await page.waitForFunction(expected => location.hash === expected, route);
    assert.equal(new URL(page.url()).hash, route);
  }
});
