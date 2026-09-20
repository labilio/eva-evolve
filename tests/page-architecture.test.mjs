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
  const chatSettings = read('prototype/009-2-chat-settings.js');
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
  assert.match(imPatch, /const openAssistantConfig=\(item,returnFocus\)=>window\.__evaOpenAssistantEditor/);
  assert.match(imPatch, /const openIdentityMenu=\(event,item,digital=false\)=>/);
  assert.match(imPatch, /item\.role==='assistant'.+title:'编辑配置'.+openAssistantConfig\(item,identityMenuOpener\.current\)/s);
  assert.match(imPatch, /const open=options=>setRequest\(options\?\{\.\.\.options,key:Date\.now\(\)\}:null\)/);
  assert.match(imPatch, /className:'eva-ai-team__assistant-avatar','aria-label':'编辑配置 '/);
  assert.match(imPatch, /h\(IdentityContextMenus,\{ref:identityMenuRef,menus:identityMenus\}\)/);
  assert.doesNotMatch(imPatch, /eva-ai-team__edit-config/);
  assert.match(imPatch, /target\.isConnected&&target\.focus\(\)/);
  assert.match(imPatch, /window\.__evaOpenAssistantEditor\?\.\(null\)/);
  assert.match(imPatch, /const \[showAllIdentitySessions,setShowAllIdentitySessions\]=reactExports\.useState/);
  assert.match(imPatch, /const newConversation = id => choose\(id,digitalEmployees\.some/);
  assert.match(imPatch, /'aria-label':'新建会话 '\+i\.name.+onClick:\(\)=>newConversation\(i\.id\)/s);
  assert.match(imPatch, /visibleSessions=showAll\?sessions:sessions\.slice\(0,3\), hasMore=sessions\.length>3/);
  assert.match(imPatch, /sessions\.length>0&&h\('div',\{className:'eva-ai-team__sessions'/);
  assert.doesNotMatch(imPatch, /emptyPersona|sessions\.length===0&&.*新建会话/);
  assert.doesNotMatch(imPatch, /identity\?\.id!==i\.id\)choose\(i\.id/);
  assert.match(imPatch, /collapsedGroups/);
  assert.match(imPatch, /roleGroup\('assistant','个人助理'/);
  assert.match(imPatch, /roleGroup\('persona','云端分身',personas\)/);
  assert.match(imPatch, /roleGroup\('digital','数字员工',digitalEmployees\)/);
  assert.match(imPatch, /className:'eva-ai-team__sidebar-header eva-rail-header'.+h\('h1',null,'我的 Agent'\)/s);
  assert.match(imPatch, /'新建 AI 团队'.+'新建个人助理'/s);
  assert.match(imPatch, /const openPersonalAssistant=\(\)=>window\.__evaOpenAssistantEditor\?\.\(\{mode:'create',role:'assistant',returnFocus:groupEditorOpener\.current\}\)/);
  assert.doesNotMatch(imPatch, /evaCreate=mine&evaReturn=/);
  assert.doesNotMatch(imPatch, /function sectionTitle\(|sectionCollapsed|setSectionCollapsed/);
  assert.match(imPatch, /className:'eva-ai-team__teams'.+className:'eva-ai-team__list-divider',role:'separator'.+className:'eva-ai-team__direct-groups'/s);
  assert.doesNotMatch(imPatch, /type:'file',[^)]*accept:'image\//);
  assert.doesNotMatch(imPatch, /new FileReader\(\)/);
  assert.doesNotMatch(imPatch, /更换团队头像|上传团队头像/);
  assert.match(imPatch, /'aria-label':draft\.avatar\?'更换助理头像':'选择助理头像图标'/);
  assert.match(imPatch, /className:'eva-editor-avatar-button'.+setIconOpen/s);
  assert.doesNotMatch(imPatch, /头像图片地址|粘贴头像图片地址/);
  assert.match(imPatch, /if\(persona\)tabs\.push\(\['collaboration','协作'/);
  assert.doesNotMatch(imPatch, /\['skills','技能'.+\],\['collaboration','协作'/);
  assert.match(imPatch, /h\(evaMembers\(\)\.ui\.MemberPicker,\{/);
  assert.doesNotMatch(read('prototype/046-ai-team.css'), /\.eva-ai-team-editor__selected-item\s*>\s*span/);
  assert.match(imPatch, /teamGroups\.map\(teamGroupItem\)/);
  assert.match(imPatch, /className:'eva-ai-team__team-default'\},'默认'/);
  assert.doesNotMatch(imPatch, /className:'eva-ai-team__team-menu'/);
  assert.doesNotMatch(read('prototype/046-ai-team.css'), /\.eva-ai-team__team-menu/);
  assert.match(imPatch, /source\.fixedGroupActions=\{onEditMembers:\(\)=>openGroupMembersEditor\(selectedGroup\),onRename:name=>groupStore\.updateGroup\(selectedGroup\.id,\{name\}\),onDissolve:\(\)=>openGroupDissolve\(selectedGroup\)\}/);
  assert.match(imPatch, /fixedGroupActions:ct\?\.fixedGroupActions/);
  assert.match(chatSettings, /fixedGroupActions/);
  assert.match(chatSettings, /const openFixedAction=action=>\{onClose\(\);requestAnimationFrame\(action\);\}/);
  assert.doesNotMatch(chatSettings, /title:'编辑 AI 团队'/);
  assert.match(chatSettings, /h\(EditRow,\{title:'团队名称',value:name,allowEmpty:false,onSave:fixedGroupActions\.onRename\}\)/);
  assert.doesNotMatch(chatSettings, /fixedGroupActions&&section\(h\(Row,\{title:'团队头像'/);
  assert.doesNotMatch(chatSettings, /fixedGroupActions\?\.onUpdateAvatar/);
  assert.match(chatSettings, /title:'解散 AI 团队'.+danger:true.+onClick:\(\)=>openFixedAction\(fixedGroupActions\.onDissolve\)/s);
  assert.match(chatSettings, /'aria-label':editableFixed\?'添加 AI 团队成员':'添加群聊成员'/);
  assert.match(imPatch, /membersOnly\?'编辑团队成员'/);
  assert.match(imPatch, /nameField:membersOnly\?null:\{id:'eva-ai-team-name',label:'团队名称'/);
  assert.match(imPatch, /title:'解散 AI 团队'.+okText:'解散群'.+okButtonProps:\{type:'danger'\}/s);
  assert.match(imPatch, /groupStore\.removeGroup\(id\).+selection\.identityId===id.+choose\(groupStore\.id,null\)/s);
  assert.doesNotMatch(imPatch, /className:'eva-ai-team__group-count'/);
  assert.match(imPatch, /className:'eva-ai-team__session-unread'/);
  assert.match(imPatch, /className:'eva-ai-team__unread-dot'/);
  assert.doesNotMatch(imPatch, /className:'eva-ai-team__session-time'/);
  assert.doesNotMatch(imPatch, /Math\.max\(0,channel\.members-1\)/);
  assert.match(imPatch, /EvaAIIdentityAvatar.+eva-ai-team__identity-name.+AiBadge/s);
  assert.match(imPatch, /EvaAIIdentityAvatar,\{appearance:evaIdentityAppearance\(i\),size:22\}/);
  assert.match(imPatch, /EvaAIIdentity\.avatar\(digitalStore\.appearance\(item\),22,h\)/);
  assert.doesNotMatch(imPatch, /className:'eva-ai-team__chevron'/);
  assert.match(imPatch, /className:'eva-ai-team__identity-sessions-more'/);
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
  assert.match(convergenceCss, /\.eva-msg \.ch-list,\s*\.collab-body > \.ch-layout > \.ch-list,\s*\.eva-personal-sider-panel/);
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

test('子区入口图标：层级与创建消息用 CornerDownRight，右键菜单创建入口用 MessageSquarePlus', () => {
  const imPatch = read('prototype/009-5-patch-im.js');
  const { source } = createPatchedRuntime();

  assert.match(imPatch, /统一子区图标/);
  assert.match(source, /ThreadIcon=createLucideIcon\("corner-down-right"/);
  for (const path of [
    'm15 10 5 5-5 5',
    'M4 4v7a4 4 0 0 0 4 4h12',
  ]) assert.ok(source.includes(`d:"${path}"`), `统一子区图标缺少路径 ${path}`);
  assert.doesNotMatch(source, /ThreadIcon=\(\{size:/);
  assert.match(source, /title:"创建子区",icon:React\.createElement\(MessageSquarePlus,\{size:18,className:"ctx-icon"\}\)/);
  assert.match(source, /wk-thread-created-link"\},React\.createElement\(ThreadIcon,\{size:14/);
  assert.doesNotMatch(source, /wk-thread-created-link"\},"🧵"/);
});

test('子区创建通知并入气泡外观并复用消息行多选合同', () => {
  const { source } = createPatchedRuntime();
  const imShellCss = read('prototype/017-im-shell.css');

  assert.match(source, /\.\.\.rowProps\(ci,!1,evaActorId\),selectionMode:evaSelection!==null,showCheckbox:evaSelection!==null,isSelected:!!evaSelection\?\.\[ci\.evaSelectionKey\]/);
  assert.match(imShellCss, /\.eva-im-bubble-row > \.wk-msg-row-content > \.wk-msg-row-body > \.wk-thread-created-card\s*\{[^}]*border-left:\s*0/);
  assert.match(imShellCss, /\.wk-thread-created-card::before\s*\{[^}]*background:\s*var\(--eva-im-accent\)/);
  assert.match(imShellCss, /\.eva-im-bubble-row\.wk-msg-row--send > \.wk-msg-row-content > \.wk-msg-row-body > \.wk-thread-created-card\s*\{[^}]*background:\s*var\(--eva-bubble-outgoing\)/);
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

test('点击群聊内容区会关闭已打开的子区、聊天信息、文件预览、查找与任务面板', () => {
  const imPatch = read('prototype/009-5-patch-im.js');
  const patched = imPatch.match(/ch-main__stream",onClick:ci=>\{\(([^)]*)\)&&!ci\.target\.closest\?\.\("\.wk-messageinput-box, \.wk-contextmenus, \.wk-message-file"\)/);

  assert.ok(patched, '群聊内容区点击收起右侧面板的补丁缺失');
  for (const mode of ['threads', 'info', 'file', 'search', 'tasks']) {
    assert.match(patched[1], new RegExp(`Mt==="${mode}"`), `${mode} 模式未纳入点击内容区收起`);
  }
});
test('表单类浮层保持可点遮罩关闭，并行整合不得静默回退', () => {
  const membersUi = read('prototype/009-2-members-ui.js');
  const settings = read('prototype/048-settings-usage.js');
  const automation = read('prototype/009-8-patch-automation.js');

  // 用户已确认的取舍：成员选择器、转让（接任者）弹窗、设置对话框、定时任务设置弹窗点遮罩即收起。
  // 详见 docs/弹窗失焦关闭规范.md。
  assert.match(membersUi, /getPopupContainer,maskClosable:true}/, '成员选择器弹窗不再支持点遮罩关闭');
  assert.match(membersUi, /width:480,title,visible,onCancel,footer,maskClosable:true}/, '转让（接任者）弹窗不再支持点遮罩关闭');
  assert.match(settings, /className:'eva-settings-dialog'.{0,120}maskClosable:true/, '设置对话框不再支持点遮罩关闭');
  assert.match(automation, /maskClosable:true/, '定时任务设置弹窗不再支持点遮罩关闭');
  assert.doesNotMatch(membersUi, /maskClosable:false/, '成员选择器族出现不可点关的蒙层，与已确认取舍冲突');
});


test('团队消息和我的 AI 的第二栏使用同一套 GDS 文字层级', () => {
  const hierarchyCss = read('prototype/016-message-hierarchy.css');
  const aiTeamCss = read('prototype/046-ai-team.css') + read('prototype/056-heading-system.css');
  const messageSwitcherCss = read('prototype/039-team-message-project-recent.css');
  const imPatch = read('prototype/009-5-patch-im.js');

  assert.match(hierarchyCss, /--gds-type-label-medium-font-size/);
  for (const css of [hierarchyCss, aiTeamCss]) {
    assert.match(css, /--gds-type-label-font-size/);

  }
  assert.match(aiTeamCss, /--gds-type-caption-font-size/);
  // Unread badges now belong to the common IM component, with the approved compact 11px size.
  const imShellCss = read('prototype/017-im-shell.css');
  assert.match(imShellCss, /wk-conv-unread-num/);
  assert.match(imShellCss, /font: 500 11px\/16px var\(--eva-font-sans\)/);
  assert.match(imShellCss, /--eva-unread-surface/);
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
  assert.match(read('prototype/047-gds-tokens.css'), /--eva-rail-level-indent:\s*var\(--gds-space-1\)/);
  assert.match(read('prototype/047-gds-tokens.css'), /--eva-rail-identity-content-inset:\s*calc\(var\(--eva-rail-identity-avatar-size\) \+ var\(--eva-rail-level-indent\)\)/);
  assert.match(read('prototype/047-gds-tokens.css'), /--eva-rail-team-thread-inset:\s*calc\(var\(--eva-rail-identity-content-inset\) \+ var\(--gds-space-2-5\)\)/);
  assert.match(aiTeamCss, /--eva-rail-identity-avatar-trailing:\s*0px/);
  assert.match(aiTeamCss, /--eva-ai-team-secondary-inset:\s*var\(--gds-space-2\)/);
  assert.match(aiTeamCss, /eva-ai-team__identity-button\s*\{[^}]*padding:\s*0 0 0 var\(--eva-ai-team-secondary-inset\)/s);
  assert.match(aiTeamCss, /eva-ai-team__team-threads \.wk-conv-compact-item--thread\s*\{[^}]*padding-left:\s*var\(--eva-rail-team-thread-inset\)/s);
  assert.match(read('prototype/047-gds-tokens.css'), /--eva-rail-identity-avatar-size:\s*22px/);
  assert.match(aiTeamCss, /--eva-rail-session-indent:\s*calc\(var\(--eva-ai-team-secondary-inset\) \+ var\(--eva-rail-identity-avatar-size\) \+ var\(--gds-space-2\) \+ var\(--eva-rail-identity-avatar-trailing\)\)/);
  assert.match(aiTeamCss, /eva-ai-team__identity-button > \.eva-identity-avatar\s*\{[^}]*margin-right:\s*var\(--eva-rail-identity-avatar-trailing\)/s);
  assert.match(aiTeamCss, /--eva-rail-secondary:\s*var\(--gds-color-text-secondary\)/);
  assert.match(aiTeamCss, /--eva-rail-hover:\s*var\(--eva-conversation-row-hover\)/);
  // 选中态自 2026-09-17 起与「我的消息」同源（EvaMate surface/selected）。
  // 原值 var(--gds-color-surface-hover) 引用了全仓未定义的变量且无 fallback，
  // 实测解析为空字符串使声明失效，选中底实际由 016 的硬编码 #f0f1f2 兜住。
  assert.match(aiTeamCss, /--eva-rail-selected:\s*var\(--eva-conversation-row-selected\)/);
  assert.match(aiTeamCss, /--eva-rail-group-hover:\s*var\(--eva-conversation-row-hover\)/);
  assert.match(messageSwitcherCss, /background:\s*var\(--eva-conversation-row-hover\)/);
  assert.match(read('prototype/047-gds-tokens.css'), /--eva-conversation-row-hover:\s*#f2f3f5/);
  assert.match(aiTeamCss, /--eva-rail-group-radius:\s*7px/);
  // 2026-09-18：行圆角由 var(--wk-r-xs,3px) 对齐到会话行的 8px。此前静态选中块是 3px、
  // 悬停块是 8px（同一行两个形状），且与「我的消息」的 8px 选中块不一致。
  assert.match(aiTeamCss, /--eva-rail-primary-row-radius:\s*var\(--eva-conversation-row-radius, 8px\)/);
  assert.match(aiTeamCss, /--eva-rail-nested-row-radius:\s*var\(--eva-conversation-row-radius, 8px\)/);
  assert.match(aiTeamCss, /\.eva-ai-team \.wk-conv-compact-item\s*\{\s*border-radius:\s*var\(--eva-conversation-row-radius\)/s);
  // 2026-09-17：焦点背景由 :focus-within 改为 :has(:focus-visible)。
  // :focus-within 在鼠标点击后仍成立，会把 hover 灰残留在行上，与真正的选中态（蓝）
  // 并列出现，看起来像两个不同样式的选中项。容器不可聚焦故用 :has() 下探。
  assert.match(aiTeamCss, /eva-ai-team__identity-heading:hover,[^}]*eva-ai-team__identity-heading:has\(:focus-visible\)\s*\{\s*background:\s*var\(--eva-rail-hover\)/s);
  assert.match(aiTeamCss, /eva-ai-team__session-row\.is-selected,[^}]*eva-ai-team__session-row\.is-selected:hover\s*\{[^}]*background:\s*var\(--eva-rail-selected\)[^}]*box-shadow:\s*none/s);
  assert.doesNotMatch(aiTeamCss, /eva-ai-team__identity-heading \.eva-ai-team__chevron/);
  assert.match(aiTeamCss, /eva-ai-team__identity-sessions-more\s*\{[^}]*padding:\s*0 var\(--gds-space-2\) 0 var\(--eva-rail-session-indent\)/s);
  assert.match(aiTeamCss, /eva-ai-team__role-group \+ \.eva-ai-team__role-group\s*\{[^}]*margin-top:\s*6px[^}]*\}/s);
  assert.match(aiTeamCss, /eva-rail-header\s*\{[^}]*padding:\s*var\(--gds-space-2\) var\(--gds-space-4\)/s);
  assert.match(aiTeamCss, /eva-ai-team__roles\s*\{[^}]*padding:\s*var\(--gds-space-2\) var\(--gds-space-2-5\) var\(--gds-space-3\)/s);
  assert.match(aiTeamCss, /eva-ai-team__sidebar-header \.semi-button\s*\{[^}]*height:\s*34px/s);
  assert.match(messageSwitcherCss, /wk-sidebar-tabbar\[data-eva-project-recent-switcher="true"\]\s*\{[^}]*padding:\s*0 var\(--gds-space-4\)/s);
  // Tab 基线自 2026-09-16 起与「我的 Agent」的区域分界线同档：统一走
  // --eva-rail-divider（= border/subtle）。原先取 border/faint 的「极弱基线」
  // 在暗色下 ΔL* 仅 2.9（faint 撞上抬升面色）而不可见，故升档并收敛到语义别名。
  assert.match(messageSwitcherCss, /wk-sidebar-tabbar__container\s*\{[^}]*padding:\s*0[^}]*border-bottom:\s*var\(--gds-border-standard\) solid var\(--eva-rail-divider\)/s);
  assert.match(messageSwitcherCss, /wk-sidebar-tabbar__btn\s*\{[^}]*min-height:\s*32px/s);
  assert.match(aiTeamCss, /eva-rail-header\s*\{[^}]*display:\s*flex/s);
  assert.match(imPatch, /EvaAIIdentityAvatar,\{appearance:evaIdentityAppearance\(i\),size:22\}/);
  assert.match(imPatch, /EvaAIIdentity\.avatar\(digitalStore\.appearance\(item\),22,h\)/);
});

test('我的 AI 去掉顶层分组标题并用细线分隔团队与单聊', () => {
  const imPatch = read('prototype/009-5-patch-im.js');
  const aiTeamCss = read('prototype/046-ai-team.css') + read('prototype/056-heading-system.css');
  const modeCss = read('prototype/012-mode-layer.css');
  const tokens = read('prototype/047-gds-tokens.css');
  assert.doesNotMatch(imPatch, /function sectionTitle\(|sectionCollapsed|setSectionCollapsed/);
  assert.doesNotMatch(aiTeamCss, /\.eva-ai-team__section-(?:title|toggle|icon|label|count|chevron)/);
  assert.match(imPatch, /className:'eva-ai-team__teams'.+teamGroups\.map\(teamGroupItem\).+className:'eva-ai-team__list-divider',role:'separator','aria-orientation':'horizontal'.+className:'eva-ai-team__direct-groups'/s);
  assert.match(aiTeamCss, /\.eva-ai-team__list-divider\s*\{[^}]*border-top:\s*var\(--gds-border-standard\) solid var\(--gds-color-border-subtle\)/s);
  assert.match(read('prototype/047-gds-tokens.css'), /--eva-rail-level-indent:\s*var\(--gds-space-1\)/);
  assert.match(aiTeamCss, /--eva-rail-identity-avatar-trailing:\s*0px/);
  assert.match(read('prototype/047-gds-tokens.css'), /--eva-rail-team-thread-inset:\s*calc\(var\(--eva-rail-identity-content-inset\) \+ var\(--gds-space-2-5\)\)/);
  assert.doesNotMatch(imPatch, /className:'eva-ai-team__team-toggle'/);
  assert.doesNotMatch(aiTeamCss, /\.eva-ai-team__team-toggle/);
  assert.match(aiTeamCss, /\.eva-ai-team__team-button\s*\{[^}]*padding:\s*0 var\(--gds-space-2\) 0 var\(--eva-ai-team-secondary-inset\)/s);
  assert.match(aiTeamCss, /\.eva-ai-team__group-toggle\s*\{[^}]*padding:\s*0 var\(--gds-space-2\) 0 0/s);
  assert.doesNotMatch(imPatch, /hasDirectUnread/);
  assert.match(imPatch, /hasUnread=role==='digital'&&items\.some/);
  assert.doesNotMatch(aiTeamCss, /--eva-ai-section-(?:bg|meta)/);
  assert.match(aiTeamCss, /\.eva-ai-team__unread-dot\s*\{[^}]*width:\s*6px[^}]*background:\s*var\(--eva-unread-indicator\)/s);
  assert.match(aiTeamCss, /\.eva-ai-team__session-unread\s*\{[^}]*background:\s*var\(--eva-unread-surface\)[^}]*color:\s*var\(--eva-unread-text\)/s);
  assert.match(aiTeamCss, /\.eva-ai-team__session-unread\s*\{[^}]*justify-self:\s*end/s);
  assert.match(aiTeamCss, /\.eva-ai-team__session-actions\s*\{[^}]*position:\s*absolute[^}]*right:\s*4px/s);
  assert.match(aiTeamCss, /\.eva-ai-team__session-row:hover \.eva-ai-team__session-unread,[^}]*focus-within \.eva-ai-team__session-unread\s*\{\s*opacity:\s*0/s);
  assert.match(aiTeamCss, /\.eva-ai-team__session-row \.eva-ai-team__session\s*\{[^}]*width:\s*100%[^}]*padding-right:\s*var\(--gds-space-2\)/s);
  assert.match(aiTeamCss, /\.eva-ai-team__team-button > \.eva-ai-team__unread-dot\s*\{\s*margin-left:\s*auto/s);
  assert.match(aiTeamCss, /\.eva-ai-team__team-thread-row \.wk-conv-compact-badges\s*\{[^}]*margin-left:\s*auto[^}]*margin-right:\s*0/s);
  assert.match(aiTeamCss, /\.eva-ai-team__team-thread-row \.wk-conv-compact-badge\s*\{[^}]*background:\s*var\(--eva-unread-surface\)[^}]*color:\s*var\(--eva-unread-text\)/s);
  assert.match(aiTeamCss, /\.eva-ai-team__team-thread-row:hover \.wk-conv-compact-badges,[^}]*focus-within \.wk-conv-compact-badges\s*\{\s*opacity:\s*0/s);
  assert.match(aiTeamCss, /\.eva-ai-team__identity-heading \.eva-identity-name-row > \.eva-ai-team__unread-dot\s*\{\s*margin-left:\s*auto/s);
  assert.match(aiTeamCss, /\.eva-ai-team__identity-heading \.eva-ai-team__identity-button\s*\{[^}]*padding-right:\s*var\(--gds-space-2\)/s);
  assert.match(aiTeamCss, /\.eva-ai-team__identity-heading:hover \.eva-ai-team__identity-button,[^}]*focus-within \.eva-ai-team__identity-button,[^}]*is-active\) \.eva-ai-team__identity-button\s*\{\s*padding-right:\s*40px/s);
  assert.doesNotMatch(aiTeamCss, /\.eva-ai-team__identity-heading:has\(> \.eva-ai-team__menu-anchor\)/);
  assert.match(aiTeamCss, /\.eva-ai-team__assistant-avatar\s*\{[^}]*width:\s*32px[^}]*height:\s*32px/s);
  assert.match(aiTeamCss, /\.eva-ai-team__identity-heading:hover \.eva-ai-team__unread-dot,[^}]*focus-within \.eva-ai-team__unread-dot,[^}]*is-active\) \.eva-ai-team__unread-dot\s*\{\s*opacity:\s*0/s);
  assert.match(tokens, /--eva-unread-indicator:\s*var\(--eva-c-mac-red\)/);
  assert.match(modeCss, /\.eva-nav-icon__unread\s*\{[^}]*background:\s*var\(--eva-unread-indicator\)/s);
  assert.match(aiTeamCss, /\.eva-ai-team__group-toggle\s*\{[^}]*min-height:\s*32px[^}]*background:\s*transparent/s);
  assert.match(aiTeamCss, /\.eva-ai-team__group-title\s*\{[^}]*flex:\s*1/s);
  assert.doesNotMatch(aiTeamCss, /\.eva-ai-team__team-heading:has\([^)]*\)[^{]*\.eva-ai-team__group-count/);
});

test('我的 AI 小队父群去掉左侧箭头并由父群行同时切换子区', () => {
  const imPatch = read('prototype/009-5-patch-im.js');
  const aiTeamCss = read('prototype/046-ai-team.css') + read('prototype/056-heading-system.css');
  const start = imPatch.indexOf('function teamGroupItem(group)');
  const end = imPatch.indexOf('const personas=', start);
  const teamGroupItem = imPatch.slice(start, end);
  const conversationStart = teamGroupItem.indexOf("h('button',{type:'button',className:'eva-ai-team__team-button'");
  const conversationButton = teamGroupItem.slice(conversationStart, teamGroupItem.indexOf("h('img'", conversationStart));

  assert.ok(start >= 0 && end > start, '未找到 AI 团队父群渲染函数');
  assert.ok(conversationStart >= 0, '未找到团队父群按钮');
  assert.doesNotMatch(teamGroupItem, /className:'eva-ai-team__team-toggle'/);
  assert.doesNotMatch(teamGroupItem, /h\(ChevronRight,\{size:12,className:'eva-ai-team__group-chevron'/);
  assert.match(conversationButton, /'aria-label':'进入团队会话 '\+group\.name/);
  assert.match(conversationButton, /'aria-current':selected&&!selection\.sessionId\?'true':undefined/);
  assert.match(conversationButton, /'aria-expanded':expanded/);
  assert.match(conversationButton, /'aria-controls':threadsId/);
  assert.match(conversationButton, /onClick:\(\)=>\{if\(!expanded\)setCollapsed\(.+\[group\.id\]:false.+choose\(group\.id,null\);\}/s);
  assert.match(teamGroupItem, /hasUnread=groupStore\.hasUnread\(group\.id\)/);
  assert.match(teamGroupItem, /hasUnread&&unreadDot\(group\.name\+'有未读消息'\)/);
  assert.match(teamGroupItem, /className:'eva-ai-team__team-thread-row'/);
  assert.match(teamGroupItem, /h\(ConvCompactItem,\{isThread:true,name:item\.name,unread:item\.unread/);
  assert.match(teamGroupItem, /teamThreadMenu\(group,item\)/);
  assert.doesNotMatch(aiTeamCss, /\.eva-ai-team__team-toggle/);
  assert.match(aiTeamCss, /\.eva-ai-team__team-button:focus-visible\s*\{[^}]*outline:/s);
});

test('我的 AI 小队和身份会话均默认预览最新三条并按需展开', () => {
  const imPatch = read('prototype/009-5-patch-im.js');
  const aiTeamCss = read('prototype/046-ai-team.css') + read('prototype/056-heading-system.css');

  assert.match(imPatch, /Object\.fromEntries\(\[\.\.\.teamGroups\.map\(group=>\[group\.id,!group\.system\]\),\.\.\.\(requestedIdentity&&groupIds\.has\(requestedIdentity\.id\)\?\[\[requestedIdentity\.id,false\]\]:\[\]\)\]\)/);
  assert.match(imPatch, /const \[showAllTeamThreads,setShowAllTeamThreads\]=reactExports\.useState\(\(\)=>requestedIdentity&&groupIds\.has\(requestedIdentity\.id\)&&requestedSessionId\?\{\[requestedIdentity\.id\]:true\}:\{\}\)/);
  assert.match(imPatch, /const \[showAllIdentitySessions,setShowAllIdentitySessions\]=reactExports\.useState\(\(\)=>requestedIdentity&&!groupIds\.has\(requestedIdentity\.id\)&&requestedSessionId\?\{\[requestedIdentity\.id\]:true\}:\{\}\)/);
  assert.match(imPatch, /if\(requestedSessionId\)setShowAllTeamThreads\(value=>\(\{\.\.\.value,\[requestedIdentity\.id\]:true\}\)\)/);
  assert.match(imPatch, /else if\(requestedSessionId\)setShowAllIdentitySessions\(value=>\(\{\.\.\.value,\[requestedIdentity\.id\]:true\}\)\)/);
  assert.match(imPatch, /orderedTeamThreads=items=>\[\.\.\.items\]\.filter\(item=>item\.status!==2&&!threadPreferenceStore\.chatPreferences\(item\.id,threadPreferenceActor\)\.hidden\)\.sort/);
  assert.match(imPatch, /Number\(!!threadPreferenceStore\.chatPreferences\(b\.id,threadPreferenceActor\)\.top\)-Number\(!!threadPreferenceStore\.chatPreferences\(a\.id,threadPreferenceActor\)\.top\)\|\|teamThreadTime\(b\)\.localeCompare\(teamThreadTime\(a\)\)/);
  assert.match(imPatch, /visibleThreads=group\.system&&!showAll\?threads\.slice\(0,3\):threads,hasMore=group\.system&&threads\.length>3/);
  assert.match(imPatch, /className:'eva-ai-team__team-threads-more','aria-expanded':showAll/);
  assert.match(imPatch, /'aria-label':\(showAll\?'收起 ':'展开查看 '\)\+group\.name\+' 子区'/);
  assert.match(imPatch, /h\('span',null,showAll\?'收起':'展开查看'\),h\(ChevronDown,\{size:12,className:'eva-ai-team__team-threads-more-chevron'\+\(showAll\?' is-expanded':''\)/);
  assert.doesNotMatch(imPatch, /展开查看（|其余 '\+\(threads\.length-3\)/);
  const identityDisclosure=imPatch.match(/function identitySessionsDisclosure\(item,showAll,hasMore\)[\s\S]*?function identityItem/)[0];
  assert.match(identityDisclosure, /if\(!hasMore\)return null/);
  assert.match(identityDisclosure, /className:'eva-ai-team__identity-sessions-more','aria-expanded':showAll/);
  assert.match(identityDisclosure, /'aria-label':\(showAll\?'收起 ':'展开查看 '\)\+item\.name\+' 会话'/);
  assert.match(identityDisclosure, /setShowAllIdentitySessions\(value=>\(\{\.\.\.value,\[item\.id\]:!showAll\}\)\)/);
  assert.match(identityDisclosure, /h\('span',null,showAll\?'收起':'展开查看'\),\s*h\(ChevronDown,\{size:12,className:'eva-ai-team__identity-sessions-more-chevron'/s);
  const identityItem=imPatch.match(/function identityItem\(i\)[\s\S]*?function employeeItem/)[0];
  assert.match(identityItem, /visibleSessions=showAll\?sessions:sessions\.slice\(0,3\), hasMore=sessions\.length>3/);
  assert.match(identityItem, /'aria-label':'新建会话 '\+i\.name.+onClick:\(\)=>newConversation\(i\.id\)/s);
  assert.match(identityItem, /sessions\.length>0&&h\('div',\{className:'eva-ai-team__sessions'.+visibleSessions\.map/s);
  assert.match(identityItem, /identitySessionsDisclosure\(i,showAll,hasMore\)/);
  assert.match(imPatch, /identitySessionsDisclosure\(item,showAll,hasMore\)/);
  assert.doesNotMatch(identityItem, /aria-expanded|emptyPersona|className:'eva-ai-team__session is-selected'/);
  assert.match(aiTeamCss, /\.eva-ai-team__team-threads-more,\s*\.eva-ai-team__identity-sessions-more\s*\{[^}]*background:\s*transparent/s);
  assert.match(aiTeamCss, /\.eva-ai-team__team-threads-more\s*\{\s*padding:\s*0 var\(--gds-space-2\) 0 var\(--eva-rail-team-thread-label-inset\)/s);
  assert.match(aiTeamCss, /\.eva-ai-team__identity-sessions-more\s*\{\s*padding:\s*0 var\(--gds-space-2\) 0 var\(--eva-rail-session-indent\)/s);
  assert.match(aiTeamCss, /\.eva-ai-team__identity-sessions-more:focus-visible\s*\{[^}]*outline:/s);
  assert.match(aiTeamCss, /\.eva-ai-team__identity-sessions-more-chevron\.is-expanded\s*\{[^}]*transform:\s*rotate\(180deg\)/s);
});

test('个人文件夹与对话使用统一 Hover、选中及公共 Lucide 图标', () => {
  const workspace = read('prototype/052-personal-eva-gds.js');
  const convergence = read('prototype/043-final-layout-convergence.css');
  assert.match(workspace, /icon\('folder',18/);
  assert.match(convergence, /eva-personal-thread:hover[^}]*var\(--eva-overlay-hover\)/s);
  // 2026-09-17：选中态改用 surface/selected，与「我的消息」「我的 Agent」一致。
  // 原先取 --eva-overlay-hover，与 :hover 和 :active 三者同值，选中与悬停无法区分，
  // 且把 hover 语义的覆盖层用作永久选中表面（evamate §3.1）。
  assert.match(convergence, /eva-personal-thread\.is-selected[^}]*var\(--eva-conversation-row-selected\)/s);
  // 蓝底上次要文字升一档（实测时间文字 2.75 → 6.33，暗色 3.71 → 7.62）。
  assert.match(convergence, /eva-personal-thread\.is-selected \.eva-personal-thread__time[^}]*var\(--eva-conversation-row-selected-meta\)/s);
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

test('我的 AI 位于个人导航并以共享编辑弹窗创建个人助理', () => {
  const sider = read('prototype/009-7-patch-sider.js');
  const imPatch = read('prototype/009-5-patch-im.js');
  const creator = read('prototype/047-digital-employees.js');
  const runtime = createPatchedRuntime().source;

  assert.match(sider, /EVA_PERSONAL_NAV=Object\.freeze\(\["new-chat","my-ai","workboard","automation","connection-center"\]\)/);
  assert.match(sider, /EVA_TEAM_NAV=Object\.freeze\(\["messages","projects","contacts","drive","sites"\]\)/);
  assert.match(sider, /rt==="\/messages"&&ut\.get\("evaIM"\)==="my-ai"\)return"personal"/);
  assert.match(runtime, /LABEL\$1="我的消息",SiderMessagesEntry=/);
  assert.match(sider, /case"my-ai":return.+SiderEvaStub,\{label:rt\.collapsed\?"Agent":"我的 Agent"/);
  assert.match(sider, /EvaMyAiCollaborationIcon=\(\)=>.+window\.EvaMyAITeamGroup.+rt\.hasUnread\(\)\|\|ct\.hasUnread\(\)\|\|pt\.hasUnread\(\).+EvaNavIcon\(React\.createElement\(EvaBoxesIcon/s);
  assert.match(sider, /EvaNavIcon=\(rt,ct,ut\)=>React\.createElement\("span",\{className:"eva-nav-icon"\},rt,ct&&React\.createElement\("span",\{className:"eva-nav-icon__unread"/);
  assert.match(runtime, /LABEL\$2="我的项目",SiderCollabEntry=/);
  assert.doesNotMatch(sider, /我的Agent|React\.cloneElement/);
  assert.match(sider, /label:rt\.collapsed\?"自动化":"自动化任务"/);
  assert.match(sider, /label:rt\.collapsed\?"数字员工":"数字员工市场"/);
  assert.doesNotMatch(sider, /label:"我的 AI"/);
  assert.match(imPatch, /className:'eva-ai-team__sidebar-header eva-rail-header'.+h\('h1',null,'我的 Agent'\)/s);
  assert.match(imPatch, /const openPersonalAssistant=\(\)=>window\.__evaOpenAssistantEditor\?\.\(\{mode:'create',role:'assistant',returnFocus:groupEditorOpener\.current\}\)/);
  assert.doesNotMatch(imPatch, /evaReturn=%2Fmessages%3FevaIM%3Dmy-ai/);
  // 数字员工创建已整体移除：页面不再承载创建向导，侧栏也不再保留创建入口。
  assert.doesNotMatch(sider, /evaCreatorParams|evaCreate|Agent创建中心/);
  assert.doesNotMatch(creator, /function creator\(|configPane\(|resourcePicker\(|eva-creator-workspace/);
  // 信息卡中的「创建数字员工」是追溯记录事件文案，属于保留内容。
  assert.doesNotMatch(creator, /h\('h1',null,'创建数字员工'\)/);
  assert.doesNotMatch(creator, /initialType|returnTo/);
  // 「我的 Agent」的个人助理创建入口不受影响，仍走共享编辑弹窗。
  assert.match(imPatch, /window\.__evaOpenAssistantEditor\?\.\(\{mode:'create',role:'assistant'/);
});

test('其他菜单只保留数字员工市场，市场身份统一展示公共 AI 标且没有接入配置', () => {
  const sider = read('prototype/009-7-patch-sider.js');
  const market = read('prototype/047-digital-employees.js');
  const css = read('prototype/047-digital-employees.css');
  assert.match(sider, /EVA_COMMON_NAV=Object\.freeze\(\["digital-employees"\]\)/);
  assert.match(sider, /rt==="数字员工"\?"其他"/);
  assert.match(market, /render:\(_,a\)=>identity\(a,false\)/, '列表工号只在独立工号列展示，公共头像和 AI 标仍由 identity 渲染');
  assert.match(market, /dialog\.kind==='detail'.+identity\(a,true\)/s);
  assert.doesNotMatch(market, /接入配置|dialog\.kind==='intake'|open\('intake'/);
  assert.match(market, /joined\?h\('span',\{className:'eva-digital-center__joined-status',onClick:e=>e\.stopPropagation\(\)\},'已加入'\):btn\('加入我的 Agent'/);
  assert.match(market, /theme:'borderless',type:'primary',className:'eva-digital-center__market-action eva-digital-center__join-action'/);
  assert.match(market, /theme:'borderless',type:'primary',className:'eva-digital-center__market-action eva-digital-center__project-action'/);
  assert.match(css, /\.semi-button\.eva-digital-center__market-action\s*\{\s*background:\s*transparent;\s*color:\s*var\(--eva-action-primary\);\s*\}/);
  assert.match(css, /\.eva-digital-center__joined-status\s*\{\s*color:\s*var\(--eva-text-primary\);\s*font:\s*400 12px\/16px var\(--eva-font-sans\);\s*\}/);
  assert.doesNotMatch(market, /const addIcon=|icon:addIcon\(\)/);
  assert.match(market, /eva-digital-center__domain-filters/);
  assert.doesNotMatch(market, /加入 AI 团队|已加入 AI 团队/);
  const columns = market.match(/const columns=\[[\s\S]*?\];/);
  assert.ok(columns, '数字员工市场列定义缺失');
  assert.doesNotMatch(columns[0], /disabled:store\.hasInTeam/);
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
  assert.doesNotMatch(workspaceCss, /order:\s*[123];|width:\s*218px|height:\s*292px/);
  assert.match(workspaceCss, /container-type:\s*size/);
  assert.match(workspaceCss, /zoom:\s*clamp\(0\.85,[^;]*100cqw[^;]*100cqh[^;]*1\.3\)/);
  assert.match(componentCss, /\.eva-composer-wrap\s*\{[^}]*width:\s*var\(--eva-main-col-w\);[^}]*height:\s*166px;/s);
  assert.match(componentCss, /\.eva-composer\s*\{[^}]*width:\s*768px;[^}]*height:\s*118px;/s);
  assert.match(workspaceCss, /\.eva-personal-workspace__hero\s*\{[^}]*height:\s*48px;[^}]*align-items:\s*center;/s);
  assert.match(workspaceCss, /\.eva-personal-workspace__welcome-avatar\s*\{[^}]*width:\s*36px;[^}]*height:\s*36px;/s);
  assert.match(workspaceCss, /\.eva-personal-workspace__rail\s*\{[^}]*margin-top:\s*var\(--eva-space-2\)/s);
  assert.match(workspace, /eva-personal-workspace__capabilities/);
  assert.match(workspace, /querySelector\('\.eva-personal-workspace__capabilities'\)\.scrollBy/);
  assert.match(workspaceCss, /\.eva-personal-workspace__capabilities\s*\{[^}]*flex:\s*1;[^}]*overflow-x:\s*auto;/s);
  assert.match(workspaceCss, /\.eva-personal-workspace \.eva-rail-next\s*\{[^}]*position:\s*static;[^}]*flex:\s*0 0 32px;[^}]*margin-left:\s*0;/s);
  assert.match(workspaceCss, /\.eva-personal-workspace__composer\s*\{[^}]*margin-top:\s*var\(--eva-space-5\)/s);
  assert.match(workspaceCss, /\.eva-personal-workspace \.eva-composer-wrap--newchat\s*\{\s*height:148px;/s);
  assert.match(workspaceCss, /\.eva-personal-workspace \.eva-composer-wrap--newchat \.eva-composer\s*\{\s*height:104px;/s);
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
  assert.match(source, /EvaConnectionCenterIcon=createLucideIcon\("cable",/);
});

test('折叠侧栏只承载一级导航，超出高度的入口收进「更多」而不是滚动', () => {
  const { source } = createPatchedRuntime();

  // vendor 宿主 .flex-1.min-h-0 会裁掉溢出，而三段导航都是 shrink-0：折叠态 11 个 entry
  // 各 56px + 3 个分组标题实测 700px，矮视口下放不下。一级导航不应靠滚动藏入口（可发现
  // 性差、位置漂移），改为 Priority+ 收纳：放不下的收进底部「更多」，点击以二级浮层弹出。
  assert.match(
    source,
    /React\.createElement\("div",\{className:classNames\("flex-1 min-h-0 flex flex-col",siderStyles\.scrollArea\)\},React\.createElement\(EvaSidebarNavigation,/
  );
  // 旧的滚动容器必须彻底移除，否则又会出现导航滚动条。
  assert.doesNotMatch(source, /overflow-y-auto",siderStyles\.scrollArea\)\},React\.createElement\(EvaSidebarNavigation,/);

  // 收纳机制：按可用高度实测切分 + 「更多」触发器 + 分组保留的二级浮层。
  assert.match(source, /new ResizeObserver\(\(\)=>setPhase\("measure"\)\)/);
  assert.match(source, /className:classNames\("eva-nav-section eva-nav-section--more"/);
  assert.match(source, /className:"eva-nav-more__label"\},"更多"/);
  assert.match(source, /className:"eva-nav-more-menu"/);
  // 活动项永不进溢出：选中态必须始终留在可见区。
  assert.match(source, /!visSet\.has\(rt\.activeNavId\)/);

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
