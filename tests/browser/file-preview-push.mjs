import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';

const geometry = (root, mainSelector, previewSelector) => root.evaluate((element, selectors) => {
  const [mainSelector, previewSelector] = selectors;
  const main = element.querySelector(mainSelector).getBoundingClientRect();
  const previewElement = element.querySelector(previewSelector);
  const preview = previewElement.getBoundingClientRect();
  const container = element.getBoundingClientRect();
  return {
    display: getComputedStyle(element).display,
    mainWidth: main.width,
    mainRight: main.right,
    previewWidth: preview.width,
    previewLeft: preview.left,
    previewRight: preview.right,
    containerRight: container.right,
    previewPosition: getComputedStyle(previewElement).position
  };
}, [mainSelector, previewSelector]);

const assertPushedRight = (result, beforeWidth) => {
  assert.notEqual(result.previewPosition, 'absolute');
  assert.notEqual(result.previewPosition, 'fixed');
  assert.ok(result.mainWidth < beforeWidth - 100, '打开预览后主内容宽度应缩小');
  assert.ok(result.previewLeft >= result.mainRight - 1, '预览应位于主内容右侧');
  assert.ok(Math.abs(result.previewRight - result.containerRight) <= 1, '预览应贴齐当前内容区右边');
};

const shrinkPreview = async (page, root, mainSelector, previewSelector, pointer = true) => {
  const handle = root.locator(previewSelector).getByRole('separator', { name: '调整文件预览宽度' });
  await handle.focus();
  await handle.press('Home');
  await page.waitForTimeout(180);
  const before = await geometry(root, mainSelector, previewSelector);
  assert.equal(await handle.getAttribute('aria-orientation'), 'vertical');
  if (pointer) {
    const box = await handle.boundingBox();
    assert.ok(box, '预览拖拽手柄应可见');
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(80, box.height / 2));
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 72, box.y + Math.min(80, box.height / 2), { steps: 4 });
    await page.mouse.up();
  } else {
    for (let step = 0; step < 5; step += 1) await handle.press('ArrowRight');
  }
  const after = await geometry(root, mainSelector, previewSelector);
  assert.ok(after.previewWidth < before.previewWidth - 40, `向右拖拽应缩小预览栏（${before.previewWidth} → ${after.previewWidth}）`);
  assert.ok(after.mainWidth > before.mainWidth + 40, `缩小预览栏应把宽度还给主内容（${before.mainWidth} → ${after.mainWidth}）`);
  assert.equal(Number(await handle.getAttribute('aria-valuenow')), Math.round(after.previewWidth));
};

const enterAndExitFullscreen = async (page, preview) => {
  const before = await preview.boundingBox();
  assert.ok(before, '预览侧栏应可测量');
  const globalSidebar = page.locator('aside.layout-sider');
  const sidebarBefore = await globalSidebar.boundingBox();
  assert.ok(sidebarBefore, '最左侧主菜单应可测量');
  const enter = preview.getByRole('button', { name: '进入全屏预览' });
  assert.equal(await enter.getAttribute('aria-pressed'), 'false');
  await enter.click();
  const exit = preview.getByRole('button', { name: '退出全屏预览' });
  await exit.waitFor();
  assert.equal(await exit.isVisible(), true, '退出全屏预览按钮应实际可见');
  assert.equal(await exit.locator('svg').count(), 1, '退出全屏预览按钮应渲染 Lucide 图标');
  assert.equal(await exit.getAttribute('aria-pressed'), 'true');
  const fullscreen = await preview.boundingBox();
  const exitBox = await exit.boundingBox();
  const sidebarFullscreen = await globalSidebar.boundingBox();
  const titlebar = await page.locator('.app-titlebar').boundingBox();
  const viewport = page.viewportSize();
  assert.ok(fullscreen && exitBox && sidebarFullscreen && titlebar && viewport, '全屏预览、退出按钮、主菜单和系统标题栏应可测量');
  const sidebarRight = sidebarFullscreen.x + sidebarFullscreen.width;
  assert.ok(Math.abs(sidebarFullscreen.x - sidebarBefore.x) <= 1 && Math.abs(sidebarFullscreen.width - sidebarBefore.width) <= 1, '全屏预览不得移动或覆盖最左侧主菜单');
  assert.ok(Math.abs(fullscreen.x - sidebarRight) <= 1, '全屏预览应从最左侧主菜单右边开始');
  assert.ok(Math.abs(fullscreen.y - (titlebar.y + titlebar.height)) <= 1, '全屏预览不得覆盖系统标题栏');
  assert.ok(Math.abs(fullscreen.width - (viewport.width - sidebarRight)) <= 1, '全屏预览应覆盖主菜单右侧的完整工作区宽度');
  assert.ok(Math.abs(fullscreen.height - (viewport.height - fullscreen.y)) <= 1, '全屏预览应覆盖标题栏下方高度');
  assert.ok(exitBox.x >= fullscreen.x && exitBox.x + exitBox.width <= fullscreen.x + fullscreen.width + 1, '退出全屏预览按钮应位于全屏头部可视范围内');
  assert.equal(await preview.getByRole('separator', { name: '调整文件预览宽度' }).isVisible(), false, '全屏时隐藏拖拽分隔线');
  await page.keyboard.press('Escape');
  await enter.waitFor();
  assert.equal(await enter.getAttribute('aria-pressed'), 'false');
  const restored = await preview.boundingBox();
  assert.ok(restored && Math.abs(restored.width - before.width) <= 1, '退出全屏后恢复原预览宽度');
};

