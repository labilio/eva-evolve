import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';

test('项目任务评论 @ 复用统一 IM 提及选择器', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto(origin + '/#/collab?evaProject=prod');
    await page.locator('.collab-frame').waitFor();
    await page.getByRole('tab', { name: '任务', exact: true }).click();
    await page.getByText('分析核心品类采购成本偏差', { exact: true }).click();
    const detail = page.locator('.loop-idp').last();
    await detail.waitFor();

    const editor = detail.locator('.loop-idp__newcomment .ProseMirror').first();
    await editor.waitFor();
    await editor.click();
    await page.keyboard.type('@');

    const menu = page.locator('.eva-loop-mention-host .eva-im-mention-picker');
    await menu.waitFor();
    const menuBox = await menu.boundingBox();
    assert.ok(menuBox.width > 300, '菜单宽度塌陷（宿主宽度为 0）');
    assert.ok(menuBox.height > 200, '菜单高度异常');
    assert.ok(menuBox.x >= 0 && menuBox.x + menuBox.width <= 1200, '菜单超出视口');
    assert.equal(await page.locator('.loop-mention-menu').count(), 0, '旧的 vendor 提及菜单不应再出现');

    const groupTitles = await menu.locator('.eva-im-mention-group').allInnerTexts();
    assert.ok(groupTitles.includes('本地助理'), '缺少本地助理分组');
    assert.ok(groupTitles.includes('人类'), '缺少人类分组');
    assert.ok(groupTitles.includes('AI 分身'), '缺少 AI 分身分组');
    assert.ok(groupTitles.includes('数字员工'), '缺少数字员工分组');
    assert.ok(groupTitles.includes('专家'), '缺少专家分组');
    assert.ok(groupTitles.includes('专家团'), '缺少专家团分组');
    assert.ok(await menu.getByText('间接采购专家', { exact: true }).count() > 0, '专家候选缺失');
    assert.ok((await menu.locator('.eva-identity-avatar').count()) > 0, 'AI 候选缺少统一头像');
    assert.ok((await menu.locator('.ai-badge').count()) > 0, 'AI 候选缺少公共 AI 标');

    const humanMore = menu.locator('[data-eva-mention-more="human"]');
    assert.equal(await humanMore.count(), 1, '人类超过上限应显示展开入口');
    assert.match(await humanMore.innerText(), /展开其余 3 位/, '人类展开入口使用「位」量词');
    assert.equal(await menu.locator('.eva-members-human-name').count(), 5, '人类默认只显示 5 条');
    await humanMore.click();
    assert.equal(await menu.locator('[data-eva-mention-more="human"]').count(), 0, '展开后不再显示「显示更多」');
    assert.equal(await menu.locator('.eva-members-human-name').count(), 8, '展开后显示全部人类');

    const chipLabels = await menu.locator('.eva-im-mention-chip').allInnerTexts();
    assert.ok(chipLabels[0].startsWith('全部'), '缺少「全部」类型筛选');
    assert.ok(chipLabels.some(label => label.startsWith('专家团')), '缺少专家团类型筛选');
    await menu.locator('[data-eva-mention-kind="agent"]').click();
    assert.equal(await menu.locator('.eva-im-mention-group').count(), 0, '筛选后只保留所选分类');
    assert.ok(await menu.getByText('间接采购专家', { exact: true }).count() > 0, '筛选专家后候选缺失');
    assert.equal(await menu.locator('.eva-members-human-name').count(), 0, '筛选专家后不应出现人类');

    await page.keyboard.type('王宜林');
    assert.equal(await menu.locator('[data-eva-mention-kind="agent"].is-active').count(), 0, '选中分类无结果时不应停留在空筛选');
    assert.equal(await menu.locator('[data-eva-mention-kind="all"].is-active').count(), 1, '选中分类无结果时自动退回「全部」');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await menu.locator('[data-eva-mention-kind="all"]').click();
    assert.ok(await menu.locator('.eva-members-human-name').count() > 0, '恢复全部后重新显示人类');

    const humanName = await menu.locator('.eva-members-human-name').first().innerText();
    await page.keyboard.type('采购');
    await menu.getByText('间接采购专家', { exact: true }).waitFor();
    assert.equal(await menu.getByText(humanName, { exact: true }).count(), 0, '检索未过滤其它候选');

    await page.keyboard.press('Enter');
    await menu.waitFor({ state: 'detached' });
    const mention = detail.locator('.loop-idp__newcomment .loop-mention').first();
    await mention.waitFor();
    assert.match(await mention.innerText(), /间接采购专家/);

    assert.deepEqual(errors, [], '控制台出现页面错误');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
