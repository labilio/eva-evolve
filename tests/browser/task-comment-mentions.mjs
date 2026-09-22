import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';

test('项目任务评论 @ 复用统一 IM 提及选择器', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
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
    assert.ok(groupTitles.includes('个人助理'), '缺少个人助理分组');
    assert.ok(groupTitles.includes('联系人'), '缺少联系人分组');
    assert.ok(groupTitles.includes('AI 分身'), '缺少 AI 分身分组');
    assert.ok(groupTitles.includes('数字员工'), '缺少数字员工分组');
    assert.ok(groupTitles.includes('专家'), '缺少专家分组');
    assert.ok(groupTitles.includes('专家团'), '缺少专家团分组');
    assert.ok(await menu.getByText('间接采购专家', { exact: true }).count() > 0, '专家候选缺失');
    assert.ok((await menu.locator('.eva-identity-avatar').count()) > 0, 'AI 候选缺少统一头像');
    assert.ok((await menu.locator('.ai-badge').count()) > 0, 'AI 候选缺少公共 AI 标');
    assert.equal(await menu.locator('.eva-im-mention-broadcast-copy').count(), 0, '任务评论 @ 面板不允许 @所有人 / @所有 AI 成员');
    assert.equal(await menu.getByText('所有人', { exact: true }).count(), 0, '任务评论 @ 面板不应出现「所有人」广播项');
    assert.equal(await menu.getByText('所有 AI 成员', { exact: true }).count(), 0, '任务评论 @ 面板不应出现「所有 AI 成员」广播项');

    assert.equal(await menu.getByText('王宜林', { exact: true }).count(), 0, '提及候选不应出现本人真人');
    assert.equal(await menu.getByText('供应链运营协同 · 项目管家', { exact: true }).count(), 0, '提及候选不应出现项目管家');

    const humanMore = menu.locator('[data-eva-mention-more="human"]');
    assert.equal(await humanMore.count(), 1, '联系人超过上限应显示展开入口');
    assert.match(await humanMore.innerText(), /展开其余 2 位/, '联系人展开入口使用「位」量词');
    assert.equal(await menu.locator('.eva-members-human-name').count(), 5, '联系人默认只显示 5 条');
    await humanMore.click();
    assert.equal(await menu.locator('[data-eva-mention-more="human"]').count(), 0, '展开后不再显示「显示更多」');
    assert.equal(await menu.locator('.eva-members-human-name').count(), 7, '展开后显示全部联系人');

    const chipLabels = await menu.locator('.eva-im-mention-chip').allInnerTexts();
    assert.ok(chipLabels[0].startsWith('全部'), '缺少「全部」类型筛选');
    assert.ok(chipLabels.some(label => label.startsWith('专家团')), '缺少专家团类型筛选');
    await menu.locator('[data-eva-mention-kind="agent"]').click();
    assert.equal(await menu.locator('.eva-im-mention-group').count(), 0, '筛选后只保留所选分类');
    assert.ok(await menu.getByText('间接采购专家', { exact: true }).count() > 0, '筛选专家后候选缺失');
    assert.equal(await menu.locator('.eva-members-human-name').count(), 0, '筛选专家后不应出现联系人');

    await page.keyboard.type('林');
    assert.equal(await menu.locator('.eva-im-mention-chip').count(), 0, '检索时不展示类型筛选');
    assert.equal(await menu.locator('.eva-im-mention-group').count(), 0, '检索时不展示分组');
    const rankedRows = menu.locator('.eva-im-mention-options > button:not([data-eva-mention-more])');
    const rankedNames = await rankedRows.allInnerTexts();
    assert.ok(rankedNames.length > 0, '检索应有结果');
    assert.equal(rankedNames[0], '林晓', '前缀匹配按相关度排在最前');
    assert.ok(rankedNames.every(name => name.includes('林')), '检索结果都应包含检索词');
    await page.keyboard.press('Backspace');
    assert.ok(await menu.locator('.eva-im-mention-chip').count() > 0, '清空检索后恢复类型筛选');
    await menu.locator('[data-eva-mention-kind="all"]').click();
    assert.ok(await menu.locator('.eva-members-human-name').count() > 0, '恢复全部后重新显示联系人');

    await page.keyboard.type('采购');
    await rankedRows.first().waitFor();
    assert.match(await rankedRows.first().innerText(), /^采购与招投标专家团/, '相关度：前缀匹配排在包含匹配之前');
    assert.equal(await menu.getByText('林晓', { exact: true }).count(), 0, '检索未过滤其它候选');

    await page.keyboard.press('Enter');
    await menu.waitFor({ state: 'detached' });
    const mention = detail.locator('.loop-idp__newcomment .loop-mention').first();
    await mention.waitFor();
    assert.match(await mention.innerText(), /采购与招投标专家团/);

    assert.deepEqual(errors, [], '控制台出现页面错误');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('项目任务评论 @ 输入法组词期间不刷新、上屏后才检索', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);

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
    const groupCount = await menu.locator('.eva-im-mention-group').count();
    const chipCount = await menu.locator('.eva-im-mention-chip').count();
    assert.ok(groupCount > 0, '初始应显示分组');
    assert.ok(chipCount > 0, '初始应显示类型筛选');

    // 输入法组词（拼音未上屏）：菜单必须保持组词前状态，不刷新、不重排、不过滤。
    await cdp.send('Input.imeSetComposition', { text: 'lin', selectionStart: 3, selectionEnd: 3 });
    await page.waitForTimeout(300);
    assert.equal(await menu.locator('.eva-im-mention-group').count(), groupCount, '组词期间不应刷新分组');
    assert.equal(await menu.locator('.eva-im-mention-chip').count(), chipCount, '组词期间不应隐藏类型筛选');

    // 上屏「林」：此时才进入检索态，按上屏文字过滤。
    await cdp.send('Input.insertText', { text: '林' });
    await page.waitForTimeout(400);
    assert.equal(await menu.locator('.eva-im-mention-group').count(), 0, '上屏后应进入检索态且不分组');
    assert.equal(await menu.locator('.eva-im-mention-chip').count(), 0, '上屏后应隐藏类型筛选');
    const firstRow = menu.locator('.eva-im-mention-options > button:not([data-eva-mention-more])').first();
    await firstRow.waitFor();
    assert.match(await firstRow.innerText(), /林晓/, '上屏后应按上屏文字检索');

    assert.deepEqual(errors, [], '控制台出现页面错误');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