test('文件库、项目文件、任务附件与消息统一使用可缩放的右侧挤压及全屏预览', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto(origin + '/#/drive');
    const drive = page.locator('.eva-drive');
    await drive.waitFor();
    const driveWidth = await page.locator('.eva-drive__main').evaluate(element => element.getBoundingClientRect().width);
    await page.locator('[data-drive-action="preview"]').first().click();
    const drivePreview = page.locator('.eva-drive-preview-sidebar');
    await drivePreview.waitFor();
    assertPushedRight(await geometry(drive, '.eva-drive__main', '.eva-drive-preview-sidebar'), driveWidth);
    await shrinkPreview(page, drive, '.eva-drive__main', '.eva-drive-preview-sidebar');
    await enterAndExitFullscreen(page, drivePreview);
    await page.keyboard.press('Escape');
    await drivePreview.waitFor({ state: 'detached' });

    await page.goto(origin + '/#/collab?evaProject=prod');
    await page.reload();
    await page.locator('.collab-frame').waitFor();
    await page.getByRole('tab', { name: '文件', exact: true }).click();
    const projectFiles = page.locator('.eva-project-files');
    await projectFiles.waitFor();
    const projectWidth = await page.locator('.eva-project-files__content').evaluate(element => element.getBoundingClientRect().width);
    const names = page.locator('.eva-project-files__table .eva-drive__name-cell');
    const labels = await names.allTextContents();
    const fileIndex = labels.findIndex(label => /\.(?:pdf|md|docx?|xlsx?|pptx?|zip)\b/i.test(label));
    assert.ok(fileIndex >= 0, '项目文件列表应有可预览样本');
    await names.nth(fileIndex).click();
    const projectPreview = page.locator('.eva-project-file-preview-sidebar');
    await projectPreview.waitFor();
    assertPushedRight(await geometry(projectFiles, '.eva-project-files__content', '.eva-project-file-preview-sidebar'), projectWidth);
    await shrinkPreview(page, projectFiles, '.eva-project-files__content', '.eva-project-file-preview-sidebar', false);
    await enterAndExitFullscreen(page, projectPreview);
    await page.locator('.eva-project-files__header').click();
    await projectPreview.waitFor({ state: 'detached' });

    await page.reload();
    await page.locator('.collab-frame').waitFor();
    await page.getByRole('tab', { name: '任务', exact: true }).click();
    await page.getByText('处理关键供应商来料质量异常', { exact: true }).click();
    const detail = page.locator('.loop-idp').last();
    await detail.waitFor();
    const attachment = detail.locator('.eva-task-attachment-card__name').first();
    await attachment.waitFor();
    const detailWidth = await detail.locator('.loop-idp__body').evaluate(element => element.getBoundingClientRect().width);
    await attachment.click();
    const taskPreview = detail.locator('.eva-task-file-preview-pane');
    await taskPreview.waitFor();
    const taskResult = await geometry(detail, '.loop-idp__body', '.eva-task-file-preview-pane');
    assert.equal(taskResult.display, 'grid');
    assertPushedRight(taskResult, detailWidth);
    await shrinkPreview(page, detail, '.loop-idp__body', '.eva-task-file-preview-pane', false);
    await enterAndExitFullscreen(page, taskPreview);
    await page.keyboard.press('Escape');
    await taskPreview.waitFor({ state: 'detached' });

    await page.goto(origin + '/#/messages');
    await page.reload();
    await page.getByRole('button', { name: '04 图片与文件', exact: true }).click();
    const messageMain = page.locator('.ch-main');
    const messageWidth = await page.locator('.ch-main__col').evaluate(element => element.getBoundingClientRect().width);
    await page.locator('.wk-message-file').first().click();
    const messagePreview = page.locator('.ch-right-panel--file-preview');
    await messagePreview.waitFor();
    assertPushedRight(await geometry(messageMain, '.ch-main__col', '.ch-right-panel--file-preview'), messageWidth);
    await shrinkPreview(page, messageMain, '.ch-main__col', '.ch-right-panel--file-preview', false);
    await enterAndExitFullscreen(page, messagePreview);
    await page.keyboard.press('Escape');
    await messagePreview.waitFor({ state: 'detached' });

    assert.equal(await page.locator('.app-titlebar').count(), 1, '系统标题栏始终唯一可见');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
