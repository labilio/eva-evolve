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
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());
  page = await context.newPage();
  await page.goto(`${origin}/#/collab`);
  await page.getByRole('button', { name: /^供应链运营协同/ }).first().click();
  await page.getByRole('tab', { name: '项目设置', exact: true }).click();
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function selectSettingsTab(name) {
  await page.getByRole('tab', { name, exact: true }).click();
  await page.waitForTimeout(220);
}

async function box(selector) {
  const value = await page.locator(selector).first().boundingBox();
  assert.ok(value, `${selector} should be visible`);
  return value;
}

test('基本信息与其余项目设置页签使用相同的宽版内容边界', async () => {
  await selectSettingsTab('专家');
  const referenceRoot = await box('.semi-tabs-pane-active .loop-page');
  const referenceBody = await box('.semi-tabs-pane-active .loop-agent-list');

  await selectSettingsTab('基本信息');
  const basicRoot = await box('.semi-tabs-pane-active .eva-project-settings-info');
  const basicBody = await box('.semi-tabs-pane-active .eva-project-settings-info__hero');

  assert.ok(Math.abs(basicRoot.x - referenceRoot.x) <= 1);
  assert.ok(Math.abs(basicRoot.width - referenceRoot.width) <= 1);
  assert.ok(Math.abs(basicBody.x - referenceBody.x) <= 1);
  assert.ok(Math.abs(basicBody.width - referenceBody.width) <= 1);
});

test('基本信息把蓝色留给保存主行动，行内编辑使用中性操作', async () => {
  await selectSettingsTab('基本信息');
  const appearance = await page.locator('.eva-project-settings-info').evaluate(root => {
    const style = selector => getComputedStyle(root.querySelector(selector));
    const add = style('.eva-project-settings-info__card-title .semi-button');
    const remove = style('.eva-project-settings-info__row .semi-button');
    const label = style('.eva-project-info-field label');
    const input = style('.semi-input');
    const textarea = style('textarea');
    return {
      addColor: add.color,
      addBackground: add.backgroundColor,
      removeText: root.querySelector('.eva-project-settings-info__row .semi-button')?.innerText.trim(),
      removeColor: remove.color,
      labelFont: [label.fontSize, label.lineHeight, label.fontWeight],
      inputFont: [input.fontSize, input.lineHeight, input.fontWeight],
      textareaFont: [textarea.fontSize, textarea.lineHeight, textarea.fontWeight],
      textareaResize: textarea.resize,
    };
  });

  assert.notEqual(appearance.addColor, 'rgb(21, 99, 235)', '行内新增不应与主行动争抢蓝色');
  assert.equal(appearance.addBackground, 'rgb(245, 245, 245)');
  assert.equal(appearance.removeText, '删除');
  assert.equal(appearance.removeColor, 'rgb(107, 114, 128)', '危险动作默认弱化，不在表单中制造多个高饱和红色焦点');
  assert.deepEqual(appearance.labelFont, ['14px', '22px', '500']);
  assert.deepEqual(appearance.inputFont, ['14px', '22px', '400']);
  assert.deepEqual(appearance.textareaFont, ['14px', '22px', '400']);
  assert.equal(appearance.textareaResize, 'none');
});

test('五个项目设置页签共用统一按钮尺寸和唯一主行动配额', async () => {
  const primaryByTab = new Map([
    ['基本信息', '保存修改'],
    ['成员管理', '添加成员'],
    ['专家', '新建专家'],
    ['专家团', '新建专家团'],
    ['技能', '新建技能'],
  ]);

  for (const [tab, primaryText] of primaryByTab) {
    await selectSettingsTab(tab);
    const result = await page.locator('.semi-tabs-pane-active').evaluate((pane, expectedPrimary) => {
      const settings = pane.closest('.eva-project-settings');
      const visibleButtons = [...pane.querySelectorAll('button')].filter(button => {
        const style = getComputedStyle(button);
        return style.display !== 'none' && style.visibility !== 'hidden' && button.getBoundingClientRect().width > 0;
      });
      const primary = visibleButtons.filter(button => {
        const style = getComputedStyle(button);
        return style.backgroundColor === 'rgb(21, 99, 235)' && !button.disabled;
      });
      const expected = visibleButtons.find(button => button.innerText.trim() === expectedPrimary);
      const toolbarActions = visibleButtons.filter(button =>
        button.matches('.loop-page__toolbar button,.loop-agent-toolbar button,.loop-skill-page-head__row button,.eva-members-toolbar button')
      );
      return {
        hasSettingsScope: Boolean(settings),
        primaryTexts: primary.map(button => button.innerText.trim()),
        expectedHeight: expected ? getComputedStyle(expected).height : null,
        toolbarHeights: toolbarActions.map(button => getComputedStyle(button).height),
      };
    }, primaryText);

    assert.equal(result.hasSettingsScope, true, `${tab} 应处于项目设置共享作用域`);
    assert.deepEqual(result.primaryTexts, tab === '基本信息' ? [] : [primaryText]);
    assert.equal(result.expectedHeight, '32px');
    assert.ok(result.toolbarHeights.every(height => height === '32px'), `${tab} 工具栏按钮高度应统一为 32px`);
  }
});

test('成员管理行只保留治理操作并使用更小的操作文字', async () => {
  await selectSettingsTab('成员管理');
  const result = await page.locator('.eva-members-table').evaluate(table => {
    const actionGroups = [...table.querySelectorAll('.eva-members-actions')];
    const buttons = actionGroups.flatMap(group => [...group.querySelectorAll('button')]);
    return {
      texts: buttons.map(button => button.innerText.trim()),
      fontSizes: buttons.map(button => getComputedStyle(button).fontSize),
    };
  });

  assert.equal(result.texts.includes('管理分身'), false);
  assert.ok(result.texts.includes('转让'));
  assert.ok(result.texts.includes('移除'));
  assert.ok(result.fontSizes.length > 0);
  assert.ok(result.fontSizes.every(size => size === '11px'));
});
