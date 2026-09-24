import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';

test('我的 Agent 会话搜索：分类分组拖尾标题、跳转与退出机制，不新建会话', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  try {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/#/messages?evaIM=my-ai`);
    await page.locator('.eva-ai-team').waitFor();

    const fixture = await page.evaluate(() => {
      const store = window.EvaAITeam;
      const assistant = store.getSnapshot().identities.find(identity => identity.role === 'assistant');
      for (let index = 1; index <= 6; index += 1) {
        const id = store.createThread(assistant.id);
        store.renameThread(assistant.id, id, 'Q3SEARCHFIXTURE 助理会话 ' + index);
      }
      const miss = store.createThread(assistant.id);
      store.renameThread(assistant.id, miss, '无关会话-搜索验收');
      const groups = window.EvaMyAITeamGroup;
      const system = groups.groups().find(group => group.system);
      const thread = groups.createThread(system.id, { name: 'Q3SEARCHFIXTURE 子区会话' });
      return { assistantId: assistant.id, assistantName: assistant.name, systemName: system.name, thread, assistantSessions: store.getSnapshot().sessions.filter(session => session.identityId === assistant.id).length };
    });

    const toggle = page.locator('.eva-ai-team__search-toggle');
    assert.equal(await toggle.getAttribute('aria-label'), '搜索会话');
    assert.equal((await toggle.boundingBox()).width, 32, '搜索入口沿用标题栏 32px 图标按钮');
    await toggle.click();

    const field = page.locator('.eva-ai-team__search-input');
    await field.waitFor({ state: 'visible' });
    const input = field.locator('input');
    assert.equal(await input.getAttribute('placeholder'), '搜索会话');

    // 空查询保留原层级结构，不进入结果态。
    assert.equal(await page.locator('.eva-ai-team__teams').isVisible(), true);
    assert.equal(await page.locator('.eva-ai-team__search-results').count(), 0);

    await input.fill('Q3SEARCHFIXTURE');
    const groupLabels = page.locator('.eva-ai-team__section-label');
    await groupLabels.first().waitFor();
    assert.deepEqual((await groupLabels.allInnerTexts()).map(text => text.trim()), ['AI 小队', '个人助理'], '按 AI 分类给出分组标题');
    const groupHeaders = page.locator('.eva-ai-team__section-heading');
    assert.equal(await groupHeaders.count(), 2);
    assert.equal(await groupHeaders.nth(0).locator('.eva-ai-team__section-rule').isVisible(), false, '第一组不拖尾线');
    assert.equal(await groupHeaders.nth(1).locator('.eva-ai-team__section-rule').isVisible(), true, '后续分组标题带拖尾线');
    // 结果行直接复用原生列表行：identity/team 行是父行，session/team-thread 行是缩进子行。
    const rows = page.locator('.eva-ai-team__identity-heading, .eva-ai-team__team-heading, .eva-ai-team__session-row, .eva-ai-team__team-thread-row');
    assert.equal(await rows.count(), 8, '两个父身份行 + AI 小队 1 条子会话 + 个人助理默认上限 5 条子会话');
    const titles = await page.locator('.eva-ai-team__session-title').allInnerTexts();
    assert.ok(titles.every(title => title.includes('Q3SEARCHFIXTURE')), JSON.stringify(titles));
    // 三级结构：分类下身份作父行，命中会话缩进为子行，归属关系由层级表达、不再逐行重复。
    const parents = await page.locator('.eva-ai-team__identity-name, .eva-ai-team__team-name').allInnerTexts();
    assert.ok(parents.includes(fixture.assistantName), '个人助理以父身份行带出其命中会话');
    assert.ok(parents.includes(fixture.systemName), 'AI 小队以父身份行带出其命中子区');
    assert.equal(await page.locator('.eva-ai-team__search-owner').count(), 0, '父行已表达归属，子行不再重复归属行');
    assert.equal(await page.locator('.eva-ai-team__search-hit').first().innerText(), 'Q3SEARCHFIXTURE', '命中词高亮');
    const expand = page.locator('.eva-ai-team__search-more');
    assert.equal((await expand.innerText()).trim(), '展开其余 1 条', '每个身份默认上限 5 条并显示「展开其余」');
    await expand.click();
    assert.equal(await rows.count(), 9, '展开其余后显示全部命中');
    assert.equal(await page.evaluate(id => window.EvaAITeam.getSnapshot().sessions.filter(session => session.identityId === id).length, fixture.assistantId), fixture.assistantSessions, '搜索不新建会话');

    // 点击 AI 小队子区：进入子区并关闭搜索。
    await rows.filter({ hasText: 'Q3SEARCHFIXTURE 子区会话' }).click();
    await page.locator('.eva-ai-team__search-input').waitFor({ state: 'detached' });
    await page.locator('.eva-ai-team__team-thread-row.is-selected').filter({ hasText: 'Q3SEARCHFIXTURE 子区会话' }).waitFor();

    // 点击个人助理会话：进入该会话并关闭搜索。
    await toggle.click();
    await page.locator('.eva-ai-team__search-input input').fill('Q3SEARCHFIXTURE 助理会话 3');
    await page.locator('.eva-ai-team__session-row').first().click();
    await page.locator('.eva-ai-team__search-input').waitFor({ state: 'detached' });
    await page.locator('.eva-ai-team__session-row.is-selected').filter({ hasText: 'Q3SEARCHFIXTURE 助理会话 3' }).waitFor();

    // AI 名称命中：身份以父行出现（单行名称 + AI 标），其命中会话缩进为子行。
    await toggle.click();
    await page.locator('.eva-ai-team__search-input input').fill(fixture.assistantName);
    await page.locator('.eva-ai-team__identity-heading').first().waitFor();
    assert.ok((await page.locator('.eva-ai-team__identity-heading .eva-ai-team__identity-name').allInnerTexts()).includes(fixture.assistantName), 'AI 名称命中身份本身');
    assert.equal(await page.locator('.eva-ai-team__identity-heading .eva-ai-team__search-hit').first().innerText(), fixture.assistantName, '身份名命中词高亮');
    assert.ok(await page.locator('.eva-ai-team__session-row .eva-ai-team__session-title').count() > 0, 'AI 名称同时带出其命中会话子行');
    await page.locator('.eva-ai-team__search-input input').press('Escape');
    await page.locator('.eva-ai-team__search-input').waitFor({ state: 'detached' });

    // 无匹配时给出空状态，Escape 关闭并回到原层级。
    await toggle.click();
    await page.locator('.eva-ai-team__search-input input').fill('zzz-不存在-zzz');
    await page.locator('.eva-task-assignee-empty').getByText('没有找到匹配的会话').waitFor();
    await page.locator('.eva-ai-team__search-input input').press('Escape');
    await page.locator('.eva-ai-team__search-input').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.eva-ai-team__teams').isVisible(), true);

    // 空查询下点侧栏普通会话：关闭搜索并切到该会话。
    await toggle.click();
    await page.locator('.eva-ai-team__session:not([aria-current="true"])').first().click();
    await page.locator('.eva-ai-team__search-input').waitFor({ state: 'detached' });

    // 点击搜索区外（内容区）：关闭搜索并回到原层级。
    await toggle.click();
    await page.locator('.eva-ai-team__search-input input').fill('Q3SEARCHFIXTURE');
    await page.locator('.eva-ai-team__search-results').waitFor();
    await page.mouse.click(900, 200);
    await page.locator('.eva-ai-team__search-input').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.eva-ai-team__teams').isVisible(), true);

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
