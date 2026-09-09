import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { createPatchedRuntime } from '../tools/build-runtime.mjs';

const read = path => fs.readFileSync(path, 'utf8');

test('构建产物直接包含补丁后的运行时，浏览器不再现场改写源码', () => {
  const entry = read('index.html');
  const { source, patchOrder } = createPatchedRuntime();

  assert.deepEqual(patchOrder, ['im', 'general', 'sidebar', 'automation']);
  assert.ok(source.length > 18_000_000, '构建产物缺少 legacy runtime 主体');
  assert.match(entry, /<script type="module" src="vendor\/eva-runtime\.module\.js"><\/script>/);
  assert.doesNotMatch(entry, /009-[4-9]-/);
  assert.doesNotMatch(entry, /eva-legacy-runtime\.js/);
});

test('正式一级路由在原生 PanelRoute 中注册并位于兜底路由之前', () => {
  const { source } = createPatchedRuntime();
  const wildcardIndex = source.indexOf('path:"*"');

  for (const route of ['/contacts', '/drive']) {
    const routeIndex = source.indexOf(`path:"${route}"`);
    assert.ok(routeIndex >= 0, `${route} 未注册`);
    assert.ok(routeIndex < wildcardIndex, `${route} 位于兜底路由之后`);
  }
  assert.match(source, /EvaNativePage=\(\{pageId:/);
});

test('侧栏模式和唯一选中态完全由路由推导', () => {
  const { source } = createPatchedRuntime();

  for (const [route, selection] of [
    ['/contacts', 'contacts'],
    ['/drive', 'drive'],
  ]) {
    assert.ok(source.includes(`rt==="${route}"`), `${route} 未进入侧栏路由推导`);
    assert.ok(source.includes(`return"${selection}"`), `${selection} 未成为路由选中态`);
  }
  assert.doesNotMatch(source, /__evaSidebarOverlayNavId|eva:sidebar-select/);
});

test('个人 Eva 主入口进入 GDS 工作区且加号仅作提示', () => {
  const { source } = createPatchedRuntime();
  const hierarchy = read('prototype/021-message-hierarchy.js');
  const workspace = read('prototype/052-personal-eva-gds.js');

  assert.match(source, /EvaPersonalEntry=/);
  assert.doesNotMatch(source, /eva-personal-entry__plus|EvaPersonalPlusIcon/);
  assert.match(source, /case"new-chat":return React\.createElement\(EvaPersonalEntry,/);
  assert.match(source, /onClick:\(\)=>rt\.navigate\("\/guid"\)/);
  assert.doesNotMatch(source, /case"new-chat":return[^;]+SiderToolbar/);
  assert.doesNotMatch(hierarchy, /syncPersonalAssistantNav/);
  assert.match(workspace, /register\('personal'/);
  assert.equal(fs.existsSync('prototype/041-personal-conversation-columns.css'), false, '336px 会话中栏样式仍然存在');
  assert.equal(fs.existsSync('prototype/042-personal-conversation-columns.js'), false, '336px 会话中栏脚本仍然存在');
});

test('个人 Eva 助理与对话只渲染在路由页中间栏', () => {
  const { source } = createPatchedRuntime();
  const imPatch = read('prototype/009-5-patch-im.js');
  const convergenceCss = read('prototype/043-final-layout-convergence.css');
  const workspace = read('prototype/052-personal-eva-gds.js');

  assert.doesNotMatch(imPatch, /eva-my-ai-sidebar-actions/);
  assert.match(imPatch, /eva-ai-team__new-session/);
  assert.match(imPatch, /identity\?\.id===i\.id\?' is-active'/);
  assert.match(imPatch, /content:'新建会话'/);
  assert.doesNotMatch(imPatch, /Dropdown\.Item,\{onClick:\(\)=>newConversation\(i\.id\)\},'新建会话'/);
  assert.doesNotMatch(imPatch, /Dropdown\.Item,\{onClick:\(\)=>openDetails\(i\.id\)\},'查看配置'/);
  assert.doesNotMatch(imPatch, /TooltipComponent,\{position:'right',content:'查看配置'/);
  assert.doesNotMatch(imPatch, /eva-ai-team__relation/);
  assert.doesNotMatch(imPatch, /const LinkIcon=/);
  assert.doesNotMatch(imPatch, /const openDetails =/);
  assert.doesNotMatch(imPatch, /presentation:'ai-team-workspace'/);
  assert.match(imPatch, /function assistantConfigAction\(i\)\{\s*if\(i\.role!=='assistant'\)return null/);
  assert.match(imPatch, /content:'编辑配置'.+role:'assistant',id:i\.sourceAssistantId,returnFocus:event\.currentTarget/s);
  assert.match(imPatch, /const open=options=>setRequest\(options\?\{\.\.\.options,key:Date\.now\(\)\}:null\)/);
  assert.match(imPatch, /className:'eva-ai-team__identity-action eva-ai-team__edit-config'/);
  assert.match(imPatch, /target\.isConnected&&target\.focus\(\)/);
  assert.match(imPatch, /window\.__evaOpenAssistantEditor\?\.\(null\)/);
  assert.match(imPatch, /if\(identity\?\.id!==i\.id\)choose\(i\.id,sessions\[0\]\?\.id\|\|null\)/);
  assert.match(imPatch, /collapsedGroups/);
  assert.match(imPatch, /roleGroup\('assistant','个人助理'/);
  assert.match(imPatch, /roleGroup\('persona','云端分身',personas\)/);
  assert.match(imPatch, /roleGroup\('digital','数字员工',digitalEmployees\)/);
  assert.match(imPatch, /className:'eva-ai-team__sidebar-header'.+h\('h1',null,'我的 AI'\)/s);
  assert.match(imPatch, /'新建 AI 团队'.+'新建个人助理'/s);
  assert.match(imPatch, /sectionTitle\('teams','AI 团队'.+sectionTitle\('assistants','AI 助理'/s);
  assert.match(imPatch, /sectionTitle\('teams','AI 团队'.+Users\)/s);
  assert.match(imPatch, /sectionTitle\('assistants','AI 助理'.+Sparkles\)/s);
  assert.match(imPatch, /const \[sectionCollapsed,setSectionCollapsed\]=reactExports\.useState\(\{teams:false,assistants:false\}\)/);
  assert.match(imPatch, /'aria-expanded':!collapsed,'aria-controls':contentId/);
  assert.match(imPatch, /type:'file',hidden:true,accept:'image\/png,image\/jpeg,image\/webp'/);
  assert.match(imPatch, /const reader=new FileReader\(\)/);
  assert.match(imPatch, /avatar\?'更换团队头像':'上传团队头像'/);
  assert.doesNotMatch(imPatch, /粘贴头像图片地址/);
  assert.match(imPatch, /className:'eva-ai-team-editor__selected-avatar'.+EvaAIIdentity\.avatar\(item\.appearance,28,h\).+className:'eva-ai-team-editor__selected-name'/s);
  assert.doesNotMatch(read('prototype/046-ai-team.css'), /\.eva-ai-team-editor__selected-item\s*>\s*span/);
  assert.match(imPatch, /teamGroups\.map\(teamGroupItem\)/);
  assert.match(imPatch, /className:'eva-ai-team__team-default'\},'默认'/);
  assert.match(imPatch, /className:'eva-ai-team__group-count'/);
  assert.doesNotMatch(imPatch, /Math\.max\(0,channel\.members-1\)/);
  assert.match(imPatch, /EvaAIIdentityAvatar.+eva-ai-team__identity-name.+AiBadge.+eva-ai-team__chevron/s);
  assert.match(imPatch, /EvaAIIdentityAvatar,\{appearance:evaIdentityAppearance\(i\),size:22\}/);
  assert.match(imPatch, /EvaAIIdentity\.avatar\(digitalStore\.appearance\(item\),22,h\)/);
  assert.match(imPatch, /h\(ChevronRight,\{size:12,className:'eva-ai-team__chevron'/);
  assert.match(imPatch, /Sa\.identityId\?React.createElement\("span",\{className:"eva-identity-name-row"\}.+Sa\.name.+AiBadge/);
  assert.doesNotMatch(imPatch, /className:"wk-chat-conversation-header-thread-name",title:Sa\.sessionTitle/);
  assert.match(imPatch, /AI topic keeps direct title/);
  assert.doesNotMatch(source, /EvaPersonalWorkspacePanel|EvaPersonalAssistantFolder/);
  assert.doesNotMatch(source, /eva-personal-sider-panel|eva-personal-sidebar-actions/);
  assert.match(workspace, /assistantRailHTML/);
  assert.match(workspace, /eva-personal-sider-panel/);
  assert.doesNotMatch(workspace, /data-eva-create-folder/);
  assert.match(workspace, /浏览本地目录\.\.\./);
  assert.match(workspace, /window\.showDirectoryPicker/);
  assert.match(workspace, /data-eva-new-folder-chat/);
  assert.match(workspace, /data-eva-toggle-folder/);
  assert.doesNotMatch(workspace, /创建助理|data-eva-edit-assistant|data-eva-selected-assistant/);
  assert.doesNotMatch(source, /eva-personal-assistant-heading/);
  assert.doesNotMatch(convergenceCss, /eva-personal-sider-panel__tab/);
  assert.match(workspace, /eva-personal-sider-panel__body/);
  assert.doesNotMatch(workspace, /eva-personal-sider-panel__history/);
  assert.match(workspace, /__EVA_PERSONAL_CONVERSATIONS/);
  assert.match(workspace, /#\/conversation\//);
  assert.match(convergenceCss, /--eva-conversation-rail-width:\s*260px/);
  assert.match(convergenceCss, /width:\s*var\(--eva-conversation-rail-current\)/);
  assert.match(convergenceCss, /\.eva-msg \.ch-list,\s*\n\s*\.eva-personal-sider-panel/);
  assert.match(convergenceCss, /background:\s*var\(--eva-conversation-rail-bg\)/);
  assert.match(workspace, /data-eva-conversation-rail-resizer/);
  assert.match(imPatch, /className:'eva-ai-team__sidebar'/);
  assert.match(imPatch, /'data-eva-conversation-rail-resizer':true/);
  assert.match(imPatch, /shared conversation rail resizer/);
  assert.match(convergenceCss, /\.eva-ai-team__sidebar/);
  assert.match(convergenceCss, /width:\s*var\(--eva-conversation-rail-current\)/);
});

test('个人会话详情由数据仓驱动，并通过会话路由恢复对应内容', () => {
  const assistants = read('prototype/046-personal-assistants.js');
  const workspace = read('prototype/052-personal-eva-gds.js');

  assert.match(assistants, /'__EVA_PERSONAL_CONVERSATIONS'/);
  for (const title of ['UI设计师发展前景的PPT', '整理本周会议结论', '帮我改写产品说明', 'Eva 前端联调排期', '接口回归清单']) {
    assert.match(assistants, new RegExp(`title: '${title}'`));
  }
  assert.match(workspace, /conversationForId/);
  assert.match(workspace, /syncRouteState/);
  assert.match(workspace, /historyConversationHTML/);
  assert.match(workspace, /#\/conversation\//);
});

test('消息关注中的群聊可双击收缩子区并显示状态指示', () => {
  const imPatch = read('prototype/009-5-patch-im.js');
  const hierarchyCss = read('prototype/016-message-hierarchy.css');

  assert.match(imPatch, /onDoubleClick:Dt=>\{xt&&/);
  assert.match(imPatch, /wk-conv-compact-thread-toggle/);
  assert.match(imPatch, /threadsExpanded:Zi/);
  assert.match(hierarchyCss, /wk-conv-compact-thread-toggle\.is-collapsed/);
  assert.match(hierarchyCss, /--eva-space-group-indent:\s*12px/);
  assert.match(hierarchyCss, /--eva-space-thread-indent:\s*12px/);
  assert.match(hierarchyCss, /padding-inline-start:\s*calc\(var\(--eva-space-group-indent\) - var\(--gds-space-0-5\)\)/);
});

test('所有子区入口统一使用圆形气泡折角箭头图标', () => {
  const imPatch = read('prototype/009-5-patch-im.js');
  const { source } = createPatchedRuntime();

  assert.match(imPatch, /统一子区图标/);
  assert.match(source, /ThreadIcon=createLucideIcon\("message-circle-arrow-down-right"/);
  for (const path of [
    'M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719',
    'M8.5 8.5V11a3 3 0 0 0 3 3h5',
    'm14 11.5 2.5 2.5-2.5 2.5',
  ]) assert.ok(source.includes(`d:"${path}"`), `统一子区图标缺少路径 ${path}`);
  assert.doesNotMatch(source, /ThreadIcon=\(\{size:/);
  assert.match(source, /title:"创建子区",icon:React\.createElement\(ThreadIcon,\{size:18\}\)/);
  assert.match(source, /wk-thread-created-link"\},React\.createElement\(ThreadIcon,\{size:14/);
  assert.doesNotMatch(source, /wk-thread-created-link"\},"🧵"/);
});

test('消息内嵌项目隐藏群聊标签并在会话选择时返回群聊', () => {
  const imPatch = read('prototype/009-5-patch-im.js');
  const hierarchyCss = read('prototype/016-message-hierarchy.css');

  assert.match(hierarchyCss, /eva-inline-project-panel[\s\S]+collab-tab:nth-child\(2\)\s*\{\s*display:\s*none/);
  assert.doesNotMatch(imPatch, /eva-inline-project-panel__head|返回群聊/);
  assert.doesNotMatch(hierarchyCss, /eva-inline-project-panel__(?:head|back|title)/);
  assert.match(imPatch, /La=ci=>\{setEvaInlineProjectId\(null\),xt\(ci\),Nt\(null\)/);
  assert.match(imPatch, /Za=\(ci,Zi\)=>\{setEvaInlineProjectId\(null\),xt\(ci\),Nt\(Zi\)/);
});

test('点击群聊内容区会关闭已打开的子区、聊天信息或文件预览面板', () => {
  const imPatch = read('prototype/009-5-patch-im.js');

  assert.match(imPatch, /ch-main__stream",onClick:ci=>\{\(Mt===\"threads\"\|\|Mt===\"info\"\|\|Mt===\"file\"\)&&!ci\.target\.closest\?\.\(\"\.wk-messageinput-box, \.wk-contextmenus, \.wk-message-file\"\)/);
});

test('团队消息和我的 AI 的第二栏使用同一套 GDS 文字层级', () => {
  const hierarchyCss = read('prototype/016-message-hierarchy.css');
  const aiTeamCss = read('prototype/046-ai-team.css');
  const messageSwitcherCss = read('prototype/039-team-message-project-recent.css');
  const imPatch = read('prototype/009-5-patch-im.js');

  assert.match(hierarchyCss, /--gds-type-label-medium-font-size/);
  for (const css of [hierarchyCss, aiTeamCss]) {
    assert.match(css, /--gds-type-label-font-size/);
    assert.match(css, /--gds-type-caption-font-size/);
  }
  assert.match(hierarchyCss, /wk-category-header__name\s*\{[^}]*font-size:\s*var\(--gds-type-label-medium-font-size\)[^}]*font-weight:\s*var\(--gds-font-weight-medium\)/s);
  assert.match(hierarchyCss, /eva-space-card \.wk-category-header\s*\{[^}]*width:\s*100%[^}]*margin-inline-start:\s*0[^}]*gap:\s*var\(--gds-space-1\)/s);
  assert.match(hierarchyCss, /wk-category-header__arrow\s*\{[^}]*width:\s*var\(--gds-icon-size-chevron\)[^}]*margin-right:\s*0/s);
  assert.match(hierarchyCss, /wk-category-header__arrow svg\s*\{[^}]*width:\s*var\(--gds-icon-size-chevron\)[^}]*height:\s*var\(--gds-icon-size-chevron\)/s);
  assert.match(hierarchyCss, /wk-category-header__arrow\s*\{[^}]*transform:\s*none/s);
  assert.match(hierarchyCss, /wk-category-header__arrow--collapsed\s*\{[^}]*transform:\s*none/s);
  assert.match(imPatch, /项目一级分组使用共享 Lucide 折叠箭头/);
  assert.match(imPatch, /React\.createElement\(ChevronRight,\{size:12,className:"eva-ai-team__group-chevron"\+\(mt\?"":" is-expanded"\),"aria-hidden":true\}\)/);
  assert.match(hierarchyCss, /wk-conv-compact-item--thread \.wk-conv-compact-name\s*\{[^}]*font-size:\s*var\(--gds-type-label-font-size\)[^}]*font-weight:\s*var\(--gds-font-weight-regular\)/s);
  assert.match(aiTeamCss, /eva-ai-team__group-title\s*\{[^}]*font-size:\s*13px[^}]*line-height:\s*1\.5[^}]*font-weight:\s*var\(--gds-font-weight-semibold\)/s);
  assert.match(aiTeamCss, /eva-ai-team__session-title\s*\{[^}]*font-size:\s*var\(--eva-rail-label-size\)[^}]*font-weight:\s*var\(--gds-font-weight-regular\)/s);
  assert.match(aiTeamCss, /--eva-rail-level-indent:\s*12px/);
  assert.match(aiTeamCss, /--eva-rail-identity-content-inset:\s*13px/);
  assert.match(aiTeamCss, /eva-ai-team__identity-button\s*\{[^}]*padding:\s*0 0 0 var\(--eva-rail-identity-content-inset\)/s);
  assert.match(aiTeamCss, /eva-ai-team__team-threads \.wk-conv-compact-item--thread\s*\{[^}]*padding-left:\s*calc\(var\(--eva-rail-identity-content-inset\) \+ var\(--eva-rail-level-indent\)\)/s);
  assert.match(aiTeamCss, /--eva-rail-identity-avatar-size:\s*22px/);
  assert.match(aiTeamCss, /--eva-rail-session-indent:\s*calc\(var\(--eva-rail-identity-avatar-size\) \+ var\(--gds-space-2\) \+ var\(--eva-rail-level-indent\)\)/);
  assert.match(aiTeamCss, /--eva-rail-secondary:\s*var\(--gds-color-text-secondary\)/);
  assert.match(aiTeamCss, /--eva-rail-hover:\s*var\(--gds-color-overlay-hover\)/);
  assert.match(aiTeamCss, /--eva-rail-selected:\s*var\(--gds-color-surface-hover\)/);
  assert.match(aiTeamCss, /--eva-rail-group-hover:\s*var\(--gds-color-overlay-hover\)/);
  assert.match(aiTeamCss, /--eva-rail-group-radius:\s*7px/);
  assert.match(aiTeamCss, /--eva-rail-primary-row-radius:\s*var\(--wk-r-xs, 3px\)/);
  assert.match(aiTeamCss, /--eva-rail-nested-row-radius:\s*var\(--wk-r-xs, 3px\)/);
  assert.match(aiTeamCss, /eva-ai-team__identity-heading:hover,[^}]*eva-ai-team__identity-heading:focus-within\s*\{\s*background:\s*var\(--eva-rail-hover\)/s);
  assert.match(aiTeamCss, /eva-ai-team__session-row\.is-selected,[^}]*eva-ai-team__session-row\.is-selected:hover\s*\{[^}]*background:\s*var\(--eva-rail-selected\)[^}]*box-shadow:\s*none/s);
  assert.match(aiTeamCss, /eva-ai-team__chevron\s*\{[^}]*flex:\s*0 0 12px/s);
  assert.match(aiTeamCss, /eva-ai-team__chevron\.is-expanded\s*\{\s*transform:\s*rotate\(90deg\)/);
  assert.match(aiTeamCss, /eva-ai-team__role-group \+ \.eva-ai-team__role-group\s*\{[^}]*margin-top:\s*6px[^}]*\}/s);
  assert.match(aiTeamCss, /eva-ai-team__sidebar-header\s*\{[^}]*padding:\s*var\(--gds-space-2\) var\(--gds-space-3\)/s);
  assert.match(aiTeamCss, /eva-ai-team__roles\s*\{[^}]*padding:\s*var\(--gds-space-2\) var\(--gds-space-2-5\) var\(--gds-space-3\)/s);
  assert.match(aiTeamCss, /eva-ai-team__sidebar-header \.semi-button\s*\{[^}]*height:\s*34px/s);
  assert.match(messageSwitcherCss, /wk-sidebar-tabbar\[data-eva-project-recent-switcher="true"\]\s*\{[^}]*padding:\s*var\(--gds-space-3\)/s);
  assert.match(messageSwitcherCss, /wk-sidebar-tabbar__container\s*\{[^}]*height:\s*34px[^}]*padding:\s*0/s);
  assert.match(messageSwitcherCss, /wk-sidebar-tabbar__btn\s*\{[^}]*min-height:\s*34px/s);
  assert.match(messageSwitcherCss, /eva-msg \.ch-list__top\s*\{[^}]*display:\s*none/s);
  assert.match(imPatch, /EvaAIIdentityAvatar,\{appearance:evaIdentityAppearance\(i\),size:22\}/);
  assert.match(imPatch, /EvaAIIdentity\.avatar\(digitalStore\.appearance\(item\),22,h\)/);
});

test('我的 AI 顶层分区标题与角色分组使用不同视觉层级', () => {
  const aiTeamCss = read('prototype/046-ai-team.css');
  assert.match(aiTeamCss, /\.eva-ai-team__section-title\s*\{[^}]*min-height:\s*40px[^}]*background:\s*transparent/s);
  assert.doesNotMatch(aiTeamCss.match(/\.eva-ai-team__section-title\s*\{[^}]*\}/s)?.[0]||'', /box-shadow|border-radius/);
  assert.match(aiTeamCss, /\.eva-ai-team__section-icon\s*\{[^}]*width:\s*20px[^}]*color:\s*var\(--gds-color-text-secondary\)/s);
  assert.match(aiTeamCss, /\.eva-ai-team__section-count\s*\{[^}]*color:\s*var\(--eva-rail-time\)[^}]*text-align:\s*right/s);
  assert.match(aiTeamCss, /\.eva-ai-team__group-toggle\s*\{[^}]*min-height:\s*32px[^}]*background:\s*transparent/s);
  assert.doesNotMatch(aiTeamCss, /\.eva-ai-team__team-heading:has\([^)]*\)[^{]*\.eva-ai-team__group-count/);
});

test('我的 AI 团队父群将子区展开与进入会话拆分为两个键盘按钮', () => {
  const imPatch = read('prototype/009-5-patch-im.js');
  const aiTeamCss = read('prototype/046-ai-team.css');
  const start = imPatch.indexOf('function teamGroupItem(group)');
  const end = imPatch.indexOf('const personas=', start);
  const teamGroupItem = imPatch.slice(start, end);
  const toggleStart = teamGroupItem.indexOf("h('button',{type:'button',className:'eva-ai-team__team-toggle'");
  const conversationStart = teamGroupItem.indexOf("h('button',{type:'button',className:'eva-ai-team__team-button'");
  const toggleButton = teamGroupItem.slice(toggleStart, conversationStart);
  const conversationButton = teamGroupItem.slice(conversationStart, teamGroupItem.indexOf("h('img'", conversationStart));

  assert.ok(start >= 0 && end > start, '未找到 AI 团队父群渲染函数');
  assert.ok(toggleStart >= 0 && conversationStart > toggleStart, '展开按钮与父群会话按钮未独立渲染');
  assert.match(toggleButton, /'aria-label':\(expanded\?'收起':'展开'\)\+' '\+group\.name\+' 子区'/);
  assert.match(toggleButton, /'aria-expanded':expanded/);
  assert.match(toggleButton, /'aria-controls':threadsId/);
  assert.match(toggleButton, /onClick:\(\)=>setCollapsed/);
  assert.doesNotMatch(toggleButton, /choose\(/);
  assert.match(conversationButton, /'aria-label':'进入团队会话 '\+group\.name/);
  assert.match(conversationButton, /'aria-current':selected&&!selection\.sessionId\?'true':undefined/);
  assert.match(conversationButton, /onClick:\(\)=>choose\(group\.id,null\)/);
  assert.doesNotMatch(conversationButton, /'aria-expanded'|setCollapsed/);
  assert.match(aiTeamCss, /\.eva-ai-team__team-toggle\s*\{[^}]*min-height:\s*var\(--eva-rail-identity-height\)[^}]*cursor:\s*pointer/s);
  assert.match(aiTeamCss, /\.eva-ai-team__team-toggle:focus-visible,[\s\S]*\.eva-ai-team__team-button:focus-visible\s*\{[^}]*outline:/s);
});

test('个人文件夹与对话使用统一 Hover、选中及公共 Lucide 图标', () => {
  const workspace = read('prototype/052-personal-eva-gds.js');
  const convergence = read('prototype/043-final-layout-convergence.css');
  assert.match(workspace, /icon\('folder',18/);
  assert.match(convergence, /eva-personal-thread:hover[^}]*var\(--eva-overlay-hover\)/s);
  assert.match(convergence, /eva-personal-thread\.is-selected[^}]*var\(--eva-overlay-hover\)/s);
  assert.match(workspace, /aria-current="page"/);
  assert.doesNotMatch(convergence, /eva-personal-folder\.is-current/);
});

test('个人仅创建文件夹与对话，移除助理创建和编辑入口', () => {
  const workspace = read('prototype/052-personal-eva-gds.js');
  const convergence = read('prototype/044-final-layout-convergence.js');
  assert.doesNotMatch(workspace, /evaCreate=mine|data-eva-edit-assistant|selectedAssistantId/);
  assert.doesNotMatch(convergence, /openAssistantEditor|data-eva-edit-assistant/);
  assert.match(workspace, /window\.EvaPersonal\.createFolder/);
  assert.match(workspace, /window\.EvaPersonal\.moveConversation/);
  assert.match(workspace, /window\.EvaPersonal\.renameConversation/);
});

test('我的 AI 位于个人导航并复用个人助理创建流程', () => {
  const sider = read('prototype/009-7-patch-sider.js');
  const imPatch = read('prototype/009-5-patch-im.js');
  const creator = read('prototype/047-digital-employees.js');
  const runtime = createPatchedRuntime().source;

  assert.match(sider, /EVA_PERSONAL_NAV=Object\.freeze\(\["new-chat","my-ai","workboard","automation","connection-center"\]\)/);
  assert.match(sider, /EVA_TEAM_NAV=Object\.freeze\(\["messages","projects","contacts","drive","sites"\]\)/);
  assert.match(sider, /rt==="\/messages"&&ut\.get\("evaIM"\)==="my-ai"\)return"personal"/);
  assert.match(runtime, /LABEL\$1="我的消息",SiderMessagesEntry=/);
  assert.match(sider, /case"my-ai":return.+SiderEvaStub,\{label:"我的Agent"/);
  assert.match(runtime, /LABEL\$2="我的项目",SiderCollabEntry=/);
  assert.match(sider, /React\.cloneElement\(bt,\{label:"我的Agent"\}\)/);
  assert.doesNotMatch(sider, /label:"我的 AI"/);
  assert.match(imPatch, /className:'eva-ai-team__sidebar-header'.+h\('h1',null,'我的 AI'\)/s);
  assert.match(imPatch, /evaReturn=%2Fmessages%3FevaIM%3Dmy-ai/);
  assert.match(sider, /returnTo=evaCreatorParams\.get\("evaReturn"\)/);
  assert.match(creator, /returnTo\?navigate\(returnTo\):navigatePersonal/);
});

test('一级页面只挂入路由宿主，不再追加到 document.body', () => {
  const files = [
    'prototype/020-mode-layer.js',
    'prototype/021-message-hierarchy.js',
    'prototype/025-demo-0902-v2-pages.js',
    'prototype/029-connection-center-v2-functional.js',
    'prototype/044-final-layout-convergence.js',
    'prototype/052-personal-eva-gds.js',
  ];
  const source = files.map(read).join('\n');

  assert.doesNotMatch(source, /document\.body\.appendChild\((?:root|page|center)\)/);
  assert.doesNotMatch(source, /document\.body\.insertAdjacentHTML\([^,]+,\s*build(?:Workboard|Automation)\(/);
  assert.doesNotMatch(source, /stopImmediatePropagation\(\)/);
  assert.match(createPatchedRuntime().source, /path:"\/contacts",element:React\.createElement\(EvaContactsPage,null\)/);
  assert.doesNotMatch(source, /__evaNativePages\.register\(['"]contacts['"]/);
  for (const pageId of ['drive', 'workboard', 'connection-center', 'personal']) {
    assert.match(source, new RegExp(`__evaNativePages\\.register\\(['"]${pageId}['"]`));
  }
});

test('迁移后的一级页面不再保留 DOM 导航状态或浏览器补丁加载器', () => {
  const hierarchy = read('prototype/021-message-hierarchy.js');
  const drive = read('prototype/020-mode-layer.js');
  const recent = read('prototype/009-5-patch-im.js');
  const connectionCenter = read('prototype/029-connection-center-v2-functional.js');

  assert.equal(fs.existsSync('prototype/009-9-loader.js'), false, '浏览器补丁加载器仍然存在');
  assert.doesNotMatch(hierarchy, /sync(?:Overview|Contacts|DriveShell)Selection|build(?:Overview|Contacts)Nav/);
  assert.doesNotMatch(drive, /driveNav\.classList\.(?:add|remove)\('is-active'\)/);
  assert.equal(fs.existsSync('prototype/040-team-message-project-recent.js'), false);
  assert.match(recent, /EvaFollowList/);
  assert.match(recent, /Cn===\"recent\"/);
  assert.doesNotMatch(connectionCenter, /new MutationObserver|centerOpen|setCenterOpen/);
});

test('GDS 经语义 token 与组件适配层进入，业务层不写原始色值', () => {
  const tokens = read('prototype/047-gds-tokens.css');
  const reroot = read('prototype/049-gds-brand-reroot.css');
  const workspaceCss = read('prototype/051-personal-eva-gds.css');

  assert.match(tokens, /--eva-font-sans:\s*"PingFang SC"/);
  assert.match(tokens, /--eva-action-primary:\s*var\(--eva-c-brand-blue\)/);
  assert.match(tokens, /--eva-c-brand-blue:\s*#1563eb/);
  // 改根层把项目既有的品牌槽位接到 GDS 主色上，而不是逐条覆盖 .semi-* 规则。
  assert.match(reroot, /--wk-brand-primary:\s*var\(--eva-action-primary\)/);
  assert.doesNotMatch(workspaceCss, /#[0-9a-fA-F]{3,8}\b/, '051 出现了十六进制字面量');
});

test('项目内项目信息位于项目设置前并展示核心项目档案', () => {
  const patch = read('prototype/009-6-patch-general.js');
  const projectCss = read('prototype/036-project-directory-v3.css');
  const { source } = createPatchedRuntime();

  assert.match(patch, /eva-project-directory-actions/);
  assert.match(patch, /eva-project-directory-search/);
  assert.match(patch, /evaFilteredPinnedProjects/);
  assert.match(patch, /evaFilteredProjects/);
  assert.doesNotMatch(patch, /eva-project-directory-hero/);
  assert.match(projectCss, /\.eva-project-info\s*\{[^}]*height:\s*100%[^}]*overflow-y:\s*auto/s);
  assert.match(patch, /key:\"project-info\",label:\"项目信息\"\},\{key:\"settings\",label:\"项目设置\"/);
  assert.match(source, /case\"project-info\":return React\.createElement\(EvaProjectInfoPage/);
  for (const section of ['项目背景', '项目目标', '项目周期', '关键里程碑']) {
    assert.ok(source.includes(section), `项目信息缺少：${section}`);
  }
  assert.doesNotMatch(source, /协作范围/);
  assert.doesNotMatch(source, /关键协作人/);
  assert.match(source, /evaMeta\.period\.start,evaMeta\.period\.end/);
  assert.match(projectCss, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
});

test('个人 Eva 六态挂在路由宿主内，不使用全屏或 fixed 根节点', () => {
  const workspace = read('prototype/052-personal-eva-gds.js');
  const workspaceCss = read('prototype/051-personal-eva-gds.css');

  for (const state of ['home', 'input', 'skill-picker', 'operation', 'generating', 'completed']) {
    assert.ok(workspace.includes(`'${state}'`), `缺少 GDS 页面态：${state}`);
    assert.ok(
      workspaceCss.includes(`[data-eva-state="${state}"]`),
      `缺少 ${state} 的态选择器`,
    );
  }
  assert.match(workspace, /window\.__evaPersonalState/);
  assert.doesNotMatch(workspaceCss, /position:\s*fixed/);
});

test('个人 Eva GDS 设计采用规范首页、原生输入和单一生命周期', () => {
  const workspace = read('prototype/052-personal-eva-gds.js');
  const workspaceCss = read('prototype/051-personal-eva-gds.css');
  const componentCss = read('prototype/048-gds-components.css');
  for (const text of ['AI随行', '工作随心', '调用技能与指令', '星睿智能体', '邮件操作', '数据分析', '技能开发', '知识助手']) {
    assert.ok(workspace.includes(text), `GDS 首页缺少：${text}`);
  }
  assert.doesNotMatch(workspace, /百万亿Token激励计划|eva-personal-workspace__campaign/);
  assert.match(workspace, /<textarea class="eva-composer-prompt"/);
  assert.match(workspace, /event\.isComposing/);
  assert.doesNotMatch(workspace, /data-eva-selected-assistant/);
  assert.match(workspace, /heroHTML\(\) \+ '<div class="eva-personal-workspace__composer">'/);
  assert.match(workspace, /\+ '<\/div><\/div>' \+ railHTML\(\) \+ '<\/div><\/div>';/);
  assert.match(workspace, /state === 'completed' \? '' : assistantRailHTML\(\)/);
  assert.match(workspace, /aria-activedescendant/);
  assert.match(workspace, /if \(hash\.indexOf\('#\/guid'\) === 0\) \{\s*selectedConversation = '';/);
  assert.match(workspaceCss, /width: min\(100%, var\(--eva-main-col-w\)\)/);
  assert.match(componentCss, /\.eva-composer-wrap\s*\{[^}]*width:\s*var\(--eva-main-col-w\);[^}]*height:\s*166px;/s);
  assert.match(componentCss, /\.eva-composer\s*\{[^}]*width:\s*768px;[^}]*height:\s*118px;/s);
  assert.match(workspaceCss, /\.eva-personal-workspace__hero\s*\{[^}]*height:\s*48px;/s);
  assert.match(workspaceCss, /\.eva-personal-workspace__composer\s*\{[^}]*margin-top:\s*var\(--eva-space-1\)/s);
});

test('侧栏展开默认宽度为 180、折叠宽度为 80 且不渲染广告栏', () => {
  const { source } = createPatchedRuntime();

  assert.match(source, /DEFAULT_SIDER_WIDTH=180,DESKTOP_COLLAPSED_WIDTH=80,SIDER_MIN_WIDTH=200/);
  assert.doesNotMatch(source, /eva-promo-banner|打造王牌Skill|瓜分万元奖金池/);
  assert.doesNotMatch(source, /DEFAULT_SIDER_WIDTH=248/);
  assert.doesNotMatch(source, /EvaPersonalWorkspacePanel=/);
  assert.match(source, /minWidth:DEFAULT_SIDER_WIDTH/);
  assert.match(source, /collapseThreshold:SIDER_MIN_WIDTH/);
  assert.match(source, /if\(Mt&&oa<St&&!xt\)/);
  assert.match(source, /if\(ra!==null\?Mt&&ra<St&&!xt:hr\)/);
  assert.match(source, /eva-sider-resize-handle/);
  assert.match(source, /onDoubleClick:\(\)=>\{if\(Kt\?\.includes\("eva-sider-resize-handle"\)\)/);
  // 连接中心图标改用 createLucideIcon，不再手写内联 svg（AGENTS.md:151）。
  assert.match(source, /EvaConnectionCenterIcon=createLucideIcon\("unplug",/);
});

test('折叠侧栏只承载一级导航并保持可滚动', () => {
  const { source } = createPatchedRuntime();

  // vendor 宿主 .flex-1.min-h-0.overflow-hidden 会裁掉一切溢出，而三段导航都是
  // shrink-0：折叠态 11 个 entry 各 56px + 3 个分组标题实测 700px > 宿主 662px。
  // 所以注入内容必须自己套一层 flex-1 min-h-0 overflow-y-auto 的滚动容器。
  assert.match(
    source,
    /React\.createElement\("div",\{className:classNames\("flex-1 min-h-0 flex flex-col gap-2px overflow-y-auto",siderStyles\.scrollArea\)\},React\.createElement\(EvaSidebarNavigation,/
  );
  assert.doesNotMatch(source, /WorkspaceGroupedHistory\$1,\{\.\.\.pr\}/);
  assert.doesNotMatch(source, /EvaPersonalWorkspacePanel/);
});

test('--topbar-height 全库只定义一次，浮层不再回退到 2.6rem', () => {
  const roots = ['prototype', 'review', 'index.html'];
  const files = [];
  const walk = target => {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) fs.readdirSync(target).forEach(name => walk(`${target}/${name}`));
    else if (/\.(css|js|mjs|html)$/.test(target)) files.push(target);
  };
  roots.forEach(walk);

  const definitions = files.flatMap(file => {
    const hits = read(file).match(/--topbar-height\s*:/g) || [];
    return hits.map(() => file);
  });
  assert.deepEqual(definitions, ['prototype/049-gds-brand-reroot.css']);
  for (const file of files) {
    assert.doesNotMatch(read(file), /--topbar-height\s*,\s*2\.6rem/, `${file} 仍在回退到 2.6rem`);
  }
});
