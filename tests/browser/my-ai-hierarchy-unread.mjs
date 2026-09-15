import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';

test('我的 Agent：默认层级、分层未读与已读回收保持一致', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  try {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/#/messages?evaIM=my-ai`);
    await page.locator('.eva-ai-team').waitFor();

    assert.equal(await page.locator('.eva-ai-team__section-title').count(), 0, '不再显示 AI 团队与 AI 助理顶层标题');
    assert.equal(await page.getByRole('button', { name: 'AI 团队', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'AI 助理', exact: true }).count(), 0);
    assert.equal(await page.locator('.eva-ai-team__list-divider').count(), 1, '团队与单聊之间只有一条分隔线');
    assert.equal(await page.evaluate(() => {
      const teams=document.querySelector('.eva-ai-team__teams')?.getBoundingClientRect();
      const divider=document.querySelector('.eva-ai-team__list-divider')?.getBoundingClientRect();
      const direct=document.querySelector('.eva-ai-team__direct-groups')?.getBoundingClientRect();
      return !!teams&&!!divider&&!!direct&&teams.bottom<=divider.top&&divider.bottom<=direct.top;
    }), true, '分隔线位于团队列表和单聊列表之间');
    const titlebarBox = await page.locator('.app-titlebar').boundingBox();
    const pageBox = await page.locator('.eva-ai-team').boundingBox();
    assert.ok(titlebarBox && pageBox && pageBox.y >= titlebarBox.y + titlebarBox.height, '我的 AI 页面保持在系统标题栏下方');
    await page.locator('[data-eva-nav-id="messages"]').click();
    await page.waitForURL('**/#/messages');
    await page.locator('.eva-ai-team').waitFor({ state: 'detached' });
    const messageColumns = await page.evaluate(() => {
      const start=node=>node?.getBoundingClientRect().x;
      const parent=document.querySelector('.wk-conv-compact-item:not(.wk-conv-compact-item--thread)');
      const child=document.querySelector('.wk-conv-compact-item--thread');
      return {
        avatar:start(parent?.querySelector('.wk-conv-compact-icon')),
        name:start(parent?.querySelector('.wk-conv-compact-name')),
        childIcon:start(child?.querySelector('.wk-conv-compact-icon')),
        childName:start(child?.querySelector('.wk-conv-compact-name')),
      };
    });
    await page.locator('[data-eva-nav-id="my-ai"]').click();
    await page.waitForURL('**evaIM=my-ai');
    await page.locator('.eva-ai-team').waitFor();
    const myAiColumns = await page.evaluate(() => {
      const start=selector=>document.querySelector(selector)?.getBoundingClientRect().x;
      return {
        teamAvatar:start('.eva-ai-team__team-avatar'),
        teamName:start('.eva-ai-team__team-name'),
        identityAvatar:start('.eva-ai-team__identity-button .eva-identity-avatar'),
        identityName:start('.eva-ai-team__identity-name'),
        roleName:start('.eva-ai-team__group-title'),
        childIcon:start('.eva-ai-team__team-thread-row .wk-conv-compact-icon'),
        childName:start('.eva-ai-team__team-thread-row .wk-conv-compact-name'),
      };
    });
    const aligned=(actual,expected)=>Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)<1;
    assert.ok(aligned(myAiColumns.teamAvatar,messageColumns.avatar),JSON.stringify({myAiColumns,messageColumns}));
    assert.ok(aligned(myAiColumns.identityAvatar,messageColumns.avatar));
    assert.ok(aligned(myAiColumns.roleName,messageColumns.avatar));
    assert.ok(aligned(myAiColumns.teamName,messageColumns.name));
    assert.ok(aligned(myAiColumns.identityName,messageColumns.name));
    assert.ok(aligned(myAiColumns.childIcon,messageColumns.childIcon));
    assert.ok(aligned(myAiColumns.childName,messageColumns.childName));
    assert.ok(aligned(myAiColumns.childName,myAiColumns.teamName),'团队子区名称与父团队名称对齐');
    assert.ok(aligned(messageColumns.childName,messageColumns.name),'消息子区名称与父群名称对齐');
    const disclosureBox=await page.locator('.eva-ai-team__team-toggle').first().boundingBox();
    assert.ok(disclosureBox && disclosureBox.width >= 24 && disclosureBox.height >= 32, '收紧缩进后团队展开按钮仍可操作');

    const systemTeam = page.locator('.eva-ai-team__team:has(.eva-ai-team__team-default)');
    assert.equal(await systemTeam.locator('.eva-ai-team__team-name').innerText(), '我的AI团队');
    assert.equal(await systemTeam.locator('.eva-ai-team__team-toggle').getAttribute('aria-expanded'), 'true', '系统团队默认展开');
    const identityButtons = page.locator('.eva-ai-team__identity-button');
    assert.ok(await identityButtons.count() > 0);
    assert.ok((await identityButtons.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-expanded')))).every(value => value === 'false'), 'AI 身份默认收起');
    const assistantIdentity = page.locator('.eva-ai-team__identity').filter({ hasText: '通用助理' }).first();
    const assistantToggle = assistantIdentity.locator('.eva-ai-team__identity-button');
    await assistantToggle.click();
    const assistantNameBox = await assistantIdentity.locator('.eva-ai-team__identity-name').boundingBox();
    const assistantSessionBox = await assistantIdentity.locator('.eva-ai-team__session-title').first().boundingBox();
    assert.ok(assistantNameBox && assistantSessionBox && Math.abs(assistantNameBox.x - assistantSessionBox.x) < 1, '个人助理会话名称与助理名称起点对齐');
    await assistantToggle.click();

    const fixture = await page.evaluate(() => {
      const groupStore = window.EvaMyAITeamGroup;
      const defaultGroup = groupStore.groups().find(group => group.system);
      const identities = window.EvaAITeam.getSnapshot().identities;
      const identityId = identities[0].id;
      const newMemberId = identities[1].id;
      const newMemberName = identities[1].name;
      const customGroupName = '层级回归团队-用于确认超长团队名称单行截断且操作入口保持可用';
      const renamedGroupName = '名称头像回归团队';
      const customGroupId = groupStore.createGroup({ name: customGroupName, memberIds: [identityId] });
      const extraThreadId = groupStore.createThread(defaultGroup.id, { id: 'hierarchy-regression', name: '额外验收子区' });
      return { customGroupId, customGroupName, renamedGroupName, newMemberId, newMemberName, extraThreadId };
    });
    const customTeam = page.locator(`.eva-ai-team__team:has(.eva-ai-team__team-button[aria-label="进入团队会话 ${fixture.customGroupName}"])`);
    await customTeam.waitFor();
    assert.equal(await customTeam.locator('.eva-ai-team__team-toggle').getAttribute('aria-expanded'), 'false', '自定义团队默认收起');
    await page.waitForFunction(() => document.querySelector('.eva-ai-team__team:has(.eva-ai-team__team-default) .eva-ai-team__team-threads-more'));
    assert.equal(await systemTeam.locator('.eva-ai-team__team-thread-row').count(), 3, '系统团队默认仅展示最新三个子区');
    const more = systemTeam.locator('.eva-ai-team__team-threads-more');
    await more.click();
    assert.equal(await systemTeam.locator('.eva-ai-team__team-thread-row').count(), 4);
    await more.click();
    assert.equal(await systemTeam.locator('.eva-ai-team__team-thread-row').count(), 3);

    assert.ok(await page.locator('.eva-my-ai-collaboration-icon__unread').count() > 0, '左侧导航聚合未读红点');
    assert.ok(await systemTeam.locator('.eva-ai-team__unread-dot').count() > 0, '团队父级聚合红点');
    await systemTeam.locator('.eva-ai-team__team-button').click();
    assert.ok(await systemTeam.locator('.eva-ai-team__unread-dot').count() > 0, '主会话已读后仍聚合未读子区');
    const unreadTeamThread = systemTeam.locator('.eva-ai-team__team-thread-row:has(.wk-conv-compact-badge)').first();
    const unreadTeamThreadName = await unreadTeamThread.locator('.wk-conv-compact-name').innerText();
    const selectedTeamThread = systemTeam.locator('.wk-conv-compact-item').filter({ hasText: unreadTeamThreadName }).first();
    await selectedTeamThread.click();
    await selectedTeamThread.locator('.wk-conv-compact-badge').waitFor({ state: 'detached' });
    assert.equal(await systemTeam.locator('.eva-ai-team__unread-dot').count(), 0, '主会话与唯一未读子区均已读后团队红点清零');

    const selectedTeamButton = systemTeam.locator('.eva-ai-team__team-button');
    assert.equal(await selectedTeamButton.getAttribute('aria-current'), null, '进入子区后父团队不伪装为当前主会话');
    const selectedThreadState = await selectedTeamThread.getAttribute('aria-current');
    const unreadIdentity = page.locator('.eva-ai-team__identity:has(.eva-ai-team__unread-dot)').first();
    const unreadIdentityButton = unreadIdentity.locator('.eva-ai-team__identity-button');
    const unreadIdentityControls = await unreadIdentityButton.getAttribute('aria-controls');
    const selectedIdentity = page.locator(`.eva-ai-team__identity:has(.eva-ai-team__identity-button[aria-controls="${unreadIdentityControls}"])`);
    await unreadIdentityButton.click();
    assert.equal(await unreadIdentityButton.getAttribute('aria-expanded'), 'true', '点击身份行只展开会话');
    assert.equal(await selectedTeamThread.getAttribute('aria-current'), selectedThreadState, '展开身份不切换当前子区');

    const unreadSessionRow = selectedIdentity.locator('.eva-ai-team__session-row:has(.eva-ai-team__session-unread)').first();
    const unreadBadge = unreadSessionRow.locator('.eva-ai-team__session-unread');
    assert.ok(await unreadBadge.count() > 0, '会话叶子显示精确未读数');
    assert.equal(await unreadBadge.innerText(), '1');
    await unreadSessionRow.hover();
    await page.waitForTimeout(200);
    assert.equal(await unreadBadge.evaluate(node => getComputedStyle(node).opacity), '0', '悬停操作替换未读数字');
    assert.equal(await unreadSessionRow.locator('.eva-ai-team__session-actions').evaluate(node => getComputedStyle(node).opacity), '1');
    await unreadSessionRow.locator('.eva-ai-team__session').click();
    await unreadBadge.waitFor({ state: 'detached' });
    assert.equal(await selectedIdentity.locator('.eva-ai-team__unread-dot').count(), 0, '进入唯一未读会话后身份红点清零');

    await page.evaluate(() => {
      const direct = window.EvaAITeam;
      direct.getSnapshot().sessions.forEach(session => direct.markRead(session.id));
      const digital = window.EvaDigitalEmployeesStore;
      digital.teamIds().forEach(id => digital.sessions(id).forEach(session => digital.markRead(id, session.id)));
      const groups = window.EvaMyAITeamGroup;
      groups.groups().forEach(group => {
        groups.markRead(group.id, group.id);
        groups.source(group.id, []).channels[0].threads.forEach(thread => groups.markRead(group.id, thread.id));
      });
    });
    await page.locator('.eva-my-ai-collaboration-icon__unread').waitFor({ state: 'detached' });

    const editor = page.getByRole('textbox', { name: /^发送给 / });
    await editor.fill('当前会话未读回归');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.locator('.eva-im-bubble-row').getByText('当前会话未读回归', { exact: true }).waitFor();
    assert.equal(await page.locator('.eva-my-ai-collaboration-icon__unread').count(), 0, '当前会话同步回复不会产生幽灵未读');
    assert.equal(await page.locator('.eva-ai-team__session-unread').count(), 0);
    const viewport = await page.evaluate(() => ({
      scrollX: window.scrollX,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    assert.deepEqual(viewport, { scrollX: 0, overflow: 0 }, '展开长会话名后页面不得横向滚动或溢出');

    await customTeam.locator('.eva-ai-team__team-button').click();
    assert.equal(await customTeam.locator('.eva-ai-team__team-menu').count(), 0, '中栏不再保留第二套团队治理菜单');
    await page.getByRole('button', { name: '聊天信息', exact: true }).click();
    let teamInfo = page.locator('.eva-chat-settings');
    await teamInfo.waitFor();
    await teamInfo.getByRole('heading', { name: '聊天信息（2）', exact: true }).waitFor();
    assert.equal(await teamInfo.getByRole('button', { name: '添加 AI 团队成员', exact: true }).count(), 1);
    assert.equal(await teamInfo.getByRole('button', { name: '编辑 AI 团队', exact: true }).count(), 0);
    await teamInfo.getByRole('button', { name: /^团队名称/ }).click();
    const nameEditor = teamInfo.locator('.eva-chat-setting-edit').filter({ hasText: '团队名称' });
    await nameEditor.getByRole('textbox', { name: '团队名称', exact: true }).fill(fixture.renamedGroupName);
    await nameEditor.getByRole('button', { name: '保存', exact: true }).click();
    const renamedTeam = page.locator(`.eva-ai-team__team:has(.eva-ai-team__team-button[aria-label="进入团队会话 ${fixture.renamedGroupName}"])`);
    await renamedTeam.waitFor();
    assert.equal(await page.evaluate(id => window.EvaMyAITeamGroup.get(id).name, fixture.customGroupId), fixture.renamedGroupName);
    assert.equal(await teamInfo.getByRole('button', { name: /^团队头像/ }).count(), 0, 'AI 团队头像保持默认且不提供编辑入口');
    await page.screenshot({ path: '/tmp/eva-my-ai-team-details-1200.png' });
    await teamInfo.getByRole('button', { name: '添加 AI 团队成员', exact: true }).click();
    const groupEditor = page.locator('.semi-modal').filter({ hasText: '编辑团队成员' });
    await groupEditor.waitFor();
    assert.equal(await groupEditor.locator('.eva-member-picker__field').count(), 0, '成员编辑不再混入团队名称和头像');
    assert.equal(await groupEditor.getByRole('textbox', { name: '团队名称', exact: true }).count(), 0);
    const candidate = groupEditor.locator('.eva-member-picker__candidate').filter({ hasText: fixture.newMemberName });
    await candidate.click();
    assert.equal(await candidate.getByRole('checkbox').isChecked(), true);
    await groupEditor.getByText('保存', { exact: true }).click();
    await page.getByRole('button', { name: '聊天信息', exact: true }).click();
    teamInfo = page.locator('.eva-chat-settings');
    await teamInfo.getByRole('heading', { name: '聊天信息（3）', exact: true }).waitFor();
    assert.ok(await teamInfo.getByText(fixture.newMemberName, { exact: true }).count() > 0, '新增成员即时出现在团队信息中');
    assert.equal(await page.evaluate(({ groupId, memberId }) => window.EvaMyAITeamGroup.get(groupId).memberIds.includes(memberId), { groupId: fixture.customGroupId, memberId: fixture.newMemberId }), true);
    await teamInfo.getByRole('button', { name: '解散 AI 团队', exact: true }).click();
    let dissolveModal = page.locator('.semi-modal').filter({ hasText: '解散 AI 团队' });
    const modalBox = await dissolveModal.locator('.semi-modal-content').boundingBox();
    assert.ok(modalBox && modalBox.y >= titlebarBox.y + titlebarBox.height, '解散确认框保持在系统标题栏下方');
    await page.screenshot({ path: '/tmp/eva-my-ai-dissolve-confirm-1200.png' });
    await dissolveModal.getByText('取消', { exact: true }).click();
    assert.equal(await renamedTeam.count(), 1, '取消解散后团队仍保留');
    await page.getByRole('button', { name: '聊天信息', exact: true }).click();
    teamInfo = page.locator('.eva-chat-settings');
    await teamInfo.waitFor();
    await teamInfo.getByRole('button', { name: '解散 AI 团队', exact: true }).click();
    dissolveModal = page.locator('.semi-modal').filter({ hasText: '解散 AI 团队' });
    await dissolveModal.getByText('解散群', { exact: true }).click();
    await renamedTeam.waitFor({ state: 'detached' });
    assert.equal(await systemTeam.locator('.eva-ai-team__team-button').getAttribute('aria-current'), 'true', '解散当前团队后回到默认团队');
    assert.equal(await page.evaluate(id => window.EvaMyAITeamGroup.groups().some(group => group.id === id), fixture.customGroupId), false);
    await page.reload();
    await page.locator('.eva-ai-team').waitFor();
    assert.equal(await page.locator(`.eva-ai-team__team-button[aria-label="进入团队会话 ${fixture.renamedGroupName}"]`).count(), 0, '刷新后已解散团队不会恢复');
    assert.deepEqual(errors, []);

    await page.screenshot({ path: '/tmp/eva-my-ai-hierarchy-unread-1200.png' });
    assert.ok(fixture.customGroupId && fixture.extraThreadId);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('云端分身删空后不显示占位，点击身份发送才创建会话', async () => {
  const server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  try {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/#/messages?evaIM=my-ai`);
    await page.locator('.eva-ai-team').waitFor();

    const fixture = await page.evaluate(() => {
      const store = window.EvaAITeam;
      const persona = store.getSnapshot().identities.find(identity => identity.role === 'persona');
      const sessions = store.getSnapshot().sessions.filter(session => session.identityId === persona.id);
      sessions.slice(1).forEach(session => store.deleteSession(session.id));
      return { id: persona.id, name: persona.name, sessionId: sessions[0].id, sessionTitle: sessions[0].title };
    });
    const persona = page.locator('.eva-ai-team__identity').filter({ hasText: fixture.name }).first();
    const identityButton = persona.locator('.eva-ai-team__identity-button');
    await identityButton.click();
    const onlySession = persona.locator('.eva-ai-team__session-row');
    assert.equal(await onlySession.count(), 1);
    await onlySession.locator('.eva-ai-team__session').click();
    await onlySession.hover();
    await onlySession.getByRole('button', { name: '会话操作 ' + fixture.sessionTitle }).click();
    await page.getByText('删除', { exact: true }).last().click();
    await onlySession.waitFor({ state: 'detached' });

    assert.equal(await persona.locator('.eva-ai-team__session').count(), 0, '删空后不显示“新对话”或“新建会话”占位');
    assert.equal(await page.evaluate(id => window.EvaAITeam.getSnapshot().sessions.filter(session => session.identityId === id).length, fixture.id), 0);

    const systemTeam = page.locator('.eva-ai-team__team:has(.eva-ai-team__team-default)');
    await systemTeam.locator('.eva-ai-team__team-button').click();
    await identityButton.click();
    assert.equal(await identityButton.getAttribute('aria-expanded'), 'true', '空身份入口保持展开以承载首次创建结果');
    const editor = page.getByRole('textbox', { name: '发送给 ' + fixture.name, exact: true });
    await editor.fill('删空后的第一次消息');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    const createdSession = persona.locator('.eva-ai-team__session-row');
    await createdSession.waitFor();
    assert.equal(await createdSession.locator('.eva-ai-team__session-title').innerText(), '删空后的第一次消息');
    assert.equal(await page.evaluate(id => window.EvaAITeam.getSnapshot().sessions.filter(session => session.identityId === id).length, fixture.id), 1);

    await page.locator('[data-eva-nav-id="messages"]').click();
    await page.waitForURL('**/#/messages');
    // Wait for the intermediate mode to mount; URL changes precede React commits.
    await page.locator('.eva-ai-team__sidebar').waitFor({state:'hidden'});
    await page.locator('[data-eva-nav-id="my-ai"]').click();
    await page.waitForURL('**evaIM=my-ai');
    const restoredPersona = page.locator('.eva-ai-team__identity').filter({ hasText: fixture.name }).first();
    await restoredPersona.waitFor({state:'visible'});
    assert.equal(await restoredPersona.locator('.eva-ai-team__session-title').count(),0,'返回后身份会话遵循默认收起合同');
    await restoredPersona.locator('.eva-ai-team__identity-button').click();
    await restoredPersona.locator('.eva-ai-team__session-title').filter({hasText:'删空后的第一次消息'}).waitFor({state:'visible'});
    assert.equal(await restoredPersona.locator('.eva-ai-team__session-title').filter({ hasText: '删空后的第一次消息' }).count(), 1, '入口往返后新会话仍在所属分身下');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: '/tmp/eva-my-ai-empty-persona-session-1200.png' });
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
